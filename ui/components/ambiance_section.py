"""
Encart AMBIANCES factorisé : cadre avec contour, titre, switches LINK et bouton Aide.
Les cartes (FLOODS, PARty, GIGABAR, Master) sont ajoutées par le parent en row=1.
"""
from __future__ import annotations

from typing import Callable

import customtkinter as ctk

from ui.constants_ambience import (
    AMBIANCE_ENCART_WIDTH,
    AMBIANCE_ENCART_HEIGHT,
    DARK_CONSOLE_BG,
    DARK_CONSOLE_SECTION_BG,
    DARK_CONSOLE_BORDER,
    SECTION_RADIUS,
)


class AmbianceSection(ctk.CTkFrame):
    """
    Section Ambiance réutilisable : même principe que les cartes (FixtureCard, etc.).
    Contient le cadre avec bordure, l'en-tête (titre + switches LINK + bouton Aide).
    Le parent place les cartes FLOODS / PARty / GIGABAR en row=1.
    """

    def __init__(
        self,
        master,
        on_link_changed: Callable[[], None],
        on_help_click: Callable[[], None],
        **kwargs,
    ) -> None:
        super().__init__(
            master,
            fg_color=DARK_CONSOLE_BG,
            border_width=1,
            border_color=DARK_CONSOLE_BORDER,
            corner_radius=SECTION_RADIUS,
            width=AMBIANCE_ENCART_WIDTH + 50,
            height=AMBIANCE_ENCART_HEIGHT + 110,
            **kwargs,
        )
        self.grid_propagate(False)
        self.columnconfigure((0, 1, 2), weight=0)
        self.columnconfigure(3, weight=1)

        # En-tête : AMBIANCES + switches LINK + bouton Aide (marge pour le contour)
        header = ctk.CTkFrame(self, fg_color="transparent")
        header.grid(row=0, column=0, columnspan=4, sticky="w", padx=10, pady=(10, 2))
        for col in range(5):
            header.columnconfigure(col, weight=0)

        ctk.CTkLabel(header, text="AMBIANCES", anchor="w").grid(
            row=0, column=0, sticky="w", pady=(2, 2)
        )
        self.link_floods_switch = ctk.CTkSwitch(
            header,
            text="🔗 Floods",
            command=on_link_changed,
        )
        self.link_floods_switch.grid(row=0, column=1, sticky="e", pady=(2, 2), padx=(10, 0))
        self.link_party_switch = ctk.CTkSwitch(
            header,
            text="🔗 Party",
            command=on_link_changed,
        )
        self.link_party_switch.grid(row=0, column=2, sticky="e", pady=(2, 2), padx=(8, 0))
        self.link_gigabar_switch = ctk.CTkSwitch(
            header,
            text="🔗 Gigabar",
            command=on_link_changed,
        )
        self.link_gigabar_switch.grid(row=0, column=3, sticky="e", pady=(2, 2), padx=(8, 0))
        self.ambience_help_button = ctk.CTkButton(
            header,
            text="Aide Ambiance (?)",
            width=130,
            height=26,
            fg_color="#0ea5e9",
            hover_color="#38bdf8",
            command=on_help_click,
        )
        self.ambience_help_button.grid(row=0, column=4, sticky="e", pady=(2, 2), padx=(12, 0))


__all__ = ["AmbianceSection"]
