/**
 * 🖥️ 보조 화면 자동 맞춤 무대
 *  - 안쪽 내용을 화면(가로 · 세로)에 맞게 통째로 키워서 좌우 빈 여백을 줄여요.
 *  - 먼저 가로를 꽉 채우는 배율로 잡고, 세로가 넘치면 배율을 낮추면서 내용 폭을 넓혀 다시 맞춰요.
 *  - 거의 모든 화면에서 스크롤 없이 맞춰요. 아주 작은 화면(배율 0.5 미만)에서만 스크롤해요.
 *  - 내용이 다 들어가면 스크롤 막대를 숨겨서, 막대가 생겼다 사라지며 떨리는 일이 없어요.
 */
import React, { useLayoutEffect, useRef } from 'react';

interface Props {
  /** 디자인 기준 폭(px) — 이 폭일 때 배율 1 */
  base: number;
  /** 최대 배율 */
  max?: number;
  /** 최소 배율 (이보다 작아지면 스크롤) */
  minZoom?: number;
  /** 내용 폭이 기준 폭의 몇 배까지 넓어져도 되는지 */
  maxStretch?: number;
  children: React.ReactNode;
  className?: string;
  'data-testid'?: string;
}

export const AutoFitStage: React.FC<Props> = ({ base, max = 2, minZoom = 0.5, maxStretch = 1.6, children, className = '', ...rest }) => {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const last = useRef({ w: 0, h: 0, ow: 0, oh: 0 });

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const box = boxRef.current;
    const inner = innerRef.current;
    if (!outer || !box || !inner) return;
    let raf = 0;
    let busy = false;

    const fit = () => {
      const ow = outer.clientWidth;
      const oh = outer.clientHeight;
      if (ow < 50 || oh < 50) return;
      busy = true;
      let z = Math.min(max, ow / base);
      let w = ow / z;
      let h = 0;
      for (let k = 0; k < 6; k++) {
        w = Math.min(base * maxStretch, ow / z);
        inner.style.width = `${w}px`;
        h = inner.offsetHeight;
        if (h * z <= oh + 1) break;
        const nz = Math.max(minZoom, oh / h);
        if (Math.abs(nz - z) < 0.005) { z = nz; break; }
        z = nz;
      }
      w = Math.min(base * maxStretch, ow / z);
      inner.style.width = `${w}px`;
      h = inner.offsetHeight;
      inner.style.transform = `scale(${z})`;
      box.style.width = `${w * z}px`;
      box.style.height = `${h * z}px`;
      // 다 들어가면 스크롤 막대를 아예 숨겨요 (막대가 생겼다 사라지며 화면이 떨리는 것 방지)
      outer.classList.toggle('is-scroll', h * z > oh + 2 || w * z > ow + 2);
      last.current = { w, h, ow, oh };
      busy = false;
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fit);
    };

    const ro = new ResizeObserver(() => {
      if (busy) return;
      const L = last.current;
      // 2px 이하의 작은 흔들림은 무시 (배율이 왔다 갔다 하며 떨리지 않게)
      if (Math.abs(outer.clientWidth - L.ow) <= 2 && Math.abs(outer.clientHeight - L.oh) <= 2 && Math.abs(inner.offsetHeight - L.h) < 2 && Math.abs(inner.offsetWidth - L.w) < 1) return;
      schedule();
    });
    ro.observe(outer);
    ro.observe(inner);
    fit();
    // 글꼴 · 이미지가 늦게 들어와도 다시 맞춰요
    const t = window.setTimeout(schedule, 400);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [base, max, minZoom, maxStretch]);

  return (
    <div ref={outerRef} className={`dm-autofit ${className}`} {...rest}>
      <div ref={boxRef} className="dm-autofit-box">
        <div ref={innerRef} className="dm-autofit-inner">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AutoFitStage;
