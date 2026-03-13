"""Dialogue de calibration Dynamo : inversion et offset Pan/Tilt par fixture, application en direct."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

import customtkinter as ctk


def _parse_offset(s: str) -> float:
    try:
        return max(-0.5, min(0.5, float(str(s).strip().replace(",", "."))))
    except (ValueError, TypeError):
        return 0.0


def open_dynamo_calibration_dialog(main_window: Any) -> None:
    """
    Ouvre le dialogue Calibration Dynamo (inversion et offset Pan/Tilt par fixture).
    Les réglages sont appliqués en direct. main_window doit exposer :
    get_dynamo_calibration, set_dynamo_calibration, spot_controller, dynamo_xy_last_x,
    dynamo_xy_last_y, update_all_motions, dynamo_streak_running, dynamo_circle_running,
    dynamo_ellipse_running.
    """
    win = ctk.CTkToplevel(main_window)
    win.title("Calibration Dynamo")
    win.resizable(True, True)
    try:
        px = main_window.winfo_rootx()
        py = main_window.winfo_rooty()
        pw = main_window.winfo_width()
        ph = main_window.winfo_height()
    except Exception:
        px, py, pw, ph = 100, 100, 700, 600
    w, h = 480, 420
    x = px + (pw // 2) - (w // 2)
    y = py + (ph // 2) - (h // 2)
    win.geometry(f"{w}x{h}+{x}+{y}")
    win.minsize(440, 380)
    win.transient(main_window)
    main_f = ctk.CTkFrame(win, fg_color="transparent")
    main_f.pack(fill="both", expand=True, padx=24, pady=20)
    main_f.columnconfigure(0, weight=1)

    ctk.CTkLabel(
        main_f,
        text="Inversion et offset Pan / Tilt selon le montage physique",
        font=("", 13, "bold"),
    ).grid(row=0, column=0, columnspan=4, sticky="w", pady=(0, 12))
    ctk.CTkLabel(main_f, text="", width=80).grid(row=1, column=0, padx=(0, 8))
    ctk.CTkLabel(main_f, text="Inverser Pan", font=("", 10), text_color="gray70").grid(
        row=1, column=1, sticky="w", pady=(0, 2)
    )
    ctk.CTkLabel(main_f, text="Inverser Tilt", font=("", 10), text_color="gray70").grid(
        row=1, column=2, sticky="w", pady=(0, 2)
    )
    ctk.CTkLabel(main_f, text="Offset Pan", font=("", 10), text_color="gray70").grid(
        row=1, column=3, sticky="w", padx=(8, 0), pady=(0, 2)
    )
    ctk.CTkLabel(main_f, text="Offset Tilt", font=("", 10), text_color="gray70").grid(
        row=1, column=4, sticky="w", pady=(0, 2)
    )

    vars_invert: Dict[str, Any] = {}
    entries_offset: Dict[str, Any] = {}
    live_after_id: List[Optional[str]] = [None]

    def apply_live() -> None:
        if not win.winfo_exists():
            return
        for i in range(2):
            main_window.set_dynamo_calibration(
                i,
                {
                    "invert_pan": vars_invert[f"pan_{i}"].get(),
                    "invert_tilt": vars_invert[f"tilt_{i}"].get(),
                    "offset_pan": _parse_offset(entries_offset[f"pan_{i}"].get()),
                    "offset_tilt": _parse_offset(entries_offset[f"tilt_{i}"].get()),
                },
            )
        if (
            main_window.dynamo_streak_running
            or main_window.dynamo_circle_running
            or getattr(main_window, "dynamo_ellipse_running", False)
        ):
            main_window.update_all_motions()
        else:
            main_window.spot_controller.on_dynamo_xy_change(
                main_window.dynamo_xy_last_x,
                main_window.dynamo_xy_last_y,
            )

    def schedule_live() -> None:
        if live_after_id[0] is not None:
            try:
                win.after_cancel(live_after_id[0])
            except Exception:
                pass
        live_after_id[0] = win.after(350, apply_live)

    for i in range(2):
        cal = main_window.get_dynamo_calibration(i)
        ctk.CTkLabel(main_f, text=f"Dynamo {i + 1} :", font=("", 11)).grid(
            row=i + 2, column=0, sticky="w", padx=(0, 8), pady=6
        )
        var_pan = ctk.BooleanVar(value=bool(cal.get("invert_pan", False)))
        var_tilt = ctk.BooleanVar(value=bool(cal.get("invert_tilt", False)))
        vars_invert[f"pan_{i}"] = var_pan
        vars_invert[f"tilt_{i}"] = var_tilt
        ctk.CTkCheckBox(main_f, text="", variable=var_pan, width=24, command=apply_live).grid(
            row=i + 2, column=1, sticky="w", pady=6
        )
        ctk.CTkCheckBox(main_f, text="", variable=var_tilt, width=24, command=apply_live).grid(
            row=i + 2, column=2, sticky="w", pady=6
        )
        op = cal.get("offset_pan", 0.0)
        ot = cal.get("offset_tilt", 0.0)
        ep = ctk.CTkEntry(main_f, width=70, placeholder_text="0", height=28)
        ep.insert(0, f"{op:+.2f}" if op != 0 else "0")
        ep.grid(row=i + 2, column=3, sticky="w", padx=(8, 4), pady=6)
        et = ctk.CTkEntry(main_f, width=70, placeholder_text="0", height=28)
        et.insert(0, f"{ot:+.2f}" if ot != 0 else "0")
        et.grid(row=i + 2, column=4, sticky="w", pady=6)
        ep.bind("<KeyRelease>", lambda e: schedule_live())
        et.bind("<KeyRelease>", lambda e: schedule_live())
        entries_offset[f"pan_{i}"] = ep
        entries_offset[f"tilt_{i}"] = et

    help_frame = ctk.CTkFrame(
        main_f,
        fg_color=("gray92", "gray18"),
        corner_radius=8,
        border_width=1,
        border_color=("gray75", "gray30"),
    )
    help_frame.grid(row=4, column=0, columnspan=5, sticky="ew", pady=(16, 12))
    help_frame.columnconfigure(0, weight=1)
    ctk.CTkLabel(
        help_frame,
        text="Aide – Réglage au mieux des deux Dynamo",
        font=("", 11, "bold"),
    ).grid(row=0, column=0, sticky="w", padx=12, pady=(10, 4))
    help_text = (
        "• Les réglages sont appliqués en direct : gardez la fenêtre ouverte et déplacez le pad pour affiner en voyant l'effet immédiat.\n\n"
        "• Tester chaque Dynamo seule : déplacer le pad (Pan puis Tilt). Si le sens est inversé, cocher Inverser Pan ou Inverser Tilt.\n\n"
        "• Offset Pan / Tilt : décalage en position (ex. 0,02 ou -0,01) pour aligner une tête par rapport à l'autre. Plage -0,5 à +0,5.\n\n"
        "• Deux têtes de part et d'autre : souvent inverser uniquement le Pan sur une des deux pour le miroir symétrique.\n\n"
        "• Tête montée à l'envers : cocher les deux inversions si besoin. Vérifier les menus des Dynamo pour éviter double inversion.\n\n"
        "• Après réglage, utiliser la coche 180° sur la carte Dynamo pour le mouvement en miroir."
    )
    ctk.CTkLabel(
        help_frame,
        text=help_text,
        font=("", 10),
        anchor="w",
        justify="left",
        wraplength=420,
    ).grid(row=1, column=0, sticky="ew", padx=12, pady=(0, 10))

    btn_f = ctk.CTkFrame(main_f, fg_color="transparent")
    btn_f.grid(row=5, column=0, columnspan=5, sticky="ew", pady=(8, 0))
    btn_f.columnconfigure(0, weight=1)
    ctk.CTkButton(btn_f, text="Annuler", width=100, command=win.destroy).pack(side="left", padx=(0, 8))

    def apply_and_close() -> None:
        for i in range(2):
            main_window.set_dynamo_calibration(
                i,
                {
                    "invert_pan": vars_invert[f"pan_{i}"].get(),
                    "invert_tilt": vars_invert[f"tilt_{i}"].get(),
                    "offset_pan": _parse_offset(entries_offset[f"pan_{i}"].get()),
                    "offset_tilt": _parse_offset(entries_offset[f"tilt_{i}"].get()),
                },
            )
        main_window.spot_controller.on_dynamo_xy_change(
            main_window.dynamo_xy_last_x,
            main_window.dynamo_xy_last_y,
        )
        win.destroy()

    ctk.CTkButton(btn_f, text="OK", width=100, command=apply_and_close).pack(side="left")
