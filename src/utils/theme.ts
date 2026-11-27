import { DashboardTheme } from '../types';

export interface ThemeConfig {
  id: DashboardTheme;
  name: string;
  badge: string;
  description: string;
  bodyClass: string;
  headerClass: string;
  cardClass: string;
  borderClass: string;
  accentClass: string;
  accentBg: string;
  accentText: string;
  inputClass: string;
  stripeGradient: string;
  isDark?: boolean;
  // 🎨 테마 연동 헤더 및 위젯 카드 색상 필드
  cardBgLight?: string;
  cardBorderLight?: string;
  headerBgLight?: string;
  headerBorderLight?: string;
  // 🌟 상단헤더 대표 색상 고도화 필드 (밝고 특징이 뚜렷한 색상)
  headerGradientClass?: string;       // 헤더 컨테이너 그라데이션 클래스
  headerBorderClass?: string;         // 헤더 컨테이너 테두리 클래스
  headerAccentColor?: string;         // 헤더 내 주요 악센트 컬러
  headerAccentTextClass?: string;     // 헤더 내 날짜(월/요일) 및 텍스트 컬러 클래스
  headerDividerClass?: string;        // 헤더 가로 구분선 클래스
  headerLogoGradientClass?: string;   // 헤더 로고 박스 그라데이션
  headerBookmarkLabelClass?: string;  // 바로가기 라벨 텍스트 클래스
  // 🍬 테마 연동 상단 캔디바 패널 스타일
  candyBars?: CandyBarThemeStyles;
}

export interface CandyBarThemeItem {
  bgClass: string;
  dotClass?: string;
  iconClass?: string;
  badgeClass?: string;
  progressGradientClass?: string;
}

export interface CandyBarThemeStyles {
  attendance: CandyBarThemeItem;
  commemorative: CandyBarThemeItem;
  leaveWork: CandyBarThemeItem;
  vacation: CandyBarThemeItem;
}

