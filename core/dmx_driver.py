import threading
import time
from typing import Iterable, Optional

import ftd2xx


class DmxDriver:
    """
    Driver DMX basé sur FTDI D2XX (Enttec Open DMX USB).
    Mode Full Frame 512 : buffer unique de 512 canaux, envoi cadencé constant (30 Hz).
    """

    DMX_CHANNELS = 512

    # Envoi cadencé constant : 40 Hz pour fluidité du pad XY (limite courante ~44 Hz DMX)
    DMX_LOOP_INTERVAL_S = 1.0 / 40.0  # 25 ms

    def __init__(self, port: str = "auto", refresh_rate_hz: float = 40.0) -> None:
        self.port = port
        self.refresh_rate_hz = refresh_rate_hz

        # Buffer unique 512 canaux (index 0 = canal DMX 1), initialisé à 0
        self._channels = bytearray(self.DMX_CHANNELS)
        assert len(self._channels) == 512
        self._lock = threading.Lock()

        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._dev: Optional[ftd2xx.FTD2XX] = None
        self._last_open_error: Optional[Exception] = None
        # Ne fermer qu'après N échecs consécutifs pour éviter coupures (lampes qui passent à off)
        self._send_error_count = 0
        self._send_error_threshold = 5

        self._open_device()
        self.start()

    # --- Gestion du périphérique FTDI -----------------------------------------
    def _open_device(self) -> None:
        """Ouvre le premier périphérique FTDI disponible (index 0)."""
        self._last_open_error = None
        try:
            # Essaie d'ouvrir par description si un 'port' explicite est fourni
            dev = None
            if self.port and self.port.lower() != "auto":
                try:
                    dev = ftd2xx.openEx(self.port.encode("ascii"))
                except Exception:
                    dev = None
            if dev is None:
                dev = ftd2xx.open(0)
            dev.setBaudRate(250000)
            # 8 bits, 2 stop bits, no parity
            dev.setDataCharacteristics(8, 2, 0)
            # Pas de contrôle de flux
            dev.setFlowControl(0, 0, 0)
            self._dev = dev
        except Exception as exc:
            self._dev = None
            self._last_open_error = exc

    def _close_device(self) -> None:
        if self._dev is not None:
            try:
                self._dev.close()
            except Exception:
                pass
            self._dev = None

    # --- Thread d’envoi DMX ----------------------------------------------------
    def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._running = False
        if self._thread is not None:
            self._thread.join(timeout=1.0)
            self._thread = None
        self._close_device()

    close = stop

    def send_universe(self) -> None:
        """
        Envoi Full Frame 512 : trame complète (Break + 512 octets) à débit constant.
        Chaque valeur est forcée en Int8 (0-255). Ne ferme le périphérique qu'après
        plusieurs échecs consécutifs pour éviter que les lampes passent à off sur un simple hoquet USB.
        """
        if self._dev is None:
            self._open_device()
            self._send_error_count = 0
        if self._dev is None:
            return
        with self._lock:
            frame = bytes([0x00]) + bytes(
                max(0, min(255, int(self._channels[i]))) for i in range(self.DMX_CHANNELS)
            )
        if len(frame) != 1 + self.DMX_CHANNELS:
            return
        try:
            self._dev.setBreakOn()
            time.sleep(0.0001)  # ~100 µs
            self._dev.setBreakOff()
            self._dev.write(frame)
            self._send_error_count = 0
        except Exception:
            self._send_error_count += 1
            if self._send_error_count >= self._send_error_threshold:
                self._close_device()
                self._send_error_count = 0

    def _run(self) -> None:
        """Boucle cadencée 30 Hz : envoi constant du buffer 512 canaux (même si rien ne bouge)."""
        while self._running:
            self.send_universe()
            time.sleep(self.DMX_LOOP_INTERVAL_S)  # 33 ms = 30 Hz

    # --- API de contrôle des canaux (remplissage du buffer unique 512) ----------
    def set_channel(self, address: int, value: int) -> None:
        """Écrit à l'index (address-1) du buffer 512. Filtrage Int8 (0-255)."""
        if not 1 <= address <= self.DMX_CHANNELS:
            return
        value = max(0, min(255, int(value)))
        with self._lock:
            # canal 153 -> index 152 dans _channels
            self._channels[address - 1] = value

    def send_dmx(self, address: int, value: int) -> None:
        """Règle un canal DMX (compatibilité ; pas de log pour ne pas bloquer l'UI)."""
        self.set_channel(address, value)

    def get_channel(self, address: int) -> int:
        """Retourne la valeur courante d'un canal DMX (0..255)."""
        if not 1 <= address <= self.DMX_CHANNELS:
            return 0
        with self._lock:
            return self._channels[address - 1]

    @property
    def dmx_universe(self) -> list:
        """Buffer univers DMX : liste de strictement 512 entiers (0-255). Index 0 = canal 1."""
        with self._lock:
            return [max(0, min(255, int(self._channels[i]))) for i in range(self.DMX_CHANNELS)]

    def get_universe_snapshot(self, n: int = 20) -> list:
        """Retourne une copie des n premiers canaux (pour debug)."""
        with self._lock:
            return list(self._channels[:n])

    def set_channels(self, start_address: int, values: Iterable[int]) -> None:
        if start_address < 1 or start_address > self.DMX_CHANNELS:
            return
        with self._lock:
            idx = start_address - 1
            for v in values:
                if idx >= self.DMX_CHANNELS:
                    break
                self._channels[idx] = max(0, min(255, int(v)))  # filtre float -> int
                idx += 1

    def blackout(self) -> None:
        with self._lock:
            for i in range(self.DMX_CHANNELS):
                self._channels[i] = 0

    def send(self) -> None:
        """API de compatibilité (le thread DMX tourne déjà en continu)."""
        return

    def is_connected(self) -> bool:
        """Indique si un périphérique FTDI DMX est actuellement ouvert."""
        return self._dev is not None


__all__ = ["DmxDriver"]

