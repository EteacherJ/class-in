/**
 * Web Audio API synthesizer for classroom chimes and alarms.
 * Works offline with zero external audio assets.
 * 전역 사운드 활성/음소거 상태(isGlobalSoundEnabled)와 연동되어
 * 위젯 이동 및 위젯 내부의 모든 효과음, 알람, 차임벨이 일괄 제어됩니다.
 */

import { ChimeSoundType } from '../types';

let audioCtx: AudioContext | null = null;
let globalSoundEnabled = true;

// 🔊 위젯 이동/착지 효과음 테마 모드 (기본 효과음 / 🔔 차임벨 / 🫧 버블 팝 / 🔇 음소거)
export type WidgetSfxMode = 'default' | 'chime' | 'bubble' | 'mute';

/**
 * 위젯 이동 효과음 테마 모드를 반환합니다.
 * 기본값: 기본 효과음 ('default')
 */
export function getWidgetSfxMode(): WidgetSfxMode {
  try {
    const saved = localStorage.getItem('ttime_widget_sfx_mode') as string;
    if (saved === 'default' || saved === 'chime' || saved === 'bubble' || saved === 'mute') {
      return saved as WidgetSfxMode;
    }
    // 기존 구버전(woody, crystal) 설정 사용자 마이그레이션
    if (saved === 'woody' || saved === 'crystal') {
      return 'chime';
    }
  } catch {}
  return 'default';
}

/**
 * 위젯 이동 효과음 테마 모드를 설정하고 localStorage에 저장합니다.
 */
export function setWidgetSfxMode(mode: WidgetSfxMode): void {
  try {
    localStorage.setItem('ttime_widget_sfx_mode', mode);
  } catch {}
}

/**
 * 🤏 1. 위젯 드래그 시작 효과음
 */
