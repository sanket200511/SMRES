import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import SessionLocal
from backend.app.models import MaintenanceRequest, User, Technician

client = TestClient(app)

def test_full_phase8_end_to_end_workflow():
    """
    Executes the exact end-to-end workflow mandated by Phase 8:
    1. Health check
    2. Employee login with JWT
    3. Employee submits maintenance request (persists to PostgreSQL)
    4. Fetch request and confirm persistence
    5. Test priority calculation and safety override
    6. Test duplicate detection
    7. Admin login with JWT
    8. Admin assigns technician (persists to PostgreSQL)
    9. Verify dashboard statistics
    10. Exercise SLA escalation
    11. Resolve request and confirm escalation stops
    12. Verify 401 unauthorized on protected endpoint without token
    13. Verify 403 forbidden when employee calls admin endpoint
    14. Direct PostgreSQL record verification
    """
    # 1. Health check
    health_res = client.get("/api/health")
    assert health_res.status_code == 200
    assert health_res.json()["status"] == "healthy"
    assert health_res.json()["database"] == "connected"

    # 2. Employee login
    emp_login = client.post("/api/auth/login", json={
        "email": "sarah.jenkins@company.com",
        "password": "password123",
    })
    assert emp_login.status_code == 200
    emp_data = emp_login.json()
    assert "access_token" in emp_data
    assert emp_data["user"]["role"] == "employee"
    emp_token = emp_data["access_token"]
    emp_headers = {"Authorization": f"Bearer {emp_token}"}

    # Verify /api/auth/me for employee
    me_res = client.get("/api/auth/me", headers=emp_headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "sarah.jenkins@company.com"

    # 3. Employee creates maintenance request
    ticket_payload = {
        "title": "Flooding from burst pipe in lab washroom",
        "description": "Continuous water flowing from pipe fitting under the sink, causing localized flooding.",
        "category": "Plumbing",
        "location": "Building A, Floor 2, Lab 204",
        "building": "Building A",
        "floor": "Floor 2",
        "room": "Lab 204",
        "equipment_id": "PIPE-LAB-204",
        "safety_score": 3,
        "operational_impact_score": 4,
        "affected_people_score": 3,
        "time_sensitivity_score": 4,
        "submitted_by_id": emp_data["user"]["id"],
        "submitted_by_name": emp_data["user"]["name"],
    }
    create_res = client.post("/api/tickets", json=ticket_payload, headers=emp_headers)
    assert create_res.status_code == 201
    created_ticket = create_res.json()
    new_ticket_id = created_ticket["id"]
    assert new_ticket_id.startswith("REQ-")
    assert created_ticket["title"] == ticket_payload["title"]
    assert created_ticket["status"] == "Pending"

    # 4. Fetch request and verify persistence
    get_res = client.get(f"/api/tickets/{new_ticket_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == new_ticket_id
    assert get_res.json()["location"] == ticket_payload["location"]

    # 5. Verify priority calculation and safety override
    emergency_payload = {
        "title": "Severe chemical spill and toxic vapor in store room",
        "description": "Corrosive chemical spill on floor with strong toxic fuming vapor.",
        "category": "Fire & Safety",
        "location": "Building B, Ground Floor, HazMat Storage",
        "building": "Building B",
        "floor": "Ground",
        "room": "HazMat-01",
        "safety_score": 5,
        "operational_impact_score": 3,
        "affected_people_score": 2,
        "time_sensitivity_score": 5,
    }
    emg_res = client.post("/api/tickets", json=emergency_payload, headers=emp_headers)
    assert emg_res.status_code == 201
    emg_ticket = emg_res.json()
    assert emg_ticket["effective_priority"] == "Critical"
    assert emg_ticket["is_safety_emergency"] is True
    assert "chemical spill" in emg_ticket["emergency_trigger_keyword"]

    # 6. Verify duplicate detection
    dup_res = client.post("/api/tickets/check-duplicate", json={
        "title": "Water leaking from pipe under sink in lab 204",
        "description": "Floor is wet from leaking pipe in lab washroom.",
        "category": "Plumbing",
        "location": "Building A, Floor 2, Lab 204",
        "building": "Building A",
        "equipment_id": "PIPE-LAB-204",
        "safety_score": 2,
        "operational_impact_score": 2,
        "affected_people_score": 2,
        "time_sensitivity_score": 2,
    })
    assert dup_res.status_code == 200
    dup_data = dup_res.json()
    assert dup_data["is_potential_duplicate"] is True
    assert dup_data["duplicate_of_id"] == new_ticket_id
    assert dup_data["confidence"] > 0.5

    # 7. Admin login
    admin_login = client.post("/api/auth/login", json={
        "email": "marcus.vance@company.com",
        "password": "password123",
    })
    assert admin_login.status_code == 200
    admin_data = admin_login.json()
    assert admin_data["user"]["role"] == "admin"
    admin_token = admin_data["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 8. Admin assigns technician
    assign_res = client.post(
        f"/api/tickets/{new_ticket_id}/assign",
        json={"technician_id": "tech-3"}, # Liam O'Connor (Plumbing)
        headers=admin_headers
    )
    assert assign_res.status_code == 200
    assigned_ticket = assign_res.json()
    assert assigned_ticket["assigned_technician_id"] == "tech-3"
    assert assigned_ticket["assigned_technician_name"] == "Liam O'Connor"
    assert assigned_ticket["status"] == "In Progress"

    # 9. Verify dashboard statistics against PostgreSQL
    stats_res = client.get("/api/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_tickets"] >= 2
    assert stats["in_progress_count"] >= 1
    assert stats["critical_count"] >= 1

    # 10. Exercise SLA escalation monitor
    sla_res = client.post("/api/stats/sla-check-now")
    assert sla_res.status_code == 200
    assert "newly_escalated_count" in sla_res.json()

    # 11. Resolve request and confirm escalation stops
    resolve_res = client.patch(
        f"/api/tickets/{new_ticket_id}/status",
        json={"status": "Resolved", "resolution_notes": "Pipe fitting resealed and pressure tested."},
        headers=admin_headers
    )
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "Resolved"
    assert resolve_res.json()["is_overdue"] is False

    # 12. Attempt protected admin operation without token -> verify 401
    unauth_res = client.post(
        f"/api/tickets/{new_ticket_id}/override-priority",
        json={"priority": "High", "reason": "No auth"}
    )
    assert unauth_res.status_code == 401
    assert "Authentication required" in unauth_res.json()["detail"]

    # 13. Attempt admin operation with employee token -> verify 403
    forbidden_res = client.post(
        f"/api/tickets/{new_ticket_id}/override-priority",
        json={"priority": "High", "reason": "Employee token override"},
        headers=emp_headers
    )
    assert forbidden_res.status_code == 403
    assert "Only administrators" in forbidden_res.json()["detail"]

    # 14. Direct PostgreSQL record verification
    from backend.app.database import get_db
    db_gen = app.dependency_overrides.get(get_db)
    db = next(db_gen()) if db_gen else SessionLocal()
    try:
        db_ticket = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == new_ticket_id).first()
        assert db_ticket is not None
        assert db_ticket.status == "Resolved"
        assert db_ticket.assigned_technician_id == "tech-3"
        assert db_ticket.resolution_notes == "Pipe fitting resealed and pressure tested."
    finally:
        db.close()
