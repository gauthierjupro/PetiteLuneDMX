from __future__ import annotations

from typing import Callable, Optional, Tuple

import customtkinter as ctk


class GigabarColorDialog(ctk.CTkToplevel):
    """Sélecteur de couleur pour la Gigabar avec preview, presets et mode expert RGB."""

    def __init__(
        self,
        master,
        initial_rgb: Tuple[int, int, int],
        on_change: Optional[Callable[[int, int, int], None]] = None,
    ) -> None:
        super().__init__(master)
        self.title("Couleur Gigabar")
        self.resizable(False, False)
        self.result: Optional[Tuple[int, int, int]] = None
        self._on_change = on_change

        # Centrage par rapport à la fenêtre principale
        parent = master.winfo_toplevel()
        try:
            parent_x = parent.winfo_rootx()
            parent_y = parent.winfo_rooty()
            parent_w = parent.winfo_width()
            parent_h = parent.winfo_height()
        except Exception:
            parent_x = parent_y = 100
            parent_w = parent_h = 600
        # Boîte un peu plus large pour mieux respirer
        width, height = 460, 330
        x = parent_x + (parent_w // 2) - (width // 2)
        y = parent_y + (parent_h // 2) - (height // 2)
        self.geometry(f"{width}x{height}+{x}+{y}")
        self.transient(parent)
        self.grab_set()

        r0, g0, b0 = initial_rgb

        # Titre
        title_label = ctk.CTkLabel(self, text="Sélection de la couleur Gigabar", anchor="w")
        title_label.grid(row=0, column=0, columnspan=3, padx=20, pady=(12, 4), sticky="w")

        # Preview carré 100x100
        self.preview = ctk.CTkFrame(
            self,
            fg_color=f"#{r0:02x}{g0:02x}{b0:02x}",
            corner_radius=8,
        )
        self.preview.grid(row=1, column=0, rowspan=2, padx=20, pady=(4, 8), sticky="nw")
        self.preview.configure(width=100, height=100)

        # Presets (grille 3 x 8)
        presets_frame = ctk.CTkFrame(self, fg_color="transparent")
        presets_frame.grid(row=1, column=1, columnspan=2, padx=(0, 20), pady=(4, 8), sticky="nw")

        preset_colors: list[tuple[str, Tuple[int, int, int]]] = [
            # Rangée 1
            ("Rouge", (255, 0, 0)),
            ("Vert", (0, 255, 0)),
            ("Bleu", (0, 0, 255)),
            ("Jaune", (255, 255, 0)),
            ("Cyan", (0, 255, 255)),
            ("Magenta", (255, 0, 255)),
            ("Ambre", (255, 191, 0)),
            ("Orange", (255, 128, 0)),
            # Rangée 2
            ("Rose bébé", (255, 182, 193)),
            ("Turquoise", (64, 224, 208)),
            ("Violet élect.", (138, 43, 226)),
            ("Lime", (191, 255, 0)),
            ("Bleu ciel", (135, 206, 250)),
            ("Rose vif", (255, 20, 147)),
            ("Vert menthe", (152, 255, 204)),
            ("Or", (255, 215, 0)),
            # Rangée 3 – blancs et nuances utiles
            ("Blanc chaud", (255, 220, 180)),
            ("Blanc neutre", (255, 255, 255)),
            ("Blanc froid", (200, 220, 255)),
            ("Lavande", (230, 230, 250)),
            ("Bleu nuit", (25, 25, 112)),
            ("Rouge sombre", (139, 0, 0)),
            ("Vert forêt", (34, 139, 34)),
            ("Bleu pétrole", (0, 128, 128)),
        ]
        for idx, (_name, (cr, cg, cb)) in enumerate(preset_colors):
            row = idx // 8
            col = idx % 8
            btn = ctk.CTkButton(
                presets_frame,
                text="",
                width=22,
                height=20,
                fg_color=f"#{cr:02x}{cg:02x}{cb:02x}",
                hover_color=f"#{cr:02x}{cg:02x}{cb:02x}",
                command=lambda r=cr, g=cg, b=cb: self._apply_preset(r, g, b),
            )
            btn.grid(row=row, column=col, padx=4, pady=4)

        # Mode expert (sliders RGB repliables)
        self._expert_var = ctk.BooleanVar(value=False)
        expert_toggle = ctk.CTkCheckBox(
            self,
            text="Mode expert (sliders RGB)",
            variable=self._expert_var,
            command=self._toggle_expert,
        )
        expert_toggle.grid(row=3, column=0, columnspan=3, padx=20, pady=(0, 4), sticky="w")

        # Frame contenant les sliders RGB (cachée par défaut)
        self.expert_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.expert_frame.grid(row=4, column=0, columnspan=3, padx=20, pady=(0, 4), sticky="nsew")

        self._r = ctk.CTkSlider(self.expert_frame, from_=0, to=255, number_of_steps=256)
        self._g = ctk.CTkSlider(self.expert_frame, from_=0, to=255, number_of_steps=256)
        self._b = ctk.CTkSlider(self.expert_frame, from_=0, to=255, number_of_steps=256)
        self._r.set(r0)
        self._g.set(g0)
        self._b.set(b0)

        def on_slider_change(_: float) -> None:
            r = int(self._r.get())
            g = int(self._g.get())
            b = int(self._b.get())
            self._update_preview_and_callback(r, g, b)

        for row, (lbl, slider) in enumerate((("R", self._r), ("V", self._g), ("B", self._b)), start=0):
            ctk.CTkLabel(self.expert_frame, text=lbl, width=20, anchor="e").grid(
                row=row, column=0, padx=(0, 6), pady=2, sticky="e"
            )
            slider.configure(command=on_slider_change)
            slider.grid(row=row, column=1, padx=(0, 0), pady=2, sticky="ew")

        self.expert_frame.columnconfigure(1, weight=1)
        # Cacher le panneau expert par défaut
        self.expert_frame.grid_remove()

        # Boutons OK / Annuler
        btn_row = ctk.CTkFrame(self, fg_color="transparent")
        btn_row.grid(row=5, column=0, columnspan=3, pady=(6, 12))
        ok_btn = ctk.CTkButton(btn_row, text="OK", width=80, command=self._on_ok)
        cancel_btn = ctk.CTkButton(btn_row, text="Annuler", width=80, command=self._on_cancel)
        ok_btn.pack(side="left", padx=8)
        cancel_btn.pack(side="left", padx=8)

        self.columnconfigure(1, weight=1)
        self.focus_force()

    def _toggle_expert(self) -> None:
        if self._expert_var.get():
            self.expert_frame.grid()
        else:
            self.expert_frame.grid_remove()

    def _update_preview_and_callback(self, r: int, g: int, b: int) -> None:
        self.preview.configure(fg_color=f"#{r:02x}{g:02x}{b:02x}")
        if self._on_change is not None:
            try:
                self._on_change(r, g, b)
            except Exception:
                pass

    def _apply_preset(self, r: int, g: int, b: int) -> None:
        # Met à jour sliders, preview et applique immédiatement la couleur
        self._r.set(r)
        self._g.set(g)
        self._b.set(b)
        self._update_preview_and_callback(r, g, b)

    def _on_ok(self) -> None:
        r = int(self._r.get())
        g = int(self._g.get())
        b = int(self._b.get())
        self.result = (r, g, b)
        self.destroy()

    def _on_cancel(self) -> None:
        self.result = None
        self.destroy()

