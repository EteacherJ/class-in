import React, { useEffect, useRef, useState } from 'react';
import { DoorState, LumiDoor } from './LumiDoor';

/**
 * 🚪 바탕화면 미니 루미 문 (대시보드를 접었을 때 떠 있는 작은 창 / 웹에서는 화면 위 떠 있는 아이콘)
 * - 끌면 원하는 곳으로 이동 (위치 기억)
 * - 누르면 문이 활짝 열리며 대시보드가 다시 펼쳐짐
 * - 마우스를 올리면 문이 살짝 열리고 루미가 반겨 줌
 */
interface Props {
  /** 웹 브라우저(앱이 아닐 때) 화면 안에서 띄우는 경우 */
  inPage?: boolean;
  onRestore?: (from: { x: number; y: number }) => void;
}

const POS_KEY = 'class_mini_inpage_pos';

export const MiniLumiWindow: React.FC<Props> = ({ inPage = false, onRestore }) => {
  const api = (window as any).electronAPI?.mini;
  const [door, setDoor] = useState<DoorState>('open');
  const [hover, setHover] = useState(false);
  const drag = useRef<{ sx: number; sy: number; wx: number; wy: number; moved: boolean } | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try {
      const p = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
      if (p && Number.isFinite(p.x)) return p;
    } catch {}
    return { x: window.innerWidth - 150, y: 20 };
  });

  // 도착 연출: 문이 열린 채 나타났다가 닫힘
  useEffect(() => {
    const t = window.setTimeout(() => setDoor('closed'), 650);
    const off = api?.onShown?.(() => {
      setDoor('open');
      window.setTimeout(() => setDoor('closed'), 650);
    });
    if (!inPage) document.documentElement.classList.add('mini-mode');
    return () => {
      clearTimeout(t);
      off?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const restore = () => {
    setDoor('open');
    window.setTimeout(() => {
      if (onRestore) onRestore({ x: pos.x + 56, y: pos.y + 56 });
      else api?.restore?.();
    }, 380);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const [wx, wy] = inPage ? [pos.x, pos.y] : api?.getPosition?.() || [0, 0];
    drag.current = { sx: e.screenX, sy: e.screenY, wx, wy, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.screenX - d.sx;
    const dy = e.screenY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    d.moved = true;
    if (inPage) setPos({ x: Math.max(0, Math.min(window.innerWidth - 120, d.wx + dx)), y: Math.max(0, Math.min(window.innerHeight - 130, d.wy + dy)) });
    else api?.moveTo?.(d.wx + dx, d.wy + dy);
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved) {
      if (inPage) {
        try {
          localStorage.setItem(POS_KEY, JSON.stringify(pos));
        } catch {}
      } else api?.moveEnd?.();
      return;
    }
    restore();
  };

  const body = (
    <div
      className={inPage ? 'cl-mini-inpage' : 'mini-window'}
      style={inPage ? { left: pos.x, top: pos.y } : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      title="누르면 대시보드가 펼쳐져요 · 끌어서 옮길 수 있어요"
      role="button"
      aria-label="Class in 대시보드 펼치기"
    >
      <LumiDoor state={door === 'closed' && hover ? 'ajar' : door} size={inPage ? 112 : 118} face={hover ? 'happy' : undefined} />
      {!inPage && <span className="mini-window-tip">눌러서 펼치기</span>}
    </div>
  );
  return body;
};

export default MiniLumiWindow;
