# Changelog

## 1.10.0 — 2026-10-06

Auto Live étendu aux scans Dynamo et lasers, polish UI Live.

### Auto Live
- Pulse et couleur auto sur groupes **Dynamo** (dimmer / roue via profil DMX)
- Couleur auto **WOOKIE 200 R** : mode DMX + cycle des 32 presets

### Live — UI
- Cartes lyres : en-têtes compacts, badges type masqués si redondants
- Modes Auto couleur / Pulse / gobo en grille uniforme
- WOOKIE : réglages géométriques CH4–9 en accordéon (mode DMX)
- Calibrage déplacé dans la modale formes ; confirmation mémorisation positions

## 1.9.0 — 2026-10-06

Release Live laser, groupes Spéciaux et fiabilisation des positions mémorisées.

### Live — Spéciaux / Divers
- Colonne Live **Spéciaux / Divers** (Patch : case **Spéciaux** sur les groupes)
- Détection auto des lasers seuls hors colonnes Ambiance / Mouvements
- Panneau **Cameo WOOKIE 200 R** : modes Off / Auto / Musical / DMX, 32 presets, sliders CH4–9

### Live — Lyres & mouvements
- Rappel des **positions mémorisées** synchronisé avec **centre lié** (pad, sliders, DMX)
- Mémorisation respectant centre lié vs centre par lyre (`memoryLinked`)
- **Confirmation** au clic droit avant écrasement d’une position mémorisée
- En-têtes colonne Lyres compactés (mode Débutant / Régie)

### Patch & profils
- Profils **WOOKIE 200 R** (9 ch / 3 ch), merge au chargement, template depuis le patch
- Test appareil : panneau laser aligné sur le Live

## 1.8.0 — 2026-10-06

Release Live / Scène / Patch orientée spectacle et simplicité (voir [AMELIORATIONS.md](./AMELIORATIONS.md)).

### Auto Live
- Onglet **Auto Live** dédié avec moteur micro / énergie en arrière-plan
- Mode **One-Click Party** (facile) : un bouton, scènes et tempo automatiques
- Profils soirée, looks Calme / Montée / Peak, routage bandes (mode régie)

### Live manuel
- Refonte **Mouvement & formes** : bibliothèque = forme seule ; mémorisation via boutons trajectoire et modale
- Positions mémorisées, centres liés / par lyre, formes triangle / losange / pentagone (moteur Rust)
- Patch → groupes : case **Mouvement** (lasers ≠ lyres) ; colonnes Live Ambiances / Mouvements
- Profil Débutant / Régie, bannières DMX et groupes Patch, raccourcis clavier dans la barre Master

### Scène (plan de feu)
- Onglet **Scène** unifié (plan 2D + 3D), décor, éléments scène, export PNG
- **Plans types** (mobile T, DJ compact, barre LED) ; drag fluide avec accrochage à la grille au relâchement

### Patch & technique
- **Patch & DMX** segmenté (parc, groupes, console, test) ; profils fixtures / photos
- Feedback connexion DMX enrichi (Hz, latence, reconnexion)

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
