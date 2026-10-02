import pytest
from app.services.credit_service import get_user_balance

def test_register_user(client, db):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "New User",
            "email": "new@example.com",
            "password": "newpassword123"
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "new@example.com"
    assert data["name"] == "New User"
    assert "password" not in data
    assert "password_hash" not in data
    
    # Verify initial credits
    balance = get_user_balance(db, data["id"])
    assert balance == 2

def test_register_existing_user(client, test_user):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Another User",
            "email": test_user.email,
            "password": "password123"
        },
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]

def test_login_user(client, test_user):
    response = client.post(
        "/api/v1/auth/login",
        data={
            "username": test_user.email,
            "password": "testpassword"
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_invalid_password(client, test_user):
    response = client.post(
        "/api/v1/auth/login",
        data={
            "username": test_user.email,
            "password": "wrongpassword"
        },
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Incorrect email or password"
