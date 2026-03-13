from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Type, Sequence as Seq

from core.dmx_driver import DmxDriver
from core.dmx_engine import DmxEngine
import threading


def apply_master_dimmer_value(
    base_value: int,
    master_factor: float,
    group_factor: float = 1.0,
) -> int:
    """
    Calcul centralisé : valeur DMX de sortie = base × group × master (0–255).
    Utilisé par toutes les fixtures pour éviter la duplication de logique.
    """
    factor = max(0.0, min(1.0, group_factor * master_factor))
    return min(255, int(base_value * factor))


@dataclass
class Fixture:
    driver: DmxDriver
    universe: int
    address: int
    channels: int
    name: str = ""
    manufacturer: str = ""
    model: str = ""
    engine: Optional[DmxEngine] = None
    # Facteurs de dimmer
    group_dimmer: float = 1.0  # dimmer de groupe (0.0‑1.0)
    master_factor: float = 1.0  # dimmer global (0.0‑1.0)

    def blackout(self) -> None:
        """Par défaut, met tous les canaux de ce projecteur à 0."""
        for offset in range(self.channels):
            self.driver.set_channel(self.address + offset, 0)

    def set_channel(self, relative_channel: int, value: int) -> None:
        """
        Définit un canal DMX relatif à ce projecteur.

        relative_channel est 1‑based (1..channels) et sera converti
        en adresse DMX absolue en fonction de self.address.
        """
        if not 1 <= relative_channel <= self.channels:
            return
        abs_address = self.address + relative_channel - 1
        # Filtrage int pour éviter valeurs flottantes sur le driver
        self.driver.set_channel(abs_address, int(value))

    def describe_channels(self) -> Dict[int, str]:
        """
        Retourne un mapping canal relatif -> nom de fonction.
        Par défaut : \"Ch 1\", \"Ch 2\", etc.
        """
        return {idx + 1: f"Ch {idx + 1}" for idx in range(self.channels)}

    def recalculate_output(self) -> None:
        """
        Recalcule la sortie DMX à partir de l'état interne, en appliquant
        group_dimmer et master_factor. Les sous‑classes peuvent surcharger.
        """
        return

    def load_state(self, values: Seq[int]) -> None:
        """
        Charge un état brut pour cette fixture à partir d'une liste de valeurs
        relatives (1..channels) et met à jour directement les canaux DMX.

        Les sous‑classes peuvent surcharger pour synchroniser leur état interne.
        """
        for rel, v in enumerate(values, start=1):
            if rel > self.channels:
                break
            self.set_channel(rel, int(v))

    def apply_master_dimmer(self, factor: float, previous_factor: float) -> None:
        """
        Ajuste la luminosité selon un facteur global (0.0‑1.0).
        Implémentation par défaut : ne fait rien, à surcharger si besoin.
        """
        return

    def identify(self) -> None:
        """
        Met visuellement en évidence la fixture en forçant son intensité
        (ou ses canaux principaux) à 255 pendant 1.5 s, puis restaure l'état.
        Implémentation générique : tous les canaux sont poussés à 255.
        Les sous-classes peuvent surcharger pour un comportement plus ciblé.
        """
        # Snapshot des canaux de cette fixture
        snapshot: List[int] = []
        for rel in range(1, self.channels + 1):
            abs_addr = self.address + rel - 1
            snapshot.append(self.driver.get_channel(abs_addr))

        # Mise en pleine puissance (tous canaux) avec logging DMX
        for rel in range(1, self.channels + 1):
            abs_addr = self.address + rel - 1
            self.driver.send_dmx(abs_addr, 255)

        def _restore() -> None:
            for rel, val in enumerate(snapshot, start=1):
                if rel > self.channels:
                    break
                abs_addr = self.address + rel - 1
                self.driver.send_dmx(abs_addr, val)

        timer = threading.Timer(1.5, _restore)
        timer.daemon = True
        timer.start()


