from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, Index
)
from sqlalchemy.orm import relationship
from .database import Base

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)
    role = Column(String(50), nullable=False, default="employee")  # "employee", "admin", "facility_manager"
    department = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)



class Technician(Base):
    __tablename__ = "technicians"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    phone = Column(String(50), nullable=True)
    skills = Column(String(255), nullable=False)  # Comma-separated: "Electrical,HVAC"
    active_tickets_count = Column(Integer, default=0)
    is_available = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)


class MaintenanceRequest(Base):
    __tablename__ = "maintenance_requests"

    id = Column(String(50), primary_key=True, index=True)
    title = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=False, index=True)  # Electrical, Plumbing, HVAC, Structural, Fire & Safety, General
    location = Column(String(200), nullable=False, index=True)
    building = Column(String(100), nullable=False, index=True)
    floor = Column(String(50), nullable=True)
    room = Column(String(50), nullable=True)
    equipment_id = Column(String(100), nullable=True, index=True)

    submitted_by_id = Column(String(50), nullable=False, index=True)
    submitted_by_name = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False, default="Pending", index=True)  # "Pending", "In Progress", "Resolved", "Cancelled"

    # Smart Priority Engine Fields
    safety_score = Column(Integer, default=1)
    operational_impact_score = Column(Integer, default=1)
    affected_people_score = Column(Integer, default=1)
    time_sensitivity_score = Column(Integer, default=1)
    priority_score = Column(Integer, default=0)
    recommended_priority = Column(String(20), default="Low")  # "Critical", "High", "Medium", "Low"
    priority_explanation = Column(Text, nullable=True)
    is_safety_emergency = Column(Boolean, default=False)
    emergency_trigger_keyword = Column(String(100), nullable=True)

    # Priority Override
    priority_override = Column(String(20), nullable=True)
    priority_override_reason = Column(Text, nullable=True)
    priority_override_by = Column(String(100), nullable=True)
    effective_priority = Column(String(20), nullable=False, default="Low", index=True)

    # Duplicate Incident Detection Fields
    is_potential_duplicate = Column(Boolean, default=False)
    duplicate_of_id = Column(String(50), nullable=True)
    duplicate_confidence = Column(Float, default=0.0)
    duplicate_reason = Column(Text, nullable=True)

    # SLA & Escalation
    sla_hours = Column(Float, default=24.0)
    sla_deadline = Column(DateTime(timezone=True), nullable=True, index=True)
    is_escalated = Column(Boolean, default=False, index=True)
    escalation_level = Column(Integer, default=0)  # 0: None, 1: Manager Escalation, 2: Director Escalation
    escalation_reason = Column(Text, nullable=True)
    escalation_type = Column(String(50), nullable=True)  # "automatic", "manual"
    escalated_at = Column(DateTime(timezone=True), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolution_notes = Column(Text, nullable=True)

    # Technician Assignment
    assigned_technician_id = Column(String(50), nullable=True, index=True)
    assigned_technician_name = Column(String(100), nullable=True)
    assigned_at = Column(DateTime(timezone=True), nullable=True)
    recommended_technician_id = Column(String(50), nullable=True)
    assignment_recommendation_reason = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=utc_now, index=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relations
    activities = relationship("TicketActivity", back_populates="ticket", cascade="all, delete-orphan", order_by="desc(TicketActivity.created_at)")


class TicketActivity(Base):
    __tablename__ = "ticket_activities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticket_id = Column(String(50), ForeignKey("maintenance_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(100), nullable=False)
    actor_id = Column(String(50), nullable=False)
    actor_name = Column(String(100), nullable=False)
    actor_role = Column(String(50), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    ticket = relationship("MaintenanceRequest", back_populates="activities")


# Compound Index for recurring checks and search
Index("idx_category_building_equipment", MaintenanceRequest.category, MaintenanceRequest.building, MaintenanceRequest.equipment_id)
