/**
 * ============================================================================
 * 📚 주간학습안내 → 시간표 (파일 읽기 · 구글 드라이브 공유 폴더 · AI 보조 판독)
 * ============================================================================
 *  ① PDF: 글자 위치를 읽어 '요일 × 교시' 표를 판독 (인터넷·API 키 불필요)
 *  ② 스캔본 PDF · 사진: Gemini API 키가 있으면 AI가 표를 읽음
 *  ③ 구글 드라이브: '링크가 있는 모든 사용자' 공유 폴더에서 이번 주 파일을 이름의 날짜로 찾아 ①/②로 판독
 *     (구글 문서·스프레드시트는 PDF로 내보내서 읽음)
 */
import type { DailySchedule } from '../types';
import { WEEK_DAYS, cellDetail, findWeekStart, mondayOf, parseWeeklyPlanPages, type ParsedWeeklyPlan, type WeekDay } from './weeklyPlanParser';
import type { WeeklyPlanDetail } from './weeklyPlanDetail';

/** 판독 결과 → 교시별 학습 내용 · 쪽수 (보조화면 '다음 수업 안내'용) */
export function planToDetail(plan: ParsedWeeklyPlan, weekStart: string | null | undefined): WeeklyPlanDetail | null {
  if (!weekStart) return null;
  const days: WeeklyPlanDetail['days'] = {};
  WEEK_DAYS.forEach((d) => {
    days[d] = {};
    Object.entries(plan.days[d] || {}).forEach(([p, subject]) => {
      const { topic, pages } = cellDetail(plan.cellText?.[d]?.[Number(p)] || '');
      days[d][Number(p)] = { subject: String(subject || ''), topic: topic === subject ? '' : topic, pages };
    });
  });
  return { weekStart, days };
}
import { fetchExternalText } from './secureFetch';
import { geminiGenerateJson, getStoredGeminiApiKey } from './geminiApi';

// ── 과목 색 ──────────────────────────────────────────────────────────────
const SUBJECT_COLORS: Record<string, string> = {
  국어: 'bg-indigo-600 text-white',
  수학: 'bg-amber-600 text-white',
  사회: 'bg-cyan-600 text-white',
  과학: 'bg-emerald-600 text-white',
  영어: 'bg-sky-600 text-white',
  체육: 'bg-rose-600 text-white',
  음악: 'bg-teal-600 text-white',
  미술: 'bg-orange-600 text-white',
  도덕: 'bg-purple-600 text-white',
  실과: 'bg-lime-600 text-white',
  바른생활: 'bg-pink-600 text-white',
  슬기로운생활: 'bg-green-600 text-white',
  즐거운생활: 'bg-yellow-600 text-white',
};
export const subjectColor = (s: string) =>
  SUBJECT_COLORS[s] || (/휴업|공휴일|기념일|휴일/.test(s) ? 'bg-slate-400 text-white' : /체험|운동회|학예회|식$/.test(s) ? 'bg-fuchsia-600 text-white' : 'bg-slate-600 text-white');

export function planToSchedule(plan: ParsedWeeklyPlan): DailySchedule {
  const out: DailySchedule = {};
  for (const d of WEEK_DAYS) {
    out[d] = Object.entries(plan.days[d] || {})
      .map(([p, subject]) => ({ period: Number(p), subject, color: subjectColor(subject) }))
      .filter((x) => x.subject)
      .sort((a, b) => a.period - b.period);
  }
  return out;
}

export interface WeeklyPlanResult {
  ok: boolean;
  plan?: ParsedWeeklyPlan;
  schedule?: DailySchedule;
  weekStart?: string | null;
  via?: 'layout' | 'ai';
  message: string;
}

const b64ToBuf = (b64: string) => {
  const bin = atob(b64);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u.buffer;
};
const bufToB64 = (buf: ArrayBuffer) => {
  const u = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
};