class RGBFixture(Fixture):
    """
    Projecteur de type PAR RGB avec dimmer et éventuellement strobe.

    Les paramètres *_channel sont des index 1-based relatifs à l'adresse DMX
    du projecteur (ex: dimmer=1, rouge=2, vert=3, bleu=4, strobe=5).
    """

    def __init__(
        self,
        *args,
        dimmer_channel: int = 1,
        red_channel: int = 2,
        green_channel: int = 3,
        blue_channel: int = 4,
        strobe_channel: Optional[int] = 5,
        **kwargs,
    ) -> None:
        super().__init__(*args, **kwargs)
        self.dimmer_channel = dimmer_channel
        self.red_channel = red_channel
        self.green_channel = green_channel
        self.blue_channel = blue_channel
        self.strobe_channel = strobe_channel
        # Valeurs "de base" avant application des facteurs de dimmer
        self._base_dimmer: int = 255
        self._base_r: int = 0
        self._base_g: int = 0
        self._base_b: int = 0

    def _to_abs(self, rel_channel: int) -> int:
        return self.address + rel_channel - 1

    def set_color(self, r: int, g: int, b: int, dimmer: Optional[int] = None) -> None:
        if dimmer is not None and self.dimmer_channel is not None:
            self._base_dimmer = max(0, min(255, int(dimmer)))
        self._base_r = max(0, min(255, int(r)))
        self._base_g = max(0, min(255, int(g)))
        self._base_b = max(0, min(255, int(b)))
        self.recalculate_output()

    def set_dimmer(self, value: int) -> None:
        if self.dimmer_channel is None:
            return
        self._base_dimmer = max(0, min(255, int(value)))
        self.recalculate_output()

    def set_strobe(self, value: int) -> None:
        if self.strobe_channel is None:
            return
        self.driver.set_channel(self._to_abs(self.strobe_channel), value)

    def blackout(self) -> None:
        self.set_color(0, 0, 0, dimmer=0)
        self.set_strobe(0)

    def describe_channels(self) -> Dict[int, str]:
        mapping = super().describe_channels()
        mapping[self.dimmer_channel] = "Intensité"
        mapping[self.red_channel] = "Rouge"
        mapping[self.green_channel] = "Vert"
        mapping[self.blue_channel] = "Bleu"
        if self.strobe_channel is not None:
            mapping[self.strobe_channel] = "Strobe"
        return mapping

    def apply_master_dimmer(self, factor: float, previous_factor: float) -> None:
        # Nouveau système : on mémorise simplement le facteur master
        # et on recalcule la sortie.
        self.master_factor = max(0.0, min(1.0, float(factor)))
        self.recalculate_output()

    def recalculate_output(self) -> None:
        dimmer_val = apply_master_dimmer_value(
            self._base_dimmer, self.master_factor, self.group_dimmer
        )
        r_val = apply_master_dimmer_value(
            self._base_r, self.master_factor, self.group_dimmer
        )
        g_val = apply_master_dimmer_value(
            self._base_g, self.master_factor, self.group_dimmer
        )
        b_val = apply_master_dimmer_value(
            self._base_b, self.master_factor, self.group_dimmer
        )

        if self.dimmer_channel is not None:
            self.driver.set_channel(self._to_abs(self.dimmer_channel), dimmer_val)

        if self.engine is not None:
            self.engine.set_rgb_fade(
                self._to_abs(self.red_channel),
                self._to_abs(self.green_channel),
                self._to_abs(self.blue_channel),
                r_val,
                g_val,
                b_val,
            )
        else:
            self.driver.set_channel(self._to_abs(self.red_channel), r_val)
            self.driver.set_channel(self._to_abs(self.green_channel), g_val)
            self.driver.set_channel(self._to_abs(self.blue_channel), b_val)

    def load_state(self, values: Seq[int]) -> None:
        """
        Charge l'état des canaux DMX pour un PAR RGB :
        on met à jour les valeurs de base (dimmer + RGB) puis on recalcule.
        """
        if not values:
            return
        # Normalise la taille
        vals = list(values) + [0] * max(0, self.channels - len(values))

        if self.dimmer_channel is not None and 1 <= self.dimmer_channel <= len(vals):
            self._base_dimmer = max(0, min(255, int(vals[self.dimmer_channel - 1])))

        if 1 <= self.red_channel <= len(vals):
            self._base_r = max(0, min(255, int(vals[self.red_channel - 1])))
        if 1 <= self.green_channel <= len(vals):
            self._base_g = max(0, min(255, int(vals[self.green_channel - 1])))
        if 1 <= self.blue_channel <= len(vals):
            self._base_b = max(0, min(255, int(vals[self.blue_channel - 1])))

        # Applique les valeurs avec les facteurs group/master
        self.recalculate_output()

        # Strobe et autres canaux restent appliqués en direct
        if self.strobe_channel is not None and 1 <= self.strobe_channel <= len(vals):
            self.set_strobe(int(vals[self.strobe_channel - 1]))


class MovingHeadFixture(Fixture):
    """
    Projecteur de type lyre (moving head) simplifié.

    Mode 9 canaux (PicoSpot 20 LED, doc th.mann) :
    1 : Pan (coarse), 2 : Tilt (coarse), 3 : Pan fine, 4 : Tilt fine
    5 : Vitesse moteur, 6 : Couleur (roue), 7 : Gobo, 8 : Gradateur maître (dimmer), 9 : Strobe
    - Canal 7 Gobo : 000-124 sélection gobo, 125-249 gobo shake, 250-255 roue de Gobo
    - Canal 9 Strobe : 000-009 aucune fonction (ouvert), 010-255 effet stroboscopique (1 Hz…25 Hz)

    Mode 11 canaux (PicoSpot 20 par défaut si non overridé) :
    1 : Pan, 2 : Pan Fine, 3 : Tilt, 4 : Tilt Fine, 5 : Speed, 6 : Dimmer, 7 : Gobo, 8 : Couleur
    """

    def __init__(
        self,
        *args,
        pan_channel: int = 1,
        pan_fine_channel: Optional[int] = 2,
        tilt_channel: int = 3,
        tilt_fine_channel: Optional[int] = 4,
        speed_channel: Optional[int] = 5,
        dimmer_channel: int = 6,
        gobo_channel: Optional[int] = 7,
        color_channel: Optional[int] = 8,
        strobe_channel: Optional[int] = None,
        **kwargs,
    ) -> None:
        super().__init__(*args, **kwargs)
        self.pan_channel = pan_channel
        self.pan_fine_channel = pan_fine_channel
        self.tilt_channel = tilt_channel
        self.tilt_fine_channel = tilt_fine_channel
        self.speed_channel = speed_channel
        self.dimmer_channel = dimmer_channel
        self.gobo_channel = gobo_channel
        self.color_channel = color_channel
        self.strobe_channel = strobe_channel
        self._base_dimmer: int = 255  # consigne locale 0-255, sortie = _base_dimmer * master_factor

    def _to_abs(self, rel_channel: int) -> int:
        return self.address + rel_channel - 1

    # --- Pan / Tilt ---------------------------------------------------------
    def set_pan_tilt_16bit(self, pan16: int, tilt16: int) -> None:
        """
        Positionne la lyre en utilisant les canaux coarse + fine (0-65535).
        Si les canaux Fine sont absents, on n'écrit que les coarse.
        """
        pan16 = max(0, min(65535, int(pan16)))
        tilt16 = max(0, min(65535, int(tilt16)))
        pan_coarse = (pan16 >> 8) & 0xFF
        pan_fine = pan16 & 0xFF
        tilt_coarse = (tilt16 >> 8) & 0xFF
        tilt_fine = tilt16 & 0xFF

        self.driver.set_channel(self._to_abs(self.pan_channel), pan_coarse)
        if self.pan_fine_channel is not None:
            self.driver.set_channel(self._to_abs(self.pan_fine_channel), pan_fine)
        self.driver.set_channel(self._to_abs(self.tilt_channel), tilt_coarse)
        if self.tilt_fine_channel is not None:
            self.driver.set_channel(self._to_abs(self.tilt_fine_channel), tilt_fine)

    def set_pan_tilt(self, pan: int, tilt: int) -> None:
        """
        Compatibilité 8 bits : on transforme en 16 bits (pan<<8, tilt<<8)
        puis on applique la logique Fine.
        """
        self.set_pan_tilt_16bit(int(pan) << 8, int(tilt) << 8)

    # --- Vitesse / Dimmer / Couleur ----------------------------------------
    def set_speed(self, value: int) -> None:
        """Canal de vitesse de mouvement (ex: canal 5 en mode 11CH)."""
        if self.speed_channel is None:
            return
        v = max(0, min(255, int(value)))
        self.driver.set_channel(self._to_abs(self.speed_channel), v)

    def _write_dimmer(self) -> None:
        """Écrit le canal Dimmer : Sortie = (Local) × Master (formule centralisée)."""
        out = apply_master_dimmer_value(self._base_dimmer, self.master_factor)
        self.driver.set_channel(self._to_abs(self.dimmer_channel), out)

    def set_dimmer(self, value: int) -> None:
        self._base_dimmer = max(0, min(255, int(value)))
        self._write_dimmer()

    def set_gobo_raw(self, value: int) -> None:
        """
        Positionne directement la roue de gobos (canal 7 en mode 11CH).
        La valeur exacte (0, 10, 20, 30, plage shake, etc.) est définie par le mapping DMX.
        """
        if self.gobo_channel is None:
            return
        v = max(0, min(255, int(value)))
        self.driver.set_channel(self._to_abs(self.gobo_channel), v)

    def set_color_raw(self, value: int) -> None:
        if self.color_channel is None:
            return
        v = max(0, min(255, int(value)))
        self.driver.set_channel(self._to_abs(self.color_channel), v)

    def set_strobe(self, value: int) -> None:
        """
        Canal strobe (ex. Ch9 en mode 9 canaux).
        Doc PicoSpot 20 : 000-009 = aucune fonction, 010-255 = effet stroboscopique (1 Hz…25 Hz).
        """
        if self.strobe_channel is None:
            return
        v = max(0, min(255, int(value)))
        self.driver.set_channel(self._to_abs(self.strobe_channel), v)

    def blackout(self) -> None:
        self.set_dimmer(0)
        if self.strobe_channel is not None:
            self.set_strobe(0)

    def describe_channels(self) -> Dict[int, str]:
        mapping = super().describe_channels()
        mapping[self.pan_channel] = "Pan"
        if self.pan_fine_channel is not None:
            mapping[self.pan_fine_channel] = "Pan Fine"
        mapping[self.tilt_channel] = "Tilt"
        if self.tilt_fine_channel is not None:
            mapping[self.tilt_fine_channel] = "Tilt Fine"
        if self.speed_channel is not None:
            mapping[self.speed_channel] = "Vitesse mouvement"
        mapping[self.dimmer_channel] = "Intensité"
        if self.gobo_channel is not None:
            mapping[self.gobo_channel] = "Gobo / Motif"
        if self.color_channel is not None:
            mapping[self.color_channel] = "Couleur (Roue)"
        if self.strobe_channel is not None:
            mapping[self.strobe_channel] = "Strobe (0-9 off, 10-255 Hz)"
        return mapping

    def apply_master_dimmer(self, factor: float, previous_factor: float) -> None:
        """Master global : Sortie = (Local/100)×(Master/100)×255."""
        self.master_factor = max(0.0, min(1.0, float(factor)))
        self._write_dimmer()

    def recalculate_output(self) -> None:
        """Recalcule la sortie Dimmer (base × master)."""
        self._write_dimmer()


