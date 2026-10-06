import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { useLiveLogic } from '../../hooks/useLiveLogic';
import { useAutoLive } from '../../hooks/live/useAutoLive';
import type { AutoLiveOptions, AutoLivePresetId, AutoLiveState } from '../../types/autoLive';
import { getAutoLivePreset } from '../../utils/autoLivePresets';
import {
  buildOneClickPartyEnergyLooks,
  oneClickPartySuggestedMaster,
  pickOneClickPartyPresetId,
} from '../../utils/autoLiveOneClickParty';
import { mergeBeginnerFactoryPresets } from '../../utils/liveBeginnerFactoryPresets';
import { useCueList } from '../../hooks/useCueList';
import { CueListSection } from './live/CueListSection';
import { useLiveKeyboardShortcuts } from '../../hooks/live/useLiveKeyboardShortcuts';
import { useLiveUndo } from '../../hooks/live/useLiveUndo';
import type {
  GroupCustomMovementSlotLinks,
  GroupQuickMovementSaves,
  ShowCue,
} from '../../types';
import { runCueChannelFade } from '../../utils/cueFade';
import { AmbianceSection } from './live/AmbianceSection';
import { MovementSection } from './live/MovementSection';
import { SpecialSection } from './live/SpecialSection';
import { MasterGlobalSection } from './live/MasterGlobalSection';
import { AutoLiveSection } from './live/AutoLiveSection';
import { LiveAutoActiveBanner } from './live/LiveAutoActiveBanner';
import { LiveDmxConnectionBanner } from './live/LiveDmxConnectionBanner';
import { LiveToast } from './live/LiveToast';
import {
  LiveManualViewSwitch,
  type LiveManualView,
} from './live/LiveManualViewSwitch';
import { LiveBeginnerBanner } from './live/LiveBeginnerBanner';
import type { LiveProfile } from '../../hooks/useAppPreferences';
import {
  getLiveAmbianceGroups,
  getLiveEmptyGroups,
  getLiveLyreDisplayGroups,
  getLiveSpecialGroups,
  getLiveUnassignedGroups,
} from '../../utils/liveGroups';
import { StrobeModal } from './live/StrobeModal';
import { ColorPickerModal } from './live/ColorPickerModal';
import { SavePresetModal } from './live/SavePresetModal';
import { CalibrationModal } from './live/CalibrationModal';
import { EffectsModal } from './live/EffectsModal';
import type {
  CalibrationSettings,
  CustomTrajectory,
  Fixture,
  FixtureControlAction,
  Group,
  GroupControlAction,
  GroupIntensity,
  GroupMovement,
  GroupPosition,
  GroupPositionMemoryMode,
  LivePanTilt,
  RgbColor,
} from '../../types';

export type LiveTabVariant = 'manual' | 'auto';

interface LiveTabProps {
  variant?: LiveTabVariant;
  /** Moteur actif sans UI (Auto Live en arrière-plan). */
  headless?: boolean;
  autoLiveState: AutoLiveState;
  setAutoLiveState: React.Dispatch<React.SetStateAction<AutoLiveState>>;
  fixtures: Fixture[];
  channels: number[];
  pan: number;
  tilt: number;
  groups: Group[];
  selectedGroup: string | null;
  setSelectedGroup: (id: string | null) => void;
  selectedFixtures: number[];
  setSelectedFixtures: (ids: number[]) => void;
  updateDmx: (ch: number, val: string | number) => void;
  handlePanChange: (val: string) => void;
  handleTiltChange: (val: string) => void;
  handleMultiFixtureAction: (
    fixtureIds: number[],
    action: FixtureControlAction,
    value: number | RgbColor
  ) => void;
  handleGroupAction: (
    groupId: string,
    action: GroupControlAction,
    value: number | RgbColor
  ) => void;
  handleMasterDimmer: (val: number) => void;
  applyGlobalIntensity: (val: number) => void;
  masterDimmer: number;
  handleMasterStrobe: (val: number) => void;
  onRenameGroup: (groupId: string, newName: string) => void;

