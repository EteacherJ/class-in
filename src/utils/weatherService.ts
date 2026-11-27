/**
 * 🌤️ 스마트 학급 대시보드 - 실시간 위치 및 기상 서비스
 *
 * 브라우저 Geolocation API 및 무료 기상/역지오코딩 오픈 API(Open-Meteo, BigDataCloud)를 활용하여
 * 사용자의 실제 현재 위치 기준 실시간 날씨, 기온, 습도, 미세먼지 및 주간 일기예보를 가져옵니다.
 */

export type GlobalWeatherType = 'snow' | 'rain' | 'sun' | 'cloud';

export interface UserLocation {
  latitude: number;
  longitude: number;
  locationName: string; // 예: "수원시", "서울시 강남구"
}

export interface DailyForecastData {
  dayName: string;
  weatherType: 'sunny' | 'partlyCloudy' | 'cloudy' | 'rainy';
  icon: string;
  high: number;
  low: number;
  isToday: boolean;
}

export interface RealtimeWeatherResult {
  locationName: string;
  weatherType: GlobalWeatherType;
  icon: string;
  statusText: string;
  temp: number;
  humidity: number;
  dust: string; // 최고좋음, 좋음, 보통, 나쁨, 매우나쁨
  fineDust?: string; // 초미세먼지 등급 (좋음 · 보통 · 나쁨 · 매우나쁨)
  pm10?: number;
  pm25?: number;
  forecastDays: DailyForecastData[];
  updatedAt: string;
  /** 바람 세기 (km/h, 10m 높이) */
  windSpeed?: number;
  /** 순간 돌풍 (km/h) */
  windGust?: number;
  /** 날씨를 받아오지 못해 임시 값을 보여 주는 중 */
  isFallback?: boolean;
}

// 📍 사용자가 직접 지정한 날씨 위치 (환경설정 › 날씨 위치)
export const MANUAL_LOCATION_KEY = 'weather_manual_location';
export const WEATHER_LOCATION_EVENT = 'classin:weather-location-changed';
export const REALTIME_WEATHER_EVENT = 'classin:realtime-weather';

export function getManualLocation(): UserLocation | null {
  try {
    const v = JSON.parse(localStorage.getItem(MANUAL_LOCATION_KEY) || 'null');
    if (v && typeof v.latitude === 'number' && typeof v.longitude === 'number' && v.locationName) return v;
  } catch { /* 무시 */ }
  return null;
}

/** 직접 지정한 위치 저장 (null 이면 자동 위치로 되돌리기) */
export function setManualLocation(loc: UserLocation | null) {
  try {
    if (loc) {
      localStorage.setItem(MANUAL_LOCATION_KEY, JSON.stringify(loc));
      localStorage.setItem('smart_dashboard_user_location', JSON.stringify(loc));
    } else {
      localStorage.removeItem(MANUAL_LOCATION_KEY);
    }
  } catch { /* 무시 */ }
  try { window.dispatchEvent(new CustomEvent(WEATHER_LOCATION_EVENT, { detail: loc })); } catch { /* 무시 */ }
}

export interface PlaceSearchResult extends UserLocation { detail: string }

/** 🔎 지역 이름으로 위치 찾기 (Open-Meteo 지오코딩 · 무료 · 키 불필요) */
export async function searchPlaces(query: string): Promise<PlaceSearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=10&language=ko&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('지역 검색 실패');
  const data = await res.json();
  const list: any[] = Array.isArray(data?.results) ? data.results : [];
  // 우리나라 결과를 먼저
  list.sort((a, b) => (b.country_code === 'KR' ? 1 : 0) - (a.country_code === 'KR' ? 1 : 0));
  return list.map((r) => {
    const parts = [r.admin1, r.admin2, r.admin3].filter((x: any) => x && x !== r.name);
    return {
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      locationName: String(r.name),
      detail: [parts.join(' '), r.country_code !== 'KR' ? r.country : ''].filter(Boolean).join(' · '),
    };
  });
}


// 🇰🇷 기본 위치 (위치 정보를 받기 전 임시: 서울특별시청 부근)
export const DEFAULT_LOCATION: UserLocation = {
  latitude: 37.5665,
  longitude: 126.978,
  locationName: '서울특별시',
};

/**
 * WMO Weather Interpretation Codes를 앱 날씨 타입 및 이모지로 매핑
 */
