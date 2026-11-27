import React, { useState } from 'react';
import { Users, Sparkles, Award, CheckCircle, RefreshCw } from 'lucide-react';
import { ClassConfig } from '../types';

interface SubjectRosterWidgetProps {
  config: ClassConfig;
  onShowToast?: (msg: string) => void;
}

// 🏫 전담 학급별 목(Mock) 학생 및 모둠 데이터
const MOCK_CLASS_DATA: Record<string, {
  students: { id: number; name: string; isChecked: boolean }[];
  teams: { id: number; name: string; score: number; members: string[] }[];
}> = {
  '3-1': {
    students: [
      { id: 1, name: '강민준', isChecked: false }, { id: 2, name: '김서윤', isChecked: false },
      { id: 3, name: '김도윤', isChecked: false }, { id: 4, name: '김하은', isChecked: false },
      { id: 5, name: '박시우', isChecked: false }, { id: 6, name: '박지안', isChecked: false },
      { id: 7, name: '이도현', isChecked: false }, { id: 8, name: '이지우', isChecked: false },
      { id: 9, name: '정유준', isChecked: false }, { id: 10, name: '정서아', isChecked: false },
      { id: 11, name: '최건우', isChecked: false }, { id: 12, name: '한예린', isChecked: false },
    ],
    teams: [
      { id: 1, name: '1모둠 (열정팀)', score: 3, members: ['강민준', '김서윤', '김도윤'] },
      { id: 2, name: '2모둠 (배려팀)', score: 5, members: ['김하은', '박시우', '박지안'] },
      { id: 3, name: '3모둠 (협력팀)', score: 4, members: ['이도현', '이지우', '정유준'] },
      { id: 4, name: '4모둠 (도전팀)', score: 2, members: ['정서아', '최건우', '한예린'] },
    ],
  },
  '3-2': {
    students: [
      { id: 1, name: '권우진', isChecked: false }, { id: 2, name: '김민서', isChecked: false },
      { id: 3, name: '김주원', isChecked: false }, { id: 4, name: '문채원', isChecked: false },
      { id: 5, name: '배서준', isChecked: false }, { id: 6, name: '송지호', isChecked: false },
      { id: 7, name: '안소율', isChecked: false }, { id: 8, name: '윤하람', isChecked: false },
      { id: 9, name: '임예준', isChecked: false }, { id: 10, name: '장다은', isChecked: false },
      { id: 11, name: '조은우', isChecked: false }, { id: 12, name: '황나윤', isChecked: false },
    ],
    teams: [
      { id: 1, name: '1모둠 (드림팀)', score: 4, members: ['권우진', '김민서', '김주원'] },
      { id: 2, name: '2모둠 (스마일)', score: 3, members: ['문채원', '배서준', '송지호'] },
      { id: 3, name: '3모둠 (에이스)', score: 6, members: ['안소율', '윤하람', '임예준'] },
      { id: 4, name: '4모둠 (빅토리)', score: 4, members: ['장다은', '조은우', '황나윤'] },
    ],
  },
  '4-1': {
    students: [
      { id: 1, name: '강동원', isChecked: false }, { id: 2, name: '고은별', isChecked: false },
      { id: 3, name: '김태리', isChecked: false }, { id: 4, name: '노유하', isChecked: false },
      { id: 5, name: '류현진', isChecked: false }, { id: 6, name: '문채영', isChecked: false },
      { id: 7, name: '박보검', isChecked: false }, { id: 8, name: '신수아', isChecked: false },
      { id: 9, name: '오세훈', isChecked: false }, { id: 10, name: '원지민', isChecked: false },
      { id: 11, name: '유재석', isChecked: false }, { id: 12, name: '정해인', isChecked: false },
    ],
    teams: [
      { id: 1, name: '1모둠', score: 2, members: ['강동원', '고은별', '김태리'] },
      { id: 2, name: '2모둠', score: 5, members: ['노유하', '류현진', '문채영'] },
      { id: 3, name: '3모둠', score: 3, members: ['박보검', '신수아', '오세훈'] },
      { id: 4, name: '4모둠', score: 4, members: ['원지민', '유재석', '정해인'] },
    ],
  },
  '4-2': {
    students: [
      { id: 1, name: '구자철', isChecked: false }, { id: 2, name: '김연아', isChecked: false },
      { id: 3, name: '남주혁', isChecked: false }, { id: 4, name: '라온하', isChecked: false },
      { id: 5, name: '민선예', isChecked: false }, { id: 6, name: '박지성', isChecked: false },
      { id: 7, name: '서강준', isChecked: false }, { id: 8, name: '안유진', isChecked: false },
      { id: 9, name: '이승기', isChecked: false }, { id: 10, name: '장원영', isChecked: false },
      { id: 11, name: '차은우', isChecked: false }, { id: 12, name: '한효주', isChecked: false },
    ],
    teams: [
      { id: 1, name: '청팀', score: 4, members: ['구자철', '김연아', '남주혁'] },
      { id: 2, name: '백팀', score: 4, members: ['라온하', '민선예', '박지성'] },
      { id: 3, name: '홍팀', score: 5, members: ['서강준', '안유진', '이승기'] },
      { id: 4, name: '청룡팀', score: 3, members: ['장원영', '차은우', '한효주'] },
    ],
  },
  '5-1': {
    students: [
      { id: 1, name: '기성용', isChecked: false }, { id: 2, name: '김고은', isChecked: false },
      { id: 3, name: '나영석', isChecked: false }, { id: 4, name: '도경수', isChecked: false },
      { id: 5, name: '류준열', isChecked: false }, { id: 6, name: '배수지', isChecked: false },
      { id: 7, name: '손흥민', isChecked: false }, { id: 8, name: '아이유', isChecked: false },
      { id: 9, name: '옥택연', isChecked: false }, { id: 10, name: '전지현', isChecked: false },
      { id: 11, name: '조인성', isChecked: false }, { id: 12, name: '한지민', isChecked: false },
    ],
    teams: [
      { id: 1, name: '우주팀', score: 6, members: ['기성용', '김고은', '나영석'] },
      { id: 2, name: '태양팀', score: 4, members: ['도경수', '류준열', '배수지'] },
      { id: 3, name: '은하팀', score: 5, members: ['손흥민', '아이유', '옥택연'] },
      { id: 4, name: '혜성팀', score: 3, members: ['전지현', '조인성', '한지민'] },
    ],
  },
};

