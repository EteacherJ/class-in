import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Play,
  CheckCircle,
  HelpCircle,
  RotateCcw,
  Maximize2,
  Trash2,
  Volume2,
  Trophy,
  Users,
  Timer,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Tv,
} from 'lucide-react';
import {
  QuizQuestion,
  TelepathyQuiz,
  BasketballScoreboardTeam,
  Team,
} from '../types';
import {
  initialTelepathyQuizzes,
  initialBasketballTeams,
  initialQuizzes,
} from '../data/initialData';
import { playCelebrateSound, playSelectedChime } from '../utils/audio';

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizzes: QuizQuestion[];
  onUpdateQuizzes: (newQuizzes: QuizQuestion[]) => void;
  teams: Team[];
  onOpenStudentDisplay?: (tab: 'quiz') => void;
  onShowToast: (msg: string) => void;
}

export const QuizModal: React.FC<QuizModalProps> = ({
  isOpen,
  onClose,
  quizzes,
  onUpdateQuizzes,
  teams,
  onOpenStudentDisplay,
  onShowToast,
}) => {
  // Main Tab: Standard Quiz (OX / Choice) vs Telepathy Quiz vs Basketball Scoreboard
  const [activeTab, setActiveTab] = useState<'standard' | 'telepathy' | 'scoreboard'>('standard');

  // Standard Quiz State
  const [activeQuizIndex, setActiveQuizIndex] = useState(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [selectedUserAnswer, setSelectedUserAnswer] = useState<string | number | null>(null);

  // New question form state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newType, setNewType] = useState<'ox' | 'choice'>('choice');
  const [newOptionCount, setNewOptionCount] = useState<number>(4); // 2, 3, 4, 5
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newOptions, setNewOptions] = useState<string[]>([
    '1번 보기',
    '2번 보기',
    '3번 보기',
    '4번 보기',
  ]);
  const [newAnswer, setNewAnswer] = useState<string | number>(0);
  const [newExplanation, setNewExplanation] = useState('');

  // Telepathy Quiz State (요구사항 10)
  const [telepathyList, setTelepathyList] = useState<TelepathyQuiz[]>(initialTelepathyQuizzes);
  const [telepathyIndex, setTelepathyIndex] = useState(0);
  const [telepathyTimer, setTelepathyTimer] = useState<number>(15);
  const [isTelepathyTimerRunning, setIsTelepathyTimerRunning] = useState<boolean>(false);
  const [isTelepathyRevealed, setIsTelepathyRevealed] = useState<boolean>(false);

  // Basketball Scoreboard State (요구사항 10: 농구 전광판 스타일 모둠 점수판)
  const [scoreTeams, setScoreTeams] = useState<BasketballScoreboardTeam[]>(
    teams.length > 0
      ? teams.map((t) => ({
          id: t.id,
          name: t.name,
          score: t.points,
          color: t.dotColor || 'bg-amber-500',
        }))
      : initialBasketballTeams
  );
  const [periodQuarter, setPeriodQuarter] = useState<number>(1);

  // Telepathy countdown timer
  useEffect(() => {
    let interval: number;
    if (isTelepathyTimerRunning && telepathyTimer > 0) {
      interval = window.setInterval(() => {
        setTelepathyTimer((prev) => {
          if (prev <= 1) {
            setIsTelepathyTimerRunning(false);
            setIsTelepathyRevealed(true);
            playCelebrateSound();
            onShowToast('🎉 시간 종료! 교실 4개 모서리에서 정답 코너를 확인하세요!');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTelepathyTimerRunning, telepathyTimer, onShowToast]);

  if (!isOpen) return null;

  // 💡 [안전 방어 코드]: quizzes가 비었거나 undefined일 때 크래시 방지
  const safeQuizzes = Array.isArray(quizzes) ? quizzes.filter((q) => q && q.type) : [];
  const currentQuiz = safeQuizzes[activeQuizIndex] || safeQuizzes[0] || {
    id: 'fallback_quiz',
    type: 'ox',
    question: '대한민국의 수도는 서울이다.',
    answer: 'O',
    explanation: '대한민국의 수도는 서울특별시입니다.',
  };
  const rawTelepathy = telepathyList[telepathyIndex] || telepathyList[0];
  const currentTeleCorners: [string, string, string, string] = Array.isArray(rawTelepathy?.corners) && rawTelepathy.corners.length >= 4
    ? [rawTelepathy.corners[0] || '1번 코너', rawTelepathy.corners[1] || '2번 코너', rawTelepathy.corners[2] || '3번 코너', rawTelepathy.corners[3] || '4번 코너']
    : ['1번 코너 (앞 왼쪽)', '2번 코너 (앞 오른쪽)', '3번 코너 (뒤 왼쪽)', '4번 코너 (뒤 오른쪽)'];

  const currentTelepathy = {
    id: rawTelepathy?.id || 'tele-default',
    question: rawTelepathy?.question || '선생님의 생각을 맞춰보세요!',
    corners: currentTeleCorners,
    correctCorner: (rawTelepathy?.correctCorner || 1) as 1 | 2 | 3 | 4,
    timeLimit: rawTelepathy?.timeLimit || 15,
  };

  // Option count change
  const handleOptionCountChange = (cnt: number) => {
    setNewOptionCount(cnt);
    const updated = Array.from({ length: cnt }, (_, i) => newOptions[i] || `${i + 1}번 보기`);
    setNewOptions(updated);
  };

  const handleRevealAnswer = () => {
    setIsAnswerRevealed(true);
    playCelebrateSound();
  };

  const handleAddQuestion = () => {
    if (!newQuestionText.trim()) {
      onShowToast('문제 내용을 입력해주세요.');
      return;
    }

    const created: QuizQuestion = {
      id: `quiz_${Date.now()}`,
      type: newType,
      question: newQuestionText.trim(),
      options: newType === 'choice' ? newOptions : undefined,
      answer: newAnswer,
      explanation: newExplanation.trim() || undefined,
    };

    onUpdateQuizzes([...quizzes, created]);
    setIsAddingNew(false);
    setNewQuestionText('');
    setNewExplanation('');
    onShowToast('✨ 새 퀴즈 문제가 추가되었습니다.');
  };

  const handleClearAllQuizzes = () => {
    onUpdateQuizzes([]);
    setActiveQuizIndex(0);
    setIsAddingNew(true);
    onShowToast('🗑️ 기존 퀴즈가 초기화되었습니다. 원하는 문제를 직접 입력해보세요.');
  };

  const handleRestoreSampleQuizzes = () => {
    onUpdateQuizzes(initialQuizzes);
    setActiveQuizIndex(0);
    setIsAddingNew(false);
    onShowToast('📚 기본 예시 퀴즈 문제 세트가 복원되었습니다.');
  };

  // Basketball Scoreboard handlers
  const handleAddPoints = (teamId: number, delta: number) => {
    setScoreTeams(
      scoreTeams.map((t) => (t.id === teamId ? { ...t, score: Math.max(0, t.score + delta) } : t))
    );
    if (delta > 0) {
      playSelectedChime('bell_ding');
    }
  };

  const handleResetScores = () => {
    setScoreTeams(scoreTeams.map((t) => ({ ...t, score: 0 })));
    onShowToast('🏀 모둠 농구 전광판 점수가 0점으로 초기화되었습니다.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[94vh]">
        {/* Top Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-md">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg">
                  퀴즈 모드
                </h3>
                <span className="text-[10px] bg-purple-500 text-white px-2 py-0.5 rounded-full font-bold">
                  OX · 객관식 · 텔레파시 · 농구 점수판
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                수업 이해도 평가, 4코너 텔레파시 신체 활동, 전광판 모둠 점수 경쟁을 진행합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenStudentDisplay && (
              <button
                onClick={() => onOpenStudentDisplay('quiz')}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="보조 모니터로 학생 전체화면 송출"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>보조 모니터 팝업</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-3 bg-slate-100 border-b border-slate-200 text-xs font-black">
          <button
            onClick={() => setActiveTab('standard')}
            className={`py-3 flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'standard'
                ? 'bg-white text-purple-700 border-b-2 border-purple-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>① OX / 객관식 퀴즈 ({quizzes.length}문항)</span>
          </button>
          <button
            onClick={() => setActiveTab('telepathy')}
            className={`py-3 flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'telepathy'
                ? 'bg-white text-purple-700 border-b-2 border-purple-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>② 4개 코너 텔레파시 퀴즈</span>
          </button>
          <button
            onClick={() => setActiveTab('scoreboard')}
            className={`py-3 flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'scoreboard'
                ? 'bg-white text-purple-700 border-b-2 border-purple-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>③ 농구 전광판 모둠 점수판</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto custom-scroll flex-1">
          {/* TAB 1: Standard OX / Multiple Choice Quiz */}
          {activeTab === 'standard' && (
            <div className="space-y-6">
              {/* Question Navigation & Action bar */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-500">문제 이동:</span>
                  <div className="flex gap-1 flex-wrap">
                    {quizzes.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">등록된 문제가 없습니다</span>
                    ) : (
                      quizzes.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setActiveQuizIndex(idx);
                            setIsAnswerRevealed(false);
                            setSelectedUserAnswer(null);
                          }}
                          className={`w-7 h-7 rounded-lg text-xs font-black transition cursor-pointer ${
                            activeQuizIndex === idx
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleClearAllQuizzes}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    title="기존 퀴즈를 모두 비우고 직접 처음부터 작성합니다"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>문제 전체 비우기</span>
                  </button>

                  <button
                    onClick={handleRestoreSampleQuizzes}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    title="기본 샘플 퀴즈 문제를 다시 가져옵니다"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>기본 예시 문제 복원</span>
                  </button>

                  <button
                    onClick={() => setIsAddingNew(!isAddingNew)}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAddingNew ? '출제창 닫기' : '새 문제 직접 만들기'}</span>
                  </button>
                </div>
              </div>

              {/* Add New Question Form (with 2~5 options selection) */}
              {isAddingNew && (
                <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3 text-xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-extrabold text-purple-950">새 퀴즈 문항 출제</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setNewType('ox')}
                        className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                          newType === 'ox'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        OX 퀴즈
                      </button>
                      <button
                        onClick={() => setNewType('choice')}
                        className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                          newType === 'choice'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        객관식 퀴즈
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">문제 발문 입력</label>
                    <input
                      type="text"
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                      placeholder="문제를 입력하세요 (예: 다음 중 광합성에 필요하지 않은 것은?)"
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl outline-none font-medium"
                    />
                  </div>

                  {newType === 'choice' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700">
                          선택 문항 개수 설정 (요구사항 10)
                        </span>
                        <div className="flex gap-1">
                          {[2, 3, 4, 5].map((cnt) => (
                            <button
                              key={cnt}
                              type="button"
                              onClick={() => handleOptionCountChange(cnt)}
                              className={`px-2.5 py-0.5 rounded-lg text-xs font-black transition cursor-pointer ${
                                newOptionCount === cnt
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-white text-slate-600 border border-purple-200'
                              }`}
                            >
                              {cnt}지 선다
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {newOptions.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-2">
                            <span className="font-bold text-slate-400 w-5 text-center">
                              {oIdx + 1}
                            </span>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const copy = [...newOptions];
                                copy[oIdx] = e.target.value;
                                setNewOptions(copy);
                              }}
                              className="flex-1 px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-xs outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setNewAnswer(oIdx)}
                              className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
                                newAnswer === oIdx
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              정답
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {newType === 'ox' && (
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-700">정답 선택:</span>
                      <button
                        type="button"
                        onClick={() => setNewAnswer('O')}
                        className={`px-4 py-1.5 rounded-xl font-black text-sm cursor-pointer ${
                          newAnswer === 'O' ? 'bg-blue-600 text-white' : 'bg-white border'
                        }`}
                      >
                        O (그렇다)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewAnswer('X')}
                        className={`px-4 py-1.5 rounded-xl font-black text-sm cursor-pointer ${
                          newAnswer === 'X' ? 'bg-rose-600 text-white' : 'bg-white border'
                        }`}
                      >
                        X (아니다)
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">정답 해설 (선택)</label>
                    <input
                      type="text"
                      value={newExplanation}
                      onChange={(e) => setNewExplanation(e.target.value)}
                      placeholder="정답 공개 시 학생들에게 보여줄 친절한 설명..."
                      className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-xl outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-sm cursor-pointer"
                    >
                      문제 등록 완료
                    </button>
                  </div>
                </div>
              )}

              {/* Active Question Display Card */}
              {currentQuiz && (
                <div className="p-6 sm:p-8 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl shadow-xl space-y-6 border border-purple-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider bg-purple-500/30 text-purple-300 px-3 py-1 rounded-full border border-purple-400/30">
                      문제 {activeQuizIndex + 1} / {quizzes.length} [{currentQuiz?.type === 'ox' ? 'OX 퀴즈' : '객관식'}]
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const updated = quizzes.filter((_, i) => i !== activeQuizIndex);
                          onUpdateQuizzes(updated);
                          setActiveQuizIndex((prev) => Math.max(0, Math.min(prev, updated.length - 1)));
                          onShowToast('🗑️ 해당 퀴즈 문제가 삭제되었습니다.');
                        }}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-400 text-xs transition cursor-pointer"
                        title="현재 문제 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={handleRevealAnswer}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-xs rounded-xl shadow-md transition active:scale-95 cursor-pointer"
                      >
                        ✨ 정답 공개
                      </button>
                    </div>
                  </div>

                  <h3 className="text-xl sm:text-3xl font-extrabold leading-snug tracking-tight text-white py-2">
                    {currentQuiz.question}
                  </h3>

                  {/* Options */}
                  {currentQuiz?.type === 'choice' && currentQuiz.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {currentQuiz.options.map((opt, oIdx) => {
                        const isCorrect = isAnswerRevealed && currentQuiz.answer === oIdx;
                        const isSelected = selectedUserAnswer === oIdx;

                        return (
                          <button
                            key={oIdx}
                            onClick={() => setSelectedUserAnswer(oIdx)}
                            className={`p-4 rounded-2xl border-2 text-left font-bold text-sm sm:text-base transition cursor-pointer flex items-center gap-3 ${
                              isCorrect
                                ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200 ring-2 ring-emerald-400'
                                : isSelected
                                ? 'bg-purple-600/40 border-purple-400 text-white'
                                : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800'
                            }`}
                          >
                            <span className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center font-mono font-black text-xs shrink-0">
                              {oIdx + 1}
                            </span>
                            <span className="flex-1">{opt}</span>
                            {isCorrect && (
                              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {currentQuiz?.type === 'ox' && (
                    <div className="grid grid-cols-2 gap-4 py-4">
                      {['O', 'X'].map((val) => {
                        const isCorrect = isAnswerRevealed && currentQuiz.answer === val;
                        const isSelected = selectedUserAnswer === val;

                        return (
                          <button
                            key={val}
                            onClick={() => setSelectedUserAnswer(val)}
                            className={`py-8 rounded-3xl border-2 font-black text-4xl sm:text-6xl transition cursor-pointer flex flex-col items-center justify-center gap-2 ${
                              isCorrect
                                ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200 ring-4 ring-emerald-400 shadow-lg'
                                : isSelected
                                ? 'bg-purple-600/40 border-purple-400 text-white'
                                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <span>{val}</span>
                            <span className="text-xs font-bold text-slate-400">
                              {val === 'O' ? '맞다' : '틀리다'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Explanation Banner when revealed */}
                  {isAnswerRevealed && (
                    <div className="p-4 bg-emerald-950/60 border border-emerald-500/60 rounded-2xl animate-fade-in text-emerald-200 text-xs sm:text-sm space-y-1">
                      <div className="font-extrabold flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle className="w-4 h-4" />
                        <span>
                          정답:{' '}
                          {currentQuiz?.type === 'ox'
                            ? currentQuiz.answer
                            : `${Number(currentQuiz.answer) + 1}번 (${currentQuiz.options?.[Number(currentQuiz.answer)]})`}
                        </span>
                      </div>
                      {currentQuiz.explanation && (
                        <p className="text-slate-300">{currentQuiz.explanation}</p>
                      )}
                    </div>
                  )}

                  {/* Navigation footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                    <button
                      onClick={() => {
                        setIsAnswerRevealed(false);
                        setSelectedUserAnswer(null);
                        setActiveQuizIndex((prev) => Math.max(0, prev - 1));
                      }}
                      disabled={activeQuizIndex === 0}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>이전 문제</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsAnswerRevealed(false);
                        setSelectedUserAnswer(null);
                        setActiveQuizIndex((prev) => Math.min(quizzes.length - 1, prev + 1));
                      }}
                      disabled={activeQuizIndex === quizzes.length - 1}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-30 font-bold flex items-center gap-1 cursor-pointer shadow-md"
                    >
                      <span>다음 문제</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {quizzes.length === 0 && !isAddingNew && (
                <div className="p-10 bg-slate-900 text-white rounded-3xl border border-purple-500/30 flex flex-col items-center justify-center text-center space-y-4 shadow-xl">
                  <div className="w-16 h-16 rounded-3xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-3xl">
                    ✏️
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">등록된 퀴즈 문제가 없습니다</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-md">
                      수업에 맞게 원하는 OX 퀴즈 또는 2~5지선다 객관식 문제를 직접 출제하거나, 샘플 예시 문제를 불러와 수업에 활용해 보세요.
                    </p>
                  </div>
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => setIsAddingNew(true)}
                      className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md"
                    >
                      <Plus className="w-4 h-4" />
                      <span>새 퀴즈 문제 직접 출제하기</span>
                    </button>
                    <button
                      onClick={handleRestoreSampleQuizzes}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-2 cursor-pointer border border-slate-700"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>기본 예시 문제 복원</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Telepathy 4-Corner Quiz (요구사항 10: 텔레파시 퀴즈) */}
          {activeTab === 'telepathy' && (
            <div className="space-y-6">
              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div>
                  <span className="font-black text-purple-950">
                    🎯 교실 4개 모서리 텔레파시 퀴즈 규칙
                  </span>
                  <p className="text-purple-800 text-[11px] mt-0.5">
                    교실의 4개 모서리(1번, 2번, 3번, 4번)로 학생들이 제한 시간 내에 이동하여 선생님과 마음이 통하는 선택지를 맞히는 활동입니다!
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setTelepathyTimer(currentTelepathy.timeLimit);
                      setIsTelepathyTimerRunning(true);
                      setIsTelepathyRevealed(false);
                      onShowToast('⏳ 텔레파시 이동 타이머가 시작되었습니다! 원하는 코너로 이동하세요!');
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Timer className="w-4 h-4" />
                    <span>이동 타이머 시작 ({telepathyTimer}s)</span>
                  </button>
                </div>
              </div>

              {/* Main Telepathy Board */}
              <div className="p-6 bg-slate-900 text-white rounded-3xl border border-purple-500/40 space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black bg-pink-500 text-white px-3 py-1 rounded-full">
                    텔레파시 질문 {telepathyIndex + 1}
                  </span>
                  <div className="font-mono text-3xl font-black text-amber-300">
                    {telepathyTimer}초
                  </div>
                </div>

                <h3 className="text-2xl font-black text-center py-2 text-white">
                  “{currentTelepathy.question}”
                </h3>

                {/* 4 Corner Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {currentTelepathy.corners.map((corner, cIdx) => {
                    const isWinner = isTelepathyRevealed && currentTelepathy.correctCorner === cIdx + 1;

                    return (
                      <div
                        key={cIdx}
                        className={`p-5 rounded-2xl border-2 transition-all flex flex-col justify-between gap-3 ${
                          isWinner
                            ? 'bg-emerald-500/40 border-emerald-400 ring-4 ring-emerald-400 shadow-xl'
                            : 'bg-slate-800/90 border-slate-700 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-white/20">
                            코너 {cIdx + 1}
                          </span>
                          {isWinner && (
                            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950">
                              🎉 선생님 선택!
                            </span>
                          )}
                        </div>
                        <div className="text-lg font-black text-white">{corner}</div>
                        <div className="text-[11px] text-slate-400">
                          교실 {cIdx + 1 === 1 ? '앞쪽 왼쪽' : cIdx + 1 === 2 ? '앞쪽 오른쪽' : cIdx + 1 === 3 ? '뒤쪽 왼쪽' : '뒤쪽 오른쪽'} 모서리
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setIsTelepathyRevealed(true);
                      playCelebrateSound();
                    }}
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-sm rounded-xl shadow-lg cursor-pointer"
                  >
                    선생님 텔레파시 정답 코너 공개
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Basketball Scoreboard (요구사항 10: 농구 전광판 스타일 모둠 점수판) */}
          {activeTab === 'scoreboard' && (
            <div className="space-y-6">
              {/* Scoreboard Top Controls */}
              <div className="flex items-center justify-between flex-wrap gap-2 bg-slate-900 text-white p-4 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                    🏀
                  </div>
                  <div>
                    <h4 className="font-black text-sm">농구 전광판 모둠 슛 점수판</h4>
                    <p className="text-[11px] text-slate-400">
                      퀴즈 정답 및 협동 미션 성공 시 +1점, +2점, +3점 슛으로 점수를 올립니다.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-xl">
                    <span className="text-slate-400 font-bold">쿼터:</span>
                    {[1, 2, 3, 4].map((q) => (
                      <button
                        key={q}
                        onClick={() => setPeriodQuarter(q)}
                        className={`w-6 h-6 rounded font-black cursor-pointer ${
                          periodQuarter === q ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                        }`}
                      >
                        {q}Q
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleResetScores}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition cursor-pointer"
                  >
                    점수 초기화
                  </button>
                </div>
              </div>

              {/* Digital Scoreboard Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {scoreTeams.map((tm) => (
                  <div
                    key={tm.id}
                    className="bg-slate-950 border-2 border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col justify-between gap-4 text-center relative overflow-hidden"
                  >
                    {/* Team Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                        {tm.name}
                      </span>
                      <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                    </div>

                    {/* Big Digital LED Score */}
                    <div className="py-2">
                      <div className="font-mono text-6xl sm:text-7xl font-black text-amber-400 tracking-tighter drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]">
                        {String(tm.score).padStart(2, '0')}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono tracking-widest mt-1">
                        POINTS
                      </div>
                    </div>

                    {/* Point Buttons (+1, +2, +3, -1) */}
                    <div className="grid grid-cols-4 gap-1 text-xs font-black">
                      <button
                        onClick={() => handleAddPoints(tm.id, 1)}
                        className="py-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white rounded-xl transition active:scale-90 cursor-pointer"
                        title="자유투 +1점"
                      >
                        +1
                      </button>
                      <button
                        onClick={() => handleAddPoints(tm.id, 2)}
                        className="py-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white rounded-xl transition active:scale-90 cursor-pointer"
                        title="2점 필드골"
                      >
                        +2
                      </button>
                      <button
                        onClick={() => handleAddPoints(tm.id, 3)}
                        className="py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition active:scale-90 cursor-pointer font-extrabold shadow-sm"
                        title="3점 슛!"
                      >
                        +3
                      </button>
                      <button
                        onClick={() => handleAddPoints(tm.id, -1)}
                        className="py-2 bg-slate-900 hover:bg-slate-800 text-slate-500 rounded-xl transition active:scale-90 cursor-pointer"
                        title="1점 감점"
                      >
                        -1
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            모드: <span className="font-bold text-slate-800">
              {activeTab === 'standard' ? 'OX & 객관식' : activeTab === 'telepathy' ? '4코너 텔레파시' : '농구 전광판 점수판'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
