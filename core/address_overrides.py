"""
Sauvegarde et chargement des adresses DMX modifiées dans l'onglet Univers.
Fichier : config/address_overrides.json  { "Nom fixture": adresse, ... }
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import List

from core.app_paths import overrides_path as _overrides_path
from models.fixtures import Fixture


def load_address_overrides(fixtures: List[Fixture]) -> None:
    """Applique les adresses mémorisées (par nom de fixture) sur les instances."""
    path = _overrides_path()
    if not path.exists():
        return
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return
    if not isinstance(data, dict):
        return
    for fx in fixtures:
        name = getattr(fx, "name", None) or ""
        if name and name in data:
            try:
                addr = int(data[name])
                if 1 <= addr <= 512:
                    fx.address = addr
            except (ValueError, TypeError):
                pass


def save_address_overrides(fixtures: List[Fixture]) -> None:
    """Enregistre les adresses actuelles de toutes les fixtures (par nom)."""
    path = _overrides_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    data = {}
    for fx in fixtures:
        name = getattr(fx, "name", None) or ""
        if name:
            data[name] = getattr(fx, "address", 1)
    try:
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    except Exception:
        pass
