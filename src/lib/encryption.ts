import crypto from 'crypto';

const IV_LENGTH = 12; // GCM standard nonce length
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag

function getKey() {
  // Strip quotes and trim - ensures consistency with seed.ts
  const rawKey = (process.env.ENCRYPTION_KEY || '').trim().replace(/^["']|["']$/g, '');
  const ENCRYPTION_KEY = rawKey.substring(0, 64);

  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    console.error('Invalid ENCRYPTION_KEY. Key length: ' + ENCRYPTION_KEY?.length);
    throw new Error('Invalid ENCRYPTION_KEY');
  }

  return Buffer.from(ENCRYPTION_KEY, 'hex');
}

/**
 * Encrypt text using AES-256-GCM (authenticated encryption)
 * Format: iv:authTag:ciphertext (all hex-encoded)
 * Falls back to reading AES-256-CBC (legacy) format transparently
 */
export function encrypt(text: string): string {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  let encrypted = cipher.update(text, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Decrypt text - supports both AES-256-GCM (new) and AES-256-CBC (legacy) formats
 * GCM format: iv(24 hex):authTag(32 hex):ciphertext
 * CBC format: iv(32 hex):ciphertext
 * Throws if the data matches a recognized encrypted format but decryption fails.
 * Returns as-is for unrecognized formats (plain legacy data that was never encrypted).
 */
export function decrypt(text: string): string {
  if (!text) return text;
  const parts = text.split(':');

  if (parts.length === 3 && parts[0].length === 24) {
    // AES-256-GCM format: iv(24 hex chars):authTag(32 hex chars):ciphertext
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = Buffer.from(parts[2], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }

  if (parts.length >= 2 && parts[0].length === 32) {
    // Legacy AES-256-CBC format: iv(32 hex chars):ciphertext
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts.slice(1).join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', getKey(), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }

  // Not a recognized encrypted format — return as-is (plain legacy data)
  return text;
}

// Deterministic hash for searching (e.g. email lookups)
export function hash(text: string): string {
  return crypto.createHmac('sha256', getKey()).update(text).digest('hex');
}

export const hashSHA256 = hash;

/**
 * Encrypt a Buffer using AES-256-GCM
 * Output format: [12-byte IV][16-byte authTag][ciphertext]
 */
export function encryptBuffer(buffer: Buffer): Buffer {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * Decrypt a Buffer using AES-256-GCM.
 * Input format: [12-byte IV][16-byte authTag][ciphertext]
 * Throws if GCM decryption fails (wrong key, tampered data, etc.).
 * Returns as-is if the buffer is too short to be GCM-encrypted.
 */
export function decryptBuffer(buffer: Buffer): Buffer {
  const IV_LEN = 12;
  const AUTH_TAG_LEN = 16;

  if (buffer.length > IV_LEN + AUTH_TAG_LEN) {
    // Try GCM first
    const iv = buffer.subarray(0, IV_LEN);
    const authTag = buffer.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN);
    const encrypted = buffer.subarray(IV_LEN + AUTH_TAG_LEN);
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  // Buffer too short to be GCM-encrypted — return as-is
  return buffer;
}
