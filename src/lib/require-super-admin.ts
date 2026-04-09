import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { getSuperAdminSession } from '@/lib/super-admin-auth';
import type { SuperAdminSession } from '@/lib/super-admin-auth';

/**
 * Verify the request has a valid, active super-admin session.
 * Returns the session if valid, null otherwise.
 */
export async function requireSuperAdmin(): Promise<SuperAdminSession | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('super_admin_token')?.value;
    const session = await getSuperAdminSession(token);
    if (!session) return null;
    const admin = await prisma.superAdmin.findUnique({
        where: { id: session.id },
        select: { id: true, active: true },
    });
    return admin?.active ? session : null;
}
