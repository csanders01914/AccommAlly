import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSuperAdminSession } from '@/lib/super-admin-auth';
import { cookies } from 'next/headers';

async function requireSuperAdmin() {
    const cookieStore = await cookies();
    const token = cookieStore.get('super_admin_token')?.value;
    const session = await getSuperAdminSession(token);
    if (!session) return null;
    const admin = await prisma.superAdmin.findUnique({
        where: { id: session.id },
        select: { id: true, active: true },
    });
    return admin?.active ? session : null;
}

/**
 * GET /api/super-admin/document-templates/[id]/download
 * Returns the original DOCX file as a download.
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await requireSuperAdmin();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const template = await prisma.documentTemplate.findUnique({
            where: { id },
            select: { name: true, originalFile: true },
        });

        if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const safeName = template.name.replace(/[^a-zA-Z0-9-_]/g, '_');
        return new NextResponse(template.originalFile, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="${safeName}.docx"`,
            },
        });
    } catch (err) {
        console.error('Download document-template error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
