import React from 'react';
import type { Fixture } from '../../../types';

export function LyreFixtureSelector({
  fixtures,
  fixtureIds,
  selectedId,
  onSelect,
}: {
  fixtures: Fixture[];
  fixtureIds: number[];
  selectedId: number;
  onSelect: (id: number) => void;
}) {
  const heads = fixtureIds
    .map((id) => fixtures.find((f) => f.id === id))
    .filter((f): f is Fixture => !!f && f.type === 'Moving Head');

  if (heads.length <= 1) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 mr-1">
        Lyre
      </span>
      {heads.map((f, i) => {
        const active = f.id === selectedId;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onSelect(f.id)}
            className={`px-2 py-1 rounded-lg border text-[9px] font-black uppercase transition-all active:scale-95 ${
              active
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                : 'bg-slate-900/80 border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20'
            }`}
          >
            {f.name?.trim() || `L${i + 1}`}
          </button>
        );
      })}
    </div>
  );
}
