import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  ExternalLink,
  Edit2,
  Trash2,
  RotateCcw,
  Globe,
  Check,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Laptop,
  FolderOpen,
  Play,
  HelpCircle,
  Folder,
  AppWindow,
} from 'lucide-react';
import { HeaderBookmarkItem, HeaderBookmarkGroup } from './Header';

interface BookmarkManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarks: HeaderBookmarkItem[];
  onSaveBookmarks: (updated: HeaderBookmarkItem[]) => void;
  onShowToast: (msg: string) => void;
  isDarkMode?: boolean;
  groups?: HeaderBookmarkGroup[];
  onSaveGroups?: (next: HeaderBookmarkGroup[]) => void;
}

// 🏫 초등 교사용 기본 필수 웹사이트 바로가기 프리셋
const DEFAULT_PRESETS: HeaderBookmarkItem[] = [
  {
    id: 'neis',
    title: '나이스 (NEIS)',
    url: 'https://www.neis.go.kr',
    type: 'web',
  },
  {
    id: 'edufine',
    title: 'K-에듀파인',
    url: 'https://klef.sen.go.kr',
    type: 'web',
  },
  {
    id: 'school_home',
    title: '학교알리미',
    url: 'https://www.schoolinfo.go.kr',
    type: 'web',
  },
];

// 💡 초등학교 교실에서 가장 자주 쓰는 컴퓨터 추천 프로그램 프리셋
interface QuickAppPreset {
  title: string;
  command: string;
  iconText: string;
  description: string;
}

const COMMON_APP_PRESETS: QuickAppPreset[] = [
  {
    title: '한글 (HWP)',
    command: 'hwp',
    iconText: '📑',
    description: '한컴오피스 한글 워드',
  },
  {
    title: '엑셀 (Excel)',
    command: 'excel',
    iconText: '📊',
    description: 'Microsoft Excel',
  },
  {
    title: '파워포인트 (PPT)',
    command: 'powerpnt',
    iconText: '📽️',
    description: 'Microsoft PowerPoint',
  },
  {
    title: '계산기',
    command: 'calc',
    iconText: '🧮',
    description: '윈도우/맥 기본 계산기',
  },
  {
    title: '그림판',
    command: 'mspaint',
    iconText: '🎨',
    description: '윈도우 그래픽 그림판',
  },
  {
    title: '메모장',
    command: 'notepad',
    iconText: '📝',
    description: '윈도우 기본 메모장',
  },
  {
    title: '크롬 브라우저',
    command: 'chrome',
    iconText: '🌐',
    description: 'Google Chrome',
  },
];

