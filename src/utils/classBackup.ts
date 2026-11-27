/**
 * 💾 전체 백업 · 불러오기 · 🌱 새 학기로 시작
 *  - 백업: 이 컴퓨터에 저장된 Class in 자료(설정 · 명단 · 기록 · 판서 · 메모)를 JSON 파일 하나로
 *  - 불러오기: 그 파일을 고르면 그대로 되돌리고 다시 시작
 *  - 새 학기: 먼저 백업 파일을 받은 뒤, 고른 항목(학생 명단 · 1인 1역 등)만 비워요
 */
import { LARGE_STORE_KEYS, largeGet, largeSet } from './largeStore';

export interface ClassBackup {
  app: 'Class in';
  kind: 'full-backup';
  version: string;
  createdAt: string;
  local: Record<string, string>;
  large: Record<string, string>;
}

const pad = (n: number) => String(n).padStart(2, '0');
const stamp = (d = new Date()) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;

export function buildBackup(version = ''): ClassBackup {
  const local: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) local[k] = localStorage.getItem(k) ?? '';
    }
  } catch {}
  const large: Record<string, string> = {};
  LARGE_STORE_KEYS.forEach((k) => {
    const v = largeGet(k);
    if (v != null) large[k] = v;
  });
  return { app: 'Class in', kind: 'full-backup', version, createdAt: new Date().toISOString(), local, large };
}

/** 백업 파일 내려받기 (파일 이름: Class-in-백업-20260301-0830.json) */
export function downloadBackup(version = '', label = '백업'): string {
  const data = JSON.stringify(buildBackup(version));
  const name = `Class-in-${label}-${stamp()}.json`;
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return name;
}

export async function readBackupFile(file: File): Promise<ClassBackup> {
  const text = await file.text();
  const v = JSON.parse(text);
  if (!v || v.app !== 'Class in' || typeof v.local !== 'object') throw new Error('Class in 백업 파일이 아니에요.');
  return v as ClassBackup;
}

/** 백업 되돌리기 → 새로고침 */
export function restoreBackup(b: ClassBackup) {
  try {
    localStorage.clear();
  } catch {}
  Object.entries(b.local || {}).forEach(([k, v]) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  });
  Object.entries(b.large || {}).forEach(([k, v]) => {
    if ((LARGE_STORE_KEYS as readonly string[]).includes(k)) largeSet(k as (typeof LARGE_STORE_KEYS)[number], v);
  });
  // 큰 저장소가 디스크에 쓰일 시간을 조금 주고 다시 시작
  setTimeout(() => window.location.reload(), 900);
}

export type SemesterPart = 'students' | 'roles' | 'teams' | 'seats' | 'observation' | 'praise' | 'agenda';
export const SEMESTER_PARTS: { id: SemesterPart; label: string; desc: string; on: boolean }[] = [
  { id: 'students', label: '학생 명단', desc: '이름 · 번호 · 출결 · 칭찬 점수', on: true },
  { id: 'roles', label: '1인 1역 배정', desc: '역할 목록은 두고, 맡은 학생 · 기록만 비워요', on: true },
  { id: 'teams', label: '모둠 · 자리', desc: '모둠 구성 · 자리 모양', on: true },
  { id: 'seats', label: '자리 뽑기 · 발표자 기록', desc: '지난 자리 기록 · 뽑힌 횟수', on: true },
  { id: 'praise', label: '칭찬 기록', desc: '칭찬 · 보상 내역', on: true },
  { id: 'observation', label: '학생 관찰 기록', desc: '누가 기록 (백업 파일에는 남아요)', on: false },
  { id: 'agenda', label: '할 일 · 전달사항', desc: '할 일 목록', on: false },
];

const KEYS: Record<SemesterPart, string[]> = {
  students: ['class_dashboard_students', 'class_attendance_last_reset'],
  roles: ['class_roles_daily_checks', 'class_roles_period_feedback', 'class_roles_period_status'],
  teams: ['class_dashboard_teams', 'class_seatdraw_shape_v1', 'class_seatdraw_plan_v1', 'class_seatdraw_gender'],
  seats: ['class_seatdraw_history_v1'],
  praise: ['class_dashboard_praise_logs', 'class_praise_items_cache'],
  observation: ['class_dashboard_observation_records'],
  agenda: ['class_dashboard_agendas'],
};

/** 새 학기: 고른 항목만 비우고 새로고침 (부르기 전에 downloadBackup 먼저) */
export function startNewSemester(parts: SemesterPart[]) {
  const set = new Set(parts);
  set.forEach((p) =>
    KEYS[p].forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {}
    }),
  );
  if (set.has('students')) {
    try {
      localStorage.setItem('class_dashboard_students', '[]');
    } catch {}
  }
  if (set.has('roles') || set.has('students')) {
    try {
      const roles = JSON.parse(localStorage.getItem('class_dashboard_roles') || 'null');
      if (Array.isArray(roles)) {
        localStorage.setItem(
          'class_dashboard_roles',
          JSON.stringify(roles.map((r: Record<string, unknown>) => ({ ...r, currentStudentIds: [], performanceScores: {} }))),
        );
      }
    } catch {}
  }
  try {
    localStorage.setItem('class_new_semester_at', new Date().toISOString());
  } catch {}
  setTimeout(() => window.location.reload(), 400);
}
