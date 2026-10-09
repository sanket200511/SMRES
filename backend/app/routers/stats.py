from datetime import timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import MaintenanceRequest, utc_now
from ..schemas import DashboardStatsResponse
from ..services.sla_service import check_and_escalate_overdue_tickets, evaluate_ticket_sla_status

router = APIRouter(prefix="/api/stats", tags=["Dashboard Statistics"])

@router.get("", response_model=DashboardStatsResponse)
def get_dashboard_stats(db: Session = Depends(get_db)):
    tickets = db.query(MaintenanceRequest).all()

    total = len(tickets)
    pending = 0
    in_progress = 0
    resolved = 0
    critical = 0
    escalated = 0
    overdue = 0
    emergencies = 0

    cat_counts = {}
    pri_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}

    resolution_durations = []

    for t in tickets:
        # Status counts
        if t.status == "Pending":
            pending += 1
        elif t.status == "In Progress":
            in_progress += 1
        elif t.status == "Resolved":
            resolved += 1
            if t.resolved_at and t.created_at:
                res_time = t.resolved_at
                cr_time = t.created_at
                if res_time.tzinfo is None:
                    res_time = res_time.replace(tzinfo=timezone.utc)
                if cr_time.tzinfo is None:
                    cr_time = cr_time.replace(tzinfo=timezone.utc)
                hours = (res_time - cr_time).total_seconds() / 3600.0
                resolution_durations.append(hours)

        # Priority & Escalation
        eff_pri = t.effective_priority or t.recommended_priority or "Low"
        if eff_pri in pri_counts:
            pri_counts[eff_pri] += 1
        else:
            pri_counts[eff_pri] = 1

        if eff_pri == "Critical":
            critical += 1

        if t.is_escalated:
            escalated += 1

        if t.is_safety_emergency:
            emergencies += 1

        # Overdue check
        is_od, _ = evaluate_ticket_sla_status(t)
        if is_od:
            overdue += 1

        # Category breakdown
        cat = t.category or "Other"
        cat_counts[cat] = cat_counts.get(cat, 0) + 1

    avg_res_hours = (
        round(sum(resolution_durations) / len(resolution_durations), 1)
        if resolution_durations
        else 0.0
    )

    return DashboardStatsResponse(
        total_tickets=total,
        pending_count=pending,
        in_progress_count=in_progress,
        resolved_count=resolved,
        critical_count=critical,
        escalated_count=escalated,
        overdue_count=overdue,
        emergency_alerts_count=emergencies,
        avg_resolution_time_hours=avg_res_hours,
        category_breakdown=cat_counts,
        priority_breakdown=pri_counts,
    )

@router.post("/sla-check-now")
def run_sla_check_now(db: Session = Depends(get_db)):
    """Triggers immediate SLA monitor check and escalates overdue tickets."""
    escalated = check_and_escalate_overdue_tickets(db)
    return {
        "status": "success",
        "newly_escalated_count": len(escalated),
        "escalated_ticket_ids": [t.id for t in escalated],
    }
