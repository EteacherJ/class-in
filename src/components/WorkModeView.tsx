import { renderMemoText } from '../utils/memoFormat';
import React, { useState, useRef, useMemo } from 'react';
import {
  ExternalLink,
  Plus,
  Trash2,
  Image as ImageIcon,
  Heart,
  Clock,
  Briefcase,
  Phone,
  ShoppingBag,
  Info,
  Calendar,
  Sparkles,
  ArrowRight,
  ArrowDownUp,
  Maximize2,
  CheckCircle2,
  Circle,
  FileText,
  SlidersHorizontal,
  MoveUp,
  MoveDown,
  Edit2,
  FileSpreadsheet,
  Download,
  Copy,
  Upload,
  Palette,
  Eye,
  EyeOff,
  Check,
  X,
  Grid3X3,
  Wand2,
  Layers,
  LayoutGrid,
  Pin,
  StickyNote,
} from 'lucide-react';
import {
  PostItNote,
  WorkLink,
  PhotoFrameConfig,
  DailyQuoteConfig,
  SchoolMessengerItem,
  SchoolInfoTab,
  SchoolInfoContact,
  SchoolShoppingAccount,
  ClassConfig,
  Student,
  DailySchedule,
  ObservationWidgetRecord,
  ClassRole,
  Team,
  AgendaItem,
  RolePeriodInfo,
  WidgetPlacementMode,
  PostItColor,
  PostItWidgetData,
  AttendanceStatus,
  AttendanceReasonCategory,
} from '../types';
import { ResizableWidgetCard, WidgetSpan } from './ResizableWidgetCard';
import { AttendanceWidget } from './AttendanceWidget';
import { TimetableWidget } from './TimetableWidget';
import { ClassCalendarWidget } from './ClassCalendarWidget';
import { ObservationWidget } from './ObservationWidget';
import { TimerWidget } from './TimerWidget';
import { NoiseMonitorWidget } from './NoiseMonitorWidget';
import { PickerWidget } from './PickerWidget';
import { ClockWidget } from './ClockWidget';
import { SeatingWidget } from './SeatingWidget';
import { ClassRolesWidget } from './ClassRolesWidget';
import { AgendaWidget } from './AgendaWidget';
import { SchoolMealWidget } from './SchoolMealWidget';
import { DDayWidget } from './DDayWidget';
import { StageManagerStrip } from './StageManagerStrip';
import { PostItWidget } from './PostItWidget';
import { YouTubeWidget } from './YouTubeWidget';
import { MessengerNoteModal } from './MessengerNoteModal';
import { analyzeGridGaps, optimizeGridLayout } from '../utils/layoutOptimizer';
import { alignFreeWidgetsMagnet } from '../utils/magnetLayoutAligner';
import {
  initialPostItNotes,
  initialWorkLinks,
  initialPhotoFrameConfig,
  initialDailyQuoteConfig,
  initialMessengerItems,
  initialSchoolInfoTabs,
  initialPraiseConfigs,
  initialPeriodInfo,
  weeklySchedule,
} from '../data/initialData';

import { getWidgetName } from '../constants/widgetRegistry';
interface WorkModeViewProps {
  config?: ClassConfig;
  isDarkMode?: boolean;
  onExitWorkMode?: () => void;
  onSwitchToLesson?: () => void;
  onShowToast: (msg: string) => void;
  students?: Student[];
  onUpdateStudentAttendance?: (
    studentId: number,
    status: AttendanceStatus,
    reasonCategory?: AttendanceReasonCategory,
    reasonNote?: string,
    earlyPeriod?: string,
    longTermRange?: { start: string; end: string }
  ) => void;
  schedule?: DailySchedule;
  observationRecords?: ObservationWidgetRecord[];
  onAddObservationRecord?: (record: any) => void;
  onDeleteObservationRecord?: (recordId: string) => void;
  // 수업 위젯 전면 확장 props
  roles?: ClassRole[];
  onUpdateRoles?: (roles: ClassRole[]) => void;
  teams?: Team[];
  onUpdateTeams?: (teams: Team[]) => void;
  onUpdateStudents?: (students: Student[]) => void;
  onSwapStudents?: (id1: number, id2: number) => void;
  onShuffleStudents?: () => void;
  onAddTeamPoint?: (teamId: number, delta?: number) => void;
  onAddStudentPoint?: (studentId: number, delta?: number) => void;
  onOpenRankingModal?: () => void;
  periodInfo?: RolePeriodInfo;
  onOpenRolesModal?: () => void;
  onAutoAssignRoles?: () => void;
  agendas?: AgendaItem[];
  onToggleAgenda?: (id: string) => void;
  onAddAgenda?: (item: any) => void;
  onDeleteAgenda?: (id: string) => void;
  onSelectStudent?: (studentId: number) => void;
  onOpenDualMonitor?: (type: any) => void;
}

export type WorkWidgetId =
  | 'quote'
  | 'links'
  | 'postIt'
  | 'messenger'
  | 'photo'
  | 'schoolInfo'
  | 'attendance'
  | 'timetable'
  | 'calendar'
  | 'observation'
  | 'drafting'
  | 'timer'
  | 'noise'
  | 'picker'
  | 'clock'
  | 'seating'
  | 'roles'
  | 'agenda'
  | 'meal'
  | 'dday'
  | 'youtube';

interface WidgetMeta {
  id: WorkWidgetId;
  name: string;
  icon: string;
  defaultCol: 'full' | 'half';
}

const WIDGET_METAS: WidgetMeta[] = [
  { id: 'quote', name: getWidgetName('quote'), icon: '📖', defaultCol: 'half' },
  { id: 'links', name: getWidgetName('links'), icon: '🔗', defaultCol: 'half' },
  { id: 'postIt', name: getWidgetName('postIt'), icon: '📌', defaultCol: 'half' },
  { id: 'messenger', name: getWidgetName('messenger'), icon: '✉️', defaultCol: 'half' },
  { id: 'photo', name: getWidgetName('photo'), icon: '🖼️', defaultCol: 'half' },
  { id: 'schoolInfo', name: getWidgetName('schoolInfo'), icon: '🏫', defaultCol: 'half' },
  { id: 'attendance', name: getWidgetName('attendance'), icon: '📋', defaultCol: 'half' },
  { id: 'timetable', name: getWidgetName('timetable'), icon: '📅', defaultCol: 'half' },
  { id: 'calendar', name: getWidgetName('calendar'), icon: '🗓️', defaultCol: 'half' },
  { id: 'observation', name: getWidgetName('observation'), icon: '📝', defaultCol: 'half' },
  { id: 'drafting', name: getWidgetName('drafting'), icon: '📑', defaultCol: 'half' },
  { id: 'timer', name: getWidgetName('timer'), icon: '⏱️', defaultCol: 'half' },
  { id: 'noise', name: getWidgetName('noise'), icon: '🔊', defaultCol: 'half' },
  { id: 'picker', name: getWidgetName('picker'), icon: '🎲', defaultCol: 'half' },
  { id: 'clock', name: getWidgetName('clock'), icon: '⏰', defaultCol: 'half' },
  { id: 'seating', name: getWidgetName('seating'), icon: '🪑', defaultCol: 'half' },
  { id: 'roles', name: getWidgetName('roles'), icon: '👥', defaultCol: 'half' },
  { id: 'agenda', name: getWidgetName('agenda'), icon: '📌', defaultCol: 'half' },
  { id: 'meal', name: getWidgetName('meal'), icon: '🍚', defaultCol: 'half' },
  { id: 'dday', name: getWidgetName('dday'), icon: '🎯', defaultCol: 'half' },
  { id: 'youtube', name: getWidgetName('youtube'), icon: '▶️', defaultCol: 'half' },
];

