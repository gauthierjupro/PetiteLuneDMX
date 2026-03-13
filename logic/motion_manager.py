"""
Gestion des mouvements automatiques des lyres : formules trigonométriques (STREAK / CIRCLE)
et offset 180° entre lyre 1 et lyre 2. Découplé de l'UI.
"""

from __future__ import annotations

import math
from typing import Literal, Tuple

MotionMode = Literal["streak", "circle", "ellipse"]


def clamp_01(x: float, y: float) -> Tuple[float, float]:
    """Clamp les coordonnées normalisées dans [0, 1]."""
    return (max(0.0, min(1.0, x)), max(0.0, min(1.0, y)))


class MotionManager:
    """
    Calcule les positions Pan/Tilt normalisées (0–1) pour deux lyres en mode
    8 (figure-8), CIRCLE (cercle) ou ELLIPSE (ovale horizontal),
    avec offset de 180° (θ₂ = θ₁ + π) entre les deux lyres.
    """

    def __init__(
        self,
        center_x: float = 0.5,
        center_y: float = 0.5,
        amplitude: float = 0.2,
    ) -> None:
        self._center_x = center_x
        self._center_y = center_y
        self._amplitude = amplitude
        self._time_counter: float = 0.0

    def set_center(self, x: float, y: float) -> None:
        self._center_x = x
        self._center_y = y

    def set_amplitude(self, amplitude: float) -> None:
        self._amplitude = amplitude

    def reset_time(self) -> None:
        self._time_counter = 0.0

    def advance(self, speed_slider_0_1: float) -> Tuple[float, float]:
        """
        Incrémente le compteur de temps et retourne (θ₁, θ₂) avec θ₂ = θ₁ + π.
        speed_slider_0_1 : valeur 0–1 du slider Vitesse (plus c'est haut, plus c'est rapide).
        """
        step = (0.5 + speed_slider_0_1) * 0.15
        self._time_counter += step
        theta_1 = self._time_counter
        theta_2 = theta_1 + math.pi
        return (theta_1, theta_2)

    def get_theta(self) -> Tuple[float, float]:
        """Retourne (θ₁, θ₂) sans avancer le temps (pour lecture par le thread Dynamo)."""
        t = self._time_counter
        return (t, t + math.pi)

    def get_positions(
        self,
        mode: MotionMode,
        theta_1: float,
        theta_2: float,
    ) -> Tuple[float, float, float, float]:
        """
        Retourne (nx1, ny1, nx2, ny2) normalisés dans [0, 1].

        - streak (8) : figure-8 — X = Xc + A*sin(θ), Y = Yc + A*0.5*sin(2θ).
        - circle : X = Xc + A*cos(θ), Y = Yc + A*sin(θ).
        - ellipse : ovale horizontal — X = Xc + A*1.3*cos(θ), Y = Yc + A*0.7*sin(θ).
        """
        xc, yc = self._center_x, self._center_y
        A = self._amplitude

        if mode == "streak":
            # Figure-8 : une boucle en X, deux en Y sur un cycle
            nx1 = xc + A * math.sin(theta_1)
            ny1 = yc + A * 0.5 * math.sin(2.0 * theta_1)
            nx2 = xc + A * math.sin(theta_2)
            ny2 = yc + A * 0.5 * math.sin(2.0 * theta_2)
        elif mode == "ellipse":
            # Ellipse horizontale (ovale) : rapport 1.3 / 0.7
            nx1 = xc + A * 1.3 * math.cos(theta_1)
            ny1 = yc + A * 0.7 * math.sin(theta_1)
            nx2 = xc + A * 1.3 * math.cos(theta_2)
            ny2 = yc + A * 0.7 * math.sin(theta_2)
        else:
            # circle
            nx1 = xc + A * math.cos(theta_1)
            ny1 = yc + A * math.sin(theta_1)
            nx2 = xc + A * math.cos(theta_2)
            ny2 = yc + A * math.sin(theta_2)

        (nx1, ny1) = clamp_01(nx1, ny1)
        (nx2, ny2) = clamp_01(nx2, ny2)
        return (nx1, ny1, nx2, ny2)

    def cycle_index(self, theta_1: float) -> int:
        """Indice de cycle complet (θ repasse par 0 modulo 2π) pour Auto-Gobo / Mirror Color."""
        return int(theta_1 // (2 * math.pi))
