import React, { useState, useEffect, useRef } from 'react';
import { getAudio, putAudio, delAudio } from '../utils/audioFiles';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  ListMusic,
  Plus,
  Trash2,
  Edit2,
  Music,
  ExternalLink,
  Repeat,
  Sparkles,
  X,
} from 'lucide-react';

export interface CleanMusicTrack {
  id: string;
  title: string;
  url: string;
  videoId: string;
  /** 'youtube'(기본) · 'file'(내 MP3 파일) */
  kind?: 'youtube' | 'file';
  fileId?: string;
}

/**
 * 🎵 초등학교 청소·하교 시간에 가장 많이 쓰이는 신나고 활기찬 기본 추천 BGM 프리셋
 */
const DEFAULT_CLEAN_TRACKS: CleanMusicTrack[] = [
  {
    id: 'clean_track_1',
    title: '🧹 [신나는 청소송] 뽀로로 바라밤 & 어린이 댄스 동요 리믹스',
    url: 'https://www.youtube.com/watch?v=kY31a115jE0',
    videoId: 'kY31a115jE0',
  },
  {
    id: 'clean_track_2',
    title: '🎻 [경쾌한 클래식] 모차르트 장난감 교향곡 & 피가로의 결혼',
    url: 'https://www.youtube.com/watch?v=F_fD0vM8kUQ',
    videoId: 'F_fD0vM8kUQ',
  },
  {
    id: 'clean_track_3',
    title: '🎹 [감성 피아노] 지브리 스튜디오 명곡 메들리 (활기찬 오후)',
    url: 'https://www.youtube.com/watch?v=T_8v5h94Pms',
    videoId: 'T_8v5h94Pms',
  },
  {
    id: 'clean_track_4',
    title: '🎮 [신나는 게임 BGM] 슈퍼마리오 브라더스 오버월드 테마',
    url: 'https://www.youtube.com/watch?v=3jWRrafhO7M',
    videoId: '3jWRrafhO7M',
  },
];

/**
 * 유튜브 URL 또는 ID 문자열에서 11자리 비디오 ID를 안전하게 파싱
 */
export function extractYouTubeVideoId(inputUrl: string): string | null {
  if (!inputUrl) return null;
  const trimmed = inputUrl.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = trimmed.match(regExp);
  if (match && match[1] && match[1].length === 11) {
    return match[1];
  }
  return null;
}

/**
 * ⏱️ 초(seconds) 단위를 MM:SS 형식으로 변환하는 헬퍼 함수
 */
function formatMediaTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

interface CleanBgmPlayerProps {
  isLightMode?: boolean;
  isActiveTab?: boolean; // 청소종례 모드 탭 활성화 여부
  cleanTimerSeconds?: number; // 청소 타이머 남은 시간
  isCleanTimerRunning?: boolean; // 청소 타이머 실행 중 여부
  /** 작고 간단한 한 줄 플레이어 (보조창 청소·종례 화면 아래쪽) */
  compact?: boolean;
  /** 저장 이름 앞부분 (청소: class_clean_youtube · 아침: class_morning_bgm) */
  storeKey?: string;
  /** 처음 목록 */
  defaultTracks?: CleanMusicTrack[];
  /** '청소 음악' · '아침 음악' */
  label?: string;
  /** 이 화면으로 들어오면 음악을 저절로 틀지(자동) / 버튼을 눌러야 틀지(수동) 고르는 단추 보이기 */
  showAutoToggle?: boolean;
}