export const THEME_CONFIGS: Record<DashboardTheme, ThemeConfig> = {
  'clean-white': {
    id: 'clean-white',
    name: '🤍 클린 화이트 (기본)',
    badge: 'Clean White',
    description: '연회색 바탕 · 흰 카드 · 로열 블루와 블랙 포인트 (Dashboard V21 색감)',
    bodyClass: 'bg-[#F2F3F5] text-[#0B0B0F]',
    headerClass: 'bg-white border-transparent shadow-sm text-[#0B0B0F]',
    cardClass: 'bg-white border-transparent shadow-sm text-[#0B0B0F]',
    borderClass: 'border-[#ECEDF0]',
    accentClass: 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold',
    accentBg: 'bg-[#EEF2FF]',
    accentText: 'text-[#2563EB]',
    inputClass: 'bg-[#F4F5F7] border-[#E6E7EB] text-[#0B0B0F]',
    stripeGradient: 'bg-gradient-to-r from-[#2563EB] to-[#0B0B0F]',
    isDark: false,
    cardBgLight: '#FFFFFF',
    cardBorderLight: 'rgba(15, 23, 42, 0.04)',
    headerBgLight: '#FFFFFF',
    headerBorderLight: 'rgba(15, 23, 42, 0.04)',
  },
  'glass-aurora': {
    id: 'glass-aurora',
    name: '글래스모피즘 2.0 (프로스티드 오로라)',
    badge: 'Frosted Aurora',
    description: '신비로운 오로라 그라디언트와 빛나는 반투명 유리 카드 UI',
    bodyClass: 'bg-transparent text-[#292638]',
    headerClass: 'glass-card-surface shadow-md text-[#292638] dark:text-white',
    cardClass: 'glass-card-surface text-[#292638] dark:text-white',
    borderClass: 'border-[#E8E5ED]',
    accentClass: 'bg-[#7457F5] hover:bg-[#6243E8] text-white font-black',
    accentBg: 'bg-[#E8E1FF]',
    accentText: 'text-[#7457F5] dark:text-[#E8E1FF]',
    inputClass: 'bg-white/80 border-[#E8E5ED] text-[#292638] placeholder-slate-400',
    stripeGradient: 'bg-gradient-to-r from-[#7457F5] via-[#a855f7] to-[#ec4899]',
    isDark: false,
    cardBgLight: 'rgba(255, 255, 255, 0.88)',
    cardBorderLight: '#E8E5ED',
    // 🌟 대표 색상: 화사하고 신비로운 소프트 라벤더 & 바이올렛 오로라
    headerBgLight: 'rgba(243, 238, 255, 0.95)',
    headerBorderLight: 'rgba(192, 132, 252, 0.55)',
    headerGradientClass: 'bg-gradient-to-r from-[#ede9fe]/95 via-[#f5f3ff]/95 to-[#fae8ff]/95 dark:from-[#110e2e]/95 dark:via-[#161238]/95 dark:to-[#1f153d]/95',
    headerBorderClass: 'border-2 border-purple-300/80 dark:border-purple-800/60 shadow-purple-500/10',
    headerAccentColor: '#7457F5',
    headerAccentTextClass: 'text-[#7457F5] dark:text-purple-300',
    headerDividerClass: 'bg-purple-200/80 dark:bg-purple-900/50',
    headerLogoGradientClass: 'from-[#7457F5] via-[#6243E8] to-[#8b5cf6]',
    headerBookmarkLabelClass: 'text-purple-600 dark:text-purple-400',
    // 🍬 캔디바: 신비롭고 화사한 라벤더, 로즈, 인디고, 오로라 톤
    candyBars: {
      attendance: {
        bgClass: 'bg-purple-100/90 dark:bg-purple-950/45 border border-purple-200/80 dark:border-purple-500/40 hover:bg-purple-200/80 dark:hover:bg-purple-900/50',
        dotClass: 'bg-[#7457F5] dark:bg-purple-400 shadow-[0_0_8px_#a855f7]',
      },
      commemorative: {
        bgClass: 'bg-pink-100/90 dark:bg-pink-950/45 border border-pink-200/80 dark:border-pink-500/40 hover:bg-pink-200/80 dark:hover:bg-pink-900/50',
        iconClass: 'text-pink-600 dark:text-pink-400',
        badgeClass: 'bg-pink-500 dark:bg-pink-600 text-white shadow-[0_0_8px_rgba(236,72,153,0.4)]',
      },
      leaveWork: {
        bgClass: 'bg-indigo-100/90 dark:bg-indigo-950/45 border border-indigo-200/80 dark:border-indigo-500/40',
        dotClass: 'bg-[#6243E8] dark:bg-indigo-400 shadow-[0_0_8px_#818cf8]',
        progressGradientClass: 'from-indigo-500 via-purple-500 to-pink-500',
      },
      vacation: {
        bgClass: 'bg-fuchsia-100/90 dark:bg-fuchsia-950/45 border border-fuchsia-200/80 dark:border-fuchsia-500/40 hover:bg-fuchsia-200/80 dark:hover:bg-fuchsia-900/50',
        iconClass: 'text-fuchsia-600 dark:text-fuchsia-400',
        badgeClass: 'bg-fuchsia-500 dark:bg-fuchsia-600 text-white shadow-[0_0_8px_rgba(217,70,239,0.4)]',
      },
    },
  },
  'class-basic': {
    id: 'class-basic',
    name: '스쿨 베이직 (활기찬 옐로우 & 스카이)',
    badge: 'School Basic',
    description: '아이들의 밝은 에너지와 높은 정보 가독성을 제공하는 교실 표준 테마',
    bodyClass: 'bg-[#F4F8FC] text-slate-900',
    headerClass: 'bg-[#F4F8FC]/95 border-sky-200/80 shadow-md text-slate-900',
    cardClass: 'bg-white/95 border-sky-200/70 shadow-sm text-slate-900',
    borderClass: 'border-sky-200',
    accentClass: 'bg-[#20B7ED] hover:bg-[#199ecf] text-white font-black',
    accentBg: 'bg-sky-100',
    accentText: 'text-sky-800',
    inputClass: 'bg-white border-sky-200 text-slate-900 placeholder-sky-400',
    stripeGradient: 'bg-gradient-to-r from-[#20B7ED] via-[#FFC43D] to-[#3978F6]',
    isDark: false,
    cardBgLight: 'rgba(255, 255, 255, 0.92)',
    cardBorderLight: 'rgba(32, 183, 237, 0.35)',
    // 🌟 대표 색상: 청량한 스카이블루에서 산뜻한 레몬 옐로우로 이어지는 밝은 교실 에너지
    headerBgLight: 'rgba(224, 242, 254, 0.95)',
    headerBorderLight: 'rgba(56, 189, 248, 0.6)',
    headerGradientClass: 'bg-gradient-to-r from-[#e0f2fe]/95 via-[#f0f9ff]/95 to-[#fef9c3]/95 dark:from-[#0a1c2e]/95 dark:via-[#0e253c]/95 dark:to-[#122e47]/95',
    headerBorderClass: 'border-2 border-sky-300/90 dark:border-sky-800/60 shadow-sky-500/10',
    headerAccentColor: '#0284c7',
    headerAccentTextClass: 'text-sky-600 dark:text-sky-300',
    headerDividerClass: 'bg-sky-200/90 dark:bg-sky-900/50',
    headerLogoGradientClass: 'from-[#0284c7] via-[#0ea5e9] to-[#38bdf8]',
    headerBookmarkLabelClass: 'text-sky-600 dark:text-sky-400',
    // 🍬 캔디바: 청량한 스카이, 산뜻한 레몬 옐로우, 마린 블루 톤
    candyBars: {
      attendance: {
        bgClass: 'bg-sky-100/90 dark:bg-sky-950/45 border border-sky-200/90 dark:border-sky-500/40 hover:bg-sky-200/80 dark:hover:bg-sky-900/50',
        dotClass: 'bg-sky-500 dark:bg-sky-400 shadow-[0_0_8px_#0ea5e9]',
      },
      commemorative: {
        bgClass: 'bg-amber-100/90 dark:bg-amber-950/45 border border-amber-200/90 dark:border-amber-500/40 hover:bg-amber-200/80 dark:hover:bg-amber-900/50',
        iconClass: 'text-amber-600 dark:text-amber-400',
        badgeClass: 'bg-amber-500 dark:bg-amber-600 text-white shadow-[0_0_8px_rgba(245,158,11,0.4)]',
      },
      leaveWork: {
        bgClass: 'bg-blue-100/90 dark:bg-blue-950/45 border border-blue-200/90 dark:border-blue-500/40',
        dotClass: 'bg-blue-500 dark:bg-blue-400 shadow-[0_0_8px_#3b82f6]',
        progressGradientClass: 'from-sky-400 via-blue-500 to-indigo-500',
      },
      vacation: {
        bgClass: 'bg-yellow-100/90 dark:bg-yellow-950/45 border border-yellow-200/90 dark:border-yellow-500/40 hover:bg-yellow-200/80 dark:hover:bg-yellow-900/50',
        iconClass: 'text-amber-600 dark:text-amber-400',
        badgeClass: 'bg-amber-500 dark:bg-amber-600 text-white shadow-[0_0_8px_rgba(245,158,11,0.4)]',
      },
    },
  },
  'cozy-latte': {
    id: 'cozy-latte',
    name: '코지 웜 & 라떼 (소프트 피치 & 우드)',
    badge: 'Cozy Latte',
    description: '포근하고 정서적 안정감을 주는 따뜻한 베이지 및 피치 크림 톤',
    bodyClass: 'bg-[#FBF5EC] text-[#4a3525]',
    headerClass: 'bg-[#FBF5EC]/95 border-[#E8E5E2] shadow-md text-[#4a3525]',
    cardClass: 'bg-white/95 border-[#E8E5E2] shadow-sm text-[#4a3525]',
    borderClass: 'border-[#E8E5E2]',
    accentClass: 'bg-[#C96712] hover:bg-[#b0580e] text-white font-black',
    accentBg: 'bg-[#F5EDE3]',
    accentText: 'text-[#8D6244]',
    inputClass: 'bg-white border-[#E8E5E2] text-[#4a3525] placeholder-[#B0967E]',
    stripeGradient: 'bg-gradient-to-r from-[#C96712] via-[#FFC07C] to-[#8D6244]',
    isDark: false,
    cardBgLight: 'rgba(255, 255, 255, 0.92)',
    cardBorderLight: '#E8E5E2',
    // 🌟 대표 색상: 포근하고 화사한 소프트 피치 & 웜 애프리콧 살구빛 크림
    headerBgLight: 'rgba(255, 237, 213, 0.95)',
    headerBorderLight: 'rgba(251, 146, 60, 0.55)',
    headerGradientClass: 'bg-gradient-to-r from-[#ffedd5]/95 via-[#fff7ed]/95 to-[#fed7aa]/95 dark:from-[#26150a]/95 dark:via-[#2e1a0e]/95 dark:to-[#382012]/95',
    headerBorderClass: 'border-2 border-orange-300/80 dark:border-orange-900/60 shadow-orange-500/10',
    headerAccentColor: '#ea580c',
    headerAccentTextClass: 'text-orange-600 dark:text-orange-300',
    headerDividerClass: 'bg-orange-200/80 dark:bg-orange-950/60',
    headerLogoGradientClass: 'from-[#ea580c] via-[#f97316] to-[#fb923c]',
    headerBookmarkLabelClass: 'text-orange-600 dark:text-orange-400',
    // 🍬 캔디바: 포근한 소프트 피치, 살구빛 코랄, 시나몬 크림 톤
    candyBars: {
      attendance: {
        bgClass: 'bg-orange-100/90 dark:bg-orange-950/45 border border-orange-200/80 dark:border-orange-500/40 hover:bg-orange-200/80 dark:hover:bg-orange-900/50',
        dotClass: 'bg-orange-500 dark:bg-orange-400 shadow-[0_0_8px_#f97316]',
      },
      commemorative: {
        bgClass: 'bg-rose-100/90 dark:bg-rose-950/45 border border-rose-200/80 dark:border-rose-500/40 hover:bg-rose-200/80 dark:hover:bg-rose-900/50',
        iconClass: 'text-rose-600 dark:text-rose-400',
        badgeClass: 'bg-rose-500 dark:bg-rose-600 text-white shadow-[0_0_8px_rgba(244,63,94,0.4)]',
      },
      leaveWork: {
        bgClass: 'bg-amber-100/90 dark:bg-amber-950/45 border border-amber-200/80 dark:border-amber-500/40',
        dotClass: 'bg-[#c2410c] dark:bg-amber-400 shadow-[0_0_8px_#ea580c]',
        progressGradientClass: 'from-amber-400 via-orange-500 to-rose-500',
      },
      vacation: {
        bgClass: 'bg-stone-100/90 dark:bg-stone-900/60 border border-stone-200/90 dark:border-stone-700/50 hover:bg-stone-200/80 dark:hover:bg-stone-800/50',
        iconClass: 'text-orange-600 dark:text-orange-400',
        badgeClass: 'bg-orange-500 dark:bg-orange-600 text-white shadow-[0_0_8px_rgba(249,115,22,0.4)]',
      },
    },
  },
  'botanical-sage': {
    id: 'botanical-sage',
    name: '보태니컬 세이지 (차분한 내추럴 그린)',
    badge: 'Botanical Sage',
    description: '눈의 피로를 덜어주고 차분한 집중을 돕는 자연 친화적 세이지 그린',
    bodyClass: 'bg-[#F1F8F4] text-emerald-950',
    headerClass: 'bg-[#F1F8F4]/95 border-emerald-200/80 shadow-md text-emerald-950',
    cardClass: 'bg-white/95 border-emerald-200/70 shadow-sm text-emerald-950',
    borderClass: 'border-emerald-200',
    accentClass: 'bg-[#079B7B] hover:bg-[#068469] text-white font-black',
    accentBg: 'bg-emerald-100',
    accentText: 'text-emerald-800',
    inputClass: 'bg-white border-emerald-200 text-emerald-950 placeholder-emerald-400',
    stripeGradient: 'bg-gradient-to-r from-[#079B7B] via-[#00C8B6] to-[#10B981]',
    isDark: false,
    cardBgLight: 'rgba(255, 255, 255, 0.92)',
    cardBorderLight: 'rgba(7, 155, 123, 0.25)',
    // 🌟 대표 색상: 싱그럽고 맑은 민트 & 내추럴 세이지 그린
    headerBgLight: 'rgba(209, 250, 229, 0.95)',
    headerBorderLight: 'rgba(52, 211, 153, 0.55)',
    headerGradientClass: 'bg-gradient-to-r from-[#d1fae5]/95 via-[#ecfdf5]/95 to-[#ccfbf1]/95 dark:from-[#0a2016]/95 dark:via-[#0c271b]/95 dark:to-[#103223]/95',
    headerBorderClass: 'border-2 border-emerald-300/90 dark:border-emerald-800/60 shadow-emerald-500/10',
    headerAccentColor: '#059669',
    headerAccentTextClass: 'text-emerald-600 dark:text-emerald-300',
    headerDividerClass: 'bg-emerald-200/80 dark:bg-emerald-900/50',
    headerLogoGradientClass: 'from-[#059669] via-[#10b981] to-[#34d399]',
    headerBookmarkLabelClass: 'text-emerald-600 dark:text-emerald-400',
    // 🍬 캔디바: 싱그러운 민트, 차분한 세이지 틸, 청록 아쿠아 톤
    candyBars: {
      attendance: {
        bgClass: 'bg-emerald-100/90 dark:bg-emerald-950/45 border border-emerald-200/80 dark:border-emerald-500/40 hover:bg-emerald-200/80 dark:hover:bg-emerald-900/50',
        dotClass: 'bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_#10b981]',
      },
      commemorative: {
        bgClass: 'bg-teal-100/90 dark:bg-teal-950/45 border border-teal-200/80 dark:border-teal-500/40 hover:bg-teal-200/80 dark:hover:bg-teal-900/50',
        iconClass: 'text-teal-600 dark:text-teal-400',
        badgeClass: 'bg-teal-600 dark:bg-teal-600 text-white shadow-[0_0_8px_rgba(13,148,136,0.4)]',
      },
      leaveWork: {
        bgClass: 'bg-cyan-100/90 dark:bg-cyan-950/45 border border-cyan-200/80 dark:border-cyan-500/40',
        dotClass: 'bg-teal-500 dark:bg-cyan-400 shadow-[0_0_8px_#06b6d4]',
        progressGradientClass: 'from-emerald-400 via-teal-500 to-cyan-500',
      },
      vacation: {
        bgClass: 'bg-green-100/90 dark:bg-green-950/45 border border-green-200/80 dark:border-green-500/40 hover:bg-green-200/80 dark:hover:bg-green-900/50',
        iconClass: 'text-emerald-600 dark:text-emerald-400',
        badgeClass: 'bg-emerald-600 dark:bg-emerald-600 text-white shadow-[0_0_8px_rgba(16,185,129,0.4)]',
      },
    },
  },
  glassmorphism: {
    id: 'glass-aurora' as any,
    name: '글래스모피즘 2.0 (프로스티드 오로라)',
    badge: 'Frosted Aurora',
    description: '신비로운 오로라 그라디언트와 빛나는 반투명 유리 카드 UI',
    bodyClass: 'bg-transparent text-[#292638]',
    headerClass: 'glass-card-surface shadow-md text-[#292638] dark:text-white',
    cardClass: 'glass-card-surface text-[#292638] dark:text-white',
    borderClass: 'border-[#E8E5ED]',
    accentClass: 'bg-[#7457F5] hover:bg-[#6243E8] text-white font-black',
    accentBg: 'bg-[#E8E1FF]',
    accentText: 'text-[#7457F5] dark:text-[#E8E1FF]',
    inputClass: 'bg-white/80 border-[#E8E5ED] text-[#292638] placeholder-slate-400',
    stripeGradient: 'bg-gradient-to-r from-[#7457F5] via-[#a855f7] to-[#ec4899]',
    isDark: false,
    cardBgLight: 'rgba(255, 255, 255, 0.88)',
    cardBorderLight: '#E8E5ED',
    headerBgLight: 'rgba(243, 238, 255, 0.95)',
    headerBorderLight: 'rgba(192, 132, 252, 0.55)',
    headerGradientClass: 'bg-gradient-to-r from-[#ede9fe]/95 via-[#f5f3ff]/95 to-[#fae8ff]/95 dark:from-[#110e2e]/95 dark:via-[#161238]/95 dark:to-[#1f153d]/95',
    headerBorderClass: 'border-2 border-purple-300/80 dark:border-purple-800/60 shadow-purple-500/10',
    headerAccentColor: '#7457F5',
    headerAccentTextClass: 'text-[#7457F5] dark:text-purple-300',
    headerDividerClass: 'bg-purple-200/80 dark:bg-purple-900/50',
    headerLogoGradientClass: 'from-[#7457F5] via-[#6243E8] to-[#8b5cf6]',
    headerBookmarkLabelClass: 'text-purple-600 dark:text-purple-400',
  },
  slate: {
    id: 'glass-aurora' as any,
    name: '글래스모피즘 2.0 (프로스티드 오로라)',
    badge: 'Frosted Aurora',
    description: '신비로운 오로라 그라디언트와 빛나는 반투명 유리 카드 UI',
    bodyClass: 'bg-transparent text-[#292638]',
    headerClass: 'glass-card-surface shadow-md text-[#292638] dark:text-white',
    cardClass: 'glass-card-surface text-[#292638] dark:text-white',
    borderClass: 'border-[#E8E5ED]',
    accentClass: 'bg-[#7457F5] hover:bg-[#6243E8] text-white font-black',
    accentBg: 'bg-[#E8E1FF]',
    accentText: 'text-[#7457F5] dark:text-[#E8E1FF]',
    inputClass: 'bg-white/80 border-[#E8E5ED] text-[#292638] placeholder-slate-400',
    stripeGradient: 'bg-gradient-to-r from-[#7457F5] via-[#a855f7] to-[#ec4899]',
    isDark: false,
    cardBgLight: 'rgba(255, 255, 255, 0.88)',
    cardBorderLight: '#E8E5ED',
    headerBgLight: 'rgba(243, 238, 255, 0.95)',
    headerBorderLight: 'rgba(192, 132, 252, 0.55)',
    headerGradientClass: 'bg-gradient-to-r from-[#ede9fe]/95 via-[#f5f3ff]/95 to-[#fae8ff]/95 dark:from-[#110e2e]/95 dark:via-[#161238]/95 dark:to-[#1f153d]/95',
    headerBorderClass: 'border-2 border-purple-300/80 dark:border-purple-800/60 shadow-purple-500/10',
    headerAccentColor: '#7457F5',
    headerAccentTextClass: 'text-[#7457F5] dark:text-purple-300',
    headerDividerClass: 'bg-purple-200/80 dark:bg-purple-900/50',
    headerLogoGradientClass: 'from-[#7457F5] via-[#6243E8] to-[#8b5cf6]',
    headerBookmarkLabelClass: 'text-purple-600 dark:text-purple-400',
  },
  pastel: {
    id: 'pastel',
    name: '따뜻한 웜 파스텔 (클레이모피즘)',
    badge: 'Clay Pastel',
    description: '부드러운 볼륨감과 따스한 정서적 안정을 주는 클레이 피치 & 크림',
    bodyClass: 'bg-gradient-to-br from-[#fff7ed] via-[#fdf2f8] to-[#fef2f2] text-amber-950',
    headerClass: 'bg-[#fffaf5]/95 border-amber-200/80 shadow-sm text-amber-950',
    cardClass: 'bg-[#ffffff]/90 border-amber-200/70 shadow-md shadow-amber-100/40 text-amber-950 hover:border-amber-300',
    borderClass: 'border-amber-200/80',
    accentClass: 'bg-amber-600 text-white',
    accentBg: 'bg-amber-50',
    accentText: 'text-amber-700',
    inputClass: 'bg-amber-50/40 border-amber-200 text-amber-950 placeholder-amber-400',
    stripeGradient: 'bg-gradient-to-r from-pink-400 via-rose-400 to-amber-300',
    isDark: false,
    cardBgLight: 'rgba(255, 250, 245, 0.9)',
    cardBorderLight: 'rgba(251, 191, 36, 0.45)',
    headerBgLight: 'rgba(255, 250, 245, 0.95)',
    headerBorderLight: 'rgba(251, 191, 36, 0.55)',
  },
  indigo: {
    id: 'indigo',
    name: '지적인 네오 인디고 (하이테크)',
    badge: 'Neo Tech',
    description: '지능적인 신뢰감과 선명한 집중도를 주는 하이테크 인디고 & 블루',
    bodyClass: 'bg-gradient-to-br from-slate-100 via-indigo-50/40 to-blue-50/50 text-slate-900',
    headerClass: 'bg-white/95 border-indigo-200/80 shadow-sm text-slate-900',
    cardClass: 'bg-white/95 border-indigo-200/80 shadow-md shadow-indigo-100/50 text-slate-900 hover:border-indigo-300',
    borderClass: 'border-indigo-200',
    accentClass: 'bg-indigo-600 text-white',
    accentBg: 'bg-indigo-50',
    accentText: 'text-indigo-600',
    inputClass: 'bg-white border-indigo-200 text-slate-900 placeholder-slate-400',
    stripeGradient: 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500',
    isDark: false,
    cardBgLight: 'rgba(245, 248, 255, 0.9)',
    cardBorderLight: 'rgba(199, 210, 254, 0.6)',
    headerBgLight: 'rgba(245, 248, 255, 0.95)',
    headerBorderLight: 'rgba(199, 210, 254, 0.7)',
  },
  emerald: {
    id: 'emerald',
    name: '내추럴 에메랄드 (스칸디나비안)',
    badge: 'Eco Green',
    description: '눈이 가장 편안한 자연 친화적 보태니컬 세이지 & 에메랄드',
    bodyClass: 'bg-gradient-to-br from-[#f2f8f4] via-[#edf7f1] to-[#e8f5ed] text-emerald-950',
    headerClass: 'bg-white/95 border-emerald-200/80 shadow-sm text-emerald-950',
    cardClass: 'bg-white/95 border-emerald-200/80 shadow-md shadow-emerald-100/40 text-emerald-950 hover:border-emerald-300',
    borderClass: 'border-emerald-200',
    accentClass: 'bg-emerald-600 text-white',
    accentBg: 'bg-emerald-50',
    accentText: 'text-emerald-700',
    inputClass: 'bg-emerald-50/30 border-emerald-200 text-emerald-950 placeholder-emerald-400',
    stripeGradient: 'bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600',
    isDark: false,
    cardBgLight: 'rgba(240, 253, 244, 0.88)',
    cardBorderLight: 'rgba(167, 243, 208, 0.55)',
    headerBgLight: 'rgba(240, 253, 244, 0.92)',
    headerBorderLight: 'rgba(167, 243, 208, 0.65)',
  },
  lavender: {
    id: 'lavender',
    name: '소프트 라벤더 (모던 크리에이티브)',
    badge: 'Creative Lilac',
    description: '창의성과 상상력을 자극하는 부드러운 라일락 & 바이올렛',
    bodyClass: 'bg-gradient-to-br from-[#fbf8fe] via-[#f5effd] to-[#faf5ff] text-purple-950',
    headerClass: 'bg-white/95 border-purple-200/80 shadow-sm text-purple-950',
    cardClass: 'bg-white/95 border-purple-200/80 shadow-md shadow-purple-100/40 text-purple-950 hover:border-purple-300',
    borderClass: 'border-purple-200',
    accentClass: 'bg-purple-600 text-white',
    accentBg: 'bg-purple-50',
    accentText: 'text-purple-700',
    inputClass: 'bg-purple-50/30 border-purple-200 text-purple-950 placeholder-purple-400',
    stripeGradient: 'bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400',
    isDark: false,
    cardBgLight: 'rgba(250, 245, 255, 0.88)',
    cardBorderLight: 'rgba(233, 213, 255, 0.6)',
    headerBgLight: 'rgba(250, 245, 255, 0.92)',
    headerBorderLight: 'rgba(233, 213, 255, 0.7)',
  },
  elementary: {
    id: 'elementary',
    name: '초등학교 (활기찬 옐로우 & 스카이)',
    badge: 'Elementary Joy',
    description: '어린이의 창의력과 활기찬 수업 분위기를 돋우는 생동감 넘치는 스쿨 옐로우 & 스카이',
    bodyClass: 'bg-gradient-to-br from-[#fffbeb] via-[#fef9c3] to-[#e0f2fe] text-amber-950',
    headerClass: 'bg-white/95 border-amber-300/80 shadow-md text-amber-950',
    cardClass: 'bg-white/95 border-amber-200 shadow-md shadow-amber-200/40 text-amber-950 hover:border-amber-400',
    borderClass: 'border-amber-300',
    accentClass: 'bg-amber-500 text-white font-black',
    accentBg: 'bg-amber-100',
    accentText: 'text-amber-800',
    inputClass: 'bg-amber-50/50 border-amber-300 text-amber-950 placeholder-amber-400',
    stripeGradient: 'bg-gradient-to-r from-amber-400 via-yellow-300 to-sky-400',
    isDark: false,
    cardBgLight: 'rgba(254, 250, 235, 0.88)',
    cardBorderLight: 'rgba(251, 191, 36, 0.45)',
    headerBgLight: 'rgba(254, 250, 235, 0.92)',
    headerBorderLight: 'rgba(251, 191, 36, 0.55)',
  },
  office: {
    id: 'office',
    name: '모던 오피스 (미니멀 그레이 & 틸)',
    badge: 'Pro Office',
    description: '교무실 및 세련된 업무 환경을 위한 단정하고 가독성 높은 미니멀 그레이 & 틸',
    bodyClass: 'bg-gradient-to-br from-[#f1f5f9] via-[#f8fafc] to-[#e2e8f0] text-slate-900',
    headerClass: 'bg-white/95 border-slate-300 shadow-sm text-slate-900',
    cardClass: 'bg-white/95 border-slate-200 shadow-sm text-slate-800 hover:border-slate-400',
    borderClass: 'border-slate-300',
    accentClass: 'bg-teal-600 text-white font-bold',
    accentBg: 'bg-teal-50',
    accentText: 'text-teal-700',
    inputClass: 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400',
    stripeGradient: 'bg-gradient-to-r from-teal-600 via-slate-600 to-cyan-500',
    isDark: false,
    cardBgLight: 'rgba(248, 250, 252, 0.9)',
    cardBorderLight: 'rgba(203, 213, 225, 0.6)',
    headerBgLight: 'rgba(248, 250, 252, 0.95)',
    headerBorderLight: 'rgba(203, 213, 225, 0.7)',
  },
  cafe: {
    id: 'cafe',
    name: '코지 카페 (따뜻한 우드 & 라떼 베이지)',
    badge: 'Cozy Cafe',
    description: '라떼와 원목 가구의 안락함이 느껴지는 포근하고 차분한 어텀 카페 무드',
    bodyClass: 'bg-gradient-to-br from-[#fcf8f2] via-[#f7eee1] to-[#eeddc7] text-[#4a3525]',
    headerClass: 'bg-[#fffaf3]/95 border-[#decbb7] shadow-sm text-[#4a3525]',
    cardClass: 'bg-[#fffdfa]/95 border-[#e8d7c5] shadow-md shadow-[#4a3525]/5 text-[#4a3525] hover:border-[#b89f85]',
    borderClass: 'border-[#decbb7]',
    accentClass: 'bg-[#8d6244] text-white font-bold',
    accentBg: 'bg-[#f4ebe1]',
    accentText: 'text-[#8d6244]',
    inputClass: 'bg-[#f7f0e8] border-[#decbb7] text-[#4a3525] placeholder-[#9c826e]',
    stripeGradient: 'bg-gradient-to-r from-[#b08968] via-[#ddb892] to-[#7f5539]',
    isDark: false,
    cardBgLight: 'rgba(252, 245, 237, 0.88)',
    cardBorderLight: 'rgba(214, 192, 170, 0.55)',
    headerBgLight: 'rgba(252, 245, 237, 0.93)',
    headerBorderLight: 'rgba(214, 192, 170, 0.65)',
  },
  sunset: {
    id: 'sunset',
    name: '노을 피치 코랄 (따스한 석양 앰버 & 코랄)',
    badge: 'Sunset Glow',
    description: '황금빛 석양과 복숭아 코랄이 어우러진 포근하고 감성적인 스쿨 무드',
    bodyClass: 'bg-gradient-to-br from-[#fff1eb] via-[#ace0f9]/10 to-[#ffd1ff]/20 text-stone-900',
    headerClass: 'bg-white/95 border-orange-200 shadow-sm text-stone-900',
    cardClass: 'bg-white/95 border-orange-200/80 shadow-md shadow-orange-100/40 text-stone-900 hover:border-orange-300',
    borderClass: 'border-orange-200',
    accentClass: 'bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold',
    accentBg: 'bg-orange-50',
    accentText: 'text-orange-600',
    inputClass: 'bg-orange-50/40 border-orange-200 text-stone-900 placeholder-orange-400',
    stripeGradient: 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500',
    isDark: false,
    cardBgLight: 'rgba(255, 247, 240, 0.9)',
    cardBorderLight: 'rgba(254, 215, 170, 0.6)',
    headerBgLight: 'rgba(255, 247, 240, 0.95)',
    headerBorderLight: 'rgba(254, 215, 170, 0.7)',
  },
  'lavender-fog': {
    id: 'lavender-fog',
    name: '🪻 라벤더 포그 (모던 라벤더)',
    badge: 'Lavender Fog',
    description: 'Modern Lavender Canvas & Matte Black Dock 스타일',
    bodyClass: 'bg-[#F4F2F8] text-[#1E1B2E]',
    headerClass: 'bg-white/95 border-purple-200 shadow-sm text-[#1E1B2E]',
    cardClass: 'bg-white/95 border-purple-200/80 shadow-md text-[#1E1B2E]',
    borderClass: 'border-purple-200',
    accentClass: 'bg-[#8B5CF6] text-white font-bold',
    accentBg: 'bg-purple-50',
    accentText: 'text-[#8B5CF6]',
    inputClass: 'bg-white border-purple-200 text-[#1E1B2E]',
    stripeGradient: 'bg-gradient-to-r from-purple-400 to-indigo-500',
    isDark: false,
  },
  'ember-sunset': {
    id: 'ember-sunset',
    name: '🍊 엠버 선셋 (웜 크림 & 테라코타)',
    badge: 'Ember Sunset',
    description: 'Warm Cream Canvas & Terracotta Orange 전역 테마',
    bodyClass: 'bg-[#FBF8F3] text-[#292524]',
    headerClass: 'bg-white/95 border-orange-200 shadow-sm text-[#292524]',
    cardClass: 'bg-white/95 border-orange-200/80 shadow-md text-[#292524]',
    borderClass: 'border-orange-200',
    accentClass: 'bg-[#E65C00] text-white font-bold',
    accentBg: 'bg-orange-50',
    accentText: 'text-[#E65C00]',
    inputClass: 'bg-white border-orange-200 text-[#292524]',
    stripeGradient: 'bg-gradient-to-r from-amber-500 to-orange-600',
    isDark: false,
    cardBgLight: '#FFFFFF',
    cardBorderLight: 'rgba(230, 92, 0, 0.22)',
    headerBgLight: 'rgba(251, 248, 243, 0.96)',
    headerBorderLight: 'rgba(230, 92, 0, 0.25)',
    headerGradientClass: 'bg-gradient-to-r from-[#FBF8F3] via-[#FFF9F3] to-[#F7F2E9]',
    headerBorderClass: 'border-2 border-orange-300/80 shadow-orange-500/10',
    headerAccentColor: '#E65C00',
    headerAccentTextClass: 'text-[#E65C00]',
    headerDividerClass: 'bg-orange-200/80',
    headerLogoGradientClass: 'from-[#E65C00] via-[#D9531E] to-[#F97316]',
    headerBookmarkLabelClass: 'text-orange-600',
    candyBars: {
      attendance: {
        bgClass: 'bg-amber-50/90 dark:bg-amber-950/45 border border-amber-200/80 dark:border-amber-500/40 hover:bg-amber-100/80',
        dotClass: 'bg-amber-500 dark:bg-amber-400 shadow-[0_0_8px_#f59e0b]',
      },
      commemorative: {
        bgClass: 'bg-orange-50/90 dark:bg-orange-950/45 border border-orange-200/80 dark:border-orange-500/40 hover:bg-orange-100/80',
        iconClass: 'text-orange-600 dark:text-orange-400',
        badgeClass: 'bg-[#E65C00] text-white shadow-[0_0_8px_rgba(230,92,0,0.3)]',
      },
      leaveWork: {
        bgClass: 'bg-stone-50/90 dark:bg-stone-900/45 border border-stone-200/80 dark:border-stone-500/40',
        dotClass: 'bg-orange-600 dark:bg-orange-400 shadow-[0_0_8px_#ea580c]',
        progressGradientClass: 'from-amber-500 via-orange-500 to-red-500',
      },
      vacation: {
        bgClass: 'bg-orange-50/90 dark:bg-orange-950/45 border border-orange-200/80 dark:border-orange-500/40 hover:bg-orange-100/80',
        iconClass: 'text-orange-600 dark:text-orange-400',
        badgeClass: 'bg-[#D9531E] text-white shadow-[0_0_8px_rgba(217,83,30,0.3)]',
      },
    },
  },
  'cyber-glossy': {
    id: 'cyber-glossy',
    name: '💎 사이버 글로시 (다크 글래스)',
    badge: 'Cyber Glossy',
    description: 'Deep Dark Glassmorphism (시안 림 & 네온)',
    bodyClass: 'bg-[#04070D] text-[#F8FAFC]',
    headerClass: 'bg-[#0A1424]/90 border-cyan-500/40 shadow-2xl text-[#F8FAFC]',
    cardClass: 'bg-[#0A1424]/90 border-cyan-500/40 shadow-2xl text-[#F8FAFC]',
    borderClass: 'border-cyan-500/40',
    accentClass: 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_15px_rgba(56,189,248,0.5)]',
    accentBg: 'bg-cyan-950/60',
    accentText: 'text-cyan-400 font-black',
    inputClass: 'bg-[#081020] border-cyan-500/40 text-[#F8FAFC]',
    stripeGradient: 'bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 shadow-[0_0_12px_rgba(56,189,248,0.5)]',
    isDark: true,
    cardBgLight: 'rgba(10, 20, 36, 0.92)',
    cardBorderLight: 'rgba(56, 189, 248, 0.4)',
    headerBgLight: 'rgba(7, 13, 26, 0.96)',
    headerBorderLight: 'rgba(56, 189, 248, 0.42)',
    headerGradientClass: 'bg-gradient-to-r from-[#070D1A]/95 via-[#0A1424]/95 to-[#050A14]/95',
    headerBorderClass: 'border-2 border-cyan-500/45 shadow-[0_0_25px_rgba(56,189,248,0.25)]',
    headerAccentColor: '#38BDF8',
    headerAccentTextClass: 'text-cyan-400 font-black',
    headerDividerClass: 'bg-cyan-500/30 shadow-[0_0_8px_rgba(56,189,248,0.3)]',
    headerLogoGradientClass: 'from-[#00A8FF] via-[#38BDF8] to-[#67E8F9]',
    headerBookmarkLabelClass: 'text-cyan-400 font-black',
    candyBars: {
      attendance: {
        bgClass: 'bg-cyan-950/60 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-900/60 shadow-[0_0_12px_rgba(6,182,212,0.15)]',
        dotClass: 'bg-cyan-400 shadow-[0_0_10px_#38bdf8]',
      },
      commemorative: {
        bgClass: 'bg-sky-950/60 border border-sky-500/40 text-sky-200 hover:bg-sky-900/60 shadow-[0_0_12px_rgba(14,165,233,0.15)]',
        iconClass: 'text-sky-400',
        badgeClass: 'bg-sky-500 text-slate-950 font-black shadow-[0_0_10px_#0ea5e9]',
      },
      leaveWork: {
        bgClass: 'bg-blue-950/60 border border-blue-500/40 text-blue-200 shadow-[0_0_12px_rgba(59,130,246,0.15)]',
        dotClass: 'bg-blue-400 shadow-[0_0_10px_#60a5fa]',
        progressGradientClass: 'from-cyan-400 via-sky-400 to-blue-500',
      },
      vacation: {
        bgClass: 'bg-teal-950/60 border border-teal-500/40 text-teal-200 hover:bg-teal-900/60 shadow-[0_0_12px_rgba(20,184,166,0.15)]',
        iconClass: 'text-cyan-400',
        badgeClass: 'bg-cyan-400 text-slate-950 font-black shadow-[0_0_10px_#22d3ee]',
      },
    },
  },
};

