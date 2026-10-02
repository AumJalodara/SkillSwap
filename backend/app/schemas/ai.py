from pydantic import BaseModel

class SkillExtractionRequest(BaseModel):
    text: str

class SkillExtractionResponse(BaseModel):
    teaching: list[str]
    learning: list[str]
