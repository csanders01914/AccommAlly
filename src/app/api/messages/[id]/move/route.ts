import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

/**
 * POST /api/messages/[id]/move - Move a message to a folder
 * Body: { folderId: string } | { folderId: null } (to remove from all folders)
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { session, error } = await requireAuth();

        if (error) return error;

        const tenantPrisma = withTenantScope(prisma, session.tenantId);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: messageId } = await params;
        const { folderId } = await request.json();

        // Verify message belongs to user (as recipient or sender)
        // Strictly speaking, folders are personal to the user.
        // We should ensure the user has access to the message.
        const message = await prisma.message.findFirst({
            where: {
                id: messageId,
                OR: [
                    { recipientId: session.id },
                    { senderId: session.id }
                ]
            }
        });

        if (!message) {
            return NextResponse.json({ error: 'Message not found' }, { status: 404 });
        }

        // Transaction handling:
        // 1. Remove existing folder assignments for this message AND this user.
        //    (A message could theoretically be in folders for both sender and recipient independently,
        //     so we must filter by the folder's owner).

        // Find existing assignments for this user's folders
        const userFolders = await prisma.messageFolder.findMany({
            where: { userId: session.id },
            select: { id: true }
        });
        const userFolderIds = userFolders.map((f: { id: string }) => f.id);

        await prisma.$transaction(async (tx: any) => {
            // Handle STARRED as a special toggle FIRST (does NOT move message, does NOT change folders)
            if (folderId === 'starred') {

                await tx.message.update({
                    where: { id: messageId },
                    data: { starred: true }
                });
                return; // Exit transaction early - don't touch folders at all
            }

            // For all other moves, remove from current user's folders first
            if (userFolderIds.length > 0) {
                const deleted = await tx.messageFolderAssignment.deleteMany({
                    where: {
                        messageId: messageId,
                        folderId: { in: userFolderIds }
                    }
                });

            } else {

            }

            // Handle System Folders (these DO move the message)
            const systemFolders = ['inbox', 'trash', 'junk', 'archive'];

            if (systemFolders.includes(folderId)) {
                const updates: any = {
                    inInbox: false,
                    inTrash: false,
                    inJunk: false,
                    archived: false,
                    deletedByRecipient: false // If restoring from trash
                };

                if (folderId === 'inbox') updates.inInbox = true;
                if (folderId === 'trash') {
                    updates.inTrash = true;
                    updates.trashDate = new Date();
                }
                if (folderId === 'junk') updates.inJunk = true;
                if (folderId === 'archive') updates.archived = true;

                await tx.message.update({
                    where: { id: messageId },
                    data: updates
                });
            }
            // Handle Custom Folders
            else if (folderId) {
                // Verify new folder belongs to user
                const targetFolder = await tx.messageFolder.findUnique({
                    where: { id: folderId }
                });

                if (!targetFolder || targetFolder.userId !== session.id) {
                    throw new Error('Invalid folder');
                }

                await tx.messageFolderAssignment.create({
                    data: {
                        messageId: messageId,
                        folderId: folderId
                    }
                });

                // Move out of Inbox (and ensure not in other system folders)

                await tx.message.update({
                    where: { id: messageId },
                    data: {
                        inInbox: false,
                        inTrash: false,
                        inJunk: false,
                        // leave archived as is? moving to a folder usually unarchives? 
                        // User expectation: If in Folder, is it archived? Usually archived is separate system. 
                        // But for simplicity, let's treat "Folders" as distinct from "Archive".
                        archived: false
                    }
                });
            } else {
                // Default / Null -> Inbox
                await tx.message.update({
                    where: { id: messageId },
                    data: { inInbox: true, inTrash: false, inJunk: false, archived: false }
                });
            }
        });

        // Audit Log: Message Moved
        if (folderId !== 'starred') {
            await prisma.auditLog.create({
                data: {
                    entityType: 'Message',
                    entityId: messageId,
                    action: 'UPDATE', // or MOVE_MESSAGE
                    userId: session.id,
                    metadata: JSON.stringify({
                        action: 'move_to_folder',
                        folder: folderId || 'inbox'
                    })
                }
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        logger.error({ err: error }, 'Move Message Error:');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

