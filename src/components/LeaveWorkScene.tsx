import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ClassConfig } from '../types';
import { pickLeaveMessage, SEASON_EMOJI, seasonOf, toLeaveWx } from '../utils/leaveMessages';
import { lightTodayStar, readStars, type SchoolDayInputs } from '../utils/schoolDays';

/**
 * ============================================================================
 * 🌇 퇴근 장면 v2 — 수채화 그림책 느낌
 * ============================================================================
 *  ① 수채화 (약 3초): 크림색 종이 위로 물감이 번지고, 계절 꽃·잎이 피어나며 루미가 폴짝 등장 → 기지개
 *  ② Class in → out (약 2초): 'in' 글자가 플립 시계처럼 넘어가 'out'
 *  ③ 별 (약 3.5초): 루미 위 수업일수만큼의 별 → 루미가 폴짝 뛰면 오늘의 별이 반짝 켜져요
 *  ④ 응원 문구 (약 5초): 계절 · 월 · 날씨에 맞는 문구 (191개 중 랜덤) → 루미가 손 흔들고 퇴장
 * - 아무 곳이나 누르거나 Esc 를 누르면 바로 닫혀요. '동작 줄이기' 설정이면 마지막 장면만 보여 줘요.
 * - 미리보기(preview)에서는 별을 켜지 않아요.
 */

type Phase = 'paint' | 'out' | 'stars' | 'message' | 'leave';
const TIMES: Array<[Phase, number]> = [
  ['paint', 0],
  ['out', 3000],
  ['stars', 5000],
  ['message', 8600],
  ['leave', 13200],
];
const END_AT = 14000;

type Season = '봄' | '여름' | '가을' | '겨울';
const PALETTE: Record<Season, { blobs: string[]; ground: string; particle: string }> = {
  봄: { blobs: ['#F8D3DB', '#DCEBCB', '#E4DAF3', '#FCEBC6'], ground: '#CFE3B5', particle: 'petal' },
  여름: { blobs: ['#CDEBDA', '#D3E7F7', '#FBEFC0', '#E2F0C9'], ground: '#BFDDA7', particle: 'firefly' },
  가을: { blobs: ['#F7D8B5', '#F1E1B2', '#F2CFC6', '#E9DCC4'], ground: '#E3D19F', particle: 'leaf' },
  겨울: { blobs: ['#DCE8F4', '#E6E0F2', '#F3F5F9', '#D9E6EE'], ground: '#E8EEF4', particle: 'snow' },
};

/* 🖌️ 수채화 루미 (갈색 손그림 선 + 크림색 몸 + 분홍 볼) */
const WaterLumi: React.FC<{ face?: 'happy' | 'smile' | 'wow'; scarf?: boolean; bag?: boolean }> = ({ face = 'smile', scarf, bag }) => (
  <svg viewBox="0 0 160 150" className="lw2-lumi-svg" aria-hidden>
    <defs>
      <radialGradient id="lw2body" cx="38%" cy="32%" r="75%">
        <stop offset="0" stopColor="#FFFEFA" />
        <stop offset=".7" stopColor="#FBF6EE" />
        <stop offset="1" stopColor="#EFE6DA" />
      </radialGradient>
      <filter id="lw2soft"><feGaussianBlur stdDeviation="3" /></filter>
    </defs>
    {bag && <path d="M108 70 q24 -4 26 22 q2 26 -22 28 z" fill="#F2B98C" stroke="#5B4636" strokeWidth="3" strokeLinejoin="round" />}
    <ellipse cx="80" cy="140" rx="46" ry="7" fill="#7a6a55" opacity=".18" filter="url(#lw2soft)" />
    <path d="M24 104 C14 60 44 22 80 22 C116 22 146 60 136 104 C130 128 108 136 80 136 C52 136 30 128 24 104 Z" fill="url(#lw2body)" stroke="#5B4636" strokeWidth="3.4" strokeLinejoin="round" />
    <path d="M30 100 q-14 4 -10 16" fill="none" stroke="#5B4636" strokeWidth="3" strokeLinecap="round" className="lw2-arm-l" />
    <path d="M130 100 q14 4 10 16" fill="none" stroke="#5B4636" strokeWidth="3" strokeLinecap="round" className="lw2-arm-r" />
    <circle cx="50" cy="94" r="10" fill="#F6A9B4" opacity=".55" filter="url(#lw2soft)" />
    <circle cx="110" cy="94" r="10" fill="#F6A9B4" opacity=".55" filter="url(#lw2soft)" />
    {face === 'happy' ? (
      <>
        <path d="M54 80 q8 -9 16 0" fill="none" stroke="#3E2F24" strokeWidth="3.6" strokeLinecap="round" />
        <path d="M90 80 q8 -9 16 0" fill="none" stroke="#3E2F24" strokeWidth="3.6" strokeLinecap="round" />
      </>
    ) : (
      <>
        <ellipse cx="62" cy="80" rx="6.5" ry={face === 'wow' ? 8.5 : 7.5} fill="#3E2F24" />
        <ellipse cx="98" cy="80" rx="6.5" ry={face === 'wow' ? 8.5 : 7.5} fill="#3E2F24" />
        <circle cx="64.5" cy="76.5" r="2.4" fill="#fff" />
        <circle cx="100.5" cy="76.5" r="2.4" fill="#fff" />
      </>
    )}
    {face === 'wow' ? (
      <ellipse cx="80" cy="97" rx="5" ry="6" fill="#C9585E" stroke="#5B4636" strokeWidth="2" />
    ) : (
      <path d="M72 93 q4 6 8 0 q4 6 8 0" fill="none" stroke="#5B4636" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    )}
    {scarf && (
      <path d="M34 112 q46 18 92 0 l2 10 q-48 18 -96 0 z M104 118 l6 22 l10 -4 l-6 -20 z" fill="#E7808A" stroke="#5B4636" strokeWidth="2.6" strokeLinejoin="round" />
    )}
  </svg>
);

