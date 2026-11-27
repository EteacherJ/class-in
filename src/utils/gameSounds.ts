/**
 * 🎮 대진표 · 점수판 소리 (파일 없이 Web Audio 로 합성)
 * - 점수 +/− 효과음
 * - 우승 배경음악 (팡파르 → 신나는 행진곡, 끌 때 부드럽게 줄어듦)
 * - 게임 소리 켜기/끄기(dm_game_sound)를 따라요.
 *   (예전엔 '위젯 이동 효과음' 끄기에도 같이 꺼져서 소리가 안 났어요 → 타이머 · 뽑기 소리처럼 따로 동작)
 */
import { getAudioContext } from './audio';

const KEY = 'dm_game_sound';
export const isGameSoundOn = () => {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
};
export const setGameSoundOn = (on: boolean) => {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {}
  if (!on) stopVictoryMusic(true);
  window.dispatchEvent(new Event('classin:game-sound'));
};
const ready = () => {
  if (!isGameSoundOn()) return null;
  const ctx = getAudioContext();
  if (!ctx) return null;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
};

const N: Record<string, number> = {
  G3: 196, A3: 220, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, E6: 1318.5, G6: 1568,
};

function tone(ctx: AudioContext, out: AudioNode, freq: number, t: number, dur: number, type: OscillatorType, vol: number, glideTo?: number) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur * 0.9);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.02);
}
function noise(ctx: AudioContext, out: AudioNode, t: number, dur: number, vol: number, hp = 1200) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = hp;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(out);
  src.start(t);
}

/** ➕ 점수 올라갈 때: 동전 소리처럼 '띠링!' (큰 점수는 한 음 더) */
export function playScoreUp(step = 1) {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime + 0.02;
  tone(ctx, ctx.destination, N.B5, t, 0.09, 'square', 0.07);
  tone(ctx, ctx.destination, N.E6, t + 0.07, 0.28, 'square', 0.07);
  tone(ctx, ctx.destination, N.E6, t + 0.07, 0.3, 'sine', 0.08);
  if (step >= 5) tone(ctx, ctx.destination, N.G6, t + 0.15, 0.3, 'sine', 0.07);
}
/** ➖ 점수 내려갈 때: '뿌웅' 하고 내려가는 소리 */
export function playScoreDown() {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime + 0.02;
  tone(ctx, ctx.destination, 330, t, 0.26, 'triangle', 0.14, 150);
  tone(ctx, ctx.destination, 165, t, 0.26, 'sine', 0.1, 90);
}
/** 🥁 시상식 북소리 (두구두구) */
export function playDrumroll(sec = 1.6) {
  const ctx = ready();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const n = Math.floor(sec / 0.055);
  for (let i = 0; i < n; i++) {
    const t = t0 + i * 0.055;
    const v = 0.05 + (i / n) * 0.12;
    noise(ctx, ctx.destination, t, 0.05, v, 400);
    tone(ctx, ctx.destination, 110, t, 0.05, 'sine', v * 0.6, 70);
  }
  noise(ctx, ctx.destination, t0 + sec, 0.5, 0.18, 2500); // 심벌
}
/** 🎖 순위 발표 한 음 (3위 → 2위 → 1위로 갈수록 높아짐) */
export function playRankReveal(rank: 1 | 2 | 3) {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime;
  const base = rank === 3 ? [N.C5, N.E5] : rank === 2 ? [N.E5, N.G5] : [N.G5, N.C6];
  base.forEach((f, i) => {
    tone(ctx, ctx.destination, f, t + i * 0.1, 0.35, 'square', 0.05);
    tone(ctx, ctx.destination, f, t + i * 0.1, 0.4, 'sine', 0.08);
  });
}

