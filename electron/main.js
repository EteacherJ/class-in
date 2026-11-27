/**
 * ==============================================================================
 * 🏫 Class in (스마트 학급 대시보드) - Electron 데스크톱 앱 메인 프로세스
 * ==============================================================================
 */
import { app, BrowserWindow, Menu, dialog, ipcMain, session, shell, safeStorage, net, screen, powerSaveBlocker } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { createRequire } from 'module';
import http from 'http';
import fs from 'fs';
import os from 'os';
import {
  classifyLaunchTarget,
  isSafeExternalUrl,
  resolveSafeStaticPath,
  isAllowedProxyUrl,
  PROXY_MAX_BYTES,
  PROXY_TIMEOUT_MS,
} from './securityGuards.js';

const require = createRequire(import.meta.url);

// 📦 electron-updater 안전 로드 (CJS 호환 및 패키징 누락 방어)
let autoUpdater = null;
try {
  const updaterModule = require('electron-updater');
  autoUpdater = updaterModule.autoUpdater || updaterModule;
} catch (err) {
  console.warn('🟡 [Electron] electron-updater 로드 실패 (자동 업데이트 비활성화):', err.message);
}

// ⚡ GPU 하드웨어 가속 극대화 및 비디오 검은 화면(Black Screen) 방지 최적화
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
app.commandLine.appendSwitch('enable-smooth-scrolling');
// (성능) 'disable-renderer-backgrounding' 제거: 창이 가려지면 OS가 렌더러 우선순위를 낮출 수 있게 허용
// 단, 수업 타이머·종 알림 정확도를 위해 타이머 감속은 계속 끕니다.
app.commandLine.appendSwitch('disable-background-timer-throttling');
// 🎵 배경음악 끊김 방지: 창이 다른 창에 가려지거나 뒤로 가도 유튜브 재생(버퍼링)이 멈추지 않게
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('enable-features', 'HardwareAcceleratedVideoDecode');
// 🎵 유튜브 소리 끊김 방지: 화면에 작게 숨겨진 유튜브(다른 사이트) 화면을 Chromium이 '덜 중요한 화면'으로 보고
//    타이머·그리기를 늦추면 음악 데이터 공급이 밀려 소리가 뚝뚝 끊길 수 있어요 → 이 절전 기능들을 꺼요.
app.commandLine.appendSwitch(
  'disable-features',
  [
    'ThrottleUnimportantFrameTimers',
    'ThrottleUnimportantFrameRendering',
    'ThrottleDisplayNoneAndVisibilityHiddenCrossOriginIframes',
    'TimerThrottlingForHiddenFrames',
    'IntensiveWakeUpThrottling',
    'CalculateNativeWinOcclusion',
  ].join(',')
);
app.commandLine.appendSwitch('disable-background-media-suspend');

// 🧪 미리보기 모드 (설치 파일을 만들기 전 수정 내용 확인용)
//  - '미리보기_실행' 스크립트가 CLASSIN_PREVIEW=1 로 실행합니다.
//  - 실제 앱과 같은 방식(내장 서버·보안 정책)으로 dist 를 띄우되,
//    데이터는 설치된 Class in 의 '복사본'을 사용해 원본을 절대 건드리지 않습니다.
const IS_PREVIEW = process.env.CLASSIN_PREVIEW === '1';
if (IS_PREVIEW) {
  try {
    const appData = app.getPath('appData');
    const previewDir = path.join(appData, 'Class in Preview');
    const realDir = path.join(appData, 'Class in');
    fs.mkdirSync(previewDir, { recursive: true });
    for (const sub of ['Local Storage', 'IndexedDB']) {
      const from = path.join(realDir, sub);
      const to = path.join(previewDir, sub);
      fs.rmSync(to, { recursive: true, force: true });
      if (fs.existsSync(from)) fs.cpSync(from, to, { recursive: true });
      try { fs.rmSync(path.join(to, sub === 'IndexedDB' ? 'LOCK' : 'leveldb/LOCK'), { force: true }); } catch {}
    }
    // 바탕화면 비침 설정은 미리보기에서 바꿔 볼 수 있도록 처음 한 번만 가져옴
    const prefsFrom = path.join(realDir, 'window-prefs.json');
    const prefsTo = path.join(previewDir, 'window-prefs.json');
    if (fs.existsSync(prefsFrom) && !fs.existsSync(prefsTo)) fs.copyFileSync(prefsFrom, prefsTo);
    fs.writeFileSync(path.join(previewDir, '.legacy-migration-done'), 'preview');
    app.setPath('userData', previewDir);
    console.log('🧪 [Electron] 미리보기 모드: 설치된 앱 데이터의 복사본으로 실행합니다.');
  } catch (err) {
    console.warn('🟡 [Electron] 미리보기 데이터 복사 실패 (빈 데이터로 시작):', err.message);
  }
}

// 🔒 단일 인스턴스 잠금 (중복 실행 방지 및 Windows 설치 시 파일 잠김 원천 차단)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('🔴 [Electron] 다른 인스턴스가 이미 실행 중이므로 즉시 종료합니다.');
  app.quit();
  process.exit(0);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==============================================================================
// 📦 이전 앱(T-Time Board) 데이터 자동 이전 (최초 1회)
//  - 앱 이름이 'T-Time Board' → 'Class in' 으로 바뀌면서 데이터 폴더가 달라졌습니다.
//  - 새 앱에 아직 데이터가 없고 이전 앱 폴더가 있으면, 화면이 열리기 전에 복사합니다. (원본은 그대로 둠)
// ==============================================================================
function migrateLegacyUserData() {
  try {
    const userDataDir = app.getPath('userData');
    const marker = path.join(userDataDir, '.legacy-migration-done');
    if (fs.existsSync(marker)) return;
    // 이전 빌드들의 데이터 폴더 이름 후보 (T-Time Board 1.0.x = 't-time-board')
    const legacyDir = ['t-time-board', 'T-Time Board', 'class-in']
      .map((n) => path.join(app.getPath('appData'), n))
      .find((d) => d !== userDataDir && fs.existsSync(path.join(d, 'Local Storage')));
    const hasNewData = fs.existsSync(path.join(userDataDir, 'Local Storage'));
    if (!hasNewData && legacyDir) {
      fs.mkdirSync(userDataDir, { recursive: true });
      for (const sub of ['Local Storage', 'IndexedDB']) {
        const from = path.join(legacyDir, sub);
        if (fs.existsSync(from)) {
          fs.cpSync(from, path.join(userDataDir, sub), { recursive: true, errorOnExist: false, force: false });
        }
      }
      // 이전 앱의 잠금 파일은 복사하지 않음
      for (const lock of ['Local Storage/leveldb/LOCK', 'IndexedDB/LOCK']) {
        try { fs.rmSync(path.join(userDataDir, lock), { force: true }); } catch {}
      }
      console.log('🟢 [Electron] T-Time Board 데이터를 Class in 으로 이전했습니다.');
    }
    fs.mkdirSync(userDataDir, { recursive: true });
    fs.writeFileSync(marker, new Date().toISOString());
  } catch (err) {
    console.warn('🟡 [Electron] 이전 앱 데이터 이전 실패 (새로 시작):', err.message);
  }
}
migrateLegacyUserData();