/**
 * 🎬 [다크 모드 전용 통합 테마]: 시네마 & 나이트 다크 글래스모피즘
 * - 사용자가 어떤 색상 테마(초등학교, 파스텔, 카페, 에메랄드 등)를 선택했더라도,
 *   다크 모드 활성화 시 전체 대시보드가 첨부 이미지와 같은 깊고 세련된 딥 미드나잇 블루(#080c16)와
 *   네온 인디고/시안 악센트의 글래스모피즘 톤앤매너로 완벽하게 통일됩니다.
 */
export const DARK_CINEMA_THEME: ThemeConfig = {
  id: 'slate',
  name: '시네마 나이트 딥 미드나잇',
  badge: 'Cinema Night',
  description: '깊은 미드나잇 블루와 네온 인디고/시안 악센트의 프리미엄 다크 글래스모피즘',
  bodyClass: 'bg-[#0b131f] text-slate-100',
  headerClass: 'bg-[#101a2d] border-[#1e2c44] shadow-2xl text-slate-100',
  cardClass: 'bg-[#101a2d] border-[#1e2c44] shadow-2xl text-slate-200 hover:border-[#2b3d5c]',
  borderClass: 'border-[#1e2c44]',
  accentClass: 'bg-indigo-600 text-white font-bold',
  accentBg: 'bg-indigo-950/60',
  accentText: 'text-indigo-400',
  inputClass: 'bg-[#0c1424] border-[#1e2c44] text-slate-100 placeholder-slate-500',
  stripeGradient: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600',
  isDark: true,
};


