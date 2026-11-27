import {
  Student,
  Team,
  AgendaItem,
  DailySchedule,
  ClassConfig,
  ClassRole,
  RolePeriodInfo,
  QuizQuestion,
  TelepathyQuiz,
  BasketballScoreboardTeam,
  ObservationRecord,
  CleanBannerSettings,
  PostItNote,
  WorkLink,
  PhotoFrameConfig,
  DailyQuoteConfig,
  SchoolMessengerItem,
  SchoolInfoTab,
  GoogleCalendarEvent,
  GoogleTaskItem,
  PraiseItemConfig,
  ObservationWidgetRecord,
} from '../types';

export const initialPraiseConfigs: PraiseItemConfig[] = [
  { id: 'praise-1', label: '발표를 자신있게 참여함', points: 1, icon: '🙋‍♂️', category: 'study' },
  { id: 'praise-2', label: '친구를 따뜻하게 배려하고 도와줌', points: 2, icon: '🤝', category: 'cooperation' },
  { id: 'praise-3', label: '정리정돈과 청소를 모범적으로 실천함', points: 1, icon: '🧹', category: 'cleaning' },
  { id: 'praise-4', label: '급식을 골고루 남김없이 잘 먹음', points: 1, icon: '🍱', category: 'attitude' },
  { id: 'praise-5', label: '수업 준비물을 꼼꼼히 챙김', points: 1, icon: '✏️', category: 'study' },
  { id: 'praise-6', label: '모둠 협력 활동에서 뛰어난 리더십 발휘', points: 2, icon: '🌟', category: 'cooperation' },
];

export const initialObservationWidgetRecords: ObservationWidgetRecord[] = [
  {
    id: 'obs-w-1',
    date: '2026-09-18',
    time: '11:20',
    studentId: 1,
    studentName: '강민준',
    type: '관찰',
    content: '수학 분수 덧셈 문제 해결 시 짝꿍에게 차분하게 풀이 과정을 설명해주며 협동학습에 적극 참여함.',
    createdAt: '오전 11:20',
  },
];

export const initialClassConfig: ClassConfig = {
  dashboardTitle: 'My Class',
  workDashboardTitle: 'My Work',
  schoolName: '초등학교',
  grade: 3,
  classNum: 1,
  teacherName: '',
  totalStudents: 24,
  currentPeriodText: '1교시 국어 수업 중',
  workStartTime: '08:30',
  workEndTime: '16:30',
  enableLeaveWorkAlert: true,
  summerVacationDate: '2026-07-20',
  winterVacationDate: '2026-12-24',
  theme: 'clean-white',
  themeMode: 'system',
  widgetTextContrast: 'auto',
  widgetTextShadow: false,
  widgetCardSolidBg: false,
  fontFamily: 'pretendard',
  boardType: 'smart',
  stageManagerMode: true,
  stageManagerOpacity: 0.65,
  focusWidgetIds: ['clock', 'agenda', 'timetable', 'quote', 'observation'],
  bellSchedule: [
    { period: 1, start: '09:00', end: '09:40', breakMinutes: 10 },
    { period: 2, start: '09:50', end: '10:30', breakMinutes: 10 },
    { period: 3, start: '10:40', end: '11:20', breakMinutes: 10 },
    { period: 4, start: '11:30', end: '12:10', breakMinutes: 50 },
    { period: 5, start: '13:00', end: '13:40', breakMinutes: 10 },
    { period: 6, start: '13:50', end: '14:30', breakMinutes: 10 },
  ],
  bellScheduleAutoRun: false,
  featuresEnabled: {
    noiseMonitor: true,
    classRoles: true,
    smartAttendance: true,
    smartQuiz: true,
    spinWheelPicker: true,
    observationLog: true,
    workBoard: true,
    dailyQuote: true,
    schoolInfo: true,
    postItNotes: true,
  },
  securityConfig: {
    autoLockMinutes: 5,
    isLocked: false,
    passwordHash: '', // (사용 중단) 관리자 PIN은 utils/pinSecurity.ts 해시 저장소에서 관리
    recoveryGoogleEmail: '',
  },
  attendanceAutoBackupTime: '16:00',
  attendanceGoogleSheetUrl: '' /* 🛡️ 개인 웹훅 주소는 기본값으로 배포하지 않음 */,
  praiseConfigs: initialPraiseConfigs,
};

