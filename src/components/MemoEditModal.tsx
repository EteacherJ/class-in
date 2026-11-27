import { cleanLegacyMemo } from '../utils/memoFormat';
import React, { useState, useEffect } from 'react';
import { X, Check, Calendar, User, AlertCircle, Bold, Italic, Underline, List, Palette, Type } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface MemoItem {
  id: string;
  title: string;
  content: string; // HTML 또는 텍스트 서식
  bgColor: string; // 메모지 배경색 (예: #FFFFFF, #FEF9C3, #FFEDD5, #DCFCE7, #E0E7FF)
  textColor: string; // 텍스트 컬러
  fontSize: 'sm' | 'base' | 'lg'; // 글자 크기
  priority: 'low' | 'normal' | 'high'; // 중요도 (보통 / 중요 / 긴급)
  dueDate?: string; // 마감 기한 (YYYY-MM-DD)
  assignee?: string; // 담당 부서/교사 (선택사항, 예: 교무부장, 행정실)
  isCompleted?: boolean; // 체크 완료 여부
  createdAt: string;
  updatedAt: string;
}

interface MemoEditModalProps {
  isOpen: boolean;
  memo: MemoItem | null;
  onClose: () => void;
  onSave: (memo: MemoItem) => void;
}

export const MEMO_BG_COLORS = [
  { label: '연크림 (기본)', bg: '#FFFDF5', text: '#292638', border: '#E8E5ED' },
  { label: '연보라 (중요)', bg: '#E8E1FF', text: '#4933B3', border: '#C4B5FD' },
  { label: '파스텔 옐로우', bg: '#FEF9C3', text: '#713F12', border: '#FDE047' },
  { label: '민트 그린', bg: '#DDF7ED', text: '#146B51', border: '#A7F3D0' },
  { label: '소프트 오렌지', bg: '#FFF0D7', text: '#854D0E', border: '#FED7AA' },
  { label: '화이트', bg: '#FFFFFF', text: '#292638', border: '#E8E5ED' },
];

