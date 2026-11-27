import React, { useRef, useState, useEffect, useMemo, useCallback, useLayoutEffect } from 'react';
import {
  PenTool,
  Eraser,
  Square,
  Circle,
  Minus,
  Trash2,
  Undo2,
  Palette,
  Move,
  Check,
  X,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Pin,
  Grid,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Bandage,
  Plus,
  ToggleLeft,
  ToggleRight,
  ImageIcon,
  MousePointer2,
  Hand,
  Copy,
  Download,
  FolderArchive,
  Zap,
  Redo2,
  Ruler,
  DraftingCompass,
  Blinds,
  Flashlight,
  Camera,
  Gauge,
  TriangleRight,
  Triangle,
} from 'lucide-react';
import { AngleOverlay, shapePolygon, isPolyKind, SHAPE_MENU, ShapeIcon, CM, type ShapePoly } from './drawing/AngleOverlay';
const Solid3DStage = React.lazy(() => import('./drawing/Solid3DStage'));
import { CompassView, SetSquareView, setSquareEdges, type Compass, type SetSquare } from './WbInstruments';
import { WhiteboardSlide } from '../utils/cloudSync';

import { largeGet, largeSet } from '../utils/largeStore';
interface DualMonitorDrawingCanvasProps {
  isLight?: boolean;
}

const BOARD_WIDTH = 5000;
const BOARD_HEIGHT = 3600;

// =========================================================================
// ✏️ 연필 리얼 흑연/종이 결 텍스처(Paper Grain) 64x64 노이즈 마스크 엔진
// =========================================================================
const PAPER_NOISE_SIZE = 64;
const paperNoiseTable = new Float32Array(PAPER_NOISE_SIZE * PAPER_NOISE_SIZE);
for (let i = 0; i < paperNoiseTable.length; i++) {
  // 0.5 ~ 1.0 사이의 종이 섬유 요철 계수 (거친 종이 마찰 질감)
  paperNoiseTable[i] = 0.5 + Math.random() * 0.5;
}

const getPaperNoiseFactor = (x: number, y: number): number => {
  const ix = Math.floor(Math.abs(x)) % PAPER_NOISE_SIZE;
  const iy = Math.floor(Math.abs(y)) % PAPER_NOISE_SIZE;
  return paperNoiseTable[iy * PAPER_NOISE_SIZE + ix] || 0.75;
};

type DrawTool = 'pen' | 'line' | 'rect' | 'circle' | 'triangle' | 'rtriangle' | 'parallelogram' | 'rhombus' | 'hexagon' | 'octagon' | 'eraser' | 'select' | 'hand' | 'text' | 'tape' | 'laser';
type PenType = 'pen' | 'pencil' | 'highlighter';

interface FloatingSelection {
  origX: number;
  origY: number;
  origWidth: number;
  origHeight: number;
  width: number;
  height: number;
  currentX: number;
  currentY: number;
  canvas: HTMLCanvasElement;
  baseSnapshot: ImageData; // 이동 전 원본 상태 (지우기 적용 전)
}

// 🔤 텍스트 상자 객체 인터페이스
interface TextAnnotation {
  id: string;
  x: number;
  y: number;
  width?: number; // 📐 텍스트 영역 너비 (기본 260px)
  text: string;
  /** 🎨 부분 색이 들어간 글자 (정리된 HTML: span[color] · br 만) */
  rich?: string;
  color: string;
  fontSize: number;
  isEditing: boolean;
}

// ─────────────────────────────────────────────────────────
// 🎨 텍스트 상자: 부분 색 글자 다루기
//  - contentEditable 이 만든 HTML 을 '줄 → 색 조각' 으로 정리해서 저장해요 (스크립트 · 다른 태그는 버려요)
// ─────────────────────────────────────────────────────────
type RichRun = { t: string; c?: string };
const RICH_COLOR_RE = /^(#[0-9a-f]{3,8}|rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(,\s*[\d.]+\s*)?\))$/i;
const escHtml = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function richToLines(html: string): RichRun[][] {
  const lines: RichRun[][] = [[]];
  if (typeof DOMParser === 'undefined') return [[{ t: html }]];
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return lines;
  let pendingBreak = false;
  const last = () => lines[lines.length - 1];
  const push = (t: string, c?: string) => {
    if (!t) return;
    if (pendingBreak) {
      lines.push([]);
      pendingBreak = false;
    }
    const L = last();
    const prev = L[L.length - 1];
    if (prev && prev.c === c) prev.t += t;
    else L.push(c ? { t, c } : { t });
  };
  const walk = (node: Node, c?: string) => {
    if (node.nodeType === 3) {
      push((node.textContent || '').replace(/\u00a0/g, ' '), c);
      return;
    }
    if (node.nodeType !== 1) return;
    const el = node as HTMLElement;
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE') return;
    if (tag === 'BR') {
      if (pendingBreak) {
        lines.push([]);
        pendingBreak = false;
      }
      lines.push([]);
      return;
    }
    let color = c;
    const sc = el.style?.color || (tag === 'FONT' ? el.getAttribute('color') || '' : '');
    if (sc && RICH_COLOR_RE.test(sc.trim())) color = sc.trim();
    const block = tag === 'DIV' || tag === 'P' || tag === 'LI';
    if (block) {
      if (last().length > 0 || pendingBreak) lines.push([]);
      pendingBreak = false;
      const kids = Array.from(el.childNodes);
      const onlyBr = kids.length === 1 && kids[0].nodeType === 1 && (kids[0] as HTMLElement).tagName === 'BR';
      if (!onlyBr) kids.forEach((k) => walk(k, color));
      pendingBreak = true;
      return;
    }
    el.childNodes.forEach((k) => walk(k, color));
  };
  root.childNodes.forEach((k) => walk(k));
  while (lines.length > 1 && lines[lines.length - 1].length === 0) lines.pop();
  return lines;
}
export function linesToRich(lines: RichRun[][]): string {
  return lines
    .map((runs) => runs.map((r) => (r.c ? `<span style="color:${r.c}">${escHtml(r.t)}</span>` : escHtml(r.t))).join(''))
    .join('<br>');
}
export const normalizeRich = (html: string) => {
  const lines = richToLines(html);
  return { rich: linesToRich(lines), text: lines.map((l) => l.map((r) => r.t).join('')).join('\n') };
};
const textRich = (t: { text: string; rich?: string }) => (t.rich != null ? t.rich : escHtml(t.text || '').replace(/\n/g, '<br>'));

/** ✍️ 텍스트 상자 편집기 — 처음 열릴 때만 내용을 넣고, 그 뒤로는 화면을 다시 그리지 않아서 커서가 튀지 않아요 */
const RichTextEditor: React.FC<{
  html: string;
  style: React.CSSProperties;
  onChange: (rich: string, text: string) => void;
  onBlur: () => void;
  onEscape: () => void;
}> = ({ html, style, onChange, onBlur, onEscape }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const cb = useRef({ onChange, onBlur, onEscape });
  cb.current = { onChange, onBlur, onEscape };
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = html;
    el.focus();
    try {
      const r = document.createRange();
      r.selectNodeContents(el);
      r.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(r);
    } catch {
      /* 무시 */
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const emit = () => {
    const el = ref.current;
    if (!el) return;
    const n = normalizeRich(el.innerHTML);
    cb.current.onChange(n.rich, n.text);
  };
  return (
    <div
      ref={ref}
      data-wb-rich-editor
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onInput={emit}
      onPaste={(e) => {
        e.preventDefault();
        const t = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, t);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          cb.current.onEscape();
        }
      }}
      onBlur={() => cb.current.onBlur()}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      style={style}
      className="wb-rich outline-none whitespace-pre-wrap min-h-[1.35em] cursor-text"
      data-placeholder="내용을 입력하세요..."
    />
  );
};

// 🩹 학습용 가리기 테이프(Study Tape) 객체 인터페이스
interface StudyTape {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  isHidden: boolean; // true: 불투명 가리기(기본), false: 반투명 점선(글자 보임)
}

// 📜 통합 히스토리 스택 인터페이스 (캔버스 픽셀 + 텍스트 + 테이프)
interface CanvasHistoryItem {
  imageData: ImageData;
  texts: TextAnnotation[];
  tapes: StudyTape[];
  polys?: ShapePoly[];
}

// 🖋️ 굿노트 스타일 획 포인트 (곡선 보간 & 필압/속도 반응형 가변 폭)
interface StrokePoint {
  x: number;
  y: number;
  time: number;
  pressure: number;
  width: number;
}

const PALETTE_COLORS = [
  { name: '화이트', hex: '#ffffff' },
  { name: '형광 옐로우', hex: '#fde047' },
  { name: '형광 오렌지', hex: '#fb923c' },
  { name: '레드', hex: '#ef4444' },
  { name: '형광 핑크', hex: '#f472b6' },
  { name: '바이올렛', hex: '#a855f7' },
  { name: '형광 시안', hex: '#22d3ee' },
  { name: '형광 에메랄드', hex: '#4ade80' },
  { name: '블랙 / 차콜', hex: '#000000' },
];

// 🖍️ 형광펜 전용 연한 색 (진하지 않게)
const HIGHLIGHTER_COLORS = [
  { name: '노랑', hex: '#FFE94D' },
  { name: '연두', hex: '#B7F36B' },
  { name: '하늘', hex: '#8FDCFF' },
  { name: '분홍', hex: '#FFA6D2' },
  { name: '주황', hex: '#FFC07A' },
  { name: '보라', hex: '#D3B8FF' },
];

// 🩹 학습용 테이프 전용 프리셋 색상 (4종)
const TAPE_COLORS = [
  { name: '코랄 레드', hex: '#F87171' },
  { name: '웜 오렌지', hex: '#FB923C' },
  { name: '민트 그린', hex: '#4ADE80' },
  { name: '기본 화이트', hex: '#FFFFFF' },
];

// 🏁 교실 판서에 적합한 화이트보드 배경 프리셋 색상 (6종)
export const BOARD_BG_PRESETS: { id: string; name: string; hex: string; isDark: boolean }[] = [
  { id: 'white', name: '기본 화이트', hex: '#FFFFFF', isDark: false },
  { id: 'cream', name: '미색 / 크림', hex: '#FDFBF7', isDark: false },
  { id: 'yellow', name: '파스텔 옐로우', hex: '#FEF9C3', isDark: false },
  { id: 'blue', name: '파스텔 블루', hex: '#E0F2FE', isDark: false },
  { id: 'green', name: '칠판 그린', hex: '#1E3A2F', isDark: true },
  { id: 'slate', name: '다크 슬레이트', hex: '#1E293B', isDark: true },
];

