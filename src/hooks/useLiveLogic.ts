import type { UseLiveLogicProps } from './live/types';
import { useLiveAmbiancePresets } from './live/useLiveAmbiancePresets';
import { useLiveActions } from './live/useLiveActions';
import { useLiveBpm } from './live/useLiveBpm';
import { useLiveColorPicker } from './live/useLiveColorPicker';
import { useLiveEffectTimers } from './live/useLiveEffectTimers';
import { useLiveSessionState } from './live/useLiveSessionState';

export type { UseLiveLogicProps } from './live/types';

/**
 * Façade Live — compose les sous-hooks :
 * session, BPM/audio, presets ambiance, actions DMX, color picker, timers pulse/auto-color.
 */
export const useLiveLogic = (props: UseLiveLogicProps) => {
  const {
    fixtures,
    groups,
    updateDmx,
    handleMultiFixtureAction,
    handleMasterDimmer,
    masterDimmer,
    handleMasterStrobe,
    groupIntensities,
    setGroupIntensities,
    groupColors,
    setGroupColors,
    groupPulseActive,
    setGroupPulseActive,
    bpm,
    setBpm,
    groupAutoColorActive,
    setGroupAutoColorActive,
    groupAutoGoboActive,
    setGroupAutoGoboActive,
    setGroupGobos,
    setGroupPan,
    setGroupTilt,
    fixtureCalibration,
  } = props;

  const session = useLiveSessionState({
    groups,
    groupIntensities,
    groupColors,
    handleMultiFixtureAction,
    setGroupAutoColorActive,
    setGroupPulseActive,
    masterDimmer,
  });

  const bpmLogic = useLiveBpm(bpm, setBpm);

  const ambiancePresets = useLiveAmbiancePresets({
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
  });

  const actions = useLiveActions({
    fixtures,
    groups,
    updateDmx,
    handleMultiFixtureAction,
    handleMasterDimmer,
    handleMasterStrobe,
    linkedGroups: session.linkedGroups,
    getLinkedFixtureIds: session.getLinkedFixtureIds,
    groupIntensities,
    setGroupIntensities,
    groupColors,
    setGroupColors,
    groupPulseActive,
    setGroupPulseActive,
    groupAutoColorActive,
    setGroupAutoColorActive,
    groupAutoGoboActive,
    setGroupAutoGoboActive,
    setGroupGobos,
    setGroupPan,
    setGroupTilt,
    fixtureCalibration,
    isAmbianceAutoColorActive: session.isAmbianceAutoColorActive,
    setIsAmbianceAutoColorActive: session.setIsAmbianceAutoColorActive,
    isAmbiancePulseActive: session.isAmbiancePulseActive,
    setIsAmbiancePulseActive: session.setIsAmbiancePulseActive,
    setCurrentMasterIntensity: session.setCurrentMasterIntensity,
    setGlobalStrobe: session.setGlobalStrobe,
    setIsAutoColorActive: session.setIsAutoColorActive,
  });

  const colorPicker = useLiveColorPicker({
    groups,
    getLinkedFixtureIds: session.getLinkedFixtureIds,
    sendColor: actions.sendColor,
    setCustomPresets: ambiancePresets.setCustomPresets,
  });

  useLiveEffectTimers({
    bpm,
    masterDimmer,
    isAutoColorActive: session.isAutoColorActive,
    isPulseActive: session.isPulseActive,
    handleGlobalAction: actions.handleGlobalAction,
    setCurrentMasterIntensity: session.setCurrentMasterIntensity,
  });

  return {
    // States
    presets: session.presets,
    tapTimes: bpmLogic.tapTimes,
    isBeatActive: bpmLogic.isBeatActive,
    isAudioActive: bpmLogic.isAudioActive,
    setIsAudioActive: bpmLogic.setIsAudioActive,
    audioDevices: bpmLogic.audioDevices,
    selectedAudioDeviceId: bpmLogic.selectedAudioDeviceId,
    setSelectedAudioDeviceId: bpmLogic.setSelectedAudioDeviceId,
    audioStats: bpmLogic.audioStats,
    linkedGroups: session.linkedGroups,
    masterDimmer,
    globalStrobe: session.globalStrobe,
    isAutoColorActive: session.isAutoColorActive,
    setIsAutoColorActive: session.setIsAutoColorActive,
    isPulseActive: session.isPulseActive,
    setIsPulseActive: session.setIsPulseActive,
    isAmbianceAutoColorActive: session.isAmbianceAutoColorActive,
    setIsAmbianceAutoColorActive: session.setIsAmbianceAutoColorActive,
    isAmbiancePulseActive: session.isAmbiancePulseActive,
    setIsAmbiancePulseActive: session.setIsAmbiancePulseActive,
    groupStrobeValues: session.groupStrobeValues,
    setGroupStrobeValues: session.setGroupStrobeValues,
    currentMasterIntensity: session.currentMasterIntensity,
    activeMacro: actions.activeMacro,
    fadeTime: session.fadeTime,
    setFadeTime: session.setFadeTime,
    customPresets: ambiancePresets.customPresets,
    setCustomPresets: ambiancePresets.setCustomPresets,
    userColors: colorPicker.userColors,
    setUserColors: colorPicker.setUserColors,

    // Modal states
    isCalibrationOpen: session.isCalibrationOpen,
    setIsCalibrationOpen: session.setIsCalibrationOpen,
    isStrobeModalOpen: session.isStrobeModalOpen,
    setIsStrobeModalOpen: session.setIsStrobeModalOpen,
    isColorModalOpen: colorPicker.isColorModalOpen,
    setIsColorModalOpen: colorPicker.setIsColorModalOpen,
    isSavePresetModalOpen: session.isSavePresetModalOpen,
    setIsSavePresetModalOpen: session.setIsSavePresetModalOpen,
    activeStrobeGroupId: session.activeStrobeGroupId,
    activeColorGroupId: colorPicker.activeColorGroupId,
    presetToSaveId: session.presetToSaveId,
    setPresetToSaveId: session.setPresetToSaveId,
    activeUserColorToEdit: colorPicker.activeUserColorToEdit,
    activePresetToEdit: colorPicker.activePresetToEdit,
    setActivePresetToEdit: colorPicker.setActivePresetToEdit,
    tempColor: colorPicker.tempColor,
    setTempColor: colorPicker.setTempColor,
    tempHue: colorPicker.tempHue,
    setTempHue: colorPicker.setTempHue,
    tempSat: colorPicker.tempSat,
    setTempSat: colorPicker.setTempSat,
    tempLum: colorPicker.tempLum,
    setTempLum: colorPicker.setTempLum,
    tempStrobeVal: session.tempStrobeVal,
    setTempStrobeVal: session.setTempStrobeVal,
    isDraggingColor: colorPicker.isDraggingColor,
    setIsDraggingColor: colorPicker.setIsDraggingColor,
    isDraggingHue: colorPicker.isDraggingHue,
    setIsDraggingHue: colorPicker.setIsDraggingHue,
    effectsModalState: session.effectsModalState,
    setEffectsModalState: session.setEffectsModalState,

    // Refs
    colorWheelRef: colorPicker.colorWheelRef,
    hueSliderRef: colorPicker.hueSliderRef,

    // Logic functions
    captureAmbianceState: ambiancePresets.captureAmbianceState,
    applyAmbiancePreset: ambiancePresets.applyAmbiancePreset,
    sendIntensity: actions.sendIntensity,
    sendColor: actions.sendColor,
    handleGlobalAction: actions.handleGlobalAction,
    handleMacro: actions.handleMacro,
    sendMovement: actions.sendMovement,
    handleEndOfSong: actions.handleEndOfSong,
    handleTap: bpmLogic.handleTap,
    toggleGroupLink: session.toggleGroupLink,
    onStrobeEdit: session.onStrobeEdit,
    onUserColorEdit: colorPicker.onUserColorEdit,
    handleSpectrumAction: colorPicker.handleSpectrumAction,
    handleHueAction: colorPicker.handleHueAction,
    getGroupUserColors: colorPicker.getGroupUserColors,
    getLinkedFixtureIds: session.getLinkedFixtureIds,
    onColorModalSave: colorPicker.onColorModalSave,
  };
};
