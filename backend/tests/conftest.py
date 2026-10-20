import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import get_db
from app.core.security import get_password_hash, create_access_token
from app.models import Base, User
from app.models.skill import Skill
from app.models.match import Match, MatchStatus
from app.models.session import Session as DbSession, SessionStatus
from app.models.rating import Rating

# Use in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session")
def db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="module")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
            
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    del app.dependency_overrides[get_db]

@pytest.fixture
def test_user(db):
    user = User(
        name="Test User",
        email="test@example.com",
        password_hash=get_password_hash("testpassword"),
        bio="I am a test user."
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    yield user
    # Clean up dependent records before user deletion if any
    db.rollback()
    db.query(User).filter(User.id == user.id).delete()
    db.commit()

@pytest.fixture
def test_user2(db):
    user2 = User(
        name="Test User 2",
        email="test2@example.com",
        password_hash=get_password_hash("testpassword2"),
        bio="I am test user 2."
    )
    db.add(user2)
    db.commit()
    db.refresh(user2)
    yield user2
    db.rollback()
    db.query(User).filter(User.id == user2.id).delete()
    db.commit()

@pytest.fixture
def normal_user_token_headers(test_user):
    token = create_access_token(subject=test_user.id)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def test_session(db, test_user, test_user2):
    skill = Skill(name="Test Skill Rating", category="Testing", description="Skill for rating test")
    db.add(skill)
    db.commit()
    db.refresh(skill)

    match = Match(user1_id=test_user.id, user2_id=test_user2.id, status=MatchStatus.ACCEPTED, match_score=85.0)
    db.add(match)
    db.commit()
    db.refresh(match)

    session = DbSession(
        match_id=match.id,
        teacher_id=test_user.id,
        learner_id=test_user2.id,
        skill_id=skill.id,
        duration_minutes=60,
        status=SessionStatus.SCHEDULED
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    yield session

    db.rollback()
    db.query(Rating).filter(Rating.session_id == session.id).delete()
    db.query(DbSession).filter(DbSession.id == session.id).delete()
    db.query(Match).filter(Match.id == match.id).delete()
    db.query(Skill).filter(Skill.id == skill.id).delete()
    db.commit()

