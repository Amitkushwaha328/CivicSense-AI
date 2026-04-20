import uuid
import enum
from sqlalchemy import Column, String, Integer, Enum, TIMESTAMP, CHAR
from sqlalchemy.sql import func
from database import Base


class UserRole(str, enum.Enum):
    citizen = "citizen"
    municipality = "municipality"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True) # Now nullable for Google users
    auth_provider = Column(String(50), default="local") # "local" or "google"
    reset_token = Column(String(50), nullable=True)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.citizen)
    points = Column(Integer, default=0)
    city = Column(String(80))
    created_at = Column(TIMESTAMP, server_default=func.now())