import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import { decrypt, encrypt } from '@/lib/encryption';
import logger from '@/lib/logger';

// GET all call requests
export async function GET(request: NextRequest) {
 try {
 const { session, error } = await requireAuth();

 if (error) return error;

 const tenantPrisma = withTenantScope(prisma, session.tenantId);
 if (!session) {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 }

 const { searchParams } = new URL(request.url);
 const status = searchParams.get('status');

 const where: any = {};
 if (status) where.status = status;

 const calls = await prisma.callRequest.findMany({
 where,
 include: {
 case: { select: { id: true, caseNumber: true, clientName: true } }
 },
 orderBy: [
 { urgent: 'desc' },
 { createdAt: 'desc' }
 ]
 });

 // Decrypt names
 const decryptedCalls = calls.map((c: any) => ({
 ...c,
 name: decrypt(c.name),
 phoneNumber: decrypt(c.phoneNumber),
 case: c.case ? {
 ...c.case,
 clientName: decrypt(c.case.clientName)
 } : null
 }));

 return NextResponse.json({ calls: decryptedCalls });

 } catch (error) {
 logger.error({ err: error }, 'CallRequests GET Error:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}

// POST create new call request
export async function POST(request: NextRequest) {
 try {
 const { session, error } = await requireAuth();

 if (error) return error;

 const tenantPrisma = withTenantScope(prisma, session.tenantId);
 if (!session) {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 }

 const body = await request.json();
 const { name, phoneNumber, reason, urgent, caseId, scheduledFor } = body;

 if (!name || !phoneNumber || !reason || !caseId) {
 return NextResponse.json(
 { error: 'name, phoneNumber, reason, and caseId are required' },
 { status: 400 }
 );
 }

 const call = await prisma.callRequest.create({
 data: {
 name: encrypt(name),
 phoneNumber: encrypt(phoneNumber),
 reason,
 urgent: urgent || false,
 caseId,
 scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
 status: 'PENDING'
 }
 });

 // Audit Log: Call Request Created
 await prisma.auditLog.create({
 data: {
 entityType: 'CallRequest',
 entityId: call.id,
 action: 'CREATE',
 userId: session.id,
 metadata: JSON.stringify({
 urgency: urgent ? 'URGENT' : 'Normal',
 reason: reason,
 caseId: caseId
 })
 }
 });

 return NextResponse.json(call, { status: 201 });

 } catch (error) {
 logger.error({ err: error }, 'CallRequests POST Error:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}
