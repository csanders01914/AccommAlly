import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth.core";

// Paths that require authentication
const PROTECTED_PATHS = ["/dashboard", "/admin", "/auditor", "/cases"];
// Paths only for ADMIN
const ADMIN_PATHS = ["/admin"];
// Paths for ADMIN or AUDITOR
const AUDITOR_PATHS = ["/auditor"];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Explicitly redirect /login to root /
    if (pathname === '/login') {
        return NextResponse.redirect(new URL("/", request.url));
    }

    // Check if path is protected
    const isProtected = PROTECTED_PATHS.some((path) => pathname.startsWith(path));

    if (isProtected) {
        const token = request.cookies.get("session_token")?.value;
        const session = token ? await verifyToken(token) : null;

        if (!session) {
            // Redirect to login (root) with return URL
            const url = new URL("/", request.url);
            url.searchParams.set("callbackUrl", pathname);
            return NextResponse.redirect(url);
        }

        // Role-based access control
        const isAdminPath = ADMIN_PATHS.some((path) => pathname.startsWith(path));
        if (isAdminPath && session.role !== "ADMIN") {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }

        // Auditor path access control (ADMIN or AUDITOR)
        const isAuditorPath = AUDITOR_PATHS.some((path) => pathname.startsWith(path));
        if (isAuditorPath && session.role !== "ADMIN" && session.role !== "AUDITOR") {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api/auth (allow login/logout)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public (public files)
         */
        '/((?!api/auth|_next/static|_next/image|favicon.ico|images|public).*)',
    ],
};
