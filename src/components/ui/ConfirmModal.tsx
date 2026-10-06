import React from 'react';
import { Modal } from './Modal';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmation',
  message,
  confirmLabel = 'Supprimer',
  cancelLabel = 'Annuler',
  tone = 'default',
}: ConfirmModalProps) {
  const confirmClass =
    tone === 'danger'
      ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
      : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/20';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-sm" layer="stack">
      <p className="text-sm text-slate-300 leading-relaxed">{message}</p>
      <div className="flex gap-3 pt-6">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 font-bold uppercase tracking-widest text-[10px] transition-all"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`flex-1 px-4 py-3 rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-lg transition-all ${confirmClass}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
