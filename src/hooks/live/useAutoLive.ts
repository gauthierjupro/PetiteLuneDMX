import React from 'react';
import type { AudioStats } from '../useAudioAnalyzer';
import type { AutoLiveOptions, AutoLiveState } from '../../types/autoLive';
import type { AmbiancePreset, Fixture, Group, GroupMovement } from '../../types';
import {
  ambiancePresetHasData,
  energyTierFromLevel,
  presetSlotForTier,
} from '../../utils/autoLiveEnergyLooks';
import type { AutoLiveEnergyTier } from '../../utils/autoLiveEnergyLooks';
import {
  averageEnergy,
  beatPhaseFromClock,
  weightedCompositeEnergy,
  energyMasterDimmer,
  energyTrend,
  isSilent,
  movementSpeedForEnergy,
  pickFreshShape,
  pushEnergySample,
} from '../../utils/autoLiveSignals';
import {
  colorGroupIdsForAutoLive,
  groupHasMovingHead,
  movementGroupIdsForAutoLive,
  pulseGroupIdsForAutoLive,
} from '../../utils/autoLiveGroups';
import { resetAutoLiveRuntime, setAutoLiveRuntime } from '../../utils/autoLiveRuntime';
import { saveAutoLiveState } from '../../utils/autoLiveConfig';

export interface AutoLiveSnapshot {
  linkedGroups: string[];
  groupPulseActive: Record<string, boolean>;
  groupAutoColorActive: Record<string, boolean>;
  groupAutoGoboActive: Record<string, boolean>;
  groupMovements: Record<string, GroupMovement>;
  isAmbiancePulseActive: boolean;
  isAmbianceAutoColorActive: boolean;
  masterDimmer: number;
}

interface UseAutoLiveParams {
  state: AutoLiveState;
  setState: React.Dispatch<React.SetStateAction<AutoLiveState>>;
  groups: Group[];
  fixtures: Fixture[];
  audioStats: AudioStats;
  bpm: number;
  masterDimmer: number;
  handleMasterDimmer: (val: number) => void;
  handleGlobalAction: (
    action: 'dimmer' | 'color' | 'strobe',
    value: number | { r: number; g: number; b: number }
  ) => void;
  linkedGroups: string[];
  setLinkedGroups: React.Dispatch<React.SetStateAction<string[]>>;
  groupPulseActive: Record<string, boolean>;
  setGroupPulseActive: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  groupAutoColorActive: Record<string, boolean>;
  setGroupAutoColorActive: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  groupAutoGoboActive: Record<string, boolean>;
  setGroupAutoGoboActive: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  groupMovements: Record<string, GroupMovement>;
  setGroupMovements: React.Dispatch<React.SetStateAction<Record<string, GroupMovement>>>;
  isAmbiancePulseActive: boolean;
  setIsAmbiancePulseActive: React.Dispatch<React.SetStateAction<boolean>>;
  isAmbianceAutoColorActive: boolean;
  setIsAmbianceAutoColorActive: React.Dispatch<React.SetStateAction<boolean>>;
  setIsAudioActive: (v: boolean) => void;
  customPresets: Record<string, AmbiancePreset>;
  applyAmbiancePreset: (presetId: string, opts?: { fadeSeconds?: number }) => void;
  fadeTimeSeconds: number;
}

function applyManagedPulse(
  pulseIds: string[],
  on: boolean,
  setIsAmbiancePulseActive: React.Dispatch<React.SetStateAction<boolean>>,
  setGroupPulseActive: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
) {
  setIsAmbiancePulseActive(on && pulseIds.length > 0);
  setGroupPulseActive((prev) => {
    const next = { ...prev };
    pulseIds.forEach((id) => {
      next[id] = on;
    });
    return next;
  });
}

function applyManagedColor(
  colorIds: string[],
  on: boolean,
  setIsAmbianceAutoColorActive: React.Dispatch<React.SetStateAction<boolean>>,
  setGroupAutoColorActive: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
) {
  setIsAmbianceAutoColorActive(on && colorIds.length > 0);
  setGroupAutoColorActive((prev) => {
    const next = { ...prev };
    colorIds.forEach((id) => {
      next[id] = on;
    });
    return next;
  });
}

