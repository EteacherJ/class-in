import React, { useEffect, useRef, useState } from 'react';

/**
 * ↔ 사이드 스택 너비 조절 손잡이
 * - 평소: 스택과 위젯 영역 사이 가운데에 은은한 손잡이(⋮)만 보여요.
 * - 마우스를 올리면: 위아래로 얇은 안내선 + [좁게 · 보통 · 넓게] 바로 고르기
 * - 끌기: 마우스 · 터치 · 전자칠판 펜 모두 가능, 끄는 동안 지금 너비(px) 표시, 단계 근처에서 착 붙음
 * - 두 번 누르기: 기본 너비로 / 키보드 ← → 로 10px씩
 */
export interface StackResizerProps {
  /** 어느 쪽 스택의 너비인지 (left: 오른쪽으로 끌면 넓어짐, right: 왼쪽으로 끌면 넓어짐) */
  side: 'left' | 'right';
  width: number;
  min: number;
  max: number;
  defaultWidth: number;
  presets: [string, number][];
  /** 너비를 바꿔도 되는지 (가운데 위젯 영역 최소 너비 확인) */
  canFit: (w: number) => boolean;
  onChange: (w: number) => void;
  className?: string;
  label: string;
}

const SNAP = 10;

export const StackResizer: React.FC<StackResizerProps> = ({ side, width, min, max, defaultWidth, presets, canFit, onChange, className = '', label }) => {
  const [drag, setDrag] = useState(false);
  const [hover, setHover] = useState(false);
  const [menu, setMenu] = useState(false);
  const hoverTimer = useRef<number | null>(null);
  const start = useRef({ x: 0, w: 0 });
  const lastSnap = useRef<number | null>(null);

  const clamp = (w: number) => Math.max(min, Math.min(max, Math.round(w)));
  const commit = (w: number) => {
    const c = clamp(w);
    if (canFit(c)) onChange(c);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-rz-menu]')) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    start.current = { x: e.clientX, w: width };
    lastSnap.current = null;
    setDrag(true);
    setMenu(false);
    document.body.classList.add('ci-resizing');
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const dx = e.clientX - start.current.x;
    let w = start.current.w + (side === 'left' ? dx : -dx);
    // 단계 근처에서 착 붙기
    const near = presets.find(([, p]) => Math.abs(p - w) <= SNAP);
    if (near) {
      w = near[1];
      lastSnap.current = near[1];
    } else lastSnap.current = null;
    commit(w);
  };
  const end = (e: React.PointerEvent) => {
    if (!drag) return;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    setDrag(false);
    document.body.classList.remove('ci-resizing');
  };
  useEffect(() => () => document.body.classList.remove('ci-resizing'), []);

  const onEnter = () => {
    setHover(true);
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setMenu(true), 450);
  };
  const onLeave = () => {
    setHover(false);
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setMenu(false), 250);
  };

  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 40 : 10;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const grow = (e.key === 'ArrowRight') === (side === 'left');
      commit(width + (grow ? step : -step));
    } else if (e.key === 'Home' || e.key === 'Enter') {
      e.preventDefault();
      commit(defaultWidth);
    }
  };

  const activePreset = presets.find(([, p]) => Math.abs(p - width) <= 2)?.[0];

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={width}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      data-col-resizer
      data-rz-side={side}
      className={`ci-rz ${drag ? 'is-drag' : ''} ${hover ? 'is-hover' : ''} ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onDoubleClick={() => commit(defaultWidth)}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onKeyDown={onKey}
      title={`${label} · 끌어서 너비 조절 · 두 번 누르면 기본 너비`}
    >
      <span className="ci-rz-line" aria-hidden />
      <span className="ci-rz-grip" aria-hidden>
        <i />
        <i />
        <i />
      </span>
      {drag && (
        <span className={`ci-rz-badge ${lastSnap.current != null ? 'is-snap' : ''}`} aria-live="polite">
          {width}px{activePreset ? ` · ${activePreset}` : ''}
        </span>
      )}
      {menu && !drag && (
        <div
          className={`ci-rz-menu is-${side}`}
          data-rz-menu
          onPointerEnter={() => hoverTimer.current && clearTimeout(hoverTimer.current)}
          onPointerLeave={onLeave}
        >
          <span className="ci-rz-menu-h">{label}</span>
          <div className="ci-rz-chips">
            {presets.map(([l, p]) => {
              const ok = canFit(clamp(p));
              return (
                <button
                  key={l}
                  type="button"
                  className={activePreset === l ? 'is-on' : ''}
                  disabled={!ok}
                  onClick={() => commit(p)}
                  data-rz-preset={l}
                  title={ok ? `${p}px` : '창이 좁아서 이 너비는 쓸 수 없어요'}
                >
                  {l}
                  <small>{p}</small>
                </button>
              );
            })}
          </div>
          <span className="ci-rz-menu-f">끌기 · 두 번 누르면 기본({defaultWidth}px)</span>
        </div>
      )}
    </div>
  );
};

export default StackResizer;
