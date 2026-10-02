import pytest
from fastapi.testclient import TestClient
from app.models.rating import Rating
from app.models.session import SessionStatus
from sqlalchemy.orm import Session

def test_create_rating(client: TestClient, db: Session, normal_user_token_headers, test_session, test_user2):
    # Ensure session is completed
    test_session.status = SessionStatus.COMPLETED
    db.commit()

    response = client.post(
        "/api/v1/ratings/",
        headers=normal_user_token_headers,
        json={
            "session_id": test_session.id,
            "reviewee_id": test_user2.id,
            "rating": 5,
            "review": "Great session!"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["rating"] == 5
    assert data["review"] == "Great session!"
    assert data["reviewee_id"] == test_user2.id

def test_prevent_duplicate_ratings(client: TestClient, db: Session, normal_user_token_headers, test_session, test_user2):
    test_session.status = SessionStatus.COMPLETED
    db.commit()

    # First rating
    client.post(
        "/api/v1/ratings/",
        headers=normal_user_token_headers,
        json={
            "session_id": test_session.id,
            "reviewee_id": test_user2.id,
            "rating": 5,
            "review": "Great session!"
        }
    )

    # Second rating
    response = client.post(
        "/api/v1/ratings/",
        headers=normal_user_token_headers,
        json={
            "session_id": test_session.id,
            "reviewee_id": test_user2.id,
            "rating": 4,
            "review": "Wait, let me change this."
        }
    )
    assert response.status_code == 400
    assert "already rated" in response.json()["detail"]

def test_rating_validation(client: TestClient, db: Session, normal_user_token_headers, test_session, test_user2):
    test_session.status = SessionStatus.COMPLETED
    db.commit()

    # Out of range rating
    response = client.post(
        "/api/v1/ratings/",
        headers=normal_user_token_headers,
        json={
            "session_id": test_session.id,
            "reviewee_id": test_user2.id,
            "rating": 6,
            "review": "Too good!"
        }
    )
    assert response.status_code == 400

    # Negative rating
    response = client.post(
        "/api/v1/ratings/",
        headers=normal_user_token_headers,
        json={
            "session_id": test_session.id,
            "reviewee_id": test_user2.id,
            "rating": 0,
            "review": "Terrible!"
        }
    )
    assert response.status_code == 400

def test_cannot_rate_incomplete_session(client: TestClient, db: Session, normal_user_token_headers, test_session, test_user2):
    test_session.status = SessionStatus.SCHEDULED
    db.commit()

    response = client.post(
        "/api/v1/ratings/",
        headers=normal_user_token_headers,
        json={
            "session_id": test_session.id,
            "reviewee_id": test_user2.id,
            "rating": 5,
            "review": "Great session!"
        }
    )
    assert response.status_code == 400
    assert "COMPLETED" in response.json()["detail"]
