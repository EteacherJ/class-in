/**
 * ⏰ 보조창 타이머 알림
 *  - 알림음은 모두 Web Audio로 이 프로그램 안에서 직접 만든 소리예요 (외부 음원 없음 → 저작권 걱정 없음)
 *  - 1분 전 · 30초 전 · 10초 전 · 끝 같은 시점에 루미 팝업과 함께 울려요
 */
import { useEffect, useState } from 'react';
import { getAudioContext } from './audio';

export type TimerSoundId = 'xylo' | 'magic' | 'bubble' | 'coin' | 'musicbox' | 'cuckoo' | 'boing' | 'fanfare' | 'mute';
export type PickSpinId = 'drum' | 'tick' | 'slot' | 'rise' | 'mute';
export const PICK_SPIN_SOUNDS: { id: PickSpinId; label: string; emoji: string }[] = [
  { id: 'drum', label: '두구두구 드럼', emoji: '🥁' },
  { id: 'tick', label: '똑딱 룰렛', emoji: '🎡' },
  { id: 'slot', label: '뾱뾱 슬롯', emoji: '🎰' },
  { id: 'rise', label: '점점 두근두근', emoji: '💓' },
  { id: 'mute', label: '소리 없음', emoji: '🔇' },
];
export type TimerFontId = 'fredoka' | 'jua' | 'mono';

export const TIMER_SOUNDS: { id: TimerSoundId; label: string; emoji: string }[] = [
  { id: 'xylo', label: '실로폰 띵동', emoji: '🎹' },
  { id: 'magic', label: '뾰로롱 마법', emoji: '🪄' },
  { id: 'bubble', label: '뽀글 방울', emoji: '🫧' },
  { id: 'coin', label: '게임 코인', emoji: '🪙' },
  { id: 'musicbox', label: '오르골', emoji: '🎠' },
  { id: 'cuckoo', label: '뻐꾹 시계', emoji: '🐦' },
  { id: 'boing', label: '띠요옹', emoji: '🌀' },
  { id: 'fanfare', label: '짜잔 팡파르', emoji: '🎺' },
  { id: 'mute', label: '소리 없음', emoji: '🔇' },
];

export const TIMER_FONTS: { id: TimerFontId; label: string; sample: string }[] = [
  { id: 'fredoka', label: '동글동글', sample: '05:00' },
  { id: 'jua', label: '말랑말랑', sample: '05:00' },
  { id: 'mono', label: '기본(또박)', sample: '05:00' },
];

/** 알림 시점 고르기 (초) */
export const TIMER_POINTS: { sec: number; label: string }[] = [
  { sec: 180, label: '3분 전' },
  { sec: 60, label: '1분 전' },
  { sec: 30, label: '30초 전' },
  { sec: 10, label: '10초 전' },
];

export interface TimerAlertSettings {
  font: TimerFontId;
  warnSound: TimerSoundId;
  endSound: TimerSoundId;
  volume: number; // 0 ~ 1
  points: number[];
  countdown: boolean; // 5·4·3·2·1 똑딱
  popup: boolean;
  touchSound: TimerSoundId | 'chime'; // 등교 터치 효과음
  pickSpin: PickSpinId; // 발표자 뽑는 동안
  pickEnd: TimerSoundId; // 뽑힌 뒤
}

const KEY = 'dm_timer_alert_v1';
const EVT = 'classin:timer-alert';
export const DEFAULT_TIMER_ALERT: TimerAlertSettings = {
  font: 'fredoka',
  warnSound: 'xylo',
  endSound: 'fanfare',
  volume: 0.85,
  points: [60, 30, 10],
  countdown: true,
  popup: true,
  touchSound: 'chime',
  pickSpin: 'drum',
  pickEnd: 'fanfare',
};

