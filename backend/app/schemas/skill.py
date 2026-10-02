from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.skill import SkillType

class SkillBase(BaseModel):
    name: str
    category: Optional[str] = None
    description: Optional[str] = None

class SkillCreate(SkillBase):
    pass

class SkillResponse(SkillBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserSkillBase(BaseModel):
    skill_id: int
    type: SkillType
    experience_level: Optional[str] = None
    proficiency: Optional[int] = None

class UserSkillCreate(UserSkillBase):
    pass

class UserSkillResponse(UserSkillBase):
    id: int
    user_id: int
    created_at: datetime
    skill: SkillResponse
    
    class Config:
        from_attributes = True
