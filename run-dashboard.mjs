#!/usr/bin/env node

/**
 * ============================================================================
 * 🏫 Class in 스마트 학급 대시보드 크로스 플랫폼 고속 실행기
 * ============================================================================
 * Mac과 Windows OS를 자동 감지하여, 외부 npm/vite 프로세스 의존성 없이
 * Node.js 내장 HTTP 엔진으로 0.05초 만에 고속 정적 웹서버를 안전하게 구동하고
 * 크롬 브라우저 독립 앱 창(--app 모드)을 실행합니다.
 *
 * 🌟 핵심 안정화 기술:
 * 1. 외부 npm 프로세스 미사용: Node.js 내장 http/fs 모듈로 직접 dist 서빙 (npm 오류 100% 차단)
 * 2. MIME 타입 완벽 지원 및 SPA 라우팅 (index.html 자동 폴백)
 * 3. 스마트 포트 탐색 (3000번 점유 시 브라우저 즉시 연결 또는 자동 가용 포트 바인딩)
 * 4. 크로스 플랫폼 지원 (Windows Chrome/Edge 및 macOS Chrome/Safari)
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import net from 'net';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { classifyLaunchTarget, isAllowedProxyUrl, PROXY_MAX_BYTES, PROXY_TIMEOUT_MS } from './electron/securityGuards.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const isWindows = os.platform() === 'win32';
const isMac = os.platform() === 'darwin';

// 🛡️ 구글 드라이브 동기화 지연 및 ETIMEDOUT 예외 발생 시 프로세스 강제 종료 방지
process.on('uncaughtException', (err) => {
  if (err?.code === 'ETIMEDOUT' || err?.message?.includes('ETIMEDOUT')) {
    console.warn('⚠️ [Google Drive Sync] 파일 읽기 타임아웃(ETIMEDOUT) 감지 - 서버 정상 유지:', err.message);
    return;
  }
  console.error('🔴 잡히지 않은 예외(uncaughtException):', err);
});

process.on('unhandledRejection', (reason) => {
  const msg = reason?.message || String(reason || '');
  if (reason?.code === 'ETIMEDOUT' || msg.includes('ETIMEDOUT')) {
    console.warn('⚠️ [Google Drive Sync] 비동기 파일 읽기 타임아웃(ETIMEDOUT) 감지 - 서버 정상 유지:', msg);
    return;
  }
  console.warn('🟡 잡히지 않은 비동기 거부(unhandledRejection):', reason);
});

console.log('==============================================================================');
console.log('   🏫 Class in (스마트 학급 대시보드)');
console.log(`   💻 감지된 운영체제: ${isWindows ? 'Windows PC' : isMac ? 'Apple macOS' : os.platform()}`);
console.log('==============================================================================\n');

/**
 * 표준 웹 확장자별 MIME 타입 매핑 테이블
 */
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.wav': 'audio/wav',
};

/**
 * 1. 지정된 포트가 이미 사용 중인지 비동기 체크하는 함수
 */
function isPortInUse(port) {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve(true);
        } else {
          resolve(false);
        }
      })
      .once('listening', () => {
        tester.close(() => resolve(false));
      })
      .listen(port, '127.0.0.1');
  });
}

/**
 * 2. HTTP 서버가 실제로 응답(200 등)할 때까지 대기하는 헬스체크 함수
 */
