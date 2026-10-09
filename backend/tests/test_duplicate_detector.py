import pytest
from backend.app.models import MaintenanceRequest
from backend.app.services.duplicate_detector import detect_duplicate

def test_detect_duplicate_match():
    active_ticket = MaintenanceRequest(
        id="REQ-100",
        title="Ceiling Water Pipe Leaking in 3rd Floor Restroom",
        description="Persistent water leak dripping from ceiling tiles onto restroom floor.",
        category="Plumbing",
        location="Building A, Floor 3, Restrooms",
        building="Building A",
        equipment_id="PIPE-3A",
        status="In Progress",
    )

    result = detect_duplicate(
        new_title="Water dripping from ceiling in floor 3 restroom",
        new_description="There is a ceiling pipe leak creating puddles in the 3rd floor restroom.",
        new_category="Plumbing",
        new_location="Building A, Floor 3, Restrooms",
        new_building="Building A",
        new_equipment_id="PIPE-3A",
        existing_unresolved_tickets=[active_ticket],
    )

    assert result.is_potential_duplicate is True
    assert result.duplicate_of_id == "REQ-100"
    assert result.confidence >= 0.7
    assert "matching category" in result.reason

def test_no_duplicate_for_different_issues():
    active_ticket = MaintenanceRequest(
        id="REQ-100",
        title="Ceiling Water Pipe Leaking in 3rd Floor Restroom",
        description="Persistent water leak dripping from ceiling tiles onto restroom floor.",
        category="Plumbing",
        location="Building A, Floor 3, Restrooms",
        building="Building A",
        status="In Progress",
    )

    result = detect_duplicate(
        new_title="Elevator door button jammed",
        new_description="Button for floor 7 does not illuminate when pressed.",
        new_category="Electrical",
        new_location="Building C, Elevator Bank 2",
        new_building="Building C",
        new_equipment_id=None,
        existing_unresolved_tickets=[active_ticket],
    )

    assert result.is_potential_duplicate is False
    assert result.duplicate_of_id is None
