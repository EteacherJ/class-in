/**
 * ============================================================================
 * 🏫 NEIS(학교알리미 공공데이터) 학교 찾기 · 급식 불러오기
 * ============================================================================
 * - 같은 이름의 학교가 여러 곳이면(예: 경기 ○○초 / 인천 ○○초) 목록을 돌려주고,
 *   선생님이 지역(주소)을 골라 '교육청 코드 + 학교 코드'로 정확히 저장합니다.
 * - 저장한 학교 정보는 환경설정과 급식 위젯이 함께 씁니다.
 */
import { fetchExternalJson } from './secureFetch';

export interface NeisSchool {
  eduCode: string; // ATPT_OFCDC_SC_CODE
  eduName: string; // ATPT_OFCDC_SC_NM (예: 경기도교육청)
  schoolCode: string; // SD_SCHUL_CODE
  name: string; // SCHUL_NM
  kind: string; // SCHUL_KND_SC_NM (초등학교 등)
  region: string; // LCTN_SC_NM (경기도)
  address: string; // ORG_RDNMA (도로명 주소)
}

const STORE_KEY = 'class_school_neis_v1';

/** 시·도 교육청 코드 */
export const EDU_OFFICES: Array<{ code: string; name: string }> = [
  { code: 'B10', name: '서울' },
  { code: 'C10', name: '부산' },
  { code: 'D10', name: '대구' },
  { code: 'E10', name: '인천' },
  { code: 'F10', name: '광주' },
  { code: 'G10', name: '대전' },
  { code: 'H10', name: '울산' },
  { code: 'I10', name: '세종' },
  { code: 'J10', name: '경기' },
  { code: 'K10', name: '강원' },
  { code: 'M10', name: '충북' },
  { code: 'N10', name: '충남' },
  { code: 'P10', name: '전북' },
  { code: 'Q10', name: '전남' },
  { code: 'R10', name: '경북' },
  { code: 'S10', name: '경남' },
  { code: 'T10', name: '제주' },
];

/** (선택) NEIS 오픈API 인증키 — 없으면 한 번에 5건까지만 조회됩니다 */
const neisKeyParam = () => {
  try {
    const k = (localStorage.getItem('class_neis_api_key') || '').trim();
    return k ? `&KEY=${encodeURIComponent(k)}` : '';
  } catch {
    return '';
  }
};
export const NEIS_SCHOOL_EVENT = 'class-neis-school-changed';

export function getSavedSchool(): NeisSchool | null {
  try {
    const v = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    return v && v.eduCode && v.schoolCode ? v : null;
  } catch {
    return null;
  }
}

export function saveSchool(s: NeisSchool | null) {
  try {
    if (s) localStorage.setItem(STORE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STORE_KEY);
  } catch {}
  window.dispatchEvent(new CustomEvent(NEIS_SCHOOL_EVENT, { detail: s }));
}

/** 주소에서 '시·군·구'까지 짧게 (예: 경기도 수원시) */
export const shortAddress = (s: NeisSchool) => {
  const parts = (s.address || '').split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).join(' ') || s.region || s.eduName;
};

/** 학교 이름으로 검색 (지역 글자를 함께 넣으면 걸러 줌: "한빛초 수원") */
export async function searchSchools(query: string, eduCode = ''): Promise<{ ok: boolean; schools: NeisSchool[]; message?: string }> {
  const q = query.trim();
  if (!q) return { ok: false, schools: [], message: '학교 이름을 입력해 주세요.' };
  // "학교이름 지역" 형태 분리
  const words = q.split(/\s+/);
  const nameWord = words.find((w) => /(초|중|고|학교)$/.test(w)) || words[0];
  const regionWords = words.filter((w) => w !== nameWord);
  // '한빛초' → '한빛초등학교' 로도 찾기
  const name = /초$/.test(nameWord) ? `${nameWord}등학교` : /중$/.test(nameWord) ? `${nameWord}학교` : /고$/.test(nameWord) ? `${nameWord}등학교` : nameWord;
  try {
    const json = await fetchExternalJson<any>(
      `https://open.neis.go.kr/hub/schoolInfo?Type=json&pIndex=1&pSize=${neisKeyParam() ? 100 : 5}${neisKeyParam()}&SCHUL_NM=${encodeURIComponent(name)}${eduCode ? `&ATPT_OFCDC_SC_CODE=${eduCode}` : ''}`,
      12000
    );
    const rows: any[] = json?.schoolInfo?.[1]?.row || [];
    let schools: NeisSchool[] = rows.map((r) => ({
      eduCode: r.ATPT_OFCDC_SC_CODE,
      eduName: r.ATPT_OFCDC_SC_NM,
      schoolCode: r.SD_SCHUL_CODE,
      name: r.SCHUL_NM,
      kind: r.SCHUL_KND_SC_NM || '',
      region: r.LCTN_SC_NM || '',
      address: r.ORG_RDNMA || '',
    }));
    if (regionWords.length) {
      const filtered = schools.filter((s) => regionWords.every((w) => `${s.address} ${s.region} ${s.eduName}`.includes(w.replace(/(시|군|구|도)$/, ''))));
      if (filtered.length) schools = filtered;
    }
    if (!schools.length) {
      const code = json?.RESULT?.CODE;
      return { ok: false, schools: [], message: code === 'INFO-200' ? `'${name}'(으)로 찾은 학교가 없어요. 정확한 학교 이름을 입력해 주세요.` : '학교를 찾지 못했어요.' };
    }
    return { ok: true, schools };
  } catch (e: any) {
    return { ok: false, schools: [], message: `학교알리미(NEIS)에 연결하지 못했어요: ${e?.message || e}` };
  }
}

