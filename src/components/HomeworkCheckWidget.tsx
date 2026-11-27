/**
 * 📮 과제 · 알림장 검사 위젯
 *  - 과제명 · 마감 일시 · 학생별 체크리스트
 *  - 보조화면: 아침 화면 · 터치 제출판 · 하교 때 '안 낸 친구' 알림 (청소·종례)
 */
import React, { useMemo, useState } from 'react';
import type { Student } from '../types';
import { HW_KINDS, dueLabel, isActiveToday, missingOf, newTask, toggleDone, updateTask, useHomework, ymd, type HwTask } from '../utils/homeworkStore';

const defaultDue = () => `${ymd()}T15:00`;

export const HomeworkCheckWidget: React.FC<{ students: Student[]; onShowToast: (m: string) => void; onOpenDisplay?: () => void }> = ({ students, onShowToast, onOpenDisplay }) => {
  const [list, save] = useHomework();
  const sorted = useMemo(() => [...students].sort((a, b) => (a.number || 0) - (b.number || 0)), [students]);
  const open = list.filter((t) => !t.closed);
  const [curId, setCurId] = useState<string | null>(null);
  const cur = open.find((t) => t.id === curId) || open[0] || null;
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', kind: 'homework' as HwTask['kind'], due: defaultDue(), alert: true });
  const [showClosed, setShowClosed] = useState(false);

  const add = () => {
    if (!form.title.trim()) {
      onShowToast('📮 과제 이름을 적어 주세요.');
      return;
    }
    const t = newTask({ title: form.title.trim(), kind: form.kind, due: form.due, alertAtDismissal: form.alert });
    save([t, ...list]);
    setCurId(t.id);
    setAdding(false);
    setForm({ title: '', kind: 'homework', due: defaultDue(), alert: true });
    onShowToast(`📮 '${t.title}' 검사를 시작했어요.`);
  };
  const missing = cur ? missingOf(cur, sorted) : [];
  const doneN = cur ? sorted.filter((s) => cur.done.includes(s.id)).length : 0;
  const total = cur ? sorted.length - cur.excused.filter((id) => sorted.some((s) => s.id === id)).length : 0;
  const pct = total ? Math.round((doneN / total) * 100) : 0;

  return (
    <section className="hw-w w-full h-full p-3.5 sm:p-4 flex flex-col gap-2.5 overflow-hidden text-slate-800 dark:text-slate-100" data-homework-widget>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white grid place-items-center text-sm shadow-xs">📮</div>
          <div className="min-w-0">
            <div className="font-extrabold text-sm">과제 · 알림장 검사</div>
            <div className="text-[10px] text-slate-400">이름을 누르면 냈어요 ✅ · 길게 누르면 사정 있음</div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onOpenDisplay && (
            <button type="button" onClick={onOpenDisplay} className="px-2 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 cursor-pointer" title="보조화면(전자칠판)에 터치 제출판 띄우기" data-hw-display>
              🖥 보조화면
            </button>
          )}
          <button type="button" onClick={() => setAdding((v) => !v)} className="px-2 py-1 rounded-lg text-[11px] font-black bg-violet-600 text-white hover:bg-violet-700 cursor-pointer" data-hw-add>
            ＋ 새 과제
          </button>
        </div>
      </div>

      {adding && (
        <div className="p-2.5 rounded-xl bg-violet-50/80 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 space-y-1.5">
          <div className="flex gap-1.5">
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as HwTask['kind'] })} className="text-xs px-2 py-1 rounded-lg border border-slate-300 bg-white text-slate-700">
              {Object.entries(HW_KINDS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.emoji} {v.label}
                </option>
              ))}
            </select>
            <input
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder="예: 수학 익힘책 42쪽"
              className="flex-1 min-w-0 text-xs px-2 py-1 rounded-lg border border-slate-300 bg-white text-slate-800"
              data-hw-title
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
            <span className="font-bold text-slate-500">마감</span>
            <input type="datetime-local" min="2000-01-01T00:00" max="2099-12-31T23:59" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} className="text-xs px-2 py-1 rounded-lg border border-slate-300 bg-white text-slate-700" />
            <label className="flex items-center gap-1 font-bold text-slate-600 cursor-pointer">
              <input type="checkbox" checked={form.alert} onChange={(e) => setForm({ ...form, alert: e.target.checked })} className="accent-violet-600" />
              하교 때 안 낸 친구 알림
            </label>
            <button type="button" onClick={add} className="ml-auto px-2.5 py-1 rounded-lg bg-violet-600 text-white font-black cursor-pointer" data-hw-save>
              만들기
            </button>
          </div>
        </div>
      )}

      {open.length > 0 && (
        <div className="flex gap-1 overflow-x-auto no-scrollbar shrink-0">
          {open.map((t) => {
            const m = missingOf(t, sorted).length;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setCurId(t.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap border cursor-pointer ${cur?.id === t.id ? 'bg-violet-600 text-white border-violet-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}
              >
                {HW_KINDS[t.kind].emoji} {t.title} {m === 0 ? '✓' : `· ${m}`}
              </button>
            );
          })}
        </div>
      )}

      {cur ? (
        <>
          <div className="flex items-center gap-2 text-[11px] shrink-0">
            <span className={`px-2 py-0.5 rounded-full font-bold ${isActiveToday(cur) ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-slate-100 text-slate-500'}`}>⏰ {dueLabel(cur)}</span>
            <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <i className="block h-full bg-gradient-to-r from-violet-500 to-emerald-400 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <b className="tabular-nums">
              {doneN}/{total}
            </b>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-1">
              {sorted.map((s) => {
                const done = cur.done.includes(s.id);
                const ex = cur.excused.includes(s.id);
                let pressT = 0;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onPointerDown={() => (pressT = Date.now())}
                    onClick={() => {
                      if (Date.now() - pressT > 550) {
                        updateTask(cur.id, (t) => ({ ...t, excused: ex ? t.excused.filter((x) => x !== s.id) : [...t.excused, s.id], done: t.done.filter((x) => x !== s.id) }));
                        return;
                      }
                      toggleDone(cur.id, s.id);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      updateTask(cur.id, (t) => ({ ...t, excused: ex ? t.excused.filter((x) => x !== s.id) : [...t.excused, s.id], done: t.done.filter((x) => x !== s.id) }));
                    }}
                    className={`hw-chip ${done ? 'is-done' : ex ? 'is-ex' : ''}`}
                    title={ex ? '사정 있음 (다시 길게 누르면 해제)' : done ? '냈어요' : '아직'}
                    data-hw-student={s.id}
                  >
                    <small>{s.number}</small>
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-wrap text-[11px] shrink-0">
            <span className="font-bold text-rose-600 truncate flex-1 min-w-0">
              {missing.length ? `아직: ${missing.map((s) => s.name).join(', ')}` : '🎉 모두 냈어요!'}
            </span>
            <button type="button" onClick={() => updateTask(cur.id, (t) => ({ ...t, done: sorted.map((s) => s.id).filter((id) => !t.excused.includes(id)) }))} className="hw-mini">
              모두 냄
            </button>
            <button type="button" onClick={() => updateTask(cur.id, (t) => ({ ...t, done: [], excused: [] }))} className="hw-mini">
              ↺ 처음부터
            </button>
            <button type="button" onClick={() => updateTask(cur.id, (t) => ({ ...t, alertAtDismissal: !t.alertAtDismissal }))} className={`hw-mini ${cur.alertAtDismissal ? 'is-on' : ''}`} title="하교 때 청소·종례 화면에 안 낸 친구 알림">
              🔔 하교 알림 {cur.alertAtDismissal ? 'ON' : 'OFF'}
            </button>
            <button type="button" onClick={() => updateTask(cur.id, (t) => ({ ...t, closed: true }))} className="hw-mini" title="검사 끝내기 (지난 과제로 보관)" data-hw-close>
              ✔ 검사 끝
            </button>
          </div>
        </>
      ) : (
        <div className="flex-1 grid place-items-center text-center text-xs text-slate-400 font-bold">
          <div>
            📮 [＋ 새 과제]로 검사할 과제나 알림장을 만들어 주세요.
            <br />
            보조화면(전자칠판)에서 학생이 직접 이름을 눌러 낼 수 있어요.
          </div>
        </div>
      )}

      {list.some((t) => t.closed) && (
        <div className="shrink-0 text-[11px]">
          <button type="button" onClick={() => setShowClosed((v) => !v)} className="font-bold text-slate-400 hover:text-slate-600 cursor-pointer">
            {showClosed ? '▾' : '▸'} 지난 과제 {list.filter((t) => t.closed).length}개
          </button>
          {showClosed && (
            <div className="mt-1 max-h-24 overflow-auto space-y-0.5">
              {list
                .filter((t) => t.closed)
                .map((t) => (
                  <div key={t.id} className="flex items-center gap-1">
                    <span className="flex-1 truncate">
                      {HW_KINDS[t.kind].emoji} {t.title} · 안 냄 {missingOf(t, sorted).length}명
                    </span>
                    <button type="button" className="hw-mini" onClick={() => updateTask(t.id, (x) => ({ ...x, closed: false }))}>
                      다시 열기
                    </button>
                    <button type="button" className="hw-mini" onClick={() => window.confirm(`'${t.title}' 기록을 지울까요?`) && save(list.filter((x) => x.id !== t.id))}>
                      지우기
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