// ── AI 판독 ──────────────────────────────────────────────────────────────
async function readWithAI(base64: string, mimeType: string, fileName: string): Promise<WeeklyPlanResult> {
  const prompt = `다음은 대한민국 초등학교의 '주간학습안내' 문서입니다. 표에서 요일(월~금)별 교시(1~6교시)의 과목 이름만 정확히 읽어 주세요.
규칙:
- 과목 이름은 짧게: 국어, 수학, 사회, 과학, 영어, 체육, 음악, 미술, 도덕, 실과, 바른생활, 슬기로운생활, 즐거운생활, 창체, 자율, 동아리, 진로, 봉사, 안전 등
- 학습 내용·단원명·준비물은 넣지 마세요. 빈 교시는 넣지 마세요.
- 하루 전체가 휴업·공휴일·현장체험학습 같은 행사라면 그 요일 모든 교시에 행사 이름을 넣으세요.
- weekStart: 이 주의 월요일 날짜 (YYYY-MM-DD, 모르면 null)
반드시 다음 JSON만 응답: {"weekStart":"2026-11-02","days":{"월":{"1":"국어","2":"수학"},"화":{},"수":{},"목":{},"금":{}}}`;
  const r = await geminiGenerateJson<{ weekStart?: string | null; days?: Record<string, Record<string, string>> }>(prompt, { mimeType, base64 });
  if (!r.success || !r.data?.days) return { ok: false, message: r.message || 'AI가 표를 읽지 못했습니다.' };
  const days = Object.fromEntries(WEEK_DAYS.map((d) => [d, {} as Record<number, string>])) as ParsedWeeklyPlan['days'];
  let filled = 0;
  let maxPeriod = 0;
  const aiDays: Record<string, Record<string, string>> = r.data.days;
  for (const d of WEEK_DAYS) {
    const row: Record<string, string> = aiDays[d] || {};
    for (const [p, s] of Object.entries(row)) {
      const n = Number(p);
      if (n >= 1 && n <= 8 && typeof s === 'string' && s.trim()) {
        days[d][n] = s.trim().slice(0, 10);
        filled++;
        maxPeriod = Math.max(maxPeriod, n);
      }
    }
  }
  if (filled < 5) return { ok: false, message: 'AI가 시간표 칸을 충분히 찾지 못했습니다.' };
  const ws = r.data.weekStart && /^\d{4}-\d{2}-\d{2}$/.test(r.data.weekStart) ? r.data.weekStart : findWeekStart(fileName);
  const plan: ParsedWeeklyPlan = { weekStart: ws, days, filled, maxPeriod, orientation: 'days-as-columns', cellText: days };
  return { ok: true, plan, schedule: planToSchedule(plan), weekStart: ws, via: 'ai', message: `AI 판독으로 ${filled}칸을 읽었어요.` };
}

/** 파일 하나(바이트)를 시간표로 */
export async function readWeeklyPlanBytes(data: ArrayBuffer, fileName: string, mimeType = ''): Promise<WeeklyPlanResult> {
  const lower = fileName.toLowerCase();
  const isPdf = mimeType.includes('pdf') || lower.endsWith('.pdf') || new TextDecoder().decode(new Uint8Array(data.slice(0, 5))) === '%PDF-';
  const isImage = /^image\//.test(mimeType) || /\.(png|jpe?g|webp|heic)$/.test(lower);
  const hasKey = !!getStoredGeminiApiKey();

  if (/\.(hwp|hwpx)$/.test(lower)) {
    return { ok: false, message: '한글(HWP) 파일은 바로 읽을 수 없어요. 한글에서 [파일 → PDF로 저장] 후 PDF를 올려 주세요.' };
  }

  if (isPdf) {
    try {
      const { extractPdfPages } = await import('./weeklyPlanPdf');
      const pages = await extractPdfPages(data);
      const textCount = pages.reduce((n, p) => n + p.length, 0);
      const plan = parseWeeklyPlanPages(pages, fileName);
      if (plan && plan.filled >= 8) {
        return {
          ok: true,
          plan,
          schedule: planToSchedule(plan),
          weekStart: plan.weekStart,
          via: 'layout',
          message: `표에서 ${plan.filled}칸을 읽었어요.`,
        };
      }
      if (hasKey) return readWithAI(bufToB64(data), 'application/pdf', fileName);
      return {
        ok: false,
        message:
          textCount < 20
            ? '글자가 없는 스캔본(그림) PDF예요. [5단계 → Gemini API 키]를 등록하면 AI가 읽을 수 있어요.'
            : '파일에서 요일·교시 표를 찾지 못했어요. Gemini API 키를 등록하면 AI 판독을 시도할 수 있어요.',
      };
    } catch (e: any) {
      if (hasKey) return readWithAI(bufToB64(data), 'application/pdf', fileName);
      return { ok: false, message: `PDF를 열지 못했어요: ${e?.message || e}` };
    }
  }
  if (isImage) {
    if (!hasKey) return { ok: false, message: '사진(이미지)은 AI 판독이 필요해요. [5단계 → Gemini API 키]를 먼저 등록해 주세요.' };
    return readWithAI(bufToB64(data), mimeType || 'image/png', fileName);
  }
  return { ok: false, message: 'PDF 또는 사진(PNG·JPG) 파일을 올려 주세요.' };
}