// 💡 칠판 배경의 어두움/밝기 자동 판별 헬퍼 (패턴 색상 자동 대비용)
const isDarkHexColor = (hex: string): boolean => {
  if (!hex || !hex.startsWith('#')) return false;
  let c = hex.substring(1);
  if (c.length === 3) {
    c = c.split('').map((char) => char + char).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return false;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 140;
};

// 🎯 MS 화이트보드 스타일: 단일 클릭 위치의 연결된 필기 획(Connected Stroke) 바운딩 박스 탐색 (BFS)
const findConnectedStrokeBounds = (
  ctx: CanvasRenderingContext2D,
  clickX: number,
  clickY: number,
  canvasWidth: number,
  canvasHeight: number,
  dpr: number
): { minX: number; minY: number; width: number; height: number } | null => {
  const cw = canvasWidth;
  const ch = canvasHeight;
  if (cw <= 0 || ch <= 0) return null;

  const imgData = ctx.getImageData(0, 0, cw, ch);
  const data = imgData.data;

  const cx = Math.round(clickX * dpr);
  const cy = Math.round(clickY * dpr);
  const searchRadius = Math.round(14 * dpr);

  let seedX = -1;
  let seedY = -1;

  // 클릭 반경 내에서 불투명 픽셀(획) 탐색
  for (let r = 0; r <= searchRadius; r += 2) {
    for (let dy = -r; dy <= r; dy += 2) {
      for (let dx = -r; dx <= r; dx += 2) {
        const px = cx + dx;
        const py = cy + dy;
        if (px >= 0 && px < cw && py >= 0 && py < ch) {
          const alpha = data[(py * cw + px) * 4 + 3];
          if (alpha > 25) {
            seedX = px;
            seedY = py;
            break;
          }
        }
      }
      if (seedX !== -1) break;
    }
    if (seedX !== -1) break;
  }

  if (seedX === -1) return null;

  // BFS를 통한 연결 획 영역(Bounding Box) 추출
  let minX = seedX;
  let maxX = seedX;
  let minY = seedY;
  let maxY = seedY;

  const queue: number[] = [seedX, seedY];
  const visited = new Uint8Array(cw * ch);
  visited[seedY * cw + seedX] = 1;

  const maxPixels = 120000;
  let processed = 0;
  const step = Math.max(1, Math.round(dpr));

  while (queue.length > 0 && processed < maxPixels) {
    const y = queue.pop()!;
    const x = queue.pop()!;
    processed++;

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;

    const neighbors = [
      x + step, y,
      x - step, y,
      x, y + step,
      x, y - step,
      x + step, y + step,
      x - step, y - step,
      x + step, y - step,
      x - step, y + step,
    ];

    for (let i = 0; i < neighbors.length; i += 2) {
      const nx = neighbors[i];
      const ny = neighbors[i + 1];
      if (nx >= 0 && nx < cw && ny >= 0 && ny < ch) {
        const idx = ny * cw + nx;
        if (!visited[idx]) {
          visited[idx] = 1;
          if (data[idx * 4 + 3] > 20) {
            queue.push(nx, ny);
          }
        }
      }
    }
  }

  // 외곽 여백(Padding) 적용
  const pad = Math.round(6 * dpr);
  const finalMinX = Math.max(0, minX - pad);
  const finalMinY = Math.max(0, minY - pad);
  const finalMaxX = Math.min(cw, maxX + pad);
  const finalMaxY = Math.min(ch, maxY + pad);

  const w = finalMaxX - finalMinX;
  const h = finalMaxY - finalMinY;

  if (w <= 0 || h <= 0) return null;

  return {
    minX: Math.floor(finalMinX / dpr),
    minY: Math.floor(finalMinY / dpr),
    width: Math.ceil(w / dpr),
    height: Math.ceil(h / dpr),
  };
};

export const DualMonitorDrawingCanvas: React.FC<DualMonitorDrawingCanvasProps> = ({ isLight = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // 🎯 최상단 임시 인터랙션 레이어 (점선 바운딩 박스 및 실시간 드래그 영역 전용)
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 🖍️ 형광펜 한 획 내 겹침 진해짐 방지용 오프스크린 캔버스
  const highlighterCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [tool, setTool] = useState<DrawTool>('pen');
  const [penType, setPenType] = useState<PenType>('pen');
  const [isHoveringSelection, setIsHoveringSelection] = useState<boolean>(false);
  const [color, setColor] = useState<string>(isLight ? '#0f172a' : '#fde047');
  const [lineWidth, setLineWidth] = useState<number>(2.5);
  const [eraserSize, setEraserSize] = useState<number>(24);

  // ✏️ 연필 질감 강도 (0.5 ~ 2.0) 및 🖍️ 형광펜 투명도 (0.2 ~ 0.8), 형광펜 직선 그리기 옵션
  const [pencilRoughness, setPencilRoughness] = useState<number>(1.0);
  const [highlighterOpacity, setHighlighterOpacity] = useState<number>(0.3);
  const [straightHighlighter, setStraightHighlighter] = useState<boolean>(false);

  // 🖋️ 굿노트 스타일 획 안정화 & 가변 폭 스트로크 버퍼
  const strokePointsRef = useRef<StrokePoint[]>([]);
  const currentSpeedRef = useRef<number>(0);

  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [snapshot, setSnapshot] = useState<ImageData | null>(null);
  // 📐 도형 꼭짓점 기억 (각도 표시용) · 🧊 3D 입체도형 무대
  const [polys, setPolys] = useState<ShapePoly[]>([]);
  const polysRef = useRef<ShapePoly[]>([]);
  polysRef.current = polys;
  const [showAngles, setShowAngles] = useState<boolean>(() => {
    try {
      return localStorage.getItem('wb_show_angles') !== 'off';
    } catch {
      return true;
    }
  });
  const shapeEndRef = useRef<{ x: number; y: number } | null>(null);
  const [showCircleInfo, setShowCircleInfo] = useState<boolean>(() => {
    try {
      return localStorage.getItem('wb_show_circle') !== 'off';
    } catch {
      return true;
    }
  });
  // 🧮 넓이 구하는 식 (원: 원주 · 넓이 / 다각형: 넓이) — 기본은 꺼짐
  const [showArea, setShowArea] = useState<boolean>(() => {
    try {
      return localStorage.getItem('wb_show_area') === 'on';
    } catch {
      return false;
    }
  });
  const toggleArea = () =>
    setShowArea((v) => {
      try {
        localStorage.setItem('wb_show_area', v ? 'off' : 'on');
      } catch {}
      return !v;
    });
  /** 📏 길이를 켜면 다각형도 0.5cm 단위로 맞춰서 그려요 */
  const snapShapeEnd = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    if (!showCircleInfo) return b;
    const h = CM / 2;
    const sx = (v: number) => Math.sign(v) * Math.max(h, Math.round(Math.abs(v) / h) * h);
    return { x: a.x + sx(b.x - a.x || 1), y: a.y + sx(b.y - a.y || 1) };
  };
  const [shapeMenuOpen, setShapeMenuOpen] = useState(false);
  const isShapeTool = (t: DrawTool) => t === 'line' || t === 'circle' || isPolyKind(t);
  /** 원 반지름: 원 길이 표시가 켜져 있으면 0.5cm 단위로 맞춰요 */
  const circleRadius = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const r = Math.hypot(b.x - a.x, b.y - a.y);
    return showCircleInfo ? Math.max(CM / 2, Math.round(r / (CM / 2)) * (CM / 2)) : r;
  };
  const toggleCircleInfo = () =>
    setShowCircleInfo((v) => {
      try {
        localStorage.setItem('wb_show_circle', v ? 'off' : 'on');
      } catch {}
      return !v;
    });
  const open3D = () => {
    if (solid3d) return;
    // 지금 보이는 판 영역 안에 위 막대 · 3D 화면 · 아래 막대 · 판서 도구가 모두 들어가게
    const cr = containerRef.current?.getBoundingClientRect();
    const cw = cr?.width || 1200;
    const ch = cr?.height || 800;
    // 보이는 판 영역을 거의 다 쓰기 (위쪽 막대 · 아래 판서 도구 자리만 남기고)
    const w = Math.round(Math.max(520, cw - 56));
    const h = Math.round(Math.max(320, ch - 170));
    const vx = BOARD_WIDTH / 2 - panOffset.x - cw / 2;
    const vy = BOARD_HEIGHT / 2 - panOffset.y - ch / 2;
    setSolidWrite(false);
    setSolid3d({ x: Math.round(vx + (cw - w) / 2), y: Math.round(vy + 62), w, h });
  };
  const toggleAngles = () =>
    setShowAngles((v) => {
      try {
        localStorage.setItem('wb_show_angles', v ? 'off' : 'on');
      } catch {}
      return !v;
    });
  const [solid3d, setSolid3d] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [solidWrite, setSolidWrite] = useState(false);

  // 🎯 실시간 포인터 좌표 추적 Ref
  const currentPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // 📜 통합 히스토리 스택 (캔버스 이미지 + 텍스트 + 테이프)
  const [history, setHistory] = useState<CanvasHistoryItem[]>([]);

  // 🔲 선택 및 이동/크기 조절(Resize) 관련 상태 (MS 화이트보드 단일 화살표 선택 도구)
  const [floatingSelection, setFloatingSelection] = useState<FloatingSelection | null>(null);
  const floatingSelectionRef = useRef<FloatingSelection | null>(null);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null);
  const resizeStartRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);

  // 🖐️ MS 화이트보드 스타일 판서영역 자유 이동(Pan) 상태
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  // 🔍 화면 배율 (마우스 휠 · 핀치 · −/＋ 버튼)
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  zoomRef.current = zoom;
  const panOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const livePanRef = useRef<{ x: number; y: number } | null>(null);
  const panRafRef = useRef(0);
  const panSurfaceRef = useRef<HTMLDivElement | null>(null);
  const selRafRef = useRef(0);
  if (!livePanRef.current) panOffsetRef.current = panOffset;

  const isPanningRef = useRef<boolean>(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; startPanX: number; startPanY: number }>({
    clientX: 0,
    clientY: 0,
    startPanX: 0,
    startPanY: 0,
  });
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);

  // 🔤 텍스트 상자 관련 상태
  const [texts, setTexts] = useState<TextAnnotation[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [draggingTextId, setDraggingTextId] = useState<string | null>(null);
  const [textDragOffset, setTextDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [resizingTextId, setResizingTextId] = useState<string | null>(null);
  const [resizeStartData, setResizeStartData] = useState<{ startX: number; startWidth: number } | null>(null);

  // 🩹 학습용 가리기 테이프(Study Tape) 관련 상태
  const [tapes, setTapes] = useState<StudyTape[]>([]);
  const [tapeColor, setTapeColor] = useState<string>('#FB923C');
  const [tapeHeight, setTapeHeight] = useState<number>(36);
  const [activeTapeEraserTarget, setActiveTapeEraserTarget] = useState<string | null>(null);
  const [tapeDragPreview, setTapeDragPreview] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // 🖼️ 이미지 파일 불러오기 관련 상태 및 함수
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 🖼️ 이미지 및 PDF 불러오기 시 화면 정중앙(Center) 자동 배치 및 화면 대비 70~80% 비율 자동 리사이즈
  const loadImageToCanvas = (file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      alert('이미지 파일(PNG, JPG, GIF, WebP 등) 또는 PDF 파일만 불러올 수 있습니다.');
      return;
    }

    if (file.type === 'application/pdf') {
      alert('📄 PDF 파일은 운영체제 화면 캡처(Win+Shift+S 또는 Cmd+Shift+4) 후 [Ctrl+V]로 바로 붙여넣으시거나, 이미지(PNG/JPG)로 변환된 파일을 불러오시면 화이트보드 정중앙에 즉시 배치되어 판서하실 수 있습니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 기존에 선택 영역이 떠 있다면 먼저 안착(Commit)
        if (floatingSelectionRef.current || floatingSelection) {
          commitSelection();
        }

        saveHistory();

        const container = containerRef.current;
        const containerRect = container ? container.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight, left: 0, top: 0 };
        const canvasRect = canvas.getBoundingClientRect();

        // 현재 보고 있는 화면(뷰포트) 기준 75% 비율로 자동 크기 조정
        const maxW = containerRect.width * 0.75;
        const maxH = containerRect.height * 0.75;
        let imageWidth = img.width;
        let imageHeight = img.height;

        const scale = Math.min(maxW / imageWidth, maxH / imageHeight, 1);
        imageWidth = Math.max(80, Math.round(imageWidth * scale));
        imageHeight = Math.max(80, Math.round(imageHeight * scale));

        // 🎯 현재 뷰포트 시야 정중앙의 캔버스 로컬 좌표 정밀 산출
        const viewCenterX = (containerRect.width / 2) - (canvasRect.left - containerRect.left);
        const viewCenterY = (containerRect.height / 2) - (canvasRect.top - containerRect.top);
        const initialX = Math.round(viewCenterX - imageWidth / 2);
        const initialY = Math.round(viewCenterY - imageHeight / 2);

        const offCanvas = document.createElement('canvas');
        offCanvas.width = imageWidth;
        offCanvas.height = imageHeight;
        const offCtx = offCanvas.getContext('2d');
        if (offCtx) {
          offCtx.drawImage(img, 0, 0, imageWidth, imageHeight);
        }

        // 이미지가 배치되기 직전의 깨끗한 베이스 캔버스 스냅샷 취득
        const baseSnap = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const newSelection: FloatingSelection = {
          origX: initialX,
          origY: initialY,
          origWidth: imageWidth,
          origHeight: imageHeight,
          width: imageWidth,
          height: imageHeight,
          currentX: initialX,
          currentY: initialY,
          canvas: offCanvas,
          baseSnapshot: baseSnap,
        };

        floatingSelectionRef.current = newSelection;
        setFloatingSelection(newSelection);
        setSnapshot(baseSnap);

        // 🎯 로드 즉시 화면 정중앙에 단 1회 깨끗하게 렌더링하고 오버레이 표시
        renderSelectionPreview();
        drawSelectionOverlay(newSelection);
        setTool('select');
        setActivePopover(null);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadImageToCanvas(file);
    }
    e.target.value = '';
  };

  // 🏁 화이트보드 배경 설정 상태 (색상, 레이아웃 패턴, 라인 간격)
  const [bgColor, setBgColor] = useState<string>(isLight ? '#FFFFFF' : '#1E293B');
  const [bgLayout, setBgLayout] = useState<'blank' | 'dot' | 'line'>('blank');
  const [lineGap, setLineGap] = useState<number>(40);

  // 🛠️ 3단계 플로팅 툴바 상태 (1단계 미니 퍽 / 2단계 캡슐 독 / 3단계 팝오버)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [toolbarPosition, setToolbarPositionRaw] = useState<'left' | 'center' | 'right'>(() => {
    try {
      const v = localStorage.getItem('wb_toolbar_position');
      return v === 'left' || v === 'right' ? v : 'center';
    } catch {
      return 'center';
    }
  });
  const setToolbarPosition = (fn: (p: 'left' | 'center' | 'right') => 'left' | 'center' | 'right') =>
    setToolbarPositionRaw((prev) => {
      const next = fn(prev);
      try {
        localStorage.setItem('wb_toolbar_position', next);
      } catch {}
      return next;
    });
  // 🔴 레이저 포인터 · 굵기 미리보기 커서
  const laserCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const laserPtsRef = useRef<{ x: number; y: number; t: number }[]>([]);
  const laserRafRef = useRef<number | null>(null);
  const brushCursorRef = useRef<HTMLDivElement | null>(null);
  // ↪️ 다시 실행 · 📏 자/각도기 · 🎭 가림막/스포트라이트
  const [redoStack, setRedoStack] = useState<CanvasHistoryItem[]>([]);
  const [ruler, setRuler] = useState<{ x: number; y: number; angle: number; len: number } | null>(null);
  const [protractor, setProtractor] = useState<{ x: number; y: number; angle: number; r: number } | null>(null);
  const rulerSnapRef = useRef(false);
  const [setSquares, setSetSquares] = useState<SetSquare[]>([]);
  const [compass, setCompass] = useState<Compass | null>(null);
  const snapEdgeRef = useRef<{ x0: number; y0: number; dx: number; dy: number; len: number; nx: number; ny: number } | null>(null);
  const [cover, setCover] = useState<null | { mode: 'shade'; dir: 'down' | 'right'; reveal: number } | { mode: 'spot'; x: number; y: number; r: number }>(null);
  const undoKeyRef = useRef<() => void>(() => {});
  const redoKeyRef = useRef<() => void>(() => {});
  const [activePopover, setActivePopover] = useState<'pen' | 'shape' | 'background' | 'tape' | 'gallery' | null>(null);

  // 📚 멀티 슬라이드 상태 (로컬 스토리지 실시간 동기화)
  const [slides, setSlides] = useState<WhiteboardSlide[]>(() => {
    try {
      const saved = largeGet('ttime_whiteboard_slides');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('🔴 [Whiteboard] 슬라이드 로드 실패:', e);
    }
    return [
      {
        id: 'slide_1',
        pageNumber: 1,
        texts: [],
        tapes: [],
        previewThumbnail: '',
        updatedAt: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
      },
    ];
  });
  // 마지막 작업 중이던 슬라이드 인덱스 복원
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(() => {
    try {
      const savedIdx = localStorage.getItem('ttime_whiteboard_current_slide_index');
      if (savedIdx !== null) {
        const parsed = parseInt(savedIdx, 10);
        return isNaN(parsed) ? 0 : parsed;
      }
    } catch {}
    return 0;
  });

  const slidesRef = useRef<WhiteboardSlide[]>(slides);
  slidesRef.current = slides;
  const currentSlideIndexRef = useRef<number>(currentSlideIndex);
  currentSlideIndexRef.current = currentSlideIndex;

  const textsRef = useRef<TextAnnotation[]>(texts);
  textsRef.current = texts;
  const tapesRef = useRef<StudyTape[]>(tapes);
  tapesRef.current = tapes;

  // 🖼️ 160x100 축소판 썸네일 생성 헬퍼
  const generateThumbnail = useCallback((sourceCanvas: HTMLCanvasElement): string => {
    try {
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 160;
      thumbCanvas.height = 100;
      const tCtx = thumbCanvas.getContext('2d');
      if (tCtx) {
        tCtx.fillStyle = bgColor || '#0f172a';
        tCtx.fillRect(0, 0, 160, 100);
        tCtx.drawImage(sourceCanvas, 0, 0, 160, 100);
        return thumbCanvas.toDataURL('image/jpeg', 0.6);
      }
    } catch (e) {}
    return '';
  }, [bgColor]);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 현재 슬라이드 상태를 스토리지와 배열에 즉시 반영 (동기식 영구 보존)
  const commitCurrentSlide = useCallback(
    (customSlides?: WhiteboardSlide[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        const dataUrl = canvas.toDataURL('image/png');
        const thumbUrl = generateThumbnail(canvas);
        const nowStr = new Date().toLocaleTimeString('ko-KR', { hour12: false });

        const base = customSlides || slidesRef.current;
        const targetIdx = currentSlideIndexRef.current;
        const updated = base.map((s, idx) => {
          if (idx === targetIdx) {
            return {
              ...s,
              imageData: dataUrl,
              texts: JSON.parse(JSON.stringify(textsRef.current)),
              tapes: JSON.parse(JSON.stringify(tapesRef.current)),
              polys: polysRef.current.slice(),
              previewThumbnail: thumbUrl,
              updatedAt: nowStr,
            };
          }
          return s;
        });

        setSlides(updated);
        slidesRef.current = updated;
        largeSet('ttime_whiteboard_slides', JSON.stringify(updated));
        localStorage.setItem('ttime_whiteboard_current_slide_index', String(targetIdx));
        localStorage.setItem('wb_last_commit_at', String(Date.now()));
      } catch (err) {
        console.warn('🔴 [Whiteboard] 자동 저장 실패:', err);
      }
    },
    [generateThumbnail]
  );

  // 500ms 간격 쓰로틀링 자동저장 스케줄러
  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      commitCurrentSlide();
    }, 500);
  }, [commitCurrentSlide]);

  // 📝 글상자 · 테이프를 고치면 잠시 뒤 저장 (창을 바로 닫아도 마지막 글자가 남게)
  //  - 판 전체 저장은 느린 저장소라 창을 바로 닫으면 못 끝날 수 있어서, 글상자만 바로 쓰는 작은 백업을 함께 둬요
  const liveBackupRef = useRef<{ idx: number; texts: TextAnnotation[]; tapes: StudyTape[]; at: number } | null>(
    (() => {
      try {
        const v = JSON.parse(localStorage.getItem('wb_live_texts') || 'null');
        return v && Array.isArray(v.texts) ? v : null;
      } catch {
        return null;
      }
    })()
  );
  const liveReadyRef = useRef(false);
  useEffect(() => {
    if (!liveReadyRef.current) return;
    try {
      localStorage.setItem('wb_live_texts', JSON.stringify({ idx: currentSlideIndexRef.current, texts, tapes, at: Date.now() }));
    } catch {
      /* 무시 */
    }
  }, [texts, tapes]);
  useEffect(() => {
    const flush = () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      commitCurrentSlide();
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
    };
  }, [commitCurrentSlide]);

  // 🎯 특정 슬라이드 데이터를 캔버스에 온전히 렌더링 복원
  const loadSlideIntoCanvas = useCallback((slide: WhiteboardSlide) => {
    if (!slide) return;
    if (slide.texts) setTexts(slide.texts);
    if (slide.tapes) setTapes(slide.tapes);
    setPolys(Array.isArray(slide.polys) ? slide.polys : []);

    const canvas = canvasRef.current;
    if (!canvas) return;

    if (canvas.width !== BOARD_WIDTH || canvas.height !== BOARD_HEIGHT) {
      canvas.width = BOARD_WIDTH;
      canvas.height = BOARD_HEIGHT;
    }

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (slide.imageData) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = slide.imageData;
      }
    }
  }, []);

  // 마운트 시 저장된 슬라이드 복원 & 언마운트 시 즉시 동기식 저장 (탭 전환 시 판서 100% 보존)
  const initialRestoreDoneRef = useRef(false);
  useEffect(() => {
    if (!initialRestoreDoneRef.current) {
      initialRestoreDoneRef.current = true;
      requestAnimationFrame(() => {
        const savedIdx = currentSlideIndexRef.current;
        let targetSlide = slidesRef.current[savedIdx] || slidesRef.current[0];
        // 창을 닫기 직전에 쓴 글상자가 판 저장보다 새것이면 그걸로
        const live = liveBackupRef.current;
        let lastCommit = 0;
        try {
          lastCommit = Number(localStorage.getItem('wb_last_commit_at')) || 0;
        } catch {
          /* 무시 */
        }
        if (targetSlide && live && live.idx === savedIdx && live.at > lastCommit) {
          targetSlide = { ...targetSlide, texts: live.texts.filter((t) => (t.text || '').trim()).map((t) => ({ ...t, isEditing: false })), tapes: live.tapes };
        }
        if (targetSlide) {
          loadSlideIntoCanvas(targetSlide);
        }
        setTimeout(() => {
          liveReadyRef.current = true;
        }, 50);
      });
    }

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      commitCurrentSlide();
    };
  }, [commitCurrentSlide, loadSlideIntoCanvas]);

  // 📄 특정 슬라이드로 전환
  const handleSwitchSlide = (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= slides.length || targetIndex === currentSlideIndex) return;

    // 1. 현재 슬라이드 데이터 저장
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      const thumbUrl = generateThumbnail(canvas);
      const nowStr = new Date().toLocaleTimeString('ko-KR', { hour12: false });
      const currentUpdated = slides.map((s, idx) => {
        if (idx === currentSlideIndex) {
          return {
            ...s,
            imageData: dataUrl,
            texts: JSON.parse(JSON.stringify(texts)),
            tapes: JSON.parse(JSON.stringify(tapes)),
            polys: polysRef.current.slice(),
            previewThumbnail: thumbUrl,
            updatedAt: nowStr,
          };
        }
        return s;
      });
      setSlides(currentUpdated);
      slidesRef.current = currentUpdated;
      largeSet('ttime_whiteboard_slides', JSON.stringify(currentUpdated));
    }

    // 2. 목표 슬라이드로 인덱스 변경
    setCurrentSlideIndex(targetIndex);
    currentSlideIndexRef.current = targetIndex;
    localStorage.setItem('ttime_whiteboard_current_slide_index', String(targetIndex));
    clearOverlayCanvas();
    floatingSelectionRef.current = null;
    setFloatingSelection(null);
    setSelectedTextId(null);
    setHistory([]);

    const targetSlide = slides[targetIndex];
    if (targetSlide) {
      loadSlideIntoCanvas(targetSlide);
    }
  };

  // ➕ 새 슬라이드 추가
  const handleAddNewSlide = () => {
    commitCurrentSlide();

    const newPageNum = slides.length + 1;
    const newSlide: WhiteboardSlide = {
      id: `slide_${Date.now()}`,
      pageNumber: newPageNum,
      texts: [],
      tapes: [],
      previewThumbnail: '',
      updatedAt: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
    };

    const updated = [...slides, newSlide];
    setSlides(updated);
    slidesRef.current = updated;
    largeSet('ttime_whiteboard_slides', JSON.stringify(updated));

    const newIdx = updated.length - 1;
    setCurrentSlideIndex(newIdx);
    currentSlideIndexRef.current = newIdx;
    localStorage.setItem('ttime_whiteboard_current_slide_index', String(newIdx));
    setTexts([]);
    setTapes([]);
    setHistory([]);
    clearOverlayCanvas();
    floatingSelectionRef.current = null;
    setFloatingSelection(null);
    setSelectedTextId(null);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // 🗑️ 슬라이드 삭제
  const handleDeleteSlide = (index: number) => {
    if (slides.length <= 1) {
      clearCanvas();
      commitCurrentSlide();
      return;
    }

    if (!window.confirm(`${index + 1}페이지 판서를 삭제하시겠습니까?`)) return;

    const filtered = slides.filter((_, idx) => idx !== index);
    const reordered = filtered.map((s, idx) => ({ ...s, pageNumber: idx + 1 }));
    setSlides(reordered);
    slidesRef.current = reordered;
    largeSet('ttime_whiteboard_slides', JSON.stringify(reordered));

    let nextIdx = currentSlideIndex;
    if (currentSlideIndex === index) {
      nextIdx = Math.max(0, index - 1);
    } else if (currentSlideIndex > index) {
      nextIdx = currentSlideIndex - 1;
    }
    setCurrentSlideIndex(nextIdx);
    currentSlideIndexRef.current = nextIdx;
    localStorage.setItem('ttime_whiteboard_current_slide_index', String(nextIdx));

    clearOverlayCanvas();
    floatingSelectionRef.current = null;
    setFloatingSelection(null);
    setSelectedTextId(null);
    setHistory([]);

    const targetSlide = reordered[nextIdx];
    if (targetSlide) {
      loadSlideIntoCanvas(targetSlide);
    }
  };

  // 📥 PNG 이미지 다운로드
  const handleDownloadSlidePng = (slide: WhiteboardSlide, index: number) => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const filename = `판서_${dateStr}_${index + 1}페이지.png`;

    let dataUrl = slide.imageData || '';
    if (index === currentSlideIndex && canvasRef.current) {
      dataUrl = canvasRef.current.toDataURL('image/png');
    }

    if (!dataUrl) {
      alert('해당 슬라이드에 저장된 판서 내용이 없습니다.');
      return;
    }

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ⏱️ 클린 모드 (3초 유휴 상태 반투명화: opacity 0.35)
  const [isIdle, setIsIdle] = useState<boolean>(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetIdleTimer = () => {
    setIsIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, 3000);
  };

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  // 툴바 위치 순환 스냅 (좌 ↔ 중 ↔ 우)
  const cyclePosition = () => {
    setToolbarPosition((prev) => (prev === 'center' ? 'right' : prev === 'right' ? 'left' : 'center'));
  };

  // 🎨 캔버스 컨테이너 배경 동적 인라인 CSS 계산 (지우개/비우기에도 패턴 영구 보존)
  const containerBgStyle = useMemo<React.CSSProperties>(() => {
    const isDark = isDarkHexColor(bgColor);
    const patternColor = isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(148, 163, 184, 0.35)';

    let bgImage = 'none';
    let bgSize: string | undefined = undefined;

    if (bgLayout === 'dot') {
      bgImage = `radial-gradient(${patternColor} 1.5px, transparent 1.5px)`;
      bgSize = '28px 28px';
    } else if (bgLayout === 'line') {
      bgImage = `repeating-linear-gradient(to bottom, transparent 0px, transparent ${lineGap - 1}px, ${patternColor} ${lineGap - 1}px, ${patternColor} ${lineGap}px)`;
    }

    return {
      backgroundColor: bgColor,
      backgroundImage: bgImage,
      backgroundSize: bgSize,
      backgroundPosition: `${panOffset.x}px ${panOffset.y}px`,
    };
  }, [bgColor, bgLayout, lineGap, panOffset]);

  // 펜 종류 전환 시 최적 두께 및 컬러 자동 세팅
  const handleSelectPenType = (type: PenType) => {
    commitSelection();
    setPenType(type);
    setTool('pen');
    if (type === 'pen') {
      setLineWidth(2.5);
      if (HIGHLIGHTER_COLORS.some((c) => c.hex === color) || (color === '#fde047' && !isDarkHexColor(bgColor))) setColor(isDarkHexColor(bgColor) ? '#fde047' : '#0f172a');
    } else if (type === 'pencil') {
      setLineWidth(3.5);
    } else if (type === 'highlighter') {
      setLineWidth(24);
      if (!HIGHLIGHTER_COLORS.some((c) => c.hex === color)) setColor(HIGHLIGHTER_COLORS[0].hex);
    }
  };

  // 캔버스 크기 맞춤 (MS 화이트보드 고해상도 광활한 판서 영역 보장)
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (canvas.width === BOARD_WIDTH && canvas.height === BOARD_HEIGHT) return;

    // 기존 그림 보존용 임시 캔버스
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx && canvas.width > 0 && canvas.height > 0) {
      tempCtx.drawImage(canvas, 0, 0);
    }

    canvas.width = BOARD_WIDTH;
    canvas.height = BOARD_HEIGHT;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (tempCanvas.width > 0 && tempCanvas.height > 0) {
        ctx.drawImage(tempCanvas, 0, 0);
      }
    }

    // 🎯 최상단 임시 인터랙션 레이어 캔버스도 동일 크기 동기화
    const overlayCanvas = overlayCanvasRef.current;
    if (overlayCanvas) {
      overlayCanvas.width = BOARD_WIDTH;
      overlayCanvas.height = BOARD_HEIGHT;
    }

    // 형광펜 전용 오프스크린 캔버스도 동일 크기로 동기화
    if (!highlighterCanvasRef.current) {
      highlighterCanvasRef.current = document.createElement('canvas');
    }
    highlighterCanvasRef.current.width = BOARD_WIDTH;
    highlighterCanvasRef.current.height = BOARD_HEIGHT;
  };

  // 🎯 최상단 임시 인터랙션 레이어 초기화 헬퍼 (점선 박스 잔상 원천 제거)
  const clearOverlayCanvas = () => {
    const oCanvas = overlayCanvasRef.current;
    if (!oCanvas) return;
    const oCtx = oCanvas.getContext('2d');
    if (!oCtx) return;
    oCtx.save();
    oCtx.setTransform(1, 0, 0, 1, 0, 0);
    oCtx.clearRect(0, 0, oCanvas.width, oCanvas.height);
    oCtx.restore();
  };

  // 🎯 최상단 임시 인터랙션 레이어에 MS 화이트보드 스타일 점선 바운딩 박스 & 핸들 렌더링
  const drawSelectionOverlay = (sel: FloatingSelection | null) => {
    const oCanvas = overlayCanvasRef.current;
    if (!oCanvas) return;
    const oCtx = oCanvas.getContext('2d');
    if (!oCtx) return;

    oCtx.save();
    oCtx.setTransform(1, 0, 0, 1, 0, 0);
    oCtx.clearRect(0, 0, oCanvas.width, oCanvas.height);

    if (!sel || tool !== 'select') {
      oCtx.restore();
      return;
    }

    // 1. MS 화이트보드 시그니처 보라색 점선 바운딩 박스
    oCtx.strokeStyle = '#5B44F2';
    oCtx.lineWidth = 2;
    oCtx.setLineDash([6, 5]);
    oCtx.strokeRect(sel.currentX, sel.currentY, sel.width, sel.height);

    // 2. 모서리 4개 조절 핸들 (원형 노브)
    const handleRadius = 5.5;
    const handles = [
      { x: sel.currentX, y: sel.currentY }, // tl
      { x: sel.currentX + sel.width, y: sel.currentY }, // tr
      { x: sel.currentX, y: sel.currentY + sel.height }, // bl
      { x: sel.currentX + sel.width, y: sel.currentY + sel.height }, // br
    ];
    oCtx.setLineDash([]);
    handles.forEach((pt) => {
      oCtx.beginPath();
      oCtx.arc(pt.x, pt.y, handleRadius, 0, Math.PI * 2);
      oCtx.fillStyle = '#ffffff';
      oCtx.fill();
      oCtx.strokeStyle = '#5B44F2';
      oCtx.lineWidth = 2.5;
      oCtx.stroke();
    });

    oCtx.restore();
  };

  useEffect(() => {
    drawSelectionOverlay(floatingSelectionRef.current || floatingSelection);
  }, [floatingSelection, tool]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // ⌨️ 키보드 단축키 (Enter/Esc/Del: 선택 조작, Space: 임시 손 도구, Ctrl+S: 선택 도구, H: 손 도구)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // Space 누름 -> 일시적 손(Hand) 도구 전환
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      }

      // Ctrl+Z 실행 취소 · Ctrl+Y / Ctrl+Shift+Z 다시 실행
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        e.preventDefault();
        if (e.shiftKey) redoKeyRef.current();
        else undoKeyRef.current();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') {
        e.preventDefault();
        redoKeyRef.current();
        return;
      }

      // Ctrl+S / Cmd+S -> MS Whiteboard 선택(Select) 도구 전환
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
        e.preventDefault();
        setTool('select');
      }

      // H 키 -> 손(Hand) 도구 전환 · P 펜 · E 지우개 · L 레이저 · T 텍스트
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        // 물리 키 기준 → 한글 입력 상태(ㅗ·ㅔ·ㄷ…)에서도 동작
        const k = e.code;
        if (k === 'KeyH') setTool('hand');
        if (k === 'KeyP') setTool('pen');
        if (k === 'KeyE') setTool('eraser');
        if (k === 'KeyL') setTool('laser');
        if (k === 'KeyT') setTool('text');
      }

      if (floatingSelectionRef.current || floatingSelection) {
        if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault();
          commitSelection();
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          deleteSelection();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [floatingSelection]);

  // 📋 클립보드 이미지 붙여넣기 (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            loadImageToCanvas(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [floatingSelection]);

  // 📜 통합 히스토리 저장 (캔버스 픽셀 + 텍스트 + 테이프)
  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    try {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory((prev) => [
        ...prev.slice(-20),
        {
          imageData: data,
          texts: JSON.parse(JSON.stringify(texts)),
          tapes: JSON.parse(JSON.stringify(tapes)),
          polys: polysRef.current.slice(),
        },
      ]);
      setRedoStack([]);
      triggerAutoSave();
    } catch (err) {
      console.warn('🔴 히스토리 저장 오류:', err);
    }
  };

  // ↩️ 실행 취소 (Undo)
  const handleUndo = () => {
    if (floatingSelection) {
      cancelSelection();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistory = [...history];
    const prevItem = newHistory.pop();
    setHistory(newHistory);
    try {
      const cur = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setRedoStack((r) => [...r.slice(-9), { imageData: cur, texts: JSON.parse(JSON.stringify(texts)), tapes: JSON.parse(JSON.stringify(tapes)), polys: polysRef.current.slice() }]);
    } catch {}

    if (prevItem) {
      ctx.putImageData(prevItem.imageData, 0, 0);
      setTexts(prevItem.texts);
      setTapes(prevItem.tapes);
      setPolys(prevItem.polys || []);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setTexts([]);
      setTapes([]);
      setPolys([]);
    }
  };

  // ↪️ 다시 실행 (Redo)
  const handleRedo = () => {
    const canvas = canvasRef.current;
    if (!canvas || redoStack.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const next = [...redoStack];
    const item = next.pop()!;
    setRedoStack(next);
    try {
      const cur = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory((h) => [...h.slice(-20), { imageData: cur, texts: JSON.parse(JSON.stringify(texts)), tapes: JSON.parse(JSON.stringify(tapes)), polys: polysRef.current.slice() }]);
    } catch {}
    ctx.putImageData(item.imageData, 0, 0);
    setTexts(item.texts);
    setTapes(item.tapes);
    setPolys(item.polys || []);
    triggerAutoSave();
  };
  undoKeyRef.current = () => handleUndo();
  redoKeyRef.current = () => handleRedo();

  // 📸 지금 보이는 판서 화면을 바로 PNG로 저장 (배경 · 글상자 · 테이프 포함)
  const saveScreenPng = () => {
    const board = canvasRef.current;
    const box = containerRef.current;
    if (!board || !box) return;
    const cw = box.clientWidth;
    const ch = box.clientHeight;
    const k = 2;
    const out = document.createElement('canvas');
    out.width = cw * k;
    out.height = ch * k;
    const o = out.getContext('2d');
    if (!o) return;
    o.scale(k, k);
    o.fillStyle = bgColor;
    o.fillRect(0, 0, cw, ch);
    const dark = isDarkHexColor(bgColor);
    const pc = dark ? 'rgba(255,255,255,0.18)' : 'rgba(148,163,184,0.35)';
    if (bgLayout === 'dot') {
      o.fillStyle = pc;
      for (let x = (panOffset.x % 28) + 28; x < cw; x += 28) for (let y = (panOffset.y % 28) + 28; y < ch; y += 28) {
        o.beginPath();
        o.arc(x, y, 1.5, 0, Math.PI * 2);
        o.fill();
      }
    } else if (bgLayout === 'line') {
      o.fillStyle = pc;
      for (let y = (panOffset.y % lineGap) + lineGap - 1; y < ch; y += lineGap) o.fillRect(0, y, cw, 1);
    }
    // 화면에 보이는 판의 범위 (판은 화면 가운데 기준 + 이동 거리)
    const bx = BOARD_WIDTH / 2 - cw / 2 - panOffset.x;
    const by = BOARD_HEIGHT / 2 - ch / 2 - panOffset.y;
    o.drawImage(board, bx, by, cw, ch, 0, 0, cw, ch);
    tapes.forEach((t) => {
      if (!t.isHidden) return;
      o.fillStyle = t.color;
      o.beginPath();
      (o as any).roundRect ? (o as any).roundRect(t.x - bx, t.y - by, t.width, t.height, 8) : o.rect(t.x - bx, t.y - by, t.width, t.height);
      o.fill();
    });
    texts.forEach((t) => {
      if (!t.text.trim()) return;
      o.font = `600 ${t.fontSize}px Pretendard, 'Noto Sans KR', sans-serif`;
      o.textBaseline = 'top';
      const maxW = (t.width || 260) - 16;
      const x0 = t.x - bx + 8;
      let yy = t.y - by + 6;
      richToLines(textRich(t)).forEach((runs) => {
        // 색 조각을 글자 단위로 이어 쓰면서 줄 바꿈
        let xx = 0;
        for (const run of runs) {
          o.fillStyle = run.c || t.color;
          for (const ch2 of run.t) {
            const w = o.measureText(ch2).width;
            if (xx + w > maxW && xx > 0) {
              yy += t.fontSize * 1.35;
              xx = 0;
            }
            o.fillText(ch2, x0 + xx, yy);
            xx += w;
          }
        }
        yy += t.fontSize * 1.35;
      });
    });
    const now = new Date();
    const p2 = (n: number) => String(n).padStart(2, '0');
    out.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `판서_${now.getFullYear()}${p2(now.getMonth() + 1)}${p2(now.getDate())}_${p2(now.getHours())}${p2(now.getMinutes())}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }, 'image/png');
  };

  // 📏 자 · 📐 삼각자 모서리에 펜 끝을 붙이기 (모서리 근처에서 시작한 획은 모서리를 따라 곧게)
  const instrumentEdges = () => {
    const list: { x0: number; y0: number; dx: number; dy: number; len: number; nx: number; ny: number }[] = [];
    if (ruler) {
      const rad = (ruler.angle * Math.PI) / 180;
      const dx = Math.cos(rad);
      const dy = Math.sin(rad);
      list.push({ x0: ruler.x, y0: ruler.y, dx, dy, len: ruler.len, nx: dy, ny: -dx });
    }
    setSquares.forEach((t) => list.push(...setSquareEdges(t)));
    return list;
  };
  const snapToRuler = (p: { x: number; y: number }, decide = false) => {
    if (tool !== 'pen') {
      if (decide) snapEdgeRef.current = null;
      return p;
    }
    if (decide) {
      let best: (typeof snapEdgeRef)['current'] = null;
      let bestD = 26;
      for (const ed of instrumentEdges()) {
        const vx = p.x - ed.x0;
        const vy = p.y - ed.y0;
        const along = vx * ed.dx + vy * ed.dy;
        const off = Math.abs(vx * ed.nx + vy * ed.ny);
        if (along > -10 && along < ed.len + 10 && off < bestD) {
          best = ed;
          bestD = off;
        }
      }
      snapEdgeRef.current = best;
      rulerSnapRef.current = !!best;
    }
    const ed = snapEdgeRef.current;
    if (!ed) return p;
    const along = Math.max(0, Math.min(ed.len, (p.x - ed.x0) * ed.dx + (p.y - ed.y0) * ed.dy));
    return { x: ed.x0 + ed.dx * along + ed.nx * 2, y: ed.y0 + ed.dy * along + ed.ny * 2 };
  };

  // ⭕ 컴퍼스로 호 그리기 (판 캔버스에 바로)
  const drawCompassArc = (from: number, to: number, c: Compass) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || from === to) return;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.strokeStyle = HIGHLIGHTER_COLORS.some((h) => h.hex === color) ? '#1e293b' : color;
    ctx.lineWidth = Math.max(2, Math.min(8, lineWidth));
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, from, to, to < from);
    ctx.stroke();
    ctx.restore();
  };

  // 🗑️ 비우기 (전체 삭제: 캔버스 + 텍스트 + 테이프)
  const clearCanvas = () => {
    clearOverlayCanvas();
    floatingSelectionRef.current = null;
    setFloatingSelection(null);
    setSelectedTextId(null);
    setActiveTapeEraserTarget(null);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    saveHistory();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setTexts([]);
    setTapes([]);
    setPolys([]);
  };

  // 좌표 계산
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent | PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const k = rect.width ? BOARD_WIDTH / rect.width : 1; // 확대해도 판 좌표로
    return {
      x: (clientX - rect.left) * k,
      y: (clientY - rect.top) * k,
    };
  };

  // 🔤 텍스트 상자 끌기 · 크기 조절 (창 전체에서 포인터를 따라가고, 화면 갱신은 한 프레임에 한 번)
  const textGestureRef = useRef<{
    id: string;
    mode: 'press' | 'move' | 'resize' | 'width';
    corner?: 'tl' | 'tr' | 'bl' | 'br';
    sx: number;
    sy: number;
    x0: number;
    y0: number;
    w0: number;
    fs0: number;
    h0: number;
    moved: boolean;
    wasEditing: boolean;
    el: HTMLElement;
    body: HTMLElement | null;
    cur: { x: number; y: number; w: number; fs: number };
    raf: number;
  } | null>(null);
  const canvasPoint = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const k = rect && rect.width ? BOARD_WIDTH / rect.width : 1;
    return rect ? { x: (clientX - rect.left) * k, y: (clientY - rect.top) * k } : { x: clientX, y: clientY };
  };
  const beginTextGesture = (
    e: React.PointerEvent,
    item: TextAnnotation,
    mode: 'press' | 'move' | 'resize' | 'width',
    corner?: 'tl' | 'tr' | 'bl' | 'br'
  ) => {
    e.stopPropagation();
    if (e.button > 0) return;
    if (textGestureRef.current) return;
    const el = (e.currentTarget as HTMLElement).closest('[data-wb-text-id]') as HTMLElement | null;
    if (!el) return;
    if (mode !== 'press') e.preventDefault();
    const p = canvasPoint(e.clientX, e.clientY);
    const w0 = item.width || 260;
    const g = {
      id: item.id,
      mode,
      corner,
      sx: p.x,
      sy: p.y,
      x0: item.x,
      y0: item.y,
      w0,
      fs0: item.fontSize,
      h0: el.offsetHeight,
      moved: false,
      wasEditing: item.isEditing,
      el,
      body: el.querySelector('[data-wb-text-body]') as HTMLElement | null,
      cur: { x: item.x, y: item.y, w: w0, fs: item.fontSize },
      raf: 0,
    };
    textGestureRef.current = g;
    const paint = () => {
      g.raf = 0;
      g.el.style.left = `${g.cur.x}px`;
      g.el.style.top = `${g.cur.y}px`;
      g.el.style.width = `${g.cur.w}px`;
      if (g.body) g.body.style.fontSize = `${g.cur.fs}px`;
    };
    const onMove = (ev: PointerEvent) => {
      const q = canvasPoint(ev.clientX, ev.clientY);
      const dx = q.x - g.sx;
      const dy = q.y - g.sy;
      if (g.mode === 'press') {
        if (Math.hypot(dx, dy) < 5) return;
        g.mode = 'move';
      }
      g.moved = true;
      g.el.classList.add('is-moving');
      if (g.mode === 'move') {
        g.cur.x = Math.max(0, Math.round(g.x0 + dx));
        g.cur.y = Math.max(0, Math.round(g.y0 + dy));
      } else if (g.mode === 'width') {
        g.cur.w = Math.max(80, Math.min(2400, Math.round(g.w0 + dx)));
      } else {
        const left = g.corner === 'tl' || g.corner === 'bl';
        const top = g.corner === 'tl' || g.corner === 'tr';
        const w = Math.max(80, Math.min(2400, g.w0 + (left ? -dx : dx)));
        const r = w / g.w0;
        g.cur.w = Math.round(w);
        g.cur.fs = Math.max(10, Math.min(400, Math.round(g.fs0 * r)));
        g.cur.x = Math.round(left ? g.x0 + (g.w0 - w) : g.x0);
        g.cur.y = Math.round(top ? g.y0 + (g.h0 - g.h0 * r) : g.y0);
      }
      if (!g.raf) g.raf = requestAnimationFrame(paint);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      if (g.raf) cancelAnimationFrame(g.raf);
      g.el.classList.remove('is-moving');
      textGestureRef.current = null;
      if (g.moved) {
        saveHistory();
        const c = { ...g.cur };
        setTexts((prev) => prev.map((t) => (t.id === g.id ? { ...t, x: c.x, y: c.y, width: c.w, fontSize: c.fs } : t)));
        setSelectedTextId(g.id);
        triggerAutoSave();
        return;
      }
      // 끌지 않고 눌렀다 떼면: 고르고 바로 글자 입력
      if (g.mode === 'press' && !g.wasEditing) {
        setSelectedTextId(g.id);
        setTexts((prev) => prev.map((t) => (t.id === g.id ? { ...t, isEditing: true } : t)));
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };
  // 🎨 글자색: 편집 중에 글자를 골라 두었으면 그 부분만, 아니면 상자 전체
  const applyTextColor = (item: TextAnnotation, c: string) => {
    const ed = document.querySelector(`[data-wb-text-id="${item.id}"] [data-wb-rich-editor]`) as HTMLElement | null;
    const sel = window.getSelection();
    if (item.isEditing && ed && sel && !sel.isCollapsed && sel.rangeCount && ed.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      try {
        document.execCommand('styleWithCSS', false, 'true');
        document.execCommand('foreColor', false, c);
      } catch {
        /* 무시 */
      }
      const n = normalizeRich(ed.innerHTML);
      setTexts((prev) => prev.map((t) => (t.id === item.id ? { ...t, rich: n.rich, text: n.text } : t)));
      triggerAutoSave();
      return;
    }
    saveHistory();
    setTexts((prev) => prev.map((t) => (t.id === item.id ? { ...t, color: c } : t)));
  };

  // 🎨 필기구별 기본 렌더링 스타일 지정
  const applyPenStyle = (ctx: CanvasRenderingContext2D, customWidth?: number, customAlpha?: number) => {
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = eraserSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = 0;
      return;
    }

    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (penType === 'pencil') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = customAlpha !== undefined ? customAlpha : 0.65;
      ctx.lineWidth = Math.max(1.2, customWidth !== undefined ? customWidth : lineWidth);
      ctx.shadowBlur = 0.5;
      ctx.shadowColor = 'rgba(40, 44, 52, 0.3)';
    } else if (penType === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over'; // 오프스크린 캔버스에는 완전 불투명으로 그림
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = Math.max(12, lineWidth);
      ctx.shadowBlur = 0;
    } else {
      // ✒️ 만년필/볼펜 (가변 폭 적용)
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = Math.max(1, customWidth !== undefined ? customWidth : lineWidth);
      ctx.shadowBlur = 0;
    }
  };

  // ✏️ 리얼 흑연/종이 텍스처 엔진: 다중 미세 흑연 파티클 분사(Scatter/Jitter) & 종이 결 블렌딩
  const drawTextureGrainBetween = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    brushWidth: number,
    speedFactor: number = 1.0
  ) => {
    if (penType !== 'pencil') return;

    ctx.save();
    ctx.fillStyle = color;
    ctx.globalCompositeOperation = 'source-over';
    // 까끌까끌한 종이 마찰 질감을 선 외곽선에 부여하기 위한 미세 섀도우 블렌딩
    ctx.shadowBlur = 0.5;
    ctx.shadowColor = 'rgba(40, 44, 52, 0.3)';

    const dx = toX - fromX;
    const dy = toY - fromY;
    const distance = Math.hypot(dx, dy);

    // 단위 거리(1.4px)마다 보간 스텝 생성하여 촘촘하고 부드러운 분사 보장
    const stepDistance = 1.4;
    const steps = Math.max(1, Math.ceil(distance / stepDistance));
    const radius = Math.max(1.0, brushWidth / 2);

    // 3. 이동 속도가 빠를수록 단위 거리당 분사 입자 밀도를 낮추고, 천천히 그릴수록 빽빽해지는 동적 밀도 제어
    const normalizedSpeed = Math.max(0.4, Math.min(1.2, speedFactor));

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const interpX = fromX + dx * t;
      const interpY = fromY + dy * t;

      // 1. 브러쉬 두께 반경(radius) 내에서 1px ~ 1.5px 크기의 초미세 흑연 입자 6 ~ 12개 무작위 오프셋 분사
      const baseParticleCount = Math.floor(6 + Math.random() * 7); // 6 ~ 12개 기본 범위
      const particleCount = Math.max(
        3,
        Math.round(baseParticleCount * normalizedSpeed * pencilRoughness)
      );

      for (let i = 0; i < particleCount; i++) {
        // 가우시안/거듭제곱 분포: 중심부는 흑연 심처럼 밀집되고 외곽 경계는 자연스럽게 흩뿌려짐
        const rDist = Math.pow(Math.random(), 1.6) * radius * pencilRoughness;
        const angle = Math.random() * Math.PI * 2;
        const offsetX = Math.cos(angle) * rDist;
        const offsetY = Math.sin(angle) * rDist;

        const dotX = interpX + offsetX;
        const dotY = interpY + offsetY;

        // 1px ~ 1.5px 크기의 초미세 흑연 입자 (원형 스탬프 arc() 대신 1~1.5px 픽셀 파티클로 날카로운 흑연 알갱이 재현)
        const pSize = 1.0 + Math.random() * 0.5;

        // 2. 각 입자의 알파값을 0.08 ~ 0.35 범위로 무작위 부여하여 자연스러운 흑연 가루 농담 생성
        const baseAlpha = 0.08 + Math.random() * (0.35 - 0.08);
        const distRatio = rDist / radius;
        let particleAlpha = baseAlpha * (1.1 - distRatio * 0.35) * normalizedSpeed;

        // 3. 종이 결 텍스처(Paper Grain) 64x64 노이즈 마스크 변조
        const grainFactor = getPaperNoiseFactor(dotX, dotY);
        particleAlpha = particleAlpha * grainFactor;

        // 알파값 범위 안전 클램핑 (0.05 ~ 0.38)
        ctx.globalAlpha = Math.max(0.05, Math.min(0.38, particleAlpha));

        // 고정 크기 단일 원(arc) 스탬프 완전 제거 -> 1~1.5px 초미세 흑연 입자 렌더링
        ctx.fillRect(dotX - pSize / 2, dotY - pSize / 2, pSize, pSize);
      }
    }

    ctx.restore();
  };

  // =========================================================================
  // 🔲 선택 및 이동 로직 (Select & Move)
  // =========================================================================

  // =========================================================================
  // 🔲 선택 및 이동/크기 조절 로직 (Select, Move & Resize)
  // =========================================================================

  const isPointInSelection = (x: number, y: number, sel: FloatingSelection) => {
    return (
      x >= sel.currentX &&
      x <= sel.currentX + sel.width &&
      y >= sel.currentY &&
      y <= sel.currentY + sel.height
    );
  };

  const commitSelection = () => {
    const sel = floatingSelectionRef.current || floatingSelection;
    if (!sel) {
      clearOverlayCanvas();
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    saveHistory();

    // 🎯 이동 전 스냅샷 복원 후 최종 위치에만 순수 필기/이미지 데이터 안착 (이전 잔상 완전 클리어)
    const baseSnap = sel.baseSnapshot || snapshot;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (baseSnap) {
      ctx.putImageData(baseSnap, 0, 0);
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
    ctx.drawImage(
      sel.canvas,
      sel.currentX,
      sel.currentY,
      sel.width,
      sel.height
    );
    ctx.restore();

    // 🎯 상단 오버레이 레이어 점선 잔상 완전 소거
    clearOverlayCanvas();
    floatingSelectionRef.current = null;
    setFloatingSelection(null);
    setSnapshot(null);
    setResizeHandle(null);
    setIsDraggingSelection(false);
    setIsHoveringSelection(false);
  };

  const cancelSelection = () => {
    commitSelection();
  };

  const deleteSelection = () => {
    const sel = floatingSelectionRef.current || floatingSelection;
    if (!sel) return;
    saveHistory();
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const baseSnap = sel.baseSnapshot || snapshot;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (baseSnap) {
          ctx.putImageData(baseSnap, 0, 0);
        }
        ctx.restore();
      }
    }
    clearOverlayCanvas();
    floatingSelectionRef.current = null;
    setFloatingSelection(null);
    setSnapshot(null);
    setResizeHandle(null);
    setIsDraggingSelection(false);
    setIsHoveringSelection(false);
  };

  // 🎯 MS 화이트보드 스타일: 선택된 개체 복제 (Duplicate)
  const duplicateSelection = () => {
    const sel = floatingSelectionRef.current || floatingSelection;
    if (!sel) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    saveHistory();
    // 1. 현재 개체를 해당 위치에 확정 (잔상 제거 클리어 후 안착)
    const baseSnap = sel.baseSnapshot || snapshot;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (baseSnap) {
      ctx.putImageData(baseSnap, 0, 0);
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
    ctx.drawImage(
      sel.canvas,
      sel.currentX,
      sel.currentY,
      sel.width,
      sel.height
    );
    ctx.restore();

    // 2. 복사본 캔버스 버퍼 생성 (+24px 오프셋)
    const clonedCanvas = document.createElement('canvas');
    clonedCanvas.width = sel.canvas.width;
    clonedCanvas.height = sel.canvas.height;
    const clCtx = clonedCanvas.getContext('2d');
    if (clCtx) {
      clCtx.drawImage(sel.canvas, 0, 0);
    }

    const newX = sel.currentX + 24;
    const newY = sel.currentY + 24;
    const newSnap = ctx.getImageData(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.drawImage(clonedCanvas, newX, newY, sel.width, sel.height);
    ctx.restore();

    const duplicatedSel: FloatingSelection = {
      ...sel,
      currentX: newX,
      currentY: newY,
      origX: newX,
      origY: newY,
      canvas: clonedCanvas,
      baseSnapshot: newSnap,
    };
    floatingSelectionRef.current = duplicatedSel;
    setFloatingSelection(duplicatedSel);
    setSnapshot(newSnap);
    drawSelectionOverlay(duplicatedSel);
  };

  // 🎯 메인 캔버스 렌더링 루프: 잔상(Trailed Echo) 방지를 위해 최상단에서 전체 캔버스 클리어(clearRect) 실행 후 최신 좌표에만 단 1회 렌더링
  const renderSelectionPreview = () => {
    const sel = floatingSelectionRef.current || floatingSelection;
    if (!sel) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. 🎯 최상단 전체 캔버스 클리어 로직 (변환 행렬 리셋 후 물리 픽셀 전체 초기화)
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. 부유 개체 이전의 원본 베이스 캔버스 스냅샷 복원
    const baseSnap = sel.baseSnapshot || snapshot;
    if (baseSnap) {
      ctx.putImageData(baseSnap, 0, 0);
    }
    ctx.restore();

    // 3. 🎯 변경된 최신 좌표(sel.currentX, sel.currentY)에만 이미지를 단 1회 깨끗하게 렌더링
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
    ctx.drawImage(
      sel.canvas,
      sel.currentX,
      sel.currentY,
      sel.width,
      sel.height
    );
    ctx.restore();
  };

  // 🎯 도구가 'select'에서 다른 도구로 변경될 때 부유 중인 선택영역 자동 확정 및 오버레이 클리어
  useEffect(() => {
    if (tool !== 'select') {
      if (floatingSelectionRef.current || floatingSelection) {
        commitSelection();
      } else {
        clearOverlayCanvas();
      }
    }
  }, [tool]);

  // 🎯 외부 영역(캔버스 밖 대시보드 화면 등) 클릭 시 선택 영역 자동 확정 및 점선 바운딩 박스 제거
  useEffect(() => {
    if (!floatingSelection) return;
    const handleGlobalPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-selection-toolbar]')) return;
      if (target === canvasRef.current || target === overlayCanvasRef.current) return;
      commitSelection();
    };

    window.addEventListener('mousedown', handleGlobalPointerDown);
    window.addEventListener('touchstart', handleGlobalPointerDown);
    return () => {
      window.removeEventListener('mousedown', handleGlobalPointerDown);
      window.removeEventListener('touchstart', handleGlobalPointerDown);
    };
  }, [floatingSelection]);

  // 🔲 모서리 크기 조절 핸들 드래그 시작 핸들러
  const startResize = (e: React.MouseEvent | React.TouchEvent, handle: 'tl' | 'tr' | 'bl' | 'br') => {
    e.stopPropagation();
    e.preventDefault();
    if (!floatingSelection) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    setResizeHandle(handle);
    resizeStartRef.current = {
      startX: clientX,
      startY: clientY,
      origX: floatingSelection.currentX,
      origY: floatingSelection.currentY,
      origW: floatingSelection.width,
      origH: floatingSelection.height,
    };
  };

  // 🔲 크기 조절 전역 마우스/터치 리스너 (캔버스 밖으로 마우스가 나가도 부드럽게 크기 조절)
  useEffect(() => {
    if (!resizeHandle) return;

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!resizeHandle || !resizeStartRef.current || !floatingSelection) return;

      const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;

      const { startX, startY, origX, origY, origW, origH } = resizeStartRef.current;
      const dx = clientX - startX;
      const dy = clientY - startY;

      let newX = origX;
      let newY = origY;
      let newW = origW;
      let newH = origH;
      const minSize = 24;

      if (resizeHandle === 'br') {
        newW = Math.max(minSize, origW + dx);
        newH = Math.max(minSize, origH + dy);
      } else if (resizeHandle === 'bl') {
        newW = Math.max(minSize, origW - dx);
        newX = origX + (origW - newW);
        newH = Math.max(minSize, origH + dy);
      } else if (resizeHandle === 'tr') {
        newW = Math.max(minSize, origW + dx);
        newH = Math.max(minSize, origH - dy);
        newY = origY + (origH - newH);
      } else if (resizeHandle === 'tl') {
        newW = Math.max(minSize, origW - dx);
        newX = origX + (origW - newW);
        newH = Math.max(minSize, origH - dy);
        newY = origY + (origH - newH);
      }

      floatingSelection.currentX = Math.round(newX);
      floatingSelection.currentY = Math.round(newY);
      floatingSelection.width = Math.round(newW);
      floatingSelection.height = Math.round(newH);

      renderSelectionPreview();
      drawSelectionOverlay(floatingSelection);
    };

    const onPointerUp = () => {
      setResizeHandle(null);
      resizeStartRef.current = null;
      if (floatingSelection) {
        const updated = { ...floatingSelection };
        floatingSelectionRef.current = updated;
        setFloatingSelection(updated);
        drawSelectionOverlay(updated);
      }
    };

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);

    return () => {
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
    };
  }, [resizeHandle, floatingSelection]);

  // =========================================================================
  // 🖱️ 마우스 / 터치 이벤트 핸들러 (굿노트 브러시 + 텍스트 + 테이프)
  // =========================================================================

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (tool === 'laser') return;
    const pos = snapToRuler(getCanvasCoords(e), true);
    setStartPos(pos);
    currentPosRef.current = pos;
    resetIdleTimer();

    // 🖐️ 손 도구(Hand) 또는 스페이스바 누름 또는 마우스 휠 클릭 시 판서 영역 자유 이동(Pan)
    const isWheelClick = 'button' in e && (e as React.MouseEvent).button === 1;
    if (tool === 'hand' || isSpacePressed || isWheelClick) {
      if (floatingSelectionRef.current || floatingSelection) {
        commitSelection();
      }
      isPanningRef.current = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      panStartRef.current = {
        clientX,
        clientY,
        startPanX: panOffsetRef.current.x,
        startPanY: panOffsetRef.current.y,
      };
      return;
    }

    // 🎯 테이프 가리기 토글: 캔버스 빈 영역을 클릭하면 열려 있던 테이프들이 다시 불투명하게 가려짐
    setTapes((prev) => prev.map((t) => (t.isHidden ? t : { ...t, isHidden: true })));

    // 🎯 텍스트 편집 중 바깥을 클릭하면 포커스 해제
    if (selectedTextId) {
      setTexts((prev) =>
        prev
          .map((t) => (t.id === selectedTextId ? { ...t, isEditing: false } : t))
          .filter((t) => t.text.trim().length > 0)
      );
      setSelectedTextId(null);
    }

    // 🎯 필기 시 팝오버 즉시 닫기 & 고정 핀 미활성화 시 미니 퍽으로 축소
    setActivePopover(null);
    if (!isPinned && tool !== 'text' && tool !== 'tape') {
      setIsCollapsed(true);
    }

    // 1. 도구가 '텍스트(text)' 모드인 경우 -> 해당 좌표에 새 텍스트 생성
    if (tool === 'text') {
      // 캔버스를 누를 때 새 글상자에서 포커스가 빠져나가지 않도록
      if ('preventDefault' in e && e.cancelable) e.preventDefault();
      const newText: TextAnnotation = {
        id: `text-${Date.now()}`,
        x: Math.max(10, pos.x - 20),
        y: Math.max(10, pos.y - 15),
        width: 420,
        text: '',
        // 형광펜 색·굵기를 그대로 쓰지 않고, 읽기 좋은 글자색·크기로
        color: HIGHLIGHTER_COLORS.some((c) => c.hex === color) || color === '#fde047' ? (isDarkHexColor(bgColor) ? '#ffffff' : '#1e293b') : color,
        fontSize: penType === 'highlighter' ? 28 : Math.max(22, Math.min(48, Math.round(lineWidth * 2 + 22))),
        isEditing: true,
      };
      saveHistory();
      setTexts((prev) => [...prev, newText]);
      setSelectedTextId(newText.id);
      return;
    }

    // 2. 도구가 '테이프(tape)' 모드인 경우 -> 드래그 프리뷰 시작
    if (tool === 'tape') {
      setTapeDragPreview({
        startX: pos.x,
        startY: pos.y,
        currentX: pos.x,
        currentY: pos.y,
      });
      setIsDrawing(true);
      return;
    }

    // 3. 도구가 '선택(select)' 모드인 경우 (MS 화이트보드 스타일 화살표 선택)
    if (tool === 'select') {
      const currentSel = floatingSelectionRef.current || floatingSelection;
      if (currentSel) {
        if (isPointInSelection(pos.x, pos.y, currentSel)) {
          setIsDraggingSelection(true);
          setDragOffset({
            x: pos.x - currentSel.currentX,
            y: pos.y - currentSel.currentY,
          });
          return;
        } else {
          // 기존 선택 영역 외곽 빈 공간 클릭 시 즉시 확정 및 선택 해제 (선택 점선 완전 소거)
          commitSelection();
          return;
        }
      }

      setIsDrawing(true);
      setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));
      currentPosRef.current = pos;
      return;
    }

    // 4. 일반 필기구 또는 도형인 경우: 떠 있는 선택영역이 있다면 먼저 확정
    if (floatingSelectionRef.current || floatingSelection) {
      commitSelection();
    }

    saveHistory();
    setIsDrawing(true);

    // 필압 감지 (PointerEvent.pressure 지원 시 반영, 미지원 시 0.5)
    let pressure = 0.5;
    if ('pressure' in e && typeof (e as any).pressure === 'number' && (e as any).pressure > 0) {
      pressure = (e as any).pressure;
    }

    strokePointsRef.current = [
      {
        x: pos.x,
        y: pos.y,
        time: Date.now(),
        pressure,
        width: lineWidth,
      },
    ];
    currentSpeedRef.current = 0;

    // 형광펜 오프스크린 캔버스 초기화 (한 획 내 겹침 진해짐 방지용)
    if (tool === 'pen' && penType === 'highlighter') {
      const hCanvas = highlighterCanvasRef.current;
      if (hCanvas) {
        const hCtx = hCanvas.getContext('2d');
        if (hCtx) {
          hCtx.clearRect(0, 0, hCanvas.width, hCanvas.height);
          hCtx.save();
          hCtx.setTransform(1, 0, 0, 1, 0, 0); // 본 캔버스와 같은 1:1 좌표계 (레티나 배율 적용 시 화면 절반 밖이 잘리던 문제 수정)
          hCtx.lineCap = 'round';
          hCtx.lineJoin = 'round';
          hCtx.strokeStyle = color;
          hCtx.lineWidth = Math.max(14, lineWidth);
          hCtx.beginPath();
          hCtx.moveTo(pos.x, pos.y);
        }
      }
      // 시작 시점 메인 캔버스 스냅샷 보관
      setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));
      return;
    }

    applyPenStyle(ctx);

    if (tool === 'pen' || tool === 'eraser') {
      if (penType !== 'pencil') {
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
      }
      if (tool === 'pen' && penType === 'pencil') {
        drawTextureGrainBetween(ctx, pos.x, pos.y, pos.x, pos.y, lineWidth, 1.0);
      }
    } else {
      setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (tool === 'laser') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = snapToRuler(getCanvasCoords(e));
    if (tool === 'eraser' && isDrawing && polysRef.current.length) {
      const r = eraserSize / 2 + 6;
      const hit = polysRef.current.filter((pl) => (pl.kind === 'circle' ? Math.hypot(pl.pts[0].x - pos.x, pl.pts[0].y - pos.y) <= r || Math.abs(Math.hypot(pl.pts[0].x - pos.x, pl.pts[0].y - pos.y) - (pl.r || 0)) <= r : pl.pts.some((q) => Math.hypot(q.x - pos.x, q.y - pos.y) <= r)));
      if (hit.length) setPolys((list) => list.filter((pl) => !hit.includes(pl)));
    }

    // 🖐️ 판서 영역 자유 이동(Pan) 드래그 중인 경우
    if (isPanningRef.current) {
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      const dx = clientX - panStartRef.current.clientX;
      const dy = clientY - panStartRef.current.clientY;
      const newPan = {
        x: Math.round(panStartRef.current.startPanX + dx),
        y: Math.round(panStartRef.current.startPanY + dy),
      };
      // 🧈 부드럽게: 끄는 동안에는 화면 요소만 한 프레임에 한 번 옮기고, 놓을 때 저장
      panOffsetRef.current = newPan;
      livePanRef.current = newPan;
      if (!panRafRef.current) {
        panRafRef.current = requestAnimationFrame(() => {
          panRafRef.current = 0;
          const v = livePanRef.current;
          if (!v) return;
          if (panSurfaceRef.current) panSurfaceRef.current.style.transform = `translate3d(${v.x}px, ${v.y}px, 0) scale(${zoomRef.current})`;
          if (containerRef.current) containerRef.current.style.backgroundPosition = `${v.x}px ${v.y}px`;
        });
      }
      return;
    }

    // 2. 테이프 드래그 생성 중인 경우
    if (tool === 'tape' && isDrawing && tapeDragPreview) {
      setTapeDragPreview((prev) => (prev ? { ...prev, currentX: pos.x, currentY: pos.y } : null));
      return;
    }

    // 3-1. 선택 영역 및 개체 마우스 호버 감지 (화살표 <-> 이동 커서 동적 전환)
    if (tool === 'select' && !isDraggingSelection) {
      const currentSel = floatingSelectionRef.current || floatingSelection;
      if (currentSel) {
        const hovering = isPointInSelection(pos.x, pos.y, currentSel);
        if (hovering !== isHoveringSelection) {
          setIsHoveringSelection(hovering);
        }
      } else {
        const isOverText = texts.some(
          (t) =>
            pos.x >= t.x &&
            pos.x <= t.x + (t.width || 260) &&
            pos.y >= t.y &&
            pos.y <= t.y + 60
        );
        const isOverTape = tapes.some(
          (tp) =>
            pos.x >= tp.x &&
            pos.x <= tp.x + tp.width &&
            pos.y >= tp.y &&
            pos.y <= tp.y + tp.height
        );
        let isOverStroke = false;
        try {
          const pixel = ctx.getImageData(Math.round(pos.x), Math.round(pos.y), 1, 1).data;
          isOverStroke = pixel[3] > 20;
        } catch {
          // ignore
        }
        const hovering = isOverText || isOverTape || isOverStroke;
        if (hovering !== isHoveringSelection) {
          setIsHoveringSelection(hovering);
        }
      }
    }

    // 3-2. 선택 영역 이동 드래그 중인 경우
    if (tool === 'select' && isDraggingSelection) {
      const sel = floatingSelectionRef.current || floatingSelection;
      if (sel) {
        const newX = pos.x - dragOffset.x;
        const newY = pos.y - dragOffset.y;
        sel.currentX = Math.round(newX);
        sel.currentY = Math.round(newY);
        // 🧈 한 프레임에 한 번만 다시 그려요 (마우스가 빨라도 끊기지 않게)
        if (!selRafRef.current) {
          selRafRef.current = requestAnimationFrame(() => {
            selRafRef.current = 0;
            renderSelectionPreview();
            drawSelectionOverlay(floatingSelectionRef.current || sel);
          });
        }
        return;
      }
    }

    if (!isDrawing) return;

    // 4. 새로운 선택 영역 지정 드래그 중인 경우 (메인 캔버스가 아닌 상단 오버레이 캔버스에만 렌더링)
    if (tool === 'select') {
      currentPosRef.current = pos;
      const oCanvas = overlayCanvasRef.current;
      if (!oCanvas) return;
      const oCtx = oCanvas.getContext('2d');
      if (!oCtx) return;

      oCtx.save();
      oCtx.setTransform(1, 0, 0, 1, 0, 0);
      oCtx.clearRect(0, 0, oCanvas.width, oCanvas.height);

      oCtx.strokeStyle = '#5B44F2';
      oCtx.lineWidth = 1.8;
      oCtx.setLineDash([6, 5]);
      oCtx.fillStyle = 'rgba(91, 68, 242, 0.12)';

      const x = Math.min(startPos.x, pos.x);
      const y = Math.min(startPos.y, pos.y);
      const w = Math.abs(pos.x - startPos.x);
      const h = Math.abs(pos.y - startPos.y);
      oCtx.fillRect(x, y, w, h);
      oCtx.strokeRect(x, y, w, h);

      oCtx.restore();
      return;
    }

    // 5. 🖍️ 형광펜 (한 획 내 겹침 진해짐 방지 + 직선 그리기 모드)
    if (tool === 'pen' && penType === 'highlighter') {
      const hCanvas = highlighterCanvasRef.current;
      if (!hCanvas || !snapshot) return;
      const hCtx = hCanvas.getContext('2d');
      if (!hCtx) return;


      if (straightHighlighter) {
        // 직선 모드: 오프스크린 캔버스를 깨끗이 지우고 시작점과 현재점을 수평 일직선으로 연결
        hCtx.clearRect(0, 0, hCanvas.width, hCanvas.height);
        hCtx.save();
        hCtx.setTransform(1, 0, 0, 1, 0, 0);
        hCtx.lineCap = 'round';
        hCtx.lineJoin = 'round';
        hCtx.strokeStyle = color;
        hCtx.lineWidth = Math.max(14, lineWidth);
        hCtx.beginPath();
        hCtx.moveTo(startPos.x, startPos.y);
        hCtx.lineTo(pos.x, pos.y);
        hCtx.stroke();
        hCtx.restore();
      } else {
        // 자유 곡선 모드: 획 안정화 곡선 보간을 오프스크린 캔버스에 누적
        const pts = strokePointsRef.current;
        pts.push({
          x: pos.x,
          y: pos.y,
          time: Date.now(),
          pressure: 0.5,
          width: lineWidth,
        });

        if (pts.length >= 3) {
          const pPrev = pts[pts.length - 2];
          const pCurr = pts[pts.length - 1];
          const midX = (pPrev.x + pCurr.x) / 2;
          const midY = (pPrev.y + pCurr.y) / 2;
          hCtx.quadraticCurveTo(pPrev.x, pPrev.y, midX, midY);
          hCtx.stroke();
        } else {
          hCtx.lineTo(pos.x, pos.y);
          hCtx.stroke();
        }
      }

      // 본 캔버스에 스냅샷 복원 후 오프스크린 캔버스를 multiply 블렌드로 일괄 합성
      ctx.putImageData(snapshot, 0, 0);
      ctx.save();
      ctx.globalCompositeOperation = isDarkHexColor(bgColor) ? 'source-over' : 'multiply';
      ctx.globalAlpha = isDarkHexColor(bgColor) ? Math.min(0.45, highlighterOpacity + 0.08) : highlighterOpacity;
      ctx.drawImage(hCanvas, 0, 0);
      ctx.restore();
      return;
    }

    // 6. ✒️ 만년필/볼펜 & ✏️ 흑연 연필 & 지우개 (획 안정화 Quadratic Curve + 가변 폭)
    const now = Date.now();
    const pts = strokePointsRef.current;
    const lastPoint = pts[pts.length - 1];

    let pressure = 0.5;
    if ('pressure' in e && typeof (e as any).pressure === 'number' && (e as any).pressure > 0) {
      pressure = (e as any).pressure;
    }

    let dynamicWidth = lineWidth;
    let dynamicAlpha = 1.0;
    let speedFactor = 1.0;

    if (lastPoint && (tool === 'pen' || tool === 'eraser')) {
      const dt = Math.max(1, now - lastPoint.time);
      const dist = Math.hypot(pos.x - lastPoint.x, pos.y - lastPoint.y);
      const instantSpeed = dist / dt;
      currentSpeedRef.current = currentSpeedRef.current * 0.35 + instantSpeed * 0.65;

      if (tool === 'pen' && penType === 'pen') {
        // ✒️ 만년필 가변 폭 스트로크: 빠르게 그으면 얇아지고 필압 반영
        const speedRatio = Math.min(1.0, currentSpeedRef.current / 3.0);
        const pressureBonus = (pressure - 0.5) * 0.6;
        dynamicWidth = Math.max(1.0, lineWidth * (1.15 - speedRatio * 0.45 + pressureBonus));
      } else if (tool === 'pen' && penType === 'pencil') {
        // ✏️ 연필 질감: 속도에 따른 흑연 마찰 농담
        const speedRatio = Math.min(1.0, currentSpeedRef.current / 2.2);
        dynamicWidth = Math.max(1.2, lineWidth * (1.25 - speedRatio * 0.45));
        dynamicAlpha = Math.max(0.35, 0.78 - speedRatio * 0.35);
        speedFactor = Math.max(0.4, 1.15 - speedRatio * 0.55);
      }
    }

    pts.push({
      x: pos.x,
      y: pos.y,
      time: now,
      pressure,
      width: dynamicWidth,
    });

    applyPenStyle(ctx, dynamicWidth, dynamicAlpha);

    if (tool === 'pen' || tool === 'eraser') {
      // ✏️ 연필(Pencil)은 매끈한 솔리드 벡터 스트로크를 그리지 않고 다중 미세 흑연 파티클 분사 엔진으로 렌더링
      if (penType !== 'pencil') {
        if (pts.length >= 3) {
          const pPrev = pts[pts.length - 2];
          const pCurr = pts[pts.length - 1];
          const midX = (pPrev.x + pCurr.x) / 2;
          const midY = (pPrev.y + pCurr.y) / 2;
          ctx.quadraticCurveTo(pPrev.x, pPrev.y, midX, midY);
          ctx.stroke();
        } else {
          ctx.lineTo(pos.x, pos.y);
          ctx.stroke();
        }
      }

      if (tool === 'pen' && penType === 'pencil' && lastPoint) {
        drawTextureGrainBetween(ctx, lastPoint.x, lastPoint.y, pos.x, pos.y, dynamicWidth, speedFactor);
      }
    } else if (snapshot) {
      // 7. 도형 그리기 (직선, 사각형, 원)
      ctx.putImageData(snapshot, 0, 0);
      applyPenStyle(ctx, dynamicWidth, dynamicAlpha);
      ctx.beginPath();

      if (tool === 'line') {
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      } else if (tool === 'circle') {
        const radius = circleRadius(startPos, pos);
        ctx.arc(startPos.x, startPos.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        if (showCircleInfo) {
          // 그리는 동안 반지름 길이 미리 보기
          ctx.save();
          ctx.setLineDash([6, 6]);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(startPos.x, startPos.y);
          ctx.lineTo(startPos.x + radius, startPos.y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.font = '900 16px Pretendard, sans-serif';
          ctx.fillStyle = color;
          ctx.fillText(`${Math.round((radius / CM) * 10) / 10}cm`, startPos.x + radius / 2 - 18, startPos.y - 8);
          ctx.restore();
        }
      } else if (isPolyKind(tool)) {
        const pts = shapePolygon(tool, startPos, snapShapeEnd(startPos, pos));
        ctx.moveTo(pts[0].x, pts[0].y);
        pts.slice(1).forEach((q) => ctx.lineTo(q.x, q.y));
        ctx.closePath();
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
      shapeEndRef.current = isPolyKind(tool) ? snapShapeEnd(startPos, pos) : pos;
    }
  };

  const stopDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (isPanningRef.current) {
      isPanningRef.current = false;
      if (panRafRef.current) {
        cancelAnimationFrame(panRafRef.current);
        panRafRef.current = 0;
      }
      if (livePanRef.current) {
        setPanOffset(livePanRef.current);
        livePanRef.current = null;
      }
      return;
    }

    if (resizingTextId) {
      setResizingTextId(null);
      setResizeStartData(null);
      saveHistory();
      return;
    }

    if (draggingTextId) {
      setDraggingTextId(null);
      saveHistory();
      return;
    }

    if (isDraggingSelection) {
      setIsDraggingSelection(false);
      const sel = floatingSelectionRef.current || floatingSelection;
      if (sel) {
        const updated = { ...sel };
        floatingSelectionRef.current = updated;
        setFloatingSelection(updated);
        drawSelectionOverlay(updated);
      }
      return;
    }

    // 🩹 테이프 생성 완료 처리
    if (tool === 'tape' && tapeDragPreview) {
      const minX = Math.min(tapeDragPreview.startX, tapeDragPreview.currentX);
      const minY = Math.min(tapeDragPreview.startY, tapeDragPreview.currentY);
      const dragWidth = Math.abs(tapeDragPreview.currentX - tapeDragPreview.startX);

      if (dragWidth >= 20) {
        const newTape: StudyTape = {
          id: `tape-${Date.now()}`,
          x: minX,
          y: minY,
          width: Math.max(40, dragWidth),
          height: tapeHeight,
          color: tapeColor,
          isHidden: true,
        };
        saveHistory();
        setTapes((prev) => [...prev, newTape]);
      }
      setTapeDragPreview(null);
      setIsDrawing(false);
      return;
    }

    // 형광펜 오프스크린 캔버스 최종 완료
    if (tool === 'pen' && penType === 'highlighter' && isDrawing) {
      const hCanvas = highlighterCanvasRef.current;
      if (hCanvas) {
        const hCtx = hCanvas.getContext('2d');
        if (hCtx) {
          hCtx.restore?.();
        }
      }
      setSnapshot(null);
      strokePointsRef.current = [];
      setIsDrawing(false);
      return;
    }

    // 획 테이퍼링 (끝점이 뾰족하게 마감)
    if (tool === 'pen' && penType === 'pen' && isDrawing && strokePointsRef.current.length > 2) {
      const pts = strokePointsRef.current;
      const last = pts[pts.length - 1];
      const secondLast = pts[pts.length - 2];
      ctx.save();
      ctx.lineWidth = Math.max(0.5, lineWidth * 0.35);
      ctx.beginPath();
      ctx.moveTo(secondLast.x, secondLast.y);
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
      ctx.restore();
    }

    strokePointsRef.current = [];
    currentSpeedRef.current = 0;

    if (!isDrawing) return;
    setIsDrawing(false);

    // 📐 사각형 · 삼각형은 꼭짓점을 기억해 두었다가 각도를 보여 줘요
    if (tool === 'circle' && shapeEndRef.current) {
      const end = shapeEndRef.current;
      shapeEndRef.current = null;
      const r = circleRadius(startPos, end);
      // 미리 보기로 그린 반지름 점선 · 글자는 지우고 원만 남겨요
      if (snapshot && showCircleInfo) {
        ctx.putImageData(snapshot, 0, 0);
        applyPenStyle(ctx);
        ctx.beginPath();
        ctx.arc(startPos.x, startPos.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (r > 10) setPolys((list) => [...list, { id: `c${Date.now()}`, kind: 'circle', pts: [{ x: startPos.x, y: startPos.y }], r, color }]);
    }
    if (isPolyKind(tool) && shapeEndRef.current) {
      const end = shapeEndRef.current;
      shapeEndRef.current = null;
      if (Math.abs(end.x - startPos.x) > 12 && Math.abs(end.y - startPos.y) > 12) {
        const pts = shapePolygon(tool, startPos, end);
        setPolys((list) => [...list, { id: `p${Date.now()}`, kind: tool, pts, color }]);
      }
    }

    // 선택 영역 클리핑 처리 (단일 클릭 선택 or 영역 마키 드래그)
    if (tool === 'select') {
      clearOverlayCanvas();
      if (!snapshot) return;

      const lastPos = currentPosRef.current;
      const dragDist = Math.hypot(lastPos.x - startPos.x, lastPos.y - startPos.y);
      const dpr = 1; // 판서 캔버스는 CSS 픽셀과 1:1 (레티나 배율을 곱하면 엉뚱한 위치가 선택됨)

      // [A] 단일 개체 클릭 선택 (MS Whiteboard 단일 클릭 감지)
      if (dragDist < 6) {
        // 1. 텍스트 상자 클릭 감지
        const clickedText = texts.find(
          (t) =>
            lastPos.x >= t.x &&
            lastPos.x <= t.x + (t.width || 260) &&
            lastPos.y >= t.y &&
            lastPos.y <= t.y + 60
        );
        if (clickedText) {
          setSelectedTextId(clickedText.id);
          setSnapshot(null);
          return;
        }

        // 2. 캔버스 필기 획(Stroke) 연결 요소(Connected Component) 감지
        const bounds = findConnectedStrokeBounds(ctx, lastPos.x, lastPos.y, canvas.width, canvas.height, 1);
        if (!bounds) {
          // 빈 영역 클릭 -> 선택 해제 (Deselect)
          if (floatingSelection) {
            commitSelection();
          }
          setSnapshot(null);
          clearOverlayCanvas();
          return;
        }

        const { minX, minY, width, height } = bounds;
        const offCanvas = document.createElement('canvas');
        offCanvas.width = width;
        offCanvas.height = height;
        const offCtx = offCanvas.getContext('2d');
        if (!offCtx) return;

        offCtx.drawImage(canvas, minX, minY, width, height, 0, 0, width, height);

        // 메인 캔버스에서 해당 획만 깔끔하게 지우기 (버퍼로 추출됨)
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillRect(minX, minY, width, height);
        ctx.restore();

        // 🎯 획이 제거된 상태의 깨끗한 베이스 캔버스 스냅샷 취득 (이동 시 잔상 방지)
        const clearedSnap = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const floating: FloatingSelection = {
          origX: minX,
          origY: minY,
          origWidth: width,
          origHeight: height,
          width,
          height,
          currentX: minX,
          currentY: minY,
          canvas: offCanvas,
          baseSnapshot: clearedSnap,
        };

        floatingSelectionRef.current = floating;
        setFloatingSelection(floating);
        setSnapshot(clearedSnap);

        // 🎯 메인 캔버스에 즉각 렌더링 (선택 점선은 메인 캔버스에 절대 그리지 않음!)
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
        ctx.drawImage(offCanvas, minX, minY, width, height);
        ctx.restore();

        drawSelectionOverlay(floating);
        return;
      }

      // [B] 사각형 마키 드래그 영역 선택 (Marquee Selection)
      const minX = Math.min(startPos.x, lastPos.x);
      const minY = Math.min(startPos.y, lastPos.y);
      const width = Math.abs(lastPos.x - startPos.x);
      const height = Math.abs(lastPos.y - startPos.y);

      if (width < 6 || height < 6) {
        ctx.putImageData(snapshot, 0, 0);
        setSnapshot(null);
        clearOverlayCanvas();
        return;
      }

      // 선택 영역 내 실제 그림(획) 존재 여부 검사
      const checkData = ctx.getImageData(
        Math.max(0, Math.floor(minX)),
        Math.max(0, Math.floor(minY)),
        Math.min(canvas.width, Math.ceil(width)),
        Math.min(canvas.height, Math.ceil(height))
      );
      let hasContent = false;
      for (let i = 3; i < checkData.data.length; i += 16) {
        if (checkData.data[i] > 20) {
          hasContent = true;
          break;
        }
      }

      if (!hasContent) {
        ctx.putImageData(snapshot, 0, 0);
        setSnapshot(null);
        clearOverlayCanvas();
        return;
      }

      ctx.putImageData(snapshot, 0, 0);

      const offCanvas = document.createElement('canvas');
      offCanvas.width = width;
      offCanvas.height = height;
      const offCtx = offCanvas.getContext('2d');
      if (!offCtx) return;

      offCtx.drawImage(canvas, minX, minY, width, height, 0, 0, width, height);

      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillRect(minX, minY, width, height);
      ctx.restore();

      // 🎯 영역이 지워진 상태의 깨끗한 베이스 캔버스 스냅샷 취득 (이동 시 잔상 방지)
      const clearedSnap = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const floating: FloatingSelection = {
        origX: minX,
        origY: minY,
        origWidth: width,
        origHeight: height,
        width,
        height,
        currentX: minX,
        currentY: minY,
        canvas: offCanvas,
        baseSnapshot: clearedSnap,
      };

      floatingSelectionRef.current = floating;
      setFloatingSelection(floating);
      setSnapshot(clearedSnap);

      // 🎯 메인 캔버스에는 순수 그래픽만 그리고 점선 박스는 절대 그리지 않음!
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      ctx.drawImage(offCanvas, minX, minY, width, height);
      ctx.restore();

      drawSelectionOverlay(floating);
      return;
    }

    setSnapshot(null);
  };

  // ⭕ 굵기 미리보기 커서 & 🔴 레이저 포인터
  const handleBoardPointerMove = (e: React.PointerEvent) => {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    const cur = brushCursorRef.current;
    const showCursor = (tool === 'pen' || tool === 'eraser' || tool === 'laser') && e.pointerType !== 'touch' && !isSpacePressed;
    if (cur) {
      if (!showCursor) {
        cur.style.opacity = '0';
      } else {
        const size =
          tool === 'eraser' ? eraserSize : tool === 'laser' ? 14 : penType === 'highlighter' ? Math.max(14, lineWidth) : Math.max(3, lineWidth);
        cur.style.opacity = '1';
        cur.style.width = `${size}px`;
        cur.style.height = `${size}px`;
        cur.style.transform = `translate(${x - size / 2}px, ${y - size / 2}px)`;
        cur.dataset.kind = tool === 'eraser' ? 'eraser' : tool === 'laser' ? 'laser' : penType;
        cur.style.setProperty('--wb-c', tool === 'pen' ? color : '#ef4444');
      }
    }
    if (tool === 'laser' && (e.buttons === 1 || e.pointerType === 'touch' || e.pointerType === 'pen')) {
      laserPtsRef.current.push({ x, y, t: performance.now() });
      if (!laserRafRef.current) laserRafRef.current = requestAnimationFrame(drawLaser);
    }
  };
  const drawLaser = () => {
    const cv = laserCanvasRef.current;
    const box = containerRef.current;
    if (!cv || !box) {
      laserRafRef.current = null;
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    const w = box.clientWidth;
    const h = box.clientHeight;
    if (cv.width !== Math.round(w * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const now = performance.now();
    const LIFE = 650;
    const pts = (laserPtsRef.current = laserPtsRef.current.filter((p) => now - p.t < LIFE));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 1; i < pts.length; i++) {
      const a = 1 - (now - pts[i].t) / LIFE;
      ctx.strokeStyle = `rgba(239, 68, 68, ${a})`;
      ctx.shadowColor = 'rgba(248, 113, 113, 0.9)';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 3 + 5 * a;
      ctx.beginPath();
      ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
      ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }
    laserRafRef.current = pts.length ? requestAnimationFrame(drawLaser) : null;
  };

  const posLabel = toolbarPosition === 'left' ? '왼쪽' : toolbarPosition === 'right' ? '오른쪽' : '아래';
  const isVerticalDock = toolbarPosition !== 'center';
  const dockOnDark = isDarkHexColor(bgColor);

  // 🔍 배율 바꾸기: 화면의 (cx, cy) 점이 그대로 있도록 판을 옮겨요
  const zoomAt = (next: number, cx?: number, cy?: number) => {
    const z0 = zoomRef.current;
    const z1 = Math.min(3, Math.max(0.4, Math.round(next * 100) / 100));
    if (z1 === z0) return;
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) {
      setZoom(z1);
      return;
    }
    const px = cx ?? box.left + box.width / 2;
    const py = cy ?? box.top + box.height / 2;
    const ox = box.left + box.width / 2 - BOARD_WIDTH / 2;
    const oy = box.top + box.height / 2 - BOARD_HEIGHT / 2;
    const p = livePanRef.current || panOffset;
    const bx = (px - ox - p.x) / z0;
    const by = (py - oy - p.y) / z0;
    setPanOffset({ x: px - ox - bx * z1, y: py - oy - by * z1 });
    setZoom(z1);
  };
  const onBoardWheel = (e: React.WheelEvent) => {
    if (cover?.mode === 'spot') return;
    const t = e.target as HTMLElement;
    // 글상자 · 팝업 안에서 굴릴 때는 그 안을 스크롤
    if (t.closest('.wb-text.is-editing, .wb-pop, textarea, [data-wb-no-zoom]')) return;
    const f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
    zoomAt(zoomRef.current * f, e.clientX, e.clientY);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-0 select-none relative animate-fade-in overflow-hidden">


      {/* 🎨 실제 판서 캔버스 컨테이너 (위쪽 여백까지 100% 꽉 채우며 배경 스타일 동적 반영) */}
      <div
        ref={containerRef}
        onWheel={onBoardWheel}
        style={livePanRef.current ? { ...containerBgStyle, backgroundPosition: `${livePanRef.current.x}px ${livePanRef.current.y}px` } : containerBgStyle}
        onMouseMove={resetIdleTimer}
        onTouchStart={resetIdleTimer}
        className={`w-full h-full flex-1 rounded-3xl border border-black/10 dark:border-white/10 relative overflow-hidden shadow-2xl transition-colors duration-300 ${
          isSpacePressed || tool === 'hand'
            ? isPanningRef.current
              ? 'cursor-grabbing'
              : 'cursor-grab'
            : tool === 'select'
            ? isDraggingSelection
              ? 'cursor-grabbing'
              : isHoveringSelection
              ? 'cursor-move'
              : 'cursor-default'
            : tool === 'text'
            ? 'cursor-text'
            : tool === 'tape'
            ? 'cursor-cell'
            : tool === 'pen' || tool === 'eraser' || tool === 'laser'
            ? 'cursor-none'
            : 'cursor-crosshair'
        }`}
        onPointerMove={handleBoardPointerMove}
        onPointerDown={handleBoardPointerMove}
        onScroll={(e) => {
          // 버튼을 누를 때 브라우저가 판 안쪽을 몰래 스크롤하지 않도록 (화면 밀림 방지)
          const el = e.currentTarget;
          if (el.scrollLeft || el.scrollTop) {
            el.scrollLeft = 0;
            el.scrollTop = 0;
          }
        }}
        onPointerLeave={() => {
          if (brushCursorRef.current) brushCursorRef.current.style.opacity = '0';
        }}
      >
        {/* 🔴 레이저 포인터 꼬리 (화면 좌표) */}
        <canvas ref={laserCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-[45]" />
        {/* ⭕ 굵기 미리보기 커서 */}
        <div ref={brushCursorRef} className="wb-brush-cursor" aria-hidden />

        {/* 🎭 가림막 (위에서부터 / 왼쪽부터 조금씩 열기) */}
        {cover?.mode === 'shade' && (
          <div
            className={`wb-shade is-${cover.dir}`}
            style={cover.dir === 'down' ? { top: `${cover.reveal * 100}%` } : { left: `${cover.reveal * 100}%` }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            data-wb-shade
          >
            <div
              className="wb-shade-handle"
              title="끌어서 열기 / 닫기"
              onPointerDown={(e) => {
                e.stopPropagation();
                const el = e.currentTarget as HTMLElement;
                el.setPointerCapture?.(e.pointerId);
                const box = containerRef.current!.getBoundingClientRect();
                const mv = (ev: PointerEvent) =>
                  setCover((c) =>
                    c && c.mode === 'shade'
                      ? { ...c, reveal: Math.min(0.98, Math.max(0, c.dir === 'down' ? (ev.clientY - box.top) / box.height : (ev.clientX - box.left) / box.width)) }
                      : c
                  );
                const up = () => {
                  el.removeEventListener('pointermove', mv);
                  el.removeEventListener('pointerup', up);
                };
                el.addEventListener('pointermove', mv);
                el.addEventListener('pointerup', up);
              }}
            >
              <span>{cover.dir === 'down' ? '⇣ 끌어서 열기' : '⇢ 끌어서 열기'}</span>
            </div>
            <div className="wb-shade-face">
              <span className="wb-shade-emoji">🙈</span>
              <span>가려 둔 부분이에요</span>
            </div>
            <div className="wb-cover-bar">
              <button type="button" onClick={() => setCover((c) => (c && c.mode === 'shade' ? { ...c, reveal: Math.max(0, c.reveal - 0.1) } : c))} title="조금 닫기">
                {cover.dir === 'down' ? '▲' : '◀'}
              </button>
              <button type="button" onClick={() => setCover((c) => (c && c.mode === 'shade' ? { ...c, reveal: Math.min(0.98, c.reveal + 0.1) } : c))} title="한 칸 더 열기">
                {cover.dir === 'down' ? '▼' : '▶'}
              </button>
              <button type="button" onClick={() => setCover((c) => (c && c.mode === 'shade' ? { ...c, dir: c.dir === 'down' ? 'right' : 'down', reveal: 0 } : c))} title="방향 바꾸기">
                ⇄
              </button>
              <button type="button" onClick={() => setCover(null)} title="가림막 치우기">
                ✕
              </button>
            </div>
          </div>
        )}

        {/* 🔦 스포트라이트 (동그란 곳만 보이기) */}
        {cover?.mode === 'spot' && (
          <div
            className="wb-spot"
            style={{ background: `radial-gradient(circle ${cover.r}px at ${cover.x}px ${cover.y}px, transparent ${cover.r - 2}px, rgba(2,6,23,0.86) ${cover.r}px)` }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onPointerDown={(e) => {
              const box = containerRef.current!.getBoundingClientRect();
              const el = e.currentTarget as HTMLElement;
              el.setPointerCapture?.(e.pointerId);
              const mv = (ev: PointerEvent) => setCover((c) => (c && c.mode === 'spot' ? { ...c, x: ev.clientX - box.left, y: ev.clientY - box.top } : c));
              mv(e.nativeEvent);
              const up = () => {
                el.removeEventListener('pointermove', mv);
                el.removeEventListener('pointerup', up);
              };
              el.addEventListener('pointermove', mv);
              el.addEventListener('pointerup', up);
            }}
            onWheel={(e) => setCover((c) => (c && c.mode === 'spot' ? { ...c, r: Math.min(600, Math.max(60, c.r - e.deltaY * 0.3)) } : c))}
            data-wb-spot
          >
            <div className="wb-cover-bar is-spot" onPointerDown={(e) => e.stopPropagation()}>
              <span>🔦 끌어서 옮기기</span>
              <button type="button" onClick={() => setCover((c) => (c && c.mode === 'spot' ? { ...c, r: Math.max(60, c.r - 40) } : c))} title="작게">
                −
              </button>
              <button type="button" onClick={() => setCover((c) => (c && c.mode === 'spot' ? { ...c, r: Math.min(600, c.r + 40) } : c))} title="크게">
                ＋
              </button>
              <button type="button" onClick={() => setCover(null)} title="스포트라이트 끄기">
                ✕
              </button>
            </div>
          </div>
        )}
        {/* 🔍 배율 (마우스 휠로도 조절) */}
        <div className="wb-zoom" data-wb-no-zoom onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => zoomAt(zoomRef.current / 1.2)} title="작게">
            −
          </button>
          <button type="button" className="wb-zoom-v" onClick={() => zoomAt(1)} title="100%로 (마우스 휠로 확대 · 축소)" data-wb-zoom>
            {Math.round(zoom * 100)}%
          </button>
          <button type="button" onClick={() => zoomAt(zoomRef.current * 1.2)} title="크게">
            ＋
          </button>
        </div>
        {/* 🖐️ 판서 영역 전체 Pan 이동 서피스 (MS 화이트보드 무한 캔버스 이동) */}
        <div
          ref={panSurfaceRef}
          style={{
            transform: `translate3d(${(livePanRef.current || panOffset).x}px, ${(livePanRef.current || panOffset).y}px, 0) scale(${zoom})`,
            width: `${BOARD_WIDTH}px`,
            height: `${BOARD_HEIGHT}px`,
            position: 'absolute',
            left: `calc(50% - ${BOARD_WIDTH / 2}px)`,
            top: `calc(50% - ${BOARD_HEIGHT / 2}px)`,
            transformOrigin: '0 0',
          }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            style={{
              width: `${BOARD_WIDTH}px`,
              height: `${BOARD_HEIGHT}px`,
              transform: 'translateZ(0)',
              willChange: 'contents',
            }}
            className="drawing-canvas-layer block touch-none absolute inset-0 z-10"
          />

          {/* 🎯 최상단 임시 인터랙션 레이어 (선택 점선 및 실시간 영역 드래그 전용 버퍼) */}
          <canvas
            ref={overlayCanvasRef}
            style={{
              width: `${BOARD_WIDTH}px`,
              height: `${BOARD_HEIGHT}px`,
              transform: 'translateZ(0)',
              willChange: 'contents',
            }}
            className="drawing-canvas-layer block touch-none absolute inset-0 z-15 pointer-events-none"
          />

        {/* 📐 도형 각도 표시 (판 좌표) */}
        <AngleOverlay polys={polys} flags={{ angle: showAngles, len: showCircleInfo, area: showArea }} isLight={isLight} />

        {/* 🧊 3D 입체도형 무대 (판 좌표 · 판서 모드에서는 펜 아래) */}
        {solid3d && (
          <React.Suspense fallback={<div className="s3d-loading" style={{ left: solid3d.x, top: solid3d.y, width: solid3d.w, height: solid3d.h }}>🧊 입체도형 준비 중…</div>}>
            <Solid3DStage box={solid3d} onBox={setSolid3d} onClose={() => setSolid3d(null)} writeMode={solidWrite} onWriteMode={setSolidWrite} isLight={isLight} />
          </React.Suspense>
        )}

        {/* 📏 자 · 📐 각도기 (판 좌표 — 판을 옮기면 함께 움직임) */}
        {ruler && (
          <div
            className={`wb-ruler ${isDrawing ? 'pointer-events-none' : ''}`}
            style={{ left: ruler.x, top: ruler.y, width: ruler.len, transform: `rotate(${ruler.angle}deg)` }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onPointerDown={(e) => {
              e.stopPropagation();
              const el = e.currentTarget as HTMLElement;
              el.setPointerCapture?.(e.pointerId);
              const st = { cx: e.clientX, cy: e.clientY, x: ruler.x, y: ruler.y };
              const mv = (ev: PointerEvent) => setRuler((r) => (r ? { ...r, x: st.x + ev.clientX - st.cx, y: st.y + ev.clientY - st.cy } : r));
              const up = () => {
                el.removeEventListener('pointermove', mv);
                el.removeEventListener('pointerup', up);
              };
              el.addEventListener('pointermove', mv);
              el.addEventListener('pointerup', up);
            }}
            data-wb-ruler
          >
            <svg width={ruler.len} height={64} className="block">
              {Array.from({ length: Math.floor(ruler.len / 10) + 1 }).map((_, i) => (
                <g key={i}>
                  <line x1={i * 10} y1={0} x2={i * 10} y2={i % 5 === 0 ? 18 : 9} stroke="#334155" strokeWidth={i % 5 === 0 ? 1.4 : 0.8} />
                  {i % 5 === 0 && (
                    <text x={i * 10} y={30} fontSize={11} fontWeight={700} textAnchor="middle" fill="#334155">
                      {i / 5}
                    </text>
                  )}
                </g>
              ))}
            </svg>
            <span className="wb-ruler-angle">{Math.round(((ruler.angle % 360) + 360) % 360)}°</span>
            <button
              type="button"
              className="wb-inst-rot"
              title="돌리기 (끌어서 각도 바꾸기)"
              onPointerDown={(e) => {
                e.stopPropagation();
                const el = e.currentTarget as HTMLElement;
                el.setPointerCapture?.(e.pointerId);
                const mv = (ev: PointerEvent) => {
                  const p = getCanvasCoords(ev);
                  setRuler((r) => {
                    if (!r) return r;
                    let a = (Math.atan2(p.y - r.y, p.x - r.x) * 180) / Math.PI;
                    if (!ev.shiftKey) {
                      const snap = Math.round(a / 15) * 15;
                      if (Math.abs(a - snap) < 3) a = snap;
                    }
                    return { ...r, angle: a };
                  });
                };
                const up = () => {
                  el.removeEventListener('pointermove', mv);
                  el.removeEventListener('pointerup', up);
                };
                el.addEventListener('pointermove', mv);
                el.addEventListener('pointerup', up);
              }}
            >
              ⟳
            </button>
            <button type="button" className="wb-inst-close" onPointerDown={(e) => e.stopPropagation()} onClick={() => setRuler(null)} title="자 치우기">
              ✕
            </button>
          </div>
        )}
        {protractor && (
          <div
            className={`wb-protractor ${isDrawing ? 'pointer-events-none' : ''}`}
            style={{ left: protractor.x - protractor.r, top: protractor.y - protractor.r, width: protractor.r * 2, height: protractor.r + 26, transform: `rotate(${protractor.angle}deg)`, transformOrigin: `${protractor.r}px ${protractor.r}px` }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onPointerDown={(e) => {
              e.stopPropagation();
              const el = e.currentTarget as HTMLElement;
              el.setPointerCapture?.(e.pointerId);
              const st = { cx: e.clientX, cy: e.clientY, x: protractor.x, y: protractor.y };
              const mv = (ev: PointerEvent) => setProtractor((r) => (r ? { ...r, x: st.x + ev.clientX - st.cx, y: st.y + ev.clientY - st.cy } : r));
              const up = () => {
                el.removeEventListener('pointermove', mv);
                el.removeEventListener('pointerup', up);
              };
              el.addEventListener('pointermove', mv);
              el.addEventListener('pointerup', up);
            }}
            data-wb-protractor
          >
            {(() => {
              const R = protractor.r;
              return (
                <svg width={R * 2} height={R + 26} className="block overflow-visible">
                  <path d={`M 0 ${R} A ${R} ${R} 0 0 1 ${R * 2} ${R} Z`} fill="rgba(186,230,253,0.42)" stroke="#0284c7" strokeWidth={1.5} />
                  <path d={`M ${R - 46} ${R} A 46 46 0 0 1 ${R + 46} ${R}`} fill="none" stroke="#0284c7" strokeWidth={1} opacity={0.6} />
                  {Array.from({ length: 181 }).map((_, d) => {
                    const a = Math.PI - (d * Math.PI) / 180;
                    const len = d % 10 === 0 ? 16 : d % 5 === 0 ? 10 : 5;
                    return (
                      <line key={d} x1={R + Math.cos(a) * R} y1={R - Math.sin(a) * R} x2={R + Math.cos(a) * (R - len)} y2={R - Math.sin(a) * (R - len)} stroke="#075985" strokeWidth={d % 10 === 0 ? 1.3 : 0.7} />
                    );
                  })}
                  {Array.from({ length: 19 }).map((_, i) => {
                    const d = i * 10;
                    const a = Math.PI - (d * Math.PI) / 180;
                    return (
                      <text key={d} x={R + Math.cos(a) * (R - 28)} y={R - Math.sin(a) * (R - 28) + 4} fontSize={10.5} fontWeight={800} textAnchor="middle" fill="#075985">
                        {d}
                      </text>
                    );
                  })}
                  <line x1={R} y1={R} x2={R} y2={R - 30} stroke="#0284c7" strokeWidth={1} />
                  <circle cx={R} cy={R} r={4} fill="#0284c7" />
                </svg>
              );
            })()}
            <button
              type="button"
              className="wb-inst-rot"
              style={{ right: -14, top: protractor.r - 14 }}
              title="돌리기"
              onPointerDown={(e) => {
                e.stopPropagation();
                const el = e.currentTarget as HTMLElement;
                el.setPointerCapture?.(e.pointerId);
                const mv = (ev: PointerEvent) => {
                  const p = getCanvasCoords(ev);
                  setProtractor((r) => (r ? { ...r, angle: (Math.atan2(p.y - r.y, p.x - r.x) * 180) / Math.PI } : r));
                };
                const up = () => {
                  el.removeEventListener('pointermove', mv);
                  el.removeEventListener('pointerup', up);
                };
                el.addEventListener('pointermove', mv);
                el.addEventListener('pointerup', up);
              }}
            >
              ⟳
            </button>
            <button type="button" className="wb-inst-close" style={{ left: protractor.r - 12, top: protractor.r + 2 }} onPointerDown={(e) => e.stopPropagation()} onClick={() => setProtractor(null)} title="각도기 치우기">
              ✕
            </button>
          </div>
        )}

        {setSquares.map((t) => (
          <SetSquareView
            key={t.id}
            t={t}
            drawing={isDrawing}
            toBoard={(ev) => getCanvasCoords(ev)}
            onChange={(nt) => setSetSquares((list) => list.map((x) => (x.id === nt.id ? nt : x)))}
            onClose={() => setSetSquares((list) => list.filter((x) => x.id !== t.id))}
          />
        ))}
        {compass && (
          <CompassView
            c={compass}
            drawing={isDrawing}
            color={color}
            toBoard={(ev) => getCanvasCoords(ev)}
            onChange={setCompass}
            onStart={() => saveHistory()}
            onArc={drawCompassArc}
            onClose={() => setCompass(null)}
          />
        )}

        {/* ========================================================== */}
        {/* 🔤 텍스트 상자 오버레이 레이어 (DOM 객체) */}
        {/*  - 모서리를 끌면 글자와 상자가 함께 커지고 작아져요 · 상자를 끌면 이동 */}
        {/*  - 끄는 동안에는 화면 요소만 바로 옮기고(부드럽게), 놓을 때 한 번만 저장해요 */}
        {/* ========================================================== */}
        {/* ✍️ 펜 · 도형 · 지우개를 쓰는 동안에는 글상자를 펜 아래로 → 글 위에도 그대로 그려져요 */}
        <div
          className={`absolute inset-0 pointer-events-none overflow-hidden ${
            ['text', 'select', 'hand', 'tape'].includes(tool) || texts.some((t) => t.isEditing) ? 'z-20' : 'z-[5] wb-texts-under'
          }`}
          data-wb-text-layer
        >
          {texts.map((item) => {
            const isSelected = selectedTextId === item.id;
            const itemWidth = item.width || 260;
            const swatches = isLight
              ? ['#111827', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#2563eb', '#7c3aed', '#db2777']
              : ['#ffffff', '#fde047', '#fb923c', '#f87171', '#4ade80', '#60a5fa', '#c084fc', '#f472b6'];
            const keep = (e: React.SyntheticEvent) => {
              e.stopPropagation();
              e.preventDefault();
            };
            return (
              <div
                key={item.id}
                data-wb-text-id={item.id}
                style={{
                  left: item.x,
                  top: item.y,
                  width: `${itemWidth}px`,
                  color: item.color,
                }}
                className={`absolute pointer-events-auto wb-text ${isSelected ? 'is-selected' : ''} ${item.isEditing ? 'is-editing' : ''}`}
                onPointerDown={(e) => beginTextGesture(e, item, 'press')}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                {/* 선택 시 위쪽 미니 도구 막대 (이동 · 글자 크기 · 색 · 완료 · 삭제) */}
                {isSelected && (
                  <div
                    className="wb-text-bar absolute left-0 flex items-center gap-1 px-1.5 py-1 rounded-2xl text-xs font-bold z-30 select-none whitespace-nowrap"
                    style={{ bottom: '100%', marginBottom: 10 }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={keep}
                  >
                    <button
                      type="button"
                      onPointerDown={(e) => beginTextGesture(e, item, 'move')}
                      onMouseDown={keep}
                      className="p-1.5 rounded-lg cursor-grab active:cursor-grabbing"
                      title="끌어서 옮기기"
                    >
                      <Move className="w-3.5 h-3.5" />
                    </button>
                    <div className="h-3 w-[1px] bg-slate-700" />
                    <button
                      type="button"
                      onMouseDown={keep}
                      onClick={(e) => {
                        e.stopPropagation();
                        setTexts((prev) => prev.map((t) => (t.id === item.id ? { ...t, fontSize: Math.max(10, t.fontSize - 4) } : t)));
                      }}
                      className="p-1.5 rounded-lg"
                      title="글자 작게"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-[11px] font-mono px-0.5 min-w-[38px] text-center">{item.fontSize}px</span>
                    <button
                      type="button"
                      onMouseDown={keep}
                      onClick={(e) => {
                        e.stopPropagation();
                        setTexts((prev) => prev.map((t) => (t.id === item.id ? { ...t, fontSize: Math.min(400, t.fontSize + 4) } : t)));
                      }}
                      className="p-1.5 rounded-lg"
                      title="글자 크게"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <div className="h-3 w-[1px] bg-slate-700" />
                    {swatches.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onMouseDown={(e) => {
                          keep(e);
                          applyTextColor(item, c);
                        }}
                        className={`wb-text-sw ${item.color.toLowerCase() === c ? 'is-on' : ''}`}
                        style={{ background: c }}
                        title={item.isEditing ? '글자를 골라 두면 고른 부분만, 아니면 전체 글자색이 바뀌어요' : '전체 글자색 바꾸기 (일부만 바꾸려면 글자를 고른 뒤 누르세요)'}
                        aria-label={`글자색 ${c}`}
                      />
                    ))}
                    <div className="h-3 w-[1px] bg-slate-700" />
                    <button
                      type="button"
                      onMouseDown={keep}
                      onClick={(e) => {
                        e.stopPropagation();
                        setTexts((prev) =>
                          prev.map((t) => (t.id === item.id ? { ...t, isEditing: false } : t)).filter((t) => t.text.trim().length > 0)
                        );
                        setSelectedTextId(null);
                      }}
                      className="p-1.5 rounded-lg"
                      title="입력 완료"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={keep}
                      onClick={(e) => {
                        e.stopPropagation();
                        saveHistory();
                        setTexts((prev) => prev.filter((t) => t.id !== item.id));
                        setSelectedTextId(null);
                      }}
                      className="p-1.5 rounded-lg"
                      title="텍스트 삭제"
                    >
                      <X className="w-3.5 h-3.5 text-rose-500" />
                    </button>
                  </div>
                )}

                {/* 📐 네 모서리: 끌면 글자 크기까지 함께 커지고 작아져요 · 오른쪽 가운데: 줄 너비만 */}
                {isSelected &&
                  (['tl', 'tr', 'bl', 'br'] as const).map((c) => (
                    <span
                      key={c}
                      className={`wb-text-corner is-${c}`}
                      onPointerDown={(e) => beginTextGesture(e, item, 'resize', c)}
                      onMouseDown={keep}
                      title="끌어서 글자 크게 · 작게"
                    />
                  ))}
                {isSelected && (
                  <span className="wb-text-side" onPointerDown={(e) => beginTextGesture(e, item, 'width')} onMouseDown={keep} title="끌어서 줄 너비만 바꾸기" />
                )}

                <div
                  data-wb-text-body
                  style={{
                    fontSize: `${item.fontSize}px`,
                    lineHeight: 1.35,
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                  }}
                  className="w-full font-semibold"
                >
                  {item.isEditing ? (
                    <RichTextEditor
                      html={textRich(item)}
                      style={{ color: item.color }}
                      onChange={(rich, text) => {
                        setTexts((prev) => prev.map((t) => (t.id === item.id ? { ...t, rich, text } : t)));
                        triggerAutoSave();
                      }}
                      onBlur={() => setTexts((prev) => prev.map((t) => (t.id === item.id ? { ...t, isEditing: false } : t)))}
                      onEscape={() => {
                        setTexts((prev) => prev.map((t) => (t.id === item.id ? { ...t, isEditing: false } : t)).filter((t) => t.text.trim().length > 0));
                        setSelectedTextId(null);
                      }}
                    />
                  ) : item.text ? (
                    <div className="whitespace-pre-wrap select-none" dangerouslySetInnerHTML={{ __html: textRich(item) }} />
                  ) : (
                    <div className="select-none opacity-50">(눌러서 글자 입력)</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 🔲 선택된 개체 4방향 크기 조절(Resize) 인터랙션 핸들 오버레이 */}
        {floatingSelection && (
          <div
            style={{
              left: floatingSelection.currentX,
              top: floatingSelection.currentY,
              width: floatingSelection.width,
              height: floatingSelection.height,
            }}
            className="absolute z-30 pointer-events-none select-none rounded-xs"
          >
            {/* 1) 좌상단 모서리 핸들 (Top-Left) */}
            <div
              onMouseDown={(e) => startResize(e, 'tl')}
              onTouchStart={(e) => startResize(e, 'tl')}
              className="pointer-events-auto absolute -top-3 -left-3 w-6 h-6 opacity-0 cursor-nwse-resize z-40"
              title="크기 조절 (좌상단)"
            />
            {/* 2) 우상단 모서리 핸들 (Top-Right) */}
            <div
              onMouseDown={(e) => startResize(e, 'tr')}
              onTouchStart={(e) => startResize(e, 'tr')}
              className="pointer-events-auto absolute -top-3 -right-3 w-6 h-6 opacity-0 cursor-nesw-resize z-40"
              title="크기 조절 (우상단)"
            />
            {/* 3) 좌하단 모서리 핸들 (Bottom-Left) */}
            <div
              onMouseDown={(e) => startResize(e, 'bl')}
              onTouchStart={(e) => startResize(e, 'bl')}
              className="pointer-events-auto absolute -bottom-3 -left-3 w-6 h-6 opacity-0 cursor-nesw-resize z-40"
              title="크기 조절 (좌하단)"
            />
            {/* 4) 우하단 모서리 핸들 (Bottom-Right) */}
            <div
              onMouseDown={(e) => startResize(e, 'br')}
              onTouchStart={(e) => startResize(e, 'br')}
              className="pointer-events-auto absolute -bottom-3 -right-3 w-6 h-6 opacity-0 cursor-nwse-resize z-40"
              title="크기 조절 (우하단)"
            />
          </div>
        )}

        {/* 🔲 선택된 개체 플로팅 조작 미니 툴바 (MS 화이트보드 컴팩트 컨트롤러) */}
        {floatingSelection && (
          <div
            data-selection-toolbar="true"
            style={{
              left: Math.max(10, Math.min(window.innerWidth - 380, floatingSelection.currentX)),
              top: Math.max(12, floatingSelection.currentY - 48),
            }}
            className="absolute z-35 flex items-center gap-1.5 bg-slate-900/95 text-white backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-2xl animate-fade-in select-none pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 pr-1">
              <MousePointer2 className="w-3.5 h-3.5 text-[#5B44F2]" />
              <span>선택 영역</span>
            </span>
            <div className="h-3 w-[1px] bg-slate-700" />
            <button
              type="button"
              onClick={commitSelection}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs"
              title="현재 위치 및 크기로 확정 (Enter)"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>확정</span>
            </button>
            <button
              type="button"
              onClick={duplicateSelection}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs"
              title="선택된 개체 복사"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>복사</span>
            </button>
            <button
              type="button"
              onClick={deleteSelection}
              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs"
              title="선택된 개체 삭제 (Delete)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>삭제</span>
            </button>
            <button
              type="button"
              onClick={commitSelection}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
              title="선택 해제 (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ========================================================== */}
        {/* 🩹 학습용 가리기 테이프(Study Tape) 인터랙티브 오버레이 레이어 */}
        {/* ========================================================== */}
        <div className="absolute inset-0 pointer-events-none z-25 overflow-hidden">
          {/* 드래그 생성 중인 테이프 실시간 미리보기 바 */}
          {tapeDragPreview && (
            <div
              style={{
                left: Math.min(tapeDragPreview.startX, tapeDragPreview.currentX),
                top: Math.min(tapeDragPreview.startY, tapeDragPreview.currentY),
                width: Math.max(30, Math.abs(tapeDragPreview.currentX - tapeDragPreview.startX)),
                height: tapeHeight,
                backgroundColor: tapeColor,
              }}
              className="absolute rounded-lg opacity-85 shadow-lg border-2 border-white/40 pointer-events-none animate-pulse"
            />
          )}

          {/* 생성 완료된 학습 테이프들 */}
          {tapes.map((tape) => {
            const isTargetedByEraser = activeTapeEraserTarget === tape.id;

            return (
              <div
                key={tape.id}
                style={{
                  left: tape.x,
                  top: tape.y,
                  width: tape.width,
                  height: tape.height,
                  backgroundColor: tape.isHidden ? tape.color : 'transparent',
                  borderColor: tape.color,
                }}
                onClick={(e) => {
                  e.stopPropagation();

                  // 지우개 모드일 때 테이프 클릭 -> 삭제 버튼 표시 또는 즉시 삭제 토글
                  if (tool === 'eraser') {
                    setActiveTapeEraserTarget(activeTapeEraserTarget === tape.id ? null : tape.id);
                    return;
                  }

                  // 일반 모드일 때 클릭 -> 가리기/보이기 토글 (불투명 ↔ 연한 반투명 점선)
                  setTapes((prev) =>
                    prev.map((t) => (t.id === tape.id ? { ...t, isHidden: !t.isHidden } : t))
                  );
                }}
                className={`absolute pointer-events-auto rounded-lg transition-all duration-200 cursor-pointer select-none group flex items-center justify-center ${
                  tape.isHidden
                    ? 'shadow-md border border-black/15 hover:scale-[1.01] active:scale-[0.99]'
                    : 'opacity-15 border-2 border-dashed shadow-none hover:opacity-30'
                }`}
                title={
                  tool === 'eraser'
                    ? '지우개: 클릭하여 삭제 버튼 열기'
                    : tape.isHidden
                    ? '클릭하면 가려진 글자가 보입니다'
                    : '클릭하면 다시 가려집니다 (빈 화면 클릭 시 전체 다시 가리기)'
                }
              >
                {/* 테이프 표면 마스킹 은은한 사선 스트라이프 패턴 (가려진 상태일 때만) */}
                {tape.isHidden && (
                  <div
                    className="absolute inset-0 rounded-lg pointer-events-none opacity-25"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(45deg, rgba(255,255,255,0.2) 0px, rgba(255,255,255,0.2) 8px, transparent 8px, transparent 16px)',
                    }}
                  />
                )}

                {/* 지우개 모드 연동: 지우개로 테이프 클릭 시 나타나는 붉은색 원형 닫기(✕) 삭제 버튼 */}
                {tool === 'eraser' && (isTargetedByEraser || 'hover:flex') && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      saveHistory();
                      setTapes((prev) => prev.filter((t) => t.id !== tape.id));
                      setActiveTapeEraserTarget(null);
                    }}
                    className={`absolute -top-3.5 -right-3.5 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-xl flex items-center justify-center transition cursor-pointer z-30 ${
                      isTargetedByEraser ? 'flex' : 'hidden group-hover:flex'
                    }`}
                    title="이 테이프 완전히 삭제"
                  >
                    <X className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        </div>

        {/* 🧭 판서 위치 초기화 미니 버튼 (캔버스를 이동했을 때 원점 복귀) */}
        {(panOffset.x !== 0 || panOffset.y !== 0 || zoom !== 1) && (
          <button
            type="button"
            onClick={() => {
              setPanOffset({ x: 0, y: 0 });
              panOffsetRef.current = { x: 0, y: 0 };
              setZoom(1);
            }}
            className="absolute top-4 left-4 z-35 bg-slate-900/95 hover:bg-slate-800 text-white backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 shadow-2xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition animate-fade-in active:scale-95"
            title="판서 캔버스 위치를 처음 원점(0, 0)으로 복귀"
          >
            <Move className="w-3.5 h-3.5 text-sky-400" />
            <span>화면 위치 초기화</span>
            <span className="text-[10px] text-slate-400 font-mono font-normal">({Math.round(panOffset.x)}, {Math.round(panOffset.y)})</span>
          </button>
        )}

        {/* ========================================================== */}
        {/* 🎛️ 화이트보드 내부 플로팅 3단계 툴바 (아코디언 캡슐 + 팝오버) */}
        {/* ========================================================== */}
        <div
          onMouseEnter={resetIdleTimer}
          onClick={resetIdleTimer}
          className={`wb-dock-wrap is-${toolbarPosition === 'center' ? 'bottom' : toolbarPosition} absolute z-40 transition-all duration-300 ${
            toolbarPosition === 'left'
              ? 'left-4 top-1/2 -translate-y-1/2'
              : toolbarPosition === 'right'
              ? 'right-4 top-1/2 -translate-y-1/2'
              : 'left-1/2 -translate-x-1/2 bottom-5'
          } ${isIdle ? 'opacity-35 hover:opacity-100 transition-opacity duration-500' : 'opacity-100'}`}
        >
          {/* [3단계: 상단 팝오버(Popover) 메뉴 - 세부 설정] */}
          {activePopover && (
            <div
              className={`wb-pop absolute bottom-[calc(100%+14px)] left-1/2 -translate-x-1/2 rounded-3xl bg-slate-900/95 dark:bg-slate-950/95 text-white backdrop-blur-2xl border border-white/20 shadow-2xl p-4 animate-scale-up ${
                activePopover === 'gallery' ? 'min-w-[340px] max-w-[440px]' : 'min-w-[300px] max-w-[380px]'
              } z-50 flex flex-col gap-3.5`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 📁 판서 보관함 팝오버 뷰 */}
              {activePopover === 'gallery' && (
                <div className="flex flex-col gap-3 w-full">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <FolderArchive className="w-4 h-4 text-amber-400" />
                      <h4 className="text-xs font-black text-white">
                        판서 보관함 <span className="text-[11px] font-normal text-slate-400">({slides.length}개 슬라이드)</span>
                      </h4>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleAddNewSlide}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1 transition shadow-sm cursor-pointer"
                        title="새 슬라이드 추가"
                      >
                        <Plus className="w-3 h-3" />
                        <span>새 슬라이드</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivePopover(null)}
                        className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scroll">
                    {slides.map((slide, idx) => {
                      const isCurrent = idx === currentSlideIndex;
                      return (
                        <div
                          key={slide.id || idx}
                          onClick={() => {
                            handleSwitchSlide(idx);
                            setActivePopover(null);
                          }}
                          className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 group relative ${
                            isCurrent
                              ? 'bg-indigo-600/25 border-indigo-500/80 shadow-md ring-1 ring-indigo-400/50'
                              : 'bg-white/5 hover:bg-white/10 border-white/10'
                          }`}
                        >
                          {/* 썸네일 미리보기 */}
                          <div className="w-16 h-11 rounded-lg overflow-hidden bg-slate-800 border border-white/10 shrink-0 relative flex items-center justify-center">
                            {slide.previewThumbnail ? (
                              <img
                                src={slide.previewThumbnail}
                                alt={`${idx + 1}페이지`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold">{idx + 1}P</span>
                            )}
                            {isCurrent && (
                              <div className="absolute inset-0 bg-indigo-600/20 border-2 border-indigo-400 rounded-lg pointer-events-none" />
                            )}
                          </div>

                          {/* 페이지 정보 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-white">
                                {idx + 1}페이지
                              </span>
                              {isCurrent && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-500 text-white">
                                  현재
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                              수정: {slide.updatedAt || '방금 전'}
                            </p>
                          </div>

                          {/* 우측 액션: PNG 다운로드 및 삭제 */}
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleDownloadSlidePng(slide, idx)}
                              className="p-1.5 rounded-lg bg-white/10 hover:bg-emerald-600 hover:text-white text-slate-300 transition cursor-pointer"
                              title="고해상도 PNG 이미지로 저장"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSlide(idx)}
                              className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-600 hover:text-white text-slate-300 transition cursor-pointer"
                              title="이 슬라이드 삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ① 펜 설정 뷰 */}
              {activePopover === 'pen' && (
                <>
                  {/* 상단: 펜 / 연필 / 형광펜 세그먼트 버튼 */}
                  <div className="grid grid-cols-3 gap-1 p-1 bg-white/10 rounded-2xl">
                    {[
                      { type: 'pen' as PenType, label: '✒️ 펜' },
                      { type: 'pencil' as PenType, label: '✏️ 연필' },
                      { type: 'highlighter' as PenType, label: '🖍️ 형광펜' },
                    ].map((p) => (
                      <button
                        key={p.type}
                        type="button"
                        onClick={() => handleSelectPenType(p.type)}
                        className={`py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 ${
                          penType === p.type && tool === 'pen'
                            ? 'bg-[#5B44F2] text-white shadow-md'
                            : 'text-slate-300 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span>{p.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* 중단: 굵기 조절 슬라이더 */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                      <span>
                        {tool === 'eraser'
                          ? `지우개 크기 ${eraserSize}px`
                          : penType === 'highlighter'
                          ? `형광폭 ${lineWidth}px`
                          : penType === 'pencil'
                          ? `연필 굵기 ${lineWidth}px`
                          : `펜 굵기 ${lineWidth}px`}
                      </span>
                      <div
                        className="rounded-full bg-white transition-all shadow-xs"
                        style={{
                          width: `${Math.min(24, Math.max(4, tool === 'eraser' ? eraserSize / 2 : lineWidth))}px`,
                          height: `${Math.min(24, Math.max(4, tool === 'eraser' ? eraserSize / 2 : lineWidth))}px`,
                          backgroundColor: tool === 'eraser' ? '#cbd5e1' : color,
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min={tool === 'eraser' ? 10 : penType === 'highlighter' ? 10 : 1}
                      max={tool === 'eraser' ? 80 : penType === 'highlighter' ? 50 : 25}
                      step={tool === 'eraser' ? 2 : penType === 'highlighter' ? 2 : 0.5}
                      value={tool === 'eraser' ? eraserSize : lineWidth}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (tool === 'eraser') setEraserSize(val);
                        else setLineWidth(val);
                      }}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#5B44F2]"
                    />
                    {/* 굵기 한눈에 고르기 (실제 굵기 그대로 보여 줌) */}
                    <div className="flex items-end justify-between gap-1 pt-1" data-width-presets>
                      {(tool === 'eraser' ? [12, 24, 40, 64] : penType === 'highlighter' ? [14, 20, 28, 40] : [1.5, 2.5, 4, 7, 12]).map((w) => {
                        const on = (tool === 'eraser' ? eraserSize : lineWidth) === w;
                        return (
                          <button
                            key={w}
                            type="button"
                            onClick={() => (tool === 'eraser' ? setEraserSize(w) : setLineWidth(w))}
                            className={`flex-1 h-12 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition ${on ? 'bg-[#5B44F2]/40 ring-1 ring-[#8b7bff]' : 'bg-white/5 hover:bg-white/10'}`}
                            title={`${w}px`}
                          >
                            <span
                              className="rounded-full"
                              style={{
                                width: Math.min(34, Math.max(3, tool === 'eraser' ? w / 2 : w)),
                                height: Math.min(34, Math.max(3, tool === 'eraser' ? w / 2 : penType === 'highlighter' ? w / 2.2 : w)),
                                background: tool === 'eraser' ? 'transparent' : color,
                                opacity: penType === 'highlighter' && tool !== 'eraser' ? 0.55 : 1,
                                border: tool === 'eraser' ? '2px dashed #cbd5e1' : 'none',
                                borderRadius: penType === 'highlighter' && tool !== 'eraser' ? 4 : 999,
                              }}
                            />
                            <span className="text-[9px] font-mono text-slate-400">{w}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 🖍️ 형광펜일 때: '직선으로 그리기' 토글 스위치 & 투명도 슬라이더 */}
                  {tool === 'pen' && penType === 'highlighter' && (
                    <div className="space-y-2 bg-pink-500/10 p-2.5 rounded-2xl border border-pink-400/20">
                      {/* 직선으로 그리기 토글 */}
                      <div className="flex items-center justify-between text-xs font-bold text-pink-300">
                        <span className="flex items-center gap-1">
                          <span>직선으로 깔끔하게 긋기</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setStraightHighlighter(!straightHighlighter)}
                          className="flex items-center gap-1 cursor-pointer transition text-pink-300 hover:text-white"
                        >
                          {straightHighlighter ? (
                            <ToggleRight className="w-5 h-5 text-pink-400" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-slate-400" />
                          )}
                          <span className="text-[11px] font-mono">
                            {straightHighlighter ? 'ON' : 'OFF'}
                          </span>
                        </button>
                      </div>

                      {/* 투명도 조절 */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-pink-300">
                          <span>형광 투명도 (Multiply)</span>
                          <span>{Math.round(highlighterOpacity * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.2"
                          max="0.8"
                          step="0.05"
                          value={highlighterOpacity}
                          onChange={(e) => setHighlighterOpacity(Number(e.target.value))}
                          className="w-full h-1.5 bg-pink-900/60 rounded-lg appearance-none cursor-pointer accent-pink-400"
                        />
                      </div>
                    </div>
                  )}

                  {/* ✏️ 연필일 때: 거칠기 질감 조절 슬라이더 */}
                  {tool === 'pen' && penType === 'pencil' && (
                    <div className="space-y-1 bg-amber-500/10 p-2.5 rounded-2xl border border-amber-400/20">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                        <span>흑연 거칠기 (Grain Texture)</span>
                        <span>{Math.round(pencilRoughness * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={pencilRoughness}
                        onChange={(e) => setPencilRoughness(Number(e.target.value))}
                        className="w-full h-1.5 bg-amber-900/60 rounded-lg appearance-none cursor-pointer accent-amber-400"
                      />
                    </div>
                  )}

                  {/* 하단: 9가지 기본 색상 원형 스와치 + 커스텀 컬러 피커 */}
                  {tool !== 'eraser' && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-400">{penType === 'highlighter' ? '형광펜 색 (연한 색)' : '펜 색상 선택'}</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(penType === 'highlighter' ? HIGHLIGHTER_COLORS : PALETTE_COLORS).map((c) => (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() => setColor(c.hex)}
                            className={`w-6 h-6 rounded-full border transition cursor-pointer hover:scale-125 ${
                              color === c.hex ? 'ring-2 ring-[#5B44F2] scale-110 shadow-md' : 'border-white/20'
                            }`}
                            style={{ backgroundColor: c.hex }}
                            title={c.name}
                          />
                        ))}
                        <label className="relative cursor-pointer">
                          <input
                            type="color"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                          />
                          <div
                            className="w-6 h-6 rounded-full border border-dashed border-slate-400 flex items-center justify-center hover:scale-110 transition bg-white/10"
                            title="직접 색상 선택"
                          >
                            <Palette className="w-3.5 h-3.5 text-slate-300" />
                          </div>
                        </label>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ② 도형 선택 뷰 (도형 종류, 선 두께 슬라이더 및 프리셋, 선 색상) */}
              {activePopover === 'shape' && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-300">도형 그리기 선택</span>
                    <span className="text-[10px] text-slate-400 font-bold">모양 · 굵기 · 색상 설정</span>
                  </div>

                  {/* 1. 도형 종류 선택 (드롭다운) */}
                  {(() => {
                    const cur = SHAPE_MENU.find((m) => m.id === tool) || SHAPE_MENU[0];
                    const groups = Array.from(new Set(SHAPE_MENU.map((m) => m.group)));
                    return (
                      <div className="relative" data-wb-shape-dd>
                        <button
                          type="button"
                          onClick={() => setShapeMenuOpen((v) => !v)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-sm font-black cursor-pointer"
                          aria-expanded={shapeMenuOpen}
                          data-wb-shape-current
                        >
                          <span className="w-8 h-8 rounded-xl bg-[#5B44F2] flex items-center justify-center">
                            <ShapeIcon kind={cur.id} size={18} />
                          </span>
                          <span className="flex-1 text-left">{cur.label}</span>
                          <ChevronUp className={`w-4 h-4 transition-transform ${shapeMenuOpen ? '' : 'rotate-180'}`} />
                        </button>
                        {shapeMenuOpen && (
                          <div className="mt-1.5 rounded-2xl bg-slate-800 border border-white/15 shadow-inner p-1.5" role="listbox">
                            {groups.map((g) => (
                              <div key={g}>
                                <div className="px-2 pt-1.5 pb-1 text-[10px] font-black text-slate-400">{g}</div>
                                <div className="grid grid-cols-2 gap-1">
                                  {SHAPE_MENU.filter((m) => m.group === g).map((m) => (
                                    <button
                                      key={m.id}
                                      type="button"
                                      role="option"
                                      aria-selected={tool === m.id}
                                      onClick={() => {
                                        if (floatingSelection) commitSelection();
                                        setTool(m.id as DrawTool);
                                        setShapeMenuOpen(false);
                                      }}
                                      className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-black cursor-pointer ${
                                        tool === m.id ? 'bg-[#5B44F2] text-white' : 'text-slate-200 hover:bg-white/10'
                                      }`}
                                      data-wb-shape={m.id}
                                    >
                                      <ShapeIcon kind={m.id} size={18} />
                                      {m.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* 📏 길이 · 🧮 넓이 식 · ∠ 각도 (모두 선택) · 🧊 3D 입체도형 */}
                  <div className="text-[10px] font-black text-slate-400 -mb-1">도형에 보여 줄 것 (골라서 켜요)</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([
                      { on: showCircleInfo, fn: toggleCircleInfo, label: '📏 길이', tip: '원은 반지름 · 지름, 다른 도형은 변의 길이를 보여 줘요 (켜면 0.5cm 단위로 맞춰 그려져요)', tone: 'bg-rose-500', data: 'data-wb-circle-toggle' },
                      { on: showArea, fn: toggleArea, label: '🧮 넓이 식', tip: '원은 원주 · 넓이, 다른 도형은 넓이를 구하는 식을 보여 줘요', tone: 'bg-amber-500', data: 'data-wb-area-toggle' },
                      { on: showAngles, fn: toggleAngles, label: '∠ 각도', tip: '다각형의 각도와 각의 합을 보여 줘요', tone: 'bg-emerald-500', data: 'data-wb-angle-toggle' },
                    ] as const).map((b) => (
                      <button
                        key={b.label}
                        type="button"
                        onClick={b.fn}
                        className={`py-2 px-1 rounded-xl text-[11px] font-black transition flex flex-col items-center justify-center gap-0.5 cursor-pointer leading-tight ${
                          b.on ? `${b.tone} text-white shadow-md` : 'bg-white/10 text-slate-300 hover:text-white hover:bg-white/15'
                        }`}
                        title={b.tip}
                        {...{ [b.data]: true }}
                      >
                        <span>{b.label}</span>
                        <span className="text-[9px] opacity-80">{b.on ? 'ON' : 'OFF'}</span>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      open3D();
                      setActivePopover(null);
                    }}
                    className="w-full py-2 px-1.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1 cursor-pointer bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-md hover:brightness-110"
                    title="입체도형을 3D로 돌려 보고 전개도를 펼쳐요"
                    data-wb-open-3d
                  >
                    🧊 3D 입체도형 · 전개도
                  </button>
                  {polys.length > 0 && (
                    <p className="text-[10px] font-bold text-slate-400 -mt-1.5">
                      그린 도형 {polys.length}개에 길이 · 넓이 식 · 각도가 표시돼요. 지우개로 꼭짓점을 지우면 그 도형의 각도도 사라져요.
                    </p>
                  )}

                  {/* 2. 📏 도형 선의 두께(굵기) 설정 */}
                  <div className="space-y-2 bg-white/5 p-2.5 rounded-2xl border border-white/10">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                      <span>도형 선 두께</span>
                      <span className="font-mono text-[#5B44F2] font-black">{lineWidth}px</span>
                    </div>

                    {/* 선 두께 슬라이더 (1px ~ 40px) */}
                    <input
                      type="range"
                      min="1"
                      max="40"
                      step="1"
                      value={lineWidth}
                      onChange={(e) => setLineWidth(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#5B44F2]"
                    />

                    {/* 원클릭 두께 프리셋 칩 */}
                    <div className="flex items-center gap-1.5 justify-between pt-0.5">
                      {[
                        { px: 2, label: '2px 얇게' },
                        { px: 5, label: '5px 기본' },
                        { px: 10, label: '10px 보통' },
                        { px: 18, label: '18px 굵게' },
                        { px: 28, label: '28px 강조' },
                      ].map((preset) => (
                        <button
                          key={preset.px}
                          type="button"
                          onClick={() => setLineWidth(preset.px)}
                          className={`flex-1 py-1 px-1 rounded-lg text-[10px] font-black transition cursor-pointer text-center ${
                            lineWidth === preset.px
                              ? 'bg-[#5B44F2] text-white shadow-xs'
                              : 'bg-white/10 text-slate-300 hover:text-white hover:bg-white/20'
                          }`}
                        >
                          {preset.px}px
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. 🎨 도형 선 색상 선택 */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400">도형 선 색상</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {PALETTE_COLORS.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setColor(c.hex)}
                          className={`w-6 h-6 rounded-full border transition cursor-pointer hover:scale-125 ${
                            color === c.hex ? 'ring-2 ring-[#5B44F2] scale-110 shadow-md' : 'border-white/20'
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        />
                      ))}
                      <label className="relative cursor-pointer">
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        />
                        <div
                          className="w-6 h-6 rounded-full border border-dashed border-slate-400 flex items-center justify-center hover:scale-110 transition bg-white/10"
                          title="직접 색상 선택"
                        >
                          <Palette className="w-3.5 h-3.5 text-slate-300" />
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}


              {/* ③ 🩹 학습용 테이프 설정 뷰 */}
              {activePopover === 'tape' && (
                <div className="space-y-3">
                  <span className="text-xs font-extrabold text-slate-300">학습용 가리기 테이프 설정</span>

                  {/* 1. 테이프 색상 선택 */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400">테이프 색상</span>
                    <div className="flex items-center gap-2">
                      {TAPE_COLORS.map((tc) => (
                        <button
                          key={tc.hex}
                          type="button"
                          onClick={() => setTapeColor(tc.hex)}
                          className={`w-7 h-7 rounded-lg border-2 transition cursor-pointer relative hover:scale-115 ${
                            tapeColor === tc.hex ? 'ring-2 ring-indigo-400 scale-110 shadow-lg border-white' : 'border-white/30'
                          }`}
                          style={{ backgroundColor: tc.hex }}
                          title={tc.name}
                        >
                          {tapeColor === tc.hex && (
                            <Check className="w-3.5 h-3.5 absolute inset-0 m-auto text-slate-900 stroke-[3]" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. 테이프 두께(높이) 조절 */}
                  <div className="space-y-1 bg-white/5 p-2.5 rounded-2xl border border-white/10">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                      <span>테이프 두께 (높이)</span>
                      <span className="font-mono text-indigo-400 font-black">{tapeHeight}px</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="70"
                      step="2"
                      value={tapeHeight}
                      onChange={(e) => setTapeHeight(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                    />
                  </div>

                  {/* 3. 테이프 일괄 삭제 버튼 */}
                  {tapes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        saveHistory();
                        setTapes([]);
                        setActivePopover(null);
                      }}
                      className="w-full py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white text-xs font-bold transition flex items-center justify-center gap-1.5 border border-rose-400/30 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>모든 테이프 제거 ({tapes.length}개)</span>
                    </button>
                  )}
                </div>
              )}

              {/* ④ 배경 설정 뷰 */}
              {activePopover === 'background' && (
                <div className="space-y-3">
                  <span className="text-xs font-extrabold text-slate-300">화이트보드 배경 설정</span>

                  {/* 배경 색상 선택 */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400">칠판 배경 색상</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {BOARD_BG_PRESETS.map((bg) => (
                        <button
                          key={bg.id}
                          type="button"
                          onClick={() => setBgColor(bg.hex)}
                          className={`w-7 h-7 rounded-full border-2 transition cursor-pointer relative hover:scale-115 ${
                            bgColor.toLowerCase() === bg.hex.toLowerCase()
                              ? 'ring-2 ring-[#5B44F2] scale-110 shadow-lg border-white'
                              : 'border-white/30'
                          }`}
                          style={{ backgroundColor: bg.hex }}
                          title={bg.name}
                        >
                          {bgColor.toLowerCase() === bg.hex.toLowerCase() && (
                            <Check
                              className={`w-3.5 h-3.5 absolute inset-0 m-auto stroke-[3] ${
                                bg.isDark ? 'text-white' : 'text-slate-900'
                              }`}
                            />
                          )}
                        </button>
                      ))}
                      <label className="relative cursor-pointer">
                        <input
                          type="color"
                          value={bgColor}
                          onChange={(e) => setBgColor(e.target.value)}
                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        />
                        <div
                          className="w-7 h-7 rounded-full border border-dashed border-slate-400 flex items-center justify-center hover:scale-115 transition bg-white/10"
                          title="배경색 직접 선택"
                        >
                          <Palette className="w-3.5 h-3.5 text-slate-300" />
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* 배경 레이아웃 선택 */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400">배경 레이아웃 패턴</span>
                    <div className="grid grid-cols-3 gap-1 p-1 bg-white/10 rounded-2xl text-xs">
                      {[
                        { id: 'blank' as const, label: '빈 화면' },
                        { id: 'dot' as const, label: '도트(Dot)' },
                        { id: 'line' as const, label: '라인(Line)' },
                      ].map((layout) => (
                        <button
                          key={layout.id}
                          type="button"
                          onClick={() => setBgLayout(layout.id)}
                          className={`py-1.5 rounded-xl font-black transition cursor-pointer text-center ${
                            bgLayout === layout.id
                              ? 'bg-[#5B44F2] text-white shadow-md'
                              : 'text-slate-300 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {layout.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 라인 간격 조절 슬라이더 */}
                  {bgLayout === 'line' && (
                    <div className="space-y-1 bg-white/5 p-2.5 rounded-2xl border border-white/10 animate-fade-in">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                        <span>줄 간격 조절</span>
                        <span className="font-mono text-[#5B44F2] font-black">{lineGap}px</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        step="5"
                        value={lineGap}
                        onChange={(e) => setLineGap(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#5B44F2]"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 말풍선 아래쪽 화살표 꼬리표 */}
              <div className="wb-pop-tail absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-900/95 dark:bg-slate-950/95 rotate-45 border-r border-b border-white/20 -z-10" />
            </div>
          )}

          {/* [1단계 vs 2단계 전환] */}
          {isCollapsed ? (
            // [1단계: 미니 퍽(Puck) 모드 - 접힌 상태]
            <button
              type="button"
              onClick={() => {
                setIsCollapsed(false);
                resetIdleTimer();
              }}
              style={{
                borderColor:
                  tool === 'eraser'
                    ? '#64748b'
                    : tool === 'tape'
                    ? tapeColor
                    : tool === 'text'
                    ? '#6366f1'
                    : color,
              }}
              className="wb-puck w-[52px] h-[52px] rounded-full bg-slate-900/90 dark:bg-slate-950/90 text-white backdrop-blur-xl border-3 shadow-2xl flex flex-col items-center justify-center gap-0.5 cursor-pointer hover:scale-110 active:scale-95 transition-all group"
              title="판서 툴바 펼치기"
            >
              {tool === 'pen' && penType === 'pen' && <PenTool className="w-4 h-4 text-white" />}
              {tool === 'pen' && penType === 'pencil' && <span className="text-xs">✏️</span>}
              {tool === 'pen' && penType === 'highlighter' && <span className="text-xs">🖍️</span>}
              {tool === 'eraser' && <Eraser className="w-4 h-4 text-rose-400" />}
              {tool === 'laser' && <Zap className="w-4 h-4 text-rose-400" />}
              {tool === 'select' && (
                <MousePointer2 className="w-4 h-4 text-[#5B44F2] fill-current" />
              )}
              {tool === 'hand' && <Hand className="w-4 h-4 text-emerald-400 fill-current" />}
              {tool === 'text' && <Type className="w-4 h-4 text-indigo-400" />}
              {tool === 'tape' && <Bandage className="w-4 h-4 text-amber-400" />}
              {tool === 'line' && <Minus className="w-4 h-4 rotate-45 text-white" />}
              {tool === 'rect' && <Square className="w-4 h-4 text-white" />}
              {tool === 'circle' && <Circle className="w-4 h-4 text-white" />}
              <span className="text-[9px] font-black tracking-tight leading-none text-slate-300">
                {tool === 'eraser'
                  ? `${eraserSize}px`
                  : tool === 'laser'
                  ? '레이저'
                  : tool === 'tape'
                  ? '테이프'
                  : tool === 'text'
                  ? '텍스트'
                  : tool === 'select'
                  ? '선택'
                  : tool === 'hand'
                  ? '이동'
                  : `${lineWidth}px`}
              </span>
            </button>
          ) : (
            // [2단계: 1줄 아코디언 캡슐 독 - 펼쳐진 상태 (MS 화이트보드 스타일 도구 순서)]
            <div className={`wb-dock ${isVerticalDock ? 'is-vertical flex-col' : ''} ${dockOnDark ? 'on-dark' : 'on-light'} flex items-center shrink-0 whitespace-nowrap`} data-wb-dock>
              {/* 1) [실행 취소 (Undo)] */}
              <button
                type="button"
                onClick={handleUndo}
                disabled={history.length === 0}
                className={`p-2 rounded-full transition flex items-center justify-center cursor-pointer shrink-0 ${
                  history.length > 0
                    ? 'text-slate-300 hover:text-white hover:bg-white/10 active:scale-95'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
                title="실행 취소 (Ctrl+Z)" data-tip="실행 취소"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="p-2 rounded-full transition flex items-center justify-center cursor-pointer shrink-0 text-slate-300 hover:text-white disabled:opacity-30"
                title="다시 실행 (Ctrl+Y)"
                data-tip="다시 실행"
              >
                <Redo2 className="w-4 h-4" />
              </button>

              {/* 구분선 */}
              <div className="h-4 w-[1px] bg-slate-700/80 mx-0.5 shrink-0" />

              {/* 2) [MS 화이트보드 화살표 선택 도구] */}
              <button
                type="button"
                onClick={() => {
                  setTool('select');
                  setActivePopover(null);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-black transition flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                  tool === 'select'
                    ? 'bg-[#5B44F2] text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title="선택 (Control+S) - 개체 클릭 또는 드래그하여 크기 조절 및 위치 이동" data-tip="선택"
              >
                <MousePointer2 className="w-3.5 h-3.5 fill-current stroke-[2.5]" />
                <span className="whitespace-nowrap">선택</span>
              </button>

              {/* 3) [MS 화이트보드 손 이동 도구 (Hand Tool)] */}
              <button
                type="button"
                onClick={() => {
                  if (floatingSelection) commitSelection();
                  setTool('hand');
                  setActivePopover(null);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-black transition flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                  tool === 'hand'
                    ? 'bg-[#5B44F2] text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title="이동 (스페이스바 또는 마우스 휠 클릭) - 판서영역을 자유롭게 드래그하여 위치 이동" data-tip="이동"
              >
                <Hand className="w-3.5 h-3.5 fill-current stroke-[2]" />
                <span className="whitespace-nowrap">이동</span>
              </button>

              {/* 구분선 */}
              <div className="h-4 w-[1px] bg-slate-700/80 mx-0.5 shrink-0" />

              {/* 4) [필기구 통합 버튼] (펜/연필/형광펜 + ▲) */}
              <button
                type="button"
                onClick={() => {
                  if (floatingSelection) commitSelection();
                  setTool('pen');
                  setActivePopover(activePopover === 'pen' ? null : 'pen');
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-black transition flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                  tool === 'pen'
                    ? 'bg-[#5B44F2] text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title="필기구 설정 (펜/연필/형광펜/굵기/색상)" data-tip="필기구 설정"
              >
                {penType === 'pen' ? <PenTool className="w-3.5 h-3.5" /> : penType === 'pencil' ? <span>✏️</span> : <span>🖍️</span>}
                <span className="whitespace-nowrap">{penType === 'pen' ? '펜' : penType === 'pencil' ? '연필' : '형광펜'}</span>
                <ChevronUp className={`w-3 h-3 transition-transform ${activePopover === 'pen' ? 'rotate-180' : ''}`} />
              </button>

              {/* 5) [지우개] */}
              <button
                type="button"
                onClick={() => {
                  if (floatingSelection) commitSelection();
                  setTool('eraser');
                  setActivePopover(null);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-black transition flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap ${
                  tool === 'eraser'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title="지우개 (테이프 클릭 시 삭제)" data-tip="지우개"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">지우개</span>
              </button>

              {/* 🔴 레이저 포인터 */}
              <button
                type="button"
                onClick={() => {
                  if (floatingSelection) commitSelection();
                  setTool('laser');
                  setActivePopover(null);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-black transition flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap ${
                  tool === 'laser' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title="레이저 포인터 (L) - 끌면 빨간 꼬리가 잠깐 보였다가 사라져요" data-tip="레이저 포인터"
              >
                <Zap className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">레이저</span>
              </button>

              {/* 4) [도형 통합 버튼] */}
              <button
                type="button"
                onClick={() => {
                  if (floatingSelection) commitSelection();
                  if (!isShapeTool(tool)) {
                    setTool('line');
                  }
                  setActivePopover(activePopover === 'shape' ? null : 'shape');
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-black transition flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                  isShapeTool(tool)
                    ? 'bg-[#5B44F2] text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title="도형 그리기 (직선 · 사각형 · 원 · 삼각형 · 직각삼각형 · 각도 · 3D)" data-tip="도형 그리기"
              >
                <ShapeIcon kind={isShapeTool(tool) ? (tool as any) : 'line'} size={15} />
                <span className="whitespace-nowrap">도형</span>
                <ChevronUp className={`w-3 h-3 transition-transform ${activePopover === 'shape' ? 'rotate-180' : ''}`} />
              </button>

              {/* 4-1) [🧊 3D 입체도형] */}
              <button
                type="button"
                onClick={() => (solid3d ? setSolid3d(null) : open3D())}
                className={`px-3 py-1.5 rounded-full text-xs font-black transition flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                  solid3d ? 'bg-sky-500 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title="3D 입체도형 (돌려 보기 · 전개도)" data-tip="3D 입체도형"
                data-wb-3d
              >
                <span className="text-[13px] leading-none">🧊</span>
                <span className="whitespace-nowrap">3D</span>
              </button>

              {/* 5) [T 텍스트] */}
              <button
                type="button"
                onClick={() => {
                  if (floatingSelection) commitSelection();
                  setTool('text');
                  setActivePopover(null);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-black transition flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap ${
                  tool === 'text'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title="텍스트 상자 입력 (클릭한 위치에 텍스트 생성)" data-tip="텍스트 상자 입력"
              >
                <Type className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">텍스트</span>
              </button>

              {/* 6) [🩹 테이프] */}
              <button
                type="button"
                onClick={() => {
                  if (floatingSelection) commitSelection();
                  setTool('tape');
                  setActivePopover(activePopover === 'tape' ? null : 'tape');
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-black transition flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                  tool === 'tape'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title="학습용 가리기 테이프 (드래그하여 가리기 / 클릭하여 보기)" data-tip="학습용 가리기 테이프"
              >
                <Bandage className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">테이프</span>
                <ChevronUp className={`w-3 h-3 transition-transform ${activePopover === 'tape' ? 'rotate-180' : ''}`} />
              </button>

              {/* 7) [🖼️ 이미지 불러오기] */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-full text-xs font-black transition flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap text-slate-300 hover:text-white hover:bg-white/10"
                title="내 PC에서 이미지/PDF 불러오기 (또는 Ctrl+V로 붙여넣기)" data-tip="내 PC에서 이미지/PDF 불러오기"
              >
                <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                <span className="whitespace-nowrap">이미지</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleImageUpload}
              />

              {/* 8) 구분선 */}
              <div className="h-4 w-[1px] bg-slate-700/80 mx-0.5 shrink-0" />

              {/* 8) [색상 & 굵기 요약 칩] */}
              <button
                type="button"
                onClick={() => {
                  setActivePopover(activePopover === 'pen' ? null : 'pen');
                }}
                className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold shrink-0 whitespace-nowrap"
                title="색상 및 굵기 변경" data-tip="색상 및 굵기 변경"
              >
                <span className="wb-size-dot" style={{ ['--wb-c' as any]: tool === 'eraser' ? '#94a3b8' : color, ['--wb-s' as any]: `${Math.min(26, Math.max(5, tool === 'eraser' ? eraserSize / 2.4 : penType === 'highlighter' ? lineWidth / 1.6 : lineWidth * 1.6))}px` }} />
                <span className="font-mono text-[11px] text-slate-200 whitespace-nowrap">
                  {tool === 'eraser' ? `${eraserSize}px` : `${lineWidth}px`}
                </span>
              </button>

              {/* 9) [배경 설정 버튼] */}
              <button
                type="button"
                onClick={() => {
                  setActivePopover(activePopover === 'background' ? null : 'background');
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-black transition flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                  activePopover === 'background'
                    ? 'bg-[#5B44F2] text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title="화이트보드 배경 설정 (색상, 도트, 라인, 간격)" data-tip="화이트보드 배경 설정"
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">배경</span>
                <ChevronUp className={`w-3 h-3 transition-transform ${activePopover === 'background' ? 'rotate-180' : ''}`} />
              </button>

              {/* 수업 도구: 자 · 각도기 · 가림막 · 스포트라이트 · 화면 저장 */}
              <div className="h-4 w-[1px] bg-slate-700/80 mx-0.5 shrink-0" />
              <button
                type="button"
                onClick={() => {
                  if (ruler) return setRuler(null);
                  const box = containerRef.current;
                  const cw = box?.clientWidth || 1200;
                  const chh = box?.clientHeight || 700;
                  setRuler({ x: BOARD_WIDTH / 2 - cw / 2 - panOffset.x + cw / 2 - 300, y: BOARD_HEIGHT / 2 - chh / 2 - panOffset.y + chh * 0.6, angle: 0, len: 600 });
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-black transition flex items-center gap-1 cursor-pointer shrink-0 ${ruler ? 'bg-[#5B44F2] text-white shadow-md' : 'text-slate-300'}`}
                title="자 - 자 위쪽 모서리를 따라 펜으로 그으면 곧은 선이 돼요"
                data-tip="자 (모서리 따라 곧게)"
              >
                <Ruler className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (protractor) return setProtractor(null);
                  const box = containerRef.current;
                  const cw = box?.clientWidth || 1200;
                  const chh = box?.clientHeight || 700;
                  setProtractor({ x: BOARD_WIDTH / 2 - panOffset.x, y: BOARD_HEIGHT / 2 - chh / 2 - panOffset.y + chh * 0.55, angle: 0, r: Math.min(220, cw / 5) });
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-black transition flex items-center gap-1 cursor-pointer shrink-0 ${protractor ? 'bg-[#5B44F2] text-white shadow-md' : 'text-slate-300'}`}
                title="각도기"
                data-tip="각도기"
              >
                <Gauge className="w-3.5 h-3.5" />
              </button>
              {(['iso', '3060'] as const).map((kind) => {
                const on = setSquares.some((t) => t.kind === kind);
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => {
                      if (on) return setSetSquares((l) => l.filter((t) => t.kind !== kind));
                      const box = containerRef.current;
                      const cw = box?.clientWidth || 1200;
                      const chh = box?.clientHeight || 700;
                      const vx = BOARD_WIDTH / 2 - cw / 2 - panOffset.x;
                      const vy = BOARD_HEIGHT / 2 - chh / 2 - panOffset.y;
                      setSetSquares((l) => [
                        ...l,
                        kind === 'iso'
                          ? { id: `sq-${Date.now()}`, kind, x: vx + cw * 0.14, y: vy + chh * 0.66, angle: 0, flip: false, size: 280 }
                          : { id: `sq-${Date.now()}`, kind, x: vx + cw * 0.5, y: vy + chh * 0.66, angle: 0, flip: false, size: 360 },
                      ]);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-black transition flex items-center gap-1 cursor-pointer shrink-0 ${on ? 'bg-[#5B44F2] text-white shadow-md' : 'text-slate-300'}`}
                    title={kind === 'iso' ? '삼각자 (45° 직각이등변삼각형) - 모서리를 따라 곧게 그어져요' : '삼각자 (30° · 60° 직각삼각형) - 모서리를 따라 곧게 그어져요'}
                    data-tip={kind === 'iso' ? '삼각자 45°' : '삼각자 30°·60°'}
                  >
                    <TriangleRight className="w-3.5 h-3.5" />
                    <span className="wb-keep wb-badge">{kind === 'iso' ? '45' : '30'}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  if (compass) return setCompass(null);
                  const box = containerRef.current;
                  const cw = box?.clientWidth || 1200;
                  const chh = box?.clientHeight || 700;
                  setCompass({ x: BOARD_WIDTH / 2 - panOffset.x, y: BOARD_HEIGHT / 2 - chh / 2 - panOffset.y + chh * 0.45, r: 150, angle: 0 });
                  setTool('pen');
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-black transition flex items-center gap-1 cursor-pointer shrink-0 ${compass ? 'bg-[#5B44F2] text-white shadow-md' : 'text-slate-300'}`}
                title="컴퍼스 - 연필 끝(✏️)을 돌리면 원 · 호가 그려져요"
                data-tip="컴퍼스"
              >
                <DraftingCompass className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCover((c) => (c?.mode === 'shade' ? null : { mode: 'shade', dir: 'down', reveal: 0 }))}
                className={`px-3 py-1.5 rounded-full text-xs font-black transition flex items-center gap-1 cursor-pointer shrink-0 ${cover?.mode === 'shade' ? 'bg-[#5B44F2] text-white shadow-md' : 'text-slate-300'}`}
                title="가림막 - 화면을 가리고 위에서부터 조금씩 열어요"
                data-tip="가림막 (차례로 열기)"
              >
                <Blinds className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const box = containerRef.current;
                  setCover((c) => (c?.mode === 'spot' ? null : { mode: 'spot', x: (box?.clientWidth || 1200) / 2, y: (box?.clientHeight || 700) / 2, r: 170 }));
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-black transition flex items-center gap-1 cursor-pointer shrink-0 ${cover?.mode === 'spot' ? 'bg-[#5B44F2] text-white shadow-md' : 'text-slate-300'}`}
                title="스포트라이트 - 동그란 부분만 보여요"
                data-tip="스포트라이트"
              >
                <Flashlight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={saveScreenPng}
                className="px-3 py-1.5 rounded-full text-xs font-black transition flex items-center gap-1 cursor-pointer shrink-0 text-slate-300"
                title="지금 화면을 PNG 그림으로 저장"
                data-tip="화면 PNG 저장"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>

              {/* 10) 구분선 */}
              <div className="h-4 w-[1px] bg-slate-700/80 mx-0.5 shrink-0" />

              {/* 📄 슬라이드 페이지네이션 컨트롤러 */}
              <div className="wb-pages flex items-center bg-white/10 rounded-full px-1.5 py-0.5 gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSwitchSlide(currentSlideIndex - 1)}
                  disabled={currentSlideIndex <= 0}
                  className="p-1 rounded-full hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-transparent text-slate-200 transition cursor-pointer"
                  title="이전 슬라이드" data-tip="이전 슬라이드"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span
                  onClick={() => setActivePopover(activePopover === 'gallery' ? null : 'gallery')}
                  className="wb-keep text-[11px] font-bold px-1.5 py-0.5 rounded-md hover:bg-white/15 transition cursor-pointer text-slate-100 whitespace-nowrap"
                  title="판서 보관함 열기" data-tip="판서 보관함 열기"
                >
                  {currentSlideIndex + 1} / {slides.length}
                </span>
                <button
                  type="button"
                  onClick={() => handleSwitchSlide(currentSlideIndex + 1)}
                  disabled={currentSlideIndex >= slides.length - 1}
                  className="p-1 rounded-full hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-transparent text-slate-200 transition cursor-pointer"
                  title="다음 슬라이드" data-tip="다음 슬라이드"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleAddNewSlide}
                  className="p-1 rounded-full hover:bg-indigo-600 text-indigo-300 hover:text-white transition cursor-pointer"
                  title="새 슬라이드 추가 (+)" data-tip="새 슬라이드 추가"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 📁 판서 보관함 버튼 */}
              <button
                type="button"
                onClick={() => setActivePopover(activePopover === 'gallery' ? null : 'gallery')}
                className={`px-2.5 py-1.5 rounded-full text-xs font-black transition flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                  activePopover === 'gallery'
                    ? 'bg-[#5B44F2] text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title="판서 보관함 (슬라이드 목록, PNG 다운로드, 삭제)" data-tip="판서 보관함"
              >
                <FolderArchive className="w-3.5 h-3.5 text-amber-300" />
                <span className="whitespace-nowrap">보관함</span>
              </button>

              {/* 구분선 */}
              <div className="h-4 w-[1px] bg-slate-700/80 mx-0.5 shrink-0" />

              {/* 11) [비우기(전체 삭제)] */}
              <button
                type="button"
                onClick={clearCanvas}
                className="px-3 py-1 rounded-full bg-[#FFE4E6] hover:bg-rose-200 text-[#F43F5E] text-xs font-black transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 shrink-0 whitespace-nowrap"
                title="칠판 전체 지우기 (그림, 텍스트, 테이프)" data-tip="칠판 전체 지우기"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">비우기</span>
              </button>

              {/* 12) 구분선 */}
              <div className="h-4 w-[1px] bg-slate-700/80 mx-0.5 shrink-0" />

              {/* 13) [위치 스냅 변경], [고정 핀(📌)], [접기(✕)] */}
              <button
                type="button"
                onClick={cyclePosition}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
                title={`도구 막대 위치: ${posLabel} (누르면 아래 → 오른쪽 → 왼쪽 순서로 옮겨져요)`}
                data-tip={`위치 옮기기 (지금: ${posLabel})`}
              >
                {toolbarPosition === 'left' ? (
                  <AlignLeft className="w-3.5 h-3.5 text-indigo-400" />
                ) : toolbarPosition === 'right' ? (
                  <AlignRight className="w-3.5 h-3.5 text-indigo-400" />
                ) : (
                  <AlignCenter className="w-3.5 h-3.5 text-indigo-400" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsPinned(!isPinned)}
                className={`p-1.5 rounded-full transition cursor-pointer shrink-0 ${
                  isPinned
                    ? 'bg-amber-400/20 text-amber-400 font-bold ring-1 ring-amber-400/50'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
                title={isPinned ? '고정 핀 해제 (필기 시 자동 축소)' : '툴바 고정 핀 꽂기 (필기 중에도 유지)'}
                data-tip={isPinned ? '고정 풀기' : '펼친 채로 고정'}
              >
                <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsCollapsed(true);
                  setActivePopover(null);
                }}
                className="p-1.5 rounded-full text-slate-400 hover:text-rose-400 hover:bg-white/10 transition cursor-pointer shrink-0"
                title="미니 퍽으로 접기" data-tip="미니 퍽으로 접기"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
