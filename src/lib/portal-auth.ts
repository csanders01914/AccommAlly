import { PORTAL_SESSION_COOKIE_NAME } from '@/lib/constants';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';

const ALG = 'HS256';

function getPortalSecretKey(): Uint8Array {
    const secret = process.env.PORTAL_JWT_SECRET || process.env.JWT_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
        throw new Error('FATAL: PORTAL_JWT_SECRET environment variable is required in production.');
    }
    if (!secret) {
        logger.warn('SECURITY WARNING: PORTAL_JWT_SECRET not set. Using insecure default for development only.');
    }
    return new TextEncoder().encode(secret || 'default_dev_secret_key_change_me');
}

export interface PortalSession {
    claimantId: string;
    caseId: string;
    tenantId: string;
    role: 'CLAIMANT';
    purpose: 'portal';
}

/**
 * Validates the portal session cookie and returns the typed payload.
 * Returns null if the token is missing, invalid, or not a portal session.
 */
export async function getPortalSession(): Promise<PortalSession | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(PORTAL_SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, getPortalSecretKey(), { algorithms: [ALG] });
        if (payload.role !== 'CLAIMANT' || payload.purpose !== 'portal') {
            return null;
        }
        return payload as unknown as PortalSession;
    } catch {
        return null;
    }
}
