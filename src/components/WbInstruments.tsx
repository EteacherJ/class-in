import React from 'react';

/**
 * ✍️ 판서 수업 도구: 삼각자(45° · 30°/60°) · 컴퍼스
 * - 모든 좌표는 판(board) 좌표. 판을 옮기면 함께 움직여요.
 * - 삼각자 모서리 근처에서 펜으로 그으면 모서리를 따라 곧게 그어져요 (DualMonitorDrawingCanvas 의 snap).
 * - 컴퍼스: 바늘(가운데)을 끌면 이동, ◆ 를 끌면 반지름, ✏️ 연필 끝을 돌리면 원 · 호가 그려져요.
 */

export type SetSquareKind = 'iso' | '3060';
export interface SetSquare {
  id: string;
  kind: SetSquareKind;
  x: number; // 직각 꼭짓점
  y: number;
  angle: number; // 도
  flip: boolean; // 좌우 뒤집기
  size: number; // 긴 변(밑변) 길이
}
export interface Compass {
  x: number;
  y: number;
  r: number;
  angle: number; // 라디안, 연필 방향
}

/** 삼각자 꼭짓점 (판 좌표): [직각, 밑변 끝, 높이 끝] */
export function setSquarePoints(t: SetSquare): { x: number; y: number }[] {
  const base = t.size;
  const height = t.kind === 'iso' ? t.size : t.size * Math.tan(Math.PI / 6); // 30°/60°: 높이 = 밑변 · tan30°
  const local = [
    { x: 0, y: 0 },
    { x: t.flip ? -base : base, y: 0 },
    { x: 0, y: -height },
  ];
  const a = (t.angle * Math.PI) / 180;
  return local.map((p) => ({ x: t.x + p.x * Math.cos(a) - p.y * Math.sin(a), y: t.y + p.x * Math.sin(a) + p.y * Math.cos(a) }));
}

