import React, { useId, useSyncExternalStore } from 'react';

/**
 * ============================================================================
 * 🍡 루미 '모찌' 캐릭터 (흰색 찹쌀떡 형태)
 * ============================================================================
 * - 몸 색: 기본 우유색(흰색) → 클릭할 때마다 파스텔 색으로 바뀜 (모든 루미가 같은 색을 공유)
 * - 표정: 기본·기쁨·윙크·진지·졸림·신남·놀람·하트·부끄·뿌듯 (10종)
 * - 눈동자는 마우스를 따라가고, 말할 때는 입이 오물오물 움직입니다.
 */

export type MochiFace =
  | 'normal'
  | 'happy'
  | 'wink'
  | 'serious'
  | 'sleepy'
  | 'excited'
  | 'surprised'
  | 'love'
  | 'shy'
  | 'proud';

export interface MochiTint {
  id: string;
  label: string;
  /** 몸 밝은 쪽 / 어두운 쪽 */
  light: string;
  dark: string;
  /** 볼터치 / 바닥 그림자·후광 */
  blush: string;
  glow: string;
}

export const MOCHI_TINTS: MochiTint[] = [
  { id: 'milk', label: '우유', light: '#FFFFFF', dark: '#EEF0F6', blush: '#FFB3C7', glow: '#C7D2FE' },
  { id: 'strawberry', label: '딸기', light: '#FFF5F8', dark: '#FFD6E2', blush: '#FF8FB0', glow: '#FBCFE8' },
  { id: 'peach', label: '복숭아', light: '#FFF8F1', dark: '#FFDCC4', blush: '#FF9E80', glow: '#FED7AA' },
  { id: 'lemon', label: '레몬', light: '#FFFEF2', dark: '#FFF1A8', blush: '#FFB38A', glow: '#FEF08A' },
  { id: 'matcha', label: '말차', light: '#F7FFF6', dark: '#CFF2D2', blush: '#FFAFBF', glow: '#BBF7D0' },
  { id: 'soda', label: '소다', light: '#F4FCFF', dark: '#C9ECFB', blush: '#FFAFC8', glow: '#BAE6FD' },
  { id: 'lavender', label: '라벤더', light: '#FAF7FF', dark: '#E2D6FF', blush: '#FFA8CF', glow: '#DDD6FE' },
];

// ── 색상 상태 공유 (localStorage 보관 + 모든 루미 동기화) ──
const TINT_KEY = 'lumi_mochi_tint';
const listeners = new Set<() => void>();
let tintIndex = (() => {
  try {
    const i = MOCHI_TINTS.findIndex((t) => t.id === localStorage.getItem(TINT_KEY));
    return i >= 0 ? i : 0;
  } catch {
    return 0;
  }
})();

export function setMochiTint(index: number) {
  tintIndex = ((index % MOCHI_TINTS.length) + MOCHI_TINTS.length) % MOCHI_TINTS.length;
  try {
    localStorage.setItem(TINT_KEY, MOCHI_TINTS[tintIndex].id);
  } catch {}
  listeners.forEach((l) => l());
}
export const cycleMochiTint = () => setMochiTint(tintIndex + 1);
export function useMochiTint(): [MochiTint, number] {
  const i = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => tintIndex,
    () => 0
  );
  return [MOCHI_TINTS[i], i];
}

const INK = '#3B2F3A';

interface MochiBodyProps {
  face: MochiFace;
  tint: MochiTint;
  /** 눈동자 이동량 (viewBox 단위, ±5 정도) */
  eye?: { x: number; y: number };
  blinking?: boolean;
  speaking?: boolean;
  squish?: boolean;
  glow?: 'low' | 'med' | 'high';
  className?: string;
}

