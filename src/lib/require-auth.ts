import { NextRequest, NextResponse } from 'next/server';
import { getSession } from './auth';
import { validateCsrf } from './csrf';

export interface AuthSession {
    id: string;
    email: string;
    role: string;
    tenantId: string;
    name?: string;
    [key: string]: unknown;
}

interface RequireAuthOptions {
    roles?: string[];
    /** Pass the NextRequest to enable CSRF validation on state-changing methods */
    request?: NextRequest;
    /** Set to true to skip CSRF validation (e.g. for public intake endpoints) */
    skipCsrf?: boolean;
}

type AuthResult =
    | { session: AuthSession; error: null }
    | { session: null; error: NextResponse };

/**
 * Centralized authentication and authorization check for API routes.
 * 
 * @param options.roles - Optional list of allowed roles (e.g. ['ADMIN', 'AUDITOR'])
 * @param options.request - Optional NextRequest for CSRF validation
 * @param options.skipCsrf - Set to true to skip CSRF check
 * @returns Either a valid session or a NextResponse error to return immediately
 * 
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const { session, error } = await requireAuth({ request, roles: ['ADMIN'] });
 *   if (error) return error;
 *   // session is typed and guaranteed to have tenantId
 * }
 * ```
 */
export async function requireAuth(options?: RequireAuthOptions): Promise<AuthResult> {
    const session = await getSession();

    if (!session) {
        return {
            session: null,
            error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        };
    }

    // Validate tenantId is present in session
    if (!session.tenantId) {
        return {
            session: null,
            error: NextResponse.json({ error: 'Invalid session: missing tenant context' }, { status: 401 }),
        };
    }

    // CSRF validation (only on state-changing methods when request is provided)
    if (options?.request && !options?.skipCsrf) {
        const csrfResult = validateCsrf(options.request);
        if (!csrfResult.valid) {
            return {
                session: null,
                error: NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 }),
            };
        }
    }

    // Role-based access control
    if (options?.roles && options.roles.length > 0) {
        const userRole = session.role as string;
        if (!options.roles.includes(userRole)) {
            return {
                session: null,
                error: NextResponse.json({ error: 'Forbidden — insufficient permissions' }, { status: 403 }),
            };
        }
    }

    return {
        session: session as unknown as AuthSession,
        error: null,
    };
}
