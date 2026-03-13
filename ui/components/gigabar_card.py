from __future__ import annotations

from typing import Callable, Dict, List, Optional, Tuple

import customtkinter as ctk

from ui.constants_ambience import (
    CARD_HEIGHT,
    CARD_WIDTH,
    BASE_COLORS_2X2,
    MODE_ICONS,
    MODE_COLORS,
    ICON_FONT_FAMILY,
    ICON_FONT_SIZE,
)
from ui.widgets.dmx_controls import _ToolTip
from logic.constants_dmx import GIGABAR_MODES


def update_button_style(button: ctk.CTkButton, color: str, active: bool) -> None:
    """Style Contour commun : contour coloré ou fond plein."""
    if active:
        button.configure(fg_color=color, hover_color=color, border_width=0)
    else:
        button.configure(
            fg_color="#111827",
            hover_color="#1f2937",
            border_width=2,
            border_color=color,
        )


# Options Canal 2 (familles de Modes Internes) : libellé -> famille
# Modes internes matériels Gigabar (Canal 2) — Musical = Sound 232–255
MODE_OPTIONS: List[Tuple[str, str]] = [
    ("🎨 Manuel", "MANUAL"),
    ("✨ Dream", "DREAM"),
    ("🌈 Rainbow", "RAINBOW"),
    ("⚡ Meteor", "METEOR"),
    ("📡 Flow", "FLOW"),
    ("🎤 Musical", "MUSICAL"),  # interne barre (Ch2 = 232–255)
]

# GIGABAR_MODES (mapping Canal 2) importé depuis logic.constants_dmx

# Mapping icône logicielle -> effet Gigabar
LOGIC_MODE_TO_EFFECT: Dict[str, Optional[str]] = {
    "MANUAL": "none",
    "PULSE": "pulse",
    "RAINBOW": "rainbow",
}


