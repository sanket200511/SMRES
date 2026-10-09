import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  Flame,
  Shield,
  HelpCircle,
  Copy,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { User, PriorityScoreBreakdown, DuplicateCheckResult } from '../types';
import { api } from '../api/client';
import { DuplicateWarningAlert } from './DuplicateWarningAlert';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onTicketCreated: () => void;
  currentUser: User;
  onViewTicket: (id: string) => void;
}

export const CreateTicketModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onTicketCreated,
  currentUser,
  onViewTicket,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('HVAC');
  const [building, setBuilding] = useState('Building A');
  const [location, setLocation] = useState('');
  const [floor, setFloor] = useState('');
  const [room, setRoom] = useState('');
  const [equipmentId, setEquipmentId] = useState('');

  // Priority factors (0 to 5)
  const [safetyScore, setSafetyScore] = useState(1);
  const [opsScore, setOpsScore] = useState(1);
  const [peopleScore, setPeopleScore] = useState(1);
  const [timeScore, setTimeScore] = useState(1);

  // Live preview & duplicate check states
  const [preview, setPreview] = useState<PriorityScoreBreakdown | null>(null);
  const [dupResult, setDupResult] = useState<DuplicateCheckResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Trigger live priority preview calculation whenever scores or text change
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      try {
        const payload = {
          title: title || 'Maintenance Request',
          description: description || 'Issue description',
          category,
          location: location || building,
          building,
          floor,
          room,
          equipment_id: equipmentId,
          safety_score: safetyScore,
          operational_impact_score: opsScore,
          affected_people_score: peopleScore,
          time_sensitivity_score: timeScore,
        };
        const res = await api.previewPriority(payload);
        setPreview(res);
      } catch (err) {
        console.error('Failed to preview priority', err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [title, description, category, safetyScore, opsScore, peopleScore, timeScore, isOpen]);

  // Check duplicate when user enters meaningful title or location
  useEffect(() => {
    if (!isOpen || title.trim().length < 6) {
      setDupResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const payload = {
          title,
          description: description || title,
          category,
          location: location || building,
          building,
          floor,
          room,
          equipment_id: equipmentId,
          safety_score: safetyScore,
          operational_impact_score: opsScore,
          affected_people_score: peopleScore,
          time_sensitivity_score: timeScore,
        };
        const res = await api.checkDuplicate(payload);
        if (res.is_potential_duplicate) {
          setDupResult(res);
        } else {
          setDupResult(null);
        }
      } catch (err) {
        console.error('Duplicate check error', err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [title, category, location, building, equipmentId, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !location.trim()) {
      setErrorMessage('Please fill in title, description, and specific location.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await api.createTicket(
        {
          title,
          description,
          category,
          location,
          building,
          floor,
          room,
          equipment_id: equipmentId || undefined,
          safety_score: safetyScore,
          operational_impact_score: opsScore,
          affected_people_score: peopleScore,
          time_sensitivity_score: timeScore,
          submitted_by_id: currentUser.id,
          submitted_by_name: currentUser.name,
        },
        currentUser
      );
      // Reset form
      setTitle('');
      setDescription('');
      setLocation('');
      setEquipmentId('');
      setFloor('');
      setRoom('');
      setSafetyScore(1);
      setOpsScore(1);
      setPeopleScore(1);
      setTimeScore(1);
      onTicketCreated();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    'Electrical',
    'Plumbing',
    'HVAC',
    'Structural',
    'Fire & Safety',
    'General',
  ];

  const buildings = ['Building A', 'Building B', 'Building C', 'Building D - Warehouse'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Fixed Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <h3 className="font-bold text-base text-slate-900">Create New Maintenance Request</h3>
            <p className="text-xs text-slate-500">
              Logged as <span className="font-semibold text-slate-700">{currentUser.name}</span> ({currentUser.department})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form id="create-ticket-form" onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-800 rounded-xl">
              {errorMessage}
            </div>
          )}

          {/* Potential Duplicate Banner */}
          {dupResult && (
            <DuplicateWarningAlert
              duplicateOfId={dupResult.duplicate_of_id}
              confidence={dupResult.confidence}
              reason={dupResult.reason}
              onViewOriginal={(id) => {
                onClose();
                onViewTicket(id);
              }}
            />
          )}

          {/* Title & Category */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-700">Issue Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Water leak from ceiling near room 302"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Detailed Description *</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe symptoms, safety hazards, equipment tags, or urgency factors..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Location details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Building *</label>
              <select
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                {buildings.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Specific Location *</label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Floor 3, Corridor B"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Room / Zone</label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="e.g. Lab 304"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Equipment ID (if known)</label>
              <input
                type="text"
                value={equipmentId}
                onChange={(e) => setEquipmentId(e.target.value)}
                placeholder="e.g. HVAC-CHILLER-02"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Smart Priority Engine Factor Sliders */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Smart Priority Engine Assessment (Explainable 0–5 Factors)</span>
              </div>
              <span className="text-[11px] text-slate-500">
                Formula: 8×Safety + 5×Ops + 4×People + 3×Time
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Safety */}
              <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700">Safety Hazard</span>
                  <span className="font-mono font-bold text-rose-600">{safetyScore} / 5</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={safetyScore}
                  onChange={(e) => setSafetyScore(parseInt(e.target.value))}
                  className="w-full accent-rose-600 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">Weight: 8x (0=None, 5=Severe/Immediate)</p>
              </div>

              {/* Operational Impact */}
              <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700">Operational Impact</span>
                  <span className="font-mono font-bold text-amber-600">{opsScore} / 5</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={opsScore}
                  onChange={(e) => setOpsScore(parseInt(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">Weight: 5x (0=Minor, 5=Halts Operations)</p>
              </div>

              {/* Affected People */}
              <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700">Affected People</span>
                  <span className="font-mono font-bold text-blue-600">{peopleScore} / 5</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={peopleScore}
                  onChange={(e) => setPeopleScore(parseInt(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">Weight: 4x (0=Isolated, 5=Whole Floor/Bldg)</p>
              </div>

              {/* Time Sensitivity */}
              <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700">Time Sensitivity</span>
                  <span className="font-mono font-bold text-indigo-600">{timeScore} / 5</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={timeScore}
                  onChange={(e) => setTimeScore(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">Weight: 3x (0=Flexible, 5=Immediate)</p>
              </div>
            </div>

            {/* Live Calculation Preview Banner */}
            {preview && (
              <div
                className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                  preview.is_safety_emergency
                    ? 'bg-rose-100 border-rose-300 text-rose-900'
                    : preview.recommended_priority === 'Critical'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : preview.recommended_priority === 'High'
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">Calculated Priority:</span>
                    <span className="font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/70 shadow-2xs">
                      {preview.recommended_priority}
                    </span>
                    <span className="font-mono font-bold">({preview.total_score} / 100 pts)</span>
                    {preview.is_safety_emergency && (
                      <span className="flex items-center gap-1 font-bold text-rose-700 bg-rose-200/80 px-2 py-0.5 rounded-full">
                        <Flame className="w-3.5 h-3.5 animate-bounce" /> Emergency Condition Detected
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] opacity-85">{preview.explanation}</p>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Fixed Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-ticket-form"
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Maintenance Request'}
          </button>
        </div>
      </div>
    </div>
  );
};
