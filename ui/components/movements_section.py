"""
Encart MOUVEMENTS factorisé : cadre avec contour et titre.
Les cartes (Lyres, Dynamo Scan, Wookie) sont ajoutées par le parent en row=1.
"""

from __future__ import annotations

import customtkinter as ctk

from ui.constants_ambience import (
    AMBIANCE_ENCART_WIDTH,
    AMBIANCE_ENCART_HEIGHT,
    DARK_CONSOLE_BG,
    DARK_CONSOLE_BORDER,
    SECTION_RADIUS,
)


class MovementsSection(ctk.CTkFrame):
    """
    Section Mouvements réutilisable, sur le même principe que AmbianceSection :
    le parent place les cartes de mouvement (spots, scans, laser) en row=1.
    """

    def __init__(self, master, **kwargs) -> None:
        super().__init__(
            master,
            fg_color=DARK_CONSOLE_BG,
            border_width=1,
            border_color=DARK_CONSOLE_BORDER,
            corner_radius=SECTION_RADIUS,
            width=2200,
            height=450,
            **kwargs,
        )
        self.grid_propagate(False)
        self.columnconfigure((0, 1, 2), weight=0)
        self.columnconfigure(3, weight=1)

        header = ctk.CTkFrame(self, fg_color="transparent")
        header.grid(row=0, column=0, columnspan=4, sticky="w", padx=10, pady=(2, 2))
        ctk.CTkLabel(header, text="MOUVEMENTS", anchor="w").grid(
            row=0, column=0, sticky="w", pady=(0, 0)
        )


__all__ = ["MovementsSection"]

