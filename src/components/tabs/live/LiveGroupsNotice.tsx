import React from 'react';
import { AlertCircle, Users } from 'lucide-react';
import type { Group } from '../../../types';

export function LiveGroupsNotice({
  unassigned,
  emptyGroups,
  onGoToPatch,
}: {
  unassigned: Group[];
  emptyGroups: Group[];
  onGoToPatch?: () => void;
}) {
  if (unassigned.length === 0 && emptyGroups.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 space-y-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-amber-400/90 flex items-center gap-2">
        <AlertCircle className="h-3.5 w-3.5" />
        Groupes Patch non visibles ici
      </p>
      {unassigned.length > 0 && (
        <p className="text-[11px] text-slate-400 leading-relaxed">
          <span className="text-slate-300">{unassigned.map((g) => g.name).join(', ')}</span>
          {' — '}
          cochez « Spéciaux » pour un groupe Divers (laser, gradateur…), « Ambiance » pour PAR /
          Xtrem, ou « Mouvement » pour lyres. Les lyres orphelines apparaissent seules en Mouvements ;
          un laser seul apparaît en Spéciaux sans case cochée.
        </p>
      )}
      {emptyGroups.length > 0 && (
        <p className="text-[11px] text-slate-500 flex items-start gap-2">
          <Users className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-600" />
          <span>
            Groupes vides :{' '}
            <span className="text-slate-400">{emptyGroups.map((g) => g.name).join(', ')}</span>
            {' — '}
            assignez des projecteurs dans Patch & DMX → Groupes.
          </span>
        </p>
      )}
      {onGoToPatch && (
        <button
          type="button"
          onClick={onGoToPatch}
          className="text-[10px] font-black uppercase text-amber-300/90 hover:text-amber-200"
        >
          Ouvrir Patch & DMX → Groupes
        </button>
      )}
    </div>
  );
}
