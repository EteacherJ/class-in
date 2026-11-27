/**
 * 📍 날씨 위치 설정 (환경설정)
 *  - 자동: 위치 권한(GPS · 와이파이) → 인터넷 주소(IP) 순서로 찾아요. 학교망에서는 다른 동네로 잡힐 수 있어요.
 *  - 직접 지정: 동 · 구 · 시 이름으로 검색해서 고르면, 헤더 날씨 · 스티커 모드 시계가 모두 그 위치를 써요.
 *  - 바로 적용돼요. (환경설정 저장 버튼과 상관없이)
 */
import React, { useEffect, useState } from 'react';
import { MapPin, Search, Navigation, Loader2, Check, RotateCcw } from 'lucide-react';
import {
  getManualLocation,
  setManualLocation,
  searchPlaces,
  normalizeCityName,
  WEATHER_LOCATION_EVENT,
  type PlaceSearchResult,
  type UserLocation,
} from '../utils/weatherService';

const readCurrent = (): UserLocation | null => {
  try {
    const v = JSON.parse(localStorage.getItem('smart_dashboard_user_location') || 'null');
    return v && v.locationName ? v : null;
  } catch {
    return null;
  }
};

export const WeatherLocationSetting: React.FC<{ onShowToast?: (m: string) => void }> = ({ onShowToast }) => {
  const [manual, setManual] = useState<UserLocation | null>(getManualLocation);
  const [current, setCurrent] = useState<UserLocation | null>(readCurrent);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<PlaceSearchResult[] | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    const sync = () => { setManual(getManualLocation()); setTimeout(() => setCurrent(readCurrent()), 1500); };
    window.addEventListener(WEATHER_LOCATION_EVENT, sync);
    return () => window.removeEventListener(WEATHER_LOCATION_EVENT, sync);
  }, []);

  const search = async () => {
    if (!q.trim()) return;
    setBusy(true);
    setErr('');
    try {
      const r = await searchPlaces(q);
      setResults(r);
      if (r.length === 0) setErr('찾는 지역이 없어요. 동 · 구 · 시 이름으로 다시 찾아보세요. (예: 수원, 강남구, 일산동)');
    } catch {
      setErr('지역 검색에 실패했어요. 인터넷 연결을 확인해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const pick = (p: PlaceSearchResult) => {
    const loc: UserLocation = { latitude: p.latitude, longitude: p.longitude, locationName: p.locationName };
    setManualLocation(loc);
    setManual(loc);
    setCurrent(loc);
    setResults(null);
    setQ('');
    onShowToast?.(`📍 날씨 위치를 [${p.locationName}](으)로 정했어요.`);
  };

  const useAuto = () => {
    setManualLocation(null);
    setManual(null);
    onShowToast?.('📍 날씨 위치를 자동으로 찾을게요.');
  };

  const shown = manual || current;
  return (
    <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/70 text-xs space-y-2" data-weather-location-setting>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-sky-500" />
          <span>날씨 위치</span>
          <span className="text-[10px] text-slate-400 font-normal">(헤더 날씨 · 스티커 모드 시계)</span>
        </span>
        <div className="flex items-center bg-white dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <button type="button" onClick={useAuto} aria-pressed={!manual} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition ${!manual ? 'bg-sky-500 text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
            <Navigation className="w-3 h-3" /> 자동
          </button>
          <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold ${manual ? 'bg-sky-500 text-white' : 'text-slate-400'}`}>
            <MapPin className="w-3 h-3" /> 직접 지정
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
        <span className="text-[11px] text-slate-400 shrink-0">지금 위치</span>
        <span className="font-black text-slate-800 dark:text-slate-100 truncate">{shown ? normalizeCityName(shown.locationName) : '아직 찾는 중이에요'}</span>
        {manual ? (
          <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-300 shrink-0">직접 지정</span>
        ) : (
          <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-500 shrink-0">자동</span>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); search(); } }}
          placeholder="위치가 다르게 잡히면 동네 이름으로 찾아 고르세요 (예: 수원, 일산동)"
          className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-sky-400 font-medium"
        />
        <button type="button" onClick={search} disabled={busy || !q.trim()} className="flex items-center gap-1 px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-black shrink-0">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          <span>찾기</span>
        </button>
      </div>
      {err && <p className="text-[11px] text-rose-500">{err}</p>}
      {results && results.length > 0 && (
        <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
          {results.map((r, i) => (
            <button key={`${r.latitude},${r.longitude},${i}`} type="button" onClick={() => pick(r)} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-sky-50 dark:hover:bg-sky-500/10">
              <MapPin className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span className="font-bold text-slate-800 dark:text-slate-100">{r.locationName}</span>
              <span className="text-[10px] text-slate-400 truncate">{r.detail}</span>
              <Check className="w-3.5 h-3.5 text-sky-500 ml-auto opacity-0" />
            </button>
          ))}
        </div>
      )}
      {manual && (
        <button type="button" onClick={useAuto} className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-slate-600">
          <RotateCcw className="w-3 h-3" /> 직접 지정 해제하고 자동으로 찾기
        </button>
      )}
    </div>
  );
};

export default WeatherLocationSetting;
