import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  Sun,
  Move,
  Zap,
  Wind,
  Maximize2,
  RefreshCw,
  MapPin,
  ZoomIn,
  ZoomOut,
  Scan,
  Hand,
} from 'lucide-react';
import type {
  Fixture,
  Group,
  RgbColor,
  StageFixturePosition,
  StageLandmark,
  StageSceneElement,
} from '../../types';
import { sceneElementKindIcon } from './stage/StageSceneElementList';
import { sceneElementPlanClass } from '../../utils/stageSceneElements';
import { isStageFixtureVisible, sameFixtureId } from '../../utils/stagePositions';
import {
  moveSceneElementsByDelta,
  moveStageSelectionByDelta,
  isPlanPointInMarquee,
  PLAN_LABEL_MIN_ZOOM,
  clampPercent,
  snapPercent,
  snapStageFixturePositions,
  snapSceneElementsPositions,
} from '../../utils/stageSnap';
import type { StagePlanBackground } from '../../utils/stagePlanBackground';
import {
  findGroupForFixture,
  groupColorOrDefault,
  rgbColorToCss,
} from '../../utils/stageGroups';
import { StageLayoutDimensionFields } from './stage/StageLayoutDimensionFields';
import {
  normalizeStageDeckColor,
  stageDeckPlanBorderRgba,
  stageDeckPlanFillRgba,
} from '../../utils/stageDeckColor';
import { isStageAdditiveSelect } from '../../utils/stageSelectionInput';

interface StageTabProps {
  fixtures: Fixture[];
  channels: number[];
  groups?: Group[];
  groupColors?: Record<string, RgbColor>;
  highlightGroupId?: string;
  positions: StageFixturePosition[];
  setPositionsLocal: (next: StageFixturePosition[]) => void;
  savePositions: (next: StageFixturePosition[]) => void;
  onBeforeDragCommit?: () => void;
  onBeforeSceneDragCommit?: () => void;
  resetAllPositions: () => void;
  selectedIds: number[];
  primaryId: number | null;
  onSelectFixture: (id: number, additive: boolean) => void;
  onClearSelection: () => void;
  isSelected: (id: number) => boolean;
  snapEnabled: boolean;
  snapStep: number;
  snapStepY?: number;
  onMarqueeSelect?: (
    fixtureIds: number[],
    sceneElementIds: string[],
    additive: boolean
  ) => void;
  roomWidthM?: number;
  roomDepthM?: number;
  roomHeightM?: number;
  onRoomSizeChange?: (widthM: number, depthM: number) => void;
  stageElevationM?: number;
  stageWidthM?: number;
  stageDepthM?: number;
  stagePlanInsets?: { left: number; right: number };
  stagePublicBoundaryY?: number;
  stageAudienceStartPlanY?: number;
  audienceOffsetM?: number;
  stageDeckColor?: string;
  onStageLayoutChange?: (patch: {
    roomHeight?: number;
    stageWidthM?: number;
    stageElevationM?: number;
    stageDepthM?: number;
    stageDeckColor?: string;
    audienceOffsetM?: number;
  }) => void;
  planBackground?: StagePlanBackground | null;
  landmarks?: StageLandmark[];
  onLandmarkMove?: (id: string, x: number, y: number) => void;
  sceneElements?: StageSceneElement[];
  selectedSceneElementIds?: string[];
  isSceneElementSelected?: (id: string) => boolean;
  onSelectSceneElement?: (id: string, additive: boolean) => void;
  setSceneElementsLocal?: (next: StageSceneElement[]) => void;
  saveSceneElements?: (next: StageSceneElement[]) => void;
}