let mainWindow = null;

// 중복 실행 시도 시 기존 창 포커스
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// 로깅 헬퍼
const log = {
  info: (msg, ...args) => console.log(`🔵 [Electron] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`🟡 [Electron] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`🔴 [Electron] ${msg}`, ...args),
};

// ==============================================================================
// 🧯 메인 프로세스 예외 처리 — 오류 창 대신 기록만 남기고 계속 실행
//   macOS는 며칠 동안 쓰지 않은 임시 폴더(/var/folders/…/T) 파일을 스스로 지워요.
//   대시보드를 며칠씩 켜 두거나, 실행 중에 앱을 새 버전으로 바꾸면 Chromium 이 만든
//   임시 파일(.com.classin.app.XXXXXX)이 사라져 'ENOENT' 오류 창이 뜰 수 있어요.
//   이런 '파일 없음' 오류는 앱 사용에 영향이 없어 조용히 기록만 해요.
// ==============================================================================
const mainErrorLogPath = () => {
  try {
    return path.join(app.getPath('userData'), 'logs', 'main-errors.log');
  } catch {
    return null;
  }
};
function recordMainError(kind, err) {
  try {
    const f = mainErrorLogPath();
    if (!f) return;
    fs.mkdirSync(path.dirname(f), { recursive: true });
    // 기록 파일이 너무 커지지 않게 (200KB 넘으면 새로)
    try {
      if (fs.statSync(f).size > 200 * 1024) fs.writeFileSync(f, '');
    } catch {}
    fs.appendFileSync(f, `[${new Date().toISOString()}] ${kind}: ${err && (err.stack || err.message) ? err.stack || err.message : String(err)}\n`);
  } catch {}
}
let mainErrorShown = false;
process.on('uncaughtException', (err) => {
  recordMainError('uncaughtException', err);
  console.error('🔴 [Electron] 처리되지 않은 오류:', err);
  if (err && (err.code === 'ENOENT' || err.code === 'EPIPE' || err.code === 'ECONNRESET')) return;
  if (mainErrorShown) return;
  mainErrorShown = true;
  try {
    if (app.isReady()) {
      dialog
        .showMessageBox({
          type: 'warning',
          title: 'Class in',
          message: '작은 오류가 생겼지만 계속 사용할 수 있어요.',
          detail: `문제가 계속되면 앱을 다시 실행해 주세요.\n(${err && err.message ? String(err.message).slice(0, 160) : '알 수 없는 오류'})`,
          buttons: ['확인'],
        })
        .catch(() => {});
    }
  } catch {}
});
process.on('unhandledRejection', (reason) => {
  recordMainError('unhandledRejection', reason);
  console.warn('🟡 [Electron] 처리되지 않은 Promise 거부:', reason);
});

// ==============================================================================
// 🛡️ 신뢰 출처(App Origin) 판별 - 앱 자신의 화면에서 온 요청만 처리합니다.
// ==============================================================================
let appOrigin = null; // 예: 'http://localhost:19283' (서버 기동 후 확정)

function isAppUrl(rawUrl) {
  if (!rawUrl || rawUrl === 'about:blank') return true;
  try {
    const u = new URL(rawUrl);
    if (u.protocol === 'file:') return !appOrigin; // file:// 폴백 로드 시에만 허용
    return appOrigin !== null && u.origin === appOrigin;
  } catch {
    return false;
  }
}

function isTrustedSender(event) {
  const frameUrl = event?.senderFrame?.url || event?.sender?.getURL?.() || '';
  const ok = isAppUrl(frameUrl);
  if (!ok) log.warn(`신뢰할 수 없는 출처의 IPC 요청 차단: ${frameUrl}`);
  return ok;
}

// 💻 외부 프로그램 및 로컬 파일 실행 IPC 핸들러 (명령 주입 차단 버전)
ipcMain.handle('launch-app', async (event, rawTarget) => {
  if (!isTrustedSender(event)) return { success: false, error: '허용되지 않은 요청입니다.' };
  const target = classifyLaunchTarget(rawTarget);
  if (!target.ok) {
    log.warn(`프로그램 실행 거부: ${target.error}`);
    return { success: false, error: target.error };
  }
  try {
    log.info(`로컬 프로그램 실행 요청 (${target.kind}): ${target.value}`);
    if (target.kind === 'url') {
      await shell.openExternal(target.value);
      return { success: true };
    }
    if (target.kind === 'path') {
      if (!fs.existsSync(target.value)) return { success: false, error: '파일 또는 프로그램을 찾을 수 없습니다.' };
      const errMsg = await shell.openPath(target.value); // 셸(cmd) 미경유 실행
      return errMsg ? { success: false, error: errMsg } : { success: true };
    }
    // kind === 'name' : 특수문자가 제거·검증된 프로그램 이름만 도달합니다.
    let child;
    if (process.platform === 'win32') {
      child = spawn('cmd.exe', ['/d', '/s', '/c', `start "" "${target.value}"`], {
        detached: true,
        stdio: 'ignore',
        windowsVerbatimArguments: true,
        windowsHide: true,
      });
    } else if (process.platform === 'darwin') {
      child = spawn('open', ['-a', target.value], { detached: true, stdio: 'ignore' });
    } else {
      child = spawn('xdg-open', [target.value], { detached: true, stdio: 'ignore' });
    }
    child.on('error', (err) => log.error('프로그램 실행 실패:', err.message));
    child.unref();
    return { success: true };
  } catch (err) {
    log.error(`프로그램 실행 실패:`, err.message);
    return { success: false, error: err.message };
  }
});

// 🌐 기본 브라우저로 열기 (http/https/mailto 만 허용)
ipcMain.handle('open-external', async (event, url) => {
  if (!isTrustedSender(event)) return { success: false };
  if (!isSafeExternalUrl(url)) return { success: false, error: '허용되지 않는 주소 형식입니다.' };
  await shell.openExternal(String(url));
  return { success: true };
});

