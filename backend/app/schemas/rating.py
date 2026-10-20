from pydantic import BaseModel, ConfigDict
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
    model_config = ConfigDict(from_attributes=True)

    id: int
    reviewer_id: int
    created_at: datetime

