import React, { useState, useEffect, useRef } from 'react';
import { OwnerBadge } from './OwnerBadge';
import {
  Settings2,
  Calendar,
  Bell,
  Utensils,
  Users,
  BookOpen,
  Briefcase,
  Monitor,
  Sliders,
  Plus,
  ChevronDown,
  Building2,
  ExternalLink,
  RotateCcw,
  GripVertical,
  GraduationCap,
  Info,
  X,
  AlertCircle,
  Sparkles,
  Play,
  Laptop,
  Lock,
  Keyboard,
  Minimize2,
} from 'lucide-react';
import { WeeklyWeatherHeader } from './WeeklyWeatherHeader';
import { createPortal } from 'react-dom';
import { DeadlineBadge } from './DeadlineBadge';
import { Folder, FolderOpen as FolderOpenIcon, AppWindow } from 'lucide-react';
import { LeaveWorkScene } from './LeaveWorkScene';
import { FlipClockWidget } from './FlipClockWidget';
import { BookmarkManageModal } from './BookmarkManageModal';
import { MoonPhaseModal } from './MoonPhaseModal';
import { ClassroomMode, ClassConfig, DailySchedule, Student } from '../types';
import { getTheme } from '../utils/theme';
import { getDayTypeInfo } from '../utils/koreanHolidays';

import { shortcutHint } from '../constants/shortcuts';
import { ClassInWordmark } from './ClassInWordmark';
// 북마크 아이템 인터페이스
export interface HeaderBookmarkItem {
  id: string;
  title: string;
  url: string;
  type?: 'web' | 'app';
  iconUrl?: string;
  bgColor?: string;
  /** 속한 바로가기 그룹 (없으면 헤더에 낱개 칩으로 표시) */
  groupId?: string;
  /** 웹사이트 여는 방식: 기본 브라우저(기본값) / 프로그램 안 팝업 창 */
  openMode?: 'browser' | 'popup';
}

/** 🗂️ 바로가기 그룹 (폴더) */
export interface HeaderBookmarkGroup {
  id: string;
  name: string;
  /** 폴더 이미지 주소 (비우면 기본 폴더 아이콘) */
  iconUrl?: string;
}
export const BOOKMARK_GROUPS_KEY = 'smart_classroom_bookmark_groups_v1';

// 🏫 초등 교사용 기본 필수 바로가기 프리셋
const DEFAULT_HEADER_BOOKMARKS: HeaderBookmarkItem[] = [
  {
    id: 'neis',
    title: '나이스 (NEIS)',
    url: 'https://www.neis.go.kr',
    type: 'web',
  },
  {
    id: 'edufine',
    title: 'K-에듀파인',
    url: 'https://klef.sen.go.kr',
    type: 'web',
  },
  {
    id: 'school_home',
    title: '학교알리미',
    url: 'https://www.schoolinfo.go.kr',
    type: 'web',
  },
];

// 📚 초등학교 주요 계기교육 및 기념일 데이터베이스
export interface CommemorativeDayInfo {
  date: string; // "MM-DD"
  title: string;
  category: '계기교육' | '국경일' | '기념일';
  origin: string;
  meaning: string;
  teachingPoint: string;
}

export const COMMEMORATIVE_DAYS: CommemorativeDayInfo[] = [
  {
    date: '03-01',
    title: '3·1절',
    category: '국경일',
    origin: '1919년 3월 1일 일제의 식민 지배에 항거하여 한국의 독립을 선언하고 평화적 만세운동을 전개한 날입니다.',
    meaning: '자주독립 선언과 민족 대화합의 평화정신 계승',
    teachingPoint: '순국선열의 나라사랑 정신과 평화의 소중함을 배웁니다.',
  },
  {
    date: '04-19',
    title: '4·19 혁명 기념일',
    category: '기념일',
    origin: '1960년 4월 19일 학생과 시민들이 부정선거와 독재에 맞서 민주주의를 지키기 위해 일어난 민주혁명입니다.',
    meaning: '자유·민주·정의의 헌법적 가치 수호',
    teachingPoint: '대한민국 민주주의의 발전 과정과 시민 참여의 가치를 학습합니다.',
  },
  {
    date: '04-21',
    title: '과학의 날',
    category: '계기교육',
    origin: '과학기술에 대한 국민적 관심을 높이고 청소년의 창의적 탐구 역량을 길러주기 위해 제정되었습니다.',
    meaning: '창의적 과학 마인드와 미래 기술 역량 증진',
    teachingPoint: '일상 속 과학적 호기심을 갖고 주도적으로 탐구하는 태도를 기릅니다.',
  },
  {
    date: '05-05',
    title: '어린이날',
    category: '기념일',
    origin: '소파 방정환 선생과 색동회가 어린이의 인격을 존중하고 꿈을 키워주기 위해 제정한 날입니다.',
    meaning: '어린이 존엄성과 행복권 보장',
    teachingPoint: '서로를 아끼고 존중하며 바르고 씩씩하게 자라는 마음을 기릅니다.',
  },
  {
    date: '05-15',
    title: '스승의 날',
    category: '계기교육',
    origin: '세종대왕 탄신일인 5월 15일을 스승의 날로 정하여 참된 배움을 주시는 선생님의 은혜를 기립니다.',
    meaning: '사제지간의 참된 정과 배움의 존중',
    teachingPoint: '선생님과 배움에 대한 감사하는 마음을 표현합니다.',
  },
  {
    date: '06-06',
    title: '현충일',
    category: '국경일',
    origin: '나라를 지키기 위해 목숨을 바친 순국선열과 호국영령의 숭고한 희생을 추모하는 날입니다.',
    meaning: '호국보훈과 숭고한 호국영령 추모',
    teachingPoint: '오늘날의 평화로운 조국이 순국선열의 헌신 위에 세워졌음을 기억합니다.',
  },
  {
    date: '07-17',
    title: '제헌절',
    category: '국경일',
    origin: '1948년 7월 17일 대한민국 최초의 헌법이 제정·공포된 것을 기념하는 날입니다.',
    meaning: '자유민주주의 헌법과 법치 질서 수호',
    teachingPoint: '학급 규칙을 준수하고 법과 질서를 지키는 민주시민의 태도를 배웁니다.',
  },
  {
    date: '08-15',
    title: '광복절',
    category: '국경일',
    origin: '1945년 8월 15일 일제 식민지배로부터 국권을 되찾고, 1948년 대한민국 정부 수립을 경축하는 날입니다.',
    meaning: '민족의 국권 회복과 대한민국 정부 수립 경축',
    teachingPoint: '독립운동가들의 희생과 자랑스러운 대한민국 역사를 되새깁니다.',
  },
  {
    date: '10-03',
    title: '개천절',
    category: '국경일',
    origin: '단군기원 원년 음력 10월 3일 국조 단군이 최초의 민족국가인 고조선을 건국한 날을 기립니다.',
    meaning: '홍익인간(弘益人間) 이념과 민족의 건국 기원',
    teachingPoint: '널리 인간을 이롭게 하는 홍익인간의 뜻을 학급에서 실천합니다.',
  },
  {
    date: '10-09',
    title: '한글날',
    category: '국경일',
    origin: '훈민정음 곧 오늘의 한글을 창제하여 세상에 펴낸 것을 기념하고 한글의 우수성을 널리 알리는 날입니다.',
    meaning: '한글 창제 정신과 우리말의 소중함 계승',
    teachingPoint: '바르고 고운 우리말과 글을 사랑하고 올바르게 사용하는 태도를 다집니다.',
  },
  {
    date: '10-25',
    title: '독도의 날',
    category: '계기교육',
    origin: '1900년 10월 25일 대한제국 고종 황제가 칙령 제41호로 독도를 울릉도의 부속 섬으로 명시한 날입니다.',
    meaning: '대한민국의 영토 독도에 대한 확고한 수호 의지',
    teachingPoint: '독도가 역사적·지리적·국제법적으로 명백한 우리 영토임을 바르게 이해합니다.',
  },
  {
    date: '11-03',
    title: '학생독립운동기념일',
    category: '계기교육',
    origin: '1929년 11월 3일 광주학생항일운동의 숭고한 자주정신과 용기를 기리기 위해 제정된 날입니다.',
    meaning: '학생들의 자주독립 정신과 정의로운 실천 의지',
    teachingPoint: '학생으로서 바른 생각과 정의로운 용기를 지니고 실천하는 자세를 배웁니다.',
  },
  {
    date: '12-10',
    title: '세계 인권의 날',
    category: '계기교육',
    origin: '1948년 12월 10일 UN 총회에서 세계 인권 선언이 채택된 날을 기념하여 제정되었습니다.',
    meaning: '모든 인간의 존엄성과 천부인권 존중',
    teachingPoint: '서로의 다름을 존중하고 편견 없이 친구를 배려하는 태도를 기릅니다.',
  },
];