// 🪟 바로가기를 '프로그램 안 팝업 창'으로 열기
//  - 앱 창과 분리된 세션(persist:classin-popup), preload·Node 접근 없음, 샌드박스 적용
//  - 팝업 안에서는 로그인 리다이렉트 등 외부 사이트 이동을 허용합니다 (앱 본 창은 계속 차단)
const popupContentsIds = new Set();
const POPUP_WEB_PREFERENCES = {
  sandbox: true,
  contextIsolation: true,
  nodeIntegration: false,
  nodeIntegrationInSubFrames: false,
  webSecurity: true,
  allowRunningInsecureContent: false,
  webviewTag: false,
  spellcheck: false,
  partition: 'persist:classin-popup',
};
function registerPopupContents(contents) {
  const id = contents.id;
  popupContentsIds.add(id);
  contents.once('destroyed', () => popupContentsIds.delete(id));
  contents.on('did-create-window', (child) => registerPopupContents(child.webContents));
}
ipcMain.handle('open-popup-window', async (event, rawUrl, rawTitle) => {
  if (!isTrustedSender(event)) return { success: false, error: '허용되지 않은 요청입니다.' };
  let target;
  try { target = new URL(String(rawUrl)); } catch { return { success: false, error: '주소 형식이 올바르지 않습니다.' }; }
  if (target.protocol !== 'https:' && target.protocol !== 'http:') return { success: false, error: 'http/https 주소만 열 수 있습니다.' };
  const parent = BrowserWindow.fromWebContents(event.sender);
  const pb = parent ? parent.getBounds() : { x: 80, y: 60, width: 1400, height: 900 };
  const width = Math.min(1280, Math.max(900, Math.round(pb.width * 0.82)));
  const height = Math.min(900, Math.max(640, Math.round(pb.height * 0.85)));
  const win = new BrowserWindow({
    width, height,
    x: Math.round(pb.x + (pb.width - width) / 2), y: Math.round(pb.y + (pb.height - height) / 2),
    autoHideMenuBar: true,
    title: String(rawTitle || '바로가기').slice(0, 80),
    backgroundColor: '#ffffff',
    webPreferences: POPUP_WEB_PREFERENCES,
  });
  registerPopupContents(win.webContents);
  win.loadURL(target.toString()).catch((err) => log.warn('팝업 창 열기 실패:', err.message));
  return { success: true };
});

// 🌐 외부 기본 브라우저 검색 IPC 핸들러 (구글/네이버/다음 등 shell.openExternal)
ipcMain.handle('open-external-search', async (event, params = {}) => {
  if (!isTrustedSender(event)) return { success: false };
  try {
    const { engine = 'google', query = '' } = typeof params === 'string' ? { query: params } : params || {};
    const text = String(query).trim();
    const q = encodeURIComponent(text);
    let targetUrl = `https://www.google.com/search?q=${q}`;
    if (/^https?:\/\//i.test(text) && isSafeExternalUrl(text)) {
      targetUrl = text;
    } else if (engine === 'naver') {
      targetUrl = `https://search.naver.com/search.naver?query=${q}`;
    } else if (engine === 'daum') {
      targetUrl = `https://search.daum.net/search?q=${q}`;
    }
    log.info(`외부 브라우저 검색 요청: ${targetUrl}`);
    await shell.openExternal(targetUrl);
    return { success: true, url: targetUrl };
  } catch (err) {
    log.error('외부 브라우저 열기 실패:', err.message);
    return { success: false, error: err.message };
  }
});

// 📡 외부 데이터 안전 대리 요청 (급식·iCal 등 CORS 미지원 공개 HTTPS 자료)
//  - 제3자 무료 프록시로 개인 캘린더 주소가 새어나가지 않도록 앱 내부에서 직접 요청합니다.
ipcMain.handle('proxy-fetch-text', async (event, rawUrl) => {
  if (!isTrustedSender(event)) return { ok: false, status: 0, error: '허용되지 않은 요청입니다.' };
  const check = isAllowedProxyUrl(rawUrl);
  if (!check.ok) return { ok: false, status: 0, error: check.error };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
  try {
    const res = await net.fetch(check.url, { signal: controller.signal, redirect: 'follow' });
    if (res.url && !isAllowedProxyUrl(res.url).ok) {
      return { ok: false, status: 0, error: '허용되지 않은 주소로 이동되었습니다.' };
    }
    const reader = res.body?.getReader();
    const chunks = [];
    let total = 0;
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > PROXY_MAX_BYTES) {
          controller.abort();
          return { ok: false, status: res.status, error: '응답 데이터가 너무 큽니다 (5MB 초과).' };
        }
        chunks.push(Buffer.from(value));
      }
    }
    return {
      ok: res.ok,
      status: res.status,
      contentType: res.headers.get('content-type') || '',
      text: Buffer.concat(chunks).toString('utf-8'),
    };
  } catch (err) {
    return { ok: false, status: 0, error: err?.name === 'AbortError' ? '요청 시간이 초과되었습니다.' : err?.message };
  } finally {
    clearTimeout(timer);
  }
});

// 📥 외부 공개 파일(구글 드라이브 주간학습안내 PDF 등) 내려받기 → base64
//  - 공개 https 주소만, 최대 25MB
ipcMain.handle('proxy-fetch-binary', async (event, rawUrl) => {
  if (!isTrustedSender(event)) return { ok: false, status: 0, error: '허용되지 않은 요청입니다.' };
  const check = isAllowedProxyUrl(rawUrl);
  if (!check.ok) return { ok: false, status: 0, error: check.error };
  const MAX = 25 * 1024 * 1024;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await net.fetch(check.url, { signal: controller.signal, redirect: 'follow' });
    if (res.url && !isAllowedProxyUrl(res.url).ok) {
      return { ok: false, status: 0, error: '허용되지 않은 주소로 이동되었습니다.' };
    }
    const reader = res.body?.getReader();
    const chunks = [];
    let total = 0;
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX) {
          controller.abort();
          return { ok: false, status: res.status, error: '파일이 너무 큽니다 (25MB 초과).' };
        }
        chunks.push(Buffer.from(value));
      }
    }
    return {
      ok: res.ok,
      status: res.status,
      contentType: res.headers.get('content-type') || '',
      fileName: (res.headers.get('content-disposition') || '').match(/filename\*?=(?:UTF-8'')?"?([^";]+)/i)?.[1] || '',
      base64: Buffer.concat(chunks).toString('base64'),
    };
  } catch (err) {
    return { ok: false, status: 0, error: err?.name === 'AbortError' ? '요청 시간이 초과되었습니다.' : err?.message };
  } finally {
    clearTimeout(timer);
  }
});

// ☁️ 구글 Apps Script 웹 앱으로 JSON 보내기 (백업 등) — 결과(성공/실패, 파일 주소)를 실제로 확인
ipcMain.handle('proxy-post-json', async (event, rawUrl, body) => {
  if (!isTrustedSender(event)) return { ok: false, status: 0, error: '허용되지 않은 요청입니다.' };
  const check = isAllowedProxyUrl(rawUrl);
  if (!check.ok) return { ok: false, status: 0, error: check.error };
  const host = new URL(check.url).hostname;
  if (host !== 'script.google.com' && host !== 'script.googleusercontent.com') {
    return { ok: false, status: 0, error: '구글 Apps Script 주소만 사용할 수 있습니다.' };
  }
  const text = String(body ?? '');
  if (text.length > 45 * 1024 * 1024) return { ok: false, status: 0, error: '보낼 데이터가 너무 큽니다 (45MB 초과).' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    // Apps Script 는 POST 후 302 로 결과 주소를 돌려줍니다 → 따라가서 JSON 결과를 읽습니다.
    const res = await net.fetch(check.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: text,
      redirect: 'follow',
      signal: controller.signal,
    });
    const out = await res.text();
    return { ok: res.ok, status: res.status, text: out.slice(0, 200000) };
  } catch (err) {
    return { ok: false, status: 0, error: err?.name === 'AbortError' ? '요청 시간이 초과되었습니다.' : err?.message };
  } finally {
    clearTimeout(timer);
  }
});

