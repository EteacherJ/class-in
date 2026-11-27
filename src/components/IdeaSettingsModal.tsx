import React, { useState, useEffect } from 'react';
import { X, Check, RotateCcw, Plus, Trash2, Sliders, Layers, Sparkles, Tag, Keyboard, Cloud, Clipboard } from 'lucide-react';
import { IdeaSettings, IdeaTag, DEFAULT_IDEA_SETTINGS, DEFAULT_IDEA_TAGS } from '../types';
import { GOOGLE_DRIVE_BACKUP_SCRIPT_CODE } from '../utils/cloudSync';

interface IdeaSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: IdeaSettings;
  onSaveSettings: (settings: IdeaSettings) => void;
  onShowToast?: (msg: string) => void;
}

// 태그 생성 시 선택 가능한 감성 색상 프리셋
const TAG_COLOR_PRESETS = [
  { name: '블루', bg: '#dbeafe', text: '#1e40af' },
  { name: '그린', bg: '#dcfce7', text: '#166534' },
  { name: '옐로우', bg: '#fef3c7', text: '#92400e' },
  { name: '핑크', bg: '#fce7f3', text: '#9d174d' },
  { name: '퍼플', bg: '#f3e8ff', text: '#6b21a8' },
  { name: '오렌지', bg: '#ffedd5', text: '#9a3412' },
  { name: '슬레이트', bg: '#f1f5f9', text: '#334155' },
];

