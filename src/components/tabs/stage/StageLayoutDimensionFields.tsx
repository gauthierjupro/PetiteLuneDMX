import React, { useEffect, useState } from 'react';

export type StageLayoutDimensionPatch = {
  roomHeight?: number;
  stageWidthM?: number;
  stageElevationM?: number;
  stageDepthM?: number;
  stageDeckColor?: string;
  audienceOffsetM?: number;
};

type Variant = 'plan' | 'panel3d';

interface StageLayoutDimensionFieldsProps {
  variant?: Variant;
  roomWidthM: number;
  roomDepthM: number;
  roomHeightM: number;
  stageWidthM: number;
  stageDepthM: number;
  stageElevationM: number;
  audienceOffsetM?: number;
  onRoomSizeChange: (widthM: number, depthM: number) => void;
  onLayoutChange: (patch: StageLayoutDimensionPatch) => void;
  fogDensity?: number;
  onFogDensityChange?: (value: number) => void;
  stageDeckColor?: string;
  onStageDeckColorChange?: (hex: string) => void;
}

const parseDim = (raw: string) => parseFloat(raw.replace(',', '.'));

const commitOnEnter = (commit: () => void) => (e: React.KeyboardEvent) => {
  if (e.key === 'Enter') {
    commit();
    (e.target as HTMLInputElement).blur();
  }
};

function DimField({
  label,
  value,
  onChange,
  onCommit,
  tone,
  title,
  suffix = 'm',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  tone: 'room' | 'stage';
  title: string;
  suffix?: string;
}) {
  return (
    <label className="pl-dim-field" title={title}>
      {label}
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={commitOnEnter(onCommit)}
        className={`pl-dim-input pl-dim-input--${tone}`}
      />
      {suffix}
    </label>
  );
}

