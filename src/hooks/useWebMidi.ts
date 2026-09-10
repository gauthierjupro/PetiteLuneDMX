import { useEffect } from 'react';

/** Mappe CC7 (volume) → master dimmer 0–255 (Web MIDI, optionnel). */
export function useWebMidi(
  enabled: boolean,
  active: boolean,
  onMasterDimmer: (value: number) => void
) {
  useEffect(() => {
    if (!enabled || !active) return;
    if (typeof navigator === 'undefined' || !('requestMIDIAccess' in navigator)) {
      return;
    }

    let access: MIDIAccess | null = null;
    let cancelled = false;

    const onMessage = (event: MIDIMessageEvent) => {
      const data = event.data;
      if (!data || data.length < 3) return;
      const status = data[0];
      const isCc = (status & 0xf0) === 0xb0;
      if (!isCc) return;
      const cc = data[1];
      const val = data[2];
      if (cc === 7) {
        onMasterDimmer(val);
      }
    };

    navigator
      .requestMIDIAccess()
      .then((midi) => {
        if (cancelled) return;
        access = midi;
        for (const input of midi.inputs.values()) {
          input.onmidimessage = onMessage;
        }
        midi.onstatechange = () => {
          for (const input of midi.inputs.values()) {
            input.onmidimessage = onMessage;
          }
        };
      })
      .catch((e) => {
        console.warn('Web MIDI indisponible:', e);
      });

    return () => {
      cancelled = true;
      if (access) {
        for (const input of access.inputs.values()) {
          input.onmidimessage = null;
        }
      }
    };
  }, [enabled, active, onMasterDimmer]);
}
