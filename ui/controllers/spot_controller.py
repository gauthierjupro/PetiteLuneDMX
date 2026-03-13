"""
Contrôleur Lyres / Mouvements : pad XY, SPOT 1/2, Center, STREAK/CIRCLE,
gobos, couleurs, presets U1–U4, Auto-Gobo, Mirror Color, strobe.
"""

from __future__ import annotations

import threading
import time
from typing import TYPE_CHECKING, List, Literal, Tuple

from models.fixtures import MovingHeadFixture
from logic.constants_dmx import (
    SPOT_GOBO_VALUES,
    SPOT_GOBO_CYCLE_IDS,
    SPOT_GOBO_CYCLE_VALUES,
    SPOT_COLOR_VALUES,
    SPOT_COLOR_COMPLEMENT,
    SPOT_COLOR_CYCLE,
    SPOT_BASE_COLORS,
    DYNAMO_COLOR_VALUES,
)
from ui.widgets.gigabar_color_dialog import GigabarColorDialog
from ui.components.dynam_scan_card import _slider_from_amplitude as _dynamo_slider_from_amplitude

if TYPE_CHECKING:
    from ui.main_window import App


def _default_lyre_calibration() -> dict:
    return {"invert_pan": False, "invert_tilt": False, "swap_axes": False, "pan_min": 0.0, "pan_max": 1.0, "tilt_min": 0.0, "tilt_max": 1.0}


def _default_dynamo_calibration() -> dict:
    return {"invert_pan": False, "invert_tilt": False, "offset_pan": 0.0, "offset_tilt": 0.0}


def _apply_dynamo_calibration(nx: float, ny: float, calib: dict) -> Tuple[int, int]:
    """Applique offset puis inversion pan/tilt et retourne (pan16, tilt16)."""
    offset_pan = max(-0.5, min(0.5, float(calib.get("offset_pan", 0.0))))
    offset_tilt = max(-0.5, min(0.5, float(calib.get("offset_tilt", 0.0))))
    nx_eff = max(0.0, min(1.0, nx + offset_pan))
    ny_eff = max(0.0, min(1.0, ny + offset_tilt))
    pan_raw = nx_eff
    tilt_raw = 1.0 - ny_eff
    if calib.get("invert_pan"):
        pan_raw = 1.0 - pan_raw
    if calib.get("invert_tilt"):
        tilt_raw = 1.0 - tilt_raw
    pan_raw = max(0.0, min(1.0, pan_raw))
    tilt_raw = max(0.0, min(1.0, tilt_raw))
    return (int(round(pan_raw * 65535.0)), int(round(tilt_raw * 65535.0)))


def _apply_lyre_calibration(nx: float, ny: float, calib: dict) -> Tuple[int, int]:
    """Applique la calibration (inversion, swap, limites) et retourne (pan16, tilt16)."""
    c = calib
    pan_min = max(0.0, min(1.0, float(c.get("pan_min", 0.0))))
    pan_max = max(0.0, min(1.0, float(c.get("pan_max", 1.0))))
    tilt_min = max(0.0, min(1.0, float(c.get("tilt_min", 0.0))))
    tilt_max = max(0.0, min(1.0, float(c.get("tilt_max", 1.0))))
    if pan_max < pan_min:
        pan_max, pan_min = pan_min, pan_max
    if tilt_max < tilt_min:
        tilt_max, tilt_min = tilt_min, tilt_max
    pan_raw = pan_min + nx * (pan_max - pan_min)
    tilt_raw = tilt_min + (1.0 - ny) * (tilt_max - tilt_min)
    if c.get("swap_axes"):
        pan_raw, tilt_raw = tilt_raw, pan_raw
    if c.get("invert_pan"):
        pan_raw = 1.0 - pan_raw
    if c.get("invert_tilt"):
        tilt_raw = 1.0 - tilt_raw
    pan_raw = max(0.0, min(1.0, pan_raw))
    tilt_raw = max(0.0, min(1.0, tilt_raw))
    return (int(round(pan_raw * 65535.0)), int(round(tilt_raw * 65535.0)))


