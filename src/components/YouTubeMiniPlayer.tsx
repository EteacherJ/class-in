import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Maximize2,
  Music,
  Volume2,
  VolumeX,
} from 'lucide-react';

// YouTube Iframe API 전역 타입 선언
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YouTubeMiniPlayerProps {
  videoId: string;
  videoTitle?: string;
  isPlaying?: boolean;
  isMuted?: boolean;
  /** 🍞 플레이어 바로 위쪽에 표시할 실시간 알림 메시지 */
  toastMessage?: string | null;
  onTogglePlay?: () => void;
  onPlayNext?: () => void;
  onToggleMute?: () => void;
  onExpand: () => void;
  onClose: () => void;
  onShowToast?: (message: string) => void;
  /** 🔒 잠금화면 활성화 상태 (잠금 중 재생 원천 차단) */
  isLocked?: boolean;
}

/**
 * ============================================================================
 * [YouTubeMiniPlayer] 사이드바 스택 패널 상단 고정 스마트 미니 플레이어
 * ============================================================================
 * 🎯 [주요 특징]:
 * 1. [두 번째 이미지 스타일 미니멀 디자인]:
 *    - 하단의 탐색바 및 재생/정지 버튼을 완전히 제거하여 세로 높이를 대폭 슬림화
 *    - 상단 미니 타이틀 바(음소거/복귀) + 16:9 뷰포트만 남겨 하단 보관함 영역을 극대화
 * 2. [영상 화면 원터치 재생 & 일시정지 토글]:
 *    - 영상 화면 어디든 클릭 시 재생 / 일시정지 토글
 *    - 마우스 호버 시 좌상단에 "클릭 시 일시정지" / "클릭 시 재생" 직관적인 툴팁 표시
 *    - 일시정지 상태일 때 중앙에 글래스 재생(Play) 버튼 오버레이 표시
 * 3. [YouTube Iframe API 실시간 연동]:
 *    - postMessage 및 window.YT.Player로 브라우저와 1:1 양방향 상태 동기화
 */
