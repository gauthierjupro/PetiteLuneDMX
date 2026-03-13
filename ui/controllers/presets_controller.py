"""
Contrôleur Presets : rappel de scènes (slots 1–8), fade time, renommage, enregistrement.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ui.main_window import App


class PresetsController:
    def __init__(self, main_window: App) -> None:
        self.mw = main_window

    def apply_preset(self, slot_id: int) -> None:
        if self.mw.preset_manager is None:
            return

        if self.mw.engine is not None:
            self.mw.engine.default_fade_s = max(0.0, float(self.mw.preset_fade_time))

        ambiance_ui = self.mw.preset_manager.apply_preset(slot_id)

        try:
            self.mw.dmx.send()
        except Exception:
            pass

        if ambiance_ui is not None:
            self.mw._restore_ambiance_ui(ambiance_ui)
        else:
            self.mw.sync_ui_to_dmx()

        if self.mw.gigabar_card is not None:
            self.mw.gigabar_card.set_active_mode("manual")

        self.mw.active_preset_slot = slot_id
        self._refresh_preset_button_styles()
        self._update_active_preset_label()

    def on_fade_time_change(self, value: float) -> None:
        v = max(0.0, min(5.0, float(value)))
        self.mw.preset_fade_time = v
        if hasattr(self.mw, "fade_time_label"):
            self.mw.fade_time_label.configure(text=f"{v:.1f}s")

    def _update_active_preset_label(self) -> None:
        if self.mw.preset_status_label is None:
            return
        if self.mw.active_preset_slot is None or self.mw.preset_manager is None:
            self.mw.preset_status_label.configure(text="—")
            return
        slot = self.mw.active_preset_slot
        name = self.mw.preset_manager.get_preset_name(slot)
        if name:
            label = f"SCÈNE ACTIVE : {slot}: {name}"
        else:
            label = f"SCÈNE ACTIVE : {slot}"
        self.mw.preset_status_label.configure(text=label)

    def _refresh_preset_button_labels(self) -> None:
        if self.mw.preset_manager is None:
            return
        for idx, btn in enumerate(self.mw.preset_buttons, start=1):
            name = self.mw.preset_manager.get_preset_name(idx)
            if name:
                btn.configure(text=f"{idx}: {name}")
            else:
                btn.configure(text=str(idx))

    def _refresh_preset_button_styles(self) -> None:
        for idx, btn in enumerate(self.mw.preset_buttons, start=1):
            if self.mw.active_preset_slot == idx:
                btn.configure(
                    fg_color="#1d4ed8",
                    hover_color="#2563eb",
                    border_width=2,
                    border_color="#22c55e",
                )
            else:
                btn.configure(
                    fg_color="#2b2b2b",
                    hover_color="#3b3b3b",
                    border_width=0,
                )

    def on_preset_rename(self, slot_id: int) -> None:
        if self.mw.preset_manager is None:
            return
        self.mw._open_preset_rename_dialog(slot_id)

    def on_preset_button(self, index: int) -> None:
        if self.mw.preset_manager is None:
            return
        self.apply_preset(index)

    def on_preset_saved(self, slot: int, name: str) -> None:
        self.mw.preset_manager.set_preset_name(slot, name)
        ambiance_fixtures = self.mw._get_ambiance_fixtures()
        ambiance_ui = self.mw._get_ambiance_ui()
        self.mw.preset_manager.save_preset(slot, ambiance_fixtures=ambiance_fixtures, ambiance_ui=ambiance_ui)
        self._refresh_preset_button_labels()
        if self.mw.active_preset_slot == slot:
            self._update_active_preset_label()
