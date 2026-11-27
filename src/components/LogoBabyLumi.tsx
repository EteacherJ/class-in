import React, { useEffect, useRef, useState } from 'react';
import { isMotionPaused } from '../utils/motion';
import { useMochiTint } from './MochiCharacter';

/**
 * ============================================================================
 * 🐣 로고 위 아기 루미 (Class in 워드마크 장식)
 * ============================================================================
 * 루미의 아기 버전(머리에 새싹, 동글동글한 몸, 큰 눈)이 로고 위에서 짧은 장면을 번갈아 보여 줍니다.
 *   ① 칠판   : 폴짝폴짝 뛰어나와 칠판을 지시봉으로 가리키고 만세!
 *   ② 춤     : 위에서 통통 떨어져 착지한 뒤 음표와 함께 살랑살랑 춤
 *   ③ 빼꼼   : "in" 뒤에서 빼꼼 몸을 내밀고 "Hi!" 손 인사
 *   ④ 낮잠   : 폴짝 와서 하품하고 꾸벅꾸벅 Zzz… 깜짝 깨서 도망
 * - 장면 순서는 매번 섞이고, 장면 사이에는 잠깐 쉽니다.
 * - 몸 색은 루미 색(우유·딸기·복숭아…)을 그대로 따라갑니다.
 * - 아무 조작이 없을 때(절전)나 창이 숨겨지면 다음 장면으로 넘어가지 않고, '동작 줄이기'가 켜져 있으면 나타나지 않습니다.
 */

type Pose =
  | 'idle'
  | 'hop'
  | 'point'
  | 'cheer'
  | 'fall'
  | 'land'
  | 'dance'
  | 'bow'
  | 'jump'
  | 'peek'
  | 'look'
  | 'hi'
  | 'hide'
  | 'yawn'
  | 'nap'
  | 'wake';

interface Phase {
  pose: Pose;
  /** 로고 너비 대비 가로 위치 (0~1, 밖은 화면 밖) */
  x: number;
  /** 세로 위치(px, 위가 음수) */
  y: number;
  ms: number;
  vis: boolean;
  facing?: 1 | -1;
  ease?: string;
  /** 위치 이동 없이 순간 이동 */
  instant?: boolean;
  /** 로고 윗선 아래는 가림 (빼꼼 장면) */
  clip?: boolean;
}

type SceneId = 'board' | 'dance' | 'peek' | 'nap';
const SCENE_IDS: SceneId[] = ['board', 'dance', 'peek', 'nap'];
const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

const buildScene = (id: SceneId, inX: number): Phase[] => {
  switch (id) {
    case 'board':
      return [
        { pose: 'idle', x: -0.14, y: 0, ms: 60, vis: false, instant: true },
        { pose: 'hop', x: 0.1, y: 0, ms: 1800, vis: true },
        { pose: 'point', x: 0.1, y: 0, ms: 3800, vis: true },
        { pose: 'cheer', x: 0.1, y: 0, ms: 1100, vis: true },
        { pose: 'hop', x: -0.16, y: 0, ms: 1700, vis: false, facing: -1 },
      ];
    case 'dance':
      return [
        { pose: 'fall', x: 0.4, y: -46, ms: 60, vis: false, instant: true },
        { pose: 'fall', x: 0.4, y: 0, ms: 620, vis: true, ease: 'cubic-bezier(0.55, 0, 0.9, 0.4)' },
        { pose: 'land', x: 0.4, y: 0, ms: 420, vis: true },
        { pose: 'dance', x: 0.4, y: 0, ms: 4200, vis: true },
        { pose: 'bow', x: 0.4, y: 0, ms: 900, vis: true },
        { pose: 'jump', x: 0.4, y: -50, ms: 650, vis: false, ease: 'cubic-bezier(0.2, 0.7, 0.4, 1)' },
      ];
    case 'peek':
      return [
        { pose: 'hide', x: inX, y: 40, ms: 60, vis: true, instant: true, clip: true },
        { pose: 'peek', x: inX, y: 9, ms: 750, vis: true, clip: true, ease: SPRING },
        { pose: 'look', x: inX, y: 9, ms: 1300, vis: true, clip: true },
        { pose: 'hi', x: inX, y: 0, ms: 450, vis: true, clip: true, ease: SPRING },
        { pose: 'hi', x: inX, y: 0, ms: 2400, vis: true, clip: true },
        { pose: 'hide', x: inX, y: 40, ms: 520, vis: true, clip: true, ease: 'ease-in' },
      ];
    case 'nap':
      return [
        { pose: 'idle', x: -0.14, y: 0, ms: 60, vis: false, instant: true },
        { pose: 'hop', x: 0.28, y: 0, ms: 1500, vis: true },
        { pose: 'yawn', x: 0.28, y: 0, ms: 1200, vis: true },
        { pose: 'nap', x: 0.28, y: 0, ms: 3600, vis: true },
        { pose: 'wake', x: 0.28, y: 0, ms: 900, vis: true },
        { pose: 'hop', x: 1.1, y: 0, ms: 2100, vis: false },
      ];
  }
};

