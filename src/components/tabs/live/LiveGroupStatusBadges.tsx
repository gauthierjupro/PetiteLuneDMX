import React from 'react';
import type { LyreStatusBadge, LyreStatusBadgeTone } from '../../../utils/liveGroupStatusBadges';

const TONE_CLASS: Record<LyreStatusBadgeTone, string> = {
  amber:
    'bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]',
  cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.15)]',
  indigo:
    'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.15)]',
  purple:
    'bg-purple-500/20 text-purple-400 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.15)]',
};

export function LiveGroupStatusBadges({ badges }: { badges: LyreStatusBadge[] }) {
  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b) => (
        <span
          key={b.id}
          className={`px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide rounded border ${TONE_CLASS[b.tone]}`}
        >
          {b.label}
        </span>
      ))}
    </div>
  );
}
