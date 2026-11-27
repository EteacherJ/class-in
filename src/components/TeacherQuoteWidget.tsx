import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit3,
  Trash2,
  X,
  RotateCcw,
  Sparkles,
  ArrowUpDown,
  Calendar,
  Building2,
  Repeat,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { QuoteItem } from '../types';

export interface TeacherQuoteWidgetProps {
  onShowToast?: (msg: string) => void;
  /** 상단 헤더 더블클릭 시 뽀모도로 타이머와 자리/스택 교대 */
  onSwapWithTimer?: () => void;
  /** 스택 보관함 상단 모드 여부 */
  isStackMode?: boolean;
  /** 메인 캔버스로 펼치기 (복원) */
  onExpandToCanvas?: () => void;
  /** 스택 영역으로 접기 */
  onCollapseToStack?: () => void;
}

/**
 * 🧹 학년·반 문구 정제 헬퍼
 */
export const cleanGradeClassText = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/우리\s*3학년\s*1반/g, '')
    .replace(/3학년\s*1반/g, '')
    .replace(/우리\s*3학년/g, '')
    .replace(/3학년/g, '')
    .replace(/1반/g, '')
    .trim();
};

// 📚 초등 교실과 독서 교육을 위한 감동적인 초기 도서 문장 프리셋 5선
const INITIAL_PRESET_QUOTES: QuoteItem[] = [
  {
    id: 'quote-preset-1',
    text: '가장 중요한 것은 눈에 보이지 않아. 마음으로 보아야만 분명하게 보여.',
    bookTitle: '어린 왕자',
    publisher: '열린책들',
    author: '생텍쥐페리',
    createdAt: '2026-09-01',
    isSelected: true,
  },
  {
    id: 'quote-preset-2',
    text: '포기하지 않고 날아오를 때, 우리는 진짜 아름다운 나비가 될 수 있어.',
    bookTitle: '꽃들에게 희망을',
    publisher: '시공주니어',
    author: '트리나 폴러스',
    createdAt: '2026-09-02',
    isSelected: false,
  },
  {
    id: 'quote-preset-3',
    text: '너는 내 소중한 친구였어. 그것만으로도 세상에서 가장 근사하고 멋진 일이야.',
    bookTitle: '샬롯의 거미줄',
    publisher: '시공주니어',
    author: 'E.B. 화이트',
    createdAt: '2026-09-03',
    isSelected: false,
  },
  {
    id: 'quote-preset-4',
    text: '사랑하는 법을 알면, 세상의 어떤 슬픔도 함께 이겨낼 수 있단다.',
    bookTitle: '나의 라임오렌지나무',
    publisher: '동녘',
    author: 'J.M. 바스콘셀로스',
    createdAt: '2026-09-04',
    isSelected: false,
  },
  {
    id: 'quote-preset-5',
    text: '스스로에게 부끄럽지 않은 정직함이야말로 마음을 가장 단단하게 해주는 힘이란다.',
    bookTitle: '자전거 도둑',
    publisher: '다림',
    author: '박완서',
    createdAt: '2026-09-05',
    isSelected: false,
  },
];

const MAX_PLAYLIST_COUNT = 30;

// 자동 노출 주기 옵션 (ms)
const INTERVAL_OPTIONS = [
  { label: '1분', value: 60000 },
  { label: '5분', value: 300000 },
  { label: '30분', value: 1800000 },
  { label: '1시간', value: 3600000 },
];

/**
 * 📖 [독서 노트 위젯]
 * - 명칭: 독서 노트 (도서명, 출판사, 기록날짜, 책 속 한 문장)
 * - 자동 순차 재생 (Auto-Play) 토글 및 1분/5분/30분/1시간 주기 설정
 * - 반응형 폰트 및 부드러운 페이드 전환 애니메이션
 * - 상단 헤더 더블클릭 시: 좌측 스택 영역(유튜브 상단 슬롯) ↔ 메인 캔버스 상호 전환
 */
