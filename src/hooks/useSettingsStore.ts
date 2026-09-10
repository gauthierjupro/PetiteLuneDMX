import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { ConnectionInfo } from '../types';
import { invokeUpdateDmx, resetDmxInvokeErrors } from '../utils/dmxInvoke';

const CONNECTION_POLL_MS = 500;
const DEFAULT_TARGET_HZ = 40;

function applyUniversePayload(
  universe: number[],
  setChannels: Dispatch<SetStateAction<number[]>>
) {
  if (!universe || universe.length === 0) return;
  setChannels((prev) => {
    const hasChanged = universe.some((val, i) => val !== prev[i]);
    return hasChanged ? [...universe] : prev;
  });
}

export function useSettingsStore() {
  const [channels, setChannels] = useState<number[]>(() => Array(512).fill(0));
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [blackoutOnDisconnect, setBlackoutOnDisconnect] = useState(true);
  const [selectedPort, setSelectedPort] = useState('COM3');
  const [targetHz, setTargetHz] = useState(DEFAULT_TARGET_HZ);
  const [actualHz, setActualHz] = useState(0);
  const [latencyMs, setLatencyMs] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('dmx_blackout_on_disconnect');
    if (saved === null) return;
    const enabled = saved === '1';
    setBlackoutOnDisconnect(enabled);
    invoke('set_blackout_on_disconnect', { enabled }).catch((e) => {
      console.error('Init blackout_on_disconnect échoué:', e);
    });
  }, []);

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    let connInterval: ReturnType<typeof setInterval> | undefined;
    let pollFallback: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    const refreshConnection = async () => {
      try {
        const info = await invoke<ConnectionInfo>('get_connection_info');
        if (cancelled) return;
        setIsConnected(info.connected);
        setSelectedPort(info.port);
        setBlackoutOnDisconnect(info.blackout_on_disconnect);
        setTargetHz(info.target_hz ?? DEFAULT_TARGET_HZ);
        setActualHz(info.connected ? info.actual_hz ?? 0 : 0);
        setLatencyMs(info.connected ? info.latency_ms ?? 0 : 0);
        setConnectionError(
          info.connected ? null : info.last_error || 'Interface DMX déconnectée'
        );
        if (info.connected) {
          resetDmxInvokeErrors();
        }
      } catch (e) {
        if (cancelled) return;
        console.error('Erreur status:', e);
        setIsConnected(false);
        setActualHz(0);
        setLatencyMs(0);
        setConnectionError(e instanceof Error ? e.message : String(e));
      }
    };

    const bootstrap = async () => {
      try {
        const universe = await invoke<number[]>('get_universe');
        applyUniversePayload(universe, setChannels);
      } catch (e) {
        console.warn('Snapshot univers initial indisponible:', e);
      }

      try {
        unlisten = await listen<number[]>('dmx-universe', (event) => {
          applyUniversePayload(event.payload, setChannels);
        });
      } catch (e) {
        console.warn('Écoute dmx-universe indisponible, fallback polling:', e);
        pollFallback = setInterval(async () => {
          try {
            const universe = await invoke<number[]>('get_universe');
            applyUniversePayload(universe, setChannels);
          } catch {
            /* ignore */
          }
        }, 50);
      }

      await refreshConnection();
      connInterval = setInterval(refreshConnection, CONNECTION_POLL_MS);
    };

    bootstrap();

    return () => {
      cancelled = true;
      unlisten?.();
      if (connInterval) clearInterval(connInterval);
      if (pollFallback) clearInterval(pollFallback);
    };
  }, []);

  const reportDmxError = useCallback((message: string) => {
    setConnectionError(message);
  }, []);

  const updateDmx = useCallback(
    async (ch: number, val: string | number) => {
      const rawVal = typeof val === 'string' ? parseFloat(val) : val;
      const numVal = Math.round(Math.min(255, Math.max(0, rawVal)));

      setChannels((prev) => {
        if (prev[ch] === numVal) return prev;
        const newChannels = [...prev];
        newChannels[ch] = numVal;
        return newChannels;
      });

      await invokeUpdateDmx(ch + 1, numVal, reportDmxError);
    },
    [reportDmxError]
  );

  const handlePortChange = useCallback(async (newPort: string) => {
    setSelectedPort(newPort);
    try {
      await invoke('set_port', { port: newPort });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error('Changement de port échoué:', e);
      setConnectionError(message);
    }
  }, []);

  const handleForceReconnect = useCallback(async () => {
    try {
      await invoke('force_reconnect');
      setConnectionError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error('Reconnexion forcée échouée:', e);
      setConnectionError(message);
    }
  }, []);

  const handleBlackoutOnDisconnectChange = useCallback(async (enabled: boolean) => {
    setBlackoutOnDisconnect(enabled);
    try {
      await invoke('set_blackout_on_disconnect', { enabled });
      localStorage.setItem('dmx_blackout_on_disconnect', enabled ? '1' : '0');
    } catch (e) {
      console.error('Réglage blackout_on_disconnect échoué:', e);
    }
  }, []);

  return {
    channels,
    setChannels,
    isConnected,
    connectionError,
    blackoutOnDisconnect,
    selectedPort,
    targetHz,
    actualHz,
    latencyMs,
    reportDmxError,
    updateDmx,
    handlePortChange,
    handleForceReconnect,
    handleBlackoutOnDisconnectChange,
  };
}

export type SettingsStore = ReturnType<typeof useSettingsStore>;
