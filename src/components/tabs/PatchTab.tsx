import React, { useState, useEffect } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Layout, Edit2, Zap, Plus, Trash2, X, Check, Users, FileText, FolderOpen, Copy, Clipboard } from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/dialog';
import { ValuePromptModal } from '../ui/ValuePromptModal';

interface PatchTabProps {
  fixtures: any[];
  groups: any[];
  channels: number[];
  onUpdateAddress: (id: number, newAddress: number) => void;
  onAddFixture: (fixture: any) => void;
  onDeleteFixture: (id: number) => void;
  onIdentify?: (fixtureId: number) => void;
  onCreateGroup: (name: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onUpdateGroupFixtures: (groupId: string, fixtureIds: number[]) => void;
  onRenameGroup: (groupId: string, newName: string) => void;
  onToggleGroupAmbiance: (groupId: string) => void;
}

export const PatchTab = ({ 
  fixtures, 
  groups, 
  channels, 
  onUpdateAddress, 
  onAddFixture,
  onDeleteFixture,
  onIdentify,
  onCreateGroup,
  onDeleteGroup,
  onUpdateGroupFixtures,
  onRenameGroup,
  onToggleGroupAmbiance
}: PatchTabProps) => {
  const [activeSubTab, setActiveSubTab] = useState<'fixtures' | 'groups'>('fixtures');
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [library, setLibrary] = useState<any[]>([]);
  const [newFixture, setNewFixture] = useState({
    name: '',
    profileId: '',
    address: 1
  });

  // Liens PDF personnalisés (stockés par ID de fixture)
  const [customPdfLinks, setCustomPdfLinks] = useState<Record<number, string>>({});
  const [copiedPdfLink, setCopiedPdfLink] = useState<string | null>(null);
  const [contextMenuFixtureId, setContextMenuFixtureId] = useState<number | null>(null);

  // Charger la bibliothèque et les liens PDF
  useEffect(() => {
    const savedLib = localStorage.getItem('fixture_profiles');
    if (savedLib) {
      setLibrary(JSON.parse(savedLib));
    }

    const savedPdfLinks = localStorage.getItem('dmx_custom_pdf_links');
    if (savedPdfLinks) {
      setCustomPdfLinks(JSON.parse(savedPdfLinks));
    }
  }, []);

  const savePdfLink = (fixtureId: number, filename: string) => {
    const newLinks = { ...customPdfLinks, [fixtureId]: filename };
    setCustomPdfLinks(newLinks);
    localStorage.setItem('dmx_custom_pdf_links', JSON.stringify(newLinks));
  };

  const getFixtureColor = (type: string) => {
    switch (type) {
      case 'RGB': return 'from-emerald-500 to-teal-600';
      case 'Moving Head': return 'from-blue-500 to-indigo-600';
      case 'Laser': return 'from-rose-500 to-pink-600';
      case 'Effect': return 'from-amber-500 to-orange-600';
      default: return 'from-slate-500 to-slate-600';
    }
  };

  const getFixtureBg = (type: string) => {
    switch (type) {
      case 'RGB': return 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300';
      case 'Moving Head': return 'bg-blue-500/20 border-blue-500/40 text-blue-300';
      case 'Laser': return 'bg-rose-500/20 border-rose-500/40 text-rose-300';
      case 'Effect': return 'bg-amber-500/20 border-amber-500/40 text-amber-300';
      default: return 'bg-slate-500/20 border-slate-500/40 text-slate-300';
    }
  };

  const getFixtureLabelBg = (type: string) => {
    switch (type) {
      case 'RGB': return 'bg-emerald-500 text-[#05070a]';
      case 'Moving Head': return 'bg-blue-500 text-[#05070a]';
      case 'Laser': return 'bg-rose-500 text-white';
      case 'Effect': return 'bg-amber-500 text-[#05070a]';
      default: return 'bg-slate-500 text-white';
    }
  };

  const getGroupById = (fixtureId: number) => {
    return groups.find((g: any) => g.fixtureIds.includes(fixtureId));
  };

  const handleAdd = () => {
    const profile = library.find((p: any) => p.id === newFixture.profileId);
    if (!profile || !newFixture.name) return;

    onAddFixture({
      name: newFixture.name,
      manufacturer: profile.manufacturer,
      model: profile.model,
      type: profile.type,
      address: newFixture.address,
      channels: profile.channels.length,
      channelMap: profile.channels
    });

    setIsAdding(false);
    setNewFixture({ name: '', profileId: '', address: 1 });
  };

  const handleCreateGroupLocal = () => {
    if (newGroupName.trim()) {
      onCreateGroup(newGroupName.trim());
      setNewGroupName('');
      setIsAddingGroup(false);
    }
  };

  const toggleFixtureInGroup = (groupId: string, fixtureId: number) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    
    const newFixtureIds = group.fixtureIds.includes(fixtureId)
      ? group.fixtureIds.filter((id: number) => id !== fixtureId)
      : [...group.fixtureIds, fixtureId];
    
    onUpdateGroupFixtures(groupId, newFixtureIds);
  };

