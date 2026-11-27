import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MochiBody, MochiFace, useMochiTint, cycleMochiTint, setMochiTint, MOCHI_TINTS } from './MochiCharacter';
import {
  Sparkles,
  X,
  Volume2,
  VolumeX,
  Send,
  Calendar,
  UserCheck,
  Lightbulb,
  Timer,
  Palette,
  Lock,
  Search,
  MessageSquare,
  Bot,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Maximize2,
  Minimize2,
  Bell,
  Globe,
  Settings,
  Mic,
  MicOff,
  Sun,
  CloudRain,
  Snowflake,
  Zap,
  Smile,
  Check,
  Flame,
  Coffee,
  CheckCircle2,
  AlertCircle,
  Sliders,
} from 'lucide-react';
import { AgendaItem, Student, ClassConfig, DailySchedule, SchoolMealDay, DDayItem, SchedulePeriod, AttendanceStatus } from '../types';
import { getStoredGeminiApiKey } from '../utils/geminiApi';
import { getDayTypeInfo } from '../utils/koreanHolidays';
import { sampleSchoolMeals, initialDDays } from '../data/mealAndDDayData';
import { getTodayOrNextCommemorativeDay } from './Header';

import { LUMI_TOGGLE_EVENT } from '../constants/shortcuts';
import { isMotionPaused } from '../utils/motion';
/* ========================================================================= */
/* 🔊 Web Audio API 기반 루미 전용 귀여운 숏 효과음 (Chatter SFX)            */
/* ========================================================================= */
const playLumiSfx = (type: 'chatter' | 'dock' | 'magic' | 'pop' = 'chatter') => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'dock') {
      // 쏙 들어가는 귀여운 피치 다운 슬라이드 음
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
      return;
    }

    if (type === 'magic') {
      // 반짝이는 차임벨 효과
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
      return;
    }

    // 기본 챗 토크 효과음
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  } catch {}
};

/* ========================================================================= */
/* 🌟 1. 살아 움직이는 3D 네온 글로우 AI 캐릭터 '루미' (LumiOrbCharacter)     */
/* ========================================================================= */
export type LumiExpression = 'auto' | 'happy' | 'wink' | 'serious' | 'sleepy' | 'excited' | 'surprised' | 'love' | 'shy' | 'proud';
export type LumiWeatherType = 'sun' | 'rain' | 'snow' | 'thunder' | 'cloud';
export type LumiColorTheme = 'neon-indigo' | 'candy-violet' | 'cyber-cyan' | 'sunset-amber';

export type LumiOrbMotion = 'idle' | 'spin' | 'bounce' | 'wiggle' | 'sleep' | 'countdown-tremble' | 'celebrate' | 'wave' | 'dance' | 'float';

export type RumiStateType =
  | 'idle'
  | 'weather'
  | 'sleep'
  | 'dance'
  | 'curious'
  | 'countdown'
  | 'birthday'
  | 'dday';

export type LumiSpecialAccessory =
  | 'none'
  | 'headphones'    // 3. 유튜브 음악 재생: 헤드폰 착용 & 음표 파티클
  | 'party-hat'     // 6. 생일 축하: 고깔모자 & 콘페티
  | 'mask'          // 1. 미세먼지/흐림: 마스크
  | 'umbrella'      // 1. 비/눈: 투명 우산
  | 'question'      // 4. 대화창 오픈: 물음표(?)
  | 'lightbulb'     // 4. 답변 완료: 전구(💡)
  | 'stopwatch'     // 5. 10초 카운트다운: 스톱워치(⏱️)
  | 'dday-sign'     // 7. D-1 경고: 팻말(📋)
  | 'book'          // 8. 수업 시작: 스마트 책(📖)
  | 'shh'           // 9. 소음 경고: 쉿!(🤫)
  | 'magic-wand'    // 10. 발표자/칭찬: 별봉(🪄) & 별빛(✨)
  | 'sleepy-zzz';   // 2. 1분 유휴: Zzz 수면 파티클

interface LumiOrbCharacterProps {
  size?: 'sm' | 'md' | 'lg';
  isSpeaking?: boolean;
  colorTheme?: LumiColorTheme;
  glowIntensity?: 'low' | 'med' | 'high';
  expression?: LumiExpression;
  weatherType?: LumiWeatherType;
  motion?: LumiOrbMotion;
  accessory?: LumiSpecialAccessory;
  rumiState?: RumiStateType;
  onClick?: () => void;
  onDoubleClick?: () => void;
  className?: string;
}

