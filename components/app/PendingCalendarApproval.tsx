'use client';

import { useState } from 'react';
import { approveCalendar, rejectCalendar } from '@/lib/api';
import { Calendar, Check, X } from 'lucide-react';

interface CalendarEntry {
  id: string;
  title?: string;
  start_time?: string;
  end_time?: string;
  [key: string]: unknown;
}

interface PendingCalendarApprovalProps {
  entries: CalendarEntry[];
  onApproved?: (id: string) => void;
  onRejected?: (id: string) => void;
}

export function PendingCalendarApproval({
  entries,
  onApproved,
  onRejected,
}: PendingCalendarApprovalProps) {
  const [processing, setProcessing] = useState<Record<string, 'approving' | 'rejecting' | 'done'>>({});

  if (!entries || entries.length === 0) return null;

  const handleApprove = async (id: string) => {
    setProcessing((prev) => ({ ...prev, [id]: 'approving' }));
    try {
      await approveCalendar(id);
      setProcessing((prev) => ({ ...prev, [id]: 'done' }));
      onApproved?.(id);
    } catch {
      setProcessing((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleReject = async (id: string) => {
    setProcessing((prev) => ({ ...prev, [id]: 'rejecting' }));
    try {
      await rejectCalendar(id);
      setProcessing((prev) => ({ ...prev, [id]: 'done' }));
      onRejected?.(id);
    } catch {
      setProcessing((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-secondary">
        <Calendar size={12} className="text-gold" />
        Pending Calendar Entries
      </div>
      {entries.map((entry) => {
        const state = processing[entry.id];
        if (state === 'done') return null;

        return (
          <div
            key={entry.id}
            className="flex items-center justify-between p-3 rounded-card border border-border bg-surface-card"
          >
            <div>
              <p className="text-sm text-primary">
                {entry.title || `Event ${entry.id}`}
              </p>
              {(entry.start_time || entry.end_time) && (
                <p className="text-[10px] text-muted mt-0.5">
                  {entry.start_time} {entry.end_time ? `- ${entry.end_time}` : ''}
                </p>
              )}
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => handleApprove(entry.id)}
                disabled={!!state}
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-button
                  bg-sage/15 text-sage border border-sage/30
                  hover:bg-sage/25 disabled:opacity-40 transition-colors font-medium"
              >
                <Check size={10} />
                {state === 'approving' ? 'Approving...' : 'Approve'}
              </button>
              <button
                type="button"
                onClick={() => handleReject(entry.id)}
                disabled={!!state}
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-button
                  text-muted border border-border
                  hover:bg-surface-subtle disabled:opacity-40 transition-colors"
              >
                <X size={10} />
                {state === 'rejecting' ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
