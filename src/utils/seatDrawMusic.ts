/**
 * 🎵 자리 뽑기 배경음악 (파일 없이 Web Audio 로 합성)
 *  - 오락실 뽑기 기계 느낌의 통통 튀는 8마디 반복곡
 *  - startSeatBgm() / stopSeatBgm() / setSeatBgmLevel('intro' | 'play')
 */
import { getAudioContext } from './audio';

const N: Record<string, number> = {
  C3: 130.81, F3: 174.61, G3: 196, A3: 220,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, C6: 1046.5,
};
// [음, 시작(8분음표 단위), 길이]
const MELODY: [string, number, number][] = [
  ['E5', 0, 1], ['G5', 1, 1], ['C6', 2, 2], ['G5', 4, 1], ['E5', 5, 1], ['D5', 6, 2],
  ['C5', 8, 1], ['D5', 9, 1], ['E5', 10, 1], ['G5', 11, 1], ['A5', 12, 2], ['G5', 14, 2],
  ['F5', 16, 1], ['A5', 17, 1], ['C6', 18, 2], ['A5', 20, 1], ['F5', 21, 1], ['E5', 22, 2],
  ['D5', 24, 1], ['E5', 25, 1], ['F5', 26, 1], ['D5', 27, 1], ['G5', 28, 3],
  ['E5', 32, 1], ['G5', 33, 1], ['C6', 34, 2], ['G5', 36, 1], ['A5', 37, 1], ['G5', 38, 2],
  ['E5', 40, 1], ['F5', 41, 1], ['G5', 42, 1], ['E5', 43, 1], ['D5', 44, 2], ['C5', 46, 2],
  ['A4', 48, 1], ['C5', 49, 1], ['F5', 50, 2], ['E5', 52, 1], ['D5', 53, 1], ['C5', 54, 2],
  ['D5', 56, 1], ['E5', 57, 1], ['D5', 58, 1], ['B4', 59, 1], ['C5', 60, 4],
];
const BASS = ['C3', 'C3', 'A3', 'A3', 'F3', 'F3', 'G3', 'G3', 'C3', 'C3', 'A3', 'A3', 'F3', 'F3', 'G3', 'C3'];

let state: { master: GainNode; timer: number; next: number; bar: number } | null = null;
let level = 0.22;

function tone(ctx: AudioContext, out: AudioNode, f: number, t: number, d: number, type: OscillatorType, v: number) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + d + 0.02);
}
function hat(ctx: AudioContext, out: AudioNode, t: number, v: number) {
  const len = Math.floor(ctx.sampleRate * 0.04);
  const b = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = ctx.createBufferSource();
  s.buffer = b;
  const f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 7000;
  const g = ctx.createGain();
  g.gain.value = v;
  s.connect(f).connect(g).connect(out);
  s.start(t);
}

const BPM = 132;
const E = 60 / BPM / 2; // 8분음표 길이

function scheduleLoop(ctx: AudioContext, out: AudioNode, t0: number) {
  MELODY.forEach(([n, s, l]) => {
    tone(ctx, out, N[n], t0 + s * E, l * E * 0.92, 'square', 0.05);
    tone(ctx, out, N[n] * 2, t0 + s * E, l * E * 0.5, 'sine', 0.025);
  });
  BASS.forEach((n, i) => {
    tone(ctx, out, N[n], t0 + i * 4 * E, E * 1.6, 'triangle', 0.16);
    tone(ctx, out, N[n] * 2, t0 + (i * 4 + 2) * E, E * 1.2, 'triangle', 0.09);
  });
  for (let i = 0; i < 64; i++) {
    if (i % 2 === 1) hat(ctx, out, t0 + i * E, 0.05);
    if (i % 4 === 0) tone(ctx, out, 110, t0 + i * E, 0.12, 'sine', 0.16);
  }
}

export function startSeatBgm() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  if (state) return;
  const master = ctx.createGain();
  master.gain.value = 0.0001;
  master.connect(ctx.destination);
  master.gain.exponentialRampToValueAtTime(level, ctx.currentTime + 1.2);
  const loopLen = 64 * E;
  const st = { master, timer: 0, next: ctx.currentTime + 0.1, bar: 0 };
  scheduleLoop(ctx, master, st.next);
  st.next += loopLen;
  // 다음 반복을 미리 예약
  st.timer = window.setInterval(() => {
    if (ctx.currentTime > st.next - 2) {
      scheduleLoop(ctx, master, st.next);
      st.next += loopLen;
    }
  }, 500);
  state = st;
}

export function stopSeatBgm() {
  if (!state) return;
  const ctx = getAudioContext();
  const s = state;
  state = null;
  clearInterval(s.timer);
  try {
    if (ctx) {
      s.master.gain.cancelScheduledValues(ctx.currentTime);
      s.master.gain.setValueAtTime(Math.max(0.0001, s.master.gain.value), ctx.currentTime);
      s.master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    }
    window.setTimeout(() => s.master.disconnect(), 800);
  } catch {}
}

/** 인트로는 크게, 뽑는 동안은 효과음이 잘 들리게 작게 */
export function setSeatBgmLevel(kind: 'intro' | 'play') {
  level = kind === 'intro' ? 0.26 : 0.12;
  const ctx = getAudioContext();
  if (state && ctx) {
    state.master.gain.cancelScheduledValues(ctx.currentTime);
    state.master.gain.setValueAtTime(Math.max(0.0001, state.master.gain.value), ctx.currentTime);
    state.master.gain.exponentialRampToValueAtTime(level, ctx.currentTime + 0.8);
  }
}
