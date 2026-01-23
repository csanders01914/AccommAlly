import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { fillTemplate, DecisionType } from '@/lib/templates';
import { format, addDays } from 'date-fns';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> } // Corrected types for Next.js 15
) {
    try {
        const session = await getSession();
        if (!session || (session.role !== 'ADMIN' && session.role !== 'COORDINATOR')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await context.params;
        const body = await request.json();
        const { type, missingInfo, reason } = body as { type: DecisionType; missingInfo?: string; reason?: string };

        if (!type) {
            return NextResponse.json({ error: 'Type is required' }, { status: 400 });
        }

        // Fetch Case Data
        const kase = await prisma.case.findUnique({
            where: { id },
            include: {
                accommodations: true
            }
        });

        if (!kase) {
            return NextResponse.json({ error: 'Case not found' }, { status: 404 });
        }

        // Prepare Data for Template
        const templateData: Record<string, string> = {
            clientName: kase.clientName,
            caseNumber: kase.caseNumber,
            accommodations: kase.accommodations.map((a: { type: string; description: string }) => `- ${a.type}: ${a.description}`).join('\n') || 'None specified',
            reason: reason || '[Reason not provided]',
            missingInfo: missingInfo || '[Details not provided]',
            dueDate: format(addDays(new Date(), 10), 'MMM d, yyyy') // Default 10 days out
        };

        // Generate Content
        const generated = fillTemplate(type, templateData);

        return NextResponse.json(generated);

    } catch (error) {
        console.error('Decision Gen Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
