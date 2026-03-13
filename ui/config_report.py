"""
Rapport de configuration technique / Manuel d'entretien PetiteDMX.
Contenu affiché dans une fenêtre dédiée (Aide > Rapport de configuration).
"""

REPORT_CONTENT = r"""
═══════════════════════════════════════════════════════════════════════════════
  PETITEDMX – RAPPORT DE CONFIGURATION TECHNIQUE (Manuel d'entretien)
═══════════════════════════════════════════════════════════════════════════════

1. ARCHITECTURE MASTER / DIMMER
───────────────────────────────────────────────────────────────────────────────

Formule de sortie DMX (intensité)

• Lyres (MovingHeadFixture) – canal 6 :
  Sortie_DMX = int(_base_dimmer * master_factor) plafonnée à 255.
  Équivalent : Sortie = (Dimmer_local / 255) × Master_global × 255.

• PAR RGB / Floods (RGBFixture) :
  factor = group_dimmer × master_factor
  dimmer_val = int(_base_dimmer * factor)
  Sortie_DMX = (Dimmer_local / 255) × Group_dimmer × Master_global × 255.

• Gigabar 8CH :
  Même principe : Sortie_DMX = (Valeur_locale / 255) × Master_global × 255.

Interaction Master Global ↔ dimmers locaux
  Le Master Global (0.0–1.0) est propagé à toutes les fixtures via
  apply_master_dimmer(). Les dimmers locaux fixent _base_dimmer (0–255).
  La sortie réelle = locale × master (canal dimmer uniquement).


2. MOUVEMENTS LYRES (MODE 11 CANAUX)
───────────────────────────────────────────────────────────────────────────────

Variable de phase
  • time_counter : _auto_motion_time_counter, incrémenté à chaque tick.
  • Pas d'incrément : step = (0.5 + valeur_slider_vitesse) * 0.15
  • θ₁ = time_counter   |   θ₂ = θ₁ + π  (offset 180° Lyre 2)

Centre et amplitude
  • Centre : (xc, yc) = _auto_motion_center (position du pad au démarrage).
  • Amplitude : A = 0.2 (20 %).

Mode STREAK (balayage horizontal)
  • Lyre 1 : X₁ = xc + A × sin(θ₁),  Y₁ = yc (fixe)
  • Lyre 2 : X₂ = xc + A × sin(θ₂),  Y₂ = yc (fixe)

Mode CIRCLE
  • Lyre 1 : X₁ = xc + A × cos(θ₁),  Y₁ = yc + A × sin(θ₁)
  • Lyre 2 : X₂ = xc + A × cos(θ₂),  Y₂ = yc + A × sin(θ₂)

Conversion vers DMX
  • pan16 = int(nx * 65535)
  • tilt16 = int((1.0 - ny) * 65535)
  • Canaux 1–4 : set_pan_tilt_16bit(pan16, tilt16)

Fréquence de la boucle
  • self.after(50, self._update_auto_motion) → 50 ms → 20 Hz.


3. GESTION DES COULEURS (MIRROR COLOR)
───────────────────────────────────────────────────────────────────────────────

Paires complémentaires (_spot_color_complement)
  Rouge (R) ↔ Cyan    Vert (V) ↔ Magenta    Bleu (B) ↔ Jaune    Blanc (W) ↔ UV

Valeurs DMX canal 8 (roue couleurs)
  R=10, V=20, B=30, W=40 | Cyan=55, Magenta=65, Jaune=75, UV=85
  U1=50, U2=60, U3=70, U4=80

Comportement
  Si Mirror Color activé : Lyre 1 = couleur choisie, Lyre 2 = complémentaire.
  Si Auto-Gobo + Mirror Color : à chaque boucle (θ = 0), avance cycle [R,V,B,W]
  et applique opposition (Lyre 1 = couleur cycle, Lyre 2 = complémentaire).


4. INTERFACE GRAPHIQUE
───────────────────────────────────────────────────────────────────────────────

Police FontAwesome
  • ICON_FONT_FAMILY = "Font Awesome", ICON_FONT_SIZE = 20
  • Gobos (Lyres) : glyphes \uf111, \uf005, \uf110, \uf331
  • Modes logiciels Ambiance : emojis Unicode (🎨, 💓, 🌈, 🎤) dans MODE_ICONS

Design Dark Console (constants_ambience.py)
  • DARK_CONSOLE_BG = "#1A1A1A"
  • DARK_CONSOLE_SECTION_BG = "#020617"
  • DARK_CONSOLE_BORDER = "#334155"
  • SECTION_RADIUS = 15, SECTION_PADDING = 10
  • Cartes : CTkFrame, border_width=1, corner_radius=SECTION_RADIUS


5. MAPPING GIGABAR – CANAL 2 (MODES INTERNES)
───────────────────────────────────────────────────────────────────────────────

Fichier : ui/components/gigabar_card.py – GIGABAR_MODES

  DREAM    : 8, 16, 24, 32
  RAINBOW  : 40, 48, 56, 64
  METEOR   : 80, 88, 96, 104
  FLOW     : 120, 128, 136, 144
  MUSICAL  : 232, 240, 248

  0–7 : Manuel | 8–231 : programmes auto | 232–255 : Sound / Musical

═══════════════════════════════════════════════════════════════════════════════
  Fin du rapport – Généré pour maintenance et validation technique.
═══════════════════════════════════════════════════════════════════════════════
"""


def open_report_window(parent) -> None:
    """Ouvre une fenêtre scrollable affichant le rapport de configuration (manuel d'entretien)."""
    import customtkinter as ctk

    win = ctk.CTkToplevel(parent)
    win.title("Rapport de configuration – Manuel d'entretien")
    win.geometry("720x560")
    win.minsize(500, 400)
    win.transient(parent)

    # Cadre principal
    main = ctk.CTkFrame(win, fg_color="transparent")
    main.pack(fill="both", expand=True, padx=12, pady=12)

    # Zone de texte en lecture seule, avec défilement
    textbox = ctk.CTkTextbox(
        main,
        wrap="word",
        font=("Consolas", 11),
        fg_color="#1e293b",
        border_width=1,
        border_color="#334155",
        corner_radius=8,
    )
    textbox.pack(fill="both", expand=True, pady=(0, 10))
    textbox.insert("1.0", REPORT_CONTENT.strip())
    textbox.configure(state="disabled")

    # Boutons
    btn_frame = ctk.CTkFrame(main, fg_color="transparent")
    btn_frame.pack(fill="x")

    def copy_to_clipboard() -> None:
        try:
            win.clipboard_clear()
            win.clipboard_append(REPORT_CONTENT.strip())
            win.update()
        except Exception:
            pass

    ctk.CTkButton(btn_frame, text="Copier tout", width=100, command=copy_to_clipboard).pack(side="left", padx=(0, 8))
    ctk.CTkButton(btn_frame, text="Fermer", width=100, command=win.destroy).pack(side="left")

    win.focus_force()


__all__ = ["REPORT_CONTENT", "open_report_window"]
