/**
 * ⌨️ 빠른 실행 (Ctrl/⌘ + K)
 *  - 위젯 켜기/끄기, 화면 모드, 바로가기 사이트, 독 기능을 이름(또는 초성)으로 찾아 바로 실행해요.
 *  - ↑/↓ 로 고르고 Enter 로 실행, Esc 로 닫기
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, CornerDownLeft } from 'lucide-react';

export interface PaletteCommand {
  id: string;
  label: string;
  group: string;
  emoji?: string;
  hint?: string;
  keywords?: string;
  run: () => void;
}

const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
function chosung(text: string): string {
  let out = '';
  for (const ch of text) {
    const c = ch.charCodeAt(0) - 0xac00;
    out += c >= 0 && c <= 11171 ? CHO[Math.floor(c / 588)] : ch;
  }
  return out;
}
const norm = (t: string) => t.toLowerCase().replace(/\s+/g, '');

function score(cmd: PaletteCommand, q: string): number {
  if (!q) return 1;
  const hay = norm(`${cmd.label} ${cmd.keywords || ''} ${cmd.group}`);
  const nq = norm(q);
  const idx = hay.indexOf(nq);
  if (idx === 0) return 100;
  if (idx > 0) return 80 - Math.min(idx, 40);
  // 초성 검색 (예: ㅍㅋㅅ → 포커스)
  if (/^[ㄱ-ㅎ]+$/.test(nq) && chosung(hay).includes(nq)) return 50;
  // 글자 순서대로 포함
  let i = 0;
  for (const ch of hay) if (ch === nq[i]) i++;
  return i === nq.length ? 20 : 0;
}

interface Props {
  open: boolean;
  onClose: () => void;
  commands: PaletteCommand[];
}

export const CommandPalette: React.FC<Props> = ({ open, onClose, commands }) => {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setSel(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo(() => {
    return commands
      .map((c, i) => ({ c, s: score(c, q), i }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s || a.i - b.i)
      .slice(0, 60)
      .map((r) => r.c);
  }, [commands, q]);

  useEffect(() => { setSel(0); }, [q]);
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-cp-idx="${sel}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  if (!open) return null;

  const run = (cmd?: PaletteCommand) => {
    if (!cmd) return;
    onClose();
    setTimeout(() => cmd.run(), 30);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((v) => Math.min(results.length - 1, v + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((v) => Math.max(0, v - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (!e.nativeEvent.isComposing) run(results[sel]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); }
  };

  let lastGroup = '';
  return createPortal(
    <div className="cp-backdrop fixed inset-0 z-[9800] flex items-start justify-center pt-[12vh] px-4 bg-slate-950/40 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        className="cp-panel w-full max-w-[560px] rounded-3xl bg-white/95 dark:bg-[#0f172a]/95 border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="빠른 실행"
      >
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-slate-100 dark:border-white/10">
          <Search className="w-4 h-4 text-indigo-500 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="무엇을 할까요? (예: 타이머, 포커스, ㄴㅇㅅ)"
            className="flex-1 bg-transparent outline-none text-[15px] font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-medium"
          />
          <kbd className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300">Esc</kbd>
        </div>
        <div ref={listRef} className="max-h-[52vh] overflow-y-auto custom-scrollbar p-2">
          {results.length === 0 && <p className="text-center text-xs text-slate-400 py-8">찾는 기능이 없어요. 다른 낱말로 찾아보세요.</p>}
          {results.map((c, idx) => {
            const head = c.group !== lastGroup ? c.group : null;
            lastGroup = c.group;
            const active = idx === sel;
            return (
              <React.Fragment key={c.id}>
                {head && <div className="px-3 pt-2.5 pb-1 text-[10px] font-black tracking-wide text-slate-400">{head}</div>}
                <button
                  type="button"
                  data-cp-idx={idx}
                  onMouseEnter={() => setSel(idx)}
                  onClick={() => run(c)}
                  className={`w-full flex items-center gap-3 px-3 min-h-[44px] rounded-2xl text-left transition ${active ? 'bg-indigo-50 dark:bg-indigo-500/15' : ''}`}
                >
                  <span className="w-7 h-7 rounded-xl grid place-items-center text-sm bg-slate-100 dark:bg-white/10 shrink-0">{c.emoji || '•'}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate">{c.label}</span>
                    {c.hint && <span className="block text-[10px] text-slate-400 truncate">{c.hint}</span>}
                  </span>
                  {active && <CornerDownLeft className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                </button>
              </React.Fragment>
            );
          })}
        </div>
        <div className="flex items-center justify-between px-4 h-9 border-t border-slate-100 dark:border-white/10 text-[10px] text-slate-400 font-bold">
          <span>↑↓ 고르기 · Enter 실행</span>
          <span>초성으로도 찾을 수 있어요</span>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default CommandPalette;
