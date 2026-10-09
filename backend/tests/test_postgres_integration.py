import os
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.main import app
from backend.app.database import Base, get_db
from backend.app.seed_data import seed_database
from backend.app.models import MaintenanceRequest, TicketActivity, Technician, utc_now
from backend.app.services.sla_service import check_and_escalate_overdue_tickets

from .conftest import test_engine, TestingSessionLocal

client = TestClient(app)

def test_scenario_1_normal_request():
    """Scenario 1: Employee creates a normal maintenance request."""
    payload = {
        "title": "Thermostat in Conference Room B showing error",
        "description": "Temperature is stuck at 75F and control pad is unresponsive.",
        "category": "HVAC",
        "location": "Building A, Floor 2, Room 204",
        "building": "Building A",
        "floor": "Floor 2",
        "room": "Room 204",
        "safety_score": 1,
        "operational_impact_score": 2,
        "affected_people_score": 2,
        "time_sensitivity_score": 2,
    }
    response = client.post(
        "/api/tickets",
        json=payload,
        headers={"x-user-role": "employee", "x-user-id": "emp-1", "x-user-name": "Sarah Jenkins"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["id"].startswith("REQ-")
    assert data["status"] == "Pending"
    assert data["effective_priority"] in ["Medium", "Low"]
    assert data["sla_deadline"] is not None
    assert data["sla_hours"] > 0
    # Appears in request list
    list_res = client.get("/api/tickets", headers={"x-user-role": "admin"})
    assert list_res.status_code == 200
    ids = [t["id"] for t in list_res.json()]
    assert data["id"] in ids

def test_scenario_2_critical_safety_request():
    """Scenario 2: Critical safety request with life-safety emergency alert."""
    payload = {
        "title": "Suspected gas leak with strong odor near main kitchen line",
        "description": "Staff evacuated due to pungent sulfur gas leak smell.",
        "category": "Fire & Safety",
        "location": "Building A, Commercial Kitchen",
        "building": "Building A",
        "safety_score": 5,
        "operational_impact_score": 5,
        "affected_people_score": 5,
        "time_sensitivity_score": 5,
    }
    response = client.post(
        "/api/tickets",
        json=payload,
        headers={"x-user-role": "employee", "x-user-id": "emp-2", "x-user-name": "David Chen"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["effective_priority"] == "Critical"
    assert data["is_safety_emergency"] is True
    assert "gas leak" in data["emergency_trigger_keyword"]
    assert "EMERGENCY" in data["priority_explanation"]

def test_scenario_3_potential_duplicate():
    """Scenario 3: A similar unresolved issue triggers duplicate recommendation without discarding report."""
    # Check duplicate endpoint
    payload = {
        "title": "Gas smell in kitchen prep area",
        "description": "Noticeable smell of gas leak near cooking equipment.",
        "category": "Fire & Safety",
        "location": "Building A, Commercial Kitchen",
        "building": "Building A",
        "safety_score": 4,
        "operational_impact_score": 4,
        "affected_people_score": 4,
        "time_sensitivity_score": 4,
    }
    dup_res = client.post("/api/tickets/check-duplicate", json=payload)
    assert dup_res.status_code == 200
    dup_data = dup_res.json()
    assert dup_data["is_potential_duplicate"] is True
    assert dup_data["duplicate_of_id"] is not None
    assert dup_data["confidence"] > 0.5

    # Creation succeeds even when flagged as duplicate (never discarded)
    create_res = client.post(
        "/api/tickets",
        json=payload,
        headers={"x-user-role": "employee", "x-user-id": "emp-1", "x-user-name": "Sarah Jenkins"}
    )
    assert create_res.status_code == 201
    created_ticket = create_res.json()
    assert created_ticket["is_potential_duplicate"] is True

def test_scenario_4_technician_assignment():
    """Scenario 4: Administrator views recommendations and assigns technician with workload tracking and audit log."""
    # List unassigned ticket
    ticket_id = "REQ-1004"
    assign_payload = {"technician_id": "tech-2"}
    res = client.post(
        f"/api/tickets/{ticket_id}/assign",
        json=assign_payload,
        headers={"x-user-role": "admin", "x-user-id": "admin-1", "x-user-name": "Marcus Vance"}
    )
    assert res.status_code == 200
    ticket = res.json()
    assert ticket["assigned_technician_id"] == "tech-2"
    assert ticket["status"] == "In Progress"
    
    # Audit log check
    detail = client.get(f"/api/tickets/{ticket_id}").json()
    assign_act = next((a for a in detail["activities"] if "ASSIGNED" in a["action"]), None)
    assert assign_act is not None
    assert assign_act["actor_name"] == "Marcus Vance"

def test_scenario_5_sla_escalation():
    """Scenario 5: Open overdue request passes configured deadline, escalates idempotently, retains work status."""
    db = TestingSessionLocal()
    now = utc_now()
    # Create an artificially overdue ticket
    overdue_ticket = MaintenanceRequest(
        id="REQ-OVERDUE-01",
        title="Server Rack Cooling Failure",
        description="Coolant line leak on server rack A.",
        category="HVAC",
        location="Building B, Floor 2",
        building="Building B",
        submitted_by_id="emp-1",
        submitted_by_name="Sarah Jenkins",
        status="In Progress",
        effective_priority="Critical",
        sla_hours=1.0 / 60.0,
        sla_deadline=now - timedelta(minutes=15),
        is_escalated=False,
        created_at=now - timedelta(minutes=20),
        updated_at=now - timedelta(minutes=20),
    )
    db.add(overdue_ticket)
    db.commit()
    db.close()

    # Trigger SLA check
    sla_res = client.post("/api/stats/sla-check-now")
    assert sla_res.status_code == 200
    assert "REQ-OVERDUE-01" in sla_res.json()["escalated_ticket_ids"]

    # Verify status in database
    detail = client.get("/api/tickets/REQ-OVERDUE-01").json()
    assert detail["is_escalated"] is True
    assert detail["escalation_level"] == 1
    # Work status remains In Progress! (Escalation state is independent)
    assert detail["status"] == "In Progress"

    # Idempotent: repeated checks must not double-escalate immediately
    sla_res2 = client.post("/api/stats/sla-check-now")
    assert "REQ-OVERDUE-01" not in sla_res2.json()["escalated_ticket_ids"]

def test_scenario_6_resolution():
    """Scenario 6: Administrator resolves ticket; timestamps update and future SLA checks ignore it."""
    ticket_id = "REQ-OVERDUE-01"
    resolve_payload = {
        "status": "Resolved",
        "resolution_notes": "Coolant line patched and pressure tested successfully."
    }
    res = client.patch(
        f"/api/tickets/{ticket_id}/status",
        json=resolve_payload,
        headers={"x-user-role": "admin", "x-user-id": "admin-1", "x-user-name": "Marcus Vance"}
    )
    assert res.status_code == 200
    ticket = res.json()
    assert ticket["status"] == "Resolved"
    assert ticket["resolved_at"] is not None

    # Subsequent SLA checks do NOT escalate resolved tickets
    sla_res = client.post("/api/stats/sla-check-now")
    assert ticket_id not in sla_res.json()["escalated_ticket_ids"]

def test_scenario_7_authorization():
    """Scenario 7: Employee attempts unauthorized admin actions (status change, technician assignment, priority override)."""
    # Attempt status change as employee
    res_status = client.patch(
        "/api/tickets/REQ-1002/status",
        json={"status": "Resolved"},
        headers={"x-user-role": "employee", "x-user-id": "emp-1"}
    )
    assert res_status.status_code == 403

    # Attempt technician assignment as employee
    res_assign = client.post(
        "/api/tickets/REQ-1002/assign",
        json={"technician_id": "tech-1"},
        headers={"x-user-role": "employee", "x-user-id": "emp-1"}
    )
    assert res_assign.status_code == 403

    # Attempt priority override as employee
    res_override = client.post(
        "/api/tickets/REQ-1002/override-priority",
        json={"priority": "Low", "reason": "No longer urgent"},
        headers={"x-user-role": "employee", "x-user-id": "emp-1"}
    )
    assert res_override.status_code == 403
