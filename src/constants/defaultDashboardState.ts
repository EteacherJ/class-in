/**
 * ============================================================================
 * 🏫 [defaultDashboardState.ts] 표준 기본 대시보드 레이아웃 프리셋 상수
 * ============================================================================
 * 새로운 브라우저 프로필, 시크릿 모드, 다른 PC 등 로컬 스토리지가 비어 있거나
 * 구버전/오염된 상태일 때 항상 일관되고 완벽한 표준 학급 보드 화면을 보장합니다.
 */

import { SidebarLayoutMode, WidgetPlacementMode } from '../types';
import { WidgetSpan } from '../components/ResizableWidgetCard';

/**
 * 1. 캔버스 기본 줌 배율 (100% 고정 권장값)
 */
export const DEFAULT_CANVAS_ZOOM = 1.0;

/**
 * 2. 사이드바 스택 기본 모드 (좌측 위젯스택 + 중앙 메인캔버스 + 우측 메모스택 3분할)
 */
export const DEFAULT_SIDEBAR_LAYOUT_MODE: SidebarLayoutMode = 'BOTH';

/**
 * 3. 메인 캔버스 5대 핵심 표준 위젯 (선생님 필수 기본 위젯)
 * 1) attendance : [스마트 전자 출결 관리]
 * 2) timetable  : [수업 시간표 & 교시 흐름]
 * 3) calendar   : [구글 캘린더 & 학급 일정]
 * 4) noise      : [교실 소음 데시벨 측정기]
 * 5) agenda     : [학급 알림 & 이벤트 / 오늘의 다짐]
 */
export const DEFAULT_MAIN_WIDGET_IDS = [
  'attendance',
  'timetable',
  'calendar',
  'noise',
  'agenda',
] as const;

/**
 * 전체 기본 위젯 순서 (5대 핵심 위젯을 최상단 1, 2행에 배치하고 기타 도구는 후순위 정렬)
 */
export const DEFAULT_WIDGET_ORDER: string[] = [
  'attendance',
  'timetable',
  'calendar',
  'noise',
  'picker',
  'agenda',
  'youtube',
  'clock',
  'seating',
  'roles',
  'meal',
  'dday',
  'observation',
  'schoolInfo',
  'quote',
  'ideanote',
  'seqtimer',
  'homework',
  'subject-timetable',
  'subject-roster',
  'subject-journal',
];

/**
 * 4. 12분할 그리드 황금비율 크기(colSpan) 정의:
 * - 1행: attendance(6) + timetable(6) = 12칸 (상단 5:5 꽉 찬 배치)
 * - 2행: calendar(4) + noise(4) + agenda(4) = 12칸 (중단 3등분 황금비율 배치)
 */
export const DEFAULT_WIDGET_SPANS: Record<string, WidgetSpan> = {
  attendance: 6, // 12분할 중 6칸 (너비 50%)
  timetable: 6,  // 12분할 중 6칸 (너비 50%)
  calendar: 4,   // 12분할 중 4칸 (너비 33.3%)
  noise: 4,      // 12분할 중 4칸 (너비 33.3%)
  picker: 4,     // 12분할 중 4칸 (너비 33.3%)
  agenda: 4,     // 12분할 중 4칸 (너비 33.3%)
  bookmarks: 4,  // 12분할 중 4칸 (너비 33.3%)
  youtube: 6,    // 12분할 중 6칸 (16:9 와이드)
  timer: 4,      // 12분할 중 4칸
  clock: 4,      // 12분할 중 4칸
  seating: 6,    // 12분할 중 6칸
  roles: 4,      // 12분할 중 4칸
  meal: 4,       // 12분할 중 4칸
  dday: 4,       // 12분할 중 4칸
  observation: 4,// 12분할 중 4칸
  schoolInfo: 4, // 12분할 중 4칸
  quote: 4,      // 12분할 중 4칸
  ideanote: 4,   // 12분할 중 4칸 (아이디어 카드 스택 위젯)
  seqtimer: 4,   // 순차 타이머
  homework: 4,   // 과제 · 알림장 검사
  'subject-timetable': 8, // 전담 다중 시간표 (12분할 8칸)
  'subject-roster': 6,    // 반별 명렬표 및 모둠 (12분할 6칸)
  'subject-journal': 6,   // 수업 태도 및 형성평가 기록장 (12분할 6칸)
};

