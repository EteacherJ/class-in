import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Tv, X, GripHorizontal, ChevronDown, ChevronUp, Pin, Settings, Sliders, Check, FoldHorizontal, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DashboardTheme, YouTubeFoldBehavior } from '../types';
import { getTheme } from '../utils/theme';


/** rgba(...) 색상의 알파 값만 교체 (hex·기타 형식은 단색 테마 의도로 보고 그대로 반환) */
function withAlpha(color: string, alpha: number): string {
  const m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*[\d.]+)?\s*\)$/i.exec(color.trim());
  return m ? `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})` : color;
}
export type WidgetSpan = 1 | 2 | 3 | 4 | 6 | 8 | 12;

interface ResizableWidgetCardProps {
  id: string;
  title?: string;
  children: React.ReactNode;
  span?: WidgetSpan;
  onSpanChange?: (newSpan: WidgetSpan) => void;
  onOpenDualMonitor?: () => void;
  onClose?: () => void;
  isSmartBoard?: boolean;
  theme?: DashboardTheme;
  className?: string;
  isDraggable?: boolean;
  isDragActive?: boolean;
  draggedWidgetId?: string | null;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onDragOver?: (e: React.DragEvent, id: string) => void;
  onDrop?: (e: React.DragEvent, id: string) => void;
  onDragEnd?: () => void;
  isDragOver?: boolean;
  dropFeedback?: 'valid' | 'invalid' | null;
  onDockOver?: (zoneId: string) => void;
  onDockLeave?: () => void;
  isDockOver?: boolean;
  isCollapsedControlled?: boolean;
  onToggleCollapse?: (id: string) => void;
  isPinned?: boolean; // 위젯 이동 방지 고정 상태
  onTogglePin?: (id: string) => void; // 위젯 고정 토글 핸들러
  pinColor?: string; // 위젯별 고유 핀 색상 클래스
  opacity?: number; // 전역 또는 기본 위젯 투명도 (0.2 ~ 1.0)
  onOpacityChange?: (widgetId: string, newOpacity: number) => void; // 개별 위젯 투명도 변경 핸들러
  onGlobalOpacityChange?: (newOpacity: number) => void; // 모든 위젯 투명도 일괄 적용 핸들러
  isStackMode?: boolean; // 스택모드 여부 (켜져 있으면 더블클릭 시 스택으로 이동, 꺼져 있으면 아코디언 접힘)
  onStackCollapse?: (id: string) => void; // 스택모드일 때 스택으로 접기 핸들러
  onFreeResize?: (width: number, height: number) => void; // 자유 모드 리사이징 핸들러 (너비/높이 동시 변경)
  isFreeMode?: boolean; // 자유 모드 활성화 여부
  youtubeFoldBehavior?: YouTubeFoldBehavior; // 유튜브 접힘 동작 (미니 플레이어 vs 일반 스택)
  onYoutubeFoldBehaviorChange?: (behavior: YouTubeFoldBehavior) => void;
  widgetHeaderColorMode?: 'auto' | 'custom' | 'transparent'; // 개별 위젯 상단 바 색상 설정: [테마 자동 적용] / [사용자 커스텀 컬러] / [투명 (위젯 일체형)]
  customWidgetHeaderColor?: string; // 사용자 커스텀 위젯 상단 바 색상 hex
  widgetTextContrast?: 'auto' | 'high' | 'ultra'; // 위젯 텍스트 가독성 최적화 설정
  widgetTextShadow?: boolean; // 위젯 텍스트 외곽선 그림자
  widgetCardSolidBg?: boolean; // 위젯 카드 불투명 고대비 배경
  isCompactRow?: boolean; // 바로가기 위젯 등 1행 축소 모드 여부 (PDF 1페이지 수정사항 1)
  onToggleCompactRow?: () => void; // 1행 축소 모드 토글 핸들러
  dashboardBorderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full'; // 위젯 및 대시보드 모서리 라운드(곡률)
  recommendedHeight?: number; // 화면 해상도 및 비율에 맞춘 권장 기본 위젯 높이 (27인치 480px 등)
  contentZoom?: number; // 27인치 대형 화면 등에서 내부 본문 텍스트/UI 비례 스케일링 배율
  isDarkMode?: boolean; // 🌙 다크 모드 활성화 여부 (첨부 이미지의 딥 미드나잇 시네마 스타일 일관 유지)
  customBgColor?: string | null; // 사용자 커스텀 위젯 배경 색상
  onCustomBgColorChange?: (widgetId: string, color: string | null) => void;
  onShowToast?: (msg: string) => void;
  /** 상단 헤더 더블클릭 오버라이드 콜백 (스왑 등) */
  onHeaderDoubleClick?: () => void;
  /** 자유 배치에서 저장된 위젯 높이 (바깥 틀과 카드 높이를 항상 같게 맞춰요) */
  freeHeight?: number;
}

/**
 * [ResizableWidgetCard 컴포넌트]
 * 1. 12분할 그리드(3, 4, 6, 8, 12 Span) 및 고투과 글래스모피즘(Glassmorphism)
 * 2. 상단 좌측 캡슐형 컨트롤 바: [ ⚙️ 설정 | 📌 고정 | ⌃ 접기/스택 | ✕ 닫기 ] (마우스 오버 시 표시)
 * 3. 스택모드 여부에 따른 지능형 상단 더블클릭 (스택 이동 vs 헤더만 남는 아코디언 접기)
 * 4. 💡 [PART 2 고도화] 캔버스 실측 줌 배율(zoom) 보정 정밀 드래그 리사이징 (마우스 커서 1:1 일치)
 * 5. 💡 [PART 2 고도화] 우측 하단 모서리 가로/세로 동시 리사이징 & 12컬럼 스냅 & min-h 180px 가드레일
 * 6. 💡 [PART 4 고도화] Icons8 스타일 모던 아이콘 시스템 적용 (2px stroke, 둥근 라운드)
 */