export const MemoEditModal: React.FC<MemoEditModalProps> = ({
  isOpen,
  memo,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [bgColor, setBgColor] = useState('#FEF9C3');
  const [textColor, setTextColor] = useState('#713F12');
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [dueDate, setDueDate] = useState('');
  const [assignee, setAssignee] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (memo) {
      setTitle(memo.title || '');
      setContent(memo.content || '');
      setBgColor(memo.bgColor || '#FEF9C3');
      setTextColor(memo.textColor || '#713F12');
      setFontSize(memo.fontSize || 'base');
      setPriority(memo.priority || 'normal');
      if (/📌 \[중요\]/.test(memo.content || '')) {
        setContent(cleanLegacyMemo(memo.content || ''));
        if (/📌 \[중요\]/.test(memo.content || '')) setPriority('high');
      }
      setDueDate(memo.dueDate || '');
      setAssignee(memo.assignee || '');
      setIsCompleted(memo.isCompleted || false);
    } else {
      setTitle('');
      setContent('');
      setBgColor('#FEF9C3');
      setTextColor('#713F12');
      setFontSize('base');
      setPriority('normal');
      setDueDate('');
      setAssignee('');
      setIsCompleted(false);
    }
  }, [memo, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nowStr = new Date().toISOString().split('T')[0];
    const newMemo: MemoItem = {
      id: memo?.id || `memo-${Date.now()}`,
      title: title.trim() || '새 메모',
      content: content.trim(),
      bgColor,
      textColor,
      fontSize,
      priority,
      dueDate: dueDate || undefined,
      assignee: assignee.trim() || undefined,
      isCompleted,
      createdAt: memo?.createdAt || nowStr,
      updatedAt: nowStr,
    };
    onSave(newMemo);
    onClose();
  };

  // 리치 텍스트 서식 도구 적용 헬퍼 (마크다운 스타일 텍스트 감싸기)
  const applyFormatting = (prefix: string, suffix: string = prefix) => {
    const textarea = document.getElementById('memo-content-textarea') as HTMLTextAreaElement | null;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const replacement = `${prefix}${selectedText}${suffix}`;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 50);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-white/60 dark:border-slate-700/70 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* 모달 상단 헤더 */}
          <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-indigo-500/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md font-black text-base">
                📝
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>{memo ? '메모 수정하기' : '새 메모 작성'}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    리치 메모
                  </span>
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  서식 도구, 마감 기한, 담당 부서, 중요도를 지정하여 체계적으로 메모를 관리합니다.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 모달 본문 폼 */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar space-y-4 flex-1">
            {/* 제목 & 완료 여부 */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer shrink-0" title="완료 체크">
                <input
                  type="checkbox"
                  checked={isCompleted}
                  onChange={(e) => setIsCompleted(e.target.checked)}
                  className="w-4 h-4 rounded-md accent-amber-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">완료</span>
              </label>

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="메모 제목을 입력하세요 (예: 3학년 진단평가 나이스 입력)"
                className="flex-1 px-3.5 py-2 text-sm font-extrabold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-400 transition"
              />
            </div>

            {/* 서식 툴바 (리치 텍스트 도구 & 폰트 크기) */}
            <div className="flex items-center justify-between p-1.5 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex-wrap gap-1.5">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => applyFormatting('**', '**')}
                  title="굵게 (Bold)"
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormatting('*', '*')}
                  title="기울임 (Italic)"
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormatting('<u>', '</u>')}
                  title="밑줄 (Underline)"
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormatting('\n• ', '')}
                  title="글머리 기호 (List)"
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPriority((p) => (p === 'high' ? 'normal' : 'high'))}
                  title="중요 메모로 표시 (글자는 넣지 않고 메모에 📌 중요 표시만 붙여요)"
                  aria-pressed={priority === 'high'}
                  className={`px-1.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-0.5 ${
                    priority === 'high' ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300' : 'hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>📌 중요</span>
                </button>
              </div>

              {/* 글자 크기 선택 */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-700 px-1 py-0.5 rounded-lg shadow-2xs border border-slate-200/60 dark:border-slate-600">
                <span className="text-[10px] text-slate-400 font-bold px-1">크기</span>
                {(['sm', 'base', 'lg'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setFontSize(sz)}
                    className={`px-1.5 py-0.5 rounded text-[11px] font-extrabold transition cursor-pointer ${
                      fontSize === sz
                        ? 'bg-amber-500 text-slate-950 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {sz === 'sm' ? '작게' : sz === 'base' ? '보통' : '크게'}
                  </button>
                ))}
              </div>
            </div>

            {/* 메모 본문 작성 영역 (선택된 배경색 적용 미리보기) */}
            <div
              style={{ backgroundColor: bgColor, color: textColor }}
              className="p-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-inner transition-colors duration-200 relative min-h-[140px]"
            >
              <textarea
                id="memo-content-textarea"
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="메모 본문 내용을 자유롭게 입력하세요 (서식 버튼으로 굵게, 밑줄, 목록 작성 가능)..."
                style={{ color: textColor }}
                className={`w-full bg-transparent outline-none resize-none leading-relaxed font-medium placeholder:text-slate-400 ${
                  fontSize === 'sm' ? 'text-xs' : fontSize === 'lg' ? 'text-base' : 'text-sm'
                }`}
              />
            </div>

            {/* 메모지 색상 팔레트 선택 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-amber-500" />
                <span>메모지 색상 선택</span>
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {MEMO_BG_COLORS.map((c) => (
                  <button
                    key={c.bg}
                    type="button"
                    onClick={() => {
                      setBgColor(c.bg);
                      setTextColor(c.text);
                    }}
                    style={{ backgroundColor: c.bg, borderColor: c.border }}
                    className={`h-7 px-2.5 rounded-xl border flex items-center gap-1.5 transition cursor-pointer text-xs font-bold shadow-2xs ${
                      bgColor === c.bg ? 'ring-2 ring-amber-500 ring-offset-1 scale-105' : 'hover:scale-102 opacity-85'
                    }`}
                  >
                    <span style={{ color: c.text }}>{c.label}</span>
                    {bgColor === c.bg && <Check className="w-3 h-3 text-amber-600" strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </div>

            {/* 중요도, 마감 기한, 담당자 설정 그리드 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/80 dark:border-slate-800">
              {/* 1. 중요도 */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span>중요도</span>
                </label>
                <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
                  {[
                    { id: 'low', label: '보통', color: 'text-emerald-700 dark:text-emerald-300' },
                    { id: 'normal', label: '중요', color: 'text-amber-700 dark:text-amber-300' },
                    { id: 'high', label: '긴급', color: 'text-rose-700 dark:text-rose-300' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPriority(p.id as any)}
                      className={`flex-1 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                        priority === p.id
                          ? 'bg-white dark:bg-slate-700 shadow-2xs font-extrabold ' + p.color
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. 마감 기한 */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-sky-500" />
                  <span>마감 기한 (D-Day)</span>
                </label>
                <input
                  type="date" min="2000-01-01" max="2099-12-31"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* 3. 담당 부서/교사 */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-indigo-500" />
                  <span>담당 부서/교사</span>
                </label>
                <input
                  type="text"
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  placeholder="예: 교무부장, 연구실"
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* 하단 버튼 바 */}
            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#7457F5] hover:bg-[#6243E8] text-white text-xs font-black shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{memo ? '수정 완료' : '메모 등록'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
