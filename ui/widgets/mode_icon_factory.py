from __future__ import annotations

from typing import Dict, Tuple

import customtkinter as ctk

from ui.constants_ambience import MODE_COLORS

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:  # Pillow non installé : les appels renverront None
    Image = None  # type: ignore[assignment]
    ImageDraw = None  # type: ignore[assignment]
    ImageFont = None  # type: ignore[assignment]


_CACHE: Dict[Tuple[str, int], ctk.CTkImage] = {}


def get_mode_icon(mode_name: str, size: int = 32) -> ctk.CTkImage | None:
    """
    Retourne une CTkImage colorée pour le mode donné.

    Si Pillow n'est pas disponible, retourne None et laisse les boutons
    afficher simplement le texte.
    """
    if Image is None or ImageDraw is None or ImageFont is None:
        return None

    key = (mode_name, size)
    if key in _CACHE:
        return _CACHE[key]

    base_color, _ = MODE_COLORS.get(mode_name, ("#1f2937", "#0ea5e9"))

    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Fond arrondi coloré
    pad = int(size * 0.1)
    radius = int(size * 0.3)
    xy = (pad, pad, size - pad, size - pad)
    try:
        draw.rounded_rectangle(xy, radius=radius, fill=base_color)
    except TypeError:
        draw.rectangle(xy, fill=base_color)

    # Icône blanche stylisée selon le mode
    cx = cy = size / 2.0
    w = h = size

    if mode_name == "MANUAL":
        # Petit cercle plein au centre
        r = size * 0.14
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill="white")

    elif mode_name == "CHASE":
        # Deux chevrons >
        dx = size * 0.08
        dy = size * 0.16
        x0 = cx - dx
        y0 = cy - dy
        x1 = cx + dx
        y1 = cy
        x2 = cx - dx
        y2 = cy + dy
        draw.polygon([(x0, y0), (x1, y1), (x0, y2)], fill="white")
        off = size * 0.16
        draw.polygon([(x0 + off, y0), (x1 + off, y1), (x0 + off, y2)], fill="white")

    elif mode_name == "PULSE":
        # 3 barres verticales type VU
        bar_w = size * 0.08
        gap = size * 0.04
        base_y = cy + size * 0.16
        heights = [size * 0.30, size * 0.45, size * 0.30]
        start_x = cx - (bar_w * 1.5 + gap)
        for i in range(3):
            x0 = start_x + i * (bar_w + gap)
            x1 = x0 + bar_w
            y1 = base_y
            y0 = y1 - heights[i]
            draw.rounded_rectangle((x0, y0, x1, y1), radius=int(bar_w / 2), fill="white")

    elif mode_name == "RAINBOW":
        # Arc de cercle
        r_outer = size * 0.36
        r_inner = size * 0.24
        box_outer = (cx - r_outer, cy - r_outer, cx + r_outer, cy + r_outer)
        box_inner = (cx - r_inner, cy - r_inner, cx + r_inner, cy + r_inner)
        draw.arc(box_outer, start=210, end=330, fill="white", width=int(size * 0.08))
        # efface l'intérieur pour donner un arc
        mask = Image.new("L", img.size, 0)
        mdraw = ImageDraw.Draw(mask)
        mdraw.ellipse(box_inner, fill=255)
        img.paste((0, 0, 0, 0), mask=mask)

    else:
        # Fallback : petit texte "?" au centre
        try:
            font = ImageFont.load_default()
            text = "?"
            tw, th = draw.textsize(text, font=font)
            tx = (w - tw) // 2
            ty = (h - th) // 2
            draw.text((tx, ty), text, fill="white", font=font)
        except Exception:
            pass

    icon = ctk.CTkImage(light_image=img, dark_image=img, size=(size, size))
    _CACHE[key] = icon
    return icon


__all__ = ["get_mode_icon"]

