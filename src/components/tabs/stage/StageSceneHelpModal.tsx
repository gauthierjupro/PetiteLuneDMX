import React from 'react';
import { Modal } from '../../ui/Modal';

interface StageSceneHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROWS: [string, string][] = [
  ['Glisser fond plan', 'Sélection rectangle'],
  ['Ctrl / Shift + clic', 'Multi-sélection'],
  ['Glisser objet', 'Déplacer (accrochage si actif)'],
  ['Molette', 'Zoom plan (ancré curseur)'],
  ['Espace / Main / Alt+glisser / clic droit', 'Pan plan'],
  ['Flèches', 'Déplacer la sélection (plan X/Y)'],
  ['Shift + flèches', 'Pas fin (1 %)'],
  ['Page ↑ / Page ↓', 'Hauteur Z (sélection)'],
  ['Shift + Page ↑/↓', 'Hauteur Z pas fin (1 %)'],
  ['Suppr / Retour arrière', 'Supprimer éléments scène'],
  ['Ctrl+Z / Ctrl+Y', 'Annuler / rétablir positions'],
  ['Esc', 'Tout désélectionner'],
  ['?', 'Ouvrir cette aide'],
];

export function StageSceneHelpModal({ isOpen, onClose }: StageSceneHelpModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Scène — raccourcis & plan" maxWidth="max-w-lg">
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-4">
        Vue public · fond en haut · SR à gauche du dessin · SL à droite (convention régie)
      </p>
      <dl className="space-y-2">
        {ROWS.map(([key, action]) => (
          <div
            key={key}
            className="flex flex-wrap justify-between gap-2 py-1.5 border-b border-white/5 text-[11px]"
          >
            <dt className="font-mono text-cyan-300/90 shrink-0">{key}</dt>
            <dd className="text-slate-300 text-right">{action}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-[10px] text-slate-500 leading-relaxed">
        Export PNG : plan imprimable avec légende, dimensions salle/scène/public et date.
        Align · sel. = bords/centre du groupe · Align · salle = marges 8/92 %.
        Bouton Scan (plan) = ajuster toute la salle dans la vue · mini-plan en bas à gauche.
      </p>
    </Modal>
  );
}
