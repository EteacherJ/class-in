/**
 * ============================================================================
 * [shortcuts.ts] Class in 키보드 단축키 정의 (단축키 안내판 · 실제 동작 공용)
 * ============================================================================
 * - mod: Windows 는 Ctrl, macOS 는 ⌘(Command)
 * - alt: Windows 는 Alt, macOS 는 ⌥(Option)
 * - 키 판별은 e.code(물리 키) 기준이라 한/영 입력 상태나 맥 Option 특수문자와 무관하게 동작합니다.
 */

export type ShortcutAction =
  | 'lock'
  | 'ideaNote'
  | 'timerToggle'
  | 'settings'
  | 'aiAssistant'
  | 'modeLesson'
  | 'modeBreak'
  | 'modeClean'
  | 'modeQuiz'
  | 'modeWork'
  | 'dualMonitor'
  | 'focusMode'
  | 'collapseDashboard'
  | 'fullscreen'
  | 'help'
  | 'closeTop'
  | 'commandPalette';

export interface ShortcutDef {
  action: ShortcutAction;
  label: string;
  group: '기본' | '화면 모드' | '도구';
  code: string; // KeyboardEvent.code
  mod?: boolean;
  alt?: boolean;
  shift?: boolean;
  /** 화면에 보여줄 키 이름 (code 대신) */
  keyLabel: string;
  /** 글자 입력 중에도 동작할지 */
  worksWhileTyping?: boolean;
  /** 맥에서 키가 다를 때 (예: 전체화면은 맥에서 ⌃⌘F) */
  macKeys?: string[];
}

export const SHORTCUTS: ShortcutDef[] = [
  { action: 'help', label: '단축키 안내 열기', group: '기본', code: 'Slash', shift: true, keyLabel: '?' },
  { action: 'closeTop', label: '열린 창 닫기', group: '기본', code: 'Escape', keyLabel: 'Esc', worksWhileTyping: true },
  { action: 'commandPalette', label: '빠른 실행 (기능 찾기)', group: '기본', code: 'KeyK', mod: true, keyLabel: 'K', worksWhileTyping: true },
  { action: 'settings', label: '환경설정', group: '기본', code: 'Comma', mod: true, keyLabel: ',', worksWhileTyping: true },
  { action: 'lock', label: '화면 잠금', group: '기본', code: 'KeyL', alt: true, keyLabel: 'L', worksWhileTyping: true },
  // 맥은 F11 이 '바탕화면 보기'(시스템 키)라서 맥 표준인 ⌃⌘F 를 써요 (앱 메뉴에서 처리)
  { action: 'fullscreen', label: '전체화면 켜기/끄기', group: '기본', code: 'F11', keyLabel: 'F11', worksWhileTyping: true, macKeys: ['⌃', '⌘', 'F'] },

  { action: 'modeLesson', label: '수업 모드', group: '화면 모드', code: 'Digit1', alt: true, keyLabel: '1', worksWhileTyping: true },
  { action: 'modeBreak', label: '쉬는 시간 모드', group: '화면 모드', code: 'Digit2', alt: true, keyLabel: '2', worksWhileTyping: true },
  { action: 'modeClean', label: '청소·하교 모드', group: '화면 모드', code: 'Digit3', alt: true, keyLabel: '3', worksWhileTyping: true },
  { action: 'modeQuiz', label: '퀴즈 모드', group: '화면 모드', code: 'Digit4', alt: true, keyLabel: '4', worksWhileTyping: true },
  { action: 'modeWork', label: '업무 모드', group: '화면 모드', code: 'Digit5', alt: true, keyLabel: '5', worksWhileTyping: true },
  { action: 'collapseDashboard', label: '대시보드 접기 (바탕화면 루미 문)', group: '화면 모드', code: 'KeyM', alt: true, keyLabel: 'M', worksWhileTyping: true },
  { action: 'focusMode', label: '포커스 모드 켜기/끄기', group: '화면 모드', code: 'KeyF', alt: true, keyLabel: 'F', worksWhileTyping: true },

  { action: 'timerToggle', label: '타이머 시작/일시정지', group: '도구', code: 'Space', keyLabel: 'Space' },
  { action: 'ideaNote', label: '아이디어 빠른 기록', group: '도구', code: 'KeyN', alt: true, keyLabel: 'N', worksWhileTyping: true },
  { action: 'aiAssistant', label: 'AI 비서 루미 열기/닫기', group: '도구', code: 'KeyA', alt: true, keyLabel: 'A', worksWhileTyping: true },
  { action: 'dualMonitor', label: '보조 모니터 송출', group: '도구', code: 'KeyD', alt: true, keyLabel: 'D', worksWhileTyping: true },
];

export const isMacPlatform = (): boolean => {
  try {
    const p = (window as any).electronAPI?.platform;
    if (p) return p === 'darwin';
    return /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);
  } catch {
    return false;
  }
};

