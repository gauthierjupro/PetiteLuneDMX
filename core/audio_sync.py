"""
Synchronisation audio pour l'effet stroboscopique du Xtrem LED.

Utilise pyaudio pour analyser le signal du microphone et détecter
les pics d'énergie (basses approximatives), puis déclenche un flash.
"""

import threading
import time
from typing import Callable, List, Optional, Tuple, Union

import numpy as np

try:
    import pyaudio  # type: ignore[import-not-found]
except Exception:  # ModuleNotFoundError ou autre problème d'import
    pyaudio = None  # type: ignore[assignment]

try:
    import sounddevice as sd  # type: ignore[import-not-found]
except Exception:
    sd = None  # type: ignore[assignment]

from models.fixtures import XtremLedFixture


def list_input_devices() -> List[Tuple[int, str]]:
    """
    Retourne la liste (index, nom) des périphériques audio ayant au moins 1 canal d'entrée.
    Essaie d'abord PyAudio, puis sounddevice.
    """
    devices: List[Tuple[int, str]] = []

    # Essai avec PyAudio si disponible
    if pyaudio is not None:
        try:
            pa = pyaudio.PyAudio()
        except Exception:
            pa = None
        if pa is not None:
            try:
                count = pa.get_device_count()
                for i in range(count):
                    try:
                        info = pa.get_device_info_by_index(i)
                    except Exception:
                        continue
                    max_in = int(info.get("maxInputChannels", 0))
                    if max_in > 0:
                        name = str(info.get("name", f"Device {i}"))
                        devices.append((i, name))
            finally:
                try:
                    pa.terminate()
                except Exception:
                    pass

    # Si rien trouvé et sounddevice dispo, on bascule dessus
    if not devices and sd is not None:
        try:
            sd_devs = sd.query_devices()
        except Exception:
            sd_devs = []
        for idx, info in enumerate(sd_devs):
            try:
                max_in = int(info.get("max_input_channels", 0))
            except Exception:
                max_in = 0
            if max_in > 0:
                name = str(info.get("name", f"Device {idx}"))
                devices.append((idx, name))

    return devices


