/**
 * 🌅 출석 아침 초기화
 *  - 매일 08:00이 지나면 하루 한 번, 모든 학생을 '아직 안 옴(미등교)'으로 되돌려요
 *  - 장기 결석 기간(longTermRange) 안의 학생은 그대로 둬요
 *  - [🔄 출석 리셋] 버튼도 같은 함수를 써요
 */
import type { Student } from '../types';

export const ATTENDANCE_RESET_KEY = 'class_attendance_last_reset';
export const ATTENDANCE_RESET_HOUR = 8;

const pad = (n: number) => String(n).padStart(2, '0');
export const todayStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function resetAttendanceList(list: Student[], now = new Date()): Student[] {
  const today = todayStr(now);
  return list.map((s) => {
    const lt = s.longTermRange;
    if (lt && lt.start && lt.end && lt.start <= today && today <= lt.end) return s;
    const n = { ...s, attendance: 'absent', attendanceCheckedByStudent: false } as Student & Record<string, unknown>;
    n.status = 'absent';
    delete n.attendanceReasonCategory;
    delete n.attendanceReasonDetail;
    delete n.attendanceNote;
    delete n.earlyPeriod;
    delete n.reasonCategory;
    delete n.reasonDetail;
    return n as Student;
  });
}

/** 오늘 아침 초기화를 해야 하는지 (08:00 이후, 오늘 아직 안 했으면) */
export function needsMorningReset(now = new Date()): boolean {
  if (now.getHours() < ATTENDANCE_RESET_HOUR) return false;
  try {
    return localStorage.getItem(ATTENDANCE_RESET_KEY) !== todayStr(now);
  } catch {
    return false;
  }
}
export function markMorningReset(now = new Date()) {
  try {
    localStorage.setItem(ATTENDANCE_RESET_KEY, todayStr(now));
  } catch {}
}

export function broadcastAttendance(students: Student[]) {
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const ch = new BroadcastChannel('class_display_sync_channel');
      ch.postMessage({ type: 'UPDATE_STUDENT_ATTENDANCE', students });
      ch.close();
    }
  } catch {}
}
