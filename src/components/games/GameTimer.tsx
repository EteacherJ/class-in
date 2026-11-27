/**
 * ⏱ 경기 타이머 (점수판 맨 위 · 대진표 결승 아래)
 *  - 1 · 2 · 3 · 5분 바로 고르기, ±30초, 시작/멈춤/리셋
 *  - 마지막 5초 똑딱, 끝나면 알림음 (타이머 🔔 알림 설정의 소리 · 크기를 같이 써요)
 *  - 시간은 이 화면이 꺼져도 이어지도록 끝나는 시각으로 저장
 */
import React, { useEffect, useRef, useState } from 'react';
import { getTimerAlert, playTimerSound, playTimerTick } from '../../utils/timerAlerts';

interface Saved {
  total: number;
  left: number;
  endAt: number | null;
}
const read = (k: string): Saved => {
  try {
    const v = JSON.parse(localStorage.getItem(k) || 'null');
    if (v && typeof v.total === 'number') return v;
  } catch {}
  return { total: 180, left: 180, endAt: null };
};
const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export const GameTimer: React.FC<{ storeKey: string; isLight?: boolean; compact?: boolean }> = ({ storeKey, isLight = true, compact }) => {
  const [st, setSt] = useState<Saved>(() => read(storeKey));
  const [now, setNow] = useState(Date.now());
  const lastTick = useRef(-1);
  const running = st.endAt != null;
  const left = running ? Math.max(0, Math.ceil((st.endAt! - now) / 1000)) : st.left;

  useEffect(() => {
    try {
      localStorage.setItem(storeKey, JSON.stringify(st));
    } catch {}
  }, [st, storeKey]);
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(t);
  }, [running]);
  // 똑딱 · 끝
  useEffect(() => {
    if (!running) return;
    const a = getTimerAlert();
    if (left !== lastTick.current) {
      lastTick.current = left;
      if (left > 0 && left <= 5 && a.countdown) playTimerTick(left, a.volume);
    }
    if (left <= 0) {
      playTimerSound(a.endSound === 'mute' ? 'fanfare' : a.endSound, a.volume, 2);
      setSt((s) => ({ ...s, left: 0, endAt: null }));
    }
  }, [left, running]);

  const setTotal = (sec: number) => setSt({ total: sec, left: sec, endAt: null });
  const add = (d: number) =>
    setSt((s) => {
      if (s.endAt != null) return { ...s, endAt: Math.max(Date.now() + 1000, s.endAt + d * 1000) };
      const v = Math.max(10, Math.min(99 * 60, s.left + d));
      return { ...s, left: v, total: Math.max(s.total, v) };
    });
  const toggle = () =>
    setSt((s) => {
      if (s.endAt != null) return { ...s, left: Math.max(0, Math.ceil((s.endAt - Date.now()) / 1000)), endAt: null };
      const l = s.left > 0 ? s.left : s.total;
      setNow(Date.now());
      return { ...s, left: l, endAt: Date.now() + l * 1000 };
    });
  const reset = () => setSt((s) => ({ ...s, left: s.total, endAt: null }));
  const pct = st.total > 0 ? Math.max(0, Math.min(100, (left / st.total) * 100)) : 0;
  const warn = running && left <= 10;

  return (
    <div className={`gtm ${isLight ? 'is-light' : 'is-dark'} ${compact ? 'is-compact' : ''} ${warn ? 'is-warn' : ''} ${left === 0 ? 'is-zero' : ''}`} data-game-timer={storeKey}>
      <span className="gtm-ic">⏱</span>
      <div className="gtm-time" aria-live="polite">
        {fmt(left)}
        <i className="gtm-bar" style={{ width: `${pct}%` }} />
      </div>
      <div className="gtm-ctl">
      <div className="gtm-presets">
        {[60, 120, 180, 300].map((sec) => (
          <button key={sec} type="button" className={st.total === sec ? 'is-on' : ''} onClick={() => setTotal(sec)}>
            {sec / 60}분
          </button>
        ))}
        <button type="button" onClick={() => add(-30)} title="30초 빼기">
          −30초
        </button>
        <button type="button" onClick={() => add(30)} title="30초 더하기">
          +30초
        </button>
      </div>
      <button type="button" className={`gtm-go ${running ? 'is-run' : ''}`} onClick={toggle} data-game-timer-go>
        {running ? '⏸ 멈춤' : left === 0 ? '▶ 다시' : '▶ 시작'}
      </button>
      <button type="button" className="gtm-reset" onClick={reset} title="처음 시간으로">
        🔄
      </button>
      </div>
    </div>
  );
};
