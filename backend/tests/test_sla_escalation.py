from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.database import Base
from backend.app.models import MaintenanceRequest, utc_now
from backend.app.services.sla_service import (
    calculate_sla_deadline,
    evaluate_ticket_sla_status,
    check_and_escalate_overdue_tickets,
)

def test_sla_deadlines():
    now = utc_now()
    h_crit, d_crit = calculate_sla_deadline(now, "Critical")
    assert h_crit > 0
    assert d_crit > now

    h_med, d_med = calculate_sla_deadline(now, "Medium")
    assert h_med > h_crit
    assert d_med > d_crit

def test_auto_escalation_lifecycle():
    # Setup in-memory sqlite db for testing
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    now = utc_now()
    overdue_time = now - timedelta(hours=5)

    # 1. Create an overdue ticket
    ticket = MaintenanceRequest(
        id="REQ-TEST-1",
        title="Overdue HVAC Failure",
        description="Air handling unit failure in server room.",
        category="HVAC",
        location="Building B",
        building="Building B",
        submitted_by_id="emp-1",
        submitted_by_name="Tester",
        status="Pending",
        sla_hours=4.0,
        sla_deadline=overdue_time,
        is_escalated=False,
        created_at=overdue_time - timedelta(hours=4),
        updated_at=overdue_time - timedelta(hours=4),
    )
    db.add(ticket)
    db.commit()

    # Verify evaluate_ticket_sla_status
    is_od, mins_left = evaluate_ticket_sla_status(ticket)
    assert is_od is True
    assert mins_left < 0

    # 2. Run automated escalation check
    escalated = check_and_escalate_overdue_tickets(db)
    assert len(escalated) == 1
    assert escalated[0].id == "REQ-TEST-1"
    assert escalated[0].is_escalated is True
    assert escalated[0].escalation_level == 1
    assert escalated[0].escalation_type == "automatic"

    # 3. Idempotent check: running again immediately does not double escalate
    escalated_again = check_and_escalate_overdue_tickets(db)
    assert len(escalated_again) == 0

    # 4. If ticket is resolved, it is no longer overdue
    ticket.status = "Resolved"
    db.commit()
    is_od_after, _ = evaluate_ticket_sla_status(ticket)
    assert is_od_after is False

    db.close()
