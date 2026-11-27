import React, { useState, useEffect, useRef } from 'react';
import {
  Minimize2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Clock,
  Calendar,
  Shield,
  Sparkles,
  Key,
  AlertCircle,
  CheckCircle,
  Timer,
  Edit3,
  Check,
  RotateCcw,
} from 'lucide-react';
import { playSelectedChime, isGlobalSoundEnabled, setGlobalSoundEnabled } from '../utils/audio';
import { PastelSkyBackground } from './PastelSkyBackground';
import { OwnerBadge } from './OwnerBadge';
import { LumiOrbCharacter, LumiExpression } from './TTiAiAssistant';
import {
  verifyAdminPin,
  verifyPinOrRecovery,
  setAdminPin,
  isUsingDefaultPin,
  formatLockout,
} from '../utils/pinSecurity';

/**
 * 🎨 [Class in: 하이엔드 다크 글로시(Glossy Glassmorphism) 화면 잠금 컴포넌트]
 * 
 * - 깊은 심해 다크 네이비/블랙 베이스와 GPU 가속 메탈릭 곡선 오로라 웨이브
 * - 좌측 상단 & 우측 하단 시그니처 챔퍼(Cutout) 브라켓 액센트 글래스 카드
 * - 실시간 대형 디지털 시계 (HH:mm:ss 네온 아쿠아 블루 발광) 및 날짜
 * - 🤖 AI 캐릭터(루미) 중앙 배치 및 알라딘 램프풍 5종 반응형 말풍선 인터랙션
 * - 초슬림 다크 글래스 PIN/비밀번호 입력 필드 (기본 PIN: '0000', 변경 지원)
 * - 오류 시 흔들림(Shake) 애니메이션 & 붉은 네온 피드백
 * - 🚀 아쿠아 블루 -> 바이올렛 둥근 캡슐형 메인 잠금 해제 버튼
 * - 둥근 캡슐형 칩(Chips) UI (PIN 변경 / 긴급 5분·10분 타이머)
 */

interface GlossyLockScreenProps {
  isLocked: boolean;
  onUnlock: () => void;
  onShowToast?: (msg: string) => void;
  initialPin?: string;
  /** 🚪 잠금 상태 그대로 대시보드 접기 (바탕화면 루미 문으로) */
  onCollapse?: () => void;
}

// 🤖 루미 클릭 시 반응하는 5가지 인터랙션 대사
const LUMI_LOCK_QUOTES = [
  '안녕하세요? 😊',
  'HELLO!!! 👋',
  '잠시 자리를 비웠어요. 💤',
  'PIN번호 입력하세요. 🔑',
  '오늘 기분은 어떠신가요? 💬',
];

const DAYS_KOR = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

