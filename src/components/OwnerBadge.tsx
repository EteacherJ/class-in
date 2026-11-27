/**
 * 🐯 TigerT 제작자 표시 — 호랑이 아이콘 + © 2026 TigerT. All rights reserved.
 *  (그림그래프 · 평가ON · 스마트 반편성과 같은 표시)
 */
import React from 'react';
import tigerIcon from '../assets/tigert-icon-128.png';

export const OWNER_TEXT = '© 2026 TigerT. All rights reserved.';

export const OwnerBadge: React.FC<{ tone?: 'light' | 'dark' | 'auto'; size?: 'xs' | 'sm' | 'md'; className?: string; style?: React.CSSProperties }> = ({
  tone = 'auto',
  size = 'sm',
  className = '',
  style,
}) => (
  <span className={`owner-badge is-${tone} is-${size} ${className}`} title={`만든 사람 TigerT · ${OWNER_TEXT}`} style={style} data-owner-badge>
    <img src={tigerIcon} alt="TigerT" draggable={false} />
    <span>{OWNER_TEXT}</span>
  </span>
);

export default OwnerBadge;
