/**
 * 🎰 자리 뽑기 3D 장면 (three.js)
 *  - 귀여운 곰돌이 귀 뽑기 기계 안에 교실: 뒤 벽 칠판 · 교탁 · 좌우 벽 게시판 · 창문 · 나무 바닥
 *  - 책상 · 의자는 위젯 자리 모양 그대로, 앞쪽 캡슐 상자에 캡슐
 *  - 크레인(가로 다리 + 집게)이 캡슐을 집어 자리로, 루미는 종이 인형처럼 서서 반응
 *  - 움직임 계산은 SeatDrawApp 의 무대 좌표(1600×900)를 그대로 받아 3D 위치로 바꿔 부드럽게 따라가요
 */
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { renderToStaticMarkup } from 'react-dom/server';
import { MochiBody, type MochiFace, type MochiTint } from '../MochiCharacter';
import { faceSvg, shellColor } from './Capsule';
import type { Gender, Layout } from './seatLogic';

export interface Cap3 {
  sid: number;
  x: number;
  y: number;
  z: number;
  dur: number;
  st: 'pile' | 'move' | 'fall' | 'desk';
  by?: 'lumi';
  stack?: number;
  img: number;
}
export interface Claw3 {
  x: number;
  y: number;
  z: number;
  dur: number;
  open: boolean;
  shake: boolean;
}
export interface Lumi3 {
  x: number;
  y: number;
  dur: number;
  face: MochiFace;
  act: string;
  bubble: string | null;
  flip: boolean;
  h?: number;
}
export type CamMode = 'all' | 'follow' | 'top';

interface Props {
  layout: Layout;
  caps: Record<number, Cap3>;
  claw: Claw3;
  lumi: Lumi3;
  map: Record<number, string>;
  order: number[];
  names: Record<number, { name: string; g: Gender }>;
  reveal: 'show' | 'hide';
  opened: Set<number>;
  bursts: { id: number; x: number; y: number }[];
  tint: MochiTint;
  cam: CamMode;
  /** 지금까지 뽑은 개수 (조작판 LCD) */
  done: number;
  /** 간판에 들어갈 이름 (예: 호랑이 선생님) */
  owner: string;
  /** 바뀔 때마다 모둠 팻말이 모두 올라왔다 내려가요 (뽑기 시작) */
  signKey?: number;
  onCapClick: (sid: number) => void;
}

// 무대 좌표 → 3D
const WX = (x: number) => (x - 800) / 100;
// 앞뒤는 조금 넓게 (책상 줄 사이가 넉넉하게 보이도록)
const ZS = 1.32;
const WZ = (y: number) => ((y - 437) / 100) * ZS;
const DESK_H = 0.72;
const TRAY_TOP = 0.26;
const R = 0.22;
const LIFT = 2.25;
const SIGN_DOWN = -1.9;
const SIGN_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#14b8a6', '#eab308', '#ef4444'];
const BRIDGE_Y = 3.55;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const bounce = (t: number) => {
  const n = 7.5625;
  const d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
};

