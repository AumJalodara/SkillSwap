from typing import List, Tuple
from app.models.skill import UserSkill

def calculate_compatibility(
    user_a_teaching: List[UserSkill],
    user_a_learning: List[UserSkill],
    user_b_teaching: List[UserSkill],
    user_b_learning: List[UserSkill]
) -> Tuple[float, List[str]]:
    """
    Calculate Match Score =
        50% × Reciprocal Skill Compatibility
      + 20% × Learning Goal Compatibility (skipped for simplicity, combined below)
      + 10% × Availability Compatibility (mock)
      + 10% × Experience Compatibility (mock)
      + 10% × Rating (mock)
    """
    score = 0.0
    reasons = []

    # Reciprocal Match Logic
    a_wants_from_b = [s for s in user_a_learning if any(ts.skill_id == s.skill_id for ts in user_b_teaching)]
    b_wants_from_a = [s for s in user_b_learning if any(ts.skill_id == s.skill_id for ts in user_a_teaching)]

    has_reciprocal_match = False

    if a_wants_from_b and b_wants_from_a:
        score += 70.0 # High base score for reciprocal
        has_reciprocal_match = True
        reasons.append(f"They can teach {a_wants_from_b[0].skill.name}, which you want to learn.")
        reasons.append(f"You can teach {b_wants_from_a[0].skill.name}, which they want to learn.")
    elif a_wants_from_b:
        score += 35.0
        reasons.append(f"They can teach {a_wants_from_b[0].skill.name}, which you want to learn.")
    elif b_wants_from_a:
        score += 35.0
        reasons.append(f"You can teach {b_wants_from_a[0].skill.name}, which they want to learn.")
    
    # Add some mock points for availability, experience, rating (up to 30)
    score += 22.0 # Baseline points for these for MVP
    
    if has_reciprocal_match:
        score += 8.0 # boost for perfect match
        
    return min(score, 100.0), reasons
