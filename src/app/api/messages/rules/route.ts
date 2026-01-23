import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET /api/messages/rules - List user's inbound rules
export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const rules = await prisma.inboundRule.findMany({
            where: { userId: session.id },
            orderBy: { priority: 'asc' },
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

        // Flatten the targetFolders structure
        const formattedRules = rules.map((rule: any) => ({
            ...rule,
            targetFolders: rule.targetFolders.map((tf: any) => tf.folder)
        }));

        return NextResponse.json(formattedRules);
    } catch (error) {
        console.error('Error fetching rules:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST /api/messages/rules - Create new rule
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const {
            name,
            enabled = true,
            priority = 0,
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

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Rule name is required' }, { status: 400 });
        }

        if (!targetFolderIds || !Array.isArray(targetFolderIds) || targetFolderIds.length === 0) {
            return NextResponse.json({ error: 'At least one target folder is required' }, { status: 400 });
        }

        // Verify all target folders belong to user
        const folders = await prisma.messageFolder.findMany({
            where: {
                id: { in: targetFolderIds },
                userId: session.id
            }
        });

        if (folders.length !== targetFolderIds.length) {
            return NextResponse.json({ error: 'One or more target folders not found' }, { status: 404 });
        }

        const rule = await prisma.inboundRule.create({
            data: {
                name: name.trim(),
                enabled,
                priority,
                senderContains: senderContains || null,
                senderEquals: senderEquals || null,
                subjectContains: subjectContains || null,
                contentContains: contentContains || null,
                caseNumberContains: caseNumberContains || null,
                isExternal: isExternal ?? null,
                hasAttachment: hasAttachment ?? null,
                isHighPriority: isHighPriority ?? null,
                userId: session.id,
                targetFolders: {
                    create: targetFolderIds.map((folderId: string) => ({
                        folderId
                    }))
                }
            },
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
            ...rule,
            targetFolders: rule.targetFolders.map((tf: any) => tf.folder)
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating rule:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
