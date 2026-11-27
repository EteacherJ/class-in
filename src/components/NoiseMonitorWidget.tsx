import { useEffect, useRef } from 'react';
import { Volume2, VolumeX, Mic, Maximize2 } from 'lucide-react';
import { useNoiseMonitor } from '../utils/mic';
import { TigerStatusCharacter, TigerStatus } from './TigerStatusCharacter';

interface NoiseMonitorWidgetProps {
  onShowToast: (msg: string) => void;
  onOpenStudentDisplay?: (tab: 'noise' | 'timer' | 'quiz' | 'seats') => void;
}

/**
 * ============================================================================
 * 🐯 [교실 소음 모니터 위젯] (NoiseMonitorWidget)
 * ============================================================================
 * 1. 실시간 마이크 데시벨(dB)에 반응하는 호랑이 캐릭터 3단계 동적 인터랙션:
 *    - 조용함 (~45dB): 'comfort' 평온한 수면 표정 (에메랄드 그린)
 *    - 적당함 (46~65dB): 'worried' 실눈 뜨고 걱정하는 주의 표정 (앰버 옐로우)
 *    - 소란스러움 (66dB+): 'angry' 깜짝 기상 & 포효하는 경고 표정 (크림슨 레드)
 * 2. 상단 헤더에 직관적인 TigerStatusCharacter 감정 배지 노출
 * 3. 중앙에 '잠자는 아기 호랑이 (호치)' 풀사이즈 3단계 애니메이션 SVG 카드 렌더링
 * 4. 마이크 비활성화 또는 언마운트 시 오디오 트랙 즉시 완전 해제
 */
