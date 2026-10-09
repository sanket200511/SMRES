import React from 'react';
import { Users, Wrench, Phone, Mail, CheckCircle, Clock } from 'lucide-react';
import { Technician } from '../types';

interface Props {
  technicians: Technician[];
  isLoading: boolean;
}

export const TechniciansView: React.FC<Props> = ({ technicians, isLoading }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Facility Technician Roster & Dispatch
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Skill-based dispatch matching engine considers technical certifications and current queue workload.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-slate-400">Loading technician roster...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {technicians.map((t) => {
            const skills = t.skills.split(',').map((s) => s.trim());
            return (
              <div
                key={t.id}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                      {t.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{t.name}</h3>
                      <span className="text-[11px] text-slate-400 font-mono">{t.id}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      t.is_available
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {t.is_available ? 'Available' : 'Off-duty'}
                  </span>
                </div>

                {/* Skills */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Certified Competencies
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {skills.map((s) => (
                      <span
                        key={s}
                        className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Contact and Workload */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span className="font-semibold text-slate-800">
                      {t.active_tickets_count} Active Ticket{t.active_tickets_count !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {t.phone && (
                    <span className="text-slate-400 text-[11px] font-mono">{t.phone}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
