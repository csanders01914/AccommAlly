import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';

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
                    select: { id: true, claimantNumber: true }
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

        // Transform to exclude binary fileData from documents
        let transformedCase: any = {
            ...caseData,
            createdBy: caseData.createdBy,
            documents: caseData.documents.map((doc: any) => ({
                id: doc.id,
                fileName: doc.fileName,
                fileType: doc.fileType,
                fileSize: doc.fileSize,
                documentControlNumber: doc.documentControlNumber,
                category: doc.category,
                createdAt: doc.createdAt,
                uploadedBy: doc.uploadedBy,
            })),
            contacts: caseData.contacts || [],
            accommodations: caseData.accommodations,
            notes: caseData.notes,
            tasks: caseData.tasks.map((t: any) => ({
                ...t,
                createdBy: t.createdBy,
                assignee: t.assignedTo || { id: 'unassigned', name: 'Unassigned' }
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
                ...(body.clientName && { clientName: body.clientName }),
                ...(body.clientId && { clientId: body.clientId }),
                ...(body.medicalDueDate !== undefined && {
                    medicalDueDate: body.medicalDueDate ? new Date(body.medicalDueDate) : null,
                }),
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
        console.error('Error deleting case:', error);
        return NextResponse.json(
            { error: 'Failed to delete case' },
            { status: 500 }
        );
    }
}
