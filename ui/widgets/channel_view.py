from __future__ import annotations

import threading
from typing import Dict, Iterable, List, Optional

import customtkinter as ctk

from core.dmx_driver import DmxDriver
from models.fixtures import (
    Fixture,
    GigabarFixture,
    GigabarFixture8Ch,
    LEDFloodPanel150,
    LaserFixture,
    MovingHeadFixture,
    RGBFixture,
    XtremLedFixture,
)


class UniverseView(ctk.CTkScrollableFrame):
    """Vue type QLC+ des 512 adresses DMX d’un univers."""

    def __init__(
        self,
        master,
        fixtures: Iterable[Fixture],
        universe_id: int = 0,
        *args,
        **kwargs,
    ) -> None:
        super().__init__(master, *args, **kwargs)
        self.fixtures: List[Fixture] = [f for f in fixtures if f.universe == universe_id]
        self.universe_id = universe_id
        self._grid_labels: List[ctk.CTkLabel] = []
        self.channel_map = self._build_channel_map()
        self._build_grid()

    def refresh(self) -> None:
        """Reconstruit la grille après modification des adresses des fixtures."""
        for w in self._grid_labels:
            try:
                w.destroy()
            except Exception:
                pass
        self._grid_labels.clear()
        self.channel_map = self._build_channel_map()
        self._build_grid()

    def _build_channel_map(self) -> Dict[int, Fixture]:
        channel_map: Dict[int, Fixture] = {}
        for fx in self.fixtures:
            start = max(1, int(fx.address))
            length = int(fx.channels)
            if length <= 0:
                continue
            end = min(512, start + length - 1)
            for ch in range(start, end + 1):
                channel_map[ch] = fx
        return channel_map

    def _color_for_fixture(self, fx: Fixture) -> str:
        manu = fx.manufacturer.lower()
        if "stairville" in manu:
            return "#1f6aa5"
        if "eurolite" in manu:
            return "#2fa572"
        if "fun-generation" in manu:
            return "#a57b2f"
        if "boom" in manu:
            return "#a52f7b"
        if "varytec" in manu:
            return "#2f9ba5"
        return "#555555"

    def _build_grid(self) -> None:
        cols = 32  # 32 colonnes x 16 lignes = 512 canaux
        for ch in range(1, 513):
            row = (ch - 1) // cols
            col = (ch - 1) % cols
            fx = self.channel_map.get(ch)
            if fx is not None:
                color = self._color_for_fixture(fx)
                text = str(ch)
            else:
                color = "#222222"
                text = str(ch)

            label = ctk.CTkLabel(
                self,
                text=text,
                width=40,
                height=24,
                corner_radius=4,
                fg_color=color,
            )
            label.grid(row=row, column=col, padx=2, pady=2, sticky="nsew")
            self._grid_labels.append(label)


