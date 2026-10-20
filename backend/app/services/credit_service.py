from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.credit import CreditTransaction, TransactionType
from app.models.session import Session as DbSession
from app.models.user import User
from app.services.notification_service import create_notification
from fastapi import HTTPException

def get_user_balance(db: Session, user_id: int) -> int:
    total = db.query(func.sum(CreditTransaction.amount)).filter(
        CreditTransaction.user_id == user_id
    ).scalar()
    return total if total else 0

def grant_initial_credits(db: Session, user_id: int, amount: int = 2):
    # Check if a signup bonus already exists (idempotent)
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
    create_notification(
        db,
        user_id=user_id,
        title="Signup Bonus",
        message=f"Welcome to SkillSwap! You received {amount} free skill credits to get started.",
        notification_type="CREDIT",
        commit=False
    )
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

    cost = 1

    # Lock learner user row when running on Postgres to prevent concurrent overspending
    user_query = db.query(User).filter(User.id == session.learner_id)
    if db.bind and db.bind.dialect.name == "postgresql":
        user_query = user_query.with_for_update()
    user_query.first()

    # Check learner balance
    learner_balance = get_user_balance(db, session.learner_id)
    if learner_balance < cost:
        raise HTTPException(status_code=400, detail="Learner does not have enough credits to complete this session")

    teacher_name = session.teacher.name if session.teacher else "your teacher"
    learner_name = session.learner.name if session.learner else "your student"

    # Create transaction for learner (spend)
    learner_tx = CreditTransaction(
        user_id=session.learner_id,
        amount=-cost,
        transaction_type=TransactionType.SESSION_SPENT,
        description=f"Spent on session with {teacher_name}",
        reference_id=session.id
    )

    # Create transaction for teacher (earn)
    teacher_tx = CreditTransaction(
        user_id=session.teacher_id,
        amount=cost,
        transaction_type=TransactionType.SESSION_EARNED,
        description=f"Earned from teaching {learner_name}",
        reference_id=session.id
    )

    db.add(learner_tx)
    db.add(teacher_tx)

    # Emit credit notifications
    create_notification(
        db,
        user_id=session.teacher_id,
        title="Credit Earned",
        message=f"You earned {cost} credit for teaching {learner_name}.",
        notification_type="CREDIT",
        commit=False
    )
    create_notification(
        db,
        user_id=session.learner_id,
        title="Credit Spent",
        message=f"{cost} credit was deducted for your session with {teacher_name}.",
        notification_type="CREDIT",
        commit=False
    )