export function mapWmoCodeToWeather(code: number): {
  weatherType: GlobalWeatherType;
  icon: string;
  statusText: string;
  dailyType: 'sunny' | 'partlyCloudy' | 'cloudy' | 'rainy';
} {
  // 0: 맑음
  if (code === 0) {
    return { weatherType: 'sun', icon: '☀️', statusText: '맑음', dailyType: 'sunny' };
  }
  // 1, 2: 대체로 맑음 / 구름 조금
  if (code === 1 || code === 2) {
    return { weatherType: 'sun', icon: '🌤️', statusText: '구름조금', dailyType: 'partlyCloudy' };
  }
  // 3: 흐림 / 구름 많음
  if (code === 3) {
    return { weatherType: 'cloud', icon: '☁️', statusText: '흐림', dailyType: 'cloudy' };
  }
  // 45, 48: 안개
  if (code === 45 || code === 48) {
    return { weatherType: 'cloud', icon: '🌫️', statusText: '안개', dailyType: 'cloudy' };
  }
  // 51, 53, 55, 56, 57: 이슬비
  if (code >= 51 && code <= 57) {
    return { weatherType: 'rain', icon: '🌦️', statusText: '이슬비', dailyType: 'rainy' };
  }
  // 61, 63, 65, 66, 67, 80, 81, 82: 비 / 소나기
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    return { weatherType: 'rain', icon: '🌧️', statusText: '비 내림', dailyType: 'rainy' };
  }
  // 71, 73, 75, 77, 85, 86: 눈 / 소낙눈
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return { weatherType: 'snow', icon: '❄️', statusText: '눈 내림', dailyType: 'rainy' };
  }
  // 95, 96, 99: 뇌우
  if (code >= 95 && code <= 99) {
    return { weatherType: 'rain', icon: '⛈️', statusText: '천둥번개', dailyType: 'rainy' };
  }

  // 기본 fallback
  return { weatherType: 'sun', icon: '☀️', statusText: '맑음', dailyType: 'sunny' };
}

// 한국 주요 행정구역 영문 -> 한글 매핑 테이블
const CITY_EN_TO_KO: Record<string, string> = {
  'Goyang-si': '고양시',
  'Goyang': '고양시',
  'Seoul': '서울시',
  'Uijeongbu-si': '의정부시',
  'Uijeongbu': '의정부시',
  'Suwon-si': '수원시',
  'Suwon': '수원시',
  'Seongnam-si': '성남시',
  'Seongnam': '성남시',
  'Incheon': '인천시',
  'Busan': '부산시',
  'Daegu': '대구시',
  'Daejeon': '대전시',
  'Gwangju': '광주시',
  'Ulsan': '울산시',
  'Bucheon-si': '부천시',
  'Yongin-si': '용인시',
  'Ansan-si': '안산시',
  'Anyang-si': '안양시',
  'Namyangju-si': '남양주시',
  'Hwaseong-si': '화성시',
  'Pyeongtaek-si': '평택시',
  'Siheung-si': '시흥시',
  'Paju-si': '파주시',
  'Gimpo-si': '김포시',
  'Gwangmyeong-si': '광명시',
  'Gunpo-si': '군포시',
  'Osan-si': '오산시',
  'Icheon-si': '이천시',
  'Yangju-si': '양주시',
  'Anseong-si': '안성시',
  'Guri-si': '구리시',
  'Pocheon-si': '포천시',
  'Uiwang-si': '의왕시',
  'Hanam-si': '하남시',
  'Yeoju-si': '여주시',
  'Chuncheon-si': '춘천시',
  'Gangneung-si': '강릉시',
  'Wonju-si': '원주시',
  'Cheongju-si': '청주시',
  'Cheonan-si': '천안시',
  'Jeonju-si': '전주시',
  'Pohang-si': '포항시',
  'Changwon-si': '창원시',
  'Jeju-si': '제주시',
  'Sejong': '세종시',
};

export function normalizeCityName(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (CITY_EN_TO_KO[trimmed]) return CITY_EN_TO_KO[trimmed];

  // "-si" 제거 후 재확인 (예: "Goyang-si" -> "Goyang")
  const withoutSi = trimmed.replace(/-si$/i, '');
  if (CITY_EN_TO_KO[withoutSi]) return CITY_EN_TO_KO[withoutSi];

  // 이미 한글인 경우 그대로 반환
  if (/[가-힣]/.test(trimmed)) return trimmed;

  return trimmed;
}

/**
 * 위도, 경도 좌표를 기반으로 한글 지역명(구/시/군)을 가져옵니다.
 */