// 🎵 음악 재생 중에는 macOS App Nap 등으로 앱이 잠들어 재생이 끊기지 않도록 (화면 꺼짐은 허용)
let mediaBlockerId = null;
ipcMain.on('media-playing', (event, on) => {
  if (!isTrustedSender(event)) return;
  try {
    if (on && mediaBlockerId === null) mediaBlockerId = powerSaveBlocker.start('prevent-app-suspension');
    else if (!on && mediaBlockerId !== null) { powerSaveBlocker.stop(mediaBlockerId); mediaBlockerId = null; }
  } catch (e) { log.warn('powerSaveBlocker 실패:', e?.message); }
});

// 💾 안전 백업 파일 저장 (데이터 이전 등 중요한 변경 직전) → <사용자 데이터 폴더>/backups/
ipcMain.handle('save-backup-file', async (event, fileName, content) => {
  if (!isTrustedSender(event)) return { success: false };
  try {
    const safeName = String(fileName || 'backup.json').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
    if (!safeName.endsWith('.json')) return { success: false, error: 'json 파일만 저장할 수 있습니다.' };
    const text = String(content ?? '');
    if (text.length > 200 * 1024 * 1024) return { success: false, error: '백업 데이터가 너무 큽니다.' };
    const dir = path.join(app.getPath('userData'), 'backups');
    fs.mkdirSync(dir, { recursive: true });
    const target = path.join(dir, safeName);
    fs.writeFileSync(target, text, { encoding: 'utf-8', mode: 0o600 });
    log.info(`안전 백업 파일 저장: ${target}`);
    return { success: true, path: target };
  } catch (err) {
    log.error('안전 백업 파일 저장 실패:', err.message);
    return { success: false, error: err.message };
  }
});

// 🔐 OS 보안 저장소 (macOS 키체인 / Windows DPAPI 기반 safeStorage)
const secureStorePath = () => path.join(app.getPath('userData'), 'secure-store.json');
function readSecureStore() {
  try {
    return JSON.parse(fs.readFileSync(secureStorePath(), 'utf-8')) || {};
  } catch {
    return {};
  }
}
function writeSecureStore(obj) {
  try {
    fs.writeFileSync(secureStorePath(), JSON.stringify(obj), { encoding: 'utf-8', mode: 0o600 });
    return true;
  } catch (err) {
    log.error('보안 저장소 기록 실패:', err.message);
    return false;
  }
}
const SECURE_KEY_PATTERN = /^[a-z0-9_.-]{1,64}$/i;

