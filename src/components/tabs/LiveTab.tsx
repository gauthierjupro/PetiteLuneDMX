import React, { useCallback, useMemo, useRef } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { useLiveLogic } from '../../hooks/useLiveLogic';
import { useCueList } from '../../hooks/useCueList';
import { CueListSection } from './live/CueListSection';
import { useLiveKeyboardShortcuts } from '../../hooks/live/useLiveKeyboardShortcuts';
import { useLiveUndo } from '../../hooks/live/useLiveUndo';
import type { ShowCue } from '../../types';
import { AmbianceSection } from './live/AmbianceSection';
import { MovementSection } from './live/MovementSection';
import { MasterGlobalSection } from './live/MasterGlobalSection';
import { RythmeSection } from './live/RythmeSection';
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
  LivePanTilt,
  MovementPreset,
  RgbColor,
} from '../../types';

interface LiveTabProps {
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
  groupMovementPresets: Record<string, MovementPreset[]>;
  setGroupMovementPresets: React.Dispatch<React.SetStateAction<Record<string, MovementPreset[]>>>;
  groupCustomTrajectories: Record<string, CustomTrajectory[]>;
  setGroupCustomTrajectories: React.Dispatch<React.SetStateAction<Record<string, CustomTrajectory[]>>>;
  fixtureCalibration: Record<number, CalibrationSettings>;
  setFixtureCalibration: React.Dispatch<React.SetStateAction<Record<number, CalibrationSettings>>>;
  liveGroupPositions: Record<string, LivePanTilt>;
  liveGroupColors: Record<string, number>;
  liveGroupGobos: Record<string, number>;
}

