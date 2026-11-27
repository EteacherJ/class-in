/**
 * 📮 보조화면 · 과제 제출 터치판 + 하교 알림창
 */
import React, { useEffect, useMemo, useState } from 'react';
import type { Student } from '../types';
import { HW_KINDS, dueLabel, isActiveToday, missingOf, toggleDone, useHomework, ymd, type HwTask } from '../utils/homeworkStore';
import { getTimerAlert, playTimerSound } from '../utils/timerAlerts';

const byNum = (a: Student, b: Student) => (a.number || 0) - (b.number || 0);

export const HomeworkBoard: React.FC<{ students: Student[]; isLight: boolean }> = ({ students, isLight }) => {
  const [list] = useHomework();
  const sorted = useMemo(() => [...students].sort(byNum), [students]);
  const open = list.filter((t) => !t.closed);
  const [curId, setCurId] = useState<string | null>(null);
  const cur = open.find((t) => t.id === curId) || open[0] || null;
  const [pop, setPop] = useState<{ name: string; k: number } | null>(null);

  if (!cur)
    return (
      <div className={`hwb ${isLight ? 'is-light' : 'is-dark'}`} data-hw-board>
        <div className="hwb-empty">
          <div className="text-6xl">📮</div>
          <b>오늘 검사할 과제가 없어요</b>
          <p>대시보드 [📮 과제 · 알림장 검사] 위젯에서 [＋ 새 과제]를 만들면 여기에 이름판이 나와요.</p>
        </div>
      </div>
    );
  const missing = missingOf(cur, sorted);
  const total = sorted.length - cur.excused.length;
  const doneN = total - missing.length;
  const tap = (s: Student) => {
    const was = cur.done.includes(s.id);
    toggleDone(cur.id, s.id);
    const a = getTimerAlert();
    playTimerSound(was ? 'boing' : missing.length === 1 ? 'fanfare' : 'coin', a.volume * 0.8);
    if (!was) setPop({ name: s.name, k: Date.now() });
  };

  return (
    <div className={`hwb ${isLight ? 'is-light' : 'is-dark'}`} data-hw-board>
      <div className="hwb-head">
        <div className="hwb-title">
          <span>{HW_KINDS[cur.kind].emoji}</span>
          <div>
            <b>{cur.title}</b>
            <small>⏰ {dueLabel(cur)} · 다 냈으면 내 이름을 눌러요</small>
          </div>
        </div>
        <div className="hwb-count">
          <b>{doneN}</b>/{total}
          <i>
            <em style={{ width: `${total ? (doneN / total) * 100 : 0}%` }} />
          </i>
        </div>
      </div>
      {open.length > 1 && (
        <div className="hwb-tabs">
          {open.map((t) => (
            <button key={t.id} type="button" className={t.id === cur.id ? 'is-on' : ''} onClick={() => setCurId(t.id)}>
              {HW_KINDS[t.kind].emoji} {t.title} · {missingOf(t, sorted).length}
            </button>
          ))}
        </div>
      )}
      <div className="hwb-grid">
        {sorted.map((s) => {
          const done = cur.done.includes(s.id);
          const ex = cur.excused.includes(s.id);
          return (
            <button key={s.id} type="button" disabled={ex} className={`hwb-name ${done ? 'is-done' : ''} ${ex ? 'is-ex' : ''}`} onClick={() => tap(s)} data-hwb-student={s.id}>
              <small>{s.number}</small>
              <b>{s.name}</b>
              <span>{done ? '✅ 냈어요' : ex ? '사정 있음' : '아직'}</span>
            </button>
          );
        })}
      </div>
      {missing.length === 0 && <div className="hwb-all">🎉 우리 반 모두 냈어요!</div>}
      {pop && (
        <div key={pop.k} className="hwb-pop" onAnimationEnd={() => setPop(null)}>
          👍 {pop.name} 냈어요!
        </div>
      )}
    </div>
  );
};

/** 🔔 청소·종례: 하교 시간까지 안 낸 친구 알림창 */
const ACK_KEY = 'class_homework_dismissal_ack';
export const HomeworkDismissalAlert: React.FC<{ students: Student[]; active: boolean }> = ({ students, active }) => {
  const [list] = useHomework();
  const sorted = useMemo(() => [...students].sort(byNum), [students]);
  const [ack, setAck] = useState<string>(() => {
    try {
      return localStorage.getItem(ACK_KEY) || '';
    } catch {
      return '';
    }
  });
  const items = list
    .filter((t) => t.alertAtDismissal && isActiveToday(t))
    .map((t) => ({ t, miss: missingOf(t, sorted) }))
    .filter((x) => x.miss.length > 0);
  const sig = `${ymd()}|${items.map((x) => `${x.t.id}:${x.miss.length}`).join(',')}`;
  const show = active && items.length > 0 && ack !== sig;
  useEffect(() => {
    if (show) playTimerSound('cuckoo', getTimerAlert().volume * 0.8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);
  if (!show) return null;
  const close = () => {
    setAck(sig);
    try {
      localStorage.setItem(ACK_KEY, sig);
    } catch {}
  };
  return (
    <div className="hwa-back" data-hw-alert>
      <div className="hwa-card">
        <div className="hwa-h">
          <span>📮</span>
          <b>집에 가기 전에! 아직 안 낸 친구가 있어요</b>
        </div>
        {items.map(({ t, miss }) => (
          <div key={t.id} className="hwa-task">
            <div className="hwa-task-h">
              {HW_KINDS[t.kind].emoji} {t.title} <small>({dueLabel(t)})</small>
            </div>
            <div className="hwa-names">
              {miss.map((s) => (
                <button key={s.id} type="button" onClick={() => toggleDone(t.id, s.id)} title="냈으면 눌러요">
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className="hwa-tip">냈으면 이름을 눌러요. 내일 꼭 챙겨 와요! 🎒</p>
        <button type="button" className="hwa-ok" onClick={close} data-hw-alert-ok>
          확인했어요
        </button>
      </div>
    </div>
  );
};

export type { HwTask };
