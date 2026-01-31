import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/**
 * GET /api/claim-families - List claim families
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const families = await prisma.claimFamily.findMany({
            include: {
                cases: {
                    select: {
                        id: true,
                        caseNumber: true,
                        title: true,
                        status: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(families);
    } catch (error) {
        console.error('Error fetching claim families:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST /api/claim-families - Create a claim family with linked cases
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, caseIds } = body;

        if (!caseIds || !Array.isArray(caseIds) || caseIds.length < 1) {
            return NextResponse.json(
                { error: 'At least one case ID is required' },
                { status: 400 }
            );
        }

        // Create the family and link cases
        const family = await prisma.claimFamily.create({
            data: {
                name: name || null,
                cases: {
                    connect: caseIds.map((id: string) => ({ id }))
                }
            },
            include: {
                cases: {
                    select: {
                        id: true,
                        caseNumber: true,
                        title: true
                    }
                }
            }
        });

        // Create audit logs for each linked case
        for (const caseId of caseIds) {
            await prisma.auditLog.create({
                data: {
                    entityType: 'Case',
                    entityId: caseId,
                    action: 'UPDATE',
                    field: 'claimFamilyId',
                    newValue: family.id,
                    metadata: JSON.stringify({
                        action: 'link_to_family',
                        familyName: name || 'Unnamed Family'
                    }),
                    userId: session.id,
                }
            });
        }

        return NextResponse.json(family, { status: 201 });
    } catch (error) {
        console.error('Error creating claim family:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
