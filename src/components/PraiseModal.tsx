import React, { useState } from 'react';
import {
  X,
  Printer,
  Award,
  Users,
  Star,
  BarChart3,
  ArrowUpDown,
  Download,
  Copy,
  FileSpreadsheet,
} from 'lucide-react';
import { Team, ClassConfig, Student, PraiseHistoryLog, PraiseItemConfig } from '../types';
import confetti from 'canvas-confetti';
import { playCelebrateSound } from '../utils/audio';
import { PraiseCertificate, type CertificateTarget } from './PraiseCertificate';

interface PraiseModalProps {
  teams: Team[];
  students: Student[];
  praiseConfigs?: PraiseItemConfig[];
  praiseLogs?: PraiseHistoryLog[];
  config: ClassConfig;
  isOpen: boolean;
  onClose: () => void;
  onAwardPraise?: (studentId: number, item: PraiseItemConfig) => void;
  onAddPoint: (teamId: number, delta?: number) => void;
  onAddStudentPoint?: (studentId: number, delta?: number) => void;
  onResetAllPoints?: () => void;
  onShowToast: (msg: string) => void;
}

/**
 * [PraiseModal 컴포넌트]
 * 요구사항 10 & 첨부 이미지 2:
 * 1. 모둠 칭찬 랭킹과 학생 개인 칭찬 랭킹을 탭으로 명확히 구분
 * 2. 학생별 / 월별 통계 테이블 작성 및 오름차순/내림차순 정렬
 * 3. 구글 스프레드시트용 TSV 복사 및 CSV 다운로드 연동
 */
