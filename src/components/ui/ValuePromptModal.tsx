import React, { useState, useEffect, useRef } from 'react';
import { Modal } from './Modal';

interface ValuePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  title: string;
  defaultValue: string;
  label: string;
}

export const ValuePromptModal = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  defaultValue,
  label
}: ValuePromptModalProps) => {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      // Petit délai pour s'assurer que le modal est monté
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, defaultValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(value);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            {label}
          </label>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-cyan-400 font-mono text-xl focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all"
            placeholder="Entrez une valeur..."
          />
        </div>
        
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 font-bold uppercase tracking-widest text-[10px] transition-all"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="flex-1 px-6 py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-cyan-500/20 transition-all"
          >
            Confirmer
          </button>
        </div>
      </form>
    </Modal>
  );
};
