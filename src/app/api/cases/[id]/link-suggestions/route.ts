import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/**
 * GET /api/cases/[id]/link-suggestions - Get other cases by same claimant for linking
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get the current case with its claimant
        const currentCase = await prisma.case.findUnique({
            where: { id },
            select: {
                id: true,
                claimantRef: true,
                claimFamilyId: true
            }
        });

        if (!currentCase) {
            return NextResponse.json({ error: 'Case not found' }, { status: 404 });
        }

        if (!currentCase.claimantRef) {
            return NextResponse.json([]);
        }

        // Find other cases by the same claimant (excluding current case)
        const otherCases = await prisma.case.findMany({
            where: {
                claimantRef: currentCase.claimantRef,
                id: { not: id }
            },
            select: {
                id: true,
                caseNumber: true,
                title: true,
                description: true,
                status: true,
                createdAt: true,
                claimFamilyId: true,
                claimFamily: {
                    select: { id: true, name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Format response with description snippet
        const suggestions = otherCases.map((c: typeof otherCases[0]) => ({
            id: c.id,
            caseNumber: c.caseNumber,
            title: c.title,
            descriptionSnippet: c.description
                ? c.description.substring(0, 100) + (c.description.length > 100 ? '...' : '')
                : null,
            status: c.status,
            createdAt: c.createdAt,
            claimFamily: c.claimFamily,
            isInSameFamily: c.claimFamilyId === currentCase.claimFamilyId && c.claimFamilyId !== null
        }));

        return NextResponse.json(suggestions);
    } catch (error) {
        console.error('Error fetching link suggestions:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
