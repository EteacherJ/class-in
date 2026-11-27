/**
 * ============================================================================
 * [motion.ts] 장시간 구동용 애니메이션·폴링 절전 관리자
 * ============================================================================
 * 하루 8시간 이상 켜 두는 교실 대시보드에서, 아무도 조작하지 않을 때 계속 도는
 * 장식용 무한 애니메이션(헤더 해·빛 번짐, 상태 점 깜빡임, 루미 네온 등)을 잠시 멈춰
 * GPU·CPU 사용과 발열을 줄입니다.
 *
 * - 창이 숨겨지면(최소화·다른 데스크톱): html.app-hidden → 모든 CSS 애니메이션 일시정지
 * - 90초 동안 조작이 없으면: '무한 반복' 애니메이션만 골라 일시정지 (시계 넘김 등 1회성 동작은 그대로)
 * - 학생이 보는 화면(보조 모니터 송출 창)과 소음 측정 위젯은 멈추지 않습니다.
 * - 마우스·키보드·터치가 감지되면 즉시 다시 움직입니다.
 */

const IDLE_AFTER_MS = 90_000;
const CHECK_EVERY_MS = 15_000;
const PAUSED_CLASS = 'lg-anim-paused';
const EXEMPT_SELECTOR = '[data-widget-card-id="noise"], .keep-anim, [data-keep-anim]';

let lastActivity = Date.now();
let idle = false;

/** 장식용 폴링(눈 깜빡임, 재생 위치 확인 등)을 건너뛰어도 되는 상태인지 */
export function isMotionPaused(): boolean {
  if (typeof document === 'undefined') return false;
  return document.hidden || idle;
}

function pauseInfiniteAnimations() {
  const nodes = document.querySelectorAll<HTMLElement>('body *');
  nodes.forEach((el) => {
    if (el.closest(EXEMPT_SELECTOR)) return;
    const s = getComputedStyle(el);
    if (s.animationName !== 'none' && s.animationIterationCount.includes('infinite')) {
      el.classList.add(PAUSED_CLASS);
    }
  });
}

function resumeAnimations() {
  document.querySelectorAll(`.${PAUSED_CLASS}`).forEach((el) => el.classList.remove(PAUSED_CLASS));
}

/**
 * 절전 관리자 설치. 반환값을 호출하면 해제됩니다.
 * @param enabled 학생 송출 화면 등에서는 false 로 설치하지 않음
 */
export function installMotionManager(enabled = true): () => void {
  if (!enabled || typeof window === 'undefined') return () => {};
  const root = document.documentElement;

  const onVisibility = () => {
    root.classList.toggle('app-hidden', document.hidden);
    if (!document.hidden) lastActivity = Date.now();
  };

  const onActivity = () => {
    lastActivity = Date.now();
    if (idle) {
      idle = false;
      root.classList.remove('lg-idle');
      resumeAnimations();
    }
  };

  const timer = window.setInterval(() => {
    if (!idle && !document.hidden && Date.now() - lastActivity >= IDLE_AFTER_MS) {
      idle = true;
      root.classList.add('lg-idle');
      pauseInfiniteAnimations();
    }
  }, CHECK_EVERY_MS);

  const events: (keyof WindowEventMap)[] = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'];
  events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
  document.addEventListener('visibilitychange', onVisibility);
  onVisibility();

  return () => {
    window.clearInterval(timer);
    events.forEach((ev) => window.removeEventListener(ev, onActivity));
    document.removeEventListener('visibilitychange', onVisibility);
    root.classList.remove('lg-idle', 'app-hidden');
    resumeAnimations();
  };
}
