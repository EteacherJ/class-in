/**
 * ============================================================================
 * [pinSecurity.ts] 관리자 PIN 통합 관리 (화면 잠금 · 관찰일지 · 환경설정 공용)
 * ============================================================================
 * - PIN 원문은 저장하지 않고 PBKDF2-SHA256 해시만 보관합니다.
 * - 하드코딩된 마스터 비밀번호(0000/1234)는 더 이상 허용하지 않습니다.
 * - 연속 5회 오입력 시 30초부터 최대 5분까지 입력을 잠시 막습니다.
 * - PIN 분실에 대비해 PIN 설정 시 1회만 보여주는 '복구 코드'를 발급합니다.
 */

const PIN_RECORD_KEY = 'class_dashboard_pin_hash_v2';
const ATTEMPT_KEY = 'class_dashboard_pin_attempts';
const ITERATIONS = 120_000;
export const DEFAULT_PIN = '0000';

interface PinRecord {
  v: 2;
  salt: string;
  hash: string;
  iterations: number;
  isDefault: boolean;
  recoverySalt?: string;
  recoveryHash?: string;
  updatedAt: string;
}

interface AttemptState {
  failures: number;
  lockedUntil: number;
}

const enc = new TextEncoder();

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const randomHex = (bytes = 16) => toHex(crypto.getRandomValues(new Uint8Array(bytes)).buffer);

