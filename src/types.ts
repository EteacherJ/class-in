export type ClassroomMode = 'lesson' | 'break' | 'clean' | 'quiz' | 'work' | 'activity';

export type SeatingLayoutType = 'grid' | 'u_shape' | 'round' | 'rows';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'early' | 'nurse';

export type AttendanceReasonCategory = '질병' | '출석인정' | '인정' | '사고' | '미인정' | '기타';

// 라이트 / 다크 / 시스템 설정 연동 테마 모드
export type ThemeMode = 'system' | 'light' | 'dark';

// 🎨 대시보드 4대 시그니처 정예 테마 프리셋 & 하위 호환
export type DashboardTheme = 
  | 'clean-white'     // 🤍 클린 화이트 (기본)
  | 'glass-aurora'    // 글래스모피즘 2.0 (프로스티드 오로라)
  | 'class-basic'     // 스쿨 베이직 (활기찬 옐로우 & 스카이)
  | 'cozy-latte'      // 코지 웜 & 라떼 (소프트 피치 & 우드)
  | 'botanical-sage'  // 보태니컬 세이지 (차분한 내추럴 그린)
  | 'lavender-fog'    // 🪻 라벤더 포그
  | 'ember-sunset'    // 🍊 엠버 선셋
  | 'cyber-glossy'    // 💎 사이버 글로시
  | 'elementary'      // (하위 호환)
  | 'pastel'          // (하위 호환)
  | 'indigo'          // (하위 호환)
  | 'emerald'         // (하위 호환)
  | 'lavender'        // (하위 호환)
  | 'cafe'            // (하위 호환)
  | 'sunset'          // (하위 호환)
  | 'office'          // (하위 호환)
  | 'glassmorphism'   // (하위 호환)
  | 'slate';          // (하위 호환)


// 🖥️ 보조 화면 테마 모드: 메인 위젯 동기화, 추천 설정(학생 시각 최적화), 개인 설정(커스텀)
export type DualDisplayThemeMode = 'sync_main' | 'recommended' | 'custom';

// 🌟 보조화면 테마 프리셋: 메인 대시보드 9대 프리셋 테마와 1:1 완벽 통일 (어두운 계열 3종 삭제)
export type DualDisplayRecommendedTheme = DashboardTheme;

export interface DualDisplayThemeSettings {
  mode: DualDisplayThemeMode; // 'sync_main' | 'recommended' | 'custom'
  recommendedTheme: DualDisplayRecommendedTheme;
  customBgColor: string; // 사용자 지정 배경색 hex
  customCardStyle: 'dark' | 'glass' | 'solid';
  // ✨ 타이머 및 시계 번짐(Glow) 효과 강도: 'none'(깔끔/번짐없음) | 'soft'(은은하게/권장) | 'neon'(네온 발광)
  timerGlowIntensity?: 'none' | 'soft' | 'neon';
  // 🎨 타이머 숫자 커스텀 색상 프리셋 ('default' | 'white' | 'yellow' | 'green' | 'cyan' | 'orange' | 'pink' | 'purple' | 'custom')
  timerColorPreset?: 'default' | 'white' | 'yellow' | 'green' | 'cyan' | 'orange' | 'pink' | 'purple' | 'custom';
  // 🎨 타이머 직접 지정 HEX 색상 (예: '#ffffff')
  timerCustomColor?: string;
  // 🕒 상단 현재 시각 시계 커스텀 색상 프리셋
  clockColorPreset?: 'default' | 'white' | 'yellow' | 'green' | 'cyan' | 'orange' | 'pink' | 'purple' | 'custom';
  // 🕒 상단 현재 시각 시계 직접 지정 HEX 색상
  clockCustomColor?: string;
}

export type WidgetPlacementMode = 'grid' | 'freeform';

