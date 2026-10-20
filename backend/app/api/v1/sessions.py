from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.api import deps
from app.models.user import User
from app.models.session import Session as DbSession, SessionStatus
from app.models.match import Match, MatchStatus
from app.models.skill import Skill, UserSkill, SkillType
from app.schemas.session import SessionCreate, SessionResponse, SessionUpdate
from app.services.credit_service import get_user_balance, transfer_credits_for_session
from app.services.notification_service import create_notification

router = APIRouter()

@router.post("/", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    session_in: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    if session_in.teacher_id == session_in.learner_id:
        raise HTTPException(status_code=400, detail="Teacher and learner cannot be the same user")

    if current_user.id not in [session_in.teacher_id, session_in.learner_id]:
        raise HTTPException(status_code=403, detail="You must be a participant to create a session")

    # 1. Validate referenced match exists and is ACCEPTED
    match = db.query(Match).filter(Match.id == session_in.match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Referenced match not found")
        
    if match.status != MatchStatus.ACCEPTED:
        raise HTTPException(status_code=400, detail="Sessions can only be created for ACCEPTED matches")

    # 2. Validate teacher and learner are the participants of this match
    match_participants = {match.user1_id, match.user2_id}
    if match_participants != {session_in.teacher_id, session_in.learner_id}:
        raise HTTPException(status_code=400, detail="Teacher and learner must be the participants in this match")

    # 3. Validate skill exists
    skill = db.query(Skill).filter(Skill.id == session_in.skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    # 4. Validate teacher actually offers this skill to teach
    teacher_skill = db.query(UserSkill).filter(
        UserSkill.user_id == session_in.teacher_id,
        UserSkill.skill_id == session_in.skill_id,
        UserSkill.type == SkillType.TEACH
    ).first()
    if not teacher_skill:
        raise HTTPException(status_code=400, detail="Teacher does not offer this skill to teach")

    # 5. Validate learner has sufficient credits
    learner_balance = get_user_balance(db, session_in.learner_id)
    if learner_balance < 1:
        raise HTTPException(status_code=400, detail="Learner does not have enough credits to request a session")

    db_session = DbSession(
        match_id=session_in.match_id,
        teacher_id=session_in.teacher_id,
        learner_id=session_in.learner_id,
        skill_id=session_in.skill_id,
        duration_minutes=session_in.duration_minutes or 60,
        scheduled_at=session_in.scheduled_at,
        status=SessionStatus.REQUESTED
    )
    db.add(db_session)

    # Emit notification to other participant
    other_user_id = session_in.teacher_id if current_user.id == session_in.learner_id else session_in.learner_id
    create_notification(
        db,
        user_id=other_user_id,
        title="New Session Request",
        message=f"{current_user.name} requested a learning session for {skill.name}.",
        notification_type="SESSION",
        commit=False
    )

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

    other_user_id = session.learner_id if current_user.id == session.teacher_id else session.teacher_id
    skill_name = session.skill.name if session.skill else "the skill"
    create_notification(
        db,
        user_id=other_user_id,
        title="Session Accepted",
        message=f"{current_user.name} accepted your session for {skill_name}.",
        notification_type="SESSION",
        commit=False
    )

    db.commit()
    db.refresh(session)
    return session

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
        
    if session.status not in [SessionStatus.REQUESTED, SessionStatus.ACCEPTED, SessionStatus.SCHEDULED]:
        raise HTTPException(status_code=400, detail="Session cannot be scheduled from current state")
        
    if session_in.scheduled_at:
        session.scheduled_at = session_in.scheduled_at
    if session_in.meeting_link:
        session.meeting_link = session_in.meeting_link
    if session_in.duration_minutes:
        session.duration_minutes = session_in.duration_minutes
        
    session.status = SessionStatus.SCHEDULED

    other_user_id = session.learner_id if current_user.id == session.teacher_id else session.teacher_id
    skill_name = session.skill.name if session.skill else "the session"
    create_notification(
        db,
        user_id=other_user_id,
        title="Session Scheduled",
        message=f"Session for {skill_name} was scheduled by {current_user.name}.",
        notification_type="SESSION",
        commit=False
    )

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

    other_user_id = session.learner_id if current_user.id == session.teacher_id else session.teacher_id
    skill_name = session.skill.name if session.skill else "the session"
    create_notification(
        db,
        user_id=other_user_id,
        title="Session Completed",
        message=f"Session for {skill_name} was marked as completed. Please leave a rating!",
        notification_type="SESSION",
        commit=False
    )

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

    other_user_id = session.learner_id if current_user.id == session.teacher_id else session.teacher_id
    skill_name = session.skill.name if session.skill else "the session"
    create_notification(
        db,
        user_id=other_user_id,
        title="Session Cancelled",
        message=f"Session for {skill_name} was cancelled by {current_user.name}.",
        notification_type="SESSION",
        commit=False
    )

    db.commit()
    db.refresh(session)
    return session

