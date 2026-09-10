import React from 'react';
import { RefreshCw } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
  port: string;
  connectionError: string | null;
  actualHz: number;
  targetHz: number;
  latencyMs: number;
  onReconnect: () => void;
}

function formatHz(hz: number): string {
  if (!Number.isFinite(hz) || hz <= 0) return '—';
  return hz >= 10 ? hz.toFixed(0) : hz.toFixed(1);
}

function formatLatency(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  return ms < 10 ? ms.toFixed(1) : ms.toFixed(0);
}

/** Badge connexion DMX : port, Hz réel, latence, dernière erreur. */
export function ConnectionStatus({
  isConnected,
  port,
  connectionError,
  actualHz,
  targetHz,
  latencyMs,
  onReconnect,
}: ConnectionStatusProps) {
  const hzLow = isConnected && actualHz > 0 && actualHz < targetHz * 0.75;
  const latencyHigh = isConnected && latencyMs > 15;

  return (
    <div className="flex flex-col items-end gap-1">
      <div
        className={`flex items-center gap-3 px-4 py-2 rounded-full border ${
          isConnected
            ? hzLow || latencyHigh
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
              : 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400'
            : 'bg-red-500/10 border-red-500/50 text-red-400'
        }`}
        title={
          isConnected
            ? `Port ${port} · cible ${targetHz} Hz · envoi ${formatLatency(latencyMs)} ms`
            : connectionError || 'Interface DMX déconnectée'
        }
      >
        <div
          className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${
            isConnected
              ? hzLow || latencyHigh
                ? 'bg-amber-400'
                : 'bg-cyan-400'
              : 'bg-red-400'
          }`}
        />

        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-black uppercase tracking-widest leading-tight">
            {isConnected ? port : `Hors ligne · ${port}`}
          </span>
          {isConnected ? (
            <span className="text-[9px] font-mono font-bold tracking-wide opacity-80 tabular-nums">
              {formatHz(actualHz)}/{targetHz} Hz · {formatLatency(latencyMs)} ms
            </span>
          ) : (
            <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">
              Reconnexion auto…
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onReconnect}
          title="Forcer la reconnexion"
          className="ml-1 p-0.5 rounded hover:bg-white/10 transition-colors shrink-0"
        >
          <RefreshCw className="w-4 h-4 hover:rotate-180 transition-transform duration-500" />
        </button>
      </div>

      {!isConnected && connectionError && (
        <span
          className="max-w-sm text-[10px] text-red-400/80 truncate text-right"
          title={connectionError}
        >
          {connectionError}
        </span>
      )}
      {isConnected && (hzLow || latencyHigh) && (
        <span className="text-[10px] text-amber-400/80">
          {hzLow && latencyHigh
            ? 'Hz bas + latence élevée'
            : hzLow
              ? 'Fréquence réelle basse'
              : 'Latence d’envoi élevée'}
        </span>
      )}
    </div>
  );
}
