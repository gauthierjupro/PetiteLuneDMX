import { describe, expect, it, vi } from 'vitest';
import { runCueChannelFade } from './cueFade';

describe('runCueChannelFade', () => {
  it('applies target instantly when fadeMs is 0', async () => {
    const updates: number[] = [];
    runCueChannelFade({
      startChannels: [0, 100],
      targetChannels: [50, 100],
      fadeMs: 0,
      updateChannel: (i, v) => {
        updates.push(v);
        return Promise.resolve();
      },
      isCancelled: () => false,
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(updates).toEqual([50]);
  });

  it('respects cancellation', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    let cancelled = false;
    runCueChannelFade({
      startChannels: [0],
      targetChannels: [255],
      fadeMs: 500,
      stepMs: 50,
      updateChannel: update,
      isCancelled: () => cancelled,
    });
    cancelled = true;
    await new Promise((r) => setTimeout(r, 120));
    expect(update.mock.calls.length).toBeLessThan(15);
  });
});
