import React from 'react';
import { Sparkles, X } from 'lucide-react';

const STORAGE_KEY = 'pldmx_live_beginner_banner_dismissed';

export function LiveBeginnerBanner({
  onOpenAutoLive,
}: {
  onOpenAutoLive?: () => void;
}) {
  const [visible, setVisible] = React.useState(
    () => localStorage.getItem(STORAGE_KEY) !== '1'
  );

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 relative">
      <button
        type="button"
        onClick={dismiss}
        className="absolute top-2 right-2 p-1 text-slate-500 hover:text-white"
        aria-label="Fermer"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex gap-3 pr-6">
        <Sparkles className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-2 text-[11px] text-slate-300 leading-relaxed">
          <p className="font-black uppercase tracking-widest text-cyan-300 text-[10px]">
            Débuter en 3 gestes
          </p>
          <ol className="list-decimal list-inside space-y-1 text-slate-400">
            <li>
              <span className="text-slate-300">Master</span> — montez ou baissez la force globale
              (ou <span className="font-mono text-rose-400">Blackout</span> pour tout éteindre).
            </li>
            <li>
              <span className="text-slate-300">Scènes 1–8</span> — un clic rappelle un look ; bouton{' '}
              <span className="text-slate-300">Enregistrer</span> pour mémoriser l’instant présent.
            </li>
            <li>
              {onOpenAutoLive ? (
                <>
                  <button
                    type="button"
                    onClick={onOpenAutoLive}
                    className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300"
                  >
                    Auto Live
                  </button>
                  {' '}
                  — laissez la musique animer les lumières (recommandé en soirée).
                </>
              ) : (
                <>Onglet Auto Live — la musique peut piloter les lumières pour vous.</>
              )}
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export function resetLiveBeginnerBanner() {
  localStorage.removeItem(STORAGE_KEY);
}
