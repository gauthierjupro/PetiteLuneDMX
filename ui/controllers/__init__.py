# Contrôleurs par onglet / zone : logique découplée de main_window.

from ui.controllers.control_controller import ControlController
from ui.controllers.rhythm_controller import RhythmController
from ui.controllers.spot_controller import SpotController
from ui.controllers.presets_controller import PresetsController

__all__ = [
    "ControlController",
    "RhythmController",
    "SpotController",
    "PresetsController",
]
