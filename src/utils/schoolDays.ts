/**
 * 🌇 수업일수 계산 · 퇴근 별 (하루 한 개씩 켜져요)
 * - 1학기: 1학기 개학일 ~ 여름방학 시작 전날, 2학기: 2학기 개학일 ~ 겨울방학 시작 전날
 * - 평일(월~금)에서 법정 공휴일·대체공휴일을 자동으로 빼고, 재량휴업일 등은 선생님이 직접 고쳐요.
 * - 계산값은 선생님이 [확인]을 눌러야 별로 만들어져요.
 */
import { isKoreanHoliday } from './koreanHolidays';

export interface SchoolDayInputs {
  s1Start?: string;
  summerStart?: string;
  s2Start?: string;
  winterStart?: string;
  off?: number;
  extra?: number;
}
export interface SchoolDayCalc {
  weekdays: number;
  holidays: number;
  holidayNames: string[];
  off: number;
  extra: number;
  total: number;
  valid: boolean;
  problem?: string;
  sig: string;
}

const parse = (s?: string) => {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const eachDay = (from: Date, toExclusive: Date, fn: (d: Date) => void) => {
  const d = new Date(from);
  let guard = 0;
  while (d < toExclusive && guard++ < 400) {
    fn(new Date(d));
    d.setDate(d.getDate() + 1);
  }
};

export function schoolDaySig(i: SchoolDayInputs) {
  return [i.s1Start, i.summerStart, i.s2Start, i.winterStart, i.off || 0, i.extra || 0].join('|');
}

export function calcSchoolDays(i: SchoolDayInputs): SchoolDayCalc {
  const off = Math.max(0, Math.round(i.off || 0));
  const extra = Math.max(0, Math.round(i.extra || 0));
  const base = { weekdays: 0, holidays: 0, holidayNames: [] as string[], off, extra, total: 0, valid: false, sig: schoolDaySig(i) };
  const a = parse(i.s1Start), b = parse(i.summerStart), c = parse(i.s2Start), e = parse(i.winterStart);
  if (!a || !b || !c || !e) return { ...base, problem: '네 날짜를 모두 입력해 주세요' };
  if (!(a < b && b <= c && c < e)) return { ...base, problem: '날짜 순서를 확인해 주세요 (1학기 개학 → 여름방학 → 2학기 개학 → 겨울방학)' };
  let weekdays = 0;
  let holidays = 0;
  const names: string[] = [];
  const visit = (d: Date) => {
    const w = d.getDay();
    if (w === 0 || w === 6) return;
    weekdays++;
    if (isKoreanHoliday(d.getFullYear(), d.getMonth() + 1, d.getDate())) {
      holidays++;
      names.push(`${d.getMonth() + 1}/${d.getDate()}`);
    }
  };
  eachDay(a, b, visit);
  eachDay(c, e, visit);
  const total = Math.max(0, weekdays - holidays - off + extra);
  return { ...base, weekdays, holidays, holidayNames: names, total, valid: true };
}

/** 이 날이 수업일인가요? (학기 중 평일 · 공휴일 아님) */
export function isSchoolDay(d: Date, i: SchoolDayInputs) {
  const a = parse(i.s1Start), b = parse(i.summerStart), c = parse(i.s2Start), e = parse(i.winterStart);
  if (!a || !b || !c || !e) return false;
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const w = day.getDay();
  if (w === 0 || w === 6) return false;
  if (isKoreanHoliday(day.getFullYear(), day.getMonth() + 1, day.getDate())) return false;
  return (day >= a && day < b) || (day >= c && day < e);
}

/** 오늘 이전에 지난 수업일 날짜들 (처음 확인할 때 미리 켜 둘 별) */
export function pastSchoolDays(i: SchoolDayInputs, today = new Date()): string[] {
  const out: string[] = [];
  const a = parse(i.s1Start), e = parse(i.winterStart);
  if (!a || !e) return out;
  const end = new Date(Math.min(e.getTime(), new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()));
  eachDay(a, end, (d) => {
    if (isSchoolDay(d, i)) out.push(dateKey(d));
  });
  return out;
}

// ⭐ 별 저장소
export interface StarStore { total: number; sig: string; lit: string[] }
const STAR_KEY = 'class_leave_stars_v1';
export function readStars(): StarStore | null {
  try {
    const v = JSON.parse(localStorage.getItem(STAR_KEY) || 'null');
    return v && typeof v.total === 'number' && Array.isArray(v.lit) ? v : null;
  } catch {
    return null;
  }
}
export function writeStars(s: StarStore) {
  try {
    localStorage.setItem(STAR_KEY, JSON.stringify(s));
    window.dispatchEvent(new CustomEvent('classin-stars-changed'));
  } catch {}
}
/** 확인한 수업일수로 별판을 만들어요 (같은 학기 날짜는 켜진 별을 그대로 둬요) */
export function setupStars(total: number, sig: string, prefill: string[] | null) {
  const prev = readStars();
  const keep = prev ? prev.lit : [];
  const lit = Array.from(new Set([...(prefill || []), ...keep])).sort().slice(0, total);
  writeStars({ total, sig, lit });
}
/** 오늘 별 켜기: 이미 켰거나 수업일이 아니면 false */
export function lightTodayStar(i: SchoolDayInputs, today = new Date()): { lit: boolean; store: StarStore | null } {
  const s = readStars();
  if (!s) return { lit: false, store: null };
  const k = dateKey(today);
  if (s.lit.includes(k) || !isSchoolDay(today, i) || s.lit.length >= s.total) return { lit: false, store: s };
  const next = { ...s, lit: [...s.lit, k] };
  writeStars(next);
  return { lit: true, store: next };
}
