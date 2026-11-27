/**
 * 📚 주간학습안내에서 읽은 교시별 학습 내용 · 쪽수 저장소
 *  - 시간표를 [반영]할 때 함께 저장 → 보조화면 쉬는 시간 '다음 수업 안내'에 씀
 *  - 그 주(월요일 날짜)에만 쓰여요
 */
export const WEEKLY_DETAIL_KEY = 'class_weekly_plan_detail_v1';

export interface WeeklyCellDetail {
  subject: string;
  topic: string;
  pages: string;
}
export interface WeeklyPlanDetail {
  weekStart: string;
  days: Record<string, Record<number, WeeklyCellDetail>>;
}

export function readWeeklyPlanDetail(): WeeklyPlanDetail | null {
  try {
    const v = localStorage.getItem(WEEKLY_DETAIL_KEY);
    return v ? (JSON.parse(v) as WeeklyPlanDetail) : null;
  } catch {
    return null;
  }
}

export function saveWeeklyPlanDetail(d: WeeklyPlanDetail | null) {
  try {
    if (!d) localStorage.removeItem(WEEKLY_DETAIL_KEY);
    else localStorage.setItem(WEEKLY_DETAIL_KEY, JSON.stringify(d));
  } catch {}
}
