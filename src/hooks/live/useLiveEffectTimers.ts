import React from 'react';
import { hslToRgb } from '../../utils/colorUtils';
import type { GroupControlAction, RgbColor } from '../../types';

interface UseLiveEffectTimersParams {
  bpm: number;
  masterDimmer: number;
  isAutoColorActive: boolean;
  isPulseActive: boolean;
  handleGlobalAction: (action: GroupControlAction, value: number | RgbColor) => void;
  setCurrentMasterIntensity: React.Dispatch<React.SetStateAction<number>>;
}

/** Timers Live : auto-color global + pulse master. */
export function useLiveEffectTimers({
  bpm,
  masterDimmer,
  isAutoColorActive,
  isPulseActive,
  handleGlobalAction,
  setCurrentMasterIntensity,
}: UseLiveEffectTimersParams) {
  const autoColorHueRef = React.useRef(0);
  const pulseIntensityRef = React.useRef(255);

  React.useEffect(() => {
    if (!isAutoColorActive) return;
    const interval = setInterval(() => {
      autoColorHueRef.current = (autoColorHueRef.current + 5) % 360;
      const { r, g, b } = hslToRgb(autoColorHueRef.current, 100, 50);
      handleGlobalAction('color', { r, g, b });
    }, 100);
    return () => clearInterval(interval);
  }, [isAutoColorActive, handleGlobalAction]);

  React.useEffect(() => {
    if (!isPulseActive) {
      setCurrentMasterIntensity(masterDimmer);
      return;
    }
    const startTime = Date.now();
    const beatDuration = (60 / bpm) * 1000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = (elapsed % beatDuration) / beatDuration;
      const decay = Math.pow(1 - progress, 2);
      const currentIntensity = Math.round(masterDimmer * decay);
      if (currentIntensity !== pulseIntensityRef.current) {
        pulseIntensityRef.current = currentIntensity;
        setCurrentMasterIntensity(currentIntensity);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [isPulseActive, bpm, masterDimmer, setCurrentMasterIntensity]);
}