// ── 구글 드라이브 공유 폴더 ─────────────────────────────────────────────
export interface DriveEntry {
  id: string;
  name: string;
  kind: 'file' | 'folder' | 'gdoc' | 'gsheet';
}

export function extractDriveFolderId(url: string): string | null {
  const t = url.trim();
  const m = t.match(/folders\/([a-zA-Z0-9_-]{10,})/) || t.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (m) return m[1];
  return /^[a-zA-Z0-9_-]{20,}$/.test(t) ? t : null;
}

const decodeHtml = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

/** 공유 폴더 목록 (구글 드라이브 '폴더 임베드' 화면을 읽음 · 로그인 불필요) */
export async function listDriveFolder(folderId: string): Promise<{ ok: boolean; entries: DriveEntry[]; message?: string }> {
  const res = await fetchExternalText(`https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folderId)}`, 15000);
  if (!res.ok || !res.text) {
    return {
      ok: false,
      entries: [],
      message:
        res.status === 404 || res.status === 403
          ? '폴더를 열 수 없어요. 폴더 공유를 [링크가 있는 모든 사용자 · 뷰어]로 바꿔 주세요.'
          : `구글 드라이브에 연결하지 못했어요 (${res.error || res.status}). 데스크톱 앱에서 인터넷 연결을 확인해 주세요.`,
    };
  }
  const html = res.text;
  if (!html.includes('flip-entry') && /accounts\.google\.com|ServiceLogin|signin/i.test(html)) {
    return { ok: false, entries: [], message: '비공개 폴더예요. 폴더 공유를 [링크가 있는 모든 사용자 · 뷰어]로 바꿔 주세요.' };
  }
  const entries: DriveEntry[] = [];
  // 항목마다 id="entry-<파일ID>" 가 있고 그 뒤에 링크·제목이 옵니다 (속성 순서와 무관하게 구간으로 자름)
  const idRe = /id="entry-([a-zA-Z0-9_-]+)"/g;
  const marks: Array<{ id: string; at: number }> = [];
  let mm: RegExpExecArray | null;
  while ((mm = idRe.exec(html))) marks.push({ id: mm[1], at: mm.index });
  marks.forEach((mk, i) => {
    const seg = html.slice(mk.at, i + 1 < marks.length ? marks[i + 1].at : mk.at + 4000);
    const href = decodeHtml(seg.match(/href="([^"]+)"/)?.[1] || '');
    const title = decodeHtml((seg.match(/class="flip-entry-title"[^>]*>([^<]*)</)?.[1] || '').trim());
    if (!title) return;
    const kind: DriveEntry['kind'] = /\/folders\//.test(href)
      ? 'folder'
      : /docs\.google\.com\/document/.test(href)
      ? 'gdoc'
      : /docs\.google\.com\/spreadsheets/.test(href)
      ? 'gsheet'
      : 'file';
    entries.push({ id: mk.id, name: title, kind });
  });
  if (!entries.length && !html.includes('flip-entry')) {
    return { ok: false, entries: [], message: '폴더 내용을 읽지 못했어요. 주소가 맞는지, 공유가 켜져 있는지 확인해 주세요.' };
  }
  return { ok: true, entries };
}

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** 파일 이름의 날짜로 '그 주' 파일 고르기 (하위 폴더 한 단계까지) */
export async function findWeekFileInFolder(
  folderId: string,
  target: Date = new Date()
): Promise<{ ok: boolean; entry?: DriveEntry; weekStart?: string; files?: DriveEntry[]; message: string }> {
  const monday = ymd(mondayOf(target));
  const list = await listDriveFolder(folderId);
  if (!list.ok) return { ok: false, message: list.message || '폴더를 읽지 못했어요.' };
  const readable = (e: DriveEntry) => e.kind !== 'folder' && (e.kind !== 'file' || /\.(pdf|png|jpe?g|webp)$/i.test(e.name) || !/\.\w{2,5}$/.test(e.name));
  const match = (es: DriveEntry[]) => es.filter(readable).find((e) => findWeekStart(e.name, target) === monday);
  let entry = match(list.entries);
  let files = list.entries.filter(readable);
  if (!entry) {
    const mo = target.getMonth() + 1;
    const subs = list.entries
      .filter((e) => e.kind === 'folder')
      .sort((a, b) => Number(new RegExp(`(^|\\D)${mo}\\s*월`).test(b.name)) - Number(new RegExp(`(^|\\D)${mo}\\s*월`).test(a.name)))
      .slice(0, 8);
    for (const s of subs) {
      const sub = await listDriveFolder(s.id);
      if (!sub.ok) continue;
      files = files.concat(sub.entries.filter(readable));
      entry = match(sub.entries);
      if (entry) break;
    }
  }
  if (!entry) {
    const hwp = list.entries.some((e) => /\.(hwp|hwpx)$/i.test(e.name));
    return {
      ok: false,
      files,
      message: `이번 주(${monday.slice(5).replace('-', '월 ')}일 시작) 파일을 찾지 못했어요. 파일 이름에 '11월 2일' 또는 '11.2~11.6'처럼 날짜를 넣어 주세요.${hwp ? ' (HWP 파일은 PDF로 저장해서 올려 주세요)' : ''}`,
    };
  }
  return { ok: true, entry, weekStart: monday, files, message: `감지된 파일: ${entry.name}` };
}

