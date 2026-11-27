import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Clock,
  Settings,
  Droplets,
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudLightning,
  Moon,
  Sunrise,
  Sunset,
  Check,
  X,
  Navigation,
} from 'lucide-react';
import {
  GlobalWeatherType,
  UserLocation,
  RealtimeWeatherResult,
  DEFAULT_LOCATION,
  getCurrentUserLocation,
  fetchRealtimeWeather,
  normalizeCityName,
  WEATHER_LOCATION_EVENT,
  REALTIME_WEATHER_EVENT,
} from '../utils/weatherService';

export type { GlobalWeatherType };

interface WeeklyWeatherHeaderProps {
  locationName?: string;
  isWorkMode?: boolean;
  isDarkMode?: boolean;
  onRefreshWeather?: () => void;
}

// 🎯 라이프스타일 지수 항목 정의
export interface LifestyleItem {
  id: string;
  title: string;
  category: string;
  score: number;
  statusText: string;
  barColor: 'cyan' | 'indigo' | 'amber' | 'emerald' | 'rose' | 'yellow';
  description: string;
  iconName: 'running' | 'carWash' | 'laundry' | 'ventilation' | 'outdoorClass' | 'umbrella' | 'coldCare';
}

// 전체 라이프스타일 지수 풀
const ALL_LIFESTYLE_POOL: LifestyleItem[] = [
  {
    id: 'running',
    title: '야외 러닝 · 운동',
    category: '운동',
    score: 95,
    statusText: '최적의 상태',
    barColor: 'cyan',
    description: '맑은 공기와 선선한 바람으로 신체 효율 극대화',
    iconName: 'running',
  },
  {
    id: 'carWash',
    title: '세차 권장도',
    category: '생활',
    score: 90,
    statusText: '적극 추천',
    barColor: 'indigo',
    description: '향후 48시간 내 강수 확률 5% 미만 유지',
    iconName: 'carWash',
  },
  {
    id: 'laundry',
    title: '자연 건조 지수',
    category: '가사',
    score: 85,
    statusText: '매우 양호',
    barColor: 'amber',
    description: '일조량 풍부 및 습도 52%로 3시간 내 건조',
    iconName: 'laundry',
  },
  {
    id: 'ventilation',
    title: '교실 환기 지수',
    category: '학급',
    score: 92,
    statusText: '환기 적기',
    barColor: 'emerald',
    description: '대기 정체 없고 미세먼지 농도 매우 낮음',
    iconName: 'ventilation',
  },
  {
    id: 'outdoorClass',
    title: '자외선·야외수업',
    category: '수업',
    score: 78,
    statusText: '주의 필요',
    barColor: 'yellow',
    description: '자외선 지수 다소 높아 모자 및 차광 권장',
    iconName: 'outdoorClass',
  },
  {
    id: 'umbrella',
    title: '우산 지참 지수',
    category: '등하교',
    score: 15,
    statusText: '우산 불필요',
    barColor: 'cyan',
    description: '강수 확률 10% 미만으로 맑은 하늘 지속',
    iconName: 'umbrella',
  },
  {
    id: 'coldCare',
    title: '감기·천식 주의',
    category: '보건',
    score: 88,
    statusText: '안심 단계',
    barColor: 'rose',
    description: '일교차 9°C 이내로 호흡기 건강에 쾌적',
    iconName: 'coldCare',
  },
];

// 24시간 시간별 슬롯 데이터 타입
interface HourlySlotData {
  timeLabel: string;
  isSpecialTime?: boolean; // 일출, 일몰, 지금 등 강조 여부
  specialLabel?: string;
  weatherType: 'sunny' | 'partlyCloudy' | 'cloudy' | 'rainy' | 'thunder' | 'night' | 'sunrise' | 'sunset';
  temp: number;
  pop: number; // 강수 확률 (%)
  wind: string;
  isCurrent?: boolean;
}

// 7일간 요일별 카드 데이터 타입
interface DayCardData {
  dayIndex: number;
  dayLabel: string; // "오늘 (TODAY)", "내일 (화)", "수요일" 등
  dateLabel: string; // "05.14" 등
  isToday: boolean;
  weatherType: 'sunny' | 'partlyCloudy' | 'cloudy' | 'rainy' | 'thunder';
  tempDay: number;
  pop: number;
  tempLow: number;
  uvIndex: number;
  tempHigh: number;
  hourlySlots: HourlySlotData[];
}

