import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  SkipForward,
  Maximize2,
  X,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import { YouTubeRecentVideo, YouTubeWidgetProps } from '../types';

/**
 * ============================================================================
 * [YouTubeWidget] 유튜브 자동 재생 및 스마트 임베드 위젯 (싱글톤 영속 플레이어)
 * ============================================================================
 * 초등학교 교실 화면(전자칠판, TV)에서 수업 자료, 체조 영상, 집중 BGM 등을
 * 빠르게 입력하고 광고/추천 영상 없이 깔끔하게 재생하는 위젯입니다.
 *
 * 🚨 [치명적 오디오 중복 방지 및 영속적 재생 (Persistent Player)]:
 * 1. 실제 YouTube iframe은 애플리케이션 전체에서 오직 단 하나(싱글톤)만 유지합니다.
 * 2. 위젯이 접히거나(isCollapsed) 스택에 보관(isStacked)되어도 iframe을 언마운트하지 않고
 *    오프스크린(`position: fixed; left: -9999px;`) 모드로 유지하여
 *    하단 위젯바의 '모두 접음 / 모두 펼침' 시에도 음악이 절대 끊기지 않습니다!
 * 3. postMessage를 통한 외부 전역 제어(playVideo, pauseVideo)를 수신합니다.
 */

const STORAGE_KEY_RECENT = 'class_dashboard_youtube_recent';
const STORAGE_KEY_LAST_PLAYED = 'class_dashboard_youtube_last_played';

/**
 * 유튜브 URL에서 11자리 고유 비디오 ID를 정규식으로 안전하게 추출하는 유틸리티 함수
 * 지원 형식:
 * - https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * - https://youtu.be/dQw4w9WgXcQ
 * - https://www.youtube.com/shorts/dQw4w9WgXcQ
 * - https://www.youtube.com/embed/dQw4w9WgXcQ
 * - https://m.youtube.com/watch?v=dQw4w9WgXcQ
 * - dQw4w9WgXcQ (11자리 순수 ID)
 */
export function extractYouTubeVideoId(inputUrl: string): string | null {
  if (!inputUrl) return null;
  const trimmed = inputUrl.trim();

  // 1. 이미 11자리 비디오 ID만 입력한 경우 (알파벳, 숫자, _, - 조합)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // 2. 다양한 유튜브 URL 패턴(youtube.com, youtu.be, shorts 등) 검증 및 ID 캡처
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = trimmed.match(regExp);

  if (match && match[1] && match[1].length === 11) {
    return match[1];
  }

  return null;
}