/** 드라이브 파일 내려받기 (구글 문서·시트는 PDF로 내보내기) */
export async function downloadDriveEntry(entry: DriveEntry): Promise<{ ok: boolean; data?: ArrayBuffer; mimeType?: string; message?: string }> {
  const url =
    entry.kind === 'gdoc'
      ? `https://docs.google.com/document/d/${entry.id}/export?format=pdf`
      : entry.kind === 'gsheet'
      ? `https://docs.google.com/spreadsheets/d/${entry.id}/export?format=pdf&portrait=false&fitw=true`
      : `https://drive.google.com/uc?export=download&id=${entry.id}`;
  const api = (window as any).electronAPI;
  if (api?.fetchBinary) {
    const r = await api.fetchBinary(url);
    if (!r?.ok || !r.base64) return { ok: false, message: r?.error || `내려받기 실패 (HTTP ${r?.status})` };
    if (/text\/html/.test(r.contentType || '')) {
      return { ok: false, message: '파일을 내려받지 못했어요. 파일 공유가 [링크가 있는 모든 사용자]인지 확인해 주세요.' };
    }
    return { ok: true, data: b64ToBuf(r.base64), mimeType: r.contentType || '' };
  }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { ok: true, data: await res.arrayBuffer(), mimeType: res.headers.get('content-type') || '' };
  } catch {
    return { ok: false, message: '웹 브라우저에서는 구글 드라이브 파일을 직접 받을 수 없어요. 데스크톱 앱에서 이용해 주세요.' };
  }
}

/** 공유 폴더 → 이번 주 시간표 (한 번에) */
export async function syncWeekFromDrive(folderId: string, target: Date = new Date()): Promise<WeeklyPlanResult & { fileName?: string }> {
  const found = await findWeekFileInFolder(folderId, target);
  if (!found.ok || !found.entry) return { ok: false, message: found.message };
  const dl = await downloadDriveEntry(found.entry);
  if (!dl.ok || !dl.data) return { ok: false, message: dl.message || '파일을 받지 못했어요.', fileName: found.entry.name };
  const name = found.entry.kind === 'file' ? found.entry.name : `${found.entry.name}.pdf`;
  const r = await readWeeklyPlanBytes(dl.data, name, dl.mimeType || '');
  const weekStart = r.weekStart || found.weekStart;
  // 📚 교시별 학습 내용 · 쪽수도 함께 (보조화면 '다음 수업 안내')
  if (r.ok && r.plan) {
    const { saveWeeklyPlanDetail } = await import('./weeklyPlanDetail');
    saveWeeklyPlanDetail(planToDetail(r.plan, weekStart));
  }
  return { ...r, weekStart, fileName: found.entry.name };
}

export const isDayKey = (k: string): k is WeekDay => (WEEK_DAYS as readonly string[]).includes(k);
