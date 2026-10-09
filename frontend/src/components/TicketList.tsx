import React from 'react';
import {
  Search,
  Filter,
  AlertTriangle,
  Flame,
  Clock,
  CheckCircle2,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  X,
  FileQuestion,
  Copy,
} from 'lucide-react';
import { Ticket } from '../types';
import { PriorityExplanationBadge } from './PriorityExplanationBadge';

interface Props {
  tickets: Ticket[];
  isLoading: boolean;
  onSelectTicket: (ticket: Ticket) => void;
  search: string;
  setSearch: (s: string) => void;
  categoryFilter: string;
  setCategoryFilter: (c: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  priorityFilter: string;
  setPriorityFilter: (p: string) => void;
  buildingFilter: string;
  setBuildingFilter: (b: string) => void;
  escalatedOnly: boolean;
  setEscalatedOnly: (e: boolean) => void;
  onResetFilters: () => void;
}

export const TicketList: React.FC<Props> = ({
  tickets,
  isLoading,
  onSelectTicket,
  search,
  setSearch,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  buildingFilter,
  setBuildingFilter,
  escalatedOnly,
  setEscalatedOnly,
  onResetFilters,
}) => {
  const categories = ['All Categories', 'Electrical', 'Plumbing', 'HVAC', 'Structural', 'Fire & Safety', 'General'];
  const statuses = ['All Statuses', 'Pending', 'In Progress', 'Resolved'];
  const priorities = ['All Priorities', 'Critical', 'High', 'Medium', 'Low'];
  const buildings = ['All Buildings', 'Building A', 'Building B', 'Building C', 'Building D - Warehouse'];

  const hasActiveFilters =
    search ||
    categoryFilter !== 'All Categories' ||
    statusFilter !== 'All Statuses' ||
    priorityFilter !== 'All Priorities' ||
    buildingFilter !== 'All Buildings' ||
    escalatedOnly;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Filter and Search Bar */}
      <div className="p-4 border-b border-slate-200 space-y-3 bg-slate-50/50">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ticket ID, title, keyword, equipment ID, or room..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs py-2 px-2.5 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs py-2 px-2.5 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs py-2 px-2.5 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setEscalatedOnly(!escalatedOnly)}
              className={`text-xs px-3 py-2 rounded-xl border font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                escalatedOnly
                  ? 'bg-purple-100 border-purple-300 text-purple-900'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
              Escalated Only
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className="text-xs px-2.5 py-2 text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Ticket Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4 w-[110px] whitespace-nowrap">Ticket</th>
              <th className="py-3 px-4 min-w-[280px]">Issue &amp; Location</th>
              <th className="py-3 px-4 w-[120px] whitespace-nowrap">Category</th>
              <th className="py-3 px-4 w-[170px] whitespace-nowrap">Priority (Formula)</th>
              <th className="py-3 px-4 w-[110px] whitespace-nowrap">Status</th>
              <th className="py-3 px-4 w-[140px] whitespace-nowrap">Technician</th>
              <th className="py-3 px-4 w-[180px] whitespace-nowrap">SLA / Escalation</th>
              <th className="py-3 px-4 w-[90px] whitespace-nowrap text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Loading maintenance requests...</span>
                  </div>
                </td>
              </tr>
            ) : tickets.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileQuestion className="w-8 h-8 text-slate-300" />
                    <span className="font-semibold text-slate-600">No matching tickets found</span>
                    <p className="text-[11px] text-slate-400">
                      Try adjusting your search criteria or create a new request.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              tickets.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => onSelectTicket(t)}
                  className={`hover:bg-blue-50/40 transition-colors cursor-pointer ${
                    t.is_safety_emergency
                      ? 'bg-rose-50/20'
                      : t.is_overdue
                      ? 'bg-amber-50/15'
                      : ''
                  }`}
                >
                  {/* Ticket ID & Date */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                      {t.id}
                      {t.is_potential_duplicate && (
                        <span title={`Potential duplicate of ${t.duplicate_of_id}`}>
                          <Copy className="w-3.5 h-3.5 text-amber-500" />
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(t.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </td>

                  {/* Title & Location */}
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="font-semibold text-slate-900 truncate" title={t.title}>
                      {t.title}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                      <span>{t.location}</span>
                      {t.equipment_id && (
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-medium">
                          {t.equipment_id}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md font-medium text-[11px] bg-slate-100 text-slate-700">
                      {t.category}
                    </span>
                  </td>

                  {/* Priority Breakdown Badge */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <PriorityExplanationBadge
                      priority={t.effective_priority}
                      score={t.priority_score}
                      explanation={t.priority_explanation}
                      isEmergency={t.is_safety_emergency}
                      emergencyTrigger={t.emergency_trigger_keyword}
                      isOverridden={!!t.priority_override}
                      overrideReason={t.priority_override_reason}
                      size="sm"
                    />
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                        t.status === 'Resolved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : t.status === 'In Progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>

                  {/* Technician */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {t.assigned_technician_name ? (
                      <div className="font-medium text-slate-800 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>{t.assigned_technician_name}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                    )}
                  </td>

                  {/* SLA / Escalation */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1 items-start">
                      {t.status === 'Resolved' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          Met &amp; Resolved
                        </span>
                      ) : t.is_overdue ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          SLA Breached
                        </span>
                      ) : t.time_remaining_minutes !== undefined ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          {Math.max(0, Math.floor(t.time_remaining_minutes / 60))}h {Math.max(0, t.time_remaining_minutes % 60)}m left
                        </span>
                      ) : null}

                      {t.is_escalated && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          <ShieldAlert className="w-3 h-3 text-purple-600 shrink-0" />
                          Level {t.escalation_level} Escalation
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Action */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTicket(t);
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Inspect</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