export interface MealDay {
  ymd: string; // YYYYMMDD
  dishes: { name: string; allergies: number[] }[];
  calorie: string;
  nutrients: { name: string; amount: string }[];
  origin: string;
  mealName: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
export const toYmd = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

/** 급식: from ~ to (YYYYMMDD) 중식 위주 */
export async function fetchMeals(s: NeisSchool, from: string, to: string): Promise<{ ok: boolean; days: MealDay[]; message?: string }> {
  try {
    const json = await fetchExternalJson<any>(
      `https://open.neis.go.kr/hub/mealServiceDietInfo?Type=json&pIndex=1&pSize=${neisKeyParam() ? 60 : 5}${neisKeyParam()}&ATPT_OFCDC_SC_CODE=${s.eduCode}&SD_SCHUL_CODE=${s.schoolCode}&MLSV_FROM_YMD=${from}&MLSV_TO_YMD=${to}`,
      12000
    );
    const rows: any[] = json?.mealServiceDietInfo?.[1]?.row || [];
    const byDay = new Map<string, any>();
    for (const r of rows) {
      const prev = byDay.get(r.MLSV_YMD);
      // 하루에 조식·중식·석식이 있으면 중식(2) 우선
      if (!prev || String(r.MMEAL_SC_CODE) === '2') byDay.set(r.MLSV_YMD, r);
    }
    const days: MealDay[] = [...byDay.values()]
      .sort((a, b) => String(a.MLSV_YMD).localeCompare(String(b.MLSV_YMD)))
      .map((r) => ({
        ymd: String(r.MLSV_YMD),
        mealName: r.MMEAL_SC_NM || '중식',
        calorie: r.CAL_INFO || '',
        origin: String(r.ORPLC_INFO || '')
          .split(/<br\s*\/?>/i)
          .map((x: string) => x.trim())
          .filter(Boolean)
          .slice(0, 8)
          .join(', '),
        nutrients: String(r.NTR_INFO || '')
          .split(/<br\s*\/?>/i)
          .map((x: string) => x.trim())
          .filter(Boolean)
          .map((x: string) => {
            const [n, v] = x.split(':').map((t) => t.trim());
            return { name: (n || '').replace(/\(.*\)/, '').trim(), amount: `${v || ''}${(n.match(/\((.*)\)/) || [])[1] ? ` ${(n.match(/\((.*)\)/) || [])[1]}` : ''}` };
          })
          .filter((x) => x.name),
        dishes: String(r.DDISH_NM || '')
          .split(/<br\s*\/?>/i)
          .map((d: string) => d.trim())
          .filter(Boolean)
          .map((d: string) => {
            const nums = (d.match(/\(([\d.\s]+)\)/)?.[1] || '')
              .split('.')
              .map((x) => parseInt(x, 10))
              .filter((n) => !isNaN(n));
            return { name: d.replace(/\([\d.\s]+\)/g, '').replace(/\s+/g, ' ').trim(), allergies: [...new Set(nums)].sort((a, b) => a - b) };
          }),
      }));
    return { ok: true, days };
  } catch (e: any) {
    return { ok: false, days: [], message: `급식 정보를 불러오지 못했어요: ${e?.message || e}` };
  }
}
