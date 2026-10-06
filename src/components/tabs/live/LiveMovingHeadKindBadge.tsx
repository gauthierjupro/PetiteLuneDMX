import React from 'react';
import {
  MOVING_HEAD_KIND_BADGE,
  movingHeadGroupKind,
  type MovingHeadGroupKind,
} from '../../../utils/liveMovingHeadGroupKind';
import type { Fixture, Group } from '../../../types';

const TONE_CLASS = {
  blue: 'bg-blue-500/20 text-blue-300 border-blue-500/35',
  orange: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  slate: 'bg-slate-700/50 text-slate-400 border-white/10',
} as const;

export function LiveMovingHeadKindBadge({
  group,
  fixtures,
}: {
  group: Group;
  fixtures: Fixture[];
}) {
  const kind: MovingHeadGroupKind = movingHeadGroupKind(group, fixtures);
  if (kind === 'generic') return null;

  const meta = MOVING_HEAD_KIND_BADGE[kind];
  return (
    <span
      title={meta.title}
      className={`px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded border shrink-0 ${TONE_CLASS[meta.tone]}`}
    >
      {meta.label}
    </span>
  );
}
