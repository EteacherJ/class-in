/**
 * 📌 이번 주 마감 모아보기 (헤더 배지)
 *  - 학급 일정(오늘~6일 뒤) + 7일 안에 다가오는 D-day 를 한곳에 모아 보여줘요.
 *  - 오늘 할 일이 있으면 배지가 살짝 빛나요.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarClock } from 'lucide-react';
import { CAL_KEYS, dday } from '../utils/calendarSync';

interface Item { id: string; title: string; date: string; time?: string; kind: '일정' | 'D-day' }

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function readWeek(): Item[] {
  const now = new Date();
  const today = ymd(now);
  const end = ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6));
  const out: Item[] = [];
  const seen = new Set<string>();
  try {
    const raw = JSON.parse(localStorage.getItem(CAL_KEYS.events) || '[]');
    const hidden: string[] = JSON.parse(localStorage.getItem(CAL_KEYS.hidden) || '[]');
    if (Array.isArray(raw)) raw.forEach((e: any) => {
      if (!e || !e.date || String(e.id).startsWith('mock-ev-') || hidden.includes(e.id)) return;
      const d = String(e.date).slice(0, 10);
      const last = String(e.endDate || e.date).slice(0, 10);
      if (last < today || d > end) return;
      const shown = d < today ? today : d;
      const k = `${e.title}|${shown}`;
      if (seen.has(k)) return;
      seen.add(k);
      out.push({ id: `e-${e.id}`, title: String(e.title || '일정'), date: shown, time: e.time, kind: '일정' });
    });
  } catch { /* 무시 */ }
  try {
    const dd = JSON.parse(localStorage.getItem('class_dday_items') || '[]');
    if (Array.isArray(dd)) dd.forEach((x: any) => {
      const d = String(x?.targetDate || '').slice(0, 10);
      if (!d || d < today || d > end) return;
      const k = `${x.title}|${d}`;
      if (seen.has(k)) return;
      seen.add(k);
      out.push({ id: `d-${x.id}`, title: String(x.title || 'D-day'), date: d, kind: 'D-day' });
    });
  } catch { /* 무시 */ }
  return out.sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
}

const WD = ['일', '월', '화', '수', '목', '금', '토'];

export const DeadlineBadge: React.FC = () => {
  const [items, setItems] = useState<Item[]>(readWeek);
  const [pop, setPop] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const refresh = () => setItems(readWeek());
    const t = window.setInterval(refresh, 60_000);
    const onStorage = (e: StorageEvent) => { if (!e.key || e.key === CAL_KEYS.events || e.key === 'class_dday_items' || e.key === CAL_KEYS.hidden) refresh(); };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(t); window.removeEventListener('storage', onStorage); window.removeEventListener('focus', refresh); };
  }, []);

  useEffect(() => {
    if (!pop) return;
    const close = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-dl-pop]') || t.closest('[data-dl-btn]')) return;
      setPop(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [pop]);

  const todayCount = useMemo(() => items.filter((i) => i.date === ymd(new Date())).length, [items]);

  return (
    <>
      <button
        type="button"
        data-dl-btn
        onClick={(e) => {
          if (pop) { setPop(null); return; }
          setItems(readWeek());
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          setPop({ x: r.right, y: r.bottom + 6 });
        }}
        className={`dl-badge flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-black shrink-0 transition cursor-pointer ${todayCount > 0 ? 'is-hot border-rose-300 bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:border-rose-400/40 dark:text-rose-200' : 'border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#090e1a]/85 text-slate-600 dark:text-slate-200 hover:border-indigo-300'}`}
        title="오늘~이번 주 일정과 D-day 모아보기"
        aria-expanded={!!pop}
      >
        <CalendarClock className="w-3.5 h-3.5" />
        <span>이번 주</span>
        <span className={`min-w-[18px] h-[18px] px-1 rounded-full grid place-items-center text-[10px] ${todayCount > 0 ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-white/10'}`}>{items.length}</span>
      </button>
      {pop && createPortal(
        <div data-dl-pop className="bm-group-pop fixed z-[9500] w-[290px] rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-xl shadow-2xl p-2" style={{ left: Math.max(8, Math.min(pop.x - 290, window.innerWidth - 298)), top: pop.y }}>
          <div className="flex items-center justify-between px-2 pt-1 pb-2">
            <span className="text-xs font-black text-slate-800 dark:text-slate-100">📌 오늘 ~ 이번 주</span>
            <span className="text-[10px] font-bold text-slate-400">{items.length}개</span>
          </div>
          {items.length === 0 ? (
            <p className="text-[11px] text-slate-400 px-2 pb-3">이번 주에는 예정된 일정이 없어요. 여유로운 한 주예요 🌿</p>
          ) : (
            <div className="flex flex-col gap-1 max-h-[320px] overflow-y-auto custom-scrollbar">
              {items.map((it, i) => {
                const dd = dday(it.date);
                const [y, m, d] = it.date.split('-').map(Number);
                const wd = WD[new Date(y, m - 1, d).getDay()];
                return (
                  <div key={it.id} className="bm-group-item flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5" style={{ animationDelay: `${i * 30}ms` }}>
                    <span className={`w-12 text-center text-[10px] font-black py-1 rounded-lg shrink-0 ${dd.tone === 'today' ? 'bg-rose-500 text-white' : dd.tone === 'soon' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300'}`}>{dd.text}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{it.title}</span>
                      <span className="block text-[10px] text-slate-400">{m}/{d}({wd}){it.time ? ` ${it.time}` : ''} · {it.kind}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  );
};

export default DeadlineBadge;
