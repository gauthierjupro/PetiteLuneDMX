import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Zap, Edit2, Users, Radio } from 'lucide-react';
import type { TabType } from '../../types';

const STORAGE_KEY = 'pldmx_onboarding_done';

const STEPS = [
  {
    title: 'Patch vos machines',
    body: 'Onglet Patch & DMX → Parc : ajoutez vos projecteurs et adresses. Moniteur 512 dans le même onglet.',
    icon: Edit2,
    action: 'patch' as const,
  },
  {
    title: 'Créez des groupes',
    body: 'Patch & DMX → Groupes : regroupez les fixtures. Cochez « Ambiance » pour les PAR / washes utilisés en Live.',
    icon: Users,
    action: null,
  },
  {
    title: 'Auto Live (recommandé)',
    body: 'Onglet Auto Live : activez le pilote musical, choisissez un profil (Acoustic, Club…). Idéal si vous débutez.',
    icon: Radio,
    action: 'autoLive' as const,
  },
  {
    title: 'Scènes manuelles',
    body: 'Onglet Live : le master règle la force globale. Scènes 1–8 = looks mémorisés (bouton Enregistrer). Blackout = tout éteindre.',
    icon: Zap,
    action: 'live' as const,
  },
] as const;

interface FirstShowWizardProps {
  onGoToTab: (tab: TabType) => void;
}

export function FirstShowWizard({ onGoToTab }: FirstShowWizardProps) {
  const [open, setOpen] = useState(() => localStorage.getItem(STORAGE_KEY) !== '1');
  const [step, setStep] = useState(0);

  if (!open) return null;

  const current = STEPS[step];
  const Icon = current.icon;

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
  };

  const runAction = () => {
    if (current.action) {
      onGoToTab(current.action);
      if (current.action === 'live') finish();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
      <div className="max-w-md w-full bg-[var(--pl-surface)] border border-white/10 rounded-3xl shadow-2xl p-6 relative">
        <button
          type="button"
          onClick={finish}
          className="absolute top-4 right-4 p-1 text-slate-500 hover:text-white"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center">
            <Icon className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-cyan-500 tracking-widest">
              Premier show · {step + 1}/{STEPS.length}
            </p>
            <h2 className="text-lg font-black text-white uppercase tracking-tight">
              {current.title}
            </h2>
          </div>
        </div>

        <p className="text-sm text-slate-400 leading-relaxed mb-6">{current.body}</p>

        <div className="flex gap-2 mb-4">
          {current.action === 'patch' && (
            <button
              type="button"
              onClick={() => {
                onGoToTab('patch');
                setStep(1);
              }}
              className="flex-1 py-2.5 bg-cyan-500 text-black rounded-xl text-xs font-black uppercase"
            >
              Ouvrir Patch & DMX
            </button>
          )}
          {current.action === 'autoLive' && (
            <button
              type="button"
              onClick={() => {
                onGoToTab('autoLive');
                setStep(3);
              }}
              className="flex-1 py-2.5 bg-cyan-500 text-black rounded-xl text-xs font-black uppercase"
            >
              Ouvrir Auto Live
            </button>
          )}
          {current.action === 'live' && (
            <button
              type="button"
              onClick={runAction}
              className="flex-1 py-2.5 bg-cyan-500 text-black rounded-xl text-xs font-black uppercase"
            >
              Aller en Live
            </button>
          )}
        </div>

        <div className="flex justify-between items-center">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
            className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-500 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" /> Précédent
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1 text-[10px] font-black uppercase text-cyan-400"
            >
              Suivant <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              className="text-[10px] font-black uppercase text-slate-400 hover:text-white"
            >
              Ne plus afficher
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function resetFirstShowWizard() {
  localStorage.removeItem(STORAGE_KEY);
}
