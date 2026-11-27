import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertCircle, ChevronRight, CheckCircle2, BookOpen } from 'lucide-react';
import { ClassConfig } from '../types';

interface SubjectTimetableWidgetProps {
  config: ClassConfig;
  onShowToast?: (msg: string) => void;
}

// 🏫 전담 기본 샘플 다중 학급 시간표
const DEFAULT_SUBJECT_TIMETABLE: Record<string, Record<number, { gradeClass: string; subject: string; location: string }>> = {
  '월': {
    1: { gradeClass: '3-1', subject: '체육', location: '체육관' },
    2: { gradeClass: '3-2', subject: '체육', location: '체육관' },
    3: { gradeClass: '수업 준비', subject: '연구/교재연구', location: '전담실' },
    4: { gradeClass: '4-1', subject: '체육', location: '운동장' },
    5: { gradeClass: '4-2', subject: '체육', location: '운동장' },
    6: { gradeClass: '동아리', subject: '뉴스포츠', location: '체육관' },
  },
  '화': {
    1: { gradeClass: '5-1', subject: '체육', location: '운동장' },
    2: { gradeClass: '5-2', subject: '체육', location: '운동장' },
    3: { gradeClass: '3-1', subject: '체육', location: '체육관' },
    4: { gradeClass: '3-2', subject: '체육', location: '체육관' },
    5: { gradeClass: '수업 준비', subject: '자료 제작', location: '전담실' },
    6: { gradeClass: '방과후', subject: '지도', location: '체육관' },
  },
  '수': {
    1: { gradeClass: '4-1', subject: '체육', location: '체육관' },
    2: { gradeClass: '4-2', subject: '체육', location: '체육관' },
    3: { gradeClass: '5-1', subject: '체육', location: '운동장' },
    4: { gradeClass: '5-2', subject: '체육', location: '운동장' },
  },
  '목': {
    1: { gradeClass: '수업 준비', subject: '수업 준비', location: '전담실' },
    2: { gradeClass: '3-1', subject: '체육', location: '운동장' },
    3: { gradeClass: '3-2', subject: '체육', location: '운동장' },
    4: { gradeClass: '4-1', subject: '체육', location: '체육관' },
    5: { gradeClass: '4-2', subject: '체육', location: '체육관' },
  },
  '금': {
    1: { gradeClass: '5-1', subject: '체육', location: '체육관' },
    2: { gradeClass: '5-2', subject: '체육', location: '체육관' },
    3: { gradeClass: '안전교육', subject: '체육안전', location: '시청각실' },
    4: { gradeClass: '수업 정리', subject: '기자재 정리', location: '체육관' },
  },
};

export const SubjectTimetableWidget: React.FC<SubjectTimetableWidgetProps> = ({ config, onShowToast }) => {
  const days = ['월', '화', '수', '목', '금'] as const;
  
  // 오늘 요일 자동 감지
  const getTodayDayOfWeek = (): string => {
    const dayIdx = new Date().getDay(); // 0: 일, 1: 월 ... 5: 금, 6: 토
    const map = ['일', '월', '화', '수', '목', '금', '토'];
    const d = map[dayIdx];
    return days.includes(d as any) ? d : '월';
  };

  const [selectedDay, setSelectedDay] = useState<string>(getTodayDayOfWeek);
  const [currentPeriod, setCurrentPeriod] = useState<number>(2); // 현재 진행 교시 (기본 2교시 하이라이트)

  // 실시간 교시 판별 (1~6교시)
  useEffect(() => {
    const determinePeriod = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      const minutes = h * 60 + m;

      // 9:00~9:40(1교시), 9:50~10:30(2교시), 10:40~11:20(3교시), 11:30~12:10(4교시), 13:00~13:40(5교시), 13:50~14:30(6교시)
      if (minutes >= 540 && minutes < 585) setCurrentPeriod(1);
      else if (minutes >= 585 && minutes < 635) setCurrentPeriod(2);
      else if (minutes >= 635 && minutes < 685) setCurrentPeriod(3);
      else if (minutes >= 685 && minutes < 760) setCurrentPeriod(4);
      else if (minutes >= 760 && minutes < 825) setCurrentPeriod(5);
      else if (minutes >= 825 && minutes < 880) setCurrentPeriod(6);
      else setCurrentPeriod(2); // 방과후나 장외 시간은 2교시 예시 유지
    };
    determinePeriod();
    const timer = setInterval(determinePeriod, 60000);
    return () => clearInterval(timer);
  }, []);

  const todaySchedule = DEFAULT_SUBJECT_TIMETABLE[selectedDay] || DEFAULT_SUBJECT_TIMETABLE['월'];
  const currentClassInfo = todaySchedule[currentPeriod];

  return (
    <div className="flex flex-col h-full space-y-3 p-1">
      {/* 1. 상단 현재 교시 실시간 배너 */}
      <div className="p-3 bg-gradient-to-r from-indigo-500/10 via-cyan-500/10 to-sky-500/10 dark:from-indigo-950/40 dark:via-cyan-950/40 dark:to-sky-950/40 rounded-2xl border border-indigo-200/80 dark:border-cyan-500/30 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white flex items-center justify-center font-black text-sm shadow-md">
            {currentPeriod}교시
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400 bg-cyan-100/80 dark:bg-cyan-950/60 px-1.5 py-0.5 rounded-md">
                현재 수업 진행 중
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                장소: {currentClassInfo?.location || '교실'}
              </span>
            </div>
            <h4 className="text-sm font-black text-slate-800 dark:text-white mt-0.5">
              {currentClassInfo ? (
                <>
                  <span className="text-indigo-600 dark:text-cyan-300 font-extrabold">{currentClassInfo.gradeClass}</span> 수업 ({currentClassInfo.subject})
                </>
              ) : (
                '현재 배정된 수업이 없습니다.'
              )}
            </h4>
          </div>
        </div>

        {/* 요일 선택 탭 */}
        <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          {days.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDay(d)}
              className={`w-6 h-6 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                selectedDay === d
                  ? 'bg-indigo-600 text-white shadow-xs scale-105'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* 2. 교시별 통합 학급 흐름 리스트 */}
      <div className="flex-1 space-y-1.5 overflow-y-auto pr-0.5">
        {[1, 2, 3, 4, 5, 6].map((period) => {
          const item = todaySchedule[period];
          const isNow = selectedDay === getTodayDayOfWeek() && currentPeriod === period;

          return (
            <div
              key={period}
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                isNow
                  ? 'bg-indigo-50/90 dark:bg-cyan-950/40 border-indigo-400 dark:border-cyan-400 shadow-sm ring-1 ring-indigo-500/20'
                  : 'bg-white/70 dark:bg-slate-900/60 border-slate-200/70 dark:border-slate-800/80 hover:bg-white dark:hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                    isNow
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {period}
                </span>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-800 dark:text-white">
                      {item ? item.gradeClass : '공강 / 수업 준비'}
                    </span>
                    {item && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {item.subject}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {item ? `📍 ${item.location}` : '전담실'}
                </span>
                {isNow && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white animate-pulse">
                    진행 중
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
