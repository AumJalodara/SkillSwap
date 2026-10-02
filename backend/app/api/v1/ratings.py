from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.api import deps
from app.models.user import User
from app.models.rating import Rating
from app.models.session import Session as DbSession, SessionStatus
from app.schemas.rating import RatingCreate, RatingResponse

router = APIRouter()

@router.post("/", response_model=RatingResponse, status_code=status.HTTP_201_CREATED)
def create_rating(
    rating_in: RatingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    if not (1 <= rating_in.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
        
    session = db.query(DbSession).filter(DbSession.id == rating_in.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if session.status != SessionStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Session must be COMPLETED to rate")
        
    # Check if user was in session
    if current_user.id not in [session.teacher_id, session.learner_id]:
        raise HTTPException(status_code=403, detail="Not a participant in this session")
        
    # Check if already rated
    existing_rating = db.query(Rating).filter(
        Rating.session_id == rating_in.session_id,
        Rating.reviewer_id == current_user.id
    ).first()
    
    if existing_rating:
        raise HTTPException(status_code=400, detail="You have already rated this session")
        
    db_rating = Rating(
        session_id=rating_in.session_id,
        reviewer_id=current_user.id,
        reviewee_id=rating_in.reviewee_id,
        rating=rating_in.rating,
        review=rating_in.review
    )
    db.add(db_rating)
    db.commit()
    db.refresh(db_rating)
    return db_rating

@router.get("/me", response_model=List[RatingResponse])
def get_my_ratings(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    # Ratings received by the user
    ratings = db.query(Rating).filter(Rating.reviewee_id == current_user.id).all()
    return ratings
