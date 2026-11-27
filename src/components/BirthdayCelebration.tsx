import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
import { MochiBody, useMochiTint, type MochiFace } from './MochiCharacter';
import { playCelebrateSound } from '../utils/audio';
import type { BirthdayKid } from '../utils/celebrate';

/**
 * ============================================================================
 * 🎂 보조창 생일 축하 화면
 * ============================================================================
 *  ① 고깔모자를 쓴 루미가 통통 등장
 *  ② 폭죽(파티 크래커)을 '펑!' → 색종이·불꽃
 *  ③ 두루마리 현수막을 좌르륵 펼쳐 생일 친구 이름 공개
 *  배경: 위·아래 깃발 가랜드에 "생일 축하합니다" 글자가 한 장씩 펼쳐지고, 풍선이 둥실둥실
 *  - 아무 곳이나 누르면 닫혀요 (30초 뒤 자동으로 닫힘)
 */

type Phase = 'enter' | 'pop' | 'banner';
const LETTERS = ['생', '일', '축', '하', '합', '니', '다', '🎉'];
const FLAG_COLORS = ['#FF8FB0', '#FFC53D', '#7DD3FC', '#A78BFA', '#86EFAC', '#FDA4AF', '#FCD34D', '#C4B5FD'];
const BALLOONS = ['#FF8FB0', '#7DD3FC', '#FFC53D', '#A78BFA', '#86EFAC', '#FB923C', '#F472B6'];

const PartyHat: React.FC = () => (
  <svg viewBox="0 0 60 70" className="bd-hat" aria-hidden>
    <defs>
      <linearGradient id="bd-hat-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FF8FB0" />
        <stop offset="100%" stopColor="#A78BFA" />
      </linearGradient>
    </defs>
    <path d="M30 6 L54 62 Q30 70 6 62 Z" fill="url(#bd-hat-g)" stroke="#7c3aed" strokeWidth="2" strokeLinejoin="round" />
    <path d="M18 34 L42 34" stroke="#FFF7AE" strokeWidth="5" strokeLinecap="round" />
    <path d="M12 50 L48 50" stroke="#7DD3FC" strokeWidth="5" strokeLinecap="round" />
    <circle cx="22" cy="24" r="2.4" fill="#fff" />
    <circle cx="38" cy="44" r="2.4" fill="#fff" />
    <circle cx="30" cy="6" r="7" fill="#FFC53D" stroke="#e0a100" strokeWidth="1.5" />
  </svg>
);

