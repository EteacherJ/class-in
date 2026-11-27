import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, Calendar, Check } from 'lucide-react';
import { Student, AttendanceStatus, AttendanceReasonCategory } from '../types';

export interface AttendanceDetailSavePayload {
  studentId: number;
  number?: number;
  status: AttendanceStatus;
  reasonCategory: AttendanceReasonCategory;
  reasonDetail: string;
  memo: string;
  detail?: string;
  earlyPeriod?: string;
  longTermRange?: { start: string; end: string };
}

interface AttendanceDetailModalProps {
  student: Student | null;
  initialStatus?: AttendanceStatus;
  onClose: () => void;
  onSave: (payload: AttendanceDetailSavePayload) => void;
}

export const AttendanceDetailModal: React.FC<AttendanceDetailModalProps> = ({
  student,
  initialStatus,
  onClose,
  onSave,
}) => {
  // 세부 사유 메모 텍스트 상태 (사용자 입력값 실시간 동기화)
  const [detailMemo, setDetailMemo] = useState<string>('');
  const [status, setStatus] = useState<AttendanceStatus>('absent');
  const [reasonCategory, setReasonCategory] = useState<AttendanceReasonCategory>('질병');
  const [earlyPeriod, setEarlyPeriod] = useState<string>('4교시 후');
  const [isLongTerm, setIsLongTerm] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });

  // 학생 변경 또는 모달 오픈 시 초기값 설정
  useEffect(() => {
    if (student) {
      const activeStatus = initialStatus || student.status || student.attendance || 'absent';
      setStatus(activeStatus);
      setReasonCategory(student.reasonCategory || student.attendanceReasonCategory || '질병');
      setEarlyPeriod(student.earlyPeriod || '4교시 후');
      setIsLongTerm(!!student.longTermRange);
      if (student.longTermRange) {
        setStartDate(student.longTermRange.start);
        setEndDate(student.longTermRange.end);
      } else {
        const today = new Date().toISOString().split('T')[0];
        setStartDate(today);
        const future = new Date();
        future.setDate(future.getDate() + 2);
        setEndDate(future.toISOString().split('T')[0]);
      }
      const initialMemo =
        student.reasonDetail ||
        student.memo ||
        student.attendanceReasonDetail ||
        student.attendanceNote ||
        '';
      setDetailMemo(initialMemo);
    }
  }, [student, initialStatus]);

  if (!student || typeof document === 'undefined') return null;

  // 저장 완료 핸들러: 세부 사유 필수 입력 검증 후 memo 텍스트를 명시적 키(reasonDetail, detail, memo)로 부모에 전달
  const handleSave = () => {
    const trimmed = detailMemo ? detailMemo.trim() : '';
    if (!trimmed) {
      alert('⚠️ 출결 관리를 위해 세부 사유를 필수로 입력해 주세요.\n(상단의 자주 쓰는 사유 빠른 선택 버튼을 클릭하거나 직접 입력)');
      const inputEl = document.getElementById('attendance-reason-detail-input');
      if (inputEl) inputEl.focus();
      return;
    }
    onSave({
      studentId: student.id,
      number: student.number,
      status,
      reasonCategory,
      reasonDetail: trimmed,
      memo: trimmed,
      detail: trimmed,
      earlyPeriod: status === 'early' ? earlyPeriod : undefined,
      longTermRange: status === 'absent' && isLongTerm ? { start: startDate, end: endDate } : undefined,
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto custom-scrollbar animate-fade-in">
      <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 text-xs max-h-[90vh] overflow-y-auto custom-scrollbar relative z-50 my-auto">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">
              {student.number}번 {student.name} 출결 상세 사유 입력
            </h3>
            <p className="text-[11px] text-slate-500">
              버튼을 클릭하여 사유와 세부 정보를 간편하게 선택하세요.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer font-bold"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. 출결 상태 선택 버튼 */}
        <div>
          <label className="font-bold text-slate-700 block mb-1.5">
            1. 출결 상태 선택
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: 'absent', label: '결석', color: 'rose' },
              { id: 'early', label: '조퇴', color: 'purple' },
              { id: 'late', label: '지각', color: 'amber' },
              { id: 'nurse', label: '보건실', color: 'blue' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setStatus(item.id as AttendanceStatus)}
                className={`py-2 rounded-xl font-black text-xs transition cursor-pointer border ${
                  status === item.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-400'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. 나이스(NEIS) 사유 구분 버튼 */}
        <div>
          <label className="font-bold text-slate-700 block mb-1.5">
            2. 나이스(NEIS) 사유 구분
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {(['질병', '출석인정', '미인정', '기타'] as AttendanceReasonCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setReasonCategory(cat)}
                className={`py-2 rounded-xl font-black transition cursor-pointer text-xs border ${
                  reasonCategory === cat
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 3. 조퇴 시점 선택 */}
        {status === 'early' && (
          <div className="p-3 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-1.5">
            <label className="font-black text-purple-950 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-purple-600" />
              <span>조퇴 시점 (몇 교시 후 조퇴인지 선택)</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {['1교시 후', '2교시 후', '3교시 후', '4교시(점심) 후', '5교시 후', '6교시 후'].map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setEarlyPeriod(period)}
                  className={`py-1.5 px-2 rounded-xl font-black text-[11px] transition cursor-pointer border ${
                    earlyPeriod === period
                      ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                      : 'bg-white hover:bg-purple-100 text-purple-900 border-purple-200'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. 장기 결석 기간 설정 */}
        {status === 'absent' && (
          <div className="p-3 bg-rose-50/70 rounded-2xl border border-rose-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-black text-rose-950 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-rose-600" />
                <span>장기 결석 기간 설정</span>
              </label>
              <label className="flex items-center gap-1 text-[11px] font-bold text-rose-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isLongTerm}
                  onChange={(e) => setIsLongTerm(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span>2일 이상 장기 결석</span>
              </label>
            </div>

            {isLongTerm && (
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  {[
                    { label: '2일간', days: 1 },
                    { label: '3일간', days: 2 },
                    { label: '5일(1주)', days: 4 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        const start = new Date(startDate);
                        const target = new Date(start);
                        target.setDate(target.getDate() + preset.days);
                        setEndDate(target.toISOString().split('T')[0]);
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-900 border border-rose-200 rounded-lg text-[10px] font-black cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-rose-700 font-bold block mb-0.5">시작일</span>
                    <input
                      type="date" min="2000-01-01" max="2099-12-31"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-rose-200 rounded-xl text-xs font-semibold outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-rose-700 font-bold block mb-0.5">종료일</span>
                    <input
                      type="date" min="2000-01-01" max="2099-12-31"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-rose-200 rounded-xl text-xs font-semibold outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 자주 쓰는 사유 빠른 선택 */}
        <div>
          <label className="font-bold text-slate-700 block mb-1">
            자주 쓰는 사유 빠른 선택
          </label>
          <div className="flex flex-wrap gap-1">
            {['독감/고열', '감기 몸살', '병원 진료', '코로나19', '가정체험학습', '경조사 참여'].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setDetailMemo(chip)}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer border ${
                  detailMemo === chip
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* 세부 사유 메모 입력 (필수 입력 보장) */}
        <div>
          <label className="font-bold text-slate-700 block mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span>세부 사유 메모</span>
              <span className="text-rose-500 font-extrabold text-[11px]">(필수 *)</span>
            </span>
            <span className="text-[10px] text-slate-400 font-normal">구글 시트 백업 시 '세부내용'으로 기록됩니다</span>
          </label>
          <input
            id="attendance-reason-detail-input"
            name="reasonDetail"
            type="text"
            required
            value={detailMemo}
            onChange={(e) => setDetailMemo(e.target.value)}
            placeholder="세부 사유를 필수로 입력하세요 (예: 독감 병원진료, 가정체험학습 등)"
            className={`w-full px-3 py-2 border rounded-xl outline-none font-medium text-xs transition ${
              !detailMemo.trim()
                ? 'border-amber-300 bg-amber-50/30 focus:ring-2 focus:ring-amber-400'
                : 'border-slate-200 bg-white focus:ring-2 focus:ring-indigo-400'
            }`}
          />
          {!detailMemo.trim() && (
            <p className="text-[10.5px] text-amber-600 font-medium mt-1">
              ※ 구글 시트 백업 시 '세부내용'으로 연동되므로 사유를 반드시 입력해야 저장이 완료됩니다.
            </p>
          )}
        </div>

        {/* 하단 액션 버튼 */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold cursor-pointer hover:bg-slate-200 transition"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black cursor-pointer shadow-sm flex items-center gap-1 transition"
          >
            <Check className="w-3.5 h-3.5" />
            <span>저장 완료</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
