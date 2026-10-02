from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.session import SessionStatus
from app.schemas.user import UserResponse
from app.schemas.skill import SkillResponse

class SessionBase(BaseModel):
    match_id: int
    teacher_id: int
    learner_id: int
    skill_id: int
    duration_minutes: Optional[int] = 60
    scheduled_at: Optional[datetime] = None

class SessionCreate(SessionBase):
    pass

class SessionUpdate(BaseModel):
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    meeting_link: Optional[str] = None

class SessionResponse(SessionBase):
    id: int
    status: SessionStatus
    meeting_link: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    teacher: UserResponse
    learner: UserResponse
    skill: SkillResponse

    class Config:
        from_attributes = True
