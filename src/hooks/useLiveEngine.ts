import { useEffect, useRef } from 'react';
import { Fixture, Group } from '../types';
import { hslToRgb } from '../utils/colorUtils';
import { invokeUpdateDmx } from '../utils/dmxInvoke';
import { loadFixtureProfilesFromStorage } from './useFixtureProfiles';
import { fixtureChannelIndex } from '../utils/fixtureDmxChannels';
import { fixtureIsLyreControllable } from '../utils/autoLiveGroups';
import {
  applyWookie200RPresetToFixtures,
  WOOKIE_200R_PRESET_COUNT,
  wookie200R9FixturesInGroup,
} from '../utils/cameoWookie200R';
import {
  buildLiveMotionPayload,
  fetchMotionPreview,
  hasActiveLiveMotion,
  syncLiveMotions,
} from '../utils/motionSync';
import { bassSyncedPulseFactor, colorCycleMs } from '../utils/autoLiveSignals';
import { getAutoLiveRuntime } from '../utils/autoLiveRuntime';
import { LiveStore } from './useLiveStore';

interface UseLiveEngineParams {
  fixtures: Fixture[];
  groups: Group[];
  live: LiveStore;
  updateDmx: (ch: number, val: string | number) => Promise<void>;
  reportDmxError: (message: string) => void;
}

