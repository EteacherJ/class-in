import { useState, useEffect } from 'react';
import {
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Music,
  ExternalLink,
  CheckSquare,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ClassRole, Student } from '../types';
import { startAmbientMusic, stopAmbientMusic, playTimerFinishAlarm } from '../utils/audio';

interface CleaningModeWidgetProps {
  roles: ClassRole[];
  students: Student[];
  onShowToast: (msg: string) => void;
}

export function CleaningModeWidget({ roles, students, onShowToast }: CleaningModeWidgetProps) {
  // Timer state (10 mins default for cleaning)
  const [timeLeft, setTimeLeft] = useState(600);
  const [isRunning, setIsRunning] = useState(false);
  const [isBgmPlaying, setIsBgmPlaying] = useState(false);

  // Dismissal checklist
  const [checklist, setChecklist] = useState([
    { id: 1, text: '칠판 지우기 및 분필 가루 정리', done: false },
    { id: 2, text: '재활용 분리수거 및 일반 쓰레기통 비우기', done: false },
    { id: 3, text: '창문 닫고 전등 및 전자칠판 소등하기', done: false },
    { id: 4, text: '책상 서랍 정리 및 의자 바르게 넣기', done: false },
    { id: 5, text: '알림장 적기 및 우유 팩 정리', done: false },
  ]);

  // YouTube BGM presets
  const youtubePresets = [
    { title: '지브리 피아노 컬렉션', url: 'https://www.youtube.com/results?search_query=지브리+피아노+청소시간+bgm' },
    { title: '비발디 사계 (경쾌한 클래식)', url: 'https://www.youtube.com/results?search_query=비발디+사계+초등학교' },
    { title: '차분한 로파이 칠판 정리 BGM', url: 'https://www.youtube.com/results?search_query=lofi+classroom+cleaning+bgm' },
  ];

  // Cleaning roles filter
  const cleaningRoles = roles.filter(
    (r) =>
      r.category === 'clean' ||
      r.title.includes('청소') ||
      r.title.includes('쓰레기') ||
      r.title.includes('분리수거') ||
      r.title.includes('칠판') ||
      r.title.includes('환기')
  );

  // Timer interval
  useEffect(() => {
    let timer: number | null = null;
    if (isRunning && timeLeft > 0) {
      timer = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      playTimerFinishAlarm('trumpet');
      stopAmbientMusic();
      setIsBgmPlaying(false);
      onShowToast('🧹 청소 시간이 완료되었습니다! 모두 자리에 앉아 종례를 준비해주세요.');
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, timeLeft, onShowToast]);

  const toggleTimer = () => {
    if (!isRunning) {
      setIsRunning(true);
      if (!isBgmPlaying) {
        startAmbientMusic('clean');
        setIsBgmPlaying(true);
      }
      onShowToast('청소 타이머와 차분한 정리 음악이 시작되었습니다.');
    } else {
      setIsRunning(false);
      stopAmbientMusic();
      setIsBgmPlaying(false);
      onShowToast('타이머가 일시정지되었습니다.');
    }
  };

  const resetTimer = (secs: number = 600) => {
    setIsRunning(false);
    setTimeLeft(secs);
    stopAmbientMusic();
    setIsBgmPlaying(false);
  };

  const toggleBgm = () => {
    if (isBgmPlaying) {
      stopAmbientMusic();
      setIsBgmPlaying(false);
      onShowToast('배경음악이 정지되었습니다.');
    } else {
      startAmbientMusic('clean');
      setIsBgmPlaying(true);
      onShowToast('🎶 청소 분위기 배경음악(차분한 Lo-Fi 코드)이 재생됩니다.');
    }
  };

  const toggleCheck = (id: number) => {
    setChecklist((prev) =>
      prev.map((c) => (c.id === id ? { ...c, done: !c.done } : c))
    );
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white/95 dark:bg-[#0c1424]/90 backdrop-blur-md rounded-3xl p-5 shadow-sm border border-amber-200/80 dark:border-[#1e2c44] flex flex-col justify-between relative group hover:border-amber-300 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-[#101a2d] text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-[#1e2c44] flex items-center justify-center font-bold text-sm shadow-xs">
            🧹
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">청소·종례 스페셜 허브</h3>
              <span className="text-[10px] bg-amber-100 dark:bg-[#101a2d] text-amber-800 dark:text-amber-300 font-extrabold px-2 py-0.5 rounded-full border border-amber-200 dark:border-[#1e2c44]">
                정리 시간
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">타이머 · 유튜브 BGM · 담당 도우미</p>
          </div>
        </div>

        {/* BGM synth toggle button */}
        <button
          onClick={toggleBgm}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
            isBgmPlaying
              ? 'bg-amber-500 text-white shadow-amber-200 animate-pulse'
              : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#101a2d] dark:hover:bg-[#16233b] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#1e2c44]'
          }`}
          title="자체 편안한 정리 BGM 토글"
        >
          {isBgmPlaying ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span>{isBgmPlaying ? 'BGM 재생 중' : 'BGM 켜기'}</span>
        </button>
      </div>

      {/* Main Timer & Controls */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-[#070c18] dark:to-[#101a2d] p-4 rounded-2xl border border-amber-100 dark:border-[#1e2c44] mb-3 flex flex-col items-center">
        <div className="text-4xl sm:text-5xl font-black text-amber-950 dark:text-amber-200 tracking-tight tabular-nums mb-2">
          {formatTime(timeLeft)}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTimer}
            className={`px-5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
              isRunning
                ? 'bg-rose-500 text-white hover:bg-rose-600'
                : 'bg-amber-600 text-white hover:bg-amber-700'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? '일시정지' : '청소 시작'}</span>
          </button>

          <button
            onClick={() => resetTimer(600)}
            className="p-2 rounded-xl bg-white hover:bg-amber-100 dark:bg-[#101a2d] dark:hover:bg-[#16233b] text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-[#1e2c44] transition-colors"
            title="10분 리셋"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Quick presets */}
          <div className="flex gap-1">
            <button
              onClick={() => resetTimer(300)}
              className="px-2 py-1 rounded-lg bg-white/80 hover:bg-white dark:bg-[#101a2d] dark:hover:bg-[#16233b] text-[10px] font-bold text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-[#1e2c44]"
            >
              5분
            </button>
            <button
              onClick={() => resetTimer(600)}
              className="px-2 py-1 rounded-lg bg-white/80 hover:bg-white dark:bg-[#101a2d] dark:hover:bg-[#16233b] text-[10px] font-bold text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-[#1e2c44]"
            >
              10분
            </button>
            <button
              onClick={() => resetTimer(900)}
              className="px-2 py-1 rounded-lg bg-white/80 hover:bg-white dark:bg-[#101a2d] dark:hover:bg-[#16233b] text-[10px] font-bold text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-[#1e2c44]"
            >
              15분
            </button>
          </div>
        </div>
      </div>

      {/* YouTube BGM links */}
      <div className="mb-3">
        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
          <Music className="w-3 h-3 text-red-500" />
          <span>추천 유튜브 청소·종례 배경음악 플레이리스트</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
          {youtubePresets.map((yt, idx) => (
            <a
              key={idx}
              href={yt.url}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-red-50 hover:text-red-700 hover:border-red-200 dark:bg-[#101a2d] dark:hover:bg-[#16233b] dark:text-slate-200 dark:hover:text-red-300 border border-slate-200/80 dark:border-[#1e2c44] rounded-xl text-[10px] font-bold text-slate-700 transition-colors flex items-center justify-between"
            >
              <span className="truncate">{yt.title}</span>
              <ExternalLink className="w-2.5 h-2.5 shrink-0 ml-1 text-slate-400" />
            </a>
          ))}
        </div>
      </div>

      {/* Today's Cleaning Duty Helpers (1인 1역 청소 도우미) */}
      <div className="bg-slate-50 dark:bg-[#070c18] p-3 rounded-2xl border border-slate-100 dark:border-[#1e2c44] mb-3">
        <div className="text-[11px] font-black text-slate-700 dark:text-slate-200 mb-1.5 flex items-center justify-between">
          <span>✨ 오늘 청소 구역 및 1인 1역 도우미</span>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">확인 후 하교</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {cleaningRoles.slice(0, 4).map((r) => {
            const assigned = r.currentStudentIds
              .map((id) => students.find((s) => s.id === id)?.name)
              .filter(Boolean);

            return (
              <div
                key={r.id}
                className="p-2 bg-white dark:bg-[#101a2d] rounded-xl border border-slate-200/70 dark:border-[#1e2c44] text-xs flex justify-between items-center"
              >
                <span className="font-bold text-slate-800 dark:text-slate-100 text-[11px] truncate max-w-[110px]">
                  {r.title}
                </span>
                <span className="font-black text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-[#0c1424] border border-amber-200/60 dark:border-[#1e2c44] px-2 py-0.5 rounded-md text-[10px]">
                  {assigned.length > 0 ? assigned.join(', ') : '미배정'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dismissal Checklist */}
      <div className="space-y-1">
        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">종례 및 하교 전 체크리스트</div>
        <div className="space-y-1">
          {checklist.map((c) => (
            <button
              key={c.id}
              onClick={() => toggleCheck(c.id)}
              className="w-full flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-[#101a2d] text-left transition-colors text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              {c.done ? (
                <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <Square className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
              )}
              <span className={c.done ? 'line-through text-slate-400 dark:text-slate-500' : ''}>{c.text}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
