/**
 * 🗓️ 캘린더 위젯 연결 도우미
 *  ① 구글 캘린더 양방향 연결 (Apps Script 웹 앱) — 읽기 · 추가 · 삭제가 구글 캘린더에 바로 반영 (추천)
 *  ② iCal 비공개 주소 (.ics) — 읽기 전용, 자동 새로고침
 *  ③ .ics 파일 가져오기 — 한 번 불러오기 (인터넷이 막힌 PC용)
 */
import type { GoogleCalendarEvent } from '../types';

export type CalSource = 'gas' | 'ical' | 'file' | 'local';
export interface CalEvent extends GoogleCalendarEvent {
  source?: CalSource;
  /** 구글 캘린더 일정 ID (양방향 연결) */
  gid?: string;
  allDay?: boolean;
  recurring?: boolean;
  endDate?: string;
}

export const CAL_KEYS = {
  events: 'class_calendar_events',
  hidden: 'class_calendar_hidden_ids',
  ical: 'class_dashboard_google_calendar_url',
  gas: 'class_calendar_gas_url',
  fileName: 'class_calendar_file_name',
  lastSync: 'class_calendar_last_sync',
};

export const GOOGLE_CALENDAR_SCRIPT_CODE = `// [Class in 캘린더 양방향 연결 Apps Script]
// 대시보드 캘린더 위젯에서 일정을 읽고, 추가하고, 지우면 내 구글 캘린더에 바로 반영돼요.
// 기본 캘린더를 씁니다. 다른 캘린더를 쓰려면 [프로젝트 설정 → 스크립트 속성]에 CALENDAR_ID 를 추가하세요.

function cal_() {
  var id = PropertiesService.getScriptProperties().getProperty("CALENDAR_ID");
  return id ? CalendarApp.getCalendarById(id) : CalendarApp.getDefaultCalendar();
}

// (선택) 보안 토큰: 스크립트 속성에 WEBHOOK_TOKEN 을 추가하고, 웹 앱 주소 끝에 ?token=같은값 을 붙이세요.
function ok_(e) {
  var t = PropertiesService.getScriptProperties().getProperty("WEBHOOK_TOKEN");
  return !t || (e && e.parameter && e.parameter.token === t);
}

function doGet(e) {
  return json_({ status: "success", message: "Class in 캘린더 연결 웹 앱이 정상 작동 중입니다.", calendar: cal_().getName() });
}

function doPost(e) {
  try {
    if (!ok_(e)) return json_({ status: "error", message: "unauthorized" });
    var req = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    var cal = cal_();
    var tz = Session.getScriptTimeZone() || "Asia/Seoul";

    if (req.action === "list") {
      var from = new Date(req.from + "T00:00:00"), to = new Date(req.to + "T23:59:59");
      var list = cal.getEvents(from, to).map(function (ev) {
        var s = ev.getStartTime(), en = ev.getEndTime(), all = ev.isAllDayEvent();
        return {
          id: ev.getId() + "@" + Utilities.formatDate(s, tz, "yyyy-MM-dd"),
          gid: ev.getId(),
          title: ev.getTitle(),
          date: Utilities.formatDate(s, tz, "yyyy-MM-dd"),
          endDate: Utilities.formatDate(all ? new Date(en.getTime() - 1) : en, tz, "yyyy-MM-dd"),
          time: all ? "" : Utilities.formatDate(s, tz, "HH:mm") + " - " + Utilities.formatDate(en, tz, "HH:mm"),
          allDay: all,
          recurring: ev.isRecurringEvent()
        };
      });
      return json_({ status: "success", calendar: cal.getName(), events: list });
    }

    if (req.action === "add") {
      var ev;
      if (req.start && req.end) ev = cal.createEvent(req.title, new Date(req.date + "T" + req.start + ":00"), new Date(req.date + "T" + req.end + ":00"));
      else ev = cal.createAllDayEvent(req.title, new Date(req.date + "T00:00:00"));
      return json_({ status: "success", gid: ev.getId() });
    }

    if (req.action === "delete") {
      var day = new Date(req.date + "T00:00:00");
      var found = cal.getEventsForDay(day).filter(function (x) { return x.getId() === req.gid; });
      if (!found.length) return json_({ status: "error", message: "구글 캘린더에서 일정을 찾지 못했어요. 이미 지워졌을 수 있어요." });
      found[0].deleteEvent();
      return json_({ status: "success" });
    }

    return json_({ status: "error", message: "알 수 없는 요청입니다." });
  } catch (err) {
    return json_({ status: "error", message: String(err) });
  }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}`;

