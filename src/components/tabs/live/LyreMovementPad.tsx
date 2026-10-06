import React from 'react';
import { XYPad } from '../../ui/XYPad';
import { useMotionPreviewDots } from '../../../hooks/useMotionPreviewDots';
import { LYRE_POSITION_DOT_CLASS } from '../../../utils/fixedPositionDotVisual';
import type { GroupMovement } from '../../../types';

const PAD_SIZE = 140;

export type LyreLiveDot = { pan: number; tilt: number };

export function LyreMovementPad({
  centerPan,
  centerTilt,
  config,
  movingHeadCount,
  fixtureLiveDots,
  onPanTiltChange,
}: {
  centerPan: number;
  centerTilt: number;
  config: GroupMovement | undefined;
  movingHeadCount: number;
  /** Positions live par lyre (mode par tête) — affichées sur le pad quand pas d’effet. */
  fixtureLiveDots?: LyreLiveDot[];
  onPanTiltChange: (pan: number, tilt: number) => void;
}) {
  const movement = config ?? {
    shape: 'none' as const,
    speed: 128,
    sizePan: 64,
    sizeTilt: 64,
    fan: 0,
    invert180: false,
  };

  const motionActive = movement.shape !== 'none';
  const centers = Array.from({ length: movingHeadCount }, () => ({
    pan: centerPan,
    tilt: centerTilt,
  }));
  const previewDots = useMotionPreviewDots(
    movement,
    centers,
    movingHeadCount,
    motionActive
  );

  const liveDots =
    !motionActive && fixtureLiveDots && fixtureLiveDots.length > 0
      ? fixtureLiveDots
      : null;

  return (
    <div className="relative w-fit shrink-0">
      <XYPad x={centerPan} y={centerTilt} onChange={onPanTiltChange} size={PAD_SIZE} />
      {liveDots
        ? liveDots.map((dot, index) => (
            <div
              key={index}
              className={`absolute pointer-events-none rounded-full border border-white/50 transition-all duration-75 z-20 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 ${
                LYRE_POSITION_DOT_CLASS[index % LYRE_POSITION_DOT_CLASS.length]
              }`}
              style={{
                left: `${(dot.pan / 255) * PAD_SIZE}px`,
                top: `${(dot.tilt / 255) * PAD_SIZE}px`,
              }}
              title={`Lyre ${index + 1}`}
            />
          ))
        : previewDots.map((dot) => (
            <div
              key={dot.index}
              className={`absolute pointer-events-none rounded-full border border-white/50 transition-all duration-75 z-20 ${
                dot.index === 0
                  ? 'w-3 h-3 bg-cyan-400 shadow-[0_0_10px_#22d3ee]'
                  : 'w-2.5 h-2.5 bg-purple-400 shadow-[0_0_8px_#c084fc]'
              }`}
              style={{
                left: `${(dot.pan / 255) * PAD_SIZE}px`,
                top: `${(dot.tilt / 255) * PAD_SIZE}px`,
                transform: 'translate(-50%, -50%)',
              }}
              title={`Lyre ${dot.index + 1}`}
            />
          ))}
    </div>
  );
}
