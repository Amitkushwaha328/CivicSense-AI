import uuid
from sqlalchemy import Column, String, Integer, TIMESTAMP, ForeignKey, CHAR
from sqlalchemy.sql import func
from database import Base


class Reward(Base):
    __tablename__ = "rewards"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(CHAR(36), ForeignKey("users.id"), nullable=False, index=True)
    points = Column(Integer, nullable=False)
    reason = Column(String(100), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())