/** 펜을 붙일 수 있는 모서리들 (바깥쪽 방향 포함) */
export function setSquareEdges(t: SetSquare) {
  const P = setSquarePoints(t);
  const cx = (P[0].x + P[1].x + P[2].x) / 3;
  const cy = (P[0].y + P[1].y + P[2].y) / 3;
  return [
    [P[0], P[1]],
    [P[1], P[2]],
    [P[2], P[0]],
  ].map(([a, b]) => {
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const dx = (b.x - a.x) / len;
    const dy = (b.y - a.y) / len;
    let nx = -dy;
    let ny = dx;
    // 바깥쪽(무게중심 반대쪽)을 향하게
    if (((a.x + b.x) / 2 - cx) * nx + ((a.y + b.y) / 2 - cy) * ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    return { x0: a.x, y0: a.y, dx, dy, len, nx, ny };
  });
}

type ToBoard = (e: PointerEvent) => { x: number; y: number };

/** 끌기 도우미 */
function dragWith(e: React.PointerEvent, onMove: (ev: PointerEvent) => void, onEnd?: () => void) {
  e.stopPropagation();
  e.preventDefault();
  const el = e.currentTarget as HTMLElement;
  el.setPointerCapture?.(e.pointerId);
  const up = () => {
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', up);
    onEnd?.();
  };
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
}
const stop = (e: React.SyntheticEvent) => e.stopPropagation();

export const SetSquareView: React.FC<{
  t: SetSquare;
  drawing: boolean;
  toBoard: ToBoard;
  onChange: (t: SetSquare) => void;
  onClose: () => void;
}> = ({ t, drawing, toBoard, onChange, onClose }) => {
  const P = setSquarePoints(t);
  const minX = Math.min(...P.map((p) => p.x)) - 30;
  const minY = Math.min(...P.map((p) => p.y)) - 30;
  const maxX = Math.max(...P.map((p) => p.x)) + 30;
  const maxY = Math.max(...P.map((p) => p.y)) + 30;
  const L = P.map((p) => ({ x: p.x - minX, y: p.y - minY }));
  const iso = t.kind === 'iso';
  // 직각 표시 (작은 정사각형)
  const ux = (L[1].x - L[0].x) / Math.hypot(L[1].x - L[0].x, L[1].y - L[0].y);
  const uy = (L[1].y - L[0].y) / Math.hypot(L[1].x - L[0].x, L[1].y - L[0].y);
  const vx = (L[2].x - L[0].x) / Math.hypot(L[2].x - L[0].x, L[2].y - L[0].y);
  const vy = (L[2].y - L[0].y) / Math.hypot(L[2].x - L[0].x, L[2].y - L[0].y);
  const s = 22;
  const sq = `M ${L[0].x + ux * s} ${L[0].y + uy * s} L ${L[0].x + (ux + vx) * s} ${L[0].y + (uy + vy) * s} L ${L[0].x + vx * s} ${L[0].y + vy * s}`;
  // 꼭짓점 각도 글씨 위치 (안쪽으로)
  const cx = (L[0].x + L[1].x + L[2].x) / 3;
  const cy = (L[0].y + L[1].y + L[2].y) / 3;
  const lab = (p: { x: number; y: number }, k = 0.32) => ({ x: p.x + (cx - p.x) * k, y: p.y + (cy - p.y) * k });
  const labels = iso ? ['90°', '45°', '45°'] : ['90°', '30°', '60°'];
  // 눈금 (밑변 · 높이)
  const ticks = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const dx = (b.x - a.x) / len;
    const dy = (b.y - a.y) / len;
    const nx = (cx - a.x) * -dy + (cy - a.y) * dx > 0 ? -dy : dy;
    const ny = (cx - a.x) * -dy + (cy - a.y) * dx > 0 ? dx : -dx;
    return Array.from({ length: Math.floor(len / 10) + 1 }).map((_, i) => {
      const x = a.x + dx * i * 10;
      const y = a.y + dy * i * 10;
      const l = i % 5 === 0 ? 12 : 6;
      return <line key={i} x1={x} y1={y} x2={x + nx * l} y2={y + ny * l} stroke="#065f46" strokeWidth={i % 5 === 0 ? 1.2 : 0.7} />;
    });
  };
  const rotHandle = lab(L[1], -0.08);
  return (
    <div
      className={`wb-setsq ${drawing ? 'pointer-events-none' : ''}`}
      style={{ left: minX, top: minY, width: maxX - minX, height: maxY - minY }}
      onMouseDown={stop}
      onTouchStart={stop}
      data-wb-setsquare={t.kind}
    >
      <svg width={maxX - minX} height={maxY - minY} className="block overflow-visible">
        <polygon
          points={L.map((p) => `${p.x},${p.y}`).join(' ')}
          fill={iso ? 'rgba(167, 243, 208, 0.45)' : 'rgba(196, 181, 253, 0.42)'}
          stroke={iso ? '#059669' : '#7c3aed'}
          strokeWidth={1.6}
          strokeLinejoin="round"
          style={{ cursor: 'move', pointerEvents: 'all' }}
          onPointerDown={(e) => {
            const st = { cx: e.clientX, cy: e.clientY, x: t.x, y: t.y };
            dragWith(e, (ev) => onChange({ ...t, x: st.x + ev.clientX - st.cx, y: st.y + ev.clientY - st.cy }));
          }}
        />
        {ticks(L[0], L[1])}
        {ticks(L[0], L[2])}
        <path d={sq} fill="none" stroke={iso ? '#059669' : '#7c3aed'} strokeWidth={1.4} />
        {L.map((p, i) => {
          const q = lab(p, i === 0 ? 0.28 : 0.3);
          return (
            <text key={i} x={q.x} y={q.y + 4} textAnchor="middle" fontSize={13} fontWeight={900} fill={iso ? '#047857' : '#6d28d9'} style={{ pointerEvents: 'none' }}>
              {labels[i]}
            </text>
          );
        })}
      </svg>
      <button
        type="button"
        className="wb-inst-rot"
        style={{ left: rotHandle.x - 14, top: rotHandle.y - 14 }}
        title="돌리기 (15°마다 멈춤)"
        onPointerDown={(e) =>
          dragWith(e, (ev) => {
            const p = toBoard(ev);
            const P1 = setSquarePoints({ ...t, angle: 0 })[1];
            const base = Math.atan2(P1.y - t.y, P1.x - t.x);
            let a = ((Math.atan2(p.y - t.y, p.x - t.x) - base) * 180) / Math.PI;
            const snap = Math.round(a / 15) * 15;
            if (!ev.shiftKey && Math.abs(a - snap) < 3) a = snap;
            onChange({ ...t, angle: a });
          })
        }
      >
        ⟳
      </button>
      <div className="wb-setsq-bar" style={{ left: cx - 32, top: cy - 15 }} onPointerDown={stop}>
        <button type="button" title="뒤집기" onClick={() => onChange({ ...t, flip: !t.flip })}>
          ⇋
        </button>
        <button type="button" title="치우기" className="is-close" onClick={onClose}>
          ✕
        </button>
      </div>
    </div>
  );
};

