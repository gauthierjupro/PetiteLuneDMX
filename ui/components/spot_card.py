from __future__ import annotations

from typing import Callable, Dict, List, Optional, Tuple

import customtkinter as ctk

from ui.constants_ambience import (
    COLOR_BUTTON_SIZE,
    MOVEMENT_CARD_HEIGHT,
    MOVEMENT_CARD_WIDTH,
    MOVEMENT_FRAME_MIN_WIDTH,
    DARK_CONSOLE_BG,
    DARK_CONSOLE_SECTION_BG,
    DARK_CONSOLE_BORDER,
    SECTION_RADIUS,
    SECTION_PADDING,
    OUT_PROGRESS_COLOR,
    ICON_FONT_FAMILY,
    ICON_FONT_SIZE,
)
from ui.widgets.xy_pad import XYPad, XYCallback
from ui.widgets.dmx_controls import _ToolTip, update_button_style
from logic.constants_dmx import SPOT_BASE_COLORS, SPOT_GOBO_GLYPHS


def _flood_style_color_button(button: ctk.CTkButton, color: str, active: bool) -> None:
    """Même rendu visuel que les boutons de couleur FLOOD : contour coloré ou fond plein (sans bordure si actif)."""
    if active:
        button.configure(fg_color=color, hover_color=color, border_width=0)
    else:
        button.configure(
            fg_color="#111827",
            hover_color="#1f2937",
            border_width=2,
            border_color=color,
        )

# Taille 8 / Cercle : slider 0–1 <-> amplitude 0.05–0.5
def _amplitude_from_slider(v: float) -> float:
    return 0.05 + max(0.0, min(1.0, float(v))) * 0.45


def _slider_from_amplitude(a: float) -> float:
    return (max(0.05, min(0.5, float(a))) - 0.05) / 0.45