export const isGasUrl = (u: string) => /^https:\/\/script\.google(usercontent)?\.com\//.test(u.trim());

async function callGas(url: string, body: object): Promise<any> {
  const payload = JSON.stringify(body);
  const api = (window as any).electronAPI;
  let text = '';
  if (api?.postJson) {
    const r = await api.postJson(url.trim(), payload);
    if (!r?.ok) throw new Error(r?.error || `HTTP ${r?.status}`);
    text = String(r.text || '');
  } else {
    const r = await fetch(url.trim(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: payload });
    text = await r.text();
  }
  if (/<html|accounts\.google\.com|ServiceLogin/i.test(text) && !text.trim().startsWith('{')) {
    throw new Error("웹 앱 접근이 막혀 있어요. 배포할 때 '액세스 권한이 있는 사용자'를 [모든 사용자]로 골라 주세요.");
  }
  let res: any;
  try {
    res = JSON.parse(text);
  } catch {
    throw new Error('웹 앱 응답을 읽지 못했어요. 캘린더 연결 스크립트로 배포했는지 확인해 주세요.');
  }
  if (res?.status !== 'success') throw new Error(res?.message === 'unauthorized' ? '토큰이 맞지 않아요. 주소 끝의 ?token= 값을 확인해 주세요.' : res?.message || '알 수 없는 오류');
  return res;
}

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export async function gasList(url: string): Promise<{ calendar: string; events: CalEvent[] }> {
  const now = new Date();
  const from = new Date(now);
  from.setDate(now.getDate() - 60);
  const to = new Date(now);
  to.setDate(now.getDate() + 240);
  const res = await callGas(url, { action: 'list', from: ymd(from), to: ymd(to) });
  const events: CalEvent[] = (res.events || []).map((e: any) => ({
    id: String(e.id),
    gid: e.gid,
    title: String(e.title || '(제목 없음)'),
    date: e.date,
    endDate: e.endDate,
    time: e.time || undefined,
    allDay: !!e.allDay,
    recurring: !!e.recurring,
    type: inferType(String(e.title || '')),
    source: 'gas',
  }));
  return { calendar: res.calendar || '', events };
}

export const gasAdd = (url: string, ev: { title: string; date: string; start?: string; end?: string }) => callGas(url, { action: 'add', ...ev });
export const gasDelete = (url: string, gid: string, date: string) => callGas(url, { action: 'delete', gid, date });
export const gasPing = (url: string) => gasList(url);

export function inferType(title: string): CalEvent['type'] {
  if (/방학|휴업|공휴일|재량|개교기념|대체공휴일|휴일/.test(title)) return 'holiday';
  if (/평가|시험|진단|검사|수행/.test(title)) return 'exam';
  if (/행사|축제|운동회|체험|발표회|수련|캠프|입학|졸업|현장/.test(title)) return 'event';
  return 'school';
}

export const TYPE_META: Record<string, { label: string; color: string }> = {
  school: { label: '학교', color: '#3b82f6' },
  exam: { label: '평가', color: '#06b6d4' },
  event: { label: '행사', color: '#eab308' },
  holiday: { label: '휴일', color: '#f43f5e' },
  local: { label: '내 일정', color: '#a855f7' },
};

/** D-day 표시 */
export function dday(date: string): { text: string; tone: 'today' | 'soon' | 'later' | 'past' } {
  const t = new Date();
  const base = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
  const [y, m, d] = date.split('-').map(Number);
  const diff = Math.round((new Date(y, m - 1, d).getTime() - base) / 86400000);
  if (diff === 0) return { text: '오늘', tone: 'today' };
  if (diff > 0) return { text: `D-${diff}`, tone: diff <= 3 ? 'soon' : 'later' };
  return { text: `${-diff}일 전`, tone: 'past' };
}

/** 같은 일정이 여러 번 들어오지 않게 정리 */
export function dedupe(list: CalEvent[]): CalEvent[] {
  const seen = new Set<string>();
  return list.filter((e) => {
    const k = `${e.id}|${e.date}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
