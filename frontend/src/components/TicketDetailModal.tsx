import React, { useState } from 'react';
import {
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Shield,
  ShieldAlert,
  User,
  Wrench,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  Send,
  Link2,
  Info,
} from 'lucide-react';
import { Ticket, User as UserType, Technician } from '../types';
import { api } from '../api/client';
import { PriorityExplanationBadge } from './PriorityExplanationBadge';
import { DuplicateWarningAlert } from './DuplicateWarningAlert';

interface Props {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType;
  technicians: Technician[];
  onTicketUpdated: () => void;
  onSelectDuplicateTicket?: (id: string) => void;
}

export const TicketDetailModal: React.FC<Props> = ({
  ticket,
  isOpen,
  onClose,
  currentUser,
  technicians,
  onTicketUpdated,
  onSelectDuplicateTicket,
}) => {
  const [selectedTechId, setSelectedTechId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Status update
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState(false);

  // Priority override
  const [overridePriorityVal, setOverridePriorityVal] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('High');
  const [overrideReason, setOverrideReason] = useState('');
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [isOverriding, setIsOverriding] = useState(false);

  // Manual escalation
  const [escalateReason, setEscalateReason] = useState('');
  const [escalateLevel, setEscalateLevel] = useState(1);
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);

  if (!isOpen || !ticket) return null;

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'facility_manager';

  // Format time remaining / overdue
  const renderSlaStatus = () => {
    if (ticket.status === 'Resolved') {
      return (
        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100 text-xs font-semibold px-2.5 py-1 rounded-full">
          <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
        </span>
      );
    }

    if (ticket.is_overdue) {
      return (
        <span className="inline-flex items-center gap-1 text-rose-800 bg-rose-100 text-xs font-bold px-2.5 py-1 rounded-full border border-rose-300 animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5" /> SLA Breached (Overdue)
        </span>
      );
    }

    if (ticket.time_remaining_minutes !== undefined && ticket.time_remaining_minutes !== null) {
      const hours = Math.floor(ticket.time_remaining_minutes / 60);
      const mins = ticket.time_remaining_minutes % 60;
      return (
        <span className="inline-flex items-center gap-1 text-blue-800 bg-blue-100 text-xs font-semibold px-2.5 py-1 rounded-full">
          <Clock className="w-3.5 h-3.5" /> {hours > 0 ? `${hours}h ${mins}m remaining` : `${mins}m remaining`}
        </span>
      );
    }

    return null;
  };

  const handleAssignTechnician = async () => {
    if (!selectedTechId) return;
    setIsAssigning(true);
    try {
      await api.assignTechnician(ticket.id, selectedTechId, currentUser);
      onTicketUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to assign technician');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleTransitionStatus = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      await api.updateTicketStatus(
        ticket.id,
        newStatus,
        undefined,
        newStatus === 'Resolved' ? resolutionNotes : undefined,
        currentUser
      );
      setShowResolveDialog(false);
      setResolutionNotes('');
      onTicketUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleOverridePriority = async () => {
    if (!overrideReason.trim()) {
      alert('Please provide a reason for the priority override.');
      return;
    }
    setIsOverriding(true);
    try {
      await api.overridePriority(ticket.id, overridePriorityVal, overrideReason, currentUser);
      setShowOverrideDialog(false);
      setOverrideReason('');
      onTicketUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to override priority');
    } finally {
      setIsOverriding(false);
    }
  };

  const handleManualEscalation = async () => {
    if (!escalateReason.trim()) {
      alert('Please state a reason for manual escalation.');
      return;
    }
    setIsEscalating(true);
    try {
      await api.manualEscalate(ticket.id, escalateReason, escalateLevel, currentUser);
      setShowEscalateDialog(false);
      setEscalateReason('');
      onTicketUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to escalate ticket');
    } finally {
      setIsEscalating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full my-6 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between bg-slate-50 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-800">
                {ticket.id}
              </span>
              <PriorityExplanationBadge
                priority={ticket.effective_priority}
                score={ticket.priority_score}
                explanation={ticket.priority_explanation}
                isEmergency={ticket.is_safety_emergency}
                emergencyTrigger={ticket.emergency_trigger_keyword}
                isOverridden={!!ticket.priority_override}
                overrideReason={ticket.priority_override_reason}
                size="md"
              />
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  ticket.status === 'Resolved'
                    ? 'bg-emerald-100 text-emerald-800'
                    : ticket.status === 'In Progress'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {ticket.status}
              </span>
              {ticket.is_escalated && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
                  Escalated (Level {ticket.escalation_level})
                </span>
              )}
              {renderSlaStatus()}
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-1">{ticket.title}</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Duplicate Incident Warning if flagged */}
          {ticket.is_potential_duplicate && ticket.duplicate_of_id && (
            <DuplicateWarningAlert
              duplicateOfId={ticket.duplicate_of_id}
              confidence={ticket.duplicate_confidence}
              reason={ticket.duplicate_reason}
              onViewOriginal={(id) => onSelectDuplicateTicket && onSelectDuplicateTicket(id)}
              isLinked={true}
            />
          )}

          {/* Description & Location Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Description of Issue
                </h4>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {ticket.description}
                </div>
              </div>

              {/* Resolution Notes if Resolved */}
              {ticket.status === 'Resolved' && ticket.resolution_notes && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-950">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Resolution Summary
                  </h4>
                  <p className="text-xs text-emerald-900 leading-relaxed">{ticket.resolution_notes}</p>
                </div>
              )}
            </div>

            {/* Metadata Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Incident Context
              </h4>

              <div className="space-y-2 text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Category:</span>
                  <span className="font-semibold text-slate-800">{ticket.category}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Building:</span>
                  <span className="font-semibold text-slate-800">{ticket.building}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Specific Location:</span>
                  <span className="font-semibold text-slate-800 text-right">{ticket.location}</span>
                </div>
                {ticket.equipment_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Equipment ID:</span>
                    <span className="font-mono font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                      {ticket.equipment_id}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Submitted By:</span>
                  <span className="font-medium text-slate-800">{ticket.submitted_by_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Created:</span>
                  <span className="text-slate-700">
                    {new Date(ticket.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">SLA Window:</span>
                  <span className="font-bold text-slate-800">{ticket.sla_hours} hours</span>
                </div>
              </div>
            </div>
          </div>

          {/* Smart Priority Engine Breakdown */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600" />
                Smart Priority Engine Breakdown (Score: {ticket.priority_score}/100)
              </h4>
              {isAdmin && ticket.status !== 'Resolved' && (
                <button
                  type="button"
                  onClick={() => setShowOverrideDialog(!showOverrideDialog)}
                  className="text-xs font-semibold text-purple-700 hover:text-purple-900 hover:underline cursor-pointer"
                >
                  {showOverrideDialog ? 'Cancel Override' : 'Override Priority'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Safety (8x)</span>
                <span className="font-mono font-bold text-sm text-rose-600">
                  {ticket.safety_score} / 5
                </span>
                <span className="text-[10px] text-slate-400 block">+{ticket.safety_score * 8} pts</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Operational (5x)</span>
                <span className="font-mono font-bold text-sm text-amber-600">
                  {ticket.operational_impact_score} / 5
                </span>
                <span className="text-[10px] text-slate-400 block">+{ticket.operational_impact_score * 5} pts</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[10px]">People (4x)</span>
                <span className="font-mono font-bold text-sm text-blue-600">
                  {ticket.affected_people_score} / 5
                </span>
                <span className="text-[10px] text-slate-400 block">+{ticket.affected_people_score * 4} pts</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Time (3x)</span>
                <span className="font-mono font-bold text-sm text-indigo-600">
                  {ticket.time_sensitivity_score} / 5
                </span>
                <span className="text-[10px] text-slate-400 block">+{ticket.time_sensitivity_score * 3} pts</span>
              </div>
            </div>

            {ticket.priority_explanation && (
              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                {ticket.priority_explanation}
              </p>
            )}

            {/* Override Dialog for Admin */}
            {showOverrideDialog && (
              <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 space-y-3 animate-in fade-in">
                <h5 className="text-xs font-bold text-purple-950">Manager Priority Override</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-purple-900 block mb-1">
                      New Priority
                    </label>
                    <select
                      value={overridePriorityVal}
                      onChange={(e) => setOverridePriorityVal(e.target.value as any)}
                      className="w-full text-xs p-2 border border-purple-300 rounded-lg bg-white"
                    >
                      <option value="Critical">Critical (1h SLA)</option>
                      <option value="High">High (4h SLA)</option>
                      <option value="Medium">Medium (24h SLA)</option>
                      <option value="Low">Low (48h SLA)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-purple-900 block mb-1">
                      Justification Reason *
                    </label>
                    <input
                      type="text"
                      required
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="e.g. VIP event today or hazard mitigation confirmed"
                      className="w-full text-xs p-2 border border-purple-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowOverrideDialog(false)}
                    className="px-3 py-1.5 text-xs text-purple-800 hover:bg-purple-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isOverriding}
                    onClick={handleOverridePriority}
                    className="px-3 py-1.5 text-xs font-semibold bg-purple-700 hover:bg-purple-800 text-white rounded-lg cursor-pointer"
                  >
                    {isOverriding ? 'Saving...' : 'Apply Override'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Technician Assignment & SLA Escalation Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Technician Assignment Section */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-blue-600" />
                Technician Dispatch
              </h4>

              <div className="space-y-2 text-xs">
                {ticket.assigned_technician_name ? (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center justify-between">
                    <div>
                      <span className="font-bold block">{ticket.assigned_technician_name}</span>
                      <span className="text-[11px] text-emerald-700">
                        Assigned on {new Date(ticket.assigned_at || '').toLocaleDateString()}
                      </span>
                    </div>
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                      Active Dispatch
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600">
                    Unassigned - awaiting dispatch
                  </div>
                )}

                {/* Recommended Technician */}
                {ticket.recommended_technician_id && !ticket.assigned_technician_name && (
                  <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-950">
                    <span className="font-bold text-[11px] text-blue-800 block">
                      Skill-Based Recommendation:
                    </span>
                    <p className="text-[11px] text-blue-900 mt-0.5">
                      {ticket.assignment_recommendation_reason}
                    </p>
                  </div>
                )}

                {/* Admin Dispatch Control */}
                {isAdmin && ticket.status !== 'Resolved' && (
                  <div className="pt-2 flex items-center gap-2">
                    <select
                      value={selectedTechId}
                      onChange={(e) => setSelectedTechId(e.target.value)}
                      className="flex-1 text-xs p-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">Choose Technician...</option>
                      {technicians.map((tech) => (
                        <option key={tech.id} value={tech.id}>
                          {tech.name} ({tech.skills}) • {tech.active_tickets_count} active
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={isAssigning || !selectedTechId}
                      onClick={handleAssignTechnician}
                      className="px-3 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg cursor-pointer"
                    >
                      {isAssigning ? '...' : 'Assign'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* SLA & Escalation Section */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-purple-600" />
                  SLA & Escalation Status
                </h4>
                {ticket.status !== 'Resolved' && (
                  <button
                    type="button"
                    onClick={() => setShowEscalateDialog(!showEscalateDialog)}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                  >
                    {showEscalateDialog ? 'Cancel' : 'Manual Escalate'}
                  </button>
                )}
              </div>

              <div className="space-y-2 text-xs">
                {ticket.is_escalated ? (
                  <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-950">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">
                        Escalation Level {ticket.escalation_level} ({ticket.escalation_type || 'automatic'})
                      </span>
                      <span className="text-[10px] font-mono text-purple-700">
                        {ticket.escalated_at ? new Date(ticket.escalated_at).toLocaleTimeString() : ''}
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-900 mt-1">{ticket.escalation_reason}</p>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">
                    Normal escalation status. SLA automated monitor active.
                  </div>
                )}

                {/* Manual Escalation Form */}
                {showEscalateDialog && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 space-y-2 animate-in fade-in">
                    <span className="text-[11px] font-bold text-rose-900 block">
                      Trigger Urgent Escalation
                    </span>
                    <input
                      type="text"
                      required
                      value={escalateReason}
                      onChange={(e) => setEscalateReason(e.target.value)}
                      placeholder="Why is immediate escalation requested?"
                      className="w-full text-xs p-2 border border-rose-300 rounded-lg bg-white"
                    />
                    <div className="flex items-center justify-between">
                      <select
                        value={escalateLevel}
                        onChange={(e) => setEscalateLevel(parseInt(e.target.value))}
                        className="text-xs p-1.5 border border-rose-300 rounded-lg bg-white"
                      >
                        <option value={1}>Level 1 (Facility Manager)</option>
                        <option value={2}>Level 2 (Operations Director)</option>
                      </select>
                      <button
                        type="button"
                        disabled={isEscalating}
                        onClick={handleManualEscalation}
                        className="px-3 py-1.5 text-xs font-semibold bg-rose-700 hover:bg-rose-800 text-white rounded-lg cursor-pointer"
                      >
                        {isEscalating ? 'Escalating...' : 'Confirm Escalation'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Activity Audit Trail */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-500" />
              Activity Log & Audit Trail ({ticket.activities?.length || 0})
            </h4>

            <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden bg-white max-h-48 overflow-y-auto">
              {ticket.activities && ticket.activities.length > 0 ? (
                ticket.activities.map((act) => (
                  <div key={act.id} className="p-3 text-xs flex items-start gap-3 hover:bg-slate-50">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800">
                          {act.actor_name} ({act.actor_role})
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(act.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-0.5 leading-relaxed">{act.notes}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 text-xs text-slate-400 text-center">No logged activity yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Work Status: <span className="font-semibold text-slate-800">{ticket.status}</span>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && ticket.status === 'Pending' && (
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={() => handleTransitionStatus('In Progress')}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm cursor-pointer"
              >
                Start Remediation (In Progress)
              </button>
            )}

            {isAdmin && ticket.status !== 'Resolved' && (
              <>
                {showResolveDialog ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Resolution notes / actions taken..."
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white w-64"
                    />
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() => handleTransitionStatus('Resolved')}
                      className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResolveDialog(false)}
                      className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowResolveDialog(true)}
                    className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm cursor-pointer"
                  >
                    Mark as Resolved
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
