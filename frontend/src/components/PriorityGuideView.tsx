import React from 'react';
import {
  BookOpen,
  Calculator,
  Flame,
  ShieldAlert,
  Clock,
  Copy,
  Users,
  CheckCircle2,
} from 'lucide-react';

export const PriorityGuideView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          Priority Engine & SLA System Specification
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Complete architectural documentation of the mathematical scoring formulas, calibrated thresholds, life-safety hazard triggers, and escalation state machine.
        </p>
      </div>

      {/* Section 1: The Explainable Formula */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-blue-600" />
          1. Smart Priority Engine Formula
        </h3>

        <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed">
          score = (8 × Safety) + (5 × Operational_Impact) + (4 × Affected_People) + (3 × Time_Sensitivity)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-bold text-rose-700 block">Safety Risk (8x Weight)</span>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Assesses physical hazard to occupants. Range: 0 (No risk) to 5 (Immediate danger to life or health).
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-bold text-amber-700 block">Operational Impact (5x)</span>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Assesses impact on business continuity, servers, manufacturing, or operations. Range: 0 to 5.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-bold text-blue-700 block">Affected People (4x)</span>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Population scale: 0 (Single workstation) to 5 (Entire building or campus population).
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-bold text-indigo-700 block">Time Sensitivity (3x)</span>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Rate of degradation if left unaddressed. Range: 0 (Routine) to 5 (Compounding damage per minute).
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: Calibrated Thresholds & SLAs */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" />
          2. Calibrated Priority Thresholds & SLAs
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Priority Level</th>
                <th className="py-2.5 px-3">Calculated Score Range</th>
                <th className="py-2.5 px-3">SLA Target Response Window</th>
                <th className="py-2.5 px-3">Escalation Threshold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="bg-rose-50/40">
                <td className="py-2.5 px-3 font-bold text-rose-800">Critical</td>
                <td className="py-2.5 px-3 font-mono font-semibold">75 – 100 points</td>
                <td className="py-2.5 px-3 font-bold text-rose-900">1.0 Hour</td>
                <td className="py-2.5 px-3 text-slate-600">Immediate Facility Lead dispatch</td>
              </tr>
              <tr className="bg-amber-50/40">
                <td className="py-2.5 px-3 font-bold text-amber-800">High</td>
                <td className="py-2.5 px-3 font-mono font-semibold">50 – 74 points</td>
                <td className="py-2.5 px-3 font-bold text-amber-900">4.0 Hours</td>
                <td className="py-2.5 px-3 text-slate-600">Auto-escalate after 4 hours</td>
              </tr>
              <tr className="bg-blue-50/40">
                <td className="py-2.5 px-3 font-bold text-blue-800">Medium</td>
                <td className="py-2.5 px-3 font-mono font-semibold">25 – 49 points</td>
                <td className="py-2.5 px-3 font-bold text-blue-900">24.0 Hours (1 Day)</td>
                <td className="py-2.5 px-3 text-slate-600">Auto-escalate after 24 hours</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-slate-700">Low</td>
                <td className="py-2.5 px-3 font-mono font-semibold">0 – 24 points</td>
                <td className="py-2.5 px-3 font-bold text-slate-800">48.0 Hours (2 Days)</td>
                <td className="py-2.5 px-3 text-slate-600">Auto-escalate after 48 hours</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Independent Emergency Trigger */}
      <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 space-y-3">
        <h3 className="font-bold text-base flex items-center gap-2 text-rose-900">
          <Flame className="w-5 h-5 text-rose-600" />
          3. Independent Life-Safety Emergency Alert
        </h3>
        <p className="text-xs leading-relaxed text-rose-900">
          Critical safety conditions (such as a suspected <strong>gas leak</strong>, <strong>electrical fire hazard</strong>, <strong>live sparking wiring</strong>, or <strong>structural collapse</strong>) independently override numerical scoring. When hazardous keywords or a maximum safety score (5/5) are detected, the system immediately flags a prominent emergency alert banner and mandates immediate dispatch.
        </p>
      </div>

      {/* Section 4: Duplicate Incident Detection */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
          <Copy className="w-4 h-4 text-blue-600" />
          4. Explainable Duplicate Incident Detection
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          The duplicate detector compares new requests against all active unresolved incidents using a composite score: Category Matching (30%), Geographic / Equipment Location (35%), and Natural Language Description Similarity (35%). Rather than silently discarding complaints, the system suggests linking the report while preserving complete user records and ticket histories.
        </p>
      </div>
    </div>
  );
};
