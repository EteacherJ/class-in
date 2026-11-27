import React, { useState, useEffect } from 'react';
import { Phone, Edit2, Check, X, Plus, Trash2, Copy } from 'lucide-react';
import { SchoolInfoContact } from '../types';

interface MiniSchoolInfoStackWidgetProps {
  onShowToast?: (msg: string) => void;
  onExpandToCanvas?: () => void;
}

const initialContacts: SchoolInfoContact[] = [
  { id: 'c1', label: '교무실', number: '031-123-4561' },
  { id: 'c2', label: '행정실', number: '031-123-4562' },
  { id: 'c3', label: '보건실', number: '031-123-4563' },
  { id: 'c4', label: '당직실', number: '031-123-4564' },
];

/**
 * 📞 [스택 전용 미니 학교 정보 위젯]
 * - 스택 슬롯 높이(h-[210px])에 최적화
 * - 부서명, 연락처만 심플하고 깔끔하게 제시
 * - 우측 연필(수정) 아이콘으로 인라인 즉시 편집 가능
 */
export const MiniSchoolInfoStackWidget: React.FC<MiniSchoolInfoStackWidgetProps> = ({
  onShowToast,
  onExpandToCanvas,
}) => {
  const [contacts, setContacts] = useState<SchoolInfoContact[]>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_school_contacts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return initialContacts;
  });

  // 인라인 수정 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [editAddress, setEditAddress] = useState('');

  // 신규 등록 상태
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newAddress, setNewAddress] = useState('');

  // 외부(다른 위젯)에서 localStorage가 변경될 때 동기화
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'class_dashboard_school_contacts' && e.newValue) {
        try {
          setContacts(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const saveContacts = (updated: SchoolInfoContact[]) => {
    setContacts(updated);
    try {
      localStorage.setItem('class_dashboard_school_contacts', JSON.stringify(updated));
    } catch {}
  };

  const handleStartEdit = (c: SchoolInfoContact) => {
    setEditingId(c.id);
    setEditLabel(c.label);
    setEditNumber(c.number);
    setEditAddress(c.address || '');
    setIsAdding(false);
  };

  const handleSaveEdit = (id: string) => {
    if (!editLabel.trim() || (!editNumber.trim() && !editAddress.trim())) {
      onShowToast?.('⚠️ 부서명과 전화번호(또는 주소)를 입력해 주세요.');
      return;
    }
    const updated = contacts.map((c) =>
      c.id === id ? { ...c, label: editLabel.trim(), number: editNumber.trim(), address: editAddress.trim() || undefined } : c
    );
    saveContacts(updated);
    setEditingId(null);
    onShowToast?.('✏️ 연락처가 수정되었습니다.');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    const updated = contacts.filter((c) => c.id !== id);
    saveContacts(updated);
    setEditingId(null);
    onShowToast?.('🗑️ 연락처가 삭제되었습니다.');
  };

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || (!newNumber.trim() && !newAddress.trim())) {
      onShowToast?.('⚠️ 부서명과 전화번호(또는 주소)를 입력해 주세요.');
      return;
    }
    const newContact: SchoolInfoContact = {
      id: `c-${Date.now()}`,
      label: newLabel.trim(),
      number: newNumber.trim(),
      ...(newAddress.trim() ? { address: newAddress.trim() } : {}),
    };
    const updated = [...contacts, newContact];
    saveContacts(updated);
    setNewLabel('');
    setNewNumber('');
    setNewAddress('');
    setIsAdding(false);
    onShowToast?.('📞 새 연락처가 추가되었습니다.');
  };

  const handleCopyNumber = (num: string, label: string) => {
    navigator.clipboard.writeText(num).then(() => {
      onShowToast?.(`📋 [${label}] 전화번호(${num})가 복사되었습니다.`);
    }).catch(() => {
      onShowToast?.(`전화번호: ${num}`);
    });
  };

  const handleCopyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr).then(() => onShowToast?.(`📍 주소가 복사되었습니다.`)).catch(() => onShowToast?.(`주소: ${addr}`));
  };

  return (
    <div className="w-full h-full flex flex-col p-2.5 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden text-slate-800 dark:text-slate-100">
      {/* 헤더: 교내 연락처 타이틀 + 추가 버튼 */}
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-200/70 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
            <Phone className="w-3 h-3" />
          </div>
          <span className="text-xs font-black tracking-tight text-slate-800 dark:text-slate-100">
            교내 주요 연락처
          </span>
          <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-950/50 px-1.5 py-0.2 rounded-md border border-teal-200/50 dark:border-teal-800/40">
            {contacts.length}곳
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsAdding(!isAdding);
            setEditingId(null);
          }}
          className="px-2 py-0.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:hover:bg-teal-900/80 dark:text-teal-300 text-[10px] font-bold flex items-center gap-0.5 transition cursor-pointer border border-teal-200/60 dark:border-teal-800"
          title="새 연락처 추가"
        >
          <Plus className="w-2.5 h-2.5" />
          <span>추가</span>
        </button>
      </div>

      {/* 새 연락처 추가 인라인 폼 */}
      {isAdding && (
        <form onSubmit={handleAddNew} className="p-2 mb-2 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex flex-col gap-1.5 shrink-0 animate-in fade-in zoom-in-95 duration-150">
          <div className="grid grid-cols-2 gap-1.5">
            <input
              type="text"
              placeholder="부서명 (예: 과학실)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="w-full min-w-0 px-2 py-1 text-[11px] rounded-lg bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 font-bold"
              autoFocus
            />
            <input
              type="text"
              placeholder="전화번호"
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              className="w-full min-w-0 px-2 py-1 text-[11px] rounded-lg bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <input
            type="text"
            placeholder="주소 (선택 · 예: ○○시 ○○로 12)"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            className="w-full px-2 py-1 text-[11px] rounded-lg bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            data-contact-address-input
          />
          <div className="flex justify-end gap-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-2 py-0.5 text-[10px] text-slate-500 hover:text-slate-700 dark:text-slate-400 rounded-md"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-2.5 py-0.5 text-[10px] bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-md shadow-xs cursor-pointer"
            >
              등록
            </button>
          </div>
        </form>
      )}

      {/* 연락처 리스트 (부서명, 연락처만 제시 & 오른쪽에 연필 아이콘) */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar min-h-0">
        {contacts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 text-xs py-4">
            <Phone className="w-5 h-5 mb-1 opacity-40 text-teal-500" />
            <span>등록된 교내 연락처가 없습니다.</span>
          </div>
        ) : (
          contacts.map((c) => {
            const isEditing = editingId === c.id;

            if (isEditing) {
              return (
                <div
                  key={c.id}
                  className="p-1.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 flex flex-col gap-1.5 shadow-2xs"
                >
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      placeholder="부서명"
                      className="w-24 shrink-0 min-w-0 px-2 py-1 text-[11px] rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={editNumber}
                      onChange={(e) => setEditNumber(e.target.value)}
                      placeholder="연락처"
                      className="flex-1 min-w-0 px-2 py-1 text-[11px] font-mono rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-slate-800 dark:text-slate-100 focus:outline-none"
                    />
                  </div>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="주소 (선택)"
                    className="w-full px-2 py-1 text-[11px] rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                  <div className="flex items-center justify-between pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="px-1.5 py-0.5 text-[10px] text-rose-500 hover:text-rose-700 flex items-center gap-0.5"
                      title="연락처 삭제"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                      <span>삭제</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-2 py-0.5 text-[10px] text-slate-500 hover:text-slate-700 rounded-md"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(c.id)}
                        className="px-2.5 py-0.5 text-[10px] bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-md shadow-xs flex items-center gap-0.5 cursor-pointer"
                      >
                        <Check className="w-2.5 h-2.5" />
                        <span>저장</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={c.id}
                className="group flex flex-wrap items-center justify-between gap-y-0.5 px-2.5 py-2 rounded-xl bg-slate-50/90 dark:bg-slate-800/60 hover:bg-teal-50/60 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition-all shadow-2xs"
              >
                {/* 1. 부서명 (좌측) */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {c.label}
                  </span>
                </div>

                {/* 2. 연락처 & 오른쪽에 연필 수정 아이콘 */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* 연락처 텍스트 (클릭 시 복사) */}
                  {c.number && (<button
                    type="button"
                    onClick={() => handleCopyNumber(c.number, c.label)}
                    className="font-mono text-xs font-semibold text-teal-700 dark:text-teal-300 hover:underline cursor-pointer flex items-center gap-1"
                    title="클릭하여 전화번호 복사"
                  >
                    <span>{c.number}</span>
                    <Copy className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 transition" />
                  </button>)}

                  {/* ✏️ 오른쪽 연필 아이콘 (수정 가능하게 하기) */}
                  <button
                    type="button"
                    onClick={() => handleStartEdit(c)}
                    className="p-1 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition cursor-pointer"
                    title={`${c.label} 연락처 수정`}
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
                {c.address && (
                  <button
                    type="button"
                    onClick={() => handleCopyAddress(c.address!)}
                    className="basis-full text-left pl-3.5 text-[10.5px] leading-snug text-slate-500 dark:text-slate-400 hover:text-teal-600 truncate cursor-pointer"
                    title={`${c.address} (클릭하여 주소 복사)`}
                    data-contact-address
                  >
                    📍 {c.address}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