class LaserFixture(Fixture):
    """
    Projecteur de type laser, modélisé de façon minimale.
    """

    # Verrou global de sécurité : si True, les lasers restent éteints
    safety_locked: bool = False

    def set_on(self) -> None:
        # On part du principe que le premier canal est un dimmer / on-off.
        if self.safety_locked:
            # Si la sécurité est activée, on force OFF.
            self.driver.set_channel(self.address, 0)
            return
        self.driver.set_channel(self.address, 255)

    def set_off(self) -> None:
        self.driver.set_channel(self.address, 0)

    def blackout(self) -> None:
        self.set_off()

    def describe_channels(self) -> Dict[int, str]:
        mapping = super().describe_channels()
        if self.channels >= 1:
            mapping[1] = "On/Off"
        return mapping


class XtremLedFixture(LaserFixture):
    """
    BoomToneDJ Xtrem LED – pilotage en mode Custom (CH1=0) d'après le manuel officiel.

    Référence : manuel BoomToneDJ Xtrem LED (44625_xtremledmanual.pdf),
    section "Custom control by DMX512 (CH1=0)" :

      CH1   0       = Custom control (obligatoire pour pilotage DMX uniquement)
                      1-33 Auto show 1 … 238-255 Sound mode (micro interne)
      CH2   0       = Moon flower éteint
                      1-255 = Moon flower vitesse (lent → rapide)
      CH3   0       = Derby / LED haute puissance éteint
                      1-202 = 7 couleurs fixes (ex. 174-202 = R+G+B blanc)
                      203-231 = 7 couleurs jump ; 232-255 = fondu enchaîné
      CH4   0-255   = Strobe vitesse (CH4=0 strobe off si CH3: 1-202)
                      Ou vitesse jump/fondu selon CH3
      CH5   0       = Moteur arrêt
                      1-255 = Moteur lent → rapide
      CH6   0       = Pas de fonction
                      1-255 = Vitesse strobe lent → rapide

    On garde CH1=0 pour désactiver le micro interne et piloter les deux unités à l'identique.
    """

    CHANNEL_MODE = 1
    CHANNEL_SPEED = 5  # Vitesse moteur (Ch5)

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self._mode_raw: int = 0  # 0=STOP, 128=SLOW, 220=PARTY (logique UI ; Ch1 restera 0)
        self._speed_raw: int = 128

    def set_mode_raw(self, value: int) -> None:
        self._mode_raw = max(0, min(255, int(value)))

    def set_speed_raw(self, value: int) -> None:
        self._speed_raw = max(0, min(255, int(value)))

    def write_output(self) -> None:
        """
        Écrit l'état complet. Ch1 toujours 0 (Custom control).
        FADE (240) : CH3=240 fondu, CH4=vitesse. JUMP (217) : CH3=217 jump, CH4=vitesse.
        """
        self.set_channel(1, 0)  # Toujours Custom control (micro interne inactif)
        run = self._mode_raw != 0 and self.master_factor > 0
        speed8 = self._speed_raw if run else 0
        # Ch2 Moon Flower
        if self.channels >= 2:
            self.set_channel(2, speed8)
        # Ch3 : 0=off ; 200=blanc (slow/party) ; 240=fondu (fade) ; 217=jump
        if self.channels >= 3:
            if not run:
                ch3 = 0
            elif self._mode_raw == 240:  # FADE
                ch3 = 240  # 232-255 = fondu enchaîné
            elif self._mode_raw == 217:  # JUMP
                ch3 = 217  # 203-231 = 7 couleurs jump
            else:
                ch3 = 200  # SLOW/PARTY : blanc
            self.set_channel(3, ch3)
        # Ch4 : strobe off en slow/party ; vitesse effet en FADE/JUMP (manuel)
        if self.channels >= 4:
            ch4 = speed8 if self._mode_raw in (240, 217) else 0
            self.set_channel(4, ch4)
        # Ch5 Moteur
        motor = 0 if (self._mode_raw == 0 or self.master_factor <= 0) else self._speed_raw
        self.set_channel(self.CHANNEL_SPEED, motor)
        if self.channels >= 6:
            self.set_channel(6, 0)

    def blackout(self) -> None:
        """Coupe tous les canaux (1–6) pour que les deux unités soient à l'identique."""
        for ch in range(1, self.channels + 1):
            self.set_channel(ch, 0)

    def flash(self, duration_s: float = 0.05) -> None:
        """Flash BPM via le canal Strobe (Ch6), pas Ch1, pour garder Custom control (micro désactivé)."""
        if self.channels >= 6:
            self.set_channel(6, 255)
        else:
            self.set_on()
        timer = threading.Timer(duration_s, self._flash_off)
        timer.daemon = True
        timer.start()

    def _flash_off(self) -> None:
        if self.channels >= 6:
            self.set_channel(6, 0)
        else:
            self.set_off()
        if self.master_factor > 0:
            self.write_output()

    def apply_master_dimmer(self, factor: float, previous_factor: float) -> None:
        """Si Master = 0, Canal 1 passe à 0 pour couper immédiatement."""
        self.master_factor = max(0.0, min(1.0, float(factor)))
        self.write_output()

    def describe_channels(self) -> Dict[int, str]:
        """
        Description des canaux DMX en mode "Custom control mode" (6 canaux) :
        1: Mode (fixé à 0)
        2: Vitesse Moon Flower
        3: Couleur
        4: Vitesse Strobe / Effet couleur
        5: Vitesse moteur
        6: Strobe
        """
        mapping: Dict[int, str] = {}
        if self.channels >= 1:
            mapping[1] = "Mode"
        if self.channels >= 2:
            mapping[2] = "Moon Flower Speed"
        if self.channels >= 3:
            mapping[3] = "Couleur"
        if self.channels >= 4:
            mapping[4] = "Vitesse effet couleur"
        if self.channels >= 5:
            mapping[5] = "Vitesse moteur"
        if self.channels >= 6:
            mapping[6] = "Strobe"
        return mapping


