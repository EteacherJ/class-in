import React, { useEffect, useState } from 'react';
import { REALTIME_WEATHER_EVENT } from '../utils/weatherService';
import { isKoreanHoliday } from '../utils/koreanHolidays';

/**
 * 🌇 퇴근 30분 전부터 뒷배경에 노을이 천천히 번져요.
 * - 상단 헤더 날씨와 연동: 비 오는 날은 빗줄기, 눈 오는 날은 눈송이, 흐린 날은 차분한 회보랏빛
 * - 위젯 · 글자는 그대로 두고 맨 뒤 배경만 바뀌어요. 퇴근 1시간 30분 뒤부터 30분에 걸쳐 원래대로.
 * - 주말 · 공휴일에는 나오지 않아요. 환경설정의 [미리보기]로 바로 볼 수 있어요.
 */
type Wx = 'sun' | 'cloud' | 'rain' | 'snow';
const readWx = (): Wx => {
  try {
    const w = JSON.parse(localStorage.getItem('smart_dashboard_realtime_weather') || 'null')?.weatherType || localStorage.getItem('smart_board_weather');
    if (w === 'rain' || w === 'rainy' || w === 'thunder') return 'rain';
    if (w === 'snow') return 'snow';
    if (w === 'cloud' || w === 'cloudy') return 'cloud';
  } catch {}
  return 'sun';
};
const toMin = (hhmm: string) => {
  const [h, m] = (hhmm || '16:30').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const DuskBackdrop: React.FC<{ endTime?: string; enabled?: boolean; dark?: boolean }> = ({ endTime = '16:30', enabled = true, dark }) => {
  const [now, setNow] = useState(() => new Date());
  const [wx, setWx] = useState<Wx>(readWx);
  const [preview, setPreview] = useState<{ until: number; wx: Wx | null } | null>(null);
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30000);
    const onWx = () => setWx(readWx());
    const onPrev = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      setPreview({ until: Date.now() + (d.ms || 8000), wx: d.wx || null });
      window.setTimeout(() => setPreview(null), (d.ms || 8000) + 50);
    };
    window.addEventListener(REALTIME_WEATHER_EVENT, onWx);
    window.addEventListener('smart_board_weather_change', onWx);
    window.addEventListener('storage', onWx);
    window.addEventListener('classin-dusk-preview', onPrev);
    return () => {
      clearInterval(t);
      window.removeEventListener(REALTIME_WEATHER_EVENT, onWx);
      window.removeEventListener('smart_board_weather_change', onWx);
      window.removeEventListener('storage', onWx);
      window.removeEventListener('classin-dusk-preview', onPrev);
    };
  }, []);

  let progress = 0;
  if (preview) progress = 1;
  else if (enabled) {
    const day = now.getDay();
    const holiday = isKoreanHoliday(now.getFullYear(), now.getMonth() + 1, now.getDate());
    if (day !== 0 && day !== 6 && !holiday) {
      const end = toMin(endTime);
      const m = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
      if (m >= end - 30 && m < end) progress = (m - (end - 30)) / 30;
      else if (m >= end && m < end + 90) progress = 1;
      else if (m >= end + 90 && m < end + 120) progress = 1 - (m - (end + 90)) / 30;
    }
  }
  const showWx = preview?.wx || wx;
  if (progress <= 0) return null;
  return (
    <div
      className={`cl-dusk wx-${showWx}`}
      data-dusk={progress.toFixed(2)}
      aria-hidden
      style={{ opacity: Math.min(1, progress) * (dark ? 0.55 : 0.88), ['--dusk-stars' as any]: progress >= 0.95 ? 0.8 : 0 }}
    />
  );
};
export default DuskBackdrop;
