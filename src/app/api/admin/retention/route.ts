import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { subYears } from 'date-fns';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma'; // Using the shared prisma instance

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();

        // Security Check: Must be logged in and be an ADMIN
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
        }

        console.log(`[Admin: ${session.email}] Initiating 5-Year Data Retention Policy...`);

        const cutoffDate = subYears(new Date(), 5);

        // Execute Deletion
        const result = await prisma.message.deleteMany({
            where: {
                createdAt: {
                    lt: cutoffDate
                }
            }
        });



        // Audit Log: Retention Policy Executed
        await prisma.auditLog.create({
            data: {
                entityType: 'System',
                entityId: 'retention-policy',
                action: 'EXECUTE_RETENTION',
                userId: session.id,
                metadata: JSON.stringify({
                    deletedCount: result.count,
                    cutoffDate: cutoffDate.toISOString()
                })
            }
        });

        return NextResponse.json({
            success: true,
            deletedCount: result.count,
            message: `Retention policy executed successfully. ${result.count} messages older than 5 years were deleted.`,
            cutoffDate: cutoffDate.toISOString()
        });

    } catch (error) {
        console.error('Error running retention policy:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
