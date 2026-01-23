import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession, hashPassword } from '@/lib/auth';
import { decrypt, encrypt, hash } from '@/lib/encryption';

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                active: true,
                lastLogin: true,
                createdAt: true,
                lockedUntil: true
            },
            orderBy: { createdAt: 'desc' }
        });

        const decryptedUsers = users.map((u: any) => {
            let decryptedEmail = 'Encrypted';
            try {
                if (u.email) decryptedEmail = decrypt(u.email);
            } catch (e) {
                // Ignore decryption errors
            }
            return {
                ...u,
                email: decryptedEmail
            };
        });

        return NextResponse.json(decryptedUsers);
    } catch (error) {
        console.error('Admin Users API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, email, password, role } = body;

        if (!name || !email || !password || !role) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const emailHash = hash(normalizedEmail);

        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
            where: { emailHash }
        });

        if (existingUser) {
            return NextResponse.json({ error: 'User already exists' }, { status: 409 });
        }

        const hashedPassword = await hashPassword(password);

        // Pass plain email - the Prisma extension handles encryption and hashing automatically
        const newUser = await prisma.user.create({
            data: {
                name,
                email: normalizedEmail,  // Plain email - extension will encrypt/hash
                role,
                passwordHash: hashedPassword,
                active: true
            }
        });

        console.log('Created user with ID:', newUser.id);

        // Audit Log
        await prisma.auditLog.create({
            data: {
                entityType: 'User',
                entityId: newUser.id,
                action: 'CREATE',
                metadata: JSON.stringify({ name, role }),
                userId: session.id as string,
            }
        });

        return NextResponse.json(newUser);

    } catch (error) {
        console.error('Create User Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
