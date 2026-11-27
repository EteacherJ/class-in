/**
 * 🧲 2D Skyline / AABB 충돌 방지 빈 공간 패킹 기반 자석 밀착 정렬 엔진
 *
 * 1. 핵심 원칙: 사용자가 리사이즈한 위젯의 현재 크기(width, height)는 단 1px도 변경하지 않고 100% 그대로 보존
 * 2. 절대 비겹침(Non-Overlapping): 이미 배치된 위젯들과 AABB 사각형 충돌 검사를 통해 1px도 겹치지 않음
 * 3. 2D 빈 공간 탐색: 상단(최소 y) 및 좌측(최소 x)의 실제 빈 공간을 찾아 자석처럼 착착 밀착 배치
 * 4. 넓어진 위젯이 있으면 그 우측 영역은 점유된 것으로 판정하여 다른 위젯이 옆이나 아래의 진짜 빈 공간으로 배치
 */

export interface FreeWidgetPosition {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface MagnetAlignOptions {
  activeWidgetIds: string[];
  positions: Record<string, FreeWidgetPosition>;
  collapsedWidgetIds?: string[];
  canvasWidth: number;
  canvasVisibleHeight?: number;
  zoomScale?: number;
  paddingX?: number;
  paddingY?: number;
  gap?: number;
  minWidgetWidth?: number;
}

export interface MagnetAlignResult {
  newPositions: Record<string, FreeWidgetPosition>;
  summary: string;
}

interface PlacedRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 🔲 AABB 사각형 충돌 검사 (간격 gap 포함)
 */
function isAABBColliding(r1: PlacedRect, r2: PlacedRect, gap = 16): boolean {
  return (
    r1.x < r2.x + r2.width + gap &&
    r1.x + r1.width + gap > r2.x &&
    r1.y < r2.y + r2.height + gap &&
    r1.y + r1.height + gap > r2.y
  );
}

export function alignFreeWidgetsMagnet({
  activeWidgetIds,
  positions,
  collapsedWidgetIds = [],
  canvasWidth,
  zoomScale = 1.0,
  paddingX = 16,
  paddingY = 16,
  gap = 16, // 고정 간격 16px
}: MagnetAlignOptions): MagnetAlignResult {
  if (!activeWidgetIds || activeWidgetIds.length === 0) {
    return { newPositions: positions, summary: '정렬할 위젯이 없습니다.' };
  }

  const safeZoom = zoomScale && zoomScale > 0 ? zoomScale : 1.0;
  const safeCanvasWidth = Math.max(768, canvasWidth);
  const maxAvailableWidth = safeCanvasWidth - paddingX;

  // 1. 활성 위젯들의 실제 크기(width, height) 및 원본 위치 수집 (사용자 크기 100% 보존)
  interface WidgetItem {
    id: string;
    origX: number;
    origY: number;
    width: number;
    height: number;
    isCollapsed: boolean;
  }

  const items: WidgetItem[] = activeWidgetIds.map((id) => {
    const pos = positions[id] || { x: 20, y: 20, width: 380, height: 320 };
    const isCollapsed = collapsedWidgetIds.includes(id);

    // 저장된 높이 확인
    let userHeight = pos.height && pos.height >= 80 ? Math.round(pos.height) : null;
    if (typeof localStorage !== 'undefined') {
      try {
        const savedH = localStorage.getItem(`widget_height_${id}`);
        if (savedH) {
          const parsed = parseInt(savedH, 10);
          if (!isNaN(parsed) && parsed >= 80) {
            userHeight = userHeight !== null ? Math.max(userHeight, parsed) : parsed;
          }
        }
      } catch {}
    }

    // DOM 실측 (줌 배율 보정)
    let measuredWidth = pos.width && pos.width > 100 ? pos.width : 380;
    let measuredHeight = userHeight || 320;

    if (typeof document !== 'undefined') {
      const el =
        (document.querySelector(`[data-free-widget-id="${id}"]`) as HTMLElement) ||
        (document.querySelector(`[data-widget-card-id="${id}"]`) as HTMLElement);

      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 80 && (!pos.width || pos.width <= 100)) {
          measuredWidth = Math.round(rect.width / safeZoom);
        } else if (el.offsetWidth && el.offsetWidth > 80 && (!pos.width || pos.width <= 100)) {
          measuredWidth = el.offsetWidth;
        }

        if (!userHeight) {
          if (rect.height > 60) {
            measuredHeight = Math.round(rect.height / safeZoom);
          } else if (el.offsetHeight && el.offsetHeight > 60) {
            measuredHeight = el.offsetHeight;
          }
        }
      }
    }

    const finalWidth = Math.min(Math.max(220, pos.width || measuredWidth), maxAvailableWidth - paddingX);
    const finalHeight = isCollapsed
      ? 48
      : userHeight !== null
      ? userHeight
      : Math.max(160, measuredHeight);

    return {
      id,
      origX: pos.x ?? paddingX,
      origY: pos.y ?? paddingY,
      width: finalWidth,
      height: finalHeight,
      isCollapsed,
    };
  });

  // 2. 정렬 순서: 위에서 아래(y 오름차순), 왼쪽에서 오른쪽(x 오름차순)
  // (상단에 위치한 큰 위젯/사용자가 배치한 순서 우선 자리 선점)
  items.sort((a, b) => {
    if (Math.abs(a.origY - b.origY) > 20) {
      return a.origY - b.origY;
    }
    return a.origX - b.origX;
  });

  // 3. 2D Skyline / AABB 충돌 방지 빈 공간 패킹
  const placedRects: PlacedRect[] = [];
  const newPositions: Record<string, FreeWidgetPosition> = { ...positions };

  for (const item of items) {
    // 가능한 Y 좌표 후보군: 상단 패딩, 그리고 이미 배치된 모든 사각형의 바닥 + gap
    const yCandidates = Array.from(
      new Set([paddingY, ...placedRects.map((r) => r.y + r.height + gap)])
    ).sort((a, b) => a - b);

    // 가능한 X 좌표 후보군: 좌측 패딩, 그리고 이미 배치된 모든 사각형의 우측 + gap
    const xCandidates = Array.from(
      new Set([paddingX, ...placedRects.map((r) => r.x + r.width + gap)])
    ).sort((a, b) => a - b);

    let bestX = paddingX;
    let bestY = paddingY;
    let found = false;

    // 최소 Y(가장 위쪽), 그중 최소 X(가장 왼쪽) 순서로 탐색
    for (const candY of yCandidates) {
      for (const candX of xCandidates) {
        // 캔버스 가로폭 벗어나는지 검사
        if (candX + item.width > maxAvailableWidth) {
          continue;
        }

        const candidateRect: PlacedRect = {
          id: item.id,
          x: candX,
          y: candY,
          width: item.width,
          height: item.height,
        };

        // 이미 배치된 모든 위젯과의 충돌 검사
        let hasCollision = false;
        for (const placed of placedRects) {
          if (isAABBColliding(candidateRect, placed, gap)) {
            hasCollision = true;
            break;
          }
        }

        if (!hasCollision) {
          bestX = candX;
          bestY = candY;
          found = true;
          break;
        }
      }
      if (found) break;
    }

    // 만약 마땅한 빈자리가 없다면 가장 아래에 배치
    if (!found) {
      let lowestY = paddingY;
      for (const placed of placedRects) {
        lowestY = Math.max(lowestY, placed.y + placed.height + gap);
      }
      bestX = paddingX;
      bestY = lowestY;
    }

    const placed: PlacedRect = {
      id: item.id,
      x: bestX,
      y: bestY,
      width: item.width,
      height: item.height,
    };
    placedRects.push(placed);

    newPositions[item.id] = {
      ...(positions[item.id] || {}),
      x: bestX,
      y: bestY,
      width: item.width,   // 🌟 사용자 가로 너비 100% 보존
      height: item.height, // 🌟 사용자 세로 높이 100% 보존
    };
  }

  return {
    newPositions,
    summary: '위젯 크기 100% 보존 및 2D 비겹침 자석 밀착 정렬이 완료되었습니다.',
  };
}