function applyAutoLiveBootstrap(
  groups: Group[],
  fixtures: Fixture[],
  options: AutoLiveOptions,
  linkedGroups: string[],
  setLinkedGroups: React.Dispatch<React.SetStateAction<string[]>>,
  setGroupPulseActive: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
  setGroupAutoColorActive: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
  setIsAmbiancePulseActive: React.Dispatch<React.SetStateAction<boolean>>,
  setIsAmbianceAutoColorActive: React.Dispatch<React.SetStateAction<boolean>>,
  setGroupMovements: React.Dispatch<React.SetStateAction<Record<string, GroupMovement>>>
): { pulseIds: string[]; colorIds: string[] } {
  const pulseIds = pulseGroupIdsForAutoLive(groups, fixtures);
  const colorIds = colorGroupIdsForAutoLive(groups, fixtures);
  const movementIds = movementGroupIdsForAutoLive(groups, fixtures);

  const ambianceIds = groups
    .filter((g) => g.isAmbiance && g.fixtureIds.length)
    .map((g) => g.id);
  if (ambianceIds.length && linkedGroups.length === 0) {
    setLinkedGroups(ambianceIds);
  }

  applyManagedPulse(
    pulseIds,
    options.followRhythm,
    setIsAmbiancePulseActive,
    setGroupPulseActive
  );
  applyManagedColor(
    colorIds,
    options.autoColor,
    setIsAmbianceAutoColorActive,
    setGroupAutoColorActive
  );

  if (movementIds.length > 0) {
    setGroupMovements((prev) => {
      const next = { ...prev };
      movementIds.forEach((groupId) => {
        const g = groups.find((x) => x.id === groupId);
        if (!g || !groupHasMovingHead(g, fixtures)) return;
        const current = next[groupId] ?? {
          shape: 'none' as const,
          speed: 40,
          sizePan: 128,
          sizeTilt: 128,
          fan: 0,
          invert180: false,
        };
        if (current.shape === 'none') {
          next[groupId] = { ...current, shape: 'circle', speed: 45 };
        }
      });
      return next;
    });
  }

  return { pulseIds, colorIds };
}

function restoreSnapshot(
  snap: AutoLiveSnapshot,
  setLinkedGroups: React.Dispatch<React.SetStateAction<string[]>>,
  setGroupPulseActive: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
  setGroupAutoColorActive: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
  setGroupAutoGoboActive: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
  setGroupMovements: React.Dispatch<React.SetStateAction<Record<string, GroupMovement>>>,
  setIsAmbiancePulseActive: React.Dispatch<React.SetStateAction<boolean>>,
  setIsAmbianceAutoColorActive: React.Dispatch<React.SetStateAction<boolean>>,
  handleMasterDimmer: (val: number) => void
) {
  setLinkedGroups(snap.linkedGroups);
  setGroupPulseActive(snap.groupPulseActive);
  setGroupAutoColorActive(snap.groupAutoColorActive);
  setGroupAutoGoboActive(snap.groupAutoGoboActive);
  setGroupMovements(snap.groupMovements);
  setIsAmbiancePulseActive(snap.isAmbiancePulseActive);
  setIsAmbianceAutoColorActive(snap.isAmbianceAutoColorActive);
  handleMasterDimmer(snap.masterDimmer);
}

