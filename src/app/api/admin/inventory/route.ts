import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

/**
 * GET /api/admin/inventory
 * List all inventory items
 */
export async function GET(request: NextRequest) {
    try {
        const { session, error } = await requireAuth();

        if (error) return error;

        const tenantPrisma = withTenantScope(prisma, session.tenantId);
        if (!session || (session.role !== 'ADMIN' && session.role !== 'COORDINATOR')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const items = await prisma.inventoryItem.findMany({
            include: {
                assignedToUser: { select: { id: true, name: true } },
                assignedToCase: { select: { id: true, caseNumber: true, clientName: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(items);

    } catch (error) {
        logger.error({ err: error }, 'Inventory GET Error:');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST /api/admin/inventory
 * Create a new inventory item
 */
export async function POST(request: NextRequest) {
    try {
        const { session, error } = await requireAuth();

        if (error) return error;

        const tenantPrisma = withTenantScope(prisma, session.tenantId);
        if (!session || (session.role !== 'ADMIN' && session.role !== 'COORDINATOR')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { name, assetTag, serialNumber, category, cost, supplier, notes, condition } = body;

        // Basic validation
        if (!name || !assetTag || !category) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check uniqueness of assetTag
        const existing = await prisma.inventoryItem.findUnique({
            where: { assetTag }
        });

        if (existing) {
            return NextResponse.json({ error: 'Asset Tag must be unique' }, { status: 409 });
        }

        const newItem = await prisma.inventoryItem.create({
            data: {
                name,
                assetTag,
                serialNumber,
                category,
                cost: cost ? parseFloat(cost) : undefined,
                supplier,
                notes,
                condition: condition || 'GOOD',
                status: 'AVAILABLE'
            }
        });

        // Audit Log
        await prisma.auditLog.create({
            data: {
                entityType: 'InventoryItem',
                entityId: newItem.id,
                action: 'CREATE',
                userId: session.id,
                metadata: JSON.stringify({ message: `Created new asset: ${name} (${assetTag})` })
            }
        });

        return NextResponse.json(newItem, { status: 201 });

    } catch (error) {
        logger.error({ err: error }, 'Inventory POST Error:');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