// 💡 좌/우 스택 패널 표시 및 통합 배치 모드
// 'BOTH': 기본 분할 (좌측: 위젯스택, 우측: 메모스택)
// 'LEFT_ONLY': 메인 캔버스 좌측 집중, 우측 사이드바에 메모+위젯스택 상하 통합
// 'RIGHT_ONLY': 메인 캔버스 우측 집중, 좌측 사이드바에 메모+위젯스택 상하 통합
// 'NONE': 양쪽 스택 모두 숨김 (캔버스 100% 전체화면)
export type SidebarLayoutMode = 'BOTH' | 'LEFT_ONLY' | 'RIGHT_ONLY' | 'NONE';

export interface FreeformWidgetState {
  x: number;
  y: number;
  width?: number;
  height?: number;
  scale?: number;
  zIndex?: number;
}

export type ChimeSoundType = 
  | 'school_4tone' 
  | 'bell_ding' 
  | 'xylophone' 
  | 'horn' 
  | 'tada'
  | 'music_box'
  | 'whistle'
  | 'marimba';

export interface StudentRoleHistory {
  period: string;
  role: string;
  score?: number;
  comment?: string;
  daily?: Record<string, 'O' | 'X' | '△' | 'H'>;
}

export interface Student {
  id: number;
  number: number;
  name: string;
  gender: 'M' | 'F' | 'A';
  birthDate?: string;
  teamId: number;
  attendance: AttendanceStatus;
  attendanceReasonCategory?: AttendanceReasonCategory;
  attendanceReasonDetail?: string;
  attendanceNote?: string;
  earlyPeriod?: string; // e.g. "4교시 후"
  longTermRange?: { start: string; end: string };
  attendanceCheckedByStudent?: boolean;
  praisePoints: number;
  selectedCount: number;
  roleId?: string;
  roleHistory?: StudentRoleHistory[];
  note?: string;
  // 호환성 및 세부 사유 메모 필드
  status?: AttendanceStatus;
  reasonCategory?: AttendanceReasonCategory;
  reasonDetail?: string;
  reasonNote?: string;
  memo?: string;
}

export interface ClassRole {
  id: string;
  title: string;
  maxCount: number;
  currentStudentIds: number[];
  gender: ('M' | 'F' | 'A')[];
  isDaily: boolean;
  specialDays: string[];
  description: string;
  category?: 'clean' | 'learning' | 'life' | 'tech';
  performanceScores?: Record<number, number>; // studentId -> performance score 0 to 100
  /** 남/여 따로 정한 인원 (예: 남1, 여1). 있으면 maxCount = 남 + 여 */
  genderQuota?: { M: number; F: number };
  /** 검사일: 매일 / 요일 지정(주 n회) / 특별한 날(날짜 지정) */
  schedule?: RoleSchedule;
}

export type RoleWeekDay = '월' | '화' | '수' | '목' | '금';
export interface RoleSchedule {
  type: 'daily' | 'weekly' | 'special';
  days?: RoleWeekDay[];
  /** 특별한 날 (YYYY-MM-DD) */
  dates?: string[];
}

export interface RolePeriodInfo {
  name: string;
  start: string;
  end: string;
  duration: string;
  alertDays: number;
}

export interface Team {
  id: number;
  name: string;
  colorName: string;
  badgeBg: string;
  borderColor: string;
  textColor: string;
  dotColor: string;
  points: number;
  goalPoints: number;
  reward: string;
}

export interface AgendaItem {
  id: string;
  text: string;
  completed: boolean;
  tag?: string;
}

export interface PeriodItem {
  period: number;
  subject: string;
  color: string;
}

export interface DailySchedule {
  [day: string]: PeriodItem[];
}

export type SchedulePeriod = PeriodItem;

export interface BellScheduleItem {
  period: number;
  start: string;
  end: string;
  breakMinutes: number;
  type?: 'period' | 'lunch' | 'PERIOD' | 'LUNCH';
  label?: string;
  enabled?: boolean; // 교시별 노출 선택 체크박스 (true: 노출, false: 숨김)
}

export interface ApiKeysConfig {
  geminiApiKey?: string;
  googleCalendarApiKey?: string;
  googleCalendarId?: string;
  googleClientId?: string;
}

