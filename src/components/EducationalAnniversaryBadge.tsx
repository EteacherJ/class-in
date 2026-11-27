import React, { useState, useMemo } from 'react';
import { Calendar, Search, Sparkles, ExternalLink, Clock } from 'lucide-react';

export interface AnniversaryInfo {
  month: number;
  day: number;
  title: string;
  badge: string;
  category: 'education' | 'holiday' | 'history' | 'memorial';
  desc: string;
}

/**
 * 🇰🇷 대한민국 초등학교 교육과정 연계 주요 계기교육 및 역사 기념일 데이터베이스 (확장 DB)
 * 교육 관련 기념일, 국가 지정 공휴일, 제헌/광복, 독립운동가 의거/순국일, 주요 민주화 및 역사적 사건 완벽 포함
 */
export const COMPREHENSIVE_ANNIVERSARIES: AnniversaryInfo[] = [
  // --- 1월 ---
  {
    month: 1,
    day: 1,
    title: '신정 (새해 첫날)',
    badge: '🌅 신정',
    category: 'holiday',
    desc: '새해를 맞이하여 한 해의 목표를 세우고 새로운 다짐을 하는 날입니다.',
  },
  {
    month: 1,
    day: 13,
    title: '미주 한인의 날',
    badge: '🗽 미주 한인의 날',
    category: 'history',
    desc: '1903년 하와이로 첫 이민을 떠난 선조들의 개척정신과 재외동포의 자긍심을 기립니다.',
  },

  // --- 2월 ---
  {
    month: 2,
    day: 8,
    title: '2·8 독립선언',
    badge: '✊ 2·8 독립선언',
    category: 'history',
    desc: '1919년 일본 도쿄에서 유학생들이 조국 독립을 선언하여 3·1운동의 도화선이 된 역사적 날입니다.',
  },
  {
    month: 2,
    day: 14,
    title: '안중근 의사 사형 선고일',
    badge: '🇰🇷 안중근 사형선고일',
    category: 'memorial',
    desc: '하얼빈 의거 후 일제 재판에서 당당히 조국의 자주독립을 외치고 사형을 선고받은 날입니다.',
  },

  // --- 3월 ---
  {
    month: 3,
    day: 1,
    title: '3·1절',
    badge: '🇰🇷 3·1절',
    category: 'holiday',
    desc: '1919년 3월 1일 전 민족이 하나 되어 자주독립을 선언하고 평화 만세운동을 펼친 숭고한 국경일입니다.',
  },
  {
    month: 3,
    day: 2,
    title: '초등학교 입학식 & 개학일',
    badge: '🎒 입학식·시업식',
    category: 'education',
    desc: '새 학년, 새 학기를 맞아 새로운 친구와 선생님을 만나 설레는 학급 공동체를 시작하는 날입니다.',
  },
  {
    month: 3,
    day: 8,
    title: '세계 여성의 날',
    badge: '💐 여성의 날',
    category: 'education',
    desc: '여성의 권리와 양성평등의 가치를 되새기며 서로를 존중하는 양성평등 교육의 날입니다.',
  },
  {
    month: 3,
    day: 22,
    title: '세계 물의 날',
    badge: '💧 물의 날',
    category: 'education',
    desc: '물 부족과 수질오염을 방지하고 소중한 수자원과 생태계를 보호하는 환경 계기교육의 날입니다.',
  },
  {
    month: 3,
    day: 26,
    title: '안중근 의사 순국일',
    badge: '🕯️ 안중근 의사 순국',
    category: 'memorial',
    desc: '동양평화론을 집필하며 조국의 완전한 독립을 염원하다 뤼순 감옥에서 순국하신 숭고한 넋을 기립니다.',
  },
  {
    month: 3,
    day: 27,
    title: '서해수호의 날',
    badge: '🛡️ 서해수호의 날',
    category: 'memorial',
    desc: '제2연평해전, 천안함 피격, 연평도 포격전 등 서해를 지키다 희생된 호국영웅들을 추모합니다.',
  },

  // --- 4월 ---
  {
    month: 4,
    day: 3,
    title: '제주 4·3 희생자 추념일',
    badge: '동백 4·3 추념일',
    category: 'memorial',
    desc: '제주 현대사의 큰 비극인 4·3사건의 희생자를 기리고 평화와 인권, 화해와 상생의 가치를 배웁니다.',
  },
  {
    month: 4,
    day: 5,
    title: '식목일',
    badge: '🌱 식목일',
    category: 'education',
    desc: '나무를 심고 숲을 가꾸며 기후위기에 맞서 지구 환경과 생태계를 보호하는 날입니다.',
  },
  {
    month: 4,
    day: 7,
    title: '보건의 날',
    badge: '🩺 보건의 날',
    category: 'education',
    desc: '국민 건강을 증진하고 올바른 위생 및 감염병 예방 습관의 소중함을 되새기는 날입니다.',
  },
  {
    month: 4,
    day: 11,
    title: '대한민국 임시정부 수립일',
    badge: '🏛️ 임시정부 수립일',
    category: 'history',
    desc: '3·1운동 정신을 계승하여 상하이에 수립된 대한민국 최초의 민주공화정 임시정부를 기립니다.',
  },
  {
    month: 4,
    day: 16,
    title: '4·16 세월호 참사 추모일 (국민안전의 날)',
    badge: '🎗️ 국민안전의 날',
    category: 'memorial',
    desc: '세월호 참사의 아픔을 영원히 기억하며 생명 존중과 학생 안전 문화를 정착시키는 날입니다.',
  },
  {
    month: 4,
    day: 19,
    title: '4·19 혁명',
    badge: '🕊️ 4·19 혁명',
    category: 'history',
    desc: '불의와 부정선거에 항거하여 학생과 시민들이 민주주의를 지켜낸 위대한 민주혁명의 날입니다.',
  },
  {
    month: 4,
    day: 20,
    title: '장애인의 날',
    badge: '🤝 장애인의 날',
    category: 'education',
    desc: '장애에 대한 편견을 없애고 다름을 인정하며 모두가 함께 살아가는 따뜻한 통합교육의 날입니다.',
  },
  {
    month: 4,
    day: 21,
    title: '과학의 날',
    badge: '🚀 과학의 날',
    category: 'education',
    desc: '과학기술의 중요성을 깨닫고 미래 사회를 이끌 창의성과 탐구 정신을 기르는 날입니다.',
  },
  {
    month: 4,
    day: 22,
    title: '정보통신의 날 & 세계 지구의 날',
    badge: '🌍 지구·정보통신의 날',
    category: 'education',
    desc: '건전한 디지털 정보윤리를 익히고, 지구 환경오염의 심각성을 알리며 탄소중립을 다짐합니다.',
  },
  {
    month: 4,
    day: 28,
    title: '충무공 이순신 탄신일',
    badge: '⚔️ 충무공 탄신일',
    category: 'history',
    desc: '임진왜란에서 나라를 구한 충무공 이순신 장군의 지혜, 충성심, 백성 사랑의 리더십을 배웁니다.',
  },
  {
    month: 4,
    day: 29,
    title: '윤봉길 의사 홍커우공원 의거일',
    badge: '도시락폭탄 윤봉길 의거',
    category: 'history',
    desc: '1932년 상하이 홍커우공원에서 일제 수뇌부를 타격하여 독립의 열망을 전 세계에 알린 날입니다.',
  },

  // --- 5월 ---
  {
    month: 5,
    day: 1,
    title: '근로자의 날 (노동절)',
    badge: '🛠️ 근로자의 날',
    category: 'education',
    desc: '우리 사회를 유지하고 발전시키는 모든 노동자들의 노고와 노동의 존엄성을 배우는 날입니다.',
  },
  {
    month: 5,
    day: 5,
    title: '어린이날',
    badge: '🎈 어린이날',
    category: 'holiday',
    desc: '방정환 선생의 어린이 사랑 정신을 기리며, 모든 어린이가 바르고 씩씩하게 자라도록 축복합니다.',
  },
  {
    month: 5,
    day: 8,
    title: '어버이날',
    badge: '💐 어버이날',
    category: 'education',
    desc: '부모님과 웃어른의 깊은 사랑과 은혜에 감사하며 효도와 공경의 마음을 실천하는 날입니다.',
  },
  {
    month: 5,
    day: 15,
    title: '스승의 날 (세종대왕 탄신일 연계)',
    badge: '📚 스승의 날',
    category: 'education',
    desc: '배움의 길을 밝혀주시는 선생님의 가르침에 감사하며 겨레의 스승이신 세종대왕의 뜻을 기립니다.',
  },
  {
    month: 5,
    day: 18,
    title: '5·18 민주화운동 기념일',
    badge: '🕯️ 5·18 민주화운동',
    category: 'history',
    desc: '1980년 광주에서 군부 독재에 맞서 자유와 민주주의, 인권을 지켜낸 숭고한 시민정신을 기립니다.',
  },
  {
    month: 5,
    day: 19,
    title: '발명의 날',
    badge: '💡 발명의 날',
    category: 'education',
    desc: '세종대왕 대에 측우기를 공식 제정한 날을 기념하며 창의적인 발명과 과학 탐구열을 북돋웁니다.',
  },
  {
    month: 5,
    day: 31,
    title: '바다의 날',
    badge: '🌊 바다의 날',
    category: 'education',
    desc: '해상왕 장보고 대사의 청해진 설치를 기념하며 해양 자원 보존과 해양 강국의 비전을 다집니다.',
  },

  // --- 6월 ---
  {
    month: 6,
    day: 5,
    title: '세계 환경의 날',
    badge: '🌿 환경의 날',
    category: 'education',
    desc: '지구 온난화와 기후변화 위기를 극복하기 위해 플라스틱 줄이기와 재활용을 실천하는 날입니다.',
  },
  {
    month: 6,
    day: 6,
    title: '현충일',
    badge: '🇰🇷 현충일',
    category: 'holiday',
    desc: '나라를 지키기 위해 목숨을 바친 순국선열과 호국영령의 숭고한 넋을 기리며 조기를 게양합니다.',
  },
  {
    month: 6,
    day: 10,
    title: '6·10 민주항쟁 & 6·10 만세운동',
    badge: '🕊️ 6·10 민주항쟁',
    category: 'history',
    desc: '1926년 학생 중심의 독립만세운동과 1987년 대통령 직선제를 쟁취한 민주화 대항쟁을 함께 기립니다.',
  },
  {
    month: 6,
    day: 25,
    title: '6·25 전쟁일',
    badge: '🕊️ 6·25 평화기념',
    category: 'memorial',
    desc: '동족상잔의 전쟁 비극을 잊지 않고 한반도의 평화와 자유, 통일의 소중함을 가슴 깊이 새깁니다.',
  },
  {
    month: 6,
    day: 26,
    title: '백범 김구 선생 서거일',
    badge: '🇰🇷 백범 김구 서거일',
    category: 'memorial',
    desc: '오직 완전한 자주독립과 높은 문화의 힘을 꿈꾸셨던 민족의 지도자 백범 김구 선생을 추모합니다.',
  },

  // --- 7월 ---
  {
    month: 7,
    day: 17,
    title: '제헌절',
    badge: '⚖️ 제헌절',
    category: 'holiday',
    desc: '1948년 대한민국 최초의 근대적 헌법이 제정·공포된 날로 법치주의와 국민주권의 원리를 배웁니다.',
  },

  // --- 8월 ---
  {
    month: 8,
    day: 15,
    title: '광복절 (대한민국 정부 수립일)',
    badge: '🇰🇷 광복절',
    category: 'holiday',
    desc: '1945년 일제 탄압에서 벗어나 국권을 되찾은 감격스러운 날이자 대한민국 정부 수립을 기념합니다.',
  },
  {
    month: 8,
    day: 22,
    title: '에너지의 날',
    badge: '💡 에너지의 날',
    category: 'education',
    desc: '소등 행사와 에너지 절약을 통해 전력 소비를 줄이고 온실가스 감축을 실천하는 날입니다.',
  },
  {
    month: 8,
    day: 29,
    title: '경술국치일 & 백범 김구 탄신일',
    badge: '🇰🇷 국치 추념·김구 탄신',
    category: 'history',
    desc: '1910년 국권을 빼앗긴 역사의 교훈을 잊지 않고, 백범 김구 선생의 탄신을 기립니다.',
  },

  // --- 9월 ---
  {
    month: 9,
    day: 4,
    title: '태권도의 날',
    badge: '🥋 태권도의 날',
    category: 'education',
    desc: '대한민국의 자랑스러운 국기(國技)인 태권도의 예의, 염치, 인내, 극기, 백절불굴 정신을 배웁니다.',
  },
  {
    month: 9,
    day: 21,
    title: '세계 평화의 날',
    badge: '🕊️ 평화의 날',
    category: 'education',
    desc: '전쟁과 분쟁 없는 평화로운 지구촌을 만들기 위해 폭력 근절과 평화의 소중함을 다짐합니다.',
  },
  {
    month: 9,
    day: 28,
    title: '유관순 열사 순국일',
    badge: '🇰🇷 유관순 열사 순국',
    category: 'memorial',
    desc: '천안 아우내 장터 만세운동을 이끌고 서대문형무소에서 끝까지 독립을 외치다 순국하신 넋을 기립니다.',
  },

  // --- 10월 ---
  {
    month: 10,
    day: 1,
    title: '국군의 날',
    badge: '🛡️ 국군의 날',
    category: 'holiday',
    desc: '국토방위와 국민의 생명을 든든하게 지켜주는 국군 장병들의 노고와 헌신에 감사하는 날입니다.',
  },
  {
    month: 10,
    day: 2,
    title: '노인의 날',
    badge: '👵 노인의 날',
    category: 'education',
    desc: '나라와 사회의 발전에 헌신해 오신 어르신들의 지혜를 존경하고 경로효친 사상을 실천합니다.',
  },
  {
    month: 10,
    day: 3,
    title: '개천절',
    badge: '☀️ 개천절',
    category: 'holiday',
    desc: '단군왕검이 고조선을 건국한 뜻을 기리며 널리 인간을 이롭게 하는 홍익인간 정신을 배웁니다.',
  },
  {
    month: 10,
    day: 9,
    title: '한글날',
    badge: '훈민정음 한글날',
    category: 'holiday',
    desc: '세종대왕이 창제한 훈민정음의 과학적 우수성을 기리고 바르고 고운 우리말 쓰기를 실천합니다.',
  },
  {
    month: 10,
    day: 15,
    title: '체육의 날',
    badge: '🏃 체육의 날',
    category: 'education',
    desc: '스포츠를 통한 건전한 신체 발달과 협동심, 규칙 준수의 페어플레이 정신을 다지는 날입니다.',
  },
  {
    month: 10,
    day: 21,
    title: '경찰의 날',
    badge: '👮 경찰의 날',
    category: 'education',
    desc: '사회의 질서와 범죄 예방, 어린이 교통안전을 위해 힘쓰는 경찰관들의 헌신에 감사드립니다.',
  },
  {
    month: 10,
    day: 25,
    title: '독도의 날',
    badge: '🏝️ 독도의 날',
    category: 'history',
    desc: '대한제국 칙령 제41호 제정을 기념하며 대한민국의 고유 영토인 독도 수호 의지를 다집니다.',
  },
  {
    month: 10,
    day: 26,
    title: '안중근 의사 하얼빈 의거일',
    badge: '하얼빈 의거 기념일',
    category: 'history',
    desc: '1909년 10월 26일 하얼빈역에서 침략의 원흉 이토 히로부미를 처단한 의열 독립투쟁의 날입니다.',
  },

  // --- 11월 ---
  {
    month: 11,
    day: 3,
    title: '학생독립운동기념일',
    badge: '✊ 학생독립운동',
    category: 'history',
    desc: '1929년 광주학생항일운동에서 비롯된 학생들의 당당한 자주정신과 정의로운 용기를 배웁니다.',
  },
  {
    month: 11,
    day: 9,
    title: '소방의 날',
    badge: '🚒 소방의 날',
    category: 'education',
    desc: '화재와 재난 현장에서 생명을 구하는 소방관의 헌신에 감사하고 화재 예방 습관을 기릅니다.',
  },
  {
    month: 11,
    day: 11,
    title: '농업인의 날 & 가래떡의 날',
    badge: '🌾 농업인의 날',
    category: 'education',
    desc: '흙과 땀으로 생명의 먹거리를 가꾸는 농업인께 감사하며 우리 쌀과 전통 가래떡을 나눕니다.',
  },
  {
    month: 11,
    day: 17,
    title: '순국선열의 날',
    badge: '🇰🇷 순국선열의 날',
    category: 'memorial',
    desc: '을사늑약 체결일을 잊지 않고 국권 회복을 위해 목숨을 바친 독립운동가들의 숭고한 넋을 기립니다.',
  },

  // --- 12월 ---
  {
    month: 12,
    day: 3,
    title: '소비자의 날 & 세계 장애인의 날',
    badge: '🛍️ 소비자·장애인의 날',
    category: 'education',
    desc: '현명한 경제 소비생활 습관을 기르고 장애인의 완전한 사회 참여와 평등을 지지합니다.',
  },
  {
    month: 12,
    day: 10,
    title: '세계 인권의 날',
    badge: '🕊️ 세계 인권의 날',
    category: 'education',
    desc: '세계인권선언을 기념하며 교실과 일상에서 모든 사람의 존엄성과 기본적 인권을 지킵니다.',
  },
];

