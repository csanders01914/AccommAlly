import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || "default_dev_secret_key_change_me");
const ALG = "HS256";

async function getPortalSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get("portal_token")?.value;
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, SECRET_KEY, { algorithms: [ALG] });
        return payload;
    } catch {
        return null;
    }
}

export async function GET(request: NextRequest) {
    try {
        const session = await getPortalSession();
        if (!session || session.role !== 'CLAIMANT') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const caseData = await prisma.case.findUnique({
            where: { id: session.caseId as string },
            select: {
                caseNumber: true,
                status: true,
                clientName: true,
                createdAt: true,
                updatedAt: true,
                description: true,
                createdById: true, // Examiner ID for messaging
                createdBy: {
                    select: { name: true } // Examiner name for display
                },
                documents: {
                    select: { id: true, fileName: true, createdAt: true, category: true }
                },
                accommodations: {
                    select: { type: true, status: true, request: true }
                }
            }
        });

        if (!caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

        return NextResponse.json(caseData);

    } catch (error) {
        console.error("Portal Data Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
