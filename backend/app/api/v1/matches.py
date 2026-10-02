from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.api import deps
from app.models.user import User
from app.matching.recommendation import get_recommendations
from app.matching.schemas import RecommendationResponse

router = APIRouter()

@router.get("/recommendations", response_model=List[RecommendationResponse])
def read_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    recommendations = get_recommendations(db, current_user.id)
    return recommendations

from app.models.match import Match, MatchStatus
from fastapi import HTTPException

@router.post("/{user_id}/request")
def request_match(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot match with yourself")
        
    # Check if a match already exists
    existing_match = db.query(Match).filter(
        ((Match.user1_id == current_user.id) & (Match.user2_id == user_id)) |
        ((Match.user1_id == user_id) & (Match.user2_id == current_user.id))
    ).first()
    
    if existing_match:
        raise HTTPException(status_code=400, detail="Match request already exists")
        
    # In a real system, recalculate score here to store it
    new_match = Match(
        user1_id=current_user.id,
        user2_id=user_id,
        status=MatchStatus.PENDING,
        match_score=0.0
    )
    db.add(new_match)
    db.commit()
    db.refresh(new_match)
    return new_match

@router.patch("/{match_id}/accept")
def accept_match(
    match_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
        
    if match.user2_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to accept this match")
        
    if match.status != MatchStatus.PENDING:
        raise HTTPException(status_code=400, detail="Match is not pending")
        
    match.status = MatchStatus.ACCEPTED
    db.commit()
    db.refresh(match)
    return match

from app.schemas.match import MatchResponse

@router.get("/pending", response_model=List[MatchResponse])
def get_pending_matches(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    # Matches where the current user is user2 (the one receiving the request)
    matches = db.query(Match).filter(
        Match.user2_id == current_user.id,
        Match.status == MatchStatus.PENDING
    ).all()
    return matches

@router.get("/accepted", response_model=List[MatchResponse])
def get_accepted_matches(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    matches = db.query(Match).filter(
        ((Match.user1_id == current_user.id) | (Match.user2_id == current_user.id)),
        Match.status == MatchStatus.ACCEPTED
    ).all()
    return matches
