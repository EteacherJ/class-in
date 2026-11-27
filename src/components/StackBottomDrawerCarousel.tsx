import React, { useState, useEffect } from 'react';
import {
  Package,
  Mail,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Plus,
  Trash2,
  Sparkles,
  Inbox,
  StickyNote,
} from 'lucide-react';
import { PostItWidgetData } from '../types';

interface StackBottomDrawerCarouselProps {
  collapsedWidgetIds: string[];
  hiddenWidgetIds: string[];
  getWidgetTitle: (id: string) => string;
  onExpandWidget: (widgetId: string) => void;
  onExpandAllWidgets: () => void;
  postItWidgets: PostItWidgetData[];
  onAddPostIt: (color?: string) => void;
  onUpdatePostIt: (id: string, updates: Partial<PostItWidgetData>) => void;
  onDeletePostIt: (id: string) => void;
  onRestoreMemoToCanvas: (id: string, title: string) => void;
  onOpenMessengerModal: () => void;
  forceTab?: 'widgets' | 'notes'; // 양쪽 스택 모드 전용 고정 탭 (PDF 2페이지 수정사항 1 반영)
}

/**
 * 🎡 [StackBottomDrawerCarousel]
 * 사이드 스택 하단 슬롯 공유 캐러셀:
 * 1) 📦 [보관된 위젯 영역]: 보관함 순차 표시, 개별 펼치기 / 전체 펼치기 지원
 * 2) ✉️ [쪽지 등록 & 보관 영역]: AI 쪽지 등록 및 보관된 쪽지를 좌/우로 넘겨가며 확인
 */
