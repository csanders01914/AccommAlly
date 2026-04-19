import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

/**
 * Generate a Document Control Number (DCN) as timestamp: YYYYMMDDHHmmssSSS
 */
function generateDCN(): string {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const ms = now.getMilliseconds().toString().padStart(3, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}${ms}`;
}

/**
 * POST /api/cases/[id]/documents - Upload a document to an existing case
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { session, error } = await requireAuth({ request });
        if (error) return error;

        const { id: caseId } = await params;
        const tenantPrisma = withTenantScope(prisma, session.tenantId);

        // Verify case exists within the tenant
        const caseExists = await tenantPrisma.case.findUnique({
            where: { id: caseId },
            select: { id: true },
        });

        if (!caseExists) {
            return NextResponse.json(
                { error: 'Case not found' },
                { status: 404 }
            );
        }

        // Parse multipart form data
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const category = (formData.get('category') as string) || 'OTHER';

        if (!file || file.size === 0) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate category
        const validCategories = ['MEDICAL', 'LEGAL', 'HR', 'CORRESPONDENCE', 'OTHER'];
        if (!validCategories.includes(category)) {
            return NextResponse.json(
                { error: 'Invalid category' },
                { status: 400 }
            );
        }

        // Generate DCN and read file data
        const documentControlNumber = generateDCN();
        const buffer = Buffer.from(await file.arrayBuffer());

        // Create document record — uploadedById is the authenticated user, not a random coordinator
        const document = await tenantPrisma.document.create({
            data: {
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                fileData: buffer,
                documentControlNumber,
                category,
                caseId,
                uploadedById: session.id,
            },
            include: {
                uploadedBy: {
                    select: { id: true, name: true },
                },
            },
        });

        // Return document info (without binary data)
        return NextResponse.json({
            id: document.id,
            fileName: document.fileName,
            fileType: document.fileType,
            fileSize: document.fileSize,
            documentControlNumber: document.documentControlNumber,
            category: document.category,
            createdAt: document.createdAt,
            uploadedBy: document.uploadedBy,
        });

    } catch (error) {
        logger.error({ err: error }, 'Error uploading document:');
        return NextResponse.json(
            { error: 'Failed to upload document' },
            { status: 500 }
        );
    }
}
