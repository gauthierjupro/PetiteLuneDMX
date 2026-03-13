from __future__ import annotations

from typing import Callable, Optional, Tuple

import customtkinter as ctk
import time


XYCallback = Callable[[float, float], None]

# Couleurs des curseurs pour Lyre 1 (bleu) et Lyre 2 (orange)
CURSOR_LYRE1_COLOR = "#3b82f6"
CURSOR_LYRE2_COLOR = "#f97316"


class XYPad(ctk.CTkFrame):
    """
    Pad XY avec un ou deux curseurs (Lyre 1 = bleu, Lyre 2 = orange).
    En manuel les deux suivent la même position ; en mode auto on peut afficher deux positions.
    """

    def __init__(
        self,
        master,
        on_change: Optional[XYCallback] = None,
        size: int = 300,
        *args,
        **kwargs,
    ) -> None:
        super().__init__(master, *args, **kwargs)
        self.on_change = on_change
        self.size = size
        self.configure(width=size, height=size, border_width=1, border_color="gray30")
        self.grid_propagate(False)

        # Curseur Lyre 1 (bleu) et Lyre 2 (orange) — toujours présents pour feedback dual
        self.cursor_lyre1 = ctk.CTkLabel(self, text="●", text_color=CURSOR_LYRE1_COLOR)
        self.cursor_lyre1.place(relx=0.5, rely=0.5, anchor="center")
        self.cursor_lyre2 = ctk.CTkLabel(self, text="●", text_color=CURSOR_LYRE2_COLOR)
        self.cursor_lyre2.place(relx=0.5, rely=0.5, anchor="center")

        # Affichage discret des valeurs Pan/Tilt (DMX 0–255)
        self.value_label = ctk.CTkLabel(
            self,
            text="",
            text_color="gray70",
            fg_color="transparent",
            font=("", 10),
        )
        self.value_label.place(relx=1.0, rely=0.0, anchor="ne", x=-4, y=4)

        # Throttle visuel pour set_lyre_positions (mode 8/Circle) : max ~60 FPS
        self._last_visual_ts: float = 0.0
        # Throttle callback pad : mise à jour visuelle immédiate, envoi DMX à ~30 Hz max (fluidité)
        self._pad_pending: Optional[Tuple[float, float]] = None
        self._pad_after_id: Optional[str] = None
        self._PAD_THROTTLE_MS = 33

        self.bind("<Button-1>", self._handle_event)
        self.bind("<B1-Motion>", self._handle_event)
        self.bind("<ButtonRelease-1>", self._handle_release)
        self.cursor_lyre1.bind("<Button-1>", self._handle_event)
        self.cursor_lyre1.bind("<B1-Motion>", self._handle_event)
        self.cursor_lyre1.bind("<ButtonRelease-1>", self._handle_release)
        self.cursor_lyre2.bind("<Button-1>", self._handle_event)
        self.cursor_lyre2.bind("<B1-Motion>", self._handle_event)
        self.cursor_lyre2.bind("<ButtonRelease-1>", self._handle_release)

    def _handle_event(self, event) -> None:
        w = max(1, self.winfo_width())
        h = max(1, self.winfo_height())

        if event.widget is self:
            x = event.x
            y = event.y
        else:
            x = event.x_root - self.winfo_rootx()
            y = event.y_root - self.winfo_rooty()

        x = max(0, min(x, w))
        y = max(0, min(y, h))

        nx = x / w
        ny = y / h
        # Mise à jour visuelle immédiate (fluidité)
        self._update_visual_single(nx, ny, throttle=False)
        # Callback (DMX) limité à ~30 Hz pour éviter saccades
        self._pad_pending = (nx, ny)
        if self._pad_after_id is not None:
            return
        self._pad_after_id = self.after(self._PAD_THROTTLE_MS, self._flush_pad_callback)

    def _flush_pad_callback(self) -> None:
        self._pad_after_id = None
        if self._pad_pending is not None and self.on_change is not None:
            nx, ny = self._pad_pending
            self._pad_pending = None
            try:
                self.on_change(nx, ny)
            except Exception:
                pass

    def _handle_release(self, event) -> None:
        """Au relâchement, envoi immédiat de la dernière position (pas d'attente du throttle)."""
        if self._pad_after_id is not None:
            self.after_cancel(self._pad_after_id)
            self._pad_after_id = None
        if self._pad_pending is not None and self.on_change is not None:
            nx, ny = self._pad_pending
            self._pad_pending = None
            try:
                self.on_change(nx, ny)
            except Exception:
                pass

    def _update_visual_single(self, nx: float, ny: float, throttle: bool) -> None:
        """Met à jour les curseurs + label. throttle=True : max ~60 FPS (pour set_lyre_positions)."""
        now = time.monotonic()
        if throttle and self._last_visual_ts and (now - self._last_visual_ts) < (1.0 / 60.0):
            return
        self._last_visual_ts = now

        nx = max(0.0, min(1.0, float(nx)))
        ny = max(0.0, min(1.0, float(ny)))
        self.cursor_lyre1.place(relx=nx, rely=ny, anchor="center")
        self.cursor_lyre2.place(relx=nx, rely=ny, anchor="center")
        pan = int(round(nx * 255))
        tilt = int(round((1.0 - ny) * 255))
        self.value_label.configure(text=f"Pan {pan:3d}  Tilt {tilt:3d}")

    def _place_both(self, nx: float, ny: float) -> None:
        nx = max(0.0, min(1.0, float(nx)))
        ny = max(0.0, min(1.0, float(ny)))
        self.cursor_lyre1.place(relx=nx, rely=ny, anchor="center")
        self.cursor_lyre2.place(relx=nx, rely=ny, anchor="center")

    def set_center(self) -> None:
        self._update_visual_single(0.5, 0.5, throttle=False)

    def set_normalized(self, nx: float, ny: float) -> None:
        """
        Positionne les deux curseurs au même point (mode manuel), sans callback.
        """
        self._update_visual_single(nx, ny, throttle=False)

    def set_lyre_positions(
        self,
        nx1: float,
        ny1: float,
        nx2: float,
        ny2: float,
    ) -> None:
        """
        Positionne le curseur Lyre 1 (bleu) et Lyre 2 (orange) pour le feedback en mode auto.
        """
        now = time.monotonic()
        if self._last_visual_ts and (now - self._last_visual_ts) < (1.0 / 60.0):
            return
        self._last_visual_ts = now

        nx1 = max(0.0, min(1.0, float(nx1)))
        ny1 = max(0.0, min(1.0, float(ny1)))
        nx2 = max(0.0, min(1.0, float(nx2)))
        ny2 = max(0.0, min(1.0, float(ny2)))
        self.cursor_lyre1.place(relx=nx1, rely=ny1, anchor="center")
        self.cursor_lyre2.place(relx=nx2, rely=ny2, anchor="center")
        # Label : afficher la moyenne ou la lyre 1
        pan = int(round((nx1 + nx2) * 0.5 * 255))
        tilt = int(round((1.0 - (ny1 + ny2) * 0.5) * 255))
        self.value_label.configure(text=f"Pan {pan:3d}  Tilt {tilt:3d}")


__all__ = ["XYPad", "XYCallback"]

