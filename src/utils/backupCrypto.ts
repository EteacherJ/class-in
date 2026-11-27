/**
 * ============================================================================
 * [backupCrypto.ts] 학급 백업 암호화 (Web Crypto AES-256-GCM + PBKDF2)
 * ============================================================================
 * - 선생님이 정한 '백업 암호'로만 열 수 있는 암호화 백업을 만듭니다.
 * - 암호는 어디에도 저장되지 않으며, 잊어버리면 백업을 복구할 수 없습니다.
 * - 구글 드라이브·USB 등 외부로 나가는 전체 백업(학생 명단·관찰일지 포함)에 사용합니다.
 */

export const ENCRYPTED_BACKUP_FORMAT = 'classin-encrypted-backup-v1';
const PBKDF2_ITERATIONS = 310_000;

export interface EncryptedBackupEnvelope {
  format: typeof ENCRYPTED_BACKUP_FORMAT;
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string; // base64
  iv: string; // base64
  ciphertext: string; // base64
  exportedAt: string;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export function isEncryptedBackup(value: unknown): value is EncryptedBackupEnvelope {
  return !!value && typeof value === 'object' && (value as any).format === ENCRYPTED_BACKUP_FORMAT;
}

export async function encryptBackup(data: unknown, passphrase: string): Promise<EncryptedBackupEnvelope> {
  if (!passphrase || passphrase.length < 6) throw new Error('백업 암호는 6자 이상이어야 합니다.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, PBKDF2_ITERATIONS);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(data)));
  return {
    format: ENCRYPTED_BACKUP_FORMAT,
    kdf: 'PBKDF2-SHA256',
    iterations: PBKDF2_ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(cipher)),
    exportedAt: new Date().toISOString(),
  };
}

export async function decryptBackup<T = any>(envelope: EncryptedBackupEnvelope, passphrase: string): Promise<T> {
  try {
    const key = await deriveKey(passphrase, fromBase64(envelope.salt), envelope.iterations || PBKDF2_ITERATIONS);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(envelope.iv) }, key, fromBase64(envelope.ciphertext));
    return JSON.parse(dec.decode(plain)) as T;
  } catch {
    throw new Error('백업 암호가 올바르지 않거나 파일이 손상되었습니다.');
  }
}
