import React from 'react';
import { Edit2, Users, LayoutGrid, Sliders, Zap } from 'lucide-react';

export type PatchDmxSegment = 'parc' | 'groups' | 'monitor' | 'console' | 'test';

const ITEMS: {
  id: PatchDmxSegment;
  label: string;
  short: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'parc', label: 'Parc & adresses', short: 'Parc', icon: Edit2 },
  { id: 'groups', label: 'Groupes Live', short: 'Groupes', icon: Users },
  { id: 'monitor', label: 'Moniteur 512', short: '512', icon: LayoutGrid },
  { id: 'console', label: 'Console DMX', short: 'Console', icon: Sliders },
  { id: 'test', label: 'Test appareil', short: 'Test', icon: Zap },
];

export function PatchDmxSegmentNav({
  segment,
  onChange,
}: {
  segment: PatchDmxSegment;
  onChange: (s: PatchDmxSegment) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 p-1 rounded-xl border border-white/5 bg-slate-900/50">
      {ITEMS.map(({ id, label, short, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          title={label}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
            segment === id
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-500 hover:text-slate-300 border border-transparent'
          }`}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">{label}</span>
          <span className="sm:hidden">{short}</span>
        </button>
      ))}
    </div>
  );
}
