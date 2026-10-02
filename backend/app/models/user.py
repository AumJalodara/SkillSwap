from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Float, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class UserRole(str, enum.Enum):
    STUDENT = "STUDENT"
    ADMIN = "ADMIN"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    bio = Column(Text, nullable=True)
    profile_image = Column(String(255), nullable=True)
    experience_level = Column(String(50), nullable=True)
    availability = Column(String(255), nullable=True)
    role = Column(Enum(UserRole), default=UserRole.STUDENT)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    skills = relationship("UserSkill", back_populates="user")
    sent_matches = relationship("Match", foreign_keys="Match.user1_id", back_populates="user1")
    received_matches = relationship("Match", foreign_keys="Match.user2_id", back_populates="user2")
    transactions = relationship("CreditTransaction", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