// 🪟 리퀴드 글래스 창 재질 (팔레트의 '바탕화면 비침' 선택)
//  - 흐림(blur): macOS vibrancy / Windows 11(22H2+) acrylic → 바탕화면 색감만 은은하게
//  - 선명(clear): 완전 투명 창 → 바탕화면의 아이콘·글자·다른 창이 그대로 보임
//  - 창 방식은 창을 만들 때 정해지므로, 바꾸면 앱을 다시 시작해야 적용됩니다.
const windowPrefsPath = () => path.join(app.getPath('userData'), 'window-prefs.json');
function readWindowPrefs() {
  try {
    const p = JSON.parse(fs.readFileSync(windowPrefsPath(), 'utf8'));
    return { glassMode: p.glassMode === 'clear' ? 'clear' : 'blur' };
  } catch {
    return { glassMode: 'blur' };
  }
}
const winBuild = process.platform === 'win32' ? parseInt(String(os.release()).split('.')[2] || '0', 10) : 0;
const GLASS_SUPPORT = {
  blur: process.platform === 'darwin' || (process.platform === 'win32' && winBuild >= 22621),
  clear: process.platform === 'darwin' || process.platform === 'win32',
};
const WINDOW_PREFS = readWindowPrefs();
const WINDOW_MATERIAL = (() => {
  if (process.env.CLASSIN_NO_GLASS === '1') return 'none';
  if (WINDOW_PREFS.glassMode === 'clear' && GLASS_SUPPORT.clear) return 'transparent';
  if (GLASS_SUPPORT.blur) return process.platform === 'darwin' ? 'vibrancy' : 'acrylic';
  return 'none';
})();
ipcMain.on('get-window-material', (event) => {
  event.returnValue = isTrustedSender(event) ? WINDOW_MATERIAL : 'none';
});
ipcMain.on('get-window-prefs', (event) => {
  event.returnValue = isTrustedSender(event)
    ? { glassMode: WINDOW_PREFS.glassMode, material: WINDOW_MATERIAL, support: GLASS_SUPPORT }
    : { glassMode: 'blur', material: 'none', support: { blur: false, clear: false } };
});
ipcMain.handle('set-window-prefs', (event, prefs) => {
  if (!isTrustedSender(event)) return { success: false };
  const glassMode = prefs?.glassMode === 'clear' ? 'clear' : 'blur';
  try {
    fs.mkdirSync(app.getPath('userData'), { recursive: true });
    fs.writeFileSync(windowPrefsPath(), JSON.stringify({ glassMode }));
    return { success: true, needsRestart: glassMode !== WINDOW_PREFS.glassMode };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
ipcMain.handle('relaunch-app', (event) => {
  if (!isTrustedSender(event)) return false;
  setTimeout(() => {
    app.relaunch();
    app.exit(0);
  }, 150);
  return true;
});

// ==============================================================================
// 🚪 대시보드 접기 → 바탕화면 미니 루미 문
//  - 접으면 큰 창을 숨기고, 작은 투명 창(루미 문)을 바탕화면 위에 띄웁니다.
//  - 미니 창은 끌어서 옮길 수 있고(위치 기억), 누르면 큰 창이 다시 펼쳐집니다.
// ==============================================================================
let miniWindow = null;
let isQuitting = false;
app.on('before-quit', () => {
  isQuitting = true;
});
const MINI_SIZE = { width: 132, height: 150 };
const miniPosPath = () => path.join(app.getPath('userData'), 'mini-pos.json');
function readMiniPos() {
  try {
    const p = JSON.parse(fs.readFileSync(miniPosPath(), 'utf8'));
    if (Number.isFinite(p.x) && Number.isFinite(p.y)) return p;
  } catch {}
  return null;
}
function defaultMiniPos() {
  const ref = mainWindow && !mainWindow.isDestroyed() ? mainWindow.getBounds() : null;
  const display = ref ? screen.getDisplayMatching(ref) : screen.getPrimaryDisplay();
  const wa = display.workArea;
  return { x: wa.x + wa.width - MINI_SIZE.width - 16, y: wa.y + 16 };
}
function clampToScreen(pos) {
  const display = screen.getDisplayNearestPoint({ x: pos.x + 40, y: pos.y + 40 });
  const wa = display.workArea;
  return {
    x: Math.round(Math.min(Math.max(pos.x, wa.x - 20), wa.x + wa.width - MINI_SIZE.width + 20)),
    y: Math.round(Math.min(Math.max(pos.y, wa.y - 10), wa.y + wa.height - MINI_SIZE.height + 10)),
  };
}
// 📌 접힌 아이콘은 항상 모든 창 위에: 가장 높은 단계로 올리고, 다른 창(전체 화면 프로그램 등)이 덮으면 다시 올려요
let miniTopTimer = null;
function pinMiniOnTop() {
  if (!miniWindow || miniWindow.isDestroyed() || !miniWindow.isVisible()) return;
  miniWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  try {
    miniWindow.moveTop();
  } catch {}
}
function startMiniTopGuard() {
  if (miniTopTimer) clearInterval(miniTopTimer);
  miniTopTimer = setInterval(pinMiniOnTop, 1500);
}
function stopMiniTopGuard() {
  if (miniTopTimer) clearInterval(miniTopTimer);
  miniTopTimer = null;
}
function showMiniWindow() {
  const pos = clampToScreen(readMiniPos() || defaultMiniPos());
  if (!miniWindow || miniWindow.isDestroyed()) {
    miniWindow = new BrowserWindow({
      ...MINI_SIZE,
      x: pos.x,
      y: pos.y,
      frame: false,
      transparent: true,
      resizable: false,
      maximizable: false,
      minimizable: false,
      fullscreenable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      hasShadow: false,
      backgroundColor: '#00000000',
      title: 'Class in',
      webPreferences: SECURE_WEB_PREFERENCES,
    });
    miniWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    miniWindow.setVisibleOnAllWorkspaces?.(true, { visibleOnFullScreen: true });
    miniWindow.on('always-on-top-changed', (_e, isOnTop) => {
      if (!isOnTop) setTimeout(pinMiniOnTop, 50);
    });
    miniWindow.on('blur', () => setTimeout(pinMiniOnTop, 50));
    miniWindow.loadURL(`${appOrigin || 'http://localhost:19283'}/?mode=mini`);
    miniWindow.on('closed', () => {
      stopMiniTopGuard();
      miniWindow = null;
      // 미니 창이 닫히면 큰 창을 다시 보여 줌 (앱이 사라지지 않도록)
      if (!isQuitting && mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) restoreFromMini();
    });
  } else {
    miniWindow.setPosition(pos.x, pos.y);
    miniWindow.webContents.send('mini-shown');
  }
  miniWindow.showInactive();
  pinMiniOnTop();
  startMiniTopGuard();
}
function restoreFromMini() {
  // 미니 문 위치(큰 창 기준 좌표)를 알려 주면 그 자리에서 대시보드가 펼쳐져 나옴
  let from = null;
  if (miniWindow && !miniWindow.isDestroyed() && mainWindow && !mainWindow.isDestroyed()) {
    const [mx, my] = miniWindow.getPosition();
    const cb = mainWindow.getContentBounds();
    from = { x: mx - cb.x + MINI_SIZE.width / 2, y: my - cb.y + MINI_SIZE.height / 2 };
  }
  stopMiniTopGuard();
  if (miniWindow && !miniWindow.isDestroyed()) miniWindow.hide();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('mini-restored', from);
  }
}
ipcMain.handle('mini-enter', (event) => {
  if (!isTrustedSender(event) || !mainWindow) return false;
  showMiniWindow();
  setTimeout(() => mainWindow && !mainWindow.isDestroyed() && mainWindow.hide(), 60);
  return true;
});
ipcMain.handle('mini-restore', (event) => {
  if (!isTrustedSender(event)) return false;
  restoreFromMini();
  return true;
});
ipcMain.on('mini-move', (event, x, y) => {
  if (!isTrustedSender(event) || !miniWindow || miniWindow.isDestroyed()) return;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const pos = clampToScreen({ x, y });
  miniWindow.setPosition(pos.x, pos.y);
});
ipcMain.on('mini-move-end', (event) => {
  if (!isTrustedSender(event) || !miniWindow || miniWindow.isDestroyed()) return;
  const [x, y] = miniWindow.getPosition();
  try {
    fs.writeFileSync(miniPosPath(), JSON.stringify({ x, y }));
  } catch {}
});
ipcMain.on('mini-get-position', (event) => {
  event.returnValue = isTrustedSender(event) && miniWindow && !miniWindow.isDestroyed() ? miniWindow.getPosition() : [0, 0];
});

ipcMain.on('secure-store-available', (event) => {
  event.returnValue = isTrustedSender(event) && safeStorage.isEncryptionAvailable();
});
ipcMain.on('secure-store-get', (event, key) => {
  event.returnValue = '';
  if (!isTrustedSender(event) || !SECURE_KEY_PATTERN.test(key) || !safeStorage.isEncryptionAvailable()) return;
  const enc = readSecureStore()[key];
  if (!enc) return;
  try {
    event.returnValue = safeStorage.decryptString(Buffer.from(enc, 'base64'));
  } catch (err) {
    log.warn('보안 저장소 복호화 실패:', err.message);
  }
});
ipcMain.on('secure-store-set', (event, key, value) => {
  event.returnValue = false;
  if (!isTrustedSender(event) || !SECURE_KEY_PATTERN.test(key) || !safeStorage.isEncryptionAvailable()) return;
  const store = readSecureStore();
  if (value) store[key] = safeStorage.encryptString(String(value)).toString('base64');
  else delete store[key];
  event.returnValue = writeSecureStore(store);
});
ipcMain.on('secure-store-remove', (event, key) => {
  event.returnValue = false;
  if (!isTrustedSender(event) || !SECURE_KEY_PATTERN.test(key)) return;
  const store = readSecureStore();
  delete store[key];
  event.returnValue = writeSecureStore(store);
});

// 🔄 수동 재시작 및 업데이트 적용 IPC 핸들러
ipcMain.on('restart-and-install', () => {
  if (autoUpdater) {
    log.info('사용자 요청으로 새 버전 재시작 및 설치를 진행합니다.');
    autoUpdater.quitAndInstall();
  } else {
    log.warn('autoUpdater가 초기화되지 않아 재시작 및 설치를 진행할 수 없습니다.');
  }
});

/**
 * 🌐 [내장 로컬 HTTP 서버]
 * file:// 프로토콜 대신 http://localhost:19283으로 정적 빌드 파일을 서빙하여
 * 유튜브 Iframe의 '152-4' 및 origin 검증 오류를 근본적으로 원천 차단합니다.
 */
function startLocalServer(distPath) {
  return new Promise((resolve) => {
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.mjs': 'text/javascript; charset=utf-8',
      '.bcmap': 'application/octet-stream',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.webmanifest': 'application/manifest+json',
    };

    const server = http.createServer((req, res) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405);
        res.end();
        return;
      }
      // 🛡️ 루트(dist) 밖 경로 접근(../) 차단
      let filePath = resolveSafeStaticPath(distPath, req.url);
      if (!filePath) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('403 Forbidden');
        return;
      }
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(distPath, 'index.html');
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
      });
      const stream = fs.createReadStream(filePath);
      // 파일을 읽다 실패해도 앱이 멈추지 않게
      stream.on('error', (err) => {
        recordMainError('static-file', err);
        try {
          res.destroy();
        } catch {}
      });
      stream.pipe(res);
    });

    // 고정 포트 19283 우선 바인딩 (localStorage 영구 보존 보장)
    server.listen(19283, '127.0.0.1', () => {
      log.info('내장 로컬 HTTP 서버 기동 성공: http://localhost:19283');
      resolve('http://localhost:19283');
    }).on('error', (err) => {
      log.warn(`19283 포트 사용 중 (${err.message}). 동적 포트(0)로 폴백합니다.`);
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        log.info(`내장 로컬 HTTP 서버 동적 바인딩 성공: http://localhost:${port}`);
        resolve(`http://localhost:${port}`);
      });
    });
  });
}