/* 🌷 계절 꽃·풀 (수채화 + 갈색 선) */
const Flora: React.FC<{ season: Season; side: 'l' | 'r' }> = ({ season, side }) => {
  const flip = side === 'r' ? 'scale(-1,1) translate(-260,0)' : undefined;
  const stroke = '#5B4636';
  return (
    <svg viewBox="0 0 260 300" className={`lw2-flora is-${side}`} aria-hidden>
      <defs>
        <filter id={`lw2wc-${side}`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed={side === 'l' ? 3 : 8} />
          <feDisplacementMap in="SourceGraphic" scale="6" />
        </filter>
      </defs>
      <g transform={flip}>
        {season === '봄' && (
          <>
            <g className="lw2-grow" style={{ animationDelay: '.5s' }}>
              <path d="M70 300 C66 230 72 170 78 120" fill="none" stroke="#7FA66A" strokeWidth="6" strokeLinecap="round" />
              <path d="M74 250 C30 220 26 170 40 140 C60 170 74 200 74 250Z" fill="#A9CB8F" opacity=".85" filter={`url(#lw2wc-${side})`} />
              <path d="M78 120 C56 112 54 82 64 66 C70 80 76 82 78 66 C80 82 88 80 92 66 C102 84 98 112 78 120Z" fill="#F4A9B8" stroke={stroke} strokeWidth="2.6" filter={`url(#lw2wc-${side})`} />
            </g>
            <g className="lw2-grow" style={{ animationDelay: '.8s' }}>
              <path d="M150 300 C150 260 154 236 160 214" fill="none" stroke="#7FA66A" strokeWidth="4" strokeLinecap="round" />
              {Array.from({ length: 8 }).map((_, i) => (
                <ellipse key={i} cx="160" cy="196" rx="7" ry="16" fill="#FFFDF7" stroke={stroke} strokeWidth="2" transform={`rotate(${i * 45} 160 214) translate(0 0)`} />
              ))}
              <circle cx="160" cy="214" r="9" fill="#F7CF5B" stroke={stroke} strokeWidth="2" />
            </g>
            <g className="lw2-grow" style={{ animationDelay: '1s' }}>
              <path d="M215 300 C214 250 216 210 220 170" fill="none" stroke="#8DAF7A" strokeWidth="3.5" />
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <ellipse key={i} cx={220 + (i % 2 ? 7 : -7)} cy={176 + i * 13} rx="7" ry="6" fill="#B7A6E3" opacity=".9" />
              ))}
            </g>
          </>
        )}
        {season === '여름' && (
          <>
            <g className="lw2-grow" style={{ animationDelay: '.5s' }}>
              <path d="M90 300 C88 230 92 170 96 110" fill="none" stroke="#7FA66A" strokeWidth="6" strokeLinecap="round" />
              <path d="M92 220 C50 200 46 160 58 140 C76 166 90 186 92 220Z" fill="#A9CB8F" filter={`url(#lw2wc-${side})`} />
              {Array.from({ length: 12 }).map((_, i) => (
                <ellipse key={i} cx="96" cy="76" rx="9" ry="22" fill="#F8D25A" stroke={stroke} strokeWidth="2" transform={`rotate(${i * 30} 96 104)`} />
              ))}
              <circle cx="96" cy="104" r="17" fill="#9A6A3E" stroke={stroke} strokeWidth="2.4" />
            </g>
            <g className="lw2-grow" style={{ animationDelay: '.9s' }}>
              {[150, 175, 200, 225].map((x, i) => (
                <path key={x} d={`M${x} 300 C${x - 4} 250 ${x + 8} 220 ${x + 14 - i * 3} ${190 + i * 8}`} fill="none" stroke="#9CC387" strokeWidth="5" strokeLinecap="round" opacity=".8" />
              ))}
            </g>
          </>
        )}
        {season === '가을' && (
          <>
            <g className="lw2-grow" style={{ animationDelay: '.5s' }}>
              <path d="M80 300 C78 240 84 190 86 150" fill="none" stroke="#8DAF7A" strokeWidth="4" />
              {Array.from({ length: 8 }).map((_, i) => (
                <ellipse key={i} cx="86" cy="128" rx="8" ry="18" fill="#F3B7C8" stroke={stroke} strokeWidth="2" transform={`rotate(${i * 45} 86 150)`} />
              ))}
              <circle cx="86" cy="150" r="7" fill="#F4C64E" stroke={stroke} strokeWidth="2" />
            </g>
            <g className="lw2-grow" style={{ animationDelay: '.8s' }}>
              <path d="M150 300 C150 260 152 236 156 216" fill="none" stroke="#8DAF7A" strokeWidth="3.5" />
              {Array.from({ length: 8 }).map((_, i) => (
                <ellipse key={i} cx="156" cy="200" rx="6.5" ry="15" fill="#FFFDF7" stroke={stroke} strokeWidth="2" transform={`rotate(${i * 45} 156 216)`} />
              ))}
              <circle cx="156" cy="216" r="6" fill="#F4C64E" stroke={stroke} strokeWidth="2" />
            </g>
            <g className="lw2-grow" style={{ animationDelay: '1s' }}>
              <path d="M205 300 q-6 -40 10 -70" fill="none" stroke="#B98B55" strokeWidth="4" strokeLinecap="round" />
              <path d="M215 226 l-14 -6 l6 -12 l-12 -10 l14 -2 l2 -14 l10 10 l10 -10 l2 14 l14 2 l-12 10 l6 12 l-14 6 z" fill="#E98A4F" stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" />
            </g>
          </>
        )}
        {season === '겨울' && (
          <>
            <g className="lw2-grow" style={{ animationDelay: '.5s' }}>
              <path d="M90 300 L90 120" stroke="#8B6B4A" strokeWidth="7" strokeLinecap="round" />
              {[0, 1, 2].map((i) => (
                <path key={i} d={`M${90 - 60 + i * 12} ${250 - i * 50} L90 ${170 - i * 50} L${90 + 60 - i * 12} ${250 - i * 50} Z`} fill="#8FB59A" stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" />
              ))}
              {[0, 1, 2].map((i) => (
                <path key={`s${i}`} d={`M${90 - 50 + i * 12} ${238 - i * 50} q${50 - i * 12} -22 ${100 - i * 24} 0`} fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" opacity=".95" />
              ))}
            </g>
            <g className="lw2-grow" style={{ animationDelay: '.9s' }}>
              <path d="M180 300 q-4 -50 8 -84" fill="none" stroke="#6E8F67" strokeWidth="4" />
              {Array.from({ length: 6 }).map((_, i) => (
                <ellipse key={i} cx="188" cy="204" rx="9" ry="13" fill="#E7808A" stroke={stroke} strokeWidth="2" transform={`rotate(${i * 60} 188 216)`} />
              ))}
              <circle cx="188" cy="216" r="6" fill="#F4C64E" stroke={stroke} strokeWidth="2" />
            </g>
          </>
        )}
      </g>
    </svg>
  );
};

