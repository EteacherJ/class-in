import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CloudLightning, CloudRain, CloudSnow, Cloud, Sun, Moon, Wind, ImagePlus, LayoutGrid, MapPin, Settings2 } from 'lucide-react';
import { normalizeCityName, REALTIME_WEATHER_EVENT, WEATHER_LOCATION_EVENT } from '../utils/weatherService';
import type { FlipWeatherType } from './FlipClockWidget';
import { MochiBody, useMochiTint, type MochiFace } from './MochiCharacter';

/**
 * 🖼️ 스티커 모드 (깔끔한 리퀴드 글래스)
 *  - 위 가운데: 얇고 큰 디지털 시계 + 날씨 아이콘 · 상태, 그 아래 위치 · 기온 유리 바 (비 오는 날엔 빗줄기)
 *  - 시계 아래: 날씨에 맞춰 옷을 갈아입은 루미가 산책 (누르면 반응)
 *  - 위 왼쪽: 유리 뮤직 카드 (사이드바의 유튜브 플레이어를 그대로 옮겨 와서 재생이 끊기지 않아요)
 *  - 시계 아래 전체: 사용자 스티커만 (위젯 화면으로 돌아가면 위젯 영역 크기에 맞춰 함께 줄어들어요)
 */
const pad = (n: number) => String(n).padStart(2, '0');
const SEC_KEY = 'sticker_clock_seconds';

interface WxInfo { location: string; temp: number | null; status: string; storm: boolean; wind: number; fallback: boolean }
function readWx(): WxInfo {
  try {
    const v = JSON.parse(localStorage.getItem('smart_dashboard_realtime_weather') || 'null');
    const locRaw = JSON.parse(localStorage.getItem('smart_dashboard_user_location') || 'null');
    const status = String(v?.statusText || '');
    // 헤더 날씨와 같은 이름 규칙으로 (직접 지정한 위치 > 감지한 위치)
    const manual = JSON.parse(localStorage.getItem('weather_manual_location') || 'null');
    const name = manual?.locationName || v?.locationName || locRaw?.locationName || '';
    return {
      location: name ? normalizeCityName(String(name)) : '현재 위치',
      temp: typeof v?.temp === 'number' && !v?.isFallback ? Math.round(v.temp) : null,
      status: v?.isFallback ? '' : status,
      storm: /뇌우|천둥|번개|thunder|storm/i.test(status),
      wind: Math.max(Number(v?.windSpeed) || 0, (Number(v?.windGust) || 0) * 0.6),
      fallback: !!v?.isFallback,
    };
  } catch {
    return { location: '현재 위치', temp: null, status: '', storm: false, wind: 0, fallback: true };
  }
}

/** 시계 · 루미가 보여 줄 날씨 장면 */
export type WxScene = 'sun' | 'night' | 'cloud' | 'rain' | 'storm' | 'snow' | 'wind';
const SCENE_LABEL: Record<WxScene, string> = { sun: '맑음', night: '맑은 밤', cloud: '흐림', rain: '비', storm: '뇌우', snow: '눈', wind: '바람' };
const SCENE_LINES: Record<WxScene, string[]> = {
  sun: ['햇살 최고!', '선글라스 착용 완료 😎', '광합성 중~'],
  night: ['하암… 졸려요', '별이 반짝반짝 ✨', '오늘도 수고했어요'],
  cloud: ['구름이 몽글몽글~', '비가 올까요?', '구름 타고 싶다!'],
  rain: ['우산 챙겼어요!', '첨벙첨벙!', '빗소리 좋아요'],
  storm: ['으앗, 천둥!', '무서워요…', '꽉 붙잡아요!'],
  snow: ['눈이다! ⛄', '으슬으슬 추워요', '눈사람 만들래요'],
  wind: ['바람이 세요~!', '날아갈 것 같아요!', '모자 꽉 잡아요!'],
};
const SCENE_GEAR: Record<WxScene, string> = { sun: '🕶️', night: '💤', cloud: '☁️', rain: '☂️', storm: '☂️', snow: '🧣', wind: '🍃' };
const SCENE_FACE: Record<WxScene, MochiFace> = { sun: 'happy', night: 'sleepy', cloud: 'normal', rain: 'happy', storm: 'surprised', snow: 'shy', wind: 'serious' };
const SCENES: WxScene[] = ['sun', 'night', 'cloud', 'rain', 'storm', 'snow', 'wind'];
const rnd = (seed: number) => { const x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); };


