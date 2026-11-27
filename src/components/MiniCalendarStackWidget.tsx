import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles } from 'lucide-react';
import { getKoreanHoliday } from '../utils/koreanHolidays';
import { CAL_KEYS, type CalEvent } from '../utils/calendarSync';

const ymd = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const readCalEvents = (): CalEvent[] => {
  try {
    const ev = JSON.parse(localStorage.getItem(CAL_KEYS.events) || '[]');
    const hidden: string[] = JSON.parse(localStorage.getItem(CAL_KEYS.hidden) || '[]');
    return Array.isArray(ev) ? ev.filter((e: any) => e && e.date && !String(e.id).startsWith('mock-ev-') && !hidden.includes(e.id)) : [];
  } catch {
    return [];
  }
};
/** 캘린더 위젯의 일정을 그대로 읽어와요 (저장 · 동기화되면 자동 반영) */
const useCalEvents = () => {
  const [events, setEvents] = useState<CalEvent[]>(readCalEvents);
  useEffect(() => {
    const re = () => setEvents(readCalEvents());
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === CAL_KEYS.events || e.key === CAL_KEYS.hidden) re();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('class-calendar-refresh', re);
    window.addEventListener('focus', re);
    const t = window.setInterval(re, 20000);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('class-calendar-refresh', re);
      window.removeEventListener('focus', re);
      clearInterval(t);
    };
  }, []);
  return events;
};
const eventOn = (e: CalEvent, key: string) => {
  const s = String(e.date).slice(0, 10);
  const en = String(e.endDate || e.date).slice(0, 10);
  return s <= key && key <= en;
};

interface MiniCalendarStackWidgetProps {
  onShowToast?: (msg: string) => void;
}

// 📅 주요 계기교육 및 기념일 데이터셋
const COMMEMORATIVE_EVENTS: { date: string; title: string; category: string }[] = [
  { date: '03-01', title: '3·1절', category: '국경일' },
  { date: '05-05', title: '어린이날', category: '법정기념일' },
  { date: '05-15', title: '스승의 날', category: '기념일' },
  { date: '06-06', title: '현충일', category: '국경일' },
  { date: '07-17', title: '제헌절', category: '국경일' },
  { date: '08-15', title: '광복절', category: '국경일' },
  { date: '10-03', title: '개천절', category: '국경일' },
  { date: '10-09', title: '한글날', category: '국경일' },
  { date: '10-15', title: '체육의 날', category: '기념일' },
  { date: '10-25', title: '독도의 날', category: '계기교육' },
  { date: '11-03', title: '학생독립운동기념일', category: '계기교육' },
  { date: '12-25', title: '성탄절', category: '공휴일' },
];