export const GlossyLockScreen: React.FC<GlossyLockScreenProps> = ({
  isLocked,
  onUnlock,
  onShowToast,
  initialPin = '0000',
  onCollapse,
}) => {
  // 1. PIN 상태 (원문 미보관 · 해시 검증은 utils/pinSecurity.ts 담당)
  const [usingDefaultPin, setUsingDefaultPin] = useState<boolean>(() => isUsingDefaultPin());
  const [issuedRecoveryCode, setIssuedRecoveryCode] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  void initialPin;

  // 🤖 2. 루미 AI 캐릭터 및 반응형 말풍선 상태
  const [lumiStatus, setLumiStatus] = useState<'idle' | 'wrong' | 'success'>('idle');
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isLumiJumping, setIsLumiJumping] = useState(false);
  const [lumiExpression, setLumiExpression] = useState<LumiExpression>('wink');
  const [isBubblePopping, setIsBubblePopping] = useState(false);

  // 3. 인풋 및 UI 상태
  const [inputPin, setInputPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorShake, setErrorShake] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  // 4. PIN 번호 변경 패널 모드
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [oldPinInput, setOldPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [pinChangeError, setPinChangeError] = useState('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);

  // 5. 전역 사운드 토글 상태
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => isGlobalSoundEnabled());

  // 6. 실시간 디지털 시계 & 날짜
  const [timeStr, setTimeStr] = useState('00:00:00');
  const [dateStr, setDateStr] = useState('');

  // 7. 긴급 교실 타이머 (5분/10분)
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // 실시간 시계 갱신 (1초 단위)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setTimeStr(`${h}:${m}:${s}`);

      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const date = now.getDate();
      const day = DAYS_KOR[now.getDay()];
      setDateStr(`${year}년 ${month}월 ${date}일 (${day})`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 화면 잠금 시 자동 포커스
  useEffect(() => {
    if (isLocked) {
      setInputPin('');
      setErrorMessage('');
      setErrorShake(false);
      setIsUnlocking(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isLocked]);

  // 긴급 타이머 카운트다운
  useEffect(() => {
    if (timerSecondsLeft === null) return;

    if (timerSecondsLeft <= 0) {
      playSelectedChime('school_4tone');
      setTimerSecondsLeft(null);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setTimerSecondsLeft((prev) => {
        if (prev === null || prev <= 1) {
          playSelectedChime('school_4tone');
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerSecondsLeft]);

  // 🤖 루미 캐릭터/말풍선 클릭 시 반응 인터랙션 (대사 전환, 바운스 점프, 윙크 표정, 팝 사운드)
  const handleLumiInteraction = () => {
    setQuoteIndex((prev) => (prev + 1) % LUMI_LOCK_QUOTES.length);
    setIsLumiJumping(true);
    setLumiExpression('wink');
    setIsBubblePopping(true);

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.13);
      }
    } catch {}

    setTimeout(() => {
      setIsLumiJumping(false);
      setLumiExpression('happy');
      setIsBubblePopping(false);
    }, 450);
  };

  // 사운드 토글
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setGlobalSoundEnabled(next);
    if (next) {
      playSelectedChime('bell_ding');
    }
  };

  // 타이머 시작/리셋
  const handleStartTimer = (minutes: number) => {
    if (timerSecondsLeft !== null) {
      setTimerSecondsLeft(null);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    } else {
      setTimerSecondsLeft(minutes * 60);
      playSelectedChime('bell_ding');
    }
  };

  // PIN 확인 및 잠금 해제 제출 (마스터 비밀번호 제거 · 해시 검증 · 연속 오입력 제한)
  const handleUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isVerifying) return;
    setIsVerifying(true);
    const result = await verifyAdminPin(inputPin);
    setIsVerifying(false);
    const isValid = result.ok;

    if (isValid) {
      setLumiStatus('success');
      setLumiExpression('happy');
      setIsLumiJumping(true);
      setIsUnlocking(true);
      playSelectedChime('bell_ding');
      console.log('🟢 [Class in] 화면 잠금 해제 성공');
      
      // 상태 클리어
      try {
        localStorage.removeItem('ttime_is_locked');
        localStorage.removeItem('class_dashboard_is_screen_locked');
      } catch {}

      // 🌑 잠금 화면이 올라가는 동안 뒤 화면은 깜깜하게 (해제되면 밝아지며 나타나요)
      try {
        document.querySelectorAll('.ci-unlock-veil').forEach((v) => v.remove());
        const veil = document.createElement('div');
        veil.className = 'ci-unlock-veil';
        document.body.appendChild(veil);
        window.setTimeout(() => veil.remove(), 4500);
      } catch {}

      setTimeout(() => {
        onUnlock();
        if (onShowToast) onShowToast('🔓 화면 잠금이 해제되었습니다.');
        setIsUnlocking(false);
      }, 550);
    } else {
      console.log('🔴 [Class in] 잠금 비밀번호 불일치');
      playSelectedChime('horn');
      setLumiStatus('wrong');
      setLumiExpression('serious');
      setErrorShake(true);
      setErrorMessage(
        result.lockedForMs > 0
          ? `여러 번 틀려서 ${formatLockout(result.lockedForMs)} 동안 입력할 수 없어요.`
          : `PIN을 다시 확인해 주세요! (남은 기회 ${result.remainingTries}회)`
      );
      setTimeout(() => setErrorShake(false), 600);
      setTimeout(() => {
        setLumiStatus('idle');
        setLumiExpression('wink');
      }, 2800);
      inputRef.current?.select();
    }
  };

  // PIN 변경 처리 (현재 PIN 또는 복구 코드로 본인 확인 → 새 PIN 해시 저장 → 복구 코드 1회 발급)
  const handleSaveNewPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeError('');

    if (!(await verifyPinOrRecovery(oldPinInput))) {
      setPinChangeError('현재 PIN(또는 복구 코드)이 일치하지 않습니다.');
      playSelectedChime('horn');
      return;
    }

    try {
      const recoveryCode = await setAdminPin(newPinInput);
      setIssuedRecoveryCode(recoveryCode);
      setUsingDefaultPin(false);
      setPinChangeSuccess(true);
      setOldPinInput('');
      setNewPinInput('');
      playSelectedChime('bell_ding');
      if (onShowToast) onShowToast('🔑 잠금 PIN 번호가 변경되었습니다. 복구 코드를 꼭 따로 적어 두세요.');
    } catch (err: any) {
      setPinChangeError(err?.message || '저장 중 오류가 발생했습니다.');
    }
  };

  if (!isLocked) return null;

  // 타이머 분:초 포맷팅
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div
      data-lock-screen
      className={`lg-lockscreen fixed inset-0 z-[999999] select-none flex items-center justify-center p-4 sm:p-6 ${
        isUnlocking ? 'lg-unlock-out pointer-events-none' : ''
      }`}
      style={{
        backgroundColor: '#f3ecff',
        fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* 🌈 1. 밝고 화사한 움직이는 배경 (파스텔 하늘 흐름 · 떠다니는 빛 · 비눗방울 · 반짝이 · 물결) */}
      <PastelSkyBackground />

      {/* 🐯 만든 사람 표시 (왼쪽 아래) */}
      <OwnerBadge tone="light" size="md" className="lg-lock-owner" />
      {/* 🚪 화면 접기 (오른쪽 아래): 잠금은 그대로 두고 바탕화면의 작은 루미 문으로 접어요 (펼치면 다시 잠금 화면) */}
      {onCollapse && (
        <button type="button" className="lg-lock-collapse is-corner" onClick={onCollapse} title="화면 접기 · 잠금은 그대로예요 (루미 문을 누르면 다시 펼쳐져요)" aria-label="화면 접기" data-lock-collapse>
          <Minimize2 className="w-4 h-4" />
          <span>화면 접기</span>
        </button>
      )}


      {/* 🔘 2. 상단 좌/우 플로팅 유틸리티 (원형 글래스 버튼) */}
      <div className="absolute top-5 left-6 right-6 flex items-center justify-between pointer-events-auto z-20">
        {/* 좌측: Class in 학급 브랜드 뱃지 */}
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-cyan-500/20 shadow-lg">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#38BDF8]" />
          <span className="text-xs font-bold tracking-wider text-slate-300">
            CLASS IN <span className="text-cyan-400 font-extrabold">SECURE</span>
          </span>
        </div>

        {/* 우측: 원형 글래스 버튼 그룹 (사운드 토글 + 퀵 단축키 안내) */}
        <div className="flex items-center gap-2">
          {/* 사운드 토글 원형 글래스 버튼 */}
          <button
            type="button"
            onClick={handleToggleSound}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 transition-all cursor-pointer active:scale-90 hover:text-indigo-600 shadow-lg"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.6)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.9)',
              boxShadow: '0 4px 14px rgba(124, 108, 255, 0.18)',
            }}
            title={soundEnabled ? '효과음 켜짐 (클릭 시 음소거)' : '효과음 음소거됨 (클릭 시 켜기)'}
          >
            {soundEnabled ? <Volume2 className="w-4.5 h-4.5 text-indigo-600" /> : <VolumeX className="w-4.5 h-4.5 text-slate-500" />}
          </button>

          {/* 단축키 안내 뱃지 */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.6)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.9)',
              boxShadow: '0 4px 14px rgba(124, 108, 255, 0.15)',
            }}
          >
            <span className="text-[11px] text-indigo-600 font-mono font-bold">Alt + L</span>
            <span className="text-slate-600 text-[11px]">로 언제든 잠금</span>
          </div>
        </div>
      </div>

      {/* 💎 3. 메인 글로시 유리 카드 컨테이너 (Glossy Frosted Card) */}
      <div
        className={`relative w-full max-w-[560px] rounded-3xl z-10 transition-all duration-300 ${
          errorShake ? 'animate-[shake_0.5s_cubic-bezier(0.36,0.07,0.19,0.97)_both]' : ''
        }`}
        style={{
          background: 'linear-gradient(150deg, rgba(76, 64, 180, 0.62) 0%, rgba(49, 46, 129, 0.7) 55%, rgba(30, 41, 99, 0.74) 100%)',
          backdropFilter: 'blur(24px) saturate(160%)',
          border: '1px solid rgba(255, 255, 255, 0.55)',
          boxShadow: '0 30px 70px rgba(91, 70, 190, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.55)',
        }}
      >
        {/* ✨ 시그니처 모서리 브라켓: 카드의 좌측 상단(Top-Left) 네온 엣지 액센트 */}
        <div
          className="absolute -top-1.5 -left-1.5 w-7 h-7 pointer-events-none z-20"
          style={{
            borderTop: '2.5px solid #38BDF8',
            borderLeft: '2.5px solid #38BDF8',
            borderTopLeftRadius: '10px',
            filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.9))',
          }}
        >
          <div className="w-2.5 h-[1.5px] bg-cyan-200 -rotate-45 origin-top-left ml-0.5 mt-0.5 shadow-[0_0_6px_#38BDF8]" />
        </div>

        {/* ✨ 시그니처 모서리 브라켓: 카드의 우측 하단(Bottom-Right) 네온 엣지 액센트 */}
        <div
          className="absolute -bottom-1.5 -right-1.5 w-7 h-7 pointer-events-none z-20"
          style={{
            borderBottom: '2.5px solid #38BDF8',
            borderRight: '2.5px solid #38BDF8',
            borderBottomRightRadius: '10px',
            filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.9))',
          }}
        >
          <div className="w-2.5 h-[1.5px] bg-cyan-200 -rotate-45 origin-bottom-right float-right mr-0.5 mb-0.5 shadow-[0_0_6px_#38BDF8]" />
        </div>

        {/* 🌟 카드 내부 콘텐츠 */}
        <div className="p-7 sm:p-9 flex flex-col items-center text-center">
          
          {/* ⏰ A. 실시간 대형 디지털 시계 & 날짜 (네온 아쿠아 블루 발광 효과) */}
          <div className="w-full flex flex-col items-center mb-5">
            {/* 날짜 라벨 */}
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-cyan-200/90 mb-1 tracking-wide">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>{dateStr || '2026년 3학년 1반'}</span>
            </div>

            {/* 디지털 시계 (HH:mm:ss 네온 아쿠아 블루 발광 효과: text-shadow) */}
            <div
              className="text-5xl sm:text-6xl font-black tracking-tight font-mono select-none my-1"
              style={{
                background: 'linear-gradient(180deg, #FFFFFF 0%, #E0F2FE 40%, #38BDF8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 0 20px rgba(56, 189, 248, 0.65), 0 0 40px rgba(56, 189, 248, 0.35)',
                filter: 'drop-shadow(0 0 20px rgba(56, 189, 248, 0.65))',
                letterSpacing: '2px',
              }}
            >
              {timeStr}
            </div>

            {/* 메인 타이틀: Class in Locked */}
            <div className="flex items-center gap-2 mt-0.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span
                className="text-xs sm:text-sm font-bold uppercase tracking-widest text-cyan-300 drop-shadow-[0_0_10px_rgba(56,189,248,0.7)]"
              >
                Class in Locked
              </span>
            </div>
          </div>

          {/* 🤖 B. AI 캐릭터(루미) 배치 및 알라딘 램프풍 5종 반응형 말풍선 */}
          <div className="w-full flex flex-col items-center mb-6 relative select-none">
            {/* 알라딘 램프풍 반응형 말풍선 */}
            <div
              onClick={handleLumiInteraction}
              className={`relative px-5 py-2.5 rounded-2xl border backdrop-blur-xl shadow-lg font-extrabold text-sm sm:text-base cursor-pointer transition-all duration-300 flex items-center gap-2 active:scale-95 ${
                lumiStatus === 'wrong'
                  ? 'bg-rose-950/80 border-rose-400/60 text-rose-200 shadow-[0_0_25px_rgba(244,63,94,0.5)] animate-shake'
                  : lumiStatus === 'success'
                  ? 'bg-emerald-950/80 border-emerald-400/60 text-emerald-200 shadow-[0_0_25px_rgba(16,185,129,0.5)] scale-105'
                  : isBubblePopping
                  ? 'bg-slate-900/90 border-cyan-300 text-white shadow-[0_0_30px_rgba(56,189,248,0.6)] scale-105'
                  : 'bg-slate-900/85 border-cyan-400/40 text-cyan-100 shadow-[0_8px_24px_rgba(56,189,248,0.3)] hover:border-cyan-300 scale-100'
              }`}
              title="클릭 시 루미의 대사가 바뀝니다!"
            >
              <span className="text-base animate-pulse">
                {lumiStatus === 'wrong' ? '🥺' : lumiStatus === 'success' ? '✨' : '🔑'}
              </span>
              <span>
                {lumiStatus === 'wrong'
                  ? '비밀번호를 다시 확인해 주세요!'
                  : lumiStatus === 'success'
                  ? '어서 오세요, 선생님! ✨'
                  : LUMI_LOCK_QUOTES[quoteIndex]}
              </span>
              {lumiStatus === 'idle' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-normal">
                  터치!
                </span>
              )}
            </div>

            {/* 피어오르는 곡선 꼬리 (알라딘 램프 연기 곡선) */}
            <div className="relative -mt-0.5 mb-1 flex justify-center pointer-events-none">
              <svg
                className={`w-8 h-4 fill-current transition-colors drop-shadow-[0_0_6px_rgba(56,189,248,0.6)] ${
                  lumiStatus === 'wrong'
                    ? 'text-rose-400/60'
                    : lumiStatus === 'success'
                    ? 'text-emerald-400/60'
                    : 'text-cyan-400/60'
                }`}
                viewBox="0 0 32 16"
              >
                <path d="M16 16 C 14 9, 7 5, 2 0 L 30 0 C 25 5, 18 9, 16 16 Z" />
              </svg>
            </div>

            {/* 3D 네온 글로우 루미 캐릭터 (클릭 시 바운스 점프 & 윙크/웨이브 모션) */}
            <div
              onClick={handleLumiInteraction}
              className={`cursor-pointer transition-transform duration-300 ${
                isLumiJumping ? '-translate-y-2.5 scale-110' : 'translate-y-0 scale-100 hover:scale-105'
              }`}
              title="루미를 터치하면 귀엽게 반응합니다!"
            >
              <LumiOrbCharacter
                size="md"
                colorTheme="cyber-cyan"
                glowIntensity="high"
                expression={lumiStatus === 'wrong' ? 'serious' : lumiStatus === 'success' ? 'happy' : lumiExpression}
                motion={lumiStatus === 'wrong' ? 'bounce' : lumiStatus === 'success' ? 'celebrate' : isLumiJumping ? 'bounce' : 'wave'}
              />
            </div>
          </div>

          {/* ⏳ C. 긴급 교실 타이머 미니 바 (동작 중일 때 강조 표시) */}
          {timerSecondsLeft !== null && (
            <div className="w-full mb-4 px-4 py-2.5 rounded-full bg-cyan-950/60 border border-cyan-400/40 flex items-center justify-between shadow-[0_0_15px_rgba(56,189,248,0.25)] animate-pulse">
              <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold">
                <Timer className="w-4 h-4 text-cyan-400 animate-spin" />
                <span>자습/쉬는 시간 타이머 작동 중</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-black text-cyan-200">
                  {formatTimer(timerSecondsLeft)}
                </span>
                <button
                  type="button"
                  onClick={() => setTimerSecondsLeft(null)}
                  className="text-xs text-slate-400 hover:text-red-400 transition-colors ml-1 cursor-pointer"
                  title="타이머 정지"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {/* 🔐 D. 보안 잠금 해제 (초슬림 다크 글래스 PIN 인풋 & 아쿠아-바이올렛 둥근 캡슐형 버튼) */}
          <form onSubmit={handleUnlock} className="w-full space-y-3.5">
            {/* 다크 글래스 비밀번호 입력 필드 */}
            <div className="relative w-full">
              {/* 좌측 자물쇠 아이콘 */}
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none">
                <Lock className="w-4.5 h-4.5" />
              </div>

              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={inputPin}
                onChange={(e) => {
                  setInputPin(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder={usingDefaultPin ? 'PIN 번호 입력 (초기 PIN: 0000 · 변경 권장)' : 'PIN 번호 입력'}
                maxLength={16}
                className={`w-full pl-11 pr-11 py-3.5 rounded-2xl text-center sm:text-left text-sm sm:text-base font-mono tracking-widest text-white placeholder:text-slate-500 placeholder:tracking-normal placeholder:font-sans placeholder:text-xs sm:placeholder:text-sm focus:outline-none transition-all duration-200 ${
                  errorMessage
                    ? 'border-red-500 ring-4 ring-red-500/30 bg-red-950/20'
                    : 'border border-cyan-500/25 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/25 bg-slate-900/80'
                }`}
                style={{
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  boxShadow: errorMessage
                    ? '0 0 20px rgba(239, 68, 68, 0.4), inset 0 1px 2px rgba(0,0,0,0.5)'
                    : 'inset 0 1px 3px rgba(0, 0, 0, 0.5), 0 4px 12px rgba(0, 0, 0, 0.2)',
                }}
              />

              {/* 우측 비밀번호 보기/숨기기 토글 눈 아이콘 */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer p-1"
                title={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>

            {/* 오류 메시지 피드백 */}
            {errorMessage && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-red-400 font-semibold animate-pulse">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 🚀 아쿠아 블루 -> 바이올렛 입체 둥근 캡슐형 ‘잠금 해제 (Unlock)’ 버튼 */}
            <button
              type="submit"
              className="relative overflow-hidden w-full py-3.5 rounded-full font-black text-sm sm:text-base tracking-wide flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 active:scale-[0.98] hover:scale-[1.02] bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-500 text-slate-950 shadow-[0_10px_25px_rgba(56,189,248,0.4)] hover:shadow-[0_14px_35px_rgba(99,102,241,0.55)] border border-white/40"
            >
              {/* 상단 미세 하이라이트 광택 오버레이 */}
              <span className="pointer-events-none absolute inset-x-4 top-1 h-2 rounded-full bg-white/40 blur-[1px]" />
              <Unlock className="w-4.5 h-4.5 text-slate-950 stroke-[2.5]" />
              <span>잠금 해제 (Unlock) →</span>
            </button>
          </form>

          {/* 🛠️ E. 하단 보조 메뉴 미니 칩 (PIN 변경 / 긴급 타이머) - 둥근 캡슐형 칩 UI */}
          <div className="w-full mt-5 pt-4 border-t border-cyan-500/15 flex items-center justify-between flex-wrap gap-2">
            {/* [PIN 번호 변경] 모달 열기 캡슐 칩 */}
            <button
              type="button"
              onClick={() => {
                setIsChangingPin(!isChangingPin);
                setPinChangeError('');
                setPinChangeSuccess(false);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-300 hover:text-cyan-300 hover:border-cyan-400/40 bg-white/5 border border-white/10 backdrop-blur-md transition-all cursor-pointer active:scale-95 shadow-sm"
            >
              <Key className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isChangingPin ? 'PIN 변경 닫기' : 'PIN 번호 변경'}</span>
            </button>

            {/* [긴급교실타이머 (5분/10분)] 미니 캡슐 칩 그룹 */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">긴급 타이머:</span>
              <button
                type="button"
                onClick={() => handleStartTimer(5)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm ${
                  timerSecondsLeft !== null && timerSecondsLeft <= 300
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_#38BDF8] border border-cyan-400'
                    : 'bg-slate-800/80 text-cyan-300 hover:bg-slate-700/80 border border-cyan-500/30'
                }`}
                title="5분 자습/쉬는 시간 타이머 시작"
              >
                5분
              </button>
              <button
                type="button"
                onClick={() => handleStartTimer(10)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm ${
                  timerSecondsLeft !== null && timerSecondsLeft > 300
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_#38BDF8] border border-cyan-400'
                    : 'bg-slate-800/80 text-cyan-300 hover:bg-slate-700/80 border border-cyan-500/30'
                }`}
                title="10분 자습/쉬는 시간 타이머 시작"
              >
                10분
              </button>
            </div>
          </div>

          {/* 🔑 F. 인라인 PIN 번호 변경 패널 */}
          {isChangingPin && (
            <div className="w-full mt-4 p-4 rounded-2xl bg-slate-950/70 border border-cyan-500/30 text-left animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300 mb-3">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>새로운 4자리 PIN 설정</span>
              </div>
              <form onSubmit={handleSaveNewPin} className="space-y-2.5">
                <input
                  type="password"
                  value={oldPinInput}
                  onChange={(e) => setOldPinInput(e.target.value)}
                  placeholder="현재 PIN 또는 복구 코드"
                  maxLength={16}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                />
                <input
                  type="password"
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  placeholder="새 4자리 PIN 번호 입력"
                  maxLength={16}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                />
                {pinChangeError && (
                  <p className="text-[11px] text-red-400 font-semibold">{pinChangeError}</p>
                )}
                {pinChangeSuccess && (
                  <div className="text-[11px] text-emerald-300 font-semibold space-y-1.5 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                    <p className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> PIN 번호가 변경되었습니다!
                    </p>
                    {issuedRecoveryCode && (
                      <>
                        <p className="text-slate-300 font-normal">PIN을 잊었을 때 쓰는 복구 코드예요. 지금만 보이니 꼭 적어 두세요.</p>
                        <p className="font-mono text-base tracking-[0.25em] text-white select-all text-center py-1">{issuedRecoveryCode}</p>
                      </>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPin(false);
                      setPinChangeSuccess(false);
                      setIssuedRecoveryCode('');
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                  >
                    {pinChangeSuccess ? '닫기' : '취소'}
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-sm"
                  >
                    PIN 저장
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>

      {/* 💫 Shake 애니메이션용 인라인 키프레임 스타일 */}
      <style>{`
        @keyframes shake {
          10%, 90% { transform: translate3d(-2px, 0, 0); }
          20%, 80% { transform: translate3d(4px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-6px, 0, 0); }
          40%, 60% { transform: translate3d(6px, 0, 0); }
        }
      `}</style>
    </div>
  );
};
