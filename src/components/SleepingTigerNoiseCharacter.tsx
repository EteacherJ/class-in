import React from 'react';

interface SleepingTigerNoiseCharacterProps {
  decibel: number;
  isListening: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 🐯 '잠자는 아기 호랑이 (호치)' 3단계 소음 반응 캐릭터 컴포넌트
 * 1) [~45dB (조용함/집중)] - '쿨쿨 단잠 모드':
 *    - 아기 호랑이가 줄무늬 이불을 덮고 꼬리를 살랑거리며 숨 쉬듯(펄스) 자고, 주변에 'Zzz' 거품이 피어오름.
 *    - 상태 바: 에메랄드 그린 (#10B981) / 문구: "🌿 쉿! 아기 호랑이가 교실에서 곤히 자고 있어요."
 * 2) [46~65dB (웅성거림)] - '뒤척임 & 실눈 뜨기 모드':
 *    - 귀가 쫑긋 세워지고, 눈을 반쯤 뜨며 이불 속에서 좌우로 들썩들썩 뒤척임. 머리 위에 노란 식은땀(💧)과 물음표(?) 노출.
 *    - 상태 바: 앰버 옐로우 (#F59E0B) / 문구: "⚠️ 부스럭부스럭... 아기 호랑이가 잠에서 깨어나려고 해요!"
 * 3) [66dB~ (소음 한계 초과)] - '깜짝 기상 & 어흥 포효 모드':
 *    - 이불을 박차고 벌떡 일어나 두 앞발을 번쩍 들며 포효하는 바운스 애니메이션. 화면 테두리에 붉은 네온 경고등 점멸.
 *    - 상태 바: 크림슨 레드 (#EF4444) / 문구: "🚨 어흥! 호랑이가 잠에서 깼어요! 목소리를 낮춰 다시 재워주세요!"
 */
export const SleepingTigerNoiseCharacter: React.FC<SleepingTigerNoiseCharacterProps> = ({
  decibel,
  isListening,
  className = '',
  size = 'md',
}) => {
  // 3단계 소음 판정
  const stage = decibel <= 45 ? 1 : decibel <= 65 ? 2 : 3;

  const stageData = {
    1: {
      statusColor: '#10B981',
      bgGlow: 'from-emerald-500/10 via-teal-500/5 to-transparent',
      borderColor: 'border-emerald-500/40',
      badgeBg: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
      title: '쿨쿨 단잠 모드 (조용함)',
      message: '🌿 쉿! 아기 호랑이가 교실에서 곤히 자고 있어요.',
      cardBorder: 'border-emerald-200 dark:border-emerald-800/60',
    },
    2: {
      statusColor: '#F59E0B',
      bgGlow: 'from-amber-500/15 via-orange-500/10 to-transparent',
      borderColor: 'border-amber-500/50',
      badgeBg: 'bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/40',
      title: '뒤척임 & 실눈 뜨기 모드 (웅성거림)',
      message: '⚠️ 부스럭부스럭... 아기 호랑이가 잠에서 깨어나려고 해요!',
      cardBorder: 'border-amber-300 dark:border-amber-700/60',
    },
    3: {
      statusColor: '#EF4444',
      bgGlow: 'from-rose-500/25 via-red-500/15 to-transparent',
      borderColor: 'border-rose-500/80 shadow-[0_0_25px_rgba(239,68,68,0.4)]',
      badgeBg: 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/60 animate-pulse',
      title: '깜짝 기상 & 어흥 포효 모드 (소음 초과)',
      message: '🚨 어흥! 호랑이가 잠에서 깼어요! 목소리를 낮춰 다시 재워주세요!',
      cardBorder: 'border-rose-400 dark:border-rose-600 ring-2 ring-rose-500/40',
    },
  }[stage];

  // 크기별 SVG 규격
  const svgSizes = {
    sm: { width: 140, height: 100 },
    md: { width: 220, height: 150 },
    lg: { width: 320, height: 210 },
  }[size];

  return (
    <div
      className={`w-full flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-500 relative overflow-hidden select-none bg-gradient-to-b ${stageData.bgGlow} ${stageData.cardBorder} ${className}`}
    >
      {/* 스테이지 3일 때 화면 테두리 붉은 네온 점멸 효과 */}
      {stage === 3 && (
        <div className="absolute inset-0 border-2 border-rose-500 rounded-2xl animate-ping pointer-events-none opacity-40" />
      )}

      {/* 상단: 상태 배지 및 데시벨 표시 */}
      <div className="w-full flex items-center justify-between mb-1.5 px-1 z-10">
        <span
          className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border shadow-2xs flex items-center gap-1 ${stageData.badgeBg}`}
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: stageData.statusColor }}
          />
          <span>{stageData.title}</span>
        </span>
        <div className="flex items-baseline gap-1 font-mono">
          <span
            className="text-2xl font-black tabular-nums transition-colors"
            style={{ color: stageData.statusColor }}
          >
            {decibel}
          </span>
          <span className="text-[10px] font-bold text-slate-400">dB</span>
        </div>
      </div>

      {/* 중앙: 3단계 아기 호랑이 인터랙션 SVG */}
      <div className="relative flex items-center justify-center py-1">
        {/* 스테이지 1: Zzz 거품 떠오름 효과 */}
        {stage === 1 && (
          <div className="absolute -top-1 right-2 sm:right-6 pointer-events-none flex flex-col items-center">
            <span className="text-sm font-black text-emerald-500/80 animate-bounce delay-300">Z</span>
            <span className="text-xs font-black text-emerald-400/70 animate-bounce delay-150 -ml-2">z</span>
            <span className="text-[10px] font-black text-emerald-300/60 animate-bounce -ml-4">z</span>
          </div>
        )}

        {/* 스테이지 2: 식은땀과 물음표 */}
        {stage === 2 && (
          <div className="absolute -top-2 right-4 sm:right-8 pointer-events-none flex items-center gap-1 animate-pulse">
            <span className="text-xl">💧</span>
            <span className="text-lg font-black text-amber-500 animate-bounce">?</span>
          </div>
        )}

        {/* 스테이지 3: 음파 경고 및 깜짝 번개 */}
        {stage === 3 && (
          <div className="absolute -top-3 inset-x-0 flex justify-between px-4 pointer-events-none animate-bounce">
            <span className="text-xl">⚡</span>
            <span className="text-xl font-black text-rose-500">💥</span>
            <span className="text-xl">⚡</span>
          </div>
        )}

        {/* SVG 본체 */}
        <svg
          width={svgSizes.width}
          height={svgSizes.height}
          viewBox="0 0 200 130"
          className={`transition-transform duration-500 ${
            stage === 1
              ? 'animate-pulse'
              : stage === 2
              ? 'animate-[wiggle_1.2s_ease-in-out_infinite]'
              : 'animate-bounce'
          }`}
        >
          <defs>
            {/* 호랑이 노란색 그라데이션 */}
            <linearGradient id="tigerBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
            {/* 줄무늬 이불 그라데이션 */}
            <linearGradient id="blanketGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#93C5FD" />
              <stop offset="50%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
            {/* 베개 그라데이션 */}
            <linearGradient id="pillowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FEF3C7" />
              <stop offset="100%" stopColor="#FDE68A" />
            </linearGradient>
          </defs>

          {/* 1. 베개 (Pillow) */}
          <rect x="25" y="55" width="55" height="35" rx="12" fill="url(#pillowGrad)" stroke="#F59E0B" strokeWidth="2" />

          {/* 꼬리 (Tail) - 스테이지 1, 2에서는 살랑거림 */}
          <path
            d={
              stage === 3
                ? 'M 160 70 Q 185 40 180 30 Q 170 35 155 65 Z'
                : 'M 160 80 Q 185 75 180 60 Q 170 65 155 75 Z'
            }
            fill="#F59E0B"
            stroke="#B45309"
            strokeWidth="2"
            className={stage === 1 ? 'animate-pulse' : ''}
          />
          {/* 꼬리 검은 줄무늬 */}
          <path d="M 168 70 L 173 66 M 175 60 L 178 54" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />

          {/* 2. 아기 호랑이 머리 & 귀 */}
          {stage === 3 ? (
            /* [3단계: 기상 & 포효] 머리가 높이 솟구쳐 오름 */
            <g transform="translate(45, 15)">
              {/* 왼쪽 귀 */}
              <circle cx="15" cy="20" r="14" fill="#F59E0B" stroke="#B45309" strokeWidth="2" />
              <circle cx="15" cy="20" r="7" fill="#FECDD3" />
              {/* 오른쪽 귀 */}
              <circle cx="65" cy="20" r="14" fill="#F59E0B" stroke="#B45309" strokeWidth="2" />
              <circle cx="65" cy="20" r="7" fill="#FECDD3" />

              {/* 얼굴 본체 */}
              <circle cx="40" cy="45" r="30" fill="url(#tigerBodyGrad)" stroke="#B45309" strokeWidth="2.5" />

              {/* 이마 줄무늬 (王 자 모양) */}
              <path d="M 32 25 L 48 25 M 34 30 L 46 30 M 40 23 L 40 33" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 20 40 L 26 43 M 60 40 L 54 43" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />

              {/* 포효하는 눈 (크게 치켜뜬 눈) */}
              <circle cx="28" cy="42" r="5" fill="#1E293B" />
              <circle cx="30" cy="40" r="2" fill="#FFFFFF" />
              <circle cx="52" cy="42" r="5" fill="#1E293B" />
              <circle cx="54" cy="40" r="2" fill="#FFFFFF" />

              {/* 분홍 볼터치 */}
              <ellipse cx="22" cy="52" rx="4" ry="2.5" fill="#FB7185" opacity="0.8" />
              <ellipse cx="58" cy="52" rx="4" ry="2.5" fill="#FB7185" opacity="0.8" />

              {/* 포효하는 입 (어흥!) & 송곳니 */}
              <path d="M 30 52 Q 40 70 50 52 Z" fill="#EF4444" stroke="#991B1B" strokeWidth="2" />
              <polygon points="34,52 37,56 40,52" fill="#FFFFFF" />
              <polygon points="40,52 43,56 46,52" fill="#FFFFFF" />
              {/* 귀여운 코 */}
              <polygon points="40,48 37,45 43,45" fill="#B45309" />

              {/* 번쩍 든 두 앞발 (어흥 포즈) */}
              <ellipse cx="0" cy="40" rx="9" ry="12" fill="#FBBF24" stroke="#B45309" strokeWidth="2" transform="rotate(-30 0 40)" />
              <circle cx="-5" cy="32" r="2" fill="#FFFFFF" />
              <circle cx="1" cy="30" r="2" fill="#FFFFFF" />

              <ellipse cx="80" cy="40" rx="9" ry="12" fill="#FBBF24" stroke="#B45309" strokeWidth="2" transform="rotate(30 80 40)" />
              <circle cx="85" cy="32" r="2" fill="#FFFFFF" />
              <circle cx="79" cy="30" r="2" fill="#FFFFFF" />
            </g>
          ) : (
            /* [1단계 & 2단계: 엎드려 자거나 뒤척임] */
            <g transform={stage === 2 ? 'translate(40, 38) rotate(4 35 30)' : 'translate(40, 42)'}>
              {/* 왼쪽 귀 */}
              <circle cx="12" cy="14" r="12" fill="#F59E0B" stroke="#B45309" strokeWidth="2" />
              <circle cx="12" cy="14" r="6" fill="#FECDD3" />
              {/* 오른쪽 귀 */}
              <circle cx="58" cy="14" r="12" fill="#F59E0B" stroke="#B45309" strokeWidth="2" />
              <circle cx="58" cy="14" r="6" fill="#FECDD3" />

              {/* 얼굴 타원 */}
              <ellipse cx="35" cy="32" rx="28" ry="24" fill="url(#tigerBodyGrad)" stroke="#B45309" strokeWidth="2.5" />

              {/* 이마 줄무늬 */}
              <path d="M 28 17 L 42 17 M 30 22 L 40 22 M 35 15 L 35 24" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
              <path d="M 16 28 L 22 30 M 54 28 L 48 30" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />

              {/* 볼터치 */}
              <ellipse cx="18" cy="38" rx="4" ry="2.5" fill="#FB7185" opacity="0.7" />
              <ellipse cx="52" cy="38" rx="4" ry="2.5" fill="#FB7185" opacity="0.7" />

              {/* 코 */}
              <polygon points="35,36 32,33 38,33" fill="#B45309" />

              {/* 눈 표현: 1단계는 곤히 감은 눈(⌒ ⌒), 2단계는 살짝 실눈 뜬 눈(– _ –) */}
              {stage === 1 ? (
                <>
                  <path d="M 22 32 Q 27 38 32 32" fill="none" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M 38 32 Q 43 38 48 32" fill="none" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
                  {/* 자는 입 */}
                  <path d="M 32 40 Q 35 43 38 40" fill="none" stroke="#78350F" strokeWidth="1.5" strokeLinecap="round" />
                </>
              ) : (
                <>
                  {/* 실눈 */}
                  <ellipse cx="27" cy="32" rx="4" ry="2" fill="#1E293B" />
                  <ellipse cx="43" cy="32" rx="4" ry="2" fill="#1E293B" />
                  {/* 삐죽거리는 긴장 입 */}
                  <path d="M 31 41 Q 35 38 39 41" fill="none" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
                </>
              )}
            </g>
          )}

          {/* 3. 줄무늬 이불 (Blanket) */}
          {stage === 3 ? (
            /* 3단계: 박차고 일어난 젖혀진 이불 */
            <g transform="translate(60, 75)">
              <path
                d="M 10 25 Q 40 5 80 15 Q 110 25 105 45 Q 80 50 20 45 Z"
                fill="url(#blanketGrad)"
                stroke="#1D4ED8"
                strokeWidth="2.5"
              />
              {/* 이불 흰색 줄무늬 */}
              <path d="M 30 15 Q 45 40 50 48 M 60 12 Q 75 35 80 48" stroke="#FFFFFF" strokeWidth="3" opacity="0.6" strokeLinecap="round" />
            </g>
          ) : (
            /* 1단계, 2단계: 얌전히 덮고 있는 줄무늬 이불 */
            <g transform={stage === 2 ? 'translate(65, 52) rotate(-2 45 35)' : 'translate(65, 55)'}>
              <path
                d="M 10 10 Q 50 -2 90 8 Q 105 30 95 50 Q 50 55 5 45 Z"
                fill="url(#blanketGrad)"
                stroke="#1D4ED8"
                strokeWidth="2.5"
              />
              {/* 이불 덮개 접힌 라인 */}
              <path d="M 8 10 Q 50 -2 92 8" stroke="#DBEAFE" strokeWidth="5" fill="none" strokeLinecap="round" />
              {/* 이불 줄무늬들 */}
              <path d="M 25 15 Q 40 45 45 52 M 50 12 Q 65 42 70 52 M 75 10 Q 85 35 88 50" stroke="#FFFFFF" strokeWidth="3.5" opacity="0.6" strokeLinecap="round" />
              {/* 이불 위로 빼꼼 나온 작은 앞발 */}
              <circle cx="18" cy="12" r="6" fill="#FBBF24" stroke="#B45309" strokeWidth="1.5" />
            </g>
          )}
        </svg>
      </div>

      {/* 하단: 상태 바 및 인터랙션 문구 안내 */}
      <div className="w-full mt-1.5 space-y-1 z-10 text-center">
        {/* 상태 프로그레스 바 */}
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden p-0.5 border border-slate-300 dark:border-slate-700 shadow-inner">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(100, Math.max(10, (decibel / 90) * 100))}%`,
              backgroundColor: stageData.statusColor,
            }}
          />
        </div>

        {/* 인터랙션 멘트 */}
        <p
          className="text-xs font-black tracking-tight leading-snug drop-shadow-xs"
          style={{ color: stageData.statusColor }}
        >
          {stageData.message}
        </p>
      </div>
    </div>
  );
};
