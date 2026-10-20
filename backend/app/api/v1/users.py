from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.api import deps
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate

router = APIRouter()

def update_user_profile(user: User, user_in: UserUpdate, db: Session) -> User:
    update_data = user_in.model_dump(exclude_unset=True)
    
    # Validation
    if "name" in update_data:
        name_val = (update_data["name"] or "").strip()
        if not name_val:
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        if len(name_val) > 255:
            raise HTTPException(status_code=400, detail="Name cannot exceed 255 characters")
        user.name = name_val

    if "bio" in update_data:
        user.bio = update_data["bio"]

    if "profile_image" in update_data:
        user.profile_image = update_data["profile_image"]

    if "experience_level" in update_data:
        user.experience_level = update_data["experience_level"]

    if "availability" in update_data:
        user.availability = update_data["availability"]

    db.commit()
    db.refresh(user)
    return user

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user: User = Depends(deps.get_current_active_user)
):
    return current_user

@router.patch("/me", response_model=UserResponse)
def update_current_user_profile(
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    return update_user_profile(current_user, user_in, db)

@router.get("/{user_id}", response_model=UserResponse)
def get_user_public_profile(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