const rnd = (i: number) => {
  const x = Math.sin(i * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

const playChime = () => {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    [880, 1318.5, 1760].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.09;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 1);
    });
    setTimeout(() => ctx.close?.(), 1500);
  } catch {}
};

export const LeaveWorkScene: React.FC<{ endTime: string; onDone: () => void; config?: ClassConfig; preview?: boolean }> = ({ endTime, onDone, config, preview }) => {
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [t0] = useState(() => performance.now());
  const [phase, setPhase] = useState<Phase>(reduced ? 'message' : 'paint');
  const [closing, setClosing] = useState(false);
  const doneRef = useRef(false);
  const close = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setClosing(true);
    window.setTimeout(onDone, 380);
  };

  const now = useMemo(() => new Date(), []);
  const season = seasonOf(now.getMonth() + 1) as Season;
  const weather = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('smart_dashboard_realtime_weather') || 'null')?.weatherType || localStorage.getItem('smart_board_weather');
    } catch {
      return null;
    }
  }, []);
  const wx = toLeaveWx(weather);
  const pal = PALETTE[season];
  const particle = wx === 'rain' ? 'rain' : wx === 'snow' ? 'snow' : pal.particle;
  const msg = useMemo(() => pickLeaveMessage(now, weather), [now, weather]);
  const wxLabel = wx === 'rain' ? '비' : wx === 'snow' ? '눈' : wx === 'cloud' ? '흐림' : '';

  // ⭐ 별: 처음 한 번만 계산 (미리보기에서는 켜지 않아요)
  const starInfo = useMemo(() => {
    const inputs: SchoolDayInputs = {
      s1Start: config?.semester1StartDate,
      summerStart: config?.summerVacationDate,
      s2Start: config?.semester2StartDate,
      winterStart: config?.winterVacationDate,
      off: config?.schoolDaysOff,
      extra: config?.schoolDaysExtra,
    };
    const confirmed = config?.schoolDaysConfirmed;
    const store = readStars();
    if (!confirmed || !store || store.sig !== confirmed.sig) return { ready: false, total: 0, lit: 0, isNew: false };
    if (preview) return { ready: true, total: store.total, lit: store.lit.length, isNew: false, previewNew: store.lit.length < store.total };
    const r = lightTodayStar(inputs);
    const s = r.store || store;
    return { ready: true, total: s.total, lit: s.lit.length, isNew: r.lit };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // 미리보기는 '다음 별이 켜지는 모습'만 보여 줘요 (저장은 안 해요)
  const showNew = starInfo.isNew || (starInfo as any).previewNew;
  const litCount = starInfo.isNew ? starInfo.lit : (starInfo as any).previewNew ? starInfo.lit + 1 : starInfo.lit;

  useEffect(() => {
    if (reduced) {
      const t = window.setTimeout(close, 6000);
      return () => clearTimeout(t);
    }
    const timers = TIMES.map(([p, at]) => window.setTimeout(() => setPhase(p), at));
    timers.push(window.setTimeout(close, END_AT));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (phase === 'stars' && showNew) {
      const t = window.setTimeout(playChime, 1300);
      return () => clearTimeout(t);
    }
  }, [phase, showNew]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  void t0;

  const total = starInfo.total;
  const cols = total > 0 ? Math.min(total, total > 150 ? 25 : total > 100 ? 20 : total > 60 ? 15 : 12) : 0;
  const pIdx = ['paint', 'out', 'stars', 'message', 'leave'].indexOf(phase);
  const face: 'happy' | 'smile' | 'wow' = phase === 'out' ? 'wow' : phase === 'stars' || phase === 'leave' ? 'happy' : 'smile';

  return createPortal(
    <div
      className={`lw2 is-${phase} ${closing ? 'is-closing' : ''} ${reduced ? 'is-reduced' : ''} wx-${particle}`}
      onClick={close}
      role="dialog"
      aria-label="퇴근 장면 (누르면 닫혀요)"
      data-leave-scene
      style={{ ['--lw2-b1' as any]: pal.blobs[0], ['--lw2-b2' as any]: pal.blobs[1], ['--lw2-b3' as any]: pal.blobs[2], ['--lw2-b4' as any]: pal.blobs[3], ['--lw2-ground' as any]: pal.ground }}
    >
      <div className="lw2-paper" />
      <div className="lw2-blob b1" />
      <div className="lw2-blob b2" />
      <div className="lw2-blob b3" />
      <div className="lw2-blob b4" />
      {/* 떨어지는 것: 꽃잎 · 반딧불 · 낙엽 · 눈 · 비 */}
      <div className="lw2-particles" aria-hidden>
        {Array.from({ length: particle === 'rain' ? 46 : 26 }).map((_, i) => (
          <i
            key={i}
            className={`lw2-p p-${particle}`}
            style={{
              left: `${rnd(i + 1) * 100}%`,
              animationDelay: `${(rnd(i + 7) * (particle === 'rain' ? 1.2 : 6)).toFixed(2)}s`,
              animationDuration: `${(particle === 'rain' ? 0.7 + rnd(i + 3) * 0.5 : particle === 'firefly' ? 3 + rnd(i + 3) * 3 : 5 + rnd(i + 3) * 5).toFixed(2)}s`,
              ['--s' as any]: (0.6 + rnd(i + 11) * 0.9).toFixed(2),
              ['--dx' as any]: `${Math.round((rnd(i + 13) - 0.5) * 160)}px`,
              top: particle === 'firefly' ? `${30 + rnd(i + 17) * 55}%` : undefined,
            }}
          />
        ))}
      </div>
      <div className="lw2-ground" />
      <Flora season={season} side="l" />
      <Flora season={season} side="r" />

      {/* ② Class in → out 간판 */}
      <div className={`lw2-sign ${pIdx >= 1 ? 'is-show' : ''} ${pIdx >= 2 ? 'is-small' : ''}`}>
        <span className="lw2-sign-class">Class</span>
        <span className="lw2-flip">
          <span className={`lw2-flip-card ${pIdx >= 1 ? 'is-out' : ''}`}>
            <span className="lw2-flip-in">in</span>
            <span className="lw2-flip-out">out</span>
          </span>
        </span>
        <span className="lw2-sign-sub">{endTime} 퇴근 · 오늘도 수고하셨어요</span>
      </div>

      {/* ③ 별판 */}
      <div className={`lw2-stars ${pIdx >= 2 ? 'is-show' : ''} ${pIdx >= 3 ? 'is-small' : ''}`} onClick={(e) => e.stopPropagation()}>
        {starInfo.ready && total > 0 ? (
          <>
            <div className="lw2-star-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
              {Array.from({ length: total }).map((_, i) => {
                const isNewOne = showNew && i === litCount - 1;
                const on = i < litCount;
                return <i key={i} className={`lw2-star ${on ? 'is-on' : ''} ${isNewOne ? 'is-new' : ''}`} style={isNewOne ? undefined : { animationDelay: `${Math.min(i, 200) * 6}ms` }} />;
              })}
            </div>
            <div className="lw2-star-count">
              ⭐ <b>{litCount}</b> / {total}일
              {starInfo.isNew ? ' · 오늘의 별 반짝!' : (starInfo as any).previewNew ? ' · 미리보기 (별은 저장되지 않아요)' : ' · 오늘 별은 이미 켜져 있어요'}
            </div>
          </>
        ) : (
          <div className="lw2-star-count is-tip">⭐ 환경설정에서 수업일수를 확인하면, 퇴근할 때마다 별이 하나씩 켜져요</div>
        )}
      </div>

      {/* ④ 응원 문구 */}
      <div className={`lw2-note ${pIdx >= 3 ? 'is-show' : ''}`}>
        <span className="lw2-tape l" />
        <span className="lw2-tape r" />
        <small>
          {SEASON_EMOJI[msg.season]} {now.getMonth() + 1}월 · {msg.situ}
          {wxLabel ? ` · 오늘 ${wxLabel}` : ''}
        </small>
        <p>{msg.text}</p>
      </div>

      {/* 루미 */}
      <div className={`lw2-lumi is-${phase}`}>
        {phase === 'paint' && <span className="lw2-say">오늘 끝! 🎶</span>}
        {phase === 'leave' && <span className="lw2-say">내일 또 만나요 👋</span>}
        <div className="lw2-lumi-body">
          <WaterLumi face={face} scarf={season === '겨울'} bag={phase === 'leave'} />
        </div>
      </div>

      <button type="button" className="lw2-close" onClick={(e) => { e.stopPropagation(); close(); }} aria-label="닫기">
        닫기 ✕
      </button>
    </div>,
    document.body
  );
};

export default LeaveWorkScene;
