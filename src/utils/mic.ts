import { useState, useEffect, useRef, useCallback } from 'react';

export interface NoiseMonitorData {
  decibel: number;
  level: 'quiet' | 'moderate' | 'noisy' | 'danger';
  isListening: boolean;
  hasPermission: boolean | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  thresholdWarning: number;
  thresholdDanger: number;
  setThresholdWarning: (val: number) => void;
  setThresholdDanger: (val: number) => void;
}

export function useNoiseMonitor(
  defaultWarning: number = 65,
  defaultDanger: number = 80
): NoiseMonitorData {
  const [decibel, setDecibel] = useState<number>(38);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [thresholdWarning, setThresholdWarning] = useState<number>(defaultWarning);
  const [thresholdDanger, setThresholdDanger] = useState<number>(defaultDanger);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const simIntervalRef = useRef<number | null>(null);

  const stopListening = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {
        // ignore
      }
      audioCtxRef.current = null;
    }
    setIsListening(false);
    setDecibel(35);
  }, []);

  const startListening = useCallback(async () => {
    try {
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error('getUserMedia not supported');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // 🎵 에코 제거를 켜면 Windows가 '통화 중'으로 보고 다른 소리(유튜브 음악)를 줄이거나 끊어요 → 꺼요
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;
      setHasPermission(true);

      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateDecibel = () => {
        analyser.getByteFrequencyData(dataArray);

        // Calculate Root Mean Square
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);

        // Map RMS (0 ~ 128) to reasonable classroom dB (approx 35dB ~ 95dB)
        let calcDb = 35 + Math.round((rms / 128) * 60);
        if (calcDb > 105) calcDb = 105;
        if (calcDb < 30) calcDb = 30;

        setDecibel((prev) => {
          // Slight smoothing
          return Math.round(prev * 0.4 + calcDb * 0.6);
        });

        animFrameRef.current = requestAnimationFrame(updateDecibel);
      };

      setIsListening(true);
      updateDecibel();
    } catch {
      // Permission denied or inside iframe without mic permissions -> fallback to gentle simulation
      setHasPermission(false);
      setIsListening(true);

      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      simIntervalRef.current = window.setInterval(() => {
        // Natural fluctuating classroom chatter
        const noise = 42 + Math.floor(Math.random() * 26);
        setDecibel(noise);
      }, 500);
    }
  }, []);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  let level: 'quiet' | 'moderate' | 'noisy' | 'danger' = 'quiet';
  if (decibel >= thresholdDanger) {
    level = 'danger';
  } else if (decibel >= thresholdWarning) {
    level = 'noisy';
  } else if (decibel >= 50) {
    level = 'moderate';
  }

  return {
    decibel,
    level,
    isListening,
    hasPermission,
    startListening,
    stopListening,
    thresholdWarning,
    thresholdDanger,
    setThresholdWarning,
    setThresholdDanger,
  };
}