export function NoiseMonitorWidget({ onShowToast, onOpenStudentDisplay }: NoiseMonitorWidgetProps) {
  const {
    decibel,
    isListening,
    hasPermission,
    startListening,
    stopListening,
  } = useNoiseMonitor(50, 66);

  // 🐯 [요구사항 1] 실시간 측정 데시벨 기반 호랑이 3단계 감정 상태 도출
  // - 조용함 (~45dB 이하): 'sleep' (편안하게 자거나 웃는 아기 호랑이)
  // - 주의 구간 (46~65dB): 'worried' (실눈 뜨고 주의를 살피는 표정)
  // - 소란/경고 (66dB 초과): 'warning' (눈을 번쩍 뜨고 깜짝 놀라며 경고하는 표정)
  const tigerStatus: TigerStatus =
    decibel <= 45 ? 'sleep' : decibel <= 65 ? 'worried' : 'warning';

  // 실시간 측정 데시벨을 보조 모니터(DualMonitorDisplayView)로 브로드캐스트 동기화 (100ms 쓰로틀링 적용으로 렉 원천 차단)
  const lastBroadcastRef = useRef<number>(0);
  useEffect(() => {
    const now = Date.now();
    if (now - lastBroadcastRef.current < 100) return;
    lastBroadcastRef.current = now;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel('class_display_sync_channel');
        channel.postMessage({ decibel });
        channel.close();
      } catch {}
    }
  }, [decibel]);

  // 컴포넌트 언마운트 시 마이크 리소스 즉시 해제
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  const handleToggleMic = async () => {
    if (isListening) {
      stopListening();
      onShowToast('소음 측정이 정지되었습니다.');
    } else {
      await startListening();
      if (hasPermission === false) {
        onShowToast('마이크 권한 시뮬레이션 모드로 소음 측정이 시작되었습니다.');
      } else {
        onShowToast('🎙️ 아기 호랑이 소음 측정이 활성화되었습니다.');
      }
    }
  };

  const handleTigerClick = () => {
    const messages: Record<string, string> = {
      comfort: '🐯 호치: "쉿! 교실이 조용해서 쿨쿨 잠이 잘 와요~" 🌿',
      sleep: '🐯 호치: "쉿! 교실이 조용해서 쿨쿨 잠이 잘 와요~" 🌿',
      calm: '🐯 호치: "쉿! 교실이 조용해서 쿨쿨 잠이 잘 와요~" 🌿',
      worried: '🐯 호치: "부스럭부스럭... 조금씩 시끄러워지고 있어요! 조심해 주세요." ⚠️',
      angry: '🐯 호치: "어흥! 교실이 너무 시끄러워서 잠에서 깼어요! 목소리를 낮춰주세요!" 🚨',
      warning: '🐯 호치: "어흥! 교실이 너무 시끄러워서 잠에서 깼어요! 목소리를 낮춰주세요!" 🚨',
    };
    onShowToast(messages[tigerStatus] || messages.comfort);
  };

  return (
    <div className="w-full h-full p-4 sm:p-5 flex flex-col justify-between relative group select-none overflow-hidden">
      {/* 1. Header: 타이틀, 실시간 반응 호랑이 캐릭터, 컨트롤 버튼 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm shadow-2xs">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>소음 측정</span>
              <span className="text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-extrabold px-1.5 py-0.2 rounded-md">
                호치 테마
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">아기 호랑이를 깨우지 말아주세요</p>
          </div>
        </div>

        {/* 우측 도구: 호랑이 상태 배지, 보조모니터 송출, 마이크 토글 */}
        <div className="flex items-center gap-2">
          {/* 🐯 [요구사항 1] 소음 데시벨에 따라 3단계로 반응하는 호랑이 캐릭터 */}
          <div className="border-r border-slate-200 dark:border-slate-700 pr-2">
            <TigerStatusCharacter
              status={tigerStatus}
              size="sm"
              showLabel={true}
              onClick={handleTigerClick}
              className="hover:scale-105 transition cursor-pointer"
            />
          </div>

          {onOpenStudentDisplay && (
            <button
              onClick={() => onOpenStudentDisplay('noise')}
              className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition cursor-pointer"
              title="학생 보조 모니터로 크게 송출"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleToggleMic}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 ${
              isListening
                ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:border-rose-800'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none'
            }`}
          >
            {isListening ? (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span>중지</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>시작</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. [요구사항 1-다] 중앙: 상태 호랑이 캐릭터 + 음성 이퀄라이저 바 + 데시벨(dB) + 소음 강도 알림 배지 */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center my-2 gap-2.5">
        {/* 상단 호랑이 캐릭터와 상태를 알리는 세련된 카드 */}
        <div className="flex items-center gap-3 bg-white/60 dark:bg-slate-900/60 p-2.5 px-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <TigerStatusCharacter
            status={tigerStatus}
            size="md"
            showLabel={false}
            onClick={handleTigerClick}
            className="hover:scale-105 transition cursor-pointer"
          />
          <div className="text-left">
            <div className="flex items-baseline gap-1">
              <span
                className={`text-3xl sm:text-4xl font-black tracking-tight font-mono ${
                  decibel <= 45
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : decibel <= 65
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-rose-600 dark:text-rose-500 animate-bounce'
                }`}
              >
                {isListening ? Math.round(decibel) : '--'}
              </span>
              <span className="text-xs font-bold text-slate-400">dB</span>
            </div>
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
              {decibel <= 45 ? '안정 수치' : decibel <= 65 ? '주의 구간' : '소음 경고'}
            </div>
          </div>
        </div>

        {/* Dynamic Audio Visualizer Bars (다이내믹 이퀄라이저 파형) */}
        <div className="flex items-end justify-center gap-1.5 h-12 w-full max-w-[240px] px-2 py-1 bg-slate-50/70 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800/80">
          {Array.from({ length: 18 }).map((_, i) => {
            const normalizedDb = Math.min(100, Math.max(10, decibel));
            const waveFactor = Math.sin((i / 18) * Math.PI) * 0.85 + 0.15;
            const barHeightPct = isListening ? Math.min(100, Math.max(14, normalizedDb * waveFactor * 1.2)) : 10;
            const barColor =
              decibel <= 45
                ? 'bg-emerald-400 dark:bg-emerald-500'
                : decibel <= 65
                ? 'bg-amber-400 dark:bg-amber-500'
                : 'bg-rose-500 dark:bg-rose-600 animate-pulse';

            return (
              <div
                key={i}
                className={`w-2 sm:w-2.5 rounded-full transition-all duration-150 ${barColor}`}
                style={{ height: `${barHeightPct}%` }}
              />
            );
          })}
        </div>

        {/* 소음 강도 알림 배지 */}
        <div
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black shadow-xs border transition-all ${
            decibel <= 45
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : decibel <= 65
              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 animate-pulse'
          }`}
        >
          <span>
            {decibel <= 45
              ? '🌿 조용하고 평온해요'
              : decibel <= 65
              ? '⚠️ 조금 시끄러워요 (주의)'
              : '🚨 너무 소란스러워요! (쉿)'}
          </span>
        </div>
      </div>

      {/* 3. 하단 안내 및 리사이즈 인디케이터 */}
      <div className="mt-1 flex items-center justify-between text-[10px] font-bold text-slate-400 px-1">
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-extrabold">
          <span>🌿</span>
          <span>조용함(~45dB)</span>
        </span>
        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-extrabold">
          <span>⚠️</span>
          <span>적당/주의(46~65dB)</span>
        </span>
        <span className="flex items-center gap-1 text-rose-500 font-extrabold">
          <span>🚨</span>
          <span>소란/초과(66dB+)</span>
        </span>
      </div>

    </div>
  );
}
