import React, { useState, useEffect } from 'react';
import { Settings, Moon, Sun, Clock, CloudSnow, CloudRain, SunMedium, Cloud, SquareDashed } from 'lucide-react';

export type FlipWeatherType = 'snow' | 'rain' | 'sun' | 'cloud';

interface FlipClockWidgetProps {
  className?: string;
  weather?: FlipWeatherType;
  onWeatherChange?: (weather: FlipWeatherType) => void;
  isHeaderCompact?: boolean;
}

export type FlipTheme = 'dark' | 'light' | 'clear';

/** ⛄ 좌측 상단 귀여운 눈사람 아이콘 */
const CuteSnowmanIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 32 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* 모자 */}
    <rect x="11" y="2" width="10" height="7" rx="1.5" fill="#334155" />
    <rect x="8" y="8" width="16" height="2.5" rx="1" fill="#475569" />
    {/* 머리 */}
    <circle cx="16" cy="15" r="6" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
    {/* 눈 */}
    <circle cx="14" cy="14" r="0.9" fill="#1E293B" />
    <circle cx="18" cy="14" r="0.9" fill="#1E293B" />
    {/* 당근 코 */}
    <path d="M16 15.5L20 16.5L16 17.5Z" fill="#F97316" />
    {/* 빨간 목도리 */}
    <path d="M10 19C10 19 13 21.2 16 21.2C19 21.2 22 19 22 19C22 19 21 22.5 16 22.5C11 22.5 10 19 10 19Z" fill="#EF4444" />
    <path d="M18 20.5L19.5 26.5L16.5 26.5L16 21Z" fill="#DC2626" />
    {/* 몸통 */}
    <circle cx="16" cy="27" r="8" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
    {/* 단추 */}
    <circle cx="16" cy="24.5" r="1" fill="#334155" />
    <circle cx="16" cy="28.5" r="1" fill="#334155" />
  </svg>
);

/** ☀️ 좌측 상단 은은하게 반짝이며 부드럽게 제자리 회전하는 귀여운 태양 */
const CuteSunIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* 제자리 부드럽게 360도 회전하는 햇살 빔 */}
    <g className="anim-sun-rotate origin-center">
      <line x1="16" y1="2" x2="16" y2="6" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="16" y1="26" x2="16" y2="30" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="2" y1="16" x2="6" y2="16" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="26" y1="16" x2="30" y2="16" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="6.1" y1="6.1" x2="8.9" y2="8.9" stroke="#FBBF24" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="23.1" y1="23.1" x2="25.9" y2="25.9" stroke="#FBBF24" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="6.1" y1="25.9" x2="8.9" y2="23.1" stroke="#FBBF24" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="23.1" y1="8.9" x2="25.9" y2="6.1" stroke="#FBBF24" strokeWidth="2.2" strokeLinecap="round" />
    </g>
    {/* 은은하게 반짝이는(Pulse/Glow) 중앙 태양 본체 */}
    <circle cx="16" cy="16" r="7.8" fill="url(#sunCuteGrad)" className="anim-sun-pulse origin-center" />
    {/* 귀여운 얼굴 디테일 */}
    <circle cx="13.5" cy="14.5" r="1.1" fill="#78350F" />
    <circle cx="18.5" cy="14.5" r="1.1" fill="#78350F" />
    <path d="M13.5 17.5C14.2 19 17.8 19 18.5 17.5" stroke="#78350F" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="11.8" cy="16.2" r="1" fill="#F87171" opacity="0.85" />
    <circle cx="20.2" cy="16.2" r="1" fill="#F87171" opacity="0.85" />
    <defs>
      <radialGradient id="sunCuteGrad" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="55%" stopColor="#FBBF24" />
        <stop offset="100%" stopColor="#F59E0B" />
      </radialGradient>
    </defs>
  </svg>
);

