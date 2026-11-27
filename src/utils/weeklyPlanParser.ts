/**
 * ============================================================================
 * 📄 주간학습안내 시간표 판독기 (순수 로직 · 외부 의존 없음)
 * ============================================================================
 * PDF에서 뽑은 글자 조각(위치 포함)을 받아 '요일 × 교시' 표를 찾아 과목을 읽어 냅니다.
 *
 *  1) 글자 조각을 같은 줄끼리 이어 붙여 낱말(토큰)로 만듭니다.
 *  2) "월/화/수/목/금" 머리글이 가로로 늘어서 있으면 요일=열, 세로로 늘어서 있으면 요일=행으로 판단합니다.
 *  3) "1교시, 2, 3…" 같은 교시 머리글로 칸의 경계를 정하고, 각 칸 안의 글자를 모읍니다.
 *  4) 칸 글자에서 가장 먼저 나오는 과목 이름(국어·수학·…·창체·자율 등)을 과목으로 정합니다.
 *  5) 한 요일 전체가 '재량휴업·현장체험학습' 같은 행사로 합쳐진 칸이면 그 요일 모든 교시에 행사명을 넣습니다.
 *  6) 표 위의 날짜(예: 11월 2일 ~ 11월 6일)에서 그 주 월요일을 찾습니다.
 */

export const WEEK_DAYS = ['월', '화', '수', '목', '금'] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];

export interface TextPiece {
  str: string;
  /** 왼쪽 x (pt) */
  x: number;
  /** 글자 기준선 y (위에서부터, pt) */
  y: number;
  w: number;
  /** 글자 크기 (pt) */
  h: number;
}

export interface ParsedWeeklyPlan {
  /** YYYY-MM-DD (그 주 월요일) — 찾지 못하면 null */
  weekStart: string | null;
  /** 요일별 [교시] → 과목 */
  days: Record<WeekDay, Record<number, string>>;
  /** 채워진 칸 수 */
  filled: number;
  maxPeriod: number;
  orientation: 'days-as-columns' | 'days-as-rows';
  /** 칸별 원문 (미리보기·디버그용) */
  cellText: Record<WeekDay, Record<number, string>>;
}

// ── 과목 사전 (긴 이름부터 · 띄어쓰기 무시) ───────────────────────────────
const SUBJECTS: Array<[string, string[]]> = [
  ['국어', ['국어']],
  ['수학', ['수학']],
  ['사회', ['사회']],
  ['과학', ['과학']],
  ['영어', ['영어']],
  ['체육', ['체육']],
  ['음악', ['음악']],
  ['미술', ['미술']],
  ['도덕', ['도덕']],
  ['실과', ['실과']],
  ['바른생활', ['바른생활', '바생']],
  ['슬기로운생활', ['슬기로운생활', '슬생']],
  ['즐거운생활', ['즐거운생활', '즐생']],
  ['통합', ['통합교과', '통합']],
  ['창체', ['창의적체험활동', '창의적 체험활동', '창체']],
  ['자율', ['자율·자치활동', '자율자치활동', '자율활동', '자율']],
  ['자치', ['학급자치', '자치활동', '자치']],
  ['동아리', ['동아리활동', '동아리']],
  ['봉사', ['봉사활동', '봉사']],
  ['진로', ['진로활동', '진로']],
  ['안전', ['안전한생활', '안전교육', '안전']],
  ['정보', ['정보']],
  ['한문', ['한문']],
  ['보건', ['보건']],
  ['독서', ['독서']],
  ['스포츠', ['스포츠클럽', '학교스포츠클럽']],
  ['놀이', ['놀이활동', '놀이']],
];

/** 하루 전체를 차지하는 행사 (합쳐진 칸) */
const EVENTS: Array<[string, RegExp]> = [
  ['재량휴업', /재량\s*휴업|학교장\s*재량/],
  ['개교기념일', /개교\s*기념/],
  ['대체공휴일', /대체\s*공휴일/],
  ['공휴일', /공휴일|휴일|추석|설날|성탄절|어린이날|한글날|개천절|삼일절|현충일|광복절/],
  ['현장체험학습', /현장\s*체험|체험\s*학습|수학\s*여행|수련\s*활동/],
  ['운동회', /운동회|체육\s*대회|스포츠\s*데이/],
  ['학예회', /학예회|발표회|축제/],
  ['방학식', /방학식/],
  ['개학식', /개학식/],
  ['졸업식', /졸업식/],
  ['휴업', /휴업/],
];

