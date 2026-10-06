import type { Group, LiveGroupState, RgbColor } from '../types';

export function lerpByte(from: number, to: number, t: number): number {
  return Math.round(from + (to - from) * t);
}

export function lerpRgb(from: RgbColor, to: RgbColor, t: number): RgbColor {
  return {
    r: lerpByte(from.r, to.r, t),
    g: lerpByte(from.g, to.g, t),
    b: lerpByte(from.b, to.b, t),
    v: to.v ?? from.v,
  };
}

export function lerpGroupState(from: LiveGroupState, to: LiveGroupState, t: number): LiveGroupState {
  return {
    dim: lerpByte(from.dim, to.dim, t),
    str: lerpByte(from.str, to.str, t),
    color: lerpRgb(from.color, to.color, t),
    auto: t >= 1 ? to.auto : from.auto,
    pulse: t >= 1 ? to.pulse : from.pulse,
  };
}

export function fadeStepCount(fadeSeconds: number, stepMs = 50): number {
  if (fadeSeconds <= 0) return 1;
  return Math.max(1, Math.round((fadeSeconds * 1000) / stepMs));
}

export type AmbianceFadeSend = (
  groupId: string,
  fixtureIds: number[],
  state: LiveGroupState
) => void;

/** Interpolation preset ambiance → DMX (steps à stepMs). */
export function runAmbiancePresetFade(params: {
  groups: Group[];
  startByGroup: Record<string, LiveGroupState>;
  targetByGroup: Record<string, LiveGroupState>;
  fadeSeconds: number;
  stepMs?: number;
  send: AmbianceFadeSend;
  onComplete: () => void;
  isCancelled: () => boolean;
}): void {
  const { groups, startByGroup, targetByGroup, fadeSeconds, send, onComplete, isCancelled } =
    params;
  const stepMs = params.stepMs ?? 50;
  const steps = fadeStepCount(fadeSeconds, stepMs);
  let step = 0;

  const tick = () => {
    if (isCancelled()) return;
    step += 1;
    const t = Math.min(1, step / steps);

    Object.entries(targetByGroup).forEach(([groupId, target]) => {
      const group = groups.find((g) => g.id === groupId);
      if (!group || group.fixtureIds.length === 0) return;
      const start = startByGroup[groupId] ?? target;
      const mid = lerpGroupState(start, target, t);
      send(groupId, group.fixtureIds, mid);
    });

    if (t >= 1) {
      onComplete();
      return;
    }
    window.setTimeout(tick, stepMs);
  };

  tick();
}
