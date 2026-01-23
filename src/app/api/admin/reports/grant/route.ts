import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Total Individuals Served (Approximate via Unique Names for now, or SSN Hash if reliable)
        // AccessAlly uses Case as main unit. 
        // We can count unique clientNames as a proxy for distinct individuals served if SSN hash isn't fully populated on legacy.
        const cases = await prisma.case.findMany({
            select: {
                clientName: true,
                program: true,
                accommodations: {
                    select: { type: true, status: true }
                }
            }
        });

        const uniqueIndividuals = new Set(cases.map((c: { clientName: string }) => c.clientName)).size;

        // 2. Total Accommodations
        const totalAccommodations = cases.reduce((acc: number, c: { accommodations: unknown[] }) => acc + c.accommodations.length, 0);

        // 3. Demographics (Program Distribution)
        const programDistribution: Record<string, number> = {};
        cases.forEach((c: { program: string | null }) => {
            const prog = c.program || 'Unassigned';
            programDistribution[prog] = (programDistribution[prog] || 0) + 1;
        });

        // 4. Accommodation Types
        const accommodationTypes: Record<string, number> = {};
        cases.forEach((c: { accommodations: { type: string }[] }) => {
            c.accommodations.forEach((a: { type: string }) => {
                accommodationTypes[a.type] = (accommodationTypes[a.type] || 0) + 1;
            });
        });

        const report = {
            generatedAt: new Date().toISOString(),
            generatedBy: session.name,
            period: 'All Time', // In future, add query params for Date Range
            metrics: {
                totalIndividualsServed: uniqueIndividuals,
                totalAccommodationsProvided: totalAccommodations,
                totalCases: cases.length
            },
            demographics: {
                programs: programDistribution
            },
            services: {
                accommodationTypes
            }
        };

        return NextResponse.json(report);

    } catch (error) {
        console.error('Grant Report Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
