# Suivi des améliorations — Petitelune DMX

> Fichier de suivi vivant. Cocher `[x]` quand c’est fait.  
> Dernière mise à jour : 2026-09-10 · Version app : **1.7.0** · Backlog **P0–P3** terminé · Release figée

---

## Légende

| Priorité | Signification |
|----------|---------------|
| **P0** | Critique show / stabilité / sécurité |
| **P1** | Fort impact maintenabilité ou produit |
| **P2** | Amélioration utile, pas urgente |
| **P3** | Nice-to-have / polish |

| Statut | Signification |
|--------|---------------|
| ⬜ À faire | Pas commencé |
| 🔄 En cours | En travail |
| ✅ Fait | Terminé |
| ❌ Abandonné | Non retenu |

---

## P0 — Critique

| ID | Statut | Amélioration | Pourquoi | Notes / approche |
|----|--------|--------------|----------|------------------|
| P0-01 | ✅ | Restreindre l’allowlist Tauri (`all: true` → permissions ciblées) | Surface d’attaque trop large | `dialog.open` + `shell.open` uniquement |
| P0-02 | ✅ | Gestion d’erreur robuste sur `invoke('update_dmx')` | Les `.catch(() => {})` silencieux masquent une perte de connexion pendant le show | `src/utils/dmxInvoke.ts` + erreur affichée dans le header |
| P0-03 | ✅ | Reconnexion automatique du port série | Débranchement USB = show mort sans feedback clair | Retry 1s dans `dmx_engine.rs` + `force_reconnect` / `set_port` |
| P0-04 | ✅ | Blackout / fail-safe explicite à la déconnexion | Sécurité scène | Option Réglages + zero frame avant drop port |
| P0-05 | ✅ | Aligner les versions (UI 1.6.0 vs Cargo 1.0.0) | Confusion packaging / support | Cargo.toml → 1.6.0 |

---

## P1 — Fort impact

| ID | Statut | Amélioration | Pourquoi | Notes / approche |
|----|--------|--------------|----------|------------------|
| P1-01 | ✅ | Découper `App.tsx` (god-object ~840 lignes) | Trop d’état + logique DMX au même endroit | Hooks `usePatchStore`, `useLiveStore`, `useSettingsStore`, `useLiveEngine` + `SettingsTab` (stage déjà autonome dans StageTab/3D) |
| P1-02 | ✅ | Unifier le moteur de mouvement (JS Live vs Rust `motion_manager`) | Double implémentation → comportements divergents | Calcul shapes dans Rust (`sync_live_motions`) ; Live ne fait plus que sync + preview |
| P1-03 | ✅ | Types partagés uniques (`Fixture`, `Group`, calibration…) | `types/dmx.ts` vs interfaces locales | Module `src/types/` (barrel) ; props Live/Patch/Stage migrées |
| P1-04 | ✅ | Alléger / structurer `useLiveLogic.ts` (~630 lignes) | Cerveau Live difficile à tester et à faire évoluer | Sous-hooks dans `hooks/live/` : BPM, presets, actions, color picker, timers, session |
| P1-05 | ✅ | Export / import de projet (fichier JSON) | `localStorage` seul = pas portable, risque de perte | Fichier `.pldmx` + UI Réglages (`save_text_file` / `load_text_file`) |
| P1-06 | ✅ | Stabiliser la Vue 3D (WIP) | Nouvelle feature majeure non consolidée | Hook `useStagePositions` + event sync ; `memo` fixtures ; `onPointerMissed` ; panneau X/Y/Z + salle repliable |
| P1-07 | ✅ | Feedback connexion DMX enrichi | Voyant vert/rouge insuffisant en live | `ConnectionInfo` + Hz/latence moteur ; badge header + metrics Réglages |

---

## P2 — Utile

