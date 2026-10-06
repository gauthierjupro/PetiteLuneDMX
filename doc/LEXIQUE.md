# Lexique de l'Application Petitelune DMX

Ce lexique facilite la communication lors des modifications du code. Il regroupe les termes métiers (DMX) et les termes techniques (architecture) du projet.

## 1. Concepts DMX & Éclairage (Métier)

| Terme | Description |
| :--- | :--- |
| **Univers DMX** | Ensemble de 512 canaux de contrôle envoyés sur une ligne série. |
| **Canal (Channel)** | Valeur 0–255 pour un paramètre (intensité, rouge, pan, etc.). |
| **Adresse DMX** | Premier canal d'un projecteur dans l'univers (1–512). |
| **Fixture (Projecteur)** | Appareil physique (lyre, PAR, laser…). |
| **Patch** | Assignation adresse + profil + groupes. |
| **Dimmer** | Intensité globale. |
| **Pan / Tilt** | Rotation horizontale / inclinaison verticale (lyres). |
| **Strobe** | Clignotement rapide. |
| **Gobo** | Motif projeté (lyre) ; sur laser Cameo WOOKIE 200 R (9 ch), CH3 = **32 presets** (type `gobo` en librairie). |
| **WOOKIE 200 R — mode DMX** | CH1 **192–255** pour activer CH2–9 ; CH3 = preset 1–32 (bins ~8 DMX) ; CH8/9 = déplacement X/Y (pan/tilt Live). |
| **Fade presets** | Durée de fondu (secondes) pour rappels presets ambiance 1–8 et looks Auto Live. |

## 2. Navigation & onglets

| Terme | Description |
| :--- | :--- |
| **Live (manuel)** | Onglet opérateur : master, ambiances, lyres ; **cues** en profil Régie. |
| **Profil Live Débutant** | Réglages → scènes 1–8, lyres repliées, pas d’enchaînements cues ; **Régie** = UI complète. |
| **Auto Live** | Pilote sound-to-light (profils, looks énergie, routage bandes) ; peut tourner en arrière-plan. |
| **Patch & DMX** | Un onglet, 5 segments : **Parc**, **Groupes**, **Moniteur 512**, **Console DMX** (override), **Test appareil**. |
| **Scène** | Plan 2D + vue 3D (placement, repères). |
| **Réglages** | DMX, projet `.pldmx`, préférences UI / Live. |

## 3. Live manuel — UI

| Terme | Description |
| :--- | :--- |
| **Master** | Dimmer global + strobe + audio/BPM. |
| **Blackout** | Coupure DMX (Rust) + master à 0 (raccourci **B**). |
| **Ambiance / Groupe ambiance** | Groupe Patch `isAmbiance` : PAR, washes. |
| **Spéciaux / Divers** | Groupe Patch `isSpecial` : laser, brume, gradateurs… Colonne Live dédiée ; laser seul détecté auto. |
| **Preset ambiance 1–8** | Snapshot des états de groupes ; clic = rappel, clic droit = enregistrer. |
| **Macro U1–U6** | Raccourcis effets (auto couleur, flash, pulse, aléatoire, fan, auto gobo) — voir `liveMacros.ts`. |
| **Cue / Cue list** | Snapshot **univers** 512 + `fadeMs` au GO. |
| **Playhead** | Cue surlignée lancée par **Entrée** (GO suivante). |
| **Mouvement & formes** | Modale shapes lyres (cercle, infini, balayages…). |

## 4. Auto Live

| Terme | Description |
| :--- | :--- |
| **Profil** | Preset d'options (standard, club, rock, acoustic). |
| **Look énergie** | Rappel preset ambiance selon calme / montée / peak audio. |
| **Routage bandes** | Basses / mids / aiguës → master, pulse, mouvement, couleur, accents. |
| **Pause / silence** | Comportement entre morceaux (hold, fade, blackout, look). |

## 5. Architecture (code)

| Terme | Description |
| :--- | :--- |
| **`useLiveLogic`** | Orchestration Live (délègue à `hooks/live/*`). |
| **`useAutoLive`** | Tick ~80 ms, pulse, looks, bandes. |
| **`runCueChannelFade`** | Fondu univers au GO cue. |
| **`ambiancePresetFade`** | Fondu par groupes pour presets ambiance. |
| **`MotionManager` (Rust)** | Calcul trajectoires lyres (`sync_live_motions`). |
| **`dmx_auto_live`** | Persistance état Auto Live (`localStorage`). |

---

*Mis à jour oct. 2026 — aligné Live / Auto Live / P5 UX.*
