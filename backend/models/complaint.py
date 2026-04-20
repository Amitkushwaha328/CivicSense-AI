import uuid
from sqlalchemy import Column, String, Text, TIMESTAMP, ForeignKey, CHAR
from database import Base


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    report_id = Column(CHAR(36), ForeignKey("reports.id"), nullable=False)
    pdf_url = Column(Text)
    sent_to_email = Column(String(150))
    sent_at = Column(TIMESTAMP)
    resolved_at = Column(TIMESTAMP)
    resolution_note = Column(Text)