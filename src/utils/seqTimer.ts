/**
 * 🪜 순차 타이머 (준비 → 활동 → 발표 …)
 *  - 메인 화면 위젯과 보조 화면이 같은 상태(localStorage)를 함께 써서 어느 쪽에서 조작해도 똑같이 진행돼요.
 *  - 진행 위치는 '지금까지 흐른 시간(elapsed)' 하나로 계산해요 → 창을 새로 열어도 정확히 이어져요.
 */
import { useEffect, useState } from 'react';
import { getBellSchedule } from './displayTabs';

export interface SeqStage {
  id: string;
  name: string;
  sec: number;
  note: string;
  emoji: string;
  color: string;
}
export interface SeqAlerts {
  a30: boolean;
  a20: boolean;
  a10: boolean;
  sound: boolean;
}
export interface SeqState {
  title: string;
  targetSec: number;
  stages: SeqStage[];
  running: boolean;
  /** running 일 때 기준 시각 (Date.now) */
  anchor: number;
  /** anchor 시점까지 흐른 시간 (ms) */
  elapsedAt: number;
  done: boolean;
  alerts: SeqAlerts;
}
export interface SeqPreset {
  id: string;
  name: string;
  targetSec: number;
  stages: Omit<SeqStage, 'id'>[];
  builtin?: boolean;
}

export const SEQ_KEY = 'class_seq_timer_v1';
const PRESET_KEY = 'class_seq_presets_v1';
const EVT = 'classin:seq-timer';
export const SEQ_DISPLAY_HB = 'class_seq_display_hb';

export const SEQ_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444', '#84cc16'];
export const SEQ_EMOJIS = ['📝', '🧩', '🎤', '💬', '🧪', '💡', '🧹', '📖', '✏️', '🎨', '🏃', '⭐'];
export const MIN_STAGE_SEC = 10;

const uid = () => Math.random().toString(36).slice(2, 9);

export function guessEmoji(name: string): string {
  const n = name || '';
  if (/준비|도입|열기|동기/.test(n)) return '📝';
  if (/활동|만들|탐구|과제/.test(n)) return '🧩';
  if (/발표|공유|나눔/.test(n)) return '🎤';
  if (/토의|토론|대화|이야기/.test(n)) return '💬';
  if (/실험|관찰/.test(n)) return '🧪';
  if (/정리|마무리|청소/.test(n)) return '🧹';
  if (/읽|독서/.test(n)) return '📖';
  if (/쓰기|글/.test(n)) return '✏️';
  if (/그리|미술|꾸미/.test(n)) return '🎨';
  if (/체육|운동|놀이/.test(n)) return '🏃';
  return '⭐';
}

export const makeStage = (name: string, sec: number, i: number, note = ''): SeqStage => ({
  id: uid(),
  name,
  sec,
  note,
  emoji: guessEmoji(name),
  color: SEQ_COLORS[i % SEQ_COLORS.length],
});

export const BUILTIN_PRESETS: SeqPreset[] = [
  {
    id: 'b-basic',
    name: '기본 수업 40분',
    targetSec: 2400,
    builtin: true,
    stages: [
      { name: '준비 단계', sec: 600, note: '교과서와 필기도구를 준비해요', emoji: '📝', color: SEQ_COLORS[0] },
      { name: '활동 단계', sec: 1200, note: '모둠별로 활동해요', emoji: '🧩', color: SEQ_COLORS[1] },
      { name: '발표 단계', sec: 600, note: '모둠별로 발표하고 박수로 응원해요', emoji: '🎤', color: SEQ_COLORS[2] },
    ],
  },
  {
    id: 'b-discuss',
    name: '모둠 토의 40분',
    targetSec: 2400,
    builtin: true,
    stages: [
      { name: '도입', sec: 300, note: '오늘의 질문을 함께 읽어요', emoji: '💡', color: SEQ_COLORS[5] },
      { name: '모둠 토의', sec: 900, note: '돌아가며 한 명씩 의견을 말해요', emoji: '💬', color: SEQ_COLORS[1] },
      { name: '정리하기', sec: 600, note: '모둠 의견을 한 장으로 정리해요', emoji: '✏️', color: SEQ_COLORS[4] },
      { name: '발표', sec: 600, note: '모둠 대표가 발표해요', emoji: '🎤', color: SEQ_COLORS[2] },
    ],
  },
  {
    id: 'b-lab',
    name: '실험·관찰 40분',
    targetSec: 2400,
    builtin: true,
    stages: [
      { name: '실험 준비', sec: 420, note: '준비물을 확인하고 안전 수칙을 읽어요', emoji: '📝', color: SEQ_COLORS[0] },
      { name: '실험하기', sec: 1080, note: '순서대로 실험하고 결과를 기록해요', emoji: '🧪', color: SEQ_COLORS[1] },
      { name: '정리·청소', sec: 300, note: '실험 도구를 정리해요', emoji: '🧹', color: SEQ_COLORS[6] },
      { name: '결과 나누기', sec: 600, note: '알게 된 점을 발표해요', emoji: '🎤', color: SEQ_COLORS[2] },
    ],
  },
];

