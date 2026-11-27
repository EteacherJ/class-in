/**
 * ============================================================================
 * [seatingLayout.ts] 자리 배치 공용 로직 (대시보드 위젯 · 보조 모니터 송출 화면 공통)
 * ============================================================================
 * 1) 개인좌석(1열) 분단 구성: 분단별 인원 수를 저장해, 학생을 특정 분단으로 '넣는' 이동을 지원
 *    - 학생 순서(배열)는 그대로 쓰고, 분단은 [앞에서부터 n명씩] 잘라서 만듭니다.
 *    - 분단별 인원 수를 따로 기억하므로 한 분단에 넣어도 다른 분단 학생은 움직이지 않습니다.
 * 2) 모둠 책상 자유 배치: 모둠 카드 안에서 책상 위치를 자유롭게 옮기고 '정렬'로 일정 간격 맞춤
 *    - 위치는 학생 id 기준으로 저장 → 자리 교체 시 위치도 함께 맞바꿉니다.
 * 저장은 localStorage 에 하며, 같은 앱의 다른 창(보조 모니터)에도 즉시 반영됩니다.
 */
import React, { useEffect, useState } from 'react';
import type { Student } from '../types';

const COL_KEY = 'class_seating_column_sizes_v1';
const DESK_KEY = 'class_seating_desk_layout_v1';
export const SEATING_LAYOUT_EVENT = 'classin:seating-layout';

const notify = () => {
  try {
    window.dispatchEvent(new Event(SEATING_LAYOUT_EVENT));
  } catch {}
};

/** 저장값이 바뀔 때(같은 창 또는 다른 창) 다시 그리기 위한 훅 */
export function useSeatingLayoutVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    const bump = () => setV((n) => n + 1);
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === COL_KEY || e.key === DESK_KEY) bump();
    };
    window.addEventListener(SEATING_LAYOUT_EVENT, bump);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(SEATING_LAYOUT_EVENT, bump);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return v;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) 개인좌석 분단 구성
// ─────────────────────────────────────────────────────────────────────────────

/** 기본 분단 인원: 앞 분단부터 같은 수로 채움 (기존 화면과 동일) */
export function defaultColumnSizes(total: number, cols: number): number[] {
  const per = Math.max(1, Math.ceil(total / Math.max(1, cols)));
  const sizes: number[] = [];
  let left = total;
  for (let i = 0; i < cols; i++) {
    const n = Math.max(0, Math.min(per, left));
    sizes.push(n);
    left -= n;
  }
  return sizes;
}

export function getColumnSizes(total: number, cols: number): number[] {
  try {
    const saved = JSON.parse(localStorage.getItem(COL_KEY) || 'null');
    if (
      saved &&
      saved.cols === cols &&
      Array.isArray(saved.sizes) &&
      saved.sizes.length === cols &&
      saved.sizes.every((n: unknown) => Number.isInteger(n) && (n as number) >= 0) &&
      saved.sizes.reduce((a: number, b: number) => a + b, 0) === total
    ) {
      return saved.sizes;
    }
  } catch {}
  return defaultColumnSizes(total, cols);
}

function saveColumnSizes(cols: number, sizes: number[]) {
  try {
    localStorage.setItem(COL_KEY, JSON.stringify({ cols, sizes }));
  } catch {}
  notify();
}

/** 분단 수가 바뀌면 기본 구성으로 되돌림 */
export function resetColumnSizes() {
  try {
    localStorage.removeItem(COL_KEY);
  } catch {}
  notify();
}

/** 학생 배열 → 분단별 학생 목록 (분단 0 = 1분단) */
export function buildColumns<T>(students: T[], cols: number): T[][] {
  const sizes = getColumnSizes(students.length, cols);
  const out: T[][] = [];
  let i = 0;
  for (const n of sizes) {
    out.push(students.slice(i, i + n));
    i += n;
  }
  return out;
}