/** ☁️ 상단 영역을 좌에서 우로 부드럽게 흘러가는 구름 */
const FlowingCloud: React.FC<{ delay?: string; duration?: string; top?: string; scale?: number; opacity?: number }> = ({
  delay = '0s',
  duration = '12s',
  top = '2px',
  scale = 1,
  opacity = 0.85,
}) => (
  <div
    className="absolute pointer-events-none anim-cloud-flow select-none"
    style={{
      top,
      animationDelay: delay,
      animationDuration: duration,
      transform: `scale(${scale})`,
      opacity,
    }}
  >
    <svg viewBox="0 0 64 36" className="w-14 h-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)] filter">
      <path
        d="M18 28H48C53.5 28 58 23.5 58 18C58 12.8 54 8.5 48.8 8.1C47.3 3.5 43 0 38 0C31.5 0 26.1 4.8 25.4 11.2C24.3 10.4 23 10 21.5 10C16.8 10 13 13.8 13 18.5C13 19.2 13.1 19.8 13.3 20.4C9.2 21 6 24.6 6 29C6 33.4 9.6 37 14 37H48"
        fill="currentColor"
        className="text-slate-300/80 dark:text-slate-400/50"
      />
    </svg>
  </div>
);

/**
 * ❄️ 날씨별 카드 상단 데코레이션 오버레이
 * - 눈(Snow): 카드 상단에 포근하게 얹힌 눈 처마 SVG (z-20)
 * - 비(Rain): 상단 테두리에 맺힌 물방울 효과 (z-20)
 * - 맑음(Sun): 은은한 골드 햇살 림 라이트 (z-20)
 * - 흐림(Cloud): 몽실몽실한 옅은 안개 림
 */
const CardWeatherDeco: React.FC<{ weather: FlipWeatherType; isDark: boolean }> = ({ weather, isDark }) => {
  if (weather === 'snow') {
    return (
      <div className="absolute -top-2 inset-x-0 h-4.5 z-20 pointer-events-none overflow-visible">
        {/* 포근하게 쌓인 눈 처마 SVG */}
        <svg
          viewBox="0 0 100 24"
          preserveAspectRatio="none"
          className="w-full h-full drop-shadow-[0_2px_3px_rgba(0,0,0,0.3)] filter"
        >
          {/* 눈 밑그림자/베이스 */}
          <path
            d="M0,6 Q10,14 20,7 Q30,16 42,6 Q52,15 65,7 Q78,16 88,6 Q94,12 100,7 L100,0 L0,0 Z"
            fill={isDark ? '#e2e8f0' : '#f1f5f9'}
          />
          {/* 포근한 눈 본체 */}
          <path
            d="M0,5 Q9,12 18,6 Q28,14 40,5 Q50,13 63,6 Q75,14 86,5 Q93,10 100,6 L100,0 L0,0 Z"
            fill="#ffffff"
          />
          {/* 봉긋한 눈망울 하이라이트 */}
          <circle cx="18" cy="6" r="3" fill="#ffffff" />
          <circle cx="40" cy="5" r="3.2" fill="#ffffff" />
          <circle cx="63" cy="6" r="3" fill="#ffffff" />
          <circle cx="86" cy="5" r="2.8" fill="#ffffff" />
          <circle cx="28" cy="8" r="1.5" fill="#f8fafc" opacity="0.8" />
          <circle cx="73" cy="8" r="1.5" fill="#f8fafc" opacity="0.8" />
        </svg>
      </div>
    );
  }

  if (weather === 'rain') {
    return (
      <div className="absolute -top-1 inset-x-0 h-3 z-20 pointer-events-none flex justify-around items-start px-1.5">
        {/* 상단에 송글송글 맺힌 물방울 */}
        <span className="w-1.5 h-2 bg-cyan-300/90 rounded-b-full shadow-[0_1px_3px_rgba(6,182,212,0.6)] animate-pulse" />
        <span className="w-1 h-1.5 bg-blue-300/80 rounded-full" />
        <span className="w-2 h-2.5 bg-sky-200/90 rounded-b-full shadow-[0_1px_3px_rgba(56,189,248,0.7)]" />
        <span className="w-1 h-1.5 bg-cyan-400/80 rounded-full" />
        <span className="w-1.5 h-2 bg-teal-200/90 rounded-b-full" />
      </div>
    );
  }

  if (weather === 'sun') {
    return (
      <div className="absolute -top-0.5 inset-x-0 h-2 z-20 pointer-events-none rounded-t-xl bg-gradient-to-b from-amber-300/70 via-amber-400/30 to-transparent shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
    );
  }

  if (weather === 'cloud') {
    return (
      <div className="absolute -top-0.5 inset-x-0 h-1.5 z-20 pointer-events-none rounded-t-xl bg-gradient-to-b from-slate-400/40 via-slate-300/20 to-transparent" />
    );
  }

  return null;
};

