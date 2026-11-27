/**
 * 🎂 생일 축하 신호 (대시보드 → 보조창)
 * - 대시보드의 [축하 파티] 버튼이 신호를 보내면, 열려 있는 보조창(앱 안 · 분리된 창)이 어느 탭을 보고 있든 축하 화면을 띄웁니다.
 * - 보조창이 응답하지 않으면(열려 있지 않으면) 호출한 쪽이 보조창을 열고, 보조창은 열리자마자 대기 중인 축하를 재생합니다.
 */
import type { Student } from '../types';

export interface BirthdayKid {
  number: number;
  name: string;
}
export interface CelebrateMsg {
  type: 'celebrate' | 'ack';
  id: number;
  kids?: BirthdayKid[];
}

const CH = 'classin_celebrate_channel';
const KEY = 'classin_celebrate_pending_v1';

/** 오늘 생일인 학생 (금요일이면 주말 생일도 함께) */
export function findBirthdayKids(students: Student[], today = new Date()): { today: BirthdayKid[]; weekend: BirthdayKid[]; upcoming: (BirthdayKid & { md: string; days: number })[] } {
  const md = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const bmd = (s: Student) => (s.birthDate && /^\d{4}-\d{2}-\d{2}/.test(s.birthDate) ? s.birthDate.slice(5, 10) : '');
  const kid = (s: Student): BirthdayKid => ({ number: s.number, name: s.name });
  const sorted = [...students].sort((a, b) => a.number - b.number);
  const t = md(today);
  const todayKids = sorted.filter((s) => bmd(s) === t).map(kid);
  const weekend: BirthdayKid[] = [];
  if (today.getDay() === 5) {
    for (const add of [1, 2]) {
      const d = new Date(today);
      d.setDate(today.getDate() + add);
      weekend.push(...sorted.filter((s) => bmd(s) === md(d)).map(kid));
    }
  }
  const upcoming: (BirthdayKid & { md: string; days: number })[] = [];
  for (let add = 1; add <= 7; add++) {
    const d = new Date(today);
    d.setDate(today.getDate() + add);
    for (const s of sorted) if (bmd(s) === md(d)) upcoming.push({ ...kid(s), md: `${d.getMonth() + 1}월 ${d.getDate()}일`, days: add });
  }
  return { today: todayKids, weekend, upcoming };
}

/** 축하 신호 보내기 → 보조창이 받으면 true */
export function sendBirthdayCelebration(kids: BirthdayKid[]): Promise<boolean> {
  const id = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify({ id, kids, at: id }));
  } catch {}
  if (typeof BroadcastChannel === 'undefined') return Promise.resolve(false);
  return new Promise((resolve) => {
    const ch = new BroadcastChannel(CH);
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      ch.close();
      resolve(ok);
    };
    ch.onmessage = (e: MessageEvent<CelebrateMsg>) => {
      if (e.data?.type === 'ack' && e.data.id === id) finish(true);
    };
    ch.postMessage({ type: 'celebrate', id, kids } as CelebrateMsg);
    window.setTimeout(() => finish(false), 700);
  });
}

/** 보조창: 축하 신호 듣기 (열릴 때 대기 중인 축하도 재생) */
export function listenBirthdayCelebration(onCelebrate: (kids: BirthdayKid[]) => void): () => void {
  const shownKey = 'classin_celebrate_shown';
  const play = (id: number, kids: BirthdayKid[]) => {
    try {
      if (sessionStorage.getItem(shownKey) === String(id)) return;
      sessionStorage.setItem(shownKey, String(id));
    } catch {}
    onCelebrate(kids);
  };
  // 열리자마자: 15초 안에 보낸 축하가 있으면 재생
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (p && Date.now() - p.at < 15000 && Array.isArray(p.kids)) play(p.id, p.kids);
  } catch {}
  if (typeof BroadcastChannel === 'undefined') return () => {};
  const ch = new BroadcastChannel(CH);
  ch.onmessage = (e: MessageEvent<CelebrateMsg>) => {
    if (e.data?.type !== 'celebrate' || !e.data.kids) return;
    ch.postMessage({ type: 'ack', id: e.data.id } as CelebrateMsg);
    play(e.data.id, e.data.kids);
  };
  return () => ch.close();
}
