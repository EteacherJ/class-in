import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  X,
  ArrowUpDown,
  CheckCircle2,
  Users,
  Calendar,
  Sparkles,
  School,
  Star,
} from 'lucide-react';
import { Student, Team, SeatingLayoutType } from '../types';
import { printElementById } from '../utils/printHelper';

interface SeatingPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  teams: Team[];
  seatingViewType: 'team' | 'individual';
  individualColumns: number;
  teamColumns: number;
  layout: SeatingLayoutType;
  isTeacherPerspective: boolean;
  onTogglePerspective: () => void;
  schoolName?: string;
  grade?: number;
  classNum?: number;
  onShowToast: (msg: string) => void;
}

export const SeatingPrintModal: React.FC<SeatingPrintModalProps> = ({
  isOpen,
  onClose,
  students,
  teams,
  seatingViewType,
  individualColumns,
  teamColumns,
  layout,
  isTeacherPerspective,
  onTogglePerspective,
  schoolName = '',
  grade = 3,
  classNum = 1,
  onShowToast,
}) => {
  if (!isOpen) return null;

  // 출력 날짜 포맷 (예: 2026. 10. 21 수요일)
  const todayStr = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date());

  // 성별 통계
  const maleCount = students.filter((s) => s.gender === 'M').length;
  const femaleCount = students.filter((s) => s.gender === 'F').length;
  const totalCount = students.length;

  // 🖨️ A4 가로(Landscape) 인쇄 실행 함수
  const handleExecutePrint = () => {
    onShowToast('🖨️ 교실 칠판 게시용 A4 가로 배치도 인쇄를 시작합니다.');
    printElementById('seating-printable-canvas', {
      title: `${schoolName} ${grade}학년 ${classNum}반 자리 배치도`,
      orientation: 'landscape',
      margin: '5mm',
      bodyClass: 'printing-seating-chart',
      customCss: `
        @page {
          size: A4 landscape !important;
          margin: 5mm !important;
        }
        *, *::before, *::after {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          box-sizing: border-box !important;
        }
        html, body {
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          overflow: hidden !important;
        }
        #seating-printable-canvas {
          width: 100% !important;
          max-width: 287mm !important;
          height: 100vh !important;
          max-height: 200mm !important;
          margin: 0 auto !important;
          padding: 2mm 3mm !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          background: #ffffff !important;
          box-shadow: none !important;
          border: none !important;
          overflow: hidden !important;
          page-break-after: avoid !important;
          break-after: avoid !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
      `,
    });
  };

  // 학생 정렬 (교사 시점 / 학생 시점 반전)
  const sortedStudents = isTeacherPerspective ? students : [...students].reverse();

  // 개인 좌석 데이터 분할
  const rowsPerCol = Math.max(1, Math.ceil(sortedStudents.length / individualColumns));
  const individualColsData: typeof students[] = [];
  for (let i = 0; i < individualColumns; i++) {
    individualColsData.push(sortedStudents.slice(i * rowsPerCol, (i + 1) * rowsPerCol));
  }

  // 모둠 데이터
  const displayedTeams = isTeacherPerspective ? teams : [...teams].reverse();
  const getStudentsByTeam = (teamId: number) => students.filter((s) => s.teamId === teamId);

  return typeof document !== 'undefined'
    ? createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-5 animate-fade-in overflow-hidden">
          {/* 상단 컨트롤러 바 (인쇄 미리보기 전용 네비게이션) */}
          <div className="w-full max-w-6xl bg-slate-900/90 text-white rounded-2xl px-4 py-2.5 shadow-2xl border border-white/20 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  <span>교실 칠판 게시용 A4 가로 자리 배치도 인쇄 미리보기</span>
                  <span className="text-[10px] bg-indigo-500/40 text-indigo-200 border border-indigo-400/40 px-2 py-0.5 rounded-full font-bold">
                    A4 가로 1페이지 맞춤
                  </span>
                </h3>
                <p className="text-[11px] text-slate-300">
                  교실 칠판 및 앞뒤 게시판 부착에 최적화된 고화질 레이아웃입니다.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* 시점 전환 버튼 */}
              <button
                type="button"
                onClick={onTogglePerspective}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer active:scale-95"
                title="선생님 시점 (칠판 위) ↔ 학생 시점 (칠판 아래) 전환"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
                <span>{isTeacherPerspective ? '교사 시점 (앞이 위)' : '학생 시점 (앞이 아래)'}</span>
              </button>

              {/* 인쇄 실행 버튼 */}
              <button
                type="button"
                onClick={handleExecutePrint}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer active:scale-95"
                title="지금 A4 가로 1페이지로 인쇄하기"
              >
                <Printer className="w-4 h-4" />
                <span>인쇄 실행하기</span>
              </button>

              {/* 닫기 버튼 */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                title="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 중앙 A4 가로 비율 용지 캔버스 컨테이너 (실제 출력될 모습 100% 동일 렌더링) */}
          <div className="w-full flex-1 min-h-0 flex items-center justify-center py-2 overflow-auto custom-scroll">
            <div
              id="seating-printable-canvas"
              style={{
                aspectRatio: '297 / 210',
                width: 'min(100%, 1060px)',
                maxHeight: 'calc(100vh - 120px)',
              }}
              className="bg-white text-slate-900 rounded-2xl shadow-2xl p-4 sm:p-5 flex flex-col justify-between border border-slate-200 select-none overflow-hidden"
            >
              {/* 1. 상단 학급 정보 헤더 */}
              <div className="pb-2.5 border-b-2 border-indigo-500/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold shadow-xs">
                    <School className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <span>{schoolName}</span>
                      <span className="text-indigo-600">{grade}학년 {classNum}반</span>
                      <span>자리 배치도</span>
                    </h1>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 mt-0.5">
                      <span>📅 {todayStr}</span>
                      <span>·</span>
                      <span>👥 총원 {totalCount}명 (남 {maleCount}명 · 여 {femaleCount}명)</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-black">
                    {seatingViewType === 'individual' ? `개인 ${individualColumns}열 배치` : `${teams.length}모둠 배치`}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold">
                    {isTeacherPerspective ? '교사 시점 (정면 시야)' : '학생 시점 (학생 시야)'}
                  </span>
                </div>
              </div>

              {/* 2. 칠판 & 전자 교탁 배너 (시점에 따라 상단/하단 위치) */}
              <div
                className={`w-full py-2 px-4 bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-700 text-white rounded-xl flex items-center justify-between text-xs font-black shadow-sm my-2 ${
                  !isTeacherPerspective ? 'order-last mt-2 mb-0' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
                  <span className="text-sm font-extrabold tracking-wide">
                    [ 칠판 &amp; 전자 교탁 방면 {isTeacherPerspective ? '(교실 앞)' : '(교실 뒤 시선)'} ]
                  </span>
                </div>
                <span className="text-[11px] text-indigo-100 font-bold bg-white/20 px-2.5 py-0.5 rounded-full">
                  {isTeacherPerspective ? '교탁 / 칠판 기준 정면' : '학생 책상 기준 시야'}
                </span>
              </div>

              {/* 3. 메인 좌석 그리드 영역 */}
              <div className="flex-1 min-h-0 flex flex-col justify-center my-1 overflow-hidden">
                {seatingViewType === 'individual' ? (
                  /* 개인 좌석 뷰: 분단별 균등 열 배치 */
                  <div
                    className="grid gap-2.5 sm:gap-3 h-full"
                    style={{
                      gridTemplateColumns: `repeat(${individualColumns}, minmax(0, 1fr))`,
                    }}
                  >
                    {individualColsData.map((colStudents, colIdx) => (
                      <div
                        key={colIdx}
                        className="bg-slate-50/90 border border-slate-300/80 rounded-2xl p-2 sm:p-2.5 flex flex-col justify-between shadow-2xs"
                      >
                        {/* 분단 헤더 */}
                        <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-200 text-xs font-black">
                          <span className="bg-indigo-100 text-indigo-800 font-extrabold px-2 py-0.5 rounded-md text-[11px]">
                            {colIdx + 1}열 ({colIdx + 1}분단)
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold">
                            {colStudents.length}명
                          </span>
                        </div>

                        {/* 학생 책상 카드 리스트 */}
                        <div className="flex flex-col gap-1.5 flex-1 justify-around">
                          {colStudents.map((st) => (
                            <div
                              key={st.id}
                              className={`p-1.5 sm:p-2 rounded-xl border-2 transition shadow-xs flex items-center justify-between ${
                                st.gender === 'M'
                                  ? 'bg-blue-50/50 border-blue-200/90 text-slate-900'
                                  : st.gender === 'F'
                                  ? 'bg-rose-50/50 border-rose-200/90 text-slate-900'
                                  : 'bg-white border-slate-200 text-slate-900'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                {/* 출석번호 및 성별 뱃지 */}
                                <span
                                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-black font-mono shrink-0 ${
                                    st.gender === 'M'
                                      ? 'bg-blue-600 text-white'
                                      : st.gender === 'F'
                                      ? 'bg-rose-600 text-white'
                                      : 'bg-slate-600 text-white'
                                  }`}
                                >
                                  {st.number}번
                                </span>

                                {/* 🎯 학생 이름 (교실 뒤에서도 잘 보이는 굵고 큰 고딕 볼드 폰트) */}
                                <span className="text-sm sm:text-base md:text-lg font-black tracking-tight text-slate-900 truncate">
                                  {st.name}
                                </span>
                              </div>

                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                  st.gender === 'M'
                                    ? 'text-blue-700 bg-blue-100/80'
                                    : st.gender === 'F'
                                    ? 'text-rose-700 bg-rose-100/80'
                                    : 'text-slate-600 bg-slate-100'
                                }`}
                              >
                                {st.gender === 'M' ? '남' : st.gender === 'F' ? '여' : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* 모둠 좌석 뷰 */
                  <div
                    className={`grid gap-2.5 sm:gap-3 h-full ${
                      displayedTeams.length <= 4
                        ? 'grid-cols-2 md:grid-cols-4'
                        : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4'
                    }`}
                  >
                    {displayedTeams.map((team) => {
                      const teamStudents = getStudentsByTeam(team.id);

                      return (
                        <div
                          key={team.id}
                          className={`p-2.5 sm:p-3 rounded-2xl border-2 bg-white flex flex-col justify-between shadow-2xs ${
                            team.borderColor || 'border-slate-300'
                          }`}
                        >
                          {/* 모둠 헤더 */}
                          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-100">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-3 h-3 rounded-full ${team.dotColor || 'bg-indigo-500'}`} />
                              <span className={`font-black text-xs sm:text-sm ${team.textColor || 'text-slate-800'}`}>
                                {team.name}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">
                              {teamStudents.length}명
                            </span>
                          </div>

                          {/* 모둠원 책상 카드 그리드 */}
                          <div className="grid grid-cols-2 gap-1.5 flex-1 items-center">
                            {teamStudents.map((st) => (
                              <div
                                key={st.id}
                                className={`p-1.5 rounded-xl border flex flex-col justify-center text-center shadow-2xs ${
                                  st.gender === 'M'
                                    ? 'bg-blue-50/60 border-blue-200 text-slate-900'
                                    : st.gender === 'F'
                                    ? 'bg-rose-50/60 border-rose-200 text-slate-900'
                                    : 'bg-slate-50 border-slate-200 text-slate-900'
                                }`}
                              >
                                <div className="text-[10px] font-bold font-mono opacity-80">
                                  {st.number}번 ({st.gender === 'M' ? '남' : '여'})
                                </div>
                                <div className="text-xs sm:text-sm md:text-base font-black truncate text-slate-900">
                                  {st.name}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 4. 하단 게시 안내 푸터 */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-bold">
                <span>* 깨끗하고 질서 있는 교실 생활을 위해 정해진 자리를 바르게 사용합니다.</span>
                <span>{schoolName} 스마트 학급 대시보드 출력본</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;
};
