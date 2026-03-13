"""
Contrôleur Rythme / Audio : BPM manuel, source audio, mode Off/Audio/BPM, mise à jour VU/beat.
"""

from __future__ import annotations

import time
from typing import TYPE_CHECKING, Optional

from core.audio_sync import XtremAudioSync
from models.fixtures import GigabarFixture8Ch, Gigabar5ChFixture

if TYPE_CHECKING:
    from ui.main_window import App


class RhythmController:
    def __init__(self, main_window: App) -> None:
        self.mw = main_window

    def _get_selected_audio_input_index(self) -> Optional[int]:
        if self.mw.rhythm_card is None:
            return None
        return self.mw.rhythm_card.get_selected_input_index()

    def on_manual_bpm_slider_change(self, value: float) -> None:
        bpm = max(40.0, min(200.0, float(value)))
        self.mw.manual_bpm_value = bpm
        if self.mw.audio_mode != "BPM":
            self.mw.audio_mode = "BPM"
            if self.mw.rhythm_card is not None:
                self.mw.rhythm_card.set_audio_mode_segment("BPM")
            if self.mw.xtrem_audio_sync is not None:
                try:
                    self.mw.xtrem_audio_sync.stop()
                except Exception:
                    pass
                self.mw.xtrem_audio_sync = None
        self.mw.manual_bpm_enabled = True

    def on_audio_input_change(self, _choice: str) -> None:
        if not self.mw.xtrem:
            return
        idx = self._get_selected_audio_input_index()
        if self.mw.xtrem_audio_sync is not None:
            self.mw.xtrem_audio_sync.stop()
            self.mw.xtrem_audio_sync = None

        if self.mw.audio_mode == "Audio":
            self.mw.xtrem_audio_sync = XtremAudioSync(self.mw.xtrem, input_device_index=idx)
            self.mw.xtrem_audio_sync.start()

    def on_audio_mode_change(self, value: str) -> None:
        self.mw.audio_mode = value

        if self.mw.xtrem_audio_sync is not None:
            try:
                self.mw.xtrem_audio_sync.stop()
            except Exception:
                pass
            self.mw.xtrem_audio_sync = None

        if value == "Off":
            self.mw.manual_bpm_enabled = False
            self.mw.manual_bpm_value = 0.0
            self.mw._manual_last_beat_time = 0.0

        elif value == "Audio":
            self.mw.manual_bpm_enabled = False
            self.mw.manual_bpm_value = 0.0
            self.mw._manual_last_beat_time = 0.0
            if self.mw.xtrem:
                idx = self._get_selected_audio_input_index()
                self.mw.xtrem_audio_sync = XtremAudioSync(self.mw.xtrem, input_device_index=idx)
                self.mw.xtrem_audio_sync.start()

        elif value == "BPM":
            self.mw.manual_bpm_enabled = True

    def update_audio_visuals(self) -> None:
        now = time.time()
        level = 0.0
        is_beat = False
        bpm_val = 0.0
        last_beat_time = None  # pour proportionner le strobe à la période BPM

        if self.mw.xtrem_audio_sync is not None:
            try:
                level = float(self.mw.xtrem_audio_sync.get_level())
            except Exception:
                level = 0.0
            try:
                last_beat = float(self.mw.xtrem_audio_sync.get_last_beat_time())
            except Exception:
                last_beat = 0.0
            else:
                if last_beat > 0.0 and now - last_beat < 0.12:
                    is_beat = True
                    last_beat_time = last_beat
            try:
                bpm_val = float(self.mw.xtrem_audio_sync.get_bpm())
            except Exception:
                bpm_val = 0.0

        if self.mw.manual_bpm_enabled and self.mw.manual_bpm_value > 0.0:
            period = 60.0 / float(self.mw.manual_bpm_value)
            if self.mw._manual_last_beat_time <= 0.0:
                self.mw._manual_last_beat_time = now
            if now - self.mw._manual_last_beat_time >= period:
                self.mw._manual_last_beat_time = now
            if 0.0 <= now - self.mw._manual_last_beat_time < 0.12:
                is_beat = True
                last_beat_time = self.mw._manual_last_beat_time

        if is_beat and last_beat_time is not None:
            self.mw._pulse_last_beat_time = last_beat_time

        level = max(0.0, min(1.0, level))

        # Courbe Pulse (BPM) : T = 60/BPM, pilote UNIQUEMENT le DIMMER (intensité), pas le strobe
        # Triangle 0→1→0 sur une période pour un fondu fluide
        if self.mw.audio_mode in ("Audio", "BPM"):
            if self.mw.manual_bpm_enabled and self.mw.manual_bpm_value > 0.0:
                period_sec = 60.0 / float(self.mw.manual_bpm_value)
            elif bpm_val > 0.0:
                period_sec = 60.0 / bpm_val
            else:
                period_sec = 0.5
            pulse_start = getattr(self.mw, "_pulse_last_beat_time", 0.0)
            if period_sec > 0 and pulse_start > 0:
                t = (now - pulse_start) % period_sec
                x = t / period_sec  # 0..1 sur la période
                # Triangle : 0 → 1 → 0
                if x < 0.5:
                    pulse_dimmer_curve = 2.0 * x
                else:
                    pulse_dimmer_curve = 2.0 * (1.0 - x)
                pulse_dimmer_curve = max(0.0, min(1.0, pulse_dimmer_curve))
            else:
                pulse_dimmer_curve = 0.0
        else:
            pulse_dimmer_curve = 0.0
        # Exposer pour Xtrem « Intensité BPM » (carte Rythme)
        self.mw._pulse_dimmer_curve = pulse_dimmer_curve

        if self.mw.rhythm_card is not None:
            self.mw.rhythm_card.update_vu(level)
            self.mw.rhythm_card.update_beat(is_beat)
            if self.mw.manual_bpm_enabled and self.mw.manual_bpm_value > 0.0:
                bpm_text = f"BPM {int(round(self.mw.manual_bpm_value))} (M)"
            elif bpm_val > 0.0:
                bpm_text = f"BPM {int(round(bpm_val))}"
            else:
                bpm_text = "BPM --"
            self.mw.rhythm_card.set_bpm_label(bpm_text)

        for group_ui in (self.mw.floods_group, self.mw.party_group):
            if group_ui is None:
                continue
            try:
                mode = group_ui.audio_mode_var.get()
            except Exception:
                continue
            if hasattr(group_ui, "rhythm_beat_label"):
                if mode in ("BPM PULSE", "BPM DISCO") and is_beat:
                    group_ui.rhythm_beat_label.configure(fg_color="#22c55e")
                else:
                    group_ui.rhythm_beat_label.configure(fg_color="#111827")

        if self.mw.audio_mode in ("Audio", "BPM"):
            for group_ui, fixtures in [(self.mw.floods_group, self.mw.floods), (self.mw.party_group, self.mw.party)]:
                if group_ui is None or not fixtures:
                    continue
                try:
                    mode = group_ui.audio_mode_var.get()
                    threshold = group_ui.audio_sens_slider.get()
                except Exception:
                    continue

                if mode == "BPM PULSE":
                    # Courbe BPM pilote UNIQUEMENT le DIMMER (intensité) ; strobe = valeur FIXE (slider)
                    dimmer_val = int(255 * pulse_dimmer_curve)
                    try:
                        on_dc = getattr(group_ui, "on_dim_change", None)
                        if callable(on_dc):
                            on_dc(pulse_dimmer_curve)
                    except Exception:
                        pass
                    for fx in fixtures:
                        if hasattr(fx, "set_dimmer"):
                            try:
                                fx.set_dimmer(dimmer_val)
                            except Exception:
                                pass
                    # Strobe fixe : 0 = fondu fluide, ou valeur du slider "Vitesse Strobe" pour scintillement
                    strobe_fixed = 0
                    if hasattr(group_ui, "strobe_slider") and group_ui.strobe_slider is not None:
                        strobe_fixed = int(group_ui.strobe_slider.get() * 255)
                    for fx in fixtures:
                        if hasattr(fx, "set_strobe"):
                            try:
                                fx.set_strobe(strobe_fixed)
                            except Exception:
                                pass
                    try:
                        if hasattr(group_ui, "slider"):
                            group_ui.slider.set(pulse_dimmer_curve)
                    except Exception:
                        pass

                elif mode == "BPM DISCO":
                    trigger = False
                    if self.mw.audio_mode == "Audio" and level > threshold:
                        trigger = True
                    elif self.mw.audio_mode == "BPM" and is_beat:
                        trigger = True

                    if trigger:
                        import random
                        r, g, b = [random.randint(0, 255) for _ in range(3)]
                        for fx in fixtures:
                            if hasattr(fx, "set_color"):
                                try:
                                    fx.set_color(r, g, b)
                                except TypeError:
                                    fx.set_color(r, g, b, dimmer=255)
                            if hasattr(fx, "set_dimmer"):
                                fx.set_dimmer(255)
                            if hasattr(fx, "set_strobe"):
                                fx.set_strobe(0)

            # Gigabar : mêmes 3 modes que Floods/Party (Manuel, Pulse, Rainbow), config canaux dimmer/strobe par fixture
            if self.mw.gigabars:
                link_gigabar = bool(getattr(self.mw, "link_gigabar_switch", None) and self.mw.link_gigabar_switch.get())
                master_card = getattr(self.mw, "master_amb_card", None)
                gigabar_card = getattr(self.mw, "gigabar_card", None)
                if link_gigabar and master_card is not None:
                    effective_mode = getattr(master_card, "logic_mode", "MANUAL")
                else:
                    effective_mode = getattr(gigabar_card, "logic_mode", "MANUAL") if gigabar_card is not None else "MANUAL"

                # Dimmer de la carte Master (0.0–1.0) quand Gigabar est lié, sinon 1.0
                master_card_dim = 1.0
                if link_gigabar and master_card is not None and getattr(master_card, "master_slider", None) is not None:
                    try:
                        master_card_dim = max(0.0, min(1.0, float(master_card.master_slider.get())))
                    except Exception:
                        pass

                if effective_mode == "PULSE":
                    # Courbe BPM → DIMMER ; appliquer aussi le slider Master carte
                    dimmer_val = int(255 * pulse_dimmer_curve * master_card_dim)
                    strobe_fixed = 0
                    if gigabar_card is not None and hasattr(gigabar_card, "strobe_slider") and gigabar_card.strobe_slider is not None:
                        strobe_fixed = int(gigabar_card.strobe_slider.get())
                    for fx in self.mw.gigabars:
                        try:
                            if isinstance(fx, GigabarFixture8Ch):
                                fx.set_mode(0)
                                fx.set_dimmer(dimmer_val)
                                fx.set_strobe(strobe_fixed)
                            elif isinstance(fx, Gigabar5ChFixture):
                                fx.set_dimmer(dimmer_val)
                                fx.set_strobe(strobe_fixed)
                        except Exception:
                            pass
                    if gigabar_card is not None:
                        try:
                            gigabar_card.set_dimmer_value(dimmer_val)
                            gigabar_card.set_strobe_value(strobe_fixed)
                        except Exception:
                            pass

                elif effective_mode == "RAINBOW":
                    trigger = (
                        (self.mw.audio_mode == "Audio" and level > 0.3)
                        or (self.mw.audio_mode == "BPM" and is_beat)
                    )
                    # Dimmer sortie = slider Master carte (et Master global via fixture.master_factor)
                    rainbow_dimmer = int(255 * master_card_dim)
                    if trigger:
                        import random
                        r, g, b = [random.randint(0, 255) for _ in range(3)]
                        for fx in self.mw.gigabars:
                            try:
                                if isinstance(fx, GigabarFixture8Ch):
                                    fx.set_mode(0)
                                    fx.set_color(r, g, b)
                                    fx.set_dimmer(rainbow_dimmer)
                                    fx.set_strobe(0)
                                elif isinstance(fx, Gigabar5ChFixture):
                                    fx.set_color(r, g, b)
                                    fx.set_dimmer(rainbow_dimmer)
                                    fx.set_strobe(0)
                            except Exception:
                                pass
                        if gigabar_card is not None:
                            try:
                                gigabar_card.set_base_color(r, g, b)
                                gigabar_card.set_dimmer_value(rainbow_dimmer)
                                gigabar_card.set_strobe_value(0)
                            except Exception:
                                pass
                    else:
                        # Entre deux triggers : garder la couleur mais appliquer le dimmer Master
                        for fx in self.mw.gigabars:
                            try:
                                if isinstance(fx, (GigabarFixture8Ch, Gigabar5ChFixture)):
                                    fx.set_dimmer(rainbow_dimmer)
                            except Exception:
                                pass
                        if gigabar_card is not None:
                            try:
                                gigabar_card.set_dimmer_value(rainbow_dimmer)
                            except Exception:
                                pass

        if hasattr(self.mw, "channel_view") and self.mw.channel_view is not None:
            try:
                self.mw._dmx_view_sync_counter = (self.mw._dmx_view_sync_counter + 1) % 4
                if self.mw._dmx_view_sync_counter == 0:
                    self.mw.channel_view.sync_from_dmx()
            except Exception:
                pass

        try:
            self.mw.after(30, self.mw._update_audio_visuals)
        except Exception:
            pass
