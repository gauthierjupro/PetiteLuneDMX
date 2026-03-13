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


class MasterAmbienceCard(ctk.CTkFrame):
    """
    Carte Master : même design que Floods/Party/Gigabar (sliders, 2x2 RGBW, U1-U4, modes).
    Pilote tous les appareils liés. Bouton '⚡ Modes Internes' pour détacher la Gigabar.
    """

    def __init__(
        self,
        master,
        on_color: Callable[[Tuple[int, int, int]], None],
        on_dim_change: Callable[[float], None],
        on_strobe_change: Callable[[float], None],
        on_logic_mode_change: Callable[[str], None],
        on_detach_gigabar: Callable[[], None],
        on_preset_apply: Optional[Callable[[int], None]] = None,
        on_preset_config: Optional[Callable[[int], None]] = None,
        user_presets: Optional[List[Optional[Tuple[int, int, int]]]] = None,
        *args,
        **kwargs,
    ) -> None:
        super().__init__(
            master,
            border_width=3,
            border_color="#22c55e",
            corner_radius=18,
            fg_color="#020617",
            width=CARD_WIDTH,
            height=CARD_HEIGHT,
            *args,
            **kwargs,
        )
        self.grid_propagate(False)

        self._on_color = on_color
        self._on_dim_change = on_dim_change
        self._on_strobe_change = on_strobe_change
        self._on_logic_mode_change = on_logic_mode_change
        self._on_detach_gigabar = on_detach_gigabar
        self._on_preset_apply = on_preset_apply
        self._on_preset_config = on_preset_config
        self._user_presets: List[Optional[Tuple[int, int, int]]] = list(user_presets) if user_presets else [None, None, None, None]

        self.color_buttons: Dict[str, ctk.CTkButton] = {}
        self.preset_buttons: List[ctk.CTkButton] = []
        self.active_color_btn: Optional[str] = None
        self.logic_mode: str = "MANUAL"
        self.logic_mode_buttons: Dict[str, ctk.CTkButton] = {}
        self.active_preset_index: Optional[int] = None
        self._icon_font = ctk.CTkFont(family=ICON_FONT_FAMILY, size=ICON_FONT_SIZE)

        self.columnconfigure(0, weight=1)
        self.rowconfigure(1, weight=1)

        title = ctk.CTkLabel(self, text="MASTER AMBIANCE", anchor="w", font=("", 14, "bold"))
        title.grid(row=0, column=0, pady=(4, 0), padx=6, sticky="w")

        main = ctk.CTkFrame(self, fg_color="#020617", corner_radius=14)
        main.grid(row=1, column=0, sticky="nsew", padx=10, pady=(6, 10))
        main.columnconfigure(0, weight=0)
        main.columnconfigure(1, weight=0)
        main.columnconfigure(2, weight=0)
        main.columnconfigure(3, weight=1)

        sliders_col = ctk.CTkFrame(main, fg_color="#020617")
        sliders_col.grid(row=0, column=0, padx=(0, 6), sticky="n")
        sliders_col.columnconfigure(0, weight=0)
        sliders_col.columnconfigure(1, weight=0)
        ctk.CTkLabel(sliders_col, text="Dimmer", font=("", 10)).grid(row=0, column=0, pady=(0, 2))
        self.master_slider = ctk.CTkSlider(
            sliders_col,
            from_=0.0, to=1.0,
            orientation="vertical",
            number_of_steps=100,
            height=92,
            width=18,
            command=self._on_master_slider,
            fg_color="#020617",
            progress_color="#22c55e",
        )
        self.master_slider.set(1.0)
        self.master_slider.grid(row=1, column=0, padx=(0, 4))
        ctk.CTkLabel(sliders_col, text="Strobe", font=("", 10)).grid(row=0, column=1, pady=(0, 2))
        self.strobe_slider = ctk.CTkSlider(
            sliders_col,
            from_=0.0, to=1.0,
            orientation="vertical",
            number_of_steps=100,
            height=92,
            width=18,
            command=self._on_strobe_slider,
            fg_color="#020617",
            progress_color="#9ca3af",
        )
        self.strobe_slider.set(0.0)
        self.strobe_slider.grid(row=1, column=1)
        self.master_dimmer_label = ctk.CTkLabel(
            sliders_col, text="100%", width=40, anchor="center", font=("", 10)
        )
        self.master_dimmer_label.grid(row=2, column=0, pady=(0, 0))
        self.master_strobe_label = ctk.CTkLabel(
            sliders_col, text="0%", width=40, anchor="center", font=("", 10)
        )
        self.master_strobe_label.grid(row=2, column=1, pady=(0, 0))

        colors_col = ctk.CTkFrame(main, fg_color="#020617")
        colors_col.grid(row=0, column=1, padx=(0, 6), sticky="n")
        colors_grid = ctk.CTkFrame(colors_col, fg_color="transparent")
        colors_grid.grid(row=0, column=0, sticky="nw")
        for i, (label, rgb) in enumerate(BASE_COLORS_2X2):
            r, c = i // 2, i % 2
            color_hex = "#{:02x}{:02x}{:02x}".format(*rgb)
            btn = ctk.CTkButton(colors_grid, text=label, width=45, height=45, corner_radius=6)
            btn._base_color = color_hex  # type: ignore[attr-defined]
            update_button_style(btn, color_hex, active=False)
            btn.configure(command=lambda name=label, val=rgb: self._on_color_button(name, val))
            btn.grid(row=r, column=c, padx=2, pady=2, sticky="nw")
            self.color_buttons[label] = btn
            _ToolTip(btn, f"Couleur Master {label}")

        presets_grid = ctk.CTkFrame(colors_col, fg_color="#020617")
        presets_grid.grid(row=1, column=0, sticky="nw", pady=(4, 0))
        for idx in range(4):
            preset = self._user_presets[idx] if idx < len(self._user_presets) else None
            color_hex = "#{:02x}{:02x}{:02x}".format(*(preset or (75, 85, 99))) if preset else "#4b5563"
            btn = ctk.CTkButton(
                presets_grid,
                text=f"U{idx + 1}",
                width=45,
                height=45,
                corner_radius=6,
            )
            btn._base_color = color_hex  # type: ignore[attr-defined]
            update_button_style(btn, color_hex, active=False)
            btn.configure(command=lambda i=idx: self._on_preset_apply_click(i))
            btn.bind("<Button-3>", lambda e, i=idx: self._on_preset_config_click(i))
            row, col = divmod(idx, 2)
            btn.grid(row=row, column=col, padx=2, sticky="nw")
            self.preset_buttons.append(btn)
            _ToolTip(btn, f"Preset Master U{idx + 1}\nClic: appliquer à tous les groupes linkés\nClic droit: configurer")

        modes_col = ctk.CTkFrame(
            main,
            fg_color="#020617",
            border_width=1,
            border_color="#334155",
            corner_radius=10,
        )
        modes_col.grid(row=0, column=2, sticky="n")
        for col_idx in range(2):
            modes_col.columnconfigure(col_idx, weight=1)
        for idx, (_icon_text, mode_name) in enumerate(MODE_ICONS):
            row_idx, col_idx = divmod(idx, 2)
            btn = ctk.CTkButton(
                modes_col,
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
                tip = "Mode 🎨 Manuel Master\nFixe tous les groupes linkés."
            elif mode_name == "PULSE":
                tip = "Mode 💓 Pulse Master\nVariations d'intensité synchronisées."
            elif mode_name == "RAINBOW":
                tip = "Mode 🌈 Rainbow Master\nChangements de couleur globaux."
            else:
                tip = f"Mode {mode_name} Master\nEffet logiciel."
            _ToolTip(btn, tip)
        self._update_logic_mode_buttons()

    # --- Callbacks internes ---------------------------------------------------
    def _on_master_slider(self, value: float) -> None:
        level = max(0.0, min(1.0, float(value)))
        try:
            self._on_dim_change(level)
        except Exception:
            pass
        if hasattr(self, "master_dimmer_label"):
            percent = int(round(level * 100))
            self.master_dimmer_label.configure(text=f"{percent}%")

    def _on_strobe_slider(self, value: float) -> None:
        level = max(0.0, min(1.0, float(value)))
        try:
            self._on_strobe_change(level)
        except Exception:
            pass
        if hasattr(self, "master_strobe_label"):
            percent = int(round(level * 100))
            self.master_strobe_label.configure(text=f"{percent}%")

    def _on_color_button(self, name: str, rgb: Tuple[int, int, int]) -> None:
        self.active_color_btn = name
        for lbl, btn in self.color_buttons.items():
            base_color = getattr(btn, "_base_color", "#ffffff")
            update_button_style(btn, base_color, active=(lbl == name))
        try:
            self._on_color(rgb)
        except Exception:
            pass

    def _update_logic_mode_buttons(self) -> None:
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
        self.logic_mode = mode_name
        self._update_logic_mode_buttons()
        try:
            self._on_logic_mode_change(mode_name)
        except Exception:
            pass

    def _on_preset_apply_click(self, index: int) -> None:
        if self._on_preset_apply is not None and 0 <= index < len(self.preset_buttons):
            try:
                self._on_preset_apply(index)
            except Exception:
                pass

        # Met à jour l'état visuel : un seul preset Master actif à la fois
        self.active_preset_index = index
        for i, btn in enumerate(self.preset_buttons):
            base_color = getattr(btn, "_base_color", "#4b5563")
            update_button_style(btn, base_color, active=(i == index))

    def _on_preset_config_click(self, index: int) -> None:
        if self._on_preset_config is not None and 0 <= index < len(self.preset_buttons):
            try:
                self._on_preset_config(index)
            except Exception:
                pass

    def update_preset_button(self, index: int, r: int, g: int, b: int) -> None:
        """Met à jour la couleur affichée d'un bouton preset U1-U4."""
        if 0 <= index < len(self.preset_buttons):
            while len(self._user_presets) <= index:
                self._user_presets.append(None)
            self._user_presets[index] = (r, g, b)
            btn = self.preset_buttons[index]
            color_hex = "#{:02x}{:02x}{:02x}".format(r, g, b)
            btn._base_color = color_hex  # type: ignore[attr-defined]
            is_active = self.active_preset_index == index
            update_button_style(btn, color_hex, active=is_active)


__all__ = ["MasterAmbienceCard"]

