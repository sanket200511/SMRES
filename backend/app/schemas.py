from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, Field, ConfigDict

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    email: str
    role: str
    department: Optional[str] = None


class TechnicianResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    skills: str
    active_tickets_count: int
    is_available: bool


class TicketActivityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    ticket_id: str
    action: str
    actor_id: str
    actor_name: str
    actor_role: str
    notes: Optional[str] = None
    created_at: datetime



class TicketCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=5)
    category: str = Field(..., description="Electrical, Plumbing, HVAC, Structural, Fire & Safety, General")
    location: str = Field(..., min_length=2, max_length=200)
    building: str = Field(..., min_length=1, max_length=100)
    floor: Optional[str] = None
    room: Optional[str] = None
    equipment_id: Optional[str] = None
    submitted_by_id: str = "emp-1"
    submitted_by_name: str = "Sarah Jenkins"

    # Evaluation factors (0 to 5)
    safety_score: int = Field(default=1, ge=0, le=5)
    operational_impact_score: int = Field(default=1, ge=0, le=5)
    affected_people_score: int = Field(default=1, ge=0, le=5)
    time_sensitivity_score: int = Field(default=1, ge=0, le=5)


class TicketStatusUpdate(BaseModel):
    status: str = Field(..., description="Pending, In Progress, Resolved, Cancelled")
    resolution_notes: Optional[str] = None
    notes: Optional[str] = None


class TicketAssignTech(BaseModel):
    technician_id: str


class TicketPriorityOverride(BaseModel):
    priority: str = Field(..., description="Critical, High, Medium, Low")
    reason: str = Field(..., min_length=3)


class TicketEscalateRequest(BaseModel):
    reason: str = Field(..., min_length=3)
    level: int = Field(default=1, ge=1, le=3)


class PriorityScoreBreakdown(BaseModel):
    safety_score: int
    operational_impact_score: int
    affected_people_score: int
    time_sensitivity_score: int
    total_score: int
    recommended_priority: str
    is_safety_emergency: bool
    emergency_trigger: Optional[str] = None
    explanation: str


class DuplicateCheckResult(BaseModel):
    is_potential_duplicate: bool
    duplicate_of_id: Optional[str] = None
    duplicate_of_title: Optional[str] = None
    confidence: float
    reason: Optional[str] = None


class TechnicianRecommendation(BaseModel):
    technician_id: str
    technician_name: str
    skills: str
    active_workload: int
    match_score: int
    reason: str


class TicketResponse(BaseModel):
    id: str
    title: str
    description: str
    category: str
    location: str
    building: str
    floor: Optional[str] = None
    room: Optional[str] = None
    equipment_id: Optional[str] = None
    submitted_by_id: str
    submitted_by_name: str
    status: str

    # Priority
    safety_score: int
    operational_impact_score: int
    affected_people_score: int
    time_sensitivity_score: int
    priority_score: int
    recommended_priority: str
    priority_explanation: Optional[str] = None
    is_safety_emergency: bool
    emergency_trigger_keyword: Optional[str] = None
    priority_override: Optional[str] = None
    priority_override_reason: Optional[str] = None
    priority_override_by: Optional[str] = None
    effective_priority: str

    # Duplicate
    is_potential_duplicate: bool
    duplicate_of_id: Optional[str] = None
    duplicate_confidence: float
    duplicate_reason: Optional[str] = None

    # SLA & Escalation
    sla_hours: float
    sla_deadline: Optional[datetime] = None
    is_escalated: bool
    escalation_level: int
    escalation_reason: Optional[str] = None
    escalation_type: Optional[str] = None
    escalated_at: Optional[datetime] = None
    is_overdue: bool = False
    time_remaining_minutes: Optional[int] = None
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None

    # Technician
    assigned_technician_id: Optional[str] = None
    assigned_technician_name: Optional[str] = None
    assigned_at: Optional[datetime] = None
    recommended_technician_id: Optional[str] = None
    assignment_recommendation_reason: Optional[str] = None

    # Timestamps & Activity
    created_at: datetime
    updated_at: datetime
    activities: List[TicketActivityResponse] = []
    model_config = ConfigDict(from_attributes=True)


class DashboardStatsResponse(BaseModel):
    total_tickets: int
    pending_count: int
    in_progress_count: int
    resolved_count: int
    critical_count: int
    escalated_count: int
    overdue_count: int
    emergency_alerts_count: int
    avg_resolution_time_hours: float
    category_breakdown: dict
    priority_breakdown: dict


class RecurringIssuePattern(BaseModel):
    category: str
    building: str
    equipment_id: Optional[str] = None
    incident_count: int
    ticket_ids: List[str]
    ticket_titles: List[str]
    last_reported_at: datetime
    risk_level: str
    preventive_recommendation: str
