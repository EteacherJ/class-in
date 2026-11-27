import React, { useEffect, useState } from 'react';
import { MapPin, Search, CheckCircle2, RefreshCw } from 'lucide-react';
import { EDU_OFFICES, getSavedSchool, saveSchool, searchSchools, shortAddress, type NeisSchool } from '../utils/neisSchool';

/**
 * 🏫 학교알리미(NEIS) 학교 확인 — 환경설정 1단계
 * 같은 이름의 학교가 여러 곳이면 안내하고, 지역(주소)을 골라 정확한 학교로 저장합니다.
 * (급식 위젯이 이 학교 코드로 식단을 불러옵니다)
 */
export const SchoolFinder: React.FC<{ schoolName: string; onPickName: (name: string) => void; onShowToast: (m: string) => void }> = ({
  schoolName,
  onPickName,
  onShowToast,
}) => {
  const [saved, setSaved] = useState<NeisSchool | null>(() => getSavedSchool());
  const [region, setRegion] = useState('');
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<NeisSchool[]>([]);
  const [msg, setMsg] = useState('');

  const baseName = (n: string) => n.replace(/\s+/g, '').replace(/(등학교|학교)$/, '');
  const mismatch = saved && schoolName.trim() && baseName(saved.name) !== baseName(schoolName);

  useEffect(() => {
    setList([]);
    setMsg('');
  }, [schoolName]);

  const find = async () => {
    if (!schoolName.trim()) {
      setMsg('학교 이름을 먼저 입력해 주세요.');
      return;
    }
    setBusy(true);
    const r = await searchSchools(schoolName, region);
    setBusy(false);
    if (!r.ok) {
      setList([]);
      setMsg(r.message || '학교를 찾지 못했어요.');
      return;
    }
    if (r.schools.length === 1) {
      pick(r.schools[0]);
      return;
    }
    setList(r.schools);
    setMsg(
      `⚠️ '${r.schools[0].name}' 이름의 학교가 ${r.schools.length}곳${r.schools.length >= 5 ? ' 이상' : ''} 있어요. 근무하는 학교의 지역을 골라 주세요.` +
        (r.schools.length >= 5 && !region ? ' (목록에 없으면 시·도를 고르고 다시 찾기)' : '')
    );
  };

  const pick = (s: NeisSchool) => {
    saveSchool(s);
    setSaved(s);
    setList([]);
    setMsg('');
    onPickName(s.name);
    onShowToast(`🏫 ${s.name} (${shortAddress(s)}) 으로 저장했어요. 급식 위젯이 이 학교 식단을 불러와요.`);
  };

  return (
    <div className="sm:col-span-3 p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-amber-600" />
          학교알리미 학교 확인 (급식용)
        </span>
        {saved && !mismatch ? (
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {saved.name} · {saved.address || saved.eduName}
          </span>
        ) : (
          <span className="text-[11px] text-amber-700 dark:text-amber-300 font-bold">
            {mismatch ? '학교 이름이 바뀌었어요. 다시 확인해 주세요.' : '아직 확인하지 않았어요.'}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-bold"
            title="시·도"
          >
            <option value="">시·도 전체</option>
            {EDU_OFFICES.map((o) => (
              <option key={o.code} value={o.code}>
                {o.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={find}
            disabled={busy}
            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white text-[11px] font-black flex items-center gap-1 cursor-pointer"
          >
            {busy ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
            학교 찾기
          </button>
        </div>
      </div>
      {msg && <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300">{msg}</p>}
      {list.length > 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {list.map((s) => (
            <button
              key={`${s.eduCode}-${s.schoolCode}`}
              type="button"
              onClick={() => pick(s)}
              className="text-left px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-amber-400 bg-white dark:bg-slate-900 cursor-pointer"
            >
              <div className="text-[11px] font-black text-slate-800 dark:text-slate-100">
                {s.name} <span className="text-amber-700 dark:text-amber-300">· {shortAddress(s)}</span>
              </div>
              <div className="text-[10px] text-slate-500 truncate">{s.address || s.eduName}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SchoolFinder;
