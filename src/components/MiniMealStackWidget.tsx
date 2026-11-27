/**
 * 🍱 스택 탭 · 오늘의 급식 (캘린더와 시간표 사이)
 *  - 급식 위젯과 같은 저장소(학교 · 식단 캐시)를 써요
 *  - 하루가 바뀌었거나 아직 없으면 학교알리미(NEIS)에서 다시 받아요
 */
import React, { useEffect, useState } from 'react';
import type { SchoolMealDay } from '../types';
import { fetchMeals, getSavedSchool, toYmd, NEIS_SCHOOL_EVENT } from '../utils/neisSchool';

const CACHE_KEY = 'class_school_meal_cache_v2';
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
interface MealCache {
  schoolCode: string;
  fetchedYmd: string;
  today: SchoolMealDay | null;
  next: SchoolMealDay | null;
}
const readCache = (): MealCache | null => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
  } catch {
    return null;
  }
};
/** "돼지불고기(5.6.10.13)" → "돼지불고기" */
const cleanDish = (d: string) => d.replace(/\s*\(?[\d.\s]+\)?\s*$/g, '').replace(/[*#]+/g, '').trim();
const dishEmoji = (d: string) =>
  /밥|덮밥|비빔/.test(d) ? '🍚' : /국|탕|찌개|스프/.test(d) ? '🍲' : /김치|깍두기/.test(d) ? '🥬' : /우유|요구르트|요거트/.test(d) ? '🥛' : /과일|사과|귤|바나나|포도|수박|딸기|배|키위|오렌지/.test(d) ? '🍎' : /빵|케이크|쿠키|머핀/.test(d) ? '🍞' : /면|국수|파스타|스파게티|우동|짜장/.test(d) ? '🍜' : /닭|치킨/.test(d) ? '🍗' : /돈가스|까스|튀김/.test(d) ? '🍤' : /고기|불고기|갈비|제육|돼지|소|육/.test(d) ? '🍖' : /생선|고등어|삼치|연어|조기|오징어|새우/.test(d) ? '🐟' : '🥢';

const ALLERGY: Record<number, string> = { 1: '난류', 2: '우유', 3: '메밀', 4: '땅콩', 5: '대두', 6: '밀', 7: '고등어', 8: '게', 9: '새우', 10: '돼지고기', 11: '복숭아', 12: '토마토', 13: '아황산류', 14: '호두', 15: '닭고기', 16: '쇠고기', 17: '오징어', 18: '조개류', 19: '잣' };
/** 탄수화물 · 단백질 · 지방만 골라 짧게 */
const MACROS: [RegExp, string, string][] = [
  [/탄수화물/, '탄', '#fde68a'],
  [/단백질/, '단', '#a7f3d0'],
  [/지방/, '지', '#fbcfe8'],
];
const num = (s: string) => parseFloat(String(s).replace(/[^\d.]/g, '')) || 0;
/** "쌀 : 국내산 , 김치류 : 국내산 …" → [['쌀','국내산'], …] (국내산은 묶어서) */
const originSummary = (raw: string) => {
  const parts = String(raw || '')
    .split(/\n|<br\s*\/?>|,(?![^()]*\))/i)
    .map((x) => x.split(/\s*:\s*/))
    .filter((x) => x.length >= 2 && x[0].trim() && x[1].trim() && !/비고/.test(x[0]))
    .map((x) => [x[0].trim(), x.slice(1).join(':').trim()] as [string, string]);
  const domestic = parts.filter((p) => /^국내산/.test(p[1])).map((p) => p[0]);
  const foreign = parts.filter((p) => !/^국내산/.test(p[1]));
  return { domestic, foreign };
};

export const MiniMealStackWidget: React.FC<{ onShowToast?: (m: string) => void }> = () => {
  const [cache, setCache] = useState<MealCache | null>(readCache);
  const [which, setWhich] = useState<'today' | 'next'>('today');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const s = getSavedSchool();
    if (!s) return;
    setLoading(true);
    const today = new Date();
    const end = new Date(today);
    end.setDate(today.getDate() + 14);
    const r = await fetchMeals(s, toYmd(today), toYmd(end));
    setLoading(false);
    if (!r.ok) return;
    const t = toYmd(today);
    const conv = (m: (typeof r.days)[number] | undefined): SchoolMealDay | null => {
      if (!m) return null;
      const d = new Date(Number(m.ymd.slice(0, 4)), Number(m.ymd.slice(4, 6)) - 1, Number(m.ymd.slice(6, 8)));
      return {
        date: `${m.ymd.slice(0, 4)}.${m.ymd.slice(4, 6)}.${m.ymd.slice(6, 8)}`,
        dayOfWeek: `${DAY_NAMES[d.getDay()]}요일`,
        mealType: m.mealName || '중식',
        calorie: m.calorie || '-',
        menuItems: m.dishes,
        nutrients: m.nutrients.map((n) => ({ name: n.name, amount: n.amount })),
        originInfo: m.origin || '정보 없음',
        specialNote: '※ 학교알리미(NEIS) 급식 식단',
      } as SchoolMealDay;
    };
    const next: MealCache = { schoolCode: s.schoolCode, fetchedYmd: t, today: conv(r.days.find((d) => d.ymd === t)), next: conv(r.days.find((d) => d.ymd > t)) };
    setCache(next);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(next));
    } catch {}
  };

  useEffect(() => {
    const s = getSavedSchool();
    const c = readCache();
    if (s && (!c || c.fetchedYmd !== toYmd(new Date()) || c.schoolCode !== s.schoolCode)) void load();
    const re = () => setCache(readCache());
    const onStorage = (e: StorageEvent) => e.key === CACHE_KEY && re();
    window.addEventListener('storage', onStorage);
    window.addEventListener(NEIS_SCHOOL_EVENT, () => void load());
    const t = window.setInterval(re, 60_000);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const meal = which === 'today' ? cache?.today : cache?.next;
  const hasSchool = !!getSavedSchool();
  const label = (m: SchoolMealDay | null | undefined) => {
    if (!m) return '';
    const [, mm, dd] = m.date.split('.');
    return `${Number(mm)}월 ${Number(dd)}일 (${m.dayOfWeek.slice(0, 1)})`;
  };

  return (
    <section className="mm-stack w-full h-full flex flex-col overflow-hidden rounded-2xl p-2.5 border" data-mini-meal>
      <div className="mm-head">
        <b>🍱 {which === 'today' ? '오늘의 급식' : '다음 급식'}</b>
        <div className="mm-seg">
          <button type="button" className={which === 'today' ? 'is-on' : ''} onClick={() => setWhich('today')}>
            오늘
          </button>
          <button type="button" className={which === 'next' ? 'is-on' : ''} onClick={() => setWhich('next')}>
            다음
          </button>
          <button type="button" onClick={() => void load()} title="새로 불러오기" disabled={loading || !hasSchool}>
            {loading ? '⏳' : '↻'}
          </button>
        </div>
      </div>
      {meal ? (
        <>
          <div className="mm-sub">
            <span className="mm-pill">📅 {label(meal)}</span>
            <span className="mm-pill">{meal.mealType}</span>
            {meal.calorie && meal.calorie !== '-' && <span className="mm-pill is-kcal">🔥 {meal.calorie}</span>}
          </div>
          <div className="mm-scroll">
            <ul className="mm-list">
              {meal.menuItems.map((d, i) => {
                const n = cleanDish(typeof d === 'string' ? d : d?.name || '');
                const al = typeof d === 'string' ? [] : d?.allergies || [];
                return n ? (
                  <li key={i} title={al.length ? `알레르기: ${al.map((a) => ALLERGY[a] || a).join(', ')}` : undefined}>
                    <span>{dishEmoji(n)}</span>
                    <em>{n}</em>
                    {al.length > 0 && <sup>{al.length}</sup>}
                  </li>
                ) : null;
              })}
            </ul>
            {(() => {
              const macros = MACROS.map(([re, short, col]) => {
                const f = (meal.nutrients || []).find((x) => re.test(x.name));
                return f ? { short, col, v: num(f.amount), unit: /\(([^)]+)\)/.exec(f.name)?.[1] || 'g' } : null;
              }).filter(Boolean) as { short: string; col: string; v: number; unit: string }[];
              const total = macros.reduce((a, m) => a + m.v, 0) || 1;
              const allergies = Array.from(new Set(meal.menuItems.flatMap((d: any) => (typeof d === 'string' ? [] : d?.allergies || [])))).sort((a, b) => a - b);
              const org = originSummary(meal.originInfo);
              return (
                <div className="mm-info" data-mm-info>
                  {macros.length > 0 && (
                    <div className="mm-row">
                      <b>영양</b>
                      <div className="mm-bar" aria-hidden>
                        {macros.map((m) => (
                          <i key={m.short} style={{ flex: m.v / total, background: m.col }} />
                        ))}
                      </div>
                      <span className="mm-macros">
                        {macros.map((m) => (
                          <span key={m.short}>
                            <i style={{ background: m.col }} />
                            {m.short} {Math.round(m.v)}
                            {m.unit}
                          </span>
                        ))}
                      </span>
                    </div>
                  )}
                  {allergies.length > 0 && (
                    <div className="mm-row">
                      <b>알레르기</b>
                      <span className="mm-tags">
                        {allergies.map((a) => (
                          <span key={a} className="mm-tag">
                            {ALLERGY[a] || a}
                          </span>
                        ))}
                      </span>
                    </div>
                  )}
                  {(org.domestic.length > 0 || org.foreign.length > 0) && (
                    <div className="mm-row" title={meal.originInfo}>
                      <b>원산지</b>
                      <span className="mm-origin">
                        {org.domestic.length > 0 && <span>🇰🇷 {org.domestic.slice(0, 4).join('·')}{org.domestic.length > 4 ? ` 외 ${org.domestic.length - 4}` : ''} 국내산</span>}
                        {org.foreign.slice(0, 3).map(([k, v]) => (
                          <span key={k}>
                            🌏 {k}: {v}
                          </span>
                        ))}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </>
      ) : (
        <div className="mm-empty">
          {!hasSchool ? (
            <>
              🏫 급식 위젯의 🔍에서 학교를 한 번 골라 주세요.
              <br />
              그다음부터 여기에 자동으로 나와요.
            </>
          ) : loading ? (
            '급식을 불러오는 중이에요…'
          ) : which === 'today' ? (
            '오늘은 급식이 없어요 🍙'
          ) : (
            '다음 급식 정보가 아직 없어요'
          )}
        </div>
      )}
    </section>
  );
};
