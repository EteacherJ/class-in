import React, { useState, useEffect, useRef } from 'react';
import { X, Image as ImageIcon, Clipboard, Check } from 'lucide-react';
import { motion } from 'motion/react';

export interface ExtractedMessengerNote {
  sender: string;
  content: string;
  deadline?: string;
  useDeadline: boolean;
}

interface MessengerNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveNote: (note: { sender: string; content: string; deadline?: string; useDeadline: boolean }) => void;
  onShowToast: (msg: string) => void;
}

/**
 * [MessengerNoteModal]
 * 학교 메신저 쪽지 등록 모달 (리퀴드 글래스 UI)
 * 1. 캡처 이미지 붙여넣기(Ctrl+V / Cmd+V) & 미리보기 확인
 * 2. 수동 직접 입력 탭
 * 3. 발신처, 마감일, 업무 요약 등록
 * (API 키는 AI 캐릭터 루미 전용으로 분리 관리)
 */
export const MessengerNoteModal: React.FC<MessengerNoteModalProps> = ({
  isOpen,
  onClose,
  onSaveNote,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'image' | 'manual'>('image');

  // 폼 상태
  const [sender, setSender] = useState('');
  const [content, setContent] = useState('');
  const [deadline, setDeadline] = useState('');
  const [useDeadline, setUseDeadline] = useState(false);

  // 이미지 상태
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // 붙여넣기 컨테이너 Ref
  const dropZoneRef = useRef<HTMLDivElement | null>(null);

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (isOpen) {
      setSender('');
      setContent('');
      setDeadline('');
      setUseDeadline(false);
      setImagePreview(null);
    }
  }, [isOpen]);

  // 전역 클립보드 붙여넣기(Ctrl+V / Cmd+V) 가로채기
  useEffect(() => {
    if (!isOpen || activeTab !== 'image') return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            processImageFile(file);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, activeTab]);

  // 이미지 파일 읽기
  const processImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setImagePreview(result);
        onShowToast('📋 이미지가 첨부되었습니다. 쪽지 내용을 확인하여 아래 폼에 입력해 주세요.');
      }
    };
    reader.readAsDataURL(file);
  };

  // 저장 제출 핸들러
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      onShowToast('⚠️ 쪽지 주요 업무 내용을 입력해주세요.');
      return;
    }

    onSaveNote({
      sender: sender.trim() || '교무실',
      content: content.trim(),
      deadline: useDeadline && deadline ? deadline : undefined,
      useDeadline,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-white/60 dark:border-slate-700/70 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* 모달 상단 헤더 */}
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-teal-500/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md font-black">
              ✉️
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>학교 메신저 쪽지 등록</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  간편 쪽지 등록
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                메신저 쪽지 화면을 캡처하여 붙여넣고 내용을 빠르게 기록·등록하세요.
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

        {/* 탭 전환 버튼 */}
        <div className="px-6 pt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('image')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
              activeTab === 'image'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-slate-700 hover:bg-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>이미지 캡처 붙여넣기</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
              activeTab === 'manual'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>직접 텍스트 입력</span>
          </button>
        </div>

        {/* 바디 영역 */}
        <div className="p-6 overflow-y-auto custom-scroll space-y-4 flex-1">
          {/* 탭 A: 이미지 캡처 붙여넣기 영역 */}
          {activeTab === 'image' && (
            <div className="space-y-3">
              <div
                ref={dropZoneRef}
                className={`w-full p-5 rounded-2xl border-2 border-dashed transition flex flex-col items-center justify-center text-center cursor-pointer ${
                  imagePreview
                    ? 'border-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20'
                    : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-indigo-400'
                }`}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e: any) => {
                    const file = e.target?.files?.[0];
                    if (file) processImageFile(file);
                  };
                  input.click();
                }}
              >
                {imagePreview ? (
                  <div className="space-y-3 w-full">
                    <img
                      src={imagePreview}
                      alt="쪽지 캡처 미리보기"
                      className="max-h-48 mx-auto rounded-xl object-contain shadow-md border border-white/60 dark:border-slate-700"
                    />
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                        📸 첨부된 이미지를 참고하여 아래 폼에 내용을 입력하세요
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImagePreview(null);
                        }}
                        className="px-3 py-1 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition cursor-pointer hover:bg-rose-100 hover:text-rose-600"
                      >
                        이미지 삭제
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 py-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-sm">
                      <Clipboard className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                        메신저 쪽지를 캡처한 후 여기에 <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs">Ctrl+V</kbd> (Mac은 <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs">Cmd+V</kbd>) 하세요
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        클릭하여 이미지 파일을 직접 업로드할 수도 있습니다.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 공통 입력 폼 (AI 분석 결과 자동 채움 or 수동 입력) */}
          <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 발신처 */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  발신처 (담당 부서/교사)
                </label>
                <input
                  type="text"
                  value={sender}
                  onChange={(e) => setSender(e.target.value)}
                  placeholder="예: 교무부장, 행정실, 교육복지사"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* 마감일 설정 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    마감 기한 (D-Day)
                  </label>
                  <label className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useDeadline}
                      onChange={(e) => setUseDeadline(e.target.checked)}
                      className="rounded accent-indigo-600 cursor-pointer"
                    />
                    <span>마감일 설정</span>
                  </label>
                </div>
                {useDeadline ? (
                  <input
                    type="datetime-local" min="2000-01-01T00:00" max="2099-12-31T23:59"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-mono text-slate-800 dark:text-slate-100"
                  />
                ) : (
                  <div className="px-3 py-2 text-xs bg-slate-100/60 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 italic">
                    마감일 없음 (상시 확인)
                  </div>
                )}
              </div>
            </div>

            {/* 업무 주요 내용 */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                쪽지 주요 업무 내용
              </label>
              <textarea
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="쪽지에서 선생님이 처리해야 할 업무 및 제출 양식을 입력하세요 (예: 2026학년도 1학기 방과후학교 수강료 정산서 제출 요망)..."
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium text-slate-800 dark:text-slate-100 leading-relaxed resize-none"
              />
            </div>

            {/* 저장 버튼 */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white text-xs font-bold shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>쪽지 등록 완료</span>
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
