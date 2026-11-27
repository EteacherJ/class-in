/**
 * [iCal (.ics) Calendar Parser and Sync Utility]
 * 구글 캘린더 iCal 형식의 비공개 주소(basic.ics)를 비동기로 받아와
 * RFC 5545 표준에 따라 언폴딩 및 VEVENT 데이터를 파싱하여
 * 대시보드 GoogleCalendarEvent 객체 목록으로 안전하게 변환합니다.
 */

import { GoogleCalendarEvent } from '../types';
import { fetchExternalText } from './secureFetch';

/**
 * iCal 형식의 날짜 문자열(예: 20260924T010000Z, DTSTART;VALUE=DATE:20260924, DTSTART;TZID=Asia/Seoul:20260924T090000)을
 * 표준 YYYY-MM-DD 형식으로 안정적으로 변환합니다.
 */
function parseIcalDate(rawDateStr: string): string {
  if (!rawDateStr) return new Date().toISOString().slice(0, 10);

  // 콜론(:) 뒤의 순수 날짜/시간 값 추출
  const cleaned = rawDateStr.includes(':')
    ? rawDateStr.split(':').pop()?.trim() || ''
    : rawDateStr.trim();

  // YYYYMMDD 또는 YYYYMMDDTHHMMSS 형태 파싱
  const match = cleaned.match(/^(\d{4})(\d{2})(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month}-${day}`;
  }

  return new Date().toISOString().slice(0, 10);
}

/**
 * iCal 텍스트 내 이스케이프된 특수문자(\\, \;, \,, \n 등)를 원래 문자로 복원합니다.
 */
function unescapeIcalText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

/**
 * 이벤트 제목(summary)에 따라 초등학교 학사일정에 맞는 적절한 뱃지 카테고리를 자동 추론합니다.
 */
function inferEventType(title: string): 'school' | 'exam' | 'event' | 'holiday' {
  const lower = title.toLowerCase();
  if (
    lower.includes('방학') ||
    lower.includes('휴업') ||
    lower.includes('공휴일') ||
    lower.includes('재량') ||
    lower.includes('개교기념') ||
    lower.includes('대체공휴일')
  ) {
    return 'holiday';
  }
  if (
    lower.includes('평가') ||
    lower.includes('시험') ||
    lower.includes('진단') ||
    lower.includes('검사') ||
    lower.includes('수행')
  ) {
    return 'exam';
  }
  if (
    lower.includes('행사') ||
    lower.includes('축제') ||
    lower.includes('운동회') ||
    lower.includes('체험') ||
    lower.includes('발표회') ||
    lower.includes('수련') ||
    lower.includes('캠프') ||
    lower.includes('입학') ||
    lower.includes('졸업')
  ) {
    return 'event';
  }
  return 'school';
}

/**
 * RFC 5545 표준에 따라 연속된 줄 바꿈(Line Folding: 공백이나 탭으로 시작하는 줄)을 합칩니다.
 */
function unfoldIcalLines(rawText: string): string {
  // \r\n 또는 \n 다음에 공백/탭이 오는 경우 제거하여 이전 줄과 병합
  return rawText.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
}

/**
 * iCal 텍스트 데이터를 파싱하여 GoogleCalendarEvent 배열을 반환합니다.
 */
export function parseIcalString(icsText: string): GoogleCalendarEvent[] {
  if (!icsText || !icsText.includes('BEGIN:VCALENDAR')) {
    console.warn('🟡 [iCal] 유효한 VCALENDAR 포맷이 아닙니다.');
    return [];
  }

  const events: GoogleCalendarEvent[] = [];
  const unfolded = unfoldIcalLines(icsText);

  // VEVENT 블록별로 분할
  const veventBlocks = unfolded.split('BEGIN:VEVENT');

  for (let i = 1; i < veventBlocks.length; i++) {
    const block = veventBlocks[i].split('END:VEVENT')[0];

    let uid = `ical-${Date.now()}-${i}`;
    let summary = '';
    let dtstart = '';

    const lines = block.split(/\r\n|\n|\r/);

    for (let j = 0; j < lines.length; j++) {
      const line = lines[j].trim();

      if (line.startsWith('UID:')) {
        uid = line.slice(4).trim();
      } else if (line.startsWith('SUMMARY:') || line.startsWith('SUMMARY;')) {
        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
          summary = unescapeIcalText(line.slice(colonIdx + 1));
        }
      } else if (line.startsWith('DTSTART')) {
        dtstart = line;
      }
    }

    if (summary) {
      // 시간이 있는 일정(예: 20261106T060000Z)은 한국 시간으로 바꿔 날짜·시각을 정합니다.
      const tm = (dtstart.split(':').pop() || '').trim().match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
      let formattedDate = parseIcalDate(dtstart);
      let time: string | undefined;
      if (tm) {
        const [, y, mo, d, h, mi, , z] = tm;
        const dt = z ? new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi)) : new Date(+y, +mo - 1, +d, +h, +mi);
        formattedDate = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        time = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
      }
      events.push({
        id: `${uid}@${formattedDate}`,
        title: summary,
        date: formattedDate,
        time,
        type: inferEventType(summary),
      });
    }
  }

  // 날짜 오름차순 정렬
  events.sort((a, b) => a.date.localeCompare(b.date));

  console.log(`🟢 [iCal] 총 ${events.length}개의 구글 캘린더 일정이 성공적으로 파싱되었습니다.`);
  return events;
}

/**
 * 주어진 iCal URL에서 캘린더 데이터를 가져와 파싱합니다.
 * 브라우저 CORS 정책을 대비해 직접 호출 및 5단계 고신뢰성 프록시(AllOrigins JSON/RAW, CodeTabs, ThingProxy, CorsProxyOrg) 폴백을 적용합니다.
 */
export async function fetchAndParseIcalUrl(url: string): Promise<GoogleCalendarEvent[]> {
  if (!url || typeof url !== 'string') {
    throw new Error('구글 캘린더 주소가 입력되지 않았습니다.');
  }

  // 1. URL 앞뒤 공백 및 따옴표 제거
  let cleanUrl = url.trim().replace(/^['"]+|['"]+$/g, '');

  // 2. webcal:// 프로토콜을 https:// 로 자동 치환
  if (cleanUrl.startsWith('webcal://')) {
    cleanUrl = 'https://' + cleanUrl.slice(9);
  }

  // 3. 웹 삽입용 embed?src= 주소를 입력한 경우 iCal 공개 주소로 자동 변환
  if (cleanUrl.includes('calendar.google.com/calendar/embed')) {
    const srcMatch = cleanUrl.match(/[?&]src=([^&]+)/);
    if (srcMatch && srcMatch[1]) {
      cleanUrl = `https://calendar.google.com/calendar/ical/${srcMatch[1]}/public/basic.ics`;
      console.log('🔵 [iCal] 웹 임베드 주소를 iCal 주소로 자동 변환:', cleanUrl);
    }
  }

  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    throw new Error('유효한 웹 주소(http:// 또는 https://)가 아닙니다.');
  }

  // 4. 구글 캘린더 웹 링크(주소창 링크)를 넣은 경우 명확한 안내
  if (cleanUrl.includes('calendar.google.com') && !cleanUrl.includes('.ics')) {
    throw new Error(
      '입력하신 주소는 구글 캘린더 웹페이지 링크입니다. 구글 캘린더 설정 > [캘린더 통합] > [iCal 형식의 비공개 주소]의 링크(.ics)를 복사하여 입력해 주세요.'
    );
  }

  console.log('🔵 [iCal] 캘린더 동기화 요청 시도:', cleanUrl);

  // 🛡️ 보안: 비공개 iCal 주소가 제3자 무료 프록시 서버로 전송되지 않도록
  //   앱 내부 대리 요청(Electron 메인 프로세스 / 로컬 실행기)만 사용합니다.
  const result = await fetchExternalText(cleanUrl, 10000);
  if (result.ok && result.text.includes('BEGIN:VCALENDAR')) {
    console.log('🟢 [iCal] 캘린더 동기화 성공');
    return parseIcalString(result.text);
  }
  console.warn('🟡 [iCal] 캘린더 불러오기 실패:', result.error || `HTTP ${result.status}`);

  throw new Error(
    '구글 캘린더 iCal 주소에 접근할 수 없습니다. 학교 네트워크 방화벽 차단 시 주소를 브라우저 주소창에 입력하여 .ics 파일을 다운받은 후, 캘린더 위젯의 [iCal (.ics) 파일 직접 불러오기] 버튼으로 바로 등록할 수 있습니다.'
  );
}