class WookieLaserFixture(Fixture):
    """
    Cameo WOOKIE 200 R – mode 9 canaux.

    CH1 Mode (manuel 9 canaux) : 0-63 Laser Off, 64-127 Auto, 128-191 Sound, 192-255 DMX.
    Pour OFF fiable : CH1 dans 0-63 et CH3 (intensité) à 0.
    CH2: Pattern, CH3: Strobe/Intensité, CH4-5: Pan/Tilt, CH6: Vitesse, CH7-9: Couleur/Size/Rotation.
    """

    CHANNEL_MODE = 1
    CHANNEL_PATTERN = 2
    CHANNEL_STROBE = 3
    CHANNEL_PAN = 4
    CHANNEL_TILT = 5
    CHANNEL_SPEED = 6
    CHANNEL_COLOR = 7
    CHANNEL_SIZE = 8
    CHANNEL_ROTATION = 9

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        # Intensité locale 0‑255 sur le canal Strobe (CH3) ; 0 = laser éteint
        self._base_intensity: int = 0
        self.set_mode_raw(0)  # Démarrage en OFF (0-63 = Laser Off)
        self._write_intensity()

    def set_mode_raw(self, value: int) -> None:
        v = max(0, min(255, int(value)))
        self.set_channel(self.CHANNEL_MODE, v)

    def _write_intensity(self) -> None:
        """Sortie réelle = intensité locale × master × group (canal 3)."""
        out = apply_master_dimmer_value(self._base_intensity, self.master_factor, self.group_dimmer)
        self.set_channel(self.CHANNEL_STROBE, out)

    def set_intensity(self, value: int) -> None:
        self._base_intensity = max(0, min(255, int(value)))
        self._write_intensity()

    def set_strobe(self, value: int) -> None:
        # Alias pratique : sur ce projecteur, le canal 3 sert aussi d'intensité.
        self.set_intensity(value)

    def set_pan_tilt(self, pan: int, tilt: int) -> None:
        pan = max(0, min(255, int(pan)))
        tilt = max(0, min(255, int(tilt)))
        self.set_channel(self.CHANNEL_PAN, pan)
        self.set_channel(self.CHANNEL_TILT, tilt)

    def set_speed(self, value: int) -> None:
        v = max(0, min(255, int(value)))
        self.set_channel(self.CHANNEL_SPEED, v)

    def set_pattern_raw(self, value: int) -> None:
        v = max(0, min(255, int(value)))
        self.set_channel(self.CHANNEL_PATTERN, v)

    def set_color_raw(self, value: int) -> None:
        v = max(0, min(255, int(value)))
        self.set_channel(self.CHANNEL_COLOR, v)

    def set_size_raw(self, value: int) -> None:
        v = max(0, min(255, int(value)))
        self.set_channel(self.CHANNEL_SIZE, v)

    def set_rotation_raw(self, value: int) -> None:
        v = max(0, min(255, int(value)))
        self.set_channel(self.CHANNEL_ROTATION, v)

    def blackout(self) -> None:
        # Blackout dur : mode en blackout + intensité à 0.
        self.set_mode_raw(0)
        self.set_intensity(0)

    def apply_master_dimmer(self, factor: float, previous_factor: float) -> None:
        """Master global : ne touche qu'à l'intensité (canal 3)."""
        self.master_factor = max(0.0, min(1.0, float(factor)))
        self._write_intensity()

    def describe_channels(self) -> Dict[int, str]:
        mapping: Dict[int, str] = {}
        if self.channels >= 1:
            mapping[1] = "Mode (Blackout / DMX)"
        if self.channels >= 2:
            mapping[2] = "Pattern (32 motifs)"
        if self.channels >= 3:
            mapping[3] = "Strobe / Intensité"
        if self.channels >= 4:
            mapping[4] = "Pan"
        if self.channels >= 5:
            mapping[5] = "Tilt"
        if self.channels >= 6:
            mapping[6] = "Vitesse Pan/Tilt"
        if self.channels >= 7:
            mapping[7] = "Couleur"
        if self.channels >= 8:
            mapping[8] = "Size / Zoom"
        if self.channels >= 9:
            mapping[9] = "Rotation motif"
        return mapping


