import { invoke } from '@tauri-apps/api/tauri';

let lastErrorLogAt = 0;
let consecutiveErrors = 0;

/** Envoie une valeur DMX avec journalisation rate-limité (évite le spam console). */
export async function invokeUpdateDmx(
  channel: number,
  value: number,
  onError?: (message: string) => void
): Promise<boolean> {
  try {
    await invoke('update_dmx', { channel, value });
    consecutiveErrors = 0;
    return true;
  } catch (e) {
    consecutiveErrors += 1;
    const message = e instanceof Error ? e.message : String(e);
    const now = Date.now();
    if (now - lastErrorLogAt > 2000) {
      console.warn(`[DMX] update_dmx échoué (${consecutiveErrors}x):`, e);
      lastErrorLogAt = now;
      onError?.(message);
    }
    return false;
  }
}

export function resetDmxInvokeErrors() {
  consecutiveErrors = 0;
  lastErrorLogAt = 0;
}
