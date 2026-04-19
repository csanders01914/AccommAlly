import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateClaimNumber, type ClaimType } from '@/lib/generateCaseNumber';
import { encrypt, hash, decrypt } from '@/lib/encryption';
import { getOrCreateClaimant, validatePin, validatePassphrase } from '@/lib/claimant';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import { z } from 'zod';
import logger from '@/lib/logger';

const CaseSchema = z.object({
    fullName: z.string().min(1, "Full name is required"),
    email: z.string().email("Invalid email"),
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    birthdate: z.string().min(1, "Date of birth is required"),
    preferredContact: z.enum(['email', 'phone', 'either']).optional().default('either'),
    accommodationType: z.string().min(1, "Accommodation type is required"),
    description: z.string().min(1, "Description is required"),
    reason: z.string().optional(),
    program: z.string().optional(),
    venue: z.string().optional(),
    preferredStartDate: z.string().optional(),
    credentialType: z.enum(['PIN', 'PASSPHRASE']).default('PIN'),
    credential: z.string().min(1, "Credential is required"),
});

/**
 * Generate a Document Control Number (DCN) as millisecond timestamp
 * Format: XXXXXXXXXXXXX (13-digit timestamp in milliseconds)
 * Example: "1705701234567"
 */
function generateDCN(): string {
    return Date.now().toString();
}

/**
 * Format Intake Note content from form data
 */
function formatIntakeNoteContent(data: {
    fullName: string;
    email: string;
    phone: string;
    preferredContact: string;
    accommodationType: string;
    description: string;
    reason?: string;
    program?: string;
    venue?: string;
    preferredStartDate?: string;
    hasDocument: boolean;
    documentDCN?: string;
}): string {
    const accommodationTypeLabels: Record<string, string> = {
        equipment: 'Equipment Modification',
        schedule: 'Schedule Modification',
        remote: 'Remote Work Arrangement',
        assistive: 'Assistive Technology',
        medical: 'Medical Leave',
        other: 'Other',
    };

    let content = `=== INTAKE INFORMATION ===

CLIENT CONTACT:
• Name: ${data.fullName}
• Email: ${data.email}
• Phone: ${data.phone}
• Preferred Contact Method: ${data.preferredContact || 'Either'}

ACCOMMODATION REQUEST:
• Type: ${accommodationTypeLabels[data.accommodationType] || data.accommodationType}
• Description: ${data.description}`;

    if (data.reason) {
        content += `\n• Reason/Medical Condition: ${data.reason}`;
    }

    if (data.program || data.venue) {
        content += `\n\nADDITIONAL INFO:`;
        if (data.program) content += `\n• Program: ${data.program}`;
        if (data.venue) content += `\n• Venue: ${data.venue}`;
    }

    if (data.preferredStartDate) {
        content += `\n\nTIMELINE:
• Preferred Start Date: ${data.preferredStartDate}`;
    }

    if (data.hasDocument && data.documentDCN) {
        content += `\n\nATTACHED DOCUMENTATION:
• Document Control Number: ${data.documentDCN}`;
    }

    content += `\n\n=== END INTAKE ===`;

    return content;
}

/**
 * POST /api/cases - Create a new accommodation case
 * Accepts either JSON or FormData (for file uploads)
 */
