import crypto from 'crypto';

const IV_LENGTH = 16;

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

export function encrypt(text: string): string {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', getKey(), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  if (!text) return text;
  try {
    const textParts = text.split(':');
    const ivPart = textParts.shift();
    if (!ivPart) return text;
    const iv = Buffer.from(ivPart, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', getKey(), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    if (text.length > 50 && !text.includes(':')) {
      // Assume it might be already plaintext if it doesn't match format, though unlikely with 32-char hex key check
      return text;
    }
    // Return original text if decryption fails (might be unencrypted data from before)
    return text;
  }
}

// Deterministic hash for searching (e.g. email lookups)
export function hash(text: string): string {
  return crypto.createHmac('sha256', getKey()).update(text).digest('hex');
}

export function encryptBuffer(buffer: Buffer): Buffer {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  // Prepend IV
  return Buffer.concat([iv, encrypted]);
}

export function decryptBuffer(buffer: Buffer): Buffer {
  try {
    const iv = buffer.subarray(0, IV_LENGTH);
    const encrypted = buffer.subarray(IV_LENGTH);
    const decipher = crypto.createDecipheriv('aes-256-cbc', getKey(), iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted;
  } catch (e) {
    return buffer;
  }
}
