import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Settings, Type, Sparkles, Check } from 'lucide-react';
import { PostItColor, PostItWidgetData } from '../types';

export interface PostItWidgetProps {
  data: PostItWidgetData;
  onUpdate?: (updated: PostItWidgetData) => void;
  onColorChange?: (color: PostItColor) => void;
  onTitleChange?: (title: string) => void;
  onContentChange?: (content: string) => void;
  onFontSizeChange?: (size: 'sm' | 'md' | 'lg') => void;
  onAddNewPostIt?: () => void;
  onAddAnother?: () => void;
  onDelete?: () => void;
  onShowToast?: (msg: string) => void;
}

export const POSTIT_COLOR_STYLES: Record<
  PostItColor,
  {
    bg: string;
    border: string;
    text: string;
    accent: string;
    name: string;
    dotBg: string;
    headerBg: string;
  }
> = {
  yellow: {
    bg: 'bg-amber-100/95 dark:bg-[#0c1424] shadow-sm',
    border: 'border-amber-300 dark:border-[#1e2c44]',
    text: 'text-amber-950 dark:text-[#f8fafc]',
    accent: 'bg-amber-400 dark:bg-amber-500/80',
    name: '레몬 옐로우',
    dotBg: 'bg-amber-400',
    headerBg: 'bg-amber-200/70 dark:bg-[#101a2d]',
  },
  green: {
    bg: 'bg-emerald-100/95 dark:bg-[#0c1424] shadow-sm',
    border: 'border-emerald-300 dark:border-[#1e2c44]',
    text: 'text-emerald-950 dark:text-[#f8fafc]',
    accent: 'bg-emerald-400 dark:bg-emerald-500/80',
    name: '민트 그린',
    dotBg: 'bg-emerald-400',
    headerBg: 'bg-emerald-200/70 dark:bg-[#101a2d]',
  },
  sky: {
    bg: 'bg-sky-100/95 dark:bg-[#0c1424] shadow-sm',
    border: 'border-sky-300 dark:border-[#1e2c44]',
    text: 'text-sky-950 dark:text-[#f8fafc]',
    accent: 'bg-sky-400 dark:bg-sky-500/80',
    name: '스카이 블루',
    dotBg: 'bg-sky-400',
    headerBg: 'bg-sky-200/70 dark:bg-[#101a2d]',
  },
  pink: {
    bg: 'bg-rose-100/95 dark:bg-[#0c1424] shadow-sm',
    border: 'border-rose-300 dark:border-[#1e2c44]',
    text: 'text-rose-950 dark:text-[#f8fafc]',
    accent: 'bg-rose-400 dark:bg-rose-500/80',
    name: '블라썸 핑크',
    dotBg: 'bg-rose-400',
    headerBg: 'bg-rose-200/70 dark:bg-[#101a2d]',
  },
  purple: {
    bg: 'bg-purple-100/95 dark:bg-[#0c1424] shadow-sm',
    border: 'border-purple-300 dark:border-[#1e2c44]',
    text: 'text-purple-950 dark:text-[#f8fafc]',
    accent: 'bg-purple-400 dark:bg-purple-500/80',
    name: '라벤더 퍼플',
    dotBg: 'bg-purple-400',
    headerBg: 'bg-purple-200/70 dark:bg-[#101a2d]',
  },
  orange: {
    bg: 'bg-orange-100/95 dark:bg-[#0c1424] shadow-sm',
    border: 'border-orange-300 dark:border-[#1e2c44]',
    text: 'text-orange-950 dark:text-[#f8fafc]',
    accent: 'bg-orange-400 dark:bg-orange-500/80',
    name: '피치 오렌지',
    dotBg: 'bg-orange-400',
    headerBg: 'bg-orange-200/70 dark:bg-[#101a2d]',
  },
  transparent: {
    bg: 'bg-white/30 dark:bg-[#0c1424] backdrop-blur-md shadow-sm',
    border: 'border-white/40 dark:border-[#1e2c44]',
    text: 'text-slate-900 dark:text-[#f8fafc]',
    accent: 'bg-white/40 dark:bg-[#1e2c44]',
    name: '투명 (위젯 융합)',
    dotBg: 'bg-[linear-gradient(45deg,#ccc_25%,transparent_25%),linear-gradient(-45deg,#ccc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#ccc_75%),linear-gradient(-45deg,transparent_75%,#ccc_75%)] bg-[length:6px_6px] bg-[position:0_0,0_3px,3px_-3px,-3px_0px] border border-slate-300',
    headerBg: 'bg-white/20 dark:bg-[#101a2d]',
  },
};

