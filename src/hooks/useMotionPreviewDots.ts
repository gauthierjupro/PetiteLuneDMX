import { useEffect, useRef, useState } from 'react';
import type { GroupMovement } from '../types';
import {
  computeGroupMotionPreviewDots,
  type MotionPreviewDot,
} from '../utils/motionShapePreview';

function centersKey(centers: { pan: number; tilt: number }[]): string {
  return centers.map((c) => `${c.pan},${c.tilt}`).join('|');
}

export function useMotionPreviewDots(
  config: GroupMovement | undefined,
  centers: { pan: number; tilt: number }[],
  fixtureCount: number,
  enabled: boolean
): MotionPreviewDot[] {
  const [dots, setDots] = useState<MotionPreviewDot[]>([]);
  const centersRef = useRef(centers);
  centersRef.current = centers;
  const key = centersKey(centers);

  useEffect(() => {
    if (!enabled || !config || config.shape === 'none' || fixtureCount <= 0) {
      setDots([]);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setDots(
        computeGroupMotionPreviewDots(
          config,
          centersRef.current,
          fixtureCount,
          elapsed
        )
      );
    }, 40);

    return () => clearInterval(interval);
  }, [enabled, config, fixtureCount, key]);

  return dots;
}
