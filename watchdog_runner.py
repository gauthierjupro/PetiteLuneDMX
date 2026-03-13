"""
Lance automatiquement `main.py` et le redémarre à chaque fois
qu'un fichier Python (*.py) est modifié dans le projet.

Utilisation :
    python watchdog_runner.py
"""

import os
import subprocess
import sys
import time
from typing import Optional

from watchdog.events import PatternMatchingEventHandler
from watchdog.observers import Observer


class RestartOnChangeHandler(PatternMatchingEventHandler):
    def __init__(self, start_command, *args, **kwargs) -> None:
        super().__init__(patterns=["*.py"], ignore_directories=False, *args, **kwargs)
        self.start_command = start_command
        self.process: Optional[subprocess.Popen] = None
        self._last_event_time = 0.0
        self._debounce_seconds = 0.5

    def start_program(self) -> None:
        if self.process is not None and self.process.poll() is None:
            return
        print("[watchdog] Démarrage de main.py")
        self.process = subprocess.Popen(self.start_command)

    def _restart_program(self) -> None:
        if self.process is not None and self.process.poll() is None:
            print("[watchdog] Arrêt de l'instance courante de main.py")
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                print("[watchdog] Kill forcé de main.py")
                self.process.kill()
        self.start_program()

    def on_modified(self, event) -> None:
        self._on_change(event)

    def on_created(self, event) -> None:
        self._on_change(event)

    def _on_change(self, event) -> None:
        if event.is_directory:
            return

        now = time.time()
        if now - self._last_event_time < self._debounce_seconds:
            return
        self._last_event_time = now

        print(f"[watchdog] Changement détecté : {event.src_path}")
        self._restart_program()


def main() -> None:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(base_dir)

    # Commande pour lancer main.py avec le Python courant
    start_command = [sys.executable, "main.py"]

    event_handler = RestartOnChangeHandler(start_command=start_command)
    event_handler.start_program()

    observer = Observer()
    observer.schedule(event_handler, base_dir, recursive=True)
    observer.start()

    print("[watchdog] Surveillance des fichiers .py (Ctrl+C pour arrêter)")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[watchdog] Arrêt demandé (Ctrl+C)")
    finally:
        observer.stop()
        observer.join()
        if event_handler.process is not None and event_handler.process.poll() is None:
            event_handler.process.terminate()


if __name__ == "__main__":
    main()

