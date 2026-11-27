import React, { useState } from 'react';
import {
  CalendarDays,
  Plus,
  Trash2,
  Bell,
  BellRing,
  ArrowDown,
  ArrowUp,
  Pin,
  Palette,
  Check,
} from 'lucide-react';
import { DDayItem, DDayAlertOffset, DDayCategory } from '../types';
import { initialDDays } from '../data/mealAndDDayData';
import { getDayTypeInfo } from '../utils/koreanHolidays';

interface DDayWidgetProps {
  onShowToast: (msg: string) => void;
}

// 🏷️ D-Day 구분 카테고리 (11개) 및 기본 매핑 색상
export const DDAY_CATEGORIES: { name: DDayCategory; defaultColor: string; icon: string }[] = [
  { name: '개인', defaultColor: 'indigo', icon: '👤' },
  { name: '가족', defaultColor: 'amber', icon: '👨‍👩‍👧‍👦' },
  { name: '학교', defaultColor: 'emerald', icon: '🏫' },
  { name: '기념일', defaultColor: 'rose', icon: '🎉' },
  { name: '여행', defaultColor: 'sky', icon: '✈️' },
  { name: '휴가', defaultColor: 'teal', icon: '🏖️' },
  { name: '시험', defaultColor: 'purple', icon: '📝' },
  { name: '자격증', defaultColor: 'blue', icon: '📜' },
  { name: '운동', defaultColor: 'orange', icon: '🏃' },
  { name: '재테크', defaultColor: 'yellow', icon: '💰' },
  { name: '기타', defaultColor: 'slate', icon: '📌' },
];

// 🎨 D-Day 테마 프리셋 컬러 팔레트
export const DDAY_COLOR_PRESETS: { id: string; name: string; bgClass: string; hex: string }[] = [
  { id: 'rose', name: '로즈 핑크', bgClass: 'bg-rose-500', hex: '#f43f5e' },
  { id: 'amber', name: '앰버 오렌지', bgClass: 'bg-amber-500', hex: '#f59e0b' },
  { id: 'emerald', name: '에메랄드 그린', bgClass: 'bg-emerald-500', hex: '#10b981' },
  { id: 'teal', name: '청록 틸', bgClass: 'bg-teal-500', hex: '#14b8a6' },
  { id: 'sky', name: '스카이 블루', bgClass: 'bg-sky-500', hex: '#0ea5e9' },
  { id: 'indigo', name: '인디고 블루', bgClass: 'bg-indigo-500', hex: '#6366f1' },
  { id: 'purple', name: '바이올렛 퍼플', bgClass: 'bg-purple-500', hex: '#a855f7' },
  { id: 'blue', name: '로열 블루', bgClass: 'bg-blue-600', hex: '#2563eb' },
  { id: 'orange', name: '비비드 오렌지', bgClass: 'bg-orange-500', hex: '#f97316' },
  { id: 'yellow', name: '골드 옐로우', bgClass: 'bg-amber-400', hex: '#fbbf24' },
  { id: 'slate', name: '모던 슬레이트', bgClass: 'bg-slate-600', hex: '#475569' },
];

