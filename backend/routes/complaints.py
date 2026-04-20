from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models.complaint import Complaint
from models.report import Report, ReportStatus
from models.user import User
from auth_utils import get_current_user
from services.complaint_generator import generate_complaint_pdf
from services.cloudinary_service import upload_image
from services.email_service import send_complaint_email, send_resolution_email
from datetime import datetime
import uuid

router = APIRouter(prefix="/complaints", tags=["Complaints"])


@router.post("/generate/{report_id}")
def generate_complaint(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    complaint_id = str(uuid.uuid4())[:8].upper()

    report_dict = {
        "id": str(report.id),
        "damage_type": report.damage_type,
        "severity": report.severity.value if report.severity else "medium",
        "latitude": float(report.latitude),
        "longitude": float(report.longitude),
        "address": report.address,
        "image_url": report.image_url,
        "created_at": str(report.created_at),
    }

    pdf_bytes = generate_complaint_pdf(report_dict, complaint_id)

    # Upload PDF to Cloudinary
    pdf_url = upload_image(pdf_bytes, f"complaint_{complaint_id}")

    # Save complaint record
    complaint = Complaint(
        report_id=report_id,
        pdf_url=pdf_url,
        sent_to_email="municipality@roadsense.ai",
        sent_at=datetime.utcnow(),
    )
    db.add(complaint)

    # Update report status
    report.status = ReportStatus.complaint_sent
    db.commit()
    db.refresh(complaint)

    # Send confirmation email to citizen (fire & forget)
    try:
        prediction = getattr(report, 'prediction', None)
        hazard = 0
        if prediction:
            import json
            ai = json.loads(prediction.ai_result) if isinstance(prediction.ai_result, str) else {}
            hazard = ai.get('hazard_level', 0)
        send_complaint_email(
            to_email     = current_user.email,
            citizen_name = current_user.name,
            damage_type  = report.damage_type or 'Unknown',
            severity     = report.severity.value if report.severity else 'medium',
            address      = report.address or '',
            pdf_url      = pdf_url,
            hazard_level = hazard,
        )
    except Exception:
        pass  # Email is non-critical

    return {
        "complaint_id": str(complaint.id),
        "pdf_url": pdf_url,
        "message": "Complaint generated and email sent",
    }


@router.get("/all")
def get_all_complaints(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    complaints = db.query(Complaint).order_by(Complaint.sent_at.desc()).all()
    result = []
    for c in complaints:
        report = db.query(Report).filter(Report.id == c.report_id).first()
        result.append({
            "id": str(c.id),
            "report_id": str(c.report_id),
            "pdf_url": c.pdf_url,
            "sent_at": str(c.sent_at),
            "resolved_at": str(c.resolved_at) if c.resolved_at else None,
            "resolution_note": c.resolution_note,
            "damage_type": report.damage_type if report else "Unknown",
            "severity": report.severity.value if report and report.severity else "medium",
            "address": report.address if report else "",
            "image_url": report.image_url if report else "",
            "status": report.status.value if report and report.status else "pending",
        })
    return result


class ResolveRequest(BaseModel):
    resolution_note: str = ""


@router.patch("/{complaint_id}/resolve")
def resolve_complaint(
    complaint_id: str,
    data: ResolveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    complaint.resolved_at = datetime.utcnow()
    complaint.resolution_note = data.resolution_note

    report = db.query(Report).filter(Report.id == complaint.report_id).first()
    if report:
        report.status = ReportStatus.resolved

    db.commit()

    # Notify citizen of resolution
    if report:
        try:
            citizen = db.query(User).filter(User.id == report.user_id).first()
            if citizen:
                send_resolution_email(
                    to_email        = citizen.email,
                    citizen_name    = citizen.name,
                    damage_type     = report.damage_type or 'Unknown',
                    address         = report.address or '',
                    resolution_note = data.resolution_note,
                    points_earned   = 10,
                )
        except Exception:
            pass  # Email is non-critical

    return {"message": "Complaint resolved and citizen notified", "complaint_id": complaint_id}