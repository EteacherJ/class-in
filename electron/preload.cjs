/**
 * ==============================================================================
 * 🏫 Class in (스마트 학급 대시보드) - Preload 스크립트 (sandbox 호환 CommonJS)
 * ==============================================================================
 * - sandbox: true 환경에서도 동작하도록 CommonJS(require)로 작성합니다.
 * - 렌더러에는 필요한 최소 기능만 노출하며, 모든 요청은 메인 프로세스에서 다시 검증합니다.
 */
const { contextBridge, ipcRenderer } = require('electron');

const subscribe = (channel, callback) => {
  if (typeof callback !== 'function') return () => {};
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,

  // 🪟 창 재질 ('vibrancy' 맥 / 'acrylic' 윈도우11 / 'none') - 바탕화면 비침 가능 여부
  getWindowMaterial: () => {
    try {
      return ipcRenderer.sendSync('get-window-material');
    } catch {
      return 'none';
    }
  },

  // 💻 프로그램/바로가기 실행 (메인 프로세스에서 경로·스킴 검증)
  launchApp: (targetPath) => ipcRenderer.invoke('launch-app', String(targetPath ?? '')),

  // 🌐 기본 브라우저로 열기 (http/https/mailto 만 허용)
  openExternal: (url) => ipcRenderer.invoke('open-external', String(url ?? '')),
  openExternalSearch: (params) => ipcRenderer.invoke('open-external-search', params),
  // 🎵 음악 재생 상태 알림 (재생 중 앱이 잠들지 않게)
  setMediaPlaying: (on) => ipcRenderer.send('media-playing', !!on),
  // 🪟 바로가기를 프로그램 안 팝업 창으로 열기 (분리된 세션)
  openPopupWindow: (url, title) => ipcRenderer.invoke('open-popup-window', String(url ?? ''), String(title ?? '')),

  // 📡 급식(NEIS)·iCal 등 외부 데이터 안전 대리 요청 (제3자 프록시 대체)
  fetchText: (url) => ipcRenderer.invoke('proxy-fetch-text', String(url ?? '')),
  fetchBinary: (url) => ipcRenderer.invoke('proxy-fetch-binary', String(url ?? '')),
  postJson: (url, body) => ipcRenderer.invoke('proxy-post-json', String(url ?? ''), String(body ?? '')),

  // 💾 안전 백업 파일 (사용자 데이터 폴더/backups)
  saveBackupFile: (fileName, content) => ipcRenderer.invoke('save-backup-file', String(fileName ?? ''), String(content ?? '')),

  // 🪟 바탕화면 비침 방식 (흐림 / 선명) - 바꾸면 다시 시작 필요
  windowPrefs: {
    get: () => {
      try {
        return ipcRenderer.sendSync('get-window-prefs');
      } catch {
        return null;
      }
    },
    set: (prefs) => ipcRenderer.invoke('set-window-prefs', { glassMode: prefs?.glassMode === 'clear' ? 'clear' : 'blur' }),
    relaunch: () => ipcRenderer.invoke('relaunch-app'),
  },

  // 🎰 자리 뽑기 창: 모니터 옮기기 · 전체 화면
  seatDraw: {
    nextDisplay: () => ipcRenderer.invoke('seatdraw-next-display'),
    toggleFullscreen: () => ipcRenderer.invoke('seatdraw-toggle-fullscreen'),
    displayCount: () => {
      try {
        return Number(ipcRenderer.sendSync('seatdraw-display-count')) || 1;
      } catch {
        return 1;
      }
    },
  },

  // 🚪 대시보드 접기 → 바탕화면 미니 루미 문
  mini: {
    enter: () => ipcRenderer.invoke('mini-enter'),
    restore: () => ipcRenderer.invoke('mini-restore'),
    moveTo: (x, y) => ipcRenderer.send('mini-move', Number(x), Number(y)),
    moveEnd: () => ipcRenderer.send('mini-move-end'),
    getPosition: () => {
      try {
        return ipcRenderer.sendSync('mini-get-position');
      } catch {
        return [0, 0];
      }
    },
    onRestored: (callback) => subscribe('mini-restored', callback),
    onShown: (callback) => subscribe('mini-shown', callback),
  },

  // 🔐 OS 보안 저장소(맥 키체인 / 윈도우 DPAPI) - API 키 등 민감정보 보관
  secureStore: {
    isAvailable: () => ipcRenderer.sendSync('secure-store-available') === true,
    get: (key) => ipcRenderer.sendSync('secure-store-get', String(key)),
    set: (key, value) => ipcRenderer.sendSync('secure-store-set', String(key), String(value ?? '')),
    remove: (key) => ipcRenderer.sendSync('secure-store-remove', String(key)),
  },

  // 🔄 자동 업데이트
  restartAndInstall: () => ipcRenderer.send('restart-and-install'),
  onUpdateAvailable: (callback) => subscribe('update-available', callback),
  onDownloadProgress: (callback) => subscribe('download-progress', callback),
  onUpdateDownloaded: (callback) => subscribe('update-downloaded', callback),
});