const DAYS_SHORT = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 📅 [월단위 미니 캘린더 스택 위젯]
 * - 사용자 요청: 당해 년도 대한민국 국가 공휴일(신정, 설날, 3·1절, 부처님오신날, 어린이날, 광복절, 추석, 개천절, 한글날, 성탄절 및 대체공휴일)을 붉은색 숫자로 표시
 * - 뽀모도로 위젯과 100% 동일한 다크 서피스 컬러(bg-[#101a2d] border-[#1e2c44] text-[#f8fafc])
 * - 월간 7열 그리드 (일~토), 오늘 날짜 하이라이트, 이전달/다음달 이동 컨트롤, 하단 D-Day 요약
 */
export const MiniCalendarStackWidget: React.FC<MiniCalendarStackWidgetProps> = ({ onShowToast }) => {
  const [viewDate, setViewDate] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<number>(() => new Date().getDate());

  const today = useMemo(() => new Date(), []);
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  const isCurrentMonthThisMonth = currentYear === todayYear && currentMonth === todayMonth;
  const calEvents = useCalEvents();
  const [stackIdx, setStackIdx] = useState(0);

  // D-Day 및 기념일 계산 (선택 날짜의 공휴일 우선 연동)
  const todayCommemorative = useMemo(() => {
    // 1. 선택된 날짜가 국가 공휴일인 경우 해당 명칭 우선 표시
    const selectedHoliday = getKoreanHoliday(currentYear, currentMonth + 1, selectedDate);
    if (selectedHoliday) {
      const isTodayHoliday = currentYear === todayYear && currentMonth === todayMonth && selectedDate === todayDate;
      return {
        title: `🇰🇷 ${selectedHoliday.name}`,
        daysLeft: 0,
        isToday: isTodayHoliday,
        isHoliday: true,
      };
    }

    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const dateStr = String(selectedDate).padStart(2, '0');
    const key = `${monthStr}-${dateStr}`;

    const match = COMMEMORATIVE_EVENTS.find((e) => e.date === key);
    if (match) return { title: match.title, daysLeft: 0, isToday: true, isHoliday: false };

    // 다음 가장 가까운 기념일 탐색
    for (const e of COMMEMORATIVE_EVENTS) {
      const [m, d] = e.date.split('-').map(Number);
      const targetDate = new Date(currentYear, m - 1, d);
      const diffDays = Math.ceil((targetDate.getTime() - viewDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        return { title: e.title, daysLeft: diffDays, isToday: false, isHoliday: false };
      }
    }
    return { title: '독도의 날', daysLeft: 8, isToday: false, isHoliday: false };
  }, [currentYear, currentMonth, selectedDate, viewDate, todayYear, todayMonth, todayDate]);

  // 월간 달력 날짜 계산 (대한민국 공휴일 판별 포함)
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 이번달 1일 요일 (0: 일요일)
    const lastDate = new Date(currentYear, currentMonth + 1, 0).getDate(); // 이번달 마지막 날
    const prevLastDate = new Date(currentYear, currentMonth, 0).getDate(); // 지난달 마지막 날

    const days: {
      date: number;
      year: number;
      month: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      dayOfWeek: number;
      isHoliday: boolean;
      holidayName?: string;
    }[] = [];

    // 지난달 날짜 채우기
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevLastDate - i;
      const holiday = getKoreanHoliday(prevYear, prevMonth + 1, d);
      days.push({
        date: d,
        year: prevYear,
        month: prevMonth,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        dayOfWeek: (firstDayIndex - 1 - i) % 7,
        isHoliday: !!holiday,
        holidayName: holiday?.name,
      });
    }

    // 이번달 날짜 채우기
    for (let d = 1; d <= lastDate; d++) {
      const isTd = currentYear === todayYear && currentMonth === todayMonth && d === todayDate;
      const isSel = d === selectedDate;
      const dayOfWeek = new Date(currentYear, currentMonth, d).getDay();
      const holiday = getKoreanHoliday(currentYear, currentMonth + 1, d);
      days.push({
        date: d,
        year: currentYear,
        month: currentMonth,
        isCurrentMonth: true,
        isToday: isTd,
        isSelected: isSel,
        dayOfWeek,
        isHoliday: !!holiday,
        holidayName: holiday?.name,
      });
    }

    // 다음달 날짜로 35칸 또는 42칸 맞추기
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const holiday = getKoreanHoliday(nextYear, nextMonth + 1, d);
      days.push({
        date: d,
        year: nextYear,
        month: nextMonth,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        dayOfWeek: days.length % 7,
        isHoliday: !!holiday,
        holidayName: holiday?.name,
      });
    }

    return days;
  }, [currentYear, currentMonth, todayYear, todayMonth, todayDate, selectedDate, isCurrentMonthThisMonth]);

  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
    setSelectedDate(1);
  };

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
    setSelectedDate(1);
  };

  // 날짜별 일정 개수 (점 표시용)
  const eventCount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of calendarDays) {
      const k = ymd(d.year, d.month, d.date);
      const n = calEvents.filter((e) => eventOn(e, k)).length;
      if (n) map[k] = n;
    }
    return map;
  }, [calendarDays, calEvents]);

  // 선택한 날의 일정 (없으면 이번 달 다가오는 일정)
  const selKey = ymd(currentYear, currentMonth, selectedDate);
  const { cards, cardsLabel } = useMemo(() => {
    const day = calEvents
      .filter((e) => eventOn(e, selKey))
      .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
    if (day.length) return { cards: day, cardsLabel: `${currentMonth + 1}/${selectedDate} 일정` };
    const upcoming = calEvents
      .filter((e) => String(e.endDate || e.date).slice(0, 10) >= selKey)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .slice(0, 8);
    return { cards: upcoming, cardsLabel: upcoming.length ? '다가오는 일정' : '' };
  }, [calEvents, selKey, currentMonth, selectedDate]);
  useEffect(() => setStackIdx(0), [selKey, cards.length]);
  const dayHoliday = getKoreanHoliday(currentYear, currentMonth + 1, selectedDate);

  const handleGoToday = () => {
    const now = new Date();
    setViewDate(now);
    setSelectedDate(now.getDate());
    onShowToast?.('📅 오늘 날짜로 이동했습니다.');
  };

  return (
    <section className="w-full h-full flex flex-col select-none overflow-hidden rounded-2xl p-2 sm:p-2.5 bg-[#101a2d] border border-[#1e2c44] text-[#f8fafc] shadow-md transition-all duration-300" data-mini-cal>
      {/* 🧭 상단 헤더: 연월 표시 & 이전달/오늘/다음달 이동 버튼 */}
      <div className="w-full flex items-center justify-between pb-1 border-b border-[#1e2c44] shrink-0 leading-none">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-lg bg-[#0c1424] text-indigo-400 border border-[#1e2c44] flex items-center justify-center font-bold shrink-0 shadow-xs">
            <CalendarIcon className="w-3 h-3" />
          </div>
          <span className="text-xs font-black tracking-tight text-[#f8fafc]">
            {currentYear}. {String(currentMonth + 1).padStart(2, '0')}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* 오늘 복원 버튼 */}
          <button
            type="button"
            onClick={handleGoToday}
            className={`px-1.5 py-0.5 rounded-md text-[9px] font-black transition cursor-pointer active:scale-95 border ${
              isCurrentMonthThisMonth && selectedDate === todayDate
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                : 'bg-[#0c1424] hover:bg-[#142036] text-indigo-400 border-[#1e2c44]'
            }`}
            title="오늘 날짜로 이동"
          >
            오늘
          </button>

          {/* 이전달 이동 */}
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-5 h-5 rounded-md flex items-center justify-center bg-[#0c1424] hover:bg-[#142036] text-slate-300 border border-[#1e2c44] transition cursor-pointer active:scale-95"
            title="이전 달"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>

          {/* 다음달 이동 */}
          <button
            type="button"
            onClick={handleNextMonth}
            className="w-5 h-5 rounded-md flex items-center justify-center bg-[#0c1424] hover:bg-[#142036] text-slate-300 border border-[#1e2c44] transition cursor-pointer active:scale-95"
            title="다음 달"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 📅 요일 헤더 (일 ~ 토) */}
      <div className="grid grid-cols-7 gap-x-1.5 text-center py-1 text-[10px] font-bold border-b border-[#142036] shrink-0 leading-none">
        {DAYS_SHORT.map((day, idx) => (
          <span
            key={day}
            className={
              idx === 0
                ? 'text-rose-400 font-black'
                : idx === 6
                ? 'text-sky-400 font-black'
                : 'text-slate-400 font-semibold'
            }
          >
            {day}
          </span>
        ))}
      </div>

      {/* 🔢 월단위 날짜 그리드 (7열) - 대한민국 법정 공휴일은 붉은색(text-rose-400 font-extrabold)으로 강조 */}
      <div className="grid grid-cols-7 gap-x-1.5 gap-y-1 text-center py-1.5 shrink-0 items-center">
        {calendarDays.map((item, idx) => {
          // 대한민국 공휴일이거나 일요일인 경우 붉은색 스타일 적용
          const isRedDay = item.dayOfWeek === 0 || item.isHoliday;
          const evN = eventCount[ymd(item.year, item.month, item.date)] || 0;
          const tooltip = `${item.date}일${item.holidayName ? ` [공휴일: ${item.holidayName}]` : ''}${evN ? ` · 일정 ${evN}개` : ''}`;

          return (
            <button
              key={idx}
              type="button"
              disabled={!item.isCurrentMonth}
              title={tooltip}
              onClick={() => {
                if (item.isCurrentMonth) {
                  setSelectedDate(item.date);
                  if (item.holidayName) {
                    onShowToast?.(`🇰🇷 ${item.date}일은 국가 공휴일 [${item.holidayName}]입니다.`);
                  }
                }
              }}
              className={`h-[22px] rounded-md text-[11px] flex items-center justify-center transition-all leading-none relative group cursor-pointer ${
                !item.isCurrentMonth
                  ? isRedDay
                    ? 'text-rose-400/40 opacity-30 cursor-default'
                    : item.dayOfWeek === 6
                    ? 'text-sky-400/40 opacity-30 cursor-default'
                    : 'text-slate-600/40 opacity-20 cursor-default'
                  : item.isToday
                  ? 'bg-indigo-600 text-white font-black shadow-sm ring-1.5 ring-indigo-400/70 scale-105 z-10'
                  : item.isSelected
                  ? `bg-[#1e2e4f] font-black border border-indigo-400/50 ${
                      isRedDay ? 'text-rose-400' : item.dayOfWeek === 6 ? 'text-sky-300' : 'text-indigo-300'
                    }`
                  : isRedDay
                  ? 'text-rose-400 font-black hover:bg-[#142036]'
                  : item.dayOfWeek === 6
                  ? 'text-sky-400 font-bold hover:bg-[#142036]'
                  : 'text-slate-200 font-medium hover:bg-[#142036]'
              }`}
            >
              {item.date}
              {/* 공휴일인 경우 미세한 붉은 점(dot) 표시로 가독성 및 직관성 향상 */}
              {item.isCurrentMonth && evN > 0 ? (
                <span className="mcal-dot" data-mcal-dot aria-hidden />
              ) : item.isCurrentMonth && item.isHoliday && !item.isToday ? (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-rose-500/80 pointer-events-none" />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* 🗂 일정 카드 (많으면 스택으로 겹쳐 보여요 · 눌러서 넘기기) */}
      <div className="mcal-events flex-1 min-h-0" data-mcal-events>
        <div className="mcal-ev-head">
          <span>{cardsLabel || `${currentMonth + 1}/${selectedDate}`}</span>
          {dayHoliday && <em>🇰🇷 {dayHoliday.name}</em>}
          {cards.length > 1 && (
            <b>
              {stackIdx + 1}/{cards.length}
            </b>
          )}
        </div>
        {cards.length === 0 ? (
          <div className="mcal-empty">등록된 일정이 없어요</div>
        ) : (
          <div className="mcal-stack" data-mcal-stack>
            {(() => {
              const order = cards.map((_, k) => cards[(stackIdx + 1 + k) % cards.length]).slice(-5);
              return order.map((e, k) => {
                const front = k === order.length - 1;
                const sd = String(e.date).slice(5, 10).replace('-', '/');
                const ed = e.endDate && e.endDate !== e.date ? `~${String(e.endDate).slice(5, 10).replace('-', '/')}` : '';
                return (
                  <button
                    type="button"
                    key={e.id}
                    className={`mcal-card ${front ? 'is-front' : ''}`}
                    style={{ zIndex: k + 1 }}
                    onClick={() => {
                      if (front) setStackIdx((i) => (i + 1) % cards.length);
                      else setStackIdx(cards.indexOf(e));
                    }}
                    title={front && cards.length > 1 ? '눌러서 다음 일정 보기' : e.title}
                  >
                    <i className="mcal-card-date">
                      {sd}
                      {ed}
                    </i>
                    <span className="mcal-card-title">{e.title}</span>
                    {front && e.time && <small className="mcal-card-time">⏰ {e.time}</small>}
                  </button>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* 📌 하단 학사일정 / 공휴일 / D-Day 요약 카드 */}
      <div className="pt-0.5 border-t border-[#1e2c44] flex items-center justify-between text-[9px] shrink-0 leading-none">
        <div className="flex items-center gap-1 truncate text-slate-300">
          <Sparkles className="w-2.5 h-2.5 text-amber-400 shrink-0" />
          <span className="truncate font-semibold">{todayCommemorative.title}</span>
        </div>
        <span
          className={`px-1.5 py-[2px] rounded-md font-black shrink-0 leading-none border ${
            todayCommemorative.isHoliday
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
          }`}
        >
          {todayCommemorative.daysLeft > 0
            ? `D-${todayCommemorative.daysLeft}`
            : todayCommemorative.isToday
            ? '오늘'
            : todayCommemorative.isHoliday
            ? '공휴일'
            : 'D-Day'}
        </span>
      </div>
    </section>
  );
};

