import React from 'react';
import {
  Inbox,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import { DashboardStats } from '../types';

interface Props {
  stats: DashboardStats | null;
  selectedFilter: string | null;
  onSelectFilter: (filterKey: string | null) => void;
}

export const StatsOverview: React.FC<Props> = ({
  stats,
  selectedFilter,
  onSelectFilter,
}) => {
  if (!stats) return null;

  const cards = [
    {
      id: 'all',
      label: 'Total Requests',
      value: stats.total_tickets,
      sub: 'All logged incidents',
      icon: Inbox,
      color: 'text-slate-700 bg-slate-100 border-slate-200',
      activeColor: 'ring-2 ring-slate-800 bg-slate-50',
    },
    {
      id: 'Pending',
      label: 'Pending Triage',
      value: stats.pending_count,
      sub: 'Awaiting technician',
      icon: Clock,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
      activeColor: 'ring-2 ring-amber-500 bg-amber-50/80',
    },
    {
      id: 'In Progress',
      label: 'In Progress',
      value: stats.in_progress_count,
      sub: 'Active remediation',
      icon: ArrowUpRight,
      color: 'text-blue-700 bg-blue-50 border-blue-200',
      activeColor: 'ring-2 ring-blue-500 bg-blue-50/80',
    },
    {
      id: 'Critical',
      label: 'Critical Priority',
      value: stats.critical_count,
      sub: `${stats.emergency_alerts_count} life-safety alert(s)`,
      icon: Flame,
      color: 'text-rose-700 bg-rose-50 border-rose-200',
      activeColor: 'ring-2 ring-rose-500 bg-rose-50/80',
    },
    {
      id: 'escalated',
      label: 'Escalated Issues',
      value: stats.escalated_count,
      sub: 'Manager/Director alert',
      icon: ShieldAlert,
      color: 'text-purple-700 bg-purple-50 border-purple-200',
      activeColor: 'ring-2 ring-purple-500 bg-purple-50/80',
    },
    {
      id: 'overdue',
      label: 'SLA Overdue',
      value: stats.overdue_count,
      sub: 'Breached time window',
      icon: AlertTriangle,
      color: 'text-red-700 bg-red-50 border-red-200',
      activeColor: 'ring-2 ring-red-500 bg-red-50/80',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
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
