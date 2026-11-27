/**
 * 1인 1역 검사일 · 점수 · 피드백 도우미
 * - 검사일: 매일 / 요일 지정(주 n회) / 특별한 날(날짜 지정)
 * - 점수: 매일 역할은 너그럽게(△ 80점, X 40점), 주 n회 · 특별한 날 역할은 엄격하게(△ 50점, X 0점)
 * - 이수 기준: 매일 60% 이상, 주 n회 · 특별한 날 80% 이상
 */
import type { ClassRole, RoleSchedule, RoleWeekDay, Student } from '../types';

export const WEEK_DAYS: RoleWeekDay[] = ['월', '화', '수', '목', '금'];
export type CheckVal = 'O' | '△' | 'X';

export function getSchedule(role: ClassRole): RoleSchedule {
  if (role.schedule) return role.schedule;
  const days = (role.specialDays || []).filter((d): d is RoleWeekDay => (WEEK_DAYS as string[]).includes(d));
  if (!role.isDaily && days.length) return { type: 'weekly', days };
  return { type: 'daily' };
}

export const isStrictRole = (role: ClassRole) => getSchedule(role).type !== 'daily';

export function isCheckDay(role: ClassRole, day: RoleWeekDay, fullDate: string): boolean {
  const sc = getSchedule(role);
  if (sc.type === 'daily') return true;
  if (sc.type === 'weekly') return (sc.days || []).includes(day);
  return (sc.dates || []).includes(fullDate);
}

const md = (d: string) => {
  const [, m, dd] = d.split('-');
  return `${Number(m)}/${Number(dd)}`;
};

export function scheduleLabel(role: ClassRole, short = false): string {
  const sc = getSchedule(role);
  if (sc.type === 'daily') return '매일';
  if (sc.type === 'weekly') {
    const days = WEEK_DAYS.filter((d) => (sc.days || []).includes(d));
    return short ? `주${days.length}회` : `주 ${days.length}회 (${days.join('·')})`;
  }
  const dates = [...(sc.dates || [])].sort();
  if (!dates.length) return '특별한 날 (날짜 미정)';
  if (short) return '특별한 날';
  return `특별한 날 (${dates.slice(0, 3).map(md).join(', ')}${dates.length > 3 ? ` 외 ${dates.length - 3}일` : ''})`;
}

/** 평가 한 칸의 점수 */
export function checkPoint(role: ClassRole | undefined, v: CheckVal): number {
  const strict = role ? isStrictRole(role) : false;
  if (v === 'O') return 100;
  if (v === '△') return strict ? 50 : 80;
  return strict ? 0 : 40;
}

export const passLine = (role: ClassRole | undefined) => (role && isStrictRole(role) ? 80 : 60);

export const scoreRuleText = (role: ClassRole | undefined) =>
  role && isStrictRole(role) ? '엄격 평가 · O 100 / △ 50 / X 0 · 80% 이상 이수' : '기본 평가 · O 100 / △ 80 / X 40 · 60% 이상 이수';

/** 이번 주 검사일만 모아서 달성률 계산 */
export function computeRoleRate(
  role: ClassRole | undefined,
  checks: Record<string, CheckVal> | undefined,
  weekDates: Record<RoleWeekDay, { fullDate: string }>
): { rate: number; checkDays: number; done: number } {
  if (!role) return { rate: 0, checkDays: 0, done: 0 };
  const days = WEEK_DAYS.filter((d) => isCheckDay(role, d, weekDates[d].fullDate));
  if (!days.length) return { rate: 0, checkDays: 0, done: 0 };
  let sum = 0;
  let done = 0;
  for (const d of days) {
    const v = (checks?.[d] as CheckVal) || 'X';
    sum += checkPoint(role, v);
    if (v === 'O') done++;
  }
  return { rate: Math.round(sum / days.length), checkDays: days.length, done };
}

