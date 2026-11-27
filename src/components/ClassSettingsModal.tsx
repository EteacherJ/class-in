import { ScreenStyleSection } from './ScreenStyleSection';
import { SemesterBackupCard } from './SemesterBackupCard';
import { LeaveWorkSettingsCard } from './LeaveWorkSettingsCard';
import { SchoolFinder } from './SchoolFinder';
import { WeatherLocationSetting } from './WeatherLocationSetting';
import { SecretInput } from './SecretInput';
import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Check,
  Target,
  ArrowRight,
  ArrowLeft,
  School,
  Users,
  Award,
  Calendar,
  Sparkles,
  Palette,
  Shuffle,
  Calculator,
  Download,
  Upload,
  FileText,
  Clock,
  Tv,
  Monitor,
  Cloud,
  FileSpreadsheet,
  Trash2,
  Type,
  FolderOpen,
  Layers,
  Lock,
  Shield,
  Key,
  Sun,
  Moon,
  Laptop,
  Plus,
  ExternalLink,
  HelpCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  RefreshCw,
  FileUp,
  Utensils,
  ArrowUp,
  ArrowDown,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Square,
  Copy,
  Keyboard,
} from 'lucide-react';
import { ShortcutList } from './ShortcutList';
import {
  ClassConfig,
  Student,
  Team,
  DailySchedule,
  DashboardTheme,
  ThemeMode,
  PraiseItemConfig,
  SecurityConfig,
  BellScheduleItem,
} from '../types';
import { playWidgetSnapSound } from '../utils/audio';
import { initialPraiseConfigs } from '../data/initialData';
import { FREE_FONTS, getFontFamily } from '../utils/theme';
import {
  getStoredGeminiApiKey,
  setStoredGeminiApiKey,
  testGeminiApiKey,
} from '../utils/geminiApi';
import { verifyPinOrRecovery, setAdminPin, isUsingDefaultPin } from '../utils/pinSecurity';
import {
  exportDashboardBackupFile,
  restoreDashboardBackup,
  getLocalCloudSyncInfo,
  saveLocalCloudSyncInfo,
  CloudSyncInfo,
  GOOGLE_DRIVE_BACKUP_SCRIPT_CODE,
  sendBackupToGoogleDrive,
} from '../utils/cloudSync';

import { getWidgetName } from '../constants/widgetRegistry';
// 💡 시정표 정규화: 점심시간 카드가 항상 포함되도록 보장 (드래그앤드롭 및 개별 시간 입력용)
export const getNormalizedBellSchedule = (
  schedule?: BellScheduleItem[],
  lunchAfter: number = 4
): BellScheduleItem[] => {
  const defaultItems: BellScheduleItem[] = [
    { period: 1, start: '09:00', end: '09:40', breakMinutes: 10, type: 'period' },
    { period: 2, start: '09:50', end: '10:30', breakMinutes: 10, type: 'period' },
    { period: 3, start: '10:40', end: '11:20', breakMinutes: 10, type: 'period' },
    { period: 4, start: '11:30', end: '12:10', breakMinutes: 10, type: 'period' },
    { period: 5, start: '13:00', end: '13:40', breakMinutes: 10, type: 'period' },
    { period: 6, start: '13:50', end: '14:30', breakMinutes: 10, type: 'period' },
  ];

  const source = schedule && schedule.length > 0 ? schedule : defaultItems;
  const hasLunch = source.some((item) => item.type === 'lunch');

  if (hasLunch) {
    return source;
  }

  // 기존 6개 교시만 있는 경우 lunchAfter 뒤에 점심시간 카드 자동 생성 및 삽입
  const result: BellScheduleItem[] = [];
  let lunchInserted = false;
  for (const item of source) {
    result.push({ ...item, type: 'period' });
    if (item.period === lunchAfter && !lunchInserted) {
      result.push({
        period: 0,
        start: item.end || '12:10',
        end: '13:00',
        breakMinutes: 50,
        type: 'lunch',
        label: '점심시간',
      });
      lunchInserted = true;
    }
  }

  if (!lunchInserted) {
    result.push({
      period: 0,
      start: '12:10',
      end: '13:00',
      breakMinutes: 50,
      type: 'lunch',
      label: '점심시간',
    });
  }

  return result;
};

// 두 시간 문자열(HH:mm) 차이 분 계산
export const calculateTimeDiffMinutes = (start: string, end: string): number => {
  try {
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    const diff = (eH * 60 + eM) - (sH * 60 + sM);
    return diff > 0 ? diff : 0;
  } catch {
    return 0;
  }
};

// 🎯 [포커스 딥워크 위젯 프리셋 목록]
export const AVAILABLE_FOCUS_WIDGETS = [
  { id: 'clock', alias: 'pomodoro', name: getWidgetName('clock'), icon: '🍅', desc: '초집중 몰입 뽀모도로 타이머' },
  { id: 'agenda', alias: 'todo', name: getWidgetName('agenda'), icon: '📌', desc: '과제 및 학급 전달 메모' },
  { id: 'timetable', alias: 'timetable', name: getWidgetName('timetable'), icon: '📅', desc: '오늘 및 주간 수업 시간표' },
  { id: 'quote', alias: 'readingNote', name: getWidgetName('quote'), icon: '📖', desc: '독서 기록 및 감동 문장' },
  { id: 'observation', alias: 'observation', name: getWidgetName('observation'), icon: '📝', desc: '관찰기록 및 상담 메모' },
  { id: 'noise', alias: 'noise', name: getWidgetName('noise'), icon: '🔊', desc: '실시간 교실 소음 측정기' },
  { id: 'meal', alias: 'meal', name: getWidgetName('meal'), icon: '🍚', desc: '식단, 칼로리 및 영양 정보' },
  { id: 'attendance', alias: 'attendance', name: getWidgetName('attendance'), icon: '📋', desc: '출결 상태 및 건강 기록' },
  { id: 'roles', alias: 'roles', name: getWidgetName('roles'), icon: '👥', desc: '학급 자치 분담 실천 현황' },
  { id: 'dday', alias: 'dday', name: getWidgetName('dday'), icon: '🎯', desc: '학급 주요 일정 디데이' },
  { id: 'calendar', alias: 'calendar', name: getWidgetName('calendar'), icon: '🗓️', desc: '학교·학급 일정 (구글 캘린더 연동)' },
  { id: 'seating', alias: 'seating', name: getWidgetName('seating'), icon: '🪑', desc: '스마트 좌석 배치' },
  { id: 'picker', alias: 'picker', name: getWidgetName('picker'), icon: '🎲', desc: '무작위 발표자 추첨' },
  { id: 'schoolInfo', alias: 'schoolInfo', name: getWidgetName('schoolInfo'), icon: '🏫', desc: '학교 내선번호 및 조달 바로가기' },
  { id: 'postit', alias: 'postit', name: getWidgetName('postit'), icon: '📝', desc: '바탕화면 퀵 포스트잇 메모' },
  { id: 'seqtimer', alias: 'seqtimer', name: getWidgetName('seqtimer'), icon: '🪜', desc: '준비 → 활동 → 발표 단계별 수업 타이머' },
  { id: 'homework', alias: 'homework', name: getWidgetName('homework'), icon: '📮', desc: '과제 · 알림장 검사 (보조화면 터치 제출)' },
  { id: 'ideanote', alias: 'ideanote', name: getWidgetName('ideanote'), icon: '💡', desc: '카드 스택 및 클립보드 이미지 캡처 아이디어' },
];

interface ClassSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ClassConfig;
  onUpdateConfig: (newConfig: ClassConfig) => void;
  students: Student[];
  onUpdateStudents: (newStudents: Student[]) => void;
  teams: Team[];
  onUpdateTeams: (newTeams: Team[]) => void;
  schedule: DailySchedule;
  onUpdateSchedule: (newSchedule: DailySchedule) => void;
  isWidgetMoveSoundEnabled?: boolean;
  onToggleWidgetMoveSound?: () => void;
  onShowToast: (msg: string) => void;
}