  groupIntensities: Record<string, GroupIntensity>;
  setGroupIntensities: React.Dispatch<React.SetStateAction<Record<string, GroupIntensity>>>;
  groupColors: Record<string, RgbColor>;
  setGroupColors: React.Dispatch<React.SetStateAction<Record<string, RgbColor>>>;
  groupPulseActive: Record<string, boolean>;
  setGroupPulseActive: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  bpm: number;
  setBpm: React.Dispatch<React.SetStateAction<number>>;
  groupMovements: Record<string, GroupMovement>;
  setGroupMovements: React.Dispatch<React.SetStateAction<Record<string, GroupMovement>>>;
  groupPan: Record<string, number>;
  setGroupPan: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  groupTilt: Record<string, number>;
  setGroupTilt: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  groupAutoColorActive: Record<string, boolean>;
  setGroupAutoColorActive: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  groupAutoGoboActive: Record<string, boolean>;
  setGroupAutoGoboActive: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  groupGobos: Record<string, number>;
  setGroupGobos: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  groupPositions: Record<string, GroupPosition[]>;
  setGroupPositions: React.Dispatch<React.SetStateAction<Record<string, GroupPosition[]>>>;
  groupCenterPositions: Record<string, GroupPosition>;
  setGroupCenterPositions: React.Dispatch<
    React.SetStateAction<Record<string, GroupPosition>>
  >;
  groupMovementCenters: Record<string, Record<string, { x: number; y: number }>>;
  setGroupMovementCenters: React.Dispatch<
    React.SetStateAction<Record<string, Record<string, { x: number; y: number }>>>
  >;
  groupMovementCenterLinked: Record<string, boolean>;
  setGroupMovementCenterLinked: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  groupPositionMemoryMode: Record<string, GroupPositionMemoryMode>;
  setGroupPositionMemoryMode: React.Dispatch<
    React.SetStateAction<Record<string, GroupPositionMemoryMode>>
  >;
  groupQuickMovementSaves: GroupQuickMovementSaves;
  setGroupQuickMovementSaves: React.Dispatch<
    React.SetStateAction<GroupQuickMovementSaves>
  >;
  groupCustomTrajectories: Record<string, CustomTrajectory[]>;
  setGroupCustomTrajectories: React.Dispatch<React.SetStateAction<Record<string, CustomTrajectory[]>>>;
  groupCustomMovementSlotLinks: GroupCustomMovementSlotLinks;
  setGroupCustomMovementSlotLinks: React.Dispatch<
    React.SetStateAction<GroupCustomMovementSlotLinks>
  >;
  fixtureCalibration: Record<number, CalibrationSettings>;
  setFixtureCalibration: React.Dispatch<React.SetStateAction<Record<number, CalibrationSettings>>>;
  liveGroupPositions: Record<string, LivePanTilt>;
  liveGroupColors: Record<string, number>;
  liveGroupGobos: Record<string, number>;
  openCalibrationWhenActive?: boolean;
  onCalibrationActivated?: () => void;
  onGoToPatch?: () => void;
  onOpenAutoLive?: () => void;
  /** Auto Live ON pendant que l’utilisateur est sur Live manuel. */
  autoLiveActiveInBackground?: boolean;
  dmxConnected?: boolean;
  dmxPort?: string;
  dmxConnectionError?: string | null;
  onDmxReconnect?: () => void;
  confirmBlackout?: boolean;
  liveCompact?: boolean;
  liveProfile?: LiveProfile;
  autoLiveEasyMode?: boolean;
  onAutoLiveEasyModeChange?: (enabled: boolean) => void;
}

