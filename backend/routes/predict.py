from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models.report import Report, ReportStatus
from rate_limiter import limiter

router = APIRouter(prefix="/predict", tags=["Predictions"])

_SEV_WEIGHT = {"high": 1.0, "medium": 0.5, "low": 0.2}


# ── POST /predict/damage — CNN Road Damage Classification ─────────────────

class DamageRequest(BaseModel):
    image_url: str


@router.post("/damage")
@limiter.limit("10/minute")
def predict_damage_endpoint(request: Request, data: DamageRequest):
    """
    Run the trained EfficientNetB0 CNN on an image URL.
    Returns top damage class + full confidence ranking.
    Falls back gracefully if model not yet trained.
    """
    try:
        from ml.predict import predict_damage
        return predict_damage(data.image_url)
    except Exception:
        return {
            "status":  "model_not_trained",
            "message": "Train the CNN first — run ml_notebooks/02_CNN_training.ipynb",
            "top_class": None, "confidence": None, "predictions": [],
        }


# ── POST /predict/deterioration-ml — XGBoost Feature-Based Risk ──────────

class DeteriorationMLRequest(BaseModel):
    reports_last_30:         int   = 0
    avg_monthly_rainfall_mm: float = 80.0
    road_age_years:          float = 5.0
    traffic_density:         float = 5.0
    days_since_repair:       int   = 365
    severity_weighted_count: float = 0.0


@router.post("/deterioration-ml")
def predict_deterioration_ml_endpoint(data: DeteriorationMLRequest):
    """
    Predict deterioration risk (0–100) using trained XGBoost model.
    Falls back to rule-based scoring if model not trained.
    """
    try:
        from ml.predict import predict_deterioration_ml
        return predict_deterioration_ml(
            reports_last_30         = data.reports_last_30,
            avg_monthly_rainfall_mm = data.avg_monthly_rainfall_mm,
            road_age_years          = data.road_age_years,
            traffic_density         = data.traffic_density,
            days_since_repair       = data.days_since_repair,
            severity_weighted_count = data.severity_weighted_count,
        )
    except Exception:
        return {
            "status":  "model_not_trained",
            "message": "Train XGBoost first — run ml_notebooks/03_XGBoost_training.ipynb",
        }


# ── GET /predict/deterioration — Zone-Based Risk (from DB) ───────────────

@router.get("/deterioration")
def get_deterioration_risk(
    lat: float,
    lng: float,
    radius: float = 0.05,
    db: Session = Depends(get_db),
):
    """
    Compute zone deterioration risk (0–100) from DB reports
    using severity weighting + unresolved ratio.
    """
    reports = (
        db.query(Report)
        .filter(
            Report.latitude.between(lat - radius, lat + radius),
            Report.longitude.between(lng - radius, lng + radius),
        )
        .all()
    )

    if not reports:
        return {
            "lat": lat, "lng": lng, "report_count": 0,
            "risk_score": 0, "risk_label": "Very Low",
            "breakdown": {"high": 0, "medium": 0, "low": 0},
            "unresolved": 0, "top_issues": [],
        }

    total           = len(reports)
    severity_counts = {"high": 0, "medium": 0, "low": 0}
    for r in reports:
        if r.severity:
            key = r.severity.value
            severity_counts[key] = severity_counts.get(key, 0) + 1

    unresolved = sum(1 for r in reports if r.status != ReportStatus.resolved)

    raw_score  = (severity_counts["high"] * 1.0 + severity_counts["medium"] * 0.5 + severity_counts["low"] * 0.2)
    risk_score = min(int((raw_score / max(total, 1)) * 100), 100)
    risk_score = min(risk_score + int((unresolved / max(total, 1)) * 20) + min(total * 2, 30), 100)

    risk_label = "Critical" if risk_score >= 75 else "High" if risk_score >= 50 else "Moderate" if risk_score >= 25 else "Low"

    issue_counts: dict = {}
    for r in reports:
        if r.damage_type:
            issue_counts[r.damage_type] = issue_counts.get(r.damage_type, 0) + 1
    top_issues = sorted(issue_counts.items(), key=lambda x: x[1], reverse=True)[:3]

    return {
        "lat":          lat,
        "lng":          lng,
        "report_count": total,
        "risk_score":   risk_score,
        "risk_label":   risk_label,
        "breakdown":    severity_counts,
        "unresolved":   unresolved,
        "top_issues":   [{"type": t, "count": c} for t, c in top_issues],
    }