/**
 * 학생을 다른 분단으로 넣기 (그 분단의 맨 뒤 자리로 이동)
 * @returns 바뀐 학생 배열, 같은 분단이면 null
 */
export function moveStudentToColumn(students: Student[], studentId: number, targetCol: number, cols: number): Student[] | null {
  const sizes = [...getColumnSizes(students.length, cols)];
  const srcIndex = students.findIndex((s) => s.id === studentId);
  if (srcIndex < 0 || targetCol < 0 || targetCol >= cols) return null;
  let acc = 0;
  let srcCol = 0;
  for (let c = 0; c < sizes.length; c++) {
    if (srcIndex < acc + sizes[c]) {
      srcCol = c;
      break;
    }
    acc += sizes[c];
  }
  if (srcCol === targetCol) return null;

  const next = [...students];
  const [moved] = next.splice(srcIndex, 1);
  sizes[srcCol] -= 1;
  const insertAt = sizes.slice(0, targetCol + 1).reduce((a, b) => a + b, 0);
  next.splice(insertAt, 0, moved);
  sizes[targetCol] += 1;
  saveColumnSizes(cols, sizes);
  return next;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) 모둠 책상 자유 배치
// ─────────────────────────────────────────────────────────────────────────────

/** x: 0=왼쪽 끝, 0.5=가운데, 1=오른쪽 끝 (모둠 카드 너비 기준) / y: 줄 번호(소수 허용) */
export interface DeskPos {
  x: number;
  y: number;
}
type DeskLayout = Record<string, Record<string, DeskPos>>;

