import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Crosshair,
  Grid3x3,
  ImagePlus,
  Maximize2,
  Settings2,
  Sparkles,
  Trash2,
  Undo2,
  Redo2,
  HelpCircle,
  Download,
  LayoutTemplate,
} from 'lucide-react';
import type { Fixture, Group, RgbColor, StageSceneElementKind } from '../../types';
import { useStageSelection } from '../../hooks/useStageSelection';
import { useStagePositions } from '../../hooks/useStagePositions';
import { isStageFixtureVisible, sameFixtureId } from '../../utils/stagePositions';
import { useStageLandmarks } from '../../hooks/useStageLandmarks';
import { useStageSceneElements } from '../../hooks/useStageSceneElements';
import { StageSceneElementList } from './stage/StageSceneElementList';
import {
  StageMultiHeightInspector,
  StageSelectionInspector,
} from './stage/StageSelectionInspector';
import { useStageSceneUndo } from '../../hooks/useStageSceneUndo';
import {
  alignSceneElementSelection,
  alignStageSelection,
  distributeSceneElementSelection,
  distributeStageSelection,
  moveSceneElementsByDelta,
  nudgeSceneElementsZ,
  nudgeStageSelection,
  nudgeStageSelectionZ,
  setSceneElementsZ,
  setStageSelectionZ,
  resolveStageSnapSteps,
  type StageAlignMode,
  type StageAlignScope,
  type StageDistributeSpan,
  type StageSnapPreset,
} from '../../utils/stageSnap';
import {
  clampRoomHeightM,
  clampAudienceOffsetM,
  clampStagePlatformDepthM,
  clampStagePlatformWidthM,
  clampStageElevationM,
  stageDeckPlanInsetsPercent,
  loadStageDecorSettings,
  saveStageDecorSettings,
  setStageRoomDimensions,
  stagePlanDistributeBounds,
  stagePublicBoundaryPlanY,
  stageAudienceStartPlanY,
  stageDecorSettingsEqual,
  stageRoomDimensionsMeters,
  STAGE_DECOR_KEY,
} from '../../utils/stageDecorSettings';
import { normalizeStageDeckColor } from '../../utils/stageDeckColor';
import {
  loadStagePlanBackground,
  readImageFileAsDataUrl,
  saveStagePlanBackground,
  type StagePlanBackground,
} from '../../utils/stagePlanBackground';
import { StageFixtureList } from './stage/StageFixtureList';
import { StageTab } from './StageTab';
import { Stage3DTab } from './Stage3DTab';
import { StageSceneHelpModal } from './stage/StageSceneHelpModal';
import { exportStagePlanPng } from '../../utils/stagePlanExport';
import { stagePublicDepthM } from '../../utils/stageDecorSettings';
import {
  applyStagePlanTemplate,
  type StagePlanTemplateId,
} from '../../utils/stagePlanTemplates';
import { StagePlanTemplateModal } from './stage/StagePlanTemplateModal';

const STAGE_SNAP_ENABLED_KEY = 'pldmx_stage_snap_enabled';

type SceneView = 'plan' | '3d';

interface StageSceneTabProps {
  fixtures: Fixture[];
  channels: number[];
  groups: Group[];
  groupColors: Record<string, RgbColor>;
  initialView?: SceneView;
  onIdentifyFixture?: (fixtureId: number) => void;
  onOpenCalibration?: () => void;
}

