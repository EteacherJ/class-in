/**
 * 🥚 뽑기 캡슐 — 위쪽 껍질 색: 남학생(파랑 계열) · 여학생(분홍 계열) · 미지정(노랑 계열)
 *  아래쪽 투명 껍질 안에 동물 · 과일 · 별 그림 10가지, 껍질 무늬 3가지
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Gender } from './seatLogic';

const SHELL: Record<Gender, string[]> = {
  M: ['#60a5fa', '#38bdf8', '#818cf8', '#2dd4bf'],
  F: ['#f472b6', '#fb7185', '#f0abfc', '#fda4af'],
  A: ['#fbbf24', '#a3e635', '#fdba74', '#c4b5fd'],
};
export const shellColor = (g: Gender, img: number) => SHELL[g][img % SHELL[g].length];

const FACES = ['bear', 'rabbit', 'cat', 'chick', 'frog', 'panda', 'penguin', 'fox', 'star', 'berry'] as const;
export const FACE_COUNT = FACES.length;

const Eyes = ({ y = 41, dx = 4, c = '#3b2f2f' }: { y?: number; dx?: number; c?: string }) => (
  <>
    <circle cx={30 - dx} cy={y} r={1.6} fill={c} />
    <circle cx={30 + dx} cy={y} r={1.6} fill={c} />
  </>
);
const Blush = ({ y = 44 }: { y?: number }) => (
  <>
    <ellipse cx={23} cy={y} rx={2.2} ry={1.3} fill="#fb7185" opacity={0.55} />
    <ellipse cx={37} cy={y} rx={2.2} ry={1.3} fill="#fb7185" opacity={0.55} />
  </>
);

function Face({ k }: { k: (typeof FACES)[number] }) {
  switch (k) {
    case 'bear':
      return (
        <g>
          <circle cx={21} cy={34} r={4} fill="#b7794b" />
          <circle cx={39} cy={34} r={4} fill="#b7794b" />
          <circle cx={30} cy={42} r={10} fill="#c98d5c" />
          <ellipse cx={30} cy={45.5} rx={4.5} ry={3.4} fill="#f3d9bf" />
          <Eyes />
          <circle cx={30} cy={44.5} r={1.3} fill="#3b2f2f" />
          <Blush />
        </g>
      );
    case 'rabbit':
      return (
        <g>
          <ellipse cx={25} cy={30} rx={3} ry={7} fill="#fff" stroke="#e5e7eb" />
          <ellipse cx={35} cy={30} rx={3} ry={7} fill="#fff" stroke="#e5e7eb" />
          <ellipse cx={25} cy={30} rx={1.4} ry={4.5} fill="#fbcfe8" />
          <ellipse cx={35} cy={30} rx={1.4} ry={4.5} fill="#fbcfe8" />
          <circle cx={30} cy={43} r={9.5} fill="#fff" stroke="#e5e7eb" />
          <Eyes y={42} />
          <path d="M28.5 45.5 Q30 47 31.5 45.5" stroke="#f472b6" strokeWidth={1.2} fill="none" />
          <Blush y={45} />
        </g>
      );
    case 'cat':
      return (
        <g>
          <path d="M21 37 L22 29 L28 34 Z M39 37 L38 29 L32 34 Z" fill="#fb923c" />
          <circle cx={30} cy={42} r={10} fill="#fdba74" />
          <Eyes />
          <path d="M27.5 45 Q30 47.5 32.5 45" stroke="#7c2d12" strokeWidth={1.1} fill="none" />
          <path d="M18 43 H24 M18 46 H24 M36 43 H42 M36 46 H42" stroke="#9a3412" strokeWidth={0.7} />
        </g>
      );
    case 'chick':
      return (
        <g>
          <path d="M28 31 Q30 27 32 31" stroke="#f59e0b" strokeWidth={1.6} fill="none" />
          <circle cx={30} cy={42} r={10} fill="#fde047" />
          <Eyes y={40} />
          <path d="M27.5 43.5 L32.5 43.5 L30 47 Z" fill="#fb923c" />
          <Blush y={45} />
        </g>
      );
    case 'frog':
      return (
        <g>
          <circle cx={24} cy={35} r={4.3} fill="#86efac" />
          <circle cx={36} cy={35} r={4.3} fill="#86efac" />
          <ellipse cx={30} cy={43} rx={11} ry={8.5} fill="#86efac" />
          <circle cx={24} cy={35} r={1.8} fill="#14532d" />
          <circle cx={36} cy={35} r={1.8} fill="#14532d" />
          <path d="M25 45 Q30 49 35 45" stroke="#14532d" strokeWidth={1.2} fill="none" />
          <Blush y={45} />
        </g>
      );
    case 'panda':
      return (
        <g>
          <circle cx={21.5} cy={34} r={3.8} fill="#1f2937" />
          <circle cx={38.5} cy={34} r={3.8} fill="#1f2937" />
          <circle cx={30} cy={42} r={10} fill="#fff" stroke="#e5e7eb" />
          <ellipse cx={25.5} cy={41} rx={2.8} ry={3.4} fill="#1f2937" />
          <ellipse cx={34.5} cy={41} rx={2.8} ry={3.4} fill="#1f2937" />
          <circle cx={25.5} cy={40.6} r={0.9} fill="#fff" />
          <circle cx={34.5} cy={40.6} r={0.9} fill="#fff" />
          <ellipse cx={30} cy={45.5} rx={1.6} ry={1.1} fill="#1f2937" />
        </g>
      );
    case 'penguin':
      return (
        <g>
          <circle cx={30} cy={42} r={10.5} fill="#334155" />
          <ellipse cx={30} cy={44} rx={7.5} ry={7} fill="#fff" />
          <Eyes y={41} dx={3.5} />
          <path d="M28.3 44 L31.7 44 L30 46.4 Z" fill="#f59e0b" />
          <Blush y={45.5} />
        </g>
      );
    case 'fox':
      return (
        <g>
          <path d="M20 38 L21.5 28 L28 34 Z M40 38 L38.5 28 L32 34 Z" fill="#f97316" />
          <path d="M20 39 Q30 30 40 39 Q38 51 30 52 Q22 51 20 39 Z" fill="#fb923c" />
          <path d="M22 42 Q26 44 30 51 Q34 44 38 42 Q34 48 30 51 Q26 48 22 42 Z" fill="#fff" />
          <Eyes y={41} />
          <circle cx={30} cy={47.5} r={1.3} fill="#3b2f2f" />
        </g>
      );
    case 'star':
      return (
        <g>
          <path d="M30 30 L33.2 37.5 L41 38 L35 43 L37 51 L30 46.6 L23 51 L25 43 L19 38 L26.8 37.5 Z" fill="#fde047" stroke="#f59e0b" strokeWidth={1} strokeLinejoin="round" />
          <Eyes y={41.5} dx={3} />
          <path d="M28.5 44 Q30 45.5 31.5 44" stroke="#92400e" strokeWidth={1} fill="none" />
        </g>
      );
    default:
      return (
        <g>
          <path d="M30 33 Q40 33 40 41 Q39 50 30 53 Q21 50 20 41 Q20 33 30 33 Z" fill="#f43f5e" />
          <path d="M24 33 Q30 28 36 33 Q30 36 24 33 Z" fill="#22c55e" />
          {[
            [25, 40],
            [30, 38],
            [35, 40],
            [27, 45],
            [33, 45],
            [30, 49],
          ].map(([x, y], i) => (
            <ellipse key={i} cx={x} cy={y} rx={0.8} ry={1.2} fill="#fde68a" />
          ))}
        </g>
      );
  }
}

export const CapsuleSVG: React.FC<{ gender: Gender; img: number; open?: boolean; size?: number; mark?: string }> = ({ gender, img, open, size = 56, mark }) => {
  const c = shellColor(gender, img);
  const pat = img % 3;
  const id = `cap${gender}${img}`;
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} className={`sd-cap-svg ${open ? 'is-open' : ''}`} aria-hidden>
      <defs>
        <clipPath id={`${id}-top`}>
          <path d="M4 31 A26 26 0 0 1 56 31 Z" />
        </clipPath>
        <radialGradient id={`${id}-g`} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fff" stopOpacity={0.65} />
          <stop offset="0.45" stopColor={c} stopOpacity={1} />
          <stop offset="1" stopColor={c} stopOpacity={1} />
        </radialGradient>
      </defs>
      {/* 아래 투명 껍질 + 그림 */}
      <path d="M4 31 A26 26 0 0 0 56 31 Z" fill="rgba(255,255,255,0.78)" stroke="rgba(148,163,184,0.55)" strokeWidth={1.2} />
      <g transform="translate(0 -1)">
        <Face k={FACES[img % FACES.length]} />
      </g>
      {/* 위 색 껍질 */}
      <g className="sd-cap-top">
        <path d="M4 31 A26 26 0 0 1 56 31 Z" fill={`url(#${id}-g)`} stroke="rgba(0,0,0,0.12)" strokeWidth={1} />
        <g clipPath={`url(#${id}-top)`} opacity={0.35} fill="#fff">
          {pat === 0 && [10, 22, 34, 46].map((x, i) => <circle key={i} cx={x} cy={i % 2 ? 14 : 22} r={2.6} />)}
          {pat === 1 && [0, 12, 24, 36, 48].map((x, i) => <rect key={i} x={x} y={0} width={5} height={40} transform="rotate(25 30 15)" />)}
          {pat === 2 && [16, 30, 44].map((x, i) => <path key={i} d={`M${x} ${i % 2 ? 12 : 20} l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z`} />)}
        </g>
        <rect x={3} y={29} width={54} height={4} rx={2} fill="rgba(255,255,255,0.9)" stroke="rgba(0,0,0,0.08)" />
        <ellipse cx={20} cy={14} rx={7} ry={3.2} fill="#fff" opacity={0.55} transform="rotate(-25 20 14)" />
        {mark && (
          <text x={30} y={24} textAnchor="middle" fontSize={15} fontWeight={900} fill="#fff" style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.2)', strokeWidth: 2 }}>
            {mark}
          </text>
        )}
      </g>
    </svg>
  );
};

/** 3D 캡슐 안에 넣을 그림 (SVG 문자열) */
export function faceSvg(img: number): string {
  const body = renderToStaticMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="15 25 30 30" width={128} height={128}>
      <Face k={FACES[img % FACES.length]} />
    </svg>,
  );
  return body;
}
