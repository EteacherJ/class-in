import { useState } from 'react';
import { X, ExternalLink, Maximize, Clock, Users, HelpCircle, Dices, Mic, Award, Bell } from 'lucide-react';
import { Student, Team, ClassRole, QuizQuestion, AttentionNotice } from '../types';

interface StudentDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: 'timer' | 'seats' | 'quiz' | 'picker' | 'noise' | 'roles' | 'attention';
  students: Student[];
  teams: Team[];
  roles: ClassRole[];
  quizzes: QuizQuestion[];
  attentionNotice?: AttentionNotice | null;
  decibel?: number;
}

export function StudentDisplayModal({
  isOpen,
  onClose,
  activeTab: initialTab = 'timer',
  students,
  teams,
  roles,
  quizzes,
  attentionNotice,
  decibel = 42,
}: StudentDisplayModalProps) {
  const [tab, setTab] = useState<'timer' | 'seats' | 'quiz' | 'picker' | 'noise' | 'roles' | 'attention'>(initialTab);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Big Timer internal state
  const [timerSeconds, setTimerSeconds] = useState(300);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Big Quiz
  const [quizIdx, setQuizIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  if (!isOpen) return null;

  // Open detached window on second monitor
  const handleOpenPopup = () => {
    const w = 1000;
    const h = 700;
    const left = window.screen.width ? window.screen.width : 1200;
    const top = 100;
    const newWin = window.open(
      '',
      '_blank',
      `width=${w},height=${h},left=${left},top=${top},menubar=no,status=no,toolbar=no`
    );
    if (newWin) {
      newWin.document.title = '학생 보조 모니터 송출 화면 (Class in)';
      newWin.document.body.style.margin = '0';
      newWin.document.body.style.backgroundColor = '#0f172a';
      newWin.document.body.style.color = '#ffffff';
      newWin.document.body.style.fontFamily = 'Pretendard, sans-serif';
      newWin.document.body.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; text-align:center; padding:20px;">
          <h1 style="font-size:3rem; margin-bottom:10px; color:#38bdf8;">🏫 3학년 1반 학생 전용 송출 화면</h1>
          <p style="font-size:1.5rem; color:#94a3b8;">선생님이 메인 모니터에서 송출하는 타이머, 퀴즈, 좌석표가 실시간 반영됩니다.</p>
          <div style="margin-top:30px; font-size:6rem; font-weight:900; font-family:monospace; color:#facc15;">05:00</div>
        </div>
      `;
    }
  };

  // 💡 [안전 방어 코드]: quizzes가 비었거나 undefined일 때 크래시 방지
  const safeQuizzes = Array.isArray(quizzes) ? quizzes.filter((q) => q && q.type) : [];
  const currentQuiz = safeQuizzes[quizIdx] || safeQuizzes[0] || {
    id: 'fallback_quiz',
    type: 'ox',
    question: '대한민국의 수도는 서울이다.',
    answer: 'O',
    explanation: '대한민국의 수도는 서울특별시입니다.',
  };

  return (
    <div
      className={`fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-lg flex items-center justify-center ${
        isFullScreen ? 'p-0' : 'p-3 sm:p-6'
      }`}
    >
      <div
        className={`bg-slate-900 text-white w-full rounded-[2.5rem] border border-slate-800 shadow-2xl flex flex-col overflow-hidden transition-all ${
          isFullScreen ? 'h-screen w-screen rounded-none border-none' : 'max-w-6xl max-h-[94vh]'
        }`}
      >
        {/* Top bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🖥️</span>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-100 flex items-center gap-2">
                <span>학생 보조 모니터 송출 모드</span>
                <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-500/40">
                  교사 관리 UI 숨김
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                전자칠판 또는 학생용 프로젝터/보조 모니터에 깨끗하게 전체 화면으로 띄웁니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Selector Tabs */}
            <div className="hidden md:flex bg-slate-800 p-1 rounded-xl text-xs font-bold gap-1">
              <button
                onClick={() => setTab('timer')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
                  tab === 'timer' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>대형 타이머</span>
              </button>
              <button
                onClick={() => setTab('seats')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
                  tab === 'seats' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>좌석 배치</span>
              </button>
              <button
                onClick={() => setTab('quiz')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
                  tab === 'quiz' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>퀴즈 쇼</span>
              </button>
              <button
                onClick={() => setTab('noise')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
                  tab === 'noise' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>소음 신호등</span>
              </button>
              <button
                onClick={() => setTab('roles')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
                  tab === 'roles' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>1인 1역할</span>
              </button>
            </div>

            {/* Detach / Popup button */}
            <button
              onClick={handleOpenPopup}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all shadow-sm"
              title="독립 브라우저 팝업창으로 분리"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">새 팝업창 분리</span>
            </button>

            {/* Fullscreen toggle */}
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isFullScreen ? '창 모드로 복귀' : '전체화면'}
            >
              <Maximize className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Display Area */}
        <div className="flex-1 overflow-y-auto custom-scroll p-6 sm:p-10 flex flex-col items-center justify-center bg-slate-900/60">
          {/* 1. BIG TIMER VIEW */}
          {tab === 'timer' && (
            <div className="flex flex-col items-center justify-center text-center space-y-6 animate-fade-in w-full max-w-3xl">
              <span className="text-sm uppercase tracking-widest font-black text-blue-400 bg-blue-950/60 px-4 py-1 rounded-full border border-blue-800">
                집중 시간 타이머
              </span>
              <div className="text-7xl sm:text-9xl font-black tracking-tighter tabular-nums font-mono text-amber-400 drop-shadow-[0_0_35px_rgba(251,191,36,0.3)]">
                {Math.floor(timerSeconds / 60)
                  .toString()
                  .padStart(2, '0')}
                :{(timerSeconds % 60).toString().padStart(2, '0')}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className="px-8 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm shadow-lg transition-all"
                >
                  {isTimerRunning ? '일시정지' : '시작'}
                </button>
                <button
                  onClick={() => {
                    setIsTimerRunning(false);
                    setTimerSeconds(300);
                  }}
                  className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-all"
                >
                  5분 리셋
                </button>
                <button
                  onClick={() => {
                    setIsTimerRunning(false);
                    setTimerSeconds(600);
                  }}
                  className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-all"
                >
                  10분 리셋
                </button>
              </div>
            </div>
          )}

          {/* 2. SEATING CHART VIEW (STUDENT PERSPECTIVE) */}
          {tab === 'seats' && (
            <div className="w-full max-w-4xl space-y-6 animate-fade-in">
              <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700 text-center font-black text-slate-300 text-sm">
                [ 칠판 및 선생님 화면 (정면) ]
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {teams.map((team) => {
                  const teamStudents = students.filter((s) => s.teamId === team.id);
                  return (
                    <div
                      key={team.id}
                      className="p-4 bg-slate-800/90 rounded-3xl border border-slate-700 shadow-lg flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                        <span className="text-sm font-black text-amber-300">{team.name}</span>
                        <span className="text-xs font-bold text-slate-400">{team.points}점</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 my-3">
                        {teamStudents.map((s) => (
                          <div
                            key={s.id}
                            className="p-3 bg-slate-900 rounded-2xl border border-slate-700/80 text-center font-black text-base text-slate-100 hover:border-blue-400 transition-colors"
                          >
                            <div>{s.name}</div>
                            <div className="text-[10px] text-slate-400 font-normal">#{s.number}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. BIG QUIZ VIEW */}
          {tab === 'quiz' && currentQuiz && (
            <div className="w-full max-w-3xl flex flex-col items-center justify-between gap-8 animate-fade-in">
              <span className="text-sm font-black bg-purple-900/60 text-purple-300 px-4 py-1.5 rounded-full border border-purple-700">
                문제 {quizIdx + 1} / {quizzes.length}
              </span>

              <div className="bg-slate-800/90 p-8 sm:p-12 rounded-[2.5rem] border border-slate-700 w-full text-center shadow-xl">
                <h2 className="text-3xl sm:text-4xl font-black text-slate-100 leading-snug break-keep">
                  {currentQuiz?.question || '문제를 준비 중입니다...'}
                </h2>
              </div>

              {currentQuiz?.type === 'ox' ? (
                <div className="grid grid-cols-2 gap-6 w-full max-w-md">
                  <div className="p-8 rounded-3xl bg-emerald-950/60 border-2 border-emerald-500 text-emerald-400 text-6xl font-black text-center shadow-lg">
                    O
                  </div>
                  <div className="p-8 rounded-3xl bg-rose-950/60 border-2 border-rose-500 text-rose-400 text-6xl font-black text-center shadow-lg">
                    X
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  {currentQuiz?.options?.map((opt, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-2xl bg-slate-800 border border-slate-700 text-lg font-black flex items-center gap-3 text-slate-200"
                    >
                      <span className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center text-sm font-black text-slate-300">
                        {i + 1}
                      </span>
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>
              )}

              {showAnswer && (
                <div className="bg-emerald-950/80 border border-emerald-600 rounded-2xl p-4 text-center text-emerald-300 font-black text-xl animate-fade-in w-full">
                  🎉 정답: {currentQuiz?.type === 'ox' ? currentQuiz?.answer : `${Number(currentQuiz?.answer || 0) + 1}번`}
                  {currentQuiz?.explanation && (
                    <p className="text-sm font-semibold text-emerald-400/80 mt-1">
                      {currentQuiz.explanation}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAnswer(!showAnswer)}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-sm"
                >
                  {showAnswer ? '정답 숨기기' : '정답 공개'}
                </button>
                <button
                  onClick={() => {
                    setShowAnswer(false);
                    setQuizIdx((prev) => (prev + 1) % quizzes.length);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm"
                >
                  다음 문항 →
                </button>
              </div>
            </div>
          )}

          {/* 4. NOISE TRAFFIC LIGHT VIEW */}
          {tab === 'noise' && (
            <div className="flex flex-col items-center justify-center text-center space-y-8 animate-fade-in">
              <span className="text-sm uppercase tracking-widest font-black text-slate-400 bg-slate-800 px-4 py-1.5 rounded-full">
                실시간 교실 소음 신호등
              </span>

              {/* Huge 3-Bulb Traffic Light */}
              <div className="flex items-center gap-8 bg-slate-950 p-6 sm:p-8 rounded-[3rem] border-4 border-slate-800 shadow-2xl">
                {/* Green */}
                <div
                  className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full transition-all duration-300 flex items-center justify-center ${
                    decibel < 68
                      ? 'bg-emerald-400 shadow-[0_0_50px_rgba(52,211,153,0.9)] scale-105'
                      : 'bg-emerald-950/40 opacity-20'
                  }`}
                >
                  <span className="text-emerald-950 text-2xl font-black">초록</span>
                </div>

                {/* Yellow */}
                <div
                  className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full transition-all duration-300 flex items-center justify-center ${
                    decibel >= 68 && decibel < 82
                      ? 'bg-amber-400 shadow-[0_0_50px_rgba(251,191,36,0.9)] scale-105 animate-pulse'
                      : 'bg-amber-950/40 opacity-20'
                  }`}
                >
                  <span className="text-amber-950 text-2xl font-black">주의</span>
                </div>

                {/* Red */}
                <div
                  className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full transition-all duration-300 flex items-center justify-center ${
                    decibel >= 82
                      ? 'bg-rose-500 shadow-[0_0_60px_rgba(244,63,94,1)] scale-105 animate-ping'
                      : 'bg-rose-950/40 opacity-20'
                  }`}
                >
                  <span className="text-rose-50 text-2xl font-black">위험</span>
                </div>
              </div>

              <div className="text-5xl font-black text-slate-200 tabular-nums">
                {decibel} <span className="text-xl text-slate-500">dB</span>
              </div>
              <p className="text-slate-400 font-bold text-sm">
                * 초록 불이 유지되도록 예쁜 목소리로 모둠 활동에 참여해주세요!
              </p>
            </div>
          )}

          {/* 5. 1인 1역할 표 */}
          {tab === 'roles' && (
            <div className="w-full max-w-4xl space-y-4 animate-fade-in">
              <h2 className="text-2xl font-black text-center text-pink-300 mb-4">
                🌟 우리 반 1인 1역할 배정 현황 🌟
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {roles.map((r) => {
                  const assigned = r.currentStudentIds
                    .map((id) => students.find((s) => s.id === id)?.name)
                    .filter(Boolean);

                  return (
                    <div
                      key={r.id}
                      className="p-4 bg-slate-800/90 rounded-2xl border border-slate-700 flex flex-col justify-between"
                    >
                      <div className="text-sm font-black text-slate-200 mb-1">{r.title}</div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {assigned.length > 0 ? (
                          assigned.map((name, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 bg-pink-950 text-pink-300 border border-pink-700 rounded-lg text-xs font-black"
                            >
                              {name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500 italic">공석</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
