/**
 * ============================================================================
 * [largeStore.ts] 대용량 데이터 저장소 (IndexedDB + 동기 메모리 캐시)
 * ============================================================================
 * 판서 슬라이드(원본 해상도 이미지)·아이디어 노트(캡처 이미지)처럼 큰 데이터는
 * localStorage(5~10MB 한도)를 넘기면 저장이 '조용히 실패'해 유실될 수 있습니다.
 * 이 모듈은 해당 데이터를 IndexedDB(수백 MB 이상)에 보관합니다.
 *
 * - 앱 시작 전에 initLargeStore() 를 1회 호출해 캐시를 채우면, 이후 읽기는 동기(largeGet)로 동작합니다.
 * - 쓰기(largeSet)는 캐시에 즉시 반영하고 IndexedDB에는 잠시 모아 비동기로 기록합니다.
 * - 최초 실행 시 기존 localStorage 데이터를 자동 이전하며, 이전 전에 안전 백업을 남깁니다.
 */

export const LARGE_STORE_KEYS = ['ttime_whiteboard_slides', 'ttime_idea_notes', 'class_stickers_v1'] as const;
export type LargeStoreKey = (typeof LARGE_STORE_KEYS)[number];

const DB_NAME = 'classin-large-store';
const STORE = 'kv';
const MIGRATION_FLAG = 'class_dashboard_large_store_v1';

const cache = new Map<string, string>();
const pendingWrites = new Map<string, string | null>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let dbPromise: Promise<IDBDatabase | null> | null = null;
let idbAvailable = true;

export const isLargeKey = (key: string): key is LargeStoreKey => (LARGE_STORE_KEYS as readonly string[]).includes(key);

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function idbRequest<T>(db: IDBDatabase, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = run(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** Electron 에서는 사용자 데이터 폴더에 실제 백업 파일로도 남깁니다 (웹 환경은 IndexedDB 백업만) */
async function writeSafetyBackupFile(payload: Record<string, string>): Promise<boolean> {
  try {
    const api = (window as any).electronAPI;
    if (!api?.saveBackupFile) return false;
    const res = await api.saveBackupFile(`before-largestore-migration-${Date.now()}.json`, JSON.stringify(payload));
    return !!res?.success;
  } catch {
    return false;
  }
}

/**
 * 앱 시작 전에 1회 호출: IndexedDB 내용을 캐시에 적재하고, 필요하면 localStorage 데이터를 이전합니다.
 */
export async function initLargeStore(): Promise<void> {
  const db = await openDb();
  if (!db) {
    // IndexedDB 를 쓸 수 없는 환경 → localStorage 를 그대로 사용 (기존 동작 유지)
    idbAvailable = false;
    LARGE_STORE_KEYS.forEach((k) => {
      const v = localStorage.getItem(k);
      if (v !== null) cache.set(k, v);
    });
    return;
  }

  try {
    for (const key of LARGE_STORE_KEYS) {
      const value = await idbRequest<string | undefined>(db, 'readonly', (s) => s.get(key) as IDBRequest<string | undefined>);
      if (typeof value === 'string') cache.set(key, value);
    }

    // ── 기존 localStorage 데이터 이전 (1회) ──
    const legacy: Record<string, string> = {};
    LARGE_STORE_KEYS.forEach((k) => {
      const v = localStorage.getItem(k);
      if (v !== null && v !== '') legacy[k] = v;
    });

    if (Object.keys(legacy).length > 0) {
      // ① 안전 백업: IndexedDB 별도 키 + (데스크톱 앱) 사용자 데이터 폴더 파일
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      await idbRequest(db, 'readwrite', (s) => s.put(JSON.stringify(legacy), `__backup__${stamp}`));
      await writeSafetyBackupFile(legacy);

      // ② 이전 (IndexedDB 에 이미 더 최신 값이 있으면 덮어쓰지 않음)
      for (const [k, v] of Object.entries(legacy)) {
        if (!cache.has(k)) {
          await idbRequest(db, 'readwrite', (s) => s.put(v, k));
          cache.set(k, v);
        }
      }

      // ③ 기록 확인(다시 읽기) 후에만 localStorage 원본 삭제 → 저장 공간 확보
      for (const k of Object.keys(legacy)) {
        const check = await idbRequest<string | undefined>(db, 'readonly', (s) => s.get(k) as IDBRequest<string | undefined>);
        if (typeof check === 'string') localStorage.removeItem(k);
      }
      localStorage.setItem(MIGRATION_FLAG, stamp);
      console.log('🟢 [LargeStore] 판서·아이디어 노트 데이터를 IndexedDB 로 이전했습니다. (안전 백업 보관)');
    }
  } catch (err) {
    console.warn('🟡 [LargeStore] IndexedDB 초기화 실패 → localStorage 사용:', err);
    idbAvailable = false;
    LARGE_STORE_KEYS.forEach((k) => {
      const v = localStorage.getItem(k);
      if (v !== null) cache.set(k, v);
    });
  }
}

/** 동기 읽기 (initLargeStore 이후) */
export function largeGet(key: LargeStoreKey): string | null {
  return cache.has(key) ? cache.get(key)! : null;
}

async function flush() {
  flushTimer = null;
  const batch = new Map(pendingWrites);
  pendingWrites.clear();
  const db = await openDb();
  if (!db) return;
  for (const [k, v] of batch) {
    try {
      await idbRequest<unknown>(db, 'readwrite', (s) => (v === null ? s.delete(k) : s.put(v, k)) as IDBRequest<unknown>);
    } catch (err) {
      console.error('🔴 [LargeStore] 저장 실패:', k, err);
    }
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flush, 400);
}

/** 쓰기: 캐시 즉시 반영 + IndexedDB 비동기 기록 (0.4초 단위로 모아서) */
export function largeSet(key: LargeStoreKey, value: string): void {
  cache.set(key, value);
  if (!idbAvailable) {
    try {
      localStorage.setItem(key, value);
    } catch (err) {
      console.error('🔴 [LargeStore] localStorage 저장 한도 초과:', err);
    }
    return;
  }
  pendingWrites.set(key, value);
  scheduleFlush();
}

export function largeRemove(key: LargeStoreKey): void {
  cache.delete(key);
  if (!idbAvailable) {
    localStorage.removeItem(key);
    return;
  }
  pendingWrites.set(key, null);
  scheduleFlush();
}

// 창을 닫거나 숨길 때 남은 쓰기를 즉시 기록
if (typeof window !== 'undefined') {
  const flushNow = () => {
    if (pendingWrites.size > 0) void flush();
  };
  window.addEventListener('pagehide', flushNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushNow();
  });
}
