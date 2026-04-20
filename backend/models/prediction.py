import uuid
from sqlalchemy import Column, String, Integer, DECIMAL, TIMESTAMP, ForeignKey, CHAR
from sqlalchemy.sql import func
from database import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    report_id = Column(CHAR(36), ForeignKey("reports.id"), nullable=False, index=True)
    damage_class = Column(String(50))
    confidence = Column(DECIMAL(5, 2))
    deterioration_score = Column(Integer)
    predicted_at = Column(TIMESTAMP, server_default=func.now())