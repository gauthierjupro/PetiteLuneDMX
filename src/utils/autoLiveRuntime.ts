/** État temps réel partagé entre useAutoLive et useLiveEngine (sound-to-light). */
export interface AutoLiveRuntime {
  enabled: boolean;
  followRhythm: boolean;
  followEnergy: boolean;
  autoColor: boolean;
  pulseUsesBass: boolean;
  colorUsesHigh: boolean;
  /** Volume composite 0–1 */
  energy: number;
  bass: number;
  mid: number;
  high: number;
  /** Phase 0–1 dans le beat courant */
  beatPhase: number;
  /** Dernière frappe kick (ms) */
  lastBeatMs: number;
}

export const DEFAULT_AUTO_LIVE_RUNTIME: AutoLiveRuntime = {
  enabled: false,
  followRhythm: false,
  followEnergy: false,
  autoColor: false,
  pulseUsesBass: true,
  colorUsesHigh: true,
  energy: 0,
  bass: 0,
  mid: 0,
  high: 0,
  beatPhase: 0,
  lastBeatMs: 0,
};

let runtime: AutoLiveRuntime = { ...DEFAULT_AUTO_LIVE_RUNTIME };

export function getAutoLiveRuntime(): AutoLiveRuntime {
  return runtime;
}

export function setAutoLiveRuntime(patch: Partial<AutoLiveRuntime>): void {
  runtime = { ...runtime, ...patch };
}

export function resetAutoLiveRuntime(): void {
  runtime = { ...DEFAULT_AUTO_LIVE_RUNTIME };
}
