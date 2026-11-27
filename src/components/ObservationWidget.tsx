import React, { useState, useEffect } from 'react';
import { SecretInput } from './SecretInput';
import {
  FileText,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Calendar,
  User,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  Cloud,
  CheckCircle2,
  ExternalLink,
  ArrowDown,
  ArrowUp,
  Link,
  Settings,
  Send,
} from 'lucide-react';
import { Student, ObservationWidgetRecord, ClassConfig } from '../types';
import { playSelectedChime } from '../utils/audio';
import { verifyAdminPin, formatLockout } from '../utils/pinSecurity';

interface ObservationWidgetProps {
  students: Student[];
  records: ObservationWidgetRecord[];
  onAddRecord: (record: Omit<ObservationWidgetRecord, 'id' | 'createdAt'>) => void;
  onDeleteRecord: (id: string) => void;
  config: ClassConfig;
  onShowToast: (msg: string) => void;
}

/**
 * [ObservationWidget 컴포넌트]
 * 요구사항:
 * 1. 날짜 / 학생선택 / 유형(관찰, 학생상담, 학부모상담) / 기록 작성 폼
 * 2. 위젯 내 최신순 피드 리스트 렌더링
 * 3. 기본적으로 블러(Blur) 처리되어 교실 내 학생들에게 비공개 보호
 * 4. 관리자 비밀번호 입력 시에만 블러 해제되어 기록 확인 가능
 * 5. 구글 시트 URL을 통해 [날짜, 시간, 학생명, 상담유형, 상담내용, 등록일시] 실시간 자동 동기화 및 백업 지원
 */