class IbizaLas30GFixture(Fixture):
    """
    Laser Ibiza LAS-30G – adresse 113, 5 canaux (config).
    CH1 (Tunnel 1) : 0-50 Off, 51-101 Sound, 204-255 Auto (doc Freestyler forum).
    CH2 = Pattern (Tunnel 2), CH5 = Zoom. Si Master = 0, CH1 forcé à 0.
    """

    CHANNEL_MODE = 1
    CHANNEL_PATTERN = 2
    CHANNEL_ZOOM = 5

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self._mode_raw: int = 0
        self._zoom_raw: int = 128
        self.set_mode_raw(0)
        self.set_zoom_raw(128)

    def set_mode_raw(self, value: int) -> None:
        self._mode_raw = max(0, min(255, int(value)))
        if self.master_factor > 0:
            self.set_channel(self.CHANNEL_MODE, self._mode_raw)

    def set_zoom_raw(self, value: int) -> None:
        self._zoom_raw = max(0, min(255, int(value)))
        self.set_channel(self.CHANNEL_ZOOM, self._zoom_raw)

    def blackout(self) -> None:
        self.set_channel(self.CHANNEL_MODE, 0)
        self._mode_raw = 0

    def apply_master_dimmer(self, factor: float, previous_factor: float) -> None:
        """Si Master = 0, Canal 1 (mode) passe à 0 pour couper le laser immédiatement."""
        self.master_factor = max(0.0, min(1.0, float(factor)))
        if self.master_factor <= 0:
            self.set_channel(self.CHANNEL_MODE, 0)
        else:
            self.set_channel(self.CHANNEL_MODE, self._mode_raw)

    def describe_channels(self) -> Dict[int, str]:
        return {
            1: "Mode (0-50 Off, 51-101 Sound, 204-255 Auto)",
            2: "Pattern (Tunnel 2)",
            3: "—",
            4: "—",
            5: "Zoom / Taille",
        }


class DynamoScanLedFixture(Fixture):
    """
    BoomToneDJ Dynamo Scan LED – mode non 9ch (référence doc constructeur).
    """

    def describe_channels(self) -> Dict[int, str]:
        mapping: Dict[int, str] = {}
        if self.channels >= 1:
            mapping[1] = "Strobe"
        if self.channels >= 2:
            mapping[2] = "Dimmer"
        if self.channels >= 3:
            mapping[3] = "Pan (X)"
        if self.channels >= 4:
            mapping[4] = "Tilt (Y)"
        if self.channels >= 5:
            mapping[5] = "Vitesse XY"
        if self.channels >= 6:
            mapping[6] = "Roue couleur"
        if self.channels >= 7:
            mapping[7] = "Roue gobo"
        if self.channels >= 8:
            mapping[8] = "Auto / Son"
        if self.channels >= 9:
            mapping[9] = "Reset"
        return mapping


class DynamoScanLed9ChFixture(MovingHeadFixture):
    """
    BoomToneDJ Dynamo Scan LED – mode 9 canaux (manuel 40995_dymanoscanledmanuelfren.pdf).

    Mapping officiel :
      CH1 : Strobe (0-7 inopérant, 8-255 vitesse strobe)
      CH2 : Dimmer (0-255)
      CH3 : X axis (Pan)
      CH4 : Y axis (Tilt)
      CH5 : Vitesse XY
      CH6 : Roue couleur (White, Purple, Green, … + rotation)
      CH7 : Gobo (NONE, 1-7, Shake, rotation)
      CH8 : No action / Slow / Fast / Sound
      CH9 : Reset (255 = reset)
    Pas de canaux Fine : Pan/Tilt 8 bits sur CH3/CH4 uniquement.
    """

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(
            *args,
            pan_channel=3,
            pan_fine_channel=None,
            tilt_channel=4,
            tilt_fine_channel=None,
            speed_channel=5,
            dimmer_channel=2,
            gobo_channel=7,
            color_channel=6,
            strobe_channel=1,
            **kwargs,
        )

    def set_strobe(self, value: int) -> None:
        """CH1 : 0-7 = off, 8-255 = strobe (manuel). On envoie 0 ou max(8, value)."""
        v = max(0, min(255, int(value)))
        if v > 0:
            v = max(8, v)
        self.driver.set_channel(self._to_abs(self.strobe_channel), v)

    def describe_channels(self) -> Dict[int, str]:
        return {
            1: "Strobe (0-7 off, 8-255 speed)",
            2: "Dimmer",
            3: "Pan (X)",
            4: "Tilt (Y)",
            5: "Vitesse XY",
            6: "Roue couleur",
            7: "Roue gobo",
            8: "Mode (No action/Slow/Fast/Sound)",
            9: "Reset (255)",
        }