export const WorkModeView: React.FC<WorkModeViewProps> = ({
  config,
  isDarkMode = false,
  onExitWorkMode,
  onSwitchToLesson,
  onShowToast,
  students = [],
  onUpdateStudentAttendance,
  schedule,
  observationRecords = [],
  onAddObservationRecord,
  onDeleteObservationRecord,
  roles = [],
  onUpdateRoles,
  teams = [],
  onUpdateTeams,
  onUpdateStudents,
  onSwapStudents,
  onShuffleStudents,
  onAddTeamPoint,
  onAddStudentPoint,
  onOpenRankingModal,
  periodInfo,
  onOpenRolesModal,
  onAutoAssignRoles,
  agendas = [],
  onToggleAgenda,
  onAddAgenda,
  onDeleteAgenda,
  onSelectStudent,
  onOpenDualMonitor,
}) => {
  const handleExit = onSwitchToLesson || onExitWorkMode || (() => {});

  // 1. Widget Customization State (요구사항 4)
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState<WorkWidgetId[]>(() => {
    try {
      const saved = localStorage.getItem('work_board_widget_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        // 누락된 신규 위젯이 있으면 뒤에 추가
        const allIds: WorkWidgetId[] = [
          'quote',
          'links',
          'postIt',
          'messenger',
          'photo',
          'schoolInfo',
          'attendance',
          'timetable',
          'calendar',
          'observation',
          'drafting',
          'timer',
          'noise',
          'picker',
          'clock',
          'seating',
          'roles',
          'agenda',
          'meal',
          'dday',
          'youtube',
        ];
        const missing = allIds.filter((id) => !parsed.includes(id));
        const merged = [...parsed, ...missing];
        localStorage.setItem('work_board_widget_order', JSON.stringify(merged));
        return merged;
      }
    } catch {}
    return [
      'quote',
      'links',
      'postIt',
      'messenger',
      'photo',
      'schoolInfo',
      'attendance',
      'timetable',
      'calendar',
      'observation',
      'drafting',
      'timer',
      'noise',
      'picker',
      'clock',
      'seating',
      'roles',
      'agenda',
      'meal',
      'dday',
    ];
  });
  const [widgetVisibility, setWidgetVisibility] = useState<Record<WorkWidgetId, boolean>>(() => {
    try {
      const saved = localStorage.getItem('work_board_widget_visibility');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      quote: true,
      links: true,
      postIt: true,
      messenger: true,
      photo: true,
      schoolInfo: true,
      attendance: false,
      timetable: false,
      calendar: false,
      observation: false,
      drafting: false,
      timer: false,
      noise: false,
      picker: false,
      clock: false,
      seating: false,
      roles: false,
      agenda: false,
      meal: false,
      dday: false,
    };
  });
  // 6-Division Widget Spans (1 to 6 columns in a 6-division grid)
  const [widgetSpans, setWidgetSpans] = useState<Record<WorkWidgetId, 1 | 2 | 3 | 4 | 6>>(() => {
    try {
      const saved = localStorage.getItem('work_board_widget_spans');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      quote: 2,
      links: 4,
      postIt: 3,
      messenger: 3,
      photo: 2,
      schoolInfo: 4,
      attendance: 3,
      timetable: 3,
      calendar: 3,
      observation: 3,
      drafting: 3,
      timer: 2,
      noise: 2,
      picker: 2,
      clock: 2,
      seating: 3,
      roles: 3,
      agenda: 3,
      meal: 3,
      dday: 3,
    };
  });
  const [show6GridGuides, setShow6GridGuides] = useState(false);

  // =========================================================================
  // [위젯 고정(Pin) 기능 상태 및 색상 매핑]
  // =========================================================================
  const [pinnedWidgetIds, setPinnedWidgetIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('work_board_pinned_widgets');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const getWidgetPinColor = (id: string): string => {
    switch (id) {
      case 'quote': return 'rose';
      case 'links': return 'sky';
      case 'postIt': return 'amber';
      case 'messenger': return 'indigo';
      case 'photo': return 'purple';
      case 'schoolInfo': return 'teal';
      case 'attendance': return 'teal';
      case 'timetable': return 'indigo';
      case 'calendar': return 'orange';
      case 'observation': return 'violet';
      case 'drafting': return 'slate';
      case 'timer': return 'emerald';
      case 'noise': return 'amber';
      case 'picker': return 'purple';
      case 'clock': return 'sky';
      case 'seating': return 'blue';
      case 'roles': return 'pink';
      case 'agenda': return 'rose';
      case 'meal': return 'cyan';
      case 'dday': return 'red';
      case 'youtube': return 'red';
      default: return 'amber';
    }
  };

  const handleTogglePinWidget = (widgetId: string) => {
    setPinnedWidgetIds((prev) => {
      const isPinned = prev.includes(widgetId);
      const next = isPinned ? prev.filter((id) => id !== widgetId) : [...prev, widgetId];
      try {
        localStorage.setItem('work_board_pinned_widgets', JSON.stringify(next));
      } catch {}
      const meta = WIDGET_METAS.find((m) => m.id === widgetId);
      const title = meta?.name || widgetId;
      if (!isPinned) {
        onShowToast(`📌 [${title}] 위젯이 고정되었습니다. (드래그 이동 방지)`);
      } else {
        onShowToast(`🔓 [${title}] 위젯 고정이 해제되었습니다.`);
      }
      return next;
    });
  };

  // =========================================================================
  // [iOS Stage Manager 연동 접힌 위젯 상태 및 액션 핸들러]
  // =========================================================================
  const [collapsedWidgetIds, setCollapsedWidgetIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('work_board_collapsed_widgets');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const handleToggleWidgetCollapse = (widgetId: string) => {
    setCollapsedWidgetIds((prev) => {
      const isCollapsed = prev.includes(widgetId);
      const next = isCollapsed ? prev.filter((id) => id !== widgetId) : [...prev, widgetId];
      try {
        localStorage.setItem('work_board_collapsed_widgets', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleExpandWidgetFromStage = (widgetId: string) => {
    setCollapsedWidgetIds((prev) => {
      const next = prev.filter((id) => id !== widgetId);
      try {
        localStorage.setItem('work_board_collapsed_widgets', JSON.stringify(next));
      } catch {}
      return next;
    });
    setWidgetOrder((prev) => {
      const filtered = prev.filter((id) => id !== (widgetId as WorkWidgetId));
      const next = [widgetId as WorkWidgetId, ...filtered];
      try {
        localStorage.setItem('work_board_widget_order', JSON.stringify(next));
      } catch {}
      return next;
    });
    const meta = WIDGET_METAS.find((m) => m.id === widgetId);
    onShowToast(`📱 [${meta?.name || widgetId}] 위젯이 작업 공간으로 스르륵 펼쳐졌습니다.`);
  };

  // =========================================================================
  // [자유 이동(Free-move) 캔버스 및 6분할 전환 상태]
  // =========================================================================
  const [layoutMode, setLayoutMode] = useState<WidgetPlacementMode>(() => {
    return (localStorage.getItem('work_board_placement_mode') as WidgetPlacementMode) || 'grid';
  });

  const freeCanvasRef = useRef<HTMLDivElement | null>(null);
  const [freeWidgetPositions, setFreeWidgetPositions] = useState<Record<string, { x: number; y: number; width?: number; height?: number }>>(() => {
    try {
      const saved = localStorage.getItem('work_board_free_positions');
      if (saved) return JSON.parse(saved);
    } catch {}
    const initialPos: Record<string, { x: number; y: number; width?: number; height?: number }> = {};
    WIDGET_METAS.forEach((m, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      initialPos[m.id] = {
        x: 20 + col * 395,
        y: 20 + row * 365,
        width: 380,
      };
    });
    return initialPos;
  });

  const [activeZIndexMap, setActiveZIndexMap] = useState<Record<string, number>>({});
  const [activeDraggingWidgetId, setActiveDraggingWidgetId] = useState<string | null>(null);

  // 실시간 1:1 윈도우 창 드래깅 핸들러 (수업보드와 완전 동일)
  const handleFreeWindowPointerDown = (e: React.PointerEvent, widgetId: string) => {
    if (pinnedWidgetIds.includes(widgetId)) {
      const meta = WIDGET_METAS.find((m) => m.id === widgetId);
      onShowToast(`📌 [${meta?.name || widgetId}] 위젯이 고정되어 있어 이동할 수 없습니다. 상단 핀을 눌러 고정을 해제하세요.`);
      return;
    }

    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('textarea') ||
      target.isContentEditable ||
      target.closest('[contenteditable="true"]') ||
      target.closest('.no-drag')
    ) {
      return;
    }

    e.preventDefault();
    setActiveDraggingWidgetId(widgetId);

    setActiveZIndexMap((prev) => ({
      ...prev,
      [widgetId]: Math.max(...Object.values(prev), 10) + 1,
    }));

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const currentPos = freeWidgetPositions[widgetId] || { x: 20, y: 20, width: 380 };
    const initialX = currentPos.x;
    const initialY = currentPos.y;

    const handlePointerMove = (moveEv: PointerEvent) => {
      const deltaX = moveEv.clientX - startClientX;
      const deltaY = moveEv.clientY - startClientY;
      const newX = Math.max(10, initialX + deltaX);
      const newY = Math.max(10, initialY + deltaY);

      setFreeWidgetPositions((prev) => ({
        ...prev,
        [widgetId]: {
          ...(prev[widgetId] || { width: 380 }),
          x: newX,
          y: newY,
        },
      }));
    };

    const handlePointerUp = () => {
      setActiveDraggingWidgetId(null);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      setFreeWidgetPositions((latest) => {
        try {
          localStorage.setItem('work_board_free_positions', JSON.stringify(latest));
        } catch {}
        return latest;
      });
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // 자유 이동 캔버스: 스마트 비율 자석 정렬 & 공간 채움
  const handleFreeCanvasMinGapAlign = () => {
    const visibleIds = widgetOrder.filter((id) => widgetVisibility[id]);
    if (visibleIds.length === 0) return;

    const canvasWidth = freeCanvasRef.current ? freeCanvasRef.current.clientWidth : 1200;

    const result = alignFreeWidgetsMagnet({
      activeWidgetIds: visibleIds,
      positions: freeWidgetPositions,
      canvasWidth,
      paddingX: 16,
      paddingY: 16,
      gap: 16, // 고정 간격 16px
      minWidgetWidth: 260,
    });

    setFreeWidgetPositions(result.newPositions);
    try {
      localStorage.setItem('work_board_free_positions', JSON.stringify(result.newPositions));
    } catch {}
    onShowToast(`🧲 ${result.summary}`);
  };

  // 자유 이동 모드 전용 위젯 너비 및 높이 리사이징 핸들러
  const handleFreeResizeWidget = (widgetId: string, width: number, height: number) => {
    setFreeWidgetPositions((prev) => {
      const updated = {
        ...prev,
        [widgetId]: {
          ...(prev[widgetId] || { x: 20, y: 20 }),
          width: Math.round(width),
          height: Math.round(height),
        },
      };
      try {
        localStorage.setItem('work_board_free_positions', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // 캔버스 드롭 처리
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const widgetId = (draggedWidgetId || e.dataTransfer.getData('text/plain')) as WorkWidgetId;
    if (!widgetId || !freeCanvasRef.current) return;

    const canvasRect = freeCanvasRef.current.getBoundingClientRect();
    const rawX = e.clientX - canvasRect.left;
    const rawY = e.clientY - canvasRect.top;

    const newX = Math.max(10, Math.round(rawX - 180));
    const newY = Math.max(10, Math.round(rawY - 20));

    setFreeWidgetPositions((prev) => {
      const updated = {
        ...prev,
        [widgetId]: {
          ...(prev[widgetId] || { width: 380 }),
          x: newX,
          y: newY,
        },
      };
      try {
        localStorage.setItem('work_board_free_positions', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setActiveZIndexMap((prev) => ({
      ...prev,
      [widgetId]: Math.max(...Object.values(prev), 10) + 1,
    }));

    handleDragEnd();
    const meta = WIDGET_METAS.find((m) => m.id === widgetId);
    onShowToast(`📍 [${meta?.name || widgetId}] 위젯이 지정한 위치로 이동되었습니다.`);
  };

  // Drag and Drop State (수업보드와 100% 동일한 상하/좌우 이동 및 하단 도킹 지원)
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [dragOverWidgetId, setDragOverWidgetId] = useState<string | null>(null);
  const [dockOverTargetId, setDockOverTargetId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (pinnedWidgetIds.includes(id)) {
      e.preventDefault();
      const meta = WIDGET_METAS.find((m) => m.id === id);
      onShowToast(`📌 [${meta?.name || id}] 위젯이 고정되어 있어 이동할 수 없습니다. 상단 핀을 눌러 고정을 해제하세요.`);
      return;
    }

    setDraggedWidgetId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverWidgetId !== id) {
      setDragOverWidgetId(id);
    }
  };

  const handleDragEnd = () => {
    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
    setDockOverTargetId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = (draggedWidgetId || e.dataTransfer.getData('text/plain')) as WorkWidgetId;
    if (!sourceId) {
      handleDragEnd();
      return;
    }

    // 1. 하단 도킹 (Dock bottom)
    if (targetId.startsWith('dock-bottom-')) {
      const parentWidgetId = targetId.replace('dock-bottom-', '') as WorkWidgetId;
      if (parentWidgetId === sourceId) {
        handleDragEnd();
        return;
      }
      const parentSpan = widgetSpans[parentWidgetId] || 2;
      const updatedSpans = { ...widgetSpans, [sourceId]: parentSpan };
      setWidgetSpans(updatedSpans);
      localStorage.setItem('work_board_widget_spans', JSON.stringify(updatedSpans));

      const list = [...widgetOrder.filter((id) => id !== sourceId)];
      const parentIdx = list.indexOf(parentWidgetId);
      if (parentIdx !== -1) {
        list.splice(parentIdx + 1, 0, sourceId);
      } else {
        list.push(sourceId);
      }
      setWidgetOrder(list);
      localStorage.setItem('work_board_widget_order', JSON.stringify(list));
      handleDragEnd();
      const sName = WIDGET_METAS.find((m) => m.id === sourceId)?.name || sourceId;
      const pName = WIDGET_METAS.find((m) => m.id === parentWidgetId)?.name || parentWidgetId;
      onShowToast(`🧲 [${sName}] 위젯이 [${pName}] 바로 아래로 도킹되었습니다! (가로 ${parentSpan}칸 자동 동기화)`);
      return;
    }

    // 2. 상하/좌우 이동 (위치 스왑)
    let newOrderList: WorkWidgetId[] = [];
    if (targetId === '__bottom_drop_target__') {
      newOrderList = [...widgetOrder.filter((id) => id !== sourceId), sourceId];
    } else if (sourceId !== targetId) {
      const list = [...widgetOrder];
      const srcIdx = list.indexOf(sourceId);
      if (srcIdx !== -1) list.splice(srcIdx, 1);
      const tgtIdx = list.indexOf(targetId as WorkWidgetId);
      if (tgtIdx !== -1) {
        list.splice(tgtIdx, 0, sourceId);
      } else {
        list.push(sourceId);
      }
      newOrderList = list;
    } else {
      handleDragEnd();
      return;
    }

    handleDragEnd();
    setWidgetOrder(newOrderList);
    localStorage.setItem('work_board_widget_order', JSON.stringify(newOrderList));
    const sName = WIDGET_METAS.find((m) => m.id === sourceId)?.name || sourceId;
    onShowToast(`✨ [${sName}] 위젯 위치가 자석처럼 깔끔하게 이동되었습니다.`);
  };

  const setWidgetSpan = (id: WorkWidgetId, span: WidgetSpan) => {
    setWidgetSpans((prev) => {
      const updated = { ...prev, [id]: span };
      localStorage.setItem('work_board_widget_spans', JSON.stringify(updated));
      return updated;
    });
    onShowToast(`📐 [${WIDGET_METAS.find((m) => m.id === id)?.name || id}] 크기가 6분할 중 ${span}칸으로 조절되었습니다.`);
  };

  // 업무보드 6분할 빈 공간(Gap) 실시간 분석
  const workGridAnalysis = useMemo(() => {
    const hiddenIds = Object.entries(widgetVisibility)
      .filter(([_, visible]) => !visible)
      .map(([k]) => k);
    return analyzeGridGaps(widgetOrder, widgetSpans as Record<string, WidgetSpan>, hiddenIds, 6);
  }, [widgetOrder, widgetSpans, widgetVisibility]);

  // 스마트 레이아웃 최적화: 스택된 위젯은 그대로 두고, 화면 위젯만 기본 크기로 여백 없이 자동 정렬
  const handleSmartOptimizeWorkGrid = () => {
    // 스택(접힘)된 위젯과 숨김 위젯을 제외한, 화면 노출 활성 위젯들만 정렬 대상으로 추출
    const activeVisibleIds = widgetOrder.filter(
      (id) => widgetVisibility[id] && !collapsedWidgetIds.includes(id)
    );

    if (activeVisibleIds.length === 0) {
      onShowToast('⚠️ 화면에 정렬할 활성 위젯이 없습니다. (모든 위젯이 스택에 있거나 숨겨져 있습니다)');
      return;
    }

    // A. 자유 이동(Freeform) 캔버스 모드에서의 스마트 최적화
    if (layoutMode === 'freeform') {
      const canvasWidth = freeCanvasRef.current ? freeCanvasRef.current.clientWidth - 48 : 1200;
      const widgetW = 380;
      const widgetH = 520;
      const gapX = 20;
      const gapY = 20;
      const startX = 24;
      const startY = 24;
      const cols = Math.max(1, Math.floor((canvasWidth + gapX) / (widgetW + gapX)));

      const newPositions = { ...freeWidgetPositions };
      activeVisibleIds.forEach((id, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        newPositions[id] = {
          x: startX + col * (widgetW + gapX),
          y: startY + row * (widgetH + gapY),
          width: widgetW,
          height: widgetH,
        };
      });

      setFreeWidgetPositions(newPositions);
      try {
        localStorage.setItem('work_board_free_positions', JSON.stringify(newPositions));
      } catch {}
      onShowToast('🪄 자유모드 스마트 최적화: 스택 위젯은 유지하고, 화면 위젯들을 기본 크기(380x520)로 빈틈없이 정렬했습니다.');
      return;
    }

    // B. 6분할 반응형 그리드(Grid) 모드에서의 스마트 최적화
    // 모든 화면 위젯을 기본 규격(span 2, 높이 520px)으로 맞추고 잔여 공간 없이 꽉 채움
    const count = activeVisibleIds.length;
    const newSpans = { ...widgetSpans } as Record<WorkWidgetId, 1 | 2 | 3 | 4 | 6>;

    if (count === 1) {
      newSpans[activeVisibleIds[0]] = 6;
    } else if (count === 2) {
      newSpans[activeVisibleIds[0]] = 3;
      newSpans[activeVisibleIds[1]] = 3;
    } else {
      // 기본 크기 span 2 (한 행에 3개씩 2+2+2=6)
      activeVisibleIds.forEach((id) => {
        newSpans[id] = 2;
      });
      const remainder = count % 3;
      if (remainder === 1) {
        // 마지막 1개 남으면 6분할 전폭으로 꽉 채움
        newSpans[activeVisibleIds[count - 1]] = 6;
      } else if (remainder === 2) {
        // 마지막 2개 남으면 각각 3분할(3+3=6)로 꽉 채움
        newSpans[activeVisibleIds[count - 1]] = 3;
        newSpans[activeVisibleIds[count - 2]] = 3;
      }
    }

    const newOrder = [
      ...activeVisibleIds,
      ...widgetOrder.filter((id) => !activeVisibleIds.includes(id)),
    ] as WorkWidgetId[];

    setWidgetOrder(newOrder);
    setWidgetSpans(newSpans);
    try {
      localStorage.setItem('work_board_widget_order', JSON.stringify(newOrder));
      localStorage.setItem('work_board_widget_spans', JSON.stringify(newSpans));
    } catch {}
    onShowToast('🪄 격자모드 스마트 최적화: 스택 위젯은 유지하고, 화면 위젯들을 기본 크기로 6분할 그리드에 여백 없이 꽉 채웠습니다.');
  };

  // 자석 버튼: 흩어진 위젯이 빈 공간 없이 채워지도록 밀착 정렬 (선생님 요청사항)
  const handleAutoAlign6Grid = () => {
    if (layoutMode === 'freeform') {
      handleFreeCanvasMinGapAlign();
      return;
    }

    const hiddenIds = Object.entries(widgetVisibility)
      .filter(([_, visible]) => !visible)
      .map(([k]) => k);

    const activeVisibleIds = widgetOrder.filter(
      (id) => widgetVisibility[id] && !collapsedWidgetIds.includes(id)
    );

    const opt = optimizeGridLayout(
      activeVisibleIds,
      widgetSpans as Record<string, WidgetSpan>,
      hiddenIds,
      6
    );

    const newOrder = [
      ...opt.newOrder,
      ...widgetOrder.filter((id) => !opt.newOrder.includes(id)),
    ] as WorkWidgetId[];

    setWidgetOrder(newOrder);
    setWidgetSpans(opt.newSpans as Record<WorkWidgetId, 1 | 2 | 3 | 4 | 6>);
    try {
      localStorage.setItem('work_board_widget_order', JSON.stringify(newOrder));
      localStorage.setItem('work_board_widget_spans', JSON.stringify(opt.newSpans));
    } catch {}
    onShowToast('🧲 자석 밀착 정렬 완료: 흩어진 위젯들이 빈 공간 없이 착착 채워졌습니다.');
  };

  const getSpanClass = (span: 1 | 2 | 3 | 4 | 6) => {
    switch (span) {
      case 1:
        return 'col-span-1 md:col-span-1 lg:col-span-1';
      case 2:
        return 'col-span-1 md:col-span-2 lg:col-span-2';
      case 3:
        return 'col-span-1 md:col-span-2 lg:col-span-3';
      case 4:
        return 'col-span-1 md:col-span-2 lg:col-span-4';
      case 6:
      default:
        return 'col-span-full';
    }
  };

  // 2. Post-it notes state
  const [postIts, setPostIts] = useState<PostItNote[]>(initialPostItNotes);
  const [postItSort, setPostItSort] = useState<'newest' | 'oldest'>('newest');
  const [newPostItText, setNewPostItText] = useState('');
  const [newPostItColor, setNewPostItColor] = useState('bg-amber-100 border-amber-300 text-amber-950');

  // 3. Work Links state & modal (요구사항 5)
  const [links, setLinks] = useState<WorkLink[]>(initialWorkLinks);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [linkFormTitle, setLinkFormTitle] = useState('');
  const [linkFormUrl, setLinkFormUrl] = useState('');
  const [linkFormIconUrl, setLinkFormIconUrl] = useState('');

  // 4. Photo Frame state & customization (요구사항 8)
  const [photoConfig, setPhotoConfig] = useState<PhotoFrameConfig>({
    ...initialPhotoFrameConfig,
    frameStyle: 'wood',
    frameColor: '#854d0e',
    borderWidth: 8,
  });
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 5. Daily Quote state
  const [quoteConfig, setQuoteConfig] = useState<DailyQuoteConfig>(initialDailyQuoteConfig);
  const [quoteIdx, setQuoteIdx] = useState(0);

  // 6. Messenger Memos state & deadline toggle & statistics modal (요구사항 6)
  const [memos, setMemos] = useState<SchoolMessengerItem[]>(initialMessengerItems);
  const [newMemoSender, setNewMemoSender] = useState('');
  const [newMemoContent, setNewMemoContent] = useState('');
  const [newMemoDeadline, setNewMemoDeadline] = useState('');
  const [newMemoUseDeadline, setNewMemoUseDeadline] = useState(true);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isMessengerNoteModalOpen, setIsMessengerNoteModalOpen] = useState(false);

  // 7. School Info Tabs state & modal (요구사항 7)
  const [tabs, setTabs] = useState<SchoolInfoTab[]>(initialSchoolInfoTabs);
  const [activeTabId, setActiveTabId] = useState<string>('tab-info');
  const [isEditingSchoolInfo, setIsEditingSchoolInfo] = useState(false);
  const [newContactLabel, setNewContactLabel] = useState('');
  const [newContactNumber, setNewContactNumber] = useState('');
  const [newContactAddress, setNewContactAddress] = useState('');
  const [newMallName, setNewMallName] = useState('');
  const [newMallUrl, setNewMallUrl] = useState('');
  const [newMallUsername, setNewMallUsername] = useState('');
  const [newMallPassword, setNewMallPassword] = useState('');
  const [customTabContent, setCustomTabContent] = useState(tabs.find((t) => t.type === 'custom')?.customText || '');

  // --- Handlers: Post-It ---
  const handleAddPostIt = () => {
    if (!newPostItText.trim()) return;
    const newNote: PostItNote = {
      id: `p-${Date.now()}`,
      text: newPostItText.trim(),
      color: newPostItColor,
      fontFamily: 'sans-serif',
      fontSize: 'md',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setPostIts([newNote, ...postIts]);
    setNewPostItText('');
    onShowToast('📌 새 포스트잇 메모가 추가되었습니다.');
  };

  const handleDeletePostIt = (id: string) => {
    setPostIts(postIts.filter((p) => p.id !== id));
    onShowToast('🗑️ 메모가 삭제되었습니다.');
  };

  const sortedPostIts = [...postIts].sort((a, b) => {
    return postItSort === 'newest' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt;
  });

  // --- Handlers: Work Links (요구사항 5) ---
  const handleOpenAddLink = () => {
    setEditingLinkId(null);
    setLinkFormTitle('');
    setLinkFormUrl('https://');
    setLinkFormIconUrl('');
    setIsLinkModalOpen(true);
  };

  const handleOpenEditLink = (lnk: WorkLink, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingLinkId(lnk.id);
    setLinkFormTitle(lnk.title);
    setLinkFormUrl(lnk.url);
    setLinkFormIconUrl(lnk.iconImageUrl || '');
    setIsLinkModalOpen(true);
  };

  const handleSaveLink = () => {
    if (!linkFormTitle.trim() || !linkFormUrl.trim()) {
      onShowToast('⚠️ 바로가기 명칭과 URL 주소를 모두 입력해주세요.');
      return;
    }

    if (editingLinkId) {
      setLinks(
        links.map((l) =>
          l.id === editingLinkId
            ? {
                ...l,
                title: linkFormTitle.trim(),
                url: linkFormUrl.trim(),
                iconImageUrl: linkFormIconUrl.trim() || undefined,
              }
            : l
        )
      );
      onShowToast(`✏️ 바로가기 '${linkFormTitle}' 정보가 수정되었습니다.`);
    } else {
      const colors = ['bg-indigo-600', 'bg-emerald-600', 'bg-blue-600', 'bg-purple-600', 'bg-amber-600', 'bg-rose-600'];
      const newLnk: WorkLink = {
        id: `lnk-${Date.now()}`,
        title: linkFormTitle.trim(),
        url: linkFormUrl.trim(),
        iconName: 'ExternalLink',
        color: colors[links.length % colors.length],
        iconImageUrl: linkFormIconUrl.trim() || undefined,
      };
      setLinks([...links, newLnk]);
      onShowToast(`✨ 새 바로가기 '${linkFormTitle}' 사이트가 추가되었습니다.`);
    }

    setIsLinkModalOpen(false);
  };

  const handleDeleteLink = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLinks(links.filter((l) => l.id !== id));
    onShowToast('🗑️ 바로가기 사이트가 삭제되었습니다.');
  };

  // --- Handlers: School Messenger & Statistics (요구사항 6) ---
  const handleAddMemo = () => {
    if (!newMemoContent.trim()) {
      onShowToast('⚠️ 쪽지 주요 업무 내용을 입력해주세요.');
      return;
    }
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newMemo: SchoolMessengerItem = {
      id: `m-${Date.now()}`,
      sender: newMemoSender.trim() || '교무실',
      content: newMemoContent.trim(),
      deadline: newMemoUseDeadline ? newMemoDeadline : '',
      useDeadline: newMemoUseDeadline,
      completed: false,
      createdAt: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${timeStr}`,
    };
    setMemos([newMemo, ...memos]);
    setNewMemoSender('');
    setNewMemoContent('');
    setNewMemoDeadline('');
    onShowToast('✉️ 학교 메신저 쪽지가 등록되었습니다.');
  };

  const toggleMemoCompleted = (id: string) => {
    setMemos(
      memos.map((m) => (m.id === id ? { ...m, completed: !m.completed } : m))
    );
  };

  const toggleMemoDeadlineUsage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMemos(
      memos.map((m) =>
        m.id === id ? { ...m, useDeadline: !m.useDeadline } : m
      )
    );
    onShowToast('마감일 사용 여부가 변경되었습니다.');
  };

  const handleDeleteMemo = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMemos(memos.filter((m) => m.id !== id));
    onShowToast('🗑️ 쪽지가 삭제되었습니다.');
  };

  // Monthly breakdown for Google Sheets & Statistics
  const getMonthlyStats = () => {
    const monthsMap = new Map<string, SchoolMessengerItem[]>();
    memos.forEach((memo) => {
      const dateKey = memo.createdAt.substring(0, 7) || '2026-03';
      if (!monthsMap.has(dateKey)) {
        monthsMap.set(dateKey, []);
      }
      monthsMap.get(dateKey)!.push(memo);
    });

    return Array.from(monthsMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  };

  const copyGoogleSheetsData = () => {
    const header = '등록월\t등록일시\t발신처\t업무 내용\t마감일 지정\t마감일시\t완료 여부';
    const rows = memos.map((m) => {
      const month = m.createdAt.substring(0, 7);
      const deadlineText = m.useDeadline ? (m.deadline ? m.deadline.replace('T', ' ') : '마감일 미지정') : '마감일 없음(미사용)';
      const status = m.completed ? '완료' : '진행중';
      return `${month}\t${m.createdAt}\t${m.sender}\t"${m.content.replace(/"/g, '""')}"\t${m.useDeadline ? '사용' : '미사용'}\t${deadlineText}\t${status}`;
    });

    const tsv = [header, ...rows].join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
      onShowToast('📋 구글 스프레드시트용 데이터가 클립보드에 복사되었습니다. 시트에서 Ctrl+V 하세요!');
    });
  };

  const downloadMonthlyCSV = () => {
    const header = '등록월,등록일시,발신처,업무 내용,마감일지정,마감일시,완료여부';
    const rows = memos.map((m) => {
      const month = m.createdAt.substring(0, 7);
      const deadlineText = m.useDeadline ? (m.deadline ? m.deadline.replace('T', ' ') : '미지정') : '마감일 없음';
      const status = m.completed ? '완료' : '진행중';
      return `"${month}","${m.createdAt}","${m.sender}","${m.content.replace(/"/g, '""')}","${m.useDeadline ? '사용' : '미사용'}","${deadlineText}","${status}"`;
    });

    const csvContent = '\uFEFF' + [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `학교메신저_쪽지정리_월별통계_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('📥 월별 쪽지 정리 CSV 파일이 다운로드되었습니다.');
  };

  // --- Handlers: Photo Frame (요구사항 8) ---
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setPhotoConfig((prev) => ({ ...prev, imageUrl: result }));
        onShowToast('📷 사진 파일이 액자에 성공적으로 적용되었습니다.');
      }
    };
    reader.readAsDataURL(file);
  };

  // Get frame styling based on style selection
  const getFrameStyling = () => {
    switch (photoConfig.frameStyle) {
      case 'polaroid':
        return 'bg-white p-4 pb-8 rounded-lg shadow-xl border border-slate-200';
      case 'gold':
        return 'bg-gradient-to-br from-amber-200 via-amber-400 to-yellow-600 p-4 rounded-2xl shadow-xl border-4 border-amber-500/80';
      case 'pastel':
        return 'bg-gradient-to-br from-rose-100 via-amber-100 to-pink-100 p-4 rounded-3xl shadow-lg border-4 border-rose-200/80';
      case 'minimal':
        return 'bg-slate-900 p-3 rounded-2xl shadow-lg border-2 border-slate-700';
      case 'wood':
      default:
        return 'bg-[#5c3a21] p-4 rounded-2xl shadow-2xl border-4 border-[#3d2413]';
    }
  };

  // --- Handlers: School Info & Shopping accounts (요구사항 7) ---
  const handleAddContact = () => {
    if (!newContactLabel.trim() || (!newContactNumber.trim() && !newContactAddress.trim())) {
      onShowToast('⚠️ 연락처 명칭과 전화번호를 모두 입력해주세요.');
      return;
    }
    const newC: SchoolInfoContact = {
      id: `c-${Date.now()}`,
      label: newContactLabel.trim(),
      number: newContactNumber.trim(),
      ...(newContactAddress.trim() ? { address: newContactAddress.trim() } : {}),
    };
    setTabs(
      tabs.map((t) =>
        t.type === 'info'
          ? { ...t, contacts: [...(t.contacts || []), newC] }
          : t
      )
    );
    setNewContactLabel('');
    setNewContactNumber('');
    setNewContactAddress('');
    onShowToast('📞 새 교내 연락처가 등록되었습니다.');
  };

  const handleDeleteContact = (contactId: string) => {
    setTabs(
      tabs.map((t) =>
        t.type === 'info'
          ? { ...t, contacts: (t.contacts || []).filter((c) => c.id !== contactId) }
          : t
      )
    );
    onShowToast('🗑️ 연락처가 삭제되었습니다.');
  };

  const handleAddShoppingAccount = () => {
    if (!newMallName.trim() || !newMallUrl.trim()) {
      onShowToast('⚠️ 쇼핑몰 명칭과 URL을 입력해주세요.');
      return;
    }
    const newShop: SchoolShoppingAccount = {
      id: `sh-${Date.now()}`,
      mallName: newMallName.trim(),
      url: newMallUrl.trim(),
      username: newMallUsername.trim() || 'school_id',
      password: newMallPassword.trim() || '****',
    };
    setTabs(
      tabs.map((t) =>
        t.type === 'shopping'
          ? { ...t, shoppingAccounts: [...(t.shoppingAccounts || []), newShop] }
          : t
      )
    );
    setNewMallName('');
    setNewMallUrl('');
    setNewMallUsername('');
    setNewMallPassword('');
    onShowToast('🛍️ 새 쇼핑몰 계정이 등록되었습니다.');
  };

  const handleDeleteShopping = (shopId: string) => {
    setTabs(
      tabs.map((t) =>
        t.type === 'shopping'
          ? { ...t, shoppingAccounts: (t.shoppingAccounts || []).filter((s) => s.id !== shopId) }
          : t
      )
    );
    onShowToast('🗑️ 쇼핑몰 정보가 삭제되었습니다.');
  };

  const handleSaveCustomText = () => {
    setTabs(
      tabs.map((t) =>
        t.type === 'custom' ? { ...t, customText: customTabContent } : t
      )
    );
    onShowToast('📝 커스텀 안내글이 저장되었습니다.');
  };

  // --- Handlers: Widget Reordering (요구사항 4) ---
  const moveWidget = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= widgetOrder.length) return;

    const newOrder = [...widgetOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIdx];
    newOrder[targetIdx] = temp;
    setWidgetOrder(newOrder);

    // After moving, calculate empty spaces and optimize for 6-division grid
    const hiddenIds = Object.entries(widgetVisibility)
      .filter(([_, visible]) => !visible)
      .map(([k]) => k);

    const opt = optimizeGridLayout(
      newOrder,
      widgetSpans as Record<string, WidgetSpan>,
      hiddenIds,
      6,
      temp
    );

    setWidgetOrder(opt.newOrder as WorkWidgetId[]);
    setWidgetSpans(opt.newSpans as Record<WorkWidgetId, 1 | 2 | 3 | 4 | 6>);
    localStorage.setItem('work_board_widget_spans', JSON.stringify(opt.newSpans));

    if (opt.emptySlotsBefore > 0) {
      onShowToast(`✨ 위젯 이동 후 빈 공간 ${opt.emptySlotsBefore}칸을 자동 계산하여 6분할 최적 정렬했습니다.`);
    } else {
      onShowToast(`✨ [${WIDGET_METAS.find((m) => m.id === temp)?.name || temp}] 위젯 순서가 이동되었습니다.`);
    }
  };

  const toggleWidgetVisibility = (id: WorkWidgetId) => {
    setWidgetVisibility((prev) => {
      const willBeVisible = !prev[id];
      if (willBeVisible) {
        // [3번째 이미지 표준 규격으로 일괄 크기 통일]: 6분할 중 2칸(1/3 너비 황금비율), 자유모드 380px x 520px
        setWidgetSpans((sPrev) => ({ ...sPrev, [id]: 2 }));
        setFreeWidgetPositions((fPrev) => ({
          ...fPrev,
          [id]: {
            ...(fPrev[id] || { x: 20, y: 20 }),
            width: 380,
            height: 520,
          },
        }));
        try {
          localStorage.removeItem(`widget_height_${id}`);
          localStorage.removeItem(`widget_collapsed_${id}`);
        } catch {}
        setCollapsedWidgetIds((cPrev) => cPrev.filter((cId) => cId !== id));
      }
      return { ...prev, [id]: willBeVisible };
    });
  };

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Top Controls Bar for each widget in 6-Division Work Board (칸 버튼 제거 및 컴팩트화)
  const renderWidgetTopControls = (wid: WorkWidgetId) => {
    const idx = widgetOrder.indexOf(wid);
    return (
      <div className="flex items-center gap-1 shrink-0">
        {/* Reorder Position Buttons: Move Left / Right */}
        <div className="flex items-center bg-white/90 dark:bg-slate-800/90 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
          <button
            type="button"
            disabled={idx <= 0}
            onClick={() => moveWidget(idx, 'up')}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 disabled:opacity-30 rounded cursor-pointer transition"
            title="위치 앞으로 이동 (◀)"
          >
            <MoveUp className="w-3 h-3 rotate-[-90deg]" />
          </button>
          <span className="text-[10px] font-black text-teal-700 dark:text-teal-400 px-1">{idx + 1}구역</span>
          <button
            type="button"
            disabled={idx >= widgetOrder.length - 1}
            onClick={() => moveWidget(idx, 'down')}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 disabled:opacity-30 rounded cursor-pointer transition"
            title="위치 뒤로 이동 (▶)"
          >
            <MoveDown className="w-3 h-3 rotate-[-90deg]" />
          </button>
        </div>

        {/* Compact Hide Button */}
        <button
          type="button"
          onClick={() => toggleWidgetVisibility(wid)}
          className="w-5 h-5 rounded flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 transition cursor-pointer"
          title="위젯 숨기기"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  };

  // Render widget by ID
  const renderWidget = (id: WorkWidgetId) => {
    if (!widgetVisibility[id]) return null;
    const isOver = dragOverWidgetId === id;
    const isPinned = pinnedWidgetIds.includes(id);
    const feedback: 'invalid' | 'valid' | null = isOver ? (draggedWidgetId === id ? 'invalid' : 'valid') : null;
    const commonDragProps = {
      isDraggable: !isPinned,
      onDragStart: handleDragStart,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
      onDragEnd: handleDragEnd,
      isDragOver: isOver,
      dropFeedback: feedback,
      isDragActive: !!draggedWidgetId,
      draggedWidgetId: draggedWidgetId,
      onDockOver: (dockId: string) => setDockOverTargetId(dockId),
      onDockLeave: () => setDockOverTargetId(null),
      isDockOver: dockOverTargetId === `dock-bottom-${id}`,
      isPinned: isPinned,
      onTogglePin: () => handleTogglePinWidget(id),
      pinColor: getWidgetPinColor(id),
      isCollapsedControlled: collapsedWidgetIds.includes(id),
      onToggleCollapse: handleToggleWidgetCollapse,
      opacity: config?.widgetOpacity,
      onFreeResize: (w: number, h: number) => handleFreeResizeWidget(id, w, h),
      isFreeMode: layoutMode === 'freeform',
      widgetHeaderColorMode: config?.widgetHeaderColorMode,
      customWidgetHeaderColor: config?.customWidgetHeaderColor,
      widgetTextContrast: config?.widgetTextContrast,
      widgetTextShadow: config?.widgetTextShadow,
      widgetCardSolidBg: config?.widgetCardSolidBg,
    };

    switch (id) {
      // 1. Daily Quote Card
      case 'quote':
        return (
          <ResizableWidgetCard
            key="quote"
            id="quote"
            title="독서 노트"
            span={widgetSpans.quote || 2}
            onSpanChange={(s) => setWidgetSpan('quote', s)}
            onClose={() => toggleWidgetVisibility('quote')}
            theme={config?.theme}
            {...commonDragProps}
          >
            <div className="p-4 flex flex-col justify-between h-full space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-rose-200/60 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                  <span className="font-black text-xs text-rose-950">
                    독서 노트 도서 및 마음에 남는 문장 독서 카드
                  </span>
                </div>
                <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full">
                  퇴근 전 {quoteConfig.alertTime} 알림 활성
                </span>
              </div>

              <div className="py-4 px-2 text-center my-auto">
                <p
                  style={{ fontFamily: 'var(--app-font-family, inherit)' }}
                  className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-100 leading-relaxed italic"
                >
                  “{quoteConfig.customQuotes[quoteIdx % quoteConfig.customQuotes.length]}”
                </p>
                <p className="text-xs font-bold text-rose-600 mt-2">
                  — {quoteConfig.teacherMessage}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-rose-200/60 text-xs">
                <button
                  type="button"
                  onClick={() => setQuoteIdx((prev) => prev + 1)}
                  className="text-rose-700 hover:text-rose-900 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>다음 응원 문구 보기</span>
                </button>
                <span className="text-[10px] text-slate-400">
                  오늘도 아이들과 함께해주셔서 감사합니다!
                </span>
              </div>
            </div>
          </ResizableWidgetCard>
        );

      // 2. Work Links (Editable with custom icon image) (요구사항 5)
      case 'links':
        return (
          <ResizableWidgetCard
            key="links"
            id="links"
            title="업무 포털 및 필수 교육 사이트 바로가기"
            span={widgetSpans.links || 4}
            onSpanChange={(s) => setWidgetSpan('links', s)}
            onClose={() => toggleWidgetVisibility('links')}
            theme={config?.theme}
            {...commonDragProps}
          >
            <div className="p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="font-black text-xs text-slate-800 dark:text-slate-100">
                    업무 포털 및 필수 교육 사이트 바로가기
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddLink}
                  className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer border border-indigo-200 dark:border-indigo-800"
                >
                  <Plus className="w-3 h-3" />
                  <span>사이트 추가</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 py-1">
                {links.map((lnk) => (
                  <div
                    key={lnk.id}
                    className="relative p-2.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-2xs transition flex items-center gap-2.5 group cursor-pointer"
                  >
                    <a
                      href={lnk.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2.5 flex-1 overflow-hidden"
                    >
                      {lnk.iconImageUrl ? (
                        <img
                          src={lnk.iconImageUrl}
                          alt={lnk.title}
                          className="w-7 h-7 object-contain rounded-lg shrink-0 border border-slate-200 bg-white"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div
                          className={`w-7 h-7 rounded-xl ${lnk.color} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs group-hover:scale-105 transition`}
                        >
                          {lnk.title.charAt(0)}
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <div className="text-xs font-black text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                          {lnk.title}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">바로 연결</div>
                      </div>
                    </a>

                    {/* Edit / Delete on Hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 bg-white/95 dark:bg-slate-900/95 px-1 py-0.5 rounded-lg shadow-2xs border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={(e) => handleOpenEditLink(lnk, e)}
                        title="바로가기 수정"
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 hover:text-indigo-600 rounded transition"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteLink(lnk.id, e)}
                        title="바로가기 삭제"
                        className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 rounded transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-[10px] text-slate-400 text-right pt-1">
                * 마우스를 올리면 사이트 수정 및 삭제가 가능하며, 커스텀 아이콘 이미지 주소를 지원합니다.
              </div>
            </div>
          </ResizableWidgetCard>
        );

      // 3. Post-It Notes
      case 'postIt':
        return (
          <ResizableWidgetCard
            key="postIt"
            id="postIt"
            title="포스트잇 메모 (색상/정렬 지원)"
            span={widgetSpans.postIt || 3}
            onSpanChange={(s) => setWidgetSpan('postIt', s)}
            onClose={() => toggleWidgetVisibility('postIt')}
            theme={config?.theme}
            {...commonDragProps}
          >
            <div className="p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">📌</span>
                  <span className="font-black text-xs text-slate-800 dark:text-slate-100">
                    포스트잇 메모
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPostItSort(postItSort === 'newest' ? 'oldest' : 'newest')}
                  className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowDownUp className="w-3 h-3" />
                  <span>{postItSort === 'newest' ? '최신순' : '오래된순'}</span>
                </button>
              </div>

              {/* New Post-It input */}
              <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <input
                  type="text"
                  value={newPostItText}
                  onChange={(e) => setNewPostItText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPostIt()}
                  placeholder="새 업무 메모를 작성하세요 (예: 5교시 수학 단원평가지 인쇄하기)..."
                  className="w-full text-xs font-medium outline-none bg-transparent"
                />
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700 text-xs">
                  <div className="flex items-center gap-1.5">
                    {[
                      { id: 'bg-amber-100 border-amber-300 text-amber-950', dot: 'bg-amber-300' },
                      { id: 'bg-emerald-100 border-emerald-300 text-emerald-950', dot: 'bg-emerald-300' },
                      { id: 'bg-pink-100 border-pink-300 text-pink-950', dot: 'bg-pink-300' },
                      { id: 'bg-sky-100 border-sky-300 text-sky-950', dot: 'bg-sky-300' },
                    ].map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setNewPostItColor(c.id)}
                        className={`w-4 h-4 rounded-full ${c.dot} cursor-pointer transition ${
                          newPostItColor === c.id ? 'ring-2 ring-slate-800 dark:ring-white scale-110' : ''
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddPostIt}
                    className="px-3 py-1 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>메모 부착</span>
                  </button>
                </div>
              </div>

              {/* Post-it notes grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto custom-scroll p-1">
                {sortedPostIts.map((note) => (
                  <div
                    key={note.id}
                    className={`p-3.5 rounded-2xl border shadow-2xs flex flex-col justify-between gap-2 relative group ${note.color}`}
                  >
                    <p className="text-xs font-bold leading-relaxed whitespace-pre-wrap">
                      {note.text}
                    </p>
                    <div className="flex items-center justify-between pt-1 border-t border-black/10 text-[10px] opacity-70">
                      <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                      <button
                        type="button"
                        onClick={() => handleDeletePostIt(note.id)}
                        className="opacity-0 group-hover:opacity-100 text-rose-600 hover:text-rose-800 p-0.5 cursor-pointer transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ResizableWidgetCard>
        );

      // 4. School Messenger Memos (요구사항 6)
      case 'messenger':
        return (
          <ResizableWidgetCard
            key="messenger"
            id="messenger"
            title="학교 메신저 쪽지 정리 (D-Day 알림)"
            span={widgetSpans.messenger || 3}
            onSpanChange={(s) => setWidgetSpan('messenger', s)}
            onClose={() => toggleWidgetVisibility('messenger')}
            theme={config?.theme}
            {...commonDragProps}
          >
            <div className="p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">✉️</span>
                  <span className="font-black text-xs text-slate-800 dark:text-slate-100">
                    학교 메신저 쪽지 정리
                  </span>
                  <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                    {memos.filter((m) => !m.completed).length}건 미완료
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsMessengerNoteModalOpen(true)}
                    className="px-2 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs active:scale-95"
                    title="캡처 이미지 붙여넣기(Ctrl+V) 및 Gemini AI 자동 등록"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI 쪽지 등록 (Ctrl+V)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsStatsModalOpen(true)}
                    className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                    title="월단위 쪽지 내용 통계 및 구글 스프레드시트 정리"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>통계</span>
                  </button>
                </div>
              </div>

              {/* New memo input with deadline toggle */}
              <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <input
                    type="text"
                    value={newMemoSender}
                    onChange={(e) => setNewMemoSender(e.target.value)}
                    placeholder="발신처 (예: 교무부장, 행정실)"
                    className="sm:col-span-4 px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-bold bg-transparent"
                  />

                  <div className="sm:col-span-5 flex items-center gap-1.5">
                    <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={newMemoUseDeadline}
                        onChange={(e) => setNewMemoUseDeadline(e.target.checked)}
                        className="rounded accent-indigo-600 cursor-pointer"
                      />
                      <span>마감일</span>
                    </label>
                    {newMemoUseDeadline ? (
                      <input
                        type="datetime-local" min="2000-01-01T00:00" max="2099-12-31T23:59"
                        value={newMemoDeadline}
                        onChange={(e) => setNewMemoDeadline(e.target.value)}
                        className="w-full px-2 py-1 text-[11px] border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-mono bg-transparent"
                      />
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">기한 없음</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddMemo}
                    className="sm:col-span-3 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>쪽지 등록</span>
                  </button>
                </div>

                <input
                  type="text"
                  value={newMemoContent}
                  onChange={(e) => setNewMemoContent(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddMemo()}
                  placeholder="쪽지 주요 업무 내용 입력 (예: 방과후 수강료 정산서 제출 요망)..."
                  className="w-full text-xs outline-none px-1 font-medium bg-transparent"
                />
              </div>

              {/* Memo List */}
              <div className="space-y-2 max-h-72 overflow-y-auto custom-scroll pr-1">
                {memos.map((memo) => (
                  <div
                    key={memo.id}
                    onClick={() => toggleMemoCompleted(memo.id)}
                    className={`p-3 rounded-2xl border transition cursor-pointer flex items-start gap-2.5 group ${
                      memo.completed
                        ? 'bg-slate-100/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-60 line-through'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300 shadow-2xs'
                    }`}
                  >
                    <button
                      type="button"
                      className="mt-0.5 text-indigo-600 shrink-0 cursor-pointer"
                    >
                      {memo.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                      )}
                    </button>

                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                            {memo.sender}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {memo.createdAt}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {memo.useDeadline ? (
                            memo.deadline ? (
                              <div className="flex items-center gap-1">
                                {(() => {
                                  const deadlineDate = new Date(memo.deadline);
                                  const now = new Date();
                                  const diffTime = deadlineDate.getTime() - now.getTime();
                                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                  if (diffDays < 0) {
                                    return (
                                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-600 text-white">
                                        D+{Math.abs(diffDays)} 초과
                                      </span>
                                    );
                                  } else if (diffDays === 0) {
                                    return (
                                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-500 text-white animate-pulse">
                                        D-Day 오늘
                                      </span>
                                    );
                                  } else if (diffDays <= 3) {
                                    return (
                                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500 text-white">
                                        D-{diffDays} 임박
                                      </span>
                                    );
                                  } else {
                                    return (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                                        D-{diffDays}
                                      </span>
                                    );
                                  }
                                })()}
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>{memo.deadline.replace('T', ' ')}</span>
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                                마감일 미지정
                              </span>
                            )
                          ) : (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                              기한 없음 (미사용)
                            </span>
                          )}

                        <button
                          type="button"
                          onClick={(e) => toggleMemoDeadlineUsage(memo.id, e)}
                          title="마감 기능 사용 여부 전환"
                          className="px-1.5 py-0.5 hover:bg-indigo-50 border border-slate-200 rounded text-slate-600 hover:text-indigo-600 text-[10px] font-bold transition cursor-pointer"
                        >
                          {memo.useDeadline ? '마감 해제' : '⏰ 마감 사용'}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteMemo(memo.id, e)}
                          title="쪽지 삭제"
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 mt-1 leading-relaxed whitespace-pre-wrap">
                      {renderMemoText(memo.content)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ResizableWidgetCard>
      );

      // 5. Photo Frame Widget (요구사항 8)
      case 'photo':
        return (
          <ResizableWidgetCard
            key="photo"
            id="photo"
            title="학급 추억 사진 액자"
            span={widgetSpans.photo || 2}
            onSpanChange={(s) => setWidgetSpan('photo', s)}
            onClose={() => toggleWidgetVisibility('photo')}
            theme={config?.theme}
            {...commonDragProps}
          >
            <div className="p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="font-black text-xs text-slate-800 dark:text-slate-100">학급 추억 사진 액자</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingPhoto(!isEditingPhoto)}
                  className="px-2 py-1 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
                >
                  <Palette className="w-3 h-3" />
                  <span>{isEditingPhoto ? '설정 닫기' : '사진 변경'}</span>
                </button>
              </div>

              {isEditingPhoto && (
                <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-purple-200 dark:border-purple-800 space-y-3 mb-3 text-xs animate-fade-in">
                  {/* File Upload Button & URL */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                      사진 등록 (PC 파일 업로드 또는 웹 이미지 URL)
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>내 PC에서 사진 업로드</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <input
                        type="text"
                        value={photoConfig.imageUrl}
                        onChange={(e) => setPhotoConfig({ ...photoConfig, imageUrl: e.target.value })}
                        placeholder="또는 이미지 주소(URL) 입력..."
                        className="flex-1 px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl outline-none bg-transparent"
                      />
                    </div>
                  </div>

                  {/* Frame Style Selection */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                      액자 디자인 테마
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[
                        { id: 'wood', label: '앤틱 우드' },
                        { id: 'polaroid', label: '폴라로이드' },
                        { id: 'gold', label: '골드 리프' },
                        { id: 'minimal', label: '모던 슬레이트' },
                        { id: 'pastel', label: '클레이 파스텔' },
                      ].map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() =>
                            setPhotoConfig({
                              ...photoConfig,
                              frameStyle: st.id as PhotoFrameConfig['frameStyle'],
                            })
                          }
                          className={`py-1 px-1.5 text-center rounded-lg text-[10px] font-bold transition cursor-pointer border ${
                            photoConfig.frameStyle === st.id
                              ? 'bg-purple-600 text-white border-purple-700 shadow-2xs'
                              : 'bg-slate-50 dark:bg-slate-700/60 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Caption input */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                      액자 하단 캡션 문구
                    </label>
                    <input
                      type="text"
                      value={photoConfig.caption}
                      onChange={(e) => setPhotoConfig({ ...photoConfig, caption: e.target.value })}
                      placeholder="예: 2026학년도 아름다운 우리 3학년 1반의 봄날..."
                      className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium bg-transparent"
                    />
                  </div>
                </div>
              )}

              {/* Styled Photo Frame Display */}
              <div className={`mt-2 flex flex-col items-center justify-center ${getFrameStyling()}`}>
                <div className="w-full overflow-hidden rounded-xl bg-slate-900/10 flex items-center justify-center">
                  <img
                    src={photoConfig.imageUrl}
                    alt="학급 추억 사진"
                    className="w-full h-48 sm:h-52 object-cover rounded-lg transition-transform hover:scale-[1.01]"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=80';
                    }}
                  />
                </div>

                {photoConfig.caption && (
                  <div
                    className={`mt-2.5 text-center font-bold text-xs ${
                      photoConfig.frameStyle === 'polaroid'
                        ? 'text-slate-800 font-mono tracking-tight'
                        : photoConfig.frameStyle === 'minimal'
                        ? 'text-slate-200'
                        : photoConfig.frameStyle === 'gold'
                        ? 'text-amber-950 font-black'
                        : 'text-amber-100'
                    }`}
                  >
                    {photoConfig.caption}
                  </div>
                )}
              </div>

              <div className="text-[10px] text-slate-400 text-center pt-2">
                우측 상단 버튼으로 사진 파일 등록 및 액자 디자인을 자유롭게 설정할 수 있습니다.
              </div>
            </div>
          </ResizableWidgetCard>
        );

      // 6. School Info & Shopping Tabs (Editable) (요구사항 7)
      case 'schoolInfo':
        return (
          <ResizableWidgetCard
            key="schoolInfo"
            id="schoolInfo"
            title="학교 정보"
            span={widgetSpans.schoolInfo || 4}
            onSpanChange={(s) => setWidgetSpan('schoolInfo', s)}
            onClose={() => toggleWidgetVisibility('schoolInfo')}
            theme={config?.theme}
            {...commonDragProps}
          >
            <div className="p-4 flex flex-col justify-between h-full space-y-3">
              {/* Tab Selector & Edit Mode Toggle */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 flex-wrap gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl">
                    {tabs.map((tb) => (
                      <button
                        key={tb.id}
                        type="button"
                        onClick={() => setActiveTabId(tb.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                          activeTabId === tb.id
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        {tb.title}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingSchoolInfo(!isEditingSchoolInfo)}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <Edit2 className="w-3 h-3 text-slate-500" />
                    <span>{isEditingSchoolInfo ? '완료' : '수정'}</span>
                  </button>
                </div>
              </div>

              {/* Active Tab Content */}
              <div className="py-2.5 flex-1">
                {/* Tab 1: Contacts */}
                {activeTab.type === 'info' && (
                  <div className="space-y-3">
                    {isEditingSchoolInfo && (
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-indigo-200 dark:border-indigo-800 space-y-2 text-xs animate-fade-in">
                        <div className="font-bold text-indigo-900 dark:text-indigo-300">새 교내 연락처 등록</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={newContactLabel}
                            onChange={(e) => setNewContactLabel(e.target.value)}
                            placeholder="부서/직책 (예: 보건실, 당직실)"
                            className="px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                          />
                          <input
                            type="text"
                            value={newContactNumber}
                            onChange={(e) => setNewContactNumber(e.target.value)}
                            placeholder="내선/전화 (예: 104, 02-1234)"
                            className="px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg font-mono bg-transparent"
                          />
                          <input
                            type="text"
                            value={newContactAddress}
                            onChange={(e) => setNewContactAddress(e.target.value)}
                            placeholder="주소 (선택)"
                            className="px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                          />
                          <button
                            type="button"
                            onClick={handleAddContact}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>연락처 추가</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {activeTab.contacts?.map((c) => (
                        <div
                          key={c.id}
                          className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs relative group"
                        >
                          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span className="truncate">{c.label}</span>
                            </div>
                            {isEditingSchoolInfo && (
                              <button
                                type="button"
                                onClick={() => handleDeleteContact(c.id)}
                                className="text-rose-500 hover:text-rose-700 cursor-pointer"
                                title="삭제"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <div className="font-mono font-black text-xs sm:text-sm text-slate-900 dark:text-slate-100 mt-1">
                            {c.number}
                          </div>
                          {c.address && <div className="mt-0.5 text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug break-keep">📍 {c.address}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab 2: Shopping Accounts */}
                {activeTab.type === 'shopping' && (
                  <div className="space-y-3">
                    {isEditingSchoolInfo && (
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-purple-200 dark:border-purple-800 space-y-2 animate-fade-in text-xs">
                        <div className="font-bold text-purple-900 dark:text-purple-300">
                          새 교내 쇼핑몰/구매 계정 등록
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <input
                            type="text"
                            value={newMallName}
                            onChange={(e) => setNewMallName(e.target.value)}
                            placeholder="쇼핑몰 명칭 (예: S2B)"
                            className="px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                          />
                          <input
                            type="text"
                            value={newMallUrl}
                            onChange={(e) => setNewMallUrl(e.target.value)}
                            placeholder="쇼핑몰 URL"
                            className="px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                          />
                          <input
                            type="text"
                            value={newMallUsername}
                            onChange={(e) => setNewMallUsername(e.target.value)}
                            placeholder="계정 ID"
                            className="px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                          />
                          <button
                            type="button"
                            onClick={handleAddShoppingAccount}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>계정 추가</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      {activeTab.shoppingAccounts?.map((sh) => (
                        <div
                          key={sh.id}
                          className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs group"
                        >
                          <div className="flex items-center gap-2.5">
                            <ShoppingBag className="w-4 h-4 text-purple-600" />
                            <div>
                              <div className="font-black text-slate-900 dark:text-slate-100">{sh.mallName}</div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                ID: <span className="font-bold text-slate-800 dark:text-slate-200">{sh.username}</span> / PW: {sh.password}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <a
                              href={sh.url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold rounded-lg hover:bg-purple-100 transition cursor-pointer flex items-center gap-1"
                            >
                              <span>쇼핑몰 열기</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>

                            {isEditingSchoolInfo && (
                              <button
                                type="button"
                                onClick={() => handleDeleteShopping(sh.id)}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition"
                                title="삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab 3: Custom Text */}
                {activeTab.type === 'custom' && (
                  <div className="space-y-2 text-xs">
                    {isEditingSchoolInfo ? (
                      <div className="space-y-2 animate-fade-in">
                        <textarea
                          rows={4}
                          value={customTabContent}
                          onChange={(e) => setCustomTabContent(e.target.value)}
                          placeholder="교내 행사, 급식실 이용 수칙, 특별실 이용 안내 등을 자유롭게 작성하세요..."
                          className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none font-medium text-slate-800 dark:text-slate-200"
                        />
                        <button
                          type="button"
                          onClick={handleSaveCustomText}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>안내글 저장하기</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        <p className="whitespace-pre-line text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                          {activeTab.customText}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="text-[10px] text-slate-400 text-right pt-2 border-t border-slate-100 dark:border-slate-800">
                교내 유선 연락망, 학교장터 및 맞춤형 안내 사항을 직접 추가 및 수정할 수 있습니다.
              </div>
            </div>
          </ResizableWidgetCard>
        );

      // =========================================================================
      // [수업 및 업무 공용 위젯 (요구사항: 수업보드 전체 14개 위젯 업무보드 완전 연동)]
      // =========================================================================
      case 'attendance':
        return (
          <ResizableWidgetCard
            key="attendance"
            id="attendance"
            title="스마트 전자 출결 현황 (수업 공용)"
            span={widgetSpans.attendance || 3}
            onSpanChange={(s) => setWidgetSpan('attendance', s)}
            onClose={() => toggleWidgetVisibility('attendance')}
            theme={config?.theme}
            {...commonDragProps}
          >
            <AttendanceWidget
              students={students}
              onUpdateStudentAttendance={onUpdateStudentAttendance || (() => {})}
              onShowToast={onShowToast}
              googleSheetUrl={config?.attendanceGoogleSheetUrl}
              autoBackupTime={config?.attendanceAutoBackupTime || '16:00'}
            />
          </ResizableWidgetCard>
        );

      case 'timetable':
        return (
          <ResizableWidgetCard
            key="timetable"
            id="timetable"
            title="수업 시간표 & 준비물 (수업 공용)"
            span={widgetSpans.timetable || 3}
            onSpanChange={(s) => setWidgetSpan('timetable', s)}
            onClose={() => toggleWidgetVisibility('timetable')}
            theme={config?.theme}
            {...commonDragProps}
          >
            <TimetableWidget schedule={schedule || weeklySchedule} onShowToast={onShowToast} />
          </ResizableWidgetCard>
        );

      case 'calendar':
        return (
          <ResizableWidgetCard
            key="calendar"
            id="calendar"
            title="캘린더 (수업 공용)"
            span={widgetSpans.calendar || 3}
            onSpanChange={(s) => setWidgetSpan('calendar', s)}
            onClose={() => toggleWidgetVisibility('calendar')}
            theme={config?.theme}
            {...commonDragProps}
          >
            <ClassCalendarWidget onShowToast={onShowToast} googleCalendarUrl={config?.googleCalendarUrl} />
          </ResizableWidgetCard>
        );

      case 'observation':
        return (
          <ResizableWidgetCard
            key="observation"
            id="observation"
            title="관찰·상담 일지 (수업 공용)"
            span={widgetSpans.observation || 3}
            onSpanChange={(s) => setWidgetSpan('observation', s)}
            onClose={() => toggleWidgetVisibility('observation')}
            theme={config?.theme}
            {...commonDragProps}
          >
            <ObservationWidget
              students={students}
              records={observationRecords}
              config={config || ({} as any)}
              onAddRecord={onAddObservationRecord || (() => {})}
              onDeleteRecord={onDeleteObservationRecord || (() => {})}
              onShowToast={onShowToast}
            />
          </ResizableWidgetCard>
        );

      case 'drafting':
        return (
          <ResizableWidgetCard
            key="drafting"
            id="drafting"
            title="K-에듀파인 표준 기안문 서식 (수업 공용)"
            span={widgetSpans.drafting || 3}
            onSpanChange={(s) => setWidgetSpan('drafting', s)}
            onClose={() => toggleWidgetVisibility('drafting')}
            theme={config?.theme}
            {...commonDragProps}
          >
            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center justify-between">
                <span>📄 공문서 및 현장체험학습 표준 기안문</span>
                <span className="text-[10px] bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300 px-2 py-0.5 rounded-full font-bold">K-에듀파인</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                학기초 환경구성, 현장체험학습 품의, 학교안전계획 등 자주 쓰는 공문 서식을 원클릭으로 복사합니다.
              </p>
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {['현장체험학습 품의서', '학급비 정산 품의서', '안전교육 운영계획', '학부모 상담일지'].map((doc) => (
                  <button
                    key={doc}
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`[${doc} 표준 서식]\n1. 관련: 2026학년도 학급 교육과정 운영 계획\n2. 목적: 학생들의 전인적 성장 및 창의적 체험활동 지원\n3. 세부 추진 내용: 첨부파일 참조\n4. 소요 예산: 금000,000원`);
                      onShowToast(`📋 [${doc}] 표준 서식이 클립보드에 복사되었습니다.`);
                    }}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-700/60 hover:bg-sky-50 dark:hover:bg-sky-950/60 text-slate-700 dark:text-slate-200 hover:text-sky-700 dark:hover:text-sky-300 border border-slate-200 dark:border-slate-700 text-left font-bold text-[11px] transition cursor-pointer truncate"
                  >
                    {doc}
                  </button>
                ))}
              </div>
            </div>
          </ResizableWidgetCard>
        );

      // --- 신규 통합 위젯 9종 (수업 및 업무 공용) ---
      case 'timer':
        return (
          <ResizableWidgetCard
            key="timer"
            id="timer"
            title="수업 집중 타이머 (수업 공용)"
            span={widgetSpans.timer || 2}
            onSpanChange={(s) => setWidgetSpan('timer', s)}
            onClose={() => toggleWidgetVisibility('timer')}
            theme={config?.theme}
            onOpenDualMonitor={() => onOpenDualMonitor?.('timer')}
            {...commonDragProps}
          >
            <TimerWidget onShowToast={onShowToast} />
          </ResizableWidgetCard>
        );

      case 'noise':
        return (
          <ResizableWidgetCard
            key="noise"
            id="noise"
            title="소음 데시벨 측정기 (수업 공용)"
            span={widgetSpans.noise || 2}
            onSpanChange={(s) => setWidgetSpan('noise', s)}
            onClose={() => toggleWidgetVisibility('noise')}
            theme={config?.theme}
            onOpenDualMonitor={() => onOpenDualMonitor?.('noise')}
            {...commonDragProps}
          >
            <NoiseMonitorWidget
              onShowToast={onShowToast}
              onOpenStudentDisplay={() => onOpenDualMonitor?.('noise')}
            />
          </ResizableWidgetCard>
        );

      case 'picker':
        return (
          <ResizableWidgetCard
            key="picker"
            id="picker"
            title="발표자 추천 뽑기 (수업 공용)"
            span={widgetSpans.picker || 2}
            onSpanChange={(s) => setWidgetSpan('picker', s)}
            onClose={() => toggleWidgetVisibility('picker')}
            theme={config?.theme}
            {...commonDragProps}
          >
            <PickerWidget
              students={students}
              onSelectStudent={onSelectStudent || (() => {})}
              onShowToast={onShowToast}
            />
          </ResizableWidgetCard>
        );

      case 'clock':
        return (
          <ResizableWidgetCard
            key="clock"
            id="clock"
            title="디지털 시계 (수업 공용)"
            span={widgetSpans.clock || 2}
            onSpanChange={(s) => setWidgetSpan('clock', s)}
            onClose={() => toggleWidgetVisibility('clock')}
            theme={config?.theme}
            {...commonDragProps}
          >
            <ClockWidget onShowToast={onShowToast} />
          </ResizableWidgetCard>
        );

      case 'seating':
        return (
          <ResizableWidgetCard
            key="seating"
            id="seating"
            title="학급 자리배치도 (수업 공용)"
            span={widgetSpans.seating || 3}
            onSpanChange={(s) => setWidgetSpan('seating', s)}
            onClose={() => toggleWidgetVisibility('seating')}
            theme={config?.theme}
            {...commonDragProps}
          >
            <SeatingWidget
              students={students}
              teams={teams}
              praiseConfigs={config?.praiseConfigs || initialPraiseConfigs}
              onAwardPraise={() => {}}
              onUpdateTeams={onUpdateTeams || (() => {})}
              onUpdateStudents={onUpdateStudents || (() => {})}
              onSwapStudents={onSwapStudents || (() => {})}
              onShuffleStudents={onShuffleStudents || (() => {})}
              onAddTeamPoint={onAddTeamPoint || (() => {})}
              onAddStudentPoint={onAddStudentPoint || (() => {})}
              onOpenRankingModal={onOpenRankingModal || (() => {})}
              onShowToast={onShowToast}
            />
          </ResizableWidgetCard>
        );

      case 'roles':
        return (
          <ResizableWidgetCard
            key="roles"
            id="roles"
            title="1인 1역 (수업 공용)"
            span={widgetSpans.roles || 3}
            onSpanChange={(s) => setWidgetSpan('roles', s)}
            onClose={() => toggleWidgetVisibility('roles')}
            theme={config?.theme}
            onOpenDualMonitor={() => onOpenDualMonitor?.('roles')}
            {...commonDragProps}
          >
            <ClassRolesWidget
              roles={roles}
              onUpdateRoles={onUpdateRoles || (() => {})}
              students={students}
              periodInfo={periodInfo || initialPeriodInfo}
              onOpenRolesModal={onOpenRolesModal || (() => {})}
              onAutoAssign={onAutoAssignRoles || (() => {})}
              onOpenStudentDisplay={() => onOpenDualMonitor?.('roles')}
              onShowToast={onShowToast}
            />
          </ResizableWidgetCard>
        );

      case 'agenda':
        return (
          <ResizableWidgetCard
            key="agenda"
            id="agenda"
            title="오늘의 알림장 & 과제 (수업 공용)"
            span={widgetSpans.agenda || 3}
            onSpanChange={(s) => setWidgetSpan('agenda', s)}
            onClose={() => toggleWidgetVisibility('agenda')}
            theme={config?.theme}
            {...commonDragProps}
          >
            <AgendaWidget
              agendas={agendas}
              onToggleAgenda={onToggleAgenda || (() => {})}
              onAddAgenda={onAddAgenda || (() => {})}
              onDeleteAgenda={onDeleteAgenda || (() => {})}
              onShowToast={onShowToast}
            />
          </ResizableWidgetCard>
        );

      case 'meal':
        return (
          <ResizableWidgetCard
            key="meal"
            id="meal"
            title="오늘의 급식 (수업 공용)"
            span={widgetSpans.meal || 3}
            onSpanChange={(s) => setWidgetSpan('meal', s)}
            onClose={() => toggleWidgetVisibility('meal')}
            theme={config?.theme}
            {...commonDragProps}
          >
            <SchoolMealWidget schoolName={config?.schoolName || '초등학교'} onShowToast={onShowToast} />
          </ResizableWidgetCard>
        );

      case 'dday':
        return (
          <ResizableWidgetCard
            key="dday"
            id="dday"
            title="학급 D-Day 알리미 (수업 공용)"
            span={widgetSpans.dday || 3}
            onSpanChange={(s) => setWidgetSpan('dday', s)}
            onClose={() => toggleWidgetVisibility('dday')}
            theme={config?.theme}
            {...commonDragProps}
          >
            <DDayWidget onShowToast={onShowToast} />
          </ResizableWidgetCard>
        );

      case 'youtube':
        return (
          <ResizableWidgetCard
            key="youtube"
            id="youtube"
            title="유튜브 플레이어 (수업 공용)"
            span={widgetSpans.youtube || 3}
            onSpanChange={(s) => setWidgetSpan('youtube', s)}
            onClose={() => toggleWidgetVisibility('youtube')}
            theme={config?.theme}
            {...commonDragProps}
          >
            <YouTubeWidget onShowToast={onShowToast} />
          </ResizableWidgetCard>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full flex-grow flex flex-col gap-4 relative animate-fade-in text-slate-800">
      {/* Widget Layout Customizer Panel (요구사항 2, 4) */}
      {isCustomizeOpen && (
        <div className="p-4 sm:p-5 bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-white/15 text-white space-y-3 animate-fade-in shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-teal-400" />
              <h4 className="text-xs font-black text-white">
                업무보드 위젯 순서 변경 및 노출 설정 (20종 자유 배치)
              </h4>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* 빈 공간 진단 배지 */}
              <div className="flex items-center gap-1.5 text-xs font-bold bg-slate-950/80 px-2.5 py-1 rounded-xl border border-white/10 shadow-2xs">
                <span className="text-slate-400 text-[11px]">빈 공간:</span>
                <span
                  className={`font-black px-1.5 py-0.2 rounded-full text-[10px] ${
                    workGridAnalysis.totalEmptySlots === 0
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                  }`}
                >
                  {workGridAnalysis.totalEmptySlots === 0 ? '✨ 0칸' : `⚠️ ${workGridAnalysis.totalEmptySlots}칸`}
                </span>
              </div>

              {/* 6분할 가이드선 토글 */}
              <button
                type="button"
                onClick={() => setShow6GridGuides(!show6GridGuides)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer border shadow-2xs ${
                  show6GridGuides
                    ? 'bg-teal-500 text-slate-950 border-teal-400 font-black'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-white/10'
                }`}
              >
                <Grid3X3 className="w-3 h-3" />
                <span>가이드선 {show6GridGuides ? '켜짐' : '보기'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCustomizeOpen(false)}
                className="text-xs text-slate-400 hover:text-white font-bold ml-1 cursor-pointer"
              >
                닫기 ✕
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            원하는 위젯의 위/아래 순서를 드래그하거나 변경할 수 있으며, 수업보드 위젯을 포함한 20개 전체 위젯을 자유롭게 켜고 끌 수 있습니다.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1 max-h-80 overflow-y-auto custom-scroll pr-1">
            {widgetOrder.map((wid, idx) => {
              const meta = WIDGET_METAS.find((m) => m.id === wid);
              const isVisible = widgetVisibility[wid];

              return (
                <div
                  key={wid}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition ${
                    isVisible
                      ? 'bg-slate-950 border-white/10 shadow-xs'
                      : 'bg-slate-950/40 border-white/5 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span>{meta?.icon}</span>
                    <span className="font-bold text-white truncate">{meta?.name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveWidget(idx, 'up')}
                      className="p-1 hover:bg-white/10 disabled:opacity-30 rounded text-slate-400 hover:text-white cursor-pointer"
                      title="위로 이동"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === widgetOrder.length - 1}
                      onClick={() => moveWidget(idx, 'down')}
                      className="p-1 hover:bg-white/10 disabled:opacity-30 rounded text-slate-400 hover:text-white cursor-pointer"
                      title="아래로 이동"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleWidgetVisibility(wid)}
                      className={`p-1 rounded cursor-pointer ${
                        isVisible ? 'text-teal-400 hover:bg-white/10' : 'text-slate-500 hover:bg-white/5'
                      }`}
                      title={isVisible ? '위젯 숨기기' : '위젯 보이기'}
                    >
                      {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6-Division Guidelines Visualizer */}
      {show6GridGuides && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 p-3 bg-teal-500/10 rounded-2xl border-2 border-dashed border-teal-400/40 animate-fade-in backdrop-blur-xs">
          {[1, 2, 3, 4, 5, 6].map((cell) => (
            <div
              key={cell}
              className="py-3 px-2 border border-teal-400/30 bg-slate-900/60 text-white rounded-xl text-center shadow-xs"
            >
              <div className="text-xs font-black text-teal-300">📐 제 {cell}구역</div>
              <div className="text-[10px] text-slate-400 font-bold">1/6 표준 분할 슬롯</div>
            </div>
          ))}
        </div>
      )}

      {/* Main Workspace Layout with StageManagerStrip (수업보드와 완전 동일한 구조) */}
      <div className="w-full flex-grow flex items-start gap-3 sm:gap-4 relative">
        {/* iOS Stage Manager 스타일 좌측 사이드 독 (요구사항 6) */}
        {config?.stageManagerMode && (
          <StageManagerStrip
            isDarkMode={isDarkMode}
            opacity={config.stageManagerOpacity ?? 0.65}
            collapsedWidgets={collapsedWidgetIds
              .filter((id) => widgetVisibility[id as WorkWidgetId])
              .map((id) => {
                const meta = WIDGET_METAS.find((m) => m.id === id);
                return {
                  id,
                  title: meta?.name || id,
                  icon: meta?.icon || '📌',
                };
              })}
            onExpandWidget={handleExpandWidgetFromStage}
            onCloseWidget={(id) => toggleWidgetVisibility(id as WorkWidgetId)}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
        )}

        {/* 메인 뷰 컨테이너: 자유 이동 캔버스 또는 6분할 격자 정렬 */}
        <div className="flex-1 min-w-0 w-full">
          {layoutMode === 'freeform' ? (
            /* FREE-FORM DRAG & DROP CANVAS (요구사항: 큰 캔버스에 자유롭게 위젯을 두고 최소 간격으로 정렬) */
            <main
              ref={freeCanvasRef}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleCanvasDrop}
              className="w-full flex-grow relative min-h-[920px] p-4 rounded-3xl bg-slate-900/5 dark:bg-slate-950/40 backdrop-blur-xs border-2 border-dashed border-sky-400/50 overflow-visible"
            >
              <div className="relative w-full min-h-[850px]">
                {widgetOrder
                  .filter((id) => widgetVisibility[id])
                  .filter((id) => !(config?.stageManagerMode && collapsedWidgetIds.includes(id)))
                  .map((wId) => {
                    const pos = freeWidgetPositions[wId] || { x: 20, y: 20, width: 380 };
                    const zIdx = activeZIndexMap[wId] || 10;
                    const isDraggingThis = activeDraggingWidgetId === wId;

                    return (
                      <div
                        key={wId}
                        onPointerDown={(e) => {
                          const target = e.target as HTMLElement;
                          if (
                            target.closest('.resize-handle') ||
                            target.closest('button') ||
                            target.closest('input') ||
                            target.closest('textarea') ||
      target.isContentEditable ||
      target.closest('[contenteditable="true"]') ||
                            target.closest('select') ||
                            target.closest('a')
                          ) {
                            return;
                          }
                          handleFreeWindowPointerDown(e, wId);
                        }}
                        style={{
                          position: 'absolute',
                          left: `${pos.x}px`,
                          top: `${pos.y}px`,
                          width: pos.width ? `${pos.width}px` : '380px',
                          maxWidth: 'calc(100% - 24px)', // 위젯이 캔버스 우측 경계선을 넘어가지 않도록 안전 클램핑
                          height: pos.height ? `${pos.height}px` : undefined,
                          zIndex: isDraggingThis ? 999 : zIdx,
                        }}
                        className={`transition-shadow duration-150 touch-none ${
                          isDraggingThis
                            ? 'scale-[1.02] shadow-2xl ring-2 ring-sky-400 cursor-grabbing opacity-95'
                            : 'hover:shadow-xl cursor-grab active:cursor-grabbing'
                        }`}
                      >
                        {renderWidget(wId)}
                      </div>
                    );
                  })}
              </div>
            </main>
          ) : (
            /* 12-DIVISION SNAP GRID LAYOUT */
            <div className="w-full flex-grow flex flex-col gap-3">
              <main
                id="main-canvas-grid-container"
                className="w-full flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-2 sm:gap-2.5 [grid-auto-flow:dense] items-start transition-all duration-300"
              >
                {widgetOrder
                  .filter((id) => widgetVisibility[id])
                  .filter((id) => !(config?.stageManagerMode && collapsedWidgetIds.includes(id)))
                  .map((wId) => renderWidget(wId))}

                {/* Dedicated bottom drop target */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverWidgetId !== '__bottom_drop_target__') {
                      setDragOverWidgetId('__bottom_drop_target__');
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverWidgetId === '__bottom_drop_target__') {
                      setDragOverWidgetId(null);
                    }
                  }}
                  onDrop={(e) => handleDrop(e, '__bottom_drop_target__')}
                  className={`col-span-full border-2 border-dashed rounded-3xl p-4 flex items-center justify-center transition-all cursor-pointer ${
                    dragOverWidgetId === '__bottom_drop_target__'
                      ? 'border-teal-400 bg-teal-500/15 text-teal-300 scale-[1.01] shadow-md'
                      : 'border-white/20 bg-slate-900/40 text-slate-400 hover:border-teal-400 hover:text-teal-300 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold pointer-events-none">
                    <span className="text-lg">📥</span>
                    <span>위젯 상단 바를 이곳으로 드래그하면 화면 맨 아래 빈 공간으로 안전하게 배치됩니다</span>
                  </div>
                </div>
              </main>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Edit or Add Work Link (요구사항 5) */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  {editingLinkId ? '업무 바로가기 사이트 수정' : '새 업무 바로가기 사이트 추가'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                닫기
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">사이트 명칭</label>
                <input
                  type="text"
                  value={linkFormTitle}
                  onChange={(e) => setLinkFormTitle(e.target.value)}
                  placeholder="예: 나이스(NEIS), K-에듀파인, 캔바 에듀, 인디스쿨"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">웹사이트 URL 주소</label>
                <input
                  type="text"
                  value={linkFormUrl}
                  onChange={(e) => setLinkFormUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  아이콘 이미지 주소 (사용자가 이미지 주소를 넣으면 그대로 반영)
                </label>
                <input
                  type="text"
                  value={linkFormIconUrl}
                  onChange={(e) => setLinkFormIconUrl(e.target.value)}
                  placeholder="예: https://example.com/logo.png (비워두면 기본 배지 표시)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none"
                />
                {linkFormIconUrl && (
                  <div className="mt-2 flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[11px] text-slate-500 font-medium">미리보기:</span>
                    <img
                      src={linkFormIconUrl}
                      alt="Icon Preview"
                      className="w-7 h-7 object-contain rounded-lg border border-slate-200 bg-white"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveLink}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1 shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                <span>저장하기</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: School Messenger Monthly Statistics & Google Sheets Export (요구사항 6) */}
      {isStatsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    학교 메신저 쪽지 월별 통계 및 구글 스프레드시트 정리
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    월단위 쪽지 내용을 구글 스프레드시트 양식으로 복사하거나 CSV로 다운로드합니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStatsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                닫기
              </button>
            </div>

            {/* Overview Summary Cards */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <div className="text-[11px] font-bold text-slate-500">전체 등록 쪽지</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{memos.length}건</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                <div className="text-[11px] font-bold text-emerald-700">처리 완료</div>
                <div className="text-xl font-black text-emerald-900 mt-0.5">
                  {memos.filter((m) => m.completed).length}건
                </div>
              </div>
              <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200 text-center">
                <div className="text-[11px] font-bold text-blue-700">진행 중 (미완료)</div>
                <div className="text-xl font-black text-blue-900 mt-0.5">
                  {memos.filter((m) => !m.completed).length}건
                </div>
              </div>
            </div>

            {/* Monthly Groups Breakdown */}
            <div className="flex-1 overflow-y-auto custom-scroll space-y-3 pr-1">
              <div className="text-xs font-extrabold text-slate-800">월별 집계 현황</div>
              {getMonthlyStats().map(([monthStr, monthMemos]) => {
                const completedInMonth = monthMemos.filter((m) => m.completed).length;
                const percent = Math.round((completedInMonth / monthMemos.length) * 100);

                return (
                  <div key={monthStr} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-900">
                        📅 {monthStr} ({monthMemos.length}건)
                      </span>
                      <span className="text-[11px] font-bold text-indigo-600">
                        완료율: {completedInMonth}/{monthMemos.length}건 ({percent}%)
                      </span>
                    </div>

                    <div className="space-y-1">
                      {monthMemos.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between text-[11px] py-1 px-2 bg-white rounded-lg border border-slate-100"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-bold text-slate-800 shrink-0">[{m.sender}]</span>
                            <span className="truncate text-slate-600">{m.content}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {m.useDeadline && m.deadline && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-600">
                                마감: {m.deadline.replace('T', ' ')}
                              </span>
                            )}
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                m.completed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {m.completed ? '완료' : '진행중'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions for Google Sheets / CSV */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <span className="text-[11px] text-slate-500">
                구글 시트에 직접 붙여넣거나 CSV 파일로 보관하세요.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyGoogleSheetsData}
                  className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>구글 스프레드시트용 복사</span>
                </button>

                <button
                  type="button"
                  onClick={downloadMonthlyCSV}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>월별 CSV 다운로드</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 학교 메신저 쪽지 등록 AI 모달 (캡처 이미지 붙여넣기 및 Gemini 자동 분석) */}
      <MessengerNoteModal
        isOpen={isMessengerNoteModalOpen}
        onClose={() => setIsMessengerNoteModalOpen(false)}
        onSaveNote={(noteData) => {
          const newMemo: SchoolMessengerItem = {
            id: `memo-${Date.now()}`,
            sender: noteData.sender,
            content: noteData.content,
            deadline: noteData.useDeadline && noteData.deadline ? noteData.deadline : '',
            useDeadline: !!noteData.useDeadline,
            completed: false,
            createdAt: new Date().toISOString(),
          };
          const updatedMemos = [newMemo, ...memos];
          setMemos(updatedMemos);
          try {
            localStorage.setItem('class_work_memos', JSON.stringify(updatedMemos));
          } catch {}
          onShowToast('✉️ 학교 메신저 쪽지가 성공적으로 등록되었습니다.');
        }}
        onShowToast={onShowToast}
      />
    </div>
  );
};
