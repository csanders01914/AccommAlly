import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import mammoth from 'mammoth';
import { requireSuperAdmin } from '@/lib/require-super-admin';
import logger from '@/lib/logger';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MAX_SIZE = 10 * 1024 * 1024;

/**
 * GET /api/super-admin/document-templates/[id]
 * Returns template metadata (no file data).
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

 if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });
 return NextResponse.json({ template });
 } catch (err) {
 logger.error({ err: err }, 'GET document-template error:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}

/**
 * PUT /api/super-admin/document-templates/[id]
 * Update name, description, mappings. Optional file re-upload.
 * Body: multipart/form-data
 */
export async function PUT(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
 const session = await requireSuperAdmin();
 if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

 const { id } = await params;
 const existing = await prisma.documentTemplate.findUnique({ where: { id }, select: { id: true } });
 if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

 const formData = await request.formData();
 const name = formData.get('name') as string | null;
 const description = formData.get('description') as string | null;
 const mappingsRaw = formData.get('variableMappings') as string | null;
 const file = formData.get('file') as File | null;

 const updateData: Record<string, unknown> = {};
 if (name) updateData.name = name;
 if (description !== null) updateData.description = description || null;
 if (mappingsRaw) {
 try {
 updateData.variableMappings = JSON.parse(mappingsRaw);
 } catch {
 return NextResponse.json({ error: 'variableMappings must be valid JSON' }, { status: 400 });
 }
 }

 if (file) {
 if (file.size > MAX_SIZE) {
 return NextResponse.json({ error: 'File too large. Maximum 10MB.' }, { status: 400 });
 }
 const ext = file.name.split('.').pop()?.toLowerCase();
 if (file.type !== DOCX_MIME && ext !== 'docx') {
 return NextResponse.json({ error: 'Only .docx files are accepted.' }, { status: 400 });
 }
 const buffer = Buffer.from(await file.arrayBuffer());
 const { value: htmlContent, messages: conversionWarnings } = await mammoth.convertToHtml({ buffer });
 if (conversionWarnings.length > 0) {
 logger.warn({ warnings: conversionWarnings }, 'Mammoth conversion warnings');
 }
 updateData.originalFile = buffer;
 updateData.htmlContent = htmlContent;
 }

 const template = await prisma.documentTemplate.update({
 where: { id },
 data: updateData,
 select: { id: true, name: true, description: true, variableMappings: true, createdByAdminId: true, updatedAt: true },
 });

 return NextResponse.json({ template });
 } catch (err) {
 logger.error({ err: err }, 'PUT document-template error:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}

/**
 * DELETE /api/super-admin/document-templates/[id]
 */
export async function DELETE(
 _request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
 const session = await requireSuperAdmin();
 if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

 const { id } = await params;
 const existing = await prisma.documentTemplate.findUnique({ where: { id }, select: { id: true } });
 if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

 await prisma.documentTemplate.delete({ where: { id } });
 return NextResponse.json({ success: true });
 } catch (err) {
 logger.error({ err: err }, 'DELETE document-template error:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}
