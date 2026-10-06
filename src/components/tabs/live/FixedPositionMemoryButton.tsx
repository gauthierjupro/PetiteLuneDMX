import React from 'react';
import {
  CENTER_LINKED_DOT_CLASS,
  LINKED_POSITION_DOT_CLASS,
  LYRE_POSITION_DOT_CLASS,
  normalizeFixedPositionDots,
  type FixedPositionDot,
} from '../../../utils/fixedPositionDotVisual';

export type FixedPositionMemoryVariant = 'center' | 'preset';
export type { FixedPositionDot };

export interface FixedPositionMemoryButtonProps {
  /** @deprecated Prefer `dots` — premier point si seul. */
  pan?: number;
  tilt?: number;
  dots?: FixedPositionDot[];
  /** Mode « Par lyre » : une couleur par tête ; rouge si une seule cible ou positions identiques. */
  perFixtureVisual?: boolean;
  label?: string;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  active?: boolean;
  variant?: FixedPositionMemoryVariant;
  size?: 'sm' | 'md';
  className?: string;
}

const SIZES = { sm: 44, md: 52 } as const;

function dotClassForTile(
  index: number,
  variant: FixedPositionMemoryVariant,
  useLinkedRedDot: boolean,
  perFixtureVisual: boolean
): string {
  if (!perFixtureVisual || useLinkedRedDot) {
    if (variant === 'center') return CENTER_LINKED_DOT_CLASS;
    return LINKED_POSITION_DOT_CLASS;
  }
  return LYRE_POSITION_DOT_CLASS[index % LYRE_POSITION_DOT_CLASS.length];
}

export function FixedPositionMemoryButton({
  pan,
  tilt,
  dots: dotsProp,
  perFixtureVisual = false,
  label,
  onClick,
  onContextMenu,
  active = false,
  variant = 'preset',
  size = 'sm',
  className = '',
}: FixedPositionMemoryButtonProps) {
  const dim = SIZES[size];
  const rawDots: FixedPositionDot[] =
    dotsProp && dotsProp.length > 0
      ? dotsProp
      : [{ pan: pan ?? 127, tilt: tilt ?? 127 }];

  const { dots, useLinkedRedDot } = perFixtureVisual
    ? normalizeFixedPositionDots(rawDots)
    : { dots: rawDots.length > 1 && !perFixtureVisual ? [rawDots[0]] : rawDots, useLinkedRedDot: true };

  const borderActive =
    variant === 'center'
      ? 'border-white/40 ring-1 ring-white/20'
      : 'border-red-500/45 ring-1 ring-red-500/25';

  const titleParts = rawDots.map(
    (d, i) =>
      `${rawDots.length > 1 ? `L${i + 1} ` : ''}P ${Math.round(d.pan)} · T ${Math.round(d.tilt)}`
  );
  const title = label ? `${label} — ${titleParts.join(' · ')}` : titleParts.join(' · ');

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`group/tile shrink-0 rounded-lg border bg-slate-950/90 transition-all active:scale-95 hover:border-white/20 ${
        active ? borderActive : 'border-white/10'
      } ${className}`}
      style={{ width: dim, height: dim }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[7px]">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: `${dim / 4}px ${dim / 4}px`,
          }}
        />
        {dots.map((d, i) => (
          <div
            key={i}
            className={`pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40 ${dotClassForTile(
              i,
              variant,
              useLinkedRedDot,
              perFixtureVisual
            )}`}
            style={{
              left: `${(d.pan / 255) * 100}%`,
              top: `${(d.tilt / 255) * 100}%`,
            }}
          />
        ))}
        {label ? (
          <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-black/55 px-0.5 py-px text-center text-[7px] font-black uppercase tracking-tight text-slate-300 group-hover/tile:text-white">
            {label}
          </span>
        ) : null}
      </div>
    </button>
  );
}