export const initialPeriodInfo: RolePeriodInfo = {
  name: '2026학년도 2학기 1차',
  start: '2026-09-01',
  end: '2026-10-02',
  duration: '1m',
  alertDays: 3,
};

export const initialRoles: ClassRole[] = [
  {
    id: 'r_clean_recycle',
    title: '분리수거 및 쓰레기통 정리',
    maxCount: 2,
    currentStudentIds: [1, 2],
    gender: ['A'],
    isDaily: true,
    specialDays: ['금'],
    description: '[매일] 일반 쓰레기통과 분리수거함 주변을 깨끗이 쓸고 넘치지 않게 정리\n[특별] 매주 금요일 아침 분리수거장 배출',
    category: 'clean',
  },
  {
    id: 'r_clean_board',
    title: '칠판 정리 및 보드마카 관리',
    maxCount: 2,
    currentStudentIds: [3, 4],
    gender: ['A'],
    isDaily: true,
    specialDays: [],
    description: '[매일] 쉬는 시간과 수업 후 칠판을 깨끗이 지우고 분필 가루 및 마카 정리',
    category: 'clean',
  },
  {
    id: 'r_milk_helper',
    title: '우유 급식 도우미',
    maxCount: 2,
    currentStudentIds: [5, 6],
    gender: ['A'],
    isDaily: true,
    specialDays: [],
    description: '[매일] 아침 우유 상자를 1층에서 가져와 배부하고 다 마신 팩을 납작하게 접어 정리',
    category: 'life',
  },
  {
    id: 'r_attendance_check',
    title: '출석 및 보건 도우미',
    maxCount: 1,
    currentStudentIds: [7],
    gender: ['A'],
    isDaily: true,
    specialDays: [],
    description: '[매일] 아침 등교 현황을 확인하고 보건실 방문 학생을 챙깁니다',
    category: 'life',
  },
  {
    id: 'r_learning_dist',
    title: '학습지 및 알림장 배부',
    maxCount: 2,
    currentStudentIds: [8, 9],
    gender: ['A'],
    isDaily: true,
    specialDays: [],
    description: '[매일] 모둠별로 학습지나 안내장을 신속하게 나누어 줍니다',
    category: 'learning',
  },
  {
    id: 'r_energy_saver',
    title: '소등 및 에너지 절약 도우미',
    maxCount: 2,
    currentStudentIds: [10, 11],
    gender: ['A'],
    isDaily: true,
    specialDays: [],
    description: '[매일] 특별실 이동, 점심시간, 하교 시 교실 불과 TV/전자칠판 전원 끄기',
    category: 'life',
  },
  {
    id: 'r_air_vent',
    title: '창문 환기 및 공기청정 도우미',
    maxCount: 2,
    currentStudentIds: [12, 13],
    gender: ['A'],
    isDaily: true,
    specialDays: [],
    description: '[매일] 2교시 후 중간놀이 및 점심시간에 창문을 열어 5분간 교실 맞통풍 환기',
    category: 'clean',
  },
  {
    id: 'r_book_organizer',
    title: '학급문고 도서 정리',
    maxCount: 2,
    currentStudentIds: [14, 15],
    gender: ['A'],
    isDaily: true,
    specialDays: ['수', '금'],
    description: '[매일] 학급 책장 책들의 번호 순서를 맞추고 가지런히 꽂아두기',
    category: 'learning',
  },
  {
    id: 'r_line_leader',
    title: '줄줄이 급식 줄서기 인솔',
    maxCount: 2,
    currentStudentIds: [16, 17],
    gender: ['A'],
    isDaily: true,
    specialDays: [],
    description: '[매일] 이동 수업 및 점심시간 급식실로 갈 때 복도에서 바르게 걷도록 인솔',
    category: 'life',
  },
  {
    id: 'r_tech_screen',
    title: '스마트 기기 및 크롬북 충전 관리',
    maxCount: 2,
    currentStudentIds: [18, 19],
    gender: ['A'],
    isDaily: true,
    specialDays: [],
    description: '[매일] 수업 후 크롬북 충전함 연결 상태 확인 및 전원 점검',
    category: 'tech',
  },
  {
    id: 'r_flower_gardener',
    title: '교실 화분 식물 돌보미',
    maxCount: 1,
    currentStudentIds: [20],
    gender: ['A'],
    isDaily: false,
    specialDays: ['화', '목'],
    description: '[특별] 화요일과 목요일 아침에 교실 화분에 시원한 물 주기',
    category: 'life',
  },
  {
    id: 'r_gym_gear',
    title: '체육 체육교구 정리 도우미',
    maxCount: 2,
    currentStudentIds: [21, 22],
    gender: ['A'],
    isDaily: false,
    specialDays: ['월', '수'],
    description: '[특별] 체육 시간 전후 강당 또는 운동장에서 체육 기구 챙기기',
    category: 'learning',
  },
];

