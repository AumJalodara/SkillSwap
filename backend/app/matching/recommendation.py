from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.matching.matcher import get_candidate_users, get_user_skills
from app.matching.scoring import calculate_compatibility

def get_recommendations(db: Session, current_user_id: int) -> List[Dict[str, Any]]:
    candidates = get_candidate_users(db, current_user_id)
    current_teaching, current_learning = get_user_skills(db, current_user_id)
    
    recommendations = []
    
    for candidate in candidates:
        candidate_teaching, candidate_learning = get_user_skills(db, candidate.id)
        
        score, reasons = calculate_compatibility(
            user_a_teaching=current_teaching,
            user_a_learning=current_learning,
            user_b_teaching=candidate_teaching,
            user_b_learning=candidate_learning
        )
        
        # Only recommend if there is some compatibility (score > 30)
        if score > 30:
            from app.models.rating import Rating
            ratings = db.query(Rating.rating).filter(Rating.reviewee_id == candidate.id).all()
            avg_rating = round(sum(r[0] for r in ratings) / len(ratings), 1) if ratings else None

            recommendations.append({
                "user_id": candidate.id,
                "name": candidate.name,
                "profile_image": candidate.profile_image,
                "match_score": score,
                "reasons": reasons,
                "teaches": [s.skill.name for s in candidate_teaching],
                "wants": [s.skill.name for s in candidate_learning],
                "average_rating": avg_rating,
                "ratings_count": len(ratings)
            })
            
    # Sort by highest score
    recommendations.sort(key=lambda x: x["match_score"], reverse=True)
    return recommendations
