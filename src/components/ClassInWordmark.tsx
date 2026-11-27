import React from 'react';
import { LogoBabyLumi } from './LogoBabyLumi';

/**
 * Class in 글자형 로고 (워드마크)
 * - 이미지 대신 글자로 그려 어떤 화면 배율에서도 선명하고, 라이트/다크 모드 색이 자동으로 바뀝니다.
 * - "Class"는 브랜드 인디고, "in"은 민트 유리 알약 안에 표시합니다.
 * - i 는 글꼴에 의존하지 않도록 막대(stem) + 점(dot)을 직접 그립니다. (맥 글꼴에서 글자가 사라지던 문제 수정)
 * - 로고 위에서 아기 루미가 칠판 가리키기·춤·빼꼼 인사·낮잠 장면을 번갈아 보여 줍니다.
 */
export const ClassInWordmark: React.FC<{ size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string; withTeacher?: boolean }> = ({
  size = 'md',
  className = '',
  withTeacher = false,
}) => {
  const text = size === 'xl' ? 'text-[56px] sm:text-[72px]' : size === 'lg' ? 'text-[30px]' : size === 'sm' ? 'text-[18px]' : 'text-[22px] sm:text-[24px]';
  return (
    <span className={`ci-wordmark-wrap relative inline-flex ${className}`}>
      <span className={`ci-wordmark inline-flex items-center select-none leading-none ${text}`} aria-label="Class in">
        <span className="ci-wordmark-class">Class</span>
        <span className="ci-wordmark-in" aria-hidden>
          <span className="ci-wordmark-i">
            <span className="ci-wordmark-stem" />
            <span className="ci-wordmark-dot" />
          </span>
          <span className="ci-wordmark-n">n</span>
        </span>
      </span>
      {withTeacher && <LogoBabyLumi />}
    </span>
  );
};

export default ClassInWordmark;