export function playWidgetDragStartSound(customMode?: WidgetSfxMode): void {
  const mode = customMode || getWidgetSfxMode();
  if (mode === 'mute' || !isGlobalSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (mode === 'chime') {
      // 🔔 차임벨: 맑고 영롱한 실로폰 하이 톤 리프팅 (1174Hz D6 -> 1568Hz G6)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1174.66, now);
      osc.frequency.exponentialRampToValueAtTime(1567.98, now + 0.045);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    } else if (mode === 'bubble') {
      // 🫧 버블 팝: 가볍고 통통 튀는 작은 기포 리프팅 (420Hz -> 920Hz)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(920, now + 0.04);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
    } else {
      // 🎵 기본음: 부드럽고 가벼운 소프트 핑 리프팅 (880Hz -> 1174Hz)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.04);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  } catch {}
}

/**
 * 🎯 2. 위젯 안착 / 착지 / 정렬 완료 효과음
 * - default: 기본 효과음 (소프트 핑)
 * - chime: 🔔 차임벨 (맑고 영롱한 실로폰/차임 4화음 아르페지오)
 * - bubble: 🫧 버블 팝 (가볍고 통통 튀는 기분 좋은 물방울 팝핑)
 */
export function playWidgetSnapSound(customMode?: WidgetSfxMode): void {
  const mode = customMode || getWidgetSfxMode();
  if (mode === 'mute' || !isGlobalSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  try {
    if (mode === 'chime') {
      // 🔔 [차임벨]: 맑고 영롱한 실로폰/차임 아르페지오 (C6 -> E6 -> G6 -> C7)
      const chimeTones = [
        { freq: 1046.50, delay: 0.000, gain: 0.22, duration: 0.18 }, // C6
        { freq: 1318.51, delay: 0.028, gain: 0.24, duration: 0.20 }, // E6
        { freq: 1567.98, delay: 0.056, gain: 0.26, duration: 0.22 }, // G6
        { freq: 2093.00, delay: 0.088, gain: 0.28, duration: 0.28 }, // C7 영롱한 끝음
      ];

      chimeTones.forEach(({ freq, delay, gain: maxGain, duration }) => {
        const startTime = now + delay;
        // 기본 맑은 종소리 사인파
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.linearRampToValueAtTime(maxGain, startTime + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        // 벨 느낌의 투명한 배음 하모닉스
        const overtone = ctx.createOscillator();
        const overtoneGain = ctx.createGain();
        overtone.type = 'triangle';
        overtone.frequency.setValueAtTime(freq * 2, startTime);
        overtoneGain.gain.setValueAtTime(0.0001, startTime);
        overtoneGain.gain.linearRampToValueAtTime(maxGain * 0.25, startTime + 0.004);
        overtoneGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.65);

        osc.connect(gain);
        gain.connect(ctx.destination);
        overtone.connect(overtoneGain);
        overtoneGain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.01);
        overtone.start(startTime);
        overtone.stop(startTime + duration * 0.65 + 0.01);
      });
    } else if (mode === 'bubble') {
      // 🫧 [버블 팝]: 가볍고 통통 튀는 기분 좋은 물방울/팝핑 사운드
      // 1. 메인 버블 피치 슬라이드 (380Hz -> 1480Hz 급상승 후 퐁! 터짐)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(1480, now + 0.045);
      osc.frequency.linearRampToValueAtTime(1180, now + 0.085);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.018); // 볼록한 팝 어택
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.095); // 퐁 터지며 소멸

      // 2. 가벼운 수분감 배음 (Water Click Pop)
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'triangle';
      sub.frequency.setValueAtTime(760, now);
      sub.frequency.exponentialRampToValueAtTime(2200, now + 0.035);
      subGain.gain.setValueAtTime(0.001, now);
      subGain.gain.linearRampToValueAtTime(0.14, now + 0.01);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      sub.connect(subGain);
      subGain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
      sub.start(now);
      sub.stop(now + 0.055);
    } else {
      // 🎵 [기본 효과음]: 부드럽고 가벼운 소프트 핑 (C6 1046.5Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.50, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    }
  } catch {}
}

/**
 * 전역 사운드 활성화 여부를 반환합니다.
 * localStorage에 저장된 class_dashboard_widget_sound_enabled 값을 우선 확인합니다.
 */
export function isGlobalSoundEnabled(): boolean {
  try {
    const saved = localStorage.getItem('class_dashboard_widget_sound_enabled');
    if (saved !== null) {
      return saved === 'true';
    }
  } catch { }
  return globalSoundEnabled;
}

/**
 * 전역 사운드 활성화 상태를 변경하고 localStorage에 동기화합니다.
 */
export function setGlobalSoundEnabled(enabled: boolean): void {
  globalSoundEnabled = enabled;
  try {
    localStorage.setItem('class_dashboard_widget_sound_enabled', String(enabled));
  } catch { }
}

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playSelectedChime(soundType: ChimeSoundType = 'school_4tone'): void {
  if (!isGlobalSoundEnabled()) return; // 전역 음소거 확인
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  if (soundType === 'school_4tone') {
    // 🔔 풍부한 배음(Harmonics)과 따뜻한 잔향이 살아있는 전통 4음 딩동댕동
    // Sol4 (392.0Hz) -> Do5 (523.25Hz) -> Mi5 (659.25Hz) -> Sol5 (783.99Hz)
    const notes = [
      { freq: 392.0, time: 0.0, dur: 0.85, baseGain: 0.32 },
      { freq: 523.25, time: 0.36, dur: 0.95, baseGain: 0.34 },
      { freq: 659.25, time: 0.72, dur: 1.05, baseGain: 0.34 },
      { freq: 783.99, time: 1.10, dur: 2.20, baseGain: 0.38 }, // 마지막 종소리의 긴 여운
    ];

    notes.forEach(({ freq, time, dur, baseGain }) => {
      const startTime = now + time;

      // 1. 기본음 (Fundamental Sine - 깊고 둥근 울림)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, startTime);
      gain1.gain.setValueAtTime(0, startTime);
      gain1.gain.linearRampToValueAtTime(baseGain, startTime + 0.035);
      gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(startTime);
      osc1.stop(startTime + dur);

      // 2. 옥타브 배음 (2nd Harmonic - 맑고 청아한 종소리 질감)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, startTime);
      gain2.gain.setValueAtTime(0, startTime);
      gain2.gain.linearRampToValueAtTime(baseGain * 0.32, startTime + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + dur * 0.7);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(startTime);
      osc2.stop(startTime + dur * 0.7);

      // 3. 미세한 공명 하모닉스 (Triangle Harmonic - 따뜻한 공간 울림)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(freq * 1.5, startTime); // 완전5도 상위 배음
      gain3.gain.setValueAtTime(0, startTime);
      gain3.gain.linearRampToValueAtTime(baseGain * 0.12, startTime + 0.03);
      gain3.gain.exponentialRampToValueAtTime(0.0001, startTime + dur * 0.5);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(startTime);
      osc3.stop(startTime + dur * 0.5);
    });
  } else if (soundType === 'bell_ding') {
    // Crisp meditation singing bell / Service bell
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, now); // C6
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.8);

    // Overtone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2093.0, now);
    gain2.gain.setValueAtTime(0.15, now);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 1.2);
  } else if (soundType === 'xylophone') {
    // Playful glockenspiel upward arpeggio
    const freqs = [523.25, 659.25, 783.99, 987.77, 1046.5];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + i * 0.1);
      gain.gain.setValueAtTime(0.3, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.6);
    });
  } else if (soundType === 'horn') {
    // Warm fanfare call
    const notes = [
      { f: 392, t: 0, d: 0.25 },
      { f: 523.25, t: 0.2, d: 0.25 },
      { f: 659.25, t: 0.4, d: 0.5 },
      { f: 783.99, t: 0.7, d: 0.9 },
    ];
    notes.forEach(({ f, t, d }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now + t);
      gain.gain.setValueAtTime(0, now + t);
      gain.gain.linearRampToValueAtTime(0.2, now + t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + d);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + d);
    });
  } else if (soundType === 'music_box') {
    // 맑고 영롱한 오르골 멜로디 (도-미-솔-도 아르페지오)
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.15);
      gain.gain.setValueAtTime(0.25, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.15 + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 1.2);
    });
  } else if (soundType === 'whistle') {
    // 체육/게임용 심판 호각 소리 (듀얼 톤 트릴)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2500, now);
    osc.frequency.linearRampToValueAtTime(2800, now + 0.15);
    osc.frequency.linearRampToValueAtTime(2600, now + 0.3);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } else if (soundType === 'marimba') {
    // 경쾌하고 통통 튀는 나무 마린바
    const freqs = [392, 440, 523.25, 659.25];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + i * 0.08);
      gain.gain.setValueAtTime(0.4, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.3);
    });
  } else {
    // Tada celebrate
    playCelebrateSound();
  }
}

