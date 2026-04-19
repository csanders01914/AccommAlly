import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";
import { CSRF_COOKIE_NAME, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/constants";

// Paths that require authentication
const PROTECTED_PATHS = ["/dashboard", "/admin", "/auditor", "/cases"];
// Paths only for ADMIN
const ADMIN_PATHS = ["/admin"];
// Paths for ADMIN or AUDITOR
const AUDITOR_PATHS = ["/auditor"];

/**
 * Generate CSRF token using Web Crypto API (Edge Runtime compatible)
 */
function generateCsrfToken(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function buildCspHeader(nonce: string): string {
    return [
        `default-src 'self'`,
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
        `style-src 'self' 'unsafe-inline'`, // required for Tailwind CSS v4 dynamic styles
        `img-src 'self' data: blob:`,
        `font-src 'self' data:`,
        `connect-src 'self'`,
        `frame-ancestors 'self'`,
        `base-uri 'self'`,
        `form-action 'self'`,
    ].join('; ');
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Generate a fresh nonce for every request
    // Use raw random bytes (not a UUID string) for proper cryptographic entropy
    const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64');
    const cspHeader = buildCspHeader(nonce);

    // Pass nonce to layout via a request header
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);

    // Check if path is protected
    const isProtected = PROTECTED_PATHS.some((path) => pathname.startsWith(path));

    if (isProtected) {
        const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
        const session = token ? await verifyToken(token) : null;

        if (!session) {
            // Redirect to login with return URL
            const url = new URL("/", request.url);
            url.searchParams.set("callbackUrl", pathname);
            const redirectResponse = NextResponse.redirect(url);
            redirectResponse.headers.set('Content-Security-Policy', cspHeader);
            return redirectResponse;
        }

        // Role-based access control
        const isAdminPath = ADMIN_PATHS.some((path) => pathname.startsWith(path));
        if (isAdminPath && session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
            const redirectResponse = NextResponse.redirect(new URL("/dashboard", request.url));
            redirectResponse.headers.set('Content-Security-Policy', cspHeader);
            return redirectResponse;
        }

        // Auditor path access control (ADMIN or AUDITOR)
        const isAuditorPath = AUDITOR_PATHS.some((path) => pathname.startsWith(path));
        if (isAuditorPath && session.role !== "ADMIN" && session.role !== "AUDITOR") {
            const redirectResponse = NextResponse.redirect(new URL("/dashboard", request.url));
            redirectResponse.headers.set('Content-Security-Policy', cspHeader);
            return redirectResponse;
        }
    }

    const response = NextResponse.next({ request: { headers: requestHeaders } });

    // Set CSP on every response
    response.headers.set('Content-Security-Policy', cspHeader);

    // Ensure CSRF cookie is set on every response
    if (!request.cookies.get(CSRF_COOKIE_NAME)?.value) {
        response.cookies.set(CSRF_COOKIE_NAME, generateCsrfToken(), {
            httpOnly: false, // Must be readable by JavaScript for double-submit
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: SESSION_MAX_AGE_SECONDS,
        });
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes — handled by requireAuth server-side)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|images|public).*)',
    ],
};
