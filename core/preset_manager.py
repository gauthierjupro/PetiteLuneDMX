from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional
import json

from core.app_paths import presets_path as _default_presets_path
from core.dmx_driver import DmxDriver
from core.dmx_engine import DmxEngine
from models.fixtures import Fixture


class PresetManager:
    """
    Gestionnaire de presets de scène.

    Sauvegarde et charge l'état DMX courant des projecteurs dans
    un fichier JSON (`config/presets.json`).
    """

    MAX_SLOTS = 8

    def __init__(
        self,
        driver: DmxDriver,
        fixtures: List[Fixture],
        engine: Optional[DmxEngine] = None,
        presets_path: Optional[Path] = None,
    ) -> None:
        self.driver = driver
        self.fixtures = fixtures
        self.engine = engine

        if presets_path is None:
            self.presets_path = _default_presets_path()
        else:
            self.presets_path = Path(presets_path)

    # --- API publique ---------------------------------------------------------
    def save_preset(
        self,
        slot: int,
        ambiance_fixtures: Optional[List[Fixture]] = None,
        ambiance_ui: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Sauvegarde le preset dans le slot (1‑8).
        Si ambiance_fixtures est fourni, ne sauvegarde que ces fixtures (preset dédié ambiances).
        Si ambiance_ui est fourni, l'enregistre pour restaurer les cartes (dimmer, strobe, couleurs, U1‑U4).
        """
        if not 1 <= slot <= self.MAX_SLOTS:
            return

        data = self._load_store()
        slots = data.setdefault("slots", {})
        slot_key = str(slot)
        existing = slots.get(slot_key) or {}
        name = existing.get("name")
        fixtures_to_save = ambiance_fixtures if ambiance_fixtures is not None else self.fixtures
        slot_dict: Dict[str, Any] = {
            "name": name,
            "fixtures": [self._snapshot_fixture(fx) for fx in fixtures_to_save],
        }
        if ambiance_ui is not None:
            slot_dict["ambiance_ui"] = ambiance_ui
        slots[slot_key] = slot_dict
        self._save_store(data)

    def apply_preset(self, slot: int, duration_s: Optional[float] = None) -> Optional[Dict[str, Any]]:
        """
        Rappelle le preset du slot (1‑8). Applique l'état des fixtures enregistrées.
        Retourne ambiance_ui si le slot en contient un (pour restaurer les cartes ambiances).
        """
        if not 1 <= slot <= self.MAX_SLOTS:
            return None

        data = self._load_store()
        slots = data.get("slots") or {}
        slot_data = slots.get(str(slot))
        if not slot_data:
            return None

        fixtures_data = slot_data.get("fixtures") or []
        for fx_data in fixtures_data:
            key = fx_data.get("key") or {}
            values = fx_data.get("values") or []
            fx = self._find_fixture_for_key(key)
            if fx is None:
                continue
            fx.load_state(values)

        return slot_data.get("ambiance_ui")

    # --- Noms de presets ------------------------------------------------------
    def get_preset_name(self, slot: int) -> Optional[str]:
        if not 1 <= slot <= self.MAX_SLOTS:
            return None
        data = self._load_store()
        slots = data.get("slots") or {}
        slot_data = slots.get(str(slot)) or {}
        name = slot_data.get("name")
        if isinstance(name, str) and name.strip():
            return name.strip()
        return None

    def set_preset_name(self, slot: int, name: str) -> None:
        if not 1 <= slot <= self.MAX_SLOTS:
            return
        data = self._load_store()
        slots = data.setdefault("slots", {})
        slot_key = str(slot)
        slot_data = slots.get(slot_key) or {}
        slot_data["name"] = name
        # On préserve les données fixtures éventuelles
        if "fixtures" not in slot_data:
            slot_data["fixtures"] = []
        slots[slot_key] = slot_data
        self._save_store(data)

    def has_preset(self, slot: int) -> bool:
        """Retourne True si un preset (au moins des valeurs) existe pour ce slot."""
        if not 1 <= slot <= self.MAX_SLOTS:
            return False
        data = self._load_store()
        slots = data.get("slots") or {}
        slot_data = slots.get(str(slot)) or {}
        fixtures = slot_data.get("fixtures")
        return bool(fixtures)

    def find_first_empty_slot(self) -> int:
        """
        Retourne le premier slot sans preset enregistré, ou 1 si tous remplis.
        """
        for i in range(1, self.MAX_SLOTS + 1):
            if not self.has_preset(i):
                return i
        return 1

    # --- Internes -------------------------------------------------------------
    def _snapshot_fixture(self, fx: Fixture) -> Dict[str, Any]:
        values: List[int] = []
        for rel in range(1, fx.channels + 1):
            abs_addr = fx.address + rel - 1
            if 1 <= abs_addr <= self.driver.DMX_CHANNELS:
                v = self.driver.get_channel(abs_addr)
            else:
                v = 0
            values.append(int(v))

        return {
            "key": self._build_fixture_key(fx),
            "values": values,
        }

    @staticmethod
    def _build_fixture_key(fx: Fixture) -> Dict[str, Any]:
        return {
            "manufacturer": fx.manufacturer,
            "model": fx.model,
            "universe": fx.universe,
            "address": fx.address,
            "channels": fx.channels,
        }

    def _find_fixture_for_key(self, key: Dict[str, Any]) -> Optional[Fixture]:
        manu = key.get("manufacturer")
        model = key.get("model")
        universe = key.get("universe")
        address = key.get("address")
        channels = key.get("channels")

        for fx in self.fixtures:
            if (
                fx.manufacturer == manu
                and fx.model == model
                and fx.universe == universe
                and fx.address == address
                and fx.channels == channels
            ):
                return fx
        return None

    def _load_store(self) -> Dict[str, Any]:
        if not self.presets_path.exists():
            return {}
        try:
            with self.presets_path.open("r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, dict):
                return data
        except Exception:
            pass
        return {}

    def _save_store(self, data: Dict[str, Any]) -> None:
        try:
            self.presets_path.parent.mkdir(parents=True, exist_ok=True)
            with self.presets_path.open("w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception:
            # En cas d'erreur de disque, on échoue silencieusement pour ne pas
            # bloquer l'application principale.
            return


__all__ = ["PresetManager"]