export function playClassroomChime(): void {
  playSelectedChime('school_4tone');
}

/**
 * 🎻 뽀모도로 및 집중 타이머 완료 전용 클래식 멜로디 알람
 * 바흐 미뉴에트 G장조 테마의 평화롭고 품격 있는 클래식 피아노/오르골 선율
 */
export function playClassicalTimerAlarm(): void {
  if (!isGlobalSoundEnabled()) return; // 전역 음소거 확인
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // 바흐 미뉴에트 G장조 (Minuet in G major, BWV Anh. 114) 테마
  // D5(587.33) -> G4(392.0) -> A4(440.0) -> B4(493.88) -> C5(523.25) -> D5(587.33) -> G4(392.0) -> G4(392.0)
  // -> E5(659.25) -> C5(523.25) -> D5(587.33)...
  const melody = [
    { freq: 587.33, start: 0.0, dur: 0.45, gain: 0.28 }, // D5
    { freq: 392.00, start: 0.45, dur: 0.22, gain: 0.22 }, // G4
    { freq: 440.00, start: 0.67, dur: 0.22, gain: 0.22 }, // A4
    { freq: 493.88, start: 0.89, dur: 0.22, gain: 0.24 }, // B4
    { freq: 523.25, start: 1.11, dur: 0.22, gain: 0.25 }, // C5
    { freq: 587.33, start: 1.33, dur: 0.45, gain: 0.28 }, // D5
    { freq: 392.00, start: 1.78, dur: 0.45, gain: 0.25 }, // G4
    { freq: 392.00, start: 2.23, dur: 0.60, gain: 0.28 }, // G4 (긴 화음)
    { freq: 659.25, start: 2.85, dur: 0.45, gain: 0.28 }, // E5
    { freq: 523.25, start: 3.30, dur: 0.22, gain: 0.24 }, // C5
    { freq: 587.33, start: 3.52, dur: 0.22, gain: 0.25 }, // D5
    { freq: 493.88, start: 3.74, dur: 0.65, gain: 0.28 }, // B4
  ];

  melody.forEach(({ freq, start, dur, gain: noteGain }) => {
    const osc = ctx.createOscillator();
    const subOsc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // 부드러운 피아노/하프시코드 톤 (Sine + Triangle 배음 하모닉스)
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + start);

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(freq * 2, now + start); // 1옥타브 위 하모닉스 배음

    gainNode.gain.setValueAtTime(0, now + start);
    gainNode.gain.linearRampToValueAtTime(noteGain, now + start + 0.03); // 부드러운 어택
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + start + dur + 0.3); // 자연스러운 잔향

    osc.connect(gainNode);
    subOsc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now + start);
    subOsc.start(now + start);
    osc.stop(now + start + dur + 0.35);
    subOsc.stop(now + start + dur + 0.35);
  });
}

