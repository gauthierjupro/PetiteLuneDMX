"""
Constantes partagées : charte graphique "Dark Console" pour tous les onglets.
"""
# --- Design System Unifié (tous onglets) ---
DARK_CONSOLE_BG = "#1A1A1A"
DARK_CONSOLE_SECTION_BG = "#020617"
DARK_CONSOLE_BORDER = "#334155"
SECTION_RADIUS = 15
SECTION_PADDING = 10
# Couleur barre OUT / feedback
OUT_PROGRESS_COLOR = "#22c55e"

# Taille standard des boutons couleur (R,V,B,W, etc.) et gobos — partout 45×45
COLOR_BUTTON_SIZE = 45

# Dimensions de carte ajustées au nouveau contenu (boutons 45x45 + colonne OUT)
CARD_WIDTH = 360
CARD_HEIGHT = 320
# Carte Rythme / Audio : même largeur que les cartes ambiance pour alignement
RHYTHM_CARD_WIDTH = 360
# Largeur des cartes Mouvement (Lyres, Dynamo) — section Mouvement plus large
MOVEMENT_CARD_WIDTH = 1080
# Largeur minimale de la sous-carte « Mouvement » (pad XY + Vitesse/Taille + boutons) dans Lyres/Dynamo
MOVEMENT_FRAME_MIN_WIDTH = 550
# Hauteur des cartes Mouvement (Lyres, Dynamo) — plus haute que CARD_WIDTH pour le pad XY
MOVEMENT_CARD_HEIGHT = 420
# Encart AMBIANCES : largeur = 3 cartes + espacements, hauteur = cartes + en-tête
AMBIANCE_ENCART_WIDTH = 3 * CARD_WIDTH + 24  # 3 cartes + marges entre
AMBIANCE_ENCART_HEIGHT = CARD_HEIGHT + 52     # hauteur cartes + ligne titre + padding

# Icônes des modes logiciels (ordre commun à toutes les cartes)
# Utilisent des emojis Unicode standard pour éviter les carrés vides
# si la police FontAwesome n'est pas installée. Le mode CHASE/Chenillard
# soft a été retiré.
MODE_ICONS = [
    ("🎨", "MANUAL"),   # Manuel / Fixe (soft)
    ("💓", "PULSE"),    # Pulse / Rythme (soft)
    ("🌈", "RAINBOW"),  # Rainbow (soft)
]

# Palette de couleurs des boutons de modes (couleurs "thématiques")
# (base_color, active_color)
MODE_COLORS = {
    "MANUAL": ("#0ea5e9", "#38bdf8"),   # Bleu
    "CHASE": ("#f97316", "#fdba74"),    # Orange
    "PULSE": ("#ec4899", "#f9a8d4"),    # Rose
    "RAINBOW": ("#a855f7", "#c4b5fd"),  # Violet
}

# Police d'icônes utilisée pour les modes (doit exister sur le système)
ICON_FONT_FAMILY = "Font Awesome"
ICON_FONT_SIZE = 20

# Boutons de base 2x2 (R, V, B, W) - style Contour
BASE_COLORS_2X2 = [
    ("R", (255, 0, 0)),
    ("V", (0, 255, 0)),
    ("B", (0, 0, 255)),
    ("W", (255, 255, 255)),
]