class SpotCard(ctk.CTkFrame):
    """
    Carte de mouvements pour les spots (PicoSpots) :
    reprend le design des autres cartes (cadre sombre + container interne),
    et embarque le pad XY + les boutons Center, 8 et CIRCLE (les 2 lyres sont toujours pilotées).
    """

    def __init__(
        self,
        master,
        on_xy_change: XYCallback,
        get_current_xy: Callable[[], Tuple[float, float]],
        on_dimmer_change: Callable[[float], None],
        on_center: Callable[[], None],
        on_save_position: Callable[[int], None],
        on_recall_position: Callable[[int], None],
        on_streak_toggle: Callable[[], None],
        on_circle_toggle: Callable[[], None],
        on_ellipse_toggle: Callable[[], None],
        on_180_toggle: Callable[[], None],
        on_amplitude_change: Callable[[float], None],
        on_gobo_select: Callable[[str], None],
        on_gobo_shake: Callable[[], None],
        on_color_select: Callable[[str], None],
        on_auto_gobo_toggle: Callable[[bool], None],
        on_auto_color_toggle: Callable[[bool], None],
        on_mirror_color_toggle: Callable[[bool], None],
        on_preset_click: Callable[[int], None],
        on_preset_config: Callable[[int], None],
        on_strobe_change: Callable[[float], None] = None,
        num_lyres: int = 2,
        *args,
        **kwargs,
    ) -> None:
        super().__init__(
            master,
            border_width=1,
            border_color=DARK_CONSOLE_BORDER,
            corner_radius=SECTION_RADIUS,
            fg_color=DARK_CONSOLE_BG,
            width=MOVEMENT_CARD_WIDTH,
            height=MOVEMENT_CARD_HEIGHT,
            *args,
            **kwargs,
        )
        self.grid_propagate(False)
        self._master_factor = 1.0
        self._icon_font = ctk.CTkFont(family=ICON_FONT_FAMILY, size=ICON_FONT_SIZE)
        self._SLIDER_THROTTLE_MS = 40
        self._dimmer_pending: Optional[float] = None
        self._dimmer_after_id: Optional[str] = None
        self._strobe_pending: Optional[float] = None
        self._strobe_after_id: Optional[str] = None
        self._color_buttons: Dict[str, ctk.CTkButton] = {}
        self._active_color_key: Optional[str] = None
        self._gobo_buttons: Dict[str, ctk.CTkButton] = {}
        self._active_gobo_key: Optional[str] = None
        self._preset_buttons: List[ctk.CTkButton] = []
        self._active_preset_index: Optional[int] = None

        self.columnconfigure(0, weight=1)
        self.rowconfigure(1, weight=1)

        title = ctk.CTkLabel(self, text="LYRES (MOUVEMENTS)", anchor="w", font=("", 13, "bold"))
        title.grid(row=0, column=0, sticky="w", pady=(2, 0), padx=(6, 6))

        FRAME_PAD = 10
        PAD_SIZE = 200
        BTN_LUMIERE_W = 60
        BTN_COULEUR_W = COLOR_BUTTON_SIZE
        BTN_GOBO_W = COLOR_BUTTON_SIZE
        BTN_POS_W = 36
        BTN_CENTER_W = 100

        container = ctk.CTkFrame(self, fg_color=DARK_CONSOLE_SECTION_BG, corner_radius=12)
        container.grid(row=1, column=0, sticky="nsew", padx=SECTION_PADDING, pady=(2, 6))
        for c in range(4):
            container.columnconfigure(c, weight=0)
        container.columnconfigure(3, weight=1, minsize=MOVEMENT_FRAME_MIN_WIDTH)
        container.rowconfigure(0, weight=1)

        def _labeled_frame(parent: ctk.CTkFrame, title: str, row: int, col: int, **grid_kw: object) -> ctk.CTkFrame:
            outer = ctk.CTkFrame(parent, fg_color=DARK_CONSOLE_SECTION_BG, corner_radius=8, border_width=1, border_color=DARK_CONSOLE_BORDER)
            outer.grid(row=row, column=col, **grid_kw)
            ctk.CTkLabel(outer, text=title, font=("", 11, "bold"), anchor="w").pack(anchor="w", padx=FRAME_PAD, pady=(2, 4))
            inner = ctk.CTkFrame(outer, fg_color="transparent")
            inner.pack(fill="both", expand=True, padx=FRAME_PAD, pady=(0, FRAME_PAD))
            return inner

        # ----- Frame Lumière (gauche) : FULL, Dimmer | Strobe en parallèle, OUT -----
        f_light = _labeled_frame(container, "Lumière", 0, 0, sticky="n", padx=(FRAME_PAD, FRAME_PAD // 2), pady=(2, FRAME_PAD))
        full_btn = ctk.CTkButton(f_light, text="FULL", width=BTN_LUMIERE_W, height=28, command=lambda: (self.dimmer_slider.set(1.0), self._on_dimmer(1.0, on_dimmer_change)))
        full_btn.pack(pady=(0, 8))
        dim_strobe_row = ctk.CTkFrame(f_light, fg_color="transparent")
        dim_strobe_row.pack(pady=(0, 4))
        # Colonne Dimmer
        dim_col = ctk.CTkFrame(dim_strobe_row, fg_color="transparent")
        dim_col.pack(side="left", padx=(0, 10))
        ctk.CTkLabel(dim_col, text="Dimmer", font=("", 10)).pack(pady=(0, 2))
        self.dimmer_slider = ctk.CTkSlider(
            dim_col, from_=0.0, to=1.0, orientation="vertical", number_of_steps=100,
            height=92, width=18,
            command=lambda v: self._on_dimmer(v, on_dimmer_change),
            fg_color=DARK_CONSOLE_SECTION_BG, progress_color="#0ea5e9",
        )
        self.dimmer_slider.set(1.0)
        self.dimmer_slider.pack(pady=(0, 2))
        self.dimmer_label = ctk.CTkLabel(dim_col, text="100%", width=34, anchor="center", font=("", 10))
        self.dimmer_label.pack()
        # Colonne Strobe
        strobe_col = ctk.CTkFrame(dim_strobe_row, fg_color="transparent")
        strobe_col.pack(side="left")
        ctk.CTkLabel(strobe_col, text="Strobe", font=("", 10)).pack(pady=(0, 2))
        self.strobe_slider = ctk.CTkSlider(
            strobe_col, from_=0.0, to=1.0, orientation="vertical", number_of_steps=100,
            height=92, width=18, command=self._on_strobe,
            fg_color=DARK_CONSOLE_SECTION_BG, progress_color="#9ca3af",
        )
        self.strobe_slider.set(0.0)
        self.strobe_slider.pack(pady=(0, 2))
        self.strobe_label = ctk.CTkLabel(strobe_col, text="0%", width=34, anchor="center", font=("", 10))
        self.strobe_label.pack()
        # Colonne OUT (à droite du Strobe)
        out_col = ctk.CTkFrame(dim_strobe_row, fg_color="transparent")
        out_col.pack(side="left", padx=(10, 0))
        ctk.CTkLabel(out_col, text="OUT", font=("", 9)).pack(pady=(0, 2))
        self.out_vu = ctk.CTkProgressBar(out_col, orientation="vertical", width=10, height=50, fg_color=DARK_CONSOLE_SECTION_BG, progress_color=OUT_PROGRESS_COLOR)
        self.out_vu.set(1.0)
        self.out_vu.pack(pady=(0, 2))
        self.out_label = ctk.CTkLabel(out_col, text="100%", width=34, anchor="center", font=("", 10))
        self.out_label.pack()
        self._on_strobe_cb = on_strobe_change
        self.mirror_color_var = ctk.BooleanVar(value=False)
        mirror_cb = ctk.CTkCheckBox(f_light, text="Mirror Color", variable=self.mirror_color_var, command=lambda: on_mirror_color_toggle(bool(self.mirror_color_var.get())), width=90)
        mirror_cb.pack(pady=(8, 0), anchor="w")

        # ----- Frame Couleurs (milieu) : grille 2 colonnes x 5 lignes -----
        f_colors = _labeled_frame(container, "Couleurs", 0, 1, sticky="n", padx=FRAME_PAD // 2, pady=(2, FRAME_PAD))
        colors_grid = ctk.CTkFrame(f_colors, fg_color="transparent")
        colors_grid.pack(anchor="nw")
        for idx, (label_txt, hex_color) in enumerate(SPOT_BASE_COLORS):
            r, c = idx // 2, idx % 2
            btn = ctk.CTkButton(colors_grid, text=label_txt, width=BTN_COULEUR_W, height=BTN_COULEUR_W, corner_radius=6, font=("", 11))
            btn._base_color = hex_color  # type: ignore[attr-defined]
            _flood_style_color_button(btn, hex_color, active=False)
            btn.grid(row=r, column=c, padx=2, pady=2, sticky="nw")
            btn.configure(command=lambda k=label_txt: self._on_base_color(k, on_color_select))
            _ToolTip(btn, f"Couleur {label_txt}")
            self._color_buttons[label_txt] = btn
        self.auto_color_var = ctk.BooleanVar(value=False)
        auto_color_cb = ctk.CTkCheckBox(f_colors, text="Auto Color", variable=self.auto_color_var, command=lambda: on_auto_color_toggle(bool(self.auto_color_var.get())), width=90)
        auto_color_cb.pack(pady=(6, 0), anchor="w")

        # ----- Frame Gobos (milieu-droit) : grille 2 colonnes + Auto-Gobo -----
        f_gobos = _labeled_frame(container, "Gobos", 0, 2, sticky="n", padx=FRAME_PAD // 2, pady=(2, FRAME_PAD))
        gobos_grid = ctk.CTkFrame(f_gobos, fg_color="transparent")
        gobos_grid.pack(anchor="nw")
        for idx, (glyph, gobo_id) in enumerate(SPOT_GOBO_GLYPHS):
            r, c = idx // 2, idx % 2
            btn = ctk.CTkButton(
                gobos_grid, text=glyph, font=self._icon_font,
                width=BTN_GOBO_W, height=BTN_GOBO_W, corner_radius=6,
                fg_color="#111827", hover_color="#1f2937", border_width=1, border_color="#4b5563",
            )
            btn.grid(row=r, column=c, padx=2, pady=2, sticky="nw")
            self._gobo_buttons[gobo_id] = btn
            btn.configure(command=lambda g=gobo_id: self._on_gobo_click(g, on_gobo_select))
            _ToolTip(btn, f"Gobo {gobo_id}")
        self.auto_gobo_var = ctk.BooleanVar(value=False)
        auto_gobo_cb = ctk.CTkCheckBox(gobos_grid, text="Auto-Gobo", variable=self.auto_gobo_var, command=lambda: on_auto_gobo_toggle(bool(self.auto_gobo_var.get())), width=90)
        auto_gobo_cb.grid(row=4, column=0, columnspan=2, padx=2, pady=(6, 0), sticky="nw")

        # ----- Colonne 4 : Graphique (XY pad) + boutons SPOT/Center/8/CIRCLE + options -----
        f_mouv = ctk.CTkFrame(container, fg_color=DARK_CONSOLE_SECTION_BG, corner_radius=8, border_width=1, border_color=DARK_CONSOLE_BORDER)
        f_mouv.grid(row=0, column=3, sticky="nsew", padx=(FRAME_PAD // 2, FRAME_PAD), pady=(2, FRAME_PAD))
        f_mouv.columnconfigure(0, weight=0)
        f_mouv.columnconfigure(1, weight=0)
        ctk.CTkLabel(f_mouv, text="Mouvement", font=("", 11, "bold"), anchor="w").grid(row=0, column=0, columnspan=2, sticky="w", padx=FRAME_PAD, pady=(2, 4))
        pad_area = ctk.CTkFrame(f_mouv, fg_color="transparent")
        pad_area.grid(row=1, column=0, columnspan=2, sticky="n", pady=(0, 6))
        pad_area.columnconfigure(1, weight=0)
        pad_area.columnconfigure(2, weight=0)
        speed_col = ctk.CTkFrame(pad_area, fg_color="transparent")
        speed_col.grid(row=0, column=0, sticky="n", padx=(0, 6), pady=0)
        ctk.CTkLabel(speed_col, text="Vitesse", font=("", 9)).grid(row=0, column=0, pady=(0, 2))
        self.speed_slider = ctk.CTkSlider(
            speed_col,
            from_=0.0,
            to=1.0,
            orientation="vertical",
            number_of_steps=100,
            height=PAD_SIZE,
            width=18,
            fg_color=DARK_CONSOLE_SECTION_BG,
            progress_color="#0ea5e9",
        )
        self.speed_slider.set(0.5)
        self.speed_slider.grid(row=1, column=0, pady=(0, 4), sticky="n")
        ctk.CTkLabel(speed_col, text="Taille", font=("", 9)).grid(row=0, column=1, pady=(0, 2), padx=(8, 0))
        self.amplitude_slider = ctk.CTkSlider(
            speed_col,
            from_=0.0,
            to=1.0,
            orientation="vertical",
            number_of_steps=100,
            height=PAD_SIZE,
            width=18,
            fg_color=DARK_CONSOLE_SECTION_BG,
            progress_color="#8b5cf6",
            command=lambda v: on_amplitude_change(_amplitude_from_slider(v)),
        )
        self.amplitude_slider.set(_slider_from_amplitude(0.2))
        self.amplitude_slider.grid(row=1, column=1, pady=(0, 4), padx=(8, 0), sticky="n")
        PAD_FINE_STEP = 0.01
        pad_wrapper = ctk.CTkFrame(pad_area, fg_color="transparent")
        pad_wrapper.grid(row=0, column=1, padx=0, pady=(0, 4), sticky="n")
        pad_wrapper.columnconfigure(0, weight=0)
        pad_wrapper.columnconfigure(1, weight=0)
        pad_wrapper.rowconfigure(0, weight=0)
        pad_wrapper.rowconfigure(1, weight=0)
        self.xy_pad = XYPad(pad_wrapper, on_change=on_xy_change, size=PAD_SIZE)
        self.xy_pad.grid(row=0, column=0, padx=0, pady=0, sticky="nw")
        # Boutons à droite du pad : haut/bas = Tilt (− / +)
        tilt_btns = ctk.CTkFrame(pad_wrapper, fg_color="transparent")
        tilt_btns.grid(row=0, column=1, padx=(4, 0), pady=0, sticky="n")
        btn_tilt_minus = ctk.CTkButton(tilt_btns, text="−", width=28, height=24, font=("", 14), fg_color="gray25", hover_color="gray40", command=lambda: self._pad_fine(on_xy_change, get_current_xy, 0, -PAD_FINE_STEP))
        btn_tilt_minus.grid(row=0, column=0, pady=(0, 2))
        _ToolTip(btn_tilt_minus, "Tilt − (réglage fin)")
        btn_tilt_plus = ctk.CTkButton(tilt_btns, text="+", width=28, height=24, font=("", 14), fg_color="gray25", hover_color="gray40", command=lambda: self._pad_fine(on_xy_change, get_current_xy, 0, PAD_FINE_STEP))
        btn_tilt_plus.grid(row=1, column=0, pady=0)
        _ToolTip(btn_tilt_plus, "Tilt + (réglage fin)")
        # Boutons en bas du pad : gauche/droite = Pan (− / +)
        pan_btns = ctk.CTkFrame(pad_wrapper, fg_color="transparent")
        pan_btns.grid(row=1, column=0, padx=0, pady=(4, 0), sticky="nw")
        btn_fine = ctk.CTkButton(pan_btns, text="−", width=28, height=24, font=("", 14), fg_color="gray25", hover_color="gray40", command=lambda: self._pad_fine(on_xy_change, get_current_xy, -PAD_FINE_STEP, 0))
        btn_fine.grid(row=0, column=0, padx=(0, 2))
        _ToolTip(btn_fine, "Pan − (réglage fin)")
        btn_fine_plus = ctk.CTkButton(pan_btns, text="+", width=28, height=24, font=("", 14), fg_color="gray25", hover_color="gray40", command=lambda: self._pad_fine(on_xy_change, get_current_xy, PAD_FINE_STEP, 0))
        btn_fine_plus.grid(row=0, column=1, padx=0)
        _ToolTip(btn_fine_plus, "Pan + (réglage fin)")
        pos_col = ctk.CTkFrame(pad_area, fg_color="transparent")
        pos_col.grid(row=0, column=2, sticky="n", padx=(8, 0), pady=(0, 4))
        self._position_buttons = []
        _pos_font = ("", 9)
        for idx in range(4):
            r, c = idx // 2, idx % 2
            btn = ctk.CTkButton(
                pos_col, text="P--\nT--", width=BTN_COULEUR_W, height=BTN_COULEUR_W,
                corner_radius=6, font=_pos_font, fg_color="gray25", hover_color="gray40",
                command=lambda i=idx: on_recall_position(i),
            )
            btn.grid(row=r, column=c, padx=2, pady=2)
            btn.bind("<Button-3>", lambda e, i=idx: on_save_position(i))
            _ToolTip(btn, "Clic gauche: rappel • Clic droit: enregistrer")
            self._position_buttons.append(btn)
        center_btn = ctk.CTkButton(
            pos_col, text="CENTER", width=BTN_COULEUR_W * 2 + 2, height=BTN_COULEUR_W,
            corner_radius=6, font=("", 11, "bold"), fg_color="gray25", hover_color="gray40",
            command=on_center,
        )
        center_btn.grid(row=2, column=0, columnspan=2, padx=2, pady=(6, 0), sticky="nsew")
        self.angle_180_var = ctk.BooleanVar(value=False)
        self.angle_180_cb = ctk.CTkCheckBox(pos_col, text="180", variable=self.angle_180_var, command=on_180_toggle, width=50)
        self.angle_180_cb.grid(row=3, column=0, columnspan=2, padx=2, pady=(6, 0), sticky="w")
        self.streak_btn = ctk.CTkButton(pos_col, text="8", width=BTN_COULEUR_W * 2 + 2, height=BTN_COULEUR_W, corner_radius=6, fg_color="gray25", hover_color="gray40", command=on_streak_toggle)
        self.streak_btn.grid(row=0, column=2, padx=(8, 0), pady=2, sticky="nw")
        self.circle_btn = ctk.CTkButton(pos_col, text="CIRCLE", width=BTN_COULEUR_W * 2 + 2, height=BTN_COULEUR_W, corner_radius=6, fg_color="gray25", hover_color="gray40", command=on_circle_toggle)
        self.circle_btn.grid(row=1, column=2, padx=(8, 0), pady=2, sticky="nw")
        self.ellipse_btn = ctk.CTkButton(pos_col, text="ELLIPSE", width=BTN_COULEUR_W * 2 + 2, height=BTN_COULEUR_W, corner_radius=6, fg_color="gray25", hover_color="gray40", command=on_ellipse_toggle)
        self.ellipse_btn.grid(row=2, column=2, padx=(8, 0), pady=2, sticky="nw")
        self._num_lyres = max(1, num_lyres)

    def set_active_position_index(self, index: Optional[int]) -> None:
        """Met en évidence le bouton de position rappelé (None = aucun) : fond bleu + bordure."""
        for i, btn in enumerate(self._position_buttons):
            if i == index:
                btn.configure(fg_color="#2563eb", hover_color="#1d4ed8", border_width=2, border_color="#93c5fd")
            else:
                btn.configure(fg_color="gray25", hover_color="gray40", border_width=0)

    def update_position_labels(self, positions: List[Optional[Tuple[float, float, bool]]]) -> None:
        """Met à jour le texte des boutons P1–P4 : P{pan} et T{tilt} (0–255), ou P--/T-- si vide. (x, y, use_180)."""
        for idx, btn in enumerate(self._position_buttons):
            if idx < len(positions) and positions[idx] is not None:
                entry = positions[idx]
                nx, ny = entry[0], entry[1]
                pan = int(round(max(0, min(1, nx)) * 255))
                tilt = int(round((1.0 - max(0, min(1, ny))) * 255))
                btn.configure(text=f"P{pan}\nT{tilt}")
            else:
                btn.configure(text="P--\nT--")

    def _pad_fine(
        self,
        on_xy_change: XYCallback,
        get_current_xy: Callable[[], Tuple[float, float]],
        dx: float,
        dy: float,
    ) -> None:
        """Déplace le point du pad finement (boutons ±)."""
        try:
            nx, ny = get_current_xy()
        except Exception:
            nx, ny = 0.5, 0.5
        nx = max(0.0, min(1.0, nx + dx))
        ny = max(0.0, min(1.0, ny + dy))
        try:
            on_xy_change(nx, ny)
            self.xy_pad.set_normalized(nx, ny)
        except Exception:
            pass

    # --- Callbacks internes --------------------------------------------------

    def _on_dimmer(self, value: float, callback: Callable[[float], None]) -> None:
        v = max(0.0, min(1.0, float(value)))
        try:
            self.dimmer_label.configure(text=f"{int(round(v * 100))}%")
        except Exception:
            pass
        self._update_out()
        if v >= 0.999 or v <= 0.001:
            if self._dimmer_after_id is not None:
                self.after_cancel(self._dimmer_after_id)
                self._dimmer_after_id = None
            self._dimmer_pending = None
            try:
                callback(v)
            except Exception:
                pass
            return
        self._dimmer_pending = v
        if self._dimmer_after_id is not None:
            return
        self._dimmer_after_id = self.after(self._SLIDER_THROTTLE_MS, lambda: self._flush_dimmer(callback))

    def _flush_dimmer(self, callback: Callable[[float], None]) -> None:
        self._dimmer_after_id = None
        if self._dimmer_pending is not None:
            v = self._dimmer_pending
            self._dimmer_pending = None
            try:
                callback(v)
            except Exception:
                pass

    def _on_strobe(self, value: float) -> None:
        v = max(0.0, min(1.0, float(value)))
        try:
            self.strobe_label.configure(text=f"{int(round(v * 100))}%")
        except Exception:
            pass
        self._strobe_pending = v
        if self._strobe_after_id is not None:
            return
        self._strobe_after_id = self.after(self._SLIDER_THROTTLE_MS, self._flush_strobe)

    def _flush_strobe(self) -> None:
        self._strobe_after_id = None
        if self._strobe_pending is not None and self._on_strobe_cb:
            v = self._strobe_pending
            self._strobe_pending = None
            try:
                self._on_strobe_cb(v)
            except Exception:
                pass

    def _update_out(self) -> None:
        local = max(0.0, min(1.0, self.dimmer_slider.get()))
        real = local * self._master_factor
        try:
            self.out_vu.set(real)
            self.out_label.configure(text=f"{int(round(real * 100))}%")
        except Exception:
            pass

    def update_out(self, master_factor: float) -> None:
        """Met à jour la barre OUT avec le facteur Master global (0.0–1.0)."""
        self._master_factor = max(0.0, min(1.0, float(master_factor)))
        self._update_out()

    def set_dimmer_value(self, value: float) -> None:
        """Synchronise le slider dimmer (0.0–1.0) depuis l'extérieur."""
        v = max(0.0, min(1.0, float(value)))
        self.dimmer_slider.set(v)
        self.dimmer_label.configure(text=f"{int(round(v * 100))}%")
        self._update_out()

    def set_strobe_value(self, value: float) -> None:
        """Synchronise le slider strobe (0.0–1.0) depuis l'extérieur (ex. rappel preset)."""
        v = max(0.0, min(1.0, float(value)))
        self.strobe_slider.set(v)
        try:
            self.strobe_label.configure(text=f"{int(round(v * 100))}%")
        except Exception:
            pass

    def set_active_color_key(self, key: Optional[str]) -> None:
        """Met à jour l'affichage du bouton de couleur actif (sans callback). Utilisé par Auto Color."""
        if self._active_color_key is not None and self._active_color_key in self._color_buttons:
            prev_btn = self._color_buttons[self._active_color_key]
            prev_color = getattr(prev_btn, "_base_color", "#4b5563")
            _flood_style_color_button(prev_btn, prev_color, active=False)
        self._active_color_key = key
        if key is not None and key in self._color_buttons:
            btn = self._color_buttons[key]
            color = getattr(btn, "_base_color", "#4b5563")
            _flood_style_color_button(btn, color, active=True)

    def _on_base_color(self, key: str, on_color_select: Callable[[str], None]) -> None:
        """Clique sur un bouton RVBW : met à jour le contour actif + callback."""
        # Quand on choisit une couleur directe, on désélectionne les presets U1–U4
        self.set_active_preset(None)
        if self._active_color_key is not None and self._active_color_key in self._color_buttons:
            prev_btn = self._color_buttons[self._active_color_key]
            prev_color = getattr(prev_btn, "_base_color", "#4b5563")
            _flood_style_color_button(prev_btn, prev_color, active=False)
        self._active_color_key = key
        btn = self._color_buttons.get(key)
        if btn is not None:
            color = getattr(btn, "_base_color", "#4b5563")
            _flood_style_color_button(btn, color, active=True)
        on_color_select(key)

    def _on_preset_left(self, index: int, cb: Callable[[int], None]) -> None:
        """Clic gauche : applique le preset utilisateur indexé."""
        cb(index)
        self.set_active_preset(index)

    def _on_preset_right(self, index: int, cb: Callable[[int], None]) -> None:
        """Clic droit : configure / enregistre le preset utilisateur indexé."""
        cb(index)

    def _on_gobo_click(self, gobo_id: str, callback: Callable[[str], None]) -> None:
        """Clique sur un gobo : met à jour le style actif puis appelle le callback."""
        self._active_gobo_key = gobo_id
        self._update_gobo_button_styles()
        try:
            callback(gobo_id)
        except Exception:
            pass

    def _update_gobo_button_styles(self) -> None:
        """Applique le style actif/inactif à tous les boutons gobo."""
        for gid, btn in self._gobo_buttons.items():
            if gid == self._active_gobo_key:
                btn.configure(
                    fg_color="#1e40af",
                    hover_color="#2563eb",
                    border_width=2,
                    border_color="#0ea5e9",
                )
            else:
                btn.configure(
                    fg_color="#111827",
                    hover_color="#1f2937",
                    border_width=1,
                    border_color="#4b5563",
                )

    def set_active_gobo(self, gobo_id: Optional[str]) -> None:
        """Synchronise l’affichage du gobo actif (ex. après avance auto-gobo)."""
        self._active_gobo_key = gobo_id
        self._update_gobo_button_styles()

    def set_active_preset(self, index: Optional[int]) -> None:
        """Met en évidence le preset actif (comme dans FLOODS/Party)."""
        self._active_preset_index = index
        for i, btn in enumerate(self._preset_buttons):
            base_color = getattr(btn, "_base_color", "#4b5563")
            update_button_style(btn, base_color, active=(index is not None and i == index))

    def update_preset_button(self, index: int, hex_color: str) -> None:
        """Met à jour la couleur visuelle d'un bouton preset (comme FLOODS/Party)."""
        if 0 <= index < len(self._preset_buttons):
            btn = self._preset_buttons[index]
            btn._base_color = hex_color  # type: ignore[attr-defined]
            is_active = self._active_preset_index is not None and self._active_preset_index == index
            update_button_style(btn, hex_color, active=is_active)


__all__ = ["SpotCard"]