function readDeskLayout(): DeskLayout {
  try {
    const v = JSON.parse(localStorage.getItem(DESK_KEY) || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}
function writeDeskLayout(layout: DeskLayout) {
  try {
    localStorage.setItem(DESK_KEY, JSON.stringify(layout));
  } catch {}
  notify();
}

/** 기본 배치: 홀수 인원이면 맨 앞줄 가운데 1명, 나머지는 2명씩 (예: 5명 → 1·2·2) */
export function autoDeskSlots(n: number): DeskPos[] {
  const slots: DeskPos[] = [];
  let row = 0;
  if (n % 2 === 1) {
    slots.push({ x: 0.5, y: 0 });
    row = 1;
  }
  while (slots.length < n) {
    slots.push({ x: 0, y: row });
    if (slots.length < n) slots.push({ x: 1, y: row });
    row++;
  }
  return slots;
}

/** 모둠의 책상 위치 (저장된 위치가 없으면 기본 배치, 새로 들어온 학생은 빈 자리에) */
export function getTeamDeskPositions(teamId: number, studentIds: number[]): Record<number, DeskPos> {
  const saved = readDeskLayout()[String(teamId)] || {};
  const hasCustom = studentIds.some((id) => saved[String(id)]);
  if (!hasCustom) {
    const slots = autoDeskSlots(studentIds.length);
    return Object.fromEntries(studentIds.map((id, i) => [id, slots[i]]));
  }
  const out: Record<number, DeskPos> = {};
  const missing: number[] = [];
  studentIds.forEach((id) => {
    const p = saved[String(id)];
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) out[id] = { x: p.x, y: p.y };
    else missing.push(id);
  });
  // 새로 들어온 학생: 마지막 줄 다음에 2명씩
  let row = Math.ceil(Math.max(-1, ...Object.values(out).map((p) => p.y)) + 1);
  missing.forEach((id, i) => {
    out[id] = { x: i % 2 === 0 ? 0 : 1, y: row };
    if (i % 2 === 1) row++;
  });
  return out;
}

export function hasCustomDeskLayout(teamId: number): boolean {
  const t = readDeskLayout()[String(teamId)];
  return !!t && Object.keys(t).length > 0;
}

export function setTeamDeskPositions(teamId: number, positions: Record<number, DeskPos>) {
  const layout = readDeskLayout();
  layout[String(teamId)] = Object.fromEntries(Object.entries(positions).map(([id, p]) => [id, { x: round(p.x), y: round(p.y) }]));
  writeDeskLayout(layout);
}

export function resetDeskLayout(teamId?: number) {
  if (teamId === undefined) writeDeskLayout({});
  else {
    const layout = readDeskLayout();
    delete layout[String(teamId)];
    writeDeskLayout(layout);
  }
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * 정렬: 자유롭게 놓은 책상을 일정한 간격으로 맞춤
 *  - 세로: 가까운 줄로 맞춘 뒤 빈 줄 없이 차례로 (줄 간격 일정)
 *  - 가로: 왼쪽 / 가운데 / 오른쪽 세 위치 중 가까운 곳 (한 줄에 2명이면 왼쪽·오른쪽)
 *  - 한 줄에 3명 이상이 몰리면 넘치는 책상은 바로 아래 새 줄로
 */
export function alignDeskPositions(positions: Record<number, DeskPos>): Record<number, DeskPos> {
  const entries = Object.entries(positions).map(([id, p]) => ({ id: Number(id), x: p.x, y: p.y, row: Math.round(p.y) }));
  const rows = new Map<number, typeof entries>();
  entries.forEach((e) => {
    const list = rows.get(e.row) || [];
    list.push(e);
    rows.set(e.row, list);
  });
  const out: Record<number, DeskPos> = {};
  let r = 0;
  [...rows.keys()]
    .sort((a, b) => a - b)
    .forEach((key) => {
      const list = rows.get(key)!.sort((a, b) => a.x - b.x || a.y - b.y);
      for (let i = 0; i < list.length; i += 2) {
        const pair = list.slice(i, i + 2);
        if (pair.length === 1) {
          const x = pair[0].x;
          out[pair[0].id] = { x: x < 0.25 ? 0 : x > 0.75 ? 1 : 0.5, y: r };
        } else {
          out[pair[0].id] = { x: 0, y: r };
          out[pair[1].id] = { x: 1, y: r };
        }
        r++;
      }
    });
  return out;
}

/** 두 학생 자리 교체 시 책상 위치도 맞바꿈 (같은 모둠·다른 모둠 모두) */
export function swapDeskPositions(aId: number, aTeam: number, bId: number, bTeam: number) {
  const layout = readDeskLayout();
  const pa = layout[String(aTeam)]?.[aId];
  const pb = layout[String(bTeam)]?.[bId];
  if (!pa && !pb) return; // 두 모둠 모두 기본 배치면 순서 교체만으로 충분
  if (layout[String(aTeam)]) delete layout[String(aTeam)][aId];
  if (layout[String(bTeam)]) delete layout[String(bTeam)][bId];
  // A 자리로 B가, B 자리로 A가 들어감
  if (pa) (layout[String(aTeam)] ||= {})[bId] = pa;
  if (pb) (layout[String(bTeam)] ||= {})[aId] = pb;
  writeDeskLayout(layout);
}

/** 학생이 다른 모둠으로 옮겨 갈 때 이전 모둠의 위치 정보 정리 */
export function forgetDeskPosition(studentId: number, teamId: number) {
  const layout = readDeskLayout();
  if (layout[String(teamId)]?.[studentId]) {
    delete layout[String(teamId)][studentId];
    writeDeskLayout(layout);
  }
}

/** 모든 모둠 책상을 정렬해 저장 */
export function alignAllTeams(groups: { teamId: number; studentIds: number[] }[]) {
  const layout = readDeskLayout();
  groups.forEach(({ teamId, studentIds }) => {
    if (studentIds.length === 0) return;
    const aligned = alignDeskPositions(getTeamDeskPositions(teamId, studentIds));
    layout[String(teamId)] = Object.fromEntries(Object.entries(aligned).map(([id, p]) => [id, p]));
  });
  writeDeskLayout(layout);
}

/** 학생 배열에서 학생을 다른 모둠으로 옮김 (책상은 그 모둠의 빈 자리로) */
export function moveStudentToTeam(students: Student[], studentId: number, teamId: number): Student[] | null {
  const s = students.find((x) => x.id === studentId);
  if (!s || s.teamId === teamId) return null;
  forgetDeskPosition(studentId, s.teamId);
  return students.map((x) => (x.id === studentId ? { ...x, teamId } : x));
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) 교사 시점 / 학생 시점 (대시보드 위젯 · 보조 모니터 공용, 한쪽에서 바꾸면 함께 바뀜)
//    - 학생 시점: 칠판이 화면 위, 1모둠·1분단이 왼쪽
//    - 교사 시점: 칠판이 화면 아래 (교탁에서 바라본 모습, 앞뒤·좌우가 모두 뒤집힘)
// ─────────────────────────────────────────────────────────────────────────────
export type SeatingPerspective = 'teacher' | 'student';
const PERSP_KEY = 'class_seating_perspective';
const PERSP_EVENT = 'classin:seating-perspective';

export function getSeatingPerspective(): SeatingPerspective {
  try {
    return localStorage.getItem(PERSP_KEY) === 'student' ? 'student' : 'teacher';
  } catch {
    return 'teacher';
  }
}

export function setSeatingPerspective(p: SeatingPerspective) {
  try {
    localStorage.setItem(PERSP_KEY, p);
  } catch {}
  window.dispatchEvent(new CustomEvent(PERSP_EVENT, { detail: p }));
  try {
    const ch = new BroadcastChannel('classin_seating_perspective');
    ch.postMessage(p);
    setTimeout(() => ch.close(), 500);
  } catch {}
}

export function useSeatingPerspective(): [SeatingPerspective, (p: SeatingPerspective) => void] {
  const [p, setP] = useState<SeatingPerspective>(getSeatingPerspective);
  useEffect(() => {
    const on = () => setP(getSeatingPerspective());
    const onStorage = (e: StorageEvent) => e.key === PERSP_KEY && on();
    window.addEventListener(PERSP_EVENT, on);
    window.addEventListener('storage', onStorage);
    let ch: BroadcastChannel | null = null;
    try {
      ch = new BroadcastChannel('classin_seating_perspective');
      ch.onmessage = on;
    } catch {}
    return () => {
      window.removeEventListener(PERSP_EVENT, on);
      window.removeEventListener('storage', onStorage);
      ch?.close();
    };
  }, []);
  return [p, setSeatingPerspective];
}

// ── 🪑 좌석 보기 설정(개인/모둠 · 열 수 · 분단 이름 · 이름 크기) 공유 ──
//  위젯과 보조 화면(같은 창 팝업 · 다른 창) 어디서 바꿔도 모두 함께 바뀌어요.
export const SEATING_SETTING_KEYS = [
  'class_seating_view_type',
  'class_seating_individual_columns',
  'class_seating_team_columns',
  'class_seating_custom_col_names',
  'class_seating_name_scale',
] as const;
export const SEATING_SETTING_EVENT = 'classin:seating-setting';

export function writeSeatingSetting(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* 무시 */ }
  try { window.dispatchEvent(new CustomEvent(SEATING_SETTING_EVENT, { detail: { key, value } })); } catch { /* 무시 */ }
}

/** 다른 곳에서 좌석 보기 설정을 바꾸면 cb(key, value) 를 불러 줘요 */
export function useSeatingSettingSync(cb: (key: string, value: string | null) => void) {
  const ref = React.useRef(cb);
  ref.current = cb;
  React.useEffect(() => {
    const onCustom = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d && d.key) ref.current(d.key, d.value ?? null);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key && (SEATING_SETTING_KEYS as readonly string[]).includes(e.key)) ref.current(e.key, e.newValue);
    };
    window.addEventListener(SEATING_SETTING_EVENT, onCustom);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(SEATING_SETTING_EVENT, onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
}