/** 배경이 어두운지 (글씨 · 유리 색을 자동으로 맞추기) */
function detectDark(): boolean {
  try {
    const lumOf = (c: string) => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const [r, g, b, a = '1'] = m[1].split(',').map((x) => x.trim());
      if (Number(a) < 0.3) return null;
      return (0.2126 * Number(r) + 0.7152 * Number(g) + 0.0722 * Number(b)) / 255;
    };
    // 1) 화면 바탕색이 확실히 칠해져 있으면 그 밝기로
    for (const el of [document.querySelector('.classin-app-root'), document.getElementById('root'), document.body, document.documentElement]) {
      if (!el) continue;
      const l = lumOf(getComputedStyle(el as Element).backgroundColor);
      if (l !== null) return l < 0.45;
    }
    // 2) 배경 이미지 · 그라데이션이면 앱이 고른 글씨색으로 판단 (밝은 글씨 = 어두운 배경)
    const root = document.querySelector('.classin-app-root');
    if (root) {
      const l = lumOf(getComputedStyle(root).color);
      if (l !== null) return l > 0.6;
    }
  } catch {}
  return document.documentElement.classList.contains('dark');
}

const readWeather = (): FlipWeatherType => {
  try {
    const w = localStorage.getItem('smart_board_weather') || localStorage.getItem('smart_board_flip_clock_weather');
    if (w === 'snow' || w === 'rain' || w === 'sun' || w === 'cloud') return w;
  } catch {}
  return 'sun';
};

type Reaction = null | 'joy' | 'surprise' | 'run';

