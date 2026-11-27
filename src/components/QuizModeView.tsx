import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  HelpCircle,
  Timer as TimerIcon,
  Volume2,
  Trophy,
  Play,
  Pause,
  RotateCcw,
  Plus,
  ArrowLeft,
  ArrowRight,
  Tv,
  CheckCircle2,
  XCircle,
  Sparkles,
  Users,
  Settings,
  Music,
  Trash2,
  Edit2,
  Check,
  Compass,
  Bell,
  Mic,
  MicOff,
} from 'lucide-react';
import {
  QuizQuestion,
  TelepathyQuiz,
  BasketballScoreboardTeam,
  Team,
  ClassConfig,
} from '../types';
import {
  initialQuizzes,
  initialTelepathyQuizzes,
  initialBasketballTeams,
} from '../data/initialData';
import { playCelebrateSound, playSelectedChime } from '../utils/audio';
import { QuizQuestionManagerModal } from './QuizQuestionManagerModal';
import { broadcastDisplaySyncState, DisplaySyncState } from './DualMonitorDisplayView';

interface QuizModeViewProps {
  quizzes?: QuizQuestion[];
  teams?: Team[];
  onSwitchToLesson: () => void;
  onOpenSecondaryPopup?: () => void;
  onShowToast: (msg: string) => void;
}

