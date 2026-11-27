import React, { useEffect, useMemo, useState } from 'react';
import type { Team } from '../../types';
import { BRACKET_HANDOFF_KEY, type BracketHandoff } from './GameBracket';
import { playDrumroll, playRankReveal, playScoreDown, playScoreUp, startVictoryMusic, stopVictoryMusic } from '../../utils/gameSounds';
import { GameTimer } from './GameTimer';
import { Confetti, Lumi, SoundToggle, useLatest, MEDAL_TINT, TEAM_COLORS, hexFromTw, tintFromHex, useCountUp, usePersist } from './gameFx';

/**
 * 🔢 보조 화면 · 점수판
 * - 남녀 대결 · 모둠 대결 · 2~4팀 자유 대결
 * - 기본 점수를 정하고 + / − 를 누를 때마다 숫자가 또르르 바뀌어요.
 * - [경기 끝] → 시상대에 3위부터 차례로 루미(팀 색)가 올라가 환호해요.
 */

interface SbTeam { id: string; name: string; color: string; score: number }
interface SbState { preset: string; base: number; step: number; teams: SbTeam[] }
const KEY = 'dm_scoreboard_v1';

const mk = (names: [string, string][]): SbTeam[] => names.map(([name, color], i) => ({ id: `t${i}-${Date.now()}`, name, color, score: 0 }));
const presetTeams = (preset: string, teams: Team[]): SbTeam[] => {
  if (preset === 'mf') return mk([['남학생', '#3b82f6'], ['여학생', '#ec4899']]);
  if (preset === 'team' && teams.length >= 2) return mk(teams.map((t, i) => [t.name, hexFromTw(t.dotColor, TEAM_COLORS[i % TEAM_COLORS.length])] as [string, string]));
  const n = Number(preset) || 2;
  const def = ['청팀', '홍팀', '노랑팀', '초록팀'];
  return mk(Array.from({ length: n }, (_, i) => [def[i] || `${i + 1}팀`, TEAM_COLORS[[0, 6, 2, 3][i] ?? i]] as [string, string]));
};

const ScoreCard: React.FC<{ t: SbTeam; step: number; onChange: (patch: Partial<SbTeam>) => void; big: boolean; leader: boolean }> = ({ t, step, onChange, big, leader }) => {
  const shown = useCountUp(t.score);
  const [floats, setFloats] = useState<{ id: number; v: number }[]>([]);
  const bump = (d: number) => {
    onChange({ score: t.score + d });
    if (d > 0) playScoreUp(Math.abs(d));
    else playScoreDown();
    const id = Date.now() + Math.random();
    setFloats((f) => [...f.slice(-4), { id, v: d }]);
    window.setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 900);
  };
  return (
    <div className={`sb-card ${big ? 'is-big' : ''} ${leader ? 'is-leader' : ''}`} style={{ ['--c' as any]: t.color }} data-sb-team={t.name}>
      <div className="sb-card-top">
        <Lumi tint={tintFromHex(t.color)} face={leader ? 'proud' : 'happy'} size={big ? 58 : 44} crown={leader} />
        <input className="sb-name" value={t.name} onChange={(e) => onChange({ name: e.target.value })} aria-label="팀 이름" />
      </div>
      <div className="sb-score" data-sb-score>
        {shown}
        {floats.map((f) => (
          <span key={f.id} className={`sb-float ${f.v < 0 ? 'is-minus' : ''}`}>
            {f.v > 0 ? `+${f.v}` : f.v}
          </span>
        ))}
      </div>
      <div className="sb-btns">
        <button type="button" className="sb-minus" onClick={() => bump(-step)} aria-label={`${t.name} ${step}점 빼기`} data-sb-minus>
          −{step}
        </button>
        <button type="button" className="sb-plus" onClick={() => bump(step)} aria-label={`${t.name} ${step}점 더하기`} data-sb-plus>
          +{step}
        </button>
      </div>
    </div>
  );
};

