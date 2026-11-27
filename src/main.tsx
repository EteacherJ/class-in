import React, { StrictMode, Component, ErrorInfo, ReactNode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
// ⚡ 보조 모니터 송출 화면은 해당 창에서만 불러오기
const MiniLumiWindow = lazy(() => import('./components/MiniLumiWindow.tsx').then((m) => ({ default: m.MiniLumiWindow })));
const SeatDrawApp = lazy(() => import('./components/seatdraw/SeatDrawApp.tsx'));
const DualMonitorDisplayView = lazy(() =>
  import('./components/DualMonitorDisplayView.tsx').then((m) => ({ default: m.DualMonitorDisplayView }))
);
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/jua/latin-400.css';
import '@fontsource/jua/korean-400.css';
import './index.css';
import { initLargeStore } from './utils/largeStore';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * [글로벌 안전 ErrorBoundary]
 * 교실 스마트보드 및 다양한 기기 환경에서 예기치 못한 스크립트 오류 발생 시
 * 흰 화면(먹통) 대신 교사용 복구 UI를 띄워 100% 자가 치유를 지원합니다.
 */
class GlobalErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🔴 [치명적 런타임 오류 포착]:', error, errorInfo);
  }

  handleResetStorage = () => {
    if (window.confirm('⚠️ 대시보드 저장 데이터를 기본값으로 재설정하시겠습니까?\n(설정 오류나 캐시 불일치 문제를 해결합니다)')) {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.error('Storage clear error:', e);
      }
      window.location.reload();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6 font-sans">
          <div className="w-full max-w-xl bg-slate-800/90 border border-rose-500/40 rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center space-y-5">
            <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-3xl flex items-center justify-center mx-auto text-3xl border border-rose-500/30">
              ⚠️
            </div>
            <div>
              <h2 className="text-xl font-black text-white">화면을 불러오는 중 일시적인 오류가 발생했습니다</h2>
              <p className="text-sm text-slate-300 mt-1">
                데이터 동기화 또는 브라우저 캐시 불일치로 인해 화면 표시가 지연되었습니다.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-black/50 border border-slate-700 rounded-2xl p-4 text-left font-mono text-xs text-rose-300 overflow-x-auto max-h-48 select-text">
                <p className="font-bold text-rose-400">오류 메시지:</p>
                <p className="mt-1">{this.state.error.toString()}</p>
                {this.state.error.stack && (
                  <pre className="mt-2 text-[10px] text-slate-400 opacity-80 whitespace-pre-wrap">
                    {this.state.error.stack.slice(0, 500)}
                  </pre>
                )}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition cursor-pointer shadow-md"
              >
                🔄 다시 시도 (새로고침)
              </button>
              <button
                type="button"
                onClick={this.handleResetStorage}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-xl transition cursor-pointer shadow-md"
              >
                🧹 캐시 초기화 후 복구
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const params = new URLSearchParams(window.location.search);
const isDisplayMode = params.get('mode') === 'display';
const isMiniMode = params.get('mode') === 'mini';
const isSeatDrawMode = params.get('mode') === 'seatdraw';
const initialTab = (params.get('tab') as any) || 'timer';

// 💾 대용량 저장소(IndexedDB)를 먼저 준비한 뒤 화면을 그립니다 (판서·아이디어 노트 동기 읽기 보장)
initLargeStore()
  .catch((err) => console.warn('🟡 [LargeStore] 초기화 오류:', err))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <GlobalErrorBoundary>
          {isSeatDrawMode ? (
            <Suspense fallback={null}>
              <SeatDrawApp />
            </Suspense>
          ) : isMiniMode ? (
            <Suspense fallback={null}>
              <MiniLumiWindow />
            </Suspense>
          ) : isDisplayMode ? (
            <Suspense fallback={null}>
              <DualMonitorDisplayView standalone={true} initialTab={initialTab} />
            </Suspense>
          ) : (
            <App />
          )}
        </GlobalErrorBoundary>
      </StrictMode>,
    );
  });
