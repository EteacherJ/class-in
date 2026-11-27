/**
 * 🎰 두근두근 자리 뽑기 (보조화면 → 별도 전체 화면 창)
 *  1) 준비: 학생 명단 · 자리 모양(위젯 기준) · 배치 방법 · 먼저 앉기(저시력 등) · 보기 방식
 *  2) 뽑기: 귀여운 크레인 기계 안의 교실(칠판 · 교탁 · 좌우 게시판)에서 캡슐을 집어 자리로!
 *     - 남학생 · 여학생 캡슐 색이 달라요, 캡슐 그림 10가지
 *     - 가끔(2~3번) 루미가 캡슐을 툭 건드려 떨어뜨리고, 직접 들어서 자리에 갖다 놓아요
 *     - 자리가 정해질 때마다 루미가 반응해요
 *     - 이름 숨김 모드: 자리에 앉은 캡슐을 하나씩 눌러 열어 보기
 *  3) 결과: 학생용 · 교사용 배치표, 인쇄, 엑셀 복사, [위젯에 반영하기] → 위젯 · 보조화면 · 모든 화면에 연동
 */
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Student, Team } from '../../types';
import { MochiBody, useMochiTint, type MochiFace } from '../MochiCharacter';
import { setTeamDeskPositions, writeSeatingSetting } from '../../utils/seatingLayout';
import { setSeatBgmLevel, startSeatBgm, stopSeatBgm } from '../../utils/seatDrawMusic';
import { playPickSfx } from '../../utils/pickSounds';
import { CapsuleSVG, FACE_COUNT } from './Capsule';
import {
  applyToStudents,
  assignRandom,
  buildLayout,
  currentAssignment,
  pushHistory,
  readHistory,
  clearHistory,
  rowName,
  type DrawMode,
  type DrawOptions,
  type Gender,
  type HistoryRec,
  type Layout,
  type Rect,
  type SeatSlot,
  type ShapeEdit,
  teamDeskPositions,
} from './seatLogic';
import './seatDraw.css';
import type { CamMode } from './SeatDraw3D';
const SeatDraw3D = lazy(() => import('./SeatDraw3D'));

const W = 1600;
const H = 900;
const SEAT_AREA: Rect = { x: 262, y: 266, w: 1076, h: 376 };
const LUMI_HOME = { x: 912, y: 226 };
const CLAW_HOME = { x: 1452, y: 700 };
const CAP = 46;


const read = <T,>(k: string, d: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v == null ? d : (JSON.parse(v) as T);
  } catch {
    return d;
  }
};
const readRaw = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const save = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
  } catch {}
};
const shuffle = <T,>(a: T[]): T[] => {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};
const center = (s: SeatSlot) => ({ x: s.x + s.w / 2, y: s.y + s.h / 2 });
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const todayText = () => {
  const d = new Date();
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
};

type Phase = 'opening' | 'setup' | 'play' | 'result';
export type Step = 'roster' | 'shape' | 'method' | 'front' | 'view' | 'history';
type Speed = 1 | 0.6 | 0.35;
interface Cap {
  sid: number;
  x: number;
  y: number;
  z: number;
  dur: number;
  st: 'pile' | 'move' | 'fall' | 'desk';
  by?: 'lumi';
  /** 캡슐 더미에서 위층에 얹혀 있는지 */
  stack?: number;
  open: boolean;
  img: number;
}
interface Claw {
  x: number;
  y: number;
  z: number;
  dur: number;
  open: boolean;
  shake: boolean;
}
type LumiAct = 'idle' | 'walk' | 'hop' | 'bump' | 'jump' | 'spin' | 'cheer' | 'clap' | 'heart';
interface Lumi {
  x: number;
  y: number;
  dur: number;
  face: MochiFace;
  act: LumiAct;
  bubble: string | null;
  flip: boolean;
  /** 0 = 바닥, 1 = 책상 위 */
  h: number;
}

