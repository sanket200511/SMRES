import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, Building, ShieldCheck, X, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { User, UserRole } from '../types';
import { api } from '../api/client';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
  defaultMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  defaultMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!email || !password) {
          throw new Error('Email and password are required');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        const res = await api.register({
          email,
          password,
          name: name || undefined,
          role,
          department: department || undefined,
        });
        setSuccessMsg(`Account created successfully! Welcome, ${res.user.name}.`);
        setTimeout(() => {
          onAuthSuccess(res.user);
          onClose();
        }, 800);
      } else {
        if (!email || !password) {
          throw new Error('Please enter both email and password');
        }
        const res = await api.login({ email, password });
        setSuccessMsg(`Welcome back, ${res.user.name}!`);
        setTimeout(() => {
          onAuthSuccess(res.user);
          onClose();
        }, 600);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string, demoName: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.login({ email: demoEmail, password: 'password123' });
      setSuccessMsg(`Signed in as ${res.user.name}`);
      setTimeout(() => {
        onAuthSuccess(res.user);
        onClose();
      }, 500);
    } catch (err: any) {
      setError(`Quick sign-in for ${demoName} failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
        {/* Header decoration */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />

        <div className="p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-blue-400" />
                {mode === 'login' ? 'Sign In to SMRES' : 'Create User Account'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {mode === 'login'
                  ? 'Access intelligent maintenance dispatch & reporting'
                  : 'Register a new employee or administrator account'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 mt-4 bg-slate-950/80 rounded-xl border border-slate-800/80">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition ${
                mode === 'login'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition ${
                mode === 'register'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Register (Sign Up)
            </button>
          </div>

          {/* Alerts */}
          {error && (
            <div className="flex items-start gap-2 p-3 mt-4 text-xs font-medium text-red-300 bg-red-950/50 border border-red-800/50 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2 p-3 mt-4 text-xs font-medium text-emerald-300 bg-emerald-950/50 border border-emerald-800/50 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Jordan Lee"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Role</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="employee">Employee</option>
                      <option value="admin">Facility Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Department</label>
                    <div className="relative">
                      <Building className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="e.g. Operations"
                        className="w-full pl-9 pr-3 py-2 text-sm bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Minimum 6 characters' : 'Enter your password'}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm rounded-xl transition shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="mt-5 pt-4 border-t border-slate-800">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              ⚡ Quick 1-Click Demo Logins:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('sarah.jenkins@company.com', 'Sarah Jenkins')}
                disabled={loading}
                className="flex items-center gap-2 p-2 text-left bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-xl transition group"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                  SJ
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">Sarah Jenkins</p>
                  <p className="text-[10px] text-slate-400">Employee</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('marcus.vance@company.com', 'Marcus Vance')}
                disabled={loading}
                className="flex items-center gap-2 p-2 text-left bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-xl transition group"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                  MV
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">Marcus Vance</p>
                  <p className="text-[10px] text-slate-400">Admin Lead</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
