import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPortalSession } from '@/lib/portal-auth';
import logger from '@/lib/logger';

/**
 * GET /api/public/portal/messages - Get messages for the claimant's case
 */
export async function GET(request: NextRequest) {
 try {
 const session = await getPortalSession();
 if (!session) {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 }

 const messages = await prisma.message.findMany({
 where: {
 caseId: session.caseId,
 // Enforce tenant isolation alongside caseId
 case: { id: session.caseId, tenantId: session.tenantId },
 direction: { in: ['PORTAL_INBOUND', 'PORTAL_OUTBOUND'] }
 },
 orderBy: { createdAt: 'asc' },
 select: {
 id: true,
 subject: true,
 content: true,
 createdAt: true,
 direction: true,
 read: true
 }
 });

 return NextResponse.json({ messages });

 } catch (error) {
 logger.error({ err: error }, 'Portal Messages Error:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}

/**
 * POST /api/public/portal/messages - Send a message from claimant to examiner
 */
export async function POST(request: NextRequest) {
 try {
 const session = await getPortalSession();
 if (!session) {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 }

 const { subject, content } = await request.json();

 if (!content || content.trim().length === 0) {
 return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
 }

 if (content.length > 10000) {
 return NextResponse.json({ error: 'Message content too long' }, { status: 400 });
 }

 // Get case info — must belong to the session's tenant and case
 const caseData = await prisma.case.findFirst({
 where: { id: session.caseId, tenantId: session.tenantId },
 select: {
 id: true,
 createdById: true,
 clientName: true,
 caseNumber: true
 }
 });

 if (!caseData) {
 return NextResponse.json({ error: 'Case not found' }, { status: 404 });
 }

 // Create the message
 const message = await prisma.message.create({
 data: {
 subject: subject || 'Portal Message',
 content: content.trim(),
 caseId: caseData.id,
 recipientId: caseData.createdById,
 isExternal: false,
 direction: 'PORTAL_INBOUND',
 },
 select: {
 id: true,
 subject: true,
 content: true,
 createdAt: true
 }
 });

 // Auto-create a Note on the case
 await prisma.note.create({
 data: {
 content: `**Portal Message from Claimant**\n\n${subject ? `Subject: ${subject}\n\n` : ''}${content.trim()}`,
 noteType: 'PORTAL_MESSAGE',
 caseId: caseData.id,
 authorId: caseData.createdById
 }
 });

 // Auto-create a Task for the examiner
 await prisma.task.create({
 data: {
 title: 'Portal Message Received',
 description: `New message from claimant (${caseData.clientName}) via portal.\n\nCase: ${caseData.caseNumber}\n\n${subject ? `Subject: ${subject}\n\n` : ''}Preview: ${content.trim().substring(0, 100)}${content.length > 100 ? '...' : ''}`,
 status: 'PENDING',
 priority: 'HIGH',
 category: 'FOLLOW_UP',
 dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
 caseId: caseData.id,
 assignedToId: caseData.createdById,
 createdById: caseData.createdById
 }
 });

 // Apply Inbound Rules for the Examiner
 try {
 const { applyInboundRules } = await import('@/lib/rules');
 await applyInboundRules(message.id, caseData.createdById);
 } catch (e) {
 logger.error({ err: e }, 'Failed to trigger rules for portal message:');
 }

 return NextResponse.json({ success: true, message });

 } catch (error) {
 logger.error({ err: error }, 'Portal Send Message Error:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}
