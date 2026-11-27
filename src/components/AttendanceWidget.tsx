import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Copy,
  Check,
  AlertCircle,
  Edit3,
  Sparkles,
  Smile,
  HeartPulse,
  LogOut,
  CheckCheck,
  Filter,
  CloudUpload,
  Monitor,
} from 'lucide-react';
import { Student, AttendanceStatus, AttendanceReasonCategory } from '../types';
import { playSelectedChime } from '../utils/audio';
import { AttendanceDetailModal, AttendanceDetailSavePayload } from './AttendanceDetailModal';

interface AttendanceWidgetProps {
  students: Student[];
  onUpdateStudentAttendance: (
    studentId: number,
    status: AttendanceStatus,
    reasonCategory?: AttendanceReasonCategory,
    reasonNote?: string,
    earlyPeriod?: string,
    longTermRange?: { start: string; end: string }
  ) => void;
  onShowToast: (msg: string) => void;
  googleSheetUrl?: string;
  autoBackupTime?: string; // ⏰ 출결 일일 자동 백업 시간 (기본값: "16:00")
  onOpenDualMonitor?: (tab?: string) => void;
  /** 🔄 모두 미등교로 되돌리기 (매일 08:00에도 자동) */
  onResetAttendance?: () => void;
}

export const AttendanceWidget: React.FC<AttendanceWidgetProps> = ({
  students: propStudents,
  onUpdateStudentAttendance,
  onShowToast,
  googleSheetUrl,
  autoBackupTime,
  onOpenDualMonitor,
  onResetAttendance,
}) => {
  // 학생 목록 로컬 상태 (상세 사유 및 세부 메모 즉시 반영)
  // 번호순으로 정렬해서 보여 줌
  const byNumber = (list: Student[]) => [...list].sort((a, b) => (a.number ?? 999) - (b.number ?? 999) || a.name.localeCompare(b.name, 'ko'));
  const [students, setStudentsRaw] = useState<Student[]>(() => byNumber(propStudents));
  const setStudents = (v: Student[] | ((prev: Student[]) => Student[])) =>
    setStudentsRaw((prev) => byNumber(typeof v === 'function' ? (v as (p: Student[]) => Student[])(prev) : v));

  useEffect(() => {
    setStudentsRaw(byNumber(propStudents));
  }, [propStudents]);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<AttendanceStatus | 'all'>('all');
  const [isCopied, setIsCopied] = useState(false);
  const [isTouchMode, setIsTouchMode] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Reason editing modal state
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingStatus, setEditingStatus] = useState<AttendanceStatus>('absent');

  // Statistics
  const total = students.length;
  const present = students.filter((s) => s.attendance === 'present').length;
  const absent = students.filter((s) => s.attendance === 'absent');
  const late = students.filter((s) => s.attendance === 'late');
  const early = students.filter((s) => s.attendance === 'early');
  const nurse = students.filter((s) => s.attendance === 'nurse');

  const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 100;

  // ⏰ 사용자 설정 일일 자동 백업 시간 추출 (기본값: "16:00")
  const getEffectiveBackupTime = () => {
    if (autoBackupTime && autoBackupTime.trim()) {
      return autoBackupTime.trim();
    }
    try {
      const savedConfig = localStorage.getItem('class_dashboard_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        if (parsed.attendanceAutoBackupTime && parsed.attendanceAutoBackupTime.trim()) {
          return parsed.attendanceAutoBackupTime.trim();
        }
      }
    } catch {}
    return '16:00';
  };
  const effectiveBackupTime = getEffectiveBackupTime();

  // ☁️ 구글 시트 웹앱 URL 추출 (prop 우선, 없으면 localStorage 탐색, 없으면 기본 배포 URL)
  const getAttendanceSheetUrl = () => {
    if (googleSheetUrl && googleSheetUrl.trim().startsWith('http')) {
      return googleSheetUrl.trim();
    }
    try {
      const savedConfig = localStorage.getItem('class_dashboard_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        if (parsed.attendanceGoogleSheetUrl && parsed.attendanceGoogleSheetUrl.trim().startsWith('http')) {
          return parsed.attendanceGoogleSheetUrl.trim();
        }
      }
    } catch {}
    return ''; // 🛡️ 기본 배포 URL 제거: 선생님이 직접 설정한 시트로만 전송
  };

  // ☁️ 출결 구글 시트 백업 발송 핸들러 (수동 및 설정 시간 자동 공용)
  const handleBackupToGoogleSheet = (isAuto = false) => {
    const sheetUrl = getAttendanceSheetUrl();
    if (!sheetUrl) {
      if (!isAuto) {
        onShowToast('⚠️ 메인 환경설정에서 [출결 관리 구글 시트 자동 백업 URL]을 먼저 설정해 주세요.');
      }
      return;
    }

    setIsBackingUp(true);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // 매월 마지막 날인지 자동 판별 (내일이 1일이면 오늘은 월말!)
    const nextDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const isMonthEnd = nextDay.getDate() === 1;

    const selectedDate = todayStr;
    const payload = {
      action: 'backup_daily',
      date: selectedDate,
      isMonthEnd,
      records: students.map((s, idx) => {
        const studentNum = s.number ?? (idx + 1);
        const studentName = s.name;
        const statusKorean =
          s.status ||
          (s.attendance === 'present'
            ? '출석'
            : s.attendance === 'absent'
            ? '결석'
            : s.attendance === 'late'
            ? '지각'
            : s.attendance === 'early'
            ? '조퇴'
            : s.attendance === 'nurse'
            ? '보건실'
            : '출석');

        const reasonCat = s.reasonCategory || s.attendanceReasonCategory || '';
        const rawMemo = (
          s.reasonDetail ||
          s.memo ||
          s.attendanceReasonDetail ||
          s.attendanceNote ||
          s.note ||
          ''
        ).trim();

        // 조퇴 교시 정보 (예: "4교시 후")
        const earlyPeriod = s.earlyPeriod || '';

        // 장기 결석 기간 정보 (예: "2026-10-07 ~ 2026-10-09")
        const isLongTerm = !!s.longTermRange;
        const longTermStr =
          s.longTermRange?.start && s.longTermRange?.end
            ? `${s.longTermRange.start} ~ ${s.longTermRange.end}`
            : '';

        // 상세 내용 문자열 스마트 조합 (조퇴 교시, 장기 기간, 세부 메모 통합)
        const detailParts: string[] = [];
        if (s.attendance === 'early' && earlyPeriod) {
          detailParts.push(`[${earlyPeriod}]`);
        }
        if (s.attendance === 'absent' && isLongTerm) {
          detailParts.push(longTermStr ? `[장기: ${longTermStr}]` : '[장기]');
        }
        if (rawMemo) {
          detailParts.push(rawMemo);
        }

        const fullDetailText = detailParts.join(' ').trim();

        return {
          date: selectedDate,
          number: studentNum,
          studentName,
          status: statusKorean,
          attendance: s.attendance,
          reasonCategory: reasonCat,
          // 구글 시트 Apps Script의 모든 후보 키에 빈틈없이 매핑하여 전달
          reasonDetail: fullDetailText,
          memo: fullDetailText,
          detail: fullDetailText,
          detailMemo: fullDetailText,
          reasonNote: fullDetailText,
          attendanceNote: fullDetailText,
          attendanceReasonDetail: fullDetailText,
          customMemo: fullDetailText,
          earlyPeriod,
          longTermRange: s.longTermRange || null,
          isLongTerm,
          studentId: s.id,
          studentNumber: studentNum,
        };
      }),
      timestamp: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
    };

    console.log('🔵 [출결 백업 전송 데이터]:', payload);

    fetch(sheetUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    })
      .then(() => {
        setIsBackingUp(false);
        try {
          localStorage.setItem('attendance_last_backup_date', todayStr);
        } catch {}
        console.log('🟢 [출결 백업 성공] 구글 시트로 백업 데이터가 정상 전송되었습니다.');
        if (isAuto) {
          onShowToast(`☁️ [${effectiveBackupTime} 정기 자동 백업 완료] 출결 현황이 구글 시트에 안전하게 백업되었습니다.${isMonthEnd ? ' (📊 월말 통계 시트가 자동 생성되었습니다!)' : ''}`);
        } else {
          onShowToast(`🟢 출결 현황(상세 사유 포함)이 구글 시트에 성공적으로 백업(동기화)되었습니다!${isMonthEnd ? ' (📊 월말 통계 시트 자동 생성됨)' : ''}`);
        }
      })
      .catch((err) => {
        setIsBackingUp(false);
        console.error('🔴 [출결 백업 실패]:', err);
        if (!isAuto) {
          onShowToast('🟡 백업 요청을 보냈습니다. (CORS 상태 특성상 구글 시트에서 최신 반영 여부를 확인하세요)');
        }
      });
  };

  // ⏰ 사용자 설정 시간(기본 16:00) 자동 백업 타이머 (1분 주기 체크)
  useEffect(() => {
    const checkAutoBackup = () => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();

      const targetTime = getEffectiveBackupTime();
      const parts = targetTime.split(':').map((v: string) => parseInt(v, 10));
      const targetH = !isNaN(parts[0]) ? parts[0] : 16;
      const targetM = !isNaN(parts[1]) ? parts[1] : 0;

      // 설정된 시각(시:분) 도달 여부 판별
      const isReached = currentHours > targetH || (currentHours === targetH && currentMinutes >= targetM);

      if (isReached) {
        const todayStr = now.toISOString().split('T')[0];
        const lastBackup = localStorage.getItem('attendance_last_backup_date');
        if (lastBackup !== todayStr) {
          const sheetUrl = getAttendanceSheetUrl();
          if (sheetUrl) {
            handleBackupToGoogleSheet(true);
          }
        }
      }
    };

    checkAutoBackup();
    const interval = setInterval(checkAutoBackup, 60000); // 1분 주기
    return () => clearInterval(interval);
  }, [students, autoBackupTime]);



  // Touch Attendance Handler (등교 터치 모드)
  const handleStudentTouch = (student: Student) => {
    if (student.attendance === 'present') {
      onShowToast(`👋 ${student.name} 학생은 이미 출석 완료 상태입니다.`);
      return;
    }

    onUpdateStudentAttendance(student.id, 'present');
    playSelectedChime('bell_ding');
    onShowToast(`✨ 어서 와, ${student.name}아! 오늘도 즐겁고 행복한 하루 보내자! 🎒`);
  };

  // Open Detailed Reason Editor Modal (요구사항 11)
  const openReasonEditor = (student: Student, defaultStatus?: AttendanceStatus) => {
    const status = defaultStatus || student.status || student.attendance;
    setEditingStudent(student);
    setEditingStatus(status);
  };

  // Direct 1-Click Status Handler
  const handleDirectStatusChange = (student: Student, newStatus: AttendanceStatus) => {
    if (newStatus === 'present') {
      setStudents((prev) =>
        prev.map((s) =>
          s.id === student.id
            ? {
                ...s,
                status: 'present',
                attendance: 'present',
                reasonCategory: undefined,
                attendanceReasonCategory: undefined,
                reasonDetail: '',
                memo: '',
                attendanceNote: '',
                attendanceReasonDetail: '',
                earlyPeriod: undefined,
                longTermRange: undefined,
              }
            : s
        )
      );
      onUpdateStudentAttendance(student.id, 'present', undefined, undefined, undefined, undefined);
      onShowToast(`✅ ${student.name} 학생이 출석 처리되었습니다.`);
    } else {
      // Open modal to specify details easily with buttons
      openReasonEditor(student, newStatus);
    }
  };

  // Save detailed reason with buttons (요구사항 11 & 세부 사유 메모 버그 수정)
  const handleModalSave = (updatedData: AttendanceDetailSavePayload) => {
    if (!editingStudent) return;
    const memoText = (updatedData.reasonDetail || updatedData.memo || '').trim();

    // 학생 리스트 업데이트 시 (누락 방지)
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === updatedData.studentId || (updatedData.number !== undefined && s.number === updatedData.number)) {
          return {
            ...s,
            status: updatedData.status,
            attendance: updatedData.status,
            reasonCategory: updatedData.reasonCategory,
            attendanceReasonCategory: updatedData.reasonCategory,
            reasonDetail: memoText,
            memo: memoText,
            detail: memoText,
            attendanceNote: memoText,
            attendanceReasonDetail: memoText,
            earlyPeriod: updatedData.earlyPeriod,
            longTermRange: updatedData.longTermRange,
          };
        }
        return s;
      })
    );

    // 부모 컴포넌트(App.tsx) 글로벌 상태 갱신
    onUpdateStudentAttendance(
      updatedData.studentId,
      updatedData.status,
      updatedData.reasonCategory,
      memoText,
      updatedData.earlyPeriod,
      updatedData.longTermRange
    );

    const detailTag =
      updatedData.status === 'early' && updatedData.earlyPeriod
        ? ` (${updatedData.earlyPeriod})`
        : updatedData.status === 'absent' && updatedData.longTermRange
        ? ` (${updatedData.longTermRange.start}~${updatedData.longTermRange.end})`
        : '';
    onShowToast(`📋 ${editingStudent.name} 학생의 [${updatedData.reasonCategory} ${updatedData.status}]${detailTag}이 반영되었습니다.`);
    setEditingStudent(null);
  };

  // Batch All Present Handler
  const handleMarkAllPresent = () => {
    students.forEach((s) => {
      onUpdateStudentAttendance(s.id, 'present');
    });
    playSelectedChime('tada');
    onShowToast(`🎉 학급 전체 학생(${students.length}명)이 전원 출석 처리되었습니다!`);
  };

  // Copy Summary Formatted for NEIS
  const handleCopySummary = () => {
    const todayStr = new Date().toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
    let text = `[${todayStr} 출결 및 나이스 일일 집계]\n총원 ${total}명 (출석 ${present}명, 출석률 ${attendanceRate}%)\n`;

    if (absent.length > 0) {
      text += `• 결석 (${absent.length}명): ${absent
        .map((s) => {
          const range = s.longTermRange ? ` [${s.longTermRange.start}~${s.longTermRange.end}]` : '';
          const noteText = s.reasonDetail || s.memo || s.note || s.attendanceReasonDetail || s.attendanceNote || '';
          const note = noteText ? ` - ${noteText}` : '';
          return `${s.name}(${s.reasonCategory || s.attendanceReasonCategory || '질병'}${range}${note})`;
        })
        .join(', ')}\n`;
    }
    if (late.length > 0) {
      text += `• 지각 (${late.length}명): ${late
        .map((s) => {
          const noteText = s.reasonDetail || s.memo || s.note || s.attendanceReasonDetail || s.attendanceNote || '';
          return `${s.name}(${s.reasonCategory || s.attendanceReasonCategory || '지각'}${noteText ? ` - ${noteText}` : ''})`;
        })
        .join(', ')}\n`;
    }
    if (early.length > 0) {
      text += `• 조퇴 (${early.length}명): ${early
        .map((s) => {
          const noteText = s.reasonDetail || s.memo || s.note || s.attendanceReasonDetail || s.attendanceNote || '';
          return `${s.name}(${s.reasonCategory || s.attendanceReasonCategory || '질병'} - ${s.earlyPeriod || '조퇴'}${noteText ? ` / ${noteText}` : ''})`;
        })
        .join(', ')}\n`;
    }
    if (nurse.length > 0) {
      text += `• 보건실 (${nurse.length}명): ${nurse.map((s) => s.name).join(', ')}\n`;
    }
    if (absent.length === 0 && late.length === 0 && nurse.length === 0 && early.length === 0) {
      text += '• 전원 출석 완료 (특이사항 없음)\n';
    }

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    onShowToast('📋 나이스 및 교무일지용 출결 현황이 클립보드에 복사되었습니다.');
    setTimeout(() => setIsCopied(false), 2500);
  };

  // Filter students based on selection
  const filteredStudents = students.filter((s) => {
    if (selectedStatusFilter === 'all') return true;
    return s.attendance === selectedStatusFilter;
  });

  return (
    <div className="w-full h-full p-4 sm:p-5 flex flex-col justify-between relative group overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">출결 관리</h3>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-transparent dark:border-emerald-800/50 font-extrabold px-2 py-0.5 rounded-full">
                출석률 {attendanceRate}%
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">원클릭 버튼식 출결 &amp; 조퇴/장기결석 사유 입력</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Quick Mark All Present */}
          <button
            onClick={handleMarkAllPresent}
            className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            title="학급 전원 출석 완료로 일괄 체크"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>전원 출석</span>
          </button>

          {/* 🔄 출석 리셋 — 모두 '미등교'로 (매일 08:00에는 자동으로 한 번) */}
          {onResetAttendance && (
            <button
              onClick={() => {
                if (window.confirm('오늘 출석을 모두 미등교로 되돌릴까요?\n(장기 결석 학생은 그대로 둬요. 매일 아침 8시에는 자동으로 되돌려져요.)')) onResetAttendance();
              }}
              className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              title="출석을 모두 미등교로 되돌려요 (매일 08:00 자동)"
              data-attendance-reset
            >
              <span>🔄</span>
              <span>출석 리셋</span>
            </button>
          )}

          {/* Electronic Board Touch Mode Toggle */}
          <button
            onClick={() => setIsTouchMode(!isTouchMode)}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${
              isTouchMode
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
            }`}
            title="학생들이 등교하여 자신의 이름을 터치하면 즉시 출석 완료!"
          >
            <Smile className="w-3.5 h-3.5" />
            <span>등교 터치 {isTouchMode ? 'ON' : 'OFF'}</span>
          </button>

          {/* 보조화면(전자칠판) 출결 모드 열기 버튼 */}
          {onOpenDualMonitor && (
            <button
              onClick={() => onOpenDualMonitor('attendance')}
              className="px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer border bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/80 shadow-2xs"
              title="전자칠판/보조 모니터에 좌석 배치 기반 등교 터치 및 아침활동 화면 띄우기"
            >
              <Monitor className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>보조창 송출</span>
            </button>
          )}

          <button
            onClick={handleCopySummary}
            className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer border border-slate-200 dark:border-slate-700"
            title="나이스/교무일지용 출결 텍스트 복사"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* 구글 시트 백업 버튼 */}
          <button
            onClick={() => handleBackupToGoogleSheet(false)}
            disabled={isBackingUp}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${
              isBackingUp
                ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-400 border-blue-200 dark:border-blue-900 cursor-not-allowed'
                : 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60 shadow-2xs'
            }`}
            title={`출결 기록을 구글 스프레드시트에 즉시 백업 (매일 ${effectiveBackupTime} 자동 백업 및 중복 방지 작동 중)`}
          >
            <CloudUpload className={`w-3.5 h-3.5 ${isBackingUp ? 'animate-bounce' : 'text-blue-600 dark:text-blue-400'}`} />
            <span>{isBackingUp ? '백업 중...' : '시트 백업'}</span>
          </button>
        </div>
      </div>

      {/* Attendance Statistics Filter Chips (요구사항 11) */}
      <div className="bg-white/60 dark:bg-[#0c1424]/80 p-2.5 rounded-2xl border border-slate-200/60 dark:border-[#1e2c44] mb-3 space-y-2 backdrop-blur-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedStatusFilter('all')}
              className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                selectedStatusFilter === 'all'
                  ? 'bg-slate-800 dark:bg-indigo-600 text-white shadow-2xs font-black'
                  : 'bg-white dark:bg-[#101a2d] text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-[#16233b] border border-slate-200 dark:border-[#1e2c44]'
              }`}
            >
              전체 {total}
            </button>
            <button
              onClick={() => setSelectedStatusFilter('present')}
              className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                selectedStatusFilter === 'present'
                  ? 'bg-emerald-600 text-white shadow-2xs font-black'
                  : 'bg-white dark:bg-[#101a2d] text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60'
              }`}
            >
              출석 {present}
            </button>
            <button
              onClick={() => setSelectedStatusFilter('absent')}
              className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                selectedStatusFilter === 'absent'
                  ? 'bg-rose-600 text-white shadow-2xs font-black'
                  : 'bg-white dark:bg-[#101a2d] text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60'
              }`}
            >
              결석 {absent.length}
            </button>
            <button
              onClick={() => setSelectedStatusFilter('late')}
              className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                selectedStatusFilter === 'late'
                  ? 'bg-amber-600 text-white shadow-2xs font-black'
                  : 'bg-white dark:bg-[#101a2d] text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60'
              }`}
            >
              지각 {late.length}
            </button>
            <button
              onClick={() => setSelectedStatusFilter('early')}
              className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                selectedStatusFilter === 'early'
                  ? 'bg-purple-600 text-white shadow-2xs font-black'
                  : 'bg-white dark:bg-[#101a2d] text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50 border border-purple-200 dark:border-purple-800/60'
              }`}
            >
              조퇴 {early.length}
            </button>
            <button
              onClick={() => setSelectedStatusFilter('nurse')}
              className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                selectedStatusFilter === 'nurse'
                  ? 'bg-blue-600 text-white shadow-2xs font-black'
                  : 'bg-white dark:bg-[#101a2d] text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60'
              }`}
            >
              보건 {nurse.length}
            </button>
          </div>
          <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px]">{present}/{total}명</span>
        </div>

        <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
          <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(present / total) * 100}%` }} />
          <div className="bg-rose-500 h-full transition-all" style={{ width: `${(absent.length / total) * 100}%` }} />
          <div className="bg-amber-500 h-full transition-all" style={{ width: `${(late.length / total) * 100}%` }} />
          <div className="bg-purple-500 h-full transition-all" style={{ width: `${(early.length / total) * 100}%` }} />
          <div className="bg-blue-500 h-full transition-all" style={{ width: `${(nurse.length / total) * 100}%` }} />
        </div>
      </div>

      {/* TOUCH MODE: Large Touch Buttons for Students */}
      {isTouchMode ? (
        <div className="space-y-2">
          <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-900 flex items-center justify-between">
            <span>✨ 등교한 학생은 자신의 이름을 터치하세요!</span>
            <span className="text-[10px] text-emerald-700">실시간 반영 중</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 flex-1 min-h-0 overflow-y-auto custom-scroll p-1">
            {students.map((s) => {
              const isP = s.attendance === 'present';
              return (
                <button
                  key={s.id}
                  onClick={() => handleStudentTouch(s)}
                  className={`py-2.5 px-2 rounded-2xl font-black text-xs transition-all active:scale-90 cursor-pointer flex flex-col items-center justify-center gap-0.5 border shadow-xs ${
                    isP
                      ? 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-200'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span className="text-[10px] opacity-70 font-mono">{s.number}번</span>
                  <span className="text-xs sm:text-sm truncate">{s.name}</span>
                  <span className="text-[9px] mt-0.5">{isP ? '출석 완료' : '미등교'}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* BUTTON-BASED STUDENT ROSTER (요구사항 11) */
        <div className="space-y-2 flex-1 min-h-0 overflow-y-auto custom-scroll pr-1">
          {filteredStudents.map((s) => {
            const isP = s.attendance === 'present';
            return (
              <div
                key={s.id}
                className="p-2.5 rounded-2xl bg-slate-50 dark:bg-[#0c1424] hover:bg-slate-100/90 dark:hover:bg-[#142036] border border-slate-200/80 dark:border-[#1e2c44] transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                {/* Left info: Number, Name, Badges */}
                <div className="flex items-center gap-2 min-w-[130px]">
                  <span className="font-mono text-slate-400 dark:text-slate-400 font-black w-5 text-center">
                    {s.number}
                  </span>
                  <span className="font-black text-slate-800 dark:text-white text-xs">
                    {s.name}
                  </span>
                  {s.gender && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-400">
                      ({s.gender === 'M' ? '남' : '여'})
                    </span>
                  )}
                  {/* Status detail badges */}
                  {!isP && (
                    <span
                      className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs max-w-[200px] truncate"
                      title={(s.reasonDetail || s.memo || s.note || s.attendanceReasonDetail || s.attendanceNote) ? `${s.reasonCategory || s.attendanceReasonCategory || '사유'}: ${s.reasonDetail || s.memo || s.note || s.attendanceReasonDetail || s.attendanceNote}` : undefined}
                    >
                      {s.reasonCategory || s.attendanceReasonCategory || '사유미입력'}
                      {s.earlyPeriod && ` (${s.earlyPeriod})`}
                      {s.longTermRange && ` (${s.longTermRange.start}~${s.longTermRange.end})`}
                      {(s.reasonDetail || s.memo || s.note || s.attendanceReasonDetail || s.attendanceNote) && ` - ${s.reasonDetail || s.memo || s.note || s.attendanceReasonDetail || s.attendanceNote}`}
                    </span>
                  )}
                </div>

                {/* Right: Direct 1-Tap Status Buttons (요구사항: 출석,결석,지각,조퇴,보건 한줄 정렬) */}
                <div className="flex items-center gap-1 flex-nowrap shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDirectStatusChange(s, 'present')}
                    className={`px-1.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer border shrink-0 ${
                      s.attendance === 'present'
                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    출석
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDirectStatusChange(s, 'absent')}
                    className={`px-1.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer border shrink-0 ${
                      s.attendance === 'absent'
                        ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    결석
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDirectStatusChange(s, 'late')}
                    className={`px-1.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer border shrink-0 ${
                      s.attendance === 'late'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    지각
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDirectStatusChange(s, 'early')}
                    className={`px-1.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer border shrink-0 ${
                      s.attendance === 'early'
                        ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                        : 'bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    조퇴
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDirectStatusChange(s, 'nurse')}
                    className={`px-1.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer border shrink-0 ${
                      s.attendance === 'nurse'
                        ? 'bg-blue-500 text-white border-blue-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    보건
                  </button>

                  {/* Detail Reason Edit Button */}
                  {!isP && (
                    <button
                      type="button"
                      onClick={() => openReasonEditor(s)}
                      className="p-1 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer ml-0.5"
                      title="상세 사유 / 조퇴 교시 / 장기결석 기간 수정"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAILED ATTENDANCE MODAL */}
      {editingStudent && (
        <AttendanceDetailModal
          student={editingStudent}
          initialStatus={editingStatus}
          onClose={() => setEditingStudent(null)}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
};