export function getTheme(theme?: DashboardTheme, isDarkMode?: boolean): ThemeConfig {
  // 🌟 시그니처 3대 테마 우선 보장 (다크 모드 강제 덮어쓰기 방지)
  if (theme === 'cyber-glossy') {
    return THEME_CONFIGS['cyber-glossy'] || DARK_CINEMA_THEME;
  }
  if (theme === 'ember-sunset') {
    return THEME_CONFIGS['ember-sunset'] || THEME_CONFIGS.sunset;
  }
  if (theme === 'lavender-fog') {
    return THEME_CONFIGS['lavender-fog'] || THEME_CONFIGS.lavender;
  }

  // 🌙 일반 라이트 테마에서 다크 모드 활성화 시: 다크 시네마 테마 적용
  if (isDarkMode) {
    return DARK_CINEMA_THEME;
  }
  if (!theme || !THEME_CONFIGS[theme]) {
    return THEME_CONFIGS.glassmorphism;
  }
  return THEME_CONFIGS[theme];
}

export interface FreeFont {
  id: string;
  name: string;
  family: string;
  category: string;
  sample: string;
}

export const FREE_FONTS: FreeFont[] = [
  { id: 'pretendard', name: '프리텐다드 (Pretendard)', family: "Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif", category: '고딕/모던', sample: '가나다라 1234' },
  { id: 'noto-sans-kr', name: '본고딕 (Noto Sans KR)', family: "'Noto Sans KR', sans-serif", category: '고딕/표준', sample: '가나다라 1234' },
  { id: 'nanum-gothic', name: '나눔고딕 (Nanum Gothic)', family: "'Nanum Gothic', sans-serif", category: '고딕/친숙', sample: '가나다라 1234' },
  { id: 'nanum-myeongjo', name: '나눔명조 (Nanum Myeongjo)', family: "'Nanum Myeongjo', serif", category: '명조/단정', sample: '가나다라 1234' },
  { id: 'gowun-dodum', name: '고운돋움 (Gowun Dodum)', family: "'Gowun Dodum', sans-serif", category: '돋움/부드러움', sample: '가나다라 1234' },
  { id: 'gowun-batang', name: '고운바탕 (Gowun Batang)', family: "'Gowun Batang', serif", category: '바탕/서정', sample: '가나다라 1234' },
  { id: 'gaegu', name: '개구쟁이 (Gaegu)', family: "'Gaegu', cursive", category: '손글씨/아기자기', sample: '가나다라 1234' },
  { id: 'jua', name: '배달의민족 주아 (Jua)', family: "'Jua', sans-serif", category: '손글씨/둥글둥글', sample: '가나다라 1234' },
  { id: 'do-hyeon', name: '배달의민족 도현 (Do Hyeon)', family: "'Do Hyeon', sans-serif", category: '제목/또렷함', sample: '가나다라 1234' },
  { id: 'black-han-sans', name: '검은고딕 (Black Han Sans)', family: "'Black Han Sans', sans-serif", category: '강조/굵은고딕', sample: '가나다라 1234' },
  // 신규 무료 폰트 5종 추가 (요구사항 4, 10 반영)
  { id: 'gmarket-sans', name: '지마켓 산스 (Gmarket Sans)', family: "'GmarketSans', sans-serif", category: '제목/명확함', sample: '가나다라 1234' },
  { id: 'maplestory', name: '넥슨 메이플스토리 (Maplestory)', family: "'MaplestoryOTFBold', cursive", category: '귀여움/초등인기', sample: '가나다라 1234' },
  { id: 'cafe24-surround', name: '카페24 써라운드 (Surround)', family: "'Cafe24Ssurround', sans-serif", category: '트렌디/둥글음', sample: '가나다라 1234' },
  { id: 'dongle', name: '동글 (Dongle)', family: "'Dongle', sans-serif", category: '손글씨/개성', sample: '가나다라 1234' },
  { id: 'yeon-sung', name: '연성체 (Yeon Sung)', family: "'Yeon Sung', cursive", category: '캘리/정감', sample: '가나다라 1234' },
  // 🏫 학교안심 폰트 2종 (PDF 2페이지 수정사항 반영)
  { id: 'hakgyoansim-dunggeun', name: '학교안심 둥근미소 (Hakgyoansim)', family: "'HakgyoansimDunggeunmiso', sans-serif", category: '학교안심/친근함', sample: '가나다라 1234' },
  { id: 'hakgyoansim-geurimilgi', name: '학교안심 그림일기 (Hakgyoansim)', family: "'HakgyoansimGeurimilgi', cursive", category: '학교안심/손글씨', sample: '가나다라 1234' },
  // 🏛️ 경기천년 폰트 2종 (바탕, 제목)
  { id: 'gyeonggi-batang', name: '경기천년바탕 (Gyeonggi Batang)', family: "'GyeonggiBatang', serif", category: '경기천년/단정바탕', sample: '가나다라 1234' },
  { id: 'gyeonggi-title', name: '경기천년제목 (Gyeonggi Title)', family: "'GyeonggiTitle', sans-serif", category: '경기천년/강조제목', sample: '가나다라 1234' },
];

