import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const rawSecret = process.env.JWT_SECRET;
if (!rawSecret) {
    console.warn("SECURITY WARNING: Using default JWT secret. Set JWT_SECRET in .env");
}
const SECRET_KEY = new TextEncoder().encode(rawSecret || "default_dev_secret_key_change_me");
const ALG = "HS256";

export async function signToken(payload: Record<string, unknown>) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: ALG })
        .setIssuedAt()
        .setExpirationTime("8h") // Session duration
        .sign(SECRET_KEY);
}

export async function verifyToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, SECRET_KEY, {
            algorithms: [ALG],
        });
        return payload;
    } catch (error) {
        return null;
    }
}

export async function hashPassword(password: string) {
    return await bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string) {
    return await bcrypt.compare(password, hash);
}

export async function getSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;
    if (!token) return null;
    return await verifyToken(token);
}

export async function loginUser(userData: { id: string; email: string; role: string; name?: string; isSecure?: boolean }) {
    const token = await signToken(userData);
    const cookieStore = await cookies();

    // Default to strict production check if isSecure is undefined
    const useSecureCookie = userData.isSecure !== undefined
        ? userData.isSecure
        : process.env.NODE_ENV === "production";

    cookieStore.set("session_token", token, {
        httpOnly: true,
        secure: useSecureCookie,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 8, // 8 hours
    });

    return token;
}

export async function logoutUser() {
    const cookieStore = await cookies();
    cookieStore.delete("session_token");
}