export interface CloudSyncState {
  lastSyncTime?: string;
  status: 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR';
  lastBackupSize?: number;
  message?: string;
}

export interface CustomBackgroundConfig {
  url?: string;
  blur?: number;
  opacity?: number;
  overlay?: 'dark' | 'light' | 'none';
}

export interface PraiseItemConfig {
  id: string;
  label: string;
  title?: string;
  points: number;
  icon: string;
  category?: 'study' | 'attitude' | 'cleaning' | 'cooperation' | 'etc';
}

export interface PraiseHistoryLog {
  id: string;
  studentId: number;
  studentName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  itemLabel: string;
  points: number;
  note?: string;
}

export interface SecurityConfig {
  autoLockMinutes: number; // 0: 사용안함, 1·3·5·10분 또는 직접 입력(1~480분)
  isLocked: boolean;
  passwordHash: string; // SHA-256 또는 암호화된 비밀번호
  recoveryGoogleEmail: string; // 비밀번호 분실 시 복구용 구글 이메일
  lastActiveTimestamp?: number;
}

export interface ObservationWidgetRecord {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  studentId: number;
  studentName: string;
  type: '관찰' | '학생상담' | '학부모상담';
  content: string;
  createdAt: string;
  isEncrypted?: boolean;
  gradeClass?: string; // 교과 전담모드 학년-반 (예: "3-1")
}