/**
 * 5. 자유 이동(Freeform) 모드 초기 좌표 및 크기 정의 (12분할 그리드와 동일한 구조)
 */
export const DEFAULT_FREE_POSITIONS: Record<
  string,
  { x: number; y: number; width: number; height: number }
> = {
  attendance: { x: 20, y: 20, width: 340, height: 380 },
  timetable: { x: 380, y: 20, width: 340, height: 380 },
  calendar: { x: 740, y: 20, width: 340, height: 380 },
  noise: { x: 20, y: 420, width: 340, height: 380 },
  picker: { x: 380, y: 420, width: 340, height: 380 },
  agenda: { x: 740, y: 420, width: 340, height: 380 },
  bookmarks: { x: 740, y: 420, width: 340, height: 380 },
  youtube: { x: 20, y: 820, width: 700, height: 420 },
  timer: { x: 740, y: 820, width: 340, height: 380 },
  ideanote: { x: 380, y: 1260, width: 340, height: 380 },
  'postit-init-1': { x: 20, y: 1260, width: 320, height: 270 },
};

/**
 * 6. 기본 표준 대시보드 전체 상태 모델
 */
export interface StandardDashboardState {
  version: number;
  canvasZoom: number;
  sidebarLayoutMode: SidebarLayoutMode;
  placementMode: WidgetPlacementMode;
  widgetOrder: string[];
  widgetSpans: Record<string, WidgetSpan>;
  hiddenWidgetIds: string[];
  collapsedWidgetIds: string[];
  pinnedWidgetIds: string[];
  freeWidgetPositions: Record<string, { x: number; y: number; width: number; height: number }>;
}

export const DEFAULT_DASHBOARD_STATE: StandardDashboardState = {
  version: 2026,
  canvasZoom: DEFAULT_CANVAS_ZOOM,
  sidebarLayoutMode: DEFAULT_SIDEBAR_LAYOUT_MODE,
  placementMode: 'grid',
  widgetOrder: DEFAULT_WIDGET_ORDER,
  widgetSpans: DEFAULT_WIDGET_SPANS,
  hiddenWidgetIds: [],
  collapsedWidgetIds: [],
  pinnedWidgetIds: [],
  freeWidgetPositions: DEFAULT_FREE_POSITIONS,
};

/**
 * 7. 안전한 상태 초기화(Hydration & Fallback) 로직
 * - localStorage에 데이터가 없거나 구버전/오염된 경우 DEFAULT_DASHBOARD_STATE로 자동 정규화 및 저장
 */
