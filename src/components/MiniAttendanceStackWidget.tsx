import React from 'react';
import { UserCheck, Users, AlertCircle, ArrowUpRight } from 'lucide-react';
import { Student } from '../types';

interface MiniAttendanceStackWidgetProps {
  students: Student[];
  onShowToast?: (msg: string) => void;
  onExpandToCanvas?: () => void;
}

/**
 * 👥 [스택 전용 미니 출결 관리 위젯]
 * - 스택 슬롯 높이(h-[210px])에 최적화
 * - 라운드가 적은 캔디바(rounded-md)로 배경색을 구분하여 출결 통계 제시:
 *   1) 결석: X명 / 조퇴: Y명
 *   2) 출석인정: Z명 / 지각: W명
 * - 하단 특이 출결 학생 현황 및 재석 인원 안내
 */
export const MiniAttendanceStackWidget: React.FC<MiniAttendanceStackWidgetProps> = ({
  students,
  onShowToast,
  onExpandToCanvas,
}) => {
  const total = students.length;
  const present = students.filter((s) => s.attendance === 'present').length;
  const absentStudents = students.filter((s) => s.attendance === 'absent');
  const earlyStudents = students.filter((s) => s.attendance === 'early');
  const lateStudents = students.filter((s) => s.attendance === 'late');
  const acknowledgedStudents = students.filter(
    (s) =>
      s.reasonCategory === '출석인정' ||
      (s as any).attendanceReasonCategory === '출석인정' ||
      s.reasonCategory === '인정'
  );

  const absentCount = absentStudents.length;
  const earlyCount = earlyStudents.length;
  const acknowledgedCount = acknowledgedStudents.length;
  const lateCount = lateStudents.length;

  const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 100;

  // 특이 출결 대상 학생 통합 (결석, 조퇴, 지각, 출석인정)
  const specialStudents = [
    ...absentStudents.map((s) => ({ ...s, badge: '결석', color: 'rose' })),
    ...earlyStudents.map((s) => ({ ...s, badge: '조퇴', color: 'purple' })),
    ...acknowledgedStudents.map((s) => ({ ...s, badge: '출석인정', color: 'emerald' })),
    ...lateStudents.map((s) => ({ ...s, badge: '지각', color: 'amber' })),
  ];

  return (
    <div className="w-full h-full flex flex-col p-2.5 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden text-slate-800 dark:text-slate-100">
      {/* 1. 상단 헤더: 위젯명 + 총원/출석 인원 */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/70 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <UserCheck className="w-3 h-3" />
          </div>
          <span className="text-xs font-black tracking-tight text-slate-800 dark:text-slate-100">
            오늘의 출결 현황
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.2 rounded-md border border-blue-200/60 dark:border-blue-800 font-mono">
            출석 {present}/{total}명 ({attendanceRate}%)
          </span>
        </div>
      </div>

      {/* 2. 🍬 캔디바 4개 (결석 · 조퇴 · 지각 · 출석인정 각각 분리) */}
      <div className="grid grid-cols-2 gap-1.5 py-2 shrink-0" data-att-bars>
        {[
          { k: '결석', n: absentCount, cls: 'att-bar is-absent' },
          { k: '조퇴', n: earlyCount, cls: 'att-bar is-early' },
          { k: '지각', n: lateCount, cls: 'att-bar is-late' },
          { k: '출석인정', n: acknowledgedCount, cls: 'att-bar is-ack' },
        ].map((b) => (
          <div key={b.k} className={b.cls}>
            <i />
            <span>{b.k}</span>
            <b>
              {b.n}
              <small>명</small>
            </b>
          </div>
        ))}
      </div>

      {/* 3. 하단 특이 출결 학생 명단 칩 또는 전원 출석 완료 안내 */}
      <div className="flex-1 min-h-[96px] overflow-y-auto rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 p-1.5 custom-scrollbar">
        {specialStudents.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center text-[11px] text-emerald-600 dark:text-emerald-400 font-bold gap-1">
            <span>🎉 전원 출석 완료 (특이사항 없음)</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1 items-start content-start">
            {specialStudents.map((st) => {
              const badgeBg =
                st.color === 'rose'
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                  : st.color === 'purple'
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                  : st.color === 'emerald'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';

              return (
                <div
                  key={`${st.id}-${st.badge}`}
                  className={`px-1.5 py-0.5 rounded-md border text-[10px] font-bold flex items-center gap-1 ${badgeBg}`}
                  title={st.reasonNote ? `${st.name}: ${st.reasonNote}` : st.name}
                >
                  <span>{st.number}번 {st.name}</span>
                  <span className="opacity-75 text-[9px] font-extrabold">[{st.badge}]</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