interface EducationalAnniversaryBadgeProps {
  isWorkMode?: boolean;
}

export const EducationalAnniversaryBadge: React.FC<EducationalAnniversaryBadgeProps> = ({
  isWorkMode = false,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  // 💡 오늘 날짜 기준 최우선 기념일 또는 가장 가까운 다가오는 기념일 자동 탐색
  const { matched, isToday, dDayText, diffDays } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const currentYear = now.getFullYear();
    const todayMid = new Date(currentYear, now.getMonth(), currentDay).getTime();

    // 1. 오늘 날짜에 정확히 해당하는 기념일이 있는지 확인
    const todayMatch = COMPREHENSIVE_ANNIVERSARIES.find(
      (a) => a.month === currentMonth && a.day === currentDay
    );

    if (todayMatch) {
      return {
        matched: todayMatch,
        isToday: true,
        dDayText: 'D-Day',
        diffDays: 0,
      };
    }

    // 2. 오늘 일정이 없다면 올해 또는 내년에 다가오는 가장 가까운 기념일 계산
    interface Candidate {
      item: AnniversaryInfo;
      diffDays: number;
    }

    const candidates: Candidate[] = COMPREHENSIVE_ANNIVERSARIES.map((item) => {
      let targetDate = new Date(currentYear, item.month - 1, item.day).getTime();
      let diff = Math.ceil((targetDate - todayMid) / (1000 * 60 * 60 * 24));

      // 올해 해당 기념일이 이미 지났다면 내년으로 계산
      if (diff < 0) {
        targetDate = new Date(currentYear + 1, item.month - 1, item.day).getTime();
        diff = Math.ceil((targetDate - todayMid) / (1000 * 60 * 60 * 24));
      }

      return { item, diffDays: diff };
    });

    // 가장 적게 남은 날짜 순으로 정렬
    candidates.sort((a, b) => a.diffDays - b.diffDays);
    const closest = candidates[0] || {
      item: COMPREHENSIVE_ANNIVERSARIES[0],
      diffDays: 1,
    };

    const dDayString =
      closest.diffDays === 0
        ? 'D-Day'
        : closest.diffDays === 1
        ? 'D-1 (내일)'
        : `D-${closest.diffDays}`;

    return {
      matched: closest.item,
      isToday: closest.diffDays === 0,
      dDayText: dDayString,
      diffDays: closest.diffDays,
    };
  }, []);

  /**
   * 🔍 클릭 시 구글 검색 자동 연동 (Electron openExternal 지원 및 새 탭 오픈)
   */
  const handleClickMemorial = (e: React.MouseEvent) => {
    e.stopPropagation();
    const query = encodeURIComponent(matched.title);
    const searchUrl = `https://www.google.com/search?q=${query}`;

    // Electron 환경 지원: shell.openExternal 또는 브라우저 window.open
    if ((window as any).electronAPI?.openExternal) {
      (window as any).electronAPI.openExternal(searchUrl);
    } else {
      window.open(searchUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="relative inline-flex items-center shrink-0">
      <button
        type="button"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={handleClickMemorial}
        className={`h-9 sm:h-10 px-3 sm:px-3.5 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 sm:gap-2 shadow-2xs border cursor-pointer select-none hover:scale-[1.02] active:scale-95 group ${
          isToday
            ? 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/60 text-rose-700 dark:text-rose-200 ring-2 ring-rose-500/30 animate-pulse'
            : isWorkMode
            ? 'bg-teal-950/40 hover:bg-teal-900/60 border-teal-500/30 text-teal-200 hover:text-white'
            : 'bg-white/70 dark:bg-slate-800/80 hover:bg-white/95 dark:hover:bg-slate-700/90 border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 hover:border-indigo-400 dark:hover:border-indigo-500'
        }`}
        title={`${matched.title} (클릭 시 구글 검색으로 계기교육 자료 바로가기)`}
      >
        {/* 기념일 타이틀 및 이모지 */}
        <span className="truncate max-w-[130px] sm:max-w-[170px] font-extrabold tracking-tight">
          {matched.badge}
        </span>

        {/* 날짜 및 D-Day 알약 뱃지 */}
        <span
          className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-tight shrink-0 flex items-center gap-1 ${
            isToday
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-slate-200/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300'
          }`}
        >
          <span>
            {matched.month}.{matched.day}
          </span>
          <span className="opacity-40">|</span>
          <span
            className={
              isToday
                ? 'font-black text-amber-200'
                : diffDays <= 7
                ? 'text-amber-500 dark:text-amber-300 font-black'
                : 'text-slate-500 dark:text-slate-400'
            }
          >
            {dDayText}
          </span>
        </span>

        {/* 구글 검색 바로가기 돋보기 아이콘 (호버 시 강조) */}
        <Search className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:scale-110 transition-all shrink-0 ml-0.5" />
      </button>

      {/* 💡 호버 시 노출되는 리치 툴팁 (계기교육 안내 + 구글 검색 연동 가이드) */}
      {showTooltip && (
        <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 p-3.5 bg-slate-900/95 dark:bg-slate-950/95 text-white rounded-2xl shadow-2xl border border-white/20 z-50 text-left animate-fade-in pointer-events-none backdrop-blur-xl">
          <div className="flex items-center justify-between gap-1.5 pb-2 mb-2 border-b border-white/10">
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>계기교육 안내: {matched.title}</span>
            </div>
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                isToday
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-indigo-900 text-indigo-200'
              }`}
            >
              {isToday ? '🌟 오늘 당일' : dDayText}
            </span>
          </div>

          <p className="text-[11px] text-slate-200 leading-relaxed font-medium">
            {matched.desc}
          </p>

          <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>
                {matched.month}월 {matched.day}일
              </span>
            </span>
            <span className="flex items-center gap-1 text-indigo-300 font-bold">
              <span>구글 검색 자료 탐색</span>
              <ExternalLink className="w-3 h-3" />
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
