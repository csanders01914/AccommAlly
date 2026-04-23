import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

// GET single meeting
export async function GET(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
 const { session, error } = await requireAuth();

 if (error) return error;

 const tenantPrisma = withTenantScope(prisma, session.tenantId);
 if (!session) {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 }

 const { id } = await params;

 const meeting = await prisma.meeting.findUnique({
 where: { id },
 include: {
 organizer: { select: { id: true, name: true, email: true } },
 attendees: {
 include: {
 user: { select: { id: true, name: true, email: true } }
 }
 },
 case: { select: { id: true, caseNumber: true, clientName: true } },
 reminders: true
 }
 });

 if (!meeting) {
 return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
 }

 return NextResponse.json(meeting);

 } catch (error) {
 logger.error({ err: error }, 'Meeting GET Error:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}

// PATCH update meeting
export async function PATCH(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
 const { session, error } = await requireAuth();

 if (error) return error;

 const tenantPrisma = withTenantScope(prisma, session.tenantId);
 if (!session) {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 }

 const { id } = await params;
 const body = await request.json();
 const {
 title,
 description,
 location,
 startTime,
 endTime,
 allDay,
 color,
 recurrenceRule,
 recurrenceEnd,
 caseId
 } = body;

 const updateData: any = {};

 if (title !== undefined) updateData.title = title;
 if (description !== undefined) updateData.description = description;
 if (location !== undefined) updateData.location = location;
 if (startTime !== undefined) updateData.startTime = new Date(startTime);
 if (endTime !== undefined) updateData.endTime = new Date(endTime);
 if (allDay !== undefined) updateData.allDay = allDay;
 if (color !== undefined) updateData.color = color;
 if (recurrenceRule !== undefined) updateData.recurrenceRule = recurrenceRule;
 if (recurrenceEnd !== undefined) updateData.recurrenceEnd = recurrenceEnd ? new Date(recurrenceEnd) : null;
 if (caseId !== undefined) updateData.caseId = caseId;

 const meeting = await prisma.meeting.update({
 where: { id },
 data: updateData,
 include: {
 organizer: { select: { id: true, name: true } },
 attendees: { include: { user: { select: { id: true, name: true } } } },
 case: { select: { id: true, caseNumber: true } }
 }
 });

 // Audit Log: Meeting Updated
 await prisma.auditLog.create({
 data: {
 entityType: 'Meeting',
 entityId: meeting.id,
 action: 'UPDATE',
 userId: session.id,
 metadata: JSON.stringify({
 changes: Object.keys(updateData)
 })
 }
 });

 return NextResponse.json(meeting);

 } catch (error) {
 logger.error({ err: error }, 'Meeting PATCH Error:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}

// DELETE meeting
export async function DELETE(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
 const { session, error } = await requireAuth();

 if (error) return error;

 const tenantPrisma = withTenantScope(prisma, session.tenantId);
 if (!session) {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 }

 const { id } = await params;

 // Audit Log: Meeting Deleted
 await prisma.auditLog.create({
 data: {
 entityType: 'Meeting',
 entityId: id,
 action: 'DELETE',
 userId: session.id,
 metadata: JSON.stringify({ action: 'delete_meeting' })
 }
 });

 await prisma.meeting.delete({ where: { id } });

 return NextResponse.json({ success: true });

 } catch (error) {
 logger.error({ err: error }, 'Meeting DELETE Error:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}
