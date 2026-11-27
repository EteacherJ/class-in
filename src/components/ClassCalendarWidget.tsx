import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Circle,
  Filter,
  Upload,
  ArrowDown,
  ArrowUp,
  Settings2,
  Copy,
  Link2,
  X,
} from 'lucide-react';
import { GoogleTaskItem } from '../types';
import { initialGoogleTasks } from '../data/initialData';
import { getWidgetName } from '../constants/widgetRegistry';
import { fetchAndParseIcalUrl, parseIcalString } from '../utils/icalParser';
import {
  CAL_KEYS,
  GOOGLE_CALENDAR_SCRIPT_CODE,
  TYPE_META,
  dday,
  dedupe,
  gasAdd,
  gasDelete,
  gasList,
  isGasUrl,
  type CalEvent,
} from '../utils/calendarSync';

interface ClassCalendarWidgetProps {
  onShowToast: (msg: string) => void;
  googleCalendarUrl?: string;
}

type WeekFilterKey = 'lastWeek' | 'thisWeek' | 'nextWeek' | 'all';
const AUTO_REFRESH_MS = 15 * 60 * 1000;

/** 월요일 시작 기준: 지난주 / 이번주 / 다음주 */
function getWeekRangeCategory(dateStr: string): 'lastWeek' | 'thisWeek' | 'nextWeek' | 'other' {
  const m = dateStr?.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return 'other';
  const t = new Date(+m[1], +m[2] - 1, +m[3], 12).getTime();
  const now = new Date();
  const toMon = now.getDay() === 0 ? -6 : 1 - now.getDay();
  const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + toMon).getTime();
  const W = 7 * 86400000;
  if (t >= mon - W && t < mon) return 'lastWeek';
  if (t >= mon && t < mon + W) return 'thisWeek';
  if (t >= mon + W && t < mon + 2 * W) return 'nextWeek';
  return 'other';
}

const load = <T,>(k: string, fb: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fb;
  } catch {
    return fb;
  }
};
const loadStr = (k: string) => {
  try {
    return localStorage.getItem(k) || '';
  } catch {
    return '';
  }
};
const saveStr = (k: string, v: string) => {
  try {
    if (v) localStorage.setItem(k, v);
    else localStorage.removeItem(k);
  } catch {}
};

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const fmtDate = (d: string) => {
  const [y, m, dd] = d.split('-').map(Number);
  return `${m}/${dd} (${DAYS[new Date(y, m - 1, dd).getDay()]})`;
};

/**
 * [ClassCalendarWidget] 캘린더
 * - ⚙️ 연결: 구글 캘린더 양방향(Apps Script) · iCal 비공개 주소 · .ics 파일 — 언제든 바꾸고 다시 등록 가능
 * - 양방향 연결 시 위젯에서 추가 · 삭제하면 구글 캘린더에 바로 반영
 */
