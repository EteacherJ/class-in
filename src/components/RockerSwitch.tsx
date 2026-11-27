import React from 'react';
import { BookOpen, Briefcase } from 'lucide-react';
import { ClassroomMode } from '../types';
import { playSelectedChime } from '../utils/audio';

interface RockerSwitchProps {
  mode: ClassroomMode;
  onModeChange: (newMode: ClassroomMode) => void;
  onShowToast?: (msg: string) => void;
}

/**
 * 🕹️ [3D 물리적 로커 스위치 (Rocker Switch)]
 * 메인 대시보드 상단 헤더의 모드 전환을 직관적인 물리 스위치 형태로 제공합니다.
 * - 좌측 누름 (ON / 녹색 계열): 수업 모드 (lesson)
 * - 우측 누름 (OFF / 붉은색 계열): 업무 모드 (work)
 * - 시소(Seesaw) 3D 입체 틸트 효과 및 음각 메탈릭 베젤, 네온 LED 인디케이터 점등
 */
export const RockerSwitch: React.FC<RockerSwitchProps> = ({
  mode,
  onModeChange,
  onShowToast,
}) => {
  const isLesson = mode !== 'work'; // 수업 모드 여부 (lesson)

  const handleSelect = (targetMode: ClassroomMode) => {
    if (mode === targetMode) return;
    onModeChange(targetMode);
    try {
      playSelectedChime('bell_ding');
    } catch {}
    if (targetMode === 'lesson') {
      onShowToast?.('📖 [수업 모드]가 활성화되었습니다. 수업용 위젯 프리셋이 노출됩니다.');
    } else {
      onShowToast?.('💼 [선생님 업무 모드]가 활성화되었습니다. 개인 업무용 화면으로 전환됩니다.');
    }
  };

  return (
    <div
      className="inline-flex items-center select-none h-9"
      title={isLesson ? '현재: 수업 모드 (클릭 시 업무 모드로 전환)' : '현재: 업무 모드 (클릭 시 수업 모드로 전환)'}
    >
      {/* 🌟 밝고 화사한 모던 베젤 프레임 (h-9 규격 통일) */}
      <div className="relative p-0.5 rounded-xl bg-slate-200/90 dark:bg-slate-800/90 border border-slate-300/80 dark:border-slate-700/80 shadow-inner flex items-center h-full">
        {/* 내부 로커 스위치 슬롯 */}
        <div className="flex items-center rounded-lg overflow-hidden p-0.5 relative h-full gap-0.5">
          {/* 1. 좌측 버튼: 수업 모드 (ON / 밝고 산뜻한 에메랄드) */}
          <button
            type="button"
            onClick={() => handleSelect('lesson')}
            className={`relative px-3 h-7.5 rounded-md flex items-center gap-1.5 font-black text-xs transition-all duration-200 cursor-pointer active:scale-95 ${
              isLesson
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm ring-1 ring-emerald-300/60 z-10'
                : 'bg-white/60 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:bg-white/90 hover:text-slate-800 dark:hover:text-slate-100 opacity-80 hover:opacity-100'
            }`}
          >
            {/* 상쾌한 LED 인디케이터 램프 */}
            <span
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                isLesson
                  ? 'bg-emerald-200 shadow-[0_0_6px_#6ee7b7] animate-pulse ring-1 ring-white/90'
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
            />
            <BookOpen className={`w-3.5 h-3.5 ${isLesson ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
            <span className="tracking-tight">수업</span>
            {isLesson && (
              <span className="text-[9px] font-black px-1 py-0.2 rounded bg-black/20 text-emerald-100 uppercase tracking-widest ml-0.5">
                ON
              </span>
            )}
          </button>

          {/* 중앙 힌지 분할선 */}
          <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-600 mx-0.5 shrink-0 opacity-70" />

          {/* 2. 우측 버튼: 업무 모드 (ON / 화사하고 따뜻한 코랄 로즈) */}
          <button
            type="button"
            onClick={() => handleSelect('work')}
            className={`relative px-3 h-7.5 rounded-md flex items-center gap-1.5 font-black text-xs transition-all duration-200 cursor-pointer active:scale-95 ${
              !isLesson
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm ring-1 ring-rose-300/60 z-10'
                : 'bg-white/60 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:bg-white/90 hover:text-slate-800 dark:hover:text-slate-100 opacity-80 hover:opacity-100'
            }`}
          >
            {/* 화사한 LED 인디케이터 램프 */}
            <span
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                !isLesson
                  ? 'bg-rose-200 shadow-[0_0_6px_#fda4af] animate-pulse ring-1 ring-white/90'
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
            />
            <Briefcase className={`w-3.5 h-3.5 ${!isLesson ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
            <span className="tracking-tight">업무</span>
            {!isLesson && (
              <span className="text-[9px] font-black px-1 py-0.2 rounded bg-black/20 text-rose-100 uppercase tracking-widest ml-0.5">
                ON
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
