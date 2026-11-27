/**
 * 🎁 가챠(캡슐 토이) 뽑기
 *  - 루미가 동전을 넣고 → 레버를 오른쪽으로 빙글 → 통 안 캡슐이 데굴데굴 섞이다
 *    → 하나가 출구로 또르르 → 팝업에서 캡슐이 열리며 이름 공개!
 *  - 공정 모드: 이번 주 안 뽑힌 친구가 먼저 (isFresh)
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MochiBody, type MochiTint } from '../MochiCharacter';
import type { PickItem, PickDoneKind } from './PickerModes';
import type { PickSfx } from '../../utils/pickSounds';
import './gacha.css';

interface Props {
  items: PickItem[];
  isFresh: (id: number) => boolean;
  isTeam: boolean;
  tint: MochiTint;
  busy: boolean;
  setBusy: (b: boolean) => void;
  sfx: (ev: PickSfx, p?: number) => void;
  onDone: (winners: PickItem[], kind: PickDoneKind) => void;
  startRef: React.MutableRefObject<(() => void) | null>;
}
type Step = 'idle' | 'walk' | 'coin' | 'crank' | 'shake' | 'drop' | 'pop' | 'done';
const CAP_COLORS = ['#f472b6', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#fb923c', '#f87171', '#22d3ee', '#c084fc', '#a3e635'];
const shuffle = <T,>(a: T[]): T[] => {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};

export const GachaPick: React.FC<Props> = ({ items, isFresh, isTeam, tint, busy, setBusy, sfx, onDone, startRef }) => {
  const [step, setStep] = useState<Step>('idle');
  const [win, setWin] = useState<PickItem | null>(null);
  const [winColor, setWinColor] = useState(CAP_COLORS[0]);
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  const clearAll = () => {
    timers.current.forEach((t) => {
      clearTimeout(t);
      clearInterval(t);
    });
    timers.current = [];
  };
  useEffect(() => () => clearAll(), []);

  // 통 안 캡슐 (최대 24개, 자리 · 색은 고정)
  const caps = useMemo(() => {
    const n = Math.max(10, Math.min(18, items.length || 12));
    const out: { x: number; y: number; r: number; c: string; rot: number; d: number }[] = [];
    const perRow = [5, 5, 4, 4];
    let i = 0;
    for (let row = 0; row < perRow.length && i < n; row++) {
      for (let col = 0; col < perRow[row] && i < n; col++, i++) {
        // 둥근 통 아래쪽부터 쌓이도록
        const w = perRow[row];
        const x = 50 + (col - (w - 1) / 2) * 15.5 + Math.sin(i * 7.1) * 1.5;
        const y = 84 - row * 14.5 + Math.cos(i * 3.3) * 1.5;
        out.push({ x, y, r: 15 + ((i * 37) % 2), c: CAP_COLORS[i % CAP_COLORS.length], rot: (i * 47) % 360, d: (i * 0.07) % 0.5 });
      }
    }
    return out;
  }, [items.length]);

  const start = () => {
    if (busy || items.length === 0 || (step !== 'idle' && step !== 'done')) return;
    clearAll();
    setWin(null);
    setBusy(true);
    const fresh = shuffle(items.filter((x) => isFresh(x.id)));
    const pick = (fresh.length ? fresh : shuffle(items))[0];
    const col = CAP_COLORS[Math.floor(Math.random() * CAP_COLORS.length)];
    setWinColor(col);
    // 1) 루미가 기계 앞으로
    setStep('walk');
    later(() => {
      // 2) 동전 넣기
      setStep('coin');
      sfx('pop');
    }, 700);
    later(() => {
      // 3) 레버를 오른쪽으로 빙글 (딸깍딸깍)
      setStep('crank');
      for (let i = 0; i < 6; i++) later(() => sfx('tick', i), i * 170);
    }, 1350);
    later(() => {
      // 4) 캡슐이 데굴데굴 섞여요
      setStep('shake');
      sfx('shuffle');
      for (let i = 0; i < 8; i++) later(() => sfx('tick', 6 + i), 150 + i * 190);
    }, 2450);
    later(() => {
      // 5) 하나가 출구로 또르르
      setStep('drop');
      sfx('land');
    }, 4300);
    later(() => {
      // 6) 팝업: 캡슐 열기
      setWin(pick);
      setStep('pop');
      sfx('open');
    }, 5500);
    later(() => {
      setStep('done');
      setBusy(false);
      sfx('win');
      onDone([pick], 'present');
    }, 6500);
  };
  startRef.current = start;

  const closePop = () => setStep((s) => (s === 'done' ? 'idle' : s));
  const running = step !== 'idle' && step !== 'done';

  return (
    <div className="pk-root gc-root" data-pk-method="gacha">
      <div className={`gc-stage is-${step}`}>
        {/* 배경 반짝이 */}
        <div className="gc-bg" aria-hidden>
          {Array.from({ length: 12 }).map((_, i) => (
            <i key={i} style={{ left: `${(i * 83) % 100}%`, top: `${(i * 47) % 90}%`, animationDelay: `${(i % 6) * 0.35}s` }} />
          ))}
        </div>

        {/* 🎁 가챠 기계 */}
        <div className="gc-machine">
          <div className="gc-top">
            <span>✨ 우리 반 가챠 ✨</span>
          </div>
          <div className="gc-dome">
            <svg viewBox="0 0 100 100" className="gc-dome-svg" aria-hidden>
              {caps.map((c, i) => (
                <g
                  key={i}
                  className="gc-cap"
                  style={{ ['--x' as any]: `${c.x}px`, ['--y' as any]: `${c.y}px`, ['--rot' as any]: `${c.rot}deg`, ['--d' as any]: `${c.d}s`, ['--jx' as any]: `${((i * 13) % 9) - 4}px`, ['--jy' as any]: `${-6 - ((i * 7) % 10)}px` }}
                >
                  <circle r={c.r / 2} fill="#f1f5f9" stroke="rgba(15,23,42,.28)" strokeWidth="0.7" />
                  <path d={`M ${-c.r / 2} 0 A ${c.r / 2} ${c.r / 2} 0 0 1 ${c.r / 2} 0 Z`} fill={c.c} />
                  <line x1={-c.r / 2} x2={c.r / 2} y1="0" y2="0" stroke="rgba(15,23,42,.25)" strokeWidth="0.6" />
                  <circle cx={-c.r / 6} cy={-c.r / 4} r={c.r / 9} fill="rgba(255,255,255,.8)" />
                </g>
              ))}
            </svg>
            <i className="gc-glass" />
          </div>
          <div className="gc-body">
            <div className="gc-label">{isTeam ? '모둠' : '이름'} 캡슐 · {items.length}개</div>
            <div className="gc-coin-slot">
              <i />
              {step === 'coin' && <b className="gc-coin">🪙</b>}
            </div>
            <div className={`gc-lever ${step === 'crank' ? 'is-turn' : ''}`}>
              <i className="gc-lever-handle" />
            </div>
            <div className="gc-exit">
              <i className="gc-flap" />
              {(step === 'drop' || step === 'pop' || step === 'done') && (
                <span className="gc-out" style={{ ['--cc' as any]: winColor }}>
                  <i />
                </span>
              )}
            </div>
          </div>
          <div className="gc-foot" />
        </div>

        {/* 🐡 루미 (동전 들고 기계 앞으로) */}
        <div className={`gc-lumi is-${step}`}>
          <MochiBody face={running ? 'excited' : step === 'done' ? 'happy' : 'normal'} tint={tint} glow="low" className="w-full h-full" />
          {(step === 'idle' || step === 'walk') && <span className="gc-hold">🪙</span>}
          {step === 'crank' && <span className="gc-bubble">빙글빙글~</span>}
          {step === 'shake' && <span className="gc-bubble">누가 나올까?</span>}
        </div>

        {/* 🎉 팝업: 캡슐이 열리며 이름 */}
        {(step === 'pop' || step === 'done') && win && (
          <div className="gc-pop-back" onClick={closePop} data-gc-pop>
            <div className="gc-pop" onClick={(e) => e.stopPropagation()}>
              <div className={`gc-pop-cap ${step === 'done' ? 'is-open' : ''}`} style={{ ['--cc' as any]: winColor }}>
                <i className="gc-pc-top" />
                <i className="gc-pc-bot" />
                <span className="gc-burst" aria-hidden>
                  {Array.from({ length: 14 }).map((_, i) => (
                    <i key={i} style={{ ['--a' as any]: `${(i * 360) / 14}deg`, background: CAP_COLORS[i % CAP_COLORS.length] }} />
                  ))}
                </span>
              </div>
              <div className={`gc-pop-name ${step === 'done' ? 'is-show' : ''}`} data-pk-winner>
                {!isTeam && <small>{win.num}번</small>}
                <b>{win.label}</b>
                <em>🎉 축하해요!</em>
              </div>
              {step === 'done' && (
                <button type="button" className="gc-pop-close" onClick={closePop}>
                  확인
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="pk-actions">
        <button type="button" className="dm-big-btn pk-go" onClick={start} disabled={busy || items.length === 0 || running} data-pk-start>
          <span>{step === 'done' ? '🎁 한 번 더 뽑기' : '🎁 가챠 뽑기 시작'} (Space)</span>
        </button>
      </div>
    </div>
  );
};

export default GachaPick;
