import { DisplayRemote } from './DisplayRemote';
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sticker,
  ImagePlus,
  Bell,
  Dice5,
  Timer,
  LayoutGrid,
  RotateCcw,
  X,
  Plus,
  Eye,
  EyeOff,
  Layers,
  Grid3X3,
  Sliders,
  Volume2,
  VolumeX,
  Clock,
  CheckCircle2,
  Users,
  CalendarDays,
  FileText,
  Calendar,
  FileSpreadsheet,
  Tv,
  Gamepad2,
  Magnet,
  Sparkles,
  Wand2,
  Target,
  StickyNote,
  Minimize2,
  Maximize2,
  Lock,
  Maximize,
  Minimize,
  Globe,
  Palette,
  BookOpen,
  Utensils,
  Columns3,
  PanelLeft,
  PanelRight,
  Check,
  Lightbulb,
  MoreHorizontal,
  ListOrdered,
  ClipboardCheck,
} from 'lucide-react';
import { WidgetPlacementMode, SidebarLayoutMode } from '../types';

import { getWidgetInfo, getWidgetName } from '../constants/widgetRegistry';
const DOCK_WIDGET_IDS = [
  'seating', 'noise', 'picker', 'clock', 'attendance', 'roles', 'timetable', 'agenda', 'calendar',
  'bookmarks', 'meal', 'dday', 'observation', 'postit', 'youtube', 'schoolInfo', 'quote', 'ideanote', 'seqtimer', 'homework',
] as const;

// 📛 위젯 이름·설명은 constants/widgetRegistry.ts 에서 가져옵니다 (앱 전체 명칭 통일)
export const ALL_WIDGET_INFO: Record<string, { title: string; desc: string; icon: string }> = Object.fromEntries(
  DOCK_WIDGET_IDS.map((id) => {
    const info = getWidgetInfo(id)!;
    return [id, { title: info.name, desc: info.desc, icon: info.emoji }];
  })
);

interface QuickDockProps {
  onOpenStickers?: () => void;
  onRingChime: () => void;
  onOpenStudentDisplay?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onLockScreen?: () => void;
  onAutoAlignWidgets?: () => void;
  onSmartLayoutOptimize?: () => void;
  onAddPostIt?: () => void;
  autoSmartOptimize?: boolean;
  onToggleAutoSmartOptimize?: () => void;
  emptySlotsCount?: number;
  efficiencyPercentage?: number;
  // Widget Toggle & Management props
  hiddenWidgetIds: string[];
  activeWidgetIds: string[];
  onToggleWidget: (widgetId: string) => void;
  onRestoreWidget: (widgetId: string) => void;
  onHideWidget?: (widgetId: string) => void;
  onResetDefaultLayout: () => void;
  layoutMode?: WidgetPlacementMode;
  onChangeLayoutMode?: (mode: WidgetPlacementMode) => void;
  stageManagerMode?: boolean;
  onToggleStageManager?: () => void;
  // 🎯 커스텀 포커스 모드(Focus Mode) 토글 props
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
  // 🖼️ 스티커 모드 (위젯 숨기고 스티커 · 시계 · 일정만)
  isStickerMode?: boolean;
  onToggleStickerMode?: () => void;
  isWidgetMoveSoundEnabled?: boolean;
  onToggleWidgetMoveSound?: () => void;
  onToggleCollapseAll?: () => void; // 모든 위젯 일괄 접기 / 펼치기 핸들러
  isAllCollapsed?: boolean; // 모든 위젯이 접혀 있는지 여부
  // 💡 좌/우 스택 패널 4가지 동적 배치 모드 props
  sidebarLayoutMode?: SidebarLayoutMode;
  onChangeSidebarLayoutMode?: (mode: SidebarLayoutMode) => void;
  onShowToast: (msg: string) => void;
  // 🎨 [첨부 이미지 2]: 팔레트(배경) / 위젯 / 글씨 투명도 및 배율 실시간 조절
  dashboardBgOpacity?: number;
  widgetOpacity?: number;
  fontScale?: number;
  onUpdateOpacitySettings?: (settings: {
    dashboardBgOpacity?: number;
    widgetOpacity?: number;
    fontScale?: number;
  }) => void;
}

// 🧩 독 버튼 사용자 구성 (자주 쓰는 것만 독에 고정, 나머지는 [더보기])
export const DOCK_PIN_KEY = 'dock_pinned_v1';
export const DOCK_ITEMS: { key: string; label: string; emoji: string }[] = [
  { key: 'focus', label: '포커스 모드', emoji: '🎯' },
  { key: 'sticker', label: '스티커 모드', emoji: '🖼️' },
  { key: 'chime', label: '차임벨', emoji: '🔔' },
  { key: 'display', label: '보조 모니터 송출', emoji: '📺' },
  { key: 'fullscreen', label: '전체화면', emoji: '⛶' },
  { key: 'smart', label: '스마트 최적화', emoji: '🪄' },
  { key: 'magnet', label: '자석 정렬', emoji: '🧲' },
  { key: 'reset3', label: '3열 균등 정렬', emoji: '↺' },
  { key: 'collapse', label: '모두 접기/펼치기', emoji: '↕️' },
  { key: 'sound', label: '효과음 켜기/끄기', emoji: '🔊' },
  { key: 'postit', label: '새 포스트잇', emoji: '📝' },
  { key: 'newSticker', label: '새 스티커 불러오기', emoji: '🌟' },
  { key: 'lock', label: '화면 잠금', emoji: '🔒' },
];
const DEFAULT_DOCK_PINNED = ['focus', 'sticker', 'chime', 'display', 'fullscreen'];
function readDockPinned(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(DOCK_PIN_KEY) || 'null');
    if (Array.isArray(v)) return v.filter((k) => typeof k === 'string');
  } catch { /* 기본값 */ }
  return DEFAULT_DOCK_PINNED;
}