// ─────────────────────────────────────────────────────────
// 🧲 v29 '제자리 정리' 자석
//  - 위젯이 놓인 세로줄(열)과 위아래 순서를 그대로 지켜요. 다른 줄로 건너가지 않아요.
//  - 위쪽 빈 공간만 당겨 메우고(중력), 비슷한 위치의 왼쪽 가장자리는 같은 줄로 맞춰요.
//  - 📌 고정 위젯은 움직이지 않고, 다른 위젯이 그 위젯을 피해서 아래로 붙어요.
//  - 크기는 화면에 보이는 실제 크기를 써요 (저장값과 달라서 엉뚱하게 배치되던 문제 방지).
// ─────────────────────────────────────────────────────────
export interface InPlaceItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  pinned?: boolean;
}
export function alignInPlace(
  items: InPlaceItem[],
  opts: { padding?: number; gap?: number; columnTolerance?: number; gapAbove?: Record<string, number> } = {}
): Record<string, { x: number; y: number }> {
  const pad = opts.padding ?? 16;
  const gap = opts.gap ?? 16;
  const tol = opts.columnTolerance ?? 48;
  const gapOf = (id: string) => {
    const g = opts.gapAbove?.[id];
    return typeof g === 'number' && g >= 0 ? g : gap;
  };
  // 가로로 겹치거나 '간격'보다 가까우면 같은 기둥으로 봐요 → 위아래로 간격을 두고 쌓여요
  const overlapX = (ax: number, aw: number, bx: number, bw: number) => ax < bx + bw + gap - 1 && ax + aw + gap - 1 > bx;
  const overlapY = (ay: number, ah: number, by: number, bh: number) => ay < by + bh - 2 && ay + ah - 2 > by;

  // 1) 왼쪽 가장자리가 비슷한 위젯끼리 같은 줄로 묶고, 줄과 줄 사이는 '간격'만큼 띄워요
  const xs = new Map<string, number>();
  const sortedByX = [...items].sort((a, b) => a.x - b.x);
  const groups: InPlaceItem[][] = [];
  for (const it of sortedByX) {
    const g = groups.find((gr) => Math.abs(gr[0].x - it.x) <= tol);
    if (g) g.push(it);
    else groups.push([it]);
  }
  const doneCols: { x: number; w: number; y: number; h: number }[] = [];
  for (const g of groups) {
    const pinnedItem = g.find((i) => i.pinned);
    let anchor: number;
    if (pinnedItem) {
      anchor = pinnedItem.x;
    } else {
      // 앞 줄(왼쪽)의 위젯 중 위아래로 겹치는 것들의 오른쪽 끝 + 간격 → 줄 사이 간격을 일정하게
      const minX = Math.min(...g.map((i) => i.x));
      let need = -1;
      for (const c of doneCols) {
        if (c.x < minX && g.some((i) => overlapY(i.y, i.h, c.y, c.h))) need = Math.max(need, c.x + c.w + gap);
      }
      // 옆 줄이 없으면 제자리(화면 밖으로 나가지 않게만), 있으면 그 오른쪽 끝 + 간격
      anchor = Math.round(need < 0 ? Math.max(pad, minX) : Math.max(pad, need));
    }
    g.forEach((i) => {
      const x = i.pinned ? i.x : anchor;
      xs.set(i.id, x);
      doneCols.push({ x, w: i.w, y: i.y, h: i.h });
    });
  }

  // 2) 위에서부터 차례로: 위쪽 빈 공간만 메우고, 원래 순서 · 고정 위젯은 지켜요
  type R = { id: string; x: number; y: number; w: number; h: number; oy: number };
  const placed: R[] = items.filter((i) => i.pinned).map((i) => ({ id: i.id, x: i.x, y: i.y, w: i.w, h: i.h, oy: i.y }));
  const out: Record<string, { x: number; y: number }> = {};
  placed.forEach((p) => (out[p.id] = { x: p.x, y: p.y }));
  const movable = items.filter((i) => !i.pinned).sort((a, b) => a.y - b.y || a.x - b.x);
  const collides = (it: InPlaceItem, x: number, y: number) => {
    const gg = gapOf(it.id);
    return placed.some((r) => overlapX(x, it.w, r.x, r.w) && y < r.y + r.h + gg && y + it.h + gap > r.y);
  };
  const fitY = (it: InPlaceItem, x: number) => {
    const gg = gapOf(it.id);
    // 원래 이 위젯보다 위에 있던 위젯(가로로 겹치는 것) 아래로만 → 위아래 순서 유지
    let y = pad;
    for (const r of placed) {
      if (r.oy <= it.y && overlapX(x, it.w, r.x, r.w)) y = Math.max(y, r.y + r.h + gg);
    }
    // 다른 위젯과 겹치거나 간격이 모자라면 그 아래로
    let moved = true;
    let guard = 0;
    while (moved && guard++ < 200) {
      moved = false;
      for (const r of placed) {
        if (overlapX(x, it.w, r.x, r.w) && y < r.y + r.h + gg && y + it.h + gap > r.y) {
          y = r.y + r.h + gg;
          moved = true;
        }
      }
    }
    return Math.round(y);
  };
  for (const it of movable) {
    const anchorX = xs.get(it.id) ?? it.x;
    // 1순위: 줄 맞춤 + 위로 붙이기 → 2순위: 원래 가로 위치에서 위로 붙이기
    // → 3순위: 그 자리 그대로(겹치지 않을 때만) → 4순위: 겹치면 간격만큼만 아래로
    let x = anchorX;
    let y = fitY(it, anchorX);
    if (y > it.y + 1 && anchorX !== it.x) {
      const y2 = fitY(it, it.x);
      if (y2 <= it.y + 1) {
        x = it.x;
        y = y2;
      }
    }
    if (y > it.y + 1) {
      if (!collides(it, anchorX, Math.round(it.y))) {
        x = anchorX;
        y = Math.round(it.y);
      } else if (!collides(it, it.x, Math.round(it.y))) {
        x = it.x;
        y = Math.round(it.y);
      }
      // 둘 다 겹치면: 줄 맞춤 위치에서 간격만큼 아래(위에서 계산한 y)를 그대로 써요
    }
    placed.push({ id: it.id, x, y, w: it.w, h: it.h, oy: it.y });
    out[it.id] = { x, y };
  }
  // 3) 마지막 확인: 어떤 두 위젯도 간격보다 가깝게 붙거나 겹치지 않게 (위쪽 것은 두고 아래쪽 것을 내려요)
  const all = placed.slice().sort((p, q) => p.y - q.y || p.x - q.x);
  const pinnedIds = new Set(items.filter((i) => i.pinned).map((i) => i.id));
  for (let pass = 0; pass < 40; pass++) {
    let changed = false;
    for (let i = 0; i < all.length; i++) {
      for (let j = 0; j < all.length; j++) {
        if (i === j) continue;
        const A = all[i];
        const B = all[j];
        if (pinnedIds.has(B.id)) continue;
        if (B.y < A.y || (B.y === A.y && j < i)) continue;
        const gg = gapOf(B.id);
        const tooCloseX = B.x < A.x + A.w + gap - 1 && B.x + B.w + gap - 1 > A.x;
        const tooCloseY = B.y < A.y + A.h + gg - 1 && B.y + B.h + gap - 1 > A.y;
        if (tooCloseX && tooCloseY) {
          B.y = Math.round(A.y + A.h + gg);
          out[B.id] = { x: B.x, y: B.y };
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  return out;
}

/** 배치 결과에서 위젯마다 '바로 위 위젯과의 간격'을 구해요 (미리보기 간격 표시용) */
export function measureTopGaps(rects: { id: string; x: number; y: number; w: number; h: number }[]): Record<string, { gap: number; aboveId: string }> {
  const out: Record<string, { gap: number; aboveId: string }> = {};
  for (const a of rects) {
    let best: { gap: number; aboveId: string } | null = null;
    for (const b of rects) {
      if (a.id === b.id) continue;
      if (!(a.x < b.x + b.w - 2 && a.x + a.w - 2 > b.x)) continue;
      const g = Math.round(a.y - (b.y + b.h));
      if (b.y < a.y && g > -400 && (!best || g < best.gap)) best = { gap: g, aboveId: b.id };
    }
    if (best && best.gap < 200) out[a.id] = best;
  }
  return out;
}

// ─────────────────────────────────────────────────────────
// ✨ v30 '새로 정렬' (스마트) : 크기는 그대로, 읽는 순서(위→아래, 왼→오른)를 지키며
//   빈 곳 중 가장 위·왼쪽 자리부터 빈틈없이 채워요. 📌 고정 위젯은 그 자리 그대로.
//   columns 를 주면 그 세로줄 위치에만 놓아요 (표준 3열 정렬).
// ─────────────────────────────────────────────────────────
export function packLayout(
  items: (InPlaceItem & { order?: number })[],
  opts: { containerWidth: number; padding?: number; gap?: number; columns?: number[] }
): Record<string, { x: number; y: number }> {
  const pad = opts.padding ?? 16;
  const gap = opts.gap ?? 16;
  const W = Math.max(300, opts.containerWidth);
  type R = { x: number; y: number; w: number; h: number };
  const placed: R[] = items.filter((i) => i.pinned).map((i) => ({ x: i.x, y: i.y, w: i.w, h: i.h }));
  const out: Record<string, { x: number; y: number }> = {};
  items.filter((i) => i.pinned).forEach((i) => (out[i.id] = { x: i.x, y: i.y }));
  // 읽는 순서: 비슷한 높이(60px 안)는 같은 줄로 보고 왼→오른
  const movable = items
    .filter((i) => !i.pinned)
    .sort((a, b) => (Math.abs(a.y - b.y) > 60 ? a.y - b.y : a.x - b.x));
  const lowestY = (x: number, w: number, h: number) => {
    let y = pad;
    let moved = true;
    let guard = 0;
    while (moved && guard++ < 300) {
      moved = false;
      for (const r of placed) {
        if (x < r.x + r.w + gap && x + w + gap > r.x && y < r.y + r.h + gap && y + h + gap > r.y) {
          y = r.y + r.h + gap;
          moved = true;
        }
      }
    }
    return y;
  };
  for (const it of movable) {
    let cands: number[];
    if (opts.columns && opts.columns.length) cands = [...opts.columns];
    else cands = [pad, ...placed.map((r) => r.x + r.w + gap)];
    cands = Array.from(new Set(cands.map((c) => Math.round(c)))).filter((c) => c >= pad - 1 && c + it.w <= W - pad + 1);
    if (cands.length === 0) cands = [pad];
    // 가장 위쪽 빈자리를 고르되, 원래 자리에서 가로로 멀리 가는 건 덜 좋아해요 (엉뚱한 줄로 튀지 않게)
    let best = { x: cands[0], y: Infinity, score: Infinity };
    for (const cx of cands) {
      const cy = lowestY(cx, it.w, it.h);
      const score = cy + Math.abs(cx - it.x) * 0.5;
      if (score < best.score - 1 || (Math.abs(score - best.score) <= 1 && cx < best.x)) best = { x: cx, y: cy, score };
    }
    placed.push({ x: best.x, y: best.y, w: it.w, h: it.h });
    out[it.id] = { x: best.x, y: Math.round(best.y) };
  }
  return out;
}
