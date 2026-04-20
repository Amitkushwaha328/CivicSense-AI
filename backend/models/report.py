import uuid
import enum
from sqlalchemy import Column, String, Enum, TIMESTAMP, DECIMAL, Text, ForeignKey, CHAR
from sqlalchemy.sql import func
from database import Base


class SeverityLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class ReportStatus(str, enum.Enum):
    pending        = "pending"
    verified       = "verified"
    complaint_sent = "complaint_sent"
    resolved       = "resolved"
    rejected       = "rejected"


class Report(Base):
    __tablename__ = "reports"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(CHAR(36), ForeignKey("users.id"), nullable=False, index=True)
    image_url = Column(Text, nullable=False)
    latitude = Column(DECIMAL(9, 6), nullable=False)
    longitude = Column(DECIMAL(9, 6), nullable=False)
    address = Column(Text)
    damage_type = Column(String(50))
    severity = Column(Enum(SeverityLevel))
    status = Column(Enum(ReportStatus), default=ReportStatus.pending, index=True)
    official_note = Column(Text, nullable=True)   # Note from municipality/admin on resolve or reject
    created_at = Column(TIMESTAMP, server_default=func.now())