  const handleRenameLocal = (groupId: string) => {
    if (editGroupName.trim()) {
      onRenameGroup(groupId, editGroupName.trim());
      setEditingGroupId(null);
      setEditGroupName('');
    }
  };

  const handleOpenPdf = async (fixture: any) => {
    // Si un lien personnalisé existe pour cet ID, on l'utilise, sinon on génère le nom par défaut
    const customLink = customPdfLinks[fixture.id];
    const filename = customLink || `${fixture.manufacturer}_${fixture.model}`.replace(/\s+/g, '_') + '.pdf';
    
    try {
      await invoke('open_pdf', { filename });
    } catch (error) {
      console.error("Erreur lors de l'ouverture du PDF:", error);
      alert(`Impossible d'ouvrir le PDF "${filename}" pour ${fixture.manufacturer} ${fixture.model}. Vérifiez que le fichier est présent dans le dossier resources/pdfs/ de l'application.`);
    }
  };

  const handlePdfContextMenu = async (e: React.MouseEvent, fixtureId: number) => {
    e.preventDefault();
    setContextMenuFixtureId(fixtureId);
  };

  const handleSelectFile = async (fixtureId: number) => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Documentation PDF',
          extensions: ['pdf']
        }]
      });
      
      if (selected && typeof selected === 'string') {
        savePdfLink(fixtureId, selected);
      }
      setContextMenuFixtureId(null);
    } catch (error) {
      console.error("Erreur lors de la sélection du fichier:", error);
    }
  };

  const handleCopyLink = (fixtureId: number) => {
    const link = customPdfLinks[fixtureId];
    if (link) {
      setCopiedPdfLink(link);
    }
    setContextMenuFixtureId(null);
  };

  const handlePasteLink = (fixtureId: number) => {
    if (copiedPdfLink) {
      savePdfLink(fixtureId, copiedPdfLink);
    }
    setContextMenuFixtureId(null);
  };

  const handleOpenFolder = async () => {
    try {
      await invoke('open_pdf_folder');
    } catch (error) {
      console.error("Erreur lors de l'ouverture du dossier:", error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <Layout className="w-8 h-8 text-cyan-500" />
            Patch <span className="text-cyan-500/50">Manager</span>
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Configuration des projecteurs et adresses DMX</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleOpenFolder}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-white/5 rounded-2xl text-slate-300 text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2"
            title="Ouvrir le dossier des notices PDF"
          >
            <FolderOpen className="w-4 h-4" />
            Dossier PDF
          </button>
          <button 
            onClick={() => {
              setActiveSubTab('fixtures');
              setIsAdding(true);
            }}
            className="px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-black rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Ajouter un projecteur
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8 flex-1">
      {/* Moniteur DMX 512 Canaux */}
      <div className="col-span-8 flex flex-col h-full">
        <GlassCard title="Moniteur DMX (512 Canaux)" icon={Layout} className="flex-1 overflow-hidden flex flex-col">
          <div className="grid grid-cols-16 gap-1 overflow-y-auto pr-2 custom-scrollbar">
            {channels.map((val, i) => {
              const channelNum = i + 1;
              const fixtureAtAddr = fixtures.find((f: any) => channelNum >= f.address && channelNum < f.address + f.channels);
              const isStartOfFixture = fixtures.find((f: any) => channelNum === f.address);
              
              return (
                <div 
                  key={i} 
                  className={`aspect-square flex flex-col items-center justify-center rounded-md transition-all relative ${
                    fixtureAtAddr 
                      ? `${getFixtureBg(fixtureAtAddr.type)} shadow-[inset_0_0_10px_rgba(0,0,0,0.2)] bg-gradient-to-br ${getFixtureColor(fixtureAtAddr.type)} opacity-80` 
                      : 'bg-slate-800/40 border border-white/5 text-slate-500 hover:bg-slate-800/60'
                  } ${isStartOfFixture ? 'ring-2 ring-white/30 ring-inset shadow-lg' : ''}`}
                  title={fixtureAtAddr ? `${fixtureAtAddr.name} (${fixtureAtAddr.type}) ${getGroupById(fixtureAtAddr.id) ? `[Groupe: ${getGroupById(fixtureAtAddr.id).name}]` : ''} - Ch ${channelNum - fixtureAtAddr.address + 1}` : `Canal ${channelNum}`}
                >
                  {/* Indicateur de début de fixture */}
                  {isStartOfFixture && (
                    <div className="flex flex-col gap-0.5 absolute top-0.5 left-0.5 z-10">
                      <div className={`${getFixtureLabelBg(isStartOfFixture.type)} text-[7px] font-black px-1 rounded-sm leading-none py-0.5 shadow-sm`}>
                        F{isStartOfFixture.id}
                      </div>
                    </div>
                  )}
                  
                  <span className={`text-[12px] font-black leading-none mb-1.5 ${fixtureAtAddr ? 'text-white/60' : 'opacity-40'}`}>{channelNum}</span>
                  <span className={`text-sm font-mono font-black leading-none ${fixtureAtAddr ? 'text-white' : ''}`}>{val}</span>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Liste de Patch & Edition / Gestion des Groupes */}
      <div className="col-span-4 flex flex-col h-full gap-4">
        {/* Sélecteur d'onglets internes */}
        <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5 gap-1">
          <button 
            onClick={() => setActiveSubTab('fixtures')}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeSubTab === 'fixtures' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Projecteurs
          </button>
          <button 
            onClick={() => setActiveSubTab('groups')}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeSubTab === 'groups' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Groupes
          </button>
        </div>

        {activeSubTab === 'fixtures' ? (
          <GlassCard 
            title="Liste de Patch" 
            icon={Edit2} 
            className="flex-1 overflow-y-auto custom-scrollbar"
            extra={
              <button 
                onClick={() => setIsAdding(!isAdding)}
                className={`p-1.5 rounded-lg transition-all ${isAdding ? 'bg-rose-500/20 text-rose-400' : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'}`}
              >
                {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </button>
            }
          >
            <div className="space-y-3">
              {/* Formulaire d'ajout rapide (existant) */}
              {isAdding && (
                <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl flex flex-col gap-3 mb-6 animate-in slide-in-from-top duration-300">
                  <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Nouveau Projecteur</p>
                  
                  <div className="space-y-2">
                    <input 
                      placeholder="Nom (ex: Spot Gauche)"
                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs font-bold focus:outline-none focus:border-cyan-400"
                      value={newFixture.name}
                      onChange={e => setNewFixture({...newFixture, name: e.target.value})}
                    />
                    
                    <select 
                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs font-bold focus:outline-none focus:border-cyan-400"
                      value={newFixture.profileId}
                      onChange={e => setNewFixture({...newFixture, profileId: e.target.value})}
                    >
                      {library.length > 0 ? (
                        <>
                          <option value="">Choisir un profil...</option>
                          {library.map(p => (
                            <option key={p.id} value={p.id}>{p.manufacturer} - {p.model} ({p.channels.length} ch)</option>
                          ))}
                        </>
                      ) : (
                        <option value="">Aucun profil dans la bibliothèque...</option>
                      )}
                    </select>

                    {library.length === 0 && (
                      <p className="text-[8px] text-rose-400 font-bold italic">Allez dans l'onglet 'Librairie' pour créer un profil d'abord.</p>
                    )}

                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Adresse DMX</p>
                        <input 
                          type="number"
                          min="1"
                          max="512"
                          className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs font-bold focus:outline-none focus:border-cyan-400"
                          value={newFixture.address}
                          onChange={e => setNewFixture({...newFixture, address: parseInt(e.target.value)})}
                        />
                      </div>
                      <button 
                        onClick={handleAdd}
                        disabled={!newFixture.name || !newFixture.profileId}
                        className="mt-4 p-2 bg-cyan-500 text-[#05070a] rounded-xl hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {fixtures.map((fixture) => (
                <div key={fixture.id} className={`p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-3 group hover:border-white/20 transition-all relative overflow-hidden`}>
                  {/* Accent de couleur sur le côté */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${getFixtureColor(fixture.type)}`} />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`${getFixtureLabelBg(fixture.type)} text-[10px] font-black px-1.5 py-0.5 rounded-md`}>ID {fixture.id}</span>
                        <p className="text-xs font-bold uppercase tracking-wider">{fixture.name}</p>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">{fixture.manufacturer} {fixture.model}</p>
                    </div>
                    <div className="flex gap-1">
                      <div className="relative">
                        <button 
                          onClick={() => handleOpenPdf(fixture)}
                          onContextMenu={(e) => handlePdfContextMenu(e, fixture.id)}
                          className={`p-2 bg-slate-800 hover:bg-white/10 border rounded-xl transition-all ${customPdfLinks[fixture.id] ? 'text-cyan-400 border-cyan-500/30' : 'text-slate-500 border-white/10 hover:text-cyan-400'}`}
                          title={customPdfLinks[fixture.id] ? `Notice: ${customPdfLinks[fixture.id]} (Clic droit pour options)` : "Voir la documentation PDF (Clic droit pour options)"}
                        >
                          <FileText className="w-3 h-3" />
                        </button>

                        {/* MENU CONTEXTUEL PDF */}
                        {contextMenuFixtureId === fixture.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setContextMenuFixtureId(null)} />
                            <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1d23] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                              <button 
                                onClick={() => handleSelectFile(fixture.id)}
                                className="w-full px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-cyan-500 hover:text-black transition-all flex items-center gap-3 border-b border-white/5"
                              >
                                <FolderOpen className="w-3.5 h-3.5" />
                                Sélectionner
                              </button>
                              
                              <button 
                                onClick={() => handleCopyLink(fixture.id)}
                                disabled={!customPdfLinks[fixture.id]}
                                className="w-full px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-cyan-500 hover:text-black transition-all flex items-center gap-3 border-b border-white/5 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-300"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                Copier Lien
                              </button>

                              <button 
                                onClick={() => handlePasteLink(fixture.id)}
                                disabled={!copiedPdfLink}
                                className="w-full px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-cyan-500 hover:text-black transition-all flex items-center gap-3 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-300"
                              >
                                <Clipboard className="w-3.5 h-3.5" />
                                Coller Lien
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                      
                      <button 
                        onClick={() => onIdentify && onIdentify(fixture.id)}
                        className="p-2 bg-slate-800 hover:bg-white/10 border border-white/10 rounded-xl text-slate-500 hover:text-white transition-all"
                        title="Identifier"
                      >
                        <Zap className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => onDeleteFixture(fixture.id)}
                        className="p-2 bg-slate-800 hover:bg-rose-500/20 border border-white/10 rounded-xl text-slate-500 hover:text-rose-400 transition-all"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 pt-3 border-t border-white/5">
                    <div className="flex-1">
                      <p className="text-[10px] text-slate-500 uppercase font-bold mb-1.5">Adresse DMX Départ</p>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          min="1" 
                          max={512 - fixture.channels + 1}
                          value={fixture.address}
                          onChange={(e) => onUpdateAddress(fixture.id, parseInt(e.target.value))}
                          className="bg-slate-800 border border-white/10 rounded-xl text-sm font-bold p-2 w-24 text-center focus:outline-none focus:border-cyan-400 transition-all"
                        />
                        <span className="text-[10px] text-slate-500 font-mono italic">+ {fixture.channels - 1} canaux</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500 uppercase font-bold mb-1.5">Total CH</p>
                      <p className="text-lg font-mono font-black text-cyan-400 leading-none">{fixture.channels}</p>
                    </div>
                  </div>

                  {/* Indicateur de groupe (si présent) */}
                  {getGroupById(fixture.id) && (
                    <div className="pt-2 flex items-center gap-2">
                      <span className="text-[8px] font-black uppercase text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                        Groupe: {getGroupById(fixture.id).name}
                      </span>
                    </div>
                  )}
                </div>
              ))}

              {fixtures.length === 0 && !isAdding && (
                <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                  <Layout className="w-12 h-12 mb-4" />
                  <p className="text-sm font-bold uppercase">Aucun projecteur patché</p>
                  <p className="text-[10px] mt-1">Cliquez sur le + pour ajouter votre premier appareil</p>
                </div>
              )}
            </div>
          </GlassCard>
        ) : (
          <GlassCard 
            title="Gestion des Groupes" 
            icon={Users} 
            className="flex-1 overflow-y-auto custom-scrollbar"
            extra={
              <button 
                onClick={() => setIsAddingGroup(!isAddingGroup)}
                className={`p-1.5 rounded-lg transition-all ${isAddingGroup ? 'bg-rose-500/20 text-rose-400' : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'}`}
              >
                {isAddingGroup ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </button>
            }
          >
            <div className="space-y-4">
              {/* Formulaire d'ajout de groupe */}
              {isAddingGroup && (
                <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-2xl flex flex-col gap-3 mb-6 animate-in slide-in-from-top duration-300">
                  <p className="text-[10px] font-black uppercase tracking-widest text-purple-400">Nouveau Groupe</p>
                  <div className="flex gap-2">
                    <input 
                      placeholder="Nom du groupe..."
                      className="flex-1 bg-slate-900 border border-white/10 rounded-xl p-2 text-xs font-bold focus:outline-none focus:border-purple-400"
                      value={newGroupName}
                      onChange={e => setNewGroupName(e.target.value)}
                      autoFocus
                    />
                    <button 
                      onClick={handleCreateGroupLocal}
                      className="p-2 bg-purple-500 text-white rounded-xl hover:bg-purple-400 transition-all"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {groups.map(group => (
                <div key={group.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-4 group/card hover:border-purple-500/20 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      {editingGroupId === group.id ? (
                        <div className="flex gap-2 flex-1">
                          <input 
                            className="flex-1 bg-slate-900 border border-purple-500/50 rounded-lg p-1 text-xs font-bold focus:outline-none"
                            value={editGroupName}
                            onChange={e => setEditGroupName(e.target.value)}
                            autoFocus
                            onKeyDown={e => e.key === 'Enter' && handleRenameLocal(group.id)}
                          />
                          <button onClick={() => handleRenameLocal(group.id)} className="p-1 text-emerald-400"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingGroupId(null)} className="p-1 text-rose-400"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 group/title">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-300">{group.name}</h4>
                            <button 
                              onClick={() => { setEditingGroupId(group.id); setEditGroupName(group.name); }}
                              className="opacity-0 group-hover/title:opacity-100 p-1 text-slate-500 hover:text-cyan-400 transition-all"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                          
                          {/* COCHE AMBIANCE */}
                          <label className="flex items-center gap-2 cursor-pointer bg-purple-500/5 hover:bg-purple-500/10 px-2 py-1 rounded-md border border-purple-500/10 transition-all group/amb">
                            <input 
                              type="checkbox" 
                              className="w-3 h-3 accent-purple-500"
                              checked={group.isAmbiance}
                              onChange={() => onToggleGroupAmbiance(group.id)}
                            />
                            <span className={`text-[8px] font-black uppercase tracking-tighter transition-colors ${group.isAmbiance ? 'text-purple-400' : 'text-slate-600 group-hover/amb:text-slate-400'}`}>
                              Ambiance
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => onDeleteGroup(group.id)}
                      className="p-2 bg-slate-800 hover:bg-rose-500/20 border border-white/10 rounded-xl text-slate-500 hover:text-rose-400 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Projecteurs dans ce groupe :</p>
                    <div className="grid grid-cols-2 gap-2">
                      {fixtures.map(fixture => {
                        const isInGroup = group.fixtureIds.includes(fixture.id);
                        return (
                          <button 
                            key={fixture.id}
                            onClick={() => toggleFixtureInGroup(group.id, fixture.id)}
                            className={`p-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-between border transition-all ${
                              isInGroup 
                                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' 
                                : 'bg-slate-800 border-white/5 text-slate-500 hover:border-white/20'
                            }`}
                          >
                            <span className="truncate mr-2">{fixture.name}</span>
                            {isInGroup && <Check className="w-3 h-3 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {groups.length === 0 && !isAddingGroup && (
                <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                  <Users className="w-12 h-12 mb-4" />
                  <p className="text-sm font-bold uppercase">Aucun groupe créé</p>
                  <p className="text-[10px] mt-1">Cliquez sur le + pour organiser vos projecteurs</p>
                </div>
              )}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
    </div>
  );
};