class ChannelControlView(ctk.CTkScrollableFrame):
    """
    Vue permettant de commander chaque adresse DMX par projecteur,
    avec des faders et le nom de la fonction de canal (intensité, rouge, etc.).
    Inclut un bouton ID par fixture.
    """

    # Largeur "pixel perfect" par canal (curseur + labels + icône)
    CHANNEL_WIDTH = 50

    def __init__(
        self,
        master,
        driver: DmxDriver,
        fixtures: Iterable[Fixture],
        *args,
        **kwargs,
    ) -> None:
        super().__init__(master, *args, **kwargs)
        self.driver = driver
        self.fixtures: List[Fixture] = list(fixtures)
        self._id_active: bool = False
        self._id_snapshot: Optional[bytearray] = None
        self._channel_sliders: Dict[int, ctk.CTkSlider] = {}
        self._channel_value_labels: Dict[int, ctk.CTkLabel] = {}
        self._build_rows()

    def _color_for_fixture(self, fx: Fixture) -> str:
        manu = fx.manufacturer.lower()
        if "stairville" in manu:
            return "#1f6aa5"
        if "eurolite" in manu:
            return "#2fa572"
        if "fun-generation" in manu:
            return "#a57b2f"
        if "boom" in manu:
            return "#a52f7b"
        if "varytec" in manu:
            return "#2f9ba5"
        return "#4b5563"

    def _color_for_function(self, name: str) -> str:
        n = name.lower()
        if "rouge" in n:
            return "#ff3b30"
        if "vert" in n:
            return "#34c759"
        if "bleu" in n:
            return "#007aff"
        if "blanc" in n:
            return "#e8e8e8"
        if "intensité" in n or "dimmer" in n or "master" in n:
            return "#f1c40f"
        if "strobe" in n or "stroboscope" in n:
            return "#ecf0f1"
        if "mode" in n or "programme" in n:
            return "#9b59b6"
        if "vitesse" in n:
            return "#e67e22"
        if "pan" in n or "tilt" in n or "couleur" in n or "on/off" in n:
            return "#9b59b6"
        return "#555555"

    def _icon_for_function(self, name: str) -> str:
        n = name.lower()
        if "intensité" in n or "dimmer" in n or "master" in n:
            return "I"
        if "rouge" in n:
            return "R"
        if "vert" in n:
            return "V"
        if "bleu" in n:
            return "B"
        if "blanc" in n:
            return "W"
        if "strobe" in n or "stroboscope" in n:
            return "S"
        if "mode" in n or "programme" in n:
            return "M"
        if "vitesse" in n:
            return "V"
        if "pan" in n:
            return "P"
        if "tilt" in n:
            return "T"
        if "couleur" in n:
            return "C"
        if "on/off" in n:
            return "O"
        return "·"

    def _fixture_at_channel(self, abs_channel: int) -> Optional[Fixture]:
        """Retourne la fixture qui possède ce canal DMX (adresse absolue)."""
        for fx in self.fixtures:
            start = fx.address
            end = fx.address + fx.channels - 1
            if start <= abs_channel <= end:
                return fx
        return None

    def _on_slider_change(self, abs_channel: int, value: float) -> None:
        val = int(value)
        self.driver.set_channel(abs_channel, val)
        # Met à jour le label numérique associé
        label = self._channel_value_labels.get(abs_channel)
        if label is not None:
            label.configure(text=str(val))
        # Gigabar 8ch : garde l'état interne de la fixture aligné avec le driver
        fx = self._fixture_at_channel(abs_channel)
        if isinstance(fx, GigabarFixture8Ch):
            vals = [
                self.driver.get_channel(fx.address + i)
                for i in range(fx.channels)
            ]
            fx.load_state(vals)

    def _build_rows(self) -> None:
        """
        Dispose les blocs de projecteurs en "flow layout" simple :
        - chaque bloc a une largeur proportionnelle au nombre de faders,
        - les blocs sont packés horizontalement dans une ligne,
        - quand la largeur de la fenêtre est atteinte, on crée une nouvelle ligne.
        """
        # Largeur approximative disponible pour les blocs (fenêtre ou maître)
        try:
            max_width = self.winfo_width()
            if max_width <= 1 and self.master is not None:
                max_width = self.master.winfo_width()
        except Exception:
            max_width = 0
        if max_width <= 1:
            max_width = 900  # valeur par défaut raisonnable

        current_line = ctk.CTkFrame(self, fg_color="transparent")
        current_line.pack(side="top", anchor="nw", pady=2)
        current_line_width = 0

        for fx in self.fixtures:
            nb_faders = max(1, int(getattr(fx, "channels", 1)))

            # Largeur "pixel perfect" basée sur le nombre de faders :
            # (nombre_de_faders * CHANNEL_WIDTH) + 20 pour les marges internes.
            block_width = nb_faders * self.CHANNEL_WIDTH + 20

            # Si ce bloc ne rentre pas sur la ligne courante, on passe à la suivante
            if current_line_width > 0 and current_line_width + block_width > max_width:
                current_line = ctk.CTkFrame(self, fg_color="transparent")
                current_line.pack(side="top", anchor="nw", pady=2)
                current_line_width = 0

            # Bloc visuel par projecteur (équivalent à un "group box" rigide)
            row_frame = ctk.CTkFrame(
                current_line,
                fg_color="#020617",
                border_width=1,
                border_color="#4b5563",
            )
            row_frame.configure(width=block_width, height=230)
            row_frame.pack(side="left", anchor="nw", padx=5, pady=2)
            row_frame.pack_propagate(False)

            current_line_width += block_width + 10  # 2 * padx

            # Bandeau coloré en haut avec le nom du projecteur
            header_bar = ctk.CTkFrame(
                row_frame,
                fg_color=self._color_for_fixture(fx),
            )
            header_bar.grid(row=0, column=0, sticky="ew")
            header_bar.grid_columnconfigure(0, weight=1)

            header_text = f"{fx.name or fx.model} [Addr {fx.address}]"
            header_label = ctk.CTkLabel(
                header_bar,
                text=header_text,
                anchor="w",
                font=("", 13, "bold"),
                text_color="white",
            )
            header_label.grid(row=0, column=0, sticky="w", padx=(6, 4), pady=2)

            id_button = ctk.CTkButton(
                header_bar,
                text="ID",
                width=40,
                height=22,
                fg_color="#1d4ed8",
                hover_color="#2563eb",
            )
            id_button.grid(row=0, column=1, padx=(4, 6))
            id_button.bind("<ButtonPress-1>", lambda e, f=fx: self._on_id_press(f))
            id_button.bind("<ButtonRelease-1>", lambda e: self._on_id_release())

            channels_frame = ctk.CTkFrame(row_frame, fg_color="#020617")
            channels_frame.grid(row=1, column=0, sticky="w", padx=4, pady=(4, 4))

            channel_labels = fx.describe_channels()

            for rel_ch in range(1, fx.channels + 1):
                abs_ch = fx.address + rel_ch - 1
                func_label = channel_labels.get(rel_ch, f"Ch {rel_ch}")
                icon_color = self._color_for_function(func_label)
                icon_text = self._icon_for_function(func_label)

                cell = ctk.CTkFrame(channels_frame, fg_color="transparent")
                cell.grid(row=0, column=rel_ch - 1, padx=0, pady=2)

                slider = ctk.CTkSlider(
                    cell,
                    from_=0,
                    to=255,
                    width=self.CHANNEL_WIDTH,
                    height=120,
                    orientation="vertical",
                    number_of_steps=256,
                    command=lambda v, ch=abs_ch: self._on_slider_change(ch, v),
                )
                # Initialisation à 0 par défaut au lancement (curseur en bas)
                slider.set(0)
                slider.grid(row=0, column=0, pady=(0, 2))
                self._channel_sliders[abs_ch] = slider

                # Valeur numérique DMX sous le slider
                value_label = ctk.CTkLabel(cell, text="0", width=28, anchor="center")
                value_label.grid(row=1, column=0, pady=(0, 2))
                self._channel_value_labels[abs_ch] = value_label

                icon_label = ctk.CTkLabel(
                    cell,
                    text=icon_text,
                    fg_color=icon_color,
                    width=24,
                    height=10,
                    corner_radius=4,
                )
                icon_label.grid(row=2, column=0, pady=(0, 2), sticky="ew")
                icon_label.grid_propagate(False)

                lbl_func = ctk.CTkLabel(cell, text=func_label, width=70, font=("", 11, "bold"))
                lbl_func.grid(row=3, column=0)

                lbl_ch = ctk.CTkLabel(cell, text=str(abs_ch), width=28, anchor="center")
                lbl_ch.grid(row=4, column=0)

    def rebuild_layout(self) -> None:
        """Reconstruit entièrement la disposition des blocs de projecteurs."""
        for child in self.winfo_children():
            child.destroy()
        self._build_rows()

    def _on_id_press(self, target_fx: Fixture) -> None:
        if self._id_active:
            return
        snapshot = bytearray()
        for addr in range(1, self.driver.DMX_CHANNELS + 1):
            snapshot.append(self.driver.get_channel(addr))
        self._id_snapshot = snapshot
        self._id_active = True

        for fx in self.fixtures:
            fx.blackout()

        if isinstance(target_fx, LEDFloodPanel150):
            target_fx.set_dimmer(255)
            target_fx.set_color(255, 255, 255)
            target_fx.set_strobe(0)
        elif isinstance(target_fx, RGBFixture):
            target_fx.set_color(255, 255, 255, dimmer=255)
            target_fx.set_strobe(0)
        elif isinstance(target_fx, MovingHeadFixture):
            target_fx.set_dimmer(255)
        elif isinstance(target_fx, GigabarFixture8Ch):
            target_fx.set_mode(0)
            target_fx.set_dimmer(255)
            target_fx.set_color(255, 255, 255)
        elif isinstance(target_fx, GigabarFixture):
            target_fx.set_color(255, 255, 255)
        elif isinstance(target_fx, (XtremLedFixture, LaserFixture)):
            target_fx.set_on()

    def _on_id_release(self) -> None:
        if not self._id_active or self._id_snapshot is None:
            return
        for addr, value in enumerate(self._id_snapshot, start=1):
            self.driver.set_channel(addr, value)
        self._id_snapshot = None
        self._id_active = False

    def sync_from_dmx(self) -> None:
        """Met à jour visuellement tous les sliders à partir des valeurs DMX actuelles."""
        for abs_ch, slider in self._channel_sliders.items():
            val = self.driver.get_channel(abs_ch)
            slider.set(val)
            label = self._channel_value_labels.get(abs_ch)
            if label is not None:
                label.configure(text=str(val))


__all__ = ["UniverseView", "ChannelControlView"]

