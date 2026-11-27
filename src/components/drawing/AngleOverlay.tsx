import React from 'react';

/**
 * 📐 판서 도형 · 각도 · 원 길이 표시
 * - 다각형(삼각형 · 직각삼각형 · 사각형 · 평행사변형 · 마름모 · 정육각형 · 정팔각형)을 그리면 꼭짓점을 기억해 두었다가
 *   [∠ 각도] 버튼으로 각 꼭짓점의 각도(호 + 숫자)를 켰다 껐다 해요. 아래에는 "내각의 합"
 * - [📏 길이] 원은 반지름 · 지름만, 다각형은 변의 길이를 보여 줘요. 1칸 = 1cm(40px)
 * - [🧮 넓이 식] 원은 원주 · 넓이, 다각형은 넓이를 구하는 식을 보여 줘요. (모두 켜고 끌 수 있어요)
 */

export interface Pt {
  x: number;
  y: number;
}
export type PolyKind = 'rect' | 'triangle' | 'rtriangle' | 'parallelogram' | 'rhombus' | 'hexagon' | 'octagon';
export type ShapeKind = 'line' | 'circle' | PolyKind;
export interface ShapePoly {
  id: string;
  kind: PolyKind | 'circle';
  pts: Pt[];
  /** 원의 반지름(px) */
  r?: number;
  color: string;
}

export const CM = 40; // 1cm 를 40px 로
export const POLY_KINDS: PolyKind[] = ['rect', 'triangle', 'rtriangle', 'parallelogram', 'rhombus', 'hexagon', 'octagon'];
export const isPolyKind = (k: string): k is PolyKind => (POLY_KINDS as string[]).includes(k);

export const SHAPE_MENU: { id: ShapeKind; label: string; group: string }[] = [
  { id: 'line', label: '직선', group: '선 · 원' },
  { id: 'circle', label: '원', group: '선 · 원' },
  { id: 'triangle', label: '삼각형', group: '삼각형' },
  { id: 'rtriangle', label: '직각삼각형', group: '삼각형' },
  { id: 'rect', label: '직사각형', group: '사각형' },
  { id: 'parallelogram', label: '평행사변형', group: '사각형' },
  { id: 'rhombus', label: '마름모', group: '사각형' },
  { id: 'hexagon', label: '정육각형', group: '다각형' },
  { id: 'octagon', label: '정팔각형', group: '다각형' },
];

/** 메뉴 아이콘 (작은 도형 그림) */
export const ShapeIcon: React.FC<{ kind: ShapeKind; size?: number }> = ({ kind, size = 18 }) => {
  const b = { x: 2, y: 3 };
  const e = { x: 22, y: 21 };
  let d = '';
  if (kind === 'line') d = 'M4 20 L20 4';
  else if (kind === 'circle') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 12 L21 12" strokeDasharray="2 2" />
    </svg>
  );
  else {
    const pts = shapePolygon(kind, b, e);
    d = 'M' + pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L') + ' Z';
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
};

const regular = (n: number, cx: number, cy: number, r: number, rot: number): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = rot + (i / n) * Math.PI * 2;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });

