import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';

/**
 * GET /api/document-templates
 * Returns template names/ids for the current tenant. No file data.
 */
export async function GET() {
    try {
        const { session, error } = await requireAuth();
        if (error) return error;

        const tenantPrisma = withTenantScope(prisma, session.tenantId);

        const templates = await tenantPrisma.documentTemplate.findMany({
            select: { id: true, name: true, description: true },
            orderBy: { name: 'asc' },
        });

        return NextResponse.json({ templates });
    } catch (err) {
        console.error('GET /api/document-templates error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