class LEDFloodPanel150(Fixture):
    """
    Stairville LED Flood Panel 150 en mode 8 canaux.

    1: Intensité, 2: Rouge, 3: Vert, 4: Bleu,
    5: Strobe, 6: Programme, 7: ID, 8: Fonction.
    """

    CHANNEL_INTENSITY = 1
    CHANNEL_RED = 2
    CHANNEL_GREEN = 3
    CHANNEL_BLUE = 4
    CHANNEL_STROBE = 5
    CHANNEL_PROGRAM = 6
    CHANNEL_ID = 7
    CHANNEL_FUNCTION = 8

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self._base_dimmer: int = 255
        self._base_r: int = 0
        self._base_g: int = 0
        self._base_b: int = 0

    def set_dimmer(self, value: int) -> None:
        """Règle l'intensité globale (dimmer)."""
        self._base_dimmer = max(0, min(255, int(value)))
        self.recalculate_output()

    def set_color(self, r: int, g: int, b: int) -> None:
        """Règle la couleur RGB."""
        self._base_r = max(0, min(255, int(r)))
        self._base_g = max(0, min(255, int(g)))
        self._base_b = max(0, min(255, int(b)))
        self.recalculate_output()

    def set_strobe(self, value: int) -> None:
        self.set_channel(self.CHANNEL_STROBE, value)

    def blackout(self) -> None:
        self.set_dimmer(0)
        self.set_color(0, 0, 0)
        self.set_strobe(0)

    def describe_channels(self) -> Dict[int, str]:
        return {
            1: "Intensité",
            2: "Rouge",
            3: "Vert",
            4: "Bleu",
            5: "Strobe",
            6: "Programme",
            7: "ID",
            8: "Fonction",
        }

    def apply_master_dimmer(self, factor: float, previous_factor: float) -> None:
        self.master_factor = max(0.0, min(1.0, float(factor)))
        self.recalculate_output()

    def recalculate_output(self) -> None:
        dimmer_val = apply_master_dimmer_value(
            self._base_dimmer, self.master_factor, self.group_dimmer
        )
        r_val = apply_master_dimmer_value(
            self._base_r, self.master_factor, self.group_dimmer
        )
        g_val = apply_master_dimmer_value(
            self._base_g, self.master_factor, self.group_dimmer
        )
        b_val = apply_master_dimmer_value(
            self._base_b, self.master_factor, self.group_dimmer
        )

        self.set_channel(self.CHANNEL_INTENSITY, dimmer_val)

        if self.engine is not None:
            self.engine.set_rgb_fade(
                self.address + self.CHANNEL_RED - 1,
                self.address + self.CHANNEL_GREEN - 1,
                self.address + self.CHANNEL_BLUE - 1,
                r_val,
                g_val,
                b_val,
            )
        else:
            self.set_channel(self.CHANNEL_RED, r_val)
            self.set_channel(self.CHANNEL_GREEN, g_val)
            self.set_channel(self.CHANNEL_BLUE, b_val)

    def identify(self) -> None:
        """
        Met en évidence un flood en forçant TOUS ses canaux à 255 pendant 1.5 s.
        (Intensité + RGB + canaux de programme).
        """
        snapshot: List[int] = []
        for rel in range(1, self.channels + 1):
            abs_addr = self.address + rel - 1
            snapshot.append(self.driver.get_channel(abs_addr))

        # Tous les canaux de la machine à 255 (153 à 160, etc.) avec logging
        for rel in range(1, self.channels + 1):
            abs_addr = self.address + rel - 1
            self.driver.send_dmx(abs_addr, 255)

        def _restore() -> None:
            for rel, val in enumerate(snapshot, start=1):
                if rel > self.channels:
                    break
                abs_addr = self.address + rel - 1
                self.driver.send_dmx(abs_addr, val)

        timer = threading.Timer(1.5, _restore)
        timer.daemon = True
        timer.start()

    def load_state(self, values: Seq[int]) -> None:
        """
        Charge l'état des canaux pour un Flood 150 :
        on synchronise les valeurs de base (dimmer + RGB), puis on recalcule.
        """
        if not values:
            return
        vals = list(values) + [0] * max(0, self.channels - len(values))

        self._base_dimmer = max(0, min(255, int(vals[self.CHANNEL_INTENSITY - 1])))
        self._base_r = max(0, min(255, int(vals[self.CHANNEL_RED - 1])))
        self._base_g = max(0, min(255, int(vals[self.CHANNEL_GREEN - 1])))
        self._base_b = max(0, min(255, int(vals[self.CHANNEL_BLUE - 1])))

        self.recalculate_output()

        # Strobe + autres canaux : écriture directe
        if self.CHANNEL_STROBE <= len(vals):
            self.set_strobe(int(vals[self.CHANNEL_STROBE - 1]))


class Gigabar5ChFixture(RGBFixture):
    """
    Gigabar en mode DMX 5 canaux : Ch1=Rouge, Ch2=Vert, Ch3=Bleu, Ch4=Dimmer, Ch5=Strobe.
    Même comportement que Flood / Party LED (pas de menus mode internes).
    """


