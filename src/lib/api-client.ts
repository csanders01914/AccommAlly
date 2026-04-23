/**
 * Centralized API fetch utility with automatic CSRF token handling.
 *
 * Usage:
 * import { apiFetch } from '@/lib/api-client';
 * const data = await apiFetch('/api/cases', { method: 'POST', body: JSON.stringify(payload) });
 *
 * For GET requests, CSRF is not required and this works like normal fetch.
 * For state-changing methods (POST, PUT, PATCH, DELETE), the CSRF token
 * is automatically read from the cookie and added as a header.
 */

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/lib/constants';

/**
 * Read a cookie value by name from document.cookies
 */
function getCookie(name: string): string | null {
 if (typeof document === 'undefined') return null;
 const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
 return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Ensure a CSRF token cookie exists. If not, fetch one from the server.
 */
async function ensureCsrfToken(): Promise<string | null> {
 let token = getCookie(CSRF_COOKIE_NAME);
 if (token) return token;

 // Bootstrap the CSRF token by calling the endpoint
 try {
 const res = await fetch('/api/auth/csrf');
 if (res.ok) {
 const data = await res.json();
 token = data.csrfToken || getCookie(CSRF_COOKIE_NAME);
 return token;
 }
 } catch {
 // Silently fail — caller will proceed without CSRF token
 }
 return null;
}

/**
 * Enhanced fetch wrapper that automatically handles CSRF tokens.
 *
 * @param url - The URL to fetch (relative or absolute)
 * @param options - Standard RequestInit options
 * @returns The fetch Response
 */
export async function apiFetch(
 url: string,
 options: RequestInit = {}
): Promise<Response> {
 const method = (options.method || 'GET').toUpperCase();

 // Only add CSRF header for state-changing methods
 if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
 const csrfToken = await ensureCsrfToken();
 if (csrfToken) {
 const headers = new Headers(options.headers);
 headers.set(CSRF_HEADER_NAME, csrfToken);
 options.headers = headers;
 }
 }

 return fetch(url, options);
}

/**
 * Helper that calls apiFetch and parses JSON response.
 * Throws on non-ok responses with the error message from the API.
 */
export async function apiFetchJSON<T = any>(
 url: string,
 options: RequestInit = {}
): Promise<T> {
 // Default content-type for JSON bodies
 if (options.body && typeof options.body === 'string') {
 const headers = new Headers(options.headers);
 if (!headers.has('Content-Type')) {
 headers.set('Content-Type', 'application/json');
 }
 options.headers = headers;
 }

 const res = await apiFetch(url, options);

 if (!res.ok) {
 const error = await res.json().catch(() => ({ error: 'Request failed' }));
 throw new Error(error.error || `API error: ${res.status}`);
 }

 return res.json();
}
