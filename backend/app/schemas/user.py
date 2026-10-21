from pydantic import BaseModel, EmailStr, ConfigDict, Field, AliasChoices
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    name: str = Field(validation_alias=AliasChoices("name", "full_name"))
    email: EmailStr
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    experience_level: Optional[str] = None
    availability: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = Field(default=None, validation_alias=AliasChoices("name", "full_name"))
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    experience_level: Optional[str] = None
    availability: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)

class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    id: int
    role: str
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
