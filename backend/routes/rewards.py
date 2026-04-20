from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models.reward import Reward
from models.user import User
from auth_utils import get_current_user

router = APIRouter(prefix="/rewards", tags=["Rewards"])


@router.get("/my")
def my_rewards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rewards = (
        db.query(Reward)
        .filter(Reward.user_id == str(current_user.id))
        .order_by(Reward.created_at.desc())
        .limit(20)
        .all()
    )
    return {
        "total_points": current_user.points or 0,
        "transactions": [
            {
                "points": r.points,
                "reason": r.reason,
                "created_at": str(r.created_at),
            }
            for r in rewards
        ],
    }


@router.get("/leaderboard")
def leaderboard(db: Session = Depends(get_db)):
    users = (
        db.query(User)
        .filter(User.role == "citizen")
        .order_by(User.points.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "rank": i + 1,
            "name": u.name,
            "city": u.city,
            "points": u.points or 0,
        }
        for i, u in enumerate(users)
    ]