/** 🏅 시상식 */
const Ceremony: React.FC<{ teams: SbTeam[]; onClose: () => void; onReplay: () => void; onToBracket?: () => void }> = ({ teams, onClose, onReplay, onToBracket }) => {
  // 같은 점수는 같은 순위
  const ranked = useMemo(() => {
    const s = [...teams].sort((a, b) => b.score - a.score);
    let rank = 0;
    let prev: number | null = null;
    return s.map((t, i) => {
      if (prev !== t.score) rank = i + 1;
      prev = t.score;
      return { ...t, rank };
    });
  }, [teams]);
  const at = (r: number) => ranked.filter((t) => t.rank === r);
  const podium = [1, 2, 3].map((r) => ({ r, list: at(r) }));
  const rest = ranked.filter((t) => t.rank > 3);
  const [stage, setStage] = useState(0); // 1: 3위 2: 2위 3: 1위 4: 모두 환호
  const close = useLatest(onClose);
  useEffect(() => {
    const ts = [600, 2000, 3500, 5000].map((ms, i) => window.setTimeout(() => setStage(i + 1), ms));
    // 🥁 두구두구 → 3위·2위·1위 발표음 → 🎺 우승 음악
    playDrumroll(0.55);
    ts.push(window.setTimeout(() => playRankReveal(3), 600), window.setTimeout(() => playRankReveal(2), 2000), window.setTimeout(() => startVictoryMusic(2), 3500));
    const k = (e: KeyboardEvent) => e.key === 'Escape' && close.current();
    window.addEventListener('keydown', k);
    return () => {
      ts.forEach(clearTimeout);
      window.removeEventListener('keydown', k);
      stopVictoryMusic();
    };
  }, [close]);
  const shownAt = (r: number) => (r === 3 ? stage >= 1 : r === 2 ? stage >= 2 : stage >= 3);
  const face = (r: number) => (stage >= 4 ? (r === 1 ? 'proud' : 'excited') : r === 1 ? 'love' : 'happy');
  const slot = (r: number) => {
    const p = podium.find((x) => x.r === r)!;
    const visible = p.list.length > 0;
    return (
      <div key={r} className={`sb-pod sb-pod-${r} ${visible && shownAt(r) ? 'is-up' : ''} ${stage >= 4 ? 'is-cheer' : ''}`} data-sb-pod={r}>
        <div className="sb-pod-chars">
          {p.list.map((t, i) => (
            <div key={t.id} className="sb-pod-char" style={{ ['--i' as any]: i }}>
              {stage >= 4 && <span className="sb-cheer">{r === 1 ? '우승이다!' : '와아!'}</span>}
              <Lumi tint={tintFromHex(t.color)} face={face(r) as any} size={(r === 1 ? 128 : 104) / Math.max(1, Math.sqrt(p.list.length))} crown={r === 1 && stage >= 3} />
              <span className="sb-medal" style={{ background: MEDAL_TINT[r as 1 | 2 | 3].dark }}>{r}</span>
              <b className="sb-pod-name" style={{ color: t.color }}>{t.name}</b>
              <small className="sb-pod-score">{t.score}점</small>
            </div>
          ))}
        </div>
        <div className="sb-step" style={{ ['--m' as any]: MEDAL_TINT[r as 1 | 2 | 3].dark }}>
          <span>{r}</span>
        </div>
      </div>
    );
  };
  return (
    <div className="sb-cere" role="dialog" aria-label="시상식" data-sb-ceremony>
      {stage >= 3 && <Confetti count={110} />}
      <div className={`sb-spot ${stage >= 3 ? 'is-on' : ''}`} />
      <div className="sb-cere-title">
        {stage < 1 ? '🥁 두구두구…' : stage < 3 ? `${stage === 1 ? '3위' : '2위'} 발표!` : '🏆 오늘의 우승!'}
      </div>
      <div className="sb-podium">
        {slot(2)}
        {slot(1)}
        {slot(3)}
      </div>
      {rest.length > 0 && stage >= 4 && (
        <div className="sb-rest">
          {rest.map((t) => (
            <span key={t.id} style={{ ['--c' as any]: t.color }}>
              {t.rank}위 <b>{t.name}</b> {t.score}점
            </span>
          ))}
        </div>
      )}
      <div className="sb-cere-btns">
        {onToBracket && teams.length >= 2 && (
          <button type="button" className="is-gold" onClick={onToBracket} data-sb-cere-bracket>
            🏆 이 순위로 토너먼트
          </button>
        )}
        <button type="button" onClick={onReplay} data-sb-replay>
          🔁 새 경기
        </button>
        <button type="button" onClick={onClose} data-sb-close>
          닫기
        </button>
      </div>
    </div>
  );
};

