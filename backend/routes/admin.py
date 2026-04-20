from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
import csv
import io
from database import get_db
from models.report import Report, ReportStatus, SeverityLevel
from models.user import User
from models.complaint import Complaint
from auth_utils import get_current_user
from redis_client import cache_response

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats")
@cache_response(expiration=300)
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_reports    = db.query(Report).count()
    resolved         = db.query(Report).filter(Report.status == ReportStatus.resolved).count()
    pending          = db.query(Report).filter(Report.status == ReportStatus.pending).count()
    complaint_sent   = db.query(Report).filter(Report.status == ReportStatus.complaint_sent).count()
    total_users      = db.query(User).count()
    total_complaints = db.query(Complaint).count()

    resolution_rate = round((resolved / total_reports * 100), 1) if total_reports > 0 else 0

    categories = (
        db.query(Report.damage_type, func.count(Report.id))
        .group_by(Report.damage_type)
        .all()
    )
    severities = (
        db.query(Report.severity, func.count(Report.id))
        .group_by(Report.severity)
        .all()
    )

    return {
        "total_reports":    total_reports,
        "resolved":         resolved,
        "pending":          pending,
        "complaint_sent":   complaint_sent,
        "total_users":      total_users,
        "total_complaints": total_complaints,
        "resolution_rate":  resolution_rate,
        "categories":       [{"name": c[0] or "Unknown", "count": c[1]} for c in categories],
        "severities":       [{"name": str(s[0].value) if s[0] else "unknown", "count": s[1]} for s in severities],
    }


@router.get("/heatmap")
def get_heatmap(db: Session = Depends(get_db)):
    reports = db.query(Report).all()
    return [
        {
            "lat":      float(r.latitude),
            "lng":      float(r.longitude),
            "severity": r.severity.value if r.severity else "low",
        }
        for r in reports
    ]


@router.get("/worst-zones")
@cache_response(expiration=3600)
def get_worst_zones(db: Session = Depends(get_db)):
    """
    Return top 10 worst zones by grouping reports into ~0.02° grid cells
    and computing a weighted risk score per zone.
    """
    _SEV_WEIGHT = {"high": 3, "medium": 1.5, "low": 0.5}
    reports = db.query(Report).all()

    zones: dict = {}
    for r in reports:
        # Snap to 0.02° grid (~2km cells)
        zone_key = (round(float(r.latitude) * 50) / 50, round(float(r.longitude) * 50) / 50)
        if zone_key not in zones:
            zones[zone_key] = {"reports": [], "lat": zone_key[0], "lng": zone_key[1]}
        zones[zone_key]["reports"].append(r)

    result = []
    for (lat, lng), data in zones.items():
        reps   = data["reports"]
        total  = len(reps)
        weight = sum(_SEV_WEIGHT.get(r.severity.value if r.severity else "low", 0.5) for r in reps)
        unresolved = sum(1 for r in reps if r.status != ReportStatus.resolved)

        raw_score = (weight / max(total, 1)) * 40 + min(total * 3, 40) + (unresolved / max(total, 1)) * 20
        risk_score = min(int(raw_score), 100)

        # Most common damage type
        type_counts: dict = {}
        for r in reps:
            if r.damage_type:
                type_counts[r.damage_type] = type_counts.get(r.damage_type, 0) + 1
        top_issue = max(type_counts, key=type_counts.get) if type_counts else "Unknown"

        # Use address of most recent report as zone label
        latest = max(reps, key=lambda r: r.created_at or "")
        zone_label = (latest.address or f"{lat:.4f}, {lng:.4f}")[:60]

        result.append({
            "lat":          lat,
            "lng":          lng,
            "report_count": total,
            "risk_score":   risk_score,
            "top_issue":    top_issue,
            "zone_label":   zone_label,
            "unresolved":   unresolved,
        })

    result.sort(key=lambda x: x["risk_score"], reverse=True)
    return result[:10]


@router.get("/export/csv")
def export_reports_csv(db: Session = Depends(get_db)):
    """
    Exports all active and resolved reports securely into a downloadable CSV file.
    """
    reports = db.query(Report).order_by(Report.created_at.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Report ID", "User ID", "Latitude", "Longitude", "Address", 
        "Damage Type", "Severity", "Status", "Reported At"
    ])
    
    for r in reports:
        writer.writerow([
            r.id, r.user_id, r.latitude, r.longitude, r.address, 
            r.damage_type, r.severity.value if r.severity else "unknown", 
            str(r.status.value) if r.status else "unknown",
            r.created_at.strftime("%Y-%m-%d %H:%M:%S") if r.created_at else ""
        ])
        
    response = Response(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=civicsense_reports.csv"
    return response


@router.get("/sla-tracking")
@cache_response(expiration=120)
def sla_tracking(db: Session = Depends(get_db)):
    """
    Tracks overdue civic fixes (Pending for > 5 days).
    """
    five_days_ago = datetime.utcnow() - timedelta(days=5)
    
    overdue_reports = (
        db.query(Report)
        .filter(Report.status == ReportStatus.pending)
        .filter(Report.created_at <= five_days_ago)
        .all()
    )
    
    critical_overdue = [r for r in overdue_reports if getattr(r.severity, 'value', '') == 'high']
    
    return {
        "total_overdue": len(overdue_reports),
        "critical_overdue_count": len(critical_overdue),
        "overdue_reports": [
            {
                "id": r.id,
                "address": r.address,
                "damage_type": r.damage_type,
                "days_overdue": (datetime.utcnow() - r.created_at).days if r.created_at else 0,
                "severity": r.severity.value if r.severity else "unknown"
            }
            for r in overdue_reports
        ]
    }