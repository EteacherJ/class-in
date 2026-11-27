/**
 * 🎲 발표자 뽑기 — 여러 가지 뽑기 방법
 *  🎰 기본(슬롯)은 보조창 본문에 있고, 여기는 나머지 8가지 방법이에요.
 *  🎡 룰렛 · 🐣 알 깨기 · 🃏 카드 뒤집기 · 🏁 사다리 타기 · 🎯 짝 뽑기 · 🧮 조건 뽑기 · ⏱ 연속 뽑기 · 🎲 주사위
 *
 *  - 무대 크기는 고정(px) → 이름이 바뀌어도 화면 크기가 흔들리지 않아요.
 *  - 공정 모드: 이번 주에 아직 안 뽑힌 친구를 먼저 골라요(isFresh).
 *  - 결과는 onDone 으로 넘겨서 기록 · 효과음 · 꽃가루는 보조창이 맡아요.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MochiBody, type MochiTint } from '../MochiCharacter';
import './pickerModes.css';
import type { PickSfx } from '../../utils/pickSounds';

export type PickMethod = 'basic' | 'roulette' | 'egg' | 'card' | 'ladder' | 'pair' | 'cond' | 'multi' | 'dice' | 'gacha';

export const PICK_METHODS: { id: PickMethod; emoji: string; label: string; tip: string }[] = [
  { id: 'basic', emoji: '🎰', label: '기본', tip: '이름이 빠르게 바뀌다 멈춰요' },
  { id: 'roulette', emoji: '🎡', label: '룰렛', tip: '돌림판을 돌려 화살표가 멈춘 친구' },
  { id: 'egg', emoji: '🐣', label: '알 깨기', tip: '알을 하나 골라 톡! 깨 보아요' },
  { id: 'card', emoji: '🃏', label: '카드 뒤집기', tip: '엎어 둔 카드 중 하나를 뒤집어요' },
  { id: 'ladder', emoji: '🏁', label: '사다리', tip: '사다리를 타고 내려가 🌟에 닿은 친구' },
  { id: 'pair', emoji: '🎯', label: '짝 뽑기', tip: '두 명을 함께 뽑거나 반 전체 짝을 지어요' },
  { id: 'cond', emoji: '🧮', label: '조건 뽑기', tip: '오늘 안 뽑힌 친구 · 모둠마다 1명 …' },
  { id: 'multi', emoji: '⏱', label: '연속 뽑기', tip: '정한 인원만큼 차례대로 뽑아요' },
  { id: 'dice', emoji: '🎲', label: '주사위', tip: '주사위로 번호를 굴려요' },
  { id: 'gacha', emoji: '🎁', label: '가챠 뽑기', tip: '루미가 동전을 넣고 레버를 돌리면 캡슐이 또르르!' },
];

export interface PickItem {
  id: number;
  num: number;
  label: string;
  teamId?: number;
}

export type PickDoneKind = 'present' | 'pairs-all' | 'per-team';

interface Props {
  method: Exclude<PickMethod, 'basic'>;
  items: PickItem[];
  /** 이번 주 아직 안 뽑혔는지 (공정 모드가 꺼져 있으면 늘 true) */
  isFresh: (id: number) => boolean;
  /** 오늘 뽑힌 id */
  todayIds: number[];
  teams: { id: number; name: string }[];
  isTeam: boolean;
  tint: MochiTint;
  busy: boolean;
  setBusy: (b: boolean) => void;
  /** 방법마다 다른 효과음 */
  sfx: (ev: PickSfx, p?: number) => void;
  onDone: (winners: PickItem[], kind: PickDoneKind) => void;
  /** Space 키로 시작할 수 있게 */
  startRef: React.MutableRefObject<(() => void) | null>;
}

const COLORS = ['#f472b6', '#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#fb923c', '#f87171', '#22d3ee', '#c084fc', '#a3e635'];
const shuffle = <T,>(a: T[]): T[] => {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};
const short = (s: string, n = 4) => (s.length > n ? s.slice(0, n) : s);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3.2);

