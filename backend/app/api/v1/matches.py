from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.api import deps
from app.models.user import User
from app.models.match import Match, MatchStatus
from app.schemas.match import MatchResponse
from app.matching.recommendation import get_recommendations
from app.matching.schemas import RecommendationResponse
from app.services.notification_service import create_notification

router = APIRouter()

@router.get("/recommendations", response_model=List[RecommendationResponse])
def read_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    recommendations = get_recommendations(db, current_user.id)
    return recommendations

@router.post("/{user_id}/request", response_model=MatchResponse)
def request_match(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot match with yourself")
        
    # Check if target user exists
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")

    # Check if a match already exists
    existing_match = db.query(Match).filter(
        ((Match.user1_id == current_user.id) & (Match.user2_id == user_id)) |
        ((Match.user1_id == user_id) & (Match.user2_id == current_user.id))
    ).first()
    
    if existing_match:
        if existing_match.status == MatchStatus.PENDING:
            raise HTTPException(status_code=400, detail="Match request already exists")
        elif existing_match.status == MatchStatus.ACCEPTED:
            raise HTTPException(status_code=400, detail="Already matched with this user")

    new_match = Match(
        user1_id=current_user.id,
        user2_id=user_id,
        status=MatchStatus.PENDING,
        match_score=0.0
    )
    db.add(new_match)

    # Emit notification to recipient
    create_notification(
        db,
        user_id=user_id,
        title="New Match Request",
        message=f"{current_user.name} sent you a match request!",
        notification_type="MATCH",
        commit=False
    )

    db.commit()
    db.refresh(new_match)
    return new_match

@router.patch("/{match_id}/accept", response_model=MatchResponse)
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

    # Emit notification to requester
    create_notification(
        db,
        user_id=match.user1_id,
        title="Match Accepted",
        message=f"{current_user.name} accepted your match request!",
        notification_type="MATCH",
        commit=False
    )

    db.commit()
    db.refresh(match)
    return match

@router.patch("/{match_id}/reject", response_model=MatchResponse)
def reject_match(
    match_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
        
    if current_user.id not in [match.user1_id, match.user2_id]:
        raise HTTPException(status_code=403, detail="Not authorized to reject this match")
        
    if match.status != MatchStatus.PENDING:
        raise HTTPException(status_code=400, detail="Match is not pending")
        
    match.status = MatchStatus.REJECTED

    # Emit notification to other user
    other_user_id = match.user1_id if current_user.id == match.user2_id else match.user2_id
    create_notification(
        db,
        user_id=other_user_id,
        title="Match Declined",
        message=f"{current_user.name} declined the match request.",
        notification_type="MATCH",
        commit=False
    )

    db.commit()
    db.refresh(match)
    return match

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

