import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

// GET /api/messages/folders - List user's folders
export async function GET() {
    try {
        const { session, error } = await requireAuth();

        if (error) return error;

        const tenantPrisma = withTenantScope(prisma, session.tenantId);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch folders with filtered message assignments to calculate correct counts
        const folders = await prisma.messageFolder.findMany({
            where: { userId: session.id },
            orderBy: { position: 'asc' },
            include: {
                messages: {
                    where: {
                        message: {
                            read: false,
                            OR: [
                                { senderId: session.id, deletedBySender: false },
                                { recipientId: session.id, deletedByRecipient: false }
                            ]
                        }
                    },
                    select: { id: true }
                }
            }
        });

        // Transform results to match expected _count structure
        const folderData = folders.map((folder: any) => ({
            ...folder,
            _count: { messages: folder.messages.length },
            messages: undefined // Remove the raw array from response
        }));

        return NextResponse.json(folderData);
    } catch (error) {
        logger.error({ err: error }, 'Error fetching folders:');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST /api/messages/folders - Create new folder
export async function POST(request: NextRequest) {
    try {
        const { session, error } = await requireAuth();

        if (error) return error;

        const tenantPrisma = withTenantScope(prisma, session.tenantId);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, color, icon } = await request.json();

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
        }

        // Get the highest position to add new folder at the end
        const lastFolder = await prisma.messageFolder.findFirst({
            where: { userId: session.id },
            orderBy: { position: 'desc' }
        });

        const folder = await prisma.messageFolder.create({
            data: {
                name: name.trim(),
                color: color || '#6366f1',
                icon: icon || null,
                position: (lastFolder?.position ?? -1) + 1,
                userId: session.id
            }
        });

        return NextResponse.json(folder, { status: 201 });
    } catch (error: any) {
        logger.error({ err: error }, 'Error creating folder:');

        // Handle unique constraint violation
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'A folder with this name already exists' }, { status: 409 });
        }

        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
