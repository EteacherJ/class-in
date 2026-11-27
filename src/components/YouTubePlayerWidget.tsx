import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Minimize2,
  X,
  Volume2,
  VolumeX,
  Music,
  ListMusic,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  Sparkles,
  Check,
  ExternalLink,
  ArrowUpToLine,
  ChevronUp,
  ChevronDown,
  User,
} from 'lucide-react';

/**
 * ============================================================================
 * [YouTubePlayerWidget] 초등 학급 맞춤형 차분한 LIVE BGM & 유튜브 플레이어
 * ============================================================================
 */

export interface YouTubePlaylistItem {
  id: string; // 11자리 유튜브 비디오 ID
  title: string; // 영상 제목
  url?: string; // 원본 유튜브 링크
  isCustom?: boolean; // 교사 직접 추가 여부
}

// 📺 초등 교실 추천 배경음악 표준 플레이리스트 (기본값: 비워진 상태)
export const DEFAULT_CLASS_BGM_PLAYLIST: YouTubePlaylistItem[] = [];

/**
 * 유튜브 URL에서 11자리 고유 비디오 ID를 정규식으로 안전하게 추출하는 유틸리티 함수
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

export interface YouTubePlayerWidgetProps {
  /** 현재 재생 중인 유튜브 비디오 ID (선택 사항) */
  videoId?: string;
  /** 현재 재생 중인 음악/영상 제목 (선택 사항) */
  videoTitle?: string;
  /** 현재 재생 중인지 여부 (기본값: true) */
  isPlaying?: boolean;
  /** 현재 음소거 상태인지 여부 (기본값: false) */
  isMuted?: boolean;
  /** 재생 / 일시정지 토글 핸들러 */
  onTogglePlay?: () => void;
  /** 음소거 토글 핸들러 */
  onToggleMute?: () => void;
  /** 다음 곡 재생 핸들러 */
  onPlayNext?: () => void;
  /** 특정 비디오 직접 선택 재생 핸들러 */
  onSelectVideo?: (videoId: string, title: string) => void;
  /** 위젯 닫기 핸들러 (선택 사항) */
  onClose?: () => void;
  /** 스택 보관함으로 접기 핸들러 (선택 사항) */
  onCollapse?: () => void;
  /** 🍞 유튜브 플레이어 바로 위쪽에 표시할 실시간 알림 메시지 */
  toastMessage?: string | null;
  /** 안내 메시지를 토스트로 표시할 콜백 (선택 사항) */
  onShowToast?: (message: string) => void;
  /** 🔒 잠금화면 활성화 상태 (잠금 중 재생 원천 차단) */
  isLocked?: boolean;
}

