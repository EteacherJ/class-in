/**
 * 🌱 새 학기로 시작 · 💾 백업 · 📂 불러오기 (환경설정 1단계 맨 위)
 */
import React, { useRef, useState } from 'react';
import { SEMESTER_PARTS, downloadBackup, readBackupFile, restoreBackup, startNewSemester, type SemesterPart } from '../utils/classBackup';

const APP_VERSION = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_APP_VERSION || '';

export const SemesterBackupCard: React.FC<{ onShowToast?: (m: string) => void }> = ({ onShowToast }) => {
  const [open, setOpen] = useState<null | 'semester'>(null);
  const [parts, setParts] = useState<Set<SemesterPart>>(() => new Set(SEMESTER_PARTS.filter((p) => p.on).map((p) => p.id)));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const doBackup = () => {
    const name = downloadBackup(APP_VERSION);
    setMsg(`💾 ${name} 파일로 저장했어요. (다운로드 폴더를 확인해 주세요)`);
    onShowToast?.('💾 전체 백업 파일을 저장했어요.');
  };
  const onPick = async (f: File | undefined) => {
    if (!f) return;
    try {
      const b = await readBackupFile(f);
      const when = new Date(b.createdAt).toLocaleString('ko-KR');
      if (!window.confirm(`${when}에 만든 백업으로 되돌릴까요?\n\n지금 이 컴퓨터의 Class in 자료는 백업 내용으로 바뀌어요.\n(혹시 몰라 지금 자료도 먼저 백업 파일로 저장해 둘게요)`)) return;
      downloadBackup(APP_VERSION, '불러오기전-자동백업');
      setBusy(true);
      setMsg('📂 백업을 되돌리는 중이에요… 잠시 뒤 다시 시작해요.');
      setTimeout(() => restoreBackup(b), 700);
    } catch (e) {
      setMsg(`⚠️ ${(e as Error).message || '파일을 읽을 수 없어요.'}`);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };
  const doSemester = () => {
    if (!parts.size) return;
    const names = SEMESTER_PARTS.filter((p) => parts.has(p.id))
      .map((p) => `· ${p.label}`)
      .join('\n');
    if (!window.confirm(`🌱 새 학기로 시작할까요?\n\n아래 항목을 비워요:\n${names}\n\n비우기 전에 지금 자료를 백업 파일로 먼저 저장해요. (나중에 [📂 불러오기]로 되돌릴 수 있어요)`)) return;
    downloadBackup(APP_VERSION, '새학기전-백업');
    setBusy(true);
    setMsg('🌱 새 학기를 준비하는 중이에요… 잠시 뒤 다시 시작해요.');
    setTimeout(() => startNewSemester([...parts]), 900);
  };

  return (
    <div className="p-4 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800/60 bg-gradient-to-r from-emerald-50/90 via-teal-50/80 to-sky-50/80 dark:from-slate-800/80 dark:to-emerald-950/30 space-y-3" data-semester-card>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-black text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
          <span className="text-sm">🌱</span> 새 학기 · 자료 백업
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button type="button" disabled={busy} onClick={() => setOpen(open ? null : 'semester')} className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs cursor-pointer disabled:opacity-50" data-new-semester>
            🌱 새 학기로 시작
          </button>
          <button type="button" disabled={busy} onClick={doBackup} className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-black cursor-pointer disabled:opacity-50" data-backup-save>
            💾 지금 백업
          </button>
          <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-black cursor-pointer disabled:opacity-50" data-backup-load>
            📂 불러오기
          </button>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => void onPick(e.target.files?.[0])} />
        </div>
      </div>
      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
        [💾 지금 백업]은 이 컴퓨터의 Class in 자료(설정 · 명단 · 기록 · 판서 · 메모)를 파일 하나로 저장해요. 다른 컴퓨터에서 [📂 불러오기]로 그대로 옮길 수도 있어요.
      </p>
      {open === 'semester' && (
        <div className="p-3 rounded-xl bg-white/90 dark:bg-slate-900/70 border border-emerald-200 dark:border-emerald-800 space-y-2">
          <div className="text-[11px] font-black text-slate-700 dark:text-slate-200">비울 항목을 골라 주세요 (비우기 전에 백업 파일을 먼저 저장해요)</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {SEMESTER_PARTS.map((p) => (
              <label key={p.id} className="flex items-start gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-emerald-600"
                  checked={parts.has(p.id)}
                  onChange={(e) =>
                    setParts((prev) => {
                      const n = new Set(prev);
                      if (e.target.checked) n.add(p.id);
                      else n.delete(p.id);
                      return n;
                    })
                  }
                  data-semester-part={p.id}
                />
                <span>
                  <b className="block text-xs text-slate-800 dark:text-slate-100">{p.label}</b>
                  <small className="text-[10px] text-slate-500">{p.desc}</small>
                </span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-1.5">
            <button type="button" onClick={() => setOpen(null)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer">
              취소
            </button>
            <button type="button" disabled={!parts.size || busy} onClick={doSemester} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer disabled:opacity-50" data-new-semester-go>
              백업하고 새 학기 시작
            </button>
          </div>
        </div>
      )}
      {msg && <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">{msg}</p>}
    </div>
  );
};