export const LumiOrbCharacter: React.FC<LumiOrbCharacterProps> = ({
  size = 'md',
  isSpeaking = false,
  colorTheme = 'neon-indigo',
  glowIntensity = 'med',
  expression = 'auto',
  weatherType = 'sun',
  motion = 'idle',
  accessory = 'none',
  rumiState = 'idle',
  onClick,
  onDoubleClick,
  className = '',
}) => {
  const orbRef = useRef<HTMLDivElement | null>(null);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [isLocalWink, setIsLocalWink] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [reactionFace, setReactionFace] = useState<MochiFace | null>(null);
  const reactionTimer = useRef<number | null>(null);
  const [mochiTint] = useMochiTint();

  // 크기별 수치 설정 (기본 78x78, 미니 36x36, 라지 96x96)
  const dim = size === 'sm' ? 36 : size === 'lg' ? 96 : 78;
  const eyeW = size === 'sm' ? 4 : size === 'lg' ? 8.5 : 7;
  const eyeH = size === 'sm' ? 9 : size === 'lg' ? 18 : 15;
  const eyeGap = size === 'sm' ? 5 : size === 'lg' ? 12 : 10;
  const maxMove = size === 'sm' ? 3 : 6;

  // 1. 상황별 상태 머신(rumiState)에 따른 모션 및 표정 자동 연동
  const effectiveMotion: LumiOrbMotion = useMemo(() => {
    if (motion !== 'idle') return motion;
    if (rumiState === 'weather') return 'wave';
    if (rumiState === 'sleep') return 'sleep';
    if (rumiState === 'dance') return 'dance';
    if (rumiState === 'countdown') return 'countdown-tremble';
    if (rumiState === 'birthday') return 'celebrate';
    if (rumiState === 'dday') return 'bounce';
    if (rumiState === 'curious') return 'wiggle';
    return 'idle';
  }, [motion, rumiState]);

  const effectiveExpression: LumiExpression = useMemo(() => {
    if (expression !== 'auto') return expression;
    if (rumiState === 'weather') return 'happy';
    if (rumiState === 'sleep') return 'sleepy';
    if (rumiState === 'dance') return 'excited';
    if (rumiState === 'countdown') return 'serious';
    if (rumiState === 'birthday') return 'excited';
    if (rumiState === 'dday') return 'serious';
    return 'auto';
  }, [expression, rumiState]);

  // 2. 마우스 시선 추적 (Window mousemove -> requestAnimationFrame)
  useEffect(() => {
    let animId: number;
    const handleMouseMove = (e: MouseEvent) => {
      if (!orbRef.current) return;
      animId = requestAnimationFrame(() => {
        if (!orbRef.current) return;
        const rect = orbRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const deltaX = e.clientX - centerX;
        const deltaY = e.clientY - centerY;
        const dist = Math.hypot(deltaX, deltaY);

        if (dist === 0) {
          setEyeOffset({ x: 0, y: 0 });
          return;
        }

        const ratio = Math.min(dist / 300, 1.0);
        const targetX = (deltaX / dist) * maxMove * ratio;
        const targetY = (deltaY / dist) * maxMove * ratio;

        setEyeOffset({
          x: Math.round(targetX * 10) / 10,
          y: Math.round(targetY * 10) / 10,
        });
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animId) cancelAnimationFrame(animId);
    };
  }, [maxMove]);

  // 3. 3.5초 주기 자연스러운 눈 깜빡임 (Eye Blink)
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      if (isMotionPaused()) return; // 🔋 무조작·숨김 상태에서는 깜빡임 생략 (불필요한 리렌더 방지)
      setIsBlinking(true);
      setTimeout(() => {
        setIsBlinking(false);
      }, 160);
    }, 3800);

    return () => clearInterval(blinkInterval);
  }, []);

  // 클릭 이벤트 핸들러 (통통 튀는 바운스 애니메이션 + 귀여운 효과음)
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsJumping(true);
    playLumiSfx('pop');
    // 🍡 클릭할 때마다 파스텔 색 변경 + 랜덤 표정 리액션
    cycleMochiTint();
    const pool: MochiFace[] = ['happy', 'love', 'surprised', 'excited', 'shy', 'wink', 'proud'];
    setReactionFace((prev) => {
      const choices = pool.filter((f) => f !== prev);
      return choices[Math.floor(Math.random() * choices.length)];
    });
    if (reactionTimer.current) window.clearTimeout(reactionTimer.current);
    reactionTimer.current = window.setTimeout(() => setReactionFace(null), 2400);
    setTimeout(() => setIsJumping(false), 450);

    onClick?.();
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playLumiSfx('dock');
    onDoubleClick?.();
  };

  // 표정 계산 (클릭 리액션 > 수동/상황 표정 > 기본)
  const baseFace: MochiFace = (() => {
    if (effectiveMotion === 'sleep') return 'sleepy';
    switch (effectiveExpression) {
      case 'auto':
        return isSpeaking ? 'happy' : 'normal';
      default:
        return effectiveExpression as MochiFace;
    }
  })();
  const face: MochiFace = reactionFace ?? baseFace;
  const eyeScale = (100 / dim) * 0.75;

  // 캐릭터 리액션 모션 클래스 (스핀, 바운스, 위글, 슬립, 떨림, 셀러브레이트, 웨이브, 댄스, 플로트)
  const motionClass =
    effectiveMotion === 'spin'
      ? 'animate-lumi-spin'
      : effectiveMotion === 'bounce'
      ? 'animate-lumi-bounce'
      : effectiveMotion === 'wiggle'
      ? 'animate-lumi-wiggle'
      : effectiveMotion === 'sleep'
      ? 'animate-lumi-sleep'
      : effectiveMotion === 'countdown-tremble'
      ? 'animate-lumi-tremble'
      : effectiveMotion === 'celebrate'
      ? 'animate-lumi-celebrate'
      : effectiveMotion === 'wave'
      ? 'animate-wave'
      : effectiveMotion === 'dance'
      ? 'animate-lumi-dance'
      : 'animate-float';

  return (
    <>
      <style>{`
        @keyframes lumi-spin-once {
          0% { transform: rotate(0deg) scale(1); }
          40% { transform: rotate(180deg) scale(1.18); }
          75% { transform: rotate(330deg) scale(1.06); }
          100% { transform: rotate(360deg) scale(1); }
        }
        @keyframes lumi-bounce-twice {
          0%, 100% { transform: translateY(0) scale(1); }
          22% { transform: translateY(-16px) scale(1.1, 0.9); }
          44% { transform: translateY(0) scale(0.95, 1.05); }
          66% { transform: translateY(-8px) scale(1.05, 0.96); }
          88% { transform: translateY(0) scale(0.98, 1.02); }
        }
        @keyframes lumi-wiggle-dance {
          0%, 100% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(-10deg) translateY(-4px) scale(1.05); }
          50% { transform: rotate(0deg) translateY(0) scale(1); }
          75% { transform: rotate(10deg) translateY(-4px) scale(1.05); }
        }
        @keyframes lumi-sleep-nod {
          0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
          50% { transform: translateY(8px) rotate(6deg) scale(0.96); }
        }
        @keyframes lumi-tremble-panic {
          0%, 100% { transform: translate(0, 0); }
          20% { transform: translate(-3px, 1px); }
          40% { transform: translate(3px, -1px); }
          60% { transform: translate(-2px, -2px); }
          80% { transform: translate(2px, 1px); }
        }
        @keyframes lumi-celebrate-jump {
          0%, 100% { transform: translateY(0) scale(1); }
          30% { transform: translateY(-20px) scale(1.15); }
          60% { transform: translateY(-6px) scale(1.05); }
        }
        @keyframes lumi-dance-rhythm {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          25% { transform: rotate(-8deg) translateY(-4px); }
          50% { transform: rotate(0deg) translateY(0); }
          75% { transform: rotate(8deg) translateY(-4px); }
        }
        @keyframes particle-rise-float {
          0% { opacity: 0; transform: translateY(0) scale(0.6); }
          40% { opacity: 1; transform: translateY(-14px) scale(1.1); }
          100% { opacity: 0; transform: translateY(-30px) scale(0.7); }
        }
        .animate-lumi-spin {
          animation: lumi-spin-once 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;
        }
        .animate-lumi-bounce {
          animation: lumi-bounce-twice 0.75s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;
        }
        .animate-lumi-wiggle {
          animation: lumi-wiggle-dance 0.8s ease-in-out infinite !important;
        }
        .animate-lumi-sleep {
          animation: lumi-sleep-nod 3s ease-in-out infinite !important;
        }
        .animate-lumi-tremble {
          animation: lumi-tremble-panic 0.15s ease-in-out infinite !important;
        }
        .animate-lumi-celebrate {
          animation: lumi-celebrate-jump 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) infinite !important;
        }
        .animate-lumi-dance {
          animation: lumi-dance-rhythm 0.85s ease-in-out infinite !important;
        }
      `}</style>

      {/* 🤖 3D 루미 마스터 컨테이너 */}
      <div
        ref={orbRef}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        style={{
          width: `${dim}px`,
          height: `${dim}px`,
          transform: `translate3d(0, ${isJumping ? '-10px' : '0'}, 0)`,
          transition: 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        className={`relative flex items-center justify-center cursor-pointer select-none shrink-0 ${motionClass} ${className}`}
        title="AI 비서 루미 • 누를 때마다 색과 표정이 바뀌어요"
      >
        {/* 🍡 흰색 모찌 캐릭터 본체 (클릭마다 파스텔 색·표정 변화) */}
        <MochiBody
          face={face}
          tint={mochiTint}
          eye={{ x: eyeOffset.x * eyeScale, y: eyeOffset.y * eyeScale }}
          blinking={isBlinking}
          speaking={isSpeaking}
          squish={isJumping}
          glow={glowIntensity}
          className={`w-full h-full overflow-visible ${effectiveMotion === 'wave' ? 'is-waving' : ''}`}
        />

        {/* =================================================================== */}
        {/* 🌟 상황별 특별 리액션 오버레이 (헤드폰, 고깔모자, Zzz, 팻말 등)     */}
        {/* =================================================================== */}
        {size !== 'sm' && (
          <>
            {/* 3. 🎧 유튜브 재생: 3D 헤드폰 오버레이 + 솟아오르는 음표(♪ ♫) 파티클 */}
            {(accessory === 'headphones' || rumiState === 'dance') && (
              <>
                <div className="absolute -top-6 -right-2 text-sm text-cyan-300 font-bold animate-[particle-rise-float_1.5s_ease-out_infinite] pointer-events-none drop-shadow-[0_0_6px_#38bdf8] z-30">
                  ♪
                </div>
                <div className="absolute -top-7 -left-1 text-xs text-pink-400 font-bold animate-[particle-rise-float_1.8s_ease-out_infinite_0.4s] pointer-events-none drop-shadow-[0_0_6px_#f472b6] z-30">
                  ♫
                </div>
              </>
            )}

            {/* 6. 🥳 생일 당일: 고깔모자 & 콘페티 축하 */}
            {(accessory === 'party-hat' || rumiState === 'birthday') && (
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center">
                <span className="text-xl drop-shadow-[0_2px_8px_rgba(244,63,94,0.6)] animate-bounce-short">🎉</span>
                <div className="absolute -top-1 -right-3 text-[10px] animate-ping">✨</div>
                <div className="absolute -top-1 -left-3 text-[10px] animate-ping">🎊</div>
              </div>
            )}

            {/* 2. 💤 유휴 상태 (1분 무입력): Zzz 수면 파티클 */}
            {(accessory === 'sleepy-zzz' || rumiState === 'sleep') && (
              <div className="absolute -top-7 right-0 z-30 pointer-events-none flex flex-col items-end">
                <span className="text-xs font-black text-indigo-300 animate-[particle-rise-float_2s_infinite] drop-shadow-[0_0_6px_#818cf8]">Z</span>
                <span className="text-[10px] font-black text-violet-300 animate-[particle-rise-float_2s_infinite_0.5s] -mt-1 mr-2">z</span>
                <span className="text-[8px] font-black text-cyan-300 animate-[particle-rise-float_2s_infinite_1s] -mt-1 mr-3.5">z</span>
              </div>
            )}

            {/* 5. ⏱️ 10초 카운트다운: 스톱워치 */}
            {(accessory === 'stopwatch' || rumiState === 'countdown') && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-bounce-short">
                <span className="text-lg drop-shadow-[0_0_10px_#ef4444]">⏱️</span>
              </div>
            )}

            {/* 7. 📋 D-1 경고: 주의 팻말 */}
            {(accessory === 'dday-sign' || rumiState === 'dday') && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-bounce-short">
                <span className="text-base drop-shadow-[0_0_8px_#f59e0b]">⚠️</span>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

/* ========================================================================= */
/* 🤖 2. 메인 루미(Lumi) AI Assistant 싱글톤 컴포넌트                        */
/* ========================================================================= */

interface TTiAiAssistantProps {
  agendas: AgendaItem[];
  students: Student[];
  config: ClassConfig;
  schedule?: DailySchedule[] | DailySchedule;
  uiTheme: string;
  onCycleUITheme: () => void;
  onLockScreen: () => void;
  onShowToast: (msg: string) => void;
  onTriggerRandomPicker?: () => void;
  onStartFocusTimer?: (minutes: number) => void;
  currentToast?: string | null;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actionType?: string;
}

// 슬래시(/) 명령어 정의 (11종)
interface SlashCommand {
  cmd: string;
  label: string;
  desc: string;
  icon: string;
}

const SLASH_COMMANDS: SlashCommand[] = [
  { cmd: '/출결', label: '출결 현황', desc: '오늘의 재석 및 결석 학생 명단 브리핑', icon: '👥' },
  { cmd: '/급식', label: '오늘의 급식', desc: '점심 식단 및 주요 영양·알레르기 안내', icon: '🍱' },
  { cmd: '/시간표', label: '시간표 확인', desc: '오늘 수업 교시 및 다음 교시 안내', icon: '📅' },
  { cmd: '/계기교육', label: '계기교육 안내', desc: '오늘 및 다가오는 계기교육일 교육 자료', icon: '📖' },
  { cmd: '/발표자', label: '발표자 뽑기', desc: '무작위 공정 추천 발표자 추첨', icon: '🎯' },
  { cmd: '/모둠', label: '모둠 편성', desc: '4인 1조 모둠 및 모둠장 편성 가이드', icon: '🧩' },
  { cmd: '/타이머', label: '집중 타이머', desc: '5분/10분/15분 몰입 타이머 즉시 시작', icon: '⏱️' },
  { cmd: '/위젯제어', label: '위젯 제어', desc: '대시보드 위젯 ON/OFF 제어', icon: '🎛️' },
  { cmd: '/D-day', label: '디데이 확인', desc: '방학 및 주요 학급 행사 D-day', icon: '🏖️' },
  { cmd: '/검색', label: '실시간 검색', desc: '구글/네이버 브라우저 즉시 검색', icon: '🔍' },
  { cmd: '/환경설정', label: '학급 환경설정', desc: '대시보드 환경설정 모달 호출', icon: '⚙️' },
  { cmd: '/잠금', label: '화면 잠금', desc: '교실 대시보드 안전 PIN 화면 잠금', icon: '🔒' },
];

export const TTiAiAssistant: React.FC<TTiAiAssistantProps> = ({
  agendas,
  students,
  config,
  schedule = [],
  uiTheme,
  onCycleUITheme,
  onLockScreen,
  onShowToast,
  onTriggerRandomPicker,
  onStartFocusTimer,
  currentToast,
}) => {
  // 1. 패널 및 팝업 상태
  const [isOpen, setIsOpen] = useState(false);
  const [, mochiTintIndex] = useMochiTint();
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // 🔔 0. 전역 알림 AI 캐릭터 대화형 말풍선 상태
  const [characterNotice, setCharacterNotice] = useState<string | null>(null);
  const [isNoticeVisible, setIsNoticeVisible] = useState<boolean>(false);
  const noticeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [noticeMotion, setNoticeMotion] = useState<LumiOrbMotion>('idle');
  const [noticeExpression, setNoticeExpression] = useState<LumiExpression | null>(null);
  const [specialAccessory, setSpecialAccessory] = useState<LumiSpecialAccessory>('none');

  // 2. 루미 커스텀 설정 상태 (localStorage 연동 & 단일화된 공용 API 키 참조)
  const [engineMode, setEngineMode] = useState<'local' | 'api'>(() => {
    try {
      const mode = (localStorage.getItem('lumi_ai_engine_mode') as 'local' | 'api') || 'local';
      // 만약 등록된 공용 API 키가 없다면 자동으로 안전한 local 모드로 설정
      if (mode === 'api' && !getStoredGeminiApiKey()) {
        return 'local';
      }
      return mode;
    } catch {
      return 'local';
    }
  });

  // 메인 환경설정 5단계에 등록된 공용 API 키 존재 여부 (실시간 조회 동기화)
  const [hasRegisteredApiKey, setHasRegisteredApiKey] = useState<boolean>(() => {
    return Boolean(getStoredGeminiApiKey());
  });

  // 루미 설정 창이 열릴 때마다 메인 환경설정 5단계의 최신 API 키 등록 상태 즉시 재확인
  useEffect(() => {
    if (isSettingsOpen) {
      const key = getStoredGeminiApiKey();
      const hasKey = Boolean(key && key.trim());
      setHasRegisteredApiKey(hasKey);
      if (!hasKey && engineMode === 'api') {
        setEngineMode('local');
      }
    }
  }, [isSettingsOpen]);

  const [colorTheme, setColorTheme] = useState<LumiColorTheme>(() => {
    try {
      return (localStorage.getItem('lumi_ai_color_theme') as LumiColorTheme) || 'neon-indigo';
    } catch {
      return 'neon-indigo';
    }
  });

  const [glowIntensity, setGlowIntensity] = useState<'low' | 'med' | 'high'>(() => {
    try {
      return (localStorage.getItem('lumi_ai_glow_intensity') as 'low' | 'med' | 'high') || 'med';
    } catch {
      return 'med';
    }
  });

  const [expressionMode, setExpressionMode] = useState<LumiExpression>(() => {
    try {
      return (localStorage.getItem('lumi_ai_expression_mode') as LumiExpression) || 'auto';
    } catch {
      return 'auto';
    }
  });

  // 3. 날씨 연동 상태
  const [currentWeather, setCurrentWeather] = useState<LumiWeatherType>('sun');

  useEffect(() => {
    const handleWeatherSync = () => {
      try {
        // 헤더 날씨(설정한 날씨 위치)와 같은 값을 써요
        const saved = localStorage.getItem('smart_dashboard_realtime_weather') || localStorage.getItem('class_dashboard_last_weather');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (/뇌우|천둥|번개/.test(String(parsed.statusText || ''))) setCurrentWeather('thunder');
          else if (parsed.weatherType === 'rain') setCurrentWeather('rain');
          else if (parsed.weatherType === 'snow') setCurrentWeather('snow');
          else if (parsed.weatherType === 'cloud') setCurrentWeather('cloud');
          else setCurrentWeather('sun');
        }
      } catch {}
    };
    handleWeatherSync();
    window.addEventListener('storage', handleWeatherSync);
    window.addEventListener('classin:realtime-weather', handleWeatherSync);
    window.addEventListener('smart_board_weather_change', handleWeatherSync);
    return () => {
      window.removeEventListener('storage', handleWeatherSync);
      window.removeEventListener('classin:realtime-weather', handleWeatherSync);
      window.removeEventListener('smart_board_weather_change', handleWeatherSync);
    };
  }, []);

  // 4. 우측 하단 독킹 vs 자유 플로팅 상태
  const [isDocked, setIsDocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ttime_ai_is_docked') === 'true';
    } catch {
      return false;
    }
  });

  // 📢 AI 캐릭터 대화형 말풍선 및 상황별 모션 통합 리액션 핸들러
  const triggerLumiReaction = useCallback((options: {
    message?: string;
    motion?: LumiOrbMotion;
    expression?: LumiExpression;
    accessory?: LumiSpecialAccessory;
    durationMs?: number;
    sound?: 'magic' | 'chatter' | 'dock' | 'pop';
  }) => {
    const {
      message,
      motion = isDocked ? 'bounce' : 'spin',
      expression = isDocked ? 'happy' : 'wink',
      accessory = 'none',
      durationMs = 3800,
      sound = 'magic',
    } = options;

    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);

    if (message) {
      setCharacterNotice(message);
      setIsNoticeVisible(true);
    }

    setNoticeMotion(motion);
    setNoticeExpression(expression);
    setSpecialAccessory(accessory);

    if (sound) playLumiSfx(sound);

    // 모션 지속 후 자연스럽게 idle로 복귀
    setTimeout(() => {
      setNoticeMotion('idle');
    }, 1100);

    // duration 후 말풍선 및 액세서리 자동 초기화
    noticeTimerRef.current = setTimeout(() => {
      setIsNoticeVisible(false);
      setNoticeExpression(null);
      setSpecialAccessory('none');
      setTimeout(() => {
        setCharacterNotice(null);
      }, 400);
    }, durationMs);
  }, [isDocked]);

  // 기존 호환용 triggerCharacterNotice 함수
  const triggerCharacterNotice = useCallback((message: string) => {
    triggerLumiReaction({ message });
  }, [triggerLumiReaction]);

  // -------------------------------------------------------------------------
  // 🌟 [핵심 7대 + 추천 3대 = 10대 상황별 반응형 모션 및 이벤트 트리거]
  // -------------------------------------------------------------------------

  // 1. 앱 초기 기동 (오늘의 날씨 연동: 3초간 손 흔들기 + 날씨 말풍선)
  useEffect(() => {
    const hasGreeted = sessionStorage.getItem('lumi_weather_greeted_v3');
    if (hasGreeted) return;

    const timer = setTimeout(() => {
      sessionStorage.setItem('lumi_weather_greeted_v3', 'true');
      const weatherName =
        currentWeather === 'rain'
          ? '비'
          : currentWeather === 'snow'
          ? '눈'
          : currentWeather === 'cloud'
          ? '흐림'
          : '맑음';

      triggerLumiReaction({
        message: `오늘 날씨는 [${weatherName}]이에요! 오늘도 힘찬 하루 보내세요! ✨`,
        motion: 'wave',
        expression: 'happy',
        accessory: currentWeather === 'rain' ? 'umbrella' : 'none',
        durationMs: 3000,
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [currentWeather, triggerLumiReaction]);

  // 2. 유휴 상태 감지 (1분간 마우스/키보드 입력 없을 시 졸음 모션)
  useEffect(() => {
    let idleTimer: NodeJS.Timeout;
    let isSleeping = false;

    const resetIdleTimer = () => {
      if (isSleeping) {
        // 사용자 입력 시 깜짝 놀라며 깸
        isSleeping = false;
        playLumiSfx('pop');
        setNoticeMotion('bounce');
        setNoticeExpression('happy');
        setSpecialAccessory('none');
        setIsNoticeVisible(false);
        setTimeout(() => {
          setCharacterNotice(null);
          setNoticeMotion('idle');
          setNoticeExpression(null);
        }, 500);
      }

      clearTimeout(idleTimer);
      // 1분(60초) 동안 무입력 시 졸음 모드
      idleTimer = setTimeout(() => {
        isSleeping = true;
        setNoticeMotion('sleep');
        setNoticeExpression('sleepy');
        setSpecialAccessory('sleepy-zzz');
        setCharacterNotice('Zzz... 선생님, 잠시 휴식 중이신가요? 💤');
        setIsNoticeVisible(true);
      }, 60000);
    };

    resetIdleTimer();
    window.addEventListener('mousemove', resetIdleTimer, { passive: true });
    window.addEventListener('keydown', resetIdleTimer, { passive: true });
    window.addEventListener('click', resetIdleTimer, { passive: true });

    return () => {
      clearTimeout(idleTimer);
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
      window.removeEventListener('click', resetIdleTimer);
    };
  }, []);

  // 4. 대화창 인터랙션: 열릴 때 갸우뚱 & 물음표(?) 팝업
  useEffect(() => {
    if (isOpen) {
      setSpecialAccessory('question');
      setNoticeExpression('excited');
      const timer = setTimeout(() => {
        setSpecialAccessory('none');
        setNoticeExpression(null);
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // 6. 학생/교사 생일 당일 감지 (앱 실행 시)
  useEffect(() => {
    if (!students || students.length === 0) return;
    const hasGreetedBirthday = sessionStorage.getItem('lumi_birthday_greeted');
    if (hasGreetedBirthday) return;

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    const birthdayStudents = students.filter((s) => {
      const bday = s.birthDate || (s as any).birthday;
      if (!bday) return false;
      try {
        const parts = bday.split('-');
        if (parts.length >= 2) {
          const m = parseInt(parts[parts.length - 2], 10);
          const d = parseInt(parts[parts.length - 1], 10);
          return m === currentMonth && d === currentDay;
        }
      } catch {}
      return false;
    });

    if (birthdayStudents.length > 0) {
      sessionStorage.setItem('lumi_birthday_greeted', 'true');
      const names = birthdayStudents.map((s) => `${s.name}(${s.number}번)`).join(', ');
      const bTimer = setTimeout(() => {
        triggerLumiReaction({
          message: `🎉 오늘은 ${names} 학생의 생일이에요! 모두 함께 축하해주세요! 🎂`,
          motion: 'celebrate',
          expression: 'excited',
          accessory: 'party-hat',
          durationMs: 6500,
        });
      }, 2600);
      return () => clearTimeout(bTimer);
    }
  }, [students, triggerLumiReaction]);

  // 7. D-Day 1일 전 (D-1) 경고
  useEffect(() => {
    if (!agendas || agendas.length === 0) return;
    const hasCheckedD1 = sessionStorage.getItem('lumi_d1_checked');
    if (hasCheckedD1) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const d1Items = agendas.filter((a) => {
      const aDate = (a as any).date || (a as any).targetDate;
      if (!aDate) return false;
      const targetDate = new Date(aDate);
      targetDate.setHours(0, 0, 0, 0);
      const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays === 1;
    });

    if (d1Items.length > 0) {
      sessionStorage.setItem('lumi_d1_checked', 'true');
      const titles = d1Items.map((i) => (i as any).title || i.text).join(', ');
      const d1Timer = setTimeout(() => {
        triggerLumiReaction({
          message: `📋 [D-1 알림] 내일은 '${titles}' 일정이 있습니다! 미리 준비해 보세요! ⚠️`,
          motion: 'bounce',
          expression: 'serious',
          accessory: 'dday-sign',
          durationMs: 5000,
        });
      }, 3600);
      return () => clearTimeout(d1Timer);
    }
  }, [agendas, triggerLumiReaction]);

  // 🌟 전역 통합 리액션 커스텀 이벤트 리스너 ('ttime-lumi-trigger')
  // 3. 유튜브, 5. 타이머 10초, 8. 수업 시정표, 9. 소음 경고, 10. 칭찬/발표자 등
  useEffect(() => {
    const handleLumiGlobalTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<{
        type:
          | 'youtube-play'
          | 'timer-countdown'
          | 'bell-period'
          | 'bell-break'
          | 'noise-warning'
          | 'praise-awarded'
          | 'random-picker'
          | 'custom';
        message?: string;
        seconds?: number;
        period?: number;
        data?: any;
      }>;
      const detail = customEvent.detail;
      if (!detail) return;

      switch (detail.type) {
        // 3. 유튜브 플레이어 재생 시작 시 (리듬 댄스 모션 + 음표 파티클)
        case 'youtube-play':
          triggerLumiReaction({
            message: detail.message || '음악 감상 시간이에요! 신나는 리듬에 맞춰봐요! 🎧 🎶',
            motion: 'dance',
            expression: 'excited',
            accessory: 'headphones',
            durationMs: 4500,
          });
          break;

        // 5. 뽀모도로 타이머 10초 이하 카운트다운 (긴장 모션 + 볼드 실시간 카운트다운)
        case 'timer-countdown':
          if (detail.seconds !== undefined && detail.seconds <= 10 && detail.seconds > 0) {
            triggerLumiReaction({
              message: `⏱️ 카운트다운 [${detail.seconds}]초! 곧 종료됩니다!`,
              motion: 'countdown-tremble',
              expression: 'serious',
              accessory: 'stopwatch',
              durationMs: 1200,
              sound: 'chatter',
            });
          }
          break;

        // 8. 수업 시작/종료 시정표 알림
        case 'bell-period':
          triggerLumiReaction({
            message: detail.message || `🔔 ${detail.period || ''}교시 수업이 시작되었습니다! 자리에 바르게 앉아볼까요? 📖`,
            motion: 'bounce',
            expression: 'happy',
            accessory: 'book',
            durationMs: 4500,
          });
          break;
        case 'bell-break':
          triggerLumiReaction({
            message: detail.message || '🎈 즐거운 쉬는 시간이에요! 스트레칭 한번 해볼까요? 😊',
            motion: 'celebrate',
            expression: 'happy',
            accessory: 'none',
            durationMs: 4000,
          });
          break;

        // 9. 소음 측정 데시벨 초과 피드백
        case 'noise-warning':
          triggerLumiReaction({
            message: detail.message || '🤫 쉿! 교실이 조금 시끄러워졌어요. 부드러운 목소리로 이야기해요.',
            motion: 'bounce',
            expression: 'serious',
            accessory: 'shh',
            durationMs: 4000,
          });
          break;

        // 10. 학생 칭찬 도장 & 발표자 뽑기 연동
        case 'praise-awarded':
        case 'random-picker':
          triggerLumiReaction({
            message: detail.message || '🌟 짝짝짝! 축하합니다! 멋진 활약을 응원해요! 🪄 ✨',
            motion: 'celebrate',
            expression: 'excited',
            accessory: 'magic-wand',
            durationMs: 4500,
          });
          break;

        case 'custom':
        default:
          if (detail.message) {
            triggerCharacterNotice(detail.message);
          }
          break;
      }
    };

    window.addEventListener('ttime-lumi-trigger', handleLumiGlobalTrigger);
    return () => window.removeEventListener('ttime-lumi-trigger', handleLumiGlobalTrigger);
  }, [triggerLumiReaction, triggerCharacterNotice]);

  // 전역 알림 커스텀 이벤트 버스 리스너 ('ttime-character-notice')
  useEffect(() => {
    const handleNoticeEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string }>;
      if (customEvent.detail && customEvent.detail.message) {
        triggerCharacterNotice(customEvent.detail.message);
      }
    };

    window.addEventListener('ttime-character-notice', handleNoticeEvent);
    return () => window.removeEventListener('ttime-character-notice', handleNoticeEvent);
  }, [triggerCharacterNotice]);

  // 상위 prop(currentToast) 변경 시에도 실시간 연동
  useEffect(() => {
    if (currentToast) {
      triggerCharacterNotice(currentToast);
    }
  }, [currentToast, triggerCharacterNotice]);

  // 자유 플로팅 드래그 좌표 (localStorage 기억)
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const savedX = localStorage.getItem('ttime_ai_pos_x');
      const savedY = localStorage.getItem('ttime_ai_pos_y');
      if (savedX && savedY) {
        return { x: parseInt(savedX, 10), y: parseInt(savedY, 10) };
      }
    } catch {}
    const defaultX = typeof window !== 'undefined' ? window.innerWidth - 120 : 1000;
    const defaultY = typeof window !== 'undefined' ? window.innerHeight - 200 : 600;
    return { x: defaultX, y: defaultY };
  });

  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const initialElemPosRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 5. TTS 음성 토글 상태
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ttime_ai_tts_enabled') === 'true';
    } catch {
      return false;
    }
  });

  // 6. 패킷 사용량 / 잔여량 (API 모드 시뮬레이션: 100% 시작)
  const [packetQuotaPercent, setPacketQuotaPercent] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('lumi_ai_packet_quota');
      return saved ? Math.max(10, Math.min(100, parseInt(saved, 10))) : 94;
    } catch {
      return 94;
    }
  });

  // 7. 대화 히스토리
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome_lumi',
      sender: 'assistant',
      text: '선생님 안녕하세요! 저는 학급 스마트 비서 루미(Lumi)예요 ✨\n\n무엇을 도와드릴까요? 오늘 시간표나 급식 브리핑, 발표자 추천, 5분 집중 타이머, 또는 슬래시(/)를 입력하시면 주요 명령어를 빠르게 실행하실 수 있어요!',
      timestamp: '방금 전',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  // 스크롤 자동 이동
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // ⌨️ 루미 패널 열기/닫기 단축키 (Alt+A · 맥 ⌥A) — App 전역 단축키에서 이벤트로 전달
  useEffect(() => {
    const handleToggle = () => {
      setIsOpen((prev) => !prev);
      playLumiSfx('chatter');
    };
    window.addEventListener(LUMI_TOGGLE_EVENT, handleToggle);
    return () => window.removeEventListener(LUMI_TOGGLE_EVENT, handleToggle);
  }, []);

  // 8. 자유 드래그 이벤트 처리
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isDocked) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    initialElemPosRef.current = { x: position.x, y: position.y };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = moveEvent.clientX - dragStartPosRef.current.x;
      const dy = moveEvent.clientY - dragStartPosRef.current.y;

      if (Math.hypot(dx, dy) > 5) {
        hasMovedRef.current = true;
      }

      const newX = Math.max(20, Math.min(window.innerWidth - 90, initialElemPosRef.current.x + dx));
      const newY = Math.max(20, Math.min(window.innerHeight - 90, initialElemPosRef.current.y + dy));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        try {
          localStorage.setItem('ttime_ai_pos_x', String(position.x));
          localStorage.setItem('ttime_ai_pos_y', String(position.y));
        } catch {}
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // 9. 클릭 / 더블클릭 완벽 분리
  const handleOrbSingleClick = () => {
    if (hasMovedRef.current) return;
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }

    clickTimeoutRef.current = setTimeout(() => {
      setIsOpen(true);
      playLumiSfx('chatter');
      clickTimeoutRef.current = null;
    }, 220);
  };

  const handleOrbDoubleClick = () => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }

    setIsDocked((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ttime_ai_is_docked', String(next));
      } catch {}
      onShowToast(
        next
          ? '📌 루미가 우측 하단 독(Dock)으로 쏙 들어갔어요! (더블클릭 시 다시 분리)'
          : '✨ 루미가 자유 플로팅 모드로 나왔어요!'
      );
      playLumiSfx('dock');
      return next;
    });
  };

  // 10. 마이크 음성 입력 (Web Speech API)
  const toggleSpeechRecognition = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onShowToast('⚠️ 현재 브라우저가 음성 인식을 지원하지 않습니다. Chrome 브라우저를 권장합니다.');
      return;
    }

    if (isListening) {
      try {
        speechRecognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ko-KR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        playLumiSfx('magic');
        onShowToast('🎙️ 루미가 듣고 있어요! 편하게 말씀해 주세요...');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setInputText(transcript);
          onShowToast(`🗣️ "${transcript}"`);
          handleSendMessageWithText(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
        onShowToast('⚠️ 음성 인식에 실패했습니다. 다시 시도해 주세요.');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // 11. TTS 음성 합성
  const speakText = useCallback(
    (textToSpeak: string) => {
      if (!ttsEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;

      try {
        window.speechSynthesis.cancel();
        const cleanText = textToSpeak.replace(/[#*`_~]/g, '').trim();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'ko-KR';
        utterance.rate = 1.05;
        utterance.pitch = 1.15;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
      } catch {
        setIsSpeaking(false);
      }
    },
    [ttsEnabled]
  );

  const toggleTts = () => {
    setTtsEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ttime_ai_tts_enabled', String(next));
      } catch {}
      if (!next && typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
      onShowToast(next ? '🔊 루미 음성 읽어주기가 켜졌습니다.' : '🔇 루미 음성 읽어주기가 꺼졌습니다.');
      return next;
    });
  };

  // 12. 외부 브라우저 검색 유틸
  const executeExternalSearch = async (engine: 'google' | 'naver' | 'daum', query: string) => {
    const electronApi = (window as any).electronAPI;
    if (electronApi && typeof electronApi.openExternalSearch === 'function') {
      try {
        await electronApi.openExternalSearch({ engine, query });
        return;
      } catch {}
    }
    const q = encodeURIComponent(query.trim());
    let url = `https://www.google.com/search?q=${q}`;
    if (engine === 'naver') url = `https://search.naver.com/search.naver?query=${q}`;
    else if (engine === 'daum') url = `https://search.daum.net/search?q=${q}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // 13. 스마트 로컬 응답 & 위젯 조작 엔진
  const processUserQuery = (query: string): { reply: string; actionType?: string } => {
    const q = query.trim().toLowerCase();

    // 📅 [스마트 날짜 보정 헬퍼] 주말/공휴일/재량휴업일인 경우 가장 가까운 다음 수업일(평일)을 탐색
    const getNearestSchoolDate = (baseDate: Date) => {
      const originalType = getDayTypeInfo(baseDate, schedule);
      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

      if (!originalType.isNoClass) {
        return {
          targetDate: baseDate,
          isAdjusted: false,
          originalReason: '',
          dayName: dayNames[baseDate.getDay()],
          dateStr: `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}-${String(baseDate.getDate()).padStart(2, '0')}`,
        };
      }

      // 주말, 공휴일, 재량휴업일인 경우 이후 1~7일 중 정규 수업일 탐색
      for (let offset = 1; offset <= 7; offset++) {
        const nextDate = new Date(baseDate);
        nextDate.setDate(baseDate.getDate() + offset);
        const nextType = getDayTypeInfo(nextDate, schedule);
        if (!nextType.isNoClass) {
          return {
            targetDate: nextDate,
            isAdjusted: true,
            originalReason: originalType.label,
            dayName: dayNames[nextDate.getDay()],
            dateStr: `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`,
          };
        }
      }

      return {
        targetDate: baseDate,
        isAdjusted: false,
        originalReason: originalType.label,
        dayName: dayNames[baseDate.getDay()],
        dateStr: `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}-${String(baseDate.getDate()).padStart(2, '0')}`,
      };
    };

    // 👥 1. 출결 데이터 실시간 정밀 브리핑 (/출결)
    if (q.startsWith('/출결') || q.includes('출결') || q.includes('결석')) {
      const totalCount = students.length;
      const getStudentStatus = (s: Student): AttendanceStatus => s.attendance || s.status || 'present';
      const getStudentReason = (s: Student): string =>
        s.attendanceReasonDetail || s.reasonDetail || s.attendanceReasonCategory || s.memo || '';

      const absentList = students.filter((s) => getStudentStatus(s) === 'absent');
      const lateList = students.filter((s) => getStudentStatus(s) === 'late');
      const earlyList = students.filter((s) => getStudentStatus(s) === 'early');
      const nurseList = students.filter((s) => getStudentStatus(s) === 'nurse');
      const presentCount = students.filter((s) => getStudentStatus(s) === 'present').length;

      let reply = `👥 [우리 반 출결 실시간 브리핑]\n• 총 재적: ${totalCount}명 | 출석: ${presentCount}명`;

      const hasSpecial = absentList.length > 0 || lateList.length > 0 || earlyList.length > 0 || nurseList.length > 0;

      if (!hasSpecial) {
        reply += `\n✨ 결석생 없이 전원(${presentCount}명) 출석 완료 상태입니다! 오늘 하루도 활기찬 교실이 기대됩니다 🎉`;
      } else {
        reply += `\n\n📌 특이 출결 학생 명단:`;
        if (absentList.length > 0) {
          reply +=
            `\n• ❌ 결석 (${absentList.length}명): ` +
            absentList
              .map((s) => {
                const r = getStudentReason(s);
                return `${s.number}번 ${s.name}${r ? ` [${r}]` : ''}`;
              })
              .join(', ');
        }
        if (lateList.length > 0) {
          reply +=
            `\n• ⏰ 지각 (${lateList.length}명): ` +
            lateList
              .map((s) => {
                const r = getStudentReason(s);
                return `${s.number}번 ${s.name}${r ? ` [${r}]` : ''}`;
              })
              .join(', ');
        }
        if (nurseList.length > 0) {
          reply +=
            `\n• 🏥 보건실 (${nurseList.length}명): ` +
            nurseList
              .map((s) => {
                const r = getStudentReason(s);
                return `${s.number}번 ${s.name}${r ? ` [${r}]` : ''}`;
              })
              .join(', ');
        }
        if (earlyList.length > 0) {
          reply +=
            `\n• 🚪 조퇴 (${earlyList.length}명): ` +
            earlyList
              .map((s) => {
                const r = getStudentReason(s);
                return `${s.number}번 ${s.name}${r ? ` [${r}]` : ''}`;
              })
              .join(', ');
        }
        reply += `\n\n선생님, 상단 출결 캔디바를 클릭하시면 나이스(NEIS) 연동 및 세부 사유를 즉시 등록/수정하실 수 있어요!`;
      }

      return {
        reply,
        actionType: 'attendance',
      };
    }

    // 🍱 2. 급식 식단 실시간 브리핑 & 주말·공휴일 날짜 보정 (/급식)
    if (q.startsWith('/급식') || q.includes('급식') || q.includes('점심') || q.includes('식단')) {
      const now = new Date();
      const schoolDateInfo = getNearestSchoolDate(now);

      // 실제 급식 위젯 데이터 불러오기
      let mealData: Record<string, SchoolMealDay> = sampleSchoolMeals;
      try {
        const saved = localStorage.getItem('class_school_meal_data');
        if (saved) {
          mealData = JSON.parse(saved);
        }
      } catch {}

      // 날짜 키 매핑 (주말/휴일이면 다가오는 평일 'tomorrow' 또는 가장 근접 식단)
      const mealKey = schoolDateInfo.isAdjusted ? 'tomorrow' : 'today';
      const meal = mealData[mealKey] || mealData['today'] || sampleSchoolMeals['today'];

      let reply = '';
      if (schoolDateInfo.isAdjusted) {
        reply += `🏖️ 오늘은 [${schoolDateInfo.originalReason}]로 급식이 운영되지 않습니다.\n다가오는 가장 가까운 수업일인 **[${schoolDateInfo.targetDate.getMonth() + 1}월 ${schoolDateInfo.targetDate.getDate()}일 (${schoolDateInfo.dayName}요일)]**의 영양 가득 식단을 미리 안내해 드릴게요!\n\n`;
      } else {
        reply += `🍱 [오늘의 영양 가득 급식 안내]\n`;
      }

      reply += `• 식사 구분: ${meal.mealType || '중식'}\n`;
      if (meal.calorie) reply += `• 총 열량: ${meal.calorie}\n`;

      if (meal.menuItems && meal.menuItems.length > 0) {
        reply += `• 식단 메뉴:\n` + meal.menuItems.map((m) => `  🍴 ${m.name}`).join('\n');
      }

      if (meal.specialNote) {
        reply += `\n\n📌 알림: ${meal.specialNote}`;
      }
      reply += `\n\n깨끗이 손을 씻고 질서 있게 식사할 수 있도록 학생들을 지도해 주세요!`;

      return {
        reply,
        actionType: 'meal',
      };
    }

    // 📅 3. 시간표 실시간 브리핑 & 주말·공휴일 날짜 보정 (/시간표)
    if (q.startsWith('/시간표') || q.includes('시간표') || q.includes('수업') || q.includes('시정표')) {
      const now = new Date();
      const schoolDateInfo = getNearestSchoolDate(now);

      // schedule 데이터 표준화
      let currentSchedule: DailySchedule = {};
      if (Array.isArray(schedule)) {
        currentSchedule = schedule[0] || {};
      } else if (schedule && typeof schedule === 'object') {
        currentSchedule = schedule as DailySchedule;
      }

      const targetDay = schoolDateInfo.dayName;
      const periods: SchedulePeriod[] = currentSchedule[targetDay] || [];

      let reply = '';
      if (schoolDateInfo.isAdjusted) {
        reply += `🏖️ 오늘은 [${schoolDateInfo.originalReason}]로 수업이 없는 날입니다.\n다가오는 가장 가까운 수업일인 **[${schoolDateInfo.targetDate.getMonth() + 1}월 ${schoolDateInfo.targetDate.getDate()}일 (${targetDay}요일)]** 시간표를 미리 안내해 드릴게요!\n`;
      } else {
        reply += `📅 [오늘 (${targetDay}요일) 수업 시간표 브리핑]\n`;
      }

      if (periods.length > 0) {
        reply += `\n• 총 ${periods.length}교시 운영:\n` + periods.map((p) => `  - ${p.period}교시: ${p.subject}`).join('\n');
      } else {
        reply += `\n• 등록된 시간표 데이터가 없습니다. 상단 환경설정에서 시간표를 등록해 보세요.`;
      }

      if (!schoolDateInfo.isAdjusted) {
        const curH = now.getHours();
        const estPeriod = curH < 10 ? '1' : curH < 11 ? '2' : curH < 12 ? '3' : curH < 14 ? '4' : curH < 15 ? '5' : '6';
        reply += `\n\n💡 현재 시간 기준 ${estPeriod}교시 전후 시간대입니다. 준비물과 알림장을 점검해 주세요!`;
      }

      return {
        reply,
        actionType: 'timetable',
      };
    }

    // 📖 4. 신규 명령어: 계기교육 및 국경일/기념일 안내 (/계기교육)
    if (q.startsWith('/계기교육') || q.includes('계기교육') || q.includes('기념일') || q.includes('국경일')) {
      const now = new Date();
      const commemorative = getTodayOrNextCommemorativeDay(now);

      let reply = `📖 [학교 현장 주요 계기교육 안내: ${commemorative.title}]\n`;
      if (commemorative.isToday) {
        reply += `🌟 오늘은 뜻깊은 [${commemorative.title}] 당일입니다!\n`;
      } else {
        reply += `🗓️ 다가오는 계기교육일: ${commemorative.date} (${commemorative.daysLeft > 0 ? `D-${commemorative.daysLeft}` : 'D-Day'})\n`;
      }

      reply += `\n• 구분: ${commemorative.category}`;
      reply += `\n• 유래 및 배경: ${commemorative.origin}`;
      reply += `\n• 교육적 의미: ${commemorative.meaning}`;
      reply += `\n• 💡 학급 지도 요령:\n  ${commemorative.teachingPoint}`;
      reply += `\n\n학생들과 함께 뜻깊은 계기교육의 의미를 되새기는 의미 있는 시간 만들어 보세요!`;

      return {
        reply,
        actionType: 'commemorative',
      };
    }

    // 🎯 5. D-day 실제 데이터 파싱 및 실시간 브리핑 (/D-day)
    if (q.startsWith('/d-day') || q.includes('d-day') || q.includes('디데이') || q.includes('방학')) {
      let ddayList: DDayItem[] = [];
      try {
        const saved = localStorage.getItem('class_dday_items');
        if (saved) {
          ddayList = JSON.parse(saved);
        }
      } catch {}

      if (!ddayList || ddayList.length === 0) {
        ddayList = initialDDays;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // D-Day 계산 및 미래/오늘 우선 정렬
      const calculated = ddayList
        .map((item) => {
          const target = new Date(item.targetDate);
          target.setHours(0, 0, 0, 0);
          const diffTime = target.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const dayType = getDayTypeInfo(item.targetDate);
          return {
            ...item,
            diffDays,
            label: diffDays === 0 ? 'D-Day 오늘' : diffDays > 0 ? `D-${diffDays}` : `D+${Math.abs(diffDays)}`,
            dayTypeLabel: dayType.isNoClass ? ` [${dayType.label}]` : '',
          };
        })
        .sort((a, b) => {
          if (a.diffDays >= 0 && b.diffDays < 0) return -1;
          if (a.diffDays < 0 && b.diffDays >= 0) return 1;
          return a.diffDays - b.diffDays;
        });

      const topDDays = calculated.slice(0, 5);
      let reply = `🎯 [학급 주요 D-Day 실시간 현황]\n대시보드 위젯에 등록된 최신 일정 브리핑입니다:`;
      topDDays.forEach((d) => {
        reply += `\n• [${d.label}] ${d.title} (${d.targetDate})${d.dayTypeLabel}`;
      });
      reply += `\n\n우측 하단 D-Day 위젯에서 새로운 학급 행사나 시험 일정을 자유롭게 추가/관리하실 수 있습니다!`;

      return {
        reply,
        actionType: 'dday',
      };
    }

    if (q.startsWith('/검색') || q.includes('검색')) {
      const targetQuery = query.replace(/^\/검색\s*|구글\s*검색\s*|네이버\s*검색\s*/g, '').trim() || '2026 초등 교육과정';
      executeExternalSearch('google', targetQuery);
      return {
        reply: `🌐 기본 웹 브라우저에서 '${targetQuery}' 구글 검색창을 열어드렸습니다!`,
        actionType: 'search',
      };
    }

    if (q.startsWith('/환경설정') || q.includes('환경설정') || q.includes('설정')) {
      return {
        reply: `⚙️ 상단 헤더 우측의 슬라이더 아이콘을 클릭하시면 학급 시간표, 테마, 학생 명단, 음성 안내를 자유롭게 커스텀하실 수 있어요!`,
        actionType: 'settings',
      };
    }

    if (q.startsWith('/잠금') || q.includes('잠금')) {
      setTimeout(onLockScreen, 500);
      return {
        reply: '🔒 교실 화면을 안전하게 잠금화면으로 전환합니다. PIN 번호로 다시 해제하실 수 있어요.',
        actionType: 'lock',
      };
    }

    // 테마 전환
    if (q.includes('테마')) {
      onCycleUITheme();
      return {
        reply: '🎨 대시보드 테마를 다음 스타일로 즉시 변경해 드렸어요! (라벤더 포그 🪻 ↔ 엠버 선셋 🍊 ↔ 사이버 글로시 다크 💎)',
        actionType: 'theme',
      };
    }

    // 기본 응답
    return {
      reply: `루미가 선생님의 말씀을 확인했어요! 😊\n\n'오늘 시간표', '급식 식단', '발표자 추천', '5분 타이머', '구글 검색', '화면 잠금' 등 원하시는 기능을 말씀하시거나 슬래시(/)를 입력해 보세요!`,
    };
  };

  const handleSendMessageWithText = (textToSend: string) => {
    if (!textToSend.trim()) return;

    const newMsgId = `user_${Date.now()}`;
    const userMsg: ChatMessage = {
      id: newMsgId,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: '방금',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    playLumiSfx('chatter');

    // 패킷 쿼터 1% 소모 시뮬레이션
    if (engineMode === 'api') {
      setPacketQuotaPercent((prev) => {
        const next = Math.max(5, prev - 1);
        try {
          localStorage.setItem('lumi_ai_packet_quota', String(next));
        } catch {}
        return next;
      });
    }

    setTimeout(() => {
      const { reply, actionType } = processUserQuery(textToSend);
      const assistantMsg: ChatMessage = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        text: reply,
        timestamp: '방금',
        actionType,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      playLumiSfx('chatter');
      speakText(reply);

      // 4. AI 답변 도출 완료: 전구(💡) 팝업 & 감탄 리액션
      triggerLumiReaction({
        motion: 'bounce',
        expression: 'happy',
        accessory: 'lightbulb',
        durationMs: 2600,
        sound: 'magic',
      });
    }, 280);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    handleSendMessageWithText(inputText);
  };

  // 슬래시 명령어 클릭 입력
  const handleSelectSlashCommand = (cmd: SlashCommand) => {
    handleSendMessageWithText(cmd.cmd);
  };

  // 설정 저장 핸들러
  const handleSaveSettings = () => {
    try {
      localStorage.setItem('lumi_ai_engine_mode', engineMode);
      localStorage.setItem('lumi_ai_color_theme', colorTheme);
      localStorage.setItem('lumi_ai_glow_intensity', glowIntensity);
      localStorage.setItem('lumi_ai_expression_mode', expressionMode);
    } catch {}

    playLumiSfx('magic');
    setIsSettingsOpen(false);
    onShowToast('✨ 루미(Lumi) AI 설정이 성공적으로 저장되었습니다!');
  };

  // 슬래시 메뉴 표시 조건
  const isSlashMenuVisible = inputText.startsWith('/');

  return (
    <>
      {/* =================================================================== */}
      {/* 🌟 1. 루미 AI 캐릭터: 자유 플로팅 모드 OR 우측 하단 독킹           */}
      {/* 프로젝터 송출 방지: data-teacher-only="true" 선생님 모니터 전용     */}
      {/* =================================================================== */}
      {!isOpen && (
        <div data-teacher-only="true" className="teacher-only-layer">
          {isDocked ? (
            /* A. 우측 하단 매트 블랙 알약 캡슐 독 (Ask 루미) */
            <div className="fixed bottom-4 right-4 z-40 flex items-center group/pill">
              {/* 🧞‍♀️ 알라딘 램프 스타일 반응형 말풍선 (독 모드: 하단 알약 독에서 위쪽으로 피어오름) */}
              {characterNotice && (
                <div
                  className={`absolute bottom-full right-0 mb-3.5 z-50 pointer-events-auto transition-all duration-300 ${
                    isNoticeVisible
                      ? 'opacity-100 scale-100 translate-y-0'
                      : 'opacity-0 scale-95 translate-y-3 pointer-events-none'
                  }`}
                  style={{
                    width: 'max-content',
                    maxWidth: 'min(340px, 86vw)',
                  }}
                >
                  <div className="relative p-3.5 sm:p-4 rounded-[24px] bg-white/95 dark:bg-[#0c1424]/95 backdrop-blur-2xl border border-indigo-200/80 dark:border-indigo-500/40 shadow-[0_20px_50px_rgba(99,102,241,0.32)] select-none text-left animate-aladdin-rise">
                    {/* 상단 램프 광채 오로라 */}
                    <div className="absolute -top-1 left-6 right-6 h-1 rounded-full bg-gradient-to-r from-transparent via-indigo-400/80 to-transparent blur-[1px] pointer-events-none" />

                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-2xl bg-gradient-to-tr from-indigo-500 via-violet-500 to-fuchsia-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/30 mt-0.5 text-xs animate-pulse">
                        🧞
                      </div>
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-black tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <span>루미 알림</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsNoticeVisible(false);
                              setCharacterNotice(null);
                            }}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded transition cursor-pointer"
                            title="닫기"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 leading-snug break-keep whitespace-pre-line">
                          {characterNotice}
                        </p>
                      </div>
                    </div>

                    {/* 알라딘 램프 지니 요정 곡선 꼬리 (Tail) - 오른쪽 아래 독 캐릭터 방향 */}
                    <svg
                      className="absolute -bottom-4 right-8 w-8 h-5 text-white/95 dark:text-[#0c1424]/95 drop-shadow-[0_4px_6px_rgba(99,102,241,0.2)] overflow-visible pointer-events-none"
                      viewBox="0 0 32 20"
                      fill="currentColor"
                    >
                      <path d="M4 0 C14 8, 28 8, 26 20 C20 14, 18 5, 0 0 Z" />
                    </svg>
                    {/* 피어오르는 마법 연기 버블 파티클 */}
                    <div className="absolute -bottom-4 right-6 w-2.5 h-2.5 rounded-full bg-indigo-400/80 dark:bg-indigo-400/70 animate-ping pointer-events-none" />
                    <div className="absolute -bottom-5 right-4 w-2 h-2 rounded-full bg-violet-400/90 dark:bg-violet-400/80 animate-pulse pointer-events-none" />
                    <div className="absolute -bottom-6 right-2 w-1.5 h-1.5 rounded-full bg-sky-300/90 pointer-events-none" />
                  </div>
                </div>
              )}

              <div className="absolute right-full mr-2.5 pointer-events-none opacity-0 group-hover/pill:opacity-100 transition-all duration-200 translate-x-1 group-hover/pill:translate-x-0 whitespace-nowrap shadow-xl">
                <div className="bg-slate-900/95 text-white text-xs font-semibold px-3 py-1.5 rounded-2xl shadow-xl border border-white/10 backdrop-blur-md flex items-center gap-1.5">
                  <span>✨</span>
                  <span>안녕하세요 선생님! 저는 루미예요 (더블클릭: 자유 플로팅)</span>
                </div>
              </div>

              <div
                onClick={handleOrbSingleClick}
                onDoubleClick={handleOrbDoubleClick}
                className="flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-full bg-[#141416] hover:bg-black text-white shadow-2xl hover:shadow-[0_8px_25px_rgba(99,102,241,0.35)] border border-white/10 cursor-pointer active:scale-95 transition-all select-none"
                title="루미 AI 열기 (더블클릭: 자유 플로팅 모드로 꺼내기)"
              >
                <LumiOrbCharacter
                  size="sm"
                  isSpeaking={isSpeaking}
                  colorTheme={colorTheme}
                  glowIntensity={glowIntensity}
                  expression={noticeExpression || expressionMode}
                  weatherType={currentWeather}
                  motion={noticeMotion}
                  accessory={specialAccessory}
                />
                <span className="text-xs font-bold tracking-tight">Ask 루미</span>
              </div>
            </div>
          ) : (
            /* B. 자유 플로팅 모드 (드래그 가능 대형 캐릭터 + 더블클릭 독킹) */
            <div
              style={{
                position: 'fixed',
                left: `${position.x}px`,
                top: `${position.y}px`,
                zIndex: 45,
                touchAction: 'none',
              }}
              onMouseDown={handleMouseDown}
              className="cursor-grab active:cursor-grabbing select-none group/floating"
            >
              {/* 🧞‍♀️ 알라딘 램프 스타일 반응형 말풍선 (플로팅 모드: 캐릭터 머리 위에서 피어오름) */}
              {characterNotice && (
                <div
                  className={`absolute pointer-events-auto transition-all duration-300 z-50 ${
                    position.x > (typeof window !== 'undefined' ? window.innerWidth / 2 : 500)
                      ? 'bottom-full right-0 mb-3.5'
                      : 'bottom-full left-0 mb-3.5'
                  } ${
                    isNoticeVisible
                      ? 'opacity-100 scale-100 translate-y-0'
                      : 'opacity-0 scale-95 translate-y-3 pointer-events-none'
                  }`}
                  style={{
                    width: 'max-content',
                    maxWidth: 'min(340px, 86vw)',
                  }}
                >
                  <div className="relative p-3.5 sm:p-4 rounded-[24px] bg-white/95 dark:bg-[#0c1424]/95 backdrop-blur-2xl border border-indigo-200/80 dark:border-indigo-500/40 shadow-[0_20px_50px_rgba(99,102,241,0.32)] select-none text-left animate-aladdin-rise">
                    {/* 상단 램프 광채 오로라 */}
                    <div className="absolute -top-1 left-6 right-6 h-1 rounded-full bg-gradient-to-r from-transparent via-indigo-400/80 to-transparent blur-[1px] pointer-events-none" />

                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-2xl bg-gradient-to-tr from-indigo-500 via-violet-500 to-fuchsia-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/30 mt-0.5 text-xs animate-pulse">
                        🧞
                      </div>
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-black tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <span>루미 알림</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsNoticeVisible(false);
                              setCharacterNotice(null);
                            }}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded transition cursor-pointer"
                            title="닫기"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 leading-snug break-keep whitespace-pre-line">
                          {characterNotice}
                        </p>
                      </div>
                    </div>

                    {/* 알라딘 램프 지니 요정 곡선 꼬리 (Tail) */}
                    {position.x > (typeof window !== 'undefined' ? window.innerWidth / 2 : 500) ? (
                      <>
                        <svg
                          className="absolute -bottom-4 right-8 w-8 h-5 text-white/95 dark:text-[#0c1424]/95 drop-shadow-[0_4px_6px_rgba(99,102,241,0.2)] overflow-visible pointer-events-none"
                          viewBox="0 0 32 20"
                          fill="currentColor"
                        >
                          <path d="M4 0 C14 8, 28 8, 26 20 C20 14, 18 5, 0 0 Z" />
                        </svg>
                        <div className="absolute -bottom-4 right-6 w-2.5 h-2.5 rounded-full bg-indigo-400/80 dark:bg-indigo-400/70 animate-ping pointer-events-none" />
                        <div className="absolute -bottom-5 right-4 w-2 h-2 rounded-full bg-violet-400/90 dark:bg-violet-400/80 animate-pulse pointer-events-none" />
                        <div className="absolute -bottom-6 right-2 w-1.5 h-1.5 rounded-full bg-sky-300/90 pointer-events-none" />
                      </>
                    ) : (
                      <>
                        <svg
                          className="absolute -bottom-4 left-8 w-8 h-5 text-white/95 dark:text-[#0c1424]/95 drop-shadow-[0_4px_6px_rgba(99,102,241,0.2)] overflow-visible pointer-events-none"
                          viewBox="0 0 32 20"
                          fill="currentColor"
                        >
                          <path d="M28 0 C18 8, 4 8, 6 20 C12 14, 14 5, 32 0 Z" />
                        </svg>
                        <div className="absolute -bottom-4 left-6 w-2.5 h-2.5 rounded-full bg-indigo-400/80 dark:bg-indigo-400/70 animate-ping pointer-events-none" />
                        <div className="absolute -bottom-5 left-4 w-2 h-2 rounded-full bg-violet-400/90 dark:bg-violet-400/80 animate-pulse pointer-events-none" />
                        <div className="absolute -bottom-6 left-2 w-1.5 h-1.5 rounded-full bg-sky-300/90 pointer-events-none" />
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="absolute -top-10 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover/floating:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
                <div className="bg-slate-900/90 text-white text-[11px] font-semibold px-2.5 py-1 rounded-xl shadow-lg border border-white/10 backdrop-blur-md flex items-center gap-1">
                  <span>더블클릭: 하단 독킹 📌</span>
                </div>
              </div>

              <LumiOrbCharacter
                size="md"
                isSpeaking={isSpeaking}
                colorTheme={colorTheme}
                glowIntensity={glowIntensity}
                expression={noticeExpression || expressionMode}
                weatherType={currentWeather}
                motion={noticeMotion}
                accessory={specialAccessory}
                onClick={handleOrbSingleClick}
                onDoubleClick={handleOrbDoubleClick}
              />
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* 🚀 2. 우측 슬라이드 AI 대화창 패널 (루미 Lumi AI)                   */}
      {/* =================================================================== */}
      {isOpen && (
        <div data-teacher-only="true" className="teacher-only-layer fixed inset-y-0 right-0 z-50 flex items-center p-2.5 sm:p-4 pointer-events-none">
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/25 backdrop-blur-[1.5px] pointer-events-auto transition-opacity"
          />

          <div
            className="w-full sm:w-[370px] h-[92vh] max-h-[840px] rounded-[28px] bg-white/95 dark:bg-[#0c1424]/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xl flex flex-col overflow-hidden relative pointer-events-auto animate-slide-left z-10"
            style={{
              boxShadow: '0 24px 50px rgba(0, 0, 0, 0.3), 0 0 40px rgba(99, 102, 241, 0.18)',
            }}
          >
            {/* 1. 패널 상단 헤더 */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/60 dark:bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <LumiOrbCharacter
                  size="sm"
                  isSpeaking={isSpeaking}
                  colorTheme={colorTheme}
                  glowIntensity={glowIntensity}
                  expression={noticeExpression || expressionMode}
                  weatherType={currentWeather}
                  motion={noticeMotion}
                  accessory={specialAccessory}
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm text-slate-800 dark:text-slate-100">루미 (Lumi) AI</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300">
                      교사용 비서
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{engineMode === 'local' ? '자체 로컬 엔진 · 100% 무료' : '외부 API 엔진 연동 중'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* ⚙️ [요구사항 2] 우측 상단 설정 아이콘 버튼 */}
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors cursor-pointer"
                  title="루미 AI 설정 (엔진, API 키, 캐릭터 커스텀)"
                >
                  <Settings className="w-4 h-4" />
                </button>

                {/* 📖 가이드 버튼 */}
                <button
                  type="button"
                  onClick={() => setIsGuideOpen(true)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors cursor-pointer"
                  title="루미 사용 가이드"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>

                {/* 🔊 음성 읽어주기 (TTS) 토글 */}
                <button
                  type="button"
                  onClick={toggleTts}
                  className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                    ttsEnabled
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950 dark:border-indigo-800 dark:text-indigo-300'
                      : 'bg-transparent border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                  title={ttsEnabled ? '음성 안내 켜짐' : '음성 안내 꺼짐'}
                >
                  {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>

                {/* 닫기 버튼 */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="닫기 (ESC)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 🧞‍♀️ 패널 내부 루미 실시간 반응형 말풍선 알림 */}
            {characterNotice && (
              <div
                className={`mx-3 my-2 p-3 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/80 border border-indigo-200/80 dark:border-indigo-800/80 text-slate-800 dark:text-slate-100 flex items-start gap-2.5 shadow-sm transition-all duration-300 ${
                  isNoticeVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-400 text-white flex items-center justify-center shrink-0 text-xs shadow-xs mt-0.5">
                  🧞
                </div>
                <div className="flex-1 text-xs font-extrabold leading-relaxed break-keep">
                  {characterNotice}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsNoticeVisible(false);
                    setCharacterNotice(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                  title="닫기"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* 📊 [요구사항 5] API 키 모드 활성화 시 슬림한 패킷 잔여량 프로그레스바 */}
            {engineMode === 'api' && (
              <div className="w-full bg-slate-100 dark:bg-slate-800 px-4 py-1.5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 border-b border-slate-200/50 dark:border-slate-700/50">
                <span className="font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  API 패킷 잔여량
                </span>
                <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{packetQuotaPercent}%</span>
                <div className="w-28 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden ml-2">
                  <div
                    style={{ width: `${packetQuotaPercent}%` }}
                    className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full transition-all duration-300"
                  />
                </div>
              </div>
            )}

            {/* 2. 대화 및 히어로 뷰포트 */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
              {/* 캐릭터 히어로 영역 */}
              <div className="flex flex-col items-center text-center p-4 rounded-3xl bg-gradient-to-b from-indigo-50/70 to-purple-50/30 dark:from-indigo-950/30 dark:to-slate-900/40 border border-indigo-100/60 dark:border-indigo-900/40 shadow-xs">
                <LumiOrbCharacter
                  size="lg"
                  isSpeaking={isSpeaking}
                  colorTheme={colorTheme}
                  glowIntensity={glowIntensity}
                  expression={expressionMode}
                  weatherType={currentWeather}
                />
                <h3 className="mt-3 font-extrabold text-sm text-slate-800 dark:text-slate-100">
                  선생님, 반가워요! 저는 루미(Lumi)예요 ✨
                </h3>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-[280px]">
                  수업 일정, 시간표, 급식, 타이머 조작뿐만 아니라 슬래시(/) 명령어로 모든 학급 도구를 즉시 실행해 드려요.
                </p>
              </div>

              {/* 6개 퀵 액션 카드 칩 */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 px-1">
                  ⚡ 자주 쓰는 스마트 액션
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: '🍱 오늘의 점심 급식', query: '/급식' },
                    { label: '📅 오늘 수업 시간표', query: '/시간표' },
                    { label: '🎯 발표자 추천 뽑기', query: '/발표자' },
                    { label: '⏱️ 집중 5분 타이머', query: '/타이머 5분' },
                    { label: '🎨 대시보드 테마 전환', query: '테마 전환' },
                    { label: '🔒 교실 화면 잠금', query: '/잠금' },
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessageWithText(chip.query)}
                      className="px-2.5 py-2 rounded-2xl bg-slate-50 hover:bg-indigo-50 dark:bg-slate-900/60 dark:hover:bg-indigo-950/60 border border-slate-200/60 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 text-left text-[11px] font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer active:scale-95 shadow-2xs hover:shadow-xs flex items-center gap-1.5"
                    >
                      <span className="truncate">{chip.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 대화 메시지 목록 */}
              <div className="space-y-3 pt-2">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[88%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed break-keep whitespace-pre-wrap ${
                        msg.sender === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-xs shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-xs border border-slate-200/70 dark:border-slate-700/70 shadow-xs'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[9px] text-slate-400 mt-0.5 px-1">{msg.timestamp}</span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* 3. 하단 입력 구역 (슬래시 스크롤 메뉴 팝업 + 마이크 STT 버튼) */}
            <div className="relative border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5">
              {/* 📜 [요구사항 5] 슬래시(/) 명령어 스크롤 팝업 메뉴 */}
              {isSlashMenuVisible && (
                <div className="absolute bottom-full left-2.5 right-2.5 mb-2 rounded-2xl bg-slate-900/98 dark:bg-[#070d19]/98 backdrop-blur-2xl border border-indigo-500/40 shadow-2xl overflow-hidden z-30 animate-slide-up">
                  <div className="px-3 py-1.5 bg-indigo-950/80 border-b border-indigo-500/30 flex items-center justify-between text-[11px] font-bold text-indigo-300">
                    <span className="flex items-center gap-1">
                      <span>⚡</span> <span>루미 스마트 명령어 목록 (클릭하여 실행)</span>
                    </span>
                    <span className="text-[9px] text-slate-400">총 {SLASH_COMMANDS.length}개</span>
                  </div>

                  <div className="max-h-48 overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                    {SLASH_COMMANDS.map((cmd) => (
                      <button
                        key={cmd.cmd}
                        type="button"
                        onClick={() => handleSelectSlashCommand(cmd)}
                        className="w-full px-2.5 py-1.5 rounded-xl text-left hover:bg-indigo-600/30 transition-colors flex items-center justify-between group/cmd cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{cmd.icon}</span>
                          <span className="text-xs font-bold text-white group-hover/cmd:text-indigo-300">
                            {cmd.cmd}
                          </span>
                          <span className="text-[11px] text-slate-300">({cmd.label})</span>
                        </div>
                        <span className="text-[10px] text-slate-400 group-hover/cmd:text-slate-200 truncate max-w-[140px]">
                          {cmd.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 입력 폼 */}
              <form onSubmit={handleSendMessage} className="flex items-center gap-1.5">
                {/* 🎤 [요구사항 5] 마이크 음성 입력 버튼 */}
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                    isListening
                      ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/40'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                  title={isListening ? '음성 듣는 중... 클릭 시 중지' : '음성으로 말하기 (클릭)'}
                >
                  {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={isListening ? '듣고 있어요... 말씀해 주세요 🎙️' : "명령어 입력 시 '/' 입력 또는 자유 질문..."}
                  className="flex-1 px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-xs"
                  title="전송"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* ⚙️ [요구사항 2] 루미 AI 설정 팝업 모달                               */}
      {/* =================================================================== */}
      {isSettingsOpen && (
        <div data-teacher-only="true" className="teacher-only-layer fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#0c1424] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl relative select-none">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* 헤더 */}
            <div className="flex items-center gap-3 mb-5">
              <LumiOrbCharacter size="sm" colorTheme={colorTheme} expression={expressionMode} />
              <div>
                <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <span>루미(Lumi) AI 스마트 설정</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  엔진 모드, API 키, 캐릭터 색상 및 표정을 커스텀합니다.
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* 1. [외부 API 키 연동] 캔디바 토글 스위치 (메인 환경설정 5단계 단일 키 연동) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100">
                        외부 API 키 연동
                      </span>
                      {hasRegisteredApiKey ? (
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 shrink-0">
                          키 등록됨
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 shrink-0">
                          키 미등록
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      {engineMode === 'api'
                        ? 'Google Gemini AI 최신 모델을 통해 고도화된 지능형 대화가 활성화됩니다.'
                        : '오프라인 특화 자체 로컬 엔진으로 빠르고 안전하게 동작합니다.'}
                    </p>
                  </div>

                  {/* 캔디바 슬라이딩 토글 스위치 */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={engineMode === 'api'}
                    disabled={!hasRegisteredApiKey}
                    onClick={() => {
                      if (!hasRegisteredApiKey) return;
                      setEngineMode((prev) => (prev === 'api' ? 'local' : 'api'));
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                      !hasRegisteredApiKey
                        ? 'bg-slate-200 dark:bg-slate-700 cursor-not-allowed opacity-60'
                        : engineMode === 'api'
                        ? 'bg-indigo-600 cursor-pointer shadow-inner'
                        : 'bg-slate-300 dark:bg-slate-600 cursor-pointer'
                    }`}
                    title={
                      !hasRegisteredApiKey
                        ? '메인 환경설정(5단계)에서 먼저 API 키를 등록해주세요'
                        : engineMode === 'api'
                        ? '외부 API 연동 끄기 (로컬 엔진으로 전환)'
                        : '외부 API 연동 켜기 (Gemini 연동)'
                    }
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                        engineMode === 'api' ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* 하단 상태별 미세 안내 텍스트 */}
                {!hasRegisteredApiKey ? (
                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-semibold animate-fade-in">
                    <span className="text-xs">⚠️</span>
                    <span>메인 환경설정(5단계)에서 먼저 API 키를 등록해주세요</span>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                      <span>●</span>
                      <span>메인 환경설정 5단계 AI 캐릭터 API 키 자동 연동 중</span>
                    </span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      {engineMode === 'api' ? 'Gemini API 연동 ON' : '자체 로컬 엔진 (무료)'}
                    </span>
                  </div>
                )}
              </div>

              {/* 3. 루미 모찌 색상 (파스텔) */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5 text-purple-500" />
                  <span>2. 모찌 색상 (루미를 누를 때마다 바뀌어요)</span>
                </label>
                <div className="grid grid-cols-7 gap-1.5">
                  {MOCHI_TINTS.map((t, i) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setMochiTint(i)}
                      className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        mochiTintIndex === i
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 font-bold ring-2 ring-indigo-400/20'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded-full border border-slate-200 shadow-xs"
                        style={{ background: `radial-gradient(circle at 35% 30%, ${t.light} 0%, ${t.dark} 100%)` }}
                      />
                      <span className="text-[10px] text-slate-700 dark:text-slate-300">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. 표정 모드 선택 */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                  <Smile className="w-3.5 h-3.5 text-amber-500" />
                  <span>3. 표정 리액션 제어</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'auto', label: '자동 (날씨/대화)' },
                    { id: 'happy', label: '😊 기쁨' },
                    { id: 'wink', label: '😉 윙크' },
                    { id: 'serious', label: '🧐 진지' },
                    { id: 'sleepy', label: '😴 졸림' },
                    { id: 'excited', label: '🤩 신남' },
                    { id: 'surprised', label: '😮 놀람' },
                    { id: 'love', label: '😍 하트' },
                    { id: 'shy', label: '😳 부끄' },
                    { id: 'proud', label: '😌 뿌듯' },
                  ].map((exp) => (
                    <button
                      key={exp.id}
                      type="button"
                      onClick={() => setExpressionMode(exp.id as LumiExpression)}
                      className={`py-1.5 px-2 rounded-xl border text-[11px] font-medium transition-all cursor-pointer truncate ${
                        expressionMode === exp.id
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold ring-1 ring-indigo-400'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {exp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. 오라(Glow) 효과 강도 */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-rose-500" />
                  <span>4. 후광 효과</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'low', label: '은은하게 (30%)' },
                    { id: 'med', label: '표준 (60%)' },
                    { id: 'high', label: '강렬하게 (100%)' },
                  ].map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGlowIntensity(g.id as 'low' | 'med' | 'high')}
                      className={`py-1.5 px-2 rounded-xl border text-[11px] font-medium transition-all cursor-pointer ${
                        glowIntensity === g.id
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 하단 저장 버튼 */}
            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="flex-1 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="flex-[1.5] py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>설정 저장하기</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 📖 3. 루미 AI 사용설명서 가이드 모달                               */}
      {/* =================================================================== */}
      {isGuideOpen && (
        <div data-teacher-only="true" className="teacher-only-layer fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#0c1424] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl relative select-none">
            <button
              type="button"
              onClick={() => setIsGuideOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <LumiOrbCharacter size="sm" colorTheme={colorTheme} expression={expressionMode} />
              <div>
                <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                  루미 (Lumi) AI 비서 사용 가이드
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  선생님만을 위한 5가지 스마트 마스터 팁
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
                <span className="font-bold text-indigo-700 dark:text-indigo-300 block mb-1">
                  1. 단일 클릭 vs 더블클릭 독킹
                </span>
                루미를 **한 번 클릭**하면 대화창이 열리며, **더블클릭**하면 우측 하단 캡슐 독(&apos;Ask 루미&apos;)으로 쏙 빨려 들어갑니다. (독에서 다시 더블클릭 시 플로팅 복귀)
              </div>

              <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
                <span className="font-bold text-indigo-700 dark:text-indigo-300 block mb-1">
                  2. 슬래시(/) 명령어 스크롤 팝업
                </span>
                대화창에 <code className="text-indigo-600 font-bold">/</code>를 입력하면 출결, 급식, 시간표, 발표자, 타이머 등 11가지 핵심 명령어가 스크롤 팝업으로 나타나 바로 실행할 수 있습니다.
              </div>

              <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
                <span className="font-bold text-indigo-700 dark:text-indigo-300 block mb-1">
                  3. 마이크 음성 입력 (STT) 지원
                </span>
                입력란 옆 마이크 아이콘(🎤)을 누르고 말씀하시면 음성을 자동으로 텍스트로 변환해 루미에게 전송합니다.
              </div>

              <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
                <span className="font-bold text-indigo-700 dark:text-indigo-300 block mb-1">
                  4. 날씨 실시간 연동 리액션
                </span>
                실시간 날씨에 따라 맑은 날엔 선글라스, 비 오는 날엔 미니 우산, 눈 오는 날엔 슬립 모션 등 유쾌한 애니메이션이 동작합니다.
              </div>

              <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
                <span className="font-bold text-indigo-700 dark:text-indigo-300 block mb-1">
                  5. 우측 상단 톱니바퀴 설정 모달
                </span>
                대화창 상단의 ⚙️ 아이콘을 눌러 자체 로컬 엔진과 Google Gemini API 연동 모드를 자유롭게 전환하고 패킷 프로그레스바를 확인할 수 있습니다.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsGuideOpen(false)}
              className="mt-5 w-full py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-md cursor-pointer"
            >
              확인했어요!
            </button>
          </div>
        </div>
      )}
    </>
  );
};

