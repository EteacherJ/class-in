import React, { useState } from 'react';
import {
  Building2,
  Phone,
  ShoppingCart,
  ExternalLink,
  Plus,
  Trash2,
  Copy,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import { SchoolInfoContact } from '../types';

interface SchoolInfoWidgetProps {
  onShowToast?: (msg: string) => void;
}

interface ShoppingMallItem {
  id: string;
  name: string;
  url: string;
  desc: string;
}

const initialContacts: SchoolInfoContact[] = [
  { id: 'c1', label: '교무실', number: '031-123-4561' },
];

const initialShoppingMalls: ShoppingMallItem[] = [
  { id: 'm1', name: '학교장터 (S2B)', url: 'https://www.s2b.kr', desc: '지정정보처리장치 교육기관 전자조달' },
];

export const SchoolInfoWidget: React.FC<SchoolInfoWidgetProps> = ({ onShowToast }) => {
  const [activeTab, setActiveTab] = useState<'contacts' | 'malls'>('contacts');

  // ==========================================
  // 1. 주요 연락처 상태 & 편집 로직
  // ==========================================
  const [contacts, setContacts] = useState<SchoolInfoContact[]>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_school_contacts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return initialContacts;
  });

  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newAddress, setNewAddress] = useState('');

  // 연락처 인라인 수정 상태
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [editAddress, setEditAddress] = useState('');

  const saveContacts = (updated: SchoolInfoContact[]) => {
    setContacts(updated);
    try {
      localStorage.setItem('class_dashboard_school_contacts', JSON.stringify(updated));
    } catch {}
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || (!newNumber.trim() && !newAddress.trim())) return;
    const newC: SchoolInfoContact = {
      id: `c-${Date.now()}`,
      label: newLabel.trim(),
      number: newNumber.trim(),
      ...(newAddress.trim() ? { address: newAddress.trim() } : {}),
    };
    const updated = [...contacts, newC];
    saveContacts(updated);
    setNewLabel('');
    setNewNumber('');
    setNewAddress('');
    setIsAddingContact(false);
    onShowToast?.('📞 새 학교 연락처가 등록되었습니다.');
  };

  const handleStartEditContact = (c: SchoolInfoContact) => {
    setEditingContactId(c.id);
    setEditLabel(c.label);
    setEditNumber(c.number);
    setEditAddress(c.address || '');
  };

  const handleSaveEditContact = (id: string) => {
    if (!editLabel.trim() || (!editNumber.trim() && !editAddress.trim())) {
      onShowToast?.('⚠️ 부서명과 전화번호(또는 주소)를 입력해 주세요.');
      return;
    }
    const updated = contacts.map((c) =>
      c.id === id ? { ...c, label: editLabel.trim(), number: editNumber.trim(), address: editAddress.trim() || undefined } : c
    );
    saveContacts(updated);
    setEditingContactId(null);
    onShowToast?.('✏️ 연락처가 수정되었습니다.');
  };

  const handleDeleteContact = (id: string) => {
    const updated = contacts.filter((c) => c.id !== id);
    saveContacts(updated);
    onShowToast?.('🗑️ 연락처가 삭제되었습니다.');
  };

  const handleCopyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr).then(() => onShowToast?.(`📍 주소가 복사되었습니다.`)).catch(() => onShowToast?.(`주소: ${addr}`));
  };

  const handleCopyNumber = (num: string) => {
    navigator.clipboard.writeText(num).then(() => {
      onShowToast?.(`📋 전화번호(${num})가 클립보드에 복사되었습니다.`);
    }).catch(() => {
      onShowToast?.(`전화번호: ${num}`);
    });
  };

  // ==========================================
  // 2. 구매 쇼핑몰 상태 & 편집 로직
  // ==========================================
  const [malls, setMalls] = useState<ShoppingMallItem[]>(() => {
    try {
      const saved = localStorage.getItem('class_dashboard_shopping_malls');
      if (saved) return JSON.parse(saved);
    } catch {}
    return initialShoppingMalls;
  });

  const [isAddingMall, setIsAddingMall] = useState(false);
  const [newMallName, setNewMallName] = useState('');
  const [newMallUrl, setNewMallUrl] = useState('');
  const [newMallDesc, setNewMallDesc] = useState('');

  // 쇼핑몰 인라인 수정 상태
  const [editingMallId, setEditingMallId] = useState<string | null>(null);
  const [editMallName, setEditMallName] = useState('');
  const [editMallUrl, setEditMallUrl] = useState('');
  const [editMallDesc, setEditMallDesc] = useState('');

  const saveMalls = (updated: ShoppingMallItem[]) => {
    setMalls(updated);
    try {
      localStorage.setItem('class_dashboard_shopping_malls', JSON.stringify(updated));
    } catch {}
  };

  const handleAddMall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMallName.trim() || !newMallUrl.trim()) {
      onShowToast?.('⚠️ 쇼핑몰 명칭과 웹 주소를 입력해 주세요.');
      return;
    }
    let validUrl = newMallUrl.trim();
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl;
    }
    const newM: ShoppingMallItem = {
      id: `m-${Date.now()}`,
      name: newMallName.trim(),
      url: validUrl,
      desc: newMallDesc.trim() || '교구 및 학급 비품 사이트',
    };
    const updated = [...malls, newM];
    saveMalls(updated);
    setNewMallName('');
    setNewMallUrl('');
    setNewMallDesc('');
    setIsAddingMall(false);
    onShowToast?.('🛒 새 쇼핑몰/사이트가 등록되었습니다.');
  };

  const handleStartEditMall = (m: ShoppingMallItem) => {
    setEditingMallId(m.id);
    setEditMallName(m.name);
    setEditMallUrl(m.url);
    setEditMallDesc(m.desc);
  };

  const handleSaveEditMall = (id: string) => {
    if (!editMallName.trim() || !editMallUrl.trim()) {
      onShowToast?.('⚠️ 명칭과 웹 주소를 모두 입력해 주세요.');
      return;
    }
    let validUrl = editMallUrl.trim();
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl;
    }
    const updated = malls.map((m) =>
      m.id === id
        ? {
            ...m,
            name: editMallName.trim(),
            url: validUrl,
            desc: editMallDesc.trim() || m.desc,
          }
        : m
    );
    saveMalls(updated);
    setEditingMallId(null);
    onShowToast?.('✏️ 쇼핑몰 정보가 수정되었습니다.');
  };

  const handleDeleteMall = (id: string) => {
    const updated = malls.filter((m) => m.id !== id);
    saveMalls(updated);
    onShowToast?.('🗑️ 쇼핑몰이 삭제되었습니다.');
  };

  return (
    <section className="w-full h-full p-3 sm:p-3.5 flex flex-col select-none overflow-hidden bg-white/40 dark:bg-[#101a2d]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-[#1e2c44] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-xs">
            <Phone className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900 dark:text-[#f8fafc]">학교 정보 및 내선번호</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:inline">행정실 / 교무실</span>
          </div>
        </div>

        {/* Tab switcher (아이콘 전용 탭 전환 버튼) */}
        <div className="flex bg-slate-100 dark:bg-[#0c1424] p-0.5 rounded-lg border border-transparent dark:border-[#1e2c44]">
          <button
            type="button"
            onClick={() => setActiveTab('contacts')}
            title="교내 업무연락 및 내선번호"
            aria-label="교내 업무연락 및 내선번호"
            className={`p-1.5 rounded-md transition cursor-pointer flex items-center justify-center ${
              activeTab === 'contacts'
                ? 'bg-white dark:bg-[#1e2c44] text-teal-600 dark:text-[#38bdf8] shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('malls')}
            title="자주 찾는 교육몰/쇼핑몰"
            aria-label="자주 찾는 교육몰/쇼핑몰"
            className={`p-1.5 rounded-md transition cursor-pointer flex items-center justify-center ${
              activeTab === 'malls'
                ? 'bg-white dark:bg-[#1e2c44] text-teal-600 dark:text-[#38bdf8] shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pt-3 flex flex-col min-h-0 space-y-2">
        {/* ======================= 주요 연락처 탭 ======================= */}
        {activeTab === 'contacts' ? (
          <div className="space-y-2 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
              <span>교내 직통 내선 및 주요 부서</span>
              <button
                type="button"
                onClick={() => setIsAddingContact((prev) => !prev)}
                className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-0.5 cursor-pointer font-bold"
              >
                <Plus className="w-3 h-3" />
                <span>{isAddingContact ? '닫기' : '연락처 추가'}</span>
              </button>
            </div>

            {/* 신규 연락처 추가 폼 */}
            {isAddingContact && (
              <form onSubmit={handleAddContact} className="p-2.5 bg-teal-50/80 dark:bg-teal-950/40 rounded-xl space-y-2 text-xs border border-teal-200/60 dark:border-teal-800/60 shrink-0">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="부서/담당자 명칭 (예: 행정실 품의담당)"
                  className="w-full px-2.5 py-1 bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-700 rounded-lg outline-none font-bold text-slate-800 dark:text-slate-100 text-xs"
                />
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newNumber}
                    onChange={(e) => setNewNumber(e.target.value)}
                    placeholder="전화번호 / 내선번호 (예: 031-123-4560)"
                    className="flex-1 px-2.5 py-1 bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-700 rounded-lg outline-none font-mono text-xs text-slate-800 dark:text-slate-100"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg cursor-pointer transition text-xs shadow-xs shrink-0"
                  >
                    저장
                  </button>
                </div>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="주소 (선택 · 예: ○○시 ○○로 12)"
                  className="w-full px-2.5 py-1 bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-700 rounded-lg outline-none text-xs text-slate-800 dark:text-slate-100"
                />
              </form>
            )}

            {/* 연락처 리스트 */}
            <div className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar pr-1">
              {contacts.map((c) => (
                <div
                  key={c.id}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c1424] hover:bg-teal-50/50 dark:hover:bg-[#142036] border border-slate-200/60 dark:border-[#1e2c44] transition flex items-center justify-between text-xs group"
                >
                  {editingContactId === c.id ? (
                    <div className="flex-1 flex flex-wrap gap-1.5 items-center">
                      <input
                        type="text"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="w-28 px-2 py-0.5 bg-white dark:bg-slate-900 border border-teal-300 rounded font-bold text-xs"
                      />
                      <input
                        type="text"
                        value={editNumber}
                        onChange={(e) => setEditNumber(e.target.value)}
                        className="flex-1 px-2 py-0.5 bg-white dark:bg-slate-900 border border-teal-300 rounded font-mono text-xs"
                      />
                      <input
                        type="text"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        placeholder="주소 (선택)"
                        className="order-last basis-full px-2 py-0.5 bg-white dark:bg-slate-900 border border-teal-300 rounded text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEditContact(c.id)}
                        className="p-1 bg-teal-600 text-white rounded hover:bg-teal-700 cursor-pointer"
                        title="수정 완료"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingContactId(null)}
                        className="p-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded cursor-pointer"
                        title="취소"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{c.label}</span>
                        </div>
                        {c.address && (
                          <button type="button" onClick={() => handleCopyAddress(c.address!)} title="주소 복사" className="pl-3.5 text-left text-[10.5px] text-slate-500 dark:text-slate-400 hover:text-teal-600 truncate cursor-pointer">
                            📍 {c.address}
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="font-mono text-xs text-teal-700 dark:text-teal-300 font-bold">{c.number}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyNumber(c.number)}
                          title="전화번호 복사"
                          className="p-1 rounded-md text-slate-400 hover:text-teal-600 hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEditContact(c)}
                          title="연락처 수정"
                          className="p-1 rounded-md text-slate-400 hover:text-teal-600 hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteContact(c.id)}
                          title="연락처 삭제"
                          className="p-1 rounded-md text-slate-300 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ======================= 구매 쇼핑몰 탭 ======================= */
          <div className="space-y-2 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
              <span>교구 및 학급 비품 조달 쇼핑몰</span>
              <button
                type="button"
                onClick={() => setIsAddingMall((prev) => !prev)}
                className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-0.5 cursor-pointer font-bold"
              >
                <Plus className="w-3 h-3" />
                <span>{isAddingMall ? '닫기' : '쇼핑몰 추가'}</span>
              </button>
            </div>

            {/* 신규 쇼핑몰 추가 폼 */}
            {isAddingMall && (
              <form onSubmit={handleAddMall} className="p-2.5 bg-teal-50/80 dark:bg-teal-950/40 rounded-xl space-y-2 text-xs border border-teal-200/60 dark:border-teal-800/60 shrink-0">
                <input
                  type="text"
                  value={newMallName}
                  onChange={(e) => setNewMallName(e.target.value)}
                  placeholder="쇼핑몰 명칭 (예: 동아사이언스몰)"
                  className="w-full px-2.5 py-1 bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-700 rounded-lg outline-none font-bold text-slate-800 dark:text-slate-100 text-xs"
                />
                <input
                  type="text"
                  value={newMallUrl}
                  onChange={(e) => setNewMallUrl(e.target.value)}
                  placeholder="웹 주소 URL (예: https://...)"
                  className="w-full px-2.5 py-1 bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-700 rounded-lg outline-none font-mono text-xs text-slate-800 dark:text-slate-100"
                />
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newMallDesc}
                    onChange={(e) => setNewMallDesc(e.target.value)}
                    placeholder="설명 (예: 초등 과학 실험 교구 구매)"
                    className="flex-1 px-2.5 py-1 bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-700 rounded-lg outline-none text-xs text-slate-800 dark:text-slate-100"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg cursor-pointer transition text-xs shadow-xs shrink-0"
                  >
                    저장
                  </button>
                </div>
              </form>
            )}

            {/* 쇼핑몰 리스트 */}
            <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
              {malls.map((m) => (
                <div
                  key={m.id}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c1424] hover:bg-teal-50/60 dark:hover:bg-[#142036] border border-slate-200/60 dark:border-[#1e2c44] transition flex items-center justify-between text-xs group"
                >
                  {editingMallId === m.id ? (
                    <div className="w-full space-y-1.5">
                      <input
                        type="text"
                        value={editMallName}
                        onChange={(e) => setEditMallName(e.target.value)}
                        placeholder="쇼핑몰 명칭"
                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-teal-300 rounded font-bold text-xs"
                      />
                      <input
                        type="text"
                        value={editMallUrl}
                        onChange={(e) => setEditMallUrl(e.target.value)}
                        placeholder="URL"
                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-teal-300 rounded font-mono text-xs"
                      />
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={editMallDesc}
                          onChange={(e) => setEditMallDesc(e.target.value)}
                          placeholder="설명"
                          className="flex-1 px-2 py-1 bg-white dark:bg-slate-900 border border-teal-300 rounded text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditMall(m.id)}
                          className="px-2 py-1 bg-teal-600 text-white rounded font-bold cursor-pointer"
                        >
                          저장
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingMallId(null)}
                          className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded cursor-pointer"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 truncate">
                          <span className="truncate">{m.name}</span>
                          <a
                            href={m.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-teal-600 transition shrink-0"
                            title="새 창에서 열기"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">{m.desc}</p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold px-2 py-1 rounded-lg shrink-0 hover:scale-105 transition"
                        >
                          이동 ➔
                        </a>
                        <button
                          type="button"
                          onClick={() => handleStartEditMall(m)}
                          title="쇼핑몰 정보 수정"
                          className="p-1 rounded-md text-slate-300 hover:text-teal-600 transition cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMall(m.id)}
                          title="쇼핑몰 삭제"
                          className="p-1 rounded-md text-slate-300 hover:text-rose-500 transition cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
        <span>학교 행정 & 교구 구매 바로가기</span>
        <span className="text-teal-600 dark:text-teal-400 font-bold">사용자 편집 가능</span>
      </div>
    </section>
  );
};
