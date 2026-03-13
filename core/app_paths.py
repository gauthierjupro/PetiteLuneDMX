"""
Chemins de l'application : fonctionnent en mode script et en exe PyInstaller (frozen).
En frozen, le répertoire de l'exe est utilisé pour lire/écrire config (presets, overrides).
"""
from __future__ import annotations

import sys
from pathlib import Path


def _is_frozen() -> bool:
    return getattr(sys, "frozen", False)


def app_root() -> Path:
    """Répertoire racine de l'app : projet en dev, répertoire de l'exe en frozen."""
    if _is_frozen():
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent.parent


def config_dir() -> Path:
    """Répertoire config/ (presets.json, address_overrides.json). Créé si besoin en frozen."""
    root = app_root()
    cfg = root / "config"
    if _is_frozen() and not cfg.exists():
        # Copier les fichiers par défaut depuis le bundle (sys._MEIPASS)
        meipass = getattr(sys, "_MEIPASS", None)
        if meipass:
            src = Path(meipass) / "config"
            if src.exists():
                cfg.mkdir(parents=True, exist_ok=True)
                for f in src.iterdir():
                    if f.is_file() and not (cfg / f.name).exists():
                        (cfg / f.name).write_bytes(f.read_bytes())
    return cfg


def presets_path() -> Path:
    return config_dir() / "presets.json"


def overrides_path() -> Path:
    return config_dir() / "address_overrides.json"


def card_visibility_path() -> Path:
    """Fichier de préférences d'affichage des cartes (onglet Contrôle)."""
    return config_dir() / "card_visibility.json"


def spot_position_memory_path() -> Path:
    """Fichier des positions mémorisées P1–P4 (pad XY Lyres)."""
    return config_dir() / "spot_position_memory.json"


def dynamo_position_memory_path() -> Path:
    """Fichier des positions mémorisées P1–P4 (pad XY Dynamo)."""
    return config_dir() / "dynamo_position_memory.json"


def calibration_path() -> Path:
    """Fichier des calibrations Lyre et Dynamo (inversion pan/tilt, offsets)."""
    return config_dir() / "calibration.json"


def fin_de_morceau_path() -> Path:
    """Fichier de l'état « Fin de morceau » (snapshot de toutes les cartes)."""
    return config_dir() / "fin_de_morceau.json"
