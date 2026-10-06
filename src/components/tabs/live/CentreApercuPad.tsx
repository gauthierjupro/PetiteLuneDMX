import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link2 } from 'lucide-react';
import { Tooltip } from '../../ui/Tooltip';
import { LYRE_POSITION_RING_CLASS } from '../../../utils/fixedPositionDotVisual';
import { readLogicalPanTiltFromChannels } from '../../../utils/groupPositionFixtures';
import type { CalibrationSettings, Fixture } from '../../../types';

export type CentreApercuDot = { pan: number; tilt: number; index: number };

export interface CentreApercuPadProps {
  size?: number;
  movingHeadIds: number[];
  fixtures: Fixture[];
  channels: number[];
  fixtureCalibration: Record<number, CalibrationSettings>;
  linked: boolean;
  onLinkedChange: (linked: boolean) => void;
  groupPan: number;
  groupTilt: number;
  onMoveLinked: (pan: number, tilt: number) => void;
  onMoveFixture: (fixtureId: number, pan: number, tilt: number) => void;
  /** Centre de forme par lyre (même ordre que movingHeadIds). */
  perHeadMovementCenters?: { pan: number; tilt: number }[];
  /** Points d’effet en cours (mouvement actif). */
  motionPreviewDots?: CentreApercuDot[];
  title?: boolean;
  /** Afficher le bouton Lié dans l’en-tête (réglage déplacé dans « Réglages du mouvement »). */
  showCenterLinkToggle?: boolean;
}

function clamp255(n: number): number {
  return Math.min(255, Math.max(0, Math.round(n)));
}

export function CentreApercuPad({
  size = 360,
  movingHeadIds,
  fixtures,
  channels,
  fixtureCalibration,
  linked,
  onLinkedChange,
  groupPan,
  groupTilt,
  onMoveLinked,
  onMoveFixture,
  perHeadMovementCenters,
  motionPreviewDots = [],
  title = true,
  showCenterLinkToggle = false,
}: CentreApercuPadProps) {
  const padRef = useRef<HTMLDivElement>(null);
  const [dragTarget, setDragTarget] = useState<number | 'linked' | null>(null);

  const livePositions = movingHeadIds.map((id, index) => {
    const f = fixtures.find((fx) => fx.id === id);
    if (!f) return { id, pan: groupPan, tilt: groupTilt, index };
    const pt = readLogicalPanTiltFromChannels(f, channels, fixtureCalibration[id]);
    return { id, pan: pt.x, tilt: pt.y, index };
  });

  const posFromEvent = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      if (!padRef.current) return null;
      const rect = padRef.current.getBoundingClientRect();
      return {
        pan: clamp255(((e.clientX - rect.left) / rect.width) * 255),
        tilt: clamp255(((e.clientY - rect.top) / rect.height) * 255),
      };
    },
    []
  );

  const applyMove = useCallback(
    (target: number | 'linked', pan: number, tilt: number) => {
      if (target === 'linked') {
        onMoveLinked(pan, tilt);
      } else {
        onMoveFixture(target, pan, tilt);
      }
    },
    [onMoveFixture, onMoveLinked]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      if (dragTarget === null) return;
      const pos = posFromEvent(e);
      if (!pos) return;
      applyMove(dragTarget, pos.pan, pos.tilt);
    },
    [applyMove, dragTarget, posFromEvent]
  );

  useEffect(() => {
    const up = () => setDragTarget(null);
    window.addEventListener('mouseup', up);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mouseup', up);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseMove]);

  const startDrag = (e: React.MouseEvent, target: number | 'linked') => {
    e.preventDefault();
    e.stopPropagation();
    setDragTarget(target);
    const pos = posFromEvent(e);
    if (pos) applyMove(target, pos.pan, pos.tilt);
  };

  const multi = movingHeadIds.length >= 2;
  const showMotion = motionPreviewDots.length > 0;

  const movementCenterHandles = movingHeadIds.map((id, index) => {
    const stored = perHeadMovementCenters?.[index];
    if (stored) {
      return { id, pan: stored.pan, tilt: stored.tilt, index };
    }
    const live = livePositions.find((p) => p.id === id);
    return {
      id,
      pan: live?.pan ?? groupPan,
      tilt: live?.tilt ?? groupTilt,
      index,
    };
  });

  return (
    <div className="flex w-full flex-col items-center gap-3">
      {title ? (
        <div className="flex w-full flex-wrap items-center justify-center gap-2 border-b border-blue-500/20 pb-1.5">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
            Centre &amp; Aperçu
          </p>
          {multi && showCenterLinkToggle ? (
            <Tooltip text="Lié : un centre de forme commun. Désactivé : un centre de mouvement par lyre (anneaux sur le pad).">
              <button
                type="button"
                onClick={() => onLinkedChange(!linked)}
                className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-[8px] font-black uppercase transition-all ${
                  linked
                    ? 'border-red-500/40 bg-red-500/20 text-red-300'
                    : 'border-white/10 text-slate-500 hover:text-slate-300'
                }`}
              >
                <Link2 className="h-2.5 w-2.5" />
                Lié
              </button>
            </Tooltip>
          ) : null}
        </div>
      ) : null}

      <div
        ref={padRef}
        className="relative cursor-crosshair overflow-hidden rounded-2xl border-2 border-white/5 bg-[#1a1c20] shadow-inner"
        style={{ width: size, height: size }}
        onMouseDown={(e) => {
          if (!multi || linked) startDrag(e, 'linked');
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        <div className="pointer-events-none absolute left-0 top-1/2 h-px w-full bg-white/5" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px bg-white/5" />

        {showMotion
          ? motionPreviewDots.map((dot) => (
              <div
                key={`motion-${dot.index}`}
                className={`pointer-events-none absolute z-30 rounded-full border border-white/50 ${
                  dot.index === 0
                    ? 'h-3.5 w-3.5 bg-cyan-400 shadow-[0_0_10px_#22d3ee]'
                    : 'h-3 w-3 bg-purple-400 shadow-[0_0_8px_#c084fc]'
                }`}
                style={{
                  left: `${(dot.pan / 255) * 100}%`,
                  top: `${(dot.tilt / 255) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            ))
          : null}

        {multi && !linked
          ? movementCenterHandles.map((p) => (
              <div
                key={`center-${p.id}`}
                role="presentation"
                onMouseDown={(e) => startDrag(e, p.id)}
                className={`absolute z-40 h-5 w-5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-[3px] bg-black/50 active:cursor-grabbing ${
                  LYRE_POSITION_RING_CLASS[p.index % LYRE_POSITION_RING_CLASS.length]
                }`}
                style={{
                  left: `${(p.pan / 255) * 100}%`,
                  top: `${(p.tilt / 255) * 100}%`,
                }}
                title={`Centre mvt — Lyre ${p.index + 1}`}
              />
            ))
          : null}
        {!showMotion && (multi ? linked : true) ? (
          <div
            className="pointer-events-none absolute z-30 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"
            style={{
              left: `${((linked ? groupPan : livePositions[0]?.pan ?? groupPan) / 255) * 100}%`,
              top: `${((linked ? groupTilt : livePositions[0]?.tilt ?? groupTilt) / 255) * 100}%`,
            }}
          />
        ) : null}
        {showMotion && linked && multi ? (
          <div
            className="pointer-events-none absolute z-20 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40 bg-red-500/40"
            style={{
              left: `${(groupPan / 255) * 100}%`,
              top: `${(groupTilt / 255) * 100}%`,
            }}
            title="Centre de la forme"
          />
        ) : null}
      </div>
    </div>
  );
}
