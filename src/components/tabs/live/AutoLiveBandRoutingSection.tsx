import React from 'react';
import { Radio } from 'lucide-react';
import type { AutoLiveBandRouting } from '../../../types/autoLive';

const ROLES: {
  key: keyof Pick<
    AutoLiveBandRouting,
    'pulseUsesBass' | 'movementUsesMid' | 'colorUsesHigh' | 'accentsUseBassPeaks'
  >;
  label: string;
  hint: string;
}[] = [
  {
    key: 'pulseUsesBass',
    label: 'Pulse PAR / ambiance',
    hint: 'Basses + beat (sinon pulse BPM seul)',
  },
  {
    key: 'movementUsesMid',
    label: 'Vitesse lyres',
    hint: 'Médiums (build / drop)',
  },
  {
    key: 'colorUsesHigh',
    label: 'Défilement couleurs',
    hint: 'Aiguës = plus vif',
  },
  {
    key: 'accentsUseBassPeaks',
    label: 'Accents strobe',
    hint: 'Pics basse uniquement',
  },
];

export function AutoLiveBandRoutingSection({
  routing,
  onChange,
}: {
  routing: AutoLiveBandRouting;
  onChange: (patch: Partial<AutoLiveBandRouting>) => void;
}) {
  return (
    <div className="p-3 rounded-2xl border border-white/10 bg-[#111317] space-y-3">
      <div>
        <h3 className="text-[11px] font-black uppercase tracking-widest text-violet-400 flex items-center gap-2">
          <Radio className="w-4 h-4" />
          Bandes → rôles
        </h3>
        <p className="text-[9px] text-slate-500 mt-1 font-medium">
          Comme une console auto : quelle fréquence pilote master, pulse, lyres et couleur.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-[9px] font-black uppercase text-slate-500">Mix master (follow énergie)</p>
        {(
          [
            { key: 'masterBass' as const, label: 'Basses', color: 'text-fuchsia-400' },
            { key: 'masterMid' as const, label: 'Médiums', color: 'text-violet-400' },
            { key: 'masterHigh' as const, label: 'Aiguës', color: 'text-cyan-400' },
          ] as const
        ).map(({ key, label, color }) => (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-[9px] font-black uppercase text-slate-500">
              <span>{label}</span>
              <span className={`font-mono ${color}`}>{routing[key]}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={2}
              value={routing[key]}
              onChange={(e) => onChange({ [key]: parseInt(e.target.value, 10) })}
              className="w-full h-1 bg-slate-800 rounded-full accent-violet-500"
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ROLES.map(({ key, label, hint }) => {
          const on = routing[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ [key]: !on })}
              className={`text-left p-3 rounded-xl border transition-all ${
                on
                  ? 'border-violet-500/40 bg-violet-500/10'
                  : 'border-white/5 bg-slate-900/40 opacity-80'
              }`}
            >
              <p className="text-[10px] font-black uppercase text-slate-200">{label}</p>
              <p className="text-[8px] text-slate-500 mt-0.5">{hint}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
