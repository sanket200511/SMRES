import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from ..database import get_db
from ..models import MaintenanceRequest, TicketActivity, User, Technician, utc_now
from ..schemas import (
    TicketCreate,
    TicketResponse,
    TicketStatusUpdate,
    TicketAssignTech,
    TicketPriorityOverride,
    TicketEscalateRequest,
    PriorityScoreBreakdown,
    DuplicateCheckResult,
    TicketActivityResponse,
)
from ..services.priority_engine import calculate_priority_score, map_affected_people_to_score
from ..services.duplicate_detector import detect_duplicate
from ..services.sla_service import calculate_sla_deadline, evaluate_ticket_sla_status
from ..services.technician_service import recommend_best_technician, assign_technician_to_ticket

router = APIRouter()

def resolve_caller_identity(
    db: Session,
    authorization: Optional[str] = None,
    x_demo_user_id: Optional[str] = None,
    x_user_id: Optional[str] = None,
    x_user_role: Optional[str] = None,
    x_user_name: Optional[str] = None,
    require_auth: bool = False,
):
    """
    Resolves the authenticated user identity and role from:
    1. Authorization: Bearer <JWT>
    2. X-Demo-User-ID / x-user-id with DB verification
    3. Test role headers for automated testing
    Raises 401 if require_auth is True and no valid credentials are provided.
    """
    # 1. Check JWT token if provided
    if isinstance(authorization, str) and authorization.strip():
        if not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=401,
                detail="Invalid authorization format. Bearer token required.",
            )
        token = authorization.split("Bearer ", 1)[1].strip()
        from ..auth import decode_access_token
        payload = decode_access_token(token)
        if not payload or "sub" not in payload:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired token.",
            )
        jwt_user = db.query(User).filter(User.id == payload["sub"]).first()
        if not jwt_user:
            raise HTTPException(
                status_code=401,
                detail="Authenticated user account not found or deactivated.",
            )
        return jwt_user.id, jwt_user.role, jwt_user.name

    # 2. Check X-Demo-User-ID or x-user-id
    valid_demo_id = x_demo_user_id if isinstance(x_demo_user_id, str) and x_demo_user_id.strip() else None
    valid_user_id = x_user_id if isinstance(x_user_id, str) and x_user_id.strip() else None
    valid_role = x_user_role if isinstance(x_user_role, str) and x_user_role.strip() else None
    valid_name = x_user_name if isinstance(x_user_name, str) and x_user_name.strip() else None

    uid = valid_demo_id or valid_user_id
    if uid:
        user = db.query(User).filter(User.id == uid).first()
        if user:
            return user.id, user.role, user.name
        if valid_role:
            return uid, valid_role, valid_name or "Test User"

    if valid_role:
        return valid_user_id or "test-user", valid_role, valid_name or "Test User"

    if require_auth:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please provide a valid Bearer token.",
        )

    return None, "public", "Anonymous User"


def format_ticket_response(ticket: MaintenanceRequest) -> TicketResponse:
    is_overdue, mins_left = evaluate_ticket_sla_status(ticket)
    # Pydantic TicketResponse mapping
    resp = TicketResponse.model_validate(ticket)
    resp.is_overdue = is_overdue
    resp.time_remaining_minutes = mins_left
    return resp

@router.post("/preview-priority", response_model=PriorityScoreBreakdown)
def preview_priority(data: TicketCreate):
    """Calculates live priority score and explanation before submission."""
    people_score = (
        map_affected_people_to_score(data.affected_people_count)
        if data.affected_people_count is not None
        else data.affected_people_score
    )
    return calculate_priority_score(
        safety_score=data.safety_score,
        operational_impact_score=data.operational_impact_score,
        affected_people_score=people_score,
        time_sensitivity_score=data.time_sensitivity_score,
        text_content=f"{data.title} {data.description}",
    )

@router.post("/check-duplicate", response_model=DuplicateCheckResult)
def check_ticket_duplicate(data: TicketCreate, db: Session = Depends(get_db)):
    """Detects whether a similar unresolved issue is already logged in the system."""
    unresolved = db.query(MaintenanceRequest).filter(
        MaintenanceRequest.status.notin_(["Resolved", "Cancelled"])
    ).all()

    return detect_duplicate(
        new_title=data.title,
        new_description=data.description,
        new_category=data.category,
        new_location=data.location,
        new_building=data.building,
        new_equipment_id=data.equipment_id,
        existing_unresolved_tickets=unresolved,
    )

