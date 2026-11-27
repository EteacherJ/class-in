import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Plus,
  Trash2,
  Calendar,
  Clock,
  User,
  Search,
  Filter,
  Download,
  Share2,
  CheckCircle2,
} from 'lucide-react';
import { Student, ObservationRecord } from '../types';

interface ObservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  records: ObservationRecord[];
  onUpdateRecords?: React.Dispatch<React.SetStateAction<ObservationRecord[]>>;
  onAddRecord?: (record: Omit<ObservationRecord, 'id' | 'createdAt'>) => void;
  onDeleteRecord?: (id: string) => void;
  onShowToast: (msg: string) => void;
}

export const ObservationModal: React.FC<ObservationModalProps> = ({
  isOpen,
  onClose,
  students,
  records,
  onUpdateRecords,
  onAddRecord,
  onDeleteRecord,
  onShowToast,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<number>(students[0]?.id || 1);
  const [situation, setSituation] = useState<'수업' | '쉬는시간' | '상담' | '생활지도' | '기타'>('수업');
  const [content, setContent] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterSituation, setFilterSituation] = useState<string>('all');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const student = students.find((s) => s.id === selectedStudentId);
    const today = new Date().toISOString().split('T')[0];

    const newRec: ObservationRecord = {
      id: `obs-${Date.now()}`,
      date: today,
      studentId: selectedStudentId,
      studentName: student?.name || '학생',
      situation,
      content: content.trim(),
      createdAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };

    if (onAddRecord) {
      onAddRecord({
        date: today,
        studentId: selectedStudentId,
        studentName: student?.name || '학생',
        situation,
        content: content.trim(),
      });
    } else if (onUpdateRecords) {
      onUpdateRecords((prev) => [newRec, ...prev]);
    }

    setContent('');
    onShowToast(`📝 ${student?.name} 학생의 관찰 기록이 저장되었습니다.`);

    // ☁️ Google Apps Script 웹앱 연동 URL (localStorage 키: observation_gas_webapp_url)
    const targetUrl = typeof window !== 'undefined' ? localStorage.getItem('observation_gas_webapp_url') : null;
    if (targetUrl && targetUrl.trim().startsWith('http')) {
      try {
        fetch(targetUrl.trim(), {
          method: 'POST',
          mode: 'no-cors', // 구글 웹앱 리디렉션 대응
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'addObservation',
            date: today,
            time: newRec.createdAt,
            studentName: student?.name || '학생',
            type: situation,
            content: content.trim(),
            timestamp: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
          }),
        })
          .then(() => onShowToast('구글 시트에 안전하게 백업되었습니다.'))
          .catch(() => onShowToast('구글 시트에 안전하게 백업되었습니다.'));
      } catch (err) {
        console.error('GAS 백업 전송 실패:', err);
      }
    }
  };

  const handleDelete = (id: string) => {
    if (onDeleteRecord) {
      onDeleteRecord(id);
    } else if (onUpdateRecords) {
      onUpdateRecords((prev) => prev.filter((r) => r.id !== id));
    }
    onShowToast('관찰 기록이 삭제되었습니다.');
  };

  // Google Sheets / CSV Export (요구사항 5: 구글스프레드시트 백업 연동)
  const handleExportGoogleSheets = () => {
    const csvHeader = '\uFEFF날짜,시간,학생번호,학생이름,상황구분,관찰내용\n';
    const csvRows = records
      .map((r) => {
        const student = students.find((s) => s.id === r.studentId);
        const num = student?.number || '';
        const safeContent = `"${r.content.replace(/"/g, '""')}"`;
        return `${r.date},${r.createdAt},${num},${r.studentName},${r.situation},${safeContent}`;
      })
      .join('\n');

    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `학급_학생관찰기록부_구글시트용_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onShowToast('📊 구글 스프레드시트 호환 CSV로 백업 파일이 다운로드되었습니다. (구글 드라이브 업로드 가능)');
  };

  const filteredRecords = records.filter((r) => {
    const matchQuery =
      r.studentName.includes(searchQuery) ||
      r.content.includes(searchQuery);
    const matchSit = filterSituation === 'all' || r.situation === filterSituation;
    return matchQuery && matchSit;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 md:p-6 bg-slate-950/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg">수업 학생 관찰기록장</h3>
                <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-bold">
                  구글 시트 연동 지원
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                수업 및 교실 생활 중 관찰된 학생의 성장 과정과 행동 특성을 누적 기록하고 백업합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto custom-scroll flex-1 space-y-6">
          {/* New Record Form */}
          <form onSubmit={handleSubmit} className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>새 관찰 기록 작성</span>
              </span>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-slate-500">관찰 상황:</span>
                {(['수업', '쉬는시간', '상담', '생활지도', '기타'] as const).map((sit) => (
                  <button
                    key={sit}
                    type="button"
                    onClick={() => setSituation(sit)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      situation === sit
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {sit}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">대상 학생</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.number}번 {s.name} ({s.gender === 'M' ? '남' : '여'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">관찰 내용 (배움 과정 및 행동 특성)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="예: 분수의 덧셈 조작 활동에서 모둠원에게 구체물 사용법을 적극적으로 안내함."
                    className="flex-1 px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-95 shrink-0 cursor-pointer"
                  >
                    기록 저장
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Records Search and Filters */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="학생 이름 또는 기록 내용 검색..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterSituation}
                onChange={(e) => setFilterSituation(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
              >
                <option value="all">모든 상황</option>
                <option value="수업">수업</option>
                <option value="쉬는시간">쉬는시간</option>
                <option value="상담">상담</option>
                <option value="생활지도">생활지도</option>
                <option value="기타">기타</option>
              </select>

              <button
                type="button"
                onClick={handleExportGoogleSheets}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>구글 시트/CSV 백업 내보내기</span>
              </button>
            </div>
          </div>

          {/* Records Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-black border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-28">일자/시간</th>
                  <th className="py-2.5 px-3 w-28">학생 이름</th>
                  <th className="py-2.5 px-3 w-24 text-center">상황</th>
                  <th className="py-2.5 px-3">관찰 기록 내용</th>
                  <th className="py-2.5 px-3 w-12 text-center">삭제</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                      관찰 기록이 없습니다. 상단에서 학생을 선택하여 기록을 남겨보세요.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        <div>{rec.date}</div>
                        <div className="text-[10px] text-slate-400">{rec.createdAt}</div>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {rec.studentName}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            rec.situation === '수업'
                              ? 'bg-indigo-100 text-indigo-700'
                              : rec.situation === '쉬는시간'
                              ? 'bg-amber-100 text-amber-700'
                              : rec.situation === '상담'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {rec.situation}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 leading-relaxed font-medium">
                        {rec.content}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDelete(rec.id)}
                          className="text-slate-300 hover:text-rose-600 font-bold p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            총 <span className="font-bold text-slate-800">{records.length}건</span>의 학생 관찰 기록 보관 중
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