export const ClassSettingsModal: React.FC<ClassSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  students,
  onUpdateStudents,
  teams,
  onUpdateTeams,
  schedule,
  onUpdateSchedule,
  isWidgetMoveSoundEnabled = false,
  onToggleWidgetMoveSound,
  onShowToast,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [aiTimetableNotify, setAiTimetableNotify] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ttime_ai_timetable_notify') !== 'false';
    } catch {
      return true;
    }
  });

  // 🏫 전담모드 담당 학급 목록 및 학급별 학생 명단
  const [subjectClassesList, setSubjectClassesList] = useState<string[]>(() => {
    return (config.subjectClasses && config.subjectClasses.length > 0)
      ? config.subjectClasses
      : ['3-1', '3-2', '4-1', '4-2'];
  });
  const [selectedSubjectClassTab, setSelectedSubjectClassTab] = useState<string>('3-1');
  const [subjectRostersMap, setSubjectRostersMap] = useState<Record<string, Array<{ id: number; number: number; name: string; gender?: 'male' | 'female' }>>>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_subject_rosters');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      '3-1': [
        { id: 1, number: 1, name: '강민준', gender: 'male' },
        { id: 2, number: 2, name: '김서윤', gender: 'female' },
        { id: 3, number: 3, name: '김도윤', gender: 'male' },
        { id: 4, number: 4, name: '김하은', gender: 'female' },
        { id: 5, number: 5, name: '박시우', gender: 'male' },
        { id: 6, number: 6, name: '박지안', gender: 'female' },
      ],
      '3-2': [
        { id: 1, number: 1, name: '권우진', gender: 'male' },
        { id: 2, number: 2, name: '김민서', gender: 'female' },
        { id: 3, number: 3, name: '김주원', gender: 'male' },
        { id: 4, number: 4, name: '문채원', gender: 'female' },
      ],
      '4-1': [
        { id: 1, number: 1, name: '송지호', gender: 'male' },
        { id: 2, number: 2, name: '안소율', gender: 'female' },
        { id: 3, number: 3, name: '윤하람', gender: 'female' },
        { id: 4, number: 4, name: '임예준', gender: 'male' },
      ],
      '4-2': [
        { id: 1, number: 1, name: '장다은', gender: 'female' },
        { id: 2, number: 2, name: '조은우', gender: 'male' },
        { id: 3, number: 3, name: '황나윤', gender: 'female' },
      ],
    };
  });
  const [subjectBulkText, setSubjectBulkText] = useState<string>('');
  const [newClassLabelInput, setNewClassLabelInput] = useState<string>('');

  // Form states
  const [tempConfig, setTempConfig] = useState<ClassConfig>({
    ...config,
    dashboardTitle: config.dashboardTitle ?? 'My Class',
    workDashboardTitle: config.workDashboardTitle ?? 'My Work',
    schoolName: config.schoolName || '초등학교',
    teacherName: config.teacherName || '',
    widgetTextContrast: config.widgetTextContrast || 'auto',
    widgetTextShadow: config.widgetTextShadow ?? false,
    widgetCardSolidBg: config.widgetCardSolidBg ?? false,
    stageManagerMode: config.stageManagerMode ?? false,
    stageManagerOpacity: config.stageManagerOpacity ?? 0.65,
    focusWidgetIds: config.focusWidgetIds || (() => {
      try {
        const saved = localStorage.getItem('focusWidgetIds');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
      return ['clock', 'agenda', 'timetable', 'quote', 'observation'];
    })(),
    themeMode: config.themeMode || 'system',
    boardType: config.boardType || 'smart',
    praiseConfigs: config.praiseConfigs || initialPraiseConfigs,
    securityConfig: config.securityConfig || {
      autoLockMinutes: 0,
      isLocked: false,
      passwordHash: '',
      recoveryGoogleEmail: '',
    },
    googleSheetUrl: config.googleSheetUrl || '',
    attendanceGoogleSheetUrl: config.attendanceGoogleSheetUrl || '',
    attendanceAutoBackupTime: config.attendanceAutoBackupTime || '16:00',
    bellSchedule: getNormalizedBellSchedule(config.bellSchedule, config.lunchAfterPeriod ?? 4),
    bellScheduleAutoRun: config.bellScheduleAutoRun ?? false,
    featuresEnabled: config.featuresEnabled || {
      noiseMonitor: true,
      classRoles: true,
      smartAttendance: true,
      smartQuiz: true,
      spinWheelPicker: true,
      observationLog: true,
      workBoard: true,
      dailyQuote: true,
      schoolInfo: true,
      postItNotes: true,
    },
  });

  // 🔤 모달 열림 시 최신 config 동기화
  useEffect(() => {
    if (isOpen) {
      setTempConfig((prev) => {
        let currentFocus = config.focusWidgetIds;
        if (!currentFocus) {
          try {
            const saved = localStorage.getItem('focusWidgetIds');
            if (saved) currentFocus = JSON.parse(saved);
          } catch (e) {}
        }
        if (!currentFocus) {
          currentFocus = ['clock', 'agenda', 'timetable', 'quote', 'observation'];
        }
        return {
          ...prev,
          ...config,
          focusWidgetIds: currentFocus,
          fontFamily: config.fontFamily || 'pretendard',
        };
      });
    }
  }, [isOpen, config]);

  // 🔤 폰트 선택 시 실시간 대시보드 및 위젯 텍스트 즉각 반영
  const handleSelectFont = (fontId: string) => {
    const updated = { ...tempConfig, fontFamily: fontId };
    setTempConfig(updated);
    onUpdateConfig(updated);
    const activeFont = getFontFamily(fontId);
    document.documentElement.style.setProperty('--app-font-family', activeFont);
    document.documentElement.style.fontFamily = activeFont;
    document.body.style.fontFamily = activeFont;
  };

  // 💡 시정표 드래그앤드롭 순서 변경 상태
  const [draggedScheduleIndex, setDraggedScheduleIndex] = useState<number | null>(null);
  const [dragOverScheduleIndex, setDragOverScheduleIndex] = useState<number | null>(null);

  // 시정표 순서 재배열 & 1교시 순차 자동 정렬 함수
  const handleReorderSchedule = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    const currentList = getNormalizedBellSchedule(tempConfig.bellSchedule, tempConfig.lunchAfterPeriod ?? 4);
    const list = [...currentList];
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);

    // 💡 사용자의 요구사항: "제일 왼쪽에 놓이는 순간 1교시부터 순차적으로 정렬되게 해줘"
    // 점심시간 카드를 제외하고, 왼쪽부터 순서대로 1교시, 2교시, 3교시... 순차적으로 period 번호 자동 재할당!
    let periodCounter = 1;
    let detectedLunchAfter: 3 | 4 = 4;
    const updatedList = list.map((item) => {
      if (item.type === 'lunch') {
        const prevPeriod = Math.max(1, periodCounter - 1);
        detectedLunchAfter = prevPeriod === 3 ? 3 : 4;
        return { ...item, period: 0 };
      } else {
        const p = periodCounter++;
        return { ...item, period: p, type: 'period' as const };
      }
    });

    setTempConfig({
      ...tempConfig,
      bellSchedule: updatedList,
      lunchAfterPeriod: detectedLunchAfter,
    });
  };

  // 터치/버튼 조작용 시정표 좌/우 한 칸 이동 함수
  const handleMoveScheduleStep = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    const currentList = getNormalizedBellSchedule(tempConfig.bellSchedule, tempConfig.lunchAfterPeriod ?? 4);
    if (targetIndex < 0 || targetIndex >= currentList.length) return;
    handleReorderSchedule(index, targetIndex);
  };

  // 점심시간 시작/종료 시간 직접 변경 함수
  const handleLunchTimeChange = (index: number, newStart: string, newEnd: string) => {
    const currentList = getNormalizedBellSchedule(tempConfig.bellSchedule, tempConfig.lunchAfterPeriod ?? 4);
    const updated = [...currentList];
    const diff = calculateTimeDiffMinutes(newStart, newEnd);
    updated[index] = {
      ...updated[index],
      start: newStart,
      end: newEnd,
      breakMinutes: diff > 0 ? diff : updated[index].breakMinutes,
    };
    setTempConfig({ ...tempConfig, bellSchedule: updated });
  };

  const [tempStudents, setTempStudents] = useState<Student[]>([...students]);
  const [tempTeams, setTempTeams] = useState<Team[]>([...teams]);
  const [tempSchedule, setTempSchedule] = useState<DailySchedule>({ ...schedule });

  // 🔄 창을 열 때마다 지금 학생 명단 · 모둠 · 시간표로 새로 시작
  //    (예전에는 처음 연 순간의 명단을 계속 들고 있다가 저장 때 덮어써서, 그 사이 바뀐
  //     자리 배치 · 출결 · 칭찬 점수가 되돌아가거나 출석번호가 예전 값으로 돌아갔어요)
  useEffect(() => {
    if (!isOpen) return;
    setTempStudents([...students]);
    setTempTeams([...teams]);
    setTempSchedule({ ...schedule });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // 칭찬 항목 커스텀 입력 상태 (첨부 이미지 2, 3 요구사항)
  const [newPraiseLabel, setNewPraiseLabel] = useState<string>('');
  const [newPraisePoints, setNewPraisePoints] = useState<number>(1);
  const [newPraiseIcon, setNewPraiseIcon] = useState<string>('⭐');

  // 비밀번호 변경 및 보안 폼 상태 (요구사항 8)
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [issuedRecoveryCode, setIssuedRecoveryCode] = useState('');
  const [backupPassphrase, setBackupPassphrase] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');

  // 구글 스프레드시트 동기화 테스트 상태 (요구사항 9)
  const [isTestingGoogleSync, setIsTestingGoogleSync] = useState<boolean>(false);
  const [googleSyncTestSuccess, setGoogleSyncTestSuccess] = useState<boolean | null>(null);
  const [isTestingAttendanceSync, setIsTestingAttendanceSync] = useState<boolean>(false);

  // BYOK Gemini API 키 상태
  const [geminiKeyInput, setGeminiKeyInput] = useState<string>(() => getStoredGeminiApiKey());
  const [showGeminiKey, setShowGeminiKey] = useState<boolean>(false);
  const [isTestingGemini, setIsTestingGemini] = useState<boolean>(false);
  const [geminiTestStatus, setGeminiTestStatus] = useState<{ success: boolean; message: string } | null>(null);


  // 클라우드 동기화 상태
  const [cloudSyncInfo, setCloudSyncInfo] = useState<CloudSyncInfo>(() => getLocalCloudSyncInfo());
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);
  const [googleDriveBackupUrl, setGoogleDriveBackupUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('ttime_gdrive_backup_url') || '';
    } catch {
      return '';
    }
  });
  const [isSendingDriveBackup, setIsSendingDriveBackup] = useState<boolean>(false);

  // 주간학습안내 PDF 업로드 상태
  const [weeklyPdfName, setWeeklyPdfName] = useState<string>(() => config.weeklySchedulePdfName || '');
  const [weeklyPdfUrl, setWeeklyPdfUrl] = useState<string>(() => config.weeklySchedulePdfUrl || '');

  // Bulk student text input state
  const [bulkStudentText, setBulkStudentText] = useState<string>('');
  const [newStudentName, setNewStudentName] = useState<string>('');

  // 🎨 대시보드 전체 테마와 어울리는 색상 및 투명도 원클릭 자동 조절 로직 (사용자 요청 사항)
  const handleAutoAdjustThemeColors = () => {
    const currentTheme = tempConfig.theme || 'slate';
    const isDark = tempConfig.themeMode === 'dark';

    // 🌙 다크 모드일 때는 어떤 색상 테마를 선택하든 첨부 이미지의 Deep Midnight Cinema(#080c16) 단일 톤 100% 유지!
    if (isDark) {
      const updated = {
        ...tempConfig,
        dashboardBgColor: '', // 테마 기본 다크 시네마(#080c16) 배경 유지
        dashboardBgOpacity: 0.92,
        widgetOpacity: 0.92,
      };
      setTempConfig(updated);
      onUpdateConfig(updated);
      onShowToast?.(`✨ [다크 모드]: 첨부 이미지와 같은 프리미엄 딥 미드나잇 시네마 컬러(#080c16)로 최적화되었습니다.`);
      return;
    }

    let suggestedColor = '';
    let suggestedBgOpacity = 0.95;
    let suggestedWidgetOpacity = 0.95;

    switch (currentTheme) {
      case 'elementary':
        suggestedColor = '';
        suggestedBgOpacity = 0.95;
        suggestedWidgetOpacity = 0.96;
        break;
      case 'pastel':
        suggestedColor = '';
        suggestedBgOpacity = 0.95;
        suggestedWidgetOpacity = 0.96;
        break;
      case 'indigo':
        suggestedColor = '';
        suggestedBgOpacity = 0.92;
        suggestedWidgetOpacity = 0.92;
        break;
      case 'emerald':
        suggestedColor = '';
        suggestedBgOpacity = 0.92;
        suggestedWidgetOpacity = 0.92;
        break;
      case 'sunset':
        suggestedColor = '';
        suggestedBgOpacity = 0.92;
        suggestedWidgetOpacity = 0.94;
        break;
      case 'lavender':
        suggestedColor = '';
        suggestedBgOpacity = 0.92;
        suggestedWidgetOpacity = 0.94;
        break;
      case 'cafe':
        suggestedColor = '';
        suggestedBgOpacity = 0.94;
        suggestedWidgetOpacity = 0.95;
        break;
      case 'office':
        suggestedColor = '';
        suggestedBgOpacity = 0.95;
        suggestedWidgetOpacity = 0.95;
        break;
      case 'glassmorphism':
      case 'slate':
      default:
        suggestedColor = '';
        suggestedBgOpacity = 0.85; // 프로스티드 오로라 글래스 효과를 위한 최적의 투명도
        suggestedWidgetOpacity = 0.80; // 부드러운 반투명 유리 카드 질감
        break;
    }

    const updated = {
      ...tempConfig,
      dashboardBgColor: suggestedColor,
      dashboardBgOpacity: suggestedBgOpacity,
      widgetOpacity: suggestedWidgetOpacity,
    };
    setTempConfig(updated);
    onUpdateConfig(updated);
    onShowToast?.(`✨ [${currentTheme}] 테마에 최적화된 배경색과 투명도로 자동 조절되었습니다.`);
  };

  // Timetable setup sub-tab
  const [scheduleMethod, setScheduleMethod] = useState<'manual' | 'pdf' | 'gdrive'>('manual');
  const [gdriveFolderUrl, setGdriveFolderUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('ttime_gdrive_timetable_url') || '';
    } catch {
      return '';
    }
  });
  const [gdriveFolderId, setGdriveFolderId] = useState<string>(() => {
    try {
      return localStorage.getItem('ttime_gdrive_folder_id') || '';
    } catch {
      return '';
    }
  });
  const [isGdriveFolderVerified, setIsGdriveFolderVerified] = useState<boolean>(() => {
    try {
      const savedId = localStorage.getItem('ttime_gdrive_folder_id');
      const savedUrl = localStorage.getItem('ttime_gdrive_timetable_url');
      return Boolean(savedId && savedUrl);
    } catch {
      return false;
    }
  });
  // 주간학습안내 판독 상태
  const [pdfParseState, setPdfParseState] = useState<{ status: 'idle' | 'reading' | 'done' | 'error'; message: string }>({ status: 'idle', message: '' });
  const [gdriveState, setGdriveState] = useState<{ status: 'idle' | 'reading' | 'found' | 'notfound' | 'error'; message: string; count?: number }>({ status: 'idle', message: '' });
  const [gdriveAutoSync, setGdriveAutoSync] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ttime_gdrive_auto_sync') !== 'false';
    } catch {
      return true;
    }
  });
  const [pdfWeekStartDate, setPdfWeekStartDate] = useState<string>(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    const m = String(monday.getMonth() + 1).padStart(2, '0');
    const d = String(monday.getDate()).padStart(2, '0');
    return `${monday.getFullYear()}-${m}-${d}`;
  });
  const [pdfUploadedFileName, setPdfUploadedFileName] = useState<string>('');

  // Team Distribution Mode & Calculator State
  const [teamDistMode, setTeamDistMode] = useState<'auto' | 'manual'>('auto');
  const [targetTeamCount, setTargetTeamCount] = useState<number>(tempTeams.length || 6);
  const [manualTeamCounts, setManualTeamCounts] = useState<Record<number, number>>(() => {
    const initialCounts: Record<number, number> = {};
    (tempTeams.length ? tempTeams : [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]).forEach((t, idx) => {
      initialCounts[t.id || idx + 1] = 4;
    });
    return initialCounts;
  });

  // Roster clear confirmation state (iframe-safe)
  const [isConfirmingClearRoster, setIsConfirmingClearRoster] = useState<boolean>(false);

  // 명렬표 보기 정렬
  const [rosterSort, setRosterSort] = useState<'number' | 'team' | 'name' | 'gender' | 'birth'>(() => {
    try {
      return (localStorage.getItem('class_roster_sort') as any) || 'number';
    } catch {
      return 'number';
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('class_roster_sort', rosterSort);
    } catch {}
  }, [rosterSort]);

  // ② PDF 판독 결과 (반영할 때 교시별 학습 내용도 함께 저장)
  const pdfPlanRef = useRef<import('../utils/weeklyPlanParser').ParsedWeeklyPlan | null>(null);
  if (!isOpen) return null;

  const handleQuickFinish = () => {
    onUpdateConfig(tempConfig);
    if (tempConfig.focusWidgetIds) {
      try {
        localStorage.setItem('focusWidgetIds', JSON.stringify(tempConfig.focusWidgetIds));
      } catch (e) {}
    }
    const activeFont = getFontFamily(tempConfig.fontFamily);
    document.documentElement.style.setProperty('--app-font-family', activeFont);
    document.documentElement.style.fontFamily = activeFont;
    document.body.style.fontFamily = activeFont;
    onUpdateStudents(tempStudents);
    onUpdateTeams(tempTeams);
    onUpdateSchedule(tempSchedule);
    onShowToast('⚡ 변경 사항을 저장하고 환경설정을 완료했습니다.');
    onClose();
  };

  const handleSaveAndNext = () => {
    onUpdateConfig(tempConfig);
    if (tempConfig.focusWidgetIds) {
      try {
        localStorage.setItem('focusWidgetIds', JSON.stringify(tempConfig.focusWidgetIds));
      } catch (e) {}
    }
    const activeFont = getFontFamily(tempConfig.fontFamily);
    document.documentElement.style.setProperty('--app-font-family', activeFont);
    document.documentElement.style.fontFamily = activeFont;
    document.body.style.fontFamily = activeFont;
    onUpdateStudents(tempStudents);
    onUpdateTeams(tempTeams);
    onUpdateSchedule(tempSchedule);

    // 🏫 전담모드 학급 및 명단 로컬스토리지 동기화
    try {
      localStorage.setItem('class_dashboard_subject_rosters', JSON.stringify(subjectRostersMap));
      localStorage.setItem('ttime_teacher_mode', tempConfig.teacherMode || 'homeroom');
      localStorage.setItem('class_dashboard_teacher_mode', tempConfig.teacherMode || 'homeroom');
    } catch {}

    // 🔑 5단계(보안·구글)에서 넘어갈 때 Gemini 키도 바로 저장 (6단계는 단축키 안내)
    if (currentStep === 5 && geminiKeyInput.trim()) {
      setStoredGeminiApiKey(geminiKeyInput.trim());
    }
    if (currentStep < 6) {
      // ⚡ 전담모드일 때 3단계(모둠 편성 & 칭찬) 스킵 지원
      if (currentStep === 2 && tempConfig.teacherMode === 'subject') {
        setCurrentStep(4);
      } else {
        setCurrentStep((prev) => prev + 1);
      }
    } else {
      if (geminiKeyInput.trim()) {
        setStoredGeminiApiKey(geminiKeyInput.trim());
      }
      onShowToast('✅ 모든 학급 설정이 성공적으로 저장되었습니다!');
      onClose();
    }
  };

  // 🏫 전담모드: 학급 추가
  const handleAddSubjectClass = () => {
    const trimmed = newClassLabelInput.trim();
    if (!trimmed) return;
    if (subjectClassesList.includes(trimmed)) {
      onShowToast('⚠️ 이미 존재하는 학급 라벨입니다.');
      return;
    }
    const nextList = [...subjectClassesList, trimmed];
    setSubjectClassesList(nextList);
    setTempConfig((prev) => ({ ...prev, subjectClasses: nextList }));
    setSelectedSubjectClassTab(trimmed);
    setNewClassLabelInput('');
    onShowToast(`🏫 [${trimmed}] 학급이 추가되었습니다.`);
  };

  // 🏫 전담모드: 학급 삭제
  const handleRemoveSubjectClass = (clsName: string) => {
    if (subjectClassesList.length <= 1) {
      onShowToast('⚠️ 최소 1개 이상의 담당 학급이 필요합니다.');
      return;
    }
    const nextList = subjectClassesList.filter((c) => c !== clsName);
    setSubjectClassesList(nextList);
    setTempConfig((prev) => ({ ...prev, subjectClasses: nextList }));
    if (selectedSubjectClassTab === clsName) {
      setSelectedSubjectClassTab(nextList[0]);
    }
    onShowToast(`🗑️ [${clsName}] 학급이 삭제되었습니다.`);
  };

  // 🏫 전담모드: 학생 명단 일괄 파싱 (기본 양식: 학년,반,번호,이름,성별)
  const handleParseSubjectBulkRoster = () => {
    if (!subjectBulkText.trim()) return;
    const lines = subjectBulkText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const updatedMap = { ...subjectRostersMap };
    let parsedCount = 0;
    const currentClassList = [...subjectClassesList];

    lines.forEach((line) => {
      // 쉼표, 탭으로 분리
      const parts = line.split(/[,\t]+/).map((p) => p.trim()).filter(Boolean);

      // 케이스 1: 학년, 반, 번호, 이름, 성별 (4~5개 이상)
      if (parts.length >= 4 && (parts[0].match(/^\d+$/) || parts[0].includes('학년'))) {
        const grade = parts[0].replace(/[^0-9]/g, '');
        const classNum = parts[1].replace(/[^0-9]/g, '');
        const targetClass = `${grade}-${classNum}`;
        const num = parseInt(parts[2].replace(/[^0-9]/g, ''), 10) || 1;
        const name = parts[3];
        const rawGender = parts[4] || '';
        const gender: 'male' | 'female' = rawGender.includes('여') || rawGender.toLowerCase() === 'f' ? 'female' : 'male';

        if (!currentClassList.includes(targetClass)) {
          currentClassList.push(targetClass);
        }
        if (!updatedMap[targetClass]) {
          updatedMap[targetClass] = [];
        }
        updatedMap[targetClass].push({
          id: Date.now() + Math.random(),
          number: num,
          name,
          gender,
        });
        parsedCount++;
      } else if (parts.length >= 2 && !isNaN(parseInt(parts[0], 10))) {
        // 케이스 2: 번호, 이름, 성별 (현재 선택된 학급 탭에 추가)
        const num = parseInt(parts[0], 10);
        const name = parts[1];
        const rawGender = parts[2] || '';
        const gender: 'male' | 'female' = rawGender.includes('여') || rawGender.toLowerCase() === 'f' ? 'female' : 'male';
        if (!updatedMap[selectedSubjectClassTab]) {
          updatedMap[selectedSubjectClassTab] = [];
        }
        updatedMap[selectedSubjectClassTab].push({
          id: Date.now() + Math.random(),
          number: num,
          name,
          gender,
        });
        parsedCount++;
      } else {
        // 케이스 3: 공백으로 나열된 학생 이름들 (현재 선택된 학급 탭에 추가)
        const names = line.split(/[\s,]+/).filter(Boolean);
        if (!updatedMap[selectedSubjectClassTab]) {
          updatedMap[selectedSubjectClassTab] = [];
        }
        names.forEach((name) => {
          const currentList = updatedMap[selectedSubjectClassTab];
          const nextNum = currentList.length > 0 ? Math.max(...currentList.map((s) => s.number)) + 1 : 1;
          currentList.push({
            id: Date.now() + Math.random(),
            number: nextNum,
            name,
            gender: 'male',
          });
          parsedCount++;
        });
      }
    });

    setSubjectRostersMap(updatedMap);
    setSubjectClassesList(currentClassList);
    setTempConfig((prev) => ({ ...prev, subjectClasses: currentClassList }));
    try {
      localStorage.setItem('class_dashboard_subject_rosters', JSON.stringify(updatedMap));
    } catch {}
    setSubjectBulkText('');
    onShowToast(`🎉 총 ${parsedCount}명의 학생이 전담 명단에 성공적으로 등록되었습니다.`);
  };

  // 1. Single student add
  const handleAddStudent = () => {
    if (!newStudentName.trim()) return;
    const nextNumber = tempStudents.length > 0 ? Math.max(...tempStudents.map((s) => s.number)) + 1 : 1;
    const newStudent: Student = {
      id: Date.now(),
      number: nextNumber,
      name: newStudentName.trim(),
      gender: 'M',
      birthDate: '2017-03-01',
      teamId: 1,
      attendance: 'present',
      praisePoints: 0,
      selectedCount: 0,
    };
    setTempStudents([...tempStudents, newStudent]);
    setNewStudentName('');
  };

  // 2. Bulk students add via space-separated string
  const handleBulkAddStudents = () => {
    if (!bulkStudentText.trim()) return;
    // Split by whitespace, comma, or newline
    const names = bulkStudentText
      .split(/[\s,\n]+/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (names.length === 0) return;

    let startNum = tempStudents.length > 0 ? Math.max(...tempStudents.map((s) => s.number)) + 1 : 1;
    const newStudents: Student[] = names.map((name, idx) => ({
      id: Date.now() + idx,
      number: startNum + idx,
      name,
      gender: idx % 2 === 0 ? 'M' : 'F',
      birthDate: `2017-0${((idx % 9) + 1)}-15`,
      teamId: (idx % (tempTeams.length || 4)) + 1,
      attendance: 'present',
      praisePoints: 0,
      selectedCount: 0,
    }));

    setTempStudents([...tempStudents, ...newStudents]);
    setBulkStudentText('');
    onShowToast(`🎉 총 ${names.length}명의 학생 명단이 일괄 생성되었습니다!`);
  };

  // 3. Download Student Template CSV (UTF-8 BOM 필수 적용)
  const handleDownloadTemplate = () => {
    const headerRow = '번호,이름,성별(남/여),생년월일(YYYY-MM-DD)';
    const sampleRows =
      '1,김민수,남,2017-03-12\n' +
      '2,이서아,여,2017-05-24\n' +
      '3,박도윤,남,2017-08-19\n' +
      '4,최지우,여,2017-11-03\n' +
      '5,정도현,남,2017-02-15';

    const csvContent = '\uFEFF' + headerRow + '\n' + sampleRows;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '학급_학생명단_등록양식.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast('📥 학생명단 기본 엑셀/스프레드시트 양식이 다운로드되었습니다.');
  };

  // 4. Upload Student CSV / Excel (EUC-KR 및 UTF-8 자동 판별)
  const handleUploadStudentFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      if (!buffer) return;

      // 🔍 엑셀 CSV 한글 인코딩(UTF-8 / EUC-KR / CP949) 자동 감지 디코딩
      let text = '';
      try {
        const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
        text = utf8Decoder.decode(buffer);
      } catch {
        // UTF-8 디코딩 실패 시 한국 엑셀 기본 규격인 euc-kr로 자동 디코딩
        const eucKrDecoder = new TextDecoder('euc-kr');
        text = eucKrDecoder.decode(buffer);
      }

      // 만약 UTF-8로 시도했으나 깨진 문자(\uFFFD)가 포함되어 있다면 euc-kr로 재시도
      if (text.includes('\uFFFD')) {
        try {
          const eucKrDecoder = new TextDecoder('euc-kr');
          const fallbackText = eucKrDecoder.decode(buffer);
          if (!fallbackText.includes('\uFFFD')) {
            text = fallbackText;
          }
        } catch {}
      }

      // 첫 머리 UTF-8 BOM(\uFEFF) 제거
      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
      }

      const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
      const parsed: Student[] = [];

      // Skip header line if contains '이름' or '번호'
      const startIndex = lines[0].includes('이름') || lines[0].includes('번호') ? 1 : 0;
      for (let i = startIndex; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
        if (parts.length >= 2) {
          const num = parseInt(parts[0], 10) || parsed.length + 1;
          const name = parts[1];
          const genderStr = parts[2] || '남';
          const gender: 'M' | 'F' | 'A' = genderStr.includes('여') ? 'F' : 'M';
          const birthDate = parts[3] || '2017-03-01';

          if (name) {
            parsed.push({
              id: Date.now() + i,
              number: num,
              name,
              gender,
              birthDate,
              teamId: (i % (tempTeams.length || 4)) + 1,
              attendance: 'present',
              praisePoints: 0,
              selectedCount: 0,
            });
          }
        }
      }

      if (parsed.length > 0) {
        setTempStudents(parsed);
        onShowToast(`📊 스프레드시트 양식에서 ${parsed.length}명의 명단이 성공적으로 등록되었습니다!`);
      } else {
        onShowToast('⚠️ 파일 양식을 확인해주세요. (쉼표 구분: 번호,이름,성별,생년월일)');
      }

      // 동일 파일 재업로드를 위해 input 초기화
      e.target.value = '';
    };

    reader.readAsArrayBuffer(file);
  };

  const handleRemoveStudent = (id: number) => {
    setTempStudents(tempStudents.filter((s) => s.id !== id));
  };

  const handleStudentFieldChange = (
    id: number,
    field: 'name' | 'number' | 'gender' | 'birthDate' | 'teamId',
    val: string | number
  ) => {
    setTempStudents(
      tempStudents.map((s) => (s.id === id ? { ...s, [field]: val } : s))
    );
  };

  // Smart team balance calculator
  const calculateDistribution = (total: number, numTeams: number) => {
    if (numTeams <= 0) return [];
    const base = Math.floor(total / numTeams);
    const remainder = total % numTeams;
    const sizes = Array(numTeams).fill(base);
    for (let i = 0; i < remainder; i++) {
      sizes[i] += 1;
    }
    return sizes;
  };

  // 3단계 모둠 즉시 자동 분배 (희망 모둠 수에 맞춰 균형 배분)
  const handleApplySmartTeams = () => {
    const totalStudents = tempStudents.length;
    if (totalStudents === 0) {
      onShowToast('⚠️ 2단계에서 학생 명단을 먼저 입력해주세요.');
      return;
    }
    const teamSizes = calculateDistribution(totalStudents, targetTeamCount);

    const teamColors = [
      { name: '파랑', dot: 'bg-indigo-500', badge: 'text-indigo-600 bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700' },
      { name: '초록', dot: 'bg-emerald-500', badge: 'text-emerald-600 bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
      { name: '노랑', dot: 'bg-amber-500', badge: 'text-amber-600 bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
      { name: '빨강', dot: 'bg-rose-500', badge: 'text-rose-600 bg-rose-50', border: 'border-rose-200', text: 'text-rose-700' },
      { name: '하늘', dot: 'bg-sky-500', badge: 'text-sky-600 bg-sky-50', border: 'border-sky-200', text: 'text-sky-700' },
      { name: '보라', dot: 'bg-purple-500', badge: 'text-purple-600 bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
      { name: '청록', dot: 'bg-teal-500', badge: 'text-teal-600 bg-teal-50', border: 'border-teal-200', text: 'text-teal-700' },
      { name: '주황', dot: 'bg-orange-500', badge: 'text-orange-600 bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
    ];

    const newTeams: Team[] = Array.from({ length: targetTeamCount }, (_, i) => {
      const existing = tempTeams[i];
      const color = teamColors[i % teamColors.length];
      return {
        id: i + 1,
        name: existing ? existing.name : `${i + 1}모둠`,
        colorName: existing ? existing.colorName : color.name,
        badgeBg: existing ? existing.badgeBg : color.badge,
        borderColor: existing ? existing.borderColor : color.border,
        textColor: existing ? existing.textColor : color.text,
        points: existing ? existing.points : 0,
        goalPoints: existing ? existing.goalPoints : 10,
        reward: existing ? existing.reward : '간식 타임',
        dotColor: color.dot,
      };
    });

    // 각 모둠별 인원수 카운트 동기화
    const newCounts: Record<number, number> = {};
    newTeams.forEach((t, idx) => {
      newCounts[t.id] = teamSizes[idx] || 0;
    });
    setManualTeamCounts(newCounts);

    const updatedStudents = tempStudents.map((st, sIdx) => {
      let accumulated = 0;
      let assignedTeamId = 1;
      for (let t = 0; t < teamSizes.length; t++) {
        accumulated += teamSizes[t];
        if (sIdx < accumulated) {
          assignedTeamId = t + 1;
          break;
        }
      }
      return { ...st, teamId: assignedTeamId };
    });

    setTempTeams(newTeams);
    setTempStudents(updatedStudents);
    onShowToast(`🎯 총 ${totalStudents}명이 ${targetTeamCount}개 모둠으로 고르게 즉시 자동 분배되었습니다.`);
  };

  // 모둠별 인원수 증감 ([-] [+] 버튼 및 직접 입력) 핸들러
  const handleAdjustTeamCount = (teamId: number, delta: number) => {
    const current = manualTeamCounts[teamId] ?? 0;
    const nextCount = Math.max(0, current + delta);
    const updatedCounts = { ...manualTeamCounts, [teamId]: nextCount };
    setManualTeamCounts(updatedCounts);
    applyDistributionFromCounts(updatedCounts);
  };

  const handleManualCountChange = (teamId: number, valueStr: string) => {
    const val = Math.max(0, parseInt(valueStr, 10) || 0);
    const updatedCounts = { ...manualTeamCounts, [teamId]: val };
    setManualTeamCounts(updatedCounts);
    applyDistributionFromCounts(updatedCounts);
  };

  // 입력된 인원수에 맞춰 학생들을 모둠별로 순차 배분
  const applyDistributionFromCounts = (counts: Record<number, number>) => {
    const updatedStudents = tempStudents.map((st, idx) => {
      let assignedTeamId = tempTeams[0]?.id || 1;
      let acc = 0;
      for (let i = 0; i < tempTeams.length; i++) {
        const tid = tempTeams[i].id;
        const cap = counts[tid] || 0;
        acc += cap;
        if (idx < acc) {
          assignedTeamId = tid;
          break;
        }
      }
      return { ...st, teamId: assignedTeamId };
    });
    setTempStudents(updatedStudents);
  };

  // User manual team distribution: partition students by user-specified team counts
  const handleApplyManualTeams = () => {
    const totalStudents = tempStudents.length;
    if (totalStudents === 0) {
      onShowToast('⚠️ 먼저 2단계에서 학생 명단을 입력해주세요.');
      return;
    }

    const teamSizes = tempTeams.map((t) => Number(manualTeamCounts[t.id]) || 0);
    const sumSpecified = teamSizes.reduce((acc, c) => acc + c, 0);

    if (sumSpecified === 0) {
      onShowToast('⚠️ 모둠별 학생 인원 수를 1명 이상 입력해주세요.');
      return;
    }

    applyDistributionFromCounts(manualTeamCounts);
    onShowToast(`👥 입력하신 모둠별 인원수대로 총 ${totalStudents}명의 학생이 배정되었습니다!`);
  };

  // 📅 현재 시스템 날짜 기준 이번 주 정보 자동 계산 (월~금 날짜, 주차, 파일명 규격)
  const getThisWeekAutoInfo = () => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);

    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    const mYear = monday.getFullYear();
    const mMonth = monday.getMonth() + 1;
    const mDate = monday.getDate();
    const fMonth = friday.getMonth() + 1;
    const fDate = friday.getDate();

    // 1학기는 3월 1일 기준, 2학기는 8월 20일 기준 주차 계산
    const isSecondSemester = mMonth >= 8;
    const semesterStart = isSecondSemester
      ? new Date(mYear, 7, 24) // 8월 하순 개학 기준
      : new Date(mYear, 2, 2); // 3월 초 개학 기준

    const diffWeeks = Math.max(1, Math.ceil((monday.getTime() - semesterStart.getTime()) / (7 * 24 * 60 * 60 * 1000)));
    const semesterName = isSecondSemester ? '2학기' : '1학기';

    const mondayStr = `${mYear}-${String(mMonth).padStart(2, '0')}-${String(mDate).padStart(2, '0')}`;
    const fridayStr = `${friday.getFullYear()}-${String(fMonth).padStart(2, '0')}-${String(fDate).padStart(2, '0')}`;
    const weekLabel = `${mMonth}월 ${mDate}일 ~ ${fMonth}월 ${fDate}일 주간`;
    void semesterName;

    return {
      mondayStr,
      fridayStr,
      weekLabel,
      diffWeeks,
      mMonth,
      mDate,
      fMonth,
      fDate,
    };
  };

  const sortRoster = (list: Student[], mode: typeof rosterSort) => {
    const byNum = (a: Student, b: Student) => a.number - b.number;
    const birthKey = (st: Student) => (st.birthDate ? st.birthDate.slice(5) : '99-99'); // 월-일 순
    return [...list].sort((a, b) => {
      if (mode === 'team') return (a.teamId || 99) - (b.teamId || 99) || byNum(a, b);
      if (mode === 'name') return a.name.localeCompare(b.name, 'ko') || byNum(a, b);
      if (mode === 'gender') return a.gender.localeCompare(b.gender) || byNum(a, b);
      if (mode === 'birth') return birthKey(a).localeCompare(birthKey(b)) || byNum(a, b);
      return byNum(a, b);
    });
  };

  // ── 주간학습안내 → 시간표 공통 반영 (설정 창 · 대시보드 · 저장소 · 루미 알림) ──
  const applyScheduleEverywhere = (sched: DailySchedule, lumiMsg: string) => {
    setTempSchedule(sched);
    onUpdateSchedule(sched);
    try {
      localStorage.setItem('class_dashboard_schedule', JSON.stringify(sched));
      localStorage.setItem('smart_dashboard_timetable', JSON.stringify(sched));
    } catch {}
    window.dispatchEvent(new CustomEvent('class-schedule-updated', { detail: sched }));
    window.dispatchEvent(new CustomEvent('ttime-lumi-trigger', { detail: { trigger: 'speech', message: lumiMsg } }));
  };

  // ② PDF/사진 주간학습안내 올리기 → 실제 판독 → 아래 표에 미리 채움 (반영 버튼으로 확정)
  const handlePdfFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPdfUploadedFileName(file.name);
    setPdfParseState({ status: 'reading', message: '표를 읽는 중이에요…' });
    try {
      const { readWeeklyPlanBytes } = await import('../utils/weeklyPlanLoader');
      const r = await readWeeklyPlanBytes(await file.arrayBuffer(), file.name, file.type);
      if (!r.ok || !r.schedule) {
        setPdfParseState({ status: 'error', message: r.message });
        onShowToast(`⚠️ ${r.message}`);
        return;
      }
      setTempSchedule(r.schedule);
      pdfPlanRef.current = r.plan || null;
      if (r.weekStart) setPdfWeekStartDate(r.weekStart);
      setPdfParseState({
        status: 'done',
        message: `${r.via === 'ai' ? '🤖 AI 판독' : '📄 표 판독'} 완료: ${r.message} 아래 표를 확인·수정한 뒤 [분석 반영]을 눌러 주세요.`,
      });
      onShowToast(`🟢 [${file.name}] ${r.message} 확인 후 [시작일 기준 주간시간표 분석 반영]을 눌러 주세요.`);
    } catch (err: any) {
      const msg = `파일을 읽지 못했어요: ${err?.message || err}`;
      setPdfParseState({ status: 'error', message: msg });
      onShowToast(`🔴 ${msg}`);
    }
  };

  // ② 판독(또는 직접 수정)한 표를 대시보드에 반영
  const handleApplyPdfSchedule = () => {
    if (pdfParseState.status !== 'done') {
      onShowToast('⚠️ 먼저 [📂 파일 업로드]로 주간학습안내 파일을 올려 주세요.');
      return;
    }
    applyScheduleEverywhere(tempSchedule, '주간학습안내 시간표가 반영되었어요! 📚');
    try {
      localStorage.setItem('ttime_weekly_plan_week', pdfWeekStartDate);
    } catch {}
    // 📚 교시별 학습 내용 · 쪽수 → 보조화면 쉬는 시간 '다음 수업 안내'에 연결
    if (pdfPlanRef.current) {
      const plan = pdfPlanRef.current;
      void Promise.all([import('../utils/weeklyPlanLoader'), import('../utils/weeklyPlanDetail')]).then(([l, d]) =>
        d.saveWeeklyPlanDetail(l.planToDetail(plan, pdfWeekStartDate)),
      );
    }
    onShowToast(`📄 [${pdfWeekStartDate} 주간] 시간표를 대시보드 시간표 위젯에 반영했습니다.`);
  };

  // ③ 구글 드라이브 공유 폴더 확인 (실제로 목록을 읽고 이번 주 파일을 찾음)
  const handleVerifyGdriveFolder = async () => {
    const { extractDriveFolderId, findWeekFileInFolder } = await import('../utils/weeklyPlanLoader');
    const id = extractDriveFolderId(gdriveFolderUrl);
    if (!id) {
      setIsGdriveFolderVerified(false);
      onShowToast('❌ 구글 드라이브 공유 폴더 주소(…/drive/folders/…)를 붙여 넣어 주세요.');
      return;
    }
    setGdriveState({ status: 'reading', message: '폴더를 확인하는 중이에요…' });
    const r = await findWeekFileInFolder(id);
    if (!r.files && !r.ok) {
      setIsGdriveFolderVerified(false);
      setGdriveState({ status: 'error', message: r.message });
      onShowToast(`⚠️ ${r.message}`);
      return;
    }
    setGdriveFolderId(id);
    setIsGdriveFolderVerified(true);
    try {
      localStorage.setItem('ttime_gdrive_folder_id', id);
      localStorage.setItem('ttime_gdrive_timetable_url', gdriveFolderUrl.trim());
    } catch {}
    setGdriveState({
      status: r.ok ? 'found' : 'notfound',
      message: r.ok ? r.entry!.name : r.message,
      count: r.files?.length || 0,
    });
    onShowToast(r.ok ? `✅ 폴더 확인 완료 · 이번 주 파일: ${r.entry!.name}` : `🟡 폴더는 열렸지만 ${r.message}`);
  };

  // ③ 이번 주 파일 내려받기 → 판독 → 반영
  const handleApplyGoogleDriveSync = async () => {
    if (!gdriveFolderId) {
      onShowToast('⚠️ 먼저 [폴더 확인]을 눌러 주세요.');
      return;
    }
    setGdriveState((s) => ({ ...s, status: 'reading', message: '이번 주 파일을 내려받아 읽는 중이에요…' }));
    const { syncWeekFromDrive } = await import('../utils/weeklyPlanLoader');
    const r = await syncWeekFromDrive(gdriveFolderId);
    if (!r.ok || !r.schedule) {
      setGdriveState((s) => ({ ...s, status: 'error', message: r.message }));
      onShowToast(`⚠️ ${r.message}`);
      return;
    }
    applyScheduleEverywhere(r.schedule, '구글 드라이브의 이번 주 시간표를 가져왔어요! 📚');
    if (r.weekStart) setPdfWeekStartDate(r.weekStart);
    try {
      localStorage.setItem('ttime_gdrive_last_sync_week', getThisWeekAutoInfo().mondayStr);
      localStorage.setItem('ttime_weekly_plan_week', r.weekStart || getThisWeekAutoInfo().mondayStr);
    } catch {}
    setGdriveState((s) => ({ ...s, status: 'found', message: r.fileName || s.message }));
    onShowToast(`☁️ [${r.fileName}] ${r.message} 시간표 위젯에 반영했습니다.`);
  };

  const steps = [
    { num: 1, title: '학급 기본 & 화면 테마', icon: School },
    { num: 2, title: '학생 명단 & 일괄 등록', icon: Users },
    { num: 3, title: '모둠 편성 & 칭찬 설정', icon: Award },
    { num: 4, title: '시간표 & 시정표 설정', icon: Calendar },
    { num: 5, title: '보안 잠금 & 구글 연동', icon: Sparkles },
    { num: 6, title: '단축키 목록', icon: Keyboard },
  ];

  interface ThemeOption {
    id: DashboardTheme;
    label: string;
    desc: string;
    colors: [string, string, string]; // [배경색, 헤더색, 포인트색]
    uiTheme: 'clean-white' | 'lavender-fog' | 'ember-sunset' | 'cyber-glossy' | 'botanical-sage';
  }

  const themes: ThemeOption[] = [
    {
      id: 'clean-white',
      label: '🤍 클린 화이트 (기본)',
      desc: '블루그레이 안개 바탕 + 흰 카드 + 로열 블루 포인트',
      colors: ['bg-[#EEF1F6]', 'bg-[#1F2937]', 'bg-[#2563EB]'],
      uiTheme: 'clean-white',
    },
    {
      id: 'lavender-fog',
      label: '🪻 라벤더 포그',
      desc: '라벤더 · 핑크 안개 바탕 + 바이올렛 포인트',
      colors: ['bg-[#EDE7F8]', 'bg-[#2A2438]', 'bg-[#7C5CE6]'],
      uiTheme: 'lavender-fog',
    },
    {
      id: 'ember-sunset',
      label: '🍊 엠버 선셋',
      desc: '살구빛 노을 바탕 + 테라코타 포인트',
      colors: ['bg-[#F5EADC]', 'bg-[#3B2A22]', 'bg-[#D9622B]'],
      uiTheme: 'ember-sunset',
    },
    {
      id: 'botanical-sage',
      label: '🌿 보태니컬 세이지',
      desc: '세이지 그린 잎사귀 바탕 + 포레스트 그린 포인트 (눈이 편해요)',
      colors: ['bg-[#E7F0E9]', 'bg-[#23392C]', 'bg-[#3F8F5F]'],
      uiTheme: 'botanical-sage',
    },
    {
      id: 'cyber-glossy',
      label: '💎 사이버 글로시',
      desc: '딥 네이비 바탕 + 시안 네온 (항상 어두운 화면)',
      colors: ['bg-[#0A1024]', 'bg-[#050811]', 'bg-[#22D3EE]'],
      uiTheme: 'cyber-glossy',
    },
  ];


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 md:p-6 bg-slate-950/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto h-[86vh] max-h-[760px] min-h-[580px]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold bg-indigo-500 text-white px-2.5 py-0.5 rounded-full uppercase">
                Step {currentStep} / 6
              </span>
              <h3 className="font-extrabold text-base sm:text-lg">학급 대시보드 맞춤 환경설정</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              선생님의 교실 환경(전자칠판/일반), 명단 일괄 입력, 주간시간표 및 시정표를 세밀하게 설정합니다.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Rail */}
        <div className="grid grid-cols-6 bg-slate-100 border-b border-slate-200">
          {steps.map((step) => {
            const isActive = currentStep === step.num;
            const isDone = currentStep > step.num;
            const isStepDisabled = step.num === 3 && tempConfig.teacherMode === 'subject';

            return (
              <button
                key={step.num}
                type="button"
                onClick={() => setCurrentStep(step.num)}
                className={`p-3 text-left transition flex items-center gap-2 border-r border-slate-200 last:border-r-0 cursor-pointer ${
                  isActive ? 'bg-white font-black text-indigo-600 shadow-xs' : 'text-slate-500 hover:bg-slate-50'
                } ${isStepDisabled ? 'opacity-60 bg-slate-50' : ''}`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : isDone
                      ? 'bg-emerald-500 text-white'
                      : isStepDisabled
                      ? 'bg-amber-200 text-amber-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isDone ? '✓' : step.num}
                </div>
                <div className="hidden sm:block truncate text-xs font-bold">
                  <span>{step.title}</span>
                  {isStepDisabled && (
                    <span className="ml-1 text-[9px] text-amber-700 font-extrabold bg-amber-100 px-1 py-0.2 rounded">
                      (미지원)
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto custom-scroll flex-1">
          {/* STEP 1: Basic Info & Classroom Environment & Theme */}
          {/* STEP 1: Basic Info & Classroom Environment & Theme (PART 1: 1~12번 정확한 순서 및 명칭 개편) */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <School className="w-4 h-4 text-indigo-600" />
                <span>1단계: 학급기본 &amp; 테마설정</span>
              </h4>

              {/* 🌱 새 학기 · 💾 백업 · 📂 불러오기 */}
              <SemesterBackupCard onShowToast={onShowToast} />

              {/* 🎓 [담임교사 모드 vs 교과전담 모드] 이원화 시스템 탭 토글 (localStorage 영구 연동) */}
              <div className="p-4 bg-gradient-to-r from-indigo-50/90 via-sky-50/90 to-purple-50/90 dark:from-slate-800/80 dark:via-slate-800/60 dark:to-indigo-950/40 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800/60 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <span className="text-sm">🎯</span>
                    <span>교사 운영 모드 선택 (담임 vs 교과전담)</span>
                  </span>
                  <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                    {tempConfig.teacherMode === 'subject' ? '⚡ 전담교사 특화 모드' : '🏫 학급 담임교사 모드'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...tempConfig, teacherMode: 'homeroom' as const };
                      setTempConfig(updated);
                      try {
                        localStorage.setItem('ttime_teacher_mode', 'homeroom');
                        localStorage.setItem('class_dashboard_teacher_mode', 'homeroom');
                      } catch {}
                      onShowToast('🏫 [학급 담임모드]로 전환되었습니다. 단일 학급 중심 설정이 활성화됩니다.');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                      tempConfig.teacherMode !== 'subject'
                        ? 'bg-white dark:bg-slate-900 border-indigo-600 dark:border-indigo-400 shadow-md ring-2 ring-indigo-500/20'
                        : 'bg-white/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-900'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 ${
                      tempConfig.teacherMode !== 'subject' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      🏫
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <span>학급 담임모드</span>
                        {tempConfig.teacherMode !== 'subject' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                        학급 시간표, 1인 1역할, 출결, 소음측정 등 표준 학급 대시보드
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...tempConfig, teacherMode: 'subject' as const };
                      setTempConfig(updated);
                      try {
                        localStorage.setItem('ttime_teacher_mode', 'subject');
                        localStorage.setItem('class_dashboard_teacher_mode', 'subject');
                      } catch {}
                      onShowToast('⚡ [교과 전담모드]로 전환되었습니다. 다학급 명단 및 전담 시간표 설정이 활성화됩니다.');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                      tempConfig.teacherMode === 'subject'
                        ? 'bg-white dark:bg-slate-900 border-indigo-600 dark:border-indigo-400 shadow-md ring-2 ring-indigo-500/20'
                        : 'bg-white/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-900'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 ${
                      tempConfig.teacherMode === 'subject' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      ⚡
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <span>교과 전담모드</span>
                        {tempConfig.teacherMode === 'subject' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                        다중 학급 시간표, 반별 명렬표 퀵 전환, 형성평가 기록장 특화
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* 1. 학급 기본정보 (학교명, 학년/반, 담임/전담교사명 등) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <School className="w-4 h-4 text-indigo-600" />
                    <span>1. {tempConfig.teacherMode === 'subject' ? '전담 기본정보 (학교명, 담당교과, 전담교사명)' : '학급 기본정보 (학교명, 학년/반, 담임교사명)'}</span>
                  </span>
                  <span className="text-[10px] font-bold text-indigo-600 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                    기본 필수 정보
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">학교 이름</label>
                    <input
                      type="text"
                      value={tempConfig.schoolName}
                      onChange={(e) => setTempConfig({ ...tempConfig, schoolName: e.target.value })}
                      placeholder="예: 한빛초등학교"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">담임 교사 성함</label>
                    <input
                      type="text"
                      value={tempConfig.teacherName}
                      onChange={(e) => setTempConfig({ ...tempConfig, teacherName: e.target.value })}
                      placeholder="예: 홍길동"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">학년 / 반</label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative flex items-center">
                        <input
                          type="number"
                          value={tempConfig.grade}
                          onChange={(e) => setTempConfig({ ...tempConfig, grade: Number(e.target.value) })}
                          className="w-full px-3 py-2 pr-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 font-medium text-center"
                        />
                        <span className="absolute right-2 text-slate-400 text-xs font-bold pointer-events-none">학년</span>
                      </div>
                      <div className="flex-1 relative flex items-center">
                        <input
                          type="number"
                          value={tempConfig.classNum}
                          onChange={(e) => setTempConfig({ ...tempConfig, classNum: Number(e.target.value) })}
                          className="w-full px-3 py-2 pr-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 font-medium text-center"
                        />
                        <span className="absolute right-2 text-slate-400 text-xs font-bold pointer-events-none">반</span>
                      </div>
                    </div>
                  </div>
                </div>
                <SchoolFinder
                  schoolName={tempConfig.schoolName || ''}
                  onPickName={(name) => setTempConfig((prev) => ({ ...prev, schoolName: name }))}
                  onShowToast={onShowToast}
                />

                {/* 📍 날씨 위치 (자동 / 직접 지정) */}
                <WeatherLocationSetting onShowToast={onShowToast} />

                {/* 🕒 교사 출퇴근 시간 및 방학 D-Day 일정 설정 */}
                <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/70 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <span>⏰ 교사 출근 / 퇴근 시간</span>
                        <span className="text-[10px] text-slate-400 font-normal">(업무종료 연동)</span>
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 min-w-0">
                        {/* 🏷️ 출근 라벨: 너비 부족 시에도 글자가 세로로 줄바꿈되지 않도록 whitespace-nowrap 및 shrink-0 적용 */}
                        <span className="text-[10px] text-slate-400 font-bold shrink-0 whitespace-nowrap select-none">출근</span>
                        <input
                          type="time"
                          value={tempConfig.workStartTime || '08:30'}
                          onChange={(e) => setTempConfig({ ...tempConfig, workStartTime: e.target.value })}
                          className="w-full min-w-0 bg-transparent text-xs font-semibold focus:outline-none text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <span className="text-slate-400 font-bold shrink-0 select-none">~</span>
                      <div className="flex-1 flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 min-w-0">
                        {/* 🏷️ 퇴근 라벨: 너비 부족 시에도 글자가 세로로 줄바꿈되지 않도록 whitespace-nowrap 및 shrink-0 적용 */}
                        <span className="text-[10px] text-slate-400 font-bold shrink-0 whitespace-nowrap select-none">퇴근</span>
                        <input
                          type="time"
                          value={tempConfig.workEndTime || '16:30'}
                          onChange={(e) => setTempConfig({ ...tempConfig, workEndTime: e.target.value })}
                          className="w-full min-w-0 bg-transparent text-xs font-semibold focus:outline-none text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-[10.5px] text-slate-500 dark:text-slate-400 font-bold">🌇 퇴근 애니메이션 · 노을 배경은 아래 [퇴근 장면] 칸에서 켜고 끌 수 있어요.</p>

                    {/* 🤖 AI 시간표 알림 비서 기능 ON / OFF 스위치 */}
                    <div className="mt-3 p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/60 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">🤖</span>
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                            <span>AI 시간표 알림 비서 기능</span>
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-100 dark:bg-indigo-900/80 text-indigo-600 dark:text-indigo-300">루미(Lumi)</span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            수업 시작 시간에 루미가 귀여운 숏 효과음과 함께 교시 시작을 알려줍니다.
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={aiTimetableNotify}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setAiTimetableNotify(val);
                            localStorage.setItem('ttime_ai_timetable_notify', String(val));
                            window.dispatchEvent(new Event('ttime-ai-config-updated'));
                            onShowToast?.(val ? '🤖 AI 시간표 알림 비서 기능이 켜졌습니다.' : '🤖 AI 시간표 알림 비서 기능이 꺼졌습니다.');
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5.5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1">
                      <span>🏖️ 여름방학 / ❄️ 겨울방학 시작일</span>
                      <span className="text-[10px] text-slate-400 font-normal">(헤더 D-Day 연동)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-amber-500 font-bold whitespace-nowrap">여름</span>
                        <input
                          type="date" min="2000-01-01" max="2099-12-31"
                          value={tempConfig.summerVacationDate || '2026-07-20'}
                          onChange={(e) => setTempConfig({ ...tempConfig, summerVacationDate: e.target.value })}
                          className="w-full bg-transparent text-[11px] font-semibold focus:outline-none text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <div className="flex-1 flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-blue-500 font-bold whitespace-nowrap">겨울</span>
                        <input
                          type="date" min="2000-01-01" max="2099-12-31"
                          value={tempConfig.winterVacationDate || '2026-12-24'}
                          onChange={(e) => setTempConfig({ ...tempConfig, winterVacationDate: e.target.value })}
                          className="w-full bg-transparent text-[11px] font-semibold focus:outline-none text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 🌇 퇴근 장면 · 수업일수 별 */}
              <LeaveWorkSettingsCard
                config={tempConfig}
                setConfig={setTempConfig}
                commit={(c) => {
                  setTempConfig(c);
                  onUpdateConfig(c);
                }}
                onShowToast={onShowToast}
              />

              {/* 2. 화면테마모드 (라이트 / 다크 / 시스템) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Laptop className="w-4 h-4 text-indigo-600" />
                    <span>2. 화면테마모드 (라이트 / 다크 / 시스템)</span>
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">교실 조명 환경에 맞춰 선택하세요</span>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...tempConfig, themeMode: 'system' as const };
                      setTempConfig(updated);
                      onUpdateConfig(updated);
                    }}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      (tempConfig.themeMode || 'system') === 'system'
                        ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-600 ring-2 ring-indigo-200 dark:ring-indigo-800 font-black text-indigo-900 dark:text-indigo-200 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300 font-bold'
                    }`}
                  >
                    <Laptop className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs">시스템 연동</span>
                    <span className="text-[9px] text-slate-400 font-normal">기기 OS 테마 따름</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...tempConfig, themeMode: 'light' as const };
                      setTempConfig(updated);
                      onUpdateConfig(updated);
                    }}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      tempConfig.themeMode === 'light'
                        ? 'bg-amber-50 dark:bg-amber-950/80 border-amber-500 ring-2 ring-amber-200 dark:ring-amber-800 font-black text-amber-900 dark:text-amber-200 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300 font-bold'
                    }`}
                  >
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span className="text-xs">라이트 모드</span>
                    <span className="text-[9px] text-slate-400 font-normal">항상 밝고 화사하게</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...tempConfig, themeMode: 'dark' as const };
                      setTempConfig(updated);
                      onUpdateConfig(updated);
                    }}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      tempConfig.themeMode === 'dark'
                        ? 'bg-slate-900 border-indigo-500 ring-2 ring-indigo-400 font-black text-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300 font-bold'
                    }`}
                  >
                    <Moon className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs">다크 모드</span>
                    <span className="text-[9px] text-slate-400 font-normal">눈부심 없는 어두운 화면</span>
                  </button>
                </div>
              </div>

              {/* 3. 교실디스플레이 환경 구분 (전자칠판 86" / 교실 TV 65" / PC 단독 등) */}
              <div className="p-4 bg-indigo-50/70 dark:bg-slate-800/70 rounded-2xl border border-indigo-200 dark:border-indigo-800 space-y-2">
                <label className="text-xs font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                  <Tv className="w-4 h-4 text-indigo-600" />
                  <span>3. 교실디스플레이 환경 구분</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTempConfig({ ...tempConfig, boardType: 'smart' })}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all relative ${
                      tempConfig.boardType === 'smart'
                        ? 'bg-white dark:bg-slate-900 border-indigo-600 ring-2 ring-indigo-200 dark:ring-indigo-800 shadow-sm'
                        : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Tv className="w-5 h-5 text-indigo-600" />
                      <span className="font-black text-xs text-indigo-950 dark:text-indigo-200">
                        전자칠판 86&quot; 모드
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                      대형 전자칠판에 맞춰 터치 버튼이 확장되며, 학생들이 칠판을 직접 터치하여 출석을 완료할 수 있는 자율 터치패드가 활성화됩니다.
                    </p>
                    {tempConfig.boardType === 'smart' && (
                      <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTempConfig({ ...tempConfig, boardType: 'general' })}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all relative ${
                      tempConfig.boardType === 'general'
                        ? 'bg-white dark:bg-slate-900 border-indigo-600 ring-2 ring-indigo-200 dark:ring-indigo-800 shadow-sm'
                        : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Monitor className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                      <span className="font-black text-xs text-slate-900 dark:text-slate-100">
                        교실 TV 65&quot; / PC 단독 모드
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                      교사용 PC 모니터와 프로젝터 빔프로젝터 환경에 최적화되어 마우스/키보드로 정밀하고 콤팩트하게 학급을 컨트롤합니다.
                    </p>
                    {tempConfig.boardType === 'general' && (
                      <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* 5. 스테이지 매니저 모드 */}
              <div className="p-4 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 dark:from-slate-800 dark:to-blue-950/60 rounded-2xl border border-blue-200 dark:border-blue-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      📱
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-slate-900 dark:text-white">
                        5. 스테이지 매니저 모드
                      </h5>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        접힌 위젯이 화면 좌측 사이드에 깔끔한 세로 카드 스택으로 나열됩니다.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tempConfig.stageManagerMode ?? false}
                      onChange={(e) =>
                        setTempConfig({ ...tempConfig, stageManagerMode: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {tempConfig.stageManagerMode && (
                  <div className="pt-2 border-t border-blue-100 dark:border-blue-900 flex flex-col gap-1.5 animate-fade-in">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>좌측 스택 배경 투명도 (라운딩 사각형 패널)</span>
                      <span className="text-blue-600 font-mono font-black">
                        {Math.round((tempConfig.stageManagerOpacity ?? 0.65) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={tempConfig.stageManagerOpacity ?? 0.65}
                      onChange={(e) =>
                        setTempConfig({
                          ...tempConfig,
                          stageManagerOpacity: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* 🎨 대시보드 테마 선택 (7종 시그니처 & 인스타 모던 통합 가로 스크롤) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-indigo-500" />
                    <span>대시보드 테마 선택 (5종)</span>
                  </label>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                    * 좌우로 스크롤하여 원하시는 대시보드 테마를 원클릭으로 변경하세요.
                  </span>
                </div>

                {/* 🌟 가로 스크롤 컨테이너 (flex-nowrap, overflow-x-auto, 부드러운 스크롤바) */}
                <div className="flex flex-nowrap items-stretch gap-3 overflow-x-auto pb-3 pt-1 px-1 custom-scrollbar">
                  {themes.map((t) => {
                    const currentUITheme = typeof window !== 'undefined' ? localStorage.getItem('ttime_ui_theme') : null;
                    const isSelected = (currentUITheme || 'clean-white') === t.uiTheme;

                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          try {
                            // 🔔 즉각 맑은 멜로딕 차임 재생
                            playWidgetSnapSound();

                            // 로컬 스토리지 및 HTML data 속성 즉시 주입 (0ms 딜레이)
                            localStorage.setItem('class_dashboard_theme', t.id);
                            localStorage.setItem('ttime_ui_theme', t.uiTheme);
                            

                            // 전역 동기화 이벤트 즉시 발송
                            window.dispatchEvent(new CustomEvent('ttime-theme-changed', { detail: t.uiTheme }));
                          } catch {}

                          const updated: ClassConfig = {
                            ...tempConfig,
                            theme: t.id,
                            dashboardBgColor: '',
                            themeMode: tempConfig.themeMode || 'system',
                          };
                          setTempConfig(updated);
                          onUpdateConfig(updated);
                          onShowToast?.(`✨ [${t.label}] 테마가 즉시 적용되었습니다.`);
                        }}
                        className={`shrink-0 w-60 sm:w-64 p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-2.5 cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-indigo-600 bg-white dark:bg-slate-800 shadow-md border-indigo-500 scale-[1.01]'
                            : 'bg-white/90 dark:bg-slate-900/70 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="font-extrabold text-xs text-slate-900 dark:text-white leading-tight">
                            {t.label}
                          </div>
                          {/* 3색 미니 컬러 칩 (배경 / 헤더 / 포인트) */}
                          <div className="flex items-center gap-1 shrink-0 mt-0.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${t.colors[0]} shadow-2xs border border-white/60 dark:border-white/20`} />
                            <span className={`w-2.5 h-2.5 rounded-full ${t.colors[1]} shadow-2xs border border-white/60 dark:border-white/20`} />
                            <span className={`w-2.5 h-2.5 rounded-full ${t.colors[2]} shadow-2xs border border-white/60 dark:border-white/20`} />
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                          {t.desc}
                        </div>

                        {isSelected ? (
                          <div className="flex items-center gap-1 text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 pt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
                            <span>현재 적용 중</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 pt-0.5">
                            클릭하여 적용
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 🎨 화면 스타일 (기존 7·8·9·10번 통합: 배경 · 위젯 유리 · 모서리 · 가독성) */}
              <ScreenStyleSection
                config={tempConfig}
                apply={(patch) => {
                  const updated: ClassConfig = { ...tempConfig, ...patch };
                  setTempConfig(updated);
                  onUpdateConfig(updated);
                }}
                onAutoAdjust={handleAutoAdjustThemeColors}
                onShowToast={onShowToast}
              />

              {/* 11. 대시보드 및 위젯 전체 폰트 선택 */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Type className="w-4 h-4 text-indigo-600" />
                    <span>11. 대시보드 및 위젯 전체 폰트 선택 (무료 한글 폰트 {FREE_FONTS.length}종: 학교안심, 경기천년 포함)</span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">선택 시 대시보드 및 모든 위젯 텍스트에 즉시 반영</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {FREE_FONTS.map((f) => {
                    const isSelected = (tempConfig.fontFamily || 'pretendard') === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleSelectFont(f.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-800 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              {f.category}
                            </span>
                            {isSelected && (
                              <span className="w-3.5 h-3.5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-black">
                                ✓
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-black text-slate-800 dark:text-slate-200 mt-1 truncate" title={f.name}>
                            {f.name.split(' ')[0]}
                          </div>
                        </div>
                        <div
                          style={{ fontFamily: f.family }}
                          className="text-xs font-bold text-indigo-900 dark:text-indigo-300 mt-2 truncate pt-1 border-t border-slate-100 dark:border-slate-800"
                        >
                          다정한 3학년 1반
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 11. 위젯 이동 및 배치 효과음 재생 ON/OFF 토글 */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <div>
                  <div className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span>11. 🔊 위젯 이동 및 배치 효과음 재생</span>
                    <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold px-2 py-0.5 rounded-full">
                      효과음
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    위젯을 드래그하거나 위치를 바꿀 때 효과음을 재생할지 선택합니다. (하단 독 바에서도 원클릭으로 켜고 끌 수 있습니다)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onToggleWidgetMoveSound}
                  className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition cursor-pointer shrink-0 ml-3 ${
                    isWidgetMoveSoundEnabled
                      ? 'bg-sky-500 text-white shadow-xs'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {isWidgetMoveSoundEnabled ? 'ON (소리 켬)' : 'OFF (무음)'}
                </button>
              </div>

              {/* 12. 🎯 [포커스 딥워크 위젯 설정 (Focus Widget Preset)] */}
              <div className="p-4 bg-gradient-to-r from-amber-50/90 to-orange-50/90 dark:from-slate-800 dark:to-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800/60 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="text-xs font-black text-slate-900 dark:text-white">
                          12. 🎯 포커스 딥워크 위젯 설정 (Focus Widget Preset)
                        </h5>
                        <span className="text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
                          포커스 모드 전용
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        하단 바의 포커스 모드(🎯) 실행 시 화면에 유지할 나만의 집중 업무 위젯들을 선택하세요.
                      </p>
                    </div>
                  </div>

                  {/* 빠른 프리셋 버튼 */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const defaultFocus = ['clock', 'agenda', 'timetable', 'quote', 'observation'];
                        const updated = { ...tempConfig, focusWidgetIds: defaultFocus };
                        setTempConfig(updated);
                        onUpdateConfig(updated);
                        try {
                          localStorage.setItem('focusWidgetIds', JSON.stringify(defaultFocus));
                        } catch (e) {}
                        onShowToast('🎯 추천 업무 프리셋(뽀모도로, To-Do, 시간표, 독서노트, 관찰일지)이 적용되었습니다.');
                      }}
                      className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-800/60 text-amber-800 dark:text-amber-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                    >
                      업무 추천 프리셋
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = AVAILABLE_FOCUS_WIDGETS.map((w) => w.id);
                        const updated = { ...tempConfig, focusWidgetIds: allIds };
                        setTempConfig(updated);
                        onUpdateConfig(updated);
                        try {
                          localStorage.setItem('focusWidgetIds', JSON.stringify(allIds));
                        } catch (e) {}
                        onShowToast('🎯 모든 위젯이 포커스 목록으로 선택되었습니다.');
                      }}
                      className="px-2 py-1 bg-white dark:bg-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-bold border border-slate-200 dark:border-slate-600 transition cursor-pointer"
                    >
                      전체 선택
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...tempConfig, focusWidgetIds: [] };
                        setTempConfig(updated);
                        onUpdateConfig(updated);
                        try {
                          localStorage.setItem('focusWidgetIds', JSON.stringify([]));
                        } catch (e) {}
                        onShowToast('🎯 포커스 목록이 전체 해제되었습니다.');
                      }}
                      className="px-2 py-1 bg-white dark:bg-slate-700 hover:bg-slate-100 text-slate-500 dark:text-slate-400 rounded-lg text-[11px] font-bold border border-slate-200 dark:border-slate-600 transition cursor-pointer"
                    >
                      전체 해제
                    </button>
                  </div>
                </div>

                {/* 위젯 체크박스 그리드 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pt-1">
                  {AVAILABLE_FOCUS_WIDGETS.map((widget) => {
                    const currentList = tempConfig.focusWidgetIds || [
                      'clock',
                      'agenda',
                      'timetable',
                      'quote',
                      'observation',
                    ];
                    const isChecked = currentList.some((id) => id === widget.id || id === widget.alias);

                    return (
                      <label
                        key={widget.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                          isChecked
                            ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 shadow-2xs'
                            : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            let updated: string[];
                            if (e.target.checked) {
                              updated = [...currentList.filter((id) => id !== widget.id && id !== widget.alias), widget.id];
                            } else {
                              updated = currentList.filter((id) => id !== widget.id && id !== widget.alias);
                            }
                            const nextConfig = { ...tempConfig, focusWidgetIds: updated };
                            setTempConfig(nextConfig);
                            onUpdateConfig(nextConfig);
                            try {
                              localStorage.setItem('focusWidgetIds', JSON.stringify(updated));
                            } catch (err) {}
                          }}
                          className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4 shrink-0 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm shrink-0">{widget.icon}</span>
                            <span className={`text-xs font-bold truncate ${
                              isChecked
                                ? 'text-amber-950 dark:text-amber-200'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}>
                              {widget.name}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {widget.desc}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}


          {/* STEP 2: Students Roster & Bulk Input & Excel/Sheets Import (요구사항 1) */}
          {currentStep === 2 && (
            tempConfig.teacherMode === 'subject' ? (
              /* ⚡ [교과 전담모드 전용 2단계]: 다학급 명단 관리 & 담당 학급 수 지정 & 엑셀 일괄 등록 */
              <div className="space-y-4 animate-fade-in">
                {/* 상단 헤더 요약 */}
                <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-slate-200">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-violet-600" />
                      <span>2단계: 교과 전담 다학급 명단 관리 &amp; 엑셀 일괄 등록</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      담당하는 여러 학급(예: 3-1, 3-2, 4-1 등)의 학생 명단을 학급별 탭으로 편리하게 등록하고 관리합니다.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
                      담당 학급: <strong className="text-violet-700 font-black">{subjectClassesList.length}개 반</strong>
                    </span>
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
                      총 전담 학생: <strong className="text-violet-700 font-black">
                        {Object.values(subjectRostersMap).reduce((sum, list) => sum + (list?.length || 0), 0)}명
                      </strong>
                    </span>
                  </div>
                </div>

                {/* 1. 담당 학급 수 및 라벨 지정 탭 바 */}
                <div className="p-3.5 bg-violet-50/80 rounded-2xl border border-violet-200 space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-black text-violet-950 flex items-center gap-1.5">
                      <span>🏫 담당 학급 선택 및 학급 추가</span>
                      <span className="text-[10px] font-extrabold bg-violet-200 text-violet-800 px-2 py-0.2 rounded-full">
                        다학급 지원
                      </span>
                    </span>

                    {/* 새 학급 추가 인풋 & 버튼 */}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={newClassLabelInput}
                        onChange={(e) => setNewClassLabelInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubjectClass(); }}
                        placeholder="예: 3-3, 5-2"
                        className="w-24 px-2.5 py-1 rounded-xl bg-white border border-violet-300 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-violet-400 placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={handleAddSubjectClass}
                        className="px-2.5 py-1 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-black transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>학급 추가</span>
                      </button>
                    </div>
                  </div>

                  {/* 학급 선택 세그먼트 탭 목록 */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {subjectClassesList.map((cls) => {
                      const isSelected = selectedSubjectClassTab === cls;
                      const count = subjectRostersMap[cls]?.length || 0;

                      return (
                        <div
                          key={cls}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-violet-600 text-white border-violet-600 shadow-sm ring-2 ring-violet-400/30'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                          onClick={() => setSelectedSubjectClassTab(cls)}
                        >
                          <span>{cls}반</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {count}명
                          </span>
                          {subjectClassesList.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveSubjectClass(cls);
                              }}
                              className={`ml-1 p-0.5 rounded-md transition ${
                                isSelected ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-200 text-slate-400'
                              }`}
                              title={`${cls}반 삭제`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. 엑셀/텍스트 붙여넣기 일괄 등록 박스 */}
                <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                      <span>✨ 엑셀 / 텍스트 명단 일괄 등록</span>
                      <span className="text-[10px] bg-emerald-200 text-emerald-800 px-2 py-0.2 rounded-full font-bold">
                        엑셀 양식 자동 파싱
                      </span>
                    </label>
                    <span className="text-[11px] text-emerald-800 font-medium">
                      기본 권장 양식: <strong>학년, 반, 번호, 이름, 성별</strong> (엑셀 열 복사 붙여넣기 가능)
                    </span>
                  </div>

                  <textarea
                    rows={3}
                    value={subjectBulkText}
                    onChange={(e) => setSubjectBulkText(e.target.value)}
                    placeholder={`예시 1 (학년반 포함): \n3, 1, 1, 김민준, 남\n3, 1, 2, 이서윤, 여\n4, 2, 1, 박도윤, 남\n\n예시 2 (현재 ${selectedSubjectClassTab}반 등록): \n1, 강민준, 남\n2, 김서윤, 여\n또는: 김민수 이서아 박도윤 최지우...`}
                    className="w-full p-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-400 outline-none resize-none leading-relaxed placeholder:text-slate-400 custom-scrollbar"
                  />

                  <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                    <div className="text-[11px] text-emerald-700 flex items-center gap-1">
                      <span>💡 학년,반 정보가 포함되어 있으면 해당 학급으로 자동 분류 파싱됩니다.</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSubjectBulkText(
                            `3, 1, 1, 김민준, 남\n3, 1, 2, 이서아, 여\n3, 1, 3, 박도윤, 남\n3, 2, 1, 최지우, 여\n3, 2, 2, 정예준, 남\n4, 1, 1, 윤아인, 여\n4, 1, 2, 한승우, 남`
                          );
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        샘플 양식 채우기
                      </button>
                      <button
                        type="button"
                        onClick={handleParseSubjectBulkRoster}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1 shadow-xs active:scale-95"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>명단 일괄 등록 &amp; 자동 파싱</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. 현재 선택된 학급 학생 명단 목록 */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-slate-900">
                        [{selectedSubjectClassTab}반] 학생 명단
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                        {subjectRostersMap[selectedSubjectClassTab]?.length || 0}명
                      </span>
                    </div>

                    {/* 개별 추가 및 해당 학급 초기화 */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSubjectRostersMap((prev) => ({
                            ...prev,
                            [selectedSubjectClassTab]: [],
                          }));
                          onShowToast(`🗑️ [${selectedSubjectClassTab}반] 학생 명단이 초기화되었습니다.`);
                        }}
                        className="text-[11px] text-rose-600 hover:underline font-bold cursor-pointer"
                      >
                        현재 반 명단 비우기
                      </button>
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto custom-scrollbar p-2">
                    {(!subjectRostersMap[selectedSubjectClassTab] || subjectRostersMap[selectedSubjectClassTab].length === 0) ? (
                      <div className="text-center py-8 text-slate-400 text-xs">
                        등록된 학생이 없습니다. 상단의 엑셀/텍스트 일괄 입력을 이용해 명단을 등록해 보세요.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {subjectRostersMap[selectedSubjectClassTab].map((student, idx) => (
                          <div
                            key={student.id || idx}
                            className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-1 shadow-2xs hover:bg-violet-50/50 transition"
                          >
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <span className="w-5 h-5 rounded-md bg-white border border-slate-300 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                                {student.number}
                              </span>
                              <span className="text-xs font-bold text-slate-800 truncate">
                                {student.name}
                              </span>
                              <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                                student.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {student.gender === 'female' ? '여' : '남'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSubjectRostersMap((prev) => ({
                                  ...prev,
                                  [selectedSubjectClassTab]: prev[selectedSubjectClassTab].filter((_, i) => i !== idx),
                                }));
                              }}
                              className="p-1 text-slate-400 hover:text-rose-500 rounded-md transition cursor-pointer"
                              title="학생 삭제"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* 🏫 [학급 담임모드 전용 2단계]: 기존 1~5단계 단일 학급 학생 명단/일괄입력/엑셀연동 100% 온전히 유지 */
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>2단계: 학생 명단 일괄 입력, 성별/생년월일 및 엑셀 양식 연동</span>
                  </h4>
                <div className="flex items-center gap-2">
                  <div className="text-xs font-bold text-slate-500">
                    총 재적인원: <span className="text-indigo-600 font-black">{tempStudents.length}명</span>
                  </div>
                  {tempStudents.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      {!isConfirmingClearRoster ? (
                        <button
                          type="button"
                          onClick={() => setIsConfirmingClearRoster(true)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold rounded-lg flex items-center gap-1 transition cursor-pointer"
                          title="입력된 학생 명단 전체 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>명단 전체 초기화</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-rose-100/90 border border-rose-300 px-2.5 py-1 rounded-xl animate-fade-in shadow-xs">
                          <span className="text-[11px] text-rose-800 font-extrabold">정말 전체 삭제할까요?</span>
                          <button
                            type="button"
                            onClick={() => {
                              setTempStudents([]);
                              setTempTeams((prev) => prev.map((t) => ({ ...t, members: [] })));
                              setBulkStudentText('');
                              setIsConfirmingClearRoster(false);
                              onShowToast('🗑️ 학생 명단이 모두 깨끗하게 초기화되었습니다.');
                            }}
                            className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-md cursor-pointer transition shadow-xs"
                          >
                            예, 전체 삭제
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsConfirmingClearRoster(false)}
                            className="px-2 py-0.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-md border border-slate-300 cursor-pointer transition"
                          >
                            취소
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Method A: Space-Separated Bulk Input Box (요구사항 1) */}
              <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                    <span>✨ 띄어쓰기로 학생 명단 일괄 입력</span>
                    <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.2 rounded font-bold">원클릭 생성</span>
                  </label>
                  <span className="text-[11px] text-emerald-700">
                    공백(스페이스), 줄바꿈, 쉼표로 구분하여 입력
                  </span>
                </div>
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={bulkStudentText}
                    onChange={(e) => setBulkStudentText(e.target.value)}
                    placeholder="예시: 김민수 이서아 박도윤 최지우 정예준 윤아인 한승우 오서진..."
                    className="flex-1 p-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-400 outline-none resize-none"
                  />
                  <button
                    type="button"
                    onClick={handleBulkAddStudents}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    명단 일괄 생성
                  </button>
                </div>
              </div>

              {/* Method B: Excel/Google Spreadsheet Template Download & Upload (요구사항 1) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-800">
                      엑셀 또는 구글 스프레드시트 양식 연동
                    </div>
                    <div className="text-[11px] text-slate-500">
                      기본 양식을 다운로드하여 번호/이름/성별/생년월일을 작성 후 업로드하세요.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                    <span>기본 양식 다운로드</span>
                  </button>

                  <label className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    <span>양식 파일 업로드</span>
                    <input
                      type="file"
                      accept=".csv, .txt, .xlsx"
                      onChange={handleUploadStudentFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Method C: Single student quick add */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
                  placeholder="추가할 학생 이름 직접 입력 (엔터)"
                  className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddStudent}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  학생 추가
                </button>
              </div>

              {/* 명렬표 정렬 (보기 순서만 바뀌고 학생 번호·자료는 그대로) */}
              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                <span className="font-bold text-slate-500 mr-1">정렬</span>
                {(
                  [
                    ['number', '번호순'],
                    ['team', '모둠순'],
                    ['name', '이름순'],
                    ['gender', '성별순'],
                    ['birth', '생일순'],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setRosterSort(k)}
                    className={`px-2.5 py-1 rounded-full font-black border cursor-pointer transition ${
                      rosterSort === k ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Roster Table with Gender & BirthDate (요구사항 1) */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white max-h-64 overflow-y-auto custom-scroll">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-black sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-16 text-center">번호</th>
                      <th className="py-2.5 px-3">이름</th>
                      <th className="py-2.5 px-3 w-28 text-center">성별</th>
                      <th className="py-2.5 px-3 w-36">생년월일</th>
                      <th className="py-2.5 px-3 w-20 text-center">모둠</th>
                      <th className="py-2.5 px-3 w-12 text-center">삭제</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortRoster(tempStudents, rosterSort).map((st) => (
                      <tr key={st.id} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="py-2 px-3 text-center">
                          <input
                            type="number"
                            value={st.number}
                            onChange={(e) => handleStudentFieldChange(st.id, 'number', Number(e.target.value))}
                            className="w-12 text-center font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg py-0.5 text-xs"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={st.name}
                            onChange={(e) => handleStudentFieldChange(st.id, 'name', e.target.value)}
                            className="font-bold text-slate-900 bg-transparent border-b border-transparent focus:border-indigo-500 outline-none w-full"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                            <button
                              type="button"
                              onClick={() => handleStudentFieldChange(st.id, 'gender', 'M')}
                              className={`px-2 py-0.5 rounded text-[11px] font-black transition ${
                                st.gender === 'M'
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'text-slate-500 hover:text-slate-900'
                              }`}
                            >
                              남
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStudentFieldChange(st.id, 'gender', 'F')}
                              className={`px-2 py-0.5 rounded text-[11px] font-black transition ${
                                st.gender === 'F'
                                  ? 'bg-rose-500 text-white shadow-xs'
                                  : 'text-slate-500 hover:text-slate-900'
                              }`}
                            >
                              여
                            </button>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="date" min="2000-01-01" max="2099-12-31"
                            value={st.birthDate || '2017-03-01'}
                            onChange={(e) => handleStudentFieldChange(st.id, 'birthDate', e.target.value)}
                            className="text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 w-full outline-none focus:border-indigo-400"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          {/* 모둠 선택 (저장하면 자리·모둠 위젯에 그대로 반영) */}
                          <select
                            value={st.teamId}
                            onChange={(e) => handleStudentFieldChange(st.id, 'teamId', Number(e.target.value))}
                            className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full pl-2 pr-1 py-0.5 outline-none focus:border-indigo-400 cursor-pointer"
                            title="모둠 선택"
                          >
                            {(() => {
                              // 편성된 모둠 목록 (3단계에서 만든 모둠) + 현재 값
                              const list = tempTeams.length
                                ? tempTeams.map((t) => ({ id: t.id, name: t.name || `${t.id}모둠` }))
                                : [1, 2, 3, 4, 5, 6].map((id) => ({ id, name: `${id}모둠` }));
                              if (!list.some((t) => t.id === st.teamId)) list.push({ id: st.teamId, name: `${st.teamId}모둠` });
                              return list
                                .sort((a, b) => a.id - b.id)
                                .map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name}
                                  </option>
                                ));
                            })()}
                          </select>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveStudent(st.id)}
                            className="text-slate-400 hover:text-rose-600 font-black cursor-pointer p-1"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            )
          )}

          {/* STEP 3: Teams, Distribution Calculator & Rewards */}
          {currentStep === 3 && (
            <div className="space-y-4">
              {/* ⚡ 교과 전담모드 안내 & 스킵 배너 */}
              {tempConfig.teacherMode === 'subject' && (
                <div className="p-4 bg-amber-50 rounded-2xl border-2 border-amber-300 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">⚡</span>
                    <div>
                      <div className="text-xs font-black text-amber-900 flex items-center gap-2">
                        <span>[교과 전담모드] 모둠 편성 &amp; 칭찬 설정 미지원 안내</span>
                        <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                          전담모드 미지원 (스킵 권장)
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                        다학급 수업 특성상 고정 모둠 및 칭찬 점수는 각 반 교실의 환경을 따르므로 전담모드에서는 비활성화됩니다.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-black transition cursor-pointer shadow-md flex items-center justify-center gap-1.5 active:scale-95 shrink-0"
                  >
                    <span>4단계: 전담 시간표로 바로가기</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* 3단계 본문: 전담모드일 때는 Dimmed/Disabled 처리 */}
              <div className={`space-y-4 ${tempConfig.teacherMode === 'subject' ? 'opacity-40 pointer-events-none select-none' : ''}`}>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Award className="w-4 h-4 text-indigo-600" />
                    <span>3단계: 학급 인원 맞춤 모둠 편성 &amp; 칭찬 목표 보상</span>
                  </h4>
                  <div className="text-xs font-bold text-slate-600">
                    전체 학급 학생: <span className="text-indigo-700 font-black">{tempStudents.length}명</span>
                  </div>
                </div>

              {/* ⚡ 최상단 통합 컨트롤 바: [희망 모둠 수] + [모둠 즉시 자동 분배] 단일 버튼 + [미배정/남은 학생 수 배지] (요구사항 4) */}
              {(() => {
                const totalAllocated = tempTeams.reduce(
                  (acc, t) => acc + (Number(manualTeamCounts[t.id]) || 0),
                  0
                );
                const diff = tempStudents.length - totalAllocated;
                const isExact = diff === 0;

                return (
                  <div className="p-4 bg-indigo-50/90 rounded-2xl border border-indigo-200 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2.5">
                      {/* 좌측: 희망 모둠 수 선택 및 [모둠 즉시 자동 분배] 단일 버튼 */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 bg-white/90 px-3 py-1.5 rounded-xl border border-indigo-200">
                          <span className="text-xs text-indigo-950 font-bold">희망 모둠 수:</span>
                          <select
                            value={targetTeamCount}
                            onChange={(e) => setTargetTeamCount(Number(e.target.value))}
                            className="text-xs font-black px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-300 text-indigo-900 outline-none cursor-pointer"
                          >
                            {[3, 4, 5, 6, 7, 8].map((n) => (
                              <option key={n} value={n}>
                                {n}개 모둠
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 단일화된 [모둠 즉시 자동 분배] 버튼 (요구사항 4-1) */}
                        <button
                          type="button"
                          onClick={handleApplySmartTeams}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                          title="선택한 모둠 수에 맞춰 학급 학생 전체를 균등하게 즉시 자동 배분합니다"
                        >
                          <Shuffle className="w-3.5 h-3.5" />
                          <span>⚡ 모둠 즉시 자동 분배</span>
                        </button>
                      </div>

                      {/* 우측: 직관적인 실시간 인원 분배 정보 배지 (요구사항 4-2) */}
                      <div className="flex items-center gap-2">
                        {isExact ? (
                          <div className="px-3 py-1.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-black flex items-center gap-1.5 shadow-2xs animate-fade-in">
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span>모든 학생 배정 완료 ({tempStudents.length}명)</span>
                          </div>
                        ) : diff > 0 ? (
                          <div className="px-3 py-1.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-xs font-black flex items-center gap-1.5 shadow-2xs animate-pulse">
                            <span>⚠️</span>
                            <span>미배정/남은 학생 수: {diff}명</span>
                          </div>
                        ) : (
                          <div className="px-3 py-1.5 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 text-xs font-black flex items-center gap-1.5 shadow-2xs animate-pulse">
                            <span>🚨</span>
                            <span>초과 입력: {Math.abs(diff)}명</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 추천 균형 분배 안내 캡션 */}
                    <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between flex-wrap gap-1 px-1">
                      <span>
                        💡 균형 분배 추천:{' '}
                        <strong className="text-indigo-700">
                          {calculateDistribution(tempStudents.length, targetTeamCount)
                            .map((sz, i) => `${i + 1}모둠(${sz}명)`)
                            .join(' · ')}
                        </strong>
                      </span>
                      <span className="text-slate-500">
                        현재 편성 인원 합계: <strong className="text-indigo-800">{totalAllocated}명</strong> / 전체{' '}
                        <strong>{tempStudents.length}명</strong>
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* 각 모둠 카드 목록: [-] [+] 카운팅 버튼 및 숫자 직접 입력 지원 (요구사항 4-2) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-600">
                  <span>모둠별 설정 및 인원수 조절</span>
                  <span className="text-[11px] text-indigo-600">
                    * [-] [+] 버튼이나 숫자를 직접 입력하여 각 모둠 인원을 즉시 조정할 수 있습니다.
                  </span>
                </div>

                <div className="space-y-2">
                  {tempTeams.map((team, idx) => {
                    const currentCount = manualTeamCounts[team.id] ?? 4;
                    const assignedStudents = tempStudents.filter((s) => s.teamId === team.id);

                    return (
                      <div
                        key={team.id}
                        className="p-3 bg-white rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-2xs hover:border-indigo-200 transition"
                      >
                        {/* 1. 모둠 이름 & 색상 */}
                        <div className="flex items-center gap-2.5 w-full sm:w-1/3">
                          <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${team.dotColor}`} />
                          <input
                            type="text"
                            value={team.name}
                            onChange={(e) => {
                              const v = e.target.value;
                              setTempTeams((prev) => prev.map((t, i) => (i === idx ? { ...t, name: v } : t)));
                            }}
                            className="font-extrabold text-slate-900 border-b border-transparent focus:border-indigo-500 focus:outline-none w-28"
                          />
                          <span className="text-[11px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full font-extrabold shrink-0">
                            {assignedStudents.length}명 소속
                          </span>
                        </div>

                        {/* 2. [-] [+] 카운팅 버튼 및 숫자 직접 입력 (요구사항 4-2) */}
                        <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                          <span className="text-[11px] font-bold text-slate-500 mr-1">편성 인원:</span>
                          <button
                            type="button"
                            onClick={() => handleAdjustTeamCount(team.id, -1)}
                            disabled={currentCount <= 0}
                            className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-black flex items-center justify-center text-sm cursor-pointer transition active:scale-90"
                            title="1명 감소"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={30}
                            value={currentCount}
                            onChange={(e) => handleManualCountChange(team.id, e.target.value)}
                            className="w-12 h-7 px-1 text-center font-black text-xs bg-white border border-indigo-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400"
                            title="숫자를 직접 입력하여 인원을 변경할 수 있습니다"
                          />
                          <span className="text-xs font-bold text-slate-600">명</span>
                          <button
                            type="button"
                            onClick={() => handleAdjustTeamCount(team.id, 1)}
                            className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-black flex items-center justify-center text-sm cursor-pointer transition active:scale-90"
                            title="1명 증가"
                          >
                            +
                          </button>
                        </div>

                        {/* 3. 목표 도장 및 보상 설정 */}
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 font-medium text-[11px]">도장:</span>
                            <input
                              type="number"
                              value={team.goalPoints}
                              onChange={(e) => {
                                const v = Math.max(0, Math.min(999, Number(e.target.value) || 0));
                                setTempTeams((prev) => prev.map((t, i) => (i === idx ? { ...t, goalPoints: v } : t)));
                              }}
                              className="w-12 px-1.5 py-1 rounded-lg border border-slate-200 text-center font-bold text-xs"
                            />
                            <span className="text-[11px] text-slate-400">개</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 font-medium text-[11px]">보상:</span>
                            <input
                              type="text"
                              value={team.reward}
                              onChange={(e) => {
                                const v = e.target.value;
                                setTempTeams((prev) => prev.map((t, i) => (i === idx ? { ...t, reward: v } : t)));
                              }}
                              placeholder="보상 내용"
                              className="w-24 px-2 py-1 rounded-lg border border-slate-200 font-bold text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 개인 칭찬 항목 및 점수 커스텀 설정 (요구사항 10, 첨부 이미지 2, 3) */}
              <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>개인 칭찬 도장 항목 및 점수 커스텀 설정</span>
                    </label>
                    <p className="text-[11px] text-amber-800/80 mt-0.5">
                      좌석배치도에서 학생을 클릭했을 때 바로 부여할 수 있는 맞춤형 칭찬 항목 목록입니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTempConfig({
                        ...tempConfig,
                        praiseConfigs: initialPraiseConfigs,
                      });
                      onShowToast('🔄 기본 칭찬 항목 6종으로 초기화되었습니다.');
                    }}
                    className="text-[11px] text-amber-700 hover:text-amber-900 underline font-bold cursor-pointer"
                  >
                    기본값 복원
                  </button>
                </div>

                {/* 현재 설정된 칭찬 항목 목록 그리드 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {(tempConfig.praiseConfigs || initialPraiseConfigs).map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 bg-white rounded-xl border border-amber-200/80 flex items-center justify-between gap-2 shadow-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-base">{item.icon}</span>
                        <div className="truncate">
                          <div className="text-xs font-black text-slate-800 truncate">{item.label}</div>
                          <span className="text-[10px] font-bold text-indigo-600">+{item.points}점</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={item.points}
                          onChange={(e) => {
                            const newPoints = Math.max(1, Math.min(10, Number(e.target.value) || 1));
                            const currentList = tempConfig.praiseConfigs || initialPraiseConfigs;
                            const updated = currentList.map((p) =>
                              p.id === item.id ? { ...p, points: newPoints } : p
                            );
                            setTempConfig({ ...tempConfig, praiseConfigs: updated });
                          }}
                          className="w-12 px-1.5 py-0.5 text-center text-xs font-bold border border-slate-200 rounded-md"
                          title="점수 변경"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const currentList = tempConfig.praiseConfigs || initialPraiseConfigs;
                            if (currentList.length <= 1) {
                              onShowToast('⚠️ 최소 1개 이상의 칭찬 항목이 필요합니다.');
                              return;
                            }
                            const updated = currentList.filter((p) => p.id !== item.id);
                            setTempConfig({ ...tempConfig, praiseConfigs: updated });
                            onShowToast(`🗑️ [${item.label}] 칭찬 항목이 삭제되었습니다.`);
                          }}
                          className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 신규 칭찬 항목 추가 바 */}
                <div className="p-3 bg-white rounded-xl border border-dashed border-amber-300 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-amber-900 text-[11px] shrink-0">새 항목 추가:</span>
                  <select
                    value={newPraiseIcon}
                    onChange={(e) => setNewPraiseIcon(e.target.value)}
                    className="px-2 py-1.5 rounded-lg border border-slate-200 font-bold bg-white text-sm"
                  >
                    <option value="⭐">⭐ 별표</option>
                    <option value="🙋">🙋 발표</option>
                    <option value="🤝">🤝 배려</option>
                    <option value="🧹">🧹 청소</option>
                    <option value="🍱">🍱 급식</option>
                    <option value="📝">📝 과제</option>
                    <option value="💖">💖 친절</option>
                    <option value="🎨">🎨 창의</option>
                    <option value="🏃">🏃 체육</option>
                    <option value="👏">👏 박수</option>
                  </select>
                  <input
                    type="text"
                    placeholder="칭찬 항목명 (예: 경청 태도 우수)"
                    value={newPraiseLabel}
                    onChange={(e) => setNewPraiseLabel(e.target.value)}
                    className="flex-1 min-w-[140px] px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 font-bold text-[11px]">점수:</span>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={newPraisePoints}
                      onChange={(e) => setNewPraisePoints(Number(e.target.value) || 1)}
                      className="w-14 px-1.5 py-1.5 rounded-lg border border-slate-200 text-xs text-center font-bold"
                    />
                    <span className="text-slate-500 font-bold text-[11px]">점</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newPraiseLabel.trim()) {
                        onShowToast('⚠️ 추가할 칭찬 항목명을 입력해주세요.');
                        return;
                      }
                      const newItem: PraiseItemConfig = {
                        id: `praise_${Date.now()}`,
                        label: newPraiseLabel.trim(),
                        points: newPraisePoints,
                        icon: newPraiseIcon,
                      };
                      const currentList = tempConfig.praiseConfigs || initialPraiseConfigs;
                      setTempConfig({
                        ...tempConfig,
                        praiseConfigs: [...currentList, newItem],
                      });
                      setNewPraiseLabel('');
                      setNewPraisePoints(1);
                      onShowToast(`🎉 [${newItem.label}] (+${newItem.points}점) 신규 칭찬 항목이 추가되었습니다!`);
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg transition cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>추가</span>
                  </button>
                </div>
              </div>
              </div>
            </div>
          )}

          {/* STEP 4: Timetable Subjects (3 Methods) & Bell Schedule (요구사항 2) */}
          {currentStep === 4 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>
                    {tempConfig.teacherMode === 'subject'
                      ? '4단계: 전담 교과 다중 학급 시간표 & 주당 시수 집계'
                      : '4단계: 주간 시간표 과목 설정 (3가지 방식) & 시정표'}
                  </span>
                </h4>
                {tempConfig.teacherMode === 'subject' && (
                  <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                    교과 전담모드 전용 인터페이스
                  </span>
                )}
              </div>

              {/* 전담모드일 때: 다중 학급 시간표 입력 및 주당 시수 집계 전용 섹션 */}
              {tempConfig.teacherMode === 'subject' ? (
                <div className="space-y-4">
                  {/* 주당 시수 집계 요약 카드 */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-black text-violet-900 flex items-center gap-2">
                          <span>📊 주당 전담 수업 배정 현황</span>
                          <span className="px-2 py-0.5 rounded-md bg-violet-200/60 text-violet-800 text-[11px]">
                            {Object.values(tempConfig.subjectTimetable || {}).reduce((total, dayObj) => {
                              return total + Object.values(dayObj || {}).filter(Boolean).length;
                            }, 0)}시수 배정됨
                          </span>
                        </div>
                        <p className="text-[11px] text-violet-600 font-medium mt-0.5">
                          요일별 각 교시에 들어갈 담당 학급을 배정하면 주당 총 수업 시수가 자동으로 집계됩니다.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-violet-200 shadow-xs">
                        <label className="text-xs font-bold text-slate-600 whitespace-nowrap">주당 목표 시수:</label>
                        <input
                          type="number"
                          min="1"
                          max="40"
                          value={tempConfig.subjectWeeklyTargetHours || 20}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value) || 20);
                            setTempConfig((prev) => ({ ...prev, subjectWeeklyTargetHours: val }));
                          }}
                          className="w-14 px-2 py-1 text-xs font-black text-violet-700 bg-violet-50/50 rounded-lg border border-violet-200 text-center focus:outline-hidden focus:ring-2 focus:ring-violet-400"
                        />
                        <span className="text-xs font-black text-slate-500">시간</span>
                      </div>
                    </div>

                    {/* 주당 진행 바 미리보기 */}
                    <div className="mt-3">
                      {(() => {
                        const assignedHours = Object.values(tempConfig.subjectTimetable || {}).reduce((total, dayObj) => {
                          return total + Object.values(dayObj || {}).filter(Boolean).length;
                        }, 0);
                        const targetHours = tempConfig.subjectWeeklyTargetHours || 20;
                        const pct = Math.min(100, Math.round((assignedHours / targetHours) * 100));
                        return (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-black text-violet-800">
                              <span>배정 완료율: {pct}%</span>
                              <span>{assignedHours} / {targetHours} 시수</span>
                            </div>
                            <div className="w-full h-2.5 rounded-full bg-violet-200/70 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-violet-500 to-indigo-600 transition-all duration-300 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* 다중 학급 주간 시간표 그리드 편집기 */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800">📅 요일별/교시별 담당 학급 배정표</span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        * 빈칸은 공강 또는 연구 시간으로 처리됩니다.
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse text-center">
                        <thead>
                          <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-black">
                            <th className="py-2 px-2 w-14">교시</th>
                            {['월', '화', '수', '목', '금'].map((day) => (
                              <th key={day} className="py-2 px-2 font-black">{day}요일</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {[1, 2, 3, 4, 5, 6].map((period) => (
                            <tr key={period} className="hover:bg-violet-50/30 transition">
                              <td className="py-2 px-2 font-black text-slate-500 bg-slate-50/50">
                                {period}교시
                              </td>
                              {['월', '화', '수', '목', '금'].map((day) => {
                                const currentClass = tempConfig.subjectTimetable?.[day]?.[period] || '';
                                return (
                                  <td key={day} className="p-1.5">
                                    <input
                                      type="text"
                                      placeholder="예: 3-1"
                                      value={currentClass}
                                      onChange={(e) => {
                                        const val = e.target.value.trim();
                                        setTempConfig((prev) => {
                                          const prevTimetable = { ...(prev.subjectTimetable || {}) };
                                          const daySchedule = { ...(prevTimetable[day] || {}) };
                                          if (val) {
                                            daySchedule[period] = val;
                                          } else {
                                            delete daySchedule[period];
                                          }
                                          prevTimetable[day] = daySchedule;
                                          return { ...prev, subjectTimetable: prevTimetable };
                                        });
                                      }}
                                      className={`w-full py-1.5 px-2 text-center font-bold text-xs rounded-xl border transition ${
                                        currentClass
                                          ? 'bg-violet-50 text-violet-800 border-violet-300 font-black shadow-xs'
                                          : 'bg-slate-50 text-slate-400 border-slate-200 focus:bg-white'
                                      } focus:outline-hidden focus:ring-2 focus:ring-violet-400`}
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* 담임모드 전용: 3 Methods Tab Selector (요구사항 2) */}
              {tempConfig.teacherMode !== 'subject' && (
                <>
                <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200 text-xs font-black">
                <button
                  type="button"
                  onClick={() => setScheduleMethod('manual')}
                  className={`flex-1 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    scheduleMethod === 'manual'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>① 직접 셀 입력</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleMethod('pdf')}
                  className={`flex-1 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    scheduleMethod === 'pdf'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>② PDF 주간학습안내 판독</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleMethod('gdrive')}
                  className={`flex-1 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    scheduleMethod === 'gdrive'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>③ 구글 드라이브 주간 자동등록</span>
                </button>
              </div>

              {/* Method 2 Banner: PDF 주간학습안내 시작일 선택 및 분석 반영 (요구사항 3) */}
              {scheduleMethod === 'pdf' && (
                <div className="p-4 bg-amber-50/90 rounded-2xl border border-amber-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-extrabold text-amber-950 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-amber-600" />
                      <span>첨부자료: 주간학습 안내 파일 시작일 선택 분석</span>
                    </span>
                    <span className="text-[11px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md font-bold">
                      OCR AI 시간표 자동 판독
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-amber-200 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        주간학습안내 시작일(월요일) · 파일에서 자동으로 찾아요
                      </label>
                      <input
                        type="date" min="2000-01-01" max="2099-12-31"
                        value={pdfWeekStartDate}
                        onChange={(e) => setPdfWeekStartDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-amber-50/40 border border-amber-300 rounded-lg text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-600">
                          분석 대상 주간학습안내 파일
                        </label>
                        <label className="text-[10px] text-amber-700 font-bold bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded cursor-pointer transition">
                          <span>📂 파일 업로드</span>
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.webp,.hwp,.hwpx"
                            onChange={handlePdfFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <div className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium truncate flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className={`truncate ${pdfUploadedFileName ? '' : 'text-slate-400'}`}>{pdfUploadedFileName || 'PDF(또는 사진) 파일을 올려 주세요'}</span>
                      </div>
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={handleApplyPdfSchedule}
                        className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl shadow-xs cursor-pointer active:scale-95 transition flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>시작일 기준 주간시간표 분석 반영</span>
                      </button>
                    </div>
                  </div>

                  {pdfParseState.status !== 'idle' && (
                    <div
                      className={`px-3 py-2 rounded-xl text-[11px] font-bold border ${
                        pdfParseState.status === 'error'
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : pdfParseState.status === 'reading'
                          ? 'bg-white border-amber-200 text-amber-800 animate-pulse'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      }`}
                    >
                      {pdfParseState.message}
                    </div>
                  )}
                  <p className="text-amber-800 text-[11px] leading-relaxed">
                    PDF 속 '요일 × 교시' 표에서 과목 이름만 읽어 아래 표에 채웁니다 (인터넷·API 키 없이 동작). 글자가 없는 스캔본·사진은 5단계에 Gemini API 키를 등록하면 AI가 읽어요.
                    한글(HWP) 파일은 [파일 → PDF로 저장] 후 올려 주세요. 읽은 결과는 아래 표에서 고친 뒤 <strong>[분석 반영]</strong>을 누르면 시간표 위젯에 적용돼요.
                  </p>
                </div>
              )}

              {/* Method 3 Banner: 구글 드라이브 주간 자동 등록 (공유폴더 연동 & 현재 날짜 기준 자동 판별) */}
              {scheduleMethod === 'gdrive' && (() => {
                const autoWeek = getThisWeekAutoInfo();
                const isVerified = isGdriveFolderVerified && Boolean(gdriveFolderId);

                return (
                  <div className="p-4 bg-sky-50/90 rounded-2xl border border-sky-200 space-y-3.5 text-xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-extrabold text-sky-950 flex items-center gap-1.5">
                        <Cloud className="w-4 h-4 text-sky-600" />
                        <span>구글 드라이브 주간 자동 등록 (공유폴더 연동)</span>
                      </span>
                      <span className="text-[11px] text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md font-bold">
                        현재 날짜 기준 자동 판별
                      </span>
                    </div>

                    {/* 친절한 사용 방법 안내 가이드 박스 */}
                    <div className="p-3 bg-white/95 rounded-xl border border-sky-200/80 shadow-2xs space-y-1.5 text-[11px] leading-relaxed text-slate-700">
                      <div className="flex items-center gap-1.5 font-bold text-sky-900">
                        <span className="text-sm">💡</span>
                        <span>[구글 드라이브 공유폴더 연동 방법 안내]</span>
                      </div>
                      <ol className="list-decimal list-inside text-slate-600 space-y-0.5">
                        <li>구글 드라이브에서 주간학습안내 폴더 → 우클릭 <strong>[공유]</strong> → 일반 액세스를 <strong>[링크가 있는 모든 사용자 · 뷰어]</strong>로 바꾸고 <strong>[링크 복사]</strong></li>
                        <li>파일 이름에 그 주 날짜를 넣어 주세요. 예) <code>11월 2일~11월 6일 주간학습.pdf</code>, <code>주간학습 11.2-11.6.pdf</code> (월별 하위 폴더도 찾아요)</li>
                        <li>파일 형식: <strong>PDF · 구글 문서 · 구글 스프레드시트</strong> (HWP는 PDF로 저장해 올려 주세요)</li>
                        <li>아래에 링크를 붙여 넣고 <strong>[폴더 확인]</strong> → <strong>[주간 시간표 자동 동기화]</strong></li>
                      </ol>
                    </div>

                    <div className="space-y-3 bg-white p-3.5 rounded-xl border border-sky-200">
                      {/* 1) 공유폴더 URL 입력 & 폴더 확인 버튼 */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          1) 구글 드라이브 공유폴더 웹 주소 (URL)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <FolderOpen className="w-4 h-4 text-sky-600 shrink-0" />
                          <SecretInput
                            type="text"
                            value={gdriveFolderUrl}
                            onChange={(e) => {
                              setGdriveFolderUrl(e.target.value);
                              setIsGdriveFolderVerified(false);
                            }}
                            placeholder="https://drive.google.com/drive/folders/..."
                            className="flex-1 px-3 py-2 bg-sky-50/40 border border-sky-300 rounded-xl text-xs font-medium text-sky-950 outline-none focus:ring-2 focus:ring-sky-500"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyGdriveFolder}
                            className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer shrink-0 flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>폴더 확인</span>
                          </button>
                        </div>
                        {/* 폴더 확인 성공 안내 뱃지 */}
                        {isVerified && gdriveState.status !== 'error' && (
                          <div className="mt-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-[11px] font-bold flex items-center gap-1.5 animate-fade-in shadow-2xs">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">
                              공유 폴더 연결됨{typeof gdriveState.count === 'number' && gdriveState.status !== 'idle' ? ` · 읽을 수 있는 파일 ${gdriveState.count}개` : ''}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 2) 둥근 캡슐형 '캔디바(Candy Pill Bar)': 현재 날짜 기준 해당 주간 파일 자동 판별 */}
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-1 text-[11px]">
                          <span className="text-slate-500 font-medium">
                            📅 현재 시스템 기준 주간: <strong className="text-slate-800">{autoWeek.weekLabel}</strong>
                          </span>
                          <span className="text-[10px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-bold">
                            실시간 자동 판별
                          </span>
                        </div>

                        {/* 캔디바 본체: 실제로 찾은 이번 주 파일 */}
                        {gdriveState.status === 'found' ? (
                          <div className="px-4 py-2.5 rounded-full bg-gradient-to-r from-emerald-500/15 via-sky-500/15 to-indigo-500/15 border border-emerald-400/60 text-emerald-900 flex items-center justify-between gap-2 shadow-sm animate-fade-in text-xs font-black">
                            <div className="flex items-center gap-2 truncate">
                              <span className="text-base shrink-0">📄</span>
                              <span className="truncate">
                                이번 주 파일: <strong>{gdriveState.message}</strong>
                              </span>
                            </div>
                            <span className="shrink-0 text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-bold shadow-2xs">찾음 🟢</span>
                          </div>
                        ) : gdriveState.status === 'reading' ? (
                          <div className="px-4 py-2.5 rounded-full bg-sky-50 border border-sky-200 text-sky-800 flex items-center gap-2 text-xs font-bold animate-pulse">
                            <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                            <span className="truncate">{gdriveState.message}</span>
                          </div>
                        ) : gdriveState.status === 'notfound' || gdriveState.status === 'error' ? (
                          <div className="px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-2 text-[11px] font-bold">
                            <span className="shrink-0">⚠️</span>
                            <span>{gdriveState.message}</span>
                          </div>
                        ) : (
                          <div className="px-4 py-2.5 rounded-full bg-slate-100 border border-slate-300/80 text-slate-600 flex items-center gap-2 text-xs font-semibold shadow-2xs">
                            <Sparkles className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="truncate">
                              🔍 [{autoWeek.mondayStr.replace(/-/g, '.')} ~ {String(autoWeek.fMonth).padStart(2, '0')}.{String(autoWeek.fDate).padStart(2, '0')}] 주간 파일을 찾으려면 [폴더 확인]을 눌러 주세요
                            </span>
                          </div>
                        )}
                        <label className="flex items-center gap-2 text-[11px] text-slate-600 font-bold cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            checked={gdriveAutoSync}
                            onChange={(e) => {
                              setGdriveAutoSync(e.target.checked);
                              try {
                                localStorage.setItem('ttime_gdrive_auto_sync', e.target.checked ? 'true' : 'false');
                              } catch {}
                            }}
                            className="w-4 h-4 accent-sky-600"
                          />
                          <span>매주 자동으로 가져오기 (앱을 켤 때 · 주말에는 다음 주 파일을 미리 확인)</span>
                        </label>
                      </div>

                      {/* 3) 하단 동기화 버튼 (파일 인식 시 눈에 띄는 네온 펄스/반짝임 Glow CSS 효과) */}
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={handleApplyGoogleDriveSync}
                          disabled={!isVerified || gdriveState.status === 'reading'}
                          className={`w-full py-2.5 text-white font-black rounded-xl shadow-md transition flex items-center justify-center gap-2 ${
                            isVerified
                              ? 'bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-600 hover:from-emerald-600 hover:to-indigo-700 animate-pulse shadow-[0_0_24px_rgba(16,185,129,0.7)] ring-2 ring-emerald-400 active:scale-95 cursor-pointer'
                              : 'bg-slate-300 cursor-not-allowed text-slate-500'
                          }`}
                        >
                          <Sparkles className={`w-4 h-4 ${isVerified ? 'text-amber-300 animate-spin' : 'text-slate-400'}`} />
                          <span>주간 시간표 자동 동기화 ({autoWeek.weekLabel})</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-sky-800 text-[11px] leading-relaxed">
                      오늘 날짜가 속한 주의 파일을 이름의 날짜로 찾아 내려받고, 표에서 과목을 읽어 시간표 위젯에 반영합니다.
                    </p>
                  </div>
                );
              })()}

              {/* Weekly Schedule Table (Mon-Fri 1-6 periods) */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-800">
                  월~금 요일별 교시 과목 시간표
                </div>
                <div className="grid grid-cols-5 divide-x divide-slate-200 text-xs text-center">
                  {(['월', '화', '수', '목', '금'] as const).map((day) => (
                    <div key={day} className="p-2 space-y-1.5">
                      <div className="font-black text-indigo-700 bg-indigo-50 py-1 rounded-lg">
                        {day}요일
                      </div>
                      {[1, 2, 3, 4, 5, 6].map((p) => {
                        const curItem = tempSchedule[day]?.find((item) => item.period === p);
                        return (
                          <div key={p} className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-bold w-4">{p}</span>
                            <input
                              type="text"
                              value={curItem?.subject || ''}
                              placeholder="-"
                              onChange={(e) => {
                                const dayList = [...(tempSchedule[day] || [])];
                                const existIdx = dayList.findIndex((it) => it.period === p);
                                if (existIdx >= 0) {
                                  dayList[existIdx] = { ...dayList[existIdx], subject: e.target.value };
                                } else {
                                  dayList.push({
                                    period: p,
                                    subject: e.target.value,
                                    color: 'bg-slate-100 text-slate-700',
                                  });
                                }
                                setTempSchedule({ ...tempSchedule, [day]: dayList });
                              }}
                              className="w-full text-center text-xs font-bold py-1 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-500 outline-none"
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              </>
              )}

              {/* Bell Schedule Configuration (시정표 및 점심시간 유연 배치) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        교시별 시정표 설정 & 점심시간 유연 배치 (쉬는 시간 타이머 연동)
                      </span>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        카드를 마우스로 드래그하여 순서를 바꿀 수 있습니다. (맨 왼쪽부터 1교시로 자동 순차 정렬)
                      </p>
                    </div>
                  </div>

                  {/* 💡 사용자 요청: 상단 점심시간 3교시후/4교시후 버튼 삭제, 쉬는 시간 연동 토글만 유지 */}
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">쉬는 시간 연동:</span>
                    <button
                      type="button"
                      onClick={() =>
                        setTempConfig({
                          ...tempConfig,
                          bellScheduleAutoRun: !tempConfig.bellScheduleAutoRun,
                        })
                      }
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition cursor-pointer ${
                        tempConfig.bellScheduleAutoRun
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {tempConfig.bellScheduleAutoRun ? '⚡ 자동' : '✋ 수동'}
                    </button>
                  </div>
                </div>

                {/* 교시 카드 및 점심시간 카드 드래그 앤 드롭 그리드 (총 7개) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-xs">
                  {getNormalizedBellSchedule(tempConfig.bellSchedule, tempConfig.lunchAfterPeriod ?? 4).map((item, bIdx, arr) => {
                    const isLunch = item.type === 'lunch';
                    const isDragging = draggedScheduleIndex === bIdx;
                    const isDragOver = dragOverScheduleIndex === bIdx;

                    if (isLunch) {
                      return (
                        <div
                          key="lunch-card"
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', String(bIdx));
                            setDraggedScheduleIndex(bIdx);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (dragOverScheduleIndex !== bIdx) setDragOverScheduleIndex(bIdx);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (draggedScheduleIndex !== null) {
                              handleReorderSchedule(draggedScheduleIndex, bIdx);
                            }
                            setDraggedScheduleIndex(null);
                            setDragOverScheduleIndex(null);
                          }}
                          onDragEnd={() => {
                            setDraggedScheduleIndex(null);
                            setDragOverScheduleIndex(null);
                          }}
                          className={`p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border-2 border-dashed transition flex flex-col justify-between shadow-2xs select-none ${
                            isDragOver
                              ? 'border-indigo-500 ring-2 ring-indigo-400/50 bg-indigo-50/60 dark:bg-indigo-950/50 scale-[1.02]'
                              : 'border-amber-300 dark:border-amber-700'
                          } ${isDragging ? 'opacity-40 scale-95' : 'opacity-100'}`}
                        >
                          {/* 상단: 그립 핸들 및 라벨, 이동 버튼 */}
                          <div className="flex items-center justify-between pb-1 border-b border-amber-200/70 dark:border-amber-800/60">
                            <button
                              type="button"
                              onClick={() => handleMoveScheduleStep(bIdx, 'left')}
                              disabled={bIdx === 0}
                              className="p-0.5 text-amber-700 dark:text-amber-300 disabled:opacity-20 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded cursor-pointer transition"
                              title="왼쪽으로 이동"
                            >
                              <ChevronLeft className="w-3 h-3" />
                            </button>
                            <div className="font-black text-amber-900 dark:text-amber-200 text-[11px] flex items-center gap-1 cursor-grab active:cursor-grabbing">
                              <GripVertical className="w-3 h-3 text-amber-500" />
                              <span>🍱 점심시간</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleMoveScheduleStep(bIdx, 'right')}
                              disabled={bIdx === arr.length - 1}
                              className="p-0.5 text-amber-700 dark:text-amber-300 disabled:opacity-20 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded cursor-pointer transition"
                              title="오른쪽으로 이동"
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>

                          {/* 💡 사용자 요청: "점심시간은 지금 디자인에서 시간만 사용자가 직접 입력가능하게 해줘." */}
                          <div className="space-y-1 my-1">
                            <input
                              type="time"
                              value={item.start}
                              onChange={(e) => handleLunchTimeChange(bIdx, e.target.value, item.end)}
                              className="w-full text-center text-[10px] font-mono font-bold border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 rounded p-0.5 text-amber-950 dark:text-amber-100 shadow-2xs"
                            />
                            <div className="text-[9px] text-amber-500 font-bold">~</div>
                            <input
                              type="time"
                              value={item.end}
                              onChange={(e) => handleLunchTimeChange(bIdx, item.start, e.target.value)}
                              className="w-full text-center text-[10px] font-mono font-bold border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 rounded p-0.5 text-amber-950 dark:text-amber-100 shadow-2xs"
                            />
                          </div>

                          {/* 하단: 급식 및 휴식 분 배지 (사용자가 입력한 시간에 맞춰 실시간 자동 계산) */}
                          <div className="text-[9px] text-amber-700 dark:text-amber-300 font-bold bg-amber-100/90 dark:bg-amber-900/50 py-0.5 px-1 rounded flex items-center justify-center gap-0.5">
                            <span>급식 및 휴식 ({calculateTimeDiffMinutes(item.start, item.end) || item.breakMinutes || 50}분)</span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={`period-card-${item.period}`}
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', String(bIdx));
                          setDraggedScheduleIndex(bIdx);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (dragOverScheduleIndex !== bIdx) setDragOverScheduleIndex(bIdx);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedScheduleIndex !== null) {
                            handleReorderSchedule(draggedScheduleIndex, bIdx);
                          }
                          setDraggedScheduleIndex(null);
                          setDragOverScheduleIndex(null);
                        }}
                        onDragEnd={() => {
                          setDraggedScheduleIndex(null);
                          setDragOverScheduleIndex(null);
                        }}
                        className={`p-2.5 bg-white dark:bg-slate-900 rounded-xl border transition flex flex-col justify-between shadow-2xs select-none ${
                          isDragOver
                            ? 'border-indigo-500 ring-2 ring-indigo-400/50 bg-indigo-50/60 dark:bg-indigo-950/50 scale-[1.02]'
                            : 'border-slate-200 dark:border-slate-700'
                        } ${isDragging ? 'opacity-40 scale-95' : 'opacity-100'}`}
                      >
                        {/* 상단: 노출 선택 체크박스, 그립 핸들 및 순차적 교시 라벨, 이동 버튼 */}
                        <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800 gap-1">
                          <div className="flex items-center gap-0.5">
                            {/* PART 2: 교시별 노출 선택 체크박스 */}
                            <input
                              type="checkbox"
                              checked={item.enabled !== false}
                              onChange={(e) => {
                                const currentList = getNormalizedBellSchedule(tempConfig.bellSchedule, tempConfig.lunchAfterPeriod ?? 4);
                                const updated = [...currentList];
                                updated[bIdx] = { ...updated[bIdx], enabled: e.target.checked };
                                setTempConfig({ ...tempConfig, bellSchedule: updated });
                              }}
                              title="대시보드 시간표 위젯 노출 여부 (체크 해제 시 단축수업 등으로 숨김)"
                              className="w-3.5 h-3.5 rounded accent-indigo-600 cursor-pointer"
                            />
                            <button
                              type="button"
                              onClick={() => handleMoveScheduleStep(bIdx, 'left')}
                              disabled={bIdx === 0}
                              className="p-0.5 text-slate-500 dark:text-slate-400 disabled:opacity-20 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer transition"
                              title="왼쪽으로 이동"
                            >
                              <ChevronLeft className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="font-extrabold text-indigo-950 dark:text-indigo-200 text-[11px] flex items-center gap-1 cursor-grab active:cursor-grabbing">
                            <GripVertical className="w-3 h-3 text-slate-400" />
                            <span className={item.enabled === false ? 'line-through opacity-40 text-slate-400' : ''}>
                              {item.period}교시
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleMoveScheduleStep(bIdx, 'right')}
                            disabled={bIdx === arr.length - 1}
                            className="p-0.5 text-slate-500 dark:text-slate-400 disabled:opacity-20 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer transition"
                            title="오른쪽으로 이동"
                          >
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>


                        {/* 시간 입력 */}
                        <div className="space-y-1 my-1">
                          <input
                            type="time"
                            value={item.start}
                            onChange={(e) => {
                              const currentList = getNormalizedBellSchedule(tempConfig.bellSchedule, tempConfig.lunchAfterPeriod ?? 4);
                              const updated = [...currentList];
                              updated[bIdx] = { ...updated[bIdx], start: e.target.value };
                              setTempConfig({ ...tempConfig, bellSchedule: updated });
                            }}
                            className="w-full text-center text-[10px] font-mono border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded p-0.5 text-slate-800 dark:text-slate-200 font-bold"
                          />
                          <div className="text-[9px] text-slate-400">~</div>
                          <input
                            type="time"
                            value={item.end}
                            onChange={(e) => {
                              const currentList = getNormalizedBellSchedule(tempConfig.bellSchedule, tempConfig.lunchAfterPeriod ?? 4);
                              const updated = [...currentList];
                              updated[bIdx] = { ...updated[bIdx], end: e.target.value };
                              setTempConfig({ ...tempConfig, bellSchedule: updated });
                            }}
                            className="w-full text-center text-[10px] font-mono border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded p-0.5 text-slate-800 dark:text-slate-200 font-bold"
                          />
                        </div>

                        {/* 휴식 분 입력 */}
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1">
                          <span>휴식:</span>
                          <input
                            type="number"
                            value={item.breakMinutes}
                            onChange={(e) => {
                              const currentList = getNormalizedBellSchedule(tempConfig.bellSchedule, tempConfig.lunchAfterPeriod ?? 4);
                              const updated = [...currentList];
                              updated[bIdx] = { ...updated[bIdx], breakMinutes: Number(e.target.value) };
                              setTempConfig({ ...tempConfig, bellSchedule: updated });
                            }}
                            className="w-8 text-center font-bold border border-slate-200 dark:border-slate-700 rounded text-[10px] bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                          />
                          <span>분</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: 보안 잠금, 구글 드라이브 동기화 & 고도화 기능 로드맵 (요구사항 8, 9, 12) */}
          {currentStep === 5 && (
            <div className="space-y-5">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                <span>5단계: 학급 보안 잠금, 개인 구글 드라이브 연동 및 기능 로드맵</span>
              </h4>

              {/* 0. 시작 인트로 → 잠금화면 */}
              <label className="flex items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-pink-50 via-violet-50 to-sky-50 rounded-2xl border border-violet-200 cursor-pointer">
                <div>
                  <div className="font-black text-xs text-slate-900">🎬 프로그램 시작 인트로 (루미 등장 → 잠금화면)</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">켜 두면 앱을 실행할 때마다 인트로가 나온 뒤 잠금화면(PIN 입력)으로 시작해요.</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked={(() => {
                    try {
                      return localStorage.getItem('class_intro_enabled') !== 'false';
                    } catch {
                      return true;
                    }
                  })()}
                  onChange={(e) => {
                    try {
                      localStorage.setItem('class_intro_enabled', e.target.checked ? 'true' : 'false');
                    } catch {}
                    onShowToast(e.target.checked ? '🎬 다음 실행부터 인트로 후 잠금화면으로 시작해요.' : '⏭️ 다음 실행부터 인트로 없이 바로 시작해요.');
                  }}
                  className="w-5 h-5 accent-violet-600 cursor-pointer shrink-0"
                />
              </label>

              {/* 1. 보안 및 화면 자동 잠금 설정 (요구사항 8, 12) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                        <span>화면 자동 잠금 및 개인정보 보호 (보안 최우선)</span>
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                          학생 프라이버시 보호
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        일정 시간 동안 마우스/키보드 조작이 없을 시 학생 상담기록과 대시보드를 잠금 화면으로 보호합니다.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* 자동 잠금 시간 설정 */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-indigo-600" />
                      <span>화면 자동 잠금 시간 설정</span>
                    </label>
                    <div className="grid grid-cols-5 gap-1 text-[11px]">
                      {[
                        { label: '끄기', val: 0 },
                        { label: '1분', val: 1 },
                        { label: '3분', val: 3 },
                        { label: '5분', val: 5 },
                        { label: '10분', val: 10 },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => {
                            setTempConfig({
                              ...tempConfig,
                              securityConfig: {
                                ...(tempConfig.securityConfig || {
                                  isLocked: false,
                                  passwordHash: '',
                                  recoveryGoogleEmail: '',
                                }),
                                autoLockMinutes: item.val,
                              },
                            });
                          }}
                          className={`py-1.5 rounded-lg border font-bold transition text-center cursor-pointer ${
                            (tempConfig.securityConfig?.autoLockMinutes ?? 0) === item.val
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    {/* ⌨️ 직접 입력 (분) */}
                    {(() => {
                      const cur = tempConfig.securityConfig?.autoLockMinutes ?? 0;
                      const isCustom = ![0, 1, 3, 5, 10].includes(cur);
                      const setMin = (v: number) =>
                        setTempConfig({
                          ...tempConfig,
                          securityConfig: {
                            ...(tempConfig.securityConfig || { isLocked: false, passwordHash: '', recoveryGoogleEmail: '' }),
                            autoLockMinutes: v,
                          },
                        });
                      return (
                        <div className={`mt-1.5 flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[11px] font-bold ${isCustom ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                          <span className="shrink-0">✍️ 직접 입력</span>
                          <input
                            type="number"
                            min={1}
                            max={480}
                            step={1}
                            inputMode="numeric"
                            placeholder="예: 15"
                            defaultValue={isCustom ? cur : ''}
                            key={isCustom ? `c${cur}` : 'p'}
                            onBlur={(e) => {
                              const v = Math.round(Number(e.currentTarget.value));
                              if (v >= 1 && v <= 480) setMin(v);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                (e.currentTarget as HTMLInputElement).blur();
                              }
                            }}
                            className="w-16 min-w-0 px-2 py-1 rounded-md border border-slate-300 bg-white text-slate-900 text-right font-black outline-none focus:border-indigo-500"
                            data-autolock-custom
                          />
                          <span className="shrink-0">분 동안 안 쓰면 잠금</span>
                          {isCustom && <span className="ml-auto shrink-0 text-indigo-600">✓ {cur}분</span>}
                        </div>
                      );
                    })()}
                    <p className="mt-1 text-[10px] text-slate-500 leading-snug">1~480분 사이 숫자를 적고 Enter를 누르면 정해져요. 환경설정을 저장(다음·완료)하면 반영돼요.</p>
                  </div>

                  {/* 관리자 비밀번호 변경 */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
                      <Key className="w-3 h-3 text-indigo-600" />
                      <span>관리자 PIN 변경 (화면 잠금 · 관찰일지 공용)</span>
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="password"
                        placeholder="현재 PIN 또는 복구 코드"
                        value={currentPinInput}
                        onChange={(e) => setCurrentPinInput(e.target.value)}
                        className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                      />
                      <input
                        type="password"
                        placeholder="새 PIN (4자리 이상)"
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                        className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (!newPasswordInput || newPasswordInput.length < 4) {
                            onShowToast('⚠️ PIN은 4자리 이상으로 입력해주세요.');
                            return;
                          }
                          if (!(await verifyPinOrRecovery(currentPinInput))) {
                            onShowToast('🔴 현재 PIN(또는 복구 코드)이 일치하지 않습니다.');
                            return;
                          }
                          try {
                            const code = await setAdminPin(newPasswordInput);
                            setIssuedRecoveryCode(code);
                            setNewPasswordInput('');
                            setCurrentPinInput('');
                            onShowToast('🔒 관리자 PIN이 변경되었습니다. 아래 복구 코드를 꼭 적어 두세요.');
                          } catch (err: any) {
                            onShowToast(`⚠️ ${err?.message || 'PIN 변경 중 오류가 발생했습니다.'}`);
                          }
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition cursor-pointer shrink-0"
                      >
                        변경 저장
                      </button>
                    </div>
                    {issuedRecoveryCode ? (
                      <div className="mt-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900">
                        <span className="font-bold">PIN 분실 시 복구 코드: </span>
                        <span className="font-mono font-black tracking-widest select-all">{issuedRecoveryCode}</span>
                        <span className="block text-emerald-700 mt-0.5">지금만 표시됩니다. 종이에 적어 안전한 곳에 보관하세요.</span>
                      </div>
                    ) : (
                      isUsingDefaultPin() && (
                        <p className="mt-1.5 text-[10.5px] text-amber-700 font-semibold">⚠️ 초기 PIN(0000)을 사용 중입니다. 학생이 알 수 없는 PIN으로 바꿔 주세요.</p>
                      )
                    )}
                  </div>
                </div>

                {/* 복구용 구글 이메일 (선택 · 안내용) */}
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center gap-2 text-xs flex-wrap">
                  <span className="text-slate-500 font-bold text-[11px] shrink-0">복구 안내용 이메일 (선택):</span>
                  <input
                    type="email"
                    value={tempConfig.securityConfig?.recoveryGoogleEmail ?? ''}
                    onChange={(e) =>
                      setTempConfig({
                        ...tempConfig,
                        securityConfig: {
                          ...(tempConfig.securityConfig || {
                            autoLockMinutes: 0,
                            isLocked: false,
                            passwordHash: '',
                          }),
                          recoveryGoogleEmail: e.target.value,
                        },
                      })
                    }
                    placeholder="classin.teacher@gmail.com"
                    className="flex-1 min-w-[180px] px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium"
                  />
                  <span className="text-[10px] text-slate-400 basis-full">
                    PIN을 잊으면 <strong>PIN 변경 때 받은 복구 코드</strong>로 잠금을 풀어요. 이메일로 인증번호가 발송되지는 않으며, 이 칸은 기록용입니다.
                  </span>
                </div>
              </div>

              {/* 2. 구글 캘린더 연결은 캘린더 위젯에서 (한 곳에서만 관리) */}
              <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-800 flex items-center gap-3 text-xs" data-cal-moved>
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">🗓️</div>
                <div className="leading-relaxed">
                  <div className="font-black text-slate-900 dark:text-white">구글 캘린더 연결은 <span className="text-blue-700 dark:text-blue-300">캘린더 위젯</span>에서 해요</div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">
                    위젯 오른쪽 위 <b>⚙️ 연결</b>을 누르면 구글 캘린더 양방향 연결 · iCal 주소 · .ics 파일 가져오기를 한 곳에서 등록하고 바꿀 수 있어요.
                  </div>
                </div>
              </div>

              {/* 3. [외부 API & 클라우드 연동] (BYOK 보안 & Multi-Device Sync) */}
              <div className="p-4 bg-gradient-to-r from-indigo-50/80 via-purple-50/70 to-emerald-50/80 rounded-2xl border border-indigo-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                      <Key className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="font-black text-xs text-indigo-950 flex items-center gap-1.5">
                        <span>외부 API & 클라우드 연동 관리 (BYOK 보안 아키텍처)</span>
                        <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                          안전한 로컬 보관
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        배포 패키지에 개발자 키가 포함되지 않으며, 선생님 본인의 무료 API 키를 등록하여 AI 캐릭터 루미와의 대화 및 구글 드라이브 동기화를 활용합니다.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2-A. Google Gemini API Key (AI 캐릭터 루미 전용) */}
                <div className="p-3 bg-white/90 rounded-xl border border-indigo-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <label className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px]">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Google AI Studio Gemini API 키 (AI 캐릭터 루미):</span>
                    </label>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-indigo-600 hover:underline font-bold"
                    >
                      무료 API 키 발급받기 ↗
                    </a>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showGeminiKey ? 'text' : 'password'}
                        value={geminiKeyInput}
                        onChange={(e) => {
                          setGeminiKeyInput(e.target.value);
                          setGeminiTestStatus(null);
                        }}
                        placeholder="AIzaSy... 로 시작하는 본인의 Gemini API 키를 입력하세요"
                        className="w-full px-3 py-2 pr-9 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowGeminiKey(!showGeminiKey)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showGeminiKey ? '숨기기' : '보기'}
                      >
                        {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={isTestingGemini || !geminiKeyInput.trim()}
                      onClick={async () => {
                        setIsTestingGemini(true);
                        setGeminiTestStatus(null);
                        const res = await testGeminiApiKey(geminiKeyInput);
                        setIsTestingGemini(false);
                        setGeminiTestStatus(res);
                        if (res.success) {
                          setStoredGeminiApiKey(geminiKeyInput);
                          onShowToast(`🟢 ${res.message}`);
                        } else {
                          onShowToast(`🔴 ${res.message}`);
                        }
                      }}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition flex items-center gap-1.5 shrink-0"
                    >
                      {isTestingGemini ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>연결 테스트 중...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>연결 테스트 &amp; 저장</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    💡 이곳에 등록된 API 키는 로컬에 안전하게 보관되며, AI 캐릭터 루미(Lumi)의 지능형 대화 및 인터랙티브 기능에 연동됩니다.
                  </p>

                  {geminiTestStatus && (
                    <div
                      className={`p-2 rounded-lg text-[11px] font-bold flex items-center gap-1.5 ${
                        geminiTestStatus.success
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      <span>{geminiTestStatus.success ? '✓' : '⚠'}</span>
                      <span>{geminiTestStatus.message}</span>
                    </div>
                  )}
                </div>

                {/* 2-B. 구글 드라이브 다중 기기 클라우드 동기화 (Multi-Device Sync) */}
                <div className="p-3 bg-white/90 rounded-xl border border-emerald-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="font-black text-slate-800 flex items-center gap-1.5 text-[11px]">
                      <Cloud className="w-4 h-4 text-emerald-600" />
                      <span>다중 기기 백업 & 동기화 (교실 PC ↔ 자택 PC/Mac ↔ 태블릿)</span>
                    </div>
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded-md">
                      {cloudSyncInfo.lastSyncTime ? `최근: ${cloudSyncInfo.lastSyncTime}` : '동기화 이력 없음'}
                    </span>
                  </div>

                  {/* 🔐 백업 암호 (선택 · 권장) */}
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
                    <Key className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder="백업 암호 (6자 이상 · 입력하면 백업 파일/구글 드라이브 전송을 암호화)"
                      value={backupPassphrase}
                      onChange={(e) => setBackupPassphrase(e.target.value)}
                      className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                    />
                    <span className="text-[10px] text-slate-500 shrink-0 hidden sm:inline">저장되지 않음 · 분실 시 복구 불가</span>
                  </div>

                  {/* 원클릭 백업 다운로드 & 복원 업로드 버튼 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        if (backupPassphrase && backupPassphrase.length < 6) {
                          onShowToast('⚠️ 백업 암호는 6자 이상으로 입력해 주세요.');
                          return;
                        }
                        const ok = await exportDashboardBackupFile(undefined, backupPassphrase || undefined);
                        if (ok) {
                          onShowToast(
                            backupPassphrase
                              ? '🔐 암호화된 학급 백업 파일이 다운로드되었습니다. (복원 시 같은 백업 암호 필요)'
                              : '💾 학급 전체 백업 파일이 다운로드되었습니다. (학생 정보 보호를 위해 백업 암호 사용을 권장해요)'
                          );
                        } else {
                          onShowToast('🔴 백업 파일 다운로드 중 오류가 발생했습니다.');
                        }
                      }}
                      className="p-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl border border-indigo-200 font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>원클릭 학급 백업 파일 다운로드 (.json)</span>
                    </button>

                    <label className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200 font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shadow-2xs text-center">
                      <Upload className="w-3.5 h-3.5" />
                      <span>백업 파일 선택 복원 (.json)</span>
                      <input
                        type="file"
                        accept=".json,application/json"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = async (event) => {
                            const content = event.target?.result as string;
                            if (content) {
                              const result = await restoreDashboardBackup(content, backupPassphrase || undefined);
                              if (result.success) {
                                onShowToast(`🟢 ${result.message} 대시보드를 새로고침합니다.`);
                                setTimeout(() => window.location.reload(), 1000);
                              } else {
                                onShowToast(`🔴 ${result.message}`);
                              }
                            }
                          };
                          reader.readAsText(file);
                        }}
                      />
                    </label>
                  </div>

                  {/* ☁️ 구글 드라이브 전용 전체 백업 (API 키 없는 Google Apps Script 웹 앱) */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-800 block text-[11px] flex items-center gap-1.5">
                        <Cloud className="w-3.5 h-3.5 text-sky-600" />
                        <span>☁️ Class in 구글 드라이브 백업 Webhook URL (API 키 불필요):</span>
                      </label>
                      <span className="text-[10px] text-sky-700 bg-sky-50 font-bold px-2 py-0.5 rounded-md border border-sky-200">
                        드라이브 내 'Class in Backup' 폴더 자동 백업
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <SecretInput
                        type="url"
                        placeholder="https://script.google.com/macros/s/AKfycb.../exec (구글 드라이브 백업 전용)"
                        value={googleDriveBackupUrl}
                        onChange={(e) => {
                          const val = e.target.value;
                          setGoogleDriveBackupUrl(val);
                          try {
                            localStorage.setItem('ttime_gdrive_backup_url', val);
                          } catch {}
                        }}
                        className="flex-1 px-3 py-1.5 rounded-xl border border-sky-300 bg-white font-mono text-xs focus:ring-2 focus:ring-sky-500"
                      />
                      <button
                        type="button"
                        disabled={isSendingDriveBackup || !googleDriveBackupUrl.trim()}
                        onClick={async () => {
                          if (!googleDriveBackupUrl.trim()) {
                            onShowToast('⚠️ 구글 드라이브 백업 웹 앱 URL을 먼저 입력해 주세요.');
                            return;
                          }
                          if (backupPassphrase && backupPassphrase.length < 6) {
                            onShowToast('⚠️ 백업 암호는 6자 이상으로 입력해 주세요.');
                            return;
                          }
                          setIsSendingDriveBackup(true);
                          const res = await sendBackupToGoogleDrive(googleDriveBackupUrl, backupPassphrase || undefined).finally(() =>
                            setIsSendingDriveBackup(false)
                          );
                          if (res.success) {
                            onShowToast(`🟢 ${res.message}`);
                            setCloudSyncInfo(getLocalCloudSyncInfo());
                          } else {
                            onShowToast(`🔴 ${res.message}`);
                          }
                        }}
                        className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition flex items-center gap-1 shrink-0"
                      >
                        {isSendingDriveBackup ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>백업 전송 중...</span>
                          </>
                        ) : (
                          <>
                            <Cloud className="w-3.5 h-3.5" />
                            <span>구글 드라이브로 지금 백업 전송</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* 구글 드라이브 백업 스크립트 안내 접이식 아코디언 */}
                    <details className="mt-2 p-3 bg-slate-50 border border-sky-200/80 rounded-2xl text-xs space-y-2 group">
                      <summary className="font-bold text-sky-800 cursor-pointer flex items-center justify-between select-none">
                        <span className="flex items-center gap-1.5">
                          <span>💡 [구글 드라이브 백업 스크립트 안내]</span>
                          <span className="text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.2 rounded font-normal">클릭하여 펼치기</span>
                        </span>
                        <span className="text-slate-400 group-open:rotate-180 transition">▼</span>
                      </summary>

                      <div className="pt-2 text-slate-700 space-y-3 leading-relaxed text-[11px] border-t border-slate-200/60 mt-1">
                        {/* ⚠️ 구글 Apps Script 계정 연동 보안 경고 안내 카드 */}
                        <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 space-y-2 shadow-2xs">
                          <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                            <span className="text-base">⚠️</span>
                            <span>[필독] 웹 앱 배포 시 'Google에서 확인하지 않은 앱' 경고창 대처 방법:</span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-amber-900/90">
                            선생님의 개인 구글 계정에서 직접 생성한 안전한 스크립트이므로 구글의 사전 심사를 거치지 않아 최초 권한 승인 시 보안 경고 화면이 나타납니다. <strong>아래 3단계로 5초 만에 승인</strong>하실 수 있습니다!
                          </p>
                          <div className="bg-white/90 p-2.5 rounded-lg border border-amber-200/80 space-y-1.5 text-[11px]">
                            <div className="flex items-start gap-2">
                              <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 mt-0.5">1단계</span>
                              <span>경고창 좌측 하단의 조그만 파란색 글씨 <strong>[고급 (Advanced)]</strong>을 클릭합니다.</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 mt-0.5">2단계</span>
                              <span>아래에 펼쳐지는 <strong>'Class in 백업(으)로 이동(안전하지 않음)'</strong> 링크를 클릭합니다. (프로젝트 제목을 안 바꿨다면 '제목 없는 프로젝트')</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 mt-0.5">3단계</span>
                              <span>Google 계정 액세스 권한 요청 화면에서 우측 하단의 파란색 <strong>[허용 (Allow)]</strong> 버튼을 클릭합니다.</span>
                            </div>
                          </div>
                          <p className="text-[10.5px] text-amber-800 font-medium">
                            👉 승인이 완료되면 발급되는 <strong>웹 앱 URL(https://script.google.com/macros/s/.../exec)</strong>을 복사하여 위 입력창에 넣고 [구글 드라이브로 지금 백업 전송]을 누르면 끝납니다!
                          </p>
                        </div>

                        <p className="font-bold text-slate-900">📌 구글 드라이브 백업 웹 앱 만들기 (5단계 · 처음 한 번만):</p>
                        <ol className="list-decimal list-inside space-y-1.5 text-slate-600 pl-1">
                          <li>
                            <a href="https://script.google.com/home/start" target="_blank" rel="noreferrer" className="text-sky-600 underline font-bold">script.google.com</a> 접속 → <strong>[새 프로젝트]</strong> (또는 구글 드라이브 → [+ 신규] → [더보기] → [Google Apps Script]). 왼쪽 위 제목을 <strong>Class in 백업</strong>으로 바꿔 두면 찾기 쉬워요.
                          </li>
                          <li>편집기의 기본 코드(<code>function myFunction()…</code>)를 모두 지우고 아래 <strong>[코드 복사]</strong>한 내용을 붙여 넣은 뒤 💾 저장(Ctrl+S / ⌘+S)합니다.</li>
                          <li>
                            오른쪽 위 <strong>[배포] → [새 배포]</strong> → 유형 선택 톱니바퀴 ⚙️ → <strong>[웹 앱]</strong>:
                            <ul className="list-disc list-inside pl-4 text-sky-700 font-bold mt-0.5 space-y-0.5">
                              <li>다음 사용자 인증 정보로 실행: <span className="underline">나</span></li>
                              <li>액세스 권한이 있는 사용자: <span className="underline text-rose-600">모든 사용자</span> (꼭 이것으로! '나만'으로 하면 대시보드에서 저장할 수 없어요)</li>
                            </ul>
                          </li>
                          <li><strong>[배포]</strong> → <strong>[액세스 승인]</strong> → 내 구글 계정 선택 → 위 노란 상자의 '확인하지 않은 앱' 경고 넘기기(고급 → 이동 → 허용)</li>
                          <li>
                            나타난 <strong>웹 앱 URL</strong>(<code>https://script.google.com/macros/s/…/exec</code>)을 복사해 위 칸에 붙여 넣고 <strong>[구글 드라이브로 지금 백업 전송]</strong> → 드라이브의 <strong>'Class in Backup'</strong> 폴더에 파일이 생기면 성공!
                          </li>
                        </ol>
                        <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-[10.5px] text-slate-600 space-y-1">
                          <p>🔁 <strong>코드를 고친 뒤에는</strong> [배포] → [배포 관리] → ✏️ 수정 → 버전: <strong>새 버전</strong> → [배포]를 해야 반영돼요. (주소는 그대로)</p>
                          <p>♻️ <strong>복원:</strong> 'Class in Backup' 폴더에서 원하는 .json 파일을 내려받아 위 <strong>[백업 파일 불러오기]</strong>로 열어요. 백업 암호를 썼다면 같은 암호가 필요해요.</p>
                          <p>🧹 최근 30개 백업만 남기고 오래된 백업은 드라이브 휴지통으로 옮겨요. (코드 맨 위 KEEP_COUNT 로 바꿀 수 있어요)</p>
                          <p>🔐 (선택) 다른 사람이 주소를 알아도 못 쓰게 하려면: 편집기 왼쪽 ⚙️[프로젝트 설정] → [스크립트 속성 추가] → 이름 <code>WEBHOOK_TOKEN</code>, 값 아무 암호 → 위 칸 주소 끝에 <code>?token=그 암호</code>를 붙여요.</p>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-200">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-800 dark:text-slate-200">📋 구글 드라이브 백업 Apps Script 복사용 전체 코드:</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(GOOGLE_DRIVE_BACKUP_SCRIPT_CODE);
                                onShowToast('📋 구글 드라이브 백업 Apps Script 코드가 클립보드에 복사되었습니다!');
                              }}
                              className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                            >
                              <Copy className="w-3 h-3" />
                              <span>코드 복사</span>
                            </button>
                          </div>
                          <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[10.5px] leading-relaxed overflow-x-auto select-all border border-slate-800">
                            <code>{GOOGLE_DRIVE_BACKUP_SCRIPT_CODE}</code>
                          </pre>
                        </div>
                      </div>
                    </details>
                  </div>

                  {/* Google Apps Script 웹앱 Webhook URL 연동 & 상세 가이드 */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-800 block text-[11px] flex items-center gap-1.5">
                        <span>📊 학생 관찰 및 상담일지 구글 시트 자동 백업 연동 URL:</span>
                      </label>
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                        상담날짜 · 번호 · 이름 · 유형 · 상담내용 5개 열 자동 생성
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <SecretInput
                        type="url"
                        placeholder="https://script.google.com/macros/s/AKfycbx.../exec (상담일지 전용)"
                        value={tempConfig.googleSheetUrl ?? ''}
                        onChange={(e) => setTempConfig({ ...tempConfig, googleSheetUrl: e.target.value })}
                        className="flex-1 px-3 py-1.5 rounded-xl border border-emerald-300 bg-white font-mono text-xs focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        disabled={isTestingGoogleSync}
                        onClick={() => {
                          if (!tempConfig.googleSheetUrl || !tempConfig.googleSheetUrl.trim().startsWith('http')) {
                            onShowToast('⚠️ 상담일지 구글 웹 앱 URL을 먼저 입력해 주세요.');
                            return;
                          }
                          setIsTestingGoogleSync(true);
                          setGoogleSyncTestSuccess(null);

                          // 실제 테스트 데이터 전송 시도 (5개 열 규격: 상담날짜, 번호, 이름, 유형, 상담내용)
                          fetch(tempConfig.googleSheetUrl.trim(), {
                            method: 'POST',
                            mode: 'no-cors',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'test',
                              date: new Date().toISOString().slice(0, 10),
                              studentNumber: 1,
                              studentName: '홍길동(테스트)',
                              type: '관찰',
                              content: '스마트 학급 대시보드 상담일지 구글 시트 자동 연동 테스트 성공!',
                              timestamp: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
                            }),
                          })
                            .then(() => {
                              setIsTestingGoogleSync(false);
                              setGoogleSyncTestSuccess(true);
                              onShowToast('🟢 상담일지 구글 시트 테스트 데이터가 성공적으로 발송되었습니다! 시트를 확인해 보세요.');
                            })
                            .catch((err) => {
                              setIsTestingGoogleSync(false);
                              onShowToast('🟡 테스트 요청을 보냈습니다. (CORS 모드 특성상 시트에서 1행 추가 여부를 확인하세요)');
                            });
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition flex items-center gap-1 shrink-0"
                      >
                        {isTestingGoogleSync ? <span>전송 중...</span> : <span>연동 테스트</span>}
                      </button>
                    </div>

                    {/* 구글 시트 연동 안내 및 스크립트 복사 박스 */}
                    <details className="mt-2 p-3 bg-slate-50 border border-emerald-200/80 rounded-2xl text-xs space-y-2 group">
                      <summary className="font-bold text-emerald-800 cursor-pointer flex items-center justify-between select-none">
                        <span className="flex items-center gap-1.5">
                          <span>💡 [학생 관찰 및 상담일지 구글 시트 연동 &amp; 자동 백업 스크립트 안내]</span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded font-normal">클릭하여 펼치기</span>
                        </span>
                        <span className="text-slate-400 group-open:rotate-180 transition">▼</span>
                      </summary>

                      <div className="pt-2 text-slate-700 space-y-3 leading-relaxed text-[11px] border-t border-slate-200/60 mt-1">
                        {/* ⚠️ 구글 Apps Script 계정 연동 보안 경고 안내 카드 */}
                        <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 space-y-2 shadow-2xs">
                          <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                            <span className="text-base">⚠️</span>
                            <span>[필독] 웹 앱 배포 시 'Google에서 확인하지 않은 앱' 경고창 대처 방법:</span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-amber-900/90">
                            선생님의 개인 구글 계정에서 직접 생성한 안전한 스크립트이므로 구글의 사전 심사를 거치지 않아 최초 권한 승인 시 보안 경고 화면이 나타납니다. <strong>아래 3단계로 5초 만에 승인</strong>하실 수 있습니다!
                          </p>
                          <div className="bg-white/90 p-2.5 rounded-lg border border-amber-200/80 space-y-1.5 text-[11px]">
                            <div className="flex items-start gap-2">
                              <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 mt-0.5">1단계</span>
                              <span>경고창 좌측 하단의 조그만 파란색 글씨 <strong>[고급 (Advanced)]</strong>을 클릭합니다.</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 mt-0.5">2단계</span>
                              <span>아래에 펼쳐지는 <strong>'Class in 백업(으)로 이동(안전하지 않음)'</strong> 링크를 클릭합니다. (프로젝트 제목을 안 바꿨다면 '제목 없는 프로젝트')</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 mt-0.5">3단계</span>
                              <span>Google 계정 액세스 권한 요청 화면에서 우측 하단의 파란색 <strong>[허용 (Allow)]</strong> 버튼을 클릭합니다.</span>
                            </div>
                          </div>
                          <p className="text-[10.5px] text-amber-800 font-medium">
                            👉 승인이 완료되면 발급되는 <strong>웹 앱 URL(https://script.google.com/macros/s/.../exec)</strong>을 복사하여 위 입력창에 넣고 [연동 테스트]를 누르면 끝납니다!
                          </p>
                        </div>

                        <p className="font-bold text-slate-900">
                          📌 5단계 학생 관찰 및 상담일지 구글 스프레드시트 연동 절차:
                        </p>
                        <ol className="list-decimal list-inside space-y-1.5 text-slate-600 pl-1">
                          <li>구글 드라이브에서 <strong>새 스프레드시트</strong>를 만듭니다. (예: 2026학년도 우리반 학생상담일지)</li>
                          <li>상단 메뉴에서 <strong>[확장 프로그램] ➔ [Apps Script]</strong>를 클릭합니다.</li>
                          <li>기존 코드를 모두 지우고 아래 <strong>[상담일지 Apps Script 전체 코드]</strong>를 그대로 복사하여 붙여넣습니다.</li>
                          <li>우측 상단 <strong>[배포] ➔ [새 배포]</strong> 클릭 ➔ 유형 옆 톱니바퀴에서 <strong>웹 앱(Web App)</strong> 선택:
                            <ul className="list-disc list-inside pl-4 text-emerald-700 font-bold mt-0.5 space-y-0.5">
                              <li>다음 사용자 권한으로 실행: <span className="underline">나(선생님 구글 계정)</span></li>
                              <li>액세스 권한이 있는 사용자: <span className="underline text-rose-600">모든 사용자(Anyone)</span> 선택 (필수!)</li>
                              <li className="text-amber-800 font-normal">※ '액세스 승인' 시 경고창이 뜨면 위의 [필독 안내]대로 <strong>[고급] ➔ [이동(안전하지 않음)] ➔ [허용]</strong>을 차례로 클릭하세요.</li>
                            </ul>
                          </li>
                          <li>발급된 <strong>웹 앱 URL</strong>을 복사하여 위 입력창에 붙여넣고 [연동 테스트]를 누르면 끝!</li>
                        </ol>

                        <div className="mt-2 p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-100 text-[10.5px] text-emerald-900 space-y-1">
                          <strong>✨ 학생 관찰 및 상담일지 5개 열 자동 정리 시스템:</strong><br />
                          1. <strong>열 규격</strong>: <code>상담날짜, 번호, 이름, 유형, 상담내용</code> (5개 열 자동 생성 및 헤더 스타일 적용)<br />
                          2. <strong>실시간 자동 동기화</strong>: 상담위젯에서 관찰이나 상담을 등록하면 구글 시트에 즉시 1행씩 추가됩니다.<br />
                          3. <strong>전체 기록 일괄 백업</strong>: 상담위젯 상단의 <strong>[시트 백업]</strong> 버튼을 누르면 누적된 모든 상담 기록이 구글 시트로 한 번에 안전하게 백업됩니다.
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-200">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-800 dark:text-slate-200">📋 상담일지 Apps Script 복사용 전체 코드 (5개 열 규격):</span>
                            <button
                              type="button"
                              onClick={() => {
                                const code = `/**
 * 스마트 학급 대시보드 - 학생 관찰 및 상담일지 Google Apps Script 웹앱 연동 스크립트
 * [규격 5개 열] : [상담날짜, 번호, 이름, 유형, 상담내용]
 * (doGet / doPost / JSON / 단건 및 일괄 백업 완벽 지원)
 */

// 1. GET 요청 핸들러 (브라우저 주소창 또는 헬스체크 정상 응답)
function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({
      status: "success",
      message: "🟢 학생 관찰 및 상담일지 구글 시트 웹앱이 정상 작동 중입니다.",
      format: ["상담날짜", "번호", "이름", "유형", "상담내용"]
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

// 2. POST 요청 핸들러 (대시보드에서 상담/관찰일지 전송 시 자동 기록)
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // 1행 헤더 확인 및 5개 열 자동 생성 (에메랄드 스타일 적용)
    var headers = [["상담날짜", "번호", "이름", "유형", "상담내용"]];
    if (sheet.getLastRow() === 0 || sheet.getRange(1, 1).getValue() !== "상담날짜") {
      if (sheet.getLastRow() > 0) {
        sheet.insertRowBefore(1);
      }
      sheet.getRange(1, 1, 1, 5).setValues(headers);
      var headerRange = sheet.getRange(1, 1, 1, 5);
      headerRange.setBackground("#059669"); // 에메랄드 테마
      headerRange.setFontColor("#FFFFFF");
      headerRange.setFontWeight("bold");
      sheet.setFrozenRows(1);
    }

    // JSON 데이터 안전 파싱 (postData 또는 parameter 지원)
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    var todayStr = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd");

    // 다건(배열) 일괄 백업 또는 단건 백업 지원
    var rowsToInsert = [];
    var items = [];

    if (Array.isArray(data)) {
      items = data;
    } else if (data.records && Array.isArray(data.records)) {
      items = data.records;
    } else {
      items = [data];
    }

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (!item) continue;

      var rowDate = item.date || item.consultDate || todayStr;
      var rowNumber = item.studentNumber !== undefined ? item.studentNumber : (item.number !== undefined ? item.number : (item.studentId || ""));
      var rowName = item.studentName || item.name || "학생";
      var rowType = item.type || item.consultType || "관찰";
      var rowContent = item.content || item.memo || "";

      // 빈 데이터 제외
      if (!rowContent && item.action === "test") {
        rowContent = "스마트 학급 대시보드 상담일지 구글 시트 연동 테스트 성공!";
      }

      rowsToInsert.push([rowDate, rowNumber, rowName, rowType, rowContent]);
    }

    if (rowsToInsert.length > 0) {
      var startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, rowsToInsert.length, 5).setValues(rowsToInsert);

      // 열 너비 자동 맞춤
      for (var col = 1; col <= 5; col++) {
        sheet.autoResizeColumn(col);
      }
    }

    return ContentService.createTextOutput(
      JSON.stringify({
        status: "success",
        message: "상담 데이터 " + rowsToInsert.length + "건이 성공적으로 저장되었습니다."
      })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({
        status: "error",
        message: err.toString()
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}`;
                                navigator.clipboard.writeText(code).then(() => {
                                  onShowToast('📋 상담일지 Apps Script 코드가 클립보드에 복사되었습니다. Apps Script 창에 붙여넣으세요!');
                                });
                              }}
                              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10px] cursor-pointer shadow-xs transition"
                            >
                              코드 복사하기
                            </button>
                          </div>
                          <pre className="p-2 bg-slate-900 text-emerald-300 rounded-xl font-mono text-[10px] overflow-x-auto max-h-48 custom-scrollbar">
{`/**
 * 스마트 학급 대시보드 - 학생 관찰 및 상담일지 Google Apps Script 웹앱 연동 스크립트
 * [규격 5개 열] : [상담날짜, 번호, 이름, 유형, 상담내용]
 * (doGet / doPost / JSON / 단건 및 일괄 백업 완벽 지원)
 */

// 1. GET 요청 핸들러 (브라우저 주소창 또는 헬스체크 정상 응답)
function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({
      status: "success",
      message: "🟢 학생 관찰 및 상담일지 구글 시트 웹앱이 정상 작동 중입니다.",
      format: ["상담날짜", "번호", "이름", "유형", "상담내용"]
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

// 2. POST 요청 핸들러 (대시보드에서 상담/관찰일지 전송 시 자동 기록)
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // 1행 헤더 확인 및 5개 열 자동 생성 (에메랄드 스타일 적용)
    var headers = [["상담날짜", "번호", "이름", "유형", "상담내용"]];
    if (sheet.getLastRow() === 0 || sheet.getRange(1, 1).getValue() !== "상담날짜") {
      if (sheet.getLastRow() > 0) {
        sheet.insertRowBefore(1);
      }
      sheet.getRange(1, 1, 1, 5).setValues(headers);
      var headerRange = sheet.getRange(1, 1, 1, 5);
      headerRange.setBackground("#059669"); // 에메랄드 테마
      headerRange.setFontColor("#FFFFFF");
      headerRange.setFontWeight("bold");
      sheet.setFrozenRows(1);
    }

    // JSON 데이터 안전 파싱 (postData 또는 parameter 지원)
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    var todayStr = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd");

    // 다건(배열) 일괄 백업 또는 단건 백업 지원
    var rowsToInsert = [];
    var items = [];

    if (Array.isArray(data)) {
      items = data;
    } else if (data.records && Array.isArray(data.records)) {
      items = data.records;
    } else {
      items = [data];
    }

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (!item) continue;

      var rowDate = item.date || item.consultDate || todayStr;
      var rowNumber = item.studentNumber !== undefined ? item.studentNumber : (item.number !== undefined ? item.number : (item.studentId || ""));
      var rowName = item.studentName || item.name || "학생";
      var rowType = item.type || item.consultType || "관찰";
      var rowContent = item.content || item.memo || "";

      // 빈 데이터 제외
      if (!rowContent && item.action === "test") {
        rowContent = "스마트 학급 대시보드 상담일지 구글 시트 연동 테스트 성공!";
      }

      rowsToInsert.push([rowDate, rowNumber, rowName, rowType, rowContent]);
    }

    if (rowsToInsert.length > 0) {
      var startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, rowsToInsert.length, 5).setValues(rowsToInsert);

      // 열 너비 자동 맞춤
      for (var col = 1; col <= 5; col++) {
        sheet.autoResizeColumn(col);
      }
    }

    return ContentService.createTextOutput(
      JSON.stringify({
        status: "success",
        message: "상담 데이터 " + rowsToInsert.length + "건이 성공적으로 저장되었습니다."
      })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({
        status: "error",
        message: err.toString()
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}`}
                          </pre>
                        </div>
                      </div>
                    </details>
                  </div>

                  {/* 📊 출결 관리 구글 시트 자동 백업 연동 URL & 일일 백업 & 월말 통계 자동 생성 가이드 (담임 전용) */}
                  <div className={`space-y-2 pt-3 border-t border-slate-200 transition-all ${
                    tempConfig.teacherMode === 'subject'
                      ? 'opacity-50 pointer-events-none select-none bg-slate-50/80 p-3 rounded-2xl border border-dashed border-slate-300'
                      : ''
                  }`}>
                    <div className="flex items-center justify-between flex-wrap gap-1.5">
                      <label className="font-bold text-slate-800 block text-[11px] flex items-center gap-1.5">
                        <span>📊 출결 관리 구글 시트 자동 백업 연동 URL:</span>
                        {tempConfig.teacherMode === 'subject' && (
                          <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-black border border-rose-300">
                            🚫 전담모드 비활성화 (담임교사 전용)
                          </span>
                        )}
                      </label>
                      <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">
                        매일 {tempConfig.attendanceAutoBackupTime || '16:00'} 자동 백업 &amp; 매월 말일 통계 시트 자동 생성
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <SecretInput
                        type="url"
                        disabled={tempConfig.teacherMode === 'subject'}
                        placeholder={
                          tempConfig.teacherMode === 'subject'
                            ? '교과 전담모드에서는 출결 관리 구글 시트 백업이 지원되지 않습니다 (담임 전용).'
                            : 'https://script.google.com/macros/s/AKfycb.../exec (출결 전용)'
                        }
                        value={tempConfig.teacherMode === 'subject' ? '' : (tempConfig.attendanceGoogleSheetUrl ?? '')}
                        onChange={(e) => setTempConfig({ ...tempConfig, attendanceGoogleSheetUrl: e.target.value })}
                        className="flex-1 px-3 py-1.5 rounded-xl border border-blue-300 bg-white font-mono text-xs focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                      />
                      <button
                        type="button"
                        disabled={isTestingAttendanceSync || tempConfig.teacherMode === 'subject'}
                        onClick={() => {
                          if (!tempConfig.attendanceGoogleSheetUrl || !tempConfig.attendanceGoogleSheetUrl.trim().startsWith('http')) {
                            onShowToast('⚠️ 출결 전용 구글 웹 앱 URL을 먼저 입력해 주세요.');
                            return;
                          }
                          setIsTestingAttendanceSync(true);

                          // 실제 출결 테스트 데이터 전송 시도
                          fetch(tempConfig.attendanceGoogleSheetUrl.trim(), {
                            method: 'POST',
                            mode: 'no-cors',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'test',
                              date: new Date().toISOString().slice(0, 10),
                              records: [
                                {
                                  studentNumber: 1,
                                  studentName: '홍길동(테스트)',
                                  attendance: 'present',
                                  reasonCategory: '',
                                  reasonNote: '출결 연동 테스트 성공',
                                },
                              ],
                              isMonthEnd: false,
                              timestamp: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
                            }),
                          })
                            .then(() => {
                              setIsTestingAttendanceSync(false);
                              onShowToast('🟢 출결 구글 시트 테스트 데이터가 성공적으로 발송되었습니다! [월별 출결 기록] 시트를 확인해 보세요.');
                            })
                            .catch(() => {
                              setIsTestingAttendanceSync(false);
                              onShowToast('🟡 테스트 요청을 보냈습니다. (CORS 특성상 구글 시트에서 최신 반영 여부를 확인하세요)');
                            });
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition flex items-center gap-1 shrink-0"
                      >
                        {isTestingAttendanceSync ? <span>전송 중...</span> : <span>연동 테스트</span>}
                      </button>
                    </div>

                    {/* ⏰ 일일 자동 백업 시간 설정 */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-900 flex items-center gap-1.5">
                          <span>⏰ 일일 자동 백업 시간 설정:</span>
                        </span>
                        <input
                          type="time"
                          value={tempConfig.attendanceAutoBackupTime || '16:00'}
                          onChange={(e) => setTempConfig({ ...tempConfig, attendanceAutoBackupTime: e.target.value })}
                          className="px-2.5 py-1 bg-white border border-blue-300 rounded-lg font-mono text-xs font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                        />
                      </div>
                      <span className="text-[11px] text-slate-500">
                        매일 지정한 시간에 대시보드가 열려 있으면 출결 데이터가 구글 시트에 자동으로 백업됩니다.
                      </span>
                    </div>

                    {/* 출결 구글 시트 연동 안내 및 스크립트 복사 박스 */}
                    <details className="mt-2 p-3 bg-slate-50 border border-blue-200/80 rounded-2xl text-xs space-y-2 group">
                      <summary className="font-bold text-blue-800 cursor-pointer flex items-center justify-between select-none">
                        <span className="flex items-center gap-1.5">
                          <span>💡 [출결 관리 구글 시트 연동 &amp; 자동 백업 &amp; 월말 통계 자동화 스크립트 안내]</span>
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-normal">클릭하여 펼치기</span>
                        </span>
                        <span className="text-slate-400 group-open:rotate-180 transition">▼</span>
                      </summary>

                      <div className="pt-2 text-slate-700 space-y-3 leading-relaxed text-[11px] border-t border-slate-200/60 mt-1">
                        {/* ⚠️ 구글 Apps Script 계정 연동 보안 경고 안내 카드 (요구사항 4) */}
                        <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 space-y-2 shadow-2xs">
                          <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                            <span className="text-base">⚠️</span>
                            <span>[필독] 웹 앱 배포 시 'Google에서 확인하지 않은 앱' 경고창 대처 방법:</span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-amber-900/90">
                            선생님의 개인 구글 계정에서 직접 생성한 안전한 스크립트이므로 구글의 사전 심사를 거치지 않아 최초 권한 승인 시 보안 경고 화면이 나타납니다. <strong>아래 3단계로 5초 만에 승인</strong>하실 수 있습니다!
                          </p>
                          <div className="bg-white/90 p-2.5 rounded-lg border border-amber-200/80 space-y-1.5 text-[11px]">
                            <div className="flex items-start gap-2">
                              <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 mt-0.5">1단계</span>
                              <span>경고창 좌측 하단의 조그만 파란색 글씨 <strong>[고급 (Advanced)]</strong>을 클릭합니다.</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 mt-0.5">2단계</span>
                              <span>아래에 펼쳐지는 <strong>'Class in 백업(으)로 이동(안전하지 않음)'</strong> 링크를 클릭합니다. (프로젝트 제목을 안 바꿨다면 '제목 없는 프로젝트')</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 mt-0.5">3단계</span>
                              <span>Google 계정 액세스 권한 요청 화면에서 우측 하단의 파란색 <strong>[허용 (Allow)]</strong> 버튼을 클릭합니다.</span>
                            </div>
                          </div>
                          <p className="text-[10.5px] text-amber-800 font-medium">
                            👉 승인이 완료되면 발급되는 <strong>웹 앱 URL(https://script.google.com/macros/s/.../exec)</strong>을 복사하여 위 입력창에 넣고 [연동 테스트]를 누르면 끝납니다!
                          </p>
                        </div>

                        <p className="font-bold text-slate-900">
                          📌 5단계 출결 관리 구글 스프레드시트 연동 절차:
                        </p>
                        <ol className="list-decimal list-inside space-y-1.5 text-slate-600 pl-1">
                          <li>구글 드라이브에서 <strong>새 스프레드시트</strong>를 만듭니다. (예: 2026학년도 우리반 출결 관리)</li>
                          <li>상단 메뉴에서 <strong>[확장 프로그램] ➔ [Apps Script]</strong>를 클릭합니다.</li>
                          <li>기존 코드를 모두 지우고 아래 <strong>[출결 관리 Apps Script 전체 코드]</strong>를 그대로 복사하여 붙여넣습니다.</li>
                          <li>우측 상단 <strong>[배포] ➔ [새 배포]</strong> 클릭 ➔ 유형 옆 톱니바퀴에서 <strong>웹 앱(Web App)</strong> 선택:
                            <ul className="list-disc list-inside pl-4 text-blue-700 font-bold mt-0.5 space-y-0.5">
                              <li>다음 사용자 권한으로 실행: <span className="underline">나(선생님 구글 계정)</span></li>
                              <li>액세스 권한이 있는 사용자: <span className="underline text-rose-600">모든 사용자(Anyone)</span> 선택 (필수!)</li>
                              <li className="text-amber-800 font-normal">※ '액세스 승인' 시 경고창이 뜨면 위의 [필독 안내]대로 <strong>[고급] ➔ [이동(안전하지 않음)] ➔ [허용]</strong>을 차례로 클릭하세요.</li>
                            </ul>
                          </li>
                          <li>발급된 <strong>웹 앱 URL</strong>을 복사하여 위 입력창에 붙여넣고 [연동 테스트]를 누르면 끝!</li>
                        </ol>

                        <div className="mt-2 p-2.5 bg-indigo-50/80 rounded-xl border border-indigo-100 text-[10.5px] text-indigo-900 space-y-1">
                          <strong>✨ 업그레이드된 스마트 출결 백업 시스템 (결석·조퇴·출석인정 선별 백업):</strong><br />
                          1. <strong>[시트 1] 일일 출결 현황</strong>: <code>날짜, 번호, 학생명, 출결상태, 사유구분, 세부내용, 최종동기화일시</code> (7개 열). 당일 <strong>결석, 조퇴, 출석인정</strong> 대상 학생만 선별하여 세부내용(조퇴 시점, 결석 기간, 세부 메모 등)과 함께 중복 없이 자동 갱신됩니다.<br />
                          2. <strong>[시트 2] 월별 출결현황</strong>: <code>월, 날짜, 번호, 학생명, 출결유형, 출결사유, 기록일시</code> (7개 열). 결석·조퇴·출석인정 등 특이 출결 학생이 월별로 누적 저장되어 월말 나이스(NEIS) 출결 마감 및 교무일지 작성이 매우 간편합니다.<br />
                          3. <strong>심층 사유·세부내용 보존</strong>: 사용자가 필수 입력한 세부 사유 메모뿐만 아니라 조퇴 시점(예: [4교시 후]), 장기 결석 기간(예: [장기: 2026-10-07 ~ 2026-10-09])까지 <strong>세부내용</strong> 열에 완벽하게 보존됩니다.
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-200">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-800 dark:text-slate-200">📋 출결 관리 Apps Script 복사용 전체 코드:</span>
                            <button
                              type="button"
                              onClick={() => {
                                const code = `/**
 * 스마트 학급 대시보드 - 출결 선별 백업 스크립트 (결석·조퇴·출석인정 전용)
 * [시트 1] '일일 출결 현황' : [날짜, 번호, 학생명, 출결상태, 사유구분, 세부내용, 최종동기화일시]
 * [시트 2] '월별 출결현황' : [월, 날짜, 번호, 학생명, 출결유형, 출결사유, 기록일시]
 */

function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({ status: "success", message: "출결 백업 웹앱이 정상 작동 중입니다." })
  ).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. 요청 데이터 파싱
    var rawData = {};
    if (e && e.postData && e.postData.contents) {
      try {
        rawData = JSON.parse(e.postData.contents);
      } catch (err) {
        rawData = e.parameter || {};
      }
    } else if (e && e.parameter) {
      rawData = e.parameter;
    }

    var items = [];
    if (Array.isArray(rawData)) {
      items = rawData;
    } else if (rawData.records && Array.isArray(rawData.records)) {
      items = rawData.records;
    } else {
      items = [rawData];
    }

    if (items.length === 0 || !items[0]) {
      return ContentService.createTextOutput(
        JSON.stringify({ status: "empty", message: "전송된 데이터가 없습니다." })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    var nowKST = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
    var todayStr = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd");
    var targetDate = items[0].date ? formatDate(items[0].date) : todayStr;
    var targetMonth = targetDate.substring(0, 7);

    // ==========================================
    // [시트 1] '일일 출결 현황'
    // ==========================================
    var dailySheet = ss.getSheetByName("일일 출결 현황");
    if (!dailySheet) {
      dailySheet = ss.getSheets()[0];
      dailySheet.setName("일일 출결 현황");
    }

    // 7개 열 헤더 설정 ('상세내용' -> '세부내용'으로 갱신)
    var dailyHeaders = [["날짜", "번호", "학생명", "출결상태", "사유구분", "세부내용", "최종동기화일시"]];
    if (dailySheet.getLastRow() === 0 || dailySheet.getRange(1, 1).getValue() !== "날짜" || dailySheet.getRange(1, 6).getValue() !== "세부내용") {
      if (dailySheet.getLastRow() > 0) {
        dailySheet.getRange(1, 1, 1, 7).setValues(dailyHeaders);
      } else {
        dailySheet.insertRowBefore(1);
        dailySheet.getRange(1, 1, 1, 7).setValues(dailyHeaders);
      }
      dailySheet.getRange(1, 1, 1, 7).setBackground("#4F46E5").setFontColor("#FFFFFF").setFontWeight("bold");
      dailySheet.setFrozenRows(1);
    }

    // 기존 당일 데이터 역순 삭제 (중복 방지)
    var lastRowDaily = dailySheet.getLastRow();
    if (lastRowDaily > 1) {
      var dateRange = dailySheet.getRange(2, 1, lastRowDaily - 1, 1).getValues();
      for (var r = dateRange.length - 1; r >= 0; r--) {
        if (formatDate(dateRange[r][0]) === targetDate) {
          dailySheet.deleteRow(r + 2);
        }
      }
    }

    var dailyRows = [];
    var exceptionRows = [];

    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var num = it.number !== undefined ? it.number : (i + 1);
      var name = it.studentName || it.name || "학생";
      var statusKorean = convertStatusToKorean(it.status || it.attendance);

      // 사유 구분 (질병, 출석인정, 미인정, 기타)
      var cat = it.reasonCategory || it.category || it.neisCategory || "";

      // 🎯 [핵심 필터링] 백업 대상 선별: '결석', '조퇴', '출석인정'만 저장 (일반 출석/지각/보건실 제외)
      var isAbsentOrEarly = (statusKorean === "결석" || statusKorean === "조퇴" || it.attendance === "absent" || it.attendance === "early");
      var isAcknowledged = (cat === "출석인정" || statusKorean === "출석인정" || it.reasonCategory === "출석인정" || (it.attendanceReasonCategory && it.attendanceReasonCategory === "출석인정"));

      if (!isAbsentOrEarly && !isAcknowledged) {
        continue; // 일반 출석 등 비대상 학생은 제외
      }

      // [핵심] 필수 입력된 세부 사유 메모 추출
      var detail = extractDetailMemo(it);

      // 장기 결석 체크 여부 표기 (체크되어 있고 detail에 아직 없으면 추가)
      var isLongTerm = it.isLongTerm || it.longTerm || (it.absenceReason && it.absenceReason.isLongTerm);
      if (isLongTerm && detail.indexOf("[장기") === -1) {
        var rangeText = "";
        if (it.longTermRange && typeof it.longTermRange === "object" && it.longTermRange.start) {
          rangeText = ": " + it.longTermRange.start + " ~ " + it.longTermRange.end;
        }
        detail = "[장기" + rangeText + "] " + (detail || "");
        detail = detail.trim();
      }

      // 조퇴 교시 표기 (detail에 아직 없으면 추가)
      if ((statusKorean === "조퇴" || it.attendance === "early") && it.earlyPeriod) {
        if (detail.indexOf(it.earlyPeriod) === -1) {
          detail = "[" + it.earlyPeriod + "] " + (detail || "");
          detail = detail.trim();
        }
      }

      dailyRows.push([
        targetDate,
        num,
        name,
        statusKorean,
        cat,
        detail,
        nowKST
      ]);

      // '월별 출결현황' (시트 2용)
      exceptionRows.push([
        targetMonth,
        targetDate,
        num,
        name,
        statusKorean,
        detail || cat || "사유 미기재",
        nowKST
      ]);
    }

    // 시트 1에 7개 열 데이터 쓰기
    if (dailyRows.length > 0) {
      dailySheet.getRange(dailySheet.getLastRow() + 1, 1, dailyRows.length, 7).setValues(dailyRows);
      for (var c = 1; c <= 7; c++) {
        dailySheet.autoResizeColumn(c);
      }
    }

    // 시트 1 필터 적용
    try {
      var curFilter = dailySheet.getFilter();
      if (curFilter) curFilter.remove();
      dailySheet.getRange(1, 1, dailySheet.getLastRow(), 7).createFilter();
    } catch (fErr) {}

    // ==========================================
    // [시트 2] '월별 출결현황'
    // ==========================================
    var monthlySheet = ss.getSheetByName("월별 출결현황");
    if (!monthlySheet) {
      monthlySheet = ss.insertSheet("월별 출결현황");
    }

    var monthlyHeaders = [["월", "날짜", "번호", "학생명", "출결유형", "출결사유", "기록일시"]];
    if (monthlySheet.getLastRow() === 0 || monthlySheet.getRange(1, 1).getValue() !== "월") {
      if (monthlySheet.getLastRow() > 0) monthlySheet.insertRowBefore(1);
      monthlySheet.getRange(1, 1, 1, 7).setValues(monthlyHeaders);
      monthlySheet.getRange(1, 1, 1, 7).setBackground("#0D9488").setFontColor("#FFFFFF").setFontWeight("bold");
      monthlySheet.setFrozenRows(1);
    }

    var lastRowMonthly = monthlySheet.getLastRow();
    if (lastRowMonthly > 1) {
      var monthlyDates = monthlySheet.getRange(2, 2, lastRowMonthly - 1, 1).getValues();
      for (var mr = monthlyDates.length - 1; mr >= 0; mr--) {
        if (formatDate(monthlyDates[mr][0]) === targetDate) {
          monthlySheet.deleteRow(mr + 2);
        }
      }
    }

    if (exceptionRows.length > 0) {
      monthlySheet.getRange(monthlySheet.getLastRow() + 1, 1, exceptionRows.length, 7).setValues(exceptionRows);
      for (var mc = 1; mc <= 7; mc++) {
        monthlySheet.autoResizeColumn(mc);
      }
    }

    try {
      var mFilter = monthlySheet.getFilter();
      if (mFilter) mFilter.remove();
      monthlySheet.getRange(1, 1, monthlySheet.getLastRow(), 7).createFilter();
    } catch (mfErr) {}

    return ContentService.createTextOutput(
      JSON.stringify({
        status: "success",
        message: targetDate + " 백업 완료 (결석·조퇴·출석인정 " + dailyRows.length + "명)"
      })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// -------------------------------------------------------------
// [핵심 함수] 어떤 키명이나 중첩 객체로 와도 상세 메모 텍스트를 찾아내는 함수
// -------------------------------------------------------------
function extractDetailMemo(item) {
  if (!item) return "";

  // 1. 최상위 프로퍼티 우선 검색
  var candidates = [
    item.reasonDetail,
    item.memo,
    item.detailMemo,
    item.detail,
    item.reasonNote,
    item.attendanceNote,
    item.attendanceReasonDetail,
    item.customMemo,
    item.customReason,
    item.subReason,
    item.note,
    item.quickReason,
    item.content
  ];

  for (var i = 0; i < candidates.length; i++) {
    if (candidates[i] && typeof candidates[i] === "string" && candidates[i].trim() !== "") {
      return candidates[i].trim();
    }
  }

  // 2. 만약 absenceReason, reason, record 등의 하위 객체에 감싸져 있는 경우
  var subObjects = [item.absenceReason, item.reasonData, item.details, item.attendanceDetail];
  for (var s = 0; s < subObjects.length; s++) {
    var sub = subObjects[s];
    if (sub && typeof sub === "object") {
      var subCandidates = [
        sub.reasonDetail,
        sub.memo,
        sub.detailMemo,
        sub.detail,
        sub.reasonNote,
        sub.customMemo,
        sub.content,
        sub.note,
        sub.text
      ];
      for (var k = 0; k < subCandidates.length; k++) {
        if (subCandidates[k] && typeof subCandidates[k] === "string" && subCandidates[k].trim() !== "") {
          return subCandidates[k].trim();
        }
      }
    }
  }

  return "";
}

function convertStatusToKorean(val) {
  if (!val) return "출석";
  var s = String(val).trim().toLowerCase();
  if (s === "present" || s === "출석") return "출석";
  if (s === "absent" || s === "결석") return "결석";
  if (s === "late" || s === "지각") return "지각";
  if (s === "early" || s === "조퇴") return "조퇴";
  if (s === "nurse" || s === "clinic" || s === "health" || s === "보건" || s === "보건실") return "보건실";
  return val;
}

function formatDate(val) {
  if (!val) return "";
  if (val instanceof Date) return Utilities.formatDate(val, "Asia/Seoul", "yyyy-MM-dd");
  var s = String(val).trim();
  if (s.indexOf("T") > -1) s = s.split("T")[0];
  return s.length >= 10 ? s.substring(0, 10) : s;
}

function onEdit(e) {
  try {
    var sheet = e.source.getActiveSheet();
    var column = e.range.getColumn();
    sheet.autoResizeColumn(column);
  } catch (err) {}
}`;
                                navigator.clipboard.writeText(code).then(() => {
                                  onShowToast('📋 출결 관리 Apps Script 코드가 클립보드에 복사되었습니다. Apps Script 창에 붙여넣으세요!');
                                });
                              }}
                              className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-[10px] cursor-pointer shadow-xs transition"
                            >
                              코드 복사하기
                            </button>
                          </div>
                          <pre className="p-2 bg-slate-900 text-blue-300 rounded-xl font-mono text-[10px] overflow-x-auto max-h-48 custom-scrollbar">
{`/**
 * 스마트 학급 대시보드 - 출결 선별 백업 스크립트 (결석·조퇴·출석인정 전용)
 * [시트 1] '일일 출결 현황' : [날짜, 번호, 학생명, 출결상태, 사유구분, 세부내용, 최종동기화일시]
 * [시트 2] '월별 출결현황' : [월, 날짜, 번호, 학생명, 출결유형, 출결사유, 기록일시]
 */

function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({ status: "success", message: "출결 백업 웹앱이 정상 작동 중입니다." })
  ).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. 요청 데이터 파싱
    var rawData = {};
    if (e && e.postData && e.postData.contents) {
      try {
        rawData = JSON.parse(e.postData.contents);
      } catch (err) {
        rawData = e.parameter || {};
      }
    } else if (e && e.parameter) {
      rawData = e.parameter;
    }

    var items = [];
    if (Array.isArray(rawData)) {
      items = rawData;
    } else if (rawData.records && Array.isArray(rawData.records)) {
      items = rawData.records;
    } else {
      items = [rawData];
    }

    if (items.length === 0 || !items[0]) {
      return ContentService.createTextOutput(
        JSON.stringify({ status: "empty", message: "전송된 데이터가 없습니다." })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    var nowKST = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
    var todayStr = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd");
    var targetDate = items[0].date ? formatDate(items[0].date) : todayStr;
    var targetMonth = targetDate.substring(0, 7);

    // ==========================================
    // [시트 1] '일일 출결 현황'
    // ==========================================
    var dailySheet = ss.getSheetByName("일일 출결 현황");
    if (!dailySheet) {
      dailySheet = ss.getSheets()[0];
      dailySheet.setName("일일 출결 현황");
    }

    // 7개 열 헤더 설정 ('상세내용' -> '세부내용'으로 갱신)
    var dailyHeaders = [["날짜", "번호", "학생명", "출결상태", "사유구분", "세부내용", "최종동기화일시"]];
    if (dailySheet.getLastRow() === 0 || dailySheet.getRange(1, 1).getValue() !== "날짜" || dailySheet.getRange(1, 6).getValue() !== "세부내용") {
      if (dailySheet.getLastRow() > 0) {
        dailySheet.getRange(1, 1, 1, 7).setValues(dailyHeaders);
      } else {
        dailySheet.insertRowBefore(1);
        dailySheet.getRange(1, 1, 1, 7).setValues(dailyHeaders);
      }
      dailySheet.getRange(1, 1, 1, 7).setBackground("#4F46E5").setFontColor("#FFFFFF").setFontWeight("bold");
      dailySheet.setFrozenRows(1);
    }

    // 기존 당일 데이터 역순 삭제 (중복 방지)
    var lastRowDaily = dailySheet.getLastRow();
    if (lastRowDaily > 1) {
      var dateRange = dailySheet.getRange(2, 1, lastRowDaily - 1, 1).getValues();
      for (var r = dateRange.length - 1; r >= 0; r--) {
        if (formatDate(dateRange[r][0]) === targetDate) {
          dailySheet.deleteRow(r + 2);
        }
      }
    }

    var dailyRows = [];
    var exceptionRows = [];

    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var num = it.number !== undefined ? it.number : (i + 1);
      var name = it.studentName || it.name || "학생";
      var statusKorean = convertStatusToKorean(it.status || it.attendance);

      // 사유 구분 (질병, 출석인정, 미인정, 기타)
      var cat = it.reasonCategory || it.category || it.neisCategory || "";

      // 🎯 [핵심 필터링] 백업 대상 선별: '결석', '조퇴', '출석인정'만 저장 (일반 출석/지각/보건실 제외)
      var isAbsentOrEarly = (statusKorean === "결석" || statusKorean === "조퇴" || it.attendance === "absent" || it.attendance === "early");
      var isAcknowledged = (cat === "출석인정" || statusKorean === "출석인정" || it.reasonCategory === "출석인정" || (it.attendanceReasonCategory && it.attendanceReasonCategory === "출석인정"));

      if (!isAbsentOrEarly && !isAcknowledged) {
        continue; // 일반 출석 등 비대상 학생은 제외
      }

      // [핵심] 필수 입력된 세부 사유 메모 추출
      var detail = extractDetailMemo(it);

      // 장기 결석 체크 여부 표기 (체크되어 있고 detail에 아직 없으면 추가)
      var isLongTerm = it.isLongTerm || it.longTerm || (it.absenceReason && it.absenceReason.isLongTerm);
      if (isLongTerm && detail.indexOf("[장기") === -1) {
        var rangeText = "";
        if (it.longTermRange && typeof it.longTermRange === "object" && it.longTermRange.start) {
          rangeText = ": " + it.longTermRange.start + " ~ " + it.longTermRange.end;
        }
        detail = "[장기" + rangeText + "] " + (detail || "");
        detail = detail.trim();
      }

      // 조퇴 교시 표기 (detail에 아직 없으면 추가)
      if ((statusKorean === "조퇴" || it.attendance === "early") && it.earlyPeriod) {
        if (detail.indexOf(it.earlyPeriod) === -1) {
          detail = "[" + it.earlyPeriod + "] " + (detail || "");
          detail = detail.trim();
        }
      }

      dailyRows.push([
        targetDate,
        num,
        name,
        statusKorean,
        cat,
        detail,
        nowKST
      ]);

      // '월별 출결현황' (시트 2용)
      exceptionRows.push([
        targetMonth,
        targetDate,
        num,
        name,
        statusKorean,
        detail || cat || "사유 미기재",
        nowKST
      ]);
    }

    // 시트 1에 7개 열 데이터 쓰기
    if (dailyRows.length > 0) {
      dailySheet.getRange(dailySheet.getLastRow() + 1, 1, dailyRows.length, 7).setValues(dailyRows);
      for (var c = 1; c <= 7; c++) {
        dailySheet.autoResizeColumn(c);
      }
    }

    // 시트 1 필터 적용
    try {
      var curFilter = dailySheet.getFilter();
      if (curFilter) curFilter.remove();
      dailySheet.getRange(1, 1, dailySheet.getLastRow(), 7).createFilter();
    } catch (fErr) {}

    // ==========================================
    // [시트 2] '월별 출결현황'
    // ==========================================
    var monthlySheet = ss.getSheetByName("월별 출결현황");
    if (!monthlySheet) {
      monthlySheet = ss.insertSheet("월별 출결현황");
    }

    var monthlyHeaders = [["월", "날짜", "번호", "학생명", "출결유형", "출결사유", "기록일시"]];
    if (monthlySheet.getLastRow() === 0 || monthlySheet.getRange(1, 1).getValue() !== "월") {
      if (monthlySheet.getLastRow() > 0) monthlySheet.insertRowBefore(1);
      monthlySheet.getRange(1, 1, 1, 7).setValues(monthlyHeaders);
      monthlySheet.getRange(1, 1, 1, 7).setBackground("#0D9488").setFontColor("#FFFFFF").setFontWeight("bold");
      monthlySheet.setFrozenRows(1);
    }

    var lastRowMonthly = monthlySheet.getLastRow();
    if (lastRowMonthly > 1) {
      var monthlyDates = monthlySheet.getRange(2, 2, lastRowMonthly - 1, 1).getValues();
      for (var mr = monthlyDates.length - 1; mr >= 0; mr--) {
        if (formatDate(monthlyDates[mr][0]) === targetDate) {
          monthlySheet.deleteRow(mr + 2);
        }
      }
    }

    if (exceptionRows.length > 0) {
      monthlySheet.getRange(monthlySheet.getLastRow() + 1, 1, exceptionRows.length, 7).setValues(exceptionRows);
      for (var mc = 1; mc <= 7; mc++) {
        monthlySheet.autoResizeColumn(mc);
      }
    }

    try {
      var mFilter = monthlySheet.getFilter();
      if (mFilter) mFilter.remove();
      monthlySheet.getRange(1, 1, monthlySheet.getLastRow(), 7).createFilter();
    } catch (mfErr) {}

    return ContentService.createTextOutput(
      JSON.stringify({
        status: "success",
        message: targetDate + " 백업 완료 (결석·조퇴·출석인정 " + dailyRows.length + "명)"
      })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// -------------------------------------------------------------
// [핵심 함수] 어떤 키명이나 중첩 객체로 와도 상세 메모 텍스트를 찾아내는 함수
// -------------------------------------------------------------
function extractDetailMemo(item) {
  if (!item) return "";

  // 1. 최상위 프로퍼티 우선 검색
  var candidates = [
    item.reasonDetail,
    item.memo,
    item.detailMemo,
    item.detail,
    item.reasonNote,
    item.attendanceNote,
    item.attendanceReasonDetail,
    item.customMemo,
    item.customReason,
    item.subReason,
    item.note,
    item.quickReason,
    item.content
  ];

  for (var i = 0; i < candidates.length; i++) {
    if (candidates[i] && typeof candidates[i] === "string" && candidates[i].trim() !== "") {
      return candidates[i].trim();
    }
  }

  // 2. 만약 absenceReason, reason, record 등의 하위 객체에 감싸져 있는 경우
  var subObjects = [item.absenceReason, item.reasonData, item.details, item.attendanceDetail];
  for (var s = 0; s < subObjects.length; s++) {
    var sub = subObjects[s];
    if (sub && typeof sub === "object") {
      var subCandidates = [
        sub.reasonDetail,
        sub.memo,
        sub.detailMemo,
        sub.detail,
        sub.reasonNote,
        sub.customMemo,
        sub.content,
        sub.note,
        sub.text
      ];
      for (var k = 0; k < subCandidates.length; k++) {
        if (subCandidates[k] && typeof subCandidates[k] === "string" && subCandidates[k].trim() !== "") {
          return subCandidates[k].trim();
        }
      }
    }
  }

  return "";
}

function convertStatusToKorean(val) {
  if (!val) return "출석";
  var s = String(val).trim().toLowerCase();
  if (s === "present" || s === "출석") return "출석";
  if (s === "absent" || s === "결석") return "결석";
  if (s === "late" || s === "지각") return "지각";
  if (s === "early" || s === "조퇴") return "조퇴";
  if (s === "nurse" || s === "clinic" || s === "health" || s === "보건" || s === "보건실") return "보건실";
  return val;
}

function formatDate(val) {
  if (!val) return "";
  if (val instanceof Date) return Utilities.formatDate(val, "Asia/Seoul", "yyyy-MM-dd");
  var s = String(val).trim();
  if (s.indexOf("T") > -1) s = s.split("T")[0];
  return s.length >= 10 ? s.substring(0, 10) : s;
}

function onEdit(e) {
  try {
    var sheet = e.source.getActiveSheet();
    var column = e.range.getColumn();
    sheet.autoResizeColumn(column);
  } catch (err) {}
}`}
                          </pre>
                        </div>
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* STEP 6: ⌨️ 단축키 목록 */}
          {currentStep === 6 && (
            <div className="space-y-4" data-settings-shortcuts>
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Keyboard className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white text-sm">⌨️ 키보드 단축키 목록</h4>
                  <p className="text-[11.5px] text-slate-600 dark:text-slate-300">지금 쓰는 컴퓨터(윈도우/맥)에 맞는 키로 보여 줘요. 수업 중에는 <b>?</b> 키로 언제든 다시 볼 수 있어요.</p>
                </div>
              </div>
              <ShortcutList />
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-40 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>이전 단계</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleQuickFinish}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1 transition cursor-pointer border border-slate-300 shadow-xs"
              title="현재까지 입력된 상태로 즉시 저장하고 창 닫기"
            >
              <span>건너뛰기 (즉시 완료)</span>
            </button>
            <button
              type="button"
              onClick={handleSaveAndNext}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-indigo-200 cursor-pointer"
            >
              <span>{currentStep === 6 ? '설정 완료 및 대시보드 적용' : '저장 후 다음 단계'}</span>
              {currentStep === 6 ? <Check className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
