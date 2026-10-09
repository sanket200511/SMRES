export type UserRole = 'employee' | 'admin' | 'facility_manager' | 'technician';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
}

export interface Technician {
  id: string;
  name: string;
  email: string;
  phone?: string;
  skills: string;
  active_tickets_count: number;
  is_available: boolean;
}

export interface TicketActivity {
  id: number;
  ticket_id: string;
  action: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  notes?: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  building: string;
  floor?: string;
  room?: string;
  equipment_id?: string;
  submitted_by_id: string;
  submitted_by_name: string;
  status: 'Pending' | 'In Progress' | 'Resolved' | 'Cancelled';

  // Smart Priority Engine
  safety_score: number;
  operational_impact_score: number;
  affected_people_score: number;
  time_sensitivity_score: number;
  priority_score: number;
  recommended_priority: 'Critical' | 'High' | 'Medium' | 'Low';
  priority_explanation?: string;
  is_safety_emergency: boolean;
  emergency_trigger_keyword?: string;
  priority_override?: 'Critical' | 'High' | 'Medium' | 'Low';
  priority_override_reason?: string;
  priority_override_by?: string;
  effective_priority: 'Critical' | 'High' | 'Medium' | 'Low';

  // Duplicate Incident Detection
  is_potential_duplicate: boolean;
  duplicate_of_id?: string;
  duplicate_confidence: number;
  duplicate_reason?: string;

  // SLA & Escalation
  sla_hours: number;
  sla_deadline?: string;
  is_escalated: boolean;
  escalation_level: number;
  escalation_reason?: string;
  escalation_type?: 'automatic' | 'manual';
  escalated_at?: string;
  is_overdue?: boolean;
  time_remaining_minutes?: number;
  acknowledged_at?: string;
  resolved_at?: string;
  resolution_notes?: string;

  // Assignment
  assigned_technician_id?: string;
  assigned_technician_name?: string;
  assigned_at?: string;
  recommended_technician_id?: string;
  assignment_recommendation_reason?: string;

  // Timestamps & Audit
  created_at: string;
  updated_at: string;
  activities?: TicketActivity[];
}

export interface PriorityScoreBreakdown {
  safety_score: number;
  operational_impact_score: number;
  affected_people_score: number;
  time_sensitivity_score: number;
  total_score: number;
  recommended_priority: 'Critical' | 'High' | 'Medium' | 'Low';
  is_safety_emergency: boolean;
  emergency_trigger?: string;
  explanation: string;
}

export interface DuplicateCheckResult {
  is_potential_duplicate: boolean;
  duplicate_of_id?: string;
  duplicate_of_title?: string;
  confidence: number;
  reason?: string;
}

export interface DashboardStats {
  total_tickets: number;
  pending_count: number;
  in_progress_count: number;
  resolved_count: number;
  critical_count: number;
  escalated_count: number;
  overdue_count: number;
  emergency_alerts_count: number;
  avg_resolution_time_hours: number;
  category_breakdown: Record<string, number>;
  priority_breakdown: Record<string, number>;
}

export interface RecurringIssuePattern {
  category: string;
  building: string;
  equipment_id?: string;
  incident_count: number;
  ticket_ids: string[];
  ticket_titles: string[];
  last_reported_at: string;
  risk_level: 'High' | 'Moderate' | 'Low';
  preventive_recommendation: string;
}