export interface ClassConfig {
  dashboardTitle?: string; // 사용자가 직접 설정하는 커스텀 대시보드 명칭 (수업 모드)
  workDashboardTitle?: string; // 사용자가 직접 설정하는 커스텀 대시보드 명칭 (업무 모드)
  schoolName: string;
  location?: string; // 날씨 및 지역 정보 표시용
  grade: number;
  classNum: number;
  teacherName: string;
  totalStudents: number;
  currentPeriodText: string;
  theme: DashboardTheme;
  themeMode?: ThemeMode; // 'system' | 'light' | 'dark'
  fontFamily?: string;
  boardType: 'smart' | 'general';
  bellSchedule: BellScheduleItem[];
  bellScheduleAutoRun: boolean;
  lunchAfterPeriod?: 3 | 4; // 점심시간 위치 (3교시 후 or 4교시 후)
  featuresEnabled: Record<string, boolean>;
  layoutMode?: WidgetPlacementMode;
  customBackground?: CustomBackgroundConfig;
  googleCalendarUrl?: string;
  googleSheetUrl?: string; // 학생 관찰기록 및 칭찬 통계 구글 시트 백업 URL
  attendanceGoogleSheetUrl?: string; // 📊 출결 관리 자동 백업 및 월말 통계 구글 시트 웹앱 URL
  attendanceAutoBackupTime?: string; // ⏰ 출결 자동 백업 시간 (예: "16:00", 기본값: "16:00")
  apiKeys?: ApiKeysConfig; // 사용자 직접 입력 BYOK API 키 설정
  cloudSync?: CloudSyncState; // 구글 드라이브 클라우드 동기화 상태
  weeklySchedulePdfUrl?: string; // 주간학습안내 업로드 파일 데이터 URL
  weeklySchedulePdfName?: string; // 주간학습안내 파일명
  stageManagerMode?: boolean; // 스테이지 매니저 모드 활성화 여부
  stageManagerOpacity?: number; // 스테이지 매니저 배경 투명도 (0.1 ~ 1.0)
  focusWidgetIds?: string[]; // 🎯 커스텀 포커스 모드(Focus Mode)에서 화면에 유지할 위젯 ID 목록
  securityConfig?: SecurityConfig;
  praiseConfigs?: PraiseItemConfig[];
  widgetOpacity?: number; // 모든 위젯 배경 투명도 (0.2 ~ 1.0, 기본 0.95)
  widgetHeaderColorMode?: 'auto' | 'custom' | 'transparent'; // 개별 위젯 상단 바 색상 설정: [테마 자동 적용] / [사용자 커스텀 컬러] / [투명 (위젯 일체형)]
  customWidgetHeaderColor?: string; // 사용자 커스텀 위젯 상단 바 색상 hex
  canvasBgImage?: string; // 위젯 영역 배경 사용자화 이미지 (Data URL)
  dashboardBgColor?: string; // 대시보드 배경 색상 (커스텀 hex 또는 테마 연동)
  dashboardBgOpacity?: number; // 대시보드 배경 투명도 (0.0 ~ 1.0)
  fontScale?: number; // 캔버스 및 글씨 크기 배율 (0.8 ~ 1.3, 기본값 1.0)
  dockAutoHide?: boolean; // 하단 위젯바 자동 숨김 (true: 마우스 오버 시 바운스 노출, false: 항상 노출)
  dockBgColor?: string; // 하단 위젯바 배경 색상
  dockOpacity?: number; // 하단 위젯바 배경 투명도 (0.2 ~ 1.0)
  // ✨ 위젯 영역 텍스트 가독성 최적화 설정
  widgetTextContrast?: 'auto' | 'high' | 'ultra'; // 'auto': 테마 맞춤 자동 | 'high': 선명한 고대비 | 'ultra': 초고대비 (원거리 시인성 극대화)
  widgetTextShadow?: boolean; // 위젯 내 텍스트 미세 외곽선/그림자 추가로 묻힘 방지
  widgetCardSolidBg?: boolean; // 위젯 카드 배경 불투명화 (배경 이미지/색상이 비쳐 글씨가 묻히는 현상 완벽 방지)
  collapseEffect?: 'portal' | 'genie'; // 대시보드 접기 효과: 루미 문(포털) / 지니
  dashboardBorderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full'; // 위젯 및 대시보드 모서리 라운드(곡률) 정도 (PDF 2페이지 수정사항 2 반영)
  // 🕒 교사 출퇴근 및 학기별 방학 D-Day 연동 설정
  workStartTime?: string; // 교사 출근 시간 (기본값: "08:30")
  workEndTime?: string; // 교사 퇴근 시간 (기본값: "16:30")
  enableLeaveWorkAlert?: boolean; // 퇴근 시간 도달 시 알림 팝업 활성화 여부
  summerVacationDate?: string; // 1학기 여름방학 시작일 (예: "2026-07-20")
  semester1StartDate?: string; // 🌇 1학기 개학일 (수업일수 계산)
  semester2StartDate?: string; // 🌇 2학기 개학일 (수업일수 계산)
  schoolDaysOff?: number; // 재량휴업일·개교기념일 등 (직접 입력, 빼는 날)
  schoolDaysExtra?: number; // 겨울방학 뒤 2월 등교 등 (직접 입력, 더하는 날)
  schoolDaysConfirmed?: { total: number; sig: string; at: string } | null; // 선생님이 확인한 수업일수
  enableDuskBackground?: boolean; // 퇴근 30분 전부터 노을(비·눈) 배경
  seamlessLayout?: boolean; // 🫧 경계 없는 한 판 화면 (헤더 · 스택 · 위젯 영역 구분선 없음, 기본 켜짐)
  winterVacationDate?: string; // 2학기 겨울방학 시작일 (예: "2026-12-24")
  // 🎓 [담임교사 vs 교과전담 교사] 모드 이원화 설정
  teacherMode?: 'homeroom' | 'subject'; // 'homeroom': 담임모드(기본) | 'subject': 전담모드
  subjectWeeklyTargetHours?: number; // 전담 주당 목표 시수 (기본 18시수)
  subjectWeeklyCompletedHours?: number; // 전담 주당 진행 완료 시수 (기본 8시수)
  subjectClasses?: string[]; // 전담 담당 학급 목록 (예: ['3-1', '3-2', '4-1', '4-2', '5-1'])
  subjectTimetable?: Record<string, Record<number, string>>; // 전담 요일별/교시별 학급 배정표 { '월': { 1: '3-1', 2: '3-2' ... } }
}

// ⏰ 학급 표준 시계 위젯 설정 타입
export type ClockStyle = 'digital' | 'minimal' | 'flip' | 'analog';
export type ClockBg = 'dark' | 'gradient' | 'chalkboard' | 'glass';
export type ClockTimeFormat = '12h' | '24h';