export function StageLayoutDimensionFields({
  variant = 'plan',
  roomWidthM,
  roomDepthM,
  roomHeightM,
  stageWidthM,
  stageDepthM,
  stageElevationM,
  audienceOffsetM = 0,
  onRoomSizeChange,
  onLayoutChange,
  fogDensity,
  onFogDensityChange,
  stageDeckColor,
  onStageDeckColorChange,
}: StageLayoutDimensionFieldsProps) {
  const [roomWidthDraft, setRoomWidthDraft] = useState('');
  const [roomDepthDraft, setRoomDepthDraft] = useState('');
  const [roomHeightDraft, setRoomHeightDraft] = useState('');
  const [stageWidthDraft, setStageWidthDraft] = useState('');
  const [stageDepthDraft, setStageDepthDraft] = useState('');
  const [stageElevationDraft, setStageElevationDraft] = useState('');
  const [audienceOffsetDraft, setAudienceOffsetDraft] = useState('');
  const [fogDraft, setFogDraft] = useState('');

  useEffect(() => {
    setRoomWidthDraft(String(Math.round(roomWidthM * 10) / 10));
  }, [roomWidthM]);

  useEffect(() => {
    setRoomDepthDraft(String(Math.round(roomDepthM * 10) / 10));
  }, [roomDepthM]);

  useEffect(() => {
    setRoomHeightDraft(String(Math.round(roomHeightM * 10) / 10));
  }, [roomHeightM]);

  useEffect(() => {
    setStageWidthDraft(String(Math.round(stageWidthM * 10) / 10));
  }, [stageWidthM]);

  useEffect(() => {
    setStageDepthDraft(String(Math.round(stageDepthM * 10) / 10));
  }, [stageDepthM]);

  useEffect(() => {
    setStageElevationDraft(String(Math.round(stageElevationM * 100) / 100));
  }, [stageElevationM]);

  useEffect(() => {
    setAudienceOffsetDraft(String(Math.round(audienceOffsetM * 10) / 10));
  }, [audienceOffsetM]);

  useEffect(() => {
    if (fogDensity != null) setFogDraft(String(Math.round(fogDensity)));
  }, [fogDensity]);

  const commitRoomWidth = () => {
    const w = parseDim(roomWidthDraft);
    if (Number.isFinite(w)) onRoomSizeChange(w, roomDepthM);
  };

  const commitRoomDepth = () => {
    const d = parseDim(roomDepthDraft);
    if (Number.isFinite(d)) onRoomSizeChange(roomWidthM, d);
  };

  const commitRoomHeight = () => {
    const h = parseDim(roomHeightDraft);
    if (Number.isFinite(h)) onLayoutChange({ roomHeight: h });
  };

  const commitStageWidth = () => {
    const w = parseDim(stageWidthDraft);
    if (Number.isFinite(w)) onLayoutChange({ stageWidthM: w });
  };

  const commitStageDepth = () => {
    const d = parseDim(stageDepthDraft);
    if (Number.isFinite(d)) onLayoutChange({ stageDepthM: d });
  };

  const commitStageElevation = () => {
    const h = parseDim(stageElevationDraft);
    if (Number.isFinite(h)) onLayoutChange({ stageElevationM: h });
  };

  const commitAudienceOffset = () => {
    const o = parseDim(audienceOffsetDraft);
    if (Number.isFinite(o)) onLayoutChange({ audienceOffsetM: o });
  };

  const commitFog = () => {
    if (!onFogDensityChange) return;
    const v = parseDim(fogDraft);
    if (Number.isFinite(v)) onFogDensityChange(v);
  };

  const publicDepthM = Math.max(0, roomDepthM - stageDepthM);
  const crowdDepthM = Math.max(0, publicDepthM - audienceOffsetM);
  const panelClass =
    variant === 'panel3d' ? 'pl-dim-panel pl-dim-panel--3d' : 'pl-dim-panel';

  return (
    <div className={panelClass}>
      <div className="pl-dim-row">
        <span className="pl-dim-zone pl-dim-zone--room">Salle</span>
        <DimField
          label="L"
          value={roomWidthDraft}
          onChange={setRoomWidthDraft}
          onCommit={commitRoomWidth}
          tone="room"
          title="Largeur de la salle (m)"
        />
        <span className="text-[var(--pl-muted)] text-xs font-bold" aria-hidden>
          ×
        </span>
        <DimField
          label="P"
          value={roomDepthDraft}
          onChange={setRoomDepthDraft}
          onCommit={commitRoomDepth}
          tone="room"
          title="Profondeur fond → mur public (m)"
        />
        <span className="text-[var(--pl-muted)] text-xs font-bold" aria-hidden>
          ×
        </span>
        <DimField
          label="H"
          value={roomHeightDraft}
          onChange={setRoomHeightDraft}
          onCommit={commitRoomHeight}
          tone="room"
          title="Hauteur sous plafond / murs 3D (m)"
        />
        <span className="pl-dim-hint">Murs 3D · zone public incluse dans P</span>
      </div>

      <div className="pl-dim-row">
        <span className="pl-dim-zone pl-dim-zone--stage">Scène</span>
        <span className="pl-dim-summary hidden sm:inline" title="Aperçu des dimensions plateau">
          {stageWidthM.toFixed(1)} × {stageDepthM.toFixed(1)} m
        </span>
        <DimField
          label="L"
          value={stageWidthDraft}
          onChange={setStageWidthDraft}
          onCommit={commitStageWidth}
          tone="stage"
          title="Largeur du plateau (m), centrée"
        />
        <DimField
          label="Prof."
          value={stageDepthDraft}
          onChange={setStageDepthDraft}
          onCommit={commitStageDepth}
          tone="stage"
          title="Profondeur depuis le fond (m)"
        />
        <DimField
          label="H. estrade"
          value={stageElevationDraft}
          onChange={setStageElevationDraft}
          onCommit={commitStageElevation}
          tone="stage"
          title="Hauteur du plateau au-dessus du sol public (m)"
        />
        {onStageDeckColorChange && stageDeckColor && (
          <label
            className="pl-dim-field"
            title="Couleur du plateau (plan 2D et bloc 3D)"
          >
            Couleur
            <input
              type="color"
              value={stageDeckColor}
              onChange={(e) => onStageDeckColorChange(e.target.value)}
              className="w-8 h-8 rounded-md border border-[var(--pl-border)] cursor-pointer p-0.5 bg-[var(--pl-input-bg)]"
            />
          </label>
        )}
      </div>

      <div className="pl-dim-row">
        <span className="pl-dim-zone pl-dim-zone--public">Public</span>
        <DimField
          label="Recul"
          value={audienceOffsetDraft}
          onChange={setAudienceOffsetDraft}
          onCommit={commitAudienceOffset}
          tone="room"
          title="Distance entre le bord scène et le début de la foule (fosse / allée)"
        />
        <span className="pl-dim-hint hidden md:inline">
          Sol public {publicDepthM.toFixed(1)} m · foule {crowdDepthM.toFixed(1)} m
        </span>
        <span className="pl-dim-value-strong md:hidden">{publicDepthM.toFixed(1)} m</span>
      </div>

      {onFogDensityChange && fogDensity != null && (
        <div className="pl-dim-row">
          <span className="pl-dim-zone pl-dim-zone--room">Ambiance</span>
          <DimField
            label="Brouillard"
            value={fogDraft}
            onChange={setFogDraft}
            onCommit={commitFog}
            tone="room"
            title="Densité brouillard 3D (0–100)"
            suffix="%"
          />
        </div>
      )}
    </div>
  );
}
