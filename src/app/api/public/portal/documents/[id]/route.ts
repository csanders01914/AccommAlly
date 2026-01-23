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

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getPortalSession();
        if (!session || session.role !== 'CLAIMANT') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Find the document and verify it belongs to the claimant's case
        const document = await prisma.document.findUnique({
            where: { id },
            select: {
                id: true,
                fileName: true,
                fileType: true,
                fileData: true,
                caseId: true
            }
        });

        if (!document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        // Verify the document belongs to the claimant's case
        if (document.caseId !== session.caseId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Return the document for viewing/download
        const response = new NextResponse(document.fileData);
        response.headers.set('Content-Type', document.fileType);
        response.headers.set(
            'Content-Disposition',
            `inline; filename="${encodeURIComponent(document.fileName)}"`
        );
        response.headers.set('Content-Length', document.fileData.length.toString());

        return response;

    } catch (error) {
        console.error('Portal Document Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
