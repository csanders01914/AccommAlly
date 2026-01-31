import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || "default_dev_secret_key_change_me");
const ALG = "HS256";

export async function POST(request: NextRequest) {
    try {
        const { identifier, lastName } = await request.json();

        if (!identifier || !lastName) {
            return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
        }

        // Find Case by Claim Number OR Claimant ID
        const targetCase = await prisma.case.findFirst({
            where: {
                OR: [
                    { caseNumber: { equals: identifier, mode: 'insensitive' } },
                    { claimantRef: identifier }
                ]
            }
        });

        if (!targetCase) {
            return NextResponse.json({ error: 'Case not found' }, { status: 404 });
        }

        // Verify Last Name (Case-insensitive check against clientName)
        const nameParts = targetCase.clientName.trim().split(' ');
        const caseLastName = nameParts[nameParts.length - 1]; // Simple last name extraction

        if (caseLastName.toLowerCase() !== lastName.toLowerCase()) {
            // Logic check: What if client has multiple last names? 
            // Ideally we check if `clientName` includes `lastName`
            if (!targetCase.clientName.toLowerCase().includes(lastName.toLowerCase())) {
                return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
            }
        }

        // Generate Portal Token
        const token = await new SignJWT({
            claimantId: targetCase.claimantRef,
            caseId: targetCase.id,
            role: 'CLAIMANT'
        })
            .setProtectedHeader({ alg: ALG })
            .setIssuedAt()
            .setExpirationTime("1h")
            .sign(SECRET_KEY);

        const cookieStore = await cookies();
        const isSecure = request.nextUrl.protocol === 'https:';

        cookieStore.set("portal_token", token, {
            httpOnly: true,
            secure: isSecure,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60, // 1 hour
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Portal Login Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
