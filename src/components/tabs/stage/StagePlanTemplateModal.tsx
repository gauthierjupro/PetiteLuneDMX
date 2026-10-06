import React from 'react';
import { LayoutTemplate, X } from 'lucide-react';
import {
  STAGE_PLAN_TEMPLATES,
  type StagePlanTemplateId,
} from '../../../utils/stagePlanTemplates';

export function StagePlanTemplateModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (id: StagePlanTemplateId) => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-labelledby="stage-template-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d0f14] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
          <h2
            id="stage-template-title"
            className="text-sm font-black uppercase tracking-widest text-cyan-300 flex items-center gap-2"
          >
            <LayoutTemplate className="w-4 h-4" />
            Générer un plan type
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="px-4 pt-3 text-[11px] text-slate-500 leading-relaxed">
          Place automatiquement vos projecteurs du patch et les éléments scène (enceintes,
          musiciens…). Les positions actuelles seront remplacées — vous pourrez annuler avec{' '}
          <span className="text-slate-400">Ctrl+Z</span>.
        </p>
        <ul className="p-4 space-y-2 max-h-[min(420px,60vh)] overflow-y-auto custom-scrollbar">
          {STAGE_PLAN_TEMPLATES.map((tpl) => (
            <li key={tpl.id}>
              <button
                type="button"
                onClick={() => onPick(tpl.id)}
                className="w-full text-left rounded-xl border border-white/10 bg-[#111317] hover:border-cyan-500/40 hover:bg-cyan-500/5 px-4 py-3 transition-colors"
              >
                <p className="text-xs font-black uppercase text-slate-100">{tpl.label}</p>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{tpl.description}</p>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