export function getTimerAlert(): TimerAlertSettings {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v && typeof v === 'object') return { ...DEFAULT_TIMER_ALERT, ...v };
  } catch {}
  return { ...DEFAULT_TIMER_ALERT };
}
export function setTimerAlert(next: TimerAlertSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  window.dispatchEvent(new Event(EVT));
}
export function useTimerAlert(): [TimerAlertSettings, (p: Partial<TimerAlertSettings>) => void] {
  const [v, setV] = useState<TimerAlertSettings>(() => getTimerAlert());
  useEffect(() => {
    const re = () => setV(getTimerAlert());
    const onStorage = (e: StorageEvent) => e.key === KEY && re();
    window.addEventListener(EVT, re);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(EVT, re);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return [v, (p) => setTimerAlert({ ...getTimerAlert(), ...p })];
}

// ── 소리 만들기 ─────────────────────────────────────────
type Ctx = AudioContext;
const N = (name: string) => {
  // 'C6' 같은 음 이름 → 주파수
  const map: Record<string, number> = { C: -9, 'C#': -8, D: -7, 'D#': -6, E: -5, F: -4, 'F#': -3, G: -2, 'G#': -1, A: 0, 'A#': 1, B: 2 };
  const m = /^([A-G]#?)(\d)$/.exec(name)!;
  return 440 * Math.pow(2, (map[m[1]] + (Number(m[2]) - 4) * 12) / 12);
};

function tone(ctx: Ctx, out: AudioNode, o: { f: number; t: number; d: number; type?: OscillatorType; v?: number; f2?: number; a?: number }) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(o.f, o.t);
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, o.t + o.d * 0.9);
  const v = o.v ?? 0.5;
  const a = o.a ?? 0.005;
  g.gain.setValueAtTime(0.0001, o.t);
  g.gain.exponentialRampToValueAtTime(v, o.t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, o.t + o.d);
  osc.connect(g).connect(out);
  osc.start(o.t);
  osc.stop(o.t + o.d + 0.05);
}
/** 맑은 종소리 (기본음 + 배음) */
function bell(ctx: Ctx, out: AudioNode, f: number, t: number, d = 0.9, v = 0.45) {
  tone(ctx, out, { f, t, d, type: 'sine', v });
  tone(ctx, out, { f: f * 2, t, d: d * 0.6, type: 'sine', v: v * 0.35 });
  tone(ctx, out, { f: f * 3.01, t, d: d * 0.3, type: 'sine', v: v * 0.12 });
}

const SOUNDS: Record<Exclude<TimerSoundId, 'mute'>, (ctx: Ctx, out: AudioNode, t: number) => number> = {
  xylo: (ctx, out, t) => {
    ['C6', 'E6', 'G6', 'C7'].forEach((n, i) => bell(ctx, out, N(n), t + i * 0.12, 0.6, 0.4));
    return 1.1;
  },
  magic: (ctx, out, t) => {
    ['G5', 'B5', 'D6', 'G6', 'B6', 'D7', 'G7'].forEach((n, i) => tone(ctx, out, { f: N(n), t: t + i * 0.05, d: 0.35, type: 'triangle', v: 0.25 }));
    for (let i = 0; i < 6; i++) tone(ctx, out, { f: 2400 + Math.random() * 1800, t: t + 0.35 + i * 0.07, d: 0.18, v: 0.12 });
    return 1;
  },
  bubble: (ctx, out, t) => {
    [0, 0.16, 0.3, 0.42].forEach((dt, i) => tone(ctx, out, { f: 300 + i * 90, f2: 1100 + i * 220, t: t + dt, d: 0.14, v: 0.45 }));
    return 0.7;
  },
  coin: (ctx, out, t) => {
    tone(ctx, out, { f: N('B5'), t, d: 0.09, type: 'square', v: 0.18 });
    tone(ctx, out, { f: N('E6'), t: t + 0.09, d: 0.45, type: 'square', v: 0.18 });
    tone(ctx, out, { f: N('B5'), t: t + 0.6, d: 0.09, type: 'square', v: 0.18 });
    tone(ctx, out, { f: N('E6'), t: t + 0.69, d: 0.45, type: 'square', v: 0.18 });
    return 1.2;
  },
  musicbox: (ctx, out, t) => {
    // 직접 지은 짧은 멜로디
    const mel: [string, number][] = [['E6', 0], ['G6', 0.2], ['C7', 0.4], ['B6', 0.6], ['G6', 0.8], ['A6', 1.0], ['C7', 1.25]];
    mel.forEach(([n, dt]) => bell(ctx, out, N(n), t + dt, 0.8, 0.3));
    return 2;
  },
  cuckoo: (ctx, out, t) => {
    for (let r = 0; r < 2; r++) {
      tone(ctx, out, { f: N('G5'), t: t + r * 0.7, d: 0.28, type: 'sine', v: 0.5, a: 0.02 });
      tone(ctx, out, { f: N('D#5'), t: t + r * 0.7 + 0.3, d: 0.38, type: 'sine', v: 0.5, a: 0.02 });
    }
    return 1.5;
  },
  boing: (ctx, out, t) => {
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(720, t + 0.25);
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.8);
    lfo.frequency.value = 14;
    lg.gain.value = 40;
    lfo.connect(lg).connect(osc.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.45, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    osc.connect(g).connect(out);
    osc.start(t);
    lfo.start(t);
    osc.stop(t + 0.95);
    lfo.stop(t + 0.95);
    return 1;
  },
  fanfare: (ctx, out, t) => {
    const steps: [string[], number, number][] = [
      [['G4', 'C5'], 0, 0.14],
      [['G4', 'C5'], 0.16, 0.14],
      [['G4', 'C5'], 0.32, 0.14],
      [['C5', 'E5', 'G5'], 0.5, 0.9],
    ];
    steps.forEach(([ns, dt, d]) => ns.forEach((n) => tone(ctx, out, { f: N(n), t: t + dt, d, type: 'sawtooth', v: 0.09, a: 0.02 })));
    steps.forEach(([ns, dt, d]) => ns.forEach((n) => tone(ctx, out, { f: N(n) * 2, t: t + dt, d, type: 'triangle', v: 0.12, a: 0.02 })));
    for (let i = 0; i < 5; i++) bell(ctx, out, N('C7') * (1 + i * 0.12), t + 0.55 + i * 0.06, 0.4, 0.08);
    return 1.6;
  },
};

/** 알림음 울리기 (repeat: 끝났을 때 두 번) */
/** 🔊 알림음 출력: 소리를 키우고(최대 약 2.6배) 컴프레서로 찢어지지 않게 */
export const TIMER_BOOST = 2.6;
function loudOut(ctx: AudioContext, volume: number): GainNode {
  const v = Math.max(0, Math.min(1, volume));
  const master = ctx.createGain();
  master.gain.value = v * TIMER_BOOST;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 8;
  comp.ratio.value = 6;
  comp.attack.value = 0.003;
  comp.release.value = 0.2;
  const post = ctx.createGain();
  post.gain.value = 1.35;
  master.connect(comp).connect(post).connect(ctx.destination);
  return master;
}

export function playTimerSound(id: TimerSoundId, volume = 0.85, repeat = 1) {
  if (id === 'mute' || volume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    const master = loudOut(ctx, volume);
    let t = ctx.currentTime + 0.03;
    for (let i = 0; i < repeat; i++) t += SOUNDS[id](ctx, master, t) + 0.15;
  } catch {}
}

/** 마지막 5초 똑딱 */
export function playTimerTick(sec: number, volume = 0.7) {
  const ctx = getAudioContext();
  if (!ctx || volume <= 0) return;
  try {
    const master = loudOut(ctx, volume * 0.8);
    const t = ctx.currentTime + 0.01;
    tone(ctx, master, { f: sec === 1 ? 1320 : 990, t, d: 0.09, type: 'triangle', v: 0.5 });
    tone(ctx, master, { f: 2600, t, d: 0.03, type: 'square', v: 0.05 });
  } catch {}
}

export function timerAlertMessage(sec: number): { title: string; sub: string } {
  if (sec <= 0) return { title: '시간 끝!', sub: '모두 하던 것을 멈추고 앞을 봐요 ✋' };
  if (sec >= 60 && sec % 60 === 0) return { title: `${sec / 60}분 남았어요!`, sub: sec >= 120 ? '천천히 마무리를 준비해요 🙂' : '이제 마무리할 시간이에요 ⏰' };
  if (sec >= 30) return { title: `${sec}초 남았어요!`, sub: '하던 것을 정리해요 🧹' };
  return { title: `${sec}초!`, sub: '다 같이 셀 준비~ 🙌' };
}

let noiseBuf: AudioBuffer | null = null;
function noise(ctx: AudioContext) {
  if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
  const len = Math.floor(ctx.sampleRate * 0.2);
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

/** 🎲 뽑는 동안 한 번씩 울리는 소리 (progress: 0 → 1 로 갈수록 커지고 높아져요) */
export function playPickTick(id: PickSpinId, progress: number, volume = 0.7) {
  if (id === 'mute' || volume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const p = Math.max(0, Math.min(1, progress));
    const master = ctx.createGain();
    master.gain.value = Math.max(0, Math.min(1, volume)) * (0.45 + p * 0.55);
    master.connect(ctx.destination);
    const t = ctx.currentTime + 0.005;
    if (id === 'drum') {
      const src = ctx.createBufferSource();
      src.buffer = noise(ctx);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1800 + p * 1200;
      bp.Q.value = 0.9;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      src.connect(bp).connect(g).connect(master);
      src.start(t);
      src.stop(t + 0.08);
      tone(ctx, master, { f: 150, f2: 90, t, d: 0.06, v: 0.25 });
    } else if (id === 'tick') {
      tone(ctx, master, { f: 1900, t, d: 0.03, type: 'triangle', v: 0.4 });
      tone(ctx, master, { f: 3800, t, d: 0.015, type: 'square', v: 0.05 });
    } else if (id === 'slot') {
      const scale = [523, 587, 659, 784, 880, 1047, 1175, 1319];
      tone(ctx, master, { f: scale[Math.floor(Math.random() * scale.length)], t, d: 0.05, type: 'square', v: 0.13 });
    } else if (id === 'rise') {
      tone(ctx, master, { f: 260 + p * 700, t, d: 0.07, type: 'sine', v: 0.4 });
    }
  } catch {}
}
