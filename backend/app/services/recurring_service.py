from typing import List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models import MaintenanceRequest
from ..schemas import RecurringIssuePattern

def detect_recurring_issues(db: Session, min_occurrences: int = 2) -> List[RecurringIssuePattern]:
    """
    Groups requests by building, category, and equipment_id to spot repeated failure patterns.
    """
    tickets: List[MaintenanceRequest] = db.query(MaintenanceRequest).all()

    # Grouping key: (building, category, equipment_id or 'GENERAL_ZONE')
    groups: Dict[tuple, List[MaintenanceRequest]] = {}
    for t in tickets:
        equip = t.equipment_id.strip() if t.equipment_id else None
        key = (t.building, t.category, equip)
        if key not in groups:
            groups[key] = []
        groups[key].append(t)

    patterns = []
    for (bldg, cat, equip), group_tickets in groups.items():
        if len(group_tickets) >= min_occurrences:
            # Sort newest first
            group_tickets.sort(key=lambda x: x.created_at, reverse=True)
            last_date = group_tickets[0].created_at
            count = len(group_tickets)

            # Determine risk level
            if count >= 4:
                risk_level = "High"
                preventive = (
                    f"CRITICAL ASSET ALERT: {count} reported failures in {bldg} ({cat}). "
                    f"Immediate comprehensive engineering overhaul or replacement of {equip or 'system'} is recommended."
                )
            elif count == 3:
                risk_level = "Moderate"
                preventive = (
                    f"Persistent failure cluster: 3 incidents recorded. "
                    f"Schedule proactive preventive maintenance inspection within 48 hours."
                )
            else:
                risk_level = "Low"
                preventive = f"Early recurring trend detected ({count} occurrences). Monitor subsystem performance."

            patterns.append(RecurringIssuePattern(
                category=cat,
                building=bldg,
                equipment_id=equip,
                incident_count=count,
                ticket_ids=[t.id for t in group_tickets],
                ticket_titles=[t.title for t in group_tickets],
                last_reported_at=last_date,
                risk_level=risk_level,
                preventive_recommendation=preventive,
            ))

    # Sort by incident count descending
    patterns.sort(key=lambda p: p.incident_count, reverse=True)
    return patterns