@router.post("", response_model=TicketResponse, status_code=201)
def create_ticket(
    data: TicketCreate,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
    x_user_role: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
    x_user_name: Optional[str] = Header(default=None),
    x_demo_user_id: Optional[str] = Header(default=None),
):
    """
    Submits a new maintenance request with automated priority scoring,
    duplicate incident detection, SLA deadline calculation, and technician recommendation.
    """
    caller_id, caller_role, caller_name = resolve_caller_identity(
        db, authorization, x_demo_user_id, x_user_id, x_user_role, x_user_name, require_auth=True
    )
    now = utc_now()
    # Generate sequential unique ticket ID
    existing_ids = db.query(MaintenanceRequest.id).all()
    max_num = 1000
    for (tid,) in existing_ids:
        if tid and tid.startswith("REQ-"):
            try:
                num = int(tid.split("-")[1])
                if num > max_num:
                    max_num = num
            except Exception:
                pass
    ticket_id = f"REQ-{max_num + 1}"

    # 1. Smart Priority Calculation with affected people count mapping
    people_score = (
        map_affected_people_to_score(data.affected_people_count)
        if data.affected_people_count is not None
        else data.affected_people_score
    )
    combined_text = f"{data.title} {data.description}"
    priority_res = calculate_priority_score(
        safety_score=data.safety_score,
        operational_impact_score=data.operational_impact_score,
        affected_people_score=people_score,
        time_sensitivity_score=data.time_sensitivity_score,
        text_content=combined_text,
    )

    # 2. Duplicate Detection
    unresolved = db.query(MaintenanceRequest).filter(
        MaintenanceRequest.status.notin_(["Resolved", "Cancelled"])
    ).all()
    dup_res = detect_duplicate(
        new_title=data.title,
        new_description=data.description,
        new_category=data.category,
        new_location=data.location,
        new_building=data.building,
        new_equipment_id=data.equipment_id,
        existing_unresolved_tickets=unresolved,
    )

    # 3. SLA Calculation
    effective_p = priority_res.recommended_priority
    sla_h, deadline = calculate_sla_deadline(now, effective_p)

    # 4. Technician Recommendation
    tech_rec = recommend_best_technician(db, data.category)

    # Create ticket record
    ticket = MaintenanceRequest(
        id=ticket_id,
        title=data.title,
        description=data.description,
        category=data.category,
        location=data.location,
        building=data.building,
        floor=data.floor,
        room=data.room,
        equipment_id=data.equipment_id,
        submitted_by_id=caller_id or data.submitted_by_id,
        submitted_by_name=caller_name or data.submitted_by_name,
        status="Pending",

        # Priority
        safety_score=data.safety_score,
        operational_impact_score=data.operational_impact_score,
        affected_people_score=people_score,
        time_sensitivity_score=data.time_sensitivity_score,
        priority_score=priority_res.total_score,
        recommended_priority=priority_res.recommended_priority,
        priority_explanation=priority_res.explanation,
        is_safety_emergency=priority_res.is_safety_emergency,
        emergency_trigger_keyword=priority_res.emergency_trigger,
        effective_priority=effective_p,

        # Duplicate
        is_potential_duplicate=dup_res.is_potential_duplicate,
        duplicate_of_id=dup_res.duplicate_of_id,
        duplicate_confidence=dup_res.confidence,
        duplicate_reason=dup_res.reason,

        # SLA
        sla_hours=sla_h,
        sla_deadline=deadline,

        # Recommended Tech
        recommended_technician_id=tech_rec.technician_id if tech_rec else None,
        assignment_recommendation_reason=tech_rec.reason if tech_rec else None,

        created_at=now,
        updated_at=now,
    )

    # Activity log
    activity_msg = f"Ticket created. Priority evaluated as {priority_res.recommended_priority} ({priority_res.total_score}/100)."
    if priority_res.is_safety_emergency:
        activity_msg += f" ⚠️ Triggered safety emergency warning: {priority_res.emergency_trigger}."
    if dup_res.is_potential_duplicate:
        activity_msg += f" Potential duplicate of {dup_res.duplicate_of_id} ({int(dup_res.confidence*100)}% match)."

    activity = TicketActivity(
        ticket_id=ticket_id,
        action="CREATED",
        actor_id=caller_id or data.submitted_by_id,
        actor_name=caller_name or data.submitted_by_name,
        actor_role=caller_role,
        notes=activity_msg,
        created_at=now,
    )

    try:
        db.add(ticket)
        db.add(activity)
        db.commit()
        db.refresh(ticket)
        return format_ticket_response(ticket)
    except Exception:
        db.rollback()
        raise

