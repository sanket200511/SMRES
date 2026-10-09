import React from 'react';
import { Plus, Zap, RefreshCw, UserCheck, Shield } from 'lucide-react';
import { User } from '../types';

interface Props {
  currentUser: User;
  onOpenCreateModal: () => void;
  onTriggerSlaCheck: () => void;
  isCheckingSla: boolean;
  onRefreshData: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<Props> = ({
  currentUser,
  onOpenCreateModal,
  onTriggerSlaCheck,
  isCheckingSla,
  onRefreshData,
  isRefreshing,
}) => {
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'facility_manager';
  const isTech = currentUser.role === 'technician';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-2xs">
      {/* Title & Description */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          Operations & Facility Portal
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              isAdmin
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : isTech
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {isAdmin
              ? 'Facility Manager Mode'
              : isTech
              ? `Technician Workspace (${currentUser.name})`
              : 'Employee Self-Service'}
          </span>
        </h2>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onRefreshData}
          disabled={isRefreshing}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Refresh ticket data"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={onTriggerSlaCheck}
            disabled={isCheckingSla}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
            title="Scan for SLA deadline breaches and auto-escalate eligible tickets"
          >
            <Zap className={`w-3.5 h-3.5 text-amber-600 ${isCheckingSla ? 'animate-spin' : ''}`} />
            <span>{isCheckingSla ? 'Checking...' : 'Run SLA Monitor'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all cursor-pointer hover:shadow-blue-500/25"
        >
          <Plus className="w-4 h-4" />
          <span>New Maintenance Request</span>
        </button>
      </div>
    </header>
  );
};
