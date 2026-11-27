import React, { useState, useEffect, useRef, useMemo } from 'react';
import { OwnerBadge } from './OwnerBadge';
import { GachaPick } from './picker/GachaPick';
import { MorningActivityCard } from './MorningActivityCard';
import { useHomework, isActiveToday as isHwActiveToday, missingOf as hwMissingOf, toggleDone as hwToggleDone } from '../utils/homeworkStore';
import { HomeworkBoard, HomeworkDismissalAlert } from './HomeworkBoard';
import { QrDisplay } from './QrDisplay';
import { computeNextLesson } from '../utils/nextLesson';
import { fetchMeals, getSavedSchool, toYmd } from '../utils/neisSchool';
import { PICK_SPIN_SOUNDS, TIMER_FONTS, TIMER_POINTS, TIMER_SOUNDS, getTimerAlert, playPickTick, playTimerSound, playTimerTick, timerAlertMessage, useTimerAlert, type TimerSoundId } from '../utils/timerAlerts';
import { createPortal } from 'react-dom';
import {
  Clock,
  Volume2,
  Users,
  Coffee,
  Sparkles,
  Timer as TimerIcon,
  HelpCircle,
  RotateCcw,
  Plus,
  Minus,
  Maximize2,
  Minimize2,
  ExternalLink,
  Flame,
  CheckCircle2,
  XCircle,
  Mic,
  MicOff,
  Edit3,
  Check,
  CheckSquare,
  Square,
  History,
  Trash2,
  Palette,
  Eye,
  Sliders,
  Sun,
  Moon,
  Monitor,
  X,
  Smile,
  BookOpen,
  Settings,
  ChevronUp,
  ChevronDown,
  Sunrise,
  EyeOff,
  Hand,
  ListOrdered,
  Trophy as TrophyIcon2,
  Hash,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  Student,
  ClassRole,
  Team,
  QuizQuestion,
  TelepathyQuiz,
  BasketballScoreboardTeam,
  DashboardTheme,
  DualDisplayThemeSettings,
  DualDisplayThemeMode,
  DualDisplayRecommendedTheme,
  AttendanceStatus,
} from '../types';
import {
  initialTelepathyQuizzes,
  initialBasketballTeams,
  initialQuizzes,
  initialStudents,
  initialRoles,
  initialTeams,
} from '../data/initialData';
import { playCelebrateSound, playSelectedChime } from '../utils/audio';
import { THEME_CONFIGS, getTheme, resolveIsDarkMode } from '../utils/theme';
import { getDayTypeInfo } from '../utils/koreanHolidays';
import { TigerStatusCharacter, TigerStatus } from './TigerStatusCharacter';
import { DualMonitorDrawingCanvas } from './DualMonitorDrawingCanvas';
import { CleanBgmPlayer } from './CleanBgmPlayer';
import { TeamDeskArea } from './TeamDeskArea';
import { BirthdayCelebration } from './BirthdayCelebration';
import { MochiBody, useMochiTint } from './MochiCharacter';
import { listenBirthdayCelebration, type BirthdayKid, findBirthdayKids } from '../utils/celebrate';
import GameBracket from './games/GameBracket';
import { playTimeWarning, playTimeTick } from '../utils/gameSounds';
import ScoreBoard from './games/ScoreBoard';
import { DISPLAY_TABS, getBellSchedule, phaseNow, setAutoSwitch, setTabLayout, setTouchMode, useDisplayPrefs, weekKey, type DisplayTabId } from '../utils/displayTabs';
import AutoFitStage from './AutoFitStage';
import { playPickSfx } from '../utils/pickSounds';
import PickerModes, { PICK_METHODS, type PickItem, type PickMethod, type PickDoneKind } from './picker/PickerModes';
import SequenceTimer from './SequenceTimer';
import {
  alignAllTeams,
  buildColumns,
  forgetDeskPosition,
  moveStudentToColumn,
  resetColumnSizes,
  resetDeskLayout,
  swapDeskPositions,
  writeSeatingSetting,
  useSeatingSettingSync,
  useSeatingLayoutVersion, useSeatingPerspective } from '../utils/seatingLayout';

export interface DisplaySyncState {
  activeTab: 'attendance' | 'drawing' | 'timer' | 'break' | 'clean' | 'quiz' | 'roles' | 'picker' | 'noise' | 'seating' | 'morning' | 'bracket' | 'score' | 'qr' | 'homework';
  /** 🙈 잠깐 가리기 (루미 대기 화면) */
  isBlanked?: boolean;
  quizType: 'ox' | 'choice' | 'telepathy' | 'scoreboard';
  quizIndex: number;
  isAnswerRevealed: boolean;
  quizzes: QuizQuestion[];
  quizStatus: 'IDLE' | 'ACTIVE'; // 퀴즈 대기 스탠바이(IDLE) vs 실시간 송출(ACTIVE)
  isQuizPublished: boolean; // 교사 화면에서 보조 모니터로 송출 여부
  telepathyIndex: number;
  telepathyList: TelepathyQuiz[];
  telepathyTimer: number;
  isTelepathyTimerRunning: boolean;
  isTelepathyRevealed: boolean;
  scoreboardTeams: BasketballScoreboardTeam[];
  periodQuarter?: number;
  decibel: number;
  timerSeconds: number;
  isTimerRunning: boolean;
  // Clean & Dismissal Sync
  cleanTimerSeconds: number;
  isCleanTimerRunning: boolean;
  cleanBannerSpeed: number;
  cleanNeonColor: 'cyan' | 'pink' | 'yellow' | 'green';
  cleanNeonGlow: boolean;
  cleanFontSize: 'sm' | 'md' | 'lg' | 'xl';
  cleanNotices: ({ id: string; text: string; createdAt?: string } | string)[];
  // Break Time Sync
  breakTimerSeconds: number;
  isBreakTimerRunning: boolean;
  breakNextPeriod: number;
  breakNextSubject: string;
  breakAnnouncement: string;
  nextPeriodInfo?: string;
}

const STORAGE_KEY = 'class_dual_display_sync_state';

// 📝 마지막에 입력한 글자 기억: 보조 화면(따로 연 창 포함)과 메인 화면 청소·종례 / 쉬는 시간이 같은 저장소를 써요
const readJson = (k: string) => {
  try {
    const v = localStorage.getItem(k);
    return v == null ? null : JSON.parse(v);
  } catch {
    return null;
  }
};
export function rememberDisplayTexts(u: Partial<DisplaySyncState>) {
  try {
    if (Array.isArray(u.cleanNotices)) {
      const list = u.cleanNotices
        .map((n: any, i: number) => (typeof n === 'string' ? { id: `n-${i}`, text: n, createdAt: '오늘' } : { id: String(n.id ?? i), text: String(n.text ?? ''), createdAt: n.createdAt || '오늘' }))
        .filter((n) => n.text.trim());
      localStorage.setItem('clean_dismissal_notices', JSON.stringify(list));
    }
    if (typeof u.cleanBannerSpeed === 'number') localStorage.setItem('clean_banner_speed', String(u.cleanBannerSpeed));
    if (typeof u.cleanNeonColor === 'string') localStorage.setItem('clean_neon_color', u.cleanNeonColor);
    if (typeof u.cleanNeonGlow === 'boolean') localStorage.setItem('clean_neon_glow', String(u.cleanNeonGlow));
    if (typeof u.cleanFontSize === 'string') localStorage.setItem('clean_banner_font_size', u.cleanFontSize);
    if (typeof u.breakAnnouncement === 'string') localStorage.setItem('break_mode_announcement', u.breakAnnouncement);
  } catch {
    /* 무시 */
  }
}
function recalledDisplayTexts(): Partial<DisplaySyncState> {
  const out: Partial<DisplaySyncState> = {};
  const notices = readJson('clean_dismissal_notices');
  if (Array.isArray(notices) && notices.length) out.cleanNotices = notices;
  try {
    const sp = Number(localStorage.getItem('clean_banner_speed'));
    if (sp > 0) out.cleanBannerSpeed = sp;
    const col = localStorage.getItem('clean_neon_color');
    if (col === 'cyan' || col === 'pink' || col === 'yellow' || col === 'green') out.cleanNeonColor = col as any;
    const glow = localStorage.getItem('clean_neon_glow');
    if (glow === 'true' || glow === 'false') out.cleanNeonGlow = glow === 'true';
    const fs = localStorage.getItem('clean_banner_font_size');
    if (fs) out.cleanFontSize = fs as any;
    const ann = localStorage.getItem('break_mode_announcement');
    if (ann != null && ann.trim()) out.breakAnnouncement = ann;
  } catch {
    /* 무시 */
  }
  return out;
}
export const DUAL_THEME_STORAGE_KEY = 'class_dual_display_theme_settings';

export const DEFAULT_DUAL_THEME_SETTINGS: DualDisplayThemeSettings = {
  mode: 'recommended',
  recommendedTheme: 'elementary', // ⭐ 요청 9: 9대 파스텔 프리셋 테마 중 초등학교 테마를 기본값으로 지정
  customBgColor: '#f8fafc',
  customCardStyle: 'solid',
  timerGlowIntensity: 'soft', // 기본 번짐 효과: 눈이 편안한 은은한 소프트 그림자
  timerColorPreset: 'default', // 기본 타이머 색상: 선택된 테마 연동
  timerCustomColor: '#22d3ee',
  clockColorPreset: 'default',
  clockCustomColor: '#fde047',
};

// 🎨 타이머/시계 전용 고시인성 프리셋 컬러 목록 (초등 교실 시각 최적화)
export const TIMER_COLOR_PRESETS = [
  {
    key: 'default' as const,
    name: '테마기본',
    hex: '#ffffff',
    colorName: '테마 기본색',
    badgeColor: 'bg-indigo-500',
    twClass: '',
    glowSoft: 'drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]',
    glowNeon: 'drop-shadow-[0_0_12px_rgba(255,255,255,0.6)]',
  },
  {
    key: 'white' as const,
    name: '화이트',
    hex: '#ffffff',
    colorName: '퓨어 화이트',
    badgeColor: 'bg-white border border-slate-300',
    twClass: 'text-white',
    glowSoft: 'drop-shadow-[0_2px_8px_rgba(255,255,255,0.25)]',
    glowNeon: 'drop-shadow-[0_0_12px_rgba(255,255,255,0.7)]',
  },
  {
    key: 'yellow' as const,
    name: '옐로우',
    hex: '#fde047',
    colorName: '레몬 옐로우',
    badgeColor: 'bg-yellow-400',
    twClass: 'text-yellow-300',
    glowSoft: 'drop-shadow-[0_2px_8px_rgba(253,224,71,0.3)]',
    glowNeon: 'drop-shadow-[0_0_12px_rgba(253,224,71,0.65)]',
  },
  {
    key: 'green' as const,
    name: '에메랄드',
    hex: '#34d399',
    colorName: '에메랄드 그린',
    badgeColor: 'bg-emerald-400',
    twClass: 'text-emerald-400',
    glowSoft: 'drop-shadow-[0_2px_8px_rgba(52,211,153,0.3)]',
    glowNeon: 'drop-shadow-[0_0_12px_rgba(52,211,153,0.65)]',
  },
  {
    key: 'cyan' as const,
    name: '시안',
    hex: '#22d3ee',
    colorName: '네온 시안',
    badgeColor: 'bg-cyan-400',
    twClass: 'text-cyan-400',
    glowSoft: 'drop-shadow-[0_2px_8px_rgba(34,211,238,0.3)]',
    glowNeon: 'drop-shadow-[0_0_12px_rgba(34,211,238,0.65)]',
  },
  {
    key: 'orange' as const,
    name: '오렌지',
    hex: '#fb923c',
    colorName: '웜 오렌지',
    badgeColor: 'bg-orange-400',
    twClass: 'text-orange-400',
    glowSoft: 'drop-shadow-[0_2px_8px_rgba(251,146,60,0.3)]',
    glowNeon: 'drop-shadow-[0_0_12px_rgba(251,146,60,0.65)]',
  },
  {
    key: 'pink' as const,
    name: '핑크',
    hex: '#f472b6',
    colorName: '로즈 핑크',
    badgeColor: 'bg-pink-400',
    twClass: 'text-pink-400',
    glowSoft: 'drop-shadow-[0_2px_8px_rgba(244,114,182,0.3)]',
    glowNeon: 'drop-shadow-[0_0_12px_rgba(244,114,182,0.65)]',
  },
  {
    key: 'purple' as const,
    name: '바이올렛',
    hex: '#c084fc',
    colorName: '라벤더 바이올렛',
    badgeColor: 'bg-purple-400',
    twClass: 'text-purple-400',
    glowSoft: 'drop-shadow-[0_2px_8px_rgba(192,132,252,0.3)]',
    glowNeon: 'drop-shadow-[0_0_12px_rgba(192,132,252,0.65)]',
  },
];

// 🌟 추천 설정 (첨부 4 참고: 어두운 계열 3종 삭제 후 9대 프리셋 테마와 1:1 완벽 동기화)
export const RECOMMENDED_DUAL_THEMES: Record<
  DualDisplayRecommendedTheme,
  {
    name: string;
    shortName: string;
    icon: string;
    tag: string;
    desc: string;
    badgeBg: string;
    bgClass: string;
    bgStyle: React.CSSProperties;
    previewGradient: string;
    headerClass: string;
    cardClass: string;
    accentClass: string;
    timerFontClass: string;
    textColor: string;
    subTextColor: string;
    isLight?: boolean;
  }
> = {
  'clean-white': {
    name: '클린 화이트',
    shortName: '클린화이트',
    icon: '🤍',
    tag: '연회색 & 흰 카드 & 로열 블루',
    desc: '깔끔한 연회색 바탕에 흰 카드와 블루 포인트',
    badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
    bgClass: 'bg-[#F2F3F5] text-[#0B0B0F]',
    bgStyle: { backgroundColor: '#F2F3F5', background: '#F2F3F5' },
    previewGradient: 'from-slate-100 via-white to-blue-100',
    headerClass: 'bg-white border-b border-slate-100 text-[#0B0B0F] shadow-xs',
    cardClass: 'bg-white border border-transparent shadow-sm text-[#0B0B0F]',
    accentClass: 'text-blue-600',
    timerFontClass: 'text-[#0B0B0F] font-black',
    textColor: 'text-[#0B0B0F]',
    subTextColor: 'text-slate-500',
    isLight: true,
  },
  elementary: {
    name: '초등학교',
    shortName: '초등학교',
    icon: '🏫',
    tag: '활기찬 옐로우 & 스카이',
    desc: '아이들의 창의력과 밝은 에너지를 주는 스쿨 옐로우',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
    bgClass: 'bg-gradient-to-br from-amber-50 via-sky-50 to-emerald-50 text-slate-900',
    bgStyle: {
      backgroundColor: '#fefce8',
      background: 'linear-gradient(135deg, #fefce8 0%, #f0f9ff 50%, #ecfdf5 100%)',
    },
    previewGradient: 'from-amber-200 via-sky-200 to-emerald-200',
    headerClass: 'bg-white/95 backdrop-blur-md border-b border-amber-200/70 text-slate-900 shadow-xs',
    cardClass: 'bg-white/95 backdrop-blur-sm border border-amber-200/70 shadow-sm text-slate-900',
    accentClass: 'text-amber-600',
    timerFontClass: 'text-slate-900 drop-shadow-sm font-black',
    textColor: 'text-slate-900',
    subTextColor: 'text-slate-600',
    isLight: true,
  },
  pastel: {
    name: '따뜻한 웜 파스텔',
    shortName: '웜파스텔',
    icon: '🍑',
    tag: '클레이모피즘',
    desc: '포근하고 정서적 안정을 주는 클레이 피치 & 바닐라 크림',
    badgeBg: 'bg-rose-100 text-rose-900 border-rose-300',
    bgClass: 'bg-gradient-to-br from-orange-50 via-rose-50 to-pink-50 text-slate-900',
    bgStyle: {
      backgroundColor: '#fff7ed',
      background: 'linear-gradient(135deg, #fff7ed 0%, #fdf2f8 50%, #fef2f2 100%)',
    },
    previewGradient: 'from-orange-200 via-rose-200 to-pink-200',
    headerClass: 'bg-white/95 backdrop-blur-md border-b border-orange-200/70 text-slate-900 shadow-xs',
    cardClass: 'bg-white/95 backdrop-blur-sm border border-orange-200/70 shadow-sm text-slate-900',
    accentClass: 'text-rose-600',
    timerFontClass: 'text-slate-900 drop-shadow-sm font-black',
    textColor: 'text-slate-900',
    subTextColor: 'text-slate-600',
    isLight: true,
  },
  indigo: {
    name: '지적인 네오 인디고',
    shortName: '네오인디고',
    icon: '💡',
    tag: '하이테크 블루',
    desc: '신뢰감과 높은 집중도를 주는 모던 하이테크 블루',
    badgeBg: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    bgClass: 'bg-gradient-to-br from-indigo-50 via-slate-50 to-blue-50 text-slate-900',
    bgStyle: {
      backgroundColor: '#eef2ff',
      background: 'linear-gradient(135deg, #eef2ff 0%, #f8fafc 50%, #eff6ff 100%)',
    },
    previewGradient: 'from-indigo-200 via-slate-200 to-blue-200',
    headerClass: 'bg-white/95 backdrop-blur-md border-b border-indigo-200/70 text-slate-900 shadow-xs',
    cardClass: 'bg-white/95 backdrop-blur-sm border border-indigo-200/70 shadow-sm text-slate-900',
    accentClass: 'text-indigo-600',
    timerFontClass: 'text-slate-900 drop-shadow-sm font-black',
    textColor: 'text-slate-900',
    subTextColor: 'text-slate-600',
    isLight: true,
  },
  emerald: {
    name: '내추럴 에메랄드',
    shortName: '에메랄드',
    icon: '🌿',
    tag: '스칸디나비안',
    desc: '자연 친화적이고 눈의 피로를 덜어주는 보태니컬 세이지',
    badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    bgClass: 'bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-50 text-slate-900',
    bgStyle: {
      backgroundColor: '#ecfdf5',
      background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 50%, #f8fafc 100%)',
    },
    previewGradient: 'from-emerald-200 via-teal-200 to-slate-200',
    headerClass: 'bg-white/95 backdrop-blur-md border-b border-emerald-200/70 text-slate-900 shadow-xs',
    cardClass: 'bg-white/95 backdrop-blur-sm border border-emerald-200/70 shadow-sm text-slate-900',
    accentClass: 'text-emerald-600',
    timerFontClass: 'text-slate-900 drop-shadow-sm font-black',
    textColor: 'text-slate-900',
    subTextColor: 'text-slate-600',
    isLight: true,
  },
  lavender: {
    name: '소프트 라벤더',
    shortName: '라벤더',
    icon: '🦄',
    tag: '모던 크리에이티브',
    desc: '창의성과 상상력을 자극하는 부드러운 라일락 & 바이올렛',
    badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
    bgClass: 'bg-gradient-to-br from-purple-50 via-fuchsia-50 to-slate-50 text-slate-900',
    bgStyle: {
      backgroundColor: '#faf5ff',
      background: 'linear-gradient(135deg, #faf5ff 0%, #fdf4ff 50%, #f8fafc 100%)',
    },
    previewGradient: 'from-purple-200 via-fuchsia-200 to-slate-200',
    headerClass: 'bg-white/95 backdrop-blur-md border-b border-purple-200/70 text-slate-900 shadow-xs',
    cardClass: 'bg-white/95 backdrop-blur-sm border border-purple-200/70 shadow-sm text-slate-900',
    accentClass: 'text-purple-600',
    timerFontClass: 'text-slate-900 drop-shadow-sm font-black',
    textColor: 'text-slate-900',
    subTextColor: 'text-slate-600',
    isLight: true,
  },
  cafe: {
    name: '코지 카페',
    shortName: '코지카페',
    icon: '☕',
    tag: '따뜻한 우드 & 라떼',
    desc: '원목 가구와 라떼의 안락함이 느껴지는 포근한 베이지',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
    bgClass: 'bg-gradient-to-br from-amber-50 via-stone-50 to-orange-50 text-slate-900',
    bgStyle: {
      backgroundColor: '#fffbeb',
      background: 'linear-gradient(135deg, #fffbeb 0%, #fafaf9 50%, #fff7ed 100%)',
    },
    previewGradient: 'from-amber-200 via-stone-200 to-orange-200',
    headerClass: 'bg-white/95 backdrop-blur-md border-b border-amber-200/70 text-slate-900 shadow-xs',
    cardClass: 'bg-white/95 backdrop-blur-sm border border-amber-200/70 shadow-sm text-slate-900',
    accentClass: 'text-amber-700',
    timerFontClass: 'text-slate-900 drop-shadow-sm font-black',
    textColor: 'text-slate-900',
    subTextColor: 'text-slate-600',
    isLight: true,
  },
  sunset: {
    name: '노을 피치 코럴',
    shortName: '노을피치',
    icon: '🌅',
    tag: '석양 앰버',
    desc: '황금빛 석양과 복숭아 코랄이 어우러진 감성 스쿨',
    badgeBg: 'bg-rose-100 text-rose-900 border-rose-300',
    bgClass: 'bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 text-slate-900',
    bgStyle: {
      backgroundColor: '#fff1f2',
      background: 'linear-gradient(135deg, #fff1f2 0%, #fff7ed 50%, #fefce8 100%)',
    },
    previewGradient: 'from-rose-200 via-orange-200 to-amber-200',
    headerClass: 'bg-white/95 backdrop-blur-md border-b border-rose-200/70 text-slate-900 shadow-xs',
    cardClass: 'bg-white/95 backdrop-blur-sm border border-rose-200/70 shadow-sm text-slate-900',
    accentClass: 'text-rose-600',
    timerFontClass: 'text-slate-900 drop-shadow-sm font-black',
    textColor: 'text-slate-900',
    subTextColor: 'text-slate-600',
    isLight: true,
  },
  office: {
    name: '모던 오피스',
    shortName: '모던오피스',
    icon: '💼',
    tag: '미니멀 그레이 & 틸',
    desc: '교무실 및 세련된 업무 환경을 위한 단정하고 가독성 높은 틸',
    badgeBg: 'bg-teal-100 text-teal-900 border-teal-300',
    bgClass: 'bg-gradient-to-br from-slate-50 via-teal-50 to-gray-50 text-slate-900',
    bgStyle: {
      backgroundColor: '#f8fafc',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f0fdfa 50%, #f9fafb 100%)',
    },
    previewGradient: 'from-slate-200 via-teal-200 to-gray-200',
    headerClass: 'bg-white/95 backdrop-blur-md border-b border-teal-200/70 text-slate-900 shadow-xs',
    cardClass: 'bg-white/95 backdrop-blur-sm border border-teal-200/70 shadow-sm text-slate-900',
    accentClass: 'text-teal-600',
    timerFontClass: 'text-slate-900 drop-shadow-sm font-black',
    textColor: 'text-slate-900',
    subTextColor: 'text-slate-600',
    isLight: true,
  },
  slate: {
    name: '모던 슬레이트',
    shortName: '모던슬레이트',
    icon: '🍱',
    tag: '네오 벤토 그리드',
    desc: '깔끔하고 차분한 모던 라이트 벤토 그리드',
    badgeBg: 'bg-slate-200 text-slate-900 border-slate-300',
    bgClass: 'bg-gradient-to-br from-slate-100 via-gray-100 to-zinc-100 text-slate-900',
    bgStyle: {
      backgroundColor: '#f1f5f9',
      background: 'linear-gradient(135deg, #f1f5f9 0%, #f3f4f6 50%, #f4f4f5 100%)',
    },
    previewGradient: 'from-slate-200 via-gray-200 to-zinc-200',
    headerClass: 'bg-white/95 backdrop-blur-md border-b border-slate-300/70 text-slate-900 shadow-xs',
    cardClass: 'bg-white/95 backdrop-blur-sm border border-slate-300/70 shadow-sm text-slate-900',
    accentClass: 'text-slate-700',
    timerFontClass: 'text-slate-900 drop-shadow-sm font-black',
    textColor: 'text-slate-900',
    subTextColor: 'text-slate-600',
    isLight: true,
  },
  'class-basic': {
    name: '스쿨 베이직',
    shortName: '스쿨베이직',
    icon: '🏫',
    tag: '활기찬 옐로우 & 스카이',
    desc: '아이들의 창의력과 밝은 에너지를 주는 스쿨 옐로우',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
    bgClass: 'bg-gradient-to-br from-amber-50 via-sky-50 to-emerald-50 text-slate-900',
    bgStyle: {
      backgroundColor: '#fefce8',
      background: 'linear-gradient(135deg, #fefce8 0%, #f0f9ff 50%, #ecfdf5 100%)',
    },
    previewGradient: 'from-amber-200 via-sky-200 to-emerald-200',
    headerClass: 'bg-white/95 backdrop-blur-md border-b border-amber-200/70 text-slate-900 shadow-xs',
    cardClass: 'bg-white/95 backdrop-blur-sm border border-amber-200/70 shadow-sm text-slate-900',
    accentClass: 'text-amber-600',
    timerFontClass: 'text-slate-900 drop-shadow-sm font-black',
    textColor: 'text-slate-900',
    subTextColor: 'text-slate-600',
    isLight: true,
  },
  'cozy-latte': {
    name: '코지 웜 & 라떼',
    shortName: '코지라떼',
    icon: '☕',
    tag: '따뜻한 우드 & 라떼',
    desc: '원목 가구와 라떼의 안락함이 느껴지는 포근한 베이지',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
    bgClass: 'bg-gradient-to-br from-amber-50 via-stone-50 to-orange-50 text-slate-900',
    bgStyle: {
      backgroundColor: '#fffbeb',
      background: 'linear-gradient(135deg, #fffbeb 0%, #fafaf9 50%, #fff7ed 100%)',
    },
    previewGradient: 'from-amber-200 via-stone-200 to-orange-200',
    headerClass: 'bg-white/95 backdrop-blur-md border-b border-amber-200/70 text-slate-900 shadow-xs',
    cardClass: 'bg-white/95 backdrop-blur-sm border border-amber-200/70 shadow-sm text-slate-900',
    accentClass: 'text-amber-700',
    timerFontClass: 'text-slate-900 drop-shadow-sm font-black',
    textColor: 'text-slate-900',
    subTextColor: 'text-slate-600',
    isLight: true,
  },
  'botanical-sage': {
    name: '보태니컬 세이지',
    shortName: '세이지',
    icon: '🌿',
    tag: '차분한 내추럴 그린',
    desc: '눈의 피로를 덜어주는 편안하고 차분한 세이지 그린',
    badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    bgClass: 'bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 text-slate-900',
    bgStyle: {
      backgroundColor: '#ecfdf5',
      background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 50%, #f0fdf4 100%)',
    },
    previewGradient: 'from-emerald-200 via-teal-200 to-green-200',
    headerClass: 'bg-white/95 backdrop-blur-md border-b border-emerald-200/70 text-slate-900 shadow-xs',
    cardClass: 'bg-white/95 backdrop-blur-sm border border-emerald-200/70 shadow-sm text-slate-900',
    accentClass: 'text-emerald-600',
    timerFontClass: 'text-slate-900 drop-shadow-sm font-black',
    textColor: 'text-slate-900',
    subTextColor: 'text-slate-600',
    isLight: true,
  },
  'glass-aurora': {
    name: '글래스 오로라',
    shortName: '글래스오로라',
    icon: '✨',
    tag: '환상적인 파스텔 오로라',
    desc: '몽환적이고 부드러운 글래스모피즘 그라데이션',
    badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
    bgClass: 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 text-slate-900',
    bgStyle: {
      backgroundColor: '#faf5ff',
      background: 'linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 50%, #fce7f3 100%)',
    },
    previewGradient: 'from-indigo-200 via-purple-200 to-pink-200',
    headerClass: 'bg-white/95 backdrop-blur-md border-b border-purple-200/70 text-slate-900 shadow-xs',
    cardClass: 'bg-white/95 backdrop-blur-sm border border-purple-200/70 shadow-sm text-slate-900',
    accentClass: 'text-purple-600',
    timerFontClass: 'text-slate-900 drop-shadow-sm font-black',
    textColor: 'text-slate-900',
    subTextColor: 'text-slate-600',
    isLight: true,
  },
  glassmorphism: {
    name: '크리스탈 글래스',
    shortName: '크리스탈',
    icon: '💎',
    tag: '투명하고 세련된 글래스',
    desc: '맑고 투명한 현대적 유리 질감 대시보드',
    badgeBg: 'bg-cyan-100 text-cyan-900 border-cyan-300',
    bgClass: 'bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 text-slate-900',
    bgStyle: {
      backgroundColor: '#f0f9ff',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #eff6ff 50%, #e0e7ff 100%)',
    },
    previewGradient: 'from-sky-200 via-blue-200 to-indigo-200',
    headerClass: 'bg-white/95 backdrop-blur-md border-b border-sky-200/70 text-slate-900 shadow-xs',
    cardClass: 'bg-white/95 backdrop-blur-sm border border-sky-200/70 shadow-sm text-slate-900',
    accentClass: 'text-sky-600',
    timerFontClass: 'text-slate-900 drop-shadow-sm font-black',
    textColor: 'text-slate-900',
    subTextColor: 'text-slate-600',
    isLight: true,
  },
  'lavender-fog': {
    name: '라벤더 포그',
    shortName: '라벤더',
    icon: '🪻',
    tag: '모던 라벤더 & 매트 독',
    desc: '소프트 라벤더 캔버스와 매트 다크 독',
    badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
    bgClass: 'bg-[#F4F2F8] text-[#1E1B2E]',
    bgStyle: {
      backgroundColor: '#F4F2F8',
      background: 'linear-gradient(135deg, #F4F2F8 0%, #EFEBF5 100%)',
    },
    previewGradient: 'from-purple-200 via-violet-200 to-indigo-200',
    headerClass: 'bg-white/95 backdrop-blur-md border-b border-purple-200 text-[#1E1B2E] shadow-xs',
    cardClass: 'bg-white/95 backdrop-blur-sm border border-purple-200/80 shadow-sm text-[#1E1B2E]',
    accentClass: 'text-purple-600',
    timerFontClass: 'text-[#1E1B2E] drop-shadow-sm font-black',
    textColor: 'text-[#1E1B2E]',
    subTextColor: 'text-slate-600',
    isLight: true,
  },
  'ember-sunset': {
    name: '엠버 선셋',
    shortName: '엠버선셋',
    icon: '🍊',
    tag: '웜 크림 & 테라코타',
    desc: '아늑한 웜 크림과 테라코타 오렌지 전역 테마',
    badgeBg: 'bg-orange-100 text-orange-900 border-orange-300',
    bgClass: 'bg-[#FBF8F3] text-[#292524]',
    bgStyle: {
      backgroundColor: '#FBF8F3',
      background: 'linear-gradient(135deg, #FBF8F3 0%, #F5F0E8 100%)',
    },
    previewGradient: 'from-amber-200 via-orange-200 to-red-200',
    headerClass: 'bg-white/95 backdrop-blur-md border-b border-orange-200 text-[#292524] shadow-xs',
    cardClass: 'bg-white/95 backdrop-blur-sm border border-orange-200/80 shadow-sm text-[#292524]',
    accentClass: 'text-orange-600',
    timerFontClass: 'text-[#292524] drop-shadow-sm font-black',
    textColor: 'text-[#292524]',
    subTextColor: 'text-stone-600',
    isLight: true,
  },
  'cyber-glossy': {
    name: '사이버 글로시',
    shortName: '사이버',
    icon: '💎',
    tag: '딥 다크 글래스모피즘',
    desc: '코스믹 다크 배경과 빛나는 시안/퍼플 네온 림',
    badgeBg: 'bg-cyan-950 text-cyan-200 border-cyan-800',
    bgClass: 'bg-[#070913] text-[#F8FAFC]',
    bgStyle: {
      backgroundColor: '#070913',
      background: 'linear-gradient(135deg, #070913 0%, #03050A 100%)',
    },
    previewGradient: 'from-cyan-900 via-blue-950 to-purple-950',
    headerClass: 'bg-[#0E1628]/95 backdrop-blur-md border-b border-cyan-500/40 text-[#F8FAFC] shadow-2xl',
    cardClass: 'bg-[#0E1628]/90 backdrop-blur-sm border border-cyan-500/40 shadow-xl text-[#F8FAFC]',
    accentClass: 'text-cyan-400',
    timerFontClass: 'text-[#F8FAFC] drop-shadow-md font-black',
    textColor: 'text-[#F8FAFC]',
    subTextColor: 'text-slate-300',
    isLight: false,
  },
};

export const QUICK_CUSTOM_COLORS = [
  { name: '미드나잇', hex: '#030712' },
  { name: '초록칠판', hex: '#081710' },
  { name: '딥인디고', hex: '#1e1b4b' },
  { name: '딥바이올렛', hex: '#2e1065' },
  { name: '다크챠콜', hex: '#111827' },
  { name: '딥포레스트', hex: '#022c22' },
  { name: '다크오션', hex: '#082f49' },
  { name: '웜화이트', hex: '#f8fafc' },
];

const DEFAULT_SYNC_STATE: DisplaySyncState = {
  activeTab: 'timer',
  quizType: 'ox',
  quizIndex: 0,
  isAnswerRevealed: false,
  quizzes: initialQuizzes,
  quizStatus: 'IDLE',
  isQuizPublished: false,
  telepathyIndex: 0,
  telepathyList: initialTelepathyQuizzes,
  telepathyTimer: 15,
  isTelepathyTimerRunning: false,
  isTelepathyRevealed: false,
  scoreboardTeams: initialBasketballTeams,
  decibel: 42,
  timerSeconds: 300,
  isTimerRunning: false,
  cleanTimerSeconds: 600,
  isCleanTimerRunning: false,
  cleanBannerSpeed: 34,
  cleanNeonColor: 'cyan',
  cleanNeonGlow: true,
  cleanFontSize: 'md',
  cleanNotices: [
    { id: '1', text: '책상 위 모든 물건을 서랍과 사물함에 바르게 정리합니다.', createdAt: '오후 2:30' },
    { id: '2', text: '자기 자리 바닥에 떨어진 쓰레기와 지우개 가루를 깨끗이 줍습니다.', createdAt: '오후 2:31' },
    { id: '3', text: '오늘의 담당 1인 1역 청소 구역을 정성껏 마무리해 주세요.', createdAt: '오후 2:32' },
    { id: '4', text: '의자를 책상 안으로 바르게 밀어 넣고 하교 준비를 마칩니다.', createdAt: '오후 2:33' },
  ],
  breakTimerSeconds: 600,
  isBreakTimerRunning: false,
  breakNextPeriod: 2,
  breakNextSubject: '수학',
  breakAnnouncement: '수학책, 수학익힘책 38~41쪽, 연필, 지우개, 자 준비',
  nextPeriodInfo: '2교시 [수학] • 수학책, 수학익힘책 38~41쪽 준비',
};

export const getInitialSyncState = (
  quizzes?: QuizQuestion[],
  teams?: Team[],
  decibel?: number
): DisplaySyncState => {
  // 💡 [문제 등록 및 관리 영속성]: 로컬스토리지에 저장된 교사의 최신 문제 우선 복원
  let persistentQuizzes = quizzes && quizzes.length > 0 ? quizzes : initialQuizzes;
  try {
    const savedCustomQuizzes =
      localStorage.getItem('class_quiz_questions') ||
      localStorage.getItem('quiz_custom_questions');
    if (savedCustomQuizzes) {
      const parsedCustom = JSON.parse(savedCustomQuizzes);
      if (Array.isArray(parsedCustom) && parsedCustom.length > 0) {
        persistentQuizzes = parsedCustom;
      }
    }
  } catch {}

  let persistentTelepathy = initialTelepathyQuizzes;
  try {
    const savedCustomTele =
      localStorage.getItem('class_telepathy_quizzes') ||
      localStorage.getItem('telepathy_custom_quizzes');
    if (savedCustomTele) {
      const parsedTele = JSON.parse(savedCustomTele);
      if (Array.isArray(parsedTele) && parsedTele.length > 0) {
        persistentTelepathy = parsedTele;
      }
    }
  } catch {}

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_SYNC_STATE,
        ...parsed,
        ...recalledDisplayTexts(),
        quizzes: parsed.quizzes && parsed.quizzes.length > 0 ? parsed.quizzes : persistentQuizzes,
        telepathyList: parsed.telepathyList && parsed.telepathyList.length > 0 ? parsed.telepathyList : persistentTelepathy,
        cleanTimerSeconds:
          typeof parsed.cleanTimerSeconds === 'number' && !isNaN(parsed.cleanTimerSeconds)
            ? parsed.cleanTimerSeconds
            : 600,
        breakTimerSeconds:
          typeof parsed.breakTimerSeconds === 'number' && !isNaN(parsed.breakTimerSeconds)
            ? parsed.breakTimerSeconds
            : 600,
        timerSeconds:
          typeof parsed.timerSeconds === 'number' && !isNaN(parsed.timerSeconds)
            ? parsed.timerSeconds
            : 300,
        telepathyTimer:
          typeof parsed.telepathyTimer === 'number' && !isNaN(parsed.telepathyTimer)
            ? parsed.telepathyTimer
            : 15,
      };
    }
  } catch {}

  return {
    ...DEFAULT_SYNC_STATE,
    ...recalledDisplayTexts(),
    quizzes: persistentQuizzes,
    telepathyList: persistentTelepathy,
    scoreboardTeams:
      teams && teams.length > 0
        ? teams.map((t) => ({
            id: t.id,
            name: t.name,
            score: t.points || 0,
            color: t.dotColor || 'bg-amber-500',
          }))
        : initialBasketballTeams,
    decibel: decibel || 42,
  };
};

export const broadcastDisplaySyncState = (state: Partial<DisplaySyncState>) => {
  try {
    const existing = getInitialSyncState();
    const updated: DisplaySyncState = {
      ...existing,
      ...state,
      cleanTimerSeconds:
        typeof state.cleanTimerSeconds === 'number' && !isNaN(state.cleanTimerSeconds)
          ? state.cleanTimerSeconds
          : existing.cleanTimerSeconds,
      breakTimerSeconds:
        typeof state.breakTimerSeconds === 'number' && !isNaN(state.breakTimerSeconds)
          ? state.breakTimerSeconds
          : existing.breakTimerSeconds,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    rememberDisplayTexts(state);

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('class_display_sync_channel');
      channel.postMessage(updated);
      channel.close();
    }
  } catch {}
};

interface DualMonitorDisplayViewProps {
  standalone?: boolean;
  initialTab?: 'attendance' | 'drawing' | 'timer' | 'break' | 'clean' | 'quiz' | 'roles' | 'picker' | 'noise' | 'seating' | 'morning' | 'bracket' | 'score' | 'qr' | 'homework';
  students?: Student[];
  onUpdateStudentAttendance?: (studentId: number, status: AttendanceStatus) => void;
  onUpdateStudents?: (newStudents: Student[]) => void;
  roles?: ClassRole[];
  onUpdateRoles?: (newRoles: ClassRole[]) => void;
  teams?: Team[];
  onUpdateTeams?: (newTeams: Team[]) => void;
  quizzes?: QuizQuestion[];
  decibel?: number;
  onClose?: () => void;
  onOpenDetached?: (tab?: string) => void;
}

export const DualMonitorDisplayView: React.FC<DualMonitorDisplayViewProps> = ({
  standalone = false,
  initialTab = 'timer',
  students = [],
  onUpdateStudentAttendance,
  onUpdateStudents,
  roles = [],
  onUpdateRoles,
  teams = [],
  onUpdateTeams,
  quizzes = initialQuizzes,
  decibel = 42,
  onClose,
  onOpenDetached,
}) => {
  // 대화면 좌석 배치도 시점 및 모드(모둠좌석 / 개인좌석), 열 수 설정
  const [seatingPerspective, setSeatingPerspective] = useSeatingPerspective();
  // 👩‍🏫 교사 시점 / 🧒 학생 시점 전환 (대시보드 자리·모둠 위젯과 함께 바뀜)
  const perspectiveToggle = (big = false) => (
    <div className={`dm-persp inline-flex items-center p-0.5 rounded-xl border ${activeThemeStyle.isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'}`} data-persp-toggle>
      {(['teacher', 'student'] as const).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => setSeatingPerspective(p)}
          className={`${big ? 'px-3 py-1.5' : 'px-2.5 py-1'} rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
            seatingPerspective === p
              ? 'bg-indigo-600 text-white shadow-sm'
              : activeThemeStyle.isLight
              ? 'text-slate-500 hover:text-slate-800'
              : 'text-slate-400 hover:text-white'
          }`}
          title={p === 'teacher' ? '교탁에서 바라본 모습 (칠판이 아래)' : '학생 자리에서 바라본 모습 (칠판이 위)'}
        >
          <span>{p === 'teacher' ? '🧑‍🏫' : '🧒'}</span>
          <span>{p === 'teacher' ? '교사 시점' : '학생 시점'}</span>
        </button>
      ))}
    </div>
  );
  const [seatingType, setSeatingType] = useState<'team' | 'individual'>(() => {
    try {
      const saved = localStorage.getItem('class_seating_view_type');
      return saved === 'team' ? 'team' : 'individual'; // 위젯과 같은 기본값
    } catch {
      return 'individual';
    }
  });
  const [seatingColumns, setSeatingColumns] = useState<2 | 3>(() => {
    try {
      const saved = localStorage.getItem('class_seating_team_columns');
      return saved === '2' ? 2 : 3; // 위젯과 같은 기본값
    } catch {
      return 3;
    }
  });
  // 개인좌석 모드일 때 열 수 (기본 3열, 2~6열 조절 가능)
  const [individualColumns, setIndividualColumns] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('class_seating_individual_columns');
      const parsed = Number(saved);
      return parsed >= 2 && parsed <= 6 ? parsed : 3;
    } catch {
      return 3;
    }
  });

  // 🏷️ 분단 위치/이름 교사 임의 입력 및 수정 상태 (localStorage 저장)
  const [customColNames, setCustomColNames] = useState<Record<number, string>>(() => {
    try {
      const saved = localStorage.getItem('class_seating_custom_col_names');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { 1: '1분단', 2: '2분단', 3: '3분단', 4: '4분단', 5: '5분단', 6: '6분단' };
  });
  // 🔄 위젯(또는 다른 창)에서 좌석 보기 설정을 바꾸면 보조 화면도 함께
  useSeatingSettingSync((key, value) => {
    if (key === 'class_seating_view_type') setSeatingType(value === 'team' ? 'team' : 'individual');
    if (key === 'class_seating_individual_columns') { const n = Number(value); if (n >= 2 && n <= 6) setIndividualColumns(n); }
    if (key === 'class_seating_team_columns') setSeatingColumns(value === '2' ? 2 : 3);
    if (key === 'class_seating_custom_col_names') { try { if (value) setCustomColNames(JSON.parse(value)); } catch {} }
  });
  const [editingColNumber, setEditingColNumber] = useState<number | null>(null);
  const [editingColText, setEditingColText] = useState<string>('');

  const getColName = (colNum: number) => {
    return customColNames[colNum] || `${colNum}분단`;
  };

  const handleSaveColName = (colNum: number, newName: string) => {
    const trimmed = newName.trim() || `${colNum}분단`;
    const updated = { ...customColNames, [colNum]: trimmed };
    setCustomColNames(updated);
    try {
      writeSeatingSetting('class_seating_custom_col_names', JSON.stringify(updated));
    } catch {}
    setEditingColNumber(null);
  };

  // 🎨 보조 화면 배경 테마 설정 상태 (메인 위젯 동기화, 추천 설정, 개인 설정)
  const [themeSettings, setThemeSettings] = useState<DualDisplayThemeSettings>(() => {
    try {
      const saved = localStorage.getItem(DUAL_THEME_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const validTheme =
          parsed.recommendedTheme && RECOMMENDED_DUAL_THEMES[parsed.recommendedTheme as DualDisplayRecommendedTheme]
            ? parsed.recommendedTheme
            : 'elementary';
        return { ...DEFAULT_DUAL_THEME_SETTINGS, ...parsed, recommendedTheme: validTheme };
      }
    } catch {}
    return DEFAULT_DUAL_THEME_SETTINGS;
  });

  const [isThemeModalOpen, setIsThemeModalOpen] = useState<boolean>(false);
  const [activeSettingTab, setActiveSettingTab] = useState<'timer' | 'theme'>('timer');

  // 🔗 메인 대시보드 테마 설정 동기화 상태
  const [mainConfigTheme, setMainConfigTheme] = useState<{
    theme: DashboardTheme;
    themeMode: 'system' | 'light' | 'dark';
    dashboardBgColor?: string;
    canvasBgImage?: string;
  }>(() => {
    try {
      const saved = localStorage.getItem('class_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          theme: parsed.theme || 'slate',
          themeMode: parsed.themeMode || 'system',
          dashboardBgColor: parsed.dashboardBgColor,
          canvasBgImage: parsed.canvasBgImage || parsed.customBackground?.url,
        };
      }
    } catch {}
    return { theme: 'slate', themeMode: 'system' };
  });

  // 테마 설정 변경 핸들러 및 로컬 스토리지 & 멀티윈도우 동기화
  const handleUpdateThemeSettings = (newSettings: Partial<DualDisplayThemeSettings>) => {
    // 🔗 메인 연동 모드로 전환 시 메인 대시보드 class_config 최신값 강제 재동기화
    if (newSettings.mode === 'sync_main') {
      try {
        const saved = localStorage.getItem('class_config');
        if (saved) {
          const parsed = JSON.parse(saved);
          setMainConfigTheme({
            theme: parsed.theme || 'slate',
            themeMode: parsed.themeMode || 'system',
            dashboardBgColor: parsed.dashboardBgColor,
            canvasBgImage: parsed.canvasBgImage || parsed.customBackground?.url,
          });
        }
      } catch {}
    }

    setThemeSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(DUAL_THEME_STORAGE_KEY, JSON.stringify(updated));
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const ch = new BroadcastChannel('class_display_sync_channel');
          ch.postMessage({ type: 'THEME_SYNC', themeSettings: updated });
          ch.close();
        }
      } catch {}
      return updated;
    });
  };

  // storage 이벤트로 메인 테마 변경 및 보조화면 테마 실시간 동기화
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'class_config' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setMainConfigTheme({
            theme: parsed.theme || 'slate',
            themeMode: parsed.themeMode || 'system',
            dashboardBgColor: parsed.dashboardBgColor,
            canvasBgImage: parsed.canvasBgImage || parsed.customBackground?.url,
          });
        } catch {}
      }
      if (e.key === DUAL_THEME_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setThemeSettings((prev) => ({ ...prev, ...parsed }));
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 🎨 현재 선택된 보조화면 테마 스타일 계산
  const activeThemeStyle = useMemo(() => {
    // 1. 메인 위젯과 동일하게 적용 모드
    if (themeSettings.mode === 'sync_main') {
      // 메인 창이 실제로 쓰는 테마(ttime_ui_theme)를 따라가요 — 예전 설정값(slate 등) 때문에 혼자 어두워지지 않게
      let uiKey = 'clean-white';
      try {
        uiKey = localStorage.getItem('ttime_ui_theme') || 'clean-white';
      } catch {}
      const mainTheme = THEME_CONFIGS[uiKey] ? uiKey : mainConfigTheme.theme || 'clean-white';
      const themeConfig = THEME_CONFIGS[mainTheme] || THEME_CONFIGS['clean-white'] || THEME_CONFIGS.slate;
      // 메인 App 과 같은 계산: 사이버 글로시 → 항상 어둡게, 그 밖에는 화면 모드(라이트/다크/시스템)를 따라요
      const isDark = uiKey === 'cyber-glossy' || resolveIsDarkMode(mainConfigTheme.themeMode || 'system', mainConfigTheme.theme || 'clean-white');

      // 🌈 메인 테마의 라이트/다크에 따라 확실한 인라인 배경 그라디언트 주입
      const fallbackBg = isDark
        ? 'linear-gradient(180deg, #0b1120 0%, #020617 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 50%, #fef3c7 100%)';

      return {
        modeName: `메인 위젯 테마 동기화 (${themeConfig.name})`,
        bgClass: themeConfig.bodyClass,
        bgStyle: {
          backgroundColor: mainConfigTheme.dashboardBgColor || (isDark ? '#0b1120' : '#f8fafc'),
          background: mainConfigTheme.canvasBgImage
            ? undefined
            : mainConfigTheme.dashboardBgColor || fallbackBg,
          backgroundImage: mainConfigTheme.canvasBgImage ? `url("${mainConfigTheme.canvasBgImage}")` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } as React.CSSProperties,
        headerClass: themeConfig.headerClass,
        cardClass: themeConfig.cardClass,
        accentClass: themeConfig.accentClass,
        timerFontClass: isDark
          ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-pink-300 to-indigo-200 drop-shadow-[0_2px_10px_rgba(251,191,36,0.3)] font-black'
          : 'text-slate-900 drop-shadow-sm font-black',
        isLight: !isDark,
        textColor: isDark ? 'text-slate-100' : 'text-slate-900',
        subTextColor: isDark ? 'text-slate-400' : 'text-slate-600',
      };
    }

    // 2. 추천 설정 모드 (학생 시각 최적화 5대 프리셋)
    if (themeSettings.mode === 'recommended') {
      const rec = RECOMMENDED_DUAL_THEMES[themeSettings.recommendedTheme] || RECOMMENDED_DUAL_THEMES.elementary;
      return {
        modeName: `시각 최적화 추천 (${rec.name})`,
        bgClass: rec.bgClass,
        bgStyle: rec.bgStyle || {},
        headerClass: rec.headerClass,
        cardClass: rec.cardClass,
        accentClass: rec.accentClass,
        timerFontClass: rec.timerFontClass,
        isLight: rec.isLight ?? true,
        textColor: rec.textColor,
        subTextColor: rec.subTextColor,
      };
    }

    // 3. 개인 설정 (사용자 커스텀) 모드
    const hex = (themeSettings.customBgColor || '#f8fafc').replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    const isLightCustom = brightness > 140;

    return {
      modeName: '개인 커스텀 배경 설정',
      bgClass: isLightCustom ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-white',
      bgStyle: {
        backgroundColor: themeSettings.customBgColor || '#f8fafc',
        background: themeSettings.customBgColor || '#f8fafc',
        backgroundImage: 'none',
      },
      headerClass: isLightCustom
        ? 'bg-white/95 border-slate-200 text-slate-900 shadow-sm'
        : 'bg-slate-900/95 border-slate-800 text-white',
      cardClass: isLightCustom
        ? themeSettings.customCardStyle === 'glass'
          ? 'bg-white/75 backdrop-blur-xl border border-slate-200/80 text-slate-900 shadow-lg'
          : themeSettings.customCardStyle === 'solid'
          ? 'bg-white border-2 border-slate-300 text-slate-900 shadow-md'
          : 'bg-white/95 border border-slate-200 text-slate-900 shadow-md'
        : themeSettings.customCardStyle === 'glass'
        ? 'bg-slate-900/60 backdrop-blur-xl border border-white/20 text-white shadow-2xl'
        : themeSettings.customCardStyle === 'solid'
        ? 'bg-[#111827] border-2 border-slate-700 text-white shadow-xl'
        : 'bg-slate-900/90 border border-slate-800 text-white shadow-xl',
      accentClass: isLightCustom ? 'text-indigo-600' : 'text-amber-300 drop-shadow-[0_2px_8px_rgba(251,191,36,0.3)]',
      timerFontClass: isLightCustom
        ? 'text-slate-900 drop-shadow-sm font-black'
        : 'text-amber-300 drop-shadow-[0_2px_10px_rgba(252,211,77,0.35)] font-black',
      isLight: isLightCustom,
      textColor: isLightCustom ? 'text-slate-900' : 'text-white',
      subTextColor: isLightCustom ? 'text-slate-600' : 'text-slate-400',
    };
  }, [themeSettings, mainConfigTheme]);

  // ✨ 타이머 및 시계 전용 번짐(Glow) 효과 및 커스텀 색상 계산 훅
  const timerGlowSetting = themeSettings.timerGlowIntensity || 'soft';
  const timerColorSetting = themeSettings.timerColorPreset || 'default';
  const customTimerHex = themeSettings.timerCustomColor || '#22d3ee';
  const clockColorSetting = themeSettings.clockColorPreset || 'default';
  const customClockHex = themeSettings.clockCustomColor || '#fde047';

  // 1. 타이머 숫자(05:00) 색상 및 번짐 스타일
  const resolvedTimerStyle = useMemo(() => {
    let textColorClass = '';
    let customColorHex: string | undefined = undefined;

    if (timerColorSetting === 'custom') {
      customColorHex = customTimerHex;
    } else if (timerColorSetting !== 'default') {
      const preset = TIMER_COLOR_PRESETS.find((p) => p.key === timerColorSetting);
      if (preset?.twClass) {
        textColorClass = preset.twClass;
      } else if (preset) {
        customColorHex = preset.hex;
      }
    }

    let shadowClass = '';
    let customShadowStyle: React.CSSProperties = {};

    if (timerGlowSetting === 'none') {
      // 🌿 깔끔: 번짐 효과를 완전히 제거하여 시인성이 칼같이 또렷한 텍스트
      shadowClass = 'drop-shadow-none filter-none';
    } else if (timerGlowSetting === 'soft') {
      // 🍃 은은하게 (권장): 눈이 편안한 소프트 그림자
      if (timerColorSetting === 'custom' && customTimerHex) {
        customShadowStyle = { filter: `drop-shadow(0 3px 8px ${customTimerHex}50)` };
      } else if (timerColorSetting !== 'default') {
        const preset = TIMER_COLOR_PRESETS.find((p) => p.key === timerColorSetting);
        shadowClass = preset?.glowSoft || 'drop-shadow-[0_2px_8px_rgba(255,255,255,0.25)]';
      } else {
        shadowClass = activeThemeStyle.isLight
          ? 'drop-shadow-xs'
          : 'drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]';
      }
    } else {
      // ⚡ 네온 발광: 12px 이내의 세련된 고시인성 네온 발광 (과도한 30px 번짐 제거)
      if (timerColorSetting === 'custom' && customTimerHex) {
        customShadowStyle = { filter: `drop-shadow(0 0 12px ${customTimerHex}b3)` };
      } else if (timerColorSetting !== 'default') {
        const preset = TIMER_COLOR_PRESETS.find((p) => p.key === timerColorSetting);
        shadowClass = preset?.glowNeon || 'drop-shadow-[0_0_12px_rgba(255,255,255,0.65)]';
      } else {
        shadowClass = activeThemeStyle.isLight
          ? 'drop-shadow-[0_2px_8px_rgba(99,102,241,0.35)]'
          : 'drop-shadow-[0_0_12px_rgba(251,191,36,0.65)]';
      }
    }

    return {
      isCustom: timerColorSetting !== 'default',
      textColorClass,
      customColorHex,
      shadowClass,
      customShadowStyle,
    };
  }, [timerGlowSetting, timerColorSetting, customTimerHex, activeThemeStyle.isLight]);

  // 2. 상단 현재 시각 시계 배지 색상 및 번짐 스타일
  const resolvedClockStyle = useMemo(() => {
    // 만약 시계 색상이 'default'인데 타이머 색상이 커스텀되어 있다면 타이머 색상과 자연스럽게 통일감을 줌
    const effectiveSetting = clockColorSetting !== 'default' 
      ? clockColorSetting 
      : (timerColorSetting !== 'default' ? timerColorSetting : 'default');

    if (effectiveSetting === 'custom') {
      const hex = clockColorSetting === 'custom' ? customClockHex : customTimerHex;
      return {
        isCustom: true,
        style: {
          color: hex,
          backgroundColor: `${hex}1a`,
          borderColor: `${hex}4d`,
        } as React.CSSProperties,
        clockClass: '',
      };
    } else if (effectiveSetting !== 'default') {
      const preset = TIMER_COLOR_PRESETS.find((p) => p.key === effectiveSetting);
      if (preset) {
        const hex = preset.hex;
        return {
          isCustom: true,
          style: {
            color: hex,
            backgroundColor: `${hex}1a`,
            borderColor: `${hex}4d`,
          } as React.CSSProperties,
          clockClass: preset.twClass,
        };
      }
    }

    return {
      isCustom: false,
      style: {} as React.CSSProperties,
      clockClass: activeThemeStyle.isLight
        ? 'text-indigo-700 bg-indigo-50 border-indigo-200'
        : 'text-amber-300 bg-amber-400/10 border-amber-400/30',
    };
  }, [clockColorSetting, timerColorSetting, customClockHex, customTimerHex, activeThemeStyle.isLight]);

  // 🌓 송출 창 테마 밝기에 따라 html 및 body 루트 클래스 동기화
  //    ⚠️ 별도 보조창(standalone)일 때만! 메인 창 안의 미리보기에서 바꾸면 메인 위젯까지 전부 어둡게 바뀌어요.
  //       (미리보기는 아래 dm-root 에 dark 클래스를 붙여 그 안에서만 어둡게 보여요)
  useEffect(() => {
    if (!standalone) return;
    if (activeThemeStyle.isLight) {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      if (document.body) {
        document.body.classList.remove('dark');
        document.body.classList.add('light');
      }
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      if (document.body) {
        document.body.classList.remove('light');
        document.body.classList.add('dark');
      }
    }
  }, [activeThemeStyle.isLight, standalone]);

  // 🕒 실시간 현재 시각 상태 (초단위 포함, 타이머 및 쉬는시간 모드 상단 표시)
  const [currentTime, setCurrentTime] = useState<{
    fullDate: string;
    timeWithSeconds: string;
    hours: string;
    minutes: string;
    seconds: string;
  }>({
    fullDate: '',
    timeWithSeconds: '',
    hours: '00',
    minutes: '00',
    seconds: '00',
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const date = now.getDate();
      const day = days[now.getDay()];
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');

      setCurrentTime({
        fullDate: `${year}년 ${month}월 ${date}일 (${day})`,
        timeWithSeconds: `${h}:${m}:${s}`,
        hours: h,
        minutes: m,
        seconds: s,
      });
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // 🔔 1교시 수업 시작 정보 및 실시간 카운트다운 ('수업 시작 전' 표시용)
  const period1Info = useMemo(() => {
    const now = new Date();
    const todayDayType = getDayTypeInfo(now);

    // 🏖️ 주말, 공휴일, 재량휴업일인 경우 시정표 카운트다운을 프로그램 화면에서 비활성화(대기 상태 유지)
    if (todayDayType.isNoClass) {
      return {
        startTime: '--:--',
        endTime: '--:--',
        subject: todayDayType.label,
        diffSec: 0,
        isStarted: false,
        isEnded: true,
        remainingText: '시정표 대기 중 (수업 없음)',
        statusBadge: todayDayType.label,
        isNoClass: true,
      };
    }

    let bellStart = '09:00';
    let bellEnd = '09:40';
    let period1Subject = '수업';

    // 1. 메인 설정 시정표(bellSchedule)에서 1교시 시작 시각 가져오기
    try {
      const rawConfig = localStorage.getItem('class_dashboard_config') || localStorage.getItem('class_config');
      if (rawConfig) {
        const parsed = JSON.parse(rawConfig);
        if (parsed.bellSchedule && Array.isArray(parsed.bellSchedule)) {
          const p1 = parsed.bellSchedule.find((item: any) => item && (item.period === 1 || item.period === '1'));
          if (p1 && p1.start) {
            bellStart = p1.start;
            if (p1.end) bellEnd = p1.end;
          }
        }
      }
    } catch {}

    // 2. 오늘 요일의 1교시 과목명 조회
    try {
      const rawSchedule = localStorage.getItem('class_dashboard_schedule');
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      const nowDay = days[new Date().getDay()];
      const targetDay = nowDay === '일' || nowDay === '토' ? '월' : nowDay;

      if (rawSchedule) {
        const parsed = JSON.parse(rawSchedule);
        if (parsed[targetDay] && Array.isArray(parsed[targetDay])) {
          const p1 = parsed[targetDay].find((p: any) => p && (p.period === 1 || p.period === '1'));
          if (p1 && p1.subject) {
            period1Subject = p1.subject;
          }
        }
      }
    } catch {}

    // 3. 현재 시각과 1교시 시작 시각 비교
    const [startH, startM] = bellStart.split(':').map((v) => parseInt(v, 10) || 0);
    const [endH, endM] = bellEnd.split(':').map((v) => parseInt(v, 10) || 0);

    const p1StartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startH, startM, 0);
    const p1EndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM, 0);

    const diffSec = Math.floor((p1StartDate.getTime() - now.getTime()) / 1000);
    const isStarted = diffSec <= 0;
    const isEnded = now.getTime() >= p1EndDate.getTime();

    let remainingText = '';
    let statusBadge = '';

    if (diffSec > 0) {
      const hours = Math.floor(diffSec / 3600);
      const mins = Math.floor((diffSec % 3600) / 60);
      const secs = diffSec % 60;
      if (hours > 0) {
        remainingText = `${hours}시간 ${mins}분 ${secs}초 남음`;
      } else if (mins > 0) {
        remainingText = `${mins}분 ${secs}초 남음`;
      } else {
        remainingText = `${secs}초 남음`;
      }
      statusBadge = '등교 및 자율활동 중';
    } else if (!isEnded) {
      remainingText = '1교시 수업 진행 중';
      statusBadge = '수업 중';
    } else {
      remainingText = '1교시 수업 완료';
      statusBadge = '수업 완료';
    }

    return {
      startTime: bellStart,
      endTime: bellEnd,
      subject: period1Subject,
      diffSec,
      isStarted,
      isEnded,
      remainingText,
      statusBadge,
    };
  }, [currentTime]);

  // ☕ 쉬는 시간 주의사항 안내 목록 (선생님이 직접 수정 가능)
  const [breakRules, setBreakRules] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('class_break_rules');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      '복도에서는 뛰지 않고 천천히 우측통행하기 🚶',
      '화장실은 쉬는 시간에 미리 다녀오기 🚻',
      '친구와 배려하는 고운 말 사용하기 💬',
      '다음 시간 교과서와 필기도구 책상 위에 준비하기 📖',
    ];
  });
  const [isEditingRules, setIsEditingRules] = useState(false);
  const [editingRuleText, setEditingRuleText] = useState('');

  const [syncState, setSyncState] = useState<DisplaySyncState>(() => {
    const s = getInitialSyncState(quizzes, teams, decibel);
    if (initialTab) s.activeTab = initialTab;
    return s;
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  // 🖥️ 보조 모니터 상단 메뉴바 접기/펼치기 상태 (전체 모드 화면 영역 극대화)
  const [isHeaderHidden, setIsHeaderHidden] = useState<boolean>(false);

  // Display size scaling for TV/Smart Board visibility (요구사항 2)
  const [displayScale, setDisplayScale] = useState<'sm' | 'md' | 'lg' | 'xl'>(() => {
    return (localStorage.getItem('dual_display_timer_scale') as any) || 'lg';
  });
  const [textScale, setTextScale] = useState<'sm' | 'md' | 'lg'>(() => {
    return (localStorage.getItem('dual_display_text_scale') as any) || 'md';
  });

  // ☕ 쉬는 시간 모드 하단 2열(주의사항 & 다음시간) 글자 크기 조절 상태
  const [breakTextScale, setBreakTextScale] = useState<'sm' | 'md' | 'lg'>(() => {
    return (localStorage.getItem('class_break_text_scale') as any) || 'md';
  });

  // ☕ 쉬는 시간 오른쪽(다음 수업 안내) 글자 크기 — 왼쪽(주의사항)과 따로
  const [breakInfoScale, setBreakInfoScale] = useState<'sm' | 'md' | 'lg'>(() => {
    return (localStorage.getItem('class_break_info_scale') as any) || (localStorage.getItem('class_break_text_scale') as any) || 'md';
  });
  // ☕ '미리 하세요' 캔디바 (물 마시기 · 교과서 펴두기 등)
  const [breakTodos, setBreakTodos] = useState<string[]>(() => {
    try {
      const v = JSON.parse(localStorage.getItem('class_break_todos') || 'null');
      if (Array.isArray(v) && v.length) return v;
    } catch {}
    return ['💧 물 마시고 손 씻기', '📖 교과서 미리 펴두기'];
  });
  const [breakTodoEdit, setBreakTodoEdit] = useState<string | null>(null);

  // 🪑 좌석·모둠 모드 학생 이름 글자 크기 조절 상태
  const [seatingNameScale, setSeatingNameScale] = useState<'sm' | 'md' | 'lg'>(() => {
    return (localStorage.getItem('class_seating_name_scale') as any) || 'md';
  });

  // 🧹 청소·종례 모드 하단 4대 체크리스트 커스텀 상태 및 글자 크기
  const [cleanChecklist, setCleanChecklist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('class_clean_checklist');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      '1. 책상 서랍 정돈',
      '2. 자기 자리 바닥 쓸기',
      '3. 1인 1역 청소 완수',
      '4. 의자 넣고 하교',
    ];
  });
  const [isEditingCleanChecklist, setIsEditingCleanChecklist] = useState<boolean>(false);
  const [editingCleanChecklistText, setEditingCleanChecklistText] = useState<string>('');
  const [cleanChecklistScale, setCleanChecklistScale] = useState<'sm' | 'md' | 'lg'>(() => {
    return (localStorage.getItem('class_clean_checklist_scale') as any) || 'md';
  });

  // 🔔 차임벨 집중 팝업 알림 (사용자 요청: 차임벨 클릭 시 보조 모니터에만 팝업 송출)
  const [chimePopup, setChimePopup] = useState<string | null>(null);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'class_dashboard_chime_trigger' && e.newValue) {
        setChimePopup('🔔 집중할 시간입니다! 앞의 선생님을 주목해 주세요.');
        try {
          playSelectedChime('school_4tone');
        } catch {}
        const timer = setTimeout(() => {
          setChimePopup(null);
        }, 3500);
        return () => clearTimeout(timer);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // 디스플레이 화면 비율 및 윈도우 크기에 따른 자동 폰트 크기 조절 (요구사항 7)
  const [aspectRatioName, setAspectRatioName] = useState<string>('16:9');
  const [autoFontScale, setAutoFontScale] = useState<number>(1);

  // 실시간 마이크 측정 상태 및 Ref
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 학생 출결 실시간 동기화 상태 (standalone 모드 및 메인 대시보드 100% 양방향 동기화)
  const [localStudents, setLocalStudents] = useState<Student[]>(() => {
    if (students && students.length > 0) return students;
    try {
      const saved = localStorage.getItem('class_dashboard_students');
      if (saved) return JSON.parse(saved);
    } catch {}
    return initialStudents;
  });

  useEffect(() => {
    if (students && students.length > 0) {
      setLocalStudents(students);
    }
  }, [students]);

  // 모둠 정보 실시간 동기화 상태 (보조 모니터에서 모둠 이름 직접 변경 지원)
  const [localTeams, setLocalTeams] = useState<Team[]>(() => {
    if (teams && teams.length > 0) return teams;
    try {
      const saved = localStorage.getItem('class_dashboard_teams');
      if (saved) return JSON.parse(saved);
    } catch {}
    return initialTeams;
  });

  useEffect(() => {
    if (teams && teams.length > 0) {
      setLocalTeams(teams);
    }
  }, [teams]);

  // storage 및 BroadcastChannel 이벤트 리스너를 통한 다른 탭/창과의 출결·좌석·모둠 실시간 동기화
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'class_dashboard_students' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setLocalStudents(parsed);
          }
        } catch {}
      }
      if (e.key === 'class_dashboard_teams' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setLocalTeams(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);

    let ch: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        ch = new BroadcastChannel('class_display_sync_channel');
        ch.onmessage = (event) => {
          if (event.data && event.data.type === 'UPDATE_STUDENT_ATTENDANCE' && Array.isArray(event.data.students)) {
            setLocalStudents(event.data.students);
          }
          if (event.data && event.data.type === 'UPDATE_STUDENTS' && Array.isArray(event.data.students)) {
            setLocalStudents(event.data.students);
          }
          if (event.data && event.data.type === 'UPDATE_TEAMS' && Array.isArray(event.data.teams)) {
            setLocalTeams(event.data.teams);
          }
          // 🎰 위젯(교사 화면)에서 [보조창에서 뽑기 시작] → 이 보조화면 쪽에서 전체 화면 뽑기 창 열기
          if (event.data && event.data.type === 'OPEN_SEATDRAW') {
            try {
              ch?.postMessage({ type: 'SEATDRAW_OPENED' });
              const url = `${window.location.origin}${window.location.pathname}?mode=seatdraw`;
              window.open(url, 'classin_seatdraw', `width=${window.screen?.availWidth || 1600},height=${window.screen?.availHeight || 900},left=0,top=0`);
            } catch {}
          }
        };
      }
    } catch {}

    const handleWindowMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'UPDATE_STUDENTS' && Array.isArray(event.data.students)) {
        setLocalStudents(event.data.students);
      }
      if (event.data && event.data.type === 'UPDATE_TEAMS' && Array.isArray(event.data.teams)) {
        setLocalTeams(event.data.teams);
      }
      if (event.data && event.data.type === 'UPDATE_ROLES_DATA') {
        if (Array.isArray(event.data.roles)) setLocalRoles(event.data.roles);
        if (event.data.dailyChecks) setLocalDailyChecks(event.data.dailyChecks);
      }
    };
    window.addEventListener('message', handleWindowMessage);

    const handleCustomRolesUpdated = (e: any) => {
      if (e.detail?.dailyChecks) setLocalDailyChecks(e.detail.dailyChecks);
      if (Array.isArray(e.detail?.roles)) setLocalRoles(e.detail.roles);
    };
    window.addEventListener('class_roles_updated', handleCustomRolesUpdated as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('message', handleWindowMessage);
      window.removeEventListener('class_roles_updated', handleCustomRolesUpdated as EventListener);
      if (ch) {
        try { ch.close(); } catch {}
      }
    };
  }, []);

  const effectiveStudents = localStudents;

  // 🎒 등교 터치 환영 토스트 메시지 상태
  const [attendanceToastMessage, setAttendanceToastMessage] = useState<string | null>(null);
  const attendanceToastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ✋ 등교 터치 출결 핸들러 (학생이 자신의 이름을 터치할 때 작동)
  const handleStudentAttendanceTouch = (student: Student) => {
    const isCurrentlyPresent = student.attendance === 'present';
    const nextStatus: AttendanceStatus = isCurrentlyPresent ? 'absent' : 'present';

    const updated = localStudents.map((s) =>
      s.id === student.id
        ? {
            ...s,
            attendance: nextStatus,
            status: nextStatus,
          }
        : s
    );
    setLocalStudents(updated);

    // 1) localStorage 저장
    try {
      localStorage.setItem('class_dashboard_students', JSON.stringify(updated));
    } catch {}

    // 2) 효과음 및 환영 토스트
    if (nextStatus === 'present') {
      playTouchSound(getTimerAlert().touchSound);
      setAttendanceToastMessage(`🎒 어서 와, ${student.name}아! 오늘도 즐겁고 행복한 하루 보내자! ✨`);
      greet(`${student.name}, 왔구나! 반가워 👋`);
      setJustArrivedId(student.id);
      window.setTimeout(() => setJustArrivedId((v) => (v === student.id ? null : v)), 1100);
    } else {
      setAttendanceToastMessage(`↩️ ${student.name} 학생이 미등교 상태로 변경되었습니다.`);
    }

    if (attendanceToastTimerRef.current) {
      clearTimeout(attendanceToastTimerRef.current);
    }
    attendanceToastTimerRef.current = setTimeout(() => {
      setAttendanceToastMessage(null);
    }, 3500);

    // 3) 상위 콜백 호출
    if (onUpdateStudentAttendance) {
      onUpdateStudentAttendance(student.id, nextStatus);
    }

    // 4) BroadcastChannel로 메인 화면(App.tsx) 및 다른 창에 즉시 브로드캐스트
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('class_display_sync_channel');
        channel.postMessage({
          type: 'UPDATE_STUDENT_ATTENDANCE',
          studentId: student.id,
          status: nextStatus,
          students: updated,
        });
        channel.close();
      }
    } catch {}
  };

  // 🔊 등교 터치 효과음 (타이머 알림음과 같은 소리 목록)
  const playTouchSound = (id: TimerSoundId | 'chime') => {
    if (id === 'chime') playSelectedChime('bell_ding');
    else playTimerSound(id, getTimerAlert().volume);
  };
  const [touchSoundOpen, setTouchSoundOpen] = useState<false | { x: number; y: number }>(false);

  // ✅ 전원 출석 / 모두 되돌리기
  const markAllAttendance = (status: AttendanceStatus) => {
    const changed = localStudents.filter((s) => s.attendance !== status);
    if (!changed.length) return;
    const updated = localStudents.map((s) => ({ ...s, attendance: status, status }));
    setLocalStudents(updated);
    try {
      localStorage.setItem('class_dashboard_students', JSON.stringify(updated));
    } catch {}
    if (status === 'present') {
      playTimerSound('fanfare', getTimerAlert().volume);
      setAttendanceToastMessage(`🎉 오늘은 우리 반 ${updated.length}명 모두 왔어요! 전원 출석!`);
    } else {
      setAttendanceToastMessage('↩️ 모두 미등교 상태로 되돌렸어요.');
    }
    if (attendanceToastTimerRef.current) clearTimeout(attendanceToastTimerRef.current);
    attendanceToastTimerRef.current = setTimeout(() => setAttendanceToastMessage(null), 3500);
    if (onUpdateStudentAttendance) changed.forEach((st) => onUpdateStudentAttendance(st.id, status));
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('class_display_sync_channel');
        channel.postMessage({ type: 'UPDATE_STUDENT_ATTENDANCE', students: updated });
        channel.close();
      }
    } catch {}
  };

  // 📋 아침활동 안내 사항 상태 및 설정 (로컬스토리지 영구 보존)
  const [morningNoticeText, setMorningNoticeText] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('class_morning_activity_notice');
      if (saved !== null && saved.trim() !== '') return saved;
    } catch {}
    return '1. 🎒 가방을 서랍에 넣고 겉옷은 옷걸이에 걸기\n2. 📝 알림장 확인하고 오늘 제출할 과제 바구니에 내기\n3. 📖 아침 독서 15분 동안 자신이 읽을 책 조용히 읽기';
  });

  const [morningFontSize, setMorningFontSize] = useState<'sm' | 'md' | 'lg' | 'xl'>(() => {
    try {
      const saved = localStorage.getItem('class_morning_font_size');
      if (saved && ['sm', 'md', 'lg', 'xl'].includes(saved)) return saved as any;
    } catch {}
    return 'md';
  });

  const [morningTextColor, setMorningTextColor] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('class_morning_text_color');
      if (saved) return saved;
    } catch {}
    return 'amber';
  });

  const [morningCardTheme, setMorningCardTheme] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('class_morning_card_theme');
      if (saved) return saved;
    } catch {}
    return 'board';
  });

  const [isMorningNoticeEditing, setIsMorningNoticeEditing] = useState<boolean>(false);
  const [tempMorningNotice, setTempMorningNotice] = useState<string>(morningNoticeText);
  // 🌅 아침 화면 카드에서 바로 고치기 (등교 터치 '오늘의 아침활동 안내'와 같은 내용)
  const [morningCardEdit, setMorningCardEdit] = useState<string | null>(null);
  // 🔠 아침 화면 전달사항 글자 크기 (배율)
  const [noticeScale, setNoticeScaleState] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem('dm_morning_notice_scale'));
      return v >= 0.7 && v <= 2.2 ? v : 1.2;
    } catch {
      return 1.2;
    }
  });
  const setNoticeScale = (v: number) => {
    const n = Math.round(Math.min(2.2, Math.max(0.7, v)) * 100) / 100;
    setNoticeScaleState(n);
    try {
      localStorage.setItem('dm_morning_notice_scale', String(n));
    } catch {
      /* 무시 */
    }
  };
  const saveMorningNotice = (text: string) => {
    setMorningNoticeText(text);
    setTempMorningNotice(text);
    try {
      localStorage.setItem('class_morning_activity_notice', text);
    } catch {}
  };
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'class_morning_activity_notice' && e.newValue !== null) setMorningNoticeText(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // 📮 아침 화면 '과제물 제출하세요'
  type Homework = { title: string; names: string; done: string[] };
  const [homework, setHomework] = useState<Homework>(() => {
    try {
      const v = JSON.parse(localStorage.getItem('dm_morning_homework') || 'null');
      if (v && typeof v === 'object') return { title: v.title || '', names: v.names || '', done: Array.isArray(v.done) ? v.done : [] };
    } catch {}
    return { title: '', names: '', done: [] };
  });
  const [homeworkEdit, setHomeworkEdit] = useState<Homework | null>(null);
  const saveHomework = (h: Homework) => {
    setHomework(h);
    try {
      localStorage.setItem('dm_morning_homework', JSON.stringify(h));
    } catch {}
  };
  const hwNames = Array.from(new Set(homework.names.split(/[,\n、·]+/).map((x) => x.trim()).filter(Boolean)));
  // 📮 대시보드 '과제 · 알림장 검사' 위젯과 연결 (있으면 이쪽을 먼저 보여 줘요)
  const [hwTasks] = useHomework();

  // 🍚 급식: 대시보드 급식 위젯이 저장한 값을 쓰되, 없거나 오래됐으면 보조창이 직접 불러오기
  const [ownMeal, setOwnMeal] = useState<{ ymd: string; dishes: string[] } | null>(null);
  const ownMealTried = useRef<string>('');
  useEffect(() => {
    if (syncState.activeTab !== 'morning') return;
    const t = toYmd(new Date());
    if (ownMealTried.current === t) return;
    let cached: any = null;
    try {
      cached = JSON.parse(localStorage.getItem('class_school_meal_cache_v2') || 'null');
    } catch {}
    if (cached?.fetchedYmd === t) return;
    const school = getSavedSchool();
    if (!school) return;
    ownMealTried.current = t;
    fetchMeals(school, t, t)
      .then((r) => {
        const d = r.ok ? r.days.find((x) => x.ymd === t) : null;
        setOwnMeal({ ymd: t, dishes: d ? d.dishes.map((x) => x.name) : [] });
      })
      .catch(() => {});
  }, [syncState.activeTab]);

  // 1인 1역할 실시간 동기화 상태
  const [localRoles, setLocalRoles] = useState<ClassRole[]>(() => {
    if (roles && roles.length > 0) return roles;
    try {
      const saved = localStorage.getItem('class_dashboard_roles');
      if (saved) return JSON.parse(saved);
    } catch {}
    return initialRoles;
  });

  useEffect(() => {
    if (roles && roles.length > 0) {
      setLocalRoles(roles);
    }
  }, [roles]);

  const effectiveRoles = localRoles;

  // 📅 요일별 1인 1역 실천 점검 상태 (보조화면 터치/클릭 실시간 동기화)
  const [localDailyChecks, setLocalDailyChecks] = useState<Record<string, Record<string, 'O' | '△' | 'X'>>>(() => {
    try {
      const saved = localStorage.getItem('class_roles_daily_checks');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // 1인 1역 실천 체크 토글 및 실시간 연동 (전자칠판 터치 상호작용 및 위젯/평가표 양방향 동기화)
  const handleToggleRoleCheck = (roleId: string, studentId: number) => {
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'] as const;
    const todayIndex = new Date().getDay();
    const currentDayName = (todayIndex >= 1 && todayIndex <= 5) ? dayNames[todayIndex] : '월';

    const targetRole = localRoles.find((r) => r.id === roleId);
    const currentCheck = localDailyChecks[studentId]?.[currentDayName];
    // 현재 실천 완료 여부 판단 (기본은 미실천 'X')
    const isCurrentlyDone = currentCheck === 'O' || (currentCheck !== 'X' && targetRole?.performanceScores?.[studentId] === 100);
    const nextIsCompleted = !isCurrentlyDone;
    const nextScore = nextIsCompleted ? 100 : 40;
    const nextCheck: 'O' | 'X' = nextIsCompleted ? 'O' : 'X';

    const updated = localRoles.map((r) => {
      if (r.id === roleId) {
        return {
          ...r,
          performanceScores: {
            ...(r.performanceScores || {}),
            [studentId]: nextScore,
          },
        };
      }
      return r;
    });

    setLocalRoles(updated);

    // 🔊 실천 완료 시 경쾌한 축하 사운드 재생
    if (nextIsCompleted) {
      try {
        playCelebrateSound();
      } catch {}
    }

    // 💾 localStorage 즉시 저장
    try {
      localStorage.setItem('class_dashboard_roles', JSON.stringify(updated));
    } catch (err) {
      console.error('🔴 [DualMonitor] roles localStorage 저장 실패:', err);
    }

    // 📅 요일별 일일 실천 평가(class_roles_daily_checks)도 함께 동기화
    const updatedDailyChecks: Record<string, Record<string, 'O' | '△' | 'X'>> = {
      ...localDailyChecks,
      [studentId]: {
        ...(localDailyChecks[studentId] || {}),
        [currentDayName]: nextCheck,
      },
    };
    setLocalDailyChecks(updatedDailyChecks);

    try {
      localStorage.setItem('class_roles_daily_checks', JSON.stringify(updatedDailyChecks));
    } catch {}

    // 🎒 화면 상단 터치 피드백 토스트 안내
    const targetStudent = effectiveStudents.find((s) => s.id === studentId);
    if (nextIsCompleted) {
      setAttendanceToastMessage(`👏 [${targetStudent?.name || '학생'}] 1인 1역 실천 완료! (위젯 및 평가표 동기화됨)`);
    } else {
      setAttendanceToastMessage(`↩️ [${targetStudent?.name || '학생'}] 1인 1역 실천이 미실천(X)으로 변경되었습니다.`);
    }
    if (attendanceToastTimerRef.current) clearTimeout(attendanceToastTimerRef.current);
    attendanceToastTimerRef.current = setTimeout(() => setAttendanceToastMessage(null), 3000);

    // 📡 메인 컴포넌트로 전파 (동일 탭/부모 모달)
    if (onUpdateRoles) {
      onUpdateRoles(updated);
    }

    // 📡 BroadcastChannel 전송 (roles 및 dailyChecks 함께 전송하여 위젯/모달 실시간 동기화)
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('class_display_sync_channel');
        channel.postMessage({
          type: 'UPDATE_ROLES_DATA',
          roles: updated,
          dailyChecks: updatedDailyChecks,
          studentId,
          day: currentDayName,
          isCompleted: nextIsCompleted,
        });
        setTimeout(() => {
          try { channel.close(); } catch {}
        }, 1200);
      }
    } catch (err) {
      console.error('🔴 [DualMonitor] BroadcastChannel 전송 실패:', err);
    }

    // 📡 window.opener / parent 통신 및 커스텀 이벤트 전파
    try {
      if (typeof window !== 'undefined') {
        const syncPayload = {
          type: 'UPDATE_ROLES_DATA',
          roles: updated,
          dailyChecks: updatedDailyChecks,
          studentId,
          day: currentDayName,
          isCompleted: nextIsCompleted,
        };
        window.opener?.postMessage(syncPayload, '*');
        window.parent?.postMessage(syncPayload, '*');
        window.dispatchEvent(new CustomEvent('class_roles_updated', { detail: syncPayload }));
        window.dispatchEvent(new Event('storage'));
      }
    } catch {}
  };

  const effectiveTeams = localTeams;

  // 🏷️ 보조 모니터 화면 모둠 이름 직접 수정 상태
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
  const [editingTeamName, setEditingTeamName] = useState<string>('');

  const handleSaveTeamName = (teamId: number, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setEditingTeamId(null);
      return;
    }
    const updated = localTeams.map((t) =>
      t.id === teamId ? { ...t, name: trimmed } : t
    );
    setLocalTeams(updated);
    setEditingTeamId(null);

    // 1) localStorage 저장
    try {
      localStorage.setItem('class_dashboard_teams', JSON.stringify(updated));
    } catch {}

    // 2) 부모 컴포넌트(App / SeatingWidget) 콜백 호출
    if (onUpdateTeams) {
      onUpdateTeams(updated);
    }

    // 3) BroadcastChannel 및 window.opener/parent 전파
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel('class_display_sync_channel');
        ch.postMessage({ type: 'UPDATE_TEAMS', teams: updated });
        ch.close();
      }
      const syncPayload = { type: 'UPDATE_TEAMS', teams: updated };
      window.opener?.postMessage(syncPayload, '*');
      window.parent?.postMessage(syncPayload, '*');
      window.dispatchEvent(new Event('storage'));
    } catch {}

    playSelectedChime('bell_ding');
    setAttendanceToastMessage(`🏷️ 모둠 이름이 [${trimmed}]으로 변경되었습니다.`);
    if (attendanceToastTimerRef.current) clearTimeout(attendanceToastTimerRef.current);
    attendanceToastTimerRef.current = setTimeout(() => setAttendanceToastMessage(null), 3000);
  };

  // 🖐️ 학급 좌석 배치도 학생 캔디바 드래그 앤 드롭 상태
  const [draggedStudentId, setDraggedStudentId] = useState<number | null>(null);
  const [dragOverStudentId, setDragOverStudentId] = useState<number | null>(null);
  const [dragOverTeamId, setDragOverTeamId] = useState<number | null>(null);

  // 🪑 책상 배치 편집(모둠 책상 자유 이동 → 정렬) & 분단 드롭 상태
  const [deskEditing, setDeskEditing] = useState(false);
  const [dragOverColNumber, setDragOverColNumber] = useState<number | null>(null);
  useSeatingLayoutVersion();

  // 학생 명단 변경을 저장하고 대시보드(본 창)에도 즉시 전달
  const commitSeatingStudents = (updated: Student[], message: string) => {
    setLocalStudents(updated);
    try {
      localStorage.setItem('class_dashboard_students', JSON.stringify(updated));
    } catch {}
    if (onUpdateStudents) onUpdateStudents(updated);
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel('class_display_sync_channel');
        ch.postMessage({ type: 'UPDATE_STUDENTS', students: updated });
        ch.close();
      }
      const syncPayload = { type: 'UPDATE_STUDENTS', students: updated };
      window.opener?.postMessage(syncPayload, '*');
      window.parent?.postMessage(syncPayload, '*');
      window.dispatchEvent(new Event('storage'));
    } catch {}
    playSelectedChime('bell_ding');
    setAttendanceToastMessage(message);
    if (attendanceToastTimerRef.current) clearTimeout(attendanceToastTimerRef.current);
    attendanceToastTimerRef.current = setTimeout(() => setAttendanceToastMessage(null), 3000);
  };

  // 학생을 분단 빈 곳에 놓으면 그 분단(맨 뒤 자리)으로 이동
  const handleDropStudentOnColumn = (baseColIdx: number) => {
    const id = draggedStudentId;
    setDraggedStudentId(null);
    setDragOverStudentId(null);
    setDragOverColNumber(null);
    if (!id) return;
    const next = moveStudentToColumn(localStudents, id, baseColIdx, individualColumns);
    if (!next) return;
    const st = localStudents.find((s) => s.id === id);
    commitSeatingStudents(next, `🪑 [${st?.name || ''}] 학생이 ${getColName(baseColIdx + 1)}으로 이동했습니다.`);
  };

  const handleAlignDesks = () => {
    alignAllTeams(
      effectiveTeamsForDesks().map((t) => ({
        teamId: t.id,
        studentIds: localStudents.filter((s) => s.teamId === t.id).map((s) => s.id),
      }))
    );
    setAttendanceToastMessage('📐 책상을 일정한 간격으로 정렬했습니다.');
    if (attendanceToastTimerRef.current) clearTimeout(attendanceToastTimerRef.current);
    attendanceToastTimerRef.current = setTimeout(() => setAttendanceToastMessage(null), 2500);
  };
  const effectiveTeamsForDesks = () => {
    const ids = [...new Set(localStudents.map((s) => s.teamId))];
    return ids.map((id) => ({ id }));
  };

  // 학생 캔디바를 다른 학생 위에 드롭하여 자리 맞바꾸기 (스왑)
  const handleDropStudentOnStudent = (targetStudentId: number) => {
    if (!draggedStudentId || draggedStudentId === targetStudentId) {
      setDraggedStudentId(null);
      setDragOverStudentId(null);
      setDragOverTeamId(null);
      return;
    }

    const sourceIdx = localStudents.findIndex((s) => s.id === draggedStudentId);
    const targetIdx = localStudents.findIndex((s) => s.id === targetStudentId);
    if (sourceIdx === -1 || targetIdx === -1) {
      setDraggedStudentId(null);
      setDragOverStudentId(null);
      setDragOverTeamId(null);
      return;
    }

    const updated = [...localStudents];
    const sourceStudent = updated[sourceIdx];
    const targetStudent = updated[targetIdx];

    const sourceTeamId = sourceStudent.teamId;
    const targetTeamId = targetStudent.teamId;
    // 책상을 자유 배치한 모둠이면 위치도 맞바꿈
    swapDeskPositions(sourceStudent.id, sourceTeamId, targetStudent.id, targetTeamId);

    // 두 학생의 모둠(teamId) 및 순서 위치 교체
    updated[sourceIdx] = { ...targetStudent, teamId: sourceTeamId };
    updated[targetIdx] = { ...sourceStudent, teamId: targetTeamId };

    setLocalStudents(updated);
    setDraggedStudentId(null);
    setDragOverStudentId(null);
    setDragOverTeamId(null);

    // 1) localStorage 저장
    try {
      localStorage.setItem('class_dashboard_students', JSON.stringify(updated));
    } catch {}

    // 2) 부모 컴포넌트(App / SeatingWidget) 콜백 호출
    if (onUpdateStudents) {
      onUpdateStudents(updated);
    }

    // 3) BroadcastChannel 및 window.opener/parent 전파
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel('class_display_sync_channel');
        ch.postMessage({ type: 'UPDATE_STUDENTS', students: updated });
        ch.close();
      }
      const syncPayload = { type: 'UPDATE_STUDENTS', students: updated };
      window.opener?.postMessage(syncPayload, '*');
      window.parent?.postMessage(syncPayload, '*');
      window.dispatchEvent(new Event('storage'));
    } catch {}

    playSelectedChime('bell_ding');
    setAttendanceToastMessage(`✨ [${sourceStudent.name}] ↔ [${targetStudent.name}] 좌석이 변경되었습니다.`);
    if (attendanceToastTimerRef.current) clearTimeout(attendanceToastTimerRef.current);
    attendanceToastTimerRef.current = setTimeout(() => setAttendanceToastMessage(null), 3000);
  };

  // 학생 캔디바를 특정 모둠 컨테이너에 드롭하여 해당 모둠으로 이동
  const handleDropStudentOnTeam = (targetTeamId: number) => {
    if (!draggedStudentId) return;
    const sourceIdx = localStudents.findIndex((s) => s.id === draggedStudentId);
    if (sourceIdx === -1) {
      setDraggedStudentId(null);
      setDragOverStudentId(null);
      setDragOverTeamId(null);
      return;
    }

    const sourceStudent = localStudents[sourceIdx];
    if (sourceStudent.teamId === targetTeamId) {
      setDraggedStudentId(null);
      setDragOverStudentId(null);
      setDragOverTeamId(null);
      return;
    }

    forgetDeskPosition(sourceStudent.id, sourceStudent.teamId);
    const updated = localStudents.map((s) =>
      s.id === draggedStudentId ? { ...s, teamId: targetTeamId } : s
    );

    setLocalStudents(updated);
    setDraggedStudentId(null);
    setDragOverStudentId(null);
    setDragOverTeamId(null);

    try {
      localStorage.setItem('class_dashboard_students', JSON.stringify(updated));
    } catch {}

    if (onUpdateStudents) {
      onUpdateStudents(updated);
    }

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel('class_display_sync_channel');
        ch.postMessage({ type: 'UPDATE_STUDENTS', students: updated });
        ch.close();
      }
      const syncPayload = { type: 'UPDATE_STUDENTS', students: updated };
      window.opener?.postMessage(syncPayload, '*');
      window.parent?.postMessage(syncPayload, '*');
      window.dispatchEvent(new Event('storage'));
    } catch {}

    playSelectedChime('bell_ding');
    const targetTeam = effectiveTeams.find((t) => t.id === targetTeamId);
    setAttendanceToastMessage(`✨ [${sourceStudent.name}] 학생이 [${targetTeam?.name || `${targetTeamId}모둠`}]으로 이동되었습니다.`);
    if (attendanceToastTimerRef.current) clearTimeout(attendanceToastTimerRef.current);
    attendanceToastTimerRef.current = setTimeout(() => setAttendanceToastMessage(null), 3000);
  };

  // 🎲 [발표자 뽑기 룰렛 전용 상태]
  const [isPickerSpinning, setIsPickerSpinning] = useState(false);
  const [pickedStudent, setPickedStudent] = useState<Student | null>(null);
  const [currentCandidate, setCurrentCandidate] = useState<Student | null>(null);
  const [pickerHistory, setPickerHistory] = useState<Student[]>([]);
  const [excludePickerHistory, setExcludePickerHistory] = useState(true);
  const [wheelRotationAngle, setWheelRotationAngle] = useState(0);
  // 뽑기 방식: 전체 · 남학생만 · 여학생만 · 모둠
  const [pickerMode, setPickerMode] = useState<'all' | 'boys' | 'girls' | 'team'>(() => {
    try {
      return (localStorage.getItem('class_picker_mode') as any) || 'all';
    } catch {
      return 'all';
    }
  });
  const [mochiTint] = useMochiTint();
  const [lumiGreet, setLumiGreet] = useState<{ id: number; text: string } | null>(null);
  const [justArrivedId, setJustArrivedId] = useState<number | null>(null);
  const lumiGreetTimer = useRef<number | null>(null);
  const greet = (text: string) => {
    setLumiGreet({ id: Date.now(), text });
    if (lumiGreetTimer.current) window.clearTimeout(lumiGreetTimer.current);
    lumiGreetTimer.current = window.setTimeout(() => setLumiGreet(null), 2600);
  };
  // 🖥️ 보조창 설정 (탭 정리 · 자동 전환 · 터치 모드)
  const prefs = useDisplayPrefs();
  const [tabEditOpen, setTabEditOpen] = useState(false);
  const autoPrevTabRef = useRef<{ key: string; prev: DisplaySyncState['activeTab'] } | null>(null);
  const autoDoneRef = useRef<string>('');

  // 🤝 뽑기 공정 모드: 이번 주 뽑힌 횟수 (주가 바뀌면 새로 시작)
  const [weekPicks, setWeekPicks] = useState<Record<string, number>>(() => {
    try {
      const v = JSON.parse(localStorage.getItem('dm_pick_week') || 'null');
      return v && v.week === weekKey() ? v.counts || {} : {};
    } catch {
      return {};
    }
  });
  const saveWeekPicks = (c: Record<string, number>) => {
    setWeekPicks(c);
    try {
      localStorage.setItem('dm_pick_week', JSON.stringify({ week: weekKey(), counts: c }));
    } catch {}
  };
  // 🎛 뽑기 방법 (기본 · 룰렛 · 알 · 카드 · 사다리 · 짝 · 조건 · 연속 · 주사위)
  const [pickMethod, setPickMethodState] = useState<PickMethod>(() => {
    try {
      const v = localStorage.getItem('dm_pick_method') as PickMethod | null;
      return v && PICK_METHODS.some((m) => m.id === v) ? v : 'basic';
    } catch {
      return 'basic';
    }
  });
  const setPickMethod = (m: PickMethod) => {
    setPickMethodState(m);
    setPickedStudent(null);
    setPickedTeam(null);
    try {
      localStorage.setItem('dm_pick_method', m);
    } catch {}
  };
  const pickStartRef = useRef<(() => void) | null>(null);
  // ☀️ 오늘 뽑힌 친구 (조건 뽑기 '오늘 발표 안 한 친구')
  const todayKey = () => toYmd(new Date());
  const [todayPick, setTodayPick] = useState<{ day: string; ids: number[]; teams: number[] }>(() => {
    try {
      const v = JSON.parse(localStorage.getItem('dm_pick_today') || 'null');
      if (v && v.day === todayKey()) return { day: v.day, ids: v.ids || [], teams: v.teams || [] };
    } catch {}
    return { day: todayKey(), ids: [], teams: [] };
  });
  const addTodayPick = (ids: number[], team: boolean) => {
    setTodayPick((prev) => {
      const base = prev.day === todayKey() ? prev : { day: todayKey(), ids: [], teams: [] };
      const next = team ? { ...base, teams: [...new Set([...base.teams, ...ids])] } : { ...base, ids: [...new Set([...base.ids, ...ids])] };
      try {
        localStorage.setItem('dm_pick_today', JSON.stringify(next));
      } catch {}
      return next;
    });
  };
  const [pickedTeam, setPickedTeam] = useState<Team | null>(null);
  const [candidateTeam, setCandidateTeam] = useState<Team | null>(null);
  const [teamPickHistory, setTeamPickHistory] = useState<number[]>([]);
  const changePickerMode = (m: 'all' | 'boys' | 'girls' | 'team') => {
    setPickerMode(m);
    setPickedStudent(null);
    setPickedTeam(null);
    try {
      localStorage.setItem('class_picker_mode', m);
    } catch {}
  };
  const pickerPoolBase = (): Student[] =>
    pickerMode === 'boys'
      ? effectiveStudents.filter((s: Student) => s.gender === 'M')
      : pickerMode === 'girls'
      ? effectiveStudents.filter((s: Student) => s.gender === 'F')
      : effectiveStudents;

  // 👥 모둠 뽑기
  // 🏆 칭찬 점수 알림 팝업
  const [praisePop, setPraisePop] = useState<{ id: number; kind: 'team' | 'student'; name: string; delta: number; total: number; reason?: string; icon?: string } | null>(null);

  // ─────────────────────────────────────────────────────────
  // 🎨 좌석·모둠: 모둠 색 (메인 화면 테마를 따라가요) · 포인트 효과 · 포인트 주기
  // ─────────────────────────────────────────────────────────
  const GROUP_PALETTES: Record<string, string[]> = {
    'clean-white': ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444', '#84cc16'],
    'lavender-fog': ['#a78bfa', '#f472b6', '#818cf8', '#60a5fa', '#c084fc', '#34d399', '#fb7185', '#38bdf8'],
    'ember-sunset': ['#f97316', '#ef4444', '#f59e0b', '#ec4899', '#d946ef', '#14b8a6', '#eab308', '#fb7185'],
    'cyber-glossy': ['#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#facc15', '#60a5fa', '#fb923c', '#c084fc'],
    'botanical-sage': ['#3f8f5f', '#d97706', '#0ea5e9', '#e11d48', '#7c3aed', '#14b8a6', '#ca8a04', '#65a30d'],
  };
  const readUiThemeKey = () => {
    try {
      return localStorage.getItem('ttime_ui_theme') || 'clean-white';
    } catch {
      return 'clean-white';
    }
  };
  const [uiThemeKey, setUiThemeKey] = useState<string>(readUiThemeKey);
  useEffect(() => {
    const on = (e: StorageEvent) => {
      if (e.key === 'ttime_ui_theme') setUiThemeKey(readUiThemeKey());
    };
    window.addEventListener('storage', on);
    return () => window.removeEventListener('storage', on);
  }, []);
  const isLightHex = (hex: string) => {
    const n = parseInt(hex.replace('#', ''), 16);
    return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 170;
  };
  const neonShadow = (c: string, base: string) => `0 0 0 3px ${base}, 0 0 0 6px ${c}, 0 0 22px 6px ${c}99, 0 0 48px 14px ${c}4d`;
  type SeatFxType = 'fire' | 'petal' | 'stamp';
  const [seatFx, setSeatFx] = useState<{ kind: 'team' | 'student'; id?: number; name: string; delta: number; label: string; type: SeatFxType; key: number } | null>(null);
  useEffect(() => {
    if (!seatFx) return;
    const t = window.setTimeout(() => setSeatFx(null), 3600);
    return () => clearTimeout(t);
  }, [seatFx]);
  const [pointFxPref, setPointFxPrefState] = useState<'random' | SeatFxType>(() => {
    try {
      const v = localStorage.getItem('dm_point_fx');
      return v === 'fire' || v === 'petal' || v === 'stamp' ? v : 'random';
    } catch {
      return 'random';
    }
  });
  const pointFxPrefRef = useRef(pointFxPref);
  pointFxPrefRef.current = pointFxPref;
  const setPointFxPref = (v: 'random' | SeatFxType) => {
    setPointFxPrefState(v);
    try {
      localStorage.setItem('dm_point_fx', v);
    } catch {
      /* 무시 */
    }
  };
  const pickSeatFxType = (): SeatFxType => {
    const p = pointFxPrefRef.current;
    if (p !== 'random') return p;
    return (['fire', 'petal', 'stamp'] as const)[Math.floor(Math.random() * 3)];
  };
  const [pointTarget, setPointTarget] = useState<{ kind: 'team' | 'student'; id: number } | null>(null);
  const sendPointCommand = (d: { kind: 'team' | 'student'; studentId?: number; teamId?: number; itemId?: string; delta: number; reason?: string; icon?: string }) => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel('class_display_sync_channel');
        ch.postMessage({ type: 'AWARD_POINT', ...d });
        ch.close();
      }
    } catch {
      /* 무시 */
    }
  };
  const readPraiseItems = (): { id: string; label: string; points: number; icon: string }[] => {
    try {
      const v = JSON.parse(localStorage.getItem('class_praise_items_cache') || 'null');
      if (Array.isArray(v) && v.length) return v;
    } catch {
      /* 무시 */
    }
    return [
      { id: '1', label: '발표 참여', points: 1, icon: '🙋' },
      { id: '2', label: '친구 배려', points: 2, icon: '🤝' },
      { id: '3', label: '정리정돈', points: 1, icon: '🧹' },
      { id: '4', label: '급식 모범', points: 1, icon: '🍱' },
      { id: '5', label: '과제 성실', points: 2, icon: '📝' },
      { id: '6', label: '친절 나눔', points: 1, icon: '💖' },
    ];
  };
  const TEAM_REASONS = [
    { id: 't1', label: '모둠 협력', points: 1, icon: '🤝' },
    { id: 't2', label: '정리 우수', points: 1, icon: '🧹' },
    { id: 't3', label: '발표 우수', points: 2, icon: '🎤' },
    { id: 't4', label: '규칙 지키기', points: 1, icon: '✅' },
  ];
  const FX_DOTS = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#a855f7', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#facc15', '#f43f5e', '#60a5fa'];
  useEffect(() => {
    if (!praisePop) return;
    const t = window.setTimeout(() => setPraisePop(null), 3000);
    return () => clearTimeout(t);
  }, [praisePop]);

  // 🎲 뽑기 효과음 (뽑는 동안 · 뽑힌 뒤) — 설정은 타이머 알림과 함께 저장
  const pickTickN = useRef(0);
  const pickTick = (progress: number) => {
    const a = getTimerAlert();
    // 처음엔 띄엄띄엄, 끝으로 갈수록 촘촘하게
    pickTickN.current += 1;
    const every = a.pickSpin === 'drum' ? 1 : progress < 0.5 ? 2 : 1;
    if (pickTickN.current % every === 0) playPickTick(a.pickSpin, progress, a.volume);
  };
  const pickWinSound = () => {
    const a = getTimerAlert();
    playTimerSound(a.pickEnd, a.volume);
  };
  const [pickSoundOpen, setPickSoundOpen] = useState<false | { x: number; y: number }>(false);

  const handleStartTeamPick = () => {
    const teamsWithKids = effectiveTeams.filter((t: Team) => effectiveStudents.some((s: Student) => s.teamId === t.id));
    if (teamsWithKids.length === 0) return;
    let pool = teamsWithKids;
    if (excludePickerHistory) {
      const rest = teamsWithKids.filter((t: Team) => !teamPickHistory.includes(t.id));
      if (rest.length) pool = rest;
      else setTeamPickHistory([]);
    }
    setIsPickerSpinning(true);
    setPickedTeam(null);
    setPickedStudent(null);
    let counter = 0;
    const spin = setInterval(() => {
      setCandidateTeam(pool[Math.floor(Math.random() * pool.length)]);
      counter += 90;
      pickTick(counter / 3000);
      if (counter >= 3000) {
        clearInterval(spin);
        const winner = pool[Math.floor(Math.random() * pool.length)];
        setCandidateTeam(winner);
        setPickedTeam(winner);
        setTeamPickHistory((prev) => [winner.id, ...prev.filter((x) => x !== winner.id)]);
        addTodayPick([winner.id], true);
        setIsPickerSpinning(false);
        try {
          pickWinSound();
          confetti({ particleCount: 110, spread: 80, origin: { y: 0.6 } });
        } catch {}
      }
    }, 90);
  };

  // 외부(메인 위젯)에서 발표자 뽑기 시작 시 애니메이션 동기화
  const handleTriggerPickerAnimation = (candidates?: Student[]) => {
    const pool = candidates && candidates.length > 0 ? candidates : effectiveStudents;
    setIsPickerSpinning(true);
    setPickedStudent(null);

    let counter = 0;
    const intervalMs = 60;
    const totalDuration = 2200;
    const spinInterval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * pool.length);
      setCurrentCandidate(pool[randomIdx]);
      counter += intervalMs;
      if (counter >= totalDuration) {
        clearInterval(spinInterval);
      }
    }, intervalMs);
  };

  // 외부(메인 위젯)에서 최종 당첨 결과 수신 시 동기화
  const handleSetPickerWinner = (winner: Student) => {
    setIsPickerSpinning(false);
    setCurrentCandidate(winner);
    setPickedStudent(winner);
    setPickerHistory((prev) => [winner, ...prev.filter((p) => p.id !== winner.id)].slice(0, 10));
    // 소리는 뽑기를 누른 창(대시보드)에서만 나요 (같은 컴퓨터에서 두 번 겹쳐 울리지 않게)
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {}
  };

  // 보조화면 상에서 발표자 뽑기 시작 실행
  const handleStartRoulette = () => {
    if (isPickerSpinning) return;
    if (pickerMode === 'team') {
      handleStartTeamPick();
      return;
    }

    const base = pickerPoolBase();
    let pool = base;
    let counts = weekPicks;
    if (excludePickerHistory) {
      // 🤝 이번 주에 뽑힌 친구는 빼고 뽑기 (모두 한 번씩 뽑히면 새로 시작)
      const remaining = base.filter((s: Student) => !weekPicks[String(s.id)]);
      if (remaining.length > 0) {
        pool = remaining;
      } else {
        pool = base;
        counts = { ...weekPicks };
        base.forEach((b: Student) => delete counts[String(b.id)]);
        saveWeekPicks(counts);
        greet('모두 한 번씩 뽑혔어요! 처음부터 다시 뽑아요 🎉');
      }
    }
    setPickedTeam(null);

    if (pool.length === 0) return;

    setIsPickerSpinning(true);
    setPickedStudent(null);

    // 회전 각도 크게 누적
    const extraTurns = 5 + Math.floor(Math.random() * 4);
    const targetSliceDegree = Math.floor(Math.random() * 360);
    setWheelRotationAngle((prev) => prev + extraTurns * 360 + targetSliceDegree);

    // 📡 메인 위젯으로 뽑기 시작 브로드캐스트
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('class_display_sync_channel');
        channel.postMessage({
          type: 'TRIGGER_PICKER_START',
          candidates: pool,
        });
        channel.close();
      }
    } catch {}

    let counter = 0;
    const intervalMs = 60;
    const totalDuration = 3200;
    const spinInterval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * pool.length);
      setCurrentCandidate(pool[randomIdx]);
      counter += intervalMs;
      pickTick(counter / totalDuration);
      if (counter >= totalDuration) {
        clearInterval(spinInterval);
        const winner = pool[Math.floor(Math.random() * pool.length)];
        setCurrentCandidate(winner);
        setPickedStudent(winner);
        setPickerHistory((prev) => [winner, ...prev.filter((p) => p.id !== winner.id)].slice(0, 10));
        saveWeekPicks({ ...counts, [String(winner.id)]: (counts[String(winner.id)] || 0) + 1 });
        addTodayPick([winner.id], false);
        setIsPickerSpinning(false);

        // 📡 메인 위젯으로 뽑기 결과 브로드캐스트
        try {
          if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
            const channel = new BroadcastChannel('class_display_sync_channel');
            channel.postMessage({
              type: 'TRIGGER_PICKER_RESULT',
              winner,
            });
            channel.close();
          }
        } catch {}

        try {
          pickWinSound();
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {}
      }
    }, intervalMs);
  };

  // 🎛 여러 뽑기 방법의 결과 기록 (공정 모드 · 오늘 기록 · 효과음 · 꽃가루)
  const commitMethodPick = (winners: PickItem[], kind: PickDoneKind) => {
    if (!winners.length) return;
    const isTeamPick = pickerMode === 'team';
    if (kind !== 'pairs-all') {
      if (isTeamPick) {
        const ids = winners.map((w) => w.id);
        setTeamPickHistory((prev) => [...ids.slice().reverse(), ...prev.filter((x) => !ids.includes(x))]);
        addTodayPick(ids, true);
      } else {
        const studs = winners.map((w) => effectiveStudents.find((s: Student) => s.id === w.id)).filter(Boolean) as Student[];
        setPickerHistory((prev) => [...studs.slice().reverse(), ...prev.filter((p) => !studs.some((q) => q.id === p.id))].slice(0, 10));
        // 이번 주 모두 뽑혔으면 새로 시작
        const base = pickerPoolBase();
        let counts = { ...weekPicks };
        if (excludePickerHistory && base.length && base.every((b: Student) => counts[String(b.id)])) {
          base.forEach((b: Student) => delete counts[String(b.id)]);
          greet('모두 한 번씩 뽑혔어요! 처음부터 다시 뽑아요 🎉');
        }
        studs.forEach((s) => (counts[String(s.id)] = (counts[String(s.id)] || 0) + 1));
        saveWeekPicks(counts);
        addTodayPick(studs.map((s) => s.id), false);
        if (studs.length === 1) {
          try {
            if ('BroadcastChannel' in window) {
              const ch = new BroadcastChannel('class_display_sync_channel');
              ch.postMessage({ type: 'TRIGGER_PICKER_RESULT', winner: studs[0] });
              ch.close();
            }
          } catch {}
        }
      }
    }
    try {
      confetti({ particleCount: kind === 'pairs-all' ? 60 : 90, spread: 75, origin: { y: 0.6 } });
    } catch {}
  };

  // ✏️ 쉬는 시간 안내 내용 수정 모달 상태
  const [isEditingBreakInfo, setIsEditingBreakInfo] = useState(false);
  // 🔁 쉬는 시간 '다음 수업' — 위젯 시간표와 자동 연동 / 직접 입력(수동) 선택
  const [breakNextAuto, setBreakNextAuto] = useState<boolean>(() => {
    try { return localStorage.getItem('class_break_next_auto') !== 'manual'; } catch { return true; }
  });
  const setBreakNextAutoSaved = (on: boolean) => {
    setBreakNextAuto(on);
    try { localStorage.setItem('class_break_next_auto', on ? 'auto' : 'manual'); } catch {}
  };
  const [autoNextLesson, setAutoNextLesson] = useState<{ period: number; subject: string; start: string; info: string } | null>(null);
  // 수업 없는 날(주말 · 공휴일 · 재량휴업일) 이름
  const [autoNoClass, setAutoNoClass] = useState<string | null>(null);
  useEffect(() => {
    if (!breakNextAuto) return;
    const compute = () => {
      try {
        const r = computeNextLesson(new Date());
        if (r.kind === 'lesson') {
          setAutoNoClass(null);
          setAutoNextLesson((prev) =>
            prev && prev.period === r.lesson.period && prev.subject === r.lesson.subject && prev.info === r.lesson.info && prev.start === r.lesson.start
              ? prev
              : { period: r.lesson.period, subject: r.lesson.subject, start: r.lesson.start, info: r.lesson.info },
          );
        } else {
          setAutoNoClass(r.kind === 'noclass' ? r.label : null);
          setAutoNextLesson(null);
        }
      } catch {
        setAutoNextLesson(null);
      }
    };
    compute();
    const t = window.setInterval(compute, 15_000);
    const onStorage = (e: StorageEvent) => {
      if (!e.key || ['class_dashboard_schedule', 'smart_dashboard_timetable', 'class_dashboard_config', 'class_weekly_plan_detail_v1', 'class_dday_items'].includes(e.key)) compute();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('class-schedule-updated', compute);
    return () => {
      window.clearInterval(t);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('class-schedule-updated', compute);
    };
  }, [breakNextAuto]);
  // 자동일 때는 시간표에서 찾은 교시 · 과목 · 학습 내용을 화면 상태에 반영 (📌 안내 칸까지 함께)
  useEffect(() => {
    if (!breakNextAuto || !autoNextLesson) return;
    if (
      syncState.breakNextPeriod !== autoNextLesson.period ||
      syncState.breakNextSubject !== autoNextLesson.subject ||
      syncState.nextPeriodInfo !== autoNextLesson.info
    ) {
      updateState({ breakNextPeriod: autoNextLesson.period, breakNextSubject: autoNextLesson.subject, nextPeriodInfo: autoNextLesson.info });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakNextAuto, autoNextLesson, syncState.breakNextPeriod, syncState.breakNextSubject, syncState.nextPeriodInfo]);

  const [editBreakPeriod, setEditBreakPeriod] = useState(syncState.breakNextPeriod || 2);
  const [editBreakSubject, setEditBreakSubject] = useState(syncState.breakNextSubject || '수학');
  const [editBreakAnnouncement, setEditBreakAnnouncement] = useState(
    syncState.breakAnnouncement || '수학책, 수학익힘책 38~41쪽, 연필, 지우개, 자 준비'
  );

  // ✏️ 청소·종례 안내 문구 수정 모달 상태
  const [isEditingCleanNotices, setIsEditingCleanNotices] = useState(false);
  const [editCleanNoticesText, setEditCleanNoticesText] = useState('');
  const [editCleanNeonColor, setEditCleanNeonColor] = useState<string>(syncState.cleanNeonColor || 'cyan');
  const [editCleanBannerSpeed, setEditCleanBannerSpeed] = useState<number>(syncState.cleanBannerSpeed || 34);
  const [editCleanFontSize, setEditCleanFontSize] = useState<string>(syncState.cleanFontSize || 'md');

  useEffect(() => {
    const updateDisplayMetrics = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const ratio = w / (h || 1);

      let name = '16:9';
      if (ratio >= 2.0) name = '21:9 (울트라와이드)';
      else if (ratio >= 1.7) name = '16:9 (와이드)';
      else if (ratio >= 1.55) name = '16:10 (노트북/맥북)';
      else if (ratio >= 1.3) name = '4:3 (일반/스탠다드)';
      else name = '세로형/태블릿';
      setAspectRatioName(name);

      // 기준 뷰포트 너비 1280px 대비 실시간 스케일 비율 계산 (0.8 ~ 1.6x)
      const scale = Math.max(0.8, Math.min(1.6, w / 1280));
      setAutoFontScale(scale);
    };

    updateDisplayMetrics();
    window.addEventListener('resize', updateDisplayMetrics);
    return () => window.removeEventListener('resize', updateDisplayMetrics);
  }, []);

  // 개별 창(standalone)으로 활성화된 경우 메인 모니터 입력 데이터 기반으로 완전 개별 독자 작동 (사용자 요청 사항)
  const [isIndependentMode, setIsIndependentMode] = useState<boolean>(() => standalone);

  // 📡 [요구사항 3-새창 연동] Sync listener via BroadcastChannel and window storage event (새창 분리 시에도 실시간 즉시 반영)
  useEffect(() => {
    const handleSync = (newState: Partial<DisplaySyncState>) => {
      setSyncState((prev) => ({
        ...prev,
        ...newState,
        cleanTimerSeconds:
          typeof newState.cleanTimerSeconds === 'number' && !isNaN(newState.cleanTimerSeconds)
            ? newState.cleanTimerSeconds
            : prev.cleanTimerSeconds ?? 600,
        breakTimerSeconds:
          typeof newState.breakTimerSeconds === 'number' && !isNaN(newState.breakTimerSeconds)
            ? newState.breakTimerSeconds
            : prev.breakTimerSeconds ?? 600,
      }));
    };

    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel('class_display_sync_channel');
      channel.onmessage = (event) => {
        if (!event.data) return;
        
        // 1) 상태 업데이트
        if (event.data.syncState) {
          handleSync(event.data.syncState);
        } else if (!event.data.type) {
          handleSync(event.data);
        }

        // 🏆 칭찬 점수 알림 (대시보드에서 +/- 했을 때)
        if (event.data.type === 'PRAISE_EVENT') {
          const d = event.data;
          setPraisePop({ id: Date.now(), kind: d.kind, name: String(d.name || ''), delta: Number(d.delta) || 0, total: Number(d.total) || 0, reason: d.reason, icon: d.icon });
          // 🎆 좌석·모둠 화면: 받은 학생 · 모둠 이름 옆에 루미와 효과
          if (Number(d.delta) > 0) {
            setSeatFx({
              kind: d.kind === 'team' ? 'team' : 'student',
              id: typeof d.id === 'number' ? d.id : undefined,
              name: String(d.name || ''),
              delta: Number(d.delta),
              label: `+${Number(d.delta)} ${d.reason || (d.kind === 'team' ? '모둠 칭찬' : '칭찬')}`,
              type: pickSeatFxType(),
              key: Date.now(),
            });
          }
          try {
            playTimerSound(Number(d.delta) >= 0 ? 'magic' : 'boing', getTimerAlert().volume);
          } catch {}
        }

        // 2) 🎲 발표자 뽑기 실시간 연동
        if (event.data.type === 'TRIGGER_PICKER_START') {
          handleTriggerPickerAnimation(event.data.candidates);
        } else if (event.data.type === 'TRIGGER_PICKER_RESULT') {
          handleSetPickerWinner(event.data.winner);
        }

        // 3) 📋 1인 1역 실천 체크 연동
        if (event.data.type === 'UPDATE_ROLES_DATA') {
          if (Array.isArray(event.data.roles)) {
            setLocalRoles(event.data.roles);
            try {
              localStorage.setItem('class_dashboard_roles', JSON.stringify(event.data.roles));
            } catch {}
          }
          if (event.data.dailyChecks) {
            setLocalDailyChecks(event.data.dailyChecks);
            try {
              localStorage.setItem('class_roles_daily_checks', JSON.stringify(event.data.dailyChecks));
            } catch {}
          }
        }

        // 4) 🎨 테마 설정 동기화
        if (event.data.type === 'THEME_SYNC' && event.data.themeSettings) {
          setThemeSettings(event.data.themeSettings);
        }
      };
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          handleSync(JSON.parse(e.newValue));
        } catch {}
      }
      if (e.key === 'class_roles_daily_checks' && e.newValue) {
        try {
          setLocalDailyChecks(JSON.parse(e.newValue));
        } catch {}
      }
      if (e.key === 'class_dashboard_roles' && e.newValue) {
        try {
          setLocalRoles(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      channel?.close();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Countdown timer for telepathy if running in standalone
  useEffect(() => {
    let interval: number;
    if (syncState.isTelepathyTimerRunning && syncState.telepathyTimer > 0) {
      interval = window.setInterval(() => {
        setSyncState((prev) => {
          if (prev.telepathyTimer <= 1) {
            playCelebrateSound();
            const next = {
              ...prev,
              telepathyTimer: 0,
              isTelepathyTimerRunning: false,
              isTelepathyRevealed: true,
            };
            if (!standalone && !isIndependentMode) {
              broadcastDisplaySyncState(next);
            }
            return next;
          }
          return { ...prev, telepathyTimer: prev.telepathyTimer - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [standalone, isIndependentMode, syncState.isTelepathyTimerRunning, syncState.telepathyTimer]);

  // 🧹 청소 타이머: 1분 · 30초 남았을 때 흔들림 + 효과음 + 알림
  const [cleanWarn, setCleanWarn] = useState<{ sec: number; at: number } | null>(null);
  const cleanPrevSec = useRef<number>(syncState.cleanTimerSeconds);
  const cleanWarnTimer = useRef<number | null>(null);
  useEffect(() => {
    const prev = cleanPrevSec.current;
    const cur = syncState.cleanTimerSeconds;
    cleanPrevSec.current = cur;
    if (!syncState.isCleanTimerRunning || syncState.activeTab !== 'clean') return;
    for (const mark of [60, 30]) {
      if (prev > mark && cur <= mark && cur > mark - 3) {
        setCleanWarn({ sec: mark, at: Date.now() });
        playTimeWarning(mark);
        if (cleanWarnTimer.current) window.clearTimeout(cleanWarnTimer.current);
        cleanWarnTimer.current = window.setTimeout(() => setCleanWarn(null), 3200);
        return undefined;
      }
    }
    if (cur > 0 && cur <= 5 && prev !== cur) playTimeTick(cur);
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncState.cleanTimerSeconds, syncState.isCleanTimerRunning]);

  // 💡 개별 보조창이 열려 있음을 본 창에 알리는 신호 (본 창 하단 위젯바가 네온으로 반짝여요)
  useEffect(() => {
    if (!standalone) return;
    const beat = () => {
      try { localStorage.setItem('classin_display_alive', String(Date.now())); } catch { /* 무시 */ }
    };
    beat();
    const id = window.setInterval(beat, 1500);
    const bye = () => {
      try { localStorage.removeItem('classin_display_alive'); } catch { /* 무시 */ }
    };
    window.addEventListener('pagehide', bye);
    window.addEventListener('beforeunload', bye);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('pagehide', bye);
      window.removeEventListener('beforeunload', bye);
      bye();
    };
  }, [standalone]);

  // Main timer countdown if running
  useEffect(() => {
    let interval: number;
    if (syncState.isTimerRunning && syncState.timerSeconds > 0) {
      interval = window.setInterval(() => {
        setSyncState((prev) => {
          if (prev.timerSeconds <= 1) {
            const next = { ...prev, timerSeconds: 0, isTimerRunning: false };
            if (!standalone && !isIndependentMode) {
              broadcastDisplaySyncState(next);
            }
            return next;
          }
          return { ...prev, timerSeconds: prev.timerSeconds - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [standalone, isIndependentMode, syncState.isTimerRunning, syncState.timerSeconds]);

  // ⏰ 타이머 알림 (1분 전 · 30초 전 · 10초 전 · 끝) — 알림음 + 루미 팝업
  const [timerAlert, setTimerAlertPart] = useTimerAlert();
  const [timerAlertOpen, setTimerAlertOpen] = useState(false);

  // ⏱️ 스톱워치 (타이머/시계 탭) — 기록을 누를 때마다 순서대로 저장해요
  type SwLap = { n: number; total: number; split: number; name?: string };
  type SwState = { running: boolean; startAt: number; acc: number; laps: SwLap[] };
  type TimerKind = 'timer' | 'stopwatch' | 'seq';
  const readTimerKind = (): TimerKind => {
    try {
      const v = localStorage.getItem('dm_timer_kind');
      return v === 'stopwatch' || v === 'seq' ? v : 'timer';
    } catch {
      return 'timer';
    }
  };
  const [timerKind, setTimerKindState] = useState<TimerKind>(readTimerKind);
  // 메인 화면 순차 타이머 위젯에서 [🖥️ 크게]를 누르면 이 화면도 순차 타이머로 바뀌어요
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'dm_timer_kind') setTimerKindState(readTimerKind());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const setTimerKind = (k: TimerKind) => {
    setTimerKindState(k);
    try {
      localStorage.setItem('dm_timer_kind', k);
    } catch {
      /* 무시 */
    }
  };
  const [sw, setSwState] = useState<SwState>(() => {
    try {
      const v = JSON.parse(localStorage.getItem('dm_stopwatch_v1') || 'null');
      if (v && typeof v.acc === 'number' && Array.isArray(v.laps)) return v;
    } catch {
      /* 무시 */
    }
    return { running: false, startAt: 0, acc: 0, laps: [] };
  });
  const swRef = useRef(sw);
  swRef.current = sw;
  const setSw = (next: SwState) => {
    swRef.current = next;
    setSwState(next);
    try {
      localStorage.setItem('dm_stopwatch_v1', JSON.stringify(next));
    } catch {
      /* 무시 */
    }
  };
  const [swNow, setSwNow] = useState(() => Date.now());
  const swElapsed = (st: SwState, now = Date.now()) => st.acc + (st.running ? Math.max(0, now - st.startAt) : 0);
  const swToggle = () => {
    const st = swRef.current;
    const now = Date.now();
    if (st.running) setSw({ ...st, running: false, acc: swElapsed(st, now) });
    else setSw({ ...st, running: true, startAt: now });
  };
  const swLap = () => {
    const st = swRef.current;
    const total = swElapsed(st);
    if (total <= 0) return;
    const prev = st.laps.length ? st.laps[st.laps.length - 1].total : 0;
    setSw({ ...st, laps: [...st.laps, { n: st.laps.length + 1, total, split: total - prev }] });
    setSwNow(Date.now());
  };
  const swReset = () => setSw({ running: false, startAt: 0, acc: 0, laps: [] });
  const fmtSw = (ms: number) => {
    const cs = Math.floor(ms / 10) % 100;
    const sec = Math.floor(ms / 1000);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const ss = sec % 60;
    const p2 = (x: number) => String(x).padStart(2, '0');
    return h > 0 ? `${h}:${p2(m)}:${p2(ss)}` : `${p2(m)}:${p2(ss)}.${p2(cs)}`;
  };
  useEffect(() => {
    if (!(sw.running && syncState.activeTab === 'timer' && timerKind === 'stopwatch')) return;
    const t = window.setInterval(() => setSwNow(Date.now()), 41);
    return () => clearInterval(t);
  }, [sw.running, syncState.activeTab, timerKind]);
  // ⌨️ 뽑기: Space = 뽑기 시작
  const pickKeyRef = useRef<{ tab: string; go: () => void }>({ tab: '', go: () => {} });
  pickKeyRef.current = {
    tab: syncState.activeTab,
    go: () => (pickMethod === 'basic' ? handleStartRoulette() : pickStartRef.current?.()),
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (pickKeyRef.current.tab !== 'picker' || e.code !== 'Space' || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault();
      pickKeyRef.current.go();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  // ⌨️ 스톱워치: Space = 시작 / 기록, Esc 없이 R = 리셋
  const swKeyRef = useRef({ tab: syncState.activeTab, kind: timerKind });
  swKeyRef.current = { tab: syncState.activeTab, kind: timerKind };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (swKeyRef.current.tab !== 'timer' || swKeyRef.current.kind !== 'stopwatch') return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        if (swRef.current.running) swLap();
        else swToggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const cuteFontClass = timerAlert.font === 'mono' ? 'font-mono' : `dm-tfont-${timerAlert.font}`;
  const [timerToast, setTimerToast] = useState<{ id: number; sec: number } | null>(null);
  const prevTimerSecRef = useRef<number>(syncState.timerSeconds);
  useEffect(() => {
    const prev = prevTimerSecRef.current;
    const cur = syncState.timerSeconds;
    prevTimerSecRef.current = cur;
    if (prev - cur !== 1) return; // 저절로 1초 줄었을 때만 (버튼으로 바꾼 건 무시)
    const a = timerAlert;
    if (cur === 0) {
      playTimerSound(a.endSound, a.volume, 2);
      if (a.popup) setTimerToast({ id: Date.now(), sec: 0 });
      return;
    }
    if (a.points.includes(cur)) {
      playTimerSound(a.warnSound, a.volume);
      if (a.popup) setTimerToast({ id: Date.now(), sec: cur });
      return;
    }
    if (a.countdown && cur <= 5) playTimerTick(cur, a.volume);
  }, [syncState.timerSeconds]);
  useEffect(() => {
    if (!timerToast) return;
    const t = window.setTimeout(() => setTimerToast(null), timerToast.sec === 0 ? 5200 : 3200);
    return () => clearTimeout(t);
  }, [timerToast]);

  // Clean timer countdown if running
  useEffect(() => {
    let interval: number;
    if (syncState.isCleanTimerRunning && syncState.cleanTimerSeconds > 0) {
      interval = window.setInterval(() => {
        setSyncState((prev) => {
          if (prev.cleanTimerSeconds <= 1) {
            playSelectedChime('school_4tone');
            const next = { ...prev, cleanTimerSeconds: 0, isCleanTimerRunning: false };
            if (!standalone && !isIndependentMode) {
              broadcastDisplaySyncState(next);
            }
            return next;
          }
          return { ...prev, cleanTimerSeconds: prev.cleanTimerSeconds - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [standalone, isIndependentMode, syncState.isCleanTimerRunning, syncState.cleanTimerSeconds]);

  // Break timer countdown if running
  useEffect(() => {
    let interval: number;
    if (syncState.isBreakTimerRunning && syncState.breakTimerSeconds > 0) {
      interval = window.setInterval(() => {
        setSyncState((prev) => {
          if (prev.breakTimerSeconds <= 1) {
            playSelectedChime('school_4tone');
            const next = { ...prev, breakTimerSeconds: 0, isBreakTimerRunning: false };
            if (!standalone && !isIndependentMode) {
              broadcastDisplaySyncState(next);
            }
            return next;
          }
          return { ...prev, breakTimerSeconds: prev.breakTimerSeconds - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [syncState.isBreakTimerRunning, syncState.breakTimerSeconds]);

  // 실시간 마이크 모니터링 엔진 (보조 모니터 직접 측정 및 실시간 동기화)
  const startMicMonitoring = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert('현재 브라우저에서는 마이크 접근이 지원되지 않습니다.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      micStreamRef.current = stream;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      setIsMicActive(true);
      console.log('🟢 [보조모니터] 마이크 측정 시작됨');

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let lastVolumeUpdate = 0;

      const checkVolume = () => {
        if (!analyserRef.current) return;
        const now = Date.now();
        // 80ms 쓰로틀링: 불필요한 과도한 리렌더 방지 및 UI 반응성 확보
        if (now - lastVolumeUpdate >= 80) {
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          // 35 ~ 95dB 범위로 실시간 자연스럽게 환산
          const calculatedDb = Math.min(95, Math.max(35, Math.round(35 + (average / 128) * 55)));

          // 이전 상태(prev)의 activeTab 등을 덮어쓰지 않고 decibel만 안전하게 업데이트
          setSyncState((prev) => {
            if (prev.decibel === calculatedDb) return prev;
            const next = { ...prev, decibel: calculatedDb };
            if (!standalone && !isIndependentMode) {
              broadcastDisplaySyncState(next);
            }
            return next;
          });
          lastVolumeUpdate = now;
        }
        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch (err) {
      console.error('🔴 [마이크 오류]:', err);
      alert('마이크 접근 권한이 필요합니다. 브라우저 주소창 좌측에서 마이크 권한을 허용해 주세요.');
    }
  };

  const stopMicMonitoring = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsMicActive(false);
    console.log('🟡 [보조모니터] 마이크 측정 중지됨');
  };

  // 💡 소음 데시벨 및 쉬는시간 탭이 아닌 다른 탭으로 이동 시 마이크 모니터링을 자동으로 중지하여 리소스 낭비 방지
  useEffect(() => {
    if (syncState.activeTab !== 'noise' && syncState.activeTab !== 'break' && isMicActive) {
      stopMicMonitoring();
    }
  }, [syncState.activeTab, isMicActive]);

  useEffect(() => {
    return () => {
      stopMicMonitoring();
    };
  }, []);

  // 💡 함수형 상태 업데이트(setSyncState(prev => ...))로 클로저 stale 상태 덮어쓰기 문제 완벽 방지
  const updateState = (updates: Partial<DisplaySyncState>) => {
    setSyncState((prev) => {
      const next = { ...prev, ...updates };
      // 💡 사용자의 요청: 학생화면 송출 새창열기(standalone) 또는 독립 모드일 때는 메인창과 연동 없이 독자적으로 작동
      if (!standalone && !isIndependentMode) {
        broadcastDisplaySyncState(next);
      } else {
        // 따로 연 보조 화면: 메인과 연동은 안 하지만, 입력한 내용은 저장해서 다시 열면 그대로 나오게
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* 무시 */
        }
        rememberDisplayTexts(updates);
      }
      return next;
    });
  };

  // ⏱ 시간표에 맞춰 화면 자동 전환 (아침 · 쉬는시간 · 청소·종례), 끝나면 원래 화면으로
  const syncTabRef = useRef(syncState.activeTab);
  syncTabRef.current = syncState.activeTab;
  useEffect(() => {
    if (!prefs.auto) return;
    // 자동 ON: 수업 전 → 아침 화면 · 수업 중 → 판서 모드 · 쉬는 시간 → 쉬는시간 · 마지막 수업 뒤 → 청소·종례
    //   (구간이 바뀔 때 한 번만 옮겨요. 그 구간 안에서 선생님이 다른 화면을 고르면 그대로 둬요)
    const tick = () => {
      const { phase, key } = phaseNow();
      if (!phase || key === autoDoneRef.current) return;
      autoDoneRef.current = key;
      if (syncTabRef.current !== phase) {
        autoPrevTabRef.current = { key, prev: syncTabRef.current };
        updateState({ activeTab: phase });
        greet(
          phase === 'break' ? '쉬는 시간이에요! ☕' : phase === 'clean' ? '청소하고 하교 준비해요 🧹' : phase === 'drawing' ? '수업 시작! 집중해요 ✏️' : '좋은 아침이에요! ☀️'
        );
      }
    };
    tick();
    const t = window.setInterval(tick, 10000);
    return () => clearInterval(t);
  }, [prefs.auto]); // eslint-disable-line react-hooks/exhaustive-deps

  // ⌨️ B 키: 잠깐 가리기 켜고 끄기
  const blankRef = useRef(!!syncState.isBlanked);
  blankRef.current = !!syncState.isBlanked;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.code === 'KeyB' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) updateState({ isBlanked: !blankRef.current });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 상단 글자 크기 변경 시 청소 전광판, 쉬는시간, 좌석 이름, 체크리스트 글씨 크기 일괄 동기화
  const handleTextScaleChange = (scaleKey: 'sm' | 'md' | 'lg') => {
    setTextScale(scaleKey);
    localStorage.setItem('dual_display_text_scale', scaleKey);
    setBreakTextScale(scaleKey);
    localStorage.setItem('class_break_text_scale', scaleKey);
    setBreakInfoScale(scaleKey);
    localStorage.setItem('class_break_info_scale', scaleKey);
    setSeatingNameScale(scaleKey);
    writeSeatingSetting('class_seating_name_scale', scaleKey);
    setCleanChecklistScale(scaleKey);
    localStorage.setItem('class_clean_checklist_scale', scaleKey);
    const mappedCleanFont: 'sm' | 'md' | 'lg' | 'xl' =
      scaleKey === 'lg' ? 'xl' : scaleKey === 'sm' ? 'sm' : 'md';
    updateState({ cleanFontSize: mappedCleanFont });
  };

  // 💡 [퀴즈 전역 상태 및 실시간 동기화]: 현재 퀴즈 서브탭(OX / 객관식)에 맞는 문제 목록 추출 (undefined 방어 코드 적용)
  const currentQuizList = useMemo(() => {
    const rawList =
      syncState?.quizzes && Array.isArray(syncState.quizzes) && syncState.quizzes.length > 0
        ? syncState.quizzes.filter((q) => q && typeof q === 'object' && q.type)
        : initialQuizzes;

    const validList = (rawList && rawList.length > 0 ? rawList : initialQuizzes).filter((q) => q && q.type);
    const listToUse = validList.length > 0 ? validList : initialQuizzes;

    if (syncState?.quizType === 'ox') {
      const oxOnly = listToUse.filter((q) => q?.type === 'ox');
      return oxOnly.length > 0 ? oxOnly : listToUse;
    }
    if (syncState?.quizType === 'choice') {
      const choiceOnly = listToUse.filter((q) => q?.type === 'choice');
      return choiceOnly.length > 0 ? choiceOnly : listToUse;
    }
    return listToUse;
  }, [syncState?.quizzes, syncState?.quizType]);

  const safeQuizIndex = Math.max(0, Math.min(syncState?.quizIndex ?? 0, Math.max(0, currentQuizList.length - 1)));
  const currentQuiz = currentQuizList[safeQuizIndex] || currentQuizList[0] || initialQuizzes[0] || {
    id: 'fallback',
    type: 'ox',
    question: '대한민국의 수도는 서울이다.',
    answer: 'O',
    explanation: '대한민국의 수도는 서울특별시입니다.'
  };
  const rawDualTele =
    syncState?.telepathyList && syncState.telepathyList.length > 0
      ? syncState.telepathyList[syncState.telepathyIndex] || syncState.telepathyList[0]
      : initialTelepathyQuizzes[0];
  
  const dualTeleCorners: [string, string, string, string] =
    Array.isArray(rawDualTele?.corners) && rawDualTele.corners.length >= 4
      ? [rawDualTele.corners[0] || '1번 코너', rawDualTele.corners[1] || '2번 코너', rawDualTele.corners[2] || '3번 코너', rawDualTele.corners[3] || '4번 코너']
      : ['1번 코너 (앞 왼쪽)', '2번 코너 (앞 오른쪽)', '3번 코너 (뒤 왼쪽)', '4번 코너 (뒤 오른쪽)'];

  const currentTelepathy = {
    id: rawDualTele?.id || 'dual-tele-default',
    question: rawDualTele?.question || '선생님의 생각을 맞춰보세요!',
    corners: dualTeleCorners,
    correctCorner: (rawDualTele?.correctCorner || 1) as 1 | 2 | 3 | 4,
    timeLimit: rawDualTele?.timeLimit || 15,
  };

  // 💡 [네온 전광판 단일 항목 순차 롤링]: 번호/기호 없이 순수 텍스트 1:1 순환 디스플레이
  const [cleanNoticeIndex, setCleanNoticeIndex] = useState<number>(0);
  const [cleanMarqueeKey, setCleanMarqueeKey] = useState<number>(0);

  const cleanDisplayNotices = useMemo(() => {
    if (syncState.cleanNotices && Array.isArray(syncState.cleanNotices) && syncState.cleanNotices.length > 0) {
      return syncState.cleanNotices
        .map((n: any) => {
          if (typeof n === 'string') return n.trim();
          if (n && typeof n.text === 'string') return n.text.trim();
          return '';
        })
        .filter(Boolean);
    }
    return [
      '책상 서랍 정돈하기',
      '자기 자리 바닥 쓸기',
      '1인 1역 청소 완수하기',
      '선생님과 친구들에게 반갑게 인사하고 안전하게 하교하기',
    ];
  }, [syncState.cleanNotices]);

  useEffect(() => {
    if (cleanNoticeIndex >= cleanDisplayNotices.length) {
      setCleanNoticeIndex(0);
    }
  }, [cleanDisplayNotices.length, cleanNoticeIndex]);

  const handleCleanAnimationEnd = () => {
    setCleanNoticeIndex((prev) => (prev + 1) % cleanDisplayNotices.length);
    setCleanMarqueeKey((prev) => prev + 1);
  };

  const currentCleanNoticeText = cleanDisplayNotices[cleanNoticeIndex % cleanDisplayNotices.length] || '';

  // 🐇 전광판 속도 (초가 짧을수록 빨라요) — 휠/± 버튼으로 한 단계씩
  const CLEAN_SPEEDS = [60, 45, 34, 26, 20, 16, 12, 9, 7, 5];
  const cleanSpeedSec = syncState.cleanBannerSpeed || 34;
  const cleanSpeedLevel = (() => {
    let best = 0;
    CLEAN_SPEEDS.forEach((v, i) => {
      if (Math.abs(v - cleanSpeedSec) < Math.abs(CLEAN_SPEEDS[best] - cleanSpeedSec)) best = i;
    });
    return best;
  })();
  const stepCleanSpeed = (dir: 1 | -1) => {
    const lv = Math.max(0, Math.min(CLEAN_SPEEDS.length - 1, cleanSpeedLevel + dir));
    if (CLEAN_SPEEDS[lv] !== cleanSpeedSec) {
      updateState({ cleanBannerSpeed: CLEAN_SPEEDS[lv] });
      setEditCleanBannerSpeed(CLEAN_SPEEDS[lv]);
    }
  };
  const stepCleanSpeedRef = useRef(stepCleanSpeed);
  stepCleanSpeedRef.current = stepCleanSpeed;
  const cleanWheelAcc = useRef(0);
  const cleanWheelTargets = useRef<Set<HTMLElement>>(new Set());
  const onCleanWheel = useRef((e: WheelEvent) => {
    e.preventDefault();
    cleanWheelAcc.current += e.deltaY;
    if (Math.abs(cleanWheelAcc.current) >= 60) {
      stepCleanSpeedRef.current(cleanWheelAcc.current < 0 ? 1 : -1); // 위로 굴리면 빠르게
      cleanWheelAcc.current = 0;
    }
  }).current;
  const cleanWheelRef = (el: HTMLElement | null) => {
    if (!el || cleanWheelTargets.current.has(el)) return;
    cleanWheelTargets.current.add(el);
    el.addEventListener('wheel', onCleanWheel, { passive: false });
  };

  const formatTime = (secs: unknown) => {
    const num = typeof secs === 'number' && !isNaN(secs) ? Math.max(0, Math.floor(secs)) : 600;
    const m = Math.floor(num / 60);
    const s = num % 60;
    return `${String(m).padStart(2, '0')} : ${String(s).padStart(2, '0')}`;
  };

  // 🕒 타이머 폰트 크기 (가로 잘림 방지: 7자리 MM : SS 포맷이 화면 가로폭과 높이 내에 100% 안전하게 피트되는 반응형 clamp 배율)
  const getTimerFontSize = (isCompact = false) => {
    if (isCompact) {
      // 청소종례 등 상하에 다른 컴포넌트(배너/플레이어)가 공존하는 컴팩트 웅장 배율
      switch (displayScale) {
        case 'sm': // 작게 (80%)
          return 'clamp(2.8rem, min(8vw, 13vh), 4.8rem)';
        case 'md': // 보통 (100%)
          return 'clamp(3.5rem, min(10.5vw, 17vh), 6.5rem)';
        case 'xl': // 최대 (150%)
          return 'clamp(5rem, min(14.5vw, 24vh), 10.5rem)';
        case 'lg': // 크게 (125%)
        default:
          return 'clamp(4.2rem, min(12.5vw, 20vh), 8.2rem)';
      }
    }

    // 기본 타이머 화면 (가로 잘림 현상 100% 방지: min(vw, vh) 기반으로 어떤 해상도에서도 안전하게 최대 크기로 피트)
    switch (displayScale) {
      case 'sm': // 작게 (80%)
        return 'clamp(4rem, min(14vw, 24vh), 12rem)';
      case 'md': // 보통 (100%)
        return 'clamp(5rem, min(17vw, 30vh), 16rem)';
      case 'xl': // 최대 (150%) - 최대 배율에서도 7글자가 화면 밖으로 잘리지 않도록 18vw / 34vh로 안전 수렴
        return 'clamp(7rem, min(23vw, 42vh), 26rem)';
      case 'lg': // 크게 (125%)
      default:
        return 'clamp(6rem, min(20vw, 36vh), 21rem)';
    }
  };

  // 🕒 타이머 화면 서브텍스트 및 버튼 크기 헬퍼 (textScale: 'sm' | 'md' | 'lg' 연동 - 상단 현재 시각 숫자 및 배지 시원하게 확대)
  const getTimerTextScaleStyles = () => {
    switch (textScale) {
      case 'sm': // 보통
        return {
          timeBadge: 'px-5 py-2 text-base sm:text-lg shadow-sm',
          timeClockText: `text-lg sm:text-2xl ${cuteFontClass} font-black`,
          subTitle: 'text-xs sm:text-sm tracking-wider font-bold',
          presetBtn: 'px-4 py-2 text-xs sm:text-sm font-bold',
          adjustBtn: 'px-3.5 py-1.5 text-xs sm:text-sm font-bold',
          actionBtn: 'px-7 py-3 text-base gap-2 font-black',
        };
      case 'lg': // 특대
        return {
          timeBadge: 'px-10 py-4.5 text-2xl sm:text-3xl shadow-2xl ring-2 ring-indigo-400/40 font-black',
          timeClockText: `text-3xl sm:text-5xl ${cuteFontClass} font-black tracking-wider`,
          subTitle: 'text-base sm:text-lg font-extrabold tracking-widest',
          presetBtn: 'px-8 py-4 text-lg sm:text-xl font-black shadow-lg',
          adjustBtn: 'px-6 py-3 text-base sm:text-lg font-black shadow-md',
          actionBtn: 'px-12 py-5 text-xl sm:text-2xl font-black gap-3 shadow-2xl scale-105',
        };
      case 'md': // 크게
      default:
        return {
          timeBadge: 'px-8 py-3.5 text-lg sm:text-2xl shadow-lg ring-1 ring-black/10 font-black',
          timeClockText: `text-2xl sm:text-4xl ${cuteFontClass} font-black tracking-wider`,
          subTitle: 'text-sm sm:text-base tracking-wider font-bold',
          presetBtn: 'px-5 py-3 text-sm sm:text-base font-black',
          adjustBtn: 'px-4.5 py-2 text-xs sm:text-sm font-black',
          actionBtn: 'px-9 py-3.5 text-lg sm:text-xl font-black gap-2.5 shadow-xl',
        };
    }
  };

  const getTimerFontClass = () => {
    switch (displayScale) {
      case 'sm':
        return 'text-5xl sm:text-7xl';
      case 'md':
        return 'text-7xl sm:text-8xl';
      case 'xl':
        return 'text-9xl sm:text-[11rem]';
      case 'lg':
      default:
        return 'text-8xl sm:text-9xl';
    }
  };

  const getTextFontClass = () => {
    switch (textScale) {
      case 'lg':
        return 'text-lg sm:text-2xl leading-relaxed';
      case 'sm':
        return 'text-xs sm:text-sm leading-normal';
      case 'md':
      default:
        return 'text-base sm:text-lg leading-relaxed';
    }
  };

  // ☕ 쉬는 시간 모드 하단 주의사항 텍스트 크기 헬퍼
  const getBreakRuleFontSize = () => {
    switch (breakTextScale) {
      case 'sm':
        return 'text-base sm:text-lg font-bold py-2 px-3';
      case 'lg':
        return 'text-2xl sm:text-[1.7rem] font-black py-3.5 px-4';
      case 'md':
      default:
        return 'text-lg sm:text-xl font-black py-2.5 px-3.5';
    }
  };

  // ☕ 쉬는 시간 모드 다음 시간 안내문 텍스트 크기 헬퍼
  const getBreakInfoFontSize = () => {
    switch (breakInfoScale) {
      case 'sm':
        return { title: 'text-sm sm:text-base font-black', period: 'text-base sm:text-lg font-extrabold', subject: 'text-xl sm:text-2xl font-black', notice: 'text-base sm:text-lg font-bold', todo: 'text-sm sm:text-base' };
      case 'lg':
        return { title: 'text-lg sm:text-xl font-black', period: 'text-xl sm:text-2xl font-black', subject: 'text-3xl sm:text-[2.6rem] font-black', notice: 'text-xl sm:text-2xl font-black', todo: 'text-lg sm:text-xl' };
      case 'md':
      default:
        return { title: 'text-base sm:text-lg font-black', period: 'text-lg sm:text-xl font-black', subject: 'text-2xl sm:text-3xl font-black', notice: 'text-lg sm:text-xl font-extrabold', todo: 'text-base sm:text-lg' };
    }
  };


  // 🪑 좌석 배치도 학생 이름 폰트 크기 헬퍼
  const getSeatingStudentNameSize = (isIndividual: boolean) => {
    if (isIndividual) {
      switch (seatingNameScale) {
        case 'sm':
          return 'text-sm sm:text-base font-extrabold';
        case 'lg':
          return 'text-xl sm:text-2xl font-black';
        case 'md':
        default:
          return 'text-base sm:text-lg font-black';
      }
    } else {
      switch (seatingNameScale) {
        case 'sm':
          return 'text-xs sm:text-sm font-bold';
        case 'lg':
          return 'text-lg sm:text-xl font-black';
        case 'md':
        default:
          return 'text-sm sm:text-base font-black';
      }
    }
  };

  // 🧹 청소 체크리스트 폰트 크기 헬퍼
  const getCleanChecklistSize = () => {
    switch (cleanChecklistScale) {
      case 'sm':
        return 'text-xs sm:text-sm py-2 px-2 font-bold';
      case 'lg':
        return 'text-base sm:text-lg py-4 px-3 font-black';
      case 'md':
      default:
        return 'text-sm sm:text-base py-3 px-2.5 font-black';
    }
  };

  // Basketball Scoreboard handlers
  const handleScoreChange = (teamId: number, delta: number) => {
    const updated = syncState.scoreboardTeams.map((t) => {
      if (t.id === teamId) {
        return { ...t, score: Math.max(0, t.score + delta) };
      }
      return t;
    });
    playSelectedChime();
    updateState({ scoreboardTeams: updated });
  };

  const handleScoreReset = (teamId: number) => {
    const updated = syncState.scoreboardTeams.map((t) => {
      if (t.id === teamId) {
        return { ...t, score: 0 };
      }
      return t;
    });
    updateState({ scoreboardTeams: updated });
  };

  const handleScoreResetAll = () => {
    const updated = syncState.scoreboardTeams.map((t) => ({ ...t, score: 0 }));
    updateState({ scoreboardTeams: updated });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // 🎨 모둠 색 · 포인트 효과 (좌석·모둠 탭)
  const groupPal = GROUP_PALETTES[uiThemeKey] || GROUP_PALETTES['clean-white'];
  const teamColorOf = (teamId?: number | null): string | null => {
    const idx = effectiveTeams.findIndex((t: Team) => t.id === teamId);
    return idx < 0 ? null : groupPal[idx % groupPal.length];
  };
  const fxOnStudent = (st: Student) =>
    !!seatFx && seatFx.kind === 'student' && (seatFx.id != null ? seatFx.id === st.id : seatFx.name === st.name);
  const fxOnTeam = (t: Team) => !!seatFx && seatFx.kind === 'team' && (seatFx.id != null ? seatFx.id === t.id : seatFx.name === t.name);
  const cardBase = activeThemeStyle.isLight ? '#ffffff' : '#0f172a';
  const renderSeatFx = (c: string) =>
    seatFx ? (
      <span className="dm-seatfx" key={seatFx.key} aria-hidden>
        <span className="dm-seatfx-lumi">
          <MochiBody face="excited" tint={mochiTint} glow="low" className="w-full h-full" />
        </span>
        <span className="dm-seatfx-plus" style={{ color: c }}>
          {seatFx.label}
        </span>
        {seatFx.type === 'fire' && (
          <span className="dm-seatfx-rays">
            {FX_DOTS.map((col, i) => (
              <span key={i} className="ray" style={{ transform: `rotate(${i * 30}deg)` }}>
                <i style={{ background: col }} />
              </span>
            ))}
          </span>
        )}
        {seatFx.type === 'petal' && (
          <span className="dm-seatfx-petals">
            {[6, 20, 34, 48, 62, 76, 90].map((l, i) => (
              <i key={i} style={{ left: `${l}%`, animationDelay: `${i * 0.22}s` }} />
            ))}
          </span>
        )}
        {seatFx.type === 'stamp' && (
          <span className="dm-seatfx-stamp">
            <small>참</small>
            <b>잘했어요</b>
            <small>★ +{seatFx.delta}</small>
          </span>
        )}
      </span>
    ) : null;
  // 학생 캔디바 색: 모둠 색을 연하게 · 포인트 받는 중이면 네온
  const seatDeskStyle = (student: Student, mode: 'seating' | 'attendance', busy: boolean): React.CSSProperties | undefined => {
    if (mode !== 'seating' || busy) return undefined;
    const c = teamColorOf(student.teamId);
    if (!c) return undefined;
    const on = fxOnStudent(student);
    return {
      background: on ? `linear-gradient(90deg, ${c}88, ${c})` : `${c}${activeThemeStyle.isLight ? '1f' : '2e'}`,
      borderColor: `${c}66`,
      boxShadow: on ? neonShadow(c, cardBase) : undefined,
      position: 'relative',
      zIndex: on ? 20 : undefined,
      cursor: 'pointer',
    };
  };
  const seatNameStyle = (student: Student, mode: 'seating' | 'attendance'): React.CSSProperties | undefined => {
    if (mode !== 'seating' || !fxOnStudent(student)) return undefined;
    const c = teamColorOf(student.teamId);
    return c ? { color: isLightHex(c) ? '#1f2937' : '#ffffff' } : undefined;
  };

  // 🪑 개인좌석 분단 (좌석·모둠 탭과 등교 터치 탭 공용: 끌어서 자리 교체 · 분단으로 넣기 · 분단 이름 수정)
  const renderIndividualCols = (mode: 'seating' | 'attendance', individualColsData: { colNumber: number; students: Student[] }[]) =>
    individualColsData.map((colData, colIdx) => (
                    <div
                      key={`col-${colData.colNumber}-${colIdx}`}
                      onDragOver={(e) => {
                        if (!draggedStudentId) return;
                        e.preventDefault();
                        if (dragOverColNumber !== colData.colNumber) setDragOverColNumber(colData.colNumber);
                      }}
                      onDragLeave={(e) => {
                        if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setDragOverColNumber(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDropStudentOnColumn(colData.colNumber - 1);
                      }}
                      title="학생을 다른 학생 위에 놓으면 자리 교체, 분단 빈 곳에 놓으면 이 분단으로 이동"
                      className={`p-3 rounded-2xl flex flex-col gap-2.5 transition-colors ${
                        dragOverColNumber === colData.colNumber ? 'ring-2 ring-indigo-500 ' : ''
                      }${
                        activeThemeStyle.isLight
                          ? 'bg-white/85 backdrop-blur-sm border border-slate-200/80 shadow-sm'
                          : 'bg-slate-900/90 border border-slate-800/80 shadow-lg'
                      }`}
                    >
                      {/* 열 헤더 */}
                      <div
                        className={`flex items-center justify-between pb-2 border-b text-xs font-black ${
                          activeThemeStyle.isLight
                            ? 'border-slate-100 text-slate-800'
                            : 'border-slate-800 text-slate-300'
                        }`}
                      >
                        {editingColNumber === colData.colNumber ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              autoFocus
                              value={editingColText}
                              onChange={(e) => setEditingColText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveColName(colData.colNumber, editingColText);
                                if (e.key === 'Escape') setEditingColNumber(null);
                              }}
                              onBlur={() => handleSaveColName(colData.colNumber, editingColText)}
                              className="w-24 px-1.5 py-0.5 text-xs font-black rounded border border-indigo-400 bg-white dark:bg-slate-950 text-slate-800 dark:text-white"
                              placeholder="분단명"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveColName(colData.colNumber, editingColText)}
                              className="p-1 rounded bg-indigo-600 text-white shrink-0 cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingColNumber(colData.colNumber);
                              setEditingColText(getColName(colData.colNumber));
                            }}
                            className={`group flex items-center gap-1.5 px-2 py-0.5 rounded-lg transition cursor-pointer text-left ${
                              activeThemeStyle.isLight
                                ? 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold'
                                : 'hover:bg-slate-800 text-indigo-400 font-bold'
                            }`}
                            title="클릭하여 분단 명칭 직접 수정"
                          >
                            <span>🪑</span>
                            <span>{colData.colNumber}열 ({getColName(colData.colNumber)})</span>
                            <Edit3 className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 text-indigo-500" />
                          </button>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            activeThemeStyle.isLight
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-slate-950 text-slate-400'
                          }`}
                        >
                          {mode === 'attendance' ? `${colData.students.filter((x: Student) => x.attendance === 'present').length}/${colData.students.length}` : `${colData.students.length}명`}
                        </span>
                      </div>

                      {/* 세로 1열 학생 카드 리스트 (앞자리 -> 뒷자리) - 드래그 앤 드롭 지원 */}
                      <div className="flex flex-col gap-2 flex-1">
                        {colData.students.map((student: Student, rIdx: number) => {
                          const isDraggingThis = draggedStudentId === student.id;
                          const isDragOverThis = dragOverStudentId === student.id;

                          return (
                            <div
                              key={student.id}
                              draggable={true}
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', String(student.id));
                                e.dataTransfer.effectAllowed = 'move';
                                setDraggedStudentId(student.id);
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                e.dataTransfer.dropEffect = 'move';
                                if (dragOverStudentId !== student.id) {
                                  setDragOverStudentId(student.id);
                                }
                              }}
                              onDragLeave={(e) => {
                                e.stopPropagation();
                                if (dragOverStudentId === student.id) {
                                  setDragOverStudentId(null);
                                }
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDropStudentOnStudent(student.id);
                              }}
                              onDragEnd={() => {
                                setDraggedStudentId(null);
                                setDragOverStudentId(null);
                                setDragOverTeamId(null);
                              }}
                              className={`rounded-xl flex flex-col items-center justify-center py-2 px-2.5 text-center border select-none transition cursor-grab active:cursor-grabbing group ${
                                isDraggingThis
                                  ? 'opacity-40 scale-95 border-dashed border-indigo-500 bg-indigo-50/40'
                                  : isDragOverThis
                                  ? 'ring-2 ring-indigo-500 scale-102 bg-indigo-100/60 dark:bg-indigo-900/60 shadow-md border-indigo-400'
                                  : mode === 'attendance' && student.attendance === 'present'
                                  ? 'bg-emerald-50 border-emerald-300 shadow-xs dark:bg-emerald-900/30 dark:border-emerald-600'
                                  : activeThemeStyle.isLight
                                  ? 'bg-white hover:bg-indigo-50/50 border-slate-200 shadow-2xs hover:shadow-xs'
                                  : 'bg-slate-950/80 border-slate-800 hover:border-indigo-500/60 text-white shadow-xs'
                              }`}
                              onClick={mode === 'attendance' ? () => handleStudentAttendanceTouch(student) : () => setPointTarget({ kind: 'student', id: student.id })}
                              style={seatDeskStyle(student, mode, isDraggingThis || isDragOverThis)}
                              data-seat-state={mode === 'attendance' ? (student.attendance === 'present' ? 'present' : 'waiting') : undefined}
                                    data-just-arrived={justArrivedId === student.id ? 'true' : undefined}
                              data-seat-fx={mode === 'seating' && fxOnStudent(student) ? 'on' : undefined}
                              title={mode === 'attendance' ? '누르면 등교 완료! (끌어서 자리 바꾸기도 돼요)' : '누르면 포인트 주기 · 끌어서 자리 바꾸기'}
                            >
                              {mode === 'seating' && fxOnStudent(student) && renderSeatFx(teamColorOf(student.teamId) || '#6366f1')}
                              <div className="flex items-center justify-between w-full text-xs font-mono font-medium mb-1 px-1">
                                <span
                                  className={activeThemeStyle.isLight ? 'text-slate-500' : 'text-indigo-400'}
                                >
                                  {rIdx + 1}번 자리
                                </span>
                                <span className="flex items-center gap-1">
                                  <span
                                    className={activeThemeStyle.isLight ? 'text-slate-400' : 'text-slate-500'}
                                  >
                                    {student.number}번
                                  </span>
                                  {student.gender === 'M' && (
                                    <span
                                      className={`px-1 py-0.2 rounded font-bold text-[10px] ${
                                        activeThemeStyle.isLight
                                          ? 'bg-blue-50 text-blue-600 border border-blue-200/60'
                                          : 'text-blue-400'
                                      }`}
                                    >
                                      남
                                    </span>
                                  )}
                                  {student.gender === 'F' && (
                                    <span
                                      className={`px-1 py-0.2 rounded font-bold text-[10px] ${
                                        activeThemeStyle.isLight
                                          ? 'bg-rose-50 text-rose-600 border border-rose-200/60'
                                          : 'text-rose-400'
                                      }`}
                                    >
                                      여
                                    </span>
                                  )}
                                </span>
                              </div>
                              <span
                                className={`truncate w-full px-1 font-black ${getSeatingStudentNameSize(true)} ${
                                  activeThemeStyle.isLight ? 'text-slate-900' : 'text-slate-100'
                                }`}
                                style={seatNameStyle(student, mode)}
                              >
                                {student.name}
                              </span>
                              {mode === 'attendance' &&
                                (student.attendance === 'present' ? (
                                  <span className="seat-badge is-done mt-1">
                                    <Check className="w-3 h-3" /> 완료
                                  </span>
                                ) : (
                                  <span className="seat-badge is-wait mt-1">터치 ✋</span>
                                ))}
                              {mode !== 'attendance' && student.praisePoints > 0 && (
                                <span
                                  className={`text-[10px] font-bold mt-0.5 flex items-center gap-0.5 ${
                                    activeThemeStyle.isLight ? 'text-amber-500' : 'text-amber-400'
                                  }`}
                                >
                                  ⭐ {student.praisePoints}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));

  // 👥 모둠 좌석 카드 (좌석·모둠 탭과 등교 터치 탭이 같은 배치·이동 방식을 씀)
  //  - 책상 위치(1·2·2 등 학급별 배치)는 공용 저장소(seatingLayout)를 함께 사용
  //  - 끌어서 자리 바꾸기 / 다른 모둠으로 넣기 · 책상 배치 편집 → 정렬 모두 동일
  //  - 등교 터치에서는 책상을 누르면 등교 완료
  const renderTeamSeatCards = (mode: 'seating' | 'attendance', displayTeams: Team[]) =>
    displayTeams.map((team: Team) => {
                    const teamStudents = effectiveStudents.filter((s: Student) => s.teamId === team.id);
                    const totalStudents = teamStudents.length;
                    const presentCount = teamStudents.filter((s: Student) => s.attendance === 'present').length;
                    const isTeamDragOver = dragOverTeamId === team.id;
                    const tc = teamColorOf(team.id) || '#6366f1';
                    const teamOn = mode === 'seating' && fxOnTeam(team);
                    const tInk = isLightHex(tc) ? '#1f2937' : '#ffffff';
                    const goal = Math.max(1, team.goalPoints || 10);

                    return (
                      <div
                        key={team.id}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (dragOverTeamId !== team.id) {
                            setDragOverTeamId(team.id);
                          }
                        }}
                        onDragLeave={() => {
                          if (dragOverTeamId === team.id) {
                            setDragOverTeamId(null);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDropStudentOnTeam(team.id);
                        }}
                        className={`p-4 rounded-2xl flex flex-col justify-between transition-colors ${
                          isTeamDragOver ? 'ring-2 ring-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/40' : ''
                        } ${
                          activeThemeStyle.isLight
                            ? 'bg-white/85 backdrop-blur-sm border border-slate-200/80 shadow-sm'
                            : 'bg-slate-900/90 border border-slate-800/80 shadow-lg'
                        }`}
                        style={{ borderWidth: 2, borderColor: `${tc}66`, boxShadow: `0 8px 22px ${tc}22`, ...(activeThemeStyle.isLight ? {} : { background: `${tc}14` }) }}
                        data-team-color={tc}
                      >
                        {/* 모둠 헤더 (보조 모니터에서 모둠 이름 직접 변경 지원) */}
                        <div
                          className={`dm-team-bar relative flex items-center justify-between px-3 py-1.5 rounded-full ${teamOn ? 'dm-neon' : ''}`}
                          style={{ background: `linear-gradient(90deg, ${tc}cc, ${tc})`, color: tInk, boxShadow: teamOn ? neonShadow(tc, cardBase) : `0 4px 12px ${tc}44` }}
                          data-team-fx={teamOn ? 'on' : undefined}
                        >
                          {teamOn && renderSeatFx(tc)}
                          <div className="flex items-center gap-2 flex-wrap">
                            {editingTeamId === team.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  autoFocus
                                  value={editingTeamName}
                                  onChange={(e) => setEditingTeamName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveTeamName(team.id, editingTeamName);
                                    if (e.key === 'Escape') setEditingTeamId(null);
                                  }}
                                  onBlur={() => handleSaveTeamName(team.id, editingTeamName)}
                                  className="w-28 sm:w-36 px-2 py-0.5 text-xs sm:text-sm font-black rounded-lg border border-indigo-400 bg-white dark:bg-slate-950 text-slate-800 dark:text-white"
                                  placeholder="모둠명 입력"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveTeamName(team.id, editingTeamName)}
                                  className="p-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 cursor-pointer"
                                  title="저장"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTeamId(team.id);
                                  setEditingTeamName(team.name);
                                }}
                                className="group flex items-center gap-1.5 px-2 py-0.5 rounded-lg transition cursor-pointer text-left hover:bg-white/20"
                                style={{ color: 'inherit' }}
                                title="클릭하여 모둠 이름 직접 변경"
                              >
                                <span className="font-black text-sm">
                                  {team.name}
                                </span>
                                <Edit3 className="w-3 h-3 opacity-50 group-hover:opacity-100 transition" />
                              </button>
                            )}
                            <span className="text-xs font-bold" style={{ opacity: 0.85 }}>
                              {mode === 'attendance' ? `(${presentCount}/${totalStudents})` : `(${totalStudents}명)`}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={mode === 'seating' ? () => setPointTarget({ kind: 'team', id: team.id }) : undefined}
                            className="px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 transition hover:scale-105"
                            style={{ background: 'rgba(255,255,255,.88)', color: '#92400e', cursor: mode === 'seating' ? 'pointer' : 'default' }}
                            title={mode === 'seating' ? '누르면 모둠 포인트 주기' : undefined}
                            data-team-point-btn={team.id}
                          >
                            <span>🏆</span>
                            <span>{team.points}점</span>
                            {mode === 'seating' && <span className="ml-0.5 opacity-70">＋</span>}
                          </button>
                        </div>
                        {/* 목표까지 진행 막대 */}
                        <div className="h-1.5 mt-2 mb-3 rounded-full overflow-hidden" style={{ background: `${tc}26` }}>
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, ((team.points || 0) / goal) * 100)}%`, background: tc }} />
                        </div>

                        {/* 모둠 안 학생 카드 (가로 직사각형 캔디바 블록 - 드래그 앤 드롭 지원) */}
                        <div className="flex-1 flex flex-col justify-center">
                          {totalStudents === 0 ? (
                            <div
                              className={`p-4 text-center text-xs italic ${
                                activeThemeStyle.isLight ? 'text-slate-400' : 'text-slate-500'
                              }`}
                            >
                              배정된 학생이 없습니다 (학생 캔디바를 이곳으로 드래그하여 배정)
                            </div>
                          ) : (
                            <TeamDeskArea
                              teamId={team.id}
                              students={teamStudents}
                              editing={deskEditing}
                              flipped={seatingPerspective === 'student'}
                              gap={10}
                              renderDesk={(student: Student) => {
                                const isDraggingThis = draggedStudentId === student.id;
                                const isDragOverThis = dragOverStudentId === student.id;

                                return (
                                  <div
                                    key={student.id}
                                    draggable={!deskEditing}
                                    onDragStart={(e) => {
                                      e.dataTransfer.setData('text/plain', String(student.id));
                                      e.dataTransfer.effectAllowed = 'move';
                                      setDraggedStudentId(student.id);
                                    }}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      e.dataTransfer.dropEffect = 'move';
                                      if (dragOverStudentId !== student.id) {
                                        setDragOverStudentId(student.id);
                                      }
                                    }}
                                    onDragLeave={(e) => {
                                      e.stopPropagation();
                                      if (dragOverStudentId === student.id) {
                                        setDragOverStudentId(null);
                                      }
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleDropStudentOnStudent(student.id);
                                    }}
                                    onDragEnd={() => {
                                      setDraggedStudentId(null);
                                      setDragOverStudentId(null);
                                      setDragOverTeamId(null);
                                    }}
                                    className={`rounded-xl flex flex-col items-center justify-center py-2.5 px-2 text-center border select-none transition cursor-grab active:cursor-grabbing ${
                                      deskEditing ? 'w-full cursor-move border-dashed' : 'w-full'
                                    } ${
                                      isDraggingThis
                                        ? 'opacity-40 scale-95 border-dashed border-indigo-500 bg-indigo-50/40'
                                        : isDragOverThis
                                        ? 'ring-2 ring-indigo-500 scale-102 bg-indigo-100/60 dark:bg-indigo-900/60 shadow-md border-indigo-400'
                                        : mode === 'attendance' && student.attendance === 'present'
                                        ? 'bg-emerald-50 border-emerald-300 shadow-xs dark:bg-emerald-900/30 dark:border-emerald-600'
                                        : activeThemeStyle.isLight
                                        ? 'bg-white hover:bg-indigo-50/50 border-slate-200 shadow-2xs hover:shadow-xs'
                                        : 'bg-slate-950/70 border-slate-800 text-white shadow-xs'
                                    }`}
                                    onClick={deskEditing ? undefined : mode === 'attendance' ? () => handleStudentAttendanceTouch(student) : () => setPointTarget({ kind: 'student', id: student.id })}
                                    style={seatDeskStyle(student, mode, isDraggingThis || isDragOverThis || deskEditing)}
                                    data-seat-state={mode === 'attendance' ? (student.attendance === 'present' ? 'present' : 'waiting') : undefined}
                                    data-just-arrived={justArrivedId === student.id ? 'true' : undefined}
                                    data-seat-fx={mode === 'seating' && fxOnStudent(student) ? 'on' : undefined}
                                    title={mode === 'attendance' ? '누르면 등교 완료! (끌어서 자리 바꾸기도 돼요)' : '누르면 포인트 주기 · 끌어서 다른 학생 · 모둠과 자리 바꾸기'}
                                  >
                                    {mode === 'seating' && fxOnStudent(student) && renderSeatFx(teamColorOf(student.teamId) || '#6366f1')}
                                    <div className="flex items-center justify-between w-full text-[11px] font-mono font-medium mb-1 px-1">
                                      <span
                                        className={activeThemeStyle.isLight ? 'text-slate-400' : 'text-slate-500'}
                                      >
                                        {student.number}번
                                      </span>
                                      {student.gender === 'M' && (
                                        <span
                                          className={`px-1 py-0.2 rounded font-bold text-[10px] ${
                                            activeThemeStyle.isLight
                                              ? 'bg-blue-50 text-blue-600 border border-blue-200/60'
                                              : 'text-blue-400'
                                          }`}
                                        >
                                          남
                                        </span>
                                      )}
                                      {student.gender === 'F' && (
                                        <span
                                          className={`px-1 py-0.2 rounded font-bold text-[10px] ${
                                            activeThemeStyle.isLight
                                              ? 'bg-rose-50 text-rose-600 border border-rose-200/60'
                                              : 'text-rose-400'
                                          }`}
                                        >
                                          여
                                        </span>
                                      )}
                                    </div>
                                    <span
                                      className={`truncate w-full px-1 font-black ${getSeatingStudentNameSize(true)} ${
                                        activeThemeStyle.isLight ? 'text-slate-900' : 'text-slate-100'
                                      }`}
                                      style={seatNameStyle(student, mode)}
                                    >
                                      {student.name}
                                    </span>
                                    {mode === 'attendance' &&
                                      (student.attendance === 'present' ? (
                                        <span className="seat-badge is-done mt-1">
                                          <Check className="w-3 h-3" /> 완료
                                        </span>
                                      ) : (
                                        <span className="seat-badge is-wait mt-1">터치 ✋</span>
                                      ))}
                                    {mode !== 'attendance' && student.praisePoints > 0 && (
                                      <span
                                        className={`text-[10px] font-bold mt-0.5 flex items-center gap-0.5 ${
                                          activeThemeStyle.isLight ? 'text-amber-500' : 'text-amber-400'
                                        }`}
                                      >
                                        ⭐ {student.praisePoints}
                                      </span>
                                    )}
                                  </div>
                                );
                              }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  });

  // 🎂 대시보드의 [축하 파티] → 어느 탭을 보고 있든 생일 축하 화면
  const [birthdayKids, setBirthdayKids] = useState<BirthdayKid[] | null>(null);
  useEffect(() => listenBirthdayCelebration((kids) => setBirthdayKids(kids)), []);

  return (
    <>
    {birthdayKids && <BirthdayCelebration kids={birthdayKids} onClose={() => setBirthdayKids(null)} />}
    <div
      style={{
        fontSize: `${autoFontScale * 100}%`,
        ...activeThemeStyle.bgStyle,
      }}
      className={`dm-root w-full flex flex-col select-none transition-colors duration-300 relative ${!standalone && !activeThemeStyle.isLight ? 'dark' : ''} ${
        activeThemeStyle.isLight
          ? 'dm-cute light bg-slate-100 text-slate-900'
          : 'dark text-white'
      } ${activeThemeStyle.bgClass} ${standalone ? 'h-screen' : 'h-full min-h-[580px]'} ${prefs.touch ? 'dm-touch' : ''}`}
      data-dm-tab={syncState.activeTab}
    >
      {/* 🏆 칭찬 점수 알림 (루미) */}
      {/* 🎁 좌석·모둠: 포인트 주기 패널 (학생 · 모둠 이름을 누르면 열려요) */}
      {pointTarget && syncState.activeTab === 'seating' && (() => {
        const isTeam = pointTarget.kind === 'team';
        const team = isTeam ? effectiveTeams.find((t: Team) => t.id === pointTarget.id) : null;
        const st = !isTeam ? effectiveStudents.find((x: Student) => x.id === pointTarget.id) : null;
        if (!team && !st) return null;
        const c = teamColorOf(isTeam ? team!.id : st!.teamId) || '#6366f1';
        const items = isTeam ? TEAM_REASONS : readPraiseItems();
        const give = (it: { id: string; label: string; points: number; icon: string }) => {
          if (isTeam) sendPointCommand({ kind: 'team', teamId: team!.id, delta: it.points, reason: it.label, icon: it.icon });
          else sendPointCommand({ kind: 'student', studentId: st!.id, itemId: it.id, delta: it.points });
        };
        const minus = () => {
          if (isTeam) sendPointCommand({ kind: 'team', teamId: team!.id, delta: -1 });
          else sendPointCommand({ kind: 'student', studentId: st!.id, delta: -1 });
        };
        const fxOpts: ['random' | SeatFxType, string][] = [
          ['random', '🎲 랜덤'],
          ['fire', '🎆 폭죽'],
          ['petal', '🌸 꽃잎'],
          ['stamp', '💮 도장'],
        ];
        return (
          <div className={`dm-point-panel ${activeThemeStyle.isLight ? '' : 'is-dark'}`} data-dm-point-panel onClick={(e) => e.stopPropagation()}>
            <div className="dm-pp-head">
              <b>🎁 포인트 주기</b>
              <button type="button" onClick={() => setPointTarget(null)} aria-label="닫기">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="dm-pp-target" style={{ borderColor: c, background: `${c}1a` }}>
              <i style={{ background: c }} />
              <span>{isTeam ? team!.name : `${st!.name} 학생`}</span>
              <em>{isTeam ? `🏆 ${team!.points}점` : `⭐ ${st!.praisePoints || 0}`}</em>
            </div>
            <div className="dm-pp-label">칭찬 이유 (누르면 바로 줘요)</div>
            <div className="dm-pp-grid">
              {items.map((it) => (
                <button key={it.id} type="button" onClick={() => give(it)} data-dm-pp-item={it.id}>
                  <span>
                    {it.icon} {it.label}
                  </span>
                  <b style={{ color: c }}>+{it.points}</b>
                </button>
              ))}
            </div>
            <button type="button" className="dm-pp-minus" onClick={minus}>
              −1 빼기
            </button>
            <div className="dm-pp-label">받을 때 효과</div>
            <div className="dm-pp-fx">
              {fxOpts.map(([k, label]) => (
                <button key={k} type="button" className={pointFxPref === k ? 'is-on' : ''} onClick={() => setPointFxPref(k)}>
                  {label}
                </button>
              ))}
            </div>
            <p className="dm-pp-note">메인 화면 위젯에서 준 포인트도 여기에 똑같이 효과가 나와요.</p>
          </div>
        );
      })()}
      {praisePop && !(syncState.activeTab === 'seating' && seatFx) && (() => {
        const plus = praisePop.delta >= 0;
        const who = praisePop.kind === 'team' ? praisePop.name : `${praisePop.name}`;
        return (
          <div key={praisePop.id} className={`dm-praise-pop ${plus ? 'is-plus' : 'is-minus'}`} data-dm-praise-pop>
            <div className="dm-praise-card">
              {plus && (
                <div className="dm-praise-stars" aria-hidden>
                  {['⭐', '✨', '💛', '🌟', '✨', '⭐'].map((e, i) => (
                    <i key={i} style={{ left: `${10 + i * 15}%`, top: i % 2 ? '8%' : '78%', ['--dx' as any]: `${(i - 2.5) * 18}px`, ['--dy' as any]: i % 2 ? '-40px' : '40px', animationDelay: `${i * 0.08}s` }}>
                      {e}
                    </i>
                  ))}
                </div>
              )}
              <div className="dm-praise-lumi">
                <MochiBody face={plus ? 'love' : 'serious'} tint={mochiTint} glow="low" className="w-full h-full" />
              </div>
              <div className="dm-praise-text">
                <b>{plus ? `${who} 칭찬해요!` : `${who}, 조금 아쉬워요`}</b>
                <span>
                  {plus
                    ? praisePop.reason
                      ? `${praisePop.icon || '🌟'} ${praisePop.reason}`
                      : praisePop.kind === 'team'
                      ? '🤝 멋진 협력! 칭찬 도장을 받았어요'
                      : '🌟 잘했어요! 칭찬 도장을 받았어요'
                    : '💪 다음엔 더 잘할 수 있어요!'}
                </span>
                <em>지금 {praisePop.total}{praisePop.kind === 'team' ? '개' : '점'}</em>
              </div>
              <span className="dm-praise-delta">{plus ? `+${praisePop.delta}` : `−${Math.abs(praisePop.delta)}`}</span>
            </div>
          </div>
        );
      })()}

      {/* ⏰ 타이머 알림 팝업 (루미) */}
      {timerToast && (() => {
        const msg = timerAlertMessage(timerToast.sec);
        return (
          <div key={timerToast.id} className={`dm-ttoast ${timerToast.sec === 0 ? 'is-end' : timerToast.sec <= 10 ? 'is-hot' : ''}`} data-dm-timer-toast onClick={() => setTimerToast(null)}>
            <div className="dm-ttoast-card">
              <div className="dm-ttoast-lumi">
                <MochiBody face={timerToast.sec === 0 ? 'excited' : 'happy'} tint={mochiTint} glow="low" className="w-full h-full" />
                <span className="dm-ttoast-bell">{timerToast.sec === 0 ? '🎉' : '⏰'}</span>
              </div>
              <div className="dm-ttoast-text">
                <b>{msg.title}</b>
                <span>{msg.sub}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 🙈 잠깐 가리기: 루미 대기 화면 */}
      {syncState.isBlanked && (
        <div className="dm-blank" data-dm-blank-screen>
          <div className="dm-blank-lumi">
            <MochiBody face="sleepy" tint={mochiTint} glow="low" className="w-full h-full" />
            <span className="dm-blank-z">Z</span>
            <span className="dm-blank-z z2">z</span>
          </div>
          <div className="dm-blank-title">잠깐만 기다려 주세요</div>
          <div className="dm-blank-time">{currentTime.hours}:{currentTime.minutes}</div>
          <button type="button" className="dm-blank-btn" onClick={() => updateState({ isBlanked: false })}>
            👀 다시 보기 (B)
          </button>
        </div>
      )}

      {/* 🗂️ 탭 정리 */}
      {tabEditOpen && (
        <div className="dm-tabedit" data-dm-tabedit>
          <div className="flex items-center justify-between mb-2">
            <b>🗂️ 탭 정리</b>
            <button type="button" className="text-slate-400 hover:text-slate-700" onClick={() => setTabEditOpen(false)}>
              ✕
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mb-2">눈 모양을 눌러 숨기고, ▲▼로 순서를 바꿔요.</p>
          {prefs.layout.order.map((id, i) => {
            const t = DISPLAY_TABS.find((x) => x.id === id)!;
            const hidden = prefs.layout.hidden.includes(id);
            const move = (d: number) => {
              const o = [...prefs.layout.order];
              const j = i + d;
              if (j < 0 || j >= o.length) return;
              [o[i], o[j]] = [o[j], o[i]];
              setTabLayout({ ...prefs.layout, order: o });
            };
            return (
              <div key={id} className={`dm-tabedit-row ${hidden ? 'is-hidden' : ''}`}>
                <button
                  type="button"
                  onClick={() => setTabLayout({ ...prefs.layout, hidden: hidden ? prefs.layout.hidden.filter((x) => x !== id) : [...prefs.layout.hidden, id] })}
                  title={hidden ? '보이기' : '숨기기'}
                >
                  {hidden ? '🙈' : '👁️'}
                </button>
                <span className="flex-1">
                  {t.emoji} {t.label}
                </span>
                <button type="button" onClick={() => move(-1)} disabled={i === 0}>
                  ▲
                </button>
                <button type="button" onClick={() => move(1)} disabled={i === prefs.layout.order.length - 1}>
                  ▼
                </button>
              </div>
            );
          })}
          <button type="button" className="dm-tabedit-reset" onClick={() => setTabLayout({ order: DISPLAY_TABS.map((t) => t.id), hidden: [] })}>
            처음 순서로
          </button>
        </div>
      )}
      {/* 🐣 루미 인사 (등교 터치 · 뽑기 등 동작에 반응) */}
      {lumiGreet && (
        <div key={lumiGreet.id} className="dm-greet" aria-live="polite">
          <div className="dm-greet-lumi">
            <MochiBody face="happy" tint={mochiTint} glow="low" className="w-full h-full" />
          </div>
          <div className="dm-greet-bubble">{lumiGreet.text}</div>
        </div>
      )}
      {/* 🔔 차임벨 집중 팝업 알림 (보조 모니터 전용) */}
      {chimePopup && (
        <div className="fixed top-8 inset-x-0 mx-auto max-w-lg z-50 animate-bounce p-4 rounded-3xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-2xl border-2 border-white backdrop-blur-xl flex items-center justify-center gap-3">
          <span className="text-3xl animate-pulse">🔔</span>
          <span className="font-black text-base sm:text-lg tracking-tight text-center">{chimePopup}</span>
        </div>
      )}

      {/* Navigation and Sync Indicator Bar (상단 바 접기 지원) */}
      {!isHeaderHidden && (
      <header
        className={`dm-header px-5 py-3 border-b flex items-center justify-between flex-wrap gap-2 shrink-0 transition-colors duration-300 ${
          activeThemeStyle.headerClass
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="dm-head-lumi" aria-hidden>
            <MochiBody face="happy" tint={mochiTint} glow="low" className="w-full h-full" />
          </div>
          <div className="leading-tight">
            <h1 className="text-sm sm:text-base font-black tracking-tight">우리 반 큰 화면</h1>
            <p className="dm-head-sub">Class in · 루미와 함께해요</p>
            <OwnerBadge size="xs" tone={activeThemeStyle.isLight ? 'light' : 'dark'} className="mt-1" />
          </div>
        </div>

        {/* Top Control Tabs */}
        <div
          className={`flex items-center gap-1 p-1 rounded-2xl border overflow-x-auto transition-colors ${
            activeThemeStyle.isLight
              ? 'bg-slate-200/60 border-slate-300/80 shadow-2xs'
              : 'bg-slate-950/80 border-slate-800'
          }`}
        >
          {prefs.layout.order
            .filter((id) => !prefs.layout.hidden.includes(id) || id === syncState.activeTab)
            .map((id) => {
              const t = DISPLAY_TABS.find((x) => x.id === id)!;
              const icons: Record<string, any> = { morning: Sunrise, attendance: CheckCircle2, drawing: Edit3, timer: TimerIcon, break: Coffee, seating: Users, clean: Sparkles, roles: Users, picker: RotateCcw, bracket: TrophyIcon2, score: Hash };
              return { id, label: `${t.emoji} ${t.label}`, icon: icons[id] };
            })
            .map((item) => {
            const isActive = syncState.activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => updateState({ activeTab: item.id as any })}
                data-dm-tab-btn={item.id}
                className={`dm-tab ${isActive ? 'is-active' : ''} px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md'
                    : activeThemeStyle.isLight
                    ? 'bg-white/80 text-slate-700 hover:bg-white hover:text-slate-900 border border-slate-200/80 shadow-2xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <span>{item.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setTabEditOpen((v) => !v)}
            className={`dm-tab px-2.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1 cursor-pointer shrink-0 ${tabEditOpen ? 'bg-indigo-600 text-white' : activeThemeStyle.isLight ? 'bg-white/80 text-slate-500 border border-slate-200/80' : 'text-slate-400'}`}
            title="탭 정리 (숨기기 · 순서 바꾸기)"
            data-dm-tab-edit
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action Controls: Theme Setting, Popout & Fullscreen (헤더 우측 끝으로 정렬) */}
        <div className="flex items-center gap-2 ml-auto shrink-0 justify-end">
          {/* ⚙️ [보조화면 설정] 버튼 (클릭 시 타이머 크기, 글꼴, 번짐 효과 및 테마를 팝업창으로 설정) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsThemeModalOpen(!isThemeModalOpen)}
              className={`p-2 rounded-xl font-bold text-xs flex items-center justify-center transition cursor-pointer border shadow-sm active:scale-95 ${
                isThemeModalOpen
                  ? 'bg-indigo-600 text-white border-indigo-500 ring-2 ring-indigo-300'
                  : activeThemeStyle.isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-2xs'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="보조화면 설정 (타이머 크기, 글자 크기, 번짐 효과, 색상 및 배경 테마)"
            >
              <Settings className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            </button>

            {/* 🎨⚙️ [보조화면 디스플레이 & 테마 설정] 독립 팝업창 (createPortal 적용하여 타이머 화면과의 중첩을 완전 차단) */}
            {isThemeModalOpen &&
              typeof document !== 'undefined' &&
              createPortal(
                <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
                  {/* 배경 클릭 시 닫기 */}
                  <div
                    className="fixed inset-0"
                    onClick={() => setIsThemeModalOpen(false)}
                  />

                  {/* 독립 모달 본체 카드 */}
                  <div
                    className={`relative w-full max-w-4xl border-2 rounded-3xl p-6 shadow-2xl z-10 animate-scale-up transition-colors max-h-[90vh] flex flex-col ${
                      activeThemeStyle.isLight
                        ? 'bg-white border-slate-300 text-slate-800 shadow-2xl'
                        : 'bg-slate-900 border-slate-700 text-slate-100 shadow-2xl shadow-black'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* 모달 헤더 */}
                    <div
                      className={`flex items-center justify-between pb-3.5 border-b mb-3 shrink-0 ${
                        activeThemeStyle.isLight ? 'border-slate-200' : 'border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center shadow-xs">
                          <Settings className="w-5 h-5" />
                        </div>
                        <div>
                          <h3
                            className={`font-black text-base sm:text-lg ${
                              activeThemeStyle.isLight ? 'text-slate-900' : 'text-white'
                            }`}
                          >
                            보조화면 디스플레이 &amp; 테마 설정
                          </h3>
                          <p className={`text-xs ${activeThemeStyle.isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            타이머 크기, 글꼴, 번짐 효과 및 교실 프로젝터 최적화 감성 테마를 설정하세요
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsThemeModalOpen(false)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer transition active:scale-90 ${
                          activeThemeStyle.isLight
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                        }`}
                        title="닫기"
                      >
                        ✕
                      </button>
                    </div>

                    {/* 🎛️ 상단 메인 탭 전환: [⏱️ 타이머 & 화면 설정] vs [🎨 배경 & 테마 설정] */}
                    <div
                      className={`grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl border mb-3 text-xs shrink-0 ${
                        activeThemeStyle.isLight
                          ? 'bg-slate-100 border-slate-200'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveSettingTab('timer')}
                        className={`py-2 px-3 rounded-xl font-black transition flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                          activeSettingTab === 'timer'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : activeThemeStyle.isLight
                            ? 'text-slate-600 hover:text-slate-900'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <TimerIcon className="w-4 h-4" />
                        <span className="text-xs sm:text-sm">⏱️ 타이머 크기 &amp; 글꼴/색상</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveSettingTab('theme')}
                        className={`py-2 px-3 rounded-xl font-black transition flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                          activeSettingTab === 'theme'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : activeThemeStyle.isLight
                            ? 'text-slate-600 hover:text-slate-900'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Palette className="w-4 h-4" />
                        <span className="text-xs sm:text-sm">🎨 배경 &amp; 감성 테마</span>
                      </button>
                    </div>

                    {/* 🎛️ 1. [⏱️ 타이머 & 화면 설정] 탭 내용 */}
                    {activeSettingTab === 'timer' && (
                      <div className="flex-1 overflow-y-auto custom-scroll pr-1 space-y-3.5 min-h-0 animate-fade-in text-xs">
                        {/* 1. ⏱️ 타이머 숫자 배율 */}
                        <div
                          className={`p-4 rounded-2xl border transition-colors ${
                            activeThemeStyle.isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/70 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-extrabold text-sm flex items-center gap-1.5">
                              <span>⏱️ 타이머 크기</span>
                              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200/60 dark:border-indigo-800">
                                상단 공간 확장으로 더욱 시원하게 표시됩니다
                              </span>
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                              { key: 'sm', label: '작게 (80%)', desc: '슬림 컴팩트' },
                              { key: 'md', label: '보통 (100%)', desc: '표준 교실' },
                              { key: 'lg', label: '크게 (125%)', desc: '대형 전자칠판' },
                              { key: 'xl', label: '최대 (150%)', desc: '초대형 강당/TV' },
                            ].map((item) => (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => {
                                  setDisplayScale(item.key as any);
                                  localStorage.setItem('dual_display_timer_scale', item.key);
                                }}
                                className={`p-2.5 rounded-xl border text-left font-black transition cursor-pointer flex flex-col gap-0.5 active:scale-95 ${
                                  displayScale === item.key
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-400/40'
                                    : activeThemeStyle.isLight
                                    ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                                }`}
                              >
                                <span className="text-xs">{item.label}</span>
                                <span className={`text-[10px] font-medium ${displayScale === item.key ? 'text-indigo-100' : 'text-slate-400'}`}>
                                  {item.desc}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 2. 🔤 글자 & 시계 크기 */}
                        <div
                          className={`p-4 rounded-2xl border transition-colors ${
                            activeThemeStyle.isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/70 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-extrabold text-sm flex items-center gap-1.5">
                              <span>🔤 상단 현재 시각 및 서브 글자 크기</span>
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { key: 'sm', label: '보통', desc: '기본 크기' },
                              { key: 'md', label: '크게', desc: '시원한 가독성' },
                              { key: 'lg', label: '특대', desc: '교실 뒤편 시인성 최적화' },
                            ].map((item) => (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => handleTextScaleChange(item.key as any)}
                                className={`p-2.5 rounded-xl border text-left font-black transition cursor-pointer flex flex-col gap-0.5 active:scale-95 ${
                                  textScale === item.key
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-400/40'
                                    : activeThemeStyle.isLight
                                    ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                                }`}
                              >
                                <span className="text-xs">{item.label}</span>
                                <span className={`text-[10px] font-medium ${textScale === item.key ? 'text-indigo-100' : 'text-slate-400'}`}>
                                  {item.desc}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 3. ✨ 번짐 효과 (Glow) */}
                        <div
                          className={`p-4 rounded-2xl border transition-colors ${
                            activeThemeStyle.isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/70 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-extrabold text-sm flex items-center gap-1.5">
                              <span>✨ 번짐 효과 (Glow)</span>
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { key: 'none', label: '깔끔 (없음)', desc: '선명한 디지털 글꼴' },
                              { key: 'soft', label: '은은하게 (권장)', desc: '눈이 편안한 그림자' },
                              { key: 'neon', label: '네온 발광', desc: '화려한 집중 효과' },
                            ].map((item) => (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => handleUpdateThemeSettings({ timerGlowIntensity: item.key as any })}
                                className={`p-2.5 rounded-xl border text-left font-black transition cursor-pointer flex flex-col gap-0.5 active:scale-95 ${
                                  timerGlowSetting === item.key
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-400/40'
                                    : activeThemeStyle.isLight
                                    ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                                }`}
                              >
                                <span className="text-xs">{item.label}</span>
                                <span className={`text-[10px] font-medium ${timerGlowSetting === item.key ? 'text-indigo-100' : 'text-slate-400'}`}>
                                  {item.desc}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 4. 🎨 타이머 & 시계 글자 색상 */}
                        <div
                          className={`p-4 rounded-2xl border transition-colors ${
                            activeThemeStyle.isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/70 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-extrabold text-sm flex items-center gap-1.5">
                              <span>🎨 색상</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {TIMER_COLOR_PRESETS.map((preset) => {
                              const isSelected = timerColorSetting === preset.key;
                              return (
                                <button
                                  key={preset.key}
                                  type="button"
                                  onClick={() =>
                                    handleUpdateThemeSettings({
                                      timerColorPreset: preset.key as any,
                                      clockColorPreset: preset.key as any,
                                    })
                                  }
                                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 active:scale-95 border ${
                                    isSelected
                                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-400/30'
                                      : activeThemeStyle.isLight
                                      ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                                      : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                                  }`}
                                >
                                  {preset.key !== 'default' && (
                                    <span
                                      className="w-3 h-3 rounded-full inline-block shrink-0 shadow-2xs border border-black/10"
                                      style={{ backgroundColor: preset.hex }}
                                    />
                                  )}
                                  <span>{preset.name}</span>
                                </button>
                              );
                            })}

                            <label
                              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 active:scale-95 border relative ${
                                timerColorSetting === 'custom'
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-400/30'
                                  : activeThemeStyle.isLight
                                  ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                              }`}
                            >
                              <input
                                type="color"
                                value={customTimerHex}
                                onChange={(e) =>
                                  handleUpdateThemeSettings({
                                    timerColorPreset: 'custom',
                                    timerCustomColor: e.target.value,
                                    clockColorPreset: 'custom',
                                    clockCustomColor: e.target.value,
                                  })
                                }
                                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                              />
                              <span
                                className="w-3 h-3 rounded-full inline-block shrink-0 shadow-2xs border border-white/60"
                                style={{ backgroundColor: customTimerHex }}
                              />
                              <span>직접선택</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 🎨 2. [🎨 배경 & 테마 설정] 탭 내용 */}
                    {activeSettingTab === 'theme' && (
                      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        {/* 3대 모드 선택 세그먼트 스위처 */}
                        <div
                          className={`grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl border mb-4 text-xs shrink-0 ${
                            activeThemeStyle.isLight
                              ? 'bg-slate-100 border-slate-200'
                              : 'bg-slate-950 border-slate-800'
                          }`}
                        >
                      <button
                        type="button"
                        onClick={() => handleUpdateThemeSettings({ mode: 'sync_main' })}
                        className={`py-2 px-1 rounded-xl font-bold transition flex flex-col items-center justify-center gap-0.5 cursor-pointer text-center ${
                          themeSettings.mode === 'sync_main'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : activeThemeStyle.isLight
                            ? 'text-slate-600 hover:text-slate-900'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="text-xs sm:text-sm font-black">🔗 메인 대시보드 연동</span>
                        <span className="text-[10px] opacity-85">교사 화면 테마와 100% 동일</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateThemeSettings({
                            mode: 'recommended',
                            recommendedTheme: themeSettings.recommendedTheme || 'elementary',
                          })
                        }
                        className={`py-2 px-1 rounded-xl font-bold transition flex flex-col items-center justify-center gap-0.5 cursor-pointer text-center ${
                          themeSettings.mode === 'recommended'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : activeThemeStyle.isLight
                            ? 'text-slate-600 hover:text-slate-900'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="text-xs sm:text-sm font-black">🌟 9대 프리셋 테마</span>
                        <span className="text-[10px] opacity-85">원클릭 최적화 프리셋</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateThemeSettings({ mode: 'custom' })}
                        className={`py-2 px-1 rounded-xl font-bold transition flex flex-col items-center justify-center gap-0.5 cursor-pointer text-center ${
                          themeSettings.mode === 'custom'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : activeThemeStyle.isLight
                            ? 'text-slate-600 hover:text-slate-900'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="text-xs sm:text-sm font-black">🎨 개인 지정 컬러</span>
                        <span className="text-[10px] opacity-85">원하는 색상 직접 선택</span>
                      </button>
                    </div>

                    {/* 모달 바디: 스크롤 영역 (9대 테마가 3열로 시원하게 표시) */}
                    <div className="flex-1 overflow-y-auto custom-scroll pr-1 space-y-3 min-h-0">
                      {/* 1. 메인 위젯 테마 동기화 모드 안내 */}
                      {themeSettings.mode === 'sync_main' && (
                        <div
                          className={`space-y-3 p-4 rounded-2xl border animate-fade-in text-xs ${
                            activeThemeStyle.isLight
                              ? 'bg-slate-50 border-slate-200'
                              : 'bg-slate-950/70 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-sm text-indigo-600">현재 메인 대시보드 테마:</span>
                            <span className="font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs">
                              {THEME_CONFIGS[mainConfigTheme.theme]?.badge || mainConfigTheme.theme}
                            </span>
                          </div>
                          <div
                            className={`p-3.5 rounded-2xl border ${
                              activeThemeStyle.isLight
                                ? 'bg-white border-slate-200'
                                : 'bg-slate-900 border-slate-800'
                            }`}
                          >
                            <div
                              className={`font-black text-sm mb-1 ${
                                activeThemeStyle.isLight ? 'text-slate-900' : 'text-slate-100'
                              }`}
                            >
                              {THEME_CONFIGS[mainConfigTheme.theme]?.name || '모던 슬레이트 테마'}
                            </div>
                            <p
                              className={`text-xs leading-relaxed ${
                                activeThemeStyle.isLight ? 'text-slate-600' : 'text-slate-400'
                              }`}
                            >
                              {THEME_CONFIGS[mainConfigTheme.theme]?.description || '교사 메인 화면과 100% 동일한 배경과 테마가 자동 적용됩니다.'}
                            </p>
                          </div>
                          <div className="text-xs text-emerald-600 flex items-center gap-1.5 font-semibold">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>교사 화면의 테마 변경이 보조화면에도 실시간으로 자동 동기화됩니다.</span>
                          </div>
                        </div>
                      )}

                      {/* 2. 추천 설정 모드 (첨부 4 참고: 9대 프리셋 테마 3열 그리드 배치) */}
                      {themeSettings.mode === 'recommended' && (
                        <div className="space-y-3 animate-fade-in">
                          <p
                            className={`text-xs font-semibold px-0.5 ${
                              activeThemeStyle.isLight ? 'text-slate-600' : 'text-slate-400'
                            }`}
                          >
                            💡 대시보드와 일치하는 9대 프리셋 테마입니다 (어두운 계열 제외 완료):
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {(Object.keys(RECOMMENDED_DUAL_THEMES) as DualDisplayRecommendedTheme[]).map((key) => {
                              const item = RECOMMENDED_DUAL_THEMES[key];
                              const isSelected = themeSettings.recommendedTheme === key;

                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() =>
                                    handleUpdateThemeSettings({
                                      mode: 'recommended',
                                      recommendedTheme: key,
                                    })
                                  }
                                  className={`p-3 rounded-2xl border-2 transition text-left cursor-pointer flex flex-col justify-between gap-2.5 ${
                                    isSelected
                                      ? 'bg-indigo-50/90 border-indigo-500 text-indigo-950 ring-2 ring-indigo-500/30 shadow-md scale-[1.02]'
                                      : activeThemeStyle.isLight
                                      ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-2xs hover:border-slate-300'
                                      : 'bg-slate-950/70 hover:bg-slate-800/80 border-slate-800 text-slate-300 hover:border-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 w-full">
                                    <div
                                      style={item.bgStyle}
                                      className="w-10 h-10 rounded-xl border border-white/20 shadow-xs flex items-center justify-center text-lg shrink-0"
                                    >
                                      {item.icon}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center justify-between gap-1">
                                        <span
                                          className={`font-black text-xs truncate ${
                                            isSelected && activeThemeStyle.isLight ? 'text-indigo-950' : 'text-slate-900 dark:text-white'
                                          }`}
                                        >
                                          {item.name}
                                        </span>
                                        {isSelected && (
                                          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                                        )}
                                      </div>
                                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold inline-block truncate max-w-full mt-0.5 ${item.badgeBg}`}>
                                        {item.tag}
                                      </span>
                                    </div>
                                  </div>
                                  <p
                                    className={`text-[10px] leading-tight line-clamp-2 ${
                                      activeThemeStyle.isLight ? 'text-slate-500' : 'text-slate-400'
                                    }`}
                                  >
                                    {item.desc}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 3. 개인 커스텀 설정 모드 */}
                      {themeSettings.mode === 'custom' && (
                        <div
                          className={`space-y-3.5 p-4 rounded-2xl border animate-fade-in text-xs ${
                            activeThemeStyle.isLight
                              ? 'bg-slate-50 border-slate-200 text-slate-800'
                              : 'bg-slate-950/70 border-slate-800 text-slate-200'
                          }`}
                        >
                          <div>
                            <span
                              className={`font-bold block mb-2 ${
                                activeThemeStyle.isLight ? 'text-slate-700' : 'text-slate-300'
                              }`}
                            >
                              추천 배경색 퀵 선택:
                            </span>
                            <div className="grid grid-cols-4 gap-2">
                              {QUICK_CUSTOM_COLORS.map((c) => (
                                <button
                                  key={c.hex}
                                  type="button"
                                  onClick={() => handleUpdateThemeSettings({ customBgColor: c.hex })}
                                  className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer transition ${
                                    themeSettings.customBgColor.toLowerCase() === c.hex.toLowerCase()
                                      ? 'border-indigo-500 ring-2 ring-indigo-400/50 scale-95 shadow-sm'
                                      : activeThemeStyle.isLight
                                      ? 'border-slate-200 hover:border-slate-300 bg-white'
                                      : 'border-slate-800 hover:border-slate-600 bg-slate-900'
                                  }`}
                                >
                                  <span
                                    className="w-6 h-6 rounded-full border border-black/10 shadow-xs"
                                    style={{ backgroundColor: c.hex }}
                                  />
                                  <span
                                    className={`text-[11px] font-medium truncate w-full text-center ${
                                      activeThemeStyle.isLight ? 'text-slate-700' : 'text-slate-300'
                                    }`}
                                  >
                                    {c.name}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div
                            className={`flex items-center justify-between gap-2 pt-3 border-t ${
                              activeThemeStyle.isLight ? 'border-slate-200' : 'border-slate-800'
                            }`}
                          >
                            <span
                              className={`font-bold ${
                                activeThemeStyle.isLight ? 'text-slate-700' : 'text-slate-300'
                              }`}
                            >
                              색상 직접 지정:
                            </span>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={themeSettings.customBgColor || '#f8fafc'}
                                onChange={(e) => handleUpdateThemeSettings({ customBgColor: e.target.value })}
                                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                              />
                              <input
                                type="text"
                                value={themeSettings.customBgColor || '#f8fafc'}
                                onChange={(e) => handleUpdateThemeSettings({ customBgColor: e.target.value })}
                                className={`w-24 px-2 py-1.5 rounded-lg border text-xs font-mono text-center font-bold ${
                                  activeThemeStyle.isLight
                                    ? 'bg-white border-slate-200 text-slate-800'
                                    : 'bg-slate-900 border-slate-700 text-amber-300'
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                    {/* 모달 하단 푸터 (타이머 숫자와 겹침 없이 완전히 독립된 저장 버튼) */}
                    <div
                      className={`mt-4 pt-3.5 border-t flex items-center justify-between shrink-0 ${
                        activeThemeStyle.isLight ? 'border-slate-200' : 'border-slate-800'
                      }`}
                    >
                      <span
                        className={`text-xs font-medium flex items-center gap-1 ${
                          activeThemeStyle.isLight ? 'text-slate-500' : 'text-slate-400'
                        }`}
                      >
                        <span>✨ 설정 내용은 브라우저에 실시간 자동 저장됩니다</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsThemeModalOpen(false)}
                        className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition cursor-pointer shadow-md hover:shadow-lg active:scale-95 flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" strokeWidth={2.5} />
                        <span>설정 완료 및 닫기</span>
                      </button>
                    </div>
                  </div>
                </div>,
                document.body
              )}
          </div>

          {/* 🖥️ [요청 1] 개별 창으로 분리/열기 버튼 (별도 보조창으로 즉시 팝업 분리) */}
          {!standalone && (
            <button
              type="button"
              onClick={() => {
                if (onOpenDetached) {
                  onOpenDetached(syncState.activeTab);
                } else {
                  const targetTab = syncState.activeTab || 'timer';
                  const url = `${window.location.origin}${window.location.pathname}?mode=display&tab=${targetTab}`;
                  window.open(url, '_blank', 'width=1280,height=800,menubar=no,toolbar=no,location=no,status=no,resizable=yes');
                  if (onClose) onClose();
                }
              }}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95"
              title="이 송출 화면을 별도 독립 창으로 분리하여 보조 모니터로 이동시킵니다"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>🖥️ 개별 보조창으로 열기</span>
            </button>
          )}

          {/* ⏱ 자동 전환 · 👆 터치 모드 · 🙈 잠깐 가리기 */}
          <div className={`dm-quick inline-flex items-center gap-1 p-1 rounded-2xl border ${activeThemeStyle.isLight ? 'bg-white/70 border-slate-200' : 'bg-slate-900/70 border-slate-700'}`}>
            <button
              type="button"
              onClick={() => setAutoSwitch(!prefs.auto)}
              className={`dm-qbtn ${prefs.auto ? 'is-on' : ''}`}
              title={getBellSchedule().length ? `시정표 · 시간표에 맞춰 저절로 바뀌어요: 수업 전 아침 화면 → 수업 중 판서 모드 → 쉬는 시간 → 마지막 수업 뒤 청소·종례${prefs.auto ? ` (지금: ${phaseNow().label || '쉬는 날 · 밤 — 그대로'})` : ''}` : '환경설정에 시정표(교시별 시각)를 넣으면 쓸 수 있어요'}
              data-dm-auto
            >
              <Clock className="w-3.5 h-3.5" />
              <span>자동 {prefs.auto ? 'ON' : 'OFF'}</span>
            </button>
            <button type="button" onClick={() => setTouchMode(!prefs.touch)} className={`dm-qbtn ${prefs.touch ? 'is-on' : ''}`} title="전자칠판 터치 모드: 버튼과 글자를 크게" data-dm-touch>
              <Hand className="w-3.5 h-3.5" />
              <span>터치</span>
            </button>
            <button type="button" onClick={() => updateState({ isBlanked: true })} className="dm-qbtn is-blank" title="잠깐 가리기 (B 키)" data-dm-blank>
              <EyeOff className="w-3.5 h-3.5" />
              <span>가리기</span>
            </button>
          </div>

          {/* 🖥️ 상단 메뉴바 접기 버튼 (모든 모드 화면 영역 극대화) */}
          <button
            type="button"
            onClick={() => setIsHeaderHidden(true)}
            className="px-2.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-500 hover:text-white border border-indigo-300 dark:border-indigo-800 shadow-2xs active:scale-95 shrink-0"
            title="상단 바 접기 (화면을 가득 확장)"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span>상단 바 접기</span>
          </button>

          {/* 🔲 전체화면 토글 버튼 */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`p-2 rounded-xl font-bold transition cursor-pointer ${
              activeThemeStyle.isLight
                ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title="전체화면 전환"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* ✕ [요청 3] 세팅 완료 후 창 닫기 버튼 (우측 상단에 눈에 띄게 배치) */}
          {onClose && !standalone && (
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white border border-rose-300 dark:border-rose-900/50 shadow-xs active:scale-95 shrink-0"
              title="보조 모니터 설정 닫기"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>닫기</span>
            </button>
          )}
        </div>
      </header>
      )}

      {/* 🖥️ 상단 메뉴바가 접혔을 때 화면 우측 상단 플로팅 복원 버튼 (모든 모드 지원) */}
      {isHeaderHidden && (
        <button
          type="button"
          onClick={() => setIsHeaderHidden(false)}
          className="fixed top-3 right-4 z-50 px-3 py-1.5 rounded-full bg-slate-900/85 hover:bg-slate-900 text-white backdrop-blur-md border border-white/20 shadow-2xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer hover:scale-105 active:scale-95 animate-fade-in"
          title="상단 네비게이션 메뉴 펼치기"
        >
          <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
          <span>메뉴 열기</span>
        </button>
      )}

      {/* Main Screen Content Body (상단 바가 접혔을 때 여백을 더 시원하게 활용) */}
      <main
        className={`flex-1 flex flex-col justify-center items-center ${
          syncState.activeTab === 'drawing'
            ? 'p-0 sm:p-1 overflow-hidden'
            : isHeaderHidden
            ? 'p-1.5 sm:p-2 overflow-y-auto'
            : 'p-2 sm:p-3 overflow-y-auto'
        } bg-transparent relative`}
      >
        {/* ========================================================== */}
        {/* TAB: SMART PICKER SHOW (발표자 뽑기 풀스크린 뷰) */}
        {/* ========================================================== */}
        {syncState.activeTab === 'bracket' && (
          <GameBracket students={effectiveStudents} teams={effectiveTeams} isLight={activeThemeStyle.isLight} />
        )}
        {syncState.activeTab === 'qr' && <QrDisplay isLight={activeThemeStyle.isLight} />}
        {syncState.activeTab === 'homework' && <HomeworkBoard students={effectiveStudents as any} isLight={activeThemeStyle.isLight} />}
        {/* 🔔 청소·종례: 하교 전 안 낸 과제 알림 */}
        <HomeworkDismissalAlert students={effectiveStudents as any} active={syncState.activeTab === 'clean'} />
        {syncState.activeTab === 'score' && <ScoreBoard teams={effectiveTeams} isLight={activeThemeStyle.isLight} onToBracket={() => updateState({ activeTab: 'bracket' })} />}
        {syncState.activeTab === 'picker' && (() => {
          const boys = effectiveStudents.filter((x: Student) => x.gender === 'M').length;
          const girls = effectiveStudents.filter((x: Student) => x.gender === 'F').length;
          const teamCount = effectiveTeams.filter((t: Team) => effectiveStudents.some((x: Student) => x.teamId === t.id)).length;
          const modes = [
            { k: 'all' as const, label: '🎲 전체', n: effectiveStudents.length },
            { k: 'boys' as const, label: '👦 남학생만', n: boys },
            { k: 'girls' as const, label: '👧 여학생만', n: girls },
            { k: 'team' as const, label: '👥 모둠 뽑기', n: teamCount },
          ];
          const isTeam = pickerMode === 'team';
          const winnerShown = isTeam ? !!pickedTeam : !!pickedStudent;
          const spinText = isTeam ? candidateTeam?.name : currentCandidate ? `${currentCandidate.number}번 ${currentCandidate.name}` : '';
          const teamMembers = pickedTeam ? effectiveStudents.filter((x: Student) => x.teamId === pickedTeam.id) : [];
          const poolEmpty = isTeam ? teamCount === 0 : pickerPoolBase().length === 0;
          return (
            <AutoFitStage base={1000} data-testid="fit-picker"><div className="dm-picker w-full flex flex-col items-stretch gap-4 animate-fade-in px-2 sm:px-4">
              {/* 위: 뽑기 방식 */}
              <div className="dm-card flex items-center justify-between flex-wrap gap-3 p-3 sm:p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {modes.map((m) => (
                    <button
                      key={m.k}
                      type="button"
                      disabled={isPickerSpinning || m.n === 0}
                      onClick={() => changePickerMode(m.k)}
                      className={`dm-chip ${pickerMode === m.k ? 'is-on' : ''} ${m.k === 'boys' ? 'tone-blue' : m.k === 'girls' ? 'tone-pink' : m.k === 'team' ? 'tone-green' : 'tone-violet'}`}
                    >
                      <span>{m.label}</span>
                      <b>{m.n}{m.k === 'team' ? '모둠' : '명'}</b>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-dm-pick-sound
                    className="dm-chip tone-amber"
                    onClick={(e) => {
                      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setPickSoundOpen((v) => (v ? false : { x: Math.max(8, r.right - 480), y: r.bottom + 8 }));
                    }}
                  >
                    <span>🔊 효과음</span>
                  </button>
                  {pickSoundOpen && createPortal(<div className="fixed inset-0 z-[8999]" onClick={() => setPickSoundOpen(false)} />, document.body)}
                  {pickSoundOpen &&
                    createPortal(
                      <div className="dm-att-sndpop" style={{ left: pickSoundOpen.x, top: pickSoundOpen.y, width: 480 }} data-dm-pick-sound-pop>
                        <div className="dm-att-sndpop-title">🥁 뽑는 동안</div>
                        <div className="dm-talert-chips">
                          {PICK_SPIN_SOUNDS.map((snd) => (
                            <button
                              key={snd.id}
                              type="button"
                              className={`dm-tchip ${timerAlert.pickSpin === snd.id ? 'is-on' : ''}`}
                              data-dm-pick-spin={snd.id}
                              onClick={() => {
                                setTimerAlertPart({ pickSpin: snd.id });
                                let i = 0;
                                const iv = window.setInterval(() => {
                                  playPickTick(snd.id, i / 16, timerAlert.volume);
                                  if (++i > 16) clearInterval(iv);
                                }, 70);
                              }}
                            >
                              {snd.emoji} {snd.label}
                            </button>
                          ))}
                        </div>
                        <div className="dm-att-sndpop-title mt-3">🎉 뽑힌 뒤</div>
                        <div className="dm-talert-chips">
                          {TIMER_SOUNDS.map((snd) => (
                            <button
                              key={snd.id}
                              type="button"
                              className={`dm-tchip ${timerAlert.pickEnd === snd.id ? 'is-on' : ''}`}
                              data-dm-pick-end={snd.id}
                              onClick={() => {
                                setTimerAlertPart({ pickEnd: snd.id });
                                playTimerSound(snd.id, timerAlert.volume);
                              }}
                            >
                              {snd.emoji} {snd.label}
                            </button>
                          ))}
                        </div>
                        <div className="dm-att-sndpop-note">누르면 바로 들어볼 수 있어요 · 소리 크기는 타이머 🔔 알림 설정과 같이 써요 ({Math.round(timerAlert.volume * 100)}%)</div>
                      </div>,
                      document.body
                    )}
                  <button
                    type="button"
                    onClick={() => setExcludePickerHistory((prev) => !prev)}
                    className={`dm-chip ${excludePickerHistory ? 'is-on tone-amber' : 'tone-amber'}`}
                    title="이번 주에 뽑힌 친구는 모두 한 번씩 뽑힐 때까지 빼고 뽑아요 (주가 바뀌면 새로 시작)"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>🤝 공정 모드 {excludePickerHistory ? 'ON' : 'OFF'}</span>
                  </button>
                  {(pickerHistory.length > 0 || teamPickHistory.length > 0 || Object.keys(weekPicks).length > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setPickerHistory([]);
                        setTeamPickHistory([]);
                        saveWeekPicks({});
                      }}
                      className="dm-chip tone-slate"
                      title="뽑기 기록 지우기"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>기록 리셋</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 🎛 뽑기 방법 */}
              <div className="pk-methods" data-pk-methods>
                {PICK_METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`pk-method ${pickMethod === m.id ? 'is-on' : ''}`}
                    disabled={isPickerSpinning}
                    onClick={() => setPickMethod(m.id)}
                    title={m.tip}
                    data-pk-method-btn={m.id}
                  >
                    <i>{m.emoji}</i>
                    {m.label}
                  </button>
                ))}
              </div>

              {pickMethod === 'gacha' ? (
                <GachaPick
                  items={
                    isTeam
                      ? effectiveTeams
                          .filter((t: Team) => effectiveStudents.some((x: Student) => x.teamId === t.id))
                          .map((t: Team) => ({ id: t.id, num: t.id, label: t.name }))
                      : pickerPoolBase()
                          .slice()
                          .sort((a: Student, b: Student) => a.number - b.number)
                          .map((x: Student) => ({ id: x.id, num: x.number, label: x.name, teamId: x.teamId }))
                  }
                  isFresh={(id) => (!excludePickerHistory ? true : isTeam ? !teamPickHistory.includes(id) : !weekPicks[String(id)])}
                  isTeam={isTeam}
                  tint={mochiTint}
                  busy={isPickerSpinning}
                  setBusy={setIsPickerSpinning}
                  sfx={(ev, pr) => {
                    const a = getTimerAlert();
                    if (ev === 'win' ? a.pickEnd === 'mute' : a.pickSpin === 'mute') return;
                    playPickSfx('gacha', ev, pr, a.volume);
                  }}
                  onDone={commitMethodPick}
                  startRef={pickStartRef}
                />
              ) : pickMethod !== 'basic' ? (
                <PickerModes
                  method={pickMethod}
                  items={
                    isTeam
                      ? effectiveTeams
                          .filter((t: Team) => effectiveStudents.some((x: Student) => x.teamId === t.id))
                          .map((t: Team) => ({ id: t.id, num: t.id, label: t.name }))
                      : pickerPoolBase()
                          .slice()
                          .sort((a: Student, b: Student) => a.number - b.number)
                          .map((x: Student) => ({ id: x.id, num: x.number, label: x.name, teamId: x.teamId }))
                  }
                  isFresh={(id) => (!excludePickerHistory ? true : isTeam ? !teamPickHistory.includes(id) : !weekPicks[String(id)])}
                  todayIds={isTeam ? todayPick.teams : todayPick.ids}
                  teams={effectiveTeams.map((t: Team) => ({ id: t.id, name: t.name }))}
                  isTeam={isTeam}
                  tint={mochiTint}
                  busy={isPickerSpinning}
                  setBusy={setIsPickerSpinning}
                  sfx={(ev, pr) => {
                    const a = getTimerAlert();
                    if (ev === 'win' ? a.pickEnd === 'mute' : a.pickSpin === 'mute') return;
                    playPickSfx(pickMethod, ev, pr, a.volume);
                  }}
                  onDone={commitMethodPick}
                  startRef={pickStartRef}
                />
              ) : (<>
              {/* 가운데: 무대 */}
              <div className={`dm-stage ${isPickerSpinning ? 'is-spin' : winnerShown ? 'is-win' : 'is-idle'}`}>
                <div className="pk-bg" aria-hidden>
                  <i className="b1" />
                  <i className="b2" />
                  <i className="b3" />
                </div>
                <div className="dm-stage-lumi" aria-hidden>
                  <MochiBody
                    face={isPickerSpinning ? 'excited' : winnerShown ? 'happy' : 'normal'}
                    tint={mochiTint}
                    eye={isPickerSpinning ? { x: 0, y: -3 } : undefined}
                    glow="low"
                    className="w-full h-full"
                  />
                  {winnerShown && <span className="dm-crown">👑</span>}
                  {isPickerSpinning && <span className="dm-drum">🥁</span>}
                </div>
                <div className="dm-stage-text">
                  {isPickerSpinning ? (
                    <>
                      <div className="dm-stage-tag">두근두근 뽑는 중…</div>
                      <div className="dm-reel">{spinText || '…'}</div>
                    </>
                  ) : winnerShown ? (
                    isTeam && pickedTeam ? (
                      <>
                        <div className="dm-stage-tag is-gold">🎉 뽑힌 모둠!</div>
                        <div className="dm-winner">{pickedTeam.name}</div>
                        <div className="flex flex-wrap justify-center gap-2 mt-3">
                          {teamMembers.map((m: Student, i: number) => (
                            <span key={m.id} className="dm-member" style={{ animationDelay: `${0.25 + i * 0.08}s` }}>
                              {m.number}번 {m.name}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : pickedStudent ? (
                      <>
                        <div className="dm-stage-tag is-gold">👑 오늘의 발표 주인공!</div>
                        <div className="dm-winner">
                          <span className="dm-winner-num">{pickedStudent.number}번</span> {pickedStudent.name}
                        </div>
                        <p className="dm-stage-sub">친구들의 큰 박수로 맞이해 주세요! 👏</p>
                      </>
                    ) : null
                  ) : (
                    <>
                      <div className="dm-stage-tag">{modes.find((m) => m.k === pickerMode)?.label}</div>
                      <div className="dm-idle-title">{isTeam ? '어느 모둠이 뽑힐까요?' : '누가 발표할까요?'}</div>
                      <p className="dm-stage-sub">스페이스바(Space)나 아래 버튼을 눌러 뽑아요</p>
                    </>
                  )}
                </div>
              </div>

              {/* 큰 뽑기 버튼 */}
              <button type="button" onClick={handleStartRoulette} disabled={isPickerSpinning || poolEmpty} className="dm-big-btn">
                <Sparkles className="w-6 h-6" />
                <span>{isPickerSpinning ? '뽑는 중…' : winnerShown ? '🎲 한 번 더 뽑기 (Space)' : isTeam ? '🎲 모둠 뽑기 (Space)' : '🎲 발표자 뽑기 (Space)'}</span>
              </button>
              </>)}

              {/* 🤝 이번 주 공정 뽑기 현황 */}
              {!isTeam && (() => {
                const base = pickerPoolBase();
                const picked = base.filter((s: Student) => weekPicks[String(s.id)]);
                if (!base.length) return null;
                const pct = Math.round((picked.length / base.length) * 100);
                return (
                  <div className="dm-card dm-fair p-3 text-xs" data-dm-fair>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-black text-slate-600">🤝 이번 주 뽑힌 친구 {picked.length} / {base.length}명</span>
                      <span className="font-bold text-slate-400">{excludePickerHistory ? `남은 친구 ${base.length - picked.length}명 중에서 뽑아요` : '공정 모드가 꺼져 있어요'}</span>
                    </div>
                    <div className="dm-fair-bar"><span style={{ width: `${pct}%` }} /></div>
                    {picked.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {picked
                          .sort((a: Student, b: Student) => a.number - b.number)
                          .map((s: Student) => (
                            <span key={s.id} className="dm-fair-chip">
                              {s.number} {s.name}
                              {weekPicks[String(s.id)] > 1 && <b>×{weekPicks[String(s.id)]}</b>}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 최근 기록 */}
              {!isTeam && pickerHistory.length > 0 && (
                <div className="dm-card flex items-center justify-between flex-wrap gap-2 p-3 text-xs">
                  <span className="font-black text-slate-500 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-violet-500" /> 최근 뽑힌 친구
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {pickerHistory.map((pick, idx) => (
                      <span key={`${pick.id}-${idx}`} className={`dm-member ${idx === 0 ? 'is-latest' : ''}`} style={{ animation: 'none' }}>
                        {pick.number}번 {pick.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {isTeam && teamPickHistory.length > 0 && (
                <div className="dm-card flex items-center justify-between flex-wrap gap-2 p-3 text-xs">
                  <span className="font-black text-slate-500 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-emerald-500" /> 뽑힌 모둠 순서
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {teamPickHistory.map((id, idx) => (
                      <span key={id} className={`dm-member ${idx === 0 ? 'is-latest' : ''}`} style={{ animation: 'none' }}>
                        {effectiveTeams.find((t: Team) => t.id === id)?.name || `${id}모둠`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div></AutoFitStage>
          );
        })()}

        {/* ========================================================== */}
        {/* TAB 0: ATTENDANCE TOUCH (전자칠판 자율 등교 터치 & 아침활동 안내) */}
        {/* ========================================================== */}
        {syncState.activeTab === 'attendance' && (() => {
          const presentStudents = effectiveStudents.filter((s) => s.attendance === 'present');
          const absentStudents = effectiveStudents.filter((s) => s.attendance !== 'present');
          const presentCount = presentStudents.length;
          const totalCount = effectiveStudents.length;
          const rate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

          // 🪑 분단 및 시점 데이터 계산 (학생 시점 vs 교사 시점)
          // 1) 기본 학생 시점(student) 기준 분단 데이터 생성: 1분단 -> N분단, 각 분단은 앞자리 -> 뒷자리
          // 분단별 인원 수(저장값) 기준 분단 구성 (학생을 분단에 '넣기' 지원)
          const baseCols: { colNumber: number; students: typeof effectiveStudents }[] = buildColumns(
            effectiveStudents,
            individualColumns
          ).map((students, i) => ({ colNumber: i + 1, students }));

          // 2) 시점에 따른 분단 배치 및 내부 좌석 정렬:
          // - 학생 시점(student): 칠판이 화면 상단(앞). 화면 왼쪽부터 1분단 -> N분단, 각 분단 위쪽이 앞자리 -> 아래쪽이 뒷자리
          // - 교사 시점(teacher): 칠판이 화면 하단(교탁 앞). 화면 왼쪽부터 N분단 -> 1분단 (좌우 반전!), 각 분단 위쪽이 뒷자리 -> 아래쪽이 앞자리
          const individualColsData = seatingPerspective === 'student'
            ? baseCols.map((c) => ({ colNumber: c.colNumber, students: [...c.students] }))
            : [...baseCols].reverse().map((c) => ({ colNumber: c.colNumber, students: [...c.students].reverse() }));

          // 👥 모둠좌석 시점 반전 (학생 시점: 1모둠->N모둠, 교사 시점: N모둠->1모둠 역순 반전)
          const displayTeams = seatingPerspective === 'student' ? effectiveTeams : [...effectiveTeams].reverse();

          // 폰트 크기 클래스 맵핑
          const fontClassMap = {
            sm: 'text-xs sm:text-sm leading-relaxed',
            md: 'text-sm sm:text-base font-semibold leading-relaxed',
            lg: 'text-base sm:text-lg font-bold leading-relaxed',
            xl: 'text-lg sm:text-xl font-black leading-relaxed',
          };

          // 텍스트 색상 클래스 맵핑
          const textClassMap: Record<string, string> = {
            amber: 'text-amber-300 drop-shadow-sm',
            emerald: 'text-emerald-300 drop-shadow-sm',
            sky: 'text-sky-300 drop-shadow-sm',
            rose: 'text-rose-300 drop-shadow-sm',
            white: 'text-white drop-shadow-sm',
          };

          // 카드 테마 클래스 맵핑
          const cardThemeMap: Record<string, string> = {
            board: 'bg-emerald-950/80 border-emerald-600/60 shadow-lg text-emerald-100',
            dark: 'bg-slate-900/90 border-slate-700/70 shadow-lg text-white',
            warm: 'bg-amber-950/70 border-amber-600/60 shadow-lg text-amber-100',
            sky: 'bg-sky-950/75 border-sky-600/60 shadow-lg text-sky-100',
          };

          return (
            <AutoFitStage base={1200} max={1} maxStretch={3} data-testid="fit-attendance"><div className="w-full max-w-[2400px] mx-auto flex flex-col space-y-3 sm:space-y-4 animate-fade-in flex-1 min-h-0 dm-wide-tab">
              {/* 🎒 실시간 등교 환영 토스트 플로팅 알림 */}
              {attendanceToastMessage && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 border border-white/20 animate-bounce text-sm sm:text-base font-black">
                  <span>✨</span>
                  <span>{attendanceToastMessage}</span>
                </div>
              )}

              {/* 1. 상단 컨트롤 & 출결 현황 헤더 바 */}
              <div
                className={`flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl border shadow-sm transition-colors shrink-0 ${
                  activeThemeStyle.isLight
                    ? 'bg-white/95 backdrop-blur-sm border-slate-200/90 text-slate-800 shadow-sm'
                    : 'bg-slate-900/90 border-slate-800 text-white shadow-md'
                }`}
              >
                {/* 타이틀 및 출석 현황 통계 배지 */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
                    <Smile className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2
                        className={`text-base sm:text-lg font-black flex items-center gap-2 ${
                          activeThemeStyle.isLight ? 'text-slate-900' : 'text-white'
                        }`}
                      >
                        🎒 등교 출결 등록 (스스로 터치)
                      </h2>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        전자칠판 터치 모드
                      </span>
                    </div>
                    {/* 통계 배지 칩 */}
                    <div className="flex items-center gap-1.5 mt-1 text-xs font-bold">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-white shadow-2xs">
                        출석 {presentCount}명
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/80 text-white">
                        미등교 {totalCount - presentCount}명
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded-md ${
                          activeThemeStyle.isLight ? 'text-slate-600' : 'text-slate-400'
                        }`}
                      >
                        (총 {totalCount}명 · {rate}%)
                      </span>
                      <button
                        type="button"
                        data-dm-all-present
                        onClick={() => markAllAttendance(presentCount === totalCount ? 'absent' : 'present')}
                        className={`dm-att-all ${presentCount === totalCount ? 'is-undo' : ''}`}
                        title={presentCount === totalCount ? '모두 미등교로 되돌려요' : '아직 안 누른 친구까지 한 번에 출석으로 바꿔요'}
                      >
                        {presentCount === totalCount ? '↩️ 모두 되돌리기' : '✅ 전원 출석'}
                      </button>
                      <div className="relative">
                        <button
                          type="button"
                          data-dm-touch-sound
                          className="dm-att-snd"
                          onClick={(e) => {
                            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setTouchSoundOpen((v) => (v ? false : { x: r.left, y: r.bottom + 8 }));
                          }}
                        >
                          🔊 효과음
                        </button>
                        {touchSoundOpen && createPortal(<div className="fixed inset-0 z-[8999]" onClick={() => setTouchSoundOpen(false)} />, document.body)}
                        {touchSoundOpen && createPortal(
                          <div className="dm-att-sndpop" data-dm-touch-sound-pop style={{ left: touchSoundOpen.x, top: touchSoundOpen.y }}>
                            <div className="dm-att-sndpop-title">등교 터치할 때 나는 소리</div>
                            <div className="dm-talert-chips">
                              {[{ id: 'chime', label: '기본 딩동', emoji: '🔔' }, ...TIMER_SOUNDS].map((snd) => (
                                <button
                                  key={snd.id}
                                  type="button"
                                  className={`dm-tchip ${timerAlert.touchSound === snd.id ? 'is-on' : ''}`}
                                  data-dm-touch-sound-opt={snd.id}
                                  onClick={() => {
                                    setTimerAlertPart({ touchSound: snd.id as any });
                                    playTouchSound(snd.id as any);
                                  }}
                                >
                                  {snd.emoji} {snd.label}
                                </button>
                              ))}
                            </div>
                            <div className="dm-att-sndpop-note">소리 크기는 타이머 🔔 알림 설정과 같이 써요 ({Math.round(timerAlert.volume * 100)}%)</div>
                          </div>,
                          document.body
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 네 번째 첨부 이미지 스타일: 좌석 모드 상단 기능 동일 적용 (이름 크기, 개인/모둠, 2열/3열, 시점 전환) */}
                <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap ml-auto">
                  {/* 📏 1. 이름 크기 조절 버튼 */}
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold ${
                      activeThemeStyle.isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <span className={activeThemeStyle.isLight ? 'text-slate-600' : 'text-slate-400'}>이름 크기:</span>
                    <div className="inline-flex gap-0.5">
                      {[
                        { key: 'sm', label: '보통' },
                        { key: 'md', label: '크게' },
                        { key: 'lg', label: '특대' },
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setSeatingNameScale(item.key as any);
                            writeSeatingSetting('class_seating_name_scale', item.key);
                          }}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-black transition cursor-pointer ${
                            seatingNameScale === item.key
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : activeThemeStyle.isLight
                              ? 'text-slate-600 hover:text-slate-900'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 🪑 2. 모드 선택: [개인좌석] vs [모둠좌석] */}
                  <div
                    className={`flex items-center p-1 rounded-xl border ${
                      activeThemeStyle.isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSeatingType('individual');
                        try { writeSeatingSetting('class_seating_view_type', 'individual'); } catch {}
                      }}
                      className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                        seatingType === 'individual'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : activeThemeStyle.isLight
                          ? 'text-slate-600 hover:text-slate-900'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>🪑 개인좌석 (1열 형태)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSeatingType('team');
                        try { writeSeatingSetting('class_seating_view_type', 'team'); } catch {}
                      }}
                      className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                        seatingType === 'team'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : activeThemeStyle.isLight
                          ? 'text-slate-600 hover:text-slate-900'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>👥 모둠좌석</span>
                    </button>
                  </div>

                  {/* 3. 모드별 세부 열 수 조절 */}
                  {seatingType === 'individual' ? (
                    /* 개인좌석일 때: 배열 열 수 조절 (2~6열) */
                    <div
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-bold ${
                        activeThemeStyle.isLight
                          ? 'bg-slate-100/90 border-slate-200 text-slate-700'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="text-[11px] text-indigo-500 font-bold mr-1">배열:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.max(2, individualColumns - 1);
                          setIndividualColumns(next);
                          try { writeSeatingSetting('class_seating_individual_columns', String(next)); } catch {}
                          resetColumnSizes();
                        }}
                        disabled={individualColumns <= 2}
                        className={`w-5 h-5 rounded flex items-center justify-center font-black cursor-pointer disabled:opacity-30 ${
                          activeThemeStyle.isLight
                            ? 'bg-white hover:bg-slate-200 text-slate-700 shadow-2xs border border-slate-200'
                            : 'bg-slate-800 hover:bg-slate-700 text-white'
                        }`}
                        title="열 줄이기"
                      >
                        -
                      </button>
                      <span className="px-1 font-black font-mono text-indigo-500">
                        {individualColumns}열
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.min(6, individualColumns + 1);
                          setIndividualColumns(next);
                          try { writeSeatingSetting('class_seating_individual_columns', String(next)); } catch {}
                          resetColumnSizes();
                        }}
                        disabled={individualColumns >= 6}
                        className={`w-5 h-5 rounded flex items-center justify-center font-black cursor-pointer disabled:opacity-30 ${
                          activeThemeStyle.isLight
                            ? 'bg-white hover:bg-slate-200 text-slate-700 shadow-2xs border border-slate-200'
                            : 'bg-slate-800 hover:bg-slate-700 text-white'
                        }`}
                        title="열 늘리기"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    /* 모둠좌석일 때: 2열 모둠 vs 3열 모둠 버튼 */
                    <div
                      className={`flex items-center p-1 rounded-xl border ${
                        activeThemeStyle.isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSeatingColumns(2);
                          try { writeSeatingSetting('class_seating_team_columns', '2'); } catch {}
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          seatingColumns === 2
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : activeThemeStyle.isLight
                            ? 'text-slate-600 hover:text-slate-900'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        2열 모둠
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSeatingColumns(3);
                          try { writeSeatingSetting('class_seating_team_columns', '3'); } catch {}
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          seatingColumns === 3
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : activeThemeStyle.isLight
                            ? 'text-slate-600 hover:text-slate-900'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        3열 모둠
                      </button>
                    </div>
                  )}

                  {/* 🪑 책상 배치 편집 (모둠좌석): 자유 이동 → 정렬 */}
                  {seatingType === 'team' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDeskEditing((v) => !v)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 border cursor-pointer active:scale-95 ${
                          deskEditing
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : activeThemeStyle.isLight
                            ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-2xs'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                        }`}
                        title="모둠 안 책상을 끌어 원하는 위치에 놓습니다 (학급마다 다른 책상 배치)"
                      >
                        <span>🪑</span>
                        <span>{deskEditing ? '배치 완료' : '책상 배치'}</span>
                      </button>
                      {deskEditing && (
                        <>
                          <button
                            type="button"
                            onClick={handleAlignDesks}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 border cursor-pointer active:scale-95 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                            title="자유롭게 놓은 책상을 일정한 간격으로 맞춥니다"
                          >
                            <span>📐</span>
                            <span>정렬</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => resetDeskLayout()}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 border cursor-pointer active:scale-95 ${
                              activeThemeStyle.isLight
                                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                            }`}
                            title="모든 모둠 책상을 기본 배치(홀수 인원은 1·2·2)로 되돌립니다"
                          >
                            <span>↺</span>
                            <span>기본 배치</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* 🔄 4. 시점 전환 */}
                  {perspectiveToggle()}

                  {/* 5. 칠판 방면 안내 배지 (네 번째 첨부 이미지 디자인) */}
                  <div className="px-3 py-1 rounded-xl bg-indigo-600 text-white font-extrabold shadow-sm flex items-center gap-1.5 text-xs">
                    <span className="w-2 h-2 rounded-full bg-cyan-300 animate-ping" />
                    <span>
                      {seatingPerspective === 'student'
                        ? '[ 칠판 & 전자 교탁 방면 (앞) ]'
                        : '[ 교실 뒤편 (사물함 & 뒷문) ]'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. 헤더 아래: 오늘의 아침활동 안내 (왼쪽) + 시계 · 루미 알림 (오른쪽) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 shrink-0 lg:h-[24vh] lg:grid-rows-[minmax(0,1fr)] [&>*]:min-h-0 [&>*]:overflow-y-auto">
                {/* 📋 [왼쪽 8열]: 오늘의 아침활동 안내 사항 (폰트/색상/배경 커스텀 설정 지원) */}
                <div
                  className={`lg:col-span-8 rounded-3xl border transition-all duration-300 flex flex-col justify-between ${
                    seatingType === 'team' ? 'p-2.5 sm:p-3' : 'p-3.5 sm:p-4'
                  } ${cardThemeMap[morningCardTheme] || cardThemeMap.board}`}
                >
                  <div>
                    {/* 헤더 & 설정 토글 버튼 */}
                    <div className="flex items-center justify-between pb-2 border-b border-white/15 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base sm:text-lg">📋</span>
                        <span className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-1.5">
                          오늘의 아침활동 안내
                        </span>
                        <span className="text-[11px] font-medium opacity-75 hidden sm:inline-block">
                          등교 후 학생들에게 전달할 과제와 활동입니다.
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (!isMorningNoticeEditing) {
                            setTempMorningNotice(morningNoticeText);
                          }
                          setIsMorningNoticeEditing(!isMorningNoticeEditing);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-white/20 active:scale-95"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>{isMorningNoticeEditing ? '설정 닫기' : '✏️ 안내/서식 설정'}</span>
                      </button>
                    </div>

                    {/* 🎨 아침활동 편집 및 서식 커스텀 패널 (열렸을 때) */}
                    {isMorningNoticeEditing && (
                      <div className="p-3 mb-3 rounded-2xl bg-black/40 border border-white/15 space-y-3 animate-fade-in">
                        {/* 내용 편집창 */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-300 block mb-1">
                            ✍️ 안내 문구 편집 (줄바꿈 가능)
                          </label>
                          <textarea
                            rows={3}
                            value={tempMorningNotice}
                            onChange={(e) => setTempMorningNotice(e.target.value)}
                            placeholder="등교 후 학생들이 수행할 아침활동 내용을 적어주세요."
                            className="w-full p-2.5 rounded-xl bg-slate-900 text-white border border-white/20 text-xs sm:text-sm focus:outline-hidden focus:border-indigo-400 custom-scroll resize-none"
                          />
                        </div>

                        {/* 서식 커스텀 컨트롤 3종: 폰트 크기, 글씨 색상, 배경 테마 */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                          {/* 1) 폰트 크기 */}
                          <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                            <span className="text-[11px] font-bold text-slate-300 block mb-1">📏 글씨 크기</span>
                            <div className="flex items-center gap-1">
                              {[
                                { key: 'sm', label: '작게' },
                                { key: 'md', label: '보통' },
                                { key: 'lg', label: '크게' },
                                { key: 'xl', label: '특대' },
                              ].map((item) => (
                                <button
                                  key={item.key}
                                  type="button"
                                  onClick={() => {
                                    setMorningFontSize(item.key as any);
                                    try { localStorage.setItem('class_morning_font_size', item.key); } catch {}
                                  }}
                                  className={`flex-1 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                                    morningFontSize === item.key
                                      ? 'bg-indigo-600 text-white shadow-xs'
                                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                                  }`}
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* 2) 글씨 색상 */}
                          <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                            <span className="text-[11px] font-bold text-slate-300 block mb-1">🎨 글씨 색상</span>
                            <div className="flex items-center gap-1.5">
                              {[
                                { key: 'amber', name: '골드', color: 'bg-amber-400' },
                                { key: 'emerald', name: '그린', color: 'bg-emerald-400' },
                                { key: 'sky', name: '블루', color: 'bg-sky-400' },
                                { key: 'rose', name: '핑크', color: 'bg-rose-400' },
                                { key: 'white', name: '화이트', color: 'bg-white' },
                              ].map((c) => (
                                <button
                                  key={c.key}
                                  type="button"
                                  onClick={() => {
                                    setMorningTextColor(c.key);
                                    try { localStorage.setItem('class_morning_text_color', c.key); } catch {}
                                  }}
                                  className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                                    morningTextColor === c.key
                                      ? 'bg-white/30 text-white ring-2 ring-white'
                                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                                  }`}
                                >
                                  <span className={`w-2 h-2 rounded-full ${c.color}`} />
                                  <span>{c.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* 3) 카드 테마 스타일 */}
                          <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                            <span className="text-[11px] font-bold text-slate-300 block mb-1">🖼️ 카드 배경 테마</span>
                            <div className="flex items-center gap-1">
                              {[
                                { key: 'board', label: '칠판' },
                                { key: 'dark', label: '다크' },
                                { key: 'warm', label: '웜' },
                                { key: 'sky', label: '스카이' },
                              ].map((theme) => (
                                <button
                                  key={theme.key}
                                  type="button"
                                  onClick={() => {
                                    setMorningCardTheme(theme.key);
                                    try { localStorage.setItem('class_morning_card_theme', theme.key); } catch {}
                                  }}
                                  className={`flex-1 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                                    morningCardTheme === theme.key
                                      ? 'bg-indigo-600 text-white shadow-xs'
                                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                                  }`}
                                >
                                  {theme.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* 빠른 프리셋 & 저장 버튼 */}
                        <div className="flex items-center justify-between pt-1 border-t border-white/10 gap-2 flex-wrap">
                          <div className="flex items-center gap-1 text-[11px]">
                            <span className="text-slate-400">빠른 입력:</span>
                            <button
                              type="button"
                              onClick={() =>
                                setTempMorningNotice(
                                  '1. 🎒 가방을 서랍에 넣고 겉옷은 옷걸이에 걸기\n2. 📝 알림장 확인하고 오늘 제출할 과제 바구니에 내기\n3. 📖 아침 독서 15분 동안 조용히 책 읽기'
                                )
                              }
                              className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-slate-200 cursor-pointer"
                            >
                              기본 활동
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setTempMorningNotice(
                                  '1. 📚 도서관 반납할 책 책상 위에 꺼내두기\n2. ✏️ 1교시 수학 준비물(수학책, 익힘책, 자) 미리 챙기기\n3. 🤝 1인 1역 아침 당번은 자신의 역할 성실히 수행하기'
                                )
                              }
                              className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-slate-200 cursor-pointer"
                            >
                              역할/준비물
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setMorningNoticeText(tempMorningNotice);
                              try {
                                localStorage.setItem('class_morning_activity_notice', tempMorningNotice);
                              } catch {}
                              setIsMorningNoticeEditing(false);
                            }}
                            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition cursor-pointer active:scale-95"
                          >
                            저장 완료
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 실제 학생 표출 아침활동 본문 */}
                    <div
                      className={`whitespace-pre-wrap ${fontClassMap[morningFontSize] || fontClassMap.md} ${
                        textClassMap[morningTextColor] || textClassMap.amber
                      }`}
                    >
                      {morningNoticeText || '등록된 아침활동 안내 사항이 없습니다. 설정 버튼을 눌러 안내를 입력해주세요.'}
                    </div>
                  </div>
                </div>

                {/* 🕒 [오른쪽 4열]: 가운데 큰 시계 + 1교시 10분 · 5분 · 1분 전을 알려 주는 루미 */}
                {(() => {
                  const d = period1Info.diffSec;
                  const lv = d <= 0 || d > 600 ? (d <= 0 && d > -300 ? 'start' : 'idle') : d <= 60 ? 'm1' : d <= 300 ? 'm5' : 'm10';
                  const threshold = lv === 'm1' ? 60 : lv === 'm5' ? 300 : lv === 'm10' ? 600 : 0;
                  const burst = threshold > 0 && threshold - d < 15; // 알림 시각이 막 된 15초 동안은 크게 움직여요
                  const say: Record<string, string> = {
                    idle: '좋은 아침이에요! 오늘도 반가워요 😊',
                    m10: '1교시 10분 전! 화장실 다녀오고 물 마셔요 💧',
                    m5: '1교시 5분 전! 교과서랑 필통을 꺼내요 📚',
                    m1: '1분 전! 자리에 앉아 바른 자세로 기다려요 🙌',
                    start: '1교시 시작! 함께 힘내요 ✨',
                  };
                  const face = lv === 'm1' ? 'surprised' : lv === 'm5' ? 'excited' : lv === 'm10' ? 'happy' : lv === 'start' ? 'love' : 'happy';
                  return (
                    <div
                      className={`am-clock-card lg:col-span-4 p-3 sm:p-4 rounded-3xl border transition-all duration-300 flex flex-col items-center justify-center gap-1 shadow-md ${
                        activeThemeStyle.isLight
                          ? 'bg-white/95 backdrop-blur-sm border-slate-200 text-slate-800'
                          : 'bg-slate-900/90 backdrop-blur-sm border-slate-800 text-white'
                      }`}
                      data-am-level={lv}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-500 dark:text-indigo-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{currentTime.fullDate || '현재 시각'}</span>
                      </div>
                      <div className={`text-4xl sm:text-6xl ${cuteFontClass} font-black tracking-wider text-slate-800 dark:text-amber-300 drop-shadow-sm flex items-baseline justify-center leading-none`}>
                        <span>{currentTime.hours}:{currentTime.minutes}</span>
                        <span className="text-2xl sm:text-4xl text-indigo-500 dark:text-amber-400/80 ml-1">:{currentTime.seconds}</span>
                      </div>
                      <div className={`am-lumi lv-${lv} ${burst ? 'is-burst' : ''}`} aria-live="polite">
                        <span className="am-lumi-body">
                          <MochiBody face={face as any} tint={mochiTint} glow="low" className="w-full h-full" />
                          {lv === 'm1' && <span className="am-lumi-fx">⏰</span>}
                          {lv === 'm5' && <span className="am-lumi-fx">📚</span>}
                          {lv === 'm10' && <span className="am-lumi-fx">💧</span>}
                          {lv === 'start' && <span className="am-lumi-fx">✨</span>}
                        </span>
                        <span className="am-lumi-say" key={lv}>{say[lv]}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 2. 가운데 영역: 좌석 배치 기반 학생 터치 그리드 (개인좌석 / 모둠좌석) */}
              <div className="flex-1 flex flex-col gap-2 min-h-[54vh]">
                {/* 🟩 상단 위치 인디케이터 (학생 시점: 칠판 앞 / 교사 시점: 교실 뒤편) */}
                {seatingPerspective === 'student' ? (
                  <div className="w-full py-1.5 sm:py-2 px-4 rounded-2xl bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-800 text-white font-black text-center shadow-md flex items-center justify-center gap-2 text-xs sm:text-sm border border-emerald-500/50 shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-pulse" />
                    <span>🟩 [ 전자칠판 &amp; 교탁 (교실 앞) ]</span>
                    <span className="text-[11px] font-normal opacity-85 hidden sm:inline">← 칠판을 바라보는 학생 시점 (왼쪽: {getColName(1)})</span>
                  </div>
                ) : (
                  <div className="w-full py-1.5 sm:py-2 px-4 rounded-2xl bg-gradient-to-r from-slate-700 via-slate-800 to-slate-700 text-slate-200 font-black text-center shadow-md flex items-center justify-center gap-2 text-xs sm:text-sm border border-slate-600/60 shrink-0">
                    <span>🚪 [ 교실 뒤편 (사물함 &amp; 뒷문 방면) ]</span>
                    <span className="text-[11px] font-normal opacity-85 hidden sm:inline">← 교탁에서 학생들을 바라보는 교사 시점 (왼쪽: {getColName(individualColumns)})</span>
                  </div>
                )}

                {/* 실제 스크롤 좌석 그리드 (모둠좌석일 때는 스크롤 없이 전체 모둠 한눈에 자동 최적화) */}
                <div
                  className={`flex-1 pr-1 custom-scroll ${
                    'overflow-y-auto min-h-0'
                  }`}
                >
                  {seatingType === 'individual' ? (
                    /* 🪑 개인좌석 분단별 정렬 (분단명 수정 가능 & 학생 카드 2행 디자인) */
                    <div
                      className="grid gap-2.5 sm:gap-3"
                      style={{
                        gridTemplateColumns: `repeat(${individualColumns}, minmax(0, 1fr))`,
                      }}
                    >
                      {renderIndividualCols('attendance', individualColsData)}
                    </div>
                  ) : (
                    /* 👥 모둠좌석 형태 정렬 (2열/3열 선택 연동 및 스크롤 없는 컴팩트 레이아웃) */
                    <div
                      className={`grid gap-4 ${
                        seatingColumns === 3 ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'
                      }`}
                    >
                      {renderTeamSeatCards('attendance', displayTeams)}
                    </div>
                  )}
                </div>

                {/* 🚪 하단 위치 인디케이터 (학생 시점: 교실 뒤편 / 교사 시점: 칠판 앞) */}
                {seatingPerspective === 'student' ? (
                  <div className="w-full py-1.5 px-4 rounded-xl bg-gradient-to-r from-slate-700 via-slate-800 to-slate-700 text-slate-300 font-bold text-center text-xs border border-slate-600/40 flex items-center justify-center gap-2 shrink-0">
                    <span>🚪 [ 교실 뒤편 (사물함 &amp; 뒷문 방면) ]</span>
                  </div>
                ) : (
                  <div className="w-full py-1.5 px-4 rounded-xl bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-800 text-white font-black text-center shadow-md flex items-center justify-center gap-2 text-xs sm:text-sm border border-emerald-500/50 shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-pulse" />
                    <span>🟩 [ 전자칠판 &amp; 교탁 (교사 교탁 앞) ]</span>
                  </div>
                )}
              </div>

            </div></AutoFitStage>
          );
        })()}

        {/* ========================================================== */}
        {/* TAB 1: DRAWING BOARD (보조 모니터 전자칠판 판서 도구) */}
        {/* ========================================================== */}
        {syncState.activeTab === 'drawing' && (
          <div className="w-full h-full flex flex-col flex-1 min-h-0 self-stretch" style={{ minHeight: 'max(380px, calc(100dvh - 290px))' }} data-dm-drawing-wrap>
            <DualMonitorDrawingCanvas isLight={activeThemeStyle.isLight} />
          </div>
        )}

        {/* ========================================================== */}
        {/* 🌅 아침 화면: 날짜 · 날씨 · 시간표 · 급식 · 생일 · 할 일 */}
        {/* ========================================================== */}
        {syncState.activeTab === 'morning' && (() => {
          const now = new Date();
          const days = ['일', '월', '화', '수', '목', '금', '토'];
          const dayName = days[now.getDay()];
          const read = (k: string) => {
            try {
              return JSON.parse(localStorage.getItem(k) || 'null');
            } catch {
              return null;
            }
          };
          const weather = read('smart_dashboard_realtime_weather');
          const meal = read('class_school_meal_cache_v2');
          const todayYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          // 급식 위젯은 날짜를 'YYYY.MM.DD'로 저장해요 → 형식을 맞춰 비교 (어제 불러온 '다음 급식'이 오늘이면 그것도 사용)
          const normYmd = (d: any) => String(d || '').replace(/[.\/]/g, '-').replace(/\s/g, '').slice(0, 10);
          const mealPick: any = [meal?.today, meal?.next].find((m: any) => m && normYmd(m.date) === todayYmd);
          // ⚠️ 오늘 급식의 알레르기 유발 식품 (번호 → 이름, 어떤 메뉴에 들었는지)
          const ALLERGY_NAMES: Record<number, string> = { 1: '난류', 2: '우유', 3: '메밀', 4: '땅콩', 5: '대두', 6: '밀', 7: '고등어', 8: '게', 9: '새우', 10: '돼지고기', 11: '복숭아', 12: '토마토', 13: '아황산류', 14: '호두', 15: '닭고기', 16: '쇠고기', 17: '오징어', 18: '조개류', 19: '잣' };
          const mealAllergies: { n: number; name: string; dishes: string[] }[] = (() => {
            const items: { name: string; al: number[] }[] = [];
            const fromName = (nm: string) => {
              const m = /\(([\d.\s]+)\)\s*$/.exec(nm);
              return m ? m[1].split(/[.\s]+/).map(Number).filter((x) => x >= 1 && x <= 19) : [];
            };
            if (mealPick?.menuItems?.length) {
              mealPick.menuItems.forEach((m: any) => {
                const nm = typeof m === 'string' ? m : m?.name || '';
                const al = Array.isArray(m?.allergies) && m.allergies.length ? m.allergies : fromName(nm);
                items.push({ name: nm.replace(/\s*\([\d.\s]+\)\s*$/, ''), al });
              });
            } else if (ownMeal && ownMeal.ymd === todayYmd.replace(/-/g, '')) {
              (ownMeal.dishes || []).forEach((nm: string) => items.push({ name: nm.replace(/\s*\([\d.\s]+\)\s*$/, ''), al: fromName(nm) }));
            }
            const map = new Map<number, string[]>();
            items.forEach((it) => it.al.forEach((n) => map.set(n, [...(map.get(n) || []), it.name])));
            return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([n, dishes]) => ({ n, name: ALLERGY_NAMES[n] || String(n), dishes }));
          })();
          const mealDishes: string[] = (() => {
            const pick = mealPick;
            if (pick?.menuItems?.length) return pick.menuItems.map((m: any) => (typeof m === 'string' ? m : m.name)).filter(Boolean);
            if (ownMeal && ownMeal.ymd === todayYmd.replace(/-/g, '')) return ownMeal.dishes;
            return [];
          })();
          const noticeLines = String(morningNoticeText || '')
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean);
          const sched = read('class_dashboard_schedule') || {};
          const periods: { period: number; subject: string }[] = Array.isArray(sched[dayName]) ? sched[dayName].filter((p: any) => p && p.subject) : [];
          const bells = getBellSchedule();
          const bday = findBirthdayKids(effectiveStudents as any, now);
          const present = effectiveStudents.filter((s: any) => s.attendance === 'present').length;
          const dustTone = (g?: string) => (!g ? 'is-good' : /매우/.test(g) ? 'is-worst' : /나쁨/.test(g) ? 'is-bad' : /보통/.test(g) ? 'is-mid' : 'is-good');
          const dustBad = /나쁨/.test(String(weather?.dust || '')) || /나쁨/.test(String(weather?.fineDust || ''));
          const total = effectiveStudents.length;
          const pct = total ? Math.round((present / total) * 100) : 0;
          return (
            <AutoFitStage base={1180} maxStretch={1.45} data-testid="fit-morning"><div className="dm-morning w-full animate-fade-in" data-dm-morning>
              {/* 1행: 날짜 · 시계(초) · 날씨 · 미세먼지 */}
              <div className="dm-morning-hero">
                <div className="dm-morning-lumi">
                  <MochiBody face="happy" tint={mochiTint} glow="low" className="w-full h-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="dm-morning-hello">좋은 아침이에요! ☀️</div>
                  <div className="dm-morning-date">
                    {now.getMonth() + 1}월 {now.getDate()}일 <span>{dayName}요일</span>
                  </div>
                </div>
                <div className={`dm-morning-clock ${cuteFontClass}`} data-dm-morning-clock>
                  {currentTime.hours}:{currentTime.minutes}
                  <small>:{String(currentTime.timeWithSeconds || '').slice(-2)}</small>
                </div>
                {weather && (
                  <div className="dm-morning-weather">
                    <div className="dm-mw-top">
                      <span className="text-4xl">{weather.icon || '🌤️'}</span>
                      <div>
                        <b>{Math.round(weather.temp)}℃</b>
                        <span>{weather.statusText}</span>
                      </div>
                    </div>
                    <div className="dm-mw-dust" data-dm-dust>
                      <span className={`dm-dust ${dustTone(weather.dust)}`}>
                        미세먼지 <b>{weather.dust || '-'}</b>
                      </span>
                      {weather.fineDust && (
                        <span className={`dm-dust ${dustTone(weather.fineDust)}`}>
                          초미세 <b>{weather.fineDust}</b>
                        </span>
                      )}
                    </div>
                    <div className={`dm-mw-tip ${dustBad ? 'is-bad' : ''}`}>{dustBad ? '😷 마스크 쓰고, 바깥 놀이는 줄여요' : '🌿 공기가 맑아요! 창문 열고 환기해요'}</div>
                  </div>
                )}
              </div>

              {/* 2행: 시간표 · 급식 · 아침활동 · (출석 현황 / 과제물) */}
              <div className="dm-morning-grid is-4">
                <div className="dm-mcard tone-sky">
                  <h3>📚 오늘 시간표</h3>
                  {periods.length ? (
                    <ol className="dm-mperiods">
                      {periods.map((p) => (
                        <li key={p.period}>
                          <i>{p.period}교시</i>
                          <b>{p.subject}</b>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="dm-mempty">오늘 시간표가 비어 있어요</p>
                  )}
                </div>
                <div className="dm-mcard tone-amber">
                  <h3>🍚 오늘 급식</h3>
                  {mealDishes.length ? (
                    <ul className="dm-meal">
                      {mealDishes.map((m, i) => (
                        <li key={i}>{m.replace(/\s*\([\d.\s]+\)\s*$/, '')}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="dm-mempty">{getSavedSchool() ? '오늘은 급식이 없어요' : '대시보드 급식 위젯에서 학교를 먼저 골라 주세요'}</p>
                  )}
                  {mealDishes.length > 0 && (
                    <div className="dm-meal-allergy" data-dm-meal-allergy>
                      <b>⚠️ 알레르기 정보</b>
                      {mealAllergies.length ? (
                        <div className="dm-meal-al-list">
                          {mealAllergies.map((x) => (
                            <span key={x.n} className="dm-meal-al" title={`${x.name}: ${x.dishes.join(', ')}`}>
                              <i>{x.n}</i>
                              {x.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <small>알레르기 표시가 없어요</small>
                      )}
                    </div>
                  )}
                </div>
                {/* 🌅 날짜별 아침활동 (급식과 출석 현황 사이) */}
                <MorningActivityCard fontScale={noticeScale} />
                <div className="dm-mstack">
                <div className="dm-mcard tone-mint dm-matt-bar" data-dm-matt>
                  <h3>✋ 출석 현황</h3>
                  <div className="dm-matt-row">
                    <div className="dm-matt">
                      <b className={cuteFontClass}>{present}</b>
                      <span>/ {total}명 왔어요</span>
                    </div>
                    <div className="dm-matt-gauge">
                      <div className="dm-matt-track">
                        <i style={{ width: `${pct}%` }} />
                      </div>
                      <span>{present === total && total > 0 ? '🎉 모두 왔어요!' : `${Math.max(0, total - present)}명 오는 중`}</span>
                    </div>
                    <button type="button" className="dm-big-btn" onClick={() => updateState({ activeTab: 'attendance' })}>
                      ✋ 등교 터치
                    </button>
                  </div>
                </div>
                <div className="dm-mcard tone-violet" data-dm-homework>
                  <h3 className="dm-mcard-head">
                    <span>📮 과제물 제출하세요</span>
                    {hwTasks.some((t) => isHwActiveToday(t)) ? (
                      <button type="button" className="dm-medit-btn is-violet" data-dm-homework-board onClick={() => updateState({ activeTab: 'homework' })}>
                        ✋ 터치 제출판
                      </button>
                    ) : homeworkEdit === null && (
                      <button type="button" className="dm-medit-btn is-violet" data-dm-homework-edit onClick={() => setHomeworkEdit({ ...homework })}>
                        ✏️ 고치기
                      </button>
                    )}
                  </h3>
                  {hwTasks.some((t) => isHwActiveToday(t)) ? (
                    <div className="dm-hw">
                      {hwTasks
                        .filter((t) => isHwActiveToday(t))
                        .slice(0, 2)
                        .map((t) => {
                          const miss = hwMissingOf(t, effectiveStudents as any);
                          return (
                            <div key={t.id}>
                              <div className="dm-hw-title">📘 {t.title}</div>
                              <div className="dm-hw-names">
                                {miss.length === 0 ? (
                                  <span className="dm-hw-name is-done">🎉 모두 냈어요!</span>
                                ) : (
                                  miss.slice(0, 18).map((st: any) => (
                                    <button key={st.id} type="button" className="dm-hw-name" onClick={() => hwToggleDone(t.id, st.id)}>
                                      {st.name}
                                    </button>
                                  ))
                                )}
                                {miss.length > 18 && <span className="dm-hw-name">외 {miss.length - 18}명</span>}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : homeworkEdit !== null ? (
                    <div className="dm-medit">
                      <input
                        className="dm-hw-title-input"
                        value={homeworkEdit.title}
                        placeholder="과제물 제목 (예: 수학 익힘책 42쪽)"
                        onChange={(e) => setHomeworkEdit({ ...homeworkEdit, title: e.target.value })}
                        data-dm-homework-title
                      />
                      <textarea
                        rows={3}
                        value={homeworkEdit.names}
                        placeholder="아직 안 낸 친구 이름 (쉼표나 줄바꿈으로 나눠요)"
                        onChange={(e) => setHomeworkEdit({ ...homeworkEdit, names: e.target.value })}
                        data-dm-homework-names
                      />
                      <div className="dm-medit-row">
                        <small>이름을 누르면 '냈어요'로 바뀌어요</small>
                        <button type="button" className="dm-medit-cancel" onClick={() => setHomeworkEdit(null)}>
                          취소
                        </button>
                        <button
                          type="button"
                          className="dm-medit-save !bg-violet-500"
                          data-dm-homework-save
                          onClick={() => {
                            saveHomework({ ...homeworkEdit, done: [] });
                            setHomeworkEdit(null);
                          }}
                        >
                          저장
                        </button>
                      </div>
                    </div>
                  ) : homework.title || hwNames.length ? (
                    <div className="dm-hw">
                      {homework.title && <div className="dm-hw-title">📘 {homework.title}</div>}
                      {hwNames.length > 0 && (
                        <div className="dm-hw-names">
                          {hwNames.map((n) => {
                            const done = homework.done.includes(n);
                            return (
                              <button
                                key={n}
                                type="button"
                                className={`dm-hw-name ${done ? 'is-done' : ''}`}
                                onClick={() => saveHomework({ ...homework, done: done ? homework.done.filter((x) => x !== n) : [...homework.done, n] })}
                              >
                                {done ? '✅ ' : ''}
                                {n}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="dm-mempty">✏️ 고치기를 눌러 과제물과 친구 이름을 적어 주세요</p>
                  )}
                </div>
                </div>
              </div>

              {/* 3행: 아침활동 · 전달사항 (넓게, 글자 크기 조절) */}
              <div className="dm-mcard tone-pink dm-mnotice" data-dm-mnotice>
                <h3 className="dm-mcard-head">
                  <span>📢 전달사항</span>
                  <span className="dm-mnotice-tools">
                    <span className="dm-fs" data-dm-notice-fs>
                      <button type="button" onClick={() => setNoticeScale(noticeScale - 0.15)} disabled={noticeScale <= 0.7} title="글자 작게" data-dm-notice-fs-minus>
                        가-
                      </button>
                      <b>{Math.round(noticeScale * 100)}%</b>
                      <button type="button" onClick={() => setNoticeScale(noticeScale + 0.15)} disabled={noticeScale >= 2.2} title="글자 크게" data-dm-notice-fs-plus>
                        가+
                      </button>
                    </span>
                  {morningCardEdit === null && (
                    <button type="button" className="dm-medit-btn" data-dm-notice-edit onClick={() => setMorningCardEdit(morningNoticeText)} title="등교 터치 화면의 '오늘의 아침활동 안내'와 함께 바뀌어요">
                      ✏️ 고치기
                    </button>
                  )}
                  </span>
                </h3>
                {morningCardEdit !== null ? (
                  <div className="dm-medit">
                    <textarea value={morningCardEdit} autoFocus rows={5} onChange={(e) => setMorningCardEdit(e.target.value)} placeholder={'한 줄에 하나씩 적어 주세요\n예) 📖 아침 독서 15분'} data-dm-notice-input />
                    <div className="dm-medit-row">
                      <small>등교 터치 화면에도 똑같이 보여요</small>
                      <button type="button" className="dm-medit-cancel" onClick={() => setMorningCardEdit(null)}>
                        취소
                      </button>
                      <button
                        type="button"
                        className="dm-medit-save"
                        data-dm-notice-save
                        onClick={() => {
                          saveMorningNotice(morningCardEdit);
                          setMorningCardEdit(null);
                        }}
                      >
                        저장
                      </button>
                    </div>
                  </div>
                ) : noticeLines.length ? (
                  <ul className={`dm-todo ${noticeLines.length > 4 ? 'is-cols' : ''}`} style={{ fontSize: `${Math.round(18 * noticeScale)}px` }}>
                    {noticeLines.slice(0, 12).map((a, i) => (
                      <li key={i}>{a.replace(/^\d+[.)]\s*/, '')}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="dm-mempty">✏️ 고치기를 눌러 오늘 할 일을 적어 주세요</p>
                )}
                {(bday.today.length > 0 || bday.weekend.length > 0) && (
                  <div className="dm-mbday">🎂 생일 축하해요! {[...bday.today, ...bday.weekend].map((k) => k.name).join(' · ')}</div>
                )}
              </div>
              {/* 🎧 아침 배경음악 (유튜브 · 내 MP3) */}
              <div className="mt-3">
                <CleanBgmPlayer compact storeKey="class_morning_bgm" defaultTracks={[]} label="아침 음악" isLightMode={activeThemeStyle.isLight} isActiveTab={syncState.activeTab === 'morning'} />
              </div>
            </div></AutoFitStage>
          );
        })()}

        {/* ========================================================== */}
        {/* TAB 2: BIG CLASS TIMER (가로 한 줄 웅장한 비율 최적화) */}
        {/* ========================================================== */}
        {syncState.activeTab === 'timer' && (() => {
          const timerStyles = getTimerTextScaleStyles();
          return (
            <AutoFitStage base={1200} max={1} maxStretch={3} data-testid="fit-timer"><div className="text-center space-y-4 sm:space-y-6 animate-fade-in w-full max-w-full mx-auto px-2 sm:px-6 my-auto flex flex-col items-center justify-center" data-dm-timer-tab>
              {/* 🕒 타이머 상단 실시간 현재 시각 (초단위 포함 - 가독성 대폭 강화) */}
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="dm-clock-row" data-dm-clock-row>
                <div
                  className={`inline-flex items-center gap-2.5 sm:gap-3.5 rounded-2xl border font-black tracking-wide transition-all shadow-sm ${
                    timerStyles.timeBadge
                  } ${
                    activeThemeStyle.isLight
                      ? 'bg-white/95 border-slate-200 text-slate-800 shadow-md'
                      : 'bg-slate-900/90 border-indigo-500/40 text-indigo-300 shadow-lg'
                  }`}
                >
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500 animate-pulse shrink-0" />
                  <span className="opacity-90">{currentTime.fullDate}</span>
                  <span
                    style={resolvedClockStyle.isCustom ? resolvedClockStyle.style : undefined}
                    className={`font-mono font-black rounded-xl border px-3 py-0.5 tracking-wider transition-all shadow-inner ${
                      timerStyles.timeClockText
                    } ${
                      resolvedClockStyle.clockClass
                    }`}
                  >
                    {currentTime.timeWithSeconds}
                  </span>
                </div>
                <div className="dm-tkind" role="tablist" data-dm-tkind>
                  <button type="button" role="tab" aria-selected={timerKind === 'timer'} className={timerKind === 'timer' ? 'is-on' : ''} onClick={() => setTimerKind('timer')} data-dm-tkind-timer>
                    ⏳ 타이머
                  </button>
                  <button type="button" role="tab" aria-selected={timerKind === 'stopwatch'} className={timerKind === 'stopwatch' ? 'is-on' : ''} onClick={() => setTimerKind('stopwatch')} data-dm-tkind-sw>
                    ⏱️ 스톱워치{sw.running && timerKind !== 'stopwatch' ? ' ●' : ''}
                  </button>
                  <button type="button" role="tab" aria-selected={timerKind === 'seq'} className={timerKind === 'seq' ? 'is-on' : ''} onClick={() => setTimerKind('seq')} data-dm-tkind-seq>
                    🪜 순차 타이머
                  </button>
                </div>
                </div>
                <div
                  className={`font-extrabold tracking-widest uppercase transition-all ${
                    timerStyles.subTitle
                  } ${
                    activeThemeStyle.isLight ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  CLASS FOCUS TIMER &amp; CLOCK
                </div>
              </div>

              {timerKind === 'seq' ? (
                <div className="w-full px-1 sm:px-4" data-dm-seq>
                  <SequenceTimer variant="display" />
                </div>
              ) : timerKind === 'stopwatch' ? (() => {
                const elapsed = swElapsed(sw, swNow);
                const laps = sw.laps;
                const best = laps.length > 1 ? Math.min(...laps.map((l) => l.split)) : -1;
                return (
                  <div className="dm-sw w-full flex flex-col items-center gap-4" data-dm-sw>
                    <button
                      type="button"
                      className={`dm-sw-digits ${timerAlert.font === 'mono' ? 'font-mono' : `dm-tfont-${timerAlert.font}`} ${sw.running ? 'is-run' : ''} ${resolvedTimerStyle.isCustom ? `${resolvedTimerStyle.textColorClass}` : activeThemeStyle.timerFontClass}`}
                      style={{ fontSize: laps.length ? 'clamp(4rem, min(15vw, 22vh), 15rem)' : getTimerFontSize(), ...(resolvedTimerStyle.customColorHex ? { color: resolvedTimerStyle.customColorHex } : {}) }}
                      onClick={() => (sw.running ? swLap() : swToggle())}
                      title={sw.running ? '누르면 지금 시간을 기록해요' : '누르면 시작해요'}
                      data-dm-sw-digits
                    >
                      {(() => {
                        const t = fmtSw(elapsed);
                        const dot = t.lastIndexOf('.');
                        return dot > 0 ? (
                          <>
                            {t.slice(0, dot)}
                            <small>{t.slice(dot)}</small>
                          </>
                        ) : (
                          t
                        );
                      })()}
                    </button>
                    <div className="flex items-center justify-center gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={swToggle}
                        data-dm-sw-toggle
                        className={`rounded-2xl font-black shadow-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center ${timerStyles.actionBtn} ${
                          sw.running ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-gradient-to-r from-indigo-500 to-sky-400 text-slate-950 hover:brightness-110'
                        }`}
                      >
                        {sw.running ? '⏸️ 멈춤' : elapsed > 0 ? '▶️ 계속' : '▶️ 시작'}
                      </button>
                      <button
                        type="button"
                        onClick={swLap}
                        disabled={!sw.running}
                        data-dm-sw-lap
                        className={`rounded-2xl font-black shadow-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed ${timerStyles.actionBtn} bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 hover:brightness-110`}
                      >
                        🏁 기록 ({laps.length + 1}번째)
                      </button>
                      <button
                        type="button"
                        onClick={swReset}
                        disabled={elapsed === 0 && laps.length === 0}
                        data-dm-sw-reset
                        className={`rounded-2xl font-bold cursor-pointer border active:scale-95 flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 ${timerStyles.actionBtn} ${
                          activeThemeStyle.isLight ? 'bg-white/95 hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm' : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border-slate-700 shadow-md'
                        }`}
                      >
                        🔄 리셋
                      </button>
                    </div>
                    <p className="dm-sw-hint">스페이스바(Space) 또는 숫자를 누르면 기록돼요 · 기록마다 이름을 적을 수 있어요</p>
                    {laps.length > 0 && (
                      <div className="dm-sw-laps" data-dm-sw-laps>
                        <div className="dm-sw-laps-head">
                          <span>🏁 기록 순서 · {laps.length}개</span>
                        </div>
                        <ol>
                          {laps.map((l, i) => (
                            <li key={l.n} className={`${i === laps.length - 1 ? 'is-latest' : ''} ${l.n <= 3 ? `is-top${l.n}` : ''}`} data-dm-sw-lap-item={l.n}>
                              <span className="dm-sw-rank">{l.n === 1 ? '🥇' : l.n === 2 ? '🥈' : l.n === 3 ? '🥉' : `${l.n}`}<small>{l.n}번째</small></span>
                              <b className="dm-sw-total">{fmtSw(l.total)}</b>
                              <span className={`dm-sw-split ${l.split === best ? 'is-best' : ''}`}>+{fmtSw(l.split)}</span>
                              <input
                                className="dm-sw-name"
                                value={l.name || ''}
                                placeholder="이름"
                                onChange={(e) => setSw({ ...swRef.current, laps: swRef.current.laps.map((x) => (x.n === l.n ? { ...x, name: e.target.value } : x)) })}
                              />
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                );
              })() : (<>
              
              {/* 세로 줄바꿈 방지(whitespace-nowrap) 및 가로 꽉 찬 웅장한 반응형 폰트 (가로 잘림 방지 최적화) */}
              <div className="w-full max-w-full flex items-center justify-center py-1 sm:py-3 px-1 sm:px-2 overflow-visible">
                <div
                  style={{
                    fontSize: getTimerFontSize(),
                    lineHeight: 1,
                    ...(resolvedTimerStyle.customColorHex ? { color: resolvedTimerStyle.customColorHex } : {}),
                    ...resolvedTimerStyle.customShadowStyle,
                  }}
                  data-dm-timer-digits
                  className={`${timerAlert.font === 'mono' ? 'font-mono' : `dm-tfont-${timerAlert.font}`} ${syncState.isTimerRunning && syncState.timerSeconds <= 10 && syncState.timerSeconds > 0 ? 'dm-timer-hot' : ''} font-black tabular-nums whitespace-nowrap select-none tracking-tight sm:tracking-normal leading-none transition-all duration-300 max-w-full text-center ${
                    resolvedTimerStyle.isCustom
                      ? `${resolvedTimerStyle.textColorClass} ${resolvedTimerStyle.shadowClass}`
                      : `${activeThemeStyle.timerFontClass} ${resolvedTimerStyle.shadowClass}`
                  }`}
                >
                  {formatTime(syncState.timerSeconds)}
                </div>
              </div>

              {/* 1분, 3분, 5분, 10분, 15분 프리셋 버튼 */}
              <div className="dm-tctl flex items-center justify-center gap-3 flex-wrap">
                {[60, 180, 300, 600, 900].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() =>
                      updateState({
                        timerSeconds: sec,
                        isTimerRunning: false,
                      })
                    }
                    className={`rounded-2xl font-black transition-all cursor-pointer border active:scale-95 ${
                      timerStyles.presetBtn
                    } ${
                      activeThemeStyle.isLight
                        ? 'bg-white/95 hover:bg-slate-50 text-slate-800 border-slate-200 shadow-sm'
                        : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-700 shadow-md'
                    }`}
                  >
                    {sec / 60}분
                  </button>
                ))}
              </div>

              {/* 시간 미세 조절 버튼 (-1분, -10초, +10초, +1분) */}
              <div className="dm-tctl flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    updateState({
                      timerSeconds: Math.max(0, syncState.timerSeconds - 60),
                    })
                  }
                  className={`rounded-xl font-black transition-all cursor-pointer border active:scale-95 flex items-center gap-1 ${
                    timerStyles.adjustBtn
                  } ${
                    activeThemeStyle.isLight
                      ? 'bg-white/95 hover:bg-rose-50 text-rose-600 border-rose-200 shadow-sm'
                      : 'bg-slate-800/90 hover:bg-slate-700 text-rose-300 border-rose-500/30'
                  }`}
                  title="1분 줄이기"
                >
                  <span>-1분</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateState({
                      timerSeconds: Math.max(0, syncState.timerSeconds - 10),
                    })
                  }
                  className={`rounded-xl font-black transition-all cursor-pointer border active:scale-95 flex items-center gap-1 ${
                    timerStyles.adjustBtn
                  } ${
                    activeThemeStyle.isLight
                      ? 'bg-white/95 hover:bg-amber-50 text-amber-600 border-amber-200 shadow-sm'
                      : 'bg-slate-800/90 hover:bg-slate-700 text-amber-300 border-amber-500/30'
                  }`}
                  title="10초 줄이기"
                >
                  <span>-10초</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateState({
                      timerSeconds: syncState.timerSeconds + 10,
                    })
                  }
                  className={`rounded-xl font-black transition-all cursor-pointer border active:scale-95 flex items-center gap-1 ${
                    timerStyles.adjustBtn
                  } ${
                    activeThemeStyle.isLight
                      ? 'bg-white/95 hover:bg-sky-50 text-sky-600 border-sky-200 shadow-sm'
                      : 'bg-slate-800/90 hover:bg-slate-700 text-sky-300 border-sky-500/30'
                  }`}
                  title="10초 늘리기"
                >
                  <span>+10초</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateState({
                      timerSeconds: syncState.timerSeconds + 60,
                    })
                  }
                  className={`rounded-xl font-black transition-all cursor-pointer border active:scale-95 flex items-center gap-1 ${
                    timerStyles.adjustBtn
                  } ${
                    activeThemeStyle.isLight
                      ? 'bg-white/95 hover:bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm'
                      : 'bg-slate-800/90 hover:bg-slate-700 text-emerald-300 border-emerald-500/30'
                  }`}
                  title="1분 늘리기"
                >
                  <span>+1분</span>
                </button>
              </div>

              {/* 하단 제어 버튼: 타이머 시작 / 일시정지 및 리셋 */}
              <div className="dm-tctl flex items-center justify-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    playSelectedChime();
                    updateState({ isTimerRunning: !syncState.isTimerRunning });
                  }}
                  className={`rounded-2xl font-black shadow-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center ${
                    timerStyles.actionBtn
                  } ${
                    syncState.isTimerRunning
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/40'
                      : 'bg-gradient-to-r from-indigo-500 to-sky-400 text-slate-950 hover:brightness-110 shadow-indigo-900/40'
                  }`}
                >
                  {syncState.isTimerRunning ? '⏸️ 일시 정지' : '▶️ 타이머 시작'}
                </button>

                <button
                  type="button"
                  onClick={() => updateState({ timerSeconds: 300, isTimerRunning: false })}
                  className={`rounded-2xl font-bold cursor-pointer border active:scale-95 flex items-center justify-center gap-1.5 transition-all ${
                    timerStyles.actionBtn
                  } ${
                    activeThemeStyle.isLight
                      ? 'bg-white/95 hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm'
                      : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border-slate-700 shadow-md'
                  }`}
                >
                  <span>🔄 리셋</span>
                </button>

                <button
                  type="button"
                  data-dm-talert-btn
                  onClick={() => setTimerAlertOpen((v) => !v)}
                  className={`rounded-2xl font-bold cursor-pointer border active:scale-95 flex items-center justify-center gap-1.5 transition-all ${timerStyles.actionBtn} ${
                    timerAlertOpen
                      ? 'bg-amber-100 text-amber-700 border-amber-300'
                      : activeThemeStyle.isLight
                      ? 'bg-white/95 hover:bg-amber-50 text-slate-700 border-slate-200 shadow-sm'
                      : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border-slate-700 shadow-md'
                  }`}
                  title="알림음 · 글꼴 설정"
                >
                  <span>🔔 알림</span>
                </button>
                {/* 🔊 소리 크기 (바로 조절) */}
                <label
                  className={`rounded-2xl font-bold border flex items-center gap-1.5 px-3 ${timerStyles.actionBtn} ${
                    activeThemeStyle.isLight ? 'bg-white/95 text-slate-700 border-slate-200 shadow-sm' : 'bg-slate-800/90 text-slate-300 border-slate-700 shadow-md'
                  }`}
                  title="타이머 소리 크기"
                  data-dm-tvol-quick
                >
                  <span>{timerAlert.volume <= 0 ? '🔇' : timerAlert.volume < 0.5 ? '🔉' : '🔊'}</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(timerAlert.volume * 100)}
                    onChange={(e) => setTimerAlertPart({ volume: Number(e.target.value) / 100 })}
                    onPointerUp={() => playTimerSound(timerAlert.warnSound === 'mute' ? 'xylo' : timerAlert.warnSound, getTimerAlert().volume)}
                    className="dm-tvol"
                    style={{ width: 110 }}
                  />
                  <span className="tabular-nums text-sm w-8">{Math.round(timerAlert.volume * 100)}</span>
                </label>
              </div>
              </>)}

              {timerAlertOpen && (
                <div className="dm-talert" data-dm-talert>
                  <div className="dm-talert-row">
                    <label>🔤 숫자 글꼴</label>
                    <div className="dm-talert-chips">
                      {TIMER_FONTS.map((f) => (
                        <button key={f.id} type="button" className={`dm-tchip ${timerAlert.font === f.id ? 'is-on' : ''}`} onClick={() => setTimerAlertPart({ font: f.id })}>
                          <span className={f.id === 'mono' ? 'font-mono' : `dm-tfont-${f.id}`} style={{ fontSize: 20 }}>
                            {f.sample}
                          </span>
                          <small>{f.label}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="dm-talert-row">
                    <label>⏰ 언제 알릴까요?</label>
                    <div className="dm-talert-chips">
                      {TIMER_POINTS.map((p) => {
                        const on = timerAlert.points.includes(p.sec);
                        return (
                          <button
                            key={p.sec}
                            type="button"
                            className={`dm-tchip ${on ? 'is-on' : ''}`}
                            data-dm-tpoint={p.sec}
                            onClick={() => setTimerAlertPart({ points: on ? timerAlert.points.filter((x) => x !== p.sec) : [...timerAlert.points, p.sec] })}
                          >
                            {on ? '✅' : '⬜'} {p.label}
                          </button>
                        );
                      })}
                      <button type="button" className={`dm-tchip ${timerAlert.countdown ? 'is-on' : ''}`} onClick={() => setTimerAlertPart({ countdown: !timerAlert.countdown })}>
                        {timerAlert.countdown ? '✅' : '⬜'} 5·4·3·2·1 똑딱
                      </button>
                      <button type="button" className={`dm-tchip ${timerAlert.popup ? 'is-on' : ''}`} onClick={() => setTimerAlertPart({ popup: !timerAlert.popup })}>
                        {timerAlert.popup ? '✅' : '⬜'} 루미 알림창
                      </button>
                    </div>
                  </div>
                  {(['warnSound', 'endSound'] as const).map((k) => (
                    <div className="dm-talert-row" key={k}>
                      <label>{k === 'warnSound' ? '🔔 미리 알림 소리' : '🎉 끝날 때 소리'}</label>
                      <div className="dm-talert-chips">
                        {TIMER_SOUNDS.map((snd) => (
                          <button
                            key={snd.id}
                            type="button"
                            className={`dm-tchip ${timerAlert[k] === snd.id ? 'is-on' : ''}`}
                            data-dm-tsound={`${k}-${snd.id}`}
                            onClick={() => {
                              setTimerAlertPart({ [k]: snd.id } as any);
                              playTimerSound(snd.id, timerAlert.volume, k === 'endSound' ? 2 : 1);
                            }}
                          >
                            {snd.emoji} {snd.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="dm-talert-row">
                    <label>🔊 크기</label>
                    <div className="dm-talert-chips items-center">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(timerAlert.volume * 100)}
                        onChange={(e) => setTimerAlertPart({ volume: Number(e.target.value) / 100 })}
                        className="dm-tvol"
                      />
                      <b className="text-sm tabular-nums w-12">{Math.round(timerAlert.volume * 100)}%</b>
                      <button
                        type="button"
                        className="dm-tchip"
                        onClick={() => {
                          playTimerSound(timerAlert.warnSound, timerAlert.volume);
                          setTimerToast({ id: Date.now(), sec: 60 });
                        }}
                      >
                        ▶ 미리 보기
                      </button>
                    </div>
                  </div>
                  <p className="dm-talert-note">알림음은 모두 이 프로그램에서 직접 만든 소리라 저작권 걱정 없이 쓸 수 있어요.</p>
                </div>
              )}
            </div></AutoFitStage>
          );
        })()}

        {/* ========================================================== */}
        {/* TAB 3: NOISE LEVEL MONITOR (마이크 연동 & 작동 버튼 활성화) */}
        {/* ========================================================== */}
        {syncState.activeTab === 'noise' && (
          <div className="text-center space-y-7 animate-fade-in max-w-2xl w-full mx-auto px-4">
            <div className="flex items-center justify-between">
              <div className="text-xs sm:text-sm font-bold text-emerald-400 tracking-widest uppercase">
                CLASSROOM NOISE LEVEL MONITOR
              </div>
              
              {/* 상단 헤더 우측: 호랑이 상태 배지 + 마이크 측정 활성화 상태 배지 */}
              <div className="flex items-center gap-2">
                <TigerStatusCharacter
                  status={syncState.decibel <= 45 ? 'sleep' : syncState.decibel <= 65 ? 'worried' : 'warning'}
                  size="sm"
                  showLabel={true}
                  className="shadow-sm"
                />
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  isMicActive
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isMicActive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                  {isMicActive ? '마이크 측정 중' : '마이크 대기'}
                </span>
              </div>
            </div>

            {/* 중앙: 대형 음성 이퀄라이저 바(Dynamic Audio Visualizer Bars) + 상태 호랑이 캐릭터 + 데시벨(dB) 수치 + 소음 상태 배지 */}
            <div className="py-6 flex flex-col items-center justify-center gap-5 bg-slate-900/60 rounded-3xl border border-slate-800/80 p-6 shadow-2xl">
              {/* 메인 위젯과 동일한 중앙 호랑이 감정 상태 캐릭터 */}
              <div className="flex items-center gap-4 bg-slate-950/60 px-6 py-3 rounded-2xl border border-slate-800 shadow-md">
                <TigerStatusCharacter
                  status={syncState.decibel <= 45 ? 'sleep' : syncState.decibel <= 65 ? 'worried' : 'warning'}
                  size="lg"
                  showLabel={false}
                  className="shadow-md"
                />
                <div className="text-left">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-5xl sm:text-6xl font-black tracking-tight ${cuteFontClass} drop-shadow-md ${
                        syncState.decibel <= 45
                          ? 'text-emerald-400'
                          : syncState.decibel <= 65
                          ? 'text-amber-400'
                          : 'text-rose-500 animate-bounce'
                      }`}
                    >
                      {isMicActive ? Math.round(syncState.decibel) : '--'}
                    </span>
                    <span className="text-lg font-black text-slate-400">dB</span>
                  </div>
                  <div className="text-xs font-bold text-slate-400">
                    {syncState.decibel <= 45 ? '안정 조용 수치' : syncState.decibel <= 65 ? '주의 소음 수치' : '소음 초과 경고'}
                  </div>
                </div>
              </div>

              {/* Dynamic Audio Visualizer Bars */}
              <div className="flex items-end justify-center gap-2 h-20 w-full max-w-md px-4 bg-slate-950/40 py-2 rounded-2xl border border-slate-800/60">
                {Array.from({ length: 20 }).map((_, i) => {
                  const normalizedDb = Math.min(100, Math.max(10, syncState.decibel));
                  const waveFactor = Math.sin((i / 20) * Math.PI) * 0.8 + 0.2;
                  const barHeightPct = isMicActive ? Math.min(100, Math.max(12, normalizedDb * waveFactor * 1.2)) : 8;
                  const barColor =
                    syncState.decibel <= 45
                      ? 'bg-emerald-400 shadow-emerald-500/30'
                      : syncState.decibel <= 65
                      ? 'bg-amber-400 shadow-amber-500/30'
                      : 'bg-rose-500 shadow-rose-500/50 animate-pulse';

                  return (
                    <div
                      key={i}
                      className={`w-3 rounded-full transition-all duration-150 shadow-md ${barColor}`}
                      style={{ height: `${barHeightPct}%` }}
                    />
                  );
                })}
              </div>

              {/* Status Badge */}
              <div
                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-base font-black border shadow-lg transition-all ${
                  syncState.decibel <= 45
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50'
                    : syncState.decibel <= 65
                    ? 'bg-amber-950/80 text-amber-300 border-amber-600/50'
                    : 'bg-rose-950/90 text-rose-300 border-rose-600/60 animate-pulse'
                }`}
              >
                <span>
                  {syncState.decibel <= 45
                    ? '🌿 조용하고 평온해요 (쉿 모드 성공)'
                    : syncState.decibel <= 65
                    ? '⚠️ 조금 시끄러워요 (목소리를 낮춰주세요)'
                    : '🚨 너무 소란스러워요! (조용히 해주세요!)'}
                </span>
              </div>
            </div>


            {/* 마이크 제어 및 메인 위젯 실시간 연동 버튼 바 */}
            <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={isMicActive ? stopMicMonitoring : startMicMonitoring}
                className={`px-6 py-2.5 rounded-2xl font-black text-sm flex items-center gap-2 transition cursor-pointer shadow-lg active:scale-95 ${
                  isMicActive
                    ? 'bg-rose-600 hover:bg-rose-700 text-white ring-2 ring-rose-400/40'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 ring-2 ring-emerald-300/40'
                }`}
              >
                {isMicActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{isMicActive ? '마이크 측정 중지' : '🎙️ 마이크 실시간 측정 켜기'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playSelectedChime('bell_ding');
                  updateState({ decibel: 42 });
                }}
                className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer border border-slate-700"
              >
                기본값 (42dB) 리셋
              </button>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 4: 1인 1역할 현황판 (5열 레이아웃 & 화면 확장 가로형 최적화) */}
        {/* ========================================================== */}
        {syncState.activeTab === 'roles' && (
          <div className="w-full max-w-[97vw] 2xl:max-w-[1850px] space-y-4 sm:space-y-5 animate-fade-in mx-auto px-2 sm:px-4 xl:px-6 flex-1 flex flex-col justify-center">
            <div className="text-center pb-1">
              <h2
                className={`text-2xl sm:text-3xl md:text-4xl font-black ${
                  activeThemeStyle.isLight ? 'text-slate-900' : 'text-white'
                }`}
              >
                우리 반 1인 1역할 학급 자치 조직도
              </h2>
              <p
                className={`text-xs sm:text-base font-bold mt-1 ${
                  activeThemeStyle.isLight ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                책임감과 봉사의 마음으로 우리 반을 함께 가꿔가요! (총 {effectiveRoles.length}개 역할)
              </p>
            </div>

            {/* 실천 체크 완료/취소 실시간 피드백 토스트 배너 */}
            {attendanceToastMessage && (
              <div className="py-2.5 px-4 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 border-2 border-emerald-400 text-emerald-900 dark:text-emerald-200 rounded-2xl text-center text-sm sm:text-base font-extrabold animate-bounce shadow-md flex items-center justify-center gap-2">
                <span>{attendanceToastMessage}</span>
              </div>
            )}

            <div className="roles-board grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2.5 sm:gap-3 max-h-[80vh] overflow-y-auto custom-scroll pr-1.5 pb-3 items-start">
              {effectiveRoles.map((r) => {
                const assignedStudents = r.currentStudentIds
                  .map((id) => effectiveStudents.find((s: Student) => s.id === id))
                  .filter(Boolean) as Student[];

                return (
                  <div
                    key={r.id}
                    className={`role-card p-2.5 sm:p-3 rounded-3xl border-2 text-center transition duration-200 flex flex-col shadow-md hover:shadow-lg ${
                      activeThemeStyle.isLight
                        ? 'bg-white/95 border-slate-200/90 text-slate-800 hover:border-indigo-400'
                        : 'bg-slate-900/95 border-slate-800 text-white hover:border-slate-700'
                    }`}
                  >
                    {/* 역할 헤더 (텍스트 가려짐 완전 방지: 줄바꿈 허용 및 또렷한 폰트) */}
                    <div className="pb-2 border-b border-slate-100 dark:border-slate-800/80">
                      <div
                        className={`text-sm sm:text-base md:text-lg font-black break-keep leading-tight ${
                          activeThemeStyle.isLight ? 'text-indigo-700' : 'text-amber-300'
                        }`}
                      >
                        {r.title}
                      </div>
                      {r.description && (
                        <div
                          className={`text-[11px] sm:text-xs mt-1 font-semibold break-keep leading-snug line-clamp-2 ${
                            activeThemeStyle.isLight ? 'text-slate-600' : 'text-slate-300'
                          }`}
                          title={r.description}
                        >
                          {r.description}
                        </div>
                      )}
                    </div>

                    {/* 담당 학생 실천 터치 캔디바 영역 (초등학생 전자칠판 손가락 터치 최적화) */}
                    <div className="pt-2">
                      {assignedStudents.length > 0 ? (
                        <div className="role-tiles flex flex-wrap justify-center gap-1.5 sm:gap-2">
                          {assignedStudents.map((st) => {
                            const dayNames = ['일', '월', '화', '수', '목', '금', '토'] as const;
                            const todayIndex = new Date().getDay();
                            const currentDayName = (todayIndex >= 1 && todayIndex <= 5) ? dayNames[todayIndex] : '월';
                            const studentCheck = localDailyChecks[st.id]?.[currentDayName];
                            const isCompleted = studentCheck === 'O' || (studentCheck !== 'X' && r.performanceScores?.[st.id] === 100);

                            return (
                              <button
                                key={st.id}
                                type="button"
                                onClick={() => handleToggleRoleCheck(r.id, st.id)}
                                className={`role-tile aspect-square rounded-2xl transition-all cursor-pointer active:scale-95 border-2 shadow-xs flex flex-col items-center justify-center gap-0.5 sm:gap-1 p-1.5 select-none ${
                                  isCompleted
                                    ? activeThemeStyle.isLight
                                      ? 'bg-emerald-50 text-emerald-950 border-emerald-400 shadow-sm ring-2 ring-emerald-300/60'
                                      : 'bg-emerald-500/25 text-emerald-200 border-emerald-400 shadow-md ring-2 ring-emerald-400/40'
                                    : activeThemeStyle.isLight
                                    ? 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300/90 hover:border-indigo-400'
                                    : 'bg-slate-800/90 text-slate-200 hover:text-white border-slate-700 hover:border-slate-500'
                                }`}
                                title="터치하여 1인 1역할 실천 완료/미완료 변경 (위젯 및 일일 평가표와 실시간 동기화)"
                              >
                                {/* 1행: 번호 · 2행: 이름 · 3행: 실천하기 (정사각형 캔디바) */}
                                <span className="text-[11px] sm:text-xs font-bold opacity-70 leading-none">{st.number}번</span>
                                <span className="role-tile-name text-sm sm:text-base xl:text-lg font-black break-keep tracking-tight leading-tight text-center max-w-full truncate">
                                  {st.name}
                                </span>
                                <span
                                  className={`px-2 py-1 rounded-lg text-[10.5px] sm:text-xs font-black flex items-center gap-0.5 shrink-0 shadow-2xs whitespace-nowrap ${
                                    isCompleted
                                      ? 'bg-emerald-500 text-white'
                                      : activeThemeStyle.isLight
                                      ? 'bg-slate-200 text-slate-700'
                                      : 'bg-slate-700 text-slate-300'
                                  }`}
                                >
                                  {isCompleted ? '✨ 완료!' : '실천하기'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div
                          className={`text-sm py-3 font-semibold ${
                            activeThemeStyle.isLight ? 'text-slate-400 italic' : 'text-slate-500 italic'
                          }`}
                        >
                          담당 학생 없음
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {/* ========================================================== */}
        {/* TAB 5: BREAK TIME (화면 전체 4분할 소음 통합 모드) */}
        {/* ========================================================== */}
        {syncState.activeTab === 'break' && (
          <AutoFitStage base={1280} data-testid="fit-break"><div className="w-full flex flex-col space-y-3 sm:space-y-4 animate-fade-in">
            {/* 상단 통합 안내 바 */}
            <div
              className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2 rounded-2xl border shadow-lg transition-colors ${
                activeThemeStyle.isLight
                  ? 'bg-white/90 border-slate-200 text-slate-800'
                  : 'bg-slate-900/90 border-slate-800 text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Coffee className="w-4 h-4 text-pink-500" />
                <span className="font-black text-sm">쉬는 시간 스마트 모니터링</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    activeThemeStyle.isLight
                      ? 'bg-pink-100 text-pink-700 border-pink-200'
                      : 'bg-pink-950/70 text-pink-300 border-pink-700/50'
                  }`}
                >
                  4분할 통합 모드
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-base">
                <span className={activeThemeStyle.isLight ? 'text-slate-500 font-bold' : 'text-slate-400'}>
                  실시간:
                </span>
                <span
                  className={`font-mono font-black px-3.5 py-1 rounded-xl border text-sm sm:text-lg shadow-sm ${
                    activeThemeStyle.isLight
                      ? 'text-indigo-800 bg-indigo-50 border-indigo-200'
                      : 'text-amber-300 bg-slate-950 border-slate-800'
                  }`}
                >
                  {currentTime.fullDate} {currentTime.timeWithSeconds}
                </span>
              </div>
            </div>

            {/* 4분할 그리드 컨테이너 (2x2) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 flex-1">
              {/* ========================================================= */}
              {/* [1사분면 - 좌측 상단]: 현재시간(작게) + 쉬는 시간 타이머 */}
              {/* ========================================================= */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border shadow-xl flex flex-col justify-between text-center relative overflow-hidden transition-colors ${
                  activeThemeStyle.isLight
                    ? 'bg-white/95 border-slate-200 text-slate-800'
                    : 'bg-slate-900/95 border-slate-800 text-white'
                }`}
              >
                <div
                  className={`flex items-center justify-between gap-2 flex-wrap border-b pb-2 mb-2 ${
                    activeThemeStyle.isLight ? 'border-slate-100' : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-base sm:text-lg font-black text-pink-500">
                    <Sparkles className="w-5 h-5" />
                    <span>쉬는 시간 타이머</span>
                  </div>
                  {/* 타이머 제어 버튼 (제목 줄 안으로) */}
                  <div className="dm-break-ctl flex items-center gap-1.5 flex-wrap" data-dm-break-ctl>
                    <button
                      type="button"
                      onClick={() => updateState({ isBreakTimerRunning: !syncState.isBreakTimerRunning })}
                      className={`px-3.5 py-1.5 rounded-xl font-black text-sm transition cursor-pointer active:scale-95 shadow-md ${
                        syncState.isBreakTimerRunning
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {syncState.isBreakTimerRunning ? '⏸️ 일시 정지' : '▶️ 타이머 시작'}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateState({ breakTimerSeconds: 600, isBreakTimerRunning: false })}
                      className={`px-2.5 py-1.5 rounded-xl text-sm font-black transition cursor-pointer border active:scale-95 ${
                        activeThemeStyle.isLight
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                    >
                      🔄 10분 리셋
                    </button>
                    <button
                      type="button"
                      onClick={() => updateState({ breakTimerSeconds: Math.max(0, syncState.breakTimerSeconds - 60) })}
                      className={`px-2.5 py-1.5 rounded-xl text-sm font-black border active:scale-95 ${
                        activeThemeStyle.isLight
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                          : 'bg-slate-800/80 hover:bg-slate-700 text-rose-300 border-rose-500/20'
                      }`}
                    >
                      -1분
                    </button>
                    <button
                      type="button"
                      onClick={() => updateState({ breakTimerSeconds: syncState.breakTimerSeconds + 60 })}
                      className={`px-2.5 py-1.5 rounded-xl text-sm font-black border active:scale-95 ${
                        activeThemeStyle.isLight
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          : 'bg-slate-800/80 hover:bg-slate-700 text-emerald-300 border-emerald-500/20'
                      }`}
                    >
                      +1분
                    </button>
                  </div>
                  {/* 표시되는 현재 시간 (초단위 포함 - 가독성 강화) */}
                  <div
                    className={`flex items-center gap-1.5 text-sm sm:text-base font-black px-3 py-1 rounded-xl border shadow-xs ${
                      activeThemeStyle.isLight
                        ? 'text-slate-700 bg-slate-100 border-slate-200'
                        : 'text-slate-300 bg-slate-950 border-slate-800'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span className={cuteFontClass}>현재 {currentTime.timeWithSeconds}</span>
                  </div>
                </div>

                {/* 거대한 쉬는 시간 카운트다운 타이머 (빈 영역 최대 활용 및 가로 잘림 방지) */}
                <div className="py-2 sm:py-3 flex-1 flex items-center justify-center overflow-visible">
                  <div
                    data-dm-break-timer
                    className={`${cuteFontClass} font-black tracking-tight leading-none tabular-nums text-[clamp(4.8rem,min(14vw,28vh),13rem)] whitespace-nowrap select-none ${
                      activeThemeStyle.isLight
                        ? 'text-indigo-600 drop-shadow-sm'
                        : 'text-amber-300 drop-shadow-[0_0_30px_rgba(251,191,36,0.35)]'
                    }`}
                  >
                    {formatTime(syncState.breakTimerSeconds).replace(' : ', ':')}
                  </div>
                </div>

              </div>

              {/* ========================================================= */}
              {/* [2사분면 - 우측 상단]: 실시간 소음 데시벨 측정기           */}
              {/* ========================================================= */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border shadow-xl flex flex-col justify-between text-center relative overflow-hidden transition-colors ${
                  activeThemeStyle.isLight
                    ? 'bg-white/95 border-slate-200 text-slate-800'
                    : 'bg-slate-900/95 border-slate-800 text-white'
                }`}
              >
                <div
                  className={`flex items-center justify-between border-b pb-2 mb-2 ${
                    activeThemeStyle.isLight ? 'border-slate-100' : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-base sm:text-lg font-black text-sky-500">
                    <Volume2 className="w-5 h-5" />
                    <span>실시간 교실 소음 측정</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={isMicActive ? stopMicMonitoring : startMicMonitoring}
                      className={`px-4 py-2 rounded-2xl text-sm sm:text-base font-black transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-md ${
                        isMicActive
                          ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      }`}
                    >
                      {isMicActive ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                      <span>{isMicActive ? '측정 끄기' : '마이크 켜기'}</span>
                    </button>
                  </div>
                </div>

                {/* 중앙 데시벨 수치 및 그래픽 게이지 */}
                <div className="flex items-center justify-center gap-6 sm:gap-10 py-2 flex-1">
                  <div className="flex flex-col items-center">
                    <div className="flex items-baseline gap-1">
                      <span data-dm-break-db className={`${cuteFontClass} font-black text-[clamp(3.6rem,min(9vw,17vh),8rem)] leading-none tabular-nums ${
                        syncState.decibel > 75 ? 'text-rose-500' : syncState.decibel > 60 ? 'text-amber-500' : 'text-emerald-500'
                      }`}>
                        {syncState.decibel}
                      </span>
                      <span className={`${cuteFontClass} text-2xl font-black text-slate-400`}>dB</span>
                    </div>
                    <span className={`text-base sm:text-lg font-black mt-2 px-4 py-1 rounded-full border ${
                      syncState.decibel > 75
                        ? activeThemeStyle.isLight ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : syncState.decibel > 60
                        ? activeThemeStyle.isLight ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : activeThemeStyle.isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}>
                      {syncState.decibel > 75 ? '🚨 조금 시끄러워요' : syncState.decibel > 60 ? '📢 적당한 대화 중' : '🌿 평화롭고 조용함'}
                    </span>
                  </div>

                  {/* 수평 게이지 바 */}
                  <div className="flex-1 max-w-[340px] flex flex-col gap-2 text-left">
                    <div className="flex justify-between text-sm text-slate-400 font-black">
                      <span>30dB</span>
                      <span>목표 65dB</span>
                      <span>95dB</span>
                    </div>
                    <div
                      className={`w-full h-6 rounded-full overflow-hidden p-1 border ${
                        activeThemeStyle.isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-150 ${
                          syncState.decibel > 75
                            ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                            : syncState.decibel > 60
                            ? 'bg-gradient-to-r from-emerald-500 to-amber-400'
                            : 'bg-gradient-to-r from-teal-400 to-emerald-400'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(5, ((syncState.decibel - 30) / 65) * 100))}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-slate-500">
                      {isMicActive ? '🎙️ 실시간 소음 모니터링 중' : '💡 마이크를 켜서 소음을 측정하세요'}
                    </span>
                  </div>
                </div>

                <div
                  className={`text-sm sm:text-base font-bold py-2 px-3 rounded-2xl border ${
                    activeThemeStyle.isLight
                      ? 'bg-sky-50 text-sky-700 border-sky-200'
                      : 'text-slate-300 bg-slate-950/60 border-slate-800/80'
                  }`}
                >
                  <span>💡 쉬는 시간에도 교실 내 소곤소곤 고운 말을 사용해요</span>
                </div>
              </div>

              {/* ========================================================= */}
              {/* [3사분면 - 좌측 하단]: 쉬는 시간 교실 주의사항             */}
              {/* ========================================================= */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border shadow-xl flex flex-col justify-between text-left transition-colors ${
                  activeThemeStyle.isLight
                    ? 'bg-white/95 border-slate-200 text-slate-800'
                    : 'bg-slate-900/95 border-slate-800 text-white'
                }`}
              >
                <div
                  className={`flex items-center justify-between border-b pb-2 mb-2 flex-wrap gap-2 ${
                    activeThemeStyle.isLight ? 'border-slate-100' : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-base sm:text-lg font-black text-amber-500">
                    <span>🚨</span>
                    <span>쉬는 시간 안전 &amp; 주의사항</span>
                  </div>

                  {/* 📏 텍스트 크기 조절 버튼 및 수정 버튼 */}
                  <div className="flex items-center gap-2">
                    <div
                      className={`inline-flex p-0.5 rounded-lg border text-[11px] ${
                        activeThemeStyle.isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      {[
                        { key: 'sm', label: '보통' },
                        { key: 'md', label: '크게' },
                        { key: 'lg', label: '특대' },
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setBreakTextScale(item.key as any);
                            localStorage.setItem('class_break_text_scale', item.key);
                          }}
                          className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                            breakTextScale === item.key
                              ? 'bg-amber-500 text-white shadow-xs'
                              : activeThemeStyle.isLight
                              ? 'text-slate-600 hover:text-slate-900'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!isEditingRules) {
                          setEditingRuleText(breakRules.join('\n'));
                        }
                        setIsEditingRules(!isEditingRules);
                      }}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition cursor-pointer active:scale-95 ${
                        activeThemeStyle.isLight
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                    >
                      {isEditingRules ? '✕ 닫기' : '✏️ 주의사항 수정'}
                    </button>
                  </div>
                </div>

                {isEditingRules ? (
                  <div className="space-y-2 flex-1 flex flex-col animate-fade-in">
                    <label
                      className={`text-[11px] font-bold ${
                        activeThemeStyle.isLight ? 'text-slate-600' : 'text-slate-400'
                      }`}
                    >
                      한 줄에 하나씩 주의사항을 입력하세요:
                    </label>
                    <textarea
                      rows={4}
                      value={editingRuleText}
                      onChange={(e) => setEditingRuleText(e.target.value)}
                      className={`w-full flex-1 p-2.5 rounded-xl text-xs border focus:outline-none custom-scroll resize-none ${
                        activeThemeStyle.isLight
                          ? 'bg-slate-50 text-slate-900 border-indigo-300'
                          : 'bg-slate-950 text-white border-indigo-500/50'
                      }`}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingRules(false)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold ${
                          activeThemeStyle.isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const lines = editingRuleText
                            .split('\n')
                            .map((l) => l.trim())
                            .filter(Boolean);
                          const nextRules = lines.length > 0 ? lines : breakRules;
                          setBreakRules(nextRules);
                          try {
                            localStorage.setItem('class_break_rules', JSON.stringify(nextRules));
                          } catch {}
                          setIsEditingRules(false);
                        }}
                        className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md"
                      >
                        저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 flex-1 flex flex-col justify-center">
                    {breakRules.map((rule, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-2.5 rounded-xl border transition-all ${getBreakRuleFontSize()} ${
                          activeThemeStyle.isLight
                            ? 'bg-slate-50 border-slate-200/90 text-slate-800 shadow-2xs'
                            : 'bg-slate-950/70 border-slate-800/80 text-slate-200'
                        }`}
                      >
                        <span className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-sm font-black shrink-0">
                          {idx + 1}
                        </span>
                        <span className="leading-snug">{rule}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ========================================================= */}
              {/* [4사분면 - 우측 하단]: 다음 시간 안내 & 준비물 (과목 직접 입력) */}
              {/* ========================================================= */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border shadow-xl flex flex-col justify-between text-left transition-colors ${
                  activeThemeStyle.isLight
                    ? 'bg-white/95 border-indigo-200 text-slate-800'
                    : 'bg-slate-900/95 border-indigo-500/40 text-white'
                }`}
              >
                <div
                  className={`flex items-center justify-between border-b pb-2 mb-2 flex-wrap gap-2 ${
                    activeThemeStyle.isLight ? 'border-indigo-100' : 'border-indigo-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔔</span>
                    <span className={`font-black text-amber-500 ${getBreakInfoFontSize().title}`}>
                      {breakNextAuto && !autoNextLesson
                        ? autoNoClass
                          ? `오늘은 수업이 없어요 (${autoNoClass})`
                          : '오늘 수업이 모두 끝났어요'
                        : `다음 ${syncState.breakNextPeriod || 2}교시 수업 안내`}
                    </span>
                    {breakNextAuto && autoNextLesson && (
                      <span className="text-[11px] font-bold opacity-70">{autoNextLesson.start} 시작</span>
                    )}
                  </div>

                  {/* 📏 텍스트 크기 조절 및 수정 버튼 */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* 🔁 시간표 자동 연동 / 수동 입력 */}
                    <div
                      className={`inline-flex p-0.5 rounded-lg border text-[11px] ${
                        activeThemeStyle.isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
                      }`}
                      data-dm-break-auto
                      title="자동: 위젯의 시간표와 시정표를 보고 다음 교시 · 과목을 저절로 채워요"
                    >
                      {([['auto', '🔁 시간표 자동'], ['manual', '✍️ 직접 입력']] as const).map(([k, label]) => (
                        <button
                          key={k}
                          type="button"
                          aria-pressed={(k === 'auto') === breakNextAuto}
                          onClick={() => setBreakNextAutoSaved(k === 'auto')}
                          className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                            (k === 'auto') === breakNextAuto
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : activeThemeStyle.isLight
                              ? 'text-slate-600 hover:text-slate-900'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div
                      className={`inline-flex p-0.5 rounded-lg border text-[11px] ${
                        activeThemeStyle.isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      {[
                        { key: 'sm', label: '보통' },
                        { key: 'md', label: '크게' },
                        { key: 'lg', label: '특대' },
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setBreakInfoScale(item.key as any);
                            localStorage.setItem('class_break_info_scale', item.key);
                          }}
                          className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                            breakInfoScale === item.key
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : activeThemeStyle.isLight
                              ? 'text-slate-600 hover:text-slate-900'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditBreakPeriod(syncState.breakNextPeriod || 2);
                        setEditBreakSubject(syncState.breakNextSubject || '수학');
                        setEditBreakAnnouncement(syncState.nextPeriodInfo || syncState.breakAnnouncement || '');
                        setIsEditingBreakInfo(!isEditingBreakInfo);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[11px] shadow-md transition cursor-pointer active:scale-95"
                    >
                      {isEditingBreakInfo ? '✕ 닫기' : '✏️ 수업·준비물 수정'}
                    </button>
                  </div>
                </div>

                {isEditingBreakInfo ? (
                  <div
                    className={`rounded-2xl p-3 border space-y-2.5 animate-fade-in flex-1 flex flex-col justify-between ${
                      activeThemeStyle.isLight
                        ? 'bg-slate-50 border-indigo-200'
                        : 'bg-slate-950/95 border-indigo-500/50'
                    }`}
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label
                          className={`block text-[10px] font-bold mb-1 ${
                            activeThemeStyle.isLight ? 'text-slate-600' : 'text-slate-300'
                          }`}
                        >
                          교시
                        </label>
                        <select
                          value={editBreakPeriod}
                          onChange={(e) => setEditBreakPeriod(Number(e.target.value))}
                          className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold border focus:outline-none ${
                            activeThemeStyle.isLight
                              ? 'bg-white text-slate-900 border-slate-300'
                              : 'bg-slate-800 text-white border-slate-700'
                          }`}
                        >
                          {[1, 2, 3, 4, 5, 6, 7].map((p) => (
                            <option key={p} value={p}>{p}교시</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          className={`block text-[10px] font-bold mb-1 ${
                            activeThemeStyle.isLight ? 'text-slate-600' : 'text-slate-300'
                          }`}
                        >
                          과목명 (직접 텍스트 입력)
                        </label>
                        <input
                          type="text"
                          value={editBreakSubject}
                          onChange={(e) => setEditBreakSubject(e.target.value)}
                          placeholder="예: 수학, 미술, 체육(강당)"
                          className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold border focus:outline-none ${
                            activeThemeStyle.isLight
                              ? 'bg-white text-slate-900 border-slate-300 focus:border-indigo-500'
                              : 'bg-slate-800 text-white border-slate-700 focus:border-indigo-500'
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        className={`block text-[10px] font-bold mb-1 ${
                          activeThemeStyle.isLight ? 'text-slate-600' : 'text-slate-300'
                        }`}
                      >
                        준비사항 및 알림
                      </label>
                      <textarea
                        rows={2}
                        value={editBreakAnnouncement}
                        onChange={(e) => setEditBreakAnnouncement(e.target.value)}
                        placeholder="예: 교과서, 필기도구 책상 위에 준비"
                        className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold border focus:outline-none resize-none ${
                          activeThemeStyle.isLight
                            ? 'bg-white text-slate-900 border-slate-300 focus:border-indigo-500'
                            : 'bg-slate-800 text-white border-slate-700 focus:border-indigo-500'
                        }`}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsEditingBreakInfo(false)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                          activeThemeStyle.isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          // 교시 · 과목 · 안내 문구를 직접 고치면 '직접 입력'으로 (자동이 덮어쓰지 않게)
                          if (
                            editBreakPeriod !== syncState.breakNextPeriod ||
                            editBreakSubject !== syncState.breakNextSubject ||
                            editBreakAnnouncement.trim() !== String(syncState.nextPeriodInfo || syncState.breakAnnouncement || '').trim()
                          )
                            setBreakNextAutoSaved(false);
                          updateState({
                            breakNextPeriod: editBreakPeriod,
                            breakNextSubject: editBreakSubject,
                            breakAnnouncement: editBreakAnnouncement,
                            nextPeriodInfo: editBreakAnnouncement,
                          });
                          setIsEditingBreakInfo(false);
                        }}
                        className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md cursor-pointer"
                      >
                        저장하기
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="dm-binfo flex-1 flex flex-col justify-center gap-3" data-dm-break-info>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`${activeThemeStyle.isLight ? 'text-slate-600' : 'text-slate-400'} ${getBreakInfoFontSize().period}`}>다음 과목</span>
                      <input
                        type="text"
                        value={syncState.breakNextSubject || '수학'}
                        onChange={(e) => { if (breakNextAuto) setBreakNextAutoSaved(false); updateState({ breakNextSubject: e.target.value }); }}
                        className={`dm-binfo-subject flex-1 min-w-0 px-4 py-2 rounded-2xl text-white border shadow-md focus:outline-none ${getBreakInfoFontSize().subject} ${
                          activeThemeStyle.isLight ? 'bg-indigo-500 border-indigo-400' : 'bg-indigo-600/90 border-indigo-400/50'
                        }`}
                        title={breakNextAuto ? '시간표에서 자동으로 채웠어요. 고치면 직접 입력으로 바뀌어요' : '눌러서 다음 과목을 바로 고칠 수 있어요'}
                      />
                    </div>

                    <div className={`dm-candy tone-indigo ${activeThemeStyle.isLight ? '' : 'is-dark'}`}>
                      <div className="dm-candy-head">📌 다음 과목 및 준비물 안내</div>
                      <div className={`leading-snug ${getBreakInfoFontSize().notice}`}>
                        {breakNextAuto
                          ? autoNextLesson?.info || (autoNoClass ? '오늘은 수업이 없는 날이에요 🌈' : '오늘 수업이 모두 끝났어요. 내일 시간표를 확인해요 🎒')
                          : syncState.nextPeriodInfo || syncState.breakAnnouncement || '수학책, 수학익힘책 38~41쪽, 연필, 지우개 준비'}
                      </div>
                    </div>

                    <div className={`dm-candy tone-mint ${activeThemeStyle.isLight ? '' : 'is-dark'}`} data-dm-break-todo>
                      <div className="dm-candy-head flex items-center justify-between gap-2">
                        <span>✅ 미리 하세요</span>
                        {breakTodoEdit === null && (
                          <button type="button" className="dm-candy-edit" data-dm-break-todo-edit onClick={() => setBreakTodoEdit(breakTodos.join('\n'))}>
                            ✏️ 고치기
                          </button>
                        )}
                      </div>
                      {breakTodoEdit !== null ? (
                        <div className="space-y-2">
                          <textarea
                            rows={3}
                            autoFocus
                            value={breakTodoEdit}
                            onChange={(e) => setBreakTodoEdit(e.target.value)}
                            placeholder={'한 줄에 하나씩\n예) 💧 물 마시고 손 씻기'}
                            className="dm-candy-input"
                            data-dm-break-todo-input
                          />
                          <div className="flex justify-end gap-2">
                            <button type="button" className="dm-medit-cancel" onClick={() => setBreakTodoEdit(null)}>
                              취소
                            </button>
                            <button
                              type="button"
                              className="dm-medit-save !bg-emerald-500"
                              data-dm-break-todo-save
                              onClick={() => {
                                const lines = breakTodoEdit.split('\n').map((l) => l.trim()).filter(Boolean);
                                setBreakTodos(lines);
                                try {
                                  localStorage.setItem('class_break_todos', JSON.stringify(lines));
                                } catch {}
                                setBreakTodoEdit(null);
                              }}
                            >
                              저장
                            </button>
                          </div>
                        </div>
                      ) : breakTodos.length ? (
                        <div className="flex flex-wrap gap-2">
                          {breakTodos.map((t, i) => (
                            <span key={i} className={`dm-candy-pill ${getBreakInfoFontSize().todo}`}>
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm font-bold opacity-60">✏️ 고치기를 눌러 적어 주세요</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* 🎵 쉬는 시간 음악 (유튜브 · 내 MP3) */}
            <CleanBgmPlayer compact storeKey="class_break_bgm" defaultTracks={[]} label="쉬는 시간 음악" isLightMode={activeThemeStyle.isLight} isActiveTab={syncState.activeTab === 'break'} />
          </div></AutoFitStage>
        )}

        {/* ========================================================== */}
        {/* TAB 6: CLEANING TIME */}
        {/* ========================================================== */}
        {syncState.activeTab === 'clean' && (
          <AutoFitStage base={1060} data-testid="fit-clean"><div className="w-full flex flex-col items-center justify-center space-y-6 animate-fade-in text-center">
            {/* Top Indicator & Realtime Clock */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-black tracking-wide shadow-md">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>하교 준비 및 정리정돈 하기</span>
              </div>
              {/* 🕒 청소종례 실시간 현재 시각 시계 (대형 배지) */}
              <div
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl border font-black shadow-md ${
                  activeThemeStyle.isLight
                    ? 'bg-white/95 border-emerald-200 text-slate-800'
                    : 'bg-slate-900/90 border-emerald-500/50 text-emerald-300'
                }`}
              >
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 animate-pulse shrink-0" />
                <span className="text-xs sm:text-sm opacity-90">{currentTime.fullDate}</span>
                <span className="font-mono font-black text-sm sm:text-xl px-2.5 py-0.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  {currentTime.timeWithSeconds}
                </span>
              </div>
            </div>

            {/* Huge Synchronized Clean Timer (화면 빈 영역을 가득 채우는 초대형 웅장 clamp 배율) */}
            <div className="relative py-2 sm:py-4 w-full flex flex-col items-center justify-center overflow-visible">
              {cleanWarn && (
                <div key={cleanWarn.at} className={`dm-clean-warn ${cleanWarn.sec <= 30 ? 'is-30' : ''}`} data-dm-clean-warn>
                  ⏰ {cleanWarn.sec === 60 ? '1분' : '30초'} 남았어요! 마무리해요
                </div>
              )}
              <div
                key={cleanWarn ? `w${cleanWarn.at}` : 'n'}
                style={{ fontSize: `calc(${getTimerFontSize(true)} * 1.32)`, lineHeight: 1 }}
                className={`${cuteFontClass} dm-clean-digits font-black tracking-tight text-emerald-400 drop-shadow-[0_0_35px_rgba(52,211,153,0.35)] leading-none tabular-nums select-none whitespace-nowrap ${
                  cleanWarn ? 'is-shake' : ''
                } ${syncState.isCleanTimerRunning && syncState.cleanTimerSeconds > 0 && syncState.cleanTimerSeconds <= 10 ? 'is-final' : ''} ${
                  syncState.isCleanTimerRunning && syncState.cleanTimerSeconds <= 30 && syncState.cleanTimerSeconds > 10 ? 'is-hurry' : ''
                }`}
                data-dm-clean-digits
              >
                {formatTime(syncState.cleanTimerSeconds)}
              </div>
              {/* 조절 버튼: 한 줄 · 같은 높이의 캔디바 */}
              <div className="dm-cbars" data-dm-clean-bars>
                <span className={`dm-cbar is-state ${syncState.isCleanTimerRunning ? 'is-run' : ''}`}>
                  <i />
                  {syncState.isCleanTimerRunning ? '작동 중' : '멈춤'}
                </span>
                <button type="button" className={`dm-cbar ${syncState.isCleanTimerRunning ? 'is-pause' : 'is-play'}`} onClick={() => updateState({ isCleanTimerRunning: !syncState.isCleanTimerRunning })} data-dm-clean-toggle>
                  {syncState.isCleanTimerRunning ? '⏸ 일시 정지' : '▶ 시작'}
                </button>
                <button type="button" className="dm-cbar" onClick={() => updateState({ cleanTimerSeconds: 600, isCleanTimerRunning: false })}>
                  ↺ 10분
                </button>
                <span className="dm-cbar-sep" />
                <button type="button" className="dm-cbar is-minus" onClick={() => updateState({ cleanTimerSeconds: Math.max(0, syncState.cleanTimerSeconds - 60) })} title="1분 줄이기">
                  −1분
                </button>
                <button type="button" className="dm-cbar is-minus2" onClick={() => updateState({ cleanTimerSeconds: Math.max(0, syncState.cleanTimerSeconds - 10) })} title="10초 줄이기">
                  −10초
                </button>
                <button type="button" className="dm-cbar is-plus2" onClick={() => updateState({ cleanTimerSeconds: syncState.cleanTimerSeconds + 10 })} title="10초 늘리기">
                  +10초
                </button>
                <button type="button" className="dm-cbar is-plus" onClick={() => updateState({ cleanTimerSeconds: syncState.cleanTimerSeconds + 60 })} title="1분 늘리기">
                  +1분
                </button>
              </div>
            </div>


            {/* LIVE NEON MARQUEE BANNER (전광판과 타이머가 동시에 보이도록 구현) */}
            <div className="dm-marquee-board w-full bg-slate-950 rounded-3xl p-5 sm:p-6 border-2 border-emerald-500/50 shadow-2xl relative">
              <div className="dm-marquee-lumi" aria-hidden>
                <MochiBody face="excited" tint={mochiTint} glow="low" className="w-full h-full" />
                <span className="dm-marquee-mega">📣</span>
              </div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs text-slate-400">
                <div className="flex items-center gap-2 font-bold text-emerald-300">
                  <span>📢</span>
                  <span>실시간 종례 & 청소 안내 전광판</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 tabular-nums">
                    {cleanDisplayNotices.length > 0 ? `${(cleanNoticeIndex % cleanDisplayNotices.length) + 1} / ${cleanDisplayNotices.length}` : '1 / 1'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="dm-speed"
                    ref={cleanWheelRef}
                    data-dm-speed
                    title="마우스 휠을 위로 굴리면 빨라지고, 아래로 굴리면 느려져요"
                  >
                    <button type="button" className="dm-speed-btn" onClick={() => stepCleanSpeed(-1)} aria-label="느리게" data-dm-speed-down>
                      🐢
                    </button>
                    <div className="dm-speed-meter" aria-label={`속도 ${cleanSpeedLevel + 1}단계`}>
                      <span className="dm-speed-wheel" aria-hidden>
                        🖱️
                      </span>
                      <span className="dm-speed-dots">
                        {CLEAN_SPEEDS.map((_, i) => (
                          <i key={i} className={i <= cleanSpeedLevel ? 'is-on' : ''} />
                        ))}
                      </span>
                      <b data-dm-speed-level>{cleanSpeedLevel + 1}단계</b>
                    </div>
                    <button type="button" className="dm-speed-btn" onClick={() => stepCleanSpeed(1)} aria-label="빠르게" data-dm-speed-up>
                      🐇
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditCleanNoticesText(cleanDisplayNotices.join('\n'));
                      setEditCleanNeonColor(syncState.cleanNeonColor || 'cyan');
                      setEditCleanBannerSpeed(syncState.cleanBannerSpeed || 34);
                      setEditCleanFontSize(syncState.cleanFontSize || 'md');
                      setIsEditingCleanNotices(!isEditingCleanNotices);
                    }}
                    className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition cursor-pointer active:scale-95"
                  >
                    {isEditingCleanNotices ? '✕ 닫기' : '✏️ 전광판 문구·테마 설정'}
                  </button>
                </div>
              </div>

              {/* 편집 모드일 때 전광판 인라인 수정 폼 */}
              {isEditingCleanNotices && (
                <div className="bg-slate-900/95 rounded-2xl p-4 border border-emerald-500/50 mb-4 space-y-3 text-left animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      전광판 흘러갈 문구 목록 (한 줄에 하나씩 작성)
                    </label>
                    <textarea
                      rows={3}
                      value={editCleanNoticesText}
                      onChange={(e) => setEditCleanNoticesText(e.target.value)}
                      placeholder="예: 🧹 바닥 쓸기 팀은 빗자루 정리함에 가지런히 정돈하기&#10;🪟 창틀 닦기 팀은 물걸레 꽉 짜서 먼지 닦기&#10;🎒 의자는 책상 위에 올리고 사물함 문 닫기"
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold border border-slate-700 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">네온 컬러 테마</label>
                      <select
                        value={editCleanNeonColor}
                        onChange={(e) => setEditCleanNeonColor(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-bold border border-slate-700 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="cyan">하늘색 (Cyan)</option>
                        <option value="green">에메랄드 (Green)</option>
                        <option value="pink">네온 핑크 (Pink)</option>
                        <option value="yellow">골드 옐로 (Yellow)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">흘러가는 속도</label>
                      <select
                        value={editCleanBannerSpeed}
                        onChange={(e) => setEditCleanBannerSpeed(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-bold border border-slate-700 focus:outline-none focus:border-emerald-500"
                      >
                        {!CLEAN_SPEEDS.includes(editCleanBannerSpeed) && <option value={editCleanBannerSpeed}>지금 값 ({editCleanBannerSpeed}초)</option>}
                        <option value={5}>번개처럼 (5초)</option>
                        <option value={7}>아주 빠르게 (7초)</option>
                        <option value={9}>더 빠르게 (9초)</option>
                        <option value={12}>빠르게 (12초)</option>
                        <option value={16}>조금 빠르게 (16초)</option>
                        <option value={20}>보통보다 빠르게 (20초)</option>
                        <option value={26}>보통 (26초)</option>
                        <option value={34}>천천히 (34초)</option>
                        <option value={45}>느리게 (45초)</option>
                        <option value={60}>아주 느리게 (60초)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">글자 크기</label>
                      <select
                        value={editCleanFontSize}
                        onChange={(e) => setEditCleanFontSize(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-bold border border-slate-700 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="sm">작게</option>
                        <option value="md">보통 (권장)</option>
                        <option value="lg">크게</option>
                        <option value="xl">아주 크게</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingCleanNotices(false)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const lines = editCleanNoticesText
                          .split('\n')
                          .map((s) => s.trim())
                          .filter(Boolean);
                        const targetList = lines.length > 0 ? lines : cleanDisplayNotices;
                        const formattedNotices = targetList.map((t, idx) => ({
                          id: `notice-${Date.now()}-${idx}`,
                          text: t,
                          createdAt: new Date().toISOString(),
                        }));
                        updateState({
                          cleanNotices: formattedNotices,
                          cleanNeonColor: editCleanNeonColor as any,
                          cleanBannerSpeed: editCleanBannerSpeed,
                          cleanFontSize: editCleanFontSize as any,
                        });
                        setIsEditingCleanNotices(false);
                      }}
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-black shadow-md transition cursor-pointer active:scale-95"
                    >
                      저장하기
                    </button>
                  </div>
                </div>
              )}

              {/* Flowing Marquee Strip (단일 항목 순차 롤링) */}
              <div
                ref={cleanWheelRef}
                className="dm-led overflow-hidden whitespace-nowrap relative bg-black/50 rounded-2xl border border-slate-800/80 h-28 sm:h-36"
                title="휠을 굴려 속도를 바꿀 수 있어요"
              >
                {/* 글씨는 전구 테두리 안쪽 창에서만 흘러가요 */}
                <div className="dm-led-window" data-dm-led-window>
                <div
                  key={`dual-marquee-${cleanNoticeIndex}-${cleanMarqueeKey}`}
                  onAnimationEnd={handleCleanAnimationEnd}
                  className={`animate-marquee-single ${
                    syncState.cleanNeonColor === 'pink'
                      ? 'text-pink-400'
                      : syncState.cleanNeonColor === 'yellow'
                      ? 'text-amber-300'
                      : syncState.cleanNeonColor === 'green'
                      ? 'text-emerald-400'
                      : 'text-cyan-400'
                  } ${
                    syncState.cleanFontSize === 'sm'
                      ? 'text-3xl sm:text-4xl font-black'
                      : syncState.cleanFontSize === 'lg'
                      ? 'text-5xl sm:text-7xl font-black'
                      : syncState.cleanFontSize === 'xl'
                      ? 'text-6xl sm:text-8xl font-black'
                      : 'text-4xl sm:text-6xl font-black'
                  } tracking-wide select-none`}
                  style={{
                    animationDuration: `${syncState.cleanBannerSpeed || 34}s`,
                    ...(syncState.cleanNeonGlow
                      ? {
                          textShadow:
                            syncState.cleanNeonColor === 'pink'
                              ? '0 0 10px #f472b6, 0 0 20px #db2777, 0 0 40px #be185d'
                              : syncState.cleanNeonColor === 'yellow'
                              ? '0 0 10px #fde047, 0 0 20px #eab308, 0 0 40px #ca8a04'
                              : syncState.cleanNeonColor === 'green'
                              ? '0 0 10px #4ade80, 0 0 20px #16a34a, 0 0 40px #15803d'
                              : '0 0 10px #38bdf8, 0 0 20px #0284c7, 0 0 40px #0369a1',
                        }
                      : {}),
                  }}
                >
                  {currentCleanNoticeText}
                </div>
                </div>
              </div>

              {/* Clean checklist badges (교사가 문구 수정 및 글자 크기 조절 가능) */}
              <div className="mt-5 pt-4 border-t border-slate-800/80">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🧹</span>
                    <span className="text-xs sm:text-sm font-black text-slate-200">
                      하교 전 청소 &amp; 정리정돈 체크리스트
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* 글자 크기 조절 버튼 */}
                    <div
                      className={`inline-flex p-0.5 rounded-lg border text-[11px] ${
                        activeThemeStyle.isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      {[
                        { key: 'sm', label: '보통' },
                        { key: 'md', label: '크게' },
                        { key: 'lg', label: '특대' },
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setCleanChecklistScale(item.key as any);
                            localStorage.setItem('class_clean_checklist_scale', item.key);
                          }}
                          className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                            cleanChecklistScale === item.key
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : activeThemeStyle.isLight
                              ? 'text-slate-600 hover:text-slate-900'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!isEditingCleanChecklist) {
                          setEditingCleanChecklistText(cleanChecklist.join('\n'));
                        }
                        setIsEditingCleanChecklist(!isEditingCleanChecklist);
                      }}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition cursor-pointer active:scale-95 ${
                        activeThemeStyle.isLight
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                    >
                      {isEditingCleanChecklist ? '✕ 닫기' : '✏️ 체크리스트 문구 수정'}
                    </button>
                  </div>
                </div>

                {isEditingCleanChecklist ? (
                  <div
                    className={`p-3.5 rounded-2xl border space-y-2.5 mb-3 text-left animate-fade-in ${
                      activeThemeStyle.isLight
                        ? 'bg-slate-50 border-emerald-300'
                        : 'bg-slate-900/95 border-emerald-500/50'
                    }`}
                  >
                    <label
                      className={`block text-[11px] font-bold ${
                        activeThemeStyle.isLight ? 'text-slate-600' : 'text-slate-300'
                      }`}
                    >
                      하단에 표시할 체크리스트 항목을 한 줄에 하나씩 입력하세요:
                    </label>
                    <textarea
                      rows={4}
                      value={editingCleanChecklistText}
                      onChange={(e) => setEditingCleanChecklistText(e.target.value)}
                      placeholder="1. 책상 서랍 정돈&#10;2. 자기 자리 바닥 쓸기&#10;3. 1인 1역 청소 완수&#10;4. 의자 넣고 하교"
                      className={`w-full p-2.5 rounded-xl text-xs font-bold border focus:outline-none resize-none ${
                        activeThemeStyle.isLight
                          ? 'bg-white text-slate-900 border-slate-300 focus:border-emerald-500'
                          : 'bg-slate-800 text-white border-slate-700 focus:border-emerald-500'
                      }`}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingCleanChecklist(false)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold ${
                          activeThemeStyle.isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const lines = editingCleanChecklistText
                            .split('\n')
                            .map((l) => l.trim())
                            .filter(Boolean);
                          const nextList = lines.length > 0 ? lines : cleanChecklist;
                          setCleanChecklist(nextList);
                          try {
                            localStorage.setItem('class_clean_checklist', JSON.stringify(nextList));
                          } catch {}
                          setIsEditingCleanChecklist(false);
                        }}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md"
                      >
                        저장하기
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`grid gap-2.5 ${
                      cleanChecklist.length <= 2
                        ? 'grid-cols-1 sm:grid-cols-2'
                        : cleanChecklist.length === 3
                        ? 'grid-cols-1 sm:grid-cols-3'
                        : 'grid-cols-2 sm:grid-cols-4'
                    }`}
                  >
                    {cleanChecklist.map((item, idx) => (
                      <div
                        key={idx}
                        className={`rounded-2xl border text-center transition-all select-none shadow-xs flex items-center justify-center ${getCleanChecklistSize()} ${
                          activeThemeStyle.isLight
                            ? 'bg-white/95 border-slate-200 text-slate-800 hover:border-emerald-400'
                            : 'bg-slate-900/90 border-slate-800 text-slate-200 hover:border-emerald-500/60'
                        }`}
                      >
                        <span className="truncate">{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* 🎧 청소 음악 (작은 한 줄 플레이어) */}
            <CleanBgmPlayer
              compact
              isLightMode={activeThemeStyle.isLight}
              isActiveTab={syncState.activeTab === 'clean'}
              cleanTimerSeconds={syncState.cleanTimerSeconds}
              isCleanTimerRunning={syncState.isCleanTimerRunning}
            />
          </div></AutoFitStage>
        )}

        {/* ========================================================== */}
        {/* TAB 8: SEATING & TEAMS (대화면 프로젝터/TV 좌석·모둠 배치도) */}
        {/* ========================================================== */}
        {syncState.activeTab === 'seating' && (() => {
          // 🪑 분단 및 시점 데이터 계산 (학생 시점 vs 교사 시점)
          // 1) 기본 학생 시점(student) 기준 분단 데이터 생성: 1분단 -> N분단, 각 분단은 앞자리 -> 뒷자리
          // 분단별 인원 수(저장값) 기준 분단 구성 (학생을 분단에 '넣기' 지원)
          const baseCols: { colNumber: number; students: typeof effectiveStudents }[] = buildColumns(
            effectiveStudents,
            individualColumns
          ).map((students, i) => ({ colNumber: i + 1, students }));

          // 2) 시점에 따른 분단 배치 및 내부 좌석 정렬:
          // - 학생 시점(student): 칠판이 화면 상단(앞). 화면 왼쪽부터 1분단 -> N분단, 각 분단 위쪽이 앞자리 -> 아래쪽이 뒷자리
          // - 교사 시점(teacher): 칠판이 화면 하단(교탁 앞). 화면 왼쪽부터 N분단 -> 1분단 (좌우 반전!), 각 분단 위쪽이 뒷자리 -> 아래쪽이 앞자리
          const individualColsData = seatingPerspective === 'student'
            ? baseCols.map((c) => ({ colNumber: c.colNumber, students: [...c.students] }))
            : [...baseCols].reverse().map((c) => ({ colNumber: c.colNumber, students: [...c.students].reverse() }));

          // 👥 모둠좌석 시점 반전 (학생 시점: 1모둠->N모둠, 교사 시점: N모둠->1모둠 역순 반전)
          const displayTeams = seatingPerspective === 'student' ? effectiveTeams : [...effectiveTeams].reverse();

          return (
            <AutoFitStage base={1200} max={1} maxStretch={3} data-testid="fit-seating"><div className="w-full max-w-[2400px] mx-auto flex flex-col space-y-3 sm:space-y-4 animate-fade-in flex-1 dm-wide-tab">
              {/* Top Indicator & Guidance */}
              <div
                className={`flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border shadow-sm transition-colors ${
                  activeThemeStyle.isLight
                    ? 'bg-white/95 backdrop-blur-sm border-slate-200/90 text-slate-800 shadow-sm'
                    : 'bg-slate-900/90 border-slate-800 text-white shadow-md'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                      activeThemeStyle.isLight
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-indigo-500/20 text-indigo-400'
                    }`}
                  >
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h2
                      className={`text-base sm:text-xl font-black flex items-center gap-2 ${
                        activeThemeStyle.isLight ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      <span>학급 좌석 배치도</span>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          activeThemeStyle.isLight
                            ? 'text-indigo-700 bg-indigo-50 border-indigo-200'
                            : 'text-indigo-300 bg-indigo-950/70 border-indigo-700/50'
                        }`}
                      >
                        대형 화면 송출
                      </span>
                    </h2>
                    <p
                      className={`text-xs font-medium mt-0.5 ${
                        activeThemeStyle.isLight ? 'text-slate-600' : 'text-slate-400'
                      }`}
                    >
                      총 {effectiveStudents.length}명 재실 · {seatingType === 'individual' ? `개인좌석 (${individualColumns}열 분단)` : `모둠좌석 (${seatingColumns}열)`}
                    </p>
                  </div>
                </div>

                {/* 좌석 모드 토글: [👥 모둠좌석] vs [🪑 개인좌석] & 이름 크기 조절 */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* 🎰 두근두근 자리 뽑기 (전체 화면 새 창) */}
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const url = `${window.location.origin}${window.location.pathname}?mode=seatdraw`;
                        const w = window.screen?.availWidth || 1600;
                        const h = window.screen?.availHeight || 900;
                        window.open(url, 'classin_seatdraw', `width=${w},height=${h},left=0,top=0,menubar=no,toolbar=no,location=no,status=no,resizable=yes`);
                      } catch {}
                    }}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-pink-500 to-violet-500 shadow-md hover:brightness-110 transition cursor-pointer flex items-center gap-1"
                    title="뽑기 기계로 자리를 정해요 (전체 화면 새 창)"
                    data-seatdraw-open
                  >
                    🎰 자리 뽑기
                  </button>
                  {/* 📏 이름 크기 조절 버튼 */}
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold ${
                      activeThemeStyle.isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <span className={activeThemeStyle.isLight ? 'text-slate-600' : 'text-slate-400'}>이름 크기:</span>
                    <div className="inline-flex gap-0.5">
                      {[
                        { key: 'sm', label: '보통' },
                        { key: 'md', label: '크게' },
                        { key: 'lg', label: '특대' },
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setSeatingNameScale(item.key as any);
                            writeSeatingSetting('class_seating_name_scale', item.key);
                          }}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-black transition cursor-pointer ${
                            seatingNameScale === item.key
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : activeThemeStyle.isLight
                              ? 'text-slate-600 hover:text-slate-900'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    className={`flex items-center p-1 rounded-xl border ${
                      activeThemeStyle.isLight
                        ? 'bg-slate-100/90 border-slate-200'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSeatingType('individual');
                        try { writeSeatingSetting('class_seating_view_type', 'individual'); } catch {}
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                        seatingType === 'individual'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : activeThemeStyle.isLight
                          ? 'text-slate-600 hover:text-slate-900'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>🪑 개인좌석 (1열 형태)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSeatingType('team');
                        try { writeSeatingSetting('class_seating_view_type', 'team'); } catch {}
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                        seatingType === 'team'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : activeThemeStyle.isLight
                          ? 'text-slate-600 hover:text-slate-900'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>👥 모둠좌석</span>
                    </button>
                  </div>

                  {/* 개인좌석일 때: 열 수 조절 버튼 (기본 3열, 2~6열 조절) */}
                  {seatingType === 'individual' ? (
                    <div
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-bold ${
                        activeThemeStyle.isLight
                          ? 'bg-slate-100/90 border-slate-200 text-slate-700'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="text-[11px] text-indigo-500 font-bold mr-1">배열:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.max(2, individualColumns - 1);
                          setIndividualColumns(next);
                          try { writeSeatingSetting('class_seating_individual_columns', String(next)); } catch {}
                          resetColumnSizes();
                        }}
                        disabled={individualColumns <= 2}
                        className={`w-5 h-5 rounded flex items-center justify-center font-black cursor-pointer disabled:opacity-30 ${
                          activeThemeStyle.isLight
                            ? 'bg-white hover:bg-slate-200 text-slate-700 shadow-2xs border border-slate-200'
                            : 'bg-slate-800 hover:bg-slate-700 text-white'
                        }`}
                        title="열 줄이기"
                      >
                        -
                      </button>
                      <span
                        className={`px-1 font-black font-mono ${
                          activeThemeStyle.isLight ? 'text-indigo-600' : 'text-amber-300'
                        }`}
                      >
                        {individualColumns}열
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.min(6, individualColumns + 1);
                          setIndividualColumns(next);
                          try { writeSeatingSetting('class_seating_individual_columns', String(next)); } catch {}
                          resetColumnSizes();
                        }}
                        disabled={individualColumns >= 6}
                        className={`w-5 h-5 rounded flex items-center justify-center font-black cursor-pointer disabled:opacity-30 ${
                          activeThemeStyle.isLight
                            ? 'bg-white hover:bg-slate-200 text-slate-700 shadow-2xs border border-slate-200'
                            : 'bg-slate-800 hover:bg-slate-700 text-white'
                        }`}
                        title="열 늘리기"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    /* 모둠좌석일 때: 2열 / 3열 선택 */
                    <div
                      className={`flex items-center p-1 rounded-xl border ${
                        activeThemeStyle.isLight
                          ? 'bg-slate-100/90 border-slate-200'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSeatingColumns(2)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          seatingColumns === 2
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : activeThemeStyle.isLight
                            ? 'text-slate-600 hover:text-slate-900'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        2열 모둠
                      </button>
                      <button
                        type="button"
                        onClick={() => setSeatingColumns(3)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          seatingColumns === 3
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : activeThemeStyle.isLight
                            ? 'text-slate-600 hover:text-slate-900'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        3열 모둠
                      </button>
                    </div>
                  )}

                  {/* 🪑 책상 배치 편집 (모둠좌석): 자유 이동 → 정렬 */}
                  {seatingType === 'team' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDeskEditing((v) => !v)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 border cursor-pointer active:scale-95 ${
                          deskEditing
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : activeThemeStyle.isLight
                            ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-2xs'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                        }`}
                        title="모둠 안 책상을 끌어 원하는 위치에 놓습니다 (학급마다 다른 책상 배치)"
                      >
                        <span>🪑</span>
                        <span>{deskEditing ? '배치 완료' : '책상 배치'}</span>
                      </button>
                      {deskEditing && (
                        <>
                          <button
                            type="button"
                            onClick={handleAlignDesks}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 border cursor-pointer active:scale-95 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                            title="자유롭게 놓은 책상을 일정한 간격으로 맞춥니다"
                          >
                            <span>📐</span>
                            <span>정렬</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => resetDeskLayout()}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 border cursor-pointer active:scale-95 ${
                              activeThemeStyle.isLight
                                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                            }`}
                            title="모든 모둠 책상을 기본 배치(홀수 인원은 1·2·2)로 되돌립니다"
                          >
                            <span>↺</span>
                            <span>기본 배치</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* 시점 전환 */}
                  {perspectiveToggle(true)}
                </div>

                {/* 칠판 & 전자교탁 방향 가이드 바 */}
                <div className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 text-white font-black shadow-md flex items-center justify-center gap-2 text-xs sm:text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-ping" />
                  <span>{seatingPerspective === 'student' ? '칠판 앞쪽 (학생 시점)' : '교실 앞쪽 (교사 시점)'}</span>
                </div>
              </div>

              {/* 토스트 피드백 알림 바 */}
              {attendanceToastMessage && (
                <div className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white font-black text-center shadow-lg flex items-center justify-center gap-2 text-xs sm:text-sm animate-pulse border border-white/20">
                  <span>{attendanceToastMessage}</span>
                </div>
              )}

              {/* 🟩 상단 위치 인디케이터 (학생 시점: 칠판 / 교사 시점: 교실 뒤편) */}
              {seatingPerspective === 'student' ? (
                <div className="w-full py-2 px-4 rounded-2xl bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-800 text-white font-black text-center shadow-md flex items-center justify-center gap-2 text-xs sm:text-sm border border-emerald-500/50 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-pulse" />
                  <span>🟩 [ 전자칠판 &amp; 교탁 (교실 앞) ]</span>
                  <span className="text-[11px] font-normal opacity-85 hidden sm:inline">← 칠판을 바라보는 학생 시점 (왼쪽: 1분단)</span>
                </div>
              ) : (
                <div className="w-full py-2 px-4 rounded-2xl bg-gradient-to-r from-slate-700 via-slate-800 to-slate-700 text-slate-200 font-black text-center shadow-md flex items-center justify-center gap-2 text-xs sm:text-sm border border-slate-600/60 shrink-0">
                  <span>🚪 [ 교실 뒤편 (사물함 &amp; 뒷문 방면) ]</span>
                  <span className="text-[11px] font-normal opacity-85 hidden sm:inline">← 교탁에서 학생들을 바라보는 교사 시점 (오른쪽: 1분단)</span>
                </div>
              )}

              {/* 1. 개인좌석 1열 배치 뷰 (기본 3열, 1열로 나란히 앉는 책상 형태) */}
              {seatingType === 'individual' ? (
                <div
                  className="grid gap-3 flex-1 overflow-y-auto custom-scroll pr-1"
                  style={{
                    gridTemplateColumns: `repeat(${individualColumns}, minmax(0, 1fr))`,
                  }}
                >
                  {renderIndividualCols('seating', individualColsData)}
                </div>
              ) : (
                /* 2. 기존 모둠좌석 그리드 (2열 / 3열 반응형 지원, displayTeams 적용) */
                <div
                  className={`grid gap-4 flex-1 overflow-y-auto custom-scroll pr-1 ${
                    seatingColumns === 3 ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'
                  }`}
                >
                  {renderTeamSeatCards('seating', displayTeams)}
                </div>
              )}

              {/* 🚪 하단 위치 인디케이터 (학생 시점: 교실 뒤편 / 교사 시점: 칠판) */}
              {seatingPerspective === 'student' ? (
                <div className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-slate-700 via-slate-800 to-slate-700 text-slate-300 font-bold text-center text-xs border border-slate-600/40 flex items-center justify-center gap-2 shrink-0">
                  <span>🚪 [ 교실 뒤편 (사물함 &amp; 뒷문 방면) ]</span>
                </div>
              ) : (
                <div className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-800 text-white font-black text-center shadow-md flex items-center justify-center gap-2 text-xs sm:text-sm border border-emerald-500/50 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-pulse" />
                  <span>🟩 [ 전자칠판 &amp; 교탁 (교사 교탁 앞) ]</span>
                </div>
              )}
            </div></AutoFitStage>
          );
        })()}
      </main>

      {/* Footer bar */}
      <footer data-dm-footer="1"
        className={`px-6 py-2.5 border-t flex items-center justify-between text-xs shrink-0 transition-colors ${
          activeThemeStyle.isLight
            ? 'bg-white/80 border-slate-200 text-slate-800'
            : 'bg-slate-900 border-slate-800 text-slate-400'
        }`}
      >
        <div className="flex items-center gap-2">
          <span>Class in 보조모니터 프로젝터 모드</span>
          <span>•</span>
          <span>F11을 눌러 브라우저 전체화면으로 감상하세요</span>
        </div>
        <div
          className={`text-[11px] font-mono ${
            activeThemeStyle.isLight ? 'text-indigo-600 font-bold' : 'text-slate-500'
          }`}
        >
          STATUS: ONLINE (SYNCED)
        </div>
      </footer>
    </div>
    </>
  );
};
