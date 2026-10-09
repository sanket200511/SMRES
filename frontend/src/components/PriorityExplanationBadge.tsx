import React, { useState } from 'react';
import { AlertTriangle, Flame, Info, CheckCircle2 } from 'lucide-react';

interface Props {
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  score?: number;
  explanation?: string;
  isEmergency?: boolean;
  emergencyTrigger?: string;
  isOverridden?: boolean;
  overrideReason?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const PriorityExplanationBadge: React.FC<Props> = ({
  priority,
  score,
  explanation,
  isEmergency,
  emergencyTrigger,
  isOverridden,
  overrideReason,
  size = 'md',
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const getColors = () => {
    switch (priority) {
      case 'Critical':
        return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300';
      case 'High':
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300';
      case 'Medium':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300';
      case 'Low':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  const badgeSize =
    size === 'sm'
      ? 'text-xs px-2 py-0.5'
      : size === 'lg'
      ? 'text-sm px-3.5 py-1.5'
      : 'text-xs px-2.5 py-1';

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`inline-flex items-center gap-1.5 font-semibold rounded-full border transition-all cursor-pointer shadow-xs ${getColors()} ${badgeSize} ${
          isEmergency ? 'ring-2 ring-rose-500 animate-emergency' : ''
        }`}
        title="Click to view explainable priority breakdown"
      >
        {isEmergency ? (
          <Flame className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
        ) : priority === 'Critical' ? (
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
        ) : null}
        <span>{priority}</span>
        {score !== undefined && (
          <span className="opacity-80 font-mono text-[10px] bg-black/10 px-1 py-0.2 rounded-sm">
            {score}/100
          </span>
        )}
        {isOverridden && (
          <span className="text-[10px] uppercase tracking-wider bg-purple-200 text-purple-900 px-1 rounded-xs font-bold">
            Override
          </span>
        )}
      </button>

      {showTooltip && explanation && (
        <div
          className="absolute z-50 bottom-full left-0 mb-2 w-80 p-3 bg-slate-900 text-slate-100 text-xs rounded-xl shadow-2xl border border-slate-700 pointer-events-none transition-opacity duration-150"
        >
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
            <span className="font-semibold text-slate-200 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-blue-400" /> Explainable Priority Engine
            </span>
            <span className="font-mono text-emerald-400 font-bold">{score}/100 pts</span>
          </div>

          {isEmergency && (
            <div className="mb-2 p-2 rounded-lg bg-rose-950/80 border border-rose-700 text-rose-200">
              <span className="font-bold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-rose-400" /> Life-Safety Emergency Alert
              </span>
              <p className="mt-0.5 text-[11px] leading-relaxed">
                Triggered via hazard detection: <span className="underline font-semibold">{emergencyTrigger || 'Critical safety score'}</span>. Immediate response required.
              </p>
            </div>
          )}

          {isOverridden && (
            <div className="mb-2 p-1.5 rounded-lg bg-purple-950/80 border border-purple-700 text-purple-200 text-[11px]">
              <span className="font-bold">Manual Manager Override</span>
              <p className="mt-0.5 italic">"{overrideReason}"</p>
            </div>
          )}

          <p className="text-slate-300 leading-relaxed text-[11px]">{explanation}</p>
        </div>
      )}
    </div>
  );
};