export function playTimerFinishAlarm(soundType: string = 'standard'): void {
  if (!isGlobalSoundEnabled()) return; // 전역 음소거 확인
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  if (soundType.includes('클래식') || soundType === 'classical') {
    playClassicalTimerAlarm();
  } else if (soundType.includes('트럼펫') || soundType === 'trumpet') {
    const freqs = [523.25, 523.25, 523.25, 659.25, 783.99];
    const times = [0, 0.15, 0.3, 0.45, 0.75];
    const durs = [0.12, 0.12, 0.12, 0.25, 0.6];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + times[i]);
      gain.gain.setValueAtTime(0.3, now + times[i]);
      gain.gain.exponentialRampToValueAtTime(0.001, now + times[i] + durs[i]);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + times[i]);
      osc.stop(now + times[i] + durs[i]);
    });
  } else {
    const freqs = [523.25, 659.25, 783.99, 1046.5];
    notes_loop: {
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.22);
        gain.gain.setValueAtTime(0.3, now + i * 0.22);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.22 + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.22);
        osc.stop(now + i * 0.22 + 1.2);
      });
    }
  }
}

export function playCelebrateSound(): void {
  if (!isGlobalSoundEnabled()) return; // 전역 음소거 확인
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [440, 554.37, 659.25, 880];
  const now = ctx.currentTime;
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.12);
    gain.gain.setValueAtTime(0.25, now + idx * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + idx * 0.12);
    osc.stop(now + idx * 0.12 + 0.6);
  });
}

export type TTSVoiceTone = 'friendly' | 'gentle';
export type TTSVoiceGender = 'female' | 'male';
// 하위 호환성 타입 유지
export type TTSVoicePreset = TTSVoiceTone | 'playful' | 'clear' | 'calm' | 'cheerful';

// 브라우저 로딩 시점에 비동기로 채워지는 voices 목록 캐시
let cachedVoices: SpeechSynthesisVoice[] = [];
function updateCachedVoices() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const list = window.speechSynthesis.getVoices();
    if (list.length > 0) {
      cachedVoices = list;
    }
  }
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  updateCachedVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = updateCachedVoices;
  }
}