/** 화면 크기에 맞춰 1600×900 무대를 통째로 키우고 줄이기 */
function useStageScale() {
  const [s, setS] = useState(1);
  useEffect(() => {
    const f = () => setS(Math.min(window.innerWidth / W, window.innerHeight / H));
    f();
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  return s;
}

export interface SeatDrawAppProps {
  /** window = 보조창(학생이 보는 뽑기 화면) · setup = 위젯에서 여는 교사용 설정 */
  variant?: 'window' | 'setup';
  initialStep?: Step;
  onClose?: () => void;
}

/** 🎰 보조창에서 뽑기 열기 (보조화면 창이 있으면 그 창에서, 없으면 여기서 새 창) */
export function openSeatDrawWindow() {
  let acked = false;
  let ch: BroadcastChannel | null = null;
  try {
    ch = new BroadcastChannel('class_display_sync_channel');
    ch.onmessage = (e) => {
      if (e.data?.type === 'SEATDRAW_OPENED') acked = true;
    };
    ch.postMessage({ type: 'OPEN_SEATDRAW' });
  } catch {}
  window.setTimeout(() => {
    try {
      ch?.close();
    } catch {}
    if (acked) return;
    try {
      const url = `${window.location.origin}${window.location.pathname}?mode=seatdraw`;
      window.open(url, 'classin_seatdraw', `width=${window.screen?.availWidth || 1600},height=${window.screen?.availHeight || 900},left=0,top=0`);
    } catch {}
  }, 700);
}

/** 지난 기록의 자리 모양 다시 만들기 */
function histLayout(rec: HistoryRec, teams: Team[], cols: number, teamCols: number): Layout {
  const fake = Object.entries(rec.map).map(([id, key]) => ({
    id: +id,
    name: rec.names[+id] || '',
    teamId: key.startsWith('t') ? +key.slice(1).split('-')[0] : undefined,
  })) as unknown as Student[];
  return buildLayout(rec.mode, fake, teams, rec.cols ?? cols, rec.teamCols ?? teamCols, SEAT_AREA, rec.shape ?? {});
}
const histDate = (d: string) => new Date(d).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export const SeatDrawApp: React.FC<SeatDrawAppProps> = ({ variant = 'window', initialStep, onClose }) => {
  const isSetup = variant === 'setup';
  const scale = useStageScale();
  const [tint] = useMochiTint();

  // ── 데이터 (위젯과 같은 저장소) ──
  const [students] = useState<Student[]>(() => read<Student[]>('class_dashboard_students', []).filter((s) => s && s.name));
  const [teams] = useState<Team[]>(() => read<Team[]>('class_dashboard_teams', []));
  const widgetType = readRaw('class_seating_view_type') === 'team' ? 'team' : 'ind';
  const widgetCols = (() => {
    const n = parseInt(readRaw('class_seating_individual_columns') || '3', 10);
    return n >= 2 && n <= 6 ? n : 3;
  })();
  // 🪑 분단 수 (뽑기 화면에서 바꿀 수 있어요 — 반영하면 위젯도 같은 분단 수로)
  const [cols, setCols] = useState<number>(() => {
    const n = parseInt(readRaw('class_seatdraw_cols') || '', 10);
    return n >= 2 && n <= 6 ? n : widgetCols;
  });
  useEffect(() => save('class_seatdraw_cols', String(cols)), [cols]);
  // ✋ 끌어서 바꾼 자리 모양
  const [shape, setShape] = useState<{ indKey: string; ind: ShapeEdit['ind']; team: ShapeEdit['team'] }>(() =>
    read('class_seatdraw_shape_v1', { indKey: '', ind: {}, team: {} }),
  );
  useEffect(() => save('class_seatdraw_shape_v1', shape), [shape]);
  const [owner, setOwner] = useState<string>(() => readRaw('class_seatdraw_owner') ?? '호랑이 선생님');
  useEffect(() => save('class_seatdraw_owner', owner), [owner]);
  const teamCols = readRaw('class_seating_team_columns') === '2' ? 2 : 3;
  const hasTeams = teams.length > 0;

  // ── 준비 설정 ──
  const [phase, setPhase] = useState<Phase>(isSetup ? 'setup' : 'opening');
  const [step, setStep] = useState<Step>(initialStep || 'roster');
  const [mode, setMode] = useState<DrawMode>(() => {
    const m = readRaw('class_seatdraw_mode');
    if (m === 'ind' || (m === 'team' && hasTeams)) return m;
    return hasTeams ? (widgetType as DrawMode) : 'ind';
  });
  useEffect(() => save('class_seatdraw_mode', mode), [mode]);
  const [gOverride, setGOverride] = useState<Record<number, Gender>>(() => read('class_seatdraw_gender', {}));
  useEffect(() => save('class_seatdraw_gender', gOverride), [gOverride]);
  const [method, setMethod] = useState<'random' | 'teacher'>(() => (readRaw('class_seatdraw_method') === 'teacher' ? 'teacher' : 'random'));
  const [opt, setOpt] = useState<DrawOptions>(() => ({
    frontIds: read<number[]>('class_seatdraw_front', []),
    balanceGender: true,
    altGender: false,
    avoidPrevMates: true,
    avoidSameSeat: true,
    apart: read<[number, number][]>('class_seatdraw_apart', []),
  }));
  const [reveal, setReveal] = useState<'show' | 'hide'>(() => (readRaw('class_seatdraw_reveal') === 'hide' ? 'hide' : 'show'));
  const [speed, setSpeed] = useState<Speed>(1);
  const [sound, setSound] = useState(() => readRaw('class_seatdraw_sound') !== 'off');
  const [auto, setAuto] = useState(false);
  const [history, setHistory] = useState<HistoryRec[]>(() => readHistory());
  const [cam, setCam] = useState<CamMode>('all');
  const [apartA, setApartA] = useState<number | ''>('');
  const [apartB, setApartB] = useState<number | ''>('');

  useEffect(() => save('class_seatdraw_front', opt.frontIds), [opt.frontIds]);
  useEffect(() => save('class_seatdraw_apart', opt.apart), [opt.apart]);
  useEffect(() => save('class_seatdraw_method', method), [method]);
  useEffect(() => save('class_seatdraw_reveal', reveal), [reveal]);
  useEffect(() => save('class_seatdraw_sound', sound ? 'on' : 'off'), [sound]);

  const gender = useCallback((s: Student): Gender => gOverride[s.id] || (s.gender === 'M' || s.gender === 'F' ? s.gender : 'A'), [gOverride]);
  const byId = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const imgOf = useMemo(() => {
    const m = new Map<number, number>();
    shuffle(students).forEach((s, i) => m.set(s.id, i % FACE_COUNT));
    return m;
  }, [students]);

  const names3d = useMemo(() => Object.fromEntries(students.map((s) => [s.id, { name: s.name, g: gender(s) }])), [students, gender]);
  const indKey = `${cols}x${students.length}`;
  const layout: Layout = useMemo(
    () => buildLayout(mode, students, teams, cols, teamCols, SEAT_AREA, { ind: shape.indKey === indKey ? shape.ind : undefined, team: shape.team }),
    [mode, students, teams, cols, teamCols, shape, indKey],
  );
  const slotByKey = useMemo(() => new Map(layout.slots.map((s) => [s.key, s])), [layout]);
  const [plan, setPlan] = useState<Record<number, string>>({});
  const layoutSig = layout.slots.map((x) => x.key).join(',');
  useEffect(() => {
    // 교사 지정 배치는 위젯 설정에서 정해 두면 보조창에서도 그대로
    const sv = read<{ sig: string; plan: Record<number, string> } | null>('class_seatdraw_plan_v1', null);
    setPlan(sv && sv.sig === layoutSig ? sv.plan : currentAssignment(layout, students, teams, cols));
  }, [layout, students, teams, cols]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (Object.keys(plan).length) save('class_seatdraw_plan_v1', { sig: layoutSig, plan });
  }, [plan]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 소리 ──
  const sfx = (m: Parameters<typeof playPickSfx>[0], ev: Parameters<typeof playPickSfx>[1], p = 0) => {
    if (sound) playPickSfx(m, ev, p, 0.6);
  };

  // ── 뽑기 상태 ──
  const [map, setMap] = useState<Record<number, string>>({});
  const [order, setOrder] = useState<number[]>([]);
  const [mishaps, setMishaps] = useState<Set<number>>(new Set());
  const [caps, setCaps] = useState<Record<number, Cap>>({});
  const [claw, setClaw] = useState<Claw>({ ...CLAW_HOME, z: 1, dur: 0, open: true, shake: false });
  const [lumi, setLumi] = useState<Lumi>({ ...LUMI_HOME, dur: 0, face: 'happy', act: 'idle', bubble: null, flip: false, h: 0 });
  const [done, setDone] = useState(0);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ n: number; who: string; where: string } | null>(null);
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [opened, setOpened] = useState<Set<number>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  // 🪧 모둠 팻말 (뽑기 시작할 때 모두 올라왔다 내려가요)
  const [signKey, setSignKey] = useState(0);
  // 🕘 지난 기록 보기
  const [histOpen, setHistOpen] = useState(false);
  const [histView, setHistView] = useState<HistoryRec | null>(null);
  const [histPop, setHistPop] = useState<HistoryRec | null>(null);
  const snapRef = useRef<{ map: Record<number, string>; order: number[]; caps: Record<number, Cap>; done: number; opened: Set<number>; phase: Phase } | null>(null);
  const runId = useRef(0);
  // 연속 뽑기 중에도 최신 위치로 계산하려고
  const lumiRef = useRef(lumi);
  lumiRef.current = lumi;
  const clawRef = useRef(claw);
  clawRef.current = claw;
  const spRef = useRef<number>(speed);
  spRef.current = speed;
  const autoRef = useRef(auto);
  autoRef.current = auto;

  const wait = (ms: number) =>
    new Promise<void>((res, rej) => {
      const id = runId.current;
      window.setTimeout(() => (id === runId.current ? res() : rej(new Error('cancel'))), ms * spRef.current);
    });
  const D = (ms: number) => ms * spRef.current;
  const say = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice((n) => (n === msg ? null : n)), 2600);
  };

  // ── 캡슐 더미: 가운데에 옹기종기 뭉쳐 있고, 몇 개는 위층에 얹혀 있어요 ──
  const pilePos = (i: number, n: number) => {
    const rows = n <= 12 ? 2 : 3;
    const per = Math.ceil(n / rows);
    const r = i % rows;
    const j = Math.floor(i / rows);
    const sp = 42;
    const x0 = 800 - ((per - 1) * sp) / 2;
    const jx = ((i * 37) % 9) - 4;
    const jy = ((i * 53) % 7) - 3;
    return { x: x0 + j * sp + (r % 2 ? sp / 2 : 0) + jx, y: 684 + r * 30 + jy, stack: i % 6 === 4 ? 1 : 0 };
  };

  const startDraw = () => {
    if (!students.length) return;
    const st = students.map((s) => ({ id: s.id, gender: gender(s) }));
    const prev = history.find((h) => h.mode === mode) || null;
    const m = method === 'teacher' ? { ...plan } : assignRandom(layout, st, opt, prev);
    // 빠진 학생이 있으면 빈 자리에
    const used = new Set(Object.values(m));
    students.forEach((s) => {
      if (!m[s.id] || !slotByKey.has(m[s.id])) {
        const free = layout.slots.find((x) => !used.has(x.key));
        if (free) {
          m[s.id] = free.key;
          used.add(free.key);
        }
      }
    });
    const front = opt.frontIds.filter((id) => byId.has(id));
    const ord = [...front, ...shuffle(students.map((s) => s.id).filter((id) => !front.includes(id)))];
    const n = ord.length;
    const k = n >= 8 ? (Math.random() < 0.5 ? 2 : 3) : n >= 4 ? 1 : 0;
    const cand = shuffle(ord.map((_, i) => i).filter((i) => i >= Math.max(1, front.length)));
    setMishaps(new Set(cand.slice(0, k)));
    setMap(m);
    setOrder(ord);
    const pile = shuffle(ord);
    const c: Record<number, Cap> = {};
    pile.forEach((sid, i) => {
      const p = pilePos(i, n);
      c[sid] = { sid, ...p, z: 0, dur: 0, st: 'pile', open: false, img: imgOf.get(sid) || 0 };
    });
    setCaps(c);
    setClaw({ ...CLAW_HOME, z: 1, dur: 0, open: true, shake: false });
    setLumi({ ...LUMI_HOME, dur: 0, face: 'happy', act: 'idle', bubble: '두근두근~ 레디~ 고!', flip: false, h: 0 });
    setDone(0);
    setOpened(new Set());
    setApplied(false);
    setToast(null);
    runId.current++;
    setBusy(false);
    setHistView(null);
    setHistOpen(false);
    setSignKey((k) => k + 1);
    setPhase('play');
    setSeatBgmLevel('play');
  };

  const patchCap = (sid: number, p: Partial<Cap>) => setCaps((c) => ({ ...c, [sid]: { ...c[sid], ...p } }));
  const moveClaw = async (x: number, y: number, z: number, ms: number, extra: Partial<Claw> = {}) => {
    setClaw((c) => ({ ...c, x, y, z, dur: D(ms), ...extra }));
    await wait(ms);
  };
  const walkLumi = async (x: number, y: number, carry?: number) => {
    const ms = Math.max(450, Math.min(1800, dist(lumiRef.current, { x, y }) * 2.4));
    setLumi((l) => ({ ...l, x, y, dur: D(ms), act: 'walk', flip: x < l.x }));
    if (carry != null) patchCap(carry, { x, y, z: 1, dur: D(ms), st: 'move', by: 'lumi' });
    let k = 0;
    const iv = window.setInterval(() => {
      if (k++ < ms / 260) sfx('ladder', 'tick');
    }, D(260));
    try {
      await wait(ms);
    } finally {
      clearInterval(iv);
    }
  };

  /** 책상 위로 깡충 (h=1 책상 위, h=0 바닥) */
  const hopLumi = async (x: number, y: number, h: number, carry?: number) => {
    const ms = Math.max(420, Math.min(900, dist(lumiRef.current, { x, y }) * 1.6));
    setLumi((l) => ({ ...l, x, y, h, dur: D(ms), act: 'hop', flip: x < l.x }));
    if (carry != null) patchCap(carry, { x, y, z: 1, dur: D(ms), st: 'move', by: 'lumi' });
    sfx('pair', 'pop', 0.4);
    await wait(ms + 60);
  };
  /** 출발점에서 도착 자리까지 지나가는 책상들 (책상을 징검다리처럼) */
  const deskStones = (from: { x: number; y: number }, to: SeatSlot) => {
    const dst = center(to);
    const dx = dst.x - from.x;
    const dy = dst.y - from.y;
    const L2 = dx * dx + dy * dy || 1;
    const list = layout.slots
      .filter((s) => s.key !== to.key)
      .map((s) => {
        const c = center(s);
        const t = ((c.x - from.x) * dx + (c.y - from.y) * dy) / L2;
        const d = Math.abs((c.x - from.x) * dy - (c.y - from.y) * dx) / Math.sqrt(L2);
        return { s, c, t, d };
      })
      .filter((v) => v.t > 0.08 && v.t < 0.95 && v.d < 90)
      .sort((a, b) => a.t - b.t);
    // 너무 많으면 골고루 4개까지
    const pick: { x: number; y: number }[] = [];
    const step = Math.max(1, Math.ceil(list.length / 4));
    for (let i = 0; i < list.length; i += step) pick.push(list[i].c);
    return pick;
  };

  const REACTIONS: { act: LumiAct; face: MochiFace; say: string[] }[] = [
    { act: 'jump', face: 'excited', say: ['와아~!', '두근두근!', '좋은 자리야!'] },
    { act: 'spin', face: 'happy', say: ['빙글빙글~', '딱 맞았어!', '여기다!'] },
    { act: 'cheer', face: 'proud', say: ['짝짝짝!', '축하해!', '멋진 자리!'] },
    { act: 'clap', face: 'love', say: ['반가워!', '새 자리 환영해!', '잘 부탁해~'] },
    { act: 'heart', face: 'love', say: ['좋아좋아♥', '설렌다~', '두근두근♥'] },
  ];
  const react = async (slot: SeatSlot) => {
    const r = REACTIONS[Math.floor(Math.random() * REACTIONS.length)];
    const text = r.say[Math.floor(Math.random() * r.say.length)];
    setLumi((l) => ({ ...l, act: r.act, face: r.face, bubble: reveal === 'hide' ? text : `${slot.label}! ${text}` }));
    const c = center(slot);
    const id = Date.now() + Math.random();
    setBursts((b) => [...b, { id, x: c.x, y: c.y }]);
    window.setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1100);
    sfx('card', 'win');
    await wait(900);
    setLumi((l) => ({ ...l, act: 'idle', face: 'happy' }));
  };

  /** 한 명 뽑기 */
  const pickOne = async (i: number) => {
    const sid = order[i];
    const slot = slotByKey.get(map[sid])!;
    const s = byId.get(sid)!;
    const c0 = caps[sid];
    const dst = center(slot);
    const cl = clawRef.current;
    // 1) 캡슐 위로 이동
    await moveClaw(c0.x, c0.y, 1, Math.max(500, Math.min(1400, dist(cl, c0) * 1.1)), { open: true, shake: false });
    sfx('roulette', 'tick', 0.3);
    // 2) 내려가서 집기
    await moveClaw(c0.x, c0.y, 0, 380);
    setClaw((c) => ({ ...c, open: false }));
    sfx('dice', 'tick');
    await wait(260);
    // 3) 들어 올리기
    patchCap(sid, { z: 1, dur: D(380), st: 'move' });
    await moveClaw(c0.x, c0.y, 1, 380);
    if (mishaps.has(i)) {
      // 🙈 루미가 툭! → 떨어진 캡슐을 들어서 자리까지
      const wp = { x: LUMI_HOME.x + 96, y: LUMI_HOME.y + 70 };
      const ms = Math.max(600, Math.min(1500, dist(c0, wp) * 1.1));
      patchCap(sid, { x: wp.x, y: wp.y, z: 1, dur: D(ms) });
      await moveClaw(wp.x, wp.y, 1, ms);
      // 루미가 궁금해서 폴짝 다가가다가 머리로 툭!
      setLumi((l) => ({ ...l, x: wp.x - 46, y: wp.y + 8, dur: D(300), act: 'jump', face: 'excited', bubble: '뭐지 뭐지?', flip: false }));
      await wait(420);
      setLumi((l) => ({ ...l, act: 'bump', face: 'surprised', bubble: '앗! 툭…', flip: false }));
      await wait(380);
      const fall = { x: wp.x + 30, y: wp.y + 52 };
      patchCap(sid, { ...fall, z: 0, dur: D(560), st: 'fall' });
      setClaw((c) => ({ ...c, open: true, shake: true }));
      sfx('dice', 'land');
      await wait(650);
      setLumi((l) => ({ ...l, face: 'shy', act: 'idle', bubble: '미안해~ 내가 직접 갖다 줄게!' }));
      setClaw((c) => ({ ...c, shake: false }));
      void moveClaw(CLAW_HOME.x, CLAW_HOME.y, 1, 1100).catch(() => {});
      await wait(500);
      await walkLumi(fall.x - 34, fall.y - 6);
      // 들어 올리기
      setLumi((l) => ({ ...l, act: 'idle', face: 'proud', bubble: '영차!' }));
      patchCap(sid, { x: fall.x - 34, y: fall.y - 6, z: 1, dur: D(320), st: 'move', by: 'lumi' });
      sfx('egg', 'tick', 0.5);
      await wait(380);
      setLumi((l) => ({ ...l, bubble: '책상을 징검다리처럼~ 깡충!' }));
      // 책상 위로 올라가서 → 책상에서 책상으로 깡충깡충 → 도착 자리
      for (const st of deskStones({ x: fall.x - 34, y: fall.y - 6 }, slot)) await hopLumi(st.x, st.y, 1, sid);
      await hopLumi(dst.x, dst.y, 1, sid);
      setLumi((l) => ({ ...l, bubble: null, act: 'idle' }));
      patchCap(sid, { x: dst.x, y: dst.y, z: 0, dur: D(380), st: 'desk', by: undefined });
      sfx('dice', 'land');
      await wait(300);
      // 책상에서 바닥으로 폴짝
      await hopLumi(dst.x + slot.w / 2 + 26, Math.min(dst.y + 20, 640), 0);
      await wait(100);
      setDone((d) => d + 1);
      setToast({ n: i + 1, who: reveal === 'show' ? s.name : '???', where: slot.label });
      await react(slot);
      setLumi((l) => ({ ...l, bubble: null }));
      await walkLumi(LUMI_HOME.x, LUMI_HOME.y);
      setLumi((l) => ({ ...l, act: 'idle', face: 'happy', flip: false, h: 0 }));
    } else {
      // 3.5) 🤔 바로 가지 않고 이미 앉은 친구 자리 위를 여기저기 들렀다 가요 (두근두근!)
      const seated = order.slice(0, i).map((q) => slotByKey.get(map[q])).filter((x): x is SeatSlot => !!x && x.key !== slot.key);
      const pool = shuffle(seated.length >= 2 ? seated : layout.slots.filter((x) => x.key !== slot.key));
      const hops = Math.min(pool.length, 2 + Math.floor(Math.random() * 3));
      let cur = { x: c0.x, y: c0.y };
      const teases = ['여기일까~?', '음… 저기?', '두근두근…', '이 근처인가?', '아니야~ 저쪽!'];
      for (let h = 0; h < hops; h++) {
        const w = center(pool[h]);
        const ms2 = Math.max(450, Math.min(1000, dist(cur, w) * 0.95));
        patchCap(sid, { x: w.x, y: w.y, z: 1, dur: D(ms2) });
        await moveClaw(w.x, w.y, 1, ms2);
        sfx('roulette', 'tick', 0.5);
        if (h === 0 || Math.random() < 0.5) setLumi((l) => ({ ...l, bubble: teases[(h + i) % teases.length], face: 'excited' }));
        // 살짝 내려갈 듯 말 듯
        patchCap(sid, { z: 0.55, dur: D(260) });
        await moveClaw(w.x, w.y, 0.55, 260);
        await wait(180);
        patchCap(sid, { z: 1, dur: D(240) });
        await moveClaw(w.x, w.y, 1, 240);
        cur = w;
      }
      setLumi((l) => ({ ...l, bubble: null, face: 'happy' }));
      // 4) 자리로 옮기기
      const ms = Math.max(600, Math.min(1600, dist(cur, dst) * 1.15));
      patchCap(sid, { x: dst.x, y: dst.y, z: 1, dur: D(ms) });
      let k = 0;
      const iv = window.setInterval(() => k++ < 6 && sfx('roulette', 'tick', k / 6), D(ms / 6));
      await moveClaw(dst.x, dst.y, 1, ms).finally(() => clearInterval(iv));
      // 5) 내려놓기
      patchCap(sid, { z: 0, dur: D(360), st: 'desk' });
      await moveClaw(dst.x, dst.y, 0, 360);
      setClaw((c) => ({ ...c, open: true }));
      sfx('dice', 'land');
      await wait(200);
      setDone((d) => d + 1);
      setToast({ n: i + 1, who: reveal === 'show' ? s.name : '???', where: slot.label });
      void moveClaw(dst.x, dst.y, 1, 320).catch(() => {});
      await react(slot);
    }
  };

  const run = async (from: number) => {
    setBusy(true);
    try {
      let i = from;
      while (i < order.length) {
        await pickOne(i);
        i++;
        if (!autoRef.current) break;
        await wait(250);
      }
      if (i >= order.length) await finishAll();
    } catch {
      /* 건너뛰기 · 닫기로 멈춤 */
    } finally {
      setBusy(false);
    }
  };

  const finishAll = async () => {
    void moveClaw(CLAW_HOME.x, CLAW_HOME.y, 1, 900).catch(() => {});
    setLumi((l) => ({ ...l, act: 'cheer', face: 'excited', bubble: reveal === 'hide' ? '다 앉았어! 이제 하나씩 열어 볼까?' : '모두 자리를 찾았어! 🎉' }));
    sfx('ladder', 'win');
    const group: Record<number, number> = {};
    const names: Record<number, string> = {};
    Object.entries(map).forEach(([id, k]) => {
      group[+id] = slotByKey.get(k)?.group ?? 0;
      names[+id] = byId.get(+id)?.name || '';
    });
    pushHistory({ date: new Date().toISOString(), mode, map, group, names, cols, teamCols, n: students.length, shape: { ind: shape.indKey === indKey ? shape.ind : undefined, team: shape.team } });
    setHistory(readHistory());
    try {
      await wait(1400);
    } catch {}
    setLumi((l) => ({ ...l, act: 'idle', face: 'happy' }));
  };

  /** ⏩ 남은 친구 모두 바로 앉히기 */
  const skipAll = () => {
    runId.current++;
    setBusy(false);
    setCaps((c) => {
      const n = { ...c };
      order.forEach((sid) => {
        const sl = slotByKey.get(map[sid]);
        if (sl) {
          const p = center(sl);
          n[sid] = { ...n[sid], x: p.x, y: p.y, z: 0, dur: 500, st: 'desk' };
        }
      });
      return n;
    });
    setLumi({ ...LUMI_HOME, dur: 400, face: 'happy', act: 'idle', bubble: null, flip: false, h: 0 });
    setClaw({ ...CLAW_HOME, z: 1, dur: 600, open: true, shake: false });
    if (done < order.length) {
      setDone(order.length);
      runId.current++;
      void finishAll().catch(() => {});
    }
  };

  const next = () => {
    if (busy || done >= order.length) return;
    void run(done);
  };

  // 숨김 모드: 캡슐 열기
  const openCap = (sid: number) => {
    if (opened.has(sid) || caps[sid]?.st !== 'desk') return;
    setOpened((o) => new Set(o).add(sid));
    sfx('egg', 'open');
    window.setTimeout(() => sfx('egg', 'win'), 280);
    const sl = slotByKey.get(map[sid]);
    if (sl) {
      const c = center(sl);
      const id = Date.now() + Math.random();
      setBursts((b) => [...b, { id, x: c.x, y: c.y }]);
      window.setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1100);
    }
    setLumi((l) => ({ ...l, act: 'clap', face: 'excited', bubble: `${byId.get(sid)?.name}! 반가워~` }));
    window.setTimeout(() => setLumi((l) => (l.act === 'clap' ? { ...l, act: 'idle', face: 'happy' } : l)), 900);
  };
  const openAll = () => {
    const list = order.filter((sid) => caps[sid]?.st === 'desk' && !opened.has(sid));
    list.forEach((sid, i) => window.setTimeout(() => openCap(sid), i * 160));
  };

  // ⌨️ Space = 다음 뽑기, Esc = 전체 화면 끄기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === 'play' && !histView && e.code === 'Space') {
        e.preventDefault();
        next();
      }
      if (phase === 'opening' && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        startDraw();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // 🎬 오프닝 단계: 0 집게 내려옴 → 1 캡슐 떨어짐 → 2 흔들흔들 → 3 펑! 루미 등장 → 4 안내
  const [openStep, setOpenStep] = useState(0);
  useEffect(() => {
    if (phase !== 'opening') return;
    setOpenStep(0);
    const ts = [
      window.setTimeout(() => {
        setOpenStep(1);
        sfx('roulette', 'tick', 0.2);
      }, 1300),
      window.setTimeout(() => {
        setOpenStep(2);
        sfx('dice', 'land');
      }, 2000),
      window.setTimeout(() => {
        setOpenStep(3);
        sfx('egg', 'open');
        window.setTimeout(() => sfx('egg', 'win'), 250);
      }, 2900),
      window.setTimeout(() => setOpenStep(4), 3800),
    ];
    return () => ts.forEach(clearTimeout);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // 🎵 배경음악: 열자마자 인트로에서 시작 (소리 끄면 멈춤)
  useEffect(() => {
    if (isSetup) return;
    if (!sound) {
      stopSeatBgm();
      return;
    }
    startSeatBgm();
    setSeatBgmLevel(phase === 'opening' ? 'intro' : 'play');
  }, [sound, phase]);
  useEffect(() => {
    // 처음 누르는 순간 소리 허용 (자동 재생이 막힌 경우)
    if (isSetup) return;
    const kick = () => sound && startSeatBgm();
    window.addEventListener('pointerdown', kick, { once: true });
    const stop = () => stopSeatBgm();
    window.addEventListener('beforeunload', stop);
    return () => {
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('beforeunload', stop);
      stopSeatBgm();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => void runId.current++, []);

  // ── 🕘 지난 기록을 뽑기 화면에 펼쳐 보기 ──
  const histL = useMemo(() => (histView ? histLayout(histView, teams, cols, teamCols) : null), [histView, teams, cols, teamCols]);
  const enterHist = (rec: HistoryRec) => {
    runId.current++;
    setBusy(false);
    setAuto(false);
    if (!histView) snapRef.current = { map, order, caps, done, opened, phase };
    const L = histLayout(rec, teams, cols, teamCols);
    const bk = new Map(L.slots.map((x) => [x.key, x]));
    const c: Record<number, Cap> = {};
    const ord: number[] = [];
    Object.entries(rec.map).forEach(([id, k], i) => {
      const sl = bk.get(k);
      if (!sl) return;
      const p = center(sl);
      c[+id] = { sid: +id, x: p.x, y: p.y, z: 0, dur: 0, st: 'desk', open: true, img: imgOf.get(+id) ?? i % FACE_COUNT };
      ord.push(+id);
    });
    setHistView(rec);
    setHistOpen(false);
    setMap(rec.map);
    setOrder(ord);
    setCaps(c);
    setDone(ord.length);
    setOpened(new Set(ord));
    setClaw({ ...CLAW_HOME, z: 1, dur: 0, open: true, shake: false });
    setLumi({ ...LUMI_HOME, dur: 0, face: 'happy', act: 'clap', bubble: `${histDate(rec.date)} 자리였어!`, flip: false, h: 0 });
    setPhase('play');
  };
  const exitHist = () => {
    const sn = snapRef.current;
    snapRef.current = null;
    setHistView(null);
    if (sn && sn.order.length) {
      setMap(sn.map);
      setOrder(sn.order);
      setCaps(sn.caps);
      setDone(sn.done);
      setOpened(sn.opened);
      setPhase(sn.phase === 'result' ? 'play' : sn.phase);
      setLumi({ ...LUMI_HOME, dur: 0, face: 'happy', act: 'idle', bubble: '다시 오늘 뽑기로!', flip: false, h: 0 });
    } else startDraw();
  };
  const histNames = useMemo(() => {
    if (!histView) return null;
    const o: Record<number, { name: string; g: Gender }> = {};
    Object.entries(histView.names).forEach(([id, nm]) => {
      const st = byId.get(+id);
      o[+id] = { name: nm, g: st ? gender(st) : 'A' };
    });
    return o;
  }, [histView, byId, gender]);

  // ── 반영 ──
  const applyResult = () => {
    const next = applyToStudents(layout, students, map);
    try {
      localStorage.setItem('class_dashboard_students', JSON.stringify(next));
    } catch {}
    if (mode === 'team') {
      // 뽑기 화면의 책상 모양 그대로 위젯에 (5명 모둠: 2·2·1)
      Object.entries(teamDeskPositions(layout, map)).forEach(([tid, pos]) => setTeamDeskPositions(+tid, pos));
    } else writeSeatingSetting('class_seating_individual_columns', String(cols));
    writeSeatingSetting('class_seating_view_type', mode === 'team' ? 'team' : 'individual');
    const payload = { type: 'UPDATE_STUDENTS', students: next };
    try {
      const ch = new BroadcastChannel('class_display_sync_channel');
      ch.postMessage(payload);
      ch.close();
    } catch {}
    try {
      window.opener?.postMessage(payload, '*');
    } catch {}
    setApplied(true);
    say('✅ 위젯 · 보조화면 자리에 반영했어요');
    sfx('pair', 'win');
  };

  const copyExcel = async () => {
    const nameAt = (k: string) => {
      const id = Object.keys(map).find((x) => map[+x] === k);
      return id ? byId.get(+id)?.name || '' : '';
    };
    let tsv = '';
    if (mode === 'ind') {
      const maxR = Math.max(...layout.slots.map((s) => s.row)) + 1;
      tsv += ['', ...Array.from({ length: cols }, (_, c) => `${c + 1}분단`)].join('\t') + '\n';
      for (let r = 0; r < maxR; r++) tsv += [rowName(r), ...Array.from({ length: cols }, (_, c) => nameAt(`c${c}-r${r}`))].join('\t') + '\n';
    } else {
      layout.teamBoxes.forEach((b) => {
        tsv += [b.team.name, ...layout.slots.filter((s) => s.teamId === b.team.id).map((s) => nameAt(s.key))].join('\t') + '\n';
      });
    }
    try {
      await navigator.clipboard.writeText(tsv);
      say('📋 복사했어요. 엑셀에 붙여 넣으세요');
    } catch {
      say('복사하지 못했어요');
    }
  };

  /** 🖨 인쇄: 따로 만든 인쇄용 문서(숨은 iframe)로 — 3D 화면 때문에 빈 종이가 나오던 문제 해결 */
  const printChart = (L: Layout = layout, m: Record<number, string> = map, md: DrawMode = mode, when = todayText(), nm?: Record<number, string>) => {
    const flip = view === 'teacher';
    const nameOf = (k: string) => {
      const id = Object.keys(m).find((x) => m[+x] === k);
      return id ? (nm ? nm[+id] : byId.get(+id)?.name) || '' : '';
    };
    const k = 0.86;
    const W2 = SEAT_AREA.w * k;
    const H2 = SEAT_AREA.h * k;
    const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
    const pos = (x: number, y: number, w: number, h: number) => {
      const px = (x - SEAT_AREA.x) * k;
      const py = (y - SEAT_AREA.y) * k;
      return `left:${flip ? W2 - px - w * k : px}px;top:${flip ? H2 - py - h * k : py}px;width:${w * k}px;height:${h * k}px`;
    };
    const boxes = L.teamBoxes.map((b) => `<div class="tb" style="${pos(b.rect.x, b.rect.y, b.rect.w, b.rect.h)}"><em>${esc(b.team.name)}</em></div>`).join('');
    const desks = L.slots
      .map((sl) => `<div class="dk" style="${pos(sl.x, sl.y, sl.w, sl.h)}">${esc(nameOf(sl.key))}</div>`)
      .join('');
    const board = '<div class="bd">칠 판</div>';
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>우리 반 자리 배치표</title><style>
      @page { size: A4 landscape; margin: 12mm; }
      body { font-family: 'Pretendard','Noto Sans KR','Apple SD Gothic Neo',sans-serif; color:#111; margin:0; }
      h1 { font-size: 24px; margin: 0 0 4px; } p { margin: 0 0 12px; font-size: 13px; color:#444; }
      .wrap { display:flex; flex-direction:column; align-items:center; gap:10px; }
      .bd { width:70%; text-align:center; padding:6px; border:1.5px solid #333; border-radius:999px; font-weight:900; letter-spacing:.3em; }
      .area { position:relative; width:${W2}px; height:${H2}px; }
      .tb { position:absolute; border:1.5px dashed #999; border-radius:14px; }
      .tb em { position:absolute; left:50%; top:3px; transform:translateX(-50%); font-style:normal; font-size:12px; font-weight:800; white-space:nowrap; }
      .dk { position:absolute; box-sizing:border-box; border:1.5px solid #333; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:900; white-space:nowrap; overflow:hidden; }
    </style></head><body>
      <h1>우리 반 자리 배치표</h1>
      <p>${when} · ${md === 'team' ? '모둠 자리' : '개인 자리'} · ${flip ? '교사용 (칠판이 아래)' : '학생용 (칠판이 위)'}</p>
      <div class="wrap">${flip ? '' : board}<div class="area">${boxes}${desks}</div>${flip ? board : ''}</div>
    </body></html>`;
    const fr = document.createElement('iframe');
    fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(fr);
    const d = fr.contentWindow!.document;
    d.open();
    d.write(html);
    d.close();
    window.setTimeout(() => {
      try {
        fr.contentWindow!.focus();
        fr.contentWindow!.print();
      } catch {}
      window.setTimeout(() => fr.remove(), 1500);
    }, 300);
  };

  // 🖥 창 다루기 (앱: 지금 모니터에서 전체 화면 · 다음 모니터로 옮기기 / 웹: 브라우저 전체 화면)
  const sdApi = (window as unknown as { electronAPI?: { seatDraw?: { nextDisplay: () => Promise<{ ok: boolean; count?: number; index?: number }>; toggleFullscreen: () => Promise<boolean>; displayCount: () => number } } }).electronAPI?.seatDraw;
  const [winMsg, setWinMsg] = useState('');
  useEffect(() => {
    if (!isSetup) document.title = '두근두근 자리 뽑기';
  }, [isSetup]);
  const [displayCount, setDisplayCount] = useState(() => {
    try {
      return sdApi?.displayCount() || 1;
    } catch {
      return 1;
    }
  });
  useEffect(() => {
    if (!sdApi) return;
    const t = window.setInterval(() => {
      try {
        setDisplayCount(sdApi.displayCount());
      } catch {}
    }, 5000);
    return () => window.clearInterval(t);
  }, [sdApi]);
  const toggleFull = () => {
    if (sdApi) {
      void sdApi.toggleFullscreen();
      return;
    }
    try {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen();
    } catch {}
  };
  const moveToNextDisplay = () => {
    if (!sdApi) return;
    void sdApi.nextDisplay().then((r) => {
      if (r?.ok) {
        setWinMsg(`🖥 ${(r.index ?? 0) + 1}번 모니터로 옮겼어요`);
        window.setTimeout(() => setWinMsg(''), 1800);
      }
    });
  };

  // ════════════════════ 그리기 ════════════════════
  const remaining = order.length - done;
  const nameOfSeat = (k: string, m: Record<number, string>) => {
    const id = Object.keys(m).find((x) => m[+x] === k);
    return id ? byId.get(+id) : undefined;
  };

  // ────────────── 준비 화면 ──────────────
  const STEPS: { id: Step; n: string; label: string; meta?: string }[] = [
    { id: 'roster', n: '1', label: '학생 명단', meta: `${students.length}명` },
    { id: 'shape', n: '2', label: '자리 모양', meta: `${layout.slots.length}자리` },
    { id: 'method', n: '3', label: '배치 방법', meta: method === 'random' ? '랜덤' : '교사 지정' },
    { id: 'front', n: '4', label: '먼저 앉기', meta: opt.frontIds.length ? `${opt.frontIds.length}명` : '' },
    { id: 'view', n: '5', label: '보기 방식', meta: reveal === 'show' ? '이름 공개' : '이름 숨김' },
  ];
  const males = students.filter((s) => gender(s) === 'M').length;
  const females = students.filter((s) => gender(s) === 'F').length;
  const [swapA, setSwapA] = useState<string | null>(null);

  // ✋ 미리보기에서 책상 끌기
  const dragRef = useRef<{ key: string; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const [dragPos, setDragPos] = useState<{ key: string; x: number; y: number } | null>(null);
  const PV_K = 0.56;
  const commitDrag = (slot: SeatSlot, x: number, y: number) => {
    if (slot.mode === 'ind') {
      const snap = (v: number) => Math.round(v / 6) * 6;
      setShape((sh) => ({ ...sh, indKey, ind: { ...(sh.indKey === indKey ? sh.ind : {}), [slot.key]: { x: snap(x), y: snap(y) } } }));
      return;
    }
    const box = layout.teamBoxes.find((b) => b.team.id === slot.teamId);
    if (!box) return;
    const g = box.grid;
    const cx = x + slot.w / 2;
    const cy = y + slot.h / 2;
    const gx = Math.max(0, Math.min(1, Math.round(((cx - g.cx) / (g.dw + 8) + 0.5) * 2) / 2));
    const gy = Math.max(0, Math.min(Math.max(3, g.rows), Math.round((cy - g.top - g.dh / 2) / (g.dh + 8))));
    const mine = layout.slots.filter((q) => q.teamId === slot.teamId).sort((p, q) => p.idx - q.idx);
    const pos = mine.map((q) => ({ x: q.gx ?? 0, y: q.gy ?? 0 }));
    const other = mine.findIndex((q) => q.key !== slot.key && q.gx === gx && q.gy === gy);
    if (other >= 0) pos[other] = { x: slot.gx ?? 0, y: slot.gy ?? 0 };
    pos[slot.idx] = { x: gx, y: gy };
    // 빈 줄이 생기면 위로 당겨요
    const ys = Array.from(new Set(pos.map((p) => p.y))).sort((p, q) => p - q);
    const packed = pos.map((p) => ({ x: p.x, y: ys.indexOf(p.y) }));
    setShape((sh) => ({ ...sh, team: { ...(sh.team || {}), [String(slot.teamId)]: packed } }));
  };

  const PreviewBoard = ({ editable, frontPick, reshape }: { editable?: boolean; frontPick?: boolean; reshape?: boolean }) => {
    // 실제 교실 좌표를 줄여서 미리보기
    const k = PV_K;
    return (
      <div className={`sd-preview ${reshape ? 'is-reshape' : ''}`}>
        <div className="sd-preview-board">칠 판</div>
        <div className="sd-preview-podium">교 탁</div>
        <div className="sd-preview-area" style={{ width: SEAT_AREA.w * k, height: SEAT_AREA.h * k }}>
          {layout.teamBoxes.map((b) => (
            <div key={b.team.id} className="sd-pv-team" style={{ left: (b.rect.x - SEAT_AREA.x) * k, top: (b.rect.y - SEAT_AREA.y) * k, width: b.rect.w * k, height: b.rect.h * k }}>
              <em>{b.team.name}</em>
            </div>
          ))}
          {layout.slots.map((s) => {
            const st = editable ? nameOfSeat(s.key, plan) : undefined;
            const g = st ? gender(st) : 'A';
            const dp = dragPos && dragPos.key === s.key ? dragPos : null;
            return (
              <div
                key={s.key}
                role="button"
                tabIndex={0}
                className={`sd-pv-desk ${frontPick && s.front ? 'is-front' : ''} ${swapA === s.key ? 'is-sel' : ''} ${st ? `g-${g}` : ''} ${dp ? 'is-drag' : ''} ${reshape ? 'can-drag' : ''}`}
                style={{ left: ((dp ? dp.x : s.x) - SEAT_AREA.x) * k, top: ((dp ? dp.y : s.y) - SEAT_AREA.y) * k, width: s.w * k, height: s.h * k }}
                title={s.label}
                data-sd-pv={s.key}
                onPointerDown={(e) => {
                  if (!reshape) return;
                  (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                  dragRef.current = { key: s.key, sx: e.clientX, sy: e.clientY, ox: s.x, oy: s.y, moved: false };
                }}
                onPointerMove={(e) => {
                  const d = dragRef.current;
                  if (!d || d.key !== s.key) return;
                  const dx = (e.clientX - d.sx) / (scale * k);
                  const dy = (e.clientY - d.sy) / (scale * k);
                  if (!d.moved && Math.hypot(dx, dy) < 4) return;
                  d.moved = true;
                  setDragPos({ key: s.key, x: d.ox + dx, y: d.oy + dy });
                }}
                onPointerUp={() => {
                  const d = dragRef.current;
                  dragRef.current = null;
                  if (d && d.moved && dragPos) commitDrag(s, dragPos.x, dragPos.y);
                  setDragPos(null);
                }}
                onClick={() => {
                  if (!editable) return;
                  if (!swapA) return setSwapA(s.key);
                  if (swapA === s.key) return setSwapA(null);
                  const a = nameOfSeat(swapA, plan);
                  const b = nameOfSeat(s.key, plan);
                  setPlan((p) => {
                    const n = { ...p };
                    if (a) n[a.id] = s.key;
                    if (b) n[b.id] = swapA;
                    return n;
                  });
                  setSwapA(null);
                }}
              >
                {editable ? st?.name || '' : frontPick && s.front ? '👓' : reshape ? (s.mode === 'ind' ? `${s.col + 1}-${s.row + 1}` : s.idx + 1) : ''}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const Toggle = ({ on, onClick, children, data }: { on: boolean; onClick: () => void; children: React.ReactNode; data?: string }) => (
    <button type="button" className={`sd-tg ${on ? 'is-on' : ''}`} onClick={onClick} data-sd-opt={data}>
      <span className="sd-tg-dot" />
      {children}
    </button>
  );

  const renderStep = () => {
    switch (step) {
      case 'roster':
        return (
          <>
            <h2>학생 명단</h2>
            <p className="sd-sub">위젯의 학생 명단을 그대로 써요. 이름을 누르면 이번 뽑기에서만 성별(캡슐 색)을 바꿀 수 있어요.</p>
            <div className="sd-counts">
              <span className="m">🔵 남학생 {males}명</span>
              <span className="f">🩷 여학생 {females}명</span>
              <span className="a">🟡 미지정 {students.length - males - females}명</span>
            </div>
            <div className="sd-roster">
              {students.map((s) => {
                const g = gender(s);
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`sd-chip g-${g}`}
                    onClick={() => setGOverride((o) => ({ ...o, [s.id]: g === 'M' ? 'F' : g === 'F' ? 'A' : 'M' }))}
                    data-sd-student={s.id}
                  >
                    <CapsuleSVG gender={g} img={imgOf.get(s.id) || 0} size={26} />
                    <small>{s.number}</small>
                    {s.name}
                  </button>
                );
              })}
              {!students.length && <p className="sd-empty">학생 명단이 비어 있어요. 대시보드에서 학생을 먼저 등록해 주세요.</p>}
            </div>
          </>
        );
      case 'shape':
        return (
          <div className="sd-two">
            <div>
              <h2>자리 모양</h2>
              <p className="sd-sub">위젯의 자리 · 모둠 배치를 기준으로 뽑아요. 오른쪽 미리보기의 책상을 <b>끌어서</b> 교실 모양에 맞게 옮길 수 있어요.</p>
              <div className="sd-seg">
                <button type="button" className={mode === 'ind' ? 'is-on' : ''} onClick={() => setMode('ind')} data-sd-mode="ind">
                  🪑 개인 자리 ({cols}분단)
                </button>
                <button type="button" className={mode === 'team' ? 'is-on' : ''} onClick={() => hasTeams && setMode('team')} disabled={!hasTeams} data-sd-mode="team">
                  👥 모둠 자리 ({teams.length}모둠)
                </button>
              </div>
              <div className="sd-info">
                {mode === 'ind' ? (
                  <>
                    분단 {cols}개 · 분단별{' '}
                    {Array.from(new Set(layout.slots.map((s) => s.col)))
                      .map((c) => `${layout.slots.filter((s) => s.col === c).length}명`)
                      .join(' / ')}
                  </>
                ) : (
                  layout.teamBoxes.map((b) => `${b.team.name} ${b.count}명`).join(' · ')
                )}
                <br />
                자리 {layout.slots.length}개 · 학생 {students.length}명 {layout.slots.length === students.length ? '— 딱 맞아요' : ''}
              </div>
              {mode === 'ind' && (
                <div className="sd-colset" data-sd-cols>
                  <span>분단 수</span>
                  <button type="button" disabled={cols <= 2} onClick={() => setCols((c) => Math.max(2, c - 1))}>
                    −
                  </button>
                  <input
                    type="number"
                    min={2}
                    max={6}
                    value={cols}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      if (n >= 2 && n <= 6) setCols(n);
                    }}
                    data-sd-cols-input
                  />
                  <button type="button" disabled={cols >= 6} onClick={() => setCols((c) => Math.min(6, c + 1))}>
                    ＋
                  </button>
                  <em>숫자를 바꾸면 자리가 자동으로 다시 놓여요 (위젯 {widgetCols}분단)</em>
                </div>
              )}
              <p className="sd-note">
                {mode === 'ind'
                  ? '✋ 자동으로 놓인 뒤, 책상을 끌어 원하는 위치로 옮겨요. 자리 순서(분단 · 줄)는 그대로예요.'
                  : '✋ 모둠 안에서 책상을 끌어 놓으면 그 칸으로 옮겨지고, 다른 책상이 있으면 서로 바뀌어요. (5명 모둠 기본: 2 · 2 · 1)'}
              </p>
              <button
                type="button"
                className="sd-ghost"
                onClick={() => setShape((sh) => (mode === 'ind' ? { ...sh, ind: {} } : { ...sh, team: {} }))}
                data-sd-shape-reset
              >
                ↺ 기본 모양으로 되돌리기
              </button>
              <p className="sd-note">자리 이름은 학생 기준이에요. 칠판을 볼 때 왼쪽이 1분단이에요.</p>
            </div>
            {PreviewBoard({ reshape: true })}
          </div>
        );
      case 'method':
        return (
          <div className="sd-two">
            <div>
              <h2>배치 방법</h2>
              <div className="sd-seg">
                <button type="button" className={method === 'random' ? 'is-on' : ''} onClick={() => setMethod('random')} data-sd-method="random">
                  🎲 랜덤 배치
                </button>
                <button type="button" className={method === 'teacher' ? 'is-on' : ''} onClick={() => setMethod('teacher')} data-sd-method="teacher">
                  📌 교사 지정 배치
                </button>
              </div>
              {method === 'random' ? (
                <>
                  <p className="sd-sub">아래 조건을 지키면서 무작위로 자리를 정해요.</p>
                  <div className="sd-opts">
                    {mode === 'team' && (
                      <Toggle on={opt.balanceGender} onClick={() => setOpt((o) => ({ ...o, balanceGender: !o.balanceGender }))} data="balance">
                        모둠마다 남녀 인원 고르게
                      </Toggle>
                    )}
                    <Toggle on={opt.avoidPrevMates} onClick={() => setOpt((o) => ({ ...o, avoidPrevMates: !o.avoidPrevMates }))} data="prev">
                      {mode === 'team' ? '지난번 같은 모둠 친구와 또 같은 모둠 안 되게' : '지난번 옆 · 앞뒤 친구와 또 붙지 않게'}
                    </Toggle>
                    <Toggle on={opt.avoidSameSeat} onClick={() => setOpt((o) => ({ ...o, avoidSameSeat: !o.avoidSameSeat }))} data="same">
                      {mode === 'team' ? '지난번과 같은 모둠 · 같은 자리 피하기 (연속 같은 모둠 방지)' : '지난번과 같은 자리 피하기'}
                    </Toggle>
                    {mode === 'ind' && (
                      <Toggle on={opt.altGender} onClick={() => setOpt((o) => ({ ...o, altGender: !o.altGender }))} data="alt">
                        앞뒤로 남녀 번갈아 앉기
                      </Toggle>
                    )}
                  </div>
                  {mode === 'team' && opt.balanceGender && (
                    <p className="sd-info" data-sd-gender-plan>
                      👦👧 남 {males}명 · 여 {females}명을 모둠 인원에 맞춰 나눠요 —{' '}
                      {layout.teamBoxes
                        .map((b) => {
                          const m = Math.round((b.count * males) / Math.max(1, students.length));
                          return `${b.team.name} 남 ${m} · 여 ${b.count - m}`;
                        })
                        .join(' / ')}
                    </p>
                  )}
                  <h4>떨어져 앉기</h4>
                  <p className="sd-note">함께 있으면 떠드는 두 친구는 {mode === 'team' ? '다른 모둠' : '옆 · 앞뒤가 아닌 자리'}에 앉혀요.</p>
                  <div className="sd-apart">
                    <select value={apartA} onChange={(e) => setApartA(e.target.value ? +e.target.value : '')}>
                      <option value="">학생 1</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.number}. {s.name}
                        </option>
                      ))}
                    </select>
                    <span>↔</span>
                    <select value={apartB} onChange={(e) => setApartB(e.target.value ? +e.target.value : '')}>
                      <option value="">학생 2</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.number}. {s.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={apartA === '' || apartB === '' || apartA === apartB}
                      onClick={() => {
                        setOpt((o) => ({ ...o, apart: [...o.apart.filter(([a, b]) => !((a === apartA && b === apartB) || (a === apartB && b === apartA))), [apartA as number, apartB as number]] }));
                        setApartA('');
                        setApartB('');
                      }}
                    >
                      추가
                    </button>
                  </div>
                  <div className="sd-apart-list">
                    {opt.apart.map(([a, b], i) => (
                      <span key={i}>
                        {byId.get(a)?.name} ↔ {byId.get(b)?.name}
                        <button type="button" onClick={() => setOpt((o) => ({ ...o, apart: o.apart.filter((_, k) => k !== i) }))}>
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="sd-sub">선생님이 정해 둔 자리대로 뽑기 기계가 한 명씩 옮겨 줘요. 처음에는 지금 위젯 자리가 들어 있어요.</p>
                  <p className="sd-note">오른쪽 자리 두 곳을 차례로 누르면 두 학생 자리가 서로 바뀌어요.</p>
                  <button type="button" className="sd-ghost" onClick={() => setPlan(currentAssignment(layout, students, teams, cols))}>
                    ↺ 지금 위젯 자리로 되돌리기
                  </button>
                </>
              )}
            </div>
            {PreviewBoard({ editable: method === 'teacher' })}
          </div>
        );
      case 'front':
        return (
          <div className="sd-two">
            <div>
              <h2>먼저 앉기</h2>
              <p className="sd-sub">눈이 잘 안 보이는 친구, 도움이 필요한 친구는 가장 먼저 {mode === 'team' ? '칠판에 가까운 모둠' : '앞줄'} 자리에 앉혀요.</p>
              <div className="sd-roster small">
                {students.map((s) => {
                  const on = opt.frontIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={`sd-chip g-${gender(s)} ${on ? 'is-front' : ''}`}
                      onClick={() => setOpt((o) => ({ ...o, frontIds: on ? o.frontIds.filter((x) => x !== s.id) : [...o.frontIds, s.id] }))}
                      data-sd-front={s.id}
                    >
                      {on ? '👓' : <small>{s.number}</small>}
                      {s.name}
                    </button>
                  );
                })}
              </div>
              {opt.frontIds.length > 0 && (
                <p className="sd-info">
                  👓 {opt.frontIds.map((id) => byId.get(id)?.name).join(', ')} — 맨 처음 뽑혀서 {method === 'teacher' ? '정해 둔 자리' : '앞자리 구역(노란 칸)'}에 앉아요.
                </p>
              )}
            </div>
            {PreviewBoard({ frontPick: true })}
          </div>
        );
      case 'view':
        return (
          <>
            <h2>보기 방식</h2>
            <div className="sd-cards">
              <button type="button" className={`sd-card ${reveal === 'show' ? 'is-on' : ''}`} onClick={() => setReveal('show')} data-sd-reveal="show">
                <CapsuleSVG gender="M" img={2} size={64} />
                <b>이름 보이며 뽑기</b>
                <span>캡슐에 이름표가 붙어 있어 뽑히는 순간 바로 알 수 있어요.</span>
              </button>
              <button type="button" className={`sd-card ${reveal === 'hide' ? 'is-on' : ''}`} onClick={() => setReveal('hide')} data-sd-reveal="hide">
                <CapsuleSVG gender="F" img={4} size={64} mark="?" />
                <b>이름 숨기고 하나씩 열기</b>
                <span>캡슐 색으로 남녀만 보여요. 다 앉은 뒤 캡슐을 하나씩 눌러 열어 봐요.</span>
              </button>
            </div>
            <h4>뽑기 기계 간판 이름</h4>
            <div className="sd-owner">
              <input value={owner} maxLength={14} onChange={(e) => setOwner(e.target.value)} placeholder="호랑이 선생님" data-sd-owner />
              <span>→ 간판: “{owner || '우리 반'}의 두근두근 자리 뽑기”</span>
            </div>
            <h4>뽑기 속도</h4>
            <div className="sd-seg">
              {(
                [
                  [1, '보통'],
                  [0.6, '빠르게'],
                  [0.35, '아주 빠르게'],
                ] as [Speed, string][]
              ).map(([v, l]) => (
                <button key={l} type="button" className={speed === v ? 'is-on' : ''} onClick={() => setSpeed(v)}>
                  {l}
                </button>
              ))}
            </div>
            <div className="sd-opts">
              <Toggle on={sound} onClick={() => setSound((v) => !v)}>
                효과음 켜기
              </Toggle>
            </div>
          </>
        );
      case 'history':
        return (
          <>
            <h2>지난 기록</h2>
            <p className="sd-sub">자리 뽑기를 마칠 때마다 기록돼요. 기록을 누르면 그때의 자리 배치표를 보고 인쇄할 수 있어요. 다음 뽑기에서 '지난번과 같은 자리 · 같은 모둠 피하기'에도 쓰여요.</p>
            {history.length > 0 && (
              <button
                type="button"
                className="sd-danger"
                onClick={() => {
                  if (!window.confirm('지난 자리 뽑기 기록을 모두 지울까요? (되돌릴 수 없어요)')) return;
                  clearHistory();
                  setHistory([]);
                  say('🧹 지난 기록을 지웠어요');
                }}
                data-sd-hist-reset
              >
                🧹 지난 기록 초기화
              </button>
            )}
            <div className="sd-hist">
              {history.length === 0 && <p className="sd-empty">아직 기록이 없어요.</p>}
              {history.map((h, i) => (
                <button key={i} type="button" className="sd-hist-row" onClick={() => setHistPop(h)} data-sd-hist-row={i}>
                  <b>{histDate(h.date)}</b>
                  <span>{h.mode === 'team' ? '👥 모둠 자리' : '🪑 개인 자리'}</span>
                  <em>{Object.values(h.names).slice(0, 8).join(', ')}…</em>
                  <i>배치표 보기 ›</i>
                </button>
              ))}
            </div>
          </>
        );
    }
  };

  // ────────────── 결과 배치표 ──────────────
  const [view, setView] = useState<'student' | 'teacher'>('student');
  const ResultChart = (L: Layout = layout, m: Record<number, string> = map, nm?: Record<number, string>, k = 0.92) => {
    const flip = view === 'teacher';
    return (
      <div className={`sd-chart ${flip ? 'is-teacher' : ''}`}>
        {!flip && <div className="sd-chart-board">칠 판</div>}
        <div className="sd-chart-area" style={{ width: SEAT_AREA.w * k, height: SEAT_AREA.h * k }}>
          {L.teamBoxes.map((b) => {
            const x = (b.rect.x - SEAT_AREA.x) * k;
            const y = (b.rect.y - SEAT_AREA.y) * k;
            return (
              <div
                key={b.team.id}
                className="sd-pv-team"
                style={{ left: flip ? SEAT_AREA.w * k - x - b.rect.w * k : x, top: flip ? SEAT_AREA.h * k - y - b.rect.h * k : y, width: b.rect.w * k, height: b.rect.h * k }}
              >
                <em>{b.team.name}</em>
              </div>
            );
          })}
          {L.slots.map((s) => {
            const id = Object.keys(m).find((x) => m[+x] === s.key);
            const st = id ? byId.get(+id) : undefined;
            const label = id ? (nm ? nm[+id] : st?.name) || '' : '';
            const x = (s.x - SEAT_AREA.x) * k;
            const y = (s.y - SEAT_AREA.y) * k;
            return (
              <div
                key={s.key}
                className={`sd-chart-desk ${st ? `g-${gender(st)}` : ''}`}
                style={{ left: flip ? SEAT_AREA.w * k - x - s.w * k : x, top: flip ? SEAT_AREA.h * k - y - s.h * k : y, width: s.w * k, height: s.h * k }}
              >
                {label}
              </div>
            );
          })}
        </div>
        {flip && <div className="sd-chart-board">칠 판 (교탁)</div>}
      </div>
    );
  };

  // 인쇄용 (화면에서는 숨김)
  const PrintSheet = () => (
    <div className="sd-print" aria-hidden>
      <h1>우리 반 자리 배치표</h1>
      <p>
        {todayText()} · {mode === 'team' ? '모둠 자리' : '개인 자리'} · {view === 'student' ? '학생용 (칠판이 위)' : '교사용 (칠판이 아래)'}
      </p>
      {ResultChart()}
    </div>
  );

  // ────────────── 화면 ──────────────
  return (
    <div className={`sd-root ${isSetup ? 'is-setup-modal' : ''}`}>
      {(phase === 'play' || phase === 'result') && (
        <Suspense fallback={<div className="sd3-loading">뽑기 기계 준비 중…</div>}>
          <SeatDraw3D
            layout={histL || layout}
            caps={caps}
            claw={claw}
            lumi={lumi}
            map={map}
            order={order}
            names={histNames || names3d}
            reveal={histView ? 'show' : reveal}
            signKey={signKey}
            opened={opened}
            bursts={bursts}
            tint={tint}
            cam={cam}
            done={done}
            owner={owner}
            onCapClick={(sid) => !histView && reveal === 'hide' && openCap(sid)}
          />
        </Suspense>
      )}
      <div className={`sd-stage ${phase === 'play' || phase === 'result' ? 'is-hud' : ''}`} style={{ width: W, height: H, transform: `translate(-50%, -50%) scale(${scale})` }}>
        {/* 오른쪽 위 창 버튼 */}
        <div className="sd-winbtns">
          {!isSetup && phase !== 'opening' && (
            <button type="button" className={histOpen || histView ? 'is-on' : ''} onClick={() => setHistOpen((v) => !v)} data-sd-hist-open>
              🕘 지난 기록
            </button>
          )}
          {!isSetup && sdApi && displayCount > 1 && (
            <button type="button" onClick={moveToNextDisplay} title="자리 뽑기 창을 다른 모니터로 옮겨요 (창 제목줄을 끌어서 옮겨도 돼요)" data-sd-next-display>
              🖥 다른 모니터로
            </button>
          )}
          {!isSetup && (
            <button type="button" onClick={toggleFull} title="지금 이 창이 있는 모니터에서 전체 화면으로 (Esc로 해제)">
              ⛶ 전체 화면
            </button>
          )}
          <button type="button" onClick={() => (isSetup ? onClose?.() : window.close())} data-sd-close>
            ✕ 닫기
          </button>
        </div>
        {winMsg && <div className="sd-winmsg">{winMsg}</div>}
        {histOpen && !isSetup && (
          <div className="sd-hist-pop" data-sd-hist-list>
            <b>🕘 지난 기록 — 누르면 그때 자리를 교실에 펼쳐 봐요</b>
            {history.length === 0 && <p className="sd-empty">아직 기록이 없어요.</p>}
            {history.map((h, i) => (
              <button key={i} type="button" className={histView?.date === h.date ? 'is-on' : ''} onClick={() => enterHist(h)} data-sd-hist-item={i}>
                <span>{histDate(h.date)}</span>
                <em>{h.mode === 'team' ? '👥 모둠' : '🪑 개인'} · {Object.keys(h.map).length}명</em>
              </button>
            ))}
          </div>
        )}

        {phase === 'setup' && (
          <div className="sd-setup">
            <aside className="sd-side">
              <div className="sd-brand">
                <span className="sd-brand-ico">
                  <CapsuleSVG gender="F" img={3} size={44} />
                </span>
                <div>
                  <b>두근두근 자리 뽑기</b>
                  <small>뽑기 기계가 정해 주는 우리 반 자리</small>
                </div>
              </div>
              <h5>자리 뽑기 준비</h5>
              {STEPS.map((s) => (
                <button key={s.id} type="button" className={`sd-step ${step === s.id ? 'is-on' : ''}`} onClick={() => setStep(s.id)} data-sd-step={s.id}>
                  <i>{s.n}</i>
                  {s.label}
                  <em>{s.meta}</em>
                </button>
              ))}
              <h5>기록</h5>
              <button type="button" className={`sd-step ${step === 'history' ? 'is-on' : ''}`} onClick={() => setStep('history')} data-sd-step="history">
                <i>🕘</i>
                지난 기록
                <em>{history.length ? `${history.length}개` : ''}</em>
              </button>
              <div className="sd-ready">
                <b>{students.length && layout.slots.length >= students.length ? '준비됐어요' : '확인해 주세요'}</b>
                <span>
                  학생 {students.length}명 · 자리 {layout.slots.length}개 · {method === 'random' ? '랜덤' : '교사 지정'} · {reveal === 'show' ? '이름 공개' : '이름 숨김'}
                </span>
              </div>
              <button
                type="button"
                className="sd-start"
                onClick={() => {
                  if (isSetup) {
                    openSeatDrawWindow();
                    onClose?.();
                  } else startDraw();
                }}
                disabled={!students.length}
                data-sd-start
              >
                {isSetup ? '🎰 보조창에서 뽑기 시작' : '▶ 자리 뽑기 시작'}
              </button>
              {isSetup && <small className="sd-start-note">설정은 바로 저장돼요. 학생 화면(보조창)에는 인트로 뒤 바로 뽑기 화면이 나와요.</small>}
            </aside>
            <main className="sd-main">{renderStep()}</main>
          </div>
        )}

        {phase === 'opening' && (
          <div className={`sd-open st-${openStep}`} onClick={() => openStep >= 4 && startDraw()} data-sd-opening>
            <div className="sd-open-bg" />
            {Array.from({ length: 16 }).map((_, i) => (
              <span key={i} className="sd-intro-cap" style={{ left: `${(i * 61) % 100}%`, animationDelay: `${(i % 8) * 0.45}s` }}>
                <CapsuleSVG gender={i % 2 ? 'M' : 'F'} img={i} size={40 + (i % 3) * 12} />
              </span>
            ))}
            {/* 1) 집게가 커다란 캡슐을 들고 내려와요 */}
            <div className="sd-open-claw">
              <i className="sd-open-cable" />
              <svg viewBox="0 0 80 92" width={150} height={172}>
                <g className="pr l">
                  <path d="M34 50 Q14 60 18 84 Q22 88 26 84 Q24 66 38 58 Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth={1.5} />
                </g>
                <g className="pr r">
                  <path d="M46 50 Q66 60 62 84 Q58 88 54 84 Q56 66 42 58 Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth={1.5} />
                </g>
                <circle cx={22} cy={20} r={9} fill="#f9a8d4" stroke="#fff" strokeWidth={2.5} />
                <circle cx={58} cy={20} r={9} fill="#f9a8d4" stroke="#fff" strokeWidth={2.5} />
                <ellipse cx={40} cy={36} rx={24} ry={21} fill="#fbcfe8" stroke="#fff" strokeWidth={3} />
                <circle cx={32} cy={34} r={2.6} fill="#3b2f2f" />
                <circle cx={48} cy={34} r={2.6} fill="#3b2f2f" />
                <path d="M36 41 Q40 45 44 41" stroke="#3b2f2f" strokeWidth={2} fill="none" strokeLinecap="round" />
              </svg>
            </div>
            {/* 2) 캡슐이 툭 떨어져 통통 → 3) 뚜껑이 열리며 루미 등장 */}
            <div className="sd-open-cap">
              <CapsuleSVG gender="F" img={3} size={240} open={openStep >= 3} />
            </div>
            {openStep >= 3 && (
              <>
                <span className="sd-open-burst">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <i key={i} style={{ transform: `rotate(${i * (360 / 14)}deg)` }} />
                  ))}
                </span>
                <div className="sd-open-lumi">
                  <MochiBody face={openStep >= 4 ? 'excited' : 'happy'} tint={tint} glow="med" className="w-full h-full" />
                </div>
              </>
            )}
            {openStep >= 3 && (
              <h1 className="sd-open-title">
                <small>{owner || '우리 반'}의</small>
                <span>두근두근 자리 뽑기</span>
              </h1>
            )}
            {openStep >= 4 && (
              <>
                <div className="sd-open-bubble">오늘 우리 반 자리, 내가 콕 집어 줄게! 🎰</div>
                <button
                  type="button"
                  className="sd-open-go"
                  onClick={(e) => {
                    e.stopPropagation();
                    startDraw();
                  }}
                  data-sd-go-setup
                >
                  ▶ 자리 뽑기 시작!
                </button>
              </>
            )}
            <button
              type="button"
              className="sd-skip"
              onClick={(e) => {
                e.stopPropagation();
                startDraw();
              }}
            >
              건너뛰기 ▶▶
            </button>
          </div>
        )}

        {(phase === 'play' || phase === 'result') && (
          <>
            {notice && <div className="sd-notice-toast">{notice}</div>}
            <div className="sd-cams" data-sd-cams>
              {(
                [
                  ['all', '🎥 기계 전체'],
                  ['follow', '🏗 크레인 따라가기'],
                  ['top', '⬇ 위에서'],
                ] as [CamMode, string][]
              ).map(([v, l]) => (
                <button key={v} type="button" className={cam === v ? 'is-on' : ''} onClick={() => setCam(v)} data-sd-cam={v}>
                  {l}
                </button>
              ))}
              <span>끌어서 돌리기 · 휠 확대</span>
            </div>
            {/* 기계 조작판 */}
            {histView ? (
              <div className="sd-panel">
                <div className="sd-led is-hist">🕘 {histDate(histView.date)}</div>
                <button type="button" className="sd-go is-done" onClick={exitHist} data-sd-hist-exit>
                  ↩ 오늘 뽑기로 돌아가기
                </button>
                <div className="sd-ctrls">
                  <button type="button" onClick={() => setHistOpen(true)}>
                    🕘 다른 기록
                  </button>
                </div>
              </div>
            ) : (
            <div className="sd-panel">
              <div className="sd-led" data-sd-left>
                남은 캡슐 <b>{remaining}</b>
              </div>
              {done < order.length ? (
                <button type="button" className="sd-go" onClick={next} disabled={busy} data-sd-next>
                  {busy ? (auto ? '⏩ 자동으로 뽑는 중…' : '🎰 뽑는 중…') : `▶ ${done === 0 ? '첫 번째' : '다음'} 뽑기! (Space)`}
                </button>
              ) : reveal === 'hide' && opened.size < order.length ? (
                <button type="button" className="sd-go is-open" onClick={openAll} data-sd-openall>
                  🎁 남은 캡슐 모두 열기
                </button>
              ) : (
                <button type="button" className="sd-go is-done" onClick={() => setPhase('result')} data-sd-result>
                  📋 결과 보기 · 반영하기
                </button>
              )}
              <div className="sd-ctrls">
                <button
                  type="button"
                  className={auto ? 'is-on' : ''}
                  onClick={() => {
                    const v = !auto;
                    setAuto(v);
                    autoRef.current = v;
                    if (v && !busy && done < order.length) void run(done);
                  }}
                  data-sd-auto
                >
                  ⏩ 자동 뽑기
                </button>
                <button
                  type="button"
                  onClick={() => setSpeed((s) => (s === 1 ? 0.6 : s === 0.6 ? 0.35 : 1))}
                  data-sd-speed
                >
                  🐢 {speed === 1 ? '보통' : speed === 0.6 ? '빠르게' : '아주 빠르게'}
                </button>
                <button type="button" onClick={skipAll} disabled={done >= order.length} data-sd-skip>
                  ⏭ 모두 바로 앉히기
                </button>
                <button type="button" onClick={() => setSound((v) => !v)}>
                  {sound ? '🔊' : '🔇'}
                </button>
                {done > 0 && (
                  <button type="button" onClick={() => setPhase('result')}>
                    📋 결과
                  </button>
                )}
              </div>
            </div>
            )}

            {toast && !histView && phase === 'play' && done < order.length && (
              <div key={toast.n} className="sd-toast" data-sd-toast>
                <i>#{String(toast.n).padStart(2, '0')}</i>
                <div>
                  <b>{toast.who}</b>
                  <span>→ {toast.where}</span>
                </div>
              </div>
            )}
          </>
        )}

        {histPop && (
          <div className="sd-result" data-sd-hist-popup>
            <div className="sd-result-card">
              <button type="button" className="sd-result-x" onClick={() => setHistPop(null)} title="닫기" data-sd-hist-popup-close>
                ✕
              </button>
              <div className="sd-result-top">
                <div>
                  <span className="sd-pill">🕘 지난 기록</span>
                  <h2>{histDate(histPop.date)} 자리 배치표</h2>
                </div>
                <div className="sd-seg small">
                  <button type="button" className={view === 'student' ? 'is-on' : ''} onClick={() => setView('student')}>
                    학생용 (칠판이 위)
                  </button>
                  <button type="button" className={view === 'teacher' ? 'is-on' : ''} onClick={() => setView('teacher')}>
                    교사용 (칠판이 아래)
                  </button>
                </div>
              </div>
              {ResultChart(histLayout(histPop, teams, cols, teamCols), histPop.map, histPop.names)}
              <div className="sd-result-btns">
                <button
                  type="button"
                  onClick={() => printChart(histLayout(histPop, teams, cols, teamCols), histPop.map, histPop.mode, histDate(histPop.date), histPop.names)}
                  data-sd-hist-print
                >
                  🖨 인쇄
                </button>
                <button type="button" onClick={() => setHistPop(null)}>
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === 'result' && (
          <div className="sd-result" data-sd-result-panel>
            <div className="sd-result-card">
              <button type="button" className="sd-result-x" onClick={() => setPhase('play')} title="닫기 (뽑기 화면으로)" data-sd-result-close>
                ✕
              </button>
              <div className="sd-result-top">
                <div>
                  <span className="sd-pill">자리 뽑기 끝!</span>
                  <h2>
                    오늘의 자리 뽑기 결과 <span className="sd-saved">✓ 지난 기록에 저장됨</span>
                  </h2>
                </div>
                <div className="sd-seg small">
                  <button type="button" className={view === 'student' ? 'is-on' : ''} onClick={() => setView('student')}>
                    학생용 (칠판이 위)
                  </button>
                  <button type="button" className={view === 'teacher' ? 'is-on' : ''} onClick={() => setView('teacher')}>
                    교사용 (칠판이 아래)
                  </button>
                </div>
              </div>
              {ResultChart()}
              <div className="sd-result-btns">
                <button type="button" className={`sd-apply ${applied ? 'is-done' : ''}`} onClick={applyResult} data-sd-apply>
                  {applied ? '✅ 반영했어요' : '✅ 위젯 · 보조화면에 반영하기'}
                </button>
                <button type="button" onClick={() => printChart()} data-sd-print>
                  🖨 인쇄
                </button>
                <button type="button" onClick={copyExcel}>
                  📋 엑셀에 붙여넣기용 복사
                </button>
                <button type="button" onClick={() => setPhase('play')}>
                  🎰 뽑기 화면으로
                </button>
                <button
                  type="button"
                  onClick={() => startDraw()}
                >
                  🔄 처음부터 다시
                </button>
              </div>
              <p className="sd-note">반영하면 대시보드 자리 위젯과 보조화면 좌석 배치도가 바로 바뀌어요. {mode === 'team' ? '모둠 책상 위치는 기본 배치로 정리돼요.' : ''}</p>
            </div>
            {notice && <div className="sd-notice-toast">{notice}</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default SeatDrawApp;
