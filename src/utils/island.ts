/**
 * ============================================================================
 * [island.ts] 다이내믹 아일랜드 알림 이벤트 버스
 * ============================================================================
 * 알림 역할 나누기
 *  - 다이내믹 아일랜드: 타이머 종료 · 모드 전환 · 잠금 · 저장/백업/복원 · 오류 같은 '시스템 알림'
 *  - 루미 말풍선: 가벼운 안내, 대화, 위젯 사용 팁
 */

export const ISLAND_EVENT = 'classin:island';
export const LIVE_TIMER_EVENT = 'classin:live-timer';

export type IslandTone = 'info' | 'success' | 'warning' | 'danger' | 'lock';

export interface IslandNotice {
  message: string;
  icon?: string;
  tone?: IslandTone;
  durationMs?: number;
}

export interface LiveTimerState {
  /** 타이머 구분 (여러 타이머가 있을 때 마지막 실행 중인 것 표시) */
  source: string;
  label: string;
  running: boolean;
  /** 남은 시간(초) */
  secondsLeft: number;
}

export function showIsland(notice: IslandNotice) {
  try {
    window.dispatchEvent(new CustomEvent<IslandNotice>(ISLAND_EVENT, { detail: notice }));
  } catch {}
}

export function publishLiveTimer(state: LiveTimerState) {
  try {
    window.dispatchEvent(new CustomEvent<LiveTimerState>(LIVE_TIMER_EVENT, { detail: state }));
  } catch {}
}

// 시스템 알림 판별 규칙 (토스트 문구 기준)
const SYSTEM_RULES: Array<{ test: RegExp; tone: IslandTone; icon: string }> = [
  { test: /(🔴|오류|실패|불가|거부)/, tone: 'danger', icon: '⚠️' },
  { test: /(잠겼|잠금이 해제|잠금 해제|PIN)/, tone: 'lock', icon: '🔒' },
  { test: /(타이머|뽀모도로).*(종료|끝|완료|다 됐)|시간이 (다 )?(됐|종료)|종료되었습니다.*타이머/, tone: 'warning', icon: '⏰' },
  { test: /(모드로 전환|모드: ON|모드: OFF|모드가 (켜|꺼))/, tone: 'info', icon: '🔄' },
  { test: /(백업|복원|동기화|저장되었|저장했|내보내기|다운로드되었)/, tone: 'success', icon: '☁️' },
  { test: /(업데이트)/, tone: 'info', icon: '⬇️' },
];

/** 토스트 문구가 시스템 알림(아일랜드 대상)인지 판별 */
export function classifySystemNotice(message: string): { tone: IslandTone; icon: string } | null {
  for (const rule of SYSTEM_RULES) if (rule.test.test(message)) return { tone: rule.tone, icon: rule.icon };
  return null;
}

/** 문구 맨 앞 이모지를 떼어 아이콘으로 사용 */
export function splitLeadingEmoji(message: string): { emoji: string | null; text: string } {
  const m = /^\s*(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)\s*/u.exec(message);
  return m ? { emoji: m[1], text: message.slice(m[0].length) } : { emoji: null, text: message };
}