// 🛡️ 모든 창(메인·보조 모니터 팝업)에 공통 적용되는 보안 설정
const SECURE_WEB_PREFERENCES = {
  webSecurity: true, // 동일 출처 정책 유지 (CORS 미지원 자료는 proxy-fetch-text 로 대리 요청)
  allowRunningInsecureContent: false,
  nodeIntegration: false,
  nodeIntegrationInSubFrames: false,
  contextIsolation: true,
  sandbox: true,
  webviewTag: false,
  spellcheck: false,
  preload: path.join(__dirname, 'preload.cjs'),
};

// 🎰 자리 뽑기 창: 마지막 위치 · 크기 기억 (그 모니터가 아직 연결돼 있으면 그 자리에서 다시 열기)
const seatDrawStateFile = () => path.join(app.getPath('userData'), 'seatdraw-window.json');
function seatDrawBounds(opener) {
  try {
    const saved = JSON.parse(fs.readFileSync(seatDrawStateFile(), 'utf8'));
    if (saved && saved.width > 400 && saved.height > 300) {
      const d = screen.getDisplayMatching(saved);
      const wa = d.workArea;
      // 화면 밖으로 벗어나지 않았을 때만 그대로
      if (saved.x >= wa.x - 40 && saved.y >= wa.y - 40 && saved.x + saved.width <= wa.x + wa.width + 40 && saved.y + saved.height <= wa.y + wa.height + 40) {
        return { x: saved.x, y: saved.y, width: saved.width, height: saved.height };
      }
    }
  } catch {}
  const ref = opener && !opener.isDestroyed() ? opener.getBounds() : null;
  const wa = (ref ? screen.getDisplayMatching(ref) : screen.getPrimaryDisplay()).workArea;
  const width = Math.round(Math.min(wa.width * 0.9, Math.max(1100, wa.width * 0.8)));
  const height = Math.round(Math.min(wa.height * 0.9, width * 0.5625 + 40));
  return { x: Math.round(wa.x + (wa.width - width) / 2), y: Math.round(wa.y + (wa.height - height) / 2), width, height };
}
function rememberSeatDrawWindow(win) {
  const save = () => {
    try {
      if (win.isDestroyed() || win.isFullScreen() || win.isMinimized()) return;
      const nb = win.isMaximized() ? win.getNormalBounds() : win.getBounds();
      fs.writeFileSync(seatDrawStateFile(), JSON.stringify(nb));
    } catch {}
  };
  win.on('moved', save);
  win.on('resized', save);
  win.on('close', save);
}
// 🖥 자리 뽑기 창을 다음 모니터로 (전체 화면이면 그 모니터에서 다시 전체 화면)
ipcMain.handle('seatdraw-next-display', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { ok: false };
  const displays = screen.getAllDisplays();
  if (displays.length < 2) return { ok: false, count: displays.length };
  const cur = screen.getDisplayMatching(win.getBounds());
  const idx = Math.max(0, displays.findIndex((d) => d.id === cur.id));
  const next = displays[(idx + 1) % displays.length];
  const wasFull = win.isFullScreen();
  const wasMax = win.isMaximized();
  if (wasFull) {
    await new Promise((res) => {
      win.once('leave-full-screen', res);
      win.setFullScreen(false);
      setTimeout(res, 1500);
    });
  }
  if (wasMax) win.unmaximize();
  const b = win.getBounds();
  const wa = next.workArea;
  const width = Math.min(b.width, wa.width);
  const height = Math.min(b.height, wa.height);
  win.setBounds({ x: Math.round(wa.x + (wa.width - width) / 2), y: Math.round(wa.y + (wa.height - height) / 2), width, height });
  if (wasMax) win.maximize();
  if (wasFull) setTimeout(() => !win.isDestroyed() && win.setFullScreen(true), 350);
  return { ok: true, count: displays.length, index: (idx + 1) % displays.length };
});
ipcMain.on('seatdraw-display-count', (event) => {
  try {
    event.returnValue = screen.getAllDisplays().length;
  } catch {
    event.returnValue = 1;
  }
});
ipcMain.handle('seatdraw-toggle-fullscreen', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return false;
  win.setFullScreen(!win.isFullScreen());
  return !win.isFullScreen();
});

// 🛡️ 모든 webContents 공통 가드: 외부 사이트는 앱 창이 아닌 기본 브라우저로 엽니다.
app.on('web-contents-created', (_event, contents) => {
  contents.on('did-create-window', (win, details) => {
    try {
      if (/[?&]mode=seatdraw/.test(details?.url || '')) rememberSeatDrawWindow(win);
    } catch {}
  });
  contents.setWindowOpenHandler(({ url }) => {
    if (popupContentsIds.has(contents.id)) {
      // 팝업 창 안의 사이트가 여는 새 창은 같은 팝업 세션으로 허용 (http/https 만)
      if (/^https?:/i.test(url)) return { action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true, webPreferences: POPUP_WEB_PREFERENCES } };
      return { action: 'deny' };
    }
    if (isAppUrl(url)) {
      // 🎰 자리 뽑기는 움직일 수 있는 일반 창으로 (원하는 모니터로 끌어다 두고 그 화면에서 전체 화면)
      if (/[?&]mode=seatdraw/.test(url)) {
        const opener = BrowserWindow.fromWebContents(contents);
        const b = seatDrawBounds(opener);
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            ...b,
            title: '두근두근 자리 뽑기',
            autoHideMenuBar: true,
            fullscreen: false,
            fullscreenable: true,
            resizable: true,
            movable: true,
            minimizable: true,
            maximizable: true,
            minWidth: 960,
            minHeight: 560,
            backgroundColor: '#fdf8ff',
            webPreferences: { ...SECURE_WEB_PREFERENCES, autoplayPolicy: 'no-user-gesture-required' },
          },
        };
      }
      // 앱 자체 화면(보조 모니터 송출, 인쇄 미리보기 등)은 같은 보안 설정으로 새 창 허용
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true,
          backgroundColor: '#0f172a',
          webPreferences: SECURE_WEB_PREFERENCES,
        },
      };
    }
    if (isSafeExternalUrl(url)) {
      shell.openExternal(url).catch((err) => log.warn('외부 링크 열기 실패:', err.message));
    } else {
      log.warn(`허용되지 않은 새 창 요청 차단: ${url}`);
    }
    return { action: 'deny' };
  });

  // 앱 창이 외부 사이트로 이동하는 것을 차단 (이동 대신 기본 브라우저로 열기)
  const blockForeignNavigation = (event, url) => {
    if (popupContentsIds.has(contents.id)) {
      if (/^https?:/i.test(url)) return; // 팝업 창은 웹사이트 안 이동 허용
      event.preventDefault();
      return;
    }
    if (isAppUrl(url)) return;
    event.preventDefault();
    if (isSafeExternalUrl(url)) shell.openExternal(url).catch(() => {});
    log.warn(`앱 창의 외부 이동 차단 → 기본 브라우저로 열기: ${url}`);
  };
  contents.on('will-navigate', blockForeignNavigation);
  contents.on('will-redirect', (event, url, _isInPlace, isMainFrame) => {
    if (isMainFrame) blockForeignNavigation(event, url);
  });

  // webview 태그 사용 차단
  contents.on('will-attach-webview', (event) => event.preventDefault());
});

