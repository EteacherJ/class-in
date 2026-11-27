import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Student, Team } from '../../types';
import { playAdvance, playDrawPlace, playFinalStart, playFinalWin, playMatchDraw, playMatchUndo, playMatchWin, startDrawMusic, stopDrawMusic } from '../../utils/gameSounds';
import { GameTimer } from './GameTimer';
import { Lumi, MatchPop, SoundToggle, TEAM_COLORS, WinnerCelebration, hexFromTw, shuffle, tintFromHex, usePersist } from './gameFx';

/**
 * 🏆 보조 화면 · 경기 대진표 (토너먼트 / 리그전)
 * - 전체 인원수에 맞춰 팀 수 · 대진(부전승 · 조 나누기)을 자동으로 짜요.
 * - 학생 배치는 뽑기 효과로 한 명씩 차례로 (무작위 · 남학생 먼저 · 여학생 먼저)
 *   → 팀마다 돌아가며 한 명씩 들어가서 남녀가 고르게 섞여요.
 * - 이긴 팀을 누르면 다음 경기로 올라가요. 우승(리그는 조 1위)이 정해지면 루미가 알려 줘요.
 */

type Kind = 'tournament' | 'league';
type Unit = 'student' | 'team' | 'custom';
export interface CustomEntry { name: string; color: string; score?: number; rank?: number }
/** 점수판 → 대진표로 넘겨줄 때 쓰는 열쇠 */
export const BRACKET_HANDOFF_KEY = 'dm_bracket_handoff_v1';
export interface BracketHandoff { entries: CustomEntry[]; seeded: boolean; from: string }
type Order = 'random' | 'boys' | 'girls';
type Speed = 'fast' | 'normal' | 'slow';
interface SeqItem { entry: number; studentId?: number; teamId?: number; customIdx?: number }
interface BracketState {
  kind: Kind;
  unit: Unit;
  size: number;
  order: Order;
  speed: Speed;
  skipAbsent: boolean;
  phase: 'setup' | 'drawing' | 'done';
  entryCount: number;
  seq: SeqItem[];
  placed: number;
  tResults: Record<string, 'a' | 'b'>;
  lResults: Record<string, 'a' | 'b' | 'd'>;
  celebrated: string[];
  custom: CustomEntry[];
  seeded: boolean;
  customFrom: string;
}
const KEY = 'dm_bracket_v1';
const init = (): BracketState => ({
  kind: 'tournament',
  unit: 'student',
  size: 1,
  order: 'random',
  speed: 'normal',
  skipAbsent: true,
  phase: 'setup',
  entryCount: 0,
  seq: [],
  placed: 0,
  tResults: {},
  lResults: {},
  celebrated: [],
  custom: [],
  seeded: false,
  customFrom: '',
});
const SPEED_MS: Record<Speed, number> = { fast: 320, normal: 750, slow: 1300 };

const seedOrder = (size: number) => {
  let s = [1];
  while (s.length < size) {
    const n = s.length * 2;
    s = s.flatMap((x) => [x, n + 1 - x]);
  }
  return s;
};
const roundName = (teams: number) => (teams === 2 ? '결승' : teams === 4 ? '준결승' : `${teams}강`);
/** 리그: 원형 방식으로 겹치지 않게 경기 순서 만들기 */
const roundRobin = (ids: number[]) => {
  const list = ids.length % 2 ? [...ids, -1] : ids.slice();
  const n = list.length;
  const out: [number, number][] = [];
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (a !== -1 && b !== -1) out.push([a, b]);
    }
    list.splice(1, 0, list.pop()!);
  }
  return out;
};
const groupCountFor = (e: number) => (e <= 6 ? 1 : Math.ceil(e / 5));

