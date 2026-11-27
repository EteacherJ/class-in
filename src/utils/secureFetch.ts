/**
 * ============================================================================
 * [secureFetch.ts] 외부 공개 데이터(급식 NEIS, iCal 등) 안전 요청 헬퍼
 * ============================================================================
 * 브라우저 보안 정책(CORS)상 직접 읽을 수 없는 공개 자료를, 제3자 무료 프록시를 거치지 않고
 * 다음 순서로 안전하게 가져옵니다.
 *   1) 데스크톱 앱(Electron): 메인 프로세스 대리 요청 (window.electronAPI.fetchText)
 *   2) 브라우저: 직접 요청 (CORS 허용 사이트)
 *   3) 브라우저 + 로컬 실행기(run-dashboard): 같은 PC의 /api/fetch 대리 요청
 */

export interface SecureFetchResult {
  ok: boolean;
  status: number;
  text: string;
  error?: string;
}

type ElectronFetchApi = {
  fetchText?: (url: string) => Promise<{ ok: boolean; status: number; text?: string; error?: string }>;
};

const getElectronApi = (): ElectronFetchApi | undefined =>
  typeof window !== 'undefined' ? ((window as any).electronAPI as ElectronFetchApi | undefined) : undefined;

export async function fetchExternalText(url: string, timeoutMs = 10000): Promise<SecureFetchResult> {
  const electronApi = getElectronApi();

  // 1) Electron 메인 프로세스 대리 요청
  if (electronApi?.fetchText) {
    try {
      const res = await electronApi.fetchText(url);
      return { ok: !!res.ok, status: res.status || 0, text: res.text || '', error: res.error };
    } catch (err: any) {
      return { ok: false, status: 0, text: '', error: err?.message || String(err) };
    }
  }

  // 2) 직접 요청
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } catch {
    // CORS 차단 등 → 3) 로컬 실행기 대리 요청 시도
  }

  // 3) run-dashboard 로컬 서버 대리 요청 (같은 출처에서만 동작)
  if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
    try {
      const res = await fetch(`/api/fetch?url=${encodeURIComponent(url)}`, {
        signal: AbortSignal.timeout(timeoutMs + 2000),
      });
      const contentType = res.headers.get('content-type') || '';
      // 정적 호스팅(로컬 실행기 아님)이면 index.html 이 돌아오므로 걸러냅니다.
      if (contentType.includes('text/html') && !url.toLowerCase().includes('.htm')) {
        return { ok: false, status: res.status, text: '', error: '로컬 대리 요청 기능을 사용할 수 없습니다.' };
      }
      const text = await res.text();
      return { ok: res.ok, status: res.status, text, error: res.ok ? undefined : text };
    } catch (err: any) {
      return { ok: false, status: 0, text: '', error: err?.message || String(err) };
    }
  }

  return { ok: false, status: 0, text: '', error: '외부 자료에 접근할 수 없습니다.' };
}

export async function fetchExternalJson<T = any>(url: string, timeoutMs = 10000): Promise<T> {
  const res = await fetchExternalText(url, timeoutMs);
  if (!res.ok) throw new Error(res.error || `HTTP ${res.status}`);
  return JSON.parse(res.text) as T;
}
