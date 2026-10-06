import React from 'react';
import type { AmbiancePreset, Group, GroupIntensity, LiveGroupState, RgbColor } from '../../types';
import { runAmbiancePresetFade } from '../../utils/ambiancePresetFade';

interface UseLiveAmbiancePresetsParams {
  groups: Group[];
  groupIntensities: Record<string, GroupIntensity>;
  groupColors: Record<string, RgbColor>;
  groupAutoColorActive: Record<string, boolean>;
  groupPulseActive: Record<string, boolean>;
  setGroupIntensities: React.Dispatch<React.SetStateAction<Record<string, GroupIntensity>>>;
  setGroupColors: React.Dispatch<React.SetStateAction<Record<string, RgbColor>>>;
  setGroupAutoColorActive: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setGroupPulseActive: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  handleMultiFixtureAction: (
    fixtureIds: number[],
    action: 'dimmer' | 'color' | 'strobe' | 'pan' | 'tilt',
    value: number | RgbColor
  ) => void;
  /** Fade par défaut (Live → Ambiances), en secondes. */
  defaultFadeSeconds: number;
}

function currentGroupState(
  groupId: string,
  groupIntensities: Record<string, GroupIntensity>,
  groupColors: Record<string, RgbColor>,
  groupAutoColorActive: Record<string, boolean>,
  groupPulseActive: Record<string, boolean>
): LiveGroupState {
  return {
    dim: groupIntensities[groupId]?.dim ?? 255,
    str: groupIntensities[groupId]?.str ?? 0,
    color: groupColors[groupId] ?? { r: 255, g: 255, b: 255 },
    auto: groupAutoColorActive[groupId] ?? false,
    pulse: groupPulseActive[groupId] ?? false,
  };
}

/** Presets d'ambiance (capture / apply) + persistance. */
export function useLiveAmbiancePresets({
  groups,
  groupIntensities,
  groupColors,
  groupAutoColorActive,
  groupPulseActive,
  setGroupIntensities,
  setGroupColors,
  setGroupAutoColorActive,
  setGroupPulseActive,
  handleMultiFixtureAction,
  defaultFadeSeconds,
}: UseLiveAmbiancePresetsParams) {
  const [customPresets, setCustomPresets] = React.useState<Record<string, AmbiancePreset>>(() => {
    const saved = localStorage.getItem('dmx_custom_ambiance_presets');
    if (saved) return JSON.parse(saved);
    const initial: Record<string, AmbiancePreset> = {};
    for (let i = 1; i <= 8; i++) {
      initial[i.toString()] = { name: `Ambiance ${i}`, groupStates: {} };
    }
    return initial;
  });

  const fadeGenerationRef = React.useRef(0);
  const stateRef = React.useRef({
    groupIntensities,
    groupColors,
    groupAutoColorActive,
    groupPulseActive,
  });

  React.useEffect(() => {
    stateRef.current = {
      groupIntensities,
      groupColors,
      groupAutoColorActive,
      groupPulseActive,
    };
  }, [groupIntensities, groupColors, groupAutoColorActive, groupPulseActive]);

  React.useEffect(() => {
    localStorage.setItem('dmx_custom_ambiance_presets', JSON.stringify(customPresets));
  }, [customPresets]);

  const captureAmbianceState = React.useCallback(
    (presetName: string): AmbiancePreset => {
      const states: Record<string, LiveGroupState> = {};
      groups.forEach((g) => {
        states[g.id] = currentGroupState(
          g.id,
          groupIntensities,
          groupColors,
          groupAutoColorActive,
          groupPulseActive
        );
      });
      return { name: presetName, groupStates: states };
    },
    [groups, groupIntensities, groupColors, groupAutoColorActive, groupPulseActive]
  );

  const commitPresetToState = React.useCallback(
    (preset: AmbiancePreset) => {
      const newIntensities = { ...stateRef.current.groupIntensities };
      const newColors = { ...stateRef.current.groupColors };
      const newAuto = { ...stateRef.current.groupAutoColorActive };
      const newPulse = { ...stateRef.current.groupPulseActive };

      Object.entries(preset.groupStates).forEach(([groupId, state]) => {
        newIntensities[groupId] = { dim: state.dim, str: state.str };
        newColors[groupId] = state.color;
        newAuto[groupId] = state.auto ?? false;
        newPulse[groupId] = state.pulse ?? false;
      });

      setGroupIntensities(newIntensities);
      setGroupColors(newColors);
      setGroupAutoColorActive(newAuto);
      setGroupPulseActive(newPulse);
    },
    [
      setGroupIntensities,
      setGroupColors,
      setGroupAutoColorActive,
      setGroupPulseActive,
    ]
  );

  const applyAmbiancePreset = React.useCallback(
    (presetId: string, opts?: { fadeSeconds?: number }) => {
      const preset = customPresets[presetId];
      if (!preset || Object.keys(preset.groupStates).length === 0) return;

      const fadeSec = opts?.fadeSeconds ?? defaultFadeSeconds;
      if (fadeSec <= 0) {
        Object.entries(preset.groupStates).forEach(([groupId, state]) => {
          const group = groups.find((g) => g.id === groupId);
          if (!group) return;
          handleMultiFixtureAction(group.fixtureIds, 'dimmer', state.dim);
          handleMultiFixtureAction(group.fixtureIds, 'strobe', state.str);
          handleMultiFixtureAction(group.fixtureIds, 'color', state.color);
        });
        commitPresetToState(preset);
        return;
      }

      const gen = ++fadeGenerationRef.current;
      const snap = stateRef.current;
      const startByGroup: Record<string, LiveGroupState> = {};
      Object.keys(preset.groupStates).forEach((groupId) => {
        startByGroup[groupId] = currentGroupState(
          groupId,
          snap.groupIntensities,
          snap.groupColors,
          snap.groupAutoColorActive,
          snap.groupPulseActive
        );
      });

      runAmbiancePresetFade({
        groups,
        startByGroup,
        targetByGroup: preset.groupStates,
        fadeSeconds: fadeSec,
        isCancelled: () => fadeGenerationRef.current !== gen,
        send: (_groupId, fixtureIds, state) => {
          handleMultiFixtureAction(fixtureIds, 'dimmer', state.dim);
          handleMultiFixtureAction(fixtureIds, 'strobe', state.str);
          handleMultiFixtureAction(fixtureIds, 'color', state.color);
        },
        onComplete: () => {
          if (fadeGenerationRef.current !== gen) return;
          commitPresetToState(preset);
        },
      });
    },
    [
      customPresets,
      defaultFadeSeconds,
      groups,
      handleMultiFixtureAction,
      commitPresetToState,
    ]
  );

  return {
    customPresets,
    setCustomPresets,
    captureAmbianceState,
    applyAmbiancePreset,
  };
}