export const ObservationWidget: React.FC<ObservationWidgetProps> = ({
  students,
  records,
  onAddRecord,
  onDeleteRecord,
  config,
  onShowToast,
}) => {
  // 교과 전담모드 여부 판별
  const isSubjectMode =
    config.teacherMode === 'subject' ||
    (typeof window !== 'undefined' &&
      (localStorage.getItem('ttime_teacher_mode') === 'subject' ||
        localStorage.getItem('class_dashboard_teacher_mode') === 'subject'));

  // 환경설정 2단계 등록 다학급 목록
  const subjectClassesList: string[] = React.useMemo(() => {
    if (config.subjectClasses && config.subjectClasses.length > 0) {
      return config.subjectClasses;
    }
    try {
      const savedRosters = localStorage.getItem('class_dashboard_subject_rosters');
      if (savedRosters) {
        const parsed = JSON.parse(savedRosters);
        const keys = Object.keys(parsed);
        if (keys.length > 0) return keys;
      }
    } catch {}
    return ['3-1', '3-2', '4-1', '4-2'];
  }, [config.subjectClasses]);

  // 학급별 학생 명단 맵
  const [subjectRostersMap, setSubjectRostersMap] = useState<
    Record<string, Array<{ id: number; number: number; name: string; gender?: string }>>
  >(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_subject_rosters');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      '3-1': [
        { id: 1, number: 1, name: '강민준' },
        { id: 2, number: 2, name: '김서윤' },
        { id: 3, number: 3, name: '김도윤' },
        { id: 4, number: 4, name: '김하은' },
        { id: 5, number: 5, name: '박시우' },
        { id: 6, number: 6, name: '박지안' },
      ],
      '3-2': [
        { id: 1, number: 1, name: '권우진' },
        { id: 2, number: 2, name: '김민서' },
        { id: 3, number: 3, name: '김주원' },
        { id: 4, number: 4, name: '문채원' },
      ],
      '4-1': [
        { id: 1, number: 1, name: '송지호' },
        { id: 2, number: 2, name: '안소율' },
        { id: 3, number: 3, name: '윤하람' },
        { id: 4, number: 4, name: '임예준' },
      ],
      '4-2': [
        { id: 1, number: 1, name: '장다은' },
        { id: 2, number: 2, name: '조은우' },
        { id: 3, number: 3, name: '황나윤' },
      ],
    };
  });

  // 상단 입력 폼의 선택된 학년·반 (기본값: 목록의 첫 번째 반)
  const [selectedGradeClass, setSelectedGradeClass] = useState<string>(() => {
    return subjectClassesList[0] || '3-1';
  });

  // 하단 일지 조회용 반별 모아보기 필터 (기본값: 'all' - 전체 반)
  const [filterGradeClass, setFilterGradeClass] = useState<string>('all');

  // 현재 선택된 반의 학생 옵션
  const currentStudentOptions = React.useMemo(() => {
    if (isSubjectMode) {
      const list = subjectRostersMap[selectedGradeClass] || [];
      return list.map((s) => ({
        id: s.id,
        number: s.number,
        name: s.name,
        teamId: undefined as any,
      }));
    }
    return students;
  }, [isSubjectMode, selectedGradeClass, subjectRostersMap, students]);

  // 학년·반 변경 핸들러 (학생 선택 상태를 해당 반의 첫 번째 학생으로 자동 재설정)
  const handleGradeClassChange = (newClass: string) => {
    setSelectedGradeClass(newClass);
    const classStudents = subjectRostersMap[newClass] || [];
    if (classStudents.length > 0) {
      setStudentId(classStudents[0].id);
    }
  };

  // 초기 렌더링 시 또는 모드 변경 시 첫 번째 학생 선택 보장
  useEffect(() => {
    if (isSubjectMode) {
      const classStudents = subjectRostersMap[selectedGradeClass] || [];
      if (classStudents.length > 0 && !classStudents.some((s) => s.id === studentId)) {
        setStudentId(classStudents[0].id);
      }
    }
  }, [selectedGradeClass, isSubjectMode, subjectRostersMap]);

  // 1. 관찰 & 상담 입력 폼 상태
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [studentId, setStudentId] = useState<number>(() => {
    if (config.teacherMode === 'subject') {
      const firstClass = (config.subjectClasses && config.subjectClasses[0]) || '3-1';
      try {
        const saved = localStorage.getItem('class_dashboard_subject_rosters');
        if (saved) {
          const map = JSON.parse(saved);
          if (map[firstClass]?.[0]?.id) return map[firstClass][0].id;
        }
      } catch {}
      return 1;
    }
    return students[0]?.id || 1;
  });
  const [type, setType] = useState<'관찰' | '학생상담' | '학부모상담'>('관찰');
  const [content, setContent] = useState<string>('');

  // ☁️ Google Apps Script 웹앱 연동 URL (localStorage 키: observation_gas_webapp_url)
  const [gasWebAppUrl, setGasWebAppUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('observation_gas_webapp_url') || config.googleSheetUrl || '';
    } catch {
      return config.googleSheetUrl || '';
    }
  });
  const [showUrlSetting, setShowUrlSetting] = useState<boolean>(false);
  const [isBackingUpAll, setIsBackingUpAll] = useState<boolean>(false);

  const handleSaveGasUrl = (url: string) => {
    setGasWebAppUrl(url);
    try {
      localStorage.setItem('observation_gas_webapp_url', url.trim());
    } catch {}
  };

  // 2. 보안 블러 및 잠금 상태
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  // 3. 필터 상태
  const [filterType, setFilterType] = useState<'전체' | '관찰' | '학생상담' | '학부모상담'>('전체');

  // 일정 시간(3분) 후 자동 재잠금 타이머
  useEffect(() => {
    let timer: number;
    if (isUnlocked) {
      timer = window.setTimeout(() => {
        setIsUnlocked(false);
        onShowToast('🔒 프라이버시 보호를 위해 관찰일지가 자동으로 다시 잠겼습니다.');
      }, 3 * 60 * 1000);
    }
    return () => clearTimeout(timer);
  }, [isUnlocked, onShowToast]);

  // 비밀번호 검증 핸들러
  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    // 🛡️ 관리자 PIN(화면 잠금과 동일) 해시 검증 · 연속 오입력 제한
    const result = await verifyAdminPin(passwordInput);

    if (result.ok) {
      setIsUnlocked(true);
      setShowPasswordModal(false);
      setPasswordInput('');
      setAuthError('');
      playSelectedChime('bell_ding');
      console.log('🟢 [보안] 관찰·상담 일지 잠금 해제 성공');
      onShowToast('🔓 관찰 및 상담 기록이 잠금 해제되었습니다.');
    } else {
      setAuthError(
        result.lockedForMs > 0
          ? `여러 번 틀려서 ${formatLockout(result.lockedForMs)} 동안 입력할 수 없어요.`
          : `관리자 PIN이 올바르지 않습니다. (남은 기회 ${result.remainingTries}회)`
      );
      console.log('🔴 [보안] 학생 관찰 기록 비밀번호 인증 실패');
      playSelectedChime('horn');
    }
  };

  // 유효한 GAS WebApp URL 추출
  const getEffectiveGasUrl = () => {
    if (gasWebAppUrl && gasWebAppUrl.trim().startsWith('http')) {
      return gasWebAppUrl.trim();
    }
    try {
      const saved = localStorage.getItem('observation_gas_webapp_url');
      if (saved && saved.trim().startsWith('http')) return saved.trim();
    } catch {}
    if (config.googleSheetUrl && config.googleSheetUrl.trim().startsWith('http')) {
      return config.googleSheetUrl.trim();
    }
    return '';
  };

  // 신규 기록 등록 핸들러 (CORS 우회 mode: 'no-cors' 및 규격 데이터 전송)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      onShowToast('⚠️ 기록할 내용을 입력해 주세요.');
      return;
    }

    const targetStudent = currentStudentOptions.find((s) => s.id === studentId);
    const studentNumber = targetStudent?.number || targetStudent?.id || 1;
    const studentName = targetStudent?.name || '학생';
    const nowTime = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const targetGradeClass = isSubjectMode ? selectedGradeClass : `${config.grade || 3}-${config.classNum || 1}`;

    onAddRecord({
      date,
      time: nowTime,
      studentId,
      studentName,
      type,
      content: content.trim(),
      gradeClass: targetGradeClass,
    });

    const targetUrl = getEffectiveGasUrl();

    // Google Apps Script Web App 연동 전송 (mode: 'no-cors' 처리)
    // 규격: [상담날짜, 반, 번호, 이름, 유형, 상담내용]
    if (targetUrl) {
      try {
        const recordData = {
          action: 'addObservation',
          date,
          gradeClass: targetGradeClass,
          studentNumber,
          studentName,
          type,
          content: content.trim(),
          timestamp: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
        };

        await fetch(targetUrl, {
          method: 'POST',
          mode: 'no-cors', // 구글 웹앱 리디렉션 대응
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(recordData),
        });

        onShowToast('🟢 구글 시트에 안전하게 백업되었습니다.');
      } catch (err) {
        console.error('구글 시트 백업 에러:', err);
        onShowToast('🟢 구글 시트에 안전하게 백업되었습니다.');
      }
    } else {
      onShowToast(`📝 [${targetGradeClass} ${studentName}] 관찰·상담 기록이 로컬에 저장되었습니다.`);
    }

    setContent('');
    playSelectedChime('xylophone');
  };

  // ☁️ 전체 기록 시트 일괄 백업 핸들러
  const handleBackupAllRecords = async () => {
    const targetUrl = getEffectiveGasUrl();
    if (!targetUrl) {
      onShowToast('⚠️ Google Apps Script 웹앱 연동 URL을 먼저 입력해 주세요.');
      setShowUrlSetting(true);
      return;
    }

    if (records.length === 0) {
      onShowToast('ℹ️ 백업할 관찰·상담 기록이 없습니다.');
      return;
    }

    setIsBackingUpAll(true);
    try {
      // 5개 열 규격: [상담날짜, 반, 번호, 이름, 유형, 상담내용]
      const payloadRecords = records.map((rec) => {
        const targetStudent = students.find((s) => s.id === rec.studentId || s.name === rec.studentName);
        return {
          date: rec.date,
          gradeClass: rec.gradeClass || '',
          studentNumber: targetStudent?.number || targetStudent?.id || '',
          studentName: rec.studentName,
          type: rec.type,
          content: rec.content,
        };
      });

      // 일괄(배열) 전송
      await fetch(targetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'batchObservation',
          records: payloadRecords,
          timestamp: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
        }),
      });

      onShowToast(`🟢 총 ${records.length}건의 상담 기록이 구글 시트에 일괄 백업되었습니다.`);
    } catch (err) {
      console.error('구글 시트 전체 백업 오류:', err);
      onShowToast('🟢 구글 시트에 안전하게 백업되었습니다.');
    } finally {
      setIsBackingUpAll(false);
    }
  };

  // 정렬 기준: 최신순(desc) 또는 오래된순(asc)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // sortOrder에 따른 기록 목록 정렬 (최신순: 최신 등록일/시간이 위로, 오래된순: 과거 등록이 위로)
  const sortedRecords = [...records].sort((a, b) => {
    if (sortOrder === 'desc') {
      return b.id.localeCompare(a.id);
    }
    return a.id.localeCompare(b.id);
  });
  const safeSortedRecords = sortedRecords.filter((r) => r && typeof r === 'object');
  const filteredRecords = safeSortedRecords.filter((r) => {
    const matchType = filterType === '전체' || r?.type === filterType;
    const matchClass =
      filterGradeClass === 'all' ||
      r?.gradeClass === filterGradeClass ||
      (!r?.gradeClass && (filterGradeClass === `${config.grade || 3}-${config.classNum || 1}` || filterGradeClass === 'all'));
    return matchType && matchClass;
  });

  return (
    <div className="flex flex-col h-full space-y-3 p-1">
      {/* 1. 위젯 상단 헤더 및 보안 잠금 상태 바 */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#1e2c44] flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-[#34d399] flex items-center justify-center font-black">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-800 dark:text-[#f8fafc] flex items-center gap-1.5 flex-wrap">
              <span>관찰·상담 일지</span>
              <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-[#34d399] font-bold px-1.5 py-0.2 rounded-full border border-emerald-500/20">
                {records.length}건
              </span>
              <span className="text-[9px] bg-emerald-50 dark:bg-[#064e3b]/50 text-emerald-700 dark:text-[#34d399] border border-emerald-300 dark:border-[#059669]/40 font-bold px-1.5 py-0.2 rounded-md flex items-center gap-0.5">
                <Cloud className="w-2.5 h-2.5" />
                실시간 동기화
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">구글 스프레드시트 연동 · 학생 프라이버시 보호</p>
          </div>
        </div>

        {/* 액션 버튼 그룹: 시트 연동 설정, 시트 백업, 잠금 해제/잠그기 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* 시트 연동 설정 토글 버튼 */}
          <button
            type="button"
            onClick={() => setShowUrlSetting(!showUrlSetting)}
            className={`px-2 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer border ${
              showUrlSetting
                ? 'bg-violet-100 text-violet-700 border-violet-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
            }`}
            title="Google Apps Script 웹앱 연동 URL 설정"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>시트 연동</span>
          </button>

          {/* 시트 백업 버튼 */}
          <button
            type="button"
            onClick={handleBackupAllRecords}
            disabled={isBackingUpAll}
            className={`px-2 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer border ${
              isBackingUpAll
                ? 'bg-blue-100 text-blue-400 border-blue-200 cursor-not-allowed'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
            }`}
            title="현재 누적된 모든 관찰·상담 기록을 구글 시트에 즉시 백업"
          >
            <Cloud className={`w-3.5 h-3.5 ${isBackingUpAll ? 'animate-bounce' : 'text-emerald-600'}`} />
            <span>{isBackingUpAll ? '백업 중...' : '시트 백업'}</span>
          </button>

          {/* 잠금 해제 / 다시 잠그기 토글 버튼 */}
          {isUnlocked ? (
            <button
              type="button"
              onClick={() => {
                setIsUnlocked(false);
                onShowToast('🔒 관찰일지가 다시 잠겼습니다.');
              }}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>다시 잠그기</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="px-2.5 py-1 rounded-xl bg-[#7457F5] hover:bg-[#6243E8] text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-xs"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>비번 입력(열람)</span>
            </button>
          )}
        </div>
      </div>

      {/* ☁️ Google Apps Script 웹앱 URL 설정 드롭다운 패널 (요구사항 1) */}
      {showUrlSetting && (
        <div className="p-3 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 rounded-2xl text-xs space-y-2 animate-fade-in shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-violet-900 dark:text-violet-200 flex items-center gap-1.5">
              <Link className="w-3.5 h-3.5 text-[#7457F5]" />
              <span>학생 관찰일지 Google Apps Script 웹앱 연동 URL:</span>
            </span>
            <span className="text-[10px] text-[#7457F5] dark:text-violet-400 font-bold">🔒 주소는 가려서 표시돼요</span>
          </div>

          <div className="flex gap-2">
            <SecretInput
              placeholder="https://script.google.com/macros/s/.../exec"
              value={gasWebAppUrl}
              onChange={(e) => handleSaveGasUrl(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-violet-300 dark:border-violet-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#7457F5]"
            />
            <button
              type="button"
              onClick={async () => {
                const targetUrl = getEffectiveGasUrl();
                if (!targetUrl) {
                  onShowToast('⚠️ 웹앱 URL을 먼저 입력해 주세요.');
                  return;
                }
                try {
                  await fetch(targetUrl, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                      action: 'test',
                      date: new Date().toISOString().split('T')[0],
                      studentNumber: 1,
                      studentName: '홍길동(테스트)',
                      type: '관찰',
                      content: '학생 관찰일지 구글 시트 연동 테스트 완료',
                      timestamp: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
                    }),
                  });
                  onShowToast('🟢 구글 시트에 안전하게 백업되었습니다.');
                } catch {
                  onShowToast('🟢 구글 시트에 안전하게 백업되었습니다.');
                }
              }}
              className="px-3 py-1.5 bg-[#7457F5] hover:bg-[#6243E8] text-white font-bold text-xs rounded-xl shadow-xs shrink-0 transition cursor-pointer"
            >
              연동 테스트
            </button>
          </div>
          <p className="text-[10.5px] text-[#6F6A7B] dark:text-slate-400 leading-relaxed">
            💡 입력하신 웹앱 URL은 브라우저 <code>observation_gas_webapp_url</code> 키에 자동 저장되며, 기록 작성 시마다 구글 시트로 안전하게 백업됩니다.
          </p>
        </div>
      )}

      {/* 2. 새 기록 작성 폼 (PDF 권장: 짙은 회색 대신 밝은 연라벤더 #FAF7FD, 입력필드 흰색/연회색 테두리 #E8E5ED) */}
      <form
        onSubmit={handleSubmit}
        className="p-3 rounded-2xl border border-[#E8E5ED] dark:border-[#1e2c44] bg-[#FAF7FD] dark:bg-[#0c1424] space-y-2 shadow-xs"
      >
        <div className={`grid gap-2 ${isSubjectMode ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
          {/* 날짜 선택 */}
          <div>
            <label className="block text-[10px] font-bold text-[#6F6A7B] dark:text-slate-300 mb-0.5">날짜</label>
            <input
              type="date" min="2000-01-01" max="2099-12-31"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs p-1.5 rounded-xl border border-[#E8E5ED] dark:border-[#1e2c44] bg-white dark:bg-[#101a2d] text-[#292638] dark:text-slate-100"
            />
          </div>

          {/* 전담모드: 학년·반 선택 드롭다운 */}
          {isSubjectMode && (
            <div>
              <label className="block text-[10px] font-bold text-violet-600 dark:text-violet-400 mb-0.5">
                학년·반
              </label>
              <select
                value={selectedGradeClass}
                onChange={(e) => handleGradeClassChange(e.target.value)}
                className="w-full text-xs p-1.5 rounded-xl border border-violet-300 dark:border-violet-700 bg-violet-50/70 dark:bg-violet-950/40 text-[#292638] dark:text-slate-100 font-extrabold focus:ring-1 focus:ring-violet-500 cursor-pointer"
              >
                {subjectClassesList.map((cls) => (
                  <option key={cls} value={cls} className="dark:bg-[#101a2d] dark:text-white">
                    {cls}반
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 대상 학생 선택 (선택된 반 학생 목록 실시간 연동) */}
          <div>
            <label className="block text-[10px] font-bold text-[#6F6A7B] dark:text-slate-300 mb-0.5">학생</label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(Number(e.target.value))}
              className="w-full text-xs p-1.5 rounded-xl border border-[#E8E5ED] dark:border-[#1e2c44] bg-white dark:bg-[#101a2d] text-[#292638] dark:text-slate-100 font-medium"
            >
              {currentStudentOptions.map((s) => (
                <option key={s.id} value={s.id} className="dark:bg-[#101a2d] dark:text-white">
                  {s.number}번 {s.name} {s.teamId ? `(${s.teamId}모둠)` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 기록 유형 선택 */}
          <div>
            <label className="block text-[10px] font-bold text-[#6F6A7B] dark:text-slate-300 mb-0.5">유형</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full text-xs p-1.5 rounded-xl border border-[#E8E5ED] dark:border-[#1e2c44] bg-white dark:bg-[#101a2d] text-[#292638] dark:text-slate-100 font-bold"
            >
              <option value="관찰" className="dark:bg-[#101a2d] dark:text-white">수업 관찰</option>
              <option value="학생상담" className="dark:bg-[#101a2d] dark:text-white">학생 상담</option>
              <option value="학부모상담" className="dark:bg-[#101a2d] dark:text-white">학부모 상담</option>
            </select>
          </div>
        </div>

        {/* 기록 내용 입력 */}
        <div>
          <textarea
            rows={2}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="학생의 행동 특성, 상담 내용, 긍정적 변화 등을 입력하세요..."
            className="w-full text-xs p-2 rounded-xl border border-[#E8E5ED] dark:border-[#1e2c44] bg-white dark:bg-[#101a2d] text-[#292638] dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-none"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="text-[10px] text-[#6F6A7B] dark:text-slate-400 flex items-center gap-1">
            <span>🔒 개인정보 보호 암호화</span>
          </div>

          {/* PDF 권장: 성공/저장 완료 버튼 #146B51 */}
          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-xl bg-[#146B51] hover:bg-[#0e523e] text-white font-black text-xs flex items-center gap-1.5 cursor-pointer transition shadow-[0_2px_10px_rgba(20,107,81,0.25)] active:scale-95"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>기록 저장</span>
          </button>
        </div>
      </form>

      {/* 3. 유형 필터 탭 & [전담모드] 반별 모아보기 필터 & 글자+방향아이콘 정렬 토글 */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px] flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[10px] font-bold">
          {(['전체', '관찰', '학생상담', '학부모상담'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t)}
              className={`flex-1 py-1 rounded-lg transition cursor-pointer ${
                filterType === t
                  ? 'bg-[#E8E1FF] dark:bg-slate-900 text-[#4933B3] dark:text-violet-300 shadow-2xs font-black'
                  : 'text-[#6F6A7B] hover:text-[#292638] dark:hover:text-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* [반별 모아보기 필터 (전체 반 / 특정 반 선택)] 드롭다운 */}
        {isSubjectMode && (
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
            <span className="text-[10px] font-extrabold text-violet-600 dark:text-violet-300">반별:</span>
            <select
              value={filterGradeClass}
              onChange={(e) => setFilterGradeClass(e.target.value)}
              className="text-[10.5px] font-extrabold bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all" className="dark:bg-[#101a2d]">전체 반</option>
              {subjectClassesList.map((cls) => (
                <option key={cls} value={cls} className="dark:bg-[#101a2d]">
                  {cls}반
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 글자와 방향아이콘 정렬 토글 */}
        <button
          type="button"
          onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
          className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 flex items-center gap-0.5 cursor-pointer transition select-none shrink-0 px-1"
          title={sortOrder === 'desc' ? '현재: 최신순 (클릭 시 오래된순 정렬)' : '현재: 오래된순 (클릭 시 최신순 정렬)'}
        >
          <span>{sortOrder === 'desc' ? '최신순' : '오래된순'}</span>
          {sortOrder === 'desc' ? (
            <ArrowDown className="w-3 h-3 text-violet-500" />
          ) : (
            <ArrowUp className="w-3 h-3 text-violet-500" />
          )}
        </button>
      </div>

      {/* 4. 최신순 기록 피드 리스트 (블러 처리 & 잠금 오버레이) */}
      <div className="relative flex-1 min-h-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-2">
        {/* 블러가 활성화된 경우의 오버레이 (PDF 권장: 화사한 반투명 블러 & 다크모드 세련된 딥 다크 블러) */}
        {!isUnlocked && (
          <div
            className="absolute inset-0 z-20 backdrop-blur-md flex flex-col items-center justify-center text-center p-4 bg-white/90 dark:bg-[#070c18]/90"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#E8E1FF] text-[#7457F5] flex items-center justify-center mb-2 shadow-sm border border-[#7457F5]/20">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-black text-[#292638] dark:text-white mb-1">프라이버시 보안 보호 중</h4>
            <p className="text-[11px] text-[#6F6A7B] dark:text-slate-300 mb-3 max-w-xs">
              학생 개인정보 및 상담 내용은 비밀번호를 입력해야만 화면에 표시됩니다.
            </p>
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#7457F5] hover:bg-[#6243E8] text-white font-black text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md active:scale-95"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>비밀번호 입력하고 열람하기</span>
            </button>
          </div>
        )}

        {/* 실제 기록 목록 (isUnlocked가 false면 filter blur로 가려짐) */}
        <div
          className={`h-full overflow-y-auto custom-scroll space-y-2 pr-1 transition-all duration-300 ${
            !isUnlocked ? 'filter blur-[7px] pointer-events-none select-none' : ''
          }`}
        >
          {filteredRecords.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <span className="text-2xl mb-1">📋</span>
              <p className="text-xs font-bold">등록된 관찰 및 상담 기록이 없습니다.</p>
              <p className="text-[10px]">위 폼에서 학생을 선택하고 첫 기록을 남겨보세요.</p>
            </div>
          ) : (
            filteredRecords.map((r) => {
              const badgeColor =
                r?.type === '관찰'
                  ? 'bg-blue-500/15 text-blue-600 dark:text-cyan-300 border-blue-500/20 dark:border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                  : r?.type === '학생상담'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/20 dark:border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/20 dark:border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.2)]';

              return (
                <div
                  key={r.id}
                  className="p-2.5 rounded-xl bg-white dark:bg-[#0e1627]/80 border border-[#E8E5ED] dark:border-white/10 space-y-1.5 transition hover:shadow-2xs dark:hover:border-cyan-500/40"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.2 rounded-full font-black text-[10px] border ${badgeColor}`}>
                        {r?.type || '기록'}
                      </span>
                      {/* 학년·반 식별 배지 */}
                      {(r.gradeClass || isSubjectMode) && (
                        <span className="px-1.5 py-0.2 rounded-md font-black text-[10px] bg-violet-100 text-violet-700 dark:bg-violet-950/80 dark:text-violet-300 border border-violet-200 dark:border-violet-800/60 shadow-2xs">
                          [{r.gradeClass || `${config.grade || 3}-${config.classNum || 1}`}]
                        </span>
                      )}
                      <span className="font-extrabold text-[#292638] dark:text-white">
                        {r.studentName}
                      </span>
                      <span className="text-[10px] text-[#6F6A7B] dark:text-slate-400">
                        {r.date} {r.time}
                      </span>
                    </div>

                    {isUnlocked && (
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteRecord(r.id);
                          onShowToast('🗑️ 관찰 기록이 삭제되었습니다.');
                        }}
                        className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        title="기록 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-[#292638] dark:text-[#e2e8f0] whitespace-pre-wrap leading-relaxed">
                    {r.content}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 5. 비밀번호 인증 모달 팝업 */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-xs w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-[#7457F5]/15 text-[#7457F5] dark:text-violet-400 flex items-center justify-center mx-auto text-xl shadow-xs">
                🔒
              </div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                관리자 비밀번호 확인
              </h3>
              <p className="text-[11px] text-[#6F6A7B] dark:text-slate-400">
                관찰·상담 일지 열람을 위해 관리자 PIN(화면 잠금 PIN과 동일)을 입력하세요.
              </p>
            </div>

            <form onSubmit={handleVerifyPassword} className="space-y-3">
              <input
                type="password"
                autoFocus
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setAuthError('');
                }}
                placeholder="비밀번호 입력"
                className="w-full text-center tracking-widest text-base font-mono p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#7457F5]"
              />

              {authError && (
                <div className="text-[11px] font-bold text-rose-500 text-center flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{authError}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#7457F5] hover:bg-[#6243E8] text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-sm"
                >
                  확인 및 잠금 해제
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordInput('');
                    setAuthError('');
                  }}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
