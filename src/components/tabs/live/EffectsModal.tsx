import React from 'react';
import { Modal } from '../../ui/Modal';
import { Move, Square, FastForward, RotateCcw, Save, Edit2, Link2, Link2Off, RefreshCcw } from 'lucide-react';
import { ControlSlider } from '../../ui/ControlSlider';
import { XYPad } from '../../ui/XYPad';

interface EffectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  fixtureIds: number[];
  fixtures: any[];
  groupMovements: Record<string, { shape: any, speed: number, sizePan: number, sizeTilt: number, fan: number, invert180: boolean }>;
  setGroupMovements: (val: any) => void;
  groupPan: Record<string, number>;
  groupTilt: Record<string, number>;
  sendMovement: (ids: number[], x: number, y: number, gid: string) => void;
  groupPositions: Record<string, { x: number, y: number, label: string }[]>;
  setGroupPositions: (val: any) => void;
  groupMovementPresets: Record<string, { shape: string, speed: number, sizePan: number, sizeTilt: number, fan: number, invert180: boolean, label: string }[]>;
  setGroupMovementPresets: (val: any) => void;
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
  sendMovement,
  groupPositions,
  setGroupPositions,
  groupMovementPresets,
  setGroupMovementPresets
}: EffectsModalProps) => {
  const config = groupMovements[groupId] || { shape: 'none', speed: 128, sizePan: 64, sizeTilt: 64, fan: 0, invert180: false };
  const centerX = groupPan[groupId] ?? 127;
  const centerY = groupTilt[groupId] ?? 127;
  const [isLinked, setIsLinked] = React.useState(true);
  const positions = groupPositions[groupId] || [
    { x: 127, y: 127, label: 'Position 1' },
    { x: 127, y: 127, label: 'Position 2' },
    { x: 127, y: 127, label: 'Position 3' },
    { x: 127, y: 127, label: 'Position 4' },
  ];

  const handleSavePosition = (index: number) => {
    const newPositions = [...positions];
    newPositions[index] = { ...newPositions[index], x: centerX, y: centerY };
    setGroupPositions((prev: any) => ({ ...prev, [groupId]: newPositions }));
  };

  const handleRenamePosition = (index: number) => {
    const newLabel = prompt('Entrez le nom de la position :', positions[index].label);
    if (newLabel !== null) {
      const newPositions = [...positions];
      newPositions[index] = { ...newPositions[index], label: newLabel };
      setGroupPositions((prev: any) => ({ ...prev, [groupId]: newPositions }));
    }
  };

  const mvtPresets = groupMovementPresets[groupId] || [
    { shape: 'none', speed: 128, sizePan: 64, sizeTilt: 64, fan: 0, invert180: false, label: 'MVT 1' },
    { shape: 'none', speed: 128, sizePan: 64, sizeTilt: 64, fan: 0, invert180: false, label: 'MVT 2' },
    { shape: 'none', speed: 128, sizePan: 64, sizeTilt: 64, fan: 0, invert180: false, label: 'MVT 3' },
    { shape: 'none', speed: 128, sizePan: 64, sizeTilt: 64, fan: 0, invert180: false, label: 'MVT 4' },
  ];

  const handleSaveMvtPreset = (index: number) => {
    const newPresets = [...mvtPresets];
    newPresets[index] = { ...config, label: newPresets[index].label };
    setGroupMovementPresets((prev: any) => ({ ...prev, [groupId]: newPresets }));
  };

  const handleLoadMvtPreset = (index: number) => {
    const preset = mvtPresets[index];
    setGroupMovements((prev: any) => ({
      ...prev,
      [groupId]: { 
        shape: preset.shape, 
        speed: preset.speed, 
        sizePan: preset.sizePan, 
        sizeTilt: preset.sizeTilt, 
        fan: preset.fan, 
        invert180: preset.invert180 
      }
    }));
  };

  const handleRenameMvtPreset = (index: number) => {
    const newLabel = prompt('Entrez le nom du preset de mouvement :', mvtPresets[index].label);
    if (newLabel !== null) {
      const newPresets = [...mvtPresets];
      newPresets[index] = { ...newPresets[index], label: newLabel };
      setGroupMovementPresets((prev: any) => ({ ...prev, [groupId]: newPresets }));
    }
  };

  // Visualisation de la trajectoire sur le PAD
  const [previewOffset, setPreviewOffset] = React.useState({ x: 0, y: 0 });

  React.useEffect(() => {
    if (config.shape === 'none') {
      setPreviewOffset({ x: 0, y: 0 });
      return;
    }

    let startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = config.speed / 50;
      const sizePan = (config.sizePan ?? 64) / 2;
      const sizeTilt = (config.sizeTilt ?? 64) / 2;
      const phase = elapsed * speed;

      let ox = 0;
      let oy = 0;

      switch (config.shape) {
        case 'circle':
          ox = Math.cos(phase) * sizePan;
          oy = Math.sin(phase) * sizeTilt;
          break;
        case 'eight':
          ox = Math.cos(phase) * sizePan;
          oy = Math.sin(phase * 2) * (sizeTilt / 2);
          break;
        case 'pan_sweep':
          ox = Math.cos(phase) * sizePan;
          break;
        case 'tilt_sweep':
          oy = Math.sin(phase) * sizeTilt;
          break;
      }
      setPreviewOffset({ x: ox, y: oy });
    }, 40);

    return () => clearInterval(interval);
  }, [config.shape, config.speed, config.sizePan, config.sizeTilt]);

  const updateConfig = (newConfig: Partial<typeof config>) => {
    let finalConfig = { ...newConfig };
    
    if (isLinked) {
      if ('sizePan' in newConfig) {
        finalConfig.sizeTilt = newConfig.sizePan;
      } else if ('sizeTilt' in newConfig) {
        finalConfig.sizePan = newConfig.sizeTilt;
      }
    }

    setGroupMovements((prev: any) => ({
      ...prev,
      [groupId]: { ...config, ...finalConfig }
    }));
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`GÉNÉRATEUR DE MOUVEMENTS : ${groupName}`}
      maxWidth="max-w-5xl"
    >
      <div className="space-y-6 p-1">
        {/* GÉNÉRATEUR DE MOUVEMENTS (Calculé par le logiciel) */}
        <div className="bg-[#111317] border border-blue-500/30 rounded-[2rem] p-6 space-y-6 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 blur-[80px] pointer-events-none" />
          
          <div className="flex justify-between items-center relative z-10">
            <div className="flex gap-4 items-center">
              <div className="p-3 bg-blue-500/20 rounded-2xl">
                <Move className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h4 className="text-lg font-black text-blue-400 uppercase tracking-[0.2em]">Trajectoires</h4>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Génération de formes pour {groupName}.</p>
              </div>
            </div>

            <div className="flex gap-2">
              {[
                { id: 'none', label: 'Aucun', icon: <Square className="w-3.5 h-3.5" /> },
                { id: 'circle', label: 'Cercle', icon: <RotateCcw className="w-3.5 h-3.5" /> },
                { id: 'eight', label: 'Huit', icon: <FastForward className="w-3.5 h-3.5" /> },
                { id: 'pan_sweep', label: 'Pan', icon: <Move className="w-3.5 h-3.5" /> },
                { id: 'tilt_sweep', label: 'Tilt', icon: <Move className="w-3.5 h-3.5 rotate-90" /> }
              ].map(shape => (
                <button
                  key={shape.id}
                  onClick={() => updateConfig({ shape: shape.id })}
                  className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 transition-all active:scale-95 border ${
                    config.shape === shape.id
                    ? 'bg-blue-500 text-[#05070a] border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                    : 'bg-slate-800/50 text-slate-400 border-white/5 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  {shape.icon} {shape.label}
                </button>
              ))}
              
              <div className="w-px h-8 bg-white/10 mx-2 self-center" />
              
              <button
                onClick={() => updateConfig({ invert180: !config.invert180 })}
                className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 transition-all active:scale-95 border ${
                  config.invert180
                  ? 'bg-amber-500 text-[#05070a] border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                  : 'bg-slate-800/50 text-slate-400 border-white/5 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <RotateCcw className={`w-3.5 h-3.5 ${config.invert180 ? 'rotate-180' : ''} transition-transform duration-500`} />
                Symétrie (180°)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-8 relative z-10">
            {/* Colonne PAD (Visualisation et Centre) */}
            <div className="col-span-5 flex flex-col items-center gap-4 p-5 bg-black/40 rounded-[1.5rem] border border-white/5 shadow-inner">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-blue-500/20 pb-1.5 w-full text-center">Centre & Aperçu</p>
              <div className="relative group/pad">
                <XYPad 
                  x={centerX} 
                  y={centerY} 
                  onChange={(nx, ny) => sendMovement(fixtureIds, nx, ny, groupId)}
                  size={300}
                />
                
                {/* Point de prévisualisation du mouvement réel */}
                {config.shape !== 'none' && (
                  <div 
                    className="absolute pointer-events-none w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_10px_#22d3ee] border border-white/50 transition-all duration-75 z-20"
                    style={{
                      left: `${(Math.min(255, Math.max(0, centerX + previewOffset.x)) / 255) * 300}px`,
                      top: `${(Math.min(255, Math.max(0, centerY + previewOffset.y)) / 255) * 300}px`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  />
                )}
                
                {/* Indicateur de centre statique si mouvement actif */}
                {config.shape !== 'none' && (
                  <div 
                    className="absolute pointer-events-none w-1.5 h-1.5 bg-white/20 rounded-full border border-white/40"
                    style={{
                      left: `${(centerX / 255) * 300}px`,
                      top: `${(centerY / 255) * 300}px`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  />
                )}
              </div>
              <button 
                onClick={() => {
                  sendMovement(fixtureIds, 127, 127, groupId);
                  updateConfig({ shape: 'none' });
                }}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-[8px] font-black text-slate-400 uppercase rounded-lg border border-white/5 transition-all"
              >
                Recentrer
              </button>

              {/* Valeurs numériques et Faders de contrôle du centre */}
              <div className="flex flex-col gap-4 w-full mt-2">
                <div className="bg-black/60 p-3 rounded-xl border border-white/5 space-y-3">
                  <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Axe Pan</span>
                      <span className="text-[7px] font-bold text-slate-600 uppercase">Base: {centerX}</span>
                    </div>
                    <span className="text-[10px] font-mono font-black text-cyan-400">LIVE: {Math.round(Math.min(255, Math.max(0, centerX + previewOffset.x)))}</span>
                  </div>
                  <ControlSlider 
                    label="Center Pan" 
                    value={centerX} 
                    onChange={(nx) => sendMovement(fixtureIds, Number(nx), centerY, groupId)} 
                    color="bg-cyan-500/50" 
                  />
                </div>

                <div className="bg-black/60 p-3 rounded-xl border border-white/5 space-y-3">
                  <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Axe Tilt</span>
                      <span className="text-[7px] font-bold text-slate-600 uppercase">Base: {centerY}</span>
                    </div>
                    <span className="text-[10px] font-mono font-black text-indigo-400">LIVE: {Math.round(Math.min(255, Math.max(0, centerY + previewOffset.y)))}</span>
                  </div>
                  <ControlSlider 
                    label="Center Tilt" 
                    value={centerY} 
                    onChange={(ny) => sendMovement(fixtureIds, centerX, Number(ny), groupId)} 
                    color="bg-indigo-500/50" 
                  />
                </div>
              </div>
            </div>

            {/* Colonne Sliders (Réglages) et Mémorisation */}
            <div className="col-span-7 flex flex-col justify-between py-1">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center pr-2">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-l-2 border-blue-500 pl-3">Vitesse</p>
                    <span className="text-lg font-mono font-black text-blue-400">{Math.round((config.speed / 255) * 100)}%</span>
                  </div>
                  <ControlSlider 
                    label="Fréquence" 
                    value={config.speed} 
                    onChange={(v) => updateConfig({ speed: Number(v) })} 
                    color="bg-blue-500" 
                  />
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                <div className="space-y-2">
                  <div className="flex justify-between items-center pr-2">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-l-2 border-cyan-500 pl-3">Amplitude Pan</p>
                    <span className="text-sm font-mono font-black text-cyan-400">{Math.round(((config.sizePan ?? 64) / 255) * 100)}%</span>
                  </div>
                  <ControlSlider 
                    label="Largeur" 
                    value={config.sizePan ?? 64} 
                    onChange={(v) => updateConfig({ sizePan: Number(v) })} 
                    color="bg-cyan-500" 
                  />
                </div>

                <div className="flex flex-col gap-2 pt-4">
                  <button
                    onClick={() => setIsLinked(!isLinked)}
                    className={`p-2 rounded-lg border transition-all ${
                      isLinked 
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' 
                      : 'bg-slate-800/50 border-white/5 text-slate-500'
                    }`}
                    title={isLinked ? "Délier les amplitudes" : "Lier les amplitudes"}
                  >
                    {isLinked ? <Link2 className="w-4 h-4" /> : <Link2Off className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => updateConfig({ sizePan: 64, sizeTilt: 64 })}
                    className="p-2 rounded-lg bg-slate-800/50 border border-white/5 text-slate-500 hover:text-white hover:border-white/20 transition-all"
                    title="Réinitialiser les amplitudes (50%)"
                  >
                    <RefreshCcw className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center pr-2">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-l-2 border-indigo-500 pl-3">Amplitude Tilt</p>
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

                <div className="space-y-2">
                  <div className="flex justify-between items-center pr-2">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-l-2 border-blue-500 pl-3">Décalage (FAN)</p>
                    <span className="text-lg font-mono font-black text-blue-400">{Math.round((config.fan / 255) * 100)}%</span>
                  </div>
                  <ControlSlider 
                  label="Phase entre lyres" 
                  value={config.fan} 
                  onChange={(v) => updateConfig({ fan: Number(v) })} 
                  color="bg-blue-500" 
                />
              </div>
            </div>

              {/* Mémorisation de mouvements */}
              <div className="mt-4 p-4 bg-black/40 rounded-2xl border border-white/5 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em]">Mémoires de Mouvements</p>
                  <span className="text-[8px] text-slate-600 italic">Clic Droit : Sauver | Clic G : Charger</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {mvtPresets.map((preset: any, i: number) => {
                    const isCurrent = config.shape === preset.shape && 
                                    config.speed === preset.speed && 
                                    config.sizePan === preset.sizePan && 
                                    config.sizeTilt === preset.sizeTilt && 
                                    config.fan === preset.fan && 
                                    config.invert180 === preset.invert180;
                    return (
                      <div key={i} className="group relative">
                        <button
                          onContextMenu={(e) => {
                            e.preventDefault();
                            handleSaveMvtPreset(i);
                          }}
                          onClick={() => handleLoadMvtPreset(i)}
                          className={`w-full py-3 rounded-xl border transition-all flex flex-col items-center gap-1 ${
                            isCurrent
                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                            : 'bg-slate-800/50 border-white/5 text-slate-400 hover:border-blue-500/30 hover:text-blue-300'
                          }`}
                        >
                          <Save className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                          <span className="text-[8px] font-black uppercase truncate w-full px-1">{preset.label}</span>
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRenameMvtPreset(i);
                          }}
                          className="absolute -top-1 -right-1 p-1 bg-slate-900 border border-white/10 rounded-full opacity-0 group-hover:opacity-100 hover:bg-blue-500 transition-all z-10"
                        >
                          <Edit2 className="w-2 h-2 text-white" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mémorisation de positions */}
              <div className="mt-4 p-4 bg-black/40 rounded-2xl border border-white/5 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Positions Mémorisées</p>
                  <span className="text-[8px] text-slate-600 italic">Clic Droit : Sauver | Clic G : Aller</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {positions.map((pos: any, i: number) => (
                    <div key={i} className="group relative">
                      <button
                        onContextMenu={(e) => {
                          e.preventDefault();
                          handleSavePosition(i);
                        }}
                        onClick={() => sendMovement(fixtureIds, pos.x, pos.y, groupId)}
                        className={`w-full py-4 rounded-xl border transition-all flex flex-col items-center gap-1 ${
                          centerX === pos.x && centerY === pos.y
                          ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                          : 'bg-slate-800/50 border-white/5 text-slate-400 hover:border-blue-500/30 hover:text-blue-300'
                        }`}
                      >
                        <Save className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                        <span className="text-[8px] font-black uppercase truncate w-full px-1">{pos.label}</span>
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenamePosition(i);
                        }}
                        className="absolute -top-1 -right-1 p-1 bg-slate-900 border border-white/10 rounded-full opacity-0 group-hover:opacity-100 hover:bg-blue-500 transition-all"
                      >
                        <Edit2 className="w-2 h-2 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2 flex justify-end gap-4">
          <button 
            onClick={() => {
              updateConfig({ shape: 'none', speed: 128, sizePan: 64, sizeTilt: 64, fan: 0, invert180: false });
              sendMovement(fixtureIds, 127, 127, groupId);
            }}
            className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 border border-white/5 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] transition-all active:scale-95"
          >
            Réinitialiser
          </button>
          <button 
            onClick={onClose}
            className="px-12 py-4 bg-slate-800 hover:bg-slate-700 text-white border border-white/5 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] transition-all shadow-xl active:scale-95"
          >
            Fermer
          </button>
        </div>
    </Modal>
  );
};
