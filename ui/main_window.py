from __future__ import annotations

from typing import List, Literal, Optional, Tuple, Callable, Dict, Any
import json
import threading
import time
import webbrowser

import customtkinter as ctk
from tkinter import colorchooser, messagebox

from core.app_paths import card_visibility_path, spot_position_memory_path, dynamo_position_memory_path, calibration_path, fin_de_morceau_path
from core.version import get_full_info
from core.dmx_driver import DmxDriver
from core.audio_sync import XtremAudioSync
from core.preset_manager import PresetManager
from models.fixtures import (
    Fixture,
    RGBFixture,
    LEDFloodPanel150,
    MovingHeadFixture,
    GigabarFixture,
    GigabarFixture8Ch,
    Gigabar5ChFixture,
    LaserFixture,
    XtremLedFixture,
    WookieLaserFixture,
    IbizaLas30GFixture,
    DynamoScanLed9ChFixture,
)
from ui.widgets.xy_pad import XYPad
from ui.widgets.channel_view import UniverseView, ChannelControlView
from ui.components.fixture_card import FixtureCard
from ui.components.gigabar_card import GigabarCard
from ui.components.master_ambience_card import MasterAmbienceCard
from ui.components.rhythm_card import RhythmCard
from ui.components.ambiance_section import AmbianceSection
from ui.components.movements_section import MovementsSection
from ui.components.spot_card import SpotCard
from ui.components.wookie_card import WookieCard
from ui.components.ibiza_card import IbizaCard
from ui.components.xtrem_card import XtremCard
from ui.components.dynam_scan_card import DynamScanCard
from ui.constants_ambience import (
    DARK_CONSOLE_BG,
    DARK_CONSOLE_SECTION_BG,
    DARK_CONSOLE_BORDER,
    SECTION_RADIUS,
)
from ui.config_report import open_report_window
from ui.dialogs.dynamo_calibration_dialog import open_dynamo_calibration_dialog
from logic.constants_dmx import (
    SPOT_GOBO_VALUES,
    SPOT_GOBO_CYCLE_VALUES,
    SPOT_COLOR_VALUES,
    SPOT_COLOR_COMPLEMENT,
    SPOT_COLOR_CYCLE,
    SPOT_BASE_COLORS,
)
from logic.motion_manager import MotionManager
from ui.controllers import (
    ControlController,
    RhythmController,
    SpotController,
    PresetsController,
)


