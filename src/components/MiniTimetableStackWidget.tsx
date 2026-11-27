import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, Clock, ChevronRight, Sparkles, RefreshCw } from 'lucide-react';
import { DailySchedule, SchedulePeriod, ClassConfig } from '../types';
import { getDayTypeInfo } from '../utils/koreanHolidays';
import { useHomework, HW_KINDS, dueLabel, missingOf, readStudents } from '../utils/homeworkStore';

interface MiniTimetableStackWidgetProps {
  schedule: DailySchedule;
  config?: ClassConfig;
  onShowToast?: (msg: string) => void;
  onExpandToCanvas?: () => void;
  /** 높이 재기용 숨은 사본이면 과제 칸을 빼요 */
  measureOnly?: boolean;
}

const WEEKDAYS = ['월', '화', '수', '목', '금'];

/**
 * 📅 [MiniTimetableStackWidget] 좌측 스택 전용 미니 수업 시간표 카드
 * - 기본적으로 오늘 시간표를 리스트 형태로 표시
 * - 카드 영역 클릭 시 오늘 ⇄ 내일 시간표 부드러운 토글 전환
 * - 시정표(bellSchedule) 및 현재 시각을 실시간 대조하여 현재 진행 중인 교시에 부드러운 음영 하이라이트 적용
 */