/** Boucles DMX Live (intensité, auto-color, auto-gobo) + sync mouvement Rust. */
export function useLiveEngine({
  fixtures,
  groups,
  live,
  updateDmx,
  reportDmxError,
}: UseLiveEngineParams) {
  const {
    groupMovements,
    groupPan,
    groupTilt,
    groupMovementCenters,
    groupMovementCenterLinked,
    groupAutoColorActive,
    groupAutoGoboActive,
    groupIntensities,
    groupPulseActive,
    fixtureCalibration,
    masterDimmer,
    bpm,
    liveGroupPositions,
    setLiveGroupPositions,
    liveGroupColors,
    setLiveGroupColors,
    liveGroupGobos,
    setLiveGroupGobos,
  } = live;

  const lastLaserPresetByGroup = useRef<Record<string, number>>({});

  // Sync mouvements → moteur Rust (source de vérité unique)
  useEffect(() => {
    const payload = buildLiveMotionPayload(
      groups,
      fixtures,
      groupMovements,
      groupPan,
      groupTilt,
      fixtureCalibration,
      groupMovementCenters,
      groupMovementCenterLinked
    );
    void syncLiveMotions(payload).catch((e) => {
      console.warn('[Motion] sync_live_motions échoué:', e);
      reportDmxError(e instanceof Error ? e.message : String(e));
    });
  }, [
    groups,
    fixtures,
    groupMovements,
    groupPan,
    groupTilt,
    groupMovementCenters,
    groupMovementCenterLinked,
    fixtureCalibration,
    reportDmxError,
  ]);

  // Aperçu UI des positions (calculées côté Rust à 40 Hz)
  useEffect(() => {
    const hasActive = hasActiveLiveMotion(groups, fixtures, groupMovements);

    if (!hasActive) {
      if (Object.keys(liveGroupPositions).length > 0) setLiveGroupPositions({});
      return;
    }

    const interval = setInterval(() => {
      void fetchMotionPreview()
        .then((preview) => {
          const next: Record<string, { pan: number; tilt: number }> = {};
          Object.entries(preview).forEach(([id, pos]) => {
            if (id === '__legacy__') return;
            next[id] = { pan: pos.pan, tilt: pos.tilt };
          });
          setLiveGroupPositions(next);
        })
        .catch(() => {});
    }, 50);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupMovements, groups, fixtures, setLiveGroupPositions]);

  // Boucle Master d'intensité (50fps)
  useEffect(() => {
    const interval = setInterval(() => {
      const autoRt = getAutoLiveRuntime();
      const beatDuration = (60 / bpm) * 1000;
      const elapsed = Date.now();
      const progress = (elapsed % beatDuration) / beatDuration;
      const timerDecay = Math.pow(1 - progress, 2);
      const audioPulse = bassSyncedPulseFactor(autoRt.bass, autoRt.beatPhase);
      const pulseNorm =
        autoRt.enabled && autoRt.followRhythm
          ? autoRt.pulseUsesBass
            ? audioPulse
            : timerDecay
          : timerDecay;
      const pulseVal = Math.round(255 * pulseNorm);
      const profiles = loadFixtureProfilesFromStorage();

      fixtures.forEach((fixture) => {
        const group = groups.find((g) => g.fixtureIds.includes(fixture.id));
        const groupId = group?.id;
        const groupDim = groupId ? (groupIntensities[groupId]?.dim ?? 255) : 255;
        const masterLimit = masterDimmer / 255;
        const localLimit = groupDim / 255;
        const isPulseActive = groupId && groupPulseActive[groupId];

        const finalIntensity = isPulseActive
          ? Math.round(pulseVal * localLimit * masterLimit)
          : Math.round(255 * localLimit * masterLimit);

        const dimCh = fixtureChannelIndex(fixture, 'dimmer', profiles);
        if (dimCh != null) {
          void invokeUpdateDmx(dimCh, finalIntensity, reportDmxError);
          return;
        }

        const start = fixture.address - 1;
        if (fixture.type === 'RGB') {
          void invokeUpdateDmx(start + 1, finalIntensity, reportDmxError);
        } else if (fixture.type === 'Moving Head') {
          void invokeUpdateDmx(start + 6, finalIntensity, reportDmxError);
        } else if (fixture.type === 'Effect') {
          void invokeUpdateDmx(start + 1, finalIntensity, reportDmxError);
        }
      });
    }, 20);

    return () => clearInterval(interval);
  }, [
    fixtures,
    groups,
    groupIntensities,
    masterDimmer,
    groupPulseActive,
    bpm,
    reportDmxError,
  ]);

  // Auto-Color
  useEffect(() => {
    const activeGroups = Object.keys(groupAutoColorActive).filter(
      (id) =>
        groupAutoColorActive[id] === true && groups.some((g) => g.id === id)
    );

    if (activeGroups.length === 0) {
      lastLaserPresetByGroup.current = {};
      if (Object.keys(liveGroupColors).length > 0) setLiveGroupColors({});
      return;
    }

    const wheelColors = [
      { r: 255, g: 255, b: 255, v: 5 },
      { r: 255, g: 0, b: 0, v: 16 },
      { r: 255, g: 128, b: 0, v: 27 },
      { r: 255, g: 255, b: 0, v: 38 },
      { r: 0, g: 255, b: 0, v: 49 },
      { r: 0, g: 0, b: 255, v: 60 },
      { r: 0, g: 255, b: 255, v: 71 },
      { r: 255, g: 0, b: 255, v: 82 },
    ];

    const interval = setInterval(() => {
      const autoRt = getAutoLiveRuntime();
      const cycleMs =
        autoRt.enabled && autoRt.autoColor && autoRt.colorUsesHigh
          ? colorCycleMs(autoRt.high)
          : 20;
      const profiles = loadFixtureProfilesFromStorage();
      const newLiveColors: Record<string, number> = {};
      activeGroups.forEach((groupId) => {
        const group = groups.find((g) => g.id === groupId);
        if (!group) return;

        const groupFixtures = group.fixtureIds
          .map((id) => fixtures.find((fx) => fx.id === id))
          .filter((f): f is Fixture => f != null);
        const lyreLike = groupFixtures.filter((f) => fixtureIsLyreControllable(f));
        const wookieLasers = wookie200R9FixturesInGroup(group.fixtureIds, fixtures);

        if (lyreLike.length > 0) {
          const wheelMs =
            autoRt.enabled && autoRt.autoColor && autoRt.colorUsesHigh
              ? 900 + (1 - autoRt.mid) * 800
              : 1500;
          const colorIndex = Math.floor((Date.now() / wheelMs) % wheelColors.length);
          const color = wheelColors[colorIndex];
          newLiveColors[groupId] = color.v;

          lyreLike.forEach((f) => {
            const colorCh = fixtureChannelIndex(f, 'color', profiles);
            if (colorCh != null) {
              void updateDmx(colorCh, color.v);
            } else if (f.type === 'Moving Head') {
              void updateDmx(f.address + 5, color.v);
            }
          });
        } else if (wookieLasers.length > 0) {
          const wheelMs =
            autoRt.enabled && autoRt.autoColor && autoRt.colorUsesHigh
              ? 1200 + (1 - autoRt.high) * 600
              : 2000;
          const preset =
            (Math.floor(Date.now() / wheelMs) % WOOKIE_200R_PRESET_COUNT) + 1;
          newLiveColors[groupId] = preset;
          if (lastLaserPresetByGroup.current[groupId] !== preset) {
            applyWookie200RPresetToFixtures(
              wookieLasers,
              preset,
              (ch, val) => {
                void updateDmx(ch, val);
              },
              profiles
            );
            lastLaserPresetByGroup.current[groupId] = preset;
          }
        } else {
          const currentHue = (Date.now() / cycleMs) % 360;
          const { r, g, b } = hslToRgb(currentHue, 100, 50);

          groupFixtures.forEach((f) => {
            if (f.type === 'RGB') {
              void updateDmx(f.address, r);
              void updateDmx(f.address + 1, g);
              void updateDmx(f.address + 2, b);
            }
          });
        }
      });
      setLiveGroupColors(newLiveColors);
    }, 50);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupAutoColorActive, groups, fixtures, updateDmx, setLiveGroupColors]);

  // Auto-Gobo
  useEffect(() => {
    const activeGroups = Object.keys(groupAutoGoboActive).filter(
      (id) =>
        groupAutoGoboActive[id] === true && groups.some((g) => g.id === id)
    );

    if (activeGroups.length === 0) {
      if (Object.keys(liveGroupGobos).length > 0) setLiveGroupGobos({});
      return;
    }

    const interval = setInterval(() => {
      const newLiveGobos: Record<string, number> = {};
      activeGroups.forEach((groupId) => {
        const group = groups.find((g) => g.id === groupId);
        if (!group) return;

        const goboIndex = Math.floor((Date.now() / 2000) % 8);
        const dmxValue = goboIndex * 32;
        newLiveGobos[groupId] = goboIndex;

        group.fixtureIds.forEach((id) => {
          const f = fixtures.find((fx) => fx.id === id);
          if (f && f.type === 'Moving Head') {
            void updateDmx(f.address + 6, dmxValue);
          }
        });
      });
      setLiveGroupGobos(newLiveGobos);
    }, 100);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupAutoGoboActive, groups, fixtures, updateDmx, setLiveGroupGobos]);
}
