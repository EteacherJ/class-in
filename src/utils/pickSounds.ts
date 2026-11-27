/**
 * 🎲 뽑기 방법마다 다른 효과음 (파일 없이 Web Audio 로 합성)
 *  🎡 룰렛   : 딱딱 걸리는 돌림판 소리 → 띵띵띵! 종소리
 *  🐣 알 깨기 : 달그락 흔들림 → 빠직! 껍질 깨짐 → 삐약삐약
 *  🃏 카드    : 촤라락 섞기 → 휙 뒤집기 → 반짝 마법 소리
 *  🏁 사다리  : 통통 내려가는 발걸음(실로폰) → 빰빠밤 팡파르
 *  🎯 짝 뽑기 : 왼쪽·오른쪽 번갈아 뿅뿅 → 짝! 하이파이브 + 화음
 *  🧮 조건    : 삐빅 스캐너 → 딩동 확인
 *  ⏱ 연속    : 한 명 뽑힐 때마다 한 음씩 올라감 → 마지막 짧은 팡파르
 *  🎲 주사위  : 데구르르 굴러가는 소리 → 쿵! 착지 → 신나는 짧은 멜로디
 */
import { getAudioContext } from './audio';
import type { PickMethod } from '../components/picker/PickerModes';

export type PickSfx = 'tick' | 'open' | 'step' | 'pop' | 'land' | 'cut' | 'shuffle' | 'win';

type Tone = { f: number; f2?: number; t: number; d: number; type?: OscillatorType; v: number; pan?: number };