export function StageSceneTab({
  fixtures,
  channels,
  groups,
  groupColors,
  initialView = 'plan',
  onIdentifyFixture,
  onOpenCalibration,
}: StageSceneTabProps) {
  const [view, setView] = useState<SceneView>(initialView);
  const [mount3d, setMount3d] = useState(initialView === '3d');

  useEffect(() => {
    if (view === '3d') setMount3d(true);
  }, [view]);
  const [snapEnabled, setSnapEnabled] = useState(
    () => localStorage.getItem(STAGE_SNAP_ENABLED_KEY) !== '0'
  );
  const [planTemplateOpen, setPlanTemplateOpen] = useState(false);
  const [snapPreset, setSnapPreset] = useState<StageSnapPreset>('percent5');
  const [distributeSpan, setDistributeSpan] = useState<StageDistributeSpan>('selection');
  const [alignScope, setAlignScope] = useState<StageAlignScope>('selection');
  const [decor, setDecor] = useState(() => loadStageDecorSettings());
  const [planBackground, setPlanBackground] = useState<StagePlanBackground | null>(() =>
    loadStagePlanBackground()
  );
  const [highlightGroupId, setHighlightGroupId] = useState<string>('');
  const [sceneHelpOpen, setSceneHelpOpen] = useState(false);
  const [exportingPlan, setExportingPlan] = useState(false);
  const [selectedSceneElementIds, setSelectedSceneElementIds] = useState<string[]>(
    []
  );
  const planFileRef = useRef<HTMLInputElement>(null);
  const room = stageRoomDimensionsMeters(decor);
  const snapSteps = useMemo(
    () => resolveStageSnapSteps(snapPreset, room.widthM, room.depthM),
    [snapPreset, room.widthM, room.depthM]
  );
  const snapStep = snapSteps.stepX;
  const snapStepY = snapSteps.stepY;

  useEffect(() => {
    localStorage.setItem(STAGE_SNAP_ENABLED_KEY, snapEnabled ? '1' : '0');
  }, [snapEnabled]);

  const {
    selectedIds,
    primaryId,
    selectFixture,
    clearSelection,
    isSelected,
    setSelectedIds,
    setPrimaryId,
  } = useStageSelection();

  const { positions, savePositions, setPositionsLocal, resetAllPositions, updatePosition } =
    useStagePositions(fixtures);

  const { landmarks, updateLandmark } = useStageLandmarks();
  const {
    elements: sceneElements,
    saveElements,
    setElementsLocal,
    updateElement,
    toggleEnabled,
    addElement,
    removeElement,
  } = useStageSceneElements();

  const selectFixtureOnPlan = useCallback(
    (id: number, additive: boolean) => {
      setSelectedSceneElementIds([]);
      if (
        !additive &&
        selectedIds.some((x) => sameFixtureId(x, id)) &&
        selectedIds.length > 1
      ) {
        setPrimaryId(id);
        return;
      }
      selectFixture(id, additive);
    },
    [selectFixture, selectedIds, setPrimaryId]
  );

  const clearAllSelection = useCallback(() => {
    clearSelection();
    setSelectedSceneElementIds([]);
  }, [clearSelection]);

  const selectSceneElement = useCallback((id: string, additive: boolean) => {
    setHighlightGroupId('');
    clearSelection();
    setSelectedSceneElementIds((prev) => {
      if (additive) {
        if (prev.includes(id)) return prev.filter((x) => x !== id);
        return [...prev, id];
      }
      if (prev.includes(id) && prev.length > 1) {
        return [...prev.filter((x) => x !== id), id];
      }
      return [id];
    });
  }, [clearSelection]);

  const isSceneElementSelected = useCallback(
    (id: string) => selectedSceneElementIds.includes(id),
    [selectedSceneElementIds]
  );

  const selectGroupOnPlan = useCallback(
    (groupId: string) => {
      setHighlightGroupId(groupId);
      setSelectedSceneElementIds([]);
      if (!groupId) {
        clearSelection();
        return;
      }
      const group = groups.find((g) => g.id === groupId);
      if (!group) return;
      const patchedIds = new Set(fixtures.map((f) => Number(f.id)));
      const ids = group.fixtureIds
        .map((id) => Number(id))
        .filter((id) => patchedIds.has(id));
      if (ids.length === 0) {
        alert('Aucun projecteur de ce groupe dans le patch actuel.');
        clearSelection();
        return;
      }
      setSelectedIds(ids);
      setPrimaryId(ids[0] ?? null);
    },
    [groups, fixtures, clearSelection, setSelectedIds, setPrimaryId]
  );

  const handleAddSceneElement = useCallback(
    (kind: StageSceneElementKind) => {
      const id = addElement(kind);
      if (id) {
        clearSelection();
        setSelectedSceneElementIds([id]);
      }
    },
    [addElement, clearSelection]
  );

  const handleRemoveSceneElement = useCallback(
    (id: string) => {
      removeElement(id);
      setSelectedSceneElementIds((cur) => cur.filter((x) => x !== id));
    },
    [removeElement]
  );

  const toggleFixtureVisible = useCallback(
    (id: number) => {
      const pos = positions.find((p) => sameFixtureId(p.id, id));
      const visible = pos ? isStageFixtureVisible(pos) : true;
      const nextVisible = !visible;
      updatePosition(id, { visible: nextVisible });
      if (!nextVisible) {
        setSelectedIds((prev) => {
          const next = prev.filter((x) => !sameFixtureId(x, id));
          setPrimaryId(next.length ? next[next.length - 1]! : null);
          return next;
        });
      }
    },
    [positions, updatePosition, setSelectedIds, setPrimaryId]
  );
  const { pushSnapshot, undo: undoSceneEdit, redo: redoSceneEdit, canUndo, canRedo } =
    useStageSceneUndo();

  const recordSceneEdit = useCallback(() => {
    pushSnapshot(positions, sceneElements);
  }, [pushSnapshot, positions, sceneElements]);

  const restoreSceneSnapshot = useCallback(
    (snap: { positions: typeof positions; elements: typeof sceneElements }) => {
      savePositions(snap.positions);
      saveElements(snap.elements);
    },
    [savePositions, saveElements]
  );

  const applyUndo = useCallback(() => {
    const snap = undoSceneEdit({ positions, elements: sceneElements });
    if (snap) restoreSceneSnapshot(snap);
  }, [undoSceneEdit, positions, sceneElements, restoreSceneSnapshot]);

  const applyRedo = useCallback(() => {
    const snap = redoSceneEdit({ positions, elements: sceneElements });
    if (snap) restoreSceneSnapshot(snap);
  }, [redoSceneEdit, positions, sceneElements, restoreSceneSnapshot]);

  const saveElementsWithUndo = useCallback(
    (next: typeof sceneElements) => {
      recordSceneEdit();
      saveElements(next);
    },
    [recordSceneEdit, saveElements]
  );

  const applyPositions = useCallback(
    (next: typeof positions, recordUndo = false) => {
      if (recordUndo) recordSceneEdit();
      savePositions(next);
    },
    [savePositions, recordSceneEdit]
  );

  const align = useCallback(
    (mode: StageAlignMode) => {
      if (selectedSceneElementIds.length > 0) {
        const next = alignSceneElementSelection(
          sceneElements,
          selectedSceneElementIds,
          mode,
          alignScope
        );
        saveElementsWithUndo(next);
        return;
      }
      if (selectedIds.length === 0) return;
      const next = alignStageSelection(positions, selectedIds, mode, alignScope);
      applyPositions(next, true);
    },
    [
      alignScope,
      sceneElements,
      selectedSceneElementIds,
      positions,
      selectedIds,
      applyPositions,
      saveElementsWithUndo,
    ]
  );

  const canAlignSelection =
    selectedIds.length > 0 || selectedSceneElementIds.length > 0;
  const canDistributeSelection =
    selectedIds.length >= 2 || selectedSceneElementIds.length >= 2;

  const distributeBounds = useCallback(
    (scope: 'stage' | 'room') => stagePlanDistributeBounds(decor, scope),
    [decor]
  );

  const distribute = useCallback(
    (axis: 'x' | 'y') => {
      const bounds =
        distributeSpan === 'stage'
          ? distributeBounds('stage')
          : distributeSpan === 'room'
            ? distributeBounds('room')
            : undefined;

      if (selectedSceneElementIds.length >= 2) {
        const next = distributeSceneElementSelection(
          sceneElements,
          selectedSceneElementIds,
          axis,
          snapEnabled,
          snapStep,
          distributeSpan,
          bounds,
          snapStepY
        );
        saveElementsWithUndo(next);
        return;
      }
      if (selectedIds.length < 2) return;
      const next = distributeStageSelection(
        positions,
        selectedIds,
        axis,
        snapEnabled,
        snapStep,
        distributeSpan,
        bounds,
        snapStepY
      );
      applyPositions(next, true);
    },
    [
      sceneElements,
      selectedSceneElementIds,
      positions,
      selectedIds,
      snapEnabled,
      snapStep,
      snapStepY,
      distributeSpan,
      distributeBounds,
      applyPositions,
      saveElementsWithUndo,
    ]
  );

  const handlePlanMarqueeSelect = useCallback(
    (fixtureIds: number[], sceneElementIds: string[], additive: boolean) => {
      if (fixtureIds.length === 0 && sceneElementIds.length === 0) {
        if (!additive) clearAllSelection();
        return;
      }
      if (fixtureIds.length > 0) {
        setHighlightGroupId('');
        setSelectedSceneElementIds([]);
        if (additive) {
          setSelectedIds((prev) => {
            const set = new Set(prev.map(Number));
            fixtureIds.forEach((id) => set.add(id));
            const next = [...set];
            setPrimaryId(next[next.length - 1] ?? null);
            return next;
          });
        } else {
          setSelectedIds(fixtureIds);
          setPrimaryId(fixtureIds[0] ?? null);
        }
        return;
      }
      clearSelection();
      if (additive) {
        setSelectedSceneElementIds((prev) => {
          const set = new Set(prev);
          sceneElementIds.forEach((id) => set.add(id));
          return [...set];
        });
      } else {
        setSelectedSceneElementIds(sceneElementIds);
      }
    },
    [clearAllSelection, clearSelection, setSelectedIds, setPrimaryId]
  );

  const deleteSelectedSceneElements = useCallback(() => {
    if (selectedSceneElementIds.length === 0) return;
    recordSceneEdit();
    const remove = new Set(selectedSceneElementIds);
    saveElements(sceneElements.filter((el) => !remove.has(el.id)));
    setSelectedSceneElementIds([]);
  }, [selectedSceneElementIds, recordSceneEdit, sceneElements, saveElements]);

  const inspectorFixture =
    selectedIds.length === 1 && selectedSceneElementIds.length === 0
      ? fixtures.find((f) => Number(f.id) === Number(selectedIds[0]))
      : undefined;
  const inspectorFixturePos =
    inspectorFixture != null
      ? positions.find((p) => sameFixtureId(p.id, inspectorFixture.id))
      : undefined;
  const inspectorSceneElement =
    selectedSceneElementIds.length === 1 && selectedIds.length === 0
      ? sceneElements.find((el) => el.id === selectedSceneElementIds[0])
      : undefined;

  const multiHeightFixtures =
    selectedIds.length >= 2 && selectedSceneElementIds.length === 0;
  const multiHeightSceneElements =
    selectedSceneElementIds.length >= 2 && selectedIds.length === 0;

  const handleExportPlanPng = useCallback(async () => {
    setExportingPlan(true);
    try {
      const insets = stageDeckPlanInsetsPercent(decor);
      await exportStagePlanPng({
        roomWidthM: room.widthM,
        roomDepthM: room.depthM,
        stageWidthM: decor.stageWidthM,
        stageDepthM: decor.stageDepthM,
        publicDepthM: stagePublicDepthM(decor),
        stageInsetLeftPct: insets.left,
        stageInsetRightPct: insets.right,
        stagePublicBoundaryY: stagePublicBoundaryPlanY(decor),
        fixtures,
        positions,
        sceneElements,
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Export PNG impossible');
    } finally {
      setExportingPlan(false);
    }
  }, [decor, room.widthM, room.depthM, fixtures, positions, sceneElements]);

  const primaryFixture =
    primaryId != null ? fixtures.find((f) => Number(f.id) === Number(primaryId)) : undefined;

  const applyRoomSize = useCallback((widthM: number, depthM: number) => {
    setDecor((prev) => {
      let next = setStageRoomDimensions(prev, widthM, depthM);
      next = {
        ...next,
        stageDepthM: clampStagePlatformDepthM(next.stageDepthM, next),
        stageWidthM: clampStagePlatformWidthM(next.stageWidthM, next),
        audienceOffsetM: clampAudienceOffsetM(next.audienceOffsetM, next),
      };
      saveStageDecorSettings(next);
      return next;
    });
  }, []);

  const applyPlanTemplate = useCallback(
    (templateId: StagePlanTemplateId) => {
      recordSceneEdit();
      const result = applyStagePlanTemplate(templateId, fixtures, positions);
      savePositions(result.positions);
      saveElements(result.sceneElements);
      setDecor((prev) => {
        let next = { ...prev, ...result.decorPatch };
        next.stageWidthM = clampStagePlatformWidthM(next.stageWidthM, next);
        next.stageDepthM = clampStagePlatformDepthM(next.stageDepthM, next);
        next.stageElevationM = clampStageElevationM(next.stageElevationM);
        next.audienceOffsetM = clampAudienceOffsetM(next.audienceOffsetM, next);
        saveStageDecorSettings(next);
        return next;
      });
      setPlanTemplateOpen(false);
      clearAllSelection();
    },
    [
      recordSceneEdit,
      fixtures,
      positions,
      savePositions,
      saveElements,
      clearAllSelection,
    ]
  );

  const patchStageDecorLayout = useCallback(
    (patch: {
      roomHeight?: number;
      stageWidthM?: number;
      stageElevationM?: number;
      stageDepthM?: number;
      stageDeckColor?: string;
      audienceOffsetM?: number;
    }) => {
      setDecor((prev) => {
        let next = { ...prev, ...patch };
        if (patch.stageDeckColor != null) {
          next.stageDeckColor = normalizeStageDeckColor(patch.stageDeckColor);
        }
        if (patch.roomHeight != null) {
          next.roomHeight = clampRoomHeightM(patch.roomHeight);
        }
        if (patch.stageWidthM != null) {
          next.stageWidthM = clampStagePlatformWidthM(patch.stageWidthM, next);
        }
        if (patch.stageElevationM != null) {
          next.stageElevationM = clampStageElevationM(patch.stageElevationM);
        }
        if (patch.stageDepthM != null) {
          next.stageDepthM = clampStagePlatformDepthM(patch.stageDepthM, next);
        }
        if (patch.audienceOffsetM != null) {
          next.audienceOffsetM = clampAudienceOffsetM(patch.audienceOffsetM, next);
        }
        next.audienceOffsetM = clampAudienceOffsetM(next.audienceOffsetM, next);
        saveStageDecorSettings(next);
        return next;
      });
    },
    []
  );

  useEffect(() => {
    const refresh = () => {
      const loaded = loadStageDecorSettings();
      setDecor((prev) => (stageDecorSettingsEqual(prev, loaded) ? prev : loaded));
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STAGE_DECOR_KEY) refresh();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('pldmx:stage_decor', refresh);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pldmx:stage_decor', refresh);
    };
  }, []);

  const onPlanImagePick = async (file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      const next: StagePlanBackground = {
        dataUrl,
        opacity: planBackground?.opacity ?? 0.45,
        locked: planBackground?.locked ?? false,
      };
      setPlanBackground(next);
      saveStagePlanBackground(next);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const stepX = e.shiftKey ? 1 : snapStep;
      const stepY = e.shiftKey ? 1 : snapStepY;
      const stepZ = e.shiftKey ? 1 : snapStep;
      let handled = false;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        applyRedo();
        handled = true;
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        applyRedo();
        handled = true;
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        applyUndo();
        handled = true;
      } else if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        selectedSceneElementIds.length > 0
      ) {
        deleteSelectedSceneElements();
        handled = true;
      } else if (
        selectedSceneElementIds.length > 0 &&
        selectedIds.length === 0 &&
        (e.key === 'PageUp' || e.key === 'PageDown')
      ) {
        const dz = e.key === 'PageUp' ? stepZ : -stepZ;
        saveElementsWithUndo(
          nudgeSceneElementsZ(
            sceneElements,
            selectedSceneElementIds,
            dz,
            snapEnabled,
            snapStep
          )
        );
        handled = true;
      } else if (
        selectedIds.length > 0 &&
        selectedSceneElementIds.length === 0 &&
        (e.key === 'PageUp' || e.key === 'PageDown')
      ) {
        const dz = e.key === 'PageUp' ? stepZ : -stepZ;
        applyPositions(
          nudgeStageSelectionZ(positions, selectedIds, dz, snapEnabled, snapStep),
          true
        );
        handled = true;
      } else if (selectedSceneElementIds.length > 0 && e.key === 'ArrowLeft') {
        saveElementsWithUndo(
          moveSceneElementsByDelta(
            sceneElements,
            selectedSceneElementIds,
            -stepX,
            0,
            snapEnabled,
            snapStep,
            snapStepY
          )
        );
        handled = true;
      } else if (selectedSceneElementIds.length > 0 && e.key === 'ArrowRight') {
        saveElementsWithUndo(
          moveSceneElementsByDelta(
            sceneElements,
            selectedSceneElementIds,
            stepX,
            0,
            snapEnabled,
            snapStep,
            snapStepY
          )
        );
        handled = true;
      } else if (selectedSceneElementIds.length > 0 && e.key === 'ArrowUp') {
        saveElementsWithUndo(
          moveSceneElementsByDelta(
            sceneElements,
            selectedSceneElementIds,
            0,
            -stepY,
            snapEnabled,
            snapStep,
            snapStepY
          )
        );
        handled = true;
      } else if (selectedSceneElementIds.length > 0 && e.key === 'ArrowDown') {
        saveElementsWithUndo(
          moveSceneElementsByDelta(
            sceneElements,
            selectedSceneElementIds,
            0,
            stepY,
            snapEnabled,
            snapStep,
            snapStepY
          )
        );
        handled = true;
      } else if (selectedIds.length > 0 && e.key === 'ArrowLeft') {
        applyPositions(
          nudgeStageSelection(
            positions,
            selectedIds,
            -stepX,
            0,
            snapEnabled,
            snapStep,
            snapStepY
          ),
          true
        );
        handled = true;
      } else if (selectedIds.length > 0 && e.key === 'ArrowRight') {
        applyPositions(
          nudgeStageSelection(
            positions,
            selectedIds,
            stepX,
            0,
            snapEnabled,
            snapStep,
            snapStepY
          ),
          true
        );
        handled = true;
      } else if (selectedIds.length > 0 && e.key === 'ArrowUp') {
        applyPositions(
          nudgeStageSelection(
            positions,
            selectedIds,
            0,
            -stepY,
            snapEnabled,
            snapStep,
            snapStepY
          ),
          true
        );
        handled = true;
      } else if (selectedIds.length > 0 && e.key === 'ArrowDown') {
        applyPositions(
          nudgeStageSelection(
            positions,
            selectedIds,
            0,
            stepY,
            snapEnabled,
            snapStep,
            snapStepY
          ),
          true
        );
        handled = true;
      } else if (e.key === 'Escape') {
        clearAllSelection();
        handled = true;
      } else if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        setSceneHelpOpen(true);
        handled = true;
      }
      if (handled) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    positions,
    selectedIds,
    snapEnabled,
    snapStep,
    snapStepY,
    applyPositions,
    clearAllSelection,
    applyUndo,
    applyRedo,
    deleteSelectedSceneElements,
    saveElementsWithUndo,
    selectedSceneElementIds,
    sceneElements,
  ]);

  useEffect(() => {
    const valid = new Set(fixtures.map((f) => Number(f.id)));
    if (selectedIds.some((id) => !valid.has(Number(id)))) {
      clearSelection();
    }
  }, [fixtures, selectedIds, clearSelection]);

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 pl-toolbar">
        <div className="pl-segmented">
          <button
            type="button"
            onClick={() => setView('plan')}
            className={`pl-segmented-btn ${
              view === 'plan' ? 'pl-segmented-btn--active' : 'pl-segmented-btn--idle'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Plan
          </button>
          <button
            type="button"
            onClick={() => setView('3d')}
            className={`pl-segmented-btn ${
              view === '3d' ? 'pl-segmented-btn--active' : 'pl-segmented-btn--idle'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            3D
          </button>
        </div>

        <div className="pl-divider-v hidden sm:block" />

        <button
          type="button"
          onClick={() => setPlanTemplateOpen(true)}
          className="pl-toolbar-btn pl-toolbar-btn--md border-cyan-500/25 text-cyan-300/90 hover:border-cyan-400/40"
          title="Disposer projecteurs et décor selon un modèle"
        >
          <LayoutTemplate className="w-3.5 h-3.5" />
          Plan type
        </button>

        <button
          type="button"
          onClick={() => setSnapEnabled((v) => !v)}
          className={`pl-toolbar-btn pl-toolbar-btn--md ${snapEnabled ? 'pl-toolbar-btn--active' : ''}`}
          title="Accrochage à la grille au relâchement du drag (déplacement fluide pendant le glisser)"
        >
          <Grid3x3 className="w-3.5 h-3.5" />
          Accrocher {snapEnabled ? snapSteps.label : 'off'}
        </button>
        <select
          value={snapPreset}
          onChange={(e) => setSnapPreset(e.target.value as StageSnapPreset)}
          className="pl-select text-[8px] font-black uppercase max-w-[72px]"
          title="Pas d’accrochage (grille plan en mètres si fond sans image)"
        >
          <option value="percent5">5 %</option>
          <option value="meter1">1 m</option>
          <option value="meter2">2 m</option>
        </select>

        <button
          type="button"
          disabled={!canUndo}
          onClick={() => applyUndo()}
          className="pl-toolbar-btn"
          title="Ctrl+Z — positions plan (projecteurs et éléments scène)"
        >
          <Undo2 className="w-3 h-3" />
          Annuler
        </button>
        <button
          type="button"
          disabled={!canRedo}
          onClick={() => applyRedo()}
          className="pl-toolbar-btn"
          title="Ctrl+Shift+Z ou Ctrl+Y — rétablir"
        >
          <Redo2 className="w-3 h-3" />
          Rétablir
        </button>

        <select
          value={highlightGroupId}
          onChange={(e) => selectGroupOnPlan(e.target.value)}
          className="pl-select text-[8px] font-black uppercase max-w-[140px]"
          title="Sélectionne les projecteurs du groupe et les met en évidence sur le plan"
        >
          <option value="">Tous groupes</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>

        <div className="flex flex-wrap gap-1">
          <select
            value={alignScope}
            onChange={(e) => setAlignScope(e.target.value as StageAlignScope)}
            className="pl-select text-[8px] font-black uppercase max-w-[96px]"
            title="Aligner sur la salle (marges) ou entre les objets sélectionnés"
          >
            <option value="selection">Align · sel.</option>
            <option value="room">Align · salle</option>
          </select>
          {(
            [
              ['Fond', 'top'],
              ['Public', 'bottom'],
              ['Gauche', 'left'],
              ['Droite', 'right'],
              ['Centre H', 'centerX'],
              ['Centre V', 'centerY'],
            ] as const
          ).map(([label, mode]) => (
            <button
              key={mode}
              type="button"
              disabled={!canAlignSelection}
              onClick={() => align(mode)}
              className="pl-toolbar-btn"
              title={
                alignScope === 'selection'
                  ? 'Aligner la sélection entre elle (bords / centre du groupe)'
                  : 'Aligner sur les marges du plan (8 / 50 / 92 %)'
              }
            >
              {label}
            </button>
          ))}
          <select
            value={distributeSpan}
            onChange={(e) => setDistributeSpan(e.target.value as StageDistributeSpan)}
            className="pl-select text-[8px] font-black uppercase max-w-[108px]"
            title="Étendue de l’espacement : entre les objets, sur le plateau scène, ou sur toute la salle"
          >
            <option value="selection">Sélection</option>
            <option value="stage">Scène</option>
            <option value="room">Salle</option>
          </select>
          <button
            type="button"
            disabled={!canDistributeSelection}
            onClick={() => distribute('x')}
            className="pl-toolbar-btn"
            title="Espacer horizontalement (min. 2 · selon Sélection / Scène / Salle)"
          >
            Espacer ↔
          </button>
          <button
            type="button"
            disabled={!canDistributeSelection}
            onClick={() => distribute('y')}
            className="pl-toolbar-btn"
            title="Espacer verticalement (min. 2 · selon Sélection / Scène / Salle)"
          >
            Espacer ↕
          </button>
        </div>

        {primaryFixture && (
          <div className="flex gap-1">
            {onIdentifyFixture && (
              <button
                type="button"
                onClick={() => onIdentifyFixture(primaryFixture.id)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-black uppercase border border-amber-500/30 bg-amber-500/10 text-amber-300"
              >
                <Sparkles className="w-3 h-3" />
                Flash
              </button>
            )}
            {primaryFixture.type === 'Moving Head' && onOpenCalibration && (
              <button
                type="button"
                onClick={onOpenCalibration}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-black uppercase border border-blue-500/30 bg-blue-500/10 text-blue-300"
              >
                <Settings2 className="w-3 h-3" />
                Calibrer
              </button>
            )}
          </div>
        )}

        {view === 'plan' && (
          <>
            <button
              type="button"
              disabled={exportingPlan}
              onClick={() => void handleExportPlanPng()}
              className="pl-toolbar-btn"
              title="PNG pour la crew (légende, mètres, date, SR/SL)"
            >
              <Download className="w-3 h-3" />
              Export plan
            </button>
            <button
              type="button"
              onClick={() => setSceneHelpOpen(true)}
              className="pl-toolbar-btn"
              title="Raccourcis et conventions plan ( ? )"
            >
              <HelpCircle className="w-3 h-3" />
            </button>
          </>
        )}

        {view === 'plan' && (
          <div className="flex items-center gap-2 flex-wrap">
            {landmarks.length > 0 && (
              <span className="text-[8px] font-black uppercase text-[var(--pl-muted)] flex items-center gap-1">
                <Crosshair className="w-3 h-3 text-fuchsia-400" />
                Repères perso · glisser sur le plan
              </span>
            )}
            <input
              ref={planFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                void onPlanImagePick(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => planFileRef.current?.click()}
              className="pl-toolbar-btn"
            >
              <ImagePlus className="w-3 h-3" />
              Plan fond
            </button>
            {planBackground && (
              <>
                <input
                  type="range"
                  min={0.1}
                  max={0.9}
                  step={0.05}
                  value={planBackground.opacity}
                  onChange={(e) => {
                    const next = {
                      ...planBackground,
                      opacity: parseFloat(e.target.value),
                    };
                    setPlanBackground(next);
                    saveStagePlanBackground(next);
                  }}
                  className="w-20 h-1 accent-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPlanBackground(null);
                    saveStagePlanBackground(null);
                  }}
                  className="pl-toolbar-btn text-red-500 hover:text-red-600 border-transparent bg-transparent"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        )}

        <p className="text-[8px] text-[var(--pl-muted)] font-bold uppercase ml-auto hidden xl:block max-w-[320px] text-right leading-tight">
          ? aide · Export plan · SR/SL · Esc
        </p>
      </div>

      <StageSceneHelpModal isOpen={sceneHelpOpen} onClose={() => setSceneHelpOpen(false)} />

      <div className="flex-1 flex gap-3 min-h-0">
        <div className="flex flex-col gap-2 shrink-0 max-h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar">
          <StageFixtureList
            fixtures={fixtures}
            groups={groups}
            groupColors={groupColors}
            positions={positions}
            selectedIds={selectedIds}
            primaryId={primaryId}
            onSelect={selectFixtureOnPlan}
            onToggleVisible={toggleFixtureVisible}
          />
          <StageSceneElementList
            elements={sceneElements}
            selectedIds={selectedSceneElementIds}
            onSelect={selectSceneElement}
            onToggleEnabled={toggleEnabled}
            onAdd={handleAddSceneElement}
            onRemove={handleRemoveSceneElement}
          />
          {multiHeightFixtures && (
            <StageMultiHeightInspector
              selectionLabel={`${selectedIds.length} projecteurs`}
              snapEnabled={snapEnabled}
              snapStep={snapStep}
              onNudge={(dz) =>
                applyPositions(
                  nudgeStageSelectionZ(
                    positions,
                    selectedIds,
                    dz,
                    snapEnabled,
                    snapStep
                  ),
                  true
                )
              }
              onSetAllZ={(z) =>
                applyPositions(
                  setStageSelectionZ(positions, selectedIds, z, snapEnabled, snapStep),
                  true
                )
              }
            />
          )}
          {multiHeightSceneElements && (
            <StageMultiHeightInspector
              selectionLabel={`${selectedSceneElementIds.length} éléments scène`}
              snapEnabled={snapEnabled}
              snapStep={snapStep}
              onNudge={(dz) =>
                saveElementsWithUndo(
                  nudgeSceneElementsZ(
                    sceneElements,
                    selectedSceneElementIds,
                    dz,
                    snapEnabled,
                    snapStep
                  )
                )
              }
              onSetAllZ={(z) =>
                saveElementsWithUndo(
                  setSceneElementsZ(
                    sceneElements,
                    selectedSceneElementIds,
                    z,
                    snapEnabled,
                    snapStep
                  )
                )
              }
            />
          )}
          {(inspectorFixture || inspectorSceneElement) && (
            <StageSelectionInspector
              fixture={inspectorFixture}
              fixturePosition={inspectorFixturePos}
              sceneElement={inspectorSceneElement}
              snapEnabled={snapEnabled}
              snapStep={snapStep}
              snapStepY={snapStepY}
              onFixtureChange={(id, patch) => {
                recordSceneEdit();
                updatePosition(id, patch);
              }}
              onSceneElementChange={(id, patch) => {
                recordSceneEdit();
                updateElement(id, patch);
              }}
            />
          )}
        </div>

        <div className="flex-1 min-w-0 min-h-0 relative">
          <div
            className={view === 'plan' ? 'h-full min-h-0' : 'hidden'}
            aria-hidden={view !== 'plan'}
          >
            <StageTab
              fixtures={fixtures}
              channels={channels}
              groups={groups}
              groupColors={groupColors}
              highlightGroupId={highlightGroupId || undefined}
              positions={positions}
              setPositionsLocal={setPositionsLocal}
              savePositions={savePositions}
              onBeforeDragCommit={recordSceneEdit}
              onBeforeSceneDragCommit={recordSceneEdit}
              resetAllPositions={resetAllPositions}
              selectedIds={selectedIds}
              primaryId={primaryId}
              onSelectFixture={selectFixtureOnPlan}
              onClearSelection={clearAllSelection}
              isSelected={isSelected}
              snapEnabled={snapEnabled}
              snapStep={snapStep}
              snapStepY={snapStepY}
              onMarqueeSelect={handlePlanMarqueeSelect}
              roomWidthM={room.widthM}
              roomDepthM={room.depthM}
              roomHeightM={decor.roomHeight}
              onRoomSizeChange={applyRoomSize}
              stageElevationM={decor.stageElevationM}
              stageWidthM={decor.stageWidthM}
              stageDepthM={decor.stageDepthM}
              stagePlanInsets={stageDeckPlanInsetsPercent(decor)}
              stagePublicBoundaryY={stagePublicBoundaryPlanY(decor)}
              stageAudienceStartPlanY={stageAudienceStartPlanY(decor)}
              audienceOffsetM={decor.audienceOffsetM}
              stageDeckColor={decor.stageDeckColor}
              onStageLayoutChange={patchStageDecorLayout}
              planBackground={planBackground}
              landmarks={landmarks}
              onLandmarkMove={(id, x, y) => updateLandmark(id, { x, y })}
              sceneElements={sceneElements}
              selectedSceneElementIds={selectedSceneElementIds}
              isSceneElementSelected={isSceneElementSelected}
              onSelectSceneElement={selectSceneElement}
              setSceneElementsLocal={setElementsLocal}
              saveSceneElements={saveElements}
            />
          </div>
          {mount3d && (
            <div
              className={
                view === '3d'
                  ? 'absolute inset-0 min-h-0'
                  : 'absolute inset-0 invisible pointer-events-none overflow-hidden'
              }
              aria-hidden={view !== '3d'}
            >
              <Stage3DTab
                fixtures={fixtures}
                channels={channels}
                groups={groups}
                groupColors={groupColors}
                highlightGroupId={highlightGroupId || undefined}
                landmarks={landmarks}
                sceneElements={sceneElements}
                selectedSceneElementIds={selectedSceneElementIds}
                onSelectSceneElement={selectSceneElement}
                onSceneElementCommit={(id, patch) => {
                  recordSceneEdit();
                  updateElement(id, patch);
                }}
                selectedFixtureId={primaryId}
                selectedIds={selectedIds}
                onSelectFixture={selectFixtureOnPlan}
                onClearSelection={clearAllSelection}
                onGizmoDragStart={recordSceneEdit}
                canvasActive={view === '3d'}
              />
            </div>
          )}
        </div>
      </div>

      <StagePlanTemplateModal
        open={planTemplateOpen}
        onClose={() => setPlanTemplateOpen(false)}
        onPick={applyPlanTemplate}
      />
    </div>
  );
};