@router.get("", response_model=List[TicketResponse])
def list_tickets(
    category: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    is_escalated: Optional[bool] = None,
    building: Optional[str] = None,
    search: Optional[str] = None,
    submitted_by: Optional[str] = None,
    authorization: Optional[str] = Header(default=None),
    x_user_role: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
    x_demo_user_id: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    """
    List tickets with search, filtering, and role-based views.
    Employee view is restricted to their own submitted tickets unless viewing as admin.
    """
    caller_id, caller_role, _ = resolve_caller_identity(
        db, authorization, x_demo_user_id, x_user_id, x_user_role, None, require_auth=False
    )
    query = db.query(MaintenanceRequest)

    # Role enforcement: if employee role, show only their requests
    if caller_role.lower() == "employee":
        query = query.filter(MaintenanceRequest.submitted_by_id == caller_id)
    elif submitted_by:
        query = query.filter(MaintenanceRequest.submitted_by_id == submitted_by)

    if category:
        query = query.filter(MaintenanceRequest.category == category)
    if status:
        query = query.filter(MaintenanceRequest.status == status)
    if priority:
        query = query.filter(MaintenanceRequest.effective_priority == priority)
    if is_escalated is not None:
        query = query.filter(MaintenanceRequest.is_escalated == is_escalated)
    if building:
        query = query.filter(MaintenanceRequest.building == building)
    if search:
        search_filter = or_(
            MaintenanceRequest.id.ilike(f"%{search}%"),
            MaintenanceRequest.title.ilike(f"%{search}%"),
            MaintenanceRequest.description.ilike(f"%{search}%"),
            MaintenanceRequest.location.ilike(f"%{search}%"),
            MaintenanceRequest.equipment_id.ilike(f"%{search}%"),
        )
        query = query.filter(search_filter)

    # Sort: Critical and Escalated tickets first, then newest
    tickets = query.order_by(desc(MaintenanceRequest.created_at)).all()
    return [format_ticket_response(t) for t in tickets]

@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket_details(ticket_id: str, db: Session = Depends(get_db)):
    ticket = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Maintenance ticket not found.")
    return format_ticket_response(ticket)

@router.patch("/{ticket_id}/status", response_model=TicketResponse)
def update_ticket_status(
    ticket_id: str,
    payload: TicketStatusUpdate,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
    x_user_role: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
    x_user_name: Optional[str] = Header(default=None),
    x_demo_user_id: Optional[str] = Header(default=None),
):
    """Update ticket lifecycle status (Pending -> In Progress -> Resolved)."""
    caller_id, caller_role, caller_name = resolve_caller_identity(
        db, authorization, x_demo_user_id, x_user_id, x_user_role, x_user_name, require_auth=True
    )
    ticket = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Maintenance ticket not found.")

    valid_statuses = ["Pending", "In Progress", "Resolved", "Cancelled"]
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Choose from {valid_statuses}")

    # Role check: only admins/facility managers or technicians can resolve or set in progress
    if caller_role.lower() == "employee" and payload.status in ["In Progress", "Resolved"]:
        raise HTTPException(status_code=403, detail="Employee role is not authorized to transition status to In Progress or Resolved.")

    old_status = ticket.status
    now = utc_now()
    ticket.status = payload.status
    ticket.updated_at = now

    if payload.status == "In Progress" and not ticket.acknowledged_at:
        ticket.acknowledged_at = now

    if payload.status == "Resolved":
        ticket.resolved_at = now
        ticket.resolution_notes = payload.resolution_notes or payload.notes or "Resolved by facility maintenance team."
        # Decrement assigned technician active ticket count if any
        if ticket.assigned_technician_id:
            tech = db.query(Technician).filter(Technician.id == ticket.assigned_technician_id).first()
            if tech and tech.active_tickets_count > 0:
                tech.active_tickets_count -= 1

    activity = TicketActivity(
        ticket_id=ticket.id,
        action=f"STATUS_CHANGED_{payload.status.upper()}",
        actor_id=caller_id,
        actor_name=caller_name,
        actor_role=caller_role,
        notes=f"Status transitioned from '{old_status}' to '{payload.status}'. Notes: {payload.resolution_notes or payload.notes or 'None'}",
        created_at=now,
    )
    db.add(activity)
    db.commit()
    db.refresh(ticket)
    return format_ticket_response(ticket)

@router.post("/{ticket_id}/assign", response_model=TicketResponse)
def assign_technician(
    ticket_id: str,
    payload: TicketAssignTech,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
    x_user_role: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
    x_user_name: Optional[str] = Header(default=None),
    x_demo_user_id: Optional[str] = Header(default=None),
):
    """Assigns technician to ticket with workload management."""
    caller_id, caller_role, caller_name = resolve_caller_identity(
        db, authorization, x_demo_user_id, x_user_id, x_user_role, x_user_name, require_auth=True
    )
    if caller_role.lower() not in ["admin", "facility_manager"]:
        raise HTTPException(status_code=403, detail="Only administrators or facility managers can assign technicians.")

    ticket = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found.")

    try:
        updated = assign_technician_to_ticket(
            db=db,
            ticket=ticket,
            technician_id=payload.technician_id,
            actor_id=caller_id,
            actor_name=caller_name,
            actor_role=caller_role,
        )
        return format_ticket_response(updated)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{ticket_id}/override-priority", response_model=TicketResponse)
def override_ticket_priority(
    ticket_id: str,
    payload: TicketPriorityOverride,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
    x_user_role: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
    x_user_name: Optional[str] = Header(default=None),
    x_demo_user_id: Optional[str] = Header(default=None),
):
    """Admin overrides priority recommendation with justification."""
    caller_id, caller_role, caller_name = resolve_caller_identity(
        db, authorization, x_demo_user_id, x_user_id, x_user_role, x_user_name, require_auth=True
    )
    if caller_role.lower() not in ["admin", "facility_manager"]:
        raise HTTPException(status_code=403, detail="Only administrators or facility managers can override priority scores.")

    ticket = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found.")

    valid_priorities = ["Critical", "High", "Medium", "Low"]
    if payload.priority not in valid_priorities:
        raise HTTPException(status_code=400, detail=f"Priority must be one of {valid_priorities}")

    now = utc_now()
    prev_effective = ticket.effective_priority
    ticket.priority_override = payload.priority
    ticket.priority_override_reason = payload.reason
    ticket.priority_override_by = caller_name
    ticket.effective_priority = payload.priority
    ticket.updated_at = now

    # Recalculate SLA deadline based on newly overridden priority
    new_sla_h, new_deadline = calculate_sla_deadline(ticket.created_at, payload.priority)
    ticket.sla_hours = new_sla_h
    ticket.sla_deadline = new_deadline

    activity = TicketActivity(
        ticket_id=ticket.id,
        action="PRIORITY_OVERRIDDEN",
        actor_id=caller_id,
        actor_name=caller_name,
        actor_role=caller_role,
        notes=f"Priority manually overridden from '{prev_effective}' to '{payload.priority}'. Reason: {payload.reason}",
        created_at=now,
    )
    db.add(activity)
    db.commit()
    db.refresh(ticket)
    return format_ticket_response(ticket)

@router.post("/{ticket_id}/escalate", response_model=TicketResponse)
def escalate_ticket(
    ticket_id: str,
    payload: TicketEscalateRequest,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
    x_user_role: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
    x_user_name: Optional[str] = Header(default=None),
    x_demo_user_id: Optional[str] = Header(default=None),
):
    """Triggers manual escalation for unresolved ticket."""
    caller_id, caller_role, caller_name = resolve_caller_identity(
        db, authorization, x_demo_user_id, x_user_id, x_user_role, x_user_name, require_auth=True
    )
    if caller_role.lower() == "employee":
        raise HTTPException(status_code=403, detail="Employees cannot manually escalate tickets.")

    ticket = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found.")

    if ticket.status in ["Resolved", "Cancelled"]:
        raise HTTPException(status_code=400, detail="Cannot escalate a resolved or cancelled ticket.")

    now = utc_now()
    ticket.is_escalated = True
    ticket.escalation_level = max(ticket.escalation_level, payload.level)
    ticket.escalation_type = "manual"
    ticket.escalation_reason = payload.reason
    ticket.escalated_at = now
    ticket.updated_at = now

    activity = TicketActivity(
        ticket_id=ticket.id,
        action="ESCALATED_MANUAL",
        actor_id=caller_id,
        actor_name=caller_name,
        actor_role=caller_role,
        notes=f"Manual escalation (Level {payload.level}) triggered by {caller_name}. Reason: {payload.reason}",
        created_at=now,
    )
    db.add(activity)
    db.commit()
    db.refresh(ticket)
    return format_ticket_response(ticket)

@router.post("/{ticket_id}/link-duplicate/{target_ticket_id}", response_model=TicketResponse)
def link_ticket_as_duplicate(
    ticket_id: str,
    target_ticket_id: str,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
    x_user_role: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
    x_user_name: Optional[str] = Header(default=None),
    x_demo_user_id: Optional[str] = Header(default=None),
):
    """Links ticket to an existing master incident."""
    caller_id, caller_role, caller_name = resolve_caller_identity(
        db, authorization, x_demo_user_id, x_user_id, x_user_role, x_user_name, require_auth=True
    )
    if caller_role.lower() not in ["admin", "facility_manager"]:
        raise HTTPException(status_code=403, detail="Only administrators or facility managers can link tickets.")

    ticket = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == ticket_id).first()
    target = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == target_ticket_id).first()
    if not ticket or not target:
        raise HTTPException(status_code=404, detail="One of the tickets was not found.")

    now = utc_now()
    ticket.is_potential_duplicate = True
    ticket.duplicate_of_id = target.id
    ticket.duplicate_reason = f"Explicitly linked to incident {target.id} by {caller_name}."
    ticket.updated_at = now

    activity = TicketActivity(
        ticket_id=ticket.id,
        action="LINKED_DUPLICATE",
        actor_id=caller_id,
        actor_name=caller_name,
        actor_role=caller_role,
        notes=f"Linked as duplicate/related ticket to master ticket {target.id} ('{target.title}').",
        created_at=now,
    )
    db.add(activity)
    db.commit()
    db.refresh(ticket)
    return format_ticket_response(ticket)