function out(ctx: AudioContext, vol: number) {
  const m = ctx.createGain();
  m.gain.value = Math.max(0, Math.min(1, vol));
  m.connect(ctx.destination);
  return m;
}
function tone(ctx: AudioContext, dest: AudioNode, o: Tone) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(o.f, o.t);
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, o.t + o.d * 0.9);
  g.gain.setValueAtTime(0.0001, o.t);
  g.gain.exponentialRampToValueAtTime(o.v, o.t + Math.min(0.012, o.d / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, o.t + o.d);
  let node: AudioNode = g;
  if (o.pan != null && ctx.createStereoPanner) {
    const p = ctx.createStereoPanner();
    p.pan.value = o.pan;
    g.connect(p);
    node = p;
  }
  osc.connect(g);
  node.connect(dest);
  osc.start(o.t);
  osc.stop(o.t + o.d + 0.03);
}
let nb: AudioBuffer | null = null;
function noise(ctx: AudioContext, dest: AudioNode, t: number, d: number, v: number, type: BiquadFilterType, freq: number, q = 1, freq2?: number) {
  if (!nb || nb.sampleRate !== ctx.sampleRate) {
    const len = Math.floor(ctx.sampleRate * 1);
    nb = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = nb.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = nb;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (freq2) f.frequency.exponentialRampToValueAtTime(freq2, t + d);
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  src.connect(f).connect(g).connect(dest);
  src.start(t, Math.random() * 0.5);
  src.stop(t + d + 0.02);
}
const N = { C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, D6: 1174.66, E6: 1318.5, G6: 1568, C7: 2093 };
const STEP_SCALE = [N.C5, N.D5, N.E5, N.G5, N.A5, N.C6, N.D6, N.E6, N.G6, N.C7];
let altPan = 1;

/**
 * @param p 진행 정도(0~1) 또는 연속 뽑기의 순서(step)
 */
export function playPickSfx(method: PickMethod, ev: PickSfx, p = 0, volume = 0.7) {
  if (volume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const m = out(ctx, volume);
    const t = ctx.currentTime + 0.02;
    const k = Math.max(0, Math.min(1, p));
    switch (method) {
      // ── 🎡 룰렛 ──
      case 'roulette':
        if (ev === 'tick') {
          noise(ctx, m, t, 0.035, 0.5, 'bandpass', 2600 - k * 900, 3);
          tone(ctx, m, { f: 420 - k * 120, t, d: 0.04, type: 'triangle', v: 0.22 });
        } else if (ev === 'win') {
          [N.G5, N.C6, N.E6, N.G6].forEach((f, i) => {
            tone(ctx, m, { f, t: t + i * 0.11, d: 0.9, type: 'sine', v: 0.22 });
            tone(ctx, m, { f: f * 2.01, t: t + i * 0.11, d: 0.5, type: 'sine', v: 0.05 });
          });
          noise(ctx, m, t + 0.44, 0.6, 0.12, 'highpass', 6000);
        }
        break;
      // ── 🐣 알 깨기 ──
      case 'egg':
        if (ev === 'tick') {
          // 달그락 (껍질이 흔들리는 나무 소리)
          tone(ctx, m, { f: 300 + Math.random() * 180 + k * 200, t, d: 0.06, type: 'triangle', v: 0.28 });
          noise(ctx, m, t, 0.04, 0.2, 'bandpass', 1500 + k * 800, 2);
        } else if (ev === 'open') {
          // 빠직! (껍질 깨지는 소리 3번)
          [0, 0.06, 0.13].forEach((d, i) => noise(ctx, m, t + d, 0.09, 0.55 - i * 0.12, 'highpass', 2200 + i * 900, 0.7));
          tone(ctx, m, { f: 180, f2: 90, t, d: 0.12, type: 'sine', v: 0.25 });
        } else if (ev === 'win') {
          // 삐약 삐약
          [0, 0.22, 0.5].forEach((d) => {
            tone(ctx, m, { f: 2200, f2: 3300, t: t + d, d: 0.09, type: 'sine', v: 0.2 });
            tone(ctx, m, { f: 3000, f2: 2400, t: t + d + 0.09, d: 0.07, type: 'sine', v: 0.14 });
          });
        }
        break;
      // ── 🃏 카드 ──
      case 'card':
        if (ev === 'shuffle') {
          for (let i = 0; i < 7; i++) noise(ctx, m, t + i * 0.045, 0.05, 0.22, 'bandpass', 3500 + Math.random() * 1500, 1.5);
        } else if (ev === 'tick') {
          noise(ctx, m, t, 0.05, 0.18, 'bandpass', 3000 + k * 1500, 1.2);
        } else if (ev === 'open') {
          // 휙 (뒤집기)
          noise(ctx, m, t, 0.18, 0.35, 'bandpass', 900, 1.2, 5000);
          tone(ctx, m, { f: 600, f2: 1200, t: t + 0.12, d: 0.08, type: 'sine', v: 0.15 });
        } else if (ev === 'win') {
          // 반짝 마법
          [N.E6, N.G6, N.C7, N.G6, N.C7].forEach((f, i) => tone(ctx, m, { f, t: t + i * 0.06, d: 0.5, type: 'sine', v: 0.12 }));
          tone(ctx, m, { f: N.C5, t, d: 1.0, type: 'triangle', v: 0.12 });
          noise(ctx, m, t, 0.9, 0.08, 'highpass', 7000);
        }
        break;
      // ── 🏁 사다리 ──
      case 'ladder':
        if (ev === 'tick') {
          // 통통 실로폰 발걸음
          const f = STEP_SCALE[Math.floor(Math.random() * 6)];
          tone(ctx, m, { f, t, d: 0.16, type: 'sine', v: 0.22 });
          tone(ctx, m, { f: f * 4, t, d: 0.04, type: 'sine', v: 0.05 });
        } else if (ev === 'win') {
          // 빰빠밤!
          const brass = ctx.createBiquadFilter();
          brass.type = 'lowpass';
          brass.frequency.value = 2600;
          brass.connect(m);
          ([[N.G5, 0, 0.12], [N.G5, 0.14, 0.12], [N.G5, 0.28, 0.12], [N.C6, 0.42, 0.6]] as [number, number, number][]).forEach(([f, d, l]) => {
            tone(ctx, brass, { f, t: t + d, d: l, type: 'sawtooth', v: 0.12 });
            tone(ctx, m, { f: f / 2, t: t + d, d: l, type: 'triangle', v: 0.1 });
          });
          noise(ctx, m, t + 0.42, 0.5, 0.1, 'highpass', 4000);
        }
        break;
      // ── 🎯 짝 뽑기 ──
      case 'pair':
        if (ev === 'tick') {
          altPan = -altPan;
          tone(ctx, m, { f: altPan > 0 ? 880 + k * 300 : 660 + k * 300, t, d: 0.05, type: 'square', v: 0.07, pan: altPan * 0.7 });
        } else if (ev === 'pop') {
          tone(ctx, m, { f: 500 + k * 600, f2: 900 + k * 600, t, d: 0.08, type: 'sine', v: 0.22 });
        } else if (ev === 'win') {
          // 짝! (박수) + 두 음 화음
          noise(ctx, m, t, 0.08, 0.6, 'bandpass', 1400, 0.8);
          noise(ctx, m, t + 0.012, 0.06, 0.35, 'bandpass', 2400, 0.8);
          tone(ctx, m, { f: N.E5, t: t + 0.08, d: 0.8, type: 'triangle', v: 0.18, pan: -0.5 });
          tone(ctx, m, { f: N.C6, t: t + 0.08, d: 0.8, type: 'triangle', v: 0.18, pan: 0.5 });
          tone(ctx, m, { f: N.G5, t: t + 0.2, d: 0.7, type: 'sine', v: 0.14 });
        }
        break;
      // ── 🧮 조건 ──
      case 'cond':
        if (ev === 'tick') {
          tone(ctx, m, { f: 1200 + Math.random() * 600, t, d: 0.03, type: 'square', v: 0.06 });
        } else if (ev === 'pop') {
          tone(ctx, m, { f: 1320, t, d: 0.06, type: 'square', v: 0.08 });
          tone(ctx, m, { f: 1760, t: t + 0.07, d: 0.1, type: 'square', v: 0.08 });
        } else if (ev === 'win') {
          // 딩동 확인
          tone(ctx, m, { f: N.E6, t, d: 0.5, type: 'sine', v: 0.25 });
          tone(ctx, m, { f: N.C6, t: t + 0.22, d: 0.8, type: 'sine', v: 0.25 });
        }
        break;
      // ── ⏱ 연속 ──
      case 'multi':
        if (ev === 'tick') {
          tone(ctx, m, { f: 700 + k * 500, t, d: 0.035, type: 'triangle', v: 0.14 });
        } else if (ev === 'step') {
          const f = STEP_SCALE[Math.min(STEP_SCALE.length - 1, Math.round(p))];
          tone(ctx, m, { f, t, d: 0.35, type: 'triangle', v: 0.25 });
          tone(ctx, m, { f: f * 2, t, d: 0.15, type: 'sine', v: 0.06 });
        } else if (ev === 'win') {
          [N.C6, N.E6, N.G6].forEach((f, i) => tone(ctx, m, { f, t: t + i * 0.09, d: 0.6, type: 'triangle', v: 0.16 }));
          tone(ctx, m, { f: N.C7, t: t + 0.3, d: 0.8, type: 'sine', v: 0.14 });
        }
        break;
      // ── 🎲 주사위 ──
      case 'dice':
        if (ev === 'tick') {
          // 데구르르 (나무 주사위가 부딪히는 소리 2~3번)
          const n = 2 + Math.floor(Math.random() * 2);
          for (let i = 0; i < n; i++) {
            const d = i * (0.02 + Math.random() * 0.03);
            noise(ctx, m, t + d, 0.03, 0.4, 'bandpass', 2400 + Math.random() * 1600, 4);
            tone(ctx, m, { f: 700 + Math.random() * 500, t: t + d, d: 0.025, type: 'triangle', v: 0.1 });
          }
        } else if (ev === 'land') {
          tone(ctx, m, { f: 140, f2: 60, t, d: 0.2, type: 'sine', v: 0.5 });
          noise(ctx, m, t, 0.05, 0.5, 'bandpass', 1800, 3);
          noise(ctx, m, t + 0.09, 0.04, 0.25, 'bandpass', 2600, 3);
        } else if (ev === 'win') {
          [N.C6, N.G5, N.C6, N.E6, N.G6].forEach((f, i) => tone(ctx, m, { f, t: t + i * 0.1, d: 0.22, type: 'square', v: 0.06 }));
          tone(ctx, m, { f: N.C7, t: t + 0.5, d: 0.6, type: 'sine', v: 0.14 });
        }
        break;
      // ── 🎁 가챠 ──
      case 'gacha':
        if (ev === 'pop') {
          // 동전 짤랑
          [2600, 3400, 2900].forEach((f, i) => tone(ctx, m, { f, t: t + i * 0.07, d: 0.18, type: 'sine', v: 0.16 }));
          noise(ctx, m, t + 0.22, 0.05, 0.3, 'bandpass', 3000, 5);
        } else if (ev === 'tick') {
          // 레버 딸깍 / 캡슐 달그락
          noise(ctx, m, t, 0.03, 0.45, 'bandpass', 1600 + Math.random() * 1400, 4);
          tone(ctx, m, { f: 500 + Math.random() * 300, t, d: 0.03, type: 'square', v: 0.05 });
        } else if (ev === 'shuffle') {
          for (let i = 0; i < 10; i++) noise(ctx, m, t + i * 0.12, 0.04, 0.25, 'bandpass', 2000 + Math.random() * 2000, 5);
        } else if (ev === 'land') {
          // 또르르 → 쿵
          for (let i = 0; i < 6; i++) tone(ctx, m, { f: 900 - i * 80, t: t + i * 0.09, d: 0.05, type: 'triangle', v: 0.1 });
          tone(ctx, m, { f: 160, f2: 70, t: t + 0.6, d: 0.2, type: 'sine', v: 0.45 });
        } else if (ev === 'open') {
          tone(ctx, m, { f: 300, f2: 1200, t, d: 0.25, type: 'triangle', v: 0.18 });
          noise(ctx, m, t + 0.2, 0.08, 0.35, 'highpass', 3000, 1);
        } else if (ev === 'win') {
          [N.C6, N.E6, N.G6, N.C7].forEach((f, i) => tone(ctx, m, { f, t: t + i * 0.09, d: 0.35, type: 'triangle', v: 0.14 }));
          tone(ctx, m, { f: 2637, t: t + 0.45, d: 0.7, type: 'sine', v: 0.12 });
        }
        break;
    }
    window.setTimeout(() => m.disconnect(), 3000);
  } catch {}
}
