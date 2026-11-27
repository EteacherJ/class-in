import React, { useState, useEffect, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  ArrowUpDown,
  Shuffle,
  Trophy,
  CheckCircle,
  Award,
  Settings2,
  Plus,
  Minus,
  Check,
  Star,
  Sparkles,
  Printer,
  GripVertical,
  Columns,
  Monitor,
  X,
} from 'lucide-react';
import { Student, Team, SeatingLayoutType, PraiseItemConfig } from '../types';
import confetti from 'canvas-confetti';
import { playCelebrateSound } from '../utils/audio';
import { printElementById } from '../utils/printHelper';
import { SeatingPrintModal } from './SeatingPrintModal';
import { TeamDeskArea } from './TeamDeskArea';
// 🎰 두근두근 자리 뽑기 — 교사용 설정(1~5단계 · 지난 기록)은 위젯에서, 학생 화면(보조창)에는 뽑기만
const SeatDrawSetup = lazy(() => import('./seatdraw/SeatDrawApp'));
import {
  alignAllTeams,
  buildColumns,
  moveStudentToColumn,
  moveStudentToTeam,
  resetColumnSizes,
  resetDeskLayout,
  useSeatingLayoutVersion,
  writeSeatingSetting,
  useSeatingSettingSync,
  useSeatingPerspective,
} from '../utils/seatingLayout';

interface SeatingWidgetProps {
  students: Student[];
  teams: Team[];
  praiseConfigs?: PraiseItemConfig[];
  onAwardPraise?: (studentId: number, item: PraiseItemConfig) => void;
  onUpdateTeams?: (newTeams: Team[]) => void;
  onUpdateStudents?: (newStudents: Student[]) => void;
  onSwapStudents: (student1Id: number, student2Id: number) => void;
  onShuffleStudents: () => void;
  onAddTeamPoint: (teamId: number, delta?: number) => void;
  onAddStudentPoint: (studentId: number, delta?: number) => void;
  onOpenRankingModal: () => void;
  onShowToast: (msg: string) => void;
  onOpenDualMonitor?: () => void; // 🖥️ 보조 모니터 및 전자칠판 대화면 송출
}

