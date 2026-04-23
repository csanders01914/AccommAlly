/**
 * Short-lived export token — HMAC-SHA256 signed, 5-minute TTL.
 *
 * Token format: base64url(JSON payload) + '.' + hex HMAC signature
 *
 * The token authorises a single confirmed payment to download a report export
 * any number of times within the 5-minute window.
 * Access is gated purely by token expiry — NOT by one-time-use.
 */

import crypto from 'crypto';

const TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface ExportTokenPayload {
 userId: string;
 tenantId: string;
 paymentRecordId: string;
 expiresAt: number; // Unix timestamp ms
}

function getSecret(): string {
 const secret = process.env.EXPORT_TOKEN_SECRET;
 if (!secret || secret.length < 32) {
 throw new Error('EXPORT_TOKEN_SECRET must be set and at least 32 characters');
 }
 return secret;
}

function toBase64Url(str: string): string {
 return Buffer.from(str, 'utf8')
 .toString('base64')
 .replace(/\+/g, '-')
 .replace(/\//g, '_')
 .replace(/=/g, '');
}

function fromBase64Url(str: string): string {
 const padded = str + '==='.slice((str.length + 3) % 4);
 return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function signPayload(encodedPayload: string): string {
 return crypto
 .createHmac('sha256', getSecret())
 .update(encodedPayload)
 .digest('hex');
}

/** Issue a signed export token valid for 5 minutes. */
export function signExportToken(payload: Omit<ExportTokenPayload, 'expiresAt'>): string {
 const full: ExportTokenPayload = {
 ...payload,
 expiresAt: Date.now() + TOKEN_TTL_MS,
 };
 const encoded = toBase64Url(JSON.stringify(full));
 const sig = signPayload(encoded);
 return `${encoded}.${sig}`;
}

/** Verify a token. Returns the payload if valid, null if invalid or expired. */
export function verifyExportToken(token: string): ExportTokenPayload | null {
 try {
 const dotIdx = token.lastIndexOf('.');
 if (dotIdx === -1) return null;

 const encoded = token.slice(0, dotIdx);
 const sig = token.slice(dotIdx + 1);

 // Constant-time comparison
 const expectedSig = signPayload(encoded);
 if (expectedSig.length !== sig.length) return null;
 let mismatch = 0;
 for (let i = 0; i < sig.length; i++) {
 mismatch |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
 }
 if (mismatch !== 0) return null;

 const payload: ExportTokenPayload = JSON.parse(fromBase64Url(encoded));

 if (Date.now() > payload.expiresAt) return null; // Expired

 return payload;
 } catch {
 return null;
 }
}
