import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { decrypt, encrypt } from '@/lib/encryption';

// GET single call request
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        const call = await prisma.callRequest.findUnique({
            where: { id },
            include: {
                case: { select: { id: true, caseNumber: true, clientName: true } }
            }
        });

        if (!call) {
            return NextResponse.json({ error: 'Call request not found' }, { status: 404 });
        }

        // Decrypt
        const decrypted = {
            ...call,
            name: decrypt(call.name),
            phoneNumber: decrypt(call.phoneNumber),
            case: call.case ? {
                ...call.case,
                clientName: decrypt(call.case.clientName)
            } : null
        };

        return NextResponse.json(decrypted);

    } catch (error) {
        console.error('CallRequest GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PATCH update call request
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { scheduledFor, status, urgent, reason, note, caseId, phoneNumberUsed } = body;


        const updateData: any = {};

        if (scheduledFor !== undefined) {
            updateData.scheduledFor = scheduledFor ? new Date(scheduledFor) : null;
        }
        if (status !== undefined) updateData.status = status;
        if (urgent !== undefined) updateData.urgent = urgent;
        if (reason !== undefined) updateData.reason = reason;

        const call = await prisma.callRequest.update({
            where: { id },
            data: updateData,
            include: {
                case: { select: { id: true, caseNumber: true, clientName: true } }
            }
        });

        // Audit Log: Call Request Updated
        await prisma.auditLog.create({
            data: {
                entityType: 'CallRequest',
                entityId: call.id,
                action: 'UPDATE',
                userId: session.id,
                metadata: JSON.stringify({
                    status_change: status !== undefined ? status : 'unchanged',
                    has_note: !!note
                })
            }
        });

        if (status === 'COMPLETED' && note && call.caseId) {
            const noteContent = `**Return Call Note**\n` +
                (phoneNumberUsed ? `Phone Used: ${phoneNumberUsed}\n` : '') +
                `\n${note}`;

            await prisma.note.create({
                data: {
                    content: noteContent,
                    noteType: 'RETURN_CALL',
                    caseId: call.caseId,
                    authorId: (session as any).id
                }
            });
        }


        // Decrypt for response
        const decrypted = {
            ...call,
            name: decrypt(call.name),
            phoneNumber: decrypt(call.phoneNumber),
            case: call.case ? {
                ...call.case,
                clientName: decrypt(call.case.clientName)
            } : null
        };

        return NextResponse.json(decrypted);

    } catch (error) {
        console.error('CallRequest PATCH Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE call request
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Audit Log: Call Request Deleted
        await prisma.auditLog.create({
            data: {
                entityType: 'CallRequest',
                entityId: id,
                action: 'DELETE',
                userId: session.id,
                metadata: JSON.stringify({ action: 'delete_call_request' })
            }
        });

        await prisma.callRequest.delete({ where: { id } });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('CallRequest DELETE Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