export const ClassCalendarWidget: React.FC<ClassCalendarWidgetProps> = ({ onShowToast, googleCalendarUrl }) => {
  const [tab, setTab] = useState<'calendar' | 'tasks'>('calendar');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileModeRef = useRef<'replace' | 'add'>('replace');

  // 연결 정보 (위젯에서만 관리)
  const [gasUrl, setGasUrl] = useState(() => loadStr(CAL_KEYS.gas));
  const [icalUrl, setIcalUrl] = useState(() => loadStr(CAL_KEYS.ical) || googleCalendarUrl || '');
  const [fileName, setFileName] = useState(() => loadStr(CAL_KEYS.fileName));
  const [lastSync, setLastSync] = useState(() => loadStr(CAL_KEYS.lastSync));
  const [gasCalName, setGasCalName] = useState('');

  const [events, setEvents] = useState<CalEvent[]>(() => {
    const raw = load<CalEvent[]>(CAL_KEYS.events, []).filter((e) => e && !String(e.id).startsWith('mock-ev-'));
    // 예전 데이터(출처 없음): iCal 주소가 있었으면 iCal, 없으면 파일에서 온 것으로 봄
    const hadIcal = !!(loadStr(CAL_KEYS.ical) || googleCalendarUrl);
    return dedupe(raw.map((e) => (e.source ? e : { ...e, source: e.id.startsWith('ev-') ? 'local' : hadIcal ? 'ical' : 'file' })));
  });
  const [hidden, setHidden] = useState<string[]>(() => load<string[]>(CAL_KEYS.hidden, []));

  const [tasks, setTasks] = useState<GoogleTaskItem[]>(() => load<GoogleTaskItem[]>('class_tasks_items', initialGoogleTasks));
  const [isSyncing, setIsSyncing] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [gasInput, setGasInput] = useState(gasUrl);
  const [icalInput, setIcalInput] = useState(icalUrl);
  const [showScript, setShowScript] = useState(false);

  const [weekFilters, setWeekFilters] = useState<Set<WeekFilterKey>>(() => new Set<WeekFilterKey>(['thisWeek', 'nextWeek']));
  const [calendarSortOrder, setCalendarSortOrder] = useState<'desc' | 'asc'>('asc');

  const mode: 'gas' | 'ical' | 'file' | 'none' = gasUrl ? 'gas' : icalUrl ? 'ical' : events.some((e) => e.source === 'file') ? 'file' : 'none';

  const saveEvents = (list: CalEvent[]) => {
    const clean = dedupe(list);
    setEvents(clean);
    try {
      localStorage.setItem(CAL_KEYS.events, JSON.stringify(clean));
      localStorage.setItem('class_calendar_synced', clean.length ? 'true' : 'false');
    } catch {}
  };
  const saveTasks = (updated: GoogleTaskItem[]) => {
    setTasks(updated);
    try {
      localStorage.setItem('class_tasks_items', JSON.stringify(updated));
    } catch {}
  };
  const stamp = () => {
    const t = new Date().toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    setLastSync(t);
    saveStr(CAL_KEYS.lastSync, t);
  };

  const toggleWeekFilter = (key: WeekFilterKey) => {
    setWeekFilters((prev) => {
      if (key === 'all') return new Set<WeekFilterKey>(['all']);
      const next = new Set(prev);
      next.delete('all');
      if (next.has(key)) {
        if (next.size === 1) return prev;
        next.delete(key);
      } else next.add(key);
      return next;
    });
  };

  const todayFormatted = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${DAYS[now.getDay()]})`;
  }, []);

  const visibleEvents = useMemo(() => events.filter((e) => !hidden.includes(e.id)), [events, hidden]);
  const filteredEvents = useMemo(() => {
    const list = weekFilters.has('all')
      ? [...visibleEvents]
      : visibleEvents.filter((ev) => {
          const c = getWeekRangeCategory(ev.date);
          return c !== 'other' && weekFilters.has(c);
        });
    return list.sort((a, b) => {
      const k = a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '');
      return calendarSortOrder === 'asc' ? k : -k;
    });
  }, [visibleEvents, weekFilters, calendarSortOrder]);

  // 🔄 연결된 곳에서 다시 불러오기 (양방향 연결이 있으면 그것만, 없으면 iCal)
  const handleSync = useCallback(
    async (silent = false) => {
      if (!gasUrl && !icalUrl) {
        if (!silent) {
          setPanelOpen(true);
          onShowToast('⚙️ 먼저 캘린더를 연결해 주세요.');
        }
        return;
      }
      setIsSyncing(true);
      try {
        if (gasUrl) {
          const { calendar, events: list } = await gasList(gasUrl);
          setGasCalName(calendar);
          setEvents((prev) => {
            const next = dedupe([...prev.filter((e) => e.source !== 'gas' && e.source !== 'ical'), ...list]);
            try {
              localStorage.setItem(CAL_KEYS.events, JSON.stringify(next));
            } catch {}
            return next;
          });
          if (!silent) onShowToast(`📅 구글 캘린더에서 일정 ${list.length}개를 불러왔어요.`);
        } else {
          const parsed = (await fetchAndParseIcalUrl(icalUrl)).map((e) => ({ ...e, source: 'ical' as const }));
          setEvents((prev) => {
            const next = dedupe([...prev.filter((e) => e.source !== 'ical'), ...parsed]);
            try {
              localStorage.setItem(CAL_KEYS.events, JSON.stringify(next));
            } catch {}
            return next;
          });
          if (!silent) onShowToast(`📅 iCal 주소에서 일정 ${parsed.length}개를 불러왔어요.`);
        }
        stamp();
      } catch (err: any) {
        if (!silent) onShowToast(`🔴 캘린더를 불러오지 못했어요: ${err?.message || '네트워크 오류'}`);
      } finally {
        setIsSyncing(false);
      }
    },
    [gasUrl, icalUrl] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // 처음 열 때 · 15분마다 자동으로 새로고침
  useEffect(() => {
    if (!gasUrl && !icalUrl) return;
    handleSync(true);
    const t = window.setInterval(() => !document.hidden && handleSync(true), AUTO_REFRESH_MS);
    return () => clearInterval(t);
  }, [gasUrl, icalUrl, handleSync]);

  useEffect(() => {
    const on = () => handleSync();
    window.addEventListener('class-calendar-refresh', on);
    return () => window.removeEventListener('class-calendar-refresh', on);
  }, [handleSync]);

  // ── 연결 저장 · 해제 ──
  const connectGas = async () => {
    const u = gasInput.trim();
    if (!isGasUrl(u)) return onShowToast('⚠️ https://script.google.com/... 으로 시작하는 웹 앱 주소를 넣어 주세요.');
    setIsSyncing(true);
    try {
      const { calendar, events: list } = await gasList(u);
      setGasUrl(u);
      saveStr(CAL_KEYS.gas, u);
      setGasCalName(calendar);
      saveEvents([...events.filter((e) => e.source !== 'gas' && e.source !== 'ical'), ...list]);
      setHidden([]);
      saveStr(CAL_KEYS.hidden, '');
      stamp();
      setWeekFilters(new Set(['thisWeek', 'nextWeek']));
      onShowToast(`✅ 구글 캘린더 '${calendar}'와 양방향으로 연결했어요. (일정 ${list.length}개)`);
    } catch (err: any) {
      onShowToast(`🔴 연결하지 못했어요: ${err?.message}`);
    } finally {
      setIsSyncing(false);
    }
  };
  const disconnectGas = () => {
    setGasUrl('');
    setGasInput('');
    saveStr(CAL_KEYS.gas, '');
    saveEvents(events.filter((e) => e.source !== 'gas'));
    onShowToast('🔌 양방향 연결을 해제했어요.');
  };
  const connectIcal = async () => {
    const u = icalInput.trim();
    if (!/^(https:|webcal:)/.test(u) || !/\.ics(\?|$)/.test(u)) return onShowToast('⚠️ 끝이 .ics 로 끝나는 iCal 비공개 주소를 넣어 주세요.');
    setIsSyncing(true);
    try {
      const parsed = (await fetchAndParseIcalUrl(u)).map((e) => ({ ...e, source: 'ical' as const }));
      setIcalUrl(u);
      saveStr(CAL_KEYS.ical, u);
      saveEvents([...events.filter((e) => e.source !== 'ical'), ...parsed]);
      stamp();
      onShowToast(`✅ iCal 주소를 새로 등록했어요. (일정 ${parsed.length}개)`);
    } catch (err: any) {
      onShowToast(`🔴 iCal 주소를 불러오지 못했어요: ${err?.message}`);
    } finally {
      setIsSyncing(false);
    }
  };
  const disconnectIcal = () => {
    setIcalUrl('');
    setIcalInput('');
    saveStr(CAL_KEYS.ical, '');
    saveEvents(events.filter((e) => e.source !== 'ical'));
    onShowToast('🔌 iCal 주소를 지웠어요.');
  };

  // 📂 .ics 파일: 바꾸기 / 더하기 — 몇 번이든 다시 가져올 수 있어요
  const pickFile = (m: 'replace' | 'add') => {
    fileModeRef.current = m;
    fileInputRef.current?.click();
  };
  const handleIcsFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseIcalString(String(ev.target?.result || '')).map((x) => ({ ...x, source: 'file' as const }));
        if (!parsed.length) return onShowToast('⚠️ 파일에서 일정을 찾지 못했어요.');
        const keep = fileModeRef.current === 'replace' ? events.filter((x) => x.source !== 'file') : events;
        saveEvents([...keep, ...parsed]);
        const name = fileModeRef.current === 'add' && fileName ? `${fileName} 외` : file.name;
        setFileName(name);
        saveStr(CAL_KEYS.fileName, name);
        setWeekFilters(new Set(['all']));
        onShowToast(`📂 ${file.name}에서 일정 ${parsed.length}개를 ${fileModeRef.current === 'replace' ? '새로 가져왔어요' : '더했어요'}.`);
      } catch {
        onShowToast('🔴 캘린더 파일을 읽지 못했어요.');
      }
    };
    reader.readAsText(file);
  };
  const clearFileEvents = () => {
    saveEvents(events.filter((e) => e.source !== 'file'));
    setFileName('');
    saveStr(CAL_KEYS.fileName, '');
    onShowToast('🧹 파일에서 가져온 일정을 지웠어요.');
  };

  // ── 일정 추가 · 삭제 ──
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newEventTitle.trim();
    if (!title) return;
    if (gasUrl) {
      setIsSyncing(true);
      try {
        await gasAdd(gasUrl, { title, date: newEventDate, ...(newStart && newEnd ? { start: newStart, end: newEnd } : {}) });
        onShowToast('📅 구글 캘린더에 일정을 추가했어요.');
        await handleSync(true);
      } catch (err: any) {
        onShowToast(`🔴 구글 캘린더에 추가하지 못했어요: ${err?.message}`);
      } finally {
        setIsSyncing(false);
      }
    } else {
      saveEvents([
        ...events,
        { id: `ev-${Date.now()}`, title, date: newEventDate, time: newStart ? `${newStart}${newEnd ? ` - ${newEnd}` : ''}` : undefined, type: 'school', source: 'local' },
      ]);
      onShowToast(mode === 'ical' ? '📅 대시보드에만 추가했어요. (iCal 주소는 읽기 전용이라 구글 캘린더에는 들어가지 않아요)' : '📅 일정을 추가했어요.');
    }
    setIsAddingEvent(false);
    setNewEventTitle('');
    setNewStart('');
    setNewEnd('');
  };

  const handleDeleteEvent = async (ev: CalEvent) => {
    if (ev.source === 'gas' && gasUrl && ev.gid) {
      if (!window.confirm(`'${ev.title}' 일정을 구글 캘린더에서도 지울까요?${ev.recurring ? '\n(반복 일정이에요)' : ''}`)) return;
      setIsSyncing(true);
      try {
        await gasDelete(gasUrl, ev.gid, ev.date);
        saveEvents(events.filter((x) => x.id !== ev.id));
        onShowToast('🗑️ 구글 캘린더에서도 지웠어요.');
      } catch (err: any) {
        onShowToast(`🔴 구글 캘린더에서 지우지 못했어요: ${err?.message}`);
      } finally {
        setIsSyncing(false);
      }
      return;
    }
    if (ev.source === 'ical') {
      const next = [...hidden, ev.id];
      setHidden(next);
      try {
        localStorage.setItem(CAL_KEYS.hidden, JSON.stringify(next));
      } catch {}
      onShowToast('🙈 대시보드에서 숨겼어요. iCal 주소는 읽기 전용이라 구글 캘린더에는 남아 있어요. (⚙️ 연결에서 양방향 연결을 하면 함께 지워져요)');
      return;
    }
    saveEvents(events.filter((x) => x.id !== ev.id));
    onShowToast('🗑️ 일정을 지웠어요.');
  };

  // 할 일
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const handleToggleTask = (id: string) => saveTasks(tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    saveTasks([...tasks, { id: `task-${Date.now()}`, title: newTaskTitle.trim(), dueDate: newTaskDueDate || undefined, completed: false }]);
    setNewTaskTitle('');
    setNewTaskDueDate('');
    onShowToast('✅ 할 일을 추가했어요.');
  };
  const handleDeleteTask = (id: string) => saveTasks(tasks.filter((t) => t.id !== id));

  const statusText =
    mode === 'gas'
      ? `구글 캘린더 양방향${gasCalName ? ` · ${gasCalName}` : ''}`
      : mode === 'ical'
      ? 'iCal 주소 (읽기 전용)'
      : mode === 'file'
      ? `파일: ${fileName || '.ics'}`
      : '연결 안 됨';

  const copyScript = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_CALENDAR_SCRIPT_CODE);
      onShowToast('📋 캘린더 연결 스크립트를 복사했어요.');
    } catch {
      setShowScript(true);
    }
  };

  const sourceBtn = 'px-2.5 py-1.5 rounded-lg text-[11px] font-black transition cursor-pointer disabled:opacity-40';

  return (
    <section className="w-full h-full p-3 sm:p-3.5 flex flex-col select-none overflow-hidden bg-transparent" data-calendar-widget>
      <input type="file" ref={fileInputRef} onChange={handleIcsFileUpload} accept=".ics,text/calendar" className="hidden" />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-[#1e2c44] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-slate-900 dark:text-[#f8fafc]">{getWidgetName('calendar')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTab(tab === 'tasks' ? 'calendar' : 'tasks')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 border ${
              tab === 'tasks'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600 dark:bg-[#0c1424] dark:hover:bg-[#142036] dark:text-slate-300 border-slate-200/60 dark:border-[#1e2c44]'
            }`}
          >
            <span>할 일</span>
            <span className={`px-1.5 rounded-full text-[10px] font-extrabold ${tab === 'tasks' ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
              {tasks.filter((t) => !t.completed).length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setPanelOpen((v) => !v)}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 border ${
              panelOpen ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600 dark:bg-[#0c1424] dark:text-slate-300 border-slate-200/60 dark:border-[#1e2c44]'
            }`}
            title="구글 캘린더 · iCal 주소 · .ics 파일 연결"
            data-cal-connect
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>연결</span>
          </button>
          <button
            onClick={() => handleSync()}
            disabled={isSyncing}
            title="지금 다시 불러오기"
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#142036] text-slate-400 hover:text-blue-400 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pt-3 flex flex-col min-h-0 space-y-2.5">
        {/* ⚙️ 연결 패널 */}
        {panelOpen && (
          <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/30 p-3 space-y-3 text-xs shrink-0" data-cal-panel>
            <div className="flex items-center justify-between">
              <span className="font-black text-indigo-900 dark:text-indigo-200">🔗 캘린더 연결</span>
              <button type="button" onClick={() => setPanelOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* ① 양방향 */}
            <div className={`rounded-xl border p-2.5 space-y-2 bg-white/80 dark:bg-[#0c1424] ${mode === 'gas' ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-slate-200 dark:border-[#1e2c44]'}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  ① 구글 캘린더 양방향 연결
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px]">추천</span>
                </div>
                {gasUrl && <span className="text-[10px] font-black text-emerald-600">● 연결됨</span>}
              </div>
              <p className="text-[10.5px] text-slate-500 leading-relaxed">위젯에서 추가 · 삭제하면 구글 캘린더에도 바로 반영돼요. 처음 한 번만 스크립트를 배포하면 돼요.</p>
              <div className="flex gap-1.5">
                <input
                  type="password"
                  value={gasInput}
                  onChange={(e) => setGasInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-[#1e2c44] bg-white dark:bg-slate-900 text-[11px] font-mono outline-none focus:ring-2 focus:ring-emerald-200"
                />
                <button type="button" onClick={connectGas} disabled={isSyncing} className={`${sourceBtn} bg-emerald-600 text-white hover:bg-emerald-700`}>
                  {gasUrl ? '바꾸기' : '연결'}
                </button>
                {gasUrl && (
                  <button type="button" onClick={disconnectGas} className={`${sourceBtn} bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600`}>
                    해제
                  </button>
                )}
              </div>
              <details className="text-[10.5px] text-slate-600 dark:text-slate-300" open={!gasUrl && showScript}>
                <summary className="cursor-pointer font-bold text-indigo-700 dark:text-indigo-300">처음 설정하는 방법 (5분)</summary>
                <ol className="list-decimal pl-4 mt-1.5 space-y-0.5 leading-relaxed">
                  <li>
                    <a href="https://script.google.com/home/projects/create" target="_blank" rel="noreferrer" className="underline text-indigo-700">script.google.com</a>에서 <b>새 프로젝트</b>를 만들어요.
                  </li>
                  <li>
                    아래 <b>스크립트 복사</b>를 눌러 내용을 모두 바꿔 붙여 넣고 저장해요.
                  </li>
                  <li>
                    <b>배포 → 새 배포 → 웹 앱</b>: 실행 사용자 <b>나</b>, 액세스 권한 <b>모든 사용자</b>로 배포해요.
                  </li>
                  <li>권한 허용 후 나오는 <b>웹 앱 URL</b>을 위 칸에 붙여 넣고 [연결]을 눌러요.</li>
                </ol>
                <button type="button" onClick={copyScript} className="mt-1.5 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600 text-white font-bold cursor-pointer">
                  <Copy className="w-3 h-3" /> 스크립트 복사
                </button>
                {showScript && (
                  <textarea readOnly value={GOOGLE_CALENDAR_SCRIPT_CODE} className="mt-1.5 w-full h-28 p-2 rounded-lg bg-slate-900 text-emerald-200 font-mono text-[9.5px]" />
                )}
              </details>
            </div>

            {/* ② iCal */}
            <div className={`rounded-xl border p-2.5 space-y-2 bg-white/80 dark:bg-[#0c1424] ${mode === 'ical' ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200 dark:border-[#1e2c44]'}`}>
              <div className="flex items-center justify-between">
                <div className="font-black text-slate-800 dark:text-slate-100">② iCal 비공개 주소 <span className="text-[10px] text-slate-400 font-bold">(읽기 전용)</span></div>
                {icalUrl && <span className={`text-[10px] font-black ${gasUrl ? 'text-slate-400' : 'text-blue-600'}`}>{gasUrl ? '대기 (①이 우선)' : '● 사용 중'}</span>}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="password"
                  value={icalInput}
                  onChange={(e) => setIcalInput(e.target.value)}
                  placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                  className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-[#1e2c44] bg-white dark:bg-slate-900 text-[11px] font-mono outline-none focus:ring-2 focus:ring-blue-200"
                />
                <button type="button" onClick={connectIcal} disabled={isSyncing} className={`${sourceBtn} bg-blue-600 text-white hover:bg-blue-700`}>
                  {icalUrl ? '바꾸기' : '등록'}
                </button>
                {icalUrl && (
                  <button type="button" onClick={disconnectIcal} className={`${sourceBtn} bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600`}>
                    지우기
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">구글 캘린더 → 설정 → 내 캘린더 → [캘린더 통합] → <b>iCal 형식의 비공개 주소</b>를 복사해요. 15분마다 새로 불러와요.</p>
            </div>

            {/* ③ 파일 */}
            <div className="rounded-xl border border-slate-200 dark:border-[#1e2c44] p-2.5 space-y-2 bg-white/80 dark:bg-[#0c1424]">
              <div className="flex items-center justify-between">
                <div className="font-black text-slate-800 dark:text-slate-100">③ .ics 파일 가져오기 <span className="text-[10px] text-slate-400 font-bold">(한 번 불러오기)</span></div>
                {fileName && <span className="text-[10px] font-bold text-slate-500 truncate max-w-[45%]">📂 {fileName}</span>}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <button type="button" onClick={() => pickFile('replace')} className={`${sourceBtn} bg-slate-800 text-white hover:bg-slate-900 inline-flex items-center gap-1`}>
                  <Upload className="w-3 h-3" /> {fileName ? '새 파일로 바꾸기' : '파일 고르기'}
                </button>
                {fileName && (
                  <>
                    <button type="button" onClick={() => pickFile('add')} className={`${sourceBtn} bg-slate-100 text-slate-700 hover:bg-slate-200`}>
                      ＋ 파일 더하기
                    </button>
                    <button type="button" onClick={clearFileEvents} className={`${sourceBtn} bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600`}>
                      파일 일정 지우기
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'calendar' ? (
          <div className="space-y-2.5 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between">
              <div className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#0c1424] text-[11px] font-bold text-slate-700 dark:text-slate-200">{todayFormatted}</div>
              <button
                type="button"
                onClick={() => setIsAddingEvent((p) => !p)}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {isAddingEvent ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                <span>{isAddingEvent ? '닫기' : '일정 추가'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-1.5 text-xs flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-400 text-[11px] flex items-center gap-1 mr-0.5">
                  <Filter className="w-3 h-3" />
                </span>
                {[
                  { key: 'lastWeek' as const, label: '지난주' },
                  { key: 'thisWeek' as const, label: '이번주' },
                  { key: 'nextWeek' as const, label: '다음주' },
                  { key: 'all' as const, label: '전체' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleWeekFilter(item.key)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition border cursor-pointer ${
                      weekFilters.has(item.key)
                        ? 'bg-blue-500 text-white border-blue-500 shadow-2xs'
                        : 'bg-slate-100 dark:bg-[#0c1424] text-slate-500 dark:text-slate-300 border-slate-200/60 dark:border-[#1e2c44] hover:bg-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setCalendarSortOrder((p) => (p === 'desc' ? 'asc' : 'desc'))}
                className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 flex items-center gap-1 cursor-pointer ml-auto"
              >
                <span>{calendarSortOrder === 'asc' ? '날짜순' : '최신순'}</span>
                {calendarSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-500" /> : <ArrowDown className="w-3 h-3 text-blue-500" />}
              </button>
            </div>

            {isAddingEvent && (
              <form onSubmit={handleAddEvent} className="p-2.5 bg-blue-50/80 dark:bg-blue-950/40 rounded-xl space-y-2 text-xs border border-blue-200/60 shrink-0">
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="일정 제목 (예: 학부모 상담)"
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-blue-200 rounded-lg outline-none font-bold text-slate-800 dark:text-slate-100"
                />
                <div className="flex gap-1.5 flex-wrap">
                  <input type="date" min="2000-01-01" max="2099-12-31" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} className="px-2 py-1 bg-white dark:bg-slate-800 border border-blue-200 rounded-lg text-xs" />
                  <input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} className="px-2 py-1 bg-white dark:bg-slate-800 border border-blue-200 rounded-lg text-xs w-[92px]" title="시작 (비우면 종일)" />
                  <input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} className="px-2 py-1 bg-white dark:bg-slate-800 border border-blue-200 rounded-lg text-xs w-[92px]" title="끝" />
                  <button type="submit" disabled={isSyncing} className="ml-auto px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer disabled:opacity-50">
                    {gasUrl ? '구글에 추가' : '추가'}
                  </button>
                </div>
                <p className="text-[10px] text-blue-700/80">{gasUrl ? '구글 캘린더에도 바로 들어가요. 시각을 비우면 종일 일정이에요.' : mode === 'ical' ? 'iCal 주소는 읽기 전용이라 대시보드에만 저장돼요.' : '대시보드에 저장돼요.'}</p>
              </form>
            )}

            <div className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar pr-1">
              {visibleEvents.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-center p-4 rounded-2xl border-2 border-dashed border-slate-200/80 dark:border-[#1e2c44] text-slate-400 gap-2">
                  <span className="text-3xl opacity-75">🗓️</span>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">아직 불러온 일정이 없어요</p>
                  <button
                    type="button"
                    onClick={() => setPanelOpen(true)}
                    className="mt-1 px-3 py-1.5 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Link2 className="w-3 h-3" /> 캘린더 연결하기
                  </button>
                </div>
              ) : filteredEvents.length > 0 ? (
                filteredEvents.map((ev) => {
                  const meta = ev.source === 'local' ? TYPE_META.local : TYPE_META[ev.type as string] || TYPE_META.school;
                  const accent = ev.color || meta.color;
                  const dd = dday(ev.date);
                  const ddCls =
                    dd.tone === 'today'
                      ? 'bg-rose-500 text-white'
                      : dd.tone === 'soon'
                      ? 'bg-amber-100 text-amber-700'
                      : dd.tone === 'later'
                      ? 'bg-slate-100 text-slate-500 dark:bg-[#16233b] dark:text-slate-300'
                      : 'text-slate-300';
                  return (
                    <div
                      key={`${ev.id}|${ev.date}`}
                      style={{ borderLeftColor: accent }}
                      className={`p-2 sm:p-2.5 rounded-xl bg-white/60 dark:bg-[#0c1424]/80 hover:bg-white/90 dark:hover:bg-[#142036] border border-slate-200/60 dark:border-[#1e2c44] border-l-[3.5px] transition flex items-center justify-between text-xs group shadow-2xs ${dd.tone === 'past' ? 'opacity-60' : ''}`}
                      data-cal-event
                    >
                      <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 tabular-nums">{fmtDate(ev.date)}</span>
                          <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">{ev.time || '종일'}</span>
                          <span style={{ borderColor: `${accent}55`, color: accent }} className="text-[9px] font-extrabold px-1.5 rounded-md border bg-white/70 dark:bg-[#16233b]">
                            {meta.label}
                          </span>
                          {ev.recurring && <span className="text-[9px] text-slate-400 font-bold">🔁</span>}
                        </div>
                        <span className="font-black text-slate-900 dark:text-[#f8fafc] text-xs truncate">{ev.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${ddCls}`}>{dd.text}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(ev)}
                          title={ev.source === 'gas' ? '구글 캘린더에서도 삭제' : ev.source === 'ical' ? '대시보드에서 숨기기' : '삭제'}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-500 transition cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                  <p>선택한 기간에 일정이 없어요.</p>
                  <button type="button" onClick={() => setWeekFilters(new Set(['all']))} className="text-[11px] text-blue-600 font-bold underline cursor-pointer">
                    전체 일정({visibleEvents.length}건) 보기
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200/60 dark:border-[#1e2c44] shrink-0">
              <button
                type="button"
                onClick={() => setIsAddingEvent(true)}
                className="w-full py-1.5 rounded-xl border border-dashed border-slate-300 dark:border-[#1e2c44] hover:border-blue-500 text-slate-500 dark:text-slate-400 hover:text-blue-600 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer bg-slate-50/50 dark:bg-[#0c1424]/50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>일정 추가하기</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 flex-1 flex flex-col min-h-0">
            {/* 캘린더 화면 복귀 네비게이션 */}
            <div className="flex items-center justify-between pb-0.5">
              <button
                type="button"
                onClick={() => setTab('calendar')}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>← 캘린더 일정으로 돌아가기</span>
              </button>
              <span className="text-[10px] text-slate-400 font-medium">
                할 일 {tasks.filter((t) => !t.completed).length}건 남음
              </span>
            </div>

            {/* Add Task input */}
            <form onSubmit={handleAddTask} className="flex gap-1.5 shrink-0">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="새 할 일 입력 (Google Tasks 동기화)..."
                className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium text-slate-800 dark:text-slate-100"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer shrink-0 transition"
              >
                추가
              </button>
            </form>

            <div className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar pr-1">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task.id)}
                  className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between text-xs backdrop-blur-xs ${
                    task.completed
                      ? 'bg-white/40 dark:bg-slate-900/60 border-slate-200/40 dark:border-slate-800 opacity-60 line-through'
                      : 'bg-white/60 dark:bg-[#0c1424]/80 border-slate-200/70 dark:border-[#1e2c44] shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 overflow-hidden">
                    <button type="button" className="text-blue-600 shrink-0">
                      {task.completed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                      )}
                    </button>
                    <span className="truncate font-medium text-slate-800 dark:text-slate-200">{task.title}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {task.dueDate && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {task.dueDate}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTask(task.id);
                      }}
                      className="text-slate-300 hover:text-rose-500 p-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between text-[10px] text-slate-400 shrink-0 gap-2">
        <button type="button" onClick={() => setPanelOpen(true)} className="flex items-center gap-1.5 truncate cursor-pointer hover:text-slate-600">
          <span className={`w-2 h-2 rounded-full shrink-0 ${mode === 'gas' ? 'bg-emerald-500 animate-pulse' : mode === 'none' ? 'bg-slate-400' : 'bg-blue-500'}`} />
          <span className="truncate text-slate-600 dark:text-slate-300 font-medium">
            <strong className="text-slate-900 dark:text-slate-100 font-bold">{statusText}</strong>
          </span>
        </button>
        <span className={`font-bold shrink-0 ${mode === 'gas' ? 'text-emerald-600' : 'text-slate-400'}`}>{lastSync ? `${lastSync} 갱신` : mode === 'none' ? '⚙️ 연결을 눌러 시작' : ''}</span>
      </div>
    </section>
  );
};
