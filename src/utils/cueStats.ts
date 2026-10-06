/** Nombre de canaux DMX non nuls dans un snapshot cue. */
export function countNonZeroChannels(channels: number[]): number {
  let n = 0;
  for (let i = 0; i < channels.length; i++) {
    if (channels[i] !== 0) n += 1;
  }
  return n;
}
