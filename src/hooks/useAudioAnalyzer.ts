import { useState, useEffect, useRef } from 'react';

export interface AudioStats {
  volume: number;
  bass: number;
  mid: number;
  high: number;
  isPeak: boolean;
}

export const useAudioAnalyzer = (active: boolean, deviceId: string | null = null) => {
  const [stats, setStats] = useState<AudioStats>({
    volume: 0,
    bass: 0,
    mid: 0,
    high: 0,
    isPeak: false
  });

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();
  const lastPeakRef = useRef<number>(0);

  // Récupérer les périphériques disponibles
  useEffect(() => {
    const getDevices = async () => {
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = allDevices.filter(device => device.kind === 'audioinput');
        setDevices(audioInputs);
      } catch (err) {
        console.error("Erreur énumération devices:", err);
      }
    };
    getDevices();
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', getDevices);
  }, []);

  useEffect(() => {
    if (!active) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      return;
    }

    const initAudio = async () => {
      try {
        const constraints: MediaStreamConstraints = {
          audio: deviceId ? { deviceId: { exact: deviceId } } : true
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;

        // Forcer le démarrage (les navigateurs suspendent souvent par défaut)
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }

        const source = audioCtx.createMediaStreamSource(stream);
        const analyzer = audioCtx.createAnalyser();
        analyzer.fftSize = 256;
        analyzer.smoothingTimeConstant = 0.2; // Très nerveux
        source.connect(analyzer);
        analyzerRef.current = analyzer;

        const bufferLength = analyzer.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const analyze = () => {
          if (!analyzerRef.current || !active) return;
          analyzerRef.current.getByteFrequencyData(dataArray);

          // Calcul des moyennes par bandes
          let b = 0, m = 0, h = 0;
          
          // Basses (0-15% du spectre) - Plus ciblé
          const bassEnd = Math.floor(bufferLength * 0.15);
          for (let i = 0; i < bassEnd; i++) b += dataArray[i];
          b = bassEnd > 0 ? b / bassEnd : 0;

          // Médiums (15-50%)
          const midEnd = Math.floor(bufferLength * 0.5);
          for (let i = bassEnd; i < midEnd; i++) m += dataArray[i];
          m = (midEnd - bassEnd) > 0 ? m / (midEnd - bassEnd) : 0;

          // Aiguës (50-100%)
          for (let i = midEnd; i < bufferLength; i++) h += dataArray[i];
          h = (bufferLength - midEnd) > 0 ? h / (bufferLength - midEnd) : 0;

          const v = (b + m + h) / 3;

          // Debug ponctuel pour vérifier si des données arrivent
          if (Math.random() < 0.01 && v > 0) {
            console.log("Audio Data Flowing:", { v, b, m, h });
          }

          // Détection de peak (bass-heavy)
          const now = Date.now();
          let isPeak = false;
          if (b > 140 && now - lastPeakRef.current > 150) {
            isPeak = true;
            lastPeakRef.current = now;
          }

          setStats({
            volume: v / 255,
            bass: b / 255,
            mid: m / 255,
            high: h / 255,
            isPeak
          });

          animationFrameRef.current = requestAnimationFrame(analyze);
        };

        analyze();
      } catch (err) {
        console.error("Erreur d'accès au micro:", err);
      }
    };

    initAudio();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, [active, deviceId]);

  return { stats, devices };
};
