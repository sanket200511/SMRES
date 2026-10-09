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

def test_unauthenticated_protected_operation_returns_401():
    # Attempt override priority without token or auth
    res_override = client.post("/api/tickets/REQ-1001/override-priority", json={
        "priority": "Low",
        "reason": "Unauthorized attempt"
    })
    assert res_override.status_code == 401
    assert "Authentication required" in res_override.json()["detail"]

    # Attempt assign technician without token or auth
    res_assign = client.post("/api/tickets/REQ-1001/assign", json={
        "technician_id": "tech-1"
    })
    assert res_assign.status_code == 401

def test_employee_token_forbidden_on_admin_operation_returns_403():
    # Register/login employee
    login_res = client.post("/api/auth/login", json={
        "email": "alex.morgan@company.com",
        "password": "securepassword123",
    })
    emp_token = login_res.json()["access_token"]

    # Attempt admin-only override with employee Bearer token
    res_override = client.post(
        "/api/tickets/REQ-1001/override-priority",
        json={"priority": "Low", "reason": "Employee override attempt"},
        headers={"Authorization": f"Bearer {emp_token}"}
    )
    assert res_override.status_code == 403
    assert "Only administrators" in res_override.json()["detail"]

    # Attempt technician assignment with employee Bearer token
    res_assign = client.post(
        "/api/tickets/REQ-1001/assign",
        json={"technician_id": "tech-1"},
        headers={"Authorization": f"Bearer {emp_token}"}
    )
    assert res_assign.status_code == 403

def test_public_registration_cannot_grant_admin_role():
    # Attempt registering with role="admin"
    res = client.post("/api/auth/register", json={
        "email": "hacker.wannabe@evil.com",
        "password": "password12345",
        "name": "Wannabe Admin",
        "role": "admin",
    })
    assert res.status_code == 201
    data = res.json()
    # Must be forced to "employee"
    assert data["user"]["role"] == "employee"
