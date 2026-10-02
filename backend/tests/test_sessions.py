import pytest
from app.models.session import SessionStatus
from app.models.credit import CreditTransaction, TransactionType
from app.models.match import Match, MatchStatus
from app.models.user import User
from app.core.security import get_password_hash
from app.models.skill import Skill

import uuid
@pytest.fixture
def test_users_and_skill(db):
    uid = str(uuid.uuid4())[:8]
    teacher = User(name=f"Teacher {uid}", email=f"teacher_{uid}@ex.com", password_hash=get_password_hash("pass"))
    learner = User(name=f"Learner {uid}", email=f"learner_{uid}@ex.com", password_hash=get_password_hash("pass"))
    db.add_all([teacher, learner])
    db.commit()
    db.refresh(teacher)
    db.refresh(learner)
    
    # Give learner some credits to start with via admin bonus
    bonus = CreditTransaction(
        user_id=learner.id, amount=5, transaction_type=TransactionType.ADMIN_BONUS
    )
    db.add(bonus)

    skill = Skill(name=f"Python {uid}", category="PROGRAMMING")
    db.add(skill)
    db.commit()
    
    match = Match(user1_id=teacher.id, user2_id=learner.id, status=MatchStatus.ACCEPTED, match_score=90.0)
    db.add(match)
    db.commit()
    
    return teacher, learner, skill, match

def test_create_and_transition_session(client, db, test_users_and_skill):
    teacher, learner, skill, match = test_users_and_skill
    
    # Login as learner
    response = client.post("/api/v1/auth/login", data={"username": learner.email, "password": "pass"})
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Create session (REQUESTED)
    res = client.post("/api/v1/sessions/", headers=headers, json={
        "match_id": match.id,
        "teacher_id": teacher.id,
        "learner_id": learner.id,
        "skill_id": skill.id,
        "duration_minutes": 60
    })
    assert res.status_code == 201
    session_id = res.json()["id"]
    assert res.json()["status"] == SessionStatus.REQUESTED
    
    # Login as teacher to accept
    t_res = client.post("/api/v1/auth/login", data={"username": teacher.email, "password": "pass"})
    t_headers = {"Authorization": f"Bearer {t_res.json()['access_token']}"}
    
    # 2. Accept session
    res = client.patch(f"/api/v1/sessions/{session_id}/accept", headers=t_headers)
    assert res.status_code == 200
    assert res.json()["status"] == SessionStatus.ACCEPTED
    
    # 3. Schedule session
    res = client.patch(f"/api/v1/sessions/{session_id}/schedule", headers=headers, json={})
    assert res.status_code == 200
    assert res.json()["status"] == SessionStatus.SCHEDULED
    
    # 4. Complete session (Triggers credit transfer)
    res = client.patch(f"/api/v1/sessions/{session_id}/complete", headers=t_headers)
    assert res.status_code == 200
    assert res.json()["status"] == SessionStatus.COMPLETED
    
    # 5. Verify balances
    from app.services.credit_service import get_user_balance
    t_balance = get_user_balance(db, teacher.id)
    l_balance = get_user_balance(db, learner.id)
    
    assert t_balance == 1 # earned 1
    assert l_balance == 4 # started with 5, spent 1
    
    # 6. Try to cancel completed session
    res = client.patch(f"/api/v1/sessions/{session_id}/cancel", headers=headers)
    assert res.status_code == 400
    assert "cannot be cancelled" in res.json()["detail"]

def test_session_insufficient_credits(client, db, test_users_and_skill):
    teacher, learner, skill, match = test_users_and_skill
    
    # Deplete learner's credits
    db.query(CreditTransaction).filter(CreditTransaction.user_id == learner.id).delete()
    db.commit()
    
    # Login as teacher
    t_res = client.post("/api/v1/auth/login", data={"username": teacher.email, "password": "pass"})
    t_headers = {"Authorization": f"Bearer {t_res.json()['access_token']}"}
    
    # Create and bypass to SCHEDULED for testing directly in DB
    from app.models.session import Session as DbSession
    sess = DbSession(
        match_id=match.id, teacher_id=teacher.id, learner_id=learner.id, 
        skill_id=skill.id, status=SessionStatus.SCHEDULED
    )
    db.add(sess)
    db.commit()
    
    res = client.patch(f"/api/v1/sessions/{sess.id}/complete", headers=t_headers)
    assert res.status_code == 400
    assert "not have enough credits" in res.json()["detail"]
