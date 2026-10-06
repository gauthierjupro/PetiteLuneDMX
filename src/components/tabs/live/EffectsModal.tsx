import React from 'react';
import { Modal } from '../../ui/Modal';
import { ConfirmModal } from '../../ui/ConfirmModal';
import { ValuePromptModal } from '../../ui/ValuePromptModal';
import { Move, Square, FlipHorizontal2, Save, Edit2, Link2, Link2Off, RefreshCcw, Plus, Trash2, Play, HelpCircle } from 'lucide-react';
import { ControlSlider } from '../../ui/ControlSlider';
import { XYPad } from '../../ui/XYPad';
import { Tooltip } from '../../ui/Tooltip';
import type {
  CustomTrajectory,
  Fixture,
  GroupMovement,
  CalibrationSettings,
  GroupPosition,
  GroupQuickMovementSaves,
  GroupCustomMovementSlotLinks,
} from '../../../types';
import { FixedPositionMemoryButton } from './FixedPositionMemoryButton';
import {
  captureGroupPositionFromLive,
  getMovingHeadIds,
  positionMemoryDisplayDots,
  positionMemoryPerFixtureVisual,
  readLogicalPanTiltFromChannels,
  recallGroupPosition,
} from '../../../utils/groupPositionFixtures';
import { fixtureIsMovementCapable } from '../../../utils/autoLiveGroups';
import { CentreApercuPad } from './CentreApercuPad';
import { MovementSimpleControls } from './MovementSimpleControls';
import { MovementQuickPresetGrid } from './MovementQuickPresetGrid';
import {
  getStopGroupMovement,
  QUICK_MOVEMENT_PRESETS,
  type QuickMovementPresetId,
  type StandardShapePresetId,
} from '../../../utils/movementQuickPresets';
import { getGroupCenterPosition } from '../../../utils/groupMovementCenter';
import {
  applySavedMovementCenters,
  isGroupMovementCenterLinked,
  movementCenterListForHeads,
  snapshotMovementCenterFields,
} from '../../../utils/groupMovementCenters';
import { useMotionPreviewDots } from '../../../hooks/useMotionPreviewDots';
import {
  getQuickMovementSave,
  removeQuickMovementSave,
} from '../../../utils/movementQuickSaves';
import {
  buildQuickMovementSaveForPersoSlot,
  clearCustomSlotLink,
  applyMovementButtonDisplayName,
  inferPersoSlotLinkFromMovement,
  getMovementPresetLink,
  pruneSlotLinksAfterTrajectoryDelete,
  resolvePersoSlotApply,
  slotLinkForShape,
  slotLinkForTrajectory,
} from '../../../utils/movementCustomSlots';

const MOVEMENT_ADVANCED_KEY = 'pldmx_movement_advanced';

interface EffectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  fixtureIds: number[];
  fixtures: Fixture[];
  groupMovements: Record<string, GroupMovement>;
  setGroupMovements: React.Dispatch<React.SetStateAction<Record<string, GroupMovement>>>;
  groupPan: Record<string, number>;
  groupTilt: Record<string, number>;
  groupMovementCenters: Record<string, Record<string, { x: number; y: number }>>;
  groupMovementCenterLinked: Record<string, boolean>;
  setGroupMovementCenterLinked: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  sendMovement: (
    ids: number[],
    x: number,
    y: number,
    gid: string,
    options?: { onlyFixtureId?: number }
  ) => void;
  channels: number[];
  fixtureCalibration: Record<number, CalibrationSettings>;
  groupPositions: Record<string, GroupPosition[]>;
  setGroupPositions: React.Dispatch<React.SetStateAction<Record<string, GroupPosition[]>>>;
  groupCenterPositions: Record<string, GroupPosition>;
  setGroupCenterPositions: React.Dispatch<
    React.SetStateAction<Record<string, GroupPosition>>
  >;
  groupCustomTrajectories: Record<string, CustomTrajectory[]>;
  setGroupCustomTrajectories: React.Dispatch<React.SetStateAction<Record<string, CustomTrajectory[]>>>;
  groupQuickMovementSaves: GroupQuickMovementSaves;
  setGroupQuickMovementSaves: React.Dispatch<
    React.SetStateAction<GroupQuickMovementSaves>
  >;
  groupCustomMovementSlotLinks: GroupCustomMovementSlotLinks;
  setGroupCustomMovementSlotLinks: React.Dispatch<
    React.SetStateAction<GroupCustomMovementSlotLinks>
  >;
}

