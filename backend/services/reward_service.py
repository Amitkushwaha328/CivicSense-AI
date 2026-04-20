from sqlalchemy.orm import Session
from models.reward import Reward
from models.user import User


def add_points(db: Session, user_id: str, points: int, reason: str):
    reward = Reward(user_id=user_id, points=points, reason=reason)
    db.add(reward)
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.points = (user.points or 0) + points
    db.commit()
    return reward