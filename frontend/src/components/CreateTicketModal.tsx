import React, { useState, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { User, DuplicateCheckResult } from '../types';
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

  // Duplicate check and submission state
  const [dupResult, setDupResult] = useState<DuplicateCheckResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Check duplicate when user enters meaningful title or location
  useEffect(() => {
    if (!isOpen || title.trim().length < 5) {
      setDupResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const payload = {
          title: title.trim(),
          description: description.trim() || title.trim(),
          category,
          location: location.trim() || building,
          building,
          floor: floor.trim() || undefined,
          room: room.trim() || undefined,
          equipment_id: equipmentId.trim() || undefined,
          safety_score: 1,
          operational_impact_score: 1,
          affected_people_score: 1,
          time_sensitivity_score: 1,
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
  }, [title, description, category, location, building, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanDesc = description.trim();
    const cleanLoc = location.trim() || building;

    if (!cleanTitle) {
      setErrorMessage('Please provide an issue title.');
      return;
    }
    if (!cleanDesc) {
      setErrorMessage('Please provide a detailed description of the maintenance issue.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    // Intelligent auto-scoring based on safety hazard keywords and category
    let autoSafety = 1;
    let autoOps = 2;
    let autoPeople = 2;
    let autoTime = 2;

    const lowerText = `${cleanTitle} ${cleanDesc}`.toLowerCase();
    if (/gas leak|odor of gas|fire|smoke|sparking|live wire|collapse|flooding|chemical spill|explosion/.test(lowerText)) {
      autoSafety = 5;
      autoOps = 4;
      autoPeople = 4;
      autoTime = 5;
    } else if (category === 'Fire & Safety') {
      autoSafety = 4;
      autoOps = 3;
      autoPeople = 3;
      autoTime = 4;
    } else if (category === 'Electrical' || category === 'HVAC') {
      autoSafety = 2;
      autoOps = 3;
      autoPeople = 2;
      autoTime = 3;
    }

    try {
      await api.createTicket(
        {
          title: cleanTitle,
          description: cleanDesc,
          category,
          location: cleanLoc,
          building,
          floor: floor.trim() || undefined,
          room: room.trim() || undefined,
          equipment_id: equipmentId.trim() || undefined,
          safety_score: autoSafety,
          operational_impact_score: autoOps,
          affected_people_score: autoPeople,
          time_sensitivity_score: autoTime,
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
      onTicketCreated();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit maintenance request');
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
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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

        <form id="create-ticket-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-medium">
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
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white cursor-pointer"
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
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe symptoms, safety hazards, equipment tags, or urgency factors..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed"
            />
          </div>

          {/* Location details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Building *</label>
              <select
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white cursor-pointer"
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
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Submit Maintenance Request</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