const defaultTeamPalette = [
  { name: '햇살', badge: 'bg-amber-100 text-amber-800', border: 'border-amber-200', text: 'text-amber-800', dot: 'bg-amber-500' },
  { name: '우주', badge: 'bg-blue-100 text-blue-800', border: 'border-blue-200', text: 'text-blue-800', dot: 'bg-blue-500' },
  { name: '새싹', badge: 'bg-emerald-100 text-emerald-800', border: 'border-emerald-200', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  { name: '무지개', badge: 'bg-purple-100 text-purple-800', border: 'border-purple-200', text: 'text-purple-800', dot: 'bg-purple-500' },
  { name: '바다', badge: 'bg-cyan-100 text-cyan-800', border: 'border-cyan-200', text: 'text-cyan-800', dot: 'bg-cyan-500' },
  { name: '별빛', badge: 'bg-pink-100 text-pink-800', border: 'border-pink-200', text: 'text-pink-800', dot: 'bg-pink-500' },
  { name: '숲속', badge: 'bg-teal-100 text-teal-800', border: 'border-teal-200', text: 'text-teal-800', dot: 'bg-teal-500' },
  { name: '단풍', badge: 'bg-orange-100 text-orange-800', border: 'border-orange-200', text: 'text-orange-800', dot: 'bg-orange-500' },
];

export const SeatingWidget: React.FC<SeatingWidgetProps> = ({
  students,
  teams,
  praiseConfigs,
  onAwardPraise,
  onUpdateTeams,
  onUpdateStudents,
  onSwapStudents,
  onShuffleStudents,
  onAddTeamPoint,
  onAddStudentPoint,
  onOpenRankingModal,
  onShowToast,
  onOpenDualMonitor,
}) => {
  const [seatDrawStep, setSeatDrawStep] = useState<null | 'roster' | 'history'>(null);
  const [layout, setLayout] = useState<SeatingLayoutType>('grid');
  // 🪑 좌석 배치 모드: 'individual'(개인좌석 1열 형태) vs 'team'(모둠좌석)
  const [seatingViewType, setSeatingViewType] = useState<'individual' | 'team'>(() => {
    try {
      const saved = localStorage.getItem('class_seating_view_type');
      return saved === 'team' ? 'team' : 'individual';
    } catch {
      return 'individual';
    }
  });

  // 🪑 개인좌석 열(분단) 수 (기본 3열, 2~6열 조절 가능 - 한 열당 4~5명 배치)
  const [individualColumns, setIndividualColumns] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('class_seating_individual_columns');
      const parsed = saved ? parseInt(saved, 10) : 3;
      return parsed >= 2 && parsed <= 6 ? parsed : 3;
    } catch {
      return 3;
    }
  });

  // 교사 시점(칠판 아래) / 학생 시점(칠판 위) — 보조 모니터와 함께 바뀜
  const [perspective, setPerspective] = useSeatingPerspective();
  const isStudentView = perspective === 'student';
  const [selectedStudentForSwap, setSelectedStudentForSwap] = useState<number | null>(null);
  const [studentDetailModal, setStudentDetailModal] = useState<Student | null>(null);
  const [isTeamConfigOpen, setIsTeamConfigOpen] = useState<boolean>(false);
  // 🔲 모둠 배열 2열 / 3열 선택 상태 (기본값: 3열로 설정하여 위젯상에서 1조, 2조, 3조가 가로 한 줄에 나란히 표시)
  const [teamColumns, setTeamColumns] = useState<2 | 3>(() => {
    try {
      const saved = localStorage.getItem('class_seating_team_columns');
      return saved === '2' ? 2 : 3;
    } catch {
      return 3;
    }
  });

  // 🔄 보조 화면에서 좌석 보기 설정을 바꾸면 위젯도 함께
  useSeatingSettingSync((key, value) => {
    if (key === 'class_seating_view_type') setSeatingViewType(value === 'team' ? 'team' : 'individual');
    if (key === 'class_seating_individual_columns') { const n = parseInt(value || '3', 10); if (n >= 2 && n <= 6) setIndividualColumns(n); }
    if (key === 'class_seating_team_columns') setTeamColumns(value === '2' ? 2 : 3);
  });

  // 🖐️ 모둠 카드 드래그 앤 드롭 상태
  const [draggedTeamIndex, setDraggedTeamIndex] = useState<number | null>(null);
  const [dragOverTeamIndex, setDragOverTeamIndex] = useState<number | null>(null);

  // 🖐️ 학생 캔디바 카드 드래그 앤 드롭 상태
  const [draggedStudentId, setDraggedStudentId] = useState<number | null>(null);
  const [dragOverStudentId, setDragOverStudentId] = useState<number | null>(null);

  // 🪑 책상 배치 편집 (모둠 책상 자유 이동 → 정렬)
  const [deskEditing, setDeskEditing] = useState(false);
  const [dragOverColIdx, setDragOverColIdx] = useState<number | null>(null);
  const [dragOverTeamId, setDragOverTeamId] = useState<number | null>(null);
  useSeatingLayoutVersion(); // 분단 구성 변경 시 다시 그리기

  // 학생을 분단(열) 빈 곳에 놓으면 그 분단으로 이동
  const handleDropStudentOnColumn = (baseColIdx: number) => {
    const id = draggedStudentId;
    setDraggedStudentId(null);
    setDragOverStudentId(null);
    setDragOverColIdx(null);
    if (!id || !onUpdateStudents) return;
    const next = moveStudentToColumn(students, id, baseColIdx, individualColumns);
    if (!next) return;
    const st = students.find((s) => s.id === id);
    onUpdateStudents(next);
    onShowToast(`🪑 [${st?.name || ''}] 학생이 ${baseColIdx + 1}분단으로 이동했습니다.`);
  };

  // 학생을 모둠 카드 빈 곳에 놓으면 그 모둠으로 이동
  const handleDropStudentOnTeamArea = (teamId: number) => {
    const id = draggedStudentId;
    setDraggedStudentId(null);
    setDragOverStudentId(null);
    setDragOverTeamId(null);
    if (!id || !onUpdateStudents) return;
    const next = moveStudentToTeam(students, id, teamId);
    if (!next) return;
    const st = students.find((s) => s.id === id);
    const team = teams.find((t) => t.id === teamId);
    onUpdateStudents(next);
    onShowToast(`👥 [${st?.name || ''}] 학생이 ${team?.name || `${teamId}모둠`}으로 이동했습니다.`);
  };

  const handleAlignDesks = () => {
    alignAllTeams(activeTeamsForAlign().map((t) => ({ teamId: t.id, studentIds: students.filter((s) => s.teamId === t.id).map((s) => s.id) })));
    onShowToast('📐 책상을 일정한 간격으로 정렬했습니다.');
  };
  const activeTeamsForAlign = () => (teams.length > 0 ? teams : [{ id: 1 } as Team]);

  const handleDropStudentOnStudent = (targetStudentId: number) => {
    if (!draggedStudentId || draggedStudentId === targetStudentId) {
      setDraggedStudentId(null);
      setDragOverStudentId(null);
      return;
    }
    const student1 = students.find((s) => s.id === draggedStudentId);
    const student2 = students.find((s) => s.id === targetStudentId);
    onSwapStudents(draggedStudentId, targetStudentId);
    onShowToast(`✨ [${student1?.name || ''}] ↔ [${student2?.name || ''}] 자리가 교체되었습니다!`);
    setDraggedStudentId(null);
    setDragOverStudentId(null);
  };

  // 🖨️ 교실 게시용 자리 배치도 전용 인쇄 모달 상태
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  const handleSetSeatingViewType = (mode: 'individual' | 'team') => {
    setSeatingViewType(mode);
    try {
      writeSeatingSetting('class_seating_view_type', mode);
    } catch {}
    onShowToast(mode === 'individual' ? '🪑 1열 개인좌석 배치 모드로 전환되었습니다.' : '👥 모둠좌석 배치 모드로 전환되었습니다.');
  };

  const handleSetIndividualColumns = (cols: number) => {
    const clamped = Math.max(2, Math.min(6, cols));
    setIndividualColumns(clamped);
    resetColumnSizes();
    try {
      writeSeatingSetting('class_seating_individual_columns', String(clamped));
    } catch {}
    onShowToast(`📐 개인좌석 배열이 ${clamped}열로 변경되었습니다.`);
  };

  const handleSetTeamColumns = (cols: 2 | 3) => {
    setTeamColumns(cols);
    try {
      writeSeatingSetting('class_seating_team_columns', String(cols));
    } catch {}
    onShowToast(`📐 모둠 배치 배열이 ${cols}열로 변경되었습니다.`);
  };

  const changePerspective = (p: 'teacher' | 'student') => {
    if (p === perspective) return;
    setPerspective(p);
    onShowToast(p === 'student' ? '🧒 학생 시점: 칠판이 위에 보여요' : '🧑‍🏫 교사 시점: 교탁에서 바라본 모습 (칠판이 아래)');
  };

  // 🖨️ 교실 칠판 부착용 A4 가로(Landscape) 배치도 전용 인쇄 모달 열기
  const handlePrintSeatingChart = () => {
    setIsPrintModalOpen(true);
    onShowToast('🖨️ 교실 게시용 자리 배치도 인쇄 미리보기 화면을 엽니다.');
  };

  const handleStudentClick = (student: Student) => {
    if (selectedStudentForSwap === null) {
      setSelectedStudentForSwap(student.id);
      onShowToast(`📍 ${student.number}번 ${student.name} 선택됨 (바꿀 다른 학생을 클릭하세요)`);
    } else if (selectedStudentForSwap === student.id) {
      // 동일 학생 재클릭 -> 상세 정보 모달 열기
      setSelectedStudentForSwap(null);
      setStudentDetailModal(student);
    } else {
      // 2명의 학생 자리 맞바꾸기
      const student1 = students.find((s) => s.id === selectedStudentForSwap);
      onSwapStudents(selectedStudentForSwap, student.id);
      onShowToast(`✨ [${student1?.name}] ↔ [${student.name}] 자리가 교체되었습니다!`);
      setSelectedStudentForSwap(null);
    }
  };

  const handleTeamMinus = (team: Team) => {
    if ((team.points || 0) <= 0) {
      onShowToast(`[${team.name}] 은(는) 이미 0점이에요.`);
      return;
    }
    onAddTeamPoint(team.id, -1);
    onShowToast(`➖ [${team.name}] 도장 -1 (현재: ${team.points - 1}점)`);
  };

  const handleTeamScore = (team: Team) => {
    onAddTeamPoint(team.id);
    playCelebrateSound();
    try {
      confetti({
        particleCount: 35,
        spread: 45,
        origin: { y: 0.6 },
      });
    } catch {}
    onShowToast(`🎉 [${team.name}] 에 협력 칭찬 도장 +1점이 부여되었습니다! (현재: ${team.points + 1}점)`);
  };

  // 모둠별 학생 필터링
  const getStudentsByTeam = (teamId: number) => {
    return students.filter((s) => s.teamId === teamId);
  };

  // 👥 [모둠 수 및 모둠별 인원 직접 설정 상태]
  const [customTeamCount, setCustomTeamCount] = useState<number>(() => {
    return teams.length > 0 ? teams.length : 6;
  });

  // 각 모둠별 배정 인원수 배열 (길이 = customTeamCount)
  const [customTeamSizes, setCustomTeamSizes] = useState<number[]>(() => {
    const count = teams.length > 0 ? teams.length : 6;
    const total = students.length;
    // 기존 모둠별 실제 배정 인원 계산
    const currentCounts = Array.from({ length: count }, (_, i) => {
      const teamId = i + 1;
      return students.filter((s) => s.teamId === teamId).length;
    });
    const currentSum = currentCounts.reduce((a, b) => a + b, 0);
    if (currentSum === total && total > 0) {
      return currentCounts;
    }
    // 기본값: 균등 분배
    const base = Math.floor(total / count);
    const rem = total % count;
    return Array.from({ length: count }, (_, i) => base + (i < rem ? 1 : 0));
  });

  // 모둠 수 변경 핸들러
  const handleCustomTeamCountChange = (newCount: number) => {
    const clamped = Math.max(2, Math.min(10, newCount));
    setCustomTeamCount(clamped);
    const total = students.length;
    // 새 모둠 수에 맞게 균등 분배로 재계산
    const base = Math.floor(total / clamped);
    const rem = total % clamped;
    const newSizes = Array.from({ length: clamped }, (_, i) => base + (i < rem ? 1 : 0));
    setCustomTeamSizes(newSizes);
  };

  // 특정 모둠의 인원수 변경 (입력 또는 +/-)
  const handleTeamMemberSizeChange = (teamIndex: number, newSize: number) => {
    const next = [...customTeamSizes];
    next[teamIndex] = Math.max(0, Math.min(15, newSize));
    setCustomTeamSizes(next);
  };

  // 인원 균등 분배 원클릭 리셋 핸들러
  const handleResetEqualDistribution = () => {
    const total = students.length;
    const count = customTeamCount;
    const base = Math.floor(total / count);
    const rem = total % count;
    const newSizes = Array.from({ length: count }, (_, i) => base + (i < rem ? 1 : 0));
    setCustomTeamSizes(newSizes);
    onShowToast(`⚖️ 총 ${total}명을 ${count}개 모둠에 균등하게 자동 분배했습니다.`);
  };

  // 🎯 사용자가 직접 지정한 인원수대로 학생들을 각 모둠에 실제 배정 적용
  const handleApplyCustomTeamSizes = () => {
    if (!onUpdateTeams || !onUpdateStudents || students.length === 0) {
      onShowToast('⚠️ 학생 명단이 없거나 설정을 변경할 수 없습니다.');
      return;
    }

    const assignedTotal = customTeamSizes.reduce((a, b) => a + b, 0);
    if (assignedTotal === 0) {
      onShowToast('⚠️ 최소 1명 이상의 인원을 배정해 주세요.');
      return;
    }

    // 1. 새 모둠 배열 구성
    const newTeams: Team[] = Array.from({ length: customTeamCount }, (_, i) => {
      const existing = teams[i];
      const palette = defaultTeamPalette[i % defaultTeamPalette.length];
      return {
        id: i + 1,
        name: existing ? existing.name : `${i + 1}모둠 (${palette.name})`,
        colorName: palette.name,
        badgeBg: palette.badge,
        borderColor: palette.border,
        textColor: palette.text,
        dotColor: palette.dot,
        points: existing ? existing.points : 0,
        goalPoints: existing ? existing.goalPoints : 10,
        reward: existing ? existing.reward : '간식 타임',
      };
    });

    // 2. 학생들을 각 모둠의 지정된 인원수만큼 순차 배정
    let studentIndex = 0;
    const updatedStudents = [...students];

    for (let teamIdx = 0; teamIdx < customTeamCount; teamIdx++) {
      const targetSize = customTeamSizes[teamIdx] || 0;
      const teamId = teamIdx + 1;

      for (let s = 0; s < targetSize && studentIndex < updatedStudents.length; s++) {
        updatedStudents[studentIndex] = {
          ...updatedStudents[studentIndex],
          teamId,
        };
        studentIndex++;
      }
    }

    // 지정된 총합보다 학생 수가 더 많을 경우 남은 학생은 마지막 모둠에 배정
    while (studentIndex < updatedStudents.length) {
      updatedStudents[studentIndex] = {
        ...updatedStudents[studentIndex],
        teamId: customTeamCount,
      };
      studentIndex++;
    }

    onUpdateTeams(newTeams);
    onUpdateStudents(updatedStudents);
    playCelebrateSound();
    try {
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.6 },
      });
    } catch {}
    onShowToast(`🎉 총 ${customTeamCount}개 모둠의 직접 지정 인원 배정이 성공적으로 완료되었습니다!`);
  };

  // 🖐️ [요구사항 3] 모둠 카드 드래그 앤 드롭 이동 핸들러
  const handleTeamDragStart = (e: React.DragEvent, index: number) => {
    setDraggedTeamIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleTeamDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTeamIndex !== index) {
      setDragOverTeamIndex(index);
    }
  };

  const handleTeamDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedTeamIndex === null || draggedTeamIndex === dropIndex) {
      setDraggedTeamIndex(null);
      setDragOverTeamIndex(null);
      return;
    }

    if (!onUpdateTeams) {
      setDraggedTeamIndex(null);
      setDragOverTeamIndex(null);
      return;
    }

    const currentTeams = [...activeTeams];
    const draggedTeam = currentTeams[draggedTeamIndex];
    const targetTeam = currentTeams[dropIndex];

    // 두 모둠의 위치 스왑
    currentTeams[draggedTeamIndex] = targetTeam;
    currentTeams[dropIndex] = draggedTeam;

    onUpdateTeams(currentTeams);
    onShowToast(`🔀 [${draggedTeam.name}] ↔ [${targetTeam.name}] 모둠 위치가 서로 변경되었습니다.`);

    setDraggedTeamIndex(null);
    setDragOverTeamIndex(null);
  };

  // 활성 모둠 리스트
  const activeTeams = teams.length > 0 ? teams : [
    { id: 1, name: '1모둠', colorName: '햇살', badgeBg: 'bg-amber-100 text-amber-800', borderColor: 'border-amber-200', textColor: 'text-amber-800', dotColor: 'bg-amber-500', points: 0, goalPoints: 10, reward: '칭찬' },
  ];

  // 시점(교사/학생)에 따른 모둠 렌더링 순서
  const displayedTeams = isStudentView ? activeTeams : [...activeTeams].reverse();

  // 🎯 [요구사항 4] 모둠 안 학생 카드 1:1 정사각 비율 및 홀수(5명 등) 3행 중앙 배치 렌더링 함수
  const renderTeamStudentCards = (teamStudents: Student[]) => {
    if (teamStudents.length === 0) {
      return (
        <div className="p-3 text-center text-slate-400 text-xs italic">
          배정된 학생이 없습니다
        </div>
      );
    }

    const totalStudents = teamStudents.length;

    return (
      <TeamDeskArea
        teamId={teamStudents[0].teamId}
        students={teamStudents}
        editing={deskEditing}
        flipped={isStudentView}
        gap={8}
        renderDesk={(student) => {
          const isSelected = selectedStudentForSwap === student.id;
          const isDraggingThis = draggedStudentId === student.id;
          const isDragOverThis = dragOverStudentId === student.id;

          return (
            <div
              key={student.id}
              draggable={!deskEditing}
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', String(student.id));
                e.dataTransfer.effectAllowed = 'move';
                setDraggedStudentId(student.id);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverStudentId !== student.id) {
                  setDragOverStudentId(student.id);
                }
              }}
              onDragLeave={(e) => {
                e.stopPropagation();
                if (dragOverStudentId === student.id) {
                  setDragOverStudentId(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDropStudentOnStudent(student.id);
              }}
              onDragEnd={() => {
                setDraggedStudentId(null);
                setDragOverStudentId(null);
              }}
              onClick={() => !deskEditing && handleStudentClick(student)}
              style={{ containerType: 'inline-size' }}
              className={`rounded-xl flex flex-col items-center justify-center py-2 px-2 text-center cursor-grab active:cursor-grabbing transition-all duration-200 border select-none ${
                deskEditing ? 'w-full cursor-move ring-1 ring-dashed ring-indigo-300' : 'w-full'
              } ${
                isDraggingThis
                  ? 'opacity-40 scale-95 border-dashed border-indigo-500 bg-indigo-50/40'
                  : isDragOverThis
                  ? 'ring-2 ring-indigo-500 scale-102 bg-indigo-100/60 dark:bg-indigo-900/60 shadow-md border-indigo-400'
                  : isSelected
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-300 scale-95'
                  : 'bg-slate-50/90 hover:bg-indigo-50/80 dark:bg-[#151f32] dark:hover:bg-[#1a273f] text-slate-800 dark:text-white border-slate-200 dark:border-[#1e2c44] shadow-2xs hover:shadow-xs'
              }`}
              title="드래그 앤 드롭 또는 클릭하여 자리를 맞바꿀 수 있습니다"
            >
              {/* 상단 번호 & 성별 뱃지 */}
              <div
                className={`text-[9.5px] font-mono font-bold mb-1 px-1.5 py-0.5 rounded-md ${
                  isSelected ? 'bg-indigo-500 text-indigo-100' : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {student.number}번{student.gender === 'M' ? ' · 남' : student.gender === 'F' ? ' · 여' : ''}
              </div>

              {/* 학생 이름 (위젯 크기 및 글자 수에 맞춰 자동 텍스트 크기 조절) */}
              <div
                className="font-black w-full px-0.5 whitespace-nowrap overflow-hidden text-ellipsis tracking-tight"
                style={{
                  fontSize: 'clamp(9.5px, 12cqi, 14px)',
                }}
                title={student.name}
              >
                {student.name}
              </div>

              {/* 칭찬 도장 미니 표시 */}
              {student.praisePoints > 0 && (
                <div
                  className={`mt-0.5 text-[9px] font-bold flex items-center gap-0.5 ${
                    isSelected ? 'text-amber-300' : 'text-amber-600'
                  }`}
                >
                  <Star className="w-2.5 h-2.5 fill-current" />
                  <span>{student.praisePoints}</span>
                </div>
              )}
            </div>
          );
        }}
      />
    );
  };

  return (
    <section className="w-full h-full p-4 sm:p-5 flex flex-col">
      {seatDrawStep &&
        createPortal(
          <Suspense fallback={null}>
            <SeatDrawSetup variant="setup" initialStep={seatDrawStep} onClose={() => setSeatDrawStep(null)} />
          </Suspense>,
          document.body,
        )}
      {/* Header & Action Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm text-slate-900">자리 &amp; 모둠 관리</h2>
            <span className="text-[11px] text-slate-500 font-medium">
              총 {students.length}명 재실 · {seatingViewType === 'individual' ? `개인좌석 (${individualColumns}열 분단)` : `모둠좌석 (${activeTeams.length}개 모둠 · ${teamColumns}열)`}
            </span>
          </div>
        </div>

        {/* Quick Seating Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* 🪑 좌석 모드 토글: [개인좌석] vs [모둠좌석] */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => handleSetSeatingViewType('individual')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                seatingViewType === 'individual'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="1열로 나란히 앉는 개인좌석 배치로 전환합니다"
            >
              <span>🪑 개인좌석</span>
            </button>
            <button
              onClick={() => handleSetSeatingViewType('team')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                seatingViewType === 'team'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="협력 토의 모둠좌석 배치로 전환합니다"
            >
              <span>👥 모둠좌석</span>
            </button>
          </div>

          {/* 🪑 개인좌석 모드일 때: 열 수 조절 버튼 (기본 3열, 2~6열 조절) */}
          {seatingViewType === 'individual' ? (
            <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
              <span className="text-[11px] text-indigo-600 mr-0.5">배열:</span>
              <button
                type="button"
                onClick={() => handleSetIndividualColumns(individualColumns - 1)}
                disabled={individualColumns <= 2}
                className="w-5 h-5 rounded bg-white text-slate-800 hover:bg-slate-200 disabled:opacity-30 flex items-center justify-center font-black cursor-pointer shadow-2xs"
                title="열 줄이기"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="font-mono text-indigo-700 px-1 font-black">{individualColumns}열</span>
              <button
                type="button"
                onClick={() => handleSetIndividualColumns(individualColumns + 1)}
                disabled={individualColumns >= 6}
                className="w-5 h-5 rounded bg-white text-slate-800 hover:bg-slate-200 disabled:opacity-30 flex items-center justify-center font-black cursor-pointer shadow-2xs"
                title="열 늘리기"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          ) : (
            /* 👥 모둠좌석 모드일 때: 2열 / 3열 선택 & 모둠 인원 설정 */
            <>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  onClick={() => handleSetTeamColumns(2)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    teamColumns === 2
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="화면에 모둠을 2열로 배치합니다 (1,2 / 3,4 / 5,6)"
                >
                  <Columns className="w-3 h-3" />
                  <span>2열</span>
                </button>
                <button
                  onClick={() => handleSetTeamColumns(3)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    teamColumns === 3
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="화면에 모둠을 3열로 배치합니다 (1,2,3 / 4,5,6)"
                >
                  <Columns className="w-3 h-3" />
                  <span>3열</span>
                </button>
              </div>

              {/* 🪑 책상 배치 편집: 자유 이동 → 정렬 */}
              <button
                onClick={() => {
                  setDeskEditing((v) => !v);
                  onShowToast(deskEditing ? '✅ 책상 배치 편집을 마쳤습니다.' : '🪑 책상을 끌어 원하는 위치에 놓은 뒤 [정렬]을 누르세요.');
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer border ${
                  deskEditing ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
                title="모둠 안 책상 위치를 자유롭게 옮깁니다 (학급마다 다른 책상 배치)"
              >
                <span>🪑</span>
                <span>{deskEditing ? '배치 완료' : '책상 배치'}</span>
              </button>
              {deskEditing && (
                <>
                  <button
                    onClick={handleAlignDesks}
                    className="px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer border bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                    title="자유롭게 놓은 책상을 일정한 간격으로 맞춥니다"
                  >
                    <span>📐</span>
                    <span>정렬</span>
                  </button>
                  <button
                    onClick={() => {
                      resetDeskLayout();
                      onShowToast('↺ 책상을 기본 배치(홀수 인원은 1·2·2)로 되돌렸습니다.');
                    }}
                    className="px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer border bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                    title="모든 모둠 책상을 기본 배치로 되돌립니다"
                  >
                    <span>↺</span>
                    <span>기본 배치</span>
                  </button>
                </>
              )}

              {/* 모둠 인원 설정 버튼 */}
              <button
                onClick={() => setIsTeamConfigOpen(!isTeamConfigOpen)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer border ${
                  isTeamConfigOpen
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
                title="위젯 내에서 모둠당 학생 수(4인, 5인, 6인 등)를 자유롭게 변경합니다"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>모둠 인원 설정</span>
              </button>
            </>
          )}

          {/* 🖥️ 보조 모니터 송출 버튼 */}
          {onOpenDualMonitor && (
            <button
              onClick={onOpenDualMonitor}
              className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-xs"
              title="보조 모니터 또는 전자칠판 화면에 대형 좌석 배치도를 송출합니다"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>대형 화면 송출</span>
            </button>
          )}

          <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-[#0c1424] border border-slate-200 dark:border-[#1e2c44]" data-persp-toggle>
            {(['teacher', 'student'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => changePerspective(p)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                  perspective === p ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
                title={p === 'teacher' ? '교탁에서 바라본 모습 (칠판이 아래)' : '학생 자리에서 바라본 모습 (칠판이 위)'}
              >
                <span>{p === 'teacher' ? '🧑‍🏫' : '🧒'}</span>
                <span>{p === 'teacher' ? '교사 시점' : '학생 시점'}</span>
              </button>
            ))}
          </div>

          {/* 🖨️ 교실 칠판 부착용 A4 가로 인쇄 버튼 */}
          <button
            onClick={handlePrintSeatingChart}
            className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition active:scale-95 cursor-pointer border border-slate-200 shadow-2xs"
            title="교실 칠판 부착용 A4 가로 인쇄"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-600" />
            <span>배치도 인쇄</span>
          </button>

          <button
            onClick={() => {
              onShuffleStudents();
              onShowToast('✨ 공정하게 학급 자리 배치가 무작위 재배치되었습니다.');
            }}
            className="px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs flex items-center gap-1 transition active:scale-95 cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>랜덤 섞기</span>
          </button>

          {/* 🎰 자리 뽑기 설정 (학생 명단 · 자리 모양 · 배치 방법 · 먼저 앉기 · 보기 방식) */}
          <button
            type="button"
            onClick={() => setSeatDrawStep('roster')}
            className="px-2.5 py-1 rounded-xl text-white font-bold text-xs flex items-center gap-1 transition active:scale-95 cursor-pointer bg-gradient-to-r from-pink-500 to-violet-500 shadow-xs hover:brightness-110"
            title="두근두근 자리 뽑기 설정 — 설정은 여기서, 학생 화면(보조창)에서는 뽑기만 해요"
            data-seatdraw-setup
          >
            <span>🎰</span>
            <span>자리 뽑기</span>
          </button>
          <button
            type="button"
            onClick={() => setSeatDrawStep('history')}
            className="px-2.5 py-1 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 font-bold text-xs flex items-center gap-1 transition active:scale-95 cursor-pointer"
            title="지난 자리 뽑기 기록 — 누르면 그때의 자리 배치표를 보고 인쇄해요"
            data-seatdraw-history
          >
            <span>🕘</span>
            <span>지난 기록</span>
          </button>

          <button
            onClick={onOpenRankingModal}
            className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs flex items-center gap-1 transition active:scale-95 cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-600" />
            <span>칭찬 랭킹</span>
          </button>
        </div>
      </div>

      {/* ⚙️ 모둠 수 및 모둠별 인원 직접 배정 패널 */}
      {isTeamConfigOpen && (
        <div className="mt-3 p-3.5 bg-gradient-to-br from-indigo-50/90 via-purple-50/70 to-indigo-50/90 border border-indigo-200/90 rounded-2xl animate-fade-in space-y-3 shadow-md">
          {/* 패널 헤더 */}
          <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>모둠 수 및 모둠별 인원 직접 배정</span>
              </span>
              <span className="text-[11px] bg-indigo-200/80 text-indigo-900 font-bold px-2 py-0.5 rounded-full">
                현재 총 {students.length}명 재실
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsTeamConfigOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/80 transition cursor-pointer"
              title="설정 패널 닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 1단계: 모둠 수 선택 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-700 flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-mono">1</span>
                <span>모둠 수 설정</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">원하는 모둠 개수를 선택하세요</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {[4, 5, 6, 7, 8].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => handleCustomTeamCountChange(count)}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-1 border ${
                    customTeamCount === count
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs ring-2 ring-indigo-300'
                      : 'bg-white hover:bg-indigo-50 text-indigo-900 border-indigo-200'
                  }`}
                >
                  <span>{count}개 모둠</span>
                </button>
              ))}

              {/* 모둠 수 직접 증감 스위처 */}
              <div className="flex items-center gap-1 bg-white border border-indigo-200 px-2 py-1 rounded-xl shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleCustomTeamCountChange(customTeamCount - 1)}
                  disabled={customTeamCount <= 2}
                  className="w-5 h-5 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-40 flex items-center justify-center font-bold cursor-pointer"
                  title="모둠 수 1개 감소"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-xs font-black text-indigo-950 min-w-[42px] text-center">
                  {customTeamCount}개 조
                </span>
                <button
                  type="button"
                  onClick={() => handleCustomTeamCountChange(customTeamCount + 1)}
                  disabled={customTeamCount >= 10}
                  className="w-5 h-5 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-40 flex items-center justify-center font-bold cursor-pointer"
                  title="모둠 수 1개 증가"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* 균등 분배 버튼 */}
              <button
                type="button"
                onClick={handleResetEqualDistribution}
                className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition flex items-center gap-1 ml-auto cursor-pointer shadow-2xs"
                title="총 인원을 현재 모둠 수에 공평하게 다시 분배합니다"
              >
                <span>⚖️ 인원 균등 분배</span>
              </button>
            </div>
          </div>

          {/* 2단계: 각 모둠별 인원수 직접 입력 카드 */}
          <div className="space-y-1.5 pt-1.5 border-t border-indigo-100/70">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-700 flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-mono">2</span>
                <span>각 모둠별 배정 인원 직접 입력</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">각 모둠 인원수를 숫자로 입력하거나 +/- 로 조정하세요</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {Array.from({ length: customTeamCount }).map((_, idx) => {
                const teamNum = idx + 1;
                const palette = defaultTeamPalette[idx % defaultTeamPalette.length];
                const currentSize = customTeamSizes[idx] ?? 0;

                return (
                  <div
                    key={teamNum}
                    className="p-2 rounded-xl bg-white border border-indigo-200/80 shadow-2xs flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${palette.dot}`} />
                        <span className="font-black text-xs text-slate-800">{teamNum}모둠</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">{palette.name}</span>
                    </div>

                    <div className="flex items-center justify-between gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleTeamMemberSizeChange(idx, currentSize - 1)}
                        disabled={currentSize <= 0}
                        className="w-5 h-5 rounded bg-white text-slate-700 hover:bg-slate-200 disabled:opacity-30 flex items-center justify-center font-bold cursor-pointer shadow-2xs"
                        title="1명 감소"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <div className="flex items-center gap-0.5">
                        <input
                          type="number"
                          min={0}
                          max={15}
                          value={currentSize}
                          onChange={(e) => handleTeamMemberSizeChange(idx, parseInt(e.target.value) || 0)}
                          className="w-8 text-center font-black text-xs text-indigo-950 bg-white border border-slate-200 rounded py-0.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="text-[10px] font-bold text-slate-500">명</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTeamMemberSizeChange(idx, currentSize + 1)}
                        disabled={currentSize >= 15}
                        className="w-5 h-5 rounded bg-white text-slate-700 hover:bg-slate-200 disabled:opacity-30 flex items-center justify-center font-bold cursor-pointer shadow-2xs"
                        title="1명 증가"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3단계: 총합 검증 및 배정 적용 버튼 */}
          {(() => {
            const sum = customTeamSizes.reduce((a, b) => a + b, 0);
            const total = students.length;
            const diff = sum - total;
            const isMatch = diff === 0;

            return (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-indigo-100">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-extrabold text-slate-700">배정 인원 합계:</span>
                  <span
                    className={`font-black px-2.5 py-1 rounded-full text-xs flex items-center gap-1 border ${
                      isMatch
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : diff < 0
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}
                  >
                    <span>{sum}명 / {total}명</span>
                    {isMatch ? (
                      <span className="text-[10px] font-bold">(모든 학생 정확히 일치 🟢)</span>
                    ) : diff < 0 ? (
                      <span className="text-[10px] font-bold">({Math.abs(diff)}명 덜 배정됨 🟡)</span>
                    ) : (
                      <span className="text-[10px] font-bold">({diff}명 초과됨 🔴)</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleApplyCustomTeamSizes}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition active:scale-95 cursor-pointer shadow-sm flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>이 인원으로 모둠 배정 적용</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Seating Layout Type Switcher Pills */}
      <div className="no-print my-3 flex items-center justify-between gap-2 flex-wrap">
        {seatingViewType === 'individual' ? (
          <div className="inline-flex p-1 bg-slate-100 rounded-xl items-center gap-1.5 px-3 py-1">
            <span className="text-xs font-black text-indigo-700 flex items-center gap-1">
              <span>🪑 1열 개인좌석 모드</span>
            </span>
            <span className="text-[11px] text-slate-500">
              (기본 3열 분단 배치 · 한 열에 4~5명 착석)
            </span>
          </div>
        ) : (
          <div className="inline-flex p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setLayout('grid')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                layout === 'grid'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              👥 모둠형 ({activeTeams.length}개 모둠 · {teamColumns}열)
            </button>
            <button
              onClick={() => setLayout('u_shape')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                layout === 'u_shape'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🔄 ㄷ자 토의형
            </button>
            <button
              onClick={() => setLayout('round')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                layout === 'round'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ⭕ 원탁 토론형
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
          {seatingViewType === 'team' && (
            <span className="hidden sm:inline text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-bold">
              💡 모둠 헤더를 드래그하여 서로 위치 변경 가능
            </span>
          )}
          {selectedStudentForSwap ? (
            <span className="text-indigo-600 font-bold animate-pulse">
              자리 교체할 학생을 선택하세요 (취소: 재클릭)
            </span>
          ) : (
            <span>학생 클릭: 자리 교체 / 상세</span>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🖨️ A4 가로 인쇄 및 메인 좌석 배치도 영역                                   */}
      {/* ========================================================================= */}
      <div id="print-seating-area" className="w-full flex-1 flex flex-col min-h-0 bg-white dark:bg-transparent p-2 rounded-2xl">
        {/* Blackboard / Teacher Podium Guidance (산뜻하고 선명한 인디고 뱃지) */}
        <div
          className={`w-full py-1.5 px-3 bg-indigo-600 text-white rounded-xl flex items-center justify-between text-xs font-extrabold shadow-sm mb-3 transition-transform ${
            !isStudentView ? 'order-last mt-3 mb-0' : ''
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping"></span>
            <span>[ 칠판 &amp; 전자 교탁 (앞) ]</span>
          </div>
          <span className="text-[10px] text-indigo-100 font-bold">
            {isStudentView ? '🧒 학생 시점 (학생 자리에서 본 모습)' : '🧑‍🏫 교사 시점 (교탁에서 본 모습)'}
          </span>
        </div>

        {/* 1. 개인좌석 1열 배치 뷰 (기본 3열, 1열로 나란히 앉는 책상 형태) */}
        {seatingViewType === 'individual' ? (() => {
          // 분단별 인원 수(저장값) 기준으로 분단 구성 → 시점에 따라 좌우·앞뒤 반전
          const baseColumns = buildColumns(students, individualColumns);
          const individualColsData: typeof students[] = isStudentView
            ? baseColumns
            : [...baseColumns].reverse().map((c) => [...c].reverse());
          const toBaseCol = (displayIdx: number) => (isStudentView ? displayIdx : individualColumns - 1 - displayIdx);

          return (
            <div
              className="overflow-x-auto overflow-y-auto custom-scroll flex-1 min-h-0 pr-1 pb-1"
            >
              <div
                className="grid gap-2 sm:gap-2.5 min-h-full"
                style={{
                  gridTemplateColumns: `repeat(${individualColumns}, minmax(0, 1fr))`,
                  minWidth: `max(100%, ${individualColumns * 94}px)`,
                }}
              >
                {individualColsData.map((colStudents, colIdx) => (
                  <div
                    key={colIdx}
                    onDragOver={(e) => {
                      if (!draggedStudentId) return;
                      e.preventDefault();
                      if (dragOverColIdx !== colIdx) setDragOverColIdx(colIdx);
                    }}
                    onDragLeave={(e) => {
                      if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setDragOverColIdx(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropStudentOnColumn(toBaseCol(colIdx));
                    }}
                    className={`bg-white/90 dark:bg-[#0c1424] backdrop-blur-sm border border-slate-200/90 dark:border-[#1e2c44] rounded-2xl p-2 flex flex-col shadow-xs transition ${
                      dragOverColIdx === colIdx ? 'ring-2 ring-indigo-500 bg-indigo-50/60' : ''
                    }`}
                    title="학생을 다른 학생 위에 놓으면 자리 교체, 분단 빈 곳에 놓으면 이 분단으로 이동"
                  >
                    {/* 분단 헤더 */}
                    <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-100 dark:border-slate-800 text-xs font-black">
                      <span className="bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold px-1.5 py-0.5 rounded-lg flex items-center gap-1 text-[11px] truncate">
                        <span>🪑</span>
                        <span>{toBaseCol(colIdx) + 1}열 ({toBaseCol(colIdx) + 1}분단)</span>
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md shrink-0">
                        {colStudents.length}명
                      </span>
                    </div>

                    {/* 세로 1열 학생 책상 카드 배치 (위젯 크기 및 카드 너비에 맞춰 학생 이름 자동 텍스트 크기 조절) */}
                    <div className="flex flex-col gap-1.5 flex-1">
                      {colStudents.map((student, rIdx) => {
                        const isSelected = selectedStudentForSwap === student.id;
                        const isDraggingThis = draggedStudentId === student.id;
                        const isDragOverThis = dragOverStudentId === student.id;

                        return (
                          <div
                            key={student.id}
                            draggable={true}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', String(student.id));
                              e.dataTransfer.effectAllowed = 'move';
                              setDraggedStudentId(student.id);
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.dataTransfer.dropEffect = 'move';
                              if (dragOverStudentId !== student.id) {
                                setDragOverStudentId(student.id);
                              }
                            }}
                            onDragLeave={(e) => {
                              e.stopPropagation();
                              if (dragOverStudentId === student.id) {
                                setDragOverStudentId(null);
                              }
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDropStudentOnStudent(student.id);
                            }}
                            onDragEnd={() => {
                              setDraggedStudentId(null);
                              setDragOverStudentId(null);
                            }}
                            onClick={() => handleStudentClick(student)}
                            className={`seat-student-card rounded-xl p-1.5 sm:p-2 transition-all duration-200 border select-none group cursor-grab active:cursor-grabbing flex items-center justify-between min-w-0 ${
                              isDraggingThis
                                ? 'opacity-40 scale-95 border-dashed border-indigo-500 bg-indigo-50/40'
                                : isDragOverThis
                                ? 'ring-2 ring-indigo-500 scale-102 bg-indigo-100/60 dark:bg-indigo-900/60 shadow-md border-indigo-400'
                                : isSelected
                                ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-300 scale-95'
                                : 'bg-white hover:bg-indigo-50/50 dark:bg-[#151f32] dark:hover:bg-[#1a273f] text-slate-900 dark:text-white border-slate-200 dark:border-[#1e2c44] shadow-2xs hover:shadow-xs'
                            }`}
                            title={`${colIdx + 1}열 ${rIdx + 1}번째 좌석 · 출석번호 ${student.number}번 (${student.gender === 'M' ? '남학생' : '여학생'}) ${student.name}`}
                          >
                            <div className="seat-student-card-inner">
                              {/* 출석 번호 & 성별 컴팩트 뱃지: 가로 폭을 최적화하여 학생 이름 공간을 극대화 */}
                              <span
                                className={`font-mono font-bold rounded-md shrink-0 whitespace-nowrap text-[9px] px-1 py-0.5 flex items-center gap-0.5 ${
                                  isSelected
                                    ? 'bg-indigo-500 text-indigo-100'
                                    : student.gender === 'M'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200/80'
                                    : student.gender === 'F'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200/80'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                <span>{student.number}번</span>
                                <span className="text-[8px] font-sans opacity-85">
                                  {student.gender === 'M' ? '남' : student.gender === 'F' ? '여' : ''}
                                </span>
                              </span>

                              {/* 🎯 학생 이름: CSS 컨테이너 쿼리를 통해 위젯 크기 및 카드 너비에 맞춰 폰트 크기가 실시간 자동 반응 */}
                              <span
                                className={`seat-student-name overflow-hidden text-ellipsis ${
                                  isSelected ? 'text-white' : 'text-slate-900'
                                }`}
                                title={student.name}
                              >
                                {student.name}
                              </span>

                              {/* 칭찬 포인트 뱃지 */}
                              {student.praisePoints > 0 && (
                                <div
                                  className={`text-[8.5px] font-bold flex items-center gap-0.5 shrink-0 ${
                                    isSelected ? 'text-amber-300' : 'text-amber-500'
                                  }`}
                                >
                                  <Star className="w-2.5 h-2.5 fill-current" />
                                  <span>{student.praisePoints}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })() : (
          /* 2. 모둠좌석 배치 뷰 (grid, u_shape, round) */
          <>
            {layout === 'grid' && (
          <div
            className={`grid gap-2.5 sm:gap-3 flex-1 min-h-0 overflow-y-auto custom-scroll pr-1 ${
              teamColumns === 3
                ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
                : 'grid-cols-1 sm:grid-cols-2'
            }`}
          >
            {displayedTeams.map((team, idx) => {
              const teamStudents = getStudentsByTeam(team.id);
              const isDragging = draggedTeamIndex === idx;
              const isDragOver = dragOverTeamIndex === idx;

              return (
                <div
                  key={team.id}
                  draggable={!deskEditing}
                  onDragStart={(e) => handleTeamDragStart(e, idx)}
                  onDragOver={(e) => {
                    if (draggedStudentId) {
                      e.preventDefault();
                      if (dragOverTeamId !== team.id) setDragOverTeamId(team.id);
                      return;
                    }
                    handleTeamDragOver(e, idx);
                  }}
                  onDragLeave={() => {
                    if (dragOverTeamId === team.id) setDragOverTeamId(null);
                  }}
                  onDrop={(e) => {
                    if (draggedStudentId) {
                      e.preventDefault();
                      handleDropStudentOnTeamArea(team.id);
                      return;
                    }
                    handleTeamDrop(e, idx);
                  }}
                  onDragEnd={() => {
                    setDraggedTeamIndex(null);
                    setDragOverTeamIndex(null);
                  }}
                  className={`p-3 rounded-2xl bg-white border transition-all duration-200 shadow-xs flex flex-col justify-between ${
                    team.borderColor || 'border-slate-200'
                  } ${isDragging ? 'opacity-40 scale-98 border-dashed border-indigo-400' : ''} ${
                    isDragOver || dragOverTeamId === team.id ? 'ring-2 ring-indigo-500 bg-indigo-50/30' : ''
                  }`}
                >
                  {/* 모둠 카드 헤더 (드래그 핸들 & 점수 획득) */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <div className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing select-none" title="잡고 드래그하여 다른 모둠과 위치를 변경할 수 있습니다">
                      <GripVertical className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                      <span className={`w-2.5 h-2.5 rounded-full ${team.dotColor || 'bg-indigo-500'}`} />
                      <span className={`font-extrabold text-xs sm:text-sm ${team.textColor || 'text-slate-800'}`}>
                        {team.name}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        ({teamStudents.length}명)
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTeamMinus(team)}
                        className="w-6 h-6 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 font-black text-xs border border-slate-200 transition active:scale-95 cursor-pointer flex items-center justify-center"
                        title="모둠 칭찬 도장 -1"
                        data-team-minus
                      >
                        −
                      </button>
                      <button
                        onClick={() => handleTeamScore(team)}
                        className="px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-extrabold text-[10px] border border-amber-200/80 transition active:scale-95 cursor-pointer flex items-center gap-0.5 shadow-2xs"
                        title="모둠 칭찬 도장 +1"
                      >
                        <span>🏆 {team.points}점</span>
                        <span className="text-amber-500 font-black">+1</span>
                      </button>
                    </div>
                  </div>

                  {/* 🎯 모둠 내부 학생 그리드 (1:1 비율 및 홀수 3행 중앙 정렬) */}
                  <div className="flex-1 flex flex-col justify-center">
                    {renderTeamStudentCards(teamStudents)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 2. U-Shape Discussion Layout View */}
        {layout === 'u_shape' && (
          <div className="space-y-2 flex-1 min-h-0 overflow-y-auto custom-scroll pr-1">
            <div className="grid grid-cols-12 gap-2">
              {/* Left wing */}
              <div className="col-span-4 sm:col-span-3 grid grid-cols-2 gap-1.5 bg-white p-2 rounded-xl border border-slate-100 max-h-56 overflow-y-auto custom-scroll">
                {students.slice(0, Math.ceil(students.length / 3)).map((student) => (
                  <div
                    key={student.id}
                    onClick={() => handleStudentClick(student)}
                    className={`aspect-square p-1 rounded-lg flex flex-col items-center justify-center text-center text-[10px] font-bold cursor-pointer transition border ${
                      selectedStudentForSwap === student.id
                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-500'
                        : 'bg-slate-50 hover:bg-indigo-50 text-slate-800 border-slate-200'
                    }`}
                  >
                    <span className="text-[9px] opacity-70">{student.number}번</span>
                    <span className="truncate font-black">{student.name}</span>
                  </div>
                ))}
              </div>

              {/* Center Presentation Stage */}
              <div className="col-span-4 sm:col-span-6 flex flex-col items-center justify-center p-3 rounded-xl bg-gradient-to-b from-indigo-50/60 to-purple-50/40 border border-dashed border-indigo-200 text-center">
                <span className="text-2xl">🎤</span>
                <div className="text-xs font-extrabold text-indigo-900 mt-1">
                  자유 발표 &amp; 전체 토의 아레나
                </div>
                <span className="text-[10px] text-slate-400">모든 시선 집중 모드</span>
              </div>

              {/* Right wing */}
              <div className="col-span-4 sm:col-span-3 grid grid-cols-2 gap-1.5 bg-white p-2 rounded-xl border border-slate-100 max-h-56 overflow-y-auto custom-scroll">
                {students.slice(Math.ceil(students.length / 3), Math.ceil((students.length * 2) / 3)).map((student) => (
                  <div
                    key={student.id}
                    onClick={() => handleStudentClick(student)}
                    className={`aspect-square p-1 rounded-lg flex flex-col items-center justify-center text-center text-[10px] font-bold cursor-pointer transition border ${
                      selectedStudentForSwap === student.id
                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-500'
                        : 'bg-slate-50 hover:bg-indigo-50 text-slate-800 border-slate-200'
                    }`}
                  >
                    <span className="text-[9px] opacity-70">{student.number}번</span>
                    <span className="truncate font-black">{student.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom wing */}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 p-1.5 bg-white rounded-xl border border-slate-100 text-center text-[10px] font-bold max-h-32 overflow-y-auto custom-scroll">
              {students.slice(Math.ceil((students.length * 2) / 3)).map((student) => (
                <div
                  key={student.id}
                  onClick={() => handleStudentClick(student)}
                  className={`aspect-square p-1.5 rounded-lg flex flex-col items-center justify-center cursor-pointer transition border ${
                    selectedStudentForSwap === student.id
                      ? 'bg-indigo-600 text-white ring-2 ring-indigo-500'
                      : 'bg-slate-50 hover:bg-indigo-50 text-slate-800 border-slate-200'
                  }`}
                >
                  <span className="text-[9px] opacity-70">{student.number}번</span>
                  <span className="truncate font-black">{student.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Round Collaborative Layout View */}
        {layout === 'round' && (
          <div
            className={`grid gap-2.5 sm:gap-3 flex-1 min-h-0 overflow-y-auto custom-scroll pr-1 ${
              teamColumns === 3
                ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
                : 'grid-cols-1 sm:grid-cols-2'
            }`}
          >
            {displayedTeams.map((team) => {
              const teamStudents = getStudentsByTeam(team.id);
              return (
                <div
                  key={team.id}
                  className={`p-3 bg-white rounded-2xl border ${team.borderColor || 'border-indigo-200'} shadow-xs flex flex-col justify-between`}
                >
                  <div className="text-xs font-extrabold text-indigo-900 mb-2 flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${team.dotColor || 'bg-indigo-500'}`} />
                      <span>{team.name} 원탁</span>
                    </span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                      {teamStudents.length}인 협력
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    {renderTeamStudentCards(teamStudents)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>
    )}
  </div>

      {/* Student Detail Modal */}
      {studentDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-5 max-w-xs w-full shadow-2xl border border-slate-200 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs">
                  {studentDetailModal.number}
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    {studentDetailModal.name}
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    {studentDetailModal.gender === 'M' ? '남학생' : '여학생'} · {studentDetailModal.teamId}모둠
                  </span>
                </div>
              </div>
              <button
                onClick={() => setStudentDetailModal(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between p-2 rounded-xl bg-slate-50">
                <span className="text-slate-500">개인 칭찬 도장</span>
                <span className="font-black text-indigo-600">
                  {studentDetailModal.praisePoints}개 획득
                </span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-slate-50">
                <span className="text-slate-500">발표 횟수</span>
                <span className="font-bold text-slate-800">
                  {studentDetailModal.selectedCount}회 참여
                </span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-slate-50">
                <span className="text-slate-500">출결 상태</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> 정상 출석
                </span>
              </div>
            </div>

            {/* 칭찬 항목 선택 인터랙션 */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black text-slate-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>맞춤 칭찬 도장 부여</span>
                </span>
                <span className="text-[10px] text-indigo-600 font-bold">
                  항목 터치 시 즉시 부여
                </span>
              </div>

              {/* 칭찬 항목 카드 그리드 */}
              <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                {(praiseConfigs && praiseConfigs.length > 0
                  ? praiseConfigs
                  : [
                      { id: '1', label: '발표 참여', title: '발표 참여', points: 1, icon: '🙋' },
                      { id: '2', label: '친구 배려', title: '친구 배려', points: 2, icon: '🤝' },
                      { id: '3', label: '정리정돈', title: '정리정돈', points: 1, icon: '🧹' },
                      { id: '4', label: '급식 모범', title: '급식 모범', points: 1, icon: '🍱' },
                      { id: '5', label: '과제 성실', title: '과제 성실', points: 2, icon: '📝' },
                      { id: '6', label: '친절 나눔', title: '친절 나눔', points: 1, icon: '💖' },
                    ]
                ).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (onAwardPraise) {
                        onAwardPraise(studentDetailModal.id, item as PraiseItemConfig);
                      } else {
                        onAddStudentPoint(studentDetailModal.id);
                      }
                      playCelebrateSound();
                      try {
                        confetti({
                          particleCount: 30,
                          spread: 45,
                          origin: { y: 0.6 },
                        });
                      } catch {}
                      onShowToast(
                        `🎉 [${studentDetailModal.name}] ${item.icon} ${item.label || item.title} (+${item.points}점) 칭찬 도장이 지급되었습니다!`
                      );
                      setStudentDetailModal(null);
                    }}
                    className="flex items-center justify-between p-2 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-indigo-50/80 hover:border-indigo-300 transition text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-sm">{item.icon}</span>
                      <span className="text-[11px] font-bold text-slate-800 group-hover:text-indigo-700 truncate">
                        {item.label || item.title}
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-indigo-600 bg-white px-1.5 py-0.5 rounded-md shadow-xs border border-indigo-100 shrink-0">
                      +{item.points}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  onAddStudentPoint(studentDetailModal.id);
                  playCelebrateSound();
                  try {
                    confetti({
                      particleCount: 25,
                      spread: 40,
                      origin: { y: 0.6 },
                    });
                  } catch {}
                  setStudentDetailModal(null);
                  onShowToast(`🌟 ${studentDetailModal.name} 학생에게 기본 칭찬 도장(+1)이 지급되었습니다!`);
                }}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 cursor-pointer shadow-sm"
              >
                <Award className="w-3.5 h-3.5" />
                <span>기본 도장 +1</span>
              </button>
              <button
                onClick={() => {
                  if ((studentDetailModal.praisePoints || 0) <= 0) {
                    onShowToast(`${studentDetailModal.name} 학생은 이미 0점이에요.`);
                    return;
                  }
                  onAddStudentPoint(studentDetailModal.id, -1);
                  onShowToast(`➖ ${studentDetailModal.name} 학생 칭찬 도장 -1`);
                  setStudentDetailModal(null);
                }}
                className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-black text-xs rounded-xl border border-rose-200 transition cursor-pointer"
                title="칭찬 도장 1개 빼기"
              >
                −1
              </button>
              <button
                onClick={() => setStudentDetailModal(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🖨️ 교실 게시용 A4 가로 자리 배치도 전용 인쇄 모달 */}
      <SeatingPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        students={students}
        teams={teams}
        seatingViewType={seatingViewType}
        individualColumns={individualColumns}
        teamColumns={teamColumns}
        layout={layout}
        isTeacherPerspective={isStudentView}
        onTogglePerspective={() => changePerspective(isStudentView ? 'teacher' : 'student')}
        schoolName={(() => {
          try {
            return JSON.parse(localStorage.getItem('class_dashboard_config') || '{}').schoolName || '';
          } catch {
            return '';
          }
        })()}
        grade={(() => {
          try {
            return Number(JSON.parse(localStorage.getItem('class_dashboard_config') || '{}').grade) || 3;
          } catch {
            return 3;
          }
        })()}
        classNum={(() => {
          try {
            return Number(JSON.parse(localStorage.getItem('class_dashboard_config') || '{}').classNum) || 1;
          } catch {
            return 1;
          }
        })()}
        onShowToast={onShowToast}
      />
    </section>
  );
};