class SpotController:
    def __init__(self, main_window: App) -> None:
        self.mw = main_window

    def _get_lyre_calibration(self, index: int) -> dict:
        cal = getattr(self.mw, "lyre_calibration", None)
        if cal and 0 <= index < len(cal):
            return cal[index]
        return _default_lyre_calibration()

    def _get_dynamo_calibration(self, index: int) -> dict:
        cal = getattr(self.mw, "dynamo_calibration", None)
        if cal and 0 <= index < len(cal):
            return cal[index]
        return _default_dynamo_calibration()

    def on_xy_change(self, nx: float, ny: float) -> None:
        self.mw.xy_last_x = max(0.0, min(1.0, float(nx)))
        self.mw.xy_last_y = max(0.0, min(1.0, float(ny)))
        try:
            self.mw.spot_card.set_active_position_index(None)
        except Exception:
            pass
        # En mode 8, CIRCLE ou ELLIPSE : un seul point (centre) commun aux 2 lyres — pas d'envoi direct, la boucle envoie
        if self.mw.spot_streak_running or self.mw.spot_circle_running or getattr(self.mw, "spot_ellipse_running", False):
            self.mw._motion_manager.set_center(self.mw.xy_last_x, self.mw.xy_last_y)
            try:
                self.mw.xy_pad.set_normalized(self.mw.xy_last_x, self.mw.xy_last_y)
            except Exception:
                pass
            return
        # Mode 180° : lyre 2 en opposition (miroir par rapport au centre 0.5, 0.5)
        use_180 = getattr(self.mw, "spot_180_running", False) and len(self.mw.pico) >= 2
        for i, fx in enumerate(self.mw.pico):
            if i < len(self.mw.spot_active) and self.mw.spot_active[i]:
                if use_180 and i == 1:
                    mx, my = 1.0 - self.mw.xy_last_x, 1.0 - self.mw.xy_last_y
                    cal = self._get_lyre_calibration(i)
                    pan16, tilt16 = _apply_lyre_calibration(mx, my, cal)
                else:
                    cal = self._get_lyre_calibration(i)
                    pan16, tilt16 = _apply_lyre_calibration(self.mw.xy_last_x, self.mw.xy_last_y, cal)
                fx.set_pan_tilt_16bit(pan16, tilt16)

    def on_center_pico(self) -> None:
        if self.mw.spot_streak_running:
            self.on_spot_streak_stop()
        if self.mw.spot_circle_running:
            self.on_spot_circle_stop()
        if getattr(self.mw, "spot_ellipse_running", False):
            self.on_spot_ellipse_stop()
        self.mw.xy_last_x = 0.5
        self.mw.xy_last_y = 0.5
        for fx in self.mw.pico:
            fx.set_pan_tilt_16bit(32768, 32768)
        self.mw.xy_pad.set_center()

    def on_spot_recall_position(self, index: int) -> None:
        """Rappelle le preset P1–P4 (position, 180°, couleur, gobo, dimmer, strobe, mirror/auto) et l'envoie aux lyres."""
        if self.mw.spot_streak_running:
            self.on_spot_streak_stop()
        if self.mw.spot_circle_running:
            self.on_spot_circle_stop()
        if getattr(self.mw, "spot_ellipse_running", False):
            self.on_spot_ellipse_stop()
        mem = getattr(self.mw, "spot_xy_memory", [None, None, None, None])
        if index < 0 or index >= len(mem) or mem[index] is None:
            return
        entry = mem[index]
        # Support dict (nouveau format) ou tuple (ancien)
        if isinstance(entry, dict):
            nx = max(0.0, min(1.0, float(entry.get("x", 0.5))))
            ny = max(0.0, min(1.0, float(entry.get("y", 0.5))))
            use_180 = bool(entry.get("use_180", False))
            color_id = entry.get("color_id")
            gobo_id = entry.get("gobo_id")
            dimmer = max(0.0, min(1.0, float(entry.get("dimmer", 1.0))))
            strobe = max(0.0, min(1.0, float(entry.get("strobe", 0.0))))
            mirror_color = bool(entry.get("mirror_color", False))
            auto_gobo = bool(entry.get("auto_gobo", False))
            auto_color = bool(entry.get("auto_color", False))
        else:
            nx = max(0.0, min(1.0, float(entry[0])))
            ny = max(0.0, min(1.0, float(entry[1])))
            use_180 = bool(entry[2]) if len(entry) >= 3 else False
            color_id = gobo_id = None
            dimmer, strobe = 1.0, 0.0
            mirror_color = auto_gobo = auto_color = False
        self.mw.spot_180_running = use_180
        try:
            self.mw.spot_card.angle_180_var.set(use_180)
        except Exception:
            pass
        self.mw.xy_last_x = nx
        self.mw.xy_last_y = ny
        self.mw.xy_pad.set_normalized(nx, ny)
        self.on_xy_change(nx, ny)
        # Restaurer mirror / auto (état mw + UI)
        self.mw.spot_mirror_color = mirror_color
        self.mw.spot_auto_gobo_sync = auto_gobo
        self.mw.spot_auto_color_sync = auto_color
        try:
            self.mw.spot_card.mirror_color_var.set(mirror_color)
            self.mw.spot_card.auto_gobo_var.set(auto_gobo)
            self.mw.spot_card.auto_color_var.set(auto_color)
        except Exception:
            pass
        # Restaurer dimmer, strobe (UI + DMX)
        try:
            self.mw.spot_card.set_dimmer_value(dimmer)
            self.mw.spot_card.set_strobe_value(strobe)
            self.mw.on_spot_dimmer_change(dimmer)
            self.mw.on_spot_strobe_change(strobe)
        except Exception:
            pass
        # Restaurer couleur puis gobo (UI + DMX)
        if color_id and color_id in SPOT_COLOR_VALUES:
            try:
                self.mw.spot_card.set_active_color_key(color_id)
                self.mw.spot_last_color_id = color_id
                self.on_spot_color_select(color_id)
            except Exception:
                pass
        if gobo_id and gobo_id in SPOT_GOBO_VALUES:
            try:
                self.mw.spot_card.set_active_gobo(gobo_id)
                self.on_spot_gobo_select(gobo_id)
            except Exception:
                pass
        try:
            self.mw.spot_card.set_active_position_index(index)
        except Exception:
            pass

    def on_spot_dimmer_change(self, value: float) -> None:
        level = max(0.0, min(1.0, float(value)))
        dim_val = int(round(level * 255))
        for i, fx in enumerate(self.mw.pico):
            if i < len(self.mw.spot_active) and self.mw.spot_active[i]:
                try:
                    fx.set_dimmer(dim_val)
                except Exception:
                    pass
        if getattr(self.mw, "spot_card", None) is not None:
            try:
                self.mw.spot_card.update_out(self.mw.master_dimmer_factor)
            except Exception:
                pass

    def on_spot_strobe_change(self, value: float) -> None:
        v = int(max(0.0, min(1.0, float(value))) * 255)
        for i, fx in enumerate(self.mw.pico):
            if i >= len(self.mw.spot_active) or not self.mw.spot_active[i]:
                continue
            try:
                if hasattr(fx, "set_strobe") and callable(fx.set_strobe):
                    fx.set_strobe(v)
                elif getattr(fx, "channels", 0) >= 9 and hasattr(fx, "set_channel"):
                    fx.set_channel(9, v)
            except Exception:
                pass

    def _apply_spot_gobo_value(self, value: int) -> None:
        v = max(0, min(255, int(value)))
        for i, fx in enumerate(self.mw.pico):
            if i < len(self.mw.spot_active) and self.mw.spot_active[i]:
                try:
                    fx.set_gobo_raw(v)
                except Exception:
                    pass

    def _apply_spot_color_value(self, value: int) -> None:
        v = max(0, min(255, int(value)))
        for i, fx in enumerate(self.mw.pico):
            if i < len(self.mw.spot_active) and self.mw.spot_active[i]:
                try:
                    fx.set_color_raw(v)
                except Exception:
                    pass

    def _apply_spot_color_mirror(self, primary_color_id: str) -> None:
        primary_val = SPOT_COLOR_VALUES.get(primary_color_id)
        if primary_val is None:
            return
        complement_id = SPOT_COLOR_COMPLEMENT.get(primary_color_id)
        if complement_id is None:
            self._apply_spot_color_value(primary_val)
            return
        complement_val = SPOT_COLOR_VALUES.get(complement_id)
        if complement_val is None:
            self._apply_spot_color_value(primary_val)
            return
        for i, fx in enumerate(self.mw.pico):
            if i >= len(self.mw.spot_active) or not self.mw.spot_active[i]:
                continue
            try:
                if i == 0:
                    fx.set_color_raw(max(0, min(255, primary_val)))
                else:
                    fx.set_color_raw(max(0, min(255, complement_val)))
            except Exception:
                pass

    def _advance_spot_gobo_cycle(self) -> None:
        if not SPOT_GOBO_CYCLE_VALUES:
            return
        self.mw._spot_gobo_cycle_index = (self.mw._spot_gobo_cycle_index + 1) % len(SPOT_GOBO_CYCLE_VALUES)
        value = SPOT_GOBO_CYCLE_VALUES[self.mw._spot_gobo_cycle_index]
        self._apply_spot_gobo_value(value)
        gobo_id = SPOT_GOBO_CYCLE_IDS[self.mw._spot_gobo_cycle_index] if SPOT_GOBO_CYCLE_IDS else None
        try:
            self.mw.spot_card.set_active_gobo(gobo_id)
        except Exception:
            pass

    def _advance_spot_color_cycle(self) -> None:
        if not SPOT_COLOR_CYCLE:
            return
        self.mw._spot_color_cycle_index = (self.mw._spot_color_cycle_index + 1) % len(SPOT_COLOR_CYCLE)
        primary_id = SPOT_COLOR_CYCLE[self.mw._spot_color_cycle_index]
        self._apply_spot_color_mirror(primary_id)
        try:
            self.mw.spot_card.set_active_color_key(primary_id)
        except Exception:
            pass

    def _advance_dynamo_gobo_cycle(self) -> None:
        if not SPOT_GOBO_CYCLE_VALUES or not self.mw.dynamo:
            return
        self.mw._dynamo_gobo_cycle_index = (self.mw._dynamo_gobo_cycle_index + 1) % len(SPOT_GOBO_CYCLE_VALUES)
        value = SPOT_GOBO_CYCLE_VALUES[self.mw._dynamo_gobo_cycle_index]
        for fx in self.mw.dynamo:
            try:
                fx.set_gobo_raw(value)
            except Exception:
                pass
        gobo_id = SPOT_GOBO_CYCLE_IDS[self.mw._dynamo_gobo_cycle_index] if SPOT_GOBO_CYCLE_IDS else None
        try:
            self.mw.dynam_scan_card.set_active_gobo(gobo_id)
        except Exception:
            pass

    def _advance_dynamo_color_cycle(self) -> None:
        if not SPOT_COLOR_CYCLE or not self.mw.dynamo:
            return
        self.mw._dynamo_color_cycle_index = (self.mw._dynamo_color_cycle_index + 1) % len(SPOT_COLOR_CYCLE)
        color_id = SPOT_COLOR_CYCLE[self.mw._dynamo_color_cycle_index]
        val = DYNAMO_COLOR_VALUES.get(color_id, SPOT_COLOR_VALUES.get(color_id, 0))
        for fx in self.mw.dynamo:
            try:
                fx.set_color_raw(val)
            except Exception:
                pass
        try:
            self.mw.dynam_scan_card.set_active_color_key(color_id)
        except Exception:
            pass

    def on_spot_gobo_select(self, gobo_id: str) -> None:
        value = SPOT_GOBO_VALUES.get(gobo_id)
        if value is None:
            return
        self._apply_spot_gobo_value(value)
        try:
            self.mw._spot_gobo_cycle_index = SPOT_GOBO_CYCLE_VALUES.index(value)
        except ValueError:
            self.mw._spot_gobo_cycle_index = 0

    def on_spot_gobo_shake(self) -> None:
        value = SPOT_GOBO_VALUES.get("SHAKE")
        if value is None:
            return
        self._apply_spot_gobo_value(value)

    def on_spot_color_select(self, color_id: str) -> None:
        self.mw.spot_last_color_id = color_id
        if self.mw.spot_mirror_color and len(self.mw.pico) >= 2 and color_id in SPOT_COLOR_COMPLEMENT:
            self._apply_spot_color_mirror(color_id)
            self.mw._spot_color_cycle_index = next(
                (i for i, c in enumerate(SPOT_COLOR_CYCLE) if c == color_id),
                0,
            )
            return
        value = SPOT_COLOR_VALUES.get(color_id)
        if value is None:
            return
        self._apply_spot_color_value(value)

    def on_spot_preset_click(self, index: int) -> None:
        if not (0 <= index < len(self.mw.spot_user_presets)):
            return
        color_id = self.mw.spot_user_presets[index]
        if not color_id:
            return
        self.on_spot_color_select(color_id)

    def on_spot_preset_config(self, index: int) -> None:
        if not (0 <= index < len(self.mw.spot_user_presets)):
            return
        # Couleur de départ : preset existant, sinon dernière couleur lyre, sinon blanc.
        def _id_to_rgb(color_id: str) -> Tuple[int, int, int]:
            for label, hex_val in SPOT_BASE_COLORS:
                if label == color_id and hex_val.startswith("#") and len(hex_val) == 7:
                    r = int(hex_val[1:3], 16)
                    g = int(hex_val[3:5], 16)
                    b = int(hex_val[5:7], 16)
                    return r, g, b
            return 255, 255, 255

        existing_id = self.mw.spot_user_presets[index]
        if existing_id:
            initial_rgb = _id_to_rgb(existing_id)
        elif self.mw.spot_last_color_id:
            initial_rgb = _id_to_rgb(self.mw.spot_last_color_id)
        else:
            initial_rgb = (255, 255, 255)

        def _nearest_color_id(r: int, g: int, b: int) -> str:
            best_id = "R"
            best_dist = float("inf")
            for label, hex_val in SPOT_BASE_COLORS:
                if not (hex_val.startswith("#") and len(hex_val) == 7):
                    continue
                rr = int(hex_val[1:3], 16)
                gg = int(hex_val[3:5], 16)
                bb = int(hex_val[5:7], 16)
                dist = (rr - r) ** 2 + (gg - g) ** 2 + (bb - b) ** 2
                if dist < best_dist:
                    best_dist = dist
                    best_id = label
            return best_id

        def _apply_live(r: int, g: int, b: int) -> None:
            # Choisit la couleur roue la plus proche, pour rester cohérent avec SPOT_COLOR_VALUES.
            color_id = _nearest_color_id(r, g, b)
            self.mw.spot_last_color_id = color_id
            self.mw.spot_user_presets[index] = color_id
            color_hex = f"#{r:02x}{g:02x}{b:02x}"
            try:
                self.mw.spot_card.update_preset_button(index, color_hex)
            except Exception:
                pass
            # Prévisualisation live sur les lyres avec le gobo/roue associé.
            try:
                self.on_spot_color_select(color_id)
            except Exception:
                pass

        dlg = GigabarColorDialog(self.mw, initial_rgb=initial_rgb, on_change=_apply_live)
        self.mw.wait_window(dlg)

    def on_spot_auto_gobo_toggle(self, enabled: bool) -> None:
        self.mw.spot_auto_gobo_sync = bool(enabled)

    def on_spot_auto_color_toggle(self, enabled: bool) -> None:
        self.mw.spot_auto_color_sync = bool(enabled)

    def on_spot_mirror_color_toggle(self, enabled: bool) -> None:
        self.mw.spot_mirror_color = bool(enabled)

    def _snapshot_spot_positions(self) -> List[Tuple[MovingHeadFixture, int, int]]:
        snap: List[Tuple[MovingHeadFixture, int, int]] = []
        for i, fx in enumerate(self.mw.pico):
            if not (i < len(self.mw.spot_active) and self.mw.spot_active[i]):
                continue
            pan = self.mw.dmx.get_channel(fx.address + fx.pan_channel - 1)
            tilt = self.mw.dmx.get_channel(fx.address + fx.tilt_channel - 1)
            snap.append((fx, pan, tilt))
        return snap

    def _restore_spot_positions(self) -> None:
        for fx, pan, tilt in self.mw._auto_motion_snap:
            try:
                fx.set_pan_tilt(pan, tilt)
            except Exception:
                pass

    def update_auto_motion(self) -> None:
        any_motion = (
            self.mw.spot_streak_running
            or self.mw.spot_circle_running
            or getattr(self.mw, "spot_ellipse_running", False)
            or self.mw.dynamo_streak_running
            or self.mw.dynamo_circle_running
            or getattr(self.mw, "dynamo_ellipse_running", False)
        )
        if not any_motion:
            return
        mm = self.mw._motion_manager
        if self.mw.spot_streak_running or self.mw.spot_circle_running or getattr(self.mw, "spot_ellipse_running", False):
            try:
                vitesse_slider = float(self.mw.spot_card.speed_slider.get())
            except Exception:
                vitesse_slider = 0.5
        elif self.mw.dynamo_streak_running or self.mw.dynamo_circle_running or getattr(self.mw, "dynamo_ellipse_running", False):
            try:
                vitesse_slider = float(self.mw.dynam_scan_card.speed_slider.get())
            except Exception:
                vitesse_slider = 0.5
        else:
            try:
                vitesse_slider = float(self.mw.dynam_scan_card.speed_slider.get())
            except Exception:
                vitesse_slider = 0.5
        # Seuil : vitesse à 0 => ne pas mettre à jour ni rescheduler (évite de polluer le flux DMX)
        if vitesse_slider <= 0:
            return
        dynamo_motion = self.mw.dynamo_streak_running or self.mw.dynamo_circle_running or getattr(self.mw, "dynamo_ellipse_running", False)
        # Dynamo : courbe de vitesse plus large (bonnes pratiques moving heads rapides) — slider mi-course déjà fluide, max beaucoup plus rapide
        if dynamo_motion:
            effective_speed = 0.2 + vitesse_slider * 2.3  # 0.2 à 2.5 au lieu de 0–1
        else:
            effective_speed = vitesse_slider
        theta_1, theta_2 = mm.advance(effective_speed)
        # En 8/CIRCLE/ELLIPSE : 180 coché → opposition (θ₂ = θ₁ + π) ; 180 décoché → les 2 lyres à l’identique (θ₂ = θ₁)
        if self.mw.spot_streak_running or self.mw.spot_circle_running or getattr(self.mw, "spot_ellipse_running", False):
            if not getattr(self.mw, "spot_180_running", False):
                theta_2 = theta_1
        if self.mw.dynamo_streak_running or self.mw.dynamo_circle_running or getattr(self.mw, "dynamo_ellipse_running", False):
            if not getattr(self.mw, "dynamo_180_running", False):
                theta_2 = theta_1

        if self.mw.spot_auto_gobo_sync or getattr(self.mw, "spot_auto_color_sync", False):
            cycle = mm.cycle_index(theta_1)
            if cycle != self.mw._auto_motion_cycle_index:
                self.mw._auto_motion_cycle_index = cycle
                if self.mw.spot_auto_gobo_sync:
                    self._advance_spot_gobo_cycle()
                if self.mw.spot_mirror_color or getattr(self.mw, "spot_auto_color_sync", False):
                    self._advance_spot_color_cycle()
        if getattr(self.mw, "dynamo_auto_gobo_sync", False) or getattr(self.mw, "dynamo_auto_color_sync", False):
            dynamo_running = self.mw.dynamo_streak_running or self.mw.dynamo_circle_running or getattr(self.mw, "dynamo_ellipse_running", False)
            if dynamo_running:
                cycle = mm.cycle_index(theta_1)
                if cycle != getattr(self.mw, "_dynamo_motion_cycle_index", 0):
                    self.mw._dynamo_motion_cycle_index = cycle
                    if getattr(self.mw, "dynamo_auto_gobo_sync", False):
                        self._advance_dynamo_gobo_cycle()
                    if getattr(self.mw, "dynamo_auto_color_sync", False):
                        self._advance_dynamo_color_cycle()

        spot_motion = self.mw.spot_streak_running or self.mw.spot_circle_running or getattr(self.mw, "spot_ellipse_running", False)

        # Lyres : mode et positions uniquement si le mouvement Lyres est actif
        if spot_motion:
            mode_lyres: Literal["streak", "circle", "ellipse"] = "streak"
            if self.mw.spot_streak_running:
                mode_lyres = "streak"
            elif self.mw.spot_circle_running:
                mode_lyres = "circle"
            elif getattr(self.mw, "spot_ellipse_running", False):
                mode_lyres = "ellipse"
            nx1, ny1, nx2, ny2 = mm.get_positions(mode_lyres, theta_1, theta_2)
            for i, (nx, ny) in enumerate([(nx1, ny1), (nx2, ny2)]):
                if i >= len(self.mw.pico) or not (i < len(self.mw.spot_active) and self.mw.spot_active[i]):
                    continue
                cal = self._get_lyre_calibration(i)
                pan16, tilt16 = _apply_lyre_calibration(nx, ny, cal)
                try:
                    self.mw.pico[i].set_pan_tilt_16bit(pan16, tilt16)
                except Exception:
                    pass
            try:
                self.mw.xy_pad.set_lyre_positions(nx1, ny1, nx2, ny2)
            except Exception:
                pass

        # Dynamo Scan : mise à jour du pad (affichage) ; l'envoi DMX pan/tilt est fait par le thread 50 FPS avec lerp
        if dynamo_motion and self.mw.dynamo:
            mode_dynamo: Literal["streak", "circle", "ellipse"] = "streak"
            if self.mw.dynamo_streak_running:
                mode_dynamo = "streak"
            elif self.mw.dynamo_circle_running:
                mode_dynamo = "circle"
            elif getattr(self.mw, "dynamo_ellipse_running", False):
                mode_dynamo = "ellipse"
            nx1_d, ny1_d, nx2_d, ny2_d = mm.get_positions(mode_dynamo, theta_1, theta_2)
            use_180_d = getattr(self.mw, "dynamo_180_running", False)
            nx_d, ny_d = (nx2_d, ny2_d) if use_180_d else (nx1_d, ny1_d)
            try:
                self.mw.dynam_scan_card.xy_pad.set_lyre_positions(nx1_d, ny1_d, nx_d, ny_d)
            except Exception:
                pass

        # ~30 Hz (33 ms) pour fluidité moving heads rapides (bonnes pratiques DMX 25–40 Hz)
        self.mw._auto_motion_after_id = self.mw.after(33, self.mw.update_all_motions)

    def on_spot_streak_start(self) -> None:
        if self.mw.spot_streak_running:
            return
        self.mw.spot_circle_running = False
        self.mw.spot_ellipse_running = False
        self.mw._auto_motion_snap = self._snapshot_spot_positions()
        # Toujours démarrer depuis le centre (0.5, 0.5)
        self.mw.xy_last_x, self.mw.xy_last_y = 0.5, 0.5
        try:
            self.mw.xy_pad.set_normalized(0.5, 0.5)
        except Exception:
            pass
        self.mw._motion_manager.set_center(0.5, 0.5)
        self.mw._motion_manager.set_amplitude(self.mw._auto_motion_amplitude)
        self.mw._motion_manager.reset_time()
        self.mw.spot_streak_running = True
        if self.mw._auto_motion_after_id:
            self.mw.after_cancel(self.mw._auto_motion_after_id)
            self.mw._auto_motion_after_id = None
        self.mw.update_all_motions()
        self._update_streak_circle_buttons()

    def on_spot_streak_toggle(self) -> None:
        if self.mw.spot_streak_running:
            self.on_spot_streak_stop()
        else:
            self.on_spot_streak_start()
        self._update_streak_circle_buttons()

    def on_spot_streak_stop(self) -> None:
        self.mw.spot_streak_running = False
        self._restore_spot_positions()
        self._update_streak_circle_buttons()

    def on_spot_circle_start(self) -> None:
        if self.mw.spot_circle_running:
            return
        self.mw.spot_streak_running = False
        self.mw.spot_ellipse_running = False
        self.mw._auto_motion_snap = self._snapshot_spot_positions()
        # Toujours démarrer depuis le centre (0.5, 0.5)
        self.mw.xy_last_x, self.mw.xy_last_y = 0.5, 0.5
        try:
            self.mw.xy_pad.set_normalized(0.5, 0.5)
        except Exception:
            pass
        self.mw._motion_manager.set_center(0.5, 0.5)
        self.mw._motion_manager.set_amplitude(self.mw._auto_motion_amplitude)
        self.mw._motion_manager.reset_time()
        self.mw.spot_circle_running = True
        if self.mw._auto_motion_after_id:
            self.mw.after_cancel(self.mw._auto_motion_after_id)
            self.mw._auto_motion_after_id = None
        self.mw.update_all_motions()
        self._update_streak_circle_buttons()

    def on_spot_circle_toggle(self) -> None:
        if self.mw.spot_circle_running:
            self.on_spot_circle_stop()
        else:
            self.on_spot_circle_start()
        self._update_streak_circle_buttons()

    def on_spot_circle_stop(self) -> None:
        self.mw.spot_circle_running = False
        self._restore_spot_positions()
        self._update_streak_circle_buttons()

    def on_spot_ellipse_start(self) -> None:
        if self.mw.spot_ellipse_running:
            return
        self.mw.spot_streak_running = False
        self.mw.spot_circle_running = False
        self.mw._auto_motion_snap = self._snapshot_spot_positions()
        # Toujours démarrer depuis le centre (0.5, 0.5)
        self.mw.xy_last_x, self.mw.xy_last_y = 0.5, 0.5
        try:
            self.mw.xy_pad.set_normalized(0.5, 0.5)
        except Exception:
            pass
        self.mw._motion_manager.set_center(0.5, 0.5)
        self.mw._motion_manager.set_amplitude(self.mw._auto_motion_amplitude)
        self.mw._motion_manager.reset_time()
        self.mw.spot_ellipse_running = True
        if self.mw._auto_motion_after_id:
            self.mw.after_cancel(self.mw._auto_motion_after_id)
            self.mw._auto_motion_after_id = None
        self.mw.update_all_motions()
        self._update_streak_circle_buttons()

    def on_spot_ellipse_toggle(self) -> None:
        if self.mw.spot_ellipse_running:
            self.on_spot_ellipse_stop()
        else:
            self.on_spot_ellipse_start()
        self._update_streak_circle_buttons()

    def on_spot_ellipse_stop(self) -> None:
        self.mw.spot_ellipse_running = False
        self._restore_spot_positions()
        self._update_streak_circle_buttons()

    def on_spot_180_start(self) -> None:
        """Active l’option 180° : en mode 8/Circle les deux lyres partent en sens inverse (θ₂ = θ₁ + π). Ne stoppe pas le 8 ni le Circle."""
        self.mw.spot_180_running = True
        if not (self.mw.spot_streak_running or self.mw.spot_circle_running or getattr(self.mw, "spot_ellipse_running", False)) and len(self.mw.pico) >= 2:
            # Seule la lyre 2 reçoit la position miroir — la lyre 1 ne bouge pas
            mx = 1.0 - self.mw.xy_last_x
            my = 1.0 - self.mw.xy_last_y
            cal = self._get_lyre_calibration(1)
            pan16, tilt16 = _apply_lyre_calibration(mx, my, cal)
            if 1 < len(self.mw.pico) and 1 < len(self.mw.spot_active) and self.mw.spot_active[1]:
                try:
                    self.mw.pico[1].set_pan_tilt_16bit(pan16, tilt16)
                except Exception:
                    pass
        self._update_streak_circle_buttons(skip_spot_180_sync=True)

    def on_spot_180_stop(self) -> None:
        """Désactive l’option 180° : en mode 8/Circle/Ellipse les deux lyres bougent à l’identique (θ₂ = θ₁)."""
        self.mw.spot_180_running = False
        if not (self.mw.spot_streak_running or self.mw.spot_circle_running or getattr(self.mw, "spot_ellipse_running", False)) and len(self.mw.pico) >= 2:
            # Seule la lyre 2 repasse sur la position du pad — la lyre 1 ne bouge pas
            cal = self._get_lyre_calibration(1)
            pan16, tilt16 = _apply_lyre_calibration(self.mw.xy_last_x, self.mw.xy_last_y, cal)
            if 1 < len(self.mw.pico) and 1 < len(self.mw.spot_active) and self.mw.spot_active[1]:
                try:
                    self.mw.pico[1].set_pan_tilt_16bit(pan16, tilt16)
                except Exception:
                    pass
        self._update_streak_circle_buttons(skip_spot_180_sync=True)

    def on_spot_180_toggle(self) -> None:
        if getattr(self.mw, "spot_180_running", False):
            self.on_spot_180_stop()
        else:
            self.on_spot_180_start()
        self._update_streak_circle_buttons(skip_spot_180_sync=True)

    def _update_streak_circle_buttons(self, skip_spot_180_sync: bool = False, skip_dynamo_180_sync: bool = False) -> None:
        if not getattr(self.mw, "spot_card", None):
            return
        try:
            if self.mw.spot_streak_running:
                self.mw.spot_card.streak_btn.configure(fg_color="#2563eb", hover_color="#1d4ed8")
            else:
                self.mw.spot_card.streak_btn.configure(fg_color="gray25", hover_color="gray40")
            if self.mw.spot_circle_running:
                self.mw.spot_card.circle_btn.configure(fg_color="#2563eb", hover_color="#1d4ed8")
            else:
                self.mw.spot_card.circle_btn.configure(fg_color="gray25", hover_color="gray40")
            if self.mw.spot_ellipse_running:
                self.mw.spot_card.ellipse_btn.configure(fg_color="#2563eb", hover_color="#1d4ed8")
            else:
                self.mw.spot_card.ellipse_btn.configure(fg_color="gray25", hover_color="gray40")
            if not skip_spot_180_sync:
                self.mw.spot_card.angle_180_var.set(getattr(self.mw, "spot_180_running", False))
        except Exception:
            pass
        if getattr(self.mw, "dynam_scan_card", None):
            try:
                if self.mw.dynamo_streak_running:
                    self.mw.dynam_scan_card.streak_btn.configure(fg_color="#2563eb", hover_color="#1d4ed8")
                else:
                    self.mw.dynam_scan_card.streak_btn.configure(fg_color="gray25", hover_color="gray40")
                if self.mw.dynamo_circle_running:
                    self.mw.dynam_scan_card.circle_btn.configure(fg_color="#2563eb", hover_color="#1d4ed8")
                else:
                    self.mw.dynam_scan_card.circle_btn.configure(fg_color="gray25", hover_color="gray40")
                if getattr(self.mw, "dynamo_ellipse_running", False):
                    self.mw.dynam_scan_card.ellipse_btn.configure(fg_color="#2563eb", hover_color="#1d4ed8")
                else:
                    self.mw.dynam_scan_card.ellipse_btn.configure(fg_color="gray25", hover_color="gray40")
                if not skip_dynamo_180_sync:
                    self.mw.dynam_scan_card.angle_180_var.set(getattr(self.mw, "dynamo_180_running", False))
            except Exception:
                pass

    # --- Dynamo Scan LED (9ch) : XY, speed, dimmer, strobe, color, gobo, STREAK/CIRCLE/ELLIPSE, 180° ---

    LERP_FACTOR = 0.25  # lissage position Dynamo (0 = pas de lissage, 1 = suivi immédiat)
    DYNAMO_THREAD_INTERVAL_S = 0.02  # 50 FPS

    def _run_dynamo_motion_loop(self) -> None:
        """Boucle du thread de mouvement Dynamo : calcul en float, lerp, arrondi int uniquement à l'envoi Enttec."""
        mw = self.mw
        while not mw._dynamo_motion_stop.is_set():
            time.sleep(self.DYNAMO_THREAD_INTERVAL_S)
            if not getattr(mw, "dynamo_active", False) or not mw.dynamo:
                continue
            mm = mw._motion_manager
            try:
                theta_1, theta_2 = mm.get_theta()
            except Exception:
                continue
            mode_dynamo: Literal["streak", "circle", "ellipse"] = "streak"
            if mw.dynamo_streak_running:
                mode_dynamo = "streak"
            elif mw.dynamo_circle_running:
                mode_dynamo = "circle"
            elif getattr(mw, "dynamo_ellipse_running", False):
                mode_dynamo = "ellipse"
            try:
                nx1_d, ny1_d, nx2_d, ny2_d = mm.get_positions(mode_dynamo, theta_1, theta_2)
            except Exception:
                continue
            use_180 = getattr(mw, "dynamo_180_running", False)
            current_list = getattr(mw, "_dynamo_lerp_current", [(0.5, 0.5), (0.5, 0.5)])
            if len(current_list) < 2:
                current_list = [(0.5, 0.5), (0.5, 0.5)]
            alpha = self.LERP_FACTOR
            for i, fx in enumerate(mw.dynamo):
                if i >= 2:
                    break
                target_nx = nx2_d if (i == 1 and use_180) else nx1_d
                target_ny = ny2_d if (i == 1 and use_180) else ny1_d
                cur_nx, cur_ny = current_list[i]
                # Lerp en float (tous les calculs en float, arrondi uniquement à l'envoi)
                cur_nx = cur_nx + (target_nx - cur_nx) * alpha
                cur_ny = cur_ny + (target_ny - cur_ny) * alpha
                cur_nx = max(0.0, min(1.0, cur_nx))
                cur_ny = max(0.0, min(1.0, cur_ny))
                current_list[i] = (cur_nx, cur_ny)
                try:
                    cal = self._get_dynamo_calibration(i)
                    pan16, tilt16 = _apply_dynamo_calibration(cur_nx, cur_ny, cal)
                    fx.set_pan_tilt_16bit(pan16, tilt16)
                except Exception:
                    pass
            mw._dynamo_lerp_current = current_list

    def _start_dynamo_motion_thread(self) -> None:
        """Démarre le thread de mouvement Dynamo (50 FPS, lerp)."""
        self._stop_dynamo_motion_thread()
        try:
            self.mw.dynamo_motion_speed = float(self.mw.dynam_scan_card.speed_slider.get())
        except Exception:
            pass
        mm = self.mw._motion_manager
        mode_dynamo: Literal["streak", "circle", "ellipse"] = "streak"
        if self.mw.dynamo_circle_running:
            mode_dynamo = "circle"
        elif getattr(self.mw, "dynamo_ellipse_running", False):
            mode_dynamo = "ellipse"
        try:
            theta_1, theta_2 = mm.get_theta()
            nx1_d, ny1_d, nx2_d, ny2_d = mm.get_positions(mode_dynamo, theta_1, theta_2)
        except Exception:
            nx1_d, ny1_d, nx2_d, ny2_d = 0.5, 0.5, 0.5, 0.5
        use_180 = getattr(self.mw, "dynamo_180_running", False)
        self.mw._dynamo_lerp_current = [
            (nx1_d, ny1_d),
            (nx2_d, ny2_d) if use_180 else (nx1_d, ny1_d),
        ]
        self.mw._dynamo_motion_stop.clear()
        self.mw._dynamo_motion_thread = threading.Thread(
            target=self._run_dynamo_motion_loop,
            daemon=True,
        )
        self.mw._dynamo_motion_thread.start()

    def _stop_dynamo_motion_thread(self) -> None:
        """Arrête le thread de mouvement Dynamo et réapplique la position du pad."""
        self.mw._dynamo_motion_stop.set()
        if self.mw._dynamo_motion_thread is not None:
            self.mw._dynamo_motion_thread.join(timeout=0.5)
            self.mw._dynamo_motion_thread = None
        self.on_dynamo_xy_change(self.mw.dynamo_xy_last_x, self.mw.dynamo_xy_last_y)

    def on_dynamo_xy_change(self, nx: float, ny: float) -> None:
        self.mw.dynamo_xy_last_x = max(0.0, min(1.0, float(nx)))
        self.mw.dynamo_xy_last_y = max(0.0, min(1.0, float(ny)))
        # Si mode auto Dynamo actif, ne pas envoyer DMX (évite collision avec le thread de mouvement)
        if getattr(self.mw, "dynamo_active", False):
            return
        # Dynamo 1 = position pad ; Dynamo 2 = position miroir si 180° coché, sinon même que Dynamo 1
        use_180 = getattr(self.mw, "dynamo_180_running", False)
        x, y = self.mw.dynamo_xy_last_x, self.mw.dynamo_xy_last_y
        for i, fx in enumerate(self.mw.dynamo):
            try:
                if i == 1 and use_180:
                    nx_i, ny_i = 1.0 - x, 1.0 - y
                else:
                    nx_i, ny_i = x, y
                cal = self._get_dynamo_calibration(i)
                pan16, tilt16 = _apply_dynamo_calibration(nx_i, ny_i, cal)
                fx.set_pan_tilt_16bit(pan16, tilt16)
            except Exception:
                pass

    def on_dynamo_speed_change(self, value: float) -> None:
        # Slider 0 = lent, 1 = rapide. Canal Dynamo inversé : 0 = vitesse max, 255 = vitesse faible.
        v_raw = max(0, min(255, int(round(float(value) * 255.0))))
        v_dmx = 255 - v_raw
        self.mw.dynamo_motion_speed = max(0.0, min(1.0, float(value)))
        for fx in self.mw.dynamo:
            try:
                fx.set_speed(v_dmx)
            except Exception:
                pass

    def on_dynamo_dimmer_change(self, value: float) -> None:
        v = max(0, min(255, int(round(float(value) * 255.0))))
        for fx in self.mw.dynamo:
            try:
                fx.set_dimmer(v)
            except Exception:
                pass

    def on_dynamo_strobe_change(self, value: float) -> None:
        v = max(0, min(255, int(round(float(value) * 255.0))))
        for fx in self.mw.dynamo:
            try:
                fx.set_strobe(v)
            except Exception:
                pass

    def on_dynamo_center(self) -> None:
        self.mw.dynamo_xy_last_x = 0.5
        self.mw.dynamo_xy_last_y = 0.5
        for i, fx in enumerate(self.mw.dynamo):
            try:
                cal = self._get_dynamo_calibration(i)
                pan16, tilt16 = _apply_dynamo_calibration(0.5, 0.5, cal)
                fx.set_pan_tilt_16bit(pan16, tilt16)
            except Exception:
                pass
        try:
            self.mw.dynam_scan_card.xy_pad.set_lyre_positions(0.5, 0.5, 0.5, 0.5)
        except Exception:
            pass

    def on_dynamo_recall_position(self, index: int) -> None:
        """Rappelle le preset P1–P4 Dynamo (position, amplitude, 180°, couleur, gobo, dimmer, strobe, auto) et l'envoie au fixture. Stoppe 8/Circle/Ellipse si actif."""
        if self.mw.dynamo_streak_running or self.mw.dynamo_circle_running or getattr(self.mw, "dynamo_ellipse_running", False):
            self.mw.dynamo_streak_running = False
            self.mw.dynamo_circle_running = False
            self.mw.dynamo_ellipse_running = False
            self._stop_dynamo_motion_thread()
            self._update_streak_circle_buttons()
        mem = getattr(self.mw, "dynamo_xy_memory", [None, None, None, None])
        if index < 0 or index >= len(mem) or mem[index] is None:
            return
        entry = mem[index]
        if isinstance(entry, dict):
            nx = max(0.0, min(1.0, float(entry.get("x", 0.5))))
            ny = max(0.0, min(1.0, float(entry.get("y", 0.5))))
            amplitude = max(0.05, min(0.5, float(entry.get("amplitude", 0.2))))
            use_180 = bool(entry.get("use_180", False))
            color_id = entry.get("color_id")
            gobo_id = entry.get("gobo_id")
            dimmer = max(0.0, min(1.0, float(entry.get("dimmer", 1.0))))
            strobe = max(0.0, min(1.0, float(entry.get("strobe", 0.0))))
            auto_color = bool(entry.get("auto_color", False))
            auto_gobo = bool(entry.get("auto_gobo", False))
        else:
            nx = max(0.0, min(1.0, float(entry[0])))
            ny = max(0.0, min(1.0, float(entry[1])))
            amplitude = 0.2
            use_180 = False
            color_id = gobo_id = None
            dimmer, strobe = 1.0, 0.0
            auto_color = auto_gobo = False
        self.mw.dynamo_xy_last_x = nx
        self.mw.dynamo_xy_last_y = ny
        try:
            self.mw.dynam_scan_card.xy_pad.set_normalized(nx, ny)
        except Exception:
            pass
        self.on_dynamo_xy_change(nx, ny)
        self.mw.dynamo_180_running = use_180
        try:
            self.mw.dynam_scan_card.angle_180_var.set(use_180)
        except Exception:
            pass
        self.mw._dynamo_amplitude = amplitude
        try:
            self.mw.dynam_scan_card.amplitude_slider.set(_dynamo_slider_from_amplitude(amplitude))
        except Exception:
            pass
        if self.mw.dynamo_streak_running or self.mw.dynamo_circle_running or self.mw.dynamo_ellipse_running:
            self.mw._motion_manager.set_amplitude(amplitude)
        self.mw.dynamo_auto_color_sync = auto_color
        self.mw.dynamo_auto_gobo_sync = auto_gobo
        try:
            self.mw.dynam_scan_card.auto_color_var.set(auto_color)
            self.mw.dynam_scan_card.auto_gobo_var.set(auto_gobo)
        except Exception:
            pass
        try:
            self.mw.dynam_scan_card.set_dimmer_value(dimmer)
            self.mw.dynam_scan_card.set_strobe_value(strobe)
            self.mw.on_dynamo_dimmer_change(dimmer)
            self.mw.on_dynamo_strobe_change(strobe)
        except Exception:
            pass
        if color_id and color_id in SPOT_COLOR_VALUES:
            try:
                self.mw.dynam_scan_card.set_active_color_key(color_id)
                self.on_dynamo_color_select(color_id)
            except Exception:
                pass
        if gobo_id and gobo_id in SPOT_GOBO_VALUES:
            try:
                self.mw.dynam_scan_card.set_active_gobo(gobo_id)
                self.on_dynamo_gobo_select(gobo_id)
            except Exception:
                pass
        try:
            self.mw.dynam_scan_card.set_active_position_index(index)
        except Exception:
            pass

    def on_dynamo_streak_start(self) -> None:
        if self.mw.dynamo_streak_running:
            return
        self.mw.dynamo_circle_running = False
        self.mw.dynamo_ellipse_running = False
        # Toujours démarrer depuis le centre (0.5, 0.5)
        self.mw.dynamo_xy_last_x, self.mw.dynamo_xy_last_y = 0.5, 0.5
        try:
            self.mw.dynam_scan_card.xy_pad.set_normalized(0.5, 0.5)
        except Exception:
            pass
        self.mw._motion_manager.set_center(0.5, 0.5)
        self.mw._motion_manager.set_amplitude(getattr(self.mw, "_dynamo_amplitude", 0.2))
        self.mw._motion_manager.reset_time()
        self.mw.dynamo_streak_running = True
        if self.mw._auto_motion_after_id:
            self.mw.after_cancel(self.mw._auto_motion_after_id)
            self.mw._auto_motion_after_id = None
        self._start_dynamo_motion_thread()
        self.mw.update_all_motions()
        self._update_streak_circle_buttons()

    def on_dynamo_streak_toggle(self) -> None:
        if self.mw.dynamo_streak_running:
            self.mw.dynamo_streak_running = False
            self._stop_dynamo_motion_thread()
        else:
            self.on_dynamo_streak_start()
        self._update_streak_circle_buttons()

    def on_dynamo_circle_start(self) -> None:
        if self.mw.dynamo_circle_running:
            return
        self.mw.dynamo_streak_running = False
        self.mw.dynamo_ellipse_running = False
        # Toujours démarrer depuis le centre (0.5, 0.5)
        self.mw.dynamo_xy_last_x, self.mw.dynamo_xy_last_y = 0.5, 0.5
        try:
            self.mw.dynam_scan_card.xy_pad.set_normalized(0.5, 0.5)
        except Exception:
            pass
        self.mw._motion_manager.set_center(0.5, 0.5)
        self.mw._motion_manager.set_amplitude(getattr(self.mw, "_dynamo_amplitude", 0.2))
        self.mw._motion_manager.reset_time()
        self.mw.dynamo_circle_running = True
        if self.mw._auto_motion_after_id:
            self.mw.after_cancel(self.mw._auto_motion_after_id)
            self.mw._auto_motion_after_id = None
        self._start_dynamo_motion_thread()
        self.mw.update_all_motions()
        self._update_streak_circle_buttons()

    def on_dynamo_circle_toggle(self) -> None:
        if self.mw.dynamo_circle_running:
            self.mw.dynamo_circle_running = False
            self._stop_dynamo_motion_thread()
        else:
            self.on_dynamo_circle_start()
        self._update_streak_circle_buttons()

    def on_dynamo_ellipse_start(self) -> None:
        if self.mw.dynamo_ellipse_running:
            return
        self.mw.dynamo_streak_running = False
        self.mw.dynamo_circle_running = False
        # Toujours démarrer depuis le centre (0.5, 0.5)
        self.mw.dynamo_xy_last_x, self.mw.dynamo_xy_last_y = 0.5, 0.5
        try:
            self.mw.dynam_scan_card.xy_pad.set_normalized(0.5, 0.5)
        except Exception:
            pass
        self.mw._motion_manager.set_center(0.5, 0.5)
        self.mw._motion_manager.set_amplitude(getattr(self.mw, "_dynamo_amplitude", 0.2))
        self.mw._motion_manager.reset_time()
        self.mw.dynamo_ellipse_running = True
        if self.mw._auto_motion_after_id:
            self.mw.after_cancel(self.mw._auto_motion_after_id)
            self.mw._auto_motion_after_id = None
        self._start_dynamo_motion_thread()
        self.mw.update_all_motions()
        self._update_streak_circle_buttons()

    def on_dynamo_ellipse_toggle(self) -> None:
        if self.mw.dynamo_ellipse_running:
            self.mw.dynamo_ellipse_running = False
            self._stop_dynamo_motion_thread()
        else:
            self.on_dynamo_ellipse_start()
        self._update_streak_circle_buttons()

    def on_dynamo_180_toggle(self) -> None:
        if getattr(self.mw, "dynamo_180_running", False):
            self.mw.dynamo_180_running = False
        else:
            self.mw.dynamo_180_running = True
        # Ne pas toucher à angle_180_var (déjà mis à jour par le clic) pour éviter double déclenchement
        self._update_streak_circle_buttons(skip_dynamo_180_sync=True)
        # En mode manuel : seule la Dynamo 2 change (position miroir) ; Dynamo 1 reste inchangée
        if not (self.mw.dynamo_streak_running or self.mw.dynamo_circle_running or getattr(self.mw, "dynamo_ellipse_running", False)):
            self.on_dynamo_xy_change(self.mw.dynamo_xy_last_x, self.mw.dynamo_xy_last_y)
        else:
            self.mw.update_all_motions()

    def on_dynamo_color_select(self, color_id: str) -> None:
        val = DYNAMO_COLOR_VALUES.get(color_id, SPOT_COLOR_VALUES.get(color_id, 0))
        for fx in self.mw.dynamo:
            try:
                fx.set_color_raw(val)
            except Exception:
                pass

    def on_dynamo_gobo_select(self, gobo_id: str) -> None:
        val = SPOT_GOBO_VALUES.get(gobo_id, 0)
        for fx in self.mw.dynamo:
            try:
                fx.set_gobo_raw(val)
            except Exception:
                pass

    def on_dynamo_gobo_shake(self) -> None:
        shake_val = SPOT_GOBO_VALUES.get("SHAKE", 80)
        for fx in self.mw.dynamo:
            try:
                fx.set_gobo_raw(shake_val)
            except Exception:
                pass

    # --- Wookie 200 R : OFF / AUTO / SOUND (Ch1) + Vitesse / Réactivité (Ch6) ---

    def on_wookie_mode_change(self, mode: str) -> None:
        from ui.components.wookie_card import MODE_OFF, MODE_AUTO, MODE_SOUND, MODE_DMX
        mode_to_ch1 = {"off": MODE_OFF, "auto": MODE_AUTO, "sound": MODE_SOUND, "dmx": MODE_DMX, "show": MODE_DMX}
        ch1 = mode_to_ch1.get(mode, MODE_OFF)
        pattern = 64 if mode == "show" else 0 if mode == "dmx" else None
        for fx in getattr(self.mw, "wookie", []):
            try:
                fx.set_mode_raw(ch1)
                fx.set_intensity(0 if mode == "off" else 255)
                if pattern is not None:
                    fx.set_pattern_raw(pattern)
            except Exception:
                pass

    def on_wookie_speed_change(self, value: float) -> None:
        v = max(0, min(255, int(round(float(value) * 255.0))))
        for fx in getattr(self.mw, "wookie", []):
            try:
                fx.set_speed(v)
            except Exception:
                pass

    # --- Ibiza LAS-30G : OFF/AUTO/SOUND (Ch1) + Zoom (Ch5) ---------------------

    def on_ibiza_mode_change(self, mode: str) -> None:
        from ui.components.ibiza_card import IBIZA_MODE_OFF, IBIZA_MODE_AUTO, IBIZA_MODE_SOUND
        ch1 = IBIZA_MODE_OFF if mode == "off" else (IBIZA_MODE_AUTO if mode == "auto" else IBIZA_MODE_SOUND)
        for fx in getattr(self.mw, "ibiza", []):
            try:
                fx.set_mode_raw(ch1)
            except Exception:
                pass

    def on_ibiza_zoom_change(self, value: float) -> None:
        v = max(0, min(255, int(round(float(value) * 255.0))))
        for fx in getattr(self.mw, "ibiza", []):
            try:
                fx.set_zoom_raw(v)
            except Exception:
                pass

    # --- Xtrem LED : STOP/SLOW/PARTY (Ch1) + Intensité/Vitesse (Ch5) ----------------

    def on_xtrem_mode_change(self, mode: str) -> None:
        from ui.components.xtrem_card import (
            XTREM_MODE_STOP, XTREM_MODE_SLOW, XTREM_MODE_PARTY,
            XTREM_MODE_FADE, XTREM_MODE_JUMP,
        )
        mode_to_val = {
            "stop": XTREM_MODE_STOP, "slow": XTREM_MODE_SLOW, "party": XTREM_MODE_PARTY,
            "fade": XTREM_MODE_FADE, "jump": XTREM_MODE_JUMP,
        }
        ch1 = mode_to_val.get(mode, XTREM_MODE_STOP)
        for fx in getattr(self.mw, "xtrem", []):
            try:
                fx.set_mode_raw(ch1)
                fx.write_output()
            except Exception:
                pass

    def on_xtrem_speed_change(self, value: float) -> None:
        v = max(0, min(255, int(round(float(value) * 255.0))))
        for fx in getattr(self.mw, "xtrem", []):
            try:
                fx.set_speed_raw(v)
                fx.write_output()
            except Exception:
                pass