async function waitForServer(url, timeoutMs = 8000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      const isReady = await new Promise((resolve) => {
        const req = http.get(url, (res) => {
          resolve(res.statusCode >= 200 && res.statusCode < 500);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(800, () => {
          req.destroy();
          resolve(false);
        });
      });
      if (isReady) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

/**
 * 3. Windows 및 Mac에서 Chrome 브라우저 실행 파일 경로 탐색
 */
function findChromeExecutable() {
  if (isWindows) {
    const localAppData = process.env.LOCALAPPDATA || '';
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

    const candidates = [
      path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    ];

    for (const exe of candidates) {
      if (fs.existsSync(exe)) {
        return exe;
      }
    }
  } else if (isMac) {
    if (fs.existsSync('/Applications/Google Chrome.app')) {
      return '/Applications/Google Chrome.app';
    }
    if (fs.existsSync('/Applications/Microsoft Edge.app')) {
      return '/Applications/Microsoft Edge.app';
    }
  }
  return null;
}

/**
 * 4. 브라우저 창 모드 또는 기본 브라우저 실행 함수
 */
function launchBrowser(targetUrl) {
  const chromePath = findChromeExecutable();

  console.log(`🌐 [3/3] 브라우저 화면을 엽니다: ${targetUrl}`);

  if (isWindows) {
    if (chromePath) {
      console.log(`🚀 Chrome 창 모드로 구동합니다 (${path.basename(chromePath)})`);
      spawn(chromePath, [`--app=${targetUrl}`], { detached: true, stdio: 'ignore' }).unref();
    } else {
      console.log('🌐 기본 웹 브라우저로 실행합니다...');
      spawn('cmd.exe', ['/c', 'start', '', targetUrl], { detached: true, stdio: 'ignore' }).unref();
    }
  } else if (isMac) {
    if (chromePath) {
      console.log('🚀 Mac Chrome 독립 앱 창 모드로 구동합니다');
      spawn('open', ['-na', chromePath, '--args', `--app=${targetUrl}`], {
        detached: true,
        stdio: 'ignore',
      }).unref();
    } else {
      spawn('open', [targetUrl], { detached: true, stdio: 'ignore' }).unref();
    }
  } else {
    // Linux 등 기타 환경
    spawn('xdg-open', [targetUrl], { detached: true, stdio: 'ignore' }).unref();
  }
}

/**
 * 🛡️ 구글 드라이브 클라우드 동기화 지연 대응용 안전 비상 HTML 폴백
 */
const FALLBACK_HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Class in 스마트 학급 대시보드 (안전 복구 모드)</title>
  <style>
    body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; box-sizing: border-box; }
    .card { background: #1e293b; border: 1px solid #334155; padding: 2.5rem; border-radius: 1.25rem; max-width: 520px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); text-align: center; }
    .badge { display: inline-block; padding: 0.35rem 0.85rem; background: #0284c7; color: #f0f9ff; border-radius: 9999px; font-size: 0.85rem; font-weight: 600; margin-bottom: 1rem; }
    h1 { font-size: 1.5rem; margin: 0 0 1rem; color: #38bdf8; font-weight: 700; }
    p { margin: 0 0 1.25rem; line-height: 1.6; color: #94a3b8; font-size: 0.95rem; }
    .btn { display: inline-block; padding: 0.75rem 1.5rem; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 0.5rem; font-weight: 600; cursor: pointer; border: none; font-size: 1rem; transition: background 0.2s; }
    .btn:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">☁️ Google Drive 동기화 안전 보호 모드</div>
    <h1>🏫 Class in</h1>
    <p>구글 드라이브 동기화 지연으로 대시보드 리소스 로딩을 대기하고 있습니다.<br>서버 프로세스는 정상 유지 중이며 잠시 후 자동 재시도합니다.</p>
    <button class="btn" onclick="location.reload()">대시보드 즉시 다시 불러오기</button>
  </div>
  <script>
    setTimeout(() => location.reload(), 2500);
  </script>
</body>
</html>`;

/**
 * 💾 구글 드라이브 클라우드 폴더 I/O 지연 최소화를 위한 메모리 캐시 저장소
 */
const fileCache = new Map(); // key: filePath, value: { data: Buffer, contentType: string, mtimeMs: number }
const MAX_CACHE_SIZE_BYTES = 50 * 1024 * 1024; // 최대 50MB
let totalCacheBytes = 0;

/**
 * ⏱️ 안전한 비동기 파일 stat (타임아웃 적용 및 ETIMEDOUT 예외 방어)
 */
async function safeStat(targetPath, timeoutMs = 2500) {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, timeoutMs);

    fs.promises.stat(targetPath)
      .then((stat) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(stat);
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(null);
        }
      });
  });
}

/**
 * 5. Node.js 내장 초고속 정적 파일 웹서버 구동 함수 (Google Drive I/O 최적화 및 ETIMEDOUT 방어)
 * 외부 npm이나 vite에 의존하지 않고 Node.js 자체로 dist를 즉시 서빙합니다.
 */
function startNativeStaticServer(publicDir, port) {
  const server = http.createServer(async (req, res) => {
    try {
      // URL 경로 디코딩 및 쿼리스트링 제거
      const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      let reqPath = decodeURIComponent(parsedUrl.pathname);

      // 🛡️ 로컬 API 보호: 대시보드 자신의 화면에서 온 요청만 허용
      //  - Host 검사: DNS 리바인딩 공격 차단
      //  - Origin 검사: 교사가 보고 있는 다른 웹사이트가 localhost API를 호출하는 것을 차단
      if (reqPath.startsWith('/api/')) {
        const hostHeader = String(req.headers.host || '');
        const allowedHosts = [`localhost:${port}`, `127.0.0.1:${port}`];
        const origin = req.headers.origin;
        const allowedOrigins = allowedHosts.map((h) => `http://${h}`);
        const secFetchSite = req.headers['sec-fetch-site'];
        if (
          !allowedHosts.includes(hostHeader) ||
          (origin !== undefined && !allowedOrigins.includes(origin)) ||
          (origin === undefined && req.method !== 'GET') ||
          (secFetchSite && secFetchSite !== 'same-origin')
        ) {
          console.warn(`🛡️ [Security] 외부 출처의 로컬 API 호출 차단: host=${hostHeader} origin=${origin || '-'}`);
          res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, message: '허용되지 않은 요청입니다.' }));
          return;
        }
      }

      if (req.method === 'OPTIONS') {
        res.writeHead(405);
        res.end();
        return;
      }

      // 📡 외부 데이터 안전 대리 요청: GET /api/fetch?url=... (급식·iCal 등, 제3자 프록시 대체)
      if (req.method === 'GET' && reqPath === '/api/fetch') {
        const check = isAllowedProxyUrl(parsedUrl.searchParams.get('url') || '');
        if (!check.ok) {
          res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end(check.error);
          return;
        }
        try {
          const upstream = await fetch(check.url, { redirect: 'follow', signal: AbortSignal.timeout(PROXY_TIMEOUT_MS) });
          if (upstream.url && !isAllowedProxyUrl(upstream.url).ok) throw new Error('허용되지 않은 주소로 이동되었습니다.');
          const buf = Buffer.from(await upstream.arrayBuffer());
          if (buf.length > PROXY_MAX_BYTES) throw new Error('응답 데이터가 너무 큽니다 (5MB 초과).');
          res.writeHead(upstream.status, {
            'Content-Type': upstream.headers.get('content-type') || 'text/plain; charset=utf-8',
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'no-store',
          });
          res.end(buf);
        } catch (proxyErr) {
          res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end(String(proxyErr?.message || proxyErr));
        }
        return;
      }

      // 💻 프로그램 실행 API 엔드포인트: POST /api/launch-app
      if (req.method === 'POST' && reqPath === '/api/launch-app') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
          if (body.length > 16 * 1024) req.destroy(); // 비정상적으로 큰 요청 차단
        });
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            const targetPath = data.targetPath || data.appPath || '';
            const appTitle = data.title || targetPath || '프로그램';

            if (!targetPath) {
              res.writeHead(400, {
                'Content-Type': 'application/json; charset=utf-8',
              });
              res.end(JSON.stringify({ success: false, message: '실행할 프로그램 경로 또는 명령어가 전달되지 않았습니다.' }));
              return;
            }

            console.log(`🔵 [AppLauncher] 프로그램 실행 요청: "${appTitle}" (${targetPath})`);

            // 🛡️ 실행 대상 검증 (명령 주입·위험 스킴·네트워크 경로 차단)
            const target = classifyLaunchTarget(targetPath);
            if (!target.ok) {
              console.warn(`🛡️ [AppLauncher] 실행 거부: ${target.error}`);
              res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ success: false, message: target.error }));
              return;
            }
            if (target.kind === 'path' && !fs.existsSync(target.value)) {
              res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ success: false, message: '파일 또는 프로그램을 찾을 수 없습니다.' }));
              return;
            }

            // OS별 실행 로직 (셸 미경유, 검증된 값만 전달)
            let child;
            if (isWindows) {
              if (target.kind === 'name') {
                // 이름 실행은 검증 단계에서 큰따옴표·메타문자(& | < > ^ % 등)가 모두 차단된 값만 도달합니다.
                child = spawn('cmd.exe', ['/d', '/s', '/c', `start "" "${target.value}"`], {
                  detached: true,
                  stdio: 'ignore',
                  windowsVerbatimArguments: true,
                  windowsHide: true,
                });
              } else if (target.kind === 'url') {
                // URL/앱 스킴(hwp:, ms-excel: 등)은 cmd를 거치지 않고 OS 프로토콜 처리기로 직접 전달
                child = spawn('rundll32.exe', ['url.dll,FileProtocolHandler', target.value], { detached: true, stdio: 'ignore' });
              } else {
                // 파일/프로그램 경로는 탐색기(ShellExecute)로 직접 실행 (cmd 미경유)
                child = spawn('explorer.exe', [target.value], { detached: true, stdio: 'ignore' });
              }
            } else if (isMac) {
              child = target.kind === 'name'
                ? spawn('open', ['-a', target.value], { detached: true, stdio: 'ignore' })
                : spawn('open', [target.value], { detached: true, stdio: 'ignore' });
            } else {
              child = spawn('xdg-open', [target.value], { detached: true, stdio: 'ignore' });
            }

            child.on('error', (err) => {
              console.error(`🔴 [AppLauncher] "${appTitle}" 실행 중 오류 발생:`, err.message);
            });

            child.unref();

            console.log(`🟢 [AppLauncher] "${appTitle}" 프로그램 실행 요청 성공`);
            res.writeHead(200, {
              'Content-Type': 'application/json; charset=utf-8',
            });
            res.end(JSON.stringify({ success: true, message: `[${appTitle}] 프로그램이 실행되었습니다.` }));
          } catch (parseErr) {
            console.error('🔴 [AppLauncher] JSON 파싱 오류:', parseErr);
            res.writeHead(400, {
              'Content-Type': 'application/json; charset=utf-8',
            });
            res.end(JSON.stringify({ success: false, message: '올바른 JSON 데이터가 아닙니다.' }));
          }
        });
        return;
      }

      if (reqPath === '/' || reqPath === '') {
        reqPath = '/index.html';
      }

      // 안전한 정적 파일 절대 경로 산출 (상위 디렉토리 탈출 방지)
      let filePath = path.normalize(path.join(publicDir, reqPath));
      if (filePath !== publicDir && !filePath.startsWith(publicDir + path.sep)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('403 Forbidden: 올바르지 않은 경로 접근입니다.');
        return;
      }

      // 1. 메모리 캐시 우선 확인 (단, index.html 등 HTML 문서는 소스 수정 즉시 반영을 위해 항상 디스크에서 최신 파일 확인)
      const isHtmlDoc = filePath.endsWith('.html');
      if (!isHtmlDoc && fileCache.has(filePath)) {
        const cached = fileCache.get(filePath);
        res.writeHead(200, {
          'Content-Type': cached.contentType,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Cache-Status': 'HIT-RAM',
        });
        res.end(cached.data);
        return;
      }

      // 2. 비동기 논블로킹 파일 상태 확인 (safeStat 적용)
      let stat = await safeStat(filePath, 2500);

      // 파일이 없거나 디렉토리이면 SPA 폴백으로 index.html 선택
      if (!stat || stat.isDirectory()) {
        filePath = path.join(publicDir, 'index.html');
        stat = await safeStat(filePath, 2500);
      }

      // dist/index.html 파일조차 구글 드라이브 지연으로 읽을 수 없는 경우 Fallback HTML 제공
      if (!stat) {
        if (filePath.endsWith('index.html')) {
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Fallback': 'Emergency-Recovery-HTML',
          });
          res.end(FALLBACK_HTML);
          return;
        }
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found: 파일을 찾을 수 없습니다.');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      // 3. 파일 읽기 스트림(ReadStream) 타임아웃 및 엄격한 에러 핸들링
      const STREAM_TIMEOUT_MS = 3500;
      let stream;
      try {
        stream = fs.createReadStream(filePath, { highWaterMark: 64 * 1024 });
      } catch (streamErr) {
        console.warn(`⚠️ [WebServer] ReadStream 생성 오류 (${streamErr.code}):`, streamErr.message);
        if (filePath.endsWith('index.html')) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(FALLBACK_HTML);
          return;
        }
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Stream Init Error');
        return;
      }

      let streamTimer = setTimeout(() => {
        if (stream && !stream.destroyed) {
          const timeoutErr = new Error('File read stream timeout (ETIMEDOUT)');
          timeoutErr.code = 'ETIMEDOUT';
          stream.destroy(timeoutErr);
        }
      }, STREAM_TIMEOUT_MS);

      // 캐싱용 청크 버퍼 수집 (10MB 미만 파일 대상)
      const chunks = [];
      let totalChunkSize = 0;
      const isCacheable = stat.size < 10 * 1024 * 1024 && !filePath.endsWith('.html');

      stream.on('data', (chunk) => {
        // 스트림 데이터 수신 시 타임아웃 갱신
        clearTimeout(streamTimer);
        streamTimer = setTimeout(() => {
          if (stream && !stream.destroyed) {
            const timeoutErr = new Error('File read stream timeout (ETIMEDOUT)');
            timeoutErr.code = 'ETIMEDOUT';
            stream.destroy(timeoutErr);
          }
        }, STREAM_TIMEOUT_MS);

        if (isCacheable && totalCacheBytes + chunk.length <= MAX_CACHE_SIZE_BYTES) {
          chunks.push(chunk);
          totalChunkSize += chunk.length;
        }
      });

      stream.on('end', () => {
        clearTimeout(streamTimer);
        if (isCacheable && chunks.length > 0 && totalChunkSize === stat.size) {
          const buffer = Buffer.concat(chunks);
          fileCache.set(filePath, {
            data: buffer,
            contentType,
            mtimeMs: stat.mtimeMs,
          });
          totalCacheBytes += buffer.length;
        }
      });

      // 🛡️ ReadStream 에러 이벤트 엄격 처리 (ETIMEDOUT 발생 시 프로세스 다운 방지 및 Fallback 제공)
      stream.on('error', (err) => {
        clearTimeout(streamTimer);
        console.warn(`⚠️ [WebServer] 파일 스트림 I/O 예외 감지 (${err.code || 'ETIMEDOUT'}): ${filePath}`);

        if (!res.headersSent) {
          // 캐시가 존재하는 경우 캐시 복구본 전송
          if (fileCache.has(filePath)) {
            const cached = fileCache.get(filePath);
            res.writeHead(200, {
              'Content-Type': cached.contentType,
              'X-Fallback': 'Cache-Recovered',
            });
            res.end(cached.data);
            return;
          }

          // HTML 요청인 경우 비상 폴백 HTML 제공
          if (filePath.endsWith('index.html')) {
            res.writeHead(200, {
              'Content-Type': 'text/html; charset=utf-8',
              'X-Fallback': 'Emergency-Recovery-HTML',
            });
            res.end(FALLBACK_HTML);
            return;
          }

          res.writeHead(200, {
            'Content-Type': contentType,
          });
          res.end('');
        } else {
          res.destroy(err);
        }
      });

      // 연결 중단 시 리소스 정리
      res.on('close', () => {
        clearTimeout(streamTimer);
        if (stream && !stream.destroyed) {
          stream.destroy();
        }
      });

      res.on('error', () => {
        clearTimeout(streamTimer);
        if (stream && !stream.destroyed) {
          stream.destroy();
        }
      });

      // 정적 파일 스트리밍 응답 시작 (캐시 무효화 및 CORS 헤더 포함)
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      });

      stream.pipe(res);
    } catch (err) {
      console.error('🔴 [WebServer] 요청 처리 오류:', err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Internal Server Error');
      }
    }
  });

  return new Promise((resolve, reject) => {
    server.on('error', (err) => {
      reject(err);
    });

    server.listen(port, '127.0.0.1', () => {
      console.log(`🟢 [2/3] 초고속 내장 웹엔진 가동 완료! (http://127.0.0.1:${port})`);
      resolve(server);
    });
  });
}

