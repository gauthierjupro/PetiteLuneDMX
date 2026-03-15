import React from 'react';
import { useLiveLogic } from '../../hooks/useLiveLogic';
import { AmbianceSection } from './live/AmbianceSection';
import { MovementSection } from './live/MovementSection';
import { MasterGlobalSection } from './live/MasterGlobalSection';
import { RythmeSection } from './live/RythmeSection';
import { StrobeModal } from './live/StrobeModal';
import { ColorPickerModal } from './live/ColorPickerModal';
import { SavePresetModal } from './live/SavePresetModal';
import { CalibrationModal } from './live/CalibrationModal';
import { EffectsModal } from './live/EffectsModal';

interface CalibrationSettings {
  invertPan: boolean;
  invertTilt: boolean;
  offsetPan: number;
  offsetTilt: number;
}

interface LiveTabProps {
  fixtures: any[];
  channels: number[];
  pan: number;
  tilt: number;
  groups: any[];
  selectedGroup: string | null;
  setSelectedGroup: (id: string | null) => void;
  selectedFixtures: number[];
  setSelectedFixtures: (ids: number[]) => void;
  updateDmx: (ch: number, val: string | number) => void;
  handlePanChange: (val: string) => void;
  handleTiltChange: (val: string) => void;
  handleMultiFixtureAction: (fixtureIds: number[], action: 'dimmer' | 'color' | 'strobe' | 'pan' | 'tilt', value: any) => void;
  handleGroupAction: (groupId: string, action: 'dimmer' | 'color' | 'strobe', value: any) => void;
  handleMasterDimmer: (val: number) => void;
  handleMasterStrobe: (val: number) => void;
  onRenameGroup: (groupId: string, newName: string) => void;

  groupIntensities: Record<string, {dim: number, str: number}>;
  setGroupIntensities: React.Dispatch<React.SetStateAction<any>>;
  groupColors: Record<string, {r: number, g: number, b: number, v?: number}>;
  setGroupColors: React.Dispatch<React.SetStateAction<any>>;
  groupPulseActive: Record<string, boolean>;
  setGroupPulseActive: React.Dispatch<React.SetStateAction<any>>;
  bpm: number;
  setBpm: React.Dispatch<React.SetStateAction<any>>;
  groupMovements: Record<string, { 
    shape: 'none' | 'circle' | 'eight' | 'pan_sweep' | 'tilt_sweep' | 'custom', 
    speed: number, 
    sizePan: number,
    sizeTilt: number,
    fan: number,
    invert180: boolean,
    customPoints?: {x: number, y: number}[]
  }>;
  setGroupMovements: React.Dispatch<React.SetStateAction<any>>;
  groupPan: Record<string, number>;
  setGroupPan: React.Dispatch<React.SetStateAction<any>>;
  groupTilt: Record<string, number>;
  setGroupTilt: React.Dispatch<React.SetStateAction<any>>;
  groupAutoColorActive: Record<string, boolean>;
  setGroupAutoColorActive: React.Dispatch<React.SetStateAction<any>>;
  groupAutoGoboActive: Record<string, boolean>;
  setGroupAutoGoboActive: React.Dispatch<React.SetStateAction<any>>;
  groupGobos: Record<string, number>;
  setGroupGobos: React.Dispatch<React.SetStateAction<any>>;
  groupPositions: Record<string, { x: number, y: number, label: string }[]>;
  setGroupPositions: React.Dispatch<React.SetStateAction<any>>;
  groupMovementPresets: Record<string, { shape: string, speed: number, sizePan: number, sizeTilt: number, fan: number, invert180: boolean, label: string }[]>;
  setGroupMovementPresets: React.Dispatch<React.SetStateAction<any>>;
  groupCustomTrajectories: Record<string, { id: string, label: string, points: {x: number, y: number}[] }[]>;
  setGroupCustomTrajectories: React.Dispatch<React.SetStateAction<any>>;
  fixtureCalibration: Record<number, CalibrationSettings>;
  setFixtureCalibration: React.Dispatch<React.SetStateAction<any>>;
  liveGroupPositions: Record<string, { pan: number, tilt: number }>;
  liveGroupColors: Record<string, number>;
  liveGroupGobos: Record<string, number>;
}

export const LiveTab = (props: LiveTabProps) => {
  const {
    fixtures, channels, pan, tilt, groups, selectedGroup, setSelectedGroup,
    selectedFixtures, setSelectedFixtures, updateDmx, handlePanChange, handleTiltChange,
    handleMultiFixtureAction, handleGroupAction, handleMasterDimmer, handleMasterStrobe,
    onRenameGroup, groupIntensities, setGroupIntensities, groupColors, setGroupColors,
    groupPulseActive, setGroupPulseActive, bpm, setBpm, groupMovements, setGroupMovements,
    groupPan, setGroupPan, groupTilt, setGroupTilt, groupAutoColorActive, setGroupAutoColorActive,
    groupAutoGoboActive, setGroupAutoGoboActive, groupGobos, setGroupGobos, groupPositions,
    setGroupPositions, groupMovementPresets, setGroupMovementPresets, groupCustomTrajectories,
    setGroupCustomTrajectories, fixtureCalibration, setFixtureCalibration, liveGroupPositions,
    liveGroupColors, liveGroupGobos
  } = props;

  const logic = useLiveLogic({
    fixtures, channels, groups, updateDmx, handleMultiFixtureAction,
    handleMasterDimmer, handleMasterStrobe, groupIntensities, setGroupIntensities,
    groupColors, setGroupColors, groupPulseActive, setGroupPulseActive, bpm, setBpm,
    groupAutoColorActive, setGroupAutoColorActive, groupAutoGoboActive, setGroupAutoGoboActive,
    groupGobos, setGroupGobos, groupPan, setGroupPan, groupTilt, setGroupTilt,
    fixtureCalibration, setFixtureCalibration
  });

  const {
    isBeatActive, isAudioActive, setIsAudioActive, audioDevices, selectedAudioDeviceId,
    setSelectedAudioDeviceId, audioStats, linkedGroups, masterVal, globalStrobe,
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

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 overflow-hidden">
      
      {/* COLONNE PRINCIPALE (Gaucher) */}
      <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-8 pb-20">
        
        {/* SECTION MASTER GLOBAL (Format Ultra-Compact) */}
        <MasterGlobalSection 
          masterVal={masterVal}
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
          applyAmbiancePreset={applyAmbiancePreset}
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
        {/* Masqué car remplacé par les modales d'effets par groupe */}
        {false && <RythmeSection 
          fixtures={fixtures}
          channels={channels}
          updateDmx={updateDmx}
        />}
      </div>

      {/* MODALES DE RÉGLAGES */}
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
        title={`SÉLECTEUR DE COULEURS ${activeColorGroupId ? '(GROUPE)' : '(MASTER)'}`}
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
