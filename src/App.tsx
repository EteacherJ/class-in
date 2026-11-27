import SequenceTimer from './components/SequenceTimer';
import StackResizer from './components/StackResizer';
import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import { needsMorningReset, markMorningReset, resetAttendanceList, broadcastAttendance } from './utils/attendanceReset';
import { Sparkles, Magnet, Wand2, Shield, Lock, Plus, Minus, RotateCcw, ZoomIn, ZoomOut, ExternalLink, Bookmark, Maximize2, X, Calendar, CalendarCheck, CalendarDays, Timer, BookOpen, Phone, UserCheck, Utensils } from 'lucide-react';
import {
  ClassroomMode,
  ClassConfig,
  Student,
  Team,
  AgendaItem,
  DailySchedule,
  ClassRole,
  QuizQuestion,
  RolePeriodInfo,
  DashboardTheme,
  AttendanceStatus,
  AttendanceReasonCategory,
  ObservationRecord,
  ObservationWidgetRecord,
  PraiseItemConfig,
  PraiseHistoryLog,
  SecurityConfig,
  WidgetPlacementMode,
  SidebarLayoutMode,
  PostItColor,
  PostItWidgetData,
} from './types';
import {
  initialClassConfig,
  initialTeams,
  initialStudents,
  initialAgendas,
  weeklySchedule,
  initialRoles,
  initialQuizzes,
  initialPeriodInfo,
  sampleObservationRecords,
  initialPraiseConfigs,
  initialObservationWidgetRecords,
} from './data/initialData';
import { Header } from './components/Header';
import { TimerWidget } from './components/TimerWidget';
import { PickerWidget } from './components/PickerWidget';
import { SeatingWidget } from './components/SeatingWidget';
import { AgendaWidget } from './components/AgendaWidget';
import { TimetableWidget } from './components/TimetableWidget';
import { NoiseMonitorWidget } from './components/NoiseMonitorWidget';
import { AttendanceWidget } from './components/AttendanceWidget';
import { ClassRolesWidget } from './components/ClassRolesWidget';
import { ClassCalendarWidget } from './components/ClassCalendarWidget';
import { SchoolMealWidget } from './components/SchoolMealWidget';
import { MiniMealStackWidget } from './components/MiniMealStackWidget';
import { HomeworkCheckWidget } from './components/HomeworkCheckWidget';
import { DDayWidget } from './components/DDayWidget';
import { ObservationWidget } from './components/ObservationWidget';
import { SchoolInfoWidget } from './components/SchoolInfoWidget';
import { TeacherQuoteWidget } from './components/TeacherQuoteWidget';
import { MiniCalendarStackWidget } from './components/MiniCalendarStackWidget';
import { MiniTimetableStackWidget } from './components/MiniTimetableStackWidget';
import { MiniDDayStackWidget } from './components/MiniDDayStackWidget';
import { MiniSchoolInfoStackWidget } from './components/MiniSchoolInfoStackWidget';
import { MiniAttendanceStackWidget } from './components/MiniAttendanceStackWidget';
import { BookmarksWidget } from './components/BookmarksWidget';
import { PraiseModal } from './components/PraiseModal';
import { SafeBoundary } from './components/SafeBoundary';
import { TTiAiAssistant } from './components/TTiAiAssistant';
import { ObservationModal } from './components/ObservationModal';
import { GlossyLockScreen } from './components/GlossyLockScreen';
import { MessengerNoteModal } from './components/MessengerNoteModal';
import { MemoWidget } from './components/MemoWidget';
import { MemoEditModal, MemoItem } from './components/MemoEditModal';
import { QuickDock, DOCK_ITEMS } from './components/QuickDock';
import { ResizableWidgetCard, WidgetSpan } from './components/ResizableWidgetCard';
import { ClockWidget } from './components/ClockWidget';
import { StageManagerStrip } from './components/StageManagerStrip';
import { PostItWidget } from './components/PostItWidget';
import { YouTubeWidget } from './components/YouTubeWidget';
import { YouTubeMiniPlayer } from './components/YouTubeMiniPlayer';
import { YouTubePlayerWidget } from './components/YouTubePlayerWidget';
import { FlipClockWidget } from './components/FlipClockWidget';
import { StackTopCarousel } from './components/StackTopCarousel';
import { StackBottomDrawerCarousel } from './components/StackBottomDrawerCarousel';
import { IdeaNoteWidget } from './components/IdeaNoteWidget';
import { IdeaRecordModal } from './components/IdeaRecordModal';
import { IdeaSettingsModal } from './components/IdeaSettingsModal';
import { SubjectTimetableWidget } from './components/SubjectTimetableWidget';
import { SubjectRosterWidget } from './components/SubjectRosterWidget';
import { SubjectJournalWidget } from './components/SubjectJournalWidget';
import {
  DEFAULT_DASHBOARD_STATE,
  getHydratedDashboardState,
  saveStandardDashboardState,
} from './constants/defaultDashboardState';
import { YouTubeFoldBehavior, IdeaItem, IdeaSettings, DEFAULT_IDEA_SETTINGS, DEFAULT_MOCK_IDEAS } from './types';
import {
  playSelectedChime,
  playCelebrateSound,
  setGlobalSoundEnabled,
  isGlobalSoundEnabled,
  WidgetSfxMode,
  getWidgetSfxMode,
  setWidgetSfxMode,
  playWidgetDragStartSound,
  playWidgetSnapSound,
} from './utils/audio';
import { getFontFamily, resolveIsDarkMode, THEME_CONFIGS, getTheme } from './utils/theme';
import { analyzeGridGaps, optimizeGridLayout } from './utils/layoutOptimizer';
import { alignFreeWidgetsMagnet, alignInPlace, measureTopGaps, packLayout } from './utils/magnetLayoutAligner';
import { migrateLegacyPin } from './utils/pinSecurity';

import { getWidgetName } from './constants/widgetRegistry';
import { matchShortcut, TIMER_TOGGLE_EVENT, LUMI_TOGGLE_EVENT, SHORTCUTS, shortcutHint } from './constants/shortcuts';
import { ShortcutHelpModal } from './components/ShortcutHelpModal';
import { installTouchAssist } from './utils/touchAssist';
import { largeGet, largeSet } from './utils/largeStore';
import { installMotionManager } from './utils/motion';

import { classifySystemNotice, showIsland } from './utils/island';
import { swapDeskPositions } from './utils/seatingLayout';
import { IntroSplash } from './components/IntroSplash';
import { StickerLayer } from './components/StickerLayer';
import { CommandPalette, PaletteCommand } from './components/CommandPalette';
import { CareCenter } from './components/CareCenter';
import { StickerModeOverlay } from './components/StickerModeOverlay';
import { LumiDoor } from './components/LumiDoor';
import { MiniLumiWindow } from './components/MiniLumiWindow';
import { MochiBody, useMochiTint } from './components/MochiCharacter';
import { DuskBackdrop } from './components/DuskBackdrop';
import { createPortal } from 'react-dom';
import { DynamicIsland } from './components/DynamicIsland';

/** 데스크톱 앱 창 재질: 'vibrancy'(맥 흐림) / 'acrylic'(윈도우11 흐림) / 'transparent'(선명 투명) / 'none'(웹·윈도우10) */
const WINDOW_GLASS: 'vibrancy' | 'acrylic' | 'transparent' | 'none' = (() => {
  try {
    const m = (window as any).electronAPI?.getWindowMaterial?.();
    return m === 'vibrancy' || m === 'acrylic' || m === 'transparent' ? m : 'none';
  } catch {
    return 'none';
  }
})();
// ⚡ [성능] 큰 화면·모달은 처음 필요할 때 불러오기 (첫 실행 속도 개선)
const BreakModeView = lazy(() => import('./components/BreakModeView').then((m) => ({ default: m.BreakModeView })));
const CleanDismissalModeView = lazy(() => import('./components/CleanDismissalModeView').then((m) => ({ default: m.CleanDismissalModeView })));
const QuizModeView = lazy(() => import('./components/QuizModeView').then((m) => ({ default: m.QuizModeView })));
const ClassSettingsModal = lazy(() => import('./components/ClassSettingsModal').then((m) => ({ default: m.ClassSettingsModal })));
const AIAssistantModal = lazy(() => import('./components/AIAssistantModal').then((m) => ({ default: m.AIAssistantModal })));
const ClassRolesModal = lazy(() => import('./components/ClassRolesModal').then((m) => ({ default: m.ClassRolesModal })));
const QuizModal = lazy(() => import('./components/QuizModal').then((m) => ({ default: m.QuizModal })));
const DualMonitorPopupModal = lazy(() => import('./components/DualMonitorPopupModal').then((m) => ({ default: m.DualMonitorPopupModal })));

/** 한 번이라도 true 가 되면 계속 true (모달을 처음 열 때만 불러오고, 이후엔 닫힘 애니메이션을 위해 유지) */
function useEverTrue(flag: boolean): boolean {
  const ref = useRef(false);
  if (flag) ref.current = true;
  return ref.current;
}

// 🖥️ 모니터 해상도 및 화면비율 정보 인터페이스
interface ScreenInfo {
  width: number;
  height: number;
  ratio: number;
  aspectLabel: string;
  deviceType: 'laptop' | 'desktop' | 'ultrawide' | 'smartboard';
  deviceLabel: string;
  optimalColumns: number; // 3, 4, 5
  recommendedDefaultSpan: WidgetSpan; // 3 or 4
  baseWidgetHeight: number; // 화면 해상도에 맞춘 기본 위젯 높이 (노트북 380, 27인치 480, 대형 500)
  gridMinColWidth: number; // 사이드바가 열려 있어도 안정적인 최소 컬럼 너비 (노트북 300, 27인치 310~320)
  contentZoom: number; // 대형 화면 본문 폰트/UI 비례 스케일링 배율 (27인치 1.12, 기본 1.0)
}

// 📐 해상도 및 화면비율에 따른 최적 그리드 열 수 및 모드 판별 헬퍼
function calculateScreenInfo(
  width: number,
  height: number,
  isSmartBoard: boolean,
  sidebarMode: 'BOTH' | 'LEFT_ONLY' | 'RIGHT_ONLY' | 'NONE' = 'BOTH'
): ScreenInfo {
  const ratio = width / (height || 1);
  let aspectLabel = '16:9';
  if (ratio >= 2.2) aspectLabel = '21:9+';
  else if (ratio >= 1.7) aspectLabel = '16:9';
  else if (ratio >= 1.55) aspectLabel = '16:10';
  else if (ratio >= 1.3) aspectLabel = '4:3';
  else aspectLabel = `${ratio.toFixed(2)}:1`;

  // 양쪽 사이드바 개폐에 따른 가용 중앙 캔버스 폭 추정 (사이드바 폭 약 280~310px)
  const leftSidebarW = sidebarMode === 'BOTH' || sidebarMode === 'LEFT_ONLY' ? 310 : 0;
  const rightSidebarW = sidebarMode === 'BOTH' || sidebarMode === 'RIGHT_ONLY' ? 280 : 0;
  const availableCanvasWidth = Math.max(700, width - leftSidebarW - rightSidebarW);

  let deviceType: 'laptop' | 'desktop' | 'ultrawide' | 'smartboard' = 'desktop';
  let deviceLabel = '27인치 데스크톱';
  let optimalColumns = 4;
  let recommendedDefaultSpan: WidgetSpan = 3;
  let baseWidgetHeight = 480;
  let gridMinColWidth = 315;
  let contentZoom = 1.12;

  if (isSmartBoard) {
    deviceType = 'smartboard';
    deviceLabel = '전자칠판 모드';
    optimalColumns = 4;
    recommendedDefaultSpan = 3;
    baseWidgetHeight = 500;
    gridMinColWidth = 320;
    contentZoom = 1.15;
  } else if (width >= 2100) {
    deviceType = 'ultrawide';
    deviceLabel = `${aspectLabel} 울트라와이드`;
    optimalColumns = 5;
    recommendedDefaultSpan = 3;
    baseWidgetHeight = 500;
    gridMinColWidth = 330;
    contentZoom = 1.15;
  } else if (width >= 1350 || availableCanvasWidth >= 1150) {
    // 💡 [27인치 대형 화면]: 양쪽 사이드바가 모두 열려 있어도 4열이 안정적으로 들어가도록 gridMinColWidth를 315px로 최적화
    deviceType = 'desktop';
    deviceLabel = `${aspectLabel} 27인치 데스크톱`;
    optimalColumns = 4;
    recommendedDefaultSpan = 3;
    baseWidgetHeight = 480;
    gridMinColWidth = 315;
    contentZoom = 1.12;
  } else {
    deviceType = 'laptop';
    deviceLabel = `${aspectLabel} 노트북/맥북`;
    optimalColumns = 3;
    recommendedDefaultSpan = 4;
    baseWidgetHeight = 380;
    gridMinColWidth = 300;
    contentZoom = 1.0;
  }

  return {
    width,
    height,
    ratio,
    aspectLabel,
    deviceType,
    deviceLabel,
    optimalColumns,
    recommendedDefaultSpan,
    baseWidgetHeight,
    gridMinColWidth,
    contentZoom,
  };
}

