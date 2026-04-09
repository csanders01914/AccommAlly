import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import mammoth from 'mammoth';
import { requireSuperAdmin } from '@/lib/require-super-admin';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * GET /api/super-admin/document-templates?tenantId=X
 * List all templates for a tenant (no file data returned).
 */
export async function GET(request: NextRequest) {
    try {
        const session = await requireSuperAdmin();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tenantId = new URL(request.url).searchParams.get('tenantId');
        if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 });

        const templates = await prisma.documentTemplate.findMany({
            where: { tenantId },
            select: {
                id: true,
                name: true,
                description: true,
                variableMappings: true,
                createdByAdminId: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ templates });
    } catch (err) {
        console.error('GET document-templates error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST /api/super-admin/document-templates
 * Upload a DOCX, extract HTML, store template.
 * Body: multipart/form-data — file, tenantId, name, description?, variableMappings (JSON string)
 */
export async function POST(request: NextRequest) {
    try {
        const session = await requireSuperAdmin();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const tenantId = formData.get('tenantId') as string | null;
        const name = formData.get('name') as string | null;
        const description = formData.get('description') as string | null;
        const mappingsRaw = formData.get('variableMappings') as string | null;

        if (!file || !tenantId || !name) {
            return NextResponse.json({ error: 'file, tenantId, and name are required' }, { status: 400 });
        }

        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'File too large. Maximum 10MB.' }, { status: 400 });
        }

        const ext = file.name.split('.').pop()?.toLowerCase();
        if (file.type !== DOCX_MIME && ext !== 'docx') {
            return NextResponse.json({ error: 'Only .docx files are accepted.' }, { status: 400 });
        }

        const tenantExists = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
        if (!tenantExists) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

        const buffer = Buffer.from(await file.arrayBuffer());
        const { value: htmlContent, messages: conversionWarnings } = await mammoth.convertToHtml({ buffer });
        if (conversionWarnings.length > 0) {
            console.warn('Mammoth conversion warnings:', conversionWarnings);
        }

        let variableMappings: unknown = [];
        try {
            variableMappings = mappingsRaw ? JSON.parse(mappingsRaw) : [];
        } catch {
            return NextResponse.json({ error: 'variableMappings must be valid JSON' }, { status: 400 });
        }

        const template = await prisma.documentTemplate.create({
            data: {
                tenantId,
                name,
                description: description || null,
                originalFile: buffer,
                htmlContent,
                variableMappings,
                createdByAdminId: session.id,
            },
            select: {
                id: true,
                name: true,
                description: true,
                variableMappings: true,
                createdByAdminId: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return NextResponse.json({ template }, { status: 201 });
    } catch (err) {
        console.error('POST document-templates error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