/** 🏁 대진표: 이긴 쪽을 고르면 '빠밤!' 하고 올라가는 소리 (결승에 가까울수록 높아져요) */
export function playMatchWin(level = 0) {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime + 0.02;
  const up = Math.pow(2, Math.min(4, level) * (2 / 12));
  [N.C5, N.E5, N.G5].forEach((f, i) => {
    tone(ctx, ctx.destination, f * up, t + i * 0.07, 0.18, 'square', 0.05);
    tone(ctx, ctx.destination, f * up, t + i * 0.07, 0.22, 'triangle', 0.09);
  });
  tone(ctx, ctx.destination, N.C6 * up, t + 0.21, 0.45, 'triangle', 0.12);
  noise(ctx, ctx.destination, t + 0.21, 0.25, 0.05, 4000);
}
/** 🤝 무승부: 부드러운 두 음 */
export function playMatchDraw() {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime + 0.02;
  tone(ctx, ctx.destination, N.E5, t, 0.3, 'sine', 0.12);
  tone(ctx, ctx.destination, N.E5, t + 0.16, 0.35, 'sine', 0.12);
}
/** ↩ 결과 취소: 짧게 내려가는 소리 */
export function playMatchUndo() {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime + 0.02;
  tone(ctx, ctx.destination, 600, t, 0.14, 'triangle', 0.1, 300);
}

// ── 🏆 우승 배경음악 ──
let music: { master: GainNode; timers: number[]; stopAt: number } | null = null;

const FANFARE: [string, number, number][] = [
  // [음, 시작(박), 길이(박)]
  ['G4', 0, 0.33], ['G4', 0.33, 0.33], ['G4', 0.66, 0.34], ['C5', 1, 1.5],
  ['G4', 2.5, 0.5], ['C5', 3, 0.5], ['E5', 3.5, 0.5], ['G5', 4, 2],
];
// 신나는 행진 멜로디 (8박 × 2)
const MELODY: [string, number, number][] = [
  ['E5', 0, 0.5], ['G5', 0.5, 0.5], ['C6', 1, 1], ['B5', 2, 0.5], ['G5', 2.5, 0.5], ['A5', 3, 1],
  ['G5', 4, 0.5], ['E5', 4.5, 0.5], ['F5', 5, 0.5], ['D5', 5.5, 0.5], ['C5', 6, 1.5],
  ['E5', 8, 0.5], ['G5', 8.5, 0.5], ['C6', 9, 1], ['B5', 10, 0.5], ['A5', 10.5, 0.5], ['G5', 11, 1],
  ['A5', 12, 0.5], ['B5', 12.5, 0.5], ['C6', 13, 0.5], ['G5', 13.5, 0.5], ['C6', 14, 1.5],
];
const BASS = ['C4', 'G3', 'A3', 'G3', 'F4', 'G3', 'C4', 'G3', 'C4', 'G3', 'A3', 'E4', 'F4', 'G3', 'C4', 'C4'];
const CHORDS: string[][] = [['C5', 'E5', 'G5'], ['A4', 'C5', 'E5'], ['F4', 'A4', 'C5'], ['G4', 'B4', 'D5'], ['C5', 'E5', 'G5'], ['A4', 'C5', 'E5'], ['F4', 'A4', 'C5'], ['G4', 'B4', 'D5']];

