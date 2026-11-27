import React, { useMemo } from 'react';

/**
 * 🌈 밝고 화사한 움직이는 배경 (인트로 · 잠금화면 공용)
 * - 파스텔 하늘 그라데이션이 천천히 흐르고, 큰 빛 덩어리가 떠다니며,
 *   비눗방울이 아래에서 위로 올라가고, 반짝이가 깜빡이고, 아래쪽 물결이 출렁입니다.
 * - 흐림 필터 없이 그라데이션·transform 애니메이션만 써서 GPU 부담이 적습니다.
 * - 운영체제 '동작 줄이기'가 켜져 있으면 움직임을 멈춥니다.
 */
export const PastelSkyBackground: React.FC<{ className?: string }> = ({ className = '' }) => {
  // 비눗방울·반짝이 위치는 한 번만 무작위로 정함
  const bubbles = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        left: (i * 61 + 7) % 100,
        size: 14 + ((i * 37) % 46),
        dur: 11 + ((i * 7) % 10),
        delay: -((i * 1.7) % 14),
        sway: 10 + ((i * 13) % 30),
      })),
    []
  );
  const sparkles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        left: (i * 47 + 11) % 96,
        top: (i * 29 + 5) % 70,
        size: 8 + ((i * 5) % 12),
        delay: -((i * 0.73) % 4),
        dur: 2.6 + ((i * 3) % 3),
      })),
    []
  );

  return (
    <div className={`psky ${className}`} aria-hidden data-keep-anim>
      <div className="psky-base" />
      <div className="psky-blob psky-blob-1" />
      <div className="psky-blob psky-blob-2" />
      <div className="psky-blob psky-blob-3" />
      <div className="psky-blob psky-blob-4" />

      {sparkles.map((s, i) => (
        <svg
          key={`s${i}`}
          className="psky-sparkle"
          viewBox="0 0 20 20"
          style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s` }}
        >
          <path d="M10 0 Q11.4 8.6 20 10 Q11.4 11.4 10 20 Q8.6 11.4 0 10 Q8.6 8.6 10 0 Z" />
        </svg>
      ))}

      {bubbles.map((b, i) => (
        <span
          key={`b${i}`}
          className="psky-bubble"
          style={
            {
              left: `${b.left}%`,
              width: b.size,
              height: b.size,
              animationDuration: `${b.dur}s, ${b.dur / 3}s`,
              animationDelay: `${b.delay}s, ${b.delay}s`,
              '--sway': `${b.sway}px`,
            } as React.CSSProperties
          }
        />
      ))}

      {/* 아래쪽 출렁이는 물결 (2겹) */}
      <svg className="psky-wave psky-wave-back" viewBox="0 0 2880 200" preserveAspectRatio="none">
        <path d="M0 110 C 240 60 480 160 720 110 C 960 60 1200 160 1440 110 C 1680 60 1920 160 2160 110 C 2400 60 2640 160 2880 110 L2880 200 L0 200 Z" />
      </svg>
      <svg className="psky-wave psky-wave-front" viewBox="0 0 2880 200" preserveAspectRatio="none">
        <path d="M0 130 C 320 90 400 170 720 130 C 1040 90 1120 170 1440 130 C 1760 90 1840 170 2160 130 C 2480 90 2560 170 2880 130 L2880 200 L0 200 Z" />
      </svg>
    </div>
  );
};

export default PastelSkyBackground;
