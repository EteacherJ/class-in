import React, { useMemo } from 'react';
import { CONTEXT_SHORTCUTS, MAC_APP_MENU_KEYS, SHORTCUTS, formatContextKeys, formatShortcutKeys, isMacPlatform, type ShortcutDef } from '../constants/shortcuts';

/**
 * ⌨️ 단축키 목록 (단축키 안내판 · 환경설정 6단계 공용)
 * - 운영체제에 맞는 키 기호로 보여 줘요 (Windows: Ctrl · Alt / 맥: ⌘ · ⌥ · ⇧ · ⌃)
 */
const GROUP_ORDER: ShortcutDef['group'][] = ['기본', '화면 모드', '도구'];

const Keys: React.FC<{ keys: string[] }> = ({ keys }) => (
  <span className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
    {keys.map((k, i) => (
      <kbd
        key={i}
        className="min-w-[28px] h-7 px-2 inline-flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-300/80 dark:border-slate-600 border-b-2 text-xs font-bold font-mono text-slate-700 dark:text-slate-100 whitespace-nowrap"
      >
        {k}
      </kbd>
    ))}
  </span>
);

const Row: React.FC<{ label: string; keys: string[]; alt?: string[] }> = ({ label, keys, alt }) => (
  <li className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-white/5" data-shortcut-row={label}>
    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</span>
    <span className="flex items-center gap-1.5">
      <Keys keys={keys} />
      {alt && (
        <>
          <span className="text-[11px] text-slate-400 font-bold">또는</span>
          <Keys keys={alt} />
        </>
      )}
    </span>
  </li>
);

export const ShortcutList: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const isMac = useMemo(() => isMacPlatform(), []);
  return (
    <div className="space-y-5" data-shortcut-list>
      <div className="flex items-center gap-2 flex-wrap text-xs font-bold text-slate-600 dark:text-slate-300">
        <span className="px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-200">{isMac ? '🍎 macOS 기준' : '🪟 Windows 기준'}</span>
        <span>{isMac ? '⌘ Command · ⌥ Option · ⇧ Shift · ⌃ Control' : 'Ctrl · Alt · Shift'}</span>
        <span className="text-slate-400">· 한글 입력 상태에서도 동작해요</span>
      </div>

      <div>
        <h4 className="text-[13px] font-black text-slate-800 dark:text-white mb-2">어디서나 쓰는 단축키</h4>
        <div className={`grid grid-cols-1 ${compact ? '' : 'md:grid-cols-2'} gap-4`}>
          {GROUP_ORDER.map((group) => (
            <section key={group} className={group === '도구' && !compact ? 'md:col-span-2' : ''}>
              <h5 className="text-xs font-black text-indigo-600 dark:text-indigo-300 mb-2 tracking-wide">{group}</h5>
              <ul className={`grid gap-1.5 ${group === '도구' && !compact ? 'md:grid-cols-2' : ''}`}>
                {SHORTCUTS.filter((s) => s.group === group).map((s) => (
                  <Row key={s.action} label={s.label} keys={formatShortcutKeys(s, isMac)} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-[13px] font-black text-slate-800 dark:text-white mb-2">특정 화면에서 쓰는 단축키</h4>
        <div className={`grid grid-cols-1 ${compact ? '' : 'md:grid-cols-2'} gap-4`}>
          {CONTEXT_SHORTCUTS.map((g) => (
            <section key={g.group}>
              <h5 className="text-xs font-black text-emerald-600 dark:text-emerald-300 mb-2 tracking-wide">
                {g.group} <span className="font-bold text-slate-400">· {g.where}</span>
              </h5>
              <ul className="grid gap-1.5">
                {g.items.map((it) => (
                  <Row key={it.label} label={it.label} keys={formatContextKeys(it.keys, isMac)} alt={it.alt ? formatContextKeys(it.alt, isMac) : undefined} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      {isMac && (
        <div>
          <h4 className="text-[13px] font-black text-slate-800 dark:text-white mb-2">맥 기본 키 (앱 메뉴)</h4>
          <ul className={`grid gap-1.5 ${compact ? '' : 'md:grid-cols-2'}`}>
            {MAC_APP_MENU_KEYS.map((m) => (
              <Row key={m.label} label={m.label} keys={m.keys} />
            ))}
          </ul>
        </div>
      )}

      <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">
        💡 글자를 입력하는 중에는 <b>Space · ? · R · B</b> 같은 한 글자 단축키는 동작하지 않아요. 화면 잠금 중에는 모든 단축키가 꺼져요. 언제든{' '}
        <kbd className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 font-mono text-[11px]">?</kbd> 키로 이 목록을 다시 볼 수 있어요.
      </p>
    </div>
  );
};
export default ShortcutList;