/** Pilote le Live à partir de l’audio et des options Auto Live. */
export function useAutoLive(params: UseAutoLiveParams) {
  const {
    state,
    setState,
    groups,
    fixtures,
    audioStats,
    bpm,
    masterDimmer,
    handleMasterDimmer,
    handleGlobalAction,
    linkedGroups,
    setLinkedGroups,
    groupPulseActive,
    setGroupPulseActive,
    groupAutoColorActive,
    setGroupAutoColorActive,
    groupAutoGoboActive,
    setGroupAutoGoboActive,
    groupMovements,
    setGroupMovements,
    isAmbiancePulseActive,
    setIsAmbiancePulseActive,
    isAmbianceAutoColorActive,
    setIsAmbianceAutoColorActive,
    setIsAudioActive,
    customPresets,
    applyAmbiancePreset,
    fadeTimeSeconds,
  } = params;

  const snapshotRef = React.useRef<AutoLiveSnapshot | null>(null);
  const managedPulseIdsRef = React.useRef<string[]>([]);
  const managedColorIdsRef = React.useRef<string[]>([]);
  const energyHistoryRef = React.useRef<number[]>([]);
  const midHistoryRef = React.useRef<number[]>([]);
  const bassHistoryRef = React.useRef<number[]>([]);
  const silentSinceRef = React.useRef<number | null>(null);
  const wasSilentRef = React.useRef(false);
  const lastAccentRef = React.useRef(0);
  const freshBeatRef = React.useRef(0);
  const baseMasterRef = React.useRef(masterDimmer);
  const lastBeatMsRef = React.useRef(0);
  const lastEnergyTierRef = React.useRef<AutoLiveEnergyTier | null>(null);
  const lastLookSwitchRef = React.useRef(0);
  const lastAppliedLookSlotRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    saveAutoLiveState(state);
  }, [state]);

  React.useEffect(() => {
    if (!state.enabled) return;
    baseMasterRef.current = masterDimmer;
  }, [state.enabled, masterDimmer]);

  React.useEffect(() => {
    if (!state.enabled) {
      resetAutoLiveRuntime();
      return;
    }

    setIsAudioActive(true);
    snapshotRef.current = {
      linkedGroups: [...linkedGroups],
      groupPulseActive: { ...groupPulseActive },
      groupAutoColorActive: { ...groupAutoColorActive },
      groupAutoGoboActive: { ...groupAutoGoboActive },
      groupMovements: { ...groupMovements },
      isAmbiancePulseActive,
      isAmbianceAutoColorActive,
      masterDimmer,
    };
    const { pulseIds, colorIds } = applyAutoLiveBootstrap(
      groups,
      fixtures,
      state.options,
      linkedGroups,
      setLinkedGroups,
      setGroupPulseActive,
      setGroupAutoColorActive,
      setIsAmbiancePulseActive,
      setIsAmbianceAutoColorActive,
      setGroupMovements
    );
    managedPulseIdsRef.current = pulseIds;
    managedColorIdsRef.current = colorIds;

    return () => {
      resetAutoLiveRuntime();
      const snap = snapshotRef.current;
      if (snap) {
        restoreSnapshot(
          snap,
          setLinkedGroups,
          setGroupPulseActive,
          setGroupAutoColorActive,
          setGroupAutoGoboActive,
          setGroupMovements,
          setIsAmbiancePulseActive,
          setIsAmbianceAutoColorActive,
          handleMasterDimmer
        );
      }
      handleGlobalAction('strobe', 0);
      snapshotRef.current = null;
      energyHistoryRef.current = [];
      midHistoryRef.current = [];
      bassHistoryRef.current = [];
      silentSinceRef.current = null;
      wasSilentRef.current = false;
      lastBeatMsRef.current = 0;
      lastEnergyTierRef.current = null;
      lastLookSwitchRef.current = 0;
      lastAppliedLookSlotRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.enabled]);

  React.useEffect(() => {
    if (!state.enabled) return;
    applyManagedPulse(
      managedPulseIdsRef.current,
      state.options.followRhythm,
      setIsAmbiancePulseActive,
      setGroupPulseActive
    );
    applyManagedColor(
      managedColorIdsRef.current,
      state.options.autoColor,
      setIsAmbianceAutoColorActive,
      setGroupAutoColorActive
    );
  }, [
    state.enabled,
    state.options.followRhythm,
    state.options.autoColor,
    setGroupPulseActive,
    setGroupAutoColorActive,
    setIsAmbiancePulseActive,
    setIsAmbianceAutoColorActive,
  ]);

  React.useEffect(() => {
    if (!state.enabled) return;

    const tick = window.setInterval(() => {
      const { options } = state;
      const now = Date.now();

      if (audioStats.isPeak) {
        lastBeatMsRef.current = now;
      }

      const bassSm = averageEnergy(
        (bassHistoryRef.current = pushEnergySample(bassHistoryRef.current, audioStats.bass))
      );
      const midSm = averageEnergy(
        (midHistoryRef.current = pushEnergySample(midHistoryRef.current, audioStats.mid))
      );
      const highSm = audioStats.high;
      const routing = state.bandRouting;
      const composite = weightedCompositeEnergy(bassSm, midSm, highSm, {
        bass: routing.masterBass,
        mid: routing.masterMid,
        high: routing.masterHigh,
      });

      energyHistoryRef.current = pushEnergySample(energyHistoryRef.current, composite);
      const smoothed = averageEnergy(energyHistoryRef.current);
      const midTrend = energyTrend(midHistoryRef.current);
      const beatPhase = beatPhaseFromClock(bpm, lastBeatMsRef.current, now);

      setAutoLiveRuntime({
        enabled: true,
        followRhythm: options.followRhythm,
        followEnergy: options.followEnergy,
        autoColor: options.autoColor,
        pulseUsesBass: routing.pulseUsesBass,
        colorUsesHigh: routing.colorUsesHigh,
        energy: smoothed,
        bass: bassSm,
        mid: midSm,
        high: highSm,
        beatPhase,
        lastBeatMs: lastBeatMsRef.current,
      });

      if (!options.realtime) {
        return;
      }

      const silent = isSilent(composite);

      if (silent) {
        if (silentSinceRef.current === null) silentSinceRef.current = now;
      } else {
        silentSinceRef.current = null;
        wasSilentRef.current = false;
      }

      const silentMs =
        silentSinceRef.current !== null ? now - silentSinceRef.current : 0;
      const inPause = silentMs > 2200;

      if (inPause && !wasSilentRef.current) {
        wasSilentRef.current = true;
        if (options.holdBetweenSongs) {
          setGroupAutoGoboActive((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((k) => {
              next[k] = false;
            });
            return next;
          });
          setGroupMovements((prev) => {
            const next = { ...prev };
            movementGroupIdsForAutoLive(groups, fixtures).forEach((id) => {
              const m = next[id];
              if (m && m.shape !== 'none') next[id] = { ...m, shape: 'none' };
            });
            return next;
          });
          handleGlobalAction('strobe', 0);
        }

        switch (options.pauseBehavior) {
          case 'blackout':
            handleMasterDimmer(0);
            break;
          case 'fade':
            handleMasterDimmer(energyMasterDimmer(baseMasterRef.current, 0.15));
            break;
          case 'hold':
          case 'look':
          default:
            break;
        }
        return;
      }

      if (options.followEnergy) {
        handleMasterDimmer(energyMasterDimmer(baseMasterRef.current, smoothed));
      }

      const looks = state.energyLooks;
      if (looks.enabled) {
        const tier = energyTierFromLevel(smoothed, looks.lowThreshold, looks.highThreshold);
        const slot = presetSlotForTier(tier, looks);
        if (ambiancePresetHasData(customPresets, slot)) {
          const tierChanged = tier !== lastEnergyTierRef.current;
          const holdOk =
            lastLookSwitchRef.current === 0 ||
            now - lastLookSwitchRef.current >= looks.minHoldMs;
          const slotChanged = slot !== lastAppliedLookSlotRef.current;
          if (slotChanged && (lastEnergyTierRef.current === null || (tierChanged && holdOk))) {
            applyAmbiancePreset(slot, {
              fadeSeconds: looks.useFade ? fadeTimeSeconds : 0,
            });
            lastAppliedLookSlotRef.current = slot;
            lastLookSwitchRef.current = now;
          }
        }
        lastEnergyTierRef.current = tier;
      }

      const moveLevel = routing.movementUsesMid ? midSm : smoothed;
      const moveTrend = routing.movementUsesMid
        ? midTrend
        : energyTrend(energyHistoryRef.current);

      if (options.risesAndDrops) {
        setGroupMovements((prev) => {
          const next = { ...prev };
          let changed = false;
          movementGroupIdsForAutoLive(groups, fixtures).forEach((groupId) => {
            const cur = next[groupId];
            if (!cur || cur.shape === 'none') return;
            const speed = movementSpeedForEnergy(cur.speed, moveLevel, moveTrend);
            if (speed !== cur.speed) {
              next[groupId] = { ...cur, speed };
              changed = true;
            }
          });
          return changed ? next : prev;
        });
      }

      const accentHit = routing.accentsUseBassPeaks
        ? audioStats.isPeak
        : audioStats.isPeak || smoothed > 0.72;
      if (options.accents && accentHit && now - lastAccentRef.current > 320) {
        lastAccentRef.current = now;
        const flash = Math.round(120 + bassSm * 100);
        handleGlobalAction('strobe', flash);
        window.setTimeout(() => handleGlobalAction('strobe', 0), 70);
      }

      if (options.stayFresh) {
        freshBeatRef.current += 1;
        const beatsPerRefresh = Math.max(8, Math.round((bpm / 60) * 20));
        if (freshBeatRef.current >= beatsPerRefresh) {
          freshBeatRef.current = 0;
          const seed = now;
          setGroupMovements((prev) => {
            const next = { ...prev };
            movementGroupIdsForAutoLive(groups, fixtures).forEach((groupId, i) => {
              const cur = next[groupId];
              if (!cur || cur.shape === 'none') return;
              next[groupId] = {
                ...cur,
                shape: pickFreshShape(seed + i * 17),
                speed: movementSpeedForEnergy(45, moveLevel, moveTrend),
              };
            });
            return next;
          });
        }
      }
    }, 80);

    return () => clearInterval(tick);
  }, [
    state,
    audioStats.bass,
    audioStats.mid,
    audioStats.high,
    audioStats.isPeak,
    bpm,
    groups,
    fixtures,
    handleMasterDimmer,
    handleGlobalAction,
    setGroupMovements,
    setGroupAutoGoboActive,
    customPresets,
    applyAmbiancePreset,
    fadeTimeSeconds,
  ]);

  const setEnabled = React.useCallback(
    (enabled: boolean) => setState((s) => ({ ...s, enabled })),
    [setState]
  );

  const setOptions = React.useCallback(
    (patch: Partial<AutoLiveOptions>) =>
      setState((s) => ({ ...s, options: { ...s.options, ...patch } })),
    [setState]
  );

  return { setEnabled, setOptions };
}
