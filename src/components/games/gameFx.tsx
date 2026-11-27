import React, { useEffect, useMemo, useRef, useState } from 'react';

/** 부모가 자주 다시 그려져도 타이머가 초기화되지 않게 최신 콜백을 담아 둬요 */
export function useLatest<T>(v: T) {
  const r = useRef(v);
  r.current = v;
  return r;
}
import { MochiBody, type MochiFace, type MochiTint } from '../MochiCharacter';
import { isGameSoundOn, setGameSoundOn, startVictoryMusic, stopVictoryMusic } from '../../utils/gameSounds';

/**
 * 🎮 대진표 · 점수판 공용: 색깔 루미 · 꽃가루 · 승리 알림
 */

export const TEAM_COLORS = ['#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#ef4444', '#84cc16', '#f97316', '#14b8a6'];

const TW: Record<string, string> = {
  red: '#ef4444', orange: '#f97316', amber: '#f59e0b', yellow: '#eab308', lime: '#84cc16', green: '#22c55e', emerald: '#10b981', teal: '#14b8a6',
  cyan: '#06b6d4', sky: '#0ea5e9', blue: '#3b82f6', indigo: '#6366f1', violet: '#8b5cf6', purple: '#a855f7', fuchsia: '#d946ef', pink: '#ec4899', rose: '#f43f5e', slate: '#64748b',
};
/** 'bg-amber-500' 같은 모둠 색 → #hex */
export const hexFromTw = (cls?: string, fallback = '#6366f1') => {
  const m = (cls || '').match(/(?:bg|text|border)-([a-z]+)-\d+/);
  return (m && TW[m[1]]) || fallback;
};

