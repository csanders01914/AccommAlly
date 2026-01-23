import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { getSession } from '@/lib/auth';

/**
 * GET /api/cases/[id] - Fetch a single case with all related data
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const caseData = await prisma.case.findUnique({
            where: { id },
            include: {
                tasks: {
                    include: {
                        assignedTo: {
                            select: { id: true, name: true },
                        },
                        createdBy: {
                            select: { id: true, name: true },
                        },
                    },
                    orderBy: { dueDate: 'asc' },
                },
                notes: {
                    include: {
                        author: {
                            select: { id: true, name: true },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
                documents: {
                    include: {
                        uploadedBy: {
                            select: { id: true, name: true },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
                accommodations: {
                    orderBy: { createdAt: 'desc' },
                },
                createdBy: {
                    select: { id: true, name: true },
                },
                contacts: {
                    orderBy: { createdAt: 'desc' },
                },
                client: {
                    select: { id: true, name: true, code: true }
                },
            },
        });

        if (!caseData) {
            return NextResponse.json(
                { error: 'Case not found' },
                { status: 404 }
            );
        }

        // Transform to exclude binary fileData from documents
        // Helper to decrypt user names in relations
        const decryptUser = (user: any) => {
            if (!user) return user;
            if (user.name) user.name = decrypt(user.name);
            return user;
        };

        // Transform to exclude binary fileData from documents and decrypt relations

        let transformedCase = {
            ...caseData,
            createdBy: decryptUser(caseData.createdBy),
            documents: caseData.documents.map((doc: any) => ({
                id: doc.id,
                fileName: doc.fileName,
                fileType: doc.fileType,
                fileSize: doc.fileSize,
                documentControlNumber: doc.documentControlNumber,
                category: doc.category,
                createdAt: doc.createdAt,
                uploadedBy: decryptUser(doc.uploadedBy),
            })),
            contacts: caseData.contacts || [],
            accommodations: caseData.accommodations,
            notes: caseData.notes.map((n: any) => ({
                ...n,
                author: decryptUser(n.author)
            })),
            tasks: caseData.tasks.map((t: any) => ({
                ...t,
                createdBy: decryptUser(t.createdBy),
                assignee: decryptUser(t.assignedTo) || { id: 'unassigned', name: 'Unassigned' }
            })),
            clientSSN: undefined,
        };

        // Re-apply SSN logic fully since I'm blocking the block
        // (Actually, better to iterate on the filtering AFTER the object construction to minimize diff)
        // Let's stick to the filtering logic.

        // --- Access Control Filtering ---
        const session = await getSession();
        // If Program Lead, filter out MEDICAL data (Tier 2 Access)
        if (session && session.role === 'PROGRAM_LEAD') {
            transformedCase.notes = transformedCase.notes.filter((n: any) => n.noteType !== 'MEDICAL');
            transformedCase.documents = transformedCase.documents.filter((d: any) => d.category !== 'MEDICAL');
        }

        // Restore SSN Logic (Since I replaced the whole block)
        transformedCase.clientSSN = (() => {
            if (caseData.clientSSNSuffix) {
                try {
                    const suffix = decrypt(caseData.clientSSNSuffix);
                    if (suffix && suffix.trim().length > 0) return `***-**-${suffix}`;
                } catch (e) { }
            }
            if (caseData.clientSSN) {
                try {
                    const dec = decrypt(caseData.clientSSN);
                    // If decryption fails, it returns original. Check if it looks encrypted (has colon)
                    // Actually, just try to clean and mask.
                    const clean = dec.replace(/[^a-zA-Z0-9]/g, '');
                    const last4 = clean.length > 4 ? clean.slice(-4) : clean;
                    return `***-**-${last4 || '0000'}`;
                } catch (e) { }
            }
            return undefined;
        })();

        // Decrypt Phone
        if (caseData.clientPhone) {
            try {
                transformedCase.clientPhone = decrypt(caseData.clientPhone);
            } catch (e) {
                // Keep original if fail
            }
        }

        // Decrypt Email
        if (caseData.clientEmail) {
            try {
                transformedCase.clientEmail = decrypt(caseData.clientEmail);
            } catch (e) {
                // Keep original
            }
        }

        // Decrypt Notes
        transformedCase.notes = transformedCase.notes.map((note: any) => {
            try {
                const decrypted = decrypt(note.content);
                console.log(`Note ${note.id} decryption - original length: ${note.content?.length}, decrypted length: ${decrypted?.length}, starts with: ${decrypted?.substring(0, 20)}`);
                return {
                    ...note,
                    content: decrypted
                };
            } catch (e) {
                console.error(`Note ${note.id} decryption failed:`, e);
                return note;
            }
        });

        return NextResponse.json(transformedCase);

    } catch (error) {
        console.error('Error fetching case:', error);
        return NextResponse.json(
            { error: 'Failed to fetch case' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/cases/[id] - Update case details
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        // Allowed updates
        const { status, priority, title, description } = body;

        const updatedCase = await prisma.case.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(priority && { priority }),
                ...(title && { title }),
                ...(description && { description }),
                ...(body.program && { program: body.program }),
                ...(body.venue && { venue: body.venue }),
                ...(body.medicalCondition && { medicalCondition: body.medicalCondition }),
                ...(body.category && { category: body.category }),
                ...(body.preferredStartDate && { preferredStartDate: body.preferredStartDate }),
                ...(body.preferredStartDate && { preferredStartDate: body.preferredStartDate }),
                // Allow simple client name update without re-encryption for now (assuming plain text in DB?) 
                // Ah, clientName is String. clientPhone is Encrypted.
                ...(body.clientName && { clientName: body.clientName }),
                ...(body.clientId && { clientId: body.clientId }),
            },
        });

        return NextResponse.json(updatedCase);

    } catch (error) {
        console.error('Error updating case:', error);
        return NextResponse.json(
            { error: 'Failed to update case' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/cases/[id] - Delete a case (ADMIN/AUDITOR only)
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only ADMIN or AUDITOR can delete cases
        if (session.role !== 'ADMIN' && session.role !== 'AUDITOR') {
            return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
        }

        const { id } = await params;

        // Verify case exists
        const caseData = await prisma.case.findUnique({ where: { id } });
        if (!caseData) {
            return NextResponse.json({ error: 'Case not found' }, { status: 404 });
        }

        // Delete the case (related records cascade due to schema onDelete: Cascade)
        await prisma.case.delete({ where: { id } });

        return NextResponse.json({ success: true, message: 'Case deleted successfully' });

    } catch (error) {
        console.error('Error deleting case:', error);
        return NextResponse.json(
            { error: 'Failed to delete case' },
            { status: 500 }
        );
    }
}
