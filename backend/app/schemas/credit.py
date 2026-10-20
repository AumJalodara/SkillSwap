from pydantic import BaseModel, ConfigDict
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
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    created_at: datetime

class CreditBalanceResponse(BaseModel):
    balance: int

