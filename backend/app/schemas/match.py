from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from app.models.match import MatchStatus
from app.schemas.user import UserResponse

class MatchBase(BaseModel):
    user1_id: int
    user2_id: int
    match_score: float

class MatchCreate(MatchBase):
    pass

class MatchResponse(MatchBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: MatchStatus
    created_at: Optional[datetime] = None
    
    user1: UserResponse
    user2: UserResponse