export function getHydratedDashboardState(): StandardDashboardState {
  try {
    const rawOrder = localStorage.getItem('class_dashboard_widget_order');
    const rawSpans = localStorage.getItem('class_dashboard_widget_spans');
    const rawZoom = localStorage.getItem('class_dashboard_canvas_zoom');
    const rawSidebar = localStorage.getItem('class_dashboard_sidebar_layout_mode');

    // 데이터가 아예 없는 최초 방문 또는 빈 저장소 상태
    if (!rawOrder || !rawSpans) {
      console.log('🔵 [Hydration] 최초 접속 또는 빈 로컬스토리지 감지 -> 표준 기본 레이아웃 적용');
      saveStandardDashboardState(DEFAULT_DASHBOARD_STATE);
      return DEFAULT_DASHBOARD_STATE;
    }

    const parsedOrder: string[] = JSON.parse(rawOrder);
    const parsedSpans: Record<string, WidgetSpan> = JSON.parse(rawSpans);

    // 유효성 검증: 배열이 아니거나 핵심 위젯이 누락된 경우 기본값 복구
    if (!Array.isArray(parsedOrder) || parsedOrder.length < 3) {
      console.warn('🟡 [Hydration] 오염된 위젯 순서 감지 -> 표준 레이아웃 복원');
      saveStandardDashboardState(DEFAULT_DASHBOARD_STATE);
      return DEFAULT_DASHBOARD_STATE;
    }

    // 줌 배율 검증 (비정상 배율 1.5 등이 과도하게 고착된 경우 1.0으로 안전 복원)
    let safeZoom = DEFAULT_CANVAS_ZOOM;
    if (rawZoom) {
      const z = parseFloat(rawZoom);
      if (!isNaN(z) && z >= 0.6 && z <= 1.4) {
        safeZoom = Math.round(z * 10) / 10;
      }
    }

    // 사이드바 모드 검증
    const safeSidebar: SidebarLayoutMode =
      rawSidebar && ['BOTH', 'LEFT_ONLY', 'RIGHT_ONLY', 'NONE'].includes(rawSidebar)
        ? (rawSidebar as SidebarLayoutMode)
        : DEFAULT_SIDEBAR_LAYOUT_MODE;

    return {
      version: 2026,
      canvasZoom: safeZoom,
      sidebarLayoutMode: safeSidebar,
      placementMode: (localStorage.getItem('class_dashboard_placement_mode') as WidgetPlacementMode) || 'grid',
      widgetOrder: parsedOrder,
      widgetSpans: { ...DEFAULT_WIDGET_SPANS, ...parsedSpans },
      hiddenWidgetIds: JSON.parse(localStorage.getItem('class_dashboard_hidden_widgets') || '[]'),
      collapsedWidgetIds: JSON.parse(localStorage.getItem('class_dashboard_collapsed_widgets') || '[]'),
      pinnedWidgetIds: JSON.parse(localStorage.getItem('class_dashboard_pinned_widgets') || '[]'),
      freeWidgetPositions: JSON.parse(
        localStorage.getItem('class_dashboard_free_positions') || JSON.stringify(DEFAULT_FREE_POSITIONS)
      ),
    };
  } catch (err) {
    console.error('🔴 [Hydration] 상태 로드 중 예외 발생 -> 안전 기본값 복구:', err);
    saveStandardDashboardState(DEFAULT_DASHBOARD_STATE);
    return DEFAULT_DASHBOARD_STATE;
  }
}

/**
 * 8. 표준 기본 레이아웃을 로컬 스토리지에 일괄 저장하는 헬퍼
 */
export function saveStandardDashboardState(state: StandardDashboardState = DEFAULT_DASHBOARD_STATE): void {
  try {
    localStorage.setItem('class_dashboard_canvas_zoom', String(state.canvasZoom));
    localStorage.setItem('class_dashboard_sidebar_layout_mode', state.sidebarLayoutMode);
    localStorage.setItem('class_dashboard_placement_mode', state.placementMode);
    localStorage.setItem('class_dashboard_widget_order', JSON.stringify(state.widgetOrder));
    localStorage.setItem('class_dashboard_widget_spans', JSON.stringify(state.widgetSpans));
    localStorage.setItem('class_dashboard_hidden_widgets', JSON.stringify(state.hiddenWidgetIds));
    localStorage.setItem('class_dashboard_collapsed_widgets', JSON.stringify(state.collapsedWidgetIds));
    localStorage.setItem('class_dashboard_pinned_widgets', JSON.stringify(state.pinnedWidgetIds));
    localStorage.setItem('class_dashboard_free_positions', JSON.stringify(state.freeWidgetPositions));
    // 💡 위젯바는 항상 노출 상태(false)가 표준 기본값
    localStorage.setItem('class_dashboard_dock_autohide', 'false');
  } catch (err) {
    console.error('🔴 [Storage] 표준 대시보드 상태 저장 실패:', err);
  }
}