export const MiniTimetableStackWidget: React.FC<MiniTimetableStackWidgetProps> = ({
  schedule,
  config,
  onShowToast,
  onExpandToCanvas, measureOnly}) => {
  // 오늘 ⇄ 내일 토글 상태 (false: 오늘, true: 내일)
  const [isTomorrow, setIsTomorrow] = useState<boolean>(false);

  // 실시간 시각 동기화 (1분마다 갱신)
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // 오늘 요일 계산 (0: 일, 1: 월, ..., 5: 금, 6: 토)
  const todayDayIdx = currentTime.getDay();
  const isWeekend = todayDayIdx === 0 || todayDayIdx === 6;
  const todayWeekday = todayDayIdx >= 1 && todayDayIdx <= 5 ? WEEKDAYS[todayDayIdx - 1] : '월';

  // 내일 요일 계산 (금/토/일은 월요일)
  const tomorrowWeekday = useMemo(() => {
    const idx = WEEKDAYS.indexOf(todayWeekday);
    if (idx === -1 || idx === WEEKDAYS.length - 1) return '월';
    return WEEKDAYS[idx + 1];
  }, [todayWeekday]);

  // 현재 표시할 요일
  const activeDay = isTomorrow ? tomorrowWeekday : todayWeekday;

  // 🔔 시정표(bellSchedule)에서 활성화된 교시 목록 추출
  const enabledPeriodNumbers = useMemo<number[]>(() => {
    if (!config?.bellSchedule || config.bellSchedule.length === 0) {
      return [1, 2, 3, 4, 5, 6];
    }
    const enabledList = config.bellSchedule
      .filter((item) => item && item.type !== 'lunch' && item.type !== 'LUNCH' && item.enabled !== false)
      .map((item) => item.period);
    return enabledList.length > 0 ? enabledList : [1, 2, 3, 4, 5, 6];
  }, [config?.bellSchedule]);

  // 해당 요일의 시간표 데이터 필터링
  const rawPeriods: SchedulePeriod[] = schedule[activeDay] || schedule['월'] || [];
  const currentPeriods = useMemo(() => {
    return rawPeriods.filter((p) => enabledPeriodNumbers.includes(p.period));
  }, [rawPeriods, enabledPeriodNumbers]);

  // 현재 시각 "HH:MM" 형식
  const currentHHMM = useMemo(() => {
    const hours = String(currentTime.getHours()).padStart(2, '0');
    const minutes = String(currentTime.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }, [currentTime]);

  // 🕒 현재 진행 중인 교시 번호 판별 (오늘 날짜이고 평일일 때만 유효)
  const activeCurrentPeriodNumber = useMemo(() => {
    if (isTomorrow || isWeekend) return null;
    if (!config?.bellSchedule || config.bellSchedule.length === 0) return null;

    const matchedBell = config.bellSchedule.find((item) => {
      if (!item || item.type === 'lunch' || item.type === 'LUNCH' || item.enabled === false) return false;
      if (!item.start || !item.end) return false;
      return currentHHMM >= item.start && currentHHMM <= item.end;
    });

    return matchedBell ? matchedBell.period : null;
  }, [isTomorrow, isWeekend, config?.bellSchedule, currentHHMM]);

  // 스마트 날짜 속성(공휴일, 재량휴업일 등) 판독
  const dayTypeInfo = useMemo(() => getDayTypeInfo(currentTime, schedule), [currentTime, schedule]);

  // 📮 과제 · 알림장 검사 위젯에 적힌 내용 (검사 끝난 것은 빼고)
  const [hwTasks] = useHomework();
  const openTasks = useMemo(
    () => (measureOnly ? [] : hwTasks.filter((t) => !t.closed).sort((a, b) => String(a.due || '').localeCompare(String(b.due || '')))),
    [hwTasks, measureOnly]
  );
  const hwStudents = useMemo(() => (openTasks.length ? readStudents() : []), [openTasks]);

  // 시간표 카드 클릭 토글 핸들러
  const handleToggleDay = (e: React.MouseEvent) => {
    // 내부 버튼 클릭 시 부모 클릭 전파 방지
    const target = e.target as HTMLElement;
    if (target.closest('[data-no-toggle]')) return;

    setIsTomorrow((prev) => {
      const next = !prev;
      onShowToast?.(next ? '📅 내일 시간표로 전환되었습니다.' : '📅 오늘 시간표로 전환되었습니다.');
      return next;
    });
  };

  return (
    <div
      onClick={handleToggleDay}
      title="클릭 시 오늘 ⇄ 내일 시간표가 토글 전환됩니다."
      className="w-full h-full flex flex-col justify-between p-2.5 rounded-2xl bg-[#101a2d]/95 text-[#f8fafc] border border-[#1e2c44] shadow-md hover:border-indigo-500/40 transition-all duration-200 select-none cursor-pointer group overflow-hidden"
    >
      {/* 1. 상단 미니 헤더: 오늘/내일 뱃지 및 토글 인디케이터 */}
      <div className="flex items-center justify-between pb-1.5 border-b border-[#1e2c44]/80 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Clock className="w-3 h-3" />
          </div>
          <span className="text-xs font-black tracking-tight text-white flex items-center gap-1">
            <span>{isTomorrow ? '내일 시간표' : '오늘 시간표'}</span>
            <span className="text-[10px] font-bold text-indigo-300">({activeDay})</span>
          </span>
          {isWeekend && !isTomorrow && (
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              주말
            </span>
          )}
          {dayTypeInfo.type === 'holiday' && !isTomorrow && (
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              휴일
            </span>
          )}
        </div>

        {/* 오늘 ⇄ 내일 토글 버튼 & 안내 */}
        <div className="flex items-center gap-1">
          <span className="text-[9.5px] font-semibold text-slate-400 group-hover:text-indigo-300 transition-colors flex items-center gap-0.5">
            <RefreshCw className="w-2.5 h-2.5 animate-spin-slow opacity-70 group-hover:opacity-100" />
            <span className="hidden sm:inline">{isTomorrow ? '오늘 보기' : '내일 보기'}</span>
          </span>
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-white/10 group-hover:bg-indigo-500/30 text-slate-300 group-hover:text-white transition">
            {isTomorrow ? '내일' : '오늘'}
          </span>
        </div>
      </div>

      {/* 2. 교시별 시간표 리스트 (스크롤 가능, 현재 교시 부드러운 음영 하이라이트) */}
      <div className={`${openTasks.length ? 'shrink-0 max-h-[60%]' : 'flex-1'} my-1 overflow-y-auto space-y-1 pr-0.5 custom-scrollbar min-h-0`}>
        {currentPeriods.length > 0 ? (
          currentPeriods.map((item) => {
            const isCurrent = activeCurrentPeriodNumber === item.period;
            // 시정표에서 해당 교시의 시작~종료 시각 찾기
            const bellItem = config?.bellSchedule?.find((b) => b && b.period === item.period);
            const timeRange = bellItem && bellItem.start && bellItem.end ? `${bellItem.start}~${bellItem.end}` : '';

            return (
              <div
                key={item.period}
                className={`flex items-center justify-between px-2 py-1 rounded-lg text-xs transition-all ${
                  isCurrent
                    ? 'bg-indigo-600/30 border border-indigo-400/50 shadow-xs ring-1 ring-indigo-400/30'
                    : 'bg-[#16233b]/70 hover:bg-[#1c2d4a]/80 border border-white/5'
                }`}
              >
                {/* 좌측: 교시 번호 & 과목명 */}
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-5 h-5 rounded-md flex items-center justify-center font-extrabold text-[10.5px] shrink-0 ${
                      isCurrent
                        ? 'bg-indigo-500 text-white shadow-2xs font-black'
                        : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {item.period}
                  </span>
                  <span
                    className={`font-bold truncate ${
                      isCurrent ? 'text-indigo-100 font-black' : 'text-slate-200'
                    }`}
                  >
                    {item.subject || '자율학습'}
                  </span>
                </div>

                {/* 우측: 시정표 시간 및 현재 교시 뱃지 */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {timeRange && (
                    <span className="text-[10px] text-slate-400 font-medium">
                      {timeRange}
                    </span>
                  )}
                  {isCurrent && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-indigo-500 text-white shadow-xs animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                      <span>수업중</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-4 text-center">
            <Calendar className="w-6 h-6 opacity-40 mb-1 text-indigo-400" />
            <span>등록된 수업 시간표가 없습니다.</span>
          </div>
        )}
      </div>

      {/* 📮 남은 칸: 과제 · 알림장 검사 내용 */}
      {openTasks.length > 0 && (
        <div className="tt-hw flex-1 min-h-0 overflow-y-auto custom-scrollbar" data-no-toggle data-tt-homework onClick={(e) => e.stopPropagation()}>
          <div className="tt-hw-head">
            <span>📮 과제 · 알림장</span>
            <b>{openTasks.length}건</b>
          </div>
          {openTasks.map((t) => {
            const total = hwStudents.length - t.excused.length;
            const doneN = t.done.length;
            const miss = missingOf(t, hwStudents);
            const pct = total > 0 ? Math.round((doneN / total) * 100) : 0;
            return (
              <div key={t.id} className="tt-hw-item" title={miss.length ? `안 낸 친구: ${miss.map((x) => x.name).join(', ')}` : '모두 냈어요'}>
                <div className="tt-hw-row">
                  <span className="tt-hw-title">
                    {HW_KINDS[t.kind]?.emoji} {t.title}
                  </span>
                  <span className={`tt-hw-count ${miss.length ? '' : 'is-done'}`}>{miss.length ? `미제출 ${miss.length}` : '완료'}</span>
                </div>
                <div className="tt-hw-sub">
                  <span>{dueLabel(t)}</span>
                  <span>
                    {doneN}/{Math.max(total, 0)}
                  </span>
                </div>
                <i className="tt-hw-bar">
                  <i style={{ width: `${pct}%` }} />
                </i>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. 하단 풋터 안내 바 */}
      <div className="pt-1 border-t border-[#1e2c44]/60 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
        <span className="flex items-center gap-1 text-[9.5px]">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          <span>클릭하여 오늘 ⇄ 내일 시간표 토글</span>
        </span>
        <span className="text-slate-400 font-bold text-[9px]">
          총 {currentPeriods.length}교시
        </span>
      </div>
    </div>
  );
};
