import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_list_seeded_tickets():
    response = client.get("/api/tickets", headers={"x-user-role": "admin"})
    assert response.status_code == 200
    tickets = response.json()
    assert len(tickets) >= 5

def test_create_ticket_with_emergency_flag():
    payload = {
        "title": "Severe gas leak reported in furnace room",
        "description": "Noticeable smell of gas leak near main burner. Workers evacuated room.",
        "category": "Fire & Safety",
        "location": "Building A, Basement",
        "building": "Building A",
        "floor": "Basement",
        "room": "B-02",
        "safety_score": 5,
        "operational_impact_score": 4,
        "affected_people_score": 4,
        "time_sensitivity_score": 5,
    }
    response = client.post(
        "/api/tickets",
        json=payload,
        headers={"x-user-role": "employee", "x-user-id": "emp-1", "x-user-name": "Sarah Jenkins"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["effective_priority"] == "Critical"
    assert data["is_safety_emergency"] is True
    assert "gas leak" in data["emergency_trigger_keyword"]

def test_role_permissions_employee_cannot_override_priority():
    payload = {
        "priority": "Low",
        "reason": "Not an issue anymore"
    }
    response = client.post(
        "/api/tickets/REQ-1001/override-priority",
        json=payload,
        headers={"x-user-role": "employee", "x-user-id": "emp-1"}
    )
    assert response.status_code == 403

def test_admin_can_override_priority_and_assign_tech():
    # 1. Override priority
    override_payload = {
        "priority": "High",
        "reason": "Temporary ventilation active, downgrading to High for controlled repair"
    }
    res_override = client.post(
        "/api/tickets/REQ-1001/override-priority",
        json=override_payload,
        headers={"x-user-role": "admin", "x-user-id": "admin-1", "x-user-name": "Marcus Vance"}
    )
    assert res_override.status_code == 200
    assert res_override.json()["effective_priority"] == "High"
    assert res_override.json()["priority_override"] == "High"

    # 2. Assign technician
    assign_payload = {"technician_id": "tech-5"}
    res_assign = client.post(
        "/api/tickets/REQ-1001/assign",
        json=assign_payload,
        headers={"x-user-role": "admin", "x-user-id": "admin-1", "x-user-name": "Marcus Vance"}
    )
    assert res_assign.status_code == 200
    assert res_assign.json()["assigned_technician_id"] == "tech-5"
    assert res_assign.json()["status"] == "In Progress"

def test_resolve_ticket_lifecycle():
    resolve_payload = {
        "status": "Resolved",
        "resolution_notes": "Main shutoff valve isolated and seal replaced. Sniffer test confirmed zero ppm leak."
    }
    res = client.patch(
        "/api/tickets/REQ-1001/status",
        json=resolve_payload,
        headers={"x-user-role": "admin", "x-user-id": "admin-1", "x-user-name": "Marcus Vance"}
    )
    assert res.status_code == 200
    assert res.json()["status"] == "Resolved"
    assert res.json()["resolution_notes"] is not None
    assert res.json()["resolved_at"] is not None

def test_recurring_issues_endpoint():
    res = client.get("/api/recurring?min_occurrences=2")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    # Building B HVAC should be detected as recurring
    hvac_pattern = next((p for p in data if p["category"] == "HVAC" and p["building"] == "Building B"), None)
    assert hvac_pattern is not None
    assert hvac_pattern["incident_count"] >= 2

def test_x_demo_user_id_header_resolution_and_restrictions():
    # Employee using X-Demo-User-ID should be blocked from status transition to Resolved
    res = client.patch(
        "/api/requests/REQ-1002/status",
        json={"status": "Resolved", "resolution_notes": "Employee attempting unauthorized resolution"},
        headers={"X-Demo-User-ID": "emp-1"}
    )
    assert res.status_code == 403
    assert "not authorized" in res.json()["detail"].lower()

def test_requests_alias_history_and_assign():
    # Test GET /api/requests/{id}/history
    res = client.get("/api/requests/REQ-1002/history")
    assert res.status_code == 200
    history = res.json()
    assert isinstance(history, list)
    assert len(history) >= 1
    assert any(h["action"] == "CREATED" for h in history)

    # Test PATCH /api/requests/{id}/assign with admin X-Demo-User-ID
    res_assign = client.patch(
        "/api/requests/REQ-1002/assign",
        json={"technician_id": "tech-3"},
        headers={"X-Demo-User-ID": "admin-1"}
    )
    assert res_assign.status_code == 200
    assert res_assign.json()["assigned_technician_id"] == "tech-3"

def test_dashboard_stats_endpoint():
    res = client.get("/api/dashboard/stats")
    assert res.status_code == 200
    data = res.json()
    assert "total_tickets" in data
    assert "critical_count" in data
    assert "pending_count" in data
    assert "in_progress_count" in data
    assert "resolved_count" in data
    assert data["total_tickets"] >= 6