/** 표정별 눈 */
const Eyes: React.FC<{ face: MochiFace; blinking?: boolean; blush: string }> = ({ face, blinking, blush }) => {
  const L = 37;
  const R = 63;
  const Y = 55;
  const stroke = { stroke: INK, strokeWidth: 3.2, strokeLinecap: 'round' as const, fill: 'none' };

  const dotEye = (cx: number, big = false) => (
    <g key={cx}>
      <ellipse cx={cx} cy={Y} rx={big ? 5.4 : 4.4} ry={big ? 6.4 : 5.4} fill={INK} />
      <circle cx={cx + 1.6} cy={Y - 2.2} r={big ? 2 : 1.6} fill="#fff" />
      <circle cx={cx - 1.4} cy={Y + 2.2} r={0.8} fill="#fff" opacity={0.8} />
    </g>
  );
  const closedSmile = (cx: number) => <path key={cx} d={`M${cx - 5} ${Y + 1.5} Q${cx} ${Y - 5} ${cx + 5} ${Y + 1.5}`} {...stroke} />;
  const closedDown = (cx: number) => <path key={cx} d={`M${cx - 5} ${Y} Q${cx} ${Y + 3.6} ${cx + 5} ${Y}`} {...stroke} />;

  if (blinking && (face === 'normal' || face === 'surprised' || face === 'serious')) {
    return <>{[L, R].map(closedDown)}</>;
  }

  switch (face) {
    case 'happy':
    case 'proud':
      return <>{[L, R].map(closedSmile)}</>;
    case 'wink':
      return (
        <>
          {dotEye(L)}
          <path d={`M${R - 5} ${Y - 3} L${R + 3} ${Y} L${R - 5} ${Y + 3}`} {...stroke} />
        </>
      );
    case 'serious':
      return (
        <>
          <ellipse cx={L} cy={Y + 1} rx={4.2} ry={3.4} fill={INK} />
          <ellipse cx={R} cy={Y + 1} rx={4.2} ry={3.4} fill={INK} />
          <path d={`M${L - 6} ${Y - 7} L${L + 4} ${Y - 4.5}`} {...stroke} strokeWidth={2.6} />
          <path d={`M${R + 6} ${Y - 7} L${R - 4} ${Y - 4.5}`} {...stroke} strokeWidth={2.6} />
        </>
      );
    case 'sleepy':
      return <>{[L, R].map(closedDown)}</>;
    case 'excited':
      return (
        <>
          {[L, R].map((cx) => (
            <path
              key={cx}
              d={`M${cx} ${Y - 7} Q${cx + 1.2} ${Y - 1.2} ${cx + 7} ${Y} Q${cx + 1.2} ${Y + 1.2} ${cx} ${Y + 7} Q${cx - 1.2} ${Y + 1.2} ${cx - 7} ${Y} Q${cx - 1.2} ${Y - 1.2} ${cx} ${Y - 7} Z`}
              fill="#FFC53D"
              stroke={INK}
              strokeWidth={1.6}
              strokeLinejoin="round"
            />
          ))}
        </>
      );
    case 'surprised':
      return (
        <>
          {[L, R].map((cx) => (
            <g key={cx}>
              <circle cx={cx} cy={Y} r={5.6} fill="#fff" stroke={INK} strokeWidth={2.6} />
              <circle cx={cx} cy={Y} r={2.4} fill={INK} />
            </g>
          ))}
        </>
      );
    case 'love':
      return (
        <>
          {[L, R].map((cx) => (
            <path
              key={cx}
              d={`M${cx} ${Y + 5.5} C${cx - 9} ${Y - 1} ${cx - 4.5} ${Y - 8} ${cx} ${Y - 3.2} C${cx + 4.5} ${Y - 8} ${cx + 9} ${Y - 1} ${cx} ${Y + 5.5} Z`}
              fill="#FF5C8A"
            />
          ))}
        </>
      );
    case 'shy':
      return (
        <>
          <path d={`M${L - 5} ${Y - 3.5} L${L + 3} ${Y} L${L - 5} ${Y + 3.5}`} {...stroke} />
          <path d={`M${R + 5} ${Y - 3.5} L${R - 3} ${Y} L${R + 5} ${Y + 3.5}`} {...stroke} />
          {/* 부끄러움 빗금 */}
          {[22, 26, 30, 70, 74, 78].map((x) => (
            <path key={x} d={`M${x} ${Y + 6} l-2 4`} stroke={blush} strokeWidth={1.6} strokeLinecap="round" />
          ))}
        </>
      );
    default:
      return <>{[L, R].map((cx) => dotEye(cx))}</>;
  }
};

