import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

/**
 * 🧊 판서 모드 · 입체도형 3D 무대
 * - 정육면체 · 직육면체 · 각기둥 · 각뿔 · 원기둥 · 원뿔 · 구
 * - 끌어서 돌리기 · 휠로 확대 · 자동 회전
 * - 숨은 모서리 점선 · 꼭짓점 표시 · 면 색칠 / 투명
 * - 전개도 펼치기 (각기둥 · 각뿔 · 원기둥) — 접은 모양 ↔ 펼친 모양을 천천히
 * - [✏️ 판서] 모드에서는 입체도형 위에 펜으로 바로 쓸 수 있어요 (판서 캔버스가 위로)
 */

export type SolidKind = 'cube' | 'cuboid' | 'tri-prism' | 'pent-prism' | 'hex-prism' | 'tri-pyr' | 'sq-pyr' | 'cylinder' | 'cone' | 'sphere';
export interface Solid3DBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const SOLIDS: { id: SolidKind; label: string; emoji: string; group: '각기둥' | '각뿔' | '둥근 입체' }[] = [
  { id: 'cube', label: '정육면체', emoji: '🎲', group: '각기둥' },
  { id: 'cuboid', label: '직육면체', emoji: '📦', group: '각기둥' },
  { id: 'tri-prism', label: '삼각기둥', emoji: '🔺', group: '각기둥' },
  { id: 'pent-prism', label: '오각기둥', emoji: '⬟', group: '각기둥' },
  { id: 'hex-prism', label: '육각기둥', emoji: '⬢', group: '각기둥' },
  { id: 'tri-pyr', label: '삼각뿔', emoji: '△', group: '각뿔' },
  { id: 'sq-pyr', label: '사각뿔', emoji: '🔼', group: '각뿔' },
  { id: 'cylinder', label: '원기둥', emoji: '🥫', group: '둥근 입체' },
  { id: 'cone', label: '원뿔', emoji: '🍦', group: '둥근 입체' },
  { id: 'sphere', label: '구', emoji: '⚽', group: '둥근 입체' },
];

const INFO: Record<SolidKind, { parts: [string, string][]; note: string }> = {
  cube: { parts: [['면', '6'], ['모서리', '12'], ['꼭짓점', '8']], note: '모든 면이 똑같은 정사각형' },
  cuboid: { parts: [['면', '6'], ['모서리', '12'], ['꼭짓점', '8']], note: '직사각형 6개 · 마주 보는 면끼리 합동' },
  'tri-prism': { parts: [['면', '5'], ['모서리', '9'], ['꼭짓점', '6']], note: '밑면 2개(삼각형)는 평행 · 합동, 옆면은 직사각형' },
  'pent-prism': { parts: [['면', '7'], ['모서리', '15'], ['꼭짓점', '10']], note: '밑면 2개(오각형) · 옆면 5개' },
  'hex-prism': { parts: [['면', '8'], ['모서리', '18'], ['꼭짓점', '12']], note: '밑면 2개(육각형) · 옆면 6개' },
  'tri-pyr': { parts: [['면', '4'], ['모서리', '6'], ['꼭짓점', '4']], note: '밑면 1개(삼각형) · 옆면은 삼각형 3개' },
  'sq-pyr': { parts: [['면', '5'], ['모서리', '8'], ['꼭짓점', '5']], note: '밑면 1개(사각형) · 옆면은 삼각형 4개' },
  cylinder: { parts: [['밑면', '2'], ['옆면', '1 (굽은 면)'], ['꼭짓점', '없음']], note: '펼치면 옆면은 직사각형, 밑면은 원 2개' },
  cone: { parts: [['밑면', '1'], ['옆면', '1 (굽은 면)'], ['꼭짓점', '1 (원뿔의 꼭짓점)']], note: '펼치면 옆면은 부채꼴' },
  sphere: { parts: [['중심', '1'], ['반지름', '모두 같아요'], ['꼭짓점', '없음']], note: '어느 방향에서 봐도 원 모양' },
};

const FACE_COLORS = ['#93c5fd', '#fca5a5', '#86efac', '#fcd34d', '#c4b5fd', '#f9a8d4', '#67e8f9', '#fdba74'];

