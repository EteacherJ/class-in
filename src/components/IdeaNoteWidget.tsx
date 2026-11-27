import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Settings,
  ChevronLeft,
  ChevronRight,
  Layers,
  List as ListIcon,
  Trash2,
  Edit3,
  Image as ImageIcon,
  CheckCircle2,
  ExternalLink,
  X,
  Pencil,
  ArrowUp,
  ArrowDown,
  Check,
} from 'lucide-react';
import { IdeaItem, IdeaSettings, IdeaTag, IDEA_PASTEL_COLORS } from '../types';

/**
 * ============================================================================
 * 💡 아이디어 노트 위젯 (위젯 안에 바로 보이는 노트)
 * ============================================================================
 * - 카드 속 카드(겹친 스택) 대신, 위젯 자체가 한 장의 메모처럼 보입니다. 왼쪽 색 띠 = 메모 색.
 * - 상단 분류는 ✏️ 를 눌러 바로 추가 · 이름 바꾸기 · 색 바꾸기 · 순서 바꾸기 · 삭제할 수 있어요.
 *   (삭제한 분류의 아이디어는 첫 번째 분류로 옮겨집니다)
 */

export interface IdeaNoteWidgetProps {
  ideas: IdeaItem[];
  settings: IdeaSettings;
  onOpenRecordModal: (item?: IdeaItem | null) => void;
  onOpenSettingsModal: () => void;
  onUpdateIdeas: (ideas: IdeaItem[]) => void;
  /** 분류 편집 저장 */
  onUpdateSettings?: (settings: IdeaSettings) => void;
  onShowToast?: (msg: string) => void;
}

const TAG_PALETTE: Array<{ bg: string; text: string }> = [
  { bg: '#dbeafe', text: '#1e40af' },
  { bg: '#dcfce7', text: '#166534' },
  { bg: '#fef9c3', text: '#854d0e' },
  { bg: '#fce7f3', text: '#9d174d' },
  { bg: '#f3e8ff', text: '#6b21a8' },
  { bg: '#ffedd5', text: '#9a3412' },
  { bg: '#ccfbf1', text: '#115e59' },
  { bg: '#f1f5f9', text: '#334155' },
];