class GigabarColorDialog(ctk.CTkToplevel):
    """Sélecteur de couleur pour la Gigabar avec preview, presets et mode expert RGB."""

    def __init__(
        self,
        master,
        initial_rgb: Tuple[int, int, int],
        on_change: Optional[Callable[[int, int, int], None]] = None,
    ) -> None:
        super().__init__(master)
        self.title("Couleur Gigabar")
        self.resizable(False, False)
        self.result: Optional[Tuple[int, int, int]] = None
        self._on_change = on_change

        # Centrage par rapport à la fenêtre principale
        parent = master.winfo_toplevel()
        try:
            parent_x = parent.winfo_rootx()
            parent_y = parent.winfo_rooty()
            parent_w = parent.winfo_width()
            parent_h = parent.winfo_height()
        except Exception:
            parent_x = parent_y = 100
            parent_w = parent_h = 600
        width, height = 380, 320
        x = parent_x + (parent_w // 2) - (width // 2)
        y = parent_y + (parent_h // 2) - (height // 2)
        self.geometry(f"{width}x{height}+{x}+{y}")
        self.transient(parent)
        self.grab_set()

        r0, g0, b0 = initial_rgb

        # Titre
        title_label = ctk.CTkLabel(self, text="Sélection de la couleur Gigabar", anchor="w")
        title_label.grid(row=0, column=0, columnspan=3, padx=20, pady=(12, 4), sticky="w")

        # Preview carré 100x100
        self.preview = ctk.CTkFrame(
            self,
            fg_color=f"#{r0:02x}{g0:02x}{b0:02x}",
            corner_radius=8,
        )
        self.preview.grid(row=1, column=0, rowspan=2, padx=20, pady=(4, 8), sticky="nw")
        self.preview.configure(width=100, height=100)

        # Presets (grille 3 x 8)
        presets_frame = ctk.CTkFrame(self, fg_color="transparent")
        presets_frame.grid(row=1, column=1, columnspan=2, padx=(0, 20), pady=(4, 8), sticky="nw")

        # Palette étendue : 24 couleurs (3 x 8)
        preset_colors: list[tuple[str, Tuple[int, int, int]]] = [
            # Rangée 1
            ("Rouge", (255, 0, 0)),
            ("Vert", (0, 255, 0)),
            ("Bleu", (0, 0, 255)),
            ("Jaune", (255, 255, 0)),
            ("Cyan", (0, 255, 255)),
            ("Magenta", (255, 0, 255)),
            ("Ambre", (255, 191, 0)),
            ("Orange", (255, 128, 0)),
            # Rangée 2
            ("Rose bébé", (255, 182, 193)),
            ("Turquoise", (64, 224, 208)),
            ("Violet élect.", (138, 43, 226)),
            ("Lime", (191, 255, 0)),
            ("Bleu ciel", (135, 206, 250)),
            ("Rose vif", (255, 20, 147)),
            ("Vert menthe", (152, 255, 204)),
            ("Or", (255, 215, 0)),
            # Rangée 3 – blancs et nuances utiles
            ("Blanc chaud", (255, 220, 180)),
            ("Blanc neutre", (255, 255, 255)),
            ("Blanc froid", (200, 220, 255)),
            ("Lavande", (230, 230, 250)),
            ("Bleu nuit", (25, 25, 112)),
            ("Rouge sombre", (139, 0, 0)),
            ("Vert forêt", (34, 139, 34)),
            ("Bleu pétrole", (0, 128, 128)),
        ]
        for idx, (_name, (cr, cg, cb)) in enumerate(preset_colors):
            row = idx // 8
            col = idx % 8
            btn = ctk.CTkButton(
                presets_frame,
                text="",
                width=22,
                height=20,
                fg_color=f"#{cr:02x}{cg:02x}{cb:02x}",
                hover_color=f"#{cr:02x}{cg:02x}{cb:02x}",
                command=lambda r=cr, g=cg, b=cb: self._apply_preset(r, g, b),
            )
            btn.grid(row=row, column=col, padx=4, pady=4)

        # Mode expert (sliders RGB repliables)
        self._expert_var = ctk.BooleanVar(value=False)
        expert_toggle = ctk.CTkCheckBox(
            self,
            text="Mode expert (sliders RGB)",
            variable=self._expert_var,
            command=self._toggle_expert,
        )
        expert_toggle.grid(row=3, column=0, columnspan=3, padx=20, pady=(0, 4), sticky="w")

        # Frame contenant les sliders RGB (cachée par défaut)
        self.expert_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.expert_frame.grid(row=4, column=0, columnspan=3, padx=20, pady=(0, 4), sticky="nsew")

        self._r = ctk.CTkSlider(self.expert_frame, from_=0, to=255, number_of_steps=256)
        self._g = ctk.CTkSlider(self.expert_frame, from_=0, to=255, number_of_steps=256)
        self._b = ctk.CTkSlider(self.expert_frame, from_=0, to=255, number_of_steps=256)
        self._r.set(r0)
        self._g.set(g0)
        self._b.set(b0)

        def on_slider_change(_: float) -> None:
            r = int(self._r.get())
            g = int(self._g.get())
            b = int(self._b.get())
            self._update_preview_and_callback(r, g, b)

        for row, (lbl, slider) in enumerate((("R", self._r), ("V", self._g), ("B", self._b)), start=0):
            ctk.CTkLabel(self.expert_frame, text=lbl, width=20, anchor="e").grid(
                row=row, column=0, padx=(0, 6), pady=2, sticky="e"
            )
            slider.configure(command=on_slider_change)
            slider.grid(row=row, column=1, padx=(0, 0), pady=2, sticky="ew")

        self.expert_frame.columnconfigure(1, weight=1)
        # Cacher le panneau expert par défaut
        self.expert_frame.grid_remove()

        # Boutons OK / Annuler
        btn_row = ctk.CTkFrame(self, fg_color="transparent")
        btn_row.grid(row=5, column=0, columnspan=3, pady=(6, 12))
        ok_btn = ctk.CTkButton(btn_row, text="OK", width=80, command=self._on_ok)
        cancel_btn = ctk.CTkButton(btn_row, text="Annuler", width=80, command=self._on_cancel)
        ok_btn.pack(side="left", padx=8)
        cancel_btn.pack(side="left", padx=8)

        self.columnconfigure(1, weight=1)
        self.focus_force()

    def _toggle_expert(self) -> None:
        if self._expert_var.get():
            self.expert_frame.grid()
        else:
            self.expert_frame.grid_remove()

    def _update_preview_and_callback(self, r: int, g: int, b: int) -> None:
        self.preview.configure(fg_color=f"#{r:02x}{g:02x}{b:02x}")
        if self._on_change is not None:
            try:
                self._on_change(r, g, b)
            except Exception:
                pass

    def _apply_preset(self, r: int, g: int, b: int) -> None:
        # Met à jour sliders, preview et applique immédiatement la couleur
        self._r.set(r)
        self._g.set(g)
        self._b.set(b)
        self._update_preview_and_callback(r, g, b)

    def _on_ok(self) -> None:
        r = int(self._r.get())
        g = int(self._g.get())
        b = int(self._b.get())
        self.result = (r, g, b)
        self.destroy()

    def _on_cancel(self) -> None:
        self.result = None
        self.destroy()


# Liens de documentation par modèle (à adapter si besoin)
DOCS_LINKS = {
    "LED Flood Panel 150": "https://images.thomann.de/pics/atg/atgdata/document/manual/c_253358_253359_fr_online.pdf",
    "LED PARty TCL spot": "https://www.steinigke.fr/fr/mpn42110193-eurolite-led-party-tcl-spot.html",
    "PicoSpot 20": "https://images.thomann.de/pics/atg/atgdata/document/misc/372642_c_372642_v2_fr_online.pdf",
    "Xtrem LED": "https://open-fixture-library.org/boomtonedj/xtrem-led",
    "Gigabar II": "https://images.thomann.de/pics/atg/atgdata/document/manual/372989_c_372989_en_online.pdf",
    "Dynamo Scan LED": "https://static.boomtonedj.com/pdf/manual/40/40995_dymanoscanledmanuelfren.pdf",
}


class App(ctk.CTk):
    def __init__(
        self,
        dmx_driver: DmxDriver,
        fixtures: List[Fixture],
        test_rgb_fixtures: Optional[List[RGBFixture]] = None,
    ) -> None:
        super().__init__()
        self.dmx = dmx_driver
        self.fixtures = fixtures
        self.test_rgb_fixtures = test_rgb_fixtures or []
        self.master_dimmer_factor: float = 1.0
        self.floods = [f for f in fixtures if isinstance(f, LEDFloodPanel150)]
        self.party = [
            f
            for f in fixtures
            if isinstance(f, RGBFixture)
            and f.manufacturer == "Eurolite"
            and "LED PARty TCL spot" in f.model
        ]
        self.pico = [
            f
            for f in fixtures
            if isinstance(f, MovingHeadFixture)
            and f.manufacturer == "Fun-Generation"
            and "PicoSpot 20" in f.model
        ]
        self.gigabars = [
            f for f in fixtures
            if isinstance(f, (GigabarFixture, GigabarFixture8Ch, Gigabar5ChFixture))
        ]
        self.dynamo = [f for f in fixtures if isinstance(f, DynamoScanLed9ChFixture)]
        self.wookie = [f for f in fixtures if isinstance(f, WookieLaserFixture)]
        self.ibiza = [f for f in fixtures if isinstance(f, IbizaLas30GFixture)]
        self.xtrem = [f for f in fixtures if isinstance(f, XtremLedFixture)]
        self.xtrem_audio_sync: Optional[XtremAudioSync] = None
        self.spot_active = [True, True]  # Les 2 lyres toujours pilotées (plus de boutons SPOT 1/2)
        # Calibration Pad XY par lyre : inversion, swap axes, limites Pan/Tilt (0–1)
        self.lyre_calibration: List[dict] = [
            {"invert_pan": False, "invert_tilt": False, "swap_axes": False, "pan_min": 0.0, "pan_max": 1.0, "tilt_min": 0.0, "tilt_max": 1.0},
            {"invert_pan": False, "invert_tilt": False, "swap_axes": False, "pan_min": 0.0, "pan_max": 1.0, "tilt_min": 0.0, "tilt_max": 1.0},
        ]
        # Calibration Dynamo : inversion + offset Pan/Tilt par fixture (montage physique)
        self.dynamo_calibration: List[dict] = [
            {"invert_pan": False, "invert_tilt": False, "offset_pan": 0.0, "offset_tilt": 0.0},
            {"invert_pan": False, "invert_tilt": False, "offset_pan": 0.0, "offset_tilt": 0.0},
        ]
        self._load_calibrations()
        self.spot_streak_running = False
        self.spot_circle_running = False
        self.spot_ellipse_running = False
        self.spot_180_running = False
        # Dernière position manuelle du pad XY (normalisée 0.0–1.0)
        self.xy_last_x: float = 0.5
        self.xy_last_y: float = 0.5
        # Presets Lyres P1–P4 : dict (x, y, use_180, color_id, gobo_id, dimmer, strobe, mirror_color, auto_gobo, auto_color)
        self.spot_xy_memory: List[Optional[Dict[str, Any]]] = self._load_spot_position_memory()
        # Dynamo Scan LED : motion + XY
        self.dynamo_streak_running = False
        self.dynamo_circle_running = False
        self.dynamo_xy_last_x: float = 0.5
        self.dynamo_xy_last_y: float = 0.5
        # Presets Dynamo P1–P4 : dict (x, y, amplitude, use_180, color_id, gobo_id, dimmer, strobe, auto_color, auto_gobo)
        self.dynamo_xy_memory: List[Optional[Dict[str, Any]]] = self._load_dynamo_position_memory()
        self._dynamo_amplitude: float = 0.2
        self.dynamo_180_running: bool = False
        self.dynamo_auto_color_sync: bool = False
        self.dynamo_auto_gobo_sync: bool = False
        self.dynamo_ellipse_running: bool = False
        # Vitesse lue par le thread Dynamo (copiée depuis le slider par le thread principal)
        self.dynamo_motion_speed: float = 0.5
        # Position lissée par fixture (nx, ny) pour le thread — écrit par le thread, initialisé au centre
        self._dynamo_lerp_current: List[Tuple[float, float]] = [(0.5, 0.5), (0.5, 0.5)]
        self._dynamo_motion_thread: Optional[threading.Thread] = None
        self._dynamo_motion_stop = threading.Event()
        self._dynamo_motion_cycle_index: int = 0
        self._dynamo_gobo_cycle_index: int = 0
        self._dynamo_color_cycle_index: int = 0
        # Wookie 200 R : mode OFF/AUTO/SOUND (Ch1) + Vitesse (Ch6), envoi continu 30 Hz
        self.wookie_mode: str = "off"
        self.wookie_speed: float = 0.5
        self._wookie_refresh_after_id: Optional[str] = None
        # Ibiza LAS-30G : mode OFF/AUTO/SOUND (Ch1) + Zoom (Ch5), Master 0 → Ch1=0
        self.ibiza_mode: str = "off"
        self.ibiza_zoom: float = 0.5
        self._ibiza_refresh_after_id: Optional[str] = None
        # Xtrem LED : STOP/SLOW/PARTY (Ch1) + Intensité/Vitesse (Ch5), Master 0 → Ch1=0
        self.xtrem_mode: str = "stop"
        self.xtrem_speed: float = 0.5
        self.xtrem_bpm_pulse: bool = False  # Intensité (Ch5) pilotée par la courbe BPM comme les cartes ambiance
        self._pulse_dimmer_curve: float = 1.0  # Mis à jour par rhythm_controller (0→1→0 sur la période BPM)
        self._xtrem_refresh_after_id: Optional[str] = None
        # Boucle auto (20 Hz / 50 ms) : snapshot + MotionManager (centre/phase)
        self._auto_motion_snap: List[Tuple[MovingHeadFixture, int, int]] = []
        self._auto_motion_after_id: Optional[str] = None
        # Amplitude des mouvements auto (20 % de la course)
        self._auto_motion_amplitude: float = 0.2
        self._motion_manager = MotionManager(0.5, 0.5, self._auto_motion_amplitude)
        # Gobos / couleurs lyres (mode 11CH) + Auto-Gobo sur mouvement (constantes dans logic.constants_dmx)
        self.spot_auto_gobo_sync: bool = False
        self._spot_gobo_cycle_index: int = 0
        self._auto_motion_cycle_index: int = 0
        self.spot_auto_color_sync: bool = False
        self.spot_mirror_color: bool = False
        self._spot_color_cycle_index: int = 0
        # Presets utilisateur pour les couleurs de lyres (U1–U4)
        self.spot_user_presets: list[Optional[str]] = [None, None, None, None]
        self.spot_last_color_id: Optional[str] = None
        self.floods_group: Optional[FixtureCard] = None
        self.party_group: Optional[FixtureCard] = None
        self.gigabar_base_color: Tuple[int, int, int] = (255, 255, 255)
        # 4 couleurs utilisateur pour la Gigabar (raccourcis U1‑U4)
        # Au démarrage, elles sont vides (comme FLOODS / PARty) et
        # seront définies lors de la première configuration par l'utilisateur.
        self.gigabar_user_colors: list[Optional[Tuple[int, int, int]]] = [
            None,
            None,
            None,
            None,
        ]
        self.gigabar_card: Optional[GigabarCard] = None
        self.rhythm_card: Optional[RhythmCard] = None
        # Valeurs de consigne de groupes pour l'UI
        self.floods_group_value: float = 1.0
        self.party_group_value: float = 1.0
        self.active_preset_slot: Optional[int] = None
        self.preset_status_label: Optional[ctk.CTkLabel] = None
        self.blackout_active: bool = False
        self.blackout_button: Optional[ctk.CTkButton] = None
        self.blackout_status_label: Optional[ctk.CTkLabel] = None
        # Fin de morceau : snapshot de toutes les cartes (enregistré par REC FD, rappelé par FD Morceau)
        self._fin_de_morceau_state: Optional[Dict[str, Any]] = None
        # Durée de fondu des presets (en secondes)
        self.preset_fade_time: float = 0.5
        # Modes audio globaux : "Off", "Audio", "BPM"
        self.audio_mode: str = "Off"
        self.manual_bpm_enabled: bool = False
        self.manual_bpm_value: float = 0.0
        self._manual_last_beat_time: float = 0.0
        # Throttle pour la mise à jour de la vue DMX depuis le buffer
        self._dmx_view_sync_counter: int = 0
        # Système de LINK (Ambiances) : chaque carte peut rejoindre ou non le groupe lié
        self.link_floods: bool = False
        self.link_party: bool = False
        self.link_gigabar: bool = False
        # Carte Master Ambiance (affichée quand 2+ groupes sont linkés)
        self.master_amb_card: Optional[MasterAmbienceCard] = None

        # Presets / DmxEngine
        engine = None
        for fx in fixtures:
            if fx.engine is not None:
                engine = fx.engine
                break
        self.engine = engine
        self.preset_manager = PresetManager(driver=self.dmx, fixtures=self.fixtures, engine=self.engine)
        self.preset_buttons: List[ctk.CTkButton] = []
        self.preset_rec_button: Optional[ctk.CTkButton] = None

        self.title("Petite DMX")
        self.geometry("1100x700")
        self._build_ui()
        # Contrôleurs par zone (logique découplée de la fenêtre)
        self.control_controller = ControlController(self)
        self.rhythm_controller = RhythmController(self)
        self.spot_controller = SpotController(self)
        self.presets_controller = PresetsController(self)
        self._refresh_preset_button_labels()
        self._refresh_preset_button_styles()
        self._load_fin_de_morceau()
        # Force le Blackout à l'état OFF (visuel + logique) au démarrage
        self.blackout_active = False
        if self.blackout_button is not None:
            self.blackout_button.configure(fg_color="#444444", hover_color="#555555")
        if self.blackout_status_label is not None:
            self.blackout_status_label.configure(text="")
        # Pousse l'état initial des fixtures vers le driver (évite sortie à 0 si recalculate n'a jamais été appelé)
        for fx in self.fixtures:
            try:
                fx.recalculate_output()
            except Exception:
                pass
        # DEBUG DMX: affichage des 20 premiers canaux au démarrage
        try:
            snap = getattr(self.dmx, "get_universe_snapshot", lambda n=20: [])(20)
            if snap:
                print("DMX au démarrage (canaux 1-20):", snap)
        except Exception:
            pass
        # Vérifie la connexion DMX dès le démarrage
        self._update_dmx_status_label(show_popup=True)
        # Met à jour régulièrement l'état DMX
        self.after(2000, self._poll_dmx_status)
        # VU-mètre audio / beat (rafraîchi ~30 fps)
        self.after(33, self._update_audio_visuals)
        self.protocol("WM_DELETE_WINDOW", self.on_close)

    # --- Layout -------------------------------------------------------------
    def _build_ui(self) -> None:
        tabview = ctk.CTkTabview(self)
        tabview.pack(fill="both", expand=True, padx=10, pady=10)

        control_tab = tabview.add("Contrôle")
        universe_tab = tabview.add("Univers DMX")
        dmx_tab = tabview.add("Vue DMX")
        patch_tab = tabview.add("PATCH & MONTAGE")

        control_tab.columnconfigure(0, weight=1)
        control_tab.columnconfigure(1, weight=0)
        control_tab.rowconfigure((0, 1, 2, 3, 4), weight=0)

        top = ctk.CTkFrame(
            control_tab,
            fg_color=DARK_CONSOLE_BG,
            border_width=1,
            border_color=DARK_CONSOLE_BORDER,
            corner_radius=SECTION_RADIUS,
        )
        top.grid(row=0, column=0, sticky="ew", padx=20, pady=(20, 10))
        self.blackout_button = ctk.CTkButton(
            top,
            text="Blackout",
            command=self.on_blackout,
            fg_color="#444444",
            hover_color="#555555",
        )
        self.blackout_button.grid(row=0, column=0, padx=(0, 10))
        ctk.CTkButton(
            top,
            text="REC FD",
            width=56,
            height=28,
            fg_color="#64748b",
            hover_color="#94a3b8",
            command=self.on_save_fin_de_morceau,
        ).grid(row=0, column=1, padx=(4, 0))
        ctk.CTkButton(
            top,
            text="FD Morceau",
            width=90,
            height=28,
            fg_color="#0d9488",
            hover_color="#14b8a6",
            command=self.on_recall_fin_de_morceau,
        ).grid(row=0, column=2, padx=(4, 0))
        ctk.CTkButton(
            top,
            text="Laser Safety",
            fg_color="#aa0000",
            hover_color="#ff0000",
            command=self.on_laser_safety,
        ).grid(row=0, column=3, padx=(10, 0))
        self.preset_status_label = ctk.CTkLabel(
            top,
            text="—",
            anchor="w",
            text_color="gray70",
            font=("", 14, "bold"),
        )
        self.preset_status_label.grid(row=1, column=0, columnspan=4, sticky="w", pady=(4, 0))

        # Indicateur de connexion DMX (en haut à droite)
        self.dmx_status_label = ctk.CTkLabel(
            top,
            text="DMX : DÉCONNECTÉ",
            text_color="#ef4444",
            anchor="e",
        )
        self.dmx_status_label.grid(row=0, column=4, padx=(20, 0), sticky="e")
        self.blackout_status_label = ctk.CTkLabel(
            top,
            text="",
            text_color="#ef4444",
            anchor="e",
        )
        self.blackout_status_label.grid(row=0, column=5, padx=(10, 0), sticky="e")
        ctk.CTkButton(
            top,
            text="?",
            width=28,
            height=28,
            fg_color="#0ea5e9",
            hover_color="#38bdf8",
            command=self._open_control_help,
        ).grid(row=0, column=6, padx=(6, 0), sticky="e")
        ctk.CTkButton(
            top,
            text="Cartes",
            width=56,
            height=28,
            fg_color="#64748b",
            hover_color="#94a3b8",
            command=self._open_card_visibility_dialog,
        ).grid(row=0, column=7, padx=(6, 0), sticky="e")
        ctk.CTkButton(
            top,
            text="Rapport",
            width=60,
            height=28,
            fg_color="#64748b",
            hover_color="#94a3b8",
            command=lambda: open_report_window(self),
        ).grid(row=0, column=8, padx=(6, 0), sticky="e")
        self._reglages_btn = ctk.CTkButton(
            top,
            text="Réglages",
            width=70,
            height=28,
            fg_color="#64748b",
            hover_color="#94a3b8",
            command=self._open_reglages_menu,
        )
        self._reglages_btn.grid(row=0, column=9, padx=(6, 0), sticky="e")
        ctk.CTkButton(
            top,
            text="Info",
            width=40,
            height=28,
            fg_color="#64748b",
            hover_color="#94a3b8",
            command=self._open_about_dialog,
        ).grid(row=0, column=10, padx=(6, 0), sticky="e")

        # Encart AMBIANCES factorisé (cadre + en-tête ; cartes en row=1)
        self.ambiance_section = AmbianceSection(
            control_tab,
            on_link_changed=self._on_link_switch_changed,
            on_help_click=self._open_ambience_help,
        )
        self.ambiance_section.grid(row=1, column=0, sticky="nw", padx=20, pady=(0, 10))
        self.link_floods_switch = self.ambiance_section.link_floods_switch
        self.link_party_switch = self.ambiance_section.link_party_switch
        self.link_gigabar_switch = self.ambiance_section.link_gigabar_switch
        self.ambience_help_button = self.ambiance_section.ambience_help_button

        # Cartes FLOODS / PARty / Gigabar côte à côte
        self.floods_group = FixtureCard(
            self.ambiance_section,
            title="FLOODS",
            on_color=lambda rgb: self.on_ambience_color("FLOODS", rgb),
            on_dim_change=lambda v: self.on_group_dim_change("FLOODS", v),
            on_strobe_change=lambda v: self.on_group_strobe_change("FLOODS", v),
            on_logic_mode_change=lambda _: self.control_controller._reapply_ambiance_from_ui(("FLOODS", "PARTY")),
        )
        self.floods_group.grid(row=1, column=0, padx=(10, 4), pady=(4, 10), sticky="nw")
        self.party_group = FixtureCard(
            self.ambiance_section,
            title="PARty LED",
            on_color=lambda rgb: self.on_ambience_color("PARTY", rgb),
            on_dim_change=lambda v: self.on_group_dim_change("PARTY", v),
            on_strobe_change=lambda v: self.on_group_strobe_change("PARTY", v),
            on_logic_mode_change=lambda _: self.control_controller._reapply_ambiance_from_ui(("FLOODS", "PARTY")),
        )
        self.party_group.grid(row=1, column=1, padx=4, pady=(4, 10), sticky="nw")

        # Carte Gigabar (3e colonne) — 5ch = comme Flood/Party (R,G,B,Dimmer,Strobe) ; 8ch = dimmer, mode, strobe, RGBW
        has_gigabar_modes = any(
            not isinstance(f, Gigabar5ChFixture) for f in self.gigabars
        ) if self.gigabars else False
        self.gigabar_card = GigabarCard(
            self.ambiance_section,
            on_color_preset=self.on_gigabar_preset_color,
            on_effect_change=self.on_gigabar_effect,
            on_user_preset_click=self.on_gigabar_user_color_click,
            on_user_preset_config=self.on_gigabar_user_color_config,
            user_colors=self.gigabar_user_colors,
            base_color=self.gigabar_base_color,
            on_dimmer_change=self.on_gigabar_dimmer_change,
            on_strobe_change=self.on_gigabar_strobe_change,
            on_mode_change=self.on_gigabar_mode_change,
            has_internal_modes=has_gigabar_modes,
        )
        self.gigabar_card.grid(row=1, column=2, padx=(4, 10), pady=(4, 10), sticky="nw")

        # Carte Master Ambiance (affichée dynamiquement quand 2+ groupes sont LINKés)
        master_presets = list(getattr(self.floods_group, "user_presets", [None, None, None, None]))
        self.master_amb_card = MasterAmbienceCard(
            self.ambiance_section,
            on_color=self.on_master_amb_color,
            on_dim_change=self.on_master_amb_dim,
            on_strobe_change=self.on_master_amb_strobe,
            on_logic_mode_change=self.on_master_amb_logic_mode,
            on_detach_gigabar=self.on_master_detach_gigabar,
            on_preset_apply=self.on_master_preset_apply,
            on_preset_config=self.on_master_preset_config,
            user_presets=master_presets,
        )
        # Pas de grid ici : la disposition est gérée par _update_master_ambience_layout

        # Ligne Presets ambiances (row 2) : REC + slots 1–8 + Fade Time
        presets_in_ambiance = ctk.CTkFrame(self.ambiance_section, fg_color="transparent")
        presets_in_ambiance.grid(row=2, column=0, columnspan=4, sticky="w", padx=10, pady=(0, 10))
        presets_in_ambiance.columnconfigure(0, weight=1)
        ctk.CTkLabel(presets_in_ambiance, text="PRESETS (ambiances)", anchor="w").grid(
            row=0, column=0, sticky="w", pady=(2, 4)
        )
        presets_row = ctk.CTkFrame(presets_in_ambiance, fg_color="transparent")
        presets_row.grid(row=1, column=0, sticky="w", pady=(0, 4))

        self.preset_rec_button = ctk.CTkButton(
            presets_row,
            text="REC",
            width=60,
            fg_color="#444444",
            hover_color="#555555",
            command=self.open_save_preset_dialog,
        )
        self.preset_rec_button.grid(row=0, column=0, padx=(0, 12))

        self.preset_buttons = []
        for idx in range(8):
            btn = ctk.CTkButton(
                presets_row,
                text=str(idx + 1),
                width=40,
                command=lambda i=idx + 1: self.on_preset_button(i),
            )
            btn.grid(row=0, column=idx + 1, padx=4)
            self.preset_buttons.append(btn)
            btn.bind("<Button-3>", lambda e, i=idx + 1: self.on_preset_rename(i))

        fade_row = ctk.CTkFrame(presets_in_ambiance, fg_color="transparent")
        fade_row.grid(row=2, column=0, sticky="w", pady=(0, 4))
        ctk.CTkLabel(fade_row, text="Fade (s)", anchor="w").grid(row=0, column=0, sticky="w", padx=(0, 8))
        self.fade_time_slider = ctk.CTkSlider(
            fade_row,
            from_=0.0,
            to=5.0,
            number_of_steps=50,
            width=140,
            command=self.on_fade_time_change,
        )
        self.fade_time_slider.set(self.preset_fade_time)
        self.fade_time_slider.grid(row=0, column=1, padx=(0, 8))
        self.fade_time_label = ctk.CTkLabel(
            fade_row,
            text=f"{self.preset_fade_time:.1f}s",
            width=60,
            anchor="w",
        )
        self.fade_time_label.grid(row=0, column=2, sticky="w")

        # Ligne Rythme + Wookie (à droite du Rythme, colonne 0 = contenu, colonne 1 = Master)
        rhythm_row = ctk.CTkFrame(control_tab, fg_color="transparent")
        rhythm_row.grid(row=2, column=0, sticky="nw", padx=20, pady=(0, 10))
        rhythm_row.columnconfigure(0, weight=0)
        rhythm_row.columnconfigure(1, weight=0)
        rhythm_row.columnconfigure(2, weight=0)
        rhythm_row.columnconfigure(3, weight=0)
        self.rhythm_card = RhythmCard(
            rhythm_row,
            on_audio_input_change=self.on_audio_input_change,
            on_audio_mode_change=self.on_audio_mode_change,
            on_manual_bpm_change=self.on_manual_bpm_slider_change,
            initial_bpm=120.0,
        )
        self.rhythm_card.grid(row=0, column=0, sticky="nw", padx=(0, 10), pady=0)
        self.wookie_card = WookieCard(
            rhythm_row,
            on_mode_change=self.on_wookie_mode_change,
            on_speed_change=self.on_wookie_speed_change,
        )
        self.wookie_card.grid(row=0, column=1, sticky="nw", padx=(10, 0), pady=0)
        self._start_wookie_refresh_loop()
        self.ibiza_card = IbizaCard(
            rhythm_row,
            on_mode_change=self.on_ibiza_mode_change,
            on_zoom_change=self.on_ibiza_zoom_change,
        )
        self.ibiza_card.grid(row=0, column=2, sticky="nw", padx=(10, 0), pady=0)
        self._start_ibiza_refresh_loop()
        self.xtrem_card = XtremCard(
            rhythm_row,
            on_mode_change=self.on_xtrem_mode_change,
            on_speed_change=self.on_xtrem_speed_change,
            on_bpm_pulse_change=self.on_xtrem_bpm_pulse_change,
        )
        self.xtrem_card.grid(row=0, column=3, sticky="nw", padx=(10, 0), pady=0)
        self._start_xtrem_refresh_loop()

        # Section MOUVEMENTS factorisée : encart + cartes en row=1
        self.movements_section = MovementsSection(control_tab)
        self.movements_section.grid(row=3, column=0, padx=20, pady=(0, 6), sticky="nw")

        self.spot_card = SpotCard(
            self.movements_section,
            on_xy_change=self.on_xy_change,
            get_current_xy=lambda: (self.xy_last_x, self.xy_last_y),
            on_dimmer_change=self.on_spot_dimmer_change,
            on_center=self.on_center_pico,
            on_save_position=self.on_spot_save_position,
            on_recall_position=self.on_spot_recall_position,
            on_streak_toggle=self.on_spot_streak_toggle,
            on_circle_toggle=self.on_spot_circle_toggle,
            on_ellipse_toggle=self.on_spot_ellipse_toggle,
            on_180_toggle=self.on_spot_180_toggle,
            on_amplitude_change=self.on_spot_amplitude_change,
            on_gobo_select=self.on_spot_gobo_select,
            on_gobo_shake=self.on_spot_gobo_shake,
            on_color_select=self.on_spot_color_select,
            on_auto_gobo_toggle=self.on_spot_auto_gobo_toggle,
            on_auto_color_toggle=self.on_spot_auto_color_toggle,
            on_mirror_color_toggle=self.on_spot_mirror_color_toggle,
            on_preset_click=self.on_spot_preset_click,
            on_preset_config=self.on_spot_preset_config,
            on_strobe_change=self.on_spot_strobe_change,
            num_lyres=max(2, len(self.pico)),
        )
        self.spot_card.grid(row=1, column=0, padx=(10, 4), pady=(2, 6), sticky="nw")
        self.xy_pad = self.spot_card.xy_pad
        self.spot_card.update_position_labels(self._spot_position_labels())

        self.dynam_scan_card = DynamScanCard(
            self.movements_section,
            on_xy_change=self.on_dynamo_xy_change,
            get_current_xy=lambda: (self.dynamo_xy_last_x, self.dynamo_xy_last_y),
            on_speed_change=self.on_dynamo_speed_change,
            on_dimmer_change=self.on_dynamo_dimmer_change,
            on_strobe_change=self.on_dynamo_strobe_change,
            on_center=self.on_dynamo_center,
            on_save_position=self.on_dynamo_save_position,
            on_recall_position=self.on_dynamo_recall_position,
            on_streak_toggle=self.on_dynamo_streak_toggle,
            on_circle_toggle=self.on_dynamo_circle_toggle,
            on_ellipse_toggle=self.on_dynamo_ellipse_toggle,
            on_180_toggle=self.on_dynamo_180_toggle,
            on_amplitude_change=self.on_dynamo_amplitude_change,
            on_color_select=self.on_dynamo_color_select,
            on_gobo_select=self.on_dynamo_gobo_select,
            on_auto_color_toggle=self.on_dynamo_auto_color_toggle,
            on_auto_gobo_toggle=self.on_dynamo_auto_gobo_toggle,
        )
        self.dynam_scan_card.grid(row=1, column=1, padx=4, pady=(2, 6), sticky="nw")
        self.dynam_scan_card.update_position_labels(self._dynamo_position_labels())

        # Référence des cartes pour le menu Affichage (clé -> (widget, grid_opts))
        self._card_map: Dict[str, Tuple[Any, Dict[str, Any]]] = {
            "floods": (self.floods_group, {"row": 1, "column": 0, "padx": (10, 4), "pady": (4, 10), "sticky": "nw"}),
            "party": (self.party_group, {"row": 1, "column": 1, "padx": 4, "pady": (4, 10), "sticky": "nw"}),
            "gigabar": (self.gigabar_card, {"row": 1, "column": 2, "padx": (4, 10), "pady": (4, 10), "sticky": "nw"}),
            "wookie": (self.wookie_card, {"row": 0, "column": 1, "padx": (10, 0), "pady": 0, "sticky": "nw"}),
            "ibiza": (self.ibiza_card, {"row": 0, "column": 2, "padx": (10, 0), "pady": 0, "sticky": "nw"}),
            "xtrem": (self.xtrem_card, {"row": 0, "column": 3, "padx": (10, 0), "pady": 0, "sticky": "nw"}),
            "lyres": (self.spot_card, {"row": 1, "column": 0, "padx": (10, 4), "pady": (2, 6), "sticky": "nw"}),
            "dynamo": (self.dynam_scan_card, {"row": 1, "column": 1, "padx": 4, "pady": (2, 6), "sticky": "nw"}),
        }
        self._movements_section_grid = {"row": 3, "column": 0, "padx": 20, "pady": (0, 6), "sticky": "nw"}
        self._card_visibility = self._load_card_visibility()
        self._apply_card_visibility()

        self.master_slider = ctk.CTkSlider(
            control_tab,
            from_=0.0,
            to=1.0,
            orientation="vertical",
            number_of_steps=100,
            command=self.on_master_dimmer_change,
            height=220,
            width=28,
            fg_color="#555555",
            progress_color="#ffd60a",
            button_color="#ffcc00",
            button_hover_color="#ffe066",
        )
        self.master_slider.set(1.0)
        self.master_slider.grid(row=0, column=1, rowspan=4, padx=(0, 20), pady=20, sticky="ns")
        ctk.CTkLabel(control_tab, text="Master\nDimmer").grid(row=2, column=1, pady=(0, 10))

        universe_id = 0
        uni_fixtures = [f for f in self.fixtures if f.universe == universe_id]
        # En-tête onglet Univers DMX (chartre Dark Console + aide)
        uni_header = ctk.CTkFrame(
            universe_tab,
            fg_color=DARK_CONSOLE_BG,
            border_width=1,
            border_color=DARK_CONSOLE_BORDER,
            corner_radius=SECTION_RADIUS,
        )
        uni_header.pack(fill="x", padx=10, pady=(10, 4))
        uni_header.columnconfigure(0, weight=1)
        ctk.CTkLabel(uni_header, text="Univers DMX", font=("", 13, "bold"), anchor="w").grid(
            row=0, column=0, sticky="w", padx=10, pady=6
        )
        ctk.CTkButton(
            uni_header, text="?", width=28, height=28, fg_color="#0ea5e9", hover_color="#38bdf8",
            command=self._open_universe_help,
        ).grid(row=0, column=1, padx=10, pady=6)
        self.universe_view = UniverseView(universe_tab, fixtures=uni_fixtures, universe_id=universe_id)
        self.universe_view.pack(fill="both", expand=True, padx=10, pady=(4, 0))
        info = ctk.CTkFrame(
            universe_tab,
            fg_color=DARK_CONSOLE_SECTION_BG,
            corner_radius=8,
        )
        info.pack(fill="x", expand=False, padx=10, pady=(5, 10))
        ctk.CTkLabel(info, text="Fixtures (même ordre que PATCH & MONTAGE)", anchor="w").grid(
            row=0, column=0, columnspan=5, sticky="w", pady=(5, 2)
        )
        for col, text in enumerate(["Marque", "Modèle", "Univers", "Adresse", "Canaux"]):
            ctk.CTkLabel(info, text=text, anchor="w").grid(row=1, column=col, sticky="w", padx=5)
        self._universe_address_entries: List[ctk.CTkEntry] = []
        for row, fx in enumerate(self.fixtures, start=2):
            ctk.CTkLabel(info, text=fx.manufacturer, anchor="w").grid(row=row, column=0, sticky="w", padx=5)
            ctk.CTkLabel(info, text=fx.model, anchor="w").grid(row=row, column=1, sticky="w", padx=5)
            ctk.CTkLabel(info, text=str(fx.universe), anchor="w").grid(row=row, column=2, sticky="w", padx=5)
            addr_entry = ctk.CTkEntry(info, width=50, height=24)
            addr_entry.insert(0, str(fx.address))
            addr_entry.grid(row=row, column=3, sticky="w", padx=5)
            addr_entry.bind("<Return>", lambda e, f=fx: self._on_universe_address_change(f))
            addr_entry.bind("<FocusOut>", lambda e, f=fx: self._on_universe_address_change(f))
            self._universe_address_entries.append(addr_entry)
            ctk.CTkLabel(info, text=str(fx.channels), anchor="w").grid(row=row, column=4, sticky="w", padx=5)

        # Onglet Vue DMX : en-tête + vue canaux (chartre Dark Console)
        dmx_tab.columnconfigure(0, weight=1)
        dmx_tab.rowconfigure(1, weight=1)
        dmx_header = ctk.CTkFrame(
            dmx_tab,
            fg_color=DARK_CONSOLE_BG,
            border_width=1,
            border_color=DARK_CONSOLE_BORDER,
            corner_radius=SECTION_RADIUS,
        )
        dmx_header.grid(row=0, column=0, sticky="ew", padx=5, pady=(5, 2))
        dmx_header.columnconfigure(0, weight=1)
        ctk.CTkLabel(dmx_header, text="Vue DMX", font=("", 13, "bold"), anchor="w").grid(
            row=0, column=0, sticky="w", padx=10, pady=6
        )
        ctk.CTkButton(
            dmx_header, text="?", width=28, height=28, fg_color="#0ea5e9", hover_color="#38bdf8",
            command=self._open_dmx_help,
        ).grid(row=0, column=1, padx=10, pady=6)
        self.channel_view = ChannelControlView(dmx_tab, driver=self.dmx, fixtures=self.fixtures)
        # La vue DMX occupe toute la zone disponible du tab, le flow interne gère
        # la compacité des blocs sans les étirer.
        self.channel_view.grid(row=1, column=0, sticky="nsew", padx=5, pady=5)
        # Reconstruit la vue DMX avec le flow layout compact de ChannelControlView
        self.update_dmx_view()

        # Onglet PATCH & MONTAGE
        self._build_patch_tab(patch_tab)

    def update_dmx_view(self) -> None:
        """Reconstruit la vue DMX de manière compacte et proportionnelle."""
        if getattr(self, "channel_view", None) is None:
            return
        try:
            self.channel_view.rebuild_layout()
        except Exception:
            # En cas d'erreur inattendue, on ne bloque pas l'application
            pass

    # --- Logic (déléguée aux contrôleurs) -----------------------------------
    def on_blackout(self) -> None:
        self.control_controller.on_blackout()

    def on_laser_safety(self) -> None:
        self.control_controller.on_laser_safety()

    def on_master_dimmer_change(self, value: float) -> None:
        self.control_controller.on_master_dimmer_change(value)

    def on_ambience_color(self, group: str, rgb: Tuple[int, int, int]) -> None:
        self.control_controller.on_ambience_color(group, rgb)

    def on_group_strobe_change(self, group: str, value: float) -> None:
        self.control_controller.on_group_strobe_change(group, value)

    def on_group_dim_change(self, group: str, value: float) -> None:
        self.control_controller.on_group_dim_change(group, value)

    # --- Callbacks Master Ambiance --------------------------------------------
    def on_master_amb_color(self, rgb: Tuple[int, int, int]) -> None:
        self.control_controller.on_master_amb_color(rgb)

    def on_master_amb_dim(self, value: float) -> None:
        self.control_controller.on_master_amb_dim(value)

    def on_master_amb_strobe(self, value: float) -> None:
        self.control_controller.on_master_amb_strobe(value)

    def on_master_preset_apply(self, index: int) -> None:
        self.control_controller.on_master_preset_apply(index)

    def on_master_preset_config(self, index: int) -> None:
        self.control_controller.on_master_preset_config(index)

    def on_master_amb_logic_mode(self, mode_name: str) -> None:
        self.control_controller.on_master_amb_logic_mode(mode_name)

    def on_master_detach_gigabar(self) -> None:
        self.control_controller.on_master_detach_gigabar()

    def _on_link_switch_changed(self) -> None:
        self.control_controller._on_link_switch_changed()

    def _update_master_ambience_layout(self) -> None:
        self.control_controller._update_master_ambience_layout()

    # --- Menu Affichage des cartes --------------------------------------------------
    _CARD_LABELS = {
        "floods": "FLOODS",
        "party": "PARty LED",
        "gigabar": "Gigabar",
        "wookie": "Wookie (laser)",
        "ibiza": "Ibiza (laser)",
        "xtrem": "Xtrem LED",
        "lyres": "Lyres (MOUVEMENTS)",
        "dynamo": "Dynamo Scan",
    }

    def _load_card_visibility(self) -> Dict[str, bool]:
        """Charge les préférences d'affichage des cartes (défaut: toutes visibles)."""
        default = {k: True for k in self._CARD_LABELS}
        path = card_visibility_path()
        if not path.exists():
            return default
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                for k in self._CARD_LABELS:
                    if k in data and isinstance(data[k], bool):
                        default[k] = data[k]
        except Exception:
            pass
        return default

    def _save_card_visibility(self) -> None:
        """Enregistre les préférences d'affichage des cartes."""
        path = card_visibility_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        try:
            path.write_text(json.dumps(self._card_visibility, indent=2), encoding="utf-8")
        except Exception:
            pass

    def _load_spot_position_memory(self) -> List[Optional[Dict[str, Any]]]:
        """Charge les presets P1–P4 (position + couleur, gobo, dimmer, strobe, 180, etc.). Ancien format [x,y] ou [x,y,use_180] → converti en dict."""
        default: List[Optional[Dict[str, Any]]] = [None, None, None, None]
        path = spot_position_memory_path()
        if not path.exists():
            return default
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(data, list) or len(data) < 4:
                return default
            out: List[Optional[Dict[str, Any]]] = []
            for i in range(4):
                item = data[i] if i < len(data) else None
                if item is None:
                    out.append(None)
                elif isinstance(item, dict):
                    x = max(0.0, min(1.0, float(item.get("x", 0.5))))
                    y = max(0.0, min(1.0, float(item.get("y", 0.5))))
                    preset = {
                        "x": x, "y": y,
                        "use_180": bool(item.get("use_180", False)),
                        "color_id": item.get("color_id"),
                        "gobo_id": item.get("gobo_id"),
                        "dimmer": max(0.0, min(1.0, float(item.get("dimmer", 1.0)))),
                        "strobe": max(0.0, min(1.0, float(item.get("strobe", 0.0)))),
                        "mirror_color": bool(item.get("mirror_color", False)),
                        "auto_gobo": bool(item.get("auto_gobo", False)),
                        "auto_color": bool(item.get("auto_color", False)),
                    }
                    out.append(preset)
                elif isinstance(item, list) and len(item) >= 2:
                    x = max(0.0, min(1.0, float(item[0])))
                    y = max(0.0, min(1.0, float(item[1])))
                    use_180 = bool(item[2]) if len(item) >= 3 else False
                    out.append({
                        "x": x, "y": y, "use_180": use_180,
                        "color_id": None, "gobo_id": None, "dimmer": 1.0, "strobe": 0.0,
                        "mirror_color": False, "auto_gobo": False, "auto_color": False,
                    })
                else:
                    out.append(None)
            return out
        except Exception:
            return default

    def _spot_position_labels(self) -> List[Optional[Tuple[float, float, bool]]]:
        """Liste (x, y, use_180) pour les libellés P1–P4 à partir de spot_xy_memory (dict ou ancien tuple)."""
        out: List[Optional[Tuple[float, float, bool]]] = []
        for p in getattr(self, "spot_xy_memory", [None, None, None, None]):
            if p is None:
                out.append(None)
            elif isinstance(p, dict):
                out.append((p["x"], p["y"], p.get("use_180", False)))
            else:
                out.append((p[0], p[1], p[2] if len(p) >= 3 else False))
        return out[:4]

    def _save_spot_position_memory(self) -> None:
        """Enregistre les presets P1–P4 (position + couleur, gobo, dimmer, strobe, etc.)."""
        path = spot_position_memory_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        try:
            data = []
            for p in self.spot_xy_memory:
                if p is None:
                    data.append(None)
                elif isinstance(p, dict):
                    data.append({
                        "x": round(p["x"], 4), "y": round(p["y"], 4),
                        "use_180": bool(p.get("use_180", False)),
                        "color_id": p.get("color_id"),
                        "gobo_id": p.get("gobo_id"),
                        "dimmer": round(float(p.get("dimmer", 1.0)), 4),
                        "strobe": round(float(p.get("strobe", 0.0)), 4),
                        "mirror_color": bool(p.get("mirror_color", False)),
                        "auto_gobo": bool(p.get("auto_gobo", False)),
                        "auto_color": bool(p.get("auto_color", False)),
                    })
                else:
                    data.append([round(p[0], 4), round(p[1], 4), bool(p[2]) if len(p) >= 3 else False])
            while len(data) < 4:
                data.append(None)
            path.write_text(json.dumps(data[:4], indent=2), encoding="utf-8")
        except Exception:
            pass

    def _load_dynamo_position_memory(self) -> List[Optional[Dict[str, Any]]]:
        """Charge les presets P1–P4 Dynamo (position + couleur, gobo, dimmer, strobe, amplitude, 180°, etc.). Ancien format [x,y] → converti en dict."""
        default: List[Optional[Dict[str, Any]]] = [None, None, None, None]
        path = dynamo_position_memory_path()
        if not path.exists():
            return default
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(data, list) or len(data) < 4:
                return default
            out: List[Optional[Dict[str, Any]]] = []
            for i in range(4):
                item = data[i] if i < len(data) else None
                if item is None:
                    out.append(None)
                elif isinstance(item, dict):
                    x = max(0.0, min(1.0, float(item.get("x", 0.5))))
                    y = max(0.0, min(1.0, float(item.get("y", 0.5))))
                    preset = {
                        "x": x, "y": y,
                        "amplitude": max(0.05, min(0.5, float(item.get("amplitude", 0.2)))),
                        "use_180": bool(item.get("use_180", False)),
                        "color_id": item.get("color_id"),
                        "gobo_id": item.get("gobo_id"),
                        "dimmer": max(0.0, min(1.0, float(item.get("dimmer", 1.0)))),
                        "strobe": max(0.0, min(1.0, float(item.get("strobe", 0.0)))),
                        "auto_color": bool(item.get("auto_color", False)),
                        "auto_gobo": bool(item.get("auto_gobo", False)),
                    }
                    out.append(preset)
                elif isinstance(item, list) and len(item) >= 2:
                    x = max(0.0, min(1.0, float(item[0])))
                    y = max(0.0, min(1.0, float(item[1])))
                    out.append({
                        "x": x, "y": y, "amplitude": 0.2, "use_180": False,
                        "color_id": None, "gobo_id": None, "dimmer": 1.0, "strobe": 0.0,
                        "auto_color": False, "auto_gobo": False,
                    })
                else:
                    out.append(None)
            return out
        except Exception:
            return default

    def _dynamo_position_labels(self) -> List[Optional[Tuple[float, float]]]:
        """Liste (x, y) pour les libellés P1–P4 à partir de dynamo_xy_memory (dict ou ancien tuple)."""
        out: List[Optional[Tuple[float, float]]] = []
        for p in getattr(self, "dynamo_xy_memory", [None, None, None, None]):
            if p is None:
                out.append(None)
            elif isinstance(p, dict):
                out.append((p["x"], p["y"]))
            else:
                out.append((p[0], p[1]))
        return out[:4]

    def _save_dynamo_position_memory(self) -> None:
        """Enregistre les presets P1–P4 Dynamo (position + couleur, gobo, dimmer, strobe, amplitude, etc.)."""
        path = dynamo_position_memory_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        try:
            data = []
            for p in self.dynamo_xy_memory:
                if p is None:
                    data.append(None)
                elif isinstance(p, dict):
                    data.append({
                        "x": round(p["x"], 4), "y": round(p["y"], 4),
                        "amplitude": round(float(p.get("amplitude", 0.2)), 4),
                        "use_180": bool(p.get("use_180", False)),
                        "color_id": p.get("color_id"),
                        "gobo_id": p.get("gobo_id"),
                        "dimmer": round(float(p.get("dimmer", 1.0)), 4),
                        "strobe": round(float(p.get("strobe", 0.0)), 4),
                        "auto_color": bool(p.get("auto_color", False)),
                        "auto_gobo": bool(p.get("auto_gobo", False)),
                    })
                else:
                    data.append([round(p[0], 4), round(p[1], 4)])
            while len(data) < 4:
                data.append(None)
            path.write_text(json.dumps(data[:4], indent=2), encoding="utf-8")
        except Exception:
            pass

    def _load_calibrations(self) -> None:
        """Charge les calibrations Lyre et Dynamo depuis calibration.json."""
        path = calibration_path()
        if not path.exists():
            return
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                lyre = data.get("lyre")
                if isinstance(lyre, list) and len(lyre) >= 2:
                    self.lyre_calibration = [dict(item) for item in lyre[:2]]
                dynamo = data.get("dynamo")
                if isinstance(dynamo, list) and len(dynamo) >= 2:
                    self.dynamo_calibration = [dict(item) for item in dynamo[:2]]
        except Exception:
            pass

    def _save_calibrations(self) -> None:
        """Enregistre les calibrations Lyre et Dynamo dans calibration.json."""
        path = calibration_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        try:
            data = {
                "lyre": [dict(getattr(self, "lyre_calibration", [])[i]) for i in range(2)] if len(getattr(self, "lyre_calibration", [])) >= 2 else [],
                "dynamo": [dict(getattr(self, "dynamo_calibration", [])[i]) for i in range(2)] if len(getattr(self, "dynamo_calibration", [])) >= 2 else [],
            }
            path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception:
            pass

    def _apply_card_visibility(self) -> None:
        """Affiche ou masque chaque carte selon _card_visibility."""
        for key, (widget, opts) in getattr(self, "_card_map", {}).items():
            if self._card_visibility.get(key, True):
                widget.grid(**opts)
            else:
                widget.grid_remove()
        # Switches LINK (ambiance) : masquer si la carte associée est masquée
        _link_switches = (
            ("floods", self.link_floods_switch, {"row": 0, "column": 1, "sticky": "e", "pady": (2, 2), "padx": (10, 0)}),
            ("party", self.link_party_switch, {"row": 0, "column": 2, "sticky": "e", "pady": (2, 2), "padx": (8, 0)}),
            ("gigabar", self.link_gigabar_switch, {"row": 0, "column": 3, "sticky": "e", "pady": (2, 2), "padx": (8, 0)}),
        )
        for card_key, switch, grid_opts in _link_switches:
            if self._card_visibility.get(card_key, True):
                switch.grid(**grid_opts)
            else:
                switch.grid_remove()
        # Section MOUVEMENTS : visible si au moins Lyres ou Dynamo est visible
        show_movements = self._card_visibility.get("lyres", True) or self._card_visibility.get("dynamo", True)
        if show_movements:
            self.movements_section.grid(**self._movements_section_grid)
        else:
            self.movements_section.grid_remove()

    def _open_card_visibility_dialog(self) -> None:
        """Ouvre la fenêtre de sélection des cartes à afficher."""
        win = ctk.CTkToplevel(self)
        win.title("Cartes à afficher")
        win.resizable(False, False)
        win.transient(self)
        frame = ctk.CTkFrame(win, fg_color="transparent")
        frame.pack(fill="both", expand=True, padx=16, pady=16)
        vars_map: Dict[str, ctk.BooleanVar] = {}
        for i, (key, label) in enumerate(self._CARD_LABELS.items()):
            var = ctk.BooleanVar(value=self._card_visibility.get(key, True))
            vars_map[key] = var
            cb = ctk.CTkCheckBox(frame, text=label, variable=var, width=220)
            cb.grid(row=i, column=0, sticky="w", pady=2)
            cb.configure(command=self._make_card_toggle(key, vars_map, win))
        ctk.CTkLabel(frame, text="Cochez les cartes à afficher dans l'onglet Contrôle.", font=("", 10)).grid(
            row=len(self._CARD_LABELS), column=0, sticky="w", pady=(12, 0)
        )
        win.geometry("280x320")

    def _make_card_toggle(self, key: str, vars_map: Dict[str, ctk.BooleanVar], win: ctk.CTkToplevel) -> Callable[[], None]:
        def on_toggle() -> None:
            self._card_visibility[key] = bool(vars_map[key].get())
            self._save_card_visibility()
            self._apply_card_visibility()
        return on_toggle

    def _open_reglages_menu(self) -> None:
        """Ouvre un menu (popup) Réglages avec Calibration Lyre et Calibration Dynamo."""
        from ui.dialogs.lyre_calibration_dialog import open_lyre_calibration_dialog
        menu_win = ctk.CTkToplevel(self)
        menu_win.withdraw()
        menu_win.overrideredirect(True)
        menu_win.attributes("-topmost", True)
        f = ctk.CTkFrame(menu_win, fg_color=("gray90", "gray20"), corner_radius=6, border_width=1, border_color="gray40")
        f.pack(fill="both", expand=True, padx=2, pady=2)
        ctk.CTkButton(
            f,
            text="Calibration Lyres (limites Pan/Tilt)",
            width=240,
            height=32,
            fg_color="transparent",
            hover_color=("gray80", "gray30"),
            anchor="w",
            command=lambda: [menu_win.destroy(), open_lyre_calibration_dialog(self)],
        ).pack(fill="x", padx=4, pady=(4, 2))
        btn = ctk.CTkButton(
            f,
            text="Calibration Dynamo",
            width=240,
            height=32,
            fg_color="transparent",
            hover_color=("gray80", "gray30"),
            anchor="w",
            command=lambda: [menu_win.destroy(), self._open_dynamo_calibration_dialog()],
        )
        btn.pack(fill="x", padx=4, pady=(2, 4))
        menu_win.update_idletasks()
        w, h = 248, 76
        try:
            bx = self._reglages_btn.winfo_rootx()
            by = self._reglages_btn.winfo_rooty() + self._reglages_btn.winfo_height() + 2
        except Exception:
            bx, by = 100, 150
        menu_win.geometry(f"{w}x{h}+{bx}+{by}")
        menu_win.minsize(w, h)
        menu_win.deiconify()

        def close_on_click_outside(event=None) -> None:
            if menu_win.winfo_exists():
                menu_win.destroy()

        menu_win.bind("<FocusOut>", close_on_click_outside)
        menu_win.after(100, lambda: menu_win.focus_set())

    def _open_dynamo_calibration_dialog(self) -> None:
        """Ouvre le dialogue Calibration Dynamo (inversion et offset Pan/Tilt par fixture)."""
        open_dynamo_calibration_dialog(self)

    def _open_about_dialog(self) -> None:
        """Ouvre la fenêtre d'information (version, Git)."""
        info = get_full_info()
        win = ctk.CTkToplevel(self)
        win.title("À propos")
        win.resizable(False, False)
        try:
            px = self.winfo_rootx()
            py = self.winfo_rooty()
            pw = self.winfo_width()
            ph = self.winfo_height()
        except Exception:
            px, py, pw, ph = 100, 100, 700, 600
        w, h = 380, 160
        x = px + (pw // 2) - (w // 2)
        y = py + (ph // 2) - (h // 2)
        win.geometry(f"{w}x{h}+{x}+{y}")
        win.transient(self)
        f = ctk.CTkFrame(win, fg_color="transparent")
        f.pack(fill="both", expand=True, padx=24, pady=24)
        ctk.CTkLabel(f, text=info["app_name"], font=("", 20, "bold")).pack(pady=(0, 8))
        # Une seule ligne version (déjà inclut le suffixe Git si présent)
        ctk.CTkLabel(f, text=info["version_display"], font=("", 12), text_color="gray85").pack(pady=(0, 16))
        ctk.CTkButton(win, text="Fermer", width=100, command=win.destroy).pack(pady=(0, 16))

    def _open_control_help(self) -> None:
        """Aide générale de l'onglet Contrôle."""
        win = ctk.CTkToplevel(self)
        win.title("Aide – Onglet Contrôle")
        win.geometry("500x380")
        win.transient(self)
        win.grab_set()
        win.focus_force()
        frame = ctk.CTkScrollableFrame(win)
        frame.pack(fill="both", expand=True, padx=16, pady=16)
        text = (
            "• Master Dimmer : affecte le niveau de sortie de TOUS les appareils\n"
            "  (Ambiance, Lyres, machines à effets). Formule : Sortie = (Local/100)×(Master/100)×255.\n\n"
            "• Blackout : coupe toutes les sorties. Laser Safety : verrouille les lasers.\n\n"
            "• Ambiance : cartes FLOODS, PARty, GIGABAR ; utilise le bouton « Aide Ambiance » dans l’encart.\n\n"
            "• Rythme / Audio : source micro, modes Off/Audio/BPM, BPM manuel.\n\n"
            "• Lyres (MOUVEMENTS) : Joystick Pan/Tilt (16 bits), Dimmer (Ch6) + barre OUT,\n"
            "  SPOT 1/2, Center, STREAK. Mode 11 canaux PicoSpot.\n\n"
            "• Presets : enregistrement et rappel de scènes (REC + slots 1–8)."
        )
        ctk.CTkLabel(frame, text=text, anchor="w", justify="left").pack(fill="x", pady=(0, 8))
        ctk.CTkButton(win, text="Fermer", command=win.destroy).pack(pady=(0, 10))

    def _on_universe_address_change(self, fx: Fixture) -> None:
        """Applique la nouvelle adresse saisie dans l'onglet Univers (1-512) et rafraîchit les vues."""
        try:
            idx = self.fixtures.index(fx)
        except ValueError:
            return
        if not hasattr(self, "_universe_address_entries") or idx >= len(self._universe_address_entries):
            return
        raw = self._universe_address_entries[idx].get().strip()
        if not raw:
            return
        try:
            new_addr = max(1, min(512, int(raw)))
        except ValueError:
            return
        if new_addr == fx.address:
            return
        fx.address = new_addr
        self._universe_address_entries[idx].delete(0, "end")
        self._universe_address_entries[idx].insert(0, str(new_addr))
        if hasattr(self, "universe_view") and self.universe_view is not None and hasattr(self.universe_view, "refresh"):
            self.universe_view.refresh()
        if hasattr(self, "_patch_address_labels") and idx < len(self._patch_address_labels):
            addr_text = str(new_addr)
            if fx.channels > 1:
                addr_text = f"{new_addr} – {new_addr + fx.channels - 1}"
            pl = self._patch_address_labels[idx]
            pl.configure(text=addr_text)
            if new_addr <= 0:
                pl.configure(text_color="#ef4444")
            else:
                pl.configure(text_color=("gray90", "gray10"))
        if hasattr(self, "channel_view") and self.channel_view is not None and hasattr(self.channel_view, "rebuild_layout"):
            try:
                self.channel_view.rebuild_layout()
            except Exception:
                pass
        try:
            from core.address_overrides import save_address_overrides
            save_address_overrides(self.fixtures)
        except Exception:
            pass

    def _open_universe_help(self) -> None:
        """Aide onglet Univers DMX."""
        win = ctk.CTkToplevel(self)
        win.title("Aide – Univers DMX")
        win.geometry("480x280")
        win.transient(self)
        win.grab_set()
        text = (
            "Cet onglet liste les fixtures de l’univers DMX configuré (adresse, canaux).\n\n"
            "Le Master Dimmer de l’onglet Contrôle affecte aussi le niveau de sortie des appareils listés ici."
        )
        ctk.CTkLabel(win, text=text, anchor="w", justify="left").pack(fill="both", expand=True, padx=16, pady=16)
        ctk.CTkButton(win, text="Fermer", command=win.destroy).pack(pady=(0, 10))

    def _open_dmx_help(self) -> None:
        """Aide onglet Vue DMX."""
        win = ctk.CTkToplevel(self)
        win.title("Aide – Vue DMX")
        win.geometry("480x260")
        win.transient(self)
        win.grab_set()
        text = (
            "Vue détaillée des canaux DMX par fixture.\n\n"
            "Vous pouvez ajuster les valeurs manuellement. Le Master Dimmer global (onglet Contrôle) "
            "multiplie les dimmers des appareils concernés."
        )
        ctk.CTkLabel(win, text=text, anchor="w", justify="left").pack(fill="both", expand=True, padx=16, pady=16)
        ctk.CTkButton(win, text="Fermer", command=win.destroy).pack(pady=(0, 10))

    def _open_patch_help(self) -> None:
        """Aide onglet PATCH & MONTAGE."""
        win = ctk.CTkToplevel(self)
        win.title("Aide – PATCH & MONTAGE")
        win.geometry("500x300")
        win.transient(self)
        win.grab_set()
        text = (
            "Table des fixtures : nom, fabricant/modèle, univers, adresse DMX, nombre de canaux.\n\n"
            "• DIP (1–9) : visualisation des bits d’adresse.\n"
            "• Ouvrir manuel : lien vers la doc constructeur si disponible.\n"
            "• TEST : identifie visuellement la fixture (flash)."
        )
        ctk.CTkLabel(win, text=text, anchor="w", justify="left").pack(fill="both", expand=True, padx=16, pady=16)
        ctk.CTkButton(win, text="Fermer", command=win.destroy).pack(pady=(0, 10))

    def _open_ambience_help(self) -> None:
        """Ouvre une fenêtre d'aide globale pour la section Ambiance."""
        win = ctk.CTkToplevel(self)
        win.title("Guide de Contrôle Ambiance")
        win.geometry("560x420")
        win.transient(self)
        win.grab_set()
        win.focus_force()

        frame = ctk.CTkScrollableFrame(win)
        frame.pack(fill="both", expand=True, padx=16, pady=16)

        # Section LINK
        ctk.CTkLabel(frame, text="🔗 LINK", font=("", 16, "bold"), anchor="w").pack(
            fill="x", pady=(0, 4)
        )
        text_link = (
            "Les switchs 🔗 Floods / 🔗 Party / 🔗 Gigabar permettent de lier les appareils.\n"
            "- Quand un groupe est LINKé, les modes logiciels (Pulse, Rainbow, etc.)\n"
            "  et les changements de couleur / intensité sont appliqués simultanément à tous\n"
            "  les appareils cochés.\n"
            "- Un seul clic peut donc changer tout le parc si les trois switchs sont activés.\n\n"
            "L'union fait la force : liez vos projecteurs pour faire apparaître le Panneau Master\n"
            "et transformer votre salle d'un seul geste."
        )
        ctk.CTkLabel(frame, text=text_link, anchor="w", justify="left").pack(fill="x", pady=(0, 8))
        ctk.CTkLabel(frame, text="─" * 60, anchor="w").pack(fill="x", pady=(4, 8))

        # Section MODES
        ctk.CTkLabel(frame, text="💡 MODES LOGICIELS", font=("", 16, "bold"), anchor="w").pack(
            fill="x", pady=(0, 4)
        )
        text_modes = (
            "🎨 Fixe : Reprise en main manuelle via les sliders.\n"
            "🔄 Chase : Effets de type chenillard / poursuite (selon la carte).\n"
            "💓 Pulse : Variation d'intensité (Dimmer) synchronisée sur la musique ou le BPM.\n"
            "🌈 Rainbow : Changement de couleur logiciel, une seule couleur calculée pour\n"
            "             tous les appareils liés afin qu'ils changent en même temps.\n\n"
            "Gigabar (mode interne Canal 2) : 232–255 = Sound / Musical (micro de la barre)."
        )
        ctk.CTkLabel(frame, text=text_modes, anchor="w", justify="left").pack(fill="x", pady=(0, 8))
        ctk.CTkLabel(frame, text="─" * 60, anchor="w").pack(fill="x", pady=(4, 8))

        # Section GIGABAR 8CH
        ctk.CTkLabel(frame, text="🚀 GIGABAR (8CH)", font=("", 16, "bold"), anchor="w").pack(
            fill="x", pady=(0, 4)
        )
        text_giga = (
            "Canal 2 – Modes internes de la Gigabar 8CH :\n"
            "  • 000–007 : Mode Manuel (couleur contrôlée par les sliders RGBW).\n"
            "  • 008–231 : Programmes automatiques internes (Dream, Rainbow, Meteor, Flow, ...).\n"
            "  • 232–255 : Mode Sound / Musical interne (réagit au micro de la barre).\n\n"
            "Important :\n"
            "- Dès que tu choisis un mode interne (Canal 2 ≠ 0) via le menu de la Gigabar,\n"
            "  le LINK de la Gigabar est automatiquement coupé (icône 🔓) pour ne pas que\n"
            "  le code Python écrase l'effet interne.\n"
            "- En mode Manuel (🎨), tu peux réactiver le LINK (🔗) pour que la barre suive\n"
            "  à nouveau les ordres logiciels Ambiance."
        )
        ctk.CTkLabel(frame, text=text_giga, anchor="w", justify="left").pack(fill="x", pady=(0, 12))

        ctk.CTkButton(win, text="Fermer", command=win.destroy).pack(pady=(0, 10))

    def _update_group_vu_meters(self) -> None:
        self.control_controller._update_group_vu_meters()

    def _get_selected_audio_input_index(self) -> Optional[int]:
        return self.rhythm_controller._get_selected_audio_input_index()

    def on_manual_bpm_slider_change(self, value: float) -> None:
        self.rhythm_controller.on_manual_bpm_slider_change(value)

    def on_audio_input_change(self, _choice: str) -> None:
        self.rhythm_controller.on_audio_input_change(_choice)

    def _update_audio_visuals(self) -> None:
        self.rhythm_controller.update_audio_visuals()

    # --- Presets / UI helpers -------------------------------------------------
    def apply_preset(self, slot_id: int) -> None:
        self.presets_controller.apply_preset(slot_id)

    def on_fade_time_change(self, value: float) -> None:
        self.presets_controller.on_fade_time_change(value)

    def update_group_ui(self) -> None:
        """
        Recalcule les valeurs de groupe (0‑1) à partir des DMX actuels,
        puis met à jour sliders et vumètres en appliquant group * master.
        """
        master = max(0.0, min(1.0, self.master_dimmer_factor))

        # FLOODS : moyenne des canaux d'intensité
        if self.floods and self.floods_group is not None:
            vals = [
                self.dmx.get_channel(fx.address + fx.CHANNEL_INTENSITY - 1)
                for fx in self.floods
            ]
            avg = sum(vals) / len(vals) if vals else 0.0
            gv = max(0.0, min(1.0, avg / 255.0))
            self.floods_group_value = gv
            self.floods_group.set_values(gv)
            self.floods_group.update_dmx(master)

        # PARTY : moyenne des canaux dimmer des PARty
        if self.party and self.party_group is not None:
            vals = []
            for fx in self.party:
                if fx.dimmer_channel is not None:
                    addr = fx.address + fx.dimmer_channel - 1
                    vals.append(self.dmx.get_channel(addr))
            avg = sum(vals) / len(vals) if vals else 0.0
            gv = max(0.0, min(1.0, avg / 255.0))
            self.party_group_value = gv
            self.party_group.set_values(gv)
            self.party_group.update_dmx(master)

        # Met aussi à jour via la logique standard
        self._update_group_vu_meters()

    def sync_ui_to_dmx(self) -> None:
        """
        Lit l'état courant du buffer DMX et aligne les éléments visuels :
        - sliders / vumètres de groupes,
        - boutons de couleur FLOODS / PARTY,
        - position du pad XY des PicoSpots,
        - sliders de la vue DMX (y compris Gigabar),
        - couleur de base de la Gigabar.
        """
        master = max(0.0, min(1.0, self.master_dimmer_factor))

        # FLOODS : moyenne des intensités + synchronisation du widget avec le premier projecteur
        if self.floods and self.floods_group is not None:
            vals = [
                self.dmx.get_channel(fx.address + fx.CHANNEL_INTENSITY - 1)
                for fx in self.floods
            ]
            avg = sum(vals) / len(vals) if vals else 0.0
            gv = max(0.0, min(1.0, avg / 255.0))
            fx0 = self.floods[0]
            r = self.dmx.get_channel(fx0.address + fx0.CHANNEL_RED - 1)
            g = self.dmx.get_channel(fx0.address + fx0.CHANNEL_GREEN - 1)
            b = self.dmx.get_channel(fx0.address + fx0.CHANNEL_BLUE - 1)
            dimmer = self.dmx.get_channel(fx0.address + fx0.CHANNEL_INTENSITY - 1)
            self.floods_group.sync_with_fixture(r, g, b, dimmer)

            self.floods_group_value = gv
            self.floods_group.update_dmx(master)

        # PARTY : moyenne des dimmers + synchronisation du widget avec le premier PARty
        if self.party and self.party_group is not None:
            vals = []
            for fx in self.party:
                if fx.dimmer_channel is not None:
                    addr = fx.address + fx.dimmer_channel - 1
                    vals.append(self.dmx.get_channel(addr))
            avg = sum(vals) / len(vals) if vals else 0.0
            gv = max(0.0, min(1.0, avg / 255.0))
            fx0 = self.party[0]
            r = self.dmx.get_channel(fx0.address + fx0.red_channel - 1)
            g = self.dmx.get_channel(fx0.address + fx0.green_channel - 1)
            b = self.dmx.get_channel(fx0.address + fx0.blue_channel - 1)
            dimmer = 0
            if fx0.dimmer_channel is not None:
                dimmer = self.dmx.get_channel(fx0.address + fx0.dimmer_channel - 1)
            self.party_group.sync_with_fixture(r, g, b, dimmer)

            self.party_group_value = gv
            self.party_group.update_dmx(master)

        # Position XY des PicoSpots : on prend le premier comme référence
        if hasattr(self, "xy_pad") and self.pico:
            fx = self.pico[0]
            pan = self.dmx.get_channel(fx.address + fx.pan_channel - 1)
            tilt = self.dmx.get_channel(fx.address + fx.tilt_channel - 1)
            nx = max(0.0, min(1.0, pan / 255.0))
            ny = max(0.0, min(1.0, 1.0 - (tilt / 255.0)))
            try:
                self.xy_pad.set_normalized(nx, ny)
            except Exception:
                pass

        # Gigabar : synchronise couleur (5ch = R,G,B,Dimmer,Strobe ; 8ch = Dimmer,Mode,Speed,Strobe,R,G,B,W)
        if self.gigabars:
            fx = self.gigabars[0]
            if isinstance(fx, Gigabar5ChFixture):
                base_r = self.dmx.get_channel(fx.address)      # Ch1 R
                base_g = self.dmx.get_channel(fx.address + 1) # Ch2 G
                base_b = self.dmx.get_channel(fx.address + 2) # Ch3 B
                self.gigabar_base_color = (base_r, base_g, base_b)
                if self.gigabar_card is not None:
                    self.gigabar_card.set_base_color(base_r, base_g, base_b)
                    self.gigabar_card.set_dimmer_value(self.dmx.get_channel(fx.address + 3))
                    self.gigabar_card.set_strobe_value(self.dmx.get_channel(fx.address + 4))
            elif isinstance(fx, GigabarFixture8Ch):
                base_r = self.dmx.get_channel(fx.address + 4)  # Ch5 R
                base_g = self.dmx.get_channel(fx.address + 5)  # Ch6 G
                base_b = self.dmx.get_channel(fx.address + 6)  # Ch7 B
                self.gigabar_base_color = (base_r, base_g, base_b)
                if self.gigabar_card is not None:
                    self.gigabar_card.set_base_color(base_r, base_g, base_b)
                    self.gigabar_card.set_dimmer_value(self.dmx.get_channel(fx.address))
                    self.gigabar_card.set_strobe_value(self.dmx.get_channel(fx.address + 3))
                    self.gigabar_card.set_mode_value(self.dmx.get_channel(fx.address + 1))
            else:
                base_r = self.dmx.get_channel(fx.address)
                base_g = self.dmx.get_channel(fx.address + 1) if fx.channels >= 2 else 0
                base_b = self.dmx.get_channel(fx.address + 2) if fx.channels >= 3 else 0
                self.gigabar_base_color = (base_r, base_g, base_b)
                if self.gigabar_card is not None:
                    self.gigabar_card.set_base_color(base_r, base_g, base_b)

        # Vue DMX : rafraîchit tous les sliders (y compris Gigabar)
        if hasattr(self, "channel_view") and self.channel_view is not None:
            try:
                self.channel_view.sync_from_dmx()
            except Exception:
                pass

    def _get_ambiance_fixtures(self) -> List[Fixture]:
        """Liste des fixtures ambiances (FLOODS, Party, Gigabar) pour les presets dédiés."""
        return list(self.floods or []) + list(self.party or []) + list(self.gigabars or [])

    def _get_ambiance_ui(self) -> Dict[str, Any]:
        """Capture l'état des cartes ambiances (dimmer, strobe, couleur, U1–U4, Gigabar user colors/mode)."""
        out: Dict[str, Any] = {}
        if self.floods_group is not None:
            out["floods"] = {
                "dimmer": max(0.0, min(1.0, float(self.floods_group.slider.get()))),
                "strobe": max(0.0, min(1.0, float(self.floods_group.strobe_slider.get()))) if self.floods_group.strobe_slider else 0.0,
                "rgb": getattr(self.floods_group, "current_rgb", (0, 0, 0)),
                "user_presets": list(getattr(self.floods_group, "user_presets", [None, None, None, None])),
            }
        if self.party_group is not None:
            out["party"] = {
                "dimmer": max(0.0, min(1.0, float(self.party_group.slider.get()))),
                "strobe": max(0.0, min(1.0, float(self.party_group.strobe_slider.get()))) if self.party_group.strobe_slider else 0.0,
                "rgb": getattr(self.party_group, "current_rgb", (0, 0, 0)),
                "user_presets": list(getattr(self.party_group, "user_presets", [None, None, None, None])),
            }
        if self.gigabar_card is not None:
            gb: Dict[str, Any] = {
                "dimmer": int(self.gigabar_card.dimmer_slider.get()) if hasattr(self.gigabar_card, "dimmer_slider") else 255,
                "strobe": int(self.gigabar_card.strobe_slider.get()) if hasattr(self.gigabar_card, "strobe_slider") else 0,
                "base_color": getattr(self, "gigabar_base_color", (255, 255, 255)),
                "user_colors": list(getattr(self, "gigabar_user_colors", [None, None, None, None])),
            }
            if self.gigabars and len(self.gigabars) > 0 and isinstance(self.gigabars[0], GigabarFixture8Ch):
                try:
                    gb["mode_8ch"] = self.dmx.get_channel(self.gigabars[0].address + 1)
                except Exception:
                    gb["mode_8ch"] = 0
            out["gigabar"] = gb
        return out

    def _restore_ambiance_ui(self, ambiance_ui: Dict[str, Any]) -> None:
        """Restaure l'état des cartes ambiances depuis un snapshot (dimmer, strobe, couleur, U1–U4)."""
        from ui.widgets.dmx_controls import update_button_style
        master = max(0.0, min(1.0, self.master_dimmer_factor))
        if self.floods_group is not None and "floods" in ambiance_ui:
            f = ambiance_ui["floods"]
            self.floods_group.slider.set(max(0.0, min(1.0, float(f.get("dimmer", 1.0)))))
            if self.floods_group.strobe_slider is not None:
                self.floods_group.strobe_slider.set(max(0.0, min(1.0, float(f.get("strobe", 0.0)))))
            r, g, b = f.get("rgb", (0, 0, 0))
            self.floods_group.sync_with_fixture(int(r), int(g), int(b), int(max(0, min(255, float(f.get("dimmer", 1.0)) * 255))))
            ups = f.get("user_presets") or [None, None, None, None]
            self.floods_group.user_presets = [tuple(p) if p is not None else None for p in ups[:4]]
            for i, prgb in enumerate(self.floods_group.user_presets):
                if i < len(self.floods_group.user_preset_buttons) and prgb is not None:
                    btn = self.floods_group.user_preset_buttons[i]
                    hex_c = "#{:02x}{:02x}{:02x}".format(*prgb)
                    btn._base_color = hex_c  # type: ignore[attr-defined]
                    update_button_style(btn, hex_c, active=(getattr(self.floods_group, "active_user_preset", None) == i))
            self.floods_group_value = float(f.get("dimmer", 1.0))
            self.floods_group.update_dmx(master)
            self.on_group_dim_change("FLOODS", self.floods_group_value)
            self.on_group_strobe_change("FLOODS", float(f.get("strobe", 0.0)))
            self.on_ambience_color("FLOODS", (int(r), int(g), int(b)))
        if self.party_group is not None and "party" in ambiance_ui:
            p = ambiance_ui["party"]
            self.party_group.slider.set(max(0.0, min(1.0, float(p.get("dimmer", 1.0)))))
            if self.party_group.strobe_slider is not None:
                self.party_group.strobe_slider.set(max(0.0, min(1.0, float(p.get("strobe", 0.0)))))
            r, g, b = p.get("rgb", (0, 0, 0))
            self.party_group.sync_with_fixture(int(r), int(g), int(b), int(max(0, min(255, float(p.get("dimmer", 1.0)) * 255))))
            ups = p.get("user_presets") or [None, None, None, None]
            self.party_group.user_presets = [tuple(x) if x is not None else None for x in ups[:4]]
            for i, prgb in enumerate(self.party_group.user_presets):
                if i < len(self.party_group.user_preset_buttons) and prgb is not None:
                    btn = self.party_group.user_preset_buttons[i]
                    hex_c = "#{:02x}{:02x}{:02x}".format(*prgb)
                    btn._base_color = hex_c  # type: ignore[attr-defined]
                    update_button_style(btn, hex_c, active=(getattr(self.party_group, "active_user_preset", None) == i))
            self.party_group_value = float(p.get("dimmer", 1.0))
            self.party_group.update_dmx(master)
            self.on_group_dim_change("PARTY", self.party_group_value)
            self.on_group_strobe_change("PARTY", float(p.get("strobe", 0.0)))
            self.on_ambience_color("PARTY", (int(r), int(g), int(b)))
        if self.gigabar_card is not None and "gigabar" in ambiance_ui:
            g = ambiance_ui["gigabar"]
            self.gigabar_base_color = tuple(g.get("base_color", (255, 255, 255))[:3])
            self.gigabar_card.set_base_color(*self.gigabar_base_color)
            self.gigabar_card.set_dimmer_value(int(g.get("dimmer", 255)))
            self.gigabar_card.set_strobe_value(int(g.get("strobe", 0)))
            ucs = g.get("user_colors") or [None, None, None, None]
            self.gigabar_user_colors = [tuple(c) if c is not None else None for c in ucs[:4]]
            for i, crgb in enumerate(self.gigabar_user_colors):
                if crgb is not None:
                    self.gigabar_card.update_user_button(i, *crgb)
            if "mode_8ch" in g and self.gigabars and isinstance(self.gigabars[0], GigabarFixture8Ch):
                try:
                    self.gigabar_card.set_mode_value(int(g["mode_8ch"]))
                except Exception:
                    pass
            self.control_controller.on_gigabar_dimmer_change(int(self.gigabar_card.dimmer_slider.get()))
            self.control_controller.on_gigabar_strobe_change(int(self.gigabar_card.strobe_slider.get()))
            self.control_controller.on_gigabar_preset_color(self.gigabar_base_color)

    def _capture_fin_de_morceau(self) -> Dict[str, Any]:
        """Capture l'état actuel de toutes les cartes (ambiance, master, lyres, dynamo, rythme) pour Fin de morceau."""
        ambiance = self._get_ambiance_ui()
        # Rendre JSON-serializable (tuples → listes)
        def to_serializable(obj: Any) -> Any:
            if isinstance(obj, dict):
                return {k: to_serializable(v) for k, v in obj.items()}
            if isinstance(obj, (list, tuple)):
                return [to_serializable(x) for x in obj]
            if isinstance(obj, tuple):
                return list(obj)
            return obj
        ambiance = to_serializable(ambiance)
        state = {
            "ambiance_ui": ambiance,
            "master_dimmer": max(0.0, min(1.0, self.master_dimmer_factor)),
            "blackout": bool(self.blackout_active),
            "lyre": {
                "x": getattr(self, "xy_last_x", 0.5),
                "y": getattr(self, "xy_last_y", 0.5),
                "amplitude": getattr(self, "_auto_motion_amplitude", 0.2),
                "use_180": bool(getattr(self, "spot_180_running", False)),
            },
            "dynamo": {
                "x": getattr(self, "dynamo_xy_last_x", 0.5),
                "y": getattr(self, "dynamo_xy_last_y", 0.5),
                "amplitude": getattr(self, "_dynamo_amplitude", 0.2),
                "use_180": bool(getattr(self, "dynamo_180_running", False)),
            },
            "rythme": {
                "wookie_mode": getattr(self, "wookie_mode", "off"),
                "ibiza_mode": getattr(self, "ibiza_mode", "off"),
                "ibiza_zoom": getattr(self, "ibiza_zoom", 0.5),
                "xtrem_mode": getattr(self, "xtrem_mode", "stop"),
                "xtrem_speed": getattr(self, "xtrem_speed", 0.5),
                "xtrem_bpm_pulse": bool(getattr(self, "xtrem_bpm_pulse", False)),
            },
            "active_preset_slot": self.active_preset_slot,
        }
        return state

    def _apply_fin_de_morceau(self, state: Dict[str, Any]) -> None:
        """Restaure l'état de toutes les cartes depuis un snapshot Fin de morceau."""
        if not state:
            return
        # Blackout : d'abord désactiver si on rappelle un état non blackout
        was_blackout = state.get("blackout", False)
        if self.blackout_active and not was_blackout:
            self.on_blackout()
        self.master_dimmer_factor = max(0.0, min(1.0, float(state.get("master_dimmer", 1.0))))
        if hasattr(self, "master_slider") and self.master_slider is not None:
            self.master_slider.set(self.master_dimmer_factor)
        self.control_controller.on_master_dimmer_change(self.master_dimmer_factor)
        if "ambiance_ui" in state:
            self._restore_ambiance_ui(state["ambiance_ui"])
        self.control_controller._reapply_ambiance_from_ui()
        # Lyres : arrêter auto, position + amplitude + 180°
        lyre = state.get("lyre") or {}
        self.spot_streak_running = False
        self.spot_circle_running = False
        self.spot_ellipse_running = False
        self.spot_controller._update_streak_circle_buttons()
        nx = max(0.0, min(1.0, float(lyre.get("x", 0.5))))
        ny = max(0.0, min(1.0, float(lyre.get("y", 0.5))))
        self.xy_last_x, self.xy_last_y = nx, ny
        self._auto_motion_amplitude = max(0.05, min(0.5, float(lyre.get("amplitude", 0.2))))
        self._motion_manager.set_center(nx, ny)
        self._motion_manager.set_amplitude(self._auto_motion_amplitude)
        try:
            self.xy_pad.set_normalized(nx, ny)
        except Exception:
            pass
        if self.spot_card is not None and hasattr(self.spot_card, "amplitude_slider"):
            from ui.components.spot_card import _slider_from_amplitude
            self.spot_card.amplitude_slider.set(_slider_from_amplitude(self._auto_motion_amplitude))
        self.spot_180_running = bool(lyre.get("use_180", False))
        self.spot_controller.on_xy_change(nx, ny)
        self.spot_controller._update_streak_circle_buttons()
        # Dynamo : idem
        dynamo = state.get("dynamo") or {}
        self.dynamo_streak_running = False
        self.dynamo_circle_running = False
        self.dynamo_ellipse_running = False
        self.spot_controller._stop_dynamo_motion_thread()
        self.spot_controller._update_streak_circle_buttons()
        dx = max(0.0, min(1.0, float(dynamo.get("x", 0.5))))
        dy = max(0.0, min(1.0, float(dynamo.get("y", 0.5))))
        self.dynamo_xy_last_x, self.dynamo_xy_last_y = dx, dy
        self._dynamo_amplitude = max(0.05, min(0.5, float(dynamo.get("amplitude", 0.2))))
        try:
            self.dynam_scan_card.xy_pad.set_normalized(dx, dy)
            from ui.components.dynam_scan_card import _slider_from_amplitude as _dynamo_slider_from_amplitude
            self.dynam_scan_card.amplitude_slider.set(_dynamo_slider_from_amplitude(self._dynamo_amplitude))
        except Exception:
            pass
        self.dynamo_180_running = bool(dynamo.get("use_180", False))
        self.spot_controller.on_dynamo_xy_change(dx, dy)
        self.spot_controller._update_streak_circle_buttons()
        # Rythme (Wookie, Ibiza, Xtrem)
        rythme = state.get("rythme") or {}
        self.wookie_mode = str(rythme.get("wookie_mode", "off"))
        self.ibiza_mode = str(rythme.get("ibiza_mode", "off"))
        self.ibiza_zoom = max(0.0, min(1.0, float(rythme.get("ibiza_zoom", 0.5))))
        self.xtrem_mode = str(rythme.get("xtrem_mode", "stop"))
        self.xtrem_speed = max(0.0, min(1.0, float(rythme.get("xtrem_speed", 0.5))))
        self.xtrem_bpm_pulse = bool(rythme.get("xtrem_bpm_pulse", False))
        self.spot_controller.on_wookie_mode_change(self.wookie_mode)
        self.spot_controller.on_ibiza_mode_change(self.ibiza_mode)
        self.spot_controller.on_ibiza_zoom_change(self.ibiza_zoom)
        self.spot_controller.on_xtrem_mode_change(self.xtrem_mode)
        self.spot_controller.on_xtrem_speed_change(self.xtrem_speed)
        if getattr(self, "wookie_card", None) is not None:
            self.wookie_card.set_mode(self.wookie_mode)
        if getattr(self, "ibiza_card", None) is not None:
            self.ibiza_card.set_mode(self.ibiza_mode)
            self.ibiza_card.set_zoom_value(self.ibiza_zoom)
        if getattr(self, "xtrem_card", None) is not None:
            self.xtrem_card.set_mode(self.xtrem_mode)
            self.xtrem_card.set_speed_value(self.xtrem_speed)
            self.xtrem_card.set_bpm_pulse(self.xtrem_bpm_pulse)
        # Preset actif
        slot = state.get("active_preset_slot")
        if isinstance(slot, int) and 1 <= slot <= 8:
            self.presets_controller.on_preset_recall(slot)
        # Blackout si l'état enregistré était blackout
        if was_blackout and not self.blackout_active:
            self.on_blackout()
        try:
            self.dmx.send()
        except Exception:
            pass

    def _load_fin_de_morceau(self) -> None:
        """Charge l'état Fin de morceau depuis le fichier (au démarrage)."""
        path = fin_de_morceau_path()
        if not path.exists():
            return
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                self._fin_de_morceau_state = data
        except Exception:
            pass

    def _save_fin_de_morceau(self) -> None:
        """Enregistre l'état Fin de morceau dans le fichier."""
        if not self._fin_de_morceau_state:
            return
        path = fin_de_morceau_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        try:
            path.write_text(json.dumps(self._fin_de_morceau_state, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception:
            pass

    def on_save_fin_de_morceau(self) -> None:
        """Enregistre l'état actuel de toutes les cartes comme Fin de morceau (bouton REC FD)."""
        self._fin_de_morceau_state = self._capture_fin_de_morceau()
        self._save_fin_de_morceau()
        messagebox.showinfo("Fin de morceau", "État actuel enregistré (REC FD). Utilisez « FD Morceau » pour le rappeler.", parent=self)

    def on_recall_fin_de_morceau(self) -> None:
        """Rappelle l'état Fin de morceau enregistré (bouton FD Morceau)."""
        if not self._fin_de_morceau_state:
            self._load_fin_de_morceau()
        if not self._fin_de_morceau_state:
            messagebox.showwarning("Fin de morceau", "Aucun état enregistré. Utilisez « REC FD » pour enregistrer l'état actuel.", parent=self)
            return
        self._apply_fin_de_morceau(self._fin_de_morceau_state)

    def _refresh_preset_button_labels(self) -> None:
        self.presets_controller._refresh_preset_button_labels()

    def _update_active_preset_label(self) -> None:
        self.presets_controller._update_active_preset_label()

    def _update_dmx_status_label(self, show_popup: bool = False) -> None:
        """Met à jour l'indicateur visuel de connexion DMX."""
        if not hasattr(self, "dmx_status_label") or self.dmx is None:
            return
        connected = False
        try:
            connected = self.dmx.is_connected()
        except Exception:
            connected = False

        if connected:
            self.dmx_status_label.configure(text="DMX : CONNECTÉ", text_color="#22c55e")
        else:
            self.dmx_status_label.configure(text="DMX : DÉCONNECTÉ", text_color="#ef4444")
            if show_popup:
                messagebox.showerror(
                    "Interface DMX non détectée",
                    "Interface DMX non détectée. Vérifiez le branchement USB.",
                    parent=self,
                )

    def _poll_dmx_status(self) -> None:
        """Vérifie périodiquement l'état de la connexion DMX."""
        self._update_dmx_status_label(show_popup=False)
        # Replanifie le prochain check
        try:
            self.after(2000, self._poll_dmx_status)
        except Exception:
            pass

    def _refresh_preset_button_styles(self) -> None:
        self.presets_controller._refresh_preset_button_styles()

    def on_preset_rename(self, slot_id: int) -> None:
        self.presets_controller.on_preset_rename(slot_id)

    def on_xy_change(self, nx: float, ny: float) -> None:
        self.spot_controller.on_xy_change(nx, ny)

    def on_center_pico(self) -> None:
        self.spot_controller.on_center_pico()

    def on_spot_save_position(self, index: int) -> None:
        """Enregistre le preset complet (position, 180°, couleur, gobo, dimmer, strobe, etc.) dans le slot P1–P4 (clic droit)."""
        if 0 <= index < 4 and getattr(self, "spot_card", None) is not None:
            card = self.spot_card
            dimmer = max(0.0, min(1.0, float(card.dimmer_slider.get())))
            strobe = max(0.0, min(1.0, float(card.strobe_slider.get())))
            color_id = getattr(card, "_active_color_key", None)
            gobo_id = getattr(card, "_active_gobo_key", None)
            self.spot_xy_memory[index] = {
                "x": self.xy_last_x, "y": self.xy_last_y, "use_180": self.spot_180_running,
                "color_id": color_id, "gobo_id": gobo_id, "dimmer": dimmer, "strobe": strobe,
                "mirror_color": self.spot_mirror_color, "auto_gobo": self.spot_auto_gobo_sync, "auto_color": self.spot_auto_color_sync,
            }
            self.spot_card.update_position_labels(self._spot_position_labels())
            self._save_spot_position_memory()

    def on_spot_recall_position(self, index: int) -> None:
        """Rappelle la position mémorisée (clic gauche)."""
        self.spot_controller.on_spot_recall_position(index)

    def on_spot_amplitude_change(self, value: float) -> None:
        """Taille du 8 et du cercle (amplitude 0.05–0.5). Met à jour le motion manager si un mouvement est en cours."""
        self._auto_motion_amplitude = max(0.05, min(0.5, float(value)))
        self._motion_manager.set_amplitude(self._auto_motion_amplitude)

    def get_lyre_calibration(self, index: int) -> dict:
        """Retourne la calibration Pad XY pour la lyre à l’index donné."""
        cal = getattr(self, "lyre_calibration", [])
        while len(cal) <= index:
            cal.append({"invert_pan": False, "invert_tilt": False, "swap_axes": False, "pan_min": 0.0, "pan_max": 1.0, "tilt_min": 0.0, "tilt_max": 1.0})
            self.lyre_calibration = cal
        return dict(cal[index])

    def set_lyre_calibration(self, index: int, calib: dict) -> None:
        """Met à jour la calibration Pad XY pour la lyre à l’index donné."""
        cal = getattr(self, "lyre_calibration", [])
        while len(cal) <= index:
            cal.append({"invert_pan": False, "invert_tilt": False, "swap_axes": False, "pan_min": 0.0, "pan_max": 1.0, "tilt_min": 0.0, "tilt_max": 1.0})
            self.lyre_calibration = cal
        cal[index] = dict(calib)
        self._save_calibrations()

    def get_dynamo_calibration(self, index: int) -> dict:
        """Retourne la calibration (inversion pan/tilt) pour le Dynamo à l'index donné."""
        cal = getattr(self, "dynamo_calibration", [])
        while len(cal) <= index:
            cal.append({"invert_pan": False, "invert_tilt": False, "offset_pan": 0.0, "offset_tilt": 0.0})
            self.dynamo_calibration = cal
        return dict(cal[index])

    def set_dynamo_calibration(self, index: int, calib: dict) -> None:
        """Met à jour la calibration (inversion + offset pan/tilt) pour le Dynamo à l'index donné."""
        cal = getattr(self, "dynamo_calibration", [])
        while len(cal) <= index:
            cal.append({"invert_pan": False, "invert_tilt": False, "offset_pan": 0.0, "offset_tilt": 0.0})
            self.dynamo_calibration = cal
        cal[index] = dict(calib)
        self._save_calibrations()

    def on_spot_dimmer_change(self, value: float) -> None:
        self.spot_controller.on_spot_dimmer_change(value)

    def on_spot_strobe_change(self, value: float) -> None:
        self.spot_controller.on_spot_strobe_change(value)

    # --- Gobos / Couleurs (délégués au spot_controller) ----------------------

    def on_spot_gobo_select(self, gobo_id: str) -> None:
        self.spot_controller.on_spot_gobo_select(gobo_id)

    def on_spot_gobo_shake(self) -> None:
        self.spot_controller.on_spot_gobo_shake()

    def on_spot_color_select(self, color_id: str) -> None:
        self.spot_controller.on_spot_color_select(color_id)

    def on_spot_preset_click(self, index: int) -> None:
        self.spot_controller.on_spot_preset_click(index)

    def on_spot_preset_config(self, index: int) -> None:
        self.spot_controller.on_spot_preset_config(index)

    def on_spot_auto_gobo_toggle(self, enabled: bool) -> None:
        self.spot_controller.on_spot_auto_gobo_toggle(enabled)

    def on_spot_auto_color_toggle(self, enabled: bool) -> None:
        self.spot_controller.on_spot_auto_color_toggle(enabled)

    def on_spot_mirror_color_toggle(self, enabled: bool) -> None:
        self.spot_controller.on_spot_mirror_color_toggle(enabled)

    @property
    def dynamo_active(self) -> bool:
        """True si un mode automatique Dynamo (8 / Circle / Ellipse) est actif — le pad ne doit pas envoyer DMX."""
        return (
            self.dynamo_streak_running
            or self.dynamo_circle_running
            or getattr(self, "dynamo_ellipse_running", False)
        )

    def update_all_motions(self) -> None:
        """Boucle centralisée : met à jour tous les mouvements (Lyres, Scans, Wookie)."""
        self.spot_controller.update_auto_motion()

    def _update_auto_motion(self) -> None:
        # Alias historique conservé pour compatibilité (cf. config_report).
        self.update_all_motions()

    def on_spot_streak_start(self) -> None:
        self.spot_controller.on_spot_streak_start()

    def on_spot_streak_toggle(self) -> None:
        self.spot_controller.on_spot_streak_toggle()

    def on_spot_streak_stop(self) -> None:
        self.spot_controller.on_spot_streak_stop()

    def on_spot_circle_start(self) -> None:
        self.spot_controller.on_spot_circle_start()

    def on_spot_circle_toggle(self) -> None:
        self.spot_controller.on_spot_circle_toggle()

    def on_spot_ellipse_toggle(self) -> None:
        self.spot_controller.on_spot_ellipse_toggle()

    def on_spot_180_toggle(self) -> None:
        self.spot_controller.on_spot_180_toggle()

    def on_spot_circle_stop(self) -> None:
        self.spot_controller.on_spot_circle_stop()

    # --- Wookie 200 R (OFF / AUTO / SOUND + Vitesse Ch6, flux 30 Hz) ---------

    def _start_wookie_refresh_loop(self) -> None:
        """Envoi continu Ch1 et Ch6 à 30 Hz pour éviter la veille du laser."""
        self._wookie_refresh_tick()

    def _wookie_refresh_tick(self) -> None:
        from ui.components.wookie_card import MODE_OFF, MODE_AUTO, MODE_SOUND, MODE_DMX
        wookie = getattr(self, "wookie", [])
        if wookie:
            mode_to_ch1 = {"off": MODE_OFF, "auto": MODE_AUTO, "sound": MODE_SOUND, "dmx": MODE_DMX, "show": MODE_DMX}
            ch1 = mode_to_ch1.get(self.wookie_mode, MODE_OFF)
            speed8 = max(0, min(255, int(round(self.wookie_speed * 255.0))))
            # En mode DMX (192-255), CH2 = motif : 0 pour DMX, 64 pour SHOW (32 motifs)
            pattern = 64 if self.wookie_mode == "show" else 0 if self.wookie_mode == "dmx" else None
            for fx in wookie:
                try:
                    fx.set_mode_raw(ch1)
                    fx.set_intensity(0 if self.wookie_mode == "off" else 255)
                    if pattern is not None:
                        fx.set_pattern_raw(pattern)
                    fx.set_speed(speed8)
                except Exception:
                    pass
        self._wookie_refresh_after_id = self.after(34, self._wookie_refresh_tick)

    def on_wookie_mode_change(self, mode: str) -> None:
        self.wookie_mode = mode
        self.spot_controller.on_wookie_mode_change(mode)

    def on_wookie_speed_change(self, value: float) -> None:
        self.wookie_speed = max(0.0, min(1.0, float(value)))
        self.spot_controller.on_wookie_speed_change(self.wookie_speed)

    # --- Ibiza LAS-30G (OFF / AUTO / SOUND + Zoom Ch5, Master 0 → Ch1=0) -------

    def _start_ibiza_refresh_loop(self) -> None:
        self._ibiza_refresh_tick()

    def _ibiza_refresh_tick(self) -> None:
        from ui.components.ibiza_card import IBIZA_MODE_OFF, IBIZA_MODE_AUTO, IBIZA_MODE_SOUND
        ibiza = getattr(self, "ibiza", [])
        if ibiza:
            ch1 = IBIZA_MODE_OFF if self.ibiza_mode == "off" else (IBIZA_MODE_AUTO if self.ibiza_mode == "auto" else IBIZA_MODE_SOUND)
            zoom8 = max(0, min(255, int(round(self.ibiza_zoom * 255.0))))
            for fx in ibiza:
                try:
                    fx.set_mode_raw(ch1)
                    fx.set_zoom_raw(zoom8)
                except Exception:
                    pass
        self._ibiza_refresh_after_id = self.after(34, self._ibiza_refresh_tick)

    def on_ibiza_mode_change(self, mode: str) -> None:
        self.ibiza_mode = mode
        self.spot_controller.on_ibiza_mode_change(mode)

    def on_ibiza_zoom_change(self, value: float) -> None:
        self.ibiza_zoom = max(0.0, min(1.0, float(value)))
        self.spot_controller.on_ibiza_zoom_change(self.ibiza_zoom)

    # --- Xtrem LED (STOP / SLOW / PARTY + Intensité/Vitesse Ch5, lien BPM en PARTY) ---

    def _start_xtrem_refresh_loop(self) -> None:
        self._xtrem_refresh_tick()

    def _xtrem_refresh_tick(self) -> None:
        from ui.components.xtrem_card import (
            XTREM_MODE_STOP, XTREM_MODE_SLOW, XTREM_MODE_PARTY,
            XTREM_MODE_FADE, XTREM_MODE_JUMP,
        )
        xtrem = getattr(self, "xtrem", [])
        if xtrem:
            mode_to_val = {
                "stop": XTREM_MODE_STOP, "slow": XTREM_MODE_SLOW, "party": XTREM_MODE_PARTY,
                "fade": XTREM_MODE_FADE, "jump": XTREM_MODE_JUMP,
            }
            ch1 = mode_to_val.get(self.xtrem_mode, XTREM_MODE_STOP)
            # Si « Intensité BPM » activée : Ch5 modulé par la courbe Pulse (comme les cartes ambiance)
            if getattr(self, "xtrem_bpm_pulse", False) and self.xtrem_mode != "stop":
                curve = max(0.0, min(1.0, getattr(self, "_pulse_dimmer_curve", 1.0)))
                effective = self.xtrem_speed * curve
            else:
                effective = self.xtrem_speed
            speed8 = max(0, min(255, int(round(effective * 255.0))))
            for fx in xtrem:
                try:
                    fx.set_mode_raw(ch1)
                    fx.set_speed_raw(speed8)
                    fx.write_output()
                except Exception:
                    pass
        self._xtrem_refresh_after_id = self.after(34, self._xtrem_refresh_tick)

    def on_xtrem_mode_change(self, mode: str) -> None:
        self.xtrem_mode = mode
        self.spot_controller.on_xtrem_mode_change(mode)

    def on_xtrem_speed_change(self, value: float) -> None:
        self.xtrem_speed = max(0.0, min(1.0, float(value)))
        self.spot_controller.on_xtrem_speed_change(self.xtrem_speed)

    def on_xtrem_bpm_pulse_change(self, enabled: bool) -> None:
        """Active/désactive la modulation de l'intensité Xtrem par la courbe BPM (comme Pulse des cartes ambiance)."""
        self.xtrem_bpm_pulse = bool(enabled)

    def on_dynamo_xy_change(self, nx: float, ny: float) -> None:
        self.spot_controller.on_dynamo_xy_change(nx, ny)

    def on_dynamo_speed_change(self, value: float) -> None:
        self.spot_controller.on_dynamo_speed_change(value)

    def on_dynamo_dimmer_change(self, value: float) -> None:
        self.spot_controller.on_dynamo_dimmer_change(value)

    def on_dynamo_strobe_change(self, value: float) -> None:
        self.spot_controller.on_dynamo_strobe_change(value)

    def on_dynamo_center(self) -> None:
        self.spot_controller.on_dynamo_center()

    def on_dynamo_save_position(self, index: int) -> None:
        """Enregistre le preset complet Dynamo (position, amplitude, 180°, couleur, gobo, dimmer, strobe, etc.) dans le slot P1–P4 (clic droit)."""
        if 0 <= index < 4 and getattr(self, "dynam_scan_card", None) is not None:
            card = self.dynam_scan_card
            dimmer = max(0.0, min(1.0, float(card.dimmer_slider.get())))
            strobe = max(0.0, min(1.0, float(card.strobe_slider.get())))
            color_id = getattr(card, "_active_color_key", None)
            gobo_id = getattr(card, "_active_gobo_key", None)
            self.dynamo_xy_memory[index] = {
                "x": self.dynamo_xy_last_x, "y": self.dynamo_xy_last_y,
                "amplitude": getattr(self, "_dynamo_amplitude", 0.2),
                "use_180": self.dynamo_180_running,
                "color_id": color_id, "gobo_id": gobo_id, "dimmer": dimmer, "strobe": strobe,
                "auto_color": self.dynamo_auto_color_sync, "auto_gobo": self.dynamo_auto_gobo_sync,
            }
            self.dynam_scan_card.update_position_labels(self._dynamo_position_labels())
            self._save_dynamo_position_memory()

    def on_dynamo_recall_position(self, index: int) -> None:
        self.spot_controller.on_dynamo_recall_position(index)

    def on_dynamo_amplitude_change(self, value: float) -> None:
        self._dynamo_amplitude = max(0.05, min(0.5, float(value)))
        if self.dynamo_streak_running or self.dynamo_circle_running or self.dynamo_ellipse_running:
            self._motion_manager.set_amplitude(self._dynamo_amplitude)

    def on_dynamo_180_toggle(self) -> None:
        self.spot_controller.on_dynamo_180_toggle()

    def on_dynamo_ellipse_toggle(self) -> None:
        self.spot_controller.on_dynamo_ellipse_toggle()

    def on_dynamo_auto_color_toggle(self, enabled: bool) -> None:
        self.dynamo_auto_color_sync = bool(enabled)

    def on_dynamo_auto_gobo_toggle(self, enabled: bool) -> None:
        self.dynamo_auto_gobo_sync = bool(enabled)

    def on_dynamo_streak_toggle(self) -> None:
        self.spot_controller.on_dynamo_streak_toggle()

    def on_dynamo_circle_toggle(self) -> None:
        self.spot_controller.on_dynamo_circle_toggle()

    def on_dynamo_color_select(self, color_id: str) -> None:
        self.spot_controller.on_dynamo_color_select(color_id)

    def on_dynamo_gobo_select(self, gobo_id: str) -> None:
        self.spot_controller.on_dynamo_gobo_select(gobo_id)

    def on_dynamo_gobo_shake(self) -> None:
        self.spot_controller.on_dynamo_gobo_shake()

    def on_pick_gigabar_color(self) -> None:
        self.control_controller.on_pick_gigabar_color()

    def _update_gigabar_user_button(self, idx: int) -> None:
        self.control_controller.update_gigabar_user_button(idx)

    def on_gigabar_user_color_click(self, idx: int) -> None:
        self.control_controller.on_gigabar_user_color_click(idx)

    def on_gigabar_user_color_config(self, idx: int) -> None:
        self.control_controller.on_gigabar_user_color_config(idx)

    def on_gigabar_preset_color(self, rgb: Tuple[int, int, int]) -> None:
        self.control_controller.on_gigabar_preset_color(rgb)

    def on_gigabar_dimmer_change(self, value: int) -> None:
        self.control_controller.on_gigabar_dimmer_change(value)

    def on_gigabar_strobe_change(self, value: int) -> None:
        self.control_controller.on_gigabar_strobe_change(value)

    def on_gigabar_mode_change(self, value: int) -> None:
        self.control_controller.on_gigabar_mode_change(value)

    def on_gigabar_effect(self, mode: str) -> None:
        self.control_controller.on_gigabar_effect(mode)

    def on_preset_button(self, index: int) -> None:
        self.presets_controller.on_preset_button(index)

    def open_save_preset_dialog(self) -> None:
        if self.preset_manager is None:
            return
        SavePresetDialog(self, self.preset_manager, self.presets_controller.on_preset_saved)

    def _open_preset_rename_dialog(self, slot_id: int) -> None:
        """Ouvre le dialogue de renommage centré sur la fenêtre principale (même écran)."""
        if self.preset_manager is None:
            return
        current = self.preset_manager.get_preset_name(slot_id) or ""

        def on_ok(name: str) -> None:
            self.preset_manager.set_preset_name(slot_id, name)
            self.presets_controller._refresh_preset_button_labels()

        PresetRenameDialog(self, slot_id, current, on_ok)

    def _on_preset_saved(self, slot: int, name: str) -> None:
        self.presets_controller.on_preset_saved(slot, name)

    # --- Onglet PATCH & MONTAGE -----------------------------------------------
    def _build_patch_tab(self, tab: ctk.CTkFrame) -> None:
        # En-tête Dark Console + aide
        patch_header = ctk.CTkFrame(
            tab,
            fg_color=DARK_CONSOLE_BG,
            border_width=1,
            border_color=DARK_CONSOLE_BORDER,
            corner_radius=SECTION_RADIUS,
        )
        patch_header.pack(fill="x", padx=10, pady=(10, 4))
        patch_header.columnconfigure(0, weight=1)
        ctk.CTkLabel(patch_header, text="PATCH & MONTAGE", font=("", 13, "bold"), anchor="w").grid(
            row=0, column=0, sticky="w", padx=10, pady=6
        )
        ctk.CTkButton(
            patch_header, text="?", width=28, height=28, fg_color="#0ea5e9", hover_color="#38bdf8",
            command=self._open_patch_help,
        ).grid(row=0, column=1, padx=10, pady=6)
        table = ctk.CTkScrollableFrame(tab, fg_color=DARK_CONSOLE_SECTION_BG, corner_radius=8)
        table.pack(fill="both", expand=True, padx=10, pady=(4, 10))

        headers = [
            "Nom",
            "Fabricant / Modèle",
            "Univers",
            "Adresse DMX",
            "Canaux",
            "DIP (1‑9)",
            "Manuel",
            "Notes",
            "Test",
        ]
        for col, text in enumerate(headers):
            ctk.CTkLabel(table, text=text, anchor="w", font=("", 12, "bold")).grid(
                row=0, column=col, sticky="w", padx=4, pady=(0, 4)
            )

        self._patch_address_labels = []
        for row_idx, fx in enumerate(self.fixtures, start=1):
            name = fx.name or ""
            model = fx.model or ""
            manu = fx.manufacturer or ""
            univers = fx.universe
            start_addr = fx.address
            end_addr = fx.address + fx.channels - 1

            # Colonne Nom
            ctk.CTkLabel(table, text=name or "-", anchor="w").grid(
                row=row_idx, column=0, sticky="w", padx=4, pady=2
            )
            # Colonne Fabricant / Modèle
            ctk.CTkLabel(table, text=f"{manu} / {model}", anchor="w").grid(
                row=row_idx, column=1, sticky="w", padx=4, pady=2
            )
            # Univers
            ctk.CTkLabel(table, text=str(univers), anchor="w").grid(
                row=row_idx, column=2, sticky="w", padx=4, pady=2
            )
            # Adresse DMX (début à fin, important pour Gigabar)
            addr_text = f"{start_addr}"
            if fx.channels > 1:
                addr_text = f"{start_addr} – {end_addr}"
            addr_label = ctk.CTkLabel(table, text=addr_text, anchor="w")
            # Avertissement si adresse à 0
            if start_addr <= 0:
                addr_label.configure(text_color="#ef4444")
            addr_label.grid(row=row_idx, column=3, sticky="w", padx=4, pady=2)
            self._patch_address_labels.append(addr_label)
            # Canaux
            ctk.CTkLabel(table, text=str(fx.channels), anchor="w").grid(
                row=row_idx, column=4, sticky="w", padx=4, pady=2
            )

            # Visualisation DIP 1‑9
            dip_frame = ctk.CTkFrame(table, fg_color="transparent")
            dip_frame.grid(row=row_idx, column=5, sticky="w", padx=4, pady=2)
            addr = max(1, int(start_addr))
            bits = [1, 2, 4, 8, 16, 32, 64, 128, 256]
            for i, bit in enumerate(bits):
                on = bool(addr & bit)
                lbl = ctk.CTkLabel(
                    dip_frame,
                    text=str(i + 1),
                    width=20,
                    height=18,
                    corner_radius=3,
                    fg_color="#22c55e" if on else "#111111",
                    text_color="black" if on else "gray70",
                )
                lbl.grid(row=0, column=i, padx=1, pady=1)

            # Bouton manuel
            btn = ctk.CTkButton(
                table,
                text="Ouvrir manuel",
                width=110,
                command=lambda m=model: self.on_open_manual(m),
            )
            btn.grid(row=row_idx, column=6, padx=4, pady=2, sticky="w")

            # Notes (emplacement physique, etc.)
            notes_entry = ctk.CTkEntry(table, width=180, placeholder_text="Emplacement / Notes")
            notes_entry.grid(row=row_idx, column=7, padx=4, pady=2, sticky="w")

            # Bouton TEST / Identify
            test_btn = ctk.CTkButton(
                table,
                text="TEST",
                width=70,
                fg_color="#22c55e",
                hover_color="#16a34a",
                command=fx.identify,
            )
            test_btn.grid(row=row_idx, column=8, padx=4, pady=2, sticky="w")

    def on_open_manual(self, model: str) -> None:
        """Ouvre le manuel PDF correspondant au modèle si connu."""
        if not model:
            messagebox.showinfo("Manuel", "Aucun modèle défini pour cette fixture.")
            return
        # Cherche un match par sous-chaîne dans DOCS_LINKS
        url = None
        lower_model = model.lower()
        for key, link in DOCS_LINKS.items():
            if key.lower() in lower_model:
                url = link
                break
        if not url:
            messagebox.showinfo(
                "Manuel non trouvé",
                f"Aucun lien de manuel connu pour le modèle '{model}'.",
            )
            return
        try:
            webbrowser.open(url)
        except Exception as exc:
            messagebox.showerror("Erreur", f"Impossible d'ouvrir le manuel : {exc}")

    def on_audio_mode_change(self, value: str) -> None:
        self.rhythm_controller.on_audio_mode_change(value)

    def on_close(self) -> None:
        try:
            if getattr(self, "_wookie_refresh_after_id", None):
                self.after_cancel(self._wookie_refresh_after_id)
                self._wookie_refresh_after_id = None
            if getattr(self, "_ibiza_refresh_after_id", None):
                self.after_cancel(self._ibiza_refresh_after_id)
                self._ibiza_refresh_after_id = None
            if getattr(self, "_xtrem_refresh_after_id", None):
                self.after_cancel(self._xtrem_refresh_after_id)
                self._xtrem_refresh_after_id = None
        except Exception:
            pass
        try:
            self.dmx.blackout()
        except Exception:
            pass
        try:
            if self.xtrem_audio_sync is not None:
                self.xtrem_audio_sync.stop()
        except Exception:
            pass
        try:
            self.dmx.close()
        except Exception:
            pass
        self.destroy()


class PresetRenameDialog(ctk.CTkToplevel):
    """Dialogue de renommage d'un preset, centré sur la fenêtre principale (évite l'affichage sur un autre écran)."""

    def __init__(
        self,
        parent: ctk.CTk,
        slot_id: int,
        initial_name: str,
        on_ok: Callable[[str], None],
    ) -> None:
        super().__init__(parent)
        self._on_ok = on_ok
        self.title("Renommer le preset")
        self.resizable(False, False)

        # Centrage sur la fenêtre principale
        try:
            px = parent.winfo_rootx()
            py = parent.winfo_rooty()
            pw = parent.winfo_width()
            ph = parent.winfo_height()
        except Exception:
            px, py, pw, ph = 100, 100, 600, 500
        w, h = 380, 140
        x = px + (pw // 2) - (w // 2)
        y = py + (ph // 2) - (h // 2)
        self.geometry(f"{w}x{h}+{x}+{y}")
        self.transient(parent)

        ctk.CTkLabel(self, text=f"Nom du preset {slot_id} :", anchor="w").grid(
            row=0, column=0, columnspan=2, sticky="w", padx=20, pady=(20, 8)
        )
        self.entry = ctk.CTkEntry(self, width=320)
        self.entry.grid(row=1, column=0, columnspan=2, padx=20, pady=(0, 16), sticky="ew")
        self.columnconfigure(0, weight=1)
        if initial_name:
            self.entry.insert(0, initial_name)
            self.entry.select_range(0, "end")

        btn_frame = ctk.CTkFrame(self, fg_color="transparent")
        btn_frame.grid(row=2, column=0, columnspan=2, pady=(0, 20))
        ctk.CTkButton(btn_frame, text="OK", width=100, command=self._on_ok_click).pack(side="left", padx=(0, 10))
        ctk.CTkButton(btn_frame, text="Annuler", width=100, fg_color="gray30", hover_color="gray40", command=self.destroy).pack(side="left")

        self.grab_set()
        self.entry.focus_set()
        self.after(50, self.entry.focus_set)

    def _on_ok_click(self) -> None:
        name = self.entry.get().strip()
        self._on_ok(name)
        self.destroy()


class SavePresetDialog(ctk.CTkToplevel):
    def __init__(
        self,
        master: App,
        preset_manager: PresetManager,
        on_saved: Callable[[int, str], None],
    ) -> None:
        super().__init__(master)
        self.master_app = master
        self.preset_manager = preset_manager
        self.on_saved = on_saved

        self.title("Enregistrer un preset")
        self.resizable(False, False)

        # Centrage sur la fenêtre principale (même écran)
        try:
            px = master.winfo_rootx()
            py = master.winfo_rooty()
            pw = master.winfo_width()
            ph = master.winfo_height()
        except Exception:
            px, py, pw, ph = 100, 100, 700, 600
        w, h = 320, 220
        x = px + (pw // 2) - (w // 2)
        y = py + (ph // 2) - (h // 2)
        self.geometry(f"{w}x{h}+{x}+{y}")
        self.transient(master)

        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure((0, 1, 2, 3), weight=0)

        ctk.CTkLabel(self, text="Slot :").grid(row=0, column=0, sticky="w", padx=20, pady=(15, 5))

        # Propose le premier slot vide par défaut
        default_slot = 1
        try:
            default_slot = self.preset_manager.find_first_empty_slot()
        except Exception:
            default_slot = 1
        self.slot_var = ctk.StringVar(value=str(default_slot))
        self.slot_menu = ctk.CTkOptionMenu(
            self,
            variable=self.slot_var,
            values=[str(i) for i in range(1, 9)],
            command=self._on_slot_change,
        )
        self.slot_menu.grid(row=0, column=1, sticky="e", padx=20, pady=(15, 5))

        ctk.CTkLabel(self, text="Nom du preset :").grid(row=1, column=0, columnspan=2, sticky="w", padx=20, pady=(5, 5))

        self.name_entry = ctk.CTkEntry(self, width=200)
        self.name_entry.grid(row=2, column=0, columnspan=2, padx=20, pady=(0, 10), sticky="ew")

        btn_row = ctk.CTkFrame(self)
        btn_row.grid(row=3, column=0, columnspan=2, pady=(5, 15))

        save_btn = ctk.CTkButton(btn_row, text="Enregistrer", command=self._on_save)
        save_btn.grid(row=0, column=0, padx=(0, 10))

        cancel_btn = ctk.CTkButton(btn_row, text="Annuler", fg_color="gray30", hover_color="gray40", command=self.destroy)
        cancel_btn.grid(row=0, column=1, padx=(10, 0))

        # Pré-remplit le nom selon le slot courant
        self._load_current_name()

        self.grab_set()
        self.focus()

    def _on_slot_change(self, _value: str) -> None:
        self._load_current_name()

    def _load_current_name(self) -> None:
        try:
            slot = int(self.slot_var.get())
        except ValueError:
            slot = 1
        name = self.preset_manager.get_preset_name(slot) or ""
        self.name_entry.delete(0, "end")
        if name:
            self.name_entry.insert(0, name)

    def _on_save(self) -> None:
        try:
            slot = int(self.slot_var.get())
        except ValueError:
            slot = 1
        name = self.name_entry.get().strip()

        # Confirmation si un preset existe déjà sur ce slot
        if self.preset_manager.has_preset(slot):
            if not messagebox.askyesno(
                "Confirmation",
                f"Un preset existe déjà sur le slot {slot}. Voulez-vous l'écraser ?",
                parent=self,
            ):
                return

        # Appelle le callback de l'App pour effectuer la sauvegarde
        self.on_saved(slot, name)
        self.destroy()

def create_app(
    dmx_driver: DmxDriver,
    fixtures: List[Fixture],
    test_rgb_fixtures: Optional[List[RGBFixture]] = None,
) -> App:
    ctk.set_appearance_mode("dark")
    ctk.set_default_color_theme("dark-blue")
    return App(dmx_driver=dmx_driver, fixtures=fixtures, test_rgb_fixtures=test_rgb_fixtures)


__all__ = ["App", "create_app"]

