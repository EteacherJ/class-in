import { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  Printer,
  Sparkles,
  Shuffle,
  Calendar,
  Award,
  Save,
  Trash2,
  Download,
  Upload,
  CheckCircle2,
  Users,
  RotateCcw,
  Check,
  Maximize2,
} from 'lucide-react';
import { ClassRole, Student, RolePeriodInfo, DashboardTheme } from '../types';
import { playCelebrateSound } from '../utils/audio';
import { printElementById } from '../utils/printHelper';
import { RoleEditorPanel } from './RoleEditorPanel';
import {
  WEEK_DAYS,
  checkPoint,
  computeRoleRate,
  genderSlotOk,
  getSchedule,
  isCheckDay,
  isStrictRole,
  parseRoleLine,
  passLine,
  roleCountText,
  scheduleLabel,
  scoreRuleText,
  studentReflection,
} from '../utils/roleSchedule';

const LEGACY_DESC = '[매일] 학급을 위한 정성스러운 봉사';
const cleanDesc = (d?: string) => (!d || d.trim() === LEGACY_DESC ? '' : d);

interface ClassRolesModalProps {
  isOpen: boolean;
  onClose: () => void;
  roles: ClassRole[];
  onUpdateRoles: (newRoles: ClassRole[]) => void;
  students: Student[];
  onUpdateStudents: (newStudents: Student[]) => void;
  periodInfo: RolePeriodInfo;
  onUpdatePeriodInfo: (info: RolePeriodInfo) => void;
  onShowToast: (msg: string) => void;
  initialTab?: 'roles' | 'assign' | 'eval' | 'daily' | 'print' | 'settings';
  theme?: DashboardTheme;
}

const getThemePrintColors = (th: DashboardTheme) => {
  switch (th) {
    case 'indigo':
      return {
        border: 'border-indigo-300',
        thead: 'bg-indigo-100 text-indigo-950',
        rowAlt: 'bg-indigo-50/40',
        accent: 'bg-indigo-500',
        text: 'text-indigo-900',
        btn: 'bg-indigo-600 hover:bg-indigo-700',
        candyBg: 'bg-gradient-to-r from-indigo-500 via-sky-400 to-indigo-600',
        candyBorder: 'border-indigo-300',
        candyShadow: 'shadow-[0_4px_16px_rgba(99,102,241,0.3)]',
      };
    case 'emerald':
      return {
        border: 'border-emerald-300',
        thead: 'bg-emerald-100 text-emerald-950',
        rowAlt: 'bg-emerald-50/40',
        accent: 'bg-emerald-500',
        text: 'text-emerald-900',
        btn: 'bg-emerald-600 hover:bg-emerald-700',
        candyBg: 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600',
        candyBorder: 'border-emerald-300',
        candyShadow: 'shadow-[0_4px_16px_rgba(16,185,129,0.3)]',
      };
    case 'lavender':
      return {
        border: 'border-purple-300',
        thead: 'bg-purple-100 text-purple-950',
        rowAlt: 'bg-purple-50/40',
        accent: 'bg-purple-500',
        text: 'text-purple-900',
        btn: 'bg-purple-600 hover:bg-purple-700',
        candyBg: 'bg-gradient-to-r from-purple-500 via-pink-400 to-violet-600',
        candyBorder: 'border-purple-300',
        candyShadow: 'shadow-[0_4px_16px_rgba(168,85,247,0.3)]',
      };
    case 'slate':
      return {
        border: 'border-slate-300',
        thead: 'bg-slate-100 text-slate-900',
        rowAlt: 'bg-slate-50/50',
        accent: 'bg-slate-600',
        text: 'text-slate-900',
        btn: 'bg-slate-800 hover:bg-slate-900',
        candyBg: 'bg-gradient-to-r from-slate-700 via-slate-600 to-slate-800',
        candyBorder: 'border-slate-400',
        candyShadow: 'shadow-[0_4px_16px_rgba(71,85,105,0.3)]',
      };
    case 'pastel':
    default:
      return {
        border: 'border-pink-300',
        thead: 'bg-pink-100/90 text-pink-950',
        rowAlt: 'bg-pink-50/30',
        accent: 'bg-pink-400',
        text: 'text-pink-900',
        btn: 'bg-pink-500 hover:bg-pink-600',
        candyBg: 'bg-gradient-to-r from-pink-400 via-rose-300 to-pink-500',
        candyBorder: 'border-pink-300',
        candyShadow: 'shadow-[0_4px_16px_rgba(244,114,182,0.35)]',
      };
  }
};

// 📅 요일 및 날짜 계산 헬퍼 함수
const getTodayWeekDayName = (): '월' | '화' | '수' | '목' | '금' => {
  const d = new Date().getDay();
  if (d === 1) return '월';
  if (d === 2) return '화';
  if (d === 3) return '수';
  if (d === 4) return '목';
  if (d === 5) return '금';
  return '월';
};

const getWeekDayDates = () => {
  const now = new Date();
  const currentDay = now.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  const days: ('월' | '화' | '수' | '목' | '금')[] = ['월', '화', '수', '목', '금'];
  const res: Record<'월' | '화' | '수' | '목' | '금', { dateStr: string; fullDate: string; isToday: boolean }> = {} as any;

  days.forEach((d, idx) => {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + idx);
    const m = cur.getMonth() + 1;
    const date = cur.getDate();
    const isToday = cur.toDateString() === now.toDateString();
    res[d] = {
      dateStr: `${m}/${date}`,
      fullDate: `${cur.getFullYear()}-${String(m).padStart(2, '0')}-${String(date).padStart(2, '0')}`,
      isToday,
    };
  });
  return res;
};

const getPeriodElapsedDays = (startDateStr?: string) => {
  try {
    const now = new Date();
    const start = startDateStr ? new Date(startDateStr) : new Date(now.getFullYear(), now.getMonth(), 1);
    if (isNaN(start.getTime())) return 1;
    const diffTime = now.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
  } catch {
    return 1;
  }
};

