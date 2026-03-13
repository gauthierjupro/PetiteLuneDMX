"""
Dialogue de calibration Lyre : inversion, swap axes, et limites Pan/Tilt (haute / basse).
Appliqué au pad manuel et aux modes automatiques (8, Circle, Ellipse).
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

import customtkinter as ctk


def _parse_percent(s: str) -> float:
    """Convertit une chaîne (0–100 ou 0.0–1.0) en valeur 0.0–1.0."""
    try:
        v = float(str(s).strip().replace(",", "."))
        if v > 1.5:  # interprété comme 0–100
            v = v / 100.0
        return max(0.0, min(1.0, v))
    except (ValueError, TypeError):
        return 0.0


def open_lyre_calibration_dialog(main_window: Any) -> None:
    """
    Ouvre le dialogue Calibration Lyre (inversion, swap, limites Pan/Tilt).
    main_window doit exposer : get_lyre_calibration, set_lyre_calibration,
    spot_controller, xy_last_x, xy_last_y, xy_pad, update_all_motions,
    spot_streak_running, spot_circle_running, spot_ellipse_running.
    """
    win = ctk.CTkToplevel(main_window)
    win.title("Calibration Lyres (Pan/Tilt)")
    win.resizable(True, True)
    try:
        px = main_window.winfo_rootx()
        py = main_window.winfo_rooty()
        pw = main_window.winfo_width()
        ph = main_window.winfo_height()
    except Exception:
        px, py, pw, ph = 100, 100, 700, 600
    w, h = 560, 520
    x = px + (pw // 2) - (w // 2)
    y = py + (ph // 2) - (h // 2)
    win.geometry(f"{w}x{h}+{x}+{y}")
    win.minsize(500, 460)
    win.transient(main_window)
    main_f = ctk.CTkFrame(win, fg_color="transparent")
    main_f.pack(fill="both", expand=True, padx=24, pady=20)
    main_f.columnconfigure(0, weight=1)

    ctk.CTkLabel(
        main_f,
        text="Calibration Lyres : inversion, swap axes et limites Pan/Tilt (mode manuel + auto 8/Circle/Ellipse)",
        font=("", 12, "bold"),
    ).grid(row=0, column=0, columnspan=8, sticky="w", pady=(0, 12))

    # En-têtes
    ctk.CTkLabel(main_f, text="", width=72).grid(row=1, column=0, padx=(0, 4))
    ctk.CTkLabel(main_f, text="Inverser Pan", font=("", 10), text_color="gray70").grid(row=1, column=1, sticky="w", pady=(0, 2))
    ctk.CTkLabel(main_f, text="Inverser Tilt", font=("", 10), text_color="gray70").grid(row=1, column=2, sticky="w", pady=(0, 2))
    ctk.CTkLabel(main_f, text="Swap axes", font=("", 10), text_color="gray70").grid(row=1, column=3, sticky="w", pady=(0, 2))
    ctk.CTkLabel(main_f, text="Pan min %", font=("", 10), text_color="gray70").grid(row=1, column=4, sticky="w", padx=(8, 2), pady=(0, 2))
    ctk.CTkLabel(main_f, text="Pan max %", font=("", 10), text_color="gray70").grid(row=1, column=5, sticky="w", pady=(0, 2))
    ctk.CTkLabel(main_f, text="Tilt min %", font=("", 10), text_color="gray70").grid(row=1, column=6, sticky="w", pady=(0, 2))
    ctk.CTkLabel(main_f, text="Tilt max %", font=("", 10), text_color="gray70").grid(row=1, column=7, sticky="w", pady=(0, 2))

    vars_invert: Dict[str, Any] = {}
    vars_swap: Dict[str, Any] = {}
    entries_limits: Dict[str, Any] = {}
    live_after_id: List[Optional[str]] = [None]

    def apply_live() -> None:
        if not win.winfo_exists():
            return
        for i in range(2):
            main_window.set_lyre_calibration(
                i,
                {
                    "invert_pan": vars_invert[f"pan_{i}"].get(),
                    "invert_tilt": vars_invert[f"tilt_{i}"].get(),
                    "swap_axes": vars_swap[f"swap_{i}"].get(),
                    "pan_min": _parse_percent(entries_limits[f"pan_min_{i}"].get()),
                    "pan_max": _parse_percent(entries_limits[f"pan_max_{i}"].get()),
                    "tilt_min": _parse_percent(entries_limits[f"tilt_min_{i}"].get()),
                    "tilt_max": _parse_percent(entries_limits[f"tilt_max_{i}"].get()),
                },
            )
        if getattr(main_window, "spot_streak_running", False) or getattr(main_window, "spot_circle_running", False) or getattr(main_window, "spot_ellipse_running", False):
            main_window.update_all_motions()
        else:
            main_window.spot_controller.on_xy_change(
                getattr(main_window, "xy_last_x", 0.5),
                getattr(main_window, "xy_last_y", 0.5),
            )

    def schedule_live() -> None:
        if live_after_id[0] is not None:
            try:
                win.after_cancel(live_after_id[0])
            except Exception:
                pass
        live_after_id[0] = win.after(350, apply_live)

    for i in range(2):
        cal = main_window.get_lyre_calibration(i)
        ctk.CTkLabel(main_f, text=f"Lyre {i + 1} :", font=("", 11)).grid(row=i + 2, column=0, sticky="w", padx=(0, 8), pady=6)
        var_pan = ctk.BooleanVar(value=bool(cal.get("invert_pan", False)))
        var_tilt = ctk.BooleanVar(value=bool(cal.get("invert_tilt", False)))
        var_swap = ctk.BooleanVar(value=bool(cal.get("swap_axes", False)))
        vars_invert[f"pan_{i}"] = var_pan
        vars_invert[f"tilt_{i}"] = var_tilt
        vars_swap[f"swap_{i}"] = var_swap
        ctk.CTkCheckBox(main_f, text="", variable=var_pan, width=24, command=schedule_live).grid(row=i + 2, column=1, sticky="w", pady=6)
        ctk.CTkCheckBox(main_f, text="", variable=var_tilt, width=24, command=schedule_live).grid(row=i + 2, column=2, sticky="w", pady=6)
        ctk.CTkCheckBox(main_f, text="", variable=var_swap, width=24, command=schedule_live).grid(row=i + 2, column=3, sticky="w", pady=6)
        for key, default in [("pan_min", 0.0), ("pan_max", 1.0), ("tilt_min", 0.0), ("tilt_max", 1.0)]:
            val = cal.get(key, default)
            pct = int(round(val * 100.0))
            e = ctk.CTkEntry(main_f, width=52, placeholder_text=str(pct), height=28)
            e.insert(0, str(pct))
            col = 4 + [("pan_min", "pan_max", "tilt_min", "tilt_max").index(key)]
            e.grid(row=i + 2, column=col, sticky="w", padx=(2 if col > 4 else 8, 2), pady=6)
            e.bind("<KeyRelease>", lambda ev: schedule_live())
            entries_limits[f"{key}_{i}"] = e

    help_frame = ctk.CTkFrame(
        main_f,
        fg_color=("gray92", "gray18"),
        corner_radius=8,
        border_width=1,
        border_color=("gray75", "gray30"),
    )
    help_frame.grid(row=4, column=0, columnspan=8, sticky="ew", pady=(16, 12))
    help_frame.columnconfigure(0, weight=1)
    ctk.CTkLabel(
        help_frame,
        text="Limites Pan/Tilt et autres logiciels",
        font=("", 11, "bold"),
    ).grid(row=0, column=0, sticky="w", padx=12, pady=(10, 4))
    help_text = (
        "• Les limites Pan min/max et Tilt min/max (0–100 %) bornent la zone de mouvement : en mode manuel (pad) et en modes auto (8, Circle, Ellipse), les lyres ne dépassent pas cette plage. Utile pour éviter murs, public ou zones interdites.\n\n"
        "• Réglage en direct : gardez la fenêtre ouverte, déplacez le pad ou lancez le 8/Circle pour voir l’effet. Inverser Pan/Tilt selon le sens physique ; Swap axes si le pad est en portrait.\n\n"
        "• Dans d’autres logiciels :\n"
        "  – QLC+ : XY Pad avec sliders de « range » (zone verte) ou min/max par fixture en %.\n"
        "  – DMXControl : réduction de l’amplitude en X/Y et déplacement du centre pour limiter la zone.\n"
        "  – Sur les fixtures : menu interne (end stops / limits) pour stocker les butées Pan et Tilt en degrés.\n\n"
        "• Ici les limites sont en % (0–100) du champ DMX et s’appliquent à toutes les commandes (pad + auto)."
    )
    ctk.CTkLabel(
        help_frame,
        text=help_text,
        font=("", 10),
        anchor="w",
        justify="left",
        wraplength=500,
    ).grid(row=1, column=0, sticky="ew", padx=12, pady=(0, 10))

    btn_f = ctk.CTkFrame(main_f, fg_color="transparent")
    btn_f.grid(row=5, column=0, columnspan=8, sticky="ew", pady=(8, 0))
    btn_f.columnconfigure(0, weight=1)
    ctk.CTkButton(btn_f, text="Fermer", width=100, command=win.destroy).pack(side="right", padx=(8, 0))

    def apply_and_close() -> None:
        for i in range(2):
            main_window.set_lyre_calibration(
                i,
                {
                    "invert_pan": vars_invert[f"pan_{i}"].get(),
                    "invert_tilt": vars_invert[f"tilt_{i}"].get(),
                    "swap_axes": vars_swap[f"swap_{i}"].get(),
                    "pan_min": _parse_percent(entries_limits[f"pan_min_{i}"].get()),
                    "pan_max": _parse_percent(entries_limits[f"pan_max_{i}"].get()),
                    "tilt_min": _parse_percent(entries_limits[f"tilt_min_{i}"].get()),
                    "tilt_max": _parse_percent(entries_limits[f"tilt_max_{i}"].get()),
                },
            )
        main_window.spot_controller.on_xy_change(
            getattr(main_window, "xy_last_x", 0.5),
            getattr(main_window, "xy_last_y", 0.5),
        )
        win.destroy()

    ctk.CTkButton(btn_f, text="OK", width=100, command=apply_and_close).pack(side="right")


__all__ = ["open_lyre_calibration_dialog"]
