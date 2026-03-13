import React from 'react';
import { Modal } from '../../ui/Modal';

interface StrobeModalProps {
  isOpen: boolean;
  onClose: () => void;
  tempValue: string;
  onChange: (val: string) => void;
  onSave: (val: number) => void;
}

export const StrobeModal = ({ isOpen, onClose, tempValue, onChange, onSave }: StrobeModalProps) => {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="RÉGLAGE RACCOURCI STROBE"
    >
      <div className="space-y-6">
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Valeur du bouton (0 à 100%)</p>
        <div className="relative">
          <input 
            type="number" 
            min="0" 
            max="100"
            value={tempValue}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-2xl px-6 py-4 text-2xl font-mono font-black text-emerald-400 focus:outline-none focus:border-emerald-500 transition-colors"
            autoFocus
          />
          <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl font-mono font-black text-slate-600">%</span>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-2xl text-[10px] font-black uppercase transition-all"
          >
            Annuler
          </button>
          <button 
            onClick={() => {
              const parsed = Math.min(255, Math.max(0, Math.round((parseInt(tempValue) / 100) * 255)));
              if (!isNaN(parsed)) onSave(parsed);
              onClose();
            }}
            className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-400 text-[#05070a] rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </Modal>
  );
};