type V3 = [number, number, number];
interface Model {
  faces: { pts: V3[]; color: string }[];
  /** 곡면 등 직접 만든 삼각형 */
  meshes: { positions: number[]; color: string }[];
  edges: [V3, V3][];
  verts: V3[];
  height: number;
  span: number;
  /** 윗면 모서리 (기준 변 고르기용) */
  hingeEdges?: [V3, V3][];
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const UP: V3 = [0, 1, 0];
const ngon = (n: number, r: number, rot = 0): V3[] => Array.from({ length: n }, (_, i) => {
  const a = rot + (i / n) * Math.PI * 2;
  return [r * Math.cos(a), 0, -r * Math.sin(a)] as V3; // 위에서 보면 시계 반대 방향
});
const rectBase = (w: number, d: number): V3[] => [
  [-w / 2, 0, d / 2],
  [w / 2, 0, d / 2],
  [w / 2, 0, -d / 2],
  [-w / 2, 0, -d / 2],
];
const centroid = (P: V3[]): V3 => mul(P.reduce((s, p) => add(s, p), [0, 0, 0] as V3), 1 / P.length);
const edgeFrame = (P: V3[], i: number) => {
  const A = P[i];
  const B = P[(i + 1) % P.length];
  const x = norm(sub(B, A));
  let n: V3 = [x[2], 0, -x[0]];
  const C = centroid(P);
  if (dot(n, sub(A, C)) < 0) n = mul(n, -1);
  return { A, B, x, n, L: Math.hypot(B[0] - A[0], B[2] - A[2]) };
};
const dirAt = (n: V3, phi: number): V3 => add(mul(n, Math.cos(phi)), mul(UP, Math.sin(phi)));

/** 각기둥 (t: 0 접힘 → 1 펼침) */
function prism(P: V3[], H: number, t: number, hinge = 0): Model {
  const faces: Model['faces'] = [{ pts: P.slice().reverse(), color: FACE_COLORS[0] }];
  const phi = (Math.PI / 2) * (1 - t);
  P.forEach((_, i) => {
    const { A, B, n } = edgeFrame(P, i);
    const d = dirAt(n, phi);
    faces.push({ pts: [A, B, add(B, mul(d, H)), add(A, mul(d, H))], color: FACE_COLORS[(i % (FACE_COLORS.length - 2)) + 2] });
  });
  // 윗면은 고른 옆면(hinge)의 위쪽 모서리에 붙어서 함께 펼쳐져요
  const f0 = edgeFrame(P, ((hinge % P.length) + P.length) % P.length);
  const T0 = add(f0.A, mul(dirAt(f0.n, phi), H));
  const d2 = dirAt(f0.n, Math.PI * (1 - t));
  const top = P.map((p) => {
    const r = sub(p, f0.A);
    const u = dot(r, f0.x);
    const w = -dot(r, f0.n);
    return add(add(T0, mul(f0.x, u)), mul(d2, w));
  });
  faces.push({ pts: top, color: FACE_COLORS[1] });
  const m = finish(faces, [], H, P);
  // 접힌 상태 기준 윗면 모서리 (고를 수 있는 변)
  m.hingeEdges = P.map((p, i) => [add(p, mul(UP, H)), add(P[(i + 1) % P.length], mul(UP, H))] as [V3, V3]);
  return m;
}

/** 각뿔 (꼭짓점은 밑면 중심 위) */
function pyramid(P: V3[], h: number, t: number): Model {
  const faces: Model['faces'] = [{ pts: P.slice().reverse(), color: FACE_COLORS[0] }];
  const C = centroid(P);
  P.forEach((_, i) => {
    const { A, B, x, n } = edgeFrame(P, i);
    const r = sub(C, A);
    const u = dot(r, x);
    const dIn = -dot(r, n);
    const s = Math.hypot(h, dIn);
    const phiF = Math.PI - Math.atan2(h, dIn);
    const d = dirAt(n, phiF * (1 - t));
    faces.push({ pts: [A, B, add(add(A, mul(x, u)), mul(d, s))], color: FACE_COLORS[(i % (FACE_COLORS.length - 2)) + 2] });
  });
  return finish(faces, [], h, P);
}

function finish(faces: Model['faces'], meshes: Model['meshes'], height: number, base: V3[], extraEdges: [V3, V3][] = []): Model {
  const key = (p: V3) => p.map((v) => v.toFixed(3)).join(',');
  const ek = new Set<string>();
  const edges: [V3, V3][] = [];
  const vk = new Map<string, V3>();
  faces.forEach((f) => {
    f.pts.forEach((p, i) => {
      const q = f.pts[(i + 1) % f.pts.length];
      const k1 = key(p) + '|' + key(q);
      const k2 = key(q) + '|' + key(p);
      if (!ek.has(k1) && !ek.has(k2)) {
        ek.add(k1);
        edges.push([p, q]);
      }
      vk.set(key(p), p);
    });
  });
  const all = [...faces.flatMap((f) => f.pts), ...base];
  const span = Math.max(...all.map((p) => Math.hypot(p[0], p[2])), height);
  return { faces, meshes, edges: [...edges, ...extraEdges], verts: [...vk.values()], height, span };
}

/** 원기둥: 옆면이 데굴데굴 풀리며 직사각형이 되고, 두 밑면은 위아래로 펼쳐져요 */
function cylinder(R: number, H: number, t: number): Model {
  const seg = 72;
  const L = Math.PI * 2 * R;
  const rho = R / Math.max(1 - t, 1e-4);
  const at = (s: number, y: number): V3 => {
    if (t > 0.9999) return [s - L / 2, y, 0];
    const a = (s - L / 2) / rho;
    return [rho * Math.sin(a), y, -rho * (1 - Math.cos(a))];
  };
  const pos: number[] = [];
  const bot: V3[] = [];
  const topL: V3[] = [];
  for (let i = 0; i <= seg; i++) {
    const s = (i / seg) * L;
    bot.push(at(s, 0));
    topL.push(at(s, H));
  }
  for (let i = 0; i < seg; i++) {
    const a = bot[i], b = bot[i + 1], c = topL[i + 1], d = topL[i];
    pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  }
  // 밑면 원: (0,y,0) 을 지나는 x축을 경첩으로 회전
  const beta = (Math.PI / 2) * t;
  const disc = (yHinge: number, sign: 1 | -1): V3[] =>
    Array.from({ length: seg + 1 }, (_, i) => {
      const a = (i / seg) * Math.PI * 2;
      const lx = R * Math.cos(a);
      const lz = R * Math.sin(a) - R; // 접힌 상태: 중심 (0, y, -R)
      // x축 둘레로 sign*beta 회전
      const yy = yHinge + sign * (-lz) * Math.sin(beta);
      const zz = lz * Math.cos(beta);
      return [lx, yy, zz] as V3;
    });
  const capT = disc(H, 1);
  const capB = disc(0, -1);
  const meshes: Model['meshes'] = [{ positions: pos, color: FACE_COLORS[2] }];
  const fan = (ring: V3[], color: string, flip: boolean) => {
    const c = centroid(ring.slice(0, -1));
    const p: number[] = [];
    for (let i = 0; i < seg; i++) flip ? p.push(...c, ...ring[i + 1], ...ring[i]) : p.push(...c, ...ring[i], ...ring[i + 1]);
    meshes.push({ positions: p, color });
  };
  fan(capT, FACE_COLORS[1], false);
  fan(capB, FACE_COLORS[0], true);
  const ring = (pts: V3[]) => pts.slice(0, -1).map((p, i) => [p, pts[i + 1]] as [V3, V3]);
  const edges: [V3, V3][] = [...ring(capT), ...ring(capB)];
  if (t > 0.02) {
    edges.push(...ring(bot), ...ring(topL), [bot[0], topL[0]], [bot[seg], topL[seg]]);
  }
  return { faces: [], meshes, edges, verts: [], height: H, span: Math.max(R, (L / 2) * t + R, H) };
}

function cone(R: number, h: number): Model {
  const seg = 72;
  const apex: V3 = [0, h, 0];
  const ring = ngon(seg, R).concat([ngon(seg, R)[0]]);
  const pos: number[] = [];
  const base: number[] = [];
  for (let i = 0; i < seg; i++) {
    pos.push(...ring[i], ...ring[i + 1], ...apex);
    base.push(0, 0, 0, ...ring[i + 1], ...ring[i]);
  }
  const edges = ring.slice(0, -1).map((p, i) => [p, ring[i + 1]] as [V3, V3]);
  return { faces: [], meshes: [{ positions: pos, color: FACE_COLORS[3] }, { positions: base, color: FACE_COLORS[0] }], edges, verts: [apex], height: h, span: Math.max(R, h) };
}

function sphere(R: number): Model {
  const g = new THREE.SphereGeometry(R, 48, 32);
  const nonIdx = g.toNonIndexed();
  const arr = Array.from(nonIdx.getAttribute('position').array as Float32Array).map((v, i) => (i % 3 === 1 ? v + R : v));
  g.dispose();
  nonIdx.dispose();
  const seg = 72;
  const eq = ngon(seg, R).map((p) => [p[0], R, p[2]] as V3);
  const edges = eq.map((p, i) => [p, eq[(i + 1) % seg]] as [V3, V3]);
  const C: V3 = [0, R, 0];
  edges.push([C, [R, R, 0]]);
  return { faces: [], meshes: [{ positions: arr, color: FACE_COLORS[4] }], edges, verts: [C], height: 2 * R, span: R };
}

function buildModel(kind: SolidKind, t: number, hinge = 0): Model {
  switch (kind) {
    case 'cube':
      return prism(rectBase(2, 2), 2, t, hinge);
    case 'cuboid':
      return prism(rectBase(2.8, 1.6), 1.5, t, hinge);
    case 'tri-prism':
      return prism(ngon(3, 1.25, Math.PI / 2), 2.1, t, hinge);
    case 'pent-prism':
      return prism(ngon(5, 1.15, Math.PI / 2), 1.8, t, hinge);
    case 'hex-prism':
      return prism(ngon(6, 1.1), 1.6, t, hinge);
    case 'tri-pyr':
      return pyramid(ngon(3, 1.35, Math.PI / 2), 1.9, t);
    case 'sq-pyr':
      return pyramid(rectBase(2.1, 2.1), 1.9, t);
    case 'cylinder':
      return cylinder(0.95, 2.1, t);
    case 'cone':
      return cone(1.1, 2.2);
    case 'sphere':
      return sphere(1.25);
  }
}
export const canUnfold = (k: SolidKind) => k !== 'cone' && k !== 'sphere';
export const canPickHinge = (k: SolidKind) => k === 'cube' || k === 'cuboid' || k.endsWith('prism');


interface Opts {
  color: boolean;
  clear: boolean;
  hidden: boolean;
  dots: boolean;
  spin: boolean;
}

const PANEL_W = 232;

export const Solid3DStage: React.FC<{
  box: Solid3DBox;
  onBox: (b: Solid3DBox) => void;
  onClose: () => void;
  writeMode: boolean;
  onWriteMode: (w: boolean) => void;
  isLight: boolean;
}> = ({ box, onBox, onClose, writeMode, onWriteMode, isLight }) => {
  const [kind, setKind] = useState<SolidKind>('cube');
  const [t, setT] = useState(0);
  const [hinge, setHinge] = useState(0);
  const [pickHinge, setPickHinge] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [ddOpen, setDdOpen] = useState(false);
  const [opts, setOpts] = useState<Opts>({ color: true, clear: true, hidden: true, dots: true, spin: false });
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoverEdge, setHoverEdge] = useState<number | null>(null);
  const [cutting, setCutting] = useState(false);
  const downAt = useRef<{ x: number; y: number } | null>(null);
  const three = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    group: THREE.Group;
    raf: number;
    lineMats: LineMaterial[];
    cutMat: LineMaterial | null;
  } | null>(null);
  const animRef = useRef<number | null>(null);
  const lastT = useRef(-1);
  const lastKind = useRef<SolidKind | null>(null);
  const modelRef = useRef<Model | null>(null);
  const panelW = panelOpen ? PANEL_W : 0;
  const panelWRef = useRef(panelW);
  panelWRef.current = panelW;

  // ── 3D 준비 ──
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, el.clientWidth / el.clientHeight, 0.1, 200);
    camera.position.set(5.2, 4.2, 6.4);
    scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const dl = new THREE.DirectionalLight(0xffffff, 1.4);
    dl.position.set(4, 8, 6);
    scene.add(dl);
    const dl2 = new THREE.DirectionalLight(0xffffff, 0.5);
    dl2.position.set(-6, 3, -4);
    scene.add(dl2);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3;
    controls.maxDistance = 30;
    controls.autoRotateSpeed = 2.2;
    controls.target.set(0, 1, 0);
    const group = new THREE.Group();
    scene.add(group);
    const st = { renderer, scene, camera, controls, group, raf: 0, lineMats: [] as LineMaterial[], cutMat: null as LineMaterial | null };
    three.current = st;
    const loop = () => {
      controls.update();
      // ✂️ 자르는 선이 흐르듯 움직여요
      if (st.cutMat) st.cutMat.dashOffset -= 0.012;
      renderer.render(scene, camera);
      st.raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(st.raf);
      controls.dispose();
      group.traverse((o: any) => {
        o.geometry?.dispose?.();
        o.material?.dispose?.();
      });
      renderer.dispose();
      renderer.domElement.remove();
      three.current = null;
    };
  }, []);

  // ── 크기 · 왼쪽 메뉴 폭에 맞추기 (메뉴가 가리는 만큼 도형을 오른쪽으로) ──
  useEffect(() => {
    const st = three.current;
    const el = mountRef.current;
    if (!st || !el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    st.renderer.setSize(w, h);
    st.camera.aspect = w / Math.max(1, h);
    st.camera.setViewOffset(w, h, -panelW / 2, 0, w, h);
    st.camera.updateProjectionMatrix();
    st.lineMats.forEach((m) => m.resolution.set(w, h));
  }, [box.w, box.h, panelW]);

  useEffect(() => {
    if (three.current) three.current.controls.autoRotate = opts.spin;
  }, [opts.spin]);

  const model = useMemo(() => buildModel(kind, t, hinge), [kind, t, hinge]);
  const canPick = canPickHinge(kind) && t < 0.04 && !cutting && !playing;
  modelRef.current = canPick ? model : null;

  /** 화면 좌표(px)에서 가장 가까운 윗면 모서리 번호 (22px 안쪽만) */
  const edgeAt = (clientX: number, clientY: number): number | null => {
    const st = three.current;
    const el = mountRef.current;
    const m = modelRef.current;
    if (!st || !el || !m?.hingeEdges) return null;
    const r = el.getBoundingClientRect();
    const px = clientX - r.left;
    const py = clientY - r.top;
    const v = new THREE.Vector3();
    const toScr = (q: V3) => {
      v.set(q[0], q[1], q[2]).applyMatrix4(st.group.matrixWorld).project(st.camera);
      return { x: ((v.x + 1) / 2) * r.width, y: ((1 - v.y) / 2) * r.height };
    };
    let best: number | null = null;
    let bd = 22;
    m.hingeEdges.forEach(([a, b], i) => {
      const A = toScr(a);
      const B = toScr(b);
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const L2 = dx * dx + dy * dy || 1;
      const k = Math.max(0, Math.min(1, ((px - A.x) * dx + (py - A.y) * dy) / L2));
      const d = Math.hypot(px - (A.x + dx * k), py - (A.y + dy * k));
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  };
  /** ✂️ 고른 변을 기준으로 자르고 → 펼치기 */
  const cutAndUnfold = (i: number) => {
    setHinge(i);
    setPickHinge(false);
    setHoverEdge(null);
    setPlaying(false);
    setCutting(true);
    window.setTimeout(() => {
      setCutting(false);
      animateTo(1, 2400);
    }, 1100);
  };
  const onGlDown = (e: React.PointerEvent) => {
    downAt.current = { x: e.clientX, y: e.clientY };
  };
  const onGlMove = (e: React.PointerEvent) => {
    if (e.buttons || !canPick) {
      if (hoverEdge != null && !canPick) setHoverEdge(null);
      return;
    }
    const i = edgeAt(e.clientX, e.clientY);
    if (i !== hoverEdge) setHoverEdge(i);
  };
  const onGlUp = (e: React.PointerEvent) => {
    const d = downAt.current;
    downAt.current = null;
    if (!d || !canPick || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) return;
    const i = edgeAt(e.clientX, e.clientY);
    if (i != null) cutAndUnfold(i);
  };

  // ── 모델 다시 그리기 ──
  useEffect(() => {
    const st = three.current;
    const el = mountRef.current;
    if (!st || !el) return;
    const { group } = st;
    group.traverse((o: any) => {
      if (o !== group) {
        o.geometry?.dispose?.();
        o.material?.dispose?.();
      }
    });
    group.clear();
    st.lineMats = [];
    const ink = isLight ? 0x1e293b : 0xe2e8f0;
    const faceMat = (color: string) =>
      new THREE.MeshLambertMaterial({
        color: opts.color ? color : isLight ? '#e2e8f0' : '#475569',
        transparent: opts.clear,
        opacity: opts.clear ? 0.42 : 0.96,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
        depthWrite: true,
      });
    model.faces.forEach((f) => {
      const p: number[] = [];
      for (let i = 1; i < f.pts.length - 1; i++) p.push(...f.pts[0], ...f.pts[i], ...f.pts[i + 1]);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
      g.computeVertexNormals();
      group.add(new THREE.Mesh(g, faceMat(f.color)));
    });
    model.meshes.forEach((m) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(m.positions, 3));
      g.computeVertexNormals();
      group.add(new THREE.Mesh(g, faceMat(m.color)));
    });
    const segs: number[] = [];
    model.edges.forEach(([a, b]) => segs.push(...a, ...b));
    if (segs.length) {
      const mk = (hidden: boolean) => {
        const geo = new LineSegmentsGeometry().setPositions(segs);
        const mat = new LineMaterial({ color: ink, linewidth: hidden ? 2 : 3.2, dashed: hidden, dashSize: 0.12, gapSize: 0.09, transparent: hidden, opacity: hidden ? 0.75 : 1, depthTest: true });
        if (hidden) mat.depthFunc = THREE.GreaterDepth;
        mat.resolution.set(el.clientWidth, el.clientHeight);
        st.lineMats.push(mat);
        const line = new LineSegments2(geo, mat);
        if (hidden) line.computeLineDistances();
        line.renderOrder = hidden ? 2 : 3;
        return line;
      };
      group.add(mk(false));
      if (opts.hidden) group.add(mk(true));
    }
    st.cutMat = null;
    const thick = (pts: number[], color: number, width: number, order: number, dashed = false) => {
      const geo = new LineSegmentsGeometry().setPositions(pts);
      const mat = new LineMaterial({ color, linewidth: width, depthTest: false, dashed, dashSize: 0.16, gapSize: 0.1, transparent: true });
      mat.resolution.set(el.clientWidth, el.clientHeight);
      st.lineMats.push(mat);
      const line = new LineSegments2(geo, mat);
      if (dashed) line.computeLineDistances();
      line.renderOrder = order;
      group.add(line);
      return mat;
    };
    if (model.hingeEdges && canPickHinge(kind)) {
      const he = model.hingeEdges;
      const folded = t < 0.04;
      if (folded && cutting) {
        // ✂️ 자르는 선: 고른 변을 뺀 윗면 모서리 + 세로 모서리 (빨간 점선이 흘러요)
        const cut: number[] = [];
        he.forEach(([a, b], i) => {
          if (i !== hinge) cut.push(...a, ...b);
          cut.push(a[0], 0, a[2], ...a);
        });
        st.cutMat = thick(cut, 0xef4444, 6, 7, true);
        thick([...he[hinge][0], ...he[hinge][1]], 0x2563eb, 9, 8);
      } else if (folded && !playing) {
        // 고를 수 있는 윗면 모서리 (옅은 주황) · 마우스를 올린 변 (진한 주황)
        const all: number[] = [];
        he.forEach(([a, b], i) => {
          if (i !== hoverEdge) all.push(...a, ...b);
        });
        if (all.length) thick(all, 0xfb923c, pickHinge ? 5 : 3.5, 6).opacity = pickHinge ? 0.95 : 0.6;
        if (hoverEdge != null && he[hoverEdge]) thick([...he[hoverEdge][0], ...he[hoverEdge][1]], 0xf97316, 10, 8);
      } else if (!folded) {
        // 펼치는 중: 기준 변(윗면이 붙어 있는 변)을 파랗게
        const f = model.faces[model.faces.length - 1];
        const n = f.pts.length;
        thick([...f.pts[hinge % n], ...f.pts[(hinge + 1) % n]], 0x2563eb, 7, 6);
      }
    }
    if (opts.dots) {
      const sg = new THREE.SphereGeometry(0.075, 16, 12);
      const sm = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      model.verts.forEach((v) => {
        const sp = new THREE.Mesh(sg, sm);
        sp.position.set(...v);
        sp.renderOrder = 4;
        group.add(sp);
      });
    }
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(model.span * 1.25 + 0.4, 48),
      new THREE.MeshBasicMaterial({ color: isLight ? 0x0f172a : 0x000000, transparent: true, opacity: isLight ? 0.05 : 0.18, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.005;
    group.add(shadow);
    // 펼친 전개도가 가운데 오도록 · 펼칠수록 조금 멀리서
    const xs: number[] = [];
    const zs: number[] = [];
    model.faces.forEach((f) => f.pts.forEach((q) => (xs.push(q[0]), zs.push(q[2]))));
    model.meshes.forEach((m) => {
      for (let i = 0; i < m.positions.length; i += 3) (xs.push(m.positions[i]), zs.push(m.positions[i + 2]));
    });
    const cx = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 0;
    const cz = zs.length ? (Math.min(...zs) + Math.max(...zs)) / 2 : 0;
    group.position.set(-cx, 0, -cz);
    group.updateMatrixWorld();
    st.controls.target.set(0, (model.height / 2) * (1 - t), 0);
    if (lastT.current !== t || lastKind.current !== kind) {
      const extent = xs.length ? Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs), model.height) : model.height;
      const want = Math.max(6.8, extent * 1.65);
      const dir = st.camera.position.clone().sub(st.controls.target).normalize();
      st.camera.position.copy(st.controls.target.clone().add(dir.multiplyScalar(want)));
      lastT.current = t;
      lastKind.current = kind;
    }
  }, [model, opts.color, opts.clear, opts.hidden, opts.dots, isLight, pickHinge, hoverEdge, cutting, playing]);

  // 도형 바꾸면 접힌 상태로
  useEffect(() => {
    setT(0);
    setHinge(0);
    setPlaying(false);
    setPickHinge(false);
  }, [kind]);

  const stopAnim = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = null;
  };
  const animateTo = (to: number, dur = 1800) => {
    stopAnim();
    setPlaying(false);
    const from = t;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      setT(from + (to - from) * e);
      if (p < 1) animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
  };
  // ▶ 자동 재생: 접힘 → 펼침 → 잠깐 멈춤 → 접힘 … 반복
  useEffect(() => {
    if (!playing) return;
    stopAnim();
    const UNF = 2600;
    const HOLD = 1300;
    const cycle = 2 * (UNF + HOLD);
    const t0 = performance.now();
    const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
    const step = (now: number) => {
      const k = (now - t0) % cycle;
      let v: number;
      if (k < UNF) v = ease(k / UNF);
      else if (k < UNF + HOLD) v = 1;
      else if (k < 2 * UNF + HOLD) v = 1 - ease((k - UNF - HOLD) / UNF);
      else v = 0;
      setT(v);
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return stopAnim;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);
  useEffect(() => stopAnim, []);

  const view = (v: 'iso' | 'front' | 'top' | 'side') => {
    const st = three.current;
    if (!st) return;
    const d = Math.max(8, st.camera.position.distanceTo(st.controls.target));
    const tg = st.controls.target.clone();
    const dirs: Record<string, THREE.Vector3> = {
      iso: new THREE.Vector3(5.2, 3.2, 6.4),
      front: new THREE.Vector3(0, 0.0001, 1),
      side: new THREE.Vector3(1, 0.0001, 0),
      top: new THREE.Vector3(0.0001, 1, 0.0001),
    };
    st.camera.position.copy(tg.add(dirs[v].normalize().multiplyScalar(d)));
    st.controls.update();
  };

  const dragBox = (e: React.PointerEvent, mode: 'move' | 'size') => {
    e.preventDefault();
    e.stopPropagation();
    const sx = e.clientX;
    const sy = e.clientY;
    const b0 = { ...box };
    const mv = (ev: PointerEvent) => {
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      if (mode === 'move') onBox({ ...b0, x: b0.x + dx, y: b0.y + dy });
      else onBox({ ...b0, w: Math.max(520, b0.w + dx), h: Math.max(320, b0.h + dy) });
    };
    const up = () => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
  };

  const info = INFO[kind];
  const cur = SOLIDS.find((s) => s.id === kind)!;
  const tog = (k: keyof Opts, icon: string, text: string) => (
    <button type="button" className={`s3d-tog ${opts[k] ? 'is-on' : ''}`} onClick={() => setOpts((o) => ({ ...o, [k]: !o[k] }))} data-s3d-opt={k} aria-pressed={opts[k]}>
      <span>{icon}</span>
      {text}
    </button>
  );

  return (
    <>
      {/* 3D 화면 (판서 모드에서는 판서 캔버스 아래로) */}
      <div className={`s3d-view ${writeMode ? 'is-write' : ''} ${isLight ? 'is-light' : 'is-dark'}`} style={{ left: box.x, top: box.y, width: box.w, height: box.h, zIndex: writeMode ? 5 : 26 }} data-s3d-view>
        <div
          ref={mountRef}
          className={`s3d-gl ${hoverEdge != null ? 'is-pick' : ''}`}
          onPointerDown={onGlDown}
          onPointerMove={onGlMove}
          onPointerUp={onGlUp}
          onPointerLeave={() => hoverEdge != null && setHoverEdge(null)}
        />
        {canPickHinge(kind) && t < 0.04 && !playing && (
          <div className={`s3d-tip ${cutting ? 'is-cut' : pickHinge ? 'is-on' : ''}`} data-s3d-tip>
            {cutting ? '✂️ 고른 변만 남기고 모서리를 자르는 중…' : '✂️ 윗면의 모서리를 눌러 보세요 — 그 변을 기준으로 잘라서 펼쳐져요'}
          </div>
        )}
      </div>

      {/* 위 막대: 옮기기 · 도형 고르기(드롭다운) · 돌리기/판서 · 닫기 */}
      <div className="s3d-bar" style={{ left: box.x + 8, top: box.y + 8, width: box.w - 16, transform: 'none' }} data-s3d-bar>
        <span className="s3d-grip" onPointerDown={(e) => dragBox(e, 'move')} title="끌어서 옮기기">
          ⠿
        </span>
        <div className="s3d-dd">
          <button type="button" className="s3d-dd-btn" onClick={() => setDdOpen((v) => !v)} aria-expanded={ddOpen} data-s3d-dd>
            <span className="s3d-dd-emoji">{cur.emoji}</span>
            <b>{cur.label}</b>
            <small>{cur.group}</small>
            <i>▾</i>
          </button>
          {ddOpen && (
            <div className="s3d-dd-list" role="listbox">
              {(['각기둥', '각뿔', '둥근 입체'] as const).map((g) => (
                <div key={g} className="s3d-dd-group">
                  <span>{g}</span>
                  <div>
                    {SOLIDS.filter((x) => x.group === g).map((x) => (
                      <button
                        key={x.id}
                        type="button"
                        role="option"
                        aria-selected={kind === x.id}
                        className={kind === x.id ? 'is-on' : ''}
                        onClick={() => {
                          setKind(x.id);
                          setDdOpen(false);
                        }}
                        data-s3d-solid={x.id}
                      >
                        <span>{x.emoji}</span>
                        {x.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {t > 0.02 && <span className="s3d-badge">전개도 {Math.round(t * 100)}%</span>}
        <span className="s3d-flex" />
        <div className="s3d-mode">
          <button type="button" className={!writeMode ? 'is-on' : ''} onClick={() => onWriteMode(false)} title="끌어서 입체도형 돌리기 · 휠로 확대" data-s3d-rotate>
            🖐 돌리기
          </button>
          <button type="button" className={writeMode ? 'is-on' : ''} onClick={() => onWriteMode(true)} title="입체도형 위에 펜으로 쓰기" data-s3d-write>
            ✏️ 판서
          </button>
        </div>
        <button type="button" className="s3d-x" onClick={onClose} title="3D 닫기" data-s3d-close>
          ✕
        </button>
      </div>

      {/* 왼쪽 메뉴 (접기 가능) */}
      <div className={`s3d-panel ${panelOpen ? '' : 'is-closed'}`} style={{ left: box.x + 10, top: box.y + 64, maxHeight: box.h - 74, width: panelOpen ? PANEL_W - 14 : 40 }} data-s3d-panel>
        <button type="button" className="s3d-panel-toggle" onClick={() => setPanelOpen((v) => !v)} title={panelOpen ? '메뉴 접기' : '메뉴 펼치기'} data-s3d-panel-toggle>
          {panelOpen ? '◀' : '☰'}
        </button>
        {panelOpen && (
          <div className="s3d-panel-body">
            <section>
              <h4>📄 전개도</h4>
              {canUnfold(kind) ? (
                <>
                  <div className="s3d-row2">
                    <button type="button" className={`s3d-big is-play ${playing ? 'is-on' : ''}`} onClick={() => setPlaying((v) => !v)} data-s3d-play>
                      {playing ? '⏸ 멈추기' : '▶ 자동 재생'}
                    </button>
                    <button type="button" className="s3d-big" onClick={() => animateTo(t > 0.5 ? 0 : 1)} data-s3d-unfold>
                      {t > 0.5 ? '📦 접기' : '📄 펼치기'}
                    </button>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={t}
                    onChange={(e) => {
                      setPlaying(false);
                      stopAnim();
                      setT(Number(e.target.value));
                    }}
                    aria-label="전개도 펼친 정도"
                    data-s3d-slider
                  />
                  {canPickHinge(kind) ? (
                    <button
                      type="button"
                      className={`s3d-hinge ${pickHinge ? 'is-on' : ''}`}
                      onClick={() => {
                        setPlaying(false);
                        if (!pickHinge && t > 0.04) animateTo(0, 900);
                        setPickHinge((v) => !v);
                      }}
                      data-s3d-pick
                    >
                      ✂️ {pickHinge ? '윗면 모서리를 눌러요 (주황 선)' : t > 0.04 ? '접고 다른 변 고르기' : '자를 기준 변 고르기'}
                    </button>
                  ) : (
                    <p className="s3d-note">{kind === 'cylinder' ? '옆면이 굴러 펴지며 직사각형이 돼요' : '옆면이 밑면의 각 변을 중심으로 펼쳐져요'}</p>
                  )}
                </>
              ) : (
                <p className="s3d-note">{kind === 'cone' ? '원뿔의 전개도: 옆면은 부채꼴, 밑면은 원' : '구는 전개도를 만들 수 없어요'}</p>
              )}
            </section>
            <section>
              <h4>👀 보기</h4>
              <div className="s3d-grid2">
                {tog('color', '🎨', '면 색칠')}
                {tog('clear', '🫧', '투명')}
                {tog('hidden', '┅', '숨은 모서리')}
                {tog('dots', '●', '꼭짓점')}
                {tog('spin', '🔄', '자동 회전')}
              </div>
              <div className="s3d-views">
                <button type="button" onClick={() => view('iso')} title="비스듬히">↗</button>
                <button type="button" onClick={() => view('front')} title="앞에서">앞</button>
                <button type="button" onClick={() => view('side')} title="옆에서">옆</button>
                <button type="button" onClick={() => view('top')} title="위에서">위</button>
              </div>
            </section>
            <section>
              <h4>🔢 {cur.label}</h4>
              <div className="s3d-counts">
                {info.parts.map(([k, v]) => (
                  <span key={k}>
                    <small>{k}</small>
                    <b>{v}</b>
                  </span>
                ))}
              </div>
              <p className="s3d-note">{info.note}</p>
            </section>
          </div>
        )}
      </div>

      <span className="s3d-size" style={{ left: box.x + box.w - 16, top: box.y + box.h - 16 }} onPointerDown={(e) => dragBox(e, 'size')} title="끌어서 크기 조절" />
    </>
  );
};

export default Solid3DStage;
