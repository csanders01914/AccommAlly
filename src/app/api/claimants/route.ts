import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import { decrypt, encrypt } from '@/lib/encryption';
import { generateClaimantNumber, createNameHash, hashCredential, validatePin, validatePassphrase } from '@/lib/claimant';
import crypto from 'crypto';
import { z } from 'zod';

const CreateClaimantSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    birthdate: z.string().min(1, 'Birthdate is required'),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    phone: z.string().optional(),
    credentialType: z.enum(['PIN', 'PASSPHRASE']).default('PIN'),
    credential: z.string().min(4, 'Credential must be at least 4 characters'),
});

/**
 * GET /api/claimants - List/search claimants
 */
export async function GET(request: NextRequest) {
    try {
        const { session, error } = await requireAuth();

        if (error) return error;

        const tenantPrisma = withTenantScope(prisma, session.tenantId);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const limit = parseInt(searchParams.get('limit') || '50');

        let claimants;

        if (search) {
            // Search by claimant number
            claimants = await prisma.claimant.findMany({
                where: {
                    claimantNumber: { contains: search }
                },
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: { select: { cases: true } }
                }
            });
        } else {
            claimants = await prisma.claimant.findMany({
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: { select: { cases: true } }
                }
            });
        }

        // Decrypt names for display
        const decryptedClaimants = claimants.map((c: typeof claimants[0]) => ({
            id: c.id,
            claimantNumber: c.claimantNumber,
            name: decrypt(c.name),
            birthdate: c.birthdate,
            credentialType: c.credentialType,
            casesCount: c._count.cases,
            createdAt: c.createdAt
        }));

        return NextResponse.json(decryptedClaimants);
    } catch (error) {
        console.error('Error fetching claimants:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST /api/claimants - Create claimant (ADMIN only)
 */
export async function POST(request: NextRequest) {
    try {
        const { session, error } = await requireAuth();

        if (error) return error;

        const tenantPrisma = withTenantScope(prisma, session.tenantId);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Admin only
        if (session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
        }

        const body = await request.json();
        const validation = CreateClaimantSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.error.issues },
                { status: 400 }
            );
        }
        const { name, birthdate, email, phone, credentialType, credential } = validation.data;

        const credType = credentialType;

        // Validate credential
        if (credType === 'PIN' && !validatePin(credential)) {
            return NextResponse.json({ error: 'PIN must be 4-6 digits' }, { status: 400 });
        }

        if (credType === 'PASSPHRASE' && !validatePassphrase(credential)) {
            return NextResponse.json({ error: 'Passphrase must be 12-65 characters' }, { status: 400 });
        }

        const nameHash = createNameHash(name);
        const birthdateObj = new Date(birthdate);

        // Check for existing claimant
        const existing = await prisma.claimant.findFirst({
            where: { nameHash, birthdate: birthdateObj }
        });

        if (existing) {
            return NextResponse.json({
                error: 'A claimant with this name and birthdate already exists',
                existingClaimantNumber: existing.claimantNumber
            }, { status: 409 });
        }

        // Create claimant
        const claimantNumber = await generateClaimantNumber();
        const credentialHash = await hashCredential(credential);

        const emailHash = email
            ? crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex')
            : null;

        const phoneHash = phone
            ? crypto.createHash('sha256').update(phone.replace(/\D/g, '')).digest('hex')
            : null;

        const claimant = await prisma.claimant.create({
            data: {
                claimantNumber,
                name: encrypt(name),
                nameHash,
                birthdate: birthdateObj,
                email: email ? encrypt(email) : null,
                emailHash,
                phone: phone ? encrypt(phone) : null,
                phoneHash,
                credentialType: credType,
                pinHash: credType === 'PIN' ? credentialHash : null,
                passphraseHash: credType === 'PASSPHRASE' ? credentialHash : null,
            }
        });

        // Audit Log
        await prisma.auditLog.create({
            data: {
                entityType: 'Claimant',
                entityId: claimant.id,
                action: 'CREATE',
                metadata: JSON.stringify({ name: claimantNumber, claimantNumber: claimant.claimantNumber }),
                userId: session.id,
            }
        });

        return NextResponse.json({
            id: claimant.id,
            claimantNumber: claimant.claimantNumber,
            name: name,
            birthdate: claimant.birthdate,
            credentialType: claimant.credentialType,
            createdAt: claimant.createdAt
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating claimant:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
