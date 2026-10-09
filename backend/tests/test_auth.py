import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_register_new_user_success():
    payload = {
        "email": "alex.morgan@company.com",
        "password": "securepassword123",
        "name": "Alex Morgan",
        "role": "employee",
        "department": "Facilities Engineering",
    }
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "alex.morgan@company.com"
    assert data["user"]["name"] == "Alex Morgan"
    assert data["user"]["role"] == "employee"

def test_register_duplicate_email_fails():
    payload = {
        "email": "alex.morgan@company.com",
        "password": "anotherpassword",
    }
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 400
    assert "already exists" in res.json()["detail"]

def test_login_success_with_registered_user():
    login_payload = {
        "email": "alex.morgan@company.com",
        "password": "securepassword123",
    }
    res = client.post("/api/auth/login", json=login_payload)
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "alex.morgan@company.com"

def test_login_invalid_password_fails():
    login_payload = {
        "email": "alex.morgan@company.com",
        "password": "wrongpassword999",
    }
    res = client.post("/api/auth/login", json=login_payload)
    assert res.status_code == 401
    assert "Invalid email or password" in res.json()["detail"]

def test_get_current_user_profile_with_jwt():
    # Login first
    login_res = client.post("/api/auth/login", json={
        "email": "alex.morgan@company.com",
        "password": "securepassword123",
    })
    token = login_res.json()["access_token"]

    # Call /api/auth/me with Bearer token
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    user_data = me_res.json()
    assert user_data["email"] == "alex.morgan@company.com"
    assert user_data["name"] == "Alex Morgan"