export const ResizableWidgetCard: React.FC<ResizableWidgetCardProps> = React.memo(({
  id,
  title,
  children,
  span = 4,
  onSpanChange,
  onOpenDualMonitor,
  onClose,
  isSmartBoard = false,
  theme,
  isDarkMode,
  className = '',
  isDraggable = true,
  isDragActive = false,
  draggedWidgetId = null,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragOver = false,
  dropFeedback = null,
  onDockOver,
  onDockLeave,
  isDockOver = false,
  isCollapsedControlled,
  onToggleCollapse,
  isPinned = false,
  onTogglePin,
  pinColor,
  opacity,
  onOpacityChange,
  onGlobalOpacityChange,
  isStackMode = false,
  onStackCollapse,
  onFreeResize,
  isFreeMode = false,
  youtubeFoldBehavior = 'mini',
  onYoutubeFoldBehaviorChange,
  widgetHeaderColorMode = 'auto',
  customWidgetHeaderColor,
  widgetTextContrast = 'auto',
  widgetTextShadow = false,
  widgetCardSolidBg = false,
  isCompactRow = false,
  onToggleCompactRow,
  dashboardBorderRadius = 'md',
  recommendedHeight,
  contentZoom,
  customBgColor,
  onCustomBgColorChange,
  onShowToast,
  onHeaderDoubleClick,
  freeHeight,
}) => {
  const isDark = isDarkMode !== undefined
    ? isDarkMode
    : (typeof document !== 'undefined' &&
       (document.documentElement.classList.contains('dark') || document.body.classList.contains('dark')));
  const themeConfig = getTheme(theme, isDark);
  const [currentSpan, setCurrentSpan] = useState<WidgetSpan>(span);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const settingsPopoverRef = useRef<HTMLDivElement | null>(null);

  // 모서리 라운드(곡률) 클래스 계산
  const radiusClass =
    dashboardBorderRadius === 'none'
      ? 'rounded-none'
      : dashboardBorderRadius === 'sm'
      ? 'rounded-lg'
      : dashboardBorderRadius === 'lg'
      ? 'rounded-3xl'
      : dashboardBorderRadius === 'full'
      ? 'rounded-[32px]'
      : 'rounded-2xl';

  // 포스트잇 위젯 여부 확인
  const isPostIt = id.startsWith('postit-');

  // 위젯 고정 여부에 따른 드래그 가능 상태 계산 (고정 시 이동 불가)
  const effectiveDraggable = isDraggable && !isPinned;

  // 설정 팝오버 열림 상태
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 개별 위젯 투명도 상태 (로컬 스토리지에 저장된 값 우선 복원)
  const [widgetOpacity, setWidgetOpacity] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`widget_opacity_${id}`);
      if (saved) return parseFloat(saved);
    } catch {}
    return opacity !== undefined ? opacity : 1;
  });

  // 🎨 개별 위젯 커스텀 배경 색상 상태 (로컬 스토리지 복원 및 실시간 연동)
  const [widgetCustomBg, setWidgetCustomBg] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(`widget_custom_bg_${id}`);
      if (saved) return saved;
    } catch {}
    return customBgColor || null;
  });

  // 다른 위젯에서 '전체 적용' 시 실시간 동기화
  useEffect(() => {
    const handleCustomBgUpdate = () => {
      try {
        const saved = localStorage.getItem(`widget_custom_bg_${id}`);
        setWidgetCustomBg(saved || null);
      } catch {}
    };
    window.addEventListener('storage', handleCustomBgUpdate);
    window.addEventListener('widget_custom_bg_updated', handleCustomBgUpdate);
    return () => {
      window.removeEventListener('storage', handleCustomBgUpdate);
      window.removeEventListener('widget_custom_bg_updated', handleCustomBgUpdate);
    };
  }, [id]);

  // props로 전달된 전역 opacity 변경 시 동기화
  useEffect(() => {
    if (opacity !== undefined) {
      try {
        const saved = localStorage.getItem(`widget_opacity_${id}`);
        if (!saved) {
          setWidgetOpacity(opacity);
        }
      } catch {
        setWidgetOpacity(opacity);
      }
    }
  }, [opacity, id]);

  const settingsBtnRef = useRef<HTMLButtonElement | null>(null);

  // 설정 팝오버 외부 빈 영역 클릭 시 자동 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isSettingsOpen &&
        settingsPopoverRef.current &&
        !settingsPopoverRef.current.contains(e.target as Node) &&
        settingsBtnRef.current &&
        !settingsBtnRef.current.contains(e.target as Node)
      ) {
        setIsSettingsOpen(false);
      }
    };

    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen]);

  // 커스텀 위젯 높이 상태 (로컬 스토리지 복원, 화면비율 맞춤 recommendedHeight 지원)
  const defaultHeight = recommendedHeight || (isPostIt ? 270 : 380);
  const [customHeight, setCustomHeight] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem(`widget_height_${id}`);
      return saved ? parseInt(saved, 10) : defaultHeight;
    } catch {
      return defaultHeight;
    }
  });

  // 📏 자유 배치에서는 바깥 틀(저장된 높이)과 카드 높이를 항상 같게 (따로 놀면 화면에서 겹쳐 보여요)
  useEffect(() => {
    if (isFreeMode && freeHeight && Math.abs((customHeight || 0) - freeHeight) > 1 && !isResizingRef.current) {
      setCustomHeight(Math.round(freeHeight));
      try {
        localStorage.setItem(`widget_height_${id}`, String(Math.round(freeHeight)));
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFreeMode, freeHeight]);
  // ↕ 세로 크기 숫자로 입력
  const [isHeightEditOpen, setIsHeightEditOpen] = useState(false);
  const applyTypedHeight = (raw: number) => {
    const h = Math.max(160, Math.min(1400, Math.round(raw)));
    setCustomHeight(h);
    try {
      localStorage.setItem(`widget_height_${id}`, String(h));
    } catch {}
    if (isFreeMode && onFreeResize) {
      const z = getCanvasScale();
      const w = cardRef.current ? Math.round(cardRef.current.getBoundingClientRect().width / (z || 1)) : 380;
      onFreeResize(w, h);
    }
    setIsHeightEditOpen(false);
    onShowToast?.(`↕ 위젯 높이를 ${h}px로 맞췄어요.`);
  };

  // 위젯 접기(Fold) & 펼치기(Unfold) 상태
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(`widget_collapsed_${id}`);
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const isControlled = isCollapsedControlled !== undefined;
  const isCollapsed = isControlled ? isCollapsedControlled : internalCollapsed;

  // 상단 더블클릭 또는 접기 버튼 클릭 핸들러
  const handleToggleCollapse = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    // 1. 스택모드가 켜져 있을 때 더블클릭 시 좌측 스택으로 이동 (스택 진입 전 현재 크기 Size Memory 저장)
    if (isStackMode && onStackCollapse) {
      try {
        const savedSizes = JSON.parse(localStorage.getItem('class_dashboard_prev_widget_sizes') || '{}');
        savedSizes[id] = {
          span: currentSpan,
          height: customHeight || defaultHeight,
        };
        localStorage.setItem('class_dashboard_prev_widget_sizes', JSON.stringify(savedSizes));
      } catch {}
      onStackCollapse(id);
      return;
    }

    // 2. 스택모드가 아닐 때는 위젯 내용이 말려올라가며 타이틀 바(48px)만 남는 아코디언 형태 접기/펼치기
    if (isControlled && onToggleCollapse) {
      onToggleCollapse(id);
    } else {
      setInternalCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem(`widget_collapsed_${id}`, String(next));
        } catch {}
        return next;
      });
    }
  };

  // 드래그 리사이징 중 상태
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const isResizingRef = useRef(false);
  isResizingRef.current = isResizing;

  useEffect(() => {
    setCurrentSpan(span);
  }, [span]);

  // 💡 12분할 반응형 스마트 그리드 컬럼 매핑 (격자 모드에서 가로 너비 조절 완벽 지원)
  const getSpanClasses = () => {
    if (isFreeMode) return '';
    switch (currentSpan) {
      case 12:
        return 'col-span-1 md:col-span-2 lg:col-span-12 col-span-full'; // 1행 전체 전폭 (12/12)
      case 8:
        return 'col-span-1 md:col-span-2 lg:col-span-8'; // 2/3 와이드 위젯 (8/12)
      case 6:
        return 'col-span-1 md:col-span-2 lg:col-span-6'; // 1/2 절반 너비 2열 위젯 (6/12)
      case 4:
        return 'col-span-1 md:col-span-1 lg:col-span-4'; // 1/3 표준 너비 3열 위젯 (4/12)
      case 3:
        return 'col-span-1 md:col-span-1 lg:col-span-3'; // 1/4 표준 너비 4열 위젯 (3/12)
      case 2:
        return 'col-span-1 md:col-span-1 lg:col-span-2'; // 1/6 슬림 위젯 (2/12)
      case 1:
        return 'col-span-1 md:col-span-1 lg:col-span-1'; // 1/12 최소 위젯 (1/12)
      default:
        return 'col-span-1 md:col-span-1 lg:col-span-4';
    }
  };

  const getDropFeedbackClass = () => {
    if (dropFeedback === 'valid' || isDragOver) {
      return '!border-2 !border-dashed !border-[#6366F1] bg-indigo-50/20 dark:bg-indigo-950/20 shadow-none';
    }
    if (dropFeedback === 'invalid') {
      return '!border-2 !border-dashed !border-rose-400 opacity-80';
    }
    return '';
  };

  // 투명도 변경 핸들러
  const handleUpdateOpacity = (newOpacity: number) => {
    const clamped = Math.max(0.2, Math.min(1.0, Math.round(newOpacity * 100) / 100));
    setWidgetOpacity(clamped);
    try {
      localStorage.setItem(`widget_opacity_${id}`, String(clamped));
    } catch {}
    onOpacityChange?.(id, clamped);
  };

  // 모든 위젯에 투명도 일괄 적용 핸들러
  const handleApplyGlobalOpacity = () => {
    if (onGlobalOpacityChange) {
      onGlobalOpacityChange(widgetOpacity);
    }
    setIsSettingsOpen(false);
  };

  // 🎨 개별 위젯 커스텀 배경색 변경 핸들러
  const handleUpdateCustomBg = (newColor: string | null) => {
    setWidgetCustomBg(newColor);
    try {
      if (newColor) {
        localStorage.setItem(`widget_custom_bg_${id}`, newColor);
      } else {
        localStorage.removeItem(`widget_custom_bg_${id}`);
      }
    } catch {}
    onCustomBgColorChange?.(id, newColor);
  };

  // 🎨 모든 위젯에 현재 커스텀 배경색 일괄 적용 핸들러
  const handleApplyGlobalCustomBg = () => {
    try {
      const activeIds = [
        'today-quote',
        'clock',
        'timetable',
        'agenda',
        'calendar',
        'dday',
        'attendance',
        'school-meal',
        'school-info',
        'class-roles',
        'noise-monitor',
        'bookmarks',
        'seating',
        'youtube',
      ];
      activeIds.forEach((wId) => {
        if (widgetCustomBg) {
          localStorage.setItem(`widget_custom_bg_${wId}`, widgetCustomBg);
        } else {
          localStorage.removeItem(`widget_custom_bg_${wId}`);
        }
      });
      window.dispatchEvent(new CustomEvent('widget_custom_bg_updated'));
      onShowToast?.(
        widgetCustomBg
          ? '🎨 모든 위젯에 선택한 배경 색상이 일괄 적용되었습니다.'
          : '🎨 모든 위젯의 배경 색상이 테마 기본값으로 초기화되었습니다.'
      );
    } catch {}
  };

  // 💡 [배율 조절 시 가로 폭 왜곡 방지]: 컬럼 스팬별 최대 가로 너비 가드레일 (자유 모드 및 폴백)
  const getMaxWidthForSpan = () => {
    switch (currentSpan) {
      case 1:
      case 3:
        return 'max-w-[500px]'; // 1/4 컬럼 (27인치에서도 넉넉한 너비)
      case 2:
      case 4:
        return 'max-w-[640px]'; // 1/3 컬럼
      case 6:
        return 'max-w-[960px]'; // 1/2 컬럼
      case 8:
        return 'max-w-[1280px]'; // 2/3 컬럼
      case 12:
        return 'max-w-full'; // 12칸 전폭 컬럼
      default:
        return 'max-w-[640px]';
    }
  };

  // 💡 [PART 2 핵심] 부모 캔버스 scale/zoom 실측 자동 계산 함수 (0.1 ~ 5.0)
  const getCanvasScale = (): number => {
    // 1. data-canvas-zoom 속성이 부모 요소에 정의되어 있다면 최우선 정확 반영
    const scalableArea = document.getElementById('main-canvas-scalable-area');
    if (scalableArea) {
      const zoomAttr = scalableArea.getAttribute('data-canvas-zoom');
      if (zoomAttr) {
        const parsed = parseFloat(zoomAttr);
        if (!isNaN(parsed) && parsed > 0.2 && parsed < 3.0) {
          return parsed;
        }
      }
    }
    // 2. cardRef의 getBoundingClientRect() vs offsetWidth 계산
    if (!cardRef.current) return 1.0;
    const rect = cardRef.current.getBoundingClientRect();
    const offsetW = cardRef.current.offsetWidth;
    if (offsetW > 0 && rect.width > 0) {
      const scale = rect.width / offsetW;
      if (scale > 0.2 && scale < 5.0) {
        return scale;
      }
    }
    return 1.0;
  };

  // =========================================================================
  // 💡 [PART 2] 위젯 우측 테두리 전체 가로 드래그 리사이징 핸들러 (Column & Free)
  // =========================================================================
  const handleRightBorderResizeStart = useCallback(
    (clientX: number) => {
      if (!cardRef.current) return;
      setIsResizing(true);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';

      const cardRect = cardRef.current.getBoundingClientRect();
      const parentGrid =
        cardRef.current.closest('#main-canvas-grid-container') ||
        cardRef.current.parentElement?.parentElement ||
        document.getElementById('main-canvas-container');
      const zoom = getCanvasScale();
      const gridWidth = (parentGrid ? parentGrid.getBoundingClientRect().width : window.innerWidth) / zoom;
      const columnUnitWidth = gridWidth / 12; // 12분할 1컬럼 폭

      const startWidth = cardRef.current.offsetWidth;
      const startX = clientX;
      let latestSpan = currentSpan;
      let rafId: number | null = null;

      const handleMove = (moveX: number) => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          // 💡 줌 스케일(zoom)을 반영하여 마우스 커서와 위젯 모서리가 1:1로 정확하게 일치하도록 보정
          const deltaX = (moveX - startX) / zoom;

          // [자유 이동 모드 지원]: 자유 모드일 때만 픽셀 단위로 onFreeResize를 호출
          if (isFreeMode && onFreeResize) {
            const newWidth = Math.max(260, Math.min(1600, startWidth + deltaX));
            const targetHeight = customHeight || cardRect.height / zoom;
            onFreeResize?.(newWidth, targetHeight);
            return;
          }

          // [격자 모드 지원]: 12분할 그리드 컬럼 비율 정밀 스냅 (최소 2컬럼 ~ 최대 12컬럼)
          const targetWidth = Math.max(columnUnitWidth * 1.8, startWidth + deltaX);
          const estimatedRatio = targetWidth / columnUnitWidth;

          let calculatedSpan: WidgetSpan = 4;
          if (estimatedRatio >= 9.8) {
            calculatedSpan = 12; // 12칸 (1행 전폭)
          } else if (estimatedRatio >= 6.8) {
            calculatedSpan = 8; // 8칸 (2/3 와이드)
          } else if (estimatedRatio >= 4.8) {
            calculatedSpan = 6; // 6칸 (1/2 절반, 2열)
          } else if (estimatedRatio >= 3.4) {
            calculatedSpan = 4; // 4칸 (1/3 표준, 3열)
          } else if (estimatedRatio >= 2.2) {
            calculatedSpan = 3; // 3칸 (1/4 표준, 4열)
          } else {
            calculatedSpan = 2; // 2칸 (초소형)
          }

          if (calculatedSpan !== latestSpan) {
            console.log(`🔵 [ResizableWidgetCard] 가로 컬럼 조절: ${latestSpan}칸 -> ${calculatedSpan}칸`);
            latestSpan = calculatedSpan;
            setCurrentSpan(calculatedSpan);
            onSpanChange?.(calculatedSpan);
          }
        });
      };

      const handleMouseMove = (e: MouseEvent) => {
        handleMove(e.clientX);
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches[0]) {
          handleMove(e.touches[0].clientX);
        }
      };

      const handleEnd = () => {
        if (rafId) cancelAnimationFrame(rafId);
        setIsResizing(false);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleEnd);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleEnd);

        // 최종 가로 스팬 상태 동기화 및 저장 보장
        setCurrentSpan(latestSpan);
        onSpanChange?.(latestSpan);
        try {
          const savedSpans = JSON.parse(localStorage.getItem('class_dashboard_widget_spans') || '{}');
          savedSpans[id] = latestSpan;
          localStorage.setItem('class_dashboard_widget_spans', JSON.stringify(savedSpans));
          console.log(`🟢 [ResizableWidgetCard] 위젯 [${id}] 가로 스팬 저장 완료: ${latestSpan}칸`);
        } catch {}
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: true });
      window.addEventListener('touchend', handleEnd);
    },
    [currentSpan, customHeight, id, isFreeMode, onFreeResize, onSpanChange]
  );

  // =========================================================================
  // 💡 [하단 테두리 전담 리사이징]: 위젯 아래쪽 전체를 드래그하여 높이를 부드럽게 확장
  // =========================================================================
  const handleBottomBorderResizeStart = useCallback(
    (clientY: number) => {
      if (!cardRef.current) return;
      setIsResizing(true);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'row-resize';

      const zoom = getCanvasScale();
      const startHeight = cardRef.current.offsetHeight;
      const startY = clientY;
      let rafId: number | null = null;

      const handleMove = (moveY: number) => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          const deltaY = (moveY - startY) / zoom;
          const newHeight = Math.max(160, Math.min(1400, Math.round(startHeight + deltaY)));
          setCustomHeight(newHeight);
          if (cardRef.current) {
            cardRef.current.style.height = `${newHeight}px`;
            cardRef.current.style.maxHeight = `${newHeight}px`;
            if (cardRef.current.parentElement) {
              cardRef.current.parentElement.style.height = `${newHeight}px`;
            }
          }
          if (isFreeMode && onFreeResize) {
            const currentW = cardRef.current?.offsetWidth || 380;
            onFreeResize?.(currentW, newHeight);
          }
        });
      };

      const handleMouseMove = (e: MouseEvent) => {
        handleMove(e.clientY);
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches[0]) {
          handleMove(e.touches[0].clientY);
        }
      };

      const handleEnd = () => {
        if (rafId) cancelAnimationFrame(rafId);
        setIsResizing(false);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleEnd);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleEnd);

        setCustomHeight((finalHeight) => {
          if (finalHeight) {
            try {
              localStorage.setItem(`widget_height_${id}`, String(finalHeight));
            } catch {}
          }
          return finalHeight;
        });
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: true });
      window.addEventListener('touchend', handleEnd);
    },
    [id, isFreeMode, onFreeResize]
  );

  // =========================================================================
  // 💡 [PART 2] 우측 하단 코너 높이 & 가로 동시 리사이징 핸들러 (정밀 스냅 & 가드레일)
  // =========================================================================
  const handleCornerResizeStart = useCallback(
    (clientX: number, clientY: number) => {
      if (!cardRef.current) return;
      setIsResizing(true);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'nwse-resize';

      const zoom = getCanvasScale();
      const parentGrid =
        cardRef.current.closest('#main-canvas-grid-container') ||
        cardRef.current.parentElement?.parentElement ||
        document.getElementById('main-canvas-container');
      const gridWidth = (parentGrid ? parentGrid.getBoundingClientRect().width : window.innerWidth) / zoom;
      const columnUnitWidth = gridWidth / 12;

      const startWidth = cardRef.current.offsetWidth;
      const startHeight = cardRef.current.offsetHeight;
      const startX = clientX;
      const startY = clientY;
      let latestSpan = currentSpan;
      let rafId: number | null = null;

      const handleMove = (moveX: number, moveY: number) => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          // 💡 줌 스케일(zoom)을 반영하여 마우스 커서와 1:1 완벽 일치 보정
          const deltaX = (moveX - startX) / zoom;
          const deltaY = (moveY - startY) / zoom;

          // 세로 높이 리사이징 가드레일 (최소 180px ~ 최대 1200px)
          const newHeight = Math.max(180, Math.min(1200, Math.round(startHeight + deltaY)));
          setCustomHeight(newHeight);
          if (cardRef.current) {
            cardRef.current.style.height = `${newHeight}px`;
            cardRef.current.style.maxHeight = `${newHeight}px`;
          }

          // [자유 모드 지원]: 자유 모드일 때만 픽셀 단위로 부모 컨테이너에 즉시 동기화
          if (isFreeMode && onFreeResize) {
            const newWidth = Math.max(260, Math.min(1600, Math.round(startWidth + deltaX)));
            onFreeResize?.(newWidth, newHeight);
            return;
          }

          // [격자 모드 지원]: 우측 모서리를 대각선/좌우로 당겼을 때 가로 컬럼 너비 12컬럼 스냅
          const targetWidth = Math.max(columnUnitWidth * 1.8, startWidth + deltaX);
          const estimatedRatio = targetWidth / columnUnitWidth;

          let calculatedSpan: WidgetSpan = 4;
          if (estimatedRatio >= 9.8) {
            calculatedSpan = 12; // 12칸 (전폭)
          } else if (estimatedRatio >= 6.8) {
            calculatedSpan = 8; // 8칸 (2/3 너비)
          } else if (estimatedRatio >= 4.8) {
            calculatedSpan = 6; // 6칸 (1/2 너비)
          } else if (estimatedRatio >= 3.4) {
            calculatedSpan = 4; // 4칸 (기본 1/3 너비)
          } else if (estimatedRatio >= 2.2) {
            calculatedSpan = 3; // 3칸 (1/4 너비)
          } else {
            calculatedSpan = 2; // 2칸 (초소형)
          }

          if (calculatedSpan !== latestSpan) {
            console.log(`🔵 [ResizableWidgetCard] 코너 리사이징 가로 조절: ${latestSpan}칸 -> ${calculatedSpan}칸`);
            latestSpan = calculatedSpan;
            setCurrentSpan(calculatedSpan);
            onSpanChange?.(calculatedSpan);
          }
        });
      };

      const handleMouseMove = (e: MouseEvent) => {
        handleMove(e.clientX, e.clientY);
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches[0]) {
          handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      };

      const handleEnd = () => {
        if (rafId) cancelAnimationFrame(rafId);
        setIsResizing(false);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleEnd);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleEnd);

        // 가로 스팬 동기화
        setCurrentSpan(latestSpan);
        onSpanChange?.(latestSpan);

        // 높이 및 스팬 로컬 저장
        setCustomHeight((finalHeight) => {
          if (finalHeight) {
            try {
              localStorage.setItem(`widget_height_${id}`, String(finalHeight));
            } catch {}
          }
          return finalHeight;
        });

        try {
          const savedSpans = JSON.parse(localStorage.getItem('class_dashboard_widget_spans') || '{}');
          savedSpans[id] = latestSpan;
          localStorage.setItem('class_dashboard_widget_spans', JSON.stringify(savedSpans));
          console.log(`🟢 [ResizableWidgetCard] 코너 리사이징 완료 [${id}]: span=${latestSpan}, height=${cardRef.current?.offsetHeight}px`);
        } catch {}
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: true });
      window.addEventListener('touchend', handleEnd);
    },
    [currentSpan, id, isFreeMode, onFreeResize, onSpanChange]
  );

  return (
    <motion.div
      layout={false}
      transition={{ duration: 0 }}
      style={{
        transform: 'translateZ(0)',
        transition: 'none !important',
        willChange: isResizing || isDragActive ? 'transform, width, height' : 'auto',
        ...(!isFreeMode
          ? {
              width: '100%',
              maxWidth: 'none',
              gridColumn: `span ${currentSpan || 4} / span ${currentSpan || 4}`,
              height: !isCollapsed && customHeight ? `${customHeight}px` : undefined,
            }
          : {}),
        ...(isCollapsed
          ? { height: '48px', minHeight: '48px', maxHeight: '48px' }
          : isCompactRow
          ? { height: 'auto', minHeight: '70px', maxHeight: '96px' }
          : undefined),
      }}
      className={`relative flex flex-col w-full h-full max-w-none justify-self-stretch ${isFreeMode ? `mx-auto ${getMaxWidthForSpan()}` : ''} ${getSpanClasses()}`}
    >
      <div
        ref={cardRef}
        id={`widget-wrapper-${id}`}
        data-widget-card-id={id}
        style={{
          ...(!isFreeMode ? { width: '100%', maxWidth: 'none' } : {}),
          ...(isCollapsed
            ? { height: '40px', minHeight: '40px', maxHeight: '40px' }
            : isCompactRow
            ? { height: 'auto', minHeight: '66px', maxHeight: '88px' }
            : customHeight
            ? {
                height: `${customHeight}px`,
                maxHeight: `${customHeight}px`,
                minHeight: '160px',
              }
            : { height: `${defaultHeight}px`, minHeight: '160px' }),
          // 💡 [가독성 우선 리퀴드 글래스] 투명도 슬라이더는 '배경'만 조절하고 글자·아이콘은 항상 선명하게 유지
          ['--widget-card-alpha' as any]: String(Math.min(1, Math.max(0.3, widgetOpacity ?? opacity ?? 0.8))),
          ['--widget-card-blur' as any]: theme === 'glassmorphism' ? '24px' : '16px',
          // 🎨 다크모드 및 테마 연동 리퀴드 글래스 투명 배경 & 커스텀 배경색
          ...(() => {
            const alpha = Math.min(1, Math.max(0.3, widgetOpacity ?? opacity ?? 0.8));
            let calculatedBg: string;

            if (isPostIt) {
              calculatedBg = 'transparent';
            } else if (isCollapsed) {
              calculatedBg = isDark ? '#101a2d' : 'rgba(255, 255, 255, 0.9)';
            } else if (widgetCustomBg) {
              // 1. 사용자 개별 위젯 커스텀 배경색 우선 적용 (즉시 반영)
              if (widgetCustomBg.startsWith('#') && widgetCustomBg.length === 7) {
                const r = parseInt(widgetCustomBg.slice(1, 3), 16);
                const g = parseInt(widgetCustomBg.slice(3, 5), 16);
                const b = parseInt(widgetCustomBg.slice(5, 7), 16);
                calculatedBg = `rgba(${r}, ${g}, ${b}, ${alpha})`;
              } else {
                calculatedBg = widgetCustomBg;
              }
            } else if (!widgetCustomBg && (id === 'clock' || id === 'timer')) {
              // 🕒 Clock 위젯 기본 배경: 항상 모던 딥 다크/슬레이트 톤 적용
              calculatedBg = isDark ? `rgba(11, 16, 30, ${alpha})` : `rgba(15, 23, 42, ${alpha})`;
            } else if (widgetCardSolidBg) {
              calculatedBg = isDark ? '#101a2d' : (themeConfig.cardBgLight || '#ffffff');
            } else if (isDark) {
              // ✨ 프리미엄 다크 서피스: 미드나잇 블루 (#101a2d)
              calculatedBg = `rgba(16, 26, 45, ${alpha})`;
            } else {
              // 2. 라이트 모드: 테마별 고유 위젯 카드 배경색 연동 (라떼, 세이지, 오로라, 옐로우 등)
              // 테마 고유 색조는 유지하되 투명도는 슬라이더 값을 따름 (rgba 테마 색상만, 단색 테마는 유지)
              calculatedBg = themeConfig.cardBgLight ? withAlpha(themeConfig.cardBgLight, alpha) : `rgba(255, 255, 255, ${alpha})`;
            }

            return {
              backgroundColor: calculatedBg,
              ['--widget-card-bg' as any]: calculatedBg,
            };
          })(),
          borderColor: isPostIt
            ? 'transparent'
            : isDark
            ? undefined
            : themeConfig.cardBorderLight || undefined,
        }}
        onDragOver={(e) => {
          e.preventDefault();
          onDragOver?.(e, id);
        }}
        onDrop={(e) => {
          e.preventDefault();
          onDrop?.(e, id);
        }}
        className={`relative group ${radiusClass} border transition-[border-color,box-shadow,background-color] duration-150 fast-render-card video-style-widget-card flex flex-col overflow-hidden shadow-xl hover:shadow-2xl w-full h-full justify-self-stretch max-w-none ${
          isCollapsed
            ? 'bg-white/75 dark:bg-[#101a2d] border-indigo-300/60 dark:border-[#1e2c44] backdrop-blur-xs shadow-md'
            : isPostIt
            ? 'bg-transparent border-transparent shadow-none'
            : theme === 'glassmorphism'
            ? 'backdrop-blur-xl border-white/70 dark:border-white/20 shadow-2xl'
            : 'border-white/50 dark:border-[#1e2c44]'
        } ${isResizing ? 'ring-2 ring-sky-400 shadow-2xl select-none' : ''} ${
          isSmartBoard ? 'ring-2 ring-slate-400/80 font-sans' : ''
        } ${
          widgetTextContrast === 'high'
            ? 'widget-contrast-high'
            : widgetTextContrast === 'ultra'
            ? 'widget-contrast-ultra'
            : ''
        } ${widgetTextShadow ? 'widget-text-shadow' : ''} ${
          widgetCardSolidBg ? 'widget-solid-bg' : ''
        } ${getDropFeedbackClass()} ${className}`}
      >
        {/* ========================================================================= */}
        {/* HEADER DRAG BAR: 상단 드래그 이동 & 더블클릭 접기/스택 이동 핸들 (슬림화)      */}
        {/* ========================================================================= */}
        {(() => {
          const isTransparent = widgetHeaderColorMode === 'transparent';
          const isCustom = widgetHeaderColorMode === 'custom' && !!customWidgetHeaderColor;
          const headerBgStyle: React.CSSProperties = isTransparent
            ? { backgroundColor: 'transparent', backgroundImage: 'none' }
            : isCustom
            ? { backgroundColor: customWidgetHeaderColor, backgroundImage: 'none' }
            : {};

          return (
            <div
              draggable={effectiveDraggable}
              onDragStart={(e) => onDragStart?.(e, id)}
              onDragEnd={onDragEnd}
              onDoubleClick={onHeaderDoubleClick || handleToggleCollapse}
              style={headerBgStyle}
              title={
                isPinned
                  ? '📌 위젯 위치가 고정되어 있습니다 (고정 해제 후 이동 가능)'
                  : isStackMode
                  ? '더블클릭 시 사이드 덱(스택)으로 이동합니다'
                  : isCollapsed
                  ? '더블클릭 시 위젯이 원래 크기로 펼쳐집니다'
                  : '더블클릭 시 위젯이 접혀 이름만 보입니다'
              }
              className={`w-full h-3 shrink-0 ${
                isTransparent
                  ? 'bg-transparent'
                  : isCustom
                  ? ''
                  : themeConfig.stripeGradient
              } ${
                effectiveDraggable
                  ? 'cursor-grab active:cursor-grabbing hover:h-3.5'
                  : 'cursor-default opacity-85'
              } transition-all duration-200 select-none z-30 relative flex items-center justify-center cursor-pointer ${
                isCollapsed
                  ? 'opacity-100 pointer-events-auto'
                  : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'
              }`}
            >
              <div
                className={`w-12 h-1 rounded-full flex items-center justify-center shadow-2xs transition-all duration-200 ${
                  isTransparent
                    ? 'bg-slate-400/50 dark:bg-white/50 hover:bg-slate-500/70 dark:hover:bg-white/70'
                    : 'bg-white/60 dark:bg-white/60'
                } ${
                  isCollapsed
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                <GripHorizontal
                  className={`w-3 h-3 ${
                    isTransparent ? 'text-slate-600 dark:text-slate-200' : 'text-white/90'
                  }`}
                  strokeWidth={2}
                />
              </div>
            </div>
          );
        })()}

        {/* ========================================================================= */}
        {/* TOP-LEFT 둥근 캡슐형 컨트롤 바: [ ⚙️ 설정 | 📌 고정 | ⌃ 접기 | ✕ 닫기 ]       */}
        {/* 💡 [수정 요구사항]: 마우스 오버(Hover) 시에만 나타나고 평소에는 완전히 숨김        */}
        {/* ========================================================================= */}
        <div
          className={`absolute top-2.5 left-2.5 flex items-center gap-1 z-30 transition-all duration-200 ${
            isSettingsOpen || isHeightEditOpen
              ? 'opacity-100 shadow-md pointer-events-auto bg-white/95 dark:bg-slate-800/95 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-white/60 dark:border-slate-700/60'
              : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto bg-white/85 dark:bg-slate-800/85 backdrop-blur-md px-1.5 py-0.5 rounded-full shadow-sm border border-white/60 dark:border-slate-700/60'
          }`}
        >
          {/* 1. ⚙️ 설정 버튼 (헤더 아래 인라인 설정 바 토글) */}
          <button
            ref={settingsBtnRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsSettingsOpen((prev) => !prev);
            }}
            title={isSettingsOpen ? '⚙️ 설정 닫기' : '⚙️ 위젯 설정 (투명도 조절 및 전역 적용)'}
            className={`p-1 rounded-full transition cursor-pointer flex items-center justify-center ${
              isSettingsOpen
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-white/60 dark:hover:bg-slate-700/60'
            }`}
          >
            <Settings className="w-3.5 h-3.5" strokeWidth={2} />
          </button>

          {/* 2. 📌 고정/해제 버튼 (위치 이동 방지) */}
          {onTogglePin && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(id);
              }}
              title={isPinned ? '📌 위젯 고정 해제 (이동 가능)' : '📌 위젯 위치 고정 (이동 방지)'}
              className={`p-1 rounded-full transition cursor-pointer flex items-center justify-center ${
                isPinned
                  ? pinColor || 'bg-amber-400 text-slate-900 shadow-xs'
                  : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/60'
              }`}
            >
              <Pin className={`w-3.5 h-3.5 ${isPinned ? 'rotate-45' : ''}`} strokeWidth={2} />
            </button>
          )}

          {/* 2-0. ↕ 세로 크기 숫자로 입력 (자유 배치) */}
          {isFreeMode && onFreeResize && !isCollapsed && (
            <span className="relative inline-flex">
              <button
                type="button"
                data-height-btn={id}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsHeightEditOpen((v) => !v);
                }}
                title="↕ 위젯 세로 크기를 숫자로 입력해요"
                className={`h-[22px] px-1.5 rounded-full transition cursor-pointer flex items-center gap-0.5 text-[10.5px] font-black tabular-nums ${
                  isHeightEditOpen ? 'bg-indigo-500 text-white' : 'text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/60'
                }`}
              >
                ↕ {Math.round(customHeight || defaultHeight)}
              </button>
              {isHeightEditOpen && (
                <form
                  className="cl-height-edit"
                  onPointerDown={(e) => e.stopPropagation()}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const v = Number((e.currentTarget.elements.namedItem('h') as HTMLInputElement).value);
                    if (Number.isFinite(v) && v > 0) applyTypedHeight(v);
                  }}
                >
                  <span>세로</span>
                  <input
                    name="h"
                    type="number"
                    min={160}
                    max={1400}
                    step={10}
                    defaultValue={Math.round(customHeight || defaultHeight)}
                    autoFocus
                    onFocus={(e) => e.currentTarget.select()}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.stopPropagation();
                        setIsHeightEditOpen(false);
                      }
                    }}
                    data-height-input={id}
                  />
                  <span>px</span>
                  <button type="submit">확인</button>
                </form>
              )}
            </span>
          )}

          {/* 2-1. 🔖 바로가기 위젯 전용 1행 축소/확장 버튼 (PDF 1페이지 수정사항 1 반영) */}
          {onToggleCompactRow && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCompactRow();
              }}
              title={
                isCompactRow
                  ? '⤢ 위젯 원래 크기로 복원'
                  : '⤡ 바로가기 1행 축소 모드 (한 행 안에 모두 보기)'
              }
              className={`p-1 rounded-full transition cursor-pointer flex items-center justify-center ${
                isCompactRow
                  ? 'bg-cyan-500 text-white shadow-xs'
                  : 'text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/60'
              }`}
            >
              {isCompactRow ? (
                <Maximize2 className="w-3.5 h-3.5" strokeWidth={2} />
              ) : (
                <FoldHorizontal className="w-3.5 h-3.5" strokeWidth={2} />
              )}
            </button>
          )}

          {/* 3. ⌃ 접기/펼치기/스택 버튼 */}
          <button
            type="button"
            onClick={handleToggleCollapse}
            title={
              isStackMode
                ? '⌃ 클릭 시 사이드 덱(스택)으로 이동'
                : isCollapsed
                ? '⌵ 위젯 본체 펼치기'
                : '⌃ 위젯 헤더만 남기고 접기'
            }
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition cursor-pointer flex items-center justify-center"
          >
            {isCollapsed ? (
              <ChevronDown className="w-3.5 h-3.5" strokeWidth={2} />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" strokeWidth={2} />
            )}
          </button>

          {/* 보조 모니터 팝업 열기 버튼 */}
          {onOpenDualMonitor && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDualMonitor();
              }}
              title="보조 모니터 새 창 분리"
              className="p-1 rounded-full hover:bg-sky-50 dark:hover:bg-sky-950/60 text-slate-400 hover:text-sky-600 transition cursor-pointer flex items-center justify-center"
            >
              <Tv className="w-3 h-3" strokeWidth={2} />
            </button>
          )}

          {/* 4. ✕ 컴팩트 닫기 버튼 */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="위젯 닫기"
              className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 transition cursor-pointer"
            >
              <X className="w-3 h-3" strokeWidth={2} />
            </button>
          )}
        </div>

        {/* ========================================================================= */}
        {/* ⚙️ 위젯 설정 인라인 아코디언 바 (투명도 조절 & 개별 위젯 색상 커스터마이징 팔레트) */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {isSettingsOpen && !isCollapsed && (
            <motion.div
              ref={settingsPopoverRef}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="overflow-hidden border-b border-sky-200/60 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shrink-0 z-30 select-none shadow-xs px-3 py-1.5 flex flex-col gap-1.5"
            >
              {/* 1행: 투명도 조절 */}
              <div className="w-full flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 shrink-0">
                  <Sliders className="w-3.5 h-3.5 text-sky-500" strokeWidth={2} />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">투명도</span>
                  <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
                    {Math.round(widgetOpacity * 100)}%
                  </span>
                </div>

                {/* 미세 슬라이더 */}
                <div className="flex-1 max-w-[180px] flex items-center gap-1.5">
                  <span className="text-[9px] text-slate-400 font-semibold shrink-0">20%</span>
                  <input
                    type="range"
                    min="0.2"
                    max="1.0"
                    step="0.05"
                    value={widgetOpacity}
                    onChange={(e) => handleUpdateOpacity(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                  />
                  <span className="text-[9px] text-slate-400 font-semibold shrink-0">100%</span>
                </div>

                {/* 📺 유튜브 위젯 전용 미니 옵션 */}
                {id === 'youtube' && onYoutubeFoldBehaviorChange && (
                  <div className="hidden sm:flex items-center gap-1 text-[10px] shrink-0 border-l border-slate-200 dark:border-slate-700 pl-2">
                    <span className="text-slate-500 font-medium">접기:</span>
                    <button
                      type="button"
                      onClick={() => onYoutubeFoldBehaviorChange(youtubeFoldBehavior === 'mini' ? 'stack' : 'mini')}
                      className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 text-[10px]"
                    >
                      {youtubeFoldBehavior === 'mini' ? '📺 미니' : '🗂️ 스택'}
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* 모든 위젯 일괄 투명도 적용 버튼 */}
                  {onGlobalOpacityChange && (
                    <button
                      type="button"
                      onClick={handleApplyGlobalOpacity}
                      className="py-0.5 px-2 rounded-md bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/80 text-sky-600 dark:text-sky-300 font-bold text-[10px] flex items-center gap-1 transition cursor-pointer border border-sky-200/60 dark:border-sky-800/60 active:scale-95"
                      title="모든 위젯에 현재 투명도 일괄 적용"
                    >
                      <span>투명도 전체</span>
                    </button>
                  )}

                  {/* 설정 저장 버튼 */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSettingsOpen(false);
                      onShowToast?.(`✓ [${title || id}] 위젯 설정이 저장되었습니다.`);
                    }}
                    className="py-0.5 px-2.5 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-xs"
                    title="설정 저장 및 닫기"
                  >
                    <Check className="w-3 h-3" strokeWidth={2.5} />
                    <span>저장</span>
                  </button>
                </div>
              </div>

              {/* 2행: 위젯 색상 커스터마이징 팔레트 */}
              <div className="w-full flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">위젯 색상</span>
                </div>

                {/* 색상 칩 목록 & 초기화 버튼 */}
                <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto custom-scrollbar py-0.5">
                  {/* 🔄 초기화 버튼 (테마 기본 색상으로 복원) */}
                  <button
                    type="button"
                    onClick={() => {
                      handleUpdateCustomBg(null);
                      onShowToast?.(`🔄 [${title || id}] 위젯 배경색이 테마 기본값으로 초기화되었습니다.`);
                    }}
                    title="테마 기본 색상으로 되돌리기 (초기화)"
                    className={`px-2 py-0.5 rounded-md text-[10px] font-black border transition cursor-pointer flex items-center gap-1 active:scale-95 ${
                      !widgetCustomBg
                        ? 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900 border-slate-700 dark:border-slate-300 shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>초기화</span>
                  </button>

                  {[
                    { label: '화이트', color: '#ffffff', border: '#e2e8f0' },
                    { label: '레몬', color: '#fef9c3', border: '#fef08a' },
                    { label: '피치', color: '#ffedd5', border: '#fed7aa' },
                    { label: '세이지', color: '#dcfce7', border: '#bbf7d0' },
                    { label: '스카이', color: '#e0f2fe', border: '#bae6fd' },
                    { label: '라일락', color: '#f3e8ff', border: '#e9d5ff' },
                    { label: '로즈', color: '#ffe4e6', border: '#fecdd3' },
                    { label: '슬레이트', color: '#1e293b', border: '#475569' },
                  ].map((preset) => {
                    const isSelected = widgetCustomBg === preset.color;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          handleUpdateCustomBg(preset.color);
                          onShowToast?.(`🎨 [${title || id}] [${preset.label}] 색상이 적용되었습니다.`);
                        }}
                        title={`${preset.label} 색상 (${preset.color})`}
                        style={{ backgroundColor: preset.color, borderColor: preset.border }}
                        className={`w-4 h-4 rounded-full border shadow-2xs transition-transform cursor-pointer relative flex items-center justify-center ${
                          isSelected ? 'scale-125 ring-2 ring-sky-500 ring-offset-1' : 'hover:scale-110'
                        }`}
                      >
                        {isSelected && (
                          <div className={`w-1.5 h-1.5 rounded-full ${preset.color === '#1e293b' ? 'bg-white' : 'bg-slate-900'}`} />
                        )}
                      </button>
                    );
                  })}

                  {/* 커스텀 직접 선택 */}
                  <label
                    title="원하는 색상 직접 선택 (클릭 후 색상 지정)"
                    className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 overflow-hidden cursor-pointer relative flex items-center justify-center bg-gradient-to-tr from-rose-400 via-amber-300 to-sky-400 hover:scale-110 shadow-2xs"
                  >
                    <input
                      type="color"
                      value={widgetCustomBg || '#ffffff'}
                      onChange={(e) => {
                        handleUpdateCustomBg(e.target.value);
                        onShowToast?.(`🎨 [${title || id}] 위젯 색상이 변경되었습니다.`);
                      }}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    />
                  </label>
                </div>

                {/* 색상 전체 적용 버튼 */}
                <button
                  type="button"
                  onClick={handleApplyGlobalCustomBg}
                  className="py-0.5 px-2 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] shrink-0 transition cursor-pointer border border-slate-200 dark:border-slate-700 active:scale-95"
                  title="모든 위젯에 현재 배경 색상 일괄 적용"
                >
                  <span>색상 전체</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* COLLAPSED STATE TITLE BAR (위젯이 접힌 아코디언 상태: 위젯 이름만 표시)     */}
        {/* ========================================================================= */}
        {isCollapsed && (
          <div
            draggable={effectiveDraggable}
            onDragStart={(e) => onDragStart?.(e, id)}
            onDragEnd={onDragEnd}
            onDoubleClick={handleToggleCollapse}
            title="더블클릭 시 위젯이 원래 크기로 펼쳐집니다"
            className="flex-1 px-4 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-100 select-none cursor-pointer hover:bg-white/50 dark:hover:bg-slate-800/50 transition pl-24"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="font-black text-xs text-slate-800 dark:text-slate-100 truncate">
                {title || id}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50/90 dark:bg-indigo-950/80 px-2 py-0.5 rounded-full font-black border border-indigo-200/50 dark:border-indigo-800/50 shadow-2xs">
                더블클릭 시 펼치기 ⌵
              </span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* EXPANDED CONTENT: 위젯 본체 내용 (자동 스크롤 영역 보장)                   */}
        {/* 💡 [PART 2]: 리사이징 중 자식의 이벤트 가로채기 방지(pointer-events-none)  */}
        {/* 💡 [27인치 최적화]: contentZoom 배율 적용으로 큰 화면에서도 UI 시원하게 꽉 채움 */}
        {/* ========================================================================= */}
        {!isCollapsed && (
          <div
            style={contentZoom && contentZoom !== 1 ? { zoom: contentZoom } : undefined}
            className={`flex-1 w-full overflow-y-auto custom-scrollbar flex flex-col min-h-0 relative ${
              isResizing ? 'pointer-events-none select-none' : ''
            }`}
          >
            {children}
          </div>
        )}

        {/* ========================================================================= */}
        {/* RIGHT BORDER RESIZE HANDLE: 위젯 우측 테두리 전체 가로 드래그 리사이징      */}
        {/* ========================================================================= */}
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleRightBorderResizeStart(e.clientX);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            if (e.touches[0]) {
              handleRightBorderResizeStart(e.touches[0].clientX);
            }
          }}
          title="좌우로 드래그하여 위젯 너비 조절"
          className="resize-handle absolute top-0 right-0 w-2.5 h-full cursor-col-resize hover:bg-sky-400/40 active:bg-sky-500/60 transition z-20 group-hover:w-3 select-none"
        />

        {/* ========================================================================= */}
        {/* BOTTOM BORDER RESIZE HANDLE: 위젯 하단 테두리 전체 세로 드래그 리사이징      */}
        {/* ========================================================================= */}
        {!isCollapsed && (
          <div
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleBottomBorderResizeStart(e.clientY);
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              if (e.touches[0]) {
                handleBottomBorderResizeStart(e.touches[0].clientY);
              }
            }}
            title="하단 테두리를 드래그하여 위젯 높이 자연스럽게 조절"
            className="resize-handle absolute bottom-0 left-0 w-full h-2.5 cursor-row-resize hover:bg-sky-400/40 active:bg-sky-500/60 transition z-20 select-none group-hover:h-3"
          />
        )}

        {/* ========================================================================= */}
        {/* BOTTOM-RIGHT CORNER RESIZE HANDLE: 우측 하단 모서리 높이/너비 동시 조절    */}
        {/* ========================================================================= */}
        {!isCollapsed && (
          <div
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleCornerResizeStart(e.clientX, e.clientY);
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              if (e.touches[0]) {
                handleCornerResizeStart(e.touches[0].clientX, e.touches[0].clientY);
              }
            }}
            title="모서리를 드래그하여 위젯 크기 및 높이 조절"
            className="resize-handle absolute bottom-1 right-1 w-6 h-6 flex items-end justify-end p-1 select-none cursor-se-resize z-40 group/resize transition-all duration-200"
          >
            {/* 📐 미니멀 모던 사선 그립 패턴: 평소 은은하게 녹아들고 호버 시 인디고 액센트 피드백 */}
            <svg
              width="11"
              height="11"
              viewBox="0 0 11 11"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-slate-400/40 dark:text-slate-500/40 group-hover:text-slate-500/70 dark:group-hover:text-slate-400/70 group-hover/resize:!text-indigo-500 dark:group-hover/resize:!text-indigo-400 group-hover/resize:scale-115 transition-all duration-200 pointer-events-none"
            >
              <line x1="9.5" y1="2.5" x2="2.5" y2="9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="9.5" y1="5.8" x2="5.8" y2="9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="9.5" y1="9.2" x2="9.2" y2="9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        )}

        {/* 💡 [리사이징 시각 안내 뱃지]: 드래그 중 현재 컬럼 폭 실시간 표시 */}
        {isResizing && !isFreeMode && (
          <div className="absolute inset-0 bg-sky-500/10 pointer-events-none z-40 flex items-center justify-center backdrop-blur-[1px] border-2 border-sky-400 rounded-2xl animate-fade-in">
            <span className="px-3.5 py-1.5 rounded-full bg-slate-900/90 text-sky-300 font-black text-xs shadow-2xl border border-sky-400/40 flex items-center gap-1.5 backdrop-blur-md">
              <span className="text-sm">📐</span>
              <span>
                {currentSpan === 12
                  ? '전폭 12칸 (100% 한 행 전체)'
                  : currentSpan === 8
                  ? '와이드 8칸 (66% 2/3 너비)'
                  : currentSpan === 6
                  ? '와이드 6칸 (50% 2열 너비)'
                  : currentSpan === 4
                  ? '표준 4칸 (33% 3열 너비)'
                  : currentSpan === 3
                  ? '표준 3칸 (25% 4열 너비)'
                  : `${currentSpan}칸 (${Math.round((currentSpan / 12) * 100)}%)`}
              </span>
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
});
