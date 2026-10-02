from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.api import deps
from app.models.user import User
from app.models.skill import Skill, UserSkill
from app.schemas.skill import SkillCreate, SkillResponse, UserSkillCreate, UserSkillResponse

router = APIRouter()

@router.get("/", response_model=List[SkillResponse])
def get_skills(db: Session = Depends(get_db)):
    return db.query(Skill).all()

@router.post("/", response_model=SkillResponse)
def create_skill(skill_in: SkillCreate, db: Session = Depends(get_db)):
    db_skill = db.query(Skill).filter(Skill.name == skill_in.name).first()
    if db_skill:
        raise HTTPException(status_code=400, detail="Skill already exists")
    new_skill = Skill(name=skill_in.name, category=skill_in.category, description=skill_in.description)
    db.add(new_skill)
    db.commit()
    db.refresh(new_skill)
    return new_skill

@router.get("/me", response_model=List[UserSkillResponse])
def get_my_skills(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    return db.query(UserSkill).filter(UserSkill.user_id == current_user.id).all()

@router.post("/me", response_model=UserSkillResponse)
def add_user_skill(
    user_skill_in: UserSkillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    skill = db.query(Skill).filter(Skill.id == user_skill_in.skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
        
    db_user_skill = db.query(UserSkill).filter(
        UserSkill.user_id == current_user.id,
        UserSkill.skill_id == user_skill_in.skill_id,
        UserSkill.type == user_skill_in.type
    ).first()
    
    if db_user_skill:
        raise HTTPException(status_code=400, detail="User already has this skill type associated")
        
    new_user_skill = UserSkill(
        user_id=current_user.id,
        skill_id=user_skill_in.skill_id,
        type=user_skill_in.type,
        experience_level=user_skill_in.experience_level,
        proficiency=user_skill_in.proficiency
    )
    db.add(new_user_skill)
    db.commit()
    db.refresh(new_user_skill)
    return new_user_skill

from app.schemas.ai import SkillExtractionRequest, SkillExtractionResponse
from app.services.ai_service import extract_skills_from_text

@router.post("/extract", response_model=SkillExtractionResponse)
async def extract_skills(req: SkillExtractionRequest, current_user: User = Depends(deps.get_current_active_user)):
    """
    Optional AI-powered endpoint to extract skills from text.
    Fails gracefully if API is unavailable.
    """
    result = await extract_skills_from_text(req.text)
    return result