/** 드래그한 두 점으로 도형의 꼭짓점 만들기 */
export function shapePolygon(kind: PolyKind, a: Pt, b: Pt): Pt[] {
  const x0 = Math.min(a.x, b.x);
  const x1 = Math.max(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const y1 = Math.max(a.y, b.y);
  const w = x1 - x0;
  const h = y1 - y0;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  switch (kind) {
    case 'rect':
      return [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
    case 'triangle': {
      const apexUp = a.y <= b.y;
      return apexUp
        ? [{ x: cx, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }]
        : [{ x: cx, y: y1 }, { x: x0, y: y0 }, { x: x1, y: y0 }];
    }
    case 'rtriangle':
      return [{ x: a.x, y: a.y }, { x: a.x, y: b.y }, { x: b.x, y: b.y }];
    case 'parallelogram': {
      const s = w * 0.28;
      return [{ x: x0 + s, y: y0 }, { x: x1, y: y0 }, { x: x1 - s, y: y1 }, { x: x0, y: y1 }];
    }
    case 'rhombus':
      return [{ x: cx, y: y0 }, { x: x1, y: cy }, { x: cx, y: y1 }, { x: x0, y: cy }];
    case 'hexagon': {
      // 정육각형 (위아래가 평평)
      const r = Math.min(w / 2, h / 2 / Math.sin(Math.PI / 3));
      return regular(6, cx, cy, r, 0);
    }
    case 'octagon': {
      const r = Math.min(w, h) / 2 / Math.cos(Math.PI / 8);
      return regular(8, cx, cy, r, Math.PI / 8);
    }
  }
}

const angleAt = (p: Pt, prev: Pt, next: Pt) => {
  const a1 = Math.atan2(prev.y - p.y, prev.x - p.x);
  const a2 = Math.atan2(next.y - p.y, next.x - p.x);
  let d = Math.abs(a1 - a2);
  if (d > Math.PI) d = 2 * Math.PI - d;
  return (d * 180) / Math.PI;
};

/** 반올림해도 내각의 합 (n−2)×180 이 맞도록 */
function roundedAngles(pts: Pt[]): number[] {
  const raw = pts.map((p, i) => angleAt(p, pts[(i + pts.length - 1) % pts.length], pts[(i + 1) % pts.length]));
  const total = (pts.length - 2) * 180;
  const r = raw.map((v) => Math.round(v));
  const diff = total - r.reduce((s, v) => s + v, 0);
  if (diff !== 0) {
    const order = raw.map((v, i) => ({ i, f: v - Math.floor(v) })).sort((x, y) => (diff > 0 ? y.f - x.f : x.f - y.f));
    for (let k = 0; k < Math.abs(diff); k++) r[order[k % order.length].i] += Math.sign(diff);
  }
  return r;
}

const SUM_LABEL: Record<number, string> = { 3: '세 각의 합 180°', 4: '네 각의 합 360°', 6: '여섯 각의 합 720°', 8: '여덟 각의 합 1080°' };
/** cm 로 바꿔 소수 첫째 자리까지 */
const cm1 = (px: number) => Math.round((px / CM) * 10) / 10;
const f1 = (v: number) => (Math.round(v * 100) / 100).toString();
const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);
/** 점 p 에서 직선 ab 까지 거리 */
const distToLine = (p: Pt, a: Pt, b: Pt) => Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / (dist(a, b) || 1);

/** 도형마다 넓이 구하는 식 (길이는 소수 첫째 자리 cm 로 반올림해서 계산) */
export function areaFormula(pl: ShapePoly): string[] {
  const p = pl.pts;
  switch (pl.kind) {
    case 'circle': {
      const r = cm1(pl.r || 0);
      return [`원주 = 지름 × 3.14 = ${f1(r * 2)} × 3.14 = ${f1(r * 2 * 3.14)}cm`, `넓이 = 반지름 × 반지름 × 3.14 = ${f1(r)} × ${f1(r)} × 3.14 = ${f1(r * r * 3.14)}cm²`];
    }
    case 'rect': {
      const a = cm1(dist(p[0], p[1]));
      const b = cm1(dist(p[1], p[2]));
      return a === b ? [`넓이 = 한 변 × 한 변 = ${f1(a)} × ${f1(b)} = ${f1(a * b)}cm²`] : [`넓이 = 가로 × 세로 = ${f1(a)} × ${f1(b)} = ${f1(a * b)}cm²`];
    }
    case 'triangle': {
      const base = cm1(dist(p[1], p[2]));
      const h = cm1(distToLine(p[0], p[1], p[2]));
      return [`넓이 = 밑변 × 높이 ÷ 2 = ${f1(base)} × ${f1(h)} ÷ 2 = ${f1((base * h) / 2)}cm²`];
    }
    case 'rtriangle': {
      const base = cm1(dist(p[1], p[2]));
      const h = cm1(dist(p[0], p[1]));
      return [`넓이 = 밑변 × 높이 ÷ 2 = ${f1(base)} × ${f1(h)} ÷ 2 = ${f1((base * h) / 2)}cm²`];
    }
    case 'parallelogram': {
      const base = cm1(dist(p[0], p[1]));
      const h = cm1(distToLine(p[3], p[0], p[1]));
      return [`넓이 = 밑변 × 높이 = ${f1(base)} × ${f1(h)} = ${f1(base * h)}cm²`];
    }
    case 'rhombus': {
      const d1 = cm1(dist(p[1], p[3]));
      const d2 = cm1(dist(p[0], p[2]));
      return [`넓이 = 한 대각선 × 다른 대각선 ÷ 2 = ${f1(d1)} × ${f1(d2)} ÷ 2 = ${f1((d1 * d2) / 2)}cm²`];
    }
    case 'hexagon':
    case 'octagon': {
      const n = p.length;
      const cx = p.reduce((s, q) => s + q.x, 0) / n;
      const cy = p.reduce((s, q) => s + q.y, 0) / n;
      const side = cm1(dist(p[0], p[1]));
      const h = cm1(distToLine({ x: cx, y: cy }, p[0], p[1]));
      const tri = (side * h) / 2;
      return [`삼각형 ${n}개로 나누기: (한 변 × 높이 ÷ 2) × ${n}`, `= (${f1(side)} × ${f1(h)} ÷ 2) × ${n} = ${f1(tri * n)}cm²`];
    }
  }
  return [];
}

export interface MeasureFlags {
  /** ∠ 각도 (다각형) */
  angle: boolean;
  /** 📏 길이 (원: 반지름 · 지름 / 다각형: 변의 길이) */
  len: boolean;
  /** 🧮 넓이 식 (원: 원주 · 넓이 / 다각형: 넓이) */
  area: boolean;
}

export const AngleOverlay: React.FC<{ polys: ShapePoly[]; flags: MeasureFlags; isLight: boolean }> = ({ polys, flags, isLight }) => {
  if (!polys.length || (!flags.angle && !flags.len && !flags.area)) return null;
  const halo = isLight ? '#ffffff' : '#0f172a';
  return (
    <svg className="absolute inset-0 pointer-events-none z-[12] overflow-visible" width="100%" height="100%" data-wb-angles aria-hidden>
      {polys.map((pl) => {
        if (pl.kind === 'circle') {
          const c = pl.pts[0];
          const R = pl.r || 0;
          const rc = cm1(R);
          const ang = -Math.PI / 6;
          const ex = c.x + Math.cos(ang) * R;
          const ey = c.y + Math.sin(ang) * R;
          if (!flags.len && !flags.area) return null;
          return (
            <g key={pl.id} data-wb-circle>
              {flags.len && (
                <>
                  {/* 지름 (점선, 가로) */}
                  <line x1={c.x - R} y1={c.y} x2={c.x + R} y2={c.y} stroke={pl.color} strokeWidth={2} strokeDasharray="7 6" opacity={0.85} />
                  <text x={c.x - R / 2} y={c.y + 18} textAnchor="middle" dominantBaseline="central" className="wb-angle-sum" fill={pl.color} stroke={halo} data-wb-diam>
                    지름 {f1(rc * 2)}cm
                  </text>
                  {/* 반지름 (실선) */}
                  <line x1={c.x} y1={c.y} x2={ex} y2={ey} stroke="#e11d48" strokeWidth={3} strokeLinecap="round" />
                  <text x={(c.x + ex) / 2} y={(c.y + ey) / 2 - 16} textAnchor="middle" dominantBaseline="central" className="wb-angle-txt" fill="#e11d48" stroke={halo} data-wb-radius>
                    반지름 {f1(rc)}cm
                  </text>
                  <circle cx={c.x} cy={c.y} r={5} fill="#e11d48" stroke={halo} strokeWidth={2} />
                </>
              )}
              {flags.area && (
                <g transform={`translate(${c.x}, ${c.y + R + 22})`} data-wb-area>
                  {areaFormula(pl).map((t, i) => (
                    <text key={i} y={i * 24} textAnchor="middle" dominantBaseline="central" className="wb-circle-txt" fill={pl.color} stroke={halo}>
                      {t}
                    </text>
                  ))}
                </g>
              )}
            </g>
          );
        }
        const n = pl.pts.length;
        const angs = roundedAngles(pl.pts);
        const minEdge = Math.min(...pl.pts.map((p, i) => Math.hypot(pl.pts[(i + 1) % n].x - p.x, pl.pts[(i + 1) % n].y - p.y)));
        const R = Math.max(12, Math.min(32, minEdge * 0.24));
        const cx = pl.pts.reduce((s, p) => s + p.x, 0) / n;
        const cy = pl.pts.reduce((s, p) => s + p.y, 0) / n;
        const maxY = Math.max(...pl.pts.map((p) => p.y));
        let lineY = maxY + (flags.len ? 46 : 26);
        const below: React.ReactNode[] = [];
        if (flags.angle) {
          below.push(
            <text key="sum" x={cx} y={lineY} textAnchor="middle" dominantBaseline="central" className="wb-angle-sum" fill={pl.color} stroke={halo}>
              {SUM_LABEL[n] || `내각의 합 ${(n - 2) * 180}°`}
            </text>
          );
          lineY += 24;
        }
        if (flags.area) {
          areaFormula(pl).forEach((t, i) => {
            below.push(
              <text key={`a${i}`} x={cx} y={lineY} textAnchor="middle" dominantBaseline="central" className="wb-circle-txt" fill={pl.color} stroke={halo} data-wb-area>
                {t}
              </text>
            );
            lineY += 24;
          });
        }
        return (
          <g key={pl.id}>
            {flags.angle &&
              pl.pts.map((p, i) => {
                const prev = pl.pts[(i + n - 1) % n];
                const next = pl.pts[(i + 1) % n];
                const deg = angs[i];
                const u1 = Math.atan2(prev.y - p.y, prev.x - p.x);
                const u2 = Math.atan2(next.y - p.y, next.x - p.x);
                let mid = (u1 + u2) / 2;
                let span = u2 - u1;
                if (Math.abs(span) > Math.PI) {
                  mid += Math.PI;
                  span = span > 0 ? span - 2 * Math.PI : span + 2 * Math.PI;
                }
                const off = R + (deg > 110 ? 12 : 16);
                const lx = p.x + Math.cos(mid) * off;
                const ly = p.y + Math.sin(mid) * off;
                let mark: React.ReactNode;
                if (deg === 90) {
                  const s = R * 0.6;
                  const a = { x: p.x + Math.cos(u1) * s, y: p.y + Math.sin(u1) * s };
                  const b = { x: p.x + Math.cos(u2) * s, y: p.y + Math.sin(u2) * s };
                  const c = { x: a.x + Math.cos(u2) * s, y: a.y + Math.sin(u2) * s };
                  mark = <path d={`M${a.x},${a.y} L${c.x},${c.y} L${b.x},${b.y}`} fill="none" stroke={pl.color} strokeWidth={2.2} />;
                } else {
                  const sx = p.x + Math.cos(u1) * R;
                  const sy = p.y + Math.sin(u1) * R;
                  const ex = p.x + Math.cos(u2) * R;
                  const ey = p.y + Math.sin(u2) * R;
                  const sweep = span > 0 ? 1 : 0;
                  mark = <path d={`M${p.x},${p.y} L${sx},${sy} A${R},${R} 0 0 ${sweep} ${ex},${ey} Z`} fill={pl.color} fillOpacity={0.16} stroke={pl.color} strokeWidth={2} />;
                }
                return (
                  <g key={i}>
                    {mark}
                    <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" className="wb-angle-txt" fill={pl.color} stroke={halo}>
                      {deg}°
                    </text>
                  </g>
                );
              })}
            {flags.len &&
              pl.pts.map((p, i) => {
                // 변의 가운데에서 도형 바깥쪽으로 조금 띄워 길이 쓰기
                const q = pl.pts[(i + 1) % n];
                const mx = (p.x + q.x) / 2;
                const my = (p.y + q.y) / 2;
                let nx = -(q.y - p.y);
                let ny = q.x - p.x;
                const L = Math.hypot(nx, ny) || 1;
                nx /= L;
                ny /= L;
                if (nx * (mx - cx) + ny * (my - cy) < 0) {
                  nx = -nx;
                  ny = -ny;
                }
                return (
                  <text key={`l${i}`} x={mx + nx * 18} y={my + ny * 18} textAnchor="middle" dominantBaseline="central" className="wb-len-txt" fill={pl.color} stroke={halo} data-wb-side>
                    {f1(cm1(dist(p, q)))}cm
                  </text>
                );
              })}
            {below}
          </g>
        );
      })}
    </svg>
  );
};

export default AngleOverlay;