export const initialTeams: Team[] = [
  {
    id: 1,
    name: '1모둠 (햇살)',
    colorName: 'amber',
    badgeBg: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-950',
    dotColor: 'bg-amber-400',
    points: 0,
    goalPoints: 20,
    reward: '수요일 자유 독서 15분',
  },
  {
    id: 2,
    name: '2모둠 (우주)',
    colorName: 'blue',
    badgeBg: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-950',
    dotColor: 'bg-blue-500',
    points: 0,
    goalPoints: 20,
    reward: '급식 1등 우선 배식권',
  },
  {
    id: 3,
    name: '3모둠 (새싹)',
    colorName: 'emerald',
    badgeBg: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-950',
    dotColor: 'bg-emerald-500',
    points: 0,
    goalPoints: 20,
    reward: '원하는 음악 1곡 신청권',
  },
  {
    id: 4,
    name: '4모둠 (무지개)',
    colorName: 'purple',
    badgeBg: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-950',
    dotColor: 'bg-purple-500',
    points: 0,
    goalPoints: 20,
    reward: '금요일 자유 놀이시간 15분',
  },
];

export const initialStudents: Student[] = [
  // Team 1: 햇살
  { id: 1, number: 1, name: '김도윤', gender: 'M', teamId: 1, attendance: 'present', praisePoints: 0, selectedCount: 2, roleId: 'r_clean_recycle', note: '오늘 생일!' },
  { id: 2, number: 2, name: '박시은', gender: 'F', teamId: 1, attendance: 'present', praisePoints: 0, selectedCount: 1, roleId: 'r_clean_recycle' },
  { id: 3, number: 3, name: '김선호', gender: 'M', teamId: 1, attendance: 'present', praisePoints: 0, selectedCount: 0, roleId: 'r_clean_board' },
  { id: 4, number: 4, name: '아이유', gender: 'F', teamId: 1, attendance: 'present', praisePoints: 0, selectedCount: 3, roleId: 'r_clean_board' },

  // Team 2: 우주
  { id: 5, number: 5, name: '이준기', gender: 'M', teamId: 2, attendance: 'present', praisePoints: 0, selectedCount: 1, roleId: 'r_milk_helper' },
  { id: 6, number: 6, name: '최유진', gender: 'F', teamId: 2, attendance: 'present', praisePoints: 0, selectedCount: 2, roleId: 'r_milk_helper' },
  { id: 7, number: 7, name: '강하늘', gender: 'M', teamId: 2, attendance: 'present', praisePoints: 0, selectedCount: 0, roleId: 'r_attendance_check' },
  { id: 8, number: 8, name: '한지민', gender: 'F', teamId: 2, attendance: 'present', praisePoints: 0, selectedCount: 1, roleId: 'r_learning_dist' },

  // Team 3: 새싹
  { id: 9, number: 9, name: '송중기', gender: 'M', teamId: 3, attendance: 'present', praisePoints: 0, selectedCount: 1, roleId: 'r_learning_dist' },
  { id: 10, number: 10, name: '정해인', gender: 'M', teamId: 3, attendance: 'present', praisePoints: 0, selectedCount: 2, roleId: 'r_energy_saver' },
  { id: 11, number: 11, name: '신세경', gender: 'F', teamId: 3, attendance: 'present', praisePoints: 0, selectedCount: 0, roleId: 'r_energy_saver' },
  { id: 12, number: 12, name: '남주혁', gender: 'M', teamId: 3, attendance: 'present', praisePoints: 0, selectedCount: 2, roleId: 'r_air_vent' },

  // Team 4: 무지개
  { id: 13, number: 13, name: '서강준', gender: 'M', teamId: 4, attendance: 'present', praisePoints: 0, selectedCount: 1, roleId: 'r_air_vent' },
  { id: 14, number: 14, name: '김태리', gender: 'F', teamId: 4, attendance: 'late', praisePoints: 0, selectedCount: 2, roleId: 'r_book_organizer', note: '병원 진료로 지각' },
  { id: 15, number: 15, name: '변우석', gender: 'M', teamId: 4, attendance: 'present', praisePoints: 0, selectedCount: 1, roleId: 'r_book_organizer' },
  { id: 16, number: 16, name: '안유진', gender: 'F', teamId: 4, attendance: 'present', praisePoints: 0, selectedCount: 3, roleId: 'r_line_leader' },

  // Additional 8 students (Total 24 students)
  { id: 17, number: 17, name: '박보검', gender: 'M', teamId: 1, attendance: 'present', praisePoints: 0, selectedCount: 0, roleId: 'r_line_leader' },
  { id: 18, number: 18, name: '수지', gender: 'F', teamId: 1, attendance: 'present', praisePoints: 0, selectedCount: 1, roleId: 'r_tech_screen' },
  { id: 19, number: 19, name: '차은우', gender: 'M', teamId: 2, attendance: 'present', praisePoints: 0, selectedCount: 2, roleId: 'r_tech_screen' },
  { id: 20, number: 20, name: '임윤아', gender: 'F', teamId: 2, attendance: 'present', praisePoints: 0, selectedCount: 0, roleId: 'r_flower_gardener' },
  { id: 21, number: 21, name: '손석구', gender: 'M', teamId: 3, attendance: 'present', praisePoints: 0, selectedCount: 1, roleId: 'r_gym_gear' },
  { id: 22, number: 22, name: '김고은', gender: 'F', teamId: 3, attendance: 'present', praisePoints: 0, selectedCount: 0, roleId: 'r_gym_gear' },
  { id: 23, number: 23, name: '이도현', gender: 'M', teamId: 4, attendance: 'present', praisePoints: 0, selectedCount: 1 },
  { id: 24, number: 24, name: '신혜선', gender: 'F', teamId: 4, attendance: 'present', praisePoints: 0, selectedCount: 2 },
];