class GigabarCard(ctk.CTkFrame):
    """
    Carte Gigabar unifiée : même layout que Floods/Party (sliders gauche, 2x2 RGBW + U1-U4, modes en bas).
    Exception : OptionMenu 'Modes Internes' (Canal 2) en bas ; si mode interne choisi → déconnexion du groupe.
    """

    def __init__(
        self,
        master,
        on_color_preset: Callable[[Tuple[int, int, int]], None],
        on_effect_change: Callable[[str], None],
        on_user_preset_click: Callable[[int], None],
        on_user_preset_config: Callable[[int], None],
        user_colors: List[Optional[Tuple[int, int, int]]],
        base_color: Tuple[int, int, int] = (255, 255, 255),
        on_dimmer_change: Optional[Callable[[int], None]] = None,
        on_strobe_change: Optional[Callable[[int], None]] = None,
        on_mode_change: Optional[Callable[[int], None]] = None,
        has_internal_modes: bool = True,
        *args,
        **kwargs,
    ) -> None:
        super().__init__(
            master,
            border_width=1,
            border_color="#0ea5e9",
            corner_radius=15,
            fg_color="#111827",
            width=CARD_WIDTH,
            height=CARD_HEIGHT,
            *args,
            **kwargs,
        )
        self.grid_propagate(False)

        self._on_color_preset = on_color_preset
        self._on_effect_change = on_effect_change
        self._on_user_preset_click = on_user_preset_click
        self._on_user_preset_config = on_user_preset_config
        self._on_dimmer_change = on_dimmer_change
        self._on_strobe_change = on_strobe_change
        self._on_mode_change = on_mode_change

        # Liste de 4 presets utilisateur éventuels (None au démarrage).
        self.user_colors: List[Optional[Tuple[int, int, int]]] = list(user_colors)
        self.base_color: Tuple[int, int, int] = base_color
        self.user_buttons: List[ctk.CTkButton] = []
        self.color_buttons: Dict[str, ctk.CTkButton] = {}
        self.active_color_btn: Optional[str] = None
        self.active_user_preset: Optional[int] = None
        self._mode_families: Dict[str, str] = {label: fam for label, fam in MODE_OPTIONS}
        self.logic_mode: str = "MANUAL"
        self.logic_mode_buttons: Dict[str, ctk.CTkButton] = {}
        self._color_presets: List[Tuple[str, Tuple[int, int, int]]] = list(BASE_COLORS_2X2)
        self._master_factor: float = 1.0
        self._current_family: Optional[str] = None
        self._has_internal_modes: bool = bool(has_internal_modes)

        self._icon_font = ctk.CTkFont(family=ICON_FONT_FAMILY, size=ICON_FONT_SIZE)

        self.columnconfigure(0, weight=1)
        self.rowconfigure(1, weight=1)

        ctk.CTkLabel(self, text="GIGABAR", anchor="w").grid(
            row=0, column=0, sticky="w", pady=(4, 0), padx=(6, 6)
        )

        container = ctk.CTkFrame(self, fg_color="#020617", corner_radius=12)
        container.grid(row=1, column=0, sticky="nsew", padx=10, pady=(6, 10))
        container.columnconfigure(0, weight=0)
        container.columnconfigure(1, weight=0)
        container.columnconfigure(2, weight=0)
        container.columnconfigure(3, weight=1)
        container.rowconfigure(0, weight=0)
        container.rowconfigure(1, weight=0)

        sliders_frame = ctk.CTkFrame(container, fg_color="#020617")
        sliders_frame.grid(row=0, column=0, sticky="n", padx=(0, 6), pady=0)
        sliders_frame.columnconfigure(0, weight=0)
        sliders_frame.columnconfigure(1, weight=0)
        ctk.CTkLabel(sliders_frame, text="Dimmer", font=("", 10)).grid(row=0, column=0, pady=(0, 2))
        self.dimmer_slider = ctk.CTkSlider(
            sliders_frame,
            from_=0, to=255,
            number_of_steps=255,
            orientation="vertical",
            width=18,
            height=92,
            command=lambda v: self._slider_changed("_on_dimmer_change", int(float(v))),
            fg_color="#020617",
            progress_color="#0ea5e9",
        )
        self.dimmer_slider.set(255)
        self.dimmer_slider.grid(row=1, column=0, padx=(0, 4), pady=(0, 0))
        ctk.CTkLabel(sliders_frame, text="Strobe", font=("", 10)).grid(row=0, column=1, pady=(0, 2))
        self.strobe_slider = ctk.CTkSlider(
            sliders_frame,
            from_=0, to=255,
            number_of_steps=255,
            orientation="vertical",
            width=18,
            height=92,
            command=lambda v: self._slider_changed("_on_strobe_change", int(float(v))),
            fg_color="#020617",
            progress_color="#9ca3af",
        )
        self.strobe_slider.set(0)
        self.strobe_slider.grid(row=1, column=1, pady=(0, 0))
        self.dimmer_label = ctk.CTkLabel(sliders_frame, text="100%", width=40, anchor="center", font=("", 10))
        self.dimmer_label.grid(row=2, column=0, pady=(0, 0))
        self.strobe_label = ctk.CTkLabel(sliders_frame, text="0%", width=40, anchor="center", font=("", 10))
        self.strobe_label.grid(row=2, column=1, pady=(0, 0))

        colors_frame = ctk.CTkFrame(container, fg_color="#020617", corner_radius=10)
        colors_frame.grid(row=0, column=1, sticky="n", padx=(0, 6), pady=0)
        colors_grid = ctk.CTkFrame(colors_frame, fg_color="transparent")
        colors_grid.grid(row=0, column=0, sticky="nw")
        for i, (label, rgb) in enumerate(BASE_COLORS_2X2):
            r, c = i // 2, i % 2
            color_hex = self._rgb_to_hex(*rgb)
            btn = ctk.CTkButton(colors_grid, text=label, width=45, height=45, corner_radius=6)
            btn._base_color = color_hex  # type: ignore[attr-defined]
            update_button_style(btn, color_hex, active=False)
            btn.configure(command=lambda name=label, val=rgb: self._on_color_button(name, val))
            _ToolTip(btn, f"Couleur {label} Gigabar")
            btn.grid(row=r, column=c, padx=2, pady=2, sticky="nw")
            self.color_buttons[label] = btn

        presets_grid = ctk.CTkFrame(colors_frame, fg_color="#020617")
        presets_grid.grid(row=1, column=0, sticky="nw", pady=(4, 0))
        for idx in range(4):
            preset = self.user_colors[idx] if idx < len(self.user_colors) else None
            # Comme FLOODS / PARty : gris neutre tant qu'aucune couleur n'est enregistrée.
            if preset is None:
                color_hex = "#4b5563"
            else:
                r, g, b = preset
                color_hex = self._rgb_to_hex(r, g, b)
            btn = ctk.CTkButton(
                presets_grid,
                text=f"U{idx + 1}",
                width=45,
                height=45,
                corner_radius=6,
            )
            btn._base_color = color_hex  # type: ignore[attr-defined]
            update_button_style(btn, color_hex, active=False)
            btn.configure(command=lambda i=idx: self._on_user_preset_click_with_manual(i))
            row, col = divmod(idx, 2)
            btn.grid(row=row, column=col, padx=2, pady=2, sticky="nw")
            btn.bind("<Button-3>", lambda e, i=idx: self._on_user_preset_config(i))
            _ToolTip(btn, f"Preset Gigabar U{idx + 1}\nClic: appliquer  •  Clic droit: configurer")
            self.user_buttons.append(btn)

        # Modes logiciels (🎨 💓 🌈) : comme Floods et Party, toujours visibles
        out_col = 3
        modes_frame = ctk.CTkFrame(
            container,
            fg_color="#020617",
            border_width=1,
            border_color="#334155",
            corner_radius=10,
        )
        modes_frame.grid(row=0, column=2, sticky="n", pady=0)
        for col_idx in range(2):
            modes_frame.columnconfigure(col_idx, weight=1)
        for idx, (_icon_text, mode_name) in enumerate(MODE_ICONS):
            row_idx, col_idx = divmod(idx, 2)
            btn = ctk.CTkButton(
                modes_frame,
                text=_icon_text,
                font=self._icon_font,
                width=45,
                height=45,
                corner_radius=6,
                fg_color="#1f2937",
                hover_color="#374151",
                text_color=MODE_COLORS.get(mode_name, ("#9ca3af", "#ffffff"))[0],
                command=lambda m=mode_name: self._on_logic_mode_clicked(m),
            )
            if idx == len(MODE_ICONS) - 1 and col_idx == 0:
                btn.grid(row=row_idx, column=0, columnspan=2, padx=3, pady=(3, 2), sticky="ew")
            else:
                btn.grid(row=row_idx, column=col_idx, padx=3, pady=(3, 2), sticky="ew")
            self.logic_mode_buttons[mode_name] = btn
            if mode_name == "MANUAL":
                tip = "Mode 🎨 Manuel Gigabar\nCouleur fixe via les boutons RGBW."
            elif mode_name == "PULSE":
                tip = "Mode 💓 Pulse Gigabar\nVariations d'intensité."
            elif mode_name == "RAINBOW":
                tip = "Mode 🌈 Rainbow Gigabar\nDéfilement de couleurs."
            else:
                tip = f"Mode {mode_name}\nEffet logiciel."
            _ToolTip(btn, tip)
        self._update_logic_mode_buttons()

        # Colonne OUT : niveau de dimmer appliqué à la Gigabar
        out_frame = ctk.CTkFrame(container, fg_color="#020617", corner_radius=10)
        out_frame.grid(row=0, column=out_col, sticky="n", padx=(0, 4))
        ctk.CTkLabel(out_frame, text="OUT", font=("", 9)).grid(row=0, column=0, pady=(0, 2))
        self.out_vu = ctk.CTkProgressBar(
            out_frame,
            orientation="vertical",
            width=10,
            height=80,
            fg_color="#020617",
            progress_color="#22c55e",
        )
        self.out_vu.set(0.0)
        self.out_vu.grid(row=1, column=0, pady=(0, 2))
        self.out_label = ctk.CTkLabel(out_frame, text="0%", width=40, anchor="center", font=("", 10))
        self.out_label.grid(row=2, column=0, pady=(0, 0))

        self._mode_var = ctk.StringVar(value="🎨 Manuel")
        self._sub_mode_var = ctk.StringVar(value="—")
        self._mode_menu: Optional[ctk.CTkOptionMenu] = None
        self._sub_mode_menu: Optional[ctk.CTkOptionMenu] = None
        self._musical_led: Optional[ctk.CTkFrame] = None
        self._musical_led_active = False
        self._musical_led_on = False
        self._link_icon_label: Optional[ctk.CTkLabel] = None

        if self._has_internal_modes:
            internal_row = ctk.CTkFrame(container, fg_color="transparent")
            internal_row.grid(row=1, column=0, columnspan=out_col + 1, sticky="ew", pady=(6, 0))
            internal_row.columnconfigure(0, weight=1)
            internal_row.columnconfigure(1, weight=1)

            mode_labels = [opt[0] for opt in MODE_OPTIONS]
            self._mode_menu = ctk.CTkOptionMenu(
                internal_row,
                values=mode_labels,
                variable=self._mode_var,
                width=150,
                command=self._on_mode_option_selected,
            )
            self._mode_menu.grid(row=0, column=0, padx=(0, 4), sticky="ew")

            self._sub_mode_menu = ctk.CTkOptionMenu(
                internal_row,
                values=["—"],
                variable=self._sub_mode_var,
                width=180,
                command=self._on_sub_mode_selected,
            )
            self._sub_mode_menu.grid(row=1, column=0, columnspan=3, padx=(0, 4), pady=(4, 0), sticky="ew")
            ctk.CTkButton(
                internal_row, text="?", width=24, height=24,
                command=self._show_mode_help,
            ).grid(row=0, column=1, padx=2)
            self._musical_led = ctk.CTkFrame(
                internal_row, width=12, height=12, fg_color="#4b5563", corner_radius=6,
            )
            self._musical_led.grid(row=0, column=2, padx=2)
            self._musical_led.grid_propagate(False)
            self._link_icon_label = ctk.CTkLabel(internal_row, text="", width=20, anchor="w")
            self._link_icon_label.grid(row=0, column=3, padx=(4, 0))

    # --- API pour l'App -------------------------------------------------------
    @staticmethod
    def _rgb_to_hex(r: int, g: int, b: int) -> str:
        return f"#{r:02x}{g:02x}{b:02x}"

    def set_base_color(self, r: int, g: int, b: int) -> None:
        """Met à jour la couleur de base et synchronise les boutons couleur si possible."""
        self.base_color = (r, g, b)
        # Met en surbrillance un bouton R/V/B/W/A si la couleur correspond exactement
        match_name: Optional[str] = None
        for name, (cr, cg, cb) in self._color_presets:
            if (cr, cg, cb) == (r, g, b):
                match_name = name
                break
        for name, btn in self.color_buttons.items():
            base_color = getattr(btn, "_base_color", "#ffffff")
            update_button_style(btn, base_color, active=(name == match_name))
        self.active_color_btn = match_name

    def update_user_button(self, idx: int, r: int, g: int, b: int) -> None:
        """Met à jour visuellement un bouton de preset utilisateur."""
        if 0 <= idx < len(self.user_buttons):
            self.user_colors[idx] = (r, g, b)
            btn = self.user_buttons[idx]
            color = self._rgb_to_hex(r, g, b)
            btn._base_color = color  # type: ignore[attr-defined]
            is_active = self.active_user_preset == idx
            update_button_style(btn, color, active=is_active)

    def set_active_mode(self, mode: str) -> None:
        """Met en évidence le bouton de mode logique actif (effet → icône)."""
        effect_to_logic = {
            "none": "MANUAL",
            "manual": "MANUAL",
            "pulse": "PULSE",
            "rainbow": "RAINBOW",
        }
        # Les anciens effets "chenillard" sont mappés sur MANUAL par défaut.
        self.logic_mode = effect_to_logic.get(mode, "MANUAL")
        self._update_logic_mode_buttons()

    def _update_logic_mode_buttons(self) -> None:
        """Met en évidence le bouton de mode logique actif."""
        for mode_name, btn in self.logic_mode_buttons.items():
            base_color, active_color = MODE_COLORS.get(mode_name, ("#1f2937", "#0ea5e9"))
            if mode_name == self.logic_mode:
                btn.configure(
                    fg_color=active_color,
                    hover_color=active_color,
                    border_width=2,
                    border_color="#e5e7eb",
                    text_color="#ffffff",
                )
            else:
                btn.configure(
                    fg_color="#020617",
                    hover_color="#020617",
                    border_width=2,
                    border_color=base_color,
                    text_color=base_color,
                )

    def _on_logic_mode_clicked(self, mode_name: str) -> None:
        """Clic sur 🎨/💓/🌈/🎤 : déclenche un mode logiciel (soft) côté app.

        Le menu \"Modes Internes\" en bas reste dédié au choix manuel
        des programmes internes de la barre (Canal 2).
        """
        self.logic_mode = mode_name
        self._update_logic_mode_buttons()
        self._set_musical_active(False)

        effect = LOGIC_MODE_TO_EFFECT.get(mode_name, "none")
        if effect is not None and self._on_effect_change is not None:
            try:
                self._on_effect_change(effect)
            except Exception:
                pass

    def _rebuild_sub_modes(self, family: Optional[str]) -> Optional[int]:
        """Reconstruit le sous‑menu en fonction de la famille choisie.

        Retourne la première valeur DMX sélectionnée automatiquement,
        ou None si aucun sous‑programme n'est disponible.
        """
        if family is None or family not in GIGABAR_MODES:
            self._sub_mode_var.set("—")
            if self._sub_mode_menu is not None:
                self._sub_mode_menu.configure(values=["—"])
            return 0

        modes = GIGABAR_MODES.get(family, [])
        if not modes:
            self._sub_mode_var.set("—")
            if self._sub_mode_menu is not None:
                self._sub_mode_menu.configure(values=["—"])
            return None

        labels = [label for label, _ in modes]
        if self._sub_mode_menu is not None:
            self._sub_mode_menu.configure(values=labels)
        first_label, first_value = modes[0]
        self._sub_mode_var.set(first_label)
        return first_value

    def _on_mode_option_selected(self, choice: str) -> None:
        """Famille de Modes Internes : sélectionne une catégorie et recharge le sous‑menu."""
        family = self._mode_families.get(choice, "MANUAL")
        self._current_family = family if family != "MANUAL" else None

        if self._current_family is None:
            # Manuel : Canal 2 = 0, pas de sous‑programme
            if self._on_mode_change is not None:
                try:
                    self._on_mode_change(0)
                except Exception:
                    pass
            self._set_musical_active(False)
            self._rebuild_sub_modes(None)
            return

        # Famille avec sous‑programmes : applique le premier par défaut
        first_value = self._rebuild_sub_modes(self._current_family)
        if first_value is None:
            return
        self._set_musical_active(first_value >= 232)
        if self._on_mode_change is not None:
            try:
                self._on_mode_change(first_value)
            except Exception:
                pass

    def _on_sub_mode_selected(self, label: str) -> None:
        """Choix d'un sous‑programme dans la famille courante."""
        family = self._current_family
        if family is None or family not in GIGABAR_MODES:
            return
        for lbl, value in GIGABAR_MODES[family]:
            if lbl == label:
                self._set_musical_active(value >= 232)
                if self._on_mode_change is not None:
                    try:
                        self._on_mode_change(value)
                    except Exception:
                        pass
                break

    def _show_mode_help(self) -> None:
        """Ouvre une fenêtre d'aide sur les plages du Canal 2 (Modes Internes Gigabar)."""
        win = ctk.CTkToplevel(self.winfo_toplevel())
        win.title("Aide – Canal 2 (Mode)")
        win.geometry("420x220")
        win.transient(self.winfo_toplevel())
        win.grab_set()
        win.focus_force()
        text = (
            "Canal 2 – Modes / Programmes internes Gigabar\n\n"
            "MANUAL (000) : couleur fixe via les sliders RGBW.\n\n"
            "DREAM – transitions douces :\n"
            "  • 008 : Dream 1 – Fondu lent RGB complet.\n"
            "  • 016 : Dream 2 – Fondu alterné demi‑barre.\n"
            "  • 024 : Dream 3 – Respiration sur primaires.\n"
            "  • 032 : Dream 4 – Fondu Pastel.\n\n"
            "RAINBOW – arc‑en‑ciel interne :\n"
            "  • 040 : Static Rainbow – spectre fixe.\n"
            "  • 048 : Rainbow Shift – décalage lent.\n"
            "  • 056 : Rainbow Spin – rotation rapide.\n"
            "  • 064 : Rainbow Bounce – va‑et‑vient.\n\n"
            "METEOR – balayages :\n"
            "  • 080 : Comet White – traînée blanche.\n"
            "  • 088 : Meteor RGB – point coloré avec trace.\n"
            "  • 096 : Double Meteor – deux points croisés.\n"
            "  • 104 : Stardust – éclats aléatoires.\n\n"
            "FLOW – remplissages :\n"
            "  • 120 : Water Flow – remplissage type \"eau\".\n"
            "  • 128 : Color Fill – remplissage puis vidage.\n"
            "  • 136 : Snake – bloc qui parcourt la barre.\n"
            "  • 144 : Theater Chase – style guirlande cinéma.\n\n"
            "MUSICAL – réaction au son interne :\n"
            "  • 232 : Sound Flash – flash blanc sur les basses.\n"
            "  • 240 : Sound Color – changement de couleur.\n"
            "  • 248 : Sound EQ – allumage centre → bords selon le volume."
        )
        lbl = ctk.CTkLabel(win, text=text, justify="left", anchor="w", font=("", 12))
        lbl.pack(padx=16, pady=16, fill="both", expand=True)
        ctk.CTkButton(win, text="Fermer", command=win.destroy).pack(pady=(0, 12))

    def _set_musical_active(self, active: bool) -> None:
        """Active/désactive le clignotement du voyant Musical."""
        self._musical_led_active = active
        if not active:
            self._musical_led_on = False
            if self._musical_led is not None:
                self._musical_led.configure(fg_color="#4b5563")
            return
        # Lance le clignotement si ce n'est pas déjà le cas
        if not self._musical_led_on:
            self._musical_led_on = False
            self.after(0, self._blink_musical_led)

    def _blink_musical_led(self) -> None:
        """Fait clignoter la LED Musical tant que le mode est actif."""
        if not self._musical_led_active:
            if self._musical_led is not None:
                self._musical_led.configure(fg_color="#4b5563")
            self._musical_led_on = False
            return
        self._musical_led_on = not self._musical_led_on
        color = "#facc15" if self._musical_led_on else "#4b5563"
        if self._musical_led is not None:
            self._musical_led.configure(fg_color=color)
        # Clignote environ 2 fois par seconde
        self.after(250, self._blink_musical_led)

    def set_link_state(self, linked: bool, autonomous: bool = False) -> None:
        """
        Met à jour l'icône de lien :
        - linked=True  -> 🔗  (suit les autres cartes linkées)
        - autonomous   -> 🔓  (mode interne prioritaire)
        - sinon        -> vide.
        """
        if self._link_icon_label is None:
            return
        if autonomous:
            self._link_icon_label.configure(text="🔓")
        elif linked:
            self._link_icon_label.configure(text="🔗")
        else:
            self._link_icon_label.configure(text="")

    def _slider_changed(self, callback_attr: str, value: int) -> None:
        cb = getattr(self, callback_attr, None)
        if cb is not None:
            try:
                cb(value)
            except Exception:
                pass
        # Met à jour les labels et la sortie OUT
        v = max(0, min(255, int(value)))
        percent = int(round(v * 100 / 255)) if 255 else 0
        if callback_attr == "_on_dimmer_change" and hasattr(self, "dimmer_label"):
            try:
                self.dimmer_label.configure(text=f"{percent}%")
            except Exception:
                pass
        if callback_attr == "_on_strobe_change" and hasattr(self, "strobe_label"):
            try:
                self.strobe_label.configure(text=f"{percent}%")
            except Exception:
                pass
        self._update_out()

    def _update_out(self) -> None:
        """Met à jour la colonne OUT en fonction du dimmer local et du master."""
        if not hasattr(self, "out_vu") or self.dimmer_slider is None:
            return
        try:
            gv = max(0.0, min(1.0, float(self.dimmer_slider.get()) / 255.0))
            md = max(0.0, min(1.0, float(self._master_factor)))
            real = gv * md
            self.out_vu.set(real)
            self.out_label.configure(text=f"{int(round(real * 100))}%")
        except Exception:
            pass

    def update_dmx(self, master_dimmer: float) -> None:
        """Synchronise la sortie OUT avec le master global."""
        self._master_factor = max(0.0, min(1.0, float(master_dimmer)))
        self._update_out()

    def _on_user_preset_click_with_manual(self, idx: int) -> None:
        """Clic sur U1/U2/U3/U4 : repasse en Mode Manuel puis applique le preset. Recliquer désélectionne."""
        if idx == self.active_user_preset:
            self._clear_color_selection()
            return
        self._mode_var.set("🎨 Manuel")
        if self._on_mode_change is not None:
            try:
                self._on_mode_change(0)
            except Exception:
                pass
        try:
            self._on_user_preset_click(idx)
        except Exception:
            pass
        # Met en évidence le preset sélectionné et désactive les couleurs R/V/B/W.
        self.active_user_preset = idx
        for i, btn in enumerate(self.user_buttons):
            base_color = getattr(btn, "_base_color", "#4b5563")
            update_button_style(btn, base_color, active=(i == idx))
        self.active_color_btn = None
        for name, btn in self.color_buttons.items():
            base_color = getattr(btn, "_base_color", "#ffffff")
            update_button_style(btn, base_color, active=False)

    def _clear_color_selection(self) -> None:
        """Désélectionne tous les boutons couleur et applique noir (réinitialisation)."""
        self.active_color_btn = None
        self.active_user_preset = None
        for name, btn in self.color_buttons.items():
            base_color = getattr(btn, "_base_color", "#ffffff")
            update_button_style(btn, base_color, active=False)
        for i, btn in enumerate(self.user_buttons):
            base_color = getattr(btn, "_base_color", "#4b5563")
            update_button_style(btn, base_color, active=False)
        try:
            self._on_color_preset((0, 0, 0))
        except Exception:
            pass

    def _on_color_button(self, color_name: str, rgb: Tuple[int, int, int]) -> None:
        """Clic sur R/V/B/W/A : repasse en Mode Manuel (Canal 2 = 0) puis applique la couleur. Recliquer désélectionne."""
        if color_name == self.active_color_btn:
            self._clear_color_selection()
            return
        self.base_color = rgb
        self.active_color_btn = color_name
        for name, btn in self.color_buttons.items():
            base_color = getattr(btn, "_base_color", "#ffffff")
            update_button_style(btn, base_color, active=(name == color_name))
        # Une couleur de base active désactive les presets utilisateur.
        self.active_user_preset = None
        for i, btn in enumerate(self.user_buttons):
            base_color = getattr(btn, "_base_color", "#4b5563")
            update_button_style(btn, base_color, active=False)
        # Repasse le Canal 2 en Manuel pour que la couleur soit visible
        self._mode_var.set("🎨 Manuel")
        if self._on_mode_change is not None:
            try:
                self._on_mode_change(0)
            except Exception:
                pass
        try:
            self._on_color_preset(rgb)
        except Exception:
            pass

    def set_mode_value(self, value: int) -> None:
        """Synchronise le menu Mode avec une valeur DMX (0-255).

        Utilisé uniquement lors de la lecture de l'état DMX, pas par les modes soft.
        """
        v = max(0, min(255, value))
        if v < 8:
            label = "🎨 Manuel"
            family = None
        elif v < 40:
            label = "✨ Dream"
            family = "DREAM"
        elif v < 80:
            label = "🌈 Rainbow"
            family = "RAINBOW"
        elif v < 120:
            label = "⚡ Meteor"
            family = "METEOR"
        elif v < 232:
            label = "📡 Flow"
            family = "FLOW"
        else:
            label = "🎤 Musical"
            family = "MUSICAL"

        self._mode_var.set(label)
        self._current_family = family
        if self._sub_mode_menu is not None:
            if family is not None:
                # Reconstruit le sous‑menu sans renvoyer de valeur (lecture seule)
                modes = GIGABAR_MODES.get(family, [])
                labels = [lbl for lbl, _ in modes] or ["—"]
                self._sub_mode_menu.configure(values=labels)
                if labels and labels[0] != "—":
                    self._sub_mode_var.set(labels[0])
            else:
                self._sub_mode_menu.configure(values=["—"])
                self._sub_mode_var.set("—")

        # LED Musicale active uniquement si Canal 2 >= 232
        self._set_musical_active(v >= 232)

    def set_dimmer_value(self, value: int) -> None:
        """Met à jour le slider Dimmer sans déclencher le callback."""
        if self.dimmer_slider is not None:
            v = max(0, min(255, value))
            self.dimmer_slider.set(v)
            if hasattr(self, "dimmer_label"):
                percent = int(round(v * 100 / 255)) if 255 else 0
                self.dimmer_label.configure(text=f"{percent}%")
            self._update_out()

    def set_strobe_value(self, value: int) -> None:
        """Met à jour le slider Strobe sans déclencher le callback."""
        if self.strobe_slider is not None:
            v = max(0, min(255, value))
            self.strobe_slider.set(v)
            if hasattr(self, "strobe_label"):
                percent = int(round(v * 100 / 255)) if 255 else 0
                self.strobe_label.configure(text=f"{percent}%")


__all__ = ["GigabarCard", "MODE_OPTIONS"]