// 🖥️ 메인 윈도우 생성 함수
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1024,
    minHeight: 700,
    title: IS_PREVIEW ? 'Class in (미리보기)' : 'Class in',
    icon: path.join(__dirname, '..', 'public', 'icon.png'),
    // 리퀴드 글래스: 페이지의 투명한 부분으로 바탕화면이 흐리게 비칩니다 (팔레트의 '대시보드 배경 투명도'로 조절)
    backgroundColor: WINDOW_MATERIAL === 'none' ? '#0f172a' : '#00000000',
    ...(WINDOW_MATERIAL === 'vibrancy' ? { vibrancy: 'under-window', visualEffectState: 'active' } : {}),
    ...(WINDOW_MATERIAL === 'acrylic' ? { backgroundMaterial: 'acrylic' } : {}),
    ...(WINDOW_MATERIAL === 'transparent' ? { transparent: true, hasShadow: true } : {}),
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: { ...SECURE_WEB_PREFERENCES, backgroundThrottling: false },
  });

  // 미리보기 창은 제목에 '(미리보기)'를 유지해 설치된 앱과 구분
  if (IS_PREVIEW) mainWindow.on('page-title-updated', (e) => e.preventDefault());

  // 상단 네이티브 메뉴바
  //  - Windows/Linux: 메뉴바 제거 (깔끔한 화면 · Ctrl+C/V 등은 Chromium 이 그대로 처리)
  //  - macOS: 맥 표준 키(⌘C·⌘V·⌘X·⌘A · ⌘H · ⌘M · ⌘Q · ⌃⌘F 전체화면)가 동작하도록 최소 메뉴를 둬요.
  //    ⚠️ ⌘R(새로고침) · ⌥⌘I(개발자 도구) · ⌘+/-(배율) 같은 기본 메뉴는 수업 중 실수로 눌리지 않게 넣지 않아요.
  //    ⌘Z / ⇧⌘Z 는 글 입력 중이면 글자 되돌리기, 아니면 앱의 위젯 배치 · 판서 되돌리기로 보내요.
  if (process.platform === 'darwin') {
    const routeUndo = (redo) => (_item, win) => {
      const wc = (win || BrowserWindow.getFocusedWindow())?.webContents;
      if (!wc) return;
      wc.executeJavaScript(
        `(() => { const a = document.activeElement; const typing = !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable);
          if (!typing) window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', code: 'KeyZ', metaKey: true, shiftKey: ${redo ? 'true' : 'false'}, bubbles: true, cancelable: true }));
          return typing; })()`
      ).then((typing) => {
        if (typing) (redo ? wc.redo() : wc.undo());
      }).catch(() => {});
    };
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        {
          label: app.name,
          submenu: [
            { role: 'about', label: 'Class in 정보' },
            { type: 'separator' },
            { role: 'hide', label: 'Class in 가리기' },
            { role: 'hideOthers', label: '기타 가리기' },
            { role: 'unhide', label: '모두 보기' },
            { type: 'separator' },
            { role: 'quit', label: 'Class in 종료' },
          ],
        },
        {
          label: '편집',
          submenu: [
            { label: '실행 취소', accelerator: 'CmdOrCtrl+Z', click: routeUndo(false) },
            { label: '실행 복귀', accelerator: 'Shift+CmdOrCtrl+Z', click: routeUndo(true) },
            { type: 'separator' },
            { role: 'cut', label: '오려두기' },
            { role: 'copy', label: '복사하기' },
            { role: 'paste', label: '붙여넣기' },
            { role: 'pasteAndMatchStyle', label: '스타일 없이 붙여넣기' },
            { role: 'selectAll', label: '전체 선택' },
          ],
        },
        { label: '보기', submenu: [{ role: 'togglefullscreen', label: '전체화면 켜기/끄기' }] },
        { role: 'windowMenu', label: '윈도우' },
      ])
    );
  } else {
    Menu.setApplicationMenu(null);
  }

  // 로컬 개발 서버 또는 내장 로컬 HTTP 서버 로드
  const isDev = !IS_PREVIEW && (process.env.NODE_ENV === 'development' || !app.isPackaged);

  if (isDev) {
    log.info('개발 모드로 실행합니다. http://localhost:3000 접속 시도 중...');
    appOrigin = 'http://localhost:3000';
    mainWindow.loadURL('http://localhost:3000').catch(async (err) => {
      log.warn(`로컬 개발 서버 접속 실패 (${err.message}). 내장 로컬 HTTP 서버를 기동합니다.`);
      try {
        const localUrl = await startLocalServer(path.join(__dirname, '..', 'dist'));
        appOrigin = new URL(localUrl).origin;
        mainWindow.loadURL(localUrl);
      } catch (loadErr) {
        log.error('정적 파일 로드 폴백 시도:', loadErr.message);
        appOrigin = null;
        mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
      }
    });
  } else {
    log.info('프로덕션 모드로 실행합니다. 내장 로컬 HTTP 서버를 기동합니다.');
    try {
      const localUrl = await startLocalServer(path.join(__dirname, '..', 'dist'));
      appOrigin = new URL(localUrl).origin;
      log.info(`내장 로컬 HTTP 서버 로드: ${localUrl}`);
      mainWindow.loadURL(localUrl);
    } catch (err) {
      log.error('내장 서버 기동 실패, 파일 직접 로드 시도:', err.message);
      appOrigin = null;
      mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    }
  }

  // F11 키로 전체화면 토글 (Windows · Linux / 맥은 ⌃⌘F — 맥의 F11 은 '바탕화면 보기' 시스템 키)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (process.platform !== 'darwin' && input.key === 'F11' && input.type === 'keyDown') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ==============================================================================
