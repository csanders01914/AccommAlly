import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// PATCH /api/messages/rules/[id] - Update rule
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify ownership
        const existing = await prisma.inboundRule.findFirst({
            where: { id, userId: session.id }
        });

        if (!existing) {
            return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
        }

        const {
            name,
            enabled,
            priority,
            senderContains,
            senderEquals,
            subjectContains,
            contentContains,
            caseNumberContains,
            isExternal,
            hasAttachment,
            isHighPriority,
            targetFolderIds
        } = await request.json();

        // If targetFolderIds provided, verify they belong to user
        if (targetFolderIds) {
            const folders = await prisma.messageFolder.findMany({
                where: {
                    id: { in: targetFolderIds },
                    userId: session.id
                }
            });

            if (folders.length !== targetFolderIds.length) {
                return NextResponse.json({ error: 'One or more target folders not found' }, { status: 404 });
            }
        }

        // Update the rule
        const rule = await prisma.inboundRule.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(enabled !== undefined && { enabled }),
                ...(priority !== undefined && { priority }),
                ...(senderContains !== undefined && { senderContains: senderContains || null }),
                ...(senderEquals !== undefined && { senderEquals: senderEquals || null }),
                ...(subjectContains !== undefined && { subjectContains: subjectContains || null }),
                ...(contentContains !== undefined && { contentContains: contentContains || null }),
                ...(caseNumberContains !== undefined && { caseNumberContains: caseNumberContains || null }),
                ...(isExternal !== undefined && { isExternal }),
                ...(hasAttachment !== undefined && { hasAttachment }),
                ...(isHighPriority !== undefined && { isHighPriority })
            }
        });

        // Update target folders if provided
        if (targetFolderIds) {
            // Delete existing and create new
            await prisma.inboundRuleFolder.deleteMany({
                where: { ruleId: id }
            });

            await prisma.inboundRuleFolder.createMany({
                data: targetFolderIds.map((folderId: string) => ({
                    ruleId: id,
                    folderId
                }))
            });
        }

        // Fetch updated rule with folders
        const updatedRule = await prisma.inboundRule.findUnique({
            where: { id },
            include: {
                targetFolders: {
                    include: {
                        folder: {
                            select: { id: true, name: true, color: true }
                        }
                    }
                }
            }
        });

        return NextResponse.json({
            ...updatedRule,
            targetFolders: updatedRule?.targetFolders.map((tf: any) => tf.folder) || []
        });
    } catch (error) {
        console.error('Error updating rule:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE /api/messages/rules/[id] - Delete rule
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify ownership
        const existing = await prisma.inboundRule.findFirst({
            where: { id, userId: session.id }
        });

        if (!existing) {
            return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
        }

        await prisma.inboundRule.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting rule:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