export const BirthdayCelebration: React.FC<{ kids: BirthdayKid[]; onClose: () => void }> = ({ kids, onClose }) => {
  const [tint] = useMochiTint();
  const [phase, setPhase] = useState<Phase>('enter');
  const [blink, setBlink] = useState(false);
  // 보조창은 시계 때문에 1초마다 다시 그려지므로, 닫기 함수가 바뀌어도 연출이 처음부터 다시 시작되지 않게 ref 로 보관
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const close = () => closeRef.current();

  useEffect(() => {
    const burst = (opts: confetti.Options) => {
      try {
        confetti({ zIndex: 100001, ...opts });
      } catch {}
    };
    const t1 = window.setTimeout(() => {
      setPhase('pop');
      try {
        playCelebrateSound();
      } catch {}
      burst({ particleCount: 140, spread: 80, startVelocity: 48, origin: { x: 0.5, y: 0.62 } });
      window.setTimeout(() => {
        burst({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0, y: 0.75 } });
        burst({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1, y: 0.75 } });
      }, 280);
    }, 1100);
    const t2 = window.setTimeout(() => setPhase('banner'), 2300);
    // 펼쳐진 뒤에도 가끔 불꽃
    const loop = window.setInterval(() => {
      burst({ particleCount: 40, spread: 100, startVelocity: 30, origin: { x: 0.15 + Math.random() * 0.7, y: 0.2 + Math.random() * 0.2 }, shapes: ['star'], scalar: 1.1 });
    }, 3200);
    const auto = window.setTimeout(close, 30000);
    const b = window.setInterval(() => {
      setBlink(true);
      window.setTimeout(() => setBlink(false), 140);
    }, 2800);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', key);
    return () => {
      [t1, t2, auto].forEach(clearTimeout);
      clearInterval(loop);
      clearInterval(b);
      window.removeEventListener('keydown', key);
      try {
        confetti.reset();
      } catch {}
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const face: MochiFace = phase === 'enter' ? 'happy' : 'excited';
  const names = kids.map((k) => k.name);
  const title = names.length > 2 ? `${names.slice(0, 2).join(' · ')} 외 ${names.length - 2}명` : names.join(' · ');

  const garland = (key: string, delay = 0) => (
    <div className={`bd-garland ${key}`}>
      <svg className="bd-garland-rope" viewBox="0 0 1000 60" preserveAspectRatio="none" aria-hidden>
        <path d="M0 8 Q500 70 1000 8" fill="none" stroke="#c084fc" strokeWidth="3" strokeDasharray="6 5" />
      </svg>
      <div className="bd-flags">
        {LETTERS.map((ch, i) => (
          <span
            key={i}
            className="bd-flag"
            style={{ background: FLAG_COLORS[i % FLAG_COLORS.length], animationDelay: `${delay + i * 0.14}s`, marginTop: `${Math.sin((i / (LETTERS.length - 1)) * Math.PI) * 26}px` }}
          >
            <b>{ch}</b>
          </span>
        ))}
      </div>
    </div>
  );

  return createPortal(
    <div className={`bd-overlay is-${phase}`} onClick={close} role="dialog" aria-label="생일 축하">
      {/* 풍선 */}
      <div className="bd-balloons" aria-hidden>
        {BALLOONS.concat(BALLOONS).map((c, i) => (
          <span
            key={i}
            className="bd-balloon"
            style={{ left: `${(i * 7.3 + 3) % 96}%`, background: c, animationDelay: `${(i % 7) * 0.9}s`, animationDuration: `${9 + (i % 5)}s` }}
          />
        ))}
      </div>

      {garland('top', 0.2)}
      {garland('bottom', 0.6)}

      <div className="bd-center" onClick={(e) => e.stopPropagation()}>
        {/* 두루마리 현수막 */}
        <div className="bd-scroll">
          <span className="bd-rod left" />
          <div className="bd-paper">
            <div className="bd-paper-sub">🎂 오늘의 주인공 🎂</div>
            <div className="bd-paper-name">{title}</div>
            <div className="bd-paper-msg">생일 축하해! 🎉</div>
            {kids.length <= 3 && (
              <div className="bd-paper-num">{kids.map((k) => `${k.number}번`).join(' · ')}</div>
            )}
          </div>
          <span className="bd-rod right" />
        </div>

        {/* 고깔모자 루미 + 폭죽 */}
        <div className="bd-lumi">
          <div className="bd-lumi-body">
            <MochiBody face={face} tint={tint} blinking={blink} glow="low" className="w-full h-full" />
            <PartyHat />
          </div>
          <div className="bd-popper" aria-hidden>
            <svg viewBox="0 0 40 40">
              <path d="M6 36 L30 10 L34 24 Z" fill="#FFC53D" stroke="#e0a100" strokeWidth="2" strokeLinejoin="round" />
              <path d="M12 30 L26 15" stroke="#FF8FB0" strokeWidth="3" />
            </svg>
            <span className="bd-pop-burst">
              {Array.from({ length: 10 }).map((_, i) => (
                <i key={i} style={{ transform: `rotate(${i * 36}deg)`, background: FLAG_COLORS[i % FLAG_COLORS.length] }} />
              ))}
            </span>
          </div>
          {phase === 'pop' && <span className="bd-bang">펑!</span>}
        </div>
      </div>

      {/* 불꽃 링 */}
      <div className="bd-fireworks" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`bd-fw fw${i}`}>
            {Array.from({ length: 12 }).map((_, j) => (
              <i key={j} style={{ transform: `rotate(${j * 30}deg)` }} />
            ))}
          </span>
        ))}
      </div>

      <button type="button" className="bd-close" onClick={close}>
        닫기 ✕
      </button>
    </div>,
    document.body
  );
};

export default BirthdayCelebration;