export const initialQuizzes: QuizQuestion[] = [];

export const initialAgendas: AgendaItem[] = [
  { id: '1', text: '1교시 국어 활동지 배부 완료', completed: true, tag: '수업' },
];

export const weeklySchedule: DailySchedule = {
  수: [
    { period: 1, subject: '국어', color: 'bg-indigo-600 text-white' },
    { period: 2, subject: '수학', color: 'bg-slate-100 text-slate-700' },
    { period: 3, subject: '사회', color: 'bg-slate-100 text-slate-700' },
    { period: 4, subject: '체육', color: 'bg-slate-100 text-slate-700' },
    { period: 5, subject: '음악', color: 'bg-slate-100 text-slate-700' },
  ],
  월: [
    { period: 1, subject: '국어', color: 'bg-indigo-600 text-white' },
    { period: 2, subject: '수학', color: 'bg-slate-100 text-slate-700' },
    { period: 3, subject: '도덕', color: 'bg-slate-100 text-slate-700' },
    { period: 4, subject: '과학', color: 'bg-slate-100 text-slate-700' },
    { period: 5, subject: '미술', color: 'bg-slate-100 text-slate-700' },
  ],
  화: [
    { period: 1, subject: '수학', color: 'bg-indigo-600 text-white' },
    { period: 2, subject: '사회', color: 'bg-slate-100 text-slate-700' },
    { period: 3, subject: '국어', color: 'bg-slate-100 text-slate-700' },
    { period: 4, subject: '영어', color: 'bg-slate-100 text-slate-700' },
    { period: 5, subject: '체육', color: 'bg-slate-100 text-slate-700' },
  ],
  목: [
    { period: 1, subject: '과학', color: 'bg-indigo-600 text-white' },
    { period: 2, subject: '국어', color: 'bg-slate-100 text-slate-700' },
    { period: 3, subject: '수학', color: 'bg-slate-100 text-slate-700' },
    { period: 4, subject: '음악', color: 'bg-slate-100 text-slate-700' },
    { period: 5, subject: '창체', color: 'bg-slate-100 text-slate-700' },
  ],
  금: [
    { period: 1, subject: '체육', color: 'bg-indigo-600 text-white' },
    { period: 2, subject: '국어', color: 'bg-slate-100 text-slate-700' },
    { period: 3, subject: '미술', color: 'bg-slate-100 text-slate-700' },
    { period: 4, subject: '미술', color: 'bg-slate-100 text-slate-700' },
    { period: 5, subject: '학급회의', color: 'bg-slate-100 text-slate-700' },
  ],
};

