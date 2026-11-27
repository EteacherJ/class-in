import React, { useEffect, useState } from 'react';
import { MochiBody, MochiFace, useMochiTint } from './MochiCharacter';

/**
 * 🚪 루미의 작은 문 (대시보드 접기/펼치기 아이콘)
 * - closed: 문이 닫혀 있고 루미가 문 옆에서 빼꼼
 * - open:   문이 활짝 열림 (대시보드가 들어가거나 나올 때)
 * - hover:  문이 살짝 열리고 루미가 손 인사
 */
export type DoorState = 'closed' | 'ajar' | 'open';

export const LumiDoor: React.FC<{ state: DoorState; size?: number; face?: MochiFace; showLumi?: boolean; className?: string }> = ({
  state,
  size = 96,
  face,
  showLumi = true,
  className = '',
}) => {
  const [tint] = useMochiTint();
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    const t = window.setInterval(() => {
      setBlink(true);
      window.setTimeout(() => setBlink(false), 140);
    }, 3600);
    return () => clearInterval(t);
  }, []);
  const lumiFace: MochiFace = face ?? (state === 'open' ? 'excited' : state === 'ajar' ? 'happy' : 'normal');

  return (
    <div className={`lumi-door is-${state} ${className}`} style={{ width: size, height: size }}>
      {/* 문틀 + 문 안쪽 빛 */}
      <svg viewBox="0 0 100 100" className="lumi-door-svg" aria-hidden>
        <defs>
          <radialGradient id="ld-glow" cx="50%" cy="60%" r="60%">
            <stop offset="0%" stopColor="#fff7d6" />
            <stop offset="55%" stopColor="#ffd6f0" />
            <stop offset="100%" stopColor="#b9a6ff" />
          </radialGradient>
          <linearGradient id="ld-frame" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e6e0ff" />
          </linearGradient>
        </defs>
        {/* 그림자 */}
        <ellipse cx="50" cy="93" rx="30" ry="4" fill="rgba(60,40,120,0.18)" />
        {/* 문틀 (아치) */}
        <path d="M24 92 V40 A26 26 0 0 1 76 40 V92 Z" fill="url(#ld-frame)" stroke="rgba(120,100,200,0.45)" strokeWidth="2" />
        {/* 문 안쪽 (빛) */}
        <path d="M30 90 V41 A20 20 0 0 1 70 41 V90 Z" fill="url(#ld-glow)" className="lumi-door-inside" />
        <g className="lumi-door-sparkles">
          <circle cx="42" cy="58" r="1.6" fill="#fff" />
          <circle cx="58" cy="50" r="1.2" fill="#fff" />
          <circle cx="52" cy="72" r="1.4" fill="#fff" />
        </g>
      </svg>
      {/* 여닫히는 문짝 (3D 회전) */}
      <div className="lumi-door-panel-wrap">
        <div className="lumi-door-panel">
          <span className="lumi-door-knob" />
          <span className="lumi-door-window" />
        </div>
      </div>
      {/* 문 옆에서 빼꼼하는 루미 */}
      {showLumi && (
        <div className="lumi-door-lumi">
          <MochiBody face={lumiFace} tint={tint} blinking={blink} glow="low" className="w-full h-full" />
        </div>
      )}
    </div>
  );
};

export default LumiDoor;
