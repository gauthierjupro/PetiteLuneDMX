"""
Moteur DMX de haut niveau avec lissage (fondu) automatique.

Le principe :
- On garde `DmxDriver` pour l'envoi continu des trames DMX.
- `DmxEngine` fournit des méthodes de haut niveau pour effectuer
  des transitions progressives (0.5 s par défaut) plutôt que des
  sauts instantanés de valeur.
"""

from __future__ import annotations

import threading
import time
from typing import Dict, Optional

from core.dmx_driver import DmxDriver


def _clamp_0_255(value: int) -> int:
    return max(0, min(255, int(value)))


class DmxEngine:
    def __init__(self, driver: DmxDriver, default_fade_s: float = 0.5, steps: int = 20) -> None:
        self.driver = driver
        self.default_fade_s = default_fade_s
        self.steps = max(1, steps)

        self._lock = threading.Lock()
        self._channel_tokens: Dict[int, int] = {}
        self._next_token = 0

    # --- API directe ----------------------------------------------------------
    def set_channel_immediate(self, address: int, value: int) -> None:
        """Définition immédiate d'un canal DMX (sans fondu)."""
        self.driver.set_channel(address, _clamp_0_255(value))

    def get_channel(self, address: int) -> int:
        return self.driver.get_channel(address)

    # --- API avec fondu -------------------------------------------------------
    def set_channel_fade(self, address: int, target: int, duration_s: Optional[float] = None) -> None:
        """
        Applique un fondu linéaire d'une valeur courante vers `target`
        sur `duration_s` secondes (0.5 s par défaut).
        """
        target = _clamp_0_255(target)
        duration = self.default_fade_s if duration_s is None else max(0.0, float(duration_s))

        start = self.driver.get_channel(address)
        if duration <= 0.0 or start == target:
            self.driver.set_channel(address, target)
            return

        with self._lock:
            self._next_token += 1
            token = self._next_token
            self._channel_tokens[address] = token

        def _run_fade() -> None:
            steps = self.steps
            delay = duration / steps
            for i in range(1, steps + 1):
                with self._lock:
                    if self._channel_tokens.get(address) != token:
                        return  # remplacé par un nouveau fondu
                value = int(start + (target - start) * (i / steps))
                self.driver.set_channel(address, value)
                time.sleep(delay)

        threading.Thread(target=_run_fade, daemon=True).start()

    def set_rgb_fade(
        self,
        r_address: int,
        g_address: int,
        b_address: int,
        r: int,
        g: int,
        b: int,
        duration_s: Optional[float] = None,
    ) -> None:
        """
        Applique un fondu RGB simultané sur les canaux R, G, B.
        """
        self.set_channel_fade(r_address, r, duration_s)
        self.set_channel_fade(g_address, g, duration_s)
        self.set_channel_fade(b_address, b, duration_s)


__all__ = ["DmxEngine"]

