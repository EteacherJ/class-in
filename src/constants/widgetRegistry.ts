/**
 * ============================================================================
 * [widgetRegistry.ts] 위젯 이름 단일 정의 (Single Source of Truth)
 * ============================================================================
 * 위젯 카드 제목 · 위젯바 · 환경설정 · 업무 모드 · 보관함 등 앱 전체에서
 * 같은 위젯은 반드시 같은 이름으로 보이도록, 이름은 이 파일에서만 정의합니다.
 *
 * [표기 원칙]
 *  1) 한글 우선 (영문 브랜드명 사용하지 않음)
 *  2) 짧고 명확하게 (기능 설명은 desc 에)
 *  3) 접속 기호는 가운뎃점(·)으로 통일  예) 자리·모둠 관리
 */

export interface WidgetRegistryItem {
  /** 화면 표시 이름 */
  name: string;
  /** 대표 이모지 */
  emoji: string;
  /** 한 줄 설명 (위젯바 · 환경설정 툴팁) */
  desc: string;
}

export const WIDGET_REGISTRY = {
  clock: { name: '뽀모도로 타이머', emoji: '🍅', desc: '집중 시간과 쉬는 시간을 나눠 관리하는 타이머' },
  timer: { name: '수업 타이머', emoji: '⏱️', desc: '활동 시간을 재는 카운트다운 타이머' },
  homework: { name: '과제 · 알림장 검사', emoji: '📮', desc: '과제명 · 마감 · 학생별 체크리스트 (보조화면 터치 제출)' },
  seqtimer: { name: '순차 타이머', emoji: '🪜', desc: '준비 → 활동 → 발표처럼 단계별로 이어지는 수업 타이머' },
  noise: { name: '소음 측정', emoji: '🔊', desc: '교실 소음을 실시간으로 보여주는 측정기' },
  picker: { name: '발표자 추천', emoji: '🎲', desc: '공정한 무작위 발표자 뽑기' },
  meal: { name: '오늘의 급식', emoji: '🍚', desc: '식단·알레르기 정보 (나이스 연동)' },
  seating: { name: '자리·모둠 관리', emoji: '🪑', desc: '자리 배치와 모둠 편성' },
  attendance: { name: '출결 관리', emoji: '📋', desc: '출석·결석·지각과 건강 상태 기록' },
  roles: { name: '1인 1역', emoji: '👥', desc: '학급 역할 배정과 실천 점검' },
  observation: { name: '관찰·상담 일지', emoji: '📒', desc: '학생 관찰과 상담 기록 (관리자 PIN 보호)' },
  timetable: { name: '수업 시간표', emoji: '📅', desc: '오늘·주간 시간표와 준비물' },
  agenda: { name: '할 일·전달사항', emoji: '📌', desc: '과제, 준비물, 학급 전달사항' },
  calendar: { name: '캘린더', emoji: '🗓️', desc: '학교·학급 일정 (구글 캘린더 연동)' },
  dday: { name: 'D-Day', emoji: '🎯', desc: '주요 행사까지 남은 날' },
  youtube: { name: '유튜브 플레이어', emoji: '▶️', desc: '수업 영상과 배경음악 재생' },
  bookmarks: { name: '바로가기', emoji: '🔖', desc: '나이스·K-에듀파인 등 자주 쓰는 사이트와 프로그램' },
  schoolInfo: { name: '학교 정보', emoji: '🏫', desc: '교무실·행정실 내선번호와 업무 바로가기' },
  quote: { name: '독서 노트', emoji: '📖', desc: '책 속 좋은 문장을 기록하고 함께 감상' },
  postit: { name: '포스트잇 메모', emoji: '📝', desc: '색상을 골라 붙이는 메모' },
  ideanote: { name: '아이디어 노트', emoji: '💡', desc: '떠오른 아이디어와 캡처 이미지를 빠르게 기록' },
  // 업무 모드 전용
  messenger: { name: '메신저 쪽지 정리', emoji: '✉️', desc: '학교 메신저 쪽지 정리와 마감 알림' },
  photo: { name: '학급 사진 액자', emoji: '🖼️', desc: '학급 추억 사진 슬라이드' },
  drafting: { name: '기안문 서식', emoji: '📑', desc: 'K-에듀파인 표준 기안문 서식' },
  // 교과 전담 모드
  'subject-timetable': { name: '반별 통합 시간표', emoji: '📅', desc: '여러 반 시간표와 현재 교시 알림' },
  'subject-roster': { name: '반별 명렬표', emoji: '👥', desc: '반별 학생 명렬표와 모둠 전환' },
  'subject-journal': { name: '반별 수업 기록장', emoji: '📝', desc: '수업 태도와 형성평가 간편 기록' },
} satisfies Record<string, WidgetRegistryItem>;

export type RegisteredWidgetId = keyof typeof WIDGET_REGISTRY;

/** 다른 표기로 저장된 위젯 ID를 표준 ID로 변환 (업무 모드 postIt/links 등) */
const ID_ALIASES: Record<string, RegisteredWidgetId> = {
  postIt: 'postit',
  links: 'bookmarks',
  pomodoro: 'clock',
  todo: 'agenda',
  readingNote: 'quote',
};

export function getWidgetInfo(id: string): WidgetRegistryItem | undefined {
  const key = (ID_ALIASES[id] || id) as RegisteredWidgetId;
  return WIDGET_REGISTRY[key];
}

/** 위젯 표시 이름 (등록되지 않은 ID는 fallback 반환) */
export function getWidgetName(id: string, fallback = '위젯'): string {
  return getWidgetInfo(id)?.name ?? fallback;
}

/**
 * 화면 영역(UI 구역) 공식 명칭
 * - 위젯바: 화면 하단의 도구 막대 (기존: 퀵 독, 위젯 독, QuickDock)
 * - 보관함: 접어 둔 위젯을 모아 두는 곳 (기존: 보관 목록)
 * - 사이드 덱: 화면 옆 세로 위젯 영역 (기존: 사이드덱)
 * - 포커스 모드: 선택한 위젯만 보여주는 집중 화면 (기존: 포커스 덱)
 */
export const UI_AREA_NAMES = {
  dock: '위젯바',
  shelf: '보관함',
  sideDeck: '사이드 덱',
  focus: '포커스 모드',
  stage: '스테이지 매니저',
} as const;
