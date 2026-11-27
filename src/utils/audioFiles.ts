/**
 * 🎵 내 MP3 · 음악 파일 보관 (IndexedDB)
 *  - 음악 파일은 커서 localStorage 대신 IndexedDB에 넣어요
 *  - 같은 프로그램의 모든 창(대시보드 · 보조화면)이 함께 써요
 */
const DB = 'classin-audio-files';
const STORE = 'files';
let dbp: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}
export async function putAudio(id: string, blob: Blob): Promise<void> {
  const d = await db();
  await new Promise<void>((res, rej) => {
    const tx = d.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
export async function getAudio(id: string): Promise<Blob | null> {
  try {
    const d = await db();
    return await new Promise((res) => {
      const r = d.transaction(STORE, 'readonly').objectStore(STORE).get(id);
      r.onsuccess = () => res((r.result as Blob) || null);
      r.onerror = () => res(null);
    });
  } catch {
    return null;
  }
}
export async function delAudio(id: string): Promise<void> {
  try {
    const d = await db();
    d.transaction(STORE, 'readwrite').objectStore(STORE).delete(id);
  } catch {}
}