// 첨부된 주간학습안내 (9월 7일 ~ 9월 11일 4주) OCR 분석 데이터셋
export const samplePdfWeekSchedule: DailySchedule = {
  월: [
    { period: 1, subject: '국어', color: 'bg-indigo-600 text-white' },
    { period: 2, subject: '국어', color: 'bg-indigo-600 text-white' },
    { period: 3, subject: '과학', color: 'bg-emerald-600 text-white' },
    { period: 4, subject: '수학', color: 'bg-amber-600 text-white' },
    { period: 5, subject: '수학', color: 'bg-amber-600 text-white' },
  ],
  화: [
    { period: 1, subject: '체육', color: 'bg-rose-600 text-white' },
    { period: 2, subject: '수학', color: 'bg-amber-600 text-white' },
    { period: 3, subject: '영어', color: 'bg-sky-600 text-white' },
    { period: 4, subject: '도덕', color: 'bg-purple-600 text-white' },
    { period: 5, subject: '음악', color: 'bg-teal-600 text-white' },
  ],
  수: [
    { period: 1, subject: '국어', color: 'bg-indigo-600 text-white' },
    { period: 2, subject: '국어', color: 'bg-indigo-600 text-white' },
    { period: 3, subject: '수학', color: 'bg-amber-600 text-white' },
    { period: 4, subject: '수학', color: 'bg-amber-600 text-white' },
    { period: 5, subject: '자율', color: 'bg-slate-600 text-white' },
  ],
  목: [
    { period: 1, subject: '영어', color: 'bg-sky-600 text-white' },
    { period: 2, subject: '체육', color: 'bg-rose-600 text-white' },
    { period: 3, subject: '과학', color: 'bg-emerald-600 text-white' },
    { period: 4, subject: '과학', color: 'bg-emerald-600 text-white' },
    { period: 5, subject: '미술', color: 'bg-orange-600 text-white' },
    { period: 6, subject: '미술', color: 'bg-orange-600 text-white' },
  ],
  금: [
    { period: 1, subject: '국어', color: 'bg-indigo-600 text-white' },
    { period: 2, subject: '국어', color: 'bg-indigo-600 text-white' },
    { period: 3, subject: '사회', color: 'bg-blue-600 text-white' },
    { period: 4, subject: '사회', color: 'bg-blue-600 text-white' },
    { period: 5, subject: '동아리', color: 'bg-purple-600 text-white' },
  ],
};

