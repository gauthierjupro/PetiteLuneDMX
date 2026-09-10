import React from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { useAudioAnalyzer } from '../useAudioAnalyzer';

/** BPM (tap tempo), beat visuel, sync audio → BPM. */
export function useLiveBpm(bpm: number, setBpm: React.Dispatch<React.SetStateAction<number>>) {
  const [tapTimes, setTapTimes] = React.useState<number[]>([]);
  const [isBeatActive, setIsBeatActive] = React.useState(false);
  const [isAudioActive, setIsAudioActive] = React.useState(false);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = React.useState<string | null>(() => {
    return localStorage.getItem('dmx_audio_device_id');
  });
  const { stats: audioStats, devices: audioDevices } = useAudioAnalyzer(
    isAudioActive,
    selectedAudioDeviceId
  );
  const audioPeakTimesRef = React.useRef<number[]>([]);

  React.useEffect(() => {
    if (selectedAudioDeviceId) {
      localStorage.setItem('dmx_audio_device_id', selectedAudioDeviceId);
    }
  }, [selectedAudioDeviceId]);

  const handleTap = React.useCallback(() => {
    const now = Date.now();
    const newTaps = [...tapTimes, now].slice(-4);
    setTapTimes(newTaps);
    if (newTaps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < newTaps.length; i++) intervals.push(newTaps[i] - newTaps[i - 1]);
      const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
      const newBpm = Math.round(60000 / avgInterval);
      if (newBpm >= 40 && newBpm <= 220) {
        setBpm(newBpm);
        void invoke('set_bpm', { bpm: newBpm });
      }
    }
    void invoke('trigger_beat');
  }, [tapTimes, setBpm]);

  React.useEffect(() => {
    if (isAudioActive && audioStats.isPeak) {
      void invoke('trigger_peak');
      const now = Date.now();
      const newPeaks = [...audioPeakTimesRef.current, now].slice(-4);
      audioPeakTimesRef.current = newPeaks;
      if (newPeaks.length >= 2) {
        const intervals: number[] = [];
        for (let i = 1; i < newPeaks.length; i++) {
          intervals.push(newPeaks[i] - newPeaks[i - 1]);
        }
        const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
        const newBpm = Math.round(60000 / avgInterval);
        if (newBpm >= 40 && newBpm <= 220) {
          setBpm(newBpm);
          void invoke('set_bpm', { bpm: newBpm });
        }
      }
    }
  }, [audioStats.isPeak, isAudioActive, setBpm]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setIsBeatActive(true);
      setTimeout(() => setIsBeatActive(false), 100);
    }, (60 / bpm) * 1000);
    return () => clearInterval(interval);
  }, [bpm]);

  return {
    tapTimes,
    isBeatActive,
    isAudioActive,
    setIsAudioActive,
    selectedAudioDeviceId,
    setSelectedAudioDeviceId,
    audioStats,
    audioDevices,
    handleTap,
  };
}
