from __future__ import annotations

from typing import Callable, Optional, Tuple

import customtkinter as ctk

from ui.widgets.gigabar_color_dialog import GigabarColorDialog
from ui.constants_ambience import (
    CARD_HEIGHT,
    CARD_WIDTH,
    BASE_COLORS_2X2,
    MODE_ICONS,
    MODE_COLORS,
    ICON_FONT_FAMILY,
    ICON_FONT_SIZE,
)


ColorCallback = Callable[[Tuple[int, int, int]], None]
DimCallback = Callable[[float], None]


class _ToolTip:
    """Tooltip léger pour widgets CTk/Tk (affiché au survol)."""

    _active = None  # type: ignore[assignment]
    _after_id = None

    def __init__(self, widget: ctk.CTkBaseClass, text: str) -> None:
        self.widget = widget
        self.text = text
        self._tip_window: ctk.CTkToplevel | None = None
        self._local_after_id: int | None = None
        widget.bind("<Enter>", self._on_enter)
        widget.bind("<Leave>", self._on_leave)

    def _on_enter(self, _event) -> None:  # type: ignore[override]
        if not self.text:
            return
        # Annule tout affichage planifié précédent
        if _ToolTip._after_id is not None and _ToolTip._active is not None:
            try:
                _ToolTip._active.widget.after_cancel(_ToolTip._after_id)
            except Exception:
                pass
            _ToolTip._after_id = None

        _ToolTip._active = self

        # Délai avant affichage (en ms)
        def _show() -> None:
            # Si un autre tooltip est devenu actif entre‑temps, on abandonne
            if _ToolTip._active is not self or not self.text:
                return
            # Ferme toute fenêtre encore ouverte
            if self._tip_window is not None:
                try:
                    self._tip_window.destroy()
                except Exception:
                    pass
                self._tip_window = None
            root = self.widget.winfo_toplevel()
            try:
                x = self.widget.winfo_rootx() + 10
                y = self.widget.winfo_rooty() + self.widget.winfo_height() + 6
            except Exception:
                x = y = 100
            win = ctk.CTkToplevel(root)
            win.overrideredirect(True)
            win.geometry(f"+{x}+{y}")
            win.attributes("-topmost", True)
            label = ctk.CTkLabel(
                win,
                text=self.text,
                anchor="w",
                justify="left",
                fg_color="#020617",
                text_color="#e5e7eb",
                corner_radius=4,
                padx=6,
                pady=2,
            )
            label.pack()
            self._tip_window = win

        # Stocke l'id d'after pour pouvoir l'annuler à la sortie
        self._local_after_id = self.widget.after(600, _show)
        _ToolTip._after_id = self._local_after_id

    def _on_leave(self, _event) -> None:  # type: ignore[override]
        # Annule l'affichage différé si nécessaire
        if self._local_after_id is not None:
            try:
                self.widget.after_cancel(self._local_after_id)
            except Exception:
                pass
            self._local_after_id = None
        if _ToolTip._after_id is not None and _ToolTip._active is self:
            _ToolTip._after_id = None

        if self._tip_window is not None:
            try:
                self._tip_window.destroy()
            except Exception:
                pass
            self._tip_window = None
        if _ToolTip._active is self:
            _ToolTip._active = None


def update_button_style(button: ctk.CTkButton, color: str, active: bool) -> None:
    """
    Style commun pour les petits boutons de couleur / presets.

    - active False : fond transparent, contour coloré.
    - active True  : fond coloré, sans bordure.
    """
    if active:
        button.configure(
            fg_color=color,
            hover_color=color,
            border_width=2,
            border_color="#e5e7eb",
        )
    else:
        button.configure(
            fg_color="#111827",
            hover_color="#1f2937",
            border_width=2,
            border_color=color,
        )


