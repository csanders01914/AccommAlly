import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { signToken, verifyToken } from "./auth.core";

export { signToken, verifyToken };

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

export async function loginUser(userData: { id: string; email: string; role: string; name?: string }) {
    const token = await signToken(userData);
    const cookieStore = await cookies();

    cookieStore.set("session_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
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
