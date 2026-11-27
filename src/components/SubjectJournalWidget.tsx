import React, { useState, useEffect } from 'react';
import { BookOpen, Star, Plus, Trash2, CheckCircle2, BookmarkCheck } from 'lucide-react';
import { ClassConfig } from '../types';

interface SubjectJournalWidgetProps {
  config: ClassConfig;
  onShowToast?: (msg: string) => void;
}

interface JournalEntry {
  id: string;
  gradeClass: string;
  lessonProgress: string; // 예: "3단원 2차시 뜀틀 넘기 기본자세"
  praiseTeam: string; // 예: "2모둠, 4모둠"
  evalRecord: string; // 예: "김서윤: 뜀틀 도움닫기 우수 (상), 이도현: 발구르기 지도 필요"
  date: string;
}

const DEFAULT_JOURNAL_ENTRIES: JournalEntry[] = [
  {
    id: 'j-1',
    gradeClass: '3-1',
    lessonProgress: '3단원 2차시: 매트 구르기 기본동작',
    praiseTeam: '2모둠 (배려팀)',
    evalRecord: '강민준: 앞구르기 착지 안정적 (상), 김도윤: 회전력 우수',
    date: '오늘',
  },
  {
    id: 'j-2',
    gradeClass: '3-2',
    lessonProgress: '3단원 1차시: 유연성 기르기 및 스트레칭',
    praiseTeam: '3모둠 (에이스)',
    evalRecord: '권우진: 준비운동 솔선수범 (상)',
    date: '오늘',
  },
  {
    id: 'j-3',
    gradeClass: '4-1',
    lessonProgress: '4단원 3차시: 티볼 배팅 기본자세',
    praiseTeam: '1모둠',
    evalRecord: '박보검: 배트 그립 정확 (상), 문채영: 타격 타이밍 지도',
    date: '어제',
  },
];

export const SubjectJournalWidget: React.FC<SubjectJournalWidgetProps> = ({ onShowToast }) => {
  const classList = ['3-1', '3-2', '4-1', '4-2', '5-1'];
  const [selectedClass, setSelectedClass] = useState<string>('3-1');

  // 기록장 목록 상태 (localStorage 연동)
  const [entries, setEntries] = useState<JournalEntry[]>(() => {
    try {
      const saved = localStorage.getItem('ttime_subject_journal');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_JOURNAL_ENTRIES;
  });

  // 입력 폼 상태
  const [progressInput, setProgressInput] = useState('');
  const [teamInput, setTeamInput] = useState('');
  const [evalInput, setEvalInput] = useState('');

  const saveEntries = (newEntries: JournalEntry[]) => {
    setEntries(newEntries);
    try {
      localStorage.setItem('ttime_subject_journal', JSON.stringify(newEntries));
    } catch {}
  };

  const handleAddEntry = () => {
    if (!progressInput.trim() && !evalInput.trim()) {
      onShowToast?.('⚠️ 수업 진도나 형성평가 내용을 입력해 주세요.');
      return;
    }
    const newEntry: JournalEntry = {
      id: `j-${Date.now()}`,
      gradeClass: selectedClass,
      lessonProgress: progressInput.trim() || '진도 미기재',
      praiseTeam: teamInput.trim() || '전체 참여',
      evalRecord: evalInput.trim() || '특이사항 없음',
      date: '방금 전',
    };
    saveEntries([newEntry, ...entries]);
    setProgressInput('');
    setTeamInput('');
    setEvalInput('');
    onShowToast?.(`📝 [${selectedClass}반] 수업 기록이 안전하게 저장되었습니다.`);
  };

  const handleDeleteEntry = (id: string) => {
    saveEntries(entries.filter((e) => e.id !== id));
    onShowToast?.('🗑️ 기록이 삭제되었습니다.');
  };

  const filteredEntries = entries.filter((e) => e.gradeClass === selectedClass);

  return (
    <div className="flex flex-col h-full space-y-2.5 p-1">
      {/* 1. 상단 학급 선택 칩 */}
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
          {classList.map((cls) => (
            <button
              key={cls}
              type="button"
              onClick={() => setSelectedClass(cls)}
              className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                selectedClass === cls
                  ? 'bg-indigo-600 text-white shadow-sm scale-105'
                  : 'bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>{cls}반</span>
            </button>
          ))}
        </div>
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
          기록 {filteredEntries.length}건
        </span>
      </div>

      {/* 2. 간편 작성 폼 */}
      <div className="p-2.5 bg-slate-50/90 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="text"
            value={progressInput}
            onChange={(e) => setProgressInput(e.target.value)}
            placeholder="수업 진도 (예: 3단원 2차시 뜀틀 넘기)"
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:ring-1 focus:ring-indigo-500"
          />
          <input
            type="text"
            value={teamInput}
            onChange={(e) => setTeamInput(e.target.value)}
            placeholder="칭찬 모둠 (예: 2모둠, 4모둠)"
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={evalInput}
            onChange={(e) => setEvalInput(e.target.value)}
            placeholder="학생 관찰 및 형성평가 메모 (예: 김서윤: 착지 완벽(상), 이도현: 발구르기 보충)"
            className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:ring-1 focus:ring-indigo-500"
            onKeyDown={(e) => e.key === 'Enter' && handleAddEntry()}
          />
          <button
            type="button"
            onClick={handleAddEntry}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition cursor-pointer flex items-center gap-1 shrink-0 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>기록</span>
          </button>
        </div>
      </div>

      {/* 3. 기록 목록 리스트 */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
        {filteredEntries.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs font-bold flex flex-col items-center gap-1">
            <span>📋 등록된 기록이 없습니다.</span>
            <span className="text-[11px] font-normal">위 입력창에서 오늘의 진도와 형성평가를 기록해 보세요.</span>
          </div>
        ) : (
          filteredEntries.map((item) => (
            <div
              key={item.id}
              className="p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 shadow-xs flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-500/10 text-indigo-600 dark:text-cyan-400">
                    {item.gradeClass}반
                  </span>
                  <span className="text-xs font-black text-slate-800 dark:text-white">
                    {item.lessonProgress}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold">{item.date}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteEntry(item.id)}
                    className="text-slate-400 hover:text-rose-500 p-0.5 transition cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {item.praiseTeam && (
                <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                  <span>⭐ 칭찬 모둠:</span>
                  <span>{item.praiseTeam}</span>
                </div>
              )}

              {item.evalRecord && (
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                  {item.evalRecord}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
