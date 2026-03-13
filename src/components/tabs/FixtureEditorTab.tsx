import React, { useState, useEffect } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Plus, Trash2, Save, Box, Sliders, Info, PlusCircle } from 'lucide-react';

interface ChannelDef {
  index: number;
  name: string;
  type: 'dimmer' | 'red' | 'green' | 'blue' | 'white' | 'pan' | 'tilt' | 'strobe' | 'gobo' | 'color' | 'speed' | 'other';
}

interface FixtureProfile {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  channels: number;
  type: 'RGB' | 'Moving Head' | 'Laser' | 'Effect' | 'Other';
  channelDefs: ChannelDef[];
}

export const FixtureEditorTab = () => {
  const [profiles, setProfiles] = useState<FixtureProfile[]>([]);
  const [editingProfile, setEditingProfile] = useState<FixtureProfile | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('fixture_profiles');
    if (saved) {
      setProfiles(JSON.parse(saved));
    } else {
      // Pré-remplir avec les projecteurs existants du projet
      const defaults: FixtureProfile[] = [
        {
          id: 'stairville_flood_150',
          name: 'LED Flood Panel 150',
          manufacturer: 'Stairville',
          model: 'Flood 150',
          channels: 8,
          type: 'RGB',
          channelDefs: [
            { index: 1, name: 'Dimmer', type: 'dimmer' },
            { index: 2, name: 'Rouge', type: 'red' },
            { index: 3, name: 'Vert', type: 'green' },
            { index: 4, name: 'Bleu', type: 'blue' },
            { index: 5, name: 'Strobe', type: 'strobe' },
            { index: 6, name: 'Mode', type: 'other' },
            { index: 7, name: 'Speed', type: 'speed' },
            { index: 8, name: 'White/Amber', type: 'white' },
          ]
        },
        {
          id: 'eurolite_party_tcl',
          name: 'LED PARty TCL spot',
          manufacturer: 'Eurolite',
          model: 'TCL Spot',
          channels: 5,
          type: 'RGB',
          channelDefs: [
            { index: 1, name: 'Rouge', type: 'red' },
            { index: 2, name: 'Vert', type: 'green' },
            { index: 3, name: 'Bleu', type: 'blue' },
            { index: 4, name: 'Dimmer', type: 'dimmer' },
            { index: 5, name: 'Strobe', type: 'strobe' },
          ]
        },
        {
          id: 'fun_gen_picospot_20',
          name: 'PicoSpot 20',
          manufacturer: 'Fun-Generation',
          model: 'PicoSpot 20',
          channels: 9,
          type: 'Moving Head',
          channelDefs: [
            { index: 1, name: 'Pan', type: 'pan' },
            { index: 2, name: 'Pan Fine', type: 'other' },
            { index: 3, name: 'Tilt', type: 'tilt' },
            { index: 4, name: 'Tilt Fine', type: 'other' },
            { index: 5, name: 'Speed', type: 'speed' },
            { index: 6, name: 'Dimmer', type: 'dimmer' },
            { index: 7, name: 'Strobe', type: 'strobe' },
            { index: 8, name: 'Gobo', type: 'gobo' },
            { index: 9, name: 'Color', type: 'color' },
          ]
        },
        {
          id: 'boomtone_xtrem_led',
          name: 'Xtrem LED',
          manufacturer: 'BoomToneDJ',
          model: 'Xtrem LED',
          channels: 6,
          type: 'Effect',
          channelDefs: [
            { index: 1, name: 'Mode', type: 'other' },
            { index: 2, name: 'Speed', type: 'speed' },
            { index: 3, name: 'Color/Effect', type: 'color' },
            { index: 4, name: 'Motor', type: 'other' },
            { index: 5, name: 'Strobe', type: 'strobe' },
            { index: 6, name: 'Dimmer', type: 'dimmer' },
          ]
        },
        {
          id: 'varytec_gigabar_2',
          name: 'Gigabar II',
          manufacturer: 'Varytec',
          model: 'Gigabar II',
          channels: 5,
          type: 'RGB',
          channelDefs: [
            { index: 1, name: 'Rouge', type: 'red' },
            { index: 2, name: 'Vert', type: 'green' },
            { index: 3, name: 'Bleu', type: 'blue' },
            { index: 4, name: 'Dimmer', type: 'dimmer' },
            { index: 5, name: 'Strobe', type: 'strobe' },
          ]
        },
        {
          id: 'cameo_wookie_200r',
          name: 'Cameo WOOKIE 200 R',
          manufacturer: 'Cameo',
          model: 'Wookie 200 R',
          channels: 9,
          type: 'Laser',
          channelDefs: [
            { index: 1, name: 'Mode', type: 'other' },
            { index: 2, name: 'Pattern', type: 'other' },
            { index: 3, name: 'Dimmer', type: 'dimmer' },
            { index: 4, name: 'Pan', type: 'pan' },
            { index: 5, name: 'Tilt', type: 'tilt' },
            { index: 6, name: 'Rotation X', type: 'other' },
            { index: 7, name: 'Rotation Y', type: 'other' },
            { index: 8, name: 'Rotation Z', type: 'other' },
            { index: 9, name: 'Size', type: 'other' },
          ]
        }
      ];
      setProfiles(defaults);
      localStorage.setItem('fixture_profiles', JSON.stringify(defaults));
    }
  }, []);

  const saveProfiles = (newProfiles: FixtureProfile[]) => {
    setProfiles(newProfiles);
    localStorage.setItem('fixture_profiles', JSON.stringify(newProfiles));
  };

  const createNewProfile = () => {
    const newProfile: FixtureProfile = {
      id: Date.now().toString(),
      name: 'Nouveau Projecteur',
      manufacturer: 'Marque',
      model: 'Modèle',
      channels: 1,
      type: 'Other',
      channelDefs: [{ index: 1, name: 'Dimmer', type: 'dimmer' }]
    };
    setEditingProfile(newProfile);
  };

  const handleSaveProfile = () => {
    if (!editingProfile) return;
    const exists = profiles.find(p => p.id === editingProfile.id);
    let newProfiles;
    if (exists) {
      newProfiles = profiles.map(p => p.id === editingProfile.id ? editingProfile : p);
    } else {
      newProfiles = [...profiles, editingProfile];
    }
    saveProfiles(newProfiles);
    setEditingProfile(null);
  };

  const handleDeleteProfile = (id: string) => {
    if (confirm('Supprimer ce profil de machine ?')) {
      saveProfiles(profiles.filter(p => p.id !== id));
    }
  };

  const addChannel = () => {
    if (!editingProfile) return;
    const nextIndex = editingProfile.channelDefs.length + 1;
    setEditingProfile({
      ...editingProfile,
      channels: nextIndex,
      channelDefs: [...editingProfile.channelDefs, { index: nextIndex, name: `Canal ${nextIndex}`, type: 'other' }]
    });
  };

  const updateChannel = (idx: number, field: keyof ChannelDef, value: any) => {
    if (!editingProfile) return;
    const newDefs = editingProfile.channelDefs.map((d, i) => 
      i === idx ? { ...d, [field]: value } : d
    );
    setEditingProfile({ ...editingProfile, channelDefs: newDefs });
  };

  const removeChannel = (idx: number) => {
    if (!editingProfile) return;
    const newDefs = editingProfile.channelDefs
      .filter((_, i) => i !== idx)
      .map((d, i) => ({ ...d, index: i + 1 }));
    setEditingProfile({ ...editingProfile, channels: newDefs.length, channelDefs: newDefs });
  };

  return (
    <div className="grid grid-cols-12 gap-8 h-full">
      {/* Liste des Profils */}
      <div className="col-span-4 space-y-4">
        <GlassCard title="Librairie" icon={Box}>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            <button 
              onClick={createNewProfile}
              className="w-full py-3 border-2 border-dashed border-slate-700 rounded-2xl text-slate-500 text-xs font-black uppercase hover:border-cyan-500/50 hover:text-cyan-400 transition-all flex items-center justify-center gap-2 mb-4"
            >
              <PlusCircle className="w-4 h-4" />
              Nouveau Profil
            </button>

            {profiles.map(profile => (
              <div 
                key={profile.id}
                onClick={() => setEditingProfile(profile)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer group flex items-center justify-between ${
                  editingProfile?.id === profile.id 
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' 
                    : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/20'
                }`}
              >
                <div>
                  <p className="text-xs font-black uppercase tracking-widest">{profile.name}</p>
                  <p className="text-[10px] text-slate-500">{profile.manufacturer} - {profile.channels} CH</p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteProfile(profile.id); }}
                  className="opacity-0 group-hover:opacity-100 p-2 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {profiles.length === 0 && (
              <p className="text-[10px] text-slate-600 italic text-center py-8 uppercase font-bold tracking-widest">
                Aucun profil personnalisé
              </p>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Éditeur de Profil */}
      <div className="col-span-8">
        {editingProfile ? (
          <GlassCard title={`Éditeur: ${editingProfile.name}`} icon={Sliders}>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nom du Projecteur</label>
                  <input 
                    value={editingProfile.name}
                    onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs focus:border-cyan-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Fabricant</label>
                  <input 
                    value={editingProfile.manufacturer}
                    onChange={(e) => setEditingProfile({ ...editingProfile, manufacturer: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs focus:border-cyan-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Modèle</label>
                  <input 
                    value={editingProfile.model}
                    onChange={(e) => setEditingProfile({ ...editingProfile, model: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs focus:border-cyan-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Type de Machine</label>
                  <select 
                    value={editingProfile.type}
                    onChange={(e) => setEditingProfile({ ...editingProfile, type: e.target.value as any })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs focus:border-cyan-500 outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="RGB">LED / RGB</option>
                    <option value="Moving Head">Lyre / Moving Head</option>
                    <option value="Laser">Laser</option>
                    <option value="Effect">Effet Spécial</option>
                    <option value="Other">Autre / Gradateur</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-black uppercase text-cyan-400 tracking-widest">Configuration des Canaux ({editingProfile.channels})</h3>
                  <button 
                    onClick={addChannel}
                    className="flex items-center gap-2 text-[10px] font-black uppercase text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Ajouter un Canal
                  </button>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {editingProfile.channelDefs.map((def, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 bg-white/5 rounded-xl border border-white/5 group">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-500">
                        {def.index}
                      </div>
                      <input 
                        value={def.name}
                        placeholder="Nom du canal"
                        onChange={(e) => updateChannel(i, 'name', e.target.value)}
                        className="flex-1 bg-transparent border-none text-xs focus:ring-0 outline-none font-bold"
                      />
                      <select 
                        value={def.type}
                        onChange={(e) => updateChannel(i, 'type', e.target.value as any)}
                        className="bg-slate-800 border-none rounded-lg text-[10px] font-black uppercase px-2 py-1 cursor-pointer outline-none"
                      >
                        <option value="dimmer">Dimmer</option>
                        <option value="red">Rouge</option>
                        <option value="green">Vert</option>
                        <option value="blue">Bleu</option>
                        <option value="white">Blanc</option>
                        <option value="pan">Pan</option>
                        <option value="tilt">Tilt</option>
                        <option value="strobe">Strobe</option>
                        <option value="gobo">Gobo</option>
                        <option value="color">Couleur</option>
                        <option value="speed">Vitesse</option>
                        <option value="other">Autre</option>
                      </select>
                      <button 
                        onClick={() => removeChannel(i)}
                        className="p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button 
                  onClick={handleSaveProfile}
                  className="flex-1 py-4 bg-cyan-500 text-[#05070a] rounded-2xl text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" /> Enregistrer le Profil
                </button>
                <button 
                  onClick={() => setEditingProfile(null)}
                  className="px-8 py-4 bg-slate-800 text-slate-400 rounded-2xl text-xs font-black uppercase tracking-widest border border-white/5 hover:bg-slate-700 transition-all"
                >
                  Annuler
                </button>
              </div>
            </div>
          </GlassCard>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
            <Box className="w-16 h-16 text-slate-500" />
            <div className="max-w-xs">
              <p className="text-sm font-black uppercase tracking-widest text-slate-400">Éditeur de Librairie</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase mt-2">Sélectionnez un profil ou créez-en un nouveau pour commencer l'édition</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
