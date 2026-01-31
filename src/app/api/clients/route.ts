import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/clients - List all active clients
export async function GET() {
    try {
        const clients = await prisma.client.findMany({
            where: { active: true },
            orderBy: { name: 'asc' }
        });
        return NextResponse.json(clients);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
    }
}

// POST /api/clients - Admin create client
export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            // User requested "Admins also need the ability".
            // For now enforcing ADMIN.
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await req.json();
        const { name, code } = body;

        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

        // Check strictly by unique name first (ignoring active status)
        const existingClient = await prisma.client.findUnique({
            where: { name }
        });

        if (existingClient) {
            if (existingClient.active) {
                return NextResponse.json({ error: 'Client already exists' }, { status: 400 });
            } else {
                // Reactivate the found inactive client
                const reactivated = await prisma.client.update({
                    where: { id: existingClient.id },
                    data: {
                        active: true,
                        code: code || existingClient.code // Update code if provided
                    }
                });
                return NextResponse.json(reactivated);
            }
        }

        // If no client found, create new
        const client = await prisma.client.create({
            data: {
                name,
                code: code || name.toUpperCase().substring(0, 3)
            }
        });

        // Audit Log: Client Created
        await prisma.auditLog.create({
            data: {
                entityType: 'Client',
                entityId: client.id,
                action: 'CREATE',
                userId: session.id,
                metadata: JSON.stringify({ name: client.name, code: client.code })
            }
        });

        return NextResponse.json(client);
    } catch (error: any) {
        console.error('Error creating client:', error);
        // Fallback for other unique constraints (though name is the main one)
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Client already exists (constraint violation)' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
    }
}

// DELETE /api/clients?id=... - Soft delete client
export async function DELETE(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        await prisma.client.update({
            where: { id },
            data: { active: false }
        });

        // Audit Log: Client Deleted
        await prisma.auditLog.create({
            data: {
                entityType: 'Client',
                entityId: id,
                action: 'DELETE',
                userId: session.id,
                metadata: JSON.stringify({ action: 'soft_delete_client' })
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting client:', error);
        return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
    }
}