export const YouTubePlayerWidget: React.FC<YouTubePlayerWidgetProps> = ({
  videoId = '',
  videoTitle = '유튜브 배경음악 플레이어',
  isPlaying = true,
  isMuted = false,
  toastMessage,
  onTogglePlay,
  onToggleMute,
  onPlayNext,
  onSelectVideo,
  onClose,
  onCollapse,
  onShowToast,
  isLocked = false,
}) => {
  // 📺 유튜브 iframe/webview DOM 직접 참조 Ref
  const iframeRef = useRef<any>(null);
  const isElectron = typeof window !== 'undefined' && Boolean((window as any).electron || (navigator && navigator.userAgent.includes('Electron')));

  // 🍞 유튜브 재생/멈춤 로컬 알림 상태 (플레이어 바로 위쪽에 말풍선으로 표시)
  const [localToast, setLocalToast] = useState<string | null>(null);
  const localToastTimerRef = useRef<number | null>(null);

  const triggerLocalToast = (msg: string) => {
    if (document.documentElement.classList.contains('stickers-editing')) return; // 스티커 모드: 알림 없이 조용히
    if (localToastTimerRef.current) clearTimeout(localToastTimerRef.current);
    setLocalToast(msg);
    localToastTimerRef.current = window.setTimeout(() => {
      setLocalToast(null);
    }, 2400);
  };

  // 🔒 잠금화면 활성화 시 즉시 유튜브 영상 일시정지 명령 전송
  useEffect(() => {
    if (isLocked && iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
          '*'
        );
      } catch (e) {}
    }
  }, [isLocked]);

  // ⏯️ 재생 / 일시정지 토글 핸들러: iframe에 직접 postMessage 전달
  const handleTogglePlayInternal = () => {
    if (isLocked) {
      triggerLocalToast('🔒 잠금화면 상태에서는 영상을 재생할 수 없습니다.');
      return;
    }
    const next = !isPlaying;
    triggerLocalToast(next ? '▶️ 유튜브 영상이 재생됩니다.' : '⏸️ 유튜브 영상이 일시 정지되었습니다.');
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: next ? 'playVideo' : 'pauseVideo',
            args: [],
          }),
          '*'
        );
      } catch (e) {
        console.warn('🟡 [YouTubePlayerWidget] postMessage play/pause failed:', e);
      }
    }
    onTogglePlay?.();
  };

  // 🔇 [음소거 버그 완벽 방지]: 마운트 시점의 isMuted 값을 기억하여 iframe src 재생성 방지
  const initialMutedRef = useRef<number>(isMuted ? 1 : 0);

  // 🔇 음소거 토글 핸들러: iframe에 직접 postMessage 전달
  const handleToggleMuteInternal = () => {
    const next = !isMuted;
    triggerLocalToast(next ? '🔇 유튜브 영상이 음소거되었습니다.' : '🔊 유튜브 소리가 켜졌습니다.');
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: next ? 'mute' : 'unMute',
            args: [],
          }),
          '*'
        );
        if (!next) {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({
              event: 'command',
              func: 'setVolume',
              args: [100],
            }),
            '*'
          );
        }
      } catch (e) {}
    }
    onToggleMute?.();
  };

  // 🔇 [상위 isMuted 상태 동기화]: prop 변경 시 iframe에 postMessage만 전달 (영상 리로드 방지)
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: isMuted ? 'mute' : 'unMute',
            args: [],
          }),
          '*'
        );
        if (!isMuted) {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({
              event: 'command',
              func: 'setVolume',
              args: [100],
            }),
            '*'
          );
        }
      } catch (e) {}
    }
  }, [isMuted]);

  // 🛑 [오디오 중복 재생 방지]: 컴포넌트 언마운트(레이아웃 전환 등) 시 즉각 영상 일시정지 및 리소스 클린업
  useEffect(() => {
    return () => {
      if (iframeRef.current?.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({
              event: 'command',
              func: 'pauseVideo',
              args: [],
            }),
            '*'
          );
        } catch {}
      }
    };
  }, []);

  // 🔄 [상위 isPlaying 상태 동기화]: prop 변경 시 iframe 실제 재생/일시정지 상태 즉시 반영
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: isPlaying ? 'playVideo' : 'pauseVideo',
            args: [],
          }),
          '*'
        );
      } catch {}
    }
  }, [isPlaying]);


  // ⏱️ 재생 시간 추적 및 스크러버(진행바) 상태
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(240);
  const [durationKnown, setDurationKnown] = useState(false);
  const [isSeeking, setIsSeeking] = useState<boolean>(false);

  // 📑 재생목록 서랍 패널 열림 상태
  const [isPlaylistOpen, setIsPlaylistOpen] = useState<boolean>(false);

  // 📋 사용자 재생목록 상태 (초기 상태: 깔끔하게 비움, 필요 시 사용자 직접 추가)
  const [playlist, setPlaylist] = useState<YouTubePlaylistItem[]>(() => {
    try {
      // 💡 사용자 요구사항: 처음 사용하는 경우 유튜브 플레이어 기본 재생 목록이 비워진 상태(0개)로 시작
      const migrationKey = 'class_dashboard_youtube_playlist_cleared_v4';
      const hasCleared = localStorage.getItem(migrationKey);
      if (!hasCleared) {
        localStorage.setItem(migrationKey, 'true');
        localStorage.removeItem('class_dashboard_youtube_playlist');
        console.log('🟢 [YouTube] 재생목록 깔끔하게 비우기 마이그레이션(v4) 완료');
        return [];
      }

      const saved = localStorage.getItem('class_dashboard_youtube_playlist');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // playlist 변경 시 localStorage 영속화
  const savePlaylist = (newList: YouTubePlaylistItem[]) => {
    setPlaylist(newList);
    try {
      localStorage.setItem('class_dashboard_youtube_playlist', JSON.stringify(newList));
    } catch {}
  };

  // 🔼🔽 재생목록 순서 변경 핸들러 (방향키 조절)
  const handleMovePlaylistItem = (index: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= playlist.length) return;

    const newList = [...playlist];
    const [movedItem] = newList.splice(index, 1);
    newList.splice(targetIndex, 0, movedItem);

    savePlaylist(newList);
    onShowToast?.(`🎵 [${movedItem.title}] 순서가 ${direction === 'up' ? '위' : '아래'}로 이동되었습니다.`);
  };

  // 🎯 [사용자 요구사항]: 재생목록의 가장 최상단에 있는 영상이 항상 우선 재생되도록 보장
  const hasInitializedTopVideoRef = useRef<boolean>(false);
  useEffect(() => {
    if (playlist && playlist.length > 0) {
      const topItem = playlist[0];
      // 최초 마운트 시 또는 videoId가 기본 fallback이거나 비어있을 때 최상단 영상으로 자동 동기화
      if (!hasInitializedTopVideoRef.current || videoId === 'tsWyeEpWqko' || !videoId) {
        hasInitializedTopVideoRef.current = true;
        if (videoId !== topItem.id) {
          console.log(`🟢 [YouTubePlayerWidget] 재생목록 최상단 영상 자동 재생 동기화: [${topItem.title}] (${topItem.id})`);
          onSelectVideo?.(topItem.id, topItem.title);
        }
      }
    }
  }, [playlist, videoId, onSelectVideo]);

  // 🎯 렌더링 시 최상단 영상 우선 유효 비디오 ID & 제목 (재생목록이 없으면 빈 상태 유지)
  const effectiveVideoId = playlist.length > 0
    ? playlist[0].id
    : (videoId && videoId !== 'tsWyeEpWqko' ? videoId : '');

  const effectiveVideoTitle = playlist.length > 0
    ? playlist[0].title
    : (videoTitle && videoTitle !== '따뜻한 피아노 음악 - 차분한 교실 아침' ? videoTitle : '재생목록이 비어 있습니다');

  // 🔒 [iframe src]: 안전한 origin fallback 및 공식 youtube.com embed 엔드포인트 사용
  const iframeSrc = useMemo(() => {
    if (!effectiveVideoId) return '';
    const rawOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const safeOrigin = !rawOrigin || rawOrigin.startsWith('file:') ? 'http://localhost:19283' : rawOrigin;
    return `https://www.youtube.com/embed/${effectiveVideoId}?enablejsapi=1&origin=${encodeURIComponent(safeOrigin)}&autoplay=1&mute=${initialMutedRef.current}&controls=0&rel=0&loop=1&playsinline=1`;
  }, [effectiveVideoId]);

  // ✏️ 영상 추가 및 편집 모달 상태
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [inputUrl, setInputUrl] = useState<string>('');
  const [inputTitle, setInputTitle] = useState<string>('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // URL 입력 시 실시간으로 비디오 ID 추출 및 썸네일 미리보기
  useEffect(() => {
    const extracted = extractYouTubeVideoId(inputUrl);
    setPreviewId(extracted);
  }, [inputUrl]);

  // 🤝 YouTube Iframe API 양방향 핸드셰이크 전송
  const sendWidgetListeningHandshake = useCallback(() => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'listening', id: 'yt_widget' }),
          '*'
        );
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'] }),
          '*'
        );
      } catch {}
    }
  }, []);

  // videoId 변경 시 핸드셰이크 재시도
  useEffect(() => {
    setCurrentTime(0);
    setDurationKnown(false);
    const t1 = setTimeout(sendWidgetListeningHandshake, 300);
    const t2 = setTimeout(sendWidgetListeningHandshake, 1000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [videoId, sendWidgetListeningHandshake]);

  // 영상이 끝나면: 재생목록이 2개 이상이면 다음 영상으로, 아니면 기존 동작
  const autoNextRef = useRef<() => void>(() => {});
  autoNextRef.current = () => {
    if (stepRef.current && playlist.length >= 2) stepRef.current(1, true);
    else if (playlist.length === 0) onPlayNext?.();
  };

  // 외부 유튜브 postMessage로부터 재생 시간 및 상태 실시간 동기화 수신
  useEffect(() => {
    const handleYtTimeMessage = (e: MessageEvent) => {
      try {
        // 다른 유튜브 창(미니 플레이어 · 보조 화면 등)의 신호가 섞이지 않도록 내 iframe 것만 받기
        if (iframeRef.current?.contentWindow && e.source && e.source !== iframeRef.current.contentWindow) return;
        let parsed = e.data;
        if (typeof parsed === 'string') {
          parsed = JSON.parse(parsed);
        }
        if (!parsed || typeof parsed !== 'object') return;

        // onReady 시 핸드셰이크
        if (parsed.event === 'onReady') {
          sendWidgetListeningHandshake();
        }

        // onStateChange
        if (parsed.event === 'onStateChange' && parsed.info !== undefined) {
          const state = Number(parsed.info);
          if (state === 0) {
            console.log('🟢 [YouTubePlayerWidget] 영상 종료 감지 -> 다음 곡 자동 재생');
            autoNextRef.current();
          }
        }

        // infoDelivery
        if (parsed.event === 'infoDelivery' && parsed.info) {
          if (parsed.info.playerState !== undefined && Number(parsed.info.playerState) === 0) {
            autoNextRef.current();
          }
          if (parsed.info.currentTime !== undefined && !isSeeking) {
            const sec = Math.floor(Number(parsed.info.currentTime));
            if (!isNaN(sec)) {
              setCurrentTime(sec);
            }
          }
          if (parsed.info.duration && Number(parsed.info.duration) > 0) {
            const dur = Math.floor(Number(parsed.info.duration));
            if (!isNaN(dur) && dur > 0) {
              setDuration(dur);
              setDurationKnown(true);
            }
          }
        }
      } catch {}
    };
    window.addEventListener('message', handleYtTimeMessage);
    return () => window.removeEventListener('message', handleYtTimeMessage);
  }, [isSeeking, onPlayNext, sendWidgetListeningHandshake]);

  // 1초 주기로 유튜브 iframe에 현재 시간 및 상태 질의 (시간 어긋남 자동 보정)
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (document.hidden) return; // 🔋 창이 숨겨진 동안은 재생 위치 확인 생략
      if (iframeRef.current?.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'getCurrentTime', args: [] }),
            '*'
          );
        } catch {}
      }
    }, 1000);
    return () => clearInterval(syncInterval);
  }, []);

  // 🎯 드래그 / 클릭 시 player.seekTo(seconds, true) 명령 전송
  const handleSeek = (newSeconds: number) => {
    setCurrentTime(newSeconds);
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: 'seekTo',
            args: [newSeconds, true],
          }),
          '*'
        );
      } catch (e) {}
    }
    window.postMessage(
      JSON.stringify({
        type: 'CLASS_DASHBOARD_YOUTUBE_CMD',
        command: 'seekTo',
        seconds: newSeconds,
        args: [newSeconds, true],
      }),
      '*'
    );
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 모달 열기: 신규 추가
  const handleOpenAddModal = () => {
    setEditingTargetId(null);
    setInputUrl('');
    setInputTitle('');
    setFormError(null);
    setIsModalOpen(true);
  };

  // 모달 열기: 기존 항목 수정
  const handleOpenEditModal = (item: YouTubePlaylistItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTargetId(item.id);
    setInputUrl(item.url || `https://youtu.be/${item.id}`);
    setInputTitle(item.title);
    setFormError(null);
    setIsModalOpen(true);
  };

  // 항목 삭제
  const handleDeleteItem = (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = playlist.filter((item) => item.id !== idToDelete);
    savePlaylist(filtered);
    onShowToast?.('🗑️ 재생목록에서 영상이 삭제되었습니다.');

    // 🎯 [요구사항]: 삭제 후 남아있는 목록 중 새로운 최상단 영상을 자동으로 재생, 없으면 빈 상태 초기화
    if (filtered.length > 0) {
      const newTop = filtered[0];
      if (effectiveVideoId === idToDelete || videoId === idToDelete) {
        onSelectVideo?.(newTop.id, newTop.title);
      }
    } else {
      onSelectVideo?.('', '재생목록이 비어 있습니다');
    }
  };

  // 재생목록 전체 비우기
  const handleClearPlaylist = () => {
    if (playlist.length === 0) {
      onShowToast?.('ℹ️ 이미 재생목록이 비어 있습니다.');
      return;
    }
    if (window.confirm('재생목록을 모두 비우시겠습니까?')) {
      savePlaylist([]);
      onSelectVideo?.('', '재생목록이 비어 있습니다');
      onShowToast?.('🧹 재생목록이 깨끗하게 비워졌습니다.');
    }
  };

  // 모달 폼 저장
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const extractedId = extractYouTubeVideoId(inputUrl);
    if (!extractedId) {
      setFormError('올바른 유튜브 링크(URL) 또는 11자리 비디오 ID를 입력해주세요.');
      return;
    }

    const titleToUse = inputTitle.trim() || `유튜브 영상 (${extractedId})`;

    if (editingTargetId) {
      // 기존 영상 수정
      const updated = playlist.map((item) => {
        if (item.id === editingTargetId) {
          return {
            ...item,
            id: extractedId,
            title: titleToUse,
            url: inputUrl.trim(),
            isCustom: true,
          };
        }
        return item;
      });
      savePlaylist(updated);

      // 현재 재생 중인 영상을 수정한 경우 제목과 ID도 즉시 갱신
      if (effectiveVideoId === editingTargetId || videoId === editingTargetId) {
        onSelectVideo?.(extractedId, titleToUse);
      }
      onShowToast?.(`✏️ [${titleToUse}] 영상 정보가 수정되었습니다.`);
    } else {
      // 🎯 신규 영상 추가 시 항상 재생목록 최상단(0번 인덱스)에 추가하고 즉시 재생!
      const newItem: YouTubePlaylistItem = {
        id: extractedId,
        title: titleToUse,
        url: inputUrl.trim(),
        isCustom: true,
      };

      // 중복 체크 후 최상단에 배치
      const rest = playlist.filter((p) => p.id !== extractedId);
      const newList = [newItem, ...rest];

      savePlaylist(newList);
      onShowToast?.(`✨ [${titleToUse}] 영상이 재생목록 최상단에 추가되어 재생됩니다!`);

      // 추가한 최상단 영상 즉시 재생
      onSelectVideo?.(extractedId, titleToUse);
    }

    setIsModalOpen(false);
  };

  // 🎯 재생목록에서 특정 영상 선택 시 -> 해당 영상을 항상 최상단 목록으로 올려서 재생!
  const handleItemSelect = (item: YouTubePlaylistItem) => {
    if (isLocked) {
      triggerLocalToast('🔒 잠금화면 상태에서는 영상을 재생할 수 없습니다.');
      return;
    }
    // 선택한 영상을 재생목록 가장 최상단(0번 인덱스)으로 재배치
    const rest = playlist.filter((p) => p.id !== item.id);
    const reorderedList = [item, ...rest];
    savePlaylist(reorderedList);

    if (onSelectVideo) {
      onSelectVideo(item.id, item.title);
    }
    onShowToast?.(`▶️ [${item.title}] 영상을 최상단으로 올려 재생합니다.`);
  };

  // ⏮️⏭️ 이전 / 다음 영상: 재생목록을 한 칸씩 돌려서 맨 위 영상을 재생 (맨 위 영상이 항상 재생되는 구조 유지)
  const lastStepAtRef = useRef(0);
  const handleStep = (dir: 1 | -1, auto = false) => {
    if (isLocked) {
      triggerLocalToast('🔒 잠금화면 상태에서는 영상을 재생할 수 없습니다.');
      return;
    }
    if (playlist.length < 2) {
      if (!auto) triggerLocalToast(playlist.length ? 'ℹ️ 재생목록에 영상이 1개뿐이에요.' : 'ℹ️ 재생목록이 비어 있어요.');
      return;
    }
    // 영상 종료 신호가 두 번 오는 경우 한 번만 넘기기
    const now = Date.now();
    if (now - lastStepAtRef.current < 1200) return;
    lastStepAtRef.current = now;
    const list = [...playlist];
    if (dir === 1) list.push(list.shift()!);
    else list.unshift(list.pop()!);
    savePlaylist(list);
    onSelectVideo?.(list[0].id, list[0].title);
    triggerLocalToast(`${dir === 1 ? '⏭️ 다음' : '⏮️ 이전'} 영상: ${list[0].title}`);
  };
  const stepRef = useRef(handleStep);
  stepRef.current = handleStep;

  const currentDisplayToast = document.documentElement.classList.contains('stickers-editing') ? null : (toastMessage || localToast);

  return (
    <div className="relative w-full">
      {/* 🍞 유튜브 재생/멈춤 알림창: 유튜브 플레이어 바로 위쪽에 말풍선 형태로 플로팅 렌더링 */}
      {currentDisplayToast && (
        <div className="absolute -top-11 left-1/2 -translate-x-1/2 z-50 animate-fade-in pointer-events-none whitespace-nowrap">
          <div className="bg-slate-900/95 text-white px-3.5 py-1.5 rounded-xl shadow-2xl border border-white/20 flex items-center gap-1.5 text-xs font-bold backdrop-blur-md ring-2 ring-pink-500/40">
            <span>{currentDisplayToast}</span>
            {/* 하단 뾰족한 말풍선 꼬리 */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45 border-r border-b border-white/20" />
          </div>
        </div>
      )}

      {/* 플레이어 본체 카드 */}
      <div
        data-yt-card
        className="yt-card flex flex-col bg-[#101a2d] text-[#f8fafc] rounded-2xl border border-[#1e2c44] shadow-xl transition-all duration-300 overflow-hidden w-full"
      >
      {/* 🎵 스티커 모드 전용: 유리 뮤직 카드 (동그란 앨범 아트 · 제목 · 이전/재생/다음) */}
      <div
        className="yt-sm-only yt-glass"
        data-yt-glass
        title="끌어서 원하는 곳으로 옮길 수 있어요"
        onPointerDown={(e) => {
          // 🖐️ 스티커 모드: 카드를 끌어 원하는 자리로 (버튼은 그대로 눌려요)
          if (!document.documentElement.classList.contains('stickers-editing')) return;
          if ((e.target as HTMLElement).closest('button, input')) return;
          const slot = (e.currentTarget as HTMLElement).closest('[data-yt-slot]') as HTMLElement | null;
          if (!slot) return;
          e.preventDefault();
          const r = slot.getBoundingClientRect();
          const sx = e.clientX, sy = e.clientY;
          const de = document.documentElement;
          slot.classList.add('is-dragging');
          let nx = r.left, ny = r.top;
          const move = (ev: PointerEvent) => {
            nx = Math.min(Math.max(r.left + ev.clientX - sx, 0), window.innerWidth - r.width);
            ny = Math.min(Math.max(r.top + ev.clientY - sy, 0), window.innerHeight - 120);
            de.style.setProperty('--smo-yt-x', `${Math.round(nx)}px`);
            de.style.setProperty('--smo-yt-y', `${Math.round(ny)}px`);
          };
          const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            window.removeEventListener('pointercancel', up);
            slot.classList.remove('is-dragging');
            try { localStorage.setItem('sticker_player_pos', JSON.stringify({ x: nx / window.innerWidth, y: ny / window.innerHeight })); } catch {}
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', up);
          window.addEventListener('pointercancel', up);
        }}
      >
        {/* 위젯 화면에서만 보이는 작은 도구 (소리 · 재생목록 · 영상 추가) */}
        <div className="yt-glass-tools">
          <button type="button" onClick={handleToggleMuteInternal} aria-label={isMuted ? '소리 켜기' : '음소거'} title={isMuted ? '소리 켜기' : '음소거'}>
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <button type="button" onClick={() => setIsPlaylistOpen(!isPlaylistOpen)} aria-pressed={isPlaylistOpen} aria-label="재생목록" title={isPlaylistOpen ? '재생목록 닫기' : '재생목록 열기'}>
            <ListMusic size={14} />
          </button>
          <button type="button" onClick={handleOpenAddModal} aria-label="영상 추가" title="유튜브 영상 추가">
            <Plus size={14} />
          </button>
        </div>
        <div className={`yt-glass-art ${isPlaying && effectiveVideoId ? 'is-spinning' : ''} ${effectiveVideoId ? '' : 'is-empty'}`} onClick={effectiveVideoId ? undefined : handleOpenAddModal}>
          {effectiveVideoId ? (
            <img src={`https://i.ytimg.com/vi/${effectiveVideoId}/hqdefault.jpg`} alt="" referrerPolicy="no-referrer" draggable={false} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          ) : null}
          <span className="yt-glass-art-hole" />
        </div>
        <div className="yt-glass-title" title={effectiveVideoTitle}>{effectiveVideoId ? effectiveVideoTitle : '음악을 등록해 주세요'}</div>
        <div className="yt-glass-sub">
          {effectiveVideoId ? (playlist.length > 1 ? `YouTube 배경음악 · ${playlist.length}곡` : 'YouTube 배경음악') : '＋ 버튼으로 유튜브 영상을 추가해요'}
        </div>
        {/* ⏱️ 진행바: 끌어서 원하는 부분부터 듣기 */}
        <div className="yt-glass-progress" data-yt-progress>
          <span>{formatTime(Math.min(currentTime, duration || currentTime))}</span>
          <input
            type="range"
            min={0}
            max={Math.max(1, duration)}
            step={1}
            value={Math.min(currentTime, Math.max(1, duration))}
            disabled={!effectiveVideoId}
            aria-label="재생 위치"
            style={{ ['--yt-pct' as any]: `${duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0}%` }}
            onPointerDown={() => setIsSeeking(true)}
            onChange={(e) => { setIsSeeking(true); setCurrentTime(Number(e.target.value)); }}
            onPointerUp={(e) => { handleSeek(Number((e.target as HTMLInputElement).value)); setIsSeeking(false); }}
            onKeyUp={(e) => { handleSeek(Number((e.target as HTMLInputElement).value)); setIsSeeking(false); }}
            onBlur={() => setIsSeeking(false)}
          />
          <span>{effectiveVideoId && durationKnown ? formatTime(duration) : '--:--'}</span>
        </div>
        <div className="yt-glass-ctrl">
          <button type="button" onClick={() => handleStep(-1)} disabled={playlist.length < 2} aria-label="이전 곡" title="이전 곡">
            <svg viewBox="0 0 48 32" aria-hidden><path d="M22 4.5v23a1.5 1.5 0 0 1-2.4 1.2L4.3 17.2a1.5 1.5 0 0 1 0-2.4L19.6 3.3A1.5 1.5 0 0 1 22 4.5Z" /><path d="M42 4.5v23a1.5 1.5 0 0 1-2.4 1.2L24.3 17.2a1.5 1.5 0 0 1 0-2.4L39.6 3.3A1.5 1.5 0 0 1 42 4.5Z" /></svg>
          </button>
          <button type="button" className="is-main" onClick={handleTogglePlayInternal} disabled={!effectiveVideoId} aria-label={isPlaying ? '멈춤' : '재생'} title={isPlaying ? '멈춤' : '재생'}>
            {isPlaying ? (
              <svg viewBox="0 0 32 32" aria-hidden><rect x="7" y="5" width="6" height="22" rx="2" /><rect x="19" y="5" width="6" height="22" rx="2" /></svg>
            ) : (
              <svg viewBox="0 0 32 32" aria-hidden><path d="M9 5.6v20.8a2 2 0 0 0 3 1.7l16.4-10.4a2 2 0 0 0 0-3.4L12 3.9a2 2 0 0 0-3 1.7Z" /></svg>
            )}
          </button>
          <button type="button" onClick={() => handleStep(1)} disabled={playlist.length < 2} aria-label="다음 곡" title="다음 곡">
            <svg viewBox="0 0 48 32" aria-hidden><path d="M6 4.5v23a1.5 1.5 0 0 0 2.4 1.2l15.3-11.5a1.5 1.5 0 0 0 0-2.4L8.4 3.3A1.5 1.5 0 0 0 6 4.5Z" /><path d="M26 4.5v23a1.5 1.5 0 0 0 2.4 1.2l15.3-11.5a1.5 1.5 0 0 0 0-2.4L28.4 3.3A1.5 1.5 0 0 0 26 4.5Z" /></svg>
          </button>
        </div>
      </div>

      {/* 1. 상단 헤더 바 (음표 아이콘, LIVE ON 배지, 음소거, 재생목록, 확대 버튼 균형 배치) */}
      <div className="yt-head flex items-center justify-between px-3.5 py-2 border-b border-[#1e2c44] bg-[#0c1424] select-none">
        {/* 좌측: 음표 아이콘 & LIVE 핑크 뱃지 (타이틀 텍스트 제거로 깔끔한 미니멀 디자인) */}
        <div className="yt-head-left flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center shrink-0">
            <Music className="w-3.5 h-3.5 text-pink-400 shrink-0" />
          </div>

          {/* ● LIVE ON 핑크 뱃지 */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9.5px] font-black text-[#fb7185] bg-[#fb7185]/10 border border-[#fb7185]/25 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#fb7185] animate-pulse" />
            <span className="tracking-wider">LIVE</span>
          </div>
        </div>

        {/* 우측: 컨트롤 버튼 그룹 (이전 영상, 다음 영상, 소리, 재생목록) */}
        <div className="yt-head-ctrl flex items-center gap-1.5 shrink-0">
          {/* ⏯ 스티커 모드에서만 보이는 재생 / 멈춤 버튼 */}
          <button type="button" onClick={handleTogglePlayInternal} className="yt-sm-only yt-sm-play" title={isPlaying ? '멈춤' : '재생'} aria-label={isPlaying ? '멈춤' : '재생'}>
            {isPlaying ? '❚❚' : '▶'}
          </button>
          {/* 이전 영상 */}
          <button
            type="button"
            onClick={() => handleStep(-1)}
            disabled={playlist.length < 2}
            title="이전 영상"
            aria-label="이전 영상"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#16233b] transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400"
          >
            <SkipBack size={14} />
          </button>

          {/* 다음 영상 */}
          <button
            type="button"
            onClick={() => handleStep(1)}
            disabled={playlist.length < 2}
            title="다음 영상"
            aria-label="다음 영상"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#16233b] transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400"
          >
            <SkipForward size={14} />
          </button>

          {/* 음소거 / 볼륨 버튼 */}
          <button
            type="button"
            onClick={handleToggleMuteInternal}
            title={isMuted ? '소리 켜기' : '음소거'}
            aria-label={isMuted ? '소리 켜기' : '음소거'}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#16233b] transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400"
          >
            {isMuted ? <VolumeX size={14} className="text-rose-400" /> : <Volume2 size={14} />}
          </button>

          {/* 재생목록 토글 버튼 */}
          <button
            type="button"
            onClick={() => setIsPlaylistOpen(!isPlaylistOpen)}
            title={isPlaylistOpen ? '재생목록 닫기' : '재생목록 열기'}
            aria-label="재생목록"
            className={`yt-playlist-btn p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#16233b] transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400 ${isPlaylistOpen ? 'text-pink-300 bg-[#16233b]' : ''}`}
          >
            <ListMusic size={14} />
          </button>
        </div>
      </div>

      {/* 2. 16:9 비율 실제 YouTube 영상 화면 또는 빈 상태 안내 화면 */}
      {effectiveVideoId ? (
        <div
          onClick={handleTogglePlayInternal}
          className="yt-viewport w-full aspect-video bg-black relative select-none cursor-pointer group/viewport transition-transform active:scale-[0.99] overflow-hidden"
          title={isPlaying ? '화면 클릭 시 일시정지' : '화면 클릭 시 재생'}
        >
          {/* 마우스 오버 시 상단 안내 툴팁 말풍선 */}
          <div className="absolute top-2 left-2 z-20 pointer-events-none opacity-0 group-hover/viewport:opacity-100 transition-opacity duration-200 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-white text-[10px] font-bold shadow-md flex items-center gap-1 border border-white/10">
            <span>{isPlaying ? '클릭 시 일시정지' : '클릭 시 재생'}</span>
          </div>

          {/* 실제 보이는 유튜브 iframe 영상 화면 (항상 effectiveVideoId 사용) */}
          <iframe
            ref={iframeRef}
            id="youtube-widget-direct-iframe"
            key={`yt_player_${effectiveVideoId}`}
            src={iframeSrc}
            title={effectiveVideoTitle || 'YouTube Classroom Video Player'}
            className="w-full h-full border-0 pointer-events-none"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />

          {/* 일시정지 상태 오버레이 (영상 위에 반투명 어두운 배경 + 재생 아이콘) */}
          {!isPlaying && (
            <div className="absolute inset-0 z-10 bg-black/45 backdrop-blur-2xs flex items-center justify-center transition-all">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg">
                <Play size={22} className="fill-white text-white ml-1" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={handleOpenAddModal}
          className="w-full aspect-video bg-gradient-to-br from-[#0c1424] via-[#101a2d] to-[#16233b] relative select-none cursor-pointer flex flex-col items-center justify-center p-4 text-center group border-y border-[#1e2c44]/60 transition-all hover:bg-[#121c31]"
          title="클릭하여 유튜브 영상 등록"
        >
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-inner">
            <Music className="w-5.5 h-5.5 text-pink-400" />
          </div>
          <span className="text-xs font-black text-slate-200 mb-1">
            등록된 재생목록이 없습니다
          </span>
          <span className="text-[10.5px] text-slate-400 max-w-[260px] leading-relaxed mb-2.5">
            수업이나 아침 활동에 어울리는 유튜브 영상을 등록해보세요.
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenAddModal();
            }}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-[11px] font-black flex items-center gap-1 shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={13} />
            <span>새 영상 등록하기</span>
          </button>
        </div>
      )}

      {/* 3. 하단 얇은 진행바 & 시간 표시 (조작 버튼 없이 시각 정보만 제공) */}
      <div className="yt-foot px-3 py-1.5 flex flex-col gap-1 bg-[#0c1424] border-t border-[#1e2c44] select-none">
        <div className="relative flex items-center h-1.5">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onMouseDown={() => setIsSeeking(true)}
            onTouchStart={() => setIsSeeking(true)}
            onMouseUp={() => setIsSeeking(false)}
            onTouchEnd={() => setIsSeeking(false)}
            onChange={(e) => {
              const val = Number(e.target.value);
              handleSeek(val);
            }}
            className="w-full h-1 bg-[#1e2c44] rounded-full appearance-none cursor-pointer accent-[#fb7185] hover:h-1.5 transition-all"
          />
        </div>
        <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 font-bold px-0.5">
          <span className="truncate max-w-[200px] text-slate-300">{effectiveVideoTitle || 'Lo-Fi Classroom BGM'}</span>
          <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
        </div>
      </div>

      {/* 4. 📑 재생목록 서랍 드로어 (열림 상태일 때) */}
      {isPlaylistOpen && (
        <div className="yt-playlist-drawer border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/95 p-3 flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scroll animate-fade-in">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span>📑 학급 재생목록</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-mono">
                {playlist.length}개
              </span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearPlaylist}
                className="text-[11px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 underline cursor-pointer"
                title="등록된 재생목록을 모두 비웁니다"
              >
                목록 비우기
              </button>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[11px] font-bold transition hover:bg-emerald-600 cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <Plus size={12} />
                <span>영상 추가</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {playlist.length === 0 ? (
              <div className="py-6 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                <Music className="w-8 h-8 opacity-40 text-slate-400" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">재생목록이 깔끔하게 비어 있습니다.</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-[280px]">
                  상단 [+ 영상 추가] 버튼을 눌러 수업이나 아침 활동에 어울리는 유튜브 영상을 등록해 보세요.
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="mt-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-xs active:scale-95"
                >
                  <Plus size={13} />
                  <span>새 영상 등록하기</span>
                </button>
              </div>
            ) : (
              playlist.map((item, idx) => {
                const isCurrent = item.id === effectiveVideoId;
                return (
                  <div
                    key={`${item.id}-${idx}`}
                    onClick={() => handleItemSelect(item)}
                    className={`group flex items-center justify-between p-2 rounded-xl transition duration-150 cursor-pointer border ${
                      isCurrent
                        ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-400 dark:border-indigo-600 shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/60 dark:hover:bg-slate-850'
                    }`}
                  >
                    {/* 좌측: 썸네일 & 제목 & ID */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                      <div className="relative w-14 h-9 rounded-lg overflow-hidden bg-slate-800 shrink-0 shadow-inner">
                        <img
                          src={`https://img.youtube.com/vi/${item.id}/default.jpg`}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${item.id}/hqdefault.jpg`;
                          }}
                        />
                        {isCurrent && (
                          <div className="absolute inset-0 bg-indigo-900/60 flex items-center justify-center">
                            <Play size={12} className="text-white fill-white animate-pulse" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className={`text-xs font-bold truncate ${
                            isCurrent
                              ? 'text-indigo-600 dark:text-indigo-400'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                          title={item.title}
                        >
                          {item.title}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                          <span className="truncate">ID: {item.id}</span>
                          {/* 재생 중 아이콘 (텍스트 제거, 컴팩트 아이콘만) */}
                          {isCurrent && (
                            <span
                              title="현재 재생 중"
                              className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-indigo-600 text-white shrink-0 shadow-2xs"
                            >
                              <Play size={8} className="fill-white translate-x-[0.5px]" />
                            </span>
                          )}
                          {/* 사용자 추가 아이콘 (텍스트 제거, 컴팩트 아이콘만) */}
                          {item.isCustom && (
                            <span
                              title="사용자 직접 추가 영상"
                              className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-300/60 dark:border-amber-700/60 shrink-0 shadow-2xs"
                            >
                              <User size={9} />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 우측 도구: 순서 변경(위/아래 방향키) & 수정 & 삭제 */}
                    <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                      {/* 위로 이동 방향키 */}
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={(e) => handleMovePlaylistItem(idx, 'up', e)}
                        title={idx === 0 ? '첫 번째 곡입니다' : '위로 이동 (순서 변경)'}
                        className={`p-1 rounded-lg transition cursor-pointer ${
                          idx === 0
                            ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-20'
                            : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 active:scale-90'
                        }`}
                      >
                        <ChevronUp size={14} />
                      </button>

                      {/* 아래로 이동 방향키 */}
                      <button
                        type="button"
                        disabled={idx === playlist.length - 1}
                        onClick={(e) => handleMovePlaylistItem(idx, 'down', e)}
                        title={idx === playlist.length - 1 ? '마지막 곡입니다' : '아래로 이동 (순서 변경)'}
                        className={`p-1 rounded-lg transition cursor-pointer ${
                          idx === playlist.length - 1
                            ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-20'
                            : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 active:scale-90'
                        }`}
                      >
                        <ChevronDown size={14} />
                      </button>

                      {/* 영상 정보 수정 */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenEditModal(item, e)}
                        title="영상 정보 수정"
                        className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition cursor-pointer active:scale-90"
                      >
                        <Edit2 size={13} />
                      </button>

                      {/* 재생목록에서 삭제 */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteItem(item.id, e)}
                        title="재생목록에서 삭제"
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer active:scale-90"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              }))}
          </div>
        </div>
      )}

      {/* 5. ✏️ 영상 추가 / 수정 모달 (createPortal 적용하여 화면 전체에 모던하게 표시) */}
      {isModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col p-6 space-y-4 text-left">
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-red-500/10 text-red-500">
                    <Music size={18} />
                  </span>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {editingTargetId ? '유튜브 영상 수정' : '새 유튜브 영상 추가'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      유튜브 링크를 붙여넣으면 비디오 ID를 자동으로 추출합니다.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 폼 입력 영역 */}
              <form onSubmit={handleSaveForm} className="space-y-4">
                {/* 1. 유튜브 주소 입력 */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    유튜브 주소 (URL 또는 비디오 ID) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="예: https://www.youtube.com/watch?v=... 또는 https://youtu.be/..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-red-500 transition"
                    autoFocus
                  />
                  {formError && (
                    <p className="text-xs text-rose-500 font-bold mt-1.5">{formError}</p>
                  )}
                </div>

                {/* 2. 영상 제목 입력 */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    영상 제목 (구분하기 쉬운 이름)
                  </label>
                  <input
                    type="text"
                    value={inputTitle}
                    onChange={(e) => setInputTitle(e.target.value)}
                    placeholder="예: 🎵 신나는 아침 교실 BGM (미입력 시 기본 제목 부여)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-red-500 transition"
                  />
                </div>

                {/* 3. 실시간 썸네일 미리보기 */}
                {previewId && (
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center gap-3">
                    <div className="w-24 aspect-video rounded-lg overflow-hidden bg-slate-900 shrink-0 shadow-sm relative">
                      <img
                        src={`https://img.youtube.com/vi/${previewId}/hqdefault.jpg`}
                        alt="미리보기"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${previewId}/0.jpg`;
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1 text-xs">
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check size={13} />
                        <span>유효한 유튜브 영상 감지됨</span>
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        ID: {previewId}
                      </p>
                    </div>
                  </div>
                )}

                {/* 모달 액션 버튼 */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-black shadow-md transition cursor-pointer active:scale-95 flex items-center gap-1.5"
                  >
                    <Check size={14} />
                    <span>{editingTargetId ? '수정 완료' : '재생목록에 추가'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};