/** 🎺 우승 음악 시작 (팡파르 후 행진곡을 loops 번 반복, 끝나면 부드럽게 줄어듦) */
export function startVictoryMusic(loops = 2) {
  const ctx = ready();
  if (!ctx) return;
  stopVictoryMusic(true);
  const master = ctx.createGain();
  master.gain.value = 0.0001;
  master.connect(ctx.destination);
  master.gain.exponentialRampToValueAtTime(0.9, ctx.currentTime + 0.05);
  const bpm = 150;
  const B = 60 / bpm;
  const t0 = ctx.currentTime + 0.08;
  // 팡파르 (트럼펫 느낌: 톱니파 + 저역 필터)
  const brass = ctx.createBiquadFilter();
  brass.type = 'lowpass';
  brass.frequency.value = 2400;
  brass.connect(master);
  FANFARE.forEach(([n, s, d]) => {
    tone(ctx, brass, N[n], t0 + s * B, d * B * 0.95, 'sawtooth', 0.09);
    tone(ctx, master, N[n] / 2, t0 + s * B, d * B * 0.95, 'triangle', 0.08);
  });
  noise(ctx, master, t0 + 4 * B, 0.7, 0.12, 3000);
  const fanLen = 6 * B;
  const loopLen = 16 * B;
  for (let L = 0; L < loops; L++) {
    const s0 = t0 + fanLen + L * loopLen;
    MELODY.forEach(([n, s, d]) => {
      tone(ctx, master, N[n], s0 + s * B, d * B * 0.9, 'square', 0.045);
      tone(ctx, master, N[n], s0 + s * B, d * B * 0.95, 'triangle', 0.06);
    });
    BASS.forEach((n, i) => tone(ctx, master, N[n] / 2, s0 + i * B, B * 0.8, 'triangle', 0.13));
    CHORDS.forEach((ch, i) => ch.forEach((n) => tone(ctx, master, N[n], s0 + i * 2 * B + B, B * 0.35, 'sine', 0.025)));
    for (let i = 0; i < 16; i++) {
      tone(ctx, master, 120, s0 + i * B, 0.12, 'sine', i % 2 ? 0.05 : 0.14, 50); // 쿵
      noise(ctx, master, s0 + i * B + B / 2, 0.05, 0.035, 6000); // 칙
      if (i % 4 === 2) noise(ctx, master, s0 + i * B, 0.12, 0.06, 1500); // 짝
    }
  }
  const end = t0 + fanLen + loops * loopLen + B;
  master.gain.setValueAtTime(0.9, end - 1.2);
  master.gain.exponentialRampToValueAtTime(0.0001, end);
  const timers = [window.setTimeout(() => stopVictoryMusic(true), (end - ctx.currentTime) * 1000 + 200)];
  music = { master, timers, stopAt: end };
}
/** 🔇 우승 음악 끄기 (기본: 0.6초 동안 줄이기) */
export function stopVictoryMusic(immediate = false) {
  if (!music) return;
  const ctx = getAudioContext();
  const m = music;
  music = null;
  m.timers.forEach(clearTimeout);
  try {
    if (ctx) {
      const t = ctx.currentTime;
      m.master.gain.cancelScheduledValues(t);
      m.master.gain.setValueAtTime(Math.max(0.0001, m.master.gain.value), t);
      m.master.gain.exponentialRampToValueAtTime(0.0001, t + (immediate ? 0.05 : 0.6));
      window.setTimeout(() => m.master.disconnect(), immediate ? 120 : 700);
    } else m.master.disconnect();
  } catch {}
}

/** ⏰ 남은 시간 알림 (게임 소리 끄기와 상관없이): 60초 = 딩동 2번, 30초 = 더 급한 3번 */
export function playTimeWarning(sec: number) {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  const t = ctx.currentTime;
  const seq = sec <= 30 ? [N.A5, N.E5, N.A5, N.E5, N.A5, N.C6] : [N.G5, N.E5, N.G5, N.E5];
  const gap = sec <= 30 ? 0.16 : 0.24;
  seq.forEach((f, i) => {
    tone(ctx, ctx.destination, f, t + i * gap, gap * 1.6, 'triangle', 0.16);
    tone(ctx, ctx.destination, f * 2, t + i * gap, gap * 0.9, 'sine', 0.04);
  });
}
/** ⏱ 마지막 5초 째깍 */
export function playTimeTick(left: number) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  tone(ctx, ctx.destination, left <= 1 ? 1320 : 990, t, 0.09, 'square', 0.06);
}