class LightGroupFrame(ctk.CTkFrame):
    """
    Carte d'ambiance unifiée : zone sliders (gauche), grille 2x2 R,V,B,W + U1-U4 (centre),
    rangée de modes logiciels (bas). Taille fixe pour alignement avec GigabarCard / Master.
    """

    def __init__(
        self,
        master,
        title: str,
        on_color: ColorCallback,
        on_dim_change: DimCallback,
        on_strobe_change: Optional[DimCallback] = None,
        on_logic_mode_change: Optional[Callable[[str], None]] = None,
        *args,
        **kwargs,
    ) -> None:
        super().__init__(
            master,
            border_width=1,
            border_color="#0ea5e9",
            corner_radius=15,
            fg_color="#111827",
            width=CARD_WIDTH,
            height=CARD_HEIGHT,
            *args,
            **kwargs,
        )
        self.on_color = on_color
        self.on_dim_change = on_dim_change
        self.on_strobe_change = on_strobe_change
        self.on_logic_mode_change = on_logic_mode_change
        self.audio_mode: str = "OFF"
        self.audio_sensitivity: float = 0.5
        self.active_color_btn: Optional[str] = None
        self.btns: dict = {}
        self.current_rgb: Tuple[int, int, int] = (0, 0, 0)
        self.user_presets: list[Optional[Tuple[int, int, int]]] = [None, None, None, None]
        self.user_preset_buttons: list[ctk.CTkButton] = []
        self.active_user_preset: Optional[int] = None
        self.icon_font = ctk.CTkFont(family=ICON_FONT_FAMILY, size=ICON_FONT_SIZE)

        self.columnconfigure(0, weight=1)
        self.rowconfigure(1, weight=1)
        self.grid_propagate(False)

        self.title_label = ctk.CTkLabel(self, text=title, anchor="w", font=("", 13, "bold"))
        self.title_label.grid(row=0, column=0, sticky="w", pady=(4, 0), padx=(6, 6))

        container = ctk.CTkFrame(self, fg_color="#020617", corner_radius=12)
        container.grid(row=1, column=0, sticky="nsew", padx=10, pady=(6, 10))
        container.columnconfigure(0, weight=0)
        container.columnconfigure(1, weight=0)
        container.columnconfigure(2, weight=0)
        container.columnconfigure(3, weight=0)
        container.columnconfigure(4, weight=1)
        container.rowconfigure(0, weight=0)

        sliders_frame = ctk.CTkFrame(container, fg_color="#020617")
        sliders_frame.grid(row=0, column=0, sticky="n", padx=(0, 6), pady=0)
        sliders_frame.columnconfigure(0, weight=0)
        sliders_frame.columnconfigure(1, weight=0)

        ctk.CTkLabel(sliders_frame, text="Dimmer", font=("", 10)).grid(row=0, column=0, pady=(0, 2))
        self.slider = ctk.CTkSlider(
            sliders_frame,
            from_=0.0, to=1.0,
            orientation="vertical",
            number_of_steps=100,
            height=92,
            width=18,
            command=self._on_slider_change,
             fg_color="#020617",
             progress_color="#0ea5e9",
            button_color="#e5e7eb",
            button_hover_color="#ffffff",
        )
        self.slider.set(1.0)
        self.slider.grid(row=1, column=0, pady=(0, 2), padx=(0, 4))
        self.slider_label = ctk.CTkLabel(sliders_frame, text="100%", width=34, anchor="center", font=("", 10))
        self.slider_label.grid(row=2, column=0, pady=(0, 0))

        if on_strobe_change is not None:
            ctk.CTkLabel(sliders_frame, text="Strobe", font=("", 10)).grid(row=0, column=1, pady=(0, 2))
            self.strobe_slider = ctk.CTkSlider(
                sliders_frame,
                from_=0.0, to=1.0,
                orientation="vertical",
                number_of_steps=256,
                height=92,
                width=18,
                command=self._on_strobe_change,
                fg_color="#020617",
                progress_color="#9ca3af",
                button_color="#ecf0f1",
                button_hover_color="#ffffff",
            )
            self.strobe_slider.set(0.0)
            self.strobe_slider.grid(row=1, column=1, pady=(0, 2))
            self.strobe_label = ctk.CTkLabel(
                sliders_frame,
                text="0%",
                width=34,
                anchor="center",
                font=("", 10),
            )
            self.strobe_label.grid(row=2, column=1, pady=(0, 0))
        else:
            self.strobe_slider = None
            self.strobe_label = None

        colors_frame = ctk.CTkFrame(container, fg_color="#020617", corner_radius=10)
        colors_frame.grid(row=0, column=1, sticky="n", padx=(0, 6), pady=0)
        colors_grid = ctk.CTkFrame(colors_frame, fg_color="transparent")
        colors_grid.grid(row=0, column=0, sticky="nw")
        color_hex_map = {"R": "#ff0000", "V": "#00ff00", "B": "#0000ff", "W": "#f2f2f2"}
        for i, (label, rgb) in enumerate(BASE_COLORS_2X2):
            r, c = i // 2, i % 2
            color_hex = color_hex_map.get(label, "#808080")
            btn = ctk.CTkButton(colors_grid, text=label, width=45, height=45, corner_radius=6)
            btn._base_color = color_hex  # type: ignore[attr-defined]
            update_button_style(btn, color_hex, active=False)
            btn.configure(command=lambda name=label, val=rgb: self._on_color_button(name, val))
            _ToolTip(btn, f"Couleur {label}")
            btn.grid(row=r, column=c, padx=2, pady=2, sticky="nw")
            self.btns[label] = btn

        presets_grid = ctk.CTkFrame(colors_frame, fg_color="#020617")
        presets_grid.grid(row=1, column=0, sticky="nw", pady=(4, 0))
        for idx in range(4):
            r, c = divmod(idx, 2)
            u_btn = ctk.CTkButton(
                presets_grid,
                text=f"U{idx + 1}",
                width=45,
                height=45,
                corner_radius=6,
            )
            u_btn._base_color = "#4b5563"  # type: ignore[attr-defined]
            update_button_style(u_btn, "#4b5563", active=False)
            u_btn.grid(row=r, column=c, padx=2, pady=2, sticky="nw")
            u_btn.bind("<Button-1>", lambda _e, i=idx: self._apply_user_preset(i))
            u_btn.bind("<Button-3>", lambda _e, i=idx: self._open_user_preset_dialog(i))
            _ToolTip(u_btn, f"Preset utilisateur U{idx + 1}\nClic: appliquer  •  Clic droit: configurer")
            self.user_preset_buttons.append(u_btn)

        self.audio_mode_var = ctk.StringVar(value="OFF")
        self.logic_mode: str = "MANUAL"
        self.logic_mode_buttons: dict[str, ctk.CTkButton] = {}
        modes_frame = ctk.CTkFrame(
            container,
            fg_color="#020617",
            border_width=1,
            border_color="#334155",
            corner_radius=10,
        )
        modes_frame.grid(row=0, column=2, sticky="n", pady=0)
        for col_idx in range(2):
            modes_frame.columnconfigure(col_idx, weight=1)

        for idx, (_icon_text, mode_name) in enumerate(MODE_ICONS):
            row_idx, col_idx = divmod(idx, 2)
            btn = ctk.CTkButton(
                modes_frame,
                text=_icon_text,
                font=self.icon_font,
                width=45,
                height=45,
                corner_radius=6,
                fg_color="#1f2937",
                hover_color="#374151",
                text_color=MODE_COLORS.get(mode_name, ("#9ca3af", "#ffffff"))[0],
                command=lambda m=mode_name: self._on_logic_mode_clicked(m),
            )
            if idx == len(MODE_ICONS) - 1 and col_idx == 0:
                btn.grid(row=row_idx, column=0, columnspan=2, padx=3, pady=(3, 2), sticky="ew")
            else:
                btn.grid(row=row_idx, column=col_idx, padx=3, pady=(3, 2), sticky="ew")
            self.logic_mode_buttons[mode_name] = btn
            if mode_name == "MANUAL":
                tip = "Mode 🎨 Manuel\nCouleur fixe contrôlée par la carte."
            elif mode_name == "PULSE":
                tip = "Mode 💓 Pulse\nVariations d'intensité synchronisées."
            elif mode_name == "RAINBOW":
                tip = "Mode 🌈 Rainbow\nChangements de couleur automatiques."
            else:
                tip = f"Mode {mode_name}\nEffet logiciel."
            _ToolTip(btn, tip)

        # Colonne OUT : niveau réel envoyé après Master
        out_frame = ctk.CTkFrame(container, fg_color="#020617", corner_radius=10)
        out_frame.grid(row=0, column=3, sticky="n", padx=(0, 4))
        ctk.CTkLabel(out_frame, text="OUT", font=("", 9)).grid(row=0, column=0, pady=(0, 2))
        self.vu = ctk.CTkProgressBar(
            out_frame,
            orientation="vertical",
            width=10,
            height=80,
            fg_color="#020617",
            progress_color="#22c55e",
        )
        self.vu.set(0.0)
        self.vu.grid(row=1, column=0, pady=(0, 2))
        self.vu_label = ctk.CTkLabel(out_frame, text="0%", width=40, anchor="center", font=("", 10))
        self.vu_label.grid(row=2, column=0, pady=(0, 0))

        # Widgets BPM conservés pour la logique existante, mais masqués
        hidden_runtime = ctk.CTkFrame(self, fg_color="transparent", width=1, height=1)
        self.rhythm_beat_label = ctk.CTkLabel(
            hidden_runtime,
            text="",
            width=10,
            height=10,
            corner_radius=5,
            fg_color="#111827",
        )
        self.audio_sens_slider = ctk.CTkSlider(
            hidden_runtime,
            from_=0.0,
            to=1.0,
            number_of_steps=20,
            width=78,
            command=self._on_audio_sensitivity_change,
        )
        self.audio_sens_slider.set(self.audio_sensitivity)

        self.audio_mode_menu = ctk.CTkOptionMenu(
            modes_frame,
            variable=self.audio_mode_var,
            values=["FIXE", "BPM PULSE", "BPM DISCO", "OFF"],
            width=1,
            command=self._on_audio_mode_change,
        )
        self.audio_mode_menu.grid_remove()
        self._update_logic_mode_buttons()
        self._update_manual_controls_enabled()

    def update_ui(self, group_value: float, real_output: float) -> None:
        gv = max(0.0, min(1.0, float(group_value)))
        ro = max(0.0, min(1.0, float(real_output)))
        # Label de consigne (slider)
        if hasattr(self, "slider_label"):
            gv_percent = int(round(gv * 100))
            self.slider_label.configure(text=f"{gv_percent}%")
        # Vumètre = sortie réelle
        self.vu.set(ro)
        if hasattr(self, "vu_label"):
            ro_percent = int(round(ro * 100))
            self.vu_label.configure(text=f"{ro_percent}%")

    def set_vu(self, value: float) -> None:
        """Compat: met à jour uniquement le vumètre avec la valeur réelle."""
        self.update_ui(self.slider.get(), value)

    def update_dmx(self, master_dimmer: float) -> None:
        """
        Calcule la sortie finale DMX en multipliant le dimmer local par
        le master_dimmer de l'application, puis met à jour l'UI.
        """
        gv = max(0.0, min(1.0, float(self.slider.get())))
        md = max(0.0, min(1.0, float(master_dimmer)))
        real_output = gv * md
        self.update_ui(gv, real_output)

    def _on_audio_mode_change(self, value: str) -> None:
        """Callback de changement de mode audio (stocke simplement la valeur choisie)."""
        self.audio_mode = value
        self._update_manual_controls_enabled()

    def _on_audio_sensitivity_change(self, value: float) -> None:
        """Mémorise la sensibilité sélectionnée pour les effets audio de ce groupe."""
        self.audio_sensitivity = max(0.0, min(1.0, float(value)))

    # --- Modes logiques avec icônes (🎨, 🔄, 💓, 🌈, 🎤) ------------------------
    def _update_logic_mode_buttons(self) -> None:
        """Met en évidence le bouton de mode logique actif."""
        for mode_name, btn in self.logic_mode_buttons.items():
            base_color, active_color = MODE_COLORS.get(mode_name, ("#1f2937", "#0ea5e9"))
            if mode_name == self.logic_mode:
                btn.configure(
                    fg_color=active_color,
                    hover_color=active_color,
                    border_width=2,
                    border_color="#e5e7eb",
                    text_color="#ffffff",
                )
            else:
                btn.configure(
                    fg_color="#020617",
                    hover_color="#020617",
                    border_width=2,
                    border_color=base_color,
                    text_color=base_color,
                )

    def _on_logic_mode_clicked(self, mode_name: str) -> None:
        """
        Clic sur une icône de mode :
        - met à jour self.logic_mode,
        - mappe sur le menu texte audio_mode_var pour conserver la logique existante.
        """
        self.logic_mode = mode_name
        self._update_logic_mode_buttons()

        # Mapping icône -> mode texte existant
        if mode_name == "MANUAL":
            new_mode = "OFF"
        elif mode_name == "PULSE":
            new_mode = "BPM PULSE"
        elif mode_name == "RAINBOW":
            new_mode = "BPM DISCO"
        else:
            new_mode = "OFF"

        try:
            self.audio_mode_var.set(new_mode)
            self._on_audio_mode_change(new_mode)
        except Exception:
            pass
        if self.on_logic_mode_change is not None:
            try:
                self.on_logic_mode_change(mode_name)
            except Exception:
                pass

    def _update_manual_controls_enabled(self) -> None:
        """
        Active ou grise les contrôles manuels (boutons RGBWA + dimmer) selon le mode.

        - En modes manuels ("FIXE", "OFF") : contrôles actifs.
        - En modes rythmiques ("BPM PULSE", "BPM DISCO") : slider dimmer grisé,
          mais U1–U4 et boutons de couleur restent cliquables (changer de couleur / rappel preset).
        """
        manual = self.audio_mode in ("FIXE", "OFF")
        state = "normal" if manual else "disabled"
        try:
            self.slider.configure(state=state)
        except Exception:
            pass
        # U1–U4 et boutons R,V,B,W toujours cliquables (appliquer une couleur ou un preset en mode Pulse/Disco)
        for btn in self.user_preset_buttons:
            try:
                btn.configure(state="normal")
            except Exception:
                pass
        for btn in self.btns.values():
            try:
                btn.configure(state="normal")
            except Exception:
                pass

    def _show_rhythm_help(self) -> None:
        """Affiche une petite fenêtre d'aide expliquant le MODE RYTHME pour ce groupe."""
        win = ctk.CTkToplevel(self)
        win.title("Aide MODE RYTHME")
        win.resizable(False, False)

        # Positionne la fenêtre au centre de la fenêtre principale et au premier plan
        parent = self.winfo_toplevel()
        try:
            parent_x = parent.winfo_rootx()
            parent_y = parent.winfo_rooty()
            parent_w = parent.winfo_width()
            parent_h = parent.winfo_height()
        except Exception:
            parent_x = parent_y = 100
            parent_w = parent_h = 600

        width, height = 380, 220
        x = parent_x + (parent_w // 2) - (width // 2)
        y = parent_y + (parent_h // 2) - (height // 2)
        win.geometry(f"{width}x{height}+{x}+{y}")
        win.transient(parent)
        win.lift()
        win.grab_set()
        win.focus_force()

        title = getattr(self, "title_label", None)
        group_name = title.cget("text") if title is not None else "Groupe"

        text = (
            f"{group_name} – MODE RYTHME\n\n"
            "- FIXE :\n"
            "  Le groupe ne suit pas le rythme, tu gères tout à la main.\n\n"
            "- BPM PULSE :\n"
            "  L'intensité (dimmer) suit le signal BPM (micro ou TAP),\n"
            "  sans utiliser le strobe.\n\n"
            "- BPM DISCO :\n"
            "  À chaque beat fort, une nouvelle couleur est choisie\n"
            "  et appliquée à toutes les machines du groupe.\n\n"
            "- OFF :\n"
            "  Ignore complètement le signal de rythme.\n\n"
            "Le slider MODE RYTHME règle la sensibilité pour les modes BPM\n"
            "(plus à droite = il faut un beat plus fort pour réagir)."
        )

        label = ctk.CTkLabel(win, text=text, justify="left", anchor="nw")
        label.pack(fill="both", expand=True, padx=12, pady=(10, 4))

        close_btn = ctk.CTkButton(win, text="Fermer", width=80, command=win.destroy)
        close_btn.pack(pady=(0, 10))

    def set_values(self, dim_value: float, color_name: str | None = None) -> None:
        """
        Pilote le widget depuis l'extérieur (ex: rappel de preset) :
        - positionne le slider sur dim_value sans recalculer la logique,
        - optionnellement sélectionne une couleur.
        """
        dv = max(0.0, min(1.0, float(dim_value)))
        # Déplacement du curseur sans changer la valeur logique côté App
        self.slider.set(dv)
        if hasattr(self, "slider_label"):
            percent = int(round(dv * 100))
            self.slider_label.configure(text=f"{percent}%")
        if color_name is not None:
            self.set_active_color(color_name)

    def sync_with_fixture(self, r: int, g: int, b: int, dimmer: int) -> None:
        """
        Synchronise l'UI de ce groupe avec l'état DMX d'une fixture :
        - active un bouton de couleur si (r,g,b) correspond exactement à un preset,
        - sinon, tous les boutons restent éteints (couleur personnalisée),
        - place le slider de dimmer sur la valeur fournie.
        """
        # Met à jour le slider en fonction du dimmer 0-255
        dv = max(0.0, min(1.0, float(dimmer) / 255.0))
        self.slider.set(dv)
        if hasattr(self, "slider_label"):
            percent = int(round(dv * 100))
            self.slider_label.configure(text=f"{percent}%")

        # Mémorise la couleur courante
        self.current_rgb = (int(r), int(g), int(b))

        # Recherche d'une couleur preset exacte
        presets = {
            "R": (255, 0, 0),
            "V": (0, 255, 0),
            "B": (0, 0, 255),
            "W": (255, 255, 255),
            "A": (255, 191, 0),
        }
        match_name = None
        for name, (pr, pg, pb) in presets.items():
            if int(r) == pr and int(g) == pg and int(b) == pb:
                match_name = name
                break

        if match_name is not None:
            # Allume le bouton correspondant
            self.set_active_color(match_name)
        else:
            # Couleur personnalisée: tous les boutons éteints
            for name, btn in self.btns.items():
                base_color = getattr(btn, "_base_color", "#ffffff")
                update_button_style(btn, base_color, active=False)
            self.active_color_btn = None

    def _on_slider_change(self, value: float) -> None:
        # Transmet la valeur brute (0.0‑1.0) au callback fourni par l'App.
        self.on_dim_change(float(value))
        # Met à jour immédiatement le label de consigne
        if hasattr(self, "slider_label"):
            gv = max(0.0, min(1.0, float(value)))
            gv_percent = int(round(gv * 100))
            self.slider_label.configure(text=f"{gv_percent}%")

    def _on_strobe_change(self, value: float) -> None:
        if self.on_strobe_change is not None:
            self.on_strobe_change(float(value))
        if hasattr(self, "strobe_label") and self.strobe_label is not None:
            v = max(0.0, min(1.0, float(value)))
            percent = int(round(v * 100))
            self.strobe_label.configure(text=f"{percent}%")

    def _on_color_button(self, color_name: str, rgb: Tuple[int, int, int]) -> None:
        previous = self.active_color_btn
        self.set_active_color(color_name)
        if previous == color_name:
            # Toggle off: éteint le groupe
            self.on_color((0, 0, 0))
            self.current_rgb = (0, 0, 0)
        else:
            self.on_color(rgb)
            self.current_rgb = rgb
            # Quand on choisit une couleur, on met aussi le dimmer à fond
            # et on met à jour immédiatement le slider / label.
            self.slider.set(1.0)
            self._on_slider_change(1.0)

    def _apply_user_preset(self, index: int) -> None:
        """Applique instantanément un preset utilisateur U1‑U4."""
        if not (0 <= index < len(self.user_presets)):
            return
        rgb = self.user_presets[index]
        if rgb is None:
            return
        self.current_rgb = rgb
        self.on_color(rgb)
        # Quand un preset Ux est actif, on désactive les boutons R/V/B/W
        # et on met uniquement en évidence le preset sélectionné.
        self.active_color_btn = None
        for name, btn in self.btns.items():
            base_color = getattr(btn, "_base_color", "#ffffff")
            update_button_style(btn, base_color, active=False)
        self.active_user_preset = index
        for i, btn in enumerate(self.user_preset_buttons):
            base_color = getattr(btn, "_base_color", "#4b5563")
            update_button_style(btn, base_color, active=(i == index))

    def _save_user_preset(self, index: int) -> None:
        """Enregistre la couleur RGB courante dans un preset utilisateur (clic droit)."""
        if not (0 <= index < len(self.user_presets)):
            return
        r, g, b = self.current_rgb
        self.user_presets[index] = (r, g, b)
        if 0 <= index < len(self.user_preset_buttons):
            btn = self.user_preset_buttons[index]
            color_hex = f"#{r:02x}{g:02x}{b:02x}"
            btn._base_color = color_hex  # type: ignore[attr-defined]
            # Si ce preset est celui actuellement actif, on le garde rempli,
            # sinon uniquement en contour.
            is_active = self.active_user_preset == index
            update_button_style(btn, color_hex, active=is_active)

    def _open_user_preset_dialog(self, index: int) -> None:
        """Ouvre le sélecteur de couleur (type Gigabar) pour configurer un preset U1‑U4."""
        if not (0 <= index < len(self.user_preset_buttons)):
            return

        # État courant du show pour pouvoir le restaurer après la config
        prev_rgb = self.current_rgb
        prev_slider = float(self.slider.get()) if hasattr(self, "slider") else 1.0
        prev_active_preset = self.active_user_preset
        prev_active_color = self.active_color_btn

        # Couleur initiale : preset existant, sinon couleur courante, sinon blanc
        initial = self.user_presets[index] or self.current_rgb or (255, 255, 255)

        def _apply_live(r: int, g: int, b: int) -> None:
            self.current_rgb = (r, g, b)
            try:
                self.on_color((r, g, b))
            except Exception:
                pass
            # Met aussi le dimmer à fond pour que la couleur soit bien visible
            self.slider.set(1.0)
            self._on_slider_change(1.0)
            # Sauvegarde dans le preset et met à jour le bouton U correspondant
            self.user_presets[index] = (r, g, b)
            if 0 <= index < len(self.user_preset_buttons):
                btn = self.user_preset_buttons[index]
                color_hex = f"#{r:02x}{g:02x}{b:02x}"
                btn._base_color = color_hex  # type: ignore[attr-defined]
                # Pendant l'édition, on ne force pas la sélection du preset.
                is_active = self.active_user_preset == index
                update_button_style(btn, color_hex, active=is_active)

        dlg = GigabarColorDialog(self.winfo_toplevel(), initial_rgb=initial, on_change=_apply_live)
        self.winfo_toplevel().wait_window(dlg)

        # À la fermeture, on enregistre la valeur finale sans activer le preset,
        # puis on restaure l'état visuel et DMX précédent pour ne pas impacter le show.
        if dlg.result is not None:
            r, g, b = dlg.result
            self.user_presets[index] = (r, g, b)
            if 0 <= index < len(self.user_preset_buttons):
                btn = self.user_preset_buttons[index]
                color_hex = f"#{r:02x}{g:02x}{b:02x}"
                btn._base_color = color_hex  # type: ignore[attr-defined]
                was_active = prev_active_preset == index
                update_button_style(btn, color_hex, active=was_active)

        # Restaure la couleur et le dimmer précédents
        self.current_rgb = prev_rgb
        try:
            self.on_color(prev_rgb)
        except Exception:
            pass
        if hasattr(self, "slider"):
            self.slider.set(prev_slider)
            self._on_slider_change(prev_slider)

        # Restaure l'état visuel des boutons R/V/B/W
        for name, btn in self.btns.items():
            base_color = getattr(btn, "_base_color", "#ffffff")
            update_button_style(btn, base_color, active=(name == prev_active_color))
        self.active_color_btn = prev_active_color

        # Restaure l'état visuel des presets U1‑U4
        self.active_user_preset = prev_active_preset
        for i, btn in enumerate(self.user_preset_buttons):
            base_color = getattr(btn, "_base_color", "#4b5563")
            is_active = prev_active_preset is not None and i == prev_active_preset
            update_button_style(btn, base_color, active=is_active)

    def set_active_color(self, color_name: str) -> None:
        # Réinitialise tous les boutons RVBW et les presets U1‑U4
        for name, btn in self.btns.items():
            base_color = getattr(btn, "_base_color", "#ffffff")
            update_button_style(btn, base_color, active=False)

        # Un clic sur une couleur de base désactive les presets utilisateur.
        for i, btn in enumerate(self.user_preset_buttons):
            base_color = getattr(btn, "_base_color", "#4b5563")
            update_button_style(btn, base_color, active=False)
        self.active_user_preset = None

        if color_name == self.active_color_btn:
            # Même couleur que précédemment: on désactive tout
            self.active_color_btn = None
            return

        btn = self.btns.get(color_name)
        if btn is None:
            self.active_color_btn = None
            return

        base_color = getattr(btn, "_base_color", "#ffffff")
        update_button_style(btn, base_color, active=True)
        self.active_color_btn = color_name


__all__ = ["LightGroupFrame", "ColorCallback", "DimCallback"]

