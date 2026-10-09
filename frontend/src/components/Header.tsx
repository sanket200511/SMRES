import React from 'react';
import { Plus, Zap, RefreshCw, LogIn, LogOut, Shield, User as UserIcon } from 'lucide-react';
import { User } from '../types';

interface Props {
  currentUser: User;
  onOpenCreateModal: () => void;
  onTriggerSlaCheck: () => void;
  isCheckingSla: boolean;
  onRefreshData: () => void;
  isRefreshing: boolean;
  isLoggedInWithJwt: boolean;
  onOpenAuthModal: (mode: 'login' | 'register') => void;
  onLogout: () => void;
}

export const Header: React.FC<Props> = ({
  currentUser,
  onOpenCreateModal,
  onTriggerSlaCheck,
  isCheckingSla,
  onRefreshData,
  isRefreshing,
  isLoggedInWithJwt,
  onOpenAuthModal,
  onLogout,
}) => {
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'facility_manager';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-2xs">
      {/* Title & Portal Badge */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          Operations & Facility Portal
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
              isAdmin
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {isAdmin ? 'Facility Manager Mode' : 'Employee Self-Service'}
          </span>
        </h2>
      </div>

      {/* Action Buttons & Auth Profile */}
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
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all cursor-pointer hover:shadow-blue-500/25"
        >
          <Plus className="w-4 h-4" />
          <span>New Maintenance Request</span>
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200 mx-1" />

        {/* Authentication Controls */}
        {isLoggedInWithJwt ? (
          <div className="flex items-center gap-2 pl-1">
            <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-slate-800 leading-tight">{currentUser.name}</p>
                <p className="text-[10px] text-slate-500 capitalize">{currentUser.role} • JWT Active</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenAuthModal('login')}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-blue-600" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenAuthModal('register')}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition cursor-pointer shadow-sm"
            >
              <span>Register</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