export function getFontFamily(fontId?: string): string {
  const found = FREE_FONTS.find((f) => f.id === fontId);
  return found ? found.family : "Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif";
}

/**
 * 🌓 시스템 설정 / 라이트 / 다크 모드 및 테마 고유 특성에 따라 다크 모드 여부를 지능적으로 결정합니다.
 * - theme.isDark: 테마 자체에 고유 다크 속성이 지정된 경우 우선 적용
 * - 'dark' | 'light': 사용자의 명시적 수동 선택 적용
 * - 'system': 브라우저 및 운영체제(OS)의 다크 모드 미디어 쿼리(prefers-color-scheme) 자동 감지
 */
export function resolveIsDarkMode(themeMode?: 'system' | 'light' | 'dark', themeId?: DashboardTheme): boolean {
  // 1. 시그니처 테마 우선 판별
  if (themeId === 'cyber-glossy') return true;
  if (themeId === 'ember-sunset' || themeId === 'lavender-fog') return false;

  // 2. 테마 자체가 고유 다크 테마인 경우 무조건 다크 모드 활성화
  const theme = getTheme(themeId);
  if (theme.isDark) return true;

  // 3. 사용자가 설정에서 명시적으로 다크 또는 라이트를 지정한 경우
  if (themeMode === 'dark') return true;
  if (themeMode === 'light') return false;

  // 3. 'system' 모드인 경우: 기기 OS의 다크 모드 설정 감지
  if (typeof window !== 'undefined' && window.matchMedia) {
    const isOsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return isOsDark;
  }

  // 브라우저 환경이 아니거나 판별 불가 시 기본값은 편안한 라이트 모드
  return false;
}