export const BookmarkManageModal: React.FC<BookmarkManageModalProps> = ({
  isOpen,
  onClose,
  bookmarks,
  onSaveBookmarks,
  onShowToast,
  isDarkMode = false,
  groups = [],
  onSaveGroups,
}) => {
  // 🗂️ 그룹 / 여는 방식
  const [groupId, setGroupId] = useState<string>('');
  const [openMode, setOpenMode] = useState<'browser' | 'popup'>('browser');
  const [newGroupName, setNewGroupName] = useState('');
  const saveGroups = (next: HeaderBookmarkGroup[]) => onSaveGroups?.(next);
  const handleAddGroup = () => {
    const name = newGroupName.trim();
    if (!name) { onShowToast('🔴 그룹 이름을 입력해 주세요.'); return; }
    saveGroups([...groups, { id: `grp-${Date.now()}`, name }]);
    setNewGroupName('');
    onShowToast(`🗂️ [${name}] 그룹을 만들었습니다.`);
  };
  const handleUpdateGroup = (id: string, patch: Partial<HeaderBookmarkGroup>) => {
    saveGroups(groups.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  };
  const handleDeleteGroup = (g: HeaderBookmarkGroup) => {
    if (!window.confirm(`[${g.name}] 그룹을 지울까요? 안에 있던 바로가기는 지워지지 않고 헤더에 낱개로 돌아가요.`)) return;
    saveGroups(groups.filter((x) => x.id !== g.id));
    onSaveBookmarks(bookmarks.map((b) => (b.groupId === g.id ? { ...b, groupId: undefined } : b)));
    if (groupId === g.id) setGroupId('');
  };
  // 바로가기 종류: 'web'(웹사이트) vs 'app'(컴퓨터 프로그램)
  const [itemType, setItemType] = useState<'web' | 'app'>('web');
  // 입력 폼 상태
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // 로컬 파일 선택을 위한 숨김 input ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 모달 닫힐 때 폼 초기화
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setUrl('');
      setItemType('web');
      setEditingId(null);
      setGroupId('');
      setOpenMode('browser');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 📁 파일 탐색기에서 실행 파일 선택 시 자동 채우기 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Electron 환경이면 file.path(절대경로) 존재, 일반 브라우저에서는 file.name 제공
    const fullPath = (file as any).path || file.name;
    const baseName = file.name.replace(/\.[^/.]+$/, ''); // 확장자 제거

    setUrl(fullPath);
    if (!title.trim()) {
      setTitle(baseName);
    }

    onShowToast(`📁 [${file.name}] 파일이 선택되었습니다. 필요한 경우 경로를 확인해 주세요.`);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 💡 퀵 프리셋 프로그램 클릭 시 폼에 자동 입력
  const handleSelectAppPreset = (preset: QuickAppPreset) => {
    setItemType('app');
    setTitle(preset.title);
    setUrl(preset.command);
    onShowToast(`💡 [${preset.title}] 실행 설정이 자동 입력되었습니다. 등록 버튼을 눌러주세요.`);
  };

  // 🚀 모달 내에서 프로그램 직접 테스트 실행해보기
  const handleTestLaunch = async (targetPath: string, appTitle: string) => {
    try {
      console.log(`🔵 [ModalTestLaunch] 프로그램 테스트 실행 요청: ${appTitle} (${targetPath})`);

      if ((window as any).electronAPI?.launchApp) {
        const electronRes = await (window as any).electronAPI.launchApp(targetPath);
        if (electronRes?.success) {
          onShowToast(`🚀 [${appTitle}] 프로그램이 실행되었습니다.`);
          return;
        }
        // 데스크톱 앱에서는 보안 검증 결과를 그대로 안내하고 로컬 서버 경로로 넘어가지 않습니다.
        onShowToast(`⚠️ [${appTitle}] 실행 실패: ${electronRes?.error || '경로를 확인해 주세요.'}`);
        return;
      }

      const res = await fetch('/api/launch-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPath, title: appTitle }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          onShowToast(`🚀 [${appTitle}] 프로그램이 정상적으로 실행되었습니다.`);
          return;
        }
      }

      throw new Error('서버 응답 비정상');
    } catch (err) {
      console.error('🔴 [ModalTestLaunch] 실행 실패:', err);
      onShowToast(`⚠️ [${appTitle}] 실행 실패: 컴퓨터의 로컬 실행기(run-dashboard) 연결 또는 경로를 확인해 주세요.`);
    }
  };

  // 바로가기 추가 또는 수정 완료 핸들러
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    let trimmedUrl = url.trim();

    if (!trimmedTitle) {
      onShowToast(itemType === 'app' ? '🔴 프로그램 이름을 입력해 주세요.' : '🔴 사이트 이름을 입력해 주세요.');
      return;
    }

    if (!trimmedUrl) {
      onShowToast(itemType === 'app' ? '🔴 프로그램 실행 경로 또는 명령어를 입력해 주세요.' : '🔴 사이트 URL 주소를 입력해 주세요.');
      return;
    }

    // 웹사이트인 경우에만 http:// 또는 https:// 자동 보정
    if (itemType === 'web') {
      if (!/^https?:\/\//i.test(trimmedUrl)) {
        trimmedUrl = `https://${trimmedUrl}`;
      }
    }

    if (editingId) {
      // ✏️ 기존 바로가기 수정
      const updated = bookmarks.map((b) =>
        b.id === editingId ? { ...b, title: trimmedTitle, url: trimmedUrl, type: itemType, groupId: groupId || undefined, openMode: itemType === 'web' ? openMode : undefined } : b
      );
      onSaveBookmarks(updated);
      onShowToast(`🟢 [${trimmedTitle}] 바로가기 정보가 수정되었습니다.`);
      setEditingId(null);
    } else {
      // ➕ 새 바로가기 추가
      const newBookmark: HeaderBookmarkItem = {
        id: `bm-${Date.now()}`,
        title: trimmedTitle,
        url: trimmedUrl,
        type: itemType,
        groupId: groupId || undefined,
        openMode: itemType === 'web' ? openMode : undefined,
      };
      const updated = [...bookmarks, newBookmark];
      onSaveBookmarks(updated);
      onShowToast(
        itemType === 'app'
          ? `🟢 [${trimmedTitle}] 프로그램 바로가기가 새롭게 등록되었습니다.`
          : `🟢 [${trimmedTitle}] 웹사이트 바로가기가 새롭게 등록되었습니다.`
      );
    }

    setTitle('');
    setUrl('');
  };

  // 수정 시작 핸들러
  const handleStartEdit = (b: HeaderBookmarkItem) => {
    setEditingId(b.id);
    setTitle(b.title);
    setUrl(b.url);
    setItemType(b.type || 'web');
    setGroupId(b.groupId && groups.some((g) => g.id === b.groupId) ? b.groupId : '');
    setOpenMode(b.openMode === 'popup' ? 'popup' : 'browser');
  };

  // 수정 취소
  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setUrl('');
    setItemType('web');
    setGroupId('');
    setOpenMode('browser');
  };

  // 바로가기 삭제 핸들러
  const handleDelete = (id: string, name: string) => {
    if (bookmarks.length <= 1) {
      if (!window.confirm('최소 1개의 바로가기를 남겨두는 것을 권장합니다. 정말 삭제하시겠습니까?')) {
        return;
      }
    }
    const updated = bookmarks.filter((b) => b.id !== id);
    onSaveBookmarks(updated);
    if (editingId === id) {
      handleCancelEdit();
    }
    onShowToast(`🟡 [${name}] 바로가기가 삭제되었습니다.`);
  };

  // 순서 위로 이동
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...bookmarks];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    onSaveBookmarks(updated);
  };

  // 순서 아래로 이동
  const handleMoveDown = (index: number) => {
    if (index === bookmarks.length - 1) return;
    const updated = [...bookmarks];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    onSaveBookmarks(updated);
  };

  // 기본 프리셋으로 초기화
  const handleResetToDefault = () => {
    if (window.confirm('기본 추천 웹사이트 바로가기(나이스, K-에듀파인, 학교 홈페이지)로 초기화하시겠습니까?')) {
      onSaveBookmarks(DEFAULT_PRESETS);
      handleCancelEdit();
      onShowToast('🔄 기본 바로가기 목록으로 복원되었습니다.');
    }
  };

  const dotColors = ['bg-cyan-400', 'bg-indigo-400', 'bg-emerald-400', 'bg-amber-400', 'bg-purple-400', 'bg-rose-400'];

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ fontFamily: 'var(--app-font-family, inherit)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 숨김 파일 선택 인풋 (프로그램 찾아보기 용도) */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept=".exe,.lnk,.bat,.cmd,.app,*"
        />

        {/* 모달 상단 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                <span>바로가기 관리</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                  웹사이트 & 설치 프로그램
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                대시보드 상단에서 클릭 한 번으로 열 사이트 또는 컴퓨터에 설치된 프로그램을 등록합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 본문 영역 */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* 1. 바로가기 추가/수정 폼 */}
          <form
            onSubmit={handleSubmit}
            className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-3.5"
          >
            {/* 폼 상단: 타이틀 및 웹/프로그램 탭 선택 */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>
                  {editingId
                    ? `${itemType === 'app' ? '프로그램' : '웹사이트'} 바로가기 수정`
                    : '새 바로가기 추가'}
                </span>
              </span>

              {/* 탭 전환: [🌐 웹사이트] vs [💻 프로그램 실행] */}
              <div className="flex items-center bg-white dark:bg-slate-900 p-0.5 rounded-xl border border-indigo-100 dark:border-indigo-900/80 shadow-xs">
                <button
                  type="button"
                  onClick={() => setItemType('web')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    itemType === 'web'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>웹사이트 (URL)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setItemType('app')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    itemType === 'app'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>컴퓨터 프로그램 (앱)</span>
                </button>
              </div>

              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline cursor-pointer ml-auto"
                >
                  수정 취소
                </button>
              )}
            </div>

            {/* 💡 프로그램 탭일 때: 자주 쓰는 추천 프로그램 퀵 프리셋 버튼 모음 */}
            {itemType === 'app' && (
              <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-indigo-100 dark:border-indigo-900/40 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1">
                    <span>💡 초등 자주 쓰는 추천 프로그램 (원클릭 자동 채우기)</span>
                  </span>
                  <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-normal">
                    클릭 시 아래 양식에 자동 입력됩니다
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_APP_PRESETS.map((preset) => (
                    <button
                      key={preset.command}
                      type="button"
                      onClick={() => handleSelectAppPreset(preset)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer active:scale-95 shadow-2xs"
                      title={`${preset.description} (실행 명령어: ${preset.command})`}
                    >
                      <span>{preset.iconText}</span>
                      <span>{preset.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 입력 필드 (이름 + 경로/URL) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {itemType === 'app' ? '프로그램 이름' : '사이트 이름'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    itemType === 'app'
                      ? '예: 한글 2024, 엑셀, 계산기'
                      : '예: EBS 온학습터, 클래스123'
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    {itemType === 'app' ? '실행 경로 또는 명령어' : '사이트 URL 주소'}{' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  {itemType === 'app' && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      title="내 컴퓨터 파일 탐색기를 열어 실행 파일(.exe, .lnk 등)을 직접 찾습니다."
                    >
                      <FolderOpen className="w-3 h-3" />
                      <span>파일 찾아보기</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={
                    itemType === 'app'
                      ? '예: hwp, calc, 또는 C:\\Program Files\\...'
                      : '예: https://www.ebs.co.kr'
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium font-mono text-[11px]"
                />
              </div>
            </div>

            {/* 그룹 + 여는 방식 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">넣을 그룹 (폴더)</label>
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                >
                  <option value="">그룹 없음 (헤더에 바로 표시)</option>
                  {groups.map((g) => (<option key={g.id} value={g.id}>🗂️ {g.name}</option>))}
                </select>
              </div>
              {itemType === 'web' && (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">여는 방식</label>
                  <div className="flex items-center bg-white dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    {([['browser', '기본 브라우저', Globe], ['popup', '팝업 창', AppWindow]] as const).map(([v, label, Icon]) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setOpenMode(v)}
                        aria-pressed={openMode === v}
                        className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg font-bold transition cursor-pointer ${openMode === v ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">나이스·에듀파인처럼 인증서가 필요한 사이트는 기본 브라우저를 추천해요.</p>
                </div>
              )}
            </div>

            {/* 프로그램 모드 안내 메시지 */}
            {itemType === 'app' && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed bg-white/50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-indigo-100/60 dark:border-indigo-900/30 flex items-start gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Tip:</strong> 윈도우 기본 앱은 <code className="text-indigo-600 dark:text-indigo-300 font-mono">calc</code>(계산기), <code className="text-indigo-600 dark:text-indigo-300 font-mono">notepad</code>(메모장), <code className="text-indigo-600 dark:text-indigo-300 font-mono">hwp</code>(한글), <code className="text-indigo-600 dark:text-indigo-300 font-mono">excel</code>(엑셀) 처럼 명령어만 입력해도 실행됩니다. 특정 프로그램은 [파일 찾아보기]로 선택하거나 전체 파일 경로를 입력하세요.
                </span>
              </p>
            )}

            {/* 등록/수정 버튼 */}
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer active:scale-95"
              >
                {editingId ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>수정 내용 저장</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>{itemType === 'app' ? '프로그램 바로가기 등록' : '바로가기 등록하기'}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* 1-1. 바로가기 그룹(폴더) 관리 */}
          <div className="space-y-2.5 p-4 rounded-2xl border border-amber-200/70 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-amber-500" />
                <span>바로가기 그룹</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">{groups.length}개</span>
              </h4>
              <span className="text-[10px] text-slate-400">헤더에서 폴더를 누르면 목록이 펼쳐져요</span>
            </div>
            {groups.map((g) => (
              <div key={g.id} className="flex items-center gap-2" data-bm-group-row>
                <span className="w-8 h-8 rounded-lg overflow-hidden grid place-items-center shrink-0 bg-amber-100 dark:bg-amber-500/20 text-amber-600">
                  {g.iconUrl ? <img src={g.iconUrl} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} /> : <Folder className="w-4 h-4" />}
                </span>
                <input
                  type="text"
                  value={g.name}
                  onChange={(e) => handleUpdateGroup(g.id, { name: e.target.value })}
                  placeholder="그룹 이름"
                  className="w-28 sm:w-36 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
                <input
                  type="url"
                  value={g.iconUrl || ''}
                  onChange={(e) => handleUpdateGroup(g.id, { iconUrl: e.target.value.trim() || undefined })}
                  placeholder="폴더 이미지 주소 (선택)"
                  className="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-mono text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
                <span className="text-[10px] font-bold text-slate-400 shrink-0 w-8 text-center">{bookmarks.filter((b) => b.groupId === g.id).length}개</span>
                <button type="button" onClick={() => handleDeleteGroup(g)} className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-600 hover:bg-rose-100 transition cursor-pointer shrink-0" title="그룹 지우기 (바로가기는 남아요)">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddGroup(); } }}
                placeholder="새 그룹 이름 (예: 업무, 수업 자료)"
                className="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl border border-dashed border-amber-300 dark:border-amber-800 bg-white/70 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
              <button type="button" onClick={handleAddGroup} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black transition cursor-pointer active:scale-95 shrink-0">
                <Plus className="w-3.5 h-3.5" />
                <span>그룹 만들기</span>
              </button>
            </div>
          </div>

          {/* 2. 등록된 바로가기 버튼 목록 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>등록된 바로가기 목록</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                  {bookmarks.length}개
                </span>
              </h4>

              <button
                type="button"
                onClick={handleResetToDefault}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition cursor-pointer"
                title="기본 필수 바로가기(나이스, K-에듀파인, 학교홈페이지)로 복원"
              >
                <RotateCcw className="w-3 h-3" />
                <span>기본값 복원</span>
              </button>
            </div>

            {bookmarks.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                등록된 바로가기 사이트 또는 프로그램이 없습니다. 상단에서 추가해 보세요.
              </div>
            ) : (
              <div className="space-y-2">
                {bookmarks.map((b, idx) => {
                  const isCurrentEditing = editingId === b.id;
                  const dotColor = dotColors[idx % dotColors.length];
                  const isApp = b.type === 'app';

                  return (
                    <div
                      key={b.id || idx}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                        isCurrentEditing
                          ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/40 ring-2 ring-indigo-400/50'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {/* 좌측 정보 */}
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">
                              {b.title}
                            </span>

                            {/* 구분 뱃지: 웹 vs 앱 */}
                            {isApp ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 shrink-0">
                                <Laptop className="w-2.5 h-2.5" />
                                <span>앱</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
                                <Globe className="w-2.5 h-2.5" />
                                <span>웹</span>
                              </span>
                            )}

                            {b.groupId && groups.some((g) => g.id === b.groupId) && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 shrink-0 max-w-[90px] truncate">
                                🗂️ {groups.find((g) => g.id === b.groupId)?.name}
                              </span>
                            )}
                            {!isApp && b.openMode === 'popup' && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60 shrink-0">
                                <AppWindow className="w-2.5 h-2.5" />
                                <span>팝업</span>
                              </span>
                            )}

                            {/* 미리보기 링크 또는 테스트 실행 버튼 */}
                            {isApp ? (
                              <button
                                type="button"
                                onClick={() => handleTestLaunch(b.url, b.title)}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition cursor-pointer border border-emerald-200/60 dark:border-emerald-800/60 ml-1 shrink-0"
                                title="이 자리에서 프로그램 테스트 실행"
                              >
                                <Play className="w-2.5 h-2.5 fill-current" />
                                <span>테스트</span>
                              </button>
                            ) : (
                              <a
                                href={b.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-400 hover:text-indigo-500 transition ml-0.5"
                                title="새 창에서 사이트 미리보기"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-xs font-mono">
                            {isApp ? `💻 ${b.url}` : b.url}
                          </p>
                        </div>
                      </div>

                      {/* 우측 조작 버튼 그룹 */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* 순서 이동 버튼 */}
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 mr-1">
                          <button
                            type="button"
                            onClick={() => handleMoveUp(idx)}
                            disabled={idx === 0}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                            title="위로 이동"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveDown(idx)}
                            disabled={idx === bookmarks.length - 1}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                            title="아래로 이동"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>

                        {/* 수정 버튼 */}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(b)}
                          className={`p-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                            isCurrentEditing
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                          title="이름 및 경로 수정"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* 삭제 버튼 */}
                        <button
                          type="button"
                          onClick={() => handleDelete(b.id, b.title)}
                          className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition cursor-pointer"
                          title="바로가기 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 하단 닫기 바 */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <span className="text-[11px] text-slate-400">
            💡 헤더 바에서 마우스 드래그 앤 드롭으로도 순서를 쉽게 변경할 수 있습니다.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition cursor-pointer"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