export const samplePdfWeekDetails = {
  title: '초등학교 3학년 1반 주간학습안내 (9월 7일 ~ 9월 11일)',
  readingBook: '고양이 해결사 깜냥',
  supplies: {
    월: '실내화, 알림장, 필기구, 학습노트, 개인물통, 리코더',
    화: '실내화, 알림장, 필기구, 학습노트, 개인물통, 색연필, 싸인펜',
    수: '실내화, 알림장, 필기구, 학습노트, 개인물통, 색연필, 싸인펜',
    목: '실내화, 알림장, 필기구, 학습노트, 개인물통, 색연필, 싸인펜',
    금: '실내화, 알림장, 필기구, 학습노트, 개인물통',
  },
  days: [
    {
      day: '월',
      date: '9월 7일',
      periods: [
        { period: 1, subject: '국어', topic: '1. 재미가 솔솔 (시의 장면 상상하기)' },
        { period: 2, subject: '수학', topic: '1. 곱셈 (몇십몇 × 몇)' },
        { period: 3, subject: '사회', topic: '1. 우리 고장의 모습과 사람들의 생활' },
        { period: 4, subject: '과학', topic: '1. 물질의 상태 (고체와 액체 탐구)' },
        { period: 5, subject: '음악', topic: '신나는 리코더 운지법 기초 익히기' },
      ],
    },
    {
      day: '화',
      date: '9월 8일',
      periods: [
        { period: 1, subject: '수학', topic: '곱셈 익힘책 풀이 및 오답 클리닉' },
        { period: 2, subject: '국어', topic: '인물의 마음을 짐작하며 이야기 읽기' },
        { period: 3, subject: '체육', topic: '매트 운동과 유연성 기르기' },
        { period: 4, subject: '영어', topic: 'Lesson 3. How Many Apples?' },
        { period: 5, subject: '미술', topic: '가을 풍경 수채화 그리기' },
      ],
    },
    {
      day: '수',
      date: '9월 9일',
      periods: [
        { period: 1, subject: '국어', topic: '단원 정리 및 받아쓰기 1회' },
        { period: 2, subject: '사회', topic: '우리 고장의 자랑거리 백지도에 표시하기' },
        { period: 3, subject: '과학', topic: '공기의 성질 실험하기' },
        { period: 4, subject: '도덕', topic: '2. 소중한 생명, 사랑하는 친구' },
      ],
    },
    {
      day: '목',
      date: '9월 10일',
      periods: [
        { period: 1, subject: '수학', topic: '곱셈 문제 해결 및 모둠 게임' },
        { period: 2, subject: '국어', topic: '온작품 읽기 - 깜냥 1장 토의' },
        { period: 3, subject: '체육', topic: '이어달리기 배턴 터치 훈련' },
        { period: 4, subject: '영어', topic: '숫자 노래 부르기 및 짝 활동' },
        { period: 5, subject: '창체', topic: '학급 자치 평화 회의' },
      ],
    },
    {
      day: '금',
      date: '9월 11일',
      periods: [
        { period: 1, subject: '과학', topic: '탐구 보고서 완성 및 모둠 발표' },
        { period: 2, subject: '국어', topic: '시 낭송회 및 칭찬 피드백' },
        { period: 3, subject: '사회', topic: '고장 사람들 인터뷰 질문 만들기' },
        { period: 4, subject: '실과', topic: '생활 속 기술과 안전' },
        { period: 5, subject: '동아리', topic: '종이접기 및 보드게임 협력반' },
      ],
    },
  ],
  guidance: [
    '환절기 감기 예방을 위해 개인 겉옷과 따뜻한 물통을 지참하도록 지도해 주세요.',
    '"선다-본다-건넌다" 횡단보도 보행 안전 3원칙을 매일 실천합니다.',
  ],
  notices: [
    '8시 50분까지는 교실에 들어와 아침활동을 하고 1교시 수업 준비를 합니다.',
    '평가 안내: [국어] 1단원 받아쓰기 평가, [수학] 1. 곱셈 - 수학익힘책 문제 여러 번 풀어보기',
    '국어 온작품 읽기 활동: 도서명 「고양이 해결사 깜냥」',
    '감염병 증상 등교 중지 후 재등교 시 의사 확인서 또는 소견서 제출',
    '결석 시에는 결석신고서와 증빙서류 제출 (하이클래스 이용 가능)',
    '안전 지도: "선다-본다-건넌다" 길을 건너는 3원칙을 항상 기억하고 횡단보도를 안전하게 건넙니다.',
  ],
};

export const initialTelepathyQuizzes: TelepathyQuiz[] = [];

export const initialBasketballTeams: BasketballScoreboardTeam[] = [
  { id: 1, name: '1모둠 (햇살)', score: 0, color: 'bg-amber-500' },
  { id: 2, name: '2모둠 (우주)', score: 0, color: 'bg-blue-500' },
  { id: 3, name: '3모둠 (새싹)', score: 0, color: 'bg-emerald-500' },
  { id: 4, name: '4모둠 (무지개)', score: 0, color: 'bg-purple-500' },
];

