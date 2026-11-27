/**
 * ==============================================================================
 * 🛡️ Class in - 공용 보안 가드 모듈 (Electron 메인 프로세스 + run-dashboard.mjs 공용)
 * ==============================================================================
 * - electron 모듈을 import 하지 않는 순수 함수만 둡니다. (Node 단독 실행기에서도 재사용)
 * - 1) 프로그램 실행 대상 검증 (명령 주입 차단)
 * - 2) 정적 파일 서버 경로 이탈(../) 차단
 * - 3) 외부 데이터 대리 요청(급식·iCal 등) URL 검증 (사설망/로컬 접근 차단)
 */
import path from 'path';
import net from 'net';

// ------------------------------------------------------------------------------
// 1) 프로그램/바로가기 실행 대상 분류 및 검증
// ------------------------------------------------------------------------------

// 원격 코드 실행에 악용된 이력이 있거나 로컬 파일을 여는 위험한 URI 스킴
const BLOCKED_SCHEMES = new Set([
  'file', 'javascript', 'vbscript', 'data', 'blob', 'jar',
  'ms-msdt', 'search-ms', 'search', 'ms-search', 'ms-officecmd',
  'ms-cxh', 'ms-cxh-full', 'ms-appinstaller', 'ms-settings-cloudstorage',
  'smb', 'ftp', 'ldap', 'ldaps', 'telnet', 'ssh',
]);

// Windows cmd 메타문자 및 제어문자 (이 문자가 있으면 이름 실행 거부)
const UNSAFE_NAME_CHARS = /[&|<>^%!"`$;(){}\[\]\r\n\t\0\\/*?]/;

/**
 * 실행 대상 문자열을 안전한 형태로 분류합니다.
 * @param {string} raw 사용자가 등록한 실행 대상 (예: 'hwp:', 'C:\\...\\Hwp.exe', '/Applications/Keynote.app', '계산기')
 * @returns {{ ok: true, kind: 'url'|'path'|'name', value: string } | { ok: false, error: string }}
 */
export function classifyLaunchTarget(raw, platform = process.platform) {
  if (typeof raw !== 'string') return { ok: false, error: '실행 대상이 올바르지 않습니다.' };
  const target = raw.trim();
  if (!target) return { ok: false, error: '경로가 지정되지 않았습니다.' };
  if (target.length > 1024) return { ok: false, error: '경로가 너무 깁니다.' };
  if (/[\r\n\0]/.test(target)) return { ok: false, error: '허용되지 않는 문자가 포함되어 있습니다.' };

  const isWinDrivePath = /^[a-zA-Z]:[\\/]/.test(target);
  const isUncPath = /^\\\\|^\/\//.test(target);
  if (isUncPath) return { ok: false, error: '네트워크(공유 폴더) 경로는 실행할 수 없습니다.' };

  // (a) URI 스킴 (https:, mailto:, hwp:, ms-excel: 등)
  const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(target);
  if (schemeMatch && !isWinDrivePath) {
    const scheme = schemeMatch[1].toLowerCase();
    if (BLOCKED_SCHEMES.has(scheme)) {
      return { ok: false, error: `보안상 '${scheme}:' 형식은 실행할 수 없습니다.` };
    }
    return { ok: true, kind: 'url', value: target };
  }

  // (b) 절대 경로 (C:\..., /Applications/...)
  if (isWinDrivePath || (platform !== 'win32' && target.startsWith('/'))) {
    if (target.split(/[\\/]/).includes('..')) {
      return { ok: false, error: "경로에 '..'를 사용할 수 없습니다." };
    }
    return { ok: true, kind: 'path', value: path.normalize(target) };
  }

  // (c) 프로그램 이름 (예: 'calc', 'notepad', 'Keynote', '계산기')
  if (UNSAFE_NAME_CHARS.test(target)) {
    return { ok: false, error: '프로그램 이름에 사용할 수 없는 특수문자가 포함되어 있습니다.' };
  }
  if (target.length > 120) return { ok: false, error: '프로그램 이름이 너무 깁니다.' };
  return { ok: true, kind: 'name', value: target };
}

/**
 * 외부 브라우저로 열어도 되는 웹 주소인지 확인합니다.
 */
export function isSafeExternalUrl(raw) {
  try {
    const u = new URL(String(raw));
    return u.protocol === 'https:' || u.protocol === 'http:' || u.protocol === 'mailto:';
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------------------
// 2) 정적 파일 서버 경로 이탈 차단
// ------------------------------------------------------------------------------

/**
 * 요청 URL을 루트 폴더 안의 실제 파일 경로로 안전하게 변환합니다.
 * 루트 밖을 가리키면 null 을 반환합니다.
 */
export function resolveSafeStaticPath(rootDir, requestUrl) {
  let pathname = '/';
  try {
    pathname = decodeURIComponent(new URL(requestUrl || '/', 'http://localhost').pathname);
  } catch {
    return null;
  }
  if (pathname.includes('\0')) return null;
  const root = path.resolve(rootDir);
  const resolved = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (resolved !== root && !resolved.startsWith(root + path.sep)) return null;
  return resolved;
}

// ------------------------------------------------------------------------------
// 3) 대리 요청(Proxy Fetch) URL 검증 - 공개 HTTPS 주소만 허용
// ------------------------------------------------------------------------------

function isPrivateIp(host) {
  const h = host.replace(/^\[|\]$/g, '');
  const v = net.isIP(h);
  if (v === 4) {
    const [a, b] = h.split('.').map(Number);
    return (
      a === 10 || a === 127 || a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  if (v === 6) {
    const lower = h.toLowerCase();
    return lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80') || lower.startsWith('::ffff:');
  }
  return false;
}

/**
 * 급식(NEIS)·iCal 등 외부 데이터를 앱 내부에서 대리 요청해도 되는 주소인지 확인합니다.
 */
export function isAllowedProxyUrl(raw) {
  let u;
  try {
    u = new URL(String(raw).trim().replace(/^webcal:\/\//i, 'https://'));
  } catch {
    return { ok: false, error: '주소 형식이 올바르지 않습니다.' };
  }
  if (u.protocol !== 'https:') return { ok: false, error: 'https 주소만 불러올 수 있습니다.' };
  if (u.username || u.password) return { ok: false, error: '계정 정보가 포함된 주소는 사용할 수 없습니다.' };
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || isPrivateIp(host)) {
    return { ok: false, error: '내부망 주소는 불러올 수 없습니다.' };
  }
  return { ok: true, url: u.toString() };
}

export const PROXY_MAX_BYTES = 5 * 1024 * 1024; // 5MB
export const PROXY_TIMEOUT_MS = 12000;
