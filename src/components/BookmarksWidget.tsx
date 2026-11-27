import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Globe,
  Plus,
  ExternalLink,
  Settings2,
  Trash2,
  Edit2,
  Check,
  X,
  Sparkles,
  Link as LinkIcon,
} from 'lucide-react';

export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  type?: 'web' | 'app'; // 🌐 웹사이트 또는 💻 컴퓨터 설치 프로그램
  description?: string;
  iconUrl?: string; // 파비콘 또는 Icons8 / 이미지 URL
  bgColor?: string;  // 아이콘 배경색
}

// 🏫 초등 교사용 기본 필수 사이트 프리셋 (나이스, K-에듀파인, 학교홈페이지)
const DEFAULT_BOOKMARKS: BookmarkItem[] = [
  {
    id: 'neis',
    title: '나이스 (NEIS)',
    url: 'https://www.neis.go.kr',
    type: 'web',
    description: '교육행정정보시스템 (출결/생기부/성적)',
    iconUrl: 'https://img.icons8.com/color/96/school.png',
    bgColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    id: 'edufine',
    title: 'K-에듀파인',
    url: 'https://klef.sen.go.kr',
    type: 'web',
    description: '지방교육재정시스템 (공문서/기안/품의)',
    iconUrl: 'https://img.icons8.com/color/96/document--v1.png',
    bgColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'school_home',
    title: '학교알리미',
    url: 'https://www.schoolinfo.go.kr',
    type: 'web',
    description: '전국 학교 공시 정보 (우리 학교 홈페이지로 바꿔 쓰세요)',
    iconUrl: 'https://img.icons8.com/color/96/home--v1.png',
    bgColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
];

// 💻 교실 PC 자주 쓰는 설치 프로그램 프리셋
export const APP_PRESETS: Array<{
  title: string;
  url: string;
  description: string;
  iconUrl: string;
}> = [
  {
    title: '한글 (HWP)',
    url: 'hwp:',
    description: '한컴오피스 한글 문서 작성 프로그램',
    iconUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="%232b72d7"/><text x="50%" y="54%" font-family="sans-serif" font-weight="900" font-size="22" fill="white" dominant-baseline="middle" text-anchor="middle">한</text></svg>',
  },
  {
    title: '엑셀 (Excel)',
    url: 'ms-excel:',
    description: 'Microsoft Excel 스프레드시트',
    iconUrl: 'https://img.icons8.com/color/96/microsoft-excel-2019--v1.png',
  },
  {
    title: '파워포인트 (PPT)',
    url: 'ms-powerpoint:',
    description: 'Microsoft PowerPoint 발표 자료',
    iconUrl: 'https://img.icons8.com/color/96/microsoft-powerpoint-2019--v1.png',
  },
  {
    title: '워드 (Word)',
    url: 'ms-word:',
    description: 'Microsoft Word 문서 작성기',
    iconUrl: 'https://img.icons8.com/color/96/microsoft-word-2019--v2.png',
  },
  {
    title: '계산기',
    url: 'calculator:',
    description: '컴퓨터 기본 계산기 프로그램',
    iconUrl: 'https://img.icons8.com/color/96/calculator--v1.png',
  },
  {
    title: '카카오톡',
    url: 'kakaotalk://',
    description: 'PC 카카오톡 메신저',
    iconUrl: 'https://img.icons8.com/color/96/kakaotalk.png',
  },
  {
    title: '노션 (Notion)',
    url: 'notion://',
    description: '노션 데스크톱 앱',
    iconUrl: 'https://img.icons8.com/color/96/notion--v2.png',
  },
  {
    title: '줌 (Zoom)',
    url: 'zoommtg://',
    description: 'Zoom 온라인 화상 회의 프로그램',
    iconUrl: 'https://img.icons8.com/color/96/zoom.png',
  },
];

interface BookmarksWidgetProps {
  onShowToast?: (message: string) => void;
  isCompactRow?: boolean;
}

export const BookmarksWidget: React.FC<BookmarksWidgetProps> = ({ onShowToast, isCompactRow = false }) => {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_bookmarks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_BOOKMARKS;
  });

  // 모달 상태 (추가 및 수정)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 폼 입력 상태
  const [formType, setFormType] = useState<'web' | 'app'>('web');
  const [formTitle, setFormTitle] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIconUrl, setFormIconUrl] = useState('');

  // 🎯 1행 확장 모드 드래그 앤 드롭 위치 변경 상태 (요청 7)
  const [draggedBookmarkId, setDraggedBookmarkId] = useState<string | null>(null);
  const [dragOverBookmarkId, setDragOverBookmarkId] = useState<string | null>(null);
  const isDraggingItemRef = React.useRef<boolean>(false);

  const handleItemDragStart = (e: React.DragEvent, id: string) => {
    isDraggingItemRef.current = true;
    setDraggedBookmarkId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleItemDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverBookmarkId !== targetId) {
      setDragOverBookmarkId(targetId);
    }
  };

  const handleItemDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedBookmarkId || draggedBookmarkId === targetId) {
      setDraggedBookmarkId(null);
      setDragOverBookmarkId(null);
      setTimeout(() => {
        isDraggingItemRef.current = false;
      }, 80);
      return;
    }

    setBookmarks((prev) => {
      const sourceIndex = prev.findIndex((b) => b.id === draggedBookmarkId);
      const targetIndex = prev.findIndex((b) => b.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1) return prev;

      const updated = [...prev];
      const [moved] = updated.splice(sourceIndex, 1);
      updated.splice(targetIndex, 0, moved);
      return updated;
    });

    onShowToast?.('🔄 바로가기 위치가 성공적으로 변경되었습니다.');
    setDraggedBookmarkId(null);
    setDragOverBookmarkId(null);
    setTimeout(() => {
      isDraggingItemRef.current = false;
    }, 80);
  };

  const handleItemDragEnd = () => {
    setDraggedBookmarkId(null);
    setDragOverBookmarkId(null);
    setTimeout(() => {
      isDraggingItemRef.current = false;
    }, 80);
  };

  // 북마크 변경 시 localStorage 자동 동기화
  useEffect(() => {
    try {
      localStorage.setItem('class_dashboard_bookmarks', JSON.stringify(bookmarks));
    } catch (e) {
      console.error('🔴 북마크 로컬스토리지 저장 실패:', e);
    }
  }, [bookmarks]);

  // ⌨️ ESC 키를 누르면 설정창 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    if (isModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen]);

  // 바로가기 링크 열기 (웹 및 설치 프로그램 분기)
  const handleOpenLink = (url: string, title: string, type?: 'web' | 'app') => {
    const trimmed = url.trim();
    const isAppProtocol =
      type === 'app' ||
      trimmed.startsWith('calculator:') ||
      trimmed.startsWith('ms-') ||
      trimmed.startsWith('hwp:') ||
      trimmed.startsWith('hancom:') ||
      trimmed.startsWith('kakaotalk:') ||
      trimmed.startsWith('notion:') ||
      trimmed.startsWith('zoommtg:') ||
      trimmed.startsWith('file:') ||
      !trimmed.includes('.');

    if (isAppProtocol) {
      // 💻 컴퓨터 설치 프로그램 프로토콜 호출
      window.location.href = trimmed;
      if (onShowToast) {
        onShowToast(`💻 [${title}] 프로그램을 실행합니다. (PC에 설치된 경우 실행됩니다)`);
      }
      return;
    }

    // 🌐 웹사이트 링크 열기
    let targetUrl = trimmed;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    if (onShowToast) {
      onShowToast(`🌐 [${title}] 사이트로 이동합니다.`);
    }
  };

  // 모달 열기 (추가 모드)
  const handleOpenAddModal = (initialType: 'web' | 'app' = 'web') => {
    setEditingId(null);
    setFormType(initialType);
    setFormTitle('');
    setFormUrl('');
    setFormDescription('');
    setFormIconUrl('');
    setIsModalOpen(true);
  };

  // 모달 열기 (수정 모드)
  const handleOpenEditModal = (item: BookmarkItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(item.id);
    setFormTitle(item.title);
    setFormUrl(item.url);
    setFormDescription(item.description || '');
    setFormIconUrl(item.iconUrl || '');
    setIsModalOpen(true);
  };

  // 항목 삭제
  const handleDeleteItem = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`정말 '${title}' 바로가기를 삭제하시겠습니까?`)) {
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
      if (onShowToast) onShowToast(`🗑️ [${title}] 바로가기가 삭제되었습니다.`);
    }
  };

  // 저장 (추가 또는 수정 완료)
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert(formType === 'app' ? '프로그램명을 입력해주세요.' : '사이트명을 입력해주세요.');
      return;
    }
    if (!formUrl.trim()) {
      alert(formType === 'app' ? '프로그램 실행 주소(URI)를 입력해주세요.' : '사이트 주소(URL)를 입력해주세요.');
      return;
    }

    let validUrl = formUrl.trim();
    if (formType === 'web') {
      if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
        validUrl = 'https://' + validUrl;
      }
    }

    // 아이콘 자동 추론
    let finalIcon = formIconUrl.trim();
    if (!finalIcon) {
      if (formType === 'web') {
        try {
          const domain = new URL(validUrl).hostname;
          finalIcon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        } catch {
          finalIcon = 'https://img.icons8.com/color/96/domain--v1.png';
        }
      } else {
        finalIcon = 'https://img.icons8.com/color/96/application-window.png';
      }
    }

    if (editingId) {
      // 수정
      setBookmarks((prev) =>
        prev.map((b) =>
          b.id === editingId
            ? {
                ...b,
                title: formTitle.trim(),
                url: validUrl,
                type: formType,
                description: formDescription.trim(),
                iconUrl: finalIcon,
              }
            : b
        )
      );
      if (onShowToast) onShowToast(`✨ [${formTitle}] 바로가기가 수정되었습니다.`);
    } else {
      // 신규 추가
      const newItem: BookmarkItem = {
        id: `bm_${Date.now()}`,
        title: formTitle.trim(),
        url: validUrl,
        type: formType,
        description: formDescription.trim(),
        iconUrl: finalIcon,
        bgColor: formType === 'app' ? 'bg-purple-500/10 text-purple-600' : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
      };
      setBookmarks((prev) => [...prev, newItem]);
      if (onShowToast) onShowToast(`🎉 새 바로가기 [${formTitle}]가 추가되었습니다.`);
    }

    setIsModalOpen(false);
  };

  // 기본 프리셋으로 초기화
  const handleResetPresets = () => {
    if (window.confirm('기본 교육 포털(나이스, K-에듀파인, 학교홈페이지) 목록으로 복원하시겠습니까?')) {
      setBookmarks(DEFAULT_BOOKMARKS);
      if (onShowToast) onShowToast('🔄 기본 사이트 바로가기로 복원되었습니다.');
    }
  };

  return (
    <div className={`w-full h-full flex flex-col select-none ${isCompactRow ? 'p-1.5 justify-center' : 'p-3'}`}>
      {/* 1행 축소 모드 (PDF 1페이지 수정사항 1 반영: 1행 안에 바로가기 내용이 다 보이는 형태) */}
      {isCompactRow ? (
        <div className="w-full h-full flex items-center justify-between gap-2 overflow-hidden px-1">
          {/* 가로 1행 나열 영역 (모든 아이콘이 1행에 나열됨) */}
          <div className="flex-1 flex items-center gap-2 overflow-x-auto custom-scrollbar py-0.5 min-w-0 pr-1">
            {bookmarks.map((item) => {
              const isDragging = draggedBookmarkId === item.id;
              const isDragOver = dragOverBookmarkId === item.id;

              return (
                <div
                  key={item.id}
                  draggable={true}
                  onDragStart={(e) => handleItemDragStart(e, item.id)}
                  onDragOver={(e) => handleItemDragOver(e, item.id)}
                  onDrop={(e) => handleItemDrop(e, item.id)}
                  onDragEnd={handleItemDragEnd}
                  onClick={() => {
                    if (isDraggingItemRef.current) return;
                    handleOpenLink(item.url, item.title, item.type);
                  }}
                  className={`group shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all select-none cursor-grab active:cursor-grabbing text-slate-800 dark:text-slate-100 ${
                    isDragging
                      ? 'opacity-40 scale-95 border-dashed border-cyan-400 bg-cyan-50/50 dark:bg-cyan-950/40'
                      : isDragOver
                      ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/70 ring-2 ring-cyan-400 scale-[1.04] shadow-md'
                      : 'bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 border-slate-200/90 dark:border-slate-700 shadow-2xs hover:shadow-md hover:scale-[1.02]'
                  }`}
                  title={`${item.title} (마우스 드래그로 위치 변경 가능)\n${item.description || item.url}`}
                >
                  <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 pointer-events-none">
                    {item.iconUrl ? (
                      <img
                        src={item.iconUrl}
                        alt={item.title}
                        className="w-5 h-5 object-contain rounded-sm"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.innerHTML = item.type === 'app' ? '💻' : '🌐';
                          }
                        }}
                      />
                    ) : item.type === 'app' ? (
                      <span>💻</span>
                    ) : (
                      <Globe className="w-4 h-4 text-cyan-500" />
                    )}
                  </div>
                  <span className="text-xs font-bold truncate max-w-[130px] whitespace-nowrap pointer-events-none">
                    {item.title}
                  </span>
                  {item.type === 'app' && (
                    <span className="text-[9px] font-black px-1 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 pointer-events-none">
                      앱
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* 우측 퀵 추가 버튼 */}
          <button
            type="button"
            onClick={() => handleOpenAddModal('web')}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
            title="새 바로가기 추가"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span>추가</span>
          </button>
        </div>
      ) : (
        <>
          {/* 상단 툴바: 타이틀 보조 캡션 및 추가 버튼 */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-cyan-500" strokeWidth={2.5} />
              <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                바로가기
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300">
                {bookmarks.length}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetPresets}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[10px] font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="기본 프리셋으로 복원"
              >
                기본값
              </button>
              <button
                type="button"
                onClick={() => handleOpenAddModal('web')}
                className="flex items-center gap-1 px-2 py-1 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-[11px] shadow-sm transition active:scale-95 cursor-pointer"
                title="신규 바로가기 추가"
              >
                <Plus className="w-3 h-3" strokeWidth={2.5} />
                <span>추가</span>
              </button>
            </div>
          </div>

          {/* 메인 아이콘 그리드: 가로 확장 시 아이콘 최대 노출 (PDF 1페이지 수정사항 3 반영) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-0.5 grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-2 content-start">
        {bookmarks.map((item) => (
          <div
            key={item.id}
            onClick={() => handleOpenLink(item.url, item.title, item.type)}
            className="group relative flex flex-col items-center justify-center p-3 rounded-2xl bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer text-center hover:-translate-y-0.5"
            title={`${item.title}\n${item.description || item.url}\n(${item.type === 'app' ? '클릭 시 컴퓨터 프로그램 실행' : '클릭 시 새 탭에서 열기'})`}
          >
            {/* 앱 타입 뱃지 */}
            {item.type === 'app' && (
              <span className="absolute top-1.5 left-1.5 px-1 py-0.2 rounded text-[9px] font-black bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                PC앱
              </span>
            )}

            {/* 우측 상단 호버 관리 메뉴 (수정 / 삭제) */}
            <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 z-10 bg-slate-900/80 backdrop-blur-md rounded-lg p-0.5 shadow-md">
              <button
                type="button"
                onClick={(e) => handleOpenEditModal(item, e)}
                className="p-1 rounded text-slate-300 hover:text-white hover:bg-white/20 transition cursor-pointer"
                title="수정"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={(e) => handleDeleteItem(item.id, item.title, e)}
                className="p-1 rounded text-rose-300 hover:text-rose-100 hover:bg-rose-500/40 transition cursor-pointer"
                title="삭제"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            {/* 아이콘 이미지 / 파비콘 */}
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2 p-1.5 bg-slate-100 dark:bg-slate-700/60 shadow-inner group-hover:scale-105 transition-transform duration-200">
              {item.iconUrl ? (
                <img
                  src={item.iconUrl}
                  alt={item.title}
                  className="w-8 h-8 object-contain rounded-md"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      parent.innerHTML = item.type === 'app' ? '<span class="text-xl">💻</span>' : '<span class="text-xl">🌐</span>';
                    }
                  }}
                />
              ) : item.type === 'app' ? (
                <span className="text-xl">💻</span>
              ) : (
                <Globe className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
              )}
            </div>

            {/* 사이트/프로그램명 */}
            <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate w-full group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
              {item.title}
            </span>

            {/* 설명 */}
            <span className="text-[10px] text-slate-400 dark:text-slate-400 truncate w-full mt-0.5 font-medium">
              {item.description || item.url.replace(/^https?:\/\//, '')}
            </span>

            {/* 바로가기 아이콘 뱃지 */}
            <div className="absolute bottom-1 right-1.5 opacity-0 group-hover:opacity-70 transition-opacity">
              <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
            </div>
          </div>
        ))}

        {/* 신규 바로가기 추가 카드 */}
        <button
          type="button"
          onClick={() => handleOpenAddModal('web')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-dashed border-slate-300/80 dark:border-slate-700/80 hover:border-cyan-500/80 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-cyan-50/50 dark:hover:bg-cyan-950/20 transition-all cursor-pointer min-h-[96px] group"
        >
          <div className="w-8 h-8 rounded-full bg-slate-200/70 dark:bg-slate-800 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
            <Plus className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-cyan-500" strokeWidth={2.5} />
          </div>
          <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
            바로가기 추가
          </span>
        </button>
      </div>
    </>
  )}

      {/* 바로가기 추가 및 수정 모달 다이얼로그 (React Portal로 document.body에 직접 마운트하여 위젯 잘림 완벽 방지) */}
      {isModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md max-h-[88vh] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-scale-up"
            >
              {/* 1. 고정 헤더 (Sticky Header): 항상 최상단에 닫기(X) 버튼 노출 보장 */}
              <div className="shrink-0 px-5 py-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{formType === 'app' ? '💻' : '🌐'}</span>
                  <h3 className="font-black text-sm text-slate-800 dark:text-slate-100">
                    {editingId ? '바로가기 항목 수정' : '새 바로가기 등록'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  title="설정창 닫기 (Esc)"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 2. 스크롤 본문 영역 */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
                {/* 바로가기 유형 선택 탭 (🌐 웹사이트 / 💻 컴퓨터 설치 프로그램) */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setFormType('web')}
                    className={`py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      formType === 'web'
                        ? 'bg-white dark:bg-slate-700 text-cyan-700 dark:text-cyan-300 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <span>🌐 인터넷 웹사이트</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType('app')}
                    className={`py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      formType === 'app'
                        ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <span>💻 컴퓨터 설치 프로그램</span>
                  </button>
                </div>

                {/* 💻 컴퓨터 프로그램 탭일 때: 원클릭 추천 프로그램 프리셋 목록 */}
                {formType === 'app' && (
                  <div className="p-3 bg-purple-50/70 dark:bg-purple-950/40 rounded-2xl border border-purple-100 dark:border-purple-900/60 space-y-2">
                    <span className="text-[11px] font-black text-purple-900 dark:text-purple-200 flex items-center gap-1">
                      <span>⚡</span> 자주 쓰는 프로그램 원클릭 선택:
                    </span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {APP_PRESETS.map((preset) => (
                        <button
                          key={preset.title}
                          type="button"
                          onClick={() => {
                            setFormTitle(preset.title);
                            setFormUrl(preset.url);
                            setFormDescription(preset.description);
                            setFormIconUrl(preset.iconUrl);
                          }}
                          className="p-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200/60 dark:border-purple-800 text-[10px] font-bold text-slate-700 dark:text-slate-200 flex flex-col items-center gap-1 transition active:scale-95 cursor-pointer shadow-2xs"
                          title={preset.description}
                        >
                          <img src={preset.iconUrl} alt={preset.title} className="w-5 h-5 object-contain" />
                          <span className="truncate w-full text-center">{preset.title.split(' ')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <form id="bookmark-modal-form" onSubmit={handleSaveForm} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {formType === 'app' ? '프로그램명 (필수)' : '사이트명 (필수)'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={formType === 'app' ? '예: 한글, 엑셀, 계산기' : '예: 나이스, 학교 알리미, 캔바'}
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {formType === 'app' ? '프로그램 실행 주소 / URI 프로토콜 (필수)' : '사이트 주소 (URL, 필수)'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={formType === 'app' ? 'hwp: 또는 calculator: 또는 ms-excel:' : 'https://... 또는 www....'}
                      value={formUrl}
                      onChange={(e) => setFormUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-xs"
                    />
                    {formType === 'app' && (
                      <p className="text-[10px] text-slate-400 mt-1">
                        * 위 원클릭 프리셋을 누르면 실행 프로토콜이 자동 입력됩니다. (PC에 설치된 프로그램이 실행됩니다)
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      설명 또는 용도 (선택)
                    </label>
                    <input
                      type="text"
                      placeholder={formType === 'app' ? '예: 한컴오피스 한글 문서 작성' : '예: 생기부 및 출결 관리 포털'}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      아이콘 이미지 주소 (선택 - 비워두면 자동 설정)
                    </label>
                    <input
                      type="text"
                      placeholder="아이콘 이미지 URL (비워두면 기본 아이콘 적용)"
                      value={formIconUrl}
                      onChange={(e) => setFormIconUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500 text-xs"
                    />
                  </div>
                </form>
              </div>

              {/* 3. 고정 푸터 (Sticky Footer): 항상 최하단에 취소 및 등록 버튼 노출 보장 */}
              <div className="shrink-0 px-5 py-3.5 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold transition cursor-pointer text-xs"
                >
                  취소
                </button>
                <button
                  type="submit"
                  form="bookmark-modal-form"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1.5 text-xs"
                >
                  <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                  <span>{editingId ? '수정 완료' : '등록하기'}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