export const IdeaSettingsModal: React.FC<IdeaSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onShowToast,
}) => {
  const [formData, setFormData] = useState<IdeaSettings>(settings);
  const [newTagName, setNewTagName] = useState('');
  const [selectedTagColor, setSelectedTagColor] = useState(TAG_COLOR_PRESETS[0]);

  useEffect(() => {
    if (isOpen) {
      setFormData(settings);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  // 태그 추가
  const handleAddTag = () => {
    if (!newTagName.trim()) {
      onShowToast?.('⚠️ 태그 이름을 입력해주세요.');
      return;
    }
    const newTag: IdeaTag = {
      id: `tag_${Date.now()}`,
      name: newTagName.trim(),
      color_code: selectedTagColor.bg,
      text_color: selectedTagColor.text,
    };
    setFormData((prev) => ({
      ...prev,
      tags: [...prev.tags, newTag],
    }));
    setNewTagName('');
    onShowToast?.(`🏷️ [${newTag.name}] 태그가 추가되었습니다.`);
  };

  // 태그 삭제
  const handleDeleteTag = (tagId: string) => {
    if (formData.tags.length <= 1) {
      onShowToast?.('⚠️ 최소 1개 이상의 태그가 필요합니다.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t.id !== tagId),
    }));
  };

  // 설정 저장
  const handleSave = () => {
    onSaveSettings(formData);
    onShowToast?.('⚙️ 아이디어 노트 설정이 저장되었습니다.');
    onClose();
  };

  // 기본값으로 초기화
  const handleResetToDefault = () => {
    if (window.confirm('아이디어 노트 설정을 초기 기본값으로 되돌리시겠습니까?')) {
      setFormData(DEFAULT_IDEA_SETTINGS);
      onShowToast?.('🔄 설정이 기본값으로 초기화되었습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">아이디어 노트 설정</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">보기 모드, 스택 깊이, 단축키 및 분류 태그 관리</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 바디 스크롤 영역 */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* 1. 기본 보기 모드 */}
          <div className="space-y-2">
            <label className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-500" /> 기본 보기 모드
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, view_mode: 'stack' }))}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-center transition-all ${
                  formData.view_mode === 'stack'
                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold ring-2 ring-indigo-500/30'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className="text-lg">🎴</span>
                <span className="text-xs">카드 스택(넘기기)</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, view_mode: 'list' }))}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-center transition-all ${
                  formData.view_mode === 'list'
                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold ring-2 ring-indigo-500/30'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className="text-lg">📋</span>
                <span className="text-xs">리스트 목록 보기</span>
              </button>
            </div>
          </div>

          {/* 2. 스택 깊이 설정 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" /> 스택 중첩 깊이 (3 ~ 10장)
              </label>
              <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-full">
                {formData.stack_depth}장
              </span>
            </div>
            <input
              type="range"
              min={3}
              max={10}
              step={1}
              value={formData.stack_depth}
              onChange={(e) => setFormData((prev) => ({ ...prev, stack_depth: parseInt(e.target.value, 10) }))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <p className="text-xs text-slate-400">스택 모드에서 한 번에 겹쳐서 입체감 있게 보여줄 최대 카드 수입니다.</p>
          </div>

          {/* 3. 단축키 및 동작 옵션 */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Keyboard className="w-4 h-4 text-emerald-500" /> 빠른 기록 글로벌 단축키
              </label>
              <input
                type="text"
                value={formData.shortcut_key}
                onChange={(e) => setFormData((prev) => ({ ...prev, shortcut_key: e.target.value }))}
                placeholder="Alt+N"
                className="w-24 px-2 py-1 text-center font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
              />
            </div>

            {/* 클립보드 자동 감지 */}
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">클립보드 이미지 자동 감지</span>
                <span className="text-[11px] text-slate-400 block">새 기록창 열림 시 복사된 캡처 이미지를 즉시 첨부</span>
              </div>
              <input
                type="checkbox"
                checked={formData.auto_clipboard_detect}
                onChange={(e) => setFormData((prev) => ({ ...prev, auto_clipboard_detect: e.target.checked }))}
                className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
              />
            </label>

            {/* 저장 후 창 닫기 */}
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">저장 후 기록창 자동 닫기</span>
                <span className="text-[11px] text-slate-400 block">기록 저장 성공 시 모달 창을 자동으로 닫습니다</span>
              </div>
              <input
                type="checkbox"
                checked={formData.close_on_save}
                onChange={(e) => setFormData((prev) => ({ ...prev, close_on_save: e.target.checked }))}
                className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
              />
            </label>

            {/* 클라우드 동기화 */}
            <div className="space-y-2">
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-sky-500" />
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">구글 드라이브 백업 동기화</span>
                    <span className="text-[11px] text-slate-400 block">전체 시스템 백업 JSON에 아이디어 노트를 포함합니다</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.sync_cloud}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sync_cloud: e.target.checked }))}
                  className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                />
              </label>

              {/* 구글 드라이브 백업 스크립트 안내 접이식 아코디언 */}
              <details className="p-3 bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/80 dark:border-sky-800/60 rounded-xl text-xs space-y-2 group">
                <summary className="font-bold text-sky-800 dark:text-sky-300 cursor-pointer flex items-center justify-between select-none">
                  <span className="flex items-center gap-1.5">
                    <span>💡 [구글 드라이브 백업 스크립트 안내]</span>
                    <span className="text-[10px] bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 px-1.5 py-0.2 rounded font-normal">클릭하여 펼치기</span>
                  </span>
                  <span className="text-slate-400 group-open:rotate-180 transition">▼</span>
                </summary>

                <div className="pt-2 text-slate-700 dark:text-slate-300 space-y-2 leading-relaxed text-[11px] border-t border-sky-200/40 mt-1">
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    선생님의 개인 구글 드라이브에 <strong>'Class in Backup'</strong> 폴더를 만들고 날짜별 백업 파일을 자동 저장하는 Google Apps Script입니다.
                  </p>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-[10.5px]">📋 Apps Script 복사용 코드:</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(GOOGLE_DRIVE_BACKUP_SCRIPT_CODE);
                        onShowToast?.('📋 구글 드라이브 백업 Apps Script 코드가 클립보드에 복사되었습니다!');
                      }}
                      className="px-2 py-0.5 bg-sky-600 hover:bg-sky-700 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                    >
                      <Clipboard className="w-3 h-3" />
                      <span>코드 복사</span>
                    </button>
                  </div>
                  <pre className="p-2.5 bg-slate-900 text-slate-100 rounded-lg font-mono text-[10px] leading-relaxed overflow-x-auto select-all border border-slate-800 max-h-40 custom-scroll">
                    <code>{GOOGLE_DRIVE_BACKUP_SCRIPT_CODE}</code>
                  </pre>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    💡 배포 방법: 구글 드라이브 ➔ 새 Google Apps Script 생성 ➔ 코드 붙여넣기 ➔ [새 배포] ➔ 웹 앱(모든 사용자 권한) ➔ 발급된 URL을 메인 환경설정(5단계)에 등록하면 안전하게 자동 백업됩니다.
                  </p>
                </div>
              </details>
            </div>
          </div>

          {/* 4. 태그 관리 */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-rose-500" /> 분류 태그 관리
            </label>

            {/* 현재 등록된 태그 칩 목록 */}
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <div
                  key={tag.id}
                  style={{ backgroundColor: tag.color_code, color: tag.text_color }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm border border-black/5"
                >
                  <span>{tag.name}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteTag(tag.id)}
                    className="hover:opacity-75 transition-opacity"
                    title="태그 삭제"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* 새 태그 추가 폼 */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="새 태그 이름 입력..."
                  className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> 추가
                </button>
              </div>

              {/* 태그 컬러 프리셋 선택 */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-slate-400">색상:</span>
                <div className="flex items-center gap-1.5">
                  {TAG_COLOR_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedTagColor(preset)}
                      style={{ backgroundColor: preset.bg, borderColor: preset.text }}
                      className={`w-5 h-5 rounded-full border transition-all ${
                        selectedTagColor.bg === preset.bg ? 'ring-2 ring-indigo-500 scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      title={preset.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> 기본값 복원
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all active:scale-95"
            >
              <Check className="w-4 h-4" /> 설정 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