// 🚀 GitHub 기반 자동 업데이트 (electron-updater) 라이프사이클 구성
// ==============================================================================
function initAutoUpdater() {
  // 배포 서버(GitHub 저장소)가 설정된 빌드에서만 동작합니다. (app-update.yml 이 없으면 건너뜀)
  const updateConfig = path.join(process.resourcesPath || '', 'app-update.yml');
  if (!app.isPackaged || !fs.existsSync(updateConfig)) {
    log.info('자동 업데이트 서버가 설정되지 않은 빌드입니다. 업데이트 검사를 건너뜁니다.');
    return;
  }
  if (!autoUpdater) {
    log.warn('electron-updater 모듈이 없어 자동 업데이트 검사를 건너뜁니다.');
    return;
  }

  // 🍎 Mac 은 Apple 개발자 인증서 없이 자동 설치가 안 돼서 '새 버전 알림 → 다운로드 페이지 열기' 로 안내해요.
  // 🪟 Windows 는 몰래 내려받아 두었다가 다시 시작할 때 설치해요.
  const isMac = process.platform === 'darwin';
  const RELEASE_PAGE = 'https://github.com/EteacherJ/class-in/releases/latest';
  autoUpdater.autoDownload = !isMac;
  autoUpdater.autoInstallOnAppQuit = !isMac;
  let macNotified = '';

  // 업데이트 확인 시작
  autoUpdater.on('checking-for-update', () => {
    log.info('GitHub 저장소에서 최신 릴리스를 확인하고 있습니다...');
  });

  // 업데이트 발견 이벤트
  autoUpdater.on('update-available', (info) => {
    log.info(`🟢 새로운 업데이트 발견! 버전: ${info.version}`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-available', info);
    }
    if (isMac && macNotified !== info.version) {
      macNotified = info.version;
      dialog
        .showMessageBox(mainWindow, {
          type: 'info',
          title: 'Class in 새 버전',
          message: `새 버전 v${info.version} 이 나왔어요.`,
          detail: `지금 쓰는 버전: v${app.getVersion()}\n[다운로드 페이지 열기]를 누르고 mac-arm64.zip 파일을 받아 압축을 푼 뒤, 응용 프로그램 폴더의 Class in 을 바꿔 주세요.`,
          buttons: ['다운로드 페이지 열기', '나중에'],
          defaultId: 0,
          cancelId: 1,
        })
        .then((r) => {
          if (r.response === 0) shell.openExternal(RELEASE_PAGE);
        })
        .catch(() => {});
    }
  });

  // 최신 버전 유지 중
  autoUpdater.on('update-not-available', (info) => {
    log.info(`현재 최신 버전을 사용 중입니다. (버전: ${info.version})`);
  });

  // 다운로드 진행률 로깅 및 렌더러 전송
  autoUpdater.on('download-progress', (progressObj) => {
    const percent = Math.round(progressObj.percent);
    log.info(`🔵 업데이트 다운로드 진행률: ${percent}% (${Math.round(progressObj.bytesPerSecond / 1024)} KB/s)`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download-progress', progressObj);
    }
  });

  // 다운로드 완료 시 네이티브 확인 다이얼로그 띄우기
  autoUpdater.on('update-downloaded', (info) => {
    log.info(`🟢 업데이트 패키지 다운로드 완료! 버전: ${info.version}`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-downloaded', info);
    }

    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: 'Class in 업데이트 완료',
        message: '새로운 업데이트가 준비되었습니다. 지금 다시 시작하시겠습니까?',
        detail: `최신 버전: v${info.version}\n재시작 시 새 버전으로 자동 교체됩니다.`,
        buttons: ['지금 다시 시작', '나중에'],
        defaultId: 0,
        cancelId: 1,
      })
      .then((result) => {
        if (result.response === 0) {
          log.info('사용자가 재시작을 승인하여 앱 종료 및 업데이트 설치를 시작합니다.');
          autoUpdater.quitAndInstall();
        }
      })
      .catch((err) => {
        log.error('업데이트 다이얼로그 오류:', err.message);
      });
  });

  // 오류 처리
  autoUpdater.on('error', (err) => {
    log.warn(`🟡 자동 업데이트 확인/다운로드 중 오류: ${err.message}`);
  });

  // 앱 시작 3초 후 백그라운드에서 자동 업데이트 검사 실행
  const check = () => {
    const run = isMac ? autoUpdater.checkForUpdates() : autoUpdater.checkForUpdatesAndNotify();
    Promise.resolve(run).catch((err) => log.warn(`자동 업데이트 검사 실패: ${err.message}`));
  };
  setTimeout(() => {
    log.info('앱 초기화 3초 경과: 백그라운드 자동 업데이트 검사를 시작합니다.');
    check();
  }, 3000);
  // 켜 둔 채로 하루를 보내도 새 버전을 알 수 있게 6시간마다 다시 확인
  setInterval(check, 6 * 60 * 60 * 1000);
}

// Electron 앱 라이프사이클
app.whenReady().then(() => {
  // 🎬 유튜브 Iframe 오류 152-4 해결 및 X-Frame-Options/Referer/Origin 완전 우회 (googlevideo.com CDN 403 차단 방지)
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const requestHeaders = { ...details.requestHeaders };
    // 주의: googlevideo.com(실제 비디오 스트림)은 절대 건드리지 않아야 403 Forbidden(검은 화면)이 발생하지 않습니다.
    if (
      (details.url.includes('youtube.com/embed') || details.url.includes('youtube-nocookie.com/embed'))
    ) {
      requestHeaders['Referer'] = 'http://localhost:19283/';
      requestHeaders['Origin'] = 'http://localhost:19283';
    }
    callback({ cancel: false, requestHeaders });
  });

  // 🛡️ 응답 헤더 처리
  //  - 유튜브 임베드 응답에 한해서만 X-Frame-Options/CSP 제거 (기존 152-4 오류 대응 유지)
  //  - 앱 자체 화면에는 CSP(콘텐츠 보안 정책)를 부여하여 외부 스크립트 주입을 차단
  const YOUTUBE_HOST = /(^|\.)(youtube\.com|youtube-nocookie\.com)$/i;
  const APP_CSP = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com",
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fastly.jsdelivr.net https://fonts.googleapis.com",
    "font-src 'self' data: https://cdn.jsdelivr.net https://fastly.jsdelivr.net https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob: https:",
    "connect-src 'self' https:",
    "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https:",
  ].join('; ');

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    let host = '';
    try {
      host = new URL(details.url).hostname;
    } catch {}

    if (YOUTUBE_HOST.test(host) && details.resourceType === 'subFrame') {
      for (const key of Object.keys(responseHeaders)) {
        const lower = key.toLowerCase();
        if (lower === 'x-frame-options' || lower.startsWith('content-security-policy')) {
          delete responseHeaders[key];
        }
      }
    } else if ((app.isPackaged || IS_PREVIEW) && appOrigin && details.resourceType === 'mainFrame' && isAppUrl(details.url)) {
      responseHeaders['Content-Security-Policy'] = [APP_CSP];
    }
    callback({ cancel: false, responseHeaders });
  });

  // 🛡️ 권한 요청: 앱 자체 화면에서 필요한 권한만 허용 (소음측정 마이크, 전체화면, 알림, 위치 등)
  const ALLOWED_PERMISSIONS = new Set([
    'media', 'fullscreen', 'notifications', 'clipboard-sanitized-write', 'clipboard-read',
    'geolocation', 'speaker-selection', 'window-management', 'audioCapture',
  ]);
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback, details) => {
    const origin = details?.requestingUrl || wc?.getURL?.() || '';
    callback(ALLOWED_PERMISSIONS.has(permission) && isAppUrl(origin));
  });
  session.defaultSession.setPermissionCheckHandler((_wc, permission, requestingOrigin) => {
    return ALLOWED_PERMISSIONS.has(permission) && isAppUrl(requestingOrigin);
  });

  createWindow();
  initAutoUpdater();

  app.on('activate', () => {
    // 맥 Dock 아이콘을 누르면: 접혀 있던 대시보드를 다시 펼침
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      restoreFromMini();
      return;
    }
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    process.exit(0);
  }
});