export const EffectsModal = ({
  isOpen,
  onClose,
  groupId,
  groupName,
  fixtureIds,
  fixtures,
  groupMovements,
  setGroupMovements,
  groupPan,
  groupTilt,
  groupMovementCenters,
  groupMovementCenterLinked,
  setGroupMovementCenterLinked,
  sendMovement,
  groupPositions,
  setGroupPositions,
  groupCenterPositions,
  setGroupCenterPositions,
  groupCustomTrajectories,
  setGroupCustomTrajectories,
  groupQuickMovementSaves,
  setGroupQuickMovementSaves,
  groupCustomMovementSlotLinks,
  setGroupCustomMovementSlotLinks,
  channels,
  fixtureCalibration,
}: EffectsModalProps) => {
  const config = groupMovements[groupId] || { shape: 'none', speed: 128, sizePan: 64, sizeTilt: 64, fan: 0, invert180: false };
  const centerX = groupPan[groupId] ?? 127;
  const centerY = groupTilt[groupId] ?? 127;
  const [isLinked, setIsLinked] = React.useState(true);
  const [advancedMode, setAdvancedMode] = React.useState(
    () => localStorage.getItem(MOVEMENT_ADVANCED_KEY) === '1'
  );
  const positions = groupPositions[groupId] || [
    { x: 127, y: 127, label: 'Position 1' },
    { x: 127, y: 127, label: 'Position 2' },
    { x: 127, y: 127, label: 'Position 3' },
    { x: 127, y: 127, label: 'Position 4' },
  ];

  const isMovementTarget = (id: number) => {
    const f = fixtures.find((fx) => fx.id === id);
    return f != null && fixtureIsMovementCapable(f);
  };
  const movingHeadIds = getMovingHeadIds(fixtureIds, isMovementTarget);
  const centerLinked = isGroupMovementCenterLinked(
    groupId,
    groupMovementCenterLinked
  );

  const readFixturePanTilt = (fixtureId: number) => {
    const fixture = fixtures.find((f) => f.id === fixtureId);
    if (!fixture) return { x: centerX, y: centerY };
    return readLogicalPanTiltFromChannels(
      fixture,
      channels,
      fixtureCalibration[fixtureId]
    );
  };

  const captureLivePosition = (base: GroupPosition) =>
    captureGroupPositionFromLive(
      base,
      movingHeadIds,
      { x: centerX, y: centerY },
      readFixturePanTilt
    );

  const sendPadMovement = (nx: number, ny: number) => {
    sendMovement(fixtureIds, nx, ny, groupId);
  };

  const moveCentreLinked = (nx: number, ny: number) => {
    sendMovement(fixtureIds, nx, ny, groupId);
  };

  const handleSavePosition = (index: number) => {
    const newPositions = [...positions];
    newPositions[index] = captureLivePosition(newPositions[index]);
    setGroupPositions((prev: Record<string, GroupPosition[]>) => ({
      ...prev,
      [groupId]: newPositions,
    }));
  };

  const handleRenamePosition = (index: number) => {
    setValuePrompt({
      title: 'Renommer la position',
      label: 'Nom affiché sur la carte lyre',
      defaultValue: positions[index].label,
      onSubmit: (newLabel) => {
        const newPositions = [...positions];
        newPositions[index] = { ...newPositions[index], label: newLabel.trim() || positions[index].label };
        setGroupPositions((prev: any) => ({ ...prev, [groupId]: newPositions }));
      },
    });
  };

  const centerPosition = getGroupCenterPosition(groupId, groupCenterPositions);

  const handleSaveCenterPosition = () => {
    setGroupCenterPositions((prev) => ({
      ...prev,
      [groupId]: captureLivePosition(centerPosition),
    }));
  };

  const handleRenameCenterPosition = () => {
    setValuePrompt({
      title: 'Renommer le centre',
      label: 'Nom affiché sur la carte lyre',
      defaultValue: centerPosition.label,
      onSubmit: (newLabel) => {
        setGroupCenterPositions((prev) => ({
          ...prev,
          [groupId]: {
            ...centerPosition,
            label: newLabel.trim() || centerPosition.label,
          },
        }));
      },
    });
  };

  const movingHeadCount = movingHeadIds.length;

  const motionCenters = React.useMemo(
    () =>
      movementCenterListForHeads(
        groupId,
        movingHeadIds,
        groupPan,
        groupTilt,
        groupMovementCenters,
        centerLinked
      ),
    [
      groupId,
      movingHeadIds,
      groupPan,
      groupTilt,
      groupMovementCenters,
      centerLinked,
    ]
  );
  const previewDots = useMotionPreviewDots(
    config,
    motionCenters,
    movingHeadCount,
    isOpen && config.shape !== 'none'
  );
  const primaryPreview = previewDots[0];

  // État pour le générateur de trajectoire personnalisée (Points)
  const [localCustomPoints, setLocalCustomPoints] = React.useState<{x: number, y: number}[]>(config.customPoints || []);
  const [isRecording, setIsRecording] = React.useState(false);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [selectedPointIndex, setSelectedPointIndex] = React.useState<number | null>(null);
  const useCentreApercuPad =
    !isRecording && !isEditMode && selectedPointIndex === null;
  const centrePadPerFixture =
    useCentreApercuPad &&
    movingHeadIds.length >= 2 &&
    !centerLinked;
  const liveHeadPanTilt = movingHeadIds.map((id, index) => ({
    id,
    index,
    ...readFixturePanTilt(id),
  }));
  // Point fantôme pour prévisualiser le futur point pendant l'enregistrement
  const [phantomPoint, setPhantomPoint] = React.useState<{x: number, y: number} | null>(null);
  const [trajMenu, setTrajMenu] = React.useState<{id: string, x: number, y: number} | null>(null);
  const [movementPresetToast, setMovementPresetToast] = React.useState<string | null>(null);
  const [deleteTrajId, setDeleteTrajId] = React.useState<string | null>(null);
  const [valuePrompt, setValuePrompt] = React.useState<{
    title: string;
    label: string;
    defaultValue: string;
    onSubmit: (value: string) => void;
  } | null>(null);

  const customTrajectories = groupCustomTrajectories[groupId] || [];

  const handleAddPoint = () => {
    if (phantomPoint) {
      setLocalCustomPoints(prev => [...prev, phantomPoint]);
      // Le prochain point fantôme sera au même endroit pour continuer
      setSelectedPointIndex(null);
    }
  };

  const handleUpdatePoint = (nx: number, ny: number) => {
    if (selectedPointIndex !== null && isEditMode) {
      const newPoints = [...localCustomPoints];
      newPoints[selectedPointIndex] = { x: nx, y: ny };
      setLocalCustomPoints(newPoints);
      // On met à jour le moteur global pour que la trajectoire en cours de lecture
      // prenne en compte la modification du point immédiatement
      if (config.shape === 'custom') {
        updateConfig({ shape: 'custom', customPoints: newPoints });
      }
      // On envoie la commande DMX uniquement si on n'est pas en train de lire
      // (car si on lit, c'est le moteur principal qui pilote la lyre)
      if (config.shape === 'none' && !isRecording) {
        sendPadMovement(nx, ny);
      }
    } else if (isRecording) {
      setPhantomPoint({ x: nx, y: ny });
      sendPadMovement(nx, ny);
    } else {
      sendPadMovement(nx, ny);
    }
  };

  const handleInsertPoint = () => {
    // Insère un point au centre après le point sélectionné ou à la fin
    const insertIndex = selectedPointIndex !== null ? selectedPointIndex + 1 : localCustomPoints.length;
    const newPoints = [...localCustomPoints];
    newPoints.splice(insertIndex, 0, { x: 127, y: 127 });
    setLocalCustomPoints(newPoints);
    setSelectedPointIndex(insertIndex);
    if (config.shape === 'custom') {
      updateConfig({ shape: 'custom', customPoints: newPoints });
    }
  };

  const commitSaveTrajectory = (name: string) => {
    const label = name.trim() || `Trajet ${customTrajectories.length + 1}`;
    const newTraj = {
      id: Date.now().toString(),
      label,
      points: localCustomPoints,
    };

    setGroupCustomTrajectories((prev: any) => ({
      ...prev,
      [groupId]: [...(prev[groupId] || []), newTraj],
    }));

    updateConfig({ shape: 'custom', customPoints: localCustomPoints });
  };

  const handleSaveTrajectory = () => {
    if (localCustomPoints.length < 2) return;
    setValuePrompt({
      title: 'Enregistrer la trajectoire',
      label: 'Nom dans la bibliothèque',
      defaultValue: `Trajet ${customTrajectories.length + 1}`,
      onSubmit: commitSaveTrajectory,
    });
  };

  const handleLoadTrajectory = (traj: any) => {
    setLocalCustomPoints(traj.points);
    updateConfig({ shape: 'custom', customPoints: traj.points });
    setSelectedPointIndex(null);
  };

  const handleDeleteTrajectory = (trajId: string) => {
    setGroupCustomTrajectories((prev: any) => ({
      ...prev,
      [groupId]: (prev[groupId] || []).filter((t: any) => t.id !== trajId)
    }));
    setGroupCustomMovementSlotLinks((prev) =>
      pruneSlotLinksAfterTrajectoryDelete(prev, groupId, trajId)
    );
  };

  const updateConfig = (newConfig: Partial<typeof config>) => {
    let finalConfig = { ...newConfig };
    
    if (isLinked) {
      if ('sizePan' in newConfig && !('sizeTilt' in newConfig)) {
        finalConfig.sizeTilt = newConfig.sizePan;
      } else if ('sizeTilt' in newConfig && !('sizePan' in newConfig)) {
        finalConfig.sizePan = newConfig.sizeTilt;
      }
    }

    setGroupMovements((prev: any) => {
      const current = prev[groupId] || config;
      return {
        ...prev,
        [groupId]: { ...current, ...finalConfig }
      };
    });
  };

  const handleRenameTrajectory = (trajId: string) => {
    const traj = customTrajectories.find((t) => t.id === trajId);
    if (!traj) return;
    setValuePrompt({
      title: 'Renommer la trajectoire',
      label: 'Nom',
      defaultValue: traj.label,
      onSubmit: (newName) => {
        const label = newName.trim() || traj.label;
        setGroupCustomTrajectories((prev: any) => ({
          ...prev,
          [groupId]: (prev[groupId] || []).map((t: any) =>
            t.id === trajId ? { ...t, label } : t
          ),
        }));
      },
    });
  };

  const handleEditTrajectoryPoints = (trajId: string) => {
    const traj = customTrajectories.find(t => t.id === trajId);
    if (!traj) return;
    handleLoadTrajectory(traj);
    setIsEditMode(true);
    setTrajMenu(null);
  };

  const applyQuickPreset = (id: QuickMovementPresetId) => {
    const saved = getQuickMovementSave(groupQuickMovementSaves, groupId, id);
    const link = getMovementPresetLink(
      groupCustomMovementSlotLinks,
      groupId,
      id,
      groupQuickMovementSaves
    );
    if (!link) {
      setMovementPresetToast('Inactif — clic droit sur un bouton pour enregistrer');
      return;
    }
    const resolved = resolvePersoSlotApply(
      id,
      link,
      saved,
      customTrajectories
    );
    if (!resolved) {
      setMovementPresetToast('Trajectoire introuvable — reprogrammez ce bouton');
      return;
    }
    const { movement } = resolved;
    setGroupMovements((prev: Record<string, GroupMovement>) => ({
      ...prev,
      [groupId]: movement,
    }));
    applySavedMovementCenters(
      saved,
      groupId,
      fixtureIds,
      movingHeadIds,
      sendMovement,
      setGroupMovementCenterLinked
    );
    if (movement.customPoints?.length) {
      setLocalCustomPoints(movement.customPoints);
    }
  };

  const saveQuickPreset = (id: QuickMovementPresetId): boolean => {
    const link = inferPersoSlotLinkFromMovement(config, customTrajectories);
    if (!link) {
      if (config.shape === 'custom') {
        setMovementPresetToast(
          'Trajectoire perso : enregistrez-la d’abord dans la bibliothèque'
        );
      } else {
        setMovementPresetToast(
          'Chargez un mouvement (bibliothèque) puis clic droit sur le bouton'
        );
      }
      return false;
    }
    setGroupCustomMovementSlotLinks((prev) => {
      const prevSlot = prev[groupId]?.[id];
      const base =
        link.type === 'shape'
          ? slotLinkForShape(link.presetId)
          : slotLinkForTrajectory(link.trajectoryId);
      return {
        ...prev,
        [groupId]: {
          ...(prev[groupId] ?? {}),
          [id]: {
            ...base,
            displayName: prevSlot?.displayName,
          },
        },
      };
    });
    const centerFields = snapshotMovementCenterFields(
      groupId,
      centerLinked,
      groupPan,
      groupTilt,
      groupMovementCenters
    );
    const snapshot = buildQuickMovementSaveForPersoSlot(
      id,
      link,
      config,
      centerFields.centerPan,
      centerFields.centerTilt,
      customTrajectories,
      {
        movementCenterLinked: centerFields.movementCenterLinked,
        movementCentersPerFixture: centerFields.movementCentersPerFixture,
      }
    );
    setGroupQuickMovementSaves((prev) => ({
      ...prev,
      [groupId]: { ...(prev[groupId] ?? {}), [id]: snapshot },
    }));
    setMovementPresetToast('Mémorisé (carte lyre synchronisée)');
    return true;
  };

  const clearQuickPreset = (id: QuickMovementPresetId) => {
    setGroupQuickMovementSaves((prev) => removeQuickMovementSave(prev, groupId, id));
    setGroupCustomMovementSlotLinks((prev) =>
      clearCustomSlotLink(prev, groupId, id)
    );
    setMovementPresetToast('Supprimé (carte lyre synchronisée)');
  };

  const renameQuickPreset = (id: QuickMovementPresetId, currentLabel: string) => {
    const parsedLink = getMovementPresetLink(
      groupCustomMovementSlotLinks,
      groupId,
      id,
      groupQuickMovementSaves
    );
    if (!parsedLink) {
      setMovementPresetToast('Mémorisez d’abord un mouvement sur ce bouton');
      return;
    }
    setValuePrompt({
      title: 'Renommer le bouton',
      label: 'Nom affiché sur la carte lyre',
      defaultValue: currentLabel,
      onSubmit: (value) => {
        const name = value.trim();
        if (!name) return;
        setGroupCustomMovementSlotLinks((prev) =>
          applyMovementButtonDisplayName(
            prev,
            groupId,
            id,
            name,
            parsedLink
          )
        );
        setMovementPresetToast('Nom mis à jour');
      },
    });
  };

  const loadShapeFromLibrary = (shapePresetId: StandardShapePresetId) => {
    const base = QUICK_MOVEMENT_PRESETS.find((p) => p.id === shapePresetId);
    if (!base) return;
    // Bibliothèque = forme seulement ; vitesse / amplitude / centre viennent des réglages ou d’un mvt mémorisé.
    updateConfig({ shape: base.movement.shape });
    setMovementPresetToast(
      `Forme : ${base.label} — ajustez les réglages puis mémorisez sur un bouton`
    );
  };

  React.useEffect(() => {
    if (!movementPresetToast) return;
    const t = window.setTimeout(() => setMovementPresetToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [movementPresetToast]);

  const handleCenterAndStop = () => {
    const c = getGroupCenterPosition(groupId, groupCenterPositions);
    recallGroupPosition(
      c,
      movingHeadIds,
      fixtureIds,
      groupId,
      sendMovement
    );
    setGroupMovements((prev: Record<string, GroupMovement>) => ({
      ...prev,
      [groupId]: getStopGroupMovement(),
    }));
  };

  const deleteTrajLabel =
    deleteTrajId != null
      ? customTrajectories.find((t) => t.id === deleteTrajId)?.label
      : undefined;

  const movementDialogs = (
    <>
      <ConfirmModal
        isOpen={deleteTrajId != null}
        onClose={() => setDeleteTrajId(null)}
        onConfirm={() => {
          if (deleteTrajId) handleDeleteTrajectory(deleteTrajId);
        }}
        title="Supprimer la trajectoire"
        message={
          deleteTrajLabel
            ? `Supprimer « ${deleteTrajLabel} » de la bibliothèque ? Cette action est définitive.`
            : 'Supprimer cette trajectoire de la bibliothèque ?'
        }
        confirmLabel="Supprimer"
        tone="danger"
      />
      <ValuePromptModal
        isOpen={valuePrompt != null}
        onClose={() => setValuePrompt(null)}
        onSubmit={(value) => valuePrompt?.onSubmit(value)}
        title={valuePrompt?.title ?? ''}
        label={valuePrompt?.label ?? ''}
        defaultValue={valuePrompt?.defaultValue ?? ''}
      />
    </>
  );

  if (!advancedMode) {
    return (
      <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Mouvement — ${groupName}`}
        maxWidth="max-w-xl"
      >
        <MovementSimpleControls
          groupId={groupId}
          fixtureIds={fixtureIds}
          config={config}
          centerPan={centerX}
          centerTilt={centerY}
          onApplyPreset={applyQuickPreset}
          onUpdate={(patch) => updateConfig(patch)}
          onCenter={handleCenterAndStop}
          onPanTiltChange={sendPadMovement}
          onOpenAdvanced={() => {
            localStorage.setItem(MOVEMENT_ADVANCED_KEY, '1');
            setAdvancedMode(true);
          }}
          movingHeadCount={movingHeadCount}
          quickSaves={groupQuickMovementSaves}
          customTrajectories={customTrajectories}
          customSlotLinks={groupCustomMovementSlotLinks}
          onSaveQuickPreset={saveQuickPreset}
          onClearQuickPreset={clearQuickPreset}
          onRenameQuickPreset={renameQuickPreset}
          movementCenterLinked={centerLinked}
          onMovementCenterLinkedChange={(linked) =>
            setGroupMovementCenterLinked((prev) => ({
              ...prev,
              [groupId]: linked,
            }))
          }
        />
        <div className="pt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest"
          >
            Fermer
          </button>
        </div>
      </Modal>
      {movementDialogs}
      </>
    );
  }

  return (
    <>
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`GÉNÉRATEUR DE MOUVEMENTS : ${groupName}`}
      maxWidth="max-w-7xl"
    >
      <div 
        className="relative space-y-6 p-2"
        onClick={() => setTrajMenu(null)}
      >
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem(MOVEMENT_ADVANCED_KEY);
            setAdvancedMode(false);
          }}
          className="text-[10px] font-black uppercase text-slate-500 hover:text-cyan-400 transition-colors"
        >
          ← Mode simple
        </button>
        {/* Menu Contextuel pour la bibliothèque */}
        {trajMenu && (
          <div 
            className="fixed z-[9999] bg-[#1a1d23] border border-white/10 rounded-xl shadow-2xl p-1.5 min-w-[120px]"
            style={{ left: trajMenu.x, top: trajMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => handleEditTrajectoryPoints(trajMenu.id)}
              className="w-full text-left px-3 py-2 hover:bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase rounded-lg flex items-center gap-2 transition-all"
            >
              <Edit2 className="w-3 h-3" /> Modifier Points
            </button>
            <button 
              onClick={() => { handleRenameTrajectory(trajMenu.id); setTrajMenu(null); }}
              className="w-full text-left px-3 py-2 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase rounded-lg flex items-center gap-2 transition-all"
            >
              <Edit2 className="w-3 h-3" /> Renommer
            </button>
            <div className="h-px bg-white/5 my-1" />
            <button 
              onClick={() => {
                setDeleteTrajId(trajMenu.id);
                setTrajMenu(null);
              }}
              className="w-full text-left px-3 py-2 hover:bg-red-500/20 text-red-400 text-[10px] font-black uppercase rounded-lg flex items-center gap-2 transition-all"
            >
              <Trash2 className="w-3 h-3" /> Supprimer
            </button>
          </div>
        )}

        {/* GÉNÉRATEUR DE MOUVEMENTS (Calculé par le logiciel) */}
        <div className="bg-[#111317] border border-blue-500/30 rounded-[2rem] p-6 space-y-6 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 blur-[80px] pointer-events-none" />
          
          <div className="space-y-4 relative z-10">
            <div className="flex gap-4 items-center">
              <div className="p-3 bg-blue-500/20 rounded-2xl">
                <Move className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h4 className="text-xl font-black text-blue-400 uppercase tracking-[0.2em]">Trajectoires</h4>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Bibliothèque → réglages → clic droit sur un bouton : mémoriser, renommer ou
                  supprimer. Positions fixes : tuiles à droite (clic droit).
                </p>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-5 items-stretch">
              <div className="flex-1 min-w-0 space-y-2">
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-wide">
                  Mouvements mémorisés
                </p>
                <MovementQuickPresetGrid
                  config={config}
                  groupId={groupId}
                  variant="comfortable"
                  showHint={false}
                  onApplyPreset={applyQuickPreset}
                  quickSaves={groupQuickMovementSaves}
                  customTrajectories={customTrajectories}
                  customSlotLinks={groupCustomMovementSlotLinks}
                  onSaveQuickPreset={saveQuickPreset}
                  onClearQuickPreset={clearQuickPreset}
                  onRenameQuickPreset={renameQuickPreset}
                />
                {movementPresetToast && (
                  <p className="text-[10px] font-black uppercase text-purple-300 animate-pulse">
                    {movementPresetToast}
                  </p>
                )}
              </div>

              <div className="lg:w-[min(100%,420px)] shrink-0 p-4 bg-black/40 rounded-2xl border border-white/5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    Positions mémorisées
                  </p>
                  <div className="flex items-center gap-2">
                    <Tooltip text="Centre (arrête l’effet) et positions fixes. Clic droit sur une tuile = mémoriser pan/tilt (lié ou par lyre selon le pad).">
                      <HelpCircle className="w-4 h-4 text-slate-600 hover:text-white cursor-help transition-colors" />
                    </Tooltip>
                    <span className="text-[9px] text-slate-500 italic hidden sm:inline">
                      Clic droit : sauver
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <div className="group relative flex justify-center">
                    <FixedPositionMemoryButton
                      dots={positionMemoryDisplayDots(centerPosition, movingHeadIds).map(
                        (d) => ({ pan: d.x, tilt: d.y })
                      )}
                      perFixtureVisual={positionMemoryPerFixtureVisual(
                        centerPosition,
                        movingHeadIds
                      )}
                      label={centerPosition.label}
                      variant="center"
                      size="md"
                      active={centerX === centerPosition.x && centerY === centerPosition.y}
                      onClick={handleCenterAndStop}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        handleSaveCenterPosition();
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRenameCenterPosition();
                      }}
                      className="absolute -top-1 -right-1 p-1 bg-slate-900 border border-white/10 rounded-full opacity-0 group-hover:opacity-100 hover:bg-blue-500 transition-all z-10"
                    >
                      <Edit2 className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                  {positions.map((pos: GroupPosition, i: number) => {
                    const isCurrent = centerX === pos.x && centerY === pos.y;
                    return (
                      <div key={i} className="group relative flex justify-center">
                        <FixedPositionMemoryButton
                          dots={positionMemoryDisplayDots(pos, movingHeadIds).map((d) => ({
                            pan: d.x,
                            tilt: d.y,
                          }))}
                          perFixtureVisual={positionMemoryPerFixtureVisual(
                            pos,
                            movingHeadIds
                          )}
                          label={pos.label}
                          size="md"
                          active={isCurrent}
                          onClick={() =>
                            recallGroupPosition(
                              pos,
                              movingHeadIds,
                              fixtureIds,
                              groupId,
                              sendMovement
                            )
                          }
                          onContextMenu={(e) => {
                            e.preventDefault();
                            handleSavePosition(i);
                          }}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRenamePosition(i);
                          }}
                          className="absolute -top-1 -right-1 p-1 bg-slate-900 border border-white/10 rounded-full opacity-0 group-hover:opacity-100 hover:bg-blue-500 transition-all z-10"
                        >
                          <Edit2 className="w-2.5 h-2.5 text-white" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6 relative z-10">
            {/* Colonne GAUCHE (PAD et Centre) */}
            <div className="col-span-5 flex flex-col items-center gap-4 p-4 bg-black/40 rounded-[1.5rem] border border-white/5 shadow-inner">
              {useCentreApercuPad ? (
                <CentreApercuPad
                  size={360}
                  movingHeadIds={movingHeadIds}
                  fixtures={fixtures}
                  channels={channels}
                  fixtureCalibration={fixtureCalibration}
                  linked={movingHeadIds.length < 2 ? true : centerLinked}
                  onLinkedChange={() => {}}
                  groupPan={centerX}
                  groupTilt={centerY}
                  perHeadMovementCenters={motionCenters}
                  onMoveLinked={moveCentreLinked}
                  onMoveFixture={(fixtureId, pan, tilt) =>
                    sendMovement(fixtureIds, pan, tilt, groupId, {
                      onlyFixtureId: fixtureId,
                    })
                  }
                  motionPreviewDots={previewDots.map((dot) => ({
                    pan: dot.pan,
                    tilt: dot.tilt,
                    index: dot.index,
                  }))}
                />
              ) : (
                <>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-blue-500/20 pb-1.5 w-full text-center">
                    Centre &amp; Aperçu
                  </p>

                  <div className="relative group/pad">
                    <XYPad
                      x={
                        selectedPointIndex !== null
                          ? localCustomPoints[selectedPointIndex].x
                          : phantomPoint
                            ? phantomPoint.x
                            : centerX
                      }
                      y={
                        selectedPointIndex !== null
                          ? localCustomPoints[selectedPointIndex].y
                          : phantomPoint
                            ? phantomPoint.y
                            : centerY
                      }
                      onChange={handleUpdatePoint}
                      size={360}
                    />

                    <div className="absolute top-2 right-2 pointer-events-none opacity-0 group-hover/pad:opacity-100 transition-opacity">
                      <div className="bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/10 space-y-2">
                        <p className="text-[9px] font-black text-blue-400 uppercase flex items-center gap-2">
                          <HelpCircle className="w-3 h-3" /> Aide PAD
                        </p>
                        <ul className="text-[8px] text-slate-300 space-y-1 font-medium">
                          <li>• Glisser pour déplacer le centre</li>
                          <li>• Rec : Cliquez sur &quot;REC POINT&quot;</li>
                          <li>• Edit : Sélectionnez un point (jaune)</li>
                        </ul>
                      </div>
                    </div>

                    {isRecording && phantomPoint && selectedPointIndex === null && (
                      <div
                        className="absolute pointer-events-none w-4 h-4 rounded-full border border-blue-400 bg-blue-400/20 z-20 animate-pulse"
                        style={{
                          left: `${(phantomPoint.x / 255) * 360}px`,
                          top: `${(phantomPoint.y / 255) * 360}px`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      >
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[11px] font-black text-blue-400 whitespace-nowrap">
                          POINT {localCustomPoints.length + 1} ?
                        </span>
                      </div>
                    )}

                    {(isRecording ||
                      isEditMode ||
                      config.shape === 'custom' ||
                      localCustomPoints.length > 0) &&
                      (isRecording || isEditMode
                        ? localCustomPoints
                        : config.customPoints || localCustomPoints
                      ).map((p, i) => (
                        <div
                          key={i}
                          onClick={() =>
                            (isEditMode || isRecording) && setSelectedPointIndex(i)
                          }
                          className={`absolute cursor-pointer w-4 h-4 rounded-full border border-white/50 z-10 transition-all ${
                            selectedPointIndex === i
                              ? 'bg-yellow-400 scale-150 shadow-[0_0_10px_yellow] z-30'
                              : isRecording || isEditMode
                                ? 'bg-red-500 shadow-[0_0_5px_red]'
                                : 'bg-blue-400/30'
                          }`}
                          style={{
                            left: `${(p.x / 255) * 360}px`,
                            top: `${(p.y / 255) * 360}px`,
                            transform: 'translate(-50%, -50%)',
                          }}
                        >
                          <span
                            className={`absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold ${selectedPointIndex === i ? 'text-yellow-400' : 'text-white/50'}`}
                          >
                            {i + 1}
                          </span>
                        </div>
                      ))}

                    {previewDots.map((dot) => (
                      <div
                        key={dot.index}
                        className={`absolute pointer-events-none rounded-full border border-white/50 transition-all duration-75 z-20 ${
                          dot.index === 0
                            ? 'w-4 h-4 bg-cyan-400 shadow-[0_0_10px_#22d3ee]'
                            : 'w-3.5 h-3.5 bg-purple-400 shadow-[0_0_10px_#c084fc]'
                        }`}
                        style={{
                          left: `${(dot.pan / 255) * 360}px`,
                          top: `${(dot.tilt / 255) * 360}px`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        title={`Lyre ${dot.index + 1}`}
                      >
                        {movingHeadCount > 1 && (
                          <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-black text-white/80">
                            {dot.index + 1}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Faders de contrôle du centre à GAUCHE */}
              <div className="w-full bg-black/40 p-4 rounded-xl border border-white/5 space-y-4">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/10 pb-1.5">
                  {centrePadPerFixture ? 'Centres mvt (par lyre)' : 'Centre d’effet'}
                </p>
                {centrePadPerFixture ? (
                  <div className="space-y-2">
                    {movingHeadIds.map((headId, index) => {
                      const c = motionCenters[index] ?? { pan: centerX, tilt: centerY };
                      return (
                        <div
                          key={headId}
                          className="flex items-center justify-between rounded-lg border border-white/5 bg-black/30 px-2 py-1.5"
                        >
                          <span className="text-[9px] font-black uppercase text-cyan-400/90">
                            Lyre {index + 1}
                          </span>
                          <span className="text-[10px] font-mono font-black text-slate-300">
                            P {Math.round(c.pan)} · T {Math.round(c.tilt)}
                          </span>
                        </div>
                      );
                    })}
                    <p className="text-[8px] text-slate-600 italic leading-snug">
                      Anneaux sur le pad = centre de la forme par lyre. Réglage « Centre · Lié »
                      dans Réglages du mouvement.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">
                          Base Pan: {centerX}
                        </span>
                        <span className="text-xs font-mono font-black text-cyan-400">
                          {config.shape !== 'none' && previewDots.length > 0
                            ? previewDots
                                .map(
                                  (d, i) =>
                                    `L${i + 1} ${Math.round(d.pan)}`
                                )
                                .join(' · ')
                            : liveHeadPanTilt.length > 0
                              ? liveHeadPanTilt
                                  .map(
                                    (h) =>
                                      `L${h.index + 1} ${Math.round(h.x)}`
                                  )
                                  .join(' · ')
                              : `LIVE ${centerX}`}
                        </span>
                      </div>
                      <ControlSlider
                        label="Center Pan"
                        value={centerX}
                        onChange={(nx) => sendPadMovement(Number(nx), centerY)}
                        color="bg-cyan-500/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                          Base Tilt: {centerY}
                        </span>
                        <span className="text-xs font-mono font-black text-indigo-400">
                          {config.shape !== 'none' && previewDots.length > 0
                            ? previewDots
                                .map(
                                  (d, i) =>
                                    `L${i + 1} ${Math.round(d.tilt)}`
                                )
                                .join(' · ')
                            : liveHeadPanTilt.length > 0
                              ? liveHeadPanTilt
                                  .map(
                                    (h) =>
                                      `L${h.index + 1} ${Math.round(h.y)}`
                                  )
                                  .join(' · ')
                              : `LIVE ${centerY}`}
                        </span>
                      </div>
                      <ControlSlider
                        label="Center Tilt"
                        value={centerY}
                        onChange={(ny) => sendPadMovement(centerX, Number(ny))}
                        color="bg-indigo-500/50"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Colonne DROITE (Réglages et Trajectoires) */}
            <div className="col-span-7 flex flex-col gap-5 py-1 overflow-y-auto max-h-[700px] pr-1 custom-scrollbar">
              <div className="bg-black/40 p-5 rounded-2xl border border-white/5 space-y-5">
                <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
                  <p className="text-[11px] font-black text-blue-400 uppercase tracking-[0.2em]">Réglages du Mouvement</p>
                  <Tooltip text="Vitesse, centre lié/par lyre, écart lyres, amplitude et symétrie (2 lyres et +)">
                    <HelpCircle className="w-4 h-4 text-slate-600 hover:text-blue-400 cursor-help transition-colors" />
                  </Tooltip>
                </div>
                
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center pr-2">
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest border-l-2 border-blue-500 pl-3">Vitesse</p>
                        <span className="text-base font-mono font-black text-blue-400">{Math.round((config.speed / 255) * 100)}%</span>
                      </div>
                      <ControlSlider 
                        label="Fréquence" 
                        value={config.speed} 
                        onChange={(v) => updateConfig({ speed: Number(v) })} 
                        color="bg-blue-500" 
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center pr-2">
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest border-l-2 border-blue-500 pl-3">
                          Écart entre lyres (fan)
                        </p>
                        <span className="text-base font-mono font-black text-blue-400">{Math.round((config.fan / 255) * 100)}%</span>
                      </div>
                      <ControlSlider 
                        label={movingHeadCount > 1 ? `${movingHeadCount} points sur le pad` : 'Utile avec plusieurs lyres'} 
                        value={config.fan} 
                        onChange={(v) => updateConfig({ fan: Number(v) })} 
                        color="bg-blue-500" 
                      />
                    </div>

                    {movingHeadCount > 1 ? (
                      <div className="space-y-2">
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest border-l-2 border-red-500/60 pl-3">
                          Centre de forme
                        </p>
                        <Tooltip text="Lié : un centre commun. Par lyre : anneaux sur le pad. Mémorisé avec le bouton trajectoire.">
                          <button
                            type="button"
                            onClick={() =>
                              setGroupMovementCenterLinked((prev) => ({
                                ...prev,
                                [groupId]: !centerLinked,
                              }))
                            }
                            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[10px] font-black uppercase transition-all ${
                              centerLinked
                                ? 'bg-red-500/15 border-red-500/40 text-red-300'
                                : 'bg-slate-800/50 border-white/10 text-slate-400 hover:border-white/20'
                            }`}
                          >
                            <Link2 className="w-4 h-4" />
                            {centerLinked ? 'Centre lié' : 'Centre par lyre'}
                          </button>
                        </Tooltip>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-5">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest border-l-2 border-cyan-500 pl-3">Amplitudes</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsLinked(!isLinked)}
                          className={`p-2 rounded-lg border transition-all ${
                            isLinked 
                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' 
                            : 'bg-slate-800/50 border-white/5 text-slate-500'
                          }`}
                          title={isLinked ? "Délier Pan/Tilt" : "Lier Pan/Tilt"}
                        >
                          {isLinked ? <Link2 className="w-4 h-4" /> : <Link2Off className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => updateConfig({ sizePan: 64, sizeTilt: 64 })}
                          className="p-2 rounded-lg bg-slate-800/50 border border-white/5 text-slate-500 hover:text-white hover:border-white/20 transition-all"
                          title="Réinitialiser (50%)"
                        >
                          <RefreshCcw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center pr-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-3">Largeur Pan</p>
                        <span className="text-sm font-mono font-black text-cyan-400">{Math.round(((config.sizePan ?? 64) / 255) * 100)}%</span>
                      </div>
                      <ControlSlider 
                        label="Largeur" 
                        value={config.sizePan ?? 64} 
                        onChange={(v) => updateConfig({ sizePan: Number(v) })} 
                        color="bg-cyan-500" 
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center pr-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-3">Hauteur Tilt</p>
                        <span className="text-sm font-mono font-black text-indigo-400">{Math.round(((config.sizeTilt ?? 64) / 255) * 100)}%</span>
                      </div>
                      <ControlSlider 
                        label="Hauteur" 
                        value={config.sizeTilt ?? 64} 
                        onChange={(v) => updateConfig({ sizeTilt: Number(v) })} 
                        color="bg-indigo-500" 
                      />
                    </div>
                  </div>
                </div>

                <Tooltip
                  text={
                    movingHeadCount > 1
                      ? 'Lyres paires (2, 4…) : mouvement inversé — effet miroir gauche/droite.'
                      : 'Utile avec au moins 2 lyres dans le groupe Patch.'
                  }
                >
                  <button
                    type="button"
                    onClick={() => updateConfig({ invert180: !config.invert180 })}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border text-[10px] font-black uppercase transition-all active:scale-95 ${
                      config.invert180
                        ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                        : 'bg-slate-800/80 border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'
                    }`}
                  >
                    <FlipHorizontal2 className="w-4 h-4" />
                    Symétrie
                  </button>
                </Tooltip>
              </div>

              {/* Bibliothèque mouvements */}
              <div className="grid grid-cols-1 gap-5">
                <div className="p-5 bg-black/40 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-black text-purple-400 uppercase tracking-[0.2em]">
                      Bibliothèque de mouvements
                    </p>
                    <Tooltip text="Choisir une forme (sans changer vitesse / amplitude / centre). Réglez puis mémorisez sur un bouton trajectoire.">
                      <HelpCircle className="w-4 h-4 text-slate-600 hover:text-purple-400 cursor-help transition-colors" />
                    </Tooltip>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-500 mb-2 tracking-wide">
                      Formes standard
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {QUICK_MOVEMENT_PRESETS.map((shape) => (
                        <button
                          key={shape.id}
                          type="button"
                          onClick={() =>
                            loadShapeFromLibrary(shape.id as StandardShapePresetId)
                          }
                          className={`px-2 py-2 rounded-lg border text-[9px] font-black uppercase transition-all ${
                            config.shape === shape.movement.shape
                              ? 'bg-blue-500/20 border-blue-400/50 text-blue-200'
                              : 'bg-slate-800/50 border-white/5 text-slate-400 hover:border-blue-500/30'
                          }`}
                        >
                          {shape.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-500 mb-2 tracking-wide">
                      Trajectoires perso
                    </p>
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                    {customTrajectories.length === 0 ? (
                      <p className="text-[9px] text-slate-600 italic px-1">
                        Aucune trajectoire enregistrée — créez-en une ci-dessous
                      </p>
                    ) : null}
                    {customTrajectories.map((traj) => (
                      <div key={traj.id} className="group relative">
                        <button
                          onClick={() => handleLoadTrajectory(traj)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setTrajMenu({ id: traj.id, x: e.clientX, y: e.clientY });
                          }}
                          className={`w-full py-2.5 px-4 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                            config.shape === 'custom' && JSON.stringify(config.customPoints) === JSON.stringify(traj.points)
                            ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                            : 'bg-slate-800/50 border-white/5 text-slate-400 hover:border-purple-500/30'
                          }`}
                        >
                          <span className="text-[10px] font-black uppercase truncate">{traj.label}</span>
                          <Play className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  </div>

                  <div className="pt-4 border-t border-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-[11px] font-black text-red-400 uppercase tracking-[0.2em]">
                        Trajectoire point à point
                      </p>
                      <div className="flex items-center gap-3">
                        <Tooltip text="Enregistrez une suite de points sur le pad, puis « Sauver » pour l’ajouter aux trajectoires perso.">
                          <HelpCircle className="w-4 h-4 text-slate-600 hover:text-red-400 cursor-help transition-colors" />
                        </Tooltip>
                        <span className="text-[10px] text-slate-600 italic">
                          {(isRecording
                            ? localCustomPoints
                            : config.customPoints || localCustomPoints
                          ).length}{' '}
                          points
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (isRecording) {
                            setIsRecording(false);
                            setPhantomPoint(null);
                            updateConfig({
                              shape: 'custom',
                              customPoints: localCustomPoints,
                            });
                          } else {
                            setLocalCustomPoints([]);
                            setIsRecording(true);
                            setPhantomPoint({ x: centerX, y: centerY });
                            setSelectedPointIndex(null);
                            updateConfig({ shape: 'none' });
                          }
                        }}
                        className={`flex-1 min-w-[120px] py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all ${
                          isRecording
                            ? 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                            : 'bg-slate-800 text-slate-400 hover:bg-red-500/20 hover:text-red-400'
                        }`}
                      >
                        {isRecording ? (
                          <Square className="w-4 h-4" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                        {isRecording ? 'Stop Rec' : 'Nouv. Trajet'}
                      </button>

                      {isRecording && (
                        <button
                          type="button"
                          onClick={handleAddPoint}
                          className="px-8 py-3 bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-blue-400 transition-all shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                        >
                          <Plus className="w-4 h-4" /> REC POINT
                        </button>
                      )}

                      {!isRecording && localCustomPoints.length > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              updateConfig({
                                shape: 'custom',
                                customPoints: localCustomPoints,
                              })
                            }
                            className={`flex-1 min-w-[80px] py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all ${
                              config.shape === 'custom'
                                ? 'bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                                : 'bg-slate-800 text-slate-400 hover:bg-blue-500/20 hover:text-blue-400'
                            }`}
                          >
                            <Play className="w-4 h-4" /> Lire
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsEditMode(!isEditMode);
                              if (isEditMode) setSelectedPointIndex(null);
                            }}
                            className={`flex-1 min-w-[80px] py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all ${
                              isEditMode
                                ? 'bg-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.4)]'
                                : 'bg-slate-800 text-slate-400 hover:bg-yellow-500/20 hover:text-yellow-500'
                            }`}
                          >
                            <Edit2 className="w-4 h-4" />{' '}
                            {isEditMode ? 'FIN EDIT' : 'MODIFIER'}
                          </button>

                          <button
                            type="button"
                            onClick={handleInsertPoint}
                            className="flex-1 min-w-[80px] py-3 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-400 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all"
                          >
                            <Plus className="w-4 h-4" /> Point +
                          </button>

                          <button
                            type="button"
                            onClick={handleSaveTrajectory}
                            className="flex-1 min-w-[80px] py-3 bg-green-600/20 hover:bg-green-600/40 border border-green-500/30 text-green-400 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all"
                          >
                            <Save className="w-4 h-4" /> Sauver
                          </button>
                        </>
                      )}
                    </div>

                    {selectedPointIndex !== null && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl flex justify-between items-center">
                        <span className="text-[10px] font-black text-yellow-500 uppercase">
                          Édition Point {selectedPointIndex + 1}
                        </span>
                        <div className="flex gap-5">
                          <button
                            type="button"
                            onClick={() => {
                              const newPoints = localCustomPoints.filter(
                                (_, i) => i !== selectedPointIndex
                              );
                              setLocalCustomPoints(newPoints);
                              setSelectedPointIndex(null);
                              if (config.shape === 'custom') {
                                updateConfig({
                                  shape: 'custom',
                                  customPoints: newPoints,
                                });
                              }
                            }}
                            className="text-[9px] text-red-400 font-bold hover:underline"
                          >
                            Supprimer
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedPointIndex(null)}
                            className="text-[9px] text-yellow-500 font-bold uppercase"
                          >
                            OK
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <div className="pt-3 flex justify-end gap-5">
          <button
            type="button"
            onClick={() => {
              updateConfig({ shape: 'none', speed: 128, sizePan: 64, sizeTilt: 64, fan: 0, invert180: false });
              const c = getGroupCenterPosition(groupId, groupCenterPositions);
              sendMovement(fixtureIds, c.x, c.y, groupId);
            }}
            className="px-10 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 border border-white/5 rounded-2xl text-xs font-black uppercase tracking-[0.3em] transition-all active:scale-95"
          >
            Réinitialiser
          </button>
          <button 
            onClick={onClose}
            className="px-16 py-4 bg-slate-800 hover:bg-slate-700 text-white border border-white/5 rounded-2xl text-xs font-black uppercase tracking-[0.3em] transition-all shadow-xl active:scale-95"
          >
            Fermer
          </button>
        </div>
    </Modal>
    {movementDialogs}
    </>
  );
};
