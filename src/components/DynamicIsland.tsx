import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ISLAND_EVENT,
  LIVE_TIMER_EVENT,
  IslandNotice,
  IslandTone,
  LiveTimerState,
  splitLeadingEmoji,
} from '../utils/island';

/**
 * 🏝️ 다이내믹 아일랜드 HUD (화면 위쪽 가운데)
 * - 시스템 알림: 알약이 쫀득하게 펼쳐졌다가 3~4초 뒤 접힘 (마우스를 올리면 유지, 누르면 닫힘)
 * - 실시간 현황: 타이머가 돌아가는 동안 작은 알약에 남은 시간 표시
 */

const TONE_ACCENT: Record<IslandTone, string> = {
  info: '#818cf8',
  success: '#2dd4bf',
  warning: '#fbbf24',
  danger: '#fb7185',
  lock: '#67e8f9',
};

const SPRING = { type: 'spring' as const, stiffness: 520, damping: 34, mass: 0.9 };

const formatClock = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export const DynamicIsland: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const [notice, setNotice] = useState<(IslandNotice & { id: number }) | null>(null);
  const [live, setLive] = useState<(LiveTimerState & { receivedAt: number }) | null>(null);
  const [now, setNow] = useState(Date.now());
  const hideTimer = useRef<number | null>(null);
  const hovering = useRef(false);

  // 알림 수신
  useEffect(() => {
    const onNotice = (e: Event) => {
      const detail = (e as CustomEvent<IslandNotice>).detail;
      if (!detail?.message) return;
      setNotice({ ...detail, id: Date.now() });
    };
    const onLive = (e: Event) => {
      const d = (e as CustomEvent<LiveTimerState>).detail;
      if (!d) return;
      setLive((prev) => {
        if (!d.running) return prev && prev.source === d.source ? null : prev;
        return { ...d, receivedAt: Date.now() };
      });
    };
    window.addEventListener(ISLAND_EVENT, onNotice);
    window.addEventListener(LIVE_TIMER_EVENT, onLive);
    return () => {
      window.removeEventListener(ISLAND_EVENT, onNotice);
      window.removeEventListener(LIVE_TIMER_EVENT, onLive);
    };
  }, []);

  // 자동 접힘
  useEffect(() => {
    if (!notice) return;
    const schedule = () => {
      hideTimer.current = window.setTimeout(() => {
        if (hovering.current) schedule();
        else setNotice(null);
      }, notice.durationMs ?? Math.min(5200, 2600 + notice.message.length * 35));
    };
    schedule();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [notice]);

  // 실시간 남은 시간 표시용 (실행 중일 때만 1초 갱신)
  useEffect(() => {
    if (!live) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [live]);

  const liveSeconds = live ? live.secondsLeft - (now - live.receivedAt) / 1000 : 0;
  const mode: 'hidden' | 'live' | 'notice' = notice ? 'notice' : live && liveSeconds > 0 ? 'live' : 'hidden';
  const { emoji, text } = notice ? splitLeadingEmoji(notice.message) : { emoji: null, text: '' };
  const accent = TONE_ACCENT[notice?.tone ?? 'info'];
  const transition = reduceMotion ? { duration: 0.15 } : SPRING;

  return createPortal(
    <div className="lg-island-anchor" aria-live="polite" aria-atomic="true">
      <AnimatePresence>
        {mode !== 'hidden' && (
          <motion.div
            key="island"
            layout
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.7, y: -10, transition: { duration: 0.22 } }}
            transition={transition}
            className={`lg-island ${mode === 'notice' ? 'is-expanded' : 'is-compact'}`}
            style={{ ['--island-accent' as any]: accent }}
            onMouseEnter={() => (hovering.current = true)}
            onMouseLeave={() => (hovering.current = false)}
            onClick={() => setNotice(null)}
            role={mode === 'notice' ? 'status' : undefined}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {mode === 'notice' ? (
                <motion.div
                  key={`n-${notice!.id}`}
                  layout="position"
                  initial={{ opacity: 0, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, filter: 'blur(6px)', transition: { duration: 0.12 } }}
                  transition={{ duration: 0.22, delay: reduceMotion ? 0 : 0.06 }}
                  className="lg-island-row"
                >
                  <span className="lg-island-icon" aria-hidden>
                    {notice!.icon || emoji || '🔔'}
                  </span>
                  <span className="lg-island-text">{notice!.icon && emoji ? `${emoji} ${text}` : text}</span>
                </motion.div>
              ) : (
                <motion.div
                  key="live"
                  layout="position"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  className="lg-island-row"
                >
                  <span className="lg-island-live-dot" aria-hidden />
                  <span className="lg-island-live-label">{live?.label}</span>
                  <span className="lg-island-live-time">{formatClock(liveSeconds)}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
};