export const StageTab = ({
  fixtures,
  channels,
  groups = [],
  groupColors = {},
  highlightGroupId,
  positions,
  setPositionsLocal,
  savePositions,
  onBeforeDragCommit,
  onBeforeSceneDragCommit,
  resetAllPositions,
  selectedIds,
  primaryId,
  onSelectFixture,
  onClearSelection,
  isSelected,
  snapEnabled,
  snapStep,
  snapStepY: snapStepYProp,
  onMarqueeSelect,
  roomWidthM,
  roomDepthM,
  roomHeightM,
  onRoomSizeChange,
  stageElevationM,
  stageWidthM,
  stageDepthM,
  stagePlanInsets,
  stagePublicBoundaryY,
  stageAudienceStartPlanY,
  audienceOffsetM,
  stageDeckColor,
  onStageLayoutChange,
  planBackground,
  landmarks = [],
  onLandmarkMove,
  sceneElements = [],
  selectedSceneElementIds = [],
  isSceneElementSelected,
  onSelectSceneElement,
  setSceneElementsLocal,
  saveSceneElements,
}: StageTabProps) => {
  const deckColorNorm = normalizeStageDeckColor(stageDeckColor);
  const stagePlanDeckStyle = useMemo(
    () => ({
      backgroundColor: stageDeckPlanFillRgba(deckColorNorm, 0.34),
      borderBottomColor: stageDeckPlanBorderRgba(deckColorNorm, 0.45),
      borderLeftColor: stageDeckPlanBorderRgba(deckColorNorm, 0.35),
      borderRightColor: stageDeckPlanBorderRgba(deckColorNorm, 0.35),
    }),
    [deckColorNorm]
  );
  const snapStepY = snapStepYProp ?? snapStep;
  const PLAN_ZOOM_MIN = 0.35;
  const PLAN_ZOOM_MAX = 5;
  const MARQUEE_DRAG_PX = 5;

  const planViewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [planZoom, setPlanZoom] = useState(1);
  const [planPan, setPlanPan] = useState({ x: 0, y: 0 });
  const [planHandMode, setPlanHandMode] = useState(false);
  const spacePanRef = useRef(false);
  const planPanRef = useRef(planPan);
  const [spacePanActive, setSpacePanActive] = useState(false);
  const planPanDragRef = useRef<{
    startClientX: number;
    startClientY: number;
    panX: number;
    panY: number;
  } | null>(null);
  const [planPanning, setPlanPanning] = useState(false);
  const positionsRef = useRef<StageFixturePosition[]>([]);
  const dragRef = useRef<{
    anchorId: number;
    startX: number;
    startY: number;
    snapshot: StageFixturePosition[];
  } | null>(null);
  const landmarkDragRef = useRef<{ id: string; lastX: number; lastY: number } | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [draggingLandmarkId, setDraggingLandmarkId] = useState<string | null>(null);
  const [draggingSceneElementId, setDraggingSceneElementId] = useState<string | null>(
    null
  );
  const sceneElementsRef = useRef<StageSceneElement[]>([]);
  const sceneDragRef = useRef<{
    anchorId: string;
    startX: number;
    startY: number;
    snapshot: StageSceneElement[];
  } | null>(null);
  const marqueeDragRef = useRef<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    clientX: number;
    clientY: number;
    additive: boolean;
    moved: boolean;
  } | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<{
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
  } | null>(null);

  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  useEffect(() => {
    sceneElementsRef.current = sceneElements;
  }, [sceneElements]);

  useEffect(() => {
    planPanRef.current = planPan;
  }, [planPan]);

  const clampPlanZoom = (z: number) =>
    Math.min(PLAN_ZOOM_MAX, Math.max(PLAN_ZOOM_MIN, z));

  const zoomPlanAt = (clientX: number, clientY: number, nextZoom: number) => {
    const plan = stageRef.current;
    if (!plan) {
      setPlanZoom(clampPlanZoom(nextZoom));
      return;
    }
    const rect = plan.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const ox = clientX - cx;
    const oy = clientY - cy;
    setPlanZoom((prevZoom) => {
      const z = clampPlanZoom(nextZoom);
      const ratio = z / prevZoom - 1;
      if (Math.abs(ratio) > 1e-6) {
        setPlanPan((p) => ({
          x: p.x - ox * ratio,
          y: p.y - oy * ratio,
        }));
      }
      return z;
    });
  };

  const resetPlanView = () => {
    setPlanZoom(1);
    setPlanPan({ x: 0, y: 0 });
  };

  /** Cadre toute la salle dans la zone visible (grandes salles). */
  const fitPlanToRoom = () => {
    const vp = planViewportRef.current;
    const stage = stageRef.current;
    if (!vp || !stage) {
      resetPlanView();
      return;
    }
    const pad = 24;
    const availW = Math.max(1, vp.clientWidth - pad);
    const availH = Math.max(1, vp.clientHeight - pad);
    const stageW = stage.offsetWidth;
    const stageH = stage.offsetHeight;
    if (stageW <= 0 || stageH <= 0) {
      resetPlanView();
      return;
    }
    const fit = Math.min(availW / stageW, availH / stageH) * 0.94;
    setPlanZoom(clampPlanZoom(fit));
    setPlanPan({ x: 0, y: 0 });
  };

  useEffect(() => {
    const vp = planViewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0022);
      setPlanZoom((prev) => {
        const next = clampPlanZoom(prev * factor);
        const plan = stageRef.current;
        if (plan && Math.abs(next - prev) > 1e-6) {
          const rect = plan.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const ratio = next / prev - 1;
          setPlanPan((p) => ({
            x: p.x - (e.clientX - cx) * ratio,
            y: p.y - (e.clientY - cy) * ratio,
          }));
        }
        return next;
      });
    };
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const isEditable = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat || isEditable(e.target)) return;
      spacePanRef.current = true;
      setSpacePanActive(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spacePanRef.current = false;
        setSpacePanActive(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      spacePanRef.current = false;
    };
  }, []);

  const beginPlanPan = (clientX: number, clientY: number) => {
    const origin = planPanRef.current;
    planPanDragRef.current = {
      startClientX: clientX,
      startClientY: clientY,
      panX: origin.x,
      panY: origin.y,
    };
    setPlanPanning(true);

    const onMove = (ev: MouseEvent) => {
      const d = planPanDragRef.current;
      if (!d) return;
      setPlanPan({
        x: d.panX + (ev.clientX - d.startClientX),
        y: d.panY + (ev.clientY - d.startClientY),
      });
    };
    const onUp = () => {
      planPanDragRef.current = null;
      setPlanPanning(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const clampPlanPercent = (v: number) => Math.max(0, Math.min(100, v));

  const clientToStagePercent = (clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage) return { x: 50, y: 50 };
    const rect = stage.getBoundingClientRect();
    return {
      x: clampPlanPercent(((clientX - rect.left) / rect.width) * 100),
      y: clampPlanPercent(((clientY - rect.top) / rect.height) * 100),
    };
  };

  const tryStartPlanPan = (e: React.MouseEvent): boolean => {
    const panGesture =
      planHandMode ||
      spacePanRef.current ||
      e.button === 1 ||
      e.button === 2 ||
      (e.button === 0 && e.altKey);
    if (!panGesture) return false;
    e.preventDefault();
    e.stopPropagation();
    beginPlanPan(e.clientX, e.clientY);
    return true;
  };

  const handleResetPositions = () => {
    if (confirm('Réinitialiser toutes les positions et hauteurs des projecteurs ?')) {
      resetAllPositions();
      onClearSelection();
    }
  };

  const idsToMove = (anchorId: number) => {
    if (selectedIds.some((id) => sameFixtureId(id, anchorId))) {
      return selectedIds;
    }
    return [anchorId];
  };

  const sceneIdsToMove = (anchorId: string) => {
    if (selectedSceneElementIds.includes(anchorId)) {
      return selectedSceneElementIds;
    }
    return [anchorId];
  };

  const handleDragStart = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const additive = isStageAdditiveSelect(e);
    if (additive) {
      if (!isSelected(id)) onSelectFixture(id, true);
    } else if (!isSelected(id)) {
      onSelectFixture(id, false);
    }
    const moveIds = idsToMove(id);
    const pos = positionsRef.current.find((p) => sameFixtureId(p.id, id));
    const startX = pos?.x ?? 50;
    const startY = pos?.y ?? 50;
    onBeforeDragCommit?.();
    dragRef.current = {
      anchorId: id,
      startX,
      startY,
      snapshot: positionsRef.current.map((p) => ({ ...p })),
    };
    setDraggingId(id);
  };

  const handleLandmarkDragStart = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const lm = landmarks.find((l) => l.id === id);
    landmarkDragRef.current = {
      id,
      lastX: lm?.x ?? 50,
      lastY: lm?.y ?? 50,
    };
    setDraggingLandmarkId(id);
  };

  const handleSceneElementDragStart = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const additive = isStageAdditiveSelect(e);
    onBeforeSceneDragCommit?.();
    const picked =
      isSceneElementSelected?.(id) ?? selectedSceneElementIds.includes(id);
    if (additive) {
      if (!picked) onSelectSceneElement?.(id, true);
    } else if (!picked) {
      onSelectSceneElement?.(id, false);
    }
    const anchor = sceneElementsRef.current.find((el) => el.id === id);
    sceneDragRef.current = {
      anchorId: id,
      startX: anchor?.x ?? 50,
      startY: anchor?.y ?? 50,
      snapshot: sceneElementsRef.current.map((el) => ({ ...el })),
    };
    setDraggingSceneElementId(id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (
      draggingSceneElementId &&
      stageRef.current &&
      sceneDragRef.current &&
      setSceneElementsLocal
    ) {
      const rect = stageRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const rawX = clampPercent(x);
      const rawY = clampPercent(y);
      const deltaX = rawX - sceneDragRef.current.startX;
      const deltaY = rawY - sceneDragRef.current.startY;
      const moveIds = sceneIdsToMove(sceneDragRef.current.anchorId);
      const next = moveSceneElementsByDelta(
        sceneDragRef.current.snapshot,
        moveIds,
        deltaX,
        deltaY,
        false,
        snapStep,
        snapStepY
      );
      sceneElementsRef.current = next;
      setSceneElementsLocal(next);
      return;
    }

    if (draggingLandmarkId && stageRef.current && onLandmarkMove) {
      const rect = stageRef.current.getBoundingClientRect();
      const x = clampPercent(((e.clientX - rect.left) / rect.width) * 100);
      const y = clampPercent(((e.clientY - rect.top) / rect.height) * 100);
      if (landmarkDragRef.current) {
        landmarkDragRef.current.lastX = x;
        landmarkDragRef.current.lastY = y;
      }
      onLandmarkMove(draggingLandmarkId, x, y);
      return;
    }

    if (draggingId === null || !stageRef.current || !dragRef.current) return;

    const rect = stageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const rawX = clampPercent(x);
    const rawY = clampPercent(y);
    const deltaX = rawX - dragRef.current.startX;
    const deltaY = rawY - dragRef.current.startY;

    const moveIds = idsToMove(dragRef.current.anchorId);
    const next = moveStageSelectionByDelta(
      dragRef.current.snapshot,
      moveIds,
      deltaX,
      deltaY,
      false,
      snapStep,
      snapStepY
    );
    positionsRef.current = next;
    setPositionsLocal(next);
  };

  const handleMouseUp = () => {
    if (draggingSceneElementId && sceneDragRef.current) {
      const moveIds = sceneIdsToMove(sceneDragRef.current.anchorId);
      let next = sceneElementsRef.current;
      next = snapSceneElementsPositions(
        next,
        moveIds,
        snapEnabled,
        snapStep,
        snapStepY
      );
      sceneElementsRef.current = next;
      setSceneElementsLocal?.(next);
      if (saveSceneElements && next.length > 0) {
        saveSceneElements(next);
      }
      setDraggingSceneElementId(null);
      sceneDragRef.current = null;
    }
    if (draggingLandmarkId && onLandmarkMove && landmarkDragRef.current) {
      onLandmarkMove(
        landmarkDragRef.current.id,
        snapPercent(landmarkDragRef.current.lastX, snapStep, snapEnabled),
        snapPercent(landmarkDragRef.current.lastY, snapStepY, snapEnabled)
      );
      setDraggingLandmarkId(null);
      landmarkDragRef.current = null;
    }
    if (draggingId !== null && dragRef.current) {
      const moveIds = idsToMove(dragRef.current.anchorId);
      let next = snapStageFixturePositions(
        positionsRef.current,
        moveIds,
        snapEnabled,
        snapStep,
        snapStepY
      );
      positionsRef.current = next;
      setPositionsLocal(next);
      savePositions(next);
      setDraggingId(null);
      dragRef.current = null;
    }
  };

  const handleStageMouseDown = (e: React.MouseEvent) => {
    if (tryStartPlanPan(e)) return;
    if ((e.target as HTMLElement).closest('[data-plan-object]')) return;
    if (e.button !== 0) return;
    e.stopPropagation();

    const start = clientToStagePercent(e.clientX, e.clientY);
    marqueeDragRef.current = {
      startX: start.x,
      startY: start.y,
      endX: start.x,
      endY: start.y,
      clientX: e.clientX,
      clientY: e.clientY,
      additive: isStageAdditiveSelect(e),
      moved: false,
    };
    setMarqueeRect({
      xMin: start.x,
      yMin: start.y,
      xMax: start.x,
      yMax: start.y,
    });

    const onMove = (ev: MouseEvent) => {
      const drag = marqueeDragRef.current;
      if (!drag) return;
      if (
        Math.hypot(ev.clientX - drag.clientX, ev.clientY - drag.clientY) >=
        MARQUEE_DRAG_PX
      ) {
        drag.moved = true;
      }
      const pt = clientToStagePercent(ev.clientX, ev.clientY);
      drag.endX = pt.x;
      drag.endY = pt.y;
      setMarqueeRect({
        xMin: drag.startX,
        yMin: drag.startY,
        xMax: pt.x,
        yMax: pt.y,
      });
    };

    const onUp = (ev: MouseEvent) => {
      const drag = marqueeDragRef.current;
      if (drag?.moved) {
        const pt = clientToStagePercent(ev.clientX, ev.clientY);
        drag.endX = pt.x;
        drag.endY = pt.y;
      }
      marqueeDragRef.current = null;
      setMarqueeRect(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);

      if (!drag) return;
      if (!drag.moved) {
        onClearSelection();
        return;
      }
      if (!onMarqueeSelect) return;

      const box = {
        xMin: drag.startX,
        yMin: drag.startY,
        xMax: drag.endX,
        yMax: drag.endY,
      };
      const fixtureIds: number[] = [];
      for (const f of fixtures) {
        const pos = positionsRef.current.find((p) => sameFixtureId(p.id, f.id));
        if (pos && !isStageFixtureVisible(pos)) continue;
        const px = pos?.x ?? 50;
        const py = pos?.y ?? 50;
        if (isPlanPointInMarquee(px, py, box)) fixtureIds.push(Number(f.id));
      }
      const sceneElementIds: string[] = [];
      for (const el of sceneElementsRef.current) {
        if (!el.enabled) continue;
        if (isPlanPointInMarquee(el.x, el.y, box)) sceneElementIds.push(el.id);
      }
      onMarqueeSelect(fixtureIds, sceneElementIds, drag.additive);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const getFixtureStyle = (fixture: Fixture) => {
    const start = fixture.address - 1;
    let color = 'rgba(255, 255, 255, 0.2)';
    let beamWidth = 0;
    let beamAngle = 0;

    if (!channels || channels.length < fixture.address + fixture.channels) {
      return { color, beamWidth, beamAngle };
    }

    if (fixture.type === 'RGB') {
      const r = channels[start + 1] || 0;
      const g = channels[start + 2] || 0;
      const b = channels[start + 3] || 0;
      const dim = (channels[start] || 0) / 255;
      color = `rgba(${r}, ${g}, ${b}, ${(dim * 0.8 + 0.2).toFixed(2)})`;
      beamWidth = dim * 100;
    } else if (fixture.type === 'Moving Head') {
      const dimVal = Math.max(channels[start + 5] || 0, channels[start + 7] || 0);
      const dim = dimVal / 255;
      color = `rgba(255, 255, 255, ${(dim * 0.8 + 0.2).toFixed(2)})`;
      beamWidth = dim * 150;
      beamAngle = (channels[start] - 127) * 0.2;
    }

    if (isNaN(beamWidth)) beamWidth = 0;
    if (isNaN(beamAngle)) beamAngle = 0;

    return { color, beamWidth, beamAngle };
  };

  const meterGridStyle =
    !planBackground &&
    roomWidthM != null &&
    roomWidthM > 0 &&
    roomDepthM != null &&
    roomDepthM > 0
      ? {
          backgroundImage:
            'linear-gradient(to right, rgba(34,211,238,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(34,211,238,0.12) 1px, transparent 1px)',
          backgroundSize: `${100 / roomWidthM}% ${100 / roomDepthM}%`,
        }
      : undefined;

  /** Plan à l’échelle : 1 % horizontal = 1 % de L, 1 % vertical = 1 % de P (même ratio mètres). */
  const planAspectStyle: React.CSSProperties | undefined =
    roomWidthM != null &&
    roomDepthM != null &&
    roomWidthM > 0 &&
    roomDepthM > 0
      ? {
          aspectRatio: `${roomWidthM} / ${roomDepthM}`,
          maxWidth: '100%',
          maxHeight: '100%',
          ...(roomWidthM >= roomDepthM
            ? { width: '100%', height: 'auto' }
            : { height: '100%', width: 'auto' }),
        }
      : undefined;

  const stageInsetLeft = stagePlanInsets?.left ?? 0;
  const stageInsetRight = stagePlanInsets?.right ?? 0;
  const showPlanLabels = planZoom >= PLAN_LABEL_MIN_ZOOM;

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center gap-3 px-4 py-2 pl-toolbar flex-wrap">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Move className="w-5 h-5 text-cyan-400 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-sm font-black uppercase tracking-widest">Plan de feu</h2>
            <p className="text-[11px] text-[var(--pl-muted)] font-semibold leading-snug max-w-2xl">
              Glisser dans le vide · sélection ·{' '}
              <span className="font-bold">Shift</span> multi · molette zoom ·{' '}
              <span className="font-bold">Alt</span> / espace / main = pan
            </p>
            {onRoomSizeChange &&
              onStageLayoutChange &&
              roomWidthM != null &&
              roomDepthM != null &&
              roomHeightM != null &&
              stageWidthM != null &&
              stageDepthM != null &&
              stageElevationM != null && (
                <div className="mt-1.5">
                  <StageLayoutDimensionFields
                    variant="plan"
                    roomWidthM={roomWidthM}
                    roomDepthM={roomDepthM}
                    roomHeightM={roomHeightM}
                    stageWidthM={stageWidthM}
                    stageDepthM={stageDepthM}
                    stageElevationM={stageElevationM}
                    audienceOffsetM={audienceOffsetM}
                    onRoomSizeChange={onRoomSizeChange}
                    onLayoutChange={onStageLayoutChange}
                    stageDeckColor={deckColorNorm}
                    onStageDeckColorChange={(hex) =>
                      onStageLayoutChange?.({ stageDeckColor: hex })
                    }
                  />
                </div>
              )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleResetPositions}
          className="pl-toolbar-btn pl-toolbar-btn--md"
          title="Réinitialiser les positions"
        >
          <RefreshCw className="w-3 h-3" />
          Réinitialiser
        </button>
      </div>

      <div
        ref={planViewportRef}
        className="flex-1 min-h-[420px] min-w-0 relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#030508]/80 shadow-inner"
        onMouseDown={(e) => tryStartPlanPan(e)}
        onContextMenu={(e) => {
          if (planHandMode || spacePanRef.current) e.preventDefault();
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center p-3 pointer-events-none">
          <div
            ref={stageRef}
            onMouseDown={handleStageMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onContextMenu={(e) => {
              if (planHandMode || spacePanRef.current) e.preventDefault();
            }}
            style={{
              ...planAspectStyle,
              transform: `translate(${planPan.x}px, ${planPan.y}px) scale(${planZoom})`,
              transformOrigin: 'center center',
            }}
            className={`pl-scene-dark relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#050608] shadow-inner max-w-full max-h-full pointer-events-auto ${
              planHandMode || planPanning || spacePanActive
                ? planPanning
                  ? 'cursor-grabbing'
                  : 'cursor-grab'
                : 'cursor-crosshair'
            } ${planAspectStyle ? '' : 'w-full min-h-[400px]'}`}
          >
        {/* Contour + plancher = zone scène (100 % du plan = fond → public) */}
        <div className="absolute inset-0 z-0 pointer-events-none rounded-[2.5rem] overflow-hidden">
          <div
            className="absolute inset-0 rounded-[2.5rem] border-[3px] border-cyan-400/50 shadow-[inset_0_0_80px_rgba(34,211,238,0.08)]"
            style={{
              backgroundImage: [
                meterGridStyle?.backgroundImage,
                !planBackground && !meterGridStyle && snapEnabled
                  ? 'linear-gradient(to right, rgba(30,41,59,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(30,41,59,0.35) 1px, transparent 1px)'
                  : !planBackground && !meterGridStyle
                    ? 'radial-gradient(circle, #1e293b 1px, transparent 1px)'
                    : undefined,
                'linear-gradient(180deg, rgba(120,53,15,0.2) 0%, rgba(30,41,59,0.38) 45%, rgba(8,47,73,0.18) 100%)',
              ]
                .filter(Boolean)
                .join(', '),
              backgroundSize: [
                meterGridStyle?.backgroundSize,
                !planBackground && !meterGridStyle && snapEnabled
                  ? `${snapStep}% ${snapStepY}%`
                  : !planBackground && !meterGridStyle
                    ? '40px 40px'
                    : undefined,
                '100% 100%',
              ]
                .filter(Boolean)
                .join(', '),
            }}
          />
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />
          <div className="absolute top-0 bottom-0 left-0 w-1 bg-cyan-500/25" />
          <div className="absolute top-0 bottom-0 right-0 w-1 bg-cyan-500/25" />
          {roomWidthM != null &&
            roomDepthM != null &&
            roomWidthM > 0 &&
            roomDepthM > 0 && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-2 rounded-2xl border border-white/5 bg-black/20 text-center opacity-40 pointer-events-none">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400/90">
                  Salle
                </p>
                <p className="text-[11px] font-mono font-bold text-slate-300 tabular-nums mt-0.5">
                  {Math.round(roomWidthM * 10) / 10} × {Math.round(roomDepthM * 10) / 10} m
                </p>
                <p className="text-[7px] font-bold uppercase text-slate-500 mt-1">
                  Plan à l&apos;échelle · 1 carreau = 1 m
                </p>
              </div>
            )}
        </div>

        {stagePublicBoundaryY != null && stageDepthM != null && roomDepthM != null && (
          <>
            <div
              className="absolute z-[1] pointer-events-none border-b border-x"
              style={{
                top: 0,
                height: `${stagePublicBoundaryY}%`,
                left: `${stageInsetLeft}%`,
                right: `${stageInsetRight}%`,
                ...stagePlanDeckStyle,
              }}
            />
            <div
              className="absolute left-0 right-0 z-[1] pointer-events-none bg-sky-950/20"
              style={{ top: `${stagePublicBoundaryY}%`, bottom: 0 }}
            />
            <div
              className="absolute left-0 right-0 z-[2] pointer-events-none border-b-2 border-dashed"
              style={{
                top: `${stagePublicBoundaryY}%`,
                borderColor: stageDeckPlanBorderRgba(deckColorNorm, 0.65),
              }}
            >
              <span
                className="absolute left-3 -bottom-4 text-[7px] font-black uppercase bg-slate-950/70 px-1.5 py-0.5 rounded"
                style={{ color: deckColorNorm }}
              >
                Limite scène
              </span>
              <span className="absolute right-3 -bottom-4 text-[7px] font-black uppercase text-sky-400/90 bg-slate-950/70 px-1.5 py-0.5 rounded">
                Public
              </span>
            </div>
            {stageAudienceStartPlanY != null &&
              stagePublicBoundaryY != null &&
              stageAudienceStartPlanY > stagePublicBoundaryY + 0.35 && (
                <div
                  className="absolute left-0 right-0 z-[2] pointer-events-none border-b border-dotted border-violet-400/70"
                  style={{ top: `${stageAudienceStartPlanY}%` }}
                >
                  <span className="absolute left-1/2 -translate-x-1/2 -bottom-4 text-[7px] font-black uppercase text-violet-300/95 bg-slate-950/70 px-1.5 py-0.5 rounded whitespace-nowrap">
                    Début foule
                  </span>
                </div>
              )}
          </>
        )}
        {planBackground && (
          <img
            src={planBackground.dataUrl}
            alt=""
            className="absolute inset-0 z-[1] w-full h-full object-contain pointer-events-none select-none"
            style={{ opacity: planBackground.opacity }}
            draggable={false}
          />
        )}
        {fixtures.length > 0 &&
          fixtures.map((fixture) => {
            const pos = positions.find((p) => sameFixtureId(p.id, fixture.id)) || {
              id: fixture.id,
              x: 50,
              y: 50,
              z: 100,
            };
            const posX = pos.x ?? 50;
            const posY = pos.y ?? 50;
            const posZ = pos.z ?? 100;
            const { color, beamWidth, beamAngle } = getFixtureStyle(fixture);
            const selected = isSelected(fixture.id);
            const primary =
              primaryId != null && sameFixtureId(primaryId, fixture.id);
            const group = findGroupForFixture(groups, fixture.id);
            const gColor = groupColorOrDefault(groupColors, group?.id);
            const groupBorder = rgbColorToCss(gColor, 0.95);
            const dimmed =
              highlightGroupId &&
              (!group || group.id !== highlightGroupId);

            if (!isStageFixtureVisible(pos)) {
              return null;
            }

            return (
              <div
                key={fixture.id}
                data-plan-object
                onMouseDown={(e) => handleDragStart(fixture.id, e)}
                className={`absolute group cursor-move ${draggingId === fixture.id ? 'z-[60] transition-none' : 'transition-all duration-75 ease-out'} ${selected ? 'z-50' : draggingId === fixture.id ? '' : 'z-10'} ${dimmed ? 'opacity-35' : 'opacity-100'} ${draggingId === fixture.id ? 'scale-110 drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]' : ''}`}
                style={{
                  left: `${posX}%`,
                  top: `${posY}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div
                  className="absolute left-1/2 -translate-x-1/2 rounded-full bg-black/40 blur-md transition-all"
                  style={{
                    bottom: -10,
                    width: primary ? 30 : 20,
                    height: 10,
                    opacity: ((100 - posZ) / 100) * 0.5 + 0.1,
                    transform: `translate(-50%, 0) scale(${1 + posZ / 100})`,
                  }}
                />

                <div
                  className="absolute inset-0 blur-2xl rounded-full opacity-60 pointer-events-none transition-all duration-100"
                  style={{
                    backgroundColor: color,
                    width: `${beamWidth}px`,
                    height: `${beamWidth}px`,
                    transform: `translate(-50%, -50%) rotate(${beamAngle}deg)`,
                  }}
                />

                <div
                  className={`relative w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all ${
                    primary
                      ? 'border-cyan-400 scale-125 shadow-lg bg-slate-800'
                      : selected
                        ? 'border-cyan-500/50 scale-110 bg-slate-800/90'
                        : 'bg-slate-900/80 group-hover:border-white/30'
                  }`}
                  style={{
                    transform: `rotate(${pos.rotationY || 0}deg)`,
                    borderColor: primary || selected ? undefined : groupBorder,
                  }}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-1 h-2 bg-cyan-500 rounded-full opacity-50" />

                  {fixture.type === 'RGB' && <Sun className="w-5 h-5 text-slate-400" />}
                  {fixture.type === 'Moving Head' && (
                    <Move className="w-5 h-5 text-slate-400" />
                  )}
                  {fixture.type === 'Laser' && <Zap className="w-5 h-5 text-slate-400" />}
                  {fixture.type === 'Effect' && <Wind className="w-5 h-5 text-slate-400" />}

                  <div
                    className={`absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border border-white/5 transition-opacity ${
                      selected || showPlanLabels
                        ? selected
                          ? 'opacity-100 bg-cyan-500/20 text-cyan-400'
                          : 'opacity-100 bg-black/40 text-slate-500'
                        : 'opacity-0 group-hover:opacity-100 bg-black/40 text-slate-500'
                    }`}
                  >
                    {fixture.name} {pos.z !== undefined && `(H: ${pos.z}%)`}
                  </div>
                </div>
              </div>
            );
          })}

        {sceneElements
          .filter((el) => el.enabled)
          .map((el) => {
            const selected =
              isSceneElementSelected?.(el.id) ??
              selectedSceneElementIds.includes(el.id);
            return (
              <div
                key={el.id}
                data-plan-object
                onMouseDown={(e) => handleSceneElementDragStart(el.id, e)}
                className={`absolute cursor-move group/scene ${
                  draggingSceneElementId === el.id ? 'scale-110' : ''
                }`}
                style={{
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: selected ? 46 : 45,
                }}
              >
                <div
                  className={`w-10 h-10 rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all ${
                    selected
                      ? 'border-amber-400 bg-amber-500/15 shadow-lg scale-110'
                      : `${sceneElementPlanClass(el.kind)} group-hover/scene:brightness-110`
                  }`}
                >
                  {sceneElementKindIcon(el.kind)}
                </div>
                <span
                  className={`absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[7px] font-black uppercase px-1.5 py-0.5 rounded border transition-opacity ${
                    selected
                      ? 'opacity-100 bg-amber-500/20 text-amber-200 border-amber-500/30'
                      : showPlanLabels
                        ? 'opacity-70 bg-black/55 text-slate-300 border-white/10'
                        : 'opacity-0 group-hover/scene:opacity-80 bg-black/55 text-slate-300 border-white/10'
                  }`}
                >
                  {el.name}
                </span>
              </div>
            );
          })}

        {landmarks.map((lm) => (
          <div
            key={lm.id}
            onMouseDown={(e) => handleLandmarkDragStart(lm.id, e)}
            className={`absolute z-40 cursor-move ${draggingLandmarkId === lm.id ? 'scale-110' : ''}`}
            style={{
              left: `${lm.x}%`,
              top: `${lm.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="flex flex-col items-center gap-0.5 pointer-events-none">
              <MapPin className="w-6 h-6 text-fuchsia-400 drop-shadow-[0_0_8px_rgba(232,121,249,0.6)]" />
              <span
                className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-500/30 whitespace-nowrap transition-opacity ${
                  showPlanLabels ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {lm.name}
              </span>
            </div>
          </div>
        ))}

        {fixtures.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700 opacity-30">
            <Maximize2 className="w-16 h-16 mb-4" />
            <p className="text-sm font-black uppercase tracking-widest">
              Aucun projecteur patché
            </p>
            <p className="text-[10px] font-bold mt-2">
              Allez dans l&apos;onglet Patch pour ajouter des machines
            </p>
          </div>
        ) : null}

        <div className="absolute top-2 left-2 right-2 z-[6] pointer-events-none flex justify-between items-start gap-2">
          <span className="shrink-0 px-2.5 py-1 rounded-full border border-cyan-500/35 bg-slate-950/90 backdrop-blur-sm text-[8px] font-black uppercase text-cyan-300 tracking-wide shadow-lg">
            ↑ Fond
          </span>
          <span className="hidden sm:inline px-2 py-0.5 rounded-full border border-white/10 bg-black/50 text-[7px] font-black uppercase text-slate-400 tracking-wider">
            Vue public
          </span>
          {stageWidthM != null && stageDepthM != null && (
            <span className="max-w-[55%] text-right px-2 py-1 rounded-lg border border-amber-500/40 bg-amber-950/90 backdrop-blur-sm text-[7px] font-mono font-black text-amber-200/95 tabular-nums leading-tight shadow-lg">
              Scène · L {stageWidthM.toFixed(1)} m × prof. {stageDepthM.toFixed(1)} m
            </span>
          )}
        </div>
        <div className="absolute top-1/2 left-2 -translate-y-1/2 z-[6] pointer-events-none">
          <span className="px-2 py-1 rounded-lg border border-slate-500/40 bg-slate-950/85 text-[7px] font-black uppercase text-slate-300 tracking-wide shadow-lg [writing-mode:vertical-rl] rotate-180">
            SR · Stage right
          </span>
        </div>
        <div className="absolute top-1/2 right-2 -translate-y-1/2 z-[6] pointer-events-none">
          <span className="px-2 py-1 rounded-lg border border-slate-500/40 bg-slate-950/85 text-[7px] font-black uppercase text-slate-300 tracking-wide shadow-lg [writing-mode:vertical-rl]">
            SL · Stage left
          </span>
        </div>
        <div className="absolute bottom-2 left-2 right-2 z-[6] pointer-events-none flex justify-between items-end gap-2">
          <span className="shrink-0 px-2.5 py-1 rounded-full border border-cyan-500/45 bg-slate-950/90 backdrop-blur-sm text-[8px] font-black uppercase text-cyan-200 tracking-wide shadow-lg">
            ↓ Public
          </span>
          {stageDepthM != null && roomDepthM != null && (
            <span className="px-2 py-1 rounded-lg border border-sky-500/35 bg-slate-950/90 text-[7px] font-mono text-sky-300/90 tabular-nums shadow-lg">
              Zone public · {Math.max(0, roomDepthM - stageDepthM).toFixed(1)} m
            </span>
          )}
        </div>
        {roomWidthM != null && roomWidthM > 0 && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 pointer-events-none">
            <span className="text-[7px] font-black uppercase text-cyan-600/75 tabular-nums px-2 py-0.5 rounded bg-black/40">
              Salle · L {roomWidthM} m
            </span>
          </div>
        )}

        {marqueeRect && (
          <div
            className="absolute z-[55] pointer-events-none border-2 border-cyan-400/90 bg-cyan-500/15 rounded-sm"
            style={{
              left: `${Math.min(marqueeRect.xMin, marqueeRect.xMax)}%`,
              top: `${Math.min(marqueeRect.yMin, marqueeRect.yMax)}%`,
              width: `${Math.abs(marqueeRect.xMax - marqueeRect.xMin)}%`,
              height: `${Math.abs(marqueeRect.yMax - marqueeRect.yMin)}%`,
            }}
          />
        )}
          </div>
        </div>

        <div className="absolute bottom-4 right-4 z-[60] flex items-center gap-1 pointer-events-auto">
          <button
            type="button"
            onClick={() => setPlanHandMode((m) => !m)}
            className={`p-2 rounded-xl border transition-colors ${
              planHandMode
                ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.45)]'
                : 'bg-slate-950/90 border-white/10 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40'
            }`}
            title="Déplacer la vue (glisser). Espace ou clic droit aussi."
          >
            <Hand className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              const vp = planViewportRef.current;
              const cx = vp ? vp.getBoundingClientRect().left + vp.clientWidth / 2 : 0;
              const cy = vp ? vp.getBoundingClientRect().top + vp.clientHeight / 2 : 0;
              zoomPlanAt(cx, cy, planZoom / 1.2);
            }}
            className="p-2 rounded-xl bg-slate-950/90 border border-white/10 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors"
            title="Zoom arrière"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={resetPlanView}
            className="px-2.5 py-2 rounded-xl bg-slate-950/90 border border-white/10 text-[9px] font-black uppercase text-slate-400 hover:text-cyan-300 tabular-nums min-w-[3.25rem]"
            title="Réinitialiser zoom et position"
          >
            {Math.round(planZoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => {
              const vp = planViewportRef.current;
              const cx = vp ? vp.getBoundingClientRect().left + vp.clientWidth / 2 : 0;
              const cy = vp ? vp.getBoundingClientRect().top + vp.clientHeight / 2 : 0;
              zoomPlanAt(cx, cy, planZoom * 1.2);
            }}
            className="p-2 rounded-xl bg-slate-950/90 border border-white/10 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors"
            title="Zoom avant"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={fitPlanToRoom}
            className="p-2 rounded-xl bg-slate-950/90 border border-white/10 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors"
            title="Ajuster la salle dans la vue (zoom fit)"
          >
            <Scan className="w-3.5 h-3.5" />
          </button>
        </div>

        {roomWidthM != null &&
          roomDepthM != null &&
          roomWidthM > 0 &&
          roomDepthM > 0 && (
            <div
              className="absolute bottom-4 left-4 z-[60] pointer-events-none rounded-lg border border-white/15 bg-slate-950/90 p-1.5 shadow-lg"
              title="Mini-plan · cadre = vue actuelle (approx.)"
            >
              <div
                className="relative bg-[#0a0c10] border border-cyan-500/30 rounded overflow-hidden"
                style={{
                  width: 96,
                  aspectRatio: `${roomWidthM} / ${roomDepthM}`,
                }}
              >
                {stagePublicBoundaryY != null && (
                  <div
                    className="absolute left-0 right-0 top-0 border-b"
                    style={{
                      height: `${stagePublicBoundaryY}%`,
                      backgroundColor: stageDeckPlanFillRgba(deckColorNorm, 0.5),
                      borderColor: stageDeckPlanBorderRgba(deckColorNorm, 0.55),
                    }}
                  />
                )}
                {stagePlanInsets != null && stagePublicBoundaryY != null && (
                  <div
                    className="absolute top-0 border"
                    style={{
                      left: `${stagePlanInsets.left}%`,
                      right: `${stagePlanInsets.right}%`,
                      height: `${stagePublicBoundaryY}%`,
                      borderColor: stageDeckPlanBorderRgba(deckColorNorm, 0.4),
                    }}
                  />
                )}
              </div>
              <p className="text-[6px] font-black uppercase text-slate-500 mt-1 text-center tracking-wide">
                Mini-plan · Scan = fit
              </p>
            </div>
          )}
      </div>
    </div>
  );
};
