from typing import List

from config import FIXTURES
from core.dmx_driver import DmxDriver
from core.dmx_engine import DmxEngine
from core.address_overrides import load_address_overrides
from models.fixtures import RGBFixture, build_fixtures_from_config
from ui.main_window import App, create_app


DMX_SERIAL_PORT = "COM3"  # adapte ce port à ton Enttec


def _select_test_rgb_fixtures(fixtures: List[RGBFixture]) -> List[RGBFixture]:
    """
    Sélectionne les projecteurs RGB utilisés pour certains tests de couleur.
    Ici on choisit ceux issus des Eurolite LED PARty TCL spot à l’adresse 32,
    grâce à la config, sans écrire ce numéro de canal dans l’UI.
    """
    selected: List[RGBFixture] = []
    for fx in fixtures:
        if fx.manufacturer == "Eurolite" and "LED PARty TCL spot" in fx.model:
            if fx.address == 32:
                selected.append(fx)
    return selected


def main() -> None:
    dmx = DmxDriver(port=DMX_SERIAL_PORT, refresh_rate_hz=40.0)
    engine = DmxEngine(dmx, default_fade_s=0.5)

    all_fixtures = build_fixtures_from_config(dmx, FIXTURES, engine=engine)
    load_address_overrides(all_fixtures)
    rgb_fixtures = [f for f in all_fixtures if isinstance(f, RGBFixture)]
    test_rgb_fixtures = _select_test_rgb_fixtures(rgb_fixtures)

    app: App = create_app(
        dmx_driver=dmx,
        fixtures=all_fixtures,
        test_rgb_fixtures=test_rgb_fixtures,
    )
    app.mainloop()


if __name__ == "__main__":
    main()