export const YouTubeMiniPlayer: React.FC<YouTubeMiniPlayerProps> = ({
  videoId,
  videoTitle,
  isPlaying: isPlayingProp = true,
  isMuted: isMutedProp,
  toastMessage,
  onTogglePlay,
  onPlayNext,
  onToggleMute,
  onExpand,
  onClose,
  onShowToast,
  isLocked = false,
}) => {
  // 📺 스택 미니 플레이어 Iframe/Webview 참조 Ref
  const miniIframeRef = useRef<any>(null);
  const isElectron = typeof window !== 'undefined' && Boolean((window as any).electron || (navigator && navigator.userAgent.includes('Electron')));

  // 🍞 유튜브 재생/멈춤 로컬 알림 상태 (플레이어 바로 위쪽에 말풍선으로 표시)
  const [localToast, setLocalToast] = useState<string | null>(null);
  const localToastTimerRef = useRef<number | null>(null);

  const triggerLocalToast = (msg: string) => {
    if (localToastTimerRef.current) clearTimeout(localToastTimerRef.current);
    setLocalToast(msg);
    localToastTimerRef.current = window.setTimeout(() => {
      setLocalToast(null);
    }, 2400);
  };

  // 🎮 YouTube Iframe API 공식 Player 인스턴스 Ref
  const ytPlayerRef = useRef<any>(null);

  // 🎵 실제 유튜브 영상 재생 상태 (YouTube playerState와 1:1 실시간 동기화)
  const [actualPlaying, setActualPlaying] = useState<boolean>(isPlayingProp);

  // 🔇 음소거(Mute) 내부 상태 관리
  const [internalMuted, setInternalMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('class_dashboard_youtube_muted') === 'true';
    } catch {
      return false;
    }
  });

  const effectiveMuted = isMutedProp !== undefined ? isMutedProp : internalMuted;

  // 현재 브라우저의 오리진 주소 (크로스오리진 보안 파라미터 필수)
  const rawOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const currentOrigin = !rawOrigin || rawOrigin.startsWith('file:') ? 'http://localhost:19283' : rawOrigin;

  // 📡 1. postMessage 명령 전송 (보조 통신 파이프라인)
  const sendMiniPlayerCommand = useCallback((func: string, args: any[] = []) => {
    if (miniIframeRef.current?.contentWindow) {
      try {
        miniIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      } catch (err) {
        console.warn('🔴 [YouTubeMiniPlayer] postMessage 전송 실패:', err);
      }
    }
  }, []);

  // 🤝 2. YouTube Iframe API 양방향 핸드셰이크 전송
  const sendListeningHandshake = useCallback(() => {
    if (miniIframeRef.current?.contentWindow) {
      try {
        miniIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'listening', id: 'yt_mini' }),
          '*'
        );
        miniIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'] }),
          '*'
        );
      } catch {}
    }
  }, []);

  // 🎮 3. YouTube 공식 Iframe Player API(window.YT.Player) 인스턴스 바인딩
  const initYTPlayerInstance = useCallback(() => {
    if (!miniIframeRef.current) return;
    if (typeof window === 'undefined' || !window.YT || !window.YT.Player) {
      return;
    }

    try {
      if (ytPlayerRef.current) {
        try {
          if (typeof ytPlayerRef.current.destroy === 'function') {
            ytPlayerRef.current.destroy();
          }
        } catch {}
        ytPlayerRef.current = null;
      }

      ytPlayerRef.current = new window.YT.Player(miniIframeRef.current, {
        events: {
          onReady: (event: any) => {
            console.log('🟢 [YouTubeMiniPlayer] window.YT.Player 준비 완료 (onReady)');
            try {
              if (effectiveMuted) {
                event.target.mute?.();
              } else {
                event.target.unMute?.();
                event.target.setVolume?.(80);
              }

              if (isPlayingProp) {
                event.target.playVideo?.();
                setActualPlaying(true);
              } else {
                event.target.pauseVideo?.();
                setActualPlaying(false);
              }
            } catch (err) {
              console.warn('🟡 [YouTubeMiniPlayer] onReady 초기화 경고:', err);
            }
          },
          onStateChange: (event: any) => {
            const state = Number(event.data);
            console.log(`🔵 [YouTubeMiniPlayer] onStateChange 이벤트 감지: ${state}`);
            if (state === 1) {
              // 1 = 재생 중 (PLAYING)
              setActualPlaying(true);
            } else if (state === 2) {
              // 2 = 일시 정지 (PAUSED)
              setActualPlaying(false);
            } else if (state === 0) {
              // 0 = 재생 종료 (ENDED) -> 다음 곡 자동 재생
              setActualPlaying(false);
              console.log('🟢 [YouTubeMiniPlayer] 영상 종료 감지 -> 다음 곡 자동 전환');
              onPlayNext?.();
            }
          },
        },
      });
    } catch (err) {
      console.warn('🟡 [YouTubeMiniPlayer] YT.Player 생성 실패(postMessage 폴백 활성화):', err);
    }
  }, [effectiveMuted, isPlayingProp, onPlayNext]);

  // iframe 로드 시 YT Player 초기화 및 핸드셰이크
  const handleIframeLoad = () => {
    console.log('🟢 [YouTubeMiniPlayer] iframe 로드 완료');
    sendListeningHandshake();

    if (window.YT && window.YT.Player) {
      initYTPlayerInstance();
    } else {
      let attempts = 0;
      const checkYt = setInterval(() => {
        attempts++;
        if (window.YT && window.YT.Player) {
          clearInterval(checkYt);
          initYTPlayerInstance();
        } else if (attempts > 20) {
          clearInterval(checkYt);
        }
      }, 200);
    }

    setTimeout(() => {
      sendListeningHandshake();
      if (effectiveMuted) {
        sendMiniPlayerCommand('mute');
      } else {
        sendMiniPlayerCommand('unMute');
        sendMiniPlayerCommand('setVolume', [80]);
      }
      if (actualPlaying) {
        sendMiniPlayerCommand('playVideo');
      }
    }, 400);
  };

  // videoId 변경 시 상태 초기화
  useEffect(() => {
    const t = setTimeout(() => {
      handleIframeLoad();
    }, 300);
    return () => clearTimeout(t);
  }, [videoId]);

  // 상위 isPlayingProp 변경 시 로컬 동기화
  useEffect(() => {
    setActualPlaying(isPlayingProp);
    if (isPlayingProp) {
      if (ytPlayerRef.current?.playVideo) {
        try {
          ytPlayerRef.current.playVideo();
        } catch {}
      }
      sendMiniPlayerCommand('playVideo');
    } else {
      if (ytPlayerRef.current?.pauseVideo) {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch {}
      }
      sendMiniPlayerCommand('pauseVideo');
    }
  }, [isPlayingProp, sendMiniPlayerCommand]);

  // 📡 postMessage 이벤트 메시지 수신 (YT API와 독립적인 보조 동기화)
  useEffect(() => {
    const handleYtMessage = (e: MessageEvent) => {
      let parsed = e.data;
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          return;
        }
      }

      if (!parsed || typeof parsed !== 'object') return;

      if (parsed.event === 'onReady') {
        console.log('🟢 [YouTubeMiniPlayer] postMessage onReady 수신');
        sendListeningHandshake();
        if (effectiveMuted) {
          sendMiniPlayerCommand('mute');
        } else {
          sendMiniPlayerCommand('unMute');
          sendMiniPlayerCommand('setVolume', [80]);
        }
        if (actualPlaying) {
          sendMiniPlayerCommand('playVideo');
        }
      }

      if (parsed.event === 'onStateChange' && parsed.info !== undefined) {
        const state = Number(parsed.info);
        if (state === 1) {
          setActualPlaying(true);
        } else if (state === 2) {
          setActualPlaying(false);
        } else if (state === 0) {
          setActualPlaying(false);
          console.log('🟢 [YouTubeMiniPlayer] postMessage 영상 종료 감지 -> 다음 곡 자동 전환');
          onPlayNext?.();
        }
      }

      if (parsed.event === 'infoDelivery' && parsed.info) {
        const info = parsed.info;
        if (info.playerState !== undefined) {
          const state = Number(info.playerState);
          if (state === 1) {
            setActualPlaying(true);
          } else if (state === 2) {
            setActualPlaying(false);
          } else if (state === 0) {
            setActualPlaying(false);
            onPlayNext?.();
          }
        }
        if (info.muted !== undefined) {
          setInternalMuted(Boolean(info.muted));
        }
      }
    };

    window.addEventListener('message', handleYtMessage);
    return () => window.removeEventListener('message', handleYtMessage);
  }, [actualPlaying, effectiveMuted, onPlayNext, sendListeningHandshake, sendMiniPlayerCommand]);

  // ⏱️ 500ms 주기로 실제 플레이어의 재생 상태를 폴링하여 오차 0% 완벽 동기화
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (document.hidden) return; // 🔋 창이 숨겨진 동안은 상태 확인 생략
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getPlayerState === 'function') {
        try {
          const state = ytPlayerRef.current.getPlayerState();
          if (state === 1 && !actualPlaying) {
            setActualPlaying(true);
          } else if (state === 2 && actualPlaying) {
            setActualPlaying(false);
          }
        } catch {}
      }

      if (miniIframeRef.current?.contentWindow) {
        sendMiniPlayerCommand('getPlayerState');
      }
    }, 500);

    return () => clearInterval(syncInterval);
  }, [actualPlaying, sendMiniPlayerCommand]);

  // 🔊 음소거 토글 핸들러
  const handleToggleMute = (e?: React.MouseEvent) => {
    e?.stopPropagation();

    const nextMuted = !effectiveMuted;
    setInternalMuted(nextMuted);
    try {
      localStorage.setItem('class_dashboard_youtube_muted', String(nextMuted));
    } catch {}

    if (ytPlayerRef.current) {
      try {
        if (nextMuted) {
          ytPlayerRef.current.mute?.();
        } else {
          ytPlayerRef.current.unMute?.();
          ytPlayerRef.current.setVolume?.(80);
        }
      } catch {}
    }

    sendMiniPlayerCommand(nextMuted ? 'mute' : 'unMute');
    if (!nextMuted) {
      sendMiniPlayerCommand('setVolume', [80]);
    }

    console.log(nextMuted ? '🔴 [YouTubeMiniPlayer] 음소거 (mute)' : '🟢 [YouTubeMiniPlayer] 소리 켬 (unMute)');

    if (onToggleMute) {
      onToggleMute();
    } else {
      onShowToast?.(nextMuted ? '🔇 유튜브 영상이 음소거되었습니다.' : '🔊 유튜브 소리가 켜졌습니다.');
    }
  };

  // 🔒 잠금화면 활성화 시 즉시 미니 플레이어 영상 일시정지 명령 전송
  useEffect(() => {
    if (isLocked) {
      setActualPlaying(false);
      if (ytPlayerRef.current?.pauseVideo) {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch {}
      }
      sendMiniPlayerCommand('pauseVideo');
    }
  }, [isLocked, sendMiniPlayerCommand]);

  // ⏯️ 영상 화면 클릭 재생 / 일시정지 토글 핸들러
  const handleTogglePlayClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isLocked) {
      triggerLocalToast('🔒 잠금화면 상태에서는 영상을 재생할 수 없습니다.');
      return;
    }
    const nextPlaying = !actualPlaying;
    console.log(`🟢 [YouTubeMiniPlayer] 영상 화면 클릭 -> ${nextPlaying ? '재생' : '일시정지'}`);

    setActualPlaying(nextPlaying);

    if (ytPlayerRef.current) {
      try {
        if (nextPlaying) {
          ytPlayerRef.current.unMute?.();
          ytPlayerRef.current.setVolume?.(80);
          ytPlayerRef.current.playVideo?.();
        } else {
          ytPlayerRef.current.pauseVideo?.();
        }
      } catch {}
    }

    if (nextPlaying) {
      sendMiniPlayerCommand('unMute');
      sendMiniPlayerCommand('setVolume', [80]);
      sendMiniPlayerCommand('playVideo');
    } else {
      sendMiniPlayerCommand('pauseVideo');
    }

    if (onTogglePlay) {
      triggerLocalToast(nextPlaying ? '▶️ 유튜브 영상이 재생됩니다.' : '⏸️ 유튜브 영상이 일시 정지되었습니다.');
      onTogglePlay();
    } else {
      triggerLocalToast(nextPlaying ? '▶️ 유튜브 영상이 재생됩니다.' : '⏸️ 유튜브 영상이 일시 정지되었습니다.');
      onShowToast?.(nextPlaying ? '▶️ 유튜브 영상이 재생됩니다.' : '⏸️ 유튜브 영상이 일시 정지되었습니다.');
    }
  };

  const currentDisplayToast = toastMessage || localToast;

  return (
    <div className="relative w-full shrink-0">
      {/* 🍞 유튜브 재생/멈춤 알림창: 미니 플레이어 바로 위쪽에 말풍선 형태로 플로팅 렌더링 */}
      {currentDisplayToast && (
        <div className="absolute -top-11 left-1/2 -translate-x-1/2 z-50 animate-fade-in pointer-events-none whitespace-nowrap">
          <div className="bg-slate-900/95 text-white px-3.5 py-1.5 rounded-xl shadow-2xl border border-white/20 flex items-center gap-1.5 text-xs font-bold backdrop-blur-md ring-2 ring-pink-500/40">
            <span>{currentDisplayToast}</span>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45 border-r border-b border-white/20" />
          </div>
        </div>
      )}

      {/* 본체 카드 */}
      <div className="w-full flex flex-col gap-2 p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/85 backdrop-blur-xl border border-white/60 dark:border-slate-700 shadow-md transition-all duration-300 animate-in fade-in slide-in-from-top-2">
      {/* 1. 상단 미니 타이틀 바 (두 번째 첨부 이미지 디자인 1:1 구현) */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="flex h-2 w-2 relative shrink-0">
            {actualPlaying && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                actualPlaying ? 'bg-red-600' : 'bg-slate-400'
              }`}
            />
          </span>
          <span className="text-[10px] font-extrabold text-red-600 dark:text-red-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Music className="w-2.5 h-2.5" />
            <span>LIVE BGM</span>
          </span>
          <span
            className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[125px]"
            title={videoTitle || videoId}
          >
            {videoTitle || videoId}
          </span>
        </div>

        {/* 상단 우측: 연분홍 캡슐 음소거 토글 아이콘 & 보라색 원래 크기 복귀 */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleToggleMute}
            className={`p-1.5 rounded-xl transition cursor-pointer active:scale-90 ${
              effectiveMuted
                ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
            title={effectiveMuted ? '음소거 해제 (소리 켜기)' : '음소거 (소리 끄기)'}
          >
            {effectiveMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={onExpand}
            className="p-1.5 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition cursor-pointer active:scale-90"
            title="메인 캔버스로 원래 크기 복귀"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. 16:9 비율 실제 YouTube 미니 플레이어 뷰포트 (화면 클릭 시 재생/일시정지 토글) */}
      <div
        onClick={handleTogglePlayClick}
        className="w-full aspect-video rounded-xl overflow-hidden bg-black relative shadow-inner select-none cursor-pointer group/viewport transition-transform active:scale-[0.99]"
        title={actualPlaying ? '클릭 시 일시정지' : '클릭 시 재생'}
      >
        {/* 🏷️ 마우스 오버 시 나타나는 직관적인 커스텀 툴팁 (두 번째 첨부 이미지의 말풍선 완벽 구현) */}
        <div className="absolute top-2 left-2 z-20 pointer-events-none opacity-0 group-hover/viewport:opacity-100 transition-opacity duration-200 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-white text-[10px] font-bold shadow-lg flex items-center gap-1 border border-white/10">
          <span>{actualPlaying ? '클릭 시 일시정지' : '클릭 시 재생'}</span>
        </div>

        {isElectron ? (
          React.createElement('webview', {
            ref: miniIframeRef,
            id: 'youtube-mini-player-webview',
            key: `yt_mini_wv_${videoId}`,
            src: `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${encodeURIComponent(currentOrigin)}&autoplay=1&mute=${effectiveMuted ? 1 : 0}&controls=0&rel=0&loop=1&playsinline=1`,
            title: videoTitle || 'YouTube Classroom Mini Player',
            className: 'w-full h-full border-0 rounded-xl pointer-events-none',
            allowpopups: 'true',
            webpreferences: 'allowRunningInsecureContent, javascript=yes',
            style: { width: '100%', height: '100%', border: 'none' },
            onLoad: handleIframeLoad,
          })
        ) : (
          <iframe
            ref={miniIframeRef}
            id="youtube-mini-player-iframe"
            key={`yt_mini_${videoId}`}
            src={`https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&origin=${encodeURIComponent(currentOrigin)}&autoplay=1&mute=${effectiveMuted ? 1 : 0}&controls=0&rel=0&loop=1&playsinline=1`}
            title={videoTitle || 'YouTube Classroom Mini Player'}
            className="w-full h-full border-0 rounded-xl pointer-events-none"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            onLoad={handleIframeLoad}
          />
        )}

        {/* 🎬 일시정지 시 화면 중앙에 나타나는 직관적인 글래스 재생 버튼 오버레이 */}
        {!actualPlaying && (
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] flex items-center justify-center transition-all animate-fade-in pointer-events-none z-10">
            <div className="w-12 h-12 rounded-full bg-white/90 dark:bg-slate-900/90 text-red-600 shadow-xl flex items-center justify-center transform transition-transform group-hover/viewport:scale-110">
              <Play className="w-6 h-6 fill-current ml-0.5" />
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

