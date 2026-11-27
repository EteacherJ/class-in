import React, { useEffect, useRef, useState } from 'react';
import { X, RotateCw } from 'lucide-react';
import { largeGet, largeSet } from '../utils/largeStore';
import { loadImageFile } from '../utils/imageTools';

/**
 * ============================================================================
 * 🖼️ 이미지 스티커 (위젯 영역에 좋아하는 이미지 붙이기)
 * ============================================================================
 * - 편집 중: 위젯이 잠시 숨겨지고, 스티커를 끌어 옮기기 · 모서리로 크기 조절 · 위쪽 손잡이로 회전 · ✕ 삭제
 * - [완료]를 누르면 위젯이 다시 나타나고, 스티커는 위젯 뒤 바탕에 그대로 붙어 있어요.
 * - 위치와 크기는 위젯 영역 너비에 대한 비율로 저장 → 창 크기가 바뀌어도 같은 자리에 있어요.
 * - 이미지는 대용량 저장소(IndexedDB)에 보관합니다.
 */

interface Sticker {
  id: string;
  src: string;
  /** 위젯 영역 너비 대비 비율 */
  x: number;
  y: number;
  w: number;
  /** 세로/가로 비율 */
  ratio: number;
  rot: number;
  /** 꾸미기 테두리: 없음 · 폴라로이드 · 마스킹테이프 · 둥근 액자 */
  frame?: 'none' | 'polaroid' | 'tape' | 'round';
}
const FRAMES: { id: NonNullable<Sticker['frame']>; label: string }[] = [
  { id: 'none', label: '없음' },
  { id: 'polaroid', label: '폴라로이드' },
  { id: 'tape', label: '테이프' },
  { id: 'round', label: '둥근 액자' },
];