/** 단축키를 화면 표기용 키 배열로 변환 (예: ['⌥', 'L'] / ['Alt', 'L']) */
export function formatShortcutKeys(def: ShortcutDef, isMac = isMacPlatform()): string[] {
  if (isMac && def.macKeys) return def.macKeys;
  const keys: string[] = [];
  if (def.mod) keys.push(isMac ? '⌘' : 'Ctrl');
  if (def.alt) keys.push(isMac ? '⌥' : 'Alt');
  if (def.shift && def.keyLabel !== '?') keys.push(isMac ? '⇧' : 'Shift');
  keys.push(def.keyLabel);
  return keys;
}

/** 툴팁용 한 줄 표기 (예: "Alt + L") */
export function shortcutHint(action: ShortcutAction, isMac = isMacPlatform()): string {
  const def = SHORTCUTS.find((s) => s.action === action);
  return def ? formatShortcutKeys(def, isMac).join(isMac ? '' : ' + ') : '';
}

/** 키보드 이벤트가 어떤 단축키에 해당하는지 판별 */
export function matchShortcut(e: KeyboardEvent, isMac = isMacPlatform()): ShortcutDef | undefined {
  const modPressed = isMac ? e.metaKey : e.ctrlKey;
  const otherMod = isMac ? e.ctrlKey : e.metaKey;
  return SHORTCUTS.find((s) => {
    if (s.code !== e.code) return false;
    if (!!s.mod !== modPressed) return false;
    if (!!s.alt !== e.altKey) return false;
    if (s.shift !== undefined && !!s.shift !== e.shiftKey) return false;
    if (otherMod) return false;
    return true;
  });
}

/** 타이머 시작/정지 이벤트 이름 (타이머 위젯들이 수신) */
export const TIMER_TOGGLE_EVENT = 'classin:timer-toggle';

/** 루미 AI 비서 패널 열기/닫기 이벤트 이름 */
export const LUMI_TOGGLE_EVENT = 'classin:lumi-toggle';

/**
 * 📋 특정 화면에서만 쓰는 단축키 (안내 · 환경설정 목록용)
 * - mod 는 Windows Ctrl / 맥 ⌘ 으로 바꿔서 보여 줘요.
 * - 모두 물리 키(e.code) 기준이라 한글 입력 상태에서도 동작해요.
 */
export interface ContextShortcut {
  label: string;
  /** 'Mod' = Ctrl/⌘ · 'Shift' · 'Alt' 는 맥에서 기호로 바뀌어요 */
  keys: string[];
  /** 같은 일을 하는 다른 키 */
  alt?: string[];
  macOnlyAlt?: boolean;
}
export const CONTEXT_SHORTCUTS: { group: string; where: string; items: ContextShortcut[] }[] = [
  {
    group: '위젯 배치',
    where: '위젯 영역',
    items: [
      { label: '방금 바꾼 위젯 배치 되돌리기', keys: ['Mod', 'Z'] },
      { label: '배치 미리보기 적용 (자석 · 새로 정렬 · 열 맞춤 · 배치 불러오기)', keys: ['Enter'] },
      { label: '배치 미리보기 취소', keys: ['Esc'] },
      { label: '화면 배율 키우기/줄이기', keys: ['Mod', '마우스 휠'] },
    ],
  },
  {
    group: '판서 (보조 화면)',
    where: '판서 탭',
    items: [
      { label: '되돌리기', keys: ['Mod', 'Z'] },
      { label: '다시 하기', keys: ['Mod', 'Shift', 'Z'], alt: ['Mod', 'Y'] },
      { label: '선택 도구', keys: ['Mod', 'S'] },
      { label: '펜 · 지우개 · 레이저 · 글상자 · 손', keys: ['P · E · L · T · H'] },
      { label: '누르고 있는 동안 화면 끌어 옮기기', keys: ['Space', '드래그'] },
      { label: '선택한 것 지우기 / 선택 끝내기', keys: ['Delete'], alt: ['Enter'] },
    ],
  },
  {
    group: '보조 화면',
    where: '보조 화면 창',
    items: [
      { label: '화면 잠깐 가리기 켜기/끄기', keys: ['B'] },
      { label: '스톱워치 시작 · 랩 기록', keys: ['Space'] },
    ],
  },
  {
    group: '위젯',
    where: '해당 위젯이 화면에 있을 때',
    items: [
      { label: '뽀모도로 · 순서 타이머 시작/멈춤', keys: ['Space'] },
      { label: '랜덤 뽑기 돌리기', keys: ['R'] },
    ],
  },
];
/** 'Mod' · 'Shift' · 'Alt' 를 운영체제 기호로 */
export function formatContextKeys(keys: string[], isMac = isMacPlatform()): string[] {
  return keys.map((k) => (k === 'Mod' ? (isMac ? '⌘' : 'Ctrl') : k === 'Shift' ? (isMac ? '⇧' : 'Shift') : k === 'Alt' ? (isMac ? '⌥' : 'Alt') : k));
}
/** 맥 앱 메뉴가 맡는 기본 키 (안내용) */
export const MAC_APP_MENU_KEYS: { label: string; keys: string[] }[] = [
  { label: '복사 · 붙여넣기 · 잘라내기 · 전체 선택', keys: ['⌘', 'C · V · X · A'] },
  { label: '창 최소화', keys: ['⌘', 'M'] },
  { label: 'Class in 숨기기', keys: ['⌘', 'H'] },
  { label: 'Class in 끝내기', keys: ['⌘', 'Q'] },
];