export const CleanBgmPlayer: React.FC<CleanBgmPlayerProps> = ({
  isLightMode = false,
  isActiveTab = true,
  cleanTimerSeconds,
  isCleanTimerRunning,
  compact = false,
  storeKey = 'class_clean_youtube',
  defaultTracks = DEFAULT_CLEAN_TRACKS,
  label = '청소 음악',
  showAutoToggle = true,
}) => {
  const STORAGE_KEY_PLAYLIST = `${storeKey}_playlist`;
  const STORAGE_KEY_CURRENT_IDX = `${storeKey}_current_idx`;
  const STORAGE_KEY_VOLUME = `${storeKey}_volume`;
  const STORAGE_KEY_MUTED = `${storeKey}_muted`;
  const STORAGE_KEY_LOOP = `${storeKey}_loop`;
  const STORAGE_KEY_AUTOPLAY = `${storeKey}_autoplay`;
  // ▶ 자동 재생: 이 화면이 켜지면 음악을 저절로 틀어요 (기본은 수동)
  const [autoPlay, setAutoPlay] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_AUTOPLAY) === 'true';
    } catch {
      return false;
    }
  });
  const toggleAutoPlay = () =>
    setAutoPlay((v) => {
      try {
        localStorage.setItem(STORAGE_KEY_AUTOPLAY, String(!v));
      } catch {}
      return !v;
    });
  // 1. 재생목록 상태 (로컬 스토리지 보존 및 수정/편집 지원)
  const [playlist, setPlaylist] = useState<CleanMusicTrack[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PLAYLIST);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && (parsed.length > 0 || defaultTracks.length === 0)) return parsed;
      }
    } catch {}
    return defaultTracks;
  });

  // 2. 현재 재생 곡 인덱스
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CURRENT_IDX);
      if (saved !== null) {
        const idx = parseInt(saved, 10);
        return isNaN(idx) ? 0 : idx;
      }
    } catch {}
    return 0;
  });

  // 3. 재생 및 볼륨 상태 (처음 마운트되거나 탭 진입 시 자동 재생되지 않도록 항상 false로 시작)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_VOLUME);
      if (saved !== null) {
        const v = parseInt(saved, 10);
        return isNaN(v) ? 80 : v;
      }
    } catch {}
    return 80;
  });
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_MUTED) === 'true';
    } catch {
      return false;
    }
  });
  const [isLoopAll, setIsLoopAll] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_LOOP) !== 'single';
    } catch {
      return true;
    }
  });

  // 4. 🎚️ 영상 재생 진행바 관련 상태 (현재 재생 시간 및 전체 길이)
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isSeeking, setIsSeeking] = useState<boolean>(false);

  // 5. 재생목록 편집 모달 상태
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newUrl, setNewUrl] = useState<string>('');
  const [addError, setAddError] = useState<string | null>(null);

  // 인라인 수정 상태 (수정 중인 곡 ID)
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editUrl, setEditUrl] = useState<string>('');

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // 현재 유효한 트랙
  const safeIndex = playlist.length > 0 ? Math.min(Math.max(0, currentIndex), playlist.length - 1) : 0;
  const currentTrack = playlist[safeIndex] || null;
  const currentTrackRef = useRef(currentTrack);
  currentTrackRef.current = currentTrack;

  // 🎵 내 MP3 파일 재생 (유튜브 대신 <audio>)
  const isFile = currentTrack?.kind === 'file';
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [fileUrl, setFileUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    let url = '';
    let alive = true;
    setFileUrl('');
    if (isFile && currentTrack?.fileId) {
      void getAudio(currentTrack.fileId).then((b) => {
        if (!alive || !b) return;
        url = URL.createObjectURL(b);
        setFileUrl(url);
      });
    }
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [isFile, currentTrack?.fileId]);

  // postMessage 명령 전송 헬퍼 (내 파일이면 <audio>로)
  const sendPlayerCommand = (command: string, args: any[] = []) => {
    if (currentTrackRef.current?.kind === 'file') {
      const a = audioRef.current;
      if (!a) return;
      if (command === 'playVideo') void a.play().catch(() => {});
      else if (command === 'pauseVideo') a.pause();
      else if (command === 'seekTo') a.currentTime = Number(args[0]) || 0;
      else if (command === 'setVolume') a.volume = Math.max(0, Math.min(1, Number(args[0]) / 100));
      else if (command === 'mute') a.muted = true;
      else if (command === 'unMute') a.muted = false;
      return;
    }
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
        console.warn('🟡 [CleanBgmPlayer] postMessage 실패:', err);
      }
    }
  };

  // 🛑 [요청 1] 청소종례 모드에서 다른 모드로 전환되면 음악 즉시 멈춤 & 다시 돌아왔을 때 자동 재생 방지
  useEffect(() => {
    if (!isActiveTab) {
      sendPlayerCommand('pauseVideo');
      setIsPlaying(false);
    }
  }, [isActiveTab]);

  // ▶ 자동 재생이 켜져 있으면: 이 화면이 켜질 때 (영상이 준비될 때까지 몇 번 다시 시도) 음악을 틀어요
  const autoTriedRef = useRef(false);
  useEffect(() => {
    if (!isActiveTab) {
      autoTriedRef.current = false;
      return;
    }
    if (!autoPlay || autoTriedRef.current || !currentTrackRef.current) return;
    autoTriedRef.current = true;
    const timers = [600, 1600, 3200, 5200].map((ms) =>
      window.setTimeout(() => {
        if (!currentTrackRef.current) return;
        setIsPlaying(true);
        sendPlayerCommand('unMute');
        sendPlayerCommand('setVolume', [volume]);
        sendPlayerCommand('playVideo');
      }, ms)
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [isActiveTab, autoPlay, playlist.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // 언마운트 시 확실한 음악 일시정지 정리
  useEffect(() => {
    return () => {
      sendPlayerCommand('pauseVideo');
    };
  }, []);

  // 🛑 [요청 2] 타이머가 완료되면 음악 자동 멈춤 (cleanTimerSeconds <= 0)
  //    타이머가 흘러가다가 0이 되는 '그 순간'에만 멈춰요.
  //    (예전엔 타이머가 0인 상태 — 시작 전 · 끝난 뒤 — 에서 ▶를 누르면 바로 다시 멈춰서 음악이 안 나왔어요)
  const prevCleanSecRef = useRef<number | undefined>(cleanTimerSeconds);
  useEffect(() => {
    const prev = prevCleanSecRef.current;
    prevCleanSecRef.current = cleanTimerSeconds;
    if (cleanTimerSeconds === undefined || prev === undefined) return;
    if (prev > 0 && cleanTimerSeconds <= 0) {
      console.log('🔔 [CleanBgmPlayer] 청소 타이머 종료로 음악 자동 멈춤');
      sendPlayerCommand('pauseVideo');
      setIsPlaying(false);
    }
  }, [cleanTimerSeconds]); // eslint-disable-line react-hooks/exhaustive-deps

  // 📡 유튜브 IFrame API postMessage 이벤트 리스너 (재생 시간 및 상태 수신)
  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data) return;

        // infoDelivery 이벤트 수신
        if (data.event === 'infoDelivery' && data.info) {
          if (typeof data.info.currentTime === 'number' && !isSeeking) {
            setCurrentTime(data.info.currentTime);
          }
          if (typeof data.info.duration === 'number' && data.info.duration > 0) {
            setDuration(data.info.duration);
          }
          if (typeof data.info.playerState === 'number') {
            // 1: PLAYING, 2: PAUSED, 0: ENDED
            if (data.info.playerState === 1) {
              setIsPlaying(true);
            } else if (data.info.playerState === 2) {
              setIsPlaying(false);
            } else if (data.info.playerState === 0) {
              // 한 곡 종료 시
              if (!isLoopAll) {
                // 한 곡 반복: 다시 0초부터 재생
                sendPlayerCommand('seekTo', [0, true]);
                sendPlayerCommand('playVideo');
              } else {
                // 전곡 반복: 다음 곡으로 자동 이동
                handleNextTrack();
              }
            }
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [isSeeking, isLoopAll, playlist.length, safeIndex]);

  // ⏱️ 재생 중일 때 주기적으로 시간 갱신 및 listening 상태 유지
  useEffect(() => {
    if (!isPlaying || isFile) return;

    // iframe에 listening 등록
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*');
    }

    const interval = setInterval(() => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*');
      }
      if (!isSeeking) {
        setCurrentTime((prev) => (duration > 0 ? Math.min(duration, prev + 1) : prev + 1));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, isSeeking, duration, isFile]);

  // 트랙 변경 시: 사용자가 재생 중이었을 때만 새 곡 재생, 아니면 대기
  useEffect(() => {
    setCurrentTime(0);
    if (currentTrack && isPlaying) {
      const timer = setTimeout(() => {
        sendPlayerCommand('setVolume', [isMuted ? 0 : volume]);
        if (isMuted) {
          sendPlayerCommand('mute');
        } else {
          sendPlayerCommand('unMute');
        }
        sendPlayerCommand('playVideo');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentTrack?.id, fileUrl]);

  // 재생 / 일시정지 토글
  const handleTogglePlay = () => {
    if (!currentTrack) return;
    if (isPlaying) {
      sendPlayerCommand('pauseVideo');
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      sendPlayerCommand('unMute');
      sendPlayerCommand('setVolume', [volume]);
      sendPlayerCommand('playVideo');
    }
  };

  // 이전 곡
  const handlePrevTrack = () => {
    if (playlist.length <= 1) return;
    const nextIdx = (safeIndex - 1 + playlist.length) % playlist.length;
    setCurrentIndex(nextIdx);
    setCurrentTime(0);
    localStorage.setItem(STORAGE_KEY_CURRENT_IDX, String(nextIdx));
  };

  // 다음 곡
  const handleNextTrack = () => {
    if (playlist.length <= 1) return;
    const nextIdx = (safeIndex + 1) % playlist.length;
    setCurrentIndex(nextIdx);
    setCurrentTime(0);
    localStorage.setItem(STORAGE_KEY_CURRENT_IDX, String(nextIdx));
  };

  // 🎚️ [요청 4] 재생 구간 탐색 (Seek) 핸들러
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
  };

  const handleSeekCommit = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    setIsSeeking(false);
    const target = e.currentTarget as HTMLInputElement;
    const newTime = Number(target.value);
    sendPlayerCommand('seekTo', [newTime, true]);
  };

  // 볼륨 조절
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseInt(e.target.value, 10);
    setVolume(newVol);
    try {
      localStorage.setItem(STORAGE_KEY_VOLUME, String(newVol));
    } catch {}
    if (isMuted && newVol > 0) {
      setIsMuted(false);
      localStorage.setItem(STORAGE_KEY_MUTED, 'false');
      sendPlayerCommand('unMute');
    }
    sendPlayerCommand('setVolume', [newVol]);
  };

  // 음소거 토글
  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    try {
      localStorage.setItem(STORAGE_KEY_MUTED, String(next));
    } catch {}
    if (next) {
      sendPlayerCommand('mute');
    } else {
      sendPlayerCommand('unMute');
      sendPlayerCommand('setVolume', [volume]);
    }
  };

  // 반복 모드 토글
  const handleToggleLoop = () => {
    const next = !isLoopAll;
    setIsLoopAll(next);
    try {
      localStorage.setItem(STORAGE_KEY_LOOP, next ? 'all' : 'single');
    } catch {}
  };

  // 📝 새 트랙 추가
  const handleAddTrack = () => {
    setAddError(null);
    if (!newUrl.trim()) {
      setAddError('유튜브 링크를 입력해주세요.');
      return;
    }
    const vid = extractYouTubeVideoId(newUrl);
    if (!vid) {
      setAddError('올바른 유튜브 링크 또는 11자리 비디오 ID를 입력해주세요.');
      return;
    }

    const title = newTitle.trim() || `유튜브 음악 (${vid})`;
    const newEntry: CleanMusicTrack = {
      id: `clean_${Date.now()}`,
      title,
      url: newUrl.trim(),
      videoId: vid,
    };

    const updated = [...playlist, newEntry];
    setPlaylist(updated);
    try {
      localStorage.setItem(STORAGE_KEY_PLAYLIST, JSON.stringify(updated));
    } catch {}

    setNewTitle('');
    setNewUrl('');
    setAddError(null);
  };

  // 🗑️ 트랙 삭제
  const handleDeleteTrack = (id: string) => {
    const gone = playlist.find((t) => t.id === id);
    if (gone?.kind === 'file' && gone.fileId) void delAudio(gone.fileId);
    const updated = playlist.filter((t) => t.id !== id);
    setPlaylist(updated);
    try {
      localStorage.setItem(STORAGE_KEY_PLAYLIST, JSON.stringify(updated));
    } catch {}

    if (safeIndex >= updated.length) {
      const nextIdx = Math.max(0, updated.length - 1);
      setCurrentIndex(nextIdx);
      localStorage.setItem(STORAGE_KEY_CURRENT_IDX, String(nextIdx));
    }
  };

  // 🎵 내 MP3 · 음악 파일 추가 (여러 개 한 번에)
  const handleAddFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const added: CleanMusicTrack[] = [];
    for (const f of Array.from(files)) {
      if (!/^audio\//.test(f.type) && !/\.(mp3|m4a|wav|ogg|aac|flac)$/i.test(f.name)) continue;
      if (f.size > 120 * 1024 * 1024) {
        setAddError(`'${f.name}' 파일이 너무 커요 (120MB까지).`);
        continue;
      }
      const fid = `aud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      try {
        await putAudio(fid, f);
        added.push({ id: `file_${fid}`, title: f.name.replace(/\.[^.]+$/, ''), url: '', videoId: '', kind: 'file', fileId: fid });
      } catch {
        setAddError('파일을 저장하지 못했어요. 저장 공간을 확인해 주세요.');
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!added.length) {
      if (!addError) setAddError('MP3 · M4A · WAV 같은 음악 파일을 골라 주세요.');
      return;
    }
    const updated = [...playlist, ...added];
    setPlaylist(updated);
    try {
      localStorage.setItem(STORAGE_KEY_PLAYLIST, JSON.stringify(updated));
    } catch {}
    setAddError(null);
  };

  // ✏️ 트랙 수정 저장
  const handleSaveEditTrack = (id: string) => {
    const target = playlist.find((t) => t.id === id);
    if (target?.kind === 'file') {
      const updated = playlist.map((t) => (t.id === id ? { ...t, title: editTitle.trim() || t.title } : t));
      setPlaylist(updated);
      try {
        localStorage.setItem(STORAGE_KEY_PLAYLIST, JSON.stringify(updated));
      } catch {}
      setEditingTrackId(null);
      return;
    }
    const vid = extractYouTubeVideoId(editUrl);
    if (!vid) {
      alert('유효한 유튜브 링크를 입력해주세요.');
      return;
    }
    const updated = playlist.map((t) => {
      if (t.id === id) {
        return {
          ...t,
          title: editTitle.trim() || t.title,
          url: editUrl.trim(),
          videoId: vid,
        };
      }
      return t;
    });

    setPlaylist(updated);
    try {
      localStorage.setItem(STORAGE_KEY_PLAYLIST, JSON.stringify(updated));
    } catch {}
    setEditingTrackId(null);
  };

  // 🔄 기본 추천 목록으로 복원
  const handleResetToDefault = () => {
    if (confirm(`${label} 목록을 처음 목록으로 되돌릴까요?`)) {
      setPlaylist(defaultTracks);
      setCurrentIndex(0);
      setCurrentTime(0);
      try {
        localStorage.setItem(STORAGE_KEY_PLAYLIST, JSON.stringify(defaultTracks));
        localStorage.setItem(STORAGE_KEY_CURRENT_IDX, '0');
      } catch {}
    }
  };

  return (
    <>
      {/* 🚨 화면에는 보이지 않고 소리만 재생되는 오프스크린 싱글톤 YouTube iframe */}
      <div className="fixed -left-[9999px] -top-[9999px] w-[1px] h-[1px] opacity-0 pointer-events-none z-[-100]">
        {isFile && fileUrl && (
          <audio
            ref={audioRef}
            src={fileUrl}
            preload="auto"
            onLoadedMetadata={(e) => {
              setDuration(e.currentTarget.duration || 0);
              e.currentTarget.volume = (isMuted ? 0 : volume) / 100;
            }}
            onTimeUpdate={(e) => !isSeeking && setCurrentTime(e.currentTarget.currentTime)}
            onPlay={() => setIsPlaying(true)}
            onPause={(e) => !e.currentTarget.ended && setIsPlaying(false)}
            onEnded={(e) => {
              if (!isLoopAll || playlist.length <= 1) {
                e.currentTarget.currentTime = 0;
                void e.currentTarget.play().catch(() => {});
              } else handleNextTrack();
            }}
          />
        )}
        {currentTrack && !isFile && (
          <iframe
            ref={iframeRef}
            key={`clean_bgm_iframe_${currentTrack.videoId}`}
            src={`https://www.youtube.com/embed/${currentTrack.videoId}?autoplay=0&enablejsapi=1&origin=${encodeURIComponent(
              typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')
                ? window.location.origin
                : 'http://localhost:19283'
            )}&rel=0`}
            title="Clean dismissal background audio player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-[1px] h-[1px] border-0"
          />
        )}
      </div>

      {/* 🎧 작은 한 줄 플레이어 */}
      {compact && (
        <div
          className={`clean-mini-player w-full max-w-3xl mx-auto rounded-full pl-2 pr-3 py-1.5 border flex items-center gap-2 select-none relative overflow-hidden ${
            isLightMode ? 'bg-white/90 border-emerald-200 text-slate-700 shadow-sm' : 'bg-slate-900/80 border-emerald-500/30 text-slate-200'
          }`}
          data-clean-mini
        >
          <span
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              isPlaying ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white' : isLightMode ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {isPlaying ? (
              <span className="flex items-end gap-[2px] h-3">
                <i className="w-[3px] bg-white rounded-full animate-bounce h-2" />
                <i className="w-[3px] bg-white rounded-full animate-bounce [animation-delay:-0.2s] h-3" />
                <i className="w-[3px] bg-white rounded-full animate-bounce [animation-delay:-0.4s] h-2.5" />
              </span>
            ) : (
              <Music className="w-4 h-4" />
            )}
          </span>
          <div className="min-w-0 flex-1 text-left">
            <div className="text-[11px] font-black truncate">{currentTrack ? currentTrack.title : `${label}을 추가해 주세요 (유튜브 · 내 MP3)`}</div>
            <div className="text-[9.5px] font-bold opacity-60 tabular-nums">
              {isFile ? '💿' : '🎵'} {label} {playlist.length ? `${safeIndex + 1}/${playlist.length}` : ''} · {formatMediaTime(currentTime)}
              {duration > 0 ? ` / ${formatMediaTime(duration)}` : ''}
            </div>
          </div>
          <button type="button" onClick={handlePrevTrack} disabled={playlist.length <= 1} className="p-1.5 rounded-full hover:bg-emerald-500/10 disabled:opacity-30 cursor-pointer" title="이전 곡">
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleTogglePlay}
            disabled={!currentTrack}
            className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-sm cursor-pointer disabled:opacity-40"
            title={isPlaying ? '일시정지' : '재생'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white ml-0.5" />}
          </button>
          <button type="button" onClick={handleNextTrack} disabled={playlist.length <= 1} className="p-1.5 rounded-full hover:bg-emerald-500/10 disabled:opacity-30 cursor-pointer" title="다음 곡">
            <SkipForward className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={handleToggleMute} className={`p-1.5 rounded-full cursor-pointer ${isMuted ? 'text-rose-500' : 'hover:bg-emerald-500/10'}`} title={isMuted ? '소리 켜기' : '음소거'}>
            {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-14 accent-emerald-500 cursor-pointer h-1 hidden sm:block"
            title={`볼륨 ${volume}%`}
          />
          <button type="button" onClick={() => setIsModalOpen(true)} className="p-1.5 rounded-full hover:bg-emerald-500/10 cursor-pointer" title="음악 목록">
            <ListMusic className="w-3.5 h-3.5" />
          </button>
          {showAutoToggle && (
            <button
              type="button"
              onClick={toggleAutoPlay}
              className={`bgm-auto-toggle ${autoPlay ? 'is-on' : ''}`}
              title={autoPlay ? '자동 재생: 이 화면이 켜지면 음악이 저절로 나와요 (누르면 수동)' : '수동 재생: ▶를 눌러야 음악이 나와요 (누르면 자동)'}
              aria-pressed={autoPlay}
              data-bgm-auto={storeKey}
            >
              {autoPlay ? '자동 ▶' : '수동'}
            </button>
          )}
          {duration > 0 && (
            <span className="absolute left-0 bottom-0 h-[3px] bg-emerald-400/70 rounded-full" style={{ width: `${Math.min(100, (currentTime / duration) * 100)}%` }} />
          )}
        </div>
      )}

      {!compact && (
      <>
      {/* 🎧 메인 컨트롤 바 (청소·종례 모드 중앙에 미려하게 렌더링) */}
      <div
        className={`w-full max-w-5xl mx-auto rounded-3xl p-3.5 sm:p-5 border transition-all duration-300 shadow-xl flex flex-col gap-3 select-none ${
          isLightMode
            ? 'bg-white/95 backdrop-blur-md border-emerald-200/90 text-slate-800 shadow-emerald-500/5'
            : 'bg-slate-900/90 backdrop-blur-md border-emerald-500/40 text-white shadow-emerald-950/20'
        }`}
      >
        {/* 상단 1열: 곡 정보 | 중앙 컨트롤 버튼 | 볼륨 & 목록 */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 w-full">
          {/* 1) 좌측: 음악 재생 상태 & 곡명 정보 */}
          <div className="flex items-center gap-3 min-w-0 w-full md:w-auto">
            {/* 사운드 애니메이션 웨이브 아이콘 */}
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                isPlaying
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/30'
                  : isLightMode
                  ? 'bg-slate-100 text-slate-400'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              {isPlaying ? (
                <div className="flex items-end gap-0.5 h-4">
                  <span className="w-1 bg-white rounded-full animate-bounce [animation-delay:-0.3s] h-3" />
                  <span className="w-1 bg-white rounded-full animate-bounce [animation-delay:-0.1s] h-4" />
                  <span className="w-1 bg-white rounded-full animate-bounce [animation-delay:-0.4s] h-2.5" />
                  <span className="w-1 bg-white rounded-full animate-bounce h-3.5" />
                </div>
              ) : (
                <Music className="w-5 h-5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span>🎵</span>
                  <span>청소시간 BGM</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {safeIndex + 1} / {playlist.length}
                </span>
                {currentTrack && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-black/20 text-slate-400 font-mono hidden sm:inline">
                    ID: {currentTrack.videoId}
                  </span>
                )}
              </div>

              <div className="text-xs sm:text-sm font-black truncate mt-0.5" title={currentTrack?.title || '곡 없음'}>
                {currentTrack ? currentTrack.title : '등록된 청소 음악이 없습니다.'}
              </div>
            </div>
          </div>

          {/* 2) 중앙: 재생 컨트롤 버튼 그룹 */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* 이전 곡 */}
            <button
              type="button"
              onClick={handlePrevTrack}
              disabled={playlist.length <= 1}
              className={`p-2 rounded-xl border transition cursor-pointer active:scale-95 disabled:opacity-30 ${
                isLightMode
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
              title="이전 곡"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {/* 재생 / 일시정지 */}
            <button
              type="button"
              onClick={handleTogglePlay}
              disabled={!currentTrack}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-500/25 transition cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-white" />
                  <span>일시정지</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                  <span>음악 재생</span>
                </>
              )}
            </button>

            {/* 다음 곡 */}
            <button
              type="button"
              onClick={handleNextTrack}
              disabled={playlist.length <= 1}
              className={`p-2 rounded-xl border transition cursor-pointer active:scale-95 disabled:opacity-30 ${
                isLightMode
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
              title="다음 곡"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* 전곡 순환 / 한 곡 반복 토글 */}
            <button
              type="button"
              onClick={handleToggleLoop}
              className={`p-2 rounded-xl border transition cursor-pointer active:scale-95 ${
                isLoopAll
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : isLightMode
                  ? 'bg-slate-100 border-slate-200 text-slate-400'
                  : 'bg-slate-800 border-slate-700 text-slate-500'
              }`}
              title={isLoopAll ? '전체 곡 순환 재생' : '한 곡 반복 재생'}
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          {/* 3) 우측: 볼륨 조절 슬라이더 및 재생목록 편집 버튼 */}
          <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto justify-end">
            {/* 볼륨 & 음소거 */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleToggleMute}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  isMuted
                    ? 'text-rose-400 hover:bg-rose-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
                title={isMuted ? '음소거 해제' : '음소거'}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 sm:w-20 accent-emerald-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                title={`볼륨: ${volume}%`}
              />
              <span className="text-[11px] font-mono font-bold text-slate-400 w-7 text-right">
                {isMuted ? '0%' : `${volume}%`}
              </span>
            </div>

            {/* 📝 재생목록 모달 토글 버튼 */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <ListMusic className="w-3.5 h-3.5" />
              <span>음악 목록 ({playlist.length})</span>
            </button>
          </div>
        </div>

        {/* ========================================================== */}
        {/* 🎚️ [요청 4] 영상 재생구간 선택 진행바 (음악 재생 버튼 바로 아래) */}
        {/* ========================================================== */}
        <div className="w-full flex items-center gap-2.5 pt-2 border-t border-white/10 sm:border-slate-800">
          {/* 현재 재생 시간 */}
          <span className="font-mono text-[11px] font-black text-emerald-400 w-11 text-right shrink-0">
            {formatMediaTime(currentTime)}
          </span>

          {/* 슬라이더 진행바 */}
          <div className="relative flex-1 flex items-center group">
            <input
              type="range"
              min={0}
              max={duration > 0 ? duration : 100}
              step={1}
              value={currentTime}
              onMouseDown={() => setIsSeeking(true)}
              onTouchStart={() => setIsSeeking(true)}
              onChange={handleSeekChange}
              onMouseUp={handleSeekCommit}
              onTouchEnd={handleSeekCommit}
              disabled={!currentTrack}
              className="w-full h-2 bg-slate-700/80 rounded-lg appearance-none cursor-pointer accent-emerald-400 hover:accent-emerald-300 transition-all disabled:opacity-40"
              title="원하는 재생 구간을 클릭하거나 드래그하여 이동하세요"
            />
          </div>

          {/* 전체 트랙 길이 */}
          <span className="font-mono text-[11px] font-bold text-slate-400 w-11 shrink-0">
            {duration > 0 ? formatMediaTime(duration) : '--:--'}
          </span>
        </div>
      </div>
      </>
      )}

      {/* ========================================================================= */}
      {/* 🎵 재생목록 관리 및 유튜브 링크 추가/수정 모달 */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in select-none">
          <div
            className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${
              isLightMode ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-700 text-white'
            }`}
          >
            {/* 모달 헤더 */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <ListMusic className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                    <span>청소·종례 BGM 재생목록 관리</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                      총 {playlist.length}곡
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    유튜브 영상 링크를 등록하면 화면 없이 소리만 깔끔하게 재생됩니다.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 모달 본문 (스크롤) */}
            <div className="p-4 sm:p-5 overflow-y-auto custom-scroll space-y-4 flex-1">
              {/* 1) 새 유튜브 링크 추가 박스 */}
              <div
                className={`p-3.5 rounded-2xl border space-y-2.5 ${
                  isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-500 flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> 새 유튜브 음악 등록
                  </span>
                  <span className="text-[11px] text-slate-400">
                    일반 영상, 쇼츠, 공유 링크 모두 지원
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="곡 제목 (예: 활기찬 클래식 청소송)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold border border-slate-700 focus:outline-hidden focus:border-emerald-500"
                  />
                  <input
                    type="text"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="유튜브 URL (예: https://youtu.be/...)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold border border-slate-700 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                {addError && (
                  <p className="text-[11px] font-bold text-rose-400">⚠️ {addError}</p>
                )}

                <div className="flex justify-end gap-2 flex-wrap">
                  {/* 🎵 내 MP3 파일 (컴퓨터에 있는 음악) */}
                  <input ref={fileInputRef} type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac,.flac" multiple className="hidden" onChange={(e) => void handleAddFiles(e.target.files)} data-bgm-file-input />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md transition cursor-pointer flex items-center gap-1 active:scale-95"
                    title="내 컴퓨터의 MP3 · M4A · WAV 음악 파일을 넣어요 (여러 개 한 번에)"
                    data-bgm-add-file
                  >
                    💿 <span>내 MP3 파일 추가</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddTrack}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition cursor-pointer flex items-center gap-1 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>목록에 추가</span>
                  </button>
                </div>
              </div>

              {/* 2) 현재 등록된 재생목록 리스트 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
                  <span>등록된 음악 목록 (클릭하여 즉시 재생)</span>
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    className="text-[11px] text-slate-400 hover:text-amber-400 underline cursor-pointer"
                  >
                    처음 목록으로 되돌리기
                  </button>
                </div>

                {playlist.map((track, idx) => {
                  const isCurrent = idx === safeIndex;
                  const isEditing = editingTrackId === track.id;

                  return (
                    <div
                      key={track.id}
                      className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row items-center justify-between gap-2.5 ${
                        isCurrent
                          ? 'bg-emerald-500/15 border-emerald-500/60 shadow-md'
                          : isLightMode
                          ? 'bg-white hover:bg-slate-50 border-slate-200'
                          : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80'
                      }`}
                    >
                      {/* 인라인 수정 폼 */}
                      {isEditing ? (
                        <div className="w-full flex-1 space-y-2">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold border border-emerald-500"
                            placeholder="곡 제목"
                          />
                          <input
                            type="text"
                            value={editUrl}
                            onChange={(e) => setEditUrl(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold border border-emerald-500"
                            placeholder="유튜브 URL"
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingTrackId(null)}
                              className="px-2.5 py-1 rounded-lg bg-slate-700 text-white text-[11px] font-bold"
                            >
                              취소
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditTrack(track.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold"
                            >
                              저장
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* 트랙 정보 */}
                          <div
                            onClick={() => {
                              setCurrentIndex(idx);
                              setCurrentTime(0);
                              localStorage.setItem(STORAGE_KEY_CURRENT_IDX, String(idx));
                              setIsPlaying(true);
                            }}
                            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer w-full"
                          >
                            <span
                              className={`w-6 h-6 rounded-lg text-xs font-mono font-black flex items-center justify-center shrink-0 ${
                                isCurrent
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-slate-700 text-slate-300'
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs sm:text-sm font-black truncate flex items-center gap-1.5">
                                <span>{track.title}</span>
                                {isCurrent && (
                                  <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-emerald-500 text-white">
                                    선택됨
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-mono text-slate-400 truncate block">
                                {track.kind === 'file' ? '💿 내 음악 파일 (이 컴퓨터에 저장)' : `ID: ${track.videoId} · ${track.url}`}
                              </span>
                            </div>
                          </div>

                          {/* 버튼 그룹 */}
                          <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                            {/* 수정 버튼 */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTrackId(track.id);
                                setEditTitle(track.title);
                                setEditUrl(track.url);
                              }}
                              className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition cursor-pointer"
                              title="수정"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* 외부 링크 열기 */}
                            <a
                              href={track.url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
                              title="유튜브에서 원본 보기"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>

                            {/* 삭제 버튼 */}
                            <button
                              type="button"
                              onClick={() => handleDeleteTrack(track.id)}
                              disabled={playlist.length <= 1}
                              className="p-1.5 rounded-lg bg-slate-700 hover:bg-rose-600 text-slate-200 hover:text-white transition cursor-pointer disabled:opacity-30"
                              title="삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="p-4 border-t border-white/10 flex items-center justify-between shrink-0 bg-black/20">
              <span className="text-xs text-slate-400">
                💡 원하는 곡을 선택하면 즉시 배경 음악으로 전환됩니다.
              </span>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs transition cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
