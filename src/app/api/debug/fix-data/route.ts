
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const results = {
            fixedUsers: 0,
            inboxMessages: [] as any[]
        };

        // 1. Fix Bad Names
        const users = await prisma.user.findMany();
        for (const user of users) {
            // Heuristic: Long, no spaces, likely hex/hash
            if (user.name && user.name.length > 40 && !user.name.includes(' ')) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { name: `User ${user.email.split('@')[0]}` } // Friendly fallback
                });
                results.fixedUsers++;
            }
        }

        // 2. Dump Inbox State for Debugging
        // We use the EXACT same query logic as the main API to see what it sees
        const messages = await prisma.message.findMany({
            where: {
                recipientId: session.id,
                deletedByRecipient: false,
                inInbox: true
            },
            select: {
                id: true,
                subject: true,
                inInbox: true,
                senderId: true,
                recipientId: true,
                deletedByRecipient: true
            }
        });

        results.inboxMessages = messages;

        // 3. Dump Folder Assignments (Diagnostic for Custom Folders)
        const assignments = await prisma.messageFolderAssignment.findMany({
            where: {
                folder: { userId: session.id }
            },
            include: {
                folder: { select: { name: true } },
                message: {
                    select: {
                        id: true,
                        subject: true,
                        senderId: true,
                        recipientId: true,
                        deletedBySender: true,
                        deletedByRecipient: true
                    }
                }
            }
        });

        (results as any).folderAssignments = assignments.map((a: any) => ({
            folder: a.folder.name,
            msgSubject: a.message.subject,
            msgId: a.message.id,
            isSender: a.message.senderId === session.id,
            isRecipient: a.message.recipientId === session.id,
            delBySender: a.message.deletedBySender,
            delByRecipient: a.message.deletedByRecipient
        }));

        return NextResponse.json({
            success: true,
            action: 'Ran Name Fixer & Inbox Diagnostic',
            results
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
