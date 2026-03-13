"""
Carte simplifiée pour le laser Cameo WOOKIE 200 R.
Modes : OFF, AUTO, SOUND, DMX (manuel motif 0), SHOW (manuel motif 8).
Slider : Vitesse / Réactivité (Ch6). Réf. manuel 9 canaux : 0-63 Off, 64-127 Auto,
128-191 Sound, 192-255 DMX (CH2-CH8 pilotés).
"""

from __future__ import annotations

from typing import Callable, Literal

import customtkinter as ctk

from ui.constants_ambience import (
    CARD_WIDTH,
    CARD_HEIGHT,
    DARK_CONSOLE_BG,
    DARK_CONSOLE_SECTION_BG,
    DARK_CONSOLE_BORDER,
    SECTION_RADIUS,
    SECTION_PADDING,
    ICON_FONT_FAMILY,
    ICON_FONT_SIZE,
)

WookieMode = Literal["off", "auto", "sound", "dmx", "show"]

# Valeurs DMX Canal 1 (manuel 9 canaux)
MODE_OFF = 0     # 0-63 = Laser Off
MODE_AUTO = 95   # 64-127 = Auto
MODE_SOUND = 160 # 128-191 = Sound
MODE_DMX = 224   # 192-255 = DMX (CH2-CH8 pilotés)


class WookieCard(ctk.CTkFrame):
    """
    Carte simplifiée pour le laser WOOKIE 200 R :
    OFF / AUTO / SOUND + Vitesse / Réactivité (Ch6).
    """

    def __init__(
        self,
        master,
        on_mode_change: Callable[[str], None],
        on_speed_change: Callable[[float], None],
        *args,
        **kwargs,
    ) -> None:
        super().__init__(
            master,
            border_width=1,
            border_color=DARK_CONSOLE_BORDER,
            corner_radius=SECTION_RADIUS,
            fg_color=DARK_CONSOLE_BG,
            width=CARD_WIDTH,
            height=200,
            *args,
            **kwargs,
        )
        self.grid_propagate(False)
        self._icon_font = ctk.CTkFont(family=ICON_FONT_FAMILY, size=ICON_FONT_SIZE)
        self._current_mode: WookieMode = "off"

        self.columnconfigure(0, weight=1)
        self.rowconfigure(1, weight=1)

        header = ctk.CTkFrame(self, fg_color="transparent")
        header.grid(row=0, column=0, sticky="w", padx=(6, 6), pady=(4, 0))
        icon_lbl = ctk.CTkLabel(header, text="\uf0d0", font=self._icon_font)
        icon_lbl.grid(row=0, column=0, padx=(0, 4))
        title = ctk.CTkLabel(header, text="WOOKIE 200 R (LASER)", anchor="w", font=("", 13, "bold"))
        title.grid(row=0, column=1, sticky="w")

        container = ctk.CTkFrame(self, fg_color=DARK_CONSOLE_SECTION_BG, corner_radius=12)
        container.grid(row=1, column=0, sticky="nsew", padx=SECTION_PADDING, pady=(6, 10))
        container.columnconfigure(0, weight=1)
        container.rowconfigure(0, weight=1)

        content = ctk.CTkFrame(container, fg_color="transparent")
        content.grid(row=0, column=0, sticky="nw", padx=8, pady=8)
        content.columnconfigure(1, weight=1)

        ctk.CTkLabel(content, text="Mode", font=("", 10, "bold")).grid(row=0, column=0, columnspan=3, sticky="w", pady=(0, 6))
        btn_frame = ctk.CTkFrame(content, fg_color="transparent")
        btn_frame.grid(row=1, column=0, columnspan=3, sticky="w", pady=(0, 6))
        self._off_btn = ctk.CTkButton(
            btn_frame, text="OFF", width=56, height=28,
            fg_color="#374151", hover_color="#4b5563",
            command=lambda: self._set_mode("off", on_mode_change),
        )
        self._off_btn.grid(row=0, column=0, padx=(0, 4))
        self._auto_btn = ctk.CTkButton(
            btn_frame, text="AUTO", width=56, height=28,
            fg_color="gray25", hover_color="gray40",
            command=lambda: self._set_mode("auto", on_mode_change),
        )
        self._auto_btn.grid(row=0, column=1, padx=4)
        self._sound_btn = ctk.CTkButton(
            btn_frame, text="SOUND", width=56, height=28,
            fg_color="gray25", hover_color="gray40",
            command=lambda: self._set_mode("sound", on_mode_change),
        )
        self._sound_btn.grid(row=0, column=2, padx=4)
        self._dmx_btn = ctk.CTkButton(
            btn_frame, text="DMX", width=56, height=28,
            fg_color="gray25", hover_color="gray40",
            command=lambda: self._set_mode("dmx", on_mode_change),
        )
        self._dmx_btn.grid(row=1, column=0, padx=(0, 4), pady=(4, 0))
        self._show_btn = ctk.CTkButton(
            btn_frame, text="SHOW", width=56, height=28,
            fg_color="gray25", hover_color="gray40",
            command=lambda: self._set_mode("show", on_mode_change),
        )
        self._show_btn.grid(row=1, column=1, padx=4, pady=(4, 0))

        ctk.CTkLabel(content, text="Vitesse / Réactivité (Ch6)", font=("", 10)).grid(row=2, column=0, sticky="w", pady=(0, 4))
        speed_row = ctk.CTkFrame(content, fg_color="transparent")
        speed_row.grid(row=3, column=0, columnspan=3, sticky="ew", pady=(0, 4))
        speed_row.columnconfigure(1, weight=1)
        self.speed_slider = ctk.CTkSlider(
            speed_row,
            from_=0.0,
            to=1.0,
            number_of_steps=100,
            command=on_speed_change,
            fg_color=DARK_CONSOLE_SECTION_BG,
            progress_color="#f97316",
        )
        self.speed_slider.set(0.5)
        self.speed_slider.grid(row=0, column=1, sticky="ew")
        self._update_mode_buttons()

    def _set_mode(self, mode: WookieMode, callback: Callable[[str], None]) -> None:
        self._current_mode = mode
        self._update_mode_buttons()
        callback(mode)

    def _update_mode_buttons(self) -> None:
        for btn, mode in [
            (self._off_btn, "off"),
            (self._auto_btn, "auto"),
            (self._sound_btn, "sound"),
            (self._dmx_btn, "dmx"),
            (self._show_btn, "show"),
        ]:
            if mode == self._current_mode:
                btn.configure(fg_color="#2563eb", hover_color="#1d4ed8")
            else:
                btn.configure(fg_color="gray25", hover_color="gray40")

    def set_mode(self, mode: WookieMode) -> None:
        """Synchronise l'affichage du mode (sans déclencher le callback)."""
        self._current_mode = mode
        self._update_mode_buttons()

    def set_speed_value(self, value: float) -> None:
        """Synchronise le slider vitesse (0.0–1.0)."""
        self.speed_slider.set(max(0.0, min(1.0, float(value))))


__all__ = ["WookieCard", "WookieMode", "MODE_OFF", "MODE_AUTO", "MODE_SOUND", "MODE_DMX"]
