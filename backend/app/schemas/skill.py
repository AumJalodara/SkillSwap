from pydantic import BaseModel, ConfigDict
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
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime

class UserSkillBase(BaseModel):
    skill_id: int
    type: SkillType
    experience_level: Optional[str] = None
    proficiency: Optional[int] = None

class UserSkillCreate(UserSkillBase):
    pass

class UserSkillResponse(UserSkillBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    created_at: datetime
    skill: SkillResponse