const H = 36; // 캐릭터 영역 높이(px)
const W = (H * 100) / 60; // SVG 비율 100:60
const CHAR_X = (22 / 100) * W; // SVG 안 아기 루미 중심
const REST_MS = 5200;

/** 장면 순서를 섞되 같은 장면이 연달아 나오지 않게 */
const shuffled = (last?: SceneId): SceneId[] => {
  const a = [...SCENE_IDS];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  if (a[0] === last) [a[0], a[1]] = [a[1], a[0]];
  return a;
};

export const LogoBabyLumi: React.FC = () => {
  const stageRef = useRef<HTMLSpanElement | null>(null);
  const [width, setWidth] = useState(0);
  const [inX, setInX] = useState(0.8);
  const [reduced, setReduced] = useState(false);
  const queue = useRef<SceneId[]>(['board', 'peek', 'dance', 'nap']);
  const [scene, setScene] = useState<{ id: SceneId; phases: Phase[] } | null>(null);
  const [idx, setIdx] = useState(0);
  const [tick, setTick] = useState(0);
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    setReduced(!!mq?.matches);
    const on = () => setReduced(!!mq?.matches);
    mq?.addEventListener?.('change', on);
    return () => mq?.removeEventListener?.('change', on);
  }, []);

  // 로고 너비 · "in" 위치 측정
  useEffect(() => {
    const wrap = stageRef.current?.parentElement;
    if (!wrap) return;
    const measure = () => {
      const wr = wrap.getBoundingClientRect();
      setWidth(wr.width);
      const pill = wrap.querySelector('.ci-wordmark-in') as HTMLElement | null;
      if (pill && wr.width > 0) {
        const pr = pill.getBoundingClientRect();
        setInX((pr.left + pr.width / 2 - wr.left) / wr.width);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // 눈 깜빡임
  useEffect(() => {
    if (reduced) return;
    const t = window.setInterval(() => {
      if (isMotionPaused()) return;
      setBlink(true);
      window.setTimeout(() => setBlink(false), 150);
    }, 3200);
    return () => clearInterval(t);
  }, [reduced]);

  // 장면 진행 (장면 → 쉬는 시간 → 다음 장면). 절전 중에는 다음 단계로 넘어가지 않고 대기
  const started = useRef(false);
  useEffect(() => {
    if (reduced || width <= 0) return;
    const delay = scene ? scene.phases[idx].ms : started.current ? REST_MS : 1400;
    const t = window.setTimeout(() => {
      if (isMotionPaused()) return setTick((n) => n + 1);
      if (scene) {
        if (idx < scene.phases.length - 1) setIdx(idx + 1);
        else {
          setScene(null);
          setIdx(0);
        }
        return;
      }
      started.current = true;
      if (queue.current.length === 0) queue.current = shuffled(undefined);
      const id = queue.current.shift()!;
      if (queue.current.length === 0) queue.current = shuffled(id);
      setScene({ id, phases: buildScene(id, inX) });
      setIdx(0);
    }, delay);
    return () => clearTimeout(t);
  }, [scene, idx, width, reduced, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  if (reduced) return null;

  const ph: Phase = scene ? scene.phases[idx] : { pose: 'idle', x: -0.14, y: 0, ms: 0, vis: false, instant: true };
  const x = ph.x * width - CHAR_X;
  const ease = ph.ease || (ph.pose === 'hop' ? 'linear' : 'ease');
  const transition = ph.instant ? 'none' : `transform ${ph.ms}ms ${ease}, opacity ${ph.vis ? 300 : ph.ms}ms ease-in`;

  return (
    <span ref={stageRef} className={`bl-stage ${ph.clip ? 'is-clip' : ''}`} aria-hidden>
      <span
        className="bl-actor"
        style={{ width: W, height: H, transform: `translate3d(${x}px, ${ph.y}px, 0)`, transition, opacity: ph.vis ? 1 : 0 }}
      >
        <BabyLumiSvg pose={ph.pose} facing={ph.facing || 1} blink={blink} />
      </span>
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 아기 루미 그림
// ─────────────────────────────────────────────────────────────────────────────
type Face = 'normal' | 'happy' | 'excited' | 'surprised' | 'sleepy' | 'yawn';
const FACE: Record<Pose, Face> = {
  idle: 'normal',
  hop: 'happy',
  point: 'excited',
  cheer: 'happy',
  fall: 'surprised',
  land: 'happy',
  dance: 'happy',
  bow: 'happy',
  jump: 'excited',
  peek: 'normal',
  look: 'normal',
  hi: 'excited',
  hide: 'normal',
  yawn: 'yawn',
  nap: 'sleepy',
  wake: 'surprised',
};

const INK = '#3B2F3A';

const BabyFace: React.FC<{ face: Face; blink: boolean }> = ({ face, blink }) => {
  const L = 15;
  const R = 29;
  const Y = 43.5;
  const line = { stroke: INK, strokeWidth: 1.6, strokeLinecap: 'round' as const, fill: 'none' };
  let eyes: React.ReactNode;
  let mouth: React.ReactNode;

  const dot = (cx: number) => (
    <g key={cx}>
      <ellipse cx={cx} cy={Y} rx={3} ry={3.6} fill={INK} />
      <circle cx={cx + 1} cy={Y - 1.4} r={1.15} fill="#fff" />
      <circle cx={cx - 0.9} cy={Y + 1.3} r={0.5} fill="#fff" opacity={0.85} />
    </g>
  );
  const smile = (cx: number) => <path key={cx} d={`M${cx - 2.8} ${Y + 0.8} Q${cx} ${Y - 2.6} ${cx + 2.8} ${Y + 0.8}`} {...line} />;
  const shut = (cx: number) => <path key={cx} d={`M${cx - 2.8} ${Y} Q${cx} ${Y + 2} ${cx + 2.8} ${Y}`} {...line} />;

  switch (face) {
    case 'happy':
      eyes = [L, R].map(smile);
      mouth = <path d="M19.6 48.2 Q22 51.6 24.4 48.2 Z" fill="#7A2E43" />;
      break;
    case 'excited':
      eyes = [L, R].map((cx) => (
        <path
          key={cx}
          d={`M${cx} ${Y - 4} Q${cx + 0.7} ${Y - 0.7} ${cx + 4} ${Y} Q${cx + 0.7} ${Y + 0.7} ${cx} ${Y + 4} Q${cx - 0.7} ${Y + 0.7} ${cx - 4} ${Y} Q${cx - 0.7} ${Y - 0.7} ${cx} ${Y - 4} Z`}
          fill="#FFC53D"
          stroke={INK}
          strokeWidth={0.9}
        />
      ));
      mouth = <path d="M19.4 48 Q22 52.2 24.6 48 Z" fill="#7A2E43" />;
      break;
    case 'surprised':
      eyes = [L, R].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={Y} r={3.2} fill="#fff" stroke={INK} strokeWidth={1.4} />
          <circle cx={cx} cy={Y} r={1.4} fill={INK} />
        </g>
      ));
      mouth = <ellipse cx={22} cy={49.4} rx={1.6} ry={2} fill="#7A2E43" />;
      break;
    case 'sleepy':
      eyes = [L, R].map(shut);
      mouth = <ellipse cx={22} cy={49} rx={1.1} ry={0.9} fill="#7A2E43" />;
      break;
    case 'yawn':
      eyes = [L, R].map(shut);
      mouth = <ellipse cx={22} cy={49.6} rx={2.2} ry={2.8} fill="#7A2E43" className="bl-yawn-mouth" />;
      break;
    default:
      eyes = blink ? [L, R].map(shut) : [L, R].map(dot);
      mouth = <path d="M20 48.4 Q21 49.8 22 48.6 Q23 49.8 24 48.4" {...line} strokeWidth={1.2} />;
  }
  return (
    <g className="bl-face">
      {eyes}
      {mouth}
    </g>
  );
};

const BabyLumiSvg: React.FC<{ pose: Pose; facing: 1 | -1; blink: boolean }> = ({ pose, facing, blink }) => {
  const [tint] = useMochiTint();
  const face = FACE[pose];
  return (
    <svg
      viewBox="0 0 100 60"
      className={`bl-svg bl-pose-${pose}`}
      style={{ transform: `scaleX(${facing})`, transformOrigin: '22% 50%' }}
    >
      <defs>
        <radialGradient id="bl-body-grad" cx="38%" cy="30%" r="80%">
          <stop offset="0%" stopColor={tint.light} />
          <stop offset="60%" stopColor={tint.light} />
          <stop offset="100%" stopColor={tint.dark} />
        </radialGradient>
      </defs>

      {/* ① 칠판 */}
      <g className="bl-board">
        <line x1="60" y1="44" x2="57" y2="58" className="bl-wood" />
        <line x1="88" y1="44" x2="91" y2="58" className="bl-wood" />
        <rect x="53" y="10" width="42" height="34" rx="3" fill="#2F5D50" stroke="#C58B52" strokeWidth="2.4" />
        <text x="74" y="24" textAnchor="middle" className="bl-chalk">1+1</text>
        <text x="74" y="37" textAnchor="middle" className="bl-chalk bl-chalk-ans">=2</text>
        <path d="M88 14 l1 2.2 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3z" fill="#FFE27A" className="bl-chalk-star" />
      </g>

      {/* 반짝이 · 음표 · Zzz · 말풍선 · 느낌표 */}
      <g className="bl-fx bl-stars">
        <path d="M4 20 l1.3 3 3 .4-2.3 2 .6 3-2.6-1.6-2.6 1.6.6-3-2.3-2 3-.4z" fill="#FFC53D" />
        <path d="M40 12 l1 2.3 2.4.3-1.8 1.6.5 2.4-2.1-1.3-2.1 1.3.5-2.4-1.8-1.6 2.4-.3z" fill="#FF8FB0" />
        <path d="M24 4 l.9 2 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z" fill="#7DD3FC" />
      </g>
      <g className="bl-fx bl-notes">
        <text x="42" y="22" className="bl-note">♪</text>
        <text x="-2" y="18" className="bl-note bl-note-2">♫</text>
        <text x="46" y="8" className="bl-note bl-note-3">♪</text>
      </g>
      <g className="bl-fx bl-zzz">
        <text x="36" y="24" className="bl-z">z</text>
        <text x="42" y="16" className="bl-z bl-z-2">z</text>
        <text x="49" y="7" className="bl-z bl-z-3">Z</text>
      </g>
      <g className="bl-fx bl-bubble">
        <path d="M44 4 h22 a5 5 0 0 1 5 5 v6 a5 5 0 0 1 -5 5 h-15 l-5 4 1-4 h-3 a5 5 0 0 1 -5 -5 v-6 a5 5 0 0 1 5 -5z" fill="#fff" stroke="#8B5CF6" strokeWidth="1.4" />
        <text x="55.5" y="15.6" textAnchor="middle" className="bl-hi">Hi!</text>
      </g>
      <g className="bl-fx bl-bang">
        <text x="38" y="26" className="bl-bang-t">!</text>
      </g>

      {/* 아기 루미 */}
      <g className="bl-char">
        {/* 바닥 그림자 */}
        <ellipse cx="22" cy="58.6" rx="13" ry="1.6" fill="#1e1b4b" opacity="0.13" className="bl-shadow" />
        {/* 발 */}
        <ellipse cx="15.5" cy="56.6" rx="4.4" ry="2.4" fill={tint.dark} stroke="rgba(70,60,100,0.5)" strokeWidth="0.9" className="bl-foot bl-foot-l" />
        <ellipse cx="28.5" cy="56.6" rx="4.4" ry="2.4" fill={tint.dark} stroke="rgba(70,60,100,0.5)" strokeWidth="0.9" className="bl-foot bl-foot-r" />

        <g className="bl-bodygroup">
          {/* 새싹 */}
          <g className="bl-sprout">
            <path d="M22 26 Q21.4 21 22.6 17.6" stroke="#4C9A5B" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M22.4 19 C18 14.6 13.2 15.6 13.6 19.4 C17 21 20.4 20.6 22.4 19 Z" fill="#8EDB8F" stroke="#4C9A5B" strokeWidth="0.9" />
            <path d="M22.6 18.4 C25.6 12.8 31.4 12.6 31.6 16.8 C28.6 19.6 25 19.8 22.6 18.4 Z" fill="#A6E8A0" stroke="#4C9A5B" strokeWidth="0.9" />
          </g>
          {/* 동글동글 몸 */}
          <path
            d="M22 24.5 C34.5 24.5 41 34 41 44.5 C41 53.5 33.5 57 22 57 C10.5 57 3 53.5 3 44.5 C3 34 9.5 24.5 22 24.5 Z"
            fill="url(#bl-body-grad)"
            stroke="rgba(70,60,100,0.55)"
            strokeWidth="1.3"
          />
          {/* 윤기 */}
          <ellipse cx="13.5" cy="31.5" rx="5" ry="2.6" fill="#fff" opacity="0.9" transform="rotate(-28 13.5 31.5)" />
          <circle cx="19.5" cy="28.6" r="1" fill="#fff" opacity="0.9" />
          {/* 볼터치 */}
          <ellipse cx="9.6" cy="48.4" rx="3.3" ry="2" fill={tint.blush} opacity="0.7" />
          <ellipse cx="34.4" cy="48.4" rx="3.3" ry="2" fill={tint.blush} opacity="0.7" />
          <BabyFace face={face} blink={blink} />
        </g>

        {/* 손 (몸에 붙은 동그라미) */}
        <g className="bl-hand bl-hand-l">
          <ellipse cx="4.4" cy="47.6" rx="3.2" ry="2.7" fill={tint.light} stroke="rgba(70,60,100,0.55)" strokeWidth="1" />
        </g>
        <g className="bl-hand bl-hand-r">
          {/* 지시봉 (칠판 장면) */}
          <g className="bl-pointer">
            <line x1="40" y1="47.6" x2="55" y2="47.6" stroke="#C58B52" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M56.5 44.6 l.9 2 2.2.3-1.6 1.5.4 2.2-1.9-1-1.9 1 .4-2.2-1.6-1.5 2.2-.3z" fill="#FFC53D" stroke="#E0A100" strokeWidth="0.5" />
          </g>
          <ellipse cx="39.6" cy="47.6" rx="3.2" ry="2.7" fill={tint.light} stroke="rgba(70,60,100,0.55)" strokeWidth="1" />
        </g>
      </g>
    </svg>
  );
};

export default LogoBabyLumi;
