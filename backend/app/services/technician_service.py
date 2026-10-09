from typing import List, Optional
from sqlalchemy.orm import Session
from ..models import Technician, MaintenanceRequest, TicketActivity, utc_now
from ..schemas import TechnicianRecommendation

CATEGORY_SKILL_MAP = {
    "Electrical": ["Electrical", "Power Systems", "Lighting"],
    "Plumbing": ["Plumbing", "Sanitation", "Pipes", "Water Systems"],
    "HVAC": ["HVAC", "Air Conditioning", "Ventilation", "Heating"],
    "Structural": ["Structural", "Carpentry", "Masonry", "Roofing"],
    "Fire & Safety": ["Fire & Safety", "Fire Suppression", "Life Safety", "Alarms"],
    "General": ["General", "Facility Maintenance", "Handyman", "Janitorial"],
}

def recommend_best_technician(
    db: Session,
    category: str
) -> Optional[TechnicianRecommendation]:
    """
    Find best matching technician based on skills match, availability, and active workload.
    """
    technicians: List[Technician] = db.query(Technician).filter(Technician.is_available == True).all()
    if not technicians:
        return None

    target_skills = CATEGORY_SKILL_MAP.get(category, [category, "General"])
    target_skills_lower = [s.lower() for s in target_skills]

    scored_techs = []
    for tech in technicians:
        tech_skills_list = [s.strip().lower() for s in tech.skills.split(",") if s.strip()]
        
        # Skill match score
        skill_matches = [s for s in target_skills_lower if any(ts in s or s in ts for ts in tech_skills_list)]
        has_direct_skill = len(skill_matches) > 0
        
        # Workload penalty
        workload = tech.active_tickets_count or 0
        
        # Score calculation: direct skill match (+50 pts), workload deduction (-10 pts per active ticket)
        score = 0
        if has_direct_skill:
            score += 60
        elif any("general" in ts for ts in tech_skills_list):
            score += 25
        else:
            score += 10
            
        score -= (workload * 8)
        
        # Reason explanation
        reason_parts = []
        if has_direct_skill:
            reason_parts.append(f"Certified in {', '.join(skill_matches).title()}")
        else:
            reason_parts.append("Cross-functional technician")
            
        reason_parts.append(f"Current workload: {workload} active ticket(s)")
        reason = " • ".join(reason_parts)

        scored_techs.append({
            "tech": tech,
            "score": score,
            "workload": workload,
            "reason": reason
        })

    # Sort descending by score, ascending by workload
    scored_techs.sort(key=lambda x: (x["score"], -x["workload"]), reverse=True)
    best = scored_techs[0]
    best_tech = best["tech"]

    return TechnicianRecommendation(
        technician_id=best_tech.id,
        technician_name=best_tech.name,
        skills=best_tech.skills,
        active_workload=best["workload"],
        match_score=max(0, best["score"]),
        reason=f"Recommended for {category}: {best['reason']}"
    )

def assign_technician_to_ticket(
    db: Session,
    ticket: MaintenanceRequest,
    technician_id: str,
    actor_id: str,
    actor_name: str,
    actor_role: str,
) -> MaintenanceRequest:
    """Assigns technician and updates workload counts."""
    tech = db.query(Technician).filter(Technician.id == technician_id).first()
    if not tech:
        raise ValueError(f"Technician {technician_id} not found.")

    # Decrement old technician count if different
    if ticket.assigned_technician_id and ticket.assigned_technician_id != technician_id:
        old_tech = db.query(Technician).filter(Technician.id == ticket.assigned_technician_id).first()
        if old_tech and old_tech.active_tickets_count > 0:
            old_tech.active_tickets_count -= 1

    # Update ticket
    now = utc_now()
    ticket.assigned_technician_id = tech.id
    ticket.assigned_technician_name = tech.name
    ticket.assigned_at = now
    
    # Auto-transition status to In Progress if currently Pending
    if ticket.status == "Pending":
        ticket.status = "In Progress"
        if not ticket.acknowledged_at:
            ticket.acknowledged_at = now

    # Increment new technician count
    tech.active_tickets_count = (tech.active_tickets_count or 0) + 1

    activity = TicketActivity(
        ticket_id=ticket.id,
        action="ASSIGNED_TECHNICIAN",
        actor_id=actor_id,
        actor_name=actor_name,
        actor_role=actor_role,
        notes=f"Assigned to {tech.name} ({tech.skills}). Status set to '{ticket.status}'.",
        created_at=now,
    )
    db.add(activity)
    db.commit()
    db.refresh(ticket)
    return ticket
