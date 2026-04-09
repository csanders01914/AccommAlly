/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import { decrypt, encrypt, hash } from '@/lib/encryption';

export async function GET(request: NextRequest) {
    try {
        const { session, error } = await requireAuth();

        if (error) return error;

        const tenantPrisma = withTenantScope(prisma, session.tenantId);
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
        const { session, error } = await requireAuth();
        if (error) return error;
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const formData = await request.formData();
        const recipientId = formData.get('recipientId') as string | null;
        const subject = formData.get('subject') as string | null;
        const contentBody = formData.get('body') as string | null;
        const caseId = formData.get('caseId') as string | null;
        const replyToId = formData.get('replyToId') as string | null;
        const forwardedFromId = formData.get('forwardedFromId') as string | null;
        const isExternal = formData.get('isExternal') === 'true';
        const externalEmail = formData.get('externalEmail') as string | null;
        const externalName = formData.get('externalName') as string | null;
        const attachmentFiles = formData.getAll('attachments') as File[];

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

        // Attachment validation
        const MAX_FILE_SIZE = 10 * 1024 * 1024;
        const realAttachments = attachmentFiles.filter(f => f.size > 0);
        if (realAttachments.length > 10) {
            return NextResponse.json({ error: 'Maximum 10 attachments per message' }, { status: 400 });
        }
        for (const file of realAttachments) {
            if (file.size > MAX_FILE_SIZE) {
                return NextResponse.json({ error: `File "${file.name}" exceeds 10MB limit` }, { status: 400 });
            }
        }

        let encryptedEmail = null;
        let emailHash = null;
        let encryptedName = null;

        if (isExternal) {
            encryptedEmail = encrypt(externalEmail!);
            emailHash = hash(externalEmail!);
            encryptedName = encrypt(externalName!);
        }

        const message = await prisma.message.create({
            data: {
                senderId: session.id,
                tenantId: session.tenantId,
                recipientId: isExternal ? null : recipientId,
                subject: subject || null,
                content: encrypt(contentBody!),
                caseId: caseId || null,
                replyToId: replyToId || null,
                forwardedFromId: forwardedFromId || null,
                read: false,
                isExternal: isExternal || false,
                externalEmail: encryptedEmail,
                externalEmailHash: emailHash,
                externalName: encryptedName,
                direction: isExternal ? 'OUTBOUND' : 'INTERNAL',
            },
        });

        // Save attachments
        if (realAttachments.length > 0) {
            const attachmentData = await Promise.all(
                realAttachments.map(async f => ({
                    messageId: message.id,
                    filename: f.name,
                    mimeType: f.type || 'application/octet-stream',
                    size: f.size,
                    data: Buffer.from(await f.arrayBuffer()),
                }))
            );
            await prisma.messageAttachment.createMany({ data: attachmentData });
        }

        // Audit log
        await prisma.auditLog.create({
            data: {
                entityType: 'Message',
                entityId: message.id,
                action: 'CREATE',
                userId: session.id,
                metadata: JSON.stringify({
                    recipientId: isExternal ? 'EXTERNAL' : recipientId,
                    subject: subject || 'No Subject',
                    caseId: caseId,
                    attachmentCount: realAttachments.length,
                }),
            },
        });

        // Apply inbound rules
        if (!isExternal && recipientId) {
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