export const QuickDock: React.FC<QuickDockProps> = ({
  onOpenStickers,
  onRingChime,
  onOpenStudentDisplay,
  isFullscreen = false,
  onToggleFullscreen,
  onLockScreen,
  onAutoAlignWidgets,
  onSmartLayoutOptimize,
  onAddPostIt,
  autoSmartOptimize = true,
  onToggleAutoSmartOptimize,
  emptySlotsCount = 0,
  efficiencyPercentage = 100,
  hiddenWidgetIds,
  onToggleWidget,
  onRestoreWidget,
  onHideWidget,
  onResetDefaultLayout,
  layoutMode,
  onChangeLayoutMode,
  stageManagerMode = false,
  onToggleStageManager,
  isFocusMode = false,
  onToggleFocusMode,
  isStickerMode = false,
  onToggleStickerMode,
  isWidgetMoveSoundEnabled = false,
  onToggleWidgetMoveSound,
  onToggleCollapseAll,
  isAllCollapsed = false,
  sidebarLayoutMode = 'BOTH',
  onChangeSidebarLayoutMode,
  onShowToast,
  dashboardBgOpacity = 0.95,
  widgetOpacity = 0.95,
  fontScale = 1.0,
  onUpdateOpacitySettings,
}) => {
  const [dockPinned, setDockPinned] = useState<string[]>(readDockPinned);
  const [isDockMoreOpen, setIsDockMoreOpen] = useState(false);
  const [autoModeOn, setAutoModeOn] = useState<boolean>(() => {
    try { return localStorage.getItem('auto_mode_switch_v1') === 'on'; } catch { return false; }
  });
  useEffect(() => {
    const sync = () => { try { setAutoModeOn(localStorage.getItem('auto_mode_switch_v1') === 'on'); } catch { /* 무시 */ } };
    window.addEventListener('classin:auto-mode-changed', sync);
    return () => window.removeEventListener('classin:auto-mode-changed', sync);
  }, []);
  const toggleDockPin = (key: string) => {
    setDockPinned((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      try { localStorage.setItem(DOCK_PIN_KEY, JSON.stringify(next)); } catch { /* 무시 */ }
      return next;
    });
  };
  const runDockItem = (key: string) => {
    const el = document.querySelector(`.cl-dock [data-dock-key="${key}"]`) as HTMLButtonElement | null;
    if (el) { el.click(); setIsDockMoreOpen(false); }
  };
  useEffect(() => {
    if (!isDockMoreOpen) return;
    const close = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-dock-more-pop]') || t.closest('[data-dock-more-btn]')) return;
      setIsDockMoreOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [isDockMoreOpen]);
  const dockHiddenCss = DOCK_ITEMS.filter((it) => !dockPinned.includes(it.key))
    .map((it) => `.cl-dock [data-dock-key="${it.key}"]{display:none!important}`).join('');

  // 🖥️ 바탕화면 비침 방식 (흐림 유리 / 선명 투명) - 데스크톱 앱에서만 표시
  const [glassPrefs, setGlassPrefs] = useState<{
    glassMode: 'blur' | 'clear';
    support: { blur: boolean; clear: boolean };
  } | null>(() => {
    try {
      const p = (window as any).electronAPI?.windowPrefs?.get?.();
      return p && p.support ? { glassMode: p.glassMode === 'clear' ? 'clear' : 'blur', support: p.support } : null;
    } catch {
      return null;
    }
  });
  // 지금 창에 실제 적용된 방식 (앱 시작 시 결정됨)
  const [glassAppliedMode] = useState<'blur' | 'clear'>(() => {
    try {
      return (window as any).electronAPI?.getWindowMaterial?.() === 'transparent' ? 'clear' : 'blur';
    } catch {
      return 'blur';
    }
  });
  const [glassRestartNeeded, setGlassRestartNeeded] = useState(() => !!glassPrefs && glassPrefs.glassMode !== glassAppliedMode);

  const [mounted, setMounted] = useState<boolean>(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [isRemoteOpen, setIsRemoteOpen] = useState(false);
  const [hoveredDesc, setHoveredDesc] = useState<string | null>(null);
  // 🍬 캔디바 설명: 마우스를 올린 아이콘 위치 · 이름
  const [candy, setCandy] = useState<{ label: string; x: number; bottom: number } | null>(null);
  const handleDockOver = (e: React.MouseEvent) => {
    const btn = (e.target as HTMLElement).closest?.('[data-dock-btn]') as HTMLElement | null;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const label = btn.getAttribute('aria-label') || '';
    setCandy((prev) => (prev && prev.label === label && Math.abs(prev.x - (r.left + r.width / 2)) < 1 ? prev : { label, x: r.left + r.width / 2, bottom: window.innerHeight - r.top + 12 }));
  };
  const [isDynamicIslandOpen, setIsDynamicIslandOpen] = useState<boolean>(false);
  const [isOpacityPanelOpen, setIsOpacityPanelOpen] = useState<boolean>(false);
  const [islandTab, setIslandTab] = useState<'widgets' | 'dock'>('widgets');

  // 차임벨 클릭 시 종 울리는 흔들림 애니메이션 상태
  const [isBellRinging, setIsBellRinging] = useState<boolean>(false);

  // 🎨 팔레트/투명도 조절 팝오버 외부 클릭 감지 Ref
  const opacityPanelRef = useRef<HTMLDivElement | null>(null);

  // 🎛️ 사이드 스택 배치 모드 메뉴 상태 및 Ref
  const [isSidebarMenuOpen, setIsSidebarMenuOpen] = useState<boolean>(false);
  const sidebarMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (opacityPanelRef.current && !opacityPanelRef.current.contains(e.target as Node)) {
        setIsOpacityPanelOpen(false);
      }
      if (sidebarMenuRef.current && !sidebarMenuRef.current.contains(e.target as Node)) {
        setIsSidebarMenuOpen(false);
      }
    };
    if (isOpacityPanelOpen || isSidebarMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpacityPanelOpen, isSidebarMenuOpen]);

  // 하단 위젯바 항상 노출 vs 자동 숨김(오토하이드) 상태 (기본값: false 항상 노출)
  const [dockAutoHide, setDockAutoHide] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_dock_autohide');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  // 하단 위젯바 커스텀 색상 (localStorage 연동, 안전 폴백)
  const [dockBgColor, setDockBgColor] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_dock_bgcolor');
      if (saved && saved.startsWith('#') && saved.length >= 4) return saved;
    } catch {}
    return '#0f172a';
  });

  // 하단 위젯바 투명도 (안전 폴백: 0.2 ~ 1.0, 기본값: 0.95)
  const [dockOpacity, setDockOpacity] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_dock_opacity');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 0.2 && val <= 1.0) {
          return val;
        }
      }
    } catch {}
    return 0.95;
  });

  // 💡 [PART 3 신규 기능] 하단 위젯바 크기(Scale) 조절 상태 (안전 폴백: 0.8 ~ 1.2, 기본값: 1.0)
  const [dockScale, setDockScale] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_dock_scale');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 0.7 && val <= 1.5) {
          return val;
        }
      }
    } catch {}
    return 1.0;
  });

  // 💡 [PART 3 신규 기능] 위젯바 배경색 YIQ 명도 계산 (밝은 배경: text-slate-800, 어두운 배경: text-white)
  const isLightColor = (hexColor: string): boolean => {
    try {
      const cleanHex = hexColor.replace('#', '');
      const r = parseInt(cleanHex.substring(0, 2), 16) || 15;
      const g = parseInt(cleanHex.substring(2, 4), 16) || 23;
      const b = parseInt(cleanHex.substring(4, 6), 16) || 42;
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 128;
    } catch {
      return false;
    }
  };

  const isDockBgLight = isLightColor(dockBgColor);

  // 마우스 호버 감지 상태 및 디바운스 타이머 (300ms 안전 지연)
  const [isDockHovered, setIsDockHovered] = useState<boolean>(false);
  const dockHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleDockMouseEnter = () => {
    if (dockHoverTimeoutRef.current) {
      clearTimeout(dockHoverTimeoutRef.current);
      dockHoverTimeoutRef.current = null;
    }
    setIsDockHovered(true);
  };

  const handleDockMouseLeave = () => {
    if (dockHoverTimeoutRef.current) {
      clearTimeout(dockHoverTimeoutRef.current);
    }
    dockHoverTimeoutRef.current = setTimeout(() => {
      setIsDockHovered(false);
    }, 300);
  };

  const handleChimeClick = () => {
    setIsBellRinging(true);
    onRingChime();
    setTimeout(() => setIsBellRinging(false), 1600);
  };

  const handleToggleAutoHide = (autoHide: boolean) => {
    setDockAutoHide(autoHide);
    try {
      localStorage.setItem('class_dashboard_dock_autohide', String(autoHide));
    } catch {}
    onShowToast(
      autoHide
        ? '⬇️ 하단 위젯바 자동 숨김이 활성화되었습니다. (마우스를 하단에 가져가면 튀어오릅니다)'
        : '📌 하단 위젯바가 항상 노출되도록 고정되었습니다.'
    );
  };

  const handleSaveDockBgColor = (color: string) => {
    setDockBgColor(color);
    try {
      localStorage.setItem('class_dashboard_dock_bgcolor', color);
    } catch {}
  };

  const handleSaveDockOpacity = (opacity: number) => {
    setDockOpacity(opacity);
    try {
      localStorage.setItem('class_dashboard_dock_opacity', String(opacity));
    } catch {}
  };

  // 💡 독 스케일 저장 핸들러
  const handleSaveDockScale = (scale: number) => {
    const clamped = Math.max(0.8, Math.min(1.2, Math.round(scale * 100) / 100));
    setDockScale(clamped);
    try {
      localStorage.setItem('class_dashboard_dock_scale', String(clamped));
    } catch {}
  };

  // 위젯 카테고리별 깔끔한 그룹화 (다이나믹 허브 전체 위젯 1:1 동기화)
  const widgetCategories = [
    {
      name: '수업 및 활동 도구',
      items: [
        { id: 'noise', title: getWidgetName('noise'), icon: Volume2, color: 'text-amber-400' },
        { id: 'picker', title: getWidgetName('picker'), icon: Dice5, color: 'text-purple-400' },
        { id: 'clock', title: getWidgetName('clock'), icon: Timer, color: 'text-rose-400' },
        { id: 'meal', title: getWidgetName('meal'), icon: Utensils, color: 'text-emerald-300' },
      ],
    },
    {
      name: '학급 경영 및 생활지도',
      items: [
        { id: 'seating', title: getWidgetName('seating'), icon: LayoutGrid, color: 'text-blue-400' },
        { id: 'attendance', title: getWidgetName('attendance'), icon: CheckCircle2, color: 'text-teal-400' },
        { id: 'roles', title: getWidgetName('roles'), icon: Users, color: 'text-pink-400' },
        { id: 'observation', title: getWidgetName('observation'), icon: FileText, color: 'text-violet-400' },
      ],
    },
    {
      name: '시간표 및 일정관리',
      items: [
        { id: 'timetable', title: getWidgetName('timetable'), icon: CalendarDays, color: 'text-indigo-400' },
        { id: 'agenda', title: getWidgetName('agenda'), icon: FileSpreadsheet, color: 'text-rose-400' },
        { id: 'calendar', title: getWidgetName('calendar'), icon: Calendar, color: 'text-orange-400' },
        { id: 'dday', title: getWidgetName('dday'), icon: Sparkles, color: 'text-yellow-400' },
      ],
    },
    {
      name: '기타항목',
      items: [
        { id: 'youtube', title: getWidgetName('youtube'), icon: Tv, color: 'text-red-400' },
        { id: 'bookmarks', title: getWidgetName('bookmarks'), icon: Globe, color: 'text-cyan-400' },
        { id: 'schoolInfo', title: getWidgetName('schoolInfo'), icon: LayoutGrid, color: 'text-amber-300' },
        { id: 'quote', title: getWidgetName('quote'), icon: BookOpen, color: 'text-amber-300' },
        { id: 'postit', title: getWidgetName('postit'), icon: StickyNote, color: 'text-yellow-300' },
        { id: 'ideanote', title: getWidgetName('ideanote'), icon: Lightbulb, color: 'text-amber-400' },
        { id: 'seqtimer', title: getWidgetName('seqtimer'), icon: ListOrdered, color: 'text-emerald-400' },
        { id: 'homework', title: getWidgetName('homework'), icon: ClipboardCheck, color: 'text-violet-400' },
      ],
    },
  ];

  // 전체 위젯 활성화 여부 계산 (PART 8 마스터 스위치)
  const allWidgetKeys = Object.keys(ALL_WIDGET_INFO);
  const isAllWidgetsActive = hiddenWidgetIds.length === 0;

  const handleMasterToggleWidgets = () => {
    const nextState = !isAllWidgetsActive;
    if (nextState) {
      // 전체 켜기: 모든 위젯 복원
      allWidgetKeys.forEach((wId) => {
        if (hiddenWidgetIds.includes(wId)) {
          onRestoreWidget(wId);
        }
      });
      onShowToast('🔘 전체 위젯이 일괄 활성화되었습니다.');
    } else {
      // 전체 끄기: 모든 위젯 숨김
      allWidgetKeys.forEach((wId) => {
        if (!hiddenWidgetIds.includes(wId)) {
          if (onHideWidget) {
            onHideWidget(wId);
          } else {
            onToggleWidget(wId);
          }
        }
      });
      onShowToast('🔘 전체 위젯이 일괄 숨김 처리되었습니다.');
    }
  };

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* ========================================================== */}
      {/* 💡 [PART 3] 제어 허브창 백드롭 (외부 클릭 시 부드럽게 닫힘)         */}
      {/* ========================================================== */}
      <div
        onClick={() => setIsDynamicIslandOpen(false)}
        className={`fixed inset-0 bg-black/40 backdrop-blur-xs z-[9998] transition-opacity duration-300 ${
          isDynamicIslandOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* 💡 [PART 2: macOS Dock 간섭 방지] 화면 최하단 보이지 않는 얇은 마우스 감지 히트박스 영역 (h-4, z-40) */}
      <div
        onMouseEnter={handleDockMouseEnter}
        className="fixed bottom-0 left-0 w-full h-4 z-40 pointer-events-auto bg-transparent cursor-pointer"
        title="마우스를 올리면 하단 위젯바가 나타납니다"
      />

      {/* 💡 [PART 2: Mac Dock 높이를 고려한 bottom-5 여유 마진 및 부드러운 튀어오름 & 300ms 디바운스] */}
      <nav
        onMouseEnter={handleDockMouseEnter}
        onMouseLeave={handleDockMouseLeave}
        className={`fixed bottom-5 inset-x-0 z-[9999] pointer-events-none flex flex-col items-center justify-center gap-2 px-3 transition-all duration-300 ease-out ${
          dockAutoHide && !isDockHovered && !isDynamicIslandOpen
            ? 'translate-y-[calc(100%+28px)] opacity-0 pointer-events-none scale-95'
            : 'translate-y-0 opacity-100 scale-100'
        }`}
      >
        {/* 🍬 캔디바 설명 (아이콘 바로 위) */}
        {candy &&
          !isDynamicIslandOpen &&
          typeof document !== 'undefined' &&
          (() => {
            const desc = (hoveredDesc || '')
              .replace(/^[^가-힣A-Za-z0-9]+/, '')
              .replace(/^[^:：]{1,24}[:：]\s*/, '')
              .trim();
            const shortDesc = desc.length > 64 ? `${desc.slice(0, 62)}…` : desc;
            const half = Math.min(190, (candy.label.length * 13 + (shortDesc ? Math.min(shortDesc.length, 30) * 11 + 24 : 0) + 30) / 2);
            const x = Math.min(window.innerWidth - half - 8, Math.max(half + 8, candy.x));
            return createPortal(
              <div className={`cl-candy ${shortDesc.length > 26 ? 'is-long' : ''}`} style={{ left: x, bottom: candy.bottom }} role="tooltip">
                <span className="cl-candy-label">{candy.label}</span>
                {shortDesc && shortDesc !== candy.label && <span className="cl-candy-desc">{shortDesc}</span>}
              </div>,
              document.body
            );
          })()}

        {/* Dynamic VisionOS Glass Tooltip */}
        {hoveredDesc && !isDynamicIslandOpen && (
          <div className="cl-dock-tip pointer-events-auto bg-slate-900/90 text-white text-[11px] font-bold px-4 py-1.5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-white/20 border-t border-t-white/40 animate-fade-in backdrop-blur-2xl max-w-lg text-center leading-relaxed">
            {hoveredDesc}
          </div>
        )}

        {/* ========================================================== */}
        {/* 💡 [PART 3 & 8] 스마트 대시보드 제어 허브 슬라이드 업/다운 컨테이너  */}
        {/* ========================================================== */}
        <div
          className={`pointer-events-auto w-full max-w-2xl bg-slate-900/95 text-white rounded-3xl p-5 shadow-2xl border border-white/20 backdrop-blur-2xl transition-all duration-300 ease-out transform ${
            isDynamicIslandOpen
              ? 'translate-y-0 opacity-100 pointer-events-auto mb-2'
              : 'translate-y-12 opacity-0 pointer-events-none h-0 overflow-hidden p-0 mb-0 border-transparent'
          } space-y-4`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md">
                <Sliders className="w-4 h-4" strokeWidth={2} />
              </div>
              <div>
                <h4 className="font-extrabold text-sm flex items-center gap-2">
                  <span>스마트 대시보드 제어 허브</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                    원클릭 컨트롤
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  위젯 ON/OFF를 간편하게 조작하고, 하단 독 노출 방식 및 투명도/크기를 커스텀합니다.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsDynamicIslandOpen(false)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>

          {/* QUICK ACTION BAR: Apple VisionOS 3열 그리드 액션 카드 */}
          <div className="grid grid-cols-3 gap-2.5">
            {onSmartLayoutOptimize && (
              <button
                type="button"
                onClick={onSmartLayoutOptimize}
                className="group relative p-3 rounded-2xl bg-gradient-to-b from-amber-500/15 to-orange-500/10 hover:from-amber-500/25 hover:to-orange-500/20 border border-amber-500/30 hover:border-amber-400/60 transition-all duration-200 cursor-pointer text-left shadow-lg hover:shadow-amber-500/10 active:scale-98 flex flex-col justify-between"
                title="위젯 크기는 그대로 두고, 순서대로 빈틈없이 다시 놓아요. 먼저 갈 자리를 보여 줘요 (📌 고정 위젯은 그대로)."
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" strokeWidth={2} />
                  </div>
                </div>
                <div>
                  <div className="text-xs font-black text-amber-200 group-hover:text-amber-100 flex items-center gap-1">
                    새로 정렬
                  </div>
                  <div className="text-[10px] text-amber-300/70 font-medium">크기 그대로 · 빈틈없이</div>
                </div>
              </button>
            )}

            {onAutoAlignWidgets && (
              <button
                type="button"
                onClick={onAutoAlignWidgets}
                className="group relative p-3 rounded-2xl bg-gradient-to-b from-teal-500/15 to-cyan-500/10 hover:from-teal-500/25 hover:to-cyan-500/20 border border-teal-500/30 hover:border-teal-400/60 transition-all duration-200 cursor-pointer text-left shadow-lg hover:shadow-teal-500/10 active:scale-98 flex flex-col justify-between"
                title="위젯을 같은 세로줄 안에서 위로 붙여 빈틈만 메워요. 먼저 갈 자리를 보여 줘요 (📌 고정 위젯은 그대로)."
              >
                <div className="w-7 h-7 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center mb-1">
                  <Magnet className="w-4 h-4" strokeWidth={2} />
                </div>
                <div>
                  <div className="text-xs font-black text-teal-200 group-hover:text-teal-100">
                    빈틈 메우기
                  </div>
                  <div className="text-[10px] text-teal-300/70 font-medium">같은 줄 · 간격 일정</div>
                </div>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onResetDefaultLayout();
              }}
              className="group relative p-3 rounded-2xl bg-gradient-to-b from-slate-800/60 to-slate-900/60 hover:from-slate-700/70 hover:to-slate-800/70 border border-white/10 hover:border-white/25 transition-all duration-200 cursor-pointer text-left shadow-lg active:scale-98 flex flex-col justify-between"
              title="2열 또는 3열 균등 크기로 맞춰요 (먼저 미리보기)"
            >
              <div className="w-7 h-7 rounded-xl bg-white/10 text-slate-300 flex items-center justify-center mb-1">
                <RotateCcw className="w-4 h-4" strokeWidth={2} />
              </div>
              <div>
                <div className="text-xs font-black text-slate-200 group-hover:text-white">
                  열 맞춤 정렬
                </div>
                <div className="text-[10px] text-slate-400 font-medium">2열 · 3열 균등</div>
              </div>
            </button>
          </div>

          {/* Island Tabs: VisionOS 슬라이딩 글래스 세그먼트 컨트롤 */}
          <div className="flex items-center gap-1.5 bg-slate-900/60 backdrop-blur-xl p-1 rounded-2xl border border-white/10 shadow-inner">
            <button
              type="button"
              onClick={() => setIslandTab('widgets')}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                islandTab === 'widgets'
                  ? 'bg-indigo-600/90 text-white shadow-lg border border-indigo-400/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" strokeWidth={2} />
              <span>위젯 ON/OFF 관리 ({allWidgetKeys.length - hiddenWidgetIds.length}/{allWidgetKeys.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setIslandTab('dock')}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                islandTab === 'dock'
                  ? 'bg-indigo-600/90 text-white shadow-lg border border-indigo-400/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" strokeWidth={2} />
              <span>하단 위젯바 설정 (노출/스타일)</span>
            </button>
          </div>

          {/* Tab 1: 위젯 ON/OFF 관리 (PART 8 마스터 스위치 + 전체 위젯 1:1 동기화 그리드) */}
          {islandTab === 'widgets' && (
            <div className="space-y-3.5 max-h-[340px] overflow-y-auto custom-scroll pr-1">
              {/* 💡 [PART 8 신규 기능] 전체 위젯 일괄 켜기/끄기 슬라이딩 마스터 스위치 */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-slate-950/90 to-indigo-950/50 border border-indigo-500/30 shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs">
                    🔘
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-100 flex items-center gap-1.5">
                      <span>전체 위젯 일괄 켜기/끄기</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300">
                        마스터 스위치
                      </span>
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      {isAllWidgetsActive
                        ? `🟢 현재 ${allWidgetKeys.length}개 모든 위젯이 활성화되어 있습니다.`
                        : `🟡 ${allWidgetKeys.length - hiddenWidgetIds.length}개 켜짐 / ${hiddenWidgetIds.length}개 숨김`}
                    </span>
                  </div>
                </div>

                {/* 슬라이딩 토글 스위치 버튼 */}
                <button
                  type="button"
                  onClick={handleMasterToggleWidgets}
                  className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-300 cursor-pointer focus:outline-hidden ${
                    isAllWidgetsActive ? 'bg-indigo-600 ring-2 ring-indigo-400/50' : 'bg-slate-700'
                  }`}
                  title={isAllWidgetsActive ? '모든 위젯 일괄 숨김' : '모든 위젯 일괄 켜기'}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                      isAllWidgetsActive ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* 18개 전체 위젯 카테고리별 그리드 */}
              {widgetCategories.map((cat) => (
                <div key={cat.name} className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 pl-1">{cat.name}</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {cat.items.map((w) => {
                      const isVisible = !hiddenWidgetIds.includes(w.id);
                      const Icon = w.icon;
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => {
                            if (isVisible) {
                              onHideWidget ? onHideWidget(w.id) : onToggleWidget(w.id);
                            } else {
                              onRestoreWidget(w.id);
                            }
                          }}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-1.5 ${
                            isVisible
                              ? 'bg-slate-800/90 border-slate-700 text-white shadow-xs'
                              : 'bg-slate-950/50 border-white/5 text-slate-500 hover:text-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Icon className={`w-4 h-4 ${isVisible ? w.color : 'text-slate-600'}`} strokeWidth={2} />
                            <span className="text-xs font-bold truncate">{w.title}</span>
                          </div>
                          <span
                            className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-md ${
                              isVisible ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-600'
                            }`}
                          >
                            {isVisible ? 'ON' : 'OFF'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 2: 하단 위젯바 설정 (노출 방식, 크기 조절, 색상, 투명도 조절) */}
          {islandTab === 'dock' && (
            <div className="p-4 bg-slate-950/80 rounded-2xl border border-white/10 space-y-4 animate-fade-in text-xs">
              {/* 노출 방식 선택 */}
              <div className="space-y-2">
                <label className="font-bold text-slate-300 block">
                  하단 위젯바 노출 방식
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleAutoHide(false)}
                    className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      !dockAutoHide
                        ? 'border-indigo-500 bg-indigo-950/80 text-white ring-1 ring-indigo-400'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <span>📌 항상 노출</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleAutoHide(true)}
                    className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      dockAutoHide
                        ? 'border-purple-500 bg-purple-950/80 text-white ring-1 ring-purple-400'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <span>✨ 마우스 오버 시 튀어오름 (자동 숨김)</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  {dockAutoHide
                    ? '마우스가 하단 영역을 벗어나면 아래로 부드럽게 숨겨지고, 마우스를 가져가면 위로 튀어오릅니다.'
                    : '하단 위젯바가 화면 아래쪽에 항상 고정되어 표시됩니다.'}
                </p>
              </div>

              {/* 위젯바 크기(Scale) 조절 슬라이더 */}
              <div className="space-y-2 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between text-slate-300 font-bold">
                  <span className="flex items-center gap-1.5">
                    <span>📏</span>
                    <span>위젯바 크기 조절 (Scale)</span>
                  </span>
                  <span className="text-cyan-400 font-mono font-black">{Math.round(dockScale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.2"
                  step="0.05"
                  value={dockScale}
                  onChange={(e) => handleSaveDockScale(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 bg-gradient-to-r from-indigo-500/40 via-cyan-500/40 to-teal-500/40 h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-0.5">
                  <span>작게 (80%)</span>
                  <span>표준 (100%)</span>
                  <span>크게 (120%)</span>
                </div>
              </div>

              {/* 색상 및 투명도 선택 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-3 border-t border-white/10">
                {/* 배경 색상 */}
                <div className="space-y-2">
                  <label className="font-bold text-slate-300 block text-xs">위젯바 배경 색상</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { name: '슬레이트', color: '#0f172a' },
                      { name: '네이비', color: '#1e293b' },
                      { name: '인디고', color: '#312e81' },
                      { name: '에메랄드', color: '#064e3b' },
                      { name: '화이트펄', color: '#f8fafc' },
                      { name: '소프트스카이', color: '#e0f2fe' },
                      { name: '블랙', color: '#000000' },
                    ].map((c) => (
                      <button
                        key={c.color}
                        type="button"
                        onClick={() => handleSaveDockBgColor(c.color)}
                        className={`w-6 h-6 rounded-full border transition-all duration-200 cursor-pointer ${
                          dockBgColor === c.color
                            ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900 shadow-[0_0_12px_rgba(129,140,248,0.6)] scale-115'
                            : 'border-white/20 hover:scale-105 hover:border-white/40'
                        }`}
                        style={{ backgroundColor: c.color }}
                        title={c.name}
                      />
                    ))}
                    <input
                      type="color"
                      value={dockBgColor}
                      onChange={(e) => handleSaveDockBgColor(e.target.value)}
                      className="w-6 h-6 rounded-full cursor-pointer border-0 bg-transparent p-0 ml-1 hover:scale-105 transition"
                      title="커스텀 컬러 선택"
                    />
                  </div>
                </div>

                {/* 투명도 조절 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-slate-300 font-bold text-xs">
                    <span>위젯바 투명도</span>
                    <span className="text-cyan-400 font-mono font-black">{Math.round(dockOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.0"
                    step="0.05"
                    value={dockOpacity}
                    onChange={(e) => handleSaveDockOpacity(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 bg-gradient-to-r from-indigo-500/40 via-cyan-500/40 to-teal-500/40 h-2 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-0.5">
                    <span>20% (반투명)</span>
                    <span>100% (불투명)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================== */}
        {/* Apple VisionOS 스페이셜 글래스 독 (Spatial Glass Dock) */}
        {/* ========================================================== */}
        <div
          onMouseEnter={handleDockMouseEnter}
          onMouseOver={handleDockOver}
          onMouseLeave={() => setCandy(null)}
          style={{
            backgroundColor: dockBgColor,
            opacity: dockOpacity,
            transform: `scale(${dockScale})`,
            transformOrigin: 'bottom center',
          }}
          className={`cl-dock pointer-events-auto flex items-center gap-2 p-1.5 rounded-3xl backdrop-blur-2xl border border-white/15 border-t border-t-white/30 shadow-[0_20px_50px_rgba(0,0,0,0.6)] select-none transition-all duration-300 relative ${
            isDockBgLight ? 'text-slate-800' : 'text-white'
          }`}
        >
          {/* 🪟 [서브 파우치 1: 시스템 & 테마] */}
          <div className="cl-dock-pouch flex items-center gap-1 bg-black/25 dark:bg-white/5 rounded-2xl p-1 border border-white/10 shadow-inner">
            {/* 1) [허브 제어 설정] 버튼 */}
            <button
              type="button"
              onClick={() => setIsDynamicIslandOpen(!isDynamicIslandOpen)}
              onMouseEnter={() =>
                setHoveredDesc(
                  `⚡ 설정: 위젯 ON/OFF 및 대시보드 옵션을 설정합니다. (${isDynamicIslandOpen ? '닫기' : '열기'})`
                )
              }
              onMouseLeave={() => setHoveredDesc(null)}
              data-dock-btn
                className={`w-10 h-10 rounded-2xl flex items-center justify-center relative transition-all duration-200 cursor-pointer active:scale-95 hover:-translate-y-1 hover:scale-105 ${
                isDynamicIslandOpen
                  ? 'bg-white/15 border border-white/25 shadow-inner text-white'
                  : isDockBgLight
                  ? 'text-slate-700 hover:bg-slate-900/10'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
              aria-label="대시보드 위젯 설정"
            >
              <Sliders className="w-4 h-4" strokeWidth={2} />
              {isDynamicIslandOpen && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] pointer-events-none" />
              )}
            </button>

            {/* 2) 🎨 [테마 팔레트 버튼 & 디스플레이 설정] */}
            <div className="relative" ref={opacityPanelRef}>
              <button
                type="button"
                onClick={() => setIsOpacityPanelOpen(!isOpacityPanelOpen)}
                onMouseEnter={() =>
                  setHoveredDesc(
                    `🎨 팔레트 & 화면 디스플레이 설정: 배경/위젯 투명도, 글씨 크기 배율 조절 (${isOpacityPanelOpen ? '닫기' : '열기'})`
                  )
                }
                onMouseLeave={() => setHoveredDesc(null)}
                data-dock-btn
                className={`w-10 h-10 rounded-2xl flex items-center justify-center relative transition-all duration-200 cursor-pointer active:scale-95 hover:-translate-y-1 hover:scale-105 ${
                  isOpacityPanelOpen
                    ? 'bg-white/15 border border-white/25 shadow-inner text-white'
                    : isDockBgLight
                    ? 'text-slate-700 hover:bg-slate-900/10'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                aria-label="배경 투명도 및 글씨 크기 조절"
              >
                <Palette className="w-4 h-4" strokeWidth={2} />
                {isOpacityPanelOpen && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] pointer-events-none" />
                )}
              </button>

              {/* 🎨 팔레트 & 화면 디스플레이 플로팅 설정 팝오버 */}
              {isOpacityPanelOpen && (
                <div
                  className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-80 sm:w-88 p-4 rounded-3xl bg-slate-900/98 dark:bg-slate-950/98 backdrop-blur-3xl border border-slate-700/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] z-50 flex flex-col gap-3.5 text-xs select-none animate-in fade-in zoom-in-95 duration-150"
                  style={{ minWidth: '320px' }}
                >
                  {/* 팝오버 헤더 */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                        <Palette className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-[13px] font-black text-white leading-tight">화면 팔레트 & 투명도 설정</h4>
                        <p className="text-[10px] text-slate-400">배경·위젯 투명도 및 글씨 크기 실시간 조절</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-400/30">
                        실시간 동기화
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsOpacityPanelOpen(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                        title="닫기"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 슬라이더 컨트롤 목록 */}
                  <div className="flex flex-col gap-3">
                    {/* 1. 대시보드 배경 투명도 */}
                    <div className="space-y-1 bg-white/5 p-2.5 rounded-2xl border border-white/10">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                        <span className="flex items-center gap-1.5">
                          <span>🎨</span>
                          <span>대시보드 배경 투명도</span>
                        </span>
                        <span className="text-indigo-400 font-mono font-black text-sm">
                          {Math.round((dashboardBgOpacity ?? 0.95) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={dashboardBgOpacity ?? 0.95}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          onUpdateOpacitySettings?.({ dashboardBgOpacity: val });
                        }}
                        className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                      />
                      <div className="flex items-center justify-between text-[10px] text-slate-400 px-0.5">
                        <span>0% (완전 투명)</span>
                        <span>100% (불투명)</span>
                      </div>
                    </div>

                    {/* 1-1. 바탕화면 비침 방식 (데스크톱 앱 전용) */}
                    {glassPrefs && (glassPrefs.support.blur || glassPrefs.support.clear) && (
                      <div className="space-y-1.5 bg-white/5 p-2.5 rounded-2xl border border-white/10">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                          <span className="flex items-center gap-1.5">
                            <span>🖥️</span>
                            <span>바탕화면 비침</span>
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">배경 투명도를 낮출수록 잘 보여요</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {([
                            { id: 'blur', label: '🫧 흐림 유리', desc: '색감만 은은하게', ok: glassPrefs.support.blur },
                            { id: 'clear', label: '🔍 선명 투명', desc: '아래 화면이 그대로', ok: glassPrefs.support.clear },
                          ] as const).map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              disabled={!opt.ok}
                              onClick={async () => {
                                const api = (window as any).electronAPI?.windowPrefs;
                                const res = await api?.set?.({ glassMode: opt.id });
                                setGlassPrefs((p) => (p ? { ...p, glassMode: opt.id } : p));
                                setGlassRestartNeeded(opt.id !== glassAppliedMode);
                                if (!res?.success) setGlassRestartNeeded(false);
                              }}
                              className={`flex flex-col items-start px-2.5 py-1.5 rounded-xl border text-left transition-all ${
                                glassPrefs.glassMode === opt.id
                                  ? 'bg-indigo-500/25 border-indigo-400/70 text-white'
                                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                              } ${opt.ok ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
                            >
                              <span className="text-[12px] font-bold">{opt.label}</span>
                              <span className="text-[10px] text-slate-400">{opt.ok ? opt.desc : '이 PC에서 지원 안 됨'}</span>
                            </button>
                          ))}
                        </div>
                        {glassRestartNeeded && (
                          <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl bg-amber-400/15 border border-amber-300/40">
                            <span className="text-[11px] font-semibold text-amber-200">앱을 다시 시작하면 적용돼요</span>
                            <button
                              type="button"
                              onClick={() => (window as any).electronAPI?.windowPrefs?.relaunch?.()}
                              className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-900 text-[11px] font-black cursor-pointer"
                            >
                              지금 다시 시작
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2. 위젯 카드 투명도 */}
                    <div className="space-y-1 bg-white/5 p-2.5 rounded-2xl border border-white/10">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                        <span className="flex items-center gap-1.5">
                          <span>🪟</span>
                          <span>위젯 카드 투명도</span>
                        </span>
                        <span className="text-purple-400 font-mono font-black text-sm">
                          {Math.round((widgetOpacity ?? 0.95) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.3"
                        max="1.0"
                        step="0.05"
                        value={widgetOpacity ?? 0.95}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          onUpdateOpacitySettings?.({ widgetOpacity: val });
                        }}
                        className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                      />
                      <div className="flex items-center justify-between text-[10px] text-slate-400 px-0.5">
                        <span>30% (맑은 유리)</span>
                        <span>100% (선명함)</span>
                      </div>
                    </div>

                    {/* 3. 글씨 크기 배율 */}
                    <div className="space-y-1 bg-white/5 p-2.5 rounded-2xl border border-white/10">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                        <span className="flex items-center gap-1.5">
                          <span>🔍</span>
                          <span>글씨/위젯 크기 배율</span>
                        </span>
                        <span className="text-emerald-400 font-mono font-black text-sm">
                          {Math.round((fontScale ?? 1.0) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.8"
                        max="1.3"
                        step="0.05"
                        value={fontScale ?? 1.0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          onUpdateOpacitySettings?.({ fontScale: val });
                        }}
                        className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                      />
                      <div className="flex items-center justify-between text-[10px] text-slate-400 px-0.5">
                        <span>80% (작게)</span>
                        <span>100% (기본)</span>
                        <span>130% (크게)</span>
                      </div>
                    </div>

                    {/* 4. 하단 위젯바(도크) 투명도 */}
                    <div className="space-y-1 bg-white/5 p-2.5 rounded-2xl border border-white/10">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                        <span className="flex items-center gap-1.5">
                          <span>📊</span>
                          <span>하단 위젯바 투명도</span>
                        </span>
                        <span className="text-sky-400 font-mono font-black text-sm">
                          {Math.round(dockOpacity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="1.0"
                        step="0.05"
                        value={dockOpacity}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setDockOpacity(val);
                          localStorage.setItem('class_dashboard_dock_opacity', String(val));
                        }}
                        className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                      />
                      <div className="flex items-center justify-between text-[10px] text-slate-400 px-0.5">
                        <span>20% (반투명)</span>
                        <span>100% (불투명)</span>
                      </div>
                    </div>
                  </div>

                  {/* 하단 버튼 액션: 초기화 & 닫기 */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateOpacitySettings?.({
                          dashboardBgOpacity: 0.95,
                          widgetOpacity: 0.95,
                          fontScale: 1.0,
                        });
                        setDockOpacity(0.95);
                        localStorage.setItem('class_dashboard_dock_opacity', '0.95');
                        onShowToast?.('🔄 화면 디스플레이 설정이 기본값으로 초기화되었습니다.');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white font-bold text-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                      title="기본값 복원"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>기본값 복원</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsOpacityPanelOpen(false)}
                      className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition active:scale-95 cursor-pointer shadow-md shadow-indigo-600/30"
                    >
                      확인 및 닫기
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 🪟 [서브 파우치 2: 레이아웃 & 패널] */}
          <div className="cl-dock-pouch flex items-center gap-1 bg-black/25 dark:bg-white/5 rounded-2xl p-1 border border-white/10 shadow-inner">
            {/* 3) [스마트 최적화] */}
            {onSmartLayoutOptimize && (
              <button
                type="button"
                onClick={onSmartLayoutOptimize}
                onMouseEnter={() =>
                  setHoveredDesc(
                    '✨ 새로 정렬: 위젯 크기는 그대로 두고, 순서(위→아래, 왼→오른)대로 빈틈없이 다시 놓아요. 먼저 갈 자리를 보여 줘요. (📌 고정 위젯은 그대로)'
                  )
                }
                onMouseLeave={() => setHoveredDesc(null)}
                data-dock-btn
                className={`w-10 h-10 rounded-2xl flex items-center justify-center relative transition-all duration-200 cursor-pointer active:scale-95 hover:-translate-y-1 hover:scale-105 ${
                  isDockBgLight
                    ? 'text-amber-700 hover:bg-amber-600/15'
                    : 'text-amber-300 hover:bg-white/10'
                }`}
                aria-label="새로 정렬 (크기 그대로, 빈틈없이)" title="새로 정렬 (크기 그대로, 빈틈없이)" data-dock-key="smart"
              >
                <Sparkles className="w-4 h-4" strokeWidth={2} />
              </button>
            )}

            {/* 4) [자석 밀착 정렬] */}
            {onAutoAlignWidgets && (
              <button
                type="button"
                onClick={onAutoAlignWidgets}
                onMouseEnter={() =>
                  setHoveredDesc(
                    '🧲 빈틈 메우기: 위젯을 같은 세로줄 안에서 위로 붙이고 간격을 일정하게 맞춰요. 미리보기에서 간격 숫자를 눌러 직접 바꿀 수 있어요.'
                  )
                }
                onMouseLeave={() => setHoveredDesc(null)}
                data-dock-btn
                className={`w-10 h-10 rounded-2xl flex items-center justify-center relative transition-all duration-200 cursor-pointer active:scale-95 hover:-translate-y-1 hover:scale-105 ${
                  isDockBgLight
                    ? 'text-teal-700 hover:bg-teal-600/15'
                    : 'text-teal-300 hover:bg-white/10'
                }`}
                aria-label="위젯 밀착 자석 정렬 (사용자 크기 100% 보존)" data-dock-key="magnet"
              >
                <Magnet className="w-4 h-4" strokeWidth={2} />
              </button>
            )}

            {/* 4-1) [표준 초기화] */}
            {onResetDefaultLayout && (
              <button
                type="button"
                onClick={onResetDefaultLayout}
                onMouseEnter={() =>
                  setHoveredDesc(
                    '↺ 열 맞춤 정렬: 위젯을 2열 또는 3열로 모두 같은 크기로 맞춰요. 미리보기 막대에서 2열/3열과 세로 높이를 고를 수 있어요. (📌 고정 위젯은 그대로)'
                  )
                }
                onMouseLeave={() => setHoveredDesc(null)}
                data-dock-btn
                className={`w-10 h-10 rounded-2xl flex items-center justify-center relative transition-all duration-200 cursor-pointer active:scale-95 hover:-translate-y-1 hover:scale-105 ${
                  isDockBgLight
                    ? 'text-rose-700 hover:bg-rose-600/15'
                    : 'text-rose-300 hover:bg-white/10'
                }`}
                aria-label="열 맞춤 정렬 (2열 · 3열 균등)" data-dock-key="reset3"
              >
                <RotateCcw className="w-4 h-4" strokeWidth={2} />
              </button>
            )}

            {/* 4-2) [사이드 스택 배치 모드 팝업 메뉴] */}
            {onChangeSidebarLayoutMode && (
              <div className="relative" ref={sidebarMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsSidebarMenuOpen((prev) => !prev)}
                  onMouseEnter={() =>
                    setHoveredDesc(
                      `🎛️ 사이드 스택 배치 모드: 양쪽 스택(기본), 좌/우 몰기 통합, 전체화면을 선택합니다. (현재: ${
                        sidebarLayoutMode === 'BOTH'
                          ? '양쪽 모두 사용'
                          : sidebarLayoutMode === 'LEFT_ONLY'
                          ? '좌측 집중 (우측 몰기)'
                          : sidebarLayoutMode === 'RIGHT_ONLY'
                          ? '우측 집중 (좌측 몰기)'
                          : '전체 화면 (스택 숨김)'
                      })`
                    )
                  }
                  onMouseLeave={() => setHoveredDesc(null)}
                  data-dock-btn
                className={`w-10 h-10 rounded-2xl flex items-center justify-center relative transition-all duration-200 cursor-pointer active:scale-95 hover:-translate-y-1 hover:scale-105 ${
                    isSidebarMenuOpen
                      ? 'bg-sky-500/25 border border-sky-400/60 shadow-[0_0_12px_rgba(56,189,248,0.35)] text-sky-300'
                      : isDockBgLight
                      ? 'text-sky-700 hover:bg-sky-600/15'
                      : 'text-sky-300 hover:bg-white/10'
                  }`}
                  aria-label="사이드 스택 배치 모드 선택"
                >
                  <Columns3 className="w-4 h-4" strokeWidth={2} />
                  {sidebarLayoutMode !== 'BOTH' && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8] pointer-events-none" />
                  )}
                </button>

                {/* 🎛️ 사이드 스택 배치 모드 팝업 메뉴 */}
                {isSidebarMenuOpen && (
                  <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-72 p-3 rounded-2xl bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-2xl border border-white/20 dark:border-slate-700 shadow-2xl z-50 text-white animate-fade-in flex flex-col gap-1.5">
                    <div className="flex items-center justify-between px-1 pb-1.5 border-b border-white/10 mb-0.5">
                      <span className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                        <span>🎛️</span>
                        <span>사이드 스택 배치 모드</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsSidebarMenuOpen(false)}
                        className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* 1. 양쪽 모두 사용 */}
                    <button
                      type="button"
                      onClick={() => {
                        onChangeSidebarLayoutMode('BOTH');
                        setIsSidebarMenuOpen(false);
                        onShowToast?.('🎛️ [화면 분할] 양쪽 모두 사용 모드로 전환되었습니다.');
                      }}
                      className={`w-full p-2 rounded-xl text-left transition flex items-center justify-between cursor-pointer ${
                        sidebarLayoutMode === 'BOTH'
                          ? 'bg-indigo-600 text-white font-black shadow-md'
                          : 'hover:bg-white/10 text-slate-300 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Columns3 className="w-4 h-4 shrink-0" />
                        <div>
                          <div className="text-xs font-bold">1. 양쪽 모두 사용</div>
                          <div className="text-[10px] opacity-80">좌: 위젯스택 / 우: 메모스택</div>
                        </div>
                      </div>
                      {sidebarLayoutMode === 'BOTH' && <Check className="w-4 h-4 shrink-0 text-white" />}
                    </button>

                    {/* 2. 좌측 집중 (우측 몰기) */}
                    <button
                      type="button"
                      onClick={() => {
                        onChangeSidebarLayoutMode('LEFT_ONLY');
                        setIsSidebarMenuOpen(false);
                        onShowToast?.('🎛️ [화면 분할] 좌측 집중 (우측 몰기) 모드로 전환되었습니다.');
                      }}
                      className={`w-full p-2 rounded-xl text-left transition flex items-center justify-between cursor-pointer ${
                        sidebarLayoutMode === 'LEFT_ONLY'
                          ? 'bg-indigo-600 text-white font-black shadow-md'
                          : 'hover:bg-white/10 text-slate-300 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <PanelRight className="w-4 h-4 shrink-0" />
                        <div>
                          <div className="text-xs font-bold">2. 좌측 집중 (우측 몰기)</div>
                          <div className="text-[10px] opacity-80">우측 1개 바에 메모+위젯 통합</div>
                        </div>
                      </div>
                      {sidebarLayoutMode === 'LEFT_ONLY' && <Check className="w-4 h-4 shrink-0 text-white" />}
                    </button>

                    {/* 3. 우측 집중 (좌측 몰기) */}
                    <button
                      type="button"
                      onClick={() => {
                        onChangeSidebarLayoutMode('RIGHT_ONLY');
                        setIsSidebarMenuOpen(false);
                        onShowToast?.('🎛️ [화면 분할] 우측 집중 (좌측 몰기) 모드로 전환되었습니다.');
                      }}
                      className={`w-full p-2 rounded-xl text-left transition flex items-center justify-between cursor-pointer ${
                        sidebarLayoutMode === 'RIGHT_ONLY'
                          ? 'bg-indigo-600 text-white font-black shadow-md'
                          : 'hover:bg-white/10 text-slate-300 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <PanelLeft className="w-4 h-4 shrink-0" />
                        <div>
                          <div className="text-xs font-bold">3. 우측 집중 (좌측 몰기)</div>
                          <div className="text-[10px] opacity-80">좌측 1개 바에 메모+위젯 통합</div>
                        </div>
                      </div>
                      {sidebarLayoutMode === 'RIGHT_ONLY' && <Check className="w-4 h-4 shrink-0 text-white" />}
                    </button>

                    {/* 4. 전체 화면 (스택 숨김) */}
                    <button
                      type="button"
                      onClick={() => {
                        onChangeSidebarLayoutMode('NONE');
                        setIsSidebarMenuOpen(false);
                        onShowToast?.('🎛️ [화면 분할] 전체 화면 (스택 숨김) 모드로 전환되었습니다.');
                      }}
                      className={`w-full p-2 rounded-xl text-left transition flex items-center justify-between cursor-pointer ${
                        sidebarLayoutMode === 'NONE'
                          ? 'bg-indigo-600 text-white font-black shadow-md'
                          : 'hover:bg-white/10 text-slate-300 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Maximize className="w-4 h-4 shrink-0" />
                        <div>
                          <div className="text-xs font-bold">4. 전체 화면 (스택 숨김)</div>
                          <div className="text-[10px] opacity-80">중앙 캔버스 100% 와이드 확장</div>
                        </div>
                      </div>
                      {sidebarLayoutMode === 'NONE' && <Check className="w-4 h-4 shrink-0 text-white" />}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 5) [화면 맞춤 / 일괄 접기/펼치기] */}
            {onToggleCollapseAll && (
              <button
                type="button"
                onClick={onToggleCollapseAll}
                onMouseEnter={() =>
                  setHoveredDesc(
                    isAllCollapsed
                      ? '📂 모든 위젯 일괄 펼치기: 접혀 있는 모든 위젯을 원래 크기대로 펼칩니다.'
                      : '📁 모든 위젯 일괄 접기: 캔버스의 모든 위젯을 헤더(48px)만 남기고 일괄 축소합니다.'
                  )
                }
                onMouseLeave={() => setHoveredDesc(null)}
                data-dock-btn
                className={`w-10 h-10 rounded-2xl flex items-center justify-center relative transition-all duration-200 cursor-pointer active:scale-95 hover:-translate-y-1 hover:scale-105 ${
                  isAllCollapsed
                    ? 'bg-white/15 border border-white/25 shadow-inner text-white'
                    : isDockBgLight
                    ? 'text-indigo-700 hover:bg-indigo-600/15'
                    : 'text-indigo-300 hover:bg-white/10'
                }`}
                aria-label={isAllCollapsed ? '모든 위젯 일괄 펼치기' : '모든 위젯 일괄 접기'} data-dock-key="collapse"
              >
                {isAllCollapsed ? (
                  <Maximize2 className="w-4 h-4" strokeWidth={2} />
                ) : (
                  <Minimize2 className="w-4 h-4" strokeWidth={2} />
                )}
                {isAllCollapsed && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] pointer-events-none" />
                )}
              </button>
            )}

            {/* 6) [포커스 모드 모드 (Focus Mode)] */}
            {onToggleFocusMode && (
              <button
                type="button"
                onClick={onToggleFocusMode}
                onMouseEnter={() =>
                  setHoveredDesc(
                    `🎯 포커스 모드: ${isFocusMode ? 'ON (선택된 포커스 위젯만 집중 표시)' : 'OFF (전체 대시보드 표시)'}`
                  )
                }
                onMouseLeave={() => setHoveredDesc(null)}
                data-dock-btn
                className={`w-10 h-10 rounded-2xl flex items-center justify-center relative transition-all duration-200 cursor-pointer active:scale-95 hover:-translate-y-1 hover:scale-105 ${
                  isFocusMode
                    ? 'bg-amber-500/25 border border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.35)] text-amber-300'
                    : isDockBgLight
                    ? 'text-slate-700 hover:bg-slate-900/10'
                    : 'text-slate-300 hover:bg-white/10'
                }`}
                aria-label={`포커스 모드 (Focus Mode): ${isFocusMode ? 'ON' : 'OFF'}`} data-dock-key="focus"
              >
                <Target className="w-4 h-4" strokeWidth={2} />
                {isFocusMode && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24] pointer-events-none animate-pulse" />
                )}
              </button>
            )}

            {/* 6-1) [스티커 모드] 위젯을 숨기고 스티커 · 시계 · 일정만 보기 */}
            {onToggleStickerMode && (
              <button
                type="button"
                onClick={onToggleStickerMode}
                onMouseEnter={() =>
                  setHoveredDesc(
                    `🖼️ 스티커 모드: ${isStickerMode ? 'ON (스티커 · 시계 · 다가오는 일정만 보여요. 스티커를 바로 눌러 고칠 수 있어요)' : 'OFF (누르면 위젯을 숨기고 스티커만 보여요)'}`
                  )
                }
                onMouseLeave={() => setHoveredDesc(null)}
                data-dock-btn
                data-sticker-mode-btn
                className={`w-10 h-10 rounded-2xl flex items-center justify-center relative transition-all duration-200 cursor-pointer active:scale-95 hover:-translate-y-1 hover:scale-105 ${
                  isStickerMode
                    ? 'bg-pink-500/25 border border-pink-400/60 shadow-[0_0_12px_rgba(236,72,153,0.35)] text-pink-300'
                    : isDockBgLight
                    ? 'text-slate-700 hover:bg-slate-900/10'
                    : 'text-slate-300 hover:bg-white/10'
                }`}
                aria-label={`스티커 모드: ${isStickerMode ? 'ON' : 'OFF'}`} data-dock-key="sticker"
              >
                <Sticker className="w-4 h-4" strokeWidth={2} />
                {isStickerMode && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-pink-400 shadow-[0_0_8px_#f472b6] pointer-events-none animate-pulse" />
                )}
              </button>
            )}
          </div>

          {/* 🪟 [서브 파우치 3: 수업 도구 & 뷰포트] */}
          <div className="cl-dock-pouch flex items-center gap-1 bg-black/25 dark:bg-white/5 rounded-2xl p-1 border border-white/10 shadow-inner">
            {/* 8) [사운드 볼륨] */}
            {onToggleWidgetMoveSound && (
              <button
                type="button"
                onClick={onToggleWidgetMoveSound}
                onMouseEnter={() =>
                  setHoveredDesc(
                    `🔊 전체 효과음: ${
                      isWidgetMoveSoundEnabled ? 'ON (소리 켜짐 - 클릭 시 전체 무음)' : 'OFF (전체 무음 - 클릭 시 소리 켬)'
                    }`
                  )
                }
                onMouseLeave={() => setHoveredDesc(null)}
                data-dock-btn
                className={`w-10 h-10 rounded-2xl flex items-center justify-center relative transition-all duration-200 cursor-pointer active:scale-95 hover:-translate-y-1 hover:scale-105 ${
                  isWidgetMoveSoundEnabled
                    ? 'bg-white/15 border border-white/25 shadow-inner text-sky-300'
                    : 'text-slate-400 hover:bg-white/10 opacity-70'
                }`}
                aria-label={`전체 효과음: ${isWidgetMoveSoundEnabled ? 'ON' : 'OFF'}`} data-dock-key="sound"
              >
                {isWidgetMoveSoundEnabled ? (
                  <Volume2 className="w-4 h-4" strokeWidth={2} />
                ) : (
                  <VolumeX className="w-4 h-4" strokeWidth={2} />
                )}
                {isWidgetMoveSoundEnabled && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] pointer-events-none" />
                )}
              </button>
            )}

            {/* 9) [퀵 메모 / 포스트잇] */}
            {onAddPostIt && (
              <button
                type="button"
                onClick={() => {
                  onAddPostIt();
                  onShowToast('📝 새 포스트잇 위젯이 화면에 추가되었습니다!');
                }}
                onMouseEnter={() =>
                  setHoveredDesc('📝 포스트잇 추가: 원하는 색상으로 메모할 수 있는 새 포스트잇 위젯을 추가합니다.')
                }
                onMouseLeave={() => setHoveredDesc(null)}
                data-dock-btn
                className={`w-10 h-10 rounded-2xl flex items-center justify-center relative transition-all duration-200 cursor-pointer active:scale-95 hover:-translate-y-1 hover:scale-105 ${
                  isDockBgLight
                    ? 'text-amber-800 hover:bg-amber-600/15'
                    : 'text-yellow-300 hover:bg-white/10'
                }`}
                aria-label="새 포스트잇 위젯 추가" data-dock-key="postit"
              >
                <StickyNote className="w-4 h-4" strokeWidth={2} />
              </button>
            )}

            {/* 9-1) [이미지 스티커] */}
            {onOpenStickers && (
              <button
                type="button"
                onClick={onOpenStickers}
                onMouseEnter={() => setHoveredDesc('🖼️ 새 스티커 불러오기: 이미지를 골라 붙여요. (스티커 모드로 바뀌어 바로 위치 · 크기를 고칠 수 있어요)')}
                onMouseLeave={() => setHoveredDesc(null)}
                data-dock-btn
                className="w-10 h-10 rounded-2xl flex items-center justify-center relative transition-all duration-200 cursor-pointer active:scale-95 hover:-translate-y-1 hover:scale-105"
                aria-label="새 스티커 불러오기" data-dock-key="newSticker"
              >
                <ImagePlus className="w-4 h-4" strokeWidth={2} />
              </button>
            )}

            {/* 10) [차임벨 / 종소리] */}
            <button
              type="button"
              onClick={handleChimeClick}
              onMouseEnter={() => setHoveredDesc('🔔 차임벨 울리기: 보조 모니터에 집중 신호를 송출하고 종을 울립니다.')}
              onMouseLeave={() => setHoveredDesc(null)}
              data-dock-btn
                className={`w-10 h-10 rounded-2xl flex items-center justify-center relative transition-all duration-200 cursor-pointer active:scale-95 hover:-translate-y-1 hover:scale-105 ${
                isBellRinging
                  ? 'bg-amber-400/30 border border-amber-300/50 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                  : isDockBgLight
                  ? 'text-amber-800 hover:bg-amber-600/15'
                  : 'text-amber-300 hover:bg-white/10'
              }`}
              aria-label="집중 차임벨 울리기" data-dock-key="chime"
            >
              <Bell
                className={`w-4 h-4 transition-transform duration-300 ${
                  isBellRinging ? 'animate-bounce text-yellow-200 rotate-12' : ''
                }`}
                strokeWidth={2}
              />
              {isBellRinging && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24] pointer-events-none" />
              )}
            </button>

            {/* 11) [보조 모니터 / 전자칠판 모드] */}
            {onOpenStudentDisplay && (
              <button
                type="button"
                onClick={onOpenStudentDisplay}
                onMouseEnter={() => setHoveredDesc('📺 보조 모니터 팝업: 교실 TV나 보조 화면으로 독립 송출합니다.')}
                onMouseLeave={() => setHoveredDesc(null)}
                data-dock-btn
                className={`w-10 h-10 rounded-2xl flex items-center justify-center relative transition-all duration-200 cursor-pointer active:scale-95 hover:-translate-y-1 hover:scale-105 ${
                  isDockBgLight
                    ? 'text-cyan-800 hover:bg-cyan-600/15'
                    : 'text-cyan-300 hover:bg-white/10'
                }`}
                aria-label="보조 모니터 분리 송출" data-dock-key="display"
              >
                <Tv className="w-4 h-4" strokeWidth={2} />
              </button>
            )}

            {/* 11-1) [보조창 리모컨] */}
            <button
              type="button"
              onClick={() => setIsRemoteOpen((v) => !v)}
              onMouseEnter={() => setHoveredDesc('🎮 보조창 리모컨: 보조창 화면 바꾸기 · 잠깐 가리기 · 타이머를 여기서 바로 조종해요.')}
              onMouseLeave={() => setHoveredDesc(null)}
              data-dock-btn
              aria-pressed={isRemoteOpen}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center relative transition-all duration-200 cursor-pointer active:scale-95 hover:-translate-y-1 hover:scale-105 ${
                isDockBgLight ? 'text-violet-800 hover:bg-violet-600/15' : 'text-violet-300 hover:bg-white/10'
              }`}
              aria-label="보조창 리모컨"
              data-remote-btn
            >
              <Gamepad2 className="w-4 h-4" strokeWidth={2} />
            </button>
            <DisplayRemote open={isRemoteOpen} onClose={() => setIsRemoteOpen(false)} onOpenDisplay={onOpenStudentDisplay} />

            {/* 12) [화면 편집 잠금] */}
            {onLockScreen && (
              <button
                type="button"
                onClick={onLockScreen}
                onMouseEnter={() => setHoveredDesc('🔒 화면 잠금: 대시보드 조작 방지를 위해 화면을 잠급니다.')}
                onMouseLeave={() => setHoveredDesc(null)}
                data-dock-btn
                className={`w-10 h-10 rounded-2xl flex items-center justify-center relative transition-all duration-200 cursor-pointer active:scale-95 hover:-translate-y-1 hover:scale-105 ${
                  isDockBgLight
                    ? 'text-amber-800 hover:bg-amber-600/15'
                    : 'text-amber-300 hover:bg-white/10'
                }`}
                aria-label="화면 편집 잠금" data-dock-key="lock"
              >
                <Lock className="w-4 h-4" strokeWidth={2} />
              </button>
            )}

            {/* 13) [전체화면] */}
            {onToggleFullscreen && (
              <button
                type="button"
                onClick={onToggleFullscreen}
                onMouseEnter={() =>
                  setHoveredDesc(
                    isFullscreen
                      ? '⛶ 전체화면 종료: 일반 창 크기로 되돌립니다.'
                      : '⛶ 전체화면 전환: 스마트 전자칠판 전체화면으로 전환합니다.'
                  )
                }
                onMouseLeave={() => setHoveredDesc(null)}
                data-dock-btn
                className={`w-10 h-10 rounded-2xl flex items-center justify-center relative transition-all duration-200 cursor-pointer active:scale-95 hover:-translate-y-1 hover:scale-105 ${
                  isFullscreen
                    ? 'bg-white/15 border border-white/25 shadow-inner text-white'
                    : isDockBgLight
                    ? 'text-slate-800 hover:bg-slate-600/15'
                    : 'text-slate-200 hover:bg-white/10'
                }`}
                aria-label={isFullscreen ? '전체화면 종료' : '전체화면 전환'} data-dock-key="fullscreen"
              >
                {isFullscreen ? (
                  <Minimize className="w-4 h-4" strokeWidth={2} />
                ) : (
                  <Maximize className="w-4 h-4" strokeWidth={2} />
                )}
                {isFullscreen && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] pointer-events-none" />
                )}
              </button>
            )}
          </div>

          {/* ⋯ [더보기] 독에 고정하지 않은 버튼 모음 + 독 구성 */}
          <style>{dockHiddenCss}</style>
          <div className="relative">
            <button
              type="button"
              data-dock-btn
              data-dock-more-btn
              onClick={() => { setHoveredDesc(null); setIsDockMoreOpen((v) => !v); }}
              onMouseEnter={() => { if (!isDockMoreOpen) setHoveredDesc('⋯ 더보기: 독에 없는 기능을 열고, 독에 둘 버튼을 고를 수 있어요.'); }}
              onMouseLeave={() => setHoveredDesc(null)}
              aria-expanded={isDockMoreOpen}
              aria-label="더보기 및 독 구성"
              className={`w-10 h-10 rounded-2xl flex items-center justify-center relative transition-all duration-200 cursor-pointer active:scale-95 hover:-translate-y-1 hover:scale-105 ${
                isDockMoreOpen ? 'bg-white/15 border border-white/25 shadow-inner text-white' : isDockBgLight ? 'text-slate-700 hover:bg-slate-900/10' : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <MoreHorizontal className="w-4 h-4" strokeWidth={2.4} />
            </button>
            {isDockMoreOpen && (
              <div data-dock-more-pop className="dock-more-pop absolute bottom-[calc(100%+14px)] right-0 w-[300px] rounded-3xl p-3 bg-slate-900 border border-white/15 shadow-2xl backdrop-blur-2xl text-white">
                <div className="flex items-center justify-between px-1 pb-2">
                  <span className="text-xs font-black">더보기</span>
                  <span className="text-[10px] text-slate-400">📌 = 독에 고정</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !autoModeOn;
                    try { localStorage.setItem('auto_mode_switch_v1', next ? 'on' : 'off'); } catch { /* 무시 */ }
                    setAutoModeOn(next);
                    window.dispatchEvent(new Event('classin:auto-mode-changed'));
                    onShowToast(next ? '⏰ 이제 시정표에 맞춰 수업·쉬는 시간·하교·업무 화면이 저절로 바뀌어요.' : '⏰ 자동 화면 전환을 껐어요.');
                  }}
                  aria-pressed={autoModeOn}
                  className={`w-full mb-2 flex items-center gap-2.5 px-3 min-h-[44px] rounded-2xl border text-left transition ${autoModeOn ? 'bg-emerald-400/15 border-emerald-300/40' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                >
                  <span className="text-sm">⏰</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-black">시정표 따라 화면 자동 전환</span>
                    <span className="block text-[10px] text-slate-400">수업 → 쉬는 시간 → 하교 → 업무</span>
                  </span>
                  <span className={`w-9 h-5 rounded-full p-0.5 transition ${autoModeOn ? 'bg-emerald-400' : 'bg-slate-600'}`}>
                    <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${autoModeOn ? 'translate-x-4' : ''}`} />
                  </span>
                </button>
                <div className="grid grid-cols-1 gap-1 max-h-[360px] overflow-y-auto custom-scrollbar">
                  {DOCK_ITEMS.map((it) => {
                    const pinned = dockPinned.includes(it.key);
                    return (
                      <div key={it.key} className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => runDockItem(it.key)}
                          className="flex-1 flex items-center gap-2.5 px-2.5 min-h-[40px] rounded-xl hover:bg-white/10 text-left text-xs font-bold transition"
                        >
                          <span className="w-6 text-center text-sm">{it.emoji}</span>
                          <span>{it.label}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleDockPin(it.key)}
                          aria-pressed={pinned}
                          title={pinned ? '독에서 빼기' : '독에 고정하기'}
                          className={`w-10 h-10 rounded-xl grid place-items-center text-sm transition ${pinned ? 'bg-cyan-400/20 text-cyan-200' : 'text-slate-500 hover:bg-white/10 grayscale opacity-60'}`}
                        >
                          📌
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>,
    document.body
  );
};
