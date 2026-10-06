export interface FixedPositionDot {
  pan: number;
  tilt: number;
}

/** Un seul point rouge si positions identiques ; sinon une entrée par lyre. */
export function normalizeFixedPositionDots(
  dots: FixedPositionDot[]
): { dots: FixedPositionDot[]; useLinkedRedDot: boolean } {
  if (dots.length <= 1) {
    return { dots, useLinkedRedDot: true };
  }
  const first = dots[0];
  const allSame = dots.every(
    (d) => d.pan === first.pan && d.tilt === first.tilt
  );
  if (allSame) {
    return { dots: [first], useLinkedRedDot: true };
  }
  return { dots, useLinkedRedDot: false };
}

export const LYRE_POSITION_DOT_CLASS = [
  'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.95)]',
  'bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.95)]',
  'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.95)]',
  'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.95)]',
] as const;

/** Anneau centre mvt sur le pad (même code couleur que le point live). */
export const LYRE_POSITION_RING_CLASS = [
  'border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.75)]',
  'border-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.75)]',
  'border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.75)]',
  'border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.75)]',
] as const;

export const LINKED_POSITION_DOT_CLASS =
  'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.9)]';

export const CENTER_LINKED_DOT_CLASS =
  'bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)]';
