from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from .models import User, Technician, MaintenanceRequest, TicketActivity, utc_now
from .services.priority_engine import calculate_priority_score
from .services.sla_service import calculate_sla_deadline
from .auth import hash_password

def seed_database(db: Session):
    # Check if already seeded
    if db.query(User).count() > 0:
        return

    now = utc_now()

    # 1. Seed Users with securely hashed passwords
    default_hash = hash_password("password123")
    users = [
        User(id="emp-1", name="Sarah Jenkins", email="sarah.jenkins@company.com", role="employee", department="Research & Development", hashed_password=default_hash),
        User(id="emp-2", name="David Chen", email="david.chen@company.com", role="employee", department="Product Design", hashed_password=default_hash),
        User(id="admin-1", name="Marcus Vance", email="marcus.vance@company.com", role="admin", department="Facility Operations Lead", hashed_password=default_hash),
        User(id="admin-2", name="Elena Rostova", email="elena.rostova@company.com", role="admin", department="VP of Operations", hashed_password=default_hash),
    ]
    for u in users:
        db.add(u)

    # 2. Seed Technicians
    technicians = [
        Technician(id="tech-1", name="Carlos Mendez", email="carlos.m@facility.internal", phone="+1 (555) 234-5671", skills="HVAC,Air Conditioning,Ventilation", active_tickets_count=1, is_available=True),
        Technician(id="tech-2", name="Aisha Patel", email="aisha.p@facility.internal", phone="+1 (555) 234-5672", skills="Electrical,Power Systems,Lighting", active_tickets_count=0, is_available=True),
        Technician(id="tech-3", name="Liam O'Connor", email="liam.o@facility.internal", phone="+1 (555) 234-5673", skills="Plumbing,Sanitation,Pipes", active_tickets_count=1, is_available=True),
        Technician(id="tech-4", name="Robert Johnson", email="robert.j@facility.internal", phone="+1 (555) 234-5674", skills="Structural,Carpentry,Roofing", active_tickets_count=0, is_available=True),
        Technician(id="tech-5", name="Maya Lin", email="maya.l@facility.internal", phone="+1 (555) 234-5675", skills="Fire & Safety,Life Safety,Alarms", active_tickets_count=0, is_available=True),
    ]
    for t in technicians:
        db.add(t)

    db.commit()

    # 3. Seed Maintenance Requests
    # Ticket 1: Emergency gas leak
    p1 = calculate_priority_score(5, 5, 5, 5, "gas leak in kitchen")
    sla_h1, deadline1 = calculate_sla_deadline(now, p1.recommended_priority)
    t1 = MaintenanceRequest(
        id="REQ-1001",
        title="Suspected Natural Gas Odor in Cafeteria Kitchen",
        description="Kitchen staff report a strong pungent sulfur/gas leak smell near main prep range. Requires immediate safety inspection.",
        category="Fire & Safety",
        location="Building A, Ground Floor, Cafeteria Commercial Kitchen",
        building="Building A",
        floor="Ground",
        room="Kitchen-101",
        equipment_id="RANGE-GAS-01",
        submitted_by_id="emp-1",
        submitted_by_name="Sarah Jenkins",
        status="Pending",
        safety_score=5,
        operational_impact_score=5,
        affected_people_score=5,
        time_sensitivity_score=5,
        priority_score=p1.total_score,
        recommended_priority=p1.recommended_priority,
        priority_explanation=p1.explanation,
        is_safety_emergency=p1.is_safety_emergency,
        emergency_trigger_keyword=p1.emergency_trigger,
        effective_priority=p1.recommended_priority,
        sla_hours=sla_h1,
        sla_deadline=deadline1,
        recommended_technician_id="tech-5",
        assignment_recommendation_reason="Recommended for Fire & Safety: Certified in Fire & Safety • Current workload: 0 active ticket(s)",
        created_at=now - timedelta(minutes=15),
        updated_at=now - timedelta(minutes=15),
    )
    db.add(t1)
    db.add(TicketActivity(
        ticket_id="REQ-1001",
        action="CREATED",
        actor_id="emp-1",
        actor_name="Sarah Jenkins",
        actor_role="employee",
        notes="Ticket submitted with critical safety flags.",
        created_at=now - timedelta(minutes=15)
    ))

    # Ticket 2: High priority HVAC issue
    p2 = calculate_priority_score(2, 4, 3, 4, "server room AC unit failure")
    sla_h2, deadline2 = calculate_sla_deadline(now - timedelta(hours=2), p2.recommended_priority)
    t2 = MaintenanceRequest(
        id="REQ-1002",
        title="Main Data Center Server Room AC Chiller Failure",
        description="Air conditioning chiller HVAC-CHILLER-02 is throwing Error E88. Ambient server room temperature is climbing past 78°F.",
        category="HVAC",
        location="Building B, Floor 2, Server Room 204",
        building="Building B",
        floor="Floor 2",
        room="Room 204",
        equipment_id="HVAC-CHILLER-02",
        submitted_by_id="emp-2",
        submitted_by_name="David Chen",
        status="In Progress",
        safety_score=2,
        operational_impact_score=4,
        affected_people_score=3,
        time_sensitivity_score=4,
        priority_score=p2.total_score,
        recommended_priority=p2.recommended_priority,
        priority_explanation=p2.explanation,
        is_safety_emergency=p2.is_safety_emergency,
        effective_priority=p2.recommended_priority,
        sla_hours=sla_h2,
        sla_deadline=deadline2,
        assigned_technician_id="tech-1",
        assigned_technician_name="Carlos Mendez",
        assigned_at=now - timedelta(hours=1),
        acknowledged_at=now - timedelta(hours=1),
        recommended_technician_id="tech-1",
        assignment_recommendation_reason="Recommended for HVAC: Certified in HVAC, Air Conditioning • Current workload: 1 active ticket(s)",
        created_at=now - timedelta(hours=2),
        updated_at=now - timedelta(hours=1),
    )
    db.add(t2)
    db.add(TicketActivity(
        ticket_id="REQ-1002",
        action="CREATED",
        actor_id="emp-2",
        actor_name="David Chen",
        actor_role="employee",
        notes="Submitted request for IT server temperature control.",
        created_at=now - timedelta(hours=2)
    ))
    db.add(TicketActivity(
        ticket_id="REQ-1002",
        action="ASSIGNED_TECHNICIAN",
        actor_id="admin-1",
        actor_name="Marcus Vance",
        actor_role="admin",
        notes="Dispatched Carlos Mendez for immediate refrigerant check.",
        created_at=now - timedelta(hours=1)
    ))

    # Ticket 3: Overdue Ticket that has breached SLA and is auto-escalated
    created_t3 = now - timedelta(hours=30)
    p3 = calculate_priority_score(3, 3, 2, 2, "water pipe leak")
    # For Medium priority, SLA is 24 hours. Since created 30 hours ago, it's 6 hours overdue!
    t3 = MaintenanceRequest(
        id="REQ-1003",
        title="Ceiling Water Pipe Dripping in Corridor Restroom",
        description="Persistent slow pipe leak above ceiling tiles outside 3rd floor East Wing restrooms. Water bucket currently collecting drips.",
        category="Plumbing",
        location="Building A, Floor 3, East Wing Corridor Restroom",
        building="Building A",
        floor="Floor 3",
        room="Restroom-3E",
        equipment_id="PIPE-WATER-3E",
        submitted_by_id="emp-1",
        submitted_by_name="Sarah Jenkins",
        status="In Progress",
        safety_score=3,
        operational_impact_score=3,
        affected_people_score=2,
        time_sensitivity_score=2,
        priority_score=p3.total_score,
        recommended_priority="Medium",
        priority_explanation=p3.explanation,
        effective_priority="Medium",
        sla_hours=24.0,
        sla_deadline=created_t3 + timedelta(hours=24),
        is_escalated=True,
        escalation_level=1,
        escalation_type="automatic",
        escalation_reason="Automated SLA Breach: Request exceeded 24.0h SLA window. Escalated to Facility Management Lead.",
        escalated_at=created_t3 + timedelta(hours=24, minutes=5),
        assigned_technician_id="tech-3",
        assigned_technician_name="Liam O'Connor",
        assigned_at=created_t3 + timedelta(hours=2),
        acknowledged_at=created_t3 + timedelta(hours=2),
        created_at=created_t3,
        updated_at=created_t3 + timedelta(hours=24, minutes=5),
    )
    db.add(t3)
    db.add(TicketActivity(
        ticket_id="REQ-1003",
        action="ESCALATED_AUTOMATIC",
        actor_id="system-sla",
        actor_name="Automated SLA Monitor",
        actor_role="system",
        notes="Automated SLA Breach: Request exceeded 24.0h SLA window.",
        created_at=created_t3 + timedelta(hours=24, minutes=5)
    ))

    # Ticket 4: Medium priority Electrical
    p4 = calculate_priority_score(1, 2, 3, 2, "flickering lights in open space")
    sla_h4, deadline4 = calculate_sla_deadline(now - timedelta(hours=5), "Medium")
    t4 = MaintenanceRequest(
        id="REQ-1004",
        title="Flickering Overhead LED Fixtures in Workspace",
        description="Two fluorescent/LED hybrid panels in Zone 4 flicker intermittently causing eye strain for the engineering team.",
        category="Electrical",
        location="Building C, Floor 4, Suite 410",
        building="Building C",
        floor="Floor 4",
        room="Suite 410",
        equipment_id="LIGHT-PANEL-C4",
        submitted_by_id="emp-2",
        submitted_by_name="David Chen",
        status="Pending",
        safety_score=1,
        operational_impact_score=2,
        affected_people_score=3,
        time_sensitivity_score=2,
        priority_score=p4.total_score,
        recommended_priority="Medium",
        priority_explanation=p4.explanation,
        effective_priority="Medium",
        sla_hours=sla_h4,
        sla_deadline=deadline4,
        recommended_technician_id="tech-2",
        assignment_recommendation_reason="Recommended for Electrical: Certified in Electrical, Power Systems • Current workload: 0 active ticket(s)",
        created_at=now - timedelta(hours=5),
        updated_at=now - timedelta(hours=5),
    )
    db.add(t4)

    # Ticket 5: Historical Resolved HVAC ticket (matches REQ-1002 on HVAC-CHILLER-02)
    t5 = MaintenanceRequest(
        id="REQ-1005",
        title="Chiller Compressor Freezing and High Pressure Lockout",
        description="Chiller system froze during peak afternoon heat load. Required compressor reset.",
        category="HVAC",
        location="Building B, Floor 2, Server Room 204",
        building="Building B",
        floor="Floor 2",
        equipment_id="HVAC-CHILLER-02",
        submitted_by_id="emp-1",
        submitted_by_name="Sarah Jenkins",
        status="Resolved",
        safety_score=2,
        operational_impact_score=4,
        affected_people_score=2,
        time_sensitivity_score=3,
        priority_score=55,
        recommended_priority="High",
        effective_priority="High",
        sla_hours=4.0,
        sla_deadline=now - timedelta(days=12, hours=20),
        assigned_technician_id="tech-1",
        assigned_technician_name="Carlos Mendez",
        resolved_at=now - timedelta(days=12, hours=21),
        resolution_notes="Flushed evaporator coil and reset safety cutoff switches.",
        created_at=now - timedelta(days=13),
        updated_at=now - timedelta(days=12, hours=21),
    )
    db.add(t5)

    # Ticket 6: Another Historical Resolved HVAC ticket (creating strong recurring pattern for Building B / HVAC-CHILLER-02)
    t6 = MaintenanceRequest(
        id="REQ-1006",
        title="Auxiliary Fan Bearing Rattle on AC Unit 02",
        description="Loud grinding noise coming from the exterior condenser fan bearings on HVAC-CHILLER-02.",
        category="HVAC",
        location="Building B, Floor 2, Server Room 204",
        building="Building B",
        floor="Floor 2",
        equipment_id="HVAC-CHILLER-02",
        submitted_by_id="emp-2",
        submitted_by_name="David Chen",
        status="Resolved",
        safety_score=1,
        operational_impact_score=3,
        affected_people_score=2,
        time_sensitivity_score=2,
        priority_score=37,
        recommended_priority="Medium",
        effective_priority="Medium",
        sla_hours=24.0,
        sla_deadline=now - timedelta(days=24),
        assigned_technician_id="tech-1",
        assigned_technician_name="Carlos Mendez",
        resolved_at=now - timedelta(days=24, hours=2),
        resolution_notes="Lubricated condenser fan bearing and replaced worn drive belt.",
        created_at=now - timedelta(days=25),
        updated_at=now - timedelta(days=24, hours=2),
    )
    db.add(t6)

    # Ticket 7: Low priority structural ticket
    p7 = calculate_priority_score(0, 1, 1, 1, "loose door latch")
    sla_h7, deadline7 = calculate_sla_deadline(now - timedelta(hours=6), "Low")
    t7 = MaintenanceRequest(
        id="REQ-1007",
        title="Loose Door Handle on Stairwell B Fire Door",
        description="The latch mechanism on the fire exit stairwell door is slightly loose when pulled from the interior side.",
        category="Structural",
        location="Building A, Stairwell B, Floor 2",
        building="Building A",
        floor="Floor 2",
        room="Stairwell-B",
        submitted_by_id="emp-1",
        submitted_by_name="Sarah Jenkins",
        status="Pending",
        safety_score=0,
        operational_impact_score=1,
        affected_people_score=1,
        time_sensitivity_score=1,
        priority_score=p7.total_score,
        recommended_priority="Low",
        priority_explanation=p7.explanation,
        effective_priority="Low",
        sla_hours=sla_h7,
        sla_deadline=deadline7,
        recommended_technician_id="tech-4",
        assignment_recommendation_reason="Recommended for Structural: Certified in Structural, Carpentry • Current workload: 0 active ticket(s)",
        created_at=now - timedelta(hours=6),
        updated_at=now - timedelta(hours=6),
    )
    db.add(t7)

    db.commit()
