import React from 'react';
import { Palette, Sparkles, Upload, Trash2 } from 'lucide-react';
import type { ClassConfig } from '../types';
import { loadImageFile } from '../utils/imageTools';

/**
 * 🎨 화면 스타일 (설정 1단계) — 기존 7·8·9·10번을 하나로 통합
 *  ① 배경: 색 · 이미지 · 투명도
 *  ② 위젯 유리: 농도(투명도) · 상단 바
 *  ③ 모서리
 *  ④ 가독성: 대비 단계 · 글씨 외곽선 · 불투명 카드
 *  ⑤ 글씨 배율
 * 모든 항목은 누르는 즉시 대시보드에 미리 반영됩니다.
 */
interface Props {
  config: ClassConfig;
  apply: (patch: Partial<ClassConfig>) => void;
  onAutoAdjust: () => void;
  onShowToast: (msg: string) => void;
}

const BG_PRESETS = [
  { name: '테마 기본', color: '' },
  { name: '완전 투명', color: 'transparent' },
  { name: '클라우드 그레이', color: '#f2f3f5' },
  { name: '소프트 밀크', color: '#f8fafc' },
  { name: '로즈 블러시', color: '#fbcfe8' },
  { name: '크림 버터', color: '#fef08a' },
  { name: '에어리 스카이', color: '#38bdf8' },
  { name: '민트', color: '#10b981' },
  { name: '오로라 퍼플', color: '#6366f1' },
  { name: '딥 나이트', color: '#0f172a' },
  { name: '초록 칠판', color: '#14532d' },
  { name: '우디 에스프레소', color: '#451a03' },
];