export const LiveTab = (props: LiveTabProps) => {
  const {
    variant = 'manual',
    headless = false,
    autoLiveState,
    setAutoLiveState,
    openCalibrationWhenActive,
    onCalibrationActivated,
    onGoToPatch,
    onOpenAutoLive,
    autoLiveActiveInBackground = false,
    dmxConnected = true,
    dmxPort = '',
    dmxConnectionError = null,
    onDmxReconnect,
    confirmBlackout = false,
    liveCompact = false,
    liveProfile = 'beginner',
    autoLiveEasyMode = false,
    onAutoLiveEasyModeChange,
  } = props;
  const liveBeginner = liveProfile === 'beginner' && variant === 'manual';
  const autoLiveSimple = liveProfile === 'beginner' && variant === 'auto';
  const [manualView, setManualView] = useState<LiveManualView>('consoles');
  const [cuePlayhead, setCuePlayhead] = useState(0);
  const [undoToast, setUndoToast] = useState<string | null>(null);
  const [calibrationFixtureFilter, setCalibrationFixtureFilter] = useState<number[] | null>(
    null
  );
  const [calibrationGroupName, setCalibrationGroupName] = useState<string | null>(null);
  const isManualLive = variant === 'manual';
  const isAutoLive = variant === 'auto';
  const {
    fixtures, channels, pan, tilt, groups, selectedGroup, setSelectedGroup,
    selectedFixtures, setSelectedFixtures, updateDmx, handlePanChange, handleTiltChange,
    handleMultiFixtureAction, handleGroupAction, handleMasterDimmer, applyGlobalIntensity, masterDimmer, handleMasterStrobe,
    onRenameGroup, groupIntensities, setGroupIntensities, groupColors, setGroupColors,
    groupPulseActive, setGroupPulseActive, bpm, setBpm, groupMovements, setGroupMovements,
    groupPan, setGroupPan, groupTilt, setGroupTilt, groupAutoColorActive, setGroupAutoColorActive,
    groupAutoGoboActive, setGroupAutoGoboActive, groupGobos, setGroupGobos, groupPositions,
    setGroupPositions, groupCenterPositions, setGroupCenterPositions,
    groupMovementCenters,
    setGroupMovementCenters,
    groupMovementCenterLinked,
    setGroupMovementCenterLinked,
    groupQuickMovementSaves,
    setGroupQuickMovementSaves, groupCustomTrajectories,
    setGroupCustomTrajectories, groupCustomMovementSlotLinks,
    setGroupCustomMovementSlotLinks, fixtureCalibration, setFixtureCalibration, liveGroupPositions,
    liveGroupColors, liveGroupGobos
  } = props;

  const { cues, addCueFromChannels, removeCue, reorderCue } = useCueList();
  const cueIndexRef = useRef(0);
  const cueFadeGenerationRef = useRef(0);
  const { pushSnapshot, popSnapshot } = useLiveUndo();

  const handleGoCue = useCallback(
    (cue: ShowCue) => {
      const gen = ++cueFadeGenerationRef.current;
      const startChannels = channels.slice();
      runCueChannelFade({
        startChannels,
        targetChannels: cue.channels,
        fadeMs: cue.fadeMs,
        updateChannel: (ch, val) => updateDmx(ch, val),
        isCancelled: () => cueFadeGenerationRef.current !== gen,
      });
    },
    [channels, updateDmx]
  );

  const logic = useLiveLogic({
    fixtures, channels, groups, updateDmx, handleMultiFixtureAction,
    handleMasterDimmer, applyGlobalIntensity, masterDimmer, handleMasterStrobe, groupIntensities, setGroupIntensities,
    groupColors, setGroupColors, groupPulseActive, setGroupPulseActive, bpm, setBpm,
    groupAutoColorActive, setGroupAutoColorActive, groupAutoGoboActive, setGroupAutoGoboActive,
    groupGobos, setGroupGobos, groupPan, setGroupPan, groupTilt, setGroupTilt,
    setGroupMovementCenters,
    fixtureCalibration, setFixtureCalibration
  });

  const {
    isBeatActive, isAudioActive, setIsAudioActive, audioDevices, selectedAudioDeviceId,
    setSelectedAudioDeviceId, audioStats, linkedGroups, setLinkedGroups, globalStrobe,
    isAmbianceAutoColorActive, setIsAmbianceAutoColorActive,
    isAmbiancePulseActive, setIsAmbiancePulseActive,
    groupStrobeValues, setGroupStrobeValues,
    currentMasterIntensity, activeMacro, fadeTime, setFadeTime, customPresets, setCustomPresets,
    userColors, setUserColors, isCalibrationOpen, setIsCalibrationOpen, isStrobeModalOpen,
    setIsStrobeModalOpen, isColorModalOpen, setIsColorModalOpen, isSavePresetModalOpen,
    setIsSavePresetModalOpen, activeStrobeGroupId, activeColorGroupId, presetToSaveId,
    setPresetToSaveId, activeUserColorToEdit, activePresetToEdit, setActivePresetToEdit,
    tempColor, setTempColor, tempHue, setTempHue, tempSat, setTempSat, tempLum, setTempLum,
    tempStrobeVal, setTempStrobeVal, isDraggingColor, setIsDraggingColor, isDraggingHue,
    setIsDraggingHue, effectsModalState, setEffectsModalState, colorWheelRef, hueSliderRef,
    captureAmbianceState, applyAmbiancePreset, sendIntensity, sendColor, handleGlobalAction,
    handleMacro, sendMovement, handleEndOfSong, handleTap, toggleGroupLink, onStrobeEdit,
    onUserColorEdit, handleSpectrumAction, handleHueAction, getGroupUserColors,
    getLinkedFixtureIds, onColorModalSave
  } = logic;

  useEffect(() => {
    if (openCalibrationWhenActive) {
      setIsCalibrationOpen(true);
      onCalibrationActivated?.();
    }
  }, [openCalibrationWhenActive, setIsCalibrationOpen, onCalibrationActivated]);

  const { setEnabled: setAutoLiveEnabled, setOptions: setAutoLiveOptions } = useAutoLive({
    state: autoLiveState,
    setState: setAutoLiveState,
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
    fadeTimeSeconds: fadeTime,
  });

  const applyAutoLivePreset = useCallback(
    (id: AutoLivePresetId) => {
      const preset = getAutoLivePreset(id);
      setAutoLiveState((s) => ({
        ...s,
        presetId: id,
        options: { ...preset.options },
      }));
      handleMasterDimmer(preset.suggestedMaster);
    },
    [setAutoLiveState, handleMasterDimmer]
  );

  const patchAutoLiveOption = useCallback(
    <K extends keyof AutoLiveOptions>(key: K, value: AutoLiveOptions[K]) => {
      setAutoLiveOptions({ [key]: value } as Partial<AutoLiveOptions>);
      setAutoLiveState((s) => ({ ...s, presetId: 'custom' }));
    },
    [setAutoLiveOptions, setAutoLiveState]
  );

  const ambianceGroups = useMemo(
    () => getLiveAmbianceGroups(groups, fixtures),
    [groups, fixtures]
  );
  const specialLiveGroups = useMemo(
    () => getLiveSpecialGroups(groups, fixtures),
    [groups, fixtures]
  );
  const unassignedLiveGroups = useMemo(
    () => getLiveUnassignedGroups(groups, fixtures),
    [groups, fixtures]
  );
  const emptyPatchGroups = useMemo(() => getLiveEmptyGroups(groups), [groups]);

  const launchOneClickParty = useCallback(() => {
    let presets = customPresets;
    const merged = mergeBeginnerFactoryPresets(customPresets, ambianceGroups);
    if (merged) {
      presets = merged;
      setCustomPresets(merged);
    }

    const ambianceIds = ambianceGroups.map((g) => g.id);
    const presetId = pickOneClickPartyPresetId(groups, fixtures, ambianceIds);
    const preset = getAutoLivePreset(presetId);
    const energyLooks = buildOneClickPartyEnergyLooks(presets);

    setLinkedGroups((prev) => {
      if (prev.length > 0) return prev;
      return ambianceIds;
    });

    setAutoLiveState((s) => ({
      ...s,
      enabled: true,
      presetId,
      options: { ...preset.options },
      energyLooks,
    }));
    handleMasterDimmer(oneClickPartySuggestedMaster(presetId));
    setIsAudioActive(true);
  }, [
    customPresets,
    ambianceGroups,
    groups,
    fixtures,
    setCustomPresets,
    setLinkedGroups,
    setAutoLiveState,
    handleMasterDimmer,
    setIsAudioActive,
  ]);

  const factoryPresetsSeededRef = useRef(false);

  useEffect(() => {
    if (!liveBeginner || ambianceGroups.length === 0) return;
    setLinkedGroups((prev) => {
      if (prev.length > 0) return prev;
      return ambianceGroups.map((g) => g.id);
    });
  }, [liveBeginner, ambianceGroups, setLinkedGroups]);

  useEffect(() => {
    if (!liveBeginner || factoryPresetsSeededRef.current || ambianceGroups.length === 0) return;
    const merged = mergeBeginnerFactoryPresets(customPresets, ambianceGroups);
    if (merged) {
      factoryPresetsSeededRef.current = true;
      setCustomPresets(merged);
    }
  }, [liveBeginner, ambianceGroups, customPresets, setCustomPresets]);

  useEffect(() => {
    if (liveBeginner && manualView === 'cues') {
      setManualView('consoles');
    }
  }, [liveBeginner, manualView]);

  const saveAmbianceToPresetSlot = useCallback(
    (slot: string, name: string) => {
      const label = name.trim() || `Preset ${slot}`;
      setCustomPresets((prev) => ({
        ...prev,
        [slot]: captureAmbianceState(label),
      }));
    },
    [captureAmbianceState, setCustomPresets]
  );

  const handleAddCueWithOptionalPreset = useCallback(
    (name: string, ch: number[], fadeMs: number, alsoPresetSlot?: string) => {
      addCueFromChannels(name, ch, fadeMs);
      if (alsoPresetSlot) {
        saveAmbianceToPresetSlot(alsoPresetSlot, name || `Cue ${cues.length + 1}`);
      }
    },
    [addCueFromChannels, saveAmbianceToPresetSlot, cues.length]
  );

  const applyAmbiancePresetWithUndo = useCallback(
    (presetId: string) => {
      pushSnapshot({
        masterDimmer,
        groupIntensities,
        groupColors,
        groupAutoColorActive,
        groupPulseActive,
      });
      applyAmbiancePreset(presetId);
    },
    [
      pushSnapshot,
      masterDimmer,
      groupIntensities,
      groupColors,
      groupAutoColorActive,
      groupPulseActive,
      applyAmbiancePreset,
    ]
  );

  const syncCuePlayhead = useCallback(
    (index: number) => {
      const len = cues.length;
      const idx = len === 0 ? 0 : ((index % len) + len) % len;
      cueIndexRef.current = idx;
      setCuePlayhead(idx);
    },
    [cues.length]
  );

  useEffect(() => {
    if (cues.length === 0) syncCuePlayhead(0);
    else if (cuePlayhead >= cues.length) syncCuePlayhead(cues.length - 1);
  }, [cues.length, cuePlayhead, syncCuePlayhead]);

  const handleGoCueAt = useCallback(
    (cue: ShowCue, index: number) => {
      handleGoCue(cue);
      if (cues.length > 0) syncCuePlayhead(index + 1);
    },
    [handleGoCue, cues.length, syncCuePlayhead]
  );

  const goNextCue = useCallback(() => {
    if (cues.length === 0) return;
    const idx = cueIndexRef.current % cues.length;
    handleGoCue(cues[idx]);
    syncCuePlayhead(idx + 1);
  }, [cues, handleGoCue, syncCuePlayhead]);

  const onBlackout = useCallback(async () => {
    if (confirmBlackout && !window.confirm('Blackout total — couper toute la sortie DMX ?')) {
      return;
    }
    await invoke('blackout');
    handleGlobalAction('dimmer', 0);
  }, [confirmBlackout, handleGlobalAction]);

  const onUndoLive = useCallback(() => {
    const snap = popSnapshot();
    if (!snap) return;
    handleMasterDimmer(snap.masterDimmer);
    setGroupIntensities(snap.groupIntensities);
    setGroupColors(snap.groupColors);
    setGroupAutoColorActive(snap.groupAutoColorActive);
    setGroupPulseActive(snap.groupPulseActive);
    setUndoToast('Preset ambiance annulé · Ctrl+Z');
  }, [
    popSnapshot,
    handleMasterDimmer,
    setGroupIntensities,
    setGroupColors,
    setGroupAutoColorActive,
    setGroupPulseActive,
  ]);

  const keyboardActions = useMemo(
    () => ({
      onBlackout,
      onTapTempo: liveBeginner ? () => {} : handleTap,
      onGoCue: liveBeginner ? () => {} : goNextCue,
      onUndo: onUndoLive,
    }),
    [onBlackout, handleTap, goNextCue, onUndoLive, liveBeginner]
  );

  useLiveKeyboardShortcuts(isManualLive && !headless, keyboardActions);

  if (headless) {
    return null;
  }

  const masterSectionProps = {
    masterVal: masterDimmer,
    globalStrobe,
    handleGlobalAction,
    handleEndOfSong,
    bpm,
    setBpm,
    isAudioActive,
    setIsAudioActive,
    handleTap,
    isBeatActive,
    audioDevices,
    selectedAudioDeviceId,
    setSelectedAudioDeviceId,
    audioStats,
    onBlackout,
    liveBeginner,
    showKeyboardShortcuts: isManualLive,
  };

  const dmxBanner =
    !dmxConnected && onDmxReconnect ? (
      <LiveDmxConnectionBanner
        port={dmxPort}
        connectionError={dmxConnectionError}
        onReconnect={onDmxReconnect}
      />
    ) : null;

  if (isAutoLive) {
    return (
      <div className="flex h-[calc(100vh-140px)] flex-col gap-3 px-3 pb-3 overflow-hidden">
        <MasterGlobalSection {...masterSectionProps} liveBeginner={autoLiveSimple} />

        {dmxBanner}

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          <AutoLiveSection
            state={autoLiveState}
            customPresets={customPresets}
            simpleMode={autoLiveSimple}
            easyMode={autoLiveEasyMode}
            onEasyModeChange={onAutoLiveEasyModeChange}
            onLaunchOneClickParty={launchOneClickParty}
            onToggleEnabled={() => setAutoLiveEnabled(!autoLiveState.enabled)}
            onDisableAutoLive={() => setAutoLiveEnabled(false)}
            onOptionChange={patchAutoLiveOption}
            onApplyPreset={applyAutoLivePreset}
            onEnergyLooksChange={(patch) =>
              setAutoLiveState((s) => ({
                ...s,
                energyLooks: { ...s.energyLooks, ...patch },
              }))
            }
            onBandRoutingChange={(patch) =>
              setAutoLiveState((s) => ({
                ...s,
                bandRouting: { ...s.bandRouting, ...patch },
              }))
            }
            audioActive={isAudioActive}
            indicators={{
              bpm,
              masterDimmer,
              bass: audioStats.bass ?? 0,
              mid: audioStats.mid ?? 0,
              isBeatActive,
            }}
          />
        </div>
      </div>
    );
  }

  const ambianceSection = (
    <AmbianceSection
      ambianceGroups={ambianceGroups}
      linkedGroups={linkedGroups}
      toggleGroupLink={toggleGroupLink}
      groupIntensities={groupIntensities}
      groupColors={groupColors}
      isAmbianceAutoColorActive={isAmbianceAutoColorActive}
      isAmbiancePulseActive={isAmbiancePulseActive}
      activeMacro={activeMacro}
      getLinkedFixtureIds={getLinkedFixtureIds}
      sendIntensity={sendIntensity}
      sendColor={sendColor}
      handleMacro={handleMacro}
      onStrobeEdit={onStrobeEdit}
      groupStrobeValues={groupStrobeValues}
      onUserColorEdit={onUserColorEdit}
      getGroupUserColors={getGroupUserColors}
      currentMasterIntensity={currentMasterIntensity}
      groupAutoColorActive={groupAutoColorActive}
      groupPulseActive={groupPulseActive}
      customPresets={customPresets}
      applyAmbiancePreset={applyAmbiancePresetWithUndo}
      setPresetToSaveId={setPresetToSaveId}
      setIsSavePresetModalOpen={setIsSavePresetModalOpen}
      fadeTime={fadeTime}
      setFadeTime={setFadeTime}
      channels={channels}
      fixtures={fixtures}
      onGoToPatch={onGoToPatch}
      beginnerMode={liveBeginner}
      unassignedLiveGroups={unassignedLiveGroups}
      emptyPatchGroups={emptyPatchGroups}
    />
  );

  const movementSection = (
    <MovementSection
      groups={groups}
      fixtures={fixtures}
      handlePanChange={handlePanChange}
      handleTiltChange={handleTiltChange}
      handleMultiFixtureAction={handleMultiFixtureAction}
      groupColors={groupColors}
      groupIntensities={groupIntensities}
      currentMasterIntensity={currentMasterIntensity}
      groupPulseActive={groupPulseActive}
      groupAutoColorActive={groupAutoColorActive}
      groupAutoGoboActive={groupAutoGoboActive}
      groupGobos={groupGobos}
      groupPan={groupPan}
      groupTilt={groupTilt}
      setGroupPan={setGroupPan}
      setGroupTilt={setGroupTilt}
      liveGroupPositions={liveGroupPositions}
      liveGroupColors={liveGroupColors}
      liveGroupGobos={liveGroupGobos}
      sendIntensity={sendIntensity}
      sendColor={sendColor}
      sendMovement={sendMovement}
      handleMacro={handleMacro}
      onStrobeEdit={onStrobeEdit}
      groupStrobeValues={groupStrobeValues}
      channels={channels}
      updateDmx={updateDmx}
      groupMovements={groupMovements}
      onOpenEffects={(groupId, groupName, fixtureIds) => {
        setEffectsModalState({
          isOpen: true,
          groupId,
          groupName,
          fixtureIds,
        });
      }}
      groupPositions={groupPositions}
      groupCenterPositions={groupCenterPositions}
      groupMovementCenters={groupMovementCenters}
      setGroupMovementCenters={setGroupMovementCenters}
      groupMovementCenterLinked={groupMovementCenterLinked}
      setGroupMovementCenterLinked={setGroupMovementCenterLinked}
      fixtureCalibration={fixtureCalibration}
      groupQuickMovementSaves={groupQuickMovementSaves}
      groupCustomMovementSlotLinks={groupCustomMovementSlotLinks}
      groupCustomTrajectories={groupCustomTrajectories}
      setGroupMovements={setGroupMovements}
      onGoToPatch={onGoToPatch}
      beginnerMode={liveBeginner}
    />
  );

  const liveShellClass = liveCompact
    ? 'flex h-[calc(100vh-120px)] flex-col gap-2 px-2 pb-2 overflow-hidden'
    : 'flex h-[calc(100vh-128px)] flex-col gap-3 px-3 pb-3 overflow-hidden';
  const liveGridClass = liveCompact
    ? 'grid h-full grid-cols-1 xl:grid-cols-3 gap-3 min-h-0'
    : 'grid h-full grid-cols-1 xl:grid-cols-3 gap-4 min-h-0';
  const lyreGroupCount = getLiveLyreDisplayGroups(groups, fixtures).length;
  const specialGroupCount = specialLiveGroups.length;

  return (
    <div className={liveShellClass} data-live-compact={liveCompact ? 'true' : undefined}>
      <MasterGlobalSection {...masterSectionProps} />

      {dmxBanner}

      {liveBeginner && <LiveBeginnerBanner onOpenAutoLive={onOpenAutoLive} />}

      {autoLiveActiveInBackground && onOpenAutoLive && (
        <LiveAutoActiveBanner onOpenAutoLive={onOpenAutoLive} />
      )}

      {!liveBeginner && (
        <LiveManualViewSwitch view={manualView} onChange={setManualView} cueCount={cues.length} />
      )}

      <div className="flex-1 min-h-0 overflow-hidden">
        {manualView === 'cues' ? (
          <div className="h-full overflow-y-auto custom-scrollbar pr-1">
            <CueListSection
              channels={channels}
              cues={cues}
              playheadIndex={cuePlayhead}
              onPlayheadChange={syncCuePlayhead}
              onAddCue={handleAddCueWithOptionalPreset}
              onRemoveCue={removeCue}
              onReorderCue={reorderCue}
              onGoCue={handleGoCueAt}
              onGoNextCue={goNextCue}
              onCopyLiveAmbianceToPreset={saveAmbianceToPresetSlot}
            />
          </div>
        ) : (
          <div className={liveGridClass}>
            <div className="min-h-0 overflow-y-auto custom-scrollbar pr-1">{ambianceSection}</div>
            <div className="min-h-0 flex flex-col gap-1 overflow-hidden">
              {!liveBeginner && (
                <div className="flex shrink-0 items-center justify-between px-1">
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                    Lyres &amp; mouvements
                    {lyreGroupCount > 0 ? (
                      <span className="ml-2 font-mono text-blue-300/80">({lyreGroupCount})</span>
                    ) : null}
                  </h2>
                </div>
              )}
              <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar pr-1">
                {movementSection}
              </div>
            </div>
            <div className="min-h-0 flex flex-col gap-2 overflow-hidden">
              <div className="flex shrink-0 px-1">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                  Spéciaux / Divers
                  {specialGroupCount > 0 ? (
                    <span className="ml-2 font-mono text-amber-300/80">({specialGroupCount})</span>
                  ) : null}
                </h2>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar pr-1">
                <SpecialSection
                  specialGroups={specialLiveGroups}
                  fixtures={fixtures}
                  channels={channels}
                  updateDmx={updateDmx}
                  onGoToPatch={onGoToPatch}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <CalibrationModal
          isOpen={isCalibrationOpen}
          onClose={() => {
            setIsCalibrationOpen(false);
            setCalibrationFixtureFilter(null);
            setCalibrationGroupName(null);
          }}
          fixtures={fixtures}
          fixtureIdsFilter={calibrationFixtureFilter}
          filterGroupName={calibrationGroupName}
          calibration={fixtureCalibration}
          onUpdateCalibration={(id, settings) => {
            setFixtureCalibration((prev: Record<number, CalibrationSettings>) => ({
              ...prev,
              [id]: { ...(prev[id] || { invertPan: false, invertTilt: false, offsetPan: 0, offsetTilt: 0 }), ...settings }
            }));
          }}
          onReset={(id) => {
            setFixtureCalibration((prev: Record<number, CalibrationSettings>) => {
              const next = { ...prev };
              delete next[id];
              return next;
            });
          }}
        />

        <EffectsModal 
          isOpen={effectsModalState.isOpen}
          onClose={() => setEffectsModalState(prev => ({ ...prev, isOpen: false }))}
          groupId={effectsModalState.groupId}
          groupName={effectsModalState.groupName}
          fixtureIds={effectsModalState.fixtureIds}
          fixtures={fixtures}
          groupMovements={groupMovements}
          setGroupMovements={setGroupMovements}
          groupPan={groupPan}
          groupTilt={groupTilt}
          setGroupPan={setGroupPan}
          setGroupTilt={setGroupTilt}
          setGroupMovementCenters={setGroupMovementCenters}
          sendMovement={sendMovement}
          groupPositions={groupPositions}
          setGroupPositions={setGroupPositions}
          groupCenterPositions={groupCenterPositions}
          setGroupCenterPositions={setGroupCenterPositions}
          groupMovementCenters={groupMovementCenters}
          groupMovementCenterLinked={groupMovementCenterLinked}
          setGroupMovementCenterLinked={setGroupMovementCenterLinked}
          fixtureCalibration={fixtureCalibration}
          channels={channels}
          groupCustomTrajectories={groupCustomTrajectories}
          setGroupCustomTrajectories={setGroupCustomTrajectories}
          groupQuickMovementSaves={groupQuickMovementSaves}
          setGroupQuickMovementSaves={setGroupQuickMovementSaves}
          groupCustomMovementSlotLinks={groupCustomMovementSlotLinks}
          setGroupCustomMovementSlotLinks={setGroupCustomMovementSlotLinks}
          onOpenCalibration={() => {
            setCalibrationFixtureFilter(effectsModalState.fixtureIds);
            setCalibrationGroupName(effectsModalState.groupName);
            setIsCalibrationOpen(true);
          }}
        />

      <StrobeModal 
        isOpen={isStrobeModalOpen}
        onClose={() => setIsStrobeModalOpen(false)}
        tempValue={tempStrobeVal}
        onChange={setTempStrobeVal}
        onSave={() => {
          if (activeStrobeGroupId) {
            const newValue = Math.round((parseInt(tempStrobeVal) / 100) * 255);
            setGroupStrobeValues(prev => ({ ...prev, [activeStrobeGroupId]: newValue }));
          }
          setIsStrobeModalOpen(false);
        }}
      />

      <ColorPickerModal 
        isOpen={isColorModalOpen}
        onClose={() => setIsColorModalOpen(false)}
        title={`Sélecteur de couleurs ${activeColorGroupId ? '(groupe)' : '(master)'}`}
        tempColor={tempColor}
        tempHue={tempHue}
        tempSat={tempSat}
        tempLum={tempLum}
        onColorChange={setTempColor}
        onHueChange={setTempHue}
        onSatChange={setTempSat}
        onLumChange={setTempLum}
        onSave={onColorModalSave}
        colorWheelRef={colorWheelRef}
        hueSliderRef={hueSliderRef}
        handleSpectrumAction={handleSpectrumAction}
        handleHueAction={handleHueAction}
        setIsDraggingColor={setIsDraggingColor}
        setIsDraggingHue={setIsDraggingHue}
        activePresetToEdit={activePresetToEdit}
      />

      <SavePresetModal 
        isOpen={isSavePresetModalOpen}
        onClose={() => setIsSavePresetModalOpen(false)}
        defaultName={presetToSaveId ? customPresets[presetToSaveId]?.name || `Preset ${presetToSaveId}` : ""}
        onSave={(name) => {
          if (presetToSaveId) {
            const newState = captureAmbianceState(name);
            setCustomPresets(prev => ({
              ...prev,
              [presetToSaveId]: newState
            }));
          }
          setIsSavePresetModalOpen(false);
          setPresetToSaveId(null);
        }}
      />

      <LiveToast message={undoToast} onDone={() => setUndoToast(null)} />
    </div>
  );
};
