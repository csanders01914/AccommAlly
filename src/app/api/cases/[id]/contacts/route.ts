
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

/**
 * POST /api/cases/[id]/contacts - Create a new contact for a case
 */
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { session, error } = await requireAuth();

        if (error) return error;

        const tenantPrisma = withTenantScope(prisma, session.tenantId);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;
        const body = await request.json();

        const { name, role, type, email, phone, address, notes } = body;

        if (!name || !role) {
            return NextResponse.json(
                { error: 'Name and Role are required' },
                { status: 400 }
            );
        }

        const newContact = await prisma.contact.create({
            data: {
                name,
                role,
                type: type || 'OTHER',
                email,
                phone,
                address,
                notes,
                case: {
                    connect: { id }
                }
            }
        });

        // Audit Log: Contact Created
        await prisma.auditLog.create({
            data: {
                entityType: 'Contact',
                entityId: newContact.id,
                action: 'CREATE',
                userId: session.id,
                metadata: JSON.stringify({
                    name: name,
                    role: role,
                    caseId: id
                })
            }
        });

        return NextResponse.json(newContact);

    } catch (error) {
        logger.error({ err: error }, 'Error creating contact:');
        return NextResponse.json(
            { error: 'Failed to create contact' },
            { status: 500 }
        );
    }
}
