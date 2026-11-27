import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Clock,
  BookOpen,
  Music,
  ArrowRight,
  Sparkles,
  Maximize2,
  Bell,
  Check,
  Edit3,
} from 'lucide-react';
import { DailySchedule, ClassConfig, PeriodItem } from '../types';
import { weeklySchedule } from '../data/initialData';
import { playSelectedChime } from '../utils/audio';
import { broadcastDisplaySyncState } from './DualMonitorDisplayView';
import { computeNextLesson, detailAt, lessonInfo } from '../utils/nextLesson';

interface BreakModeViewProps {
  schedule?: DailySchedule;
  config?: ClassConfig;
  breakDurationMinutes?: number;
  onExitBreakMode?: () => void;
  onSwitchToLesson?: () => void;
  onOpenSecondaryPopup?: () => void;
  onShowToast: (msg: string) => void;
}

export const BreakModeView: React.FC<BreakModeViewProps> = ({
  schedule = weeklySchedule,
  config,
  breakDurationMinutes = 10,
  onExitBreakMode,
  onSwitchToLesson,
  onOpenSecondaryPopup = () => {},
  onShowToast,
}) => {
  const handleExit = onSwitchToLesson || onExitBreakMode || (() => {});
  // Timer State (default 10 mins = 600s)
  const [timeLeft, setTimeLeft] = useState<number>(breakDurationMinutes * 60);
  const [isRunning, setIsRunning] = useState<boolean>(true);

  // Decibel simulation with fluctuation
  const [decibel, setDecibel] = useState<number>(45);

  // Clock
  const [clockStr, setClockStr] = useState({
    time: '10:30',
    sec: '00',
    date: '3월 25일 (수)',
    dayKey: '수',
  });

  // Selected Next Period (1~6교시) - defaults to 2 or inferred from time
  const [selectedPeriod, setSelectedPeriod] = useState<number>(() => {
    try {
      const r = computeNextLesson(new Date());
      return r.kind === 'lesson' ? r.lesson.period : 2;
    } catch {
      return 2;
    }
  });

  // Teacher-customized announcements & supplies (요구사항 5: [알림 및 준비물] 텍스트 박스)
  const [announcementText, setAnnouncementText] = useState<string>(() => {
    return (
      localStorage.getItem('break_mode_announcement') ||
      '수학책, 수학익힘책 38~41쪽, 연필, 지우개, 자 준비'
    );
  });
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  // 📝 보조 화면에서 고친 안내 문구를 바로 받아요
  useEffect(() => {
    const on = (e: StorageEvent) => {
      if (e.key === 'break_mode_announcement' && e.newValue != null) setAnnouncementText(e.newValue);
    };
    window.addEventListener('storage', on);
    return () => window.removeEventListener('storage', on);
  }, []);

  // Clock timer & Day-of-week detection
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      const month = now.getMonth() + 1;
      const date = now.getDate();
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      const dayIndex = now.getDay();
      // 시간표는 '월 · 화 · 수 · 목 · 금' 한글 요일로 저장돼요
      const validDayKey = dayIndex >= 1 && dayIndex <= 5 ? days[dayIndex] : '월';

      setClockStr({
        time: `${h}:${m}`,
        sec: s,
        date: `${month}월 ${date}일 (${days[dayIndex]})`,
        dayKey: validDayKey,
      });
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync with timetable: Get subject for selectedPeriod on current day
  const dayKeyKo = ['월', '화', '수', '목', '금'].includes(clockStr.dayKey) ? clockStr.dayKey : '월';
  const todaySchedule: PeriodItem[] = schedule[dayKeyKo] || [];
  const currentNextPeriodItem = todaySchedule.find((p) => Number(p.period) === selectedPeriod) || {
    period: selectedPeriod,
    subject: '수업',
    color: 'bg-blue-500',
  };

  // 보조화면이 '시간표 자동'이면 주간학습안내의 학습 내용 · 쪽수로, 아니면 선생님이 쓴 안내 문구로
  const breakAuto = (() => {
    try {
      return localStorage.getItem('class_break_next_auto') !== 'manual';
    } catch {
      return true;
    }
  })();
  const autoDetail = breakAuto ? detailAt(new Date(), dayKeyKo, selectedPeriod, currentNextPeriodItem.subject) : { topic: '', pages: '' };
  const nextPeriodString = breakAuto
    ? lessonInfo(selectedPeriod, currentNextPeriodItem.subject, autoDetail.topic, autoDetail.pages)
    : `${selectedPeriod}교시 [${currentNextPeriodItem.subject}]${announcementText ? ` • ${announcementText}` : ''}`;

  const syncToSecondary = (updates?: { timerSeconds?: number; isRunning?: boolean }) => {
    const validSecs =
      updates?.timerSeconds !== undefined && !isNaN(updates.timerSeconds)
        ? updates.timerSeconds
        : !isNaN(timeLeft) && timeLeft >= 0
        ? timeLeft
        : 600;

    broadcastDisplaySyncState({
      activeTab: 'break',
      breakTimerSeconds: validSecs,
      isBreakTimerRunning: updates?.isRunning !== undefined ? updates.isRunning : isRunning,
      breakNextPeriod: selectedPeriod,
      breakNextSubject: currentNextPeriodItem.subject,
      breakAnnouncement: announcementText,
      nextPeriodInfo: nextPeriodString,
    });
  };

  // Sync state whenever nextPeriodString or announcementText changes
  useEffect(() => {
    syncToSecondary();
  }, [nextPeriodString, announcementText, selectedPeriod]);

  // Two-way sync with BroadcastChannel
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const channel = new BroadcastChannel('class_display_sync_channel');
    channel.onmessage = (e) => {
      const data = e.data;
      if (data && typeof data.breakTimerSeconds === 'number' && !isNaN(data.breakTimerSeconds)) {
        setTimeLeft(data.breakTimerSeconds);
      }
      if (data && typeof data.isBreakTimerRunning === 'boolean') {
        setIsRunning(data.isBreakTimerRunning);
      }
    };
    return () => channel.close();
  }, []);

  // Break Countdown Timer
  useEffect(() => {
    let timer: number;
    if (isRunning && timeLeft > 0) {
      timer = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            playSelectedChime('school_4tone');
            syncToSecondary({ timerSeconds: 0, isRunning: false });
            onShowToast('🔔 쉬는 시간이 종료되었습니다! 다음 교시 수업을 준비하세요.');
            return 0;
          }
          const next = prev - 1;
          if (next % 5 === 0 || next <= 10) {
            syncToSecondary({ timerSeconds: next, isRunning: true });
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, onShowToast]);

  // Decibel animation simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setDecibel(Math.floor(40 + Math.random() * 25));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleToggleRunning = () => {
    const nextRunning = !isRunning;
    setIsRunning(nextRunning);
    syncToSecondary({ isRunning: nextRunning, timerSeconds: timeLeft });
  };

  const handleReset = () => {
    const resetTime = breakDurationMinutes * 60;
    setTimeLeft(resetTime);
    setIsRunning(false);
    syncToSecondary({ timerSeconds: resetTime, isRunning: false });
    onShowToast('⏱️ 쉬는시간 타이머가 초기화되었습니다.');
  };

  const handleAnnouncementChange = (val: string) => {
    setAnnouncementText(val);
    localStorage.setItem('break_mode_announcement', val);
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 1500);
  };

  const QUICK_SUPPLIES_PRESETS = [
    '수학책, 수학익힘책 및 필기도구',
    '체육복 착용 및 운동장/강당 집합',
    '미술 준비물(도화지, 물감, 붓, 물통)',
    '모둠 활동지 및 색연필, 가위, 풀',
    '음악 리코더 및 악보집',
  ];

  const progressPercent = Math.max(
    0,
    Math.min(100, ((breakDurationMinutes * 60 - timeLeft) / (breakDurationMinutes * 60)) * 100)
  );

  return (
    <div className="w-full bg-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-2xl border-2 border-indigo-500/30 flex flex-col gap-5 animate-fade-in">
      {/* TOP CENTER: Prominent Next Class Information Synced with Timetable & Teacher Notice Box (요구사항 5) */}
      <div className="w-full bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border-2 border-indigo-500/50 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col items-center text-center relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-96 h-28 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none" />

        {/* Action Controls in Top Bar */}
        <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-indigo-800/50 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl animate-bounce">🔔</span>
            <span className="text-xs font-black tracking-widest text-indigo-300 uppercase">
              NEXT CLASS PREPARATION
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSecondaryPopup}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="보조 모니터 팝업 창으로 송출"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">보조 모니터 송출</span>
            </button>
            <button
              onClick={handleExit}
              className="px-3.5 py-1.5 rounded-xl bg-white text-indigo-950 hover:bg-indigo-50 text-xs font-black transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
            >
              <span>수업 모드로 복귀</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Center Display: Next Period & Subject Linked with Timetable */}
        <div className="my-1 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2 flex-wrap justify-center">
            <span className="text-xs font-bold text-indigo-300">시간표 연동 교시 선택:</span>
            {[1, 2, 3, 4, 5, 6].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setSelectedPeriod(p);
                  const found = todaySchedule.find((item) => item.period === p);
                  onShowToast(`📚 다음 수업이 [${p}교시 ${found ? found.subject : '수업'}]으로 시간표와 연동되었습니다.`);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  selectedPeriod === p
                    ? 'bg-amber-400 text-slate-950 shadow-md scale-105'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {p}교시
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow-md">
            <span className="text-amber-300">다음 {selectedPeriod}교시:</span>
            <span className="px-3.5 py-1 rounded-2xl bg-indigo-600/90 border border-indigo-400 shadow-lg text-white">
              {currentNextPeriodItem.subject}
            </span>
            <span className="text-xs sm:text-sm font-bold text-indigo-200 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-indigo-700">
              {clockStr.date}
            </span>
          </div>
        </div>

        {/* Teacher Editable [알림 및 준비물] Text Box (요구사항 5) */}
        <div className="w-full max-w-3xl mt-4 p-4 bg-slate-900/90 rounded-2xl border-2 border-indigo-400/60 shadow-inner flex flex-col gap-2.5 text-left">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-amber-300 flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5" />
              <span>[알림 및 준비물] 교사 입력창</span>
            </label>
            {isSavedNotice && (
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-3 h-3" /> 자동 저장됨
              </span>
            )}
          </div>

          <textarea
            rows={2}
            value={announcementText}
            onChange={(e) => handleAnnouncementChange(e.target.value)}
            placeholder="다음 교시 학생들에게 전할 준비물이나 안내 사항을 입력하세요... (예: 수학익힘책 34쪽, 각도기 준비)"
            className="w-full p-2.5 bg-slate-950 border border-indigo-500/40 rounded-xl text-white text-xs sm:text-sm font-semibold outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition resize-none placeholder-slate-500"
          />

          {/* Quick Preset Badges */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[10px] text-slate-400 font-bold">빠른 입력:</span>
            {QUICK_SUPPLIES_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAnnouncementChange(preset)}
                className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-indigo-900 text-indigo-200 text-[10px] font-medium border border-slate-700 transition cursor-pointer"
              >
                + {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2-Split Screen Layout: Left Clock & Sound Level vs Right Break Countdown Timer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        {/* LEFT COLUMN: Clock & Sound Noise Level */}
        <div className="bg-slate-800/80 rounded-3xl p-6 border border-slate-700/80 flex flex-col justify-between gap-5 shadow-inner">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-sky-400" />
              <span className="font-extrabold text-sm text-slate-200">현재 시각 및 날짜</span>
            </div>
            <span className="text-xs text-sky-300 font-bold bg-sky-950/60 border border-sky-800/80 px-2.5 py-0.5 rounded-full">
              {clockStr.date}
            </span>
          </div>

          {/* Huge Digital Clock */}
          <div className="text-center py-3">
            <div className="font-mono text-5xl sm:text-7xl font-black tracking-tight text-white flex items-baseline justify-center gap-2">
              <span>{clockStr.time}</span>
              <span className="text-2xl sm:text-3xl text-emerald-400 font-bold">
                {clockStr.sec}
              </span>
            </div>
            <div className="text-xs text-slate-400 font-medium mt-1">
              한국 표준시 (KST) 실시간 연동
            </div>
          </div>

          {/* Real-time Decibel Sound Bar */}
          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-300">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>교실 소음 측정 (데시벨)</span>
              </div>
              <div className="font-black text-emerald-400 tabular-nums text-sm">
                {decibel} dB
              </div>
            </div>

            <div className="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  decibel > 75
                    ? 'bg-rose-500'
                    : decibel > 60
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(100, (decibel / 100) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>정숙 (0~45dB)</span>
              <span>적정 (45~65dB)</span>
              <span>주의 (65dB+)</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Big Break Countdown Timer */}
        <div className="bg-gradient-to-br from-indigo-950/90 to-purple-950/80 rounded-3xl p-6 border border-indigo-500/40 flex flex-col justify-between gap-5 shadow-inner relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-indigo-800/60">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-pink-400" />
              <span className="font-extrabold text-sm text-indigo-100">
                쉬는 시간 카운트다운 타이머
              </span>
            </div>
            <span className="text-xs font-black px-3 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
              {isRunning ? '⏳ 휴식 진행 중' : '⏸️ 일시 정지'}
            </span>
          </div>

          {/* Huge Timer Digits */}
          <div className="text-center py-2">
            <div className="text-[11px] font-bold text-indigo-300 tracking-wider mb-1">
              REMAINING BREAK TIME
            </div>
            <div className="font-mono text-6xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-pink-300 to-indigo-200 tabular-nums">
              {formatTime(timeLeft)}
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-indigo-900/60 h-2.5 rounded-full mt-3 overflow-hidden p-0.5 border border-indigo-700/60">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-amber-400 rounded-full transition-all duration-1000"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Control Buttons */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={handleToggleRunning}
              className={`py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer ${
                isRunning
                  ? 'bg-amber-500 hover:bg-amber-600 text-amber-950'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isRunning ? '일시 정지' : '타이머 시작'}</span>
            </button>

            <button
              onClick={handleReset}
              className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer border border-slate-700"
            >
              <RotateCcw className="w-4 h-4" />
              <span>타이머 리셋</span>
            </button>

            <button
              onClick={() => {
                playSelectedChime('bell_ding');
                onShowToast('🛎️ 맑은 알림 차임벨이 교실에 울렸습니다.');
              }}
              className="py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-md"
            >
              <Music className="w-4 h-4" />
              <span>차임벨 울리기</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
