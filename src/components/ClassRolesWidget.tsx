import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  Shuffle,
  Settings,
  Printer,
  Calendar,
  Award,
  CheckCircle2,
  Sliders,
  X,
  Check,
  ClipboardCheck,
} from 'lucide-react';
import { ClassRole, Student, RolePeriodInfo } from '../types';
import { isCheckDay, isStrictRole, scheduleLabel, WEEK_DAYS } from '../utils/roleSchedule';


interface ClassRolesWidgetProps {
  roles: ClassRole[];
  onUpdateRoles?: (newRoles: ClassRole[]) => void;
  students: Student[];
  periodInfo: RolePeriodInfo;
  onOpenRolesModal: (initialTab?: 'roles' | 'assign' | 'eval' | 'daily' | 'print' | 'settings') => void;
  onAutoAssign: (smart: boolean) => void;
  onOpenStudentDisplay?: (tab: 'roles') => void;
  onShowToast: (msg: string) => void;
}

export const ClassRolesWidget: React.FC<ClassRolesWidgetProps> = ({
  roles,
  onUpdateRoles,
  students,
  periodInfo,
  onOpenRolesModal,
  onAutoAssign,
  onOpenStudentDisplay,
  onShowToast,
}) => {
  // Statistics
  const assignedStudentIds = new Set(roles.flatMap((r) => r.currentStudentIds));
  const totalStudents = students.length;
  const assignedCount = assignedStudentIds.size;
  const unassignedCount = Math.max(0, totalStudents - assignedCount);
  const assignPercent = totalStudents > 0 ? Math.round((assignedCount / totalStudents) * 100) : 0;

  // 📅 오늘 요일 식별 ('월' ~ '금')
  const getTodayDayName = (): '월' | '화' | '수' | '목' | '금' => {
    const d = new Date().getDay();
    if (d === 1) return '월';
    if (d === 2) return '화';
    if (d === 3) return '수';
    if (d === 4) return '목';
    if (d === 5) return '금';
    return '월';
  };
  const todayDayName = getTodayDayName();
  const todayFull = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const isWeekday = new Date().getDay() >= 1 && new Date().getDay() <= 5;
  const checksToday = (r: ClassRole) => isWeekday && (WEEK_DAYS as string[]).includes(todayDayName) && isCheckDay(r, todayDayName as any, todayFull);

  // 🔄 일일 실천 기록 상태 (보조화면 및 모달 양방향 실시간 동기화)
  const [dailyChecks, setDailyChecks] = useState<Record<string, Record<string, 'O' | '△' | 'X'>>>(() => {
    try {
      const saved = localStorage.getItem('class_roles_daily_checks');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // 📡 실시간 동기화 리스너 (BroadcastChannel + storage + CustomEvent)
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('class_display_sync_channel');
        channel.onmessage = (event) => {
          if (event.data?.type === 'UPDATE_ROLES_DATA') {
            if (Array.isArray(event.data.roles) && onUpdateRoles) {
              onUpdateRoles(event.data.roles);
            }
            if (event.data.dailyChecks) {
              setDailyChecks(event.data.dailyChecks);
            } else {
              try {
                const saved = localStorage.getItem('class_roles_daily_checks');
                if (saved) setDailyChecks(JSON.parse(saved));
              } catch {}
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
      if (e.key === 'class_dashboard_roles' && e.newValue && onUpdateRoles) {
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
      if (Array.isArray(e.detail?.roles) && onUpdateRoles) {
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

  // 오늘 실천 완료 학생 수 계산
  const todayCompletedCount = roles.reduce((acc, r) => {
    return (
      acc +
      r.currentStudentIds.filter((sid) => {
        const check = dailyChecks[sid]?.[todayDayName];
        return check === 'O' || (check !== 'X' && r.performanceScores?.[sid] === 100);
      }).length
    );
  }, 0);

  // Selected role for quick performance evaluation popup (요구사항 9)
  const [evalRole, setEvalRole] = useState<ClassRole | null>(null);

  // 1인 1역 학생 클릭 시 오늘 실천 완료(O) / 미실천(X) 토글 및 전체 동기화
  const handleToggleStudentRoleCheck = (roleId: string, studentId: number) => {
    const targetRole = roles.find((r) => r.id === roleId);
    const checkVal = dailyChecks[studentId]?.[todayDayName];
    const isCurrentlyDone = checkVal === 'O' || (checkVal !== 'X' && targetRole?.performanceScores?.[studentId] === 100);
    const nextIsCompleted = !isCurrentlyDone;
    const nextScore = nextIsCompleted ? 100 : 40;
    const nextCheck: 'O' | 'X' = nextIsCompleted ? 'O' : 'X';

    const updatedRoles = roles.map((r) => {
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

    if (onUpdateRoles) onUpdateRoles(updatedRoles);
    try {
      localStorage.setItem('class_dashboard_roles', JSON.stringify(updatedRoles));
    } catch {}

    const updatedDailyChecks: Record<string, Record<string, 'O' | '△' | 'X'>> = {
      ...dailyChecks,
      [studentId]: {
        ...(dailyChecks[studentId] || {}),
        [todayDayName]: nextCheck,
      },
    };
    setDailyChecks(updatedDailyChecks);
    try {
      localStorage.setItem('class_roles_daily_checks', JSON.stringify(updatedDailyChecks));
    } catch {}

    // 📡 BroadcastChannel 전송 (위젯/보조화면/모달 실시간 동기화)
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel('class_display_sync_channel');
        ch.postMessage({
          type: 'UPDATE_ROLES_DATA',
          roles: updatedRoles,
          dailyChecks: updatedDailyChecks,
          studentId,
          day: todayDayName,
          isCompleted: nextIsCompleted,
        });
        setTimeout(() => { try { ch.close(); } catch {} }, 1000);
      }
      window.dispatchEvent(new CustomEvent('class_roles_updated', {
        detail: { roles: updatedRoles, dailyChecks: updatedDailyChecks, studentId, day: todayDayName, isCompleted: nextIsCompleted }
      }));
      window.dispatchEvent(new Event('storage'));
    } catch {}

    const st = students.find((s) => s.id === studentId);
    onShowToast(`${st?.name || '학생'} (${todayDayName}요일): ${nextIsCompleted ? '👏 실천 완료 (O)' : '미실천 (X)'}`);
  };

  const handleUpdateStudentPerformance = (roleId: string, studentId: number, score: number) => {
    if (!onUpdateRoles) return;
    const updated = roles.map((r) => {
      if (r.id === roleId) {
        return {
          ...r,
          performanceScores: {
            ...(r.performanceScores || {}),
            [studentId]: score,
          },
        };
      }
      return r;
    });
    onUpdateRoles(updated);
    if (evalRole && evalRole.id === roleId) {
      setEvalRole({
        ...evalRole,
        performanceScores: {
          ...(evalRole.performanceScores || {}),
          [studentId]: score,
        },
      });
    }
    onShowToast(`🎯 실천 수준이 ${score}점으로 반영되었습니다.`);
  };

  return (
    <div className="w-full h-full p-4 sm:p-5 flex flex-col justify-between relative group">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-pink-50 dark:bg-[#101a2d] text-pink-600 dark:text-pink-400 border border-pink-100 dark:border-[#1e2c44] flex items-center justify-center font-bold text-sm shadow-xs">
            ✨
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">1인 1역</h3>
              <span className="text-[10px] bg-pink-100 dark:bg-[#1e1b4b] text-pink-700 dark:text-pink-300 font-extrabold px-2 py-0.5 rounded-full border border-pink-200 dark:border-[#3730a3]">
                {periodInfo.name || '활동 기간'}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons: 일일 평가, 기간 평가, 인쇄, 설정 (요구사항 9) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {onOpenStudentDisplay && (
            <button
              type="button"
              onClick={() => onOpenStudentDisplay('roles')}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:!bg-[#0c1424] dark:hover:!bg-[#142036] text-slate-700 dark:!text-slate-200 border border-slate-200/80 dark:!border-[#1e2c44] text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="보조 모니터로 1인 1역할 현황표 송출"
            >
              📺
            </button>
          )}

          {/* Daily Evaluation Button (요구사항 9) */}
          <button
            type="button"
            onClick={() => onOpenRolesModal('daily')}
            className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:!bg-[#0c1424] dark:hover:!bg-[#142036] text-amber-800 dark:!text-amber-300 text-xs font-bold transition-all shadow-xs flex items-center gap-1 border border-amber-200 dark:!border-[#1e2c44] cursor-pointer"
            title="일일 1인 1역할 실천 여부(O, △, X) 체크"
          >
            <Calendar className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>일일 평가</span>
          </button>

          {/* Period Evaluation Button (요구사항 9) */}
          <button
            type="button"
            onClick={() => onOpenRolesModal('eval')}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:!bg-[#0c1424] dark:hover:!bg-[#142036] text-emerald-800 dark:!text-emerald-300 text-xs font-bold transition-all shadow-xs flex items-center gap-1 border border-emerald-200 dark:!border-[#1e2c44] cursor-pointer"
            title="기간별 종합 점수 및 생기부 피드백"
          >
            <Award className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>기간 평가</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenRolesModal('print');
              onShowToast('🖨️ 1인 1역할표 및 평가표 A4 인쇄 화면으로 이동합니다.');
            }}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:!bg-[#0c1424] dark:hover:!bg-[#142036] text-slate-700 dark:!text-slate-200 border border-slate-200/80 dark:!border-[#1e2c44] text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
            title="A4 인쇄 화면으로 이동"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">A4 인쇄</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenRolesModal('roles')}
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-pink-50 text-pink-700 hover:bg-pink-100 dark:!bg-[#0c1424] dark:hover:!bg-[#142036] dark:!text-pink-300 border border-pink-200/80 dark:!border-[#1e2c44] text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="1인 1역할 상세 관리 및 배정"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>설정</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3 space-y-1">
        <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
          <span>배정 및 실천현황</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-pink-600 dark:text-pink-400">배정 {assignPercent}% ({assignedCount}/{totalStudents}명)</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">· 오늘 실천 {todayCompletedCount}명</span>
          </div>
        </div>
        <div className="w-full bg-slate-100 dark:!bg-[#070c18] border border-transparent dark:!border-[#1e2c44] h-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-pink-500 to-rose-400 rounded-full transition-all duration-500"
            style={{ width: `${assignPercent}%` }}
          />
        </div>
      </div>

      {/* Progress Cards (오늘 실천 카드 추가) */}
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        <div className="p-1.5 bg-blue-50/70 dark:!bg-[#0c1424] border border-blue-100 dark:!border-[#1e2c44] rounded-2xl text-center shadow-xs">
          <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400">총 학생</div>
          <div className="text-sm font-black text-blue-900 dark:text-blue-100 tabular-nums">{totalStudents}명</div>
        </div>
        <div className="p-1.5 bg-indigo-50/70 dark:!bg-[#0c1424] border border-indigo-100 dark:!border-[#1e2c44] rounded-2xl text-center shadow-xs">
          <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">배정 완료</div>
          <div className="text-sm font-black text-indigo-900 dark:text-indigo-100 tabular-nums">{assignedCount}명</div>
        </div>
        <div className="p-1.5 bg-amber-50/70 dark:!bg-[#0c1424] border border-amber-100 dark:!border-[#1e2c44] rounded-2xl text-center shadow-xs">
          <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400">대기 명단</div>
          <div className="text-sm font-black text-amber-900 dark:text-amber-100 tabular-nums">{unassignedCount}명</div>
        </div>
        <div className="p-1.5 bg-emerald-50/90 dark:!bg-[#0c1424] border-2 border-emerald-300 dark:!border-emerald-600/70 rounded-2xl text-center shadow-xs">
          <div className="text-[10px] font-black text-emerald-700 dark:text-emerald-300">오늘 실천</div>
          <div className="text-sm font-black text-emerald-950 dark:text-emerald-100 tabular-nums">{todayCompletedCount}명</div>
        </div>
      </div>

      {/* Quick Action Bar: Smart Auto-Assign and Daily Evaluation (요구사항 6, 10) */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          type="button"
          onClick={() => onAutoAssign(true)}
          className="py-2.5 px-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-2xl text-xs font-black shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          title="성별 및 과거 역할 이력을 고려하여 남은 학생 또는 전체 학생에게 역할을 균형있게 자동 배정합니다"
        >
          <Sparkles className="w-4 h-4" />
          <span>자동배정</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenRolesModal('daily')}
          className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 dark:!bg-[#0c1424] dark:hover:!bg-[#142036] text-amber-900 dark:!text-amber-300 border border-amber-300/80 dark:!border-[#1e2c44] rounded-2xl text-xs font-black transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          title="오늘 요일별 1인 1역할 실천표를 열고 O/△/X를 평가합니다"
        >
          <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>📅 일일 실천 평가</span>
        </button>
      </div>

      {/* Role list summary: Boxed Name Shapes inside Role Container + Red-to-Blue Performance Bar (요구사항 9) */}
      <div className="bg-slate-50/80 dark:!bg-[#070c18] rounded-2xl p-2.5 flex-1 min-h-0 overflow-y-auto custom-scroll border border-slate-100 dark:!border-[#1e2c44] space-y-2">
        {roles.map((role) => {
          const assignedMembers = role.currentStudentIds
            .map((sid) => students.find((s) => s.id === sid))
            .filter((s): s is Student => !!s);

          const isFull = role.currentStudentIds.length >= role.maxCount;
          const restDay = !checksToday(role);

          return (
            <div
              key={role.id}
              onClick={() => setEvalRole(role)}
              className="p-3 bg-white dark:!bg-[#0c1424] rounded-2xl border border-slate-200/80 dark:!border-[#1e2c44] hover:border-pink-300 dark:hover:border-pink-500/50 hover:shadow-xs transition-all flex flex-col gap-2 cursor-pointer group/role"
              title="클릭하여 학생별 실천 수준(상/중/하 점수)을 평가하세요"
            >
              {/* Role Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100 break-keep group-hover/role:text-pink-600 dark:group-hover/role:text-pink-400 transition-colors">
                    {role.title}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${
                      isStrictRole(role)
                        ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                        : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                    }`}
                  >
                    {scheduleLabel(role, true)}
                  </span>
                  {restDay && (
                    <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold px-1.5 py-0.5 rounded-md" title="오늘은 검사하지 않는 날이에요">
                      오늘 쉬는 날
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-pink-500 dark:text-pink-400 font-bold opacity-0 group-hover/role:opacity-100 transition-opacity">
                    수준 평가 ✎
                  </span>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full tabular-nums border ${
                      isFull
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
                    }`}
                  >
                    {role.currentStudentIds.length}/{role.maxCount}
                  </span>
                </div>
              </div>

              {/* Boxed Name Shapes placed INSIDE Role Container (요구사항 9) */}
              <div className="flex flex-wrap gap-2 pt-0.5">
                {assignedMembers.length === 0 ? (
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium italic">
                    담당 학생 없음 (클릭하여 배정)
                  </span>
                ) : (
                  assignedMembers.map((student) => {
                    const score = role.performanceScores?.[student.id];
                    const checkVal = dailyChecks[student.id]?.[todayDayName];
                    const isCompleted = checkVal === 'O' || (checkVal !== 'X' && score === 100);

                    return (
                      <div
                        key={student.id}
                        className="flex flex-col min-w-[72px] max-w-[115px]"
                      >
                        {/* Boxed Text Shape (네모 박스형) - 보조화면 터치 시 실시간 동기화 및 직접 클릭 토글 지원 */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStudentRoleCheck(role.id, student.id);
                          }}
                          className={`px-2 py-1 rounded-lg text-xs font-black flex items-center justify-between gap-1 shadow-2xs transition-all cursor-pointer active:scale-95 text-left select-none ${
                            isCompleted
                              ? 'bg-emerald-50 dark:bg-emerald-950/80 border-2 border-emerald-400 dark:border-emerald-500 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-300/50'
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#101a2d] dark:hover:bg-[#16233b] border border-slate-300 dark:border-[#1e2c44] text-slate-800 dark:text-slate-200'
                          }`}
                          title={`${student.name} 클릭 시 오늘 1인 1역 실천 완료(O)/미실천(X) 토글`}
                        >
                          <span className="truncate">{student.name}</span>
                          {isCompleted ? (
                            <span className="text-[9px] font-black bg-emerald-500 text-white px-1.5 py-0.2 rounded-md shrink-0 flex items-center gap-0.5 shadow-2xs">
                              ✓ 완료
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 shrink-0">
                              미실천(X)
                            </span>
                          )}
                        </button>

                        {/* Performance Bar under Name Box */}
                        <div
                          className="w-full bg-slate-200 dark:bg-[#070c18] border border-transparent dark:border-[#1e2c44] h-1.5 rounded-full mt-1 overflow-hidden"
                          title={`${student.name} ${isCompleted ? '오늘 실천 완료 (100%)' : '오늘 미실천 (X)'}`}
                        >
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isCompleted
                                ? 'bg-emerald-500 w-full'
                                : 'bg-slate-300 dark:bg-slate-700 w-[15%]'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Action: 1인 1역할 점검 버튼 (요구사항 4-나) */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => onOpenRolesModal('daily')}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-pink-500 via-rose-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white rounded-2xl text-xs font-black shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer"
          title="오늘의 1인 1역할 수행 여부를 확인하고 점검합니다"
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>📋 1인 1역할 점검</span>
        </button>
      </div>

      {/* Modal / Popup: Performance Level Selection Dialog (격자모드 카드 갇힘 방지: createPortal로 전체 화면 최상단 레이어 송출) */}
      {evalRole && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#0c1424] w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-[#1e2c44] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1e2c44]">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    [{evalRole.title}] 실천 수준 평가
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    학생별 실천 여부를 선택하면 이름 하단 바(빨강~파랑)에 즉시 반영됩니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEvalRole(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
              >
                닫기 ✕
              </button>
            </div>

            {/* Quick Batch Action */}
            {evalRole.currentStudentIds.length > 0 && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    evalRole.currentStudentIds.forEach((sid) => {
                      handleUpdateStudentPerformance(evalRole.id, sid, 100);
                    });
                    onShowToast(`👏 [${evalRole.title}] 학생 전원이 'O (우수)'로 평가되었습니다.`);
                  }}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-[#101a2d] dark:hover:bg-[#16233b] text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-[#1e2c44] rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>전원 O (우수) 일괄 적용</span>
                </button>
              </div>
            )}

            {/* Students List in this role */}
            <div className="space-y-3">
              {evalRole.currentStudentIds.length === 0 ? (
                <div className="p-4 bg-slate-50 dark:bg-[#070c18] rounded-2xl text-center text-xs text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-[#1e2c44]">
                  현재 이 역할에 배정된 학생이 없습니다. [설정]에서 학생을 먼저 배정해주세요.
                </div>
              ) : (
                evalRole.currentStudentIds.map((sid) => {
                  const st = students.find((s) => s.id === sid);
                  if (!st) return null;
                  const currentScore = evalRole.performanceScores?.[sid] ?? 80;

                  return (
                    <div
                      key={sid}
                      className="p-3.5 bg-slate-50 dark:bg-[#070c18] rounded-2xl border border-slate-200 dark:border-[#1e2c44] space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 bg-white dark:bg-[#101a2d] border border-slate-300 dark:border-[#1e2c44] rounded-lg font-black text-xs text-slate-800 dark:text-slate-200 shadow-2xs">
                            {st.name}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                            번호: {st.number}번
                          </span>
                        </div>
                        <span
                          className={`font-mono text-xs font-black px-2 py-0.5 rounded-lg border ${
                            currentScore >= 85
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                              : currentScore >= 60
                              ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                              : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
                          }`}
                        >
                          {currentScore >= 85
                            ? 'O (우수 · 100점)'
                            : currentScore >= 60
                            ? '△ (보통 · 70점)'
                            : 'X (노력 · 40점)'}
                        </span>
                      </div>

                      {/* Performance Bar Preview (Red to Blue) */}
                      <div className="w-full bg-slate-200 dark:bg-[#101a2d] border border-transparent dark:border-[#1e2c44] h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-blue-600 rounded-full transition-all duration-300"
                          style={{ width: `${currentScore}%` }}
                        />
                      </div>

                      {/* Three Primary Action Buttons: O (우수) / △ (보통) / X (노력) (요구사항 10) */}
                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateStudentPerformance(evalRole.id, sid, 100)}
                          className={`py-2 px-2 rounded-xl border text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 ${
                            currentScore >= 85
                              ? 'bg-emerald-500 text-white border-emerald-600 ring-2 ring-emerald-300 shadow-sm'
                              : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-[#101a2d] dark:hover:bg-[#16233b] text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-[#1e2c44]'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          <span>O (우수)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateStudentPerformance(evalRole.id, sid, 70)}
                          className={`py-2 px-2 rounded-xl border text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 ${
                            currentScore >= 60 && currentScore < 85
                              ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-300 shadow-sm'
                              : 'bg-amber-50 hover:bg-amber-100 dark:bg-[#101a2d] dark:hover:bg-[#16233b] text-amber-800 dark:text-amber-300 border-amber-200 dark:border-[#1e2c44]'
                          }`}
                        >
                          <span>△ (보통)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateStudentPerformance(evalRole.id, sid, 40)}
                          className={`py-2 px-2 rounded-xl border text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 ${
                            currentScore < 60
                              ? 'bg-rose-500 text-white border-rose-600 ring-2 ring-rose-300 shadow-sm'
                              : 'bg-rose-50 hover:bg-rose-100 dark:bg-[#101a2d] dark:hover:bg-[#16233b] text-rose-700 dark:text-rose-300 border-rose-200 dark:border-[#1e2c44]'
                          }`}
                        >
                          <X className="w-3 h-3" />
                          <span>X (노력)</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-[#1e2c44] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setEvalRole(null);
                  onOpenRolesModal('daily');
                }}
                className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline"
              >
                📅 일일 실천표 전체 보기 →
              </button>
              <button
                type="button"
                onClick={() => setEvalRole(null)}
                className="px-4 py-1.5 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:bg-indigo-700 cursor-pointer shadow-xs"
              >
                완료
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