/**
 * 🎴 개별 플립 카드 컴포넌트
 * - 세로 높이를 축소하여 컴팩트하고 미려하게 렌더링
 * - 레트로 플립 시계의 윗판/아랫판 접힘 3D CSS 애니메이션 지원
 * - 상단 날씨 데코레이션(눈 처마/물방울/햇빛 림) 완벽 배치
 */
interface FlipCardProps {
  currentValue: string;
  label: string;
  theme: FlipTheme;
  weather: FlipWeatherType;
  isCompact?: boolean;
  /** 스티커 모드 같은 큰 화면용 */
  big?: boolean;
}

export const FlipCard: React.FC<FlipCardProps> = ({ currentValue, label, theme, weather, isCompact = false, big = false }) => {
  // 🎴 진짜 플립 시계처럼: 윗장(이전 숫자)이 앞으로 넘어가고 → 아랫장(새 숫자)이 내려와 '탁' 하고 멈춰요
  const [shown, setShown] = useState(currentValue); // 지금 완전히 보이는 숫자
  const [prev, setPrev] = useState(currentValue);
  const [flipKey, setFlipKey] = useState(0);

  useEffect(() => {
    if (currentValue === shown) return;
    setPrev(shown);
    setShown(currentValue);
    setFlipKey((k) => k + 1);
  }, [currentValue]); // eslint-disable-line react-hooks/exhaustive-deps

  const isSecs = label === 'SECS';
  const isMins = label === 'MINS';
  const isDark = theme === 'dark';
  const isClear = theme === 'clear';
  const flipping = flipKey > 0 && prev !== shown;

  const tone = isSecs ? 'is-secs' : isMins ? 'is-mins' : 'is-hours';
  const cardBoxClass = big ? 'fc-big' : isCompact ? 'w-12 sm:w-13.5 h-13 sm:h-14' : 'w-14 sm:w-16 h-13 sm:h-15';
  const cardFontClass = big ? 'fc-big-font' : isCompact ? 'text-2.5xl sm:text-3xl' : 'text-3xl sm:text-4xl';
  const num = (v: string, half: 'top' | 'bottom') => (
    <span className={`fc-num ${cardFontClass} ${half === 'top' ? 'is-top' : 'is-bottom'}`}>{v}</span>
  );

  return (
    <div className="flex flex-col items-center relative">
      <div className={`fc-card ${cardBoxClass} theme-${theme} ${tone} ${isCompact ? 'is-compact' : ''}`}>
        {/* ❄️ 상단 날씨 데코 (배경 없는 모드에서는 숨김) */}
        {!isClear && <CardWeatherDeco weather={weather} isDark={isDark} />}

        <div className="fc-body">
          {/* 고정 윗장: 새 숫자 / 고정 아랫장: 넘어가는 동안은 이전 숫자 */}
          <div className="fc-half fc-top">{num(shown, 'top')}</div>
          <div className="fc-half fc-bottom">{num(flipping ? prev : shown, 'bottom')}</div>

          {flipping && (
            <React.Fragment key={flipKey}>
              {/* 넘어가는 윗장 (이전 숫자 윗부분) */}
              <div className="fc-half fc-top fc-leaf-top">
                {num(prev, 'top')}
              </div>
              {/* 내려오는 아랫장 (새 숫자 아랫부분) */}
              <div className="fc-half fc-bottom fc-leaf-bottom" onAnimationEnd={() => setPrev(shown)}>
                {num(shown, 'bottom')}
              </div>
            </React.Fragment>
          )}

          {!isClear && (
            <>
              <div className="fc-hinge" />
              <div className="fc-pin is-left" />
              <div className="fc-pin is-right" />
            </>
          )}
        </div>
      </div>

      {/* 라벨 (시, 분, 초) */}
      <span
        className={`${big ? 'fc-big-label' : isCompact ? 'text-[8px] mt-0.5' : 'text-[9px] mt-1'} font-black uppercase tracking-wider ${
          isDark ? 'text-slate-400' : isClear ? 'opacity-70' : 'text-stone-500'
        }`}
      >
        {label}
      </span>
    </div>
  );
};

/**
 * 🌧️❄️☀️ 날씨 파티클 백그라운드 오버레이
 * - 위젯 배경 안에서만 가볍게 회전/낙하하는 순수 CSS 키프레임 파티클
 * - pointer-events-none 및 low-overhead CPU 최적화
 */
