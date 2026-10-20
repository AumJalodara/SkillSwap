import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.skill import Skill, UserSkill, SkillType
from app.models.match import Match, MatchStatus
from app.models.session import Session as DbSession, SessionStatus
from app.models.credit import CreditTransaction, TransactionType
from app.models.notification import Notification
from app.core.security import get_password_hash, create_access_token
from app.services.credit_service import grant_initial_credits, get_user_balance
import uuid

def auth_headers(user_id: int):
    token = create_access_token(subject=user_id)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def setup_two_users_with_skills(db: Session):
    uid = str(uuid.uuid4())[:8]
    user_a = User(name=f"Alice {uid}", email=f"alice_{uid}@test.com", password_hash=get_password_hash("pass123"))
    user_b = User(name=f"Bob {uid}", email=f"bob_{uid}@test.com", password_hash=get_password_hash("pass123"))
    user_c = User(name=f"Charlie {uid}", email=f"charlie_{uid}@test.com", password_hash=get_password_hash("pass123"))
    db.add_all([user_a, user_b, user_c])
    db.commit()
    db.refresh(user_a)
    db.refresh(user_b)
    db.refresh(user_c)

    # Give credits
    db.add(CreditTransaction(user_id=user_a.id, amount=5, transaction_type=TransactionType.SIGNUP_BONUS))
    db.add(CreditTransaction(user_id=user_b.id, amount=5, transaction_type=TransactionType.SIGNUP_BONUS))
    db.commit()

    # Skills
    skill_py = Skill(name=f"Python_{uid}", category="Programming")
    skill_js = Skill(name=f"JS_{uid}", category="Programming")
    db.add_all([skill_py, skill_js])
    db.commit()
    db.refresh(skill_py)
    db.refresh(skill_js)

    # user_a teaches Python
    db.add(UserSkill(user_id=user_a.id, skill_id=skill_py.id, type=SkillType.TEACH, proficiency=5))
    # user_b teaches JS
    db.add(UserSkill(user_id=user_b.id, skill_id=skill_js.id, type=SkillType.TEACH, proficiency=4))
    db.commit()

    yield user_a, user_b, user_c, skill_py, skill_js

    db.rollback()
    db.query(Notification).filter(Notification.user_id.in_([user_a.id, user_b.id, user_c.id])).delete()
    db.query(CreditTransaction).filter(CreditTransaction.user_id.in_([user_a.id, user_b.id, user_c.id])).delete()
    db.query(DbSession).filter(DbSession.teacher_id.in_([user_a.id, user_b.id, user_c.id])).delete()
    db.query(Match).filter(Match.user1_id.in_([user_a.id, user_b.id, user_c.id])).delete()
    db.query(Match).filter(Match.user2_id.in_([user_a.id, user_b.id, user_c.id])).delete()
    db.query(UserSkill).filter(UserSkill.user_id.in_([user_a.id, user_b.id, user_c.id])).delete()
    db.query(Skill).filter(Skill.id.in_([skill_py.id, skill_js.id])).delete()
    db.query(User).filter(User.id.in_([user_a.id, user_b.id, user_c.id])).delete()
    db.commit()

# --- 1. Session Creation Integrity Tests ---