const KEY = 'class_stickers_v1';
const load = (): Sticker[] => {
  try {
    const v = JSON.parse(largeGet(KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

interface Props {
  editing: boolean;
  onDone: () => void;
  onShowToast?: (msg: string) => void;
  /** 이 숫자가 바뀔 때마다 이미지 선택 창 열기 (하단 위젯바의 스티커 버튼) */
  pickNonce?: number;
}

type Gesture =
  | { kind: 'move'; id: string; sx: number; sy: number; ox: number; oy: number }
  | { kind: 'resize'; id: string; sx: number; ow: number }
  | { kind: 'rotate'; id: string; cx: number; cy: number };

export const StickerLayer: React.FC<Props> = ({ editing, onDone, onShowToast, pickNonce = 0 }) => {
  const [stickers, setStickers] = useState<Sticker[]>(load);
  const [selected, setSelected] = useState<string | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const [width, setWidth] = useState(1000);

  // 위젯 영역 너비 추적
  useEffect(() => {
    const el = layerRef.current?.parentElement;
    if (!el) return;
    const measure = () => setWidth(Math.max(200, el.clientWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 저장 (편집 중 변경 시)
  const save = (next: Sticker[]) => {
    setStickers(next);
    largeSet(KEY, JSON.stringify(next));
  };

  useEffect(() => {
    if (!editing) setSelected(null);
  }, [editing]);
  useEffect(() => {
    if (pickNonce > 0) setTimeout(() => fileRef.current?.click(), 200);
  }, [pickNonce]);

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const scrollTop = layerRef.current?.parentElement?.scrollTop ?? 0;
    const added: Sticker[] = [];
    for (const f of Array.from(files).slice(0, 10)) {
      if (!f.type.startsWith('image/')) continue;
      try {
        const { dataUrl, width: iw, height: ih } = await loadImageFile(f, 1200, 0.9);
        const i = stickers.length + added.length;
        added.push({
          id: `st-${Date.now()}-${i}`,
          src: dataUrl,
          x: 0.12 + ((i * 0.07) % 0.55),
          y: (scrollTop + 60) / width + (i % 4) * 0.03,
          w: 0.18,
          ratio: ih / Math.max(1, iw),
          rot: [-6, 4, -3, 7][i % 4],
        });
      } catch {
        onShowToast?.('🔴 이미지를 불러오지 못했어요.');
      }
    }
    if (added.length) {
      save([...stickers, ...added]);
      setSelected(added[added.length - 1].id);
      onShowToast?.(`🖼️ 스티커 ${added.length}개를 붙였어요. 끌어서 원하는 곳에 놓으세요.`);
    }
  };

  // ── 끌기 · 크기 · 회전 ──
  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    setStickers((prev) =>
      prev.map((s) => {
        if (s.id !== g.id) return s;
        if (g.kind === 'move') return { ...s, x: g.ox + (e.clientX - g.sx) / width, y: Math.max(0, g.oy + (e.clientY - g.sy) / width) };
        if (g.kind === 'resize') return { ...s, w: Math.min(0.9, Math.max(0.04, g.ow + (e.clientX - g.sx) / width)) };
        const ang = (Math.atan2(e.clientY - g.cy, e.clientX - g.cx) * 180) / Math.PI + 90;
        return { ...s, rot: Math.round(ang) };
      })
    );
  };
  const onPointerUp = () => {
    if (!gesture.current) return;
    gesture.current = null;
    setStickers((cur) => {
      largeSet(KEY, JSON.stringify(cur));
      return cur;
    });
  };

  const bringToFront = (id: string) => {
    const s = stickers.find((x) => x.id === id);
    if (!s) return;
    save([...stickers.filter((x) => x.id !== id), s]);
  };

  return (
    <div
      ref={layerRef}
      className={`sticker-layer ${editing ? 'is-editing' : ''}`}
      onPointerMove={editing ? onPointerMove : undefined}
      onPointerUp={editing ? onPointerUp : undefined}
      onPointerCancel={editing ? onPointerUp : undefined}
      onPointerDown={(e) => {
        if (editing && e.target === e.currentTarget) setSelected(null);
      }}
    >
      {stickers.map((s) => {
        const isSel = editing && selected === s.id;
        return (
          <div
            key={s.id}
            className={`sticker-item frame-${s.frame || 'none'} ${isSel ? 'is-selected' : ''}`}
            style={{ left: s.x * width, top: s.y * width, width: s.w * width, height: s.w * width * s.ratio, transform: `rotate(${s.rot}deg)` }}
            onPointerDown={(e) => {
              if (!editing) return;
              e.preventDefault();
              e.stopPropagation();
              (e.currentTarget.parentElement as HTMLElement).setPointerCapture?.(e.pointerId);
              setSelected(s.id);
              gesture.current = { kind: 'move', id: s.id, sx: e.clientX, sy: e.clientY, ox: s.x, oy: s.y };
            }}
            onDoubleClick={() => editing && bringToFront(s.id)}
          >
            <img src={s.src} alt="" draggable={false} />
            {s.frame === 'tape' && (
              <>
                <i className="sticker-tape is-l" />
                <i className="sticker-tape is-r" />
              </>
            )}
            {isSel && (
              <>
                <div className="sticker-frames" onPointerDown={(e) => e.stopPropagation()} style={{ transform: `rotate(${-s.rot}deg)` }} data-sticker-frames>
                  {FRAMES.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={(s.frame || 'none') === f.id ? 'is-on' : ''}
                      onClick={() => save(stickers.map((x) => (x.id === s.id ? { ...x, frame: f.id } : x)))}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="sticker-btn sticker-del"
                  title="스티커 떼기"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => save(stickers.filter((x) => x.id !== s.id))}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <span
                  className="sticker-btn sticker-rot"
                  title="돌리기"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    (layerRef.current as HTMLElement).setPointerCapture?.(e.pointerId);
                    const r = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                    gesture.current = { kind: 'rotate', id: s.id, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
                  }}
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </span>
                <span
                  className="sticker-btn sticker-size"
                  title="크기 조절"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    (layerRef.current as HTMLElement).setPointerCapture?.(e.pointerId);
                    gesture.current = { kind: 'resize', id: s.id, sx: e.clientX, ow: s.w };
                  }}
                />
              </>
            )}
          </div>
        );
      })}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
};

export default StickerLayer;
