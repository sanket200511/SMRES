import React from 'react';
import {
  Wrench,
  LayoutDashboard,
  RotateCcw,
  Users,
  ShieldCheck,
  UserCheck,
  BookOpen,
  AlertTriangle,
} from 'lucide-react';
import { User } from '../types';

interface Props {
  currentView: 'tickets' | 'recurring' | 'technicians' | 'guide';
  setCurrentView: (view: 'tickets' | 'recurring' | 'technicians' | 'guide') => void;
  currentUser: User;
  allUsers: User[];
  onSwitchUser: (user: User) => void;
  overdueCount?: number;
  emergencyCount?: number;
}

export const Sidebar: React.FC<Props> = ({
  currentView,
  setCurrentView,
  currentUser,
  allUsers,
  onSwitchUser,
  overdueCount = 0,
  emergencyCount = 0,
}) => {
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'facility_manager';
  const isTech = currentUser.role === 'technician';

  const getTicketsLabel = () => {
    if (isAdmin) return 'All Requests';
    if (isTech) return 'Assigned Tasks';
    return 'My Requests';
  };

  const getRoleBadgeStyle = () => {
    if (isAdmin) return 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30';
    if (isTech) return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
    return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
  };

  const employees = allUsers.filter((u) => u.role === 'employee');
  const admins = allUsers.filter((u) => u.role === 'admin' || u.role === 'facility_manager');
  const technicians = allUsers.filter((u) => u.role === 'technician');

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              SMRES <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono font-medium">v1.0</span>
            </h1>
            <p className="text-[11px] text-slate-400">Smart Maintenance & Escalation</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Navigation
        </div>

        <button
          onClick={() => setCurrentView('tickets')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            currentView === 'tickets'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <LayoutDashboard className="w-4 h-4" />
            <span>{getTicketsLabel()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {emergencyCount > 0 && (
              <span
                title={`${emergencyCount} active life-safety emergency alert${emergencyCount > 1 ? 's' : ''}`}
                className="text-[10px] bg-rose-500 text-white font-bold px-1.5 py-0.5 rounded-full animate-pulse shadow-2xs"
              >
                {emergencyCount}
              </span>
            )}
            {overdueCount > 0 && (
              <span
                title={`${overdueCount} overdue SLA breach${overdueCount > 1 ? 'es' : ''}`}
                className="text-[10px] bg-amber-500 text-slate-950 font-bold px-1.5 py-0.5 rounded-full shadow-2xs"
              >
                {overdueCount}
              </span>
            )}
          </div>
        </button>

        <button
          onClick={() => setCurrentView('recurring')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            currentView === 'recurring'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <RotateCcw className="w-4 h-4" />
            <span>Recurring Issues</span>
          </div>
          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono px-1.5 py-0.5 rounded">
            Analysis
          </span>
        </button>

        <button
          onClick={() => setCurrentView('technicians')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            currentView === 'technicians'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4" />
            <span>Technician Roster</span>
          </div>
        </button>

        <button
          onClick={() => setCurrentView('guide')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            currentView === 'guide'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4" />
            <span>Priority & SLA Guide</span>
          </div>
        </button>
      </div>

      {/* Role Switcher Sandbox */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-blue-400" /> Demo Role Switcher
          </span>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${getRoleBadgeStyle()}`}
          >
            {currentUser.role}
          </span>
        </div>

        <select
          value={currentUser.id}
          onChange={(e) => {
            const found = allUsers.find((u) => u.id === e.target.value);
            if (found) onSwitchUser(found);
          }}
          className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
        >
          {admins.length > 0 && (
            <optgroup label="🏢 Facility Managers / Admins">
              {admins.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </optgroup>
          )}

          {employees.length > 0 && (
            <optgroup label="👤 Employees (Submitters)">
              {employees.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </optgroup>
          )}

          {technicians.length > 0 && (
            <optgroup label="🔧 Technicians (Field Dispatch)">
              {technicians.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>

        <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-400">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="truncate">{currentUser.department || 'Staff Member'}</span>
        </div>
      </div>
    </aside>
  );
};
