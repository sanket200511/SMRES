import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Wrench,
  Building,
  Layers,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { RecurringIssuePattern } from '../types';
import { api } from '../api/client';

interface Props {
  onSelectTicketId: (ticketId: string) => void;
}

export const RecurringIssuesView: React.FC<Props> = ({ onSelectTicketId }) => {
  const [patterns, setPatterns] = useState<RecurringIssuePattern[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPatterns = async () => {
    setIsLoading(true);
    try {
      const data = await api.getRecurringIssues();
      setPatterns(data);
    } catch (err) {
      console.error('Failed to load recurring issues', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPatterns();
  }, []);

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-md">
        <div className="flex items-start justify-between">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs tracking-wider uppercase">
              <RotateCcw className="w-4 h-4" />
              <span>Asset Reliability & Recurring Failure Analytics</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              Predictive Maintenance & Asset Failure Clusters
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              The automated clustering engine detects recurring failure patterns across facilities, categories, and equipment IDs. Repeated breakdowns trigger preventive engineering alerts before catastrophic asset failure occurs.
            </p>
          </div>

          <button
            type="button"
            onClick={loadPatterns}
            className="px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors cursor-pointer"
          >
            Refresh Clusters
          </button>
        </div>
      </div>

      {/* Pattern Cards List */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span>Analyzing historical maintenance logs...</span>
        </div>
      ) : patterns.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <h4 className="font-bold text-slate-800 text-sm">No Recurring Failures Detected</h4>
          <p className="text-xs text-slate-500 mt-1">
            All facility assets and zones are operating within healthy baseline reliability parameters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {patterns.map((p, idx) => (
            <div
              key={`${p.building}-${p.category}-${idx}`}
              className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                      p.risk_level === 'High'
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : p.risk_level === 'Moderate'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-blue-100 text-blue-800 border border-blue-300'
                    }`}
                  >
                    {p.risk_level === 'High' && <Flame className="w-3.5 h-3.5 text-rose-600" />}
                    {p.risk_level} Breakdown Risk ({p.incident_count} Incidents)
                  </span>

                  <span className="text-[11px] text-slate-400 font-mono">
                    Last incident: {new Date(p.last_reported_at).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <span>{p.building}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-indigo-600">{p.category}</span>
                  </h3>
                  {p.equipment_id && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                      <span className="font-semibold text-slate-400">Target Asset:</span>
                      <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                        {p.equipment_id}
                      </span>
                    </div>
                  )}
                </div>

                {/* Preventive Recommendation Box */}
                <div
                  className={`p-3 rounded-xl text-xs leading-relaxed ${
                    p.risk_level === 'High'
                      ? 'bg-rose-50/80 border border-rose-200 text-rose-950'
                      : 'bg-indigo-50/80 border border-indigo-200 text-indigo-950'
                  }`}
                >
                  <span className="font-bold block mb-0.5 flex items-center gap-1">
                    <Wrench className="w-3.5 h-3.5" />
                    Preventive Maintenance Recommendation:
                  </span>
                  {p.preventive_recommendation}
                </div>
              </div>

              {/* Linked Incident Tickets */}
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                  Linked Incident History ({p.ticket_ids.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {p.ticket_ids.map((tid, tIdx) => (
                    <button
                      key={tid}
                      type="button"
                      onClick={() => onSelectTicketId(tid)}
                      className="group px-2.5 py-1 text-[11px] font-mono font-bold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg border border-slate-200 hover:border-blue-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      title={p.ticket_titles[tIdx] ? `${tid}: ${p.ticket_titles[tIdx]}` : tid}
                    >
                      <span>{tid}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