// 오늘 또는 가장 가까운 계기교육일 찾기
export const getTodayOrNextCommemorativeDay = (now: Date) => {
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const todayStr = `${m}-${d}`;

  // 1) 오늘 정확히 일치하는 기념일
  const match = COMMEMORATIVE_DAYS.find(c => c.date === todayStr);
  if (match) {
    return { ...match, isToday: true, daysLeft: 0 };
  }

  // 2) 오늘 이후 가장 가까운 기념일 계산
  const thisYear = now.getFullYear();
  const sorted = [...COMMEMORATIVE_DAYS]
    .map(c => {
      const [cm, cd] = c.date.split('-').map(Number);
      let targetDate = new Date(thisYear, cm - 1, cd);
      if (targetDate.getTime() < now.getTime()) {
        targetDate = new Date(thisYear + 1, cm - 1, cd);
      }
      const diffTime = targetDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...c, daysLeft, isToday: false };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);

  return sorted[0] || {
    date: '10-25',
    title: '독도의 날',
    category: '계기교육' as const,
    origin: '1900년 10월 25일 대한제국 고종 황제 칙령 제41호를 기념하는 날입니다.',
    meaning: '대한민국의 고유 영토 독도 수호 의지',
    teachingPoint: '독도가 역사적·지리적으로 명백한 우리 영토임을 바로 압니다.',
    isToday: false,
    daysLeft: 11,
  };
};

// 결석 및 특이 출결 학생 인터페이스
interface AbsentStudentInfo {
  number: number;
  name: string;
  status: 'absent' | 'late' | 'early_leave' | 'nurse' | 'excused';
  statusLabel: string;
  reason: string;
}

