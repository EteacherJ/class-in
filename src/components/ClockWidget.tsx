import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Sparkles,
  Check,
  Play,
  Pause,
  RotateCcw,
  Timer,
  Maximize2,
  Minimize2,
  Palette,
  Plus,
  Minus,
  Sun,
  Moon,
} from 'lucide-react';
import { playClassicalTimerAlarm } from '../utils/audio';

import { TIMER_TOGGLE_EVENT } from '../constants/shortcuts';
import { publishLiveTimer } from '../utils/island';
export interface PomodoroColorOption {
  id: string;
  name: string;
  hex: string;
  glow: string;
  border: string;
  bgRgba: string;
}

export const POMO_COLOR_OPTIONS: PomodoroColorOption[] = [
  {
    id: 'rose',
    name: '클래식 로즈레드',
    hex: '#f43f5e',
    glow: 'rgba(244,63,94,0.35)',
    border: 'border-rose-500/40',
    bgRgba: 'rgba(244,63,94,0.15)',
  },
  {
    id: 'amber',
    name: '선셋 오렌지',
    hex: '#f59e0b',
    glow: 'rgba(245,158,11,0.35)',
    border: 'border-amber-500/40',
    bgRgba: 'rgba(245,158,11,0.15)',
  },
  {
    id: 'emerald',
    name: '포레스트 그린',
    hex: '#10b981',
    glow: 'rgba(16,185,129,0.35)',
    border: 'border-emerald-500/40',
    bgRgba: 'rgba(16,185,129,0.15)',
  },
  {
    id: 'sky',
    name: '네온 시안블루',
    hex: '#0ea5e9',
    glow: 'rgba(14,165,233,0.35)',
    border: 'border-sky-500/40',
    bgRgba: 'rgba(14,165,233,0.15)',
  },
  {
    id: 'purple',
    name: '라벤더 퍼플',
    hex: '#8b5cf6',
    glow: 'rgba(139,92,246,0.35)',
    border: 'border-purple-500/40',
    bgRgba: 'rgba(139,92,246,0.15)',
  },
  {
    id: 'pink',
    name: '체리 핑크',
    hex: '#ec4899',
    glow: 'rgba(236,72,153,0.35)',
    border: 'border-pink-500/40',
    bgRgba: 'rgba(236,72,153,0.15)',
  },
];

interface ClockWidgetProps {
  onShowToast?: (msg: string) => void;
  /** 스택 영역에 미니/컴팩트하게 렌더링될지 여부 */
  isStackMode?: boolean;
  /** 스택 영역에서 메인 캔버스로 펼치기 콜백 */
  onExpandToCanvas?: () => void;
  /** 메인 캔버스에서 스택 영역으로 접기 콜백 */
  onCollapseToStack?: () => void;
  /** 상단 헤더 더블클릭 시 독서 노트 위젯과 자리/스택 교대 */
  onSwapWithQuote?: () => void;
}

/**
 * 🍅 [뽀모도로 타이머 위젯]
 * - 상단: [시작/일시정지], [초기화] 콤팩트 버튼 배치 (제목 텍스트 생략)
 * - 원형 게이지 좌/우: [-], [+] 버튼으로 1분씩 즉각 증가/감소
 * - 하단 프리셋 및 분/초 입력창: [⚙️ 설정] 오버레이 내부로 이동하여 메인 화면 극대화 심플화
 * - 게이지 색상 선택: 텍스트 없이 컬러 칩만 심플하게 표시
 * - 기본 시작 시간 저장 메뉴: 설정에서 지정하면 새로고침/초기화 시 항상 그 시간으로 시작
 * - 타이머 중앙 원형 클릭 시: 플립시계와 100% 동일한 고급 아이보리/베이지 밝은 테마 vs 다크 테마 전환
 * - 상단 헤더 더블클릭 시: 좌측 스택 영역(유튜브 플레이어 상단) ↔ 메인 캔버스 상호 전환
 */
