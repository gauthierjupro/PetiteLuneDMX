import React, { useState } from 'react';
import { Settings as SettingsIcon, Download, Upload, FolderOpen } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { exportProjectFile, importProjectFile } from '../../utils/projectIo';
import { PROJECT_EXTENSION } from '../../utils/projectFile';
import type { AppTheme, UiDensity } from '../../hooks/useAppPreferences';
import { resetFirstShowWizard } from '../ui/FirstShowWizard';

interface SettingsTabProps {
  selectedPort: string;
  onPortChange: (port: string) => void;
  blackoutOnDisconnect: boolean;
  onBlackoutOnDisconnectChange: (enabled: boolean) => void;
  isConnected: boolean;
  connectionError: string | null;
  actualHz: number;
  targetHz: number;
  latencyMs: number;
  appVersion: string;
  theme: AppTheme;
  onThemeChange: (t: AppTheme) => void;
  density: UiDensity;
  onDensityChange: (d: UiDensity) => void;
  midiEnabled: boolean;
  onMidiEnabledChange: (enabled: boolean) => void;
}

export function SettingsTab({
  selectedPort,
  onPortChange,
  blackoutOnDisconnect,
  onBlackoutOnDisconnectChange,
  isConnected,
  connectionError,
  actualHz,
  targetHz,
  latencyMs,
  appVersion,
  theme,
  onThemeChange,
  density,
  onDensityChange,
  midiEnabled,
  onMidiEnabledChange,
}: SettingsTabProps) {
  const [projectBusy, setProjectBusy] = useState(false);
  const [projectMessage, setProjectMessage] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);

  const handleExport = async () => {
    setProjectBusy(true);
    setProjectError(null);
    setProjectMessage(null);
    try {
      const path = await exportProjectFile(appVersion);
      if (path) {
        setProjectMessage(`Projet exporté : ${path}`);
      }
    } catch (e) {
      setProjectError(e instanceof Error ? e.message : String(e));
    } finally {
      setProjectBusy(false);
    }
  };

  const handleImport = async () => {
    const confirmed = window.confirm(
      `Importer un fichier .${PROJECT_EXTENSION} remplacera le patch, les groupes, presets et positions actuelles.\n\nL'application va se recharger. Continuer ?`
    );
    if (!confirmed) return;

    setProjectBusy(true);
    setProjectError(null);
    setProjectMessage(null);
    try {
      const result = await importProjectFile();
      if (!result) {
        setProjectBusy(false);
        return;
      }
      setProjectMessage(
        `Projet importé (${result.keysApplied} clés) — rechargement…`
      );
      window.setTimeout(() => {
        window.location.reload();
      }, 400);
    } catch (e) {
      setProjectError(e instanceof Error ? e.message : String(e));
      setProjectBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <GlassCard title="Configuration Système" icon={SettingsIcon}>
        <div className="space-y-6">
          <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">Interface DMX</p>
              <p className="text-[10px] text-slate-500">Enttec Open DMX / FT232R USB UART</p>
            </div>
            <select
              value={selectedPort}
              onChange={(e) => onPortChange(e.target.value)}
              className="bg-slate-800 border border-white/10 rounded-lg text-xs p-2 focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="COM1">COM1</option>
              <option value="COM2">COM2</option>
              <option value="COM3">COM3</option>
              <option value="COM4">COM4</option>
              <option value="COM99">COM99</option>
            </select>
          </div>

          <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">État connexion</p>
              <p className="text-[10px] text-slate-500">
                Port {selectedPort}
                {isConnected ? ' · moteur actif' : ' · hors ligne'}
              </p>
            </div>
            <span
              className={`font-mono text-xs font-bold ${
                isConnected ? 'text-cyan-400' : 'text-red-400'
              }`}
            >
              {isConnected ? 'Connecté' : 'Déconnecté'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">
                Fréquence réelle
              </p>
              <p className="text-cyan-400 font-mono text-sm font-bold tabular-nums">
                {isConnected && actualHz > 0 ? `${actualHz.toFixed(1)} Hz` : '—'}
              </p>
              <p className="text-[9px] text-slate-600 mt-1">Cible {targetHz} Hz</p>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">
                Latence envoi
              </p>
              <p className="text-cyan-400 font-mono text-sm font-bold tabular-nums">
                {isConnected ? `${latencyMs < 10 ? latencyMs.toFixed(1) : latencyMs.toFixed(0)} ms` : '—'}
              </p>
              <p className="text-[9px] text-slate-600 mt-1">Break + write série</p>
            </div>
          </div>

          <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">
                Blackout à la déconnexion
              </p>
              <p className="text-[10px] text-slate-500">
                Extinction de l&apos;univers si le port série est perdu (sécurité scène)
              </p>
            </div>
            <button
              type="button"
              onClick={() => onBlackoutOnDisconnectChange(!blackoutOnDisconnect)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors ${
                blackoutOnDisconnect
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-800 border-white/10 text-slate-400'
              }`}
            >
              {blackoutOnDisconnect ? 'Activé' : 'Désactivé'}
            </button>
          </div>

          {!isConnected && connectionError && (
            <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/30 text-red-300 text-xs">
              <p className="font-bold uppercase tracking-wider mb-1">Dernière erreur DMX</p>
              <p className="text-red-200/80 break-words">{connectionError}</p>
              <p className="text-[10px] text-red-400/70 mt-2">
                Reconnexion automatique toutes les secondes — ou cliquez le bouton refresh
                dans l&apos;en-tête.
              </p>
            </div>
          )}
        </div>
      </GlassCard>

      <GlassCard title="Apparence & Live" icon={SettingsIcon}>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">Thème</p>
              <p className="text-[10px] text-slate-500">Clair ou sombre (variables CSS)</p>
            </div>
            <select
              value={theme}
              onChange={(e) => onThemeChange(e.target.value as AppTheme)}
              className="bg-slate-800 border border-white/10 rounded-lg text-xs p-2"
            >
              <option value="dark">Sombre</option>
              <option value="light">Clair</option>
            </select>
          </div>
          <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">Densité UI</p>
              <p className="text-[10px] text-slate-500">Compact pour petits écrans</p>
            </div>
            <select
              value={density}
              onChange={(e) => onDensityChange(e.target.value as UiDensity)}
              className="bg-slate-800 border border-white/10 rounded-lg text-xs p-2"
            >
              <option value="comfortable">Confort</option>
              <option value="compact">Compact</option>
            </select>
          </div>
          <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">Entrée MIDI (Web MIDI)</p>
              <p className="text-[10px] text-slate-500">CC7 → master dimmer (onglet Live)</p>
            </div>
            <button
              type="button"
              onClick={() => onMidiEnabledChange(!midiEnabled)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase border ${
                midiEnabled
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-800 border-white/10 text-slate-400'
              }`}
            >
              {midiEnabled ? 'Activé' : 'Désactivé'}
            </button>
          </div>
          <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-[10px] text-slate-400 space-y-1">
            <p className="font-black uppercase text-slate-500 tracking-widest mb-2">
              Raccourcis Live
            </p>
            <p>
              <span className="text-cyan-400 font-mono">B</span> blackout ·{' '}
              <span className="text-cyan-400 font-mono">T</span> tap tempo ·{' '}
              <span className="text-cyan-400 font-mono">Entrée</span> GO cue ·{' '}
              <span className="text-cyan-400 font-mono">Ctrl+Z</span> undo preset
            </p>
            <p className="text-slate-600">Voir doc/KEYBOARD.md</p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetFirstShowWizard();
              window.location.reload();
            }}
            className="w-full py-2 text-[10px] font-black uppercase text-slate-500 hover:text-cyan-400 border border-white/10 rounded-xl"
          >
            Réafficher le guide premier show
          </button>
        </div>
      </GlassCard>

      <GlassCard title="Projet Show" icon={FolderOpen}>
        <div className="space-y-4">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Exportez ou importez un fichier{' '}
            <span className="text-cyan-400 font-mono">.{PROJECT_EXTENSION}</span> contenant
            le patch, groupes, presets Live, calibration et positions scène. Utile pour
            sauvegarder un show ou le copier sur un autre PC.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={projectBusy}
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border border-cyan-500/40 bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 disabled:opacity-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Exporter
            </button>
            <button
              type="button"
              disabled={projectBusy}
              onClick={handleImport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 disabled:opacity-50 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Importer
            </button>
          </div>

          {projectMessage && (
            <p className="text-[11px] text-cyan-400/90 break-all">{projectMessage}</p>
          )}
          {projectError && (
            <p className="text-[11px] text-red-400 break-words">{projectError}</p>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
