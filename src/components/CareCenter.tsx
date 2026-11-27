/**
 * 🌱 Class in 돌봄 센터
 *  1) 처음 실행 3단계 설정 (학급 정보 → 시정표 → 화면 사용 방식)
 *  2) 새 학기 준비 / 학기말 정리 마법사 (백업 먼저 → 고른 항목만 정리)
 *  3) 주간 백업 알림 (마지막 백업 7일 경과 시) · 학기말(2월·7월 하순) 정리 알림
 *
 *  ※ 입력칸은 모두 비어 있는 상태로 시작합니다. (다른 선생님이 써도 개인정보가 보이지 않도록)
 */
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, ShieldCheck, Sparkles } from 'lucide-react';
import type { BellScheduleItem, ClassConfig } from '../types';
import { exportDashboardBackupFile } from '../utils/cloudSync';

const ONBOARD_KEY = 'classin_onboarded_v1';
const BACKUP_AT = 'last_full_backup_at';
const FIRST_RUN_AT = 'classin_first_run_at';
const BACKUP_SNOOZE = 'backup_reminder_snooze_until';
const DAY = 86_400_000;

// 앱이 설정을 처음 저장하기 전에(모듈 로드 시점) 첫 실행 여부를 판단해 둡니다.
try {
  if (!localStorage.getItem(ONBOARD_KEY)) {
    localStorage.setItem(ONBOARD_KEY, localStorage.getItem('class_dashboard_config') ? 'existing' : 'pending');
  }
} catch { /* 무시 */ }

interface Props {
  config: ClassConfig;
  onApplyConfig: (patch: Partial<ClassConfig>) => void;
  onShowToast: (msg: string) => void;
  /** 인트로·잠금 화면이 떠 있는 동안 true (안내·알림을 잠시 미뤄요) */
  blocked?: boolean;
}