/** 학생이 직접 읽고 스스로 돌아볼 수 있는 피드백 (초등 눈높이 해요체) */
/** "김도윤" → "도윤아", "이수지" → "수지야" (받침에 따라 아/야) */
export function callName(name: string): string {
  const n = name.trim();
  const given = n.length >= 3 && /^[가-힣]+$/.test(n) ? n.slice(1) : n;
  const last = given.charCodeAt(given.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return `${given},`;
  return `${given}${(last - 0xac00) % 28 ? '아' : '야'},`;
}

export function studentReflection(rawName: string, role: ClassRole | undefined, rate: number, checkDays: number, done: number): string {
  const name = callName(rawName).replace(/,$/, '');
  if (!role) return `${name}, 아직 맡은 역할이 없어요. 우리 반을 위해 해 보고 싶은 일이 있다면 선생님께 이야기해 볼까요?`;
  const t = role.title;
  const strict = isStrictRole(role);
  const when = strict ? `정해진 날(${scheduleLabel(role, true)})` : '매일';
  if (!checkDays) return `${name}, [${t}] 역할은 이번 기간에 검사하는 날이 없었어요. 그날이 오면 멋지게 해낼 수 있도록 미리 준비해 두어요.`;
  const record = done > 0 ? `검사한 ${checkDays}번 중 ${done}번을 잘 해냈어요.` : `검사한 ${checkDays}번 중 아직 'O'를 받은 날이 없어요.`;
  if (rate >= 90)
    return `${name}, [${t}] 역할을 ${when} 꾸준히 해 주어서 정말 고마워요! ${record} 덕분에 우리 반이 더 즐거워졌어요. ✍️ 돌아보기: 가장 뿌듯했던 순간은 언제였나요? 그 비결을 친구에게도 알려 줄 수 있나요?`;
  if (rate >= 75)
    return `${name}, [${t}] 역할을 성실하게 해 주었어요. ${record} 조금만 더 챙기면 최고가 될 수 있어요. ✍️ 돌아보기: 깜빡했던 날은 왜 그랬을까요? 잊지 않으려면 어떤 방법이 좋을까요?`;
  if (rate >= 60)
    return `${name}, [${t}] 역할을 하려고 노력한 모습이 보였어요. ${record} ${strict ? '정해진 날을 놓치지 않는 것' : '매일 잊지 않고 하는 것'}이 다음 목표예요. ✍️ 돌아보기: 내 역할이 우리 반에 왜 필요할까요? 나만의 약속을 하나 정해 볼까요?`;
  return `${name}, [${t}] 역할을 하는 날이 아직 많지 않았어요. ${record} 괜찮아요, 다음에는 더 잘할 수 있어요! ✍️ 돌아보기: 역할을 하기 어려웠던 까닭은 무엇일까요? 다음에는 언제, 어떻게 해 볼지 적어 보세요.`;
}

/** 명렬표 생일을 이번 기간의 날짜로 바꿔 줌 (특별한 날 역할: 생일 축하 등) */
export function birthdayDatesInRange(students: Student[], startStr: string, days: number): string[] {
  const start = new Date(startStr);
  if (isNaN(start.getTime())) return [];
  const out = new Set<string>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    if (students.some((s) => s.birthDate && s.birthDate.slice(5, 10) === `${m}-${dd}`)) out.add(`${d.getFullYear()}-${m}-${dd}`);
  }
  return [...out].sort();
}

export const durationDays = (dur: string) => (dur === '1w' ? 7 : dur === '2w' ? 14 : dur === '1s' ? 120 : 30);

/** "분리수거(남1,여1)", "칠판정리(2)", "생일 축하(1)" 한 줄을 해석 */
export function parseRoleLine(line: string): { title: string; maxCount: number; genderQuota?: { M: number; F: number } } | null {
  const t = line.trim();
  if (!t) return null;
  const m = t.match(/^(.+?)\s*[(（]([^)）]*)[)）]\s*$/);
  if (!m) return { title: t, maxCount: 1 };
  const title = m[1].trim();
  const inner = m[2].replace(/\s/g, '');
  const mm = inner.match(/남(\d+)/);
  const ff = inner.match(/여(\d+)/);
  if (mm || ff) {
    const M = mm ? parseInt(mm[1], 10) : 0;
    const F = ff ? parseInt(ff[1], 10) : 0;
    return { title, maxCount: Math.max(1, M + F), genderQuota: { M, F } };
  }
  const n = parseInt(inner, 10);
  return { title, maxCount: isNaN(n) || n < 1 ? 1 : n };
}

export const roleCountText = (r: Pick<ClassRole, 'maxCount' | 'genderQuota'>) =>
  r.genderQuota ? [r.genderQuota.M ? `남${r.genderQuota.M}` : '', r.genderQuota.F ? `여${r.genderQuota.F}` : ''].filter(Boolean).join(',') : String(r.maxCount);

/** 남/여 인원 제한을 지키는지 */
export function genderSlotOk(role: ClassRole, student: Student, students: Student[]): boolean {
  if (!role.genderQuota) return role.gender.includes('A') || role.gender.includes(student.gender as 'M' | 'F');
  const g = student.gender === 'M' || student.gender === 'F' ? student.gender : null;
  if (!g) return false;
  const cur = role.currentStudentIds.filter((id) => students.find((s) => s.id === id)?.gender === g).length;
  return cur < role.genderQuota[g];
}
