import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "@/lib/encryption";
import logger from '@/lib/logger';

export async function GET(
 request: Request,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
 const { id } = await params;
 const user = await prisma.user.findUnique({
 where: { id },
 select: {
 id: true,
 name: true,
 email: true,
 role: true,
 username: true,
 pronouns: true,
 theme: true,
 notifications: true,
 twoFactorEnabled: true,
 tenant: {
 select: {
 id: true,
 name: true,
 settings: true
 }
 }
 },
 });

 if (!user) {
 return NextResponse.json({ error: "User not found" }, { status: 404 });
 }

 return NextResponse.json(user);
 } catch (error) {
 logger.error({ err: error }, "Error fetching user:");
 return NextResponse.json(
 { error: "Failed to fetch user" },
 { status: 500 }
 );
 }
}

export async function PATCH(
 request: Request,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
 const body = await request.json();
 const { id } = await params;
 const { name, email, username, pronouns, theme, notifications } = body;

 // Prepare update data
 const updateData: any = {
 name,
 email,
 // Convert empty username to null to avoid unique constraint issues with empty strings
 username: username || null,
 pronouns,
 theme,
 notifications,
 };

 // If email is changing, we must update the hash
 if (email) {
 const normalizedEmail = email.toLowerCase().trim();
 updateData.email = normalizedEmail; // Enforce normalization
 updateData.emailHash = hash(normalizedEmail);
 }

 const user = await prisma.user.update({
 where: { id },
 data: updateData,
 select: {
 id: true,
 name: true,
 email: true,
 role: true,
 username: true,
 pronouns: true,
 theme: true,
 notifications: true,
 twoFactorEnabled: true,
 tenant: {
 select: {
 id: true,
 name: true,
 settings: true
 }
 }
 },
 });

 return NextResponse.json(user);
 } catch (error) {
 logger.error({ err: error }, "Error updating user:");
 return NextResponse.json(
 { error: "Failed to update user: " + (error instanceof Error ? error.message : String(error)) },
 { status: 500 }
 );
 }
}