function buildBells(start: string, periods: number, len: number, brk: number, lunchAfter: number, lunchLen: number): BellScheduleItem[] {
  const [h, m] = start.split(':').map(Number);
  let t = (h || 9) * 60 + (m || 0);
  const fmt = (x: number) => `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
  const out: BellScheduleItem[] = [];
  for (let p = 1; p <= periods; p++) {
    const gap = p === lunchAfter ? lunchLen : brk;
    out.push({ period: p, start: fmt(t), end: fmt(t + len), breakMinutes: gap, enabled: true });
    t += len + gap;
  }
  return out;
}

type Step = 0 | 1 | 2;

export const CareCenter: React.FC<Props> = ({ config, onApplyConfig, onShowToast, blocked = false }) => {
  const blockedRef = React.useRef(blocked);
  blockedRef.current = blocked;
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [semesterOpen, setSemesterOpen] = useState(false);
  const [reminder, setReminder] = useState<null | { kind: 'backup' | 'semester'; days?: number }>(null);

  // ── 처음 실행 판단: 저장된 설정이 없으면 안내 (기존 사용자는 조용히 건너뜀)
  useEffect(() => {
    try {
      if (!localStorage.getItem(FIRST_RUN_AT)) localStorage.setItem(FIRST_RUN_AT, String(Date.now()));
      if (localStorage.getItem(ONBOARD_KEY) !== 'pending') return;
      // 잠금 화면이 풀린 뒤에 안내를 띄워요
      const locked = () => blockedRef.current;
      let shownAt = 0;
      const t = window.setInterval(() => {
        if (locked()) { shownAt = 0; return; }
        shownAt += 1;
        if (shownAt >= 2) { setOnboardOpen(true); window.clearInterval(t); }
      }, 700);
      return () => window.clearInterval(t);
    } catch { /* 무시 */ }
  }, []);

  useEffect(() => {
    const a = () => setOnboardOpen(true);
    const b = () => setSemesterOpen(true);
    const c = () => { void doBackup(); };
    window.addEventListener('classin:open-onboarding', a);
    window.addEventListener('classin:open-semester-wizard', b);
    window.addEventListener('classin:open-backup', c);
    return () => {
      window.removeEventListener('classin:open-onboarding', a);
      window.removeEventListener('classin:open-semester-wizard', b);
      window.removeEventListener('classin:open-backup', c);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 주간 백업 / 학기말 알림 (1시간마다 확인)
  useEffect(() => {
    const check = () => {
      try {
        const now = Date.now();
        const snooze = Number(localStorage.getItem(BACKUP_SNOOZE) || 0);
        if (snooze > now) return;
        const d = new Date();
        const seasonKey = `semester_prompt_${d.getFullYear()}_${d.getMonth() + 1}`;
        if ((d.getMonth() === 1 || d.getMonth() === 6) && d.getDate() >= 15 && !localStorage.getItem(seasonKey)) {
          setReminder({ kind: 'semester' });
          return;
        }
        const last = Number(localStorage.getItem(BACKUP_AT) || 0);
        const first = Number(localStorage.getItem(FIRST_RUN_AT) || now);
        const since = last || first;
        if (now - since >= 7 * DAY) setReminder({ kind: 'backup', days: last ? Math.floor((now - last) / DAY) : undefined });
      } catch { /* 무시 */ }
    };
    const t0 = window.setTimeout(check, 8000);
    const t = window.setInterval(check, 3_600_000);
    return () => { window.clearTimeout(t0); window.clearInterval(t); };
  }, []);

  const doBackup = async () => {
    const ok = await exportDashboardBackupFile();
    onShowToast(ok ? '💾 학급 백업 파일을 저장했어요. (학생 정보가 있으니 안전한 곳에 보관해 주세요)' : '🔴 백업 파일을 만들지 못했어요.');
    if (ok) setReminder((r) => (r?.kind === 'backup' ? null : r));
    return ok;
  };

  const snooze = (days: number) => {
    try { localStorage.setItem(BACKUP_SNOOZE, String(Date.now() + days * DAY)); } catch { /* 무시 */ }
    if (reminder?.kind === 'semester') {
      const d = new Date();
      try { localStorage.setItem(`semester_prompt_${d.getFullYear()}_${d.getMonth() + 1}`, '1'); } catch { /* 무시 */ }
    }
    setReminder(null);
  };

  return createPortal(
    <>
      {onboardOpen && <Onboarding config={config} onClose={() => { setOnboardOpen(false); try { localStorage.setItem(ONBOARD_KEY, 'done'); } catch { /* 무시 */ } }} onApply={onApplyConfig} onShowToast={onShowToast} />}
      {semesterOpen && <SemesterWizard onClose={() => setSemesterOpen(false)} onBackup={doBackup} onShowToast={onShowToast} onApplyConfig={onApplyConfig} />}
      {reminder && !blocked && !onboardOpen && !semesterOpen && (
        <div className="care-card fixed right-5 bottom-28 z-[9400] w-[320px] rounded-3xl p-4 bg-white/95 dark:bg-[#0f172a]/95 border border-slate-200/80 dark:border-white/10 shadow-2xl backdrop-blur-xl" role="status">
          <button type="button" onClick={() => snooze(2)} className="absolute top-3 right-3 w-8 h-8 grid place-items-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10" aria-label="닫기"><X className="w-4 h-4" /></button>
          {reminder.kind === 'backup' ? (
            <>
              <div className="text-2xl mb-1">💾</div>
              <p className="text-sm font-black text-slate-800 dark:text-slate-100">백업한 지 {reminder.days ? `${reminder.days}일` : '꽤'} 지났어요</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">출결·칭찬·관찰 기록을 지키려면 일주일에 한 번 백업해 두는 게 좋아요.</p>
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={() => void doBackup()} className="flex-1 min-h-[44px] rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black">지금 백업하기</button>
                <button type="button" onClick={() => snooze(3)} className="min-h-[44px] px-3 rounded-2xl bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 text-xs font-bold">3일 뒤에</button>
              </div>
            </>
          ) : (
            <>
              <div className="text-2xl mb-1">🌱</div>
              <p className="text-sm font-black text-slate-800 dark:text-slate-100">학기가 곧 끝나요</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">백업을 먼저 하고, 칭찬 점수·지난 일정·메모처럼 정리할 것만 골라 새 학기를 준비해 보세요.</p>
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={() => { snooze(0); setSemesterOpen(true); }} className="flex-1 min-h-[44px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black">학기말 정리 열기</button>
                <button type="button" onClick={() => snooze(7)} className="min-h-[44px] px-3 rounded-2xl bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 text-xs font-bold">나중에</button>
              </div>
            </>
          )}
        </div>
      )}
    </>,
    document.body,
  );
};

/* ───────────────────────── 처음 실행 3단계 ───────────────────────── */
const Onboarding: React.FC<{ config: ClassConfig; onClose: () => void; onApply: (p: Partial<ClassConfig>) => void; onShowToast: (m: string) => void }> = ({ config, onClose, onApply, onShowToast }) => {
  const [step, setStep] = useState<Step>(0);
  const [grade, setGrade] = useState('');
  const [classNum, setClassNum] = useState('');
  const [total, setTotal] = useState('');
  const [teacher, setTeacher] = useState('');
  const [start, setStart] = useState('09:00');
  const [periods, setPeriods] = useState(6);
  const [len, setLen] = useState(40);
  const [brk, setBrk] = useState(10);
  const [lunchAfter, setLunchAfter] = useState(4);
  const [lunchLen, setLunchLen] = useState(50);
  const [autoMode, setAutoMode] = useState(false);
  const bells = buildBells(start, periods, len, brk, lunchAfter, lunchLen);

  const finish = () => {
    const patch: Partial<ClassConfig> = { bellSchedule: bells, lunchAfterPeriod: lunchAfter === 3 ? 3 : 4 };
    const g = parseInt(grade, 10); const c = parseInt(classNum, 10); const t = parseInt(total, 10);
    if (g > 0) patch.grade = g;
    if (c > 0) patch.classNum = c;
    if (t > 0) patch.totalStudents = t;
    if (teacher.trim()) patch.teacherName = teacher.trim();
    onApply(patch);
    try { localStorage.setItem('auto_mode_switch_v1', autoMode ? 'on' : 'off'); } catch { /* 무시 */ }
    window.dispatchEvent(new Event('classin:auto-mode-changed'));
    onShowToast('🎉 준비 완료! 언제든 Ctrl(⌘)+K 로 원하는 기능을 바로 찾을 수 있어요.');
    onClose();
  };

  const field = 'w-full min-h-[44px] px-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-400 focus:outline-none';
  const titles = ['우리 반 알려 주기', '하루 시정표', '화면 사용 방식'];
  return (
    <div className="fixed inset-0 z-[9700] grid place-items-center p-4 bg-slate-950/50 backdrop-blur-sm">
      <div className="care-panel w-full max-w-[520px] rounded-[28px] bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden" data-onboarding>
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-indigo-500 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> 처음 시작하기 {step + 1}/3</span>
            <button type="button" onClick={onClose} className="text-[11px] font-bold text-slate-400 hover:text-slate-600 min-h-[32px]">건너뛰기</button>
          </div>
          <div className="flex gap-1.5 mt-3">{[0, 1, 2].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-white/10'}`} />)}</div>
          <h2 className="text-lg font-black text-slate-800 dark:text-white mt-4">{titles[step]}</h2>
        </div>
        <div className="px-6 pb-2 min-h-[230px]">
          {step === 0 && (
            <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
              <label>학년<input inputMode="numeric" value={grade} onChange={(e) => setGrade(e.target.value.replace(/\D/g, ''))} placeholder="예: 3" className={field + ' mt-1'} /></label>
              <label>반<input inputMode="numeric" value={classNum} onChange={(e) => setClassNum(e.target.value.replace(/\D/g, ''))} placeholder="예: 1" className={field + ' mt-1'} /></label>
              <label>학생 수<input inputMode="numeric" value={total} onChange={(e) => setTotal(e.target.value.replace(/\D/g, ''))} placeholder="예: 24" className={field + ' mt-1'} /></label>
              <label>화면에 보일 선생님 호칭<input value={teacher} onChange={(e) => setTeacher(e.target.value)} placeholder="예: 담임 선생님" className={field + ' mt-1'} /></label>
              <p className="col-span-2 text-[11px] font-medium text-slate-400 leading-relaxed">모두 나중에 환경설정에서 바꿀 수 있어요. 비워 두면 지금 설정을 그대로 써요.</p>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-3 text-xs font-bold text-slate-600 dark:text-slate-300">
              <div className="grid grid-cols-3 gap-2">
                <label>1교시 시작<input type="time" value={start} onChange={(e) => setStart(e.target.value || '09:00')} className={field + ' mt-1'} /></label>
                <label>수업(분)<input type="number" min={20} max={60} value={len} onChange={(e) => setLen(Math.max(20, Math.min(60, Number(e.target.value) || 40)))} className={field + ' mt-1'} /></label>
                <label>쉬는 시간(분)<input type="number" min={0} max={30} value={brk} onChange={(e) => setBrk(Math.max(0, Math.min(30, Number(e.target.value) || 0)))} className={field + ' mt-1'} /></label>
                <label>교시 수<input type="number" min={3} max={8} value={periods} onChange={(e) => setPeriods(Math.max(3, Math.min(8, Number(e.target.value) || 6)))} className={field + ' mt-1'} /></label>
                <label>점심 (몇 교시 뒤)<input type="number" min={2} max={periods - 1} value={lunchAfter} onChange={(e) => setLunchAfter(Math.max(2, Math.min(periods - 1, Number(e.target.value) || 4)))} className={field + ' mt-1'} /></label>
                <label>점심(분)<input type="number" min={30} max={90} value={lunchLen} onChange={(e) => setLunchLen(Math.max(30, Math.min(90, Number(e.target.value) || 50)))} className={field + ' mt-1'} /></label>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {bells.map((b) => <span key={b.period} className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-200 text-[10px] font-black">{b.period}교시 {b.start}~{b.end}</span>)}
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-2.5">
              <button type="button" onClick={() => setAutoMode((v) => !v)} aria-pressed={autoMode} className={`w-full flex items-center gap-3 p-3.5 min-h-[56px] rounded-2xl border text-left transition ${autoMode ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-200 dark:border-white/10'}`}>
                <span className="text-xl">⏰</span>
                <span className="flex-1"><span className="block text-sm font-black text-slate-800 dark:text-slate-100">시정표 따라 화면 자동 전환</span><span className="block text-[11px] text-slate-500">수업 → 쉬는 시간 → 하교 → 업무 화면이 저절로 바뀌어요</span></span>
                <span className={`w-6 h-6 rounded-full grid place-items-center ${autoMode ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-white/10'}`}>{autoMode && <Check className="w-4 h-4" />}</span>
              </button>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed">
                <p className="font-black text-slate-800 dark:text-slate-100 mb-1">알아 두면 편해요</p>
                <p>⌨️ <b>Ctrl(⌘)+K</b> — 위젯·바로가기·화면 모드를 이름으로 찾아 실행</p>
                <p>⋯ 독 오른쪽 <b>더보기</b> — 자주 쓰는 버튼만 독에 고정</p>
                <p>📌 헤더의 <b>이번 주</b> — 오늘~이번 주 일정과 D-day 모아보기</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-white/10">
          <button type="button" disabled={step === 0} onClick={() => setStep((s) => (s - 1) as Step)} className="min-h-[44px] px-4 rounded-2xl text-xs font-bold text-slate-500 disabled:opacity-30">이전</button>
          {step < 2
            ? <button type="button" onClick={() => setStep((s) => (s + 1) as Step)} className="min-h-[44px] px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black">다음</button>
            : <button type="button" onClick={finish} className="min-h-[44px] px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black">시작하기</button>}
        </div>
      </div>
    </div>
  );
};

/* ───────────────────────── 새 학기 / 학기말 정리 ───────────────────────── */
interface CleanItem { id: string; label: string; desc: string; run: () => void }
const readJSON = (k: string) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const todayYmd = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

const CLEAN_ITEMS: CleanItem[] = [
  { id: 'praise', label: '칭찬 점수 · 뽑기 횟수 0으로', desc: '학생 명단은 그대로, 점수와 기록만 비워요', run: () => {
    const st = readJSON('class_dashboard_students');
    if (Array.isArray(st)) localStorage.setItem('class_dashboard_students', JSON.stringify(st.map((s: any) => ({ ...s, praisePoints: 0, selectedCount: 0 }))));
    localStorage.removeItem('class_dashboard_praise_logs');
  } },
  { id: 'events', label: '지난 일정 · 지난 D-day 지우기', desc: '오늘 이후 일정은 남겨요', run: () => {
    const t = todayYmd();
    const ev = readJSON('class_calendar_events');
    if (Array.isArray(ev)) localStorage.setItem('class_calendar_events', JSON.stringify(ev.filter((e: any) => String(e?.endDate || e?.date || '').slice(0, 10) >= t)));
    const dd = readJSON('class_dday_items');
    if (Array.isArray(dd)) localStorage.setItem('class_dday_items', JSON.stringify(dd.filter((d: any) => String(d?.targetDate || '').slice(0, 10) >= t)));
  } },
  { id: 'memos', label: '메모 · 포스트잇 비우기', desc: '포스트잇, 업무 메모, 시간표 메모', run: () => {
    ['class_dashboard_postits', 'class_work_memos', 'class_timetable_memo'].forEach((k) => localStorage.removeItem(k));
  } },
  { id: 'observe', label: '관찰 기록 비우기', desc: '구글 시트로 보낸 기록은 그대로 남아요', run: () => {
    localStorage.removeItem('class_dashboard_observation_records');
  } },
  { id: 'roles', label: '1인 1역 체크 기록 비우기', desc: '역할 목록은 남기고 날짜별 체크만 지워요', run: () => {
    ['class_roles_daily_checks', 'class_roles_period_status', 'class_roles_period_feedback'].forEach((k) => localStorage.removeItem(k));
  } },
];

const SemesterWizard: React.FC<{ onClose: () => void; onBackup: () => Promise<boolean>; onShowToast: (m: string) => void; onApplyConfig: (p: Partial<ClassConfig>) => void }> = ({ onClose, onBackup, onShowToast }) => {
  const [backedUp, setBackedUp] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [confirmText, setConfirmText] = useState('');
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const canRun = backedUp && picked.length > 0 && confirmText.trim() === '정리';

  const run = () => {
    if (!canRun) return;
    try {
      CLEAN_ITEMS.filter((c) => picked.includes(c.id)).forEach((c) => c.run());
      onShowToast('🌱 정리를 마쳤어요. 새 화면으로 다시 불러올게요.');
      window.setTimeout(() => window.location.reload(), 900);
    } catch {
      onShowToast('🔴 정리 중 문제가 생겼어요. 백업 파일로 언제든 되돌릴 수 있어요.');
    }
  };

  return (
    <div className="fixed inset-0 z-[9700] grid place-items-center p-4 bg-slate-950/50 backdrop-blur-sm">
      <div className="care-panel w-full max-w-[520px] rounded-[28px] bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden" data-semester-wizard>
        <div className="flex items-center justify-between px-6 pt-6">
          <h2 className="text-lg font-black text-slate-800 dark:text-white">🌱 새 학기 준비 · 학기말 정리</h2>
          <button type="button" onClick={onClose} className="w-9 h-9 grid place-items-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10" aria-label="닫기"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className={`p-4 rounded-2xl border ${backedUp ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10' : 'border-amber-300 bg-amber-50 dark:bg-amber-500/10'}`}>
            <p className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> 1단계 · 먼저 백업하기 (꼭!)</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">정리한 내용은 백업 파일로만 되돌릴 수 있어요.</p>
            <button type="button" onClick={async () => { if (await onBackup()) setBackedUp(true); }} className={`mt-2.5 w-full min-h-[44px] rounded-2xl text-xs font-black text-white ${backedUp ? 'bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600'}`}>
              {backedUp ? '✓ 백업 완료' : '💾 지금 백업 파일 만들기'}
            </button>
          </div>
          <div className={backedUp ? '' : 'opacity-40 pointer-events-none'}>
            <p className="text-xs font-black text-slate-800 dark:text-slate-100 mb-2">2단계 · 정리할 것만 고르기</p>
            <div className="space-y-1.5">
              {CLEAN_ITEMS.map((c) => {
                const on = picked.includes(c.id);
                return (
                  <button key={c.id} type="button" onClick={() => toggle(c.id)} aria-pressed={on} className={`w-full flex items-center gap-3 p-3 min-h-[52px] rounded-2xl border text-left transition ${on ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-white/10 hover:border-slate-300'}`}>
                    <span className={`w-5 h-5 rounded-md grid place-items-center shrink-0 ${on ? 'bg-indigo-600 text-white' : 'border border-slate-300 dark:border-slate-600'}`}>{on && <Check className="w-3.5 h-3.5" />}</span>
                    <span><span className="block text-xs font-bold text-slate-800 dark:text-slate-100">{c.label}</span><span className="block text-[10px] text-slate-400">{c.desc}</span></span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3">학년·반, 학생 명단, 시정표는 <b>환경설정</b>에서 바꿔 주세요.</p>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-3">3단계 · 확인을 위해 <b className="text-rose-500">정리</b> 라고 입력
              <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="정리" className="mt-1 w-full min-h-[44px] px-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-rose-300 focus:outline-none" />
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-white/10">
          <button type="button" onClick={onClose} className="min-h-[44px] px-4 rounded-2xl text-xs font-bold text-slate-500">닫기</button>
          <button type="button" disabled={!canRun} onClick={run} className="min-h-[44px] px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white text-xs font-black">고른 항목 정리하기</button>
        </div>
      </div>
    </div>
  );
};

export default CareCenter;