const Seg: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; title?: string }> = ({ active, onClick, children, title }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition cursor-pointer text-left ${
      active
        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-800'
    }`}
  >
    {children}
  </button>
);

const Row: React.FC<{ num: string; title: string; hint?: string; children: React.ReactNode }> = ({ num, title, hint, children }) => (
  <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs font-black text-slate-900 dark:text-white">
        <span className="text-indigo-600 mr-1">{num}</span>
        {title}
      </span>
      {hint && <span className="text-[10px] text-slate-500 dark:text-slate-400 text-right">{hint}</span>}
    </div>
    {children}
  </div>
);

const Slider: React.FC<{ label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; left: string; right: string; color?: string }> = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  left,
  right,
  color = 'accent-indigo-600',
}) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
      <span>{label}</span>
      <span className="font-mono font-black text-indigo-600 dark:text-indigo-300">{Math.round(value * 100)}%</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className={`w-full cursor-pointer ${color}`} />
    <div className="flex justify-between text-[10px] text-slate-400">
      <span>{left}</span>
      <span>{right}</span>
    </div>
  </div>
);

export const ScreenStyleSection: React.FC<Props> = ({ config, apply, onAutoAdjust, onShowToast }) => {
  const isDark = config.themeMode === 'dark';
  const contrast = config.widgetTextContrast || 'auto';
  const headerMode = config.widgetHeaderColorMode || 'auto';
  const radius = config.dashboardBorderRadius || 'md';

  return (
    <div className="p-4 bg-gradient-to-br from-indigo-50/90 via-purple-50/80 to-sky-50/90 dark:from-slate-800 dark:to-indigo-950/60 rounded-2xl border border-indigo-200 dark:border-indigo-800 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs shadow-xs">🎨</div>
          <div>
            <h5 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>화면 스타일</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                누르면 바로 미리보기
              </span>
            </h5>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">배경, 위젯 유리, 모서리, 가독성을 한곳에서 조절해요. 하단 팔레트(🎨)와 같은 값을 써요.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onAutoAdjust}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
          title="선택한 테마에 어울리는 배경·투명도로 한 번에 맞춤"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>테마에 맞게 자동 조절</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* ① 배경 */}
        <Row num="①" title="배경" hint={isDark ? '다크 모드에서도 선택한 색이 적용돼요' : undefined}>
          <div className="flex flex-wrap gap-1.5">
            {BG_PRESETS.map((p) => {
              const sel = (config.dashboardBgColor || '') === p.color;
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => apply(p.color === 'transparent' ? { dashboardBgColor: 'transparent', dashboardBgOpacity: 0 } : { dashboardBgColor: p.color })}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border cursor-pointer ${
                    sel ? 'border-indigo-600 ring-2 ring-indigo-400/40 bg-white dark:bg-slate-900' : 'border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800'
                  } text-slate-700 dark:text-slate-200`}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-black/10"
                    style={
                      p.color === 'transparent'
                        ? { background: 'repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 0 0/6px 6px' }
                        : p.color
                        ? { background: p.color }
                        : { background: 'linear-gradient(90deg,#6366f1,#a855f7,#ec4899)' }
                    }
                  />
                  {p.name}
                </button>
              );
            })}
            <label className="px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border border-dashed border-indigo-300 bg-white dark:bg-slate-900 cursor-pointer text-indigo-800 dark:text-indigo-200">
              <Palette className="w-3 h-3" />
              직접
              <input type="color" value={config.dashboardBgColor?.startsWith('#') ? config.dashboardBgColor : '#6366f1'} onChange={(e) => apply({ dashboardBgColor: e.target.value })} className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer" />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex-1 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              {config.canvasBgImage ? '배경 이미지 바꾸기' : '배경 이미지 올리기'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  try {
                    const { dataUrl } = await loadImageFile(f, 2200, 0.85);
                    apply({ canvasBgImage: dataUrl });
                    onShowToast('🖼️ 배경 이미지를 적용했어요.');
                  } catch {
                    onShowToast('🔴 이미지를 불러오지 못했어요.');
                  }
                }}
              />
            </label>
            {config.canvasBgImage && (
              <>
                <span className="w-10 h-7 rounded-lg border border-slate-200 bg-cover bg-center shrink-0" style={{ backgroundImage: `url("${config.canvasBgImage}")` }} />
                <button type="button" onClick={() => apply({ canvasBgImage: undefined })} className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer" title="배경 이미지 지우기">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
          <Slider
            label="배경 투명도"
            value={config.dashboardBgOpacity ?? 0.95}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => apply({ dashboardBgOpacity: v })}
            left="0% 바탕화면이 비침 (앱)"
            right="100% 불투명"
          />
        </Row>

        {/* ② 위젯 유리 */}
        <Row num="②" title="위젯 유리">
          <Slider
            label="유리 농도 (위젯 카드 불투명도)"
            value={Math.max(0.3, config.widgetOpacity ?? 0.8)}
            min={0.3}
            max={1}
            step={0.05}
            onChange={(v) => apply({ widgetOpacity: v })}
            left="30% 맑은 유리"
            right="100% 불투명"
            color="accent-purple-600"
          />
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">위젯 상단 바</span>
            <div className="grid grid-cols-3 gap-1.5">
              <Seg active={headerMode === 'auto'} onClick={() => apply({ widgetHeaderColorMode: 'auto' })}>
                ✨ 테마 색
              </Seg>
              <Seg active={headerMode === 'custom'} onClick={() => apply({ widgetHeaderColorMode: 'custom', customWidgetHeaderColor: config.customWidgetHeaderColor || '#6366f1' })}>
                <span className="flex items-center gap-1">
                  🎨 직접
                  {headerMode === 'custom' && (
                    <input
                      type="color"
                      value={config.customWidgetHeaderColor || '#6366f1'}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => apply({ customWidgetHeaderColor: e.target.value })}
                      className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer"
                    />
                  )}
                </span>
              </Seg>
              <Seg active={headerMode === 'transparent'} onClick={() => apply({ widgetHeaderColorMode: 'transparent' })}>
                🫧 투명 일체형
              </Seg>
            </div>
          </div>
        </Row>

        {/* ③ 모서리 */}
        <Row num="③" title="화면 구분 · 모서리 (위젯 · 패널)">
          <div className="grid grid-cols-2 gap-1.5" data-seamless-setting>
            <Seg active={config.seamlessLayout !== false} onClick={() => apply({ seamlessLayout: true })} title="헤더 · 사이드 스택 · 위젯 영역의 경계선 없이 하나의 판처럼">
              🫧 한 판 (경계 없음)
            </Seg>
            <Seg active={config.seamlessLayout === false} onClick={() => apply({ seamlessLayout: false })} title="헤더 · 스택 · 위젯 영역을 각각 테두리 있는 판으로">
              ▭ 구역 나눔
            </Seg>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {(
              [
                ['none', '직각', 0],
                ['sm', '약하게', 8],
                ['md', '보통', 16],
                ['lg', '부드럽게', 24],
                ['full', '둥글게', 32],
              ] as const
            ).map(([id, label, px]) => (
              <button
                key={id}
                type="button"
                onClick={() => apply({ dashboardBorderRadius: id })}
                className={`py-2 rounded-xl border flex flex-col items-center gap-1 text-[10px] font-bold cursor-pointer ${
                  radius === id ? 'border-indigo-600 ring-2 ring-indigo-400/40 bg-white dark:bg-slate-900 text-indigo-700' : 'border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <span className="w-7 h-5 border-2 border-current" style={{ borderRadius: Math.min(10, px / 3) }} />
                {label}
              </button>
            ))}
          </div>
        </Row>

        {/* ④ 가독성 */}
        <Row num="④" title="글씨 가독성">
          <div className="grid grid-cols-3 gap-1.5">
            <Seg active={contrast === 'auto'} onClick={() => apply({ widgetTextContrast: 'auto' })} title="테마 분위기에 맞춰 자동">
              ✨ 자동
            </Seg>
            <Seg active={contrast === 'high'} onClick={() => apply({ widgetTextContrast: 'high' })} title="흐린 회색 글씨를 진하게">
              🔆 선명하게
            </Seg>
            <Seg active={contrast === 'ultra'} onClick={() => apply({ widgetTextContrast: 'ultra' })} title="교실 뒤에서도 보이게 굵고 진하게">
              ⚡ 전자칠판용
            </Seg>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <label className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
              글씨 외곽선
              <input type="checkbox" checked={!!config.widgetTextShadow} onChange={(e) => apply({ widgetTextShadow: e.target.checked })} className="w-4 h-4 accent-indigo-600" />
            </label>
            <label className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
              불투명 카드
              <input type="checkbox" checked={!!config.widgetCardSolidBg} onChange={(e) => apply({ widgetCardSolidBg: e.target.checked })} className="w-4 h-4 accent-indigo-600" />
            </label>
          </div>
          <Slider label="글씨 배율" value={config.fontScale ?? 1} min={0.8} max={1.3} step={0.05} onChange={(v) => apply({ fontScale: v })} left="80% 작게" right="130% 크게" color="accent-emerald-600" />
        </Row>

        {/* ⑤ 대시보드 접기 효과 (헤더 접기 버튼 · Alt+M) */}
        <Row num="⑤" title="대시보드 접기 효과" hint="헤더의 접기 버튼 또는 Alt+M">
          <div className="grid grid-cols-2 gap-1.5">
            <Seg active={(config.collapseEffect || 'portal') === 'portal'} onClick={() => apply({ collapseEffect: 'portal' })}>
              🚪 루미 문 (소용돌이)
            </Seg>
            <Seg active={config.collapseEffect === 'genie'} onClick={() => apply({ collapseEffect: 'genie' })}>
              🧞 지니 램프
            </Seg>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">접으면 바탕화면 오른쪽 위에 작은 루미 문이 떠요. 끌어서 옮기고, 누르면 다시 펼쳐져요.</p>
        </Row>

      </div>
    </div>
  );
};

export default ScreenStyleSection;
