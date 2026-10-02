from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class TransactionType(str, enum.Enum):
    SESSION_EARNED = "SESSION_EARNED"
    SESSION_SPENT = "SESSION_SPENT"
    ADMIN_BONUS = "ADMIN_BONUS"
    SIGNUP_BONUS = "SIGNUP_BONUS"

class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Integer, nullable=False)
    transaction_type = Column(Enum(TransactionType), nullable=False)
    description = Column(String(255), nullable=True)
    reference_id = Column(Integer, nullable=True) # Could refer to session_id
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="transactions")