def test_session_creation_validations(client: TestClient, db: Session, setup_two_users_with_skills):
    user_a, user_b, user_c, skill_py, skill_js = setup_two_users_with_skills
    h_a = auth_headers(user_a.id)

    # Create an ACCEPTED match
    match = Match(user1_id=user_a.id, user2_id=user_b.id, status=MatchStatus.ACCEPTED, match_score=90.0)
    db.add(match)
    db.commit()
    db.refresh(match)

    # 1. Self-session should fail (400)
    res = client.post("/api/v1/sessions/", headers=h_a, json={
        "match_id": match.id,
        "teacher_id": user_a.id,
        "learner_id": user_a.id,
        "skill_id": skill_py.id
    })
    assert res.status_code == 400
    assert "cannot be the same" in res.json()["detail"]

    # 2. Non-participant creating session should fail (403)
    h_c = auth_headers(user_c.id)
    res = client.post("/api/v1/sessions/", headers=h_c, json={
        "match_id": match.id,
        "teacher_id": user_a.id,
        "learner_id": user_b.id,
        "skill_id": skill_py.id
    })
    assert res.status_code == 403

    # 3. Non-existent match should fail (404)
    res = client.post("/api/v1/sessions/", headers=h_a, json={
        "match_id": 999999,
        "teacher_id": user_a.id,
        "learner_id": user_b.id,
        "skill_id": skill_py.id
    })
    assert res.status_code == 404

    # 4. Teacher does not offer the skill should fail (400)
    # user_a does not offer skill_js
    res = client.post("/api/v1/sessions/", headers=h_a, json={
        "match_id": match.id,
        "teacher_id": user_a.id,
        "learner_id": user_b.id,
        "skill_id": skill_js.id
    })
    assert res.status_code == 400
    assert "does not offer this skill" in res.json()["detail"]

    # 5. Successful session creation
    res = client.post("/api/v1/sessions/", headers=h_a, json={
        "match_id": match.id,
        "teacher_id": user_a.id,
        "learner_id": user_b.id,
        "skill_id": skill_py.id,
        "duration_minutes": 60
    })
    assert res.status_code == 201
    assert res.json()["status"] == SessionStatus.REQUESTED

    # 6. Check that notification was emitted to learner (user_b)
    notif = db.query(Notification).filter(Notification.user_id == user_b.id, Notification.type == "SESSION").first()
    assert notif is not None
    assert "requested a learning session" in notif.message

# --- 2. Rating Security & Reviewee Validation Tests ---

