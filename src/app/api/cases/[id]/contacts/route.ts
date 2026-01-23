
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/**
 * POST /api/cases/[id]/contacts - Create a new contact for a case
 */
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
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

        return NextResponse.json(newContact);

    } catch (error) {
        console.error('Error creating contact:', error);
        return NextResponse.json(
            { error: 'Failed to create contact' },
            { status: 500 }
        );
    }
}
