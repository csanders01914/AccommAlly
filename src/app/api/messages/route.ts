/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { decrypt, encrypt, hash } from '@/lib/encryption';

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const box = searchParams.get('box') || 'inbox'; // 'inbox', 'sent', 'starred', 'archived'
        const limit = parseInt(searchParams.get('limit') || '50');

        const whereClause: any = {};



        if (box === 'inbox') {
            // Simplified query matching unread-count logic exactly
            whereClause.recipientId = session.id;
            whereClause.deletedByRecipient = false;
            whereClause.inInbox = true;
            whereClause.inTrash = false;
            whereClause.inJunk = false;
            console.log('API DEBUG: Inbox Query constructed:', JSON.stringify(whereClause));
            // Note: We no longer need to check folderAssignments 'none' because 'inInbox' flag handles it explicitly.
            // This supports "Copy to Folder" (inInbox=true + folderAssignment) vs "Move to Folder" (inInbox=false + folderAssignment).
        } else if (box === 'sent') {
            whereClause.senderId = session.id;
            whereClause.deletedBySender = false;
        } else if (box === 'starred') {
            // For starred, we need to check if user is sender OR recipient, and check respective delete flag
            whereClause.starred = true;
            whereClause.OR = [
                { recipientId: session.id, deletedByRecipient: false },
                { senderId: session.id, deletedBySender: false }
            ];
        } else if (box === 'trash') {
            whereClause.recipientId = session.id;
            whereClause.inTrash = true;
            whereClause.deletedByRecipient = false;
            // 90-day retention filter - only show messages trashed within last 90 days
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            whereClause.trashDate = { gte: ninetyDaysAgo };
        } else if (box === 'junk') {
            whereClause.recipientId = session.id;
            whereClause.inJunk = true;
            whereClause.deletedByRecipient = false;
        } else if (box === 'archived') {
            whereClause.recipientId = session.id;
            whereClause.archived = true;
            whereClause.deletedByRecipient = false;
        } else {
            // Default (custom folder or other)
            whereClause.recipientId = session.id;
            whereClause.archived = false;
            whereClause.deletedByRecipient = false;
            whereClause.inTrash = false;
            whereClause.inJunk = false;
        }

        const messages = await prisma.message.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                sender: { select: { id: true, name: true, email: true } },
                recipient: { select: { id: true, name: true, email: true } },
                case: { select: { id: true, caseNumber: true, clientName: true } }
            }
        });

        if (box === 'inbox') {
            console.log('--- API DEBUG: Inbox Fetch ---');
            console.log(`User ID: ${session.id}`);
            console.log(`Found ${messages.length} messages.`);
            messages.forEach((m: any) => {
                console.log(`msg: ${m.id} | S:${m.senderId} | R:${m.recipientId} | Read:${m.read} | Arch:${m.archived} | Ext:${m.isExternal}`);
            });
        }

        // Decrypt names and map fields for frontend compatibility
        const formattedMessages = messages.map((m: any) => ({
            id: m.id,
            subject: m.subject || '',
            body: decrypt(m.content), // Decrypt content for frontend
            isRead: m.read,  // Map read -> isRead for frontend
            starred: m.starred,
            archived: m.archived,
            replyToId: m.replyToId,
            forwardedFromId: m.forwardedFromId,
            createdAt: m.createdAt,
            sender: {
                id: m.sender.id,
                name: decrypt(m.sender.name),
                email: m.sender.email
            },
            recipient: m.recipient ? {
                id: m.recipient.id,
                name: decrypt(m.recipient.name),
                email: m.recipient.email
            } : (m.isExternal ? {
                id: 'external',
                name: m.externalName ? decrypt(m.externalName) : 'External User',
                email: m.externalEmail ? decrypt(m.externalEmail) : ''
            } : { id: 'unknown', name: 'Unknown', email: '' }),
            case: m.case ? {
                id: m.case.id,
                caseNumber: m.case.caseNumber,
                clientName: decrypt(m.case.clientName)
            } : null
        }));

        return NextResponse.json(formattedMessages);
    } catch (error) {
        console.error('Messages GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { recipientId, subject, body: contentBody, caseId, replyToId, forwardedFromId, isExternal, externalEmail, externalName } = body;

        // Validation
        if (isExternal) {
            if (!externalEmail || !externalName || !contentBody) {
                return NextResponse.json({ error: 'External Email, Name, and Body are required' }, { status: 400 });
            }
        } else {
            if (!recipientId || !contentBody) {
                return NextResponse.json({ error: 'Recipient and Body are required' }, { status: 400 });
            }
        }

        let encryptedEmail = null;
        let emailHash = null;
        let encryptedName = null;

        if (isExternal) {
            encryptedEmail = encrypt(externalEmail);
            emailHash = hash(externalEmail);
            encryptedName = encrypt(externalName);
        }

        const message = await prisma.message.create({
            data: {
                senderId: session.id,
                recipientId: isExternal ? null : recipientId,
                subject: subject || null,
                content: encrypt(contentBody),  // Encrypt content before saving
                caseId: caseId || null,
                replyToId: replyToId || null,
                forwardedFromId: forwardedFromId || null,
                read: false,
                isExternal: isExternal || false,
                externalEmail: encryptedEmail,
                externalEmailHash: emailHash,
                externalName: encryptedName,
                direction: isExternal ? 'OUTBOUND' : 'INTERNAL'
            }
        });

        // Audit Log: Message Sent
        await prisma.auditLog.create({
            data: {
                entityType: 'Message',
                entityId: message.id,
                action: 'CREATE', // or SEND_MESSAGE
                userId: session.id,
                metadata: JSON.stringify({
                    recipientId: isExternal ? 'EXTERNAL' : recipientId,
                    subject: subject || 'No Subject',
                    caseId: caseId
                })
            }
        });

        // Apply Inbound Rules for the recipient (if internal)
        if (!isExternal && recipientId) {
            // We can run this asynchronously without awaiting if we want faster response,
            // or await to ensure consistency. Await is safer for now.
            try {
                const { applyInboundRules } = await import('@/lib/rules');
                await applyInboundRules(message.id, recipientId);
            } catch (e) {
                console.error('Failed to trigger rules:', e);
            }
        }

        return NextResponse.json(message, { status: 201 });
    } catch (error) {
        console.error('Messages POST Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