export const LiveTab = (props: LiveTabProps) => {
  const {
    fixtures, channels, pan, tilt, groups, selectedGroup, setSelectedGroup,
    selectedFixtures, setSelectedFixtures, updateDmx, handlePanChange, handleTiltChange,
    handleMultiFixtureAction, handleGroupAction, handleMasterDimmer, applyGlobalIntensity, masterDimmer, handleMasterStrobe,
    onRenameGroup, groupIntensities, setGroupIntensities, groupColors, setGroupColors,
    groupPulseActive, setGroupPulseActive, bpm, setBpm, groupMovements, setGroupMovements,
    groupPan, setGroupPan, groupTilt, setGroupTilt, groupAutoColorActive, setGroupAutoColorActive,
    groupAutoGoboActive, setGroupAutoGoboActive, groupGobos, setGroupGobos, groupPositions,
    setGroupPositions, groupMovementPresets, setGroupMovementPresets, groupCustomTrajectories,
    setGroupCustomTrajectories, fixtureCalibration, setFixtureCalibration, liveGroupPositions,
    liveGroupColors, liveGroupGobos
  } = props;

  const { cues, addCueFromChannels, removeCue, reorderCue } = useCueList();
  const cueIndexRef = useRef(0);
  const { pushSnapshot, popSnapshot } = useLiveUndo();

  const handleGoCue = useCallback(
    async (cue: ShowCue) => {
      for (let i = 0; i < cue.channels.length; i++) {
        if (cue.channels[i] !== channels[i]) {
          await updateDmx(i, cue.channels[i]);
        }
      }
    },
    [channels, updateDmx]
  );

  const logic = useLiveLogic({
    fixtures, channels, groups, updateDmx, handleMultiFixtureAction,
    handleMasterDimmer, applyGlobalIntensity, masterDimmer, handleMasterStrobe, groupIntensities, setGroupIntensities,
    groupColors, setGroupColors, groupPulseActive, setGroupPulseActive, bpm, setBpm,
    groupAutoColorActive, setGroupAutoColorActive, groupAutoGoboActive, setGroupAutoGoboActive,
    groupGobos, setGroupGobos, groupPan, setGroupPan, groupTilt, setGroupTilt,
    fixtureCalibration, setFixtureCalibration
  });

  const {
    isBeatActive, isAudioActive, setIsAudioActive, audioDevices, selectedAudioDeviceId,
    setSelectedAudioDeviceId, audioStats, linkedGroups, globalStrobe,
    isAmbianceAutoColorActive, isAmbiancePulseActive, groupStrobeValues, setGroupStrobeValues,
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

  const ambianceGroups = groups.filter(g => 
    g.fixtureIds.length > 0 && 
    g.isAmbiance === true
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

  const goNextCue = useCallback(() => {
    if (cues.length === 0) return;
    const idx = cueIndexRef.current % cues.length;
    void handleGoCue(cues[idx]);
    cueIndexRef.current = (idx + 1) % cues.length;
  }, [cues, handleGoCue]);

  const onBlackout = useCallback(async () => {
    await invoke('blackout');
    handleGlobalAction('dimmer', 0);
  }, [handleGlobalAction]);

  const onUndoLive = useCallback(() => {
    const snap = popSnapshot();
    if (!snap) return;
    handleMasterDimmer(snap.masterDimmer);
    setGroupIntensities(snap.groupIntensities);
    setGroupColors(snap.groupColors);
    setGroupAutoColorActive(snap.groupAutoColorActive);
    setGroupPulseActive(snap.groupPulseActive);
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
      onTapTempo: handleTap,
      onGoCue: goNextCue,
      onUndo: onUndoLive,
    }),
    [onBlackout, handleTap, goNextCue, onUndoLive]
  );

  useLiveKeyboardShortcuts(true, keyboardActions);

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 overflow-hidden">
      
      {/* COLONNE PRINCIPALE (Gaucher) */}
      <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-8 pb-20">
        
        {/* SECTION MASTER GLOBAL (Format Ultra-Compact) */}
        <CueListSection
          channels={channels}
          cues={cues}
          onAddCue={addCueFromChannels}
          onRemoveCue={removeCue}
          onReorderCue={reorderCue}
          onGoCue={handleGoCue}
        />

        <MasterGlobalSection 
          masterVal={masterDimmer}
          globalStrobe={globalStrobe}
          handleGlobalAction={handleGlobalAction}
          handleEndOfSong={handleEndOfSong}
          bpm={bpm}
          setBpm={setBpm}
          isAudioActive={isAudioActive}
          setIsAudioActive={setIsAudioActive}
          handleTap={handleTap}
          isBeatActive={isBeatActive}
          audioDevices={audioDevices}
          selectedAudioDeviceId={selectedAudioDeviceId}
          setSelectedAudioDeviceId={setSelectedAudioDeviceId}
          audioStats={audioStats}
        />

        {/* SECTION AMBIANCES */}
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
        />

        {/* SECTION MOUVEMENTS (LYRES) */}
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
          onOpenCalibration={() => setIsCalibrationOpen(true)}
          onOpenEffects={(groupId, groupName, fixtureIds) => {
            setEffectsModalState({
              isOpen: true,
              groupId,
              groupName,
              fixtureIds
            });
          }}
          groupPositions={groupPositions}
          groupMovementPresets={groupMovementPresets}
          setGroupMovements={setGroupMovements}
        />

        <CalibrationModal 
          isOpen={isCalibrationOpen}
          onClose={() => setIsCalibrationOpen(false)}
          fixtures={fixtures}
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
          sendMovement={sendMovement}
          groupPositions={groupPositions}
          setGroupPositions={setGroupPositions}
          groupMovementPresets={groupMovementPresets}
          setGroupMovementPresets={setGroupMovementPresets}
          groupCustomTrajectories={groupCustomTrajectories}
          setGroupCustomTrajectories={setGroupCustomTrajectories}
        />

        {/* SECTION RYTHME ET EFFETS */}
        {/* Masqu├® car remplac├® par les modales d'effets par groupe */}
        {false && <RythmeSection 
          fixtures={fixtures}
          channels={channels}
          updateDmx={updateDmx}
        />}
      </div>

      {/* MODALES DE R├ëGLAGES */}
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
        title={`S├ëLECTEUR DE COULEURS ${activeColorGroupId ? '(GROUPE)' : '(MASTER)'}`}
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
    </div>
  );
};
