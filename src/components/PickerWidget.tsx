import React, { useState, useEffect } from 'react';
import { Wand2, Sparkles, History } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Student } from '../types';
import { getTimerAlert, playPickTick, playTimerSound } from '../utils/timerAlerts';

interface PickerWidgetProps {
  students: Student[];
  onSelectStudent: (studentId: number) => void;
  onShowToast: (msg: string) => void;
}

export const PickerWidget: React.FC<PickerWidgetProps> = ({
  students,
  onSelectStudent,
  onShowToast,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'unselected' | 'team'>('all');
  const [resultText, setResultText] = useState<string>('누가 발표할까요? 🎯');
  const [subText, setSubText] = useState<string>('공정하고 재미있게 추천합니다');
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [recentPicks, setRecentPicks] = useState<Student[]>([
    { id: 4, number: 4, name: '아이유', gender: 'F', teamId: 1, attendance: 'present', praisePoints: 6, selectedCount: 3 },
    { id: 12, number: 12, name: '남주혁', gender: 'M', teamId: 3, attendance: 'present', praisePoints: 4, selectedCount: 2 },
  ]);

  // 📡 보조 모니터(DualMonitorDisplayView)와의 발표자 뽑기 양방향 실시간 동기화
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const channel = new BroadcastChannel('class_display_sync_channel');

    channel.onmessage = (event) => {
      if (!event.data) return;

      // 보조모니터에서 뽑기 시작 신호 수신
      if (event.data.type === 'TRIGGER_PICKER_START') {
        setIsRolling(true);
        setSubText('보조 모니터에서 발표자를 추첨하고 있습니다! 🎲');
      }

      // 보조모니터에서 최종 당첨 결과 수신
      if (event.data.type === 'TRIGGER_PICKER_RESULT' && event.data.winner) {
        const winner: Student = event.data.winner;
        setIsRolling(false);
        setResultText(`🎯 ${winner.number}번 ${winner.name}`);
        setSubText('오늘의 발표 주인공입니다! 큰 박수로 맞이해주세요 👏');
        onSelectStudent(winner.id);
        setRecentPicks((prev) => [winner, ...prev.filter((p) => p.id !== winner.id)].slice(0, 4));
        // 소리는 뽑기를 누른 보조창에서 나요 (겹쳐 울리지 않게)
        try {
          confetti({
            particleCount: 50,
            spread: 55,
            origin: { y: 0.7 },
          });
        } catch {}
      }
    };

    return () => {
      channel.close();
    };
  }, [onSelectStudent]);

  // 키보드 'R' / 'r' 단축키로 뽑기 실행
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 텍스트 입력창이 아닐 때만 R 키 동작
      const target = e.target as HTMLElement;
      // 글 입력 중(메모 · 글상자 포함) · 다른 단축키(Ctrl/⌘/Alt) · 창이 열려 있을 때는 무시
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || e.isComposing) return;
      if (document.querySelector('[aria-modal="true"], [data-leave-scene]')) return;
      if (e.code === 'KeyR') {
        triggerPicker();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const triggerPicker = () => {
    if (isRolling || students.length === 0) return;

    // Filter candidates based on mode
    let candidatePool = students.filter((s) => s.attendance === 'present');
    if (filterMode === 'unselected') {
      const minCount = Math.min(...candidatePool.map((s) => s.selectedCount));
      const unselected = candidatePool.filter((s) => s.selectedCount === minCount);
      if (unselected.length > 0) candidatePool = unselected;
    }

    if (candidatePool.length === 0) candidatePool = students;

    setIsRolling(true);
    setSubText('두구두구두구... 발표자를 선정하는 중!');

    // 📡 보조 모니터로 뽑기 시작 브로드캐스트
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('class_display_sync_channel');
        channel.postMessage({
          type: 'TRIGGER_PICKER_START',
          candidates: candidatePool,
        });
        channel.close();
      }
    } catch {}

    let count = 0;
    const maxRolls = 18;
    const interval = setInterval(() => {
      const randStudent = candidatePool[Math.floor(Math.random() * candidatePool.length)];
      setResultText(`${randStudent.number}번 ${randStudent.name}`);
      count++;
      try {
        const a = getTimerAlert();
        playPickTick(a.pickSpin, count / maxRolls, a.volume);
      } catch {}

      if (count >= maxRolls) {
        clearInterval(interval);
        const winner = candidatePool[Math.floor(Math.random() * candidatePool.length)];
        setResultText(`🎯 ${winner.number}번 ${winner.name}`);
        setSubText('오늘의 발표 주인공입니다! 큰 박수로 맞이해주세요 👏');
        setIsRolling(false);

        // Update selected count
        onSelectStudent(winner.id);

        // Update recent picks
        setRecentPicks((prev) => [winner, ...prev.filter((p) => p.id !== winner.id)].slice(0, 4));

        // 📡 보조 모니터로 뽑기 결과 브로드캐스트
        try {
          if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
            const channel = new BroadcastChannel('class_display_sync_channel');
            channel.postMessage({
              type: 'TRIGGER_PICKER_RESULT',
              winner,
            });
            channel.close();
          }
        } catch {}

        // Trigger confetti & sound (보조창 🔊 효과음에서 고른 소리)
        try {
          const a = getTimerAlert();
          playTimerSound(a.pickEnd, a.volume);
        } catch {}
        try {
          confetti({
            particleCount: 65,
            spread: 60,
            origin: { y: 0.7 },
          });
        } catch {}

        onShowToast(`🎉 ${winner.number}번 ${winner.name} 학생이 발표자로 선정되었습니다!`);
      }
    }, 70);
  };

  return (
    <section className="w-full h-full p-4 sm:p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
            <Wand2 className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-slate-900">발표자 추천</span>
        </div>

        <select
          value={filterMode}
          onChange={(e) => setFilterMode(e.target.value as 'all' | 'unselected' | 'team')}
          className="text-xs bg-slate-100 border-0 rounded-lg px-2.5 py-1 font-semibold text-slate-700 focus:ring-1 focus:ring-purple-400 cursor-pointer"
        >
          <option value="all">전체 무작위 ({students.length}명)</option>
          <option value="unselected">미발표 학생 우선</option>
          <option value="team">모둠별 대표 추천</option>
        </select>
      </div>

      {/* Center Showcase Frame */}
      <div className="my-4 bg-gradient-to-b from-purple-50/70 via-slate-50/50 to-white rounded-2xl border border-purple-100/90 p-5 text-center flex flex-col items-center justify-center min-h-[120px] relative overflow-hidden">
        <div
          className={`text-2xl sm:text-3xl font-black tracking-tight transition-all duration-100 select-none ${
            isRolling ? 'text-purple-600 dark:text-purple-300 scale-105' : 'text-purple-900 dark:text-purple-100'
          }`}
        >
          {resultText}
        </div>
        <p className="text-xs text-slate-400 mt-1 font-medium">{subText}</p>
      </div>

      {/* Action Button */}
      <button
        onClick={triggerPicker}
        disabled={isRolling}
        className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-sm rounded-2xl shadow-md shadow-purple-200 transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
      >
        <Sparkles className="w-4 h-4" />
        <span>{isRolling ? '추첨 중...' : '두근두근 뽑기 (R)'}</span>
      </button>

      {/* Recently Picked History Chips */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-400 font-medium flex items-center gap-1">
          <History className="w-3 h-3 text-slate-400" />
          <span>최근 선정:</span>
        </span>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {recentPicks.map((pick, idx) => (
            <span
              key={`${pick.id}-${idx}`}
              className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                idx === 0 ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-200' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {pick.number}번 {pick.name}
            </span>
          ))}
        </div>
      </div>

    </section>
  );
};