const norm = (s: string) => s.replace(/\s+/g, '').replace(/[·•]/g, '·');

/** 칸 맨 위 '과목 머리' 줄인지 (예: "과 학", "자율", "국어") — 글자 사이 띄어쓰기 무시 */
export function exactSubject(text: string): string {
  const t = norm(text).replace(/^[◆◇■□●○★☆▶▷※*\-·]+/, '').replace(/[)）\]]+$/, '');
  if (!t || t.length > 8) return '';
  for (const [name, aliases] of SUBJECTS) if (aliases.some((a) => norm(a) === t)) return name;
  return '';
}

/** 칸 글자에서 과목 이름 하나를 고릅니다 */
export function pickSubject(cell: string): string {
  const t = norm(cell);
  if (!t) return '';
  let best: { idx: number; len: number; name: string } | null = null;
  for (const [name, aliases] of SUBJECTS) {
    for (const a of aliases) {
      const i = t.indexOf(norm(a));
      if (i < 0) continue;
      if (!best || i < best.idx || (i === best.idx && a.length > best.len)) best = { idx: i, len: a.length, name };
    }
  }
  if (best && best.idx <= 12) return best.name;
  const ev = EVENTS.find(([, re]) => re.test(cell));
  if (ev) return ev[0];
  if (best) return best.name;
  // 사전에 없는 과목: 첫 낱말을 짧게
  const first = cell
    .trim()
    .split(/[\s\n(（\[【<:：,，/]/)[0]
    .replace(/^[\d.\-)\]]+/, '')
    .trim();
  return first && /[가-힣A-Za-z]/.test(first) ? first.slice(0, 6) : '';
}

// ── 1) 줄 · 낱말 만들기 ──────────────────────────────────────────────────
interface Token {
  text: string;
  x0: number;
  x1: number;
  y: number; // 기준선
  h: number;
  cx: number;
  cy: number;
}

export function buildTokens(pieces: TextPiece[]): Token[] {
  const ps = pieces
    .filter((p) => p.str && p.str.trim() !== '')
    .map((p) => ({ ...p, h: p.h > 0 ? p.h : 10 }))
    .sort((a, b) => a.y - b.y || a.x - b.x);
  // 같은 줄 묶기
  const lines: TextPiece[][] = [];
  for (const p of ps) {
    const line = lines.find((l) => Math.abs(l[0].y - p.y) < Math.max(2, Math.min(l[0].h, p.h) * 0.45));
    if (line) line.push(p);
    else lines.push([p]);
  }
  const tokens: Token[] = [];
  for (const line of lines) {
    line.sort((a, b) => a.x - b.x);
    let cur: Token | null = null;
    for (const p of line) {
      const gap = cur ? p.x - cur.x1 : Infinity;
      // 같은 낱말: 간격이 글자 크기의 0.55배 이하 (표 칸 경계는 보통 훨씬 넓음)
      if (cur && gap < p.h * 0.55) {
        cur.text += (gap > p.h * 0.18 ? ' ' : '') + p.str;
        cur.x1 = Math.max(cur.x1, p.x + p.w);
        cur.h = Math.max(cur.h, p.h);
      } else {
        if (cur) tokens.push(cur);
        cur = { text: p.str, x0: p.x, x1: p.x + p.w, y: p.y, h: p.h, cx: 0, cy: 0 };
      }
    }
    if (cur) tokens.push(cur);
  }
  for (const t of tokens) {
    t.text = t.text.replace(/\s+/g, ' ').trim();
    t.cx = (t.x0 + t.x1) / 2;
    t.cy = t.y - t.h * 0.35;
  }
  return tokens.filter((t) => t.text);
}