class GigabarFixture8Ch(Fixture):
    """
    LED Giga Bar 4 MKII (ou équivalent) en mode 8 canaux.

    Canal 1 : Master Dimmer (0-255).
    Canal 2 : Modes/Programmes (0-7 Manuel, 8-231 Auto, 232-255 Sound).
    Canal 3 : Vitesse (si canal 2 > 8).
    Canaux 4 : Stroboscope (0-255).
    Canaux 5, 6, 7, 8 : R, G, B, W.
    """

    CH_DIMMER = 1
    CH_MODE = 2
    CH_SPEED = 3
    CH_STROBE = 4
    CH_RED = 5
    CH_GREEN = 6
    CH_BLUE = 7
    CH_WHITE = 8

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self._base_dimmer: int = 255
        self._base_mode: int = 0  # 0-7 Manuel, 8-231 Auto, 232-255 Sound
        self._base_speed: int = 128
        self._base_strobe: int = 0
        self._base_r: int = 0
        self._base_g: int = 0
        self._base_b: int = 0
        self._base_w: int = 0

    def _to_abs(self, rel_channel: int) -> int:
        return self.address + rel_channel - 1

    def set_dimmer(self, value: int) -> None:
        self._base_dimmer = max(0, min(255, int(value)))
        self.recalculate_output()

    def set_mode(self, value: int) -> None:
        """Canal 2 : 0-7 Manuel, 8-231 programmes auto, 232-255 Sound."""
        self._base_mode = max(0, min(255, int(value)))
        self.recalculate_output()

    def set_speed(self, value: int) -> None:
        """Canal 3 : vitesse (utilisé si mode > 8)."""
        self._base_speed = max(0, min(255, int(value)))
        self.recalculate_output()

    def set_strobe(self, value: int) -> None:
        self._base_strobe = max(0, min(255, int(value)))
        self.driver.set_channel(self._to_abs(self.CH_STROBE), self._base_strobe)

    def set_rgbw(self, r: int, g: int, b: int, w: int = 0) -> None:
        self._base_r = max(0, min(255, int(r)))
        self._base_g = max(0, min(255, int(g)))
        self._base_b = max(0, min(255, int(b)))
        self._base_w = max(0, min(255, int(w)))
        self.recalculate_output()

    def set_color(self, r: int, g: int, b: int) -> None:
        """Applique une couleur RGB (W=0). Pour blanc pur, utiliser set_rgbw(0,0,0,255)."""
        self.set_rgbw(r, g, b, 0)

    def blackout(self) -> None:
        self.set_dimmer(0)
        self.set_rgbw(0, 0, 0, 0)
        self.set_strobe(0)

    def describe_channels(self) -> Dict[int, str]:
        return {
            1: "Master Dimmer",
            2: "Mode / Programme",
            3: "Vitesse",
            4: "Stroboscope",
            5: "Rouge",
            6: "Vert",
            7: "Bleu",
            8: "Blanc",
        }

    def apply_master_dimmer(self, factor: float, previous_factor: float) -> None:
        self.master_factor = max(0.0, min(1.0, float(factor)))
        self.recalculate_output()

    def recalculate_output(self) -> None:
        dimmer_val = apply_master_dimmer_value(
            self._base_dimmer, self.master_factor, self.group_dimmer
        )
        r_val = apply_master_dimmer_value(
            self._base_r, self.master_factor, self.group_dimmer
        )
        g_val = apply_master_dimmer_value(
            self._base_g, self.master_factor, self.group_dimmer
        )
        b_val = apply_master_dimmer_value(
            self._base_b, self.master_factor, self.group_dimmer
        )
        w_val = apply_master_dimmer_value(
            self._base_w, self.master_factor, self.group_dimmer
        )

        self.driver.set_channel(self._to_abs(self.CH_DIMMER), dimmer_val)
        self.driver.set_channel(self._to_abs(self.CH_MODE), self._base_mode)
        self.driver.set_channel(self._to_abs(self.CH_SPEED), self._base_speed)
        self.driver.set_channel(self._to_abs(self.CH_STROBE), self._base_strobe)
        self.driver.set_channel(self._to_abs(self.CH_RED), r_val)
        self.driver.set_channel(self._to_abs(self.CH_GREEN), g_val)
        self.driver.set_channel(self._to_abs(self.CH_BLUE), b_val)
        self.driver.set_channel(self._to_abs(self.CH_WHITE), w_val)

    def load_state(self, values: Seq[int]) -> None:
        if not values or len(values) < 8:
            return
        vals = list(values) + [0] * max(0, 8 - len(values))
        self._base_dimmer = max(0, min(255, int(vals[0])))
        self._base_mode = max(0, min(255, int(vals[1])))
        self._base_speed = max(0, min(255, int(vals[2])))
        self._base_strobe = max(0, min(255, int(vals[3])))
        self._base_r = max(0, min(255, int(vals[4])))
        self._base_g = max(0, min(255, int(vals[5])))
        self._base_b = max(0, min(255, int(vals[6])))
        self._base_w = max(0, min(255, int(vals[7])))
        self.recalculate_output()


