import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logError } from '@/lib/logging';

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        const body = await request.json();

        const {
            transactionId,
            subject,
            description,
            reporterName,
            reporterEmail,
            reporterPhone,
            contactMethod
        } = body;

        // Basic validation
        if (!subject || !description || !reporterName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const bugReport = await prisma.bugReport.create({
            data: {
                transactionId: transactionId || null,
                subject,
                description,
                reporterName,
                reporterEmail,
                reporterPhone,
                contactMethod: contactMethod || 'NONE',
                userId: session?.id || null, // Optional link to user if logged in
                status: 'OPEN'
            }
        });

        // (Optional) Send email notification to admins here using notifications.ts logic in future

        return NextResponse.json({ success: true, id: bugReport.id });

    } catch (error) {
        // Use our new logger!
        const txId = await logError(error, {
            path: '/api/bug-reports',
            method: 'POST'
        });

        return NextResponse.json({
            error: 'Internal Server Error',
            transactionId: txId
        }, { status: 500 });
    }
}

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const reports = await prisma.bugReport.findMany({
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { name: true, email: true } } }
        });

        return NextResponse.json({ reports });

    } catch (error) {
        await logError(error, { path: '/api/bug-reports', method: 'GET' });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
