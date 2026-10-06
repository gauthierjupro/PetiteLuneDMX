import React, { useState } from 'react';
import { ChevronDown, Keyboard } from 'lucide-react';

function ShortcutsList({ beginnerMode }: { beginnerMode: boolean }) {
  return (
    <ul className="space-y-1 text-[10px] text-slate-500">
      <li>
        <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-cyan-400/90">B</kbd>{' '}
        — Blackout (tout éteindre)
      </li>
      {!beginnerMode && (
        <>
          <li>
            <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-cyan-400/90">T</kbd>{' '}
            — Tap tempo
          </li>
          <li>
            <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-cyan-400/90">
              Entrée
            </kbd>{' '}
            — Enchaînement suivant (cues)
          </li>
        </>
      )}
      <li>
        <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-cyan-400/90">
          Ctrl+Z
        </kbd>{' '}
        — Annuler dernière scène rappelée
      </li>
      {!beginnerMode && (
        <li className="pt-1 text-slate-600">
          Détail : doc <span className="font-mono">KEYBOARD.md</span> dans le projet.
        </li>
      )}
      {beginnerMode && (
        <li className="pt-1 text-slate-600">
          Mode Débutant — passez en « Régie » dans Réglages pour les cues et le rythme avancé.
        </li>
      )}
    </ul>
  );
}

export function LiveManualShortcutsHelp({
  defaultOpen = false,
  beginnerMode = false,
  variant = 'panel',
}: {
  defaultOpen?: boolean;
  beginnerMode?: boolean;
  /** `compact` = bouton dans la barre Master (popover). */
  variant?: 'panel' | 'compact';
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (variant === 'compact') {
    return (
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
            open
              ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
              : 'border-white/10 bg-slate-900/60 text-slate-400 hover:border-white/20 hover:text-slate-200'
          }`}
          aria-expanded={open}
        >
          <Keyboard className="h-3.5 w-3.5 text-cyan-500/80 shrink-0" />
          <span className="hidden sm:inline">Raccourcis</span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
        {open && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-[90] cursor-default"
              aria-label="Fermer"
              onClick={() => setOpen(false)}
            />
            <div className="absolute right-0 top-full z-[91] mt-1.5 w-[min(280px,calc(100vw-2rem))] rounded-xl border border-white/10 bg-[#0d0f14] shadow-2xl px-3 py-2.5">
              <ShortcutsList beginnerMode={beginnerMode} />
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/5 bg-slate-900/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-white/[0.03] transition-colors"
      >
        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <Keyboard className="h-3.5 w-3.5 text-cyan-500/80" />
          Raccourcis clavier
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="border-t border-white/5 px-3 py-2">
          <ShortcutsList beginnerMode={beginnerMode} />
        </div>
      )}
    </div>
  );
}
