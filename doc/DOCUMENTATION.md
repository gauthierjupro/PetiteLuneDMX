# Documentation Petitelune DMX

## Introduction : Petitelune DMX v1.8.0
**Petitelune DMX** est une application de contrôle d'éclairage professionnel (Pro Lighting Control) développée avec l'architecture **Tauri** (Rust + React). Elle permet de piloter un univers de 512 canaux DMX en temps réel, avec une interface moderne et fluide, optimisée pour le spectacle vivant.

---

## 1. Navigation et Interface Globale
L'interface est divisée en plusieurs sections accessibles via la barre de navigation supérieure :
- **En-tête** : Affiche le logo, la version actuelle, l'état de connexion de l'interface DMX (Port COM) et un bouton d'information "À propos".
- **Sélecteur d'Onglets** : Permet de naviguer entre les 8 modules principaux de l'application (incluant la nouvelle Vue 3D).
- **Indicateur de Statut** : Un voyant (vert/rouge) indique si l'interface DMX est active et sur quel port elle communique.

---

## 2. Onglet : Live (Le Cœur du Show)
C'est l'onglet principal utilisé pendant les prestations. Il permet un contrôle dynamique et automatisé.

### Master Global Section
- **Master Dimmer** : Contrôle l'intensité lumineuse de l'ensemble du parc de projecteurs.
- **Global Strobe** : Déclenche un effet stroboscopique sur tous les appareils compatibles.
- **Gestion du Rythme (BPM)** : Bouton "Tap Tempo", réglage manuel du BPM, ou analyseur audio intégré pour synchroniser les effets sur la musique.
- **End of Song** : Bouton d'extinction progressive pour terminer proprement un morceau.

### Section Ambiances
- Dédiée aux projecteurs de type **RGB** (PARs LED, barres).
- Permet de gérer les groupes d'ambiance : intensité, couleur fixe via un sélecteur avancé, et stroboscope par groupe.
- **Auto-Color** : Cycle automatique de couleurs synchronisé sur le temps.
- **Pulse** : Effet de pulsation lumineuse calé sur le BPM.
- **Macros & Presets** : Enregistrement et rappel rapide d'états lumineux complets (couleurs, intensités).

### Section Mouvements (Lyres)
- Dédiée aux projecteurs mobiles (**Moving Heads**).
- **Pad XY** : Contrôle manuel et précis du Pan (rotation) et du Tilt (inclinaison).
- **Générateur de Formes (Shapes)** : Automatisation de trajectoires (Cercle, Huit, Balayage Pan/Tilt, Trajectoires personnalisées).
- **Réglages d'Effets** : Gestion du "Fan" (décalage entre les machines), de la vitesse et de l'amplitude du mouvement.
- **Contrôle Gobos/Couleurs** : Accès direct aux roues de gobos et de couleurs des lyres.

---

## 3. Onglet : Projecteurs (Contrôle Individuel)
Cet onglet permet de manipuler chaque appareil séparément pour un réglage fin.

- **Sélecteur de Projecteurs** : Une grille affichant tous les appareils patchés avec leur ID, nom et type.
- **Panel de Propriétés Dynamique** :
    - Les curseurs (faders) s'adaptent automatiquement au profil de la machine sélectionnée.
    - **Code Couleur** : Les faders sont colorés selon leur fonction (Rouge, Vert, Bleu, Pan/Tilt, etc.).
    - **Identification** : Un bouton "Identifier" permet de faire flasher physiquement l'appareil sélectionné pendant 1,5 seconde pour le repérer dans le parc.

---

## 4. Onglet : Plateau (Plan de Feu 2D)
Une vue interactive pour organiser la disposition physique de vos projecteurs.