export function ClassRolesModal({
  isOpen,
  onClose,
  roles,
  onUpdateRoles,
  students,
  onUpdateStudents,
  periodInfo,
  onUpdatePeriodInfo,
  onShowToast,
  initialTab = 'assign',
  theme = 'pastel',
}: ClassRolesModalProps) {
  const [activeTab, setActiveTab] = useState<'assign' | 'eval' | 'daily' | 'print' | 'settings'>(
    initialTab === 'print' ? 'print' : initialTab === 'settings' ? 'settings' : initialTab === 'eval' ? 'eval' : 'assign'
  );

  // 🖨️ A4 인쇄 양식 선택 상태 ('roles': 1인1역할표, 'eval': 기간 활동 평가표)
  const [printType, setPrintType] = useState<'roles' | 'eval'>('roles');

  // 📄 A4 용지 세로 기준 표 행간격 가득 채우기 자동 조절 상태 (기본값: true)
  const [isA4FillMode, setIsA4FillMode] = useState<boolean>(true);

  // Settings form states
  const [periodNameInput, setPeriodNameInput] = useState(periodInfo.name);
  const [periodStartInput, setPeriodStartInput] = useState(periodInfo.start);
  const [periodDurationInput, setPeriodDurationInput] = useState(periodInfo.duration);
  const [studentTextInput, setStudentTextInput] = useState(
    students.map((s) => `${s.name}${s.gender === 'M' ? '(남)' : s.gender === 'F' ? '(여)' : ''}`).join(', ')
  );
  // ✏️ 역할 목록 (설정 저장 전까지 임시로 고치는 목록)
  const [draftRoles, setDraftRoles] = useState<ClassRole[]>(() => roles.map((r) => ({ ...r, description: cleanDesc(r.description) })));
  const rolesToText = (list: ClassRole[]) => list.map((r) => `${r.title}(${roleCountText(r)})`).join('\n');
  const [roleTextInput, setRoleTextInput] = useState(() => rolesToText(roles));
  const [editingRole, setEditingRole] = useState<{ role: ClassRole; isNew: boolean } | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  useEffect(() => {
    if (!isOpen) return;
    setDraftRoles(roles.map((r) => ({ ...r, description: cleanDesc(r.description) })));
    setRoleTextInput(rolesToText(roles));
    setEditingRole(null);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // 🔄 [요구사항 6: 학생 명단 실시간 동기화]: 메인 환경설정(students prop) 변경 시 1인 1역 명단 자동 동기화 및 유효성 정리
  useEffect(() => {
    if (students && students.length > 0) {
      setStudentTextInput(
        students.map((s) => `${s.name}${s.gender === 'M' ? '(남)' : s.gender === 'F' ? '(여)' : ''}`).join(', ')
      );

      // 메인 학생 명단에서 삭제된 학생 ID가 역할에 남아있으면 자동 정리
      const validStudentIds = new Set(students.map((s) => s.id));
      const hasInvalidStudent = roles.some((r) => r.currentStudentIds.some((id) => !validStudentIds.has(id)));
      if (hasInvalidStudent) {
        const cleanedRoles = roles.map((r) => ({
          ...r,
          currentStudentIds: r.currentStudentIds.filter((id) => validStudentIds.has(id)),
        }));
        onUpdateRoles(cleanedRoles);
      }
    }
  }, [students, isOpen]);

  // Lucky Draw state
  const [luckyResult, setLuckyResult] = useState<{ student: Student; role: ClassRole } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Student manual assignment selection state (요구사항 4-가: 학생 배정 개선)
  const [selectedWaitingStudentId, setSelectedWaitingStudentId] = useState<number | null>(null);
  const [assignPickerRoleId, setAssignPickerRoleId] = useState<string | null>(null);

  // 📅 요일별 실제 달력 날짜 및 활동 일수 동기화
  const weekDates = useMemo(() => getWeekDayDates(), []);
  const todayWeekDay = useMemo(() => getTodayWeekDayName(), []);
  const elapsedDays = useMemo(() => getPeriodElapsedDays(periodInfo.start), [periodInfo.start]);

  // Daily evaluation states (오늘 요일로 자동 초기화)
  const [activeDailyDay, setActiveDailyDay] = useState<'월' | '화' | '수' | '목' | '금'>(() => getTodayWeekDayName());
  const [dailyChecks, setDailyChecks] = useState<Record<string, Record<string, 'O' | '△' | 'X'>>>(() => {
    try {
      const saved = localStorage.getItem('class_roles_daily_checks');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // 📡 보조 화면과 일일 실천/수행도 평가 실시간 양방향 동기화
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('class_display_sync_channel');
        channel.onmessage = (event) => {
          if (event.data?.type === 'UPDATE_ROLES_DATA') {
            if (event.data.dailyChecks) {
              setDailyChecks(event.data.dailyChecks);
            } else {
              try {
                const saved = localStorage.getItem('class_roles_daily_checks');
                if (saved) setDailyChecks(JSON.parse(saved));
              } catch {}
            }
            if (Array.isArray(event.data.roles)) {
              onUpdateRoles(event.data.roles);
            }
          }
        };
      }
    } catch {}

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'class_roles_daily_checks' && e.newValue) {
        try {
          setDailyChecks(JSON.parse(e.newValue));
        } catch {}
      }
      if (e.key === 'class_dashboard_roles' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) onUpdateRoles(parsed);
        } catch {}
      }
    };

    const handleCustomSync = (e: any) => {
      if (e.detail?.dailyChecks) {
        setDailyChecks(e.detail.dailyChecks);
      }
      if (Array.isArray(e.detail?.roles)) {
        onUpdateRoles(e.detail.roles);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('class_roles_updated', handleCustomSync as EventListener);

    return () => {
      try { channel?.close(); } catch {}
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('class_roles_updated', handleCustomSync as EventListener);
    };
  }, [onUpdateRoles]);

  // Period evaluation O/X status & feedback (요구사항 4-라: 기간 평가 O/X 수정)
  const [periodPassStatus, setPeriodPassStatus] = useState<Record<number, 'O' | 'X'>>(() => {
    try {
      const saved = localStorage.getItem('class_roles_period_status');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [periodFeedback, setPeriodFeedback] = useState<Record<number, string>>(() => {
    try {
      const saved = localStorage.getItem('class_roles_period_feedback');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const printAreaRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  // Unassigned students
  const assignedIds = new Set(roles.flatMap((r) => r.currentStudentIds));
  const unassignedStudents = students.filter((s) => !assignedIds.has(s.id));

  // --- Handlers ---
  const handleAssignStudent = (studentId: number, targetRoleId: string) => {
    const targetRole = roles.find((r) => r.id === targetRoleId);
    if (!targetRole) return;

    if (targetRole.currentStudentIds.length >= targetRole.maxCount && !targetRole.currentStudentIds.includes(studentId)) {
      onShowToast(`⚠️ '${targetRole.title}' 역할의 정원(${targetRole.maxCount}명)이 이미 찼습니다.`);
      return;
    }
    const stObj = students.find((s) => s.id === studentId);
    if (targetRole.genderQuota && stObj && !targetRole.currentStudentIds.includes(studentId) && !genderSlotOk(targetRole, stObj, students)) {
      onShowToast(`⚠️ '${targetRole.title}' 역할은 ${roleCountText(targetRole)}명이에요. ${stObj.gender === 'M' ? '남학생' : stObj.gender === 'F' ? '여학생' : '성별 미입력'} 자리가 없어요.`);
      return;
    }

    const updatedRoles = roles.map((r) => {
      if (r.id === targetRoleId) {
        if (r.currentStudentIds.includes(studentId)) return r;
        return { ...r, currentStudentIds: [...r.currentStudentIds, studentId] };
      }
      return {
        ...r,
        currentStudentIds: r.currentStudentIds.filter((id) => id !== studentId),
      };
    });
    onUpdateRoles(updatedRoles);

    // Update student's roleId in parent state
    const updatedStudents = students.map((s) => (s.id === studentId ? { ...s, roleId: targetRoleId } : s));
    onUpdateStudents(updatedStudents);

    const st = students.find((s) => s.id === studentId);
    onShowToast(`✨ ${st?.name || '학생'}이(가) [${targetRole.title}]에 배정되었습니다.`);
    setSelectedWaitingStudentId(null);
    setAssignPickerRoleId(null);
  };

  const handleUnassignStudent = (studentId: number) => {
    onUpdateRoles(
      roles.map((r) => ({
        ...r,
        currentStudentIds: r.currentStudentIds.filter((id) => id !== studentId),
      }))
    );
    onUpdateStudents(
      students.map((s) => (s.id === studentId ? { ...s, roleId: undefined } : s))
    );
    if (selectedWaitingStudentId === studentId) {
      setSelectedWaitingStudentId(null);
    }
    onShowToast('학생이 대기 명단으로 이동되었습니다.');
  };

  // Reset all assignments at once
  const handleResetAllAssignments = () => {
    const clearedRoles = roles.map((r) => ({ ...r, currentStudentIds: [] }));
    const clearedStudents = students.map((s) => ({ ...s, roleId: undefined }));
    onUpdateRoles(clearedRoles);
    onUpdateStudents(clearedStudents);
    setSelectedWaitingStudentId(null);
    onShowToast('🔄 모든 학생의 역할 배정이 초기화되어 대기 명단으로 이동했습니다.');
  };

  // Toggle daily evaluation check for a student and day (기본값 X에서 시작, 보조화면과 양방향 동기화)
  const handleToggleDailyCheck = (studentId: number, day: '월' | '화' | '수' | '목' | '금') => {
    const studentChecks = dailyChecks[studentId] || {};
    const current = studentChecks[day] || 'X';
    const next: 'O' | '△' | 'X' = current === 'X' ? 'O' : current === 'O' ? '△' : 'X';

    const updated = {
      ...dailyChecks,
      [studentId]: {
        ...studentChecks,
        [day]: next,
      },
    };
    setDailyChecks(updated);
    try {
      localStorage.setItem('class_roles_daily_checks', JSON.stringify(updated));
    } catch {}

    // 🔄 오늘 요일 체크 변경 시, 해당 학생 역할의 performanceScores(100/70/40) 및 보조 화면도 즉시 양방향 동기화
    let updatedRoles = roles;
    if (day === todayWeekDay) {
      const targetRole = roles.find((r) => r.currentStudentIds.includes(studentId));
      if (targetRole) {
        const newScore = checkPoint(targetRole, next);
        updatedRoles = roles.map((r) =>
          r.id === targetRole.id
            ? {
                ...r,
                performanceScores: {
                  ...(r.performanceScores || {}),
                  [studentId]: newScore,
                },
              }
            : r
        );
        onUpdateRoles(updatedRoles);
        try {
          localStorage.setItem('class_dashboard_roles', JSON.stringify(updatedRoles));
        } catch {}
      }
    }

    // 📡 BroadcastChannel 전파
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel('class_display_sync_channel');
        ch.postMessage({
          type: 'UPDATE_ROLES_DATA',
          roles: updatedRoles,
          dailyChecks: updated,
          studentId,
          day,
          isCompleted: next === 'O',
        });
        setTimeout(() => { try { ch.close(); } catch {} }, 1000);
      }
      window.dispatchEvent(new CustomEvent('class_roles_updated', {
        detail: { roles: updatedRoles, dailyChecks: updated, studentId, day, isCompleted: next === 'O' }
      }));
      window.dispatchEvent(new Event('storage'));
    } catch {}

    const st = students.find((s) => s.id === studentId);
    onShowToast(`${st?.name || '학생'} (${day}요일): ${next === 'O' ? '👏 잘했어요 (O)' : next === '△' ? '보통 (△)' : '💬 노력해요 (X)'}`);
  };

  // Bulk set today all to 'O'
  const handleSetAllDailyToO = () => {
    const updated = { ...dailyChecks };
    students.forEach((s) => {
      const r = roles.find((x) => x.currentStudentIds.includes(s.id));
      if (r && !isCheckDay(r, activeDailyDay, weekDates[activeDailyDay].fullDate)) return;
      const studentChecks = updated[s.id] || {};
      updated[s.id] = {
        ...studentChecks,
        [activeDailyDay]: 'O',
      };
    });
    setDailyChecks(updated);
    try {
      localStorage.setItem('class_roles_daily_checks', JSON.stringify(updated));
    } catch {}

    let updatedRoles = roles;
    if (activeDailyDay === todayWeekDay) {
      updatedRoles = roles.map((r) => {
        const scores = { ...(r.performanceScores || {}) };
        r.currentStudentIds.forEach((sid) => {
          scores[sid] = 100;
        });
        return {
          ...r,
          performanceScores: scores,
        };
      });
      onUpdateRoles(updatedRoles);
      try {
        localStorage.setItem('class_dashboard_roles', JSON.stringify(updatedRoles));
      } catch {}
    }

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel('class_display_sync_channel');
        ch.postMessage({
          type: 'UPDATE_ROLES_DATA',
          roles: updatedRoles,
          dailyChecks: updated,
          day: activeDailyDay,
          isCompleted: true,
        });
        setTimeout(() => { try { ch.close(); } catch {} }, 1000);
      }
      window.dispatchEvent(new CustomEvent('class_roles_updated', {
        detail: { roles: updatedRoles, dailyChecks: updated, day: activeDailyDay, isCompleted: true }
      }));
      window.dispatchEvent(new Event('storage'));
    } catch {}

    onShowToast(`🌟 ${weekDates[activeDailyDay]?.dateStr}(${activeDailyDay}요일) 전원 '잘했어요(O)'로 일괄 입력되었습니다!`);
  };

  // Bulk reset today all to 'X' (기본 미실천 상태로 일괄 초기화)
  const handleResetAllDailyToX = () => {
    const updated = { ...dailyChecks };
    students.forEach((s) => {
      const studentChecks = updated[s.id] || {};
      updated[s.id] = {
        ...studentChecks,
        [activeDailyDay]: 'X',
      };
    });
    setDailyChecks(updated);
    try {
      localStorage.setItem('class_roles_daily_checks', JSON.stringify(updated));
    } catch {}

    let updatedRoles = roles;
    if (activeDailyDay === todayWeekDay) {
      updatedRoles = roles.map((r) => {
        const scores = { ...(r.performanceScores || {}) };
        r.currentStudentIds.forEach((sid) => {
          scores[sid] = 40;
        });
        return {
          ...r,
          performanceScores: scores,
        };
      });
      onUpdateRoles(updatedRoles);
      try {
        localStorage.setItem('class_dashboard_roles', JSON.stringify(updatedRoles));
      } catch {}
    }

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel('class_display_sync_channel');
        ch.postMessage({
          type: 'UPDATE_ROLES_DATA',
          roles: updatedRoles,
          dailyChecks: updated,
          day: activeDailyDay,
          isCompleted: false,
        });
        setTimeout(() => { try { ch.close(); } catch {} }, 1000);
      }
      window.dispatchEvent(new CustomEvent('class_roles_updated', {
        detail: { roles: updatedRoles, dailyChecks: updated, day: activeDailyDay, isCompleted: false }
      }));
      window.dispatchEvent(new Event('storage'));
    } catch {}

    onShowToast(`🔄 ${weekDates[activeDailyDay]?.dateStr}(${activeDailyDay}요일) 전원 '미실천(X)'으로 초기화되었습니다.`);
  };

  // Toggle period evaluation pass status (요구사항 4-라)
  const handleTogglePeriodStatus = (studentId: number) => {
    const current = periodPassStatus[studentId] || 'O';
    const next: 'O' | 'X' = current === 'O' ? 'X' : 'O';
    const updated = {
      ...periodPassStatus,
      [studentId]: next,
    };
    setPeriodPassStatus(updated);
    try {
      localStorage.setItem('class_roles_period_status', JSON.stringify(updated));
    } catch {
      // ignore
    }
    const st = students.find((s) => s.id === studentId);
    onShowToast(`📝 ${st?.name || '학생'}의 기간 평가가 ${next === 'O' ? '👏 O (우수/이수)' : '💬 X (노력요망/미이수)'}(으)로 변경되었습니다.`);
  };

  // Smart Auto Assign
  const runSmartAutoAssign = (avoidHistory: boolean = true) => {
    const availableRoles = roles.map((r) => ({
      ...r,
      currentStudentIds: [...r.currentStudentIds],
    }));

    let candidates = [...unassignedStudents].sort(() => Math.random() - 0.5);

    if (candidates.length === 0) {
      onShowToast('대기 중인 학생이 없습니다.');
      return;
    }

    let assignedCount = 0;
    availableRoles.forEach((role) => {
      const needed = role.maxCount - role.currentStudentIds.length;
      for (let i = 0; i < needed; i++) {
        const foundIdx = candidates.findIndex((s) => {
          const genderOk = genderSlotOk(role, s, students);
          const historyOk =
            !avoidHistory ||
            !s.roleHistory ||
            !s.roleHistory.some((h) => h.role === role.title);
          return genderOk && historyOk;
        });

        if (foundIdx !== -1) {
          const student = candidates.splice(foundIdx, 1)[0];
          role.currentStudentIds.push(student.id);
          assignedCount++;
        }
      }
    });

    // If conflicts remain and couldn't avoid history, assign remaining candidates
    if (candidates.length > 0) {
      availableRoles.forEach((role) => {
        const needed = role.maxCount - role.currentStudentIds.length;
        for (let i = 0; i < needed; i++) {
          const foundIdx = candidates.findIndex((s) => genderSlotOk(role, s, students));
          if (foundIdx !== -1) {
            const student = candidates.splice(foundIdx, 1)[0];
            role.currentStudentIds.push(student.id);
            assignedCount++;
          }
        }
      });
    }

    onUpdateRoles(availableRoles);
    const updatedStudentsList = students.map((s) => {
      const foundRole = availableRoles.find((r) => r.currentStudentIds.includes(s.id));
      return { ...s, roleId: foundRole?.id };
    });
    onUpdateStudents(updatedStudentsList);
    setSelectedWaitingStudentId(null);
    playCelebrateSound();
    onShowToast(`✨ ${assignedCount}명의 학생이 공정하게 배정되었습니다!`);
  };

  // Lucky Draw
  const runLuckyDraw = () => {
    if (unassignedStudents.length === 0) {
      onShowToast('대기 중인 학생이 없습니다.');
      return;
    }
    const emptyRoles = roles.filter((r) => r.currentStudentIds.length < r.maxCount);
    if (emptyRoles.length === 0) {
      onShowToast('배정 가능한 빈 역할 자리가 없습니다.');
      return;
    }

    setIsDrawing(true);
    setTimeout(() => {
      const randomStudent = unassignedStudents[Math.floor(Math.random() * unassignedStudents.length)];
      const randomRole = emptyRoles[Math.floor(Math.random() * emptyRoles.length)];
      setLuckyResult({ student: randomStudent, role: randomRole });
      setIsDrawing(false);
      playCelebrateSound();
    }, 1200);
  };

  // 📝 텍스트 일괄 입력 → 역할 목록 (이름이 같으면 검사일·설명·배정 학생 유지)
  const applyRoleText = (text: string, notify = true): ClassRole[] => {
    const lines = text.split('\n').map(parseRoleLine).filter(Boolean) as NonNullable<ReturnType<typeof parseRoleLine>>[];
    const next: ClassRole[] = lines.map((l, idx) => {
      const ex = draftRoles.find((r) => r.title === l.title);
      return {
        ...(ex || {
          id: `r_${Date.now()}_${idx}`,
          currentStudentIds: [],
          isDaily: true,
          specialDays: [],
          description: '',
          schedule: { type: 'daily' as const },
        }),
        title: l.title,
        maxCount: l.maxCount,
        genderQuota: l.genderQuota,
        gender: ['A'],
      } as ClassRole;
    });
    setDraftRoles(next);
    if (notify) onShowToast(`📝 역할 ${next.length}개를 목록에 반영했어요.`);
    return next;
  };
  const updateDraft = (list: ClassRole[]) => {
    setDraftRoles(list);
    setRoleTextInput(rolesToText(list));
  };

  // Save changes from Settings Tab
  const handleSaveSettings = () => {
    // Parse students
    const parsedStudents: Student[] = studentTextInput
      .split(/,|\n/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((item, idx) => {
        const match = item.match(/(.+?)\s*\((남|여)\)/);
        let name = item;
        let gender: 'M' | 'F' | 'A' = 'A';
        if (match) {
          name = match[1].trim();
          gender = match[2] === '남' ? 'M' : 'F';
        }
        const existing = students.find((s) => s.name === name);
        return {
          ...(existing || {}),
          // 출석번호 · 생일 등 기존 정보는 그대로 두고, 새로 들어온 학생만 순서대로 번호를 붙여요
          id: existing ? existing.id : idx + 100,
          number: existing ? existing.number : idx + 1,
          name,
          gender: match ? gender : (existing ? existing.gender : gender),
          teamId: existing ? existing.teamId : (idx % 4) + 1,
          attendance: existing ? existing.attendance : 'present',
          praisePoints: existing ? existing.praisePoints : 0,
          selectedCount: existing ? existing.selectedCount : 0,
          roleHistory: existing ? existing.roleHistory : [],
        };
      });

    // 역할: 텍스트에 고친 내용이 있으면 먼저 목록에 반영
    const parsedRoles: ClassRole[] = applyRoleText(roleTextInput, false).map((r) => ({
      ...r,
      currentStudentIds: r.currentStudentIds.filter((id) => parsedStudents.some((s) => s.id === id)),
    }));
    setEditingRole(null);

    // 같은 학생들이면 지금 자리(배열) 순서를 그대로 유지 — 역할 저장으로 자리가 섞이지 않게
    const sameRoster = parsedStudents.length === students.length && parsedStudents.every((p) => students.some((s) => s.id === p.id));
    const finalStudents = sameRoster
      ? students.map((s) => parsedStudents.find((p) => p.id === s.id) || s)
      : parsedStudents;
    onUpdateStudents(finalStudents);
    onUpdateRoles(parsedRoles);
    onUpdatePeriodInfo({
      ...periodInfo,
      name: periodNameInput,
      start: periodStartInput,
      duration: periodDurationInput,
    });

    onShowToast('✅ 1인 1역 설정이 안전하게 저장되었습니다.');
    setActiveTab('assign');
  };

  // Trigger Print (🖨️ 모달 overflow 잘림 방지: 독립 iframe으로 전체 페이지 무결점 1페이지 인쇄 & A4 세로 가득 채움)
  const handlePrint = () => {
    onShowToast(`🖨️ [${printType === 'roles' ? '우리반 1인 1역할표' : '기간 활동 평가표'}] 인쇄를 준비합니다.`);

    const roleCount = Math.max(roles.length, 1);
    // A4 세로 가용 높이(약 220mm)를 역할 수로 균등 배분 (최소 10mm, 최대 25mm)
    const calculatedRowHeightMm = isA4FillMode
      ? Math.max(10, Math.min(25, Math.floor(220 / roleCount)))
      : 12;
    const calculatedPaddingY = isA4FillMode
      ? roleCount <= 10 ? '12px' : roleCount <= 14 ? '8px' : '5px'
      : '3px';
    const calculatedRoleFontSize = isA4FillMode
      ? roleCount <= 10 ? '15px' : roleCount <= 14 ? '13px' : '11px'
      : '11px';
    const calculatedBadgeFontSize = isA4FillMode
      ? roleCount <= 10 ? '13px' : roleCount <= 14 ? '12px' : '11px'
      : '11px';

    printElementById('print-role-area', {
      title: printType === 'roles' ? '우리반 1인 1역할표' : '1인 1역할 활동 기간 평가표',
      orientation: 'portrait',
      margin: '5mm',
      bodyClass: 'printing-role',
      customCss: `
        #print-role-area {
          width: 100% !important;
          max-width: none !important;
          height: ${isA4FillMode ? '100% !important' : 'auto !important'};
          min-height: ${isA4FillMode ? '278mm !important' : 'auto !important'};
          max-height: 287mm !important;
          margin: 0 auto !important;
          padding: 2mm 3mm !important;
          box-shadow: none !important;
          border: none !important;
          background: #ffffff !important;
          overflow: hidden !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: ${isA4FillMode ? 'space-between !important' : 'flex-start !important'};
          page-break-after: avoid !important;
          break-after: avoid !important;
          box-sizing: border-box !important;
        }
        .print-table-wrapper {
          width: 100% !important;
          ${isA4FillMode ? 'flex: 1 1 auto !important; display: flex !important; flex-direction: column !important;' : ''}
        }
        table {
          width: 100% !important;
          ${isA4FillMode ? 'height: 100% !important; flex: 1 1 auto !important;' : ''}
          border-collapse: collapse !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        tbody {
          ${isA4FillMode ? 'height: 100% !important;' : ''}
        }
        tr {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          ${isA4FillMode ? `height: ${calculatedRowHeightMm}mm !important;` : ''}
        }
        th {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          padding: ${isA4FillMode ? '8px 4px' : '4px 4px'} !important;
          font-size: ${isA4FillMode ? '13px' : '11px'} !important;
          text-align: center !important;
          vertical-align: middle !important;
        }
        td {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          padding: ${calculatedPaddingY} 6px !important;
          font-size: ${calculatedRoleFontSize} !important;
          vertical-align: middle !important;
        }
        .student-badge {
          padding: ${isA4FillMode ? '3px 8px' : '2px 5px'} !important;
          font-size: ${calculatedBadgeFontSize} !important;
          font-weight: 900 !important;
          display: inline-block !important;
          border: 1px solid #cbd5e1 !important;
          background-color: #f1f5f9 !important;
          border-radius: 6px !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      `,
    });
  };

  // Export & Import JSON
  const handleExportJSON = () => {
    const data = {
      periodInfo,
      roles,
      students,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `학급1인1역할_${periodInfo.name || '배정표'}.json`;
    a.click();
    onShowToast('📥 1인 1역할 데이터가 JSON으로 백업되었습니다.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white w-full max-w-6xl max-h-[92vh] rounded-[2.5rem] shadow-2xl border border-pink-100 flex flex-col overflow-hidden animate-fade-in">
        {/* Modal Top Header (인쇄 시 숨김) */}
        <div className="no-print p-5 sm:p-6 border-b border-pink-100/80 bg-gradient-to-r from-pink-50/70 via-rose-50/40 to-indigo-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-500 text-white flex items-center justify-center text-2xl shadow-md shadow-pink-200">
              🏫
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  1인 1역 관리 프로그램
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-pink-100 text-pink-700">
                  {periodInfo.name || '활동 기간'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                스마트 배정 · 일일 수행도 평가 · 교실 게시용 A4 인쇄
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {/* Tab navigation */}
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm text-xs font-bold">
              <button
                onClick={() => setActiveTab('assign')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === 'assign'
                    ? 'bg-pink-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                🏠 역할 배정
              </button>
              <button
                onClick={() => setActiveTab('daily')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === 'daily'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                📅 일일 평가
              </button>
              <button
                onClick={() => setActiveTab('eval')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === 'eval'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                📝 기간 평가
              </button>
              <button
                onClick={() => setActiveTab('print')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === 'print'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                🖨️ A4 인쇄
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === 'settings'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                ⚙️ 관리자 설정
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Tabs */}
        <div className="flex-1 overflow-y-auto custom-scroll p-5 sm:p-6 bg-slate-50/50">
          {/* TAB 1: ASSIGN MAIN */}
          {activeTab === 'assign' && (
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              {/* Left Sidebar: Unassigned Waiting Students & Actions */}
              <div className="w-full lg:w-80 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                      🎈 대기 학생 명단
                      <span className="text-xs bg-pink-500 text-white px-2 py-0.5 rounded-full font-black">
                        {unassignedStudents.length}명
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                      학생을 클릭한 뒤 원하는 역할 카드를 누르세요
                    </p>
                  </div>
                </div>

                {/* Waiting student chips - 직사각형 형태 및 이름 크기에 최적화 */}
                <div className="flex flex-wrap gap-2 items-start content-start min-h-[140px] max-h-60 overflow-y-auto custom-scroll p-3 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  {unassignedStudents.length === 0 ? (
                    <div className="w-full flex flex-col items-center justify-center py-6 text-center text-slate-400 font-bold text-xs">
                      <span>🎉 모든 학생이 역할을 배정받았습니다!</span>
                    </div>
                  ) : (
                    unassignedStudents.map((s) => {
                      const isSelected = selectedWaitingStudentId === s.id;
                      const genderStyle =
                        s.gender === 'M'
                          ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100 hover:border-blue-300'
                          : s.gender === 'F'
                          ? 'bg-pink-50 text-pink-800 border-pink-200 hover:bg-pink-100 hover:border-pink-300'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() =>
                            setSelectedWaitingStudentId((prev) => (prev === s.id ? null : s.id))
                          }
                          className={`h-9 px-3.5 py-1.5 rounded-xl text-xs font-black border shadow-2xs transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0 select-none ${genderStyle} ${
                            isSelected
                              ? 'ring-2 ring-pink-500 bg-pink-100/90 border-pink-400 shadow-sm scale-102 font-black'
                              : 'hover:scale-102 active:scale-98'
                          }`}
                          title={isSelected ? '선택 해제' : '역할에 배정하려면 클릭'}
                        >
                          <span className="text-sm">{s.gender === 'M' ? '👦' : s.gender === 'F' ? '👧' : '🧑'}</span>
                          <span>{s.name}</span>
                          {isSelected && <span className="text-pink-600 font-black ml-0.5">✓</span>}
                        </button>
                      );
                    })
                  )}
                </div>

                {selectedWaitingStudentId && (
                  <div className="p-2.5 bg-pink-50 border border-pink-200 rounded-xl text-xs font-bold text-pink-700 flex items-center justify-between animate-fade-in">
                    <span>
                      👉 <strong>{students.find((s) => s.id === selectedWaitingStudentId)?.name}</strong> 학생 선택됨
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedWaitingStudentId(null)}
                      className="text-pink-500 hover:text-pink-800 text-[11px] underline cursor-pointer"
                    >
                      취소
                    </button>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => runSmartAutoAssign(true)}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-2xl font-black text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>✨ 자동배정 (역할 중복 회피)</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => runSmartAutoAssign(false)}
                      className="py-2 px-3 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 rounded-xl font-extrabold text-xs transition-all active:scale-95 flex items-center justify-center gap-1 border border-cyan-200 cursor-pointer"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span>🎲 무작위 배정</span>
                    </button>

                    <button
                      type="button"
                      onClick={runLuckyDraw}
                      disabled={isDrawing || unassignedStudents.length === 0}
                      className="py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl font-extrabold text-xs transition-all active:scale-95 flex items-center justify-center gap-1 border border-amber-200 cursor-pointer disabled:opacity-50"
                    >
                      <span>🎡 행운 추첨</span>
                    </button>
                  </div>

                  {/* Reset all assignments button */}
                  <button
                    type="button"
                    onClick={handleResetAllAssignments}
                    className="w-full py-2 px-3 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 rounded-xl font-bold text-xs transition-all border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
                    title="모든 학생의 역할 배정을 비우고 대기 명단으로 이동합니다"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>전체 배정 초기화</span>
                  </button>

                  {/* Lucky draw result popover */}
                  {luckyResult && (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-center animate-fade-in">
                      <div className="text-xs font-bold text-amber-700">당첨 주인공!</div>
                      <div className="text-lg font-black text-amber-950 my-1">
                        {luckyResult.student.name}
                      </div>
                      <div className="text-xs font-extrabold text-pink-600 mb-2">
                        [{luckyResult.role.title}] 역할 배정
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleAssignStudent(luckyResult.student.id, luckyResult.role.id);
                          setLuckyResult(null);
                        }}
                        className="px-4 py-1.5 bg-pink-500 text-white rounded-xl text-xs font-black shadow-xs hover:bg-pink-600 cursor-pointer"
                      >
                        배정 확정
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Center/Right: Role Cards Grid */}
              <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {roles.map((role) => {
                  const assignedStudents = role.currentStudentIds
                    .map((id) => students.find((s) => s.id === id))
                    .filter((s): s is Student => s !== undefined);
                  const isFull = role.currentStudentIds.length >= role.maxCount;
                  const isPickerOpen = assignPickerRoleId === role.id;
                  const selectedStudentObj = students.find((s) => s.id === selectedWaitingStudentId);

                  return (
                    <div
                      key={role.id}
                      className={`bg-white p-5 rounded-3xl border shadow-sm flex flex-col justify-between transition-all group ${
                        selectedWaitingStudentId && !isFull
                          ? 'border-pink-300 ring-2 ring-pink-100 hover:border-pink-500'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        {/* Title & Badge */}
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="text-base font-black text-slate-800 break-keep">
                              {role.title}
                            </h4>
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                                  isStrictRole(role) ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                }`}
                              >
                                {scheduleLabel(role)}
                              </span>
                              {role.genderQuota && (
                                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-black px-2 py-0.5 rounded-full">
                                  👦{role.genderQuota.M} · 👧{role.genderQuota.F}
                                </span>
                              )}

                              {!role.genderQuota && role.gender && !role.gender.includes('A') && (
                                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-black px-2 py-0.5 rounded-full">
                                  {role.gender.includes('M') ? '남학생' : '여학생'}
                                </span>
                              )}
                            </div>
                          </div>

                          <span
                            className={`text-xs font-black px-2.5 py-1 rounded-full tabular-nums ${
                              isFull ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {role.currentStudentIds.length}/{role.maxCount}
                          </span>
                        </div>

                        {/* Description */}
                        {cleanDesc(role.description) && (
                          <p className="text-[11px] text-slate-500 font-medium line-clamp-2 my-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                            {cleanDesc(role.description)}
                          </p>
                        )}
                      </div>

                      {/* Drop / Assigned Area */}
                      <div className="mt-3 space-y-2">
                        <div className="text-[11px] font-bold text-slate-400 flex justify-between items-center">
                          <span>배정된 학생 ({assignedStudents.length}명)</span>
                          {!isFull && unassignedStudents.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setAssignPickerRoleId(isPickerOpen ? null : role.id)}
                              className="text-pink-600 hover:text-pink-700 text-[10px] font-black underline cursor-pointer"
                            >
                              {isPickerOpen ? '닫기' : '+ 학생 선택'}
                            </button>
                          )}
                        </div>

                        {/* If student is selected in waiting list, show quick assign button */}
                        {selectedWaitingStudentId && !isFull && (
                          <button
                            type="button"
                            onClick={() => handleAssignStudent(selectedWaitingStudentId, role.id)}
                            className="w-full py-2 px-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl font-black text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer animate-pulse"
                          >
                            <span>👇 [{selectedStudentObj?.name}] 여기에 배정</span>
                          </button>
                        )}

                        {/* Inline student picker dropdown/modal */}
                        {isPickerOpen && !isFull && (
                          <div className="p-2.5 bg-pink-50/80 border border-pink-200 rounded-2xl space-y-1.5 animate-fade-in">
                            <div className="text-[10px] font-bold text-pink-800">
                              배정할 학생을 클릭하세요:
                            </div>
                            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto custom-scroll">
                              {unassignedStudents.map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => handleAssignStudent(s.id, role.id)}
                                  className="px-2 py-1 bg-white hover:bg-pink-100 text-slate-800 border border-pink-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                >
                                  {s.gender === 'M' ? '👦' : s.gender === 'F' ? '👧' : '🧑'} {s.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="min-h-[50px] p-2 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 flex flex-wrap gap-1.5 items-center">
                          {assignedStudents.length === 0 ? (
                            <span className="text-xs text-slate-300 font-semibold p-1 italic">
                              아직 배정된 학생이 없습니다
                            </span>
                          ) : (
                            assignedStudents.map((s) => (
                              <div
                                key={s.id}
                                className="group/item flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-extrabold text-slate-800 shadow-xs"
                              >
                                <span>{s.gender === 'M' ? '👦' : s.gender === 'F' ? '👧' : '🧑'}</span>
                                <span>{s.name}</span>
                                <button
                                  type="button"
                                  onClick={() => handleUnassignStudent(s.id)}
                                  className="text-slate-300 hover:text-rose-600 ml-1 transition-colors cursor-pointer font-bold"
                                  title="배정 해제"
                                >
                                  ×
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: DAILY EVALUATION (요구사항 4-다: 날짜 및 활동 일수 동기화) */}
          {activeTab === 'daily' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-indigo-600" />
                      <span>📅 일일 1인 1역할 수행도 점검 및 평가</span>
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center gap-1 shadow-2xs">
                      📅 오늘: {weekDates[todayWeekDay]?.dateStr} ({todayWeekDay}요일)
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-pink-50 text-pink-700 border border-pink-200 flex items-center gap-1 shadow-2xs">
                      🚀 활동 {elapsedDays}일차
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    학생의 기본 상태는 <strong>X (미실천)</strong>이며, 클릭하면 <strong>O (잘했어요)</strong>, <strong>△ (보통)</strong>, <strong>X (노력해요)</strong>로 순환 전환되며 보조 화면과 실시간 동기화됩니다.
                  </p>
                  <div className="flex items-center gap-2 flex-wrap mt-2" data-score-legend>
                    <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">📅 매일 역할 · 기본 평가: O 100 / △ 80 / X 40 · 60% 이상 이수</span>
                    <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-black bg-amber-50 text-amber-800 border border-amber-200">🗓️ 주 n회 · 🎂 특별한 날 · 엄격 평가: O 100 / △ 50 / X 0 · 80% 이상 이수</span>
                    <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-black bg-slate-50 text-slate-500 border border-slate-200">– : 검사하지 않는 날</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Day of Week Selector with Real Dates & Today badge */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-2xl gap-0.5">
                    {(['월', '화', '수', '목', '금'] as const).map((day) => {
                      const dayInfo = weekDates[day];
                      const isSelected = activeDailyDay === day;
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => setActiveDailyDay(day)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : dayInfo.isToday
                              ? 'bg-amber-100 text-amber-900 border border-amber-300 font-black'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                          }`}
                          title={`${dayInfo.dateStr} (${day}요일) 점검 화면 선택`}
                        >
                          <span>{dayInfo.dateStr}</span>
                          <span>({day})</span>
                          {dayInfo.isToday && (
                            <span
                              className={`text-[9px] px-1 py-0.2 rounded-md font-extrabold ${
                                isSelected ? 'bg-amber-400 text-indigo-950' : 'bg-amber-500 text-white'
                              }`}
                            >
                              오늘
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Bulk all good button with dynamic Date & Day */}
                  <button
                    type="button"
                    onClick={handleSetAllDailyToO}
                    className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black shadow-xs transition active:scale-95 flex items-center gap-1 cursor-pointer"
                    title={`${weekDates[activeDailyDay]?.dateStr}(${activeDailyDay}요일) 전원 '잘했어요(O)'로 일괄 입력합니다`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>🌟 {weekDates[activeDailyDay]?.dateStr}({activeDailyDay}) 전원 '잘했어요'</span>
                  </button>

                  {/* Bulk all X (미실천 초기화) button */}
                  <button
                    type="button"
                    onClick={handleResetAllDailyToX}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-rose-100 text-slate-700 hover:text-rose-700 rounded-xl text-xs font-black shadow-xs transition active:scale-95 flex items-center gap-1 cursor-pointer"
                    title={`${weekDates[activeDailyDay]?.dateStr}(${activeDailyDay}요일) 전원 '미실천(X)'으로 초기화합니다`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>전원 '미실천(X)'</span>
                  </button>
                </div>
              </div>

              {/* Daily eval table */}
              <div className="overflow-x-auto custom-scroll pb-2">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-extrabold border-b border-slate-200">
                      <th className="p-3 w-16 text-center">번호</th>
                      <th className="p-3 w-24">이름</th>
                      <th className="p-3 w-40">담당 역할</th>
                      <th className="p-3 w-28 text-center">주간 달성률</th>
                      {(['월', '화', '수', '목', '금'] as const).map((d) => {
                        const dayInfo = weekDates[d];
                        const isSelected = activeDailyDay === d;
                        return (
                          <th
                            key={d}
                            className={`p-2.5 text-center w-24 transition-colors ${
                              isSelected
                                ? 'bg-indigo-100/90 text-indigo-950 font-black border-x border-indigo-200'
                                : dayInfo.isToday
                                ? 'bg-amber-50 text-amber-900 font-black'
                                : ''
                            }`}
                          >
                            <div className="flex flex-col items-center">
                              <span className="text-[11px] font-bold text-slate-500">{dayInfo.dateStr}</span>
                              <span className="text-xs font-black flex items-center gap-1">
                                {d}요일
                                {dayInfo.isToday && (
                                  <span className="text-[9px] bg-amber-400 text-amber-950 px-1 rounded-sm font-black">
                                    오늘
                                  </span>
                                )}
                              </span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((s) => {
                      const assignedRole = roles.find((r) => r.currentStudentIds.includes(s.id));
                      const sChecks = dailyChecks[s.id] || {};
                      const days = WEEK_DAYS;
                      const { rate: avgRate, checkDays } = computeRoleRate(assignedRole, sChecks, weekDates);
                      const pl = passLine(assignedRole);

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3 text-center text-slate-400 font-bold">{s.number}</td>
                          <td className="p-3 font-black text-slate-800">
                            {s.gender === 'M' ? '👦' : s.gender === 'F' ? '👧' : '🧑'} {s.name}
                          </td>
                          <td className="p-3 font-extrabold text-blue-600">
                            {assignedRole ? (
                              <div className="flex flex-col gap-0.5">
                                <span>{assignedRole.title}</span>
                                <span className={`text-[10px] font-black ${isStrictRole(assignedRole) ? 'text-amber-600' : 'text-emerald-600'}`}>
                                  {scheduleLabel(assignedRole)}
                                </span>
                              </div>
                            ) : <span className="text-slate-300">미배정</span>}
                          </td>
                          <td className="p-3 text-center font-black">
                            {assignedRole && checkDays === 0 ? (
                              <span className="text-[10px] text-slate-400 font-bold">이번 주 검사 없음</span>
                            ) : (
                              <span
                                className={`px-2 py-0.5 rounded-lg text-xs ${
                                  avgRate >= Math.max(pl, 80)
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : avgRate >= pl
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                                title={scoreRuleText(assignedRole)}
                              >
                                {avgRate}%
                              </span>
                            )}
                          </td>
                          {days.map((day) => {
                            const val = sChecks[day] || 'X';
                            const dayInfo = weekDates[day];
                            if (assignedRole && !isCheckDay(assignedRole, day, dayInfo.fullDate)) {
                              return (
                                <td key={day} className={`p-2 text-center ${dayInfo.isToday ? 'bg-amber-50/50' : ''}`}>
                                  <span className="inline-flex w-9 h-8 items-center justify-center rounded-xl bg-slate-100 text-slate-300 font-black text-sm" title="검사하지 않는 날">
                                    –
                                  </span>
                                </td>
                              );
                            }
                            return (
                              <td
                                key={day}
                                className={`p-2 text-center transition-colors ${
                                  dayInfo.isToday ? 'bg-amber-50/50' : ''
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleToggleDailyCheck(s.id, day)}
                                  className={`w-9 h-8 rounded-xl font-black text-xs transition cursor-pointer shadow-xs active:scale-90 ${
                                    val === 'O'
                                      ? 'bg-emerald-500 text-white hover:bg-emerald-600 ring-2 ring-emerald-200'
                                      : val === '△'
                                      ? 'bg-amber-500 text-white hover:bg-amber-600 ring-2 ring-amber-200'
                                      : 'bg-rose-500 text-white hover:bg-rose-600 ring-2 ring-rose-200'
                                  }`}
                                  title={`${s.name} ${weekDates[day]?.dateStr} (${day}요일) 평가 변경 (현재: ${
                                    val === 'O' ? '잘했어요' : val === '△' ? '보통' : '노력해요(미실천)'
                                  })`}
                                >
                                  {val}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PERIOD EVALUATION & FEEDBACK (요구사항 4-라: 기간 평가 O/X 수정) */}
          {activeTab === 'eval' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                    <Award className="w-5 h-5 text-emerald-600" />
                    <span>📝 기간별 1인 1역할 활동 평가 · 학생 피드백</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    <strong>[실천 이수 여부]</strong>의 <strong>O / X</strong> 버튼을 클릭하여 평가 결과를 즉시 수정할 수 있습니다. 피드백은 학생이 직접 읽고 스스로 돌아볼 수 있는 문장으로 만들어져요.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPeriodFeedback({});
                    try {
                      localStorage.removeItem('class_roles_period_feedback');
                    } catch {}
                    onShowToast('✨ 점수에 맞춰 학생용 피드백을 다시 만들었어요.');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-bold hover:bg-emerald-50 cursor-pointer"
                  title="직접 고친 피드백을 지우고 점수에 맞는 문장으로 다시 만들어요"
                >
                  ✨ 피드백 다시 만들기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrintType('eval');
                    setActiveTab('print');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs hover:bg-emerald-700 flex items-center gap-1.5 cursor-pointer"
                  title="기간 활동 평가표 A4 인쇄 미리보기로 이동"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>평가표 인쇄</span>
                </button>
              </div>

              <div className="overflow-x-auto custom-scroll">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-emerald-50 text-emerald-950 font-black border-b-2 border-emerald-200">
                      <th className="p-3 w-16 text-center">번호</th>
                      <th className="p-3 w-28">학생 이름</th>
                      <th className="p-3 w-40">맡은 역할</th>
                      <th className="p-3 w-36 text-center">실천 여부 (클릭하여 O/X 수정)</th>
                      <th className="p-3 w-24 text-center">평가 점수</th>
                      <th className="p-3">학생에게 주는 피드백 · 스스로 돌아보기 (직접 고칠 수 있어요)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((s) => {
                      const assignedRole = roles.find((r) => r.currentStudentIds.includes(s.id));
                      const sChecks = dailyChecks[s.id] || {};
                      const { rate: avgRate, checkDays, done } = computeRoleRate(assignedRole, sChecks, weekDates);
                      const calculatedScore = (avgRate / 10).toFixed(1); // 10점 만점 환산
                      const manualStatus = periodPassStatus[s.id];
                      const isPass = manualStatus !== undefined ? manualStatus === 'O' : avgRate >= passLine(assignedRole);

                      const defaultComment = studentReflection(s.name, assignedRole, avgRate, checkDays, done);
                      const currentComment = periodFeedback[s.id] ?? defaultComment;

                      return (
                        <tr key={s.id} className="hover:bg-emerald-50/30 transition-colors">
                          <td className="p-3 text-center text-slate-400 font-bold align-top">{s.number}</td>
                          <td className="p-3 font-black text-slate-800 align-top">
                            {s.gender === 'M' ? '👦' : s.gender === 'F' ? '👧' : '🧑'} {s.name}
                          </td>
                          <td className="p-3 font-extrabold text-emerald-800 align-top">
                            {assignedRole ? assignedRole.title : <span className="text-slate-300">미배정</span>}
                          </td>
                          {/* O / X Toggle Button (요구사항 4-라) */}
                          <td className="p-3 text-center align-top">
                            <button
                              type="button"
                              onClick={() => handleTogglePeriodStatus(s.id)}
                              className={`px-3 py-1.5 rounded-xl font-black text-xs transition cursor-pointer shadow-xs active:scale-95 inline-flex items-center gap-1.5 ${
                                isPass
                                  ? 'bg-emerald-500 text-white hover:bg-emerald-600 ring-2 ring-emerald-200'
                                  : 'bg-rose-500 text-white hover:bg-rose-600 ring-2 ring-rose-200'
                              }`}
                              title="클릭하면 O와 X로 번갈아 수정됩니다"
                            >
                              {isPass ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>O (잘했어요)</span>
                                </>
                              ) : (
                                <>
                                  <X className="w-3.5 h-3.5" />
                                  <span>X (노력해요)</span>
                                </>
                              )}
                            </button>
                          </td>
                          {/* 평가 점수: 일일 평가의 주간 달성률 연동 반영 (요구사항 4) */}
                          <td className="p-3 text-center align-top">
                            <div className="flex flex-col items-center gap-0.5">
                              <span
                                className={`px-2.5 py-1 font-black rounded-xl text-xs whitespace-nowrap ${
                                  avgRate >= 80
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : avgRate >= 60
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {calculatedScore}<span className="text-[10px] opacity-70"> / 10점</span>
                              </span>
                              <span className="text-[10px] text-emerald-700 font-bold">
                                검사 {checkDays}일 · {avgRate}%
                              </span>
                              {assignedRole && (
                                <span className={`text-[9.5px] font-black ${isStrictRole(assignedRole) ? 'text-amber-600' : 'text-slate-400'}`}>
                                  {isStrictRole(assignedRole) ? '엄격 평가' : '기본 평가'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 align-top">
                            <textarea
                              value={currentComment}
                              onChange={(e) => {
                                const val = e.target.value;
                                const updated = { ...periodFeedback, [s.id]: val };
                                setPeriodFeedback(updated);
                                try {
                                  localStorage.setItem('class_roles_period_feedback', JSON.stringify(updated));
                                } catch {
                                  // ignore
                                }
                              }}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium leading-relaxed focus:ring-2 focus:ring-emerald-300 outline-none resize-none custom-scroll"
                              rows={3}
                              placeholder="학생의 역할 실천 특기사항 입력..."
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: A4 PRINT VIEW (요구사항: 1인 1역할표 vs 기간 평가표 선택 미리보기 & 인쇄) */}
          {activeTab === 'print' && (() => {
            const printTheme = getThemePrintColors(theme);
            const isCompact = roles.length > 12;
            const roleCount = Math.max(roles.length, 1);

            // 📐 A4 세로 가득 채우기(isA4FillMode) 행 높이 및 간격 계산
            const targetRowHeightMm = isA4FillMode
              ? Math.max(10, Math.min(25, Math.floor(220 / roleCount)))
              : null;
            const cellPaddingY = isA4FillMode
              ? roleCount <= 10 ? 'py-3.5 sm:py-4' : roleCount <= 14 ? 'py-2.5 sm:py-3' : 'py-1.5 sm:py-2'
              : 'py-2';
            const roleTitleSize = isA4FillMode
              ? roleCount <= 10 ? 'text-base sm:text-lg font-black' : roleCount <= 14 ? 'text-sm sm:text-base font-black' : 'text-xs sm:text-sm font-black'
              : isCompact ? 'text-xs font-black' : 'text-sm font-black';
            const studentBadgeSize = isA4FillMode
              ? roleCount <= 10 ? 'text-sm sm:text-base px-3 py-1' : roleCount <= 14 ? 'text-xs sm:text-sm px-2.5 py-0.5' : 'text-xs px-2 py-0.5'
              : isCompact ? 'text-xs px-2 py-0.5' : 'text-sm px-2 py-0.5';
            const descSize = isA4FillMode
              ? roleCount <= 10 ? 'text-xs sm:text-sm' : 'text-xs'
              : isCompact ? 'text-[11px]' : 'text-xs';

            return (
              <div className="space-y-4">
                {/* 상단 컨트롤러 (인쇄 시 숨김 no-print) */}
                <div className="no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-slate-800">
                        {printType === 'roles' ? '🖨️ 교실 게시용 1인 1역할표' : '📝 기간별 1인 1역할 활동 평가표'} (A4 세로 모드)
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        테마: {theme} 동기화
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      아래의 미리보기를 확인한 뒤 [인쇄 실행하기]를 누르면 A4 세로 1페이지 인쇄면에 맞춰 표가 가득 차게 최적화 출력됩니다.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* 🔀 인쇄 양식 선택 토글 버튼 (1인 1역할표 vs 기간 평가표) */}
                    <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setPrintType('roles')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                          printType === 'roles'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span>📋 1인 1역할표</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrintType('eval')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                          printType === 'eval'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span>📝 기간 활동 평가표</span>
                      </button>
                    </div>

                    {/* 📐 [요구사항 2] 프린트 용지 가득 채우기 (A4 최적화) 토글 버튼 */}
                    {printType === 'roles' && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !isA4FillMode;
                          setIsA4FillMode(nextVal);
                          onShowToast(nextVal ? '✨ A4 용지 가득 채우기 모드가 켜졌습니다.' : 'ℹ️ 표준 기본 간격 모드로 변경되었습니다.');
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 border ${
                          isA4FillMode
                            ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                        }`}
                        title="A4 용지 세로 공간에 맞춰 표 행간격과 셀을 최대로 자동 조절합니다"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>프린트 용지 가득 채우기 (A4 최적화)</span>
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                            isA4FillMode ? 'bg-amber-700/60 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isA4FillMode ? 'ON' : 'OFF'}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handlePrint}
                      className={`px-4 py-2 rounded-xl ${
                        printType === 'roles' ? printTheme.btn : 'bg-emerald-600 hover:bg-emerald-700'
                      } text-white font-black text-xs shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer`}
                    >
                      <Printer className="w-4 h-4" />
                      <span>인쇄 실행하기</span>
                    </button>
                  </div>
                </div>

                {/* Printable Paper Canvas (순수 A4 세로 인쇄 전용 영역) */}
                <div
                  ref={printAreaRef}
                  id="print-role-area"
                  className={`bg-white p-6 sm:p-8 rounded-3xl shadow-xl border ${printTheme.border} w-full max-w-4xl mx-auto print-page-fill ${
                    isA4FillMode && printType === 'roles' ? 'min-h-[820px] flex flex-col justify-between' : ''
                  }`}
                >
                  {/* 양식 1: 1인 1역할표 미리보기 */}
                  {printType === 'roles' && (
                    <>
                      {/* 🍭 [요구사항 4] 캔디바 타이틀 디자인 */}
                      <div className="text-center mb-4 sm:mb-6">
                        <div className="inline-block relative">
                          <div
                            className={`px-8 sm:px-12 py-2.5 sm:py-3.5 rounded-full ${printTheme.candyBg} ${printTheme.candyBorder} border-2 sm:border-3 ${printTheme.candyShadow} relative overflow-hidden transition-all`}
                          >
                            {/* 캔디바 상단 광택 효과 (Gloss Shine) */}
                            <div className="absolute top-1 left-4 right-4 h-1.5 sm:h-2 bg-white/40 rounded-full pointer-events-none" />

                            <div className="flex items-center justify-center gap-2 sm:gap-3">
                              <span className="text-xl sm:text-2xl select-none animate-pulse">🌟</span>
                              <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]">
                                우리반 1인 1역할표
                              </h1>
                              <span className="text-xl sm:text-2xl select-none animate-pulse">🌟</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end items-center text-xs sm:text-sm font-bold text-slate-500 mt-2.5 px-2">
                          <span>활동 기간: {periodInfo.name || '2026학년도 2학기'}</span>
                        </div>
                      </div>

                      {/* 📐 용지 맞춤 테이블 컨테이너 (flex-1 자동 세로 확장) */}
                      <div className={`border-2 ${printTheme.border} rounded-2xl overflow-hidden print-table-wrapper ${isA4FillMode ? 'flex-1 flex flex-col' : ''}`}>
                        <table className={`w-full border-collapse text-left ${isA4FillMode ? 'h-full flex-1' : ''}`}>
                          <thead className={`${printTheme.thead} font-black text-xs sm:text-sm border-b-2 ${printTheme.border}`}>
                            <tr>
                              <th className={`${isA4FillMode ? 'p-3' : 'p-2.5'} text-center w-[25%] border-r border-slate-200`}>맡은 역할</th>
                              <th className={`${isA4FillMode ? 'p-3' : 'p-2.5'} text-center w-[25%] border-r border-slate-200`}>담당 학생</th>
                              <th className={`${isA4FillMode ? 'p-3' : 'p-2.5'} text-center w-[50%]`}>자세한 안내 (하는 일)</th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y divide-slate-200 ${isA4FillMode ? 'h-full' : ''}`}>
                            {roles.map((role, idx) => {
                              const members = role.currentStudentIds
                                .map((sid) => students.find((s) => s.id === sid)?.name)
                                .filter(Boolean);

                              return (
                                <tr
                                  key={role.id}
                                  className={idx % 2 === 0 ? 'bg-white' : printTheme.rowAlt}
                                  style={isA4FillMode && targetRowHeightMm ? { height: `${targetRowHeightMm}mm` } : undefined}
                                >
                                  <td className={`${cellPaddingY} px-2.5 text-center font-black ${printTheme.text} border-r border-slate-200 align-middle`}>
                                    <div className={roleTitleSize}>{role.title}</div>
                                    <div className="text-[11px] text-slate-500 font-bold mt-1">
                                      ({role.maxCount}명{role.genderQuota ? ` · 남${role.genderQuota.M} 여${role.genderQuota.F}` : ''})
                                    </div>
                                    <div className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${isStrictRole(role) ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                                      {scheduleLabel(role)}
                                    </div>
                                  </td>
                                  <td className={`${cellPaddingY} px-2.5 text-center font-black text-slate-800 border-r border-slate-200 align-middle`}>
                                    {members.length > 0 ? (
                                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                                        {members.map((m, mIdx) => (
                                          <span
                                            key={mIdx}
                                            className={`student-badge px-2.5 py-1 bg-slate-100 border border-slate-300 rounded-lg font-black ${studentBadgeSize} text-slate-900 shadow-2xs inline-block`}
                                          >
                                            {m}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-slate-300 italic text-xs">공석</span>
                                    )}
                                  </td>
                                  <td className={`${cellPaddingY} px-3 text-slate-700 font-medium leading-relaxed whitespace-pre-line ${descSize} align-middle`}>
                                    {cleanDesc(role.description) || '선생님과 학급을 위한 정성스러운 자치 봉사 활동'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {/* 양식 2: 기간 활동 평가표 미리보기 (요구사항: 평가표 내용 출력) */}
                  {printType === 'eval' && (
                    <>
                      <div className="text-center mb-5">
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                          📝 1인 1역할 활동 기간 평가표 📝
                        </h1>
                        <div className="w-32 h-1 bg-emerald-500 mx-auto rounded-full mt-2 mb-1"></div>
                        <div className="flex justify-between items-center text-xs font-bold text-slate-500 mt-2">
                          <span>평가 대상: {students.length}명 전체</span>
                          <span>활동 기간: {periodInfo.name || '2026학년도 2학기'}</span>
                        </div>
                      </div>

                      <div className="border-2 border-emerald-400 rounded-2xl overflow-hidden">
                        <table className="w-full border-collapse text-left text-xs">
                          <thead className="bg-emerald-50 text-emerald-950 font-black text-xs border-b-2 border-emerald-300">
                            <tr>
                              <th className="p-2 text-center w-12 border-r border-slate-200">번호</th>
                              <th className="p-2 text-center w-24 border-r border-slate-200">이름</th>
                              <th className="p-2 text-center w-32 border-r border-slate-200">맡은 역할</th>
                              <th className="p-2 text-center w-20 border-r border-slate-200">실천 이수</th>
                              <th className="p-2 text-center w-20 border-r border-slate-200">점수</th>
                              <th className="p-2 text-left">선생님의 한마디 · 스스로 돌아보기</th>
                              <th className="p-2 text-center w-36 border-l border-slate-200">나의 다짐 ✍️</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {students.map((s, idx) => {
                              const assignedRole = roles.find((r) => r.currentStudentIds.includes(s.id));
                              const sChecks = dailyChecks[s.id] || {};
                              const { rate: avgRate, checkDays, done } = computeRoleRate(assignedRole, sChecks, weekDates);
                              const calculatedScore = (avgRate / 10).toFixed(1);
                              const manualStatus = periodPassStatus[s.id];
                              const isPass = manualStatus !== undefined ? manualStatus === 'O' : avgRate >= passLine(assignedRole);
                              const defaultFeedback = periodFeedback[s.id] ?? studentReflection(s.name, assignedRole, avgRate, checkDays, done);

                              return (
                                <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                                  <td className="p-2 text-center font-bold text-slate-700 border-r border-slate-200 tabular-nums">
                                    {s.number || idx + 1}
                                  </td>
                                  <td className="p-2 text-center font-black text-slate-900 border-r border-slate-200">
                                    {s.name}
                                  </td>
                                  <td className="p-2 text-center font-bold text-slate-800 border-r border-slate-200">
                                    {assignedRole?.title || <span className="text-slate-300 italic">미배정</span>}
                                  </td>
                                  <td className="p-2 text-center border-r border-slate-200">
                                    <span
                                      className={`px-2 py-0.5 rounded font-black text-xs ${
                                        isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                      }`}
                                    >
                                      {isPass ? 'O (잘했어요)' : 'X (노력해요)'}
                                    </span>
                                  </td>
                                  <td className="p-2 text-center font-black text-slate-900 border-r border-slate-200 tabular-nums">
                                    {calculatedScore}점
                                  </td>
                                  <td className="p-2 text-slate-700 leading-relaxed">
                                    {defaultFeedback}
                                  </td>
                                  <td className="p-2 border-l border-slate-200" />
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })()}

          {/* TAB 5: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* 1. Period Setup */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                  <span>🗓️ 1인 1역할 활동 기간 설정</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      활동 기간명 (예: 2학기 1차)
                    </label>
                    <input
                      type="text"
                      value={periodNameInput}
                      onChange={(e) => setPeriodNameInput(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-300 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      시작일
                    </label>
                    <input
                      type="date" min="2000-01-01" max="2099-12-31"
                      value={periodStartInput}
                      onChange={(e) => setPeriodStartInput(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-300 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      운영 기간
                    </label>
                    <select
                      value={periodDurationInput}
                      onChange={(e) => setPeriodDurationInput(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-300 outline-none"
                    >
                      <option value="1w">1주일 (7일)</option>
                      <option value="2w">2주일 (14일)</option>
                      <option value="1m">1개월 (약 30일)</option>
                      <option value="1s">1학기 (약 4개월)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. Bulk Input Setup (Students & Roles) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Students bulk input */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>학생 명단 일괄 입력</span>
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        🔗 메인 명단 연동 ({students.length}명)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setStudentTextInput(
                            students.map((s) => `${s.name}${s.gender === 'M' ? '(남)' : s.gender === 'F' ? '(여)' : ''}`).join(', ')
                          );
                          onShowToast(`🔄 메인 환경설정 학생 명단(${students.length}명)으로 다시 불러왔습니다.`);
                        }}
                        className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition cursor-pointer"
                        title="메인 환경설정 학생 명단으로 덮어쓰기"
                      >
                        🔄 재동기화
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    대시보드 메인 학생 명단이 자동으로 불러와지며, 직접 수정도 가능합니다.
                  </p>
                  <textarea
                    rows={6}
                    value={studentTextInput}
                    onChange={(e) => setStudentTextInput(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-blue-300 outline-none custom-scroll"
                  />
                </div>

                {/* Roles bulk input */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <Award className="w-4 h-4 text-pink-600" />
                    <span>역할 및 인원 일괄 입력</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    줄바꿈으로 구분. 예: <code className="text-pink-600">칠판 정리(2)</code> · 남녀 따로:{' '}
                    <code className="text-pink-600">분리수거(남1,여1)</code>
                    <br />
                    검사일 · 하는 일 설명은 아래 <b>역할 목록</b>에서 정해요.
                  </p>
                  <textarea
                    rows={6}
                    value={roleTextInput}
                    onChange={(e) => setRoleTextInput(e.target.value)}
                    onBlur={() => applyRoleText(roleTextInput, false)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-pink-300 outline-none custom-scroll"
                    data-role-text
                  />
                  <button
                    type="button"
                    onClick={() => applyRoleText(roleTextInput)}
                    className="w-full py-2 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-700 text-xs font-black cursor-pointer"
                  >
                    ⬇️ 아래 역할 목록에 반영
                  </button>
                </div>
              </div>

              {/* 3. 역할 목록: 인원 · 검사일 · 하는 일 설명 */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4" data-role-list>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <span>📋 역할 목록 · 검사일 · 하는 일 설명</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200 font-black">{draftRoles.length}개</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      매일 하는 역할은 기본 평가, 주 n회 · 특별한 날 역할은 <b className="text-amber-700">엄격 평가</b>로 점수를 매겨요.
                    </p>
                  </div>
                  <form
                    className="flex items-center gap-1.5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const name = newRoleName.trim();
                      if (!name) return;
                      setEditingRole({
                        isNew: true,
                        role: { id: `r_${Date.now()}`, title: name, maxCount: 1, currentStudentIds: [], gender: ['A'], isDaily: true, specialDays: [], description: '', schedule: { type: 'daily' } },
                      });
                      setNewRoleName('');
                    }}
                  >
                    <input
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      placeholder="새 역할 이름 (예: 우유 나르기)"
                      className="w-52 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-pink-300 outline-none"
                      data-new-role
                    />
                    <button type="submit" className="px-3 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-black cursor-pointer">
                      ＋ 역할 추가
                    </button>
                  </form>
                </div>

                {editingRole?.isNew && (
                  <RoleEditorPanel
                    key={editingRole.role.id}
                    initial={editingRole.role}
                    isNew
                    students={students}
                    periodStart={periodStartInput}
                    periodDuration={periodDurationInput}
                    onCancel={() => setEditingRole(null)}
                    onApply={(r) => {
                      updateDraft([...draftRoles, r]);
                      setEditingRole(null);
                      onShowToast(`➕ [${r.title}] 역할을 목록에 추가했어요.`);
                    }}
                  />
                )}

                <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                  {draftRoles.length === 0 && (
                    <div className="p-6 text-center text-xs font-bold text-slate-400">역할을 추가해 주세요.</div>
                  )}
                  {draftRoles.map((r, idx) =>
                    editingRole && !editingRole.isNew && editingRole.role.id === r.id ? (
                      <div key={r.id} className="p-3 bg-pink-50/30">
                        <RoleEditorPanel
                          initial={r}
                          isNew={false}
                          students={students}
                          periodStart={periodStartInput}
                          periodDuration={periodDurationInput}
                          onCancel={() => setEditingRole(null)}
                          onApply={(nr) => {
                            updateDraft(draftRoles.map((x) => (x.id === r.id ? nr : x)));
                            setEditingRole(null);
                          }}
                        />
                      </div>
                    ) : (
                      <div key={r.id} className="flex items-start gap-3 p-3 hover:bg-slate-50/70 transition-colors" data-role-row>
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-black text-slate-800">{r.title}</span>
                            <span className="text-[10.5px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {r.genderQuota ? `👦 남${r.genderQuota.M} · 👧 여${r.genderQuota.F}` : `👥 ${r.maxCount}명`}
                            </span>
                            <span
                              className={`text-[10.5px] font-black px-2 py-0.5 rounded-full border ${
                                isStrictRole(r) ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {getSchedule(r).type === 'special' ? '🎂 ' : getSchedule(r).type === 'weekly' ? '🗓️ ' : '📅 '}
                              {scheduleLabel(r)}
                            </span>
                            {isStrictRole(r) && <span className="text-[10px] font-black text-amber-600">엄격 평가</span>}
                          </div>
                          <p className={`text-[11px] mt-1 font-medium truncate ${cleanDesc(r.description) ? 'text-slate-600' : 'text-slate-300 italic'}`}>
                            {cleanDesc(r.description) || '하는 일 설명이 비어 있어요 — [고치기]에서 적어 주세요'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button type="button" disabled={idx === 0} onClick={() => { const l = [...draftRoles]; [l[idx - 1], l[idx]] = [l[idx], l[idx - 1]]; updateDraft(l); }} className="w-7 h-7 rounded-lg bg-slate-50 text-slate-400 hover:text-slate-700 text-xs font-black cursor-pointer disabled:opacity-30" title="위로">▲</button>
                          <button type="button" disabled={idx === draftRoles.length - 1} onClick={() => { const l = [...draftRoles]; [l[idx + 1], l[idx]] = [l[idx], l[idx + 1]]; updateDraft(l); }} className="w-7 h-7 rounded-lg bg-slate-50 text-slate-400 hover:text-slate-700 text-xs font-black cursor-pointer disabled:opacity-30" title="아래로">▼</button>
                          <button type="button" onClick={() => setEditingRole({ role: r, isNew: false })} className="px-2.5 h-7 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 text-[11px] font-black cursor-pointer" data-edit-role>
                            ✏️ 고치기
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`[${r.title}] 역할을 지울까요?`)) updateDraft(draftRoles.filter((x) => x.id !== r.id));
                            }}
                            className="w-7 h-7 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 cursor-pointer flex items-center justify-center"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Action: Save All */}
              <div className="flex gap-3">
                <button
                  onClick={handleSaveSettings}
                  className="flex-1 py-4 bg-pink-500 hover:bg-pink-600 text-white rounded-2xl font-black text-base shadow-lg shadow-pink-200 transition-all active:scale-98 flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  <span>설정 저장하고 배정 시작하기</span>
                </button>

                <button
                  onClick={handleExportJSON}
                  className="px-6 py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-black text-xs shadow-md transition-all flex items-center gap-2"
                  title="전체 데이터 JSON 파일 다운로드"
                >
                  <Download className="w-4 h-4" />
                  <span>백업 저장</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
