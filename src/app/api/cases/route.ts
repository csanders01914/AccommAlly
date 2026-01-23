import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateClaimNumber, generateClaimantId, type ClaimType } from '@/lib/generateCaseNumber';
import { encrypt, hash, decrypt } from '@/lib/encryption';
import { z } from 'zod';


const CaseSchema = z.object({
    fullName: z.string().min(1, "Full name is required"),
    email: z.string().email("Invalid email"),
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    preferredContact: z.enum(['email', 'phone', 'either']).optional().default('either'),
    accommodationType: z.string().min(1, "Accommodation type is required"),
    description: z.string().min(1, "Description is required"),
    reason: z.string().optional(),
    program: z.string().optional(),
    venue: z.string().optional(),
    preferredStartDate: z.string().optional(),
    ssn: z.string().regex(/^\d{3}-\d{2}-\d{4}$/, "Invalid SSN format").optional(),
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

        let data: any = {};
        let supportingDocument: File | null = null;

        // Parse request based on content type
        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            data = {
                fullName: formData.get('fullName') as string,
                email: formData.get('email') as string,
                phone: formData.get('phone') as string,
                preferredContact: (formData.get('preferredContact') as string) || 'either',
                accommodationType: formData.get('accommodationType') as string,
                description: formData.get('description') as string,
                reason: (formData.get('reason') as string) || undefined,
                program: (formData.get('program') as string) || undefined,
                venue: (formData.get('venue') as string) || undefined,
                preferredStartDate: (formData.get('preferredStartDate') as string) || undefined,
                ssn: (formData.get('ssn') as string) || undefined,
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

        const { fullName, email, phone, preferredContact, accommodationType, description, reason, program, venue, preferredStartDate, ssn } = result.data;

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

        // Find or create system user for automated actions
        let createdById: string;
        const systemEmailHash = hash('system@accessally.org');
        let systemUser = await prisma.user.findFirst({
            where: { emailHash: systemEmailHash },
        });

        if (!systemUser) {
            // Try finding by name as fallback
            systemUser = await prisma.user.findFirst({
                where: { name: 'System' },
            });
        }

        if (systemUser) {
            createdById = systemUser.id;
        } else {
            // Create system user if it doesn't exist
            const newUser = await prisma.user.create({
                data: {
                    email: 'system@accessally.org',
                    name: 'System',
                    role: 'COORDINATOR',
                },
            });
            createdById = newUser.id;
        }

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

        // Split SSN encryption
        let encryptedSSNPrefix = null;
        let encryptedSSNSuffix = null;

        if (ssn) {
            const cleanSSN = ssn.replace(/[^a-zA-Z0-9]/g, '');
            if (cleanSSN.length >= 5) {
                encryptedSSNPrefix = encrypt(cleanSSN.slice(0, 5));
                encryptedSSNSuffix = encrypt(cleanSSN.slice(5));
            } else {
                encryptedSSNSuffix = encrypt(cleanSSN);
            }
        }

        const newCase = await prisma.case.create({
            data: {
                caseNumber,
                claimantId: generateClaimantId(),
                clientName: fullName,
                clientEmail: encryptedEmail,
                clientEmailHash: email ? hash(email) : null,
                clientPhone: encryptedPhone,
                clientPhoneHash: phone ? hash(phone) : null,
                clientSSN: ssn ? encrypt(ssn) : null, // Backwards compatibility
                clientSSNPrefix: encryptedSSNPrefix,
                clientSSNSuffix: encryptedSSNSuffix,
                clientSSNHash: ssn ? hash(ssn) : null,
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
            },
        });

        // Handle document upload if provided
        let documentDCN: string | undefined;
        if (supportingDocument) {
            documentDCN = await generateDCN();
            const buffer = Buffer.from(await supportingDocument.arrayBuffer());

            await prisma.document.create({
                data: {
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
            // Get all active coordinators (excluding System user)
            const coordinators = await prisma.user.findMany({
                where: {
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
            console.error('Error in round-robin assignment:', e);
            // Fallback to creator/system
        }

        await prisma.task.create({
            data: {
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
        });

    } catch (error) {
        console.error('Error creating case:', error);
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
            whereClause.createdAt = {};
            if (openedStart) whereClause.createdAt.gte = new Date(openedStart);
            if (openedEnd) whereClause.createdAt.lte = new Date(openedEnd);
        }

        if (closedStart || closedEnd) {
            whereClause.closedAt = {};
            if (closedStart) whereClause.closedAt.gte = new Date(closedStart);
            if (closedEnd) whereClause.closedAt.lte = new Date(closedEnd);
        }

        const cases = await prisma.case.findMany({
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
            tasks: c.tasks.map((t: any) => ({
                ...t,
                assignedTo: t.assignedTo ? {
                    ...t.assignedTo,
                    name: decrypt(t.assignedTo.name)
                } : null
            })),
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
            clientSSN: (() => {
                if (c.clientSSNSuffix) {
                    try {
                        const suffix = decrypt(c.clientSSNSuffix);
                        if (suffix && suffix.trim().length > 0) return `***-**-${suffix}`;
                    } catch (e) { }
                }
                if (c.clientSSN) {
                    try {
                        const dec = decrypt(c.clientSSN);
                        const clean = dec.replace(/[^a-zA-Z0-9]/g, '');
                        const last4 = clean.length > 4 ? clean.slice(-4) : clean;
                        return `***-**-${last4 || '0000'}`;
                    } catch (e) { }
                }
                return undefined;
            })(),
        }));

        return NextResponse.json(transformedCases);

    } catch (error) {
        console.error('Error fetching cases:', error);
        return NextResponse.json(
            { error: 'Failed to fetch cases' },
            { status: 500 }
        );
    }
}
