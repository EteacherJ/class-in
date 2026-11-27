/**
 * 🇰🇷 대한민국 국가 공휴일(법정공휴일) 데이터셋 및 유틸리티
 * - 대통령령 「관공서의 공휴일에 관한 규정」 및 대체공휴일 법령 준수
 * - 양력 고정 공휴일 (신정, 3·1절, 어린이날, 현충일, 광복절, 개천절, 한글날, 성탄절)
 * - 음력 변동 공휴일 (설날 연휴 3일, 부처님오신날, 추석 연휴 3일)
 * - 법정 대체공휴일 및 주요 전국 선거일(지방선거, 국회의원선거, 대선) 완벽 지원
 */

export interface HolidayInfo {
  date: string; // 'YYYY-MM-DD'
  name: string; // 공휴일 명칭 (예: '추석', '어린이날')
  isHoliday: boolean; // 법정 공휴일 여부 (빨간 날)
}

// 📅 연도별 변동 공휴일 (설날, 추석, 부처님오신날, 대체공휴일, 선거일 등) DB
const YEAR_SPECIFIC_HOLIDAYS: Record<string, string> = {
  // === 2024년 ===
  '2024-01-01': '신정',
  '2024-02-09': '설날 연휴',
  '2024-02-10': '설날',
  '2024-02-11': '설날 연휴',
  '2024-02-12': '대체공휴일(설날)',
  '2024-03-01': '3·1절',
  '2024-04-10': '제22대 국회의원선거',
  '2024-05-05': '어린이날',
  '2024-05-06': '대체공휴일(어린이날)',
  '2024-05-15': '부처님오신날',
  '2024-06-06': '현충일',
  '2024-08-15': '광복절',
  '2024-09-16': '추석 연휴',
  '2024-09-17': '추석',
  '2024-09-18': '추석 연휴',
  '2024-10-01': '국군의 날(임시공휴일)',
  '2024-10-03': '개천절',
  '2024-10-09': '한글날',
  '2024-12-25': '성탄절',

  // === 2025년 ===
  '2025-01-01': '신정',
  '2025-01-28': '설날 연휴',
  '2025-01-29': '설날',
  '2025-01-30': '설날 연휴',
  '2025-03-01': '3·1절',
  '2025-03-03': '대체공휴일(3·1절)',
  '2025-05-05': '어린이날',
  '2025-05-06': '대체공휴일(부처님오신날)',
  '2025-06-06': '현충일',
  '2025-08-15': '광복절',
  '2025-10-03': '개천절',
  '2025-10-05': '추석 연휴',
  '2025-10-06': '추석',
  '2025-10-07': '추석 연휴',
  '2025-10-08': '대체공휴일(추석)',
  '2025-10-09': '한글날',
  '2025-12-25': '성탄절',

  // === 2026년 (당해 학년도 중심) ===
  '2026-01-01': '신정',
  '2026-02-16': '설날 연휴',
  '2026-02-17': '설날',
  '2026-02-18': '설날 연휴',
  '2026-03-01': '3·1절',
  '2026-03-02': '대체공휴일(3·1절)',
  '2026-05-05': '어린이날',
  '2026-05-24': '부처님오신날',
  '2026-05-25': '대체공휴일(부처님오신날)',
  '2026-06-03': '제9회 전국동시지방선거',
  '2026-06-06': '현충일',
  '2026-08-15': '광복절',
  '2026-08-17': '대체공휴일(광복절)',
  '2026-09-24': '추석 연휴',
  '2026-09-25': '추석',
  '2026-09-26': '추석 연휴',
  '2026-10-03': '개천절',
  '2026-10-05': '대체공휴일(개천절)',
  '2026-10-09': '한글날',
  '2026-12-25': '성탄절',

  // === 2027년 ===
  '2027-01-01': '신정',
  '2027-02-06': '설날 연휴',
  '2027-02-07': '설날',
  '2027-02-08': '설날 연휴',
  '2027-02-09': '대체공휴일(설날)',
  '2027-03-01': '3·1절',
  '2027-03-03': '제21대 대통령선거',
  '2027-05-05': '어린이날',
  '2027-05-13': '부처님오신날',
  '2027-06-06': '현충일',
  '2027-08-15': '광복절',
  '2027-08-16': '대체공휴일(광복절)',
  '2027-09-14': '추석 연휴',
  '2027-09-15': '추석',
  '2027-09-16': '추석 연휴',
  '2027-10-03': '개천절',
  '2027-10-04': '대체공휴일(개천절)',
  '2027-10-09': '한글날',
  '2027-10-11': '대체공휴일(한글날)',
  '2027-12-25': '성탄절',
  '2027-12-27': '대체공휴일(성탄절)',

  // === 2028년 ===
  '2028-01-01': '신정',
  '2028-01-26': '설날 연휴',
  '2028-01-27': '설날',
  '2028-01-28': '설날 연휴',
  '2028-03-01': '3·1절',
  '2028-05-02': '부처님오신날',
  '2028-05-05': '어린이날',
  '2028-06-06': '현충일',
  '2028-08-15': '광복절',
  '2028-10-02': '추석 연휴',
  '2028-10-03': '개천절',
  '2028-10-04': '추석 연휴',
  '2028-10-05': '대체공휴일(추석)',
  '2028-10-09': '한글날',
  '2028-12-25': '성탄절',
};

