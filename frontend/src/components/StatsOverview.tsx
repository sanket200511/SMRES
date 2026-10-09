import React from 'react';
import {
  Inbox,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  ShieldAlert,
  Wrench,
} from 'lucide-react';
import { DashboardStats, Ticket, User } from '../types';

interface Props {
  stats: DashboardStats | null;
  tickets: Ticket[];
  currentUser: User;
  selectedFilter: string | null;
  onSelectFilter: (filterKey: string | null) => void;
}

export const StatsOverview: React.FC<Props> = ({
  stats,
  tickets,
  currentUser,
  selectedFilter,
  onSelectFilter,
}) => {
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'facility_manager';
  const isTech = currentUser.role === 'technician';
  const isEmp = currentUser.role === 'employee';

  if (!stats && isAdmin) return null;

  // Compute personal metrics for Employee and Technician
  const myPending = tickets.filter((t) => t.status === 'Pending').length;
  const myInProgress = tickets.filter((t) => t.status === 'In Progress').length;
  const myResolved = tickets.filter((t) => t.status === 'Resolved').length;
  const myCritical = tickets.filter((t) => t.effective_priority === 'Critical').length;
  const myEscalated = tickets.filter((t) => t.is_escalated).length;
  const myOverdue = tickets.filter((t) => t.is_overdue).length;

  let cards = [];

  if (isEmp) {
    cards = [
      {
        id: 'all',
        label: 'My Requests',
        value: tickets.length,
        sub: 'Submitted by you',
        icon: Inbox,
        color: 'text-slate-700 bg-slate-100 border-slate-200',
        activeColor: 'ring-2 ring-slate-800 bg-slate-50',
      },
      {
        id: 'Pending',
        label: 'Pending',
        value: myPending,
        sub: 'Awaiting triage',
        icon: Clock,
        color: 'text-amber-700 bg-amber-50 border-amber-200',
        activeColor: 'ring-2 ring-amber-500 bg-amber-50/80',
      },
      {
        id: 'In Progress',
        label: 'In Progress',
        value: myInProgress,
        sub: 'Technician working',
        icon: ArrowUpRight,
        color: 'text-blue-700 bg-blue-50 border-blue-200',
        activeColor: 'ring-2 ring-blue-500 bg-blue-50/80',
      },
      {
        id: 'Resolved',
        label: 'Resolved',
        value: myResolved,
        sub: 'Completed fixes',
        icon: CheckCircle2,
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        activeColor: 'ring-2 ring-emerald-500 bg-emerald-50/80',
      },
      {
        id: 'Critical',
        label: 'Critical',
        value: myCritical,
        sub: 'High priority flags',
        icon: Flame,
        color: 'text-rose-700 bg-rose-50 border-rose-200',
        activeColor: 'ring-2 ring-rose-500 bg-rose-50/80',
      },
      {
        id: 'escalated',
        label: 'Escalated',
        value: myEscalated,
        sub: 'Senior alert active',
        icon: ShieldAlert,
        color: 'text-purple-700 bg-purple-50 border-purple-200',
        activeColor: 'ring-2 ring-purple-500 bg-purple-50/80',
      },
    ];
  } else if (isTech) {
    cards = [
      {
        id: 'all',
        label: 'Assigned Tasks',
        value: tickets.length,
        sub: `Dispatched to ${currentUser.name.split(' ')[0]}`,
        icon: Wrench,
        color: 'text-slate-700 bg-slate-100 border-slate-200',
        activeColor: 'ring-2 ring-slate-800 bg-slate-50',
      },
      {
        id: 'Pending',
        label: 'Pending Start',
        value: myPending,
        sub: 'Awaiting on-site arrival',
        icon: Clock,
        color: 'text-amber-700 bg-amber-50 border-amber-200',
        activeColor: 'ring-2 ring-amber-500 bg-amber-50/80',
      },
      {
        id: 'In Progress',
        label: 'Active Remediation',
        value: myInProgress,
        sub: 'Work currently ongoing',
        icon: ArrowUpRight,
        color: 'text-blue-700 bg-blue-50 border-blue-200',
        activeColor: 'ring-2 ring-blue-500 bg-blue-50/80',
      },
      {
        id: 'Resolved',
        label: 'Resolved Tasks',
        value: myResolved,
        sub: 'Completed by you',
        icon: CheckCircle2,
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        activeColor: 'ring-2 ring-emerald-500 bg-emerald-50/80',
      },
      {
        id: 'Critical',
        label: 'Critical Tasks',
        value: myCritical,
        sub: 'Immediate response req',
        icon: Flame,
        color: 'text-rose-700 bg-rose-50 border-rose-200',
        activeColor: 'ring-2 ring-rose-500 bg-rose-50/80',
      },
      {
        id: 'overdue',
        label: 'SLA Overdue',
        value: myOverdue,
        sub: 'Breached deadline',
        icon: AlertTriangle,
        color: 'text-red-700 bg-red-50 border-red-200',
        activeColor: 'ring-2 ring-red-500 bg-red-50/80',
      },
    ];
  } else {
    // Admin / Facility Operations Lead
    cards = [
      {
        id: 'all',
        label: 'Total Requests',
        value: stats?.total_tickets || 0,
        sub: 'All logged incidents',
        icon: Inbox,
        color: 'text-slate-700 bg-slate-100 border-slate-200',
        activeColor: 'ring-2 ring-slate-800 bg-slate-50',
      },
      {
        id: 'Pending',
        label: 'Pending Triage',
        value: stats?.pending_count || 0,
        sub: 'Awaiting technician',
        icon: Clock,
        color: 'text-amber-700 bg-amber-50 border-amber-200',
        activeColor: 'ring-2 ring-amber-500 bg-amber-50/80',
      },
      {
        id: 'In Progress',
        label: 'In Progress',
        value: stats?.in_progress_count || 0,
        sub: 'Active remediation',
        icon: ArrowUpRight,
        color: 'text-blue-700 bg-blue-50 border-blue-200',
        activeColor: 'ring-2 ring-blue-500 bg-blue-50/80',
      },
      {
        id: 'Critical',
        label: 'Critical Priority',
        value: stats?.critical_count || 0,
        sub: `${stats?.emergency_alerts_count || 0} life-safety alert(s)`,
        icon: Flame,
        color: 'text-rose-700 bg-rose-50 border-rose-200',
        activeColor: 'ring-2 ring-rose-500 bg-rose-50/80',
      },
      {
        id: 'escalated',
        label: 'Escalated Issues',
        value: stats?.escalated_count || 0,
        sub: 'Manager/Director alert',
        icon: ShieldAlert,
        color: 'text-purple-700 bg-purple-50 border-purple-200',
        activeColor: 'ring-2 ring-purple-500 bg-purple-50/80',
      },
      {
        id: 'overdue',
        label: 'SLA Overdue',
        value: stats?.overdue_count || 0,
        sub: 'Breached time window',
        icon: AlertTriangle,
        color: 'text-red-700 bg-red-50 border-red-200',
        activeColor: 'ring-2 ring-red-500 bg-red-50/80',
      },
    ];
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3.5 mb-6">
      {cards.map((c) => {
        const Icon = c.icon;
        const isSelected = selectedFilter === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelectFilter(isSelected ? null : c.id)}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs hover:shadow-xs ${c.color} ${
              isSelected ? c.activeColor : 'hover:-translate-y-0.5'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium opacity-85 truncate">{c.label}</span>
              <Icon className="w-4 h-4 shrink-0 opacity-80" />
            </div>
            <div className="text-2xl font-black tracking-tight">{c.value}</div>
            <p className="text-[11px] opacity-75 mt-0.5 truncate">{c.sub}</p>
          </button>
        );
      })}
    </div>
  );
};
