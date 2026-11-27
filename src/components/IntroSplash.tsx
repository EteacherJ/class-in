import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PastelSkyBackground } from './PastelSkyBackground';
import { ClassInWordmark } from './ClassInWordmark';
import { MochiBody, MochiFace, MOCHI_TINTS, useMochiTint } from './MochiCharacter';

/**
 * ============================================================================
 * 🎬 프로그램 시작 인트로 (약 4.5초)
 * ============================================================================
 *  ① 화사한 하늘 배경이 밝아지고 → ② 위에서 "Class in" 로고가 톡 떨어지고
 *  ③ 아래에서 모찌 루미가 쏙 올라와 → ④ 콩콩 뛰며 표정·색이 바뀌고 하트·반짝이가 퍼짐
 *  ⑤ 시간대 인사 말풍선 → ⑥ 화면이 부드럽게 커지며 사라지고 잠금화면으로 넘어감
 *  - 화면을 누르거나 아무 키나 누르면 바로 넘어갑니다.
 *  - 루미 색은 사용자가 고른 색에서 시작해 잠깐 바뀌었다가, 저장된 색은 바꾸지 않습니다.
 */

interface IntroSplashProps {
  /** 인트로가 시작될 때 (잠금화면을 뒤에 미리 띄워 둠 → 대시보드가 비치지 않음) */
  onStart: () => void;
  /** 완전히 사라진 뒤 */
  onDone: () => void;
}

const greeting = () => {
  const h = new Date().getHours();
  if (h < 11) return '선생님, 좋은 아침이에요! ☀️';
  if (h < 14) return '선생님, 오늘도 반가워요! 🍀';
  if (h < 18) return '선생님, 오후도 힘내요! 💪';
  return '선생님, 오늘도 수고 많으셨어요! 🌙';
};

const HOP_FACES: MochiFace[] = ['happy', 'wink', 'love', 'excited'];

export const IntroSplash: React.FC<IntroSplashProps> = ({ onStart, onDone }) => {
  const [, savedTintIndex] = useMochiTint();
  const [tintIdx, setTintIdx] = useState(savedTintIndex);
  const [face, setFace] = useState<MochiFace>('normal');
  const [blink, setBlink] = useState(false);
  const [hop, setHop] = useState(0);
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter');
  const [showBubble, setShowBubble] = useState(false);
  const exitedRef = useRef(false);
  const timers = useRef<number[]>([]);

  const exit = () => {
    if (exitedRef.current) return;
    exitedRef.current = true;
    timers.current.forEach(clearTimeout);
    setPhase('exit');
    timers.current = [window.setTimeout(onDone, 650)];
  };

  useEffect(() => {
    onStart();
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, reduce ? Math.min(ms, 1200) : ms));
    at(150, () => setPhase('show'));
    at(1250, () => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    });
    // 콩콩 4번: 뛸 때마다 표정과 파스텔 색 변경
    HOP_FACES.forEach((f, i) => {
      at(1550 + i * 430, () => {
        setHop((n) => n + 1);
        setFace(f);
        setTintIdx((t) => (t + 1) % MOCHI_TINTS.length);
      });
    });
    at(1550 + HOP_FACES.length * 430 + 150, () => {
      setFace('happy');
      setShowBubble(true);
    });
    at(4300, exit);

    const skip = () => exit();
    window.addEventListener('keydown', skip, { once: true });
    return () => {
      timers.current.forEach(clearTimeout);
      window.removeEventListener('keydown', skip);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div className={`intro-splash is-${phase}`} onClick={exit} role="presentation">
      <PastelSkyBackground />

      <div className="intro-stage">
        {/* ② 프로그램 이름 */}
        <div className="intro-title">
          <ClassInWordmark size="xl" />
          <div className="intro-subtitle">스마트 학급 대시보드</div>
        </div>

        {/* ③④ 모찌 루미 */}
        <div className="intro-lumi-wrap">
          {showBubble && <div className="intro-bubble">{greeting()}</div>}
          <div key={hop} className={`intro-lumi ${hop > 0 ? 'is-hop' : ''}`}>
            <MochiBody face={face} tint={MOCHI_TINTS[tintIdx]} blinking={blink} squish={hop > 0} glow="high" className="w-full h-full" />
            {hop > 0 && (
              <div className="intro-burst" aria-hidden>
                {['💗', '✨', '⭐', '💜', '✨', '💛'].map((e, i) => (
                  <span key={i} style={{ ['--a' as any]: `${i * 60 + hop * 17}deg` }}>
                    {e}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="intro-lumi-shadow" />
        </div>

        <div className="intro-skip">화면을 누르면 바로 시작해요</div>
      </div>
    </div>,
    document.body
  );
};

export default IntroSplash;
