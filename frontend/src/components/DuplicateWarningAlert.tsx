import React from 'react';
import { Copy, AlertCircle, ExternalLink, Link2 } from 'lucide-react';

interface Props {
  duplicateOfId?: string;
  duplicateOfTitle?: string;
  confidence: number;
  reason?: string;
  onViewOriginal?: (id: string) => void;
  onLinkDuplicate?: (targetId: string) => void;
  isLinked?: boolean;
}

export const DuplicateWarningAlert: React.FC<Props> = ({
  duplicateOfId,
  duplicateOfTitle,
  confidence,
  reason,
  onViewOriginal,
  onLinkDuplicate,
  isLinked = false,
}) => {
  if (!duplicateOfId) return null;

  return (
    <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/90 text-amber-900 shadow-xs mb-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-200 text-amber-800 shrink-0 mt-0.5">
          <Copy className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="font-semibold text-sm flex items-center gap-1.5 text-amber-950">
              <AlertCircle className="w-4 h-4 text-amber-700" />
              {isLinked ? 'Linked to Existing Incident' : 'Potential Duplicate Request Detected'}
            </h4>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
              {Math.round(confidence * 100)}% Match Confidence
            </span>
          </div>

          <p className="text-xs text-amber-800 mt-1 leading-relaxed">
            {reason || `Matches existing unresolved incident ${duplicateOfId}.`}
          </p>

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {onViewOriginal && (
              <button
                type="button"
                onClick={() => onViewOriginal(duplicateOfId)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Master Ticket {duplicateOfId}
              </button>
            )}

            {onLinkDuplicate && !isLinked && (
              <button
                type="button"
                onClick={() => onLinkDuplicate(duplicateOfId)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-800 hover:bg-amber-900 text-white rounded-lg transition-colors cursor-pointer"
              >
                <Link2 className="w-3.5 h-3.5" />
                Link as Related Incident
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