async function pbkdf2Hex(secret: string, saltHex: string, iterations = ITERATIONS): Promise<string> {
  const salt = new Uint8Array((saltHex.match(/.{2}/g) || []).map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return toHex(bits);
}

/** 타이밍 공격 완화를 위한 고정 시간 문자열 비교 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function readRecord(): PinRecord | null {
  try {
    const raw = localStorage.getItem(PIN_RECORD_KEY);
    const rec = raw ? (JSON.parse(raw) as PinRecord) : null;
    return rec && rec.v === 2 && rec.hash && rec.salt ? rec : null;
  } catch {
    return null;
  }
}

function writeRecord(rec: PinRecord) {
  localStorage.setItem(PIN_RECORD_KEY, JSON.stringify(rec));
}

/** 이전 버전의 평문 PIN (잠금화면 / 환경설정 관리자 비밀번호) 조회 */
function readLegacyPlainPin(): { pin: string; isDefault: boolean } {
  try {
    const lockPin = localStorage.getItem('ttime_lock_pin');
    if (lockPin) return { pin: lockPin, isDefault: false };
    const cfg = JSON.parse(localStorage.getItem('class_dashboard_config') || '{}');
    const pw = cfg?.securityConfig?.passwordHash;
    if (pw && typeof pw === 'string' && pw !== '1234') return { pin: pw, isDefault: false };
  } catch {}
  return { pin: DEFAULT_PIN, isDefault: true };
}

/** 이전 버전 평문 PIN 흔적 삭제 */
function clearLegacyPlainPin() {
  try {
    localStorage.removeItem('ttime_lock_pin');
    const raw = localStorage.getItem('class_dashboard_config');
    if (raw) {
      const cfg = JSON.parse(raw);
      if (cfg?.securityConfig && cfg.securityConfig.passwordHash) {
        cfg.securityConfig.passwordHash = '';
        localStorage.setItem('class_dashboard_config', JSON.stringify(cfg));
      }
    }
  } catch {}
}

function readAttempts(): AttemptState {
  try {
    return JSON.parse(localStorage.getItem(ATTEMPT_KEY) || '') as AttemptState;
  } catch {
    return { failures: 0, lockedUntil: 0 };
  }
}

function writeAttempts(state: AttemptState) {
  try {
    localStorage.setItem(ATTEMPT_KEY, JSON.stringify(state));
  } catch {}
}

/**
 * 앱 시작 시 1회 호출: 평문 PIN이 남아 있으면 해시로 이전하고 원문을 삭제합니다.
 */
export async function migrateLegacyPin(): Promise<void> {
  if (readRecord()) {
    clearLegacyPlainPin();
    return;
  }
  const legacy = readLegacyPlainPin();
  const salt = randomHex();
  writeRecord({
    v: 2,
    salt,
    hash: await pbkdf2Hex(legacy.pin, salt),
    iterations: ITERATIONS,
    isDefault: legacy.isDefault,
    updatedAt: new Date().toISOString(),
  });
  clearLegacyPlainPin();
}

/** 아직 초기 PIN(0000)을 쓰고 있는지 여부 */
export function isUsingDefaultPin(): boolean {
  const rec = readRecord();
  return rec ? rec.isDefault : readLegacyPlainPin().isDefault;
}

/** 입력 제한 남은 시간(ms). 0 이면 입력 가능 */
export function getPinLockoutRemainingMs(): number {
  return Math.max(0, readAttempts().lockedUntil - Date.now());
}

export interface PinVerifyResult {
  ok: boolean;
  lockedForMs: number;
  remainingTries: number;
}

/**
 * 관리자 PIN 확인 (화면 잠금 해제, 관찰일지 열람, PIN 변경 등 공용)
 */
export async function verifyAdminPin(input: string): Promise<PinVerifyResult> {
  const lockedFor = getPinLockoutRemainingMs();
  if (lockedFor > 0) return { ok: false, lockedForMs: lockedFor, remainingTries: 0 };

  let rec = readRecord();
  if (!rec) {
    await migrateLegacyPin();
    rec = readRecord();
  }
  const ok = !!rec && safeEqual(await pbkdf2Hex(String(input ?? ''), rec.salt, rec.iterations || ITERATIONS), rec.hash);

  const attempts = readAttempts();
  if (ok) {
    writeAttempts({ failures: 0, lockedUntil: 0 });
    return { ok: true, lockedForMs: 0, remainingTries: 5 };
  }
  const failures = (attempts.failures || 0) + 1;
  let lockedUntil = 0;
  if (failures >= 5) {
    const step = Math.min(failures - 5, 4); // 30초 → 1분 → 2분 → 4분 → 5분(최대)
    lockedUntil = Date.now() + Math.min(30_000 * 2 ** step, 300_000);
  }
  writeAttempts({ failures, lockedUntil });
  return { ok: false, lockedForMs: Math.max(0, lockedUntil - Date.now()), remainingTries: Math.max(0, 5 - failures) };
}

function generateRecoveryCode(): string {
  // 혼동 문자(0/O, 1/I/L) 제외 8자리 → XXXX-XXXX
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
  return `${chars.slice(0, 4)}-${chars.slice(4)}`;
}

const normalizeRecovery = (code: string) => String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/**
 * 새 관리자 PIN 저장. 반환값: 새로 발급된 복구 코드 (화면에 1회만 표시)
 */
export async function setAdminPin(newPin: string): Promise<string> {
  const pin = String(newPin ?? '').trim();
  if (pin.length < 4) throw new Error('PIN은 4자리 이상이어야 합니다.');
  if (pin === DEFAULT_PIN || pin === '1234') throw new Error('0000, 1234처럼 추측하기 쉬운 PIN은 사용할 수 없습니다.');
  const salt = randomHex();
  const recoveryCode = generateRecoveryCode();
  const recoverySalt = randomHex();
  writeRecord({
    v: 2,
    salt,
    hash: await pbkdf2Hex(pin, salt),
    iterations: ITERATIONS,
    isDefault: false,
    recoverySalt,
    recoveryHash: await pbkdf2Hex(normalizeRecovery(recoveryCode), recoverySalt),
    updatedAt: new Date().toISOString(),
  });
  clearLegacyPlainPin();
  writeAttempts({ failures: 0, lockedUntil: 0 });
  return recoveryCode;
}

/** 복구 코드가 맞는지 확인 (PIN 분실 시 재설정용) */
export async function verifyRecoveryCode(code: string): Promise<boolean> {
  const rec = readRecord();
  if (!rec?.recoveryHash || !rec.recoverySalt) return false;
  const lockedFor = getPinLockoutRemainingMs();
  if (lockedFor > 0) return false;
  const ok = safeEqual(await pbkdf2Hex(normalizeRecovery(code), rec.recoverySalt), rec.recoveryHash);
  if (!ok) {
    const a = readAttempts();
    const failures = (a.failures || 0) + 1;
    writeAttempts({ failures, lockedUntil: failures >= 5 ? Date.now() + 60_000 : 0 });
  }
  return ok;
}

/** 현재 PIN 또는 복구 코드로 본인 확인 */
export async function verifyPinOrRecovery(input: string): Promise<boolean> {
  if ((await verifyAdminPin(input)).ok) return true;
  return verifyRecoveryCode(input);
}

export function formatLockout(ms: number): string {
  const sec = Math.ceil(ms / 1000);
  return sec >= 60 ? `${Math.floor(sec / 60)}분 ${sec % 60}초` : `${sec}초`;
}