export const ClockWidget: React.FC<ClockWidgetProps> = ({
  onShowToast,
  isStackMode = false,
  onExpandToCanvas,
  onCollapseToStack,
  onSwapWithQuote,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);

  // 💡 설정 패널 외부 빈 영역 클릭 시 자동 닫힘
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        showSettings &&
        settingsPanelRef.current &&
        !settingsPanelRef.current.contains(e.target as Node) &&
        settingsButtonRef.current &&
        !settingsButtonRef.current.contains(e.target as Node)
      ) {
        setShowSettings(false);
      }
    };
    if (showSettings) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showSettings]);

  // 🎨 뽀모도로 배경 테마 (다크 vs 플립시계 동일 라이트 테마)
  const [pomoTheme, setPomoTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('class_pomo_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      const flipTheme = localStorage.getItem('smart_board_flip_clock_theme');
      if (flipTheme === 'light' || flipTheme === 'dark') return flipTheme;
    } catch {}
    return 'dark';
  });

  const isDark = pomoTheme === 'dark';

  // 테마 토글 (타이머 가운데 클릭 또는 설정에서 변경)
  const togglePomoTheme = () => {
    const nextTheme: 'dark' | 'light' = pomoTheme === 'dark' ? 'light' : 'dark';
    setPomoTheme(nextTheme);
    try {
      localStorage.setItem('class_pomo_theme', nextTheme);
    } catch {}
    onShowToast?.(
      nextTheme === 'light'
        ? '☀️ 뽀모도로 배경이 밝은 테마(플립시계 스타일)로 변경되었습니다.'
        : '🌙 뽀모도로 배경이 다크 테마로 변경되었습니다.'
    );
  };

  // ⚙️ 사용자가 설정한 기본 시작 시간 (초 단위, 기본 25분 = 1500초)
  const [defaultPomoSeconds, setDefaultPomoSeconds] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('class_pomo_default_seconds');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch {}
    return 25 * 60;
  });

  // --- 뽀모도로 타이머 상태 ---
  const [pomoTotalSeconds, setPomoTotalSeconds] = useState<number>(defaultPomoSeconds);
  const [pomoSecondsLeft, setPomoSecondsLeft] = useState<number>(defaultPomoSeconds);
  const [isPomoRunning, setIsPomoRunning] = useState<boolean>(false);
  const [inputMin, setInputMin] = useState<string>(() => String(Math.floor(defaultPomoSeconds / 60)));
  const [inputSec, setInputSec] = useState<string>(() => String(defaultPomoSeconds % 60).padStart(2, '0'));
  const pomoIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 🎨 뽀모도로 게이지 색상 상태 (기본값: rose)
  const [pomoColorId, setPomoColorId] = useState<string>(() => {
    return localStorage.getItem('class_pomo_gauge_color') || 'rose';
  });

  const activeColor =
    POMO_COLOR_OPTIONS.find((c) => c.id === pomoColorId) || POMO_COLOR_OPTIONS[0];

  const handleSavePomoColor = (colorId: string) => {
    setPomoColorId(colorId);
    localStorage.setItem('class_pomo_gauge_color', colorId);
    const selected = POMO_COLOR_OPTIONS.find((c) => c.id === colorId);
    onShowToast?.(`🎨 게이지 색상이 [${selected?.name}]로 변경되었습니다.`);
  };

  // 📐 뽀모도로 타이머 크기 조절 (auto | 80 | 100 | 120 | 140)
  const [pomoScale, setPomoScale] = useState<'auto' | '80' | '100' | '120' | '140'>(() => {
    return (localStorage.getItem('class_pomo_timer_scale') as any) || 'auto';
  });

  const handleSavePomoScale = (scale: 'auto' | '80' | '100' | '120' | '140') => {
    setPomoScale(scale);
    localStorage.setItem('class_pomo_timer_scale', scale);
    onShowToast?.(
      scale === 'auto'
        ? '📐 타이머 크기가 화면에 맞게 자동 조절됩니다.'
        : `📏 타이머 크기가 ${scale}%로 설정되었습니다.`
    );
  };

  // ⏱️ 카운트다운 인터벌
  useEffect(() => {
    if (isPomoRunning) {
      pomoIntervalRef.current = setInterval(() => {
        setPomoSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(pomoIntervalRef.current!);
            setIsPomoRunning(false);
            // 🎻 뽀모도로 완료 시 클래식 알람 멜로디 재생
            playClassicalTimerAlarm();
            onShowToast?.('🔔 뽀모도로 집중 시간이 완료되었습니다! 잠시 휴식하세요. (🎻 클래식 알람)');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (pomoIntervalRef.current) {
      clearInterval(pomoIntervalRef.current);
    }
    return () => {
      if (pomoIntervalRef.current) clearInterval(pomoIntervalRef.current);
    };
  }, [isPomoRunning, onShowToast]);

  const handleStartPomo = () => {
    if (pomoSecondsLeft === 0) {
      setPomoSecondsLeft(defaultPomoSeconds);
      setPomoTotalSeconds(defaultPomoSeconds);
    }
    setIsPomoRunning(true);
    onShowToast?.('▶ 뽀모도로 타이머가 시작되었습니다.');
  };

  // 🏝️ 다이내믹 아일랜드 실시간 현황: 뽀모도로가 도는 동안 남은 시간 표시
  useEffect(() => {
    publishLiveTimer({ source: 'pomodoro', label: '뽀모도로', running: isPomoRunning && pomoSecondsLeft > 0, secondsLeft: pomoSecondsLeft });
  }, [isPomoRunning, pomoSecondsLeft]);
  useEffect(() => () => publishLiveTimer({ source: 'pomodoro', label: '뽀모도로', running: false, secondsLeft: 0 }), []);

  // ⌨️ Space 단축키: 타이머 시작/일시정지 (여러 타이머 중 먼저 응답한 하나만 동작)
  const pomoToggleRef = useRef<() => void>(() => {});
  useEffect(() => {
    const onToggle = (e: Event) => {
      if (e.defaultPrevented) return;
      e.preventDefault();
      pomoToggleRef.current();
    };
    window.addEventListener(TIMER_TOGGLE_EVENT, onToggle);
    return () => window.removeEventListener(TIMER_TOGGLE_EVENT, onToggle);
  }, []);

  const handlePausePomo = () => {
    setIsPomoRunning(false);
    onShowToast?.('⏸ 타이머가 일시정지되었습니다.');
  };

  pomoToggleRef.current = () => (isPomoRunning ? handlePausePomo() : handleStartPomo());

  const handleResetPomo = () => {
    setIsPomoRunning(false);
    setPomoSecondsLeft(defaultPomoSeconds);
    setPomoTotalSeconds(defaultPomoSeconds);
    onShowToast?.('↺ 뽀모도로 타이머가 기본 시간으로 초기화되었습니다.');
  };

  // ➕ 1분 추가 버튼 (+1분)
  const handleIncreaseOneMinute = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPomoSecondsLeft((prev) => {
      const next = prev + 60;
      setPomoTotalSeconds((tot) => Math.max(tot, next));
      return next;
    });
    onShowToast?.('⏱️ +1분 추가되었습니다.');
  };

  // ➖ 1분 감소 버튼 (-1분)
  const handleDecreaseOneMinute = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPomoSecondsLeft((prev) => {
      if (prev <= 60) {
        onShowToast?.('⚠️ 최소 1분 이상이어야 합니다.');
        return Math.max(10, prev);
      }
      return prev - 60;
    });
    onShowToast?.('⏱️ -1분 감소되었습니다.');
  };

  // ⭐ 기본 시간 설정 저장 핸들러
  const handleSaveDefaultTime = (minutes: number, seconds: number = 0) => {
    const totalSec = Math.max(10, minutes * 60 + seconds);
    setDefaultPomoSeconds(totalSec);
    try {
      localStorage.setItem('class_pomo_default_seconds', String(totalSec));
    } catch {}
    if (!isPomoRunning) {
      setPomoTotalSeconds(totalSec);
      setPomoSecondsLeft(totalSec);
    }
    setInputMin(String(minutes));
    setInputSec(String(seconds).padStart(2, '0'));
    const mStr = Math.floor(totalSec / 60);
    const sStr = totalSec % 60;
    onShowToast?.(`⭐ 기본 시작 시간이 [${mStr}분 ${sStr > 0 ? sStr + '초' : ''}]으로 저장되었습니다.`);
  };

  // 원형 게이지 비율 계산
  const ratio = pomoTotalSeconds > 0 ? pomoSecondsLeft / pomoTotalSeconds : 0;
  const deg = Math.round(ratio * 360);
  const pMin = String(Math.floor(pomoSecondsLeft / 60)).padStart(2, '0');
  const pSec = String(pomoSecondsLeft % 60).padStart(2, '0');

  // 스택 모드 및 배율에 따른 크기 클래스 산출
  const getGaugeClass = () => {
    if (isStackMode) {
      return 'w-24 h-24 sm:w-28 sm:h-28 aspect-square';
    }
    switch (pomoScale) {
      case '80':
        return 'w-24 h-24 sm:w-28 sm:h-28';
      case '100':
        return 'w-28 h-28 sm:w-32 sm:h-32';
      case '120':
        return 'w-36 h-36 sm:w-40 sm:h-40';
      case '140':
        return 'w-44 h-44 sm:w-48 sm:h-48';
      case 'auto':
      default:
        return 'w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 max-w-[200px] aspect-square';
    }
  };

  const getInnerClass = () => {
    if (isStackMode) {
      return 'w-18 h-18 text-lg';
    }
    switch (pomoScale) {
      case '80':
        return 'w-18 h-18 sm:w-20 sm:h-20 text-lg sm:text-xl';
      case '100':
        return 'w-20 h-20 sm:w-24 sm:h-24 text-xl sm:text-2xl';
      case '120':
        return 'w-26 h-26 sm:w-30 sm:h-30 text-2xl sm:text-3xl';
      case '140':
        return 'w-32 h-32 sm:w-36 sm:h-36 text-3xl sm:text-4xl';
      case 'auto':
      default:
        return 'w-[74%] h-[74%] text-xl sm:text-2xl';
    }
  };

  return (
    <div
      className={`relative w-full h-full flex flex-col justify-between rounded-2xl select-none transition-all duration-300 overflow-hidden ${
        isStackMode ? 'min-h-[210px] h-[210px] max-h-[210px]' : ''
      } ${
        isDark
          ? 'bg-[#101a2d] border border-[#1e2c44] text-[#f8fafc] shadow-md p-2.5 sm:p-3'
          : 'bg-[#faf7ee] border border-[#e7e1ce] text-stone-800 shadow-stone-300/40 p-2.5 sm:p-3'
      }`}
    >
      {/* ========================================================================= */}
      {/* 1. 상단 툴바: [시작/일시정지] [초기화] 콤팩트 버튼 배치 (제목 텍스트 생략)     */}
      {/* ========================================================================= */}
      <div
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (isStackMode) {
            console.log('🔵 [ClockWidget] 뽀모도로 헤더 더블클릭 감지 -> 메인 캔버스로 펼치기 실행');
            if (onExpandToCanvas) {
              onExpandToCanvas();
            }
          } else {
            console.log('🔵 [ClockWidget] 뽀모도로 헤더 더블클릭 감지 -> 좌측 스택 영역(유튜브 상단)으로 이동 실행');
            if (onCollapseToStack) {
              onCollapseToStack();
            }
          }
        }}
        title={
          isStackMode
            ? '💡 상단 헤더를 더블클릭하면 메인 화면으로 펼쳐집니다.'
            : '💡 상단 헤더를 더블클릭하면 좌측 스택 영역(유튜브 플레이어 상단)으로 이동합니다.'
        }
        className={`flex items-center justify-between mb-2 pb-1.5 border-b shrink-0 cursor-pointer group/clock-header ${
          isDark ? 'border-[#1e2c44]' : 'border-[#e7e1ce]'
        }`}
      >
        {/* 좌측: 타이머 아이콘 뱃지 + 시작/일시정지 + 초기화 버튼 */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <div
            className="p-1 rounded-lg text-white flex items-center justify-center shrink-0 shadow-xs"
            style={{ backgroundColor: activeColor.hex }}
            title={
              isStackMode
                ? '뽀모도로 타이머 (더블클릭 시 메인 화면으로 복원)'
                : '뽀모도로 타이머 (더블클릭 시 좌측 스택 영역으로 이동)'
            }
          >
            <Timer className="w-3.5 h-3.5" />
          </div>

          {/* [시작 / 일시정지] 버튼 */}
          {isPomoRunning ? (
            <button
              type="button"
              onClick={handlePausePomo}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-1 shadow-xs transition cursor-pointer active:scale-95"
              title="타이머 일시정지"
            >
              <Pause className="w-3 h-3 fill-current" />
              <span>일시정지</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartPomo}
              className="px-2.5 py-1 rounded-lg text-white font-black text-xs flex items-center gap-1 shadow-xs transition cursor-pointer active:scale-95"
              style={{ backgroundColor: activeColor.hex }}
              title="타이머 시작"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>시작</span>
            </button>
          )}

          {/* [초기화] 버튼 */}
          <button
            type="button"
            onClick={handleResetPomo}
            className={`px-2 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer active:scale-95 ${
              isDark
                ? 'bg-[#0c1424] hover:bg-[#142036] text-slate-200 border border-[#1e2c44]'
                : 'bg-[#fbfaf5] hover:bg-[#ede8d8] text-stone-700 border border-[#e2dec9]'
            }`}
            title="기본 시간으로 초기화"
          >
            <RotateCcw className="w-3 h-3" />
            <span>초기화</span>
          </button>
        </div>

        {/* 우측: 캔버스/스택 이동 & ⚙️ 설정 */}
        <div className="flex items-center gap-1">
          {/* ↔️ 스택 ↔ 캔버스 상호 이동 버튼 */}
          {isStackMode && onExpandToCanvas && (
            <button
              type="button"
              onClick={onExpandToCanvas}
              className={`p-1 rounded-lg transition cursor-pointer ${
                isDark
                  ? 'text-slate-400 hover:text-white hover:bg-[#16233b]'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-200'
              }`}
              title="메인 캔버스 영역으로 펼치기"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}

          {!isStackMode && onCollapseToStack && (
            <button
              type="button"
              onClick={onCollapseToStack}
              className={`p-1 rounded-lg transition cursor-pointer ${
                isDark
                  ? 'text-slate-400 hover:text-white hover:bg-[#16233b]'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-200'
              }`}
              title="스택 보관함으로 접기"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* ⚙️ 색상 및 설정 버튼 */}
          <button
            ref={settingsButtonRef}
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1 rounded-lg transition cursor-pointer shrink-0 ${
              showSettings
                ? 'bg-sky-500 text-white shadow-sm'
                : isDark
                ? 'text-slate-400 hover:text-white hover:bg-[#101a2d]'
                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-200'
            }`}
            title="뽀모도로 시간 설정 및 색상 변경"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. 본체: 원형 게이지 & 좌우 [ - ] [ + ] 1분 조절 버튼                        */}
      {/* ========================================================================= */}
      <div className="flex-1 flex items-center justify-center my-auto py-2 z-10 w-full">
        <div className="flex items-center justify-center gap-2 sm:gap-3 w-full px-1">
          {/* ➖ [-] 1분 감소 버튼 */}
          <button
            type="button"
            onClick={handleDecreaseOneMinute}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-black transition cursor-pointer shadow-sm active:scale-90 ${
              isDark
                ? 'bg-[#0c1424] hover:bg-[#16233b] text-slate-200 border border-[#1e2c44]'
                : 'bg-[#fbfaf5] hover:bg-[#ede8d8] text-stone-800 border border-[#e2dec9]'
            }`}
            title="1분 감소 (-1분)"
          >
            <Minus className="w-4 h-4" strokeWidth={2.5} />
          </button>

          {/* 구글 타이머 원형 게이지 (동적 conic-gradient & 플립시계 테마 일치 중앙 카드: 클릭 시 테마 토글) */}
          <div
            onClick={togglePomoTheme}
            title="타이머를 클릭하면 플립시계와 동일한 밝은/어두운 테마로 변경됩니다"
            className="relative flex items-center justify-center shrink-0 cursor-pointer group/gauge"
          >
            <div
              className={`relative ${getGaugeClass()} rounded-full border-4 shadow-lg flex items-center justify-center transition-all duration-300 group-hover/gauge:scale-[1.02] active:scale-95`}
              style={{
                borderColor: `${activeColor.hex}66`,
                boxShadow: `0 0 18px ${activeColor.glow}`,
                background: `conic-gradient(${activeColor.hex} 0deg ${deg}deg, ${
                  isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
                } ${deg}deg 360deg)`,
              }}
            >
              {/* 눈금 라벨 */}
              <span
                className={`absolute top-1 z-10 font-mono text-[8px] sm:text-[9px] font-black drop-shadow-sm select-none ${
                  isDark ? 'text-white/90' : 'text-stone-700'
                }`}
              >
                60
              </span>
              <span
                className={`absolute right-1.5 z-10 font-mono text-[8px] sm:text-[9px] font-black drop-shadow-sm select-none ${
                  isDark ? 'text-white/90' : 'text-stone-700'
                }`}
              >
                15
              </span>
              <span
                className={`absolute bottom-1 z-10 font-mono text-[8px] sm:text-[9px] font-black drop-shadow-sm select-none ${
                  isDark ? 'text-white/90' : 'text-stone-700'
                }`}
              >
                30
              </span>
              <span
                className={`absolute left-1.5 z-10 font-mono text-[8px] sm:text-[9px] font-black drop-shadow-sm select-none ${
                  isDark ? 'text-white/90' : 'text-stone-700'
                }`}
              >
                45
              </span>

              {/* 🕒 시간을 안전하게 보호하는 중앙 원형 카드 */}
              <div
                className={`relative z-20 rounded-full border-2 flex flex-col items-center justify-center shadow-xl select-none transition-transform group-hover/gauge:scale-105 ${
                  isDark
                    ? 'bg-[#0a1120] border-[#1e2c44] text-white'
                    : 'bg-[#f4efe0] border-[#e2dec9] text-stone-900'
                } ${getInnerClass()}`}
              >
                <span className="font-mono font-black tracking-tight drop-shadow-sm">
                  {pMin}:{pSec}
                </span>
                <span
                  className="text-[9px] sm:text-[10px] font-bold tracking-wide mt-0.5"
                  style={{ color: activeColor.hex }}
                >
                  {isPomoRunning ? '● 집중 중' : '대기'}
                </span>
              </div>
            </div>
          </div>

          {/* ➕ [+] 1분 추가 버튼 */}
          <button
            type="button"
            onClick={handleIncreaseOneMinute}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-black transition cursor-pointer shadow-sm active:scale-90 ${
              isDark
                ? 'bg-[#0c1424] hover:bg-[#16233b] text-slate-200 border border-[#1e2c44]'
                : 'bg-[#fbfaf5] hover:bg-[#ede8d8] text-stone-800 border border-[#e2dec9]'
            }`}
            title="1분 추가 (+1분)"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. [⚙️ 설정 패널]: 색상 팔레트, 기본 시간 설정 및 사용자 시간 입력창 이동  */}
      {/* ========================================================================= */}
      {showSettings && (
        <div
          ref={settingsPanelRef}
          className={`absolute inset-x-2 top-11 bottom-2 z-40 p-3 rounded-2xl overflow-y-auto space-y-3 animate-in fade-in zoom-in-95 duration-150 text-xs shadow-2xl ${
            isDark
              ? 'bg-[#0a1120]/95 backdrop-blur-xl border border-[#1e2c44] text-slate-200'
              : 'bg-[#faf7ee]/95 backdrop-blur-xl border border-[#e7e1ce] text-stone-800'
          }`}
        >
          {/* 설정 헤더 */}
          <div
            className={`flex items-center justify-between pb-1.5 border-b ${
              isDark ? 'border-[#1e2c44]' : 'border-[#e7e1ce]'
            }`}
          >
            <span className="font-bold text-sky-500 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              뽀모도로 타이머 설정
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setShowSettings(false);
                  onShowToast?.('✓ 뽀모도로 설정이 저장되었습니다.');
                }}
                className="px-2 py-0.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition"
                title="설정 저장 및 닫기"
              >
                <Check className="w-3 h-3" strokeWidth={2.5} />
                <span>완료</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-slate-200 font-bold p-1 cursor-pointer text-xs"
                title="닫기"
              >
                ✕
              </button>
            </div>
          </div>

          {/* A. 🎨 타이머 게이지 색상 (이름 삭제, 색상 칩만 심플하게 표시) */}
          <div>
            <label className="text-[11px] font-bold opacity-75 flex items-center gap-1 mb-1.5">
              <Palette className="w-3 h-3 text-rose-400" />
              <span>타이머 게이지 색상</span>
            </label>
            <div
              className={`flex items-center justify-between gap-1.5 p-1 rounded-xl border ${
                isDark
                  ? 'bg-[#070c18] border-[#1e2c44]'
                  : 'bg-white/80 border-[#e2dec9]'
              }`}
            >
              {POMO_COLOR_OPTIONS.map((c) => {
                const isSelected = pomoColorId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSavePomoColor(c.id)}
                    title={c.name}
                    className={`flex-1 h-7 rounded-lg transition-transform cursor-pointer flex items-center justify-center relative ${
                      isSelected
                        ? 'scale-110 shadow-md ring-2 ring-white dark:ring-sky-400'
                        : 'opacity-75 hover:opacity-100 hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-white drop-shadow-md stroke-[3]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* B. ⭐ 기본 시작 시간 설정 (새로고침 / 초기화 시 항상 시작할 시간) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold opacity-75">
                기본 시작 시간 설정 (항상 시작할 시간)
              </label>
              <span className="text-[10px] text-sky-500 font-bold">
                현재: {Math.floor(defaultPomoSeconds / 60)}분{' '}
                {defaultPomoSeconds % 60 > 0 ? (defaultPomoSeconds % 60) + '초' : ''}
              </span>
            </div>

            {/* 프리셋 버튼 6종 */}
            <div className="grid grid-cols-6 gap-1 mb-2">
              {[5, 10, 15, 25, 30, 45].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleSaveDefaultTime(m, 0)}
                  className={`py-1 rounded-lg text-[10px] font-bold transition cursor-pointer text-center border ${
                    defaultPomoSeconds === m * 60
                      ? 'bg-rose-500 border-rose-400 text-white font-black shadow-xs'
                      : isDark
                      ? 'bg-[#0c1424] border-[#1e2c44] text-slate-300 hover:bg-[#142036]'
                      : 'bg-white border-[#e2dec9] text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {m}분
                </button>
              ))}
            </div>

            {/* 사용자 직접 입력 창 & 저장 */}
            <div
              className={`flex items-center gap-1.5 text-[11px] p-1.5 rounded-xl border ${
                isDark
                  ? 'bg-[#070a14] border-[#1e2c44] text-slate-300'
                  : 'bg-white/80 border-[#e2dec9] text-stone-700'
              }`}
            >
              <input
                type="number"
                min="0"
                max="180"
                value={inputMin}
                onChange={(e) => setInputMin(e.target.value)}
                className={`w-9 rounded px-1 py-0.5 text-center font-mono font-bold focus:outline-none border ${
                  isDark
                    ? 'bg-[#101a2d] border-[#1e2c44] text-white focus:border-sky-400'
                    : 'bg-stone-50 border-stone-300 text-stone-900 focus:border-amber-500'
                }`}
                placeholder="분"
              />
              <span className="opacity-75">분</span>
              <input
                type="number"
                min="0"
                max="59"
                value={inputSec}
                onChange={(e) => setInputSec(e.target.value)}
                className={`w-9 rounded px-1 py-0.5 text-center font-mono font-bold focus:outline-none border ${
                  isDark
                    ? 'bg-[#101a2d] border-[#1e2c44] text-white focus:border-sky-400'
                    : 'bg-stone-50 border-stone-300 text-stone-900 focus:border-amber-500'
                }`}
                placeholder="초"
              />
              <span className="opacity-75">초</span>
              <button
                type="button"
                onClick={() => {
                  const m = Math.max(0, parseInt(inputMin, 10) || 0);
                  const s = Math.min(59, Math.max(0, parseInt(inputSec, 10) || 0));
                  handleSaveDefaultTime(m, s);
                }}
                className="ml-auto px-2 py-0.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-[10px] font-bold text-white transition cursor-pointer shadow-xs active:scale-95"
              >
                기본값 저장
              </button>
            </div>
          </div>

          {/* C. 🎨 배경 테마 모드 선택 (플립시계 스타일 연동) */}
          <div>
            <label className="text-[11px] font-bold opacity-75 block mb-1.5">
              배경 테마 스타일 (플립시계와 동일)
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (pomoTheme !== 'dark') togglePomoTheme();
                }}
                className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition cursor-pointer flex items-center justify-center gap-1.5 border ${
                  isDark
                    ? 'bg-[#0c1424] border-sky-400 text-sky-400 ring-1 ring-sky-400/50'
                    : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Moon className="w-3 h-3" />
                <span>어두운 테마 (다크)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pomoTheme !== 'light') togglePomoTheme();
                }}
                className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition cursor-pointer flex items-center justify-center gap-1.5 border ${
                  !isDark
                    ? 'bg-[#faf7ee] border-amber-500 text-amber-800 ring-1 ring-amber-500/50 font-black'
                    : 'bg-[#0c1424] border-[#1e2c44] text-slate-400 hover:bg-[#142036]'
                }`}
              >
                <Sun className="w-3 h-3 text-amber-500" />
                <span>밝은 테마 (플립시계)</span>
              </button>
            </div>
          </div>

          {/* D. 📏 타이머 원형 크기 (배율) 조절 */}
          <div>
            <label className="text-[11px] font-bold opacity-75 block mb-1.5">
              타이머 크기 (배율)
            </label>
            <div className="grid grid-cols-5 gap-1">
              {[
                { id: 'auto', label: '자동' },
                { id: '80', label: '80%' },
                { id: '100', label: '100%' },
                { id: '120', label: '120%' },
                { id: '140', label: '140%' },
              ].map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => handleSavePomoScale(sc.id as any)}
                  className={`py-1 rounded-xl text-[10px] font-bold transition cursor-pointer text-center border ${
                    pomoScale === sc.id
                      ? 'bg-rose-500 border-rose-400 text-white shadow-xs'
                      : isDark
                      ? 'border-[#1e2c44] bg-[#0c1424] text-slate-300 hover:bg-[#142036]'
                      : 'border-[#e2dec9] bg-white text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {sc.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
