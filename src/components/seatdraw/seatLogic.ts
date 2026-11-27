/**
 * 🎰 자리 뽑기 — 자리 모양(위젯 기준) · 배정 계산 · 기록
 *  - 개인 자리: 위젯의 분단 수 · 분단별 인원 그대로 (학생 배열 순서 = 1분단 앞자리부터)
 *  - 모둠 자리: 위젯의 모둠 · 모둠별 인원 그대로 (책상 모양은 위젯의 기본 배치와 같음)
 */
import type { Student, Team } from '../../types';
import { autoDeskSlots, getColumnSizes } from '../../utils/seatingLayout';

export type DrawMode = 'ind' | 'team';
export type Gender = 'M' | 'F' | 'A';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SeatSlot {
  key: string;
  mode: DrawMode;
  /** 개인: 분단(0부터) / 모둠: 모둠 칸의 순서 */
  col: number;
  /** 개인: 앞에서부터 줄(0부터) / 모둠: 모둠 칸 안의 줄 */
  row: number;
  teamId?: number;
  idx: number;
  /** 칠판에 가까운 앞자리 구역인지 */
  front: boolean;
  /** 같은 묶음(분단 또는 모둠) */
  group: number;
  /** 모둠 책상 격자 위치 (학생 시점: x 0·0.5·1, y 0=칠판 쪽) */
  gx?: number;
  gy?: number;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TeamBox {
  team: Team;
  rect: Rect;
  count: number;
  /** 책상 격자 (드래그로 모양 바꿀 때 씀) */
  grid: { cx: number; top: number; dw: number; dh: number; rows: number };
}

export interface Layout {
  mode: DrawMode;
  slots: SeatSlot[];
  teamBoxes: TeamBox[];
  colRects: Rect[];
}

const ROW_NAMES = ['첫째', '둘째', '셋째', '넷째', '다섯째', '여섯째', '일곱째', '여덟째', '아홉째', '열째'];
export const rowName = (r: number) => `${ROW_NAMES[r] || `${r + 1}번째`} 줄`;

/** 모둠별 인원 (위젯 기준). 모둠이 없는 학생은 가장 적은 모둠에 넣어 계산 */
export function teamCounts(students: Student[], teams: Team[]): { team: Team; count: number }[] {
  const list = teams.map((t) => ({ team: t, count: students.filter((s) => s.teamId === t.id).length }));
  const orphan = students.filter((s) => !teams.some((t) => t.id === s.teamId)).length;
  for (let i = 0; i < orphan; i++) {
    const min = list.reduce((a, b) => (b.count < a.count ? b : a), list[0]);
    if (min) min.count++;
  }
  return list.filter((x) => x.count > 0);
}

/** 자리 모양 만들기 (화면 좌표 포함) — 칠판이 위(학생 시점) */
export interface ShapeEdit {
  /** 개인 자리: 자리 key → 왼쪽 위 좌표(무대 px) */
  ind?: Record<string, { x: number; y: number }>;
  /** 모둠 자리: 모둠 id → 자리 순서별 격자 위치 (학생 시점) */
  team?: Record<string, { x: number; y: number }[]>;
}

/** 위젯과 같은 기본 모둠 책상 모양 (학생 시점) — 5명이면 2·2·1 (혼자 자리는 뒤쪽 가운데) */
export function defaultTeamGrid(n: number): { x: number; y: number }[] {
  const a = autoDeskSlots(n);
  const maxY = Math.max(0, ...a.map((d) => d.y));
  // 위젯 저장 좌표(교사 시점) → 학생 시점: 좌우 · 앞뒤 뒤집기
  return a.map((d) => ({ x: 1 - d.x, y: maxY - d.y }));
}

export function buildLayout(mode: DrawMode, students: Student[], teams: Team[], cols: number, teamCols: number, area: Rect, shape: ShapeEdit = {}): Layout {
  const N = students.length;
  if (mode === 'ind') {
    const sizes = getColumnSizes(N, cols);
    const maxRows = Math.max(1, ...sizes);
    const gapC = cols >= 5 ? 22 : 36;
    const colW = (area.w - gapC * (cols - 1)) / cols;
    const w = Math.min(190, colW);
    const gapR = 10;
    const h = Math.min(62, (area.h - gapR * (maxRows - 1)) / maxRows);
    const totalW = cols * w + (cols - 1) * gapC;
    const x0 = area.x + (area.w - totalW) / 2;
    const slots: SeatSlot[] = [];
    const colRects: Rect[] = [];
    sizes.forEach((n, c) => {
      const x = x0 + c * (w + gapC);
      colRects.push({ x: x - 6, y: area.y - 6, w: w + 12, h: maxRows * (h + gapR) - gapR + 12 });
      for (let r = 0; r < n; r++) {
        const key = `c${c}-r${r}`;
        const o = shape.ind?.[key];
        slots.push({
          key,
          mode,
          col: c,
          row: r,
          idx: r,
          front: r === 0,
          group: c,
          label: `${c + 1}분단 ${rowName(r)}`,
          x: o ? Math.max(area.x, Math.min(area.x + area.w - w, o.x)) : x,
          y: o ? Math.max(area.y, Math.min(area.y + area.h - h, o.y)) : area.y + r * (h + gapR),
          w,
          h,
        });
      }
    });
    return { mode, slots, teamBoxes: [], colRects };
  }
  const tc = teamCounts(students, teams);
  const tcols = Math.max(1, Math.min(teamCols, tc.length));
  const trows = Math.max(1, Math.ceil(tc.length / tcols));
  const gap = 22;
  const bw = (area.w - gap * (tcols - 1)) / tcols;
  const bh = (area.h - gap * (trows - 1)) / trows;
  const slots: SeatSlot[] = [];
  const teamBoxes: TeamBox[] = [];
  tc.forEach(({ team, count }, i) => {
    const bc = i % tcols;
    const br = Math.floor(i / tcols);
    const rect = { x: area.x + bc * (bw + gap), y: area.y + br * (bh + gap), w: bw, h: bh };
    const saved = shape.team?.[String(team.id)];
    const ds = saved && saved.length === count ? saved : defaultTeamGrid(count);
    const rowsN = Math.max(1, ...ds.map((d) => d.y + 1));
    const innerTop = rect.y + 34;
    const innerH = rect.h - 44;
    const dh = Math.min(56, (innerH - 8 * (rowsN - 1)) / rowsN);
    const dw = Math.min(150, (rect.w - 36) / 2);
    const cx = rect.x + rect.w / 2;
    const top = innerTop + (innerH - (rowsN * dh + (rowsN - 1) * 8)) / 2;
    teamBoxes.push({ team, rect, count, grid: { cx, top, dw, dh, rows: rowsN } });
    ds.forEach((d, k) => {
      slots.push({
        key: `t${team.id}-${k}`,
        mode: 'team',
        col: i,
        row: d.y,
        teamId: team.id,
        idx: k,
        front: br === 0,
        group: team.id,
        gx: d.x,
        gy: d.y,
        label: `${team.name} ${k + 1}번 자리`,
        x: cx - dw - 4 + d.x * (dw + 8),
        y: top + d.y * (dh + 8),
        w: dw,
        h: dh,
      });
    });
  });
  return { mode, slots, teamBoxes, colRects: [] };
}

/** 지금 위젯에 앉아 있는 그대로의 자리 (교사 지정 배치의 기본값) */
export function currentAssignment(layout: Layout, students: Student[], teams: Team[], cols: number): Record<number, string> {
  const map: Record<number, string> = {};
  if (layout.mode === 'ind') {
    const sizes = getColumnSizes(students.length, cols);
    let i = 0;
    sizes.forEach((n, c) => {
      for (let r = 0; r < n; r++) {
        const s = students[i++];
        if (s) map[s.id] = `c${c}-r${r}`;
      }
    });
    return map;
  }
  const used = new Set<string>();
  const byTeam = new Map<number, SeatSlot[]>();
  layout.slots.forEach((s) => {
    if (!byTeam.has(s.teamId!)) byTeam.set(s.teamId!, []);
    byTeam.get(s.teamId!)!.push(s);
  });
  const leftover: Student[] = [];
  students.forEach((st) => {
    const free = (byTeam.get(st.teamId) || []).find((s) => !used.has(s.key));
    if (free) {
      used.add(free.key);
      map[st.id] = free.key;
    } else leftover.push(st);
  });
  leftover.forEach((st) => {
    const free = layout.slots.find((s) => !used.has(s.key));
    if (free) {
      used.add(free.key);
      map[st.id] = free.key;
    }
  });
  void teams;
  return map;
}

export interface DrawOptions {
  frontIds: number[];
  balanceGender: boolean;
  altGender: boolean;
  avoidPrevMates: boolean;
  avoidSameSeat: boolean;
  apart: [number, number][];
}

export interface HistoryRec {
  date: string;
  mode: DrawMode;
  map: Record<number, string>;
  group: Record<number, number>;
  names: Record<number, string>;
  /** 그때의 자리 모양 (지난 기록을 그대로 다시 그리려고) */
  cols?: number;
  teamCols?: number;
  n?: number;
  shape?: ShapeEdit;
}

const HKEY = 'class_seatdraw_history_v1';
export function readHistory(): HistoryRec[] {
  try {
    const v = JSON.parse(localStorage.getItem(HKEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
export function clearHistory() {
  try {
    localStorage.removeItem(HKEY);
  } catch {}
}
export function pushHistory(rec: HistoryRec) {
  try {
    localStorage.setItem(HKEY, JSON.stringify([rec, ...readHistory()].slice(0, 12)));
  } catch {}
}

const shuffle = <T,>(a: T[]): T[] => {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};

/** 두 자리가 붙어 있는지 (개인: 앞뒤 · 옆 / 모둠: 같은 모둠) */
export function isNear(a: SeatSlot, b: SeatSlot): boolean {
  if (a.mode === 'team') return a.group === b.group;
  return (a.col === b.col && Math.abs(a.row - b.row) === 1) || (a.row === b.row && Math.abs(a.col - b.col) === 1);
}

/** 조건을 지키면서 무작위 배정 (여러 번 섞어 보고 가장 잘 맞는 것) */
export function assignRandom(layout: Layout, students: { id: number; gender: Gender }[], opt: DrawOptions, prev: HistoryRec | null): Record<number, string> {
  const slots = layout.slots;
  const byKey = new Map(slots.map((s) => [s.key, s]));
  const frontSet = new Set(opt.frontIds.filter((id) => students.some((s) => s.id === id)));
  // 앞자리 구역: 앞줄부터, 모자라면 다음 줄까지
  const ordered = [...slots].sort((a, b) => (a.mode === 'ind' ? a.row - b.row : a.front === b.front ? a.row - b.row : a.front ? -1 : 1));
  const nFront = frontSet.size;
  let frontPool = ordered.filter((s) => s.front);
  if (frontPool.length < nFront) frontPool = ordered.slice(0, nFront);
  const gender = new Map(students.map((s) => [s.id, s.gender]));
  const totalM = students.filter((s) => s.gender === 'M').length;
  const N = students.length;
  // 지난 기록의 짝 · 모둠
  const prevNear = new Set<string>();
  if (prev && prev.mode === layout.mode) {
    const ids = Object.keys(prev.map).map(Number);
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const a = byKey.get(prev.map[ids[i]]);
        const b = byKey.get(prev.map[ids[j]]);
        if (a && b && isNear(a, b)) prevNear.add(ids[i] < ids[j] ? `${ids[i]}-${ids[j]}` : `${ids[j]}-${ids[i]}`);
      }
  }
  const score = (m: Record<number, string>) => {
    let p = 0;
    const seatOf = (id: number) => byKey.get(m[id])!;
    const ids = students.map((s) => s.id);
    // 떨어져 앉기
    opt.apart.forEach(([a, b]) => {
      if (m[a] && m[b] && isNear(seatOf(a), seatOf(b))) p += 60;
    });
    if (opt.avoidSameSeat && prev && prev.mode === layout.mode)
      ids.forEach((id) => {
        if (prev.map[id] === m[id]) p += 3;
        // 모둠 자리: 지난번과 같은 모둠에 또 들어가지 않게
        else if (layout.mode === 'team' && prev.group[id] != null && prev.group[id] === seatOf(id).group) p += 2;
      });
    if (opt.avoidPrevMates && prevNear.size) {
      for (let i = 0; i < ids.length; i++)
        for (let j = i + 1; j < ids.length; j++) {
          const k = ids[i] < ids[j] ? `${ids[i]}-${ids[j]}` : `${ids[j]}-${ids[i]}`;
          if (prevNear.has(k) && isNear(seatOf(ids[i]), seatOf(ids[j]))) p += layout.mode === 'team' ? 2 : 4;
        }
    }
    if (layout.mode === 'team' && opt.balanceGender && N) {
      const g = new Map<number, { n: number; m: number }>();
      ids.forEach((id) => {
        const s = seatOf(id);
        const v = g.get(s.group) || { n: 0, m: 0 };
        v.n++;
        if (gender.get(id) === 'M') v.m++;
        g.set(s.group, v);
      });
      g.forEach((v) => {
        const d = v.m - (v.n * totalM) / N;
        p += d * d * 4;
      });
    }
    if (layout.mode === 'ind' && opt.altGender) {
      const at = new Map<string, number>();
      ids.forEach((id) => at.set(m[id], id));
      slots.forEach((s) => {
        const below = at.get(`c${s.col}-r${s.row + 1}`);
        const me = at.get(s.key);
        if (below != null && me != null) {
          const a = gender.get(me);
          const b = gender.get(below);
          if (a && b && a !== 'A' && a === b) p += 1.5;
        }
      });
    }
    return p;
  };
  let best: Record<number, string> = {};
  let bestP = Infinity;
  const tries = N > 30 ? 500 : 900;
  for (let t = 0; t < tries; t++) {
    const m: Record<number, string> = {};
    const fp = shuffle(frontPool);
    const used = new Set<string>();
    [...frontSet].forEach((id, i) => {
      if (fp[i]) {
        m[id] = fp[i].key;
        used.add(fp[i].key);
      }
    });
    const rest = shuffle(slots.filter((s) => !used.has(s.key)));
    shuffle(students.filter((s) => !m[s.id])).forEach((s, i) => {
      if (rest[i]) m[s.id] = rest[i].key;
    });
    const p = score(m);
    if (p < bestP) {
      bestP = p;
      best = m;
      if (p === 0) break;
    }
  }
  return best;
}

/** 모둠 자리 결과 → 위젯 책상 위치 (교사 시점 저장 좌표) */
export function teamDeskPositions(layout: Layout, map: Record<number, string>): Record<number, Record<number, { x: number; y: number }>> {
  const out: Record<number, Record<number, { x: number; y: number }>> = {};
  const byKey = new Map(layout.slots.map((s) => [s.key, s]));
  layout.teamBoxes.forEach((b) => {
    const mine = layout.slots.filter((s) => s.teamId === b.team.id);
    const maxY = Math.max(0, ...mine.map((s) => s.gy ?? 0));
    out[b.team.id] = {};
    Object.entries(map).forEach(([id, k]) => {
      const s = byKey.get(k);
      if (s && s.teamId === b.team.id) out[b.team.id][+id] = { x: 1 - (s.gx ?? 0), y: maxY - (s.gy ?? 0) };
    });
  });
  return out;
}

/** 결과를 학생 명단에 반영: 개인=배열 순서, 모둠=모둠 번호 + 순서 */
export function applyToStudents(layout: Layout, students: Student[], map: Record<number, string>): Student[] {
  const byKey = new Map(layout.slots.map((s) => [s.key, s]));
  const placed = students.filter((s) => map[s.id] && byKey.has(map[s.id]));
  const order = (s: Student) => {
    const k = byKey.get(map[s.id])!;
    return layout.mode === 'ind' ? k.col * 1000 + k.row : k.col * 1000 + k.idx;
  };
  const sorted = [...placed].sort((a, b) => order(a) - order(b)).map((s) => (layout.mode === 'team' ? { ...s, teamId: byKey.get(map[s.id])!.teamId! } : s));
  const rest = students.filter((s) => !placed.includes(s));
  return [...sorted, ...rest];
}
