/**
 * 🖥️ 보조창(우리 반 큰 화면) 공용 설정
 *  - 탭 목록 · 순서 · 숨기기
 *  - 시간표 따라 자동 전환 켜기/끄기
 *  - 잠깐 가리기
 *  - 대시보드 리모컨에서 함께 씀
 */
import { useEffect, useState } from 'react';

export type DisplayTabId = 'morning' | 'attendance' | 'drawing' | 'timer' | 'break' | 'seating' | 'clean' | 'roles' | 'picker' | 'bracket' | 'score' | 'qr' | 'homework';

export const DISPLAY_TABS: { id: DisplayTabId; label: string; emoji: string }[] = [
  { id: 'morning', label: '아침 화면', emoji: '🌅' },
  { id: 'attendance', label: '등교 터치', emoji: '✋' },
  { id: 'homework', label: '과제 제출', emoji: '📮' },
  { id: 'drawing', label: '판서 모드', emoji: '✏️' },
  { id: 'timer', label: '타이머/시계', emoji: '⏱️' },
  { id: 'break', label: '쉬는시간', emoji: '☕' },
  { id: 'seating', label: '좌석·모둠', emoji: '🪑' },
  { id: 'clean', label: '청소·종례', emoji: '🧹' },
  { id: 'roles', label: '1인 1역', emoji: '🙋' },
  { id: 'picker', label: '발표자 뽑기', emoji: '🎲' },
  { id: 'bracket', label: '대진표', emoji: '🏆' },
  { id: 'score', label: '점수판', emoji: '🔢' },
  { id: 'qr', label: 'QR 띄우기', emoji: '🔳' },
];

const LAYOUT_KEY = 'dm_tab_layout_v1';
const AUTO_KEY = 'dm_auto_switch';
const TOUCH_KEY = 'dm_touch_mode';
const EVT = 'classin:display-prefs';

export interface TabLayout {
  order: DisplayTabId[];
  hidden: DisplayTabId[];
}

export function getTabLayout(): TabLayout {
  try {
    const v = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null');
    if (v && Array.isArray(v.order)) {
      const known = DISPLAY_TABS.map((t) => t.id);
      const order = [...v.order.filter((id: DisplayTabId) => known.includes(id)), ...known.filter((id) => !v.order.includes(id))];
      return { order, hidden: (v.hidden || []).filter((id: DisplayTabId) => known.includes(id)) };
    }
  } catch {}
  return { order: DISPLAY_TABS.map((t) => t.id), hidden: [] };
}
export function setTabLayout(l: TabLayout) {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(l));
  } catch {}
  window.dispatchEvent(new Event(EVT));
}

const readBool = (k: string, fb = false) => {
  try {
    const v = localStorage.getItem(k);
    return v === null ? fb : v === 'true';
  } catch {
    return fb;
  }
};
export const getAutoSwitch = () => readBool(AUTO_KEY, false);
export function setAutoSwitch(on: boolean) {
  try {
    localStorage.setItem(AUTO_KEY, String(on));
  } catch {}
  window.dispatchEvent(new Event(EVT));
}
export const getTouchMode = () => readBool(TOUCH_KEY, false);
export function setTouchMode(on: boolean) {
  try {
    localStorage.setItem(TOUCH_KEY, String(on));
  } catch {}
  window.dispatchEvent(new Event(EVT));
}

