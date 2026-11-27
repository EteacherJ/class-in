/**
 * ============================================================================
 * [touchAssist.ts] 교실용 "빗나간 터치 보정" (전자칠판 펜 · 무선 마우스)
 * ============================================================================
 * 작은 버튼을 살짝 빗나가게 눌렀을 때, 그 클릭이 '아무 기능 없는 빈 곳'에 떨어진 경우에만
 * 가장 가까운 버튼(반경 내)을 대신 눌러 줍니다.
 *
 * - 실제 버튼·링크·입력창·클릭 가능한 카드(cursor:pointer)를 누른 경우에는 절대 개입하지 않으므로
 *   이웃 버튼을 잘못 누르게 되는 부작용이 없습니다.
 * - 판서 캔버스 등 정밀 입력 영역과 data-no-touch-assist 영역은 제외합니다.
 * - 반경: 일반 교실 모드 14px · 전자칠판 모드 22px
 */

const INTERACTIVE_SELECTOR =
  'button, a[href], [role="button"], [role="tab"], [role="menuitem"], summary, label, select, input, textarea, [contenteditable="true"]';

const EXCLUDED_SELECTOR = 'canvas, svg[data-drawing], [data-no-touch-assist], [contenteditable="true"], input, textarea, select';

function isActuallyClickable(el: Element): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if ((el as HTMLButtonElement).disabled) return false;
  const style = getComputedStyle(el);
  if (style.pointerEvents === 'none' || style.visibility === 'hidden') return false;
  let node: HTMLElement | null = el;
  while (node) {
    if (getComputedStyle(node).opacity === '0') return false;
    node = node.parentElement;
  }
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

/** 빈 곳 판정: 대상 또는 가까운 조상이 클릭 가능한 요소이면 개입하지 않음 */
function landedOnInteractive(target: Element): boolean {
  if (target.closest(INTERACTIVE_SELECTOR)) return true;
  let node: Element | null = target;
  for (let depth = 0; node && depth < 4; depth++, node = node.parentElement) {
    if (getComputedStyle(node).cursor === 'pointer') return true;
  }
  return false;
}

function findNearestButton(x: number, y: number, radius: number): HTMLElement | null {
  const steps = [radius * 0.5, radius * 0.8, radius];
  const directions = [
    [0, -1], [0, 1], [-1, 0], [1, 0],
    [-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7],
  ];
  for (const r of steps) {
    const found = new Set<HTMLElement>();
    for (const [dx, dy] of directions) {
      const el = document.elementFromPoint(x + dx * r, y + dy * r);
      const btn = el?.closest('button, a[href], [role="button"], summary') as HTMLElement | null;
      if (btn && isActuallyClickable(btn)) found.add(btn);
    }
    if (found.size === 1) return [...found][0];
    if (found.size > 1) {
      // 여러 개면 가장 가까운 버튼 선택
      let best: HTMLElement | null = null;
      let bestDist = Infinity;
      found.forEach((b) => {
        const rect = b.getBoundingClientRect();
        const cx = Math.max(rect.left, Math.min(x, rect.right));
        const cy = Math.max(rect.top, Math.min(y, rect.bottom));
        const d = Math.hypot(cx - x, cy - y);
        if (d < bestDist) {
          bestDist = d;
          best = b;
        }
      });
      return best;
    }
  }
  return null;
}

/**
 * 터치 보정 설치. 반환값을 호출하면 해제됩니다.
 */
export function installTouchAssist(getRadius: () => number): () => void {
  // 드래그(위젯 이동 등) 직후의 클릭은 보정하지 않도록 누른 위치·시간을 기억
  let down = { x: 0, y: 0, t: 0 };
  const onPointerDown = (e: PointerEvent) => {
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
  };

  const onClick = (e: MouseEvent) => {
    // 키보드로 발생한 클릭(detail 0)·보조 버튼·보정으로 생성된 클릭은 제외
    if (e.detail === 0 || e.button !== 0 || (e as any).__touchAssisted) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    if (moved > 6 || performance.now() - down.t > 700) return; // 탭이 아닌 드래그/길게 누르기
    const target = e.target as Element | null;
    if (!target || landedOnInteractive(target) || target.closest(EXCLUDED_SELECTOR)) return;

    const btn = findNearestButton(e.clientX, e.clientY, getRadius());
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();
    const synthetic = new MouseEvent('click', { bubbles: true, cancelable: true, view: window, clientX: e.clientX, clientY: e.clientY });
    (synthetic as any).__touchAssisted = true;
    btn.dispatchEvent(synthetic);
  };

  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('click', onClick, true);
  return () => {
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('click', onClick, true);
  };
}
