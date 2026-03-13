"""
Constantes et mappings DMX centralisés : Gobos lyres, couleurs (roue + complémentaires), modes Gigabar.
"""

from typing import Dict, List, Tuple

# --- Lyres : Gobos (canal 7, PicoSpot 20 mode 9ch) ---
# Open Fixture Library / doc PicoSpot 20 : 0-15 Open, 16-31 Gobo 1 … 110-124 Gobo 7, 125-249 shake, 250-255 roue
SPOT_GOBO_VALUES: Dict[str, int] = {
    "OPEN": 7,    # 0-15 Open (milieu)
    "G1": 23,     # 16-31 Gobo 1
    "G2": 39,     # 32-46 Gobo 2
    "G3": 54,     # 47-62 Gobo 3
    "G4": 70,     # 63-78 Gobo 4
    "G5": 86,     # 79-93 Gobo 5
    "G6": 101,    # 94-109 Gobo 6
    "G7": 117,    # 110-124 Gobo 7
    "SHAKE": 135, # 125-140 Gobo 1 shake (plage shake 125-249)
}
SPOT_GOBO_CYCLE_IDS: List[str] = ["OPEN", "G1", "G2", "G3", "G4", "G5", "G6", "G7"]
SPOT_GOBO_CYCLE_VALUES: List[int] = [SPOT_GOBO_VALUES[k] for k in SPOT_GOBO_CYCLE_IDS]
SPOT_GOBO_GLYPHS: List[Tuple[str, str]] = [
    ("\uf111", "OPEN"),   # cercle = ouvert (icône)
    ("1", "G1"),
    ("2", "G2"),
    ("3", "G3"),
    ("4", "G4"),
    ("5", "G5"),
    ("6", "G6"),
    ("7", "G7"),
]

# --- Lyres : Strobe (canal 9, PicoSpot 20 mode 9ch) ---
# Doc th.mann : 000-009 aucune fonction (ouvert), 010-255 effet stroboscopique (1 Hz…25 Hz)
SPOT_STROBE_OFF_MAX = 9  # valeurs 0-9 = strobe off
SPOT_STROBE_VALUE_MIN = 10  # 10-255 = strobe 1-25 Hz

# --- Lyres : Couleurs roue (canal 6, PicoSpot 20 mode 9ch) ---
# Plage DMX  |  Nom   | Valeur (milieu)
# 000-010    | Blanc  | 5 (W)
# 011-021    | Rouge | 16 (R)
# 022-032    | Orange| 27
# 033-043    | Jaune | 38
# 044-054    | Vert  | 49 (V)
# 055-065    | Bleu  | 60 (B)
# 066-076    | Cyan  | 71
# 077-087    | Lilas | 82
SPOT_COLOR_VALUES: Dict[str, int] = {
    "W": 5,       # 000-010 Blanc
    "R": 16,      # 011-021 Rouge
    "Or": 27,     # 022-032 Orange
    "Ja": 38,     # 033-043 Jaune
    "V": 49,      # 044-054 Vert
    "B": 60,      # 055-065 Bleu
    "Cy": 71,     # 066-076 Cyan
    "Li": 82,     # 077-087 Lilas
    "UV": 95,     # 088-175 couleur 6+
    "C+": 120,    # 088-175 couleur 6+
}
SPOT_COLOR_COMPLEMENT: Dict[str, str] = {
    "R": "Cy",
    "V": "Li",
    "B": "Ja",
    "W": "Or",
    "Or": "B",
    "Ja": "Li",
    "Cy": "R",
    "Li": "V",
    "UV": "C+",
    "C+": "UV",
}
SPOT_COLOR_CYCLE: List[str] = ["R", "Or", "Ja", "V", "B", "Cy", "Li", "W", "UV", "C+"]

# --- Dynamo Scan LED : roue couleur CH6 (notice DMX — couleurs simples uniquement) ---
# Plages : <8 Blanc, <24 Violet, <40 Vert, <56 Bleu clair, <72 Rose, <88 Bleu foncé, <104 Jaune, <120 Orange.
# Valeurs = centre de chaque plage (couleurs simples, pas les doubles).
DYNAMO_COLOR_VALUES: Dict[str, int] = {
    "W": 4,     # Blanc      (0–7)
    "Li": 16,   # Violet     (8–23)
    "V": 32,    # Vert       (24–39)
    "Cy": 48,   # Bleu clair (40–55)
    "R": 64,    # Rose       (56–71)
    "B": 80,    # Bleu foncé (72–87)
    "Ja": 96,   # Jaune      (88–103)
    "Or": 112,  # Orange     (104–119)
    "UV": 16,   # pas en simple → Violet
    "C+": 4,    # pas en simple → Blanc
}

# Libellés courts (2 caractères max) pour ne pas agrandir les boutons 45×45
SPOT_BASE_COLORS: List[Tuple[str, str]] = [
    ("W", "#e5e7eb"),   # Blanc
    ("R", "#dc2626"),   # Rouge
    ("Or", "#ea580c"),  # Orange
    ("Ja", "#eab308"),  # Jaune
    ("V", "#16a34a"),   # Vert
    ("B", "#2563eb"),   # Bleu
    ("Cy", "#06b6d4"),  # Cyan
    ("Li", "#a855f7"),  # Lilas
    ("UV", "#7c3aed"),  # 088-175
    ("C+", "#94a3b8"),  # 088-175 couleur+
]

# --- Gigabar : Modes internes Canal 2 ---
GIGABAR_MODES: Dict[str, List[Tuple[str, int]]] = {
    "DREAM": [
        ("Dream 1 (8) – Fondu lent RGB complet", 8),
        ("Dream 2 (16) – Fondu alterné demi‑barre", 16),
        ("Dream 3 (24) – Respiration sur primaires", 24),
        ("Dream 4 (32) – Fondu Pastel", 32),
    ],
    "RAINBOW": [
        ("Static Rainbow (40) – Spectre fixe", 40),
        ("Rainbow Shift (48) – Décalage lent", 48),
        ("Rainbow Spin (56) – Rotation rapide", 56),
        ("Rainbow Bounce (64) – Va‑et‑vient", 64),
    ],
    "METEOR": [
        ("Comet White (80) – Traînée blanche", 80),
        ("Meteor RGB (88) – Point coloré avec trace", 88),
        ("Double Meteor (96) – Deux points croisés", 96),
        ("Stardust (104) – Éclats aléatoires", 104),
    ],
    "FLOW": [
        ("Water Flow (120) – Remplissage eau", 120),
        ("Color Fill (128) – Remplissage/vidage", 128),
        ("Snake (136) – Bloc qui parcourt", 136),
        ("Theater Chase (144) – Guirlande cinéma", 144),
    ],
    "MUSICAL": [
        ("Sound Flash (232) – Flash blanc", 232),
        ("Sound Color (240) – Couleur sur son", 240),
        ("Sound EQ (248) – Centre vers bords", 248),
    ],
}
