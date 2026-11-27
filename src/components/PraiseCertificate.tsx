import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import { MochiBody, useMochiTint } from './MochiCharacter';
import { printElementById } from '../utils/printHelper';

/**
 * 🏅 칭찬 상장 미리 보기 · 인쇄 (A4 가로)
 *  - 모둠 상장 / 개인 상장
 *  - 상 이름 · 칭찬 문구를 바로 고쳐서 인쇄
 */
export interface CertificateTarget {
  kind: 'team' | 'student';
  name: string;
  points: number;
  members?: string[];
  reward?: string;
}

const TITLES = {
  team: ['🤝 최고 협력 모둠상', '🌈 사이좋은 무지개 모둠상', '🚀 우주 최강 팀워크상', '🌟 칭찬 도장 챔피언상'],
  student: ['🌟 칭찬왕 상', '💖 따뜻한 마음 상', '🙋 씩씩한 발표왕 상', '🌱 쑥쑥 성장 상'],
};

const defaultMessage = (t: CertificateTarget) =>
  t.kind === 'team'
    ? `위 모둠은 서로 돕고 배려하며 멋진 협력을 보여 주었고, 칭찬 도장 ${t.points}개를 모아 우리 반을 더 행복하게 만들었기에 이 상장을 주어 칭찬합니다.`
    : `위 어린이는 늘 밝은 웃음과 따뜻한 마음으로 친구들과 함께하며, 칭찬 도장 ${t.points}개를 모아 우리 반의 자랑이 되었기에 이 상장을 주어 칭찬합니다.`;

export const PraiseCertificate: React.FC<{
  target: CertificateTarget;
  classLabel?: string; // 예: 3학년 1반
  teacherName?: string;
  onClose: () => void;
}> = ({ target, classLabel = '', teacherName = '', onClose }) => {
  const [tint] = useMochiTint();
  const [title, setTitle] = useState(TITLES[target.kind][0]);
  const [message, setMessage] = useState(defaultMessage(target));
  const [teacher, setTeacher] = useState(teacherName);
  const now = new Date();
  const dateText = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;

  const print = () =>
    printElementById('praise-cert-sheet', {
      title: `칭찬 상장 - ${target.name}`,
      orientation: 'landscape',
      margin: '0',
      customCss: `
        #print-root { align-items: stretch; justify-content: stretch; }
        #praise-cert-sheet { width: 297mm !important; height: 210mm !important; max-width: none !important; aspect-ratio: auto !important; border-radius: 0 !important; box-shadow: none !important; transform: none !important; }
      `,
    });

  return createPortal(
    <div className="pc-overlay" data-praise-cert>
      <div className="pc-panel">
        <div className="pc-tools no-print">
          <b>🏅 상장 미리 보기</b>
          <label>
            상 이름
            <select value={TITLES[target.kind].includes(title) ? title : '__custom'} onChange={(e) => e.target.value !== '__custom' && setTitle(e.target.value)}>
              {TITLES[target.kind].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              <option value="__custom">✏️ 직접 쓰기</option>
            </select>
          </label>
          <input className="pc-title-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="상 이름" data-cert-title />
          <input className="pc-teacher-input" value={teacher} onChange={(e) => setTeacher(e.target.value)} placeholder="선생님 이름" />
          <button type="button" className="pc-print" onClick={print} data-cert-print>
            <Printer className="w-4 h-4" /> 인쇄하기
          </button>
          <button type="button" className="pc-close" onClick={onClose} aria-label="닫기">
            <X className="w-4 h-4" />
          </button>
        </div>
        <textarea className="pc-msg-input no-print" value={message} onChange={(e) => setMessage(e.target.value)} rows={2} data-cert-msg />

        <div className="pc-stage">
          <div id="praise-cert-sheet" className="pc-sheet">
            <div className="pc-frame">
              <span className="pc-corner c1">⭐</span>
              <span className="pc-corner c2">🌈</span>
              <span className="pc-corner c3">🎈</span>
              <span className="pc-corner c4">🍀</span>
              <div className="pc-confetti" aria-hidden>
                {Array.from({ length: 14 }).map((_, i) => (
                  <i key={i} style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, transform: `rotate(${i * 29}deg)` }} />
                ))}
              </div>

              <div className="pc-ribbon">
                <span>칭 찬 상 장</span>
              </div>
              <div className="pc-title">{title}</div>

              <div className="pc-namebox">
                <div className="pc-name">
                  {target.name}
                  {target.kind === 'student' && <small> 어린이</small>}
                </div>
                {target.kind === 'team' && target.members && target.members.length > 0 && (
                  <div className="pc-members">
                    {target.members.map((m) => (
                      <span key={m}>{m}</span>
                    ))}
                  </div>
                )}
              </div>

              <p className="pc-message">{message}</p>

              <div className="pc-badges">
                <span className="pc-badge">💮 칭찬 도장 {target.points}개</span>
                {target.reward && <span className="pc-badge is-gift">🎁 {target.reward}</span>}
              </div>

              <div className="pc-foot">
                <div className="pc-lumi">
                  <MochiBody face="proud" tint={tint} glow="low" className="w-full h-full" />
                </div>
                <div className="pc-sign">
                  <div className="pc-date">{dateText}</div>
                  <div className="pc-teacher">
                    {classLabel && <span>{classLabel} </span>}담임 선생님 <b>{teacher || '      '}</b>
                  </div>
                </div>
                <div className="pc-stamp">
                  <span>참</span>
                  <span>잘했어요</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PraiseCertificate;
