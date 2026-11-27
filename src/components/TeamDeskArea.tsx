import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Student } from '../types';
import { DeskPos, getTeamDeskPositions, setTeamDeskPositions, useSeatingLayoutVersion } from '../utils/seatingLayout';

/**
 * 🪑 모둠 카드 안 책상 배치 영역 (대시보드 위젯 · 보조 모니터 공용)
 * - 기본: 홀수 인원은 1·2·2 형태, 짝수는 2명씩
 * - 배치 편집(editing) 중에는 책상을 손가락/마우스로 끌어 자유롭게 옮길 수 있고, 위치는 저장됩니다.
 * - 편집 중이 아닐 때는 기존처럼 책상을 끌어 다른 학생과 자리 교체 / 다른 모둠으로 넣기가 됩니다.
 */
interface TeamDeskAreaProps {
  teamId: number;
  students: Student[];
  editing: boolean;
  gap?: number;
  /** 학생 시점: 모둠 안 책상을 180° 돌려서 보여 줌 (저장 위치는 교사 시점 기준 — 교사 1·2·2 / 학생 2·2·1) */
  flipped?: boolean;
  renderDesk: (student: Student, index: number) => React.ReactNode;
}

export const TeamDeskArea: React.FC<TeamDeskAreaProps> = ({ teamId, students, editing, gap = 10, flipped = false, renderDesk }) => {
  const version = useSeatingLayoutVersion();
  const areaRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [deskH, setDeskH] = useState(64);
  const [drag, setDrag] = useState<{ id: number; dx: number; dy: number; startX: number; startY: number; left: number; top: number } | null>(null);

  const ids = students.map((s) => s.id);
  const idsKey = ids.join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stored = useMemo(() => getTeamDeskPositions(teamId, ids), [teamId, idsKey, version]);
  const storedMaxRow = Math.max(0, ...Object.values(stored).map((p: DeskPos) => p.y));
  // 화면에 보이는 위치 (교사 시점이면 좌우 · 앞뒤 반전)
  const positions = useMemo(() => {
    if (!flipped) return stored;
    const out: Record<number, DeskPos> = {};
    for (const [k, p] of Object.entries(stored)) out[Number(k)] = { x: 1 - (p as DeskPos).x, y: storedMaxRow - (p as DeskPos).y };
    return out;
  }, [stored, flipped, storedMaxRow]);

  // 영역 너비 & 책상 높이 측정
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const measure = () => {
      setWidth(el.clientWidth);
      let h = 0;
      el.querySelectorAll<HTMLElement>('[data-desk-inner]').forEach((d) => (h = Math.max(h, d.offsetHeight)));
      if (h > 0) setDeskH(h);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.querySelectorAll<HTMLElement>('[data-desk-inner]').forEach((d) => ro.observe(d));
    return () => ro.disconnect();
  }, [idsKey]);

  const deskW = Math.max(40, (width - gap) / 2);
  const span = Math.max(1, width - deskW); // x=1 일 때 왼쪽 위치(px)
  const rowH = deskH + gap;
  const maxRow = Math.max(0, ...Object.values(positions).map((p: DeskPos) => p.y));
  const height = students.length ? (maxRow + 1) * rowH - gap : 0;

  const onPointerDown = (e: React.PointerEvent, id: number) => {
    if (!editing) return;
    e.preventDefault();
    e.stopPropagation();
    const p = positions[id];
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag({ id, dx: 0, dy: 0, startX: e.clientX, startY: e.clientY, left: p.x * span, top: p.y * rowH });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    setDrag({ ...drag, dx: e.clientX - drag.startX, dy: e.clientY - drag.startY });
  };
  const onPointerUp = () => {
    if (!drag) return;
    const left = Math.min(span, Math.max(0, drag.left + drag.dx));
    const top = Math.max(0, drag.top + drag.dy);
    const shown = { x: left / span, y: top / rowH };
    const saved = flipped ? { x: 1 - shown.x, y: Math.max(0, storedMaxRow - shown.y) } : shown;
    const next = { ...stored, [drag.id]: saved };
    setDrag(null);
    if (drag.dx !== 0 || drag.dy !== 0) setTeamDeskPositions(teamId, next);
  };

  if (students.length === 0) return null;

  return (
    <div
      ref={areaRef}
      className={`team-desk-area relative w-full ${editing ? 'is-editing' : ''}`}
      style={{ height: height + (drag ? Math.max(0, drag.top + drag.dy - maxRow * rowH) : 0) }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {students.map((s, i) => {
        const p = positions[s.id] || { x: 0, y: 0 };
        const isDragging = drag?.id === s.id;
        const left = isDragging ? Math.min(span, Math.max(0, drag!.left + drag!.dx)) : p.x * span;
        const top = isDragging ? Math.max(0, drag!.top + drag!.dy) : p.y * rowH;
        return (
          <div
            key={s.id}
            className={`team-desk-slot absolute ${isDragging ? 'is-dragging' : ''}`}
            style={{ left, top, width: deskW, zIndex: isDragging ? 20 : 1 }}
            onPointerDown={(e) => onPointerDown(e, s.id)}
          >
            <div data-desk-inner className="w-full">
              {renderDesk(s, i)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TeamDeskArea;
