from pydantic import BaseModel
from typing import List

class RecommendationResponse(BaseModel):
    user_id: int
    name: str
    profile_image: str | None = None
    match_score: float
    reasons: List[str]
    teaches: List[str]
    wants: List[str]
