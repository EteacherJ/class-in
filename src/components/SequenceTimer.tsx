import { TIMER_TOGGLE_EVENT } from '../constants/shortcuts';
/**
 * 🪜 순차 타이머 화면 (메인 위젯 · 보조 화면 공용)
 *  - 단계별 타임라인 위를 루미가 따라가며 지금 단계를 알려줘요.
 *  - 30·20초 전 알림, 10초부터 루미와 함께 카운트다운 (켜고 끄기)
 *  - 단계 옆 −1분 −10초 +10초 +1분: 늘린 만큼 다음 단계가 줄어요 (마지막 단계는 전체 시간이 바뀌어요)
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MochiBody, useMochiTint, type MochiFace } from './MochiCharacter';
import { playTimerSound, playTimerTick, useTimerAlert } from '../utils/timerAlerts';
import {
  BUILTIN_PRESETS,
  MIN_STAGE_SEC,
  SEQ_COLORS,
  SEQ_DISPLAY_HB,
  SEQ_EMOJIS,
  checkTotal,
  deletePreset,
  fmt,
  fmtLen,
  loadPreset,
  position,
  remainingClassSec,
  savePreset,
  seqAddStage,
  seqAdjust,
  seqFinish,
  seqFitTo,
  seqMoveStage,
  seqPatch,
  seqPause,
  seqPrev,
  seqRemoveStage,
  seqReset,
  seqSkip,
  seqStart,
  seqUpdateStage,
  sumSec,
  usePresets,
  useSeq,
  type SeqStage,
} from '../utils/seqTimer';

interface Props {
  variant: 'display' | 'widget';
  onOpenDisplay?: () => void;
}

const clockAt = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const SequenceTimer: React.FC<Props> = ({ variant, onOpenDisplay }) => {
  const seq = useSeq();
  const presets = usePresets();
  const [alertCfg] = useTimerAlert();
  const [tint] = useMochiTint();
  const [now, setNow] = useState(() => Date.now());
  const [bubble, setBubble] = useState<{ text: string; id: number } | null>(null);
  const [editOpen, setEditOpen] = useState(variant === 'display');
  const [saveName, setSaveName] = useState<string | null>(null);
  const [addName, setAddName] = useState('');
  const [addMin, setAddMin] = useState('');
  const [presetOpen, setPresetOpen] = useState(false);
  const isDisplay = variant === 'display';
  // 보조 화면: 시작하면 편집 칸을 접어서 큰 화면에 집중, 멈추거나 처음으로 가면 다시 보여 줘요
  const startedFlag = seq.running;
  useEffect(() => {
    if (isDisplay) setEditOpen(!startedFlag);
  }, [isDisplay, startedFlag]);

  // ⏱️ 진행 중에는 자주, 멈춰 있을 때는 가끔 (끝나는 시각 표시용)
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), seq.running ? 200 : 5000);
    return () => clearInterval(t);
  }, [seq.running]);

  // 🖥️ 보조 화면이 열려 있으면 소리는 보조 화면에서만 (두 번 울리지 않게)
  useEffect(() => {
    if (!isDisplay) return;
    const beat = () => {
      try {
        localStorage.setItem(SEQ_DISPLAY_HB, String(Date.now()));
      } catch {
        /* 무시 */
      }
    };
    beat();
    const t = window.setInterval(beat, 1500);
    return () => {
      clearInterval(t);
      try {
        localStorage.removeItem(SEQ_DISPLAY_HB);
      } catch {
        /* 무시 */
      }
    };
  }, [isDisplay]);
  const canPlay = () => {
    if (!seq.alerts.sound) return false;
    if (isDisplay) return true;
    try {
      return Date.now() - Number(localStorage.getItem(SEQ_DISPLAY_HB) || 0) > 4000;
    } catch {
      return true;
    }
  };

  const pos = position(seq, now);
  const stages = seq.stages;
  const cur: SeqStage | undefined = stages[pos.idx];
  const started = seq.running || seq.elapsedAt > 0;
  const remainSec = Math.ceil(pos.remainMs / 1000);
  const check = checkTotal(seq);
  const counting = seq.running && seq.alerts.a10 && !!cur && remainSec <= 10 && remainSec >= 1;

  const say = (text: string) => setBubble({ text, id: Date.now() });
  useEffect(() => {
    if (!bubble) return;
    const t = window.setTimeout(() => setBubble(null), 3800);
    return () => clearTimeout(t);
  }, [bubble]);

  // 🔔 알림 · 단계 전환 · 끝
  const fired = useRef<Set<string>>(new Set());
  const lastIdx = useRef<number>(-1);
  const lastElapsed = useRef<number>(0);
  useEffect(() => {
    if (pos.elapsed < lastElapsed.current - 500) fired.current.clear(); // 처음부터 / 이전 단계로 가면 알림 다시
    lastElapsed.current = pos.elapsed;
    if (!seq.running) {
      lastIdx.current = pos.idx;
      return;
    }
    const vol = alertCfg.volume;
    if (pos.idx >= stages.length) {
      seqFinish();
      const k = `done-${seq.anchor}`;
      if (!fired.current.has(k)) {
        fired.current.add(k);
        say('모든 단계 끝! 정말 수고했어요 🎉');
        if (canPlay()) playTimerSound(alertCfg.endSound === 'mute' ? 'fanfare' : alertCfg.endSound, vol, 2);
      }
      return;
    }
    const st = stages[pos.idx];
    if (lastIdx.current >= 0 && pos.idx > lastIdx.current) {
      const k = `start-${st.id}`;
      if (!fired.current.has(k)) {
        fired.current.add(k);
        say(`${st.emoji} ${st.name} 시작이에요!`);
        if (canPlay()) playTimerSound('musicbox', vol);
      }
    } else if (lastIdx.current === -1 || (pos.idx === 0 && pos.inStageMs < 1500)) {
      const k = `start-${st.id}`;
      if (!fired.current.has(k)) {
        fired.current.add(k);
        say(`${st.emoji} ${st.name}부터 시작해요!`);
      }
    }
    lastIdx.current = pos.idx;
    const r = Math.ceil(pos.remainMs / 1000);
    for (const t of [30, 20] as const) {
      const on = t === 30 ? seq.alerts.a30 : seq.alerts.a20;
      const k = `${st.id}-${t}`;
      if (on && r <= t && r > t - 3 && st.sec > t + 2 && !fired.current.has(k)) {
        fired.current.add(k);
        say(`${st.name} ${t}초 남았어요! ${t === 30 ? '마무리를 준비해요 🙂' : '조금만 더 힘내요 💪'}`);
        if (canPlay()) playTimerSound(alertCfg.warnSound === 'mute' ? 'xylo' : alertCfg.warnSound, vol);
      }
    }
    if (seq.alerts.a10 && r >= 1 && r <= 10) {
      const k = `${st.id}-c${r}`;
      if (!fired.current.has(k)) {
        fired.current.add(k);
        if (r === 10) say(`10초 남았어요! 루미랑 같이 세어 봐요 🙌`);
        if (canPlay()) playTimerTick(r <= 3 ? 1 : r, vol);
      }
    }
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // 끝나는 시각 계산의 기준 (지금 시작하면 / 진행 중이면 실제)
  const base = now - pos.elapsed;
  const fitInfo = useMemo(() => remainingClassSec(new Date(now)), [now]);

  const lumiFace: MochiFace = counting ? 'excited' : seq.done ? 'proud' : seq.running ? 'happy' : started ? 'sleepy' : 'normal';
  const progressPct = pos.total > 0 ? Math.min(100, (pos.elapsed / (pos.total * 1000)) * 100) : 0;

  // ── 타임라인 ───────────────────────────────
  const track = (
    <div className="sq-track-wrap">
      <div className="sq-lumi" style={{ left: `${progressPct}%` }} aria-hidden>
        {bubble && (
          <div key={bubble.id} className={`sq-bubble ${progressPct < 18 ? 'is-left' : progressPct > 82 ? 'is-right' : ''}`}>
            {bubble.text}
          </div>
        )}
        {counting && (
          <div key={remainSec} className="sq-count">
            {remainSec}
          </div>
        )}
        <div className={`sq-lumi-body ${seq.running ? 'is-walk' : ''} ${counting ? 'is-hop' : ''}`}>
          <MochiBody face={lumiFace} tint={tint} glow="low" className="w-full h-full" />
        </div>
      </div>
      <div className="sq-track">
        {stages.map((s, i) => {
          const state = seq.done || i < pos.idx ? 'past' : i === pos.idx && started ? 'cur' : 'next';
          const fill = state === 'past' ? 100 : state === 'cur' ? Math.min(100, (pos.inStageMs / (s.sec * 1000)) * 100) : 0;
          return (
            <div key={s.id} className={`sq-seg is-${state}`} style={{ flexGrow: Math.max(1, s.sec), ['--c' as any]: s.color }} title={`${s.name} · ${fmtLen(s.sec)}`}>
              <i style={{ width: `${fill}%` }} />
              <span>
                {s.emoji} {s.name}
              </span>
            </div>
          );
        })}
      </div>
      <div className="sq-ticks">
        <span>{clockAt(base)}</span>
        <span>{started ? `남은 시간 ${fmt(pos.totalRemainMs / 1000)}` : `전체 ${fmtLen(sumSec(seq))}`}</span>
        <span>{clockAt(base + pos.total * 1000)} 끝</span>
      </div>
    </div>
  );

  // ── 지금 단계 ──────────────────────────────
  const next = stages[pos.idx + 1];
  const hero = (
    <div className={`sq-hero ${counting ? 'is-hot' : ''} ${seq.done ? 'is-done' : ''}`} style={{ ['--c' as any]: cur?.color || '#10b981' }}>
      {seq.done ? (
        <div className="sq-hero-done">🎉 모든 단계가 끝났어요! 정말 수고했어요</div>
      ) : (
        <>
          <div className="sq-hero-main">
            <div className="sq-hero-step">
              {started ? `${pos.idx + 1} / ${stages.length} 단계` : '시작 전 · 첫 단계'}
            </div>
            <div className="sq-hero-name">
              <span className="sq-hero-emoji">{cur?.emoji}</span>
              {cur?.name || '단계를 추가해 주세요'}
            </div>
            {cur?.note && <div className="sq-hero-note">{cur.note}</div>}
            {next && (
              <div className="sq-hero-next">
                다음 ▶ {next.emoji} {next.name} · {fmtLen(next.sec)}
              </div>
            )}
          </div>
          <div className="sq-hero-time" data-sq-remain>
            {cur ? fmt(started ? pos.remainMs / 1000 : cur.sec) : '--:--'}
          </div>
        </>
      )}
    </div>
  );

  // ⌨️ Space 단축키: 뽀모도로 타이머가 먼저 받지 않았으면 순서 타이머를 시작/멈춤 (위젯에서만)
  const spaceRef = useRef<() => boolean>(() => false);
  spaceRef.current = () => {
    if (isDisplay || !stages.length) return false;
    if (seq.running) seqPause();
    else seqStart();
    return true;
  };
  useEffect(() => {
    const on = (e: Event) => {
      if (e.defaultPrevented) return;
      if (spaceRef.current()) e.preventDefault();
    };
    window.addEventListener(TIMER_TOGGLE_EVENT, on);
    return () => window.removeEventListener(TIMER_TOGGLE_EVENT, on);
  }, []);

  const controls = (
    <div className="sq-controls">
      <button type="button" className="sq-btn" onClick={seqPrev} disabled={!started || !stages.length} title="이전 단계 (지금 단계를 3초 넘게 했으면 지금 단계 처음으로)">
        ⏮ 이전
      </button>
      {seq.running ? (
        <button type="button" className="sq-btn is-main is-pause" onClick={seqPause} data-sq-pause>
          ⏸ 멈춤
        </button>
      ) : (
        <button type="button" className="sq-btn is-main" onClick={seqStart} disabled={!stages.length} data-sq-start>
          ▶ {seq.done ? '다시 시작' : started ? '계속' : '타이머 시작'}
        </button>
      )}
      <button type="button" className="sq-btn" onClick={seqSkip} disabled={!started || seq.done} title="지금 단계를 끝내고 다음 단계로 (남은 시간은 다음 단계에 더해요)" data-sq-skip>
        ⏭ 다음 단계
      </button>
      <button type="button" className="sq-btn" onClick={seqReset} disabled={!started && !seq.done} title="처음부터">
        🔄 처음부터
      </button>
      {!isDisplay && onOpenDisplay && (
        <button type="button" className="sq-btn" onClick={onOpenDisplay} title="보조 화면(학생 화면)에 크게 띄우기">
          🖥️ 크게
        </button>
      )}
    </div>
  );

  // ── 편집 ───────────────────────────────────
  const targetMin = Math.round((seq.targetSec / 60) * 10) / 10;
  const allPresets = [...presets, ...BUILTIN_PRESETS];
  const editor = (
    <div className="sq-editor">
      <div className="sq-ed-head">
        <input className="sq-title" value={seq.title} onChange={(e) => seqPatch({ title: e.target.value })} placeholder="수업 흐름 이름" aria-label="수업 흐름 이름" />
        <label className="sq-target">
          전체
          <input
            type="number"
            min={1}
            max={300}
            value={targetMin}
            onChange={(e) => seqPatch({ targetSec: Math.max(60, Math.round(Number(e.target.value || 0) * 60)) })}
            aria-label="전체 수업 시간(분)"
            data-sq-target
          />
          분
        </label>
        <span className={`sq-check is-${check.tone}`} data-sq-check>
          {check.tone === 'ok' ? '✅' : check.tone === 'short' ? '⚠️' : '⛔'} {check.text}
        </span>
      </div>

      <div className="sq-ed-tools">
        <div className="sq-pop-wrap">
          <button type="button" className="sq-chip" onClick={() => setPresetOpen((v) => !v)} aria-expanded={presetOpen} data-sq-presets>
            📂 불러오기
          </button>
          {presetOpen && (
            <div className="sq-pop" data-sq-preset-pop>
              {allPresets.map((p) => (
                <div key={p.id} className="sq-pop-item">
                  <button
                    type="button"
                    onClick={() => {
                      loadPreset(p);
                      setPresetOpen(false);
                    }}
                  >
                    <b>{p.name}</b>
                    <small>
                      {p.stages.map((s) => s.name).join(' → ')} · {fmtLen(p.stages.reduce((a, s) => a + s.sec, 0))}
                    </small>
                  </button>
                  {!p.builtin && (
                    <button type="button" className="sq-pop-del" onClick={() => deletePreset(p.id)} title="저장한 흐름 지우기">
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {saveName === null ? (
          <button type="button" className="sq-chip" onClick={() => setSaveName(seq.title)} data-sq-save>
            💾 저장
          </button>
        ) : (
          <span className="sq-save">
            <input value={saveName} autoFocus onChange={(e) => setSaveName(e.target.value)} placeholder="흐름 이름" onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { savePreset(saveName); setSaveName(null); } }} />
            <button type="button" onClick={() => { savePreset(saveName); setSaveName(null); }}>저장</button>
            <button type="button" onClick={() => setSaveName(null)}>취소</button>
          </span>
        )}
        <button
          type="button"
          className="sq-chip"
          disabled={started || !fitInfo || !stages.length}
          onClick={() => fitInfo && seqFitTo(fitInfo.sec)}
          title={started ? '시작 전에만 맞출 수 있어요 (처음부터를 누른 뒤 사용)' : fitInfo ? `${fitInfo.label} ${fmtLen(Math.floor(fitInfo.sec / 10) * 10)}에 맞춰 단계 시간을 비율대로 줄이거나 늘려요` : '시정표를 찾지 못했어요'}
          data-sq-fit
        >
          🔔 남은 수업 시간에 맞추기{fitInfo ? ` (${Math.floor(fitInfo.sec / 60)}분)` : ''}
        </button>
        <span className="sq-alerts">
          알림
          {(
            [
              ['a30', '30초 전'],
              ['a20', '20초 전'],
              ['a10', '10초 카운트다운'],
              ['sound', '🔊 소리'],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" className={`sq-tog ${seq.alerts[k] ? 'is-on' : ''}`} onClick={() => seqPatch({ alerts: { ...seq.alerts, [k]: !seq.alerts[k] } })} aria-pressed={seq.alerts[k]} data-sq-alert={k}>
              {seq.alerts[k] ? '✅' : '⬜'} {label}
            </button>
          ))}
        </span>
      </div>

      <ol className="sq-rows">
        {stages.map((s, i) => {
          const state = seq.done || (started && i < pos.idx) ? 'past' : started && i === pos.idx ? 'cur' : 'next';
          const locked = state === 'past';
          const endAt = base + (pos.starts[i] + s.sec) * 1000;
          const m = Math.floor(s.sec / 60);
          const sc = s.sec % 60;
          const setSec = (v: number) => seqUpdateStage(s.id, { sec: Math.max(MIN_STAGE_SEC, v) });
          return (
            <li key={s.id} className={`sq-row is-${state}`} style={{ ['--c' as any]: s.color }} data-sq-row={i}>
              <button
                type="button"
                className="sq-emoji"
                title="눌러서 그림 · 색 바꾸기"
                onClick={() => {
                  const ei = (SEQ_EMOJIS.indexOf(s.emoji) + 1) % SEQ_EMOJIS.length;
                  const ci = (SEQ_COLORS.indexOf(s.color) + 1) % SEQ_COLORS.length;
                  seqUpdateStage(s.id, { emoji: SEQ_EMOJIS[ei], color: SEQ_COLORS[ci] });
                }}
              >
                {state === 'past' ? '✓' : s.emoji}
              </button>
              <div className="sq-row-main">
                <div className="sq-row-top">
                  <input className="sq-name" value={s.name} onChange={(e) => seqUpdateStage(s.id, { name: e.target.value })} aria-label={`${i + 1}단계 이름`} />
                  <span className="sq-time" title="직접 고치면 이 단계만 바뀌어요">
                    <input type="number" min={0} max={300} value={m} disabled={locked} onChange={(e) => setSec(Math.max(0, Number(e.target.value || 0)) * 60 + sc)} aria-label="분" />
                    분
                    <input type="number" min={0} max={59} step={10} value={sc} disabled={locked} onChange={(e) => setSec(m * 60 + Math.min(59, Math.max(0, Number(e.target.value || 0))))} aria-label="초" />
                    초
                  </span>
                  <span className="sq-endat" title="이 단계가 끝나는 시각">
                    ~{clockAt(endAt)}
                  </span>
                </div>
                <div className="sq-row-bottom">
                  <span className="sq-adj" title={i < stages.length - 1 ? '늘린 만큼 다음 단계가 줄어요' : '마지막 단계: 전체 시간이 바뀌어요'}>
                    {[-60, -10, 10, 60].map((d) => (
                      <button key={d} type="button" disabled={locked} onClick={() => seqAdjust(s.id, d)} className={d < 0 ? 'is-minus' : 'is-plus'} data-sq-adj={`${i}:${d}`}>
                        {d < 0 ? '−' : '+'}
                        {Math.abs(d) >= 60 ? `${Math.abs(d) / 60}분` : `${Math.abs(d)}초`}
                      </button>
                    ))}
                  </span>
                  <input className="sq-note" value={s.note} onChange={(e) => seqUpdateStage(s.id, { note: e.target.value })} placeholder="안내 문구 (예: 모둠별 역할 정하기)" aria-label={`${i + 1}단계 안내 문구`} />
                  <span className="sq-row-tools">
                    <button type="button" onClick={() => seqMoveStage(s.id, -1)} disabled={i === 0 || started} title="위로">
                      ▲
                    </button>
                    <button type="button" onClick={() => seqMoveStage(s.id, 1)} disabled={i === stages.length - 1 || started} title="아래로">
                      ▼
                    </button>
                    <button type="button" onClick={() => seqRemoveStage(s.id)} disabled={started && state !== 'next'} title="단계 지우기">
                      🗑
                    </button>
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <form
        className="sq-add"
        onSubmit={(e) => {
          e.preventDefault();
          const left = seq.targetSec - sumSec(seq);
          const sec = addMin ? Math.round(Number(addMin) * 60) : left > 0 ? left : 300;
          seqAddStage(addName.trim(), sec);
          setAddName('');
          setAddMin('');
        }}
      >
        <input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder={`${stages.length + 1}단계 이름 (예: 정리 단계)`} aria-label="새 단계 이름" data-sq-add-name />
        <input type="number" min={0.5} step={0.5} value={addMin} onChange={(e) => setAddMin(e.target.value)} placeholder={(() => { const l = seq.targetSec - sumSec(seq); return l > 0 ? String(Math.round((l / 60) * 10) / 10) : '5'; })()} aria-label="새 단계 시간(분)" data-sq-add-min />
        <span>분</span>
        <button type="submit" data-sq-add>
          ＋ 단계 추가
        </button>
      </form>
    </div>
  );

  if (isDisplay) {
    return (
      <div className="sq sq--display" data-sq>
        {hero}
        {track}
        {controls}
        <button type="button" className="sq-edit-toggle" onClick={() => setEditOpen((v) => !v)} aria-expanded={editOpen}>
          {editOpen ? '▲ 단계 편집 접기' : '▼ 단계 편집 펼치기'}
        </button>
        {editOpen && editor}
      </div>
    );
  }
  return (
    <div className="sq sq--widget" data-sq>
      {hero}
      {track}
      {controls}
      <button type="button" className="sq-edit-toggle" onClick={() => setEditOpen((v) => !v)} aria-expanded={editOpen}>
        {editOpen ? '▲ 단계 편집 접기' : `✏️ 단계 편집 · ${check.tone === 'ok' ? '✅' : check.tone === 'short' ? '⚠️' : '⛔'} ${check.text}`}
      </button>
      {editOpen && editor}
    </div>
  );
};

export default SequenceTimer;