export interface BestVoiceResult {
  voice: SpeechSynthesisVoice | null;
  isNativeMale: boolean;
}

/**
 * 🎙️ 브라우저 OS 및 엔진별 최상급 자연 한국어 음성(Natural Voice) 자동 탐색기
 * - 남성: InJoon -> male 포함 ko -> fallback(피치 왜곡 없이 안정 톤)
 * - 여성: SunHi -> Google 한국어 -> Yuna -> fallback
 */
export function getBestKoreanVoice(
  gender: TTSVoiceGender = 'female'
): BestVoiceResult {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return { voice: null, isNativeMale: false };
  }
  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  const koVoices = voices.filter((v) => v.lang.includes('ko') || v.lang.includes('KR'));
  if (koVoices.length === 0) return { voice: null, isNativeMale: false };

  if (gender === 'male') {
    // 1순위: voice.name.includes('InJoon') (Edge/Windows 고품질 남성)
    const inJoon = koVoices.find((v) => v.name.includes('InJoon'));
    if (inJoon) return { voice: inJoon, isNativeMale: true };

    // 2순위: voice.name.toLowerCase().includes('male') && voice.lang.includes('ko')
    const maleVoice = koVoices.find(
      (v) => v.name.toLowerCase().includes('male') && (v.lang.includes('ko') || v.lang.includes('KR'))
    );
    if (maleVoice) return { voice: maleVoice, isNativeMale: true };

    // 3순위: 시스템에 남성 한국어 음성이 없을 경우 기본 한국어 음성 fallback
    const fallbackVoice =
      koVoices.find((v) => v.name.includes('SunHi')) ||
      koVoices.find((v) => v.name.includes('Google 한국어')) ||
      koVoices.find((v) => v.name.includes('Yuna')) ||
      koVoices[0];

    return { voice: fallbackVoice, isNativeMale: false };
  } else {
    // 여성 목소리 선택 시:
    // 1순위: voice.name.includes('SunHi') (Edge 고품질 여성)
    // 2순위: voice.name.includes('Google 한국어')
    // 3순위: voice.name.includes('Yuna')
    const sunHi = koVoices.find((v) => v.name.includes('SunHi'));
    if (sunHi) return { voice: sunHi, isNativeMale: false };

    const googleKo = koVoices.find((v) => v.name.includes('Google 한국어') || v.name.includes('Google'));
    if (googleKo) return { voice: googleKo, isNativeMale: false };

    const yuna = koVoices.find((v) => v.name.includes('Yuna'));
    if (yuna) return { voice: yuna, isNativeMale: false };

    return { voice: koVoices[0], isNativeMale: false };
  }
}

/**
 * Text-to-Speech via Web Speech API (speechSynthesis)
 * - 남성 목소리 선택 시 여성 음성의 피치를 억지로 깎지 않고 자연스러운 pitch(1.0 또는 fallback시 0.95) 유지
 * - 자연스러운 호흡과 쉼(Pause)을 위한 한국어 문장 자동 튜닝
 */
