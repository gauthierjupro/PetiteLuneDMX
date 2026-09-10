# Changelog

## 1.7.0 — 2026-09-10

Release de consolidation après le backlog P0–P3 (voir [AMELIORATIONS.md](./AMELIORATIONS.md)).

### Sécurité & show
- Allowlist Tauri ciblée, erreurs DMX visibles, reconnexion série, blackout à la déconnexion
- Télémétrie connexion (Hz réel, latence) ; événement `dmx-universe`

### Produit & architecture
- Stores/hooks (`usePatchStore`, `useLiveStore`, `useSettingsStore`, `useLiveEngine`)
- Moteur de mouvement unifié Rust ; types partagés `src/types/`
- Export/import projet `.pldmx` ; Vue 3D stabilisée (`useStagePositions`)
- Cue list Live, profils machines validés, CI (`typecheck`, Vitest, `cargo check`)

### Polish (P3)
- Raccourcis Live (B / T / Entrée / Ctrl+Z), thème & densité UI, Web MIDI CC7
- Guide premier show, suppression composants legacy

## 1.6.0

Voir historique git (`v1.6.0`).
