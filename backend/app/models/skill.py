from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class SkillType(str, enum.Enum):
    TEACH = "TEACH"
    LEARN = "LEARN"

class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    category = Column(String(100), index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    users = relationship("UserSkill", back_populates="skill")

class UserSkill(Base):
    __tablename__ = "user_skills"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id"), nullable=False)
    type = Column(Enum(SkillType), nullable=False)
    experience_level = Column(String(50), nullable=True)
    proficiency = Column(Integer, nullable=True) # 1-5 scale
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "skill_id", "type", name="uq_user_skill_type"),
    )
    # Relationships
    user = relationship("User", back_populates="skills")
    skill = relationship("Skill", back_populates="users")
