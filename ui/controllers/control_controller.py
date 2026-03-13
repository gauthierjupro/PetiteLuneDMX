"""
Contrôleur de l'onglet Contrôle : blackout, master dimmer, ambiances (FLOODS/PARTY/Gigabar),
LINK, Master Card, Gigabar (couleur, dimmer, strobe, mode, effets).
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Optional, Tuple

from models.fixtures import Fixture, GigabarFixture8Ch, Gigabar5ChFixture
from ui.widgets.dmx_controls import update_button_style
from ui.widgets.gigabar_color_dialog import GigabarColorDialog

if TYPE_CHECKING:
    from ui.main_window import App


class ControlController:
    def __init__(self, main_window: App) -> None:
        self.mw = main_window

    def on_blackout(self) -> None:
        self.mw.blackout_active = not self.mw.blackout_active
        if self.mw.blackout_active:
            for fx in self.mw.fixtures:
                fx.blackout()
            try:
                self.mw.dmx.send()
            except Exception:
                pass
            # Réinitialiser les boutons actionnés de la page Contrôle (Rythme)
            self._reset_control_page_buttons()
            if self.mw.blackout_button is not None:
                self.mw.blackout_button.configure(fg_color="#1d4ed8", hover_color="#2563eb")
            if self.mw.blackout_status_label is not None:
                self.mw.blackout_status_label.configure(text="MODE NOIR ACTIF")
        else:
            if self.mw.blackout_button is not None:
                self.mw.blackout_button.configure(fg_color="#444444", hover_color="#555555")
            if self.mw.blackout_status_label is not None:
                self.mw.blackout_status_label.configure(text="")
            # Réappliquer l’état UI (dimmer, couleur) sur toutes les fixtures pour éviter lumière éteinte alors que l’UI affiche 100 %
            self._reapply_ambiance_from_ui()
        self.mw._update_group_vu_meters()

    def _reset_control_page_buttons(self) -> None:
        """Remet à zéro les boutons et sliders de la page Contrôle (Wookie, Ibiza, Xtrem)."""
        # Wookie : OFF, vitesse 0.5
        self.mw.wookie_mode = "off"
        self.mw.wookie_speed = 0.5
        if getattr(self.mw, "wookie_card", None) is not None:
            self.mw.wookie_card.set_mode("off")
            self.mw.wookie_card.set_speed_value(0.5)
        self.mw.spot_controller.on_wookie_mode_change("off")
        self.mw.spot_controller.on_wookie_speed_change(0.5)
        # Ibiza : OFF, zoom 0.5
        self.mw.ibiza_mode = "off"
        self.mw.ibiza_zoom = 0.5
        if getattr(self.mw, "ibiza_card", None) is not None:
            self.mw.ibiza_card.set_mode("off")
            self.mw.ibiza_card.set_zoom_value(0.5)
        self.mw.spot_controller.on_ibiza_mode_change("off")
        self.mw.spot_controller.on_ibiza_zoom_change(0.5)
        # Xtrem : STOP, vitesse 0.5, Intensité BPM désactivée
        self.mw.xtrem_mode = "stop"
        self.mw.xtrem_speed = 0.5
        self.mw.xtrem_bpm_pulse = False
        if getattr(self.mw, "xtrem_card", None) is not None:
            self.mw.xtrem_card.set_mode("stop")
            self.mw.xtrem_card.set_speed_value(0.5)
            self.mw.xtrem_card.set_bpm_pulse(False)
        self.mw.spot_controller.on_xtrem_mode_change("stop")
        self.mw.spot_controller.on_xtrem_speed_change(0.5)

    def on_laser_safety(self) -> None:
        from models.fixtures import LaserFixture

        LaserFixture.safety_locked = True
        for fx in self.mw.fixtures:
            if isinstance(fx, LaserFixture):
                fx.set_off()

    def on_master_dimmer_change(self, value: float) -> None:
        new = max(0.0, min(1.0, float(value)))
        prev = self.mw.master_dimmer_factor
        if abs(new - prev) < 1e-3:
            return
        for fx in self.mw.fixtures:
            fx.master_factor = max(0.0, min(1.0, new))
            fx.recalculate_output()
            try:
                fx.apply_master_dimmer(new, prev)
            except Exception:
                pass
        self.mw.master_dimmer_factor = new
        self._update_group_vu_meters()
        if getattr(self.mw, "spot_card", None) is not None:
            try:
                self.mw.spot_card.update_out(self.mw.master_dimmer_factor)
            except Exception:
                pass
        if getattr(self.mw, "dynam_scan_card", None) is not None:
            try:
                self.mw.dynam_scan_card.update_out(self.mw.master_dimmer_factor)
            except Exception:
                pass
        # DEBUG DMX: vérifier que les canaux changent quand on bouge le master
        try:
            snap = getattr(self.mw.dmx, "get_universe_snapshot", lambda n=20: [])(20)
            if snap:
                print("DMX canaux 1-20:", snap)
        except Exception:
            pass

    def on_ambience_color(self, group: str, rgb: Tuple[int, int, int]) -> None:
        r, g, b = rgb
        has = max(r, g, b) > 0
        target_groups: list[tuple[str, list[Fixture]]] = []
        linked_floods = bool(getattr(self.mw, "link_floods_switch", None) and self.mw.link_floods_switch.get())
        linked_party = bool(getattr(self.mw, "link_party_switch", None) and self.mw.link_party_switch.get())
        linked_gigabar = bool(getattr(self.mw, "link_gigabar_switch", None) and self.mw.link_gigabar_switch.get())

        if group == "FLOODS":
            if linked_floods:
                target_groups.append(("FLOODS", self.mw.floods))
                if linked_party:
                    target_groups.append(("PARTY", self.mw.party))
            else:
                target_groups.append(("FLOODS", self.mw.floods))
        elif group == "PARTY":
            if linked_party:
                target_groups.append(("PARTY", self.mw.party))
                if linked_floods:
                    target_groups.append(("FLOODS", self.mw.floods))
            else:
                target_groups.append(("PARTY", self.mw.party))

        if linked_gigabar and self.mw.gigabars:
            target_groups.append(("GIGABAR", self.mw.gigabars))

        for _name, fixtures in target_groups:
            for fx in fixtures:
                try:
                    if isinstance(fx, GigabarFixture8Ch):
                        fx.set_mode(0)
                        fx.set_color(r, g, b)
                    elif isinstance(fx, Gigabar5ChFixture):
                        fx.set_dimmer(255 if has else 0)
                        fx.set_color(r, g, b)
                    else:
                        fx.set_dimmer(255 if has else 0)
                        fx.set_color(r, g, b)
                except Exception:
                    pass
        self._update_group_vu_meters()

    def on_group_strobe_change(self, group: str, value: float) -> None:
        v = max(0.0, min(1.0, float(value)))
        strobe_val = int(v * 255)
        target_groups: list[list[Fixture]] = []
        linked_floods = bool(getattr(self.mw, "link_floods_switch", None) and self.mw.link_floods_switch.get())
        linked_party = bool(getattr(self.mw, "link_party_switch", None) and self.mw.link_party_switch.get())

        if group == "FLOODS":
            if linked_floods:
                target_groups.append(self.mw.floods)
                if linked_party:
                    target_groups.append(self.mw.party)
            else:
                target_groups.append(self.mw.floods)
        elif group == "PARTY":
            if linked_party:
                target_groups.append(self.mw.party)
                if linked_floods:
                    target_groups.append(self.mw.floods)
            else:
                target_groups.append(self.mw.party)

        for fixtures in target_groups:
            for fx in fixtures:
                try:
                    fx.set_strobe(strobe_val)
                except Exception:
                    pass

    def on_group_dim_change(self, group: str, value: float) -> None:
        level = max(0.0, min(1.0, float(value)))
        linked_floods = bool(getattr(self.mw, "link_floods_switch", None) and self.mw.link_floods_switch.get())
        linked_party = bool(getattr(self.mw, "link_party_switch", None) and self.mw.link_party_switch.get())
        linked_gigabar = bool(getattr(self.mw, "link_gigabar_switch", None) and self.mw.link_gigabar_switch.get())

        if group == "FLOODS" or (group == "PARTY" and linked_party and linked_floods):
            self.mw.floods_group_value = level
            for fx in self.mw.floods:
                try:
                    fx.group_dimmer = level
                    fx.recalculate_output()
                except Exception:
                    pass
        if group == "PARTY" or (group == "FLOODS" and linked_floods and linked_party):
            self.mw.party_group_value = level
            for fx in self.mw.party:
                try:
                    fx.group_dimmer = level
                    fx.recalculate_output()
                except Exception:
                    pass

        if linked_gigabar and self.mw.gigabars:
            dim_val = int(level * 255)
            for fx in self.mw.gigabars:
                if isinstance(fx, (GigabarFixture8Ch, Gigabar5ChFixture)):
                    try:
                        fx.set_dimmer(dim_val)
                    except Exception:
                        pass
            if self.mw.gigabar_card is not None:
                try:
                    self.mw.gigabar_card.set_dimmer_value(dim_val)
                except Exception:
                    pass

        self._update_group_vu_meters()

    def on_master_amb_color(self, rgb: Tuple[int, int, int]) -> None:
        if getattr(self.mw, "link_floods_switch", None) and self.mw.link_floods_switch.get():
            self.on_ambience_color("FLOODS", rgb)
        if getattr(self.mw, "link_party_switch", None) and self.mw.link_party_switch.get():
            self.on_ambience_color("PARTY", rgb)
        if getattr(self.mw, "link_gigabar_switch", None) and self.mw.link_gigabar_switch.get():
            self.on_ambience_color("GIGABAR", rgb)

    def on_master_amb_dim(self, value: float) -> None:
        if getattr(self.mw, "link_floods_switch", None) and self.mw.link_floods_switch.get():
            self.on_group_dim_change("FLOODS", value)
        if getattr(self.mw, "link_party_switch", None) and self.mw.link_party_switch.get():
            self.on_group_dim_change("PARTY", value)
        if getattr(self.mw, "link_gigabar_switch", None) and self.mw.link_gigabar_switch.get() and self.mw.gigabar_card is not None:
            try:
                self.on_gigabar_dimmer_change(int(value * 255))
            except Exception:
                pass

    def on_master_amb_strobe(self, value: float) -> None:
        if getattr(self.mw, "link_floods_switch", None) and self.mw.link_floods_switch.get():
            self.on_group_strobe_change("FLOODS", value)
        if getattr(self.mw, "link_party_switch", None) and self.mw.link_party_switch.get():
            self.on_group_strobe_change("PARTY", value)
        if getattr(self.mw, "link_gigabar_switch", None) and self.mw.link_gigabar_switch.get() and self.mw.gigabar_card is not None:
            try:
                self.on_gigabar_strobe_change(int(value * 255))
            except Exception:
                pass

    def on_master_preset_apply(self, index: int) -> None:
        rgb = None
        if hasattr(self.mw, "floods_group") and self.mw.floods_group and 0 <= index < len(getattr(self.mw.floods_group, "user_presets", [])):
            rgb = self.mw.floods_group.user_presets[index]
        if rgb is None and hasattr(self.mw, "party_group") and self.mw.party_group and 0 <= index < len(getattr(self.mw.party_group, "user_presets", [])):
            rgb = self.mw.party_group.user_presets[index]
        if rgb is None and hasattr(self.mw, "gigabar_card") and self.mw.gigabar_card and 0 <= index < len(getattr(self.mw.gigabar_card, "user_colors", [])):
            rgb = tuple(self.mw.gigabar_card.user_colors[index])
        if rgb is not None:
            self.on_master_amb_color(rgb)

    def on_master_preset_config(self, index: int) -> None:
        initial = None
        if hasattr(self.mw, "floods_group") and self.mw.floods_group and 0 <= index < len(getattr(self.mw.floods_group, "user_presets", [])):
            initial = self.mw.floods_group.user_presets[index]
        if initial is None and hasattr(self.mw, "party_group") and self.mw.party_group:
            initial = self.mw.party_group.user_presets[index] if index < len(getattr(self.mw.party_group, "user_presets", [])) else None
        if initial is None:
            initial = (255, 255, 255)
        result = [initial]

        def _apply(r: int, g: int, b: int) -> None:
            result[0] = (r, g, b)
            if hasattr(self.mw, "floods_group") and self.mw.floods_group and 0 <= index < len(self.mw.floods_group.user_presets):
                self.mw.floods_group.user_presets[index] = (r, g, b)
                if index < len(self.mw.floods_group.user_preset_buttons):
                    btn = self.mw.floods_group.user_preset_buttons[index]
                    color_hex = "#{:02x}{:02x}{:02x}".format(r, g, b)
                    btn._base_color = color_hex
                    update_button_style(btn, color_hex, False)
            if hasattr(self.mw, "party_group") and self.mw.party_group and 0 <= index < len(self.mw.party_group.user_presets):
                self.mw.party_group.user_presets[index] = (r, g, b)
                if index < len(self.mw.party_group.user_preset_buttons):
                    btn = self.mw.party_group.user_preset_buttons[index]
                    color_hex = "#{:02x}{:02x}{:02x}".format(r, g, b)
                    btn._base_color = color_hex
                    update_button_style(btn, color_hex, False)
            if hasattr(self.mw, "gigabar_card") and self.mw.gigabar_card and index < len(self.mw.gigabar_card.user_colors):
                self.mw.gigabar_card.update_user_button(index, r, g, b)
            if self.mw.master_amb_card is not None:
                self.mw.master_amb_card.update_preset_button(index, r, g, b)
            self.on_master_amb_color((r, g, b))

        dlg = GigabarColorDialog(self.mw, initial_rgb=initial, on_change=_apply)
        self.mw.wait_window(dlg)
        if dlg.result is not None:
            _apply(*dlg.result)

    def on_master_amb_logic_mode(self, mode_name: str) -> None:
        for group_ui, link_switch in [
            (self.mw.floods_group, getattr(self.mw, "link_floods_switch", None)),
            (self.mw.party_group, getattr(self.mw, "link_party_switch", None)),
        ]:
            if group_ui is None or link_switch is None or not link_switch.get():
                continue
            try:
                group_ui._on_logic_mode_clicked(mode_name)
            except Exception:
                pass
        if getattr(self.mw, "link_gigabar_switch", None) and self.mw.link_gigabar_switch.get():
            if mode_name == "MANUAL":
                self.on_gigabar_effect("none")
            elif mode_name == "RAINBOW":
                self.on_gigabar_effect("rainbow")
            elif mode_name == "PULSE":
                self.on_gigabar_effect("pulse")
        self._reapply_ambiance_from_ui()

    def on_master_detach_gigabar(self) -> None:
        if getattr(self.mw, "link_gigabar_switch", None):
            try:
                self.mw.link_gigabar_switch.deselect()
            except Exception:
                pass
        self.mw.link_gigabar = False
        self._on_link_switch_changed()
        self._update_group_vu_meters()

    def _on_link_switch_changed(self) -> None:
        self.mw.link_floods = bool(self.mw.link_floods_switch.get()) if hasattr(self.mw, "link_floods_switch") else False
        self.mw.link_party = bool(self.mw.link_party_switch.get()) if hasattr(self.mw, "link_party_switch") else False
        self.mw.link_gigabar = bool(self.mw.link_gigabar_switch.get()) if hasattr(self.mw, "link_gigabar_switch") else False

        if self.mw.gigabar_card is not None:
            autonomous = False
            if self.mw.gigabars:
                fx = self.mw.gigabars[0]
                try:
                    if isinstance(fx, GigabarFixture8Ch):
                        mode_val = self.mw.dmx.get_channel(fx.address + 1)
                        autonomous = mode_val not in (0,)
                except Exception:
                    autonomous = False
            self.mw.gigabar_card.set_link_state(linked=self.mw.link_gigabar and not autonomous, autonomous=autonomous)

        self._update_master_ambience_layout()

    def _update_master_ambience_layout(self) -> None:
        if self.mw.master_amb_card is None:
            return
        linked_indices: list[int] = []
        if getattr(self.mw, "link_floods_switch", None) and self.mw.link_floods_switch.get():
            linked_indices.append(0)
        if getattr(self.mw, "link_party_switch", None) and self.mw.link_party_switch.get():
            linked_indices.append(1)
        if getattr(self.mw, "link_gigabar_switch", None) and self.mw.link_gigabar_switch.get():
            linked_indices.append(2)

        if len(linked_indices) < 2:
            try:
                self.mw.master_amb_card.grid_remove()
            except Exception:
                pass
            if self.mw.floods_group is not None:
                self.mw.floods_group.grid(row=1, column=0, padx=(0, 4), pady=4, sticky="nw")
            if self.mw.party_group is not None:
                self.mw.party_group.grid(row=1, column=1, padx=4, pady=4, sticky="nw")
            if self.mw.gigabar_card is not None:
                self.mw.gigabar_card.grid(row=1, column=2, padx=4, pady=4, sticky="nw")
            return

        if self.mw.floods_group is not None:
            if 0 in linked_indices:
                self.mw.floods_group.grid_remove()
            else:
                self.mw.floods_group.grid(row=1, column=0, padx=(0, 4), pady=4, sticky="nw")
        if self.mw.party_group is not None:
            if 1 in linked_indices:
                self.mw.party_group.grid_remove()
            else:
                self.mw.party_group.grid(row=1, column=1, padx=4, pady=4, sticky="nw")
        if self.mw.gigabar_card is not None:
            if 2 in linked_indices:
                self.mw.gigabar_card.grid_remove()
            else:
                self.mw.gigabar_card.grid(row=1, column=2, padx=4, pady=4, sticky="nw")

        start_col = min(linked_indices)
        span = max(1, len(linked_indices))
        try:
            self.mw.master_amb_card.grid(
                row=1, column=start_col, columnspan=span, padx=4, pady=4, sticky="nw",
            )
        except Exception:
            pass

    def _update_group_vu_meters(self) -> None:
        real_master = max(0.0, min(1.0, self.mw.master_dimmer_factor))
        if self.mw.floods_group is not None:
            self.mw.floods_group.update_dmx(real_master)
        if self.mw.party_group is not None:
            self.mw.party_group.update_dmx(real_master)
        if self.mw.gigabar_card is not None:
            try:
                self.mw.gigabar_card.update_dmx(real_master)
            except Exception:
                pass

    def _reapply_ambiance_from_ui(self, groups: Optional[Tuple[str, ...]] = None) -> None:
        """
        Réapplique l’état actuel de l’UI (sliders, couleurs) sur les fixtures ambiance.
        groups: None = tous (FLOODS, PARTY, GIGABAR), sinon uniquement les groupes listés.
        À appeler après sortie de blackout ou changement de mode.
        """
        if groups is None:
            groups = ("FLOODS", "PARTY", "GIGABAR")
        # FLOODS
        if "FLOODS" in groups and self.mw.floods_group is not None and self.mw.floods:
            rgb = getattr(self.mw.floods_group, "current_rgb", (0, 0, 0))
            if rgb == (0, 0, 0):
                rgb = (255, 255, 255)
            self.on_ambience_color("FLOODS", rgb)
            level = max(0.0, min(1.0, float(self.mw.floods_group.slider.get())))
            self.on_group_dim_change("FLOODS", level)
        # PARTY
        if "PARTY" in groups and self.mw.party_group is not None and self.mw.party:
            rgb = getattr(self.mw.party_group, "current_rgb", (0, 0, 0))
            if rgb == (0, 0, 0):
                rgb = (255, 255, 255)
            self.on_ambience_color("PARTY", rgb)
            level = max(0.0, min(1.0, float(self.mw.party_group.slider.get())))
            self.on_group_dim_change("PARTY", level)
        # Gigabar : couleur de base + dimmer + mode manuel (0)
        if "GIGABAR" in groups and self.mw.gigabar_card is not None and self.mw.gigabars:
            r, g, b = getattr(self.mw, "gigabar_base_color", (255, 255, 255))[:3]
            self._apply_gigabar_color_static(r, g, b)
            try:
                dim_val = int(max(0, min(255, float(self.mw.gigabar_card.dimmer_slider.get()))))
                self.on_gigabar_dimmer_change(dim_val)
            except Exception:
                pass
            try:
                strobe_val = int(max(0, min(255, float(self.mw.gigabar_card.strobe_slider.get()))))
                self.on_gigabar_strobe_change(strobe_val)
            except Exception:
                pass
        try:
            self.mw.dmx.send()
        except Exception:
            pass

    def on_pick_gigabar_color(self) -> None:
        initial = getattr(self.mw, "gigabar_base_color", (255, 255, 255))

        def _apply_live(r: int, g: int, b: int) -> None:
            self.mw.gigabar_base_color = (r, g, b)
            if self.mw.gigabar_card is not None:
                self.mw.gigabar_card.set_base_color(r, g, b)
            self._apply_gigabar_color_static(r, g, b)

        dlg = GigabarColorDialog(self.mw, initial_rgb=initial, on_change=_apply_live)
        self.mw.wait_window(dlg)

    def update_gigabar_user_button(self, idx: int) -> None:
        if 0 <= idx < len(self.mw.gigabar_user_colors) and self.mw.gigabar_card is not None:
            color = self.mw.gigabar_user_colors[idx]
            if color is None:
                self.mw.gigabar_card.update_user_button(idx, 75, 85, 99)
            else:
                r, g, b = color
                self.mw.gigabar_card.update_user_button(idx, r, g, b)

    def on_gigabar_user_color_click(self, idx: int) -> None:
        if not (0 <= idx < len(self.mw.gigabar_user_colors)):
            return
        color = self.mw.gigabar_user_colors[idx]
        if color is None:
            return
        r, g, b = color
        self.on_gigabar_preset_color((r, g, b))

    def on_gigabar_user_color_config(self, idx: int) -> None:
        if not (0 <= idx < len(self.mw.gigabar_user_colors)):
            return
        initial = self.mw.gigabar_user_colors[idx] or self.mw.gigabar_base_color

        def _apply_live(r: int, g: int, b: int) -> None:
            self.mw.gigabar_base_color = (r, g, b)
            if self.mw.gigabar_card is not None:
                self.mw.gigabar_card.set_base_color(r, g, b)
            self._apply_gigabar_color_static(r, g, b)

        dlg = GigabarColorDialog(self.mw, initial_rgb=initial, on_change=_apply_live)
        self.mw.wait_window(dlg)
        if dlg.result is None:
            return
        self.mw.gigabar_user_colors[idx] = dlg.result
        self.update_gigabar_user_button(idx)

    def on_gigabar_preset_color(self, rgb: Tuple[int, int, int]) -> None:
        r, g, b = rgb
        self.mw.gigabar_base_color = (r, g, b)
        if self.mw.gigabar_card is not None:
            self.mw.gigabar_card.set_base_color(r, g, b)
        self._apply_gigabar_color_static(r, g, b)

    def _apply_gigabar_color_static(self, r: int, g: int, b: int) -> None:
        for fx in self.mw.gigabars:
            if isinstance(fx, GigabarFixture8Ch):
                fx.set_mode(0)
                fx.set_color(r, g, b)
            elif isinstance(fx, Gigabar5ChFixture):
                fx.set_color(r, g, b)
            else:
                fx.set_color(r, g, b)

    def on_gigabar_dimmer_change(self, value: int) -> None:
        for fx in self.mw.gigabars:
            if isinstance(fx, (GigabarFixture8Ch, Gigabar5ChFixture)):
                fx.set_dimmer(value)
        if self.mw.gigabar_card is not None:
            try:
                self.mw.gigabar_card.set_dimmer_value(value)
            except Exception:
                pass

    def on_gigabar_strobe_change(self, value: int) -> None:
        for fx in self.mw.gigabars:
            if isinstance(fx, (GigabarFixture8Ch, Gigabar5ChFixture)):
                fx.set_strobe(value)

    def on_gigabar_mode_change(self, value: int) -> None:
        for fx in self.mw.gigabars:
            if isinstance(fx, GigabarFixture8Ch):
                fx.set_mode(value)
        if value != 0 and hasattr(self.mw, "link_gigabar_switch"):
            try:
                self.mw.link_gigabar_switch.deselect()
            except Exception:
                pass
            self.mw.link_gigabar = False
            if self.mw.gigabar_card is not None:
                self.mw.gigabar_card.set_link_state(linked=False, autonomous=True)
        elif value == 0 and hasattr(self.mw, "link_gigabar_switch"):
            self.mw.link_gigabar = bool(self.mw.link_gigabar_switch.get())
            if self.mw.gigabar_card is not None:
                self.mw.gigabar_card.set_link_state(linked=self.mw.link_gigabar, autonomous=False)

    def on_gigabar_effect(self, mode: str) -> None:
        r, g, b = self.mw.gigabar_base_color
        # Les 3 modes (Manuel, Pulse, Rainbow) fonctionnent comme Floods/Party : mode manuel (Ch2=0),
        # dimmer/strobe/couleur pilotés par l'app (rhythm_controller selon BPM/audio).
        for fx in self.mw.gigabars:
            if isinstance(fx, Gigabar5ChFixture):
                fx.set_color(r, g, b)
                fx.set_dimmer(255)
                fx.set_strobe(0)
            elif isinstance(fx, GigabarFixture8Ch):
                fx.set_mode(0)
                fx.set_color(r, g, b)
                fx.set_dimmer(255)
                fx.set_strobe(0)
            else:
                if mode == "none":
                    fx.set_color(r, g, b)
                elif mode == "chenillard":
                    fx.set_mode_chenillard(r, g, b)
                elif mode == "rainbow":
                    fx.set_mode_rainbow()
                elif mode == "pulse":
                    fx.set_mode_pulse(r, g, b)

        if self.mw.gigabar_card is not None:
            self.mw.gigabar_card.set_active_mode(mode)
