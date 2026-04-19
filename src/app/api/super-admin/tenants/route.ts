import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSuperAdminSession, generateTenantSlug, isValidSlug, isReservedSlug, hashSuperAdminEmail } from '@/lib/super-admin-auth';
import { hashPassword } from '@/lib/auth';
import { hashSHA256 } from '@/lib/encryption';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';

/**
 * Verify Super-Admin session helper
 */
async function requireSuperAdmin() {
    const cookieStore = await cookies();
    const token = cookieStore.get('super_admin_token')?.value;
    const session = await getSuperAdminSession(token);

    if (!session) {
        return null;
    }

    // Verify still active
    const superAdmin = await prisma.superAdmin.findUnique({
        where: { id: session.id },
        select: { id: true, active: true },
    });

    return superAdmin?.active ? session : null;
}

/**
 * GET /api/super-admin/tenants - List all tenants
 */
export async function GET(request: NextRequest) {
    try {
        const session = await requireSuperAdmin();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');

        const where: Record<string, unknown> = {};
        if (status) {
            where.status = status;
        }
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { slug: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [tenants, total] = await Promise.all([
            prisma.tenant.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    domain: true,
                    status: true,
                    plan: true,
                    createdAt: true,
                    _count: {
                        select: {
                            users: true,
                            cases: true,
                        },
                    },
                },
            }),
            prisma.tenant.count({ where }),
        ]);

        return NextResponse.json({
            tenants,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        logger.error({ err: error }, 'List tenants error:');
        return NextResponse.json({ error: 'Failed to list tenants' }, { status: 500 });
    }
}

/**
 * POST /api/super-admin/tenants - Create a new tenant
 */
export async function POST(request: NextRequest) {
    try {
        const session = await requireSuperAdmin();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            name,
            slug: providedSlug,
            domain,
            plan = 'FREE',
            adminEmail,
            adminName,
            adminPassword,
        } = body;

        // Validate required fields
        if (!name || !adminEmail || !adminName || !adminPassword) {
            return NextResponse.json(
                { error: 'Name, admin email, admin name, and admin password are required' },
                { status: 400 }
            );
        }

        // Generate or validate slug
        let slug = providedSlug || generateTenantSlug(name);

        if (!isValidSlug(slug)) {
            return NextResponse.json(
                { error: 'Invalid slug format. Must be 3-64 lowercase alphanumeric characters with hyphens.' },
                { status: 400 }
            );
        }

        if (isReservedSlug(slug)) {
            return NextResponse.json(
                { error: 'This slug is reserved and cannot be used.' },
                { status: 400 }
            );
        }

        // Check for existing slug
        const existingSlug = await prisma.tenant.findUnique({
            where: { slug },
            select: { id: true },
        });

        if (existingSlug) {
            return NextResponse.json(
                { error: 'A tenant with this slug already exists.' },
                { status: 409 }
            );
        }

        // Check for existing domain if provided
        if (domain) {
            const existingDomain = await prisma.tenant.findUnique({
                where: { domain },
                select: { id: true },
            });

            if (existingDomain) {
                return NextResponse.json(
                    { error: 'A tenant with this domain already exists.' },
                    { status: 409 }
                );
            }
        }

        // Create tenant and initial admin user in a transaction
        const result = await prisma.$transaction(async (tx: typeof prisma) => {
            // Create tenant
            const tenant = await tx.tenant.create({
                data: {
                    name,
                    slug,
                    domain: domain || null,
                    plan,
                    status: 'ACTIVE',
                    settings: {
                        branding: {},
                        features: {},
                        createdBy: session.id,
                    },
                },
            });

            // Create initial admin user for the tenant
            const emailHash = hashSHA256(adminEmail.toLowerCase().trim());
            const passwordHash = await hashPassword(adminPassword);

            const adminUser = await tx.user.create({
                data: {
                    tenantId: tenant.id,
                    email: adminEmail,
                    emailHash,
                    name: adminName,
                    passwordHash,
                    role: 'ADMIN',
                    active: true,
                },
            });

            return { tenant, adminUser };
        });

        return NextResponse.json({
            success: true,
            tenant: {
                id: result.tenant.id,
                name: result.tenant.name,
                slug: result.tenant.slug,
                domain: result.tenant.domain,
                plan: result.tenant.plan,
                status: result.tenant.status,
            },
            adminUser: {
                id: result.adminUser.id,
                email: result.adminUser.email,
                name: result.adminUser.name,
            },
        }, { status: 201 });
    } catch (error) {
        logger.error({ err: error }, 'Create tenant error:');
        return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 });
    }
}
