from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class RatingBase(BaseModel):
    session_id: int
    reviewee_id: int
    rating: int # 1-5
    review: Optional[str] = None

class RatingCreate(RatingBase):
    pass

class RatingResponse(RatingBase):
    id: int
    reviewer_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
