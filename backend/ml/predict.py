"""
CivicSense AI — ML Inference Module
Loads the trained YOLOv8 model and provides predict functions called by FastAPI routes.

Models expected at:
  backend/ml/saved_models/efficientnet_road.pt   (YOLOv8 — trained from notebook)
  backend/ml/saved_models/deterioration_model.pkl (XGBoost — trained from notebook 03)

If models are not yet trained, endpoints fall back gracefully.
"""

import os
import numpy as np
import joblib
from pathlib import Path
from ultralytics import YOLO

# ── Paths ─────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent
MODEL_DIR  = BASE_DIR / "saved_models"
YOLO_PATH  = MODEL_DIR / "efficientnet_road.pt"
XGB_PATH   = MODEL_DIR / "deterioration_model.pkl"

# Confidence threshold for object detection
CONF_THRESHOLD = 0.30

# The 9 classes your Roboflow model was trained on
# Note: The YOLO model object will contain its own 'names' dictionary,
# but we can keep these for reference or explicit mapping if needed.

# ── Persistence ─────────────────────────────────────────────────────────────
_yolo_model = None
_xgb_model = None

def _load_yolo():
    global _yolo_model
    if _yolo_model is None:
        if not YOLO_PATH.exists():
            print(f"⚠️ [ML] YOLOv8 model NOT FOUND at {YOLO_PATH}")
            return None
        try:
            _yolo_model = YOLO(str(YOLO_PATH))
            print(f"[ML] YOLOv8 model PRE-LOADED and ready at {YOLO_PATH}")
        except Exception as e:
            print(f"[ML] YOLOv8 load error: {e}")
    return _yolo_model

# Trigger pre-load on module import
_load_yolo()


def predict_damage(image_url: str) -> dict:
    """Run YOLOv8 inference using an image URL."""
    try:
        import httpx
        response = httpx.get(image_url, timeout=15)
        response.raise_for_status()
        return predict_damage_from_bytes(response.content)
    except Exception as e:
        return {"status": "error", "message": f"URL fetch error: {e}"}

def predict_damage_from_bytes(image_bytes: bytes) -> dict:
    """
    Run YOLOv8 inference on raw image bytes.
    Returns the highest-confidence detection, or 'No Issue Found'.
    """
    import io
    from PIL import Image

    model = _load_yolo()
    if model is None:
        return {
            "status":      "model_not_trained",
            "message":     "YOLOv8 Model file missing",
            "top_class":   None,
        }

    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        # YOLOv8 inference — verbose=False silences per-image console spam
        results = model(img, verbose=False, conf=CONF_THRESHOLD)[0]

        if results.boxes is None or len(results.boxes) == 0:
            # No detections above threshold
            return {
                "status":         "success",
                "top_class":      "No Issue Found",
                "confidence":     1.0,  # Highly confident there's no issue
                "confidence_pct": 100.0,
                "predictions":    [],
                "model_used":     "YOLOv8-Local",
                "is_multiclass":  True,
            }

        # Gather all detections and pick the highest-confidence one
        boxes = results.boxes
        confs  = boxes.conf.cpu().numpy()      # shape: (N,)
        cls_ids = boxes.cls.cpu().numpy().astype(int)  # shape: (N,)

        # Use the model's own class names
        names = model.names  # dict: {0: 'pothole', 1: 'Garbage', ...}

        best_idx  = int(np.argmax(confs))
        best_conf = float(confs[best_idx])
        best_cls  = names[cls_ids[best_idx]]

        # Build ranked list (unique classes, max conf per class)
        class_conf: dict[str, float] = {}
        for c, cf in zip(cls_ids, confs):
            cname = names[c]
            if cname not in class_conf or cf > class_conf[cname]:
                class_conf[cname] = float(cf)

        ranked = sorted(
            [{"class_name": k, "confidence": round(v, 4), "confidence_pct": round(v * 100, 2)}
             for k, v in class_conf.items()],
            key=lambda x: x["confidence"], reverse=True
        )

        return {
            "status":         "success",
            "top_class":      best_cls,
            "confidence":     round(best_conf, 4),
            "confidence_pct": round(best_conf * 100, 2),
            "predictions":    ranked,
            "model_used":     "YOLOv8-Local",
            "is_multiclass":  True,
        }
    except Exception as e:
        return {"status": "error", "message": f"Inference error: {e}"}


# ── XGBoost Deterioration Model ────────────────────────────────────────────

def _load_xgb():
    global _xgb_model
    if _xgb_model is None:
        if not XGB_PATH.exists():
            return None
        try:
            _xgb_model = joblib.load(str(XGB_PATH))
            print(f"[ML] XGBoost model loaded from {XGB_PATH}")
        except Exception as e:
            print(f"[ML] XGBoost load error: {e}")
            return None
    return _xgb_model


def predict_deterioration_ml(
    reports_last_30: int,
    avg_monthly_rainfall_mm: float,
    road_age_years: float,
    traffic_density: float,
    days_since_repair: int,
    severity_weighted_count: float,
) -> dict:
    """
    Predict deterioration risk (0–100) using trained XGBoost model.
    Falls back to rule-based score if model not found.
    """
    model = _load_xgb()

    features = np.array([[
        reports_last_30,
        avg_monthly_rainfall_mm,
        road_age_years,
        traffic_density,
        days_since_repair,
        severity_weighted_count,
    ]], dtype=np.float32)

    if model is None:
        # Rule-based fallback
        risk = min(
            int(reports_last_30 * 3 + severity_weighted_count * 5 +
                road_age_years * 2 + (days_since_repair / 30) * 2),
            100
        )
        label = "Critical" if risk >= 75 else "High" if risk >= 50 else "Moderate" if risk >= 25 else "Low"
        return {
            "status":      "fallback_rule_based",
            "risk_score":  risk,
            "risk_label":  label,
            "model_used":  "rule_based",
            "features":    {
                "reports_last_30":         reports_last_30,
                "avg_monthly_rainfall_mm": avg_monthly_rainfall_mm,
                "road_age_years":          road_age_years,
                "traffic_density":         traffic_density,
                "days_since_repair":       days_since_repair,
                "severity_weighted_count": severity_weighted_count,
            },
        }

    try:
        score = float(model.predict(features)[0])
        score = max(0.0, min(100.0, score))
        label = "Critical" if score >= 75 else "High" if score >= 50 else "Moderate" if score >= 25 else "Low"
        return {
            "status":      "success",
            "risk_score":  round(score, 1),
            "risk_label":  label,
            "model_used":  "XGBoost-v1",
            "features":    {
                "reports_last_30":         reports_last_30,
                "avg_monthly_rainfall_mm": avg_monthly_rainfall_mm,
                "road_age_years":          road_age_years,
                "traffic_density":         traffic_density,
                "days_since_repair":       days_since_repair,
                "severity_weighted_count": severity_weighted_count,
            },
        }
    except Exception as e:
        return {"status": "error", "message": str(e), "risk_score": None}
