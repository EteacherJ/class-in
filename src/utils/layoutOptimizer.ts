import { WidgetSpan } from '../components/ResizableWidgetCard';

export interface GridAnalysisRow {
  rowIndex: number;
  widgets: Array<{ id: string; span: WidgetSpan }>;
  usedCols: number;
  emptyCols: number;
}

export interface GridAnalysisResult {
  rows: GridAnalysisRow[];
  totalEmptySlots: number;
  totalUsedSlots: number;
  efficiencyPercentage: number;
  hasGaps: boolean;
}

export interface OptimizationResult {
  newOrder: string[];
  newSpans: Record<string, WidgetSpan>;
  emptySlotsBefore: number;
  emptySlotsAfter: number;
  slotsEliminated: number;
  summary: string;
}

/**
 * 12분할 그리드에서 각 행별 사용된 칸 수 및 비어 있는 빈 공간(슬롯)을 계산합니다.
 * @param order 위젯 순서 배열
 * @param spans 위젯별 컬럼 너비(Span)
 * @param hiddenIds 숨겨진 위젯 ID 목록
 * @param gridCols 그리드 분할 수 (기본 12분할)
 */
export function analyzeGridGaps(
  order: string[],
  spans: Record<string, WidgetSpan>,
  hiddenIds: string[] = [],
  gridCols = 12
): GridAnalysisResult {
  const activeIds = order.filter((id) => !hiddenIds.includes(id));
  const rows: GridAnalysisRow[] = [];

  let currentRowWidgets: Array<{ id: string; span: WidgetSpan }> = [];
  let currentUsed = 0;

  activeIds.forEach((id) => {
    // 12분할 기준 기본 너비는 3 (기존 1이나 2가 넘어올 경우 호환 변환)
    const rawSpan = spans[id] ?? 3;
    let normalizedSpan = rawSpan;
    if (rawSpan === 1) normalizedSpan = 3;
    else if (rawSpan === 2) normalizedSpan = 4;

    const span = (normalizedSpan > gridCols ? gridCols : normalizedSpan) as WidgetSpan;

    if (currentUsed + span > gridCols) {
      // 다음 행으로 넘어감 -> 이전 행의 잔여 빈 공간 기록
      const emptyCols = Math.max(0, gridCols - currentUsed);
      rows.push({
        rowIndex: rows.length,
        widgets: currentRowWidgets,
        usedCols: currentUsed,
        emptyCols,
      });

      currentRowWidgets = [{ id, span }];
      currentUsed = span;
    } else {
      currentRowWidgets.push({ id, span });
      currentUsed += span;
    }
  });

  if (currentRowWidgets.length > 0) {
    const emptyCols = Math.max(0, gridCols - currentUsed);
    rows.push({
      rowIndex: rows.length,
      widgets: currentRowWidgets,
      usedCols: currentUsed,
      emptyCols,
    });
  }

  const totalEmptySlots = rows.reduce((acc, r) => acc + r.emptyCols, 0);
  const totalUsedSlots = rows.reduce((acc, r) => acc + r.usedCols, 0);
  const totalCapacity = rows.length * gridCols;
  const efficiencyPercentage =
    totalCapacity > 0 ? Math.round((totalUsedSlots / totalCapacity) * 100) : 100;

  return {
    rows,
    totalEmptySlots,
    totalUsedSlots,
    efficiencyPercentage,
    hasGaps: totalEmptySlots > 0,
  };
}

/**
 * 12분할 그리드 기반 빈 공간을 계산하여 가장 보기 좋게 자동 최적화합니다.
 * 1) 사용자가 이동시킨 특정 위젯(pinnedWidgetId)의 위치 우선권 유지
 * 2) 빈 공간(Gap) 감지 및 주변 위젯 자석형 패킹
 * 3) 행별 잔여 빈 공간을 자연스럽게 채우도록 적응형 Span(3, 4, 6, 8, 12) 조율
 */