export const PraiseModal: React.FC<PraiseModalProps> = ({
  teams,
  students,
  praiseLogs = [],
  config,
  isOpen,
  onClose,
  onAddPoint,
  onAddStudentPoint,
  onShowToast,
}) => {
  // 탭 상태: 'team'(모둠 랭킹) | 'student'(개인 랭킹) | 'stats'(월별/학생별 통계)
  const [activeTab, setActiveTab] = useState<'team' | 'student' | 'stats'>('team');
  const [sortAscending, setSortAscending] = useState<boolean>(false);
  const [certTarget, setCertTarget] = useState<CertificateTarget | null>(null);

  if (!isOpen) return null;

  // 1. 모둠 정렬
  const sortedTeams = [...teams].sort((a, b) =>
    sortAscending ? a.points - b.points : b.points - a.points
  );

  // 2. 학생 개인 정렬
  const sortedStudents = [...students].sort((a, b) =>
    sortAscending ? a.praisePoints - b.praisePoints : b.praisePoints - a.praisePoints
  );
  const top1Student = sortedStudents[0];
  const top2Student = sortedStudents[1];
  const top3Student = sortedStudents[2];

  const handleAddStamp = (team: Team) => {
    onAddPoint(team.id);
    playCelebrateSound();
    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.5 } });
    } catch {}
    onShowToast(`💮 [${team.name}] 도장판에 도장이 추가되었습니다! (현재: ${team.points + 1}개)`);
  };

  const handleMinusStamp = (team: Team) => {
    if ((team.points || 0) <= 0) {
      onShowToast(`[${team.name}] 은(는) 이미 0개예요.`);
      return;
    }
    onAddPoint(team.id, -1);
    onShowToast(`➖ [${team.name}] 도장 1개를 뺐어요. (현재: ${team.points - 1}개)`);
  };

  const openCertificate = (team: Team) => {
    setCertTarget({
      kind: 'team',
      name: team.name,
      points: team.points,
      reward: team.reward,
      members: students
        .filter((s) => s.teamId === team.id)
        .sort((a, b) => a.number - b.number)
        .map((s) => s.name),
    });
  };
  const openStudentCertificate = (s: Student) => setCertTarget({ kind: 'student', name: s.name, points: s.praisePoints || 0 });

  const printCert = () => {
    const top = [...teams].sort((a, b) => b.points - a.points)[0];
    if (top) openCertificate(top);
  };
  const classLabel = config?.grade && config?.classNum ? `${config.grade}학년 ${config.classNum}반` : '';

  // 구글 스프레드시트 복사 (TSV 클립보드)
  const handleCopyGoogleSheets = () => {
    const header = '순위\t학생번호\t이름\t소속모둠\t칭찬도장수\t최근칭찬사유';
    const rows = sortedStudents.map((s, idx) => {
      const recentLog = praiseLogs.filter((l) => l.studentId === s.id).slice(-1)[0];
      const recentReason = recentLog ? recentLog.itemLabel : '기본 성실 칭찬';
      return `${idx + 1}\t${s.number}\t${s.name}\t${s.teamId}모둠\t${s.praisePoints}\t${recentReason}`;
    });
    const tsv = [header, ...rows].join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
      onShowToast('📋 구글 스프레드시트 붙여넣기용 데이터가 클립보드에 복사되었습니다! (Ctrl+V)');
    });
  };

  // CSV 다운로드
  const handleDownloadCSV = () => {
    const header = '순위,학생번호,이름,소속모둠,칭찬도장수,최근칭찬사유';
    const rows = sortedStudents.map((s, idx) => {
      const recentLog = praiseLogs.filter((l) => l.studentId === s.id).slice(-1)[0];
      const recentReason = recentLog ? `"${recentLog.itemLabel}"` : '"기본 성실 칭찬"';
      return `${idx + 1},${s.number},${s.name},${s.teamId}모둠,${s.praisePoints},${recentReason}`;
    });
    const csvContent = '\uFEFF' + [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `학급_개인칭찬도장_랭킹통계_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('📥 칭찬 랭킹 통계 CSV 파일이 다운로드되었습니다.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 md:p-6 bg-slate-950/60 backdrop-blur-md transition-opacity animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* 모달 상단 헤더 */}
        <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-indigo-500/15 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-xl shadow-md shadow-amber-200 shrink-0">
              🏆
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                  칭찬 도장 랭킹보드 & 명예의 전당
                </h3>
                <span className="text-[10px] font-extrabold bg-amber-500 text-white px-2 py-0.5 rounded-full uppercase">
                  실시간 순위
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                협력과 배려, 발표를 실천한 멋진 모둠과 학생들에게 도장을 선물하세요!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition active:scale-95 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 탭 네비게이션: 모둠 랭킹 / 개인 랭킹 / 통계 */}
        <div className="flex items-center justify-between px-6 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('team')}
              className={`px-4 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'team'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>모둠 칭찬 랭킹 ({teams.length}개)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('student')}
              className={`px-4 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'student'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              <span>학생 개인 랭킹 ({students.length}명)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('stats')}
              className={`px-4 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'stats'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>학생별·월별 통계</span>
            </button>
          </div>

          {/* 정렬 토글 버튼 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSortAscending((prev) => !prev)}
              className="px-3 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{sortAscending ? '오름차순 정렬 중' : '내림차순 정렬 중'}</span>
            </button>
          </div>
        </div>

        {/* 탭 1: 모둠 칭찬 도장 랭킹보드 (첨부 이미지 2) */}
        {activeTab === 'team' && (
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
            {/* 포디움 Top 4 */}
            <div className="grid grid-cols-4 gap-2.5 items-end pt-2 pb-2 text-center">
              {sortedTeams[1] && (
                <div className="flex flex-col items-center">
                  <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300 mb-1">🥈 2위</span>
                  <div className="w-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl p-2.5">
                    <span className="text-xs font-bold text-blue-900 dark:text-blue-200 block truncate">
                      {sortedTeams[1].name}
                    </span>
                    <span className="text-sm font-black text-blue-700 dark:text-blue-400">
                      {sortedTeams[1].points}개
                    </span>
                  </div>
                </div>
              )}

              {sortedTeams[0] && (
                <div className="flex flex-col items-center -mt-2">
                  <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 mb-1">👑 1위 (챔피언)</span>
                  <div className="w-full bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-400 dark:border-amber-500 rounded-2xl p-3 shadow-xs">
                    <span className="text-sm font-black text-amber-950 dark:text-amber-200 block truncate">
                      {sortedTeams[0].name}
                    </span>
                    <span className="text-base font-black text-rose-600 dark:text-rose-400">
                      {sortedTeams[0].points}개 ⭐
                    </span>
                  </div>
                </div>
              )}

              {sortedTeams[2] && (
                <div className="flex flex-col items-center">
                  <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300 mb-1">🥉 3위</span>
                  <div className="w-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-2.5">
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block truncate">
                      {sortedTeams[2].name}
                    </span>
                    <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                      {sortedTeams[2].points}개
                    </span>
                  </div>
                </div>
              )}

              {sortedTeams[3] && (
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold text-slate-400 mb-1">4위</span>
                  <div className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block truncate">
                      {sortedTeams[3].name}
                    </span>
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                      {sortedTeams[3].points}개
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 모둠 카드 리스트 */}
            <div className="space-y-3">
              {sortedTeams.map((team) => {
                const goal = team.goalPoints || 20;
                const remaining = Math.max(0, goal - team.points);

                return (
                  <div
                    key={team.id}
                    className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-white dark:bg-slate-800/80 shadow-xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {team.name}
                        </span>
                        <span className="text-xs font-black text-slate-500">
                          · {team.points} / {goal} 도장 달성
                        </span>
                      </div>
                      <span className="text-xs font-black text-rose-500">
                        {remaining === 0 ? '🎉 목표 달성 완료!' : `목표까지 ${remaining}개 남음! 🔥`}
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (team.points / goal) * 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <span>🎁 보상:</span>
                        <span className="font-bold">{team.reward || '금요일 자유 놀이시간 15분'}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openCertificate(team)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
                        >
                          상장 미리보기
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMinusStamp(team)}
                          disabled={(team.points || 0) <= 0}
                          className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-black transition cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                          title="도장 1개 빼기"
                          data-praise-team-minus
                        >
                          −1 빼기
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddStamp(team)}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition cursor-pointer shadow-xs active:scale-95"
                        >
                          +1 도장 찍기
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 탭 2: 학생 개인 칭찬 랭킹 */}
        {activeTab === 'student' && (
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
            {/* 개인 포디움 */}
            <div className="grid grid-cols-3 gap-3 items-end pt-2 pb-2 text-center max-w-md mx-auto">
              {top2Student && (
                <div className="flex flex-col items-center">
                  <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300 mb-1">🥈 개인 2위</span>
                  <div className="w-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl p-2.5">
                    <span className="text-xs font-bold text-blue-900 dark:text-blue-200 block truncate">
                      {top2Student.number}번 {top2Student.name}
                    </span>
                    <span className="text-sm font-black text-blue-700 dark:text-blue-400">
                      {top2Student.praisePoints}개
                    </span>
                  </div>
                </div>
              )}

              {top1Student && (
                <div className="flex flex-col items-center -mt-2">
                  <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 mb-1">👑 개인 1위 (챔피언)</span>
                  <div className="w-full bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-400 dark:border-amber-500 rounded-2xl p-3 shadow-xs">
                    <span className="text-sm font-black text-amber-950 dark:text-amber-200 block truncate">
                      {top1Student.number}번 {top1Student.name}
                    </span>
                    <span className="text-base font-black text-rose-600 dark:text-rose-400">
                      {top1Student.praisePoints}개 ⭐
                    </span>
                  </div>
                </div>
              )}

              {top3Student && (
                <div className="flex flex-col items-center">
                  <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300 mb-1">🥉 개인 3위</span>
                  <div className="w-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-2.5">
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block truncate">
                      {top3Student.number}번 {top3Student.name}
                    </span>
                    <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                      {top3Student.praisePoints}개
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 전체 학생 개인 랭킹 리스트 그리드 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {sortedStudents.map((s, idx) => (
                <div
                  key={s.id}
                  className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 flex items-center justify-between gap-2 shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                        idx === 0
                          ? 'bg-amber-400 text-slate-950'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-900'
                          : idx === 2
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                        {s.number}번 {s.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {s.teamId}모둠 · 발표 {s.selectedCount}회
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                      {s.praisePoints}개
                    </span>
                    <button
                      type="button"
                      onClick={() => openStudentCertificate(s)}
                      className="px-1.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-[10px] font-black cursor-pointer"
                      title="개인 상장 미리 보기"
                    >
                      🏅
                    </button>
                    {onAddStudentPoint && (
                      <button
                        type="button"
                        disabled={(s.praisePoints || 0) <= 0}
                        onClick={() => {
                          onAddStudentPoint(s.id, -1);
                          onShowToast(`➖ ${s.name} 학생 칭찬 도장 -1`);
                        }}
                        className="px-2 py-1 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-[10px] font-black cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                        title="도장 1개 빼기"
                      >
                        −1
                      </button>
                    )}
                    {onAddStudentPoint && (
                      <button
                        type="button"
                        onClick={() => {
                          onAddStudentPoint(s.id);
                          playCelebrateSound();
                          onShowToast(`🌟 ${s.name} 학생에게 칭찬 도장 +1`);
                        }}
                        className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black cursor-pointer shadow-2xs active:scale-95"
                      >
                        +1
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 탭 3: 학생별 / 월별 통계 및 구글 시트 연동 */}
        {activeTab === 'stats' && (
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900">
              <div>
                <h4 className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                  <span>구글 스프레드시트 백업 및 월별 통계</span>
                </h4>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">
                  칭찬 날짜, 학생 이름, 세부 칭찬 사유 및 점수를 구글 시트에 원클릭으로 정리할 수 있습니다.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyGoogleSheets}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>시트용 복사 (Ctrl+V)</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCSV}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV 다운로드</span>
                </button>
              </div>
            </div>

            {/* 학생별 누적 칭찬 통계 표 */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black">
                  <tr>
                    <th className="py-2.5 px-3">순위</th>
                    <th className="py-2.5 px-3">번호</th>
                    <th className="py-2.5 px-3">학생 이름</th>
                    <th className="py-2.5 px-3">모둠</th>
                    <th className="py-2.5 px-3 text-right">도장 총점</th>
                    <th className="py-2.5 px-3">최근 칭찬 일시</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                  {sortedStudents.map((s, idx) => {
                    const logs = praiseLogs.filter((l) => l.studentId === s.id);
                    const lastLog = logs[logs.length - 1];

                    return (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-2 px-3 font-mono font-bold text-slate-500">{idx + 1}위</td>
                        <td className="py-2 px-3">{s.number}번</td>
                        <td className="py-2 px-3 font-extrabold text-slate-900 dark:text-white">{s.name}</td>
                        <td className="py-2 px-3 text-slate-500">{s.teamId}모둠</td>
                        <td className="py-2 px-3 text-right font-black text-indigo-600 dark:text-indigo-400">
                          {s.praisePoints}개
                        </td>
                        <td className="py-2 px-3 text-slate-400 text-[11px]">
                          {lastLog ? `${lastLog.date} (${lastLog.itemLabel})` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {certTarget && (
          <PraiseCertificate target={certTarget} classLabel={classLabel} teacherName={config?.teacherName || ''} onClose={() => setCertTarget(null)} />
        )}

        {/* 모달 하단 닫기 */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
          <button
            type="button"
            onClick={printCert}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>1위 모둠 칭찬 상장 미리 보기 · 인쇄</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