const fromPreset = (p: SeqPreset): Pick<SeqState, 'title' | 'targetSec' | 'stages'> => ({
  title: p.name,
  targetSec: p.targetSec,
  stages: p.stages.map((s) => ({ ...s, id: uid() })),
});

export const DEFAULT_SEQ: SeqState = {
  ...fromPreset(BUILTIN_PRESETS[0]),
  running: false,
  anchor: 0,
  elapsedAt: 0,
  done: false,
  alerts: { a30: true, a20: false, a10: true, sound: true },
};

export function getSeq(): SeqState {
  try {
    const v = JSON.parse(localStorage.getItem(SEQ_KEY) || 'null');
    if (v && Array.isArray(v.stages)) return { ...DEFAULT_SEQ, ...v, alerts: { ...DEFAULT_SEQ.alerts, ...(v.alerts || {}) } };
  } catch {
    /* 무시 */
  }
  return { ...DEFAULT_SEQ, stages: DEFAULT_SEQ.stages.map((s) => ({ ...s })) };
}

export function setSeq(next: SeqState) {
  try {
    localStorage.setItem(SEQ_KEY, JSON.stringify(next));
  } catch {
    /* 무시 */
  }
  window.dispatchEvent(new Event(EVT));
}

export function useSeq(): SeqState {
  const [v, setV] = useState<SeqState>(getSeq);
  useEffect(() => {
    const re = () => setV(getSeq());
    const onStorage = (e: StorageEvent) => {
      if (e.key === SEQ_KEY) re();
    };
    window.addEventListener(EVT, re);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(EVT, re);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return v;
}

// ── 계산 ─────────────────────────────────────────────
export const sumSec = (st: SeqState) => st.stages.reduce((a, s) => a + s.sec, 0);
export const elapsedMs = (st: SeqState, now = Date.now()) => st.elapsedAt + (st.running ? Math.max(0, now - st.anchor) : 0);

export interface SeqPos {
  idx: number; // 지금 단계 (끝났으면 stages.length)
  startSec: number; // 지금 단계 시작 (전체 기준, 초)
  inStageMs: number;
  remainMs: number; // 지금 단계 남은 시간
  totalRemainMs: number;
  elapsed: number;
  total: number;
  starts: number[];
}
export function position(st: SeqState, now = Date.now()): SeqPos {
  const e = elapsedMs(st, now);
  const starts: number[] = [];
  let acc = 0;
  for (const s of st.stages) {
    starts.push(acc);
    acc += s.sec;
  }
  const total = acc;
  let idx = st.stages.length;
  for (let i = 0; i < st.stages.length; i++) {
    if (e < (starts[i] + st.stages[i].sec) * 1000) {
      idx = i;
      break;
    }
  }
  if (st.done) idx = st.stages.length;
  const startSec = idx < st.stages.length ? starts[idx] : total;
  const inStageMs = idx < st.stages.length ? e - startSec * 1000 : 0;
  const remainMs = idx < st.stages.length ? st.stages[idx].sec * 1000 - inStageMs : 0;
  return { idx, startSec, inStageMs, remainMs, totalRemainMs: Math.max(0, total * 1000 - e), elapsed: e, total, starts };
}

export const fmt = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
export const fmtLen = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? (m ? `${m}분 ${s}초` : `${s}초`) : `${m}분`;
};

/** 합계 ↔ 목표 시간 확인 */
export function checkTotal(st: SeqState): { tone: 'ok' | 'short' | 'over'; text: string } {
  const sum = sumSec(st);
  const d = sum - st.targetSec;
  if (d === 0) return { tone: 'ok', text: `딱 맞아요 · 합계 ${fmtLen(sum)}` };
  if (d < 0) return { tone: 'short', text: `${fmtLen(-d)} 남아요 · 합계 ${fmtLen(sum)}` };
  return { tone: 'over', text: `${fmtLen(d)} 넘어요 · 합계 ${fmtLen(sum)}` };
}

// ── 조작 ─────────────────────────────────────────────
const upd = (fn: (s: SeqState) => SeqState) => setSeq(fn(getSeq()));

export const seqStart = () =>
  upd((s) => {
    const fresh = s.done || position(s).idx >= s.stages.length;
    return { ...s, running: true, anchor: Date.now(), elapsedAt: fresh ? 0 : s.elapsedAt, done: false };
  });
export const seqPause = () => upd((s) => ({ ...s, running: false, elapsedAt: elapsedMs(s), anchor: Date.now() }));
export const seqReset = () => upd((s) => ({ ...s, running: false, elapsedAt: 0, anchor: Date.now(), done: false }));
export const seqFinish = () => upd((s) => ({ ...s, running: false, done: true, elapsedAt: sumSec(s) * 1000 }));

/** 시간 조절: 앞 단계가 늘면 다음 단계가 그만큼 줄어요 (마지막 단계는 전체 시간이 바뀌어요) */
export function seqAdjust(stageId: string, deltaSec: number) {
  upd((s) => {
    const i = s.stages.findIndex((x) => x.id === stageId);
    if (i < 0) return s;
    const pos = position(s);
    const started = s.running || s.elapsedAt > 0;
    if (started && i < pos.idx) return s; // 이미 지난 단계는 그대로
    const stages = s.stages.map((x) => ({ ...x }));
    const cur = stages[i];
    const next = stages[i + 1];
    let d = deltaSec;
    // 지금 진행 중인 단계를 줄일 때: 이미 흐른 시간보다 짧게는 못 줄여요 (최소 1초 남김)
    const minCur = started && i === pos.idx ? Math.ceil(pos.inStageMs / 1000) + 1 : MIN_STAGE_SEC;
    if (cur.sec + d < minCur) d = minCur - cur.sec;
    if (next && d > 0 && next.sec - d < MIN_STAGE_SEC) d = next.sec - MIN_STAGE_SEC;
    if (d === 0) return s;
    cur.sec += d;
    if (next) next.sec -= d;
    return { ...s, stages };
  });
}

export function seqSkip() {
  upd((s) => {
    const p = position(s);
    if (p.idx >= s.stages.length) return s;
    if (p.idx === s.stages.length - 1) return { ...s, running: false, done: true, elapsedAt: p.total * 1000 };
    const stages = s.stages.map((x) => ({ ...x }));
    const used = Math.max(1, Math.round(p.inStageMs / 1000));
    const rest = stages[p.idx].sec - used;
    stages[p.idx].sec = used;
    stages[p.idx + 1].sec += rest; // 남은 시간은 다음 단계에 더해요
    return { ...s, stages, elapsedAt: (p.startSec + used) * 1000, anchor: Date.now() };
  });
}

export function seqPrev() {
  upd((s) => {
    const p = position(s);
    const idx = Math.min(p.idx, s.stages.length - 1);
    // 지금 단계를 3초 넘게 했으면 지금 단계 처음으로, 아니면 앞 단계 처음으로
    const target = p.inStageMs > 3000 && p.idx < s.stages.length ? idx : Math.max(0, idx - 1);
    return { ...s, elapsedAt: p.starts[target] * 1000, anchor: Date.now(), done: false };
  });
}

export const seqPatch = (patch: Partial<SeqState>) => upd((s) => ({ ...s, ...patch }));
export const seqUpdateStage = (id: string, patch: Partial<SeqStage>) =>
  upd((s) => ({ ...s, stages: s.stages.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
export const seqRemoveStage = (id: string) => upd((s) => ({ ...s, stages: s.stages.filter((x) => x.id !== id) }));
export const seqMoveStage = (id: string, dir: -1 | 1) =>
  upd((s) => {
    const i = s.stages.findIndex((x) => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= s.stages.length) return s;
    const stages = [...s.stages];
    [stages[i], stages[j]] = [stages[j], stages[i]];
    return { ...s, stages };
  });
export const seqAddStage = (name: string, sec: number, note = '') =>
  upd((s) => ({ ...s, stages: [...s.stages, makeStage(name || `${s.stages.length + 1}단계`, Math.max(MIN_STAGE_SEC, sec), s.stages.length, note)] }));

// ── 남은 수업 시간에 맞추기 ─────────────────────────
const toMin = (t: string) => {
  const [h, m] = t.split(':').map((x) => parseInt(x, 10) || 0);
  return h * 60 + m;
};
/** 지금 수업이 끝나는 종까지 남은 초 (수업 중이 아니면 다음 교시 전체 길이) */
export function remainingClassSec(now = new Date()): { sec: number; label: string } | null {
  const bells = getBellSchedule().filter((b) => !b.isLunch);
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  for (const b of bells) {
    const st = toMin(b.start) * 60;
    const en = toMin(b.end) * 60;
    if (nowSec >= st && nowSec < en) return { sec: en - nowSec, label: `${b.period}교시 끝(${b.end})까지` };
  }
  const next = bells.find((b) => toMin(b.start) * 60 > nowSec);
  if (next) return { sec: (toMin(next.end) - toMin(next.start)) * 60, label: `${next.period}교시 전체(${next.start}~${next.end})` };
  return null;
}
export function seqFitTo(totalSec: number) {
  upd((s) => {
    const sum = sumSec(s) || 1;
    const target = Math.max(MIN_STAGE_SEC * s.stages.length, Math.floor(totalSec / 10) * 10);
    const stages = s.stages.map((x) => ({ ...x, sec: Math.max(MIN_STAGE_SEC, Math.round((x.sec / sum) * target / 10) * 10) }));
    const diff = target - stages.reduce((a, x) => a + x.sec, 0);
    if (stages.length) {
      // 반올림 차이는 가장 긴 단계에서 맞춰요
      const k = stages.reduce((bi, x, i) => (x.sec > stages[bi].sec ? i : bi), 0);
      stages[k].sec = Math.max(MIN_STAGE_SEC, stages[k].sec + diff);
    }
    return { ...s, stages, targetSec: target, running: false, elapsedAt: 0, done: false };
  });
}

// ── 수업 흐름 저장 ───────────────────────────────────
export function getPresets(): SeqPreset[] {
  try {
    const v = JSON.parse(localStorage.getItem(PRESET_KEY) || '[]');
    if (Array.isArray(v)) return v;
  } catch {
    /* 무시 */
  }
  return [];
}
const putPresets = (list: SeqPreset[]) => {
  try {
    localStorage.setItem(PRESET_KEY, JSON.stringify(list));
  } catch {
    /* 무시 */
  }
  window.dispatchEvent(new Event(EVT));
};
export function savePreset(name: string) {
  const s = getSeq();
  const nm = name.trim() || s.title || '내 수업 흐름';
  const list = getPresets().filter((p) => p.name !== nm);
  list.unshift({ id: uid(), name: nm, targetSec: s.targetSec, stages: s.stages.map(({ id: _id, ...rest }) => rest) });
  putPresets(list.slice(0, 20));
  seqPatch({ title: nm });
}
export const deletePreset = (id: string) => putPresets(getPresets().filter((p) => p.id !== id));
export const loadPreset = (p: SeqPreset) => upd((s) => ({ ...s, ...fromPreset(p), running: false, elapsedAt: 0, done: false }));

export function usePresets(): SeqPreset[] {
  const [v, setV] = useState<SeqPreset[]>(getPresets);
  useEffect(() => {
    const re = () => setV(getPresets());
    const onStorage = (e: StorageEvent) => {
      if (e.key === PRESET_KEY) re();
    };
    window.addEventListener(EVT, re);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(EVT, re);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return v;
}