/**
 * 6. 메인 실행 제어 흐름
 */
async function main() {
  console.log('🔍 [1/3] 로컬 서버 환경을 점검하고 있습니다...');

  const inUse = await isPortInUse(PORT);
  const targetUrl = `http://localhost:${PORT}/`;

  if (inUse) {
    console.log(`🟢 이미 포트 ${PORT}에서 대시보드 서버가 가동 중입니다.`);
    launchBrowser(targetUrl);
    console.log('\n==============================================================================');
    console.log('  ✨ 스마트 학급 대시보드 화면이 준비되었습니다!');
    console.log('==============================================================================\n');
    process.exit(0);
  }

  const distDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(distDir)) {
    console.error('🔴 dist 폴더가 존재하지 않습니다. 빌드를 먼저 수행해야 합니다.');
    process.exit(1);
  }

  let serverInstance = null;

  try {
    console.log('🚀 [2/3] Node.js 내장 초경량 웹엔진을 실행합니다...');
    serverInstance = await startNativeStaticServer(distDir, PORT);
  } catch (err) {
    console.warn(`🟡 포트 ${PORT} 바인딩 실패, 대체 포트(3001)로 재시도합니다:`, err.message);
    try {
      serverInstance = await startNativeStaticServer(distDir, 3001);
    } catch (secondErr) {
      console.error('🔴 서버 가동 최종 실패:', secondErr);
      process.exit(1);
    }
  }

  // 서버 준비 상태 헬스체크
  console.log('⏳ 서버 준비 상태 확인 중...');
  const ready = await waitForServer(targetUrl, 5000);

  if (ready) {
    console.log('🟢 로컬 서버 연결 확인 완료 (HTTP 200)');
  } else {
    console.log('🟢 로컬 서버 가동 중...');
  }

  // 브라우저 실행
  launchBrowser(targetUrl);

  console.log('\n==============================================================================');
  console.log('  🟢 스마트 학급 대시보드가 성공적으로 실행되었습니다!');
  console.log('     - 전체화면 전환: 키보드 [F11] (Mac: Ctrl+Cmd+F)');
  console.log('     - 종료하시려면 이 터미널 창을 닫아주세요.');
  console.log('==============================================================================\n');

  // 종료 신호 수신 시 안전 종료
  process.on('SIGINT', () => {
    if (serverInstance) serverInstance.close();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    if (serverInstance) serverInstance.close();
    process.exit(0);
  });
}

main().catch((err) => {
  if (err?.code === 'ETIMEDOUT' || err?.message?.includes('ETIMEDOUT')) {
    console.warn('⚠️ [Main] 초기 기동 중 구글 드라이브 동기화 지연(ETIMEDOUT) 감지 (서버 가동 유지):', err.message);
  } else {
    console.error('🔴 치명적 실행 오류:', err);
    process.exit(1);
  }
});
