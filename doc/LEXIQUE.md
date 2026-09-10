# Lexique de l'Application Petitelune DMX

Ce lexique est destiné à faciliter la communication lors des modifications du code. Il regroupe les termes métiers (DMX) et les termes techniques (Architecture) utilisés dans le projet.

## 1. Concepts DMX & Éclairage (Métier)

| Terme | Description |
| :--- | :--- |
| **Univers DMX** | Ensemble de 512 canaux de contrôle envoyés sur une ligne série. |
| **Canal (Channel)** | Une valeur unique (0 à 255) contrôlant un paramètre spécifique (ex: Intensité, Rouge). |
| **Adresse DMX** | Le numéro du premier canal d'un projecteur dans l'univers (de 1 à 512). |
| **Fixture (Projecteur)** | Un appareil d'éclairage physique (Lyre, PAR LED, Laser). |
| **Patch** | Action d'assigner une adresse DMX de départ à une machine dans l'univers. |
| **Dimmer (Gradateur)** | Contrôle de l'intensité lumineuse globale d'un projecteur. |
| **Pan / Tilt** | Rotation horizontale (Pan) et inclinaison verticale (Tilt) pour les lyres. |
| **Strobe** | Effet de clignotement rapide (Stroboscope). |
| **Gobo** | Disque métallique ou de verre inséré dans une lyre pour projeter une forme. |
| **Color Wheel** | Roue physique de filtres de couleurs à l'intérieur d'un projecteur. |
| **RGB / TCL** | Systèmes de mélange de couleurs Rouge, Vert, Bleu (TCL = Tri-Color LED). |
| **Manual Override** | Mode forcé permettant de manipuler les canaux manuellement en ignorant les automates. |

## 2. Éléments de l'Interface (Navigation)

| Terme | Description |
| :--- | :--- |
| **LiveTab** | Onglet principal de contrôle en temps réel (le show). |
| **PatchTab** | Onglet de configuration du parc de machines et des adresses. |
| **StageTab** | Visualisation 2D interactive du plateau. |
| **Stage3DTab** | Visualisation 3D immersive utilisant Three.js. |
| **FixtureEditorTab** | Éditeur de librairie pour créer des profils de machines. |
| **DmxConsoleTab** | Vue brute de l'univers avec faders manuels. |
| **Ambiance Card** | Carte de contrôle pour un groupe de projecteurs RGB. |
| **Moving Head Card** | Carte de contrôle pour un groupe de lyres. |
| **XY Pad** | Zone tactile pour contrôler simultanément le Pan et le Tilt. |
| **Master Dimmer** | Curseur global contrôlant toute l'intensité de l'application. |

## 3. Termes Techniques & Architecture (Code)

### Frontend (React / TypeScript)
- **`App.tsx`** : Point d'entrée, gère l'état global et la persistance (`localStorage`).
- **`useLiveLogic.ts`** : Hook principal contenant toute la logique métier complexe (mouvements, synchro).
- **`useAudioAnalyzer.ts`** : Gère la capture audio pour la synchronisation musicale.
- **`GlassCard`** : Composant UI réutilisable avec effet de flou (Glassmorphism).
- **`invoke`** : Fonction Tauri pour appeler des commandes Rust.

### Backend (Rust / Tauri)
- **`DmxEngine`** : Structure gérant la boucle d'envoi DMX à 40Hz (thread séparé).
- **`Universe`** : Buffer partagé de 512 octets représentant l'état DMX.
- **`AppState`** : État synchronisé entre Rust et React.
- **`MotionManager`** : Gère le calcul mathématique des trajectoires (Cercle, Huit, etc.).

### Automates & Effets
- **Pulse** : Effet de battement sur l'intensité synchronisé sur le BPM.
- **Auto-Color / Auto-Gobo** : Boucles logiques qui font défiler les couleurs ou gobos.
- **Fan (Éventail)** : Algorithme créant un décalage progressif entre les machines d'un même groupe.
- **Shapes** : Trajectoires de mouvement calculées mathématiquement (Lissajous).
- **Calibration** : Système de correction logicielle (Inversion Pan/Tilt et Offsets).

---
*Ce lexique est mis à jour régulièrement pour refléter les évolutions de l'application.*
