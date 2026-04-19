import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

// Allowed file types for upload
const ALLOWED_FILE_TYPES = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
]);

const ALLOWED_EXTENSIONS = new Set([
    '.pdf', '.doc', '.docx', '.xlsx', '.xls',
    '.txt', '.csv', '.jpg', '.jpeg', '.png', '.gif', '.webp',
]);

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export async function POST(request: NextRequest) {
    try {
        const { session, error } = await requireAuth();
        if (error) return error;

        // Use tenant-scoped Prisma
        const tenantPrisma = withTenantScope(prisma, session.tenantId);

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const caseId = formData.get('caseId') as string;
        const category = formData.get('category') as string || 'OTHER';

        if (!file || !caseId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
                { status: 400 }
            );
        }

        // Validate file type
        const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
        if (!ALLOWED_FILE_TYPES.has(file.type) && !ALLOWED_EXTENSIONS.has(ext)) {
            return NextResponse.json(
                { error: 'File type not allowed. Accepted: PDF, DOCX, DOC, XLSX, XLS, TXT, CSV, JPG, PNG, GIF, WEBP' },
                { status: 400 }
            );
        }

        // Validate case exists within tenant
        const caseExists = await tenantPrisma.case.findUnique({
            where: { id: caseId }
        });

        if (!caseExists) {
            return NextResponse.json({ error: 'Case not found' }, { status: 404 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Generate Document Control Number (YYYYMMDDHHmmssSSS)
        const now = new Date();
        const dcn = now.getFullYear().toString() +
            (now.getMonth() + 1).toString().padStart(2, '0') +
            now.getDate().toString().padStart(2, '0') +
            now.getHours().toString().padStart(2, '0') +
            now.getMinutes().toString().padStart(2, '0') +
            now.getSeconds().toString().padStart(2, '0') +
            now.getMilliseconds().toString().padStart(3, '0');

        const newDoc = await tenantPrisma.document.create({
            data: {
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                fileData: buffer,
                documentControlNumber: dcn,
                category: category || 'OTHER',
                caseId: caseId,
                uploadedById: session.id
            }
        });

        // Audit Log: Document Uploaded
        await tenantPrisma.auditLog.create({
            data: {
                entityType: 'Document',
                entityId: newDoc.id,
                action: 'CREATE',
                userId: session.id,
                metadata: JSON.stringify({
                    fileName: file.name,
                    fileSize: file.size,
                    caseId: caseId
                })
            }
        });

        const document = {
            id: newDoc.id,
            fileName: newDoc.fileName,
            documentControlNumber: newDoc.documentControlNumber,
            createdAt: newDoc.createdAt
        };

        return NextResponse.json(document);

    } catch (error) {
        logger.error({ err: error }, 'Upload error:');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