interface HeaderProps {
  config: ClassConfig;
  schedule?: DailySchedule;
  students?: Student[]; // 👥 학생 출결 실시간 연동 prop
  mode: ClassroomMode;
  isDarkMode?: boolean;
  onModeChange: (newMode: ClassroomMode) => void;
  onToggleBoardType?: () => void;
  onOpenSettings: () => void;
  /** ⌨️ 단축키 안내판 열기 */
  onOpenShortcuts?: () => void;
  onCollapseDashboard?: () => void;
  onOpenStudentDisplay?: () => void;
  isStudentDisplayActive?: boolean;
  onLockScreen?: () => void;
  onShowToast: (msg: string) => void;
  // 🎛️ 사이드바/레이아웃 모드 제어
  onCycleSidebarMode?: () => void;
  // ➕ 위젯 추가 기능
  onOpenAddWidgetModal?: () => void;
  hiddenWidgetIds?: string[];
  collapsedWidgetIds?: string[];
  onRestoreWidget?: (widgetId: string) => void;
  getWidgetTitle?: (widgetId: string) => string;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  schedule,
  students,
  mode,
  isDarkMode = false,
  onModeChange,
  onToggleBoardType,
  onOpenSettings,
  onOpenShortcuts,
  onCollapseDashboard,
  onOpenStudentDisplay,
  isStudentDisplayActive,
  onLockScreen,
  onShowToast,
  onCycleSidebarMode,
  onOpenAddWidgetModal,
  hiddenWidgetIds = [],
  collapsedWidgetIds = [],
  onRestoreWidget,
  getWidgetTitle,
}) => {
  // 현재 시각 상태
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // ⚡ [성능] 헤더는 '분' 단위 정보(업무 종료까지 남은 시간·날짜·D-Day)만 쓰므로 매분 정각에만 갱신
  //    (초 단위 시계는 FlipClockWidget 이 자체적으로 갱신 → 헤더 전체가 1초마다 다시 그려지지 않음)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const scheduleNextMinute = () => {
      const now = new Date();
      const msToNextMinute = 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 50;
      timer = setTimeout(() => {
        setCurrentDate(new Date());
        scheduleNextMinute();
      }, msToNextMinute);
    };
    scheduleNextMinute();
    // 절전 해제·창 복귀 시 즉시 최신화
    const onVisible = () => {
      if (document.visibilityState === 'visible') setCurrentDate(new Date());
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const isWorkMode = mode === 'work';
  const themeConfig = getTheme(config.theme, isDarkMode);
  const headerAlpha = Math.min(1, Math.max(0.3, config.dashboardBgOpacity ?? 0.95));

  // 🍬 테마 연동 상단 캔디바 패널 스타일 (테마 특징에 맞춘 색상 및 폴백)
  const candyBars = themeConfig.candyBars || {
    attendance: {
      bgClass: 'bg-emerald-100/90 dark:bg-emerald-950/45 border border-emerald-200/80 dark:border-emerald-500/40 hover:bg-emerald-200/80 dark:hover:bg-emerald-900/50',
      dotClass: 'bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_#10b981]',
    },
    commemorative: {
      bgClass: 'bg-pink-100/90 dark:bg-pink-950/45 border border-pink-200/80 dark:border-pink-500/40 hover:bg-pink-200/80 dark:hover:bg-pink-900/50',
      iconClass: 'text-pink-600 dark:text-pink-400',
      badgeClass: 'bg-pink-500 dark:bg-pink-600 text-white shadow-[0_0_8px_rgba(236,72,153,0.4)]',
    },
    leaveWork: {
      bgClass: 'bg-blue-100/90 dark:bg-blue-950/45 border border-blue-200/80 dark:border-blue-500/40',
      dotClass: 'bg-blue-500 dark:bg-blue-400 shadow-[0_0_8px_#3b82f6]',
      progressGradientClass: 'from-sky-400 via-blue-500 to-indigo-500',
    },
    vacation: {
      bgClass: 'bg-amber-100/90 dark:bg-amber-950/45 border border-amber-200/80 dark:border-amber-500/40 hover:bg-amber-200/80 dark:hover:bg-amber-900/50',
      iconClass: 'text-amber-600 dark:text-amber-400',
      badgeClass: 'bg-amber-500 dark:bg-amber-600 text-white shadow-[0_0_8px_rgba(245,158,11,0.4)]',
    },
  };

  // 👥 1. 출결 현황 집계 및 결석 학생 목록
  const [attendanceCount, setAttendanceCount] = useState<{ present: number; total: number; absentCount: number }>({
    present: 24,
    total: 24,
    absentCount: 0,
  });
  const [absentStudents, setAbsentStudents] = useState<AbsentStudentInfo[]>([]);
  const [isAttendancePopoverOpen, setIsAttendancePopoverOpen] = useState(false);
  const attendancePopoverRef = useRef<HTMLDivElement | null>(null);

  // 🔄 출결 현황 실시간 집계 헬퍼 함수
  const calculateAttendance = (studentList: Student[]) => {
    if (!Array.isArray(studentList) || studentList.length === 0) {
      const total = config.totalStudents || 24;
      setAttendanceCount({
        present: total,
        total,
        absentCount: 0,
      });
      setAbsentStudents([]);
      return;
    }

    const total = studentList.length;
    // 출석(present) 학생 인원
    const present = studentList.filter((s) => s.attendance === 'present').length;
    // 결석(absent) 학생 인원
    const absentOnlyCount = studentList.filter((s) => s.attendance === 'absent').length;

    // 결석, 지각, 조퇴, 보건, 출석인정 등 출석(present) 외 모든 특이 출결 학생 목록
    const notPresent = studentList.filter((s) => s.attendance && s.attendance !== 'present');

    const absentList: AbsentStudentInfo[] = notPresent.map((s) => {
      let status: AbsentStudentInfo['status'] = 'absent';
      let statusLabel = '결석';
      if (s.attendance === 'late') {
        status = 'late';
        statusLabel = '지각';
      } else if (s.attendance === 'early') {
        status = 'early_leave';
        statusLabel = '조퇴';
      } else if (s.attendance === 'nurse') {
        status = 'nurse';
        statusLabel = '보건';
      } else if (
        s.reasonCategory === '출석인정' ||
        s.attendanceReasonCategory === '출석인정' ||
        s.reasonCategory === '인정'
      ) {
        status = 'excused';
        statusLabel = '출석인정';
      }

      const note =
        s.attendanceReasonDetail ||
        s.attendanceNote ||
        s.note ||
        (s as any).memo ||
        (s as any).attendanceReason ||
        (s as any).reasonNote ||
        '사유 미기재';

      return {
        number: s.number,
        name: s.name,
        status,
        statusLabel,
        reason: note,
      };
    });

    setAttendanceCount({
      present,
      total,
      absentCount: absentOnlyCount,
    });
    setAbsentStudents(absentList);
  };

  useEffect(() => {
    // 1순위: prop으로 students가 넘어온 경우 즉시 실시간 동기화
    if (students && Array.isArray(students) && students.length > 0) {
      calculateAttendance(students);
      return;
    }

    // 2순위: prop이 없는 경우 로컬스토리지에서 조회 및 변경 감지
    const loadFromStorage = () => {
      try {
        const saved = localStorage.getItem('class_dashboard_students');
        if (saved) {
          const parsed: Student[] = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            calculateAttendance(parsed);
            return;
          }
        }
      } catch {}

      const total = config.totalStudents || 24;
      setAttendanceCount({
        present: total,
        total,
        absentCount: 0,
      });
      setAbsentStudents([]);
    };

    loadFromStorage();
    window.addEventListener('storage', loadFromStorage);
    return () => window.removeEventListener('storage', loadFromStorage);
  }, [students, config.totalStudents]);

  // 📅 2. 계기교육일 정보 및 팝오버 상태
  const [commemorativeDay, setCommemorativeDay] = useState<CommemorativeDayInfo & { daysLeft: number; isToday: boolean }>(() =>
    getTodayOrNextCommemorativeDay(new Date())
  );
  const [isCommemorativePopoverOpen, setIsCommemorativePopoverOpen] = useState(false);
  const commemorativePopoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCommemorativeDay(getTodayOrNextCommemorativeDay(currentDate));
  }, [currentDate]);

  // 🚪 3. 교사 출퇴근 (업무종료) 남은 시간 스마트 계산 및 3단계 동적 스타일링
  // 🌟 시스템 캘린더 기준 주말(토·일) 및 공휴일인 경우 업무 종료 알림을 아예 노출하지 않도록 차단
  const todayDayType = getDayTypeInfo(currentDate);
  const isWeekendOrHoliday = todayDayType.type === 'weekend' || todayDayType.type === 'holiday' || todayDayType.type === 'discretionary';

  const workStartTime = config.workStartTime || '08:30';
  const workEndTime = config.workEndTime || '16:30';

  const calculateWorkProgress = () => {
    // 주말 또는 공휴일인 경우 업무 종료 계산 중지
    if (isWeekendOrHoliday) {
      return {
        remainingMin: 0,
        isWorkEnded: false,
        stage: 'normal' as const,
        timeText: todayDayType.label,
        badgeStyle: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold',
        dotStyle: 'bg-slate-400',
      };
    }

    const [sH, sM] = workStartTime.split(':').map(Number);
    const [eH, eM] = workEndTime.split(':').map(Number);
    const startMin = (isNaN(sH) ? 8 : sH) * 60 + (isNaN(sM) ? 30 : sM);
    const endMin = (isNaN(eH) ? 16 : eH) * 60 + (isNaN(eM) ? 30 : eM);

    const nowH = currentDate.getHours();
    const nowM = currentDate.getMinutes();
    const currentMin = nowH * 60 + nowM;

    const remainingMin = endMin - currentMin;
    const isWorkEnded = currentMin >= endMin;

    // 3단계 스마트 동적 스타일링:
    // 1) 30분 이하 (퇴근 직전): 심장 박동 로즈/레드 네온 틴트 + 펄스
    // 2) 60분 이하 (퇴근 임박): 주의 환기 앰버/오렌지 틴트
    // 3) 그 외 (평상시/4시간 이상): 차분하고 안정적인 블루/테마 틴트
    let stage: 'normal' | 'warning' | 'danger' | 'ended' = 'normal';
    let timeText = '';
    let badgeStyle = '';
    let dotStyle = '';

    if (isWorkEnded) {
      stage = 'ended';
      timeText = '퇴근 완료 🎉';
      badgeStyle = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 font-bold';
      dotStyle = 'bg-emerald-500 shadow-[0_0_8px_#10b981]';
    } else if (remainingMin <= 30) {
      stage = 'danger';
      timeText = `🔥 ${remainingMin}분 남음!`;
      badgeStyle = 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/40 animate-pulse font-black shadow-[0_0_12px_rgba(244,63,94,0.3)]';
      dotStyle = 'bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-ping';
    } else if (remainingMin <= 60) {
      stage = 'warning';
      timeText = `⏰ ${remainingMin}분 남음!`;
      badgeStyle = 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-400/40 font-bold shadow-[0_0_8px_rgba(245,158,11,0.2)]';
      dotStyle = 'bg-amber-500 shadow-[0_0_8px_#f59e0b] animate-pulse';
    } else {
      stage = 'normal';
      const h = Math.floor(remainingMin / 60);
      const m = remainingMin % 60;
      timeText = `${h}h ${m}m 남음`;
      badgeStyle = `${candyBars.leaveWork.bgClass} text-slate-900 dark:text-slate-200`;
      dotStyle = `${candyBars.leaveWork.dotClass || 'bg-blue-500'} animate-pulse`;
    }

    return {
      remainingMin,
      isWorkEnded,
      stage,
      timeText,
      badgeStyle,
      dotStyle,
    };
  };

  const workStatus = calculateWorkProgress();

  // 🔔 퇴근 시간 도달 시 상단 헤더 우측 '퇴근 알림' 팝업 제어 (주말/공휴일에는 아예 비활성화)
  const todayDateKey = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`;
  const [isLeaveAlertDismissed, setIsLeaveAlertDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(`leaveAlertDismissed_${todayDateKey}`) === 'true';
    } catch {
      return false;
    }
  });

  const isAlertEnabled = config.enableLeaveWorkAlert !== false && (typeof window !== 'undefined' ? localStorage.getItem('enableLeaveWorkAlert') !== 'false' : true);
  const showLeaveAlert = !isWeekendOrHoliday && isAlertEnabled && workStatus.isWorkEnded && !isLeaveAlertDismissed;

  // 환경설정의 [퇴근 장면 미리보기]
  const [leavePreview, setLeavePreview] = useState(false);
  useEffect(() => {
    const on = () => setLeavePreview(true);
    window.addEventListener('classin-leave-scene', on);
    return () => window.removeEventListener('classin-leave-scene', on);
  }, []);

  const handleDismissLeaveAlert = () => {
    setIsLeaveAlertDismissed(true);
    try {
      sessionStorage.setItem(`leaveAlertDismissed_${todayDateKey}`, 'true');
    } catch (e) {
      console.warn('🔴 sessionStorage 접근 오류:', e);
    }
  };

  // 🏖️/❄️ 4. 학기별 방학 D-Day 계산 (1학기 여름방학 / 2학기 겨울방학 자동 판별)
  const calculateVacationDDay = () => {
    const summerDateStr = config.summerVacationDate || '2026-07-20';
    const winterDateStr = config.winterVacationDate || '2026-12-24';

    const todayDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const summerDate = new Date(summerDateStr);
    const winterDate = new Date(winterDateStr);

    // 오늘 날짜가 여름방학 시작일 이전이면 1학기로 판별하여 여름방학 D-Day 표시
    if (todayDateOnly.getTime() <= summerDate.getTime()) {
      const diffTime = summerDate.getTime() - todayDateOnly.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        semester: '1학기',
        type: 'summer',
        label: '여름방학',
        icon: '🏖️',
        daysLeft,
        text: daysLeft > 0 ? `여름방학 D-${daysLeft}` : daysLeft === 0 ? '여름방학 D-Day' : `여름방학 D+${Math.abs(daysLeft)}`,
      };
    } else {
      // 여름방학 이후이면 2학기로 판별하여 겨울방학 D-Day 표시
      const diffTime = winterDate.getTime() - todayDateOnly.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        semester: '2학기',
        type: 'winter',
        label: '겨울방학',
        icon: '❄️',
        daysLeft,
        text: daysLeft > 0 ? `겨울방학 D-${daysLeft}` : daysLeft === 0 ? '겨울방학 D-Day' : `겨울방학 D+${Math.abs(daysLeft)}`,
      };
    }
  };

  const vacationInfo = calculateVacationDDay();

  // 🌙 달의 위상(Moon Phase) 계산 함수 (음력 주기 29.53일 기반)
  const calculateMoonPhase = (date: Date) => {
    const knownNewMoon = new Date(Date.UTC(2000, 0, 6, 18, 14, 0));
    const synodicMonth = 29.53058867;
    const diffDays = (date.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
    const phase = ((diffDays % synodicMonth) + synodicMonth) % synodicMonth;
    const normalizedPhase = phase / synodicMonth;
    const approxLunarDay = Math.floor(phase) + 1; // 1 ~ 30일

    let icon = '🌑';
    let name = '삭 (신월)';
    if (normalizedPhase < 0.04 || normalizedPhase >= 0.96) {
      icon = '🌑';
      name = '삭(New Moon)';
    } else if (normalizedPhase < 0.21) {
      icon = '🌒';
      name = '초승달(Waxing Crescent)';
    } else if (normalizedPhase < 0.29) {
      icon = '🌓';
      name = '상현달(First Quarter)';
    } else if (normalizedPhase < 0.46) {
      icon = '🌔';
      name = '차오르는 달(Waxing Gibbous)';
    } else if (normalizedPhase < 0.54) {
      icon = '🌕';
      name = '보름달(Full Moon)';
    } else if (normalizedPhase < 0.71) {
      icon = '🌖';
      name = '기울어가는 달(Waning Gibbous)';
    } else if (normalizedPhase < 0.79) {
      icon = '🌗';
      name = '하현달(Last Quarter)';
    } else {
      icon = '🌘';
      name = '그믐달(Waning Crescent)';
    }

    return {
      icon,
      name,
      lunarDay: approxLunarDay,
      tooltip: `음력 ${approxLunarDay}일경 (${name})`,
    };
  };

  const moonPhase = calculateMoonPhase(currentDate);

  // 🌸/🌿/🍁/❄️ 계절별 캘린더 테마 (월 기준: 3~5 봄, 6~8 여름, 9~11 가을, 12~2 겨울)
  const getSeasonTheme = (month: number) => {
    if (month >= 3 && month <= 5) {
      return {
        name: '봄',
        icon: '🌸',
        bgClass: 'bg-gradient-to-br from-pink-500/90 via-rose-500/80 to-emerald-500/80 dark:from-pink-950/65 dark:via-rose-950/45 dark:to-emerald-950/50 border border-pink-300/40 dark:border-pink-500/30 shadow-md shadow-pink-500/15',
        badgeBg: 'bg-pink-500/25 text-pink-100 border-pink-200/30',
      };
    }
    if (month >= 6 && month <= 8) {
      return {
        name: '여름',
        icon: '🌿',
        bgClass: 'bg-gradient-to-br from-sky-500/90 via-cyan-500/80 to-teal-500/80 dark:from-sky-950/65 dark:via-cyan-950/45 dark:to-teal-950/50 border border-cyan-300/40 dark:border-cyan-500/30 shadow-md shadow-cyan-500/15',
        badgeBg: 'bg-cyan-500/25 text-cyan-100 border-cyan-200/30',
      };
    }
    if (month >= 9 && month <= 11) {
      return {
        name: '가을',
        icon: '🍁',
        bgClass: 'bg-gradient-to-br from-amber-500/90 via-orange-500/80 to-rose-500/80 dark:from-amber-950/65 dark:via-orange-950/45 dark:to-rose-950/50 border border-amber-300/40 dark:border-amber-500/30 shadow-md shadow-amber-500/15',
        badgeBg: 'bg-amber-500/25 text-amber-100 border-amber-200/30',
      };
    }
    return {
      name: '겨울',
      icon: '❄️',
      bgClass: 'bg-gradient-to-br from-indigo-500/90 via-violet-500/80 to-sky-500/80 dark:from-indigo-950/65 dark:via-violet-950/45 dark:to-sky-950/50 border border-indigo-300/40 dark:border-indigo-500/30 shadow-md shadow-indigo-500/15',
      badgeBg: 'bg-indigo-500/25 text-indigo-100 border-indigo-200/30',
    };
  };

  const seasonTheme = getSeasonTheme(currentDate.getMonth() + 1);

  // 팝오버 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (attendancePopoverRef.current && !attendancePopoverRef.current.contains(e.target as Node)) {
        setIsAttendancePopoverOpen(false);
      }
      if (commemorativePopoverRef.current && !commemorativePopoverRef.current.contains(e.target as Node)) {
        setIsCommemorativePopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 🔖 5. 바로가기 북마크 목록 관리 (로컬스토리지 영속화)
  const [bookmarks, setBookmarks] = useState<HeaderBookmarkItem[]>(() => {
    try {
      const saved = localStorage.getItem('smart_classroom_bookmarks_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch { }
    return DEFAULT_HEADER_BOOKMARKS;
  });

  // 🔗 바로가기 관리 모달 열림 상태
  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);

  // 🗂️ 바로가기 그룹(폴더)
  const [bookmarkGroups, setBookmarkGroups] = useState<HeaderBookmarkGroup[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(BOOKMARK_GROUPS_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter((g: any) => g && g.id && typeof g.name === 'string') : [];
    } catch { return []; }
  });
  const handleSaveBookmarkGroups = (next: HeaderBookmarkGroup[]) => {
    setBookmarkGroups(next);
    try { localStorage.setItem(BOOKMARK_GROUPS_KEY, JSON.stringify(next)); } catch { }
  };
  const [openGroup, setOpenGroup] = useState<{ id: string; x: number; y: number } | null>(null);
  const [brokenGroupIcons, setBrokenGroupIcons] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!openGroup) return;
    const close = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-bm-group-pop]') || t.closest('[data-bm-group-btn]')) return;
      setOpenGroup(null);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenGroup(null); };
    const off = () => setOpenGroup(null);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    window.addEventListener('resize', off);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); window.removeEventListener('resize', off); };
  }, [openGroup]);

  // 🌙 실제 달의 위상 & 형상 이미지 팝오버 열림 상태
  const [isMoonModalOpen, setIsMoonModalOpen] = useState(false);

  // 바로가기 목록 변경 저장 핸들러
  const handleSaveBookmarks = (newBookmarks: HeaderBookmarkItem[]) => {
    setBookmarks(newBookmarks);
    try {
      localStorage.setItem('smart_classroom_bookmarks_v2', JSON.stringify(newBookmarks));
    } catch (err) {
      console.warn('🔴 바로가기 저장 실패:', err);
    }
  };

  // 🖐️ 바로가기 드래그 앤 드롭 순서 변경 상태 관리
  const [draggedBookmarkIndex, setDraggedBookmarkIndex] = useState<number | null>(null);
  const [dragOverBookmarkIndex, setDragOverBookmarkIndex] = useState<number | null>(null);
  const [isDraggingBookmark, setIsDraggingBookmark] = useState(false);

  const handleBookmarkDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    setDraggedBookmarkIndex(index);
    setIsDraggingBookmark(true);
  };

  const handleBookmarkDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverBookmarkIndex !== index) {
      setDragOverBookmarkIndex(index);
    }
  };

  const handleBookmarkDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedBookmarkIndex === null || draggedBookmarkIndex === targetIndex) {
      setDraggedBookmarkIndex(null);
      setDragOverBookmarkIndex(null);
      return;
    }

    const newBookmarks = [...bookmarks];
    const [movedItem] = newBookmarks.splice(draggedBookmarkIndex, 1);
    newBookmarks.splice(targetIndex, 0, movedItem);

    setBookmarks(newBookmarks);
    try {
      localStorage.setItem('smart_classroom_bookmarks_v2', JSON.stringify(newBookmarks));
    } catch (err) {
      console.warn('🔴 바로가기 순서 저장 실패:', err);
    }

    onShowToast?.(`📌 [${movedItem.title}] 바로가기 순서가 변경되었습니다.`);
    setDraggedBookmarkIndex(null);
    setDragOverBookmarkIndex(null);
  };

  const handleBookmarkDragEnd = () => {
    setDraggedBookmarkIndex(null);
    setDragOverBookmarkIndex(null);
    setTimeout(() => {
      setIsDraggingBookmark(false);
    }, 150);
  };

  const getBookmarkDotColor = (b: HeaderBookmarkItem, idx: number) => {
    if (b.id === 'neis') return 'bg-cyan-400';
    if (b.id === 'edufine') return 'bg-indigo-400';
    const dotColors = ['bg-emerald-400', 'bg-amber-400', 'bg-purple-400', 'bg-rose-400', 'bg-sky-400'];
    return dotColors[idx % dotColors.length];
  };

  // 💻 컴퓨터에 설치된 로컬 프로그램 실행 핸들러
  const handleLaunchApp = async (targetPath: string, title: string) => {
    try {
      console.log(`🔵 [AppLauncher] 프로그램 실행 시도: ${title} (${targetPath})`);

      // 1. Electron 환경 감지 시 Electron API 우선 호출
      if ((window as any).electronAPI?.launchApp) {
        const electronRes = await (window as any).electronAPI.launchApp(targetPath);
        if (electronRes?.success) {
          onShowToast(`🚀 [${title}] 프로그램을 실행했습니다.`);
          console.log(`🟢 [AppLauncher] Electron 환경에서 실행 완료: ${title}`);
          return;
        }
        // 데스크톱 앱에서는 보안 검증 결과를 그대로 안내하고 로컬 서버 경로로 넘어가지 않습니다.
        onShowToast(`⚠️ [${title}] 실행 실패: ${electronRes?.error || '경로를 확인해 주세요.'}`);
        return;
      }

      // 2. 로컬 백엔드 서버(/api/launch-app)로 POST 요청 전송
      const response = await fetch('/api/launch-app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetPath,
          title,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          onShowToast(`🚀 [${title}] 프로그램을 실행했습니다.`);
          console.log(`🟢 [AppLauncher] 로컬 프로그램 실행 성공: ${title}`);
          return;
        }
      }

      throw new Error('서버 응답 비정상');
    } catch (err: any) {
      console.error(`🔴 [AppLauncher] 프로그램 실행 오류:`, err);
      // 서버 미구동 상태(정적 웹 브라우저 단독 접근 등)일 때 안내
      onShowToast(`⚠️ [${title}] 실행 실패: 컴퓨터의 로컬 서버(run-dashboard) 연결 또는 파일 경로를 확인해 주세요.`);
    }
  };

  // 🌐 웹사이트 바로가기 새 탭 열기 핸들러
  const handleOpenBookmark = (url: string, title: string, mode: 'browser' | 'popup' = 'browser') => {
    const api = (window as any).electronAPI;
    if (mode === 'popup') {
      if (api?.openPopupWindow) {
        api.openPopupWindow(url, title).then((r: any) => {
          if (r?.success) onShowToast(`🪟 [${title}] 팝업 창으로 열었습니다.`);
          else onShowToast(`⚠️ [${title}] 팝업 창 열기 실패: ${r?.error || '주소를 확인해 주세요.'}`);
        }).catch(() => onShowToast(`⚠️ [${title}] 팝업 창 열기 실패`));
        return;
      }
      const w = Math.min(1280, Math.round(window.screen.availWidth * 0.8));
      const h = Math.min(900, Math.round(window.screen.availHeight * 0.85));
      const opened = window.open(url, '_blank', `popup=yes,width=${w},height=${h},left=${Math.round((window.screen.availWidth - w) / 2)},top=${Math.round((window.screen.availHeight - h) / 2)},noopener,noreferrer`);
      onShowToast(opened === null ? `🪟 [${title}] 팝업 창을 열었습니다.` : `🪟 [${title}] 팝업 창을 열었습니다.`);
      return;
    }
    if (api?.openExternal) {
      api.openExternal(url).then((r: any) => {
        if (r?.success === false) onShowToast(`⚠️ [${title}] 열기 실패: ${r?.error || '주소를 확인해 주세요.'}`);
        else onShowToast(`🚀 [${title}] 기본 브라우저로 열었습니다.`);
      }).catch(() => window.open(url, '_blank', 'noopener,noreferrer'));
      return;
    }
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
      onShowToast(`🚀 [${title}] 바로가기 사이트를 열었습니다.`);
    } catch {
      window.location.href = url;
    }
  };

  // 🔘 바로가기 캡슐 클릭 핸들러 (웹사이트 vs 로컬 프로그램 자동 분기)
  const handleBookmarkClick = (item: HeaderBookmarkItem) => {
    if (isDraggingBookmark) return;

    if (item.type === 'app') {
      handleLaunchApp(item.url, item.title);
    } else {
      handleOpenBookmark(item.url, item.title, item.openMode === 'popup' ? 'popup' : 'browser');
    }
  };

  const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false);
  const addWidgetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addWidgetRef.current && !addWidgetRef.current.contains(e.target as Node)) {
        setIsAddWidgetOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const availableRestoreWidgets = Array.from(
    new Set([...hiddenWidgetIds, ...collapsedWidgetIds])
  ).filter(id => id !== 'bookmarks' && id !== 'timer');



  // 🕒 플립 카드 달력용 영문/숫자 날짜 계산
  const MONTHS_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const MONTHS_FULL_EN = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  const DAYS_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const DAYS_FULL_EN = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const DAYS_KO = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

  const flipYear = currentDate.getFullYear();
  const flipMonth = MONTHS_EN[currentDate.getMonth()];
  const flipDate = String(currentDate.getDate()).padStart(2, '0');
  const flipDay = DAYS_EN[currentDate.getDay()];

  return (
    <div
      data-header-container="true"
      className="w-full select-none shrink-0"
      style={{ fontFamily: 'var(--app-font-family, inherit)' }}
    >
      <header
        style={{
          ...(!isDarkMode && themeConfig.headerBgLight
            ? {
              backgroundColor: themeConfig.headerBgLight,
              borderColor: themeConfig.headerBorderLight || undefined,
            }
            : {}),
          fontFamily: 'var(--app-font-family, inherit)',
        }}
        className={`lg-surface-header w-full rounded-3xl px-4 sm:px-5 py-2.5 flex items-stretch gap-3 sm:gap-4 sticky top-1 z-40 transition-all duration-300 shadow-xl ${
          !isDarkMode && themeConfig.headerGradientClass
            ? themeConfig.headerGradientClass
            : 'bg-gradient-to-r from-[#faf8ff] via-[#ffffff] to-[#f5f7ff] dark:from-[#0d1527] dark:via-[#0e172a] dark:to-[#111e38]'
        } ${
          !isDarkMode && themeConfig.headerBorderClass
            ? themeConfig.headerBorderClass
            : 'border-2 border-[#e8e4fb] dark:border-[#1e2c44]'
        } shadow-indigo-500/5 dark:shadow-black/50 ${themeConfig.headerClass}`}
      >
        {/* ========================================================================= */}
        {/* [ 좌측 컬럼 ]: 플립시계 (상단, 주간 날씨·캔디바 상하높이 및 가로선 위치 일치) + 로고 타이틀 (하단) */}
        {/* ========================================================================= */}
        <div className="flex flex-col justify-between shrink-0 gap-1.5 select-none">
          {/* ⏰ 1. [ 상단 ] 플립시계 위젯 (주간 날씨 & 캔디바 상하폭 h-[98px] sm:h-[104px] 및 가로선 위치까지 확장) */}
          <div className="shrink-0 flex items-center">
            <FlipClockWidget className="!pt-0.5 !pb-1.5 !px-2 sm:!pt-0.5 sm:!pb-2 sm:!px-2.5 !bg-transparent !border-transparent !shadow-none h-[98px] sm:h-[104px] flex flex-col justify-between box-border" isHeaderCompact={true} />
          </div>

          {/* [ 로고 구역 ] 2. [ 하단 ] Class in 로고 (열린 문 + Class in + 숨쉬기 ON 미니 캔디바 배지) */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 py-1 px-1">
            <div
              className="flex items-center gap-2 transition-transform duration-200 hover:scale-105 active:scale-95 cursor-pointer"
              title="Class in 스마트 학급 대시보드"
              onClick={() => {
                onShowToast?.('🏫 Class in 스마트 학급 대시보드에 오신 것을 환영합니다!');
              }}
            >
              {/* 글자형 Class in 로고 (워드마크) */}
              <ClassInWordmark withTeacher />
            </div>

            {/* 🟢 숨쉬기 모드 미니 캔디바 [ON] 배지 (우측 점 대신 은은하게 반짝이고 어두워지는 캔디바) */}
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8.5px] sm:text-[9px] font-black tracking-wider uppercase shadow-2xs border select-none transition-all duration-300 ml-0.5 shrink-0 animate-breathe bg-emerald-500/15 dark:bg-emerald-500/25 border-emerald-400/50 dark:border-emerald-400/60 text-emerald-600 dark:text-emerald-300"
              title="Class in 대시보드 실시간 활성 상태 (ON)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
              <span>ON</span>
            </span>
          </div>
          {/* 🐯 만든 사람 표시 (로고 바로 아래) */}
          <div className="px-1 -mt-1 shrink-0">
            <OwnerBadge size="xs" />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* [ 우측 컬럼 ]: 선을 기준으로 분리된 상단 구역 / 선 / 하단 구역 (수직 중앙 정렬) */}
        {/* ========================================================================= */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          {/* 1. [ 상단 분리 구역: 날씨 + 캔디바 패널 + 달력 & 설정 버튼 (수직 중앙 정렬) ] */}
          <div className="w-full flex items-center justify-between gap-3 min-w-0 py-0.5">
            {/* 🌤️ 날씨 위젯 (3단 와이드 기상 보드 & 24시간 슬라이드 패널 연동) */}
            <div className="flex-1 min-w-0">
              <WeeklyWeatherHeader
                locationName={config.location || ''}
                isWorkMode={isWorkMode}
                isDarkMode={isDarkMode}
              />
            </div>

            {/* 우측 정보 패널 (캔디바 컴팩트 최적화) + 달력 & 설정 묶음 */}
            <div className="relative flex items-center gap-2.5 sm:gap-3 shrink-0 min-w-0">
              {/* 🚗 퇴근 장면: 퇴근 시간이 되면 화면 가운데에서 루미가 퇴근 (하루 한 번 · 미리보기 이벤트로도 재생) */}
              {(showLeaveAlert || leavePreview) && (
                <LeaveWorkScene
                  endTime={workEndTime}
                  config={config}
                  preview={leavePreview && !showLeaveAlert}
                  onDone={() => {
                    setLeavePreview(false);
                    if (showLeaveAlert) handleDismissLeaveAlert();
                  }}
                />
              )}

              {/* 🍬 출결, 계기교육, 업무종료, 방학 캔디바 4종 (주간 날씨 위젯과 상하폭 h-[98px] sm:h-[104px] 완벽 일치) */}
              <div className="flex flex-col justify-between gap-1.5 w-[245px] sm:w-[258px] md:w-[270px] h-[98px] sm:h-[104px] py-0.5">
                {/* 1줄: [👥 출결현황 캔디바] + [📅 계기교육 캔디바] */}
                <div className="flex items-center gap-1.5 w-full flex-1">
                  {/* 1) 👥 출결현황 캔디바 (담임모드) 또는 ⚡ 전담 주당 수업 진행도 캔디바 (전담모드) */}
                  <div className="relative flex-[1.1] min-w-0 h-full" ref={attendancePopoverRef}>
                    {config.teacherMode === 'subject' ? (
                      (() => {
                        const targetHours = config.subjectWeeklyTargetHours || 18;
                        const completedHours = config.subjectWeeklyCompletedHours || 8;
                        const progressPercent = Math.min(100, Math.round((completedHours / targetHours) * 100));

                        return (
                          <div
                            className={`w-full h-full min-h-[42px] sm:min-h-[46px] flex flex-col justify-center px-2.5 rounded-xl text-[10px] sm:text-[10.5px] font-black ${candyBars.attendance.bgClass} text-slate-900 dark:text-slate-200 shadow-xs backdrop-blur-md select-none`}
                            title={`전담 주당 수업 시수: ${completedHours}/${targetHours}시수 진행 (${progressPercent}%)`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="flex items-center gap-1 text-[10px] sm:text-[10.5px] font-black truncate">
                                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shrink-0" />
                                <span>주당수업</span>
                              </span>
                              <span className="text-[10px] sm:text-[10.5px] font-black text-indigo-600 dark:text-cyan-400 shrink-0">
                                {completedHours}/{targetHours}시수 ({progressPercent}%)
                              </span>
                            </div>
                            {/* 시각적 프로그레스바 */}
                            <div className="w-full h-1.5 bg-slate-200/80 dark:bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-500 rounded-full transition-all duration-500"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsAttendancePopoverOpen(prev => !prev)}
                        className={`w-full h-full min-h-[42px] sm:min-h-[46px] flex items-center justify-start gap-1 px-2.5 rounded-xl text-[10px] sm:text-[10.5px] font-black ${candyBars.attendance.bgClass} text-slate-900 dark:text-slate-200 shadow-xs cursor-pointer transition-all truncate text-left backdrop-blur-md hover:scale-[1.01] active:scale-98`}
                        title="클릭 시 결석/지각 학생 명단 및 사유 확인"
                      >
                        <span className={`w-2 h-2 rounded-full ${candyBars.attendance.dotClass} animate-pulse shrink-0`} />
                        <span className="truncate text-slate-900 dark:text-slate-200 font-black tracking-tight text-[10px] sm:text-[10.5px] flex items-center">
                          <span>출결 {attendanceCount.present}/{attendanceCount.total}명</span>
                          <span className="text-[9px] sm:text-[9.5px] text-slate-700 dark:text-slate-300 ml-1 font-extrabold shrink-0">
                            (결석 {attendanceCount.absentCount}명)
                          </span>
                        </span>
                      </button>
                    )}

                    {/* 👥 출결 상세 결석자 드롭다운 팝오버 */}
                    {isAttendancePopoverOpen && (
                      <div className="absolute top-full left-0 mt-2 z-50 w-64 p-3 rounded-2xl bg-white/95 dark:bg-[#090e1a]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-white/10">
                          <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-emerald-400" />
                            <span>오늘의 출결 현황</span>
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            재석 {attendanceCount.present} / 결석 {attendanceCount.absentCount}
                          </span>
                        </div>

                        {absentStudents.length === 0 ? (
                          <div className="py-4 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 flex flex-col items-center gap-1">
                            <span>🎉 전원 출석 완료!</span>
                            <span className="text-[10px] text-slate-400 font-normal">오늘 결석/지각 학생이 없습니다.</span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                            {absentStudents.map(student => (
                              <div
                                key={student.number}
                                className="p-2 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 flex flex-col gap-0.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-extrabold text-slate-800 dark:text-white">
                                    {student.number}번 {student.name}
                                  </span>
                                  <span
                                    className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                                      student.status === 'absent'
                                        ? 'bg-rose-500/20 text-rose-500 dark:text-rose-300 border border-rose-500/30'
                                        : student.status === 'late'
                                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30'
                                        : student.status === 'early_leave'
                                        ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30'
                                        : student.status === 'nurse'
                                        ? 'bg-sky-500/20 text-sky-600 dark:text-sky-300 border border-sky-500/30'
                                        : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                                    }`}
                                  >
                                    {student.statusLabel}
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-500 dark:text-slate-300 line-clamp-2">
                                  💬 {student.reason}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 2) 📅 계기교육 / D-Day 캔디바 (2행 세로 구조로 명칭과 D-day 배지 분리하여 텍스트 겹침 원천 차단) */}
                  <div className="relative flex-1 min-w-[102px] h-full" ref={commemorativePopoverRef}>
                    <button
                      type="button"
                      onClick={() => setIsCommemorativePopoverOpen(prev => !prev)}
                      className={`w-full h-full min-h-[42px] sm:min-h-[46px] flex flex-col justify-center items-center py-1 sm:py-1.5 px-2 rounded-xl ${candyBars.commemorative.bgClass} text-slate-900 dark:text-slate-200 shadow-xs cursor-pointer transition-all backdrop-blur-md hover:scale-[1.01] active:scale-98`}
                      title="클릭 시 계기교육일 유래 및 교육적 의미 확인"
                    >
                      {/* 1행 (상단): 캘린더 아이콘 + 기념일 명칭 여유 있게 단독 표출 */}
                      <div className="flex items-center justify-center gap-1 w-full min-w-0">
                        <Calendar className={`w-3.5 h-3.5 ${candyBars.commemorative.iconClass} shrink-0`} />
                        <span className="truncate text-slate-900 dark:text-slate-200 font-black tracking-tight text-[10px] sm:text-[10.5px]">
                          {commemorativeDay.title}
                        </span>
                      </div>
                      {/* 2행 (하단): D-Day 배지 분리 배치로 글씨 가림 방지 */}
                      <div className="mt-0.5 flex items-center justify-center w-full">
                        <span className={`px-2 py-[3px] text-[11px] sm:text-[12px] font-black tabular-nums rounded-md ${candyBars.commemorative.badgeClass} leading-none shrink-0 shadow-2xs`}>
                          {commemorativeDay.daysLeft > 0 ? `D-${commemorativeDay.daysLeft}` : commemorativeDay.daysLeft === 0 ? 'D-Day' : `D+${Math.abs(commemorativeDay.daysLeft)}`}
                        </span>
                      </div>
                    </button>

                    {/* 📅 계기교육 정보 드롭다운 팝오버 */}
                    {isCommemorativePopoverOpen && (
                      <div className="absolute top-full right-0 mt-2 z-50 w-72 p-3.5 rounded-2xl bg-white/95 dark:bg-[#090e1a]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-white/10">
                          <span className="text-xs font-black text-rose-500 dark:text-rose-400 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>계기교육 안내: {commemorativeDay.title}</span>
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            {commemorativeDay.category}
                          </span>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="font-extrabold text-slate-700 dark:text-slate-300 block mb-0.5 text-[11px]">
                              📜 유래 및 역사적 배경
                            </span>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-[#0f172a] p-2 rounded-xl border border-slate-200 dark:border-white/10">
                              {commemorativeDay.origin}
                            </p>
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-700 dark:text-slate-300 block mb-0.5 text-[11px]">
                              💡 교육적 의미 및 지도 요령
                            </span>
                            <p className="text-[11px] text-indigo-600 dark:text-indigo-300 leading-relaxed bg-indigo-50/50 dark:bg-indigo-950/40 p-2 rounded-xl border border-indigo-200 dark:border-indigo-900/40">
                              {commemorativeDay.teachingPoint}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2줄: [🚪 업무종료 캔디바 또는 🏖️ 휴일 상태 배지] + [🏖️/❄️ 방학 D-Day 캔디바] */}
                <div className="flex items-center gap-1.5 w-full flex-1">
                  {/* 3) 🚪 업무종료 스마트 타임머신 캔디바: 주말/공휴일/재량휴업일인 경우 업무 종료 알림(예: "🔥 9분 남음!")을 아예 노출하지 않도록 차단 */}
                  {isWeekendOrHoliday ? (
                    <div
                      className="flex-[1.1] min-w-0 h-full min-h-[42px] sm:min-h-[46px] flex items-center justify-between gap-1 px-2.5 rounded-xl text-[10px] sm:text-[10.5px] font-black shadow-xs relative overflow-hidden backdrop-blur-md bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-400/40 select-none"
                      title={`오늘의 학사 일정: ${todayDayType.label} (업무 종료 알림 비활성화)`}
                    >
                      <div className="flex items-center gap-1 min-w-0 truncate">
                        <span className="w-2 h-2 rounded-full shrink-0 bg-purple-500 shadow-[0_0_8px_#a855f7]" />
                        <span className="text-[10px] sm:text-[10.5px] font-black tracking-tight shrink-0">학사일정</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] sm:text-[10.5px] font-black tracking-tight truncate">
                          {todayDayType.label}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`flex-[1.1] min-w-0 h-full min-h-[42px] sm:min-h-[46px] flex items-center justify-between gap-1 px-2.5 rounded-xl text-[10px] sm:text-[10.5px] font-black shadow-xs relative overflow-hidden backdrop-blur-md transition-all hover:scale-[1.01] active:scale-98 ${workStatus.badgeStyle}`}
                      title={`퇴근 시간: ${workEndTime} (남은 시간: ${workStatus.timeText})`}
                    >
                      <div className="flex items-center gap-1 min-w-0 truncate relative z-10">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${workStatus.dotStyle}`} />
                        <span className="text-[10px] sm:text-[10.5px] font-black tracking-tight shrink-0">업무종료</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 relative z-10">
                        <span className="text-[10px] sm:text-[10.5px] font-black tracking-tight">
                          {workStatus.timeText}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 4) 🏖️/❄️ 학기별 방학 D-Day 캔디바 (2행 세로 구조로 명칭과 D-day 배지 분리) */}
                  <div
                    onClick={() => onShowToast(`🏖️ [방학 안내] ${vacationInfo.text} (${vacationInfo.semester})`)}
                    className={`flex-1 min-w-[102px] h-full min-h-[42px] sm:min-h-[46px] flex flex-col justify-center items-center py-1 sm:py-1.5 px-2 rounded-xl shadow-xs transition-all cursor-pointer backdrop-blur-md hover:scale-[1.01] active:scale-98 ${candyBars.vacation.bgClass} text-slate-900 dark:text-slate-200 font-black`}
                    title={`클릭 시 방학 일정 확인 (${vacationInfo.semester})`}
                  >
                    {/* 1행 (상단): 아이콘 + 방학 명칭 단독 표출 */}
                    <div className="flex items-center justify-center gap-1 w-full min-w-0">
                      <span className={`text-[11px] shrink-0 leading-none flex items-center justify-center w-3.5 h-3.5 ${candyBars.vacation.iconClass}`}>{vacationInfo.icon}</span>
                      <span className="text-[10px] sm:text-[10.5px] font-black tracking-tight text-slate-900 dark:text-slate-200 truncate">{vacationInfo.label}</span>
                    </div>
                    {/* 2행 (하단): D-Day 배지 분리 배치 */}
                    <div className="mt-0.5 flex items-center justify-center w-full">
                      <span
                        className={`px-2 py-[3px] text-[11px] sm:text-[12px] font-black tabular-nums rounded-md text-white leading-none shrink-0 shadow-2xs ${candyBars.vacation.badgeClass}`}
                      >
                        {vacationInfo.daysLeft > 0 ? `D-${vacationInfo.daysLeft}` : vacationInfo.daysLeft === 0 ? 'D-Day' : `D+${Math.abs(vacationInfo.daysLeft)}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 📅 계절 테마 캘린더 카드 + 🌙 달의 위상(음력) 아이콘 탑재 (가로 공간 유연 확장 w-[124px] sm:w-[136px]) */}
              <div
                className={`w-[124px] sm:w-[136px] h-[98px] sm:h-[104px] flex flex-col justify-between py-2 sm:py-2.5 px-2.5 sm:px-3 rounded-[22px] ${seasonTheme.bgClass} shrink-0 select-none cursor-default transition-all duration-300 hover:scale-[1.02] active:scale-98 backdrop-blur-xl box-border shadow-md`}
                title={`${flipYear}년 ${currentDate.getMonth() + 1}월 ${currentDate.getDate()}일 (${DAYS_FULL_EN[currentDate.getDay()]}) • ${seasonTheme.name} 계절 테마 • ${moonPhase.tooltip}`}
              >
                {/* 1행: [ 📅 2026 ] 캡슐 배지 + 오른쪽: 영어 월 줄임말(OCT) & 계절 아이콘 */}
                <div className="flex items-center justify-between gap-1 w-full leading-none shrink-0 pt-0.5">
                  <div className={`px-1.5 py-[2px] rounded-full ${seasonTheme.badgeBg} backdrop-blur-md flex items-center gap-0.5 text-[8px] sm:text-[8.5px] font-extrabold leading-none border shadow-xs shrink-0`}>
                    <Calendar className="w-2.5 h-2.5 shrink-0" />
                    <span>{flipYear}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 text-right">
                    <span className="text-[8px] sm:text-[9px] opacity-80">{seasonTheme.icon}</span>
                    <span className="text-[9.5px] sm:text-[10.5px] font-black text-white tracking-widest uppercase">
                      {MONTHS_EN[currentDate.getMonth()]}
                    </span>
                  </div>
                </div>

                {/* 2행: 대형 날짜 + 🌙 달의 위상(음력) 배지 */}
                <div className="flex items-center justify-between gap-1.5 w-full my-auto shrink-0 py-0.5 px-0.5">
                  <span
                    className="text-[28px] sm:text-[32px] font-black text-white tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)] leading-none"
                    style={{ fontFamily: 'var(--app-font-family, inherit)' }}
                  >
                    {currentDate.getDate()}
                  </span>
                  {/* 🌙 달의 위상 칩 (클릭 시 밝기변화+슬라이드다운으로 실제 달 형상 이미지 팝오버 토글) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMoonModalOpen((prev) => !prev);
                    }}
                    className={`flex flex-col items-center justify-center px-1.5 py-1 rounded-xl bg-white/15 dark:bg-black/30 border border-white/20 backdrop-blur-md shadow-2xs cursor-pointer transition-all duration-200 hover:scale-105 hover:bg-white/25 active:scale-95 shrink-0 ${
                      isMoonModalOpen ? 'ring-2 ring-amber-300 bg-white/30 shadow-[0_0_12px_rgba(253,224,71,0.5)]' : ''
                    }`}
                    title="클릭하여 실제 달의 위상 및 형상 이미지 보기"
                    aria-expanded={isMoonModalOpen}
                  >
                    <span className="text-sm leading-none drop-shadow-[0_0_6px_rgba(255,255,255,0.7)]">
                      {moonPhase.icon}
                    </span>
                    <span className="text-[7.5px] sm:text-[8px] font-extrabold text-white/95 mt-0.5 tracking-tighter leading-none">
                      음력 {moonPhase.lunarDay}일
                    </span>
                  </button>
                </div>

                {/* 3행: 날짜 아래 영어 요일 줄임말(SAT) + 계절 라벨 표시 */}
                <div className="flex items-center justify-between text-[8.5px] sm:text-[9.5px] font-black text-white/95 tracking-wider leading-none shrink-0 pb-0.5 px-0.5 uppercase">
                  <span>{DAYS_EN[currentDate.getDay()]}</span>
                  <span className="text-[8px] sm:text-[8.5px] font-extrabold text-white/80 lowercase">
                    {seasonTheme.name}
                  </span>
                </div>
              </div>

              {/* ⌨️ [단축키 안내] 버튼 */}
              {onOpenShortcuts && (
                <div className="flex flex-col justify-center items-center gap-1.5 h-full shrink-0">
                  {/* 🚪 [대시보드 접기] 버튼: 루미 문으로 쏙 → 바탕화면 미니 아이콘 */}
                  {onCollapseDashboard && (
                    <button
                      type="button"
                      onClick={onCollapseDashboard}
                      className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 text-violet-600 dark:bg-violet-950/50 dark:hover:bg-violet-900/70 dark:text-violet-300 border border-violet-400/40 shadow-xs flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
                      title={`대시보드 접기 (단축키: ${shortcutHint('collapseDashboard')}) · 바탕화면의 루미 문을 누르면 다시 펼쳐져요`}
                      aria-label="대시보드 접기"
                    >
                      <Minimize2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onOpenShortcuts}
                    className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/70 dark:text-indigo-300 border border-indigo-400/40 shadow-xs flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
                    title={`키보드 단축키 안내 (단축키: ${shortcutHint('help')})`}
                    aria-label="키보드 단축키 안내"
                  >
                    <Keyboard className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* 🔒 [화면잠금] & 🎛️ [슬라이더 설정] 버튼: 세로 2단(위/아래) 콤팩트 재배치로 가로 공간 대폭 절약 */}
              <div className="flex flex-col justify-center items-center gap-1.5 h-full shrink-0">
                {/* 위단: 🔒 화면 잠금 아이콘 버튼 */}
                {onLockScreen && (
                  <button
                    type="button"
                    onClick={onLockScreen}
                    className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-600 dark:bg-cyan-950/50 dark:hover:bg-cyan-900/70 dark:text-cyan-300 border border-cyan-400/40 shadow-xs flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
                    title={`화면 잠금 (단축키: ${shortcutHint('lock')})`}
                  >
                    <Lock className="w-4 h-4 text-cyan-600 dark:text-cyan-300" />
                  </button>
                )}

                {/* 아래단: 🎛️ 메인 환경설정 슬라이더 버튼 */}
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl bg-white/80 hover:bg-white text-slate-600 dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 shadow-xs flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
                  title={`환경설정 (단축키: ${shortcutHint('settings')})`}
                >
                  <Sliders className="w-4 h-4 text-slate-600 dark:text-slate-300 hover:rotate-12 transition-transform" />
                </button>
              </div>
            </div>
          </div>

          {/* 2. ➖➖ 선을 기준으로 분리: 상하 여백(my-2 sm:my-2.5)을 주어 여유 공간 확보 ➖➖ */}
          <div className={`w-full h-[1.5px] ${themeConfig.headerDividerClass || 'bg-slate-200 dark:bg-slate-700/80'} my-2 sm:my-2.5 shrink-0 rounded-full transition-colors`} />

          {/* 3. [ 하단 분리 구역: 바로가기 바 (수직 중앙 정렬) ] */}
          <div className="w-full flex items-center justify-between gap-2.5 py-0.5 overflow-x-auto no-scrollbar">
            {/* 좌측: 바로가기 라벨 + 바로가기 칩 버튼 목록 */}
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              {/* 바로가기 아이콘 라벨 */}
              <div className={`flex items-center gap-1 text-xs font-black px-1 shrink-0 ${themeConfig.headerBookmarkLabelClass || 'text-cyan-600 dark:text-cyan-400'}`}>
                <ExternalLink className="w-3.5 h-3.5" />
                <span>바로가기</span>
              </div>

              {/* 🖐️ 드래그 앤 드롭으로 위치/순서 변경이 가능한 바로가기 캡슐 버튼 목록 */}
              {bookmarks.map((b, idx) => {
                if (b.groupId && bookmarkGroups.some((g) => g.id === b.groupId)) return null;
                const isBeingDragged = draggedBookmarkIndex === idx;
                const isDragOver = dragOverBookmarkIndex === idx;
                const dotColor = getBookmarkDotColor(b, idx);

                return (
                  <div
                    key={b.id || idx}
                    draggable
                    onDragStart={(e) => handleBookmarkDragStart(e, idx)}
                    onDragOver={(e) => handleBookmarkDragOver(e, idx)}
                    onDrop={(e) => handleBookmarkDrop(e, idx)}
                    onDragEnd={handleBookmarkDragEnd}
                    className="relative inline-flex items-center"
                  >
                    <button
                      type="button"
                      onClick={() => handleBookmarkClick(b)}
                      className={`group flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-white/90 dark:bg-[#090e1a]/85 hover:bg-white dark:hover:bg-[#131d33] text-[#292638] dark:text-[#f8fafc] border shadow-2xs hover:shadow-xs transition-all cursor-grab active:cursor-grabbing text-xs font-bold shrink-0 select-none backdrop-blur-md ${isBeingDragged
                          ? 'opacity-30 scale-95 border-dashed border-[#7457F5] bg-[#E8E1FF]/40 dark:bg-indigo-950/40'
                          : isDragOver
                            ? 'border-[#7457F5] ring-2 ring-[#7457F5]/50 scale-105 bg-[#E8E1FF]/50 dark:bg-indigo-950/60 shadow-md'
                            : 'border-[#E8E5ED] dark:border-white/10 dark:hover:border-cyan-400/50'
                        }`}
                      title={`${b.title}\n• ${b.type === 'app' ? `클릭: 컴퓨터 프로그램 실행 (${b.url})` : b.openMode === 'popup' ? '클릭: 프로그램 안 팝업 창으로 열기' : '클릭: 기본 브라우저로 열기'}\n• 드래그: 원하는 위치로 드래그 앤 드롭하여 순서 변경`}
                    >
                      {/* 드래그 가능 핸들 (6점 아이콘) */}
                      <GripVertical className="w-3 h-3 text-slate-400/60 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors -ml-0.5 shrink-0" />
                      <span className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
                      <span className="truncate max-w-[130px] sm:max-w-none">{b.title}</span>
                      {b.type === 'app' ? (
                        <span className="flex items-center gap-0.5 text-[10px] text-indigo-500 dark:text-indigo-400 ml-0.5 font-bold">
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span className="text-[9px] uppercase tracking-tighter opacity-80">앱</span>
                        </span>
                      ) : b.openMode === 'popup' ? (
                        <AppWindow className="w-2.5 h-2.5 opacity-60 ml-0.5 shrink-0" />
                      ) : (
                        <ExternalLink className="w-2.5 h-2.5 opacity-60 ml-0.5 shrink-0" />
                      )}
                    </button>
                  </div>
                );
              })}

              {/* 🗂️ 바로가기 그룹 폴더 — 누르면 목록이 펼쳐져요 */}
              {bookmarkGroups.map((g) => {
                const items = bookmarks.filter((b) => b.groupId === g.id);
                const isOpen = openGroup?.id === g.id;
                const showImg = !!g.iconUrl && !brokenGroupIcons[g.id];
                return (
                  <button
                    key={g.id}
                    type="button"
                    data-bm-group-btn
                    onClick={(e) => {
                      if (isOpen) { setOpenGroup(null); return; }
                      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setOpenGroup({ id: g.id, x: r.left, y: r.bottom + 6 });
                    }}
                    className={`bm-folder group flex items-center gap-1.5 pl-1 pr-2.5 py-0.5 rounded-xl border text-xs font-bold shrink-0 select-none transition-all cursor-pointer backdrop-blur-md ${isOpen ? 'is-open border-[#7457F5] bg-[#E8E1FF]/70 dark:bg-indigo-950/60 text-[#4c2fd1] dark:text-indigo-200' : 'border-[#E8E5ED] dark:border-white/10 bg-white/90 dark:bg-[#090e1a]/85 text-[#292638] dark:text-[#f8fafc] hover:border-[#7457F5]/60'}`}
                    title={`${g.name} 그룹 (${items.length}개) — 눌러서 펼치기`}
                    aria-expanded={isOpen}
                  >
                    <span className="bm-folder-icon w-6 h-6 rounded-lg overflow-hidden grid place-items-center shrink-0 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300">
                      {showImg ? (
                        <img src={g.iconUrl} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" onError={() => setBrokenGroupIcons((m) => ({ ...m, [g.id]: true }))} />
                      ) : isOpen ? <FolderOpenIcon className="w-3.5 h-3.5" /> : <Folder className="w-3.5 h-3.5" />}
                    </span>
                    <span className="truncate max-w-[120px]">{g.name || '이름 없는 그룹'}</span>
                    <span className="text-[10px] font-black px-1.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300">{items.length}</span>
                  </button>
                );
              })}
            </div>

            {/* ④ [+ 바로가기 추가] 보라색(#7457F5) 주요 실행 버튼 */}
            <div className="relative shrink-0 ml-auto flex items-center gap-2">
              <DeadlineBadge />
              <button
                type="button"
                onClick={() => setIsBookmarkModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#7457F5] hover:bg-[#6243E8] text-white shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95 text-xs font-black shrink-0"
                title="바로가기 사이트 추가 및 관리"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>바로가기 추가</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {openGroup && (() => {
        const g = bookmarkGroups.find((x) => x.id === openGroup.id);
        if (!g) return null;
        const items = bookmarks.filter((b) => b.groupId === g.id);
        const left = Math.max(8, Math.min(openGroup.x, window.innerWidth - 288));
        return createPortal(
          <div data-bm-group-pop className="bm-group-pop fixed z-[9500] w-[280px] rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-xl shadow-2xl p-2" style={{ left, top: openGroup.y }}>
            <div className="flex items-center justify-between px-2 pt-1 pb-2">
              <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">🗂️ {g.name}</span>
              <span className="text-[10px] font-bold text-slate-400">{items.length}개</span>
            </div>
            {items.length === 0 ? (
              <p className="text-[11px] text-slate-400 px-2 pb-2">비어 있어요. [바로가기 추가]에서 이 그룹을 골라 넣어 보세요.</p>
            ) : (
              <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                {items.map((b, i) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => { setOpenGroup(null); handleBookmarkClick(b); }}
                    className="bm-group-item flex items-center gap-2 px-2.5 py-2 rounded-xl text-left hover:bg-indigo-50 dark:hover:bg-indigo-500/15 transition"
                    style={{ animationDelay: `${i * 35}ms` }}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${getBookmarkDotColor(b, bookmarks.indexOf(b))}`} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{b.title}</span>
                      <span className="block text-[10px] text-slate-400 truncate font-mono">{b.type === 'app' ? '💻 프로그램' : b.url.replace(/^https?:\/\//, '')}</span>
                    </span>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300 shrink-0">
                      {b.type === 'app' ? '앱' : b.openMode === 'popup' ? '팝업' : '브라우저'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>,
          document.body,
        );
      })()}

      {/* 🔗 바로가기 사이트 관리 전용 모달 (추가 / 수정 / 삭제 / 순서변경) */}
      <BookmarkManageModal
        isOpen={isBookmarkModalOpen}
        onClose={() => setIsBookmarkModalOpen(false)}
        bookmarks={bookmarks}
        onSaveBookmarks={handleSaveBookmarks}
        groups={bookmarkGroups}
        onSaveGroups={handleSaveBookmarkGroups}
        onShowToast={onShowToast}
        isDarkMode={isDarkMode}
      />

      {/* 🌙 실제 날짜의 달 형상 이미지 & 위상 팝오버 (밝기변화 + 슬라이드다운) */}
      <MoonPhaseModal
        isOpen={isMoonModalOpen}
        onClose={() => setIsMoonModalOpen(false)}
        currentDate={currentDate}
      />
    </div>
  );
};
