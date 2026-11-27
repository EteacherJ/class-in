/**
 * 🌅 아침 화면 · 오늘의 아침활동 카드 (급식과 출석 현황 사이)
 *  - [📅 주간 등록] 팝업에서 월~금 아침활동(주제 · 안내사항)을 한 번에 미리 적고 저장
 *  - 줄마다 🔁 매주 반복을 켜면 다음 주 같은 요일에도 그대로 나와요
 */
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { EMPTY_MA, activityFor, dkey, readMA, saveMA, useMorningActivities, MA_KEY, type MorningActivity } from '../utils/morningActivity';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const label = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}(${DAYS[d.getDay()]})`;

/** 그 날이 속한 주의 월요일 (주말이면 다음 주 월요일) */
const mondayOf = (d: Date) => {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const wd = m.getDay();
  if (wd === 0) m.setDate(m.getDate() + 1);
  else if (wd === 6) m.setDate(m.getDate() + 2);
  else m.setDate(m.getDate() - (wd - 1));
  return m;
};
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

type Row = { date: Date; topic: string; guide: string; weekly: boolean; from: 'day' | 'weekly' | null; srcKey: string; orig: string };
const rowSig = (r: { topic: string; guide: string; weekly: boolean }) => JSON.stringify([r.topic.trim(), r.guide.trim(), r.weekly]);

const loadWeek = (monday: Date): Row[] => {
  const s = readMA();
  return [0, 1, 2, 3, 4].map((i) => {
    const date = addDays(monday, i);
    const f = activityFor(date, s);
    const topic = f.a?.topic || '';
    const guide = f.a?.guide || '';
    const weekly = !!f.a?.weekly;
    return { date, topic, guide, weekly, from: f.from, srcKey: f.date, orig: rowSig({ topic, guide, weekly }) };
  });
};

/** 📅 월~금 아침활동 한 번에 등록 팝업 */
const WeekEditor: React.FC<{ start: Date; onClose: () => void }> = ({ start, onClose }) => {
  const [monday, setMonday] = useState(() => mondayOf(start));
  const [rows, setRows] = useState<Row[]>(() => loadWeek(mondayOf(start)));
  const [saved, setSaved] = useState('');
  const dirty = rows.some((r) => rowSig(r) !== r.orig);
  const todayKey = dkey(new Date());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && tryClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const setRow = (i: number, p: Partial<Row>) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...p } : r)));
  const goWeek = (n: number) => {
    if (dirty && !window.confirm('저장하지 않은 내용이 있어요. 저장하지 않고 다른 주로 갈까요?')) return;
    const m = addDays(monday, n * 7);
    setMonday(m);
    setRows(loadWeek(m));
    setSaved('');
  };
  const tryClose = () => {
    if (dirty && !window.confirm('저장하지 않은 내용이 있어요. 그냥 닫을까요?')) return;
    onClose();
  };
  const copyLastWeek = () => {
    const prev = loadWeek(addDays(monday, -7));
    if (!prev.some((r) => r.topic || r.guide)) {
      setSaved('지난 주에 적힌 아침활동이 없어요');
      return;
    }
    setRows((rs) => rs.map((r, i) => (prev[i].topic || prev[i].guide ? { ...r, topic: prev[i].topic, guide: prev[i].guide } : r)));
    setSaved('지난 주 내용을 불러왔어요 · [저장]을 눌러야 반영돼요');
  };
  const save = () => {
    for (const r of rows) {
      if (rowSig(r) === r.orig) continue; // 바뀌지 않은 날은 그대로
      const k = dkey(r.date);
      // 매주 반복에서 온 날인데 반복을 끄면 → 원래 반복을 멈춰요 (원래 날짜 내용은 남김)
      if (r.from === 'weekly' && !r.weekly) {
        const src = readMA()[r.srcKey];
        if (src) saveMA(r.srcKey, { ...src, weekly: false });
      }
      const a: MorningActivity = { ...EMPTY_MA, topic: r.topic.trim(), guide: r.guide.trim(), weekly: r.weekly || undefined };
      saveMA(k, a.topic || a.guide ? a : null);
    }
    setRows(loadWeek(monday));
    setSaved('✅ 저장했어요 · 아침 화면에 바로 반영돼요');
    window.setTimeout(onClose, 650);
  };

  const fri = addDays(monday, 4);
  return createPortal(
    <div className="mact-pop-back" onPointerDown={(e) => e.target === e.currentTarget && tryClose()} data-mact-popup>
      <div className="mact-pop" role="dialog" aria-label="주간 아침활동 등록">
        <header className="mact-pop-head">
          <b>🌅 주간 아침활동 등록</b>
          <div className="mact-pop-week">
            <button type="button" onClick={() => goWeek(-1)} title="지난 주">
              ◀
            </button>
            <span>
              {label(monday)} ~ {label(fri)}
            </span>
            <button type="button" onClick={() => goWeek(1)} title="다음 주">
              ▶
            </button>
          </div>
        </header>
        <div className="mact-pop-tools">
          <button type="button" onClick={() => goWeek(Math.round((mondayOf(new Date()).getTime() - monday.getTime()) / (7 * 864e5)))}>
            이번 주
          </button>
          <button type="button" onClick={copyLastWeek} data-mact-copy>
            📋 지난 주 내용 불러오기
          </button>
        </div>
        <div className="mact-pop-rows">
          {rows.map((r, i) => {
            const k = dkey(r.date);
            return (
              <div key={k} className={`mact-row ${k === todayKey ? 'is-today' : ''}`} data-mact-row={i}>
                <div className="mact-row-day">
                  <b>{DAYS[r.date.getDay()]}</b>
                  <small>
                    {r.date.getMonth() + 1}/{r.date.getDate()}
                  </small>
                  {k === todayKey && <em>오늘</em>}
                </div>
                <div className="mact-row-fields">
                  <input value={r.topic} onChange={(e) => setRow(i, { topic: e.target.value })} placeholder="주제 (예: 📖 아침 독서)" data-mact-topic={i} />
                  <textarea rows={2} value={r.guide} onChange={(e) => setRow(i, { guide: e.target.value })} placeholder="안내사항 (줄을 바꾸면 항목이 나뉘어요)" data-mact-guide={i} />
                </div>
                <button
                  type="button"
                  className={`mact-row-rep ${r.weekly ? 'is-on' : ''}`}
                  onClick={() => setRow(i, { weekly: !r.weekly })}
                  title={`매주 ${DAYS[r.date.getDay()]}요일마다 같은 활동을 보여 줘요`}
                  aria-pressed={r.weekly}
                >
                  🔁
                  <span>매주</span>
                </button>
              </div>
            );
          })}
        </div>
        <footer className="mact-pop-foot">
          <span className="mact-pop-msg">{saved}</span>
          <button type="button" className="mact-btn is-ghost" onClick={tryClose}>
            닫기
          </button>
          <button type="button" className="mact-btn is-save" onClick={save} data-mact-save>
            저장
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
};

export const MorningActivityCard: React.FC<{ fontScale?: number }> = ({ fontScale = 1 }) => {
  const store = useMorningActivities();
  const today = useMemo(() => new Date(), []);
  const cur = activityFor(today, store);
  const [open, setOpen] = useState(false);
  // 다른 창(대시보드)에서 저장해도 바로 반영
  useEffect(() => {
    const on = (e: StorageEvent) => e.key === MA_KEY && window.dispatchEvent(new Event('classin:morning-activity'));
    window.addEventListener('storage', on);
    return () => window.removeEventListener('storage', on);
  }, []);

  const a = cur.a;
  return (
    <div className="dm-mcard tone-rose dm-mact" data-dm-mact style={{ ['--mact-fs' as any]: fontScale }}>
      <h3 className="dm-mcard-head">
        <span>🌅 오늘의 아침활동</span>
        <button type="button" className="dm-medit-btn" onClick={() => setOpen(true)} data-dm-mact-edit>
          📅 주간 등록
        </button>
      </h3>
      {a && (a.topic || a.guide) ? (
        <div className="dm-mact-view">
          {a.topic && <div className="dm-mact-topic">{a.topic}</div>}
          {a.guide && (
            <ul className="dm-mact-guide">
              {a.guide
                .split('\n')
                .map((l) => l.trim())
                .filter(Boolean)
                .map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
            </ul>
          )}
          {cur.from === 'weekly' && <small className="dm-mact-rep">🔁 매주 {DAYS[today.getDay()]}요일</small>}
        </div>
      ) : (
        <p className="dm-mempty">📅 주간 등록을 눌러 월~금 아침활동을 미리 적어 두세요</p>
      )}
      {open && <WeekEditor start={today} onClose={() => setOpen(false)} />}
    </div>
  );
};
