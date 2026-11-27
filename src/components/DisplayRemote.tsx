import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { broadcastDisplaySyncState, getInitialSyncState, type DisplaySyncState } from './DualMonitorDisplayView';
import { DISPLAY_TABS, getBellSchedule, setAutoSwitch, setTouchMode, useDisplayPrefs } from '../utils/displayTabs';

/**
 * 🎮 보조창 리모컨 (대시보드 하단 위젯바에서 열기)
 *  - 보조창 화면 바꾸기 · 잠깐 가리기 · 타이머 바로 시작 · 자동 전환 · 터치 모드
 */
export const DisplayRemote: React.FC<{ open: boolean; onClose: () => void; onOpenDisplay?: () => void }> = ({ open, onClose, onOpenDisplay }) => {
  const prefs = useDisplayPrefs();
  const [st, setSt] = useState<DisplaySyncState>(() => getInitialSyncState());

  useEffect(() => {
    if (!open) return;
    setSt(getInitialSyncState());
    let ch: BroadcastChannel | null = null;
    try {
      ch = new BroadcastChannel('class_display_sync_channel');
      ch.onmessage = (e) => {
        const d = e.data?.syncState || (!e.data?.type ? e.data : null);
        if (d && d.activeTab) setSt((p) => ({ ...p, ...d }));
      };
    } catch {}
    const onStorage = (e: StorageEvent) => e.key === 'class_dual_display_sync_state' && setSt(getInitialSyncState());
    window.addEventListener('storage', onStorage);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => {
      ch?.close();
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('keydown', esc);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const send = (u: Partial<DisplaySyncState>) => {
    const next = { ...st, ...u };
    setSt(next);
    broadcastDisplaySyncState(u);
  };
  const tabs = prefs.layout.order.filter((id) => !prefs.layout.hidden.includes(id)).map((id) => DISPLAY_TABS.find((t) => t.id === id)!);
  const mm = Math.floor((st.timerSeconds || 0) / 60);
  const ss = String((st.timerSeconds || 0) % 60).padStart(2, '0');

  return createPortal(
    <>
      <div className="fixed inset-0 z-[10000]" onClick={onClose} />
      <div className="dr-panel" role="dialog" aria-label="보조창 리모컨" data-display-remote>
        <div className="dr-head">
          <span className="dr-title">🎮 보조창 리모컨</span>
          <span className="dr-now">
            지금: <b>{DISPLAY_TABS.find((t) => t.id === st.activeTab)?.label || st.activeTab}</b>
            {st.isBlanked && <em> · 가림 중</em>}
          </span>
          <button type="button" className="dr-x" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <div className="dr-tabs">
          {tabs.map((t) => (
            <button key={t.id} type="button" className={`dr-tab ${st.activeTab === t.id ? 'is-on' : ''}`} onClick={() => send({ activeTab: t.id as any })}>
              <span className="text-lg">{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="dr-row">
          <button type="button" className={`dr-pill ${st.isBlanked ? 'is-warn' : ''}`} onClick={() => send({ isBlanked: !st.isBlanked })}>
            {st.isBlanked ? '👀 다시 보이기' : '🙈 잠깐 가리기'}
          </button>
          <button
            type="button"
            className={`dr-pill ${prefs.auto ? 'is-on' : ''}`}
            onClick={() => setAutoSwitch(!prefs.auto)}
            title={getBellSchedule().length ? '시정표 · 시간표에 맞춰 저절로 바뀌어요: 수업 전 아침 화면 → 수업 중 판서 → 쉬는 시간 → 마지막 수업 뒤 청소·종례' : '환경설정에 시정표를 넣으면 쓸 수 있어요'}
          >
            ⏱ 자동 전환 {prefs.auto ? 'ON' : 'OFF'}
          </button>
          <button type="button" className={`dr-pill ${prefs.touch ? 'is-on' : ''}`} onClick={() => setTouchMode(!prefs.touch)}>
            👆 터치 모드 {prefs.touch ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="dr-timer">
          <span className="dr-time">
            ⏱ {mm}:{ss}
          </span>
          {[1, 3, 5, 10].map((m) => (
            <button key={m} type="button" className="dr-pill" onClick={() => send({ activeTab: 'timer', timerSeconds: m * 60, isTimerRunning: true })}>
              {m}분
            </button>
          ))}
          <button type="button" className={`dr-pill ${st.isTimerRunning ? 'is-on' : ''}`} onClick={() => send({ isTimerRunning: !st.isTimerRunning })}>
            {st.isTimerRunning ? '⏸ 멈춤' : '▶ 시작'}
          </button>
        </div>

        {onOpenDisplay && (
          <button
            type="button"
            className="dr-open"
            onClick={() => {
              onOpenDisplay();
              onClose();
            }}
          >
            📺 보조창 열기
          </button>
        )}
      </div>
    </>,
    document.body
  );
};

export default DisplayRemote;