export interface QuizQuestion {
  id: string;
  type: 'ox' | 'choice';
  question: string;
  options?: string[]; // for choice (e.g. 2 to 5 options)
  answer: string | number; // 'O'|'X' or index 0-4
  explanation?: string;
}

export interface TelepathyQuiz {
  id: string;
  question: string;
  corners: [string, string, string, string]; // 1: 앞왼, 2: 앞오른, 3: 뒤왼, 4: 뒤오른
  correctCorner: 1 | 2 | 3 | 4;
  timeLimit: number;
}

export interface BasketballScoreboardTeam {
  id: number;
  name: string;
  score: number;
  color: string;
}

export interface AttentionNotice {
  message: string;
  sound: ChimeSoundType;
  enableTTS: boolean;
  ttsVoiceRate?: number;
}

export interface ObservationRecord {
  id: string;
  date: string;
  studentId: number;
  studentName: string;
  situation: '수업' | '쉬는시간' | '상담' | '생활지도' | '기타';
  category?: '수업' | '쉬는시간' | '상담' | '생활지도' | '기타';
  content: string;
  createdAt: string;
}

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  color?: string;
  type: '학사' | '행사' | '수업' | '회의' | '업무' | 'school' | 'exam' | 'event' | 'holiday';
}

export interface GoogleTaskItem {
  id: string;
  title: string;
  dueDate?: string;
  completed: boolean;
  priority?: 'high' | 'medium' | 'low';
}

export interface CleanBannerSettings {
  text: string;
  color: string;
  bgColor: string;
  fontFamily: string;
  fontSize: 'sm' | 'md' | 'lg' | 'xl';
  speed: number;
}

export type PostItColor = 'yellow' | 'green' | 'sky' | 'pink' | 'purple' | 'orange' | 'transparent';

export interface PostItWidgetData {
  id: string; // 예: 'postit_1726830000000'
  title: string;
  content: string;
  color: PostItColor;
  fontSize?: 'sm' | 'md' | 'lg';
  createdAt?: string | number;
  updatedAt?: number;
}

export interface PostItNote {
  id: string;
  text: string;
  color: string; // bg hex or tailwind class
  fontFamily: string;
  fontSize: 'sm' | 'md' | 'lg';
  createdAt: number;
  updatedAt: number;
}

export interface WorkLink {
  id: string;
  title: string;
  url: string;
  iconName: string;
  color: string;
  iconImageUrl?: string;
}

export interface PhotoFrameConfig {
  imageUrl: string;
  frameStyle: 'wood' | 'metal' | 'gold' | 'polaroid' | 'minimal' | 'pastel';
  caption: string;
  frameColor?: string;
  borderWidth?: number;
}

export interface DailyQuoteConfig {
  alertTime: string;
  customQuotes: string[];
  autoEnabled: boolean;
  teacherMessage?: string;
}

export interface SchoolMessengerItem {
  id: string;
  sender: string;
  content: string;
  deadline: string;
  useDeadline: boolean;
  completed: boolean;
  createdAt: string;
}

export interface SchoolInfoContact {
  id: string;
  label: string;
  number: string;
  /** 주소 (선택) */
  address?: string;
}

export interface SchoolShoppingAccount {
  id: string;
  mallName: string;
  url: string;
  username: string;
  password: string;
}

export interface SchoolInfoTab {
  id: string;
  title: string;
  type: 'info' | 'shopping' | 'custom';
  contacts?: SchoolInfoContact[];
  shoppingAccounts?: SchoolShoppingAccount[];
  customText?: string;
  customImages?: { id: string; name: string; url: string }[];
}

export interface MealNutrient {
  name: string;
  amount: string;
  dailyPercent?: number;
}

export interface SchoolMealDay {
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  mealType: string; // 중식
  calorie: string; // 예: 645.2 kcal
  menuItems: {
    name: string;
    allergies: number[]; // 알레르기 유발물질 번호 (1: 난류, 2: 우유, 5: 대두, 6: 밀 등)
  }[];
  nutrients: MealNutrient[];
  originInfo: string; // 원산지 정보
  specialNote?: string;
}

