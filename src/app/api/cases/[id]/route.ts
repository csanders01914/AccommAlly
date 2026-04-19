import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

/**
 * GET /api/cases/[id] - Fetch a single case with all related data
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const { session, error } = await requireAuth();
        if (error) return error;

        // Use tenant-scoped Prisma to prevent cross-tenant access
        const tenantPrisma = withTenantScope(prisma, session.tenantId);

        const caseData = await tenantPrisma.case.findUnique({
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
                        _count: {
                            select: { annotations: true },
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
                claimant: {
                    select: { id: true, claimantNumber: true, email: true, phone: true }
                },
                claimFamily: {
                    select: { id: true, name: true }
                },
            },
        });

        if (!caseData) {
            return NextResponse.json(
                { error: 'Case not found' },
                { status: 404 }
            );
        }

        // The Prisma encryption extension auto-decrypts direct Case/Note/Document fields.
        // Nested relations are NOT auto-decrypted and must be done manually.
        const decryptUser = (u: any) => u ? { ...u, name: decrypt(u.name) } : u;
        const decryptClaimant = (c: any) => c ? {
            ...c,
            email: c.email ? decrypt(c.email) : null,
            phone: c.phone ? decrypt(c.phone) : null,
        } : c;

        // Transform to exclude binary fileData from documents and decrypt nested user names
        let transformedCase: any = {
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
                annotationCount: doc._count.annotations,
            })),
            claimant: decryptClaimant(caseData.claimant),
            contacts: caseData.contacts || [],
            accommodations: caseData.accommodations,
            notes: caseData.notes.map((n: any) => ({
                ...n,
                author: decryptUser(n.author),
            })),
            tasks: caseData.tasks.map((t: any) => ({
                ...t,
                createdBy: decryptUser(t.createdBy),
                assignee: t.assignedTo ? decryptUser(t.assignedTo) : { id: 'unassigned', name: 'Unassigned' }
            })),
            clientSSN: undefined,
        };

        // --- Access Control Filtering ---
        // If Program Lead, filter out MEDICAL data (Tier 2 Access)
        if (session.role === 'PROGRAM_LEAD') {
            transformedCase.notes = transformedCase.notes.filter((n: any) => n.noteType !== 'MEDICAL');
            transformedCase.documents = transformedCase.documents.filter((d: any) => d.category !== 'MEDICAL');
        }

        // SSN Logic removed - replaced by Claimant ID system
        transformedCase.clientSSN = undefined;

        return NextResponse.json(transformedCase);

    } catch (error) {
        logger.error({ err: error }, 'Error fetching case:');
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
        const { session, error } = await requireAuth();
        if (error) return error;

        const { id } = await params;
        const body = await request.json();

        // Use tenant-scoped Prisma
        const tenantPrisma = withTenantScope(prisma, session.tenantId);

        // Allowed updates
        const { status, priority, title, description } = body;

        const updatedCase = await tenantPrisma.case.update({
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
                ...(body.clientName && {
                    clientName: body.clientName,
                    clientLastName: body.clientName.trim().split(/\s+/).pop() ?? body.clientName.trim(),
                }),
                ...(body.clientId && { clientId: body.clientId }),
                ...(body.medicalDueDate !== undefined && {
                    medicalDueDate: body.medicalDueDate ? new Date(body.medicalDueDate) : null,
                }),
                // clientPhone: extension auto-encrypts non-empty strings; clear hash when emptying
                ...(body.clientPhone !== undefined && {
                    clientPhone: body.clientPhone || null,
                    ...(!body.clientPhone && { clientPhoneHash: null }),
                }),
                // clientEmail: extension auto-encrypts and sets hash for non-empty strings
                ...(body.clientEmail !== undefined && {
                    clientEmail: body.clientEmail || null,
                    ...(!body.clientEmail && { clientEmailHash: null }),
                }),
            },
        });

        return NextResponse.json(updatedCase);

    } catch (error) {
        if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'P2025') {
            return NextResponse.json({ error: 'Case not found' }, { status: 404 });
        }
        logger.error({ err: error }, 'Error updating case:');
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
        const { session, error } = await requireAuth({ roles: ['ADMIN', 'AUDITOR'] });
        if (error) return error;

        const { id } = await params;

        // Use tenant-scoped Prisma
        const tenantPrisma = withTenantScope(prisma, session.tenantId);

        // Verify case exists within tenant
        const caseData = await tenantPrisma.case.findUnique({ where: { id } });
        if (!caseData) {
            return NextResponse.json({ error: 'Case not found' }, { status: 404 });
        }

        // Delete the case (related records cascade due to schema onDelete: Cascade)
        await tenantPrisma.case.delete({ where: { id } });

        return NextResponse.json({ success: true, message: 'Case deleted successfully' });

    } catch (error) {
        logger.error({ err: error }, 'Error deleting case:');
        return NextResponse.json(
            { error: 'Failed to delete case' },
            { status: 500 }
        );
    }
}
