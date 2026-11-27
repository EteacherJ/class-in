import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface SimpleCalendarWidgetProps {
  className?: string;
  onShowToast?: (message: string) => void;
}

/**
 * 📅 [SimpleCalendarWidget] 독립형 경량 순수 월간 캘린더 (PART 6 요구사항)
 * - 복잡한 하단 일정 리스트/입력창 없이 순수 월간 달력 그리드만 깔끔하게 표시
 * - 오늘 날짜 셀: 파스텔 하이라이트 + 은은한 animate-pulse
 * - 이전달 / 다음달 / 오늘 이동 네비게이션
 */
export const SimpleCalendarWidget: React.FC<SimpleCalendarWidgetProps> = ({
  className = '',
  onShowToast,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // 오늘 날짜 Key
  const todayObj = new Date();
  const todayKey = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(
    todayObj.getDate()
  ).padStart(2, '0')}`;

  // 월 이동 헬퍼
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleGoToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateKey(todayKey);
    onShowToast?.('📅 오늘 날짜로 이동했습니다.');
  };

  // 1일의 요일 (0: 일, 1: 월, ..., 6: 토)
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  // 이번 달 총 일수
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // 지난 달 총 일수
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // 7x5 또는 7x6 캘린더 그리드 셀 생성
  const matrix: Array<{
    dayNum: number;
    dateKey: string;
    isCurrentMonth: boolean;
    dayOfWeek: number;
  }> = [];

  // 지난 달 잔여일
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevMonthDate = new Date(year, month - 1, d);
    const key = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    matrix.push({
      dayNum: d,
      dateKey: key,
      isCurrentMonth: false,
      dayOfWeek: matrix.length % 7,
    });
  }

  // 이번 달 일자
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    matrix.push({
      dayNum: d,
      dateKey: key,
      isCurrentMonth: true,
      dayOfWeek: matrix.length % 7,
    });
  }

  // 다음 달 채우기 (총 35칸 또는 42칸에 맞춤)
  const totalSlots = matrix.length <= 35 ? 35 : 42;
  const remaining = totalSlots - matrix.length;
  for (let d = 1; d <= remaining; d++) {
    const nextMonthDate = new Date(year, month + 1, d);
    const key = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    matrix.push({
      dayNum: d,
      dateKey: key,
      isCurrentMonth: false,
      dayOfWeek: matrix.length % 7,
    });
  }

  const weekHeaders = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div
      className={`w-full rounded-2xl p-2.5 sm:p-3 transition-all duration-300 relative select-none border shadow-md bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl border-white/60 dark:border-slate-800 ${className}`}
    >
      {/* 1. 상단 네비게이션 헤더 */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
            <CalendarIcon className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-black text-slate-800 dark:text-slate-100 tracking-tight">
            {year}년 {month + 1}월
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleGoToday}
            className="px-2 py-0.5 text-[10px] font-black rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition cursor-pointer border border-indigo-200/60 dark:border-indigo-800/60"
          >
            오늘
          </button>
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="이전 달"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="다음 달"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. 요일 라벨 헤더 */}
      <div className="grid grid-cols-7 text-center gap-1 pt-1.5 pb-0.5">
        {weekHeaders.map((w, idx) => (
          <span
            key={idx}
            className={`text-[10px] font-black ${
              idx === 0
                ? 'text-rose-500'
                : idx === 6
                ? 'text-sky-500'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {w}
          </span>
        ))}
      </div>

      {/* 3. 순수 월간 날짜 그리드 (복잡한 하단 일정 리스트 없이 깔끔하게 표시) */}
      <div className="grid grid-cols-7 gap-1 pt-0.5">
        {matrix.map((cell, idx) => {
          const isToday = cell.dateKey === todayKey;
          const isSelected = cell.dateKey === selectedDateKey;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedDateKey(cell.dateKey)}
              className={`relative flex items-center justify-center h-6 sm:h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                !cell.isCurrentMonth
                  ? 'text-slate-300 dark:text-slate-600 font-normal hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                  : cell.dayOfWeek === 0
                  ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                  : cell.dayOfWeek === 6
                  ? 'text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/30'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              } ${
                /* 오늘 날짜 셀: 파스텔 하이라이트 배경 + 숨쉬는 듯한 animate-pulse (PART 6 요구사항) */
                isToday
                  ? 'bg-amber-200/90 dark:bg-amber-950/80 border-2 border-amber-400 text-amber-950 dark:text-amber-200 shadow-sm animate-pulse font-black'
                  : ''
              } ${
                isSelected && !isToday
                  ? 'ring-2 ring-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 font-black'
                  : ''
              }`}
              title={cell.dateKey}
            >
              <span className="leading-none text-[11px] tabular-nums">{cell.dayNum}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