export const ScoreBoard: React.FC<{ teams: Team[]; isLight: boolean; onToBracket?: () => void }> = ({ teams, isLight, onToBracket }) => {
  const [st, setSt] = usePersist<SbState>(KEY, () => ({ preset: 'mf', base: 0, step: 1, teams: presetTeams('mf', []) }));
  const [baseDraft, setBaseDraft] = useState(String(st.base));
  const [ceremony, setCeremony] = useState(false);
  const [tbMenu, setTbMenu] = useState(false);

  /** 🏆 지금 팀들로 토너먼트 대진표 만들기 (점수 순 시드 또는 무작위) */
  const toBracket = (seeded: boolean) => {
    if (!onToBracket || st.teams.length < 2) return;
    const sorted = [...st.teams].sort((a, b) => b.score - a.score);
    let rank = 0;
    let prev: number | null = null;
    const entries = sorted.map((t, i) => {
      if (prev !== t.score) rank = i + 1;
      prev = t.score;
      return { name: t.name.trim() || `${i + 1}팀`, color: t.color, score: t.score, rank };
    });
    const from = st.preset === 'team' ? '모둠 대결' : st.preset === 'mf' ? '남녀 대결' : '점수판';
    const h: BracketHandoff = { entries, seeded, from };
    try {
      localStorage.setItem(BRACKET_HANDOFF_KEY, JSON.stringify(h));
    } catch {}
    setTbMenu(false);
    setCeremony(false);
    onToBracket();
  };
  const top = Math.max(...st.teams.map((t) => t.score));
  const leaders = st.teams.filter((t) => t.score === top).length === 1 && st.teams.some((t) => t.score !== st.base) ? top : null;

  const applyPreset = (preset: string) => setSt((p) => ({ ...p, preset, teams: presetTeams(preset, teams).map((t) => ({ ...t, score: p.base })) }));
  const applyBase = () => {
    const b = Math.max(-999, Math.min(9999, parseInt(baseDraft, 10) || 0));
    setBaseDraft(String(b));
    setSt((p) => ({ ...p, base: b, teams: p.teams.map((t) => ({ ...t, score: b })) }));
  };
  const patch = (id: string, ch: Partial<SbTeam>) => setSt((p) => ({ ...p, teams: p.teams.map((t) => (t.id === id ? { ...t, ...ch } : t)) }));
  const reset = () => setSt((p) => ({ ...p, teams: p.teams.map((t) => ({ ...t, score: p.base })) }));

  const presets: [string, string][] = [
    ['mf', '👦👧 남녀 대결'],
    ['team', `👥 모둠 대결${teams.length ? ` (${teams.length})` : ''}`],
    ['2', '2팀'],
    ['3', '3팀'],
    ['4', '4팀'],
  ];

  return (
    <div className={`sb ${isLight ? 'is-light' : 'is-dark'}`} data-scoreboard>
      {/* 머리: 왼쪽 = 제목 · 대결 방식 · 도구 / 오른쪽 = ⏱ 경기 타이머 (시간 | 조절 단추 + 시작) */}
      <div className="sb-head">
      <div className="sb-top">
        <div className="sb-top-row">
        <div className="gb-title">🔢 점수판</div>
        <div className="gb-seg">
          {presets.map(([v, l]) => (
            <button key={v} type="button" className={st.preset === v ? 'is-on' : ''} disabled={v === 'team' && teams.length < 2} onClick={() => applyPreset(v)} data-sb-preset={v}>
              {l}
            </button>
          ))}
        </div>
        </div>
        <div className="sb-tools">
          <label className="sb-base">
            기본 점수
            <input type="number" value={baseDraft} onChange={(e) => setBaseDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyBase()} data-sb-base />
            <button type="button" onClick={applyBase} data-sb-base-apply>
              적용
            </button>
          </label>
          <div className="gb-seg" title="한 번 누를 때 바뀌는 점수">
            {[1, 2, 5, 10].map((n) => (
              <button key={n} type="button" className={st.step === n ? 'is-on' : ''} onClick={() => setSt((p) => ({ ...p, step: n }))} data-sb-step={n}>
                ±{n}
              </button>
            ))}
          </div>
          <SoundToggle />
          <button type="button" className="gb-btn" onClick={reset} data-sb-reset>
            ↺ 처음 점수로
          </button>
          {onToBracket && st.teams.length >= 2 && (
            <div className="sb-tb">
              <button type="button" className="gb-btn sb-tb-btn" onClick={() => setTbMenu((v) => !v)} aria-expanded={tbMenu} data-sb-to-bracket>
                🏆 토너먼트로 잇기
              </button>
              {tbMenu && (
                <div className="sb-tb-menu" role="menu">
                  <p>이 {st.teams.length}팀으로 토너먼트 대진표를 만들어요</p>
                  <button type="button" role="menuitem" onClick={() => toBracket(true)} data-sb-tb-seed>
                    🥇 지금 점수 순위대로 <small>1위가 1번 시드 · 부전승 우선</small>
                  </button>
                  <button type="button" role="menuitem" onClick={() => toBracket(false)} data-sb-tb-rand>
                    🎲 무작위 뽑기로 <small>뽑기 효과로 자리를 정해요</small>
                  </button>
                </div>
              )}
            </div>
          )}
          <button type="button" className="sb-finish" onClick={() => setCeremony(true)} data-sb-finish>
            🏁 경기 끝 · 순위 발표
          </button>
        </div>
      </div>
      <div className="sb-timer-row">
        <GameTimer storeKey="class_game_timer_scoreboard" isLight={isLight} />
      </div>
      </div>

      <div className={`sb-grid n${Math.min(st.teams.length, 8)}`}>
        {st.teams.map((t) => (
          <ScoreCard key={t.id} t={t} step={st.step} big={st.teams.length <= 3} leader={leaders !== null && t.score === leaders} onChange={(ch) => patch(t.id, ch)} />
        ))}
      </div>


      {ceremony && (
        <Ceremony
          teams={st.teams}
          onClose={() => setCeremony(false)}
          onToBracket={onToBracket ? () => toBracket(true) : undefined}
          onReplay={() => {
            setCeremony(false);
            reset();
          }}
        />
      )}
    </div>
  );
};
export default ScoreBoard;
