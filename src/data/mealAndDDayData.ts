import { SchoolMealDay, DDayItem } from '../types';

export const ALLERGY_NAMES: Record<number, string> = {
  1: '난류(가금류)',
  2: '우유',
  3: '메밀',
  4: '땅콩',
  5: '대두(콩)',
  6: '밀',
  7: '고등어',
  8: '게',
  9: '새우',
  10: '돼지고기',
  11: '복숭아',
  12: '토마토',
  13: '아황산류',
  14: '호두',
  15: '닭고기',
  16: '쇠고기',
  17: '오징어',
  18: '조개류(굴/전복/홍합 포함)',
  19: '잣',
};

export const sampleSchoolMeals: Record<string, SchoolMealDay> = {
  // 오늘 급식
  'today': {
    date: '2026-09-19',
    dayOfWeek: '토요일',
    mealType: '중식 (초등 표준식)',
    calorie: '638.5 kcal',
    menuItems: [
      { name: '친환경 유기농 찰흑미밥', allergies: [] },
      { name: '맑은 쇠고기 무국', allergies: [5, 6, 16] },
      { name: '수제 치즈 눈꽃 등심 돈까스', allergies: [1, 2, 5, 6, 10] },
      { name: '수제 특제 브라운 소스', allergies: [1, 2, 5, 6, 12, 13] },
      { name: '상큼 유자 드레싱 양배추 샐러드', allergies: [1, 5, 13] },
      { name: '아삭 깍두기 (학교자체숙성)', allergies: [9] },
      { name: '제철 달콤 샤인머스캣 5알', allergies: [] },
    ],
    nutrients: [
      { name: '탄수화물', amount: '88.4g', dailyPercent: 27 },
      { name: '단백질', amount: '28.6g', dailyPercent: 52 },
      { name: '지방', amount: '19.2g', dailyPercent: 35 },
      { name: '비타민A', amount: '245 R.E', dailyPercent: 38 },
      { name: '티아민(B1)', amount: '0.42mg', dailyPercent: 35 },
      { name: '리보플라빈(B2)', amount: '0.38mg', dailyPercent: 32 },
      { name: '비타민C', amount: '29.5mg', dailyPercent: 30 },
      { name: '칼슘', amount: '268.4mg', dailyPercent: 38 },
      { name: '철분', amount: '3.6mg', dailyPercent: 30 },
    ],
    originInfo: '쌀(국내산 친환경), 쇠고기(한우 1등급), 돼지고기(국내산 무항생제), 배추김치(국내산 배추, 고춧가루)',
    specialNote: '※ 나트륨 줄이기 실천 급식의 날 (국물 염도 0.55% 준수)',
  },
  'tomorrow': {
    date: '2026-09-21',
    dayOfWeek: '월요일',
    mealType: '중식 (친환경 건강식)',
    calorie: '612.0 kcal',
    menuItems: [
      { name: '기장수수밥', allergies: [] },
      { name: '해물 해장 얼큰 콩나물국', allergies: [5, 6, 9, 17, 18] },
      { name: '달콤 짭조름 안동식 순살 찜닭', allergies: [5, 6, 15] },
      { name: '폭신폭신 수제 야채 계란찜', allergies: [1] },
      { name: '참깨소스 미역줄기볶음', allergies: [5] },
      { name: '배추김치', allergies: [9] },
      { name: '유기농 저지방 흰우유 (급식)', allergies: [2] },
    ],
    nutrients: [
      { name: '탄수화물', amount: '82.1g', dailyPercent: 25 },
      { name: '단백질', amount: '32.4g', dailyPercent: 58 },
      { name: '지방', amount: '16.5g', dailyPercent: 30 },
      { name: '칼슘', amount: '385.0mg', dailyPercent: 55 },
      { name: '철분', amount: '4.1mg', dailyPercent: 34 },
    ],
    originInfo: '닭고기(국내산 무항생제), 콩나물(국내산 친환경), 오징어(국내산 동해)',
    specialNote: '※ 뼈 없는 순살 찜닭으로 저학년도 안전하게 섭취 가능합니다.',
  },
};

export const initialDDays: DDayItem[] = [
  {
    id: 'dday-1',
    title: '가을 현장체험학습 (에버랜드)',
    targetDate: '2026-10-02',
    category: '행사',
    color: 'emerald',
    notifications: ['1d', 'day_of', '1h', '30m'],
    note: '준비물: 도시락, 물, 개인 돗자리, 모자, 간편 복장',
    isImportant: true,
  },
];