export function speakClassroomNotice(
  text: string,
  rate: number = 0.93,
  onEnd?: () => void,
  tone: TTSVoiceTone = 'friendly',
  gender: TTSVoiceGender = 'female'
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }

  window.speechSynthesis.cancel(); // 이전 발화 즉시 정지

  // 한국어 자연 발화를 위한 문장 정제 및 호흡 쉼표(,) 보정
  let cleanText = text
    .replace(/[*_#`[\]()~]/g, '')
    .trim();

  // 호격 조사 뒤에 쉼표가 없으면 자연스러운 호흡을 위해 쉼표 추가 (예: "이원아 뭐하니?" -> "이원아, 뭐하니?")
  cleanText = cleanText.replace(/([가-힣]{2,4}[아|야|님])\s+/g, '$1, ');
  cleanText = cleanText.replace(/(얘들아|여러분|친구들|선생님)\s+/g, '$1, ');

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'ko-KR';

  // OS 및 브라우저에서 최적의 신경망(Neural/Natural) 보이스 객체 매핑
  const { voice, isNativeMale } = getBestKoreanVoice(gender);
  if (voice) {
    utterance.voice = voice;
  }

  // 🗣️ 피치 왜곡 없는 자연스러운 발화 설정
  if (gender === 'male') {
    if (isNativeMale) {
      // 실제 남성 음성 객체가 있을 때: 왜곡 없이 기본 피치(1.0) 유지
      utterance.pitch = tone === 'gentle' ? 0.97 : 1.0;
      utterance.rate = tone === 'gentle' ? 0.90 : rate;
    } else {
      // 시스템에 남성 한국어 음성이 없을 경우:
      // 여성 피치를 억지로 내리지 않고 기본 음성의 피치를 0.95 정도로만 자연스럽게 유지하고 속도(0.92) 조절
      utterance.pitch = 0.95;
      utterance.rate = 0.92;
    }
  } else {
    // 여성 목소리: 기본 피치 1.0 (부드러운 톤은 0.98)
    utterance.pitch = tone === 'gentle' ? 0.98 : 1.0;
    utterance.rate = tone === 'gentle' ? 0.90 : rate;
  }

  if (onEnd) {
    utterance.onend = () => onEnd();
    utterance.onerror = () => onEnd();
  }

  window.speechSynthesis.speak(utterance);
}

/**
 * Ambient background music player for Cleaning & Break modes
 * Uses soft procedural chords (Lo-Fi major chords)
 */
let bgMusicInterval: number | null = null;
let bgMusicGain: GainNode | null = null;

export function startAmbientMusic(type: 'clean' | 'relax' = 'clean'): void {
  stopAmbientMusic();
  if (!isGlobalSoundEnabled()) return; // 전역 음소거 확인
  const ctx = getAudioContext();
  if (!ctx) return;

  bgMusicGain = ctx.createGain();
  bgMusicGain.gain.setValueAtTime(0.12, ctx.currentTime);
  bgMusicGain.connect(ctx.destination);

  // Calming chord progression: Cmaj7 -> Am7 -> Dm7 -> G7
  const chords =
    type === 'clean'
      ? [
        [261.63, 329.63, 392.0, 493.88], // Cmaj7
        [220.0, 261.63, 329.63, 392.0], // Am7
        [293.66, 349.23, 440.0, 523.25], // Dm7
        [196.0, 246.94, 293.66, 349.23], // G7
      ]
      : [
        [261.63, 329.63, 392.0], // C
        [349.23, 440.0, 523.25], // F
        [220.0, 261.63, 329.63], // Am
        [196.0, 246.94, 293.66], // G
      ];

  let chordIndex = 0;
  const playNextChord = () => {
    if (!ctx || !bgMusicGain) return;
    const now = ctx.currentTime;
    const currentChord = chords[chordIndex % chords.length];
    chordIndex++;

    currentChord.forEach((freq) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      noteGain.gain.setValueAtTime(0.001, now);
      noteGain.gain.linearRampToValueAtTime(0.04, now + 0.6);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + 3.8);

      osc.connect(noteGain);
      noteGain.connect(bgMusicGain!);

      osc.start(now);
      osc.stop(now + 4.0);
    });
  };

  playNextChord();
  bgMusicInterval = window.setInterval(playNextChord, 4000);
}

export function stopAmbientMusic(): void {
  if (bgMusicInterval) {
    clearInterval(bgMusicInterval);
    bgMusicInterval = null;
  }
  if (bgMusicGain) {
    try {
      bgMusicGain.disconnect();
    } catch {
      // ignore
    }
    bgMusicGain = null;
  }
}