export const TeacherQuoteWidget: React.FC<TeacherQuoteWidgetProps> = ({
  onShowToast,
  onSwapWithTimer,
  isStackMode = false,
  onExpandToCanvas,
  onCollapseToStack,
}) => {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 1. 도서 문장 재생목록 로컬스토리지 연동
  const [playlist, setPlaylist] = useState<QuoteItem[]>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_quote_playlist');
      if (saved) {
        const parsed: QuoteItem[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasSelected = parsed.some((item) => item.isSelected);
          if (!hasSelected && parsed[0]) {
            parsed[0].isSelected = true;
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error('🔴 [ReadingNote] 재생목록 로드 실패:', e);
    }
    return INITIAL_PRESET_QUOTES;
  });

  // 2. 자동 순차 재생(Auto-Play) 여부
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_reading_note_is_playing');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  // 3. 노출 주기 (1분, 5분, 30분, 1시간)
  const [intervalMs, setIntervalMs] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_reading_note_interval');
      if (saved) {
        const num = parseInt(saved, 10);
        if ([60000, 300000, 1800000, 3600000].includes(num)) return num;
      }
    } catch {}
    return 60000; // 기본 1분
  });

  // 페이드 애니메이션 상태
  const [isFading, setIsFading] = useState(false);

  // 4. 기록 추가/관리 모달 열림 여부
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 5. 신규 문장 입력 폼 상태
  const todayStr = new Date().toISOString().split('T')[0];
  const [newDate, setNewDate] = useState(todayStr);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newPublisher, setNewPublisher] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newText, setNewText] = useState('');

  // 6. 인라인 수정 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editBookTitle, setEditBookTitle] = useState('');
  const [editPublisher, setEditPublisher] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editText, setEditText] = useState('');

  // 현재 노출 중인 문구
  const currentQuote =
    playlist.find((item) => item.isSelected) ||
    playlist[0] || {
      id: 'fallback',
      text: '책과 함께하는 따뜻한 하루, 소중한 문장을 기록해보세요.',
      bookTitle: '독서 노트',
      createdAt: todayStr,
      isSelected: true,
    };

  // 💾 재생목록 로컬스토리지 저장
  const savePlaylistToStorage = useCallback((list: QuoteItem[]) => {
    try {
      localStorage.setItem('class_dashboard_quote_playlist', JSON.stringify(list));
    } catch (e) {
      console.error('🔴 [ReadingNote] 로컬스토리지 저장 실패:', e);
    }
  }, []);

  // 🔄 다음 문장 넘기기 (부드러운 페이드 전환)
  const handleNextQuote = useCallback(() => {
    if (playlist.length <= 1) return;
    setIsFading(true);
    setTimeout(() => {
      setPlaylist((prev) => {
        const currentIndex = prev.findIndex((item) => item.isSelected);
        const nextIndex = (currentIndex + 1) % prev.length;
        const updated = prev.map((item, idx) => ({
          ...item,
          isSelected: idx === nextIndex,
        }));
        savePlaylistToStorage(updated);
        return updated;
      });
      setIsFading(false);
    }, 250);
  }, [playlist.length, savePlaylistToStorage]);

  // ◀ 이전 문장 넘기기
  const handlePrevQuote = useCallback(() => {
    if (playlist.length <= 1) return;
    setIsFading(true);
    setTimeout(() => {
      setPlaylist((prev) => {
        const currentIndex = prev.findIndex((item) => item.isSelected);
        const prevIndex = (currentIndex - 1 + prev.length) % prev.length;
        const updated = prev.map((item, idx) => ({
          ...item,
          isSelected: idx === prevIndex,
        }));
        savePlaylistToStorage(updated);
        return updated;
      });
      setIsFading(false);
    }, 250);
  }, [playlist.length, savePlaylistToStorage]);

  // ⏯️ 자동 재생 토글
  const handleToggleAutoPlay = () => {
    setIsAutoPlay((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('class_dashboard_reading_note_is_playing', JSON.stringify(next));
      } catch {}
      if (next) {
        const opt = INTERVAL_OPTIONS.find((o) => o.value === intervalMs);
        onShowToast?.(`▶️ 독서 노트 자동 재생 시작 (${opt?.label || '1분'} 주기)`);
      } else {
        onShowToast?.('⏸️ 독서 노트 자동 재생이 일시정지되었습니다.');
      }
      return next;
    });
  };

  // ⏱️ 노출 주기 변경
  const handleIntervalChange = (newVal: number) => {
    setIntervalMs(newVal);
    try {
      localStorage.setItem('class_dashboard_reading_note_interval', String(newVal));
    } catch {}
    const opt = INTERVAL_OPTIONS.find((o) => o.value === newVal);
    onShowToast?.(`⏱️ 문장 노출 주기가 [${opt?.label}]으로 설정되었습니다.`);
  };

  // ⏰ 자동 롤링 타이머
  useEffect(() => {
    if (!isAutoPlay || playlist.length <= 1) return;

    const timer = setInterval(() => {
      handleNextQuote();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isAutoPlay, intervalMs, playlist.length, handleNextQuote]);

  // ➕ 신규 문장 추가 핸들러
  const handleAddNote = (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanContent = cleanGradeClassText(newText.trim());
    if (!cleanContent) {
      onShowToast?.('⚠️ 책 속 한 문장을 입력해주세요.');
      return;
    }
    if (playlist.length >= MAX_PLAYLIST_COUNT) {
      onShowToast?.(`⚠️ 독서 노트는 최대 ${MAX_PLAYLIST_COUNT}개까지 기록할 수 있습니다.`);
      return;
    }

    const newItem: QuoteItem = {
      id: `reading-note-${Date.now()}`,
      text: cleanContent,
      bookTitle: newBookTitle.trim() || undefined,
      publisher: newPublisher.trim() || undefined,
      author: newAuthor.trim() || undefined,
      createdAt: newDate || todayStr,
      isSelected: false,
    };

    const updated = [newItem, ...playlist];
    setPlaylist(updated);
    savePlaylistToStorage(updated);

    // 폼 초기화
    setNewText('');
    setNewBookTitle('');
    setNewPublisher('');
    setNewAuthor('');
    setNewDate(todayStr);

    onShowToast?.('✨ 새로운 독서 노트가 등록되었습니다!');
  };

  // ✏️ 수정 시작
  const handleStartEdit = (item: QuoteItem) => {
    setEditingId(item.id);
    setEditText(item.text);
    setEditBookTitle(item.bookTitle || '');
    setEditPublisher(item.publisher || '');
    setEditAuthor(item.author || '');
    setEditDate(item.createdAt || todayStr);
  };

  // 💾 수정 저장
  const handleSaveEdit = (id: string) => {
    const cleanContent = cleanGradeClassText(editText.trim());
    if (!cleanContent) {
      onShowToast?.('⚠️ 수정할 문장을 입력해주세요.');
      return;
    }

    const updated = playlist.map((item) =>
      item.id === id
        ? {
            ...item,
            text: cleanContent,
            bookTitle: editBookTitle.trim() || undefined,
            publisher: editPublisher.trim() || undefined,
            author: editAuthor.trim() || undefined,
            createdAt: editDate || todayStr,
          }
        : item
    );

    setPlaylist(updated);
    savePlaylistToStorage(updated);
    setEditingId(null);
    onShowToast?.('✅ 독서 노트가 성공적으로 수정되었습니다.');
  };

  // 🗑️ 삭제
  const handleDeleteNote = (id: string) => {
    if (playlist.length <= 1) {
      onShowToast?.('⚠️ 최소 1개 이상의 독서 노트가 유지되어야 합니다.');
      return;
    }
    const target = playlist.find((i) => i.id === id);
    const updated = playlist.filter((item) => item.id !== id);

    if (target?.isSelected && updated.length > 0) {
      updated[0].isSelected = true;
    }

    setPlaylist(updated);
    savePlaylistToStorage(updated);
    onShowToast?.('🗑️ 독서 노트가 삭제되었습니다.');
  };

  // 📌 특정 문구 선택 즉시 표시
  const handleSelectNote = (id: string) => {
    setIsFading(true);
    setTimeout(() => {
      const updated = playlist.map((item) => ({
        ...item,
        isSelected: item.id === id,
      }));
      setPlaylist(updated);
      savePlaylistToStorage(updated);
      setIsFading(false);
    }, 150);
  };

  // 🔄 기본 추천 문구 복원
  const handleResetDefaults = () => {
    setPlaylist(INITIAL_PRESET_QUOTES);
    savePlaylistToStorage(INITIAL_PRESET_QUOTES);
    onShowToast?.('🔄 추천 도서 문장 5선으로 복원되었습니다.');
  };

  return (
    <section
      data-reading-note="true"
      style={{ fontFamily: 'var(--app-font-family, inherit)' }}
      className={`w-full h-full flex flex-col justify-between items-center select-none overflow-hidden relative rounded-2xl transition-all duration-300 ${
        isStackMode
          ? 'p-2.5 sm:p-3 min-h-[210px] h-[210px] max-h-[210px] bg-[#101a2d] border border-[#1e2c44] text-[#f8fafc] shadow-md'
          : 'p-3 sm:p-4.5 bg-gradient-to-br from-amber-50/40 via-white/40 to-rose-50/30 dark:bg-none dark:bg-transparent dark:border-[#1e2c44] text-slate-800 dark:text-[#f8fafc]'
      }`}
    >
      {/* 🧭 상단 툴바 & 헤더 영역 (더블클릭 시 스택 이동 ↔ 메인 복원) */}
      <div
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (isStackMode) {
            console.log('🔵 [TeacherQuoteWidget] 뽀모도로 슬롯 헤더 더블클릭 감지 -> 메인 캔버스로 펼치기 실행');
            if (onExpandToCanvas) {
              onExpandToCanvas();
            }
          } else {
            console.log('🔵 [TeacherQuoteWidget] 메인 헤더 더블클릭 감지 -> 좌측 스택 영역(뽀모도로 슬롯)으로 이동 실행');
            if (onCollapseToStack) {
              onCollapseToStack();
            }
          }
        }}
        title={
          isStackMode
            ? '💡 상단 헤더를 더블클릭하면 메인 화면으로 펼쳐집니다.'
            : '💡 상단 헤더를 더블클릭하면 좌측 스택 영역(유튜브 플레이어 상단)으로 이동합니다.'
        }
        className={`w-full flex items-center justify-between pb-2 border-b z-20 cursor-pointer group/header ${
          isStackMode ? 'border-[#1e2c44]' : 'border-amber-200/50 dark:border-slate-800/80'
        }`}
      >
        {/* 좌측 타이틀 아이콘 (스택 모드에서는 텍스트를 숨겨 버튼 공간 확보) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold shrink-0 shadow-xs ${
              isStackMode
                ? 'bg-[#0c1424] text-amber-400 border border-[#1e2c44]'
                : 'bg-amber-500/15 dark:bg-amber-400/20 text-amber-600 dark:text-amber-400'
            }`}
            title={isStackMode ? '독서 노트 (더블클릭 시 메인 화면으로 복원)' : '독서 노트'}
          >
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          {!isStackMode && (
            <span className="text-xs sm:text-sm font-black tracking-tight text-slate-800 dark:text-slate-100 whitespace-nowrap">
              독서 노트
            </span>
          )}
        </div>

        {/* 우측 재생 및 컨트롤 바 */}
        <div className="flex items-center gap-0.5 sm:gap-1" onClick={(e) => e.stopPropagation()}>
          {/* 노출 주기 선택 셀렉트 */}
          <div className="relative flex items-center">
            <select
              value={intervalMs}
              onChange={(e) => handleIntervalChange(Number(e.target.value))}
              className={`text-[11px] font-bold px-1.5 py-1 rounded-lg outline-none cursor-pointer transition appearance-none pr-4 ${
                isStackMode
                  ? 'bg-[#0c1424] text-slate-200 border border-[#1e2c44] hover:bg-[#142036]'
                  : 'bg-amber-100/60 dark:bg-slate-800 border border-amber-300/40 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-amber-200/50'
              }`}
              title="자동 순차 재생 주기 선택"
            >
              {INTERVAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Repeat className="w-2.5 h-2.5 absolute right-1 pointer-events-none text-slate-400" />
          </div>

          {/* 재생/일시정지 토글 버튼 */}
          <button
            type="button"
            onClick={handleToggleAutoPlay}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer active:scale-95 ${
              isAutoPlay
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs ring-2 ring-amber-300'
                : isStackMode
                ? 'bg-[#0c1424] hover:bg-[#142036] text-slate-200 border border-[#1e2c44]'
                : 'bg-white/80 dark:bg-slate-800 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:text-amber-600'
            }`}
            title={isAutoPlay ? '자동 재생 일시정지' : '자동 순차 재생 시작'}
          >
            {isAutoPlay ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />}
          </button>

          {/* 이전 문장 버튼 */}
          <button
            type="button"
            onClick={handlePrevQuote}
            disabled={playlist.length <= 1}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
              isStackMode
                ? 'bg-[#0c1424] hover:bg-[#142036] text-slate-300 border border-[#1e2c44]'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800'
            }`}
            title="이전 문장 보기"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* 다음 문장 버튼 */}
          <button
            type="button"
            onClick={handleNextQuote}
            disabled={playlist.length <= 1}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
              isStackMode
                ? 'bg-[#0c1424] hover:bg-[#142036] text-slate-300 border border-[#1e2c44]'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800'
            }`}
            title="다음 문장 보기"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* 도서 기록 및 관리 버튼 */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer active:scale-95 ml-0.5 ${
              isStackMode
                ? 'bg-[#0c1424] hover:bg-[#142036] text-amber-400 border border-[#1e2c44]'
                : 'text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50/80 dark:hover:bg-amber-950/40'
            }`}
            title="도서 및 문장 기록 관리"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          {/* ⤢ 스택 모드일 때: 메인 캔버스 영역으로 펼치기 버튼 */}
          {isStackMode && onExpandToCanvas && (
            <button
              type="button"
              onClick={onExpandToCanvas}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer active:scale-95 ml-0.5 ${
                isStackMode
                  ? 'bg-[#0c1424] hover:bg-[#142036] text-slate-300 border border-[#1e2c44]'
                  : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-amber-100/60 dark:hover:bg-slate-700'
              }`}
              title="메인 캔버스 영역으로 펼치기"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* ⤡ 메인 모드일 때: 스택 영역으로 접기 버튼 */}
          {!isStackMode && onCollapseToStack && (
            <button
              type="button"
              onClick={onCollapseToStack}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-amber-100/60 dark:hover:bg-slate-700 transition cursor-pointer active:scale-95 ml-0.5"
              title="스택 보관함으로 접기"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 📖 메인 영역: 책 속 한 문장 + 하단 도서명·출판사·기록날짜 카드 */}
      <div className={`flex-1 w-full flex flex-col items-center justify-center text-center my-auto overflow-y-auto custom-scrollbar ${
        isStackMode ? 'p-1 sm:p-2' : 'p-2 sm:p-4'
      }`}>
        {/* 문장 본문 (반응형 폰트 & 부드러운 페이드 전환) */}
        <div
          className={`transition-all duration-300 ease-out flex flex-col items-center justify-center ${
            isFading ? 'opacity-0 scale-98 translate-y-1' : 'opacity-100 scale-100 translate-y-0'
          }`}
        >
          <span className={`select-none ${
            isStackMode ? 'text-amber-400/70 text-xl sm:text-2xl -mb-1' : 'text-amber-500/30 dark:text-amber-400/20 text-3xl sm:text-4xl -mb-2'
          }`}>
            “
          </span>
          <p
            style={{ fontFamily: 'var(--app-font-family, inherit)' }}
            className={`${
              isStackMode ? 'text-xs sm:text-sm line-clamp-3 text-[#f8fafc]' : 'text-base sm:text-lg md:text-xl text-slate-800 dark:text-slate-100'
            } font-bold leading-relaxed px-2 break-keep tracking-tight reading-note-body`}
          >
            {cleanGradeClassText(currentQuote.text)}
          </p>
          <span className={`select-none ${
            isStackMode ? 'text-amber-400/70 text-xl sm:text-2xl -mt-0.5' : 'text-amber-500/30 dark:text-amber-400/20 text-3xl sm:text-4xl -mt-1'
          }`}>
            ”
          </span>

          {/* 하단 메타 정보 (도서명, 출판사, 기록날짜) */}
          <div className={`${
            isStackMode ? 'mt-1.5 gap-1 text-[11px]' : 'mt-3 gap-1.5 text-xs'
          } flex flex-wrap items-center justify-center text-slate-400 font-medium tracking-tight`}>
            {currentQuote.bookTitle && (
              <span className={`px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border ${
                isStackMode
                  ? 'bg-[#0c1424] text-amber-300 border-[#1e2c44]'
                  : 'bg-amber-100/70 dark:bg-slate-800 text-amber-900 dark:text-amber-300 border-amber-200/50 dark:border-slate-700'
              }`}>
                <span>📖</span>
                <span>{cleanGradeClassText(currentQuote.bookTitle)}</span>
              </span>
            )}

            {!isStackMode && currentQuote.publisher && (
              <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-400" />
                <span>{currentQuote.publisher}</span>
              </span>
            )}

            {!isStackMode && currentQuote.author && (
              <span className="text-slate-400 dark:text-slate-500">
                · {currentQuote.author}
              </span>
            )}

            {!isStackMode && currentQuote.createdAt && (
              <span className="px-1.5 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800/60 text-slate-400 text-[11px] flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" />
                <span>{currentQuote.createdAt}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📚 독서 노트 기록 및 관리 모달 (React Portal) */}
      {/* ========================================================================= */}
      {isModalOpen && isMounted && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none">
          {/* 바깥 배경 클릭 시 닫기 */}
          <div
            className="fixed inset-0"
            onClick={() => setIsModalOpen(false)}
            aria-hidden="true"
          />

          {/* 모달 다이얼로그 본체 */}
          <div
            data-reading-note="true"
            style={{ fontFamily: 'var(--app-font-family, inherit)' }}
            className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-amber-200 dark:border-amber-900/60 flex flex-col max-h-[88vh] overflow-hidden text-slate-800 dark:text-slate-100 z-10 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-50/80 to-rose-50/80 dark:from-slate-800/80 dark:to-amber-950/40 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-200 dark:shadow-none">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <span>독서 노트 기록 및 관리</span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                      {playlist.length}/{MAX_PLAYLIST_COUNT}권
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    도서명, 출판사, 기록날짜와 함께 감동적인 책 속 한 문장을 기록해보세요.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800 transition cursor-pointer"
                title="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
              {/* 1. 신규 기록 입력 폼 */}
              <form onSubmit={handleAddNote} className="p-3.5 bg-amber-50/50 dark:bg-slate-800/60 rounded-2xl border border-amber-200/80 dark:border-slate-700/80 space-y-2.5">
                <div className="font-bold text-xs text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  <span>새로운 독서 문장 기록하기</span>
                </div>

                {/* 입력 상단 그리드: 기록날짜, 도서명, 출판사, 지은이 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="date" min="2000-01-01" max="2099-12-31"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full bg-transparent font-semibold text-slate-800 dark:text-slate-100 outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="도서명 (예: 어린 왕자)"
                      value={newBookTitle}
                      onChange={(e) => setNewBookTitle(e.target.value)}
                      maxLength={40}
                      className="w-full bg-transparent font-semibold text-slate-800 dark:text-slate-100 outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="출판사 (예: 열린책들)"
                      value={newPublisher}
                      onChange={(e) => setNewPublisher(e.target.value)}
                      maxLength={30}
                      className="w-full bg-transparent font-semibold text-slate-800 dark:text-slate-100 outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                    <span className="text-slate-400 text-xs">✍️</span>
                    <input
                      type="text"
                      placeholder="지은이 (선택, 예: 생텍쥐페리)"
                      value={newAuthor}
                      onChange={(e) => setNewAuthor(e.target.value)}
                      maxLength={30}
                      className="w-full bg-transparent font-semibold text-slate-800 dark:text-slate-100 outline-none"
                    />
                  </div>
                </div>

                {/* 책 속 한 문장 멀티라인 입력 */}
                <div>
                  <textarea
                    rows={2}
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    placeholder="책 속 한 문장 / 중요 문장을 적어주세요..."
                    maxLength={200}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-400 transition resize-none"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={playlist.length >= MAX_PLAYLIST_COUNT}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>독서 노트 등록</span>
                  </button>
                </div>
              </form>

              {/* 2. 등록된 독서 노트 리스트 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                    기록된 독서 노트 목록 ({playlist.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="text-[11px] font-bold text-slate-400 hover:text-amber-600 transition flex items-center gap-1 cursor-pointer"
                    title="기본 추천 도서 문장 5선으로 초기화"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>추천 프리셋 복원</span>
                  </button>
                </div>

                {playlist.map((item) => {
                  const isEditing = editingId === item.id;

                  if (isEditing) {
                    return (
                      <div
                        key={item.id}
                        className="p-3 bg-white dark:bg-slate-800 rounded-2xl border-2 border-amber-400 shadow-sm space-y-2 text-xs"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          <input
                            type="date" min="2000-01-01" max="2099-12-31"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                          />
                          <input
                            type="text"
                            placeholder="도서명"
                            value={editBookTitle}
                            onChange={(e) => setEditBookTitle(e.target.value)}
                            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                          />
                          <input
                            type="text"
                            placeholder="출판사"
                            value={editPublisher}
                            onChange={(e) => setEditPublisher(e.target.value)}
                            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                          />
                          <input
                            type="text"
                            placeholder="지은이"
                            value={editAuthor}
                            onChange={(e) => setEditAuthor(e.target.value)}
                            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                          />
                        </div>

                        <textarea
                          rows={2}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs resize-none"
                        />

                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition cursor-pointer"
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(item.id)}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 rounded-lg text-xs font-bold text-white transition cursor-pointer"
                          >
                            저장
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectNote(item.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        item.isSelected
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 shadow-sm ring-1 ring-amber-400'
                          : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p
                          style={{ fontFamily: 'var(--app-font-family, inherit)' }}
                          className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-2"
                        >
                          “{cleanGradeClassText(item.text)}”
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                          {item.bookTitle && (
                            <span className="font-bold text-amber-700 dark:text-amber-400">
                              📖 {item.bookTitle}
                            </span>
                          )}
                          {item.publisher && <span>· {item.publisher}</span>}
                          {item.createdAt && <span>({item.createdAt})</span>}
                          {item.isSelected && (
                            <span className="ml-1 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-500 text-white">
                              현재 노출 중
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 액션 버튼들 */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
                          title="수정"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(item.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/60 dark:bg-slate-900 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                확인 및 닫기
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
};