export const GameBracket: React.FC<{ students: Student[]; teams: Team[]; isLight: boolean }> = ({ students, teams, isLight }) => {
  const [st, setSt] = usePersist<BracketState>(KEY, init);
  const [roll, setRoll] = useState<string>('');
  const [pop, setPop] = useState<{ name: string; color: string; id: number; label?: string } | null>(null);
  // ⬆️ 방금 다음 라운드로 올라간 칸 (쑥 올라오는 애니메이션)
  const [adv, setAdv] = useState<{ key: string; idx: number; t: number } | null>(null);
  const [finalBanner, setFinalBanner] = useState(0);
  const [win, setWin] = useState<{ title: string; name: string; sub?: string; color: string } | null>(null);
  const [setupOpen, setSetupOpen] = useState(st.phase === 'setup');

  const pool = useMemo(() => students.filter((s) => !st.skipAbsent || s.attendance !== 'absent'), [students, st.skipAbsent]);
  const byId = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  // 미리 계산 (설정 화면 안내용)
  const plan = useMemo(() => {
    const n = st.unit === 'team' ? teams.length : st.unit === 'custom' ? st.custom.length : pool.length;
    const e = st.unit === 'team' ? teams.length : st.unit === 'custom' ? st.custom.length : Math.ceil(pool.length / Math.max(1, st.size));
    const S = e >= 2 ? Math.pow(2, Math.ceil(Math.log2(e))) : 2;
    const G = groupCountFor(e);
    const gs = Array.from({ length: G }, (_, g) => Math.floor(e / G) + (g < e % G ? 1 : 0));
    const lm = gs.reduce((a, k) => a + (k * (k - 1)) / 2, 0);
    return { n, e, S, byes: S - e, G, gs, lm };
  }, [st.unit, st.size, pool.length, teams.length, st.custom.length]);

  // ── 뽑기 순서 만들기 ──
  const startDraw = (over?: Partial<BracketState>) => {
    const cfg = { ...st, ...over };
    let seq: SeqItem[] = [];
    let E = 0;
    if (cfg.unit === 'custom') {
      // 점수 순 시드: 1위가 1번 시드(부전승 우선) / 아니면 무작위 뽑기
      const idxs = cfg.custom.map((_, i) => i);
      const order = cfg.seeded ? idxs.sort((a, b) => (cfg.custom[a].rank ?? a) - (cfg.custom[b].rank ?? b)) : shuffle(idxs);
      E = order.length;
      seq = order.map((ci, i) => ({ entry: i, customIdx: ci }));
    } else if (cfg.unit === 'team') {
      const order = shuffle(teams);
      E = order.length;
      seq = order.map((t, i) => ({ entry: i, teamId: t.id }));
    } else {
      const M = shuffle(pool.filter((s) => s.gender === 'M'));
      const F = shuffle(pool.filter((s) => s.gender === 'F'));
      const A = shuffle(pool.filter((s) => s.gender !== 'M' && s.gender !== 'F'));
      const ordered = st.order === 'boys' ? [...M, ...F, ...A] : st.order === 'girls' ? [...F, ...M, ...A] : shuffle(pool);
      E = Math.ceil(ordered.length / Math.max(1, st.size));
      // 팀마다 돌아가며 한 명씩 → 남녀가 고르게 섞여요
      seq = ordered.map((s, i) => ({ entry: i % E, studentId: s.id }));
    }
    if (E < 2) return;
    setSt((p) => ({ ...p, ...over, phase: 'drawing', entryCount: E, seq, placed: 0, tResults: {}, lResults: {}, celebrated: [] }));
    setSetupOpen(false);
  };

  // ── 점수판에서 넘어온 팀으로 바로 토너먼트 ──
  useEffect(() => {
    let h: BracketHandoff | null = null;
    try {
      h = JSON.parse(localStorage.getItem(BRACKET_HANDOFF_KEY) || 'null');
      localStorage.removeItem(BRACKET_HANDOFF_KEY);
    } catch {}
    if (!h || !Array.isArray(h.entries) || h.entries.length < 2) return;
    startDraw({ unit: 'custom', kind: 'tournament', custom: h.entries, seeded: !!h.seeded, customFrom: h.from || '점수판' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 🎰 뽑는 동안 배경음 ──
  useEffect(() => {
    if (st.phase === 'drawing') startDrawMusic();
    else stopDrawMusic();
  }, [st.phase]);
  useEffect(() => () => stopDrawMusic(), []);

  // ── 뽑기 애니메이션 ──
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    if (st.phase !== 'drawing') return;
    if (st.placed >= st.seq.length) {
      setSt((p) => ({ ...p, phase: 'done' }));
      setRoll('');
      return;
    }
    const cur = st.seq[st.placed];
    const names =
      st.unit === 'custom'
        ? st.seq.slice(st.placed).map((x) => st.custom[x.customIdx!]?.name || '')
        : st.unit === 'team'
        ? teams.map((t) => t.name)
        : (() => {
            const g = byId.get(cur.studentId!)?.gender;
            const rest = st.seq.slice(st.placed).map((x) => byId.get(x.studentId!)).filter(Boolean) as Student[];
            const same = st.order !== 'random' ? rest.filter((x) => x.gender === g) : rest;
            return (same.length ? same : rest).map((x) => x.name);
          })();
    const spin = window.setInterval(() => setRoll(names[Math.floor(Math.random() * names.length)] || ''), 65);
    timerRef.current = window.setTimeout(() => {
      clearInterval(spin);
      setRoll(cur.customIdx != null ? st.custom[cur.customIdx]?.name || '' : cur.teamId != null ? teamById.get(cur.teamId)?.name || '' : byId.get(cur.studentId!)?.name || '');
      setSt((p) => ({ ...p, placed: p.placed + 1 }));
      playDrawPlace(st.placed);
    }, SPEED_MS[st.speed]);
    return () => {
      clearInterval(spin);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.phase, st.placed]);

  // ── 참가 팀 (지금까지 뽑힌 만큼) ──
  const entries = useMemo(() => {
    const out = Array.from({ length: st.entryCount }, (_, i) => ({ idx: i, members: [] as Student[], team: null as Team | null, custom: null as CustomEntry | null }));
    st.seq.slice(0, st.placed).forEach((x) => {
      if (x.customIdx != null) out[x.entry].custom = st.custom[x.customIdx] || null;
      else if (x.teamId != null) out[x.entry].team = teamById.get(x.teamId) || null;
      else {
        const s = byId.get(x.studentId!);
        if (s) out[x.entry].members.push(s);
      }
    });
    return out.map((e) => {
      if (st.unit === 'custom') {
        const c = e.custom;
        const sub = c && c.score != null ? `${st.seeded && c.rank ? `${c.rank}위 · ` : ''}${c.score}점` : '';
        return { ...e, color: c?.color || TEAM_COLORS[e.idx % TEAM_COLORS.length], label: c?.name || '?', sub, ready: !!c };
      }
      const color = e.team ? hexFromTw(e.team.dotColor, TEAM_COLORS[e.idx % TEAM_COLORS.length]) : TEAM_COLORS[e.idx % TEAM_COLORS.length];
      const label = e.team ? e.team.name : st.size === 1 ? e.members[0]?.name || '?' : `${e.idx + 1}팀`;
      const sub = !e.team && st.size > 1 ? e.members.map((m) => m.name).join(' · ') : '';
      return { ...e, color, label, sub, ready: e.team ? true : e.members.length > 0 };
    });
  }, [st.seq, st.placed, st.entryCount, st.size, st.unit, st.custom, st.seeded, byId, teamById]);
  const lastPlacedEntry = st.placed > 0 ? st.seq[st.placed - 1]?.entry : -1;

  // ── 토너먼트 ──
  const S = st.entryCount >= 2 ? Math.pow(2, Math.ceil(Math.log2(st.entryCount))) : 2;
  const R = Math.round(Math.log2(S));
  const slots = useMemo(() => seedOrder(S).map((seed) => (seed <= st.entryCount ? seed - 1 : -1)), [S, st.entryCount]);
  const participant = (r: number, m: number, side: 'a' | 'b'): number | null => (r === 0 ? slots[2 * m + (side === 'a' ? 0 : 1)] : winnerOf(r - 1, 2 * m + (side === 'a' ? 0 : 1)));
  function winnerOf(r: number, m: number): number | null {
    const a = participant(r, m, 'a');
    const b = participant(r, m, 'b');
    if (a === -1 && b === -1) return -1;
    if (a === -1) return b;
    if (b === -1) return a;
    if (a == null || b == null) return null;
    const res = st.tResults[`${r}-${m}`];
    return res === 'a' ? a : res === 'b' ? b : null;
  }
  const champion = st.kind === 'tournament' && st.phase === 'done' ? winnerOf(R - 1, 0) : null;

  const pickTournament = (r: number, m: number, side: 'a' | 'b') => {
    if (st.phase !== 'done') return;
    const a = participant(r, m, 'a');
    const b = participant(r, m, 'b');
    if (a == null || b == null || a < 0 || b < 0) return;
    const key = `${r}-${m}`;
    const next = { ...st.tResults };
    const same = next[key] === side;
    // 바꾸면 그 뒤 경기 결과는 지워요
    for (let rr = r; rr < R; rr++) delete next[`${rr}-${m >> (rr - r)}`];
    if (!same) {
      next[key] = side;
      const w = entries[side === 'a' ? a : b];
      if (r < R - 1) {
        // ⬆️ 다음 라운드 진출: 이름이 위로 쑥 + 효과음
        const nextName = roundName(S >> (r + 1));
        setPop({ name: w.label, color: w.color, id: Date.now(), label: `${nextName} 진출!` });
        setAdv({ key: `${r + 1}-${m >> 1}`, idx: side === 'a' ? a : b, t: Date.now() });
        playAdvance(r);
        void playMatchWin;
      } else playFinalWin();
    } else playMatchUndo();
    setSt((p) => ({ ...p, tResults: next, celebrated: p.celebrated.filter((c) => !c.startsWith('t:')) }));
  };
  useEffect(() => {
    if (champion == null || champion < 0) return;
    const key = `t:${champion}`;
    if (st.celebrated.includes(key)) return;
    const e = entries[champion];
    setWin({ title: '토너먼트 우승', name: e.label, sub: e.sub, color: e.color });
    setSt((p) => ({ ...p, celebrated: [...p.celebrated, key] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [champion]);

  // ── 🏆 결승 대진이 정해지면 '결승전!' 배너 + 팡파르 ──
  const fa = st.kind === 'tournament' && st.phase === 'done' && R >= 1 ? participant(R - 1, 0, 'a') : null;
  const fb = st.kind === 'tournament' && st.phase === 'done' && R >= 1 ? participant(R - 1, 0, 'b') : null;
  useEffect(() => {
    if (fa == null || fb == null || fa < 0 || fb < 0 || R < 2) return;
    const key = `f:${fa}-${fb}`;
    if (st.celebrated.includes(key)) return;
    setFinalBanner(Date.now());
    playFinalStart();
    setSt((p) => ({ ...p, celebrated: [...p.celebrated, key] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fa, fb]);

  // ── 리그전 ──
  const groups = useMemo(() => {
    const G = groupCountFor(st.entryCount);
    const gs: number[][] = Array.from({ length: G }, () => []);
    for (let i = 0; i < st.entryCount; i++) gs[i % G].push(i);
    return gs.map((ids, g) => ({ g, name: G === 1 ? '리그' : `${String.fromCharCode(65 + g)}조`, ids, matches: roundRobin(ids) }));
  }, [st.entryCount]);
  const standings = (grp: (typeof groups)[number]) => {
    const t = new Map(grp.ids.map((id) => [id, { id, w: 0, d: 0, l: 0, pts: 0 }]));
    let done = 0;
    grp.matches.forEach(([a, b], i) => {
      const r = st.lResults[`${grp.g}-${i}`];
      if (!r) return;
      done++;
      const A = t.get(a)!;
      const B = t.get(b)!;
      if (r === 'd') {
        A.d++;
        B.d++;
        A.pts++;
        B.pts++;
      } else {
        const W = r === 'a' ? A : B;
        const L = r === 'a' ? B : A;
        W.w++;
        W.pts += 3;
        L.l++;
      }
    });
    const rows = [...t.values()].sort((x, y) => y.pts - x.pts || y.w - x.w || x.l - y.l);
    return { rows, done, total: grp.matches.length };
  };
  const pickLeague = (g: number, i: number, r: 'a' | 'b' | 'd', a: number, b: number) => {
    if (st.phase !== 'done') return;
    const key = `${g}-${i}`;
    const next = { ...st.lResults };
    if (next[key] === r) {
      delete next[key];
      playMatchUndo();
    } else {
      next[key] = r;
      if (r !== 'd') {
        const w = entries[r === 'a' ? a : b];
        setPop({ name: w.label, color: w.color, id: Date.now() });
        playMatchWin(0);
      } else playMatchDraw();
    }
    setSt((p) => ({ ...p, lResults: next, celebrated: p.celebrated.filter((c) => c !== `l:${g}`) }));
  };
  useEffect(() => {
    if (st.kind !== 'league' || st.phase !== 'done') return;
    for (const grp of groups) {
      const s = standings(grp);
      if (s.total > 0 && s.done === s.total && !st.celebrated.includes(`l:${grp.g}`)) {
        const top = entries[s.rows[0].id];
        setWin({ title: groups.length === 1 ? '리그전 우승' : `${grp.name} 1위`, name: top.label, sub: top.sub || `${s.rows[0].w}승 ${s.rows[0].d}무 ${s.rows[0].l}패 · 승점 ${s.rows[0].pts}`, color: top.color });
        setSt((p) => ({ ...p, celebrated: [...p.celebrated, `l:${grp.g}`] }));
        break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.lResults, st.phase, st.kind]);

  const set = (patch: Partial<BracketState>) => setSt((p) => ({ ...p, ...patch }));
  const seg = <T extends string | number>(val: T, opts: [T, string][], onPick: (v: T) => void, dataKey: string) => (
    <div className="gb-seg" role="radiogroup">
      {opts.map(([v, l]) => (
        <button key={String(v)} type="button" role="radio" aria-checked={val === v} className={val === v ? 'is-on' : ''} onClick={() => onPick(v)} data-gb={`${dataKey}-${v}`}>
          {l}
        </button>
      ))}
    </div>
  );

  const EntryChip = ({ idx, win: isWin, lose, onClick, clickable, advHere }: { idx: number | null; win?: boolean; lose?: boolean; onClick?: () => void; clickable?: boolean; advHere?: number | null }) => {
    if (idx === -1) return <div className="gb-chip is-bye">부전승</div>;
    if (idx == null) return <div className="gb-chip is-tbd">-</div>;
    const e = entries[idx];
    return (
      <button
        type="button"
        className={`gb-chip ${advHere === idx ? 'is-advance' : ''} ${isWin ? 'is-win' : ''} ${lose ? 'is-lose' : ''} ${!e.ready ? 'is-empty' : ''} ${lastPlacedEntry === idx && st.phase === 'drawing' ? 'is-new' : ''} ${clickable ? 'is-click' : ''}`}
        style={{ ['--c' as any]: e.color }}
        onClick={onClick}
        disabled={!clickable}
        title={e.sub || e.label}
        data-gb-entry={idx}
      >
        <i className="gb-dot" />
        <span className="gb-name">{e.ready ? e.label : '?'}</span>
        {e.sub && <small>{e.sub}</small>}
        {isWin && <b className="gb-crown">✓</b>}
      </button>
    );
  };

  const curSeq = st.phase === 'drawing' ? st.seq[st.placed] : null;
  const curStudent = curSeq?.studentId != null ? byId.get(curSeq.studentId) : null;
  const drawing = st.phase === 'drawing';

  return (
    <div className={`gb ${isLight ? 'is-light' : 'is-dark'}`} data-game-bracket>
      {/* ── 설정 ── */}
      <div className="gb-top">
        <div className="gb-title">
          🏆 경기 대진표
          {st.phase !== 'setup' && (
            <span className="gb-badge">
              {st.kind === 'tournament' ? `${S}강 토너먼트` : groups.length === 1 ? '리그전' : `조별 리그 ${groups.length}개 조`} · {st.entryCount}팀{st.unit === 'custom' ? ` · ${st.customFrom || '점수판'}${st.seeded ? ' 순위 시드' : ''}` : ''}
            </span>
          )}
        </div>
        <div className="gb-actions">
          <SoundToggle />
          {st.phase !== 'setup' && (
            <button type="button" className="gb-btn" onClick={() => setSetupOpen((v) => !v)} data-gb="toggle-setup">
              ⚙ {setupOpen ? '설정 접기' : '설정'}
            </button>
          )}
          {drawing && (
            <button type="button" className="gb-btn" onClick={() => set({ placed: st.seq.length })} data-gb="skip">
              ⏩ 바로 모두 배치
            </button>
          )}
          {st.phase === 'done' && (
            <button type="button" className="gb-btn" onClick={() => set({ tResults: {}, lResults: {}, celebrated: [] })}>
              ↺ 결과 지우기
            </button>
          )}
        </div>
      </div>

      {(setupOpen || st.phase === 'setup') && (
        <div className="gb-setup">
          <div className="gb-row">
            <span>경기 방식</span>
            {seg<Kind>(st.kind, [['tournament', '🏆 토너먼트'], ['league', '🔄 리그전']], (v) => set({ kind: v }), 'kind')}
          </div>
          <div className="gb-row">
            <span>참가</span>
            {seg<Unit>(
              st.unit,
              [['student', '👤 학생 (팀 나누기)'], ['team', `👥 우리 반 모둠 (${teams.length})`], ...(st.custom.length >= 2 ? ([['custom', `🔢 ${st.customFrom || '점수판'} 팀 (${st.custom.length})`]] as [Unit, string][]) : [])],
              (v) => set({ unit: v }),
              'unit'
            )}
          </div>
          {st.unit === 'custom' && (
            <div className="gb-row">
              <span>대진 정하기</span>
              {seg<string>(st.seeded ? 'seed' : 'rand', [['seed', '🥇 점수 순위대로 (1위 부전승 우선)'], ['rand', '🎲 무작위 뽑기']], (v) => set({ seeded: v === 'seed' }), 'seed')}
            </div>
          )}
          {st.unit === 'student' && (
            <>
              <div className="gb-row">
                <span>한 팀 인원</span>
                {seg<number>(st.size, [[1, '개인전'], [2, '2명'], [3, '3명'], [4, '4명'], [5, '5명'], [6, '6명']], (v) => set({ size: v }), 'size')}
              </div>
              <div className="gb-row">
                <span>뽑기 순서</span>
                {seg<Order>(st.order, [['random', '🎲 무작위'], ['boys', '👦 남학생 먼저'], ['girls', '👧 여학생 먼저']], (v) => set({ order: v }), 'order')}
                <label className="gb-check">
                  <input type="checkbox" checked={st.skipAbsent} onChange={(e) => set({ skipAbsent: e.target.checked })} /> 결석 학생 빼기
                </label>
              </div>
            </>
          )}
          <div className="gb-row">
            <span>뽑기 속도</span>
            {seg<Speed>(st.speed, [['fast', '빠르게'], ['normal', '보통'], ['slow', '천천히']], (v) => set({ speed: v }), 'speed')}
          </div>
          <div className="gb-plan" data-gb-plan>
            {plan.e < 2 ? (
              '⚠️ 참가 팀이 2팀 이상이어야 해요.'
            ) : (
              <>
                {st.unit === 'student' ? `참가 ${plan.n}명 → ${st.size === 1 ? '개인전' : `${st.size}명씩`} ${plan.e}팀` : st.unit === 'custom' ? `${st.customFrom || '점수판'} ${plan.e}팀${st.seeded ? ' (점수 순위 시드)' : ''}` : `모둠 ${plan.e}팀`}
                {' · '}
                {st.kind === 'tournament'
                  ? `${plan.S}강 토너먼트 · ${plan.e - 1}경기${plan.byes ? ` · 부전승 ${plan.byes}팀` : ''}`
                  : `${plan.G === 1 ? '리그전' : `${plan.G}개 조 (${plan.gs.join('·')}팀)`} · ${plan.lm}경기 (이기면 3점 · 비기면 1점)`}
                {st.unit === 'student' && st.size > 1 && pool.length % st.size !== 0 && ` · ${pool.length % st.size === 0 ? '' : '몇 팀은 1명 적어요'}`}
              </>
            )}
          </div>
          <button type="button" className="gb-start" disabled={plan.e < 2} onClick={() => startDraw()} data-gb="start">
            🎲 {st.phase === 'setup' ? '뽑기 시작' : '다시 뽑기'}
          </button>
        </div>
      )}

      {/* ── 뽑기 상자 ── */}
      {drawing && (
        <div className="gb-drawbox" data-gb-drawbox>
          <Lumi tint={tintFromHex(curStudent?.gender === 'F' ? '#ec4899' : curStudent?.gender === 'M' ? '#3b82f6' : '#8b5cf6')} face="excited" size={70} className="gb-draw-lumi" />
          <div className="gb-roll" style={{ color: curStudent?.gender === 'F' ? '#db2777' : curStudent?.gender === 'M' ? '#2563eb' : undefined }}>{roll || '…'}</div>
          <div className="gb-roll-sub">
            {st.unit === 'student' && st.order !== 'random' && curStudent
              ? `${curStudent.gender === 'M' ? '👦 남학생' : curStudent.gender === 'F' ? '👧 여학생' : '🙂 학생'} 뽑는 중 · `
              : ''}
            {st.placed + 1} / {st.seq.length} → {curSeq ? (st.unit === 'student' && st.size > 1 ? `${curSeq.entry + 1}팀` : (st.unit === 'custom' && st.seeded ? `${curSeq.entry + 1}번 시드` : `${curSeq.entry + 1}번 자리`)) : ''}
          </div>
        </div>
      )}

      {/* ── 토너먼트 (좌우 대칭 · 가운데 결승) ── */}
      {st.phase !== 'setup' && st.kind === 'tournament' && (() => {
        const renderMatch = (r: number, m: number) => {
          const a = participant(r, m, 'a');
          const b = participant(r, m, 'b');
          const w = winnerOf(r, m);
          const real = a != null && b != null && a >= 0 && b >= 0;
          if (r === 0 && a === -1 && b === -1) return <div className="gb-match is-void" />;
          const bye = r === 0 && (a === -1 || b === -1);
          return (
            <div className={`gb-match ${real && w == null && st.phase === 'done' ? 'is-live' : ''} ${bye ? 'is-bye' : ''} ${w != null && w >= 0 && real ? 'is-decided' : ''}`} data-gb-match={`${r}-${m}`}>
              {EntryChip({ idx: a, advHere: adv && adv.key === `${r}-${m}` && Date.now() - adv.t < 2500 ? adv.idx : null, win: w != null && w === a && a >= 0 && real, lose: real && w != null && w !== a, clickable: real && st.phase === 'done', onClick: () => pickTournament(r, m, 'a') })}
              {EntryChip({ idx: b, advHere: adv && adv.key === `${r}-${m}` && Date.now() - adv.t < 2500 ? adv.idx : null, win: w != null && w === b && b >= 0 && real, lose: real && w != null && w !== b, clickable: real && st.phase === 'done', onClick: () => pickTournament(r, m, 'b') })}
            </div>
          );
        };
        const sideCol = (r: number, side: 'L' | 'R') => {
          const count = S >> (r + 1);
          const half = count / 2;
          const ms = Array.from({ length: half }, (_, i) => (side === 'L' ? i : half + i));
          const pairs: number[][] = [];
          for (let i = 0; i < ms.length; i += 2) pairs.push(ms.slice(i, i + 2));
          return (
            <div key={`${side}${r}`} className={`gb-col is-${side === 'L' ? 'left' : 'right'}`} data-gb-col={`${side}${r}`}>
              <div className="gb-col-h">{roundName(S >> r)}</div>
              <div className="gb-col-body">
                {pairs.map((pr, i) => (
                  <div key={i} className={`gb-pair ${pr.length === 2 ? 'is-two' : ''}`}>
                    {pr.map((m) => (
                      <div key={m} className="gb-slot">
                        {renderMatch(r, m)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        };
        const fr = R - 1;
        const fa = participant(fr, 0, 'a');
        const fb = participant(fr, 0, 'b');
        const fReal = fa != null && fb != null && fa >= 0 && fb >= 0;
        const fw = winnerOf(fr, 0);
        const champ = champion != null && champion >= 0 ? entries[champion] : null;
        const fe = (i: number | null) => (i != null && i >= 0 ? entries[i] : null);
        const fighterTint = (i: number | null) => tintFromHex(fe(i)?.color || '#94a3b8');
        const fighter = (i: number | null, side: 'a' | 'b') => (
          <div className={`gb-fighter is-${side} ${fw != null && fw >= 0 && fReal ? (fw === i ? 'is-win' : 'is-lose') : ''}`}>
            <Lumi tint={fighterTint(i)} face={fe(i) ? (fw === i ? 'proud' : fw != null && fw >= 0 && fReal ? 'sleepy' : 'serious') : 'normal'} size={R <= 2 ? 92 : 62} />
          </div>
        );
        return (
          <div className={`gb-tree2 ${R <= 2 ? 'is-small' : ''}`} data-gb-tree>
            {Array.from({ length: Math.max(0, R - 1) }).map((_, r) => sideCol(r, 'L'))}
            <div className="gb-col is-center" data-gb-final>
              <div className="gb-col-h">🏆 결승</div>
              <div className="gb-col-body">
                <div className={`gb-final ${fReal ? 'is-ready' : ''} ${champ ? 'is-done' : ''}`} style={{ ['--ca' as any]: fe(fa)?.color || '#94a3b8', ['--cb' as any]: fe(fb)?.color || '#94a3b8' }}>
                  <div className="gb-final-tag">FINAL</div>
                  <div className="gb-final-stage">
                    <div className="gb-final-glow" />
                    {champ ? (
                      <div className="gb-final-champ">
                        <Lumi tint={tintFromHex(champ.color)} face="proud" size={R <= 2 ? 120 : 92} crown className="gb-champ-lumi" />
                        <div className="gb-final-cup">🏆</div>
                      </div>
                    ) : (
                      <>
                        {fighter(fa, 'a')}
                        <div className="gb-final-mid">
                          <div className="gb-final-cup">🏆</div>
                          <b className="gb-vs">VS</b>
                        </div>
                        {fighter(fb, 'b')}
                      </>
                    )}
                  </div>
                  {champ ? (
                    <div className="gb-final-win">
                      <small>우승</small>
                      <b style={{ color: champ.color }}>{champ.label}</b>
                      {champ.sub && <span>{champ.sub}</span>}
                    </div>
                  ) : (
                    <div className="gb-final-hint">{fReal ? '결승전! 이긴 팀을 눌러 주세요' : '양쪽에서 올라올 팀을 기다려요'}</div>
                  )}
                  <div className="gb-final-match">{renderMatch(fr, 0)}</div>
                </div>
                {/* ⏱ 경기 타이머 (결승 그림 아래) */}
                <div className="gb-final-timer">
                  <GameTimer storeKey="class_game_timer_bracket" isLight={isLight} compact />
                </div>
              </div>
            </div>
            {Array.from({ length: Math.max(0, R - 1) }).map((_, i) => sideCol(R - 2 - i, 'R'))}
          </div>
        );
      })()}

      {/* ── 리그전 ── */}
      {st.phase !== 'setup' && st.kind === 'league' && (
        <div className="gb-league" data-gb-league>
          {groups.map((grp) => {
            const s = standings(grp);
            return (
              <div key={grp.g} className="gb-group">
                <div className="gb-group-h">
                  <b>{grp.name}</b>
                  <span>
                    {s.done}/{s.total} 경기
                  </span>
                </div>
                <table className="gb-table">
                  <thead>
                    <tr>
                      <th>순위</th>
                      <th>팀</th>
                      <th>승</th>
                      <th>무</th>
                      <th>패</th>
                      <th>승점</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.rows.map((row, i) => {
                      const e = entries[row.id];
                      return (
                        <tr key={row.id} className={i === 0 && s.done === s.total && s.total > 0 ? 'is-top' : ''}>
                          <td>{i + 1}</td>
                          <td>
                            <span className="gb-tname" style={{ ['--c' as any]: e.color }} title={e.sub}>
                              <i className="gb-dot" />
                              {e.ready ? e.label : '?'}
                              {i === 0 && s.done === s.total && s.total > 0 && ' 👑'}
                            </span>
                          </td>
                          <td>{row.w}</td>
                          <td>{row.d}</td>
                          <td>{row.l}</td>
                          <td>
                            <b>{row.pts}</b>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="gb-games">
                  {grp.matches.map(([a, b], i) => {
                    const r = st.lResults[`${grp.g}-${i}`];
                    const ea = entries[a];
                    const eb = entries[b];
                    const can = st.phase === 'done';
                    return (
                      <div key={i} className={`gb-game ${r ? 'is-done' : ''}`} data-gb-game={`${grp.g}-${i}`}>
                        <button type="button" disabled={!can} className={`gb-side ${r === 'a' ? 'is-win' : r && r !== 'd' ? 'is-lose' : ''}`} style={{ ['--c' as any]: ea.color }} onClick={() => pickLeague(grp.g, i, 'a', a, b)}>
                          {ea.ready ? ea.label : '?'}
                        </button>
                        <button type="button" disabled={!can} className={`gb-draw ${r === 'd' ? 'is-on' : ''}`} onClick={() => pickLeague(grp.g, i, 'd', a, b)} title="비김">
                          {r === 'd' ? '무' : 'vs'}
                        </button>
                        <button type="button" disabled={!can} className={`gb-side ${r === 'b' ? 'is-win' : r && r !== 'd' ? 'is-lose' : ''}`} style={{ ['--c' as any]: eb.color }} onClick={() => pickLeague(grp.g, i, 'b', a, b)}>
                          {eb.ready ? eb.label : '?'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {st.phase === 'done' && <div className="gb-help">💡 이긴 팀 이름을 누르면 {st.kind === 'tournament' ? '다음 경기로 올라가요' : '결과가 기록돼요 (가운데 vs = 비김)'} · 다시 누르면 취소</div>}
      {st.phase === 'setup' && (
        <div className="gb-empty">
          <Lumi tint={tintFromHex('#6366f1')} face="happy" size={110} />
          <p>경기 방식과 팀 인원을 고르고 <b>🎲 뽑기 시작</b>을 눌러 주세요.</p>
        </div>
      )}

      {pop && <MatchPop key={pop.id} name={pop.name} color={pop.color} label={pop.label} onDone={() => setPop(null)} />}
      {finalBanner > 0 && (
        <div key={finalBanner} className="gb-final-banner" onAnimationEnd={() => setFinalBanner(0)} data-gb-final-banner>
          <span>🏆</span> 결승전! <span>🏆</span>
        </div>
      )}
      {win && <WinnerCelebration title={win.title} name={win.name} sub={win.sub} color={win.color} onClose={() => setWin(null)} />}
    </div>
  );
};
export default GameBracket;