export const PickerModes: React.FC<Props> = (p) => {
  const { method, items, isFresh, isTeam, tint, busy, setBusy, sfx, onDone, startRef } = p;
  const tick = (k: number) => sfx('tick', k);
  const unit = isTeam ? '모둠' : '명';
  const who = isTeam ? '모둠' : '친구';

  // ── 타이머 정리 ──
  const timers = useRef<number[]>([]);
  const rafs = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => {
    const t = window.setTimeout(fn, ms);
    timers.current.push(t);
    return t;
  };
  const every = (fn: () => void, ms: number) => {
    const t = window.setInterval(fn, ms);
    timers.current.push(t);
    return t;
  };
  const clearAll = () => {
    timers.current.forEach((t) => {
      clearTimeout(t);
      clearInterval(t);
    });
    timers.current = [];
    rafs.current.forEach(cancelAnimationFrame);
    rafs.current = [];
  };
  useEffect(() => () => clearAll(), []); // eslint-disable-line react-hooks/exhaustive-deps

  /** 공정하게 n명 고르기: 이번 주 안 뽑힌 친구 먼저 */
  const fairPick = (list: PickItem[], n: number) => {
    const fresh = shuffle(list.filter((x) => isFresh(x.id)));
    const rest = shuffle(list.filter((x) => !isFresh(x.id)));
    return [...fresh, ...rest].slice(0, Math.max(0, n));
  };
  const randomOf = (list: PickItem[]) => list[Math.floor(Math.random() * list.length)];

  // 결과 · 상태
  const [winners, setWinners] = useState<PickItem[]>([]);
  const [reel, setReel] = useState<string>('');
  const [phase, setPhase] = useState<'idle' | 'run' | 'done'>('idle');
  const [doneKind, setDoneKind] = useState<PickDoneKind>('present');

  const finish = (w: PickItem[], kind: PickDoneKind = 'present') => {
    setWinners(w);
    setDoneKind(kind);
    setPhase('done');
    setBusy(false);
    sfx('win');
    onDone(w, kind);
  };
  const begin = () => {
    clearAll();
    setWinners([]);
    setPhase('run');
    setBusy(true);
  };
  const resetAll = () => {
    clearAll();
    setWinners([]);
    setReel('');
    setPhase('idle');
    setBusy(false);
  };
  // 방법이 바뀌면 처음 상태로
  useEffect(() => {
    resetAll();
    if (method === 'card') sfx('shuffle');
  }, [method, isTeam]); // eslint-disable-line react-hooks/exhaustive-deps

  /** 슬롯처럼 이름이 바뀌다 멈추기 */
  const runReel = (pool: PickItem[], win: PickItem, ms: number, onStop: () => void, setText: (s: string) => void = setReel) => {
    const t0 = performance.now();
    const step = () => {
      const k = (performance.now() - t0) / ms;
      if (k >= 1) {
        setText(fmt(win));
        onStop();
        return;
      }
      setText(fmt(randomOf(pool)));
      tick(k);
      // 처음엔 빠르게, 끝으로 갈수록 느리게
      later(step, 55 + 260 * Math.pow(k, 2.4));
    };
    step();
  };
  const fmt = (x: PickItem) => (isTeam ? x.label : `${x.num}번 ${x.label}`);

  // ════════════════════ 🎡 룰렛 ════════════════════
  const wheelRef = useRef<SVGGElement | null>(null);
  const wheelRot = useRef(0);
  const wheelItems = useMemo(() => items.slice(0, 40), [items]);
  const spinWheel = () => {
    const n = wheelItems.length;
    if (n < 2) return;
    begin();
    const win = fairPick(wheelItems, 1)[0];
    const i = wheelItems.findIndex((x) => x.id === win.id);
    const a = 360 / n;
    const c = (i + 0.5) * a + (Math.random() - 0.5) * a * 0.6;
    const from = wheelRot.current;
    const need = (((-c - from) % 360) + 360) % 360;
    const to = from + 360 * 6 + need;
    const T = 4800;
    const t0 = performance.now();
    let lastSlice = Math.floor(from / a);
    const frame = () => {
      const k = Math.min(1, (performance.now() - t0) / T);
      const r = from + (to - from) * easeOut(k);
      wheelRot.current = r;
      if (wheelRef.current) wheelRef.current.setAttribute('transform', `rotate(${r})`);
      const s = Math.floor(r / a);
      if (s !== lastSlice) {
        lastSlice = s;
        tick(k);
      }
      if (k < 1) rafs.current.push(requestAnimationFrame(frame));
      else {
        wheelRot.current = to % 360;
        if (wheelRef.current) wheelRef.current.setAttribute('transform', `rotate(${wheelRot.current})`);
        finish([win]);
      }
    };
    rafs.current.push(requestAnimationFrame(frame));
  };

  // ════════════════════ 🐣 알 깨기 · 🃏 카드 ════════════════════
  const [round, setRound] = useState(0);
  const slotCount = method === 'egg' ? Math.min(8, Math.max(2, items.length)) : Math.min(12, Math.max(2, items.length));
  const [chosenSlot, setChosenSlot] = useState<number | null>(null);
  const [slotStage, setSlotStage] = useState<'idle' | 'shake' | 'open'>('idle');
  const openSlot = (idx: number) => {
    if (busy || phase === 'done' || items.length === 0) return;
    begin();
    const win = fairPick(items, 1)[0];
    setChosenSlot(idx);
    setSlotStage('shake');
    const T = method === 'egg' ? 1500 : 700;
    let k = 0;
    every(() => {
      k += 90;
      if (k <= T) tick(k / T);
    }, 90);
    later(() => {
      setSlotStage('open');
      sfx('open');
      setWinners([win]);
      later(() => finish([win]), method === 'egg' ? 650 : 520);
    }, T);
  };
  const reshuffle = () => {
    resetAll();
    setChosenSlot(null);
    setSlotStage('idle');
    setRound((r) => r + 1);
    if (method === 'card') sfx('shuffle');
  };
  // 시작 버튼(Space)은 무작위 칸을 열어요
  const openRandomSlot = () => openSlot(Math.floor(Math.random() * slotCount));

  // ════════════════════ 🏁 사다리 ════════════════════
  type Ladder = { lanes: PickItem[]; rungs: boolean[][]; star: number; winner: PickItem; paths: { d: string; len: number; end: number }[] };
  const LW = 640;
  const LH = 380;
  const makeLadder = (): Ladder | null => {
    const L = Math.min(6, items.length);
    if (L < 2) return null;
    const chosen = fairPick(items, L);
    const winner = chosen[0];
    const lanes = shuffle(chosen);
    const R = 9;
    const rungs: boolean[][] = [];
    for (let r = 0; r < R; r++) {
      const row: boolean[] = new Array(L - 1).fill(false);
      for (let g = 0; g < L - 1; g++) if (!row[g - 1] && Math.random() < 0.42) row[g] = true;
      rungs.push(row);
    }
    // 모든 칸 사이에 다리가 하나는 있게
    for (let g = 0; g < L - 1; g++) {
      if (!rungs.some((row) => row[g])) {
        const r = Math.floor(Math.random() * R);
        rungs[r][g] = true;
        if (g > 0) rungs[r][g - 1] = false;
        if (g < L - 2) rungs[r][g + 1] = false;
      }
    }
    const x = (l: number) => 50 + (l * (LW - 100)) / (L - 1);
    const y0 = 62;
    const y1 = LH - 62;
    const ry = (r: number) => y0 + ((r + 1) * (y1 - y0)) / (R + 1);
    const paths = lanes.map((_, s) => {
      let pos = s;
      let d = `M${x(pos)} ${y0}`;
      let len = 0;
      let cy = y0;
      for (let r = 0; r < R; r++) {
        const y = ry(r);
        d += ` L${x(pos)} ${y}`;
        len += y - cy;
        cy = y;
        if (rungs[r][pos]) {
          len += x(pos + 1) - x(pos);
          pos += 1;
          d += ` L${x(pos)} ${y}`;
        } else if (pos > 0 && rungs[r][pos - 1]) {
          len += x(pos) - x(pos - 1);
          pos -= 1;
          d += ` L${x(pos)} ${y}`;
        }
      }
      d += ` L${x(pos)} ${y1}`;
      len += y1 - cy;
      return { d, len, end: pos };
    });
    const star = paths[lanes.findIndex((l) => l.id === winner.id)].end;
    return { lanes, rungs, star, winner, paths };
  };
  const [ladder, setLadder] = useState<Ladder | null>(null);
  const itemsKey = items.map((i) => i.id).join(',');
  useEffect(() => {
    if (method === 'ladder') setLadder(makeLadder());
  }, [method, itemsKey, round]); // eslint-disable-line react-hooks/exhaustive-deps
  const runLadder = () => {
    if (!ladder) return;
    begin();
    const T = 3200;
    let k = 0;
    every(() => {
      k += 140;
      if (k <= T) tick(k / T);
    }, 140);
    later(() => finish([ladder.winner]), T + 300);
  };
  const newLadder = () => {
    resetAll();
    setRound((r) => r + 1);
  };

  // ════════════════════ 🎯 짝 뽑기 ════════════════════
  const [pairText, setPairText] = useState<[string, string]>(['?', '?']);
  const [allPairs, setAllPairs] = useState<PickItem[][]>([]);
  const runPair = () => {
    if (items.length < 2) return;
    begin();
    setAllPairs([]);
    const [a, b] = fairPick(items, 2);
    let doneL = false;
    runReel(items, a, 1700, () => (doneL = true), (s) => setPairText((v) => [s, v[1]]));
    runReel(items.filter((x) => x.id !== a.id), b, 2600, () => {
      if (doneL) finish([a, b]);
    }, (s) => setPairText((v) => [v[0], s]));
  };
  const runAllPairs = () => {
    if (items.length < 2) return;
    begin();
    const s = shuffle(items);
    const groups: PickItem[][] = [];
    for (let i = 0; i < s.length; i += 2) groups.push(s.slice(i, i + 2));
    // 홀수면 마지막 한 명은 앞 짝에 붙여 3명 짝
    if (groups.length > 1 && groups[groups.length - 1].length === 1) groups[groups.length - 2].push(groups.pop()![0]);
    setAllPairs([]);
    groups.forEach((g, i) =>
      later(() => {
        setAllPairs((prev) => [...prev, g]);
        sfx('pop', i / groups.length);
        if (i === groups.length - 1) later(() => finish(groups.flat(), 'pairs-all'), 400);
      }, 140 * i)
    );
  };

  // ════════════════════ 🧮 조건 뽑기 ════════════════════
  type CondId = 'today' | 'perTeam' | 'odd' | 'even' | 'front' | 'back';
  const condList: { id: CondId; label: string }[] = isTeam
    ? [
        { id: 'today', label: '☀️ 오늘 안 뽑힌 모둠' },
        { id: 'odd', label: '1️⃣ 홀수 모둠' },
        { id: 'even', label: '2️⃣ 짝수 모둠' },
      ]
    : [
        { id: 'today', label: '☀️ 오늘 발표 안 한 친구' },
        { id: 'perTeam', label: '👥 모둠마다 1명' },
        { id: 'odd', label: '1️⃣ 홀수 번호' },
        { id: 'even', label: '2️⃣ 짝수 번호' },
        { id: 'front', label: '⬆️ 앞 번호 절반' },
        { id: 'back', label: '⬇️ 뒤 번호 절반' },
      ];
  const [cond, setCond] = useState<CondId>('today');
  const sortedNums = useMemo(() => items.map((i) => i.num).sort((a, b) => a - b), [items]);
  const mid = sortedNums[Math.ceil(sortedNums.length / 2) - 1] ?? 0;
  const condPool = useMemo(() => {
    switch (cond) {
      case 'today':
        return items.filter((i) => !p.todayIds.includes(i.id));
      case 'odd':
        return items.filter((i) => i.num % 2 === 1);
      case 'even':
        return items.filter((i) => i.num % 2 === 0);
      case 'front':
        return items.filter((i) => i.num <= mid);
      case 'back':
        return items.filter((i) => i.num > mid);
      default:
        return items;
    }
  }, [cond, items, p.todayIds, mid]);
  const teamGroups = useMemo(() => {
    const g = new Map<number, PickItem[]>();
    items.forEach((i) => {
      if (i.teamId == null) return;
      if (!g.has(i.teamId)) g.set(i.teamId, []);
      g.get(i.teamId)!.push(i);
    });
    return [...g.entries()].sort((a, b) => a[0] - b[0]);
  }, [items]);
  const [teamRows, setTeamRows] = useState<{ teamId: number; text: string; done: boolean }[]>([]);
  const condCount = cond === 'perTeam' ? teamGroups.length : condPool.length;
  const runCond = () => {
    if (cond === 'perTeam') {
      if (!teamGroups.length) return;
      begin();
      const picks = teamGroups.map(([, list]) => fairPick(list, 1)[0]);
      setTeamRows(teamGroups.map(([tid]) => ({ teamId: tid, text: '…', done: false })));
      picks.forEach((w, i) =>
        later(() => {
          runReel(teamGroups[i][1], w, 900, () => {
            setTeamRows((rows) => rows.map((r, k) => (k === i ? { ...r, text: fmt(w), done: true } : r)));
            if (i < picks.length - 1) sfx('pop');
            if (i === picks.length - 1) finish(picks, 'per-team');
          }, (s) => setTeamRows((rows) => rows.map((r, k) => (k === i ? { ...r, text: s } : r))));
        }, 700 * i)
      );
      return;
    }
    if (!condPool.length) return;
    begin();
    const w = fairPick(condPool, 1)[0];
    runReel(condPool, w, 2600, () => finish([w]));
  };

  // ════════════════════ ⏱ 연속 뽑기 ════════════════════
  const [multiN, setMultiN] = useState(3);
  const maxN = Math.max(2, Math.min(10, items.length));
  const nOk = Math.min(multiN, maxN);
  const [multiList, setMultiList] = useState<PickItem[]>([]);
  const runMulti = () => {
    if (items.length < 2) return;
    begin();
    setMultiList([]);
    const picks = fairPick(items, nOk);
    const go = (i: number) => {
      if (i >= picks.length) {
        finish(picks);
        return;
      }
      const left = items.filter((x) => !picks.slice(0, i).some((q) => q.id === x.id));
      runReel(left, picks[i], 1100, () => {
        setMultiList((l) => [...l, picks[i]]);
        if (i < picks.length - 1) sfx('step', i);
        later(() => go(i + 1), 450);
      });
    };
    go(0);
  };

  // ════════════════════ 🎲 주사위 ════════════════════
  const maxNum = items.reduce((m, i) => Math.max(m, i.num), 0);
  const twoDice = maxNum >= 10;
  const [dice, setDice] = useState<[number, number]>([0, 0]);
  const [diceRoll, setDiceRoll] = useState(false);
  const runDice = () => {
    if (!items.length) return;
    begin();
    const w = fairPick(items, 1)[0];
    setDiceRoll(true);
    const T = 2000;
    const t0 = performance.now();
    const step = () => {
      const k = (performance.now() - t0) / T;
      if (k >= 1) {
        setDice([Math.floor(w.num / 10), w.num % 10]);
        setDiceRoll(false);
        sfx('land');
        later(() => finish([w]), 450);
        return;
      }
      setDice([Math.floor((Math.random() * (maxNum + 1)) / 10), Math.floor(Math.random() * 10)]);
      tick(k);
      later(step, 60 + 200 * k * k);
    };
    step();
  };

  // ── 시작 버튼 ──
  const start = () => {
    if (busy) return;
    if (phase === 'done' && (method === 'egg' || method === 'card')) {
      reshuffle();
      return;
    }
    if (phase === 'done' && method === 'ladder') {
      newLadder();
      return;
    }
    switch (method) {
      case 'roulette':
        return spinWheel();
      case 'egg':
      case 'card':
        return openRandomSlot();
      case 'ladder':
        return runLadder();
      case 'pair':
        return runPair();
      case 'cond':
        return runCond();
      case 'multi':
        return runMulti();
      case 'dice':
        return runDice();
    }
  };
  startRef.current = start;

  const startLabel = (() => {
    if (busy) return '뽑는 중…';
    switch (method) {
      case 'roulette':
        return phase === 'done' ? '🎡 한 번 더 돌리기' : '🎡 룰렛 돌리기';
      case 'egg':
        return phase === 'done' ? '🥚 새 알 놓기' : '🐣 아무 알이나 깨기';
      case 'card':
        return phase === 'done' ? '🃏 카드 다시 섞기' : '🃏 아무 카드나 뒤집기';
      case 'ladder':
        return phase === 'done' ? '🏁 새 사다리 만들기' : '🏁 사다리 타기 시작';
      case 'pair':
        return phase === 'done' ? '🎯 다시 두 명 뽑기' : `🎯 ${isTeam ? '두 모둠' : '두 명'} 뽑기`;
      case 'cond':
        return cond === 'perTeam' ? '👥 모둠마다 1명 뽑기' : '🧮 조건에 맞게 뽑기';
      case 'multi':
        return `⏱ ${nOk}${unit} 차례로 뽑기`;
      case 'dice':
        return phase === 'done' ? '🎲 다시 굴리기' : '🎲 주사위 굴리기';
    }
  })();
  const disabled =
    busy ||
    items.length === 0 ||
    (method === 'cond' && condCount === 0) ||
    ((method === 'pair' || method === 'multi' || method === 'roulette' || method === 'ladder') && items.length < 2);

  // ════════════════════ 화면 ════════════════════
  const face = phase === 'run' ? 'excited' : phase === 'done' ? 'happy' : 'normal';
  const methodInfo = PICK_METHODS.find((m) => m.id === method)!;

  const renderVisual = () => {
    switch (method) {
      case 'roulette': {
        const n = wheelItems.length;
        const a = 360 / Math.max(1, n);
        const fs = n <= 10 ? 11 : n <= 16 ? 9 : n <= 24 ? 7.5 : 6;
        const showName = n <= 24;
        return (
          <div className="pk-wheel-wrap" data-pk-wheel>
            <svg viewBox="-110 -110 220 220" className="pk-wheel">
              <defs>
                <radialGradient id="pkHub" cx="40%" cy="35%">
                  <stop offset="0" stopColor="#fff" />
                  <stop offset="1" stopColor="#e9d5ff" />
                </radialGradient>
              </defs>
              <circle r="104" fill="#fff" stroke="#ede9fe" strokeWidth="4" />
              <g ref={wheelRef} transform={`rotate(${wheelRot.current})`}>
                {wheelItems.map((it, i) => {
                  const s = ((i * a - 90) * Math.PI) / 180;
                  const e = (((i + 1) * a - 90) * Math.PI) / 180;
                  const R = 98;
                  const d = n === 1 ? '' : `M0 0 L${R * Math.cos(s)} ${R * Math.sin(s)} A${R} ${R} 0 ${a > 180 ? 1 : 0} 1 ${R * Math.cos(e)} ${R * Math.sin(e)} Z`;
                  const midA = (i + 0.5) * a - 90;
                  const isW = phase === 'done' && winners[0]?.id === it.id;
                  return (
                    <g key={it.id}>
                      <path d={d} fill={COLORS[i % COLORS.length]} opacity={phase === 'done' && !isW ? 0.45 : 1} stroke="#fff" strokeWidth="1.2" />
                      <text
                        transform={`rotate(${midA}) translate(${showName ? 58 : 80} 0)`}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={fs}
                        fontWeight={900}
                        fill="#fff"
                        style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.18)', strokeWidth: 1.4 }}
                      >
                        {showName ? (isTeam ? short(it.label, 5) : `${it.num} ${short(it.label, 3)}`) : it.num}
                      </text>
                    </g>
                  );
                })}
              </g>
              <circle r="20" fill="url(#pkHub)" stroke="#fff" strokeWidth="3" />
              <text textAnchor="middle" dominantBaseline="central" fontSize="16">🎲</text>
            </svg>
            <div className="pk-wheel-pin" aria-hidden />
          </div>
        );
      }
      case 'egg':
      case 'card': {
        const isEgg = method === 'egg';
        return (
          <div key={round} className={`pk-slots ${isEgg ? 'is-egg' : 'is-card'} n-${slotCount}`} data-pk-slots>
            {Array.from({ length: slotCount }).map((_, i) => {
              const mine = chosenSlot === i;
              const st = mine ? slotStage : chosenSlot != null ? 'dim' : 'idle';
              const w = mine && slotStage === 'open' ? winners[0] : null;
              return isEgg ? (
                <button key={i} type="button" className={`pk-egg is-${st}`} style={{ ['--d' as any]: `${(i % 4) * 0.18}s`, ['--c' as any]: COLORS[(i * 3) % COLORS.length] }} onClick={() => openSlot(i)} disabled={busy || chosenSlot != null} data-pk-egg={i}>
                  <svg viewBox="0 0 100 124" className="pk-egg-svg">
                    <g className="pk-egg-bottom">
                      <path d="M8 70 Q8 118 50 120 Q92 118 92 70 L80 62 L68 72 L56 60 L44 72 L32 60 L20 72 Z" fill="#fffaf0" stroke="#f1e4c9" strokeWidth="2" />
                      <circle cx="30" cy="96" r="6" fill="var(--c)" opacity="0.55" />
                      <circle cx="66" cy="104" r="4" fill="var(--c)" opacity="0.55" />
                    </g>
                    <g className="pk-egg-top">
                      <path d="M8 70 Q6 4 50 4 Q94 4 92 70 L80 62 L68 72 L56 60 L44 72 L32 60 L20 72 Z" fill="#fffdf7" stroke="#f1e4c9" strokeWidth="2" />
                      <circle cx="62" cy="30" r="8" fill="var(--c)" opacity="0.55" />
                      <circle cx="34" cy="44" r="5" fill="var(--c)" opacity="0.55" />
                      <path d="M30 18 Q36 12 42 14" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.9" />
                    </g>
                  </svg>
                  {st === 'open' && <span className="pk-chick">🐥</span>}
                  {w && <span className="pk-slot-name">{fmt(w)}</span>}
                </button>
              ) : (
                <button key={i} type="button" className={`pk-card is-${st}`} style={{ ['--d' as any]: `${i * 0.05}s` }} onClick={() => openSlot(i)} disabled={busy || chosenSlot != null} data-pk-card={i}>
                  <span className="pk-card-in">
                    <span className="pk-card-back">
                      <b>?</b>
                    </span>
                    <span className="pk-card-front">
                      {w ? (
                        <>
                          {!isTeam && <small>{w.num}번</small>}
                          <em>{w.label}</em>
                          <i>👑</i>
                        </>
                      ) : (
                        <em>…</em>
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        );
      }
      case 'ladder': {
        if (!ladder) return <div className="pk-empty">{who}가 두 {unit} 이상 있어야 사다리를 만들 수 있어요</div>;
        const L = ladder.lanes.length;
        const R = ladder.rungs.length;
        const x = (l: number) => 50 + (l * (LW - 100)) / (L - 1);
        const y0 = 62;
        const y1 = LH - 62;
        const ry = (r: number) => y0 + ((r + 1) * (y1 - y0)) / (R + 1);
        const run = phase !== 'idle';
        return (
          <div className={`pk-ladder ${run ? 'is-run' : ''} ${phase === 'done' ? 'is-done' : ''}`} data-pk-ladder>
            <svg viewBox={`0 0 ${LW} ${LH}`} width={LW} height={LH}>
              {ladder.lanes.map((_, l) => (
                <line key={l} x1={x(l)} y1={y0} x2={x(l)} y2={y1} className="pk-rail" />
              ))}
              {ladder.rungs.map((row, r) => row.map((on, g) => (on ? <line key={`${r}-${g}`} x1={x(g)} y1={ry(r)} x2={x(g + 1)} y2={ry(r)} className="pk-rung" style={{ transitionDelay: `${(r * 0.05).toFixed(2)}s` }} /> : null)))}
              {!run && (
                <rect x={30} y={y0 + 18} width={LW - 60} height={y1 - y0 - 36} rx={18} className="pk-ladder-cover" />
              )}
              {!run && (
                <text x={LW / 2} y={(y0 + y1) / 2} textAnchor="middle" dominantBaseline="central" className="pk-ladder-cover-t">
                  🤫 사다리는 출발하면 보여요
                </text>
              )}
              {ladder.paths.map((pth, l) => (
                <path
                  key={l}
                  d={pth.d}
                  className="pk-trail"
                  stroke={COLORS[l % COLORS.length]}
                  style={{ strokeDasharray: pth.len, strokeDashoffset: run ? 0 : pth.len, opacity: phase === 'done' && ladder.lanes[l].id !== ladder.winner.id ? 0.25 : 1, transitionDelay: `${0.25 + l * 0.12}s` }}
                />
              ))}
              {ladder.lanes.map((it, l) => (
                <g key={it.id} transform={`translate(${x(l)} ${y0 - 30})`}>
                  <rect x={-48} y={-17} width={96} height={34} rx={17} fill={COLORS[l % COLORS.length]} />
                  <text textAnchor="middle" dominantBaseline="central" className="pk-lane-t">
                    {isTeam ? short(it.label, 5) : `${it.num} ${short(it.label, 3)}`}
                  </text>
                </g>
              ))}
              {ladder.lanes.map((_, l) => {
                const isStar = l === ladder.star;
                const shown = phase === 'done';
                return (
                  <g key={`b${l}`} transform={`translate(${x(l)} ${y1 + 30})`} className={shown && isStar ? 'pk-star-pop' : ''}>
                    <rect x={-44} y={-17} width={88} height={34} rx={12} fill={shown ? (isStar ? '#fbbf24' : '#f1f5f9') : '#ede9fe'} />
                    <text textAnchor="middle" dominantBaseline="central" className="pk-lane-b" fill={shown ? (isStar ? '#78350f' : '#94a3b8') : '#7c3aed'}>
                      {shown ? (isStar ? '🌟 발표!' : '👏 통과') : '?'}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        );
      }
      case 'pair':
        return allPairs.length ? (
          <div className="pk-allpairs" data-pk-allpairs>
            {allPairs.map((g, i) => (
              <div key={i} className="pk-pair-chip" style={{ ['--c' as any]: COLORS[i % COLORS.length] }}>
                <b>{i + 1}</b>
                <span>{g.map((x) => (isTeam ? x.label : `${x.num} ${x.label}`)).join(' · ')}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="pk-pair" data-pk-pair>
            <div className={`pk-pair-slot ${phase === 'done' ? 'is-done' : ''}`}>{pairText[0]}</div>
            <div className={`pk-pair-mid ${phase === 'done' ? 'is-done' : ''}`}>🤝</div>
            <div className={`pk-pair-slot ${phase === 'done' ? 'is-done' : ''}`}>{pairText[1]}</div>
          </div>
        );
      case 'cond':
        return (
          <div className="pk-cond" data-pk-cond>
            <div className="pk-cond-chips">
              {condList.map((c) => (
                <button key={c.id} type="button" className={`pk-cond-chip ${cond === c.id ? 'is-on' : ''}`} disabled={busy} onClick={() => { resetAll(); setTeamRows([]); setCond(c.id); }} data-pk-cond-id={c.id}>
                  {c.label}
                </button>
              ))}
            </div>
            <div className="pk-cond-count">
              {cond === 'perTeam' ? `👥 ${teamGroups.length}개 모둠에서 한 명씩 뽑아요` : condCount ? `조건에 맞는 ${who} ${condCount}${unit}` : `조건에 맞는 ${who}가 없어요`}
            </div>
            {cond === 'perTeam' ? (
              <div className="pk-teamrows">
                {(teamRows.length ? teamRows : teamGroups.map(([tid]) => ({ teamId: tid, text: '?', done: false }))).map((r, i) => (
                  <div key={r.teamId} className={`pk-teamrow ${r.done ? 'is-done' : ''}`} style={{ ['--c' as any]: COLORS[i % COLORS.length] }}>
                    <b>{p.teams.find((t) => t.id === r.teamId)?.name || `${r.teamId}모둠`}</b>
                    <span>{r.text}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`pk-reel ${phase === 'run' ? 'is-run' : ''} ${phase === 'done' ? 'is-done' : ''}`}>{reel || '누가 뽑힐까요?'}</div>
            )}
          </div>
        );
      case 'multi':
        return (
          <div className="pk-multi" data-pk-multi>
            <div className="pk-stepper">
              <span>몇 {unit} 뽑을까요?</span>
              <button type="button" disabled={busy || nOk <= 2} onClick={() => setMultiN(Math.max(2, nOk - 1))}>−</button>
              <b>{nOk}</b>
              <button type="button" disabled={busy || nOk >= maxN} onClick={() => setMultiN(Math.min(maxN, nOk + 1))}>＋</button>
            </div>
            <div className={`pk-reel ${phase === 'run' ? 'is-run' : ''} ${phase === 'done' ? 'is-done' : ''}`}>{phase === 'idle' ? '차례를 정해 볼까요?' : reel}</div>
            <div className="pk-order">
              {Array.from({ length: nOk }).map((_, i) => {
                const x = multiList[i];
                return (
                  <div key={i} className={`pk-order-chip ${x ? 'is-on' : ''}`} style={{ ['--c' as any]: COLORS[i % COLORS.length] }}>
                    <b>{i + 1}</b>
                    <span>{x ? (isTeam ? x.label : `${x.num} ${x.label}`) : '…'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 'dice':
        return (
          <div className="pk-dice-wrap" data-pk-dice>
            <div className="pk-dice-row">
              {twoDice && (
                <div className={`pk-die ${diceRoll ? 'is-roll' : ''} ${phase === 'done' ? 'is-land' : ''}`}>
                  <span>{dice[0]}</span>
                  <small>십의 자리</small>
                </div>
              )}
              <div className={`pk-die is-b ${diceRoll ? 'is-roll' : ''} ${phase === 'done' ? 'is-land' : ''}`}>
                <span>{dice[1]}</span>
                <small>{twoDice ? '일의 자리' : '번호'}</small>
              </div>
            </div>
            <div className="pk-dice-eq">{phase === 'idle' ? '주사위를 굴려 번호를 정해요' : `${twoDice ? dice[0] * 10 + dice[1] : dice[1]}번`}</div>
          </div>
        );
    }
  };

  const panelText = () => {
    if (phase === 'run') return { tag: '두근두근…', big: '' };
    if (phase === 'done') {
      if (doneKind === 'pairs-all') return { tag: '🤝 짝 완성!', big: `${allPairs.length}짝` };
      if (doneKind === 'per-team') return { tag: '👥 모둠 대표', big: `${winners.length}${isTeam ? '모둠' : '명'}` };
      if (winners.length >= 2) return { tag: method === 'pair' ? '🎯 오늘의 짝!' : '⏱ 순서 완성!', big: '' };
      return { tag: '👑 오늘의 주인공!', big: '' };
    }
    return { tag: `${methodInfo.emoji} ${methodInfo.label}`, big: '' };
  };
  const pt = panelText();

  return (
    <div className="pk-root" data-pk-method={method}>
      <div className={`pk-stage is-${phase}`}>
        <div className="pk-bg" aria-hidden>
          <i className="b1" />
          <i className="b2" />
          <i className="b3" />
          {phase === 'done' && (
            <span className="pk-sparkles">
              {Array.from({ length: 10 }).map((_, i) => (
                <i key={i} style={{ left: `${8 + ((i * 37) % 86)}%`, top: `${10 + ((i * 53) % 78)}%`, animationDelay: `${(i % 5) * 0.22}s` }} />
              ))}
            </span>
          )}
        </div>
        <div className="pk-visual">{renderVisual()}</div>
        <div className="pk-panel">
          <div className="pk-lumi">
            <MochiBody face={face as any} tint={tint} glow="low" className="w-full h-full" />
            {phase === 'done' && <span className="pk-crown">👑</span>}
          </div>
          <div className={`pk-tag ${phase === 'done' ? 'is-gold' : ''}`}>{pt.tag}</div>
          {phase === 'done' && winners.length === 1 && doneKind === 'present' ? (
            <div className="pk-win" data-pk-winner>
              {!isTeam && <small>{winners[0].num}번</small>}
              <span>{winners[0].label}</span>
            </div>
          ) : phase === 'done' && method === 'pair' && doneKind === 'present' ? (
            <div className="pk-win is-two" data-pk-winner>
              {winners.map((w) => (
                <span key={w.id}>{fmt(w)}</span>
              ))}
            </div>
          ) : phase === 'done' && method === 'multi' ? (
            <ol className="pk-win-list" data-pk-winner>
              {winners.map((w, i) => (
                <li key={w.id}>
                  <b>{i + 1}</b> {fmt(w)}
                </li>
              ))}
            </ol>
          ) : pt.big ? (
            <div className="pk-win">
              <span>{pt.big}</span>
            </div>
          ) : (
            <p className="pk-hint">{phase === 'run' ? '누가 뽑힐까요?' : methodInfo.tip}</p>
          )}
        </div>
      </div>
      <div className="pk-actions">
        <button type="button" className="dm-big-btn pk-go" onClick={start} disabled={disabled} data-pk-start>
          <span>{startLabel} (Space)</span>
        </button>
        {method === 'pair' && (
          <button type="button" className="pk-sub-btn" onClick={runAllPairs} disabled={busy || items.length < 2} data-pk-allpairs-btn>
            🤝 반 전체 짝 만들기
          </button>
        )}
        {(method === 'egg' || method === 'card') && phase !== 'idle' && (
          <button type="button" className="pk-sub-btn" onClick={reshuffle} disabled={busy}>
            🔄 처음부터
          </button>
        )}
      </div>
    </div>
  );
};

export default PickerModes;