export const WeeklyWeatherHeader: React.FC<WeeklyWeatherHeaderProps> = ({
  locationName: propLocationName,
  isDarkMode = true,
}) => {
  // 1. 사용자 현재 위치 상태
  const [userLocation, setUserLocation] = useState<UserLocation>(() => {
    try {
      const cached = localStorage.getItem('smart_dashboard_user_location');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.locationName) return parsed;
      }
    } catch {}
    return {
      ...DEFAULT_LOCATION,
      locationName: propLocationName || DEFAULT_LOCATION.locationName,
    };
  });

  // 2. 실시간 날씨 데이터 상태
  const [realtimeWeather, setRealtimeWeather] = useState<RealtimeWeatherResult | null>(() => {
    try {
      const cached = localStorage.getItem('smart_dashboard_realtime_weather');
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  });

  // 로딩 상태 관리
  const [, setIsLoading] = useState<boolean>(false);

  // 3. 사용자가 선택한 요일 인덱스 (null이면 24시간 패널 닫힘, 0~6이면 해당 요일 펼침)
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  // 헤더를 가볍게: 기본은 오늘 · 내일만, 마우스를 올리면 7일이 잠깐 펼쳐져요
  const [wxCompact, setWxCompact] = useState<boolean>(() => { try { return localStorage.getItem('header_weather_compact') !== 'false'; } catch { return true; } });
  const [wxPeek, setWxPeek] = useState(false);
  const toggleWxCompact = (v: boolean) => { setWxCompact(v); setWxPeek(false); try { localStorage.setItem('header_weather_compact', String(v)); } catch {} };

  // 4. 스마트 라이프스타일 지수 맞춤 설정 상태 (최대 3개 ID 목록)
  const [selectedLifestyleIds, setSelectedLifestyleIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('smart_board_lifestyle_indices');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, 3);
        }
      }
    } catch {}
    return ['running', 'carWash', 'laundry'];
  });

  // 5. 라이프스타일 지수 맞춤 설정 팝오버 열림 여부
  const [isLifestyleModalOpen, setIsLifestyleModalOpen] = useState<boolean>(false);

  // 컨테이너 ref (Click Outside 감지용)
  const containerRef = useRef<HTMLDivElement>(null);

  // 6. 현재 위치 탐색 및 실시간 날씨 로딩 함수
  const loadLocationAndWeather = useCallback(async () => {
    setIsLoading(true);
    console.log('🔵 [WeeklyWeatherHeader] 사용자 현재 위치 및 실시간 날씨 로딩 시작...');

    try {
      const detectedLocation = await getCurrentUserLocation(propLocationName);
      setUserLocation(detectedLocation);

      const weatherData = await fetchRealtimeWeather(detectedLocation);
      // 날씨를 못 받아온 임시 값은 같은 지역의 이전 실제 날씨를 덮어쓰지 않아요
      if (weatherData.isFallback) {
        try {
          const prev = JSON.parse(localStorage.getItem('smart_dashboard_realtime_weather') || 'null');
          if (prev && !prev.isFallback && prev.locationName === weatherData.locationName) return;
        } catch {}
      }
      setRealtimeWeather(weatherData);

      try {
        localStorage.setItem('smart_dashboard_realtime_weather', JSON.stringify(weatherData));
      } catch {}
      window.dispatchEvent(new CustomEvent(REALTIME_WEATHER_EVENT, { detail: weatherData }));

      try {
        localStorage.setItem('smart_board_weather', weatherData.weatherType);
        localStorage.setItem('smart_board_flip_clock_weather', weatherData.weatherType);
      } catch {}

      window.dispatchEvent(
        new CustomEvent('smart_board_weather_change', {
          detail: { weather: weatherData.weatherType },
        })
      );

      console.log('🟢 [WeeklyWeatherHeader] 현재 위치 날씨 실시간 동기화 완료:', detectedLocation.locationName, `${weatherData.temp}°C ${weatherData.statusText}`);
    } catch (err) {
      console.error('🔴 [WeeklyWeatherHeader] 위치/날씨 로딩 실패:', err);
    } finally {
      setIsLoading(false);
    }
  }, [propLocationName]);

  // 환경설정에서 날씨 위치를 바꾸면 바로 다시 불러오기
  useEffect(() => {
    const reload = () => { loadLocationAndWeather(); };
    window.addEventListener(WEATHER_LOCATION_EVENT, reload);
    return () => window.removeEventListener(WEATHER_LOCATION_EVENT, reload);
  }, [loadLocationAndWeather]);

  // 마운트 시 날씨 로드 및 30분 주기 갱신
  useEffect(() => {
    loadLocationAndWeather();

    const intervalId = setInterval(() => {
      console.log('⏰ [WeeklyWeatherHeader] 30분 주기 실시간 날씨 자동 갱신 트리거');
      loadLocationAndWeather();
    }, 1000 * 60 * 30);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ [WeeklyWeatherHeader] 화면 복귀 감지 -> 실시간 날씨 즉각 재조회');
        loadLocationAndWeather();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadLocationAndWeather]);

  // 💡 [Click Outside 이벤트 감지]: 주간 날씨 카드 및 24시간 패널 바깥 클릭 시 자동 닫힘 (Slide-up)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (selectedDayIndex !== null) {
          console.log('🟡 [WeeklyWeatherHeader] 외부 영역 클릭 감지 -> 24시간 상세 패널 닫기 (Slide-up)');
          setSelectedDayIndex(null);
        }
        if (isLifestyleModalOpen) {
          setIsLifestyleModalOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedDayIndex, isLifestyleModalOpen]);

  // 라이프스타일 지수 선택 저장
  const handleToggleLifestyleItem = (id: string) => {
    setSelectedLifestyleIds((prev) => {
      let updated: string[];
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev; // 최소 1개 유지
        updated = prev.filter((item) => item !== id);
      } else {
        if (prev.length >= 3) {
          // 최대 3개 제한: 가장 앞의 것을 빼고 새로 추가
          updated = [...prev.slice(1), id];
        } else {
          updated = [...prev, id];
        }
      }
      try {
        localStorage.setItem('smart_board_lifestyle_indices', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // 7. 실시간/기본 7일 주간 날씨 데이터 생성
  const weeklyDaysData: DayCardData[] = useMemo(() => {
    const now = new Date();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const currentBaseTemp = realtimeWeather?.temp ?? 21;

    // 7일간의 날씨 프리셋 패턴
    const presets: Array<{
      weatherType: 'sunny' | 'partlyCloudy' | 'cloudy' | 'rainy' | 'thunder';
      tempDay: number;
      pop: number;
      tempLow: number;
      uvIndex: number;
      tempHigh: number;
    }> = [
      { weatherType: 'sunny', tempDay: currentBaseTemp + 3, pop: 10, tempLow: currentBaseTemp - 5, uvIndex: 6, tempHigh: currentBaseTemp + 5 },
      { weatherType: 'partlyCloudy', tempDay: 22, pop: 25, tempLow: 15, uvIndex: 4, tempHigh: 23 },
      { weatherType: 'rainy', tempDay: 19, pop: 80, tempLow: 13, uvIndex: 2, tempHigh: 20 },
      { weatherType: 'thunder', tempDay: 18, pop: 90, tempLow: 12, uvIndex: 1, tempHigh: 19 },
      { weatherType: 'cloudy', tempDay: 21, pop: 30, tempLow: 14, uvIndex: 5, tempHigh: 22 },
      { weatherType: 'sunny', tempDay: 25, pop: 5, tempLow: 17, uvIndex: 8, tempHigh: 27 },
      { weatherType: 'partlyCloudy', tempDay: 24, pop: 15, tempLow: 16, uvIndex: 7, tempHigh: 25 },
    ];

    return presets.map((preset, idx) => {
      const targetDate = new Date();
      targetDate.setDate(now.getDate() + idx);
      const dayIdx = targetDate.getDay();
      const monthStr = String(targetDate.getMonth() + 1).padStart(2, '0');
      const dateStr = String(targetDate.getDate()).padStart(2, '0');

      let dayLabel = `${dayNames[dayIdx]}요일`;
      if (idx === 0) dayLabel = '오늘 (TODAY)';
      else if (idx === 1) dayLabel = `내일 (${dayNames[dayIdx]})`;

      // 각 요일별 24시간 10개 시간대 슬롯 생성
      const hourlySlots: HourlySlotData[] = [
        { timeLabel: '00:00', weatherType: 'night', temp: preset.tempLow + 2, pop: 0, wind: '1.2m/s' },
        { timeLabel: '03:00', weatherType: 'night', temp: preset.tempLow + 1, pop: 0, wind: '1.4m/s' },
        { timeLabel: '06:28', isSpecialTime: true, specialLabel: '일출', weatherType: 'sunrise', temp: preset.tempLow, pop: 0, wind: '1.8m/s' },
        { timeLabel: '09:00', weatherType: preset.weatherType === 'rainy' ? 'rainy' : 'sunny', temp: preset.tempLow + 4, pop: Math.max(0, preset.pop - 20), wind: '2.1m/s' },
        { timeLabel: '12:00', weatherType: preset.weatherType, temp: preset.tempDay - 1, pop: preset.pop, wind: '2.5m/s' },
        { timeLabel: '14:00', isSpecialTime: true, specialLabel: '지금', isCurrent: idx === 0, weatherType: preset.weatherType, temp: idx === 0 ? currentBaseTemp : preset.tempDay, pop: preset.pop, wind: '북서 2.8m/s' },
        { timeLabel: '16:00', weatherType: preset.weatherType, temp: preset.tempHigh, pop: Math.min(100, preset.pop + 5), wind: '3.0m/s' },
        { timeLabel: '18:42', isSpecialTime: true, specialLabel: '일몰', weatherType: 'sunset', temp: preset.tempDay - 2, pop: preset.pop, wind: '2.4m/s' },
        { timeLabel: '20:00', weatherType: preset.weatherType === 'rainy' ? 'rainy' : 'partlyCloudy', temp: preset.tempLow + 5, pop: Math.max(0, preset.pop - 10), wind: '2.0m/s' },
        { timeLabel: '22:00', weatherType: 'night', temp: preset.tempLow + 3, pop: Math.max(0, preset.pop - 15), wind: '1.6m/s' },
      ];

      return {
        dayIndex: idx,
        dayLabel,
        dateLabel: `${monthStr}.${dateStr}`,
        isToday: idx === 0,
        weatherType: preset.weatherType,
        tempDay: idx === 0 ? currentBaseTemp : preset.tempDay,
        pop: preset.pop,
        tempLow: preset.tempLow,
        uvIndex: preset.uvIndex,
        tempHigh: preset.tempHigh,
        hourlySlots,
      };
    });
  }, [realtimeWeather]);

  // 좌측 현재 기온 및 체감/최고/최저 정보
  const currentTemp = realtimeWeather?.temp ?? 21;
  const currentFeelsLike = (currentTemp - 1.5).toFixed(1);
  const todayHigh = weeklyDaysData[0]?.tempHigh ?? 24;
  const todayLow = weeklyDaysData[0]?.tempLow ?? 13;

  // 표시할 지역명
  const rawDisplayName = realtimeWeather?.locationName || userLocation.locationName || propLocationName || '현재 위치';
  const currentDisplayName = normalizeCityName(rawDisplayName);

  // 요일 카드 클릭 핸들러 (토글 및 다른 요일 즉시 전환)
  const handleDayCardClick = (idx: number) => {
    if (selectedDayIndex === idx) {
      // 이미 열린 요일 카드 클릭 시 닫기 (Slide-up)
      setSelectedDayIndex(null);
    } else {
      // 다른 요일 카드 클릭 시 열려있는 채로 즉시 데이터 전환
      setSelectedDayIndex(idx);
    }
  };

  // 선택된 요일의 24시간 슬롯 데이터
  const activeDayData = useMemo(() => {
    if (selectedDayIndex === null) return null;
    return weeklyDaysData[selectedDayIndex] || weeklyDaysData[0];
  }, [selectedDayIndex, weeklyDaysData]);

  // 24시간 SVG 스무스 베지어 곡선 패스 생성 (Catmull-Rom/Cubic Bezier)
  const svgChartData = useMemo(() => {
    if (!activeDayData) return null;
    const slots = activeDayData.hourlySlots;
    const count = slots.length;
    const width = 940;
    const height = 120;
    const paddingX = 45;
    const paddingY = 22;

    const temps = slots.map((s) => s.temp);
    const minT = Math.min(...temps) - 2;
    const maxT = Math.max(...temps) + 2;
    const range = maxT - minT || 1;

    // 각 포인트 (x, y) 좌표 계산
    const points = slots.map((s, i) => {
      const x = paddingX + (i / (count - 1)) * (width - paddingX * 2);
      const y = height - paddingY - ((s.temp - minT) / range) * (height - paddingY * 2);
      return { x, y, temp: s.temp, pop: s.pop, isCurrent: s.isCurrent, isSpecial: s.isSpecialTime };
    });

    // 부드러운 3차 베지어 곡선(Cubic Bezier Spline) 연결
    let pathD = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      pathD += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }

    // 영역 채움용 패스 (하단 바닥으로 닫음)
    const areaD = `${pathD} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`;

    return { width, height, points, pathD, areaD };
  }, [activeDayData]);

  // 날씨 아이콘 렌더링 헬퍼
  const renderWeatherIcon = (
    type: 'sunny' | 'partlyCloudy' | 'cloudy' | 'rainy' | 'thunder' | 'night' | 'sunrise' | 'sunset',
    sizeClass = 'w-6 h-6'
  ) => {
    switch (type) {
      case 'sunny':
        return <Sun className={`${sizeClass} text-amber-400`} />;
      case 'partlyCloudy':
        return <CloudSun className={`${sizeClass} text-sky-400`} />;
      case 'cloudy':
        return <Cloud className={`${sizeClass} text-slate-400`} />;
      case 'rainy':
        return <CloudRain className={`${sizeClass} text-cyan-400`} />;
      case 'thunder':
        return <CloudLightning className={`${sizeClass} text-amber-400`} />;
      case 'night':
        return <Moon className={`${sizeClass} text-indigo-300`} />;
      case 'sunrise':
        return <Sunrise className={`${sizeClass} text-amber-400`} />;
      case 'sunset':
        return <Sunset className={`${sizeClass} text-orange-400`} />;
      default:
        return <Sun className={`${sizeClass} text-amber-400`} />;
    }
  };

  // 라이프스타일 아이콘 렌더링 헬퍼
  const renderLifestyleIcon = (iconName: string) => {
    switch (iconName) {
      case 'running':
        return <span className="text-sm">🏃</span>;
      case 'carWash':
        return <span className="text-sm">🚗</span>;
      case 'laundry':
        return <span className="text-sm">🧥</span>;
      case 'ventilation':
        return <span className="text-sm">🪟</span>;
      case 'outdoorClass':
        return <span className="text-sm">☀️</span>;
      case 'umbrella':
        return <span className="text-sm">☂️</span>;
      case 'coldCare':
        return <span className="text-sm">🧣</span>;
      default:
        return <span className="text-sm">✨</span>;
    }
  };

  // 선택된 라이프스타일 아이템 3개 추출
  const activeLifestyleItems = useMemo(() => {
    return ALL_LIFESTYLE_POOL.filter((item) => selectedLifestyleIds.includes(item.id));
  }, [selectedLifestyleIds]);

  // 🌤️ 하루 날씨 카드 (오늘 · 내일만 보이는 간단 보기와 7일 펼침에서 같이 써요)
  const renderDayCard = (day: any, idx: number) => {
            const isSelected = selectedDayIndex === idx;

            return (
              <button
                key={day.dayIndex}
                type="button"
                onClick={() => handleDayCardClick(idx)}
                className={`wx-day relative flex flex-col justify-between px-1.5 py-1 rounded-lg transition-all duration-200 cursor-pointer text-left border ${
                  isSelected
                    ? isDarkMode
                      ? 'border-cyan-400/90 shadow-[0_0_15px_rgba(34,211,238,0.3)] bg-cyan-950/30 scale-[1.01]'
                      : 'border-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.3)] bg-cyan-50/90 scale-[1.01]'
                    : day.isToday
                    ? isDarkMode
                      ? 'border-slate-700/80 bg-slate-800/40 hover:bg-slate-800/60'
                      : 'border-cyan-200 bg-cyan-50/40 hover:bg-cyan-50/80'
                    : isDarkMode
                    ? 'border-slate-800/40 bg-slate-900/30 hover:bg-slate-800/40'
                    : 'border-slate-200/70 bg-slate-50/60 hover:bg-slate-100/80'
                }`}
                title={`클릭 시 ${day.dayLabel} 24시간 시간별 기온 및 기상 추이 ${
                  isSelected ? '닫기' : '펼치기'
                }`}
              >
                {/* 상단: 요일명 + 날짜 (오늘이면 Live 배지) */}
                <div className="w-full flex items-center justify-between text-[9px] leading-tight mb-0.5">
                  <span
                    className={`font-black truncate ${
                      day.isToday
                        ? 'text-cyan-400'
                        : isDarkMode
                        ? 'text-slate-300'
                        : 'text-slate-700'
                    }`}
                  >
                    {day.dayLabel}
                  </span>
                  {day.isToday ? (
                    <span className="text-[8px] font-black px-1 py-0.1 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-400/30 shrink-0">
                      Live
                    </span>
                  ) : (
                    <span
                      className={`text-[8px] font-medium shrink-0 ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      {day.dateLabel}
                    </span>
                  )}
                </div>

                {/* 중앙: 날씨 아이콘 + 낮 대표 기온 + 강수 확률 */}
                <div className="flex flex-col items-center justify-center my-0.5">
                  <div className="mb-0.5">
                    {renderWeatherIcon(day.weatherType, 'w-4 h-4 sm:w-4.5 sm:h-4.5')}
                  </div>
                  <span
                    className={`text-xs sm:text-sm font-black tabular-nums leading-none ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {day.tempDay}°
                  </span>
                  <div className="flex items-center gap-0.5 mt-0.5 text-[8px] font-bold text-sky-400 leading-none">
                    <Droplets className="w-2 h-2 shrink-0" />
                    <span>{day.pop}%</span>
                  </div>
                </div>

                {/* 하단: 최저 / UV / 최고 기온 + 슬림 그라데이션 미니 바 */}
                <div
                  className={`w-full mt-0.5 pt-0.5 border-t ${
                    isDarkMode ? 'border-slate-700/30' : 'border-slate-200/60'
                  }`}
                >
                  <div
                    className={`flex items-center justify-between text-[7.5px] sm:text-[8px] font-bold mb-0.5 leading-none ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    <span>{day.tempLow}°</span>
                    <span className="text-amber-500 font-extrabold">UV {day.uvIndex}</span>
                    <span>{day.tempHigh}°</span>
                  </div>
                  {/* 시안 ➔ 옐로우 ➔ 오렌지 컬러 초슬림 그라데이션 바 */}
                  <div className="w-full h-0.5 rounded-full bg-gradient-to-r from-cyan-400 via-amber-400 to-rose-400 opacity-80" />
                </div>
              </button>
            );
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none weekly-weather-header"
      style={{ fontFamily: 'var(--app-font-family, inherit)' }}
    >
      {/* ========================================================================= */}
      {/* 1. 상단 메인 날씨 보드 3단 레이아웃 (상하 폭 최적화 슬림형 규격)           */}
      {/* ========================================================================= */}
      <div
        className={`w-full flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-xl border shadow-md backdrop-blur-xl transition-all ${
          isDarkMode
            ? 'bg-[#090f1d]/95 text-white border-slate-800/80 shadow-black/40'
            : 'bg-white/95 text-slate-900 border-slate-200/90 shadow-slate-200/50'
        }`}
      >
        {/* ----------------------------------------------------------------------- */}
        {/* [좌측 영역] 사용자 지역 기준 실시간 현재 기온 표시 (콤팩트 타이포그래피 + 미니 배지) */}
        {/* ----------------------------------------------------------------------- */}
        <div
          className={`shrink-0 flex items-center gap-2.5 pr-2.5 border-r ${
            isDarkMode ? 'border-slate-800/80' : 'border-slate-200/90'
          }`}
          title={`${currentDisplayName} 기준 실시간 기온`}
        >
          <div className="flex flex-col">
            {/* 기온 대형 타이포그래피 & 시안색 C 단위 & 체감 기온 */}
            <div className="flex items-baseline gap-1 leading-none">
              <span
                className={`text-3xl sm:text-3.5xl font-light tracking-tighter tabular-nums ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                {currentTemp}°
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-black text-cyan-400 leading-none">C</span>
                <span
                  className={`text-[9px] font-medium whitespace-nowrap mt-0.5 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  체감 {currentFeelsLike}°
                </span>
              </div>
            </div>

            {/* 하단 알약 배지 2개: 최고 / 최저 기온 (슬림형) */}
            <div className="flex items-center gap-1 mt-1">
              <div
                className={`flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-black border ${
                  isDarkMode
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                    : 'bg-amber-50 border-amber-200 text-amber-700'
                }`}
              >
                <span className="text-amber-500 font-extrabold leading-none">↑</span>
                <span>최고 {todayHigh}°</span>
              </div>
              <div
                className={`flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-black border ${
                  isDarkMode
                    ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300'
                    : 'bg-cyan-50 border-cyan-200 text-cyan-700'
                }`}
              >
                <span className="text-cyan-500 font-extrabold leading-none">↓</span>
                <span>최저 {todayLow}°</span>
              </div>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* [중앙 영역] 7일 주간 날씨 카드 리스트 (슬림형 콤팩트 카드)                   */}
        {/* ----------------------------------------------------------------------- */}
        <div
          className={`wx-week flex-1 grid gap-1 sm:gap-1.5 relative ${wxCompact ? 'grid-cols-[minmax(84px,1fr)_minmax(84px,1fr)_auto] min-w-[232px]' : 'grid-cols-7 min-w-0'}`}
          onMouseLeave={() => setWxPeek(false)}
        >
          {(wxCompact ? weeklyDaysData.slice(0, 2) : weeklyDaysData).map((day, idx) => renderDayCard(day, idx))}
          {wxCompact ? (
            <button
              type="button"
              className="wx-more"
              onMouseEnter={() => setWxPeek(true)}
              onClick={() => toggleWxCompact(false)}
              title="누르면 7일 날씨를 항상 펼쳐 둬요 (마우스를 올리면 잠깐 보여요)"
              data-wx-more
            >
              <span>+{Math.max(0, weeklyDaysData.length - 2)}일</span>
              <small>주간 ▾</small>
            </button>
          ) : (
            <button type="button" className="wx-fold" onClick={() => toggleWxCompact(true)} title="오늘 · 내일만 보이게 접기" data-wx-fold>
              ‹
            </button>
          )}
          {wxCompact && wxPeek && (
            <div className={`wx-peek ${isDarkMode ? 'is-dark' : ''}`} onMouseEnter={() => setWxPeek(true)} data-wx-peek>
              {weeklyDaysData.map((day, idx) => renderDayCard(day, idx))}
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* [우측 영역] 스마트 라이프스타일 지수 (슬림형 카드)                          */}
        {/* ----------------------------------------------------------------------- */}
        <div
          className={`shrink min-w-[210px] w-[270px] sm:w-[310px] pl-2.5 border-l overflow-hidden flex flex-col justify-between ${
            isDarkMode ? 'border-slate-800/80' : 'border-slate-200/90'
          }`}
        >
          {/* 헤더: 타이틀 + 맞춤 설정 버튼 (단일 라인 콤팩트 배치) */}
          <div className="flex items-center justify-between gap-1 mb-1">
            <span
              className={`text-xs font-black truncate leading-tight ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}
              title="실시간 미세먼지, 습도, 바람을 종합 연산한 생활 지수"
            >
              스마트 라이프스타일 지수
            </span>

            {/* [⚙️ 맞춤 설정] 버튼 */}
            <button
              type="button"
              onClick={() => setIsLifestyleModalOpen((prev) => !prev)}
              className={`flex items-center gap-0.5 px-1.5 py-0.2 rounded-md border text-[9px] font-bold cursor-pointer transition shrink-0 ${
                isDarkMode
                  ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/80'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200'
              }`}
              title="생활 지수 항목 맞춤 선택 (최대 3개)"
            >
              <Settings className="w-2.5 h-2.5" />
              <span>설정</span>
            </button>
          </div>

          {/* 지수 카드 목록 (최대 3개 가로 그리드 슬림화) */}
          <div className="grid grid-cols-3 gap-1">
            {activeLifestyleItems.map((item) => {
              const barBg =
                item.barColor === 'cyan'
                  ? 'bg-cyan-400'
                  : item.barColor === 'indigo'
                  ? 'bg-indigo-400'
                  : item.barColor === 'amber'
                  ? 'bg-amber-400'
                  : item.barColor === 'emerald'
                  ? 'bg-emerald-400'
                  : item.barColor === 'rose'
                  ? 'bg-rose-400'
                  : 'bg-yellow-400';

              return (
                <div
                  key={item.id}
                  className={`flex flex-col justify-between p-1 rounded-lg border ${
                    isDarkMode
                      ? 'bg-slate-900/50 border-slate-800/60'
                      : 'bg-slate-50/80 border-slate-200/80'
                  }`}
                  title={`${item.title} (${item.statusText}): ${item.description}`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1 truncate">
                      {renderLifestyleIcon(item.iconName)}
                      <span
                        className={`text-[9.5px] font-black truncate leading-tight ${
                          isDarkMode ? 'text-slate-200' : 'text-slate-800'
                        }`}
                      >
                        {item.title.split(' ')[0]}
                      </span>
                    </div>
                    <span className="text-[11px] font-black text-cyan-400 tabular-nums leading-none">
                      {item.score}
                    </span>
                  </div>

                  <span
                    className={`text-[7.5px] font-bold truncate mb-0.5 leading-tight ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {item.statusText}
                  </span>

                  {/* 미니 게이지 바 */}
                  <div
                    className={`w-full h-0.5 rounded-full overflow-hidden ${
                      isDarkMode ? 'bg-slate-800' : 'bg-slate-200'
                    }`}
                  >
                    <div
                      className={`h-full rounded-full ${barBg} transition-all duration-500`}
                      style={{ width: `${Math.min(100, item.score)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* [⚙️ 맞춤 설정] 팝오버 모달 (최대 3개 체크박스 선택)                        */}
      {/* ========================================================================= */}
      {isLifestyleModalOpen && (
        <div
          className={`absolute top-full right-0 mt-2 z-50 w-80 p-3.5 rounded-2xl border shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 ${
            isDarkMode
              ? 'bg-[#090f1d]/98 border-slate-700/80 text-white'
              : 'bg-white/98 border-slate-200 text-slate-900 shadow-xl'
          }`}
        >
          <div
            className={`flex items-center justify-between pb-2 mb-2 border-b ${
              isDarkMode ? 'border-slate-700/60' : 'border-slate-200'
            }`}
          >
            <span className="text-xs font-black flex items-center gap-1.5 text-cyan-400">
              <Settings className="w-3.5 h-3.5" />
              <span>라이프스타일 지수 맞춤 설정</span>
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-bold ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                {selectedLifestyleIds.length}/3개 선택됨
              </span>
              <button
                type="button"
                onClick={() => setIsLifestyleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {ALL_LIFESTYLE_POOL.map((item) => {
              const isChecked = selectedLifestyleIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleToggleLifestyleItem(item.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition cursor-pointer ${
                    isChecked
                      ? isDarkMode
                        ? 'bg-cyan-950/40 border-cyan-500/50 text-white'
                        : 'bg-cyan-50 border-cyan-400 text-slate-900'
                      : isDarkMode
                      ? 'bg-slate-800/40 border-slate-700/40 text-slate-300 hover:bg-slate-800/70'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {renderLifestyleIcon(item.iconName)}
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold">{item.title}</span>
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded ${
                            isDarkMode
                              ? 'bg-slate-700 text-slate-300'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {item.category}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] block truncate mt-0.5 ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        {item.description}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                      isChecked
                        ? 'bg-cyan-500 border-cyan-400 text-black'
                        : isDarkMode
                        ? 'border-slate-600 bg-slate-900'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div
            className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[10px] ${
              isDarkMode
                ? 'border-slate-700/60 text-slate-400'
                : 'border-slate-200 text-slate-500'
            }`}
          >
            <span>💡 3개 초과 선택 시 가장 오래된 항목이 교체됩니다.</span>
            <button
              type="button"
              onClick={() => setIsLifestyleModalOpen(false)}
              className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-black cursor-pointer transition"
            >
              완료
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. 주간 날씨 요일 연동 '24시간 시간별 기온 및 기상 추이' Expandable Panel     */}
      {/*    (두 번째 레퍼런스 이미지 규격, Slide-down / Slide-up 아코디언 애니메이션)   */}
      {/* ========================================================================= */}
      {selectedDayIndex !== null && activeDayData && (
        <div
          className={`absolute top-full left-0 mt-2 z-50 w-full rounded-2xl border shadow-2xl backdrop-blur-2xl p-4 transition-all duration-300 ease-out origin-top animate-in fade-in slide-in-from-top-3 ${
            isDarkMode
              ? 'bg-[#090f1d]/98 border-cyan-500/30 text-white shadow-black/60'
              : 'bg-white/98 border-cyan-400/40 text-slate-900 shadow-xl'
          }`}
        >
          {/* 1) 패널 헤더: 타이틀 + 범례 (━ 기온 추세, ● 강수 확률, ◁ 풍향/풍속) */}
          <div
            className={`flex items-center justify-between pb-2 mb-2 border-b ${
              isDarkMode ? 'border-slate-800/80' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span
                className={`text-xs sm:text-sm font-black ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                {activeDayData.dayLabel} 24시간 시간별 기온 및 기상 추이
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {activeDayData.dateLabel}
              </span>
            </div>

            {/* 범례 리스트 */}
            <div
              className={`flex items-center gap-3 text-[10px] font-bold ${
                isDarkMode ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-0.5 bg-sky-400 rounded-full" />
                <span>기온 추세</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>강수 확률</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Navigation className="w-3 h-3 text-amber-500 -rotate-45" />
                <span>풍향/풍속</span>
              </div>
              {/* 패널 닫기 버튼 */}
              <button
                type="button"
                onClick={() => setSelectedDayIndex(null)}
                className={`ml-2 p-1 rounded-lg transition cursor-pointer ${
                  isDarkMode
                    ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                    : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                }`}
                title="24시간 패널 닫기"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 2) 상단 베지어 곡선 영역 그래프 (SVG Smooth Area Chart) */}
          {svgChartData && (
            <div className="relative w-full h-28 my-1">
              <svg
                viewBox={`0 0 ${svgChartData.width} ${svgChartData.height}`}
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  {/* 시안색 네온 곡선 하단 영역 그라데이션 */}
                  <linearGradient id="weatherAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* 하단 영역 채움 */}
                <path d={svgChartData.areaD} fill="url(#weatherAreaGrad)" />

                {/* 부드러운 네온 곡선 */}
                <path
                  d={svgChartData.pathD}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* 각 포인트 및 강수 버블/현재시간 하이라이트 원형 도트 */}
                {svgChartData.points.map((pt, idx) => {
                  return (
                    <g key={idx}>
                      {/* 강수 확률이 높을 때 상공에 뜨는 푸른색 원형 버블 */}
                      {pt.pop > 0 && (
                        <circle
                          cx={pt.x}
                          cy={Math.max(15, pt.y - 18)}
                          r={pt.pop > 30 ? 7 : 5}
                          fill="#0284c7"
                          fillOpacity="0.45"
                        />
                      )}

                      {/* 포인트 도트: 현재시간 또는 일출/일몰 강조 */}
                      {pt.isCurrent ? (
                        <>
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={6}
                            fill="#ffffff"
                            stroke="#38bdf8"
                            strokeWidth="3"
                            className="animate-pulse"
                          />
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={12}
                            fill="#38bdf8"
                            fillOpacity="0.25"
                          />
                        </>
                      ) : pt.isSpecial ? (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={4}
                          fill="#f59e0b"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                      ) : (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={2.5}
                          fill="#94a3b8"
                          fillOpacity="0.6"
                        />
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          )}

          {/* 3) 하단 시간대별 상세 슬롯 리스트 (10개 시간 구간) */}
          <div
            className={`grid grid-cols-10 gap-1 sm:gap-2 mt-2 pt-2 border-t ${
              isDarkMode ? 'border-slate-800/80' : 'border-slate-200'
            }`}
          >
            {activeDayData.hourlySlots.map((slot, sIdx) => {
              const isHighlight = slot.isCurrent;

              return (
                <div
                  key={sIdx}
                  className={`flex flex-col items-center justify-between p-2 rounded-xl transition text-center ${
                    isHighlight
                      ? isDarkMode
                        ? 'bg-slate-800/90 border border-cyan-400/60 shadow-[0_0_15px_rgba(34,211,238,0.25)]'
                        : 'bg-cyan-50/90 border border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                      : isDarkMode
                      ? 'hover:bg-slate-800/40 border border-transparent'
                      : 'hover:bg-slate-100/60 border border-transparent'
                  }`}
                >
                  {/* 시간 라벨 (일출/일몰은 골드/앰버 텍스트 강조) */}
                  <div className="mb-1">
                    {slot.specialLabel === '일출' || slot.specialLabel === '일몰' ? (
                      <span className="text-[10px] font-black text-amber-500">
                        {slot.timeLabel} {slot.specialLabel}
                      </span>
                    ) : slot.specialLabel === '지금' ? (
                      <span className="text-[10px] font-black text-cyan-400">
                        지금 ({slot.timeLabel})
                      </span>
                    ) : (
                      <span
                        className={`text-[10px] font-medium ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        {slot.timeLabel}
                      </span>
                    )}
                  </div>

                  {/* 날씨 아이콘 */}
                  <div className="my-1">
                    {renderWeatherIcon(slot.weatherType, 'w-5 h-5 sm:w-6 sm:h-6')}
                  </div>

                  {/* 기온 */}
                  <span
                    className={`text-sm font-black tabular-nums my-0.5 ${
                      isHighlight
                        ? 'text-cyan-400 text-base'
                        : isDarkMode
                        ? 'text-white'
                        : 'text-slate-900'
                    }`}
                  >
                    {slot.temp}°
                  </span>

                  {/* 강수 확률 */}
                  <div className="flex items-center gap-0.5 text-[9px] font-bold text-sky-400 my-0.5">
                    <Droplets className="w-2.5 h-2.5 shrink-0" />
                    <span>{slot.pop}%</span>
                  </div>

                  {/* 풍속 */}
                  <span
                    className={`text-[8.5px] font-medium truncate mt-0.5 ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {slot.wind}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
