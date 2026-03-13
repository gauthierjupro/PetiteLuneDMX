"""
Carte simplifiée pour les Xtrem LED (pilotage groupé).
Modes : STOP, SLOW, PARTY, FADE (fondu), JUMP (couleurs jump).
Slider : Intensité / Vitesse (CH5 / CH4 selon mode).
En mode PARTY, l'effet réagit aux pics audio (synchro Rythme).
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

XtremMode = Literal["stop", "slow", "party", "fade", "jump"]

# Codes internes (CH1 reste 0 ; utilisés pour CH3/CH4 selon manuel)
XTREM_MODE_STOP = 0
XTREM_MODE_SLOW = 128
XTREM_MODE_PARTY = 220
XTREM_MODE_FADE = 240   # CH3 232-255 = fondu enchaîné
XTREM_MODE_JUMP = 217   # CH3 203-231 = 7 couleurs jump


class XtremCard(ctk.CTkFrame):
    """
    Carte simplifiée pour Xtrem LED :
    STOP / SLOW / PARTY + Intensité / Vitesse (Ch5).
    """

    def __init__(
        self,
        master,
        on_mode_change: Callable[[str], None],
        on_speed_change: Callable[[float], None],
        on_bpm_pulse_change: Callable[[bool], None] | None = None,
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
        self._current_mode: XtremMode = "stop"

        self.columnconfigure(0, weight=1)
        self.rowconfigure(1, weight=1)

        header = ctk.CTkFrame(self, fg_color="transparent")
        header.grid(row=0, column=0, sticky="w", padx=(6, 6), pady=(4, 0))
        icon_lbl = ctk.CTkLabel(header, text="\uf0eb", font=self._icon_font)
        icon_lbl.grid(row=0, column=0, padx=(0, 4))
        title = ctk.CTkLabel(header, text="XTREM LED", anchor="w", font=("", 13, "bold"))
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
        self._stop_btn = ctk.CTkButton(
            btn_frame, text="STOP", width=56, height=28,
            fg_color="#374151", hover_color="#4b5563",
            command=lambda: self._set_mode("stop", on_mode_change),
        )
        self._stop_btn.grid(row=0, column=0, padx=(0, 4))
        self._slow_btn = ctk.CTkButton(
            btn_frame, text="SLOW", width=56, height=28,
            fg_color="gray25", hover_color="gray40",
            command=lambda: self._set_mode("slow", on_mode_change),
        )
        self._slow_btn.grid(row=0, column=1, padx=4)
        self._party_btn = ctk.CTkButton(
            btn_frame, text="PARTY", width=56, height=28,
            fg_color="gray25", hover_color="gray40",
            command=lambda: self._set_mode("party", on_mode_change),
        )
        self._party_btn.grid(row=0, column=2, padx=4)
        self._fade_btn = ctk.CTkButton(
            btn_frame, text="FADE", width=56, height=28,
            fg_color="gray25", hover_color="gray40",
            command=lambda: self._set_mode("fade", on_mode_change),
        )
        self._fade_btn.grid(row=0, column=3, padx=4)
        self._jump_btn = ctk.CTkButton(
            btn_frame, text="JUMP", width=56, height=28,
            fg_color="gray25", hover_color="gray40",
            command=lambda: self._set_mode("jump", on_mode_change),
        )
        self._jump_btn.grid(row=0, column=4, padx=(4, 0))

        self._on_bpm_pulse_change = on_bpm_pulse_change
        self._bpm_pulse_var = ctk.BooleanVar(value=False)
        bpm_row = ctk.CTkFrame(content, fg_color="transparent")
        bpm_row.grid(row=2, column=0, columnspan=3, sticky="w", pady=(0, 4))
        bpm_row.columnconfigure(0, weight=0)
        self._bpm_pulse_switch = ctk.CTkSwitch(
            bpm_row,
            text="Intensité BPM (Pulse)",
            variable=self._bpm_pulse_var,
            command=self._on_bpm_pulse_switch,
        )
        self._bpm_pulse_switch.grid(row=0, column=0, sticky="w")
        ctk.CTkLabel(content, text="Intensité / Vitesse (Ch5)", font=("", 10)).grid(row=3, column=0, sticky="w", pady=(0, 4))
        speed_row = ctk.CTkFrame(content, fg_color="transparent")
        speed_row.grid(row=4, column=0, columnspan=3, sticky="ew", pady=(0, 4))
        speed_row.columnconfigure(1, weight=1)
        self.speed_slider = ctk.CTkSlider(
            speed_row,
            from_=0.0,
            to=1.0,
            number_of_steps=100,
            command=on_speed_change,
            fg_color=DARK_CONSOLE_SECTION_BG,
            progress_color="#a855f7",
        )
        self.speed_slider.set(0.5)
        self.speed_slider.grid(row=0, column=1, sticky="ew")
        self._update_mode_buttons()

    def _on_bpm_pulse_switch(self) -> None:
        if self._on_bpm_pulse_change is not None:
            try:
                self._on_bpm_pulse_change(bool(self._bpm_pulse_var.get()))
            except Exception:
                pass

    def _set_mode(self, mode: XtremMode, callback: Callable[[str], None]) -> None:
        self._current_mode = mode
        self._update_mode_buttons()
        callback(mode)

    def _update_mode_buttons(self) -> None:
        for btn, mode in [
            (self._stop_btn, "stop"),
            (self._slow_btn, "slow"),
            (self._party_btn, "party"),
            (self._fade_btn, "fade"),
            (self._jump_btn, "jump"),
        ]:
            if mode == self._current_mode:
                btn.configure(fg_color="#2563eb", hover_color="#1d4ed8")
            else:
                btn.configure(fg_color="gray25", hover_color="gray40")

    def set_mode(self, mode: XtremMode) -> None:
        """Synchronise l'affichage du mode (sans déclencher le callback)."""
        self._current_mode = mode
        self._update_mode_buttons()

    def set_speed_value(self, value: float) -> None:
        """Synchronise le slider (0.0–1.0)."""
        self.speed_slider.set(max(0.0, min(1.0, float(value))))

    def set_bpm_pulse(self, enabled: bool) -> None:
        """Synchronise le switch Intensité BPM (sans déclencher le callback)."""
        self._bpm_pulse_var.set(bool(enabled))


__all__ = [
    "XtremCard", "XtremMode",
    "XTREM_MODE_STOP", "XTREM_MODE_SLOW", "XTREM_MODE_PARTY",
    "XTREM_MODE_FADE", "XTREM_MODE_JUMP",
]
