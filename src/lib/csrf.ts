import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/constants';

const CSRF_TOKEN_LENGTH = 32; // 256-bit token

/**
 * Generate a cryptographically random CSRF token.
 * Uses Web Crypto API (works in both Edge Runtime and Node.js).
 */
export function generateCsrfToken(): string {
 const bytes = new Uint8Array(CSRF_TOKEN_LENGTH);
 crypto.getRandomValues(bytes);
 return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Set CSRF token cookie on a response.
 * Uses a non-httpOnly cookie so JavaScript can read it for the double-submit pattern.
 */
export function setCsrfCookie(response: NextResponse, token: string): NextResponse {
 response.cookies.set(CSRF_COOKIE_NAME, token, {
 httpOnly: false, // Must be readable by JavaScript for double-submit
 secure: process.env.NODE_ENV === 'production',
 sameSite: 'strict',
 path: '/',
 maxAge: SESSION_MAX_AGE_SECONDS, // match session duration
 });
 return response;
}

/**
 * Validate CSRF token from request header against the cookie value.
 * Only validates on state-changing methods (POST, PUT, PATCH, DELETE).
 * GET/HEAD/OPTIONS are safe methods and are exempt.
 */
export function validateCsrf(request: NextRequest): { valid: boolean; error?: string } {
 const method = request.method.toUpperCase();

 // Safe methods don't need CSRF protection
 if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
 return { valid: true };
 }

 const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
 const headerToken = request.headers.get(CSRF_HEADER_NAME);

 if (!cookieToken) {
 return { valid: false, error: 'Missing CSRF cookie' };
 }

 if (!headerToken) {
 return { valid: false, error: 'Missing CSRF header' };
 }

 // Constant-time string comparison to prevent timing attacks
 // Uses XOR approach — works in both Edge Runtime and Node.js
 if (cookieToken.length !== headerToken.length) {
 return { valid: false, error: 'CSRF token mismatch' };
 }

 let mismatch = 0;
 for (let i = 0; i < cookieToken.length; i++) {
 mismatch |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i);
 }

 if (mismatch !== 0) {
 return { valid: false, error: 'CSRF token mismatch' };
 }

 return { valid: true };
}

/**
 * Get or create a CSRF token from the current cookies.
 * Used by the /api/auth/csrf endpoint and middleware.
 */
export async function getOrCreateCsrfToken(): Promise<string> {
 const cookieStore = await cookies();
 const existing = cookieStore.get(CSRF_COOKIE_NAME)?.value;
 if (existing) return existing;

 return generateCsrfToken();
}