- **Interface Drag & Drop** : Permet de placer les icônes de vos projecteurs sur un plan virtuel représentant la scène (vue de dessus).
- **Organisation Spatiale** : Positionnez précisément vos machines par simple glisser-déposer.
- **Indicateurs Visuels** : 
    - Chaque icône affiche le nom de la machine et son adresse DMX.
    - Une ombre portée dynamique simule visuellement la hauteur réglée (plus l'ombre est grande et floue, plus la machine est haute).
    - L'orientation (Pan fixe) est représentée par la rotation de l'icône 2D.
- **Réinitialisation** : Un bouton permet de remettre à zéro toutes les positions 2D.
- **Note Importante** : Pour simplifier l'ergonomie, les réglages de hauteur, d'angle et de forme de faisceau ont été déplacés dans l'onglet **Vue 3D**.

---

## 5. Onglet : Vue 3D (Visualisation Immersive & Configuration)
Le centre de configuration spatiale et de prévisualisation en temps réel.

### Visualisation 3D
- **Moteur WebGL Pro** : Rendu fluide utilisant Three.js avec support des ombres portées et du rendu volumétrique des faisceaux.
- **Environnement Dynamique** : Affichez ou masquez le sol, les murs, le plafond et le pont de lumière (truss).
- **Dimensions de la Salle** : Ajustez la position des murs (fond, gauche, droite, public) pour coller à la réalité de votre lieu de spectacle.
- **Navigation intuitive** :
    - **Rotation** : Clic gauche maintenu.
    - **Déplacement (Pan)** : Clic droit maintenu.
    - **Zoom** : Roulette de la souris.

### Panneau de Propriétés 3D (Nouveauté)
Sélectionnez un projecteur directement dans la scène 3D pour accéder à ses réglages avancés :
- **Altitude (Axe Z)** : Réglez la hauteur (0% au sol, 100% au pont de lumière). Des boutons "Au Sol" et "Au Pont" permettent un placement instantané.
- **Orientation (Pan Fixe)** : Faites pivoter le projecteur sur son support (0-360°).
- **Inclinaison (Tilt Fixe)** : Donnez un angle vertical fixe au projecteur (-90° à 90°).
- **Forme du Faisceau 3D** :
    - **Rond** : Cône standard.
    - **Carré** : Pyramide inversée.
    - **Rectangle** : Pyramide avec réglage de la largeur d'étalement (idéal pour barres LED ou blinders).
- **Réinitialisation Individuelle** : Un bouton permet de remettre les paramètres 3D d'une seule machine par défaut.

---

## 6. Onglet : Librairie (Éditeur de Profils)
C'est ici que vous définissez comment vos machines fonctionnent.

- **Bibliothèque de Profils** : Liste des machines enregistrées (Stairville, Eurolite, Fun Generation, etc.).
- **Éditeur de Canaux** : 
    - Création de nouveaux profils en définissant le nombre de canaux.
    - Pour chaque canal, vous pouvez nommer la fonction et lui assigner un type (Dimmer, Pan, Tilt, Strobe, etc.).
    - Ces types permettent au logiciel d'automatiser intelligemment les mouvements et les couleurs dans l'onglet Live.

---

## 7. Onglet : Vue DMX (Console & Diagnostic)
Une vue "bas niveau" pour le dépannage et le contrôle manuel forcé.

- **Moniteur d'Univers** : Affiche les 512 valeurs brutes envoyées à l'interface DMX.
- **Mode Pilotage Manuel (Override)** : 
    - Permet de désactiver temporairement les automatismes pour prendre le contrôle manuel de chaque canal via des faders.
    - Très utile pour tester un canal spécifique ou figer une machine dans une position précise.
- **Saisie Précise** : Possibilité de saisir les valeurs numériquement (0-255) ou en pourcentage via un clic droit.

---

## 8. Onglet : Patch (Configuration)
L'étape de configuration indispensable avant de commencer le show.

- **Moniteur DMX Global** : Une grille visuelle des 512 canaux montrant l'occupation de l'univers par les différents projecteurs.
- **Patch List** : 
    - Ajouter de nouveaux projecteurs depuis la librairie.
    - Définir ou modifier l'adresse DMX de départ de chaque appareil.
    - Supprimer des appareils.
- **Gestion des Groupes** : Créer des groupes (ex: "Lyres Fond", "PARs Face") pour les contrôler simultanément dans l'onglet Live.
- **Documentation PDF** : Associer et ouvrir les notices techniques (PDF) de vos machines directement depuis l'application.

---

## 9. Onglet : Réglages (Système)
- **Configuration Port COM** : Sélection du port série sur lequel est branchée votre interface DMX (Enttec Open DMX ou compatible FTDI).
- **Statistiques** : Affichage de la fréquence de rafraîchissement (standard DMX à 40 Hz).

---

## Fonctionnalités Transverses Clés
- **Persistance** : Tous vos réglages (positions, patch, groupes, presets, calibration) sont sauvegardés automatiquement sur votre ordinateur.
- **Moteur Rust** : Le cœur de l'application tourne en Rust pour garantir une fluidité parfaite (jusqu'à 50 mises à jour par seconde) sans ralentir l'interface utilisateur.
- **Calibration** : Les lyres peuvent être calibrées individuellement (inversion Pan/Tilt, offsets) pour s'adapter à leur position physique (pendue ou posée).

---
*Documentation générée par l'Assistant IA pour Petitelune DMX.*
