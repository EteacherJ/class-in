import React from 'react';

export type TigerStatus = 'comfort' | 'worried' | 'angry' | 'sleep' | 'calm' | 'warning';

interface TigerStatusCharacterProps {
  status?: TigerStatus;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  customMessage?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * 🐯 [TigerStatusCharacter] 학급 마스코트 호랑이 3단계 감정 표현 컴포넌트
 * 1) 'comfort' / 'sleep' / 'calm' (편안하게 자거나 웃는 아기 호랑이): 소음 45dB 이하
 *    - 온화한 눈웃음(^ ^), 핑크빛 볼터치, 행복한 꼬리 살랑임, 초록/민트 톤 배지
 * 2) 'worried' (실눈 뜨고 주의를 살피는 표정): 소음 46~65dB
 *    - 난처한 눈썹, 살짝 떨리는 동공, 뺨에 파란 식은땀(💧), 앰버 옐로우 톤 배지
 * 3) 'angry' / 'warning' (눈을 번쩍 뜨고 깜짝 놀라며 경고하는 표정): 소음 66dB 초과
 *    - 치켜뜬 눈썹, 으르렁 송곳니(> <), 머리 위 빠직 마크(💢), 크림슨 레드 톤 배지 및 바운스 진동
 */
export const TigerStatusCharacter: React.FC<TigerStatusCharacterProps> = ({
  status = 'comfort',
  size = 'sm',
  showLabel = false,
  customMessage,
  onClick,
  className = '',
}) => {
  // 별칭 정규화 (sleep/calm -> comfort, warning -> angry)
  const normalizedStatus =
    status === 'sleep' || status === 'calm'
      ? 'comfort'
      : status === 'warning'
      ? 'angry'
      : status;

  // 상태별 테마 색상 및 대사
  const config = {
    comfort: {
      label: '평온',
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
      glow: 'shadow-emerald-500/20',
      message: customMessage || '교실이 조용해서 쿨쿨 잠이 잘 와요~ 🌿',
      borderColor: '#10B981',
      cheekColor: '#FDA4AF',
    },
    worried: {
      label: '주의',
      badgeBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
      glow: 'shadow-amber-500/20',
      message: customMessage || '조금씩 시끄러워지고 있어요! 주의해 주세요 🧐',
      borderColor: '#F59E0B',
      cheekColor: '#FDE68A',
    },
    angry: {
      label: '경고',
      badgeBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border-rose-300 dark:border-rose-700 animate-pulse',
      glow: 'shadow-rose-500/30',
      message: customMessage || '어흥! 교실이 너무 시끄러워요! 목소리를 낮춰주세요 🚨',
      borderColor: '#EF4444',
      cheekColor: '#FCA5A5',
    },
  }[normalizedStatus];

  // 크기별 픽셀 규격
  const dimensions = {
    xs: { px: 28, svg: 24 },
    sm: { px: 36, svg: 32 },
    md: { px: 48, svg: 42 },
    lg: { px: 64, svg: 56 },
  }[size];

  return (
    <div
      onClick={onClick}
      title={config.message}
      className={`inline-flex items-center gap-1.5 select-none transition-transform duration-300 ${
        onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'
      } ${className}`}
    >
      {/* 호랑이 캐릭터 원형 아바타 */}
      <div
        className={`relative flex items-center justify-center rounded-full border shadow-sm transition-all duration-300 ${config.badgeBg} ${config.glow}`}
        style={{
          width: `${dimensions.px}px`,
          height: `${dimensions.px}px`,
        }}
      >
        <svg
          width={dimensions.svg}
          height={dimensions.svg}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="transition-transform duration-300"
        >
          {/* 1. 귀 (왼쪽, 오른쪽) */}
          <ellipse cx="25" cy="28" rx="14" ry="16" fill="#F59E0B" />
          <ellipse cx="25" cy="28" rx="8" ry="10" fill="#FEE2E2" />
          <ellipse cx="75" cy="28" rx="14" ry="16" fill="#F59E0B" />
          <ellipse cx="75" cy="28" rx="8" ry="10" fill="#FEE2E2" />

          {/* 2. 얼굴 윤곽 */}
          <circle cx="50" cy="54" r="38" fill="#FBBF24" />

          {/* 3. 호랑이 이마 줄무늬 (王 자 모티브) */}
          <path d="M42 24H58" stroke="#78350F" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M45 29H55" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
          <path d="M50 22V33" stroke="#78350F" strokeWidth="3.5" strokeLinecap="round" />

          {/* 양쪽 뺨 줄무늬 */}
          <path d="M16 48L24 50" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M15 55L25 56" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M84 48L76 50" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M85 55L75 56" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />

          {/* 4. 흰색 주둥이 영역 */}
          <ellipse cx="50" cy="65" rx="19" ry="14" fill="#FFFFFF" />

          {/* 코 */}
          <polygon points="50,60 45,55 55,55" fill="#78350F" />

          {/* 5. 감정 단계별 표정 렌더링 (Comfort / Worried / Angry) */}
          {status === 'comfort' && (
            <g className="animate-pulse">
              {/* 편안한 눈웃음 (^ ^) */}
              <path
                d="M34 50C34 46 42 46 42 50"
                stroke="#78350F"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M58 50C58 46 66 46 66 50"
                stroke="#78350F"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />
              {/* 분홍 볼터치 */}
              <circle cx="30" cy="58" r="5" fill="#FDA4AF" opacity="0.8" />
              <circle cx="70" cy="58" r="5" fill="#FDA4AF" opacity="0.8" />
              {/* 미소 입 */}
              <path
                d="M46 66C48 69 52 69 54 66"
                stroke="#78350F"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          )}

          {status === 'worried' && (
            <g>
              {/* 걱정스러운 처진 눈썹 & 눈 */}
              <path d="M32 44L41 47" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M68 44L59 47" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="37" cy="51" r="3.5" fill="#78350F" />
              <circle cx="63" cy="51" r="3.5" fill="#78350F" />
              {/* 파란 식은땀 방울 */}
              <path
                d="M74 38C74 36 78 33 78 33C78 33 82 36 82 38C82 40.2 80.2 42 78 42C75.8 42 74 40.2 74 38Z"
                fill="#38BDF8"
              />
              {/* 흔들리는 입 */}
              <path
                d="M45 68C48 66 52 69 55 67"
                stroke="#78350F"
                strokeWidth="2.8"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          )}

          {status === 'angry' && (
            <g>
              {/* 화난 치켜뜬 눈썹 */}
              <path d="M33 46L43 42" stroke="#78350F" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M67 46L57 42" stroke="#78350F" strokeWidth="3.5" strokeLinecap="round" />
              {/* 부릅뜬 눈 */}
              <circle cx="38" cy="50" r="4" fill="#DC2626" />
              <circle cx="62" cy="50" r="4" fill="#DC2626" />
              <circle cx="37" cy="49" r="1.5" fill="#FFFFFF" />
              <circle cx="61" cy="49" r="1.5" fill="#FFFFFF" />
              {/* 빠직 마크 (💢) */}
              <path
                d="M75 22L79 28M73 26L81 24"
                stroke="#EF4444"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* 으르렁 입 & 작은 송곳니 */}
              <path
                d="M44 68Q50 63 56 68"
                stroke="#78350F"
                strokeWidth="3"
                strokeLinecap="round"
                fill="#B91C1C"
              />
              <polygon points="47,66 49,69 51,66" fill="#FFFFFF" />
            </g>
          )}
        </svg>

        {/* 상태 도트 인디케이터 */}
        <span
          className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white dark:border-slate-900 shadow-2xs"
          style={{ backgroundColor: config.borderColor }}
        />
      </div>

      {/* 라벨 텍스트 노출 옵션 */}
      {showLabel && (
        <span
          className={`px-1.5 py-0.5 rounded-md text-[10px] font-black border tracking-tight ${config.badgeBg}`}
        >
          {config.label}
        </span>
      )}
    </div>
  );
};
