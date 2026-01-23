import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, loginUser } from "@/lib/auth";
import { hash } from "@/lib/encryption";
import fs from 'fs';
import path from 'path';

function logToFile(message: string) {
    try {
        const logPath = path.join(process.cwd(), 'login-debug.txt');
        const timestamp = new Date().toISOString();
        fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
    } catch (e) {
        // ignore logging errors
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        logToFile(`--- New Login Request ---`);

        if (!email || !password) {
            logToFile(`Missing fields`);
            return NextResponse.json({ error: "Email and password required" }, { status: 400 });
        }

        // 1. Find user by hashed email (blind indexing)
        const normalizedEmail = email.toLowerCase().trim();
        const emailHash = hash(normalizedEmail);
        logToFile(`Login Attempt Email: ${normalizedEmail}`);
        logToFile(`Login Computed Hash: ${emailHash}`);

        const user = await prisma.user.findFirst({
            where: { emailHash },
        });

        if (!user) {
            logToFile('Login Failed: User not found by emailHash');
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }
        logToFile(`Login: User found (ID: ${user.id})`);

        // 2. Check Lockout
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            logToFile('Login Failed: User locked out');
            return NextResponse.json(
                { error: "Account locked. Try again later." },
                { status: 403 }
            );
        }

        // 3. Verify Password
        if (!user.passwordHash) {
            logToFile('Login Failed: No password hash stored');
            return NextResponse.json({ error: "Account setup incomplete" }, { status: 401 });
        }

        const isValid = await comparePassword(password, user.passwordHash);
        logToFile(`Login: Password valid? ${isValid}`);

        if (!isValid) {
            logToFile('Login Failed: Password mismatch');
            // Increment attempts
            const newAttempts = user.loginAttempts + 1;
            let updateData: any = { loginAttempts: newAttempts };

            // Lock if > 5 attempts
            if (newAttempts >= 5) {
                updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
            }

            await prisma.user.update({
                where: { id: user.id },
                data: updateData
            });

            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        // 4. Success: Reset stats & Check 2FA
        await prisma.user.update({
            where: { id: user.id },
            data: {
                loginAttempts: 0,
                lastLogin: new Date(),
                lockedUntil: null
            }
        });

        // 2FA Check
        if (user.twoFactorEnabled) {
            logToFile('Login: 2FA Required');
            return NextResponse.json({
                twoFactorRequired: true,
                userId: user.id
            });
        }

        const token = await loginUser({
            id: user.id,
            email: email,
            role: user.role,
            name: user.name
        });

        logToFile('Login Success');
        return NextResponse.json({ success: true, user: { name: user.name, role: user.role } });

    } catch (error) {
        logToFile(`Login Error: ${error}`);
        console.error("Login Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
