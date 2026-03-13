from __future__ import annotations

from typing import Optional, Tuple

import customtkinter as ctk

from ui.widgets.dmx_controls import LightGroupFrame, ColorCallback, DimCallback


class FixtureCard(LightGroupFrame):
    """
    Brique générique de projecteurs (FLOODS, PARty LED, etc.).

    Pour l'instant, c'est simplement un alias de LightGroupFrame afin de
    sortir la responsabilité de main_window.py. On pourra étendre cette
    classe plus tard (icônes, badges, etc.) sans toucher au reste.
    """

    def __init__(
        self,
        master,
        title: str,
        on_color: ColorCallback,
        on_dim_change: DimCallback,
        on_strobe_change: Optional[DimCallback] = None,
        *args,
        **kwargs,
    ) -> None:
        super().__init__(
            master,
            title=title,
            on_color=on_color,
            on_dim_change=on_dim_change,
            on_strobe_change=on_strobe_change,
            *args,
            **kwargs,
        )


__all__ = ["FixtureCard"]

