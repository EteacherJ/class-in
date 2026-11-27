import React, { useState, useEffect, useRef } from 'react';
import { X, Image as ImageIcon, Check, Trash2, Sparkles, Tag, Paperclip, UploadCloud } from 'lucide-react';
import {
  IdeaItem,
  IdeaSettings,
  AttachedImage,
  IDEA_PASTEL_COLORS,
  DEFAULT_IDEA_TAGS,
} from '../types';

interface IdeaRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItem?: IdeaItem | null;
  settings: IdeaSettings;
  onSaveIdea: (item: IdeaItem) => void;
  onShowToast?: (msg: string) => void;
}

export const IdeaRecordModal: React.FC<IdeaRecordModalProps> = ({
  isOpen,
  onClose,
  initialItem,
  settings,
  onSaveIdea,
  onShowToast,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTag, setSelectedTag] = useState(settings.tags[0] || DEFAULT_IDEA_TAGS[0]);
  const [selectedColor, setSelectedColor] = useState('yellow');
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // 모달 오픈 시 초기화 또는 기존 데이터 바인딩
  useEffect(() => {
    if (isOpen) {
      if (initialItem) {
        setTitle(initialItem.title || '');
        setContent(initialItem.content || '');
        setSelectedTag(initialItem.tag || settings.tags[0] || DEFAULT_IDEA_TAGS[0]);
        setSelectedColor(initialItem.color_label || 'yellow');
        setAttachedImages(initialItem.attached_images || []);
      } else {
        setTitle('');
        setContent('');
        setSelectedTag(settings.tags[0] || DEFAULT_IDEA_TAGS[0]);
        setSelectedColor('yellow');
        setAttachedImages([]);

        // 📋 클립보드 자동 감지 (옵션 활성화 시)
        if (settings.auto_clipboard_detect && navigator.clipboard && navigator.clipboard.read) {
          navigator.clipboard
            .read()
            .then(async (clipboardItems) => {
              for (const item of clipboardItems) {
                for (const type of item.types) {
                  if (type.startsWith('image/')) {
                    const blob = await item.getType(type);
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      const dataUrl = e.target?.result as string;
                      if (dataUrl) {
                        setAttachedImages((prev) => [
                          ...prev,
                          {
                            file_name: `클립보드_캡처_${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.png`,
                            file_size: blob.size,
                            thumbnail_url: dataUrl,
                            source_type: 'clipboard',
                          },
                        ]);
                        onShowToast?.('📋 클립보드의 캡처 이미지를 자동으로 첨부했습니다.');
                      }
                    };
                    reader.readAsDataURL(blob);
                    break;
                  }
                }
              }
            })
            .catch(() => {
              // 브라우저 권한 미승인 또는 클립보드 텍스트 등 무시
            });
        }
      }

      // 입력 포커스
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialItem, settings]);

  // 📋 Ctrl+V 붙여넣기 이벤트 리스너 (클립보드 이미지 캡처)
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (uploadEvent) => {
              const dataUrl = uploadEvent.target?.result as string;
              if (dataUrl) {
                setAttachedImages((prev) => [
                  ...prev,
                  {
                    file_name: `붙여넣은_이미지_${Date.now()}.png`,
                    file_size: blob.size,
                    thumbnail_url: dataUrl,
                    source_type: 'clipboard',
                  },
                ]);
                onShowToast?.('🖼️ 클립보드 이미지가 첨부되었습니다.');
              }
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, onShowToast]);

  if (!isOpen) return null;

  // 파일 업로드 처리
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const dataUrl = uploadEvent.target?.result as string;
        if (dataUrl) {
          setAttachedImages((prev) => [
            ...prev,
            {
              file_name: file.name,
              file_size: file.size,
              thumbnail_url: dataUrl,
              source_type: 'upload',
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 첨부 이미지 삭제
  const handleRemoveImage = (index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // 저장 처리
  const handleSave = () => {
    if (!title.trim() && !content.trim()) {
      onShowToast?.('⚠️ 제목이나 내용 중 최소 하나는 입력해야 합니다.');
      return;
    }

    const now = new Date().toISOString();
    const ideaItem: IdeaItem = {
      idea_id: initialItem?.idea_id || `idea_${Date.now()}`,
      title: title.trim() || '제목 없는 아이디어',
      content: content.trim(),
      tag: selectedTag,
      color_label: selectedColor,
      attached_images: attachedImages,
      created_at: initialItem?.created_at || now,
      updated_at: now,
      is_archived: initialItem?.is_archived || false,
      stack_order: initialItem?.stack_order || 0,
    };

    onSaveIdea(ideaItem);
    onShowToast?.(initialItem ? '✏️ 아이디어가 수정되었습니다.' : '💡 새로운 아이디어가 안전하게 기록되었습니다.');

    if (settings.close_on_save) {
      onClose();
    } else {
      // 계속 기록하기 위해 폼 초기화
      setTitle('');
      setContent('');
      setAttachedImages([]);
      titleInputRef.current?.focus();
    }
  };

  // 키보드 단축키 (Ctrl+Enter / Cmd+Enter: 저장, Esc: 닫기)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const currentColorConfig = IDEA_PASTEL_COLORS.find((c) => c.id === selectedColor) || IDEA_PASTEL_COLORS[0];

  return (
    <div
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* 상단 컬러 액센트 바 */}
        <div
          style={{ backgroundColor: currentColorConfig.dot }}
          className="h-1.5 w-full transition-all duration-300"
        />

        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div
              style={{ backgroundColor: currentColorConfig.bg, borderColor: currentColorConfig.border }}
              className="w-9 h-9 rounded-2xl border flex items-center justify-center text-lg shadow-sm"
            >
              💡
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                {initialItem ? '아이디어 수정' : '새 아이디어 번뜩 캡처'}
              </h2>
              <p className="text-[11px] text-slate-400">Ctrl+Enter로 즉시 저장 / Ctrl+V로 스크린샷 바로 붙여넣기</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 폼 바디 */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm">
          {/* 분류 태그 및 5종 파스텔 도트 선택 바 */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            {/* 태그 셀렉터 */}
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-slate-400" />
              <div className="flex flex-wrap gap-1.5">
                {settings.tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => setSelectedTag(tag)}
                    style={{
                      backgroundColor: selectedTag.id === tag.id ? tag.color_code : 'transparent',
                      color: selectedTag.id === tag.id ? tag.text_color : undefined,
                      borderColor: tag.color_code,
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      selectedTag.id === tag.id
                        ? 'shadow-sm ring-1 ring-black/10 scale-105'
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 5종 파스텔 도트 컬러 선택 */}
            <div className="flex items-center gap-1.5">
              {IDEA_PASTEL_COLORS.map((col) => (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setSelectedColor(col.id)}
                  style={{ backgroundColor: col.dot }}
                  className={`w-6 h-6 rounded-full transition-all ${
                    selectedColor === col.id
                      ? 'ring-2 ring-offset-2 ring-slate-800 dark:ring-slate-100 scale-110 shadow-sm'
                      : 'opacity-70 hover:opacity-100 hover:scale-105'
                  }`}
                  title={col.name}
                />
              ))}
            </div>
          </div>

          {/* 제목 입력 */}
          <div className="space-y-1">
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="번뜩 떠오른 아이디어 제목을 입력하세요..."
              className="w-full px-4 py-2.5 text-sm font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          {/* 내용 입력 */}
          <div className="space-y-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="수업 구상, 학생 지도 방안, 업무 아이디어, 필요한 준비물 등 떠오른 생각을 자유롭게 기록하세요..."
              className="w-full p-4 text-xs leading-relaxed bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y"
            />
          </div>

          {/* 이미지 첨부 영역 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-sky-500" />
                첨부 이미지 ({attachedImages.length}개)
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Paperclip className="w-3 h-3" /> 파일 선택
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* 이미지 썸네일 그리드 */}
            {attachedImages.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                {attachedImages.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative group aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900"
                  >
                    <img
                      src={img.thumbnail_url}
                      alt={img.file_name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="p-1 rounded-full bg-rose-600 text-white hover:bg-rose-700 shadow-md transition-colors"
                        title="이미지 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="absolute bottom-1 left-1 px-1 py-0.5 text-[9px] bg-black/60 text-white rounded truncate max-w-[90%]">
                      {img.source_type === 'clipboard' ? '📋 캡처' : '📁 파일'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors text-center"
              >
                <UploadCloud className="w-6 h-6 mb-1 text-slate-400" />
                <span className="text-xs">클릭하여 이미지 파일을 추가하거나, 스크린샷 복사 후 바로 붙여넣기(Ctrl+V)</span>
              </div>
            )}
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            💡 단축키: <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded text-[10px]">Ctrl+Enter</kbd> 저장
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all active:scale-95"
            >
              <Check className="w-4 h-4" /> {initialItem ? '수정 완료' : '아이디어 저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
