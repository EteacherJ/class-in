/**
 * 🔔 다음 수업 찾기 (보조화면 쉬는 시간 · 메인 쉬는 시간 모드 공통)
 *  - 지금 시각 + 위젯 시정표(class_dashboard_config.bellSchedule) + 위젯 시간표(class_dashboard_schedule)
 *  - 주간학습안내(PDF)에서 읽은 그 주의 학습 내용 · 쪽수(class_weekly_plan_detail_v1)가 있으면 함께
 *  - 주말 · 공휴일 · 재량휴업일은 '수업 없는 날'
 */
import { getDayTypeInfo } from './koreanHolidays';
import { readWeeklyPlanDetail } from './weeklyPlanDetail';

export interface NextLesson {
  period: number;
  subject: string;
  start: string;
  /** 단원 · 학습 내용 (주간학습안내에서) */
  topic: string;
  /** 쪽수 (주간학습안내에서) */
  pages: string;
  /** 📌 안내 칸에 그대로 쓰는 한 줄 */
  info: string;
}
export type NextLessonResult = { kind: 'lesson'; lesson: NextLesson } | { kind: 'done' } | { kind: 'noclass'; label: string };

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const DEFAULT_BELLS = [
  { period: 1, start: '09:00' },
  { period: 2, start: '09:50' },
  { period: 3, start: '10:40' },
  { period: 4, start: '11:30' },
  { period: 5, start: '13:00' },
  { period: 6, start: '13:50' },
];

const toMin = (s: string) => {
  const m = String(s || '').match(/(\d{1,2})\s*:\s*(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
};
const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const mondayStr = (d: Date) => {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return ymd(m);
};
const readJson = <T,>(key: string, fb: T): T => {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fb;
  } catch {
    return fb;
  }
};

export function readBells(): { period: number; start: string }[] {
  const cfg = readJson<any>('class_dashboard_config', null) || readJson<any>('class_config', {});
  const src: any[] = Array.isArray(cfg?.bellSchedule) && cfg.bellSchedule.length ? cfg.bellSchedule : DEFAULT_BELLS;
  return src
    .filter((b) => b && b.start && Number(b.period) > 0 && b.enabled !== false && String(b.type || 'period').toLowerCase() !== 'lunch')
    .map((b) => ({ period: Number(b.period), start: String(b.start) }))
    .filter((b) => !isNaN(toMin(b.start)))
    .sort((a, b) => toMin(a.start) - toMin(b.start));
}

/** 그 날 그 교시의 과목 (시간표 위젯과 같은 저장소) */
export function subjectAt(day: string, period: number): string {
  const sched = readJson<Record<string, any[]>>('class_dashboard_schedule', null as any) || readJson<Record<string, any[]>>('smart_dashboard_timetable', {});
  const list = Array.isArray(sched?.[day]) ? sched[day] : [];
  const item = list.find((p: any) => p && Number(p.period) === Number(period));
  return String(item?.subject || '').trim();
}

/** 그 주 주간학습안내의 학습 내용 · 쪽수 (과목이 같을 때만) */
export function detailAt(now: Date, day: string, period: number, subject: string): { topic: string; pages: string } {
  const det = readWeeklyPlanDetail();
  if (!det || det.weekStart !== mondayStr(now)) return { topic: '', pages: '' };
  const c = det.days?.[day]?.[period];
  if (!c) return { topic: '', pages: '' };
  const same = (a: string, b: string) => a.replace(/\s/g, '') === b.replace(/\s/g, '');
  if (subject && c.subject && !same(c.subject, subject)) return { topic: '', pages: '' };
  return { topic: c.topic || '', pages: c.pages || '' };
}

export function lessonInfo(period: number, subject: string, topic: string, pages: string): string {
  return `${period}교시 [${subject}]${topic ? ` • ${topic}` : ''}${pages ? ` (${pages})` : ''}`;
}

export function computeNextLesson(now = new Date()): NextLessonResult {
  const dt = getDayTypeInfo(now);
  if (dt.isNoClass) return { kind: 'noclass', label: dt.holidayName || dt.label };
  const day = DAYS[now.getDay()];
  const nowMin = now.getHours() * 60 + now.getMinutes();
  // 그 날 시간표에 과목이 있는 교시만 (예: 월요일 5교시까지면 6교시 종은 건너뜀)
  const dayHasSchedule = readBells().some((b) => subjectAt(day, b.period));
  const next = readBells().find((b) => toMin(b.start) > nowMin && (!dayHasSchedule || subjectAt(day, b.period)));
  if (!next) return { kind: 'done' };
  const subject = subjectAt(day, next.period) || '수업';
  const { topic, pages } = detailAt(now, day, next.period, subject);
  return {
    kind: 'lesson',
    lesson: { period: next.period, subject, start: next.start, topic, pages, info: lessonInfo(next.period, subject, topic, pages) },
  };
}
