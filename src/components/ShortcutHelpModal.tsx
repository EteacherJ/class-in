import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Keyboard, X } from 'lucide-react';
import { isMacPlatform } from '../constants/shortcuts';
import { ShortcutList } from './ShortcutList';

interface ShortcutHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}


/**
 * ⌨️ 단축키 안내판
 * - 헤더의 ⌨️ 아이콘 또는 ? 키로 열립니다.
 * - 운영체제(맥/윈도우)에 맞는 키 기호로 표시합니다.
 */
export const ShortcutHelpModal: React.FC<ShortcutHelpModalProps> = ({ isOpen, onClose }) => {
  const isMac = useMemo(() => isMacPlatform(), []);
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcut-help-title"
    >
      <div
        className="w-full max-w-4xl max-h-[88vh] overflow-y-auto rounded-3xl border border-white/60 dark:border-white/10 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl shadow-2xl p-6 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 id="shortcut-help-title" className="text-lg font-black text-slate-900 dark:text-white">
                키보드 단축키
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isMac ? 'macOS 기준 (⌘ Command · ⌥ Option)' : 'Windows 기준'} · 언제든 <kbd className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 font-mono text-[11px]">?</kbd> 키로 다시 열 수 있어요
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 dark:hover:text-white transition active:scale-95"
            aria-label="단축키 안내 닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <ShortcutList />
      </div>
    </div>,
    document.body
  );
};