/**
 * 📌 무한 추가 및 설정 아이콘 팝오버 색상 선택을 지원하는 포스트잇 위젯
 * - 상단 설정(⚙️) 아이콘을 누르면 6가지 파스텔 컬러바 및 글자 크기 조절창이 부드럽게 노출됨
 * - 사용자 입력 실시간 저장 및 완벽한 양방향 상태 동기화
 */
export const PostItWidget: React.FC<PostItWidgetProps> = ({
  data,
  onUpdate,
  onColorChange,
  onTitleChange,
  onContentChange,
  onFontSizeChange,
  onAddNewPostIt,
  onAddAnother,
  onDelete,
  onShowToast,
}) => {
  // 설정 메뉴 (색상바 및 글자 크기) 토글 상태
  const [showSettings, setShowSettings] = useState(false);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
  const settingsBtnRef = useRef<HTMLButtonElement | null>(null);

  // 💡 설정 패널 외부 빈 영역 클릭 시 자동 닫힘
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        showSettings &&
        settingsPanelRef.current &&
        !settingsPanelRef.current.contains(e.target as Node) &&
        settingsBtnRef.current &&
        !settingsBtnRef.current.contains(e.target as Node)
      ) {
        setShowSettings(false);
      }
    };
    if (showSettings) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showSettings]);

  const currentStyle = POSTIT_COLOR_STYLES[data.color] || POSTIT_COLOR_STYLES.yellow;

  // 색상 변경 처리 (onColorChange 및 onUpdate 모두 지원)
  const handleSelectColor = (newColor: PostItColor) => {
    if (onColorChange) {
      onColorChange(newColor);
    }
    if (onUpdate) {
      onUpdate({ ...data, color: newColor, updatedAt: Date.now() });
    }
    onShowToast?.(`🎨 포스트잇 색상이 [${POSTIT_COLOR_STYLES[newColor].name}]으로 변경되었습니다.`);
  };

  // 제목 변경 처리
  const handleTitleChange = (val: string) => {
    if (onTitleChange) {
      onTitleChange(val);
    }
    if (onUpdate) {
      onUpdate({ ...data, title: val, updatedAt: Date.now() });
    }
  };

  // 내용 변경 처리
  const handleContentChange = (val: string) => {
    if (onContentChange) {
      onContentChange(val);
    }
    if (onUpdate) {
      onUpdate({ ...data, content: val, updatedAt: Date.now() });
    }
  };

  // 글자 크기 순환
  const handleFontSizeCycle = (size: 'sm' | 'md' | 'lg') => {
    if (onFontSizeChange) {
      onFontSizeChange(size);
    }
    if (onUpdate) {
      onUpdate({ ...data, fontSize: size, updatedAt: Date.now() });
    }
  };

  const handleAddAction = () => {
    if (onAddAnother) {
      onAddAnother();
    } else if (onAddNewPostIt) {
      onAddNewPostIt();
    }
  };

  const getTextSizeClass = () => {
    switch (data.fontSize) {
      case 'sm':
        return 'text-xs leading-relaxed';
      case 'lg':
        return 'text-base sm:text-lg leading-relaxed font-medium';
      case 'md':
      default:
        return 'text-sm leading-relaxed';
    }
  };

  return (
    <div
      className={`postit-widget-container w-full h-full min-h-[220px] flex flex-col p-4 rounded-2xl border transition-all duration-300 shadow-sm relative dark:!bg-[#0c1424] dark:!border-[#1e2c44] dark:!text-[#f8fafc] ${currentStyle.bg} ${currentStyle.text}`}
    >
      {/* 1. 상단 액션 바: 제목 및 설정/추가/삭제 컨트롤 (선 테두리 제거) */}
      <div className="flex items-center justify-between gap-2 pb-1.5 mb-1 select-none">
        <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-1">
          <input
            type="text"
            value={data.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="포스트잇 제목..."
            className="w-full bg-transparent font-black text-sm outline-none placeholder:opacity-50 tracking-tight"
          />
        </div>

        {/* 액션 버튼 그룹 */}
        <div className="flex items-center gap-1 shrink-0">
          {/* ⚙️ 설정 아이콘 (사용자 핵심 요구: 클릭 시 색상바 노출) */}
          <button
            ref={settingsBtnRef}
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            title="포스트잇 색상 및 글자 크기 설정"
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              showSettings
                ? 'bg-black/20 dark:bg-white/25 shadow-xs scale-105'
                : 'hover:bg-black/10 dark:hover:bg-white/10 opacity-75 hover:opacity-100'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* [+ 포스트잇 추가] 버튼 */}
          {(onAddAnother || onAddNewPostIt) && (
            <button
              type="button"
              onClick={handleAddAction}
              title="새로운 포스트잇 위젯 하나 더 추가"
              className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition cursor-pointer opacity-75 hover:opacity-100 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}

          {/* [🗑️ 삭제] 버튼 */}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              title="이 포스트잇 삭제"
              className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 transition cursor-pointer opacity-75 hover:opacity-100"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. 설정 아이콘 클릭 시 슬라이드 다운되는 [색상바 & 글자 크기 패널] */}
      {showSettings && (
        <div
          ref={settingsPanelRef}
          className="p-2.5 mb-2.5 rounded-xl bg-black/5 dark:bg-[#101a2d] border border-black/10 dark:border-[#1e2c44] flex flex-col gap-2 animate-fade-in shadow-xs"
        >
          {/* 색상 선택 팔레트 바 & 저장 체크 버튼 */}
          <div>
            <div className="flex items-center justify-between text-[10px] font-bold opacity-70 mb-1">
              <span className="flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                파스텔 색상 선택
              </span>
              <div className="flex items-center gap-1.5">
                <span>{currentStyle.name}</span>
                {/* 💡 [설정 후 저장 체크 버튼] */}
                <button
                  type="button"
                  onClick={() => {
                    setShowSettings(false);
                    onShowToast?.(`✓ 포스트잇 설정이 저장되었습니다.`);
                  }}
                  className="px-2 py-0.5 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition"
                  title="설정 저장 및 닫기"
                >
                  <Check className="w-3 h-3" strokeWidth={2.5} />
                  <span>저장</span>
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-1 p-1 bg-white/60 dark:bg-[#070c18] border border-transparent dark:border-[#1e2c44] rounded-lg">
              {(Object.keys(POSTIT_COLOR_STYLES) as PostItColor[]).map((c) => {
                const isSelected = data.color === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleSelectColor(c)}
                    title={POSTIT_COLOR_STYLES[c].name}
                    className={`flex-1 h-6 rounded-md transition-all cursor-pointer flex items-center justify-center ${
                      POSTIT_COLOR_STYLES[c].dotBg
                    } ${
                      isSelected
                        ? 'ring-2 ring-slate-900 dark:ring-white scale-105 shadow-xs'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-900 shadow-2xs" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 글자 크기 선택기 */}
          <div className="flex items-center justify-between pt-1 border-t border-black/5 dark:border-[#1e2c44]">
            <span className="text-[10px] font-bold opacity-70 flex items-center gap-1">
              <Type className="w-3 h-3" />
              글자 크기
            </span>
            <div className="flex items-center gap-1 bg-white/60 dark:bg-[#070c18] border border-transparent dark:border-[#1e2c44] p-0.5 rounded-lg">
              {(['sm', 'md', 'lg'] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => handleFontSizeCycle(sz)}
                  className={`px-2 py-0.5 rounded text-[10px] font-black transition cursor-pointer ${
                    (data.fontSize || 'md') === sz
                      ? 'bg-black/80 dark:bg-indigo-600 text-white shadow-2xs'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  {sz === 'sm' ? '작게' : sz === 'md' ? '보통' : '크게'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. 포스트잇 본문 작성 (자동 줄바꿈 및 스크롤) */}
      <textarea
        value={data.content}
        onChange={(e) => handleContentChange(e.target.value)}
        placeholder="자유롭게 메모를 적어보세요...&#10;• 오늘의 알림장 내용&#10;• 학생 상담 메모&#10;• 수업 준비물"
        style={{ backgroundColor: 'transparent' }}
        className={`w-full flex-1 bg-transparent resize-none outline-none custom-scroll pt-1 placeholder:opacity-40 font-medium ${getTextSizeClass()}`}
      />

      {/* 3.5 다크 모드 매칭 배지 */}
      <div className="hidden dark:flex items-center gap-2 my-1 select-none">
        <span className="px-2 py-0.5 rounded text-[10px] bg-[#101a2d] text-[#38bdf8] border border-[#1e2c44] font-medium">
          학급 회의 결정사항
        </span>
        <span className="px-2 py-0.5 rounded text-[10px] bg-[#101a2d] text-[#a5b4fc] border border-[#1e2c44] font-medium">
          실시간 반 게시판
        </span>
      </div>

      {/* 4. 하단 상태 인디케이터 */}
      <div className="pt-1.5 text-[10px] flex items-center justify-between select-none">
        <span className="dark:text-slate-400 font-medium opacity-80 dark:opacity-100 flex items-center gap-1">
          <span className="hidden dark:inline">✓</span>
          <span>{typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? '학급 전원 동의' : '실시간 저장됨'}</span>
        </span>
        <span className="opacity-50 dark:opacity-70 dark:text-slate-400">
          {typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
            ? '방금 업데이트'
            : data.updatedAt
              ? new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '방금'}
        </span>
      </div>
    </div>
  );
};
