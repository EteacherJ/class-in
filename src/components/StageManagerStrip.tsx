import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, X, Layers } from 'lucide-react';

interface CollapsedWidgetItem {
  id: string;
  title: string;
  icon?: string;
}

interface StageManagerStripProps {
  isDarkMode: boolean;
  opacity?: number; // 0.1 ~ 1.0
  collapsedWidgets: CollapsedWidgetItem[];
  onExpandWidget: (widgetId: string) => void;
  onCloseWidget: (widgetId: string) => void;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onDragEnd?: () => void;
}

/**
 * 🍏 iPadOS / macOS Stage Manager 스타일 좌측 사이드 독 컴포넌트
 * - 접힌 위젯들이 화면 좌측 사이드에 깔끔한 세로 카드 스택으로 정렬됨
 * - 뒤쪽에 투명도 조절 가능한 글래스모피즘 투명 라운딩 사각형 배경 패널 제공
 * - 클릭 시 화면 작업 공간으로 스르륵 펼쳐짐
 */
export const StageManagerStrip: React.FC<StageManagerStripProps> = ({
  isDarkMode,
  opacity = 0.65,
  collapsedWidgets,
  onExpandWidget,
  onCloseWidget,
  onDragStart,
  onDragEnd,
}) => {
  if (collapsedWidgets.length === 0) {
    return null;
  }

  // 투명도에 따른 배경색 계산
  const bgRgba = isDarkMode
    ? `rgba(15, 23, 42, ${opacity})`
    : `rgba(255, 255, 255, ${opacity})`;

  return (
    <aside
      aria-label="사이드 덱 접힌 위젯바"
      className="hidden md:flex flex-col shrink-0 z-30 select-none sticky top-20 self-start"
    >
      {/* 1. 투명도를 조절할 수 있는 투명 라운딩 사각형 배경 패널 (사용자 코멘트 반영) */}
      <div
        style={{
          backgroundColor: bgRgba,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
        className="w-48 lg:w-56 p-2.5 rounded-3xl border border-white/40 dark:border-slate-700/60 shadow-xl flex flex-col gap-2 transition-all duration-300"
      >
        {/* 독 헤더 라벨 */}
        <div className="flex items-center justify-between px-2 py-1 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-700 dark:text-slate-200">
            <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>사이드 덱</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold">
              {collapsedWidgets.length}
            </span>
          </div>
          <span className="text-[9px] text-slate-400 font-medium">클릭 시 펼침</span>
        </div>

        {/* 2. 세로 방향으로 스택된 접힌 위젯 카드 목록 */}
        <div className="flex flex-col gap-2 max-h-[calc(100vh-220px)] overflow-y-auto custom-scroll pr-0.5">
          <AnimatePresence>
            {collapsedWidgets.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -30, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -30, scale: 0.85 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                draggable
                onDragStart={(e: any) => onDragStart?.(e, item.id)}
                onDragEnd={onDragEnd}
                onClick={() => onExpandWidget(item.id)}
                title="클릭하면 메인 작업 공간으로 스르륵 펼쳐집니다 (잡고 드래그하여 도킹 가능)"
                className="group relative p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-750 border border-slate-200/90 dark:border-slate-700/90 hover:border-blue-400 dark:hover:border-blue-500 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex items-center justify-between gap-2 active:scale-98"
              >
                <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                  <div className="w-6 h-6 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-xs shrink-0 group-hover:scale-110 transition-transform">
                    {item.icon || '📌'}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {item.title}
                    </span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                      <span>대기 중</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseWidget(item.id);
                    }}
                    title="위젯 완전히 숨기기"
                    className="w-5 h-5 rounded flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </aside>
  );
};