export async function POST(request: NextRequest) {
    try {
        const contentType = request.headers.get('content-type') || '';

        // --- Tenant Resolution ---
        // For authenticated users, use their session tenantId
        // For unauthenticated intake forms, resolve from subdomain/domain
        const { getSession } = await import('@/lib/auth');
        const { session, error } = await requireAuth();

        if (error) return error;

        const tenantPrisma = withTenantScope(prisma, session.tenantId);
        let tenantId: string | null = null;

        if (session?.tenantId) {
            tenantId = session.tenantId as string;
        } else {
            // Public intake form — resolve tenant from subdomain/domain
            const host = request.headers.get('host') || '';
            const { resolveTenantId } = await import('@/lib/prisma-tenant');
            let subdomain: string | undefined;
            if (host.includes('.')) {
                subdomain = host.split('.')[0];
            }

            const result = await resolveTenantId({
                subdomain,
                customDomain: host,
                prisma
            });
            if (result) {
                tenantId = result.tenantId;
            }
        }

        if (!tenantId) {
            logger.error('Failed to resolve tenant for Case creation');
            return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
        }

        // --- Check Limits ---
        const { checkTenantClaimLimit } = await import('@/lib/tenant-limits');
        const canCreateCase = await checkTenantClaimLimit(tenantId);

        if (!canCreateCase) {
            return NextResponse.json({ error: 'Subscription plan active claim limit reached' }, { status: 403 });
        }

        // --- Parse Body ---
        let data: any = {};
        let supportingDocument: File | null = null;

        // Parse request based on content type
        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            data = {
                fullName: formData.get('fullName') as string,
                email: formData.get('email') as string,
                phone: formData.get('phone') as string,
                birthdate: formData.get('birthdate') as string,
                preferredContact: (formData.get('preferredContact') as string) || 'either',
                accommodationType: formData.get('accommodationType') as string,
                description: formData.get('description') as string,
                reason: (formData.get('reason') as string) || undefined,
                program: (formData.get('program') as string) || undefined,
                venue: (formData.get('venue') as string) || undefined,
                preferredStartDate: (formData.get('preferredStartDate') as string) || undefined,
                credentialType: (formData.get('credentialType') as string) || 'PIN',
                credential: formData.get('credential') as string,
            };

            const fileField = formData.get('supportingDocument');
            if (fileField && fileField instanceof File && fileField.size > 0) {
                supportingDocument = fileField;
            }
        } else {
            data = await request.json();
        }

        // Validate with Zod
        const result = CaseSchema.safeParse(data);
        if (!result.success) {
            return NextResponse.json(
                { error: 'Validation Error', details: result.error.issues },
                { status: 400 }
            );
        }

        const { fullName, email, phone, birthdate, preferredContact, accommodationType, description, reason, program, venue, preferredStartDate, credentialType, credential } = result.data;

        // Validate credential format
        if (credentialType === 'PIN' && !validatePin(credential)) {
            return NextResponse.json(
                { error: 'Validation Error', details: [{ message: 'PIN must be 4-6 digits' }] },
                { status: 400 }
            );
        }
        if (credentialType === 'PASSPHRASE' && !validatePassphrase(credential)) {
            return NextResponse.json(
                { error: 'Validation Error', details: [{ message: 'Passphrase must be 12-65 characters' }] },
                { status: 400 }
            );
        }

        // Map accommodation type to claim type
        const typeMap: Record<string, ClaimType> = {
            equipment: 'AR',
            schedule: 'AR',
            remote: 'AR',
            assistive: 'AR',
            medical: 'MT',
            other: 'OT',
        };
        const claimType = typeMap[accommodationType] || 'AR';

        // Generate unique claim number
        // Sequence is always 001 since the base-36 millisecond timestamp provides uniqueness
        const caseNumber = generateClaimNumber({
            date: new Date(),
            sequence: 1,
            type: claimType,
        });

        // Find or create system user for automated actions (Scoped to Tenant)
        let createdById: string;
        const systemEmailHash = hash('system@accessally.org');

        // Check for system user within this tenant
        let systemUser = await prisma.user.findFirst({
            where: {
                emailHash: systemEmailHash,
                tenantId
            },
        });

        if (!systemUser) {
            // Create system user if it doesn't exist for this tenant
            const newUser = await prisma.user.create({
                data: {
                    tenantId,
                    email: 'system@accessally.org',
                    name: 'System',
                    role: 'COORDINATOR',
                    active: false // System user shouldn't login
                },
            });
            createdById = newUser.id;
        } else {
            createdById = systemUser.id;
        }

        // Auto-match or create claimant
        const birthdateObj = new Date(birthdate);
        const { claimant, isNew: isNewClaimant } = await getOrCreateClaimant({
            tenantId,
            name: fullName,
            birthdate: birthdateObj,
            email,
            phone,
            credentialType: credentialType as 'PIN' | 'PASSPHRASE',
            credential,
        });

        // Accommodation type labels for title
        const accommodationTypeLabels: Record<string, string> = {
            equipment: 'Equipment Modification',
            schedule: 'Schedule Modification',
            remote: 'Remote Work Arrangement',
            assistive: 'Assistive Technology',
            medical: 'Medical Leave',
            other: 'Other',
        };

        // Encrypt sensitive data
        const encryptedEmail = email ? encrypt(email) : null;
        const encryptedPhone = phone ? encrypt(phone) : null;

        // Extract last name: last whitespace-delimited token of the full name
        const clientLastName = fullName.trim().split(/\s+/).pop() ?? fullName.trim();

        const newCase = await prisma.case.create({
            data: {
                tenantId,
                caseNumber,
                clientName: fullName,
                clientLastName,
                clientEmail: encryptedEmail,
                clientEmailHash: email ? hash(email) : null,
                clientPhone: encryptedPhone,
                clientPhoneHash: phone ? hash(phone) : null,
                clientBirthdate: birthdateObj,
                title: accommodationTypeLabels[accommodationType] || 'Accommodation Request',
                description: description,
                medicalCondition: reason,
                category: accommodationType,
                status: 'OPEN',
                priority: 2,
                createdById,
                program,
                venue,
                preferredStartDate,
                claimantRef: claimant.id,
            },
        });

        // Handle document upload if provided
        let documentDCN: string | undefined;
        if (supportingDocument) {
            documentDCN = await generateDCN();
            const buffer = Buffer.from(await supportingDocument.arrayBuffer());

            await prisma.document.create({
                data: {
                    tenantId,
                    fileName: supportingDocument.name,
                    fileType: supportingDocument.type,
                    fileSize: supportingDocument.size,
                    fileData: buffer,
                    documentControlNumber: documentDCN,
                    category: accommodationType === 'medical' ? 'MEDICAL' : 'OTHER',
                    caseId: newCase.id,
                    uploadedById: createdById,
                },
            });
        }

        // Create Intake Note with all gathered information
        const intakeNoteContent = formatIntakeNoteContent({
            fullName,
            email,
            phone,
            preferredContact,
            accommodationType,
            description,
            reason,
            program,
            venue,
            preferredStartDate,
            hasDocument: !!supportingDocument,
            documentDCN,
        });

        // Prisma extension handles encryption automatically
        await prisma.note.create({
            data: {
                tenantId,
                content: intakeNoteContent,  // Plain text - extension encrypts
                noteType: 'INTAKE',
                caseId: newCase.id,
                authorId: createdById,
            },
        });

        // Create initial task for the case

        // ROUND ROBIN ASSIGNMENT LOGIC
        let initialAssigneeId = createdById;

        try {
            // Get all active coordinators (excluding System user) for this tenant
            const coordinators = await prisma.user.findMany({
                where: {
                    tenantId,
                    role: 'COORDINATOR',
                    active: true,
                    name: { not: 'System' } // Exclude System user from assignment
                },
                orderBy: { createdAt: 'asc' }, // Consistent order
                select: { id: true }
            });

            if (coordinators.length > 0) {
                // Find the most recently assigned 'Initial Case Review' task
                const lastAssignment = await prisma.task.findFirst({
                    where: {
                        tenantId,
                        title: 'Initial Case Review',
                        assignedTo: { role: 'COORDINATOR' }
                    },
                    orderBy: { createdAt: 'desc' },
                    select: { assignedToId: true }
                });

                if (!lastAssignment) {
                    initialAssigneeId = coordinators[0].id;
                } else {
                    const lastIndex = coordinators.findIndex((c: { id: string }) => c.id === lastAssignment.assignedToId);
                    const nextIndex = (lastIndex + 1) % coordinators.length;
                    initialAssigneeId = coordinators[nextIndex].id;
                }
            }
        } catch (e) {
            logger.error({ err: e }, 'Error in round-robin assignment:');
            // Fallback to creator/system
        }

        await prisma.task.create({
            data: {
                tenantId,
                title: 'Initial Case Review',
                description: `Review new accommodation request from ${fullName}. Contact method preference: ${preferredContact || 'either'}`,
                status: 'PENDING',
                category: 'FOLLOW_UP',
                dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
                caseId: newCase.id,
                assignedToId: initialAssigneeId,
                createdById,
            },
        });

        // Create audit log entry
        await prisma.auditLog.create({
            data: {
                tenantId,
                entityType: 'Case',
                entityId: newCase.id,
                action: 'CREATE',
                metadata: JSON.stringify({
                    source: 'accommodation_request_form',
                    preferredContact,
                    hasDocument: !!supportingDocument,
                }),
                userId: createdById,
            },
        });

        return NextResponse.json({
            success: true,
            caseNumber: newCase.caseNumber,
            caseId: newCase.id,
            claimantNumber: claimant.claimantNumber,
            isNewClaimant,
        });

    } catch (error) {
        logger.error({ err: error }, 'Error creating case:');
        return NextResponse.json(
            { error: 'Failed to create case' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/cases - Fetch all cases with tasks, notes, and documents for dashboard
 */
export async function GET(request: NextRequest) {
    try {
        const { session, error } = await requireAuth();
        if (error) return error;

        // Use tenant-scoped Prisma
        const tenantPrisma = withTenantScope(prisma, session.tenantId);

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const status = searchParams.get('status');

        const assignedTo = searchParams.get('assignedTo');
        const clientId = searchParams.get('clientId');
        const program = searchParams.get('program');
        const openedStart = searchParams.get('openedStart');
        const openedEnd = searchParams.get('openedEnd');
        const closedStart = searchParams.get('closedStart');
        const closedEnd = searchParams.get('closedEnd');

        const whereClause: any = {};

        // Status Filter
        if (status && status !== 'ALL') {
            whereClause.status = status;
        }

        // Search (Name/Case#)
        if (search) {
            whereClause.OR = [
                { clientName: { contains: search, mode: 'insensitive' } },
                { caseNumber: { contains: search, mode: 'insensitive' } },
            ];
        }

        // Assigned To (Active Tasks)
        if (assignedTo) {
            whereClause.tasks = {
                some: {
                    assignedToId: assignedTo,
                    status: { notIn: ['COMPLETED', 'CANCELLED'] }
                }
            };
        }

        // Client
        if (clientId) {
            whereClause.clientId = clientId;
        }

        // Program
        if (program) {
            whereClause.program = { contains: program, mode: 'insensitive' };
        }

        // Date Ranges
        if (openedStart || openedEnd) {
            whereClause.createdAt = {} as any;
            if (openedStart) whereClause.createdAt.gte = new Date(openedStart);
            if (openedEnd) whereClause.createdAt.lte = new Date(openedEnd);
        }

        if (closedStart || closedEnd) {
            whereClause.closedAt = {} as any;
            if (closedStart) whereClause.closedAt.gte = new Date(closedStart);
            if (closedEnd) whereClause.closedAt.lte = new Date(closedEnd);
        }

        const cases = await tenantPrisma.case.findMany({
            where: whereClause,
            include: {
                tasks: {
                    include: {
                        assignedTo: {
                            select: { id: true, name: true },
                        },
                    },
                    orderBy: { dueDate: 'asc' },
                },
                createdBy: {
                    select: { id: true, name: true },
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
            },
            orderBy: { createdAt: 'desc' },
        });

        // Transform documents to exclude binary data from response
        const transformedCases = cases.map((c: any) => ({
            ...c,
            documents: c.documents.map((doc: any) => ({
                id: doc.id,
                fileName: doc.fileName,
                fileType: doc.fileType,
                fileSize: doc.fileSize,
                documentControlNumber: doc.documentControlNumber,
                category: doc.category,
                createdAt: doc.createdAt,
                uploadedBy: doc.uploadedBy,
            })),
        }));

        return NextResponse.json(transformedCases);

    } catch (error) {
        logger.error({ err: error }, 'Error fetching cases:');
        return NextResponse.json(
            { error: 'Failed to fetch cases' },
            { status: 500 }
        );
    }
}
