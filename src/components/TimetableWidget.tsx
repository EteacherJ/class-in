import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Calendar, Clock, BookOpen, CheckCircle2, Bold, Italic, Underline, List, Palette, Trash2, Edit3 } from 'lucide-react';
import { DailySchedule, SchedulePeriod, ClassConfig } from '../types';
import { getDayTypeInfo } from '../utils/koreanHolidays';
import { sanitizeRichHtml } from '../utils/sanitizeHtml';

interface TimetableWidgetProps {
  schedule: DailySchedule;
  config?: ClassConfig;
  onShowToast: (msg: string) => void;
}

/**
 * 📅 [수업 시간표 위젯]
 * - 오늘 시간표 + 내일 시간표 동시 노출
 * - PART 2: 환경설정 시정표(bellSchedule)의 교시별 선택 체크박스(enabled !== false)와 연동되어,
 *   활성화된 교시만 대시보드에 깔끔하게 필터링되어 노출 (단축수업일 즉각 지원)
 * - 세로 리사이징 시 내부 스크롤 영역 유연 확장
 */
export const TimetableWidget: React.FC<TimetableWidgetProps> = ({ schedule, config, onShowToast }) => {
  const days = ['월', '화', '수', '목', '금'];

  // 현재 실제 요일 계산 (0: 일, 1: 월, ..., 5: 금, 6: 토)
  const todayIndex = new Date().getDay();
  const defaultToday = todayIndex >= 1 && todayIndex <= 5 ? days[todayIndex - 1] : '월';

  const [selectedDay, setSelectedDay] = useState<string>(defaultToday);
  // 메모는 처음 한 번만 채워요 (다시 그릴 때마다 덮어쓰면 커서가 맨 앞으로 튀어요)
  const memoInitialHtml = useMemo(() => ({ __html: typeof window !== 'undefined' ? sanitizeRichHtml(localStorage.getItem('class_timetable_memo')) : '' }), []);

  // 내일 요일 자동 계산 (금/토/일은 다음 주 월요일)
  const getNextSchoolDay = (day: string) => {
    const idx = days.indexOf(day);
    if (idx === -1 || idx === days.length - 1) return '월';
    return days[idx + 1];
  };

  const tomorrowDay = getNextSchoolDay(selectedDay);

  // 💡 PART 2: bellSchedule에서 활성화(enabled !== false)된 교시 번호 목록 추출
  const enabledPeriodNumbers = useMemo<number[]>(() => {
    if (!config?.bellSchedule || config.bellSchedule.length === 0) {
      return [1, 2, 3, 4, 5, 6];
    }
    const enabledList = config.bellSchedule
      .filter((item) => item && item.type !== 'lunch' && item.type !== 'LUNCH' && item.enabled !== false)
      .map((item) => item.period);
    return enabledList.length > 0 ? enabledList : [1, 2, 3, 4, 5, 6];
  }, [config?.bellSchedule]);

  const rawTodayPeriods: SchedulePeriod[] = schedule[selectedDay] || schedule['월'] || [];
  const rawTomorrowPeriods: SchedulePeriod[] = schedule[tomorrowDay] || schedule['화'] || [];

  // 활성화된 교시만 필터링
  const todayPeriods = useMemo(() => {
    return rawTodayPeriods.filter((p) => enabledPeriodNumbers.includes(p.period));
  }, [rawTodayPeriods, enabledPeriodNumbers]);

  const tomorrowPeriods = useMemo(() => {
    return rawTomorrowPeriods.filter((p) => enabledPeriodNumbers.includes(p.period));
  }, [rawTomorrowPeriods, enabledPeriodNumbers]);

  // 📅 오늘 날짜의 스마트 속성(주말, 공휴일, 재량휴업일) 판독
  const todayDayType = useMemo(() => getDayTypeInfo(new Date(), schedule), [schedule]);

  // 선택된 요일이 재량휴업일인지 확인 (1교시 과목명이 '재량휴업'인 경우)
  const isSelectedDayDiscretionary = useMemo(() => {
    return rawTodayPeriods.some(
      (p) => Number(p.period) === 1 && p.subject && p.subject.includes('재량휴업')
    );
  }, [rawTodayPeriods]);

  // 선택된 요일 기준 상태 라벨
  const activeDayStatusLabel = isSelectedDayDiscretionary
    ? '재량휴업일'
    : todayIndex === 0 || todayIndex === 6
    ? '주말'
    : todayDayType.type === 'holiday'
    ? `휴일 (${todayDayType.holidayName})`
    : todayDayType.type === 'discretionary'
    ? '재량휴업일'
    : null;

  return (
    <section className="w-full h-full p-4 sm:p-5 flex flex-col justify-between select-none overflow-hidden">
      {/* 1. 위젯 상단 헤더 & 요일 선택기 */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shadow-xs">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-black text-sm text-slate-900 dark:text-slate-100">수업 시간표</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">
              ({selectedDay}요일 기준)
            </span>
            {activeDayStatusLabel && (
              <span
                className={`text-[9.5px] font-black px-1.5 py-0.2 rounded-md border flex items-center gap-0.5 shadow-2xs ${
                  isSelectedDayDiscretionary || todayDayType.type === 'discretionary'
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/40'
                    : todayDayType.type === 'holiday'
                    ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-400/40'
                    : 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-400/40'
                }`}
              >
                {activeDayStatusLabel}
              </span>
            )}
          </div>
        </div>

        {/* 요일 전환 버튼 그룹 */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0c1424] border border-transparent dark:border-[#1e2c44] p-0.5 rounded-xl">
          {days.map((d) => {
            const isDayDiscretionary = (schedule[d] || []).some(
              (p: any) => (p.period === 1 || p.period === '1') && p.subject && p.subject.includes('재량휴업')
            );
            return (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setSelectedDay(d);
                  onShowToast(`📅 ${d}요일 시간표로 전환되었습니다.`);
                }}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition cursor-pointer relative ${
                  selectedDay === d
                    ? 'bg-white dark:bg-[#101a2d] text-indigo-600 dark:text-indigo-400 shadow-2xs border border-transparent dark:border-[#1e2c44]'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {d}
                {isDayDiscretionary && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 ring-1 ring-white dark:ring-slate-900" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 메인 스크롤 콘텐츠 영역 (오늘 시간표 + 내일 시간표 동시 노출) */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scroll py-2.5 space-y-3 pr-1">
        {/* A. 오늘(선택된 날)의 수업 시간표 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-black text-slate-700 dark:text-slate-300 px-0.5">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>오늘 ({selectedDay}요일) 수업</span>
              {activeDayStatusLabel && (
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 ml-1">
                  • {activeDayStatusLabel}
                </span>
              )}
            </span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
              총 {todayPeriods.length}교시 운영
            </span>
          </div>

          <div
            className={`grid gap-1.5 text-center ${
              todayPeriods.length <= 4
                ? 'grid-cols-4'
                : todayPeriods.length <= 5
                ? 'grid-cols-5'
                : 'grid-cols-6'
            }`}
          >
            {todayPeriods.map((p) => {
              const isDiscretionaryPeriod = p.subject && p.subject.includes('재량휴업');
              return (
                <div
                  key={p.period}
                  className={`p-2 rounded-xl border transition shadow-2xs backdrop-blur-xs ${
                    isDiscretionaryPeriod
                      ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 ring-1 ring-amber-400/40'
                      : 'bg-white/60 dark:bg-[#0c1424]/80 hover:bg-white/90 dark:hover:bg-[#142036] border-slate-200/60 dark:border-[#1e2c44]'
                  }`}
                >
                  <div className={`text-[9px] font-mono font-bold ${isDiscretionaryPeriod ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-sky-300'}`}>
                    {p.period}교시
                  </div>
                  <div className={`text-xs font-black truncate mt-0.5 ${isDiscretionaryPeriod ? 'text-amber-800 dark:text-amber-200 font-black' : 'text-slate-800 dark:text-slate-100'}`}>
                    {p.subject}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* B. 내일 수업 시간표 & 준비물 안내 */}
        <div className="p-3 rounded-2xl bg-white/40 dark:bg-[#0c1424]/80 border border-indigo-200/60 dark:border-[#1e2c44] space-y-2 backdrop-blur-xs">
          <div className="flex items-center justify-between text-xs font-black text-indigo-950 dark:text-indigo-200">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>내일 ({tomorrowDay}요일) 수업 시간표 &amp; 준비물</span>
            </span>
            <span className="text-[10px] bg-indigo-100/80 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 font-extrabold px-2 py-0.5 rounded-full border border-indigo-200/40 dark:border-indigo-800/40">
              내일 미리보기
            </span>
          </div>

          {/* 내일 활성 교시 레일 */}
          <div
            className={`grid gap-1 text-center ${
              tomorrowPeriods.length <= 4
                ? 'grid-cols-4'
                : tomorrowPeriods.length <= 5
                ? 'grid-cols-5'
                : 'grid-cols-6'
            }`}
          >
            {tomorrowPeriods.map((p) => (
              <div
                key={`tomorrow-${p.period}`}
                className="p-1.5 rounded-lg bg-white/80 dark:bg-[#151f32]/90 border border-indigo-100/70 dark:border-[#1e2c44] text-slate-800 dark:text-slate-100 shadow-2xs"
              >
                <div className="text-[9px] font-mono text-indigo-600 dark:text-sky-300 font-bold">
                  {p.period}교시
                </div>
                <div className="text-[11px] font-black truncate">{p.subject}</div>
              </div>
            ))}
          </div>

          {/* 내일 준비물 팁 */}
          <div className="pt-1 flex items-center justify-between text-[10px] font-bold text-indigo-800 dark:text-indigo-300 border-t border-indigo-200/60 dark:border-[#1e2c44]">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>내일 준비물: 교과서, 알림장, 필기도구 챙기기</span>
            </span>
            <span className="opacity-80">하교 전 확인</span>
          </div>
        </div>

        {/* C. 키보드 서식 지원 텍스트 메모 에디터 */}
        <div className="pt-1.5 flex flex-col space-y-1.5">
          <div className="flex items-center justify-between flex-wrap gap-1.5">
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
              <span>메모</span>
            </span>

            {/* 상단 한 줄 툴바 */}
            <div className="flex flex-wrap items-center gap-1 bg-white/60 dark:bg-[#0c1424]/90 p-0.5 rounded-lg border border-slate-200/60 dark:border-[#1e2c44] shadow-2xs">
              <button
                type="button"
                onClick={() => document.execCommand('bold', false)}
                className="w-6 h-6 rounded flex items-center justify-center font-bold text-xs hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer transition shadow-2xs"
                title="굵게 (Ctrl+B)"
              >
                <Bold className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => document.execCommand('italic', false)}
                className="w-6 h-6 rounded flex items-center justify-center text-xs hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer transition shadow-2xs"
                title="기울임 (Ctrl+I)"
              >
                <Italic className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => document.execCommand('underline', false)}
                className="w-6 h-6 rounded flex items-center justify-center text-xs hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer transition shadow-2xs"
                title="밑줄 (Ctrl+U)"
              >
                <Underline className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => document.execCommand('insertUnorderedList', false)}
                className="w-6 h-6 rounded flex items-center justify-center text-xs hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer transition shadow-2xs"
                title="원형 글머리 기호 (•)"
              >
                <List className="w-3 h-3" />
              </button>

              <div className="h-3 w-[1px] bg-slate-300 dark:bg-slate-600 mx-0.5" />

              {/* 텍스트 색상 팔레트 */}
              <div className="flex items-center gap-1 px-1">
                {[
                  { color: '#0f172a', title: '기본' },
                  { color: '#4f46e5', title: '인디고' },
                  { color: '#dc2626', title: '빨강' },
                  { color: '#059669', title: '초록' },
                ].map((c) => (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() => document.execCommand('foreColor', false, c.color)}
                    className="w-3.5 h-3.5 rounded-full border border-black/10 transition cursor-pointer hover:scale-125"
                    style={{ backgroundColor: c.color }}
                    title={c.title}
                  />
                ))}
              </div>

              <div className="h-3 w-[1px] bg-slate-300 dark:bg-slate-600 mx-0.5" />

              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('timetable-rich-memo');
                  if (el) {
                    el.innerHTML = '';
                    localStorage.removeItem('class_timetable_memo');
                    onShowToast('🗑️ 메모 내용이 초기화되었습니다.');
                  }
                }}
                className="px-1.5 py-0.5 rounded text-[10px] text-slate-400 hover:text-rose-500 font-bold transition cursor-pointer flex items-center gap-0.5"
                title="메모 비우기"
              >
                <Trash2 className="w-3 h-3" />
                <span>지우기</span>
              </button>
            </div>
          </div>

          <div
            id="timetable-rich-memo"
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => {
              // 🛡️ 저장 시에도 정화된 HTML만 보관 (저장형 XSS 차단)
              localStorage.setItem('class_timetable_memo', sanitizeRichHtml(e.currentTarget.innerHTML));
            }}
            onPaste={(e) => {
              // 🛡️ 웹페이지에서 복사한 HTML은 기본 서식만 남기고 정화하여 붙여넣기
              const html = e.clipboardData.getData('text/html');
              if (!html) return;
              e.preventDefault();
              document.execCommand('insertHTML', false, sanitizeRichHtml(html));
            }}
            dangerouslySetInnerHTML={memoInitialHtml}
            data-placeholder="시간표 관련 메모, 알림 사항을 자유롭게 입력하세요..."
            className="w-full min-h-[70px] max-h-[140px] overflow-y-auto p-2.5 rounded-xl bg-white/70 dark:bg-[#0c1424]/90 border border-slate-200/70 dark:border-[#1e2c44] text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-400 empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 dark:empty:before:text-slate-500 custom-scroll leading-relaxed backdrop-blur-xs"
          />
        </div>
      </div>
    </section>
  );
};
