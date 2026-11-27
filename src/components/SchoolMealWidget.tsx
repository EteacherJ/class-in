import React, { useState, useEffect, useRef } from 'react';
import {
  Utensils,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Flame,
  Info,
  ShieldCheck,
  Search,
  MapPin,
} from 'lucide-react';
import { SchoolMealDay } from '../types';
import { ALLERGY_NAMES } from '../data/mealAndDDayData';
import {
  EDU_OFFICES,
  NEIS_SCHOOL_EVENT,
  fetchMeals,
  getSavedSchool,
  saveSchool,
  searchSchools,
  shortAddress,
  toYmd,
  type MealDay,
  type NeisSchool,
} from '../utils/neisSchool';

interface SchoolMealWidgetProps {
  schoolName?: string;
  onShowToast: (msg: string) => void;
}

const CACHE_KEY = 'class_school_meal_cache_v2';
const DAY_NAMES = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

/** '한빛초' · '한빛초등학교' 를 같은 이름으로 */
const baseName = (n: string) => n.replace(/\s+/g, '').replace(/(등학교|학교)$/, '');
const isGenericName = (n: string) => !n.trim() || /^(초등학교|중학교|고등학교|학교)$/.test(n.trim());

const toSchoolMealDay = (m: MealDay): SchoolMealDay => {
  const d = new Date(Number(m.ymd.slice(0, 4)), Number(m.ymd.slice(4, 6)) - 1, Number(m.ymd.slice(6, 8)));
  return {
    date: `${m.ymd.slice(0, 4)}.${m.ymd.slice(4, 6)}.${m.ymd.slice(6, 8)}`,
    dayOfWeek: DAY_NAMES[d.getDay()],
    mealType: m.mealName || '중식',
    calorie: m.calorie || '-',
    menuItems: m.dishes,
    nutrients: m.nutrients.map((n) => ({ name: n.name, amount: n.amount })),
    originInfo: m.origin || '정보 없음',
    specialNote: '※ 학교알리미(NEIS) 급식 식단',
  };
};

interface MealCache {
  schoolCode: string;
  fetchedYmd: string;
  today: SchoolMealDay | null;
  next: SchoolMealDay | null;
}

