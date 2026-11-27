import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Volume2,
  Settings,
  ArrowRight,
  Music,
  CheckCircle2,
  Maximize2,
  Type,
  Plus,
  Trash2,
  Edit2,
  Check,
  ListPlus,
  Radio,
  Sliders,
} from 'lucide-react';
import { ClassRole, Student, CleanBannerSettings } from '../types';
import { initialCleanBannerSettings } from '../data/initialData';
import { playSelectedChime, playCelebrateSound } from '../utils/audio';
import { broadcastDisplaySyncState } from './DualMonitorDisplayView';

interface NoticeItem {
  id: string;
  text: string;
  createdAt: string;
}

interface CleanDismissalModeViewProps {
  roles: ClassRole[];
  students: Student[];
  onExitCleanMode?: () => void;
  onSwitchToLesson?: () => void;
  onOpenSecondaryPopup?: () => void;
  onShowToast: (msg: string) => void;
}

export const CleanDismissalModeView: React.FC<CleanDismissalModeViewProps> = ({
  roles,
  students,
  onExitCleanMode,
  onSwitchToLesson,
  onOpenSecondaryPopup = () => {},
  onShowToast,
}) => {
  const handleExit = onSwitchToLesson || onExitCleanMode || (() => {});
  // 10-minute Clean Timer (600s)
  const [timeLeft, setTimeLeft] = useState<number>(600);
  const [isRunning, setIsRunning] = useState<boolean>(true);

  // Neon Marquee Banner Settings (요구사항: 디폴트 34초, 10~60초, 폰트 크기 및 네온효과 토글)
  const [neonColor, setNeonColor] = useState<'cyan' | 'pink' | 'yellow' | 'green'>(() => {
    try {
      const v = localStorage.getItem('clean_neon_color');
      if (v === 'cyan' || v === 'pink' || v === 'yellow' || v === 'green') return v;
    } catch {}
    return 'cyan';
  });
  // 💾 색도 기억해요 (보조 화면과 같은 저장소)
  useEffect(() => {
    try {
      localStorage.setItem('clean_neon_color', neonColor);
    } catch {}
  }, [neonColor]);
  const [bannerSpeed, setBannerSpeed] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('clean_banner_speed');
      if (saved) return Number(saved);
    } catch {}
    return 34; // 기본값 34초
  });
  const [neonGlowEnabled, setNeonGlowEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('clean_neon_glow');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true;
  });
  const [bannerFontSize, setBannerFontSize] = useState<'sm' | 'md' | 'lg' | 'xl'>(() => {
    try {
      const saved = localStorage.getItem('clean_banner_font_size');
      if (saved) return saved as 'sm' | 'md' | 'lg' | 'xl';
    } catch {}
    return 'md';
  });
  const [isBannerSettingsOpen, setIsBannerSettingsOpen] = useState<boolean>(false);

  // Interactive Announcements List with Enter-to-Add, Edit, Delete
  const [notices, setNotices] = useState<NoticeItem[]>(() => {
    const saved = localStorage.getItem('clean_dismissal_notices');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [
      { id: '1', text: '내일 1교시 체육복 착용 및 운동화 필수', createdAt: '오늘' },
      { id: '2', text: '수학익힘책 38~41쪽 숙제 해결해오기', createdAt: '오늘' },
      { id: '3', text: '자기 자리 주변 쓰레기 줍고 책상 서랍 정리하기', createdAt: '오늘' },
      { id: '4', text: '하교 시 우산 및 신발주머니 잘 챙겨가기', createdAt: '오늘' },
    ];
  });

  const [inputNotice, setInputNotice] = useState('');
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Sync to secondary monitor
  const syncToSecondary = (updates?: {
    timerSeconds?: number;
    isRunning?: boolean;
    speed?: number;
    color?: 'cyan' | 'pink' | 'yellow' | 'green';
    glow?: boolean;
    fontSize?: 'sm' | 'md' | 'lg' | 'xl';
    noticeList?: NoticeItem[];
  }) => {
    const validSecs =
      updates?.timerSeconds !== undefined && !isNaN(updates.timerSeconds)
        ? updates.timerSeconds
        : !isNaN(timeLeft) && timeLeft >= 0
        ? timeLeft
        : 600;

    broadcastDisplaySyncState({
      activeTab: 'clean',
      cleanTimerSeconds: validSecs,
      isCleanTimerRunning: updates?.isRunning !== undefined ? updates.isRunning : isRunning,
      cleanBannerSpeed: updates?.speed !== undefined ? updates.speed : bannerSpeed,
      cleanNeonColor: updates?.color !== undefined ? updates.color : neonColor,
      cleanNeonGlow: updates?.glow !== undefined ? updates.glow : neonGlowEnabled,
      cleanFontSize: updates?.fontSize !== undefined ? updates.fontSize : bannerFontSize,
      cleanNotices: updates?.noticeList !== undefined ? updates.noticeList : notices,
    });
  };

  // Initial and reactive sync
  useEffect(() => {
    syncToSecondary();
  }, [bannerSpeed, neonColor, neonGlowEnabled, bannerFontSize, notices]);

  // Listen to remote changes from secondary monitor
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const channel = new BroadcastChannel('class_display_sync_channel');
    channel.onmessage = (e) => {
      const data = e.data;
      if (data && typeof data.cleanTimerSeconds === 'number' && !isNaN(data.cleanTimerSeconds)) {
        setTimeLeft(data.cleanTimerSeconds);
      }
      if (data && typeof data.isCleanTimerRunning === 'boolean') {
        setIsRunning(data.isCleanTimerRunning);
      }
    };
    return () => channel.close();
  }, []);

  // 📝 보조 화면에서 고친 전광판 문구 · 설정을 바로 받아요 (다시 열어도 마지막 입력이 나오게)
  useEffect(() => {
    const on = (e: StorageEvent) => {
      try {
        if (e.key === 'clean_dismissal_notices' && e.newValue) setNotices(JSON.parse(e.newValue));
        if (e.key === 'clean_banner_speed' && e.newValue) setBannerSpeed(Number(e.newValue) || 34);
        if (e.key === 'clean_neon_color' && e.newValue && ['cyan', 'pink', 'yellow', 'green'].includes(e.newValue)) setNeonColor(e.newValue as any);
        if (e.key === 'clean_neon_glow' && e.newValue) setNeonGlowEnabled(e.newValue === 'true');
        if (e.key === 'clean_banner_font_size' && e.newValue) setBannerFontSize(e.newValue as any);
      } catch {}
    };
    window.addEventListener('storage', on);
    return () => window.removeEventListener('storage', on);
  }, []);

  // Save notices to localStorage
  const saveNotices = (updated: NoticeItem[]) => {
    setNotices(updated);
    localStorage.setItem('clean_dismissal_notices', JSON.stringify(updated));
    syncToSecondary({ noticeList: updated });
  };

  const handleAddNotice = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputNotice.trim()) return;

    const newItem: NoticeItem = {
      id: String(Date.now()),
      text: inputNotice.trim(),
      createdAt: '오늘',
    };
    const updated = [newItem, ...notices];
    saveNotices(updated);
    setInputNotice('');
    onShowToast('📋 새로운 알림장 안내사항이 등록되었습니다.');
  };

  const handleDeleteNotice = (id: string) => {
    const updated = notices.filter((n) => n.id !== id);
    saveNotices(updated);
    onShowToast('🗑️ 안내사항이 삭제되었습니다.');
  };

  const handleStartEdit = (item: NoticeItem) => {
    setEditingNoticeId(item.id);
    setEditingText(item.text);
  };

  const handleSaveEdit = (id: string) => {
    if (!editingText.trim()) return;
    const updated = notices.map((n) => (n.id === id ? { ...n, text: editingText.trim() } : n));
    saveNotices(updated);
    setEditingNoticeId(null);
    onShowToast('✏️ 안내사항이 수정되었습니다.');
  };

  // Filter cleaning roles
  const cleanRoles = roles.filter(
    (r) =>
      r.category === 'clean' ||
      r.title.includes('청소') ||
      r.title.includes('정리') ||
      r.title.includes('환기')
  );

  // Timer loop
  useEffect(() => {
    let timer: number;
    if (isRunning && timeLeft > 0) {
      timer = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            playCelebrateSound();
            syncToSecondary({ timerSeconds: 0, isRunning: false });
            onShowToast('🎉 10분 청소 및 교실 정돈이 완료되었습니다! 수고 많으셨습니다.');
            return 0;
          }
          const next = prev - 1;
          // Periodically sync every 5 seconds or on last 10 seconds
          if (next % 5 === 0 || next <= 10) {
            syncToSecondary({ timerSeconds: next, isRunning: true });
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, onShowToast]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleToggleRunning = () => {
    const nextRunning = !isRunning;
    setIsRunning(nextRunning);
    syncToSecondary({ isRunning: nextRunning, timerSeconds: timeLeft });
  };

  const handleReset = () => {
    setTimeLeft(600);
    setIsRunning(false);
    syncToSecondary({ timerSeconds: 600, isRunning: false });
    onShowToast('⏱️ 청소 타이머가 10분으로 초기화되었습니다.');
  };

  const handleAdjustTime = (delta: number) => {
    const next = Math.max(0, timeLeft + delta);
    setTimeLeft(next);
    syncToSecondary({ timerSeconds: next });
    onShowToast(`⏱️ 타이머 ${delta > 0 ? `+${delta}` : delta}초 조절`);
  };

  // 💡 [요구사항 1]: 번호 및 별표(★) 자동 삽입 완전 제거, 사용자가 입력한 순수 텍스트 1:1 디스플레이 목록
  const displayNotices = useMemo(() => {
    if (notices.length > 0) {
      return notices.map((n) => n.text.trim()).filter(Boolean);
    }
    return [
      '교실 청소 후 바르게 정돈하고 안전하게 하교합시다!',
      '선생님과 친구들에게 반갑게 인사해요',
      '오늘 하루도 참 잘했어요! 안전하게 귀가하세요',
    ];
  }, [notices]);

  // 💡 [요구사항 2]: 단일 항목 순차 롤링 (순환 디스플레이) 인덱스 및 키 관리
  const [currentNoticeIndex, setCurrentNoticeIndex] = useState<number>(0);
  const [marqueeCycleKey, setMarqueeCycleKey] = useState<number>(0);

  // 등록 목록 개수 변경 시 인덱스 유효성 안전 보정
  useEffect(() => {
    if (currentNoticeIndex >= displayNotices.length) {
      setCurrentNoticeIndex(0);
    }
  }, [displayNotices.length, currentNoticeIndex]);

  // 💡 [요구사항 2]: 텍스트 1개가 좌측 화면 밖으로 완전히 사라진 직후(애니메이션 1회 종료 시) 다음 항목으로 자동 전환
  const handleMarqueeAnimationEnd = () => {
    setCurrentNoticeIndex((prev) => (prev + 1) % displayNotices.length);
    setMarqueeCycleKey((prev) => prev + 1);
  };

  const currentMarqueeText = displayNotices[currentNoticeIndex % displayNotices.length] || '';

  const getNeonGlowClass = () => {
    if (!neonGlowEnabled) {
      switch (neonColor) {
        case 'pink':
          return 'text-pink-400';
        case 'yellow':
          return 'text-amber-300';
        case 'green':
          return 'text-emerald-400';
        case 'cyan':
        default:
          return 'text-cyan-400';
      }
    }
    switch (neonColor) {
      case 'pink':
        return 'neon-glow-pink';
      case 'yellow':
        return 'neon-glow-yellow';
      case 'green':
        return 'neon-glow-green';
      case 'cyan':
      default:
        return 'neon-glow-cyan';
    }
  };

  const getFontSizeClass = () => {
    switch (bannerFontSize) {
      case 'sm':
        return 'text-lg sm:text-xl';
      case 'lg':
        return 'text-3xl sm:text-4xl';
      case 'xl':
        return 'text-4xl sm:text-5xl';
      case 'md':
      default:
        return 'text-2xl sm:text-3xl';
    }
  };

  const getNeonBorderClass = () => {
    if (!neonGlowEnabled) return 'border-slate-800';
    switch (neonColor) {
      case 'pink':
        return 'neon-border-pink';
      case 'cyan':
      default:
        return 'neon-border-cyan';
    }
  };

  return (
    <div className="w-full bg-slate-950 text-white rounded-3xl p-5 sm:p-7 shadow-2xl border-2 border-emerald-500/30 flex flex-col gap-5 animate-fade-in">
      {/* Top Controller Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg">
            🧹
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-lg sm:text-xl text-white">
                교실 청소 & 종례 자치 모드
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                10분 집중 정돈
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              책상·서랍 정리, 자기자리 빗자루 쓸기, 1인 1역할 청소 구역을 마무리하고 하교 준비를 합니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBannerSettingsOpen(!isBannerSettingsOpen)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
          >
            <Type className="w-3.5 h-3.5 text-amber-400" />
            <span>네온 전광판 설정</span>
          </button>

          <button
            onClick={onOpenSecondaryPopup}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>보조 모니터</span>
          </button>

          <button
            onClick={handleExit}
            className="px-3.5 py-1.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-black transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
          >
            <span>수업 모드로 전환</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Enlarged Top Marquee Banner with Right-to-Left Neon Sign Glow (요구사항 12: 배너 크기 확대 및 네온사인 효과) */}
      <div
        className={`w-full h-24 sm:h-28 rounded-3xl overflow-hidden bg-slate-950/95 border-2 relative px-5 flex items-center shadow-2xl transition-all ${getNeonBorderClass()}`}
      >
        {/* Neon Badge Indicator */}
        <div className="flex items-center gap-2 mr-5 shrink-0 z-10 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-2xl shadow-md">
          <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
          <span className="text-xs font-black tracking-wider text-slate-200 uppercase">
            LIVE 알림 전광판
          </span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 tabular-nums">
            {displayNotices.length > 0 ? `${(currentNoticeIndex % displayNotices.length) + 1} / ${displayNotices.length}` : '1 / 1'}
          </span>
        </div>

        {/* 💡 [요구사항 2]: 단일 항목 순차 롤링 트랙 (현재 순번의 목록 1개만 우측에서 좌측으로 흐름) */}
        <div className="overflow-hidden whitespace-nowrap flex-1 relative flex items-center h-full">
          <div
            key={`clean-marquee-${currentNoticeIndex}-${marqueeCycleKey}`}
            onAnimationEnd={handleMarqueeAnimationEnd}
            className={`font-black tracking-widest inline-block select-none animate-marquee-single ${getFontSizeClass()} ${getNeonGlowClass()}`}
            style={{
              animationDuration: `${bannerSpeed}s`,
            }}
          >
            {currentMarqueeText}
          </div>
        </div>
      </div>

      {/* Banner Customizer Drawer (네온 컬러, 폰트 크기, 네온 ON/OFF, 속도 10-60초 및 알림장 통합 관리) */}
      {isBannerSettingsOpen && (
        <div className="p-5 bg-slate-900/95 rounded-2xl border border-slate-800 space-y-4 text-xs animate-fade-in shadow-2xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-amber-400" />
              <h3 className="font-extrabold text-sm text-white">
                네온 전광판 및 하교 알림장 통합 설정
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsBannerSettingsOpen(false)}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg transition cursor-pointer"
            >
              설정 완료 닫기
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. 네온 컬러 테마 */}
            <div>
              <label className="font-bold text-slate-400 block mb-1.5">네온 컬러 테마</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'cyan', label: '네온 시안', color: '#00f0ff' },
                  { id: 'pink', label: '네온 핑크', color: '#ff2a8d' },
                  { id: 'yellow', label: '네온 골드', color: '#ffd000' },
                  { id: 'green', label: '네온 라임', color: '#39ff14' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setNeonColor(c.id as any);
                      syncToSecondary({ color: c.id as any });
                    }}
                    className={`p-2 rounded-xl border flex items-center gap-2 font-bold transition cursor-pointer ${
                      neonColor === c.id ? 'border-white bg-slate-800 shadow-sm' : 'border-slate-800 bg-slate-950'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="text-[11px] text-slate-300">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. 네온 효과 켜기/끄기 & 폰트 크기 */}
            <div className="space-y-3">
              <div>
                <label className="font-bold text-slate-400 block mb-1.5">네온 발광 효과 (ON / OFF)</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setNeonGlowEnabled(true);
                      localStorage.setItem('clean_neon_glow', 'true');
                      syncToSecondary({ glow: true });
                    }}
                    className={`p-2 rounded-xl border font-bold text-center transition cursor-pointer text-xs ${
                      neonGlowEnabled
                        ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    ✨ 네온 발광 ON
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNeonGlowEnabled(false);
                      localStorage.setItem('clean_neon_glow', 'false');
                      syncToSecondary({ glow: false });
                    }}
                    className={`p-2 rounded-xl border font-bold text-center transition cursor-pointer text-xs ${
                      !neonGlowEnabled
                        ? 'border-amber-500 bg-amber-950/60 text-amber-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    💡 일반 텍스트 OFF
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-400 block mb-1.5">전광판 글자 크기</label>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { id: 'sm', label: '작게' },
                    { id: 'md', label: '보통' },
                    { id: 'lg', label: '크게' },
                    { id: 'xl', label: '특대' },
                  ].map((size) => (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => {
                        setBannerFontSize(size.id as any);
                        localStorage.setItem('clean_banner_font_size', size.id);
                        syncToSecondary({ fontSize: size.id as any });
                      }}
                      className={`py-1.5 rounded-lg border font-bold text-center transition cursor-pointer text-[11px] ${
                        bannerFontSize === size.id
                          ? 'border-white bg-slate-800 text-white shadow-xs'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. 전광판 흘러가는 속도: 디폴트 34초, 최저 10초 ~ 최대 60초 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-400">전광판 이동 속도 (10초~60초)</label>
                <button
                  type="button"
                  onClick={() => {
                    setBannerSpeed(34);
                    localStorage.setItem('clean_banner_speed', '34');
                    syncToSecondary({ speed: 34 });
                  }}
                  className="text-[10px] text-emerald-400 hover:underline cursor-pointer"
                >
                  기본값(34초) 복원
                </button>
              </div>
              <div className="flex items-center gap-3 mt-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <input
                  type="range"
                  min={10}
                  max={60}
                  value={bannerSpeed}
                  onChange={(e) => {
                    const sp = Number(e.target.value);
                    setBannerSpeed(sp);
                    localStorage.setItem('clean_banner_speed', String(sp));
                    syncToSecondary({ speed: sp });
                  }}
                  className="flex-1 accent-emerald-400 cursor-pointer"
                />
                <span className="font-mono text-emerald-400 font-bold text-sm shrink-0">{bannerSpeed}초 순환</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5">
                * 초가 작을수록 빠르게 지나가며, 기본값은 34초입니다.
              </p>
            </div>
          </div>

          {/* 알림장 & 하교 안내사항 편집 섹션 (네온 전광판과 실시간 연동) */}
          <div className="pt-3 border-t border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListPlus className="w-4 h-4 text-amber-400" />
                <span className="font-extrabold text-xs text-slate-200">
                  알림장 & 하교 안내사항 목록 ({notices.length}개 등록됨)
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                추가된 항목이 상단 전광판에 순서대로 1개씩 순환하며 실시간으로 흐릅니다.
              </span>
            </div>

            {/* Input Form */}
            <form onSubmit={handleAddNotice} className="flex items-center gap-2">
              <input
                type="text"
                value={inputNotice}
                onChange={(e) => setInputNotice(e.target.value)}
                placeholder="새 알림장 항목 입력 후 [Enter]를 누르세요..."
                className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 font-semibold outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition cursor-pointer shrink-0 flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>추가</span>
              </button>
            </form>

            {/* List */}
            <div className="max-h-48 overflow-y-auto custom-scroll space-y-1.5 pr-1">
              {notices.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs">
                  등록된 알림장 안내사항이 없습니다. 위 입력창에 입력 후 추가하세요.
                </div>
              ) : (
                notices.map((notice, idx) => (
                  <div
                    key={notice.id}
                    className="p-2.5 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-between gap-2 text-xs transition"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-black shrink-0">
                        {idx + 1}
                      </span>
                      {editingNoticeId === notice.id ? (
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(notice.id);
                          }}
                          autoFocus
                          className="flex-1 px-2 py-1 bg-slate-950 border border-amber-400 rounded-lg text-white font-semibold outline-none"
                        />
                      ) : (
                        <span className="text-slate-200 font-medium break-all">
                          {notice.text}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {editingNoticeId === notice.id ? (
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(notice.id)}
                          className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                          title="저장"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(notice)}
                          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 cursor-pointer"
                          title="수정"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteNotice(notice.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 cursor-pointer"
                        title="삭제"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 하단 2분할 레이아웃: 왼쪽 타이머 (시간 임의 조절 5버튼 포함) + 오른쪽 1인 1역할 청소 담당 현황 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        {/* Left: 10-Minute Cleaning Timer with 5 Adjustment Buttons */}
        <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 flex flex-col justify-between gap-5 shadow-inner text-center">
          <div>
            <div className="text-xs font-bold text-emerald-400 tracking-wider uppercase mb-1">
              청소 및 하교 집중 카운트다운 타이머
            </div>
            <div className="font-mono text-7xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-300 tabular-nums my-3 drop-shadow-sm">
              {formatTime(timeLeft)}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, ((600 - timeLeft) / 600) * 100))}%` }}
              />
            </div>
          </div>

          {/* 5개 임의 시간 조절 버튼 (-1분, -10초, +10초, +1분, 리셋) */}
          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80">
            <div className="text-[11px] font-bold text-slate-400 mb-2 flex items-center justify-center gap-1">
              <span>⏱️ 타이머 시간 임의 조절</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => handleAdjustTime(-60)}
                className="py-2 px-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-mono font-bold text-xs transition active:scale-95 cursor-pointer border border-slate-700/80 shadow-xs"
                title="1분 감소"
              >
                -1분
              </button>

              <button
                type="button"
                onClick={() => handleAdjustTime(-10)}
                className="py-2 px-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-mono font-bold text-xs transition active:scale-95 cursor-pointer border border-slate-700/80 shadow-xs"
                title="10초 감소"
              >
                -10초
              </button>

              <button
                type="button"
                onClick={() => handleAdjustTime(10)}
                className="py-2 px-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-emerald-200 font-mono font-bold text-xs transition active:scale-95 cursor-pointer border border-slate-700/80 shadow-xs"
                title="10초 추가"
              >
                +10초
              </button>

              <button
                type="button"
                onClick={() => handleAdjustTime(60)}
                className="py-2 px-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-emerald-200 font-mono font-bold text-xs transition active:scale-95 cursor-pointer border border-slate-700/80 shadow-xs"
                title="1분 추가"
              >
                +1분
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="py-2 px-1 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 font-bold text-xs transition active:scale-95 cursor-pointer border border-rose-800/60 shadow-xs flex items-center justify-center gap-1"
                title="기본 10분으로 초기화"
              >
                <RotateCcw className="w-3 h-3" />
                <span>리셋</span>
              </button>
            </div>
          </div>

          {/* 메인 실행/정지 및 종소리 버튼 */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleToggleRunning}
              className={`py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer ${
                isRunning
                  ? 'bg-amber-500 hover:bg-amber-600 text-amber-950'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isRunning ? '일시 정지' : '청소 타이머 시작'}</span>
            </button>

            <button
              onClick={() => {
                playSelectedChime('school_4tone');
                onShowToast('🔔 정돈 안내 종소리가 재생되었습니다.');
              }}
              className="py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-md"
            >
              <Music className="w-4 h-4" />
              <span>정돈 종소리 울리기</span>
            </button>
          </div>
        </div>

        {/* Right: 1인 1역할 청소 담당 현황 */}
        <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 flex flex-col justify-between gap-3 shadow-inner">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="font-extrabold text-sm text-slate-200">
                1인 1역할 청소 담당 현황
              </h3>
            </div>
            <span className="text-[11px] font-bold text-slate-400">
              {cleanRoles.length}개 구역
            </span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto custom-scroll pr-1">
            {cleanRoles.map((role) => {
              const assignedMembers = role.currentStudentIds
                .map((id) => students.find((s) => s.id === id)?.name)
                .filter(Boolean);

              return (
                <div
                  key={role.id}
                  className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-extrabold text-xs text-emerald-300 flex items-center gap-1.5 truncate">
                      <span>{role.title}</span>
                      <span className="text-[10px] text-slate-400 font-normal truncate">
                        ({role.description})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {assignedMembers.length > 0 ? (
                        assignedMembers.map((name, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-950/80 text-emerald-300 border border-emerald-800 rounded-md flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                            {name}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">공석</span>
                      )}
                    </div>
                  </div>

                  <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded-md shrink-0">
                    {role.currentStudentIds.length}/{role.maxCount}명
                  </span>
                </div>
              );
            })}
          </div>

          <div className="p-2 bg-slate-800/40 border border-slate-700/60 rounded-xl text-center text-[11px] text-slate-400">
            💡 청소가 끝나면 의자를 넣고, 바닥에 떨어진 쓰레기가 없는지 확인합니다.
          </div>
        </div>
      </div>
    </div>
  );
};
