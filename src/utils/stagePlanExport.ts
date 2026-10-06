import { save } from '@tauri-apps/api/dialog';
import { invoke } from '@tauri-apps/api/tauri';
import type { Fixture, StageFixturePosition, StageSceneElement } from '../types';
import { isStageFixtureVisible, sameFixtureId } from './stagePositions';

export type StagePlanExportInput = {
  roomWidthM: number;
  roomDepthM: number;
  stageWidthM: number;
  stageDepthM: number;
  publicDepthM: number;
  stageInsetLeftPct: number;
  stageInsetRightPct: number;
  stagePublicBoundaryY: number;
  fixtures: Fixture[];
  positions: StageFixturePosition[];
  sceneElements: StageSceneElement[];
};

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function planPercentToMeters(
  xPct: number,
  yPct: number,
  roomWidthM: number,
  roomDepthM: number
): { x: number; y: number } {
  return {
    x: (xPct / 100) * roomWidthM,
    y: (yPct / 100) * roomDepthM,
  };
}

/** SVG plan de feu (vue public, mètres) pour impression / partage crew. */
export function buildStagePlanSvg(input: StagePlanExportInput): string {
  const {
    roomWidthM,
    roomDepthM,
    stageWidthM,
    stageDepthM,
    publicDepthM,
    stageInsetLeftPct,
    stageInsetRightPct,
    stagePublicBoundaryY,
    fixtures,
    positions,
    sceneElements,
  } = input;

  const legendH = 4.2;
  const pad = 0.8;
  const totalW = roomWidthM + pad * 2;
  const totalH = roomDepthM + legendH + pad * 2;
  const ox = pad;
  const oy = pad;

  const stageX = ox + (stageInsetLeftPct / 100) * roomWidthM;
  const stageW = stageWidthM;
  const stageH = (stagePublicBoundaryY / 100) * roomDepthM;

  const dateStr = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  let body = '';

  body += `<rect x="${ox}" y="${oy}" width="${roomWidthM}" height="${roomDepthM}" fill="#0a0c10" stroke="#22d3ee" stroke-width="0.08"/>`;
  body += `<rect x="${stageX}" y="${oy}" width="${stageW}" height="${stageH}" fill="#1c1408" fill-opacity="0.55" stroke="#f59e0b" stroke-width="0.06" stroke-dasharray="0.2 0.15"/>`;
  body += `<line x1="${ox}" y1="${oy + stageH}" x2="${ox + roomWidthM}" y2="${oy + stageH}" stroke="#f59e0b" stroke-width="0.05" stroke-dasharray="0.15 0.12"/>`;

  for (let m = 0; m <= roomWidthM; m += 1) {
    const x = ox + m;
    body += `<line x1="${x}" y1="${oy}" x2="${x}" y2="${oy + roomDepthM}" stroke="#22d3ee" stroke-opacity="0.12" stroke-width="0.02"/>`;
  }
  for (let m = 0; m <= roomDepthM; m += 1) {
    const y = oy + m;
    body += `<line x1="${ox}" y1="${y}" x2="${ox + roomWidthM}" y2="${y}" stroke="#22d3ee" stroke-opacity="0.12" stroke-width="0.02"/>`;
  }

  body += `<text x="${ox + roomWidthM / 2}" y="${oy - 0.25}" text-anchor="middle" fill="#67e8f9" font-size="0.45" font-family="system-ui,sans-serif" font-weight="700">↑ FOND · VUE PUBLIC</text>`;
  body += `<text x="${ox + 0.3}" y="${oy + roomDepthM / 2}" fill="#94a3b8" font-size="0.35" font-family="system-ui,sans-serif" font-weight="700">STAGE RIGHT · SR</text>`;
  body += `<text x="${ox + roomWidthM - 0.3}" y="${oy + roomDepthM / 2}" text-anchor="end" fill="#94a3b8" font-size="0.35" font-family="system-ui,sans-serif" font-weight="700">STAGE LEFT · SL</text>`;
  body += `<text x="${ox + roomWidthM / 2}" y="${oy + roomDepthM + 0.45}" text-anchor="middle" fill="#7dd3fc" font-size="0.38" font-family="system-ui,sans-serif" font-weight="700">↓ PUBLIC</text>`;

  for (const el of sceneElements) {
    if (!el.enabled) continue;
    const { x, y } = planPercentToMeters(el.x, el.y, roomWidthM, roomDepthM);
    body += `<rect x="${ox + x - 0.25}" y="${oy + y - 0.25}" width="0.5" height="0.5" rx="0.08" fill="#fbbf24" fill-opacity="0.35" stroke="#fcd34d" stroke-width="0.04"/>`;
    body += `<text x="${ox + x}" y="${oy + y + 0.55}" text-anchor="middle" fill="#fde68a" font-size="0.28" font-family="system-ui,sans-serif">${escapeXml(el.name)}</text>`;
  }

  for (const f of fixtures) {
    const pos = positions.find((p) => sameFixtureId(p.id, f.id));
    if (pos && !isStageFixtureVisible(pos)) continue;
    const px = pos?.x ?? 50;
    const py = pos?.y ?? 50;
    const { x, y } = planPercentToMeters(px, py, roomWidthM, roomDepthM);
    body += `<circle cx="${ox + x}" cy="${oy + y}" r="0.28" fill="#0891b2" fill-opacity="0.5" stroke="#22d3ee" stroke-width="0.05"/>`;
    body += `<text x="${ox + x}" y="${oy + y + 0.62}" text-anchor="middle" fill="#a5f3fc" font-size="0.26" font-family="system-ui,sans-serif">${escapeXml(f.name)}</text>`;
  }

  const ly = oy + roomDepthM + 0.9;
  body += `<text x="${ox}" y="${ly}" fill="#e2e8f0" font-size="0.42" font-family="system-ui,sans-serif" font-weight="800">PetiteLune DMX — Plan de feu</text>`;
  body += `<text x="${ox}" y="${ly + 0.55}" fill="#94a3b8" font-size="0.32" font-family="system-ui,sans-serif">Généré le ${escapeXml(dateStr)} · Salle ${roomWidthM.toFixed(1)} × ${roomDepthM.toFixed(1)} m · Scène ${stageWidthM.toFixed(1)} × ${stageDepthM.toFixed(1)} m · Public ${publicDepthM.toFixed(1)} m</text>`;
  body += `<text x="${ox}" y="${ly + 1.05}" fill="#64748b" font-size="0.28" font-family="system-ui,sans-serif">● Projecteur · ■ Élément scène · SR/SL = côtés scène (vue public)</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" width="${totalW * 48}" height="${totalH * 48}">
  ${body}
</svg>`;
}

export async function stagePlanSvgToPngBlob(svg: string): Promise<Blob> {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Export SVG impossible'));
      image.src = url;
    });
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas indisponible');
    ctx.fillStyle = '#030508';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG impossible'))), 'image/png');
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function saveStagePlanPng(blob: Blob, defaultName: string): Promise<void> {
  try {
    const path = await save({
      defaultPath: defaultName,
      filters: [{ name: 'Image PNG', extensions: ['png'] }],
    });
    if (!path || typeof path !== 'string') return;
    const bytes = Array.from(new Uint8Array(await blob.arrayBuffer()));
    await invoke('save_binary_file', { path, bytes });
  } catch {
    downloadBlob(blob, defaultName);
  }
}

export async function exportStagePlanPng(input: StagePlanExportInput): Promise<void> {
  const svg = buildStagePlanSvg(input);
  const png = await stagePlanSvgToPngBlob(svg);
  const stamp = new Date().toISOString().slice(0, 10);
  await saveStagePlanPng(png, `plan-scene-${stamp}.png`);
}
