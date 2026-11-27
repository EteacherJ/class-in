import { useState } from 'react';
import type { ClassRole, RoleSchedule, RoleWeekDay, Student } from '../types';
import { WEEK_DAYS, birthdayDatesInRange, durationDays, scoreRuleText } from '../utils/roleSchedule';

/**
 * 역할 한 개의 인원(전체 / 남·여 따로) · 검사일(매일 / 요일 / 특별한 날) · 하는 일 설명을 정하는 창
 */
export function RoleEditorPanel({
  initial,
  isNew,
  students,
  periodStart,
  periodDuration,
  onApply,
  onCancel,
}: {
  initial: ClassRole;
  isNew: boolean;
  students: Student[];
  periodStart: string;
  periodDuration: string;
  onApply: (role: ClassRole) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [split, setSplit] = useState<boolean>(Boolean(initial.genderQuota));
  const [total, setTotal] = useState<number>(initial.maxCount || 1);
  const [boys, setBoys] = useState<number>(initial.genderQuota?.M ?? 1);
  const [girls, setGirls] = useState<number>(initial.genderQuota?.F ?? 1);
  const [schedule, setSchedule] = useState<RoleSchedule>(initial.schedule || { type: 'daily' });
  const [newDate, setNewDate] = useState('');
  const [desc, setDesc] = useState(initial.description || '');

  const count = split ? boys + girls : total;
  const days = schedule.days || [];
  const dates = [...(schedule.dates || [])].sort();

  const toggleDay = (d: RoleWeekDay) =>
    setSchedule({ type: 'weekly', days: days.includes(d) ? days.filter((x) => x !== d) : WEEK_DAYS.filter((x) => x === d || days.includes(x)) });
  const addDate = (d: string) => d && setSchedule({ type: 'special', dates: [...new Set([...dates, d])].sort() });
  const fillBirthdays = () => {
    const b = birthdayDatesInRange(students, periodStart, durationDays(periodDuration));
    setSchedule({ type: 'special', dates: [...new Set([...dates, ...b])].sort() });
  };

  const invalid = !title.trim() || count < 1 || (schedule.type === 'weekly' && days.length === 0);

  const apply = () => {
    if (invalid) return;
    onApply({
      ...initial,
      title: title.trim(),
      maxCount: count,
      genderQuota: split ? { M: boys, F: girls } : undefined,
      gender: ['A'],
      schedule,
      isDaily: schedule.type === 'daily',
      specialDays: schedule.type === 'weekly' ? days : [],
      description: desc.trim(),
    });
  };

  const num = (v: number, set: (n: number) => void, label: string, tone: string) => (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-xl border ${tone}`}>
      <span className="text-xs font-black">{label}</span>
      <button type="button" onClick={() => set(Math.max(0, v - 1))} className="w-6 h-6 rounded-lg bg-white/80 font-black text-sm cursor-pointer">−</button>
      <span className="w-5 text-center text-sm font-black tabular-nums">{v}</span>
      <button type="button" onClick={() => set(Math.min(20, v + 1))} className="w-6 h-6 rounded-lg bg-white/80 font-black text-sm cursor-pointer">+</button>
      <span className="text-[11px] font-bold">명</span>
    </div>
  );

  const chip = (on: boolean) =>
    `px-3 py-1.5 rounded-xl text-xs font-black border transition cursor-pointer ${on ? 'bg-pink-500 text-white border-pink-500 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:border-pink-300'}`;

  return (
    <div className="role-editor p-4 rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-pink-50/80 to-white space-y-4 animate-fade-in" data-role-editor>
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-black text-pink-700">{isNew ? '➕ 새 역할 추가' : '✏️ 역할 고치기'}</div>
        <span className="text-[10px] font-bold text-slate-500">{scoreRuleText({ ...initial, schedule } as ClassRole)}</span>
      </div>

      {/* 이름 */}
      <label className="block">
        <span className="block text-[11px] font-black text-slate-600 mb-1">역할 이름</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 분리수거"
          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-pink-300 outline-none"
        />
      </label>

      {/* 인원 */}
      <div>
        <div className="text-[11px] font-black text-slate-600 mb-1.5">인원</div>
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" className={chip(!split)} onClick={() => setSplit(false)}>성별 상관없이</button>
          <button type="button" className={chip(split)} onClick={() => setSplit(true)}>남·여 따로 정하기</button>
          <span className="w-px h-6 bg-slate-200 mx-1" />
          {split ? (
            <>
              {num(boys, setBoys, '👦 남', 'bg-blue-50 border-blue-200 text-blue-800')}
              {num(girls, setGirls, '👧 여', 'bg-pink-50 border-pink-200 text-pink-800')}
              <span className="text-xs font-black text-slate-500">= 모두 {boys + girls}명</span>
            </>
          ) : (
            num(total, setTotal, '👥 전체', 'bg-slate-50 border-slate-200 text-slate-700')
          )}
        </div>
      </div>

      {/* 검사일 */}
      <div>
        <div className="text-[11px] font-black text-slate-600 mb-1.5">검사하는 날</div>
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" className={chip(schedule.type === 'daily')} onClick={() => setSchedule({ type: 'daily' })}>📅 매일</button>
          <button type="button" className={chip(schedule.type === 'weekly')} onClick={() => setSchedule({ type: 'weekly', days: days.length ? days : ['월'] })}>🗓️ 요일 정하기 (주 n회)</button>
          <button type="button" className={chip(schedule.type === 'special')} onClick={() => setSchedule({ type: 'special', dates })}>🎂 특별한 날만</button>
        </div>

        {schedule.type === 'weekly' && (
          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
            {WEEK_DAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                className={`w-10 h-10 rounded-xl text-sm font-black border-2 transition cursor-pointer ${days.includes(d) ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}
              >
                {d}
              </button>
            ))}
            <span className="ml-1 text-xs font-black text-indigo-700">주 {days.length}회</span>
          </div>
        )}

        {schedule.type === 'special' && (
          <div className="mt-2.5 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <input type="date" min="2000-01-01" max="2099-12-31" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold" />
              <button type="button" onClick={() => { addDate(newDate); setNewDate(''); }} className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-black cursor-pointer">날짜 추가</button>
              <button type="button" onClick={fillBirthdays} className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-800 text-xs font-black cursor-pointer" title="환경설정 명렬표의 생일 중 이번 활동 기간에 있는 날을 넣어요">
                🎂 명렬표 생일로 채우기
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-[30px]">
              {dates.length === 0 ? (
                <span className="text-[11px] text-slate-400 font-bold">검사할 날짜를 추가해 주세요. 이 날에만 평가해요.</span>
              ) : (
                dates.map((d) => (
                  <span key={d} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-black">
                    {Number(d.slice(5, 7))}/{Number(d.slice(8, 10))}
                    <button type="button" className="text-amber-500 hover:text-rose-600 cursor-pointer" onClick={() => setSchedule({ type: 'special', dates: dates.filter((x) => x !== d) })}>×</button>
                  </span>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 설명 */}
      <label className="block">
        <span className="block text-[11px] font-black text-slate-600 mb-1">하는 일 설명 <span className="text-slate-400 font-bold">(인쇄한 역할표에 그대로 나와요)</span></span>
        <textarea
          rows={2}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="예: 점심시간이 끝나면 분리수거함을 확인하고, 가득 찬 칸은 정리해서 비워요."
          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-pink-300 outline-none resize-none"
        />
      </label>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-black cursor-pointer">취소</button>
        <button type="button" onClick={apply} disabled={invalid} className="px-5 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-black shadow-xs cursor-pointer disabled:opacity-40">
          {isNew ? '목록에 추가' : '반영하기'}
        </button>
      </div>
    </div>
  );
}

export default RoleEditorPanel;
