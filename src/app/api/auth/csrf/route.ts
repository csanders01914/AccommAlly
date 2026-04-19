import { NextResponse } from 'next/server';
import { getOrCreateCsrfToken, setCsrfCookie } from '@/lib/csrf';

/**
 * GET /api/auth/csrf
 * Returns a CSRF token and sets it as a cookie.
 * Called on page load to bootstrap the double-submit cookie pattern.
 */
export async function GET() {
    const token = await getOrCreateCsrfToken();
    const response = NextResponse.json({ csrfToken: token });
    return setCsrfCookie(response, token);
}