def test_rating_security(client: TestClient, db: Session, setup_two_users_with_skills):
    user_a, user_b, user_c, skill_py, _ = setup_two_users_with_skills
    h_a = auth_headers(user_a.id)

    match = Match(user1_id=user_a.id, user2_id=user_b.id, status=MatchStatus.ACCEPTED)
    db.add(match)
    db.commit()

    session = DbSession(
        match_id=match.id,
        teacher_id=user_a.id,
        learner_id=user_b.id,
        skill_id=skill_py.id,
        status=SessionStatus.COMPLETED
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # 1. Self-rating attempt must fail (400)
    res = client.post("/api/v1/ratings/", headers=h_a, json={
        "session_id": session.id,
        "reviewee_id": user_a.id,
        "rating": 5
    })
    assert res.status_code == 400
    assert "Cannot rate yourself" in res.json()["detail"]

    # 2. Third-party reviewee attempt must fail (400)
    res = client.post("/api/v1/ratings/", headers=h_a, json={
        "session_id": session.id,
        "reviewee_id": user_c.id,
        "rating": 5
    })
    assert res.status_code == 400
    assert "other participant" in res.json()["detail"]

    # 3. Third-party reviewer must fail (403)
    h_c = auth_headers(user_c.id)
    res = client.post("/api/v1/ratings/", headers=h_c, json={
        "session_id": session.id,
        "reviewee_id": user_b.id,
        "rating": 5
    })
    assert res.status_code == 403

    # 4. Valid rating succeeds and emits notification
    res = client.post("/api/v1/ratings/", headers=h_a, json={
        "session_id": session.id,
        "reviewee_id": user_b.id,
        "rating": 5,
        "review": "Awesome student!"
    })
    assert res.status_code == 201
    
    # Check notification emitted to reviewee (user_b)
    notif = db.query(Notification).filter(Notification.user_id == user_b.id, Notification.type == "RATING").first()
    assert notif is not None
    assert "rated your session" in notif.message

# --- 3. Match Rejection Tests ---

def test_match_rejection(client: TestClient, db: Session, setup_two_users_with_skills):
    user_a, user_b, user_c, _, _ = setup_two_users_with_skills
    h_a = auth_headers(user_a.id)
    h_b = auth_headers(user_b.id)
    h_c = auth_headers(user_c.id)

    # User A requests match with User B
    res = client.post(f"/api/v1/matches/{user_b.id}/request", headers=h_a)
    assert res.status_code == 200
    match_id = res.json()["id"]

    # Unauthorized user C tries to reject
    res = client.patch(f"/api/v1/matches/{match_id}/reject", headers=h_c)
    assert res.status_code == 403

    # User B rejects match
    res = client.patch(f"/api/v1/matches/{match_id}/reject", headers=h_b)
    assert res.status_code == 200
    assert res.json()["status"] == MatchStatus.REJECTED

    # Notification sent to User A
    notif = db.query(Notification).filter(Notification.user_id == user_a.id, Notification.type == "MATCH").first()
    assert notif is not None
    assert "declined" in notif.message.lower()

    # Rejecting already rejected match should fail (400)
    res = client.patch(f"/api/v1/matches/{match_id}/reject", headers=h_b)
    assert res.status_code == 400

# --- 4. User Skill Deletion Tests ---

def test_user_skill_deletion(client: TestClient, db: Session, setup_two_users_with_skills):
    user_a, user_b, _, skill_py, _ = setup_two_users_with_skills
    h_a = auth_headers(user_a.id)
    h_b = auth_headers(user_b.id)

    user_skill = db.query(UserSkill).filter(UserSkill.user_id == user_a.id, UserSkill.skill_id == skill_py.id).first()
    assert user_skill is not None

    # User B cannot delete User A's skill (404 / unauthorized)
    res = client.delete(f"/api/v1/skills/me/{user_skill.id}", headers=h_b)
    assert res.status_code == 404

    # User A deletes their own skill
    res = client.delete(f"/api/v1/skills/me/{user_skill.id}", headers=h_a)
    assert res.status_code == 200

    # Verify deleted from DB
    remaining = db.query(UserSkill).filter(UserSkill.id == user_skill.id).first()
    assert remaining is None

    # Verify global skill still exists
    global_skill = db.query(Skill).filter(Skill.id == skill_py.id).first()
    assert global_skill is not None

# --- 5. User Profile Update Tests ---

def test_profile_update(client: TestClient, db: Session, setup_two_users_with_skills):
    user_a, _, _, _, _ = setup_two_users_with_skills
    h_a = auth_headers(user_a.id)

    # Update profile fields
    res = client.patch("/api/v1/users/me", headers=h_a, json={
        "name": "Alice Wonderland",
        "bio": "Updated bio here",
        "experience_level": "Intermediate",
        "availability": "Weekends"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Alice Wonderland"
    assert data["bio"] == "Updated bio here"
    assert data["experience_level"] == "Intermediate"
    assert data["availability"] == "Weekends"

    # Verify immutable fields (role, id, email) did not change
    assert data["id"] == user_a.id
    assert data["role"] == user_a.role

    # Empty name should fail
    res = client.patch("/api/v1/users/me", headers=h_a, json={"name": "   "})
    assert res.status_code == 400

    # Also test /api/v1/auth/me compatibility
    res = client.patch("/api/v1/auth/me", headers=h_a, json={"bio": "Second bio update"})
    assert res.status_code == 200
    assert res.json()["bio"] == "Second bio update"

# --- 6. Signup Bonus Idempotency & Candidate Deduplication ---

def test_signup_bonus_idempotent(db: Session):
    uid = str(uuid.uuid4())[:8]
    test_u = User(name="Bonus User", email=f"bonus_{uid}@test.com", password_hash="pass")
    db.add(test_u)
    db.commit()

    # Call grant_initial_credits twice
    grant_initial_credits(db, test_u.id, amount=2)
    grant_initial_credits(db, test_u.id, amount=2)

    balance = get_user_balance(db, test_u.id)
    assert balance == 2

    # Clean up
    db.query(Notification).filter(Notification.user_id == test_u.id).delete()
    db.query(CreditTransaction).filter(CreditTransaction.user_id == test_u.id).delete()
    db.query(User).filter(User.id == test_u.id).delete()
    db.commit()

def test_candidate_deduplication(client: TestClient, db: Session, setup_two_users_with_skills):
    user_a, user_b, _, _, _ = setup_two_users_with_skills
    h_a = auth_headers(user_a.id)

    # Before matching, get recommendations or candidates
    from app.matching.matcher import get_candidate_users
    candidates = get_candidate_users(db, user_a.id)
    candidate_ids = [c.id for c in candidates]
    assert user_b.id in candidate_ids

    # Request a match with user_b
    client.post(f"/api/v1/matches/{user_b.id}/request", headers=h_a)

    # Now user_b should be excluded from candidate recommendations
    candidates_after = get_candidate_users(db, user_a.id)
    candidate_ids_after = [c.id for c in candidates_after]
    assert user_b.id not in candidate_ids_after