export default function App() {
  // ⚙️ [Core State]: 로컬 스토리지에 저장된 환경 설정(테마, 배경 등) 완벽 복원
  // ⚠️ 중요: config를 참조하는 useEffect 및 screenInfo보다 먼저 선언하여 TDZ ReferenceError를 영구 방지합니다.
  const [config, setConfig] = useState<ClassConfig>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_config');
      const savedTheme = localStorage.getItem('class_dashboard_theme') as DashboardTheme | null;
      const validThemes: DashboardTheme[] = [
        'elementary',
        'pastel',
        'indigo',
        'emerald',
        'lavender',
        'cafe',
        'sunset',
        'office',
        'slate',
      ];

      if (saved) {
        const parsed = JSON.parse(saved);
        // 🔄 [요구사항 1, 2, 3]: 기존 저장된 기본값을 새 기본값으로 마이그레이션
        if (parsed.dashboardTitle === '스마트 교실 보드') parsed.dashboardTitle = 'My Class';
        if (!parsed.workDashboardTitle || parsed.workDashboardTitle === '선생님 업무 보드') parsed.workDashboardTitle = 'My Work';
        
        // 🎨 [테마 영속성 100% 보장]: class_dashboard_theme 독립 키 우선 복원 및 9종 테마 검증
        if (savedTheme && validThemes.includes(savedTheme)) {
          parsed.theme = savedTheme;
        } else if (!validThemes.includes(parsed.theme)) {
          parsed.theme = 'pastel';
        }

        // 🎨 [사용자 테마 모드 및 배경색 설정 보존]:
        // 사용자가 명시적으로 선택한 다크 모드('dark') 또는 커스텀 배경색 설정을 덮어쓰지 않고 안전하게 유지합니다.
        if (parsed.themeMode && !['system', 'light', 'dark'].includes(parsed.themeMode)) {
          parsed.themeMode = 'system';
        }


        // 🔄 [급식 데이터 캐시 자동 정화]: 비정상 구조 캐시 삭제 및 안전 복구
        try {
          const savedMeal = localStorage.getItem('class_school_meal_data');
          if (savedMeal) {
            const parsedMeal = JSON.parse(savedMeal);
            if (!parsedMeal?.today?.menuItems || !Array.isArray(parsedMeal.today.menuItems)) {
              localStorage.removeItem('class_school_meal_data');
            }
          }
        } catch {}

        // 🎯 [포커스 모드 위젯 목록 복원 및 사이드 덱 기본값 설정]
        if (!parsed.focusWidgetIds) {
          try {
            const savedFocus = localStorage.getItem('focusWidgetIds');
            if (savedFocus) parsed.focusWidgetIds = JSON.parse(savedFocus);
          } catch (e) {}
        }
        if (!parsed.focusWidgetIds) {
          parsed.focusWidgetIds = ['clock', 'agenda', 'timetable', 'quote', 'observation'];
        }
        if (parsed.stageManagerMode === undefined) {
          parsed.stageManagerMode = true;
        }

        const savedTeacherMode = localStorage.getItem('ttime_teacher_mode') as 'homeroom' | 'subject' | null;
        if (savedTeacherMode) {
          parsed.teacherMode = savedTeacherMode;
        }

        // 💎 [리퀴드 글래스 v1 1회 마이그레이션] 이전 기본값(거의 불투명 0.95)을 가독성 우선 유리 기본값(0.8)으로
        try {
          if (!localStorage.getItem('class_dashboard_glass_v1')) {
            if (parsed.widgetOpacity === undefined || parsed.widgetOpacity >= 0.95) parsed.widgetOpacity = 0.8;
            localStorage.setItem('class_dashboard_glass_v1', '1');
          }
        } catch {}

        // 정화된 설정을 로컬 스토리지에 즉시 동기화
        const sanitized = { ...initialClassConfig, ...parsed };
        try {
          localStorage.setItem('class_dashboard_config', JSON.stringify(sanitized));
          localStorage.setItem('class_dashboard_theme', sanitized.theme);
        } catch {}

        console.log('🟢 [Config] 로컬 환경설정 정화 및 복원 완료 -> 테마:', sanitized.theme, '모드:', sanitized.themeMode, '교사모드:', sanitized.teacherMode);
        return sanitized;
      }

      const savedTeacherMode = localStorage.getItem('ttime_teacher_mode') as 'homeroom' | 'subject' | null;
      if (savedTheme && validThemes.includes(savedTheme)) {
        return { ...initialClassConfig, theme: savedTheme, teacherMode: savedTeacherMode || 'homeroom' };
      }
    } catch (e) {
      console.error('🔴 [Config] 로컬 설정 복원 실패:', e);
    }
    const fallbackTeacherMode = (typeof window !== 'undefined' ? localStorage.getItem('ttime_teacher_mode') : null) as 'homeroom' | 'subject' | null;
    return { ...initialClassConfig, teacherMode: fallbackTeacherMode || 'homeroom' };
  });

  // 🖥️ [모니터 해상도 및 화면비율 실시간 감지 커스텀 훅 / 상태 (Debounce 100ms)]
  const [screenInfo, setScreenInfo] = useState<ScreenInfo>(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const h = typeof window !== 'undefined' ? window.innerHeight : 1080;
    return calculateScreenInfo(w, h, config?.boardType === 'smart');
  });


  // 🛡️ [보안] 평문 관리자 PIN → 해시 저장소로 1회 이전 후, 설정 객체의 평문 흔적 제거
  useEffect(() => {
    migrateLegacyPin()
      .then(() => {
        setConfig((prev) =>
          prev.securityConfig?.passwordHash
            ? { ...prev, securityConfig: { ...prev.securityConfig, passwordHash: '' } }
            : prev
        );
      })
      .catch((err) => console.warn('🟡 [Security] PIN 마이그레이션 실패:', err));
  }, []);

  useEffect(() => {
    let timeoutId: any = null;
    const handleResize = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setScreenInfo(calculateScreenInfo(window.innerWidth, window.innerHeight, config.boardType === 'smart'));
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, [config.boardType]);
  const [mode, setMode] = useState<ClassroomMode>('lesson');
  const [teams, setTeams] = useState<Team[]>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_teams');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return initialTeams;
  });
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_students');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        // 🌱 새 학기로 비운 명단은 예시 학생으로 채우지 않아요
        if (Array.isArray(parsed) && localStorage.getItem('class_new_semester_at')) return parsed;
      }
    } catch {}
    return initialStudents;
  });

  // 학생 및 모둠 정보 로컬스토리지 자동 영속화
  useEffect(() => {
    try {
      localStorage.setItem('class_dashboard_teams', JSON.stringify(teams));
    } catch {}
  }, [teams]);

  useEffect(() => {
    try {
      localStorage.setItem('class_dashboard_students', JSON.stringify(students));
    } catch {}
  }, [students]);

  // 🌅 매일 08:00 이후 첫 실행 · 1분마다 확인 → 모두 '미등교'로 시작 (하루 한 번)
  useEffect(() => {
    const check = () => {
      if (!needsMorningReset()) return;
      markMorningReset();
      setStudents((prev) => {
        const u = resetAttendanceList(prev);
        broadcastAttendance(u);
        return u;
      });
    };
    check();
    const t = window.setInterval(check, 60 * 1000);
    return () => window.clearInterval(t);
  }, []);
  // 🔄 출석 리셋 (버튼)
  const showToastRef = useRef<((m: string) => void) | null>(null);
  const handleResetAttendance = useCallback(() => {
    setStudents((prev) => {
      const u = resetAttendanceList(prev);
      broadcastAttendance(u);
      return u;
    });
    showToastRef.current?.('🔄 출석을 모두 미등교로 되돌렸어요. 등교 터치로 다시 확인해요.');
  }, []);
  const [agendas, setAgendas] = useState<AgendaItem[]>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_agendas');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return initialAgendas;
  });
  // 📝 할 일·전달사항 저장 (보조창 아침 화면에서도 보여요)
  useEffect(() => {
    try {
      localStorage.setItem('class_dashboard_agendas', JSON.stringify(agendas));
    } catch {}
  }, [agendas]);
  const [schedule, setSchedule] = useState<DailySchedule>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_schedule') || localStorage.getItem('smart_dashboard_timetable');
      if (saved) return JSON.parse(saved);
    } catch {}
    return weeklySchedule;
  });

  // 🔄 시간표 외부 동기화 이벤트 수신 ('class-schedule-updated')
  useEffect(() => {
    const handleScheduleUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<DailySchedule>;
      if (customEvent.detail) {
        console.log('🟢 [App.tsx] 시간표 외부 동기화 이벤트 수신 -> 메인 화면 즉시 갱신');
        setSchedule(customEvent.detail);
      }
    };
    window.addEventListener('class-schedule-updated', handleScheduleUpdated);
    return () => window.removeEventListener('class-schedule-updated', handleScheduleUpdated);
  }, []);

  // 💾 시간표 변경 시 영구 저장 (직접 입력 · 판독 결과 모두)
  const scheduleFirstRun = useRef(true);
  useEffect(() => {
    if (scheduleFirstRun.current) {
      scheduleFirstRun.current = false;
      // 처음 실행: 저장된 시간표가 없으면 기본 시간표라도 저장 → 보조화면 '다음 수업 안내'가 과목을 읽을 수 있게
      try {
        if (!localStorage.getItem('class_dashboard_schedule')) localStorage.setItem('class_dashboard_schedule', JSON.stringify(schedule));
      } catch {}
      return;
    }
    try {
      localStorage.setItem('class_dashboard_schedule', JSON.stringify(schedule));
      localStorage.setItem('smart_dashboard_timetable', JSON.stringify(schedule));
    } catch {}
  }, [schedule]);

  // 🗓️ 구글 드라이브 공유 폴더 → 매주 자동 시간표 (앱 시작 시 · 6시간마다 확인)
  //  - 평일: 이번 주 파일, 토·일: 다음 주 파일을 찾아 반영 (같은 주는 한 번만)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const folderId = localStorage.getItem('ttime_gdrive_folder_id') || '';
        if (!folderId || localStorage.getItem('ttime_gdrive_auto_sync') === 'false') return;
        const now = new Date();
        const target = new Date(now);
        if (now.getDay() === 6) target.setDate(now.getDate() + 2);
        if (now.getDay() === 0) target.setDate(now.getDate() + 1);
        const { mondayOf } = await import('./utils/weeklyPlanParser');
        const m = mondayOf(target);
        const weekKey = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-${String(m.getDate()).padStart(2, '0')}`;
        if (localStorage.getItem('ttime_gdrive_last_sync_week') === weekKey) return;
        const { syncWeekFromDrive } = await import('./utils/weeklyPlanLoader');
        const r = await syncWeekFromDrive(folderId, target);
        if (cancelled) return;
        if (r.ok && r.schedule) {
          setSchedule(r.schedule);
          localStorage.setItem('ttime_gdrive_last_sync_week', weekKey);
          localStorage.setItem('ttime_weekly_plan_week', weekKey);
          const isNext = target.getTime() !== now.getTime();
          const msg = isNext ? '다음 주 시간표를 구글 드라이브에서 미리 가져왔어요! 🗓️' : '이번 주 시간표를 구글 드라이브에서 가져왔어요! 📚';
          window.dispatchEvent(new CustomEvent('ttime-lumi-trigger', { detail: { trigger: 'speech', message: msg } }));
          showToast(`🗓️ [${r.fileName}] ${msg}`);
        } else {
          console.warn('🟡 [주간 자동 시간표]', r.message);
        }
      } catch (e) {
        console.warn('🟡 [주간 자동 시간표] 실패', e);
      }
    };
    const first = window.setTimeout(run, 4000);
    const every = window.setInterval(run, 6 * 60 * 60 * 1000);
    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(every);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 환경 설정 헬퍼 (부분 업데이트 및 로컬스토리지 자동 영속화)
  const updateConfig = (updates: Partial<ClassConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem('class_dashboard_config', JSON.stringify(next));
        if (updates.theme) {
          localStorage.setItem('class_dashboard_theme', updates.theme);
        }
      } catch { }
      return next;
    });
  };

  // 환경 설정 모달 전용 전체 설정 일괄 영구 저장 핸들러
  const handleUpdateFullConfig = (newConfig: ClassConfig) => {
    setConfig(newConfig);
    try {
      localStorage.setItem('class_dashboard_config', JSON.stringify(newConfig));
      if (newConfig.theme) {
        localStorage.setItem('class_dashboard_theme', newConfig.theme);
      }
      if (newConfig.focusWidgetIds) {
        localStorage.setItem('focusWidgetIds', JSON.stringify(newConfig.focusWidgetIds));
      }
      console.log('🟢 [Config] 환경설정 모달 변경사항 영구 저장 완료 -> 테마:', newConfig.theme, '모드:', newConfig.themeMode);
    } catch (e) {
      console.error('🔴 [Config] 저장 실패:', e);
    }
  };

  // 위젯 이동/배치 시 효과음 및 내부 기능 사운드 활성화 여부 (사용자 요구사항 3)
  const [isWidgetMoveSoundEnabled, setIsWidgetMoveSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_widget_move_sound');
      if (saved !== null) {
        const enabled = saved === 'true';
        setGlobalSoundEnabled(enabled);
        return enabled;
      }
    } catch { }
    return isGlobalSoundEnabled();
  });

  const handleToggleWidgetMoveSound = () => {
    setIsWidgetMoveSoundEnabled((prev) => {
      const next = !prev;
      setGlobalSoundEnabled(next);
      try {
        localStorage.setItem('class_dashboard_widget_move_sound', String(next));
      } catch { }
      showToast(
        next
          ? '🔊 전체 효과음(위젯 이동 & 내부 기능 사운드)이 켜졌습니다.'
          : '🔇 전체 효과음(위젯 이동 & 내부 기능 사운드)이 음소거되었습니다.'
      );
      return next;
    });
  };

  // 🔊 위젯 이동/착지 효과음 모드 (기본 효과음 -> 🔔 차임벨 -> 🫧 버블 팝 -> 🔇 음소거 순환)
  const [widgetSfxMode, setLocalWidgetSfxMode] = useState<WidgetSfxMode>(() => getWidgetSfxMode());

  const handleCycleWidgetSfxMode = () => {
    const modes: WidgetSfxMode[] = ['default', 'chime', 'bubble', 'mute'];
    const nextIdx = (modes.indexOf(widgetSfxMode) + 1) % modes.length;
    const nextMode = modes[nextIdx];
    setLocalWidgetSfxMode(nextMode);
    setWidgetSfxMode(nextMode);

    if (nextMode === 'mute') {
      showToast('🔇 [효과음] 음소거 모드로 전환되었습니다.');
    } else {
      playWidgetSnapSound(nextMode);
      const labels: Record<WidgetSfxMode, string> = {
        default: '🎵 기본 효과음 (Default)',
        chime: '🔔 차임벨 (Chime Bell)',
        bubble: '🫧 버블 팝 (Bubble Pop)',
        mute: '🔇 효과음 끄기',
      };
      showToast(`🔊 [효과음] ${labels[nextMode]}으로 변경되었습니다.`);
    }
  };

  // 🎨 인스타 모던 대시보드 3종 시그니처 컬러 테마 모드 (라벤더 포그 ➔ 엠버 선셋 ➔ 사이버 글로시)
  const [uiTheme, setUiTheme] = useState<'clean-white' | 'lavender-fog' | 'ember-sunset' | 'cyber-glossy' | 'botanical-sage'>(() => {
    try {
      const saved = localStorage.getItem('ttime_ui_theme');
      if (saved && ['clean-white', 'lavender-fog', 'ember-sunset', 'cyber-glossy', 'botanical-sage'].includes(saved)) {
        return saved as any;
      }
      return 'clean-white';
    } catch {
      return 'clean-white';
    }
  });

  useEffect(() => {
    if (uiTheme) {
      // 🌿 보태니컬 세이지: 구조는 클린 화이트 규칙을 쓰고, 색만 세이지로 덧입혀요
      const structural = uiTheme === 'botanical-sage' ? 'clean-white' : uiTheme;
      document.documentElement.setAttribute('data-ui-theme', structural);
      document.documentElement.setAttribute('data-ui-skin', uiTheme);
      document.documentElement.setAttribute('data-theme', structural);
      // 사이버 글로시 테마 시 다크 모드 클래스 자동 부여, 그 외에는 테마 속성 동기화
      if (uiTheme === 'cyber-glossy') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    try {
      localStorage.setItem('ttime_ui_theme', uiTheme);
      localStorage.setItem('class_dashboard_theme', uiTheme);
    } catch {}
  }, [uiTheme]);

  // 🔄 설정 모달이나 AI 비서에서 테마 변경 시 App.tsx 즉각 동기화
  useEffect(() => {
    const handleSync = (e?: Event) => {
      try {
        const detail = (e as CustomEvent)?.detail;
        if (detail && ['clean-white', 'lavender-fog', 'ember-sunset', 'cyber-glossy', 'botanical-sage'].includes(detail)) {
          setUiTheme(detail as any);
          return;
        }
        const saved = localStorage.getItem('ttime_ui_theme');
        if (saved && ['clean-white', 'lavender-fog', 'ember-sunset', 'cyber-glossy', 'botanical-sage'].includes(saved)) {
          setUiTheme(saved as any);
        }
      } catch {}
    };
    window.addEventListener('ttime-theme-changed', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('ttime-theme-changed', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const handleCycleUITheme = () => {
    // 🪻 라벤더 포그 ➔ 🍊 엠버 선셋 ➔ 💎 사이버 글로시 순환 ('기본 테마' 완전 삭제)
    const themes: Array<'clean-white' | 'lavender-fog' | 'ember-sunset' | 'cyber-glossy' | 'botanical-sage'> = [
      'clean-white',
      'lavender-fog',
      'ember-sunset',
      'botanical-sage',
      'cyber-glossy',
    ];
    const nextIdx = (themes.indexOf(uiTheme) + 1) % themes.length;
    const nextTheme = themes[nextIdx];
    setUiTheme(nextTheme);

    // 🔔 청량한 맑은 멜로딕 차임 알림음 즉시 재생
    playWidgetSnapSound();

    // ⚙️ config 동시 동기화 (헤더 및 모든 위젯 테마 일체화)
    updateConfig({
      theme: nextTheme as any,
      themeMode: nextTheme === 'cyber-glossy' ? 'dark' : 'light',
    });

    const names = {
      'clean-white': '🤍 클린 화이트 (기본)',
      'lavender-fog': '🪻 라벤더 포그 (Modern Lavender & Matte Black Dock)',
      'ember-sunset': '🍊 엠버 선셋 (Warm Cream & Terracotta Orange)',
      'cyber-glossy': '💎 사이버 글로시 (Deep Dark Glassmorphism)',
    };
    showToast(`✨ 대시보드 테마가 [${names[nextTheme]}]로 전환되었습니다.`);
  };

  // 1인 1역할 & 퀴즈 state
  const [roles, setRoles] = useState<ClassRole[]>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_roles');
      if (saved) return JSON.parse(saved);
    } catch {}
    return initialRoles;
  });

  // 1인 1역할 상태 로컬스토리지 자동 보존
  useEffect(() => {
    try {
      localStorage.setItem('class_dashboard_roles', JSON.stringify(roles));
    } catch {}
  }, [roles]);

  // 📡 [보조 모니터 1인 1역 실천 체크 / 학생 좌석 / 모둠 실시간 동기화 리스너]
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('class_display_sync_channel');
        channel.onmessage = (event) => {
          if (event.data && event.data.type === 'UPDATE_ROLES_DATA' && Array.isArray(event.data.roles)) {
            console.log('🟢 [App] BroadcastChannel 역할 실천 데이터 수신:', event.data.roles);
            setRoles(event.data.roles);
          }
          if (event.data && event.data.type === 'UPDATE_STUDENT_ATTENDANCE') {
            console.log('🟢 [App] BroadcastChannel 등교 터치 출결 데이터 수신:', event.data);
            if (Array.isArray(event.data.students)) {
              setStudents(event.data.students);
            } else if (typeof event.data.studentId === 'number' && event.data.status) {
              handleUpdateStudentAttendance(event.data.studentId, event.data.status);
            }
          }
          if (event.data && event.data.type === 'UPDATE_STUDENTS' && Array.isArray(event.data.students)) {
            console.log('🟢 [App] BroadcastChannel 학생 좌석 배치 데이터 수신:', event.data.students);
            setStudents(event.data.students);
          }
          if (event.data && event.data.type === 'UPDATE_TEAMS' && Array.isArray(event.data.teams)) {
            console.log('🟢 [App] BroadcastChannel 모둠 데이터 수신:', event.data.teams);
            setTeams(event.data.teams);
          }
        };
      }
    } catch {}

    const handleWindowMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'UPDATE_STUDENTS' && Array.isArray(event.data.students)) {
        console.log('🟢 [App] window postMessage 학생 좌석 배치 데이터 수신:', event.data.students);
        setStudents(event.data.students);
      }
      if (event.data && event.data.type === 'UPDATE_TEAMS' && Array.isArray(event.data.teams)) {
        console.log('🟢 [App] window postMessage 모둠 데이터 수신:', event.data.teams);
        setTeams(event.data.teams);
      }
      if (event.data && event.data.type === 'UPDATE_ROLES_DATA' && Array.isArray(event.data.roles)) {
        console.log('🟢 [App] window postMessage 역할 실천 데이터 수신:', event.data.roles);
        setRoles(event.data.roles);
      }
    };
    window.addEventListener('message', handleWindowMessage);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'class_dashboard_roles' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setRoles(parsed);
          }
        } catch {}
      }
      if (e.key === 'class_dashboard_students' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            console.log('🟢 [App] localStorage 학생 출결/좌석 데이터 변경 감지 및 동기화');
            setStudents(parsed);
          }
        } catch {}
      }
      if (e.key === 'class_dashboard_teams' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            console.log('🟢 [App] localStorage 모둠 데이터 변경 감지 및 동기화');
            setTeams(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (channel) {
        try {
          channel.close();
        } catch {}
      }
      window.removeEventListener('message', handleWindowMessage);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const [quizzes, setQuizzes] = useState<QuizQuestion[]>(initialQuizzes);
  const [periodInfo, setPeriodInfo] = useState<RolePeriodInfo>(initialPeriodInfo);

  // 학생 관찰기록장 (요구사항 10)
  const [observations, setObservations] = useState<ObservationRecord[]>(sampleObservationRecords);
  const [isObservationOpen, setIsObservationOpen] = useState(false);

  // 신규 위젯: 관찰·상담 일지 상태 (요구사항 9, 12)
  const [observationWidgetRecords, setObservationWidgetRecords] = useState<ObservationWidgetRecord[]>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_observation_records');
      if (saved) return JSON.parse(saved);
    } catch { }
    return initialObservationWidgetRecords;
  });

  // 개인 칭찬 히스토리 로그 상태 (요구사항 10)
  const [praiseHistoryLogs, setPraiseHistoryLogs] = useState<PraiseHistoryLog[]>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_praise_logs');
      if (saved) return JSON.parse(saved);
    } catch { }
    return [
      { id: 'log_1', studentId: 1, studentName: '강민준', date: '2026-09-01', time: '09:30', itemLabel: '발표 참여', points: 1 },
      { id: 'log_2', studentId: 2, studentName: '김서연', date: '2026-09-02', time: '10:15', itemLabel: '친구 배려', points: 2 },
      { id: 'log_3', studentId: 3, studentName: '김도윤', date: '2026-09-03', time: '11:40', itemLabel: '정리정돈', points: 1 },
      { id: 'log_4', studentId: 4, studentName: '박지우', date: '2026-09-04', time: '13:10', itemLabel: '급식 모범', points: 1 },
    ];
  });

  // 🔒 화면 자동 잠금 상태 (로컬 스토리지 연동: 브라우저 새로고침 시에도 잠금 유지)
  const [isScreenLocked, setIsScreenLocked] = useState<boolean>(() => {
    try {
      const savedLocked = localStorage.getItem('ttime_is_locked') || localStorage.getItem('class_dashboard_is_screen_locked');
      return savedLocked === 'true';
    } catch {
      return false;
    }
  });
  const lastActivityTimeRef = useRef<number>(Date.now());
  // 🖐️ 전자칠판 모드 표시 (터치 보정 반경 확대에 사용)
  useEffect(() => {
    document.documentElement.dataset.board = config.boardType === 'smart' ? 'smart' : 'general';
  }, [config.boardType]);

  // 🔋 장시간 구동 절전: 90초 무조작 시 장식용 무한 애니메이션 일시정지, 창이 숨겨지면 전체 정지
  useEffect(() => installMotionManager(true), []);

  // 🖐️ 빗나간 터치 보정: 빈 곳을 눌렀을 때만 반경 내 가장 가까운 버튼을 대신 눌러 줌
  useEffect(() => {
    return installTouchAssist(() => (document.documentElement.dataset.board === 'smart' ? 22 : 14));
  }, []);

  const isScreenLockedRef = useRef(isScreenLocked);
  isScreenLockedRef.current = isScreenLocked;

  // 🔒 화면 잠금 상태 로컬 스토리지 실시간 동기화
  useEffect(() => {
    try {
      if (isScreenLocked) {
        localStorage.setItem('ttime_is_locked', 'true');
        localStorage.setItem('class_dashboard_is_screen_locked', 'true');
      } else {
        localStorage.removeItem('ttime_is_locked');
        localStorage.removeItem('class_dashboard_is_screen_locked');
      }
    } catch (err) {
      console.warn('🔴 [Security] 화면 잠금 상태 로컬 스토리지 저장 실패:', err);
    }
  }, [isScreenLocked]);

  // 🖥️ 전체화면 상태 및 토글 핸들러 (하단 플로팅 독 일원화 연동)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => !!document.fullscreenElement);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  }, []);

  // 화면 테마 모드 (라이트/다크/시스템 연동 및 테마 고유 특성 연동)
  const isDarkMode = useMemo(() => {
    // 💎 사이버 글로시는 항상 어두운 화면 (예전엔 다른 설정이 다크를 꺼서 흰 카드에 흰 글씨가 됐어요)
    if (uiTheme === 'cyber-glossy') return true;
    return resolveIsDarkMode(config.themeMode || 'system', config.theme);
  }, [config.themeMode, config.theme, uiTheme]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode, config.theme]);

  // 마우스/키보드 미조작 시 화면 자동 잠금 타이머 (요구사항 8)
  useEffect(() => {
    const autoLockMinutes = config.securityConfig?.autoLockMinutes ?? 0;
    if (autoLockMinutes <= 0) return;

    const handleUserActivity = () => {
      lastActivityTimeRef.current = Date.now();
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));

    const intervalId = setInterval(() => {
      if (isScreenLocked) return;
      const elapsedMs = Date.now() - lastActivityTimeRef.current;
      const limitMs = autoLockMinutes * 60 * 1000;
      if (elapsedMs >= limitMs) {
        setIsScreenLocked(true);
        try {
          localStorage.setItem('class_dashboard_is_screen_locked', 'true');
        } catch { }
        console.log('🔒 [Security] 일정 시간 미조작으로 화면이 자동으로 잠겼습니다.');
      }
    }, 5000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
      clearInterval(intervalId);
    };
  }, [config.securityConfig?.autoLockMinutes, isScreenLocked]);

  // Modals & Popups
  const [isRankingOpen, setIsRankingOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isRolesModalOpen, setIsRolesModalOpen] = useState(false);
  const [rolesModalInitialTab, setRolesModalInitialTab] = useState<'roles' | 'assign' | 'eval' | 'daily' | 'print' | 'settings'>('assign');
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);

  // 보조 모니터 팝업 (요구사항 4)
  const [isDualMonitorOpen, setIsDualMonitorOpen] = useState(false);
  const [dualMonitorTab, setDualMonitorTab] = useState<'timer' | 'noise' | 'quiz' | 'roles' | 'break' | 'clean' | 'seating' | 'attendance' | 'morning' | 'homework' | 'qr'>('timer');

  // Noise decibel for passing to student display
  const [currentDecibel, setCurrentDecibel] = useState<number>(42);

  // 💡 스마트 아이디어 노트(Idea Note) 상태 관리
  const [ideaNotes, setIdeaNotes] = useState<IdeaItem[]>(() => {
    try {
      const saved = largeGet('ttime_idea_notes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return DEFAULT_MOCK_IDEAS;
    } catch {
      return DEFAULT_MOCK_IDEAS;
    }
  });

  const [ideaSettings, setIdeaSettings] = useState<IdeaSettings>(() => {
    try {
      const saved = localStorage.getItem('ttime_idea_settings');
      return saved ? JSON.parse(saved) : DEFAULT_IDEA_SETTINGS;
    } catch {
      return DEFAULT_IDEA_SETTINGS;
    }
  });

  const [isIdeaRecordModalOpen, setIsIdeaRecordModalOpen] = useState(false);
  const [editingIdeaItem, setEditingIdeaItem] = useState<IdeaItem | null>(null);
  const [isIdeaSettingsModalOpen, setIsIdeaSettingsModalOpen] = useState(false);

  const handleUpdateIdeaNotes = (updated: IdeaItem[]) => {
    setIdeaNotes(updated);
    try {
      largeSet('ttime_idea_notes', JSON.stringify(updated));
    } catch {}
  };

  const handleSaveIdea = (item: IdeaItem) => {
    setIdeaNotes((prev) => {
      const exists = prev.some((i) => i.idea_id === item.idea_id);
      const updated = exists
        ? prev.map((i) => (i.idea_id === item.idea_id ? item : i))
        : [item, ...prev];
      try {
        largeSet('ttime_idea_notes', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleSaveIdeaSettings = (newSettings: IdeaSettings) => {
    setIdeaSettings(newSettings);
    try {
      localStorage.setItem('ttime_idea_settings', JSON.stringify(newSettings));
    } catch {}
  };

  // 🧲 위젯 간격 자석 모드 (자석 버튼 클릭 시 더 좁은 간격 유지: 8~10px 밀착)
  const [isTightGap, setIsTightGap] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_tight_gap');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // 12분할 그리드 위젯 레이아웃 (1/3 너비 황금비율 span: 4 표준화)
  const defaultWidgetOrder = [
    'youtube',
    'noise',
    'picker',
    'clock',
    'seating',
    'attendance',
    'roles',
    'timetable',
    'agenda',
    'calendar',
    'meal',
    'dday',
    'observation',
    'schoolInfo',
    'quote',
    'ideanote',
    'seqtimer',
    'homework',
    'subject-timetable',
    'subject-roster',
    'subject-journal',
  ];

  const defaultWidgetSpans: Record<string, WidgetSpan> = {
    timer: 4,      // 12분할 4칸 (1/3 너비 표준화)
    noise: 4,      // 12분할 4칸
    picker: 4,     // 12분할 4칸
    clock: 4,      // 12분할 4칸
    attendance: 4, // 12분할 4칸
    roles: 4,      // 12분할 4칸
    timetable: 4,  // 12분할 4칸
    seating: 6,    // 12분할 6칸 (1/2 너비)
    youtube: 6,    // 12분할 6칸 (16:9 최적 비율)
    agenda: 4,     // 12분할 4칸
    calendar: 4,   // 12분할 4칸
    meal: 4,       // 12분할 4칸
    dday: 4,       // 12분할 4칸
    observation: 4,// 12분할 4칸
    schoolInfo: 4, // 12분할 4칸
    quote: 4,      // 12분할 4칸
    ideanote: 4,   // 12분할 4칸
    seqtimer: 4,
    homework: 4,
    'subject-timetable': 8, // 전담 다중 시간표 (12분할 8칸 시원한 와이드)
    'subject-roster': 6,    // 반별 명렬표 및 모둠 (12분할 6칸)
    'subject-journal': 6,   // 수업 태도 및 형성평가 기록장 (12분할 6칸)
  };

  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [dragOverWidgetId, setDragOverWidgetId] = useState<string | null>(null);
  const [dockOverTargetId, setDockOverTargetId] = useState<string | null>(null);

  // =========================================================================
  // [포스트잇 위젯 다중 생성 및 데이터 상태 관리]
  // =========================================================================
  const [postItWidgets, setPostItWidgets] = useState<PostItWidgetData[]>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_postits');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((item: PostItWidgetData) => ({
            ...item,
            title: item.title.replace(/우리\s*[0-9]+학년\s*[0-9]+반\s*/g, '').replace(/[0-9]+학년\s*[0-9]+반\s*/g, '').trim(),
          }));
        }
      }
    } catch { }
    // 초등학생 학급에 어울리는 친근한 한글 더미 데이터 (규칙 11)
    return [
      {
        id: 'postit-init-1',
        title: '🌟 오늘의 다짐',
        content: '서로 양보하고 고운 말 쓰기!\n오늘 4교시 체육 수업 후 시원한 물 마시기 잊지 말기 💧',
        color: 'yellow',
        fontSize: 'md',
        createdAt: '2026-09-20',
      },
    ];
  });

  // 🔖 바로가기 위젯 1행 축소 모드 상태 (PDF 1페이지 수정사항 1 반영)
  const [isBookmarksCompact, setIsBookmarksCompact] = useState<boolean>(() => {
    try {
      return localStorage.getItem('class_dashboard_bookmarks_compact') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleBookmarksCompact = () => {
    setIsBookmarksCompact((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('class_dashboard_bookmarks_compact', String(next));
      } catch {}

      // 💡 [요구사항 1]: 바로가기 1행 축소 모드 활성화 시 무조건 화면 최상단(index 0)으로 즉시 이동
      if (next) {
        setWidgetOrder((order) => {
          const filtered = order.filter((id) => id !== 'bookmarks');
          const updated = ['bookmarks', ...filtered];
          try {
            localStorage.setItem('class_dashboard_widget_order', JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }

      showToast(next ? '📏 바로가기 위젯이 1행 모드로 화면 최상단에 고정되었습니다.' : '📐 바로가기 위젯이 기본 크기로 복원되었습니다.');
      return next;
    });
  };

  // 메신저 쪽지 모달 및 데이터 상태 (BYOK 연동)
  const [isMessengerModalOpen, setIsMessengerModalOpen] = useState(false);
  const [messengerNotes, setMessengerNotes] = useState<
    Array<{ id: string; sender: string; content: string; deadline?: string; useDeadline: boolean; createdAt: string }>
  >(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_messenger_notes');
      if (saved) return JSON.parse(saved);
    } catch { }
    return [
      {
        id: 'note-1',
        sender: '교무부장',
        content: '3학년 학생 기초학력 진단검사 결과 나이스(NEIS) 입력 마감 안내 (금요일 16시까지)',
        deadline: '2026-09-25T16:00',
        useDeadline: true,
        createdAt: '2026-09-21',
      },
      {
        id: 'note-2',
        sender: '연구부',
        content: '동료장학 수업공개 지도안 제출 양식 확인 요망 (연구실 비치)',
        deadline: '2026-09-24T17:00',
        useDeadline: true,
        createdAt: '2026-09-21',
      },
    ];
  });

  // 📝 리치 텍스트 고기능 종합 메모 모달 상태 (작업 2)
  const [editingMemo, setEditingMemo] = useState<MemoItem | null>(null);
  const [isMemoEditModalOpen, setIsMemoEditModalOpen] = useState(false);

  // =========================================================================
  // [위젯 고정(Pin) 상태 관리 및 색상 매핑]
  // =========================================================================
  const [pinnedWidgetIds, setPinnedWidgetIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_pinned_widgets');
      if (saved) return JSON.parse(saved);
    } catch { }
    return [];
  });

  // 위젯별 알록달록 고유 핀 색상 매핑
  const getWidgetPinColor = (id: string): string => {
    if (id.startsWith('postit-')) {
      const p = postItWidgets.find((item) => item.id === id);
      if (p?.color === 'yellow') return 'amber';
      if (p?.color === 'green') return 'emerald';
      if (p?.color === 'sky') return 'sky';
      if (p?.color === 'pink') return 'rose';
      if (p?.color === 'purple') return 'purple';
      if (p?.color === 'orange') return 'orange';
      return 'amber';
    }
    switch (id) {
      case 'timer': return 'emerald';
      case 'seqtimer': return 'emerald';
      case 'homework': return 'purple';
      case 'noise': return 'amber';
      case 'picker': return 'purple';
      case 'clock': return 'sky';
      case 'seating': return 'blue';
      case 'attendance': return 'teal';
      case 'roles': return 'pink';
      case 'timetable': return 'indigo';
      case 'agenda': return 'rose';
      case 'calendar': return 'orange';
      case 'meal': return 'cyan';
      case 'dday': return 'red';
      case 'observation': return 'violet';
      case 'schoolInfo': return 'indigo';
      case 'quote': return 'amber';
      case 'ideanote': return 'amber';
      case 'youtube': return 'red';
      case 'bookmarks': return 'cyan';
      default: return 'rose';
    }
  };

  const getWidgetTitle = (id: string): string => {
    const matchedPostIt = postItWidgets.find((p) => p.id === id);
    if (matchedPostIt || id.startsWith('postit-') || id.startsWith('memo-')) {
      const postIt = matchedPostIt || postItWidgets.find((p) => p.id === id);
      return postIt?.title ? `📝 ${postIt.title}` : '📝 포스트잇 메모';
    }
    // 📛 위젯 이름은 constants/widgetRegistry.ts 한 곳에서만 정의합니다.
    return getWidgetName(id);
  };

  // 🏫 [표준 안전장치] 첫 방문, 계정 변경, 오염된 상태 시 표준 레이아웃 자동 복원 및 Hydration
  const [initialDashboardState] = useState(() => getHydratedDashboardState());

  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_widget_order');
      if (saved) {
        let parsed: string[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 3) {
          // 💡 [사용자 요구사항]: 위젯 영역의 바로가기(bookmarks) 및 타이머(timer) 위젯 삭제 (보조화면 및 헤더 바로가기 바로 통합)
          parsed = parsed.filter((id) => id !== 'bookmarks' && id !== 'timer');
          // 기본 포스트잇이 order에 없으면 맨 앞에 추가
          if (!parsed.some((id) => id.startsWith('postit-'))) {
            parsed = ['postit-init-1', ...parsed];
          }
          // 🎲 [발표자 추천]: 기존 로컬스토리지에 누락되어 있으면 noise 다음 또는 끝에 복원
          if (!parsed.includes('picker')) {
            const noiseIdx = parsed.indexOf('noise');
            if (noiseIdx !== -1) {
              parsed.splice(noiseIdx + 1, 0, 'picker');
            } else {
              parsed.push('picker');
            }
          }
          // 💡 [아이디어 노트]: 기존 로컬스토리지에 누락되어 있으면 quote 다음 또는 끝에 복원
          if (!parsed.includes('ideanote')) {
            const quoteIdx = parsed.indexOf('quote');
            if (quoteIdx !== -1) {
              parsed.splice(quoteIdx + 1, 0, 'ideanote');
            } else {
              parsed.push('ideanote');
            }
          }
          // 신규 추가된 기본 위젯이 누락되어 있으면 보충
          DEFAULT_DASHBOARD_STATE.widgetOrder.forEach((id) => {
            if (!parsed.includes(id) && id !== 'bookmarks' && id !== 'timer') {
              parsed.push(id);
            }
          });
          localStorage.setItem('class_dashboard_widget_order', JSON.stringify(parsed));
          return parsed;
        }
      }
    } catch { }
    return ['postit-init-1', ...DEFAULT_DASHBOARD_STATE.widgetOrder.filter(id => id !== 'bookmarks' && id !== 'timer')];
  });

  const [widgetSpans, setWidgetSpans] = useState<Record<string, WidgetSpan>>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_widget_spans');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.ideanote) {
          parsed.ideanote = 4;
        }
        return { ...DEFAULT_DASHBOARD_STATE.widgetSpans, ...parsed };
      }
    } catch { }
    return DEFAULT_DASHBOARD_STATE.widgetSpans;
  });

  // Widget Dynamic Island & Placement Mode
  const [hiddenWidgetIds, setHiddenWidgetIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_hidden_widgets');
      if (saved) return JSON.parse(saved);
    } catch { }
    return initialDashboardState.hiddenWidgetIds;
  });

  // 📐 위젯 모드 단일 통일: 항상 캔버스 자유 이동 및 배치 모드
  const [placementMode, setPlacementMode] = useState<WidgetPlacementMode>('freeform');

  // 💡 좌/우 사이드 스택 패널 4가지 동적 배치 모드 ('BOTH': 기본 / 'LEFT_ONLY': 우측 몰기 / 'RIGHT_ONLY': 좌측 몰기 / 'NONE': 전체화면 숨김)
  const [sidebarLayoutMode, setSidebarLayoutMode] = useState<SidebarLayoutMode>(() => {
    return initialDashboardState.sidebarLayoutMode || 'BOTH';
  });

  // 스택 배치 모드 변경 시 LocalStorage에 영속화
  useEffect(() => {
    try {
      localStorage.setItem('class_dashboard_sidebar_layout_mode', sidebarLayoutMode);
    } catch { }
  }, [sidebarLayoutMode]);

  // 💡 사이드바 레이아웃 모드 또는 보드타입 변경 시 실제 캔버스 가용폭 및 열 수 즉각 재계산
  useEffect(() => {
    setScreenInfo(
      calculateScreenInfo(
        window.innerWidth,
        window.innerHeight,
        config.boardType === 'smart',
        sidebarLayoutMode
      )
    );
  }, [sidebarLayoutMode, config.boardType]);

  // 🔍 중앙 위젯 배치 메인 캔버스 전용 독립 배율(Zoom: 0.6 ~ 1.5, 기본 1.0 안전 보정)
  const mainContainerRef = useRef<HTMLElement | null>(null);
  const [canvasZoom, setCanvasZoom] = useState<number>(() => {
    return initialDashboardState.canvasZoom || 1.0;
  });

  const canvasZoomRef = useRef(canvasZoom);
  canvasZoomRef.current = canvasZoom;
  // 줌 배율 변경 시 LocalStorage에 안전하게 영속화
  useEffect(() => {
    try {
      localStorage.setItem('class_dashboard_canvas_zoom', String(canvasZoom));
    } catch { }
  }, [canvasZoom]);

  // 📺 초등 교실 추천 배경음악 표준 플레이리스트 (기본값: 깔끔하게 비움)
  const DEFAULT_CLASS_BGM_PLAYLIST: { id: string; title: string }[] = [];

  // 📺 유튜브 활성 비디오 및 접기 동작(Fold Behavior) 옵션 (옵션 A: 'stack' vs 옵션 B: 'mini')
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(() => {
    try {
      // 🎯 [사용자 요구사항]: 재생목록의 가장 최상단(첫 번째) 영상이 항상 우선 재생
      const playlistSaved = localStorage.getItem('class_dashboard_youtube_playlist');
      if (playlistSaved) {
        const parsed = JSON.parse(playlistSaved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.id) {
          return parsed[0].id;
        }
      }
      const saved = localStorage.getItem('class_dashboard_youtube_last_played');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed?.videoId || null;
      }
    } catch { }
    return null;
  });

  // 유튜브 영상 제목 상태
  const [youtubeVideoTitle, setYoutubeVideoTitle] = useState<string>(() => {
    try {
      // 🎯 재생목록의 가장 최상단(첫 번째) 영상 제목 우선 로드
      const playlistSaved = localStorage.getItem('class_dashboard_youtube_playlist');
      if (playlistSaved) {
        const parsed = JSON.parse(playlistSaved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.title) {
          return parsed[0].title;
        }
      }
      const saved = localStorage.getItem('class_dashboard_youtube_last_played');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.title) return parsed.title;
      }
    } catch { }
    return '유튜브 배경음악 플레이어';
  });

  // 유튜브 재생/일시정지 상태 관리
  const [isYoutubePlaying, setIsYoutubePlaying] = useState<boolean>(true);

  // 🔇 전역 유튜브 음소거 상태 관리 (기본값: false, 즉 소리 켬)
  const [isYoutubeMuted, setIsYoutubeMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('class_dashboard_youtube_muted') === 'true';
    } catch {
      return false;
    }
  });

  // 📺 최상위 영속 YouTube iframe 참조
  const globalYoutubeIframeRef = useRef<HTMLIFrameElement | null>(null);

  /**
   * 📡 전역 싱글톤 YouTube Iframe 및 메인 캔버스 직접 임베드 Iframe에 postMessage 명령 전송
   */
  const sendGlobalYoutubeCommand = useCallback((func: string, args: any[] = []) => {
    // 1) 전역 백그라운드 싱글톤 Iframe 제어
    if (globalYoutubeIframeRef.current && globalYoutubeIframeRef.current.contentWindow) {
      try {
        globalYoutubeIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      } catch (err) {}
    }

    // 2) 스택 상단 미니 플레이어 Iframe 제어 (하단 재생/일시정지/탐색 동기화 보장)
    try {
      const miniIframe = document.getElementById('youtube-mini-player-iframe') as HTMLIFrameElement | null;
      if (miniIframe && miniIframe.contentWindow) {
        miniIframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      }
    } catch (err) {}

    // 3) 메인 캔버스 및 싱글톤 Iframe 제어 (동시 동기화 보장)
    try {
      const singletonIframe = document.getElementById('youtube-singleton-iframe') as HTMLIFrameElement | null;
      if (singletonIframe && singletonIframe.contentWindow) {
        singletonIframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      }
    } catch (err) {}

    try {
      const directIframe = document.getElementById('youtube-widget-direct-iframe') as HTMLIFrameElement | null;
      if (directIframe && directIframe.contentWindow) {
        directIframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      }
    } catch (err) {}

    // 4) iframe 직접 전송 완료 (전역 재발송 무한 루프 방지를 위해 window.postMessage 생략)
    console.log(`🔵 [GlobalYouTube] 명령 전송 완료: ${func}`, args);
  }, []);

  // 🎵 재생 중에는 앱이 잠들지 않게 (맥 App Nap 등으로 음악이 끊기는 것 방지)
  useEffect(() => {
    const on = !!youtubeVideoId && isYoutubePlaying && !isScreenLocked;
    try { (window as any).electronAPI?.setMediaPlaying?.(on); } catch { /* 무시 */ }
  }, [youtubeVideoId, isYoutubePlaying, isScreenLocked]);

  // 🔒 화면 잠금(isScreenLocked) 활성화 시 유튜브 영상 즉각 일시정지 및 차단
  useEffect(() => {
    if (isScreenLocked) {
      console.log('🔒 [Security] 화면 잠금 활성화됨 -> 유튜브 영상 즉시 일시정지 및 음소거 적용');
      setIsYoutubePlaying(false);
      sendGlobalYoutubeCommand('pauseVideo');
      sendGlobalYoutubeCommand('mute');

      // 전역 DOM 상의 모든 YouTube iframe에 pauseVideo 명령 전송
      try {
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach((frame) => {
          frame.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
            '*'
          );
        });
      } catch {}
    }
  }, [isScreenLocked, sendGlobalYoutubeCommand]);

  // 🖥️ 개별 보조창이 열려 있으면 하단 위젯바에 네온 반짝임
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('mode') === 'display') return;
    const check = () => {
      let alive = false;
      try {
        const ts = Number(localStorage.getItem('classin_display_alive') || 0);
        alive = Date.now() - ts < 4500;
      } catch { /* 무시 */ }
      document.documentElement.classList.toggle('ci-display-live', alive);
    };
    check();
    const id = window.setInterval(check, 1500);
    const onStorage = (e: StorageEvent) => e.key === 'classin_display_alive' && check();
    window.addEventListener('storage', onStorage);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('storage', onStorage);
      document.documentElement.classList.remove('ci-display-live');
    };
  }, []);

  // 🔒 잠금화면 동안 소리 완전 차단: 데스크톱 앱의 미니 플레이어(webview)는 postMessage 가 닿지 않아
  //    잠금 중 자동 재생 소리가 새던 문제 → 잠금 동안 0.4초마다 모든 webview · iframe 을 음소거 + 일시정지
  useEffect(() => {
    const PAUSE_JS = "(function(){document.querySelectorAll('video,audio').forEach(function(v){try{v.muted=true;v.pause();}catch(e){}});})()";
    const enforce = () => {
      document.querySelectorAll('webview').forEach((wv: any) => {
        try { wv.setAudioMuted?.(true); } catch { /* 준비 전 */ }
        try { wv.executeJavaScript?.(PAUSE_JS).catch?.(() => {}); } catch { /* 준비 전 */ }
      });
      document.querySelectorAll('iframe').forEach((f) => {
        if (!/youtube/.test(f.getAttribute('src') || '')) return;
        try {
          f.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
          f.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'mute', args: [] }), '*');
        } catch { /* 무시 */ }
      });
    };
    if (isScreenLocked) {
      enforce();
      const id = window.setInterval(enforce, 400);
      return () => window.clearInterval(id);
    }
    // 잠금 해제: 소리 막아 둔 것만 풀어요 (재생은 선생님이 직접 ▶)
    document.querySelectorAll('webview').forEach((wv: any) => {
      try { wv.setAudioMuted?.(false); } catch { /* 무시 */ }
      try { wv.executeJavaScript?.("(function(){document.querySelectorAll('video,audio').forEach(function(v){v.muted=false;});})()").catch?.(() => {}); } catch { /* 무시 */ }
    });
    if (!isYoutubeMuted) sendGlobalYoutubeCommand('unMute');
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScreenLocked]);

  /**
   * 🔊 [오디오 무음 버그 완벽 해결] Iframe 로드 완료 시 자동 언뮤트 및 볼륨 100% 보장
   * (단, 잠금화면 상태인 경우 일시정지 및 음소거 유지)
   */
  const handleGlobalIframeReady = () => {
    if (isScreenLocked) {
      sendGlobalYoutubeCommand('pauseVideo');
      sendGlobalYoutubeCommand('mute');
      return;
    }
    console.log('🟢 [GlobalYouTube] Iframe 로드 완료 -> 자동 언뮤트 및 볼륨 100 설정');
    setTimeout(() => {
      if (isScreenLocked) {
        sendGlobalYoutubeCommand('pauseVideo');
        sendGlobalYoutubeCommand('mute');
        return;
      }
      sendGlobalYoutubeCommand('unMute');
      sendGlobalYoutubeCommand('setVolume', [100]);
      if (isYoutubeMuted) {
        sendGlobalYoutubeCommand('mute');
      }
      sendGlobalYoutubeCommand('playVideo');
    }, 400);
  };

  // 🔇 음소거 토글 핸들러
  const handleToggleYoutubeMute = () => {
    setIsYoutubeMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('class_dashboard_youtube_muted', String(next));
      } catch { }
      sendGlobalYoutubeCommand(next ? 'mute' : 'unMute');
      if (!next) {
        sendGlobalYoutubeCommand('setVolume', [100]);
      }
      console.log(next ? '🔴 [GlobalYouTube] 음소거 (mute)' : '🟢 [GlobalYouTube] 소리 켬 (unMute, volume: 100)');
      showToast(next ? '🔇 유튜브 영상이 음소거되었습니다.' : '🔊 유튜브 소리가 켜졌습니다.');
      return next;
    });
  };

  // ⏯️ 전역 유튜브 싱글톤 플레이어 재생/일시정지 토글
  const handleToggleYoutubePlay = () => {
    if (isScreenLocked) {
      showToast('🔒 화면 잠금 상태에서는 유튜브 영상을 재생할 수 없습니다.');
      return;
    }
    setIsYoutubePlaying((prev) => {
      const next = !prev;
      sendGlobalYoutubeCommand(next ? 'playVideo' : 'pauseVideo');
      if (next && !isYoutubeMuted) {
        sendGlobalYoutubeCommand('unMute');
        sendGlobalYoutubeCommand('setVolume', [100]);
      }
      showToast(next ? '▶️ 유튜브 영상이 재생됩니다.' : '⏸️ 유튜브 영상이 일시 정지되었습니다.');
      return next;
    });
  };

  // ⏭️ 다음 목록 재생 핸들러: 사용자 맞춤 재생 목록 및 초등 교실 BGM 프리셋 순환
  const handlePlayNextVideo = () => {
    if (isScreenLocked) {
      showToast('🔒 화면 잠금 상태에서는 유튜브 영상을 재생할 수 없습니다.');
      return;
    }
    let currentPlaylist = [...DEFAULT_CLASS_BGM_PLAYLIST];
    try {
      const playlistSaved = localStorage.getItem('class_dashboard_youtube_playlist');
      if (playlistSaved) {
        const parsedPlaylist = JSON.parse(playlistSaved);
        if (Array.isArray(parsedPlaylist) && parsedPlaylist.length > 0) {
          currentPlaylist = parsedPlaylist;
        }
      } else {
        const recentSaved = localStorage.getItem('class_dashboard_youtube_recent');
        if (recentSaved) {
          const parsedRecent: { videoId: string; title: string }[] = JSON.parse(recentSaved);
          if (Array.isArray(parsedRecent) && parsedRecent.length > 0) {
            const recentMapped = parsedRecent.map((r) => ({ id: r.videoId, title: r.title }));
            const ids = new Set(recentMapped.map((r) => r.id));
            const rest = DEFAULT_CLASS_BGM_PLAYLIST.filter((p) => !ids.has(p.id));
            currentPlaylist = [...recentMapped, ...rest];
          }
        }
      }
    } catch { }

    // 재생목록이 비어있다면 초등 교실 기본 BGM 목록 사용
    if (currentPlaylist.length === 0) {
      currentPlaylist = [...DEFAULT_CLASS_BGM_PLAYLIST];
    }

    if (currentPlaylist.length === 0) {
      showToast('ℹ️ 등록된 재생목록이 없습니다. 플레이어에서 [+ 추가] 버튼으로 영상을 등록해 주세요.');
      return;
    }

    const currentIndex = currentPlaylist.findIndex((item) => item.id === youtubeVideoId);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % currentPlaylist.length;
    const nextItem = currentPlaylist[nextIndex];

    console.log(`🟢 [App] 다음 비디오 재생: index ${nextIndex}/${currentPlaylist.length}, ID: ${nextItem.id}`);
    setYoutubeVideoId(nextItem.id);
    setYoutubeVideoTitle(nextItem.title);
    setIsYoutubePlaying(true);

    try {
      localStorage.setItem(
        'class_dashboard_youtube_last_played',
        JSON.stringify({ videoId: nextItem.id, title: nextItem.title, playedAt: Date.now() })
      );
    } catch { }

    // 다음 곡 전환 시 즉시 재생 명령 전송
    setTimeout(() => {
      if (isScreenLocked) {
        sendGlobalYoutubeCommand('pauseVideo');
        sendGlobalYoutubeCommand('mute');
        return;
      }
      sendGlobalYoutubeCommand('unMute');
      sendGlobalYoutubeCommand('setVolume', [100]);
      sendGlobalYoutubeCommand('playVideo');
    }, 300);

    showToast(`⏭️ 다음 곡 재생: ${nextItem.title}`);
  };

  // 전역 메시지 리스너 (외부/미니 플레이어의 명령 수신)
  useEffect(() => {
    const handleGlobalMessage = (e: MessageEvent) => {
      try {
        if (typeof e.data === 'string') {
          const parsed = JSON.parse(e.data);
          if (parsed?.type === 'CLASS_DASHBOARD_YOUTUBE_CMD') {
            if (parsed.command === 'mute') setIsYoutubeMuted(true);
            if (parsed.command === 'unMute') {
              if (isScreenLocked) return;
              setIsYoutubeMuted(false);
            }
            if (parsed.command === 'playVideo') {
              if (isScreenLocked) {
                sendGlobalYoutubeCommand('pauseVideo');
                return;
              }
              setIsYoutubePlaying(true);
            }
            if (parsed.command === 'pauseVideo') setIsYoutubePlaying(false);
            if (parsed.command === 'seekTo') {
              if (isScreenLocked) return;
              const sec = parsed.seconds ?? (parsed.args ? parsed.args[0] : 0);
              sendGlobalYoutubeCommand('seekTo', [sec, true]);
            } else {
              if (isScreenLocked && (parsed.command === 'playVideo' || parsed.command === 'unMute')) return;
              sendGlobalYoutubeCommand(parsed.command, parsed.args || []);
            }
          }
        }
      } catch { }
    };

    window.addEventListener('message', handleGlobalMessage);
    return () => window.removeEventListener('message', handleGlobalMessage);
  }, [sendGlobalYoutubeCommand]);



  const [youtubeFoldBehavior, setYoutubeFoldBehavior] = useState<YouTubeFoldBehavior>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_youtube_fold_behavior');
      if (saved === 'stack' || saved === 'mini') return saved;
    } catch { }
    return 'mini'; // 기본값: 옵션 B (스택 상단 미니 플레이어로 연속 재생)
  });

  useEffect(() => {
    try {
      localStorage.setItem('class_dashboard_youtube_fold_behavior', youtubeFoldBehavior);
    } catch { }
  }, [youtubeFoldBehavior]);

  const handleZoomIn = () => {
    setCanvasZoom((prev) => Math.min(1.5, Math.round((prev + 0.05) * 100) / 100));
  };

  const handleZoomOut = () => {
    setCanvasZoom((prev) => Math.max(0.6, Math.round((prev - 0.05) * 100) / 100));
  };

  const handleZoomReset = () => {
    setCanvasZoom(1.0);
  };

  // Ctrl(또는 Cmd) + 마우스 휠로 확대/축소 시 브라우저 기본 줌 방지 및 캔버스 독립 줌 동작 (passive: false)
  useEffect(() => {
    const handleWheelZoom = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      // 마우스 커서가 메인 캔버스 내부나 그 자식 위젯들에 위치해 있는지 판별
      const isInsideCanvas =
        Boolean(target?.closest('#main-canvas-container')) ||
        Boolean(mainContainerRef.current && mainContainerRef.current.contains(target as Node));

      if (isInsideCanvas && (e.ctrlKey || e.metaKey)) {
        // 브라우저 전체 화면 줌 이벤트 완벽 방지
        e.preventDefault();
        e.stopPropagation();

        if (e.deltaY < 0) {
          // 휠 위로 스크롤: 캔버스 확대 (+0.05 단위)
          setCanvasZoom((prev) => Math.min(1.5, Math.round((prev + 0.05) * 100) / 100));
        } else if (e.deltaY > 0) {
          // 휠 아래로 스크롤: 캔버스 축소 (-0.05 단위)
          setCanvasZoom((prev) => Math.max(0.6, Math.round((prev - 0.05) * 100) / 100));
        }
      }
    };

    window.addEventListener('wheel', handleWheelZoom, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleWheelZoom);
    };
  }, []);

  // 🌊 위젯 영역 마우스 휠 스크롤: OS 네이티브 고속 스크롤 엔진 기본 적용 (지연 요소 완전 제거)

  // 🍞 Toast 알림 상태 및 핸들러 (최상단 호이스팅: 모든 하위 핸들러에서 안전하게 참조)
  const [toast, setToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    // 🏝️ [알림 역할 나누기] 시스템 알림(타이머 종료·모드 전환·잠금·저장/백업·오류)은 다이내믹 아일랜드로,
    //    가벼운 안내·대화는 기존처럼 루미 말풍선으로 보냅니다. (유튜브 알림은 플레이어 위 기존 위치 유지)
    const isYoutubeNotice = /유튜브 (영상이|소리가|미니|플레이어)|다음 곡 재생:/.test(msg);
    // 🖼️ 스티커 모드에서는 뮤직 플레이어 조작 알림을 띄우지 않아요 (화면을 깔끔하게)
    if (document.documentElement.classList.contains('stickers-editing') && (isYoutubeNotice || /^▶️ \[.*\] 영상을 재생/.test(msg))) return;
    const system = !isYoutubeNotice ? classifySystemNotice(msg) : null;
    if (system) {
      showIsland({ message: msg, tone: system.tone });
      return;
    }
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast(msg);
    // 📢 AI 캐릭터 반응형 말풍선 알림 이벤트 버스 트리거
    try {
      window.dispatchEvent(new CustomEvent('ttime-character-notice', { detail: { message: msg } }));
    } catch {}
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
    }, 3800);
  }, []);
  showToastRef.current = showToast;

  // 🍞 유튜브 관련 알림 여부 판별 (유튜브 재생/멈춤 알림은 우측 상단이 아닌 유튜브 플레이어 바로 위쪽에 표시)
  const isYoutubeToast = Boolean(
    toast &&
      (toast.includes('유튜브 영상이') ||
        toast.includes('유튜브 소리가') ||
        toast.includes('다음 곡 재생:') ||
        toast.includes('유튜브 미니') ||
        toast.includes('유튜브 플레이어'))
  );

  // 자유 이동(Free-move) 캔버스 위치 상태 및 컨테이너 Ref
  const freeCanvasRef = useRef<HTMLDivElement | null>(null);
  // 🔁 끌어 놓기 '자리 바꾸기' 도우미: 커서 아래 다른 위젯 찾기 + 표시
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const pinnedIdsRef = useRef<string[]>([]);
  pinnedIdsRef.current = pinnedWidgetIds;
  const findSwapTarget = (cx: number, cy: number, selfId: string): string | null => {
    try {
      const els = document.elementsFromPoint(cx, cy) as HTMLElement[];
      for (const el of els) {
        const card = el.closest('[data-widget-card-id]') as HTMLElement | null;
        const id = card?.dataset.widgetCardId;
        if (id && id !== selfId && !pinnedIdsRef.current.includes(id)) return id;
      }
    } catch { }
    return null;
  };
  const markSwapTarget = (id: string | null) => {
    document.querySelectorAll('[data-widget-card-id].is-swap-target').forEach((el) => {
      if ((el as HTMLElement).dataset.widgetCardId !== id) el.classList.remove('is-swap-target');
    });
    if (id) document.querySelector(`[data-widget-card-id="${CSS.escape(id)}"]`)?.classList.add('is-swap-target');
  };
  const [freeWidgetPositions, setFreeWidgetPositions] = useState<Record<string, { x: number; y: number; width?: number; height?: number }>>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_free_positions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed['youtube']) {
          parsed['youtube'] = {
            x: 20,
            y: 380,
            width: 760,
            height: 460,
          };
          localStorage.setItem('class_dashboard_free_positions', JSON.stringify(parsed));
        }
        return parsed;
      }
    } catch { }
    const initialPos: Record<string, { x: number; y: number; width?: number; height?: number }> = {};
    defaultWidgetOrder.forEach((id, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      initialPos[id] = {
        x: 20 + col * 395,
        y: 20 + row * 365,
        width: id === 'youtube' ? 760 : 380,
        height: id === 'youtube' ? 460 : undefined,
      };
    });
    return initialPos;
  });
  const [activeZIndexMap, setActiveZIndexMap] = useState<Record<string, number>>({});

  // 스마트 레이아웃 자동 최적화 토글 (사용자가 위젯 이동 후 빈 공간 자동 계산 및 정렬 여부)
  const [autoSmartOptimize, setAutoSmartOptimize] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_auto_optimize');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // 12분할 그리드 실시간 빈 공간(Gap) 분석
  const gridAnalysis = useMemo(() => {
    return analyzeGridGaps(widgetOrder, widgetSpans, hiddenWidgetIds, 12);
  }, [widgetOrder, widgetSpans, hiddenWidgetIds]);

  // =========================================================================
  // [위젯 고정(Pin) 토글 핸들러 (이동 방지 및 화면 완성 고정)]
  // =========================================================================
  const handleTogglePinWidget = (widgetId: string) => {
    setPinnedWidgetIds((prev) => {
      const isPinned = prev.includes(widgetId);
      const next = isPinned ? prev.filter((id) => id !== widgetId) : [...prev, widgetId];
      try {
        localStorage.setItem('class_dashboard_pinned_widgets', JSON.stringify(next));
      } catch { }
      const title = getWidgetTitle(widgetId);
      if (!isPinned) {
        showToast(`📌 [${title}] 위젯이 화면에 고정되었습니다. (드래그 이동 방지)`);
      } else {
        showToast(`🔓 [${title}] 위젯 고정이 해제되었습니다.`);
      }
      return next;
    });
  };

  // =========================================================================
  // [포스트잇 위젯 추가, 내용/색상 변경, 삭제 핸들러]
  // =========================================================================
  const handleAddPostIt = (color: PostItColor = 'yellow') => {
    const newId = `postit-${Date.now()}`;
    const newPostIt: PostItWidgetData = {
      id: newId,
      title: `메모 ${postItWidgets.length + 1}`,
      content: '새로운 학급 메모 내용을 작성해보세요...',
      color,
      fontSize: 'md',
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setPostItWidgets((prev) => {
      const updated = [newPostIt, ...prev];
      try {
        localStorage.setItem('class_dashboard_postits', JSON.stringify(updated));
      } catch { }
      return updated;
    });

    // 💡 [요구사항 2]: 고정된 위젯이 있다면 고정 위젯 주변(바로 뒤)으로, 없다면 상단에 메모 순서 등록
    setWidgetOrder((prev) => {
      const filtered = prev.filter((id) => id !== newId);
      const visiblePinnedIds = pinnedWidgetIds.filter(
        (pid) => !hiddenWidgetIds.includes(pid) && !collapsedWidgetIds.includes(pid)
      );

      let insertIdx = 0;
      if (visiblePinnedIds.length > 0) {
        const targetPinnedId = visiblePinnedIds[0];
        const pinnedIdx = filtered.indexOf(targetPinnedId);
        insertIdx = pinnedIdx >= 0 ? pinnedIdx + 1 : 0;
      } else if (isBookmarksCompact && filtered.includes('bookmarks')) {
        const bIdx = filtered.indexOf('bookmarks');
        insertIdx = bIdx >= 0 ? bIdx + 1 : 0;
      }

      const updated = [
        ...filtered.slice(0, insertIdx),
        newId,
        ...filtered.slice(insertIdx),
      ];
      try {
        localStorage.setItem('class_dashboard_widget_order', JSON.stringify(updated));
      } catch { }
      return updated;
    });

    // 기본 그리드 span(2칸) 할당
    setWidgetSpans((prev) => {
      const updated = { ...prev, [newId]: 2 as WidgetSpan };
      try {
        localStorage.setItem('class_dashboard_widget_spans', JSON.stringify(updated));
      } catch { }
      return updated;
    });

    // 자유 이동 캔버스 위치 할당
    setFreeWidgetPositions((prev) => {
      const offset = (postItWidgets.length % 6) * 35;
      const updated = {
        ...prev,
        [newId]: { x: 30 + offset, y: 30 + offset, width: 360, height: 300 },
      };
      try {
        localStorage.setItem('class_dashboard_free_positions', JSON.stringify(updated));
      } catch { }
      return updated;
    });

    playCelebrateSound();
    showToast(`📝 새 포스트잇 위젯이 추가되었습니다! 색상을 변경하거나 메모를 작성해보세요.`);
  };

  const handleUpdatePostIt = (id: string, updates: Partial<PostItWidgetData>) => {
    setPostItWidgets((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, ...updates } : item));
      try {
        localStorage.setItem('class_dashboard_postits', JSON.stringify(updated));
      } catch { }
      return updated;
    });
  };

  const handleDeletePostIt = (id: string) => {
    setPostItWidgets((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem('class_dashboard_postits', JSON.stringify(updated));
      } catch { }
      return updated;
    });
    setWidgetOrder((prev) => {
      const updated = prev.filter((item) => item !== id);
      try {
        localStorage.setItem('class_dashboard_widget_order', JSON.stringify(updated));
      } catch { }
      return updated;
    });
    setPinnedWidgetIds((prev) => prev.filter((item) => item !== id));
    setCollapsedWidgetIds((prev) => prev.filter((item) => item !== id));
    showToast(`🗑️ 포스트잇이 안전하게 삭제되었습니다.`);
  };

  const handleToggleAutoSmartOptimize = () => {
    setAutoSmartOptimize((prev) => {
      const next = !prev;
      localStorage.setItem('class_dashboard_auto_optimize', String(next));
      showToast(
        next
          ? '🤖 [위젯 이동 시 스마트 자동 최적화]가 켜졌습니다. 위젯 이동 즉시 빈 공간을 정밀 계산하여 자동 정렬합니다.'
          : '✋ [위젯 이동 시 스마트 자동 최적화]가 꺼졌습니다. 수동으로 최적화 버튼을 눌러 정렬할 수 있습니다.'
      );
      return next;
    });
  };

  const handleCloseWidget = (widgetId: string) => {
    const isMemo = widgetId.startsWith('postit-') || widgetId.startsWith('memo-') || postItWidgets.some((p) => p.id === widgetId);
    if (isMemo) {
      setPostItWidgets((prev) => {
        const next = prev.map((p) => (p.id === widgetId ? ({ ...p, isStacked: true, hidden: true } as any) : p));
        try {
          localStorage.setItem('class_dashboard_postits', JSON.stringify(next));
        } catch { }
        return next;
      });
      setHiddenWidgetIds((prev) => {
        if (prev.includes(widgetId)) return prev;
        const next = [...prev, widgetId];
        localStorage.setItem('class_dashboard_hidden_widgets', JSON.stringify(next));
        return next;
      });
      const targetMemo = postItWidgets.find((p) => p.id === widgetId);
      showToast(`📌 [${targetMemo?.title || '메모'}] 메모 스택에 보관되었습니다.`);
      return;
    }
    setHiddenWidgetIds((prev) => {
      if (prev.includes(widgetId)) return prev;
      const next = [...prev, widgetId];
      localStorage.setItem('class_dashboard_hidden_widgets', JSON.stringify(next));
      return next;
    });
    showToast(`📦 위젯이 보관함으로 이동되었습니다. 하단 [다이나믹 아일랜드]에서 언제든 다시 꺼낼 수 있습니다.`);
  };

  const handleRestoreWidget = (widgetId: string) => {
    setHiddenWidgetIds((prev) => {
      const next = prev.filter((id) => id !== widgetId);
      localStorage.setItem('class_dashboard_hidden_widgets', JSON.stringify(next));
      return next;
    });
    setWidgetOrder((prev) => {
      const filtered = prev.filter((id) => id !== widgetId);
      // 💡 [요구사항 2]: 스택(보관함)에서 복원된 위젯은 항상 맨 마지막에 배치
      const next = [...filtered, widgetId];
      localStorage.setItem('class_dashboard_widget_order', JSON.stringify(next));
      return next;
    });

    // [3번째 이미지 표준 규격으로 일괄 크기 통일]: 12분할 중 4칸(1/3 너비 황금비율), 자유모드 380px x 520px
    setWidgetSpans((prev) => {
      const next = { ...prev, [widgetId]: 4 as WidgetSpan };
      try {
        localStorage.setItem('class_dashboard_widget_spans', JSON.stringify(next));
      } catch { }
      return next;
    });

    const restoreSlot = computeEndSlot([widgetId], 380);
    setFreeWidgetPositions((prev) => {
      const current = prev[widgetId] || { x: 20, y: 20 };
      const next = {
        ...prev,
        [widgetId]: {
          ...current,
          x: restoreSlot.x, // 📍 맨 끝 빈자리로
          y: restoreSlot.y,
          width: 380,
          height: 520,
        },
      };
      try {
        localStorage.setItem('class_dashboard_free_positions', JSON.stringify(next));
      } catch { }
      return next;
    });

    // 커스텀 높이 및 접힘 상태 리셋 -> 3번째 이미지처럼 기본 520px 높이로 펼쳐진 상태로 복원
    try {
      localStorage.removeItem(`widget_height_${widgetId}`);
      localStorage.removeItem(`widget_collapsed_${widgetId}`);
    } catch { }
    setCollapsedWidgetIds((prev) => prev.filter((id) => id !== widgetId));

    showToast(`✨ [${getWidgetTitle(widgetId)}] 위젯이 표준 크기로 시원하게 복원되었습니다.`);
  };

  const handleToggleWidget = (widgetId: string) => {
    if (hiddenWidgetIds.includes(widgetId)) {
      handleRestoreWidget(widgetId);
    } else {
      handleCloseWidget(widgetId);
    }
  };

  // =========================================================================
  // [iOS Stage Manager 연동 접힌 위젯 상태 및 액션 핸들러]
  // =========================================================================
  const [collapsedWidgetIds, setCollapsedWidgetIds] = useState<string[]>(() => {
    try {
      // 🍅 [사용자 요구사항]: 프로그램을 처음 실행하거나 초기화 시 항상 뽀모도로가 스택 영역에 상주하도록 보장
      const migrationKey = 'class_dashboard_pomodoro_stack_v2';
      const hasMigrated = localStorage.getItem(migrationKey);
      const saved = localStorage.getItem('class_dashboard_collapsed_widgets');

      if (!hasMigrated) {
        localStorage.setItem(migrationKey, 'true');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const updated = parsed.includes('clock') ? parsed : [...parsed, 'clock'];
            localStorage.setItem('class_dashboard_collapsed_widgets', JSON.stringify(updated));
            return updated;
          }
        }
        const initial = ['clock'];
        localStorage.setItem('class_dashboard_collapsed_widgets', JSON.stringify(initial));
        return initial;
      }

      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { }
    return ['clock'];
  });

  // 🎛️ [유튜브 상단 7단 스택 슬롯 활성 탭: 'calendar' ➔ 'timetable' ➔ 'dday' ➔ 'clock' ➔ 'quote' ➔ 'schoolInfo' ➔ 'attendance']
  const [activeStackTab, setActiveStackTab] = useState<'calendar' | 'meal' | 'timetable' | 'dday' | 'clock' | 'quote' | 'schoolInfo' | 'attendance'>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_active_stack_tab');
      if (
        saved === 'calendar' ||
        saved === 'meal' ||
        saved === 'timetable' ||
        saved === 'dday' ||
        saved === 'clock' ||
        saved === 'quote' ||
        saved === 'schoolInfo' ||
        saved === 'attendance'
      ) return saved as any;
    } catch {}
    return 'calendar';
  });

  // 🎯 [커스텀 포커스 모드 (Focus Mode)]: 선택된 포커스 위젯만 화면에 띄우는 집중 업무 모드
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);

  const handleToggleFocusMode = useCallback(() => {
    setIsFocusMode((prev) => {
      const next = !prev;
      showToast(
        next
          ? '🎯 포커스 모드: ON (개인 업무 집중 모드 활성화 - 선택된 위젯만 표시)'
          : '🎯 포커스 모드: OFF (전체 대시보드 화면 복귀)'
      );
      return next;
    });
  }, [showToast]);

  // ✨ [5단계] 위젯 자리 이동 애니메이션 (FLIP): 순서 변경·숨김·꺼내기로 위치가 바뀐 카드가 부드럽게 미끄러짐
  const flipPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const flipZoomRef = useRef(canvasZoom);
  useLayoutEffect(() => {
    const container = mainContainerRef.current;
    if (!container) return;
    const zoomChanged = flipZoomRef.current !== canvasZoom;
    flipZoomRef.current = canvasZoom;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const cRect = container.getBoundingClientRect();
    const scrollTop = container.scrollTop;
    const next = new Map<string, { x: number; y: number }>();
    container.querySelectorAll<HTMLElement>('[data-widget-card-id]').forEach((el) => {
      const id = el.dataset.widgetCardId!;
      const r = el.getBoundingClientRect();
      const pos = { x: r.left - cRect.left, y: r.top - cRect.top + scrollTop };
      const prev = flipPositionsRef.current.get(id);
      if (prev && !zoomChanged && !reduceMotion && typeof el.animate === 'function') {
        const dx = prev.x - pos.x;
        const dy = prev.y - pos.y;
        if ((Math.abs(dx) > 2 || Math.abs(dy) > 2) && Math.abs(dx) + Math.abs(dy) < 3000) {
          el.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0px 0px' }], {
            duration: 480,
            easing: 'cubic-bezier(0.34, 1.35, 0.64, 1)',
            composite: 'add',
          });
        }
      }
      next.set(id, pos);
    });
    flipPositionsRef.current = next;
  }, [widgetOrder, widgetSpans, hiddenWidgetIds, collapsedWidgetIds, canvasZoom]);

  // 📍 [유튜브 플레이어 싱글톤 뷰포트 앵커 위치 추적]
  const [youtubeAnchorRect, setYoutubeAnchorRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const isYoutubeInMain = !collapsedWidgetIds.includes('youtube') && !hiddenWidgetIds.includes('youtube');

  useEffect(() => {
    if (!isYoutubeInMain) {
      setYoutubeAnchorRect(null);
      return;
    }

    // ⚡ [성능] 0.25초 폴링 → 실제 위치·크기가 바뀔 때만 갱신 (값이 같으면 setState 생략 → 앱 전체 리렌더 방지)
    let rafId = 0;
    const updateAnchor = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const el = document.getElementById('youtube-viewport-anchor');
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const next = {
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
        setYoutubeAnchorRect((prev) =>
          prev &&
          prev.top === next.top &&
          prev.left === next.left &&
          prev.width === next.width &&
          prev.height === next.height
            ? prev
            : next
        );
      });
    };

    updateAnchor();
    const anchorEl = document.getElementById('youtube-viewport-anchor');
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateAnchor) : null;
    if (anchorEl && resizeObserver) resizeObserver.observe(anchorEl);
    const mainEl = document.getElementById('main-canvas-container');
    if (mainEl && resizeObserver) resizeObserver.observe(mainEl);
    // 레이아웃 이동(위젯 재배치 등)을 놓치지 않도록 2초 간격 안전 확인 (값이 같으면 리렌더 없음)
    const safetyTimer = setInterval(updateAnchor, 2000);
    window.addEventListener('scroll', updateAnchor, true);
    window.addEventListener('resize', updateAnchor);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(safetyTimer);
      resizeObserver?.disconnect();
      window.removeEventListener('scroll', updateAnchor, true);
      window.removeEventListener('resize', updateAnchor);
    };
  }, [isYoutubeInMain, canvasZoom, sidebarLayoutMode, widgetOrder]);

  // 🔍 [메인 캔버스 활성 위젯 검증 단일 진실 공급원 (Single Source of Truth)]:
  // 투명 유령 위젯, 보관 스택(접힘) 위젯, 영구 제거 위젯, 미존재 포스트잇 등이
  // 메인 캔버스(자유 배치 & 그리드)에 껍데기(빈 div)로 남아 다른 위젯의 조작이나 이동/자석 정렬을 방해하는 것을 원천 차단
  const isWidgetActiveOnCanvas = useCallback(
    (widgetId: string): boolean => {
      if (!widgetId) return false;
      // 0. 🎯 포커스 모드(Focus Mode) 활성화 시: 지정된 포커스 위젯 목록에 없는 위젯 제외 (부드러운 언마운트)
      if (isFocusMode) {
        const allowedFocusIds = config.focusWidgetIds || (() => {
          try {
            const saved = localStorage.getItem('focusWidgetIds');
            if (saved) return JSON.parse(saved);
          } catch (e) {}
          return ['clock', 'agenda', 'timetable', 'quote', 'observation'];
        })();
        const isMatchFocus = (id: string, list: string[]): boolean => {
          if (list.includes(id)) return true;
          const aliasMap: Record<string, string[]> = {
            clock: ['clock', 'pomodoro', 'timer'],
            seqtimer: ['seqtimer'],
            homework: ['homework'],
            pomodoro: ['clock', 'pomodoro', 'timer'],
            agenda: ['agenda', 'todo'],
            todo: ['agenda', 'todo'],
            quote: ['quote', 'readingNote', 'reading'],
            readingNote: ['quote', 'readingNote', 'reading'],
            timetable: ['timetable'],
            observation: ['observation'],
            noise: ['noise'],
            meal: ['meal'],
            attendance: ['attendance'],
            roles: ['roles'],
            dday: ['dday'],
            calendar: ['calendar'],
            seating: ['seating'],
            picker: ['picker'],
            schoolInfo: ['schoolInfo'],
            postit: ['postit'],
          };
          if (id.startsWith('postit-') && list.includes('postit')) return true;
          const aliases = aliasMap[id];
          if (aliases && aliases.some((a) => list.includes(a))) return true;
          return false;
        };
        if (!isMatchFocus(widgetId, allowedFocusIds)) {
          return false;
        }
      }
      // 0-1. 🏫 [담임모드 / 전담모드 이원화 시스템 위젯 노출/숨김 규칙]
      if (config.teacherMode === 'subject') {
        // 전담모드 활성화 시 숨김 처리: 1. 수업시간표, 2. 1인 1역, 3. 출결 관리, 4. 소음측정
        if (['timetable', 'roles', 'attendance', 'noise'].includes(widgetId)) {
          return false;
        }
      } else {
        // 담임모드일 때: 전담 전용 위젯(통합 시간표, 명렬표/모둠, 형성평가 기록장) 숨김
        if (['subject-timetable', 'subject-roster', 'subject-journal'].includes(widgetId)) {
          return false;
        }
      }
      // 1. 숨김 위젯이거나 보관 스택(collapsed)에 들어간 위젯 제외
      if (hiddenWidgetIds.includes(widgetId) || collapsedWidgetIds.includes(widgetId)) {
        return false;
      }
      // 2. 위젯 영역에서 영구 제거된 위젯 (타이머, 바로가기 등)
      if (widgetId === 'timer' || widgetId === 'bookmarks') {
        return false;
      }
      // 3. 사이드바(스택) 모드 활성화 시 유튜브 플레이어 제외 (사이드바 상단 고정 플레이어로만 재생)
      if (widgetId === 'youtube' && sidebarLayoutMode !== 'NONE') {
        return false;
      }
      // 4. 동적 메모/포스트잇의 경우 실제로 존재하는지 및 스택/숨김 상태 검증 (삭제된 유령 박스 차단)
      const matchedMemo = postItWidgets.find((p) => p.id === widgetId);
      if (matchedMemo || widgetId.startsWith('postit-') || widgetId.startsWith('memo-')) {
        if (!matchedMemo) return false;
        if ((matchedMemo as any).isStacked === true || (matchedMemo as any).hidden === true) {
          return false;
        }
        return true;
      }
      return true;
    },
    [isFocusMode, config.focusWidgetIds, config.teacherMode, hiddenWidgetIds, collapsedWidgetIds, sidebarLayoutMode, postItWidgets]
  );

  // 📍 보관함에서 꺼낸 위젯은 '모든 위젯의 맨 끝'에: 마지막 줄 오른쪽 빈칸, 자리가 없으면 맨 아래 새 줄
  //    (다른 위젯은 한 칸도 움직이지 않아요)
  type SlotRect = { x: number; y: number; w: number; h: number };
  const computeEndSlot = (excludeIds: string[], w = 380, extra: SlotRect[] = []): { x: number; y: number } => {
    const canvasW = freeCanvasRef.current?.clientWidth || 1200;
    const rects: SlotRect[] = widgetOrder
      .filter((id) => !excludeIds.includes(id) && isWidgetActiveOnCanvas(id))
      .map((id) => {
        const p = freeWidgetPositions[id];
        if (!p) return null;
        let el: HTMLElement | null = null;
        try { el = document.querySelector(`[data-free-widget-id="${CSS.escape(id)}"]`) as HTMLElement | null; } catch { }
        return { x: p.x || 0, y: p.y || 0, w: p.width || 380, h: el ? el.offsetHeight : p.height || 380 };
      })
      .filter(Boolean) as SlotRect[];
    const all = [...rects, ...extra];
    if (all.length === 0) return { x: 20, y: 20 };
    const lastTop = Math.max(...all.map((r) => r.y));
    const row = all.filter((r) => r.y >= lastTop - 60);
    const rowRight = Math.max(...row.map((r) => r.x + r.w));
    if (rowRight + 12 + w <= canvasW - 10) return { x: Math.round(rowRight + 12), y: Math.round(Math.min(...row.map((r) => r.y))) };
    const bottom = Math.max(...all.map((r) => r.y + r.h));
    return { x: 20, y: Math.round(bottom + 12) };
  };

  // 🧹 정확히 같은 자리에 겹쳐 쌓인 위젯(처음 설치 · 예전 데이터)을 맨 끝 빈자리로 한 번 펼쳐 놓기
  const overlapFixDoneRef = useRef(false);
  useEffect(() => {
    if (overlapFixDoneRef.current || placementMode !== 'freeform') return;
    const t = window.setTimeout(() => {
      overlapFixDoneRef.current = true;
      const active = widgetOrder.filter((id) => isWidgetActiveOnCanvas(id));
      const seen = new Set<string>();
      const dupes: string[] = [];
      active.forEach((id) => {
        const p = freeWidgetPositions[id] || { x: 20, y: 20 }; // 위치가 없으면 화면에서도 (20,20)에 겹쳐 그려져요
        const key = `${Math.round(p.x)}:${Math.round(p.y)}`;
        if (seen.has(key)) dupes.push(id); else seen.add(key);
      });
      if (dupes.length === 0) return;
      const placed: SlotRect[] = [];
      const slots: Record<string, { x: number; y: number }> = {};
      dupes.forEach((id) => {
        const w = freeWidgetPositions[id]?.width || 380;
        const sl = computeEndSlot(dupes, w, placed);
        slots[id] = sl;
        let h = freeWidgetPositions[id]?.height || 380;
        try { const el = document.querySelector(`[data-free-widget-id="${CSS.escape(id)}"]`) as HTMLElement | null; if (el) h = el.offsetHeight; } catch { }
        placed.push({ x: sl.x, y: sl.y, w, h });
      });
      setFreeWidgetPositions((prev) => {
        const next = { ...prev };
        Object.entries(slots).forEach(([id, sl]) => { next[id] = { ...(prev[id] || { width: 380 }), x: sl.x, y: sl.y }; });
        try { localStorage.setItem('class_dashboard_free_positions', JSON.stringify(next)); } catch { }
        return next;
      });
    }, 900);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placementMode]);

  // 🎯 위젯 모드 ↔ 집중 모드: 배치를 따로 기억해요 (한쪽에서 옮겨도 다른 쪽은 그대로)
  const layoutModeRef = useRef<'normal' | 'focus'>('normal');
  const layoutInitRef = useRef(false);
  useEffect(() => {
    const readSnap = (mode: 'normal' | 'focus') => {
      try { return JSON.parse(localStorage.getItem(`class_dashboard_layout_${mode}`) || 'null'); } catch { return null; }
    };
    const applySnap = (snap: any) => {
      if (!snap) return;
      if (Array.isArray(snap.order)) {
        setWidgetOrder((cur) => {
          const next = [...snap.order.filter((id: string) => cur.includes(id)), ...cur.filter((id) => !snap.order.includes(id))];
          try { localStorage.setItem('class_dashboard_widget_order', JSON.stringify(next)); } catch { }
          return next;
        });
      }
      if (snap.pos && typeof snap.pos === 'object') {
        setFreeWidgetPositions((cur) => {
          const next = { ...cur, ...snap.pos };
          try { localStorage.setItem('class_dashboard_free_positions', JSON.stringify(next)); } catch { }
          return next;
        });
      }
      if (snap.spans && typeof snap.spans === 'object') {
        setWidgetSpans((cur) => {
          const next = { ...cur, ...snap.spans };
          try { localStorage.setItem('class_dashboard_widget_spans', JSON.stringify(next)); } catch { }
          return next;
        });
      }
    };
    const nextMode: 'normal' | 'focus' = isFocusMode ? 'focus' : 'normal';
    if (!layoutInitRef.current) {
      layoutInitRef.current = true;
      // 집중 모드로 끝냈던 경우: 위젯 모드 배치로 되돌려서 시작
      try {
        if (localStorage.getItem('class_dashboard_layout_active') === 'focus' && nextMode === 'normal') applySnap(readSnap('normal'));
        localStorage.setItem('class_dashboard_layout_active', nextMode);
      } catch { }
      layoutModeRef.current = nextMode;
      return;
    }
    const prevMode = layoutModeRef.current;
    if (prevMode === nextMode) return;
    try {
      localStorage.setItem(`class_dashboard_layout_${prevMode}`, JSON.stringify({ order: widgetOrder, pos: freeWidgetPositions, spans: widgetSpans }));
      localStorage.setItem('class_dashboard_layout_active', nextMode);
    } catch { }
    applySnap(readSnap(nextMode)); // 처음 집중 모드를 켤 때는 지금 배치에서 시작
    layoutModeRef.current = nextMode;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocusMode]);

  // =========================================================================
  // [✨ 새로 정렬 (스마트): 크기 · 고정 위젯은 그대로, 순서를 지키며 빈틈없이 — 먼저 미리보기]
  // =========================================================================
  const handleSmartLayoutOptimize = () => {
    const activeVisibleIds = widgetOrder.filter(isWidgetActiveOnCanvas);
    if (activeVisibleIds.length === 0) {
      showToast('⚠️ 화면에 정렬할 위젯이 없어요. (모두 보관함에 있거나 숨겨져 있어요)');
      return;
    }
    const pv = buildSmartPreview();
    if (!pv) return;
    if (pv.moved.length === 0) {
      showToast('✨ 이미 빈틈없이 정렬되어 있어요.');
      return;
    }
    setEditingGapId(null);
    setMagnetPreview(pv);
  };

  // 🧹 [유령 위젯 잔류 데이터 자동 정리]:
  // localStorage 및 상태에 남아있을 수 있는 제거된 위젯(timer, bookmarks, picker, 삭제된 postit 등) 정리
  useEffect(() => {
    let hasOrderChanged = false;
    let hasPosChanged = false;

    setWidgetOrder((prev) => {
      const cleaned = prev.filter(
        (id) => id !== 'timer' && id !== 'bookmarks' && (!id.startsWith('postit-') || postItWidgets.some((p) => p.id === id))
      );
      if (cleaned.length !== prev.length) {
        hasOrderChanged = true;
        try {
          localStorage.setItem('class_dashboard_widget_order', JSON.stringify(cleaned));
        } catch { }
        return cleaned;
      }
      return prev;
    });

    setFreeWidgetPositions((prev) => {
      const next = { ...prev };
      let changed = false;
      ['timer', 'bookmarks'].forEach((ghostId) => {
        if (ghostId in next) {
          delete next[ghostId];
          changed = true;
        }
      });
      Object.keys(next).forEach((k) => {
        if (k.startsWith('postit-') && !postItWidgets.some((p) => p.id === k)) {
          delete next[k];
          changed = true;
        }
      });
      if (changed) {
        hasPosChanged = true;
        try {
          localStorage.setItem('class_dashboard_free_positions', JSON.stringify(next));
        } catch { }
        return next;
      }
      return prev;
    });

    if (hasOrderChanged || hasPosChanged) {
      console.log('🟢 [대시보드] 유령 위젯 잔류 데이터 클린업 완료');
    }
  }, [postItWidgets]);

  const handleToggleWidgetCollapse = (widgetId: string) => {
    const isMemo = widgetId.startsWith('postit-') || widgetId.startsWith('memo-') || postItWidgets.some((p) => p.id === widgetId);
    setCollapsedWidgetIds((prev) => {
      const isCollapsed = prev.includes(widgetId);
      const next = isCollapsed
        ? prev.filter((id) => id !== widgetId)
        : [...prev, widgetId];
      try {
        localStorage.setItem('class_dashboard_collapsed_widgets', JSON.stringify(next));
        localStorage.setItem(`widget_collapsed_${widgetId}`, String(!isCollapsed));

        // 💡 [요구사항 2]: 스택에 있던 위젯이 화면으로 펼쳐지면 항상 맨 마지막에 배치
        if (isCollapsed) {
          setWidgetOrder((order) => {
            const filtered = order.filter((id) => id !== widgetId);
            const nextOrder = [...filtered, widgetId];
            try {
              localStorage.setItem('class_dashboard_widget_order', JSON.stringify(nextOrder));
            } catch {}
            return nextOrder;
          });
        }

        // 💡 [요구사항 2: Size Memory 저장] 스택에 접힐 때 직전 크기(span, height) 기록
        if (!isCollapsed) {
          const savedSizes = JSON.parse(localStorage.getItem('class_dashboard_prev_widget_sizes') || '{}');
          savedSizes[widgetId] = {
            span: widgetSpans[widgetId] || 4,
            height: parseInt(localStorage.getItem(`widget_height_${widgetId}`) || (isMemo ? '270' : '380'), 10),
          };
          localStorage.setItem('class_dashboard_prev_widget_sizes', JSON.stringify(savedSizes));
        }

        // 💡 메모 위젯인 경우 상태 동기화 및 전용 안내 문구 출력
        if (isMemo) {
          setPostItWidgets((pList) => {
            const updated = pList.map((p) =>
              p.id === widgetId
                ? ({
                    ...p,
                    isStacked: !isCollapsed,
                    isMinimized: !isCollapsed,
                    hidden: false,
                  } as any)
                : p
            );
            try {
              localStorage.setItem('class_dashboard_postits', JSON.stringify(updated));
            } catch {}
            return updated;
          });
          const targetMemo = postItWidgets.find((p) => p.id === widgetId);
          const memoTitle = targetMemo?.title || '메모';
          if (isCollapsed) {
            showToast(`📌 [${memoTitle}] 메인 그리드로 활성화 되었습니다.`);
          } else {
            showToast(`📌 [${memoTitle}] 메모 스택에 보관되었습니다.`);
          }
        }
      } catch { }
      return next;
    });
  };

  // [모든 위젯 일괄 접기 / 펼치기 핸들러 (사용자 요구사항 4)]
  const activeVisibleWidgetIds = widgetOrder.filter((id) => !hiddenWidgetIds.includes(id));
  const isAllWidgetsCollapsed =
    activeVisibleWidgetIds.length > 0 &&
    activeVisibleWidgetIds.every((id) => collapsedWidgetIds.includes(id));

  const handleToggleCollapseAllWidgets = () => {
    if (activeVisibleWidgetIds.length === 0) return;

    if (isAllWidgetsCollapsed) {
      // 모두 접혀 있으면 -> 전체 펼치기 (각 위젯의 이전 크기 Size Memory 복원)
      try {
        const savedSizes = JSON.parse(localStorage.getItem('class_dashboard_prev_widget_sizes') || '{}');
        const restoredSpans = { ...widgetSpans };
        activeVisibleWidgetIds.forEach((id) => {
          if (savedSizes[id]?.span) {
            restoredSpans[id] = savedSizes[id].span;
          }
          if (savedSizes[id]?.height) {
            localStorage.setItem(`widget_height_${id}`, String(savedSizes[id].height));
          }
        });
        setWidgetSpans(restoredSpans);
        localStorage.setItem('class_dashboard_widget_spans', JSON.stringify(restoredSpans));
      } catch { }

      setCollapsedWidgetIds((prev) => {
        const next = prev.filter((id) => !activeVisibleWidgetIds.includes(id));
        try {
          localStorage.setItem('class_dashboard_collapsed_widgets', JSON.stringify(next));
          activeVisibleWidgetIds.forEach((id) => {
            localStorage.setItem(`widget_collapsed_${id}`, 'false');
          });
        } catch { }
        return next;
      });
      if (isWidgetMoveSoundEnabled) {
        playCelebrateSound();
      }
      showToast('📂 모든 위젯이 시원하게 펼쳐졌습니다.');
    } else {
      // 하나라도 펼쳐져 있으면 -> 전체 슬림 접기 (접히기 전 현재 크기 일괄 기억)
      try {
        const savedSizes = JSON.parse(localStorage.getItem('class_dashboard_prev_widget_sizes') || '{}');
        activeVisibleWidgetIds.forEach((id) => {
          savedSizes[id] = {
            span: widgetSpans[id] || 4,
            height: parseInt(localStorage.getItem(`widget_height_${id}`) || (id.startsWith('postit-') ? '270' : '380'), 10),
          };
        });
        localStorage.setItem('class_dashboard_prev_widget_sizes', JSON.stringify(savedSizes));
      } catch { }

      setCollapsedWidgetIds((prev) => {
        const combined = new Set([...prev, ...activeVisibleWidgetIds]);
        const next = Array.from(combined);
        try {
          localStorage.setItem('class_dashboard_collapsed_widgets', JSON.stringify(next));
          activeVisibleWidgetIds.forEach((id) => {
            localStorage.setItem(`widget_collapsed_${id}`, 'true');
          });
        } catch { }
        return next;
      });
      if (isWidgetMoveSoundEnabled) {
        playSelectedChime('school_4tone');
      }
      showToast('📁 모든 위젯이 슬림하게 접혔습니다.');
    }
  };

  const handleExpandWidgetFromStage = (widgetId: string) => {
    // 💡 [요구사항 2: Size Memory 1:1 복원]: 스택 진입 직전에 기억해 둔 크기(span, height) 그대로 복원
    try {
      const savedSizes = JSON.parse(localStorage.getItem('class_dashboard_prev_widget_sizes') || '{}');
      const prevSize = savedSizes[widgetId];
      if (prevSize) {
        if (prevSize.span) {
          setWidgetSpans((prevSpans) => {
            const nextSpans = { ...prevSpans, [widgetId]: prevSize.span };
            try {
              localStorage.setItem('class_dashboard_widget_spans', JSON.stringify(nextSpans));
            } catch { }
            return nextSpans;
          });
        }
        if (prevSize.height) {
          localStorage.setItem(`widget_height_${widgetId}`, String(prevSize.height));
        }
      }
    } catch { }

    setCollapsedWidgetIds((prev) => {
      const next = prev.filter((id) => id !== widgetId);
      try {
        localStorage.setItem('class_dashboard_collapsed_widgets', JSON.stringify(next));
        localStorage.setItem(`widget_collapsed_${widgetId}`, 'false');
      } catch { }
      return next;
    });

    // 📌 보관함에서 꺼낸 위젯은 모든 위젯의 가장 마지막 자리로 (다른 위젯은 움직이지 않아요)
    setWidgetOrder((prev) => {
      const next = [...prev.filter((id) => id !== widgetId), widgetId];
      try {
        localStorage.setItem('class_dashboard_widget_order', JSON.stringify(next));
      } catch { }
      return next;
    });
    if (placementMode === 'freeform') {
      const w = freeWidgetPositions[widgetId]?.width || 380;
      const slot = computeEndSlot([widgetId], w);
      setFreeWidgetPositions((prev) => {
        const next = { ...prev, [widgetId]: { ...(prev[widgetId] || { width: 380 }), x: slot.x, y: slot.y } };
        try { localStorage.setItem('class_dashboard_free_positions', JSON.stringify(next)); } catch { }
        return next;
      });
      // 새로 놓인 자리로 화면을 살짝 스크롤
      window.setTimeout(() => {
        try { document.querySelector(`[data-free-widget-id="${CSS.escape(widgetId)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch { }
      }, 120);
    }

    if (isWidgetMoveSoundEnabled) {
      playCelebrateSound();
    }
    showToast(`📱 [${getWidgetTitle(widgetId)}] 위젯이 원래 크기 그대로 복원되어 펼쳐졌습니다.`);
  };

  // 📦 [요구사항 8]: 보관된 모든 위젯을 최하단(마지막 인덱스)에 순차 복귀시키는 전체 펼치기 핸들러
  const handleExpandAllCollapsedWidgets = () => {
    if (collapsedWidgetIds.length === 0) {
      showToast('📦 보관된 위젯이 없습니다.');
      return;
    }
    // 현재 캔버스에 표시 중인 위젯 목록
    const activeWidgets = widgetOrder.filter((id) => !collapsedWidgetIds.includes(id));
    // 보관되어 있던 위젯들을 위젯 영역의 가장 아랫부분(마지막 인덱스)에 순차 추가
    const newOrder = [...activeWidgets, ...collapsedWidgetIds];

    setWidgetOrder(newOrder);
    setCollapsedWidgetIds([]);
    if (placementMode === 'freeform') {
      const placed: SlotRect[] = [];
      const slots: Record<string, { x: number; y: number }> = {};
      collapsedWidgetIds.forEach((id) => {
        const w = freeWidgetPositions[id]?.width || 380;
        const slot = computeEndSlot(collapsedWidgetIds, w, placed);
        slots[id] = slot;
        placed.push({ x: slot.x, y: slot.y, w, h: freeWidgetPositions[id]?.height || 380 });
      });
      setFreeWidgetPositions((prev) => {
        const next = { ...prev };
        Object.entries(slots).forEach(([id, sl]) => { next[id] = { ...(prev[id] || { width: 380 }), x: sl.x, y: sl.y }; });
        try { localStorage.setItem('class_dashboard_free_positions', JSON.stringify(next)); } catch { }
        return next;
      });
    }

    try {
      localStorage.setItem('class_dashboard_widget_order', JSON.stringify(newOrder));
      localStorage.setItem('class_dashboard_collapsed_widgets', JSON.stringify([]));
      collapsedWidgetIds.forEach((id) => {
        localStorage.setItem(`widget_collapsed_${id}`, 'false');
      });
    } catch { }

    if (isWidgetMoveSoundEnabled) {
      playCelebrateSound();
    }
    showToast(`📦 보관된 위젯 ${collapsedWidgetIds.length}개가 화면 최하단으로 모두 복귀되었습니다.`);
  };

  // 🪟 [요구사항 13]: 사이드 스택 양쪽 분할 모드 드래그 리사이징 (Split Pane) 폭 상태
  const [leftSidebarWidth, setLeftSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_left_sidebar_width');
      return saved ? Math.max(260, Math.min(420, Number(saved))) : 280;
    } catch {
      return 280;
    }
  });

  const [rightSidebarWidth, setRightSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_right_sidebar_width');
      return saved ? Math.max(160, Math.min(420, Number(saved))) : 280;
    } catch {
      return 280;
    }
  });

  // 좌측 스택 리사이즈 핸들 드래그 (min 260px, max 420px, 중앙 최소 600px 유지)
  const handleStartResizeLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftSidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const targetWidth = Math.max(260, Math.min(420, Math.round(startWidth + delta)));
      const windowWidth = window.innerWidth;
      const currentRight = sidebarLayoutMode === 'BOTH' ? rightSidebarWidth : 0;
      if (windowWidth - targetWidth - currentRight >= 600) {
        setLeftSidebarWidth(targetWidth);
        try {
          localStorage.setItem('class_dashboard_left_sidebar_width', String(targetWidth));
        } catch { }
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // 우측 스택 리사이즈 핸들 드래그 (min 160px, max 420px, 중앙 최소 600px 유지)
  const handleStartResizeRight = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightSidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX; // 오른쪽에서 왼쪽으로 밀면 폭 증가
      const targetWidth = Math.max(160, Math.min(420, Math.round(startWidth + delta)));
      const windowWidth = window.innerWidth;
      const currentLeft = sidebarLayoutMode === 'BOTH' ? leftSidebarWidth : 0;
      if (windowWidth - currentLeft - targetWidth >= 600) {
        setRightSidebarWidth(targetWidth);
        try {
          localStorage.setItem('class_dashboard_right_sidebar_width', String(targetWidth));
        } catch { }
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // =========================================================================
  // [수업모드 ↔ 업무모드 위젯 설정 독립 분리 보존 로직 (사용자 요구사항 3)]
  // =========================================================================
  const prevModeRef = useRef<ClassroomMode>(mode);

  // 모드별 위젯 레이아웃 저장 헬퍼
  const saveModeLayout = useCallback((targetMode: ClassroomMode) => {
    if (targetMode !== 'lesson' && targetMode !== 'work') return;
    const layoutData = {
      order: widgetOrder,
      spans: widgetSpans,
      hidden: hiddenWidgetIds,
      collapsed: collapsedWidgetIds,
    };
    try {
      localStorage.setItem(`class_dashboard_widgets_${targetMode}`, JSON.stringify(layoutData));
    } catch { }
  }, [widgetOrder, widgetSpans, hiddenWidgetIds, collapsedWidgetIds]);

  // 모드별 위젯 레이아웃 로드 헬퍼
  const loadModeLayout = useCallback((targetMode: ClassroomMode) => {
    if (targetMode !== 'lesson' && targetMode !== 'work') return;
    try {
      const saved = localStorage.getItem(`class_dashboard_widgets_${targetMode}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.order && Array.isArray(parsed.order)) setWidgetOrder(parsed.order);
        if (parsed.spans) setWidgetSpans(parsed.spans);
        if (parsed.hidden && Array.isArray(parsed.hidden)) setHiddenWidgetIds(parsed.hidden);
        if (parsed.collapsed && Array.isArray(parsed.collapsed)) setCollapsedWidgetIds(parsed.collapsed);
        return;
      }
    } catch { }

    // 각 모드별 기본 프리셋
    if (targetMode === 'work') {
      const workOrder = [
        'schoolInfo',
        'quote',
        'calendar',
        'observation',
        'clock',
        'agenda',
        'timetable',
        'attendance',
        'meal',
        'dday',
        'youtube',
      ];
      const workHidden = ['timer', 'noise', 'picker', 'roles', 'seating'];
      setWidgetOrder(workOrder);
      setHiddenWidgetIds(workHidden);
      setCollapsedWidgetIds([]);
    } else if (targetMode === 'lesson') {
      const lessonOrder = [
        'postit-init-1',
        'youtube',
        'timer',
        'noise',
        'picker',
        'clock',
        'seating',
        'attendance',
        'roles',
        'timetable',
        'agenda',
        'calendar',
        'meal',
        'dday',
        'observation',
      ];
      const lessonHidden = ['schoolInfo', 'quote'];
      setWidgetOrder(lessonOrder);
      setHiddenWidgetIds(lessonHidden);
      setCollapsedWidgetIds([]);
    }
  }, []);

  // 모드 변경 통합 핸들러
  const handleModeChange = useCallback((newMode: ClassroomMode) => {
    if (newMode === mode) return;

    // 현재 모드가 lesson 또는 work일 때 현재 위젯 상태 저장
    if (mode === 'lesson' || mode === 'work') {
      saveModeLayout(mode);
    }

    // 새 모드가 lesson 또는 work일 때 해당 모드의 이전 위젯 상태 복원
    if (newMode === 'lesson' || newMode === 'work') {
      loadModeLayout(newMode);
    }

    prevModeRef.current = newMode;
    setMode(newMode);
  }, [mode, saveModeLayout, loadModeLayout]);

  // ⏰ 시정표에 맞춰 화면 모드 자동 전환 (사용자가 켰을 때만)
  //  - 수업 시간 → 수업 모드 / 쉬는·점심 시간 → 쉬는 시간 모드 / 마지막 교시 후 40분 → 청소·하교 / 그 뒤 → 업무 모드
  //  - 구간이 바뀔 때만 한 번 바꾸므로, 중간에 직접 바꾼 화면은 다음 구간까지 그대로 유지돼요.
  const [autoModeOn, setAutoModeOn] = useState<boolean>(() => {
    try { return localStorage.getItem('auto_mode_switch_v1') === 'on'; } catch { return false; }
  });
  useEffect(() => {
    const sync = () => { try { setAutoModeOn(localStorage.getItem('auto_mode_switch_v1') === 'on'); } catch { /* 무시 */ } };
    window.addEventListener('classin:auto-mode-changed', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('classin:auto-mode-changed', sync); window.removeEventListener('storage', sync); };
  }, []);
  const autoPhaseRef = useRef<string | null>(null);
  useEffect(() => {
    if (!autoModeOn) { autoPhaseRef.current = null; return; }
    const tick = () => {
      const now = new Date();
      const day = now.getDay();
      if (day === 0 || day === 6) return;
      const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const bells = (config?.bellSchedule || []).filter((b) => b && b.start && b.end && b.enabled !== false)
        .slice().sort((a, b) => a.start.localeCompare(b.start));
      if (bells.length === 0) return;
      const first = bells[0].start;
      const last = bells[bells.length - 1].end;
      const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
      let phase: ClassroomMode | null = null;
      if (hm < first) phase = null;
      else if (hm > last) phase = toMin(hm) - toMin(last) <= 40 ? 'clean' : 'work';
      else {
        const cur = bells.find((b) => hm >= b.start && hm < b.end);
        phase = cur && cur.type !== 'lunch' && cur.type !== 'LUNCH' ? 'lesson' : 'break';
      }
      if (!phase) return;
      if (autoPhaseRef.current === phase) return;
      autoPhaseRef.current = phase;
      if (phase !== mode) {
        handleModeChange(phase);
        {
          const names: Record<string, string> = { lesson: '수업', break: '쉬는 시간', clean: '청소·하교', work: '업무' };
          showToast(`⏰ 시정표에 맞춰 [${names[phase]}] 화면으로 바꿨어요.`);
        }
      }
    };
    tick();
    const t = window.setInterval(tick, 20_000);
    return () => window.clearInterval(t);
  }, [autoModeOn, config?.bellSchedule, mode, handleModeChange, showToast]);

  // 현재 모드가 변경될 때마다 자동 백업 동기화
  useEffect(() => {
    if (mode === 'lesson' || mode === 'work') {
      const layoutData = {
        order: widgetOrder,
        spans: widgetSpans,
        hidden: hiddenWidgetIds,
        collapsed: collapsedWidgetIds,
      };
      try {
        localStorage.setItem(`class_dashboard_widgets_${mode}`, JSON.stringify(layoutData));
      } catch { }
    }
  }, [mode, widgetOrder, widgetSpans, hiddenWidgetIds, collapsedWidgetIds]);

  const getWidgetIcon = (id: string): string => {
    switch (id) {
      case 'clock': return '🍅';
      case 'timer': return '⏱️';
      case 'seqtimer': return '🪜';
      case 'homework': return '📮';
      case 'noise': return '🔊';
      case 'picker': return '🎯';
      case 'roles': return '📋';
      case 'attendance': return '🙋';
      case 'timetable': return '📅';
      case 'agenda': return '📝';
      case 'seating': return '🪑';
      case 'meal': return '🍱';
      case 'calendar': return '🗓️';
      case 'dday': return '⏳';
      case 'observation': return '📒';
      case 'schoolInfo': return '🏫';
      case 'quote': return '💌';
      case 'youtube': return '▶️';
      case 'bookmarks': return '🔖';
      default: return '📌';
    }
  };

  // =========================================================================
  // ① 스마트 가이드라인 & 스냅 엔진 (SnapGuideEngine)
  // =========================================================================
  const [activeDraggingWidgetId, setActiveDraggingWidgetId] = useState<string | null>(null);
  const [snapGuides, setSnapGuides] = useState<{ xs: number[]; ys: number[]; labels?: { x: number; y: number; text: string }[] }>({ xs: [], ys: [] });

  // ↩ 위젯 배치 되돌리기 (자석 · 끌기 · 자리 바꾸기) — Ctrl+Z 또는 알림의 [되돌리기]
  type FreePosMap = Record<string, { x: number; y: number; width?: number; height?: number }>;
  const layoutHistoryRef = useRef<FreePosMap[]>([]);
  const freePosRef = useRef<FreePosMap>({});
  freePosRef.current = freeWidgetPositions;
  const [layoutUndoToast, setLayoutUndoToast] = useState<{ msg: string; key: number } | null>(null);
  useEffect(() => {
    if (!layoutUndoToast) return;
    const t = window.setTimeout(() => setLayoutUndoToast(null), 10000);
    return () => clearTimeout(t);
  }, [layoutUndoToast]);
  const pushLayoutHistory = (snap?: FreePosMap) => {
    const copy = JSON.parse(JSON.stringify(snap || freePosRef.current || {}));
    layoutHistoryRef.current = [...layoutHistoryRef.current.slice(-19), copy];
  };
  const undoLayout = () => {
    const prev = layoutHistoryRef.current.pop();
    if (!prev) {
      showToast('↩ 더 되돌릴 배치가 없어요.');
      return;
    }
    setFreeWidgetPositions(prev);
    try {
      localStorage.setItem('class_dashboard_free_positions', JSON.stringify(prev));
    } catch { }
    setLayoutUndoToast(null);
    setMagnetPreview(null);
    showToast('↩ 바로 전 배치로 되돌렸어요.');
  };
  const undoLayoutRef = useRef(undoLayout);
  undoLayoutRef.current = undoLayout;

  // 🧲 자석 미리보기 (갈 자리를 먼저 보여 주고 [적용] / [취소])
  // kind: magnet(빈틈 메우기) · smart(새로 정렬) · reset(표준 3열) · slot(저장한 배치 불러오기)
  type LayoutPreviewMove = { id: string; x: number; y: number; w: number; h: number; dy: number; dx: number; width?: number; height?: number };
  type LayoutPreview = {
    kind: 'magnet' | 'smart' | 'reset' | 'slot';
    title?: string;
    targets: Record<string, { x: number; y: number }>;
    moved: LayoutPreviewMove[];
    gaps?: { id: string; x: number; y: number; gap: number }[];
    cols?: 2 | 3;
    colWidth?: number;
    colHeight?: number;
    autoHeight?: number;
  };
  const [magnetPreview, setMagnetPreview] = useState<LayoutPreview | null>(null);
  // 🧲 자석 간격 (기본 16px, 미리보기에서 숫자로 바꿀 수 있어요) + 위젯별 '위 간격' 조정값
  const [magnetGap, setMagnetGap] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem('class_dashboard_magnet_gap'));
      return Number.isFinite(v) && v >= 0 && v <= 120 && localStorage.getItem('class_dashboard_magnet_gap') !== null ? v : 16;
    } catch {
      return 16;
    }
  });
  const magnetGapOverridesRef = useRef<Record<string, number>>({});
  const [editingGapId, setEditingGapId] = useState<string | null>(null);
  const magnetPreviewRef = useRef(magnetPreview);
  magnetPreviewRef.current = magnetPreview;

  // 🎨 투명도 시스템 및 글씨 배율 CSS 변수 실시간 동기화
  useEffect(() => {
    document.documentElement.style.setProperty('--widget-card-alpha', String(config.widgetOpacity ?? 0.8));
    document.documentElement.style.setProperty('--dashboard-bg-alpha', String(config.dashboardBgOpacity ?? 0.95));
    document.documentElement.style.setProperty('--dashboard-font-scale', String(config.fontScale ?? 1.0));
    document.documentElement.style.setProperty('--widget-card-blur', '16px');

    // 🪟 리퀴드 글래스(데스크톱 앱): 창 뒤 바탕화면이 비치도록 문서 배경을 투명하게
    //    (웹 브라우저·윈도우10 등 창 재질을 지원하지 않는 환경에서는 기존 배경 유지)
    document.documentElement.classList.toggle('has-window-glass', WINDOW_GLASS !== 'none');
    document.documentElement.classList.toggle('window-glass-clear', WINDOW_GLASS === 'transparent');
    // 🫧 경계 없는 한 판 화면: 헤더 · 사이드 스택 · 위젯 영역을 하나의 판 위에
    document.documentElement.classList.toggle('ci-seamless', config.seamlessLayout !== false);
    // 🧊 매트 유리 농도: 헤더·스택·위젯이 같은 농도를 공유 (선명 투명은 글씨가 잘 보이도록 최소 농도 보장)
    const wAlpha = Math.max(0.3, Math.min(1, config.widgetOpacity ?? 0.8));
    const matteFloor = WINDOW_GLASS === 'transparent' ? 0.46 : 0.28;
    document.documentElement.style.setProperty('--matte-a', String(Math.max(matteFloor, wAlpha)));
    // 🔲 모서리 (위젯 · 패널 공통)
    const radiusPx = { none: 0, sm: 8, md: 18, lg: 24, full: 32 }[config.dashboardBorderRadius || 'md'] ?? 18;
    document.documentElement.style.setProperty('--widget-radius', `${radiusPx}px`);
    document.documentElement.style.setProperty('--panel-radius', `${Math.max(radiusPx, 6)}px`);
    document.documentElement.dataset.windowGlass = WINDOW_GLASS;
  }, [config.widgetOpacity, config.dashboardBgOpacity, config.fontScale, config.dashboardBorderRadius, config.seamlessLayout]);

  // 🔤 대시보드 및 위젯 전체 폰트(글꼴) 실시간 CSS 변수 & DOM 전역 동기화
  useEffect(() => {
    const activeFont = getFontFamily(config.fontFamily);
    document.documentElement.style.setProperty('--app-font-family', activeFont);
    document.documentElement.style.fontFamily = activeFont;
    document.body.style.fontFamily = activeFont;
  }, [config.fontFamily]);

  const handleFreeWindowPointerDown = (e: React.PointerEvent, widgetId: string) => {
    // 위젯이 고정(Pinned)되어 있는 경우 드래그 이동 무력화
    if (pinnedWidgetIds.includes(widgetId)) {
      showToast(`📌 [${getWidgetTitle(widgetId)}] 위젯이 고정되어 있어 이동할 수 없습니다. 상단 핀을 눌러 고정을 해제하세요.`);
      return;
    }

    const target = e.target as HTMLElement;
    // 인터랙티브 요소(버튼, 입력필드, 셀렉트 등) 클릭 시에는 창 드래그 무시
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('textarea') ||
      target.isContentEditable ||
      target.closest('[contenteditable="true"]') ||
      target.closest('.no-drag')
    ) {
      return;
    }

    e.preventDefault();
    setActiveDraggingWidgetId(widgetId);
    if (isWidgetMoveSoundEnabled) {
      playWidgetDragStartSound(widgetSfxMode);
    }

    // 최상위 z-index 부여
    setActiveZIndexMap((prev) => ({
      ...prev,
      [widgetId]: Math.max(...Object.values(prev), 10) + 1,
    }));

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const currentPos = freeWidgetPositions[widgetId] || { x: 20, y: 20, width: 380, height: 320 };
    const initialX = currentPos.x;
    const initialY = currentPos.y;
    const dragSnapshot = JSON.parse(JSON.stringify(freeWidgetPositions));
    let dragMoved = false;
    // 📏 끌기 시작할 때 화면에 보이는 실제 크기를 한 번 재 둬요 (스마트 가이드가 진짜 가장자리에 맞도록)
    const measure = (id: string) => {
      const p = freeWidgetPositions[id] || { x: 20, y: 20 };
      const m = measureWidgetLogical(id);
      return { x: p.x ?? 20, y: p.y ?? 20, w: m ? m.w : p.width || 380, h: m ? m.h : p.height || 320 };
    };
    const selfSize = measure(widgetId);
    const othersMeasured = widgetOrder
      .filter((id) => id !== widgetId && isWidgetActiveOnCanvas(id))
      .map((id) => {
        const m = measure(id);
        return { left: m.x, right: m.x + m.w, top: m.y, bottom: m.y + m.h, width: m.w, height: m.h };
      });
    let dragRaf = 0;
    let pendingPos: { x: number; y: number } | null = null;

    const handlePointerMove = (moveEv: PointerEvent) => {
      // 💡 캔버스 확대/축소 배율(canvasZoom)을 보정하여 마우스 커서와 위젯의 움직임이 1:1로 완벽히 일치하도록 처리
      const deltaX = (moveEv.clientX - startClientX) / (canvasZoom || 1.0);
      const deltaY = (moveEv.clientY - startClientY) / (canvasZoom || 1.0);

      let newX = Math.max(10, initialX + deltaX);
      let newY = Math.max(10, initialY + deltaY);

      // 🧲 ① 스마트 가이드 (F): 가장자리가 맞으면 선, 간격이 16px 이면 숫자와 함께 붙어요
      const SNAP_THRESHOLD = 8;
      const GAP = 16;
      const curW = selfSize.w;
      const curH = selfSize.h;
      const guideXs: number[] = [];
      const guideYs: number[] = [];
      const labels: { x: number; y: number; text: string }[] = [];
      dragMoved = dragMoved || Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3;
      const otherWidgets = othersMeasured;

      // X축 끝선 및 8px 간격 비교 & 강제 스냅
      for (const other of otherWidgets) {
        if (Math.abs(newX - other.left) <= SNAP_THRESHOLD) {
          newX = other.left;
          guideXs.push(other.left);
          break;
        }
        if (Math.abs(newX + curW - other.right) <= SNAP_THRESHOLD) {
          newX = other.right - curW;
          guideXs.push(other.right);
          break;
        }
        if (Math.abs(newX + curW - other.left) <= SNAP_THRESHOLD) {
          newX = other.left - curW;
          guideXs.push(other.left);
          break;
        }
        if (Math.abs(newX - other.right) <= SNAP_THRESHOLD) {
          newX = other.right;
          guideXs.push(other.right);
          break;
        }
        // 16px 간격 스냅 (자석 간격과 같아요) — 세로로 겹치는 이웃일 때만
        const vOverlap = newY < other.bottom && newY + curH > other.top;
        if (vOverlap && Math.abs(newX - (other.right + GAP)) <= SNAP_THRESHOLD) {
          newX = other.right + GAP;
          labels.push({ x: other.right, y: Math.max(newY, other.top) + 24, text: `${GAP}px` });
          break;
        }
        if (vOverlap && Math.abs(newX + curW - (other.left - GAP)) <= SNAP_THRESHOLD) {
          newX = other.left - GAP - curW;
          labels.push({ x: other.left - GAP, y: Math.max(newY, other.top) + 24, text: `${GAP}px` });
          break;
        }
      }

      // Y축 끝선 및 8px 간격 비교 & 강제 스냅
      for (const other of otherWidgets) {
        if (Math.abs(newY - other.top) <= SNAP_THRESHOLD) {
          newY = other.top;
          guideYs.push(other.top);
          break;
        }
        if (Math.abs(newY + curH - other.bottom) <= SNAP_THRESHOLD) {
          newY = other.bottom - curH;
          guideYs.push(other.bottom);
          break;
        }
        if (Math.abs(newY + curH - other.top) <= SNAP_THRESHOLD) {
          newY = other.top - curH;
          guideYs.push(other.top);
          break;
        }
        if (Math.abs(newY - other.bottom) <= SNAP_THRESHOLD) {
          newY = other.bottom;
          guideYs.push(other.bottom);
          break;
        }
        // 16px 간격 스냅 — 가로로 겹치는 이웃일 때만
        const hOverlap = newX < other.right && newX + curW > other.left;
        if (hOverlap && Math.abs(newY - (other.bottom + GAP)) <= SNAP_THRESHOLD) {
          newY = other.bottom + GAP;
          labels.push({ x: Math.max(newX, other.left) + 24, y: other.bottom, text: `${GAP}px` });
          break;
        }
        if (hOverlap && Math.abs(newY + curH - (other.top - GAP)) <= SNAP_THRESHOLD) {
          newY = other.top - GAP - curH;
          labels.push({ x: Math.max(newX, other.left) + 24, y: other.top - GAP, text: `${GAP}px` });
          break;
        }
      }

      // 🧈 한 프레임에 한 번만 화면을 바꿔요 (부드럽게)
      pendingPos = { x: newX, y: newY };
      const g = { xs: guideXs, ys: guideYs, labels };
      if (!dragRaf) {
        dragRaf = requestAnimationFrame(() => {
          dragRaf = 0;
          const pp = pendingPos;
          if (!pp) return;
          setSnapGuides(g);
          setFreeWidgetPositions((prev) => ({
            ...prev,
            [widgetId]: {
              ...(prev[widgetId] || { width: 380 }),
              x: pp.x,
              y: pp.y,
            },
          }));
        });
      }

      // 🔁 커서 아래 다른 위젯이 있으면 '자리 바꾸기' 대상으로 표시
      lastPointerRef.current = { x: moveEv.clientX, y: moveEv.clientY };
      const under = findSwapTarget(moveEv.clientX, moveEv.clientY, widgetId);
      markSwapTarget(under);
    };

    const handlePointerUp = () => {
      if (dragRaf) {
        cancelAnimationFrame(dragRaf);
        dragRaf = 0;
        const pp = pendingPos;
        if (pp) setFreeWidgetPositions((prev) => ({ ...prev, [widgetId]: { ...(prev[widgetId] || { width: 380 }), x: pp.x, y: pp.y } }));
      }
      setActiveDraggingWidgetId(null);
      // 🔁 다른 위젯 위에 놓으면 두 위젯만 자리를 맞바꿔요 (나머지 위젯은 그대로)
      const lp = lastPointerRef.current;
      const swapWith = lp ? findSwapTarget(lp.x, lp.y, widgetId) : null;
      markSwapTarget(null);
      lastPointerRef.current = null;
      if (dragMoved || swapWith) pushLayoutHistory(dragSnapshot);
      if (swapWith) {
        setLayoutUndoToast({ msg: `🔁 [${getWidgetTitle(widgetId)}] ↔ [${getWidgetTitle(swapWith)}] 자리를 바꿨어요`, key: Date.now() });
        setFreeWidgetPositions((prev) => {
          const target = prev[swapWith] || { x: 20, y: 20 };
          const next = {
            ...prev,
            [widgetId]: { ...(prev[widgetId] || {}), x: target.x, y: target.y },
            [swapWith]: { ...target, x: initialX, y: initialY },
          };
          try { localStorage.setItem('class_dashboard_free_positions', JSON.stringify(next)); } catch { }
          return next;
        });
        setWidgetOrder((prev) => {
          const a = prev.indexOf(widgetId), b = prev.indexOf(swapWith);
          if (a < 0 || b < 0) return prev;
          const next = [...prev];
          next[a] = swapWith; next[b] = widgetId;
          try { localStorage.setItem('class_dashboard_widget_order', JSON.stringify(next)); } catch { }
          return next;
        });
      }
      // 마우스 드롭(pointerup) 시 가이드선은 사라지고 정렬된 위치에 저장
      setSnapGuides({ xs: [], ys: [], labels: [] });
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      if (isWidgetMoveSoundEnabled) {
        playWidgetSnapSound(widgetSfxMode);
      }

      setFreeWidgetPositions((latest) => {
        try {
          localStorage.setItem('class_dashboard_free_positions', JSON.stringify(latest));
        } catch { }
        return latest;
      });
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // 자유 이동 모드 전용 위젯 너비 및 높이 리사이징 핸들러
  const handleFreeResizeWidget = (widgetId: string, width: number, height: number) => {
    setFreeWidgetPositions((prev) => {
      const updated = {
        ...prev,
        [widgetId]: {
          ...(prev[widgetId] || { x: 20, y: 20 }),
          width: Math.round(width),
          height: Math.round(height),
        },
      };
      try {
        localStorage.setItem('class_dashboard_free_positions', JSON.stringify(updated));
      } catch { }
      return updated;
    });
  };

  // 📏 위젯 한 개의 '논리 크기' (캔버스 배율과 무관한 레이아웃 크기 — offsetWidth/Height)
  //    getBoundingClientRect ÷ 배율 방식은 환경(전자칠판 · 맥 앱)에 따라 배율이 두 번/덜 반영돼
  //    미리보기 상자가 실제보다 작게 나오고 위젯끼리 포개졌어요 → 레이아웃 크기로 바꿨어요
  const measureWidgetLogical = (id: string): { w: number; h: number } | null => {
    try {
      const el = document.querySelector(`[data-free-widget-id="${CSS.escape(id)}"]`) as HTMLElement | null;
      if (!el || el.offsetWidth < 40) return null;
      let w = el.offsetWidth;
      let h = el.offsetHeight;
      // 카드가 바깥 틀보다 크게 그려져 있으면 실제로 보이는 크기로 (겹침 방지)
      const card = el.querySelector('[data-widget-card-id]') as HTMLElement | null;
      if (card) {
        let top = 0;
        let left = 0;
        let n: HTMLElement | null = card;
        while (n && n !== el) {
          top += n.offsetTop;
          left += n.offsetLeft;
          n = n.offsetParent as HTMLElement | null;
          if (n && !el.contains(n)) break;
        }
        if (card.offsetHeight > 30) h = Math.max(h, top + card.offsetHeight);
        if (card.offsetWidth > 40) w = Math.max(w, left + card.offsetWidth);
      }
      return { w: Math.round(w), h: Math.round(h) };
    } catch {
      return null;
    }
  };

  // 📏 지금 화면에 보이는 실제 크기로 위젯 목록 만들기 (저장값과 달라 엉뚱하게 배치되던 문제 방지)
  const measureCanvasItems = () => {
    const activeIds = widgetOrder.filter(isWidgetActiveOnCanvas);
    return activeIds.map((id, order) => {
      const p = freeWidgetPositions[id] || { x: 20, y: 20 };
      const m = measureWidgetLogical(id);
      const w = m ? m.w : p.width || 380;
      const h = m ? m.h : p.height || 320;
      return { id, x: p.x ?? 20, y: p.y ?? 20, w, h, pinned: pinnedWidgetIds.includes(id), order };
    });
  };
  // 캔버스의 실제(배율 적용 전) 가로 폭
  const getCanvasLogicalWidth = () => {
    const el = freeCanvasRef.current;
    // 화면에 실제로 보이는 폭 ÷ 배율 = 위젯 좌표로 쓸 수 있는 폭 (배율 60%면 더 넓게, 130%면 더 좁게)
    const host = el?.closest('#main-canvas-scalable-area')?.parentElement as HTMLElement | null;
    const zoom = canvasZoom || 1.0;
    if (host && host.clientWidth > 100) return Math.round(host.clientWidth / zoom) - 16;
    if (el && el.clientWidth > 100) return el.clientWidth;
    return window.innerWidth - 320;
  };
  // 미리보기 결과(최종 배치)에서 위젯 사이 간격 표시를 만들어요
  const buildGapLabels = (items: { id: string; x: number; y: number; w: number; h: number; pinned?: boolean }[], targets: Record<string, { x: number; y: number }>, sizes?: Record<string, { w: number; h: number }>) => {
    const rects = items.map((it) => ({ id: it.id, x: targets[it.id]?.x ?? it.x, y: targets[it.id]?.y ?? it.y, w: sizes?.[it.id]?.w ?? it.w, h: sizes?.[it.id]?.h ?? it.h }));
    const g = measureTopGaps(rects);
    return rects
      .filter((r) => g[r.id] && g[r.id].gap >= 0 && !items.find((i) => i.id === r.id)?.pinned)
      .map((r) => {
        const above = rects.find((a) => a.id === g[r.id].aboveId)!;
        const l = Math.max(r.x, above.x);
        const rr = Math.min(r.x + r.w, above.x + above.w);
        return { id: r.id, x: Math.round((l + rr) / 2), y: Math.round(r.y - g[r.id].gap / 2), gap: g[r.id].gap };
      });
  };

  // 🧲 [자석 정리: 같은 세로줄 안에서 위로 붙이고, 위젯 사이 간격을 일정하게]
  const computeMagnetPreview = (gap: number, overrides: Record<string, number>) => {
    const items = measureCanvasItems();
    if (items.length === 0) return null;
    const targets = alignInPlace(items, { padding: 16, gap, gapAbove: overrides });
    const moved = items
      .filter((it) => targets[it.id] && (Math.abs(targets[it.id].y - it.y) > 1 || Math.abs(targets[it.id].x - it.x) > 1))
      .map((it) => ({ id: it.id, x: targets[it.id].x, y: targets[it.id].y, w: it.w, h: it.h, dy: Math.round(it.y - targets[it.id].y), dx: Math.round(it.x - targets[it.id].x) }));
    return { kind: 'magnet' as const, targets, moved, gaps: buildGapLabels(items, targets) };
  };
  const handleFreeCanvasMinGapAlign = () => {
    setIsTightGap(true);
    try {
      localStorage.setItem('class_dashboard_tight_gap', 'true');
    } catch { }
    magnetGapOverridesRef.current = {};
    setEditingGapId(null);
    const pv = computeMagnetPreview(magnetGap, {});
    if (!pv) return;
    if (pv.moved.length === 0) {
      showToast(`🧲 이미 깔끔하게 정리되어 있어요. (간격 ${magnetGap}px)`);
      return;
    }
    setMagnetPreview(pv);
  };
  // 미리보기에서 간격 숫자를 바꾸면 바로 다시 계산해요
  const updateMagnetGap = (id: string | null, value: number) => {
    const v = Math.max(0, Math.min(120, Math.round(value)));
    if (id) {
      magnetGapOverridesRef.current = { ...magnetGapOverridesRef.current, [id]: v };
    } else {
      setMagnetGap(v);
      magnetGapOverridesRef.current = {};
      try {
        localStorage.setItem('class_dashboard_magnet_gap', String(v));
      } catch { }
    }
    const pv = computeMagnetPreview(id ? magnetGap : v, magnetGapOverridesRef.current);
    if (pv) setMagnetPreview(pv);
    setEditingGapId(null);
  };

  // ✨ [새로 정렬: 크기는 그대로, 읽는 순서대로 빈틈없이] — 미리보기 후 적용
  const buildSmartPreview = (): LayoutPreview | null => {
    const items = measureCanvasItems();
    if (items.length === 0) return null;
    const targets = packLayout(items, { containerWidth: getCanvasLogicalWidth(), padding: 16, gap: magnetGap });
    const moved = items
      .filter((it) => targets[it.id] && (Math.abs(targets[it.id].y - it.y) > 1 || Math.abs(targets[it.id].x - it.x) > 1))
      .map((it) => ({ id: it.id, x: targets[it.id].x, y: targets[it.id].y, w: it.w, h: it.h, dy: Math.round(it.y - targets[it.id].y), dx: Math.round(it.x - targets[it.id].x) }));
    return { kind: 'smart', targets, moved, gaps: buildGapLabels(items, targets) };
  };
  // 🛟 적용한 뒤 한 번 더: 실제로 그려진 크기로 확인해서, 그래도 포개진 위젯이 있으면 아래로 내려 간격을 둬요
  const settleOverlapsAfterApply = (gap: number) => {
    const run = (round: number) => {
      const posMap = freePosRef.current || {};
      const ids = widgetOrder.filter(isWidgetActiveOnCanvas);
      const rs = ids
        .map((id) => {
          const p = posMap[id];
          const m = measureWidgetLogical(id);
          if (!p || !m) return null;
          return { id, x: p.x ?? 20, y: p.y ?? 20, w: m.w, h: m.h, pinned: pinnedWidgetIds.includes(id) };
        })
        .filter(Boolean) as { id: string; x: number; y: number; w: number; h: number; pinned: boolean }[];
      rs.sort((a, b) => a.y - b.y || a.x - b.x);
      const changed: Record<string, number> = {};
      for (let pass = 0; pass < 60; pass++) {
        let any = false;
        for (let i = 0; i < rs.length; i++) {
          for (let j = 0; j < rs.length; j++) {
            if (i === j) continue;
            const A = rs[i];
            const B = rs[j];
            if (B.pinned) continue;
            if (B.y < A.y || (B.y === A.y && B.x <= A.x && j < i)) continue;
            const ox = B.x < A.x + A.w - 1 && B.x + B.w - 1 > A.x;
            const oy = B.y < A.y + A.h - 1 && B.y + B.h - 1 > A.y;
            if (ox && oy) {
              B.y = Math.round(A.y + A.h + gap);
              changed[B.id] = B.y;
              any = true;
            }
          }
        }
        if (!any) break;
      }
      const n = Object.keys(changed).length;
      if (n === 0) return;
      setFreeWidgetPositions((prev) => {
        const next = { ...prev };
        Object.entries(changed).forEach(([id, y]) => {
          next[id] = { ...(prev[id] || { x: 20 }), y } as any;
        });
        try {
          localStorage.setItem('class_dashboard_free_positions', JSON.stringify(next));
        } catch { }
        return next;
      });
      // 내려간 위젯 크기가 바뀌었을 수도 있으니 한 번 더 확인
      if (round < 2) window.setTimeout(() => run(round + 1), 260);
    };
    window.setTimeout(() => run(0), 420);
  };

  const applyMagnetPreview = () => {
    const pv = magnetPreviewRef.current;
    if (!pv) return;
    pushLayoutHistory();
    setFreeWidgetPositions((prev) => {
      const next = { ...prev };
      pv.moved.forEach((m) => {
        next[m.id] = { ...(prev[m.id] || {}), x: m.x, y: m.y, ...(m.width ? { width: m.width } : {}), ...(m.height ? { height: m.height } : {}) };
      });
      try {
        localStorage.setItem('class_dashboard_free_positions', JSON.stringify(next));
        pv.moved.forEach((m) => {
          if (m.height) localStorage.setItem(`widget_height_${m.id}`, String(m.height));
        });
      } catch { }
      return next;
    });
    setMagnetPreview(null);
    setEditingGapId(null);
    settleOverlapsAfterApply(magnetGap);
    const n = pv.moved.length;
    const msg =
      pv.kind === 'smart'
        ? `✨ 위젯 ${n}개를 크기 그대로 새로 정렬했어요`
        : pv.kind === 'reset'
        ? `▦ 위젯 ${n}개를 ${pv.cols || 3}열 같은 크기로 맞췄어요`
        : pv.kind === 'slot'
        ? `💾 '${pv.title || '저장한 배치'}'를 불러왔어요`
        : `🧲 위젯 ${n}개를 같은 줄 안에서 정리했어요`;
    setLayoutUndoToast({ msg, key: Date.now() });
    if (isWidgetMoveSoundEnabled) {
      playWidgetSnapSound(widgetSfxMode);
    }
  };
  // 🎛️ 사이드 스택 배치 모드(양쪽/좌측/우측/전체)마다 위젯 크기·위치·배율을 따로 기억해요
  //    (전체 화면에서 맞춘 배치가 양쪽 모드로 돌아갔을 때 덮어쓰이지 않도록)
  const sidebarModeRef = useRef<SidebarLayoutMode>(sidebarLayoutMode);
  useEffect(() => {
    const prevMode = sidebarModeRef.current;
    if (prevMode === sidebarLayoutMode) return;
    sidebarModeRef.current = sidebarLayoutMode;
    let all: Record<string, { pos: FreePosMap; zoom?: number; at?: number }> = {};
    try {
      all = JSON.parse(localStorage.getItem('class_dashboard_layout_by_sidebar_v1') || '{}') || {};
    } catch { }
    all[prevMode] = { pos: JSON.parse(JSON.stringify(freePosRef.current || {})), zoom: canvasZoomRef.current, at: Date.now() };
    const snap = all[sidebarLayoutMode];
    try {
      localStorage.setItem('class_dashboard_layout_by_sidebar_v1', JSON.stringify(all));
    } catch { }
    if (snap && snap.pos && typeof snap.pos === 'object') {
      setMagnetPreview(null);
      setFreeWidgetPositions((cur) => {
        const next: FreePosMap = { ...cur };
        Object.entries(snap.pos).forEach(([id, v]) => {
          if (v && typeof v === 'object') next[id] = { ...(cur[id] || {}), ...v };
        });
        try {
          localStorage.setItem('class_dashboard_free_positions', JSON.stringify(next));
        } catch { }
        return next;
      });
      if (typeof snap.zoom === 'number' && snap.zoom >= 0.6 && snap.zoom <= 1.5) setCanvasZoom(snap.zoom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarLayoutMode]);

  // 💾 배치 저장함: 이름을 붙여 저장하고, 고른 배치만 미리보기 후 불러와요 (몰래 저장하지 않아요)
  type LayoutSlot = { id: string; name: string; savedAt: number; mode: SidebarLayoutMode; zoom?: number; pos: FreePosMap };
  const [layoutSlots, setLayoutSlots] = useState<LayoutSlot[]>(() => {
    try {
      const raw = localStorage.getItem('class_dashboard_layout_slots_v1');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr;
      }
      // 예전 '디자인 저장' 한 칸을 저장함으로 옮겨요 (한 번만)
      const old = localStorage.getItem('class_dashboard_user_saved_layout');
      if (old) {
        const pos = JSON.parse(old);
        const migrated: LayoutSlot[] = pos && typeof pos === 'object' && Object.keys(pos).length > 0 ? [{ id: `slot-${Date.now()}`, name: '예전에 저장한 배치', savedAt: Date.now(), mode: 'BOTH', pos }] : [];
        localStorage.setItem('class_dashboard_layout_slots_v1', JSON.stringify(migrated));
        localStorage.removeItem('class_dashboard_user_saved_layout');
        return migrated;
      }
    } catch { }
    return [];
  });
  const [isSlotMenuOpen, setIsSlotMenuOpen] = useState(false);
  const persistSlots = (next: LayoutSlot[]) => {
    setLayoutSlots(next);
    try {
      localStorage.setItem('class_dashboard_layout_slots_v1', JSON.stringify(next));
    } catch { }
  };
  const SIDEBAR_MODE_SHORT: Record<SidebarLayoutMode, string> = { BOTH: '양쪽', LEFT_ONLY: '좌측 집중', RIGHT_ONLY: '우측 집중', NONE: '전체 화면' };
  const saveLayoutSlot = (rawName: string, overwriteId?: string) => {
    const name = (rawName || '').trim() || `배치 ${layoutSlots.length + 1}`;
    const pos = JSON.parse(JSON.stringify(freeWidgetPositions));
    if (overwriteId) {
      persistSlots(layoutSlots.map((sl) => (sl.id === overwriteId ? { ...sl, pos, savedAt: Date.now(), mode: sidebarLayoutMode, zoom: canvasZoom } : sl)));
      showToast(`💾 '${layoutSlots.find((sl) => sl.id === overwriteId)?.name}'에 지금 배치를 덮어 저장했어요.`);
    } else {
      if (layoutSlots.length >= 8) {
        showToast('💾 배치는 8개까지 저장할 수 있어요. 안 쓰는 배치를 지워 주세요.');
        return;
      }
      persistSlots([...layoutSlots, { id: `slot-${Date.now()}`, name: name.slice(0, 20), savedAt: Date.now(), mode: sidebarLayoutMode, zoom: canvasZoom, pos }]);
      showToast(`💾 '${name.slice(0, 20)}' 배치를 저장했어요.`);
    }
    if (isWidgetMoveSoundEnabled) playWidgetSnapSound(widgetSfxMode);
  };
  const loadLayoutSlot = (slot: LayoutSlot) => {
    const items = measureCanvasItems();
    const moved: LayoutPreviewMove[] = [];
    const targets: Record<string, { x: number; y: number }> = {};
    items.forEach((it) => {
      const sp = slot.pos[it.id];
      if (!sp) return;
      const nw = sp.width || it.w;
      const nh = sp.height || it.h;
      targets[it.id] = { x: sp.x, y: sp.y };
      if (Math.abs(sp.x - it.x) > 1 || Math.abs(sp.y - it.y) > 1 || Math.abs(nw - it.w) > 1 || Math.abs(nh - it.h) > 1) {
        moved.push({ id: it.id, x: sp.x, y: sp.y, w: nw, h: nh, dy: Math.round(it.y - sp.y), dx: Math.round(it.x - sp.x), width: sp.width, height: sp.height });
      }
    });
    setIsSlotMenuOpen(false);
    if (moved.length === 0) {
      showToast(`💾 지금 배치가 '${slot.name}'와 같아요.`);
      return;
    }
    setEditingGapId(null);
    setMagnetPreview({ kind: 'slot', title: slot.name, targets, moved });
  };
  const deleteLayoutSlot = (id: string) => persistSlots(layoutSlots.filter((sl) => sl.id !== id));

  // ⌨️ Ctrl+Z 배치 되돌리기 · 미리보기에서 Enter 적용 / Esc 취소
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (magnetPreviewRef.current) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setMagnetPreview(null);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          applyMagnetPreviewRef.current();
          return;
        }
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.code === 'KeyZ' && layoutHistoryRef.current.length > 0) {
        e.preventDefault();
        undoLayoutRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const applyMagnetPreviewRef = useRef(applyMagnetPreview);
  applyMagnetPreviewRef.current = applyMagnetPreview;

  // 📌 [요구사항 4: 우측 스택 내 개별 메모 위젯 영역 복원 핸들러]
  const handleRestoreMemoToCanvas = (postItId: string, title?: string) => {
    // 0. postItWidgets 상태 즉시 반전: isStacked: false, isMinimized: false, hidden: false 보장
    setPostItWidgets((prev) => {
      const exists = prev.some((p) => p.id === postItId);
      let next: PostItWidgetData[];
      if (!exists) {
        const recovered: any = {
          id: postItId,
          title: title || '복원된 메모',
          content: '',
          color: 'yellow',
          fontSize: 'md',
          createdAt: new Date().toISOString().slice(0, 10),
          isStacked: false,
          isMinimized: false,
          hidden: false,
        };
        next = [recovered, ...prev];
      } else {
        next = prev.map((p) =>
          p.id === postItId
            ? ({
                ...p,
                isStacked: false,
                isMinimized: false,
                hidden: false,
              } as any)
            : p
        );
      }
      try {
        localStorage.setItem('class_dashboard_postits', JSON.stringify(next));
      } catch { }
      return next;
    });

    // 1. widgetOrder 최상단 또는 고정 위젯바로 뒤로 복원 (중앙 보드 활성 위젯 목록 누락 방지)
    setWidgetOrder((prev) => {
      const filtered = prev.filter((id) => id !== postItId);
      const visiblePinnedIds = pinnedWidgetIds.filter(
        (pid) => !hiddenWidgetIds.includes(pid) && !collapsedWidgetIds.includes(pid)
      );

      let insertIdx = 0;
      if (visiblePinnedIds.length > 0) {
        const targetPinnedId = visiblePinnedIds[0];
        const pinnedIdx = filtered.indexOf(targetPinnedId);
        insertIdx = pinnedIdx >= 0 ? pinnedIdx + 1 : 0;
      } else if (isBookmarksCompact && filtered.includes('bookmarks')) {
        const bIdx = filtered.indexOf('bookmarks');
        insertIdx = bIdx >= 0 ? bIdx + 1 : 0;
      }

      const next = [
        ...filtered.slice(0, insertIdx),
        postItId,
        ...filtered.slice(insertIdx),
      ];
      try {
        localStorage.setItem('class_dashboard_widget_order', JSON.stringify(next));
      } catch { }
      return next;
    });

    // 2. collapsed 및 hidden에서 완전 해제 및 로컬스토리지 즉시 동기화
    setCollapsedWidgetIds((prev) => {
      const next = prev.filter((id) => id !== postItId);
      try {
        localStorage.setItem('class_dashboard_collapsed_widgets', JSON.stringify(next));
        localStorage.setItem(`widget_collapsed_${postItId}`, 'false');
      } catch { }
      return next;
    });

    setHiddenWidgetIds((prev) => {
      const next = prev.filter((id) => id !== postItId);
      try {
        localStorage.setItem('class_dashboard_hidden_widgets', JSON.stringify(next));
      } catch { }
      return next;
    });

    // 3. 그리드 모드: widgetSpans 안전 크기(4칸) 보장
    setWidgetSpans((prev) => {
      const next = { ...prev, [postItId]: (prev[postItId] || 4) as WidgetSpan };
      try {
        localStorage.setItem('class_dashboard_widget_spans', JSON.stringify(next));
      } catch { }
      return next;
    });

    // 4. 자유 배치 모드: 화면 중앙/상단 가시 영역 좌표 및 Z-Index 최상위 보장
    setFreeWidgetPositions((prev) => {
      const cur = prev[postItId];
      const updated = {
        ...prev,
        [postItId]: {
          x: cur?.x && cur.x > 0 ? cur.x : 40,
          y: cur?.y && cur.y > 0 ? cur.y : 60,
          width: cur?.width || 340,
          height: cur?.height || 280,
        },
      };
      try {
        localStorage.setItem('class_dashboard_free_positions', JSON.stringify(updated));
      } catch { }
      return updated;
    });

    // 5. Z-Index 최상위 부여 (화면 뒤로 숨겨지지 않도록 보장)
    setActiveZIndexMap((prev) => {
      const maxZ = Math.max(0, ...Object.values(prev), 10);
      return {
        ...prev,
        [postItId]: maxZ + 1,
      };
    });

    if (isWidgetMoveSoundEnabled) {
      playCelebrateSound();
    }
    showToast(`📌 [${title || '메모'}] 메인 그리드로 활성화 되었습니다.`);
  };

  // 캔버스 내 자유 이동 드롭 처리
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const widgetId = draggedWidgetId || e.dataTransfer.getData('text/plain');
    if (!widgetId || !freeCanvasRef.current) return;

    const canvasRect = freeCanvasRef.current.getBoundingClientRect();
    const rawX = e.clientX - canvasRect.left;
    const rawY = e.clientY - canvasRect.top;

    const newX = Math.max(10, Math.round(rawX - 180));
    const newY = Math.max(10, Math.round(rawY - 20));

    setFreeWidgetPositions((prev) => {
      const updated = {
        ...prev,
        [widgetId]: {
          ...(prev[widgetId] || { width: 380 }),
          x: newX,
          y: newY,
        },
      };
      localStorage.setItem('class_dashboard_free_positions', JSON.stringify(updated));
      return updated;
    });

    setActiveZIndexMap((prev) => ({
      ...prev,
      [widgetId]: Math.max(...Object.values(prev), 10) + 1,
    }));

    handleDragEnd();
    if (isWidgetMoveSoundEnabled) {
      playCelebrateSound();
    }
    showToast(`📍 [${getWidgetTitle(widgetId)}] 위젯이 지정한 위치로 이동되었습니다.`);
  };

  // 자석 버튼 핸들러: 27인치 4열 / 노트북 3열 화면에 맞추어 빈 공간 없이 즉시 밀착 정렬 (간격을 좁게 유지)
  const handleAutoAlignWidgets = () => {
    setIsTightGap(true);
    try {
      localStorage.setItem('class_dashboard_tight_gap', 'true');
    } catch { }

    if (placementMode === 'freeform') {
      handleFreeCanvasMinGapAlign();
      return;
    }

    // 1. 흩어진 위젯들이 현재 모니터 해상도에 맞추어 꽉 차게 정렬 (보관된 위젯 제외)
    const activeVisibleIds = widgetOrder.filter(
      (id) => !hiddenWidgetIds.includes(id) && !collapsedWidgetIds.includes(id)
    );

    const mainCanvasEl = document.getElementById('main-canvas-container');
    const actualWidth = mainCanvasEl ? mainCanvasEl.clientWidth : window.innerWidth;
    const effectiveColumns = (actualWidth >= 1200 || window.innerWidth >= 1350 || screenInfo.optimalColumns >= 4) ? 4 : 3;
    const effectiveSpan = effectiveColumns >= 4 ? 3 : 4;

    const optResult = optimizeGridLayout(
      activeVisibleIds,
      widgetSpans,
      hiddenWidgetIds,
      12,
      undefined,
      effectiveColumns,
      effectiveSpan
    );

    const updatedOrder = [
      ...optResult.newOrder,
      ...widgetOrder.filter((id) => !optResult.newOrder.includes(id)),
    ];

    setWidgetOrder(updatedOrder);
    setWidgetSpans(optResult.newSpans);

    // 💡 [자석 모드 핵심]: 사용자가 만들어둔 위젯 크기(커스텀 높이 및 스팬)를 100% 보존하면서 상하좌우 빈 영역 없이 밀착 패킹
    setTimeout(() => {
      try {
        localStorage.setItem('class_dashboard_widget_order', JSON.stringify(updatedOrder));
        localStorage.setItem('class_dashboard_widget_spans', JSON.stringify(optResult.newSpans));
      } catch { }
    }, 0);

    if (isWidgetMoveSoundEnabled) {
      playCelebrateSound();
    }
    showToast(`🧲 자석 모드 정렬: 위젯 간격을 더 좁고 촘촘하게 유지하며 상하좌우 빈 영역 없이 착착 밀착 정렬되었습니다.`);
  };

  // 🔄 [독서 노트 ↔ 뽀모도로 타이머 상호 스왑 (Swap) 핸들러]
  const handleSwapClockAndQuote = useCallback(() => {
    const isQuoteActive = isWidgetActiveOnCanvas('quote');
    const isClockActive = isWidgetActiveOnCanvas('clock');

    if (isQuoteActive && !isClockActive) {
      // Case A: 뽀모도로가 좌측 스택 보관함에 들어가 있는 경우 -> 독서 노트 위치/크기로 뽀모도로 배치, 독서 노트는 좌측 스택으로 이동
      const quotePos = freeWidgetPositions['quote'] || { x: 20, y: 20, width: 380, height: 360 };
      setFreeWidgetPositions((prev) => {
        const next = {
          ...prev,
          clock: { ...quotePos },
        };
        try {
          localStorage.setItem('class_dashboard_free_positions', JSON.stringify(next));
        } catch {}
        return next;
      });

      // clock은 스택에서 꺼내고, quote는 collapsedWidgetIds에 추가
      setCollapsedWidgetIds((prev) => {
        const next = [...prev.filter((id) => id !== 'clock'), 'quote'];
        try {
          localStorage.setItem('class_dashboard_collapsed_widgets', JSON.stringify(next));
        } catch {}
        return next;
      });
      setHiddenWidgetIds((prev) => prev.filter((id) => id !== 'clock'));

      showToast('🔄 독서 노트 자리에 뽀모도로 타이머가 배치되고, 독서 노트는 좌측 스택으로 보관되었습니다.');
    } else if (!isQuoteActive && isClockActive) {
      // Case A-2: 반대로 독서 노트가 스택에 있고 뽀모도로가 캔버스에 나와 있는 경우
      const clockPos = freeWidgetPositions['clock'] || { x: 20, y: 20, width: 380, height: 360 };
      setFreeWidgetPositions((prev) => {
        const next = {
          ...prev,
          quote: { ...clockPos },
        };
        try {
          localStorage.setItem('class_dashboard_free_positions', JSON.stringify(next));
        } catch {}
        return next;
      });

      setCollapsedWidgetIds((prev) => {
        const next = [...prev.filter((id) => id !== 'quote'), 'clock'];
        try {
          localStorage.setItem('class_dashboard_collapsed_widgets', JSON.stringify(next));
        } catch {}
        return next;
      });
      setHiddenWidgetIds((prev) => prev.filter((id) => id !== 'quote'));

      showToast('🔄 뽀모도로 타이머 자리에 독서 노트가 배치되고, 뽀모도로는 좌측 스택으로 보관되었습니다.');
    } else if (isQuoteActive && isClockActive) {
      // Case B: 두 위젯이 둘 다 캔버스에 나와 있는 경우 -> 두 위젯의 (x, y) 좌표를 서로 맞바꿈 (크기는 각자 보존)
      const quotePos = freeWidgetPositions['quote'] || { x: 20, y: 20, width: 380, height: 360 };
      const clockPos = freeWidgetPositions['clock'] || { x: 420, y: 20, width: 380, height: 360 };

      setFreeWidgetPositions((prev) => {
        const next = {
          ...prev,
          quote: { ...quotePos, x: clockPos.x, y: clockPos.y },
          clock: { ...clockPos, x: quotePos.x, y: quotePos.y },
        };
        try {
          localStorage.setItem('class_dashboard_free_positions', JSON.stringify(next));
        } catch {}
        return next;
      });

      showToast('🔄 독서 노트와 뽀모도로 타이머의 위치가 맞바뀌었습니다.');
    } else {
      // 둘 다 스택에 있는 경우 -> 독서 노트를 캔버스로 꺼냄
      setCollapsedWidgetIds((prev) => prev.filter((id) => id !== 'quote'));
      showToast('📖 독서 노트가 메인 캔버스로 복원되었습니다.');
    }

    if (isWidgetMoveSoundEnabled) {
      playWidgetSnapSound(widgetSfxMode);
    }
  }, [freeWidgetPositions, isWidgetActiveOnCanvas, isWidgetMoveSoundEnabled, widgetSfxMode, showToast]);

  // 📐 [열 맞춤 정렬: 2열 · 3열 균등] 모든 위젯을 같은 크기로 (📌 고정 위젯은 그대로) — 먼저 미리보기
  //   3열: 출결 관리 위젯 비율(가로:세로 ≈ 1 : 0.825)로 모두 같은 크기
  //   2열: 너비만 2열로 넓히고, 높이는 3열일 때와 같게
  const handleResetDefaultLayout = (opts?: { cols?: 2 | 3; height?: number }) => {
    const activeIds = widgetOrder.filter(isWidgetActiveOnCanvas);
    if (activeIds.length === 0) return;
    let cols: 2 | 3 = opts?.cols || 3;
    if (!opts?.cols) {
      try {
        if (localStorage.getItem('class_dashboard_reset_cols') === '2') cols = 2;
      } catch { }
    }
    try {
      localStorage.setItem('class_dashboard_reset_cols', String(cols));
    } catch { }
    const PADDING = 16;
    const GAP = magnetGap;
    const canvasW = getCanvasLogicalWidth();
    const colW3 = Math.max(260, Math.floor((canvasW - PADDING * 2 - GAP * 2) / 3));
    const colW2 = Math.max(320, Math.floor((canvasW - PADDING * 2 - GAP) / 2));
    const autoH = Math.max(200, Math.round(colW3 * 0.825));
    const H = opts?.height && opts.height >= 160 ? Math.min(1400, Math.round(opts.height)) : autoH;
    const colW = cols === 3 ? colW3 : colW2;
    const columnXs = Array.from({ length: cols }, (_, i) => PADDING + i * (colW + GAP));

    const measured = measureCanvasItems();
    const sized = measured.map((it) => (it.pinned ? it : { ...it, w: colW, h: H }));
    const targets = packLayout(sized, { containerWidth: canvasW, padding: PADDING, gap: GAP, columns: columnXs });
    const moved = sized
      .filter((it) => !it.pinned)
      .map((it) => {
        const orig = measured.find((m) => m.id === it.id)!;
        return { id: it.id, x: targets[it.id].x, y: targets[it.id].y, w: it.w, h: it.h, dy: Math.round(orig.y - targets[it.id].y), dx: Math.round(orig.x - targets[it.id].x), width: it.w, height: it.h };
      });
    if (moved.length === 0) {
      showToast('정렬할 위젯이 없어요. (📌 고정 위젯만 있어요)');
      return;
    }
    setEditingGapId(null);
    setMagnetPreview({ kind: 'reset', targets, moved, gaps: buildGapLabels(sized, targets), cols, colWidth: colW, colHeight: H, autoHeight: autoH });
  };

  const handleWidgetSpanChange = (widgetId: string, span: WidgetSpan) => {
    setWidgetSpans((prev) => {
      const next = { ...prev, [widgetId]: span };
      localStorage.setItem('class_dashboard_widget_spans', JSON.stringify(next));
      return next;
    });
  };

  const draggedWidgetIdRef = useRef<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    // 위젯이 핀으로 고정되어 있으면 드래그 방지
    if (pinnedWidgetIds.includes(id)) {
      e.preventDefault();
      showToast(`📌 [${getWidgetTitle(id)}] 위젯이 고정되어 있어 이동할 수 없습니다. 상단 핀을 눌러 고정을 해제하세요.`);
      return;
    }

    e.dataTransfer.setData('text/plain', id);
    draggedWidgetIdRef.current = id;
    setDraggedWidgetId(id);
    if (isWidgetMoveSoundEnabled) {
      playWidgetDragStartSound(widgetSfxMode);
    }
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (dragOverWidgetId !== id) {
      setDragOverWidgetId(id);
    }
  };

  const handleDragEnd = () => {
    draggedWidgetIdRef.current = null;
    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
    setDockOverTargetId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = draggedWidgetIdRef.current || draggedWidgetId || e.dataTransfer.getData('text/plain');
    if (!sourceId) {
      handleDragEnd();
      return;
    }

    // 1. DOCKING BEHAVIOR (사용자 요구 핵심 기능):
    // 위젯을 다른 위젯의 바로 아래(Bottom edge)에 도킹하듯 드롭하면
    // 하단 위젯의 그리드 너비(col span)가 상단 위젯과 동일하게 자동 동기화되고 그 바로 뒤에 배치됨
    if (targetId.startsWith('dock-bottom-')) {
      const parentWidgetId = targetId.replace('dock-bottom-', '');
      if (parentWidgetId === sourceId) {
        handleDragEnd();
        return;
      }

      const parentSpan = widgetSpans[parentWidgetId] || 3;
      // 하단 위젯의 그리드 너비를 상단 위젯의 너비와 동일하게 자동 동기화
      const updatedSpans = { ...widgetSpans, [sourceId]: parentSpan };
      setWidgetSpans(updatedSpans);
      localStorage.setItem('class_dashboard_widget_spans', JSON.stringify(updatedSpans));

      // 상단 위젯바로 뒤에 도킹 위젯을 위치시킴
      const list = [...widgetOrder.filter((id) => id !== sourceId)];
      const parentIdx = list.indexOf(parentWidgetId);
      if (parentIdx !== -1) {
        list.splice(parentIdx + 1, 0, sourceId);
      } else {
        list.push(sourceId);
      }

      setWidgetOrder(list);
      localStorage.setItem('class_dashboard_widget_order', JSON.stringify(list));

      handleDragEnd();
      if (isWidgetMoveSoundEnabled) {
        playWidgetSnapSound(widgetSfxMode);
      }
      showToast(
        `🧲 [${getWidgetTitle(sourceId)}] 위젯이 [${getWidgetTitle(parentWidgetId)}] 바로 아래로 완벽하게 도킹되었습니다! (가로 너비 ${parentSpan === 12 ? '전폭(12칸)' : `${parentSpan}칸`} 자동 동기화)`
      );
      return;
    }

    let newOrderList: string[] = [];

    if (targetId === '__bottom_drop_target__') {
      // Moved to the bottom empty space (요구사항 1)
      newOrderList = [...widgetOrder.filter((id) => id !== sourceId), sourceId];
    } else if (sourceId !== targetId) {
      const list = [...widgetOrder];
      const srcIdx = list.indexOf(sourceId);
      if (srcIdx !== -1) list.splice(srcIdx, 1);
      const tgtIdx = list.indexOf(targetId);
      if (tgtIdx !== -1) {
        list.splice(tgtIdx, 0, sourceId);
      } else {
        list.push(sourceId);
      }
      newOrderList = list;
    } else {
      handleDragEnd();
      return;
    }

    handleDragEnd();

    // 사용자가 위젯을 이동시킨 후: 스마트 레이아웃 최적화 수행
    if (autoSmartOptimize && placementMode === 'grid') {
      const optResult = optimizeGridLayout(
        newOrderList,
        widgetSpans,
        hiddenWidgetIds,
        12,
        sourceId,
        screenInfo.optimalColumns,
        screenInfo.recommendedDefaultSpan
      );

      setWidgetOrder(optResult.newOrder);
      setWidgetSpans(optResult.newSpans);
      localStorage.setItem('class_dashboard_widget_order', JSON.stringify(optResult.newOrder));
      localStorage.setItem('class_dashboard_widget_spans', JSON.stringify(optResult.newSpans));

      handleDragEnd();
      if (isWidgetMoveSoundEnabled) {
        playWidgetSnapSound(widgetSfxMode);
      }
      if (optResult.emptySlotsBefore > 0) {
        showToast(
          `✨ 위젯 이동 후 빈 공간 ${optResult.emptySlotsBefore}칸을 계산하여 12분할 그리드에 가장 보기 좋게 자동 정렬했습니다!`
        );
      } else {
        showToast('✨ 위젯이 12분할 그리드에 빈 공간 없이 완벽하게 정렬되었습니다.');
      }
    } else {
      setWidgetOrder(newOrderList);
      localStorage.setItem('class_dashboard_widget_order', JSON.stringify(newOrderList));

      if (isWidgetMoveSoundEnabled) {
        playWidgetSnapSound(widgetSfxMode);
      }

      const analysis = analyzeGridGaps(newOrderList, widgetSpans, hiddenWidgetIds, 12);
      if (analysis.totalEmptySlots > 0) {
        showToast(
          `✨ 위젯 이동 완료 (빈 공간 ${analysis.totalEmptySlots}칸 감지됨). [스마트 최적화]를 눌러 12분할 빈틈을 자동 정렬하세요.`
        );
      } else {
        showToast('✨ 위젯 위치가 자석처럼 깔끔하게 재정렬되었습니다.');
      }
    }
  };

  // Handlers for Seating
  const handleSwapStudents = (id1: number, id2: number) => {
    // 모둠 책상을 자유 배치한 경우 위치도 함께 맞바꿈
    const s1 = students.find((s) => s.id === id1);
    const s2 = students.find((s) => s.id === id2);
    if (s1 && s2) swapDeskPositions(id1, s1.teamId, id2, s2.teamId);
    setStudents((prev) => {
      const idx1 = prev.findIndex((s) => s.id === id1);
      const idx2 = prev.findIndex((s) => s.id === id2);
      if (idx1 === -1 || idx2 === -1) return prev;

      const updated = [...prev];
      const team1 = updated[idx1].teamId;
      const team2 = updated[idx2].teamId;

      const temp = { ...updated[idx1], teamId: team2 };
      updated[idx1] = { ...updated[idx2], teamId: team1 };
      updated[idx2] = temp;

      return updated;
    });
  };

  const handleShuffleStudents = () => {
    setStudents((prev) => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = temp;
      }
      return shuffled.map((s, idx) => ({
        ...s,
        teamId: (idx % teams.length) + 1,
      }));
    });
  };

  // Handlers for points
  // 🏆 보조창에 칭찬 점수 알림 보내기
  const announcePraise = (p: { kind: 'team' | 'student'; name: string; delta: number; total: number; reason?: string; icon?: string; id?: number }) => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel('class_display_sync_channel');
        ch.postMessage({ type: 'PRAISE_EVENT', ...p, at: Date.now() });
        ch.close();
      }
    } catch { }
  };

  // 🖥️ 보조 화면(좌석·모둠)에서 준 포인트를 여기서 반영해요 → 반영 후 PRAISE_EVENT 로 보조 화면에 효과
  const pointCmdRef = useRef<(d: any) => void>(() => {});
  useEffect(() => {
    let ch: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        ch = new BroadcastChannel('class_display_sync_channel');
        ch.onmessage = (ev) => {
          if (ev.data && ev.data.type === 'AWARD_POINT') pointCmdRef.current(ev.data);
        };
      }
    } catch { }
    return () => {
      try {
        ch?.close();
      } catch { }
    };
  }, []);

  // delta: +1 칭찬 / -1 빼기 (0점 아래로는 내려가지 않아요)
  const handleAddTeamPoint = (teamId: number, delta: number = 1, reason?: string, icon?: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;
    const total = Math.max(0, (team.points || 0) + delta);
    if (total === team.points) return;
    setTeams((prev) => prev.map((t) => (t.id === teamId ? { ...t, points: Math.max(0, (t.points || 0) + delta) } : t)));
    announcePraise({ kind: 'team', name: team.name, delta, total, id: teamId, reason, icon });
  };

  const handleAddStudentPoint = (studentId: number, delta: number = 1) => {
    const st = students.find((s) => s.id === studentId);
    if (!st) return;
    const total = Math.max(0, (st.praisePoints || 0) + delta);
    if (total === st.praisePoints) return;
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, praisePoints: Math.max(0, (s.praisePoints || 0) + delta) } : s))
    );
    announcePraise({ kind: 'student', name: st.name, delta, total, id: studentId });
  };

  const handleStudentSelected = (studentId: number) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId ? { ...s, selectedCount: s.selectedCount + 1 } : s
      )
    );
  };

  // Enhanced Attendance Handler with Reason Category & Note (요구사항 11, 14, 사유 메모 누락 방지)
  const handleUpdateStudentAttendance = (
    studentId: number,
    status: AttendanceStatus,
    reasonCategory?: AttendanceReasonCategory,
    reasonNote?: string,
    earlyPeriod?: string,
    longTermRange?: { start: string; end: string }
  ) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? {
            ...s,
            attendance: status,
            status,
            attendanceReasonCategory: reasonCategory ?? s.attendanceReasonCategory,
            reasonCategory: reasonCategory ?? s.reasonCategory ?? s.attendanceReasonCategory,
            attendanceNote: reasonNote !== undefined ? reasonNote : s.attendanceNote,
            attendanceReasonDetail: reasonNote !== undefined ? reasonNote : s.attendanceReasonDetail,
            reasonDetail: reasonNote !== undefined ? reasonNote : (s.reasonDetail ?? s.attendanceNote),
            memo: reasonNote !== undefined ? reasonNote : (s.memo ?? s.attendanceNote),
            earlyPeriod: earlyPeriod !== undefined ? earlyPeriod : s.earlyPeriod,
            longTermRange: longTermRange !== undefined ? longTermRange : s.longTermRange,
          }
          : s
      )
    );
  };

  // Handlers for agendas
  const handleToggleAgenda = (id: string) => {
    setAgendas((prev) =>
      prev.map((a) => (a.id === id ? { ...a, completed: !a.completed } : a))
    );
  };

  const handleAddAgenda = (text: string) => {
    setAgendas((prev) => [
      ...prev,
      { id: Date.now().toString(), text, completed: false },
    ]);
  };

  const handleDeleteAgenda = (id: string) => {
    setAgendas((prev) => prev.filter((a) => a.id !== id));
  };

  // 1인 1역할 스마트 자동 배정 (요구사항 6)
  const handleAutoAssignRoles = (smart: boolean) => {
    const assignedIds = new Set(roles.flatMap((r) => r.currentStudentIds));
    const unassigned = students.filter((s) => !assignedIds.has(s.id));

    // If all students are already assigned, execute a fresh full redistribution
    let targets = unassigned;
    let baseRoles = roles.map((r) => ({
      ...r,
      currentStudentIds: [...r.currentStudentIds],
    }));

    if (unassigned.length === 0) {
      baseRoles = roles.map((r) => ({
        ...r,
        currentStudentIds: [],
      }));
      targets = [...students];
    }

    let candidates = [...targets].sort(() => Math.random() - 0.5);
    let count = 0;

    baseRoles.forEach((role) => {
      const needed = role.maxCount - role.currentStudentIds.length;
      for (let i = 0; i < needed; i++) {
        const foundIdx = candidates.findIndex((s) => {
          const genderOk = role.gender.includes('A') || role.gender.includes(s.gender);
          const historyOk =
            !smart ||
            !s.roleHistory ||
            !s.roleHistory.some((h) => h.role === role.title);
          return genderOk && historyOk;
        });

        if (foundIdx !== -1) {
          const st = candidates.splice(foundIdx, 1)[0];
          role.currentStudentIds.push(st.id);
          count++;
        }
      }
    });

    // If candidates remain due to strict history filter, assign to remaining slots
    if (candidates.length > 0) {
      baseRoles.forEach((role) => {
        const needed = role.maxCount - role.currentStudentIds.length;
        for (let i = 0; i < needed; i++) {
          const foundIdx = candidates.findIndex((s) => {
            return role.gender.includes('A') || role.gender.includes(s.gender);
          });
          if (foundIdx !== -1) {
            const st = candidates.splice(foundIdx, 1)[0];
            role.currentStudentIds.push(st.id);
            count++;
          }
        }
      });
    }

    setRoles(baseRoles);
    setStudents((prev) =>
      prev.map((s) => {
        const foundRole = baseRoles.find((r) => r.currentStudentIds.includes(s.id));
        return { ...s, roleId: foundRole?.id };
      })
    );
    playCelebrateSound();
    showToast(`✨ ${count}명의 학생에게 역할이 ${smart ? '스마트 중복 회피' : '무작위'}로 자동 배정되었습니다.`);
  };

  // Global attention chime (교사 창 안내 토스트 제거, 종 애니메이션 및 보조 모니터 팝업 송출)
  const handleAttentionChime = () => {
    playSelectedChime('school_4tone');
    try {
      localStorage.setItem('class_dashboard_chime_trigger', String(Date.now()));
    } catch { }
  };

  // Open Roles modal with specific tab
  const handleOpenRolesModal = (tab: 'roles' | 'assign' | 'eval' | 'daily' | 'print' | 'settings' = 'assign') => {
    setRolesModalInitialTab(tab);
    setIsRolesModalOpen(true);
  };

  // Open dual monitor popup with specific tab
  const handleOpenDualMonitor = (tab: 'timer' | 'noise' | 'quiz' | 'roles' | 'break' | 'clean' | 'seating' | 'attendance' | 'morning' | 'homework' | 'qr' = 'timer') => {
    setDualMonitorTab(tab);
    setIsDualMonitorOpen(true);
  };

  // 🎂 생일 축하: 열린 보조창(어느 탭이든)에 축하 화면 → 없으면 보조창을 열어서 재생
  const handleCelebrateBirthday = async (kids: { number: number; name: string }[]) => {
    const { sendBirthdayCelebration } = await import('./utils/celebrate');
    const ok = await sendBirthdayCelebration(kids);
    if (!ok) setIsDualMonitorOpen(true);
    showToast(`🎂 보조창에 ${kids.map((k) => k.name).join(', ')} 생일 축하 화면을 띄웠어요!`);
  };

  // Toggle Electronic Board vs General Classroom (요구사항 8)
  const handleToggleBoardType = () => {
    const nextType = config.boardType === 'smart' ? 'general' : 'smart';
    setConfig((prev) => ({ ...prev, boardType: nextType }));
    showToast(
      nextType === 'smart'
        ? '🖥️ [전자칠판 교실 모드]로 전환되었습니다. (대형 터치 타깃 & 등교 터치 최적화)'
        : '🏫 [일반 교실 모드]로 전환되었습니다. (마우스/키보드 친화적 컴팩트 레이아웃)'
    );
  };

  // ⌨️ [키보드 단축키] constants/shortcuts.ts 정의를 기준으로 동작 (안내판과 1:1 일치)
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false);
  const everClassSettingsModal = useEverTrue(isSettingsOpen);
  const everAIAssistantModal = useEverTrue(isAIAssistantOpen);
  const everClassRolesModal = useEverTrue(isRolesModalOpen);
  const everQuizModal = useEverTrue(isQuizModalOpen);
  const everDualMonitorPopupModal = useEverTrue(isDualMonitorOpen);

  // 🚪 대시보드 접기 / 펼치기 (루미 문 포털 · 지니)
  //  - 데스크톱 앱: 큰 창을 숨기고 바탕화면에 작은 루미 문 창을 띄움
  //  - 웹 브라우저: 화면 안에 떠 있는 루미 문 아이콘으로 대체
  const [collapsePhase, setCollapsePhase] = useState<'none' | 'out' | 'mini' | 'in'>('none');
  const [doorPoint, setDoorPoint] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const collapseEffect: 'portal' | 'genie' = config.collapseEffect === 'genie' ? 'genie' : 'portal';
  const miniApi = (window as any).electronAPI?.mini;
  const collapseDashboard = useCallback(() => {
    if (collapsePhase !== 'none') return;
    const pt = { x: window.innerWidth - 70, y: 64 };
    setDoorPoint(pt);
    document.documentElement.style.setProperty('--cl-tx', `${pt.x}px`);
    document.documentElement.style.setProperty('--cl-ty', `${pt.y}px`);
    setCollapsePhase('out');
    // 애니메이션이 실제로 끝나면 미니 아이콘으로 전환 (느린 PC 대비 최대 1.6초 후 강제 전환)
    const root = document.querySelector('.classin-app-root');
    let done = false;
    const finish = async () => {
      if (done) return;
      done = true;
      root?.removeEventListener('animationend', onEnd as any);
      setCollapsePhase('mini');
      if (miniApi?.enter) {
        try {
          await miniApi.enter();
        } catch {}
      }
    };
    const onEnd = (e: AnimationEvent) => {
      if (e.target === root) finish();
    };
    root?.addEventListener('animationend', onEnd as any);
    window.setTimeout(finish, 1600);
  }, [collapsePhase, miniApi]);
  // ✨ 위젯들이 문 쪽에서부터 차례로 떠오르는 효과 (첨부 영상처럼 카드가 하나씩 살아나요)
  const playWidgetCascade = useCallback((origin?: { x: number; y: number } | null, baseDelay = 160) => {
    try {
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      const html = document.documentElement;
      const o = origin || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const els = Array.from(document.querySelectorAll<HTMLElement>('.classin-app-root [data-widget-card-id]'));
      const withDist = els.map((el) => {
        const r = el.getBoundingClientRect();
        return { el, d: Math.hypot(r.left + r.width / 2 - o.x, r.top + r.height / 2 - o.y) };
      });
      withDist.sort((a, b) => a.d - b.d).forEach(({ el }, i) => {
        el.style.setProperty('--cl-i', String(Math.min(i, 16)));
      });
      html.style.setProperty('--cl-base', `${baseDelay}ms`);
      html.classList.remove('cl-cascade');
      void html.offsetWidth; // 다시 재생되도록
      html.classList.add('cl-cascade');
      window.setTimeout(() => html.classList.remove('cl-cascade'), baseDelay + 16 * 55 + 800);
    } catch {}
  }, []);

  const expandDashboard = useCallback((from?: { x: number; y: number } | null) => {
    // 루미 문이 있던 자리에서 대시보드가 펼쳐져 나옴
    if (from && Number.isFinite(from.x) && Number.isFinite(from.y)) {
      const pt = { x: Math.min(window.innerWidth, Math.max(0, from.x)), y: Math.min(window.innerHeight, Math.max(0, from.y)) };
      setDoorPoint(pt);
      document.documentElement.style.setProperty('--cl-tx', `${pt.x}px`);
      document.documentElement.style.setProperty('--cl-ty', `${pt.y}px`);
    }
    setCollapsePhase('in');
    playWidgetCascade(from || null, 260);
    const root = document.querySelector('.classin-app-root');
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setCollapsePhase('none');
    };
    root?.addEventListener('animationend', (e) => e.target === root && finish(), { once: true });
    window.setTimeout(finish, 1500);
  }, [playWidgetCascade]);
  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle('dashboard-collapsing', collapsePhase === 'out' || collapsePhase === 'mini');
    html.classList.toggle('dashboard-collapsed', collapsePhase === 'mini');
  }, [collapsePhase]);
  useEffect(() => miniApi?.onRestored?.((p: { x: number; y: number } | null) => expandDashboard(p)), [miniApi, expandDashboard]);

  // ⚙ 위젯 영역 오른쪽 위 버튼 묶음 (평소에는 접혀 있다가 펼쳐져요)
  const [canvasControlsOpen, setCanvasControlsOpen] = useState(false);
  const [ccLumiTint] = useMochiTint();
  // 설정 메뉴 바깥을 누르면 접어요
  useEffect(() => {
    if (!canvasControlsOpen) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && t.closest('[data-canvas-controls]')) return;
      setCanvasControlsOpen(false);
      setIsSlotMenuOpen(false);
    };
    window.addEventListener('pointerdown', onDown, true);
    return () => window.removeEventListener('pointerdown', onDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasControlsOpen]);

  // 🖼️ 스티커 모드: 위젯을 숨기고 스티커 + 가운데 시계 · 다가오는 일정만 보여요
  //  - 스티커 모드에서는 스티커를 바로 눌러 고칠 수 있어요
  //  - 포커스 · 일반 모드에서는 스티커가 흐릿한 배경처럼 깔려요
  const [stickerEditing, setStickerEditing] = useState(false);
  const [stickerPickNonce, setStickerPickNonce] = useState(0);
  useEffect(() => {
    document.documentElement.classList.toggle('stickers-editing', stickerEditing);
  }, [stickerEditing]);
  useEffect(() => {
    if (!stickerEditing) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === 'Escape' && !(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable))) setStickerEditing(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stickerEditing]);

  // 🎬 시작 인트로 → 잠금화면 (환경설정에서 끌 수 있음)
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    try {
      return localStorage.getItem('class_intro_enabled') !== 'false';
    } catch {
      return true;
    }
  });
  const lockAfterIntro = useCallback(() => {
    setIsScreenLocked(true);
    try {
      localStorage.setItem('ttime_is_locked', 'true');
      localStorage.setItem('class_dashboard_is_screen_locked', 'true');
    } catch {}
  }, []);

  // ⌨️ 빠른 실행 (Ctrl/⌘ + K)
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const buildPaletteCommands = (): PaletteCommand[] => {
    const cmds: PaletteCommand[] = [];
    const emojiOf: Record<string, string> = { lock: '🔒', ideaNote: '💡', timerToggle: '⏱️', settings: '⚙️', aiAssistant: '🤖', modeLesson: '📚', modeBreak: '☕', modeClean: '🧹', modeQuiz: '❓', modeWork: '💼', dualMonitor: '📺', focusMode: '🎯', collapseDashboard: '🚪', fullscreen: '⛶', help: '⌨️' };
    SHORTCUTS.filter((d) => d.action !== 'closeTop' && d.action !== 'commandPalette').forEach((d) => {
      cmds.push({
        id: `sc-${d.action}`, label: d.label, group: d.group === '화면 모드' ? '화면 모드' : '자주 쓰는 기능', emoji: emojiOf[d.action],
        hint: shortcutHint(d.action), run: () => { shortcutHandlersRef.current[d.action]?.(); },
      });
    });
    cmds.push({ id: 'sticker-mode', label: '스티커 모드 켜기/끄기', group: '화면 모드', emoji: '🖼️', keywords: '스티커', run: () => setStickerEditing((v) => !v) });
    cmds.push({ id: 'auto-mode', label: `시정표 따라 화면 자동 전환 ${autoModeOn ? '끄기' : '켜기'}`, group: '화면 모드', emoji: '⏰', keywords: '자동 모드 시간 시정표', run: () => { try { localStorage.setItem('auto_mode_switch_v1', autoModeOn ? 'off' : 'on'); } catch { /* 무시 */ } window.dispatchEvent(new Event('classin:auto-mode-changed')); showToast(autoModeOn ? '⏰ 자동 화면 전환을 껐어요.' : '⏰ 이제 시정표에 맞춰 화면이 저절로 바뀌어요.'); } });
    cmds.push({ id: 'praise', label: '칭찬 순위 열기', group: '자주 쓰는 기능', emoji: '🏆', keywords: '칭찬 랭킹 상장', run: () => setIsRankingOpen(true) });
    cmds.push({ id: 'backup', label: '데이터 백업하기', group: '자주 쓰는 기능', emoji: '💾', keywords: '백업 저장 내보내기', run: () => window.dispatchEvent(new CustomEvent('classin:open-backup')) });
    cmds.push({ id: 'onboarding', label: '처음 시작하기 안내 다시 보기', group: '자주 쓰는 기능', emoji: '🧭', keywords: '설정 안내 시작 도움말', run: () => window.dispatchEvent(new CustomEvent('classin:open-onboarding')) });
    cmds.push({ id: 'semester', label: '새 학기 준비 / 학기말 정리', group: '자주 쓰는 기능', emoji: '🌱', keywords: '학기 초기화 정리 마법사', run: () => window.dispatchEvent(new CustomEvent('classin:open-semester-wizard')) });
    // 위젯 켜기/끄기
    defaultWidgetOrder.forEach((wid) => {
      const on = !hiddenWidgetIds.includes(wid);
      cmds.push({ id: `w-${wid}`, label: `${getWidgetTitle(wid)} ${on ? '끄기' : '켜기'}`, group: '위젯', emoji: on ? '🟢' : '⚪', keywords: `위젯 ${wid}`, run: () => handleToggleWidget(wid) });
    });
    // 바로가기 사이트
    try {
      const bms = JSON.parse(localStorage.getItem('smart_classroom_bookmarks_v2') || '[]');
      if (Array.isArray(bms)) bms.forEach((b: any) => {
        if (!b || !b.url || !b.title) return;
        cmds.push({
          id: `bm-${b.id || b.title}`, label: b.title, group: '바로가기', emoji: b.type === 'app' ? '💻' : '🔗', hint: b.type === 'app' ? '프로그램 실행' : String(b.url).replace(/^https?:\/\//, ''),
          keywords: '바로가기 사이트',
          run: () => {
            const api = (window as any).electronAPI;
            if (b.type === 'app') { api?.launchApp ? api.launchApp(b.url) : showToast('💻 프로그램 실행은 데스크톱 앱에서만 돼요.'); return; }
            if (b.openMode === 'popup' && api?.openPopupWindow) { api.openPopupWindow(b.url, b.title); return; }
            if (api?.openExternal) { api.openExternal(b.url); return; }
            window.open(b.url, '_blank', 'noopener,noreferrer');
          },
        });
      });
    } catch { /* 무시 */ }
    // 독 기능 (독에 없는 것도 실행)
    DOCK_ITEMS.forEach((it) => cmds.push({
      id: `dock-${it.key}`, label: it.label, group: '독 기능', emoji: it.emoji, keywords: '독',
      run: () => { (document.querySelector(`.cl-dock [data-dock-key="${it.key}"]`) as HTMLElement | null)?.click(); },
    }));
    return cmds;
  };

  const lockScreenNow = useCallback(() => {
    setIsScreenLocked(true);
    try {
      localStorage.setItem('ttime_is_locked', 'true');
      localStorage.setItem('class_dashboard_is_screen_locked', 'true');
    } catch {}
    showToast('🔒 화면이 잠겼습니다. (해제: PIN 입력)');
  }, [showToast]);

  // 최신 상태를 참조하는 핸들러 묶음 (리스너는 1회만 등록)
  const shortcutHandlersRef = useRef<Record<string, () => boolean | void>>({});
  shortcutHandlersRef.current = {
    help: () => setIsShortcutHelpOpen((v) => !v),
    commandPalette: () => setIsPaletteOpen((v) => !v),
    settings: () => setIsSettingsOpen(true),
    lock: () => lockScreenNow(),
    ideaNote: () => {
      setEditingIdeaItem(null);
      setIsIdeaRecordModalOpen(true);
    },
    aiAssistant: () => {
      window.dispatchEvent(new CustomEvent(LUMI_TOGGLE_EVENT));
    },
    dualMonitor: () => handleOpenDualMonitor('timer'),
    focusMode: () => handleToggleFocusMode(),
    collapseDashboard: () => (collapsePhase === 'mini' ? expandDashboard(null) : collapseDashboard()),
    modeLesson: () => handleModeChange('lesson'),
    modeBreak: () => handleModeChange('break'),
    modeClean: () => handleModeChange('clean'),
    modeQuiz: () => handleModeChange('quiz'),
    modeWork: () => handleModeChange('work'),
    timerToggle: () => {
      const evt = new CustomEvent(TIMER_TOGGLE_EVENT, { cancelable: true });
      window.dispatchEvent(evt);
      if (!evt.defaultPrevented) showToast('⏱️ 화면에 타이머 위젯이 없어요. 위젯바에서 뽀모도로 타이머를 꺼내 주세요.');
    },
    // Esc: 가장 위에 열린 창부터 하나씩 닫기 (닫은 창이 없으면 false)
    closeTop: () => {
      const closers: Array<[boolean, () => void]> = [
        [isPaletteOpen, () => setIsPaletteOpen(false)],
        [isShortcutHelpOpen, () => setIsShortcutHelpOpen(false)],
        [isIdeaRecordModalOpen, () => setIsIdeaRecordModalOpen(false)],
        [isIdeaSettingsModalOpen, () => setIsIdeaSettingsModalOpen(false)],
        [isMemoEditModalOpen, () => setIsMemoEditModalOpen(false)],
        [isMessengerModalOpen, () => setIsMessengerModalOpen(false)],
        [isAIAssistantOpen, () => setIsAIAssistantOpen(false)],
        [isQuizModalOpen, () => setIsQuizModalOpen(false)],
        [isRolesModalOpen, () => setIsRolesModalOpen(false)],
        [isRankingOpen, () => setIsRankingOpen(false)],
        [isObservationOpen, () => setIsObservationOpen(false)],
        [isDualMonitorOpen, () => setIsDualMonitorOpen(false)],
        [isSettingsOpen, () => setIsSettingsOpen(false)],
      ];
      const target = closers.find(([open]) => open);
      if (!target) return false;
      target[1]();
      return true;
    },
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing || e.repeat) return; // 한글 조합 중·키 누르고 있는 중 무시
      const def = matchShortcut(e);
      if (!def || def.action === 'fullscreen') return; // F11 은 앱/브라우저 기본 동작 사용

      // 🔒 화면 잠금 중에는 모든 단축키 차단 (PIN 입력 보호)
      if (isScreenLockedRef.current) return;

      const target = e.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
      if (isTyping && !def.worksWhileTyping) return;
      // Space 는 버튼에 포커스가 있을 때 버튼 클릭 기본 동작을 존중
      if (def.action === 'timerToggle' && target?.closest('button, [role="button"], a')) return;

      const handler = shortcutHandlersRef.current[def.action];
      if (!handler) return;
      const result = handler();
      // Esc 는 닫을 창이 있을 때만 기본 동작을 막아 각 모달 자체 Esc 처리와 충돌하지 않게 함
      if (def.action === 'closeTop' && result === false) return;
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 개인 칭찬 항목 맞춤 부여 핸들러 (첨부 이미지 3, 요구사항 10)
  const handleAwardPraise = (studentId: number, item: PraiseItemConfig) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;
    const newPoints = (student.praisePoints || 0) + item.points;
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, praisePoints: newPoints } : s))
    );
    announcePraise({ kind: 'student', name: student.name, delta: item.points, total: newPoints, reason: item.label, icon: item.icon, id: studentId });
    const now = new Date();
    const newLog: PraiseHistoryLog = {
      id: `praise_log_${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      date: now.toISOString().split('T')[0],
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      itemLabel: item.label,
      points: item.points,
    };
    setPraiseHistoryLogs((prev) => {
      const updated = [newLog, ...prev];
      try {
        localStorage.setItem('class_dashboard_praise_logs', JSON.stringify(updated));
      } catch { }
      return updated;
    });
  };

  // 🖥️ 보조 화면 포인트 명령 처리 (항상 최신 함수로)
  pointCmdRef.current = (d: any) => {
    const delta = Number(d.delta) || 0;
    if (d.kind === 'team' && typeof d.teamId === 'number') {
      handleAddTeamPoint(d.teamId, delta || 1, d.reason ? String(d.reason) : undefined, d.icon ? String(d.icon) : undefined);
      return;
    }
    if (d.kind === 'student' && typeof d.studentId === 'number') {
      const list: PraiseItemConfig[] = (config as any)?.praiseConfigs?.length ? (config as any).praiseConfigs : initialPraiseConfigs;
      const item = d.itemId ? list.find((x) => String(x.id) === String(d.itemId)) : null;
      if (item && delta > 0) handleAwardPraise(d.studentId, item);
      else handleAddStudentPoint(d.studentId, delta || 1);
    }
  };
  // 보조 화면이 같은 칭찬 항목을 보여 줄 수 있게 공유
  useEffect(() => {
    try {
      const list = (config as any)?.praiseConfigs?.length ? (config as any).praiseConfigs : initialPraiseConfigs;
      localStorage.setItem('class_praise_items_cache', JSON.stringify(list));
    } catch { }
  }, [(config as any)?.praiseConfigs]); // eslint-disable-line react-hooks/exhaustive-deps

  // Theme Styles mapping (4대 시그니처 테마 및 다크 시네마 모드 고정)
  const getThemeClass = (theme?: DashboardTheme) => {
    const activeTheme = theme || 'glass-aurora';
    const themeConfig = THEME_CONFIGS[activeTheme];

    // 1. 다크 모드가 활성화된 경우: 색상 테마와 무관하게 전용 시네마 다크(#0a0f1d) 단일 톤 100% 영구 고정
    if (isDarkMode) {
      return 'dark bg-[#0a0f1d] text-slate-100';
    }

    // 2. 라이트 모드: THEME_CONFIGS의 고유 배경 클래스 적용
    if (themeConfig?.bodyClass) {
      return themeConfig.bodyClass;
    }
    return 'bg-[#f2f5fa] text-slate-900';
  };

  const renderWidgetContent = (widgetId: string) => {
    switch (widgetId) {
      case 'clock':
        return (
          <ClockWidget
            onCollapseToStack={() => {
              console.log('🔵 [App] 뽀모도로 타이머 -> 좌측 스택 영역(유튜브 상단)으로 이동');
              handleToggleWidgetCollapse('clock');
              showToast('🍅 뽀모도로 타이머가 좌측 스택 영역(유튜브 플레이어 상단)으로 이동되었습니다.');
            }}
            onSwapWithQuote={handleSwapClockAndQuote}
            onShowToast={showToast}
          />
        );
      case 'timer':
        // 💡 [사용자 요구사항]: 위젯 영역의 타이머 위젯은 삭제하고 보조화면(듀얼 모니터, 플로팅 허브, 독)의 타이머 기능은 그대로 유지
        return null;
      case 'homework':
        return <HomeworkCheckWidget students={students} onShowToast={showToast} onOpenDisplay={() => handleOpenDualMonitor('homework')} />;
      case 'seqtimer':
        return (
          <SequenceTimer
            variant="widget"
            onOpenDisplay={() => {
              try {
                localStorage.setItem('dm_timer_kind', 'seq');
              } catch {
                /* 무시 */
              }
              handleOpenDualMonitor('timer');
            }}
          />
        );
      case 'noise':
        return (
          <NoiseMonitorWidget
            onShowToast={showToast}
            onOpenStudentDisplay={() => handleOpenDualMonitor('noise')}
          />
        );
      case 'picker':
        return (
          <PickerWidget
            students={students}
            onSelectStudent={handleStudentSelected}
            onShowToast={showToast}
          />
        );
      case 'seating':
        return (
          <SeatingWidget
            students={students}
            teams={teams}
            praiseConfigs={config.praiseConfigs || initialPraiseConfigs}
            onAwardPraise={handleAwardPraise}
            onUpdateTeams={setTeams}
            onUpdateStudents={setStudents}
            onSwapStudents={handleSwapStudents}
            onShuffleStudents={handleShuffleStudents}
            onAddTeamPoint={handleAddTeamPoint}
            onAddStudentPoint={handleAddStudentPoint}
            onOpenRankingModal={() => setIsRankingOpen(true)}
            onShowToast={showToast}
            onOpenDualMonitor={() => handleOpenDualMonitor('seating')}
          />
        );
      case 'attendance':
        return (
          <AttendanceWidget
            students={students}
            onUpdateStudentAttendance={handleUpdateStudentAttendance}
            onShowToast={showToast}
            googleSheetUrl={config.attendanceGoogleSheetUrl || ''}
            autoBackupTime={config.attendanceAutoBackupTime || '16:00'}
            onOpenDualMonitor={() => handleOpenDualMonitor('attendance')}
            onResetAttendance={handleResetAttendance}
          />
        );
      case 'roles':
        return (
          <ClassRolesWidget
            roles={roles}
            onUpdateRoles={setRoles}
            students={students}
            periodInfo={periodInfo}
            onOpenRolesModal={handleOpenRolesModal}
            onAutoAssign={handleAutoAssignRoles}
            onOpenStudentDisplay={() => handleOpenDualMonitor('roles')}
            onShowToast={showToast}
          />
        );
      case 'calendar':
        return <ClassCalendarWidget onShowToast={showToast} googleCalendarUrl={config.googleCalendarUrl} />;
      case 'agenda':
        return (
          <AgendaWidget
            agendas={agendas}
            onToggleAgenda={handleToggleAgenda}
            onAddAgenda={handleAddAgenda}
            onDeleteAgenda={handleDeleteAgenda}
            onShowToast={showToast}
            students={students}
            onCelebrateBirthday={handleCelebrateBirthday}
          />
        );
      case 'timetable':
        return <TimetableWidget schedule={schedule} config={config} onShowToast={showToast} />;
      case 'meal':
        return <SchoolMealWidget schoolName={config.schoolName || '초등학교'} onShowToast={showToast} />;
      case 'dday':
        return <DDayWidget onShowToast={showToast} />;
      case 'observation':
        return (
          <ObservationWidget
            students={students}
            records={observationWidgetRecords}
            config={config}
            onAddRecord={(newRecordData) => {
              const fullRecord: ObservationWidgetRecord = {
                ...newRecordData,
                id: `obs_${Date.now()}`,
                createdAt: new Date().toISOString(),
              };
              setObservationWidgetRecords((prev) => {
                const updated = [fullRecord, ...prev];
                try {
                  localStorage.setItem('class_dashboard_observation_records', JSON.stringify(updated));
                } catch { }
                return updated;
              });
              showToast(`📝 [${newRecordData.studentName}] 관찰기록이 저장되었습니다.`);
            }}
            onDeleteRecord={(recordId) => {
              setObservationWidgetRecords((prev) => {
                const updated = prev.filter((r) => r.id !== recordId);
                try {
                  localStorage.setItem('class_dashboard_observation_records', JSON.stringify(updated));
                } catch { }
                return updated;
              });
              showToast('🗑️ 관찰기록이 삭제되었습니다.');
            }}
            onShowToast={showToast}
          />
        );
      case 'schoolInfo':
        return <SchoolInfoWidget onShowToast={showToast} />;
      case 'quote':
        return (
          <TeacherQuoteWidget
            onCollapseToStack={() => {
              console.log('🔵 [App] 독서 노트 -> 좌측 스택 영역(유튜브 상단 슬롯)으로 이동');
              setActiveStackTab('quote');
              handleToggleWidgetCollapse('quote');
              showToast('📖 독서 노트가 좌측 스택 영역(유튜브 상단 슬롯)으로 이동되었습니다.');
            }}
            onShowToast={showToast}
            onSwapWithTimer={handleSwapClockAndQuote}
          />
        );
      case 'youtube':
        return (
          <YouTubePlayerWidget
            videoId={youtubeVideoId || undefined}
            videoTitle={youtubeVideoTitle}
            isPlaying={isYoutubePlaying && !isScreenLocked}
            isMuted={isYoutubeMuted}
            isLocked={isScreenLocked}
            toastMessage={isYoutubeToast ? toast : undefined}
            onTogglePlay={handleToggleYoutubePlay}
            onToggleMute={handleToggleYoutubeMute}
            onPlayNext={handlePlayNextVideo}
            onSelectVideo={(newId, newTitle) => {
              setYoutubeVideoId(newId);
              setYoutubeVideoTitle(newTitle);
              setIsYoutubePlaying(true);
              try {
                localStorage.setItem(
                  'class_dashboard_youtube_last_played',
                  JSON.stringify({ videoId: newId, title: newTitle, playedAt: Date.now() })
                );
              } catch {}
              showToast(`▶️ [${newTitle}] 영상을 재생합니다.`);
            }}
            onCollapse={() => {
              handleToggleWidgetCollapse('youtube');
              showToast('📺 유튜브 플레이어가 스택 보관함으로 접혔습니다.');
            }}
            onClose={() => {
              handleCloseWidget('youtube');
              showToast('📺 배경음악 플레이어가 닫혔습니다.');
            }}
            onShowToast={showToast}
          />
        );
      case 'bookmarks':
        // 💡 [사용자 요구사항]: 위젯 영역의 바로가기 위젯은 삭제하고 상단 헤더바 하단 툴바로 완전 통합
        return null;
      case 'ideanote':
        return (
          <IdeaNoteWidget
            ideas={ideaNotes}
            settings={ideaSettings}
            onOpenRecordModal={(item) => {
              setEditingIdeaItem(item || null);
              setIsIdeaRecordModalOpen(true);
            }}
            onOpenSettingsModal={() => setIsIdeaSettingsModalOpen(true)}
            onUpdateIdeas={handleUpdateIdeaNotes}
            onUpdateSettings={handleSaveIdeaSettings}
            onShowToast={showToast}
          />
        );
      case 'subject-timetable':
        return <SubjectTimetableWidget config={config} onShowToast={showToast} />;
      case 'subject-roster':
        return <SubjectRosterWidget config={config} onShowToast={showToast} />;
      case 'subject-journal':
        return <SubjectJournalWidget config={config} onShowToast={showToast} />;
      default: {
        // 동적 다중 메모/포스트잇 위젯 렌더링
        const matchedPostIt = postItWidgets.find((p) => p.id === widgetId);
        if (matchedPostIt || widgetId.startsWith('postit-') || widgetId.startsWith('memo-')) {
          const targetMemo = matchedPostIt || postItWidgets.find((p) => p.id === widgetId);
          if (!targetMemo) return null;
          return (
            <PostItWidget
              data={targetMemo}
              onColorChange={(color) => handleUpdatePostIt(widgetId, { color })}
              onTitleChange={(title) => handleUpdatePostIt(widgetId, { title })}
              onContentChange={(content) => handleUpdatePostIt(widgetId, { content })}
              onFontSizeChange={(fontSize) => handleUpdatePostIt(widgetId, { fontSize })}
              onDelete={() => handleDeletePostIt(widgetId)}
              onAddAnother={() => handleAddPostIt(targetMemo.color)}
            />
          );
        }
        return null;
      }
    }
  };

  const renderWidget = (widgetId: string) => {
    // 🛑 [빈 위젯 및 보관 위젯 중복 렌더링 원천 차단]:
    // 메인 캔버스 활성 조건(숨김, 보관스택, 타이머/바로가기 영구제거, 사이드바 유튜브, 미존재 포스트잇 등) 불충족 시 즉시 null 반환!
    if (!widgetId || !isWidgetActiveOnCanvas(widgetId)) return null;
    const content = renderWidgetContent(widgetId);
    if (!content) return null; // [내용 없는 빈 위젯 카드 생성 원천 차단!]

    const isOver = dragOverWidgetId === widgetId;
    const feedback = isOver ? (draggedWidgetId === widgetId ? 'invalid' : 'valid') : null;
    const dualMonitorTarget =

      widgetId === 'timer' || widgetId === 'seqtimer'

        ? 'timer'

        : widgetId === 'noise'

          ? 'noise'

          : widgetId === 'roles'

            ? 'roles'

            : undefined;



    const isPinned = pinnedWidgetIds.includes(widgetId);



    return (

      <ResizableWidgetCard

        key={widgetId}

        id={widgetId}

        title={getWidgetTitle(widgetId)}

        span={widgetSpans[widgetId] || (widgetId.startsWith('postit-') || widgetId.startsWith('memo-') || postItWidgets.some((p) => p.id === widgetId) ? 4 : 3)}

        onSpanChange={(newSpan) => handleWidgetSpanChange(widgetId, newSpan)}

        theme={config.theme}

        isSmartBoard={config.boardType === 'smart'}

        onOpenDualMonitor={dualMonitorTarget ? () => handleOpenDualMonitor(dualMonitorTarget as any) : undefined}

        isDraggable={true}

        onDragStart={handleDragStart}

        onDragOver={handleDragOver}

        onDrop={handleDrop}

        onDragEnd={handleDragEnd}

        isDragOver={isOver}

        dropFeedback={feedback}

        onClose={() => handleCloseWidget(widgetId)}

        isDragActive={!!draggedWidgetId}

        draggedWidgetId={draggedWidgetId}

        onDockOver={(dockId) => setDockOverTargetId(dockId)}

        onDockLeave={() => setDockOverTargetId(null)}

        isDockOver={dockOverTargetId === `dock-bottom-${widgetId}`}

        isCollapsedControlled={collapsedWidgetIds.includes(widgetId)}

        onToggleCollapse={handleToggleWidgetCollapse}

        isStackMode={config.stageManagerMode ?? false}

        onStackCollapse={handleToggleWidgetCollapse}

        isPinned={isPinned}

        onTogglePin={() => handleTogglePinWidget(widgetId)}

        pinColor={getWidgetPinColor(widgetId)}

        opacity={config.widgetOpacity}

        widgetTextContrast={config.widgetTextContrast}

        widgetTextShadow={config.widgetTextShadow}

        widgetCardSolidBg={config.widgetCardSolidBg}

        widgetHeaderColorMode={config.widgetHeaderColorMode}

        customWidgetHeaderColor={config.customWidgetHeaderColor}

        dashboardBorderRadius={config.dashboardBorderRadius}

        onGlobalOpacityChange={(newOpacity) => {

          updateConfig({ widgetOpacity: newOpacity });

          showToast(`✨ 모든 위젯의 투명도가 ${Math.round(newOpacity * 100)}%로 일괄 적용되었습니다.`);

        }}

        onFreeResize={(newW, newH) => handleFreeResizeWidget(widgetId, newW, newH)}

        freeHeight={placementMode === 'freeform' && !collapsedWidgetIds.includes(widgetId) ? freeWidgetPositions[widgetId]?.height : undefined}

        isFreeMode={placementMode === 'freeform'}

        youtubeFoldBehavior={youtubeFoldBehavior}

        onYoutubeFoldBehaviorChange={setYoutubeFoldBehavior}

      >

        {renderWidgetContent(widgetId)}

      </ResizableWidgetCard>

    );

  };



  /**

   * 🗂️ 위젯 보관 스택 내부 UI 렌더링 헬퍼 (독립 사이드바 및 통합 사이드바에서 공용 사용)

   */

  const renderWidgetStackPanelContent = (isCombined = false) => {

    // 유튜브가 접혀 있고 미니 플레이어 모드이며 활성 비디오가 있을 때

    const isYoutubeInMiniPlayer =

      collapsedWidgetIds.includes('youtube') &&

      youtubeFoldBehavior === 'mini' &&

      !!youtubeVideoId;



    // 미니 플레이어로 재생 중인 유튜브는 하단 목록에서 중복 표시 방지

    const collapsedList = collapsedWidgetIds

      .filter((id) => !hiddenWidgetIds.includes(id))

      .filter((id) => (isYoutubeInMiniPlayer ? id !== 'youtube' : true));



    const totalCount = collapsedList.length + (isYoutubeInMiniPlayer ? 1 : 0);



    return (

      <div className="flex flex-col h-full overflow-hidden gap-2">

        <div className="flex items-center justify-between pb-2 border-b border-white/40 dark:border-slate-800 shrink-0">

          <div className="flex items-center gap-2">

            <span className="text-base">🗂️</span>

            <h3 className="font-extrabold text-xs text-slate-800 dark:text-slate-100">위젯 보관 스택</h3>

            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">

              {totalCount}개 접힘

            </span>

          </div>

          {totalCount > 0 && (

            <button

              type="button"

              onClick={handleExpandAllCollapsedWidgets}

              className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs active:scale-95 transition flex items-center gap-1 cursor-pointer"

              title="보관된 모든 위젯을 캔버스 최하단으로 순차 복귀"

            >

              <span>전체 펼치기</span>

              <span>↗</span>

            </button>

          )}

        </div>



        {/* 접힌 위젯 카드 목록 (자연스럽게 아래로 밀림 & 좌측 패널 하단 끝까지 시원하게 확장) */}

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-0">

          {collapsedList.length === 0 ? (

            <div

              className={`flex flex-col items-center justify-center text-center p-3 rounded-2xl border-2 border-dashed border-slate-300/60 dark:border-slate-700/60 text-slate-400 ${isCombined ? 'h-24' : 'h-40'

                }`}

            >

              <span className="text-2xl mb-1 opacity-70">📦</span>

              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">보관된 위젯이 없습니다</p>

              <p className="text-[11px] text-slate-400 mt-1">스택모드에서 상단 바 더블클릭 시 보관됩니다.</p>

            </div>

          ) : (

            collapsedList.map((id) => {

              // 🚨 [유튜브 위젯 치명적 오디오 중복 버그 원천 차단]:

              // 스택 내부에서는 실제 재생용 iframe을 절대 렌더링하지 않고 정적 썸네일+제목+보관 배지의 경량 카드로 렌더링

              if (id === 'youtube') {

                return (

                  <div

                    key={id}

                    onClick={() => {

                      handleExpandWidgetFromStage('youtube');

                      showToast('📺 유튜브 영상이 메인 화면으로 다시 펼쳐졌습니다.');

                    }}
                    className="p-2.5 rounded-2xl bg-white/75 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-red-200 dark:border-red-900/60 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col gap-2 group select-none"
                    title="클릭 시 메인 캔버스 16:9 고화질 화면으로 복귀"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-base shrink-0">▶️</span>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                          {youtubeVideoTitle || '유튜브 플레이어'}
                        </span>
                      </div>
                      <span className="text-[10px] font-extrabold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/80 px-2 py-0.5 rounded-lg shrink-0 group-hover:scale-105 transition flex items-center gap-0.5">
                        <span>보관됨</span>
                        <span>↗</span>
                      </span>
                    </div>

                    {/* 정적 썸네일 이미지 및 복귀 오버레이 (iframe 미사용) */}
                    {youtubeVideoId && (
                      <div className="w-full aspect-video rounded-xl overflow-hidden bg-slate-900 relative shadow-inner">
                        <img
                          src={`https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`}
                          alt={youtubeVideoTitle || '유튜브 썸네일'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${youtubeVideoId}/0.jpg`;
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <span className="px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-xs text-white text-[11px] font-bold shadow-md flex items-center gap-1 opacity-90 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all">
                            <span>메인 화면으로 복귀</span>
                            <span>↗</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // 일반 위젯 카드
              return (
                <div
                  key={id}
                  onClick={() => handleExpandWidgetFromStage(id)}
                  className="p-2.5 rounded-2xl bg-white/60 dark:bg-slate-800/60 hover:bg-white/90 dark:hover:bg-slate-800 border border-white/60 dark:border-slate-700 shadow-xs hover:shadow-md transition cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">{getWidgetIcon(id)}</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {getWidgetTitle(id)}
                    </span>
                  </div>
                  <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-lg shrink-0 group-hover:scale-105 transition">
                    펼치기 ↗
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  /**
   * 📝 리치 텍스트 종합 메모 저장 핸들러
   */
  const handleSaveMemoItem = (memo: MemoItem) => {
    setPostItWidgets((prev) => {
      const exists = prev.some((p) => p.id === memo.id);
      let next: PostItWidgetData[];
      if (exists) {
        next = prev.map((p) =>
          p.id === memo.id
            ? ({
                ...p,
                ...memo,
                content: memo.content,
                title: memo.title,
                updatedAt: Date.now(),
              } as any)
            : p
        );
      } else {
        const newPostIt: any = {
          color: 'yellow',
          ...memo,
          updatedAt: Date.now(),
        };
        next = [newPostIt, ...prev];
      }
      try {
        localStorage.setItem('class_dashboard_postits', JSON.stringify(next));
      } catch {}
      return next;
    });
    showToast('📝 메모가 안전하게 저장되었습니다.');
  };

  /**
   * 📝 판서 & 메모 스택 내부 UI 렌더링 헬퍼 (독립 사이드바 및 통합 사이드바에서 공용 사용)
   */
  const renderMemoStackPanelContent = (isCombined = false) => {
    const memoItems: MemoItem[] = postItWidgets.map((p) => ({
      id: p.id,
      title: p.title || '메모',
      content: p.content || '',
      bgColor:
        (p as any).bgColor ||
        (p.color === 'yellow'
          ? '#FEF9C3'
          : p.color === 'green'
          ? '#DCFCE7'
          : p.color === 'sky'
          ? '#E0E7FF'
          : p.color === 'pink'
          ? '#FFE4E6'
          : p.color === 'orange'
          ? '#FFEDD5'
          : '#FFFFFF'),
      textColor: (p as any).textColor || '#1E293B',
      fontSize: (p.fontSize as any) || 'base',
      priority: (p as any).priority || 'normal',
      dueDate: (p as any).dueDate,
      assignee: (p as any).assignee,
      isCompleted: (p as any).isCompleted || false,
      createdAt: String(p.createdAt || new Date().toISOString().split('T')[0]),
      updatedAt: String(p.updatedAt || new Date().toISOString().split('T')[0]),
    }));

    return (
      <MemoWidget
        memos={memoItems}
        onAddMemo={() => {
          setEditingMemo(null);
          setIsMemoEditModalOpen(true);
        }}
        onEditMemo={(memo) => {
          setEditingMemo(memo);
          setIsMemoEditModalOpen(true);
        }}
        onDeleteMemo={(id) => handleDeletePostIt(id)}
        onToggleComplete={(id) => {
          setPostItWidgets((prev) => {
            const next = prev.map((item) =>
              item.id === id ? ({ ...item, isCompleted: !(item as any).isCompleted } as any) : item
            );
            try {
              localStorage.setItem('class_dashboard_postits', JSON.stringify(next));
            } catch {}
            return next;
          });
        }}
        onRestoreToCanvas={(id, title) => handleRestoreMemoToCanvas(id, title)}
        onShowToast={showToast}
      />
    );
  };

  /**
   * 📑 단일 통합 사이드바 (좌/우 집중 모드용 판서 & 메모 전용 확장 패널)
   * LEFT_ONLY(우측 배치) 및 RIGHT_ONLY(좌측 배치) 시 사용:
   * 하단 위젯 보관함 아코디언을 완전히 제거하고, 메모 카드가 시원하게 노출되도록 전체 높이 확장
   */
  const renderCombinedStackPanel = () => {
    const stackAlpha = Math.min(1, Math.max(0.2, config.dashboardBgOpacity ?? 0.95));
    return (
      <aside data-sidebar-widget
        style={{
          backgroundColor: isDarkMode
            ? `rgba(16, 26, 45, ${stackAlpha})`
            : `rgba(238, 242, 248, ${stackAlpha})`,
          borderColor: isDarkMode
            ? '#1e2c44'
            : 'rgba(203, 213, 225, 0.85)',
        }}
        className="hidden md:flex flex-col w-64 xl:w-72 h-full overflow-hidden rounded-[28px] backdrop-blur-2xl border border-slate-200/80 dark:border-[#1e2c44] shadow-xl shadow-black/5 p-3 shrink-0 transition-all duration-300 ease-in-out"
      >
        {renderMemoStackPanelContent(false)}
      </aside>
    );
  };

  /**
   * 🍅📖 [유튜브 플레이어 상단 전용 듀얼 스택 슬롯]
   * 뽀모도로 타이머와 독서 노트가 스택에 있을 때 상단에 표시
   * 둘 다 스택에 있을 때: 상단 스위치 탭([🍅 뽀모도로] [📖 독서 노트])으로 자유롭게 전환
   * 각 위젯에서 [⤢ 메인으로 복원] 또는 헤더 더블클릭 시 메인 캔버스로 즉시 복원
   */
  /**
   * 📅📋🚩⏱️📖📞👥 [유튜브 플레이어 상단 전용 7단 스택 슬롯]
   * 기본 뷰: 프로그램 전체 테마와 어우러지는 글래스모피즘 미니 캘린더
   * 스위치 순서: [캘린더] ➔ [시간표] ➔ [D-day] ➔ [뽀모도로] ➔ [독서노트] ➔ [학교 정보] ➔ [출결 관리]
   * 텍스트 라벨 없이 모던한 리니어 단독 아이콘으로만 구성
   */
  // ↕️ 왼쪽 스택 3칸(탭 위젯 · 유튜브 · 보관함) 순서를 끌어서 바꾸기
  type StackSlotId = 'tabs' | 'youtube' | 'storage';
  const [stackOrder, setStackOrder] = useState<StackSlotId[]>(() => {
    try {
      const v = JSON.parse(localStorage.getItem('left_stack_order') || 'null');
      if (Array.isArray(v) && v.length === 3 && ['tabs', 'youtube', 'storage'].every((x) => v.includes(x))) return v;
    } catch {}
    return ['tabs', 'youtube', 'storage'];
  });
  const [stackDragId, setStackDragId] = useState<StackSlotId | null>(null);
  const [stackOverId, setStackOverId] = useState<StackSlotId | null>(null);
  const moveStackSlot = (from: StackSlotId, to: StackSlotId) => {
    if (from === to) return;
    setStackOrder((prev) => {
      const next = prev.filter((x) => x !== from);
      next.splice(next.indexOf(to) + (prev.indexOf(from) < prev.indexOf(to) ? 1 : 0), 0, from);
      try {
        localStorage.setItem('left_stack_order', JSON.stringify(next));
      } catch {}
      return next;
    });
  };
  const stackSlotProps = (id: StackSlotId) => ({
    'data-stack-slot': id,
    onDragOver: (e: React.DragEvent) => {
      if (!stackDragId) return;
      e.preventDefault();
      if (stackOverId !== id) setStackOverId(id);
    },
    onDrop: (e: React.DragEvent) => {
      if (!stackDragId) return;
      e.preventDefault();
      moveStackSlot(stackDragId, id);
      setStackDragId(null);
      setStackOverId(null);
    },
  });
  const stackGrip = (id: StackSlotId, label: string) => (
    <span
      className="stack-grip"
      draggable
      title={`끌어서 '${label}' 칸의 순서를 바꿔요`}
      onDragStart={(e) => {
        setStackDragId(id);
        e.dataTransfer.effectAllowed = 'move';
        try {
          e.dataTransfer.setData('text/plain', id);
        } catch {}
      }}
      onDragEnd={() => {
        setStackDragId(null);
        setStackOverId(null);
      }}
      data-stack-grip={id}
    >
      <i />
    </span>
  );
  const slotClass = (id: StackSlotId) => `stack-slot ${stackDragId === id ? 'is-dragging' : ''} ${stackOverId === id && stackDragId && stackDragId !== id ? 'is-over' : ''}`;

  // 📏 왼쪽 탭 위젯 높이 = 시간표 탭 높이 (모든 탭 같은 크기)
  const [stackTabH, setStackTabH] = useState<number | null>(() => {
    try {
      const v = Number(localStorage.getItem('class_dashboard_stack_tab_h'));
      return v > 120 ? v : null;
    } catch {
      return null;
    }
  });
  const stackTabRO = useRef<ResizeObserver | null>(null);
  const stackTabMeasureRef = useCallback((el: HTMLDivElement | null) => {
    stackTabRO.current?.disconnect();
    if (!el) return;
    // 시간표 탭이 열려 있으면 실제 시간표(형제 요소)를, 아니면 숨은 사본을 재요
    const target = (el.classList.contains('h-0') ? (el.nextElementSibling as HTMLElement | null) : (el.firstElementChild as HTMLElement | null)) || el;
    const measure = () => {
      const h = Math.round(target.getBoundingClientRect().height / (parseFloat(getComputedStyle(document.querySelector('.classin-app-root') || document.body).zoom || '1') || 1));
      if (h > 120) {
        setStackTabH((prev) => (prev === h ? prev : h));
        try { localStorage.setItem('class_dashboard_stack_tab_h', String(h)); } catch { /* 무시 */ }
      }
    };
    const ro = new ResizeObserver(measure);
    ro.observe(target);
    stackTabRO.current = ro;
    requestAnimationFrame(measure);
  }, []);

  const renderTopDualStackSlot = () => {
    const isClockInStack = collapsedWidgetIds.includes('clock');
    const isQuoteInStack = collapsedWidgetIds.includes('quote');

    // 현재 선택된 탭: 'calendar' | 'meal' | 'timetable' | 'dday' | 'clock' | 'quote' | 'schoolInfo' | 'attendance'
    const currentTab: 'calendar' | 'meal' | 'timetable' | 'dday' | 'clock' | 'quote' | 'schoolInfo' | 'attendance' = activeStackTab;

    const handleSelectStackTab = (tab: 'calendar' | 'meal' | 'timetable' | 'dday' | 'clock' | 'quote' | 'schoolInfo' | 'attendance') => {
      setActiveStackTab(tab);
      try {
        localStorage.setItem('class_dashboard_active_stack_tab', tab);
      } catch {}
    };

    const handleExpandCurrentTabToCanvas = (tab: 'calendar' | 'meal' | 'timetable' | 'dday' | 'clock' | 'quote' | 'schoolInfo' | 'attendance') => {
      if (tab === 'timetable') {
        handleExpandWidgetFromStage('timetable');
        showToast('📅 수업 시간표가 메인 화면으로 복원되었습니다.');
        handleSelectStackTab('calendar');
      } else if (tab === 'dday') {
        handleExpandWidgetFromStage('dday');
        showToast('🚩 D-day 위젯이 메인 화면으로 복원되었습니다.');
        handleSelectStackTab('calendar');
      } else if (tab === 'clock') {
        handleExpandWidgetFromStage('clock');
        showToast('⏱️ 뽀모도로 타이머가 메인 화면으로 복원되었습니다.');
        handleSelectStackTab('calendar');
      } else if (tab === 'quote') {
        handleExpandWidgetFromStage('quote');
        showToast('📖 독서 노트가 메인 화면으로 복원되었습니다.');
        handleSelectStackTab('calendar');
      } else if (tab === 'schoolInfo') {
        handleExpandWidgetFromStage('schoolInfo');
        showToast('📞 학교 정보 위젯이 메인 화면으로 복원되었습니다.');
        handleSelectStackTab('calendar');
      } else if (tab === 'attendance') {
        handleExpandWidgetFromStage('attendance');
        showToast('👥 출결 관리 위젯이 메인 화면으로 복원되었습니다.');
        handleSelectStackTab('calendar');
      } else {
        showToast('📅 미니 캘린더는 스택 기본 뷰입니다.');
      }
    };

    return (
      <div className="w-full flex-1 min-h-0 flex flex-col gap-1.5 transition-all duration-300">
        {/* 🎛️ 리니어 아이콘 전용 7단 스위치 탭 바: [📅 캘린더] ➔ [📋 시간표] ➔ [🚩 D-day] ➔ [⏱️ 뽀모도로] ➔ [📖 독서노트] ➔ [📞 학교 정보] ➔ [👥 출결 관리] */}
        <div className="stack-tabbar w-full flex items-center justify-between p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-300/60 dark:border-slate-700/60 shadow-2xs">
          <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar">
            {/* 1. 📅 캘린더 아이콘 탭 (기본 뷰) */}
            <button
              type="button"
              onClick={() => handleSelectStackTab('calendar')}
              data-stack-tab-btn="calendar"
              className={`p-1.5 rounded-lg transition flex items-center justify-center cursor-pointer active:scale-95 ${
                currentTab === 'calendar'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs ring-1 ring-black/5'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="미니 캘린더 (기본 뷰)"
            >
              <Calendar className="w-3.5 h-3.5 stroke-[2]" />
            </button>

            {/* 1-2. 🍱 오늘의 급식 탭 (캘린더와 시간표 사이) */}
            <button
              type="button"
              onClick={() => handleSelectStackTab('meal')}
              className={`p-1.5 rounded-lg transition flex items-center justify-center cursor-pointer active:scale-95 ${
                currentTab === 'meal'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs ring-1 ring-black/5'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="오늘의 급식"
              data-stack-tab-btn="meal"
            >
              <Utensils className="w-3.5 h-3.5 stroke-[2]" />
            </button>

            {/* 2. 📋 수업 시간표 아이콘 탭 */}
            <button
              type="button"
              onClick={() => handleSelectStackTab('timetable')}
              data-stack-tab-btn="timetable"
              className={`p-1.5 rounded-lg transition flex items-center justify-center cursor-pointer active:scale-95 ${
                currentTab === 'timetable'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs ring-1 ring-black/5'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="수업 시간표 (클릭 시 오늘 ⇄ 내일 토글, 현재 교시 강조)"
            >
              <CalendarCheck className="w-3.5 h-3.5 stroke-[2]" />
            </button>

            {/* 3. 🚩 D-day 아이콘 탭 */}
            <button
              type="button"
              onClick={() => handleSelectStackTab('dday')}
              data-stack-tab-btn="dday"
              className={`p-1.5 rounded-lg transition flex items-center justify-center cursor-pointer active:scale-95 ${
                currentTab === 'dday'
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs ring-1 ring-black/5'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="주요 D-day 및 행사 일정"
            >
              <CalendarDays className="w-3.5 h-3.5 stroke-[2]" />
            </button>

            {/* 4. ⏱️ 뽀모도로 아이콘 탭 */}
            <button
              type="button"
              onClick={() => {
                if (!isClockInStack) {
                  handleToggleWidgetCollapse('clock');
                }
                handleSelectStackTab('clock');
              }}
              className={`p-1.5 rounded-lg transition flex items-center justify-center cursor-pointer active:scale-95 ${
                currentTab === 'clock'
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs ring-1 ring-black/5'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="뽀모도로 타이머"
            >
              <Timer className="w-3.5 h-3.5 stroke-[2]" />
            </button>

            {/* 5. 📖 독서노트 아이콘 탭 */}
            <button
              type="button"
              onClick={() => {
                if (!isQuoteInStack) {
                  handleToggleWidgetCollapse('quote');
                }
                handleSelectStackTab('quote');
              }}
              className={`p-1.5 rounded-lg transition flex items-center justify-center cursor-pointer active:scale-95 ${
                currentTab === 'quote'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs ring-1 ring-black/5'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="독서 노트"
            >
              <BookOpen className="w-3.5 h-3.5 stroke-[2]" />
            </button>

            {/* 6. 📞 학교 정보 아이콘 탭 */}
            <button
              type="button"
              onClick={() => handleSelectStackTab('schoolInfo')}
              data-stack-tab-btn="schoolInfo"
              className={`p-1.5 rounded-lg transition flex items-center justify-center cursor-pointer active:scale-95 ${
                currentTab === 'schoolInfo'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs ring-1 ring-black/5'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="학교 정보 및 주요 연락처"
            >
              <Phone className="w-3.5 h-3.5 stroke-[2]" />
            </button>

            {/* 7. 👥 출결 관리 아이콘 탭 */}
            <button
              type="button"
              onClick={() => handleSelectStackTab('attendance')}
              data-stack-tab-btn="attendance"
              className={`p-1.5 rounded-lg transition flex items-center justify-center cursor-pointer active:scale-95 ${
                currentTab === 'attendance'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs ring-1 ring-black/5'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="오늘의 출결 현황"
            >
              <UserCheck className="w-3.5 h-3.5 stroke-[2]" />
            </button>
          </div>

          {/* 현재 위젯 메인 화면으로 복원 버튼 (캘린더가 아닐 때 노출) */}
          {currentTab !== 'calendar' && currentTab !== 'meal' && (
            <button
              type="button"
              onClick={() => handleExpandCurrentTabToCanvas(currentTab)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-700/60 transition cursor-pointer shrink-0"
              title={`${
                currentTab === 'timetable'
                  ? '수업 시간표'
                  : currentTab === 'dday'
                  ? 'D-Day 위젯'
                  : currentTab === 'clock'
                  ? '뽀모도로 타이머'
                  : currentTab === 'quote'
                  ? '독서 노트'
                  : currentTab === 'schoolInfo'
                  ? '학교 정보'
                  : '출결 관리'
              }를 메인 화면으로 복원`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 📦 위젯 본체 (높이 h-[210px]와 100% 동일하게 7개 위젯 크기 완전 통일) */}
        <div className="stack-tabs-body w-full flex-1 overflow-hidden relative" style={stackTabH ? { minHeight: stackTabH } : undefined} data-stack-tab={currentTab}>
          {/* 📏 어떤 탭이든 '시간표' 탭과 같은 높이로: 시간표 크기를 숨은 사본으로 재요 */}
          {currentTab !== 'timetable' && (
            <div ref={stackTabMeasureRef} className="absolute left-0 top-0 w-full invisible pointer-events-none" aria-hidden style={{ height: 'auto' }}>
              <MiniTimetableStackWidget schedule={schedule} config={config} onShowToast={() => {}} onExpandToCanvas={() => {}} measureOnly />
            </div>
          )}
          {currentTab === 'timetable' && <div ref={stackTabMeasureRef} className="absolute inset-x-0 top-0 h-0 pointer-events-none" aria-hidden />}
          {currentTab === 'calendar' ? (
            <MiniCalendarStackWidget onShowToast={showToast} />
          ) : currentTab === 'meal' ? (
            <MiniMealStackWidget onShowToast={showToast} />
          ) : currentTab === 'timetable' ? (
            <MiniTimetableStackWidget
              schedule={schedule}
              config={config}
              onShowToast={showToast}
              onExpandToCanvas={() => handleExpandCurrentTabToCanvas('timetable')}
            />
          ) : currentTab === 'dday' ? (
            <MiniDDayStackWidget
              onShowToast={showToast}
              onExpandToCanvas={() => handleExpandCurrentTabToCanvas('dday')}
            />
          ) : currentTab === 'clock' ? (
            <ClockWidget
              isStackMode={true}
              onExpandToCanvas={() => handleExpandCurrentTabToCanvas('clock')}
              onSwapWithQuote={() => handleSelectStackTab('quote')}
              onShowToast={showToast}
            />
          ) : currentTab === 'quote' ? (
            <TeacherQuoteWidget
              isStackMode={true}
              onExpandToCanvas={() => handleExpandCurrentTabToCanvas('quote')}
              onSwapWithTimer={() => handleSelectStackTab('clock')}
              onShowToast={showToast}
            />
          ) : currentTab === 'schoolInfo' ? (
            <MiniSchoolInfoStackWidget
              onShowToast={showToast}
              onExpandToCanvas={() => handleExpandCurrentTabToCanvas('schoolInfo')}
            />
          ) : (
            <MiniAttendanceStackWidget
              students={students}
              onShowToast={showToast}
              onExpandToCanvas={() => handleExpandCurrentTabToCanvas('attendance')}
            />
          )}
        </div>
      </div>
    );
  };

  /**
   * 📑 단일 통합 사이드바 컬럼 (LEFT_ONLY 및 RIGHT_ONLY 시)
   * ⏰ [PART 2 & 6]: 독립 플립 시계 + 유튜브/캘린더 캐러셀 + 보관된 위젯 개수 안내 배지 + 통합 스택
   */
  const renderCombinedStackColumn = (side: 'left' | 'right' = 'left') => {
    // 서랍 캐러셀 목록에서 상단 전용 슬롯 위젯(clock, quote)은 중복 노출 방지
    const filteredCollapsedForCarousel = collapsedWidgetIds.filter(
      (id) => id !== 'clock' && id !== 'quote'
    );
    const targetWidth = side === 'left' ? leftSidebarWidth : rightSidebarWidth;

    return (
      <div
        style={{ width: `${targetWidth}px` }}
        data-sidebar-widget className="hidden md:flex flex-col h-full gap-2 shrink-0 transition-[width] duration-75 ease-out"
      >
        {/* 🍅📖 [뽀모도로 ↔ 독서 노트 듀얼 스택 슬롯]: 스택 상단에 표시 */}
        <div className={`${slotClass('tabs')} w-full flex-1 min-h-0 flex flex-col`} style={{ order: stackOrder.indexOf('tabs') }} {...(stackSlotProps('tabs') as any)}>
          {stackGrip('tabs', '탭 위젯')}
          {renderTopDualStackSlot()}
        </div>

        {/* 🎵 [목업 1:1 완벽 일치]: 집중 BGM 플레이어 (YouTubePlayerWidget) */}
        <div className={`${slotClass('youtube')} w-full shrink-0`} style={{ order: stackOrder.indexOf('youtube') }} data-yt-slot {...(stackSlotProps('youtube') as any)}>
          {stackGrip('youtube', '유튜브')}
          <YouTubePlayerWidget
            key="ttime-sidebar-youtube-player"
            videoId={youtubeVideoId || undefined}
            videoTitle={youtubeVideoTitle || (youtubeVideoId ? '유튜브 재생 중' : '유튜브 플레이어')}
            isPlaying={isYoutubePlaying && !isScreenLocked}
            isMuted={isYoutubeMuted}
            isLocked={isScreenLocked}
            toastMessage={isYoutubeToast ? toast : undefined}
            onTogglePlay={handleToggleYoutubePlay}
            onToggleMute={handleToggleYoutubeMute}
            onPlayNext={handlePlayNextVideo}
            onSelectVideo={(newId, newTitle) => {
              setYoutubeVideoId(newId);
              setYoutubeVideoTitle(newTitle);
              setIsYoutubePlaying(true);
            }}
            onShowToast={showToast}
          />
        </div>

        {/* 🎡 [신규 스택 캐러셀 슬라이더]: 보관된 위젯 ↔ 메모 슬라이더 */}
        <div
          style={{
            backgroundColor: isDarkMode
              ? `rgba(16, 26, 45, ${Math.min(1, Math.max(0.2, config.dashboardBgOpacity ?? 0.95))})`
              : `rgba(255, 255, 255, ${Math.min(1, Math.max(0.2, config.dashboardBgOpacity ?? 0.95))})`,
            order: stackOrder.indexOf('storage'),
          }}
          className={`${slotClass('storage')} lg-surface-panel shrink-0 min-h-[124px] max-h-[190px] overflow-hidden rounded-[24px] backdrop-blur-2xl border border-white/25 dark:border-[#1e2c44] shadow-xl p-2.5`}
          {...(stackSlotProps('storage') as any)}
        >
          {stackGrip('storage', '보관함')}
          <StackBottomDrawerCarousel
            collapsedWidgetIds={filteredCollapsedForCarousel}
            hiddenWidgetIds={hiddenWidgetIds}
            getWidgetTitle={getWidgetTitle}
            onExpandWidget={handleExpandWidgetFromStage}
            onExpandAllWidgets={handleExpandAllCollapsedWidgets}
            postItWidgets={postItWidgets}
            onAddPostIt={(c) => handleAddPostIt(c as PostItColor)}
            onUpdatePostIt={handleUpdatePostIt}
            onDeletePostIt={handleDeletePostIt}
            onRestoreMemoToCanvas={handleRestoreMemoToCanvas}
            onOpenMessengerModal={() => setIsMessengerModalOpen(true)}
          />
        </div>
      </div>
    );
  };

  /**
   * 🗂️ [PART 6] 독립 위젯 보관 스택 컬럼 (BOTH 모드 좌측)
   * 좌측: 플립시계 + 유튜브/단순 캘린더 캐러셀 + 보관위젯/쪽지 슬라이더
   */
  const renderIndependentWidgetStackAside = () => {
    const filteredCollapsedForCarousel = collapsedWidgetIds.filter(
      (id) => id !== 'clock' && id !== 'quote'
    );

    return (
      <div
        style={{ width: `${leftSidebarWidth}px` }}
        data-sidebar-widget className="hidden md:flex flex-col h-full gap-2 shrink-0 transition-[width] duration-75 ease-out"
      >
        {/* 🍅📖 [뽀모도로 ↔ 독서 노트 듀얼 스택 슬롯]: 스택 상단에 표시 */}
        <div className={`${slotClass('tabs')} w-full flex-1 min-h-0 flex flex-col`} style={{ order: stackOrder.indexOf('tabs') }} {...(stackSlotProps('tabs') as any)}>
          {stackGrip('tabs', '탭 위젯')}
          {renderTopDualStackSlot()}
        </div>

        {/* 🎵 [목업 1:1 완벽 일치]: 집중 BGM 플레이어 (YouTubePlayerWidget) */}
        <div className={`${slotClass('youtube')} w-full shrink-0`} style={{ order: stackOrder.indexOf('youtube') }} data-yt-slot {...(stackSlotProps('youtube') as any)}>
          {stackGrip('youtube', '유튜브')}
          <YouTubePlayerWidget
            key="ttime-sidebar-youtube-player"
            videoId={youtubeVideoId || undefined}
            videoTitle={youtubeVideoTitle || (youtubeVideoId ? '유튜브 재생 중' : '유튜브 플레이어')}
            isPlaying={isYoutubePlaying && !isScreenLocked}
            isMuted={isYoutubeMuted}
            isLocked={isScreenLocked}
            toastMessage={isYoutubeToast ? toast : undefined}
            onTogglePlay={handleToggleYoutubePlay}
            onToggleMute={handleToggleYoutubeMute}
            onPlayNext={handlePlayNextVideo}
            onSelectVideo={(newId, newTitle) => {
              setYoutubeVideoId(newId);
              setYoutubeVideoTitle(newTitle);
              setIsYoutubePlaying(true);
            }}
            onShowToast={showToast}
          />
        </div>

        {/* 🎡 [보관된 위젯 전용]: BOTH 모드 좌측 하단은 보관된 위젯만 표시 (목업 Deep Midnight Navy 카드 적용) */}
        <div
          style={{
            backgroundColor: isDarkMode
              ? `rgba(16, 26, 45, ${Math.min(1, Math.max(0.2, config.dashboardBgOpacity ?? 0.95))})`
              : `rgba(255, 255, 255, ${Math.min(1, Math.max(0.2, config.dashboardBgOpacity ?? 0.95))})`,
            order: stackOrder.indexOf('storage'),
          }}
          className={`${slotClass('storage')} lg-surface-panel shrink-0 min-h-[124px] max-h-[190px] overflow-hidden rounded-[24px] backdrop-blur-2xl border border-white/25 dark:border-[#1e2c44] shadow-xl p-2.5`}
          {...(stackSlotProps('storage') as any)}
        >
          {stackGrip('storage', '보관함')}
          <StackBottomDrawerCarousel
            collapsedWidgetIds={filteredCollapsedForCarousel}
            hiddenWidgetIds={hiddenWidgetIds}
            getWidgetTitle={getWidgetTitle}
            onExpandWidget={handleExpandWidgetFromStage}
            onExpandAllWidgets={handleExpandAllCollapsedWidgets}
            postItWidgets={postItWidgets}
            onAddPostIt={(c) => handleAddPostIt(c as PostItColor)}
            onUpdatePostIt={handleUpdatePostIt}
            onDeletePostIt={handleDeletePostIt}
            onRestoreMemoToCanvas={handleRestoreMemoToCanvas}
            onOpenMessengerModal={() => setIsMessengerModalOpen(true)}
            forceTab="widgets"
          />
        </div>
      </div>
    );
  };

  /**
   * 📝 [PART 6] 독립 판서 & 메모 스택 사이드바 (BOTH 모드 전용)
   */
  const renderIndependentMemoStackAside = () => {
    const stackAlpha = Math.min(1, Math.max(0.2, config.dashboardBgOpacity ?? 0.95));
    return (
      <aside data-sidebar-widget
        style={{
          width: `${rightSidebarWidth}px`,
          backgroundColor: isDarkMode
            ? `rgba(16, 26, 45, ${stackAlpha})`
            : `rgba(238, 242, 248, ${stackAlpha})`,
          borderColor: isDarkMode
            ? '#1e2c44'
            : 'rgba(203, 213, 225, 0.85)',
        }}
        className="lg-surface-panel glass-sticky-memo hidden lg:flex flex-col h-full overflow-hidden rounded-[28px] shadow-xl p-3 gap-2.5 shrink-0 transition-[width] duration-75 ease-out border border-slate-200/80 dark:border-[#1e2c44] backdrop-blur-xl"
      >
        {renderMemoStackPanelContent(false)}
      </aside>
    );
  };

  /**
   * 🖥️ 중앙 위젯 메인 캔버스 렌더링 헬퍼
   * - 외곽 회색 점선 배경 프레임(`rounded-3xl bg-slate-100/60 dark:bg-slate-900/40 border-2 border-dashed border-sky-400/40`)은 화면 100% 꽉 채우며 완전 고정 (scale 미적용)
   * - 내부 위젯 그리드/자유배치 컨테이너 래퍼에만 `transform: scale(${canvasZoom})` 바인딩
   * - 줌 컨트롤러: 중앙 위젯 배경 프레임 상단 우측(`absolute top-3 right-3 z-30`)에 리퀴드 글래스 캡슐형으로 깔끔하게 고정 배치
   * - 호버 시 "Ctrl + 마우스 휠로 배율 조절" 스마트 안내 툴팁 노출
   */
  const renderMainCanvasPanel = () => {
    const isBothSidebar = sidebarLayoutMode === 'BOTH';
    // 💡 [27인치 대형 화면 최적화]: 불필요한 강제 줌 축소 제거 -> 온전한 100% 가로 폭과 배율(canvasZoom) 확보
    const effectiveZoom = canvasZoom;

    return (
      <div className="flex-1 min-h-0 h-full min-w-0 relative flex flex-col overflow-hidden transition-all duration-300 ease-in-out">
        {/* 🔍 중앙 위젯 배경 상단 우측 플로팅 컨트롤 바 (투명 줌 & 디자인 저장 컨트롤러) */}
        <div data-canvas-controls className={`cc-slide cc-has-lumi absolute top-1.5 right-4 z-30 flex items-center gap-2 pointer-events-auto ${canvasControlsOpen ? 'is-open' : ''}`}>
          {/* ⚙ 손잡이: 마우스를 올리거나 누르면 화면 비율 · 디자인 저장 버튼이 옆으로 펼쳐져요 */}
          <button
            type="button"
            className="cc-handle cc-lumi"
            onClick={() => {
              setCanvasControlsOpen((v) => !v);
              if (canvasControlsOpen) setIsSlotMenuOpen(false);
            }}
            title={canvasControlsOpen ? '설정 메뉴 접기' : '루미를 누르면 설정 메뉴(화면 비율 · 배치 저장함 · 효과음 · 테마)를 펼쳐 줘요'}
            aria-label={canvasControlsOpen ? '설정 메뉴 접기' : '설정 메뉴 펼치기'}
            aria-expanded={canvasControlsOpen}
            data-cc-handle
          >
            <span className="cc-lumi-body">
              <MochiBody face={canvasControlsOpen ? 'excited' : 'happy'} tint={ccLumiTint} glow="low" className="w-full h-full" />
            </span>
            <span className="cc-lumi-gear" aria-hidden>
              <svg viewBox="0 0 24 24"><path d="M12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8Zm8.2 4.6-1.6-.4a6.9 6.9 0 0 1-.6 1.5l.9 1.4-1.6 1.6-1.4-.9c-.5.3-1 .5-1.5.6l-.4 1.6h-2.2l-.4-1.6c-.5-.1-1-.3-1.5-.6l-1.4.9-1.6-1.6.9-1.4c-.3-.5-.5-1-.6-1.5l-1.6-.4v-2.2l1.6-.4c.1-.5.3-1 .6-1.5l-.9-1.4 1.6-1.6 1.4.9c.5-.3 1-.5 1.5-.6l.4-1.6h2.2l.4 1.6c.5.1 1 .3 1.5.6l1.4-.9 1.6 1.6-.9 1.4c.3.5.5 1 .6 1.5l1.6.4Z" /></svg>
            </span>
            {!canvasControlsOpen && <span className="cc-lumi-tip" aria-hidden>설정</span>}
          </button>
          <div className="cc-drawer">
          {/* 🔍 투명 글래스 줌 컨트롤러 & 디자인 저장 통합 바 */}
          <div
            id="canvas-zoom-top-controller"
            className="group flex items-center gap-1 bg-white/35 dark:bg-slate-900/40 backdrop-blur-xl rounded-full shadow-xs border border-white/50 dark:border-white/15 px-2 py-0.5 transition-all select-none hover:bg-white/55 dark:hover:bg-slate-900/60 hover:shadow-md hover:border-white/70 dark:hover:border-white/30"
            title="중앙 캔버스 줌 & 배치 디자인 관리 (단축키: Ctrl/Cmd + 마우스 휠)"
          >
            {/* 축소 버튼 */}
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={canvasZoom <= 0.6}
              className="w-5 h-5 rounded-full flex items-center justify-center bg-white/40 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition active:scale-90 cursor-pointer"
              title="캔버스 축소 (최소 60%, Ctrl + 휠 아래)"
            >
              <Minus className="w-2.5 h-2.5" />
            </button>

            {/* 배율 표시 (클릭 시 100% 복원) */}
            <button
              type="button"
              onClick={handleZoomReset}
              className="px-1.5 py-0.2 rounded-full text-[11px] font-black text-slate-700 dark:text-slate-200 hover:bg-white/40 dark:hover:bg-white/10 transition active:scale-95 cursor-pointer tabular-nums flex items-center gap-0.5"
              title="클릭 시 기본 배율(100%)로 복원"
            >
              <span>{Math.round(effectiveZoom * 100)}%</span>
              {isBothSidebar && <span className="text-[9px] text-sky-500 font-extrabold">(최적)</span>}
            </button>

            {/* 확대 버튼 */}
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={canvasZoom >= 1.5}
              className="w-5 h-5 rounded-full flex items-center justify-center bg-white/40 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition active:scale-90 cursor-pointer"
              title="캔버스 확대 (최대 150%, Ctrl + 휠 위)"
            >
              <Plus className="w-2.5 h-2.5" />
            </button>

            {/* 얇은 투명 세로 구분선 */}
            <div className="w-px h-3.5 bg-slate-400/30 dark:bg-white/20 mx-0.5" />

            {/* 💾 배치 저장함: 이름 붙여 저장 · 골라서 불러오기(미리보기) */}
            <div className="relative" data-slot-root>
              <button
                type="button"
                onClick={() => setIsSlotMenuOpen((v) => !v)}
                className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/80 hover:bg-amber-500 text-slate-950 transition active:scale-95 cursor-pointer flex items-center gap-1 shadow-xs hover:shadow"
                title="배치를 이름 붙여 저장하고, 원할 때 골라서 불러와요"
                aria-expanded={isSlotMenuOpen}
                data-slot-toggle
              >
                <span>💾</span>
                <span>배치 저장함</span>
                {layoutSlots.length > 0 && <span className="cl-slot-count">{layoutSlots.length}</span>}
              </button>
              {isSlotMenuOpen && (
                <div className="cl-slot-menu" data-slot-menu onPointerDown={(e) => e.stopPropagation()}>
                  <div className="cl-slot-head">
                    <b>💾 배치 저장함</b>
                    <span>지금 모드: {SIDEBAR_MODE_SHORT[sidebarLayoutMode]}</span>
                    <button type="button" className="cl-slot-x" onClick={() => setIsSlotMenuOpen(false)} aria-label="닫기">✕</button>
                  </div>
                  <form
                    className="cl-slot-new"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const input = e.currentTarget.elements.namedItem('slotName') as HTMLInputElement;
                      saveLayoutSlot(input.value);
                      input.value = '';
                    }}
                  >
                    <input name="slotName" maxLength={20} placeholder="이름 (예: 아침 활동 배치)" data-slot-name />
                    <button type="submit" data-slot-save>지금 배치 저장</button>
                  </form>
                  {layoutSlots.length === 0 ? (
                    <p className="cl-slot-empty">아직 저장한 배치가 없어요. 위젯을 맞춘 뒤 이름을 붙여 저장해 보세요.</p>
                  ) : (
                    <ul className="cl-slot-list">
                      {layoutSlots.map((sl) => (
                        <li key={sl.id} data-slot-item={sl.name}>
                          <div className="cl-slot-meta">
                            <b>{sl.name}</b>
                            <span>
                              {SIDEBAR_MODE_SHORT[sl.mode] || '양쪽'} · {new Date(sl.savedAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}{' '}
                              {new Date(sl.savedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <button type="button" className="is-load" onClick={() => loadLayoutSlot(sl)} data-slot-load>불러오기</button>
                          <button type="button" onClick={() => saveLayoutSlot(sl.name, sl.id)} title="지금 배치로 덮어 저장">덮어쓰기</button>
                          <button type="button" className="is-del" onClick={() => deleteLayoutSlot(sl.id)} title="삭제" aria-label={`${sl.name} 삭제`}>🗑</button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="cl-slot-tip">불러오기를 누르면 갈 자리를 먼저 보여 줘요. 적용 후에도 Ctrl+Z로 되돌릴 수 있어요.</p>
                </div>
              )}
            </div>

            {/* 얇은 투명 세로 구분선 */}
            <div className="w-px h-3.5 bg-slate-400/30 dark:bg-white/20 mx-0.5" />

            {/* 🔊 위젯 이동/착지 효과음 테마 선택 (기본 효과음 -> 🔔 차임벨 -> 🫧 버블 팝 -> 🔇 음소거) */}
            <button
              type="button"
              onClick={handleCycleWidgetSfxMode}
              className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/50 hover:bg-white/90 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-slate-100 transition active:scale-95 cursor-pointer flex items-center gap-1 shadow-xs hover:shadow"
              title={`효과음 설정: ${
                widgetSfxMode === 'default'
                  ? '🎵 기본 효과음 (클릭 시 🔔 차임벨로 전환)'
                  : widgetSfxMode === 'chime'
                  ? '🔔 차임벨 (클릭 시 🫧 버블 팝으로 전환)'
                  : widgetSfxMode === 'bubble'
                  ? '🫧 버블 팝 (클릭 시 🔇 효과음 끄기로 전환)'
                  : '🔇 효과음 끄기 (클릭 시 🎵 기본 효과음으로 전환)'
              }`}
            >
              <span>{widgetSfxMode === 'default' ? '🎵' : widgetSfxMode === 'chime' ? '🔔' : widgetSfxMode === 'bubble' ? '🫧' : '🔇'}</span>
              <span>{widgetSfxMode === 'default' ? '기본음' : widgetSfxMode === 'chime' ? '차임벨' : widgetSfxMode === 'bubble' ? '버블 팝' : '무음'}</span>
            </button>

            {/* 얇은 투명 세로 구분선 */}
            <div className="w-px h-3.5 bg-slate-400/30 dark:bg-white/20 mx-0.5" />

            {/* 🎨 인스타 모던 대시보드 3종 시그니처 테마 순환 (라벤더 포그 ➔ 엠버 선셋 ➔ 사이버 글로시) */}
            <button
              type="button"
              onClick={handleCycleUITheme}
              className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/50 hover:bg-white/90 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-slate-100 transition active:scale-95 cursor-pointer flex items-center gap-1 shadow-xs hover:shadow"
              title={`대시보드 시그니처 테마: ${
                uiTheme === 'clean-white'
                  ? '🤍 클린 화이트 (클릭 시 라벤더 포그로 전환)'
                  : uiTheme === 'lavender-fog'
                  ? '🪻 라벤더 포그 (클릭 시 엠버 선셋으로 전환)'
                  : uiTheme === 'ember-sunset'
                  ? '🍊 엠버 선셋 (클릭 시 사이버 글로시로 전환)'
                  : '💎 사이버 글로시 (클릭 시 클린 화이트로 전환)'
              }`}
            >
              <span>{uiTheme === 'clean-white' ? '🤍' : uiTheme === 'lavender-fog' ? '🪻' : uiTheme === 'ember-sunset' ? '🍊' : '💎'}</span>
              <span>{uiTheme === 'clean-white' ? '화이트' : uiTheme === 'lavender-fog' ? '라벤더' : uiTheme === 'ember-sunset' ? '엠버선셋' : '글로시'}</span>
            </button>

            {/* 💡 호버 시 부드럽게 나타나는 스마트 휠 줌 안내 툴팁 */}
            <div className="absolute top-full mt-1.5 right-0 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 whitespace-nowrap shadow-xl">
              <div className="bg-slate-900/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-xl shadow-xl border border-white/20 backdrop-blur-md flex items-center gap-1.5">
                <span>🖱️</span>
                <span>Ctrl + 마우스 휠로 배율 조절 | 💾 배치 저장함</span>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* 📏 [하단 빈 여백 완전 제거]: 현재 배치된 활성 위젯들의 실제 최하단 끝선(maxBottom) 동적 계산 */}
        {(() => null)()}
        <main
          ref={mainContainerRef}
          id="main-canvas-container"
          tabIndex={-1}
          onPointerEnter={() => {
            if (mainContainerRef.current && document.activeElement !== mainContainerRef.current) {
              mainContainerRef.current.focus({ preventScroll: true });
            }
          }}
          style={{
            scrollBehavior: 'auto',
            willChange: 'scroll-position',
            transform: 'translateZ(0)',
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorY: 'auto',
            touchAction: 'pan-y',
            pointerEvents: 'auto',
            outline: 'none',
          }}
          className={`dashboard-grid-container bg-transparent flex-1 h-full w-full overflow-y-auto overflow-x-hidden box-border relative pt-4 sm:pt-4.5 px-2 sm:px-2.5 pb-2 min-w-0 flex flex-col fast-scroll-canvas ${
            config.dashboardBorderRadius === 'none'
              ? 'rounded-none'
              : config.dashboardBorderRadius === 'sm'
              ? 'rounded-lg'
              : config.dashboardBorderRadius === 'lg'
              ? 'rounded-3xl'
              : config.dashboardBorderRadius === 'full'
              ? 'rounded-[32px]'
              : 'rounded-[28px]'
          } [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300/80 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600/80 [&::-webkit-scrollbar-thumb]:rounded-lg hover:[&::-webkit-scrollbar-thumb]:bg-slate-400`}
        >
          {/* 🖼️ 이미지 스티커 (위젯 뒤 바탕) */}
          <StickerLayer editing={stickerEditing} pickNonce={stickerPickNonce} onDone={() => setStickerEditing(false)} onShowToast={showToast} />

          {/* 🔍 중앙 캔버스 내부 위젯 전용 배율(Zoom) 래퍼 (가로 폭 100% 온전 확보 및 동적 높이 보정) */}
          {(() => {
            const activeCanvasWidgets = widgetOrder.filter(isWidgetActiveOnCanvas);
            let maxB = 0;
            if (placementMode === 'freeform') {
              for (const wId of activeCanvasWidgets) {
                const pos = freeWidgetPositions[wId];
                if (pos) {
                  const isCollapsed = collapsedWidgetIds.includes(wId);
                  const h = isCollapsed ? 48 : (pos.height || 380);
                  const bottom = (pos.y || 0) + h;
                  if (bottom > maxB) maxB = bottom;
                }
              }
            }
            const canvasContentBottom = Math.max(maxB + 24, 400);

            return (
              <div
                id="main-canvas-scalable-area"
                data-canvas-zoom={effectiveZoom}
                style={{
                  zoom: effectiveZoom,
                  width: '100%',
                  minHeight: placementMode === 'freeform' ? `${canvasContentBottom}px` : '100%',
                  height: placementMode === 'freeform' ? `${canvasContentBottom}px` : undefined,
                  transition: 'zoom 0.15s ease-out',
                }}
                className="w-full flex-1 flex flex-col items-stretch"
              >
                {placementMode === 'freeform' ? (
                  /* 자유이동 캔버스 */
                  <div
                    ref={freeCanvasRef}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleCanvasDrop}
                    style={{
                      minHeight: `${canvasContentBottom}px`,
                      height: `${canvasContentBottom}px`,
                    }}
                    className="w-full flex-grow relative p-2 overflow-visible"
                  >

                    <div
                      className="relative w-full"
                      style={{
                        minHeight: `${canvasContentBottom}px`,
                        height: `${canvasContentBottom}px`,
                      }}
                    >
                      {/* 🧲 스마트 가이드 (F): 위젯과 같은 좌표에 그려서 진짜 가장자리에 딱 맞아요 */}
                      {snapGuides.ys.map((gy, idx) => (
                        <div key={`guide-y-${idx}-${gy}`} className="cl-guide is-h" style={{ top: `${gy}px` }} />
                      ))}
                      {snapGuides.xs.map((gx, idx) => (
                        <div key={`guide-x-${idx}-${gx}`} className="cl-guide is-v" style={{ left: `${gx}px` }} />
                      ))}
                      {(snapGuides.labels || []).map((lb, idx) => (
                        <span key={`guide-l-${idx}`} className="cl-guide-label" style={{ left: `${lb.x}px`, top: `${lb.y}px` }}>
                          {lb.text}
                        </span>
                      ))}
                      {/* 🧲 미리보기: 갈 자리를 점선으로 먼저 보여 줘요 (자석 · 새로 정렬 · 표준 3열 · 저장한 배치) */}
                      {magnetPreview &&
                        magnetPreview.moved.map((m) => (
                          <div
                            key={`ghost-${m.id}`}
                            className={`cl-magnet-ghost is-${magnetPreview.kind}`}
                            data-magnet-ghost={m.id}
                            style={{ left: `${m.x}px`, top: `${m.y}px`, width: `${m.width || m.w}px`, height: `${m.height || m.h}px` }}
                          >
                            <span>
                              {getWidgetTitle(m.id)}
                              {m.dy !== 0 && (
                                magnetPreview.kind === 'magnet' ? (
                                  <button
                                    type="button"
                                    className="cl-ghost-px cl-tip is-below"
                                    data-ghost-px={m.id}
                                    data-tip={`이 위젯이 ${m.dy > 0 ? '위로' : '아래로'} ${Math.abs(m.dy)}px 움직여요. 누르면 바로 위 위젯과의 세로 간격을 숫자로 정할 수 있어요.`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingGapId(m.id);
                                    }}
                                  >
                                    {m.dy > 0 ? `위로 ${m.dy}px` : `아래로 ${-m.dy}px`}
                                  </button>
                                ) : (
                                  <i>{m.dy > 0 ? ` · 위로 ${m.dy}` : ` · 아래로 ${-m.dy}`}</i>
                                )
                              )}
                              {m.dx !== 0 ? <i>{` · ${m.dx > 0 ? '왼쪽' : '오른쪽'} ${Math.abs(m.dx)}`}</i> : null}
                              {m.height ? <i>{` · ${m.width}×${m.height}`}</i> : null}
                            </span>
                          </div>
                        ))}
                      {/* 📏 위젯 사이 간격 표시: 숫자를 누르면 직접 입력해서 서로 맞춰요 */}
                      {magnetPreview &&
                        (magnetPreview.gaps || []).map((g) => (
                          <div key={`gap-${g.id}`} className="cl-gap-chip-wrap" style={{ left: `${g.x}px`, top: `${g.y}px` }}>
                            {editingGapId === g.id && magnetPreview.kind === 'magnet' ? (
                              <form
                                className="cl-gap-edit"
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  const v = Number((e.currentTarget.elements.namedItem('gap') as HTMLInputElement).value);
                                  if (Number.isFinite(v)) updateMagnetGap(g.id, v);
                                }}
                              >
                                <span>위 간격</span>
                                <input
                                  name="gap"
                                  type="number"
                                  min={0}
                                  max={120}
                                  defaultValue={g.gap}
                                  autoFocus
                                  onFocus={(e) => e.currentTarget.select()}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                      e.stopPropagation();
                                      setEditingGapId(null);
                                    }
                                  }}
                                  data-gap-input={g.id}
                                />
                                <span>px</span>
                                <button type="submit">확인</button>
                              </form>
                            ) : (
                              <button
                                type="button"
                                className={`cl-gap-chip cl-tip is-below ${g.gap < 8 ? 'is-tight' : ''}`}
                                data-gap-chip={g.id}
                                disabled={magnetPreview.kind !== 'magnet'}
                                data-tip={
                                  magnetPreview.kind === 'magnet'
                                    ? `위·아래 위젯 사이의 세로 간격이 ${g.gap}px라는 뜻이에요. 누르면 숫자를 바꿀 수 있어요.`
                                    : `위·아래 위젯 사이의 세로 간격(${g.gap}px)이에요.`
                                }
                                onClick={() => setEditingGapId(g.id)}
                              >
                                {g.gap}px
                              </button>
                            )}
                          </div>
                        ))}
                      {editingGapId && magnetPreview && magnetPreview.kind === 'magnet' && !(magnetPreview.gaps || []).some((g) => g.id === editingGapId) && (() => {
                        const m = magnetPreview.moved.find((x) => x.id === editingGapId);
                        if (!m) return null;
                        return (
                          <div className="cl-gap-chip-wrap" style={{ left: `${m.x + m.w / 2}px`, top: `${m.y}px` }}>
                            <form
                              className="cl-gap-edit"
                              onSubmit={(e) => {
                                e.preventDefault();
                                const v = Number((e.currentTarget.elements.namedItem('gap') as HTMLInputElement).value);
                                if (Number.isFinite(v)) updateMagnetGap(m.id, v);
                              }}
                            >
                              <span>위 간격</span>
                              <input name="gap" type="number" min={0} max={120} defaultValue={magnetGap} autoFocus onFocus={(e) => e.currentTarget.select()} data-gap-input={m.id} />
                              <span>px</span>
                              <button type="submit">확인</button>
                            </form>
                          </div>
                        );
                      })()}
                      {magnetPreview &&
                        createPortal(
                          <div className={`cl-magnet-bar is-${magnetPreview.kind}`} data-magnet-bar role="dialog" aria-label="배치 미리보기">
                            <span>
                              {magnetPreview.kind === 'magnet'
                                ? `🧲 빈틈 메우기 · 위젯 ${magnetPreview.moved.length}개가 같은 줄 안에서 정리돼요`
                                : magnetPreview.kind === 'smart'
                                ? `✨ 새로 정렬 · 크기는 그대로, 위젯 ${magnetPreview.moved.length}개가 순서대로 빈틈없이 놓여요`
                                : magnetPreview.kind === 'reset'
                                ? `▦ 열 맞춤 · 위젯 ${magnetPreview.moved.length}개를 ${magnetPreview.colWidth}×${magnetPreview.colHeight}px로 같게`
                                : `💾 '${magnetPreview.title || '저장한 배치'}' 불러오기 · 위젯 ${magnetPreview.moved.length}개`}
                              {magnetPreview.kind !== 'slot' && pinnedWidgetIds.filter((id) => isWidgetActiveOnCanvas(id)).length > 0 ? ` · 📌 고정 ${pinnedWidgetIds.filter((id) => isWidgetActiveOnCanvas(id)).length}개는 그대로` : ''}
                            </span>
                            {magnetPreview.kind === 'magnet' && (
                              <label className="cl-magnet-gap cl-tip is-below" data-tip="위젯과 위젯 사이를 위·아래, 양옆 모두 몇 px 띄울지 정해요. 숫자를 바꾸고 Enter를 누르면 바로 다시 보여 줘요.">
                                간격
                                <input
                                  type="number"
                                  min={0}
                                  max={120}
                                  key={`g-${magnetGap}`}
                                  defaultValue={magnetGap}
                                  data-magnet-gap-input
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      updateMagnetGap(null, Number((e.target as HTMLInputElement).value));
                                    }
                                  }}
                                  onBlur={(e) => {
                                    const v = Number(e.target.value);
                                    if (Number.isFinite(v) && v !== magnetGap) updateMagnetGap(null, v);
                                  }}
                                />
                                px
                              </label>
                            )}
                            {magnetPreview.kind === 'reset' && (
                              <>
                                <div className="cl-cols-seg" role="radiogroup" aria-label="열 수">
                                  {([2, 3] as const).map((c) => (
                                    <button
                                      key={c}
                                      type="button"
                                      role="radio"
                                      aria-checked={magnetPreview.cols === c}
                                      className={magnetPreview.cols === c ? 'is-on' : ''}
                                      data-cols={c}
                                      onClick={() => handleResetDefaultLayout({ cols: c, height: magnetPreview.colHeight !== magnetPreview.autoHeight ? magnetPreview.colHeight : undefined })}
                                    >
                                      {c}열
                                    </button>
                                  ))}
                                </div>
                                <label className="cl-magnet-gap cl-tip is-below" data-tip="모든 위젯의 세로 높이(px)예요. 비워 두거나 '자동'을 누르면 3열 출결 관리 크기에 맞춰요.">
                                  세로
                                  <input
                                    type="number"
                                    min={160}
                                    max={1400}
                                    step={10}
                                    key={`h-${magnetPreview.colHeight}-${magnetPreview.cols}`}
                                    defaultValue={magnetPreview.colHeight}
                                    data-reset-height
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleResetDefaultLayout({ cols: magnetPreview.cols, height: Number((e.target as HTMLInputElement).value) });
                                      }
                                    }}
                                    onBlur={(e) => {
                                      const v = Number(e.target.value);
                                      if (Number.isFinite(v) && v >= 160 && v !== magnetPreview.colHeight) handleResetDefaultLayout({ cols: magnetPreview.cols, height: v });
                                    }}
                                  />
                                  px
                                  {magnetPreview.colHeight !== magnetPreview.autoHeight && (
                                    <button type="button" className="cl-auto-h" onClick={() => handleResetDefaultLayout({ cols: magnetPreview.cols })}>
                                      자동
                                    </button>
                                  )}
                                </label>
                              </>
                            )}
                            <button type="button" onClick={() => { setMagnetPreview(null); setEditingGapId(null); }} data-magnet-cancel>
                              취소 <kbd>Esc</kbd>
                            </button>
                            <button type="button" className="is-main" onClick={applyMagnetPreview} data-magnet-apply>
                              적용 <kbd>Enter</kbd>
                            </button>
                          </div>,
                          document.body
                        )}
                      {layoutUndoToast &&
                        !magnetPreview &&
                        createPortal(
                          <div key={layoutUndoToast.key} className="cl-undo-toast" data-layout-undo role="status">
                            <span>{layoutUndoToast.msg}</span>
                            <button type="button" onClick={() => undoLayoutRef.current()} data-layout-undo-btn>
                              ↩ 되돌리기
                            </button>
                            <kbd>Ctrl+Z</kbd>
                            <button type="button" className="is-x" onClick={() => setLayoutUndoToast(null)} aria-label="닫기">
                              ✕
                            </button>
                            <i />
                          </div>,
                          document.body
                        )}
                  {widgetOrder
                    .filter(isWidgetActiveOnCanvas)
                    .map((wId) => {
                      const widgetContent = renderWidget(wId);
                      // 🛑 [투명 유령 위젯 차단]: 위젯 내용이 없으면(null) 380px 절대위치 div도 절대 렌더링하지 않음!
                      if (!widgetContent) return null;

                      const pos = freeWidgetPositions[wId] || { x: 20, y: 20, width: 380 };
                      const zIdx = activeZIndexMap[wId] || 10;
                      const isDraggingThis = activeDraggingWidgetId === wId;
                      const isThisCollapsed = collapsedWidgetIds.includes(wId);
                      // 📺 전체 화면 모드의 유튜브: 위젯 틀 없이 스티커처럼 떠 있는 뮤직 카드
                      const isYtSticker = wId === 'youtube' && !isThisCollapsed;

                      return (
                        <div
                          key={wId}
                          data-free-widget-id={wId}
                          data-yt-sticker={isYtSticker ? 'true' : undefined}
                          data-magnet-moving={magnetPreview && magnetPreview.moved.some((m) => m.id === wId) ? 'true' : undefined}
                          onPointerDown={(e) => {
                            const target = e.target as HTMLElement;
                            if (
                              target.closest('.resize-handle') ||
                              target.closest('button') ||
                              target.closest('input') ||
                              target.closest('textarea') ||
      target.isContentEditable ||
      target.closest('[contenteditable="true"]') ||
                              target.closest('select') ||
                              target.closest('a')
                            ) {
                              return;
                            }
                            handleFreeWindowPointerDown(e, wId);
                          }}
                          style={{
                            position: 'absolute',
                            left: `${pos.x}px`,
                            top: `${pos.y}px`,
                            width: isYtSticker ? '300px' : pos.width ? `${pos.width}px` : '380px',
                            maxWidth: 'calc(100% - 24px)',
                            height: isThisCollapsed ? '48px' : isYtSticker ? undefined : (pos.height ? `${pos.height}px` : undefined),
                            zIndex: isDraggingThis ? 999 : zIdx,
                            transition: 'none',
                          }}
                          className={`transition-shadow duration-150 touch-none ${isDraggingThis
                            ? 'scale-[1.01] shadow-2xl ring-2 ring-sky-400 cursor-grabbing opacity-95'
                            : 'hover:shadow-xl cursor-grab active:cursor-grabbing'
                            }`}
                        >
                          {widgetContent}
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              /* [12분할 통합 스마트 반응형 그리드]: 가로 드래그에 따른 유연한 너비 확장(3, 4, 6, 8, 12칸) 및 dense flow 자동 빈자리 채움/재배치 완벽 지원 */
              <div
                id="main-canvas-grid-container"
                className={`w-full h-full p-1.5 sm:p-2.5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 ${
                  isTightGap ? 'gap-2 sm:gap-2.5' : 'gap-3.5 sm:gap-4'
                } [grid-auto-flow:dense] items-start content-start transition-all duration-300`}
                style={{
                  display: 'grid',
                  width: '100%',
                  alignItems: 'start',
                }}
              >
                {(() => {
                  const visibleIds = widgetOrder.filter(isWidgetActiveOnCanvas);
                  return visibleIds.map((wId) => renderWidget(wId));
                })()}

                {/* 하단 드롭 타깃 */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverWidgetId !== '__bottom_drop_target__') {
                      setDragOverWidgetId('__bottom_drop_target__');
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverWidgetId === '__bottom_drop_target__') {
                      setDragOverWidgetId(null);
                    }
                  }}
                  onDrop={(e) => handleDrop(e, '__bottom_drop_target__')}
                  className={`col-span-full border-2 border-dashed rounded-3xl p-4 flex items-center justify-center transition-all cursor-pointer ${dragOverWidgetId === '__bottom_drop_target__'
                    ? 'border-sky-400 bg-sky-500/15 text-sky-600 scale-[1.01] shadow-md'
                    : 'border-slate-300/60 dark:border-slate-700/60 bg-white/40 dark:bg-slate-900/20 text-slate-400 hover:border-sky-400 hover:text-sky-500 opacity-70 hover:opacity-100'
                    }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold pointer-events-none">
                    <span className="text-lg">📥</span>
                    <span>위젯 상단 바를 이곳으로 드래그하면 화면 맨 아래 빈 공간으로 안전하게 배치됩니다</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </main>
      </div>
    );
  };

  // 🎨 HEX 색상을 RGBA 문자열로 안전하게 변환하는 헬퍼 함수
  const hexToRgba = (hex: string, alpha: number): string => {
    try {
      if (hex === 'transparent') return 'transparent';
      if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
      const clean = hex.replace('#', '');
      if (clean.length === 3) {
        const r = parseInt(clean[0] + clean[0], 16);
        const g = parseInt(clean[1] + clean[1], 16);
        const b = parseInt(clean[2] + clean[2], 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
      const r = parseInt(clean.substring(0, 2), 16) || 0;
      const g = parseInt(clean.substring(2, 4), 16) || 0;
      const b = parseInt(clean.substring(4, 6), 16) || 0;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } catch {
      return `rgba(15, 23, 42, ${alpha})`;
    }
  };

  const activeBgImage = config.canvasBgImage || config.customBackground?.url;
  const matteAlpha = config.dashboardBgOpacity ?? 0.95;
  const fontScaleVal = config.fontScale ?? 1.0;
  const effectiveFontScale = fontScaleVal > 0 ? fontScaleVal : 1.0;
  const activeThemeConfig = getTheme(config.theme, isDarkMode);

  // 🎨 테마별 기본 배경 색상 계산 (다크모드 시 색상 테마 및 커스텀 색상과 무관하게 Deep Midnight Cinema 고정)
  const getThemeBackgroundColor = () => {
    // 🌙 다크 모드 활성화 시: 전용 딥 코스믹 블랙(#070a14) 베이스 고정!
    if (isDarkMode) {
      if (activeBgImage && config.dashboardBgColor === 'transparent') {
        return 'transparent';
      }
      // 사용자가 고른 배경색은 다크 모드에서도 적용
      if (config.dashboardBgColor && config.dashboardBgColor !== 'transparent' && config.dashboardBgColor.startsWith('#')) {
        return hexToRgba(config.dashboardBgColor, WINDOW_GLASS !== 'none' ? matteAlpha : 1);
      }
      if (config.dashboardBgColor === 'transparent') return 'transparent';
      // 리퀴드 글래스 지원 시: 팔레트의 배경 투명도만큼 바탕화면이 비침
      return WINDOW_GLASS !== 'none' ? `rgba(7, 10, 20, ${matteAlpha})` : '#070a14';
    }

    // 1) 라이트 모드: 사용자가 직접 지정한 커스텀 배경색이 있는 경우 (예: 'transparent' 또는 '#f8fafc' 등)
    if (config.dashboardBgColor && config.dashboardBgColor.trim() !== '') {
      return config.dashboardBgColor === 'transparent'
        ? 'transparent'
        : hexToRgba(config.dashboardBgColor, matteAlpha);
    }

    // 2) 라이트 모드: 배경 이미지가 등록되어 있는 경우
    if (activeBgImage) {
      return `rgba(255, 255, 255, ${Math.max(0.1, matteAlpha * 0.3)})`;
    }

    // 3) 테마 바탕색 (배경 그림은 CSS의 테마 배경 레이어가 그려요)
    const UI_BASE: Record<string, string> = {
      'clean-white': '#EEF1F6',
      'lavender-fog': '#EDE7F8',
      'ember-sunset': '#F5EADC',
      'botanical-sage': '#E7F0E9',
      'cyber-glossy': '#0A1024',
    };
    if (UI_BASE[uiTheme]) return UI_BASE[uiTheme];
    switch (config.theme) {
      case 'clean-white':
        return `rgba(242, 243, 245, ${matteAlpha})`; // 클린 화이트 연회색 (#F2F3F5)
      case 'cyber-glossy':
        return '#070a14';
      case 'ember-sunset':
        return `rgba(254, 250, 246, ${matteAlpha})`; // 엠버 선셋 웜 오트밀 (#FEFAF6)
      case 'lavender-fog':
        return `rgba(248, 246, 252, ${matteAlpha})`; // 라벤더 포그 미스트 (#F8F6FC)
      case 'class-basic':
      case 'elementary':
        return `rgba(244, 248, 252, ${matteAlpha})`; // 스카이 베이직 (#F4F8FC)
      case 'cozy-latte':
      case 'cafe':
      case 'pastel':
        return `rgba(251, 245, 236, ${matteAlpha})`; // 시나몬 라떼 (#FBF5EC)
      case 'botanical-sage':
      case 'emerald':
        return `rgba(241, 248, 244, ${matteAlpha})`; // 보태니컬 세이지 (#F1F8F4)
      case 'glass-aurora':
      case 'glassmorphism':
      case 'slate':
      default:
        return `rgba(253, 248, 245, ${matteAlpha})`; // 글래스 퍼플 2.0 따뜻한 피치 아이보리 (#FDF8F5)
    }
  };

  return (
    <div
      style={{
        fontFamily: getFontFamily(config.fontFamily),
        backgroundImage: activeBgImage ? `url("${activeBgImage}")` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundColor: getThemeBackgroundColor(),
        zoom: effectiveFontScale,
        height: effectiveFontScale !== 1 ? `${(100 / effectiveFontScale).toFixed(3)}vh` : '100vh',
        minHeight: effectiveFontScale !== 1 ? `${(100 / effectiveFontScale).toFixed(3)}vh` : '100vh',
        maxHeight: effectiveFontScale !== 1 ? `${(100 / effectiveFontScale).toFixed(3)}vh` : '100vh',
        width: effectiveFontScale !== 1 ? `${(100 / effectiveFontScale).toFixed(3)}vw` : '100vw',
      }}
      className={`classin-app-root ${activeBgImage ? 'has-user-bg' : 'has-theme-bg'} ${
        collapsePhase === 'out' ? `cl-collapse-${collapseEffect}-out` : collapsePhase === 'in' ? `cl-collapse-${collapseEffect}-in` : collapsePhase === 'mini' ? 'cl-collapsed' : ''
      } w-full overflow-hidden flex flex-col justify-between px-4 pt-2.5 pb-2 gap-2 transition-colors duration-500 relative ${
        activeBgImage
          ? isDarkMode
            ? 'dark text-slate-100'
            : 'text-white'
          : getThemeClass(config.theme)
      }`}
    >
      {/* 🌇 퇴근 30분 전부터 노을 (비·눈 오는 날은 비·눈) — 맨 뒤 배경 */}
      <DuskBackdrop endTime={config.workEndTime || '16:30'} enabled={config.enableDuskBackground !== false} dark={isDarkMode} />
      {/* 🌈 [리퀴드 글래스 기본 배경]: 유리 뒤로 은은하게 비치는 인디고·민트·피치 메시 그라데이션
          - 배경 이미지를 설정하면 그 이미지가 대신 비칩니다.
          - 기존 '흐림 필터 발광 구체'(blur 110~160px × 7개)를 필터 없는 그라데이션 1장으로 대체해 GPU 부담도 줄였습니다. */}
      {!activeBgImage && (
        <div
          aria-hidden
          className={`fixed inset-0 pointer-events-none z-0 ${isDarkMode ? 'lg-mesh-bg-dark' : 'lg-mesh-bg'}`}
          style={WINDOW_GLASS !== 'none' ? { opacity: Math.max(0, Math.min(1, matteAlpha)) } : undefined}
        />
      )}

      {/* ✨ [두 번째 첨부 이미지 스타일]: 불투명도 조절과 연동되는 부드러운 무광 사틴 매트 필름 레이어 */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-300 z-0"
        style={{
          backgroundColor: isDarkMode
            ? `rgba(7, 10, 20, ${Math.max(0, matteAlpha * 0.3)})`
            : `rgba(255, 255, 255, ${Math.max(0, matteAlpha * 0.3)})`,
          // (전체 화면 backdrop-filter 제거: 유리 굴절감 확보 + 렌더링 부담 감소)
          opacity: matteAlpha,
        }}
      />

      {/* 🫧 경계 없는 한 판: 헤더 · 스택 · 위젯 영역이 함께 올라앉는 하나의 바탕 */}
      {config.seamlessLayout !== false && <div aria-hidden className="ci-shell" />}

      {/* 1. Global Header & Status Bar (상단 헤더바 세로 넓이 확장 & 바로가기 툴바 일체형 통합) */}
      <Header
        config={config}
        schedule={schedule}
        students={students}
        mode={mode}
        isDarkMode={isDarkMode}
        onModeChange={handleModeChange}
        onToggleBoardType={handleToggleBoardType}
        onOpenShortcuts={() => setIsShortcutHelpOpen(true)}
        onCollapseDashboard={collapseDashboard}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenStudentDisplay={() => handleOpenDualMonitor('timer')}
        isStudentDisplayActive={isDualMonitorOpen}
        onLockScreen={() => {
          setIsScreenLocked(true);
          try {
            localStorage.setItem('ttime_is_locked', 'true');
            localStorage.setItem('class_dashboard_is_screen_locked', 'true');
          } catch { }
          showToast('🔒 화면이 잠겼습니다. PIN 번호로 해제할 수 있습니다.');
        }}
        onShowToast={showToast}
        onCycleSidebarMode={() => {
          setSidebarLayoutMode((prev) => {
            const cycle: SidebarLayoutMode[] = ['BOTH', 'LEFT_ONLY', 'RIGHT_ONLY', 'NONE'];
            const curIdx = cycle.indexOf(prev);
            const nextMode = cycle[(curIdx + 1) % cycle.length];
            try {
              localStorage.setItem('class_dashboard_sidebar_layout_mode', nextMode);
            } catch {}
            const modeNames: Record<SidebarLayoutMode, string> = {
              BOTH: '양쪽 모두 사용',
              LEFT_ONLY: '좌측 집중 (우측 몰기)',
              RIGHT_ONLY: '우측 집중 (좌측 몰기)',
              NONE: '전체 화면 (스택 숨김)',
            };
            showToast(`🎛️ [화면 분할] ${modeNames[nextMode]} 모드로 전환되었습니다.`);
            return nextMode;
          });
        }}
        onOpenAddWidgetModal={() => {
          setIsSettingsOpen(true);
          showToast('⚙️ 환경설정에서 위젯 표시 여부를 관리할 수 있습니다.');
        }}
        hiddenWidgetIds={hiddenWidgetIds}
        collapsedWidgetIds={collapsedWidgetIds}
        onRestoreWidget={handleRestoreWidget}
        getWidgetTitle={getWidgetTitle}
      />

      {/* 2. MODE-SPECIFIC VIEWS or UNIFIED 3-PANEL SHELL (수업모드 & 업무모드 100% 동일 UI 공유) */}
      {mode === 'break' ? (
        /* 쉬는 시간 2분할 뷰: 소음측정기 + 시계/타이머 (요구사항 6) */
        <Suspense fallback={<div className="flex-1" />}>
          <BreakModeView
            config={config}
            onSwitchToLesson={() => handleModeChange('lesson')}
            onOpenSecondaryPopup={() => handleOpenDualMonitor('break')}
            onShowToast={showToast}
          />
        </Suspense>
      ) : mode === 'clean' ? (
        /* 청소 및 종례 모드: 10분 타이머 + 전광판 배너 (요구사항 7) */
        <Suspense fallback={<div className="flex-1" />}>
          <CleanDismissalModeView
            roles={roles}
            students={students}
            onSwitchToLesson={() => handleModeChange('lesson')}
            onOpenSecondaryPopup={() => handleOpenDualMonitor('clean')}
            onShowToast={showToast}
          />
        </Suspense>
      ) : mode === 'quiz' ? (
        /* 수업 스마트 퀴즈 쇼 모드 (요구사항 2, 3) */
        <Suspense fallback={<div className="flex-1" />}>
          <QuizModeView
            teams={teams}
            onSwitchToLesson={() => handleModeChange('lesson')}
            onOpenSecondaryPopup={() => handleOpenDualMonitor('quiz')}
            onShowToast={showToast}
          />
        </Suspense>
      ) : (
        /* [3분할 화면 쉘 또는 동적 스택 배치]: BOTH(기본 3분할) | LEFT_ONLY(좌측 확장, 우측 통합) | RIGHT_ONLY(우측 확장, 좌측 통합) | NONE(전체화면) */
        <div className="w-full flex-1 flex flex-row min-h-0 overflow-hidden relative gap-3.5 items-stretch pb-1 transition-all duration-300 ease-in-out">
          {/* 1. 기본 3분할 모드: 좌측 위젯스택 + 좌측 리사이저 + 중앙 메인캔버스 + 우측 리사이저 + 우측 메모스택 (요구사항 13) */}
          {sidebarLayoutMode === 'BOTH' && (
            <>
              {renderIndependentWidgetStackAside()}

              {/* 🪟 좌측 분할 드래그 핸들 (Split Pane Divider, min 260px) */}
              <StackResizer
                side="left"
                label="왼쪽 스택 너비"
                className="hidden md:flex"
                width={leftSidebarWidth}
                min={260}
                max={420}
                defaultWidth={280}
                presets={[['좁게', 260], ['보통', 300], ['넓게', 360]]}
                canFit={(w) => window.innerWidth - w - (sidebarLayoutMode === 'BOTH' ? rightSidebarWidth : 0) >= 600}
                onChange={(w) => {
                  setLeftSidebarWidth(w);
                  try { localStorage.setItem('class_dashboard_left_sidebar_width', String(w)); } catch {}
                }}
              />

              {renderMainCanvasPanel()}

              {/* 🪟 우측 분할 드래그 핸들 (Split Pane Divider, min 160px) */}
              <StackResizer
                side="right"
                label="오른쪽 스택 너비"
                className="hidden lg:flex"
                width={rightSidebarWidth}
                min={160}
                max={420}
                defaultWidth={280}
                presets={[['좁게', 200], ['보통', 280], ['넓게', 340]]}
                canFit={(w) => window.innerWidth - w - (sidebarLayoutMode === 'BOTH' ? leftSidebarWidth : 0) >= 600}
                onChange={(w) => {
                  setRightSidebarWidth(w);
                  try { localStorage.setItem('class_dashboard_right_sidebar_width', String(w)); } catch {}
                }}
              />

              {renderIndependentMemoStackAside()}
            </>
          )}

          {/* 2. 좌측 집중 (우측 몰기) 모드: 중앙 캔버스가 좌측으로 넓게 집중되고 우측 1개 바에 메모+위젯 통합 */}
          {sidebarLayoutMode === 'LEFT_ONLY' && (
            <>
              {renderMainCanvasPanel()}

              {/* 🪟 우측 분할 드래그 핸들 (Split Pane Divider) */}
              <StackResizer
                side="right"
                label="오른쪽 스택 너비"
                className="hidden lg:flex"
                width={rightSidebarWidth}
                min={160}
                max={420}
                defaultWidth={280}
                presets={[['좁게', 200], ['보통', 280], ['넓게', 340]]}
                canFit={(w) => window.innerWidth - w - 0 >= 600}
                onChange={(w) => {
                  setRightSidebarWidth(w);
                  try { localStorage.setItem('class_dashboard_right_sidebar_width', String(w)); } catch {}
                }}
              />

              {renderCombinedStackColumn('right')}
            </>
          )}

          {/* 3. 우측 집중 (좌측 몰기) 모드: 좌측 1개 바에 메모+위젯 통합되고 중앙 캔버스가 우측으로 넓게 집중 */}
          {sidebarLayoutMode === 'RIGHT_ONLY' && (
            <>
              {renderCombinedStackColumn('left')}

              {/* 🪟 좌측 분할 드래그 핸들 (Split Pane Divider) */}
              <StackResizer
                side="left"
                label="왼쪽 스택 너비"
                className="hidden md:flex"
                width={leftSidebarWidth}
                min={260}
                max={420}
                defaultWidth={280}
                presets={[['좁게', 260], ['보통', 300], ['넓게', 360]]}
                canFit={(w) => window.innerWidth - w - 0 >= 600}
                onChange={(w) => {
                  setLeftSidebarWidth(w);
                  try { localStorage.setItem('class_dashboard_left_sidebar_width', String(w)); } catch {}
                }}
              />

              {renderMainCanvasPanel()}
            </>
          )}

          {/* 4. 전체 화면 모드: 스택 숨김, 메인캔버스 100% 꽉 채움 */}
          {sidebarLayoutMode === 'NONE' && (
            <>
              {renderMainCanvasPanel()}
            </>
          )}
        </div>
      )}

      {/* 📺 [PART 3: 전체 화면 모드 (NONE) 전용 플로팅 PiP 미니 플레이어] */}
      {!isScreenLocked && sidebarLayoutMode === 'NONE' && collapsedWidgetIds.includes('youtube') && youtubeFoldBehavior === 'mini' && !!youtubeVideoId && (
        <div className="fixed bottom-24 right-6 z-50 w-72 sm:w-80 shadow-2xl rounded-2xl overflow-hidden border border-white/30 dark:border-slate-700 bg-slate-900/95 backdrop-blur-xl animate-fade-in pointer-events-auto">
          <YouTubeMiniPlayer
            videoId={youtubeVideoId}
            videoTitle={youtubeVideoTitle}
            isPlaying={isYoutubePlaying && !isScreenLocked}
            isLocked={isScreenLocked}
            isMuted={isYoutubeMuted}
            onTogglePlay={handleToggleYoutubePlay}
            onPlayNext={handlePlayNextVideo}
            onToggleMute={handleToggleYoutubeMute}
            onExpand={() => {
              handleExpandWidgetFromStage('youtube');
              showToast('📺 유튜브 영상이 메인 화면으로 다시 펼쳐졌습니다.');
            }}
            onClose={() => {
              setYoutubeVideoId(null);
              handleCloseWidget('youtube');
              showToast('📺 유튜브 미니 플레이어가 종료되었습니다.');
            }}
            onShowToast={showToast}
          />
        </div>
      )}

      {/* 3. Bottom Floating Quick Command Dock with Apple Dynamic Island Integration (화면 잠금 시 완벽 은닉) */}
      {!isScreenLocked && (
        <QuickDock
          onOpenStickers={() => {
            // 새 스티커 불러오기: 스티커 모드로 바꾸고 이미지 선택 창을 열어요
            setStickerEditing(true);
            setStickerPickNonce((n) => n + 1);
          }}
          isStickerMode={stickerEditing}
          onToggleStickerMode={() => setStickerEditing((v) => !v)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onLockScreen={() => {
            setIsScreenLocked(true);
            try {
              localStorage.setItem('class_dashboard_is_screen_locked', 'true');
            } catch { }
            showToast('🔒 화면이 잠겼습니다. 비밀번호로 해제할 수 있습니다.');
          }}
          onRingChime={handleAttentionChime}
          onOpenStudentDisplay={() => handleOpenDualMonitor('timer')}
          onAutoAlignWidgets={handleAutoAlignWidgets}
          onSmartLayoutOptimize={() => handleSmartLayoutOptimize()}
          onAddPostIt={() => handleAddPostIt()}
          autoSmartOptimize={autoSmartOptimize}
          onToggleAutoSmartOptimize={handleToggleAutoSmartOptimize}
          emptySlotsCount={gridAnalysis.totalEmptySlots}
          efficiencyPercentage={gridAnalysis.efficiencyPercentage}
          hiddenWidgetIds={hiddenWidgetIds}
          activeWidgetIds={widgetOrder.filter((id) => !hiddenWidgetIds.includes(id))}
          onToggleWidget={handleToggleWidget}
          onRestoreWidget={handleRestoreWidget}
          onHideWidget={handleCloseWidget}
          onResetDefaultLayout={() => handleResetDefaultLayout()}
          layoutMode={placementMode}
          onChangeLayoutMode={(m) => {
            if (m === 'freeform' && placementMode !== 'freeform') {
              // 격자 모드에서 자유 모드로 전환 시, 현재 캔버스 상의 각 위젯 실제 화면 위치를 즉시 캡처하여 원래 위치 그대로 보존
              const mainCanvas = document.querySelector('main');
              if (mainCanvas) {
                const canvasRect = mainCanvas.getBoundingClientRect();
                const newPos: Record<string, { x: number; y: number; width?: number; height?: number }> = { ...freeWidgetPositions };

                widgetOrder.forEach((wId) => {
                  const el =
                    document.getElementById(`widget-wrapper-${wId}`) ||
                    document.querySelector(`[data-widget-card-id="${wId}"]`);
                  if (el) {
                    const rect = el.getBoundingClientRect();
                    newPos[wId] = {
                      x: Math.max(10, Math.round(rect.left - canvasRect.left + mainCanvas.scrollLeft)),
                      y: Math.max(10, Math.round(rect.top - canvasRect.top + mainCanvas.scrollTop)),
                      width: Math.max(280, Math.round(rect.width)),
                      height: Math.max(180, Math.round(rect.height)),
                    };
                  }
                });
                setFreeWidgetPositions(newPos);
                try {
                  localStorage.setItem('class_dashboard_free_positions', JSON.stringify(newPos));
                } catch { }
              }
            }
            setPlacementMode(m);
            localStorage.setItem('class_dashboard_placement_mode', m);
          }}
          sidebarLayoutMode={sidebarLayoutMode}
          onChangeSidebarLayoutMode={setSidebarLayoutMode}
          stageManagerMode={config.stageManagerMode ?? true}
          isFocusMode={isFocusMode}
          onToggleFocusMode={handleToggleFocusMode}
          onToggleStageManager={() => {
            setConfig((prev) => {
              const nextMode = !(prev.stageManagerMode ?? false);
              const updated = { ...prev, stageManagerMode: nextMode };
              localStorage.setItem('class_dashboard_config', JSON.stringify(updated));
              showToast(
                nextMode
                  ? '📱 사이드 덱: ON (켜짐 - 접힌 위젯 사이드 덱으로 이동)'
                  : '📱 사이드 덱: OFF (꺼짐 - 캔버스 접힘 유지)'
              );
              return updated;
            });
          }}
          isWidgetMoveSoundEnabled={isWidgetMoveSoundEnabled}
          onToggleWidgetMoveSound={handleToggleWidgetMoveSound}
          onToggleCollapseAll={handleToggleCollapseAllWidgets}
          isAllCollapsed={isAllWidgetsCollapsed}
          onShowToast={showToast}
          dashboardBgOpacity={config.dashboardBgOpacity ?? 0.95}
          widgetOpacity={config.widgetOpacity ?? 0.8}
          fontScale={config.fontScale ?? 1.0}
          onUpdateOpacitySettings={(settings) => {
            updateConfig(settings);
          }}
        />
      )}

      {/* 4. Comprehensive Modals */}
      {/* Praise Ranking Modal (요구사항 10, 첨부 이미지 2) */}
      <SafeBoundary
        name="칭찬 랭킹"
        resetKey={isRankingOpen}
        onError={(m) => {
          setIsRankingOpen(false);
          showToast(m);
        }}
      >
      <PraiseModal
        isOpen={isRankingOpen}
        onClose={() => setIsRankingOpen(false)}
        teams={teams}
        config={config}
        students={students}
        praiseConfigs={config.praiseConfigs || initialPraiseConfigs}
        praiseLogs={praiseHistoryLogs}
        onAwardPraise={handleAwardPraise}
        onAddPoint={handleAddTeamPoint}
        onAddStudentPoint={handleAddStudentPoint}
        onResetAllPoints={() => {
          setStudents((prev) => prev.map((s) => ({ ...s, praisePoints: 0 })));
          setTeams((prev) => prev.map((t) => ({ ...t, points: 0 })));
          setPraiseHistoryLogs([]);
          try {
            localStorage.removeItem('class_dashboard_praise_logs');
          } catch { }
          showToast('🔄 모든 모둠 및 학생의 칭찬 도장이 초기화되었습니다.');
        }}
        onShowToast={showToast}
      />
      </SafeBoundary>

      {/* Settings Modal (Theme + Student batch upload + PDF schedule) */}
      {everClassSettingsModal && (
        <SafeBoundary
          name="환경설정"
          resetKey={isSettingsOpen}
          onError={(m) => {
            setIsSettingsOpen(false);
            showToast(m);
          }}
        >
        <Suspense fallback={null}>
          <ClassSettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            config={config}
            onUpdateConfig={handleUpdateFullConfig}
            students={students}
            onUpdateStudents={setStudents}
            teams={teams}
            onUpdateTeams={setTeams}
            schedule={schedule}
            onUpdateSchedule={setSchedule}
            isWidgetMoveSoundEnabled={isWidgetMoveSoundEnabled}
            onToggleWidgetMoveSound={handleToggleWidgetMoveSound}
            onShowToast={showToast}
          />
        </Suspense>
        </SafeBoundary>
      )}

      {/* AI Assistant Modal (주간학습안내지 분석 알림장 생성 - 요구사항 13) */}
      {everAIAssistantModal && (
        <Suspense fallback={null}>
          <AIAssistantModal
            isOpen={isAIAssistantOpen}
            onClose={() => setIsAIAssistantOpen(false)}
            config={config}
            teams={teams}
            onAddAgenda={handleAddAgenda}
            onShowToast={showToast}
          />
        </Suspense>
      )}

      {/* 학교 메신저 쪽지 AI 등록 모달 (BYOK 연동) */}
      <MessengerNoteModal
        isOpen={isMessengerModalOpen}
        onClose={() => setIsMessengerModalOpen(false)}
        onSaveNote={(newNote) => {
          const item = {
            id: `note_${Date.now()}`,
            ...newNote,
            createdAt: new Date().toISOString().split('T')[0],
          };
          setMessengerNotes((prev) => {
            const updated = [item, ...prev];
            try {
              localStorage.setItem('class_dashboard_messenger_notes', JSON.stringify(updated));
            } catch { }
            return updated;
          });
          showToast(`✉️ [${newNote.sender}] 새 쪽지가 성공적으로 등록되었습니다.`);
        }}
        onShowToast={showToast}
      />

      {/* 종합 메모 작성 및 편집 모달 */}
      <MemoEditModal
        isOpen={isMemoEditModalOpen}
        memo={editingMemo}
        onClose={() => setIsMemoEditModalOpen(false)}
        onSave={handleSaveMemoItem}
      />

      {/* 1인 1역할 상세 종합 관리 모달 */}
      {everClassRolesModal && (
        <Suspense fallback={null}>
          <ClassRolesModal
            isOpen={isRolesModalOpen}
            onClose={() => setIsRolesModalOpen(false)}
            roles={roles}
            onUpdateRoles={setRoles}
            students={students}
            onUpdateStudents={setStudents}
            periodInfo={periodInfo}
            onUpdatePeriodInfo={setPeriodInfo}
            onShowToast={showToast}
            initialTab={rolesModalInitialTab}
            theme={config.theme}
          />
        </Suspense>
      )}

      {/* 학생 관찰기록장 모달 (요구사항 10) */}
      <ObservationModal
        isOpen={isObservationOpen}
        onClose={() => setIsObservationOpen(false)}
        students={students}
        records={observations}
        onUpdateRecords={setObservations}
        onShowToast={showToast}
      />

      {/* 수업 스마트 퀴즈 쇼 모달 (4코너 텔레파시, OX, 객관식, 농구 점수판) */}
      {everQuizModal && (
        <Suspense fallback={null}>
          <QuizModal
            isOpen={isQuizModalOpen}
            onClose={() => setIsQuizModalOpen(false)}
            quizzes={quizzes}
            onUpdateQuizzes={setQuizzes}
            teams={teams}
            onOpenStudentDisplay={() => {
              setIsQuizModalOpen(false);
              handleOpenDualMonitor('quiz');
            }}
            onShowToast={showToast}
          />
        </Suspense>
      )}

      {/* 보조 모니터 팝업 대형 화면 모달 (요구사항 4) */}
      {everDualMonitorPopupModal && (
        <Suspense fallback={null}>
          <DualMonitorPopupModal
            isOpen={isDualMonitorOpen}
            onClose={() => setIsDualMonitorOpen(false)}
            initialTab={dualMonitorTab}
            students={students}
            onUpdateStudentAttendance={handleUpdateStudentAttendance}
            onUpdateStudents={setStudents}
            teams={teams}
            onUpdateTeams={setTeams}
            roles={roles}
            onUpdateRoles={setRoles}
            quizzes={quizzes}
            decibel={currentDecibel}
            onShowToast={showToast}
          />
        </Suspense>
      )}

      {/* 🔒 [Class in] 하이엔드 다크 글로시(Glossy Glassmorphism) 화면 잠금 컴포넌트 */}
      <DynamicIsland />
      <CareCenter config={config} onApplyConfig={updateConfig} onShowToast={showToast} blocked={showIntro || isScreenLocked} />
      <CommandPalette open={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} commands={isPaletteOpen ? buildPaletteCommands() : []} />
      <StickerModeOverlay open={stickerEditing} onAddImage={() => setStickerPickNonce((n) => n + 1)} onExit={() => setStickerEditing(false)} />
      {(collapsePhase === 'out' || collapsePhase === 'in') &&
        createPortal(
          <div className="cl-door-overlay" style={{ left: doorPoint.x, top: doorPoint.y }}>
            <LumiDoor state="open" size={110} />
          </div>,
          document.body
        )}
      {collapsePhase === 'mini' && !miniApi?.enter && createPortal(<MiniLumiWindow inPage onRestore={(p) => expandDashboard(p)} />, document.body)}
      {showIntro && <IntroSplash onStart={lockAfterIntro} onDone={() => setShowIntro(false)} />}
      <ShortcutHelpModal isOpen={isShortcutHelpOpen} onClose={() => setIsShortcutHelpOpen(false)} />

      <GlossyLockScreen
        isLocked={isScreenLocked}
        onUnlock={() => {
          setIsScreenLocked(false);
          // 🌅 잠금 해제: 어두운 화면이 밝기를 되찾으며 천천히 선명해져요
          try {
            const html = document.documentElement;
            html.classList.remove('ci-unlock-fade');
            void html.offsetWidth;
            html.classList.add('ci-unlock-fade');
            window.setTimeout(() => html.classList.remove('ci-unlock-fade'), 2000);
            // 깜깜한 막을 천천히 걷어 내요 (밝기가 먼저 오르고 → 화면이 선명해짐)
            const veil = document.querySelector('.ci-unlock-veil');
            if (veil) {
              requestAnimationFrame(() => veil.classList.add('is-out'));
              window.setTimeout(() => veil.remove(), 2000);
            }
          } catch {}
          playWidgetCascade(null, 220);
          try {
            localStorage.removeItem('ttime_is_locked');
            localStorage.removeItem('class_dashboard_is_screen_locked');
          } catch { }
          lastActivityTimeRef.current = Date.now();
          showToast('🔓 화면 잠금이 정상적으로 해제되었습니다.');
        }}
        onShowToast={showToast}
        initialPin=""
        onCollapse={collapseDashboard}
      />

      {/* 💡 스마트 아이디어 노트 빠른 기록 모달 */}
      <IdeaRecordModal
        isOpen={isIdeaRecordModalOpen}
        onClose={() => {
          setIsIdeaRecordModalOpen(false);
          setEditingIdeaItem(null);
        }}
        initialItem={editingIdeaItem}
        settings={ideaSettings}
        onSaveIdea={handleSaveIdea}
        onShowToast={showToast}
      />

      {/* ⚙️ 아이디어 노트 환경설정 모달 */}
      <IdeaSettingsModal
        isOpen={isIdeaSettingsModalOpen}
        onClose={() => setIsIdeaSettingsModalOpen(false)}
        settings={ideaSettings}
        onSaveSettings={handleSaveIdeaSettings}
        onShowToast={showToast}
      />

      {/* 🤖 T-Ti(티티) AI 인터랙티브 스마트 비서 & 로컬 에이전트 */}
      <TTiAiAssistant
        agendas={agendas}
        students={students}
        config={config}
        schedule={schedule}
        uiTheme={uiTheme}
        onCycleUITheme={handleCycleUITheme}
        onLockScreen={() => {
          setIsScreenLocked(true);
          try {
            localStorage.setItem('ttime_is_locked', 'true');
            localStorage.setItem('class_dashboard_is_screen_locked', 'true');
          } catch { }
          showToast('🔒 화면이 잠겼습니다. PIN 번호로 해제할 수 있습니다.');
        }}
        onShowToast={showToast}
        onTriggerRandomPicker={() => {
          showToast('🎯 발표자 추첨 위젯을 확인해 보세요!');
        }}
        onStartFocusTimer={(mins) => {
          showToast(`⏱️ 집중 ${mins}분 타이머가 준비되었습니다.`);
        }}
        currentToast={toast}
      />

      {/* Floating Interactive Toast Feedback: 모든 시스템/위젯 상태 알림이 AI 캐릭터의 알라딘 램프 반응형 말풍선으로 완전 일원화되어 기존 상단 배너는 숨김 처리되었습니다. */}
    </div>
  );
}