export const StickerModeOverlay: React.FC<{
  open: boolean;
  onAddImage?: () => void;
  onExit?: () => void;
}> = ({ open, onAddImage, onExit }) => {
  const [mochiTint] = useMochiTint();
  const [now, setNow] = useState(() => new Date());
  const [autoDark, setAutoDark] = useState(false);
  const [tone, setTone] = useState<'auto' | 'light' | 'dark'>(() => {
    try { return (localStorage.getItem('sticker_mode_tone') as any) || 'auto'; } catch { return 'auto'; }
  });
  const dark = tone === 'auto' ? autoDark : tone === 'dark';
  const [headerRect, setHeaderRect] = useState<DOMRect | null>(null);
  const [weather, setWeather] = useState<FlipWeatherType>(readWeather);
  const [wx, setWx] = useState<WxInfo>(readWx);
  const [showSec, setShowSec] = useState<boolean>(() => { try { return localStorage.getItem(SEC_KEY) !== 'off'; } catch { return true; } });
  const [preview, setPreview] = useState<WxScene | null>(null);
  const [prefOpen, setPrefOpen] = useState(false);
  const [reaction, setReaction] = useState<Reaction>(null);
  const reactTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const tick = window.setInterval(() => setNow(new Date()), 1000);
    const measure = () => {
      setAutoDark(detectDark());
      const h = document.querySelector('[data-header-container]') as HTMLElement | null;
      const hr = h ? h.getBoundingClientRect() : null;
      setHeaderRect(hr);
      document.documentElement.style.setProperty('--smo-top', `${hr ? hr.top : 12}px`);
      document.documentElement.style.setProperty('--smo-head-h', `${hr ? hr.height : 150}px`);
    };
    measure();
    const t2 = window.setTimeout(measure, 400);
    window.addEventListener('resize', measure);
    setWeather(readWeather());
    setWx(readWx());
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'smart_dashboard_realtime_weather' || e.key === 'smart_dashboard_user_location') setWx(readWx());
    };
    const onWeather = (e: Event) => {
      const w = (e as CustomEvent).detail?.weather;
      if (w) setWeather(w);
      setWx(readWx());
    };
    const wxPoll = window.setInterval(() => setWx(readWx()), 60_000);
    const onWx = () => setWx(readWx());
    window.addEventListener(REALTIME_WEATHER_EVENT, onWx);
    window.addEventListener(WEATHER_LOCATION_EVENT, onWx);
    window.addEventListener('storage', onStorage);
    window.addEventListener('smart_board_weather_change', onWeather);
    // 🎵 플레이어를 옮겨 둔 자리 불러오기 (화면 비율로 저장)
    try {
      const pos = JSON.parse(localStorage.getItem('sticker_player_pos') || 'null');
      const de = document.documentElement.style;
      if (pos && typeof pos.x === 'number') {
        de.setProperty('--smo-yt-x', `${Math.round(Math.min(Math.max(pos.x, 0), 0.95) * window.innerWidth)}px`);
        de.setProperty('--smo-yt-y', `${Math.round(Math.min(Math.max(pos.y, 0), 0.9) * window.innerHeight)}px`);
      } else {
        de.removeProperty('--smo-yt-x');
        de.removeProperty('--smo-yt-y');
      }
    } catch {}
    return () => {
      clearInterval(tick);
      clearInterval(wxPoll);
      clearTimeout(t2);
      window.removeEventListener('resize', measure);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('smart_board_weather_change', onWeather);
      window.removeEventListener(REALTIME_WEATHER_EVENT, onWx);
      window.removeEventListener(WEATHER_LOCATION_EVENT, onWx);
    };
  }, [open]);

  useEffect(() => {
    document.documentElement.classList.toggle('smo-dark', open && dark);
    return () => document.documentElement.classList.remove('smo-dark');
  }, [open, dark]);

  const react = () => {
    const pick: Reaction[] = ['joy', 'surprise', 'run'];
    const r = pick[Math.floor(Math.random() * pick.length)];
    setReaction(r);
    if (reactTimer.current) clearTimeout(reactTimer.current);
    reactTimer.current = window.setTimeout(() => setReaction(null), 1700);
  };

  if (!open || typeof document === 'undefined') return null;

  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  const top = headerRect ? headerRect.top : 12;
  const headH = headerRect ? headerRect.height : 140;
  const hour = now.getHours();
  const autoScene: WxScene = wx.storm ? 'storm'
    : weather === 'rain' ? 'rain'
    : weather === 'snow' ? 'snow'
    : wx.wind >= 20 ? 'wind'
    : weather === 'cloud' ? 'cloud'
    : (hour >= 19 || hour < 6) ? 'night' : 'sun';
  const scene: WxScene = preview || autoScene;
  const face: MochiFace = reaction === 'joy' ? 'love' : reaction === 'surprise' ? 'surprised' : reaction === 'run' ? 'excited' : SCENE_FACE[scene];
  const WxIcon = scene === 'storm' ? CloudLightning : scene === 'rain' ? CloudRain : scene === 'snow' ? CloudSnow : scene === 'cloud' ? Cloud : scene === 'wind' ? Wind : scene === 'night' ? Moon : Sun;
  const wxLabel = preview ? SCENE_LABEL[scene] : (wx.status ? wx.status.replace(/\s*\(.*\)$/, '').slice(0, 6) : SCENE_LABEL[scene]);
  const lines = SCENE_LINES[scene];
  const idleLine = lines[Math.floor(now.getMinutes() / 2) % lines.length];
  const particleCount = scene === 'rain' ? 34 : scene === 'storm' ? 40 : scene === 'snow' ? 26 : scene === 'wind' ? 9 : scene === 'night' ? 18 : scene === 'sun' ? 10 : 0;

  return createPortal(
    <div className={`smo2 ${dark ? 'is-dark' : 'is-light'} scene-${scene}`} data-sticker-mode-overlay data-scene={scene}>
      {/* ── 위: 디지털 시계 + 날씨 장면 + 루미 산책길 ── */}
      <div className="smo2-top" style={{ top, height: headH }}>
        <div className="smo4-stage">
          {/* 날씨 장면 (시계 뒤에서 움직여요) */}
          <div className={`smo4-scene is-${scene}`} aria-hidden>
            {scene === 'cloud' && (<><span className="smo4-cloud c1" /><span className="smo4-cloud c2" /><span className="smo4-cloud c3" /></>)}
            {scene === 'sun' && <span className="smo4-sunrays" />}
            {scene === 'storm' && <span className="smo4-flash" />}
            {Array.from({ length: particleCount }).map((_, i) => (
              <span
                key={`${scene}-${i}`}
                className="smo4-p"
                style={{
                  left: `${Math.round(rnd(i + 1) * 100)}%`,
                  top: scene === 'wind' || scene === 'night' || scene === 'sun' ? `${Math.round(rnd(i + 7) * 90)}%` : undefined,
                  animationDelay: `${(rnd(i + 3) * (scene === 'wind' ? 4 : 2)).toFixed(2)}s`,
                  animationDuration: `${(scene === 'snow' ? 4 + rnd(i + 5) * 4 : scene === 'wind' ? 2.6 + rnd(i + 5) * 2 : scene === 'night' || scene === 'sun' ? 1.6 + rnd(i + 5) * 2.4 : 0.55 + rnd(i + 5) * 0.4).toFixed(2)}s`,
                  ['--s' as any]: (0.6 + rnd(i + 11) * 0.8).toFixed(2),
                }}
              >
                {scene === 'wind' ? (i % 3 === 0 ? '🍂' : '🍃') : null}
              </span>
            ))}
          </div>

          <div className={`smo4-clock is-${scene}`} data-smo-clock>
            <div className="smo4-time" aria-label={`${hh}시 ${mm}분 ${ss}초`}>
              <span className="smo4-d">{hh}</span>
              <span className="smo4-colon" aria-hidden><i /><i /></span>
              <span className="smo4-d">{mm}</span>
              {showSec && (<>
                <span className="smo4-colon is-sec" aria-hidden><i /><i /></span>
                <span className="smo4-d is-sec">{ss}</span>
              </>)}
              {scene === 'snow' && <span className="smo4-snowcap" aria-hidden />}
            </div>
            <div className="smo4-wx">
              <span className={`smo4-wx-icon is-${scene}`}><WxIcon strokeWidth={1.6} /></span>
              <span className="smo4-wx-label">{wxLabel}</span>
            </div>
            <button type="button" className="smo2-gear smo3-gear" onClick={() => setPrefOpen((v) => !v)} title="시계 설정" data-smo-clock-pref>
              <Settings2 className="w-4 h-4" />
            </button>
            {prefOpen && (
              <div className="smo2-pref" data-smo-pref>
                <div className="smo2-pref-title">스티커 모드 시계</div>
                <button
                  type="button"
                  className={showSec ? 'is-on' : ''}
                  onClick={() => {
                    const v = !showSec;
                    setShowSec(v);
                    try { localStorage.setItem(SEC_KEY, v ? 'on' : 'off'); } catch {}
                  }}
                >
                  {showSec ? '✓ 초 보이기' : '초 보이기'}
                </button>
                <div className="smo2-pref-title" style={{ marginTop: 6 }}>날씨 장면 미리 보기</div>
                <div className="smo2-pref-row is-wrap">
                  <button type="button" className={!preview ? 'is-on' : ''} onClick={() => setPreview(null)}>실제 날씨</button>
                  {SCENES.map((k) => (
                    <button key={k} type="button" className={preview === k ? 'is-on' : ''} onClick={() => setPreview(k)}>{SCENE_LABEL[k]}</button>
                  ))}
                </div>
                <div className="smo2-pref-title" style={{ marginTop: 6 }}>글씨 · 유리 색</div>
                <div className="smo2-pref-row">
                  {(['auto', 'light', 'dark'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={tone === t ? 'is-on' : ''}
                      onClick={() => {
                        setTone(t);
                        try { localStorage.setItem('sticker_mode_tone', t); } catch {}
                      }}
                    >
                      {t === 'auto' ? '자동' : t === 'light' ? '밝은 배경' : '어두운 배경'}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  style={{ marginTop: 6 }}
                  onClick={() => {
                    try { localStorage.removeItem('sticker_player_pos'); } catch {}
                    document.documentElement.style.removeProperty('--smo-yt-x');
                    document.documentElement.style.removeProperty('--smo-yt-y');
                    setPrefOpen(false);
                  }}
                >
                  🎵 뮤직 플레이어 자리 처음으로
                </button>
              </div>
            )}
          </div>

          {/* 위치 · 기온 (깔끔한 글자만) */}
          <div className="smo4-place" data-smo-wxbar>
            <MapPin className="smo4-pin" strokeWidth={1.8} />
            <span>{wx.location}</span>
            <span className="smo4-dot">·</span>
            <span className="smo4-temp">{wx.temp !== null ? `${wx.temp}°C` : '날씨 확인 중'}</span>
          </div>
        </div>

        {/* 루미 산책길 — 날씨마다 다른 동작 */}
        <div className={`smo2-track act-${scene}`}>
          <div className={`smo2-walker act-${scene} ${reaction ? 'is-paused' : ''}`}>
            <button type="button" className={`smo2-lumi act-${scene} react-${reaction || 'none'}`} onClick={react} title="루미를 눌러 보세요!" data-smo-lumi>
              <span className={`smo4-gear gear-${scene}`}>{SCENE_GEAR[scene]}</span>
              <span className="smo4-body"><MochiBody face={face} tint={mochiTint} glow="low" className="w-full h-full" /></span>
              {scene === 'rain' && <span className="smo4-splash" />}
              {scene === 'snow' && <span className="smo4-snowman">⛄</span>}
              {reaction === 'joy' && <span className="smo2-fx">💖</span>}
              {reaction === 'surprise' && <span className="smo2-fx is-bang">!</span>}
              {reaction === 'run' && <span className="smo2-fx is-dust">💨</span>}
              <span className={`smo2-say ${reaction ? '' : 'is-idle'}`} key={reaction || idleLine}>{reaction === 'joy' ? '헤헤, 좋아요!' : reaction === 'surprise' ? '앗, 깜짝이야!' : reaction === 'run' ? '달려 볼까요!' : idleLine}</span>
            </button>
          </div>
        </div>

        <div className="smo2-actions">
          <button type="button" className="smo2-pill" onClick={onAddImage} data-smo-add>
            <ImagePlus className="w-4 h-4" /> 스티커 추가
          </button>
          <button type="button" className="smo2-pill is-primary" onClick={onExit} data-smo-exit>
            <LayoutGrid className="w-4 h-4" /> 위젯 화면
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default StickerModeOverlay;