class GigabarFixture(Fixture):
    """
    Varytec Gigabar II en mode 24 canaux (8 cellules RGB).

    On propose une vue simplifiée : chaque cellule est traitée comme un
    triplet RGB consécutif.
    """

    @staticmethod
    def _clamp_color_component(value: int) -> int:
        return max(0, min(255, int(value)))

    @classmethod
    def _clamp_rgb(cls, r: int, g: int, b: int) -> tuple[int, int, int]:
        return (
            cls._clamp_color_component(r),
            cls._clamp_color_component(g),
            cls._clamp_color_component(b),
        )

    def set_color(self, r: int, g: int, b: int) -> None:
        r, g, b = self._clamp_rgb(r, g, b)
        # On parcourt les canaux par paquet de 3 (R,G,B)
        for rel in range(1, self.channels + 1, 3):
            self.set_channel(rel, r)
            if rel + 1 <= self.channels:
                self.set_channel(rel + 1, g)
            if rel + 2 <= self.channels:
                self.set_channel(rel + 2, b)

    def set_mode_chenillard(self, r: int, g: int, b: int) -> None:
        r, g, b = self._clamp_rgb(r, g, b)
        for i in range(0, self.channels, 3):
            cell_index = i // 3
            if cell_index % 2 == 0:
                self.set_channel(i + 1, r)
                if i + 2 <= self.channels:
                    self.set_channel(i + 2, g)
                if i + 3 <= self.channels:
                    self.set_channel(i + 3, b)
            else:
                self.set_channel(i + 1, 0)
                if i + 2 <= self.channels:
                    self.set_channel(i + 2, 0)
                if i + 3 <= self.channels:
                    self.set_channel(i + 3, 0)

    def set_mode_rainbow(self) -> None:
        palette = [
            (255, 0, 0),
            (255, 127, 0),
            (255, 255, 0),
            (0, 255, 0),
            (0, 0, 255),
            (75, 0, 130),
            (148, 0, 211),
            (255, 255, 255),
        ]
        for cell, base in enumerate(range(1, self.channels + 1, 3)):
            cr, cg, cb = palette[cell % len(palette)]
            self.set_channel(base, cr)
            if base + 1 <= self.channels:
                self.set_channel(base + 1, cg)
            if base + 2 <= self.channels:
                self.set_channel(base + 2, cb)

    def set_mode_pulse(self, r: int, g: int, b: int) -> None:
        r, g, b = self._clamp_rgb(r, g, b)
        cells = self.channels // 3
        for cell, base in enumerate(range(1, self.channels + 1, 3)):
            if cell < cells // 3:
                self.set_channel(base, r)
                if base + 1 <= self.channels:
                    self.set_channel(base + 1, g)
                if base + 2 <= self.channels:
                    self.set_channel(base + 2, b)
            elif cell < 2 * cells // 3:
                self.set_channel(base, r // 2)
                if base + 1 <= self.channels:
                    self.set_channel(base + 1, g // 2)
                if base + 2 <= self.channels:
                    self.set_channel(base + 2, b // 2)
            else:
                self.set_channel(base, 0)
                if base + 1 <= self.channels:
                    self.set_channel(base + 1, 0)
                if base + 2 <= self.channels:
                    self.set_channel(base + 2, 0)

    def apply_master_dimmer(self, factor: float, previous_factor: float) -> None:
        ratio = factor if previous_factor <= 0 else factor / previous_factor
        if ratio == 1:
            return
        for rel in range(1, self.channels + 1):
            abs_addr = self.address + rel - 1
            current = self.driver.get_channel(abs_addr)
            new = int(max(0, min(255, current * ratio)))
            self.driver.set_channel(abs_addr, new)

    def describe_channels(self) -> Dict[int, str]:
        """
        Description des 24 canaux en mode Gigabar II 24 Channel :
        8 cellules RGB consécutives (3 canaux par cellule).
        """
        mapping: Dict[int, str] = {}
        cells = max(1, self.channels // 3)
        for cell in range(cells):
            base = cell * 3 + 1
            if base <= self.channels:
                mapping[base] = f"Cellule {cell + 1} Rouge"
            if base + 1 <= self.channels:
                mapping[base + 1] = f"Cellule {cell + 1} Vert"
            if base + 2 <= self.channels:
                mapping[base + 2] = f"Cellule {cell + 1} Bleu"
        return mapping


def build_fixtures_from_config(
    driver: DmxDriver, fixture_configs: Sequence[dict], engine: Optional[DmxEngine] = None
) -> List[Fixture]:
    """
    Construit les instances de Fixture à partir de la config.
    Chaque adresse est celle de la config, sans décalage automatique (1-512).
    """
    fixtures: List[Fixture] = []

    for cfg in fixture_configs:
        raw_addr = 1
        try:
            raw_addr = int(cfg.get("address", 1))
        except Exception:
            raw_addr = 1
        # Adresse telle quelle (DMX 1-512), sans décalage
        address = max(1, min(512, raw_addr))
        base_kwargs = dict(
            driver=driver,
            engine=engine,
            universe=int(cfg.get("universe", 0)),
            address=address,
            channels=int(cfg.get("channels", 1)),
            name=str(cfg.get("name", "")),
            manufacturer=str(cfg.get("manufacturer", "")),
            model=str(cfg.get("model", "")),
            _mode=str(cfg.get("mode", "")),
        )

        manu = base_kwargs["manufacturer"]
        model = base_kwargs["model"]
        mode = base_kwargs.pop("_mode")  # on ne passe pas _mode au constructeur

        cls: Type[Fixture]

        if manu == "Stairville" and "LED Flood Panel 150" in model and mode == "8-channel":
            cls = LEDFloodPanel150
        elif "Gigabar" in model and int(cfg.get("channels", 1)) == 5:
            cls = Gigabar5ChFixture
            # Mode 5 canaux : 1=Rouge, 2=Vert, 3=Bleu, 4=Dimmer, 5=Strobe (comme Flood/Party)
            base_kwargs.setdefault("red_channel", 1)
            base_kwargs.setdefault("green_channel", 2)
            base_kwargs.setdefault("blue_channel", 3)
            base_kwargs.setdefault("dimmer_channel", 4)
            base_kwargs.setdefault("strobe_channel", 5)
        elif "Gigabar" in model and int(cfg.get("channels", 1)) == 8:
            cls = GigabarFixture8Ch
        elif manu == "Varytec" and "Gigabar II" in model and mode == "24 Channel":
            cls = GigabarFixture
        elif manu == "Eurolite" and "LED PARty TCL spot" in model:
            cls = RGBFixture
            # Mapping physique : 1=Rouge, 2=Vert, 3=Bleu, 4=Intensité, 5=Strobe
            base_kwargs.setdefault("red_channel", 1)
            base_kwargs.setdefault("green_channel", 2)
            base_kwargs.setdefault("blue_channel", 3)
            base_kwargs.setdefault("dimmer_channel", 4)
            base_kwargs.setdefault("strobe_channel", 5)
        elif manu == "Fun-Generation" and "PicoSpot 20" in model:
            cls = MovingHeadFixture
            # Mode 9 canaux (PicoSpot 20 LED doc th.mann) : Ch7 Gobo, Ch8 Gradateur maître, Ch9 Strobe
            if int(cfg.get("channels", 9)) == 9:
                base_kwargs.setdefault("pan_channel", 1)
                base_kwargs.setdefault("pan_fine_channel", 3)
                base_kwargs.setdefault("tilt_channel", 2)
                base_kwargs.setdefault("tilt_fine_channel", 4)
                base_kwargs.setdefault("speed_channel", 5)
                base_kwargs.setdefault("color_channel", 6)
                base_kwargs.setdefault("gobo_channel", 7)
                base_kwargs.setdefault("dimmer_channel", 8)
                base_kwargs.setdefault("strobe_channel", 9)
        elif manu == "BoomToneDJ" and "Xtrem LED" in model:
            cls = XtremLedFixture
        elif manu == "Cameo" and "WOOKIE 200 R" in model:
            cls = WookieLaserFixture
        elif manu == "Ibiza" and "LAS-30G" in model:
            cls = IbizaLas30GFixture
        elif manu == "BoomToneDJ" and "Dynamo Scan LED" in model:
            cls = DynamoScanLed9ChFixture if int(cfg.get("channels", 9)) == 9 else DynamoScanLedFixture
        else:
            cls = Fixture

        fixtures.append(cls(**base_kwargs))

    return fixtures


__all__ = [
    "Fixture",
    "RGBFixture",
    "MovingHeadFixture",
    "LaserFixture",
    "XtremLedFixture",
    "LEDFloodPanel150",
    "Gigabar5ChFixture",
    "GigabarFixture8Ch",
    "GigabarFixture",
    "IbizaLas30GFixture",
    "DynamoScanLedFixture",
    "DynamoScanLed9ChFixture",
    "build_fixtures_from_config",
]