export type DDayAlertOffset = '1d' | 'day_of' | '1h' | '30m';

export type DDayCategory =
  | '개인'
  | '가족'
  | '학교'
  | '기념일'
  | '여행'
  | '휴가'
  | '시험'
  | '자격증'
  | '운동'
  | '재테크'
  | '기타'
  | '학사' // 기존 저장 데이터 하위 호환
  | '행사'; // 기존 저장 데이터 하위 호환

export interface DDayItem {
  id: string;
  title: string;
  targetDate: string; // YYYY-MM-DD or YYYY-MM-DDTHH:mm
  targetTime?: string; // HH:mm
  category: DDayCategory | string;
  color: string;
  notifications: DDayAlertOffset[]; // 1일전, 당일(하루전), 1시간전, 30분전
  note?: string;
  isImportant?: boolean;
}

// ============================================================================
// 유튜브 임베드 및 자동 재생 위젯 (YouTube Embed Widget) 타입
// ============================================================================
export type YouTubeFoldBehavior = 'stack' | 'mini';

export interface YouTubeRecentVideo {
  id: string;        // 고유 식별자 (타임스탬프 등)
  url: string;       // 원본 입력 URL
  videoId: string;   // 11자리 비디오 고유 ID
  title?: string;    // 영상 타이틀 또는 레이블 (선택)
  playedAt: number;  // 재생 시각 타임스탬프
}

export interface YouTubeWidgetProps {
  onShowToast?: (message: string) => void;
  className?: string;
  activeVideoId?: string | null;
  onActiveVideoChange?: (videoId: string | null, url: string) => void;
  foldBehavior?: YouTubeFoldBehavior;
  onFoldBehaviorChange?: (behavior: YouTubeFoldBehavior) => void;
  isStacked?: boolean;
  isCollapsed?: boolean;
  onExpand?: () => void;
}

// ============================================================================
// '오늘의 글' 응원 카드 문구 재생목록 (Quote Playlist) 타입
// ============================================================================
export interface QuoteItem {
  id: string;
  text: string;
  createdAt: string;
  isSelected: boolean; // 현재 카드에 노출 중인 문구 여부
  bookTitle?: string; // 책 제목 / 도서명
  publisher?: string; // 출판사
  author?: string;    // 지은이
}

// ============================================================================
// 💡 스마트 '아이디어 노트(Idea Note)' 위젯 스키마 (PRD 5.1 규격)
// ============================================================================
export interface AttachedImage {
  file_name: string;
  file_size: number;
  thumbnail_url: string; // Base64 Data URL (영구 보존용)
  source_type: 'clipboard' | 'upload';
}

export interface IdeaTag {
  id: string;
  name: string;
  color_code: string;
  text_color: string;
}

export interface IdeaItem {
  idea_id: string;
  title: string;
  content: string;
  tag: IdeaTag;
  color_label: string; // 5종 파스텔 도트 컬러
  attached_images: AttachedImage[];
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  stack_order: number;
}

export interface IdeaSettings {
  view_mode: 'stack' | 'list';
  stack_depth: number; // 범위: 3 ~ 10장, 기본값: 5장
  shortcut_key: string; // 기본값: 'Alt+N'
  auto_clipboard_detect: boolean;
  close_on_save: boolean;
  tags: IdeaTag[];
  sync_cloud: boolean;
}

export const DEFAULT_IDEA_TAGS: IdeaTag[] = [
  { id: 'tag_class', name: '수업 아이디어', color_code: '#dbeafe', text_color: '#1e40af' },
  { id: 'tag_manage', name: '학급경영/생활', color_code: '#dcfce7', text_color: '#166534' },
  { id: 'tag_admin', name: '업무/행정', color_code: '#fef3c7', text_color: '#92400e' },
  { id: 'tag_event', name: '행사/기획', color_code: '#fce7f3', text_color: '#9d174d' },
  { id: 'tag_general', name: '일반/기타', color_code: '#f3e8ff', text_color: '#6b21a8' },
];

