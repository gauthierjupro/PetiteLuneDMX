import { fadeStepCount, lerpByte } from './ambiancePresetFade';

export type CueFadeUpdate = (channelIndex: number, value: number) => void | Promise<void>;

/** Interpolation univers DMX → valeurs cible (fadeMs, steps à stepMs). */
export function runCueChannelFade(params: {
  startChannels: number[];
  targetChannels: number[];
  fadeMs: number;
  stepMs?: number;
  updateChannel: CueFadeUpdate;
  isCancelled: () => boolean;
  onComplete?: () => void;
}): void {
  const stepMs = params.stepMs ?? 50;
  const len = Math.max(params.startChannels.length, params.targetChannels.length);
  const start = params.startChannels.slice();
  const target = params.targetChannels.slice();
  while (start.length < len) start.push(0);
  while (target.length < len) target.push(0);

  const indices: number[] = [];
  for (let i = 0; i < len; i++) {
    if (start[i] !== target[i]) indices.push(i);
  }

  const applyInstant = async () => {
    for (const i of indices) {
      if (params.isCancelled()) return;
      await params.updateChannel(i, target[i]);
    }
    if (!params.isCancelled()) params.onComplete?.();
  };

  if (params.fadeMs <= 0 || indices.length === 0) {
    void applyInstant();
    return;
  }

  const fadeSeconds = params.fadeMs / 1000;
  const steps = fadeStepCount(fadeSeconds, stepMs);
  let step = 0;

  const tick = async () => {
    if (params.isCancelled()) return;
    step += 1;
    const t = Math.min(1, step / steps);

    await Promise.all(
      indices.map((i) => params.updateChannel(i, lerpByte(start[i], target[i], t)))
    );

    if (t >= 1) {
      params.onComplete?.();
      return;
    }
    window.setTimeout(() => void tick(), stepMs);
  };

  void tick();
}
