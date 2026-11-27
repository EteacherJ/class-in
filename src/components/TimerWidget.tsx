import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';
import { playTimerSound, useTimerAlert, TIMER_SOUNDS, type TimerSoundId } from '../utils/timerAlerts';

import { TIMER_TOGGLE_EVENT } from '../constants/shortcuts';
import { publishLiveTimer } from '../utils/island';
interface TimerWidgetProps {
  onShowToast: (msg: string) => void;
}

export const TimerWidget: React.FC<TimerWidgetProps> = ({ onShowToast }) => {
  const [activeTab, setActiveTab] = useState<'lesson' | 'recess'>('lesson');
  const [totalSeconds, setTotalSeconds] = useState<number>(300); // 5 min default
  const [remainingSeconds, setRemainingSeconds] = useState<number>(300);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  // 🔔 알림음 · 🔊 크기 (보조화면 타이머와 같은 설정을 함께 써요)
  const [alert, setAlert] = useTimerAlert();
  const soundOption = alert.endSound;

  const intervalRef = useRef<number | null>(null);
  const alertRef = useRef(alert);
  alertRef.current = alert;

  // Switch tabs
  const handleTabChange = (tab: 'lesson' | 'recess') => {
    setActiveTab(tab);
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (tab === 'lesson') {
      setTotalSeconds(300);
      setRemainingSeconds(300);
    } else {
      setTotalSeconds(600); // 10 minutes recess
      setRemainingSeconds(600);
    }
  };

  // Start / Pause
  // 🏝️ 다이내믹 아일랜드 실시간 현황
  useEffect(() => {
    publishLiveTimer({ source: 'timer', label: activeTab === 'lesson' ? '수업 타이머' : '쉬는 시간', running: isRunning && remainingSeconds > 0, secondsLeft: remainingSeconds });
  }, [isRunning, remainingSeconds, activeTab]);
  useEffect(() => () => publishLiveTimer({ source: 'timer', label: '수업 타이머', running: false, secondsLeft: 0 }), []);

  // ⌨️ Space 단축키 수신 (다른 타이머가 먼저 처리하면 무시)
  const toggleRef = useRef<() => void>(() => {});
  useEffect(() => {
    const onToggle = (e: Event) => {
      if (e.defaultPrevented) return;
      e.preventDefault();
      toggleRef.current();
    };
    window.addEventListener(TIMER_TOGGLE_EVENT, onToggle);
    return () => window.removeEventListener(TIMER_TOGGLE_EVENT, onToggle);
  }, []);

  const toggleTimer = () => {
    if (isRunning) {
      setIsRunning(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else {
      if (remainingSeconds <= 0) {
        setRemainingSeconds(totalSeconds || 300);
      }
      setIsRunning(true);
    }
  };
  toggleRef.current = toggleTimer;

  // Adjust time
  const adjustTime = (delta: number) => {
    setRemainingSeconds((prev) => {
      const next = Math.max(0, prev + delta);
      if (next > totalSeconds) {
        setTotalSeconds(next);
      }
      return next;
    });
  };

  const resetTimer = () => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRemainingSeconds(totalSeconds);
  };

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
            const a = alertRef.current;
            playTimerSound(a.endSound, a.volume, 2);
            onShowToast('🔔 타이머 설정 시간이 모두 종료되었습니다!');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, soundOption, onShowToast]);

  // Format time
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const progressPercent = totalSeconds > 0 ? Math.max(0, Math.min(100, (remainingSeconds / totalSeconds) * 100)) : 0;

  return (
    <section className="w-full h-full p-4 sm:p-5 flex flex-col justify-between overflow-hidden">
      {/* Segmented Mode Switcher */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="inline-flex p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => handleTabChange('lesson')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'lesson'
                ? 'bg-white text-[#7457F5] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            수업 타이머
          </button>
          <button
            onClick={() => handleTabChange('recess')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'recess'
                ? 'bg-white text-emerald-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            쉬는 시간 카운터
          </button>
        </div>

        <div className="flex items-center gap-1">
          <select
            value={soundOption}
            onChange={(e) => {
              setAlert({ endSound: e.target.value as TimerSoundId });
              playTimerSound(e.target.value as TimerSoundId, alert.volume);
            }}
            className="text-[11px] font-semibold bg-slate-50 border-0 rounded-lg py-1 px-2 text-slate-600 focus:ring-1 focus:ring-[#7457F5] cursor-pointer"
            title="끝날 때 울리는 소리"
          >
            {TIMER_SOUNDS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.emoji} {t.label}
              </option>
            ))}
          </select>
          {/* 🔊 소리 크기 */}
          <label className="flex items-center gap-1 text-[11px] font-bold text-slate-500" title="타이머 소리 크기 (보조화면 타이머와 같이 써요)">
            <span>{alert.volume <= 0 ? '🔇' : alert.volume < 0.5 ? '🔉' : '🔊'}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(alert.volume * 100)}
              onChange={(e) => setAlert({ volume: Number(e.target.value) / 100 })}
              onPointerUp={() => playTimerSound(alert.endSound === 'mute' ? 'xylo' : alert.endSound, alertRef.current.volume)}
              className="w-16 accent-[#7457F5] cursor-pointer"
              data-timer-volume
            />
            <span className="tabular-nums w-7">{Math.round(alert.volume * 100)}</span>
          </label>
        </div>
      </div>

      {/* Timer Display Block */}
      <div className="py-4 text-center">
        <div className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-1">
          {activeTab === 'lesson' ? '집중 수업 타임' : '신나는 쉬는 시간'}
        </div>
        <div className="font-mono tabular-nums text-6xl font-black text-[#292638] tracking-tight my-1 select-none">
          {formattedTime}
        </div>
        <div className="w-full max-w-xs mx-auto bg-slate-100 h-1.5 rounded-full overflow-hidden mt-3">
          <div
            className={`h-full transition-all duration-300 ${
              activeTab === 'lesson' ? 'bg-[#7457F5]' : 'bg-emerald-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Increments & Adjustments */}
      <div className="grid grid-cols-5 gap-1.5 mb-3.5">
        <button
          onClick={() => adjustTime(60)}
          className="py-1.5 rounded-xl bg-slate-100 hover:bg-[#E8E1FF]/50 text-slate-700 hover:text-[#7457F5] font-bold text-xs transition active:scale-95 cursor-pointer"
        >
          +1분
        </button>
        <button
          onClick={() => adjustTime(300)}
          className="py-1.5 rounded-xl bg-slate-100 hover:bg-[#E8E1FF]/50 text-slate-700 hover:text-[#7457F5] font-bold text-xs transition active:scale-95 cursor-pointer"
        >
          +5분
        </button>
        <button
          onClick={() => adjustTime(10)}
          className="py-1.5 rounded-xl bg-slate-100 hover:bg-[#E8E1FF]/50 text-slate-700 hover:text-[#7457F5] font-bold text-xs transition active:scale-95 cursor-pointer"
        >
          +10초
        </button>
        <button
          onClick={() => adjustTime(-60)}
          className="py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 font-bold text-xs transition active:scale-95 cursor-pointer"
        >
          -1분
        </button>
        <button
          onClick={resetTimer}
          className="py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition active:scale-95 cursor-pointer"
        >
          리셋
        </button>
      </div>

      {/* Primary Start / Pause Control (PDF 권장: 브랜드 보라색 #7457F5 통일) */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleTimer}
          className={`flex-1 py-3 text-white font-bold text-sm rounded-2xl shadow-md transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer ${
            isRunning
              ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
              : 'bg-[#7457F5] hover:bg-[#6243E8] shadow-[0_4px_16px_rgba(116,87,245,0.3)]'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-4 h-4 fill-white" />
              <span>일시 정지 (Space)</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>타이머 시작 (Space)</span>
            </>
          )}
        </button>
      </div>

    </section>
  );
};
