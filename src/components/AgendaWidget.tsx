import React, { useState, useMemo } from 'react';
import { Bell, Plus, Trash2, ArrowDown, ArrowUp } from 'lucide-react';
import { AgendaItem, Student } from '../types';
import { findBirthdayKids, type BirthdayKid } from '../utils/celebrate';

interface AgendaWidgetProps {
  agendas: AgendaItem[];
  onToggleAgenda: (id: string) => void;
  onAddAgenda: (text: string) => void;
  onDeleteAgenda: (id: string) => void;
  onShowToast: (msg: string) => void;
  /** 환경설정 학생 명렬표 (생일 기준) */
  students?: Student[];
  /** [축하 파티] → 보조창에서 생일 축하 화면 */
  onCelebrateBirthday?: (kids: BirthdayKid[]) => void;
}

export const AgendaWidget: React.FC<AgendaWidgetProps> = ({
  agendas,
  onToggleAgenda,
  onAddAgenda,
  onDeleteAgenda,
  onShowToast,
  students = [],
  onCelebrateBirthday,
}) => {
  const [newText, setNewText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [hasAlarm, setHasAlarm] = useState(false);
  const [alarmTime, setAlarmTime] = useState('');
  const [alarmErr, setAlarmErr] = useState('');
  const [alarmPeriod, setAlarmPeriod] = useState<'exact' | '30m' | '1h' | '1d'>('exact');
  // 최신순(desc) 또는 오래된순(asc)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // sortOrder에 따른 알림 목록 정렬
  const sortedAgendas = useMemo(() => {
    return [...agendas].sort((a, b) => {
      if (sortOrder === 'desc') {
        return b.id.localeCompare(a.id);
      }
      return a.id.localeCompare(b.id);
    });
  }, [agendas, sortOrder]);

  // 🎂 명렬표 생일 기준 (자정이 지나면 다시 계산)
  const [dayKey, setDayKey] = useState(() => new Date().toDateString());
  React.useEffect(() => {
    const t = window.setInterval(() => setDayKey(new Date().toDateString()), 60 * 1000);
    return () => clearInterval(t);
  }, []);
  const birthdays = useMemo(() => findBirthdayKids(students), [students, dayKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const partyKids = [...birthdays.today, ...birthdays.weekend];
  const nameList = (ks: BirthdayKid[]) => ks.map((k) => `${k.number}번 ${k.name}`).join(', ');

  const handleBirthdayParty = () => {
    if (!partyKids.length) return;
    if (onCelebrateBirthday) onCelebrateBirthday(partyKids);
    else onShowToast('🎂 보조창을 열어 생일 축하 화면을 보여 줄 수 있어요.');
  };

  const submitNewAgenda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    if (hasAlarm && !alarmTime) {
      setAlarmErr('알림 날짜와 시간을 끝까지 골라 주세요 (연 · 월 · 일 · 시간)');
      return;
    }
    setAlarmErr('');

    let noticeText = newText.trim();
    if (hasAlarm && alarmTime) {
      const periodLabel =
        alarmPeriod === '1d'
          ? '1일 전'
          : alarmPeriod === '1h'
          ? '1시간 전'
          : alarmPeriod === '30m'
          ? '30분 전'
          : '정각';
      noticeText += ` ⏰[${alarmTime.replace('T', ' ')} (${periodLabel} 알림)]`;
    }

    onAddAgenda(noticeText);
    setNewText('');
    setHasAlarm(false);
    setAlarmTime('');
    setAlarmPeriod('exact');
    setIsAdding(false);
    onShowToast('📋 새로운 할 일·전달사항 항목이 등록되었습니다.');
  };

  return (
    <section className="w-full h-full p-3 sm:p-3.5 flex flex-col bg-transparent select-none overflow-hidden">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100/80 dark:border-[#1e2c44]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-[#a855f7] flex items-center justify-center font-bold text-xs">
            <Bell className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-sm text-slate-900 dark:text-[#f8fafc] leading-tight">할 일·전달사항</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">학급 주요 전달사항</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 글자와 방향아이콘을 활용한 정렬 토글 */}
          <button
            type="button"
            onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
            className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 flex items-center gap-0.5 cursor-pointer transition select-none"
            title={sortOrder === 'desc' ? '현재: 최신순 (클릭 시 오래된순 정렬)' : '현재: 오래된순 (클릭 시 최신순 정렬)'}
          >
            <span>{sortOrder === 'desc' ? '최신순' : '오래된순'}</span>
            {sortOrder === 'desc' ? (
              <ArrowDown className="w-3 h-3 text-purple-500" />
            ) : (
              <ArrowUp className="w-3 h-3 text-purple-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsAdding(!isAdding)}
            className="px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1 shadow-xs active:scale-95"
            title="새 항목 추가"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>추가</span>
          </button>
        </div>
      </div>

      {/* 🎂 오늘(금요일이면 주말 포함) 생일 친구 — 환경설정 학생 명렬표의 생년월일 기준 */}
      {partyKids.length > 0 ? (
        <div className="my-3 p-3 rounded-2xl bg-gradient-to-r from-rose-50/90 via-pink-50/80 to-amber-50/80 dark:from-[#2e0827]/80 dark:via-[#1c0d24]/80 dark:to-[#1c1328]/80 border border-pink-200/60 dark:border-pink-900/40 flex items-center justify-between gap-2 shadow-xs backdrop-blur-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl animate-bounce shrink-0">🎂</span>
            <div className="min-w-0">
              <div className="text-xs font-black text-rose-950 dark:text-rose-100">
                {birthdays.today.length ? '오늘의 생일 친구!' : '주말 생일 친구! (미리 축하해요)'}
              </div>
              <div className="text-[11px] text-rose-700 dark:text-rose-300 font-semibold truncate">
                {birthdays.today.length ? nameList(birthdays.today) : ''}
                {birthdays.today.length && birthdays.weekend.length ? ' · ' : ''}
                {birthdays.weekend.length ? `주말 ${nameList(birthdays.weekend)}` : ''} 🥳
              </div>
            </div>
          </div>
          <button
            onClick={handleBirthdayParty}
            className="shrink-0 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 dark:bg-[#f43f5e] dark:hover:bg-[#e11d48] text-white rounded-xl text-[10px] font-black shadow-xs transition active:scale-95 cursor-pointer"
            title="보조창(전자칠판)에 생일 축하 화면을 띄워요"
          >
            축하 파티 🎉
          </button>
        </div>
      ) : birthdays.upcoming.length > 0 ? (
        <div className="my-2 px-3 py-1.5 rounded-xl bg-pink-50/60 dark:bg-pink-950/20 border border-pink-100 dark:border-pink-900/30 text-[10.5px] font-bold text-pink-700 dark:text-pink-300 truncate">
          🎈 다가오는 생일: {birthdays.upcoming.slice(0, 3).map((k) => `${k.md} ${k.name}`).join(' · ')}
        </div>
      ) : null}

      {/* Add Input Form with Alarm Option */}
      {isAdding && (
        <form noValidate onSubmit={submitNewAgenda} className="mb-3 p-2.5 rounded-2xl bg-indigo-50/70 dark:bg-[#0c1424] border border-indigo-200/80 dark:border-[#1e2c44] space-y-2">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="새로운 할 일 또는 이벤트 내용 입력..."
            className="w-full text-xs px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-900/60 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-[#151f32] text-slate-800 dark:text-white"
            autoFocus
          />

          <div className="flex items-center justify-between flex-wrap gap-2 text-xs pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 font-bold select-none">
              <input
                type="checkbox"
                checked={hasAlarm}
                onChange={(e) => {
                  setHasAlarm(e.target.checked);
                  // 알림을 켜면 '지금부터 1시간 뒤'를 미리 채워 두기 (연·월·일을 하나씩 입력하다 생기는 오류 방지)
                  if (e.target.checked && !alarmTime) {
                    const d = new Date(Date.now() + 60 * 60 * 1000);
                    d.setMinutes(0, 0, 0);
                    const p2 = (n: number) => String(n).padStart(2, '0');
                    setAlarmTime(`${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:00`);
                  }
                }}
                className="w-3.5 h-3.5 accent-indigo-600 rounded cursor-pointer"
              />
              <span>🔔 알림 받기</span>
            </label>

            {hasAlarm && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <input
                  type="datetime-local" min="2000-01-01T00:00" max="2099-12-31T23:59"
                  value={alarmTime}
                  onChange={(e) => {
                    setAlarmTime(e.target.value);
                    setAlarmErr('');
                  }}
                  className="text-xs px-2 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <select
                  value={alarmPeriod}
                  onChange={(e) => setAlarmPeriod(e.target.value as any)}
                  className="text-xs px-2 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none"
                >
                  <option value="exact">정각 알림</option>
                  <option value="30m">30분 전</option>
                  <option value="1h">1시간 전</option>
                  <option value="1d">1일 전</option>
                </select>
              </div>
            )}
            {alarmErr && <p className="w-full text-[11px] font-bold text-rose-600">⚠️ {alarmErr}</p>}

            <div className="flex items-center gap-1 ml-auto">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-800 text-xs font-bold"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-indigo-700 shadow-xs"
              >
                등록
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Interactive Checklist Items (정렬 반영) */}
      <div className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar">
        {sortedAgendas.map((item) => (
          <div
            key={item.id}
            className="group flex items-center justify-between text-xs text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-[#0c1424]/80 hover:bg-white/90 dark:hover:bg-[#142036] p-2.5 rounded-xl border border-slate-200/50 dark:border-[#1e2c44] transition shadow-2xs backdrop-blur-xs"
          >
            <label className="flex items-center gap-2 cursor-pointer flex-1 select-none">
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => onToggleAgenda(item.id)}
                className="rounded text-purple-600 focus:ring-purple-400 w-3.5 h-3.5 cursor-pointer"
              />
              <span
                className={`${
                  item.completed
                    ? 'line-through text-slate-400 dark:text-slate-500 font-normal'
                    : 'font-bold text-slate-800 dark:text-slate-100'
                }`}
              >
                {item.text}
              </span>
            </label>
            <button
              onClick={() => onDeleteAgenda(item.id)}
              className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition p-1 cursor-pointer"
              title="삭제"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Footer Status (첨부 이미지 1:1 대조) */}
      <div className="pt-2 text-[10px] flex items-center justify-between border-t border-slate-100 dark:border-[#1e2c44] select-none text-slate-400">
        <span className="font-bold text-cyan-600 dark:text-cyan-400">
          미완료 항목 {agendas.filter(a => !a.completed).length}건
        </span>
        <span>자동 저장됨</span>
      </div>

    </section>
  );
};