export const DEFAULT_IDEA_SETTINGS: IdeaSettings = {
  view_mode: 'stack',
  stack_depth: 5,
  shortcut_key: 'Alt+N',
  auto_clipboard_detect: true,
  close_on_save: true,
  tags: DEFAULT_IDEA_TAGS,
  sync_cloud: true,
};

export const IDEA_PASTEL_COLORS: { id: string; name: string; bg: string; border: string; dot: string; lightBg: string }[] = [
  { id: 'yellow', name: '레몬 옐로우', bg: '#fef9c3', border: '#fde047', dot: '#eab308', lightBg: 'bg-yellow-50 dark:bg-yellow-950/20' },
  { id: 'green', name: '민트 그린', bg: '#dcfce7', border: '#86efac', dot: '#22c55e', lightBg: 'bg-emerald-50 dark:bg-emerald-950/20' },
  { id: 'blue', name: '스카이 블루', bg: '#e0f2fe', border: '#7dd3fc', dot: '#0284c7', lightBg: 'bg-sky-50 dark:bg-sky-950/20' },
  { id: 'pink', name: '블라썸 핑크', bg: '#fce7f3', border: '#f472b6', dot: '#ec4899', lightBg: 'bg-pink-50 dark:bg-pink-950/20' },
  { id: 'purple', name: '라벤더 퍼플', bg: '#f3e8ff', border: '#d8b4fe', dot: '#a855f7', lightBg: 'bg-purple-50 dark:bg-purple-950/20' },
];

/**
 * 💡 초등학교 학급 운영 맞춤형 기본 샘플 아이디어 4선
 */
export const DEFAULT_MOCK_IDEAS: IdeaItem[] = [
  {
    idea_id: 'mock-idea-1',
    title: '수학 3단원 곱셈 구구단 보물찾기 릴레이',
    content: '교실 곳곳에 숨겨진 곱셈 문제 카드를 모둠별로 찾아 릴레이로 암산 풀이 후, 정답 보물상자 열쇠 스티커 획득하기! 학생들의 참여도와 흥미 유발에 최고.',
    tag: DEFAULT_IDEA_TAGS[0], // 수업 아이디어
    color_label: 'yellow',
    attached_images: [],
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    is_archived: false,
    stack_order: 1,
  },
  {
    idea_id: 'mock-idea-2',
    title: '칭찬 별 모음판 1인 1역할 성실 학생 보상 쿠폰',
    content: '매주 금요일 1인 1역할 청소 및 우유 급식 도우미 성실 수행 학생에게 "원하는 자리 하루 선택권" 또는 "선생님과 보드게임 1판 쿠폰" 지급하기.',
    tag: DEFAULT_IDEA_TAGS[1], // 학급경영/생활
    color_label: 'green',
    attached_images: [],
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    is_archived: false,
    stack_order: 2,
  },
  {
    idea_id: 'mock-idea-3',
    title: '학부모 상담 주간 설문지 취합 및 타임테이블 구성',
    content: '구글 폼으로 희망 시간대(대면/유선) 사전 설문 받고, 3-1반 알림장에 15분 단위 상담 안내표 작성해서 공지 올리기.',
    tag: DEFAULT_IDEA_TAGS[2], // 업무/행정
    color_label: 'blue',
    attached_images: [],
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    is_archived: false,
    stack_order: 3,
  },
  {
    idea_id: 'mock-idea-4',
    title: '가을 학급 운동회 미니 올림픽 단체 응원 도구',
    content: '재활용 페트병에 쌀과 콩을 넣어 만든 마라카스로 소음 없이 신나게 리듬 타는 응원전 기획. 안전하고 다 함께 웃을 수 있는 시간 만들기.',
    tag: DEFAULT_IDEA_TAGS[3], // 행사/기획
    color_label: 'pink',
    attached_images: [],
    created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 72).toISOString(),
    is_archived: false,
    stack_order: 4,
  },
];




