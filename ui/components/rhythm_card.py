from __future__ import annotations

from typing import Callable, List, Optional

import customtkinter as ctk

from core.audio_sync import list_input_devices

from ui.constants_ambience import RHYTHM_CARD_WIDTH

# Hauteur carte Rythme (alignement visuel avec les cartes FLOODS / PARTY)
CARD_HEIGHT = 200


class RhythmCard(ctk.CTkFrame):
    """
    Carte de contrôle audio / BPM, même design que FLOODS et PARTY LED :
    fond sombre, container arrondi, colonnes (slider vertical BPM, modes + source, VU vertical).
    """

    def __init__(
        self,
        master,
        on_audio_input_change: Callable[[str], None],
        on_audio_mode_change: Callable[[str], None],
        on_manual_bpm_change: Callable[[float], None],
        initial_bpm: float = 120.0,
        *args,
        **kwargs,
    ) -> None:
        super().__init__(
            master,
            border_width=1,
            border_color="#4DF527",
            corner_radius=15,
            fg_color="#111827",
            width=RHYTHM_CARD_WIDTH,
            height=CARD_HEIGHT,
            *args,
            **kwargs,
        )
        self._on_audio_input_change = on_audio_input_change
        self._on_audio_mode_change = on_audio_mode_change
        self._on_manual_bpm_change = on_manual_bpm_change

        self.audio_input_var = ctk.StringVar()
        self.audio_input_map: dict[str, Optional[int]] = {}

        self.columnconfigure(0, weight=1)
        self.rowconfigure(1, weight=0)
        self.grid_propagate(False)

        self.title_label = ctk.CTkLabel(
            self, text="RYTHME / AUDIO", anchor="w", font=("", 13, "bold")
        )
        self.title_label.grid(row=0, column=0, sticky="w", pady=(4, 0), padx=(6, 6))

        container = ctk.CTkFrame(self, fg_color="#020617", corner_radius=12)
        container.grid(row=1, column=0, sticky="nsew", padx=10, pady=(6, 10))
        container.columnconfigure(0, weight=0)
        container.columnconfigure(1, weight=1)
        container.columnconfigure(2, weight=0)
        container.rowconfigure(0, weight=0)

        # ----- Colonne 1 : Slider BPM manuel (vertical, comme Dimmer) -----
        sliders_frame = ctk.CTkFrame(container, fg_color="#020617")
        sliders_frame.grid(row=0, column=0, sticky="n", padx=(0, 10), pady=0)
        ctk.CTkLabel(sliders_frame, text="BPM", font=("", 10)).grid(
            row=0, column=0, pady=(0, 2)
        )
        self.manual_bpm_slider = ctk.CTkSlider(
            sliders_frame,
            from_=40.0,
            to=200.0,
            orientation="vertical",
            number_of_steps=160,
            height=92,
            width=18,
            command=self._on_bpm_slider,
            fg_color="#020617",
            progress_color="#22c55e",
            button_color="#e5e7eb",
            button_hover_color="#ffffff",
        )
        self.manual_bpm_slider.set(initial_bpm)
        self.manual_bpm_slider.grid(row=1, column=0, pady=(0, 2), padx=(0, 4))
        self.bpm_value_label = ctk.CTkLabel(
            sliders_frame, text=f"{int(initial_bpm)}", width=34, anchor="center", font=("", 10)
        )
        self.bpm_value_label.grid(row=2, column=0, pady=(0, 0))

        # ----- Colonne 2 : Modes + Source audio -----
        center_frame = ctk.CTkFrame(container, fg_color="#020617", corner_radius=10)
        center_frame.grid(row=0, column=1, sticky="n", padx=(0, 10), pady=0)
        center_frame.columnconfigure(0, weight=1)

        self.audio_mode_segment = ctk.CTkSegmentedButton(
            center_frame,
            values=["Off", "Audio", "BPM"],
            command=self._on_audio_mode_change,
        )
        self.audio_mode_segment.grid(row=0, column=0, padx=8, pady=(8, 6), sticky="w")
        self.audio_mode_segment.set("Off")

        src_row = ctk.CTkFrame(center_frame, fg_color="transparent")
        src_row.grid(row=1, column=0, padx=8, pady=(0, 6), sticky="w")
        ctk.CTkLabel(src_row, text="Source audio :", font=("", 10), anchor="w").grid(
            row=0, column=0, padx=(0, 8)
        )
        options: List[str] = []
        try:
            devices = list_input_devices()
            if devices:
                for idx, name in devices:
                    label = f"{idx} – {name}"
                    options.append(label)
                    self.audio_input_map[label] = int(idx)
                self.audio_input_var.set(options[0])
            else:
                options.append("Par défaut")
                self.audio_input_map["Par défaut"] = None
                self.audio_input_var.set("Par défaut")
        except Exception:
            options.append("Par défaut")
            self.audio_input_map["Par défaut"] = None
            self.audio_input_var.set("Par défaut")

        self.audio_input_menu = ctk.CTkOptionMenu(
            src_row,
            variable=self.audio_input_var,
            values=options,
            command=self._on_audio_input_change,
            width=200,
        )
        self.audio_input_menu.grid(row=0, column=1)

        # Beat + BPM affiché (dans la même colonne, sous la source)
        vis_row = ctk.CTkFrame(center_frame, fg_color="transparent")
        vis_row.grid(row=2, column=0, padx=8, pady=(0, 8), sticky="w")
        self.audio_beat_label = ctk.CTkLabel(
            vis_row,
            text="Beat",
            width=46,
            anchor="center",
            fg_color="#111827",
            text_color="#9ca3af",
            corner_radius=6,
            font=("", 10),
        )
        self.audio_beat_label.grid(row=0, column=0, padx=(0, 8), pady=2, sticky="w")
        self.audio_bpm_label = ctk.CTkLabel(
            vis_row, text="BPM --", width=70, anchor="w", font=("", 10)
        )
        self.audio_bpm_label.grid(row=0, column=1, padx=(0, 0), pady=2, sticky="w")

        # ----- Colonne 3 : VU vertical (comme OUT des cartes ambiance) -----
        out_frame = ctk.CTkFrame(container, fg_color="#020617", corner_radius=10)
        out_frame.grid(row=0, column=2, sticky="n", padx=(0, 4))
        ctk.CTkLabel(out_frame, text="VU", font=("", 9)).grid(row=0, column=0, pady=(0, 2))
        self.audio_vu = ctk.CTkProgressBar(
            out_frame,
            orientation="vertical",
            width=10,
            height=80,
            fg_color="#020617",
            progress_color="#22c55e",
        )
        self.audio_vu.set(0.0)
        self.audio_vu.grid(row=1, column=0, pady=(0, 2))
        self.audio_vu_label = ctk.CTkLabel(
            out_frame, text="0%", width=40, anchor="center", font=("", 10)
        )
        self.audio_vu_label.grid(row=2, column=0, pady=(0, 0))

    def _on_bpm_slider(self, value: float) -> None:
        bpm = max(40.0, min(200.0, float(value)))
        try:
            self.bpm_value_label.configure(text=f"{int(bpm)}")
        except Exception:
            pass
        try:
            self._on_manual_bpm_change(bpm)
        except Exception:
            pass

    # --- API pour l'App (inchangée) -------------------------------------------------------
    def get_selected_input_index(self) -> Optional[int]:
        label = self.audio_input_var.get()
        return self.audio_input_map.get(label)

    def set_audio_mode_segment(self, mode: str) -> None:
        try:
            self.audio_mode_segment.set(mode)
        except Exception:
            pass

    def update_vu(self, level: float) -> None:
        try:
            lvl = max(0.0, min(1.0, float(level)))
            self.audio_vu.set(lvl)
            self.audio_vu_label.configure(text=f"{int(round(lvl * 100))}%")
        except Exception:
            pass

    def update_beat(self, is_beat: bool) -> None:
        try:
            if is_beat:
                self.audio_beat_label.configure(
                    fg_color="#22c55e", text_color="#020617"
                )
            else:
                self.audio_beat_label.configure(
                    fg_color="#111827", text_color="#9ca3af"
                )
        except Exception:
            pass

    def set_bpm_label(self, text: str) -> None:
        try:
            self.audio_bpm_label.configure(text=text)
        except Exception:
            pass

    def set_manual_bpm_value(self, bpm: float) -> None:
        try:
            self.manual_bpm_slider.set(float(bpm))
            self.bpm_value_label.configure(text=f"{int(bpm)}")
        except Exception:
            pass


__all__ = ["RhythmCard"]