export const StackBottomDrawerCarousel: React.FC<StackBottomDrawerCarouselProps> = ({
  collapsedWidgetIds,
  hiddenWidgetIds,
  getWidgetTitle,
  onExpandWidget,
  onExpandAllWidgets,
  postItWidgets,
  onAddPostIt,
  onUpdatePostIt,
  onDeletePostIt,
  onRestoreMemoToCanvas,
  onOpenMessengerModal,
  forceTab,
}) => {
  // 0: 보관된 위젯, 1: 메모 스택
  const [tabIndex, setTabIndex] = useState<number>(() => (forceTab === 'notes' ? 1 : 0));

  // forceTab 변경 시 즉각 탭 인덱스 동기화
  useEffect(() => {
    if (forceTab === 'widgets') {
      setTabIndex(0);
    } else if (forceTab === 'notes') {
      setTabIndex(1);
    }
  }, [forceTab]);

  // 쪽지 캐러셀 현재 인덱스 (좌, 우 넘김)
  const [memoIndex, setMemoIndex] = useState<number>(0);

  // 실제로 표시 가능한 보관 위젯 목록
  const visibleCollapsedIds = collapsedWidgetIds.filter((id) => !hiddenWidgetIds.includes(id));

  // 쪽지 인덱스 유효 범위 보정
  const safeMemoIndex = Math.min(
    Math.max(0, memoIndex),
    Math.max(0, postItWidgets.length - 1)
  );
  const currentMemo = postItWidgets[safeMemoIndex];

  const handlePrevMemo = () => {
    if (postItWidgets.length <= 1) return;
    setMemoIndex((prev) => (prev > 0 ? prev - 1 : postItWidgets.length - 1));
  };

  const handleNextMemo = () => {
    if (postItWidgets.length <= 1) return;
    setMemoIndex((prev) => (prev < postItWidgets.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="w-full h-full flex flex-col transition-all overflow-hidden select-none p-0 bg-transparent border-0">
      {/* 1. 상단 헤더 영역: forceTab === 'widgets' (양쪽 모두 사용 모드 좌측)일 때는 접힌 위젯만 단독 표시 */}
      {forceTab === 'widgets' ? (
        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/50 dark:border-[#1e2c44] shrink-0 gap-1.5 px-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800/60 shadow-2xs">
              <Package className="w-3.5 h-3.5" />
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-black text-slate-800 dark:text-slate-100">보관함</span>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                ({visibleCollapsedIds.length}개)
              </span>
            </div>
          </div>

          {/* 전체 펼치기 버튼 */}
          {visibleCollapsedIds.length > 0 && (
            <button
              type="button"
              onClick={onExpandAllWidgets}
              className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs shrink-0"
              title="보관된 모든 위젯을 메인 캔버스로 순차 복귀"
            >
              <span>전체 펼치기</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      ) : (
        /* 🎡 [단일 통합 모드 (좌측/우측 집중)]: 위젯과 메모가 탭 형식으로 노출 */
        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/50 dark:border-[#1e2c44] shrink-0 gap-1.5 px-0.5">
          <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-[#0c1424] p-0.5 rounded-xl border border-slate-300/60 dark:border-[#1e2c44] min-w-0 flex-1 overflow-hidden">
            {/* [ 📦 보관된 위젯 ] 탭 버튼 */}
            <button
              type="button"
              onClick={() => setTabIndex(0)}
              className={`px-1.5 sm:px-2 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer active:scale-95 min-w-0 flex-1 justify-center ${
                tabIndex === 0
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate text-[11px] sm:text-xs font-bold whitespace-nowrap">보관된 위젯</span>
              {visibleCollapsedIds.length > 0 && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold shrink-0 ${
                    tabIndex === 0
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {visibleCollapsedIds.length}
                </span>
              )}
            </button>

            {/* [ 📝 메모 ] 탭 버튼 */}
            <button
              type="button"
              onClick={() => setTabIndex(1)}
              className={`px-1.5 sm:px-2 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer active:scale-95 min-w-0 flex-1 justify-center ${
                tabIndex === 1
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <StickyNote className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate text-[11px] sm:text-xs font-bold whitespace-nowrap">메모</span>
              {postItWidgets.length > 0 && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold shrink-0 ${
                    tabIndex === 1
                      ? 'bg-black/20 text-slate-950'
                      : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {postItWidgets.length}
                </span>
              )}
            </button>
          </div>

          {/* 탭 우측 액션: 보관된 위젯 탭일 땐 [전체 펼치기], 메모 스택 탭일 땐 [+ 새 메모] */}
          {tabIndex === 0 && visibleCollapsedIds.length > 0 && (
            <button
              type="button"
              onClick={onExpandAllWidgets}
              className="px-2 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs shrink-0"
              title="보관된 모든 위젯을 메인 캔버스로 순차 복귀"
            >
              <span>전체 펼치기</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}

          {tabIndex === 1 && (
            <button
              type="button"
              onClick={() => onAddPostIt('yellow')}
              className="px-2 py-1 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-[10px] font-black transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs shrink-0"
              title="새 메모 작성"
            >
              <Plus className="w-3 h-3" />
              <span>새 메모</span>
            </button>
          )}
        </div>
      )}

      {/* 2. 본문 영역: 탭에 따라 슬라이드 전환 */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {/* ========================================================================= */}
        {/* 📦 탭 0: 보관된 위젯 영역 (순차적 목록 + 개별/전체 펼치기) */}
        {/* ========================================================================= */}
        {tabIndex === 0 && (
          <div className="flex-1 flex flex-col min-h-0 gap-2 animate-fadeIn transition-opacity duration-200">
            {/* 단일 통합 탭 모드일 때만 내부 서브 헤더로 '보관함 (N개)' 노출 (첨부 이미지 규격 1:1 일치) */}
            {forceTab !== 'widgets' && (
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <span>보관함</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">({visibleCollapsedIds.length}개)</span>
                </span>
              </div>
            )}

            {/* 보관된 위젯 카드 순차 리스트 */}
            <div className={`stor-list flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-0 ${visibleCollapsedIds.length > 1 ? 'is-deck' : ''}`}>
              {visibleCollapsedIds.length === 0 ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-300/70 dark:border-slate-700/60 text-slate-400" title="위젯 상단의 접기(-) 버튼을 누르면 이곳에 보관돼요">
                  <Inbox className="w-4 h-4 shrink-0 opacity-60 text-indigo-400" />
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">비어 있어요 · 위젯의 접기(-)로 보관</p>
                </div>
              ) : (
                visibleCollapsedIds.map((widgetId, idx) => (
                  <div
                    key={widgetId}
                    style={{ ['--si' as any]: idx, zIndex: 100 - idx }}
                    className="stor-item relative p-2.5 rounded-2xl bg-white/60 dark:!bg-[#0c1424] hover:bg-white/90 dark:hover:!bg-[#142036] border border-slate-200/60 dark:!border-[#1e2c44] hover:border-indigo-400 dark:hover:border-indigo-500/60 shadow-2xs transition flex items-center justify-between gap-2 group backdrop-blur-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-5 h-5 rounded-lg bg-indigo-50 dark:!bg-[#101a2d] border border-indigo-200 dark:!border-[#1e2c44] text-indigo-600 dark:!text-[#a5b4fc] text-[10px] font-black flex items-center justify-center shrink-0 shadow-2xs">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-indigo-400 transition-colors">
                        {getWidgetTitle(widgetId)}
                      </span>
                    </div>

                    {/* 개별 펼치기 버튼 (목업 스타일 [펼치기 >]) */}
                    <button
                      type="button"
                      onClick={() => onExpandWidget(widgetId)}
                      className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:!bg-[#101a2d] hover:bg-indigo-600 dark:hover:bg-indigo-600 text-indigo-600 dark:!text-[#a5b4fc] hover:text-white dark:hover:text-white text-[10px] font-black border border-indigo-200 dark:!border-[#1e2c44] transition active:scale-95 cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs"
                      title="이 위젯만 메인 캔버스로 펼치기"
                    >
                      <span>펼치기</span>
                      <span className="text-[10px]">&gt;</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ✉️ 탭 1: 쪽지 등록 및 좌/우 넘김 슬라이더 확인 영역 */}
        {/* ========================================================================= */}
        {tabIndex === 1 && (
          <div className="flex-1 flex flex-col min-h-0 gap-2 animate-fadeIn transition-opacity duration-200">
            {/* 보관된 쪽지 좌/우 넘김 캐러셀 뷰 */}
            {postItWidgets.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 rounded-2xl border-2 border-dashed border-amber-300/60 dark:border-amber-700/60 text-slate-400">
                <StickyNote className="w-7 h-7 mb-1.5 opacity-50 text-amber-500" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">보관된 쪽지가 없습니다</p>
                <p className="text-[10px] text-slate-400 mt-1">상단의 [+ 새 메모]를 눌러 쪽지를 작성해보세요.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                {/* 좌/우 넘김 네비게이션 바 */}
                <div className="flex items-center justify-between px-1 mb-1.5 bg-amber-50 dark:bg-amber-950/30 rounded-xl py-1 border border-amber-200/60 dark:border-amber-800/40">
                  <button
                    type="button"
                    onClick={handlePrevMemo}
                    className="p-1 rounded-lg hover:bg-amber-200/80 dark:hover:bg-amber-800/60 text-amber-900 dark:text-amber-200 transition cursor-pointer active:scale-90"
                    title="이전 쪽지 (좌측)"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 dark:text-amber-200">
                    <span>쪽지</span>
                    <span className="px-1.5 py-0.2 rounded-md bg-amber-400 text-slate-950 font-mono text-[11px]">
                      {safeMemoIndex + 1} / {postItWidgets.length}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleNextMemo}
                    className="p-1 rounded-lg hover:bg-amber-200/80 dark:hover:bg-amber-800/60 text-amber-900 dark:text-amber-200 transition cursor-pointer active:scale-90"
                    title="다음 쪽지 (우측)"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* 현재 쪽지 카드 (슬라이드 본문) */}
                {currentMemo && (
                  <div className="flex-1 flex flex-col p-3 rounded-2xl bg-amber-100/90 dark:bg-amber-950/60 border border-amber-300/80 dark:border-amber-700/60 shadow-xs space-y-2 min-h-0">
                    <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-amber-200/80 dark:border-amber-800/60">
                      <input
                        type="text"
                        value={currentMemo.title}
                        onChange={(e) => onUpdatePostIt(currentMemo.id, { title: e.target.value })}
                        className="font-black text-xs text-amber-950 dark:text-amber-100 bg-transparent outline-none flex-1 truncate"
                        placeholder="쪽지 제목"
                      />

                      <div className="flex items-center gap-1 shrink-0">
                        {/* 캔버스 복원 버튼 */}
                        <button
                          type="button"
                          onClick={() => onRestoreMemoToCanvas(currentMemo.id, currentMemo.title)}
                          className="px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-2xs"
                          title="메인 캔버스 보드로 펼치기"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>보드로 펼치기</span>
                        </button>
                        {/* 삭제 버튼 */}
                        <button
                          type="button"
                          onClick={() => onDeletePostIt(currentMemo.id)}
                          className="p-1 rounded-md text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition cursor-pointer"
                          title="쪽지 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <textarea
                      value={currentMemo.content}
                      onChange={(e) => onUpdatePostIt(currentMemo.id, { content: e.target.value })}
                      placeholder="쪽지 내용을 입력하세요..."
                      className="flex-1 w-full text-xs text-amber-950 dark:text-amber-100 bg-transparent outline-none resize-none leading-relaxed custom-scrollbar"
                    />

                    {/* 하단 점형 인디케이터 (빠른 선택 점) */}
                    {postItWidgets.length > 1 && (
                      <div className="flex items-center justify-center gap-1 pt-1 border-t border-amber-200/60 dark:border-amber-800/40">
                        {postItWidgets.map((_, dotIdx) => (
                          <button
                            key={dotIdx}
                            type="button"
                            onClick={() => setMemoIndex(dotIdx)}
                            className={`h-1.5 rounded-full transition-all cursor-pointer ${
                              dotIdx === safeMemoIndex
                                ? 'w-4 bg-amber-600 dark:bg-amber-400'
                                : 'w-1.5 bg-amber-300 dark:bg-amber-800 hover:bg-amber-400'
                            }`}
                            title={`쪽지 ${dotIdx + 1}번으로 이동`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
