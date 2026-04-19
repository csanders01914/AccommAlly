import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

// PATCH /api/messages/folders/[id] - Update folder
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { session, error } = await requireAuth();

        if (error) return error;

        const tenantPrisma = withTenantScope(prisma, session.tenantId);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify ownership
        const existing = await prisma.messageFolder.findFirst({
            where: { id, userId: session.id }
        });

        if (!existing) {
            return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
        }

        const { name, color, icon, position } = await request.json();

        const folder = await prisma.messageFolder.update({
            where: { id },
            data: {
                ...(name && { name: name.trim() }),
                ...(color && { color }),
                ...(icon !== undefined && { icon }),
                ...(position !== undefined && { position })
            }
        });

        return NextResponse.json(folder);
    } catch (error: any) {
        logger.error({ err: error }, 'Error updating folder:');

        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'A folder with this name already exists' }, { status: 409 });
        }

        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE /api/messages/folders/[id] - Delete folder
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { session, error } = await requireAuth();

        if (error) return error;

        const tenantPrisma = withTenantScope(prisma, session.tenantId);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify ownership
        const existing = await prisma.messageFolder.findFirst({
            where: { id, userId: session.id }
        });

        if (!existing) {
            return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
        }

        // Delete folder (cascade will remove assignments but not messages)
        await prisma.messageFolder.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error({ err: error }, 'Error deleting folder:');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