@router.get("/{ticket_id}/history", response_model=List[TicketActivityResponse])
def get_ticket_history(ticket_id: str, db: Session = Depends(get_db)):
    """Retrieves full chronological activity history for a request."""
    ticket = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Maintenance ticket not found.")
    return [TicketActivityResponse.model_validate(act) for act in ticket.activities]

@router.patch("/{ticket_id}/assign", response_model=TicketResponse)
def assign_technician_patch(
    ticket_id: str,
    payload: TicketAssignTech,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
    x_user_role: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
    x_user_name: Optional[str] = Header(default=None),
    x_demo_user_id: Optional[str] = Header(default=None),
):
    """PATCH endpoint for assigning a technician."""
    caller_id, caller_role, caller_name = resolve_caller_identity(
        db, authorization, x_demo_user_id, x_user_id, x_user_role, x_user_name, require_auth=True
    )
    if caller_role.lower() not in ["admin", "facility_manager"]:
        raise HTTPException(status_code=403, detail="Only administrators or facility managers can assign technicians.")

    ticket = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found.")

    try:
        updated = assign_technician_to_ticket(
            db=db,
            ticket=ticket,
            technician_id=payload.technician_id,
            actor_id=caller_id,
            actor_name=caller_name,
            actor_role=caller_role,
        )
        return format_ticket_response(updated)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
