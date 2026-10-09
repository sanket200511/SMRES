from datetime import datetime, timezone, timedelta
from typing import List, Tuple, Optional
from sqlalchemy.orm import Session
from ..config import get_configured_sla_hours
from ..models import MaintenanceRequest, TicketActivity, utc_now

def get_sla_hours_for_priority(priority: str) -> float:
    return get_configured_sla_hours(priority)

def calculate_sla_deadline(created_at: datetime, priority: str) -> Tuple[float, datetime]:
    hours = get_sla_hours_for_priority(priority)
    # Ensure created_at has timezone
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    deadline = created_at + timedelta(hours=hours)
    return hours, deadline

def evaluate_ticket_sla_status(ticket: MaintenanceRequest) -> Tuple[bool, Optional[int]]:
    """
    Returns (is_overdue, minutes_remaining).
    If resolved/cancelled, is_overdue is False.
    """
    if ticket.status in ("Resolved", "Cancelled"):
        return False, None

    if not ticket.sla_deadline:
        return False, None

    now = utc_now()
    deadline = ticket.sla_deadline
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)

    diff = (deadline - now).total_seconds()
    minutes_left = int(diff // 60)
    is_overdue = diff < 0
    return is_overdue, minutes_left

def check_and_escalate_overdue_tickets(db: Session) -> List[MaintenanceRequest]:
    """
    Idempotent periodic check for overdue unresolved requests.
    Automatically escalates requests that have passed SLA deadline and are not yet escalated at max level.
    """
    now = utc_now()
    # Find active unresolved tickets
    active_tickets = db.query(MaintenanceRequest).filter(
        MaintenanceRequest.status.notin_(["Resolved", "Cancelled"])
    ).all()

    escalated_list = []
    for ticket in active_tickets:
        if not ticket.sla_deadline:
            continue

        deadline = ticket.sla_deadline
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)

        # Check if overdue
        if now >= deadline:
            # If not yet escalated at all, escalate to Level 1
            if not ticket.is_escalated:
                ticket.is_escalated = True
                ticket.escalation_level = 1
                ticket.escalation_type = "automatic"
                ticket.escalated_at = now
                ticket.escalation_reason = (
                    f"Automated SLA Breach: Request exceeded {ticket.sla_hours:.1f}h SLA window "
                    f"(Target deadline was {deadline.strftime('%Y-%m-%d %H:%M UTC')}). "
                    f"Escalated to Facility Management Lead."
                )

                activity = TicketActivity(
                    ticket_id=ticket.id,
                    action="ESCALATED_AUTOMATIC",
                    actor_id="system-sla",
                    actor_name="Automated SLA Monitor",
                    actor_role="system",
                    notes=ticket.escalation_reason,
                    created_at=now,
                )
                db.add(activity)
                escalated_list.append(ticket)
            # If already escalated to Level 1 for more than 4 hours, escalate to Level 2 (Director)
            elif ticket.escalation_level == 1 and ticket.escalated_at:
                esc_at = ticket.escalated_at
                if esc_at.tzinfo is None:
                    esc_at = esc_at.replace(tzinfo=timezone.utc)
                if (now - esc_at).total_seconds() >= 4 * 3600:
                    ticket.escalation_level = 2
                    ticket.escalation_reason += " Further escalated to Operations Director due to prolonged inactivity."
                    activity = TicketActivity(
                        ticket_id=ticket.id,
                        action="ESCALATED_LEVEL_2",
                        actor_id="system-sla",
                        actor_name="Automated SLA Monitor",
                        actor_role="system",
                        notes="Secondary escalation triggered: Ticket remains unresolved 4 hours post-initial escalation.",
                        created_at=now,
                    )
                    db.add(activity)
                    escalated_list.append(ticket)

    if escalated_list:
        db.commit()

    return escalated_list

def manual_escalate_ticket(
    db: Session,
    ticket: MaintenanceRequest,
    reason: str,
    level: int,
    actor_id: str,
    actor_name: str,
    actor_role: str,
) -> MaintenanceRequest:
    """Manually escalate an open ticket."""
    now = utc_now()
    ticket.is_escalated = True
    ticket.escalation_level = max(ticket.escalation_level, level)
    ticket.escalation_type = "manual"
    ticket.escalated_at = now
    ticket.escalation_reason = reason

    activity = TicketActivity(
        ticket_id=ticket.id,
        action="ESCALATED_MANUAL",
        actor_id=actor_id,
        actor_name=actor_name,
        actor_role=actor_role,
        notes=f"Manual escalation (Level {level}) by {actor_name}: {reason}",
        created_at=now,
    )
    db.add(activity)
    db.commit()
    db.refresh(ticket)
    return ticket
