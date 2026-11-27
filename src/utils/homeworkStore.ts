/**
 * 📮 과제 · 알림장 검사 저장소 (대시보드 위젯 ↔ 보조화면 공용)
 *  - 과제마다: 이름 · 마감 일시 · 낸 학생(번호 id) · 사정이 있는 학생(면제)
 *  - 하교 시간까지 안 낸 친구가 있으면 보조화면 '청소·종례'에서 알림창
 */
import { useEffect, useState } from 'react';
import type { Student } from '../types';

export const HW_KEY = 'class_homework_tasks_v1';
const EVT = 'classin:homework';

export interface HwTask {
  id: string;
  title: string;
  /** 'homework' 과제 · 'notice' 알림장 확인 · 'form' 가정통신문 회신 */
  kind: 'homework' | 'notice' | 'form';
  /** 마감 'YYYY-MM-DDTHH:mm' (비우면 오늘 하교까지) */
  due: string;
  createdAt: string;
  done: number[];
  excused: number[];
  /** 하교 때 안 낸 친구 알림 */
  alertAtDismissal: boolean;
  closed?: boolean;
}

export const HW_KINDS: Record<HwTask['kind'], { label: string; emoji: string }> = {
  homework: { label: '과제', emoji: '📘' },
  notice: { label: '알림장', emoji: '📒' },
  form: { label: '가정통신문 회신', emoji: '📨' },
};

const pad = (n: number) => String(n).padStart(2, '0');
export const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function readTasks(): HwTask[] {
  try {
    const v = JSON.parse(localStorage.getItem(HW_KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
export function saveTasks(list: HwTask[]) {
  try {
    localStorage.setItem(HW_KEY, JSON.stringify(list));
  } catch {}
  window.dispatchEvent(new Event(EVT));
  try {
    const ch = new BroadcastChannel('class_display_sync_channel');
    ch.postMessage({ type: 'HOMEWORK_UPDATED' });
    ch.close();
  } catch {}
}
export function updateTask(id: string, fn: (t: HwTask) => HwTask) {
  saveTasks(readTasks().map((t) => (t.id === id ? fn(t) : t)));
}
export function toggleDone(id: string, sid: number) {
  updateTask(id, (t) => ({ ...t, done: t.done.includes(sid) ? t.done.filter((x) => x !== sid) : [...t.done, sid], excused: t.excused.filter((x) => x !== sid) }));
}
export function newTask(p: Partial<HwTask>): HwTask {
  return {
    id: `hw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: p.title || '오늘 과제',
    kind: p.kind || 'homework',
    due: p.due || '',
    createdAt: new Date().toISOString(),
    done: [],
    excused: [],
    alertAtDismissal: p.alertAtDismissal ?? true,
  };
}

/** 과제가 '오늘' 확인할 대상인지: 마감이 오늘이거나 지났는데 아직 안 닫은 것, 마감 없음은 만든 날 */
export function isActiveToday(t: HwTask, now = new Date()): boolean {
  if (t.closed) return false;
  const today = ymd(now);
  const dueDay = t.due ? t.due.slice(0, 10) : t.createdAt.slice(0, 10) <= today ? today : t.createdAt.slice(0, 10);
  return dueDay <= today;
}
export function missingOf(t: HwTask, students: Pick<Student, 'id' | 'name' | 'number'>[]) {
  return students.filter((s) => !t.done.includes(s.id) && !t.excused.includes(s.id));
}
export function dueLabel(t: HwTask): string {
  if (!t.due) return '오늘 하교까지';
  const d = new Date(t.due);
  if (isNaN(d.getTime())) return t.due;
  const today = ymd();
  const day = t.due.slice(0, 10) === today ? '오늘' : `${d.getMonth() + 1}/${d.getDate()}(${'일월화수목금토'[d.getDay()]})`;
  return `${day} ${pad(d.getHours())}:${pad(d.getMinutes())}까지`;
}

export function readStudents(): Student[] {
  try {
    const v = JSON.parse(localStorage.getItem('class_dashboard_students') || '[]');
    return Array.isArray(v) ? [...v].sort((a, b) => (a.number || 0) - (b.number || 0)) : [];
  } catch {
    return [];
  }
}

export function useHomework(): [HwTask[], (l: HwTask[]) => void] {
  const [list, setList] = useState<HwTask[]>(readTasks);
  useEffect(() => {
    const re = () => setList(readTasks());
    const onStorage = (e: StorageEvent) => e.key === HW_KEY && re();
    window.addEventListener(EVT, re);
    window.addEventListener('storage', onStorage);
    let ch: BroadcastChannel | null = null;
    try {
      ch = new BroadcastChannel('class_display_sync_channel');
      ch.addEventListener('message', (e) => e.data?.type === 'HOMEWORK_UPDATED' && re());
    } catch {}
    return () => {
      window.removeEventListener(EVT, re);
      window.removeEventListener('storage', onStorage);
      ch?.close();
    };
  }, []);
  return [list, saveTasks];
}