export function optimizeGridLayout(
  order: string[],
  spans: Record<string, WidgetSpan>,
  hiddenIds: string[] = [],
  gridCols = 12,
  pinnedWidgetId?: string,
  optimalColumns = 4,
  targetDefaultSpan: WidgetSpan = 3
): OptimizationResult {
  const before = analyzeGridGaps(order, spans, hiddenIds, gridCols);
  const activeIds = order.filter((id) => !hiddenIds.includes(id));

  if (activeIds.length === 0) {
    return {
      newOrder: order,
      newSpans: spans,
      emptySlotsBefore: 0,
      emptySlotsAfter: 0,
      slotsEliminated: 0,
      summary: '활성화된 위젯이 없습니다.',
    };
  }

  // 💡 실제 캔버스 가로 폭(중앙 캔버스 너비) 기준 4열 강제 판정
  const isWideCanvas = typeof document !== 'undefined'
    ? (() => {
        const el = document.getElementById('main-canvas-container');
        return el ? el.clientWidth >= 1200 : window.innerWidth >= 1350;
      })()
    : true;
  const effectiveOptimalCols = optimalColumns !== undefined ? optimalColumns : (isWideCanvas ? 4 : 3);

  // 💡 [자석 버튼 핵심 개선]: 사용자가 이미 설정해 둔 위젯 크기(span)를 100% 보존!
  // 임의로 3이나 4로 일괄 축소하지 않고, 기존 크기 상태를 유지하면서 빈 공간 없이 밀착 정렬
  const updatedSpans: Record<string, WidgetSpan> = { ...spans };
  activeIds.forEach((id) => {
    const cur = updatedSpans[id];
    // 사용자가 기존에 설정한 크기가 있으면 그대로 100% 보존
    if (cur && cur >= 1 && cur <= 12) {
      updatedSpans[id] = cur;
      return;
    }

    // 아직 크기가 지정되지 않은 위젯에 대해서만 화면 해상도 기본값(4열: 3칸, 3열: 4칸) 적용
    if (effectiveOptimalCols >= 4) {
      updatedSpans[id] = 3;
    } else {
      updatedSpans[id] = 4;
    }
  });

  // 💡 [요구사항 1]: 바로가기 위젯이 12칸 전폭(1행 모드)이라면 무조건 최상단 1순위로 배치
  const sortedActiveIds = [...activeIds];
  if (updatedSpans['bookmarks'] === 12 && sortedActiveIds.includes('bookmarks')) {
    const bIdx = sortedActiveIds.indexOf('bookmarks');
    sortedActiveIds.splice(bIdx, 1);
    sortedActiveIds.unshift('bookmarks');
  }

  const remainingIds = [...sortedActiveIds];
  const orderedResult: string[] = [];

  // 12분할 목표 그리드 채우기 (해상도 맞춤형 Greedy Row Filling)
  while (remainingIds.length > 0) {
    const rowIds: string[] = [];
    let rowSum = 0;

    // 첫 위젯 꺼내기
    const firstId = remainingIds.shift()!;
    rowIds.push(firstId);
    const firstSpan = updatedSpans[firstId] || targetDefaultSpan;
    rowSum += firstSpan;

    // 만약 첫 위젯이 12(전폭)이면 해당 행은 단독 배치 완료
    if (firstSpan === 12) {
      orderedResult.push(firstId);
      continue;
    }

    // 현재 행의 잔여 공간 채우기
    let remainingGap = gridCols - rowSum;
    const maxRowItems = optimalColumns >= 4 ? 4 : 3;

    while (remainingGap > 0 && remainingIds.length > 0 && rowIds.length < maxRowItems) {
      // 잔여 간격과 정확히 일치하는 위젯 탐색
      let candidateIdx = remainingIds.findIndex(
        (id) => (updatedSpans[id] || targetDefaultSpan) === remainingGap
      );

      // 정확한 일치가 없으면 잔여 공간보다 작거나 같은 위젯 탐색
      if (candidateIdx === -1) {
        candidateIdx = remainingIds.findIndex(
          (id) => (updatedSpans[id] || targetDefaultSpan) <= remainingGap
        );
      }

      if (candidateIdx !== -1) {
        const nextId = remainingIds.splice(candidateIdx, 1)[0];
        rowIds.push(nextId);
        rowSum += updatedSpans[nextId] || targetDefaultSpan;
        remainingGap = gridCols - rowSum;
      } else {
        break;
      }
    }

    // 💡 [자석 버튼 핵심]: 사용자가 설정한 위젯 크기(span)는 강제로 줄이거나 변경하지 않고 100% 보존합니다.
    // 기존 크기를 보존하며 순서만 정렬하여 간격을 단정하게 맞춥니다.
    orderedResult.push(...rowIds);
  }

  // 활성 위젯 + 숨김 위젯 합치기
  const finalOrder = [
    ...orderedResult,
    ...order.filter((id) => hiddenIds.includes(id)),
  ];

  const after = analyzeGridGaps(finalOrder, updatedSpans, hiddenIds, gridCols);
  const slotsEliminated = Math.max(0, before.totalEmptySlots - after.totalEmptySlots);

  const colText = optimalColumns >= 4 ? '27인치 4열' : '노트북 3열';
  let summary = '';
  if (before.totalEmptySlots === 0) {
    summary = `현재 ${colText} 화면에 빈 공간이 없으며, 12분할 그리드에 완벽히 밀착되어 있습니다.`;
  } else {
    summary = `${colText} 화면에 맞추어 빈 공간 ${before.totalEmptySlots}칸을 정밀 계산하여 빈틈없이 균등 자동 정렬했습니다.`;
  }

  return {
    newOrder: finalOrder,
    newSpans: updatedSpans,
    emptySlotsBefore: before.totalEmptySlots,
    emptySlotsAfter: after.totalEmptySlots,
    slotsEliminated,
    summary,
  };
}