/** 표정별 입 */
const Mouth: React.FC<{ face: MochiFace; speaking?: boolean }> = ({ face, speaking }) => {
  const Y = 66;
  const s = { stroke: INK, strokeWidth: 2.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  if (speaking) {
    return (
      <g className="lumi-mochi-talk" style={{ transformOrigin: `50px ${Y + 2}px` }}>
        <ellipse cx={50} cy={Y + 2} rx={4.2} ry={3.6} fill="#7A2E43" />
        <ellipse cx={50} cy={Y + 3.6} rx={2.6} ry={1.4} fill="#FF8FA8" />
      </g>
    );
  }
  switch (face) {
    case 'happy':
    case 'excited':
    case 'love':
      return (
        <g>
          <path d={`M43 ${Y - 1} Q50 ${Y - 1} 57 ${Y - 1} Q56 ${Y + 8} 50 ${Y + 8} Q44 ${Y + 8} 43 ${Y - 1} Z`} fill="#7A2E43" />
          <path d={`M46 ${Y + 5.5} Q50 ${Y + 2.8} 54 ${Y + 5.5} Q52 ${Y + 7.6} 50 ${Y + 7.6} Q48 ${Y + 7.6} 46 ${Y + 5.5} Z`} fill="#FF8FA8" />
        </g>
      );
    case 'surprised':
      return <ellipse cx={50} cy={Y + 2} rx={3.2} ry={4} fill="#7A2E43" />;
    case 'serious':
      return <path d={`M45 ${Y + 1} L55 ${Y + 1}`} {...s} />;
    case 'sleepy':
      return <ellipse cx={50} cy={Y + 1.5} rx={2.2} ry={2.6} fill="none" stroke={INK} strokeWidth={2.2} />;
    case 'shy':
      return <path d={`M44 ${Y + 1} q2 -2.4 4 0 t4 0 t4 0`} {...s} strokeWidth={2.2} />;
    case 'proud':
    case 'wink':
      return <path d={`M43.5 ${Y - 0.5} Q46.75 ${Y + 4} 50 ${Y} Q53.25 ${Y + 4} 56.5 ${Y - 0.5}`} {...s} />;
    default:
      return <path d={`M45 ${Y} Q47.5 ${Y + 3.4} 50 ${Y} Q52.5 ${Y + 3.4} 55 ${Y}`} {...s} />;
  }
};

export const MochiBody: React.FC<MochiBodyProps> = ({ face, tint, eye = { x: 0, y: 0 }, blinking, speaking, squish, glow = 'med', className = '' }) => {
  const uid = useId().replace(/:/g, '');
  const glowOpacity = glow === 'low' ? 0.35 : glow === 'high' ? 0.9 : 0.6;
  const blushBig = face === 'shy' || face === 'love';
  // 눈이 아닌 표정(감은 눈 등)은 시선 이동을 줄여 자연스럽게
  const eyeMove = face === 'normal' || face === 'surprised' || face === 'wink' ? 1 : 0.4;

  return (
    <svg viewBox="0 0 100 100" className={`lumi-mochi ${squish ? 'is-squish' : ''} ${className}`} aria-hidden>
      <defs>
        <radialGradient id={`mb-${uid}`} cx="38%" cy="30%" r="78%">
          <stop offset="0%" stopColor={tint.light} />
          <stop offset="62%" stopColor={tint.light} />
          <stop offset="100%" stopColor={tint.dark} />
        </radialGradient>
        <radialGradient id={`mg-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={tint.glow} stopOpacity={glowOpacity} />
          <stop offset="100%" stopColor={tint.glow} stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* 후광 + 바닥 그림자 */}
      <circle cx="50" cy="56" r="48" fill={`url(#mg-${uid})`} className="lumi-mochi-halo" />
      <ellipse cx="50" cy="92" rx="30" ry="4.2" fill="#1e1b4b" opacity="0.14" className="lumi-mochi-shadow" />

      <g className="lumi-mochi-body">
        {/* 찹쌀떡 몸 (아래가 살짝 퍼진 말랑한 모양) */}
        <path
          d="M50 16 C74 16 92 36 93 60 C94 80 77 89 50 89 C23 89 6 80 7 60 C8 36 26 16 50 16 Z"
          fill={`url(#mb-${uid})`}
          stroke="rgba(120,110,140,0.22)"
          strokeWidth="1.2"
          style={{ transition: 'fill 0.5s ease' }}
        />
        {/* 윤기 하이라이트 */}
        <ellipse cx="34" cy="31" rx="11" ry="6" fill="#fff" opacity="0.9" transform="rotate(-24 34 31)" />
        <circle cx="47" cy="25" r="2.2" fill="#fff" opacity="0.9" />

        {/* 볼터치 */}
        <ellipse cx="25" cy="65" rx={blushBig ? 8 : 6} ry={blushBig ? 4.6 : 3.6} fill={tint.blush} opacity={blushBig ? 0.75 : 0.5} />
        <ellipse cx="75" cy="65" rx={blushBig ? 8 : 6} ry={blushBig ? 4.6 : 3.6} fill={tint.blush} opacity={blushBig ? 0.75 : 0.5} />

        {/* 얼굴 (눈은 시선 추적) */}
        <g style={{ transform: `translate(${eye.x * eyeMove}px, ${eye.y * eyeMove}px)`, transition: 'transform 90ms linear' }}>
          <Eyes face={face} blinking={blinking} blush={tint.blush} />
        </g>
        <g style={{ transform: `translate(${eye.x * 0.35}px, ${eye.y * 0.25}px)` }}>
          <Mouth face={face} speaking={speaking} />
        </g>

        {/* 작은 손 (몸에 붙은 동그라미) */}
        <ellipse cx="17" cy="76" rx="6" ry="4.6" fill={tint.light} stroke="rgba(120,110,140,0.22)" strokeWidth="1" className="lumi-mochi-hand-l" />
        <ellipse cx="83" cy="76" rx="6" ry="4.6" fill={tint.light} stroke="rgba(120,110,140,0.22)" strokeWidth="1" className="lumi-mochi-hand-r" />
      </g>
    </svg>
  );
};

export default MochiBody;
