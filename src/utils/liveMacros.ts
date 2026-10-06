/** Libellés FR des macros Live (U1–U6) — alignés avec `handleMacro` dans useLiveActions. */
export const LIVE_MACRO_HELP: Record<
  'U1' | 'U2' | 'U3' | 'U4' | 'U5' | 'U6',
  { shortLabel: string; tooltip: string }
> = {
  U1: {
    shortLabel: 'Auto coul.',
    tooltip: 'Cycle automatique des couleurs (toggle).',
  },
  U2: {
    shortLabel: 'Flash',
    tooltip: 'Strobe à fond pendant 1 s, puis arrêt.',
  },
  U3: {
    shortLabel: 'Pulse',
    tooltip: 'Pulsation d’intensité synchronisée sur le BPM (toggle).',
  },
  U4: {
    shortLabel: 'Aléatoire',
    tooltip: 'Couleur RGB aléatoire sur le groupe.',
  },
  U5: {
    shortLabel: 'Fan',
    tooltip: 'Arc-en-ciel réparti entre chaque projecteur du groupe.',
  },
  U6: {
    shortLabel: 'Auto gobo',
    tooltip: 'Cycle automatique des gobos (lyres).',
  },
};
