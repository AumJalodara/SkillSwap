from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.credit import TransactionType

class CreditTransactionBase(BaseModel):
    amount: int
    transaction_type: TransactionType
    description: Optional[str] = None
    reference_id: Optional[int] = None

class CreditTransactionCreate(CreditTransactionBase):
    user_id: int

class CreditTransactionResponse(CreditTransactionBase):
    id: int
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class CreditBalanceResponse(BaseModel):
    balance: int
