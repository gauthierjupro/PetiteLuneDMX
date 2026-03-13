"""
Gestion de la version de l'application Petite DMX.
Lit la version de base et optionnellement les infos Git (tag, commit, dirty).
"""
from __future__ import annotations

import subprocess
from pathlib import Path

APP_NAME = "Petite DMX"
VERSION = "1.3.0"


def _git_describe(repo_path: Path | None = None) -> str | None:
    """Retourne la sortie de `git describe --tags --always --dirty` ou None si indisponible."""
    path = repo_path or Path(__file__).resolve().parent.parent
    try:
        out = subprocess.run(
            ["git", "describe", "--tags", "--always", "--dirty"],
            cwd=path,
            capture_output=True,
            text=True,
            timeout=2,
        )
        if out.returncode == 0 and out.stdout:
            return out.stdout.strip()
    except (FileNotFoundError, subprocess.TimeoutExpired, Exception):
        pass
    return None


def get_version_string(include_git: bool = True) -> str:
    """Retourne la version affichable, avec optionnellement le suffixe Git."""
    base = VERSION
    if include_git:
        git = _git_describe()
        if git:
            return f"{base}  ({git})"
    return base


def get_full_info() -> dict[str, str]:
    """Retourne un dict avec nom, version, et infos Git pour l'affichage."""
    git = _git_describe()
    return {
        "app_name": APP_NAME,
        "version": VERSION,
        "version_display": get_version_string(include_git=True),
        "git": git or "—",
    }


__all__ = ["APP_NAME", "VERSION", "get_version_string", "get_full_info"]
