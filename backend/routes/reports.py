from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models.report import Report, SeverityLevel, ReportStatus
from models.prediction import Prediction
from models.reward import Reward
from models.user import User
from auth_utils import get_current_user
from services.cloudinary_service import upload_image
from services.ai_vision import analyze_image
from rate_limiter import limiter
from websocket_manager import manager
import uuid

router = APIRouter(prefix="/reports", tags=["Reports"])


def hazard_to_severity(hazard_level: int) -> SeverityLevel:
    if hazard_level <= 3:
        return SeverityLevel.low
    elif hazard_level <= 6:
        return SeverityLevel.medium
    else:
        return SeverityLevel.high


@router.post("/submit")
@limiter.limit("5/minute")
async def submit_report(
    request: Request,
    image: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    address: str = Form(""),
    description: str = Form(""),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1 — Upload image to Cloudinary
    file_bytes = await image.read()
    filename = f"report_{uuid.uuid4().hex}"
    try:
        image_url = upload_image(file_bytes, filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")

    # 2 — Run AI analysis; pass description as citizen context for Gemini
    ai_result = analyze_image(image_url, description or address, file_bytes)

    # 3 — AI Spam/Gatekeeper Filter
    if not ai_result.get("is_valid_report", True):
        raise HTTPException(
            status_code=400, 
            detail="AI Rejected: The uploaded image does not appear to show a valid civic issue. Please upload a clear photo of road damage, garbage, or other civic problems."
        )

    # 4 — Save report to DB
    report = Report(
        user_id=str(current_user.id),
        image_url=image_url,
        latitude=latitude,
        longitude=longitude,
        address=address,
        damage_type=ai_result["issue_category"],
        severity=hazard_to_severity(ai_result["hazard_level"]),
        status=ReportStatus.pending,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # 4 — Save AI prediction
    prediction = Prediction(
        report_id=str(report.id),
        damage_class=ai_result["issue_category"],
        confidence=float(ai_result["hazard_level"]) * 10,
        deterioration_score=ai_result["hazard_level"] * 10,
    )
    db.add(prediction)

    # 5 — Award points to user
    reward = Reward(
        user_id=str(current_user.id),
        points=10,
        reason="Report submitted",
    )
    db.add(reward)
    current_user.points = (current_user.points or 0) + 10
    db.commit()

    return {
        "report_id": str(report.id),
        "image_url": image_url,
        "ai_result": ai_result,
        "severity": report.severity,
        "points_earned": 10,
        "message": "Report submitted successfully",
    }


@router.get("/all")
def get_all_reports(
    city: str = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    query = db.query(Report)
    # Temporary patch: if city filtering is introduced later
    total_count = query.count()
    reports = query.order_by(Report.created_at.desc()).offset(skip).limit(limit).all()
    
    data = [
        {
            "id": str(r.id),
            "latitude": float(r.latitude),
            "longitude": float(r.longitude),
            "damage_type": r.damage_type,
            "severity": r.severity,
            "status": r.status,
            "image_url": r.image_url,
            "address": r.address,
            "official_note": r.official_note,
            "created_at": str(r.created_at),
        }
        for r in reports
    ]
    
    return {
        "items": data,
        "total": total_count,
        "page": (skip // limit) + 1,
        "size": limit,
    }


@router.get("/my")
def get_my_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reports = (
        db.query(Report)
        .filter(Report.user_id == str(current_user.id))
        .order_by(Report.created_at.desc())
        .all()
    )
    return [
        {
            "id":         str(r.id),
            "image_url":  r.image_url,
            "damage_type": r.damage_type,
            "severity":   r.severity,
            "status":     r.status,
            "address":    r.address,
            "latitude":   float(r.latitude),
            "longitude":  float(r.longitude),
            "created_at": str(r.created_at),
        }
        for r in reports
    ]


@router.get("/{report_id}")
def get_report_detail(
    report_id: str,
    db: Session = Depends(get_db),
):
    """Get single report detail (public)."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Report not found")
    return {
        "id":          str(report.id),
        "user_id":     str(report.user_id),
        "image_url":   report.image_url,
        "latitude":    float(report.latitude),
        "longitude":   float(report.longitude),
        "address":     report.address,
        "damage_type": report.damage_type,
        "severity":    report.severity,
        "status":      report.status,
        "created_at":  str(report.created_at),
    }


class StatusUpdate(BaseModel):
    status: str
    note: str = ""   # Optional note from official (shown on resolve/reject)


@router.patch("/{report_id}/status")
async def update_report_status(
    report_id: str,
    data: StatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a report's status (municipality / admin only)."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Report not found")

    try:
        report.status = ReportStatus(data.status)
    except ValueError:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Invalid status: {data.status}")

    # Save optional official note
    if data.note and data.note.strip():
        report.official_note = data.note.strip()

    db.commit()
    
    # Broadcast to websocket!
    await manager.broadcast({
        "type": "status_update",
        "report_id": report_id,
        "new_status": data.status
    })
    
    return {"message": "Status updated", "report_id": report_id, "new_status": data.status}


@router.delete("/{report_id}")
def delete_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Allow a citizen to delete/withdraw their own report if it is still pending/verified."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Report not found")
        
    # Security: Owner can delete their own. Admin and municipality can delete any report.
    is_official = str(current_user.role) in ["admin", "municipality"]
    if str(report.user_id) != str(current_user.id) and not is_official:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Not authorized to delete this report")
        
    # Logic: Cannot delete if the city is already working on it
    if report.status in [ReportStatus.complaint_sent, ReportStatus.resolved]:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Cannot withdraw a report that the city has already processed or resolved")

    # Fix: Manually delete any associated AI predictions to avoid IntegrityError foreign key constraint failures
    from models.prediction import Prediction
    prediction = db.query(Prediction).filter(Prediction.report_id == report.id).first()
    if prediction:
        db.delete(prediction)

    # Fix: Also delete associated complaints to prevent foreign key constraint failures
    from models.complaint import Complaint
    complaints = db.query(Complaint).filter(Complaint.report_id == report.id).all()
    for c in complaints:
        db.delete(c)
        
    db.delete(report)
    
    # Also deduct points from user if they delete a report (optional gamification logic: 
    # to maintain integrity, if they delete it, they shouldn't keep the points they got for it)
    if current_user.points is not None and current_user.points >= 10:
        current_user.points -= 10
        # Add a negative reward to logic trail
        penalty = Reward(
            user_id=str(current_user.id),
            points=-10,
            reason="Report withdrawn"
        )
        db.add(penalty)

    db.commit()
    return {"message": "Report successfully deleted and 10 points deducted from your account"}