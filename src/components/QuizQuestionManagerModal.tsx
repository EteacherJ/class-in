import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Clock,
  Compass,
  ListFilter,
  AlertTriangle,
} from 'lucide-react';
import { QuizQuestion, TelepathyQuiz } from '../types';

interface QuizQuestionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizList: QuizQuestion[];
  telepathyList: TelepathyQuiz[];
  onUpdateQuizList: (newList: QuizQuestion[]) => void;
  onUpdateTelepathyList: (newList: TelepathyQuiz[]) => void;
  onShowToast: (msg: string) => void;
  defaultTab?: 'ox' | 'choice' | 'telepathy';
}

export const QuizQuestionManagerModal: React.FC<QuizQuestionManagerModalProps> = ({
  isOpen,
  onClose,
  quizList,
  telepathyList,
  onUpdateQuizList,
  onUpdateTelepathyList,
  onShowToast,
  defaultTab = 'ox',
}) => {
  // Selected question category for creation/management
  const [selectedType, setSelectedType] = useState<'ox' | 'choice' | 'telepathy'>(defaultTab);

  // Edit state: if editing existing question
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states for OX / Choice
  const [questionText, setQuestionText] = useState<string>('');
  const [oxAnswer, setOxAnswer] = useState<'O' | 'X'>('O');
  const [choiceOptions, setChoiceOptions] = useState<string[]>([
    '1번 보기',
    '2번 보기',
    '3번 보기',
    '4번 보기',
  ]);
  const [choiceAnswer, setChoiceAnswer] = useState<number>(0);
  const [explanation, setExplanation] = useState<string>('');

  // Form states for Telepathy
  const [teleQuestion, setTeleQuestion] = useState<string>('');
  const [teleTimeSeconds, setTeleTimeSeconds] = useState<number>(15);
  const [teleCorner1, setTeleCorner1] = useState<string>('');
  const [teleCorner2, setTeleCorner2] = useState<string>('');
  const [teleCorner3, setTeleCorner3] = useState<string>('');
  const [teleCorner4, setTeleCorner4] = useState<string>('');
  const [teleCorrectCorner, setTeleCorrectCorner] = useState<1 | 2 | 3 | 4>(1);

  // Filter in Right Panel
  const [listFilter, setListFilter] = useState<'all' | 'ox' | 'choice' | 'telepathy'>('all');

  // Reset form to clean state
  const resetForm = () => {
    setEditingId(null);
    setQuestionText('');
    setOxAnswer('O');
    setChoiceOptions(['1번 보기', '2번 보기', '3번 보기', '4번 보기']);
    setChoiceAnswer(0);
    setExplanation('');

    setTeleQuestion('');
    setTeleTimeSeconds(15);
    setTeleCorner1('');
    setTeleCorner2('');
    setTeleCorner3('');
    setTeleCorner4('');
    setTeleCorrectCorner(1);
  };

  // Start editing a quiz or telepathy item
  const handleStartEditQuiz = (q: QuizQuestion) => {
    if (!q) return;
    setEditingId(q.id);
    setSelectedType(q.type || 'ox');
    setQuestionText(q.question || '');
    setExplanation(q.explanation || '');
    if (q.type === 'ox') {
      setOxAnswer((q.answer as 'O' | 'X') || 'O');
    } else {
      setChoiceOptions(q.options && q.options.length === 4 ? q.options : ['보기1', '보기2', '보기3', '보기4']);
      setChoiceAnswer(typeof q.answer === 'number' ? q.answer : 0);
    }
  };

  const handleStartEditTelepathy = (t: TelepathyQuiz) => {
    setEditingId(t.id);
    setSelectedType('telepathy');
    setTeleQuestion(t.question);
    setTeleTimeSeconds(t.timeLimit || 15);
    setTeleCorner1(t.corners[0] || '');
    setTeleCorner2(t.corners[1] || '');
    setTeleCorner3(t.corners[2] || '');
    setTeleCorner4(t.corners[3] || '');
    setTeleCorrectCorner((t.correctCorner as 1 | 2 | 3 | 4) || 1);
  };

  // Save (Create or Update)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedType === 'telepathy') {
      if (
        !teleQuestion.trim() ||
        !teleCorner1.trim() ||
        !teleCorner2.trim() ||
        !teleCorner3.trim() ||
        !teleCorner4.trim()
      ) {
        onShowToast('⚠️ 문제 내용과 4곳의 코너 보기를 모두 작성해주세요.');
        return;
      }

      if (editingId) {
        // Update existing
        const updated = telepathyList.map((t) => {
          if (t.id === editingId) {
            return {
              ...t,
              question: teleQuestion.trim(),
              corners: [
                teleCorner1.trim(),
                teleCorner2.trim(),
                teleCorner3.trim(),
                teleCorner4.trim(),
              ] as [string, string, string, string],
              correctCorner: teleCorrectCorner,
              timeLimit: teleTimeSeconds,
            };
          }
          return t;
        });
        onUpdateTelepathyList(updated);
        localStorage.setItem('class_telepathy_quizzes', JSON.stringify(updated));
        localStorage.setItem('telepathy_custom_quizzes', JSON.stringify(updated));
        onShowToast('✅ 텔레파시 문제가 성공적으로 수정되었습니다.');
      } else {
        // Create new
        const newT: TelepathyQuiz = {
          id: `tele-${Date.now()}`,
          question: teleQuestion.trim(),
          corners: [
            teleCorner1.trim(),
            teleCorner2.trim(),
            teleCorner3.trim(),
            teleCorner4.trim(),
          ],
          correctCorner: teleCorrectCorner,
          timeLimit: teleTimeSeconds,
        };
        const updated = [...telepathyList, newT];
        onUpdateTelepathyList(updated);
        localStorage.setItem('class_telepathy_quizzes', JSON.stringify(updated));
        localStorage.setItem('telepathy_custom_quizzes', JSON.stringify(updated));
        onShowToast('🎉 새로운 텔레파시 문제가 등록되었습니다.');
      }
      resetForm();
    } else {
      // OX or Choice
      if (!questionText.trim()) {
        onShowToast('⚠️ 문제 내용을 입력해주세요.');
        return;
      }

      if (selectedType === 'choice') {
        const hasEmptyOption = choiceOptions.some((opt) => !opt.trim());
        if (hasEmptyOption) {
          onShowToast('⚠️ 4개의 보기를 모두 작성해주세요.');
          return;
        }
      }

      if (editingId) {
        // Update existing
        const updated = quizList.map((q) => {
          if (q.id === editingId) {
            return {
              ...q,
              type: selectedType,
              question: questionText.trim(),
              answer: selectedType === 'ox' ? oxAnswer : choiceAnswer,
              options: selectedType === 'choice' ? choiceOptions.map((o) => o.trim()) : undefined,
              explanation: explanation.trim() || undefined,
            };
          }
          return q;
        });
        onUpdateQuizList(updated);
        localStorage.setItem('class_quiz_questions', JSON.stringify(updated));
        localStorage.setItem('quiz_custom_questions', JSON.stringify(updated));
        onShowToast(`✅ ${selectedType === 'ox' ? 'O,X' : '객관식'} 문제가 수정되었습니다.`);
      } else {
        // Create new
        const newQ: QuizQuestion = {
          id: `q-${Date.now()}`,
          type: selectedType,
          question: questionText.trim(),
          answer: selectedType === 'ox' ? oxAnswer : choiceAnswer,
          options: selectedType === 'choice' ? choiceOptions.map((o) => o.trim()) : undefined,
          explanation: explanation.trim() || undefined,
        };
        const updated = [...quizList, newQ];
        onUpdateQuizList(updated);
        localStorage.setItem('class_quiz_questions', JSON.stringify(updated));
        localStorage.setItem('quiz_custom_questions', JSON.stringify(updated));
        onShowToast(`🎉 새로운 ${selectedType === 'ox' ? 'O,X' : '객관식'} 문제가 등록되었습니다.`);
      }
      resetForm();
    }
  };

  // Delete Quiz
  const handleDeleteQuiz = (id: string) => {
    const updated = quizList.filter((q) => q.id !== id);
    onUpdateQuizList(updated);
    localStorage.setItem('class_quiz_questions', JSON.stringify(updated));
    localStorage.setItem('quiz_custom_questions', JSON.stringify(updated));
    if (editingId === id) resetForm();
    onShowToast('🗑️ 문제가 삭제되었습니다.');
  };

  // Delete Telepathy
  const handleDeleteTelepathy = (id: string) => {
    const updated = telepathyList.filter((t) => t.id !== id);
    onUpdateTelepathyList(updated);
    localStorage.setItem('class_telepathy_quizzes', JSON.stringify(updated));
    localStorage.setItem('telepathy_custom_quizzes', JSON.stringify(updated));
    if (editingId === id) resetForm();
    onShowToast('🗑️ 텔레파시 문제가 삭제되었습니다.');
  };

  // Clear All Questions (Requirement 3: 예시로 만들어진 문제 및 전체 문제 삭제)
  const handleClearAllQuestions = () => {
    if (window.confirm('등록된 모든 예시 및 퀴즈 문제를 삭제하시겠습니까?')) {
      onUpdateQuizList([]);
      onUpdateTelepathyList([]);
      localStorage.removeItem('class_quiz_questions');
      localStorage.removeItem('quiz_custom_questions');
      localStorage.removeItem('class_telepathy_quizzes');
      localStorage.removeItem('telepathy_custom_quizzes');
      resetForm();
      onShowToast('🧹 모든 퀴즈 문제가 완전히 삭제되었습니다.');
    }
  };

  // Filtered lists for the right panel (안전 방어 코드 적용)
  const safeQuizList = (Array.isArray(quizList) ? quizList : []).filter((q) => q && q.type);
  const filteredQuizzes = safeQuizList.filter((q) => {
    if (listFilter === 'all') return true;
    return q?.type === listFilter;
  });

  const showTelepathyInList = listFilter === 'all' || listFilter === 'telepathy';
  const totalCount = quizList.length + telepathyList.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-2 sm:p-4 pt-6 sm:pt-8 overflow-y-auto animate-fade-in text-white select-none">
      <div className="bg-slate-900 w-full max-w-6xl max-h-[92vh] sm:max-h-[88vh] h-auto rounded-3xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden my-auto">
        {/* ========================================================================= */}
        {/* MODAL HEADER: 상단이 가려지지 않도록 안전 패딩 및 크기 최적화 (요청사항 4)        */}
        {/* ========================================================================= */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/90 shrink-0 gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center font-black shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                <span>스마트 퀴즈 문제 생성 및 관리 센터</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-700">
                  총 {totalCount}문제 등록됨
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                왼쪽에서 문제를 생성·수정하고, 오른쪽 창에서 전체 문제를 확인 및 편집·삭제할 수 있습니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearAllQuestions}
              className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="등록된 모든 예시 문제 및 저장된 퀴즈 삭제"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>전체 문제 비우기</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SPLIT SCREEN BODY: Left (Create/Edit) | Right (List/Verify/Manage)        */}
        {/* ========================================================================= */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 overflow-hidden">
          {/* ----------------------------------------------------------------------- */}
          {/* LEFT PANEL: Problem Creation / Edit Form (5 cols)                       */}
          {/* ----------------------------------------------------------------------- */}
          <div className="lg:col-span-5 flex flex-col min-h-0 bg-slate-900/50 p-5 overflow-y-auto custom-scroll space-y-4">
            {/* Mode Indicator / Switcher */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                <Edit2 className="w-3.5 h-3.5" />
                <span>{editingId ? '✏️ 문제 수정 모드' : '✨ 새 문제 작성'}</span>
              </span>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-bold text-sky-400 hover:text-sky-300 underline cursor-pointer"
                >
                  새 문제 작성으로 전환
                </button>
              )}
            </div>

            {/* Quiz Category Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedType('ox')}
                className={`py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  selectedType === 'ox'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>⭕❌</span>
                <span>O,X 퀴즈</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('choice')}
                className={`py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  selectedType === 'choice'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>🔢</span>
                <span>객관식 (4지)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('telepathy')}
                className={`py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  selectedType === 'telepathy'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>🧭</span>
                <span>4코너 텔레파시</span>
              </button>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Question Text */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  문제 내용 <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={selectedType === 'telepathy' ? 2 : 3}
                  value={selectedType === 'telepathy' ? teleQuestion : questionText}
                  onChange={(e) => {
                    if (selectedType === 'telepathy') setTeleQuestion(e.target.value);
                    else setQuestionText(e.target.value);
                  }}
                  placeholder={
                    selectedType === 'telepathy'
                      ? '예: 선생님이 가장 좋아하는 계절은?'
                      : '학생들에게 화면으로 제시할 질문 내용을 입력하세요...'
                  }
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-amber-400 placeholder:text-slate-600"
                />
              </div>

              {/* Specific Inputs by Type */}
              {selectedType === 'ox' && (
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    정답 지정 <span className="text-rose-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setOxAnswer('O')}
                      className={`py-3 rounded-xl border text-sm font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                        oxAnswer === 'O'
                          ? 'border-emerald-400 bg-emerald-950 text-emerald-300 ring-2 ring-emerald-500/40'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-lg">⭕</span>
                      <span>O (그렇다)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOxAnswer('X')}
                      className={`py-3 rounded-xl border text-sm font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                        oxAnswer === 'X'
                          ? 'border-rose-400 bg-rose-950 text-rose-300 ring-2 ring-rose-500/40'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-lg">❌</span>
                      <span>X (아니다)</span>
                    </button>
                  </div>
                </div>
              )}

              {selectedType === 'choice' && (
                <div className="space-y-2">
                  <label className="block text-slate-300 font-bold">
                    보기 4개 입력 및 정답 라디오 선택 <span className="text-rose-400">*</span>
                  </label>
                  {choiceOptions.map((opt, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 p-2 rounded-xl border transition ${
                        choiceAnswer === i
                          ? 'bg-indigo-950/50 border-indigo-500'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <input
                        type="radio"
                        id={`choice-opt-${i}`}
                        name="choiceAnswerOption"
                        checked={choiceAnswer === i}
                        onChange={() => setChoiceAnswer(i)}
                        className="w-4 h-4 accent-indigo-500 cursor-pointer"
                      />
                      <label
                        htmlFor={`choice-opt-${i}`}
                        className="font-bold text-slate-400 w-9 shrink-0 cursor-pointer"
                      >
                        {i + 1}번
                      </label>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const updated = [...choiceOptions];
                          updated[i] = e.target.value;
                          setChoiceOptions(updated);
                        }}
                        placeholder={`${i + 1}번 보기 내용을 입력하세요`}
                        className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white outline-none focus:border-indigo-400"
                      />
                      {choiceAnswer === i && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500 text-white shrink-0">
                          정답
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {selectedType === 'telepathy' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      <span>학생 이동 제한 시간 (초)</span>
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[10, 15, 20, 30].map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setTeleTimeSeconds(sec)}
                          className={`py-1.5 rounded-xl font-black transition cursor-pointer ${
                            teleTimeSeconds === sec
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          {sec}초
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-slate-300 font-bold">
                      교실 4방향 코너 보기 입력 &amp; 정답 코너 지정 <span className="text-rose-400">*</span>
                    </label>
                    {[
                      { cornerNum: 1, label: '① 칠판 앞 왼쪽', val: teleCorner1, setVal: setTeleCorner1 },
                      { cornerNum: 2, label: '② 칠판 앞 오른쪽', val: teleCorner2, setVal: setTeleCorner2 },
                      { cornerNum: 3, label: '③ 교실 뒤 왼쪽', val: teleCorner3, setVal: setTeleCorner3 },
                      { cornerNum: 4, label: '④ 교실 뒤 오른쪽', val: teleCorner4, setVal: setTeleCorner4 },
                    ].map((c) => (
                      <div
                        key={c.cornerNum}
                        className={`flex items-center gap-2 p-2 rounded-xl border transition ${
                          teleCorrectCorner === c.cornerNum
                            ? 'bg-purple-950/50 border-purple-500'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <input
                          type="radio"
                          id={`tele-corner-${c.cornerNum}`}
                          name="teleCorrectOption"
                          checked={teleCorrectCorner === c.cornerNum}
                          onChange={() => setTeleCorrectCorner(c.cornerNum as 1 | 2 | 3 | 4)}
                          className="w-4 h-4 accent-purple-400 cursor-pointer"
                        />
                        <label
                          htmlFor={`tele-corner-${c.cornerNum}`}
                          className="font-bold text-slate-300 text-[11px] w-28 shrink-0 cursor-pointer"
                        >
                          {c.label}
                        </label>
                        <input
                          type="text"
                          value={c.val}
                          onChange={(e) => c.setVal(e.target.value)}
                          placeholder={
                            teleCorrectCorner === c.cornerNum
                              ? '★ 정답 보기 입력'
                              : '오답 보기 입력'
                          }
                          className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white outline-none focus:border-purple-400"
                        />
                        {teleCorrectCorner === c.cornerNum && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white shrink-0">
                            ★ 정답 지정
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Explanation (OX & Choice only) */}
              {selectedType !== 'telepathy' && (
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    정답 해설 / 도움말 (선택)
                  </label>
                  <input
                    type="text"
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="정답 공개 시 하단에 표시할 해설 내용..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-amber-400"
                  />
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition cursor-pointer"
                >
                  초기화
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white font-black text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingId ? '수정사항 저장' : '문제 등록하기'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* RIGHT PANEL: Registered Questions List & Manage (7 cols)               */}
          {/* ----------------------------------------------------------------------- */}
          <div className="lg:col-span-7 flex flex-col min-h-0 bg-slate-950/40 p-5 overflow-hidden">
            {/* Filter Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setListFilter('all')}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    listFilter === 'all'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  전체 ({totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setListFilter('ox')}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    listFilter === 'ox'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  O,X ({quizList.filter((q) => q?.type === 'ox').length})
                </button>
                <button
                  type="button"
                  onClick={() => setListFilter('choice')}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    listFilter === 'choice'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  객관식 ({quizList.filter((q) => q?.type === 'choice').length})
                </button>
                <button
                  type="button"
                  onClick={() => setListFilter('telepathy')}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    listFilter === 'telepathy'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  텔레파시 ({telepathyList.length})
                </button>
              </div>

              <span className="text-xs text-slate-400">
                ✏️ 수정 클릭 시 왼쪽 창에 즉시 로드됩니다
              </span>
            </div>

            {/* Scrollable Questions List */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scroll py-3 space-y-3 pr-1">
              {totalCount === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-800 rounded-2xl">
                  <HelpCircle className="w-10 h-10 text-slate-600 mb-2" />
                  <p className="font-black text-sm text-slate-300">
                    현재 등록된 퀴즈 문제가 없습니다.
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    왼쪽 패널에서 O,X 퀴즈, 객관식, 또는 4방향 텔레파시 문제를 작성하여 등록해 보세요!
                  </p>
                </div>
              ) : (
                <>
                  {/* OX & Choice Quizzes */}
                  {filteredQuizzes.map((q, idx) => (
                    <div
                      key={q.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        editingId === q.id
                          ? 'bg-slate-900 border-amber-400 ring-2 ring-amber-400/20 shadow-md'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-xs font-black px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
                              #{idx + 1}
                            </span>
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                q?.type === 'ox'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                              }`}
                            >
                              {q?.type === 'ox' ? '⭕❌ O,X 퀴즈' : '🔢 객관식 퀴즈'}
                            </span>
                            {editingId === q.id && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-slate-950">
                                ✏️ 수정 중
                              </span>
                            )}
                          </div>

                          <h4 className="text-sm font-bold text-white leading-snug break-keep">
                            {q?.question}
                          </h4>

                          {/* Options Preview for Choice */}
                          {q?.type === 'choice' && q?.options && (
                            <div className="grid grid-cols-2 gap-1.5 mt-2.5">
                              {q.options.map((opt, oIdx) => (
                                <div
                                  key={oIdx}
                                  className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                                    q.answer === oIdx
                                      ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300 font-black'
                                      : 'bg-slate-950 border-slate-800 text-slate-400'
                                  }`}
                                >
                                  <span className="font-mono font-bold text-[11px] opacity-70">
                                    {oIdx + 1}.
                                  </span>
                                  <span className="truncate">{opt}</span>
                                  {q.answer === oIdx && (
                                    <span className="text-[9px] px-1 bg-emerald-600 text-white rounded ml-auto">
                                      정답
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Answer Badge for OX */}
                          {q?.type === 'ox' && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-400">정답:</span>
                              <span
                                className={`text-xs font-black px-2.5 py-0.5 rounded-lg ${
                                  q.answer === 'O'
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                                }`}
                              >
                                {q.answer === 'O' ? '⭕ O (그렇다)' : '❌ X (아니다)'}
                              </span>
                            </div>
                          )}

                          {q.explanation && (
                            <p className="text-[11px] text-slate-400 mt-2 bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                              💡 <span className="font-bold text-slate-300">해설:</span> {q.explanation}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditQuiz(q)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 transition cursor-pointer"
                            title="이 문제 수정하기"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuiz(q.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-400 transition cursor-pointer"
                            title="이 문제 삭제하기"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Telepathy Quizzes */}
                  {showTelepathyInList &&
                    telepathyList.map((t, idx) => (
                      <div
                        key={t.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          editingId === t.id
                            ? 'bg-slate-900 border-amber-400 ring-2 ring-amber-400/20 shadow-md'
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className="text-xs font-black px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
                                #T{idx + 1}
                              </span>
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                                🧭 4코너 텔레파시
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                                ⏱️ {t.timeLimit || 15}초
                              </span>
                              {editingId === t.id && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-slate-950">
                                  ✏️ 수정 중
                                </span>
                              )}
                            </div>

                            <h4 className="text-sm font-bold text-white leading-snug break-keep">
                              {t.question}
                            </h4>

                            {/* 4 Corners Preview */}
                            <div className="grid grid-cols-2 gap-1.5 mt-2.5">
                              {t.corners.map((cornerText, cIdx) => {
                                const cornerNum = cIdx + 1;
                                const isCorrect = t.correctCorner === cornerNum;
                                const cornerLabels = ['① 칠판 앞 좌', '② 칠판 앞 우', '③ 교실 뒤 좌', '④ 교실 뒤 우'];
                                return (
                                  <div
                                    key={cIdx}
                                    className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-1 ${
                                      isCorrect
                                        ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 font-black'
                                        : 'bg-slate-950 border-slate-800 text-slate-400'
                                    }`}
                                  >
                                    <span className="text-[11px] opacity-75">{cornerLabels[cIdx]}:</span>
                                    <span className="font-bold truncate">{cornerText}</span>
                                    {isCorrect && (
                                      <span className="text-[9px] px-1 bg-emerald-600 text-white rounded font-black shrink-0">
                                        정답
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditTelepathy(t)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 transition cursor-pointer"
                              title="이 텔레파시 문제 수정하기"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTelepathy(t.id)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-400 transition cursor-pointer"
                              title="이 텔레파시 문제 삭제하기"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
