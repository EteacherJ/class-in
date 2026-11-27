import React, { useEffect, useMemo, useState } from 'react';
import type { ClassConfig } from '../types';
import { calcSchoolDays, pastSchoolDays, readStars, setupStars, type SchoolDayInputs } from '../utils/schoolDays';

/**
 * 🌇 환경설정 · 퇴근 장면 카드
 * - 퇴근 애니메이션 켜기/끄기 · 퇴근 30분 전 노을 배경 켜기/끄기 (+ 미리보기)
 * - 수업일수 계산 → 선생님 확인 → 퇴근할 때마다 별이 하나씩 켜져요
 */
const Switch: React.FC<{ on: boolean; onChange: (v: boolean) => void; label: string }> = ({ on, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    onClick={() => onChange(!on)}
    className={`relative w-11 h-6 rounded-full transition shrink-0 cursor-pointer ${on ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-600'}`}
  >
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
  </button>
);

export const LeaveWorkSettingsCard: React.FC<{
  config: ClassConfig;
  setConfig: (c: ClassConfig) => void;
  commit: (c: ClassConfig) => void;
  onShowToast?: (m: string) => void;
}> = ({ config, setConfig, commit, onShowToast }) => {
  const inputs: SchoolDayInputs = {
    s1Start: config.semester1StartDate || '2026-03-02',
    summerStart: config.summerVacationDate || '2026-07-20',
    s2Start: config.semester2StartDate || '2026-08-17',
    winterStart: config.winterVacationDate || '2026-12-24',
    off: config.schoolDaysOff || 0,
    extra: config.schoolDaysExtra || 0,
  };
  const calc = useMemo(() => calcSchoolDays(inputs), [inputs.s1Start, inputs.summerStart, inputs.s2Start, inputs.winterStart, inputs.off, inputs.extra]); // eslint-disable-line react-hooks/exhaustive-deps
  const confirmed = config.schoolDaysConfirmed;
  const isConfirmed = !!confirmed && confirmed.sig === calc.sig && confirmed.total === calc.total;
  const [askPrefill, setAskPrefill] = useState<null | { total: number; sig: string; past: string[] }>(null);
  const [stars, setStars] = useState(readStars());
  useEffect(() => {
    const on = () => setStars(readStars());
    window.addEventListener('classin-stars-changed', on);
    return () => window.removeEventListener('classin-stars-changed', on);
  }, []);
  const animOn = config.enableLeaveWorkAlert !== false;
  const duskOn = config.enableDuskBackground !== false;
  const set = (patch: Partial<ClassConfig>) => setConfig({ ...config, ...patch });

  const dateBox = (label: string, key: 'semester1StartDate' | 'summerVacationDate' | 'semester2StartDate' | 'winterVacationDate', val: string, isNew?: boolean) => (
    <label className="flex flex-col gap-1">
      <span className="text-[10.5px] font-black text-slate-500 dark:text-slate-400">
        {label} {isNew && <span className="text-orange-500">새 칸</span>}
      </span>
      <input
        type="date" min="2000-01-01" max="2099-12-31"
        value={val}
        data-sd-input={key}
        onChange={(e) => set({ [key]: e.target.value } as any)}
        className={`px-2.5 py-1.5 rounded-xl border bg-white dark:bg-slate-900 text-[12px] font-bold text-slate-800 dark:text-slate-100 focus:outline-none ${isNew ? 'border-orange-300' : 'border-slate-200 dark:border-slate-700'}`}
      />
    </label>
  );

  return (
    <div className="p-4 rounded-2xl border border-orange-200/80 dark:border-orange-900/50 bg-gradient-to-br from-orange-50/80 to-rose-50/60 dark:from-orange-950/30 dark:to-rose-950/20 space-y-3 text-xs" data-leave-settings>
      <div className="flex items-center justify-between">
        <span className="font-black text-slate-800 dark:text-slate-100 text-[13px]">🌇 퇴근 장면 · 수업일수 별</span>
        <span className="text-[10.5px] text-slate-500 dark:text-slate-400">퇴근 시간 {config.workEndTime || '16:30'} 기준</span>
      </div>

      {/* 켜기/끄기 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700">
          <Switch
            on={animOn}
            label="퇴근 애니메이션"
            onChange={(v) => {
              set({ enableLeaveWorkAlert: v });
              try {
                localStorage.setItem('enableLeaveWorkAlert', String(v));
              } catch {}
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="font-black text-slate-800 dark:text-slate-100">퇴근 애니메이션</div>
            <div className="text-[10.5px] text-slate-500">수채화 장면 → Class out → 오늘의 별 → 응원 한마디</div>
          </div>
          <button type="button" data-leave-preview onClick={() => window.dispatchEvent(new CustomEvent('classin-leave-scene'))} className="px-2 py-1 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-700 text-[10.5px] font-black cursor-pointer shrink-0">
            ▶ 미리보기
          </button>
        </div>
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700">
          <Switch on={duskOn} label="퇴근 30분 전 노을 배경" onChange={(v) => set({ enableDuskBackground: v })} />
          <div className="flex-1 min-w-0">
            <div className="font-black text-slate-800 dark:text-slate-100">퇴근 30분 전 노을 배경</div>
            <div className="text-[10.5px] text-slate-500">헤더 날씨 연동 · 비 오면 비, 눈 오면 눈</div>
          </div>
          <div className="flex gap-1 shrink-0">
            {(
              [
                ['sun', '🌇'],
                ['rain', '🌧'],
                ['snow', '❄️'],
              ] as const
            ).map(([w, ic]) => (
              <button
                key={w}
                type="button"
                title={`${w === 'sun' ? '노을' : w === 'rain' ? '비' : '눈'} 미리보기 (8초)`}
                data-dusk-preview={w}
                onClick={() => window.dispatchEvent(new CustomEvent('classin-dusk-preview', { detail: { wx: w, ms: 8000 } }))}
                className="w-7 h-7 rounded-lg bg-orange-100 hover:bg-orange-200 text-[13px] cursor-pointer"
              >
                {ic}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 수업일수 */}
      <div className="p-3 rounded-xl bg-white/85 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700 space-y-2.5">
        <div className="font-black text-slate-800 dark:text-slate-100">⭐ 수업일수 (퇴근할 때마다 별이 하나씩 켜져요)</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {dateBox('1학기 개학일', 'semester1StartDate', inputs.s1Start!, !config.semester1StartDate)}
          {dateBox('여름방학 시작', 'summerVacationDate', inputs.summerStart!)}
          {dateBox('2학기 개학일', 'semester2StartDate', inputs.s2Start!, !config.semester2StartDate)}
          {dateBox('겨울방학(종업) 시작', 'winterVacationDate', inputs.winterStart!)}
        </div>
        {calc.valid ? (
          <div className="rounded-xl bg-orange-50/80 dark:bg-slate-800/70 px-3 py-2 leading-7 font-bold text-slate-700 dark:text-slate-200" data-sd-calc>
            <div className="flex justify-between"><span>학기 중 평일 (월~금)</span><b className="tabular-nums">{calc.weekdays}일</b></div>
            <div className="flex justify-between" title={calc.holidayNames.join(', ')}><span>− 공휴일 · 대체공휴일 (자동)</span><b className="tabular-nums">{calc.holidays}일</b></div>
            <div className="flex justify-between items-center">
              <span>− 재량휴업일 · 개교기념일 (직접)</span>
              <span className="flex items-center gap-1">
                <input type="number" min={0} max={60} value={inputs.off} data-sd-off onChange={(e) => set({ schoolDaysOff: Math.max(0, Number(e.target.value) || 0) })} className="w-14 px-1.5 py-0.5 rounded-lg border border-orange-300 text-center font-black bg-white dark:bg-slate-900" />일
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>+ 방학 뒤 2월 등교 등 (직접)</span>
              <span className="flex items-center gap-1">
                <input type="number" min={0} max={60} value={inputs.extra} data-sd-extra onChange={(e) => set({ schoolDaysExtra: Math.max(0, Number(e.target.value) || 0) })} className="w-14 px-1.5 py-0.5 rounded-lg border border-orange-300 text-center font-black bg-white dark:bg-slate-900" />일
              </span>
            </div>
            <div className="flex justify-between border-t border-dashed border-orange-300 mt-1 pt-1 text-[14px] text-orange-700 dark:text-orange-300">
              <span className="font-black">수업일수</span>
              <b className="tabular-nums" data-sd-total>{calc.total}일</b>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-rose-50 text-rose-700 px-3 py-2 font-bold">⚠️ {calc.problem}</div>
        )}

        {calc.valid && !isConfirmed && !askPrefill && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex-1 min-w-[180px] text-[11px] text-slate-600 dark:text-slate-300 font-bold">
              {confirmed ? '🔁 날짜나 일수가 바뀌었어요. 다시 확인해 주세요.' : '학교 학사일정표의 수업일수와 같은가요? 확인해야 별이 만들어져요.'}
            </span>
            <button
              type="button"
              data-sd-confirm
              onClick={() => {
                const past = pastSchoolDays(inputs);
                setAskPrefill({ total: calc.total, sig: calc.sig, past });
              }}
              className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black cursor-pointer"
            >
              ✓ {calc.total}일이 맞아요
            </button>
          </div>
        )}
        {askPrefill && (
          <div className="flex items-center gap-2 flex-wrap p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200">
            <span className="flex-1 min-w-[180px] text-[11px] font-bold text-amber-800 dark:text-amber-200">
              이미 지난 수업일 <b>{Math.min(askPrefill.past.length, askPrefill.total)}일</b>만큼 별을 미리 켜 둘까요?
            </span>
            {(
              [
                ['켜 두기', true],
                ['처음부터 0개', false],
              ] as const
            ).map(([label, fill]) => (
              <button
                key={label}
                type="button"
                data-sd-prefill={fill ? 'yes' : 'no'}
                onClick={() => {
                  setupStars(askPrefill.total, askPrefill.sig, fill ? askPrefill.past : []);
                  const updated = { ...config, schoolDaysConfirmed: { total: askPrefill.total, sig: askPrefill.sig, at: new Date().toISOString() } };
                  commit(updated);
                  setAskPrefill(null);
                  onShowToast?.(`⭐ 수업일수 ${askPrefill.total}일을 확인했어요. 퇴근할 때마다 별이 하나씩 켜져요!`);
                }}
                className={`px-3 py-1.5 rounded-xl font-black cursor-pointer ${fill ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-100'}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {isConfirmed && (
          <div className="flex items-center justify-between gap-2 text-[11px] font-black text-emerald-700 dark:text-emerald-300" data-sd-ok>
            <span>✅ 확인 완료 · 수업일수 {confirmed!.total}일 · 별 {stars && stars.sig === confirmed!.sig ? stars.lit.length : 0}개 켜짐</span>
            <button type="button" onClick={() => setConfig({ ...config, schoolDaysConfirmed: null })} className="text-slate-500 underline cursor-pointer">다시 확인하기</button>
          </div>
        )}
      </div>
    </div>
  );
};
export default LeaveWorkSettingsCard;
