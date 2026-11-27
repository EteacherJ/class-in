/**
 * 🌅 날짜별 아침활동 (아침 화면)
 *  - 날마다 주제 · 안내사항 · (선택) 글쓰기 주제와 쓰는 방법
 *  - 그날 등록한 것이 없으면 같은 요일에 '매주 반복'으로 정한 것을 보여 줘요
 */
import { useEffect, useState } from 'react';

export const MA_KEY = 'class_morning_activities_v1';
const EVT = 'classin:morning-activity';

export interface MorningActivity {
  topic: string;
  guide: string;
  writingOn: boolean;
  writingTopic: string;
  writingHow: string;
  /** 같은 요일마다 반복 */
  weekly?: boolean;
}
export const EMPTY_MA: MorningActivity = { topic: '', guide: '', writingOn: false, writingTopic: '', writingHow: '' };

const pad = (n: number) => String(n).padStart(2, '0');
export const dkey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

type Store = Record<string, MorningActivity>;
export function readMA(): Store {
  try {
    const v = JSON.parse(localStorage.getItem(MA_KEY) || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}
export function saveMA(date: string, a: MorningActivity | null) {
  const s = readMA();
  if (!a || (!a.topic.trim() && !a.guide.trim() && !a.writingTopic.trim())) delete s[date];
  else s[date] = a;
  // 오래된 기록 정리 (120일 넘은 날짜, 매주 반복은 남김)
  const cut = dkey(new Date(Date.now() - 120 * 864e5));
  Object.keys(s).forEach((k) => {
    if (/^\d{4}-/.test(k) && k < cut && !s[k].weekly) delete s[k];
  });
  try {
    localStorage.setItem(MA_KEY, JSON.stringify(s));
  } catch {}
  window.dispatchEvent(new Event(EVT));
}
/** 그 날의 아침활동 (없으면 같은 요일 '매주 반복') */
export function activityFor(d: Date, s = readMA()): { a: MorningActivity | null; from: 'day' | 'weekly' | null; date: string } {
  const k = dkey(d);
  if (s[k]) return { a: s[k], from: 'day', date: k };
  const w = Object.entries(s)
    .filter(([key, v]) => v.weekly && new Date(key + 'T00:00').getDay() === d.getDay() && key <= k)
    .sort((x, y) => (x[0] < y[0] ? 1 : -1))[0];
  return w ? { a: w[1], from: 'weekly', date: w[0] } : { a: null, from: null, date: k };
}
export function useMorningActivities(): Store {
  const [s, setS] = useState<Store>(readMA);
  useEffect(() => {
    const re = () => setS(readMA());
    const onStorage = (e: StorageEvent) => e.key === MA_KEY && re();
    window.addEventListener(EVT, re);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(EVT, re);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return s;
}
