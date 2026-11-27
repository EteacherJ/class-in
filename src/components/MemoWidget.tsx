import { renderMemoText } from '../utils/memoFormat';
import React, { useState } from 'react';
import { Plus, Trash2, Edit3, Calendar, User, CheckCircle2, Circle, AlertCircle, Maximize2 } from 'lucide-react';
import { MemoItem, MemoEditModal } from './MemoEditModal';

interface MemoWidgetProps {
  memos: MemoItem[];
  onAddMemo: () => void;
  onEditMemo: (memo: MemoItem) => void;
  onDeleteMemo: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onRestoreToCanvas?: (id: string, title?: string) => void;
  onShowToast?: (msg: string) => void;
}

export const MemoWidget: React.FC<MemoWidgetProps> = ({
  memos,
  onAddMemo,
  onEditMemo,
  onDeleteMemo,
  onToggleComplete,
  onRestoreToCanvas,
  onShowToast,
}) => {
  // D-Day 계산 헬퍼
  const getDDayBadge = (dueDate?: string) => {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dueDate);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-extrabold text-[10px]">D-Day</span>;
    } else if (diffDays > 0) {
      return (
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${diffDays <= 3 ? 'bg-orange-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
          D-{diffDays}
        </span>
      );
    } else {
      return (
        <span className="px-1.5 py-0.5 rounded-full bg-slate-300 dark:bg-slate-800 text-slate-500 font-bold text-[10px]">
          D+{Math.abs(diffDays)}
        </span>
      );
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden gap-2">
      {/* 1. 메모 위젯 헤더: [📝 Memo (개수)] 와 [+ 새 메모] 깔끔한 구조 (불필요한 선 테두리 제거) */}
      <div className="flex items-center justify-between pb-1.5 shrink-0 select-none">
        <div className="flex items-center gap-1.5">
          <span className="text-base">📝</span>
          <h3 className="font-extrabold text-xs text-slate-800 dark:text-slate-100">포스트잇 메모</h3>
          <span
            className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold text-[10px]"
            title={`현재 등록된 메모 ${memos.length}개`}
          >
            +{memos.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onAddMemo}
          className="px-2.5 py-1 rounded-xl bg-[#7457F5] hover:bg-[#6243E8] text-white text-[11px] font-black transition cursor-pointer shadow-xs flex items-center gap-1 active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={3} />
          <span>새 메모</span>
        </button>
      </div>

      {/* 2. 메모 카드 리스트: PDF 권장사항 (기본은 연한 크림색, 중요 메모는 연보라색 #E8E1FF) */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 custom-scrollbar min-h-0 flex flex-col">
        {memos.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-4 rounded-xl bg-white/60 dark:!bg-[#0c1424] border border-slate-200 dark:!border-[#1e2c44] text-slate-400 h-full my-auto flex-1">
            <span className="text-3xl mb-1.5 opacity-70">📋</span>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">작성된 메모가 없습니다</p>
            <p className="text-[10px] text-slate-400 mt-1">상단의 [+ 새 메모]를 눌러 쪽지와 할 일을 기록해보세요.</p>
          </div>
        ) : (
          memos.map((memo) => {
            const isDone = !!memo.isCompleted;
            const isImportant = memo.priority === 'high';
            const resolvedBg = memo.bgColor || (isImportant ? '#E8E1FF' : '#FFFDF5');
            const resolvedText = memo.textColor || (isImportant ? '#4933B3' : '#292638');

            return (
              <div
                key={memo.id}
                style={{ backgroundColor: resolvedBg }}
                className={`memo-card-item p-3.5 rounded-lg shadow-xs space-y-2.5 transition-all hover:shadow-sm relative group select-none border-[1.5px] border-slate-300/90 hover:border-slate-400/90 dark:!border-slate-600 dark:!bg-[#0c1424] ${
                  isDone ? 'opacity-70 grayscale-[20%]' : ''
                } flex flex-col`}
              >
                {/* 상단 헤더: 세로 2단(Column) 구조로 개편 (1단: 제목 행, 2단: 기능 버튼 행) */}
                <div className="flex flex-col gap-1.5 shrink-0 border-b border-black/5 dark:border-white/5 pb-1.5">
                  {/* 1단 (상단 행): 메모 아이콘(체크/라디오) + 메모 제목 전체 (말줄임 없이 온전한 표시) */}
                  <div
                    className="flex items-start gap-1.5 w-full cursor-pointer group/title"
                    onClick={() => {
                      if (onRestoreToCanvas) {
                        onRestoreToCanvas(memo.id, memo.title);
                      }
                    }}
                    title="클릭 시 메인 캔버스 보드로 즉시 꺼내집니다"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleComplete(memo.id);
                      }}
                      className="cursor-pointer shrink-0 text-slate-700 dark:text-slate-300 hover:scale-110 transition mt-0.5"
                      title={isDone ? '미완료로 변경' : '완료로 체크'}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400" />
                      )}
                    </button>
                    <span
                      style={{ color: memo.textColor || '#1E293B' }}
                      className={`memo-card-title font-black text-xs leading-snug break-words flex-1 dark:!text-white group-hover/title:text-indigo-600 dark:group-hover/title:text-indigo-400 transition-colors ${
                        isDone ? 'line-through opacity-60' : ''
                      }`}
                    >
                      {memo.title}
                    </span>
                  </div>

                  {/* 2단 (버튼 행): '긴급' 배지 + '펼치기' 버튼 + 수정/삭제 아이콘 */}
                  <div className="flex items-center justify-end gap-1.5 w-full shrink-0">
                    {/* 중요도 뱃지 */}
                    {memo.priority === 'high' && (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-extrabold text-[9px] shadow-2xs">
                        긴급
                      </span>
                    )}
                    {memo.priority === 'normal' && (
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-500/30 text-amber-900 dark:text-amber-200 dark:bg-amber-500/20 font-extrabold text-[9px]">
                        중요
                      </span>
                    )}

                    {/* 캔버스 복원 / 펼치기 버튼 (시인성 높은 캡슐 버튼) */}
                    {onRestoreToCanvas && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRestoreToCanvas(memo.id, memo.title);
                        }}
                        className="px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition"
                        title="메인 캔버스 보드로 꺼내기"
                      >
                        <Maximize2 className="w-3 h-3" />
                        <span>펼치기</span>
                      </button>
                    )}

                    {/* 수정 버튼 */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditMemo(memo);
                      }}
                      className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                      title="메모 수정"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>

                    {/* 삭제 버튼 */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteMemo(memo.id);
                      }}
                      className="p-1 rounded-lg hover:bg-rose-500 hover:text-white text-slate-400 dark:text-slate-400 transition cursor-pointer"
                      title="메모 삭제"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* 본문 미리보기: flex-1로 여백 전체를 메모 색으로 가득 채움 */}
                <div
                  onClick={() => onEditMemo(memo)}
                  style={{ color: memo.textColor || '#334155' }}
                  className={`memo-card-content text-xs whitespace-pre-wrap break-words leading-relaxed cursor-pointer font-medium hover:opacity-90 dark:!text-[#cbd5e1] ${
                    'memo-card-clamp'
                  } ${
                    memo.fontSize === 'sm' ? 'text-[11px]' : memo.fontSize === 'lg' ? 'text-sm font-semibold' : 'text-xs'
                  } ${isDone ? 'line-through opacity-60' : ''}`}
                >
                  {memo.content ? renderMemoText(memo.content) : '(내용 없음)'}
                </div>

                {/* 하단 메타바: 선 테두리 없이 깔끔한 캡슐형 담당자 및 D-Day 배지 */}
                {(memo.assignee || memo.dueDate) && (
                  <div className="memo-card-meta flex items-center justify-between pt-1 text-[10px] text-slate-600 dark:text-slate-400 font-bold flex-wrap gap-1 shrink-0">
                    {memo.assignee ? (
                      <span className="flex items-center gap-1 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full text-slate-700 dark:text-slate-300">
                        <User className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                        <span>{memo.assignee}</span>
                      </span>
                    ) : <span />}

                    {memo.dueDate && (
                      <span className="flex items-center gap-1 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full text-slate-700 dark:text-slate-300">
                        <Calendar className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                        <span>{memo.dueDate}</span>
                        {getDDayBadge(memo.dueDate)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
