from typing import List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.user import User
from app.models.skill import UserSkill, SkillType

def get_candidate_users(db: Session, current_user_id: int) -> List[User]:
    """
    Find candidate users for matching.
    For MVP, we just fetch users who are not the current user.
    """
    # Exclude users already matched with (blocked, etc.)
    # For now, simply return all other users who have at least one skill to teach or learn
    candidates = db.query(User).filter(User.id != current_user_id).all()
    return candidates

def get_user_skills(db: Session, user_id: int) -> Tuple[List[UserSkill], List[UserSkill]]:
    """Returns a tuple of (teaching_skills, learning_skills) for a user."""
    skills = db.query(UserSkill).filter(UserSkill.user_id == user_id).all()
    teaching = [s for s in skills if s.type == SkillType.TEACH]
    learning = [s for s in skills if s.type == SkillType.LEARN]
    return teaching, learning