class XtremAudioSync:
    def __init__(
        self,
        fixture: Union[XtremLedFixture, List[XtremLedFixture]],
        input_device_index: Optional[int] = None,
        chunk: int = 1024,
        rate: int = 44100,
    ) -> None:
        self._fixtures: List[XtremLedFixture] = fixture if isinstance(fixture, list) else [fixture]
        self.fixture = self._fixtures[0]  # pour compatibilité (niveau, etc.)
        self.input_device_index = input_device_index
        self.chunk = chunk
        self.rate = rate

        self._pa: Optional[pyaudio.PyAudio] = None
        self._stream = None  # type: ignore[assignment]
        self._thread: Optional[threading.Thread] = None
        self._running = False

        self._avg_energy = 0.0
        self._last_beat_time = 0.0
        self._min_interval = 0.15  # secondes entre deux flashs
        self._threshold = 1.8  # seuil énergie / moyenne (plus bas = plus sensible)
        self._on_beat_callback: Optional[Callable[[], None]] = None
        # Valeurs pour l'affichage (VU-mètre)
        self._last_level = 0.0
        self._last_energy = 0.0
        self._beat_times: List[float] = []

    def set_beat_callback(self, callback: Optional[Callable[[], None]]) -> None:
        """Callback appelé à chaque pic détecté (en plus du flash Xtrem)."""
        self._on_beat_callback = callback

    def set_sensitivity(self, value: float) -> None:
        """Règle le seuil de déclenchement. Plus la valeur est basse, plus c'est sensible (déclenche plus facilement)."""
        self._threshold = max(0.5, min(3.5, float(value)))

    def get_visual_level(self) -> float:
        """Niveau audio normalisé [0.0, 1.0] pour l'affichage."""
        return float(self._last_level)

    # Alias pour compatibilité avec le code de contrôle audio
    def get_level(self) -> float:
        """Alias de get_visual_level()."""
        return self.get_visual_level()

    def get_last_beat_time(self) -> float:
        """Instant du dernier pic détecté (time.time())."""
        return float(self._last_beat_time)

    def get_bpm(self) -> float:
        """
        Retourne une estimation de BPM basée sur les derniers intervalles entre beats.
        0.0 signifie "aucune mesure fiable".
        """
        now = time.time()
        # Ne garde que les beats des 8 dernières secondes
        recent = [t for t in self._beat_times if now - t <= 8.0]
        self._beat_times = recent
        if len(recent) < 2:
            return 0.0
        intervals: List[float] = []
        for a, b in zip(recent[:-1], recent[1:]):
            dt = b - a
            if dt > 0.15:  # ignore les doubles déclenchements trop rapprochés
                intervals.append(dt)
        if not intervals:
            return 0.0
        avg = sum(intervals) / len(intervals)
        if avg <= 0.0:
            return 0.0
        return 60.0 / avg

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
        if self._stream is not None:
            try:
                # PyAudio: stop_stream / close
                if hasattr(self._stream, "stop_stream"):
                    self._stream.stop_stream()
                elif hasattr(self._stream, "stop"):
                    self._stream.stop()  # sounddevice
            except Exception:
                pass
            try:
                if hasattr(self._stream, "close"):
                    self._stream.close()
            except Exception:
                pass
            self._stream = None
        if self._pa is not None:
            self._pa.terminate()
            self._pa = None

    def _run(self) -> None:
        # Priorité à PyAudio si disponible, sinon sounddevice
        if pyaudio is not None:
            try:
                self._pa = pyaudio.PyAudio()
                self._stream = self._pa.open(
                    format=pyaudio.paInt16,
                    channels=1,
                    rate=self.rate,
                    input=True,
                    input_device_index=self.input_device_index,
                    frames_per_buffer=self.chunk,
                )
            except Exception:
                self._running = False
                return

            while self._running:
                try:
                    data = self._stream.read(self.chunk, exception_on_overflow=False)
                except Exception:
                    continue

                # Convertit les données brutes en échantillons int16 et calcule une
                # énergie RMS simple (sans utiliser le module audioop).
                samples = np.frombuffer(data, dtype=np.int16)
                if samples.size == 0:
                    continue
                energy = float(np.sqrt(np.mean(samples.astype(np.float32) ** 2)))
                if self._avg_energy == 0.0:
                    self._avg_energy = float(energy)
                else:
                    self._avg_energy = 0.9 * self._avg_energy + 0.1 * float(energy)

                # Met à jour les valeurs pour l'affichage (VU-mètre)
                self._last_energy = energy
                if self._avg_energy > 0.0:
                    # Niveau brut normalisé (moins sensible + lissé)
                    raw_level = energy / (self._avg_energy * 8.0)
                    raw_level = max(0.0, min(1.0, float(raw_level)))
                    # Lissage exponentiel pour éviter les sauts trop rapides
                    self._last_level = 0.8 * self._last_level + 0.2 * raw_level
                else:
                    self._last_level = 0.0

                now = time.time()
                if energy > self._avg_energy * self._threshold and now - self._last_beat_time > self._min_interval:
                    self._last_beat_time = now
                    self._beat_times.append(now)
                    for fx in self._fixtures:
                        try:
                            fx.flash()
                        except Exception:
                            pass
                    if self._on_beat_callback is not None:
                        try:
                            self._on_beat_callback()
                        except Exception:
                            pass
        elif sd is not None:
            try:
                self._stream = sd.InputStream(
                    channels=1,
                    samplerate=self.rate,
                    blocksize=self.chunk,
                    dtype="int16",
                    device=self.input_device_index,
                )
                self._stream.start()
            except Exception:
                self._running = False
                return

            while self._running:
                try:
                    data, _overflowed = self._stream.read(self.chunk)
                except Exception:
                    continue

                samples = np.frombuffer(data, dtype=np.int16)
                if samples.size == 0:
                    continue
                energy = float(np.sqrt(np.mean(samples.astype(np.float32) ** 2)))
                if self._avg_energy == 0.0:
                    self._avg_energy = float(energy)
                else:
                    self._avg_energy = 0.9 * self._avg_energy + 0.1 * float(energy)

                self._last_energy = energy
                if self._avg_energy > 0.0:
                    raw_level = energy / (self._avg_energy * 8.0)
                    raw_level = max(0.0, min(1.0, float(raw_level)))
                    self._last_level = 0.8 * self._last_level + 0.2 * raw_level
                else:
                    self._last_level = 0.0

                now = time.time()
                if energy > self._avg_energy * self._threshold and now - self._last_beat_time > self._min_interval:
                    self._last_beat_time = now
                    self._beat_times.append(now)
                    for fx in self._fixtures:
                        try:
                            fx.flash()
                        except Exception:
                            pass
                    if self._on_beat_callback is not None:
                        try:
                            self._on_beat_callback()
                        except Exception:
                            pass
        else:
            # Aucun backend audio disponible
            self._running = False

__all__ = ["XtremAudioSync", "list_input_devices"]