export const QuizModeView: React.FC<QuizModeViewProps> = ({
  quizzes: initialPropQuizzes,
  teams = [],
  onSwitchToLesson,
  onOpenSecondaryPopup,
  onShowToast,
}) => {
  // Main Tab: ox | choice | telepathy | scoreboard
  const [activeQuizTab, setActiveQuizTab] = useState<'ox' | 'choice' | 'telepathy' | 'scoreboard'>('ox');

  // --- 1. 독립 퀴즈 타이머 (상단 좌측) ---
  const [quizTimer, setQuizTimer] = useState<number>(60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  useEffect(() => {
    let interval: number;
    if (isTimerRunning && quizTimer > 0) {
      interval = window.setInterval(() => {
        setQuizTimer((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            playSelectedChime('school_4tone');
            onShowToast('⏰ 퀴즈 제한 시간이 종료되었습니다!');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, quizTimer, onShowToast]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // --- 2. 교실 소음 데시벨 모니터 (상단 우측) ---
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [decibel, setDecibel] = useState<number>(38);
  const [noiseThreshold, setNoiseThreshold] = useState<number>(70);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      setIsMicActive(true);
      onShowToast('🎙️ 마이크 교실 소음 감지가 시작되었습니다.');

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateDecibel = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const currentDb = Math.min(100, Math.round((avg / 255) * 65 + 30));
        setDecibel(currentDb);
        animationFrameRef.current = requestAnimationFrame(updateDecibel);
      };
      updateDecibel();
    } catch {
      // Fallback simulated ambient noise
      setIsMicActive(true);
      onShowToast('🎙️ 마이크 권한 미제공 시 교실 표준 데시벨 시뮬레이션으로 동작합니다.');
      const simInterval = window.setInterval(() => {
        setDecibel(Math.floor(35 + Math.random() * 25));
      }, 1000);
      (window as any).__noiseSim = simInterval;
    }
  };

  const stopMic = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    if ((window as any).__noiseSim) clearInterval((window as any).__noiseSim);
    setIsMicActive(false);
    setDecibel(38);
    onShowToast('마이크 측정이 중지되었습니다.');
  };

  // --- 3. 퀴즈 데이터 상태 (OX & 객관식) ---
  const [quizList, setQuizList] = useState<QuizQuestion[]>(() => {
    const saved =
      localStorage.getItem('class_quiz_questions') ||
      localStorage.getItem('quiz_custom_questions');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return initialPropQuizzes && initialPropQuizzes.length > 0 ? initialPropQuizzes : initialQuizzes;
  });

  const safeQuizList = Array.isArray(quizList) ? quizList.filter((q) => q && q.type) : [];
  const oxQuizzes = safeQuizList.filter((q) => q?.type === 'ox');
  const choiceQuizzes = safeQuizList.filter((q) => q?.type === 'choice');

  const [oxIndex, setOxIndex] = useState<number>(0);
  const [isOxRevealed, setIsOxRevealed] = useState<boolean>(false);
  const [oxUserPick, setOxUserPick] = useState<'O' | 'X' | null>(null);

  const [choiceIndex, setChoiceIndex] = useState<number>(0);
  const [isChoiceRevealed, setIsChoiceRevealed] = useState<boolean>(false);
  const [choiceUserPick, setChoiceUserPick] = useState<number | null>(null);

  // Question Manager Split Modal (Left Create / Right Verify & Manage)
  const [isQuestionManagerOpen, setIsQuestionManagerOpen] = useState<boolean>(false);
  const [questionManagerTab, setQuestionManagerTab] = useState<'ox' | 'choice' | 'telepathy'>('ox');

  // New Quiz Modal Form
  const [isAddQuizOpen, setIsAddQuizOpen] = useState<boolean>(false);
  const [newQuizType, setNewQuizType] = useState<'ox' | 'choice'>('ox');
  const [newQuestionText, setNewQuestionText] = useState<string>('');
  const [newOxAnswer, setNewOxAnswer] = useState<'O' | 'X'>('O');
  const [newChoiceOptions, setNewChoiceOptions] = useState<string[]>(['1번 보기', '2번 보기', '3번 보기', '4번 보기']);
  const [newChoiceAnswer, setNewChoiceAnswer] = useState<number>(0);
  const [newExplanation, setNewExplanation] = useState<string>('');

  // (handleAddQuizSubmit is declared after syncToSecondary helper)


  // --- 4. 4코너 텔레파시 퀴즈 상태 (나 항목) ---
  /**
   * 🛡️ [데이터 정규화 (Normalizer)]: 텔레파시 퀴즈 데이터 객체에 corners 배열이 항상 4개 요소로 보장되도록 정규화
   */
  const normalizeTelepathyQuiz = (q?: Partial<TelepathyQuiz> | null): TelepathyQuiz => {
    if (!q) {
      return {
        id: `tele-${Date.now()}`,
        question: '선생님의 생각을 맞춰보세요! (준비 중)',
        corners: ['1번 코너 (앞 왼쪽)', '2번 코너 (앞 오른쪽)', '3번 코너 (뒤 왼쪽)', '4번 코너 (뒤 오른쪽)'],
        correctCorner: 1,
        timeLimit: 15,
      };
    }

    const rawCorners = Array.isArray(q.corners) ? q.corners : [];
    const corners: [string, string, string, string] = [
      rawCorners[0] !== undefined && rawCorners[0] !== '' ? String(rawCorners[0]) : '1번 코너 (앞 왼쪽)',
      rawCorners[1] !== undefined && rawCorners[1] !== '' ? String(rawCorners[1]) : '2번 코너 (앞 오른쪽)',
      rawCorners[2] !== undefined && rawCorners[2] !== '' ? String(rawCorners[2]) : '3번 코너 (뒤 왼쪽)',
      rawCorners[3] !== undefined && rawCorners[3] !== '' ? String(rawCorners[3]) : '4번 코너 (뒤 오른쪽)',
    ];

    const parsedCorner = q.correctCorner && [1, 2, 3, 4].includes(q.correctCorner) ? q.correctCorner : 1;

    return {
      id: q.id || `tele-${Date.now()}`,
      question: q.question || '선생님의 생각을 맞춰보세요!',
      corners,
      correctCorner: parsedCorner as 1 | 2 | 3 | 4,
      timeLimit: q.timeLimit && q.timeLimit > 0 ? q.timeLimit : 15,
    };
  };

  const [telepathyList, setTelepathyList] = useState<TelepathyQuiz[]>(() => {
    const saved =
      localStorage.getItem('class_telepathy_quizzes') ||
      localStorage.getItem('telepathy_custom_quizzes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any) => normalizeTelepathyQuiz(item));
        }
      } catch (err) {
        console.warn('🟡 [QuizModeView] 텔레파시 퀴즈 캐시 복원 중 오류 발생:', err);
      }
    }
    return (initialTelepathyQuizzes || []).map((item: any) => normalizeTelepathyQuiz(item));
  });
  const [telepathyIndex, setTelepathyIndex] = useState<number>(0);
  const [telepathyTimer, setTelepathyTimer] = useState<number>(15);
  const [isTeleTimerRunning, setIsTeleTimerRunning] = useState<boolean>(false);
  const [isTeleRevealed, setIsTeleRevealed] = useState<boolean>(false);

  // New Telepathy Quiz Form
  const [isAddTeleOpen, setIsAddTeleOpen] = useState<boolean>(false);
  const [newTeleQuestion, setNewTeleQuestion] = useState<string>('');
  const [newTeleCorner1, setNewTeleCorner1] = useState<string>('');
  const [newTeleCorner2, setNewTeleCorner2] = useState<string>('');
  const [newTeleCorner3, setNewTeleCorner3] = useState<string>('');
  const [newTeleCorner4, setNewTeleCorner4] = useState<string>('');
  const [newTeleCorrectIdx, setNewTeleCorrectIdx] = useState<number>(0); // 0=코너1, 1=코너2, 2=코너3, 3=코너4
  const [newTeleTimeSeconds, setNewTeleTimeSeconds] = useState<number>(15);

  // 🛡️ [안전 접근자 & 기본값 폴백]: telepathyList가 비었거나 currentTele가 undefined일 경우 완벽 방어
  const safeTeleList = telepathyList && telepathyList.length > 0 ? telepathyList : [normalizeTelepathyQuiz(null)];
  const rawCurrentTele = safeTeleList[telepathyIndex % safeTeleList.length] || safeTeleList[0];
  const currentTele = normalizeTelepathyQuiz(rawCurrentTele);
  const currentCorners: [string, string, string, string] = currentTele?.corners ?? ['', '', '', ''];

  // (Telepathy timer loop and handlers are declared after syncToSecondary helper)


  // --- 5. 농구 전광판 스타일 모둠 점수판 (가 항목) ---
  const [scoreTeams, setScoreTeams] = useState<BasketballScoreboardTeam[]>(() => {
    if (teams && teams.length > 0) {
      return teams.map((t) => ({
        id: t.id,
        name: t.name,
        score: t.points,
        color: t.dotColor || 'bg-amber-500',
      }));
    }
    return initialBasketballTeams;
  });
  const [periodQuarter, setPeriodQuarter] = useState<number>(1);
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
  const [editingTeamName, setEditingTeamName] = useState<string>('');

  const handleAdjustScore = (teamId: number, delta: number) => {
    setScoreTeams((prev) => {
      const next = prev.map((t) => (t.id === teamId ? { ...t, score: Math.max(0, t.score + delta) } : t));
      syncToSecondary({ scoreboardTeams: next });
      return next;
    });
    if (delta > 0) playSelectedChime('bell_ding');
  };

  const handleResetTeamScore = (teamId: number) => {
    setScoreTeams((prev) => {
      const next = prev.map((t) => (t.id === teamId ? { ...t, score: 0 } : t));
      syncToSecondary({ scoreboardTeams: next });
      return next;
    });
    onShowToast('점수가 0점으로 리셋되었습니다.');
  };

  const handleSetTeamCount = (count: number) => {
    let nextTeams: BasketballScoreboardTeam[] = [];
    if (count > scoreTeams.length) {
      const added: BasketballScoreboardTeam[] = [];
      const colors = ['bg-rose-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-teal-500', 'bg-indigo-500', 'bg-orange-500'];
      for (let i = scoreTeams.length; i < count; i++) {
        added.push({
          id: i + 1,
          name: `${i + 1}모둠`,
          score: 0,
          color: colors[i % colors.length],
        });
      }
      nextTeams = [...scoreTeams, ...added];
    } else {
      nextTeams = scoreTeams.slice(0, count);
    }
    setScoreTeams(nextTeams);
    syncToSecondary({ scoreboardTeams: nextTeams });
    onShowToast(`🏀 ${count}개 모둠 점수판으로 변경되었습니다.`);
  };

  const curOx = oxQuizzes[oxIndex % oxQuizzes.length];
  const curChoice = choiceQuizzes[choiceIndex % choiceQuizzes.length];

  // 💡 [실시간 보조 모니터 퀴즈 동기화 헬퍼]: 0.1초 딜레이 없는 100% 미러링
  const syncToSecondary = useCallback(
    (overrides?: Partial<DisplaySyncState>) => {
      try {
        const activeList = activeQuizTab === 'ox' ? oxQuizzes : choiceQuizzes;
        const currentIdx = activeQuizTab === 'ox' ? oxIndex : choiceIndex;
        const currentRevealed = activeQuizTab === 'ox' ? isOxRevealed : isChoiceRevealed;

        const payload: Partial<DisplaySyncState> = {
          activeTab: 'quiz',
          quizStatus: 'ACTIVE',
          isQuizPublished: true,
          quizType: activeQuizTab,
          quizzes: activeList.length > 0 ? activeList : quizList,
          quizIndex: currentIdx,
          isAnswerRevealed: currentRevealed,
          telepathyIndex,
          telepathyList: safeTeleList,
          telepathyTimer,
          isTelepathyTimerRunning: isTeleTimerRunning,
          isTelepathyRevealed: isTeleRevealed,
          scoreboardTeams: scoreTeams,
          periodQuarter,
          decibel,
          timerSeconds: quizTimer,
          isTimerRunning,
          ...overrides,
        };
        broadcastDisplaySyncState(payload);
      } catch (err) {
        console.warn('🟡 [QuizModeView] 보조 모니터 퀴즈 동기화 전송 오류:', err);
      }
    },
    [
      activeQuizTab,
      oxQuizzes,
      choiceQuizzes,
      quizList,
      oxIndex,
      choiceIndex,
      isOxRevealed,
      isChoiceRevealed,
      telepathyIndex,
      safeTeleList,
      telepathyTimer,
      isTeleTimerRunning,
      isTeleRevealed,
      scoreTeams,
      periodQuarter,
      decibel,
      quizTimer,
      isTimerRunning,
    ]
  );

  // 마운트 시 최초 1회 즉시 보조 모니터에 현재 퀴즈 상태 송출
  useEffect(() => {
    syncToSecondary();
  }, []);

  const handleOpenSecondaryWithSync = () => {
    syncToSecondary();
    if (onOpenSecondaryPopup) {
      onOpenSecondaryPopup();
    }
  };

  // --- 💡 [퀴즈 및 텔레파시 제출 / 타이머 핸들러]: syncToSecondary 연동 보장 ---
  const handleAddQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) {
      onShowToast('⚠️ 문제 내용을 입력해주세요.');
      return;
    }

    const newQ: QuizQuestion = {
      id: `q-${Date.now()}`,
      type: newQuizType,
      question: newQuestionText.trim(),
      answer: newQuizType === 'ox' ? newOxAnswer : newChoiceAnswer,
      options: newQuizType === 'choice' ? newChoiceOptions : undefined,
      explanation: newExplanation.trim() || undefined,
    };

    const updated = [...quizList, newQ];
    setQuizList(updated);
    localStorage.setItem('class_quiz_questions', JSON.stringify(updated));
    localStorage.setItem('quiz_custom_questions', JSON.stringify(updated));
    syncToSecondary({ quizzes: updated });
    setIsAddQuizOpen(false);
    setNewQuestionText('');
    setNewExplanation('');
    onShowToast(`🎉 새 ${newQuizType === 'ox' ? 'O,X' : '객관식'} 문제가 등록되었습니다!`);
  };

  // Telepathy movement timer loop
  useEffect(() => {
    let interval: number;
    if (isTeleTimerRunning && telepathyTimer > 0) {
      interval = window.setInterval(() => {
        setTelepathyTimer((prev) => {
          if (prev <= 1) {
            setIsTeleTimerRunning(false);
            syncToSecondary({
              quizType: 'telepathy',
              isTelepathyTimerRunning: false,
              telepathyTimer: 0,
            });
            playSelectedChime('bell_ding');
            onShowToast('🔔 학생 이동 시간이 완료되었습니다! 정답 버튼을 눌러 정답자를 확인하세요.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTeleTimerRunning, telepathyTimer, onShowToast, syncToSecondary]);

  const handleStartTelepathy = () => {
    const limit = currentTele.timeLimit || 15;
    setTelepathyTimer(limit);
    setIsTeleTimerRunning(true);
    setIsTeleRevealed(false);
    syncToSecondary({
      quizType: 'telepathy',
      telepathyIndex,
      telepathyList: safeTeleList,
      telepathyTimer: limit,
      isTelepathyTimerRunning: true,
      isTelepathyRevealed: false,
    });
    onShowToast('🏃‍♂️ 4방향 코너로 이동 시작! 신속하게 자리를 선택하세요!');
  };

  const handleRevealTelepathy = () => {
    setIsTeleRevealed(true);
    playCelebrateSound();
    const correctIdx = Math.max(0, Math.min(3, (currentTele.correctCorner || 1) - 1)) as 0 | 1 | 2 | 3;
    const cornerAnswer = currentCorners[correctIdx] || currentTele.corners[correctIdx] || '';
    syncToSecondary({
      quizType: 'telepathy',
      telepathyIndex,
      telepathyList: safeTeleList,
      isTelepathyRevealed: true,
      isTelepathyTimerRunning: false,
    });
    onShowToast(`🎉 정답 코너는 [${currentTele.correctCorner}번: ${cornerAnswer}] 입니다!`);
  };

  const handleAddTeleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeleQuestion.trim() || !newTeleCorner1.trim() || !newTeleCorner2.trim() || !newTeleCorner3.trim() || !newTeleCorner4.trim()) {
      onShowToast('⚠️ 문제와 4개 코너 보기를 모두 입력해주세요.');
      return;
    }

    const newT: TelepathyQuiz = {
      id: `tele-${Date.now()}`,
      question: newTeleQuestion.trim(),
      corners: [newTeleCorner1.trim(), newTeleCorner2.trim(), newTeleCorner3.trim(), newTeleCorner4.trim()],
      correctCorner: (newTeleCorrectIdx + 1) as 1 | 2 | 3 | 4,
      timeLimit: newTeleTimeSeconds,
    };

    const updated = [...telepathyList, newT];
    setTelepathyList(updated);
    localStorage.setItem('class_telepathy_quizzes', JSON.stringify(updated));
    localStorage.setItem('telepathy_custom_quizzes', JSON.stringify(updated));
    setIsAddTeleOpen(false);
    setNewTeleQuestion('');
    setNewTeleCorner1('');
    setNewTeleCorner2('');
    setNewTeleCorner3('');
    setNewTeleCorner4('');
    setTelepathyIndex(updated.length - 1);
    setTelepathyTimer(newTeleTimeSeconds);
    setIsTeleRevealed(false);
    syncToSecondary({
      quizType: 'telepathy',
      telepathyIndex: updated.length - 1,
      telepathyList: updated,
      telepathyTimer: newTeleTimeSeconds,
      isTelepathyRevealed: false,
      isTelepathyTimerRunning: false,
    });
    onShowToast('🎉 새 4코너 텔레파시 퀴즈가 등록되었습니다!');
  };

  return (
    <div className="w-full bg-slate-950 text-white rounded-3xl p-4 sm:p-6 border-2 border-slate-800 shadow-2xl flex flex-col gap-5 animate-fade-in">
      {/* 1. Header Bar: Mode Switcher & Exit */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-rose-900/50">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-rose-900/70 border border-rose-700 text-rose-300 text-[10px] font-black uppercase tracking-wider">
                Interactive Classroom
              </span>
              <span className="text-xs text-slate-400">실시간 참여형 인터랙티브 모드</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2 mt-0.5">
              🎯 수업 스마트 퀴즈 쇼 & 전광판 모드
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenSecondaryPopup && (
            <button
              type="button"
              onClick={handleOpenSecondaryWithSync}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95"
              title="학생용 보조 모니터로 퀴즈 화면 실시간 송출"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>보조 모니터 송출</span>
            </button>
          )}

          <button
            type="button"
            onClick={onSwitchToLesson}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>수업 모드로 복귀</span>
          </button>
        </div>
      </div>

      {/* 2. Top Dual Utility Row: Left Independent Timer + Right Live Microphone Decibel Monitor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Independent Quiz Timer with 5 Adjustment Buttons */}
        <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 flex flex-col justify-between gap-3 shadow-inner">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <TimerIcon className="w-4 h-4 text-emerald-400" />
              <span className="font-extrabold text-xs text-slate-200">
                수업 집중 퀴즈 타이머
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {[30, 60, 120, 180].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => {
                    setQuizTimer(sec);
                    setIsTimerRunning(false);
                    syncToSecondary({ timerSeconds: sec, isTimerRunning: false });
                    onShowToast(`⏱️ 타이머 ${sec}초로 설정되었습니다.`);
                  }}
                  className="px-1.5 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 font-bold transition cursor-pointer"
                >
                  {sec >= 60 ? `${sec / 60}분` : `${sec}초`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="font-mono text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200 tabular-nums">
              {formatTimer(quizTimer)}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const nextRunning = !isTimerRunning;
                  setIsTimerRunning(nextRunning);
                  syncToSecondary({ isTimerRunning: nextRunning, timerSeconds: quizTimer });
                }}
                className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer ${
                  isTimerRunning
                    ? 'bg-amber-500 hover:bg-amber-600 text-amber-950'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                }`}
              >
                {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isTimerRunning ? '일시정지' : '타이머 시작'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setQuizTimer(60);
                  setIsTimerRunning(false);
                  syncToSecondary({ timerSeconds: 60, isTimerRunning: false });
                  onShowToast('타이머가 1분으로 리셋되었습니다.');
                }}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                title="1분으로 리셋"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 5 Adjustment Buttons */}
          <div className="grid grid-cols-5 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => {
                setQuizTimer((p) => {
                  const next = Math.max(0, p - 60);
                  syncToSecondary({ timerSeconds: next });
                  return next;
                });
              }}
              className="py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-mono font-bold text-slate-300 cursor-pointer"
            >
              -1분
            </button>
            <button
              type="button"
              onClick={() => {
                setQuizTimer((p) => {
                  const next = Math.max(0, p - 10);
                  syncToSecondary({ timerSeconds: next });
                  return next;
                });
              }}
              className="py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-mono font-bold text-slate-300 cursor-pointer"
            >
              -10초
            </button>
            <button
              type="button"
              onClick={() => {
                setQuizTimer((p) => {
                  const next = p + 10;
                  syncToSecondary({ timerSeconds: next });
                  return next;
                });
              }}
              className="py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-mono font-bold text-emerald-300 cursor-pointer"
            >
              +10초
            </button>
            <button
              type="button"
              onClick={() => {
                setQuizTimer((p) => {
                  const next = p + 60;
                  syncToSecondary({ timerSeconds: next });
                  return next;
                });
              }}
              className="py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-mono font-bold text-emerald-300 cursor-pointer"
            >
              +1분
            </button>
            <button
              type="button"
              onClick={() => {
                setQuizTimer(60);
                setIsTimerRunning(false);
                syncToSecondary({ timerSeconds: 60, isTimerRunning: false });
              }}
              className="py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-[10px] font-bold text-rose-300 cursor-pointer"
            >
              리셋
            </button>
          </div>
        </div>

        {/* Right: Classroom Noise Decibel Monitor */}
        <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 flex flex-col justify-between gap-3 shadow-inner">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-sky-400" />
              <span className="font-extrabold text-xs text-slate-200">
                교실 소음 데시벨 모니터
              </span>
            </div>
            <button
              type="button"
              onClick={isMicActive ? stopMic : startMic}
              className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 transition cursor-pointer ${
                isMicActive
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {isMicActive ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              <span>{isMicActive ? '측정중' : '마이크 켜기'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-300 tabular-nums">
                  {decibel}
                </span>
                <span className="text-xs font-bold text-slate-400">dB</span>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${
                decibel > noiseThreshold
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : decibel > 55
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}>
                {decibel > noiseThreshold ? '🚨 시끄러움 경고' : decibel > 55 ? '⚠️ 웅성웅성 주의' : '✨ 조용하고 쾌적함'}
              </span>
            </div>

            {/* Gauge Bar */}
            <div className="flex-1 max-w-[200px] flex flex-col gap-1.5">
              <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                <span>0 dB</span>
                <span className="text-amber-400">기준 {noiseThreshold}dB</span>
                <span>100 dB</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden p-0.5 border border-slate-700">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    decibel > noiseThreshold
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                      : 'bg-gradient-to-r from-emerald-500 to-sky-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, decibel))}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>기준 소음 초과 시 교실 주의 차임벨이 울립니다.</span>
            <input
              type="range"
              min={50}
              max={85}
              value={noiseThreshold}
              onChange={(e) => setNoiseThreshold(Number(e.target.value))}
              className="w-24 accent-sky-400 cursor-pointer"
              title="경고 기준 데시벨 조정"
            />
          </div>
        </div>
      </div>

      {/* 3. Main Stage: 수업스마트 퀴즈 쇼 (O,X퀴즈 / 객관식 / 텔레파시 / 점수판) */}
      <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 shadow-xl space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setActiveQuizTab('ox');
                setIsOxRevealed(false);
                setOxUserPick(null);
                syncToSecondary({
                  quizType: 'ox',
                  quizzes: oxQuizzes,
                  quizIndex: oxIndex,
                  isAnswerRevealed: false,
                });
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                activeQuizTab === 'ox'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>⭕ ❌</span>
              <span>O,X 퀴즈</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveQuizTab('choice');
                setIsChoiceRevealed(false);
                setChoiceUserPick(null);
                syncToSecondary({
                  quizType: 'choice',
                  quizzes: choiceQuizzes,
                  quizIndex: choiceIndex,
                  isAnswerRevealed: false,
                });
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                activeQuizTab === 'choice'
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🔢</span>
              <span>객관식 선택 퀴즈</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveQuizTab('telepathy');
                setIsTeleRevealed(false);
                setIsTeleTimerRunning(false);
                syncToSecondary({
                  quizType: 'telepathy',
                  telepathyIndex,
                  telepathyList: safeTeleList,
                  isTelepathyRevealed: false,
                  isTelepathyTimerRunning: false,
                });
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                activeQuizTab === 'telepathy'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🏃‍♂️</span>
              <span>4코너 텔레파시 퀴즈</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveQuizTab('scoreboard');
                syncToSecondary({
                  quizType: 'scoreboard',
                  scoreboardTeams: scoreTeams,
                  periodQuarter,
                });
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                activeQuizTab === 'scoreboard'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🏀</span>
              <span>농구 전광판 점수판</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {(activeQuizTab === 'ox' || activeQuizTab === 'choice' || activeQuizTab === 'telepathy') && (
              <button
                type="button"
                onClick={() => {
                  setQuestionManagerTab(activeQuizTab);
                  setIsQuestionManagerOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white text-xs font-black transition flex items-center gap-1.5 shadow-md cursor-pointer"
                title="문제 등록 화면 열기 (왼쪽: 문제 생성 / 오른쪽: 생성된 문제 확인 및 편집)"
              >
                <Plus className="w-4 h-4" />
                <span>문제 등록 및 관리</span>
              </button>
            )}
          </div>
        </div>

        {/* --- TAB 1: O,X 퀴즈 --- */}
        {activeQuizTab === 'ox' && (
          <div className="space-y-4">
            {curOx ? (
              <div className="space-y-4">
                {/* Question Card */}
                <div className="p-6 bg-slate-950/80 rounded-2xl border border-slate-800 text-center space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800/80">
                    <span className="font-bold text-rose-400">
                      O,X 퀴즈 {oxIndex + 1} / {oxQuizzes.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const nextIdx = oxIndex > 0 ? oxIndex - 1 : oxQuizzes.length - 1;
                          setOxIndex(nextIdx);
                          setIsOxRevealed(false);
                          setOxUserPick(null);
                          syncToSecondary({
                            quizType: 'ox',
                            quizzes: oxQuizzes,
                            quizIndex: nextIdx,
                            isAnswerRevealed: false,
                          });
                        }}
                        className="px-2 py-0.5 bg-slate-800 rounded text-slate-300 hover:text-white cursor-pointer"
                      >
                        ◀ 이전
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const nextIdx = (oxIndex + 1) % oxQuizzes.length;
                          setOxIndex(nextIdx);
                          setIsOxRevealed(false);
                          setOxUserPick(null);
                          syncToSecondary({
                            quizType: 'ox',
                            quizzes: oxQuizzes,
                            quizIndex: nextIdx,
                            isAnswerRevealed: false,
                          });
                        }}
                        className="px-2 py-0.5 bg-slate-800 rounded text-slate-300 hover:text-white cursor-pointer"
                      >
                        다음 ▶
                      </button>
                    </div>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-white py-3 leading-relaxed">
                    Q. {curOx.question}
                  </h3>
                </div>

                {/* Giant O, X Interactive Cards */}
                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                  <button
                    type="button"
                    onClick={() => {
                      setOxUserPick('O');
                      if (curOx.answer === 'O') {
                        playCelebrateSound();
                      } else {
                        playSelectedChime('school_4tone');
                      }
                      setIsOxRevealed(true);
                    }}
                    className={`p-6 sm:p-8 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer active:scale-95 ${
                      isOxRevealed
                        ? curOx.answer === 'O'
                          ? 'border-emerald-400 bg-emerald-950/50 shadow-2xl ring-4 ring-emerald-400/50'
                          : 'border-slate-800 bg-slate-950/40 opacity-40'
                        : oxUserPick === 'O'
                        ? 'border-emerald-400 bg-emerald-950/30 ring-2 ring-emerald-400'
                        : 'border-slate-800 bg-slate-950/70 hover:border-emerald-500/60 hover:bg-slate-900'
                    }`}
                  >
                    <span className="text-6xl sm:text-7xl font-black text-emerald-400 drop-shadow-md">
                      ⭕ O
                    </span>
                    <span className="font-bold text-xs sm:text-sm text-slate-300">
                      그렇다 / 맞다
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOxUserPick('X');
                      if (curOx.answer === 'X') {
                        playCelebrateSound();
                      } else {
                        playSelectedChime('school_4tone');
                      }
                      setIsOxRevealed(true);
                    }}
                    className={`p-6 sm:p-8 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer active:scale-95 ${
                      isOxRevealed
                        ? curOx.answer === 'X'
                          ? 'border-rose-400 bg-rose-950/50 shadow-2xl ring-4 ring-rose-400/50'
                          : 'border-slate-800 bg-slate-950/40 opacity-40'
                        : oxUserPick === 'X'
                        ? 'border-rose-400 bg-rose-950/30 ring-2 ring-rose-400'
                        : 'border-slate-800 bg-slate-950/70 hover:border-rose-500/60 hover:bg-slate-900'
                    }`}
                  >
                    <span className="text-6xl sm:text-7xl font-black text-rose-500 drop-shadow-md">
                      ❌ X
                    </span>
                    <span className="font-bold text-xs sm:text-sm text-slate-300">
                      아니다 / 틀리다
                    </span>
                  </button>
                </div>

                {/* Answer & Explanation Box */}
                <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-slate-950 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const nextRev = !isOxRevealed;
                        setIsOxRevealed(nextRev);
                        if (nextRev) playCelebrateSound();
                        syncToSecondary({
                          quizType: 'ox',
                          quizzes: oxQuizzes,
                          quizIndex: oxIndex,
                          isAnswerRevealed: nextRev,
                        });
                      }}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isOxRevealed ? '정답 다시 숨기기' : '정답 및 해설 공개하기'}</span>
                    </button>

                    {isOxRevealed && (
                      <span className="font-extrabold text-sm text-emerald-400 flex items-center gap-1 animate-bounce">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>정답: {curOx.answer}</span>
                      </span>
                    )}
                  </div>

                  {isOxRevealed && curOx.explanation && (
                    <div className="text-xs text-slate-300 font-medium">
                      💡 {curOx.explanation}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500">
                등록된 O,X 문제가 없습니다. 우측 상단의 [문제 추가] 버튼을 눌러보세요.
              </div>
            )}
          </div>
        )}

        {/* --- TAB 2: 객관식 선택 퀴즈 --- */}
        {activeQuizTab === 'choice' && (
          <div className="space-y-4">
            {curChoice ? (
              <div className="space-y-4">
                <div className="p-6 bg-slate-950/80 rounded-2xl border border-slate-800 text-center space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800/80">
                    <span className="font-bold text-sky-400">
                      객관식 퀴즈 {choiceIndex + 1} / {choiceQuizzes.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const nextIdx = choiceIndex > 0 ? choiceIndex - 1 : choiceQuizzes.length - 1;
                          setChoiceIndex(nextIdx);
                          setIsChoiceRevealed(false);
                          setChoiceUserPick(null);
                          syncToSecondary({
                            quizType: 'choice',
                            quizzes: choiceQuizzes,
                            quizIndex: nextIdx,
                            isAnswerRevealed: false,
                          });
                        }}
                        className="px-2 py-0.5 bg-slate-800 rounded text-slate-300 hover:text-white cursor-pointer"
                      >
                        ◀ 이전
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const nextIdx = (choiceIndex + 1) % choiceQuizzes.length;
                          setChoiceIndex(nextIdx);
                          setIsChoiceRevealed(false);
                          setChoiceUserPick(null);
                          syncToSecondary({
                            quizType: 'choice',
                            quizzes: choiceQuizzes,
                            quizIndex: nextIdx,
                            isAnswerRevealed: false,
                          });
                        }}
                        className="px-2 py-0.5 bg-slate-800 rounded text-slate-300 hover:text-white cursor-pointer"
                      >
                        다음 ▶
                      </button>
                    </div>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-white py-3 leading-relaxed">
                    Q. {curChoice.question}
                  </h3>
                </div>

                {/* Choice Options List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {curChoice.options?.map((opt, optIdx) => {
                    const isCorrect = curChoice.answer === optIdx;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => {
                          setChoiceUserPick(optIdx);
                          if (isCorrect) {
                            playCelebrateSound();
                          } else {
                            playSelectedChime('school_4tone');
                          }
                          setIsChoiceRevealed(true);
                        }}
                        className={`p-4 rounded-xl border-2 flex items-center justify-between gap-3 transition-all cursor-pointer text-left ${
                          isChoiceRevealed
                            ? isCorrect
                              ? 'border-emerald-400 bg-emerald-950/60 text-white shadow-xl ring-2 ring-emerald-400'
                              : choiceUserPick === optIdx
                              ? 'border-rose-500 bg-rose-950/40 text-slate-300'
                              : 'border-slate-800 bg-slate-950/40 opacity-40'
                            : choiceUserPick === optIdx
                            ? 'border-sky-400 bg-sky-950/50 text-white'
                            : 'border-slate-800 bg-slate-950/70 hover:border-sky-500 hover:bg-slate-900 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
                            {optIdx + 1}
                          </span>
                          <span className="font-bold text-sm">{opt}</span>
                        </div>

                        {isChoiceRevealed && isCorrect && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Bottom Reveal Controls */}
                <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-slate-950 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const nextRev = !isChoiceRevealed;
                        setIsChoiceRevealed(nextRev);
                        if (nextRev) playCelebrateSound();
                        syncToSecondary({
                          quizType: 'choice',
                          quizzes: choiceQuizzes,
                          quizIndex: choiceIndex,
                          isAnswerRevealed: nextRev,
                        });
                      }}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isChoiceRevealed ? '정답 다시 숨기기' : '정답 및 해설 공개'}</span>
                    </button>

                    {isChoiceRevealed && (
                      <span className="font-extrabold text-sm text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>정답: {Number(curChoice.answer) + 1}번</span>
                      </span>
                    )}
                  </div>

                  {isChoiceRevealed && curChoice.explanation && (
                    <div className="text-xs text-slate-300 font-medium">
                      💡 {curChoice.explanation}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500">
                등록된 객관식 문제가 없습니다. 우측 상단의 [문제 추가] 버튼을 눌러보세요.
              </div>
            )}
          </div>
        )}

        {/* --- TAB 3: 4코너 텔레파시 퀴즈 (나 항목 완벽 구현) --- */}
        {activeQuizTab === 'telepathy' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-slate-400 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-bold text-purple-400">
                  🏃‍♂️ 4방향 코너 텔레파시 미션 {telepathyIndex + 1} / {telepathyList.length}
                </span>
                <span className="text-[11px] text-slate-500">
                  (문제 확인 후 타이머 동안 교실의 4개 코너 중 한 곳으로 직접 이동)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const nextIdx = telepathyIndex > 0 ? telepathyIndex - 1 : safeTeleList.length - 1;
                    setTelepathyIndex(nextIdx);
                    setIsTeleRevealed(false);
                    setIsTeleTimerRunning(false);
                    syncToSecondary({
                      quizType: 'telepathy',
                      telepathyIndex: nextIdx,
                      isTelepathyRevealed: false,
                      isTelepathyTimerRunning: false,
                    });
                  }}
                  className="px-2 py-0.5 bg-slate-800 rounded text-slate-300 hover:text-white cursor-pointer"
                >
                  ◀ 이전 미션
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextIdx = (telepathyIndex + 1) % safeTeleList.length;
                    setTelepathyIndex(nextIdx);
                    setIsTeleRevealed(false);
                    setIsTeleTimerRunning(false);
                    syncToSecondary({
                      quizType: 'telepathy',
                      telepathyIndex: nextIdx,
                      isTelepathyRevealed: false,
                      isTelepathyTimerRunning: false,
                    });
                  }}
                  className="px-2 py-0.5 bg-slate-800 rounded text-slate-300 hover:text-white cursor-pointer"
                >
                  다음 미션 ▶
                </button>
              </div>
            </div>

            {/* 🛡️ [데이터 방어]: currentTele 또는 corners 배열이 유효하지 않을 때 Fallback UI 표시 */}
            {(!currentTele || !Array.isArray(currentTele.corners) || currentTele.corners.length < 4) ? (
              <div className="p-8 text-center bg-slate-900/60 rounded-3xl border border-slate-800 text-slate-400 space-y-2">
                <p className="text-sm font-bold">⚠️ 텔레파시 퀴즈 데이터를 불러오는 중이거나 문제가 설정되지 않았습니다.</p>
                <p className="text-xs text-slate-500">우측 상단 [+ 새 문제 등록] 버튼을 눌러 첫 텔레파시 퀴즈를 생성해 보세요.</p>
              </div>
            ) : (
            /* Simulated Classroom Stage: 4 Corners Architecture */
            <div className="relative bg-slate-950 rounded-3xl p-5 sm:p-7 border-2 border-slate-800 min-h-[460px] flex flex-col justify-between overflow-hidden shadow-2xl">
              {/* Classroom Boundary Guide */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-widest pointer-events-none">
                [교실 앞쪽 칠판 & 교탁 영역]
              </div>

              {/* Top Row: Corner 1 (칠판 앞 왼쪽) & Corner 2 (칠판 앞 오른쪽) */}
              <div className="grid grid-cols-2 gap-4 sm:gap-8 z-10">
                {/* Corner 1 */}
                <div
                  className={`p-4 sm:p-5 rounded-2xl border-2 transition-all ${
                    isTeleRevealed
                      ? currentTele.correctCorner === 1
                        ? 'border-emerald-400 bg-emerald-950/70 shadow-2xl ring-4 ring-emerald-400/60 scale-[1.03]'
                        : 'border-slate-800 bg-slate-900/40 opacity-40'
                      : 'border-purple-500/50 bg-slate-900/80 hover:border-purple-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-purple-900 text-purple-200 text-xs font-black">
                      ① 칠판 앞 왼쪽 코너
                    </span>
                    {isTeleRevealed && currentTele.correctCorner === 1 && (
                      <span className="text-xs font-black text-emerald-400 animate-bounce">
                        🎉 정답 코너!
                      </span>
                    )}
                  </div>
                  <div className="text-sm sm:text-base font-extrabold text-white leading-relaxed">
                    {currentCorners[0] || '1번 코너'}
                  </div>
                </div>

                {/* Corner 2 */}
                <div
                  className={`p-4 sm:p-5 rounded-2xl border-2 transition-all ${
                    isTeleRevealed
                      ? currentTele.correctCorner === 2
                        ? 'border-emerald-400 bg-emerald-950/70 shadow-2xl ring-4 ring-emerald-400/60 scale-[1.03]'
                        : 'border-slate-800 bg-slate-900/40 opacity-40'
                      : 'border-purple-500/50 bg-slate-900/80 hover:border-purple-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-purple-900 text-purple-200 text-xs font-black">
                      ② 칠판 앞 오른쪽 코너
                    </span>
                    {isTeleRevealed && currentTele.correctCorner === 2 && (
                      <span className="text-xs font-black text-emerald-400 animate-bounce">
                        🎉 정답 코너!
                      </span>
                    )}
                  </div>
                  <div className="text-sm sm:text-base font-extrabold text-white leading-relaxed">
                    {currentCorners[1] || '2번 코너'}
                  </div>
                </div>
              </div>

              {/* Center Stage: The Question & Movement Timer */}
              <div className="my-6 py-6 px-4 bg-slate-900/90 rounded-2xl border border-slate-800 text-center max-w-xl mx-auto w-full z-10 shadow-lg space-y-3">
                <span className="text-[11px] font-black text-purple-400 uppercase tracking-wider">
                  Question
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white leading-relaxed">
                  {currentTele.question || '선생님의 생각을 맞춰보세요!'}
                </h3>

                {/* Movement Countdown Timer */}
                <div className="flex items-center justify-center gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">이동 남은 시간:</span>
                    <span className={`font-mono text-3xl sm:text-4xl font-black tabular-nums ${
                      telepathyTimer <= 3 ? 'text-rose-400 animate-ping' : 'text-amber-400'
                    }`}>
                      {telepathyTimer}초
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleStartTelepathy}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black transition cursor-pointer flex items-center gap-1 shadow-md"
                    >
                      <Play className="w-3 h-3" />
                      <span>이동 타이머 시작</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRevealTelepathy}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition cursor-pointer flex items-center gap-1 shadow-md"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>정답 코너 공개</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Corner 3 (교실 뒤 왼쪽) & Corner 4 (교실 뒤 오른쪽) */}
              <div className="grid grid-cols-2 gap-4 sm:gap-8 z-10">
                {/* Corner 3 */}
                <div
                  className={`p-4 sm:p-5 rounded-2xl border-2 transition-all ${
                    isTeleRevealed
                      ? currentTele.correctCorner === 3
                        ? 'border-emerald-400 bg-emerald-950/70 shadow-2xl ring-4 ring-emerald-400/60 scale-[1.03]'
                        : 'border-slate-800 bg-slate-900/40 opacity-40'
                      : 'border-purple-500/50 bg-slate-900/80 hover:border-purple-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-purple-900 text-purple-200 text-xs font-black">
                      ③ 교실 뒤 왼쪽 코너
                    </span>
                    {isTeleRevealed && currentTele.correctCorner === 3 && (
                      <span className="text-xs font-black text-emerald-400 animate-bounce">
                        🎉 정답 코너!
                      </span>
                    )}
                  </div>
                  <div className="text-sm sm:text-base font-extrabold text-white leading-relaxed">
                    {currentCorners[2] || '3번 코너'}
                  </div>
                </div>

                {/* Corner 4 */}
                <div
                  className={`p-4 sm:p-5 rounded-2xl border-2 transition-all ${
                    isTeleRevealed
                      ? currentTele.correctCorner === 4
                        ? 'border-emerald-400 bg-emerald-950/70 shadow-2xl ring-4 ring-emerald-400/60 scale-[1.03]'
                        : 'border-slate-800 bg-slate-900/40 opacity-40'
                      : 'border-purple-500/50 bg-slate-900/80 hover:border-purple-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-purple-900 text-purple-200 text-xs font-black">
                      ④ 교실 뒤 오른쪽 코너
                    </span>
                    {isTeleRevealed && currentTele.correctCorner === 4 && (
                      <span className="text-xs font-black text-emerald-400 animate-bounce">
                        🎉 정답 코너!
                      </span>
                    )}
                  </div>
                  <div className="text-sm sm:text-base font-extrabold text-white leading-relaxed">
                    {currentCorners[3] || '4번 코너'}
                  </div>
                </div>
              </div>

              {/* Classroom Back Area Indicator */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-widest pointer-events-none">
                [교실 뒤쪽 사물함 & 게시판 영역]
              </div>
            </div>
            )}
          </div>
        )}

        {/* --- TAB 4: 농구 전광판 스타일 모둠 점수판 (가 항목 완벽 구현) --- */}
        {activeQuizTab === 'scoreboard' && (
          <div className="space-y-4">
            {/* Scoreboard Settings Header: Team Count & Quarter */}
            <div className="flex items-center justify-between flex-wrap gap-3 p-3 bg-slate-950 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">모둠(팀) 수 설정:</span>
                <div className="flex items-center gap-1">
                  {[2, 3, 4, 5, 6, 8].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => handleSetTeamCount(cnt)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                        scoreTeams.length === cnt
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {cnt}팀
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">쿼터(PERIOD):</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => {
                        setPeriodQuarter(q);
                        syncToSecondary({ quizType: 'scoreboard', periodQuarter: q });
                      }}
                      className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold transition cursor-pointer ${
                        periodQuarter === q
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {q}Q
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Stadium LED Style Basketball Arena Scoreboard */}
            <div className="bg-slate-950 p-6 rounded-3xl border-4 border-slate-800 shadow-2xl space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏀</span>
                  <span className="font-mono font-black text-amber-400 text-sm tracking-widest uppercase">
                    ARENA LIVE SCOREBOARD
                  </span>
                </div>
                <div className="font-mono text-xs font-black text-rose-500 bg-slate-900 px-3 py-1 rounded-full border border-rose-900/60 animate-pulse">
                  PERIOD {periodQuarter}
                </div>
              </div>

              {/* Teams Grid */}
              <div className={`grid gap-4 ${
                scoreTeams.length <= 2
                  ? 'grid-cols-1 sm:grid-cols-2'
                  : scoreTeams.length <= 4
                  ? 'grid-cols-2 lg:grid-cols-4'
                  : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'
              }`}>
                {scoreTeams.map((t) => (
                  <div
                    key={t.id}
                    className="bg-slate-900/90 rounded-2xl p-4 border-2 border-slate-800 flex flex-col justify-between items-center text-center gap-3 shadow-inner group hover:border-amber-500/60 transition-all"
                  >
                    {/* Team Name with Quick Inline Edit */}
                    <div className="w-full flex items-center justify-between pb-1 border-b border-slate-800 text-xs">
                      {editingTeamId === t.id ? (
                        <div className="flex items-center gap-1 w-full">
                          <input
                            type="text"
                            value={editingTeamName}
                            onChange={(e) => setEditingTeamName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const nextTeams = scoreTeams.map((item) =>
                                  item.id === t.id ? { ...item, name: editingTeamName.trim() || item.name } : item
                                );
                                setScoreTeams(nextTeams);
                                syncToSecondary({ quizType: 'scoreboard', scoreboardTeams: nextTeams });
                                setEditingTeamId(null);
                              }
                            }}
                            autoFocus
                            className="flex-1 px-1.5 py-0.5 bg-slate-950 border border-amber-400 rounded text-xs text-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const nextTeams = scoreTeams.map((item) =>
                                item.id === t.id ? { ...item, name: editingTeamName.trim() || item.name } : item
                              );
                              setScoreTeams(nextTeams);
                              syncToSecondary({ quizType: 'scoreboard', scoreboardTeams: nextTeams });
                              setEditingTeamId(null);
                            }}
                            className="p-1 bg-emerald-600 text-white rounded cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-black text-slate-200 truncate">{t.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTeamId(t.id);
                              setEditingTeamName(t.name);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-white cursor-pointer"
                            title="이름 수정"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* LED Segment Display */}
                    <div className="w-full py-2 bg-slate-950 rounded-xl border border-slate-800/80 my-1">
                      <span className="font-mono text-5xl sm:text-6xl font-black text-amber-400 tabular-nums drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]">
                        {t.score}
                      </span>
                    </div>

                    {/* Score Buttons: -1, +1, +2, +3, 리셋 */}
                    <div className="w-full space-y-1.5 pt-1">
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAdjustScore(t.id, -1)}
                          className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono font-bold text-xs transition active:scale-95 cursor-pointer"
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdjustScore(t.id, 1)}
                          className="py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs transition active:scale-95 cursor-pointer shadow-xs"
                        >
                          +1
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAdjustScore(t.id, 2)}
                          className="py-1 rounded-lg bg-sky-900/60 hover:bg-sky-800 text-sky-200 font-mono font-bold text-[11px] transition active:scale-95 cursor-pointer"
                          title="2점 득점"
                        >
                          +2점
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdjustScore(t.id, 3)}
                          className="py-1 rounded-lg bg-purple-900/60 hover:bg-purple-800 text-purple-200 font-mono font-bold text-[11px] transition active:scale-95 cursor-pointer"
                          title="3점 슛 득점"
                        >
                          +3점
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleResetTeamScore(t.id)}
                        className="w-full py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-[10px] font-bold transition cursor-pointer flex items-center justify-center gap-1"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>리셋</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- MODAL: Problem Registration & Management Center (Left Creation / Right Verification & Editing) --- */}
      <QuizQuestionManagerModal
        isOpen={isQuestionManagerOpen}
        onClose={() => setIsQuestionManagerOpen(false)}
        quizList={quizList}
        telepathyList={telepathyList}
        onUpdateQuizList={(newList) => {
          setQuizList(newList);
          localStorage.setItem('class_quiz_questions', JSON.stringify(newList));
          localStorage.setItem('quiz_custom_questions', JSON.stringify(newList));
          syncToSecondary({ quizzes: newList });
        }}
        onUpdateTelepathyList={(newList) => {
          setTelepathyList(newList);
          localStorage.setItem('class_telepathy_quizzes', JSON.stringify(newList));
          localStorage.setItem('telepathy_custom_quizzes', JSON.stringify(newList));
          syncToSecondary({ telepathyList: newList });
        }}
        onShowToast={onShowToast}
        defaultTab={questionManagerTab}
      />
    </div>
  );
};
