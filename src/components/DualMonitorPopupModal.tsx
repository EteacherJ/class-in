import React, { useState } from 'react';
import {
  Student,
  ClassRole,
  Team,
  QuizQuestion,
  AttendanceStatus,
} from '../types';
import { DualMonitorDisplayView } from './DualMonitorDisplayView';

interface DualMonitorPopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onUpdateStudentAttendance?: (studentId: number, status: AttendanceStatus) => void;
  onUpdateStudents?: (students: Student[]) => void;
  roles: ClassRole[];
  onUpdateRoles?: (roles: ClassRole[]) => void;
  teams: Team[];
  onUpdateTeams?: (teams: Team[]) => void;
  quizzes: QuizQuestion[];
  initialTab?: 'attendance' | 'timer' | 'noise' | 'roles' | 'picker' | 'break' | 'clean' | 'seating' | 'quiz' | 'bracket' | 'score' | 'qr' | 'morning' | 'homework';
  decibel?: number;
  onShowToast: (msg: string) => void;
}

export const DualMonitorPopupModal: React.FC<DualMonitorPopupModalProps> = ({
  isOpen,
  onClose,
  students,
  onUpdateStudentAttendance,
  onUpdateStudents,
  roles,
  onUpdateRoles,
  teams,
  onUpdateTeams,
  quizzes,
  initialTab = 'timer',
  decibel = 42,
  onShowToast,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!isOpen) return null;

  // Open secondary popup window exclusively with ?mode=display
  const handleOpenDetachedWindow = (tab?: string) => {
    try {
      const targetTab = tab || initialTab || 'timer';
      const url = `${window.location.origin}${window.location.pathname}?mode=display&tab=${targetTab}`;
      const popup = window.open(
        url,
        '_blank',
        'width=1280,height=800,menubar=no,toolbar=no,location=no,status=no,resizable=yes'
      );
      if (popup) {
        onShowToast('🖥️ 보조 모니터 전용 단독 화면이 새 창으로 분리되었습니다.');
        onClose();
      } else {
        setIsFullscreen(true);
        onShowToast('📺 팝업 차단으로 인해 현재 창에서 전체화면 프로젝터 모드로 표시합니다.');
      }
    } catch {
      setIsFullscreen(true);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in ${
        isFullscreen ? 'p-0' : ''
      }`}
    >
      <div
        className={`relative w-full ${
          isFullscreen ? 'h-full max-w-none rounded-none' : 'max-w-6xl rounded-3xl max-h-[94vh]'
        } bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col my-auto`}
      >
        <DualMonitorDisplayView
          standalone={false}
          initialTab={initialTab}
          students={students}
          onUpdateStudentAttendance={onUpdateStudentAttendance}
          onUpdateStudents={onUpdateStudents}
          roles={roles}
          onUpdateRoles={onUpdateRoles}
          teams={teams}
          onUpdateTeams={onUpdateTeams}
          quizzes={quizzes}
          decibel={decibel}
          onClose={onClose}
          onOpenDetached={handleOpenDetachedWindow}
        />
      </div>
    </div>
  );
};