const WeatherBackgroundOverlay: React.FC<{ weather: FlipWeatherType; isDark: boolean }> = ({
  weather,
  isDark,
}) => {
  return (
    <>
      {/* 순수 CSS 애니메이션 키프레임 내장 */}
      <style>{`
        @keyframes flipSnowFall {
          0% {
            transform: translate3d(0, -12px, 0) scale(0.7);
            opacity: 0;
          }
          15% {
            opacity: 0.95;
          }
          50% {
            transform: translate3d(10px, 55px, 0) scale(1);
          }
          85% {
            opacity: 0.85;
          }
          100% {
            transform: translate3d(22px, 125px, 0) scale(1.15);
            opacity: 0;
          }
        }
        @keyframes flipRainFall {
          0% {
            transform: translate3d(0, -15px, 0) rotate(15deg);
            opacity: 0;
          }
          20% {
            opacity: 0.8;
          }
          80% {
            opacity: 0.7;
          }
          100% {
            transform: translate3d(-18px, 130px, 0) rotate(15deg);
            opacity: 0;
          }
        }
        @keyframes flipSunGlow {
          0%, 100% {
            opacity: 0.25;
            transform: scale(1);
          }
          50% {
            opacity: 0.45;
            transform: scale(1.08);
          }
        }
        /* ☁️ 흐린 구름이 좌측에서 우측으로 부드럽게 흘러가는 flowing 애니메이션 */
        @keyframes flipCloudFlow {
          0% {
            transform: translate3d(-70px, 0, 0);
            opacity: 0;
          }
          10% {
            opacity: 0.85;
          }
          90% {
            opacity: 0.85;
          }
          100% {
            transform: translate3d(320px, 0, 0);
            opacity: 0;
          }
        }
        .anim-cloud-flow {
          animation: flipCloudFlow linear infinite;
        }

        /* ☀️ 태양 제자리 부드러운 360도 회전 애니메이션 */
        @keyframes sunRaySpin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        .anim-sun-rotate {
          animation: sunRaySpin 10s linear infinite;
        }

        /* ☀️ 태양 본체 은은한 반짝임 및 펄스 */
        @keyframes sunBodyPulse {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 0 3px rgba(251, 191, 36, 0.5));
          }
          50% {
            transform: scale(1.08);
            filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.9));
          }
        }
        .anim-sun-pulse {
          animation: sunBodyPulse 2.5s ease-in-out infinite;
        }

        /* ⛄ 눈사람 좌우 살랑살랑 스윙 */
        @keyframes cuteSnowmanSway {
          0%, 100% {
            transform: rotate(-6deg);
          }
          50% {
            transform: rotate(6deg) translateY(-1.5px);
          }
        }
        .anim-cute-snowman {
          animation: cuteSnowmanSway 2.4s ease-in-out infinite;
          transform-origin: bottom center;
        }

        .anim-flip-snow {
          animation: flipSnowFall linear infinite;
        }
        .anim-flip-rain {
          animation: flipRainFall linear infinite;
        }
        .anim-flip-sunglow {
          animation: flipSunGlow 4s ease-in-out infinite;
        }
      `}</style>

      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 rounded-2xl">
        {/* 1. 눈송이 파티클 (시계 카드들 주변으로 하얀 눈송이가 흩날리며 떨어짐) */}
        {weather === 'snow' && (
          <>
            {[
              { left: '6%', delay: '0s', dur: '3.2s', size: 'w-1.5 h-1.5' },
              { left: '16%', delay: '1.4s', dur: '2.8s', size: 'w-2 h-2' },
              { left: '26%', delay: '0.7s', dur: '3.5s', size: 'w-1 h-1' },
              { left: '36%', delay: '2.1s', dur: '3.0s', size: 'w-1.5 h-1.5' },
              { left: '46%', delay: '0.3s', dur: '2.9s', size: 'w-2.5 h-2.5' },
              { left: '56%', delay: '1.8s', dur: '3.3s', size: 'w-1 h-1' },
              { left: '66%', delay: '0.9s', dur: '3.1s', size: 'w-2 h-2' },
              { left: '76%', delay: '2.5s', dur: '2.7s', size: 'w-1.5 h-1.5' },
              { left: '85%', delay: '1.1s', dur: '3.4s', size: 'w-2 h-2' },
              { left: '94%', delay: '0.5s', dur: '2.9s', size: 'w-1 h-1' },
              { left: '11%', delay: '2.2s', dur: '3.6s', size: 'w-1.5 h-1.5' },
              { left: '61%', delay: '2.8s', dur: '3.2s', size: 'w-1 h-1' },
              { left: '41%', delay: '1.6s', dur: '3.3s', size: 'w-2 h-2' },
              { left: '81%', delay: '3.0s', dur: '2.9s', size: 'w-1.5 h-1.5' },
            ].map((p, idx) => (
              <span
                key={idx}
                className={`absolute -top-3 rounded-full bg-white anim-flip-snow ${p.size} ${
                  isDark ? 'shadow-[0_0_6px_rgba(255,255,255,0.9)]' : 'shadow-[0_0_4px_rgba(148,163,184,0.6)]'
                }`}
                style={{
                  left: p.left,
                  animationDelay: p.delay,
                  animationDuration: p.dur,
                }}
              />
            ))}
          </>
        )}

        {/* 2. 빗줄기 파티클 (기존 비 내리는 효과 그대로 유지) */}
        {weather === 'rain' && (
          <>
            {[
              { left: '10%', delay: '0.1s', dur: '0.7s', len: 'h-3.5' },
              { left: '20%', delay: '0.4s', dur: '0.65s', len: 'h-4' },
              { left: '32%', delay: '0.2s', dur: '0.75s', len: 'h-3' },
              { left: '44%', delay: '0.5s', dur: '0.6s', len: 'h-4.5' },
              { left: '55%', delay: '0.15s', dur: '0.7s', len: 'h-3.5' },
              { left: '67%', delay: '0.35s', dur: '0.65s', len: 'h-4' },
              { left: '79%', delay: '0.05s', dur: '0.8s', len: 'h-3' },
              { left: '89%', delay: '0.45s', dur: '0.6s', len: 'h-4' },
              { left: '15%', delay: '0.6s', dur: '0.7s', len: 'h-3' },
              { left: '72%', delay: '0.25s', dur: '0.65s', len: 'h-3.5' },
            ].map((p, idx) => (
              <span
                key={idx}
                className={`absolute -top-4 w-[1.5px] rounded-full bg-gradient-to-b from-transparent via-cyan-400 to-sky-300 anim-flip-rain ${p.len}`}
                style={{
                  left: p.left,
                  animationDelay: p.delay,
                  animationDuration: p.dur,
                }}
              />
            ))}
          </>
        )}

        {/* 3. 맑음 햇살 광채 */}
        {weather === 'sun' && (
          <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-gradient-to-br from-amber-400/25 via-orange-300/15 to-transparent blur-xl anim-flip-sunglow pointer-events-none" />
        )}

        {/* 4. 흐림: 상단 영역에 흐린 구름 아이콘들이 좌측에서 우측으로 부드럽게 흘러가는 flowing 애니메이션 */}
        {weather === 'cloud' && (
          <div className="absolute inset-x-0 top-0 h-12 overflow-hidden pointer-events-none z-10">
            <FlowingCloud delay="0s" duration="11s" top="2px" scale={0.9} opacity={0.8} />
            <FlowingCloud delay="4.5s" duration="15s" top="10px" scale={0.7} opacity={0.65} />
            <FlowingCloud delay="8.8s" duration="12.5s" top="1px" scale={0.8} opacity={0.75} />
          </div>
        )}
      </div>
    </>
  );
};