// ── 텍스처 도우미 ──
const texCache = new Map<string, THREE.Texture>();
function svgTexture(key: string, svg: string): THREE.Texture {
  const hit = texCache.get(key);
  if (hit) return hit;
  const img = new Image();
  const tex = new THREE.Texture(img);
  tex.colorSpace = THREE.SRGBColorSpace;
  img.onload = () => {
    tex.needsUpdate = true;
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  texCache.set(key, tex);
  return tex;
}
function canvasTexture(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d')!;
  draw(c);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const FONT = "'Pretendard','Noto Sans KR','Apple SD Gothic Neo',sans-serif";
function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
/** 이름표 (흰 알약 + 글자) */
function labelSprite(text: string, color: string, border: string, scale = 1): THREE.Sprite {
  const key = `lbl:${text}:${color}:${border}`;
  let tex = texCache.get(key);
  if (!tex) {
    tex = canvasTexture(512, 160, (c) => {
      c.font = `900 84px ${FONT}`;
      const tw = Math.min(460, c.measureText(text).width + 70);
      const x = (512 - tw) / 2;
      roundRect(c, x, 20, tw, 120, 60);
      c.fillStyle = '#ffffff';
      c.fill();
      c.lineWidth = 10;
      c.strokeStyle = border;
      c.stroke();
      c.fillStyle = color;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(text, 256, 84, 420);
    });
    texCache.set(key, tex);
  }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
  sp.scale.set(1.3 * scale, 0.41 * scale, 1);
  return sp;
}

function mochiTexture(face: MochiFace, tint: MochiTint) {
  const key = `mochi:${face}:${tint.id}`;
  const svg = renderToStaticMarkup(<MochiBody face={face} tint={tint} glow="low" />).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" ');
  return svgTexture(key, svg);
}

export const SeatDraw3D: React.FC<Props> = (props) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const api = useRef<{ sync: () => void } | null>(null);

  useEffect(() => {
    const el = mountRef.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#fbefff');
    const camera = new THREE.PerspectiveCamera(36, el.clientWidth / el.clientHeight, 0.1, 100);
    camera.position.set(0, 10.6, 13.6);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.6, -0.3);
    controls.enableDamping = true;
    controls.minDistance = 6;
    controls.maxDistance = 24;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.minAzimuthAngle = -Math.PI * 0.42;
    controls.maxAzimuthAngle = Math.PI * 0.42;
    controls.update();

    // 빛
    scene.add(new THREE.HemisphereLight('#ffffff', '#fde7f3', 1.25));
    const sun = new THREE.DirectionalLight('#ffffff', 1.6);
    sun.position.set(4, 11, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 6, bottom: -6, near: 1, far: 30 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    scene.add(sun);

    const mat = (color: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.02, ...o });
    const box = (w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0, cast = true) => {
      const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      me.position.set(x, y, z);
      me.castShadow = cast;
      me.receiveShadow = true;
      scene.add(me);
      return me;
    };
    const rbox = (w: number, h: number, d: number, r: number, m: THREE.Material) => {
      // 모서리가 둥근 상자 (사각형을 둥글게 깎아 밀어내기)
      const s = new THREE.Shape();
      const x = -w / 2;
      const y = -d / 2;
      s.moveTo(x + r, y);
      s.lineTo(x + w - r, y);
      s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + d - r);
      s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
      s.lineTo(x + r, y + d);
      s.quadraticCurveTo(x, y + d, x, y + d - r);
      s.lineTo(x, y + r);
      s.quadraticCurveTo(x, y, x + r, y);
      const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
      g.rotateX(Math.PI / 2);
      g.translate(0, h / 2, 0);
      const me = new THREE.Mesh(g, m);
      me.castShadow = true;
      me.receiveShadow = true;
      return me;
    };

    // ════════ 뽑기 기계 몸통 ════════
    const PINK = mat('#f9a8d4', { roughness: 0.4 });
    const PINK_L = mat('#ffd1e8', { roughness: 0.45 });
    const WHITE = mat('#ffffff', { roughness: 0.35 });
    const XW = 7.55;
    const ZB = WZ(104) - 0.15;
    const ZF = WZ(770) + 0.2;
    // 바닥 받침
    const base = rbox(XW * 2 + 0.9, 1.1, ZF - ZB + 0.9, 0.5, PINK);
    base.position.set(0, -0.64, (ZF + ZB) / 2);
    scene.add(base);
    // 앞 조작판
    const panel = rbox(7.5, 0.5, 1.2, 0.35, PINK_L);
    panel.position.set(0, -0.15, ZF + 0.85);
    scene.add(panel);
    // 🕹 조이스틱 (크레인이 움직이는 방향으로 기울어요)
    const joyBase = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.1, 24), mat('#334155', { roughness: 0.4 }));
    joyBase.position.set(-2.6, 0.12, ZF + 0.85);
    scene.add(joyBase);
    const joyG = new THREE.Group();
    joyG.position.set(-2.6, 0.15, ZF + 0.85);
    const joyStick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.5, 12), mat('#e2e8f0', { metalness: 0.5, roughness: 0.3 }));
    joyStick.position.y = 0.25;
    const joyBall = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), mat('#fb7185', { roughness: 0.25 }));
    joyBall.position.y = 0.55;
    joyBall.castShadow = true;
    joyG.add(joyStick, joyBall);
    scene.add(joyG);
    // 🔘 뽑기 버튼 (내려놓을 때 꾹 눌려요)
    const btnRing = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.48, 0.1, 32), mat('#334155', { roughness: 0.4 }));
    btnRing.position.set(2.6, 0.12, ZF + 0.85);
    scene.add(btnRing);
    const btnMat = mat('#fde047', { roughness: 0.3, emissive: '#f59e0b', emissiveIntensity: 0 });
    const bigBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.18, 32), btnMat);
    bigBtn.position.set(2.6, 0.22, ZF + 0.85);
    scene.add(bigBtn);
    // 📟 LCD (조이스틱과 버튼 사이)
    const lcdFrame = rbox(3.2, 1.0, 0.16, 0.07, mat('#1f2937', { roughness: 0.5 }));
    lcdFrame.position.set(0, 0.55, ZF + 0.75);
    lcdFrame.rotation.x = -0.75;
    scene.add(lcdFrame);
    const lcdCanvas = document.createElement('canvas');
    lcdCanvas.width = 768;
    lcdCanvas.height = 224;
    const lcdTex = new THREE.CanvasTexture(lcdCanvas);
    lcdTex.colorSpace = THREE.SRGBColorSpace;
    const lcd = new THREE.Mesh(new THREE.PlaneGeometry(2.95, 0.86), new THREE.MeshBasicMaterial({ map: lcdTex }));
    lcd.rotation.x = -0.75;
    lcd.position.set(0, 0.55 + Math.sin(0.75) * 0.15, ZF + 0.75 + Math.cos(0.75) * 0.15);
    scene.add(lcd);
    let lcdKey = '';
    const drawLcd = (done: number, total: number, blink: boolean) => {
      const key = `${done}/${total}/${blink}`;
      if (key === lcdKey) return;
      lcdKey = key;
      const c = lcdCanvas.getContext('2d')!;
      c.fillStyle = '#0b2a1a';
      c.fillRect(0, 0, 768, 224);
      c.fillStyle = 'rgba(134,239,172,0.07)';
      for (let y = 0; y < 224; y += 6) c.fillRect(0, y, 768, 2);
      c.textBaseline = 'middle';
      c.font = `900 54px ui-monospace, 'SF Mono', monospace`;
      c.fillStyle = '#86efac';
      c.shadowColor = '#4ade80';
      c.shadowBlur = 14;
      c.textAlign = 'left';
      c.fillText(`뽑은 캡슐 ${String(done).padStart(2, '0')}`, 34, 66);
      c.fillText(`남은 캡슐 ${String(Math.max(0, total - done)).padStart(2, '0')}`, 34, 156);
      c.textAlign = 'right';
      c.font = `900 40px ui-monospace, monospace`;
      c.fillStyle = blink ? '#fde047' : '#14532d';
      c.shadowColor = '#fde047';
      c.fillText(total && done >= total ? '★ CLEAR' : '▶ PLAY', 740, 66);
      c.fillStyle = '#86efac';
      c.shadowColor = '#4ade80';
      c.fillText(`${done}/${total}`, 740, 156);
      lcdTex.needsUpdate = true;
    };
    // 기둥 4개
    const postG = new THREE.CylinderGeometry(0.2, 0.2, 4.4, 20);
    [
      [-XW, ZB],
      [XW, ZB],
      [-XW, ZF],
      [XW, ZF],
    ].forEach(([x, z]) => {
      const p = new THREE.Mesh(postG, PINK);
      p.position.set(x, 2.2, z);
      p.castShadow = true;
      scene.add(p);
    });
    // 지붕 + 곰돌이 귀
    // 지붕은 테두리만 (위에서도 안이 보이게)
    box(XW * 2 + 0.6, 0.3, 0.4, PINK, 0, 4.45, ZB);
    box(0.4, 0.3, ZF - ZB, PINK, -XW, 4.45, (ZF + ZB) / 2);
    box(0.4, 0.3, ZF - ZB, PINK, XW, 4.45, (ZF + ZB) / 2);
    // 🌟 뒤쪽 네온 간판 (곰돌이 귀 + 반짝이 전구 + 네온 글자)
    const crown = rbox(10.2, 2.3, 0.5, 0.5, PINK);
    crown.position.set(0, 5.6, ZB);
    scene.add(crown);
    const neonBack = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 1.9), new THREE.MeshBasicMaterial({ color: '#2e1065' }));
    neonBack.position.set(0, 5.62, ZB + 0.27);
    scene.add(neonBack);
    [-4.9, 4.9].forEach((x) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.95, 32, 20), PINK);
      ear.scale.set(1, 1, 0.45);
      ear.position.set(x, 6.75, ZB - 0.05);
      ear.castShadow = true;
      scene.add(ear);
      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.6, 32, 20), mat('#ffe4f1'));
      inner.scale.set(1, 1, 0.3);
      inner.position.set(x, 6.75, ZB + 0.25);
      scene.add(inner);
    });
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 1900;
    signCanvas.height = 380;
    const signTex = new THREE.CanvasTexture(signCanvas);
    signTex.colorSpace = THREE.SRGBColorSpace;
    let signOwner = '';
    const drawSign = (owner: string) => {
      if (owner === signOwner) return;
      signOwner = owner;
      const c = signCanvas.getContext('2d')!;
      c.clearRect(0, 0, 1900, 380);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const neon = (txt: string, x: number, y: number, font: string, col: string, glow: string) => {
        c.font = font;
        c.shadowColor = glow;
        for (const b of [40, 22, 10]) {
          c.shadowBlur = b;
          c.fillStyle = glow;
          c.fillText(txt, x, y);
        }
        c.shadowBlur = 6;
        c.fillStyle = col;
        c.fillText(txt, x, y);
      };
      neon(`🐯 ${owner || '우리 반'}의`, 950, 92, `900 92px ${FONT}`, '#fff7cc', '#facc15');
      neon('두근두근 자리 뽑기', 950, 250, `900 172px ${FONT}`, '#ffe4f1', '#ec4899');
      signTex.needsUpdate = true;
    };
    drawSign(propsRef.current.owner);
    const signMat = new THREE.MeshBasicMaterial({ map: signTex, transparent: true, depthWrite: false });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(9.3, 1.86), signMat);
    sign.position.set(0, 5.62, ZB + 0.29);
    scene.add(sign);
    // 간판 테두리 전구 (빙글빙글 따라 도는 불빛)
    const signBulbs: THREE.Mesh[] = [];
    const sbG = new THREE.SphereGeometry(0.075, 10, 8);
    const perim: [number, number][] = [];
    for (let i = 0; i <= 24; i++) perim.push([-4.8 + i * 0.4, 6.62]);
    for (let i = 1; i <= 4; i++) perim.push([4.8, 6.62 - i * 0.4]);
    for (let i = 0; i <= 24; i++) perim.push([4.8 - i * 0.4, 4.62]);
    for (let i = 1; i <= 4; i++) perim.push([-4.8, 4.62 + i * 0.4]);
    perim.forEach(([x, y]) => {
      const b = new THREE.Mesh(sbG, new THREE.MeshStandardMaterial({ color: '#fff7cc', emissive: '#fde68a', emissiveIntensity: 1 }));
      b.position.set(x, y, ZB + 0.3);
      scene.add(b);
      signBulbs.push(b);
    });
    // 꼬마 전구
    const bulbs: THREE.Mesh[] = [];
    const bulbG = new THREE.SphereGeometry(0.09, 12, 8);
    for (let i = 0; i < 26; i++) {
      const b = new THREE.Mesh(bulbG, new THREE.MeshStandardMaterial({ color: '#fff7cc', emissive: '#fde68a', emissiveIntensity: 1 }));
      b.position.set(-XW - 0.2 + (i * (XW * 2 + 0.4)) / 25, -0.2, ZF + 0.48);
      scene.add(b);
      bulbs.push(b);
    }
    // 유리 (앞 · 옆)
    const glassM = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.08, roughness: 0.05, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
    const gF = new THREE.Mesh(new THREE.PlaneGeometry(XW * 2, 4.2), glassM);
    gF.position.set(0, 2.1, ZF);
    scene.add(gF);
    const shineM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.18, depthWrite: false });
    [
      [-5.2, 0.5],
      [-4.6, 0.22],
      [4.8, 0.4],
    ].forEach(([x, w]) => {
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(w, 4.2), shineM);
      sh.position.set(x, 2.1, ZF + 0.01);
      sh.rotation.z = -0.35;
      scene.add(sh);
    });

    // ════════ 교실 ════════
    const floorTex = canvasTexture(1024, 512, (c) => {
      c.fillStyle = '#f6e2c4';
      c.fillRect(0, 0, 1024, 512);
      for (let i = 0; i < 1024; i += 64) {
        c.fillStyle = i % 128 ? '#f2d9b5' : '#f8e7cd';
        c.fillRect(i, 0, 62, 512);
        c.fillStyle = 'rgba(180,140,90,0.25)';
        c.fillRect(i + 62, 0, 2, 512);
      }
    });
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(2, 1);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(XW * 2, ZF - ZB), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.8 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, (ZF + ZB) / 2);
    floor.receiveShadow = true;
    scene.add(floor);
    // 벽
    const wallM = mat('#fff7ea', { roughness: 0.9 });
    box(XW * 2, 4.2, 0.12, wallM, 0, 2.1, ZB - 0.06, false);
    const sideL = box(0.12, 4.2, ZF - ZB, wallM, -XW - 0.06, 2.1, (ZF + ZB) / 2, false);
    const sideR = box(0.12, 4.2, ZF - ZB, wallM, XW + 0.06, 2.1, (ZF + ZB) / 2, false);
    sideL.material = mat('#fdf1e2', { roughness: 0.9 });
    sideR.material = sideL.material;
    // 걸레받이
    box(XW * 2, 0.22, 0.04, mat('#e7c9a0'), 0, 0.11, ZB + 0.02, false);
    // 칠판 (크게) — 분필로 그린 자리 배치도에 이름이 하나씩 새겨져요
    const d = new Date();
    const BW = 2048;
    const BH = 790;
    const boardCanvas = document.createElement('canvas');
    boardCanvas.width = BW;
    boardCanvas.height = BH;
    const boardTex = new THREE.CanvasTexture(boardCanvas);
    boardTex.colorSpace = THREE.SRGBColorSpace;
    boardTex.anisotropy = 4;
    // 바탕(나무 테두리 · 초록 칠판 · 제목)은 한 번만 그려 두기
    const boardBg = document.createElement('canvas');
    boardBg.width = BW;
    boardBg.height = BH;
    {
      const c = boardBg.getContext('2d')!;
      c.fillStyle = '#c9a27a';
      roundRect(c, 0, 0, BW, BH, 40);
      c.fill();
      const g = c.createLinearGradient(0, 0, BW, BH);
      g.addColorStop(0, '#2f6b4f');
      g.addColorStop(1, '#285c44');
      c.fillStyle = g;
      roundRect(c, 30, 30, BW - 60, BH - 60, 22);
      c.fill();
      // 지운 자국
      c.fillStyle = 'rgba(255,255,255,0.035)';
      for (let i = 0; i < 14; i++) {
        c.beginPath();
        c.ellipse(140 + ((i * 397) % (BW - 280)), 120 + ((i * 211) % (BH - 240)), 160, 40, (i % 3) * 0.3, 0, Math.PI * 2);
        c.fill();
      }
      c.textBaseline = 'middle';
      c.textAlign = 'left';
      c.fillStyle = 'rgba(255,255,255,0.92)';
      c.font = `900 64px ${FONT}`;
      c.fillText('오늘의 자리는?', 70, 92);
      c.textAlign = 'right';
      c.font = `700 40px ${FONT}`;
      c.fillStyle = 'rgba(254,240,138,0.9)';
      c.fillText(`${d.getMonth() + 1}월 ${d.getDate()}일 · 두근두근 자리 뽑기 ✦`, BW - 70, 92);
      c.strokeStyle = 'rgba(255,255,255,0.35)';
      c.lineWidth = 3;
      c.setLineDash([14, 10]);
      c.beginPath();
      c.moveTo(70, 140);
      c.lineTo(BW - 70, 140);
      c.stroke();
      c.setLineDash([]);
    }
    const board = new THREE.Mesh(new THREE.PlaneGeometry(6.7, 6.7 * (BH / BW)), new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.75 }));
    board.position.set(0, 2.45, ZB + 0.02);
    scene.add(board);
    box(6.1, 0.06, 0.16, mat('#b48a62'), 0, 2.45 - (6.7 * (BH / BW)) / 2 - 0.02, ZB + 0.08);
    // 분필로 그린 배치도 (자리 모양 기준으로 칠판 안에 맞춰서)
    const chalkLayout = document.createElement('canvas');
    chalkLayout.width = BW;
    chalkLayout.height = BH;
    const chalkMap = { k: 1, ox: 0, oy: 0 };
    {
      const L = propsRef.current.layout;
      const rects = [...L.slots.map((q) => ({ x: q.x, y: q.y, w: q.w, h: q.h })), ...L.teamBoxes.map((b) => b.rect)];
      const minX = Math.min(...rects.map((r) => r.x));
      const minY = Math.min(...rects.map((r) => r.y));
      const maxX = Math.max(...rects.map((r) => r.x + r.w));
      const maxY = Math.max(...rects.map((r) => r.y + r.h));
      const area = { x: 80, y: 168, w: BW - 160, h: BH - 168 - 56 };
      const k = Math.min(area.w / Math.max(1, maxX - minX), area.h / Math.max(1, maxY - minY));
      chalkMap.k = k;
      chalkMap.ox = area.x + (area.w - (maxX - minX) * k) / 2 - minX * k;
      chalkMap.oy = area.y + (area.h - (maxY - minY) * k) / 2 - minY * k;
      const c = chalkLayout.getContext('2d')!;
      const chalkRect = (x: number, y: number, w: number, h: number, col: string, lw: number, dash?: number[]) => {
        // 분필 느낌: 살짝 어긋난 선을 두 번
        c.setLineDash(dash || []);
        c.lineJoin = 'round';
        [
          [0, 0, 1],
          [1.6, -1.2, 0.35],
        ].forEach(([dx, dy, a]) => {
          c.globalAlpha = a;
          c.strokeStyle = col;
          c.lineWidth = lw;
          roundRect(c, x + dx, y + dy, w, h, 10);
          c.stroke();
        });
        c.globalAlpha = 1;
        c.setLineDash([]);
      };
      const T = (v: number, o: number) => o + v * k;
      L.teamBoxes.forEach((b) => {
        chalkRect(T(b.rect.x, chalkMap.ox), T(b.rect.y, chalkMap.oy), b.rect.w * k, b.rect.h * k, 'rgba(254,240,138,0.8)', 3.5, [16, 10]);
        c.fillStyle = 'rgba(254,240,138,0.9)';
        c.font = `800 ${Math.max(22, Math.min(34, 22 * k))}px ${FONT}`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(b.team.name, T(b.rect.x + b.rect.w / 2, chalkMap.ox), T(b.rect.y + 15, chalkMap.oy));
      });
      L.slots.forEach((q) => chalkRect(T(q.x, chalkMap.ox) + 3, T(q.y, chalkMap.oy) + 3, q.w * k - 6, q.h * k - 6, 'rgba(255,255,255,0.78)', 4));
    }
    // 이름 새기기: sid → 쓰기 시작한 시각
    const chalkNames = new Map<number, { t0: number; text: string; x: number; y: number; w: number; h: number; col: string }>();
    let boardKey = '__init__';
    const drawBoard = (now: number) => {
      let writing = false;
      chalkNames.forEach((n) => {
        if (now - n.t0 < 900) writing = true;
      });
      const key = [...chalkNames.keys()].join(',');
      if (!writing && key === boardKey) return;
      boardKey = writing ? '' : key;
      const c = boardCanvas.getContext('2d')!;
      c.clearRect(0, 0, BW, BH);
      c.drawImage(boardBg, 0, 0);
      c.drawImage(chalkLayout, 0, 0);
      chalkNames.forEach((n) => {
        const kk = Math.max(0, Math.min(1, (now - n.t0) / 900));
        const fs = Math.min(n.h * 0.62, (n.w * 0.9) / Math.max(2, n.text.length) * 1.05, 64);
        c.font = `800 ${fs}px ${FONT}`;
        c.textAlign = 'left';
        c.textBaseline = 'middle';
        const tw = c.measureText(n.text).width;
        const x0 = n.x + (n.w - tw) / 2;
        const cy = n.y + n.h / 2;
        c.save();
        c.beginPath();
        c.rect(x0 - 4, n.y, (tw + 8) * kk, n.h);
        c.clip();
        c.shadowColor = 'rgba(255,255,255,0.5)';
        c.shadowBlur = 4;
        c.fillStyle = n.col;
        c.fillText(n.text, x0, cy + 2);
        c.restore();
        // 분필 끝 가루
        if (kk > 0 && kk < 1) {
          const tx = x0 + tw * kk;
          c.fillStyle = 'rgba(255,255,255,0.85)';
          for (let i = 0; i < 6; i++) {
            c.beginPath();
            c.arc(tx + (Math.random() - 0.3) * 14, cy + (Math.random() - 0.5) * fs, 1.5 + Math.random() * 2.5, 0, Math.PI * 2);
            c.fill();
          }
        }
      });
      boardTex.needsUpdate = true;
    };
    drawBoard(performance.now());
    // 창문 (뒤 벽 양쪽)
    const winTex = canvasTexture(400, 300, (c) => {
      const g = c.createLinearGradient(0, 0, 0, 300);
      g.addColorStop(0, '#bfe6ff');
      g.addColorStop(1, '#e0f2fe');
      c.fillStyle = g;
      c.fillRect(0, 0, 400, 300);
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(110, 90, 34, 0, Math.PI * 2);
      c.arc(150, 80, 44, 0, Math.PI * 2);
      c.arc(195, 95, 30, 0, Math.PI * 2);
      c.fill();
      c.fillRect(192, 0, 16, 300);
      c.lineWidth = 20;
      c.strokeStyle = '#ffffff';
      c.strokeRect(0, 0, 400, 300);
    });
    // 옆 벽에는 창문
    [-1, 1].forEach((side) => {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.9), new THREE.MeshBasicMaterial({ map: winTex }));
      w.position.set(side * (XW - 0.03), 2.6, -1.2);
      w.rotation.y = (-side * Math.PI) / 2;
      scene.add(w);
    });
    // 📌 칠판 좌우 게시판 (학생 기준 왼쪽: 우리 반 규칙 · 오른쪽: 알립니다)
    const boardTex2 = (title: string, color: string, items: [string, string][]) =>
      canvasTexture(640, 520, (c) => {
        c.fillStyle = '#ffffff';
        roundRect(c, 0, 0, 640, 520, 30);
        c.fill();
        c.fillStyle = '#e8c39a';
        roundRect(c, 18, 18, 604, 484, 20);
        c.fill();
        c.fillStyle = 'rgba(124,90,53,0.2)';
        for (let y = 26; y < 500; y += 16) for (let x = 26; x < 616; x += 16) c.fillRect(x, y, 3, 3);
        c.fillStyle = color;
        roundRect(c, 120, 36, 400, 78, 39);
        c.fill();
        c.fillStyle = '#fff';
        c.font = `900 46px ${FONT}`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(title, 320, 77);
        const notes = ['#fef9c3', '#dbeafe', '#fce7f3'];
        items.forEach(([emo, txt], i) => {
          const y = 172 + i * 112;
          c.save();
          c.translate(320, y);
          c.rotate((i % 2 ? 1.5 : -2) * (Math.PI / 180));
          c.fillStyle = 'rgba(0,0,0,0.12)';
          c.fillRect(-246, -40, 500, 92);
          c.fillStyle = notes[i % 3];
          c.fillRect(-250, -46, 500, 92);
          c.font = `64px ${FONT}`;
          c.textAlign = 'center';
          c.fillText(emo, -190, 4);
          c.fillStyle = '#374151';
          c.font = `800 40px ${FONT}`;
          c.textAlign = 'left';
          c.fillText(txt, -138, 2);
          c.fillStyle = i % 2 ? '#3b82f6' : '#f43f5e';
          c.beginPath();
          c.arc(0, -40, 11, 0, Math.PI * 2);
          c.fill();
          c.restore();
        });
      });
    const ruleBoard = new THREE.Mesh(
      new THREE.PlaneGeometry(2.3, 1.87),
      new THREE.MeshStandardMaterial({ map: boardTex2('📏 우리 반 규칙', '#f472b6', [['🤝', '서로 도와요'], ['🙋', '손 들고 말해요'], ['🧹', '내 자리는 내가']]), roughness: 0.8 }),
    );
    ruleBoard.position.set(-5.45, 2.45, ZB + 0.03);
    scene.add(ruleBoard);
    const newsBoard = new THREE.Mesh(
      new THREE.PlaneGeometry(2.3, 1.87),
      new THREE.MeshStandardMaterial({ map: boardTex2('📢 알립니다', '#60a5fa', [['🪑', '오늘은 자리 바꾸는 날!'], ['📚', '아침 독서 10분'], ['🎨', '미술 준비물 챙기기']]), roughness: 0.8 }),
    );
    newsBoard.position.set(5.45, 2.45, ZB + 0.03);
    scene.add(newsBoard);
    // 게시판 (좌우 벽)
    const noticeTex = (title: string, notes: string[], sticker: string) =>
      canvasTexture(560, 760, (c) => {
        c.fillStyle = '#ffffff';
        roundRect(c, 0, 0, 560, 760, 34);
        c.fill();
        c.fillStyle = '#e8c39a';
        roundRect(c, 22, 22, 516, 716, 22);
        c.fill();
        c.fillStyle = 'rgba(124,90,53,0.22)';
        for (let y = 30; y < 740; y += 18) for (let x = 30; x < 530; x += 18) c.fillRect(x, y, 3, 3);
        c.fillStyle = '#fff';
        roundRect(c, 60, 50, 440, 80, 20);
        c.fill();
        c.fillStyle = '#b45309';
        c.font = `900 46px ${FONT}`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(title, 280, 92);
        const cols = ['#fef9c3', '#dbeafe', '#fce7f3'];
        notes.forEach((t, i) => {
          c.save();
          c.translate(280, 220 + i * 150);
          c.rotate((i % 2 ? 2 : -3) * (Math.PI / 180));
          c.fillStyle = 'rgba(0,0,0,0.12)';
          c.fillRect(-176, -46, 360, 104);
          c.fillStyle = cols[i % 3];
          c.fillRect(-180, -52, 360, 104);
          c.fillStyle = '#374151';
          c.font = `800 44px ${FONT}`;
          c.fillText(t, 0, 0);
          c.fillStyle = i % 2 ? '#3b82f6' : '#f43f5e';
          c.beginPath();
          c.arc(i % 2 ? 150 : -150, -40, 13, 0, Math.PI * 2);
          c.fill();
          c.restore();
        });
        c.font = `90px ${FONT}`;
        c.fillText(sticker, 440, 680);
      });
    const nL = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.5), new THREE.MeshStandardMaterial({ map: noticeTex('📌 우리 반 약속', ['서로 존중해요', '바르게 앉아요', '함께 정리해요'], '⭐') }));
    nL.position.set(-XW + 0.02, 2.1, 2.2);
    nL.scale.setScalar(0.7);
    nL.rotation.y = Math.PI / 2;
    scene.add(nL);
    const nR = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.5), new THREE.MeshStandardMaterial({ map: noticeTex('🌈 이달의 소식', ['새 자리 축하!', '책 읽기 왕', '칭찬 나무 🌳'], '🌷') }));
    nR.position.set(XW - 0.02, 2.1, 2.2);
    nR.scale.setScalar(0.7);
    nR.rotation.y = -Math.PI / 2;
    scene.add(nR);
    // 교탁
    const podM = mat('#d9b48a');
    const pod = rbox(1.5, 0.95, 0.6, 0.08, podM);
    pod.position.set(0, 0.48, WZ(232));
    scene.add(pod);
    const podTop = rbox(1.62, 0.06, 0.7, 0.08, mat('#e7c9a0'));
    podTop.position.set(0, 0.98, WZ(232));
    scene.add(podTop);
    // 캡슐 상자 (앞쪽)
    const tray = rbox(10.8, 0.26, 1.06 * ZS, 0.3, mat('#fce7f3', { roughness: 0.5 }));
    tray.position.set(0, 0.13, WZ(710));
    scene.add(tray);
    const trayRim = rbox(11.0, 0.08, 1.2 * ZS, 0.34, WHITE);
    trayRim.position.set(0, 0.04, WZ(710));
    scene.add(trayRim);
    const trayLbl = labelSprite('★ 오늘의 캡슐 ★', '#92400e', '#fde68a', 1.1);
    trayLbl.position.set(0, 0.72, WZ(660));
    scene.add(trayLbl);

    // ════════ 크레인 ════════
    const railM = mat('#e2e8f0', { metalness: 0.4, roughness: 0.3 });
    [-XW + 0.1, XW - 0.1].forEach((x) => box(0.16, 0.16, ZF - ZB, railM, x, BRIDGE_Y + 0.1, (ZF + ZB) / 2, false));
    const bridge = new THREE.Group();
    // 가로 다리는 반투명 (뒤의 이름표가 가려지지 않게)
    const beam = new THREE.Mesh(new THREE.BoxGeometry(XW * 2 - 0.2, 0.1, 0.12), mat('#cbd5e1', { transparent: true, opacity: 0.45, depthWrite: false }));
    bridge.add(beam);
    [-XW + 0.1, XW - 0.1].forEach((x) => {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.36), PINK);
      cap.position.set(x, 0.05, 0);
      bridge.add(cap);
    });
    bridge.position.y = BRIDGE_Y;
    scene.add(bridge);
    const trolley = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.26, 0.42), PINK);
    trolley.castShadow = true;
    scene.add(trolley);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 8), mat('#94a3b8'));
    scene.add(cable);
    const clawG = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 20), mat('#fbcfe8', { roughness: 0.35 }));
    head.scale.set(1, 0.82, 1);
    head.castShadow = true;
    clawG.add(head);
    [-0.2, 0.2].forEach((x) => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), mat('#f9a8d4'));
      e.position.set(x, 0.24, 0);
      clawG.add(e);
    });
    const clawFace = new THREE.Mesh(
      new THREE.PlaneGeometry(0.36, 0.24),
      new THREE.MeshBasicMaterial({
        transparent: true,
        map: svgTexture(
          'clawface',
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40" width="180" height="120"><circle cx="18" cy="16" r="4" fill="#3b2f2f"/><circle cx="42" cy="16" r="4" fill="#3b2f2f"/><ellipse cx="10" cy="26" rx="6" ry="3.5" fill="#fb7185" opacity="0.55"/><ellipse cx="50" cy="26" rx="6" ry="3.5" fill="#fb7185" opacity="0.55"/><path d="M24 25 Q30 31 36 25" stroke="#3b2f2f" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
        ),
      }),
    );
    clawFace.position.set(0, 0.02, 0.29);
    clawG.add(clawFace);
    const prongs: THREE.Group[] = [];
    for (let k = 0; k < 3; k++) {
      const pv = new THREE.Group();
      pv.rotation.y = (k * Math.PI * 2) / 3;
      const arm = new THREE.Group();
      arm.position.set(0, -0.18, 0.16);
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.42, 0.07), mat('#cbd5e1', { metalness: 0.5, roughness: 0.3 }));
      seg.position.y = -0.2;
      seg.castShadow = true;
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.16), seg.material);
      tip.position.set(0, -0.39, -0.06);
      arm.add(seg, tip);
      pv.add(arm);
      clawG.add(pv);
      prongs.push(arm);
    }
    scene.add(clawG);

    // ════════ 루미 (종이 인형처럼 서 있는 캐릭터) ════════
    const lumiMat = new THREE.SpriteMaterial({ map: mochiTexture('happy', propsRef.current.tint), depthWrite: true, alphaTest: 0.2 });
    const lumiSp = new THREE.Sprite(lumiMat);
    lumiSp.scale.set(1.05, 1.05, 1);
    scene.add(lumiSp);
    const lumiShadow = new THREE.Mesh(new THREE.CircleGeometry(0.34, 24), new THREE.MeshBasicMaterial({ color: '#5b3b6b', transparent: true, opacity: 0.18, depthWrite: false }));
    lumiShadow.rotation.x = -Math.PI / 2;
    scene.add(lumiShadow);
    const heart = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(128, 128, (c) => {
      c.font = '100px serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('💗', 64, 70);
    }), transparent: true, depthWrite: false }));
    heart.scale.set(0.45, 0.45, 1);
    heart.visible = false;
    scene.add(heart);

    // ════════ 책상 · 모둠 깔개 (자리 모양이 바뀌면 다시) ════════
    const deskGroup = new THREE.Group();
    scene.add(deskGroup);
    const signs: { teamId: number; g: THREE.Group; upUntil: number; tUp: number }[] = [];
    /** 팻말 올리기 (이미 올라와 있으면 조금 더 오래) */
    const raiseSign = (sg: { upUntil: number; tUp: number }, now: number, hold: number, delay = 0) => {
      if (now > sg.upUntil) sg.tUp = now + delay;
      sg.upUntil = Math.max(sg.upUntil, now + delay + hold);
    };
    let lastSignKey = 0;
    // 첫 화면이 그려진 뒤에 올라오도록 (장면 준비 중에 지나가 버리지 않게)
    let signPending = false;
    let frameNo = 0;
    const buildDesks = () => {
      deskGroup.clear();
      const L = propsRef.current.layout;
      const topM = mat('#f6e3c3', { roughness: 0.6 });
      const legM = mat('#a3a3a3', { metalness: 0.4, roughness: 0.4 });
      const chairM = mat('#93c5fd', { roughness: 0.5 });
      L.teamBoxes.forEach((b) => {
        const rug = new THREE.Mesh(new THREE.PlaneGeometry(b.rect.w / 100, (b.rect.h / 100) * ZS), new THREE.MeshStandardMaterial({ color: '#fff3e0', roughness: 1 }));
        rug.rotation.x = -Math.PI / 2;
        rug.position.set(WX(b.rect.x + b.rect.w / 2), 0.005, WZ(b.rect.y + b.rect.h / 2));
        rug.receiveShadow = true;
        deskGroup.add(rug);
        // 🪧 모둠 팻말: 칠판 쪽, 두 줄 책상 사이 (평소엔 바닥 아래에 숨어 있다가 쑥!)
        const ti = L.teamBoxes.indexOf(b);
        const col = SIGN_COLORS[ti % SIGN_COLORS.length];
        const tex = canvasTexture(512, 220, (c) => {
          c.fillStyle = '#ffffff';
          roundRect(c, 0, 0, 512, 220, 46);
          c.fill();
          c.fillStyle = col;
          roundRect(c, 14, 14, 484, 192, 36);
          c.fill();
          c.fillStyle = '#ffffff';
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          const nm = b.team.name;
          c.font = `900 ${nm.length > 6 ? 62 : 80}px ${FONT}`;
          c.fillText(nm, 256, 116, 460);
        });
        const sg = new THREE.Group();
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 10), mat('#a16207', { roughness: 0.5 }));
        pole.position.y = 0.62;
        pole.castShadow = true;
        const plate = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.64, 0.05), [
          mat(col),
          mat(col),
          mat(col),
          mat(col),
          new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }),
          mat(col),
        ]);
        plate.position.y = 1.5;
        plate.castShadow = true;
        sg.add(pole, plate);
        sg.position.set(WX(b.grid.cx), SIGN_DOWN, WZ(b.grid.top) - 0.2);
        deskGroup.add(sg);
        signs.push({ teamId: b.team.id, g: sg, upUntil: 0, tUp: 0 });
      });
      L.colRects.forEach((r, i) => {
        const lb = labelSprite(`${i + 1}분단`, '#b08a5e', '#f1dfc4', 0.7);
        lb.position.set(WX(r.x + r.w / 2), 0.2, WZ(r.y + r.h + 18));
        deskGroup.add(lb);
      });
      L.slots.forEach((s) => {
        const w = (s.w / 100) * 0.94;
        const dd = Math.max(0.42, (s.h / 100) * 0.9 * ZS);
        const cx = WX(s.x + s.w / 2);
        const cz = WZ(s.y + s.h / 2);
        const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, dd), topM);
        top.position.set(cx, DESK_H, cz);
        top.castShadow = true;
        top.receiveShadow = true;
        deskGroup.add(top);
        [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ].forEach(([a, b]) => {
          const lg = new THREE.Mesh(new THREE.BoxGeometry(0.04, DESK_H, 0.04), legM);
          lg.position.set(cx + a * (w / 2 - 0.06), DESK_H / 2, cz + b * (dd / 2 - 0.05));
          deskGroup.add(lg);
        });
        // 의자 (책상 뒤쪽 = 카메라 쪽)
        const seat = new THREE.Mesh(new THREE.BoxGeometry(Math.min(0.46, w * 0.45), 0.05, 0.3), chairM);
        seat.position.set(cx, 0.42, cz + dd / 2 + 0.2);
        seat.castShadow = true;
        deskGroup.add(seat);
        const back = new THREE.Mesh(new THREE.BoxGeometry(Math.min(0.46, w * 0.45), 0.34, 0.05), chairM);
        back.position.set(cx, 0.62, cz + dd / 2 + 0.34);
        back.castShadow = true;
        deskGroup.add(back);
      });
    };
    buildDesks();

    // ════════ 캡슐 ════════
    interface CapObj {
      g: THREE.Group;
      top: THREE.Group;
      q: THREE.Sprite;
      tag: THREE.Sprite | null;
      name: THREE.Sprite | null;
      cur: THREE.Vector3;
      tw: { from: THREE.Vector3; to: THREE.Vector3; t0: number; dur: number; ease: (t: number) => number } | null;
      last: string;
      scale: number;
      openT: number;
      st: string;
      jig: { t0: number; dx: number; dz: number } | null;
      topMat: THREE.MeshPhysicalMaterial;
      phase: number;
    }
    const capObjs = new Map<number, CapObj>();
    const sphereTop = new THREE.SphereGeometry(R, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const sphereBot = new THREE.SphereGeometry(R, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const ringG = new THREE.TorusGeometry(R, 0.022, 8, 32);
    const botM = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, roughness: 0.1, depthWrite: false });
    const qTex = canvasTexture(128, 128, (c) => {
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(64, 64, 56, 0, Math.PI * 2);
      c.fill();
      c.lineWidth = 8;
      c.strokeStyle = '#f472b6';
      c.stroke();
      c.fillStyle = '#db2777';
      c.font = `900 84px ${FONT}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('?', 64, 70);
    });
    const makeCap = (sid: number) => {
      const p = propsRef.current;
      const info = p.names[sid];
      const c = p.caps[sid];
      const g = new THREE.Group();
      g.userData.sid = sid;
      const bot = new THREE.Mesh(sphereBot, botM);
      bot.userData.sid = sid;
      const face = new THREE.Sprite(new THREE.SpriteMaterial({ map: svgTexture(`face${c.img % 10}`, faceSvg(c.img)), depthWrite: false }));
      face.scale.set(0.27, 0.27, 1);
      face.position.y = -0.04;
      const top = new THREE.Group();
      const topMat = new THREE.MeshPhysicalMaterial({ color: shellColor(info.g, c.img), roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.2, emissive: shellColor(info.g, c.img), emissiveIntensity: 0 });
      const topMesh = new THREE.Mesh(sphereTop, topMat);
      topMesh.castShadow = true;
      topMesh.userData.sid = sid;
      // 뚜껑이 뒤쪽 경첩을 중심으로 열려요
      topMesh.position.z = R;
      top.position.z = -R;
      top.add(topMesh);
      const ring = new THREE.Mesh(ringG, WHITE);
      ring.rotation.x = Math.PI / 2;
      g.add(bot, face, top, ring);
      const q = new THREE.Sprite(new THREE.SpriteMaterial({ map: qTex, depthWrite: false }));
      q.scale.set(0.28, 0.28, 1);
      q.position.y = 0.46;
      q.visible = false;
      g.add(q);
      scene.add(g);
      const o: CapObj = { g, top, q, tag: null, name: null, cur: new THREE.Vector3(), tw: null, last: '', scale: 1, openT: 0, st: c.st, jig: null, topMat, phase: Math.random() * Math.PI * 2 };
      capObjs.set(sid, o);
      return o;
    };

    // 반짝이 조각
    const parts: { sp: THREE.Sprite; v: THREE.Vector3; t0: number }[] = [];
    const seenBursts = new Set<number>();
    const confettiTex = ['#fde047', '#f472b6', '#60a5fa', '#34d399', '#a78bfa'].map((col) =>
      canvasTexture(32, 32, (c) => {
        c.fillStyle = col;
        c.beginPath();
        c.moveTo(16, 2);
        c.lineTo(20, 12);
        c.lineTo(30, 13);
        c.lineTo(22, 20);
        c.lineTo(25, 30);
        c.lineTo(16, 24);
        c.lineTo(7, 30);
        c.lineTo(10, 20);
        c.lineTo(2, 13);
        c.lineTo(12, 12);
        c.closePath();
        c.fill();
      }),
    );

    // ✨ 반짝이 풀
    const twinkleTex = ['#ffffff', '#fde047', '#f9a8d4', '#a5f3fc', '#c4b5fd'].map((col) =>
      canvasTexture(64, 64, (c) => {
        const g = c.createRadialGradient(32, 32, 0, 32, 32, 30);
        g.addColorStop(0, col);
        g.addColorStop(0.25, col);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(32, 0);
        c.quadraticCurveTo(36, 28, 64, 32);
        c.quadraticCurveTo(36, 36, 32, 64);
        c.quadraticCurveTo(28, 36, 0, 32);
        c.quadraticCurveTo(28, 28, 32, 0);
        c.fill();
      }),
    );
    const twinkles = Array.from({ length: 14 }, () => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: twinkleTex[0], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      sp.visible = false;
      scene.add(sp);
      return { sp, t0: 0, life: 600, size: 0.2 };
    });
    let lastTwinkle = 0;

    // ── 루미 · 크레인 따라가기 상태 ──
    const lumiCur = new THREE.Vector3(WX(propsRef.current.lumi.x), 0, WZ(propsRef.current.lumi.y));
    let lumiTw: { from: THREE.Vector3; to: THREE.Vector3; t0: number; dur: number } | null = null;
    let lumiLast = '';
    let lumiFace = '';
    let lumiActT0 = 0;
    let lumiAct = 'idle';
    const clawCur = new THREE.Vector3(WX(propsRef.current.claw.x), LIFT + 0.4, WZ(propsRef.current.claw.y));
    let clawTw: { from: THREE.Vector3; to: THREE.Vector3; t0: number; dur: number } | null = null;
    let clawLast = '';
    let clawOpen = 1;
    let shakeT0 = -1;
    let prevClawZ = 1;
    let prevClawOpen = true;
    let btnT0 = -1;
    const prevClawPos = new THREE.Vector3().copy(clawCur);

    /** 무대 좌표 (x,y) 에 있는 바닥 높이 (책상 위 / 캡슐 상자 / 바닥) */
    const surfaceAt = (sx: number, sy: number) => {
      if (sy >= 650) return TRAY_TOP;
      const L = propsRef.current.layout;
      const onDesk = L.slots.some((s) => sx >= s.x - 4 && sx <= s.x + s.w + 4 && sy >= s.y - 4 && sy <= s.y + s.h + 4);
      return onDesk ? DESK_H + 0.03 : 0;
    };
    const capTarget = (c: Cap3, sid: number): THREE.Vector3 => {
      const p = propsRef.current;
      if (c.by === 'lumi') return new THREE.Vector3(WX(c.x), 1.32, WZ(c.y));
      let sx = c.x;
      const isOpen = p.reveal === 'show' ? c.st === 'desk' : p.opened.has(sid);
      if (c.st === 'desk' && isOpen) {
        const sl = p.layout.slots.find((s) => s.key === p.map[sid]);
        if (sl) sx = sl.x + Math.min(30, sl.w * 0.18);
      }
      const base = surfaceAt(sx, c.y) + R * (c.st === 'desk' ? 0.9 : 1) + (c.st === 'pile' && c.stack ? R * 1.45 : 0);
      if (c.z) return new THREE.Vector3(WX(sx), base + (LIFT - base) * Math.min(1, c.z), WZ(c.y));
      return new THREE.Vector3(WX(sx), base, WZ(c.y));
    };

    // ── 프롭이 바뀔 때마다 목표 갱신 ──
    const sync = () => {
      const p = propsRef.current;
      const now = performance.now();
      // 캡슐 목록 맞추기
      capObjs.forEach((o, sid) => {
        if (!p.caps[sid]) {
          scene.remove(o.g);
          capObjs.delete(sid);
        }
      });
      chalkNames.forEach((_, sid) => {
        if (!p.caps[sid] || p.caps[sid].st !== 'desk') chalkNames.delete(sid);
      });
      if ((p.signKey ?? 0) !== lastSignKey) {
        lastSignKey = p.signKey ?? 0;
        signPending = true;
      }
      p.order.forEach((sid) => {
        const c = p.caps[sid];
        if (!c) return;
        const o = capObjs.get(sid) || makeCap(sid);
        const tgt = capTarget(c, sid);
        const key = `${tgt.x.toFixed(3)},${tgt.y.toFixed(3)},${tgt.z.toFixed(3)},${c.st}`;
        if (key !== o.last) {
          if (!o.last || c.dur <= 0) {
            o.cur.copy(tgt);
            o.tw = null;
          } else {
            o.tw = { from: o.cur.clone(), to: tgt, t0: now, dur: c.dur, ease: c.st === 'fall' ? bounce : easeInOut };
          }
          o.last = key;
        }
        const info = p.names[sid];
        const isOpen = p.reveal === 'show' ? c.st === 'desk' : p.opened.has(sid);
        o.scale = c.st === 'desk' ? (isOpen ? 0.62 : 0.95) : 1;
        o.q.visible = p.reveal === 'hide' && c.st === 'desk' && !isOpen;
        // 이동 중 이름표 (이름 공개 모드)
        // 이름 공개 모드: 기다리는 캡슐에도 이름표
        const showTag = p.reveal === 'show' && c.st !== 'desk';
        if (showTag && !o.tag) {
          o.tag = labelSprite(info.name, info.g === 'M' ? '#1d4ed8' : info.g === 'F' ? '#be185d' : '#a16207', info.g === 'M' ? '#93c5fd' : info.g === 'F' ? '#f9a8d4' : '#fde68a', 0.62);
          o.g.add(o.tag);
        }
        if (o.tag) {
          const inPile = c.st === 'pile';
          o.tag.position.y = inPile ? 0.42 : -0.4;
          const k = inPile ? 0.5 : 0.62;
          o.tag.scale.set(1.3 * k, 0.41 * k, 1);
          o.tag.renderOrder = inPile ? 5 : 0;
          (o.tag.material as THREE.SpriteMaterial).depthTest = !inPile;
        }
        if (o.tag) o.tag.visible = showTag;
        // 하나가 뽑혀 나가면 옆 캡슐들이 밀려서 흔들
        if (o.st === 'pile' && c.st !== 'pile') {
          capObjs.forEach((q, qs) => {
            if (qs === sid || p.caps[qs]?.st !== 'pile') return;
            const dx = q.cur.x - o.cur.x;
            const dz = q.cur.z - o.cur.z;
            const d = Math.hypot(dx, dz);
            if (d < 1.1) q.jig = { t0: now + d * 120, dx: (dx / (d || 1)) * (1.1 - d) * 0.14, dz: (dz / (d || 1)) * (1.1 - d) * 0.14 };
          });
        }
        if (o.st !== 'desk' && c.st === 'desk') {
          const sl0 = p.layout.slots.find((q) => q.key === p.map[sid]);
          const sg = sl0?.teamId != null ? signs.find((x) => x.teamId === sl0.teamId) : undefined;
          if (sg) raiseSign(sg, now, 1600);
        }
        o.st = c.st;
        // ✏️ 칠판에 이름 새기기 (보이는 이름만)
        if (c.st === 'desk' && isOpen && !chalkNames.has(sid)) {
          const sl = p.layout.slots.find((q) => q.key === p.map[sid]);
          if (sl)
            chalkNames.set(sid, {
              t0: now + 250,
              text: info.name,
              x: chalkMap.ox + sl.x * chalkMap.k + 3,
              y: chalkMap.oy + sl.y * chalkMap.k + 3,
              w: sl.w * chalkMap.k - 6,
              h: sl.h * chalkMap.k - 6,
              col: info.g === 'M' ? '#bfdbfe' : info.g === 'F' ? '#fbcfe8' : '#fef9c3',
            });
        }
        if (chalkNames.has(sid) && !(c.st === 'desk' && isOpen)) chalkNames.delete(sid);
        // 자리에 앉으면 책상 위 이름표
        if (c.st === 'desk' && isOpen && !o.name) {
          const sl = p.layout.slots.find((s) => s.key === p.map[sid]);
          if (sl) {
            const col = info.g === 'M' ? '#1d4ed8' : info.g === 'F' ? '#be185d' : '#a16207';
            const bd = info.g === 'M' ? '#bfdbfe' : info.g === 'F' ? '#fbcfe8' : '#fde68a';
            o.name = labelSprite(info.name, col, bd, Math.min(1.1, (sl.w / 100) * 0.72));
            o.name.position.set(WX(sl.x + sl.w / 2) + 0.14, DESK_H + 0.26, WZ(sl.y + sl.h / 2) + 0.05);
            o.name.userData.t0 = now;
            o.name.scale.multiplyScalar(0.01);
            o.name.userData.full = Math.min(1.1, (sl.w / 100) * 0.72);
            scene.add(o.name);
          }
        }
        if (o.name && !(c.st === 'desk' && isOpen)) {
          scene.remove(o.name);
          o.name = null;
        }
      });
      // 크레인
      const cl = p.claw;
      const low = surfaceAt(cl.x, cl.y) + R * 2 + 0.42;
      const ct = new THREE.Vector3(WX(cl.x), low + (LIFT + 0.62 - low) * Math.min(1, cl.z), WZ(cl.y));
      // 🔘 내려갈 때 · 내려놓을 때 버튼이 꾹
      if ((prevClawZ > 0.5 && cl.z < 0.5) || (!prevClawOpen && cl.open)) btnT0 = now;
      prevClawZ = cl.z;
      prevClawOpen = cl.open;
      const ck = `${ct.x.toFixed(3)},${ct.y.toFixed(3)},${ct.z.toFixed(3)}`;
      if (ck !== clawLast) {
        clawTw = cl.dur > 0 && clawLast ? { from: clawCur.clone(), to: ct, t0: now, dur: cl.dur } : null;
        if (!clawTw) clawCur.copy(ct);
        clawLast = ck;
      }
      if (cl.shake && shakeT0 < 0) shakeT0 = now;
      if (!cl.shake) shakeT0 = -1;
      // 루미
      const lu = p.lumi;
      const lt = new THREE.Vector3(WX(lu.x), (lu.h || 0) * (DESK_H + 0.03), WZ(lu.y));
      const lk = `${lt.x.toFixed(3)},${lt.y.toFixed(3)},${lt.z.toFixed(3)}`;
      if (lk !== lumiLast) {
        lumiTw = lu.dur > 0 && lumiLast ? { from: lumiCur.clone(), to: lt, t0: now, dur: lu.dur } : null;
        if (!lumiTw) lumiCur.copy(lt);
        lumiLast = lk;
      }
      const fk = `${lu.face}:${p.tint.id}`;
      if (fk !== lumiFace) {
        lumiMat.map = mochiTexture(lu.face, p.tint);
        lumiMat.needsUpdate = true;
        lumiFace = fk;
      }
      if (lu.act !== lumiAct) {
        lumiAct = lu.act;
        lumiActT0 = now;
      }
      // 반짝이
      p.bursts.forEach((b) => {
        if (seenBursts.has(b.id)) return;
        seenBursts.add(b.id);
        const y0 = surfaceAt(b.x, b.y) + 0.35;
        for (let i = 0; i < 18; i++) {
          const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: confettiTex[i % confettiTex.length], transparent: true, depthWrite: false }));
          sp.scale.set(0.16, 0.16, 1);
          sp.position.set(WX(b.x), y0, WZ(b.y));
          const a = (i / 18) * Math.PI * 2;
          parts.push({ sp, v: new THREE.Vector3(Math.cos(a) * 1.4, 2.2 + Math.random() * 1.2, Math.sin(a) * 1.4), t0: now });
          scene.add(sp);
        }
      });
    };
    api.current = { sync };
    sync();

    // ── 클릭: 숨김 모드 캡슐 열기 ──
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects([...capObjs.values()].map((o) => o.g), true);
      const h = hits.find((x) => x.object.userData.sid != null || x.object.parent?.userData.sid != null);
      if (h) {
        let ob: THREE.Object3D | null = h.object;
        while (ob && ob.userData.sid == null) ob = ob.parent;
        if (ob) propsRef.current.onCapClick(ob.userData.sid);
      }
    };
    const onMove = (e: PointerEvent) => {
      if (propsRef.current.reveal !== 'hide') return;
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects([...capObjs.values()].filter((o) => o.q.visible).map((o) => o.g), true).length > 0;
      renderer.domElement.style.cursor = hit ? 'pointer' : '';
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);
    renderer.domElement.addEventListener('pointermove', onMove);

    // ── 카메라 ──
    const CAMS: Record<CamMode, { pos: THREE.Vector3; target: THREE.Vector3 }> = {
      all: { pos: new THREE.Vector3(0, 10.6, 13.6), target: new THREE.Vector3(0, 1.6, -0.3) },
      top: { pos: new THREE.Vector3(0, 17, 1.4), target: new THREE.Vector3(0, 0, -0.05) },
      follow: { pos: new THREE.Vector3(0, 6, 7), target: new THREE.Vector3(0, 0.8, 0) },
    };
    let camMode: CamMode = propsRef.current.cam;
    let camBlend = 1;

    // ── 그리기 ──
    let raf = 0;
    let last = performance.now();
    const v3 = new THREE.Vector3();
    const loop = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const p = propsRef.current;
      // 캡슐
      capObjs.forEach((o) => {
        if (o.tw) {
          const k = Math.min(1, (now - o.tw.t0) / o.tw.dur);
          const e = o.tw.ease(k);
          if (o.tw.ease === bounce) {
            o.cur.x = o.tw.from.x + (o.tw.to.x - o.tw.from.x) * Math.min(1, k * 1.6);
            o.cur.z = o.tw.from.z + (o.tw.to.z - o.tw.from.z) * Math.min(1, k * 1.6);
            o.cur.y = o.tw.from.y + (o.tw.to.y - o.tw.from.y) * e;
          } else o.cur.lerpVectors(o.tw.from, o.tw.to, e);
          if (k >= 1) o.tw = null;
        }
        o.g.position.copy(o.cur);
        const sidNow = o.g.userData.sid as number;
        // 루미가 들고 다닐 때는 루미 머리 위에 딱 붙어서
        if (p.caps[sidNow]?.by === 'lumi') o.g.position.set(lumiSp.position.x, lumiSp.position.y + 0.74, lumiSp.position.z + 0.05);
        // 밀려서 흔들흔들
        if (o.jig) {
          const t = (now - o.jig.t0) / 750;
          if (t >= 1) o.jig = null;
          else if (t > 0) {
            const k = Math.sin(t * Math.PI) * (1 - t * 0.3);
            o.g.position.x += o.jig.dx * k;
            o.g.position.z += o.jig.dz * k;
            o.g.position.y += Math.abs(Math.sin(t * Math.PI * 3)) * 0.05 * (1 - t);
            o.g.rotation.x = Math.sin(t * 22) * 0.35 * (1 - t);
          }
        } else o.g.rotation.x *= 0.85;
        // 반짝반짝 (캡슐마다 다른 박자로 살짝 빛나요)
        o.topMat.emissiveIntensity = Math.max(0, Math.sin(now / 700 + o.phase)) ** 6 * 0.45;
        const s = THREE.MathUtils.lerp(o.g.scale.x, o.scale, Math.min(1, dt * 8));
        o.g.scale.setScalar(s);
        const sid = o.g.userData.sid as number;
        const isOpen = p.reveal === 'show' ? p.caps[sid]?.st === 'desk' : p.opened.has(sid);
        o.openT = THREE.MathUtils.lerp(o.openT, isOpen ? 1 : 0, Math.min(1, dt * 7));
        o.top.rotation.x = -o.openT * 1.9;
        if (o.q.visible) {
          o.q.position.y = 0.46 + Math.sin(now / 300 + sid) * 0.05;
          o.g.rotation.z = Math.sin(now / 380 + sid) * 0.12;
        } else o.g.rotation.z *= 0.9;
        if (p.caps[sid]?.st === 'move' && p.caps[sid]?.z) o.g.rotation.y += dt * 1.2;
        if (o.name) {
          const t = Math.min(1, (now - o.name.userData.t0) / 450);
          const pop = t < 1 ? 1 + Math.sin(t * Math.PI) * 0.25 : 1;
          const full = o.name.userData.full as number;
          o.name.scale.set(1.3 * full * t * pop, 0.41 * full * t * pop, 1);
        }
      });
      // 🪧 팻말 쑥 올라왔다 내려가기 (통통 튀는 스프링)
      frameNo++;
      if (signPending && frameNo > 8) {
        signPending = false;
        signs.forEach((sg, i) => raiseSign(sg, now, 3000, 200 + i * 160));
      }
      signs.forEach((sg) => {
        let y = SIGN_DOWN;
        let wob = 0;
        if (now >= sg.tUp && now < sg.upUntil) {
          const k = Math.min(1, (now - sg.tUp) / 520);
          // 쑥 올라와서 살짝 튕기기
          const c1 = 2.2;
          const e = 1 + (c1 + 1) * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
          y = SIGN_DOWN * (1 - e);
          wob = (1 - k) * 0.12;
        } else if (now >= sg.upUntil && now < sg.upUntil + 420) {
          const k = (now - sg.upUntil) / 420;
          y = SIGN_DOWN * k * k;
        }
        sg.g.position.y = y;
        sg.g.visible = y > SIGN_DOWN + 0.01;
        sg.g.rotation.z = Math.sin(now / 70) * wob;
      });
      // ✏️ 칠판
      drawBoard(now);
      // ✨ 캡슐 반짝이 (여러 색 · 크기, 무작위 캡슐)
      if (now - lastTwinkle > 160 && capObjs.size) {
        lastTwinkle = now;
        const arr = [...capObjs.values()];
        const o = arr[Math.floor(Math.random() * arr.length)];
        const sp = twinkles.find((t) => !t.sp.visible);
        if (o && sp) {
          sp.sp.visible = true;
          sp.t0 = now;
          sp.life = 500 + Math.random() * 600;
          sp.size = 0.14 + Math.random() * 0.22;
          (sp.sp.material as THREE.SpriteMaterial).map = twinkleTex[Math.floor(Math.random() * twinkleTex.length)];
          sp.sp.position.set(o.g.position.x + (Math.random() - 0.5) * 0.36, o.g.position.y + 0.05 + Math.random() * 0.25, o.g.position.z + (Math.random() - 0.5) * 0.36);
        }
      }
      twinkles.forEach((t) => {
        if (!t.sp.visible) return;
        const k = (now - t.t0) / t.life;
        if (k >= 1) {
          t.sp.visible = false;
          return;
        }
        const sc = Math.sin(k * Math.PI) * t.size;
        t.sp.scale.set(sc, sc, 1);
        (t.sp.material as THREE.SpriteMaterial).rotation = k * 3;
      });
      // 🕹 조이스틱: 크레인이 가는 쪽으로
      const vx = (clawCur.x - prevClawPos.x) / Math.max(dt, 0.001);
      const vz = (clawCur.z - prevClawPos.z) / Math.max(dt, 0.001);
      prevClawPos.copy(clawCur);
      joyG.rotation.z = THREE.MathUtils.lerp(joyG.rotation.z, THREE.MathUtils.clamp(-vx * 0.09, -0.5, 0.5), Math.min(1, dt * 10));
      joyG.rotation.x = THREE.MathUtils.lerp(joyG.rotation.x, THREE.MathUtils.clamp(vz * 0.09, -0.5, 0.5), Math.min(1, dt * 10));
      // 🔘 버튼 눌림
      const press = btnT0 > 0 ? Math.max(0, 1 - (now - btnT0) / 380) : 0;
      bigBtn.position.y = 0.22 - 0.09 * Math.min(1, press * 1.6);
      btnMat.emissiveIntensity = press * 0.9;
      // 📟 LCD · 간판
      drawLcd(p.done, p.order.length, Math.floor(now / 600) % 2 === 0);
      drawSign(p.owner);
      const flick = Math.floor(now / 90) % 37 === 0 ? 0.55 : Math.floor(now / 70) % 53 === 0 ? 0.75 : 1;
      signMat.color.setScalar(flick);
      const chase = Math.floor(now / 110);
      signBulbs.forEach((b, i) => ((b.material as THREE.MeshStandardMaterial).emissiveIntensity = (i + chase) % 4 === 0 ? 2 : 0.25));
      // 크레인
      if (clawTw) {
        const k = Math.min(1, (now - clawTw.t0) / clawTw.dur);
        clawCur.lerpVectors(clawTw.from, clawTw.to, easeInOut(k));
        if (k >= 1) clawTw = null;
      }
      const shake = shakeT0 > 0 && now - shakeT0 < 700 ? Math.sin((now - shakeT0) / 25) * 0.08 : 0;
      clawG.position.set(clawCur.x + shake, clawCur.y, clawCur.z);
      bridge.position.z = clawCur.z;
      trolley.position.set(clawCur.x + shake, BRIDGE_Y - 0.12, clawCur.z);
      const len = Math.max(0.05, BRIDGE_Y - 0.25 - clawCur.y);
      cable.scale.y = len;
      cable.position.set(clawCur.x + shake, clawCur.y + 0.25 + len / 2, clawCur.z);
      clawOpen = THREE.MathUtils.lerp(clawOpen, p.claw.open ? 1 : 0, Math.min(1, dt * 10));
      prongs.forEach((a) => (a.rotation.x = 0.15 + clawOpen * 0.55));
      // 루미
      let hopArc = 0;
      if (lumiTw) {
        const k = Math.min(1, (now - lumiTw.t0) / lumiTw.dur);
        lumiCur.lerpVectors(lumiTw.from, lumiTw.to, lumiAct === 'hop' ? easeInOut(k) : k);
        if (lumiAct === 'hop') hopArc = Math.sin(k * Math.PI) * 0.75;
        if (k >= 1) lumiTw = null;
      }
      const at = (now - lumiActT0) / 1000;
      let ly = 0;
      let rot = 0;
      let sx = 1;
      let sy = 1;
      switch (lumiAct) {
        case 'walk':
          ly = Math.abs(Math.sin(now / 130)) * 0.14;
          rot = Math.sin(now / 130) * 0.12;
          break;
        case 'jump':
        case 'heart':
          ly = Math.max(0, Math.sin(Math.min(1, at / 0.9) * Math.PI * 2)) * 0.5;
          break;
        case 'bump':
          ly = Math.max(0, Math.sin(Math.min(1, at / 0.5) * Math.PI)) * 0.45;
          rot = -0.35 * Math.sin(Math.min(1, at / 0.5) * Math.PI);
          break;
        case 'spin':
          sx = Math.cos(Math.min(1, at / 0.8) * Math.PI * 2);
          break;
        case 'cheer':
          ly = Math.abs(Math.sin(at * 9)) * 0.25;
          sx = sy = 1 + Math.abs(Math.sin(at * 9)) * 0.08;
          break;
        case 'clap':
          rot = Math.sin(at * 30) * 0.15;
          break;
        default:
          sy = 1 + Math.sin(now / 400) * 0.03;
          sx = 2 - sy;
      }
      lumiSp.position.set(lumiCur.x, lumiCur.y + 0.66 + ly + hopArc, lumiCur.z);
      lumiSp.scale.set(1.3 * sx * (p.lumi.flip ? -1 : 1), 1.3 * sy, 1);
      lumiMat.rotation = rot;
      lumiShadow.position.set(lumiCur.x, lumiCur.y + 0.012, lumiCur.z);
      lumiShadow.scale.setScalar(1 - ly * 0.6);
      heart.visible = lumiAct === 'heart' && at < 1;
      heart.position.set(lumiCur.x, 1.25 + at * 0.6, lumiCur.z);
      // 말풍선 (화면 좌표로)
      const bub = bubbleRef.current;
      if (bub) {
        if (p.lumi.bubble) {
          v3.set(lumiCur.x, 1.25 + ly, lumiCur.z).project(camera);
          bub.style.display = 'block';
          bub.style.transform = `translate(${((v3.x + 1) / 2) * el.clientWidth}px, ${((1 - v3.y) / 2) * el.clientHeight}px) translate(-50%, -100%)`;
          if (bub.textContent !== p.lumi.bubble) bub.textContent = p.lumi.bubble;
        } else bub.style.display = 'none';
      }
      // 전구 깜빡
      const blink = Math.floor(now / 450) % 2;
      bulbs.forEach((b, i) => ((b.material as THREE.MeshStandardMaterial).emissiveIntensity = (i + blink) % 2 ? 1.4 : 0.2));
      // 반짝이
      for (let i = parts.length - 1; i >= 0; i--) {
        const q = parts[i];
        const t = (now - q.t0) / 1000;
        q.v.y -= 6 * dt;
        q.sp.position.addScaledVector(q.v, dt);
        (q.sp.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - t / 1.1);
        (q.sp.material as THREE.SpriteMaterial).rotation += dt * 6;
        if (t > 1.1) {
          scene.remove(q.sp);
          parts.splice(i, 1);
        }
      }
      // 카메라
      if (p.cam !== camMode) {
        camMode = p.cam;
        camBlend = 0;
        controls.enabled = camMode === 'all';
      }
      if (camMode === 'follow') {
        const tgt = new THREE.Vector3(clawCur.x * 0.85, 0.6, clawCur.z);
        const pos = new THREE.Vector3(clawCur.x * 0.7, 5.2, clawCur.z + 6.2);
        camera.position.lerp(pos, Math.min(1, dt * 2.2));
        controls.target.lerp(tgt, Math.min(1, dt * 2.6));
      } else if (camBlend < 1) {
        camBlend = Math.min(1, camBlend + dt * 1.4);
        camera.position.lerp(CAMS[camMode].pos, camBlend);
        controls.target.lerp(CAMS[camMode].target, camBlend);
      }
      camera.lookAt(controls.target);
      if (camMode === 'all') controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onResize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / el.clientHeight;
      // 화면이 좁으면 조금 더 멀리서
      camera.fov = camera.aspect < 1.5 ? 54 : 48;
      camera.updateProjectionMatrix();
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      renderer.domElement.removeEventListener('pointermove', onMove);
      controls.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
      api.current = null;
    };
  }, [props.layout]); // eslint-disable-line react-hooks/exhaustive-deps

  // 프롭이 바뀔 때마다 3D 목표 갱신
  useEffect(() => {
    api.current?.sync();
  });

  return (
    <div className="sd3-wrap">
      <div ref={mountRef} className="sd3-gl" data-sd3 />
      <div ref={bubbleRef} className="sd3-bubble" />
    </div>
  );
};

export default SeatDraw3D;