export const SubjectRosterWidget: React.FC<SubjectRosterWidgetProps> = ({ onShowToast }) => {
  const classList = ['3-1', '3-2', '4-1', '4-2', '5-1'];
  const [selectedClass, setSelectedClass] = useState<string>('3-1');
  const [activeTab, setActiveTab] = useState<'roster' | 'teams'>('teams');
  const [classData, setClassData] = useState(MOCK_CLASS_DATA);

  const currentData = classData[selectedClass] || classData['3-1'];

  // 모둠 점수 올리기
  const handleAddTeamScore = (teamId: number) => {
    setClassData((prev) => {
      const cls = prev[selectedClass];
      if (!cls) return prev;
      const updatedTeams = cls.teams.map((t) =>
        t.id === teamId ? { ...t, score: t.score + 1 } : t
      );
      return {
        ...prev,
        [selectedClass]: { ...cls, teams: updatedTeams },
      };
    });
    onShowToast?.(`👏 [${selectedClass}반] 모둠 칭찬 점수가 +1 추가되었습니다.`);
  };

  // 학생 체크 토글
  const handleToggleStudent = (studentId: number) => {
    setClassData((prev) => {
      const cls = prev[selectedClass];
      if (!cls) return prev;
      const updatedStudents = cls.students.map((s) =>
        s.id === studentId ? { ...s, isChecked: !s.isChecked } : s
      );
      return {
        ...prev,
        [selectedClass]: { ...cls, students: updatedStudents },
      };
    });
  };

  return (
    <div className="flex flex-col h-full space-y-3 p-1">
      {/* 1. 상단 학급 퀵 전환 칩 */}
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
          {classList.map((cls) => (
            <button
              key={cls}
              type="button"
              onClick={() => {
                setSelectedClass(cls);
                onShowToast?.(`📋 [${cls}반] 명렬표 및 모둠이 로딩되었습니다.`);
              }}
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

        {/* 모둠 vs 명렬 탭 */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-black">
          <button
            type="button"
            onClick={() => setActiveTab('teams')}
            className={`px-2 py-1 rounded-md transition cursor-pointer ${
              activeTab === 'teams' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-cyan-400 shadow-2xs' : 'text-slate-500'
            }`}
          >
            모둠배치
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`px-2 py-1 rounded-md transition cursor-pointer ${
              activeTab === 'roster' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-cyan-400 shadow-2xs' : 'text-slate-500'
            }`}
          >
            전체명렬
          </button>
        </div>
      </div>

      {/* 2. 본문: 모둠 보기 or 전체 명렬 보기 */}
      <div className="flex-1 overflow-y-auto pr-0.5">
        {activeTab === 'teams' ? (
          <div className="grid grid-cols-2 gap-2.5">
            {currentData.teams.map((team) => (
              <div
                key={team.id}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 shadow-xs flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black text-slate-800 dark:text-white">
                    {team.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddTeamScore(team.id)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-[11px] border border-amber-500/30 hover:bg-amber-500/20 active:scale-95 cursor-pointer"
                    title="칭찬 점수 +1"
                  >
                    <span>⭐</span>
                    <span>{team.score}점</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1 mt-1">
                  {team.members.map((m, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
            {currentData.students.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => handleToggleStudent(st.id)}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  st.isChecked
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300'
                    : 'bg-white/80 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs font-bold">
                  {st.id}. {st.name}
                </span>
                {st.isChecked && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
