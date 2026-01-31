import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const caseId = formData.get('caseId') as string;
        const category = formData.get('category') as string || 'OTHER';

        if (!file || !caseId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Validate case exists
        const caseExists = await prisma.case.findUnique({
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

        // Check if DCN exists (highly unlikely with ms precision, but good practice)
        // Or assume unique for now.

        const newDoc = await prisma.document.create({
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
        await prisma.auditLog.create({
            data: {
                entityType: 'Document',
                entityId: newDoc.id,
                action: 'CREATE', // or UPLOAD
                userId: session.id,
                metadata: JSON.stringify({
                    fileName: file.name,
                    fileSize: file.size,
                    caseId: caseId
                })
            }
        });
        // The select block was part of the original document.create call.
        // To maintain the original return structure, we need to fetch the selected fields
        // from newDoc or adjust the return. Assuming the original intent was to return
        // these fields, we'll construct the return object based on newDoc.
        const document = {
            id: newDoc.id,
            fileName: newDoc.fileName,
            documentControlNumber: newDoc.documentControlNumber,
            createdAt: newDoc.createdAt // Assuming createdAt is automatically added by Prisma
        };

        return NextResponse.json(document);

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
