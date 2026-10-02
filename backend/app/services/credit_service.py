from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.credit import CreditTransaction, TransactionType
from app.models.session import Session as DbSession
from fastapi import HTTPException

def get_user_balance(db: Session, user_id: int) -> int:
    total = db.query(func.sum(CreditTransaction.amount)).filter(
        CreditTransaction.user_id == user_id
    ).scalar()
    return total if total else 0

def grant_initial_credits(db: Session, user_id: int, amount: int = 2):
    # Check if a signup bonus already exists
    existing_tx = db.query(CreditTransaction).filter(
        CreditTransaction.user_id == user_id,
        CreditTransaction.transaction_type == TransactionType.SIGNUP_BONUS
    ).first()
    
    if existing_tx:
        return
        
    bonus_tx = CreditTransaction(
        user_id=user_id,
        amount=amount,
        transaction_type=TransactionType.SIGNUP_BONUS,
        description="Initial signup bonus"
    )
    db.add(bonus_tx)
    db.commit()

def transfer_credits_for_session(db: Session, session: DbSession):
    """
    Transfers 1 credit from learner to teacher for a completed session.
    """
    # Check if credits were already transferred for this session
    existing_tx = db.query(CreditTransaction).filter(
        CreditTransaction.reference_id == session.id,
        CreditTransaction.transaction_type.in_([TransactionType.SESSION_EARNED, TransactionType.SESSION_SPENT])
    ).first()
    
    if existing_tx:
        raise HTTPException(status_code=400, detail="Credits already transferred for this session")

    # Assuming cost is 1 credit. You can adjust based on duration.
    cost = 1

    # Check learner balance
    learner_balance = get_user_balance(db, session.learner_id)
    if learner_balance < cost:
        raise HTTPException(status_code=400, detail="Learner does not have enough credits to complete this session")

    # Create transaction for learner (spend)
    learner_tx = CreditTransaction(
        user_id=session.learner_id,
        amount=-cost,
        transaction_type=TransactionType.SESSION_SPENT,
        description=f"Spent on session with {session.teacher.name}",
        reference_id=session.id
    )

    # Create transaction for teacher (earn)
    teacher_tx = CreditTransaction(
        user_id=session.teacher_id,
        amount=cost,
        transaction_type=TransactionType.SESSION_EARNED,
        description=f"Earned from teaching {session.learner.name}",
        reference_id=session.id
    )

    db.add(learner_tx)
    db.add(teacher_tx)
    # The caller is responsible for db.commit(), but to enforce atomicity we can do it here 
    # if it's called in a route, or the route commits everything. Let's assume the caller commits.
