import sys
import types
import os

# Fix TensorFlow / Google API Protobuf dependency hell
os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

# --- CRITICAL STARTUP PATCH FOR PYTHON 3.13 & BCRYPT 4.0+ ---
# 1. Fix missing 'crypt' module in Python 3.13
if sys.version_info >= (3, 13) and "crypt" not in sys.modules:
    sys.modules["crypt"] = types.ModuleType("crypt")

# 2. Fix Passlib 72-byte limit crash with newer bcrypt
try:
    import bcrypt
    # Wrap bcrypt.hashpw to satisfy passlib's internal self-test
    _original_hashpw = bcrypt.hashpw
    def _patched_hashpw(password, salt):
        if isinstance(password, str):
            password = password.encode("utf-8")
        # Explicit truncation to 72 bytes prevent ValueError in bcrypt 4.0+
        return _original_hashpw(password[:72], salt)
    bcrypt.hashpw = _patched_hashpw
except ImportError:
    pass
# -----------------------------------------------------------

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from rate_limiter import limiter

import models.user
import models.report
import models.prediction
import models.complaint
import models.reward

from routes.auth       import router as auth_router
from routes.reports    import router as reports_router
from routes.complaints import router as complaints_router
from routes.rewards    import router as rewards_router
from routes.admin      import router as admin_router
from routes.predict    import router as predict_router
from routes.ws         import router as ws_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CivicSense AI",
    description="AI-powered smart city civic issue detection platform",
    version="3.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production: Update with your Vercel URL later for security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(auth_router)
app.include_router(reports_router)
app.include_router(complaints_router)
app.include_router(rewards_router)
app.include_router(admin_router)
app.include_router(predict_router)
app.include_router(ws_router)

@app.get("/")
def root():
    return {"message": "CivicSense AI v3.0 is running!", "status": "online"}