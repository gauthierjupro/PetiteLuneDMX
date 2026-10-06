import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export function LiveDmxConnectionBanner({
  port,
  connectionError,
  onReconnect,
}: {
  port: string;
  connectionError: string | null;
  onReconnect: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2.5"
    >
      <div className="flex items-start gap-2 min-w-0">
        <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-wide text-red-300">
            Pas de sortie DMX
          </p>
          <p className="text-[10px] text-red-200/80 leading-snug">
            Port {port || '—'}
            {connectionError ? ` · ${connectionError}` : ' · vérifiez le câble USB et le port dans Réglages.'}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onReconnect}
        className="flex shrink-0 items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-200 hover:bg-red-500/25 transition-colors"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Reconnecter
      </button>
    </div>
  );
}
