import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import { decrypt } from '@/lib/encryption';
import logger from '@/lib/logger';

// GET /api/messages/folders/[id]/messages - Get messages in a folder
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: folderId } = await params;
        const { session, error } = await requireAuth();

        if (error) return error;

        const tenantPrisma = withTenantScope(prisma, session.tenantId);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify folder ownership
        const folder = await prisma.messageFolder.findFirst({
            where: { id: folderId, userId: session.id }
        });

        if (!folder) {
            return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
        }

        // Get messages assigned to this folder
        const assignments = await prisma.messageFolderAssignment.findMany({
            where: {
                folderId,
                message: {
                    OR: [
                        { senderId: session.id, deletedBySender: false },
                        { recipientId: session.id, deletedByRecipient: false }
                    ]
                }
            },
            include: {
                message: {
                    include: {
                        sender: { select: { id: true, name: true, email: true } },
                        recipient: { select: { id: true, name: true, email: true } },
                        case: { select: { id: true, caseNumber: true, clientName: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Format messages and decrypt content
        const messages = await Promise.all(assignments.map(async (a: any) => {
            const msg = a.message;
            let decryptedContent = msg.content;
            let decryptedSubject = msg.subject;

            try {
                decryptedContent = decrypt(msg.content);
            } catch {
                // Content might not be encrypted
            }

            try {
                if (msg.subject) {
                    decryptedSubject = decrypt(msg.subject);
                }
            } catch {
                // Subject might not be encrypted
            }

            return {
                id: msg.id,
                subject: decryptedSubject,
                body: decryptedContent,
                createdAt: msg.createdAt,
                isRead: msg.read,
                starred: msg.starred,
                archived: msg.archived,
                sender: {
                    ...msg.sender,
                    name: decrypt(msg.sender.name)
                },
                recipient: {
                    ...msg.recipient,
                    name: decrypt(msg.recipient.name)
                },
                isExternal: msg.isExternal,
                externalName: msg.externalName ? decrypt(msg.externalName) : null,
                externalEmail: msg.externalEmail ? decrypt(msg.externalEmail) : null,
                direction: msg.direction,
                case: msg.case
            };
        }));

        return NextResponse.json(messages);
    } catch (error) {
        logger.error({ err: error }, 'Error fetching folder messages:');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