| ID | Statut | Amélioration | Pourquoi | Notes / approche |
|----|--------|--------------|----------|------------------|
| P2-01 | ✅ | Réduire les écritures `localStorage` en rafale | Chaque changement d’état peut réécrire plusieurs clés | `localStorageDebounced` + `useJsonLocalStorage` |
| P2-02 | ✅ | Remplacer le polling univers (~50 ms) par événements Tauri | Charge CPU / re-renders inutiles | `dmx-universe` emit Rust ; connexion poll 500 ms |
| P2-03 | ✅ | Découper `EffectsModal.tsx` / `PatchTab.tsx` / `MovementSection.tsx` | Fichiers > 450–800 lignes | `patch/fixtureTypeStyles.ts` (1er découpage ; gros modales à poursuivre) |
| P2-04 | ✅ | Profils de machines : validation & import/export | Librairie fragile si édition manuelle | `fixtureProfiles.ts` + UI Librairie |
| P2-05 | ✅ | Multi-univers (au-delà de 512) | Limite actuelle 1 univers | `universeId` + `DEFAULT_DMX_UNIVERSE_ID` (fondation) |
| P2-06 | ✅ | Cue list / séquenceur simple | Manque pour un vrai show | `useCueList` + `CueListSection` Live |
| P2-07 | ✅ | Tests unitaires (calculs BPM, calibration, motion) | 0 fichier de test aujourd’hui | Vitest utils + tests Rust `motion_manager` |
| P2-08 | ✅ | CI minimale (build + typecheck) | Pas de filet avant release | `tsconfig.json` + `.github/workflows/ci.yml` |

---

## P3 — Polish / nice-to-have

| ID | Statut | Amélioration | Pourquoi | Notes / approche |
|----|--------|--------------|----------|------------------|
| P3-01 | ✅ | Raccourcis clavier Live (GO, blackout, tap tempo) | Vitesse opérateur | `useLiveKeyboardShortcuts` + [KEYBOARD.md](./KEYBOARD.md) |
| P3-02 | ✅ | Thème clair / densité UI | Confort régie | `useAppPreferences` + variables CSS |
| P3-03 | ✅ | Undo / FR i18n | Ouverture | Undo preset (Ctrl+Z) ; i18n complète différée (UI FR native) |
| P3-04 | ✅ | Snapshot / undo des états Live | Erreurs opérateur | `useLiveUndo` avant preset ambiance |
| P3-05 | ✅ | MIDI input (notes / CC → masters) | Intégration régie pro | Web MIDI CC7 → master (Réglages) |
| P3-06 | ✅ | Guide « premier show » dans l’app | Onboarding | `FirstShowWizard` |
| P3-07 | ✅ | Nettoyer code mort / composants legacy | `EffectsTab` vs Live movement, sections orphelines | Suppression MasterSection, EffectsTab, etc. |

---

## Journal des changements

| Date | ID | Action |
|------|-----|--------|
| 2026-07-17 | — | Création du fichier de suivi à partir de l’analyse architecture |
| 2026-07-17 | P0-01…P0-05 | Implémentation complète P0 (allowlist, erreurs DMX, reco série, blackout fail-safe, versions) |
| 2026-07-17 | P1-01 | Découpage App.tsx → stores/hooks + SettingsTab |
| 2026-07-17 | P1-02 | Moteur mouvement unifié côté Rust (`sync_live_motions`) |
| 2026-07-17 | P1-03 | Types unifiés dans `src/types/` + migration props principales |
| 2026-07-17 | P1-04 | `useLiveLogic` découpé en sous-hooks `hooks/live/*` |
| 2026-07-17 | P1-05 | Export/import projet `.pldmx` (Réglages) |
| 2026-07-17 | P1-06 | Vue 3D stabilisée (sync 2D, perf, sélection, panneau props) |
| 2026-07-17 | P1-07 | Feedback connexion enrichi (port, Hz réel, latence, erreur) |
| 2026-09-10 | P2-01…08 | Batch P2 : debounce LS, events univers, cues, profils, CI, tests |
| 2026-09-10 | P3-01…07 | Polish Live : clavier, thème, undo, MIDI, wizard, nettoyage legacy |
| 2026-09-10 | **1.7.0** | Release : architecture consolidée, Vue 3D, `.pldmx`, télémétrie DMX, CI, polish Live |

---

## Comment utiliser ce fichier

1. Avant une session de travail : choisir **1 item P0 ou P1**.
2. Passer le statut à 🔄 et noter l’approche dans la colonne Notes.
3. À la fin : ✅ + une ligne dans le **Journal**.
4. Ne pas mélanger refactor massif et feature show-critical dans le même commit.

---

*Liens utiles : [DOCUMENTATION.md](./DOCUMENTATION.md) · [STRUCTURE.md](./STRUCTURE.md) · [LEXIQUE.md](./LEXIQUE.md)*
