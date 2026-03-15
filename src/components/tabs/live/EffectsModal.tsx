import React from 'react';
import { Modal } from '../../ui/Modal';
import { Move, Square, FastForward, RotateCcw, Save, Edit2, Link2, Link2Off, RefreshCcw, Plus, Trash2, Play, MousePointer2, HelpCircle } from 'lucide-react';
import { ControlSlider } from '../../ui/ControlSlider';
import { XYPad } from '../../ui/XYPad';
import { Tooltip } from '../../ui/Tooltip';

interface EffectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  fixtureIds: number[];
  fixtures: any[];
  groupMovements: Record<string, { 
    shape: any, 
    speed: number, 
    sizePan: number, 
    sizeTilt: number, 
    fan: number, 
    invert180: boolean,
    customPoints?: {x: number, y: number}[] 
  }>;
  setGroupMovements: (val: any) => void;
  groupPan: Record<string, number>;
  groupTilt: Record<string, number>;
  sendMovement: (ids: number[], x: number, y: number, gid: string) => void;
  groupPositions: Record<string, { x: number, y: number, label: string }[]>;
  setGroupPositions: (val: any) => void;
  groupMovementPresets: Record<string, { 
    shape: string, 
    speed: number, 
    sizePan: number, 
    sizeTilt: number, 
    fan: number, 
    invert180: boolean, 
    label: string,
    customPoints?: {x: number, y: number}[] 
  }[]>;
  setGroupMovementPresets: (val: any) => void;
  groupCustomTrajectories: Record<string, { id: string, label: string, points: {x: number, y: number}[] }[]>;
  setGroupCustomTrajectories: (val: any) => void;
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
  setGroupMovementPresets,
  groupCustomTrajectories,
  setGroupCustomTrajectories
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
    // On sauvegarde tout l'objet config actuel, y compris les customPoints si présents
    newPresets[index] = { 
      ...config, 
      label: newPresets[index].label,
      customPoints: config.shape === 'custom' ? localCustomPoints : (config.customPoints || [])
    };
    setGroupMovementPresets((prev: any) => ({ ...prev, [groupId]: newPresets }));
  };

  const handleLoadMvtPreset = (index: number) => {
    const preset = mvtPresets[index];
    setGroupMovements((prev: any) => ({
      ...prev,
      [groupId]: { 
        ...prev[groupId],
        shape: preset.shape, 
        speed: preset.speed, 
        sizePan: preset.sizePan, 
        sizeTilt: preset.sizeTilt, 
        fan: preset.fan, 
        invert180: preset.invert180,
        customPoints: preset.customPoints || []
      }
    }));
    // Si c'est un mouvement custom, on met à jour les points locaux pour le PAD
    if (preset.shape === 'custom' && preset.customPoints) {
      setLocalCustomPoints(preset.customPoints);
    }
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

  // État pour le générateur de trajectoire personnalisée (Points)
  const [localCustomPoints, setLocalCustomPoints] = React.useState<{x: number, y: number}[]>(config.customPoints || []);
  const [isRecording, setIsRecording] = React.useState(false);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [selectedPointIndex, setSelectedPointIndex] = React.useState<number | null>(null);
  // Point fantôme pour prévisualiser le futur point pendant l'enregistrement
  const [phantomPoint, setPhantomPoint] = React.useState<{x: number, y: number} | null>(null);
  const [trajMenu, setTrajMenu] = React.useState<{id: string, x: number, y: number} | null>(null);

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
        sendMovement(fixtureIds, nx, ny, groupId);
      }
    } else if (isRecording) {
      setPhantomPoint({ x: nx, y: ny });
      sendMovement(fixtureIds, nx, ny, groupId);
    } else {
      sendMovement(fixtureIds, nx, ny, groupId);
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

  const handleSaveTrajectory = () => {
    if (localCustomPoints.length < 2) return;
    const name = prompt("Nom de la trajectoire :", `Trajet ${customTrajectories.length + 1}`);
    if (!name) return;

    const newTraj = {
      id: Date.now().toString(),
      label: name,
      points: localCustomPoints
    };

    setGroupCustomTrajectories((prev: any) => ({
      ...prev,
      [groupId]: [...(prev[groupId] || []), newTraj]
    }));
    
    updateConfig({ shape: 'custom', customPoints: localCustomPoints });
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
  };

  React.useEffect(() => {
    if (config.shape === 'none') {
      setPreviewOffset({ x: 0, y: 0 });
      return;
    }

    const pts = isRecording ? localCustomPoints : (config.customPoints || []);
    if (config.shape === 'custom' && pts.length < 2) {
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
        case 'custom':
          if (pts.length > 1) {
            const total = pts.length;
            const t = (phase % total);
            const i = Math.floor(t);
            const nextI = (i + 1) % total;
            const frac = t - i;
            
            const p1 = pts[i];
            const p2 = pts[nextI];
            
            ox = (p1.x + (p2.x - p1.x) * frac - 127) * (config.sizePan / 128);
            oy = (p1.y + (p2.y - p1.y) * frac - 127) * (config.sizeTilt / 128);
          }
          break;
      }
      setPreviewOffset({ x: ox, y: oy });
    }, 40);

    return () => clearInterval(interval);
  }, [config.shape, config.speed, config.sizePan, config.sizeTilt, config.customPoints, localCustomPoints, isRecording]);

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
    const traj = customTrajectories.find(t => t.id === trajId);
    if (!traj) return;
    const newName = prompt("Nouveau nom :", traj.label);
    if (!newName) return;
    setGroupCustomTrajectories((prev: any) => ({
      ...prev,
      [groupId]: (prev[groupId] || []).map((t: any) => t.id === trajId ? { ...t, label: newName } : t)
    }));
  };

  const handleEditTrajectoryPoints = (trajId: string) => {
    const traj = customTrajectories.find(t => t.id === trajId);
    if (!traj) return;
    handleLoadTrajectory(traj);
    setIsEditMode(true);
    setTrajMenu(null);
  };

  return (
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
              onClick={() => { if(confirm("Supprimer ?")) { handleDeleteTrajectory(trajMenu.id); setTrajMenu(null); } }}
              className="w-full text-left px-3 py-2 hover:bg-red-500/20 text-red-400 text-[10px] font-black uppercase rounded-lg flex items-center gap-2 transition-all"
            >
              <Trash2 className="w-3 h-3" /> Supprimer
            </button>
          </div>
        )}

        {/* GÉNÉRATEUR DE MOUVEMENTS (Calculé par le logiciel) */}
        <div className="bg-[#111317] border border-blue-500/30 rounded-[2rem] p-6 space-y-6 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 blur-[80px] pointer-events-none" />
          
          <div className="flex justify-between items-center relative z-10">
            <div className="flex gap-4 items-center">
              <div className="p-3 bg-blue-500/20 rounded-2xl">
                <Move className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h4 className="text-xl font-black text-blue-400 uppercase tracking-[0.2em]">Trajectoires</h4>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Génération de formes pour {groupName}.</p>
              </div>
            </div>

            <div className="flex gap-2">
              {[
                { id: 'none', label: 'Aucun', icon: <Square className="w-4 h-4" />, tip: "Arrête tout mouvement et maintient la position centrale" },
                { id: 'circle', label: 'Cercle', icon: <RotateCcw className="w-4 h-4" />, tip: "Mouvement circulaire fluide autour du centre" },
                { id: 'eight', label: 'Huit', icon: <FastForward className="w-4 h-4" />, tip: "Mouvement en forme de 8 (infini)" },
                { id: 'pan_sweep', label: 'Pan', icon: <Move className="w-4 h-4" />, tip: "Balayage horizontal uniquement" },
                { id: 'tilt_sweep', label: 'Tilt', icon: <Move className="w-4 h-4 rotate-90" />, tip: "Balayage vertical uniquement" },
                { id: 'custom', label: 'Custom', icon: <MousePointer2 className="w-4 h-4" />, tip: "Utilise une trajectoire point par point personnalisée" }
              ].map(shape => (
                <Tooltip key={shape.id} text={shape.tip}>
                  <button
                    onClick={() => updateConfig({ shape: shape.id })}
                    className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all active:scale-95 border ${
                      config.shape === shape.id
                      ? 'bg-blue-500 text-[#05070a] border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                      : 'bg-slate-800/50 text-slate-400 border-white/5 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    {shape.icon} {shape.label}
                  </button>
                </Tooltip>
              ))}
              
              <div className="w-px h-8 bg-white/10 mx-2 self-center" />
              
              <Tooltip text="Inverse le mouvement pour chaque deuxième projecteur du groupe (effet miroir)">
                <button
                  onClick={() => updateConfig({ invert180: !config.invert180 })}
                  className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all active:scale-95 border ${
                    config.invert180
                    ? 'bg-amber-500 text-[#05070a] border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                    : 'bg-slate-800/50 text-slate-400 border-white/5 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <RotateCcw className={`w-4 h-4 ${config.invert180 ? 'rotate-180' : ''} transition-transform duration-500`} />
                  Symétrie (180°)
                </button>
              </Tooltip>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6 relative z-10">
            {/* Colonne GAUCHE (PAD et Centre) */}
            <div className="col-span-5 flex flex-col items-center gap-4 p-4 bg-black/40 rounded-[1.5rem] border border-white/5 shadow-inner">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-blue-500/20 pb-1.5 w-full text-center">Centre & Aperçu</p>
              
              <div className="relative group/pad">
                <XYPad 
                  x={selectedPointIndex !== null ? localCustomPoints[selectedPointIndex].x : (phantomPoint ? phantomPoint.x : centerX)} 
                  y={selectedPointIndex !== null ? localCustomPoints[selectedPointIndex].y : (phantomPoint ? phantomPoint.y : centerY)} 
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
                      <li>• Rec : Cliquez sur "REC POINT"</li>
                      <li>• Edit : Sélectionnez un point (jaune)</li>
                    </ul>
                  </div>
                </div>
                
                {/* Visualisation du point fantôme (en cours de placement) */}
                {isRecording && phantomPoint && selectedPointIndex === null && (
                  <div 
                    className="absolute pointer-events-none w-4 h-4 rounded-full border border-blue-400 bg-blue-400/20 z-20 animate-pulse"
                    style={{
                      left: `${(phantomPoint.x / 255) * 360}px`,
                      top: `${(phantomPoint.y / 255) * 360}px`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[11px] font-black text-blue-400 whitespace-nowrap">POINT {localCustomPoints.length + 1} ?</span>
                  </div>
                )}
                
                {/* Visualisation des points custom */}
                {(isRecording || isEditMode || config.shape === 'custom' || localCustomPoints.length > 0) && (isRecording || isEditMode ? localCustomPoints : (config.customPoints || localCustomPoints)).map((p, i) => (
                  <div 
                    key={i}
                    onClick={() => (isEditMode || isRecording) && setSelectedPointIndex(i)}
                    className={`absolute cursor-pointer w-4 h-4 rounded-full border border-white/50 z-10 transition-all ${
                      selectedPointIndex === i 
                      ? 'bg-yellow-400 scale-150 shadow-[0_0_10px_yellow] z-30' 
                      : isRecording || isEditMode ? 'bg-red-500 shadow-[0_0_5px_red]' : 'bg-blue-400/30'
                    }`}
                    style={{
                      left: `${(p.x / 255) * 360}px`,
                      top: `${(p.y / 255) * 360}px`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    <span className={`absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold ${selectedPointIndex === i ? 'text-yellow-400' : 'text-white/50'}`}>{i+1}</span>
                  </div>
                ))}

                {/* Point de prévisualisation du mouvement réel */}
                {config.shape !== 'none' && (
                  <div 
                    className="absolute pointer-events-none w-4 h-4 bg-cyan-400 rounded-full shadow-[0_0_10px_#22d3ee] border border-white/50 transition-all duration-75 z-20"
                    style={{
                      left: `${(Math.min(255, Math.max(0, centerX + previewOffset.x)) / 255) * 360}px`,
                      top: `${(Math.min(255, Math.max(0, centerY + previewOffset.y)) / 255) * 360}px`,
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
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-[10px] font-black text-slate-400 uppercase rounded-lg border border-white/5 transition-all"
              >
                Recentrer au Milieu (127)
              </button>

              {/* Faders de contrôle du centre à GAUCHE */}
              <div className="w-full bg-black/40 p-4 rounded-xl border border-white/5 space-y-4">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/10 pb-1.5">Position Offset</p>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">Base Pan: {centerX}</span>
                      <span className="text-xs font-mono font-black text-cyan-400">LIVE: {Math.round(Math.min(255, Math.max(0, centerX + previewOffset.x)))}</span>
                    </div>
                    <ControlSlider 
                      label="Center Pan" 
                      value={centerX} 
                      onChange={(nx) => sendMovement(fixtureIds, Number(nx), centerY, groupId)} 
                      color="bg-cyan-500/50" 
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Base Tilt: {centerY}</span>
                      <span className="text-xs font-mono font-black text-indigo-400">LIVE: {Math.round(Math.min(255, Math.max(0, centerY + previewOffset.y)))}</span>
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
            </div>

            {/* Colonne DROITE (Réglages et Trajectoires) */}
            <div className="col-span-7 flex flex-col gap-5 py-1 overflow-y-auto max-h-[700px] pr-1 custom-scrollbar">
              <div className="bg-black/40 p-5 rounded-2xl border border-white/5 space-y-5">
                <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
                  <p className="text-[11px] font-black text-blue-400 uppercase tracking-[0.2em]">Réglages du Mouvement</p>
                  <Tooltip text="Ajustez la vitesse, le décalage entre les projecteurs et l'amplitude de la forme">
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
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest border-l-2 border-blue-500 pl-3">Phase (FAN)</p>
                        <span className="text-base font-mono font-black text-blue-400">{Math.round((config.fan / 255) * 100)}%</span>
                      </div>
                      <ControlSlider 
                        label="Décalage" 
                        value={config.fan} 
                        onChange={(v) => updateConfig({ fan: Number(v) })} 
                        color="bg-blue-500" 
                      />
                    </div>
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
              </div>

              {/* Trajectoire Point à Point */}
              <div className="p-5 bg-black/60 rounded-2xl border border-white/5 space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-[11px] font-black text-red-400 uppercase tracking-[0.2em]">Trajectoire Point à Point</p>
                  <div className="flex items-center gap-3">
                    <Tooltip text="Créez vos propres trajectoires en enregistrant une suite de points. Sélectionnez 'Custom' en haut pour les utiliser.">
                      <HelpCircle className="w-4 h-4 text-slate-600 hover:text-red-400 cursor-help transition-colors" />
                    </Tooltip>
                    <span className="text-[10px] text-slate-600 italic">{(isRecording ? localCustomPoints : (config.customPoints || localCustomPoints)).length} points</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => {
                      if (isRecording) {
                        setIsRecording(false);
                        setPhantomPoint(null);
                        updateConfig({ shape: 'custom', customPoints: localCustomPoints });
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
                    {isRecording ? <Square className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {isRecording ? 'Stop Rec' : 'Nouv. Trajet'}
                  </button>

                  {isRecording && (
                    <button 
                      onClick={handleAddPoint}
                      className="px-8 py-3 bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-blue-400 transition-all shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                    >
                      <Plus className="w-4 h-4" /> REC POINT
                    </button>
                  )}

                  {!isRecording && localCustomPoints.length > 0 && (
                    <>
                      <button 
                        onClick={() => updateConfig({ shape: 'custom', customPoints: localCustomPoints })}
                        className={`flex-1 min-w-[80px] py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all ${
                          config.shape === 'custom'
                          ? 'bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                          : 'bg-slate-800 text-slate-400 hover:bg-blue-500/20 hover:text-blue-400'
                        }`}
                      >
                        <Play className="w-4 h-4" /> Lire
                      </button>
                      
                      <button 
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
                        <Edit2 className="w-4 h-4" /> {isEditMode ? 'FIN EDIT' : 'MODIFIER'}
                      </button>

                      <button 
                        onClick={handleInsertPoint}
                        className="flex-1 min-w-[80px] py-3 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-400 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all"
                      >
                        <Plus className="w-4 h-4" /> Point +
                      </button>

                      <button 
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
                    <span className="text-[10px] font-black text-yellow-500 uppercase">Édition Point {selectedPointIndex + 1}</span>
                    <div className="flex gap-5">
                      <button 
                        onClick={() => {
                          const newPoints = localCustomPoints.filter((_, i) => i !== selectedPointIndex);
                          setLocalCustomPoints(newPoints);
                          setSelectedPointIndex(null);
                          if (config.shape === 'custom') updateConfig({ shape: 'custom', customPoints: newPoints });
                        }}
                        className="text-[9px] text-red-400 font-bold hover:underline"
                      >
                        Supprimer
                      </button>
                      <button onClick={() => setSelectedPointIndex(null)} className="text-[9px] text-yellow-500 font-bold uppercase">OK</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bibliothèque et Mémoires (Grid 2 colonnes) */}
              <div className="grid grid-cols-2 gap-5">
                <div className="p-5 bg-black/40 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-black text-purple-400 uppercase tracking-[0.2em]">Bibliothèque</p>
                    <div className="flex items-center gap-2">
                      <Tooltip text="Vos trajectoires sauvegardées. Clic droit pour renommer ou supprimer.">
                        <HelpCircle className="w-4 h-4 text-slate-600 hover:text-purple-400 cursor-help transition-colors" />
                      </Tooltip>
                      <span className="text-[9px] text-slate-500 italic">Clic Droit: Menu</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
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

                <div className="p-5 bg-black/40 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-black text-blue-400 uppercase tracking-[0.2em]">Presets MVT</p>
                    <div className="flex items-center gap-2">
                      <Tooltip text="Mémorisez des réglages complets (Forme + Vitesse + Taille). Clic droit pour sauvegarder les réglages actuels sur un preset.">
                        <HelpCircle className="w-4 h-4 text-slate-600 hover:text-blue-400 cursor-help transition-colors" />
                      </Tooltip>
                      <span className="text-[9px] text-slate-500 italic">Clic Droit: Sauver</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {mvtPresets.slice(0, 4).map((preset: any, i: number) => {
                      const isCurrent = config.shape === preset.shape && 
                                      config.speed === preset.speed && 
                                      config.sizePan === preset.sizePan && 
                                      config.sizeTilt === preset.sizeTilt && 
                                      config.fan === preset.fan && 
                                      config.invert180 === preset.invert180;
                      return (
                        <div key={i} className="group relative">
                          <button
                            onClick={() => handleLoadMvtPreset(i)}
                            onContextMenu={(e) => { e.preventDefault(); handleSaveMvtPreset(i); }}
                            className={`w-full py-3 rounded-xl border transition-all text-[10px] font-black uppercase truncate flex items-center justify-center gap-2 ${
                              isCurrent
                              ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                              : 'bg-slate-800/50 border-white/5 text-slate-400 hover:border-blue-500/30'
                            }`}
                          >
                            <Save className={`w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity ${isCurrent ? 'opacity-100' : ''}`} />
                            {preset.label}
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRenameMvtPreset(i);
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

              {/* Positions (Grid compact) */}
              <div className="p-5 bg-black/40 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Positions Mémorisées</p>
                    <div className="flex items-center gap-2">
                      <Tooltip text="Mémorisez des positions fixes (XY) pour vos lyres. Clic droit pour sauvegarder la position actuelle.">
                        <HelpCircle className="w-4 h-4 text-slate-600 hover:text-white cursor-help transition-colors" />
                      </Tooltip>
                      <span className="text-[9px] text-slate-500 italic">Clic Droit: Sauver</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {positions.map((pos: any, i: number) => {
                      const isCurrent = centerX === pos.x && centerY === pos.y;
                      return (
                        <div key={i} className="group relative">
                          <button
                            onClick={() => sendMovement(fixtureIds, pos.x, pos.y, groupId)}
                            onContextMenu={(e) => { e.preventDefault(); handleSavePosition(i); }}
                            className={`w-full py-3 rounded-xl border transition-all text-[10px] font-black uppercase truncate flex flex-col items-center gap-1 ${
                              isCurrent
                              ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                              : 'bg-slate-800/50 border-white/5 text-slate-400 hover:border-blue-500/30'
                            }`}
                          >
                            <Save className={`w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity ${isCurrent ? 'opacity-100' : ''}`} />
                            {pos.label}
                          </button>
                          <button 
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
        </div>
      </div>

      <div className="pt-3 flex justify-end gap-5">
          <button 
            onClick={() => {
              updateConfig({ shape: 'none', speed: 128, sizePan: 64, sizeTilt: 64, fan: 0, invert180: false });
              sendMovement(fixtureIds, 127, 127, groupId);
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
  );
};