export const CompassView: React.FC<{
  c: Compass;
  drawing: boolean;
  color: string;
  toBoard: ToBoard;
  onChange: (c: Compass) => void;
  onArc: (from: number, to: number, c: Compass) => void;
  onStart: () => void;
  onClose: () => void;
}> = ({ c, drawing, color, toBoard, onChange, onArc, onStart, onClose }) => {
  const px = c.x + Math.cos(c.angle) * c.r;
  const py = c.y + Math.sin(c.angle) * c.r;
  // 다리를 잇는 경첩 (위로 솟은 꼭짓점)
  const mx = (c.x + px) / 2;
  const my = (c.y + py) / 2;
  const lift = Math.max(70, c.r * 0.55);
  const hx = mx + Math.sin(c.angle) * lift;
  const hy = my - Math.cos(c.angle) * lift;
  const pad = 40;
  const minX = Math.min(c.x, px, hx) - pad;
  const minY = Math.min(c.y, py, hy) - pad;
  const w = Math.max(c.x, px, hx) + pad - minX;
  const h = Math.max(c.y, py, hy) + pad - minY;
  const X = (v: number) => v - minX;
  const Y = (v: number) => v - minY;
  const units = (c.r / 50).toFixed(1).replace(/\.0$/, '');
  return (
    <div className={`wb-compass ${drawing ? 'pointer-events-none' : ''}`} style={{ left: minX, top: minY, width: w, height: h }} onMouseDown={stop} onTouchStart={stop} data-wb-compass>
      <svg width={w} height={h} className="block overflow-visible" style={{ pointerEvents: 'none' }}>
        <circle cx={X(c.x)} cy={Y(c.y)} r={c.r} fill="none" stroke="#94a3b8" strokeDasharray="4 6" strokeWidth={1} opacity={0.55} />
        <line x1={X(c.x)} y1={Y(c.y)} x2={X(px)} y2={Y(py)} stroke="#64748b" strokeDasharray="2 4" strokeWidth={1} />
        <line x1={X(hx)} y1={Y(hy)} x2={X(c.x)} y2={Y(c.y)} stroke="#475569" strokeWidth={7} strokeLinecap="round" />
        <line x1={X(hx)} y1={Y(hy)} x2={X(px)} y2={Y(py)} stroke="#6366f1" strokeWidth={7} strokeLinecap="round" />
        <circle cx={X(hx)} cy={Y(hy)} r={10} fill="#f8fafc" stroke="#334155" strokeWidth={2.5} />
        <text x={X(mx)} y={Y(my) + 22} textAnchor="middle" fontSize={12} fontWeight={900} fill="#334155">
          반지름 {units}칸
        </text>
      </svg>
      {/* 바늘: 끌면 컴퍼스 이동 */}
      <button
        type="button"
        className="wb-compass-pin"
        style={{ left: X(c.x) - 13, top: Y(c.y) - 13 }}
        title="바늘 (끌어서 옮기기)"
        onPointerDown={(e) => {
          const st = { cx: e.clientX, cy: e.clientY, x: c.x, y: c.y };
          dragWith(e, (ev) => onChange({ ...c, x: st.x + ev.clientX - st.cx, y: st.y + ev.clientY - st.cy }));
        }}
      />
      {/* 반지름 조절 */}
      <button
        type="button"
        className="wb-compass-size"
        style={{ left: X(hx) - 12, top: Y(hy) - 12 }}
        title="반지름 바꾸기 (끌기)"
        onPointerDown={(e) =>
          dragWith(e, (ev) => {
            const p = toBoard(ev);
            const r = Math.max(30, Math.min(900, Math.hypot(p.x - c.x, p.y - c.y)));
            onChange({ ...c, r: Math.round(r / 5) * 5, angle: Math.atan2(p.y - c.y, p.x - c.x) });
          })
        }
      >
        ◆
      </button>
      {/* 연필 끝: 돌리면 그려짐 */}
      <button
        type="button"
        className="wb-compass-pen"
        style={{ left: X(px) - 16, top: Y(py) - 16, ['--wb-c' as any]: color }}
        title="연필 끝을 돌려 원 · 호 그리기"
        onPointerDown={(e) => {
          onStart();
          let last = c.angle;
          let cur = { ...c };
          dragWith(e, (ev) => {
            const p = toBoard(ev);
            let a = Math.atan2(p.y - cur.y, p.x - cur.x);
            let d = a - last;
            while (d > Math.PI) d -= Math.PI * 2;
            while (d < -Math.PI) d += Math.PI * 2;
            a = last + d;
            onArc(last, a, cur);
            last = a;
            cur = { ...cur, angle: a };
            onChange(cur);
          });
        }}
      >
        ✏️
      </button>
      <button type="button" className="wb-inst-close" style={{ left: X(c.x) - 12, top: Y(c.y) + 18 }} onPointerDown={stop} onClick={onClose} title="컴퍼스 치우기">
        ✕
      </button>
    </div>
  );
};
