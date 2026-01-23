import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
        const { id: caseId } = await params;

        // Verify case exists
        const caseExists = await prisma.case.findUnique({
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

        // Get uploader (use first coordinator for now - in production, get from session)
        const uploader = await prisma.user.findFirst({
            where: { role: 'COORDINATOR' },
        });

        if (!uploader) {
            return NextResponse.json(
                { error: 'No uploading user found' },
                { status: 500 }
            );
        }

        // Generate DCN and read file data
        const documentControlNumber = generateDCN();
        const buffer = Buffer.from(await file.arrayBuffer());

        // Create document record
        const document = await prisma.document.create({
            data: {
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                fileData: buffer,
                documentControlNumber,
                category,
                caseId,
                uploadedById: uploader.id,
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
        console.error('Error uploading document:', error);
        return NextResponse.json(
            { error: 'Failed to upload document' },
            { status: 500 }
        );
    }
}