export const SchoolMealWidget: React.FC<SchoolMealWidgetProps> = ({ schoolName = '', onShowToast }) => {
  const [activeSubTab, setActiveSubTab] = useState<'menu' | 'nutrition' | 'allergy'>('menu');
  const [selectedDayKey, setSelectedDayKey] = useState<'today' | 'tomorrow'>('today');
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [school, setSchool] = useState<NeisSchool | null>(() => getSavedSchool());
  const [candidates, setCandidates] = useState<NeisSchool[]>([]);
  const [notice, setNotice] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>(schoolName);
  const [searchRegion, setSearchRegion] = useState<string>('');
  const [cache, setCache] = useState<MealCache | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    } catch {
      return null;
    }
  });
  const lastResolved = useRef<string>('');

  // Highlighted allergy filter (e.g. students with allergies)
  const [highlightAllergies] = useState<number[]>([1, 2, 5, 6]);
  void highlightAllergies;

  const loadMeals = async (s: NeisSchool, silent = false) => {
    setIsFetching(true);
    const today = new Date();
    const end = new Date(today);
    end.setDate(today.getDate() + 14);
    const r = await fetchMeals(s, toYmd(today), toYmd(end));
    setIsFetching(false);
    if (!r.ok) {
      setNotice(r.message || '급식 정보를 불러오지 못했어요.');
      if (!silent) onShowToast(`⚠️ ${r.message}`);
      return;
    }
    const t = toYmd(today);
    const todayMeal = r.days.find((d) => d.ymd === t);
    const nextMeal = r.days.find((d) => d.ymd > t);
    const next: MealCache = {
      schoolCode: s.schoolCode,
      fetchedYmd: t,
      today: todayMeal ? toSchoolMealDay(todayMeal) : null,
      next: nextMeal ? toSchoolMealDay(nextMeal) : null,
    };
    setCache(next);
    setNotice('');
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(next));
    } catch {}
    if (!silent) onShowToast(`🍚 ${s.name}(${shortAddress(s)}) 급식 정보를 불러왔어요.`);
  };

  const chooseSchool = (s: NeisSchool, silent = false) => {
    saveSchool(s);
    setSchool(s);
    setCandidates([]);
    setIsSearchOpen(false);
    loadMeals(s, silent);
  };

  /** 이름(+지역)으로 학교 찾기: 한 곳이면 바로, 여러 곳이면 고르게 함 */
  const resolveSchool = async (query: string, eduCode = '', silent = false) => {
    if (isGenericName(query)) {
      setNotice('환경설정 1단계에 학교 이름을 입력하거나 🔍로 학교를 찾아 주세요.');
      return;
    }
    setIsFetching(true);
    const r = await searchSchools(query, eduCode);
    setIsFetching(false);
    if (!r.ok) {
      setNotice(r.message || '학교를 찾지 못했어요.');
      if (!silent) onShowToast(`⚠️ ${r.message}`);
      return;
    }
    if (r.schools.length === 1) {
      chooseSchool(r.schools[0], silent);
      return;
    }
    setCandidates(r.schools);
    setNotice(`'${r.schools[0].name}' 이름의 학교가 ${r.schools.length}곳${r.schools.length >= 5 ? ' 이상' : ''} 있어요. 우리 학교(지역)를 골라 주세요.`);
  };

  // 환경설정 학교명 변경 · 처음 실행 시: 저장된 학교가 같은 이름이면 그대로, 아니면 다시 찾기
  useEffect(() => {
    const name = (schoolName || '').trim();
    const saved = getSavedSchool();
    if (saved && (isGenericName(name) || baseName(saved.name) === baseName(name))) {
      setSchool(saved);
      const t = toYmd(new Date());
      if (!cache || cache.schoolCode !== saved.schoolCode || cache.fetchedYmd !== t) loadMeals(saved, true);
      return;
    }
    if (lastResolved.current === name) return;
    lastResolved.current = name;
    setSearchQuery(name);
    resolveSchool(name, '', true);
  }, [schoolName]); // eslint-disable-line react-hooks/exhaustive-deps

  // 환경설정에서 학교를 고르면 바로 반영
  useEffect(() => {
    const on = (e: Event) => {
      const s = (e as CustomEvent<NeisSchool | null>).detail;
      if (s) {
        setSchool(s);
        setCandidates([]);
        loadMeals(s, true);
      }
    };
    window.addEventListener(NEIS_SCHOOL_EVENT, on);
    return () => window.removeEventListener(NEIS_SCHOOL_EVENT, on);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentMeal: SchoolMealDay | null = selectedDayKey === 'today' ? cache?.today ?? null : cache?.next ?? null;
  const currentSchool = school ? `${school.name} · ${shortAddress(school)}` : schoolName || '학교 미설정';

  const handleFetchFromSchoolInfo = () => {
    if (school) loadMeals(school);
    else resolveSchool(searchQuery || schoolName);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    resolveSchool(searchQuery.trim(), searchRegion);
  };

  const emptyMeal: SchoolMealDay = {
    date: '',
    dayOfWeek: selectedDayKey === 'today' ? DAY_NAMES[new Date().getDay()] : '',
    mealType: '급식 정보 없음',
    calorie: '-',
    menuItems: [],
    nutrients: [],
    originInfo: '-',
  };
  const meal = currentMeal || emptyMeal;

  return (
    <section className="w-full h-full p-3.5 sm:p-4 flex flex-col justify-between text-slate-800 dark:text-slate-100">
      {/* 1. Header Bar */}
      <div>
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-xs">
              <Utensils className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                  오늘의 급식
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold">
                  {meal.dayOfWeek}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate max-w-[160px] sm:max-w-[220px]" title={school?.address || ''}>
                {currentSchool}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Day Switcher */}
            <div className="flex bg-slate-100 dark:bg-[#0c1424] border border-transparent dark:border-[#1e2c44] p-0.5 rounded-lg text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setSelectedDayKey('today')}
                className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                  selectedDayKey === 'today'
                    ? 'bg-white dark:bg-[#101a2d] text-amber-600 dark:text-amber-300 shadow-xs border border-transparent dark:border-[#1e2c44]'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                오늘
              </button>
              <button
                type="button"
                onClick={() => setSelectedDayKey('tomorrow')}
                className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                  selectedDayKey === 'tomorrow'
                    ? 'bg-white dark:bg-[#101a2d] text-amber-600 dark:text-amber-300 shadow-xs border border-transparent dark:border-[#1e2c44]'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                다음 급식
              </button>
            </div>

            {/* School Search Toggle */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#101a2d] border border-transparent dark:hover:border-[#1e2c44] transition cursor-pointer"
              title="학교알리미 학교 변경"
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            {/* Refresh / Sync Button (요구사항 12: 학교알리미/NEIS 실시간 새로고침) */}
            <button
              type="button"
              onClick={handleFetchFromSchoolInfo}
              className={`p-1 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-[#101a2d] border border-transparent dark:hover:border-[#1e2c44] transition cursor-pointer ${
                isFetching ? 'animate-spin text-amber-500' : ''
              }`}
              title="NEIS/학교알리미 실시간 급식 식단 새로고침"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 학교 찾기: 이름 + 시·도 */}
        {isSearchOpen && (
          <form
            onSubmit={handleSearchSubmit}
            className="mt-2 p-2 bg-amber-50 dark:bg-slate-800/80 rounded-xl border border-amber-200 dark:border-slate-700 flex gap-1.5 animate-fade-in text-xs"
          >
            <select
              value={searchRegion}
              onChange={(e) => setSearchRegion(e.target.value)}
              className="px-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-[11px]"
              title="시·도 (같은 이름의 학교가 여러 곳일 때)"
            >
              <option value="">시·도 전체</option>
              {EDU_OFFICES.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="학교 이름 (예: 한빛초등학교)"
              className="flex-1 min-w-0 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-bold"
            />
            <button type="submit" className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg cursor-pointer shrink-0">
              찾기
            </button>
          </form>
        )}

        {/* 같은 이름의 학교가 여러 곳: 지역(주소)으로 고르기 */}
        {candidates.length > 1 && (
          <div className="mt-2 p-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-[11px] space-y-1 animate-fade-in">
            <div className="font-black text-sky-900 dark:text-sky-200 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{notice}</span>
            </div>
            {candidates.map((c) => (
              <button
                key={`${c.eduCode}-${c.schoolCode}`}
                type="button"
                onClick={() => chooseSchool(c)}
                className="w-full text-left px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-700 hover:border-sky-400 cursor-pointer flex items-center justify-between gap-2"
              >
                <span className="font-bold text-slate-800 dark:text-slate-100">{c.name}</span>
                <span className="text-[10px] text-slate-500 truncate">{c.address || c.eduName}</span>
              </button>
            ))}
            {candidates.length >= 5 && (
              <p className="text-[10px] text-slate-500">목록에 없으면 🔍에서 시·도를 골라 다시 찾아 주세요.</p>
            )}
          </div>
        )}
        {candidates.length <= 1 && notice && (
          <div className="mt-2 px-2 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[10.5px] font-bold text-amber-800 dark:text-amber-300">
            {notice}
          </div>
        )}

        {/* Calorie & Meal Type Badge */}
        <div className="flex items-center justify-between mt-2 px-1 text-[11px]">
          <span className="font-bold text-slate-600 dark:text-slate-300">
            {meal.mealType}
          </span>
          <span className="flex items-center gap-1 font-mono font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-800/60">
            <Flame className="w-3 h-3 text-amber-500" />
            <span>{meal.calorie}</span>
          </span>
        </div>
      </div>

      {/* 2. Main Content Area according to Tabs */}
      <div className="my-2 flex-1 min-h-0 overflow-y-auto custom-scroll pr-1">
        {/* TAB 1: Menu List */}
        {activeSubTab === 'menu' && (
          <div className="space-y-1">
            {meal.menuItems.length === 0 && (
              <div className="py-6 text-center text-[11px] text-slate-400 font-bold">
                {isFetching ? '급식 정보를 불러오는 중…' : selectedDayKey === 'today' ? '오늘은 급식 정보가 없어요 (주말·방학·행사일 등)' : '앞으로 2주 안에 등록된 급식이 없어요'}
              </div>
            )}
            {(meal?.menuItems || []).map((item, idx) => (
              <div
                key={idx}
                className="py-1.5 px-2.5 rounded-xl bg-white/60 dark:bg-[#0c1424]/80 hover:bg-white/90 dark:hover:bg-[#142036] border border-slate-200/50 dark:border-[#1e2c44] transition flex items-center justify-between text-xs shadow-2xs backdrop-blur-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-4 text-center font-mono text-[10px] text-slate-400 font-bold">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {item.name}
                  </span>
                </div>

                {item.allergies && item.allergies.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-mono text-amber-600 dark:text-amber-400 font-black bg-amber-100/70 dark:bg-amber-950 px-1.5 py-0.5 rounded" title="알레르기 번호">
                      알레르기: {item.allergies.join('.')}
                    </span>
                  </div>
                )}
              </div>
            ))}

            {meal?.specialNote && (
              <div className="mt-1.5 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                <span>{meal.specialNote}</span>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Nutrition Information (요구사항: 영양정보 탭) */}
        {activeSubTab === 'nutrition' && (
          <div className="space-y-2 text-xs">
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 text-[10px] text-sky-800 dark:text-sky-300 flex items-center gap-1.5 font-bold">
              <Info className="w-3.5 h-3.5 shrink-0 text-sky-600" />
              <span>학교알리미(NEIS)에 등록된 영양 정보</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {(meal?.nutrients || []).map((nut, i) => (
                <div
                  key={i}
                  className="p-1.5 rounded-lg bg-slate-50 dark:bg-[#101a2d] border border-slate-100 dark:border-[#1e2c44] flex items-center justify-between"
                >
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {nut.name}
                  </span>
                  <div className="text-right">
                    <span className="font-mono font-black text-slate-900 dark:text-white text-[11px]">
                      {nut.amount}
                    </span>
                    {nut.dailyPercent && (
                      <span className="text-[9px] text-slate-400 ml-1">
                        ({nut.dailyPercent}%)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-2 bg-slate-50 dark:bg-[#101a2d] border border-slate-100 dark:border-[#1e2c44] rounded-xl text-[10px] text-slate-500 dark:text-slate-300">
              <span className="font-bold">원산지: </span>
              <span>{meal.originInfo}</span>
            </div>
          </div>
        )}

        {/* TAB 3: Allergy Warning Info (요구사항: 알레르기 반응 주의 사항) */}
        {activeSubTab === 'allergy' && (
          <div className="space-y-2 text-xs">
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-[10px] text-rose-800 dark:text-rose-300 flex items-start gap-1.5 font-bold">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <div>식품 알레르기 유발물질 표시제 (교육부/식약처 19종)</div>
                <div className="text-[9px] font-normal opacity-90 mt-0.5">
                  특정 식품에 알레르기가 있는 학생은 배식 전 담임교사 및 보건실에 미리 확인 바랍니다.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1 text-[10px]">
              {Object.entries(ALLERGY_NAMES).map(([numStr, name]) => {
                const num = Number(numStr);
                const isIncluded = meal.menuItems.some((m) =>
                  m.allergies.includes(num)
                );
                return (
                  <div
                    key={num}
                    className={`p-1 px-2 rounded-lg border flex items-center justify-between ${
                      isIncluded
                        ? 'bg-rose-50/80 dark:bg-[#101a2d] border-rose-200 dark:border-rose-500/50 text-rose-900 dark:text-rose-200 font-black'
                        : 'bg-slate-50/50 dark:bg-[#0c1424] border-slate-100 dark:border-[#1e2c44] text-slate-400'
                    }`}
                  >
                    <span>
                      {num}. {name}
                    </span>
                    {isIncluded && (
                      <span className="text-[9px] bg-rose-500 text-white px-1 rounded font-mono">
                        오늘 포함
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Sub-Tabs & School Info Portal Link (요구사항) */}
      <div className="pt-2 border-t border-slate-100 dark:border-[#1e2c44] flex items-center justify-between gap-1">
        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 dark:bg-[#0c1424] border border-transparent dark:border-[#1e2c44] p-0.5 rounded-lg text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setActiveSubTab('menu')}
            className={`px-2 py-1 rounded-md transition cursor-pointer ${
              activeSubTab === 'menu'
                ? 'bg-white dark:bg-[#101a2d] text-slate-900 dark:text-white shadow-xs font-black border border-transparent dark:border-[#1e2c44]'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            식단표
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('nutrition')}
            className={`px-2 py-1 rounded-md transition cursor-pointer ${
              activeSubTab === 'nutrition'
                ? 'bg-white dark:bg-[#101a2d] text-sky-600 dark:text-sky-300 shadow-xs font-black border border-transparent dark:border-[#1e2c44]'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            영양정보
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('allergy')}
            className={`px-2 py-1 rounded-md transition cursor-pointer ${
              activeSubTab === 'allergy'
                ? 'bg-white dark:bg-[#101a2d] text-rose-600 dark:text-rose-300 shadow-xs font-black border border-transparent dark:border-[#1e2c44]'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            알레르기 주의
          </button>
        </div>

        {/* Link to School Info official site */}
        <a
          href="https://www.schoolinfo.go.kr/Main.do"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-bold text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1 transition"
          title="학교알리미 공식 홈페이지로 이동"
        >
          <span>학교알리미</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>
    </section>
  );
};
