from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.core.database import get_db
from app.api import deps
from app.models.user import User
from app.models.credit import CreditTransaction
from app.schemas.credit import CreditTransactionResponse, CreditBalanceResponse

router = APIRouter()

@router.get("/balance", response_model=CreditBalanceResponse)
def get_balance(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    # Calculate sum of all transactions for user
    total = db.query(func.sum(CreditTransaction.amount)).filter(
        CreditTransaction.user_id == current_user.id
    ).scalar()
    
    balance = total if total else 0
    # Startup bonus? (Not required right now, defaults to 0)
    return {"balance": balance}

@router.get("/transactions", response_model=List[CreditTransactionResponse])
def get_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    transactions = db.query(CreditTransaction).filter(
        CreditTransaction.user_id == current_user.id
    ).order_by(CreditTransaction.created_at.desc()).all()
    return transactions