export const IdeaNoteWidget: React.FC<IdeaNoteWidgetProps> = ({
  ideas,
  settings,
  onOpenRecordModal,
  onOpenSettingsModal,
  onUpdateIdeas,
  onUpdateSettings,
  onShowToast,
}) => {
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('ALL');
  const [index, setIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'stack' | 'list'>(settings.view_mode || 'stack');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [editingTags, setEditingTags] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [flip, setFlip] = useState<'next' | 'prev' | null>(null);

  const tags = settings.tags || [];
  const filteredIdeas = useMemo(
    () => ideas.filter((item) => selectedTagFilter === 'ALL' || item.tag?.id === selectedTagFilter),
    [ideas, selectedTagFilter]
  );
  const safeIndex = Math.min(Math.max(0, index), Math.max(0, filteredIdeas.length - 1));
  const current = filteredIdeas[safeIndex];

  useEffect(() => {
    if (selectedTagFilter !== 'ALL' && !tags.some((t) => t.id === selectedTagFilter)) setSelectedTagFilter('ALL');
  }, [tags, selectedTagFilter]);

  const go = (dir: 'next' | 'prev') => {
    if (filteredIdeas.length < 2) return;
    setFlip(dir);
    setIndex((p) => (dir === 'next' ? (p + 1) % filteredIdeas.length : (p - 1 + filteredIdeas.length) % filteredIdeas.length));
    window.setTimeout(() => setFlip(null), 320);
  };

  const handleDeleteIdea = (ideaId: string, title: string) => {
    if (!window.confirm(`'${title}' 아이디어를 삭제하시겠습니까?`)) return;
    const next = ideas.filter((item) => item.idea_id !== ideaId);
    onUpdateIdeas(next);
    onShowToast?.('🗑️ 아이디어가 삭제되었습니다.');
    if (index >= next.length) setIndex(Math.max(0, next.length - 1));
  };
  const handleToggleArchive = (ideaId: string) =>
    onUpdateIdeas(ideas.map((item) => (item.idea_id === ideaId ? { ...item, is_archived: !item.is_archived } : item)));

  const colorOf = (id: string) => IDEA_PASTEL_COLORS.find((c) => c.id === id) || IDEA_PASTEL_COLORS[0];
  const dateOf = (iso: string, long = false) =>
    new Date(iso).toLocaleDateString('ko-KR', long ? { year: 'numeric', month: 'short', day: 'numeric' } : { month: 'numeric', day: 'numeric' });

  // ── 분류 편집 ──────────────────────────────────────────────────────────
  const saveTags = (nextTags: IdeaTag[], ideaMap?: (it: IdeaItem) => IdeaItem) => {
    onUpdateSettings?.({ ...settings, tags: nextTags });
    // 아이디어에 들어 있는 분류 정보도 함께 맞춤
    const byId = new Map(nextTags.map((t) => [t.id, t]));
    const fixed = ideas.map((it) => {
      const m = ideaMap ? ideaMap(it) : it;
      const t = m.tag && byId.get(m.tag.id);
      return t && (t.name !== m.tag.name || t.color_code !== m.tag.color_code || t.text_color !== m.tag.text_color) ? { ...m, tag: t } : m;
    });
    if (fixed.some((f, i) => f !== ideas[i])) onUpdateIdeas(fixed);
  };
  const updateTag = (id: string, patch: Partial<IdeaTag>) => saveTags(tags.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const moveTag = (id: string, dir: -1 | 1) => {
    const i = tags.findIndex((t) => t.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= tags.length) return;
    const next = [...tags];
    [next[i], next[j]] = [next[j], next[i]];
    saveTags(next);
  };
  const deleteTag = (id: string) => {
    if (tags.length <= 1) {
      onShowToast?.('⚠️ 분류는 하나 이상 있어야 해요.');
      return;
    }
    const t = tags.find((x) => x.id === id);
    const used = ideas.filter((it) => it.tag?.id === id).length;
    const rest = tags.filter((x) => x.id !== id);
    if (used && !window.confirm(`'${t?.name}' 분류의 아이디어 ${used}개를 '${rest[0].name}'(으)로 옮기고 분류를 지울까요?`)) return;
    saveTags(rest, (it) => (it.tag?.id === id ? { ...it, tag: rest[0] } : it));
  };
  const addTag = () => {
    const name = newTagName.trim();
    if (!name) return;
    if (tags.some((t) => t.name === name)) {
      onShowToast?.('⚠️ 같은 이름의 분류가 이미 있어요.');
      return;
    }
    const pal = TAG_PALETTE[tags.length % TAG_PALETTE.length];
    saveTags([...tags, { id: `tag_${Date.now()}`, name: name.slice(0, 12), color_code: pal.bg, text_color: pal.text }]);
    setNewTagName('');
  };

  const Chip: React.FC<{ active: boolean; onClick: () => void; style?: React.CSSProperties; children: React.ReactNode }> = ({ active, onClick, style, children }) => (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={`px-2.5 py-1 text-[11px] font-bold rounded-full transition-all shrink-0 border ${
        active ? 'shadow-sm ring-1 ring-black/5 scale-[1.03]' : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="idea-note flex flex-col h-full w-full select-none text-slate-800 dark:text-slate-100 relative">
      {/* 1. 상단: 분류 · 보기 · 설정 · 기록 */}
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-2 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
          <Chip
            active={selectedTagFilter === 'ALL'}
            onClick={() => {
              setSelectedTagFilter('ALL');
              setIndex(0);
            }}
            style={selectedTagFilter === 'ALL' ? { background: '#1e293b', color: '#fff', borderColor: '#1e293b' } : undefined}
          >
            전체 {ideas.length}
          </Chip>
          {tags.map((tag) => {
            const count = ideas.filter((item) => item.tag?.id === tag.id).length;
            const on = selectedTagFilter === tag.id;
            return (
              <Chip
                key={tag.id}
                active={on}
                onClick={() => {
                  setSelectedTagFilter(tag.id);
                  setIndex(0);
                }}
                style={on ? { background: tag.color_code, color: tag.text_color, borderColor: tag.color_code } : { borderColor: 'transparent' }}
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ background: tag.text_color }} />
                {tag.name} {count}
              </Chip>
            );
          })}
          <button
            type="button"
            onClick={() => setEditingTags((v) => !v)}
            className={`p-1 rounded-full shrink-0 transition ${editingTags ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            title="분류 편집 (추가 · 이름 · 색 · 순서 · 삭제)"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode((p) => (p === 'stack' ? 'list' : 'stack'))}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={viewMode === 'stack' ? '목록으로 보기' : '한 장씩 보기'}
          >
            {viewMode === 'stack' ? <ListIcon className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onOpenSettingsModal}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="아이디어 노트 설정"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onOpenRecordModal(null)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-full shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">기록</span>
          </button>
        </div>
      </div>

      {/* 분류 편집 패널 */}
      {editingTags && (
        <div className="mx-3 mb-2 p-2.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 space-y-1.5 text-xs animate-fade-in shrink-0 max-h-[55%] overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="font-black text-slate-700 dark:text-slate-200 text-[11px]">🏷️ 분류 편집</span>
            <button type="button" onClick={() => setEditingTags(false)} className="text-[11px] font-bold text-indigo-600 flex items-center gap-0.5">
              <Check className="w-3.5 h-3.5" /> 완료
            </button>
          </div>
          {tags.map((t, i) => (
            <div key={t.id} className="flex items-center gap-1.5">
              <div className="flex gap-0.5 shrink-0">
                {TAG_PALETTE.map((p) => (
                  <button
                    key={p.bg}
                    type="button"
                    onClick={() => updateTag(t.id, { color_code: p.bg, text_color: p.text })}
                    className={`w-3.5 h-3.5 rounded-full border ${t.color_code === p.bg ? 'ring-2 ring-offset-1 ring-indigo-400' : ''}`}
                    style={{ background: p.bg, borderColor: p.text }}
                    title="색 바꾸기"
                  />
                ))}
              </div>
              <input
                defaultValue={t.name}
                maxLength={12}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== t.name) updateTag(t.id, { name: v });
                  else e.target.value = t.name;
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                className="flex-1 min-w-0 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold"
                style={{ color: t.text_color }}
              />
              <button type="button" disabled={i === 0} onClick={() => moveTag(t.id, -1)} className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30" title="앞으로">
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button type="button" disabled={i === tags.length - 1} onClick={() => moveTag(t.id, 1)} className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30" title="뒤로">
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => deleteTag(t.id)} className="p-0.5 text-slate-400 hover:text-rose-600" title="분류 삭제">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addTag();
            }}
            className="flex items-center gap-1.5 pt-1"
          >
            <input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="새 분류 이름 (예: 학부모 상담)"
              maxLength={12}
              className="flex-1 min-w-0 px-2 py-1 rounded-lg border border-dashed border-indigo-300 bg-white dark:bg-slate-900 font-bold"
            />
            <button type="submit" className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-black flex items-center gap-0.5">
              <Plus className="w-3 h-3" /> 추가
            </button>
          </form>
        </div>
      )}

      {/* 2. 본문 */}
      <div className="flex-1 min-h-0 flex flex-col relative">
        {filteredIdeas.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-2">
            <div className="text-3xl animate-bounce">💡</div>
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {selectedTagFilter === 'ALL' ? '아직 기록된 아이디어가 없어요' : '이 분류에는 아직 아이디어가 없어요'}
            </h3>
            <p className="text-[11px] text-slate-400">수업·학생 지도·업무 중 떠오른 생각을 바로 적어 두세요!</p>
            <button
              type="button"
              onClick={() => onOpenRecordModal(null)}
              className="mt-1 flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 rounded-full transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> 첫 아이디어 적기
            </button>
          </div>
        ) : viewMode === 'stack' && current ? (
          (() => {
            const c = colorOf(current.color_label);
            return (
              <>
                {/* 위젯 안에 바로 보이는 한 장의 메모 (테두리·그림자 없음) */}
                <div
                  key={current.idea_id}
                  className={`idea-sheet flex-1 min-h-0 mx-3 flex ${flip === 'next' ? 'is-next' : flip === 'prev' ? 'is-prev' : ''}`}
                  style={{ ['--idea-tint' as any]: c.bg, ['--idea-dot' as any]: c.dot }}
                >
                  <span className="idea-stripe" />
                  <div className="flex-1 min-w-0 flex flex-col pl-3 pr-1 py-2">
                    <div className="flex items-center gap-2 text-[10px] shrink-0">
                      <span
                        style={{ backgroundColor: current.tag?.color_code, color: current.tag?.text_color }}
                        className="px-2 py-0.5 rounded-full font-black truncate max-w-[140px]"
                      >
                        {current.tag?.name || '기타'}
                      </span>
                      <span className="text-slate-400 font-bold">{dateOf(current.created_at)}</span>
                      {current.is_archived && <span className="text-emerald-600 font-black">✔ 완료</span>}
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto pr-1 mt-1.5 space-y-1.5">
                      <h4 className={`font-black text-[15px] leading-snug text-slate-800 dark:text-slate-100 ${current.is_archived ? 'line-through opacity-60' : ''}`}>
                        {current.title}
                      </h4>
                      <p className="text-[12px] text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{current.content || '내용이 없습니다.'}</p>
                      {current.attached_images?.length > 0 && (
                        <div className="pt-1 flex flex-wrap gap-2">
                          {current.attached_images.map((img, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setPreviewImage(img.thumbnail_url)}
                              className="relative group w-14 h-14 rounded-xl overflow-hidden cursor-pointer"
                              title="크게 보기"
                            >
                              <img src={img.thumbnail_url} alt={img.file_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                              <span className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <ExternalLink className="w-3.5 h-3.5 text-white" />
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 하단: 완료 · 수정 · 삭제 | 넘기기 */}
                <div className="flex items-center justify-between gap-2 px-3 py-1.5 shrink-0">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleArchive(current.idea_id)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold transition ${
                        current.is_archived ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {current.is_archived ? '완료됨' : '완료'}
                    </button>
                    <button type="button" onClick={() => onOpenRecordModal(current)} className="p-1.5 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800" title="수정">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteIdea(current.idea_id, current.title)}
                      className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => go('prev')} className="p-1 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="이전">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-1">
                      {filteredIdeas.length <= 8 ? (
                        filteredIdeas.map((it, i) => (
                          <button
                            key={it.idea_id}
                            type="button"
                            onClick={() => setIndex(i)}
                            className={`rounded-full transition-all ${i === safeIndex ? 'w-4 h-1.5' : 'w-1.5 h-1.5 opacity-50'}`}
                            style={{ background: colorOf(it.color_label).dot }}
                            title={it.title}
                          />
                        ))
                      ) : (
                        <span className="text-[11px] font-black text-slate-600">
                          {safeIndex + 1} / {filteredIdeas.length}
                        </span>
                      )}
                    </div>
                    <button type="button" onClick={() => go('next')} className="p-1 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="다음">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            );
          })()
        ) : (
          /* 목록: 칸막이 없는 줄 목록 */
          <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-2 divide-y divide-slate-200/60 dark:divide-slate-700/60">
            {filteredIdeas.map((item, i) => {
              const c = colorOf(item.color_label);
              return (
                <div
                  key={item.idea_id}
                  className={`py-2 flex items-start gap-2 group cursor-pointer ${item.is_archived ? 'opacity-60' : ''}`}
                  onClick={() => {
                    setIndex(i);
                    setViewMode('stack');
                  }}
                >
                  <span className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ background: c.dot }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span style={{ backgroundColor: item.tag?.color_code, color: item.tag?.text_color }} className="px-1.5 py-0.5 rounded-full text-[9.5px] font-black shrink-0">
                        {item.tag?.name}
                      </span>
                      <h4 className={`font-black text-[12px] truncate ${item.is_archived ? 'line-through' : ''}`}>{item.title}</h4>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{item.content}</p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition" onClick={(e) => e.stopPropagation()}>
                    {item.attached_images?.length > 0 && (
                      <span className="text-[10px] text-sky-500 font-bold flex items-center gap-0.5 mr-1">
                        <ImageIcon className="w-3 h-3" />
                        {item.attached_images.length}
                      </span>
                    )}
                    <button type="button" onClick={() => handleToggleArchive(item.idea_id)} className="p-1 text-slate-400 hover:text-emerald-500" title="완료">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => onOpenRecordModal(item)} className="p-1 text-slate-400 hover:text-indigo-500" title="수정">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => handleDeleteIdea(item.idea_id, item.title)} className="p-1 text-slate-400 hover:text-rose-500" title="삭제">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 group-hover:hidden">{dateOf(item.created_at)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {previewImage && (
        <div onClick={() => setPreviewImage(null)} className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative max-w-4xl max-h-[90vh]">
            <button onClick={() => setPreviewImage(null)} className="absolute -top-10 right-0 p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white">
              <X className="w-6 h-6" />
            </button>
            <img src={previewImage} alt="확대 이미지" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain" />
          </div>
        </div>
      )}
    </div>
  );
};
