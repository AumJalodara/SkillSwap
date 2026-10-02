from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.api import deps
from app.models.user import User
from app.models.session import Session as DbSession, SessionStatus
from app.schemas.session import SessionCreate, SessionResponse, SessionUpdate

router = APIRouter()

@router.post("/", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    session_in: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    if current_user.id not in [session_in.teacher_id, session_in.learner_id]:
        raise HTTPException(status_code=403, detail="You must be a participant to create a session")

    db_session = DbSession(
        match_id=session_in.match_id,
        teacher_id=session_in.teacher_id,
        learner_id=session_in.learner_id,
        skill_id=session_in.skill_id,
        duration_minutes=session_in.duration_minutes,
        scheduled_at=session_in.scheduled_at,
        status=SessionStatus.REQUESTED
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

@router.get("/", response_model=List[SessionResponse])
def get_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    sessions = db.query(DbSession).filter(
        (DbSession.teacher_id == current_user.id) | (DbSession.learner_id == current_user.id)
    ).all()
    return sessions

@router.patch("/{session_id}/accept", response_model=SessionResponse)
def accept_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    session = db.query(DbSession).filter(DbSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if current_user.id not in [session.teacher_id, session.learner_id]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if session.status != SessionStatus.REQUESTED:
        raise HTTPException(status_code=400, detail="Only REQUESTED sessions can be accepted")
        
    session.status = SessionStatus.ACCEPTED
    db.commit()
    db.refresh(session)
    return session

from app.services.credit_service import transfer_credits_for_session

@router.patch("/{session_id}/schedule", response_model=SessionResponse)
def schedule_session(
    session_id: int,
    session_in: SessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    session = db.query(DbSession).filter(DbSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if current_user.id not in [session.teacher_id, session.learner_id]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if session.status not in [SessionStatus.REQUESTED, SessionStatus.ACCEPTED]:
        raise HTTPException(status_code=400, detail="Session cannot be scheduled from current state")
        
    if session_in.scheduled_at:
        session.scheduled_at = session_in.scheduled_at
    if session_in.meeting_link:
        session.meeting_link = session_in.meeting_link
        
    session.status = SessionStatus.SCHEDULED
    db.commit()
    db.refresh(session)
    return session

@router.patch("/{session_id}/complete", response_model=SessionResponse)
def complete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    session = db.query(DbSession).filter(DbSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if current_user.id not in [session.teacher_id, session.learner_id]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if session.status != SessionStatus.SCHEDULED:
        raise HTTPException(status_code=400, detail="Only SCHEDULED sessions can be completed")
        
    # Attempt to transfer credits
    transfer_credits_for_session(db, session)
    
    session.status = SessionStatus.COMPLETED
    db.commit()
    db.refresh(session)
    return session

@router.patch("/{session_id}/cancel", response_model=SessionResponse)
def cancel_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    session = db.query(DbSession).filter(DbSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if current_user.id not in [session.teacher_id, session.learner_id]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if session.status in [SessionStatus.COMPLETED, SessionStatus.CANCELLED, SessionStatus.NO_SHOW]:
        raise HTTPException(status_code=400, detail="Session cannot be cancelled from current state")
        
    session.status = SessionStatus.CANCELLED
    db.commit()
    db.refresh(session)
    return session