// ── 🎰 대진표 뽑는 동안 배경음 (두근두근 북 + 베이스 반복) ──
let drawLoop: { master: GainNode; timer: number } | null = null;
export function startDrawMusic() {
  const ctx = ready();
  if (!ctx || drawLoop) return;
  const master = ctx.createGain();
  master.gain.value = 0.0001;
  master.connect(ctx.destination);
  master.gain.exponentialRampToValueAtTime(0.9, ctx.currentTime + 0.6);
  const beat = 60 / 140;
  let next = ctx.currentTime + 0.05;
  let n = 0;
  const bass = [N.C4, N.C4, N.A3, N.A3, N.F4 / 2, N.F4 / 2, N.G3, N.G3];
  const sched = () => {
    while (next < ctx.currentTime + 0.6) {
      const i = n % 16;
      // 쿵 · 짝 · 칙칙
      if (i % 4 === 0) tone(ctx, master, 120, next, 0.18, 'sine', 0.22, 50);
      if (i % 4 === 2) noise(ctx, master, next, 0.09, 0.06, 1800);
      noise(ctx, master, next + beat / 4, 0.03, 0.025, 7000);
      if (i % 2 === 0) tone(ctx, master, bass[(n >> 1) % 8], next, beat * 0.9, 'triangle', 0.09);
      // 위로 올라가는 두근두근 신호
      if (i % 8 === 7) tone(ctx, master, N.E5 + (n % 32 > 15 ? 120 : 0), next, 0.12, 'square', 0.025);
      next += beat / 2;
      n++;
    }
  };
  sched();
  drawLoop = { master, timer: window.setInterval(sched, 200) };
}
export function stopDrawMusic() {
  if (!drawLoop) return;
  const ctx = getAudioContext();
  const d = drawLoop;
  drawLoop = null;
  clearInterval(d.timer);
  try {
    if (ctx) {
      d.master.gain.cancelScheduledValues(ctx.currentTime);
      d.master.gain.setValueAtTime(Math.max(0.0001, d.master.gain.value), ctx.currentTime);
      d.master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    }
    window.setTimeout(() => d.master.disconnect(), 700);
  } catch {}
}
/** 🎯 한 팀이 자리에 들어갈 때 '띵!' */
export function playDrawPlace(i = 0) {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime + 0.01;
  const f = [N.C5, N.E5, N.G5, N.C6][i % 4];
  tone(ctx, ctx.destination, f, t, 0.22, 'triangle', 0.14);
  tone(ctx, ctx.destination, f * 2, t, 0.12, 'sine', 0.05);
}
/** ⬆️ 다음 라운드 진출: 올라가는 아르페지오 + 반짝 (결승에 가까울수록 높고 길게) */
export function playAdvance(level = 0) {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime + 0.02;
  const up = Math.pow(2, Math.min(4, level) * (2 / 12));
  const notes = [N.C5, N.E5, N.G5, N.C6, N.E6].slice(0, 3 + Math.min(2, level));
  notes.forEach((f, i) => {
    tone(ctx, ctx.destination, f * up, t + i * 0.065, 0.2, 'square', 0.045);
    tone(ctx, ctx.destination, f * up, t + i * 0.065, 0.26, 'triangle', 0.1);
  });
  const end = t + notes.length * 0.065;
  tone(ctx, ctx.destination, 300 * up, t, notes.length * 0.065 + 0.1, 'sawtooth', 0.025, 1200 * up);
  noise(ctx, ctx.destination, end, 0.35, 0.05, 5000);
  tone(ctx, ctx.destination, N.G6 * up * 0.5, end, 0.5, 'sine', 0.06);
}
/** 🏆 결승전 시작: 북 롤 + 팡파르 */
export function playFinalStart() {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime + 0.02;
  for (let i = 0; i < 14; i++) noise(ctx, ctx.destination, t + i * 0.05, 0.06, 0.04 + i * 0.004, 900);
  const s = t + 0.75;
  [
    [N.G4, 0, 0.14],
    [N.G4, 0.15, 0.14],
    [N.G4, 0.3, 0.14],
    [N.C5, 0.45, 0.5],
    [N.E5, 0.95, 0.2],
    [N.G5, 1.15, 0.7],
  ].forEach(([f, o, d]) => {
    tone(ctx, ctx.destination, f, s + o, d, 'square', 0.06);
    tone(ctx, ctx.destination, f, s + o, d + 0.05, 'triangle', 0.12);
  });
  tone(ctx, ctx.destination, 90, s + 1.15, 0.6, 'sine', 0.25, 45);
  noise(ctx, ctx.destination, s + 1.15, 0.8, 0.07, 3000);
}
/** 👑 결승 승리 순간: 심벌 + 큰 화음 */
export function playFinalWin() {
  const ctx = ready();
  if (!ctx) return;
  const t = ctx.currentTime + 0.02;
  [N.C5, N.E5, N.G5, N.C6].forEach((f) => {
    tone(ctx, ctx.destination, f, t, 1.4, 'triangle', 0.09);
    tone(ctx, ctx.destination, f / 2, t, 1.2, 'sine', 0.06);
  });
  noise(ctx, ctx.destination, t, 1.2, 0.09, 4500);
  tone(ctx, ctx.destination, 80, t, 0.5, 'sine', 0.3, 40);
}