export async function getKoreanLocationName(lat: number, lon: number): Promise<string> {
  try {
    // BigDataCloud Reverse Geocoding Client (무료, API 키 불필요, 한글 최적화)
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ko`
    );
    if (res.ok) {
      const data = await res.json();
      const city = data.city || data.principalSubdivision || '';
      const locality = data.locality || '';
      
      if (city && locality && !city.includes(locality)) {
        return `${normalizeCityName(city)} ${locality}`.trim();
      }
      if (locality) return normalizeCityName(locality);
      if (city) return normalizeCityName(city);
    }
  } catch (err) {
    console.warn('🟡 [WeatherService] BigDataCloud 역지오코딩 조회 실패:', err);
  }

  // 국내 주요 중심 도시 및 지역 좌표 사전 매핑 (학교 설정 및 빠른 fallback)
  const cityCoordinateMap: Record<string, { lat: number; lon: number; name: string }> = {
    '의정부': { lat: 37.7381, lon: 127.0337, name: '의정부시' },
    '의정부시': { lat: 37.7381, lon: 127.0337, name: '의정부시' },
    '서울': { lat: 37.5665, lon: 126.9780, name: '서울특별시' },
    '서울시': { lat: 37.5665, lon: 126.9780, name: '서울특별시' },
    '서울특별시': { lat: 37.5665, lon: 126.9780, name: '서울특별시' },
    '수원': { lat: 37.2636, lon: 127.0286, name: '수원시' },
    '수원시': { lat: 37.2636, lon: 127.0286, name: '수원시' },
    '성남': { lat: 37.4449, lon: 127.1388, name: '성남시' },
    '성남시': { lat: 37.4449, lon: 127.1388, name: '성남시' },
    '고양': { lat: 37.6584, lon: 126.8320, name: '고양시' },
    '고양시': { lat: 37.6584, lon: 126.8320, name: '고양시' },
    '인천': { lat: 37.4563, lon: 126.7052, name: '인천광역시' },
    '인천시': { lat: 37.4563, lon: 126.7052, name: '인천광역시' },
    '용인': { lat: 37.2411, lon: 127.1776, name: '용인시' },
    '용인시': { lat: 37.2411, lon: 127.1776, name: '용인시' },
    '부천': { lat: 37.5034, lon: 126.7660, name: '부천시' },
    '부천시': { lat: 37.5034, lon: 126.7660, name: '부천시' },
    '안산': { lat: 37.3219, lon: 126.8309, name: '안산시' },
    '안양': { lat: 37.3943, lon: 126.9568, name: '안양시' },
    '남양주': { lat: 37.6360, lon: 127.2165, name: '남양주시' },
    '화성': { lat: 37.1995, lon: 126.8315, name: '화성시' },
    '평택': { lat: 36.9921, lon: 127.1129, name: '평택시' },
    '파주': { lat: 37.7600, lon: 126.7798, name: '파주시' },
    '김포': { lat: 37.6153, lon: 126.7157, name: '김포시' },
    '광명': { lat: 37.4786, lon: 126.8647, name: '광명시' },
    '춘천': { lat: 37.8813, lon: 127.7298, name: '춘천시' },
    '원주': { lat: 37.3422, lon: 127.9202, name: '원주시' },
    '대전': { lat: 36.3504, lon: 127.3845, name: '대전광역시' },
    '세종': { lat: 36.4800, lon: 127.2890, name: '세종특별자치시' },
    '대구': { lat: 35.8714, lon: 128.6014, name: '대구광역시' },
    '광주': { lat: 35.1595, lon: 126.8526, name: '광주광역시' },
    '부산': { lat: 35.1796, lon: 129.0756, name: '부산광역시' },
    '울산': { lat: 35.5384, lon: 129.3114, name: '울산광역시' },
    '전주': { lat: 35.8242, lon: 127.1480, name: '전주시' },
    '포항': { lat: 36.0190, lon: 129.3435, name: '포항시' },
    '창원': { lat: 35.2280, lon: 128.6811, name: '창원시' },
    '제주': { lat: 33.4996, lon: 126.5312, name: '제주시' },
  };

  // Fallback: 대한민국 주요 중심 도시 거리 근사 계산
  const majorCities = Object.values(cityCoordinateMap);
  let nearestCity = DEFAULT_LOCATION.locationName;
  let minDistance = Infinity;

  for (const c of majorCities) {
    const d = Math.hypot(c.lat - lat, c.lon - lon);
    if (d < minDistance) {
      minDistance = d;
      nearestCity = c.name;
    }
  }

  return nearestCity;
}

/**
 * 📍 브라우저 Geolocation API 및 3중 IP 다중 fallback을 활용하여 사용자 현재 위치를 획득합니다.
 * @param preferredLocationName 환경설정이나 사용자가 선호하는 지역명이 있다면 우선 매핑
 */
export async function getCurrentUserLocation(preferredLocationName?: string): Promise<UserLocation> {
  console.log('🔵 [WeatherService] 사용자 현재 위치 탐색 시작... (선호 지역:', preferredLocationName, ')');

  // 0. 환경설정에서 직접 지정한 위치가 있으면 그것을 가장 먼저 사용
  const manual = getManualLocation();
  if (manual) {
    try { localStorage.setItem('smart_dashboard_user_location', JSON.stringify(manual)); } catch {}
    return manual;
  }

  // 1. 브라우저 Geolocation API 시도 (가장 정확한 GPS/Wi-Fi 기반)
  if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 4500,
          maximumAge: 1000 * 60 * 10, // 10분 캐시
        });
      });

      const { latitude, longitude } = position.coords;
      const locationName = await getKoreanLocationName(latitude, longitude);

      console.log('🟢 [WeatherService] GPS 위치 감지 성공:', { latitude, longitude, locationName });
      const userLoc: UserLocation = { latitude, longitude, locationName };
      
      try {
        localStorage.setItem('smart_dashboard_user_location', JSON.stringify(userLoc));
      } catch {}

      return userLoc;
    } catch (geoError) {
      console.warn('🟡 [WeatherService] Geolocation 허용 안됨 또는 실패, IP 다중 감지 시도:', geoError);
    }
  }

  // 2. IP 기반 무료 위치 확인 1차 시도 (ipwho.is - 무료 한도 넉넉, CORS 완벽 지원)
  try {
    const res = await fetch('https://ipwho.is/?lang=ko');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.latitude && data.longitude) {
        let locationName = data.city || data.region || '';
        const koreanLoc = await getKoreanLocationName(data.latitude, data.longitude);
        if (koreanLoc) locationName = koreanLoc;

        const userLoc: UserLocation = {
          latitude: data.latitude,
          longitude: data.longitude,
          locationName: normalizeCityName(locationName),
        };
        console.log('🟢 [WeatherService] ipwho.is 기반 위치 감지 성공:', userLoc);
        try {
          localStorage.setItem('smart_dashboard_user_location', JSON.stringify(userLoc));
        } catch {}
        return userLoc;
      }
    }
  } catch (e) {
    console.warn('🟡 [WeatherService] ipwho.is 실패, 2차 fallback 시도');
  }

  // 3. IP 기반 2차 시도 (ipapi.co)
  try {
    const ipRes = await fetch('https://ipapi.co/json/');
    if (ipRes.ok) {
      const ipData = await ipRes.json();
      if (ipData.latitude && ipData.longitude) {
        let locationName = await getKoreanLocationName(ipData.latitude, ipData.longitude);
        if (!locationName && ipData.city) {
          locationName = normalizeCityName(ipData.city);
        }
        const userLoc: UserLocation = {
          latitude: ipData.latitude,
          longitude: ipData.longitude,
          locationName,
        };
        console.log('🟢 [WeatherService] ipapi.co 기반 위치 감지 성공:', userLoc);
        try {
          localStorage.setItem('smart_dashboard_user_location', JSON.stringify(userLoc));
        } catch {}
        return userLoc;
      }
    }
  } catch (ipErr) {
    console.warn('🟡 [WeatherService] ipapi.co 위치 감지 실패');
  }

  // 4. 기존에 캐시된 위치가 있다면 활용
  try {
    const cached = localStorage.getItem('smart_dashboard_user_location');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.latitude && parsed.longitude) {
        console.log('🟢 [WeatherService] 캐시된 이전 위치 활용:', parsed);
        return parsed;
      }
    }
  } catch {}

  // 5. 최종 기본값 반환
  console.log('🔵 [WeatherService] 기본 위치 반환');
  return DEFAULT_LOCATION;
}

/**
 * ☁️ 특정 위치(위도, 경도)의 실시간 날씨 및 주간 예보 데이터를 Open-Meteo API에서 조회합니다.
 */
export async function fetchRealtimeWeather(
  location: UserLocation
): Promise<RealtimeWeatherResult> {
  const { latitude, longitude, locationName } = location;
  console.log(`🔵 [WeatherService] [${locationName}] (${latitude}, ${longitude}) 실시간 기상 조회 중...`);

  try {
    // 1. Open-Meteo Forecast API (현재 기온, 습도, WMO 기상 코드 및 7일 일별 예보)
    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_gusts_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;

    // 2. Open-Meteo Air Quality API (미세먼지 PM10)
    const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=pm10,pm2_5`;

    const [forecastRes, airRes] = await Promise.allSettled([
      fetch(forecastUrl),
      fetch(airUrl),
    ]);

    if (forecastRes.status !== 'fulfilled' || !forecastRes.value.ok) {
      throw new Error('기상청/Open-Meteo 예보 데이터를 가져오지 못했습니다.');
    }

    const forecastData = await forecastRes.value.json();
    const current = forecastData.current || {};
    const daily = forecastData.daily || {};

    // 현재 기온 및 습도
    const temp = Math.round(current.temperature_2m ?? 20);
    const humidity = Math.round(current.relative_humidity_2m ?? 50);
    const weatherInfo = mapWmoCodeToWeather(current.weather_code ?? 0);

    // 미세먼지 등급 산정
    let dustText = '좋음';
    let fineDustText: string | undefined;
    let pm10Val: number | undefined;
    let pm25Val: number | undefined;
    if (airRes.status === 'fulfilled' && airRes.value.ok) {
      try {
        const airData = await airRes.value.json();
        const pm10 = airData.current?.pm10;
        if (typeof pm10 === 'number') {
          if (pm10 <= 15) dustText = '최고좋음';
          else if (pm10 <= 30) dustText = '좋음';
          else if (pm10 <= 80) dustText = '보통';
          else if (pm10 <= 150) dustText = '나쁨';
          else dustText = '매우나쁨';
          pm10Val = Math.round(pm10);
        }
        const pm25 = airData.current?.pm2_5;
        if (typeof pm25 === 'number') {
          pm25Val = Math.round(pm25);
          fineDustText = pm25 <= 15 ? '좋음' : pm25 <= 35 ? '보통' : pm25 <= 75 ? '나쁨' : '매우나쁨';
        }
      } catch {}
    }

    // 주간 예보 계산 (오늘 포함 향후 6일간)
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const forecastDays: DailyForecastData[] = [];

    if (Array.isArray(daily.time)) {
      for (let i = 0; i < Math.min(6, daily.time.length); i++) {
        const dateStr = daily.time[i]; // 'YYYY-MM-DD'
        const dateObj = new Date(dateStr);
        const dayIdx = dateObj.getDay();
        const code = daily.weather_code ? daily.weather_code[i] : 0;
        const mapped = mapWmoCodeToWeather(code);
        const high = Math.round(daily.temperature_2m_max ? daily.temperature_2m_max[i] : temp + 2);
        const low = Math.round(daily.temperature_2m_min ? daily.temperature_2m_min[i] : temp - 3);

        forecastDays.push({
          dayName: days[dayIdx],
          weatherType: mapped.dailyType,
          icon: i === 0 ? weatherInfo.icon : mapped.icon,
          high: i === 0 ? Math.max(high, temp) : high,
          low: i === 0 ? Math.min(low, temp) : low,
          isToday: i === 0,
        });
      }
    }

    const result: RealtimeWeatherResult = {
      locationName,
      weatherType: weatherInfo.weatherType,
      icon: weatherInfo.icon,
      statusText: weatherInfo.statusText,
      temp,
      humidity,
      dust: dustText,
      fineDust: fineDustText,
      pm10: pm10Val,
      pm25: pm25Val,
      forecastDays,
      updatedAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      windSpeed: typeof current.wind_speed_10m === 'number' ? Math.round(current.wind_speed_10m) : undefined,
      windGust: typeof current.wind_gusts_10m === 'number' ? Math.round(current.wind_gusts_10m) : undefined,
    };

    console.log('🟢 [WeatherService] 실시간 날씨 데이터 로딩 성공:', result);
    return result;
  } catch (error) {
    console.error('🔴 [WeatherService] 실시간 날씨 호출 오류:', error);
    // 오류 시 안전한 기본 기상 데이터 반환 (현재 실제 오늘 요일 기준 동적 생성)
    const now = new Date();
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const fallbackDays: DailyForecastData[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setDate(now.getDate() + i);
      fallbackDays.push({
        dayName: days[d.getDay()],
        weatherType: i === 0 ? 'sunny' : (i % 2 === 0 ? 'partlyCloudy' : 'sunny'),
        icon: i === 0 ? '☀️' : (i % 2 === 0 ? '⛅' : '🌤️'),
        high: 22 - (i % 3),
        low: 12 - (i % 2),
        isToday: i === 0,
      });
    }

    return {
      locationName,
      weatherType: 'sun',
      icon: '☀️',
      statusText: '맑음',
      temp: 21,
      humidity: 50,
      dust: '좋음',
      forecastDays: fallbackDays,
      isFallback: true,
      updatedAt: '오프라인',
    };
  }
}