export const DDayWidget: React.FC<DDayWidgetProps> = ({ onShowToast }) => {
  const [ddayList, setDdayList] = useState<DDayItem[]>(() => {
    try {
      const saved = localStorage.getItem('class_dday_items');
      if (saved) return JSON.parse(saved);
    } catch {}
    return initialDDays;
  });

  const [pinnedHeaderId, setPinnedHeaderId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('class_dday_pinned_id') || null;
    } catch {
      return null;
    }
  });

  const handleTogglePinHeader = (id: string, title: string) => {
    const nextId = pinnedHeaderId === id ? null : id;
    setPinnedHeaderId(nextId);
    try {
      if (nextId) {
        localStorage.setItem('class_dday_pinned_id', nextId);
        window.dispatchEvent(new Event('dday_pinned_changed'));
        onShowToast(`📌 [${title}] 일정이 상단 헤더에 고정되었습니다!`);
      } else {
        localStorage.removeItem('class_dday_pinned_id');
        window.dispatchEvent(new Event('dday_pinned_changed'));
        onShowToast(`📌 헤더 고정이 해제되었습니다 (가장 가까운 D-Day가 자동 표시됩니다).`);
      }
    } catch {}
  };

  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDate, setNewDate] = useState<string>('2026-10-02');
  const [newCategory, setNewCategory] = useState<DDayCategory>('개인');
  const [newColor, setNewColor] = useState<string>('indigo');
  const [newNote, setNewNote] = useState<string>('');
  const [newAlerts, setNewAlerts] = useState<DDayAlertOffset[]>(['1d', 'day_of', '1h', '30m']);

  // 최신순 ('desc') 또는 오래된순 ('asc') 정렬 상태
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // 카테고리 변경 시 기본 색상으로 우선 매핑
  const handleCategoryChange = (categoryName: DDayCategory) => {
    setNewCategory(categoryName);
    const catConfig = DDAY_CATEGORIES.find((c) => c.name === categoryName);
    if (catConfig) {
      setNewColor(catConfig.defaultColor);
    }
  };

  // Save to localStorage
  const saveDDays = (updated: DDayItem[]) => {
    setDdayList(updated);
    localStorage.setItem('class_dday_items', JSON.stringify(updated));
  };

  // Calculate days left and status
  const calculateDDay = (targetDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(targetDateStr);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { label: 'D-DAY', diff: 0, status: 'today' };
    if (diffDays > 0) return { label: `D-${diffDays}`, diff: diffDays, status: 'future' };
    return { label: `D+${Math.abs(diffDays)}`, diff: diffDays, status: 'past' };
  };

  // Toggle alert offset
  const toggleAlert = (offset: DDayAlertOffset) => {
    if (newAlerts.includes(offset)) {
      setNewAlerts(newAlerts.filter((a) => a !== offset));
    } else {
      setNewAlerts([...newAlerts, offset]);
    }
  };

  // Handle create
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: DDayItem = {
      id: `dday-${Date.now()}`,
      title: newTitle.trim(),
      targetDate: newDate,
      category: newCategory,
      color: newColor,
      notifications: newAlerts,
      note: newNote.trim() || undefined,
    };

    const updated = [newItem, ...ddayList];
    saveDDays(updated);
    setIsAdding(false);
    setNewTitle('');
    setNewNote('');
    onShowToast(`🎯 D-Day [${newItem.title}] (${newItem.category}) 일정이 성공적으로 등록되었습니다!`);
  };

  // Handle delete
  const handleDelete = (id: string) => {
    const item = ddayList.find((d) => d.id === id);
    const updated = ddayList.filter((d) => d.id !== id);
    saveDDays(updated);
    onShowToast(`🗑️ [${item?.title || 'D-Day'}] 항목이 삭제되었습니다.`);
  };

  // Sort: 최신순(desc) 또는 오래된순(asc) 정렬
  const sortedList = [...ddayList].sort((a, b) => {
    const timeA = new Date(a.targetDate).getTime();
    const timeB = new Date(b.targetDate).getTime();
    if (sortOrder === 'desc') {
      if (timeB !== timeA) return timeB - timeA;
      return b.id.localeCompare(a.id);
    } else {
      if (timeA !== timeB) return timeA - timeB;
      return a.id.localeCompare(b.id);
    }
  });

  // 🎨 뱃지 색상 및 스타일 반환 (HEX 코드 및 프리셋 완벽 지원)
  const getBadgeStyle = (color: string) => {
    if (color.startsWith('#')) {
      return {
        style: { backgroundColor: color, color: '#ffffff' },
        className: 'font-black shadow-2xs',
      };
    }
    const preset = DDAY_COLOR_PRESETS.find((p) => p.id === color);
    if (preset) {
      return {
        style: {},
        className: `${preset.bgClass} ${color === 'yellow' ? 'text-slate-900 font-black' : 'text-white font-black'} shadow-2xs`,
      };
    }
    return {
      style: {},
      className: 'bg-sky-500 text-white font-black shadow-2xs',
    };
  };

  // 카테고리 대표 색상 HEX 코드 반환 (인디케이터 도트용)
  const getCategoryColorHex = (color: string) => {
    if (color.startsWith('#')) return color;
    const preset = DDAY_COLOR_PRESETS.find((p) => p.id === color);
    return preset ? preset.hex : '#0ea5e9';
  };

  return (
    <section className="w-full h-full p-3 sm:p-3.5 flex flex-col justify-between text-slate-800 dark:text-slate-100">
      {/* 1. Header */}
      <div>
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-xs">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                  D-day
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-bold">
                  {sortedList.length}개
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                주요 행사 & 평가 & 마감 알림
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 글자와 방향아이콘을 활용한 정렬 토글 */}
            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              className="text-[11px] font-bold text-slate-500 hover:text-rose-600 flex items-center gap-0.5 cursor-pointer transition select-none"
              title={sortOrder === 'desc' ? '현재: 최신순 (클릭 시 오래된순 정렬)' : '현재: 오래된순 (클릭 시 최신순 정렬)'}
            >
              <span>{sortOrder === 'desc' ? '최신순' : '오래된순'}</span>
              {sortOrder === 'desc' ? (
                <ArrowDown className="w-3 h-3 text-rose-500" />
              ) : (
                <ArrowUp className="w-3 h-3 text-rose-500" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsAdding(!isAdding)}
              className="px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-rose-200 dark:border-rose-800"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAdding ? '닫기' : '추가'}</span>
            </button>
          </div>
        </div>

        {/* 2. Add Form (11개 카테고리 및 사용자 지정 색상 팔레트 완벽 지원) */}
        {isAdding && (
          <form
            onSubmit={handleAddSubmit}
            className="mt-2.5 p-3 bg-rose-50/70 dark:bg-slate-800/80 rounded-2xl border border-rose-200 dark:border-slate-700 space-y-2.5 text-xs animate-fade-in"
          >
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                D-Day 제목
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="예: 2학기 현장체험학습, 학부모 공개수업"
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  목표 날짜
                </label>
                <input
                  type="date" min="2000-01-01" max="2099-12-31"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  구분 카테고리
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => handleCategoryChange(e.target.value as DDayCategory)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold cursor-pointer"
                >
                  {DDAY_CATEGORIES.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 🎨 카테고리 색상 사용자 지정 영역 */}
            <div className="p-2 bg-white/70 dark:bg-slate-900/60 rounded-xl border border-rose-100 dark:border-slate-700/60">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5 text-rose-500" />
                  <span>카테고리 색상 지정</span>
                </span>
                {/* 실시간 미리보기 */}
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                  <span>미리보기:</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[9.5px] font-black text-white"
                    style={{ backgroundColor: getCategoryColorHex(newColor) }}
                  >
                    D-Day
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: getCategoryColorHex(newColor) }}
                    />
                    <span>{newCategory}</span>
                  </span>
                </div>
              </div>

              {/* 프리셋 컬러 칩 + 커스텀 컬러 피커 */}
              <div className="flex flex-wrap items-center gap-1.5">
                {DDAY_COLOR_PRESETS.map((preset) => {
                  const isSelected = newColor === preset.id || newColor === preset.hex;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setNewColor(preset.id)}
                      title={`${preset.name} (${preset.id})`}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition cursor-pointer relative shadow-2xs ${
                        preset.bgClass
                      } ${
                        isSelected
                          ? 'ring-2 ring-offset-1 ring-slate-900 dark:ring-white scale-110'
                          : 'opacity-80 hover:opacity-100 hover:scale-105'
                      }`}
                    >
                      {isSelected && (
                        <Check
                          className={`w-3.5 h-3.5 ${
                            preset.id === 'yellow' ? 'text-slate-900' : 'text-white'
                          } stroke-[3]`}
                        />
                      )}
                    </button>
                  );
                })}

                {/* 직접 색상 선택 커스텀 컬러 피커 */}
                <label
                  className="relative flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-tr from-pink-500 via-amber-400 to-sky-400 p-[1px] cursor-pointer hover:scale-105 transition shadow-2xs"
                  title="원하는 색상 직접 선택 (컬러 피커)"
                >
                  <span className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-[10px]">
                    🎨
                  </span>
                  <input
                    type="color"
                    value={newColor.startsWith('#') ? newColor : getCategoryColorHex(newColor)}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Notification Offsets: 1일전, 하루전, 1시간전, 30분전 */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                <BellRing className="w-3.5 h-3.5 text-rose-500" />
                <span>알림 사전 안내 옵션 선택 (복수 선택 가능)</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { key: '1d' as DDayAlertOffset, label: '1일 전' },
                  { key: 'day_of' as DDayAlertOffset, label: '하루 전(당일)' },
                  { key: '1h' as DDayAlertOffset, label: '1시간 전' },
                  { key: '30m' as DDayAlertOffset, label: '30분 전' },
                ].map((item) => {
                  const isChecked = newAlerts.includes(item.key);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => toggleAlert(item.key)}
                      className={`py-1 rounded-lg font-bold text-[10px] transition cursor-pointer border ${
                        isChecked
                          ? 'bg-rose-500 text-white border-rose-500 shadow-2xs'
                          : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {item.label} {isChecked ? '✓' : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                준비물 또는 메모 (선택)
              </label>
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="예: 도시락 지참, 교실 환기"
                className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium"
              />
            </div>

            <div className="flex justify-end gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-xs cursor-pointer"
              >
                등록하기
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 3. D-Day Multi-Items List */}
      <div className="my-2 flex-1 min-h-0 overflow-y-auto custom-scroll pr-1 space-y-1.5">
        {sortedList.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs font-medium">
            등록된 D-Day 항목이 없습니다. 상단의 [+ 추가]를 눌러보세요.
          </div>
        ) : (
          sortedList.map((d) => {
            const calc = calculateDDay(d.targetDate);
            const isToday = calc.status === 'today';
            const isPast = calc.status === 'past';
            const badgeStyle = getBadgeStyle(d.color);

            // 📅 날짜 속성(주말, 공휴일, 재량휴업일) 판독
            const dayType = getDayTypeInfo(d.targetDate);
            const isDiscretionary =
              dayType.type === 'discretionary' ||
              d.title.includes('재량휴업') ||
              d.category === '재량휴업' ||
              (d.note && d.note.includes('재량휴업'));

            const statusLabel = isDiscretionary
              ? '재량휴업일'
              : dayType.type === 'holiday'
              ? `휴일 (${dayType.holidayName})`
              : dayType.type === 'weekend'
              ? '주말'
              : null;

            return (
              <div
                key={d.id}
                className={`p-2.5 rounded-2xl border transition flex items-center justify-between gap-2 backdrop-blur-xs ${
                  isToday
                    ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 ring-2 ring-rose-400/40 shadow-xs'
                    : isPast
                    ? 'bg-white/40 dark:bg-[#0c1424]/80 border-slate-200/60 dark:border-[#1e2c44]'
                    : 'bg-white/60 dark:bg-[#0c1424]/80 border-slate-200/70 dark:border-[#1e2c44] shadow-2xs hover:border-rose-300'
                }`}
              >
                {/* Left: Badge & Info */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div
                    style={isToday || isPast ? undefined : badgeStyle.style}
                    className={`w-14 h-9 rounded-xl flex items-center justify-center font-black font-mono text-xs shrink-0 shadow-2xs ${
                      isToday
                        ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white animate-pulse'
                        : isPast
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-200 border border-transparent dark:border-slate-700'
                        : badgeStyle.className
                    }`}
                  >
                    {calc.label}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-[#142036] text-slate-600 dark:text-slate-300 border border-transparent dark:border-[#1e2c44] flex items-center gap-1">
                        <span
                          className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
                          style={{ backgroundColor: getCategoryColorHex(d.color) }}
                        />
                        <span>{d.category}</span>
                      </span>

                      {/* 🏷️ 날짜 속성 판독 뱃지 (주말, 공휴일, 재량휴업일) */}
                      {statusLabel && (
                        <span
                          className={`text-[9.5px] font-black px-1.5 py-0.2 rounded-md border flex items-center gap-0.5 shadow-2xs ${
                            isDiscretionary
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/40'
                              : dayType.type === 'holiday'
                              ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-400/40'
                              : 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-400/40'
                          }`}
                        >
                          <span>{statusLabel}</span>
                        </span>
                      )}

                      <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                        {d.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono">
                      <span>{d.targetDate}</span>
                      {d.notifications && d.notifications.length > 0 && (
                        <span className="flex items-center gap-0.5 text-rose-500 dark:text-rose-400 font-sans">
                          <Bell className="w-2.5 h-2.5" />
                          <span>
                            {d.notifications
                              .map((n) =>
                                n === '1d'
                                   ? '1일전'
                                  : n === 'day_of'
                                  ? '당일'
                                  : n === '1h'
                                  ? '1시간전'
                                  : '30분전'
                              )
                              .join(', ')}
                          </span>
                        </span>
                      )}
                    </div>

                    {d.note && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {d.note}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Actions (Pin to Header + Delete) */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleTogglePinHeader(d.id, d.title)}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      pinnedHeaderId === d.id
                        ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 font-bold'
                        : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                    }`}
                    title={pinnedHeaderId === d.id ? '상단 헤더 고정 해제' : '상단 헤더에 고정하기'}
                  >
                    <Pin className={`w-3.5 h-3.5 ${pinnedHeaderId === d.id ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(d.id)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer"
                    title="D-Day 항목 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Footer */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          <span>사전 알림(1일전/하루전/1시간전/30분전) 활성화됨</span>
        </span>
        <span className="font-mono">실시간 D-Day 계산</span>
      </div>
    </section>
  );
};