export const YouTubeWidget: React.FC<YouTubeWidgetProps> = ({
  onShowToast,
  className = '',
  activeVideoId,
  onActiveVideoChange,
  foldBehavior = 'mini',
  onFoldBehaviorChange,
  isStacked = false,
  isCollapsed = false,
  onExpand,
}) => {
  // 상태 관리: 'input' (URL 입력 모드) vs 'playing' (비디오 재생 모드)
  const [mode, setMode] = useState<'input' | 'playing'>(activeVideoId ? 'playing' : 'input');
  const [inputUrl, setInputUrl] = useState('');
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(activeVideoId || null);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 상위 activeVideoId 변경 시 동기화 (예: 미니 플레이어에서 다음 곡 클릭 시 즉시 전환)
  useEffect(() => {
    if (activeVideoId && activeVideoId !== currentVideoId) {
      console.log('🔵 [YouTubeWidget] 비디오 ID 외부 갱신:', activeVideoId);
      setCurrentVideoId(activeVideoId);
      setMode('playing');
    } else if (!activeVideoId && currentVideoId) {
      setCurrentVideoId(null);
      setMode('input');
    }
  }, [activeVideoId, currentVideoId]);

  // 최근 링크 목록 상태 (최대 5개 저장)
  const [recentVideos, setRecentVideos] = useState<YouTubeRecentVideo[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECENT);
      if (saved) return JSON.parse(saved);
    } catch {
      console.warn('🟡 [YouTubeWidget] 최근 유튜브 링크 파싱 오류');
    }
    return [];
  });

  // 최근 링크 목록 드롭다운 펼침 여부
  const [isRecentDropdownOpen, setIsRecentDropdownOpen] = useState(false);

  // 컴포넌트 마운트 시 이전에 재생 중이던 영상이 있으면 복원 확인
  useEffect(() => {
    try {
      const last = localStorage.getItem(STORAGE_KEY_LAST_PLAYED);
      if (last) {
        const parsed = JSON.parse(last);
        if (parsed?.videoId && !activeVideoId) {
          console.log('🔵 [YouTubeWidget] 마지막 재생 영상 감지:', parsed.videoId);
        }
      }
    } catch {}
  }, [activeVideoId]);

  // 🔇 음소거(Mute) 상태 관리 (로컬스토리지 보존)
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('class_dashboard_youtube_muted') === 'true';
    } catch {
      return false;
    }
  });

  // ▶️ 재생/일시정지 상태 관리
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  /**
   * 📡 YouTube iframe postMessage 명령 전송 유틸리티
   */
  const sendPlayerCommand = (command: string, args: any[] = []) => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: command,
            args,
          }),
          '*'
        );
      } catch (err) {
        console.warn('🟡 [YouTubeWidget] postMessage 전송 실패:', err);
      }
    }
    // 미니 플레이어 Iframe에도 동시 전송 (동기화 보장)
    try {
      const miniEl = document.getElementById('youtube-mini-player-iframe') as HTMLIFrameElement | null;
      if (miniEl?.contentWindow) {
        miniEl.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: command, args }),
          '*'
        );
      }
    } catch {}
  };

  /**
   * 🔊 [오디오 무음 버그 해결] iframe 로드 즉시 오디오 언뮤트 및 볼륨 80% 자동 적용
   */
  const handleIframeReady = () => {
    console.log('🟢 [YouTubeWidget] Iframe 로드 완료 -> 자동 언뮤트 및 볼륨 80 설정');
    setTimeout(() => {
      sendPlayerCommand('unMute');
      sendPlayerCommand('setVolume', [80]);
      if (isMuted) {
        sendPlayerCommand('mute');
      }
      sendPlayerCommand('playVideo');
    }, 400);
  };

  // 전역 postMessage 명령 수신 (외부 컨트롤러에서 재생/일시정지/음소거 제어)
  useEffect(() => {
    const handleGlobalMessage = (e: MessageEvent) => {
      try {
        if (typeof e.data === 'string') {
          const parsed = JSON.parse(e.data);
          if (parsed?.type === 'CLASS_DASHBOARD_YOUTUBE_CMD') {
            console.log('🟢 [YouTubeWidget] 전역 플레이어 명령 수신:', parsed.command);
            if (parsed.command === 'mute') setIsMuted(true);
            if (parsed.command === 'unMute') setIsMuted(false);
            if (parsed.command === 'playVideo') setIsPlaying(true);
            if (parsed.command === 'pauseVideo') setIsPlaying(false);
            sendPlayerCommand(parsed.command, parsed.args || []);
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleGlobalMessage);
    return () => window.removeEventListener('message', handleGlobalMessage);
  }, [isMuted]);

  /**
   * 🔇 음소거 토글 핸들러
   */
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    try {
      localStorage.setItem('class_dashboard_youtube_muted', String(nextMuted));
    } catch {}
    
    sendPlayerCommand(nextMuted ? 'mute' : 'unMute');
    if (!nextMuted) {
      sendPlayerCommand('setVolume', [100]);
    }
    console.log(nextMuted ? '🔴 [YouTubeWidget] 음소거 (mute)' : '🟢 [YouTubeWidget] 소리 켬 (unMute, volume: 100)');
    onShowToast?.(nextMuted ? '🔇 유튜브 영상이 음소거되었습니다.' : '🔊 유튜브 소리가 켜졌습니다.');
  };

  /**
   * ⏯️ 재생 / 일시정지 토글 핸들러
   */
  const handleTogglePlay = () => {
    if (isPlaying) {
      sendPlayerCommand('pauseVideo');
      setIsPlaying(false);
      onShowToast?.('⏸️ 유튜브 영상이 일시 정지되었습니다.');
    } else {
      sendPlayerCommand('playVideo');
      if (!isMuted) {
        sendPlayerCommand('unMute');
        sendPlayerCommand('setVolume', [100]);
      }
      setIsPlaying(true);
      onShowToast?.('▶️ 유튜브 영상이 재생됩니다.');
    }
  };

  /**
   * ⏭️ 다음 곡 재생 핸들러
   */
  const handlePlayNext = () => {
    if (recentVideos.length > 1) {
      const nextCandidate = recentVideos.find((v) => v.videoId !== currentVideoId) || recentVideos[0];
      if (nextCandidate) {
        handlePlayVideo(nextCandidate.url, nextCandidate.title);
        onShowToast?.(`⏭️ 다음 영상 재생: ${nextCandidate.title}`);
        return;
      }
    }
    onShowToast?.('⏭️ 최근 목록에 다음 영상이 없습니다.');
  };

  /**
   * 비디오 재생 실행 처리 함수
   */
  const handlePlayVideo = (targetUrl: string, customTitle?: string) => {
    setErrorMessage(null);

    if (!targetUrl || targetUrl.trim() === '') {
      setErrorMessage('유튜브 링크를 입력해 주세요.');
      inputRef.current?.focus();
      return;
    }

    // 정규식을 통한 비디오 ID 추출 및 유효성 검사
    const videoId = extractYouTubeVideoId(targetUrl);

    if (!videoId) {
      console.warn('🔴 [YouTubeWidget] 유효하지 않은 유튜브 URL 감지:', targetUrl);
      setErrorMessage('올바른 유튜브 링크를 입력해 주세요.');
      inputRef.current?.focus();
      return;
    }

    console.log('🟢 [YouTubeWidget] 유효한 비디오 ID 추출 성공:', videoId);

    // 유효한 경우 비디오 ID 및 현재 URL 상태 설정
    setCurrentVideoId(videoId);
    setCurrentUrl(targetUrl);
    setMode('playing');
    setErrorMessage(null);

    // 상위 상태 동기화 (사이드바 미니 플레이어 연속 재생 지원)
    onActiveVideoChange?.(videoId, targetUrl);

    // 최근 링크 목록에 추가 (최대 5개 유지, 중복 제거 후 최신 순으로 정렬)
    const newEntry: YouTubeRecentVideo = {
      id: `yt_${Date.now()}`,
      url: targetUrl.trim(),
      videoId,
      title: customTitle || `YouTube 영상 (${videoId})`,
      playedAt: Date.now(),
    };

    setRecentVideos((prev) => {
      const filtered = prev.filter((item) => item.videoId !== videoId);
      const updated = [newEntry, ...filtered].slice(0, 5);
      try {
        localStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(updated));
        localStorage.setItem(STORAGE_KEY_LAST_PLAYED, JSON.stringify(newEntry));
      } catch (err) {
        console.error('🔴 [YouTubeWidget] 최근 링크 저장 실패:', err);
      }
      return updated;
    });

    onShowToast?.('🎬 유튜브 영상이 자동 재생됩니다.');
  };

  /**
   * 위젯 초기화 기능: URL 입력 모드로 복귀
   */
  const handleResetToInput = () => {
    console.log('🔵 [YouTubeWidget] 위젯 초기화 -> URL 입력 모드로 복귀');
    setMode('input');
    setCurrentVideoId(null);
    setErrorMessage(null);
    onActiveVideoChange?.(null, '');
    onShowToast?.('🔄 다른 유튜브 영상 입력 모드로 전환되었습니다.');
  };

  /**
   * 최근 재생 링크 삭제
   */
  const handleDeleteRecent = (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentVideos((prev) => {
      const updated = prev.filter((item) => item.id !== idToDelete);
      try {
        localStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    onShowToast?.('🗑️ 최근 링크가 삭제되었습니다.');
  };

  /**
   * 키보드 Enter 입력 시 즉시 재생
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePlayVideo(inputUrl);
    }
  };

  // 접힘 또는 스택 보관 여부
  const isHiddenFromMain = isStacked || isCollapsed;

  return (
    <div
      className={`w-full h-full flex flex-col justify-between p-4 bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 rounded-2xl shadow-sm transition-all duration-200 overflow-hidden select-none relative ${className}`}
    >
      {/* =================================================================== */}
      {/* 🚨 [Zero-Interruption Persistent Player]: iframe 영속성 보장 */}
      {/* 접히거나 보관된 경우에도 실제 iframe은 언마운트하지 않고 오프스크린으로 유지! */}
      {/* =================================================================== */}
      {currentVideoId && isHiddenFromMain && (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-900/95 text-white rounded-xl space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-red-600/20 text-red-500 flex items-center justify-center text-3xl shadow-inner animate-pulse">
            🎵
          </div>
          <div className="space-y-1">
            <h4 className="font-extrabold text-sm text-slate-100">
              {foldBehavior === 'mini' ? '스택 상단 미니 플레이어에서 재생 중' : '위젯 보관 스택에 보관됨'}
            </h4>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              사운드가 끊기지 않고 백그라운드에서 연속 재생되고 있습니다.
            </p>
          </div>
          {onExpand && (
            <button
              type="button"
              onClick={onExpand}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
            >
              <span>메인 화면으로 펼치기 ↗</span>
            </button>
          )}

          {/* 오프스크린 영속 iframe (절대 언마운트되지 않아 끊김 방지) */}
          <div className="fixed -left-[9999px] -top-[9999px] w-[1px] h-[1px] opacity-0 pointer-events-none z-[-100]">
            <iframe
              ref={iframeRef}
              id="youtube-singleton-iframe"
              key={`persistent_${currentVideoId}`}
              src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:') ? window.location.origin : 'http://localhost:19283')}&rel=0&playsinline=1`}
              title="YouTube persistent background player"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-[1px] h-[1px] border-0"
            />
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 1. [비디오 재생 모드] 메인 캔버스 16:9 고화질 뷰 */}
      {/* =================================================================== */}
      {!isHiddenFromMain && mode === 'playing' && currentVideoId && (
        <div className="w-full h-full flex flex-col">
          {/* 상단 컨트롤 바: 재생 상태 표시 및 초기화 버튼 */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-2.5 w-2.5 relative flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
              </span>
              <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider flex-shrink-0">
                LIVE
              </span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate font-mono">
                ID: {currentVideoId}
              </span>
            </div>

            {/* 초기화 및 링크 열기 버튼 */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {onFoldBehaviorChange && (
                <button
                  type="button"
                  onClick={() => {
                    const next = foldBehavior === 'mini' ? 'stack' : 'mini';
                    onFoldBehaviorChange(next);
                    onShowToast?.(
                      next === 'mini'
                        ? '📺 유튜브 접기 시 스택 상단 미니 플레이어로 연속 재생됩니다.'
                        : '🗂️ 유튜브 접기 시 일반 스택 목록으로 보관됩니다.'
                    );
                  }}
                  className={`px-2 py-1 rounded-lg text-[11px] font-extrabold transition flex items-center gap-1 cursor-pointer border ${
                    foldBehavior === 'mini'
                      ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300 border-red-200 dark:border-red-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                  title={
                    foldBehavior === 'mini'
                      ? '현재: 접기 시 스택 상단 미니 플레이어 뷰 제공'
                      : '현재: 접기 시 일반 스택 보관'
                  }
                >
                  <span>{foldBehavior === 'mini' ? '📺 미니 연속재생' : '🗂️ 일반보관'}</span>
                </button>
              )}

              <a
                href={currentUrl || `https://www.youtube.com/watch?v=${currentVideoId}`}
                target="_blank"
                rel="noreferrer"
                title="새 창에서 유튜브 열기"
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition text-xs flex items-center gap-1"
              >
                <span>🔗</span>
                <span className="hidden sm:inline">새 탭</span>
              </a>

              {/* 음소거 토글 버튼 (상단) */}
              <button
                type="button"
                onClick={handleToggleMute}
                className={`p-1.5 rounded-xl border transition text-xs flex items-center justify-center cursor-pointer active:scale-95 ${
                  isMuted
                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                }`}
                title={isMuted ? '소리 켜기 (Unmute)' : '음소거 (Mute)'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>

              {/* 위젯 초기화 버튼: 닫기/다른 영상 입력 */}
              <button
                type="button"
                onClick={handleResetToInput}
                className="p-1.5 rounded-xl bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-300 border border-red-200/80 dark:border-red-800/60 transition flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
                title="닫기 / 다른 영상 선택"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 반응형 16:9 Iframe 컨테이너: 싱글톤 플레이어 (onLoad 자동 언뮤트 보장) */}
          <div className="flex-1 w-full min-h-0 flex items-center justify-center relative bg-black/95 rounded-xl overflow-hidden shadow-inner">
            <iframe
              ref={iframeRef}
              id="youtube-singleton-iframe"
              key={`main_${currentVideoId}`}
              onLoad={handleIframeReady}
              src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:') ? window.location.origin : 'http://localhost:19283')}&rel=0&playsinline=1`}
              title="YouTube classroom video player"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full aspect-video border-0 rounded-xl"
            />
          </div>

          {/* 🎛️ [요구사항 2] 하단 컨트롤 바: 텍스트 완전 제거 및 아이콘 전용 캡슐 버튼 통일 */}
          <div className="pt-2 flex items-center justify-between gap-2">
            {/* 좌측 버튼 그룹: 재생/일시정지 토글, 다음 곡, 음소거 토글 */}
            <div className="flex items-center gap-1.5">
              {/* 재생 / 일시정지 아이콘 버튼 */}
              <button
                type="button"
                onClick={handleTogglePlay}
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition cursor-pointer active:scale-90 shadow-xs border ${
                  isPlaying
                    ? 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                    : 'bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                }`}
                title={isPlaying ? '일시정지' : '재생'}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>

              {/* 다음 곡 재생 아이콘 버튼 */}
              <button
                type="button"
                onClick={handlePlayNext}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 transition cursor-pointer flex items-center justify-center active:scale-90 shadow-xs"
                title="다음 곡 재생"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              {/* 음소거 토글 아이콘 버튼 */}
              <button
                type="button"
                onClick={handleToggleMute}
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl transition cursor-pointer flex items-center justify-center active:scale-90 shadow-xs border ${
                  isMuted
                    ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 hover:bg-rose-100'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                }`}
                title={isMuted ? '소리 켜기 (Unmute)' : '음소거 (Mute)'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>

            {/* 우측 버튼 그룹: 원래 크기(새 창), 닫기 */}
            <div className="flex items-center gap-1.5">
              <a
                href={currentUrl || `https://www.youtube.com/watch?v=${currentVideoId}`}
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 transition cursor-pointer flex items-center justify-center active:scale-90 shadow-xs"
                title="원래 크기로 (새 창에서 유튜브 열기)"
              >
                <Maximize2 className="w-4 h-4" />
              </a>

              <button
                type="button"
                onClick={handleResetToInput}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60 transition cursor-pointer flex items-center justify-center active:scale-90 shadow-xs"
                title="닫기 (다른 영상 선택)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 2. [URL 입력 모드] 직관적인 입력창 및 최근 링크 */}
      {/* =================================================================== */}
      {!isHiddenFromMain && mode === 'input' && (
        <div className="w-full h-full flex flex-col justify-between space-y-3">
          {/* 상단 헤더 정보 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">▶️</span>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
                    유튜브 플레이어
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    수업 영상 및 배경음악을 광고 없이 깔끔하게 연속 재생합니다.
                  </p>
                </div>
              </div>

              {/* 최근 링크 보기 토글 버튼 */}
              {recentVideos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsRecentDropdownOpen(!isRecentDropdownOpen)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span>🕒</span>
                  <span>최근 영상 ({recentVideos.length})</span>
                  <span className="text-[10px]">{isRecentDropdownOpen ? '▲' : '▼'}</span>
                </button>
              )}
            </div>

            {/* 최근 링크 목록 드롭다운 */}
            {isRecentDropdownOpen && recentVideos.length > 0 && (
              <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 px-1 flex items-center justify-between">
                  <span>최근 재생한 영상 (클릭 시 즉시 재생)</span>
                  <span className="text-[10px] text-slate-400">최대 5개 보존</span>
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {recentVideos.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handlePlayVideo(item.url, item.title)}
                      className="group flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200/80 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-400 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-red-500 font-bold">▶</span>
                        <span className="truncate">{item.title || item.url}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                        <span className="text-[10px] text-slate-400">
                          {new Date(item.playedAt).toLocaleDateString('ko-KR', {
                            month: 'numeric',
                            day: 'numeric',
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteRecent(item.id, e)}
                          className="text-slate-400 hover:text-red-500 p-0.5 rounded transition"
                          title="기록 삭제"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* URL 입력창 & 재생하기 버튼 */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputUrl}
                  onChange={(e) => {
                    setInputUrl(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="유튜브 링크(URL)를 입력하거나 붙여넣으세요"
                  className={`w-full px-4 py-3 rounded-xl border text-sm sm:text-base font-medium bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 transition ${
                    errorMessage
                      ? 'border-red-500 focus:ring-red-400/50 bg-red-50/20'
                      : 'border-slate-300 dark:border-slate-700 focus:ring-red-500/40 focus:border-red-500'
                  }`}
                />
                {inputUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputUrl('');
                      setErrorMessage(null);
                      inputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* 큼직한 재생 버튼 */}
              <button
                type="button"
                onClick={() => handlePlayVideo(inputUrl)}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-95 text-white font-extrabold text-sm sm:text-base shadow-md shadow-red-500/20 hover:shadow-red-500/30 flex items-center justify-center gap-1.5 transition cursor-pointer flex-shrink-0"
              >
                <span>▶️</span>
                <span>재생하기</span>
              </button>
            </div>

            {/* URL 유효성 검사 에러 메시지 */}
            {errorMessage && (
              <p className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1 animate-bounce">
                <span>⚠️</span>
                <span>{errorMessage}</span>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