// ── 2) 요일 머리글 찾기 ──────────────────────────────────────────────────
function dayOf(text: string): number {
  const s = text.replace(/\s+/g, '');
  if (s.length > 16) return -1;
  let m = s.match(/^[(（[]?([월화수목금])[)）\]]?$/);
  if (!m) m = s.match(/([월화수목금])요일/);
  if (!m) m = s.match(/[(（]([월화수목금])[)）]/);
  if (!m) m = s.match(/^([월화수목금])[(（[]?\d/);
  if (!m) m = s.match(/\d일([월화수목금])$/);
  if (!m) return -1;
  return WEEK_DAYS.indexOf(m[1] as WeekDay);
}

interface DayHeader {
  day: number;
  cx: number;
  cy: number;
  tok: Token;
}

function findDayHeaders(tokens: Token[]): { orientation: 'days-as-columns' | 'days-as-rows'; heads: DayHeader[] } | null {
  const cands: DayHeader[] = [];
  for (const t of tokens) {
    const d = dayOf(t.text);
    if (d >= 0) cands.push({ day: d, cx: t.cx, cy: t.cy, tok: t });
  }
  if (cands.length < 3) return null;

  const pickGroups = (key: 'cy' | 'cx', tol: number) => {
    const groups: DayHeader[][] = [];
    for (const c of [...cands].sort((a, b) => a[key] - b[key])) {
      const g = groups.find((gr) => Math.abs(gr[0][key] - c[key]) <= tol);
      if (g) g.push(c);
      else groups.push([c]);
    }
    return groups
      .map((g) => {
        // 같은 요일이 겹치면 첫 번째만
        const seen = new Map<number, DayHeader>();
        for (const c of g.sort((a, b) => (key === 'cy' ? a.cx - b.cx : a.cy - b.cy))) if (!seen.has(c.day)) seen.set(c.day, c);
        return [...seen.values()];
      })
      .filter((g) => g.length >= 3);
  };

  const h = Math.max(6, median(cands.map((c) => c.tok.h)));
  const rowGroups = pickGroups('cy', h * 1.2); // 같은 높이에 늘어선 요일 → 요일=열
  const colGroups = pickGroups('cx', h * 2.5); // 같은 세로줄 → 요일=행
  const ordered = (g: DayHeader[], key: 'cx' | 'cy') => {
    const s = [...g].sort((a, b) => a[key] - b[key]);
    // 요일 순서대로 놓여 있어야 표 머리글로 인정
    for (let i = 1; i < s.length; i++) if (s[i].day <= s[i - 1].day) return false;
    return true;
  };
  const bestRow = rowGroups.filter((g) => ordered(g, 'cx')).sort((a, b) => b.length - a.length || a[0].cy - b[0].cy)[0];
  const bestCol = colGroups.filter((g) => ordered(g, 'cy')).sort((a, b) => b.length - a.length || a[0].cx - b[0].cx)[0];
  if (bestRow && (!bestCol || bestRow.length >= bestCol.length)) return { orientation: 'days-as-columns', heads: bestRow };
  if (bestCol) return { orientation: 'days-as-rows', heads: bestCol };
  return null;
}

// ── 3) 교시 머리글 ─────────────────────────────────────────────────────
function periodOf(text: string): number {
  const s = text.replace(/\s+/g, '');
  const m = s.match(/^제?([1-8])(교시)?(\(.*\))?$/) || s.match(/^제?([1-8])교시/) || s.match(/^([1-8])[.)]$/);
  return m ? Number(m[1]) : -1;
}

function median(a: number[]) {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
}

/** 중심값 목록 → 경계 [lo, hi] (첫/끝은 간격의 절반만큼 확장) */
function boundsFromCenters(centers: number[]): Array<[number, number]> {
  const gaps = centers.slice(1).map((c, i) => c - centers[i]);
  const g = median(gaps) || 60;
  return centers.map((c, i) => [i === 0 ? c - g / 2 : (centers[i - 1] + c) / 2, i === centers.length - 1 ? c + g / 2 : (c + centers[i + 1]) / 2]);
}

// ── 4) 날짜 ────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function mondayOf(d: Date): Date {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const wd = m.getDay();
  m.setDate(m.getDate() + (wd === 0 ? 1 : wd === 6 ? 2 : 1 - wd));
  return m;
}

/** 글에서 날짜들을 찾아 '그 주 월요일'을 고릅니다 (연도가 없으면 오늘과 가장 가까운 해) */
export function findWeekStart(text: string, today = new Date()): string | null {
  return findWeekStartRaw(text, today) || findWeekStartRaw(text.replace(/\s+/g, ''), today);
}