export const initialObservationRecords: ObservationRecord[] = [
  {
    id: 'obs-1',
    date: '2026-09-18',
    studentId: 1,
    studentName: '김도윤',
    situation: '수업',
    content: '모둠 협동 활동 중 친구들이 이해하지 못한 나눗셈 과정을 친절하게 설명해주며 배려하는 모습을 보임.',
    createdAt: '10:25',
  },
  {
    id: 'obs-2',
    date: '2026-09-18',
    studentId: 4,
    studentName: '아이유',
    situation: '쉬는시간',
    content: '쉬는 시간에 칠판 주변 보드마카를 스스로 색깔별로 바르게 정돈하여 학급 봉사에 성실히 참여함.',
    createdAt: '11:15',
  },
  {
    id: 'obs-3',
    date: '2026-09-17',
    studentId: 7,
    studentName: '강하늘',
    situation: '상담',
    content: '환절기 가벼운 두통으로 보건실 이용. 휴식 후 정상 수업 참여하였으며 학부모님께 안부 문자 전달함.',
    createdAt: '14:00',
  },
];

export const initialCleanBannerSettings: CleanBannerSettings = {
  text: '책상 위와 서랍을 정리해요 / 가방을 정리해요 / 자기자리 주변을 빗자루로 쓸어요 / 의자를 정리하고 가방을 맵니다.',
  color: '#ffffff',
  bgColor: '#0f172a',
  fontFamily: 'sans-serif',
  fontSize: 'md',
  speed: 25,
};

export const initialPostItNotes: PostItNote[] = [
  {
    id: 'p1',
    text: '📌 3교시 체육 수업 후 1학기 우유 급식 알레르기 학생 명단 행정실 제출하기',
    color: 'bg-amber-100 border-amber-300 text-amber-950',
    fontFamily: 'sans-serif',
    fontSize: 'md',
    createdAt: 1,
    updatedAt: 1,
  },
  {
    id: 'p2',
    text: '💡 금요일 학급 자치회의 안건: "급식실 줄서기 차례 지키기" 논의 준비',
    color: 'bg-emerald-100 border-emerald-300 text-emerald-950',
    fontFamily: 'sans-serif',
    fontSize: 'sm',
    createdAt: 2,
    updatedAt: 2,
  },
  {
    id: 'p3',
    text: '📞 김도윤 학생 학부모님 상담 전화 (방과후 15:30 예정)',
    color: 'bg-pink-100 border-pink-300 text-pink-950',
    fontFamily: 'sans-serif',
    fontSize: 'md',
    createdAt: 3,
    updatedAt: 3,
  },
];

export const initialWorkLinks: WorkLink[] = [
  { id: 'l1', title: '나이스 (NEIS)', url: 'https://neis.go.kr', iconName: 'School', color: 'bg-blue-600' },
  { id: 'l2', title: 'K-에듀파인', url: 'https://edufine.go.kr', iconName: 'CreditCard', color: 'bg-emerald-600' },
  { id: 'l3', title: '학교알리미', url: 'https://www.schoolinfo.go.kr', iconName: 'Globe', color: 'bg-indigo-600' },
  { id: 'l4', title: '캔바 (Canva 에듀)', url: 'https://canva.com', iconName: 'Palette', color: 'bg-purple-600' },
  { id: 'l5', title: '구글 클래스룸', url: 'https://classroom.google.com', iconName: 'BookOpen', color: 'bg-amber-600' },
  { id: 'l6', title: '인디스쿨', url: 'https://indischool.com', iconName: 'Users', color: 'bg-teal-600' },
];

export const initialPhotoFrameConfig: PhotoFrameConfig = {
  imageUrl: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=600&auto=format&fit=crop&q=80',
  frameStyle: 'wood',
  caption: '✨ 우리들의 빛나는 3학년 1반 추억 한 컷',
};

export const initialDailyQuoteConfig: DailyQuoteConfig = {
  alertTime: '16:00',
  autoEnabled: true,
  customQuotes: [
    '선생님의 미소 한 번이 아이들의 하루를 따뜻하게 밝혀줍니다.',
    '오늘도 아이들과 함께 호흡하며 교실을 지켜주셔서 참 고맙습니다.',
    '완벽하지 않아도 괜찮습니다. 진심을 다한 오늘의 수업은 아이들 마음에 깊이 남습니다.',
    '퇴근길, 교실 문을 닫을 땐 마음의 무거운 짐도 함께 내려놓으세요. 수고 많으셨습니다!',
  ],
  teacherMessage: '오늘도 우리 반 아이들과 따뜻하게 웃으며 하루를 마무리하자!',
};