const mix = (hex: string, toward: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = p(hex);
  const b = p(toward);
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
/** 팀 색으로 루미 몸 색 만들기 (밝은 파스텔 + 같은 계열 그림자) */
export const tintFromHex = (hex: string): MochiTint => ({
  id: `c-${hex}`,
  label: hex,
  light: mix(hex, '#ffffff', 0.62),
  dark: mix(hex, '#ffffff', 0.12),
  blush: '#FF9EB5',
  glow: mix(hex, '#ffffff', 0.4),
});
export const MEDAL_TINT: Record<1 | 2 | 3, MochiTint> = {
  1: { id: 'gold', label: '금', light: '#FFF9DB', dark: '#FFD43B', blush: '#FF9E80', glow: '#FDE68A' },
  2: { id: 'silver', label: '은', light: '#FFFFFF', dark: '#CBD5E1', blush: '#FFAFC8', glow: '#E2E8F0' },
  3: { id: 'bronze', label: '동', light: '#FFF4EA', dark: '#E8A774', blush: '#FF9E80', glow: '#FED7AA' },
};

export const Lumi: React.FC<{ tint: MochiTint; face?: MochiFace; size?: number; className?: string; crown?: boolean }> = ({ tint, face = 'happy', size = 120, className = '', crown }) => (
  <span className={`gfx-lumi ${className}`} style={{ width: size, height: size }}>
    {crown && <span className="gfx-crown" style={{ fontSize: Math.max(14, size * 0.36) }}>👑</span>}
    <MochiBody face={face} tint={tint} glow="low" className="w-full h-full" />
  </span>
);

export const Confetti: React.FC<{ count?: number; burst?: boolean }> = ({ count = 70, burst }) => {
  const bits = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * (burst ? 0.4 : 2.4),
        dur: 2.4 + Math.random() * 2.2,
        rot: Math.random() * 360,
        dx: (Math.random() - 0.5) * 220,
        color: TEAM_COLORS[i % TEAM_COLORS.length],
        w: 6 + Math.random() * 7,
        round: Math.random() < 0.3,
      })),
    [count, burst]
  );
  return (
    <div className="gfx-confetti" aria-hidden>
      {bits.map((b, i) => (
        <i
          key={i}
          style={{
            left: `${b.left}%`,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.dur}s`,
            background: b.color,
            width: b.w,
            height: b.round ? b.w : b.w * 1.6,
            borderRadius: b.round ? '50%' : 2,
            ['--r' as any]: `${b.rot}deg`,
            ['--dx' as any]: `${b.dx}px`,
          }}
        />
      ))}
    </div>
  );
};

/** 🏆 승리 알림: 루미가 왕관을 쓰고 뛰어오르며 알려 줘요 (누르면 닫혀요) */
export const WinnerCelebration: React.FC<{ title: string; name: string; sub?: string; color?: string; onClose: () => void; music?: boolean }> = ({ title, name, sub, color = '#f59e0b', onClose, music = true }) => {
  const close = useLatest(onClose);
  useEffect(() => {
    // 🎺 우승 배경음악: 소리가 켜져 있으면 음악이 끝날 때(약 15초)까지 축하 화면 유지
    const withMusic = music && isGameSoundOn();
    if (withMusic) startVictoryMusic(2);
    const t = window.setTimeout(() => close.current(), withMusic ? 15500 : 7000);
    const k = (e: KeyboardEvent) => e.key === 'Escape' && close.current();
    window.addEventListener('keydown', k);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', k);
      if (withMusic) stopVictoryMusic();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [close]);
  return (
    <div className="gfx-win" onClick={onClose} role="dialog" aria-label={`${name} ${title}`} data-game-winner>
      <Confetti count={90} />
      <div className="gfx-win-rays" />
      <div className="gfx-win-card">
        <Lumi tint={tintFromHex(color)} face="proud" size={170} crown className="gfx-win-lumi" />
        <div className="gfx-win-say">🎉 {title}!</div>
        <div className="gfx-win-name" style={{ color }}>{name}</div>
        {sub && <div className="gfx-win-sub">{sub}</div>}
        <div className="gfx-win-hint">화면을 누르면 닫혀요</div>
      </div>
    </div>
  );
};

/** 🔊 게임 소리 켜기/끄기 (대진표 · 점수판 공용, 기억됨) */
export const SoundToggle: React.FC = () => {
  const [on, setOn] = useState(isGameSoundOn());
  useEffect(() => {
    const h = () => setOn(isGameSoundOn());
    window.addEventListener('classin:game-sound', h);
    return () => window.removeEventListener('classin:game-sound', h);
  }, []);
  return (
    <button type="button" className={`gb-btn gfx-snd ${on ? 'is-on' : ''}`} onClick={() => setGameSoundOn(!on)} title={on ? '효과음 · 우승 음악 끄기' : '효과음 · 우승 음악 켜기'} aria-pressed={on} data-game-sound>
      {on ? '🔊 소리' : '🔇 소리 꺼짐'}
    </button>
  );
};

/** 작은 승리 알림 (한 경기 끝날 때) */
export const MatchPop: React.FC<{ name: string; color?: string; label?: string; onDone: () => void }> = ({ name, color = '#6366f1', label, onDone }) => {
  const done = useLatest(onDone);
  useEffect(() => {
    const t = window.setTimeout(() => done.current(), 1800);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <div className="gfx-pop" aria-live="polite">
      <Lumi tint={tintFromHex(color)} face="excited" size={64} />
      <span>
        <b style={{ color }}>{name}</b> {label ? <em className="gfx-pop-up">⬆ {label}</em> : '승리!'}
      </span>
    </div>
  );
};

/** 숫자가 바뀔 때 또르르 세어 올라가는 효과 */
export function useCountUp(value: number, ms = 380) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const from = shown;
    if (from === value) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(from + (value - from) * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return shown;
}

export const shuffle = <T,>(a: T[]): T[] => {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};

/** localStorage 에 저장되는 상태 */
export function usePersist<T>(key: string, init: () => T): [T, (v: T | ((p: T) => T)) => void] {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return { ...init(), ...JSON.parse(raw) };
    } catch {}
    return init();
  });
  const set = (n: T | ((p: T) => T)) =>
    setV((prev) => {
      const next = typeof n === 'function' ? (n as (p: T) => T)(prev) : n;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {}
      return next;
    });
  return [v, set];
}
