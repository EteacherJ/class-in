import React, { useState, useEffect, useMemo } from 'react';
import { CalendarDays, Pin, ChevronRight, Sparkles, Clock, Tag } from 'lucide-react';
import { DDayItem } from '../types';
import { initialDDays } from '../data/mealAndDDayData';

interface MiniDDayStackWidgetProps {
  onShowToast?: (msg: string) => void;
  onExpandToCanvas?: () => void;
}

const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 🎯 [MiniDDayStackWidget] 좌측 스택 전용 미니 D-day 카드
 * - D-day 목표 날짜(Date)와 행사 내용(Content)을 깔끔하고 높은 시인성으로 표시
 * - 상단 메인 하이라이트 D-day 카드 + 하단 다가오는 행사 일정 리스트 구조
 * - localStorage 및 핀 고정 이벤트('dday_pinned_changed') 실시간 연동
 */
export const MiniDDayStackWidget: React.FC<MiniDDayStackWidgetProps> = ({
  onShowToast,
  onExpandToCanvas,
}) => {
  const [ddayList, setDdayList] = useState<DDayItem[]>(() => {
    try {
      const saved = localStorage.getItem('class_dday_items');
      if (saved) return JSON.parse(saved);
    } catch {}
    return initialDDays;
  });

  const [pinnedHeaderId, setPinnedHeaderId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('class_dday_pinned_id') || null;
    } catch {
      return null;
    }
  });

  // localStorage 변경 및 커스텀 이벤트 감지
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('class_dday_items');
        if (saved) setDdayList(JSON.parse(saved));
        setPinnedHeaderId(localStorage.getItem('class_dday_pinned_id') || null);
      } catch {}
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('dday_pinned_changed', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('dday_pinned_changed', handleStorageChange);
    };
  }, []);

  // 오늘 자정 기준 Date 객체
  const todayMidnight = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // 각 D-Day 항목의 잔여일 계산 및 정렬 (핀 고정 우선 -> 다가오는 일정 순 -> 지난 일정 순)
  const calculatedList = useMemo(() => {
    return ddayList.map((item) => {
      const rawDate = item.targetDate || (item as any).date || '';
      const formattedDate = rawDate ? rawDate.split('T')[0] : '';
      const targetDate = new Date(rawDate);
      targetDate.setHours(0, 0, 0, 0);
      const diffTime = targetDate.getTime() - todayMidnight.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      const dayOfWeek = WEEKDAY_NAMES[targetDate.getDay()] || '';

      return {
        ...item,
        formattedDate,
        diffDays,
        dayOfWeek,
        isPinned: item.id === pinnedHeaderId,
      };
    }).sort((a, b) => {
      // 핀 고정 항목 최우선
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      // 둘 다 미래이거나 오늘인 경우 (diffDays >= 0) 빠른 순
      if (a.diffDays >= 0 && b.diffDays >= 0) return a.diffDays - b.diffDays;
      // 미래 항목이 지난 항목보다 우선
      if (a.diffDays >= 0 && b.diffDays < 0) return -1;
      if (a.diffDays < 0 && b.diffDays >= 0) return 1;
      // 둘 다 지난 항목이면 최근 지난 순
      return b.diffDays - a.diffDays;
    });
  }, [ddayList, pinnedHeaderId, todayMidnight]);

  // 메인 하이라이트 항목 (가장 우선순위 높은 1개)
  const topItem = calculatedList[0] || null;
  // 서브 리스트 항목들
  const subList = calculatedList.slice(1);

  // D-Day 뱃지 포맷 함수
  const formatDDayBadge = (diffDays: number) => {
    if (diffDays === 0) return { text: 'D-DAY', color: 'bg-rose-500 text-white animate-pulse' };
    if (diffDays > 0) return { text: `D-${diffDays}`, color: 'bg-indigo-500 text-white font-bold' };
    return { text: `D+${Math.abs(diffDays)}`, color: 'bg-slate-600 text-slate-200' };
  };

  return (
    <div className="w-full h-full flex flex-col justify-between p-2.5 rounded-2xl bg-[#101a2d]/95 text-[#f8fafc] border border-[#1e2c44] shadow-md hover:border-rose-500/30 transition-all select-none overflow-hidden">
      {/* 1. 상단 미니 헤더 */}
      <div className="flex items-center justify-between pb-1.5 border-b border-[#1e2c44]/80 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
            <CalendarDays className="w-3 h-3" />
          </div>
          <span className="text-xs font-black tracking-tight text-white flex items-center gap-1">
            <span>주요 D-day</span>
            <span className="text-[10px] font-bold text-rose-300">({calculatedList.length}개)</span>
          </span>
        </div>

        {topItem && (
          <span className="text-[9.5px] font-bold text-slate-400 flex items-center gap-1">
            {topItem.isPinned ? (
              <span className="flex items-center gap-0.5 text-amber-400 font-extrabold">
                <Pin className="w-2.5 h-2.5 fill-amber-400" />
                <span>고정 행사</span>
              </span>
            ) : (
              <span>가장 가까운 행사</span>
            )}
          </span>
        )}
      </div>

      {/* 2. D-Day 본문 영역 */}
      {topItem ? (
        <div className="flex-1 flex flex-col justify-between my-1.5 min-h-0 overflow-hidden">
          {/* A. 메인 하이라이트 D-Day 카드 (목표 날짜 + 행사 내용 시인성 극대화) */}
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#16233b] to-[#1e2e4f] border border-rose-500/30 shadow-xs relative overflow-hidden shrink-0">
            <div className="flex items-center justify-between gap-1 mb-1">
              {/* 목표 날짜 (YYYY.MM.DD 요일) */}
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-200">
                <span className="text-rose-400">📅</span>
                <span className="text-rose-200 tracking-tight">{topItem.formattedDate || topItem.targetDate}</span>
                <span className="text-[10px] text-rose-300/80 font-bold">({topItem.dayOfWeek})</span>
              </div>

              {/* D-Day 뱃지 */}
              {(() => {
                const badge = formatDDayBadge(topItem.diffDays);
                return (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shadow-xs tracking-wider ${badge.color}`}>
                    {badge.text}
                  </span>
                );
              })()}
            </div>

            {/* 행사 내용 (Content) */}
            <div className="flex flex-col gap-0.5 mt-1">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-black text-white truncate tracking-tight">
                  {topItem.title}
                </h4>
                {topItem.category && (
                  <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-white/10 text-slate-300 shrink-0">
                    {topItem.category}
                  </span>
                )}
              </div>
              {topItem.note && (
                <p className="text-[10px] text-slate-300/80 truncate font-medium">
                  {topItem.note}
                </p>
              )}
            </div>
          </div>

          {/* B. 다음 일정 미니 리스트 (2번째 이후) */}
          <div className="flex-1 overflow-y-auto mt-1.5 space-y-1 pr-0.5 custom-scrollbar min-h-0">
            {subList.length > 0 ? (
              subList.map((item) => {
                const badge = formatDDayBadge(item.diffDays);
                const displayDate = item.formattedDate ? item.formattedDate.slice(5) : '';
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-[#16233b]/60 hover:bg-[#1a2b47] border border-white/5 text-xs transition"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] text-slate-400 font-bold shrink-0">
                        {displayDate} ({item.dayOfWeek})
                      </span>
                      <span className="font-bold text-slate-200 truncate text-[11px]">
                        {item.title}
                      </span>
                    </div>
                    <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black shrink-0 ${badge.color}`}>
                      {badge.text}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex items-center justify-center text-[10px] text-slate-400 py-1">
                다음 예정된 추가 일정이 없습니다.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs py-4 text-center">
          <CalendarDays className="w-6 h-6 opacity-40 mb-1 text-rose-400" />
          <span>등록된 D-day 일정이 없습니다.</span>
        </div>
      )}

      {/* 3. 하단 풋터 바 */}
      <div className="pt-1 border-t border-[#1e2c44]/60 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
        <span className="flex items-center gap-1 text-[9.5px]">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          <span>목표 날짜 및 행사 내용 실시간 연동</span>
        </span>
        {onExpandToCanvas && (
          <button
            type="button"
            onClick={onExpandToCanvas}
            className="text-[9px] text-rose-400 hover:text-rose-300 font-bold transition hover:underline cursor-pointer"
          >
            전체보기
          </button>
        )}
      </div>
    </div>
  );
};