export const initialMessengerItems: SchoolMessengerItem[] = [
  {
    id: 'm1',
    sender: '교무부장 [안내]',
    content: '2026학년도 2학기 현장체험학습 사전 희망 조사서 금일 16:30까지 회신 바랍니다.',
    deadline: '2026-09-18T16:30',
    useDeadline: true,
    completed: false,
    createdAt: '09:10',
  },
  {
    id: 'm2',
    sender: '보건실 [안내]',
    content: '독감 예방접종 사전 설문지 미제출 학생 명단 확인 후 송부 부탁드립니다.',
    deadline: '2026-09-19T12:00',
    useDeadline: true,
    completed: false,
    createdAt: '10:05',
  },
  {
    id: 'm3',
    sender: '행정실 [업무]',
    content: '9월분 학급 교육활동비 집행 품의 신청 안내입니다.',
    deadline: '',
    useDeadline: false,
    completed: true,
    createdAt: '08:40',
  },
];

export const initialSchoolInfoTabs: SchoolInfoTab[] = [
  {
    id: 'tab-info',
    title: '학교 정보',
    type: 'info',
    contacts: [
      { id: 'c1', label: '교무실', number: '031-123-4567' },
      { id: 'c2', label: '행정실', number: '031-123-4568' },
      { id: 'c3', label: '보건실', number: '031-123-4570' },
      { id: 'c4', label: '급식실', number: '031-123-4571' },
      { id: 'c5', label: '당직실(야간)', number: '031-123-4572' },
      { id: 'c6', label: '스마트정보실', number: '031-123-4575' },
    ],
  },
  {
    id: 'tab-mall',
    title: '학교쇼핑몰',
    type: 'shopping',
    shoppingAccounts: [
      { id: 's1', mallName: '학교장터 (S2B)', url: 'https://s2b.kr', username: '', password: '••••••••' },
      { id: 's2', mallName: '알파문구 본사몰', url: 'https://alpha.co.kr', username: '', password: '••••••••' },
      { id: 's3', mallName: '아이스크림몰', url: 'https://i-scream.co.kr', username: '', password: '••••••••' },
    ],
  },
  {
    id: 'tab-custom1',
    title: '체험학습안내',
    type: 'custom',
    customText: '📍 2026 가을 서울대공원 동물원 체험학습 (10월 15일 예정)\n- 학생 24명 전원 참가 동의서 완료\n- 준비물: 개인 도시락, 물통, 돗자리, 모자, 비상약',
    customImages: [
      { id: 'img1', name: '현장체험학습 동선 안내도', url: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=600&auto=format&fit=crop&q=80' },
    ],
  },
];

export const sampleObservationRecords = initialObservationRecords;

export const initialCalendarEvents: GoogleCalendarEvent[] = [
  { id: 'ev1', title: '2학기 학부모 상담주간 운영', date: '2026-09-21', time: '14:00', color: 'bg-indigo-500', type: '학사' },
  { id: 'ev2', title: '3학년 2학기 교과협의회 (연구실)', date: '2026-09-23', time: '15:30', color: 'bg-purple-500', type: '회의' },
  { id: 'ev3', title: '기초학력 진단검사 결과 나이스 마감', date: '2026-09-25', time: '16:00', color: 'bg-rose-500', type: '업무' },
  { id: 'ev4', title: '가을 현장체험학습 사전 안전교육', date: '2026-09-30', time: '10:00', color: 'bg-amber-500', type: '행사' },
  { id: 'ev5', title: '개천절 연휴 맞이 교실 정리정돈', date: '2026-10-02', time: '14:30', color: 'bg-emerald-500', type: '행사' },
  { id: 'ev6', title: '9월 교직원 다모임 회의', date: '2026-09-16', time: '15:40', color: 'bg-blue-500', type: '회의' },
];

export const initialGoogleTasks: GoogleTaskItem[] = [
  { id: 'gt1', title: '3학년 1반 주간학습안내 출력 및 배부', dueDate: '2026-09-21', completed: true, priority: 'high' },
];


