import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';
import { hashPassword, comparePassword } from './auth';
import { hashSHA256 } from './encryption';
import logger from '@/lib/logger';

// Super-Admin specific secret — lazy initialization to avoid build-time crashes
let _superAdminSecret: Uint8Array | null = null;
function getSuperAdminSecret(): Uint8Array {
    if (!_superAdminSecret) {
        const superAdminSecret = process.env.SUPER_ADMIN_JWT_SECRET;
        if (!superAdminSecret && process.env.NODE_ENV === 'production') {
            throw new Error('FATAL: SUPER_ADMIN_JWT_SECRET environment variable is required in production.');
        }
        if (!superAdminSecret) {
            logger.warn('SECURITY WARNING: SUPER_ADMIN_JWT_SECRET not set. Using insecure default for development only.');
        }
        _superAdminSecret = new TextEncoder().encode(
            superAdminSecret || 'super_admin_default_secret_change_me'
        );
    }
    return _superAdminSecret;
}

export interface SuperAdminSession {
    id: string;
    email: string;
    name: string;
    isSuperAdmin: true;
}

/**
 * Sign a Super-Admin JWT token
 */
export async function signSuperAdminToken(data: Omit<SuperAdminSession, 'isSuperAdmin'>): Promise<string> {
    const token = await new SignJWT({ ...data, isSuperAdmin: true })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('4h') // Shorter expiry for super-admin
        .setIssuedAt()
        .sign(getSuperAdminSecret());

    return token;
}

/**
 * Verify a Super-Admin JWT token
 */
export async function verifySuperAdminToken(token: string): Promise<SuperAdminSession | null> {
    try {
        const { payload } = await jwtVerify(token, getSuperAdminSecret());

        if (!payload.isSuperAdmin) {
            return null;
        }

        return {
            id: payload.id as string,
            email: payload.email as string,
            name: payload.name as string,
            isSuperAdmin: true,
        };
    } catch {
        return null;
    }
}

/**
 * Get Super-Admin session from cookies
 */
export async function getSuperAdminSession(cookieValue?: string): Promise<SuperAdminSession | null> {
    if (!cookieValue) return null;
    return verifySuperAdminToken(cookieValue);
}

/**
 * Hash email for Super-Admin lookup
 */
export function hashSuperAdminEmail(email: string): string {
    return hashSHA256(email.toLowerCase().trim());
}

/**
 * Generate a secure random slug from tenant name
 */
export function generateTenantSlug(name: string): string {
    const base = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);

    // Add cryptographically random suffix for uniqueness
    const suffix = crypto.randomBytes(3).toString('hex').substring(0, 4);
    return `${base}-${suffix}`;
}

/**
 * Validate tenant slug format
 */
export function isValidSlug(slug: string): boolean {
    return /^[a-z0-9][a-z0-9-]{1,63}[a-z0-9]$/.test(slug);
}

/**
 * Reserved slugs that cannot be used for tenants
 */
const RESERVED_SLUGS = [
    'www', 'app', 'api', 'admin', 'super-admin', 'superadmin',
    'login', 'logout', 'signup', 'register', 'auth', 'oauth',
    'help', 'support', 'docs', 'documentation', 'blog', 'about',
    'pricing', 'demo', 'trial', 'test', 'staging', 'dev', 'development',
    'static', 'assets', 'cdn', 'mail', 'email', 'smtp', 'ftp',
];

export function isReservedSlug(slug: string): boolean {
    return RESERVED_SLUGS.includes(slug.toLowerCase());
}
