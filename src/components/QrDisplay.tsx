/**
 * 🔳 보조화면 · QR 띄우기
 *  - 주소(설문 · 패들렛 · 영상 링크 등)나 글을 넣으면 큰 QR 코드로 보여 줘요
 *  - 최근 띄운 QR 8개를 기억해서 한 번에 다시 띄우기
 *  - 학생 휴대폰/태블릿으로 찍기 쉽게 화면 가운데 크게, 제목과 짧은 주소도 함께
 */
import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

const KEY = 'dm_qr_history_v1';
interface QrItem {
  text: string;
  title: string;
  at: number;
}
const readHist = (): QrItem[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
const shortText = (t: string) => t.replace(/^https?:\/\//, '').replace(/\/$/, '').slice(0, 60) + (t.length > 64 ? '…' : '');

export const QrDisplay: React.FC<{ isLight: boolean }> = ({ isLight }) => {
  const [hist, setHist] = useState<QrItem[]>(readHist);
  const [cur, setCur] = useState<QrItem | null>(() => readHist()[0] || null);
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [editing, setEditing] = useState(() => readHist().length === 0);
  const [err, setErr] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!cur || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, cur.text, { width: 900, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#0f172a', light: '#ffffff' } }).catch(() => setErr('QR을 만들 수 없는 글이에요. 너무 길면 줄여 주세요.'));
  }, [cur]);

  const show = () => {
    const t = text.trim();
    if (!t) {
      setErr('주소나 글을 넣어 주세요.');
      return;
    }
    if (t.length > 1500) {
      setErr('글이 너무 길어요 (1500자까지).');
      return;
    }
    const item: QrItem = { text: t, title: title.trim(), at: Date.now() };
    const next = [item, ...hist.filter((h) => h.text !== t)].slice(0, 8);
    setHist(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    setCur(item);
    setErr('');
    setEditing(false);
    setText('');
    setTitle('');
  };
  const remove = (t: string) => {
    const next = hist.filter((h) => h.text !== t);
    setHist(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    if (cur?.text === t) setCur(next[0] || null);
  };
  const pasteClip = async () => {
    try {
      const v = await navigator.clipboard.readText();
      if (v) setText(v.trim());
    } catch {
      setErr('붙여넣기는 입력 칸을 누르고 Ctrl+V(⌘+V)로 해 주세요.');
    }
  };

  return (
    <div className={`qrd ${isLight ? 'is-light' : 'is-dark'}`} data-qr-display>
      <div className="qrd-main">
        {cur && !editing ? (
          <div className="qrd-card">
            {cur.title && <h2 className="qrd-title">{cur.title}</h2>}
            <canvas ref={canvasRef} className="qrd-canvas" data-qr-canvas />
            <p className="qrd-url" title={cur.text}>
              📱 휴대폰 카메라로 찍어 보세요 · <span>{shortText(cur.text)}</span>
            </p>
          </div>
        ) : (
          <div className="qrd-form">
            <h2>🔳 QR 코드 띄우기</h2>
            <label>
              제목 (선택)
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 오늘의 설문, 우리 반 패들렛" maxLength={40} />
            </label>
            <label>
              주소 또는 글
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setErr('');
                }}
                placeholder="https://… 주소를 붙여넣어 주세요"
                rows={3}
                data-qr-input
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) show();
                }}
              />
            </label>
            {err && <p className="qrd-err">⚠️ {err}</p>}
            <div className="qrd-btns">
              <button type="button" onClick={pasteClip}>
                📋 붙여넣기
              </button>
              {cur && (
                <button type="button" onClick={() => setEditing(false)}>
                  취소
                </button>
              )}
              <button type="button" className="is-go" onClick={show} data-qr-show>
                🔳 크게 띄우기
              </button>
            </div>
          </div>
        )}
      </div>
      <aside className="qrd-side">
        <button type="button" className="qrd-new" onClick={() => setEditing(true)} data-qr-new>
          ➕ 새 QR 만들기
        </button>
        <b className="qrd-side-h">🕘 최근 QR</b>
        {hist.length === 0 && <p className="qrd-empty">아직 없어요</p>}
        {hist.map((h) => (
          <div key={h.text} className={`qrd-item ${cur?.text === h.text && !editing ? 'is-on' : ''}`}>
            <button
              type="button"
              onClick={() => {
                setCur(h);
                setEditing(false);
              }}
            >
              <b>{h.title || '제목 없음'}</b>
              <small>{shortText(h.text)}</small>
            </button>
            <button type="button" className="qrd-x" onClick={() => remove(h.text)} title="지우기">
              ✕
            </button>
          </div>
        ))}
      </aside>
    </div>
  );
};