/**
 * ⏰ [FlipClockWidget] 사이드 스택 전용 독립 레트로 플립 시계 & 날짜 & 날씨 위젯
 * - PART 6 요구사항: 세로 높이를 컴팩트하게 줄여 세로 공간 낭비를 최소화
 * - 다크 플립 vs 화이트 플립 원클릭 토글
 * - 실시간 날씨 연동 (눈, 비, 맑음, 흐림) 및 원클릭 날씨 순환 테스트 토글
 * - 카드 상단 입체 데코(폭신한 눈 처마/물방울/햇빛 림) 및 배경 파티클 애니메이션
 */
export const FlipClockWidget: React.FC<FlipClockWidgetProps> = ({
  className = '',
  weather: propWeather,
  onWeatherChange,
  isHeaderCompact = false,
}) => {
  // 테마 상태 (localStorage 저장)
  const [theme, setTheme] = useState<FlipTheme>(() => {
    try {
      const saved = localStorage.getItem('smart_board_flip_clock_theme');
      return saved === 'light' ? 'light' : saved === 'clear' ? 'clear' : 'dark';
    } catch {
      return 'dark';
    }
  });

  // 날씨 상태 (prop -> localStorage -> 기본값 'snow' 지원)
  const [weather, setWeather] = useState<FlipWeatherType>(() => {
    if (propWeather) return propWeather;
    try {
      const saved =
        localStorage.getItem('smart_board_weather') ||
        localStorage.getItem('smart_board_flip_clock_weather');
      if (saved === 'snow' || saved === 'rain' || saved === 'sun' || saved === 'cloud') {
        return saved as FlipWeatherType;
      }
    } catch {}
    return 'snow'; // 폭신한 눈 처마를 바로 확인할 수 있는 기본값
  });

  // 외부 prop 동기화
  useEffect(() => {
    if (propWeather) {
      setWeather(propWeather);
    }
  }, [propWeather]);

  // 🌐 상단 헤더바(WeeklyWeatherHeader) 등 외부 전역 날씨 변경 이벤트 실시간 수신 연동
  useEffect(() => {
    const handleGlobalWeatherChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ weather: FlipWeatherType }>;
      if (customEvent.detail && customEvent.detail.weather) {
        setWeather(customEvent.detail.weather);
      }
    };

    window.addEventListener('smart_board_weather_change', handleGlobalWeatherChange);
    return () => {
      window.removeEventListener('smart_board_weather_change', handleGlobalWeatherChange);
    };
  }, []);

  // 12시간제 vs 24시간제 토글 상태 (localStorage 저장)
  const [is12Hour, setIs12Hour] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('smart_board_flip_clock_is_12h');
      return saved !== null ? saved === 'true' : true; // 기본값: 12시간제
    } catch {
      return true;
    }
  });

  const toggleHourFormat = () => {
    setIs12Hour((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('smart_board_flip_clock_is_12h', String(next));
      } catch (e) {
        console.warn('localStorage 시간제 저장 실패:', e);
      }
      return next;
    });
  };

  const [time, setTime] = useState({
    hours: '00',
    minutes: '00',
    seconds: '00',
    ampm: 'AM',
    dateStr: '',
    dayOfWeek: '',
    weekOfYear: '',
  });

  // 실시간 1초 단위 시간 갱신 (12시간제/24시간제 연동)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const rawH = now.getHours();
      const ampm = rawH >= 12 ? 'PM' : 'AM';
      // 12시간제: 1~12 / 24시간제: 0~23
      const h = is12Hour ? rawH % 12 || 12 : rawH;
      const hoursStr = String(h).padStart(2, '0');
      const minutesStr = String(now.getMinutes()).padStart(2, '0');
      const secondsStr = String(now.getSeconds()).padStart(2, '0');

      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const date = now.getDate();
      const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
      const dayOfWeek = days[now.getDay()];

      const firstDayOfYear = new Date(year, 0, 1);
      const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000;
      const weekOfYear = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);

      setTime({
        hours: hoursStr,
        minutes: minutesStr,
        seconds: secondsStr,
        ampm,
        dateStr: `${month}월 ${date}일`,
        dayOfWeek,
        weekOfYear: `${weekOfYear}주차`,
      });
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [is12Hour]);

  // 테마 토글 핸들러
  const toggleTheme = () => {
    // 밤(다크) → 낮(화이트) → 배경 없음 → 밤 …
    const nextTheme: FlipTheme = theme === 'dark' ? 'light' : theme === 'light' ? 'clear' : 'dark';
    setTheme(nextTheme);
    try {
      localStorage.setItem('smart_board_flip_clock_theme', nextTheme);
    } catch (e) {
      console.warn('localStorage 저장 실패:', e);
    }
  };

  // 날씨 토글 핸들러 (눈 -> 비 -> 맑음 -> 흐림 순환) + 전역 이벤트 발송
  const cycleWeather = () => {
    const list: FlipWeatherType[] = ['snow', 'rain', 'sun', 'cloud'];
    const nextIdx = (list.indexOf(weather) + 1) % list.length;
    const nextWeather = list[nextIdx];
    setWeather(nextWeather);
    onWeatherChange?.(nextWeather);
    try {
      localStorage.setItem('smart_board_weather', nextWeather);
      localStorage.setItem('smart_board_flip_clock_weather', nextWeather);
    } catch (e) {
      console.warn('localStorage 날씨 저장 실패:', e);
    }

    // 상단 헤더바(WeeklyWeatherHeader) 등과 양방향 실시간 동기화
    window.dispatchEvent(
      new CustomEvent('smart_board_weather_change', {
        detail: { weather: nextWeather },
      })
    );
  };

  // 전역 다크 모드 감지 및 자체 테마 연동
  const isGlobalDark = typeof document !== 'undefined' && (
    document.documentElement.classList.contains('dark') ||
    document.body.classList.contains('dark')
  );
  const isClearTheme = theme === 'clear';
  const isDark = !isClearTheme && (isGlobalDark || theme === 'dark');
  const cardTheme: FlipTheme = isClearTheme ? 'clear' : isDark ? 'dark' : 'light';

  // 날씨별 아이콘 및 툴팁
  const weatherMeta = {
    snow: { icon: CloudSnow, label: '눈 내림', color: 'text-sky-300' },
    rain: { icon: CloudRain, label: '비 내림', color: 'text-cyan-400' },
    sun: { icon: SunMedium, label: '맑음', color: 'text-amber-400' },
    cloud: { icon: Cloud, label: '흐림', color: 'text-slate-400' },
  }[weather];

  const WeatherIcon = weatherMeta.icon;

  return (
    <div
      className={`rounded-2xl ${
        isHeaderCompact ? 'pt-0.5 pb-1 px-1.5 sm:pt-0.5 sm:pb-1.5 sm:px-2 bg-transparent border-transparent shadow-none' : 'p-2.5 sm:p-3 border shadow-md'
      } transition-all duration-300 relative select-none group overflow-hidden ${
        !isHeaderCompact
          ? isDark
            ? 'bg-[#101a2d] border-[#1e2c44] text-[#f8fafc] shadow-black/40'
            : 'bg-[#faf7ee] border-[#e7e1ce] text-stone-800 shadow-stone-300/40'
          : isDark
          ? 'text-[#f8fafc]'
          : 'text-stone-800'
      } ${className}`}
    >
      {/* 🌟 0. 날씨 파티클 배경 효과 (z-0) */}
      {!isClearTheme && <WeatherBackgroundOverlay weather={weather} isDark={isDark} />}

      {/* 1. 상단 카드 바: 날짜 및 날씨 & 테마 토글 버튼 (상대적 z-10 - 위로 배치) */}
      <div className={`flex items-center justify-between ${isHeaderCompact ? '-mt-1 mb-1.5 px-0.5' : 'mb-2 px-0.5'} relative z-10 shrink-0`}>
        {/* 좌측: 시계 아이콘 (클릭 시 12시간제/24시간제 토글) & 12시간제 시 AM/PM 표시 */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleHourFormat}
            className={`p-1 rounded-lg transition-all active:scale-90 hover:scale-105 cursor-pointer flex items-center justify-center ${
              isDark
                ? 'bg-white/10 hover:bg-white/15 text-amber-400'
                : 'bg-black/5 hover:bg-black/10 text-amber-600'
            }`}
            title={`시간 표기: ${is12Hour ? '12시간제 (클릭 시 24시간제로 전환)' : '24시간제 (클릭 시 12시간제로 전환)'}`}
          >
            <Clock className="w-3.5 h-3.5" />
          </button>

          {/* 12시간제일 때 시계 아이콘 옆에 AM / PM 배지 표시 */}
          {is12Hour && (
            <span
              onClick={toggleHourFormat}
              className={`px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-wider transition-all cursor-pointer select-none shadow-2xs ${
                isDark
                  ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30'
                  : 'bg-amber-500/10 text-amber-700 border border-amber-500/25'
              }`}
              title="오전/오후 (클릭 시 24시간제로 전환)"
            >
              {time.ampm}
            </span>
          )}

          {/* ☀️ 맑음 리액션: 플립시계 좌측 상단 영역에 귀여운 태양이 은은하게 반짝이며 부드럽게 제자리 회전 */}
          {weather === 'sun' && (
            <div className="flex items-center ml-0.5 select-none" title="맑음: 은은하게 반짝이는 화창한 햇살">
              <CuteSunIcon className="w-5 h-5 drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
            </div>
          )}

          {/* ⛄ 눈 리액션: 플립시계 좌측 상단에 귀여운 눈사람 아이콘 배치 (살랑살랑 스윙 모션) */}
          {weather === 'snow' && (
            <div className="flex items-center ml-0.5 anim-cute-snowman select-none" title="눈: 귀여운 눈사람과 흩날리는 눈송이">
              <CuteSnowmanIcon className="w-5 h-5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* ❄️/🌧️/☀️ 귀여운 날씨 원클릭 토글 버튼 (통통 튀는 애니메이션 적용) */}
          <button
            type="button"
            onClick={cycleWeather}
            className={`px-2 py-0.5 rounded-full border border-transparent transition-all active:scale-95 cursor-pointer flex items-center gap-1 text-[9.5px] font-extrabold shadow-2xs ${
              isDark
                ? 'bg-white/10 hover:bg-white/15 text-slate-200'
                : 'bg-black/5 hover:bg-black/10 text-slate-700'
            }`}
            title={`날씨 변경: ${weatherMeta.label} (클릭 시 순환)`}
          >
            {/* 귀여운 날씨 애니메이션 아이콘 렌더링 */}
            <span className="relative flex items-center justify-center shrink-0">
              {weather === 'sun' && (
                <span className="relative flex items-center justify-center anim-cute-sun text-amber-500">
                  <SunMedium className="w-3.5 h-3.5 anim-cute-sun-rays" />
                </span>
              )}
              {weather === 'snow' && (
                <span className="inline-block anim-cute-snow text-sky-400">
                  <CloudSnow className="w-3.5 h-3.5" />
                </span>
              )}
              {weather === 'rain' && (
                <span className="inline-block anim-cute-rain text-cyan-400">
                  <CloudRain className="w-3.5 h-3.5" />
                </span>
              )}
              {weather === 'cloud' && (
                <span className="inline-block anim-cute-cloud text-slate-400">
                  <Cloud className="w-3.5 h-3.5" />
                </span>
              )}
            </span>
            <span className="text-[9.5px] font-black">{weatherMeta.label}</span>
          </button>

          {/* 테마 원클릭 전환 ⚙️ 버튼 (보더 투명화) */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-1 rounded-full border border-transparent transition-all active:scale-95 cursor-pointer flex items-center gap-0.5 text-[9px] font-bold shadow-2xs ${
              isDark
                ? 'bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white'
                : 'bg-black/5 hover:bg-black/10 text-stone-700 hover:text-black'
            }`}
            title={`현재: ${isClearTheme ? '배경 없음' : isDark ? '밤(다크) 플립' : '낮(화이트) 플립'} · 누를 때마다 밤 → 낮 → 배경 없음 순서로 바뀌어요`}
            data-flip-theme-btn
          >
            {isClearTheme ? (
              <SquareDashed className="w-2.5 h-2.5" />
            ) : isDark ? (
              <Moon className="w-2.5 h-2.5 text-sky-300" />
            ) : (
              <Sun className="w-2.5 h-2.5 text-amber-500" />
            )}
          </button>
        </div>
      </div>

      {/* 2. 3D 플립 카드 시계 (시 : 분 : 초) - 상대적 z-10 */}
      <div className={`flex items-center justify-center ${isHeaderCompact ? 'gap-1 sm:gap-1.5 my-0' : 'gap-1.5 sm:gap-2 my-1'} relative z-10 shrink-0`}>
        <FlipCard currentValue={time.hours} label="HOURS" theme={cardTheme} weather={weather} isCompact={isHeaderCompact} />

        <div className="flex flex-col gap-1 pb-2 sm:pb-2.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isDark ? 'bg-sky-400 animate-pulse' : 'bg-amber-600 animate-pulse'
            }`}
          />
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isDark ? 'bg-sky-400 animate-pulse' : 'bg-amber-600 animate-pulse'
            }`}
          />
        </div>

        <FlipCard currentValue={time.minutes} label="MINS" theme={cardTheme} weather={weather} isCompact={isHeaderCompact} />

        <div className="flex flex-col gap-1 pb-2 sm:pb-2.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isDark ? 'bg-sky-400 animate-pulse' : 'bg-amber-600 animate-pulse'
            }`}
          />
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isDark ? 'bg-sky-400 animate-pulse' : 'bg-amber-600 animate-pulse'
            }`}
          />
        </div>

        <FlipCard currentValue={time.seconds} label="SECS" theme={cardTheme} weather={weather} isCompact={isHeaderCompact} />
      </div>
    </div>
  );
};

