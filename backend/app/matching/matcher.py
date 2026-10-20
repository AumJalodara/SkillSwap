from typing import List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.user import User
from app.models.skill import UserSkill, SkillType

from app.models.match import Match, MatchStatus

def get_candidate_users(db: Session, current_user_id: int) -> List[User]:
    """
    Find candidate users for matching.
    Excludes the current user and users with active (PENDING, ACCEPTED, BLOCKED) matches.
    """
    active_matches = db.query(Match).filter(
        or_(Match.user1_id == current_user_id, Match.user2_id == current_user_id),
        Match.status.in_([MatchStatus.PENDING, MatchStatus.ACCEPTED, MatchStatus.BLOCKED])
    ).all()

    excluded_ids = {current_user_id}
    for m in active_matches:
        excluded_ids.add(m.user1_id if m.user2_id == current_user_id else m.user2_id)

    candidates = db.query(User).filter(~User.id.in_(excluded_ids)).all()
    return candidates


def get_user_skills(db: Session, user_id: int) -> Tuple[List[UserSkill], List[UserSkill]]:
    """Returns a tuple of (teaching_skills, learning_skills) for a user."""
    skills = db.query(UserSkill).filter(UserSkill.user_id == user_id).all()
    teaching = [s for s in skills if s.type == SkillType.TEACH]
    learning = [s for s in skills if s.type == SkillType.LEARN]
    return teaching, learning
