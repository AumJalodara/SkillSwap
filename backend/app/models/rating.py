from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Rating(Base):
    __tablename__ = "ratings"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reviewee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False) # 1-5
    review = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("session_id", "reviewer_id", name="uq_session_reviewer"),
    )

    # Relationships
    session = relationship("Session", back_populates="ratings")
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    reviewee = relationship("User", foreign_keys=[reviewee_id])