// 📌 매년 고정되는 기본 양력 법정 공휴일 (DB에 명시되지 않은 미래/과거 연도 Fallback용)
const FIXED_SOLAR_HOLIDAYS: Record<string, string> = {
  '01-01': '신정',
  '03-01': '3·1절',
  '05-05': '어린이날',
  '06-06': '현충일',
  '08-15': '광복절',
  '10-03': '개천절',
  '10-09': '한글날',
  '12-25': '성탄절',
};

/**
 * 특정 연, 월, 일의 대한민국 국가 공휴일 정보 조회
 * @param year 연도 (예: 2026)
 * @param month 월 (1 ~ 12)
 * @param day 일 (1 ~ 31)
 * @returns HolidayInfo 또는 null
 */
export function getKoreanHoliday(year: number, month: number, day: number): HolidayInfo | null {
  const monthStr = String(month).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  const dateKey = `${year}-${monthStr}-${dayStr}`;

  // 1. 연도별 특화 공휴일 데이터베이스 우선 매칭 (설날, 추석, 대체공휴일, 선거일 등)
  if (YEAR_SPECIFIC_HOLIDAYS[dateKey]) {
    return {
      date: dateKey,
      name: YEAR_SPECIFIC_HOLIDAYS[dateKey],
      isHoliday: true,
    };
  }

  // 2. 고정 양력 공휴일 매칭 (DB 범위 밖의 연도에서도 기본 법정 공휴일 보장)
  const monthDayKey = `${monthStr}-${dayStr}`;
  if (FIXED_SOLAR_HOLIDAYS[monthDayKey]) {
    return {
      date: dateKey,
      name: FIXED_SOLAR_HOLIDAYS[monthDayKey],
      isHoliday: true,
    };
  }

  return null;
}

/**
 * 특정 날짜가 대한민국 법정 공휴일인지 여부 확인
 */
export function isKoreanHoliday(year: number, month: number, day: number): boolean {
  return getKoreanHoliday(year, month, day) !== null;
}

export type DayTypeCategory = 'weekend' | 'holiday' | 'discretionary' | 'workday';

export interface DayTypeInfo {
  type: DayTypeCategory;
  label: string; // '주말' | '휴일 (구체적 휴일명)' | '재량휴업일' | '평일'
  isNoClass: boolean; // 수업 및 시정표 없는 날 여부
  holidayName?: string;
}

/**
 * 📅 [스마트 일정 상태 분석기]
 * 특정 날짜의 상태(주말, 공휴일, 학교장 재량휴업일, 평일)를 판독하여 일관된 라벨 반환
 * - 주말인 경우: '주말'
 * - 공휴일인 경우: '휴일 (구체적 휴일명)'
 * - 학교장 재량휴업일인 경우: '재량휴업일'
 */
export function getDayTypeInfo(dateInput: Date | string, customSchedule?: any): DayTypeInfo {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dayOfWeek = d.getDay(); // 0: 일요일, 6: 토요일

  // 1. 공휴일 확인
  const holiday = getKoreanHoliday(year, month, day);

  // 2. 학교장 재량휴업일 판독
  let isDiscretionary = false;
  try {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = days[dayOfWeek];

    // 전달된 customSchedule 또는 localStorage 시간표 1교시 확인
    const schedule = customSchedule || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('class_dashboard_schedule') || '{}') : {});
    if (schedule && schedule[dayName] && Array.isArray(schedule[dayName])) {
      const p1 = schedule[dayName].find((p: any) => p && (p.period === 1 || p.period === '1'));
      if (p1 && p1.subject && (p1.subject.includes('재량휴업') || p1.subject.includes('학교장재량'))) {
        isDiscretionary = true;
      }
    }

    // D-Day 아이템 확인
    if (!isDiscretionary && typeof window !== 'undefined') {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const rawDDays = localStorage.getItem('class_dday_items');
      if (rawDDays) {
        const ddayList = JSON.parse(rawDDays);
        if (Array.isArray(ddayList)) {
          const matched = ddayList.find((item: any) =>
            item && item.targetDate === dateStr &&
            (item.title?.includes('재량휴업') || item.category === '재량휴업' || item.note?.includes('재량휴업'))
          );
          if (matched) isDiscretionary = true;
        }
      }
    }
  } catch {}

  // 속성 판독 우선순위: 재량휴업일 -> 공휴일 -> 주말 -> 평일
  if (isDiscretionary) {
    return {
      type: 'discretionary',
      label: '재량휴업일',
      isNoClass: true,
    };
  }

  if (holiday) {
    return {
      type: 'holiday',
      label: `휴일 (${holiday.name})`,
      holidayName: holiday.name,
      isNoClass: true,
    };
  }

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      type: 'weekend',
      label: '주말',
      isNoClass: true,
    };
  }

  return {
    type: 'workday',
    label: '평일',
    isNoClass: false,
  };
}

