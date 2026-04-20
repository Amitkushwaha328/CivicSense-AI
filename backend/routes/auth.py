from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field
import random
import string
from google.oauth2 import id_token
from google.auth.transport import requests
from database import get_db
from models.user import User, UserRole
from auth_utils import hash_password, verify_password, create_access_token, get_current_user
from config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ---------- Request / Response Schemas ----------

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class GoogleAuthRequest(BaseModel):
    token: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str = Field(..., min_length=6, max_length=100)


class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    points: int = 0
    city: str | None = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ---------- Routes ----------

@router.post("/register", response_model=TokenResponse, status_code=201)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    # Check if email already exists
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create new user
    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role=UserRole.citizen,
        city=None,
        points=0
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Generate JWT token
    token = create_access_token({"sub": str(user.id)})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    # Find user by email
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not user.password_hash or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Generate JWT token
    token = create_access_token({"sub": str(user.id)})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/google", response_model=TokenResponse)
def google_auth(data: GoogleAuthRequest, db: Session = Depends(get_db)):
    try:
        # Verify the Google JWT token
        # client_id is optional here if we want to accept any valid google token for the project
        # In production, specify: id_token.verify_oauth2_token(data.token, requests.Request(), settings.GOOGLE_CLIENT_ID)
        idinfo = id_token.verify_oauth2_token(data.token, requests.Request())
        
        email = idinfo.get("email")
        name = idinfo.get("name", "Google User")

        if not email:
            raise ValueError("Token didn't provide an email")
            
        # Check if user exists
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            # Create new OAuth user
            user = User(
                name=name,
                email=email,
                password_hash=None,
                auth_provider="google",
                role=UserRole.citizen,
                city=None,
                points=0
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
        # Generate our own app's JWT token!
        token = create_access_token({"sub": str(user.id)})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": user
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail=f"Invalid Google token: {str(e)}"
        )


@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        # We don't want to leak if an email exists, but for demo we can return error or success.
        # Standard security practice is to return success regardless.
        return {"detail": "If the email is registered, a reset code was generated.", "code": None}

    # Generate 6 digit code
    code = ''.join(random.choices(string.digits, k=6))
    user.reset_token = code
    db.commit()

    # MOCK EMAIL: We return the code in the API response so the frontend can display it in a toast/alert for testing.
    return {
        "detail": "Code generated.",
        "mock_email_content": f"Your reset code is: {code}"
    }

@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not user.reset_token or user.reset_token != data.code:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code.")

    # Update password
    user.password_hash = hash_password(data.new_password)
    user.reset_token = None # Clear token
    db.commit()

    return {"detail": "Password successfully reset."}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user