function findWeekStartRaw(text: string, today: Date): string | null {
  const found: Date[] = [];
  const nearestYear = (mo: number, d: number) => {
    const y = today.getFullYear();
    const cands = [y - 1, y, y + 1].map((yy) => new Date(yy, mo - 1, d));
    return cands.sort((a, b) => Math.abs(a.getTime() - today.getTime()) - Math.abs(b.getTime() - today.getTime()))[0];
  };
  const ok = (mo: number, d: number) => mo >= 1 && mo <= 12 && d >= 1 && d <= 31;
  let m: RegExpExecArray | null;
  const full = /(20\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/g;
  while ((m = full.exec(text))) if (ok(+m[2], +m[3])) found.push(new Date(+m[1], +m[2] - 1, +m[3]));
  if (!found.length) {
    const md = /(\d{1,2})\s*월\s*(\d{1,2})\s*일/g;
    while ((m = md.exec(text))) if (ok(+m[1], +m[2])) found.push(nearestYear(+m[1], +m[2]));
  }
  if (!found.length) {
    // 11.16~11.20 / 11/16-11/20 처럼 기간으로 적힌 경우
    const range = /(?:^|[^\d])(\d{1,2})\s*[./]\s*(\d{1,2})\.?\s*[~\-–]\s*(\d{1,2})\s*[./]\s*(\d{1,2})/g;
    while ((m = range.exec(text))) if (ok(+m[1], +m[2])) found.push(nearestYear(+m[1], +m[2]));
  }
  if (!found.length) {
    const slash =/(?:^|[^\d.])(\d{1,2})\s*[./]\s*(\d{1,2})(?:\s*\(?[월화수목금토일])/g;
    while ((m = slash.exec(text))) if (ok(+m[1], +m[2])) found.push(nearestYear(+m[1], +m[2]));
  }
  if (!found.length) return null;
  // 월요일이 있으면 그 날, 없으면 가장 이른 날짜의 그 주 월요일
  const monday = found.find((d) => d.getDay() === 1);
  return ymd(monday || mondayOf(found.sort((a, b) => a.getTime() - b.getTime())[0]));
}

// ── 5) 표 판독 ─────────────────────────────────────────────────────────
export function parseWeeklyPlanPage(pieces: TextPiece[], extraText = '', today = new Date()): ParsedWeeklyPlan | null {
  const tokens = buildTokens(pieces);
  const found = findDayHeaders(tokens);
  if (!found) return null;
  const { orientation, heads } = found;
  const cols = orientation === 'days-as-columns';
  // 요일 축: 열이면 x, 행이면 y
  const dAxis = (t: { cx: number; cy: number }) => (cols ? t.cx : t.cy);
  const pAxis = (t: { cx: number; cy: number }) => (cols ? t.cy : t.cx);

  // 빠진 요일은 간격으로 채움
  const known = new Map(heads.map((h) => [h.day, dAxis(h)]));
  const ks = [...known.keys()].sort((a, b) => a - b);
  const step = ks.length >= 2 ? (known.get(ks[ks.length - 1])! - known.get(ks[0])!) / (ks[ks.length - 1] - ks[0]) : 80;
  const dayCenters = WEEK_DAYS.map((_, i) => known.get(i) ?? known.get(ks[0])! + (i - ks[0]) * step);
  const dayBounds = boundsFromCenters(dayCenters);
  const headerP = Math.max(...heads.map((h) => pAxis(h) + (cols ? h.tok.h * 0.6 : (h.tok.x1 - h.tok.x0) / 2)));
  const tableStartD = dayBounds[0][0];

  // 머리글 칸(요일 축 기준 표 바깥 쪽)에 놓인 낱말 = 행/열 이름 (교시, 아침활동, 점심 …)
  const labelToks = tokens.filter((t) => (cols ? t.x1 <= tableStartD + 4 : t.y - t.h <= tableStartD + 2) && pAxis(t) > headerP - 2);
  const periodLabels = new Map<number, number>();
  for (const t of labelToks.sort((a, b) => pAxis(a) - pAxis(b))) {
    const p = periodOf(t.text);
    if (p > 0 && !periodLabels.has(p)) periodLabels.set(p, pAxis(t));
  }

  const inTable = tokens.filter((t) => dAxis(t) >= dayBounds[0][0] && dAxis(t) <= dayBounds[4][1] && pAxis(t) > headerP);
  const cellText = Object.fromEntries(WEEK_DAYS.map((d) => [d, {} as Record<number, string>])) as Record<WeekDay, Record<number, string>>;

  const dayIndexOf = (t: Token) => dayBounds.findIndex(([lo, hi]) => dAxis(t) >= lo && dAxis(t) < hi);
  const push = (d: number, p: number, s: string) => {
    const k = WEEK_DAYS[d];
    cellText[k][p] = cellText[k][p] ? `${cellText[k][p]}\n${s}` : s;
  };

  let maxPeriod = 0;
  const headSubject = new Map<string, { name: string; at: number; text: string }>();
  if (periodLabels.size >= 3) {
    const ps = [...periodLabels.keys()].sort((a, b) => a - b);
    const centers = ps.map((p) => periodLabels.get(p)!);
    const gaps = centers.slice(1).map((c, i) => c - centers[i]);
    const g = median(gaps) || 40;
    // 다른 행 이름(점심 · 알림장 등)도 경계로 사용
    const otherLabels = labelToks.filter((t) => periodOf(t.text) < 0 && t.text.replace(/\s/g, '').length >= 2).map((t) => pAxis(t));
    const bands = ps.map((p, i) => {
      const c = centers[i];
      const prevAll = [...(i > 0 ? [centers[i - 1]] : []), ...otherLabels.filter((o) => o < c - 2), headerP - g * 0.5];
      const nextAll = [...(i < ps.length - 1 ? [centers[i + 1]] : []), ...otherLabels.filter((o) => o > c + 2)];
      const prev = Math.max(...prevAll);
      const next = nextAll.length ? Math.min(...nextAll) : c + g;
      return { p, lo: Math.max(headerP, (prev + c) / 2, c - g * 0.75), hi: Math.min((c + next) / 2, c + g * 0.75) };
    });
    // 행 이름이 칸 위쪽에 붙은 표(위 정렬) 보정: 띠가 지나치게 좁으면 간격 기준으로
    for (const t of inTable) {
      const d = dayIndexOf(t);
      if (d < 0) continue;
      const band = bands.find((b) => pAxis(t) >= b.lo && pAxis(t) < b.hi);
      if (band) push(d, band.p, t.text);
    }
    // 과목 머리 줄(칸 맨 위의 "과 학" 같은 줄)은 교시 이름과 가장 가까운 칸으로 —
    // 교시 이름이 칸 가운데에 있고 과목이 칸 위쪽에 있으면 띠 경계 밖(앞 칸)으로 빠지는 것을 바로잡아요
    for (const t of inTable) {
      const d = dayIndexOf(t);
      const sub = exactSubject(t.text);
      if (d < 0 || !sub) continue;
      let best = -1;
      let bestDist = Infinity;
      ps.forEach((p, i) => {
        const dist = Math.abs(pAxis(t) - centers[i]);
        if (dist < bestDist) {
          bestDist = dist;
          best = p;
        }
      });
      if (best < 0 || bestDist > g * 0.85) continue;
      const k = `${d}-${best}`;
      const prev = headSubject.get(k);
      // 같은 칸에 여러 개면 위쪽(먼저 나온) 줄
      if (!prev || pAxis(t) < prev.at) headSubject.set(k, { name: sub, at: pAxis(t), text: t.text });
    }
    headSubject.forEach((v, k) => {
      const [d, p] = k.split('-').map(Number);
      const key = WEEK_DAYS[d];
      const cur = cellText[key][p] || '';
      // 다른 칸으로 들어갔던 머리 줄은 빼고, 이 칸 맨 앞에 붙이기
      for (const pp of Object.keys(cellText[key]).map(Number)) {
        if (pp === p) continue;
        const lines = cellText[key][pp].split('\n');
        const idx = lines.indexOf(v.text);
        if (idx >= 0 && !headSubject.has(`${d}-${pp}`)) {
          lines.splice(idx, 1);
          cellText[key][pp] = lines.join('\n');
        } else if (idx >= 0 && headSubject.get(`${d}-${pp}`)?.text !== v.text) {
          lines.splice(idx, 1);
          cellText[key][pp] = lines.join('\n');
        }
      }
      if (!cur.split('\n').includes(v.text)) cellText[key][p] = cur ? `${v.text}\n${cur}` : v.text;
    });
    maxPeriod = Math.max(...ps);
  } else {
    // 교시 머리글이 없는 표: 요일마다 과목 이름이 보이는 순서 = 교시
    for (let d = 0; d < 5; d++) {
      const colToks = inTable.filter((t) => dayIndexOf(t) === d).sort((a, b) => pAxis(a) - pAxis(b));
      let p = 0;
      for (const t of colToks) {
        const s = pickSubject(t.text);
        if (s && SUBJECTS.some(([n]) => n === s) && norm(t.text).indexOf(norm(s).slice(0, 2)) <= 1) {
          p += 1;
          if (p > 8) break;
          push(d, p, t.text);
        }
      }
      maxPeriod = Math.max(maxPeriod, p);
    }
  }

  // 과목 고르기 + 하루 전체 행사 처리
  const days = Object.fromEntries(WEEK_DAYS.map((d) => [d, {} as Record<number, string>])) as Record<WeekDay, Record<number, string>>;
  let filled = 0;
  WEEK_DAYS.forEach((d, di) => {
    const dayAll = Object.values(cellText[d]).join('\n');
    // 합쳐진 칸의 행사 글자는 교시 띠 밖(가운데)에 있을 수도 있으니 요일 전체 글자도 확인
    const colAll = `${dayAll}\n${inTable.filter((t) => dayIndexOf(t) === di).map((t) => t.text).join('\n')}`;
    const subjects = Object.entries(cellText[d])
      .filter(([, txt]) => txt.trim())
      .map(([p, txt]) => [Number(p), headSubject.get(`${di}-${p}`)?.name || pickSubject(txt)] as const);
    const realSubjects = subjects.filter(([, s]) => SUBJECTS.some(([n]) => n === s));
    const ev = EVENTS.find(([, re]) => re.test(colAll));
    if (ev && realSubjects.length <= 1) {
      for (let p = 1; p <= Math.max(maxPeriod, 4); p++) days[d][p] = ev[0];
      filled += Math.max(maxPeriod, 4);
      return;
    }
    for (const [p, s] of subjects) {
      if (s) {
        days[d][p] = s;
        filled++;
      }
    }
  });

  // 날짜: ① 요일 머리글(예: 11월 2일(월)) ② 표 위 제목 ③ 쪽 전체 ④ 파일 이름
  const tableTop = Math.min(...heads.map((h) => h.tok.cy)) + (cols ? heads[0].tok.h : 0);
  const aboveText = tokens.filter((t) => t.cy <= tableTop + 1).map((t) => t.text).join(' ');
  const weekStart =
    findWeekStart(heads.map((h) => h.tok.text).join(' '), today) ||
    findWeekStart(aboveText, today) ||
    findWeekStart(tokens.map((t) => t.text).join(' '), today) ||
    findWeekStart(extraText, today);

  return { weekStart, days, filled, maxPeriod, orientation, cellText };
}

/** 여러 쪽 중 가장 잘 읽힌 쪽을 고릅니다 */
export function parseWeeklyPlanPages(pages: TextPiece[][], fileName = '', today = new Date()): ParsedWeeklyPlan | null {
  let best: ParsedWeeklyPlan | null = null;
  for (const page of pages) {
    const r = parseWeeklyPlanPage(page, fileName, today);
    if (r && (!best || r.filled > best.filled)) best = r;
  }
  if (best && !best.weekStart) best.weekStart = findWeekStart(fileName, today);
  return best;
}

/** 칸 글자 → 학습 내용 · 쪽수 (과목 머리 줄 · *** · - 는 뺌) */
export function cellDetail(text: string): { topic: string; pages: string } {
  const lines = String(text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const pages: string[] = [];
  const topic: string[] = [];
  lines.forEach((l, i) => {
    if (i === 0 && exactSubject(l)) return;
    if (/^[*＊\-–—·.]+$/.test(l)) return;
    if (/쪽\s*$/.test(l) || /^p\.?\s*\d/i.test(l) || /^\d+\s*[-~]\s*\d+(\(\d+\s*[-~]\s*\d+\))?$/.test(l)) {
      pages.push(l.replace(/\s+/g, ''));
      return;
    }
    topic.push(l.replace(/^[◆◇■□●○★☆▶▷※]+\s*/, ''));
  });
  let t = topic.join(' ').replace(/\s+/g, ' ').trim();
  if (t.length > 60) t = `${t.slice(0, 58)}…`;
  return { topic: t, pages: pages.join(', ') };
}