/** 설정이 바뀌면 (다른 창 포함) 다시 그리기 */
export function useDisplayPrefs() {
  const [v, setV] = useState(0);
  useEffect(() => {
    const bump = () => setV((n) => n + 1);
    const onStorage = (e: StorageEvent) => {
      if (!e.key || [LAYOUT_KEY, AUTO_KEY, TOUCH_KEY].includes(e.key)) bump();
    };
    window.addEventListener(EVT, bump);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(EVT, bump);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return { version: v, layout: getTabLayout(), auto: getAutoSwitch(), touch: getTouchMode() };
}

// ── 시정표 ───────────────────────────────────────────────
export interface Bell {
  period: number;
  start: string;
  end: string;
  isLunch?: boolean;
}
export function getBellSchedule(): Bell[] {
  try {
    const raw = localStorage.getItem('class_dashboard_config') || localStorage.getItem('class_config');
    const cfg = raw ? JSON.parse(raw) : null;
    // 시정표를 따로 저장하지 않았다면 환경설정에 보이는 기본 시정표와 같게
    const list =
      Array.isArray(cfg?.bellSchedule) && cfg.bellSchedule.length
        ? cfg.bellSchedule
        : [
            { period: 1, start: '09:00', end: '09:40' },
            { period: 2, start: '09:50', end: '10:30' },
            { period: 3, start: '10:40', end: '11:20' },
            { period: 4, start: '11:30', end: '12:10' },
            { period: 5, start: '13:00', end: '13:40' },
            { period: 6, start: '13:50', end: '14:30' },
          ];
    return list
      .filter((b: any) => b && b.start && b.end && b.enabled !== false)
      .map((b: any) => ({ period: Number(b.period), start: String(b.start).trim().padStart(5, '0'), end: String(b.end).trim().padStart(5, '0'), isLunch: /lunch|점심/i.test(String(b.type || b.label || '')) }))
      // 비어 있거나 잘못 들어간 칸(00:00, 끝 ≤ 시작)은 빼요
      .filter((b: Bell) => /^\d{2}:\d{2}$/.test(b.start) && /^\d{2}:\d{2}$/.test(b.end) && b.start !== '00:00' && b.end > b.start)
      .sort((a: Bell, b: Bell) => a.start.localeCompare(b.start));
  } catch {
    return [];
  }
}
const toMin = (t: string) => {
  const [h, m] = t.split(':').map((x) => parseInt(x, 10) || 0);
  return h * 60 + m;
};

/** 오늘 시간표에서 과목이 들어 있는 마지막 교시 (비어 있으면 null) */
function lastClassPeriodToday(now: Date): number | null {
  try {
    const sched = JSON.parse(localStorage.getItem('class_dashboard_schedule') || 'null');
    const day = ['일', '월', '화', '수', '목', '금', '토'][now.getDay()];
    const list = Array.isArray(sched?.[day]) ? sched[day] : [];
    const ps = list.filter((p: any) => p && String(p.subject || '').trim()).map((p: any) => Number(p.period)).filter((n: number) => n > 0);
    return ps.length ? Math.max(...ps) : null;
  } catch {
    return null;
  }
}

export type AutoPhase = 'morning' | 'drawing' | 'break' | 'clean';
/**
 * 지금 시각에 맞는 화면 (자동 ON) — 시정표 + 오늘 시간표 연동
 *  - 수업 전 (1교시 시작 전, 아침 6시부터): 아침 화면
 *  - 수업 중 (교시 시작 ~ 끝): 판서 모드
 *  - 쉬는 시간 (교시와 교시 사이, 점심시간 포함): 쉬는시간
 *  - 오늘 시간표의 마지막 수업이 끝난 뒤 (저녁 6시까지): 청소·종례
 *  - 그 밖(주말 · 밤): null → 화면을 바꾸지 않아요
 */
export function phaseNow(now = new Date()): { phase: AutoPhase | null; key: string; label: string } {
  const none = { phase: null, key: '', label: '' };
  const day = now.getDay();
  if (day === 0 || day === 6) return none;
  let bells = getBellSchedule().filter((b) => !b.isLunch);
  if (!bells.length) return none;
  // 오늘 시간표의 마지막 수업까지만 (시간표가 비어 있으면 시정표 전체)
  const lastP = lastClassPeriodToday(now);
  if (lastP != null) {
    const cut = bells.filter((b) => b.period <= lastP);
    if (cut.length) bells = cut;
  }
  const m = now.getHours() * 60 + now.getMinutes();
  const ymd = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  const first = toMin(bells[0].start);
  const last = toMin(bells[bells.length - 1].end);
  if (m >= 6 * 60 && m < first) return { phase: 'morning', key: `${ymd}-morning`, label: '수업 전' };
  if (m >= last && m < Math.max(18 * 60, last + 60)) return { phase: 'clean', key: `${ymd}-clean`, label: '마지막 수업 뒤' };
  for (let i = 0; i < bells.length; i++) {
    const s = toMin(bells[i].start);
    const e = toMin(bells[i].end);
    if (m >= s && m < e) return { phase: 'drawing', key: `${ymd}-class-${bells[i].period}`, label: `${bells[i].period}교시 수업 중` };
    const ns = i + 1 < bells.length ? toMin(bells[i + 1].start) : -1;
    if (ns > e && m >= e && m < ns) return { phase: 'break', key: `${ymd}-break-${bells[i].period}`, label: `${bells[i].period}교시 뒤 쉬는 시간` };
  }
  return none;
}

/** 이번 주 월요일 (뽑기 공정 모드) */
export function weekKey(d = new Date()) {
  const x = new Date(d);
  const diff = x.getDay() === 0 ? -6 : 1 - x.getDay();
  x.setDate(x.getDate() + diff);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
