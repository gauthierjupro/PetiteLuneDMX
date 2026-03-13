import React, { useState } from 'react';
import { Modal } from '../../ui/Modal';

interface SavePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  defaultName: string;
}

export const SavePresetModal = ({ isOpen, onClose, onSave, defaultName }: SavePresetModalProps) => {
  const [name, setName] = useState(defaultName);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ENREGISTRER PRESET AMBIANCE">
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Nom du preset</label>
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-2xl px-6 py-4 text-xl font-black text-cyan-400 focus:outline-none focus:border-cyan-500 transition-colors"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave(name);
            }}
          />
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-2xl text-[10px] font-black uppercase transition-all"
          >
            Annuler
          </button>
          <button 
            onClick={() => onSave(name)}
            className="flex-1 py-4 bg-cyan-500 hover:bg-cyan-400 text-[#05070a] rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
          >
            Enregistrer l'état actuel
          </button>
        </div>
      </div>
    </Modal>
  );
};
