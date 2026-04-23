import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import { encrypt } from '@/lib/encryption';
import { z } from 'zod';
import logger from '@/lib/logger';

const CreateNoteSchema = z.object({
 content: z.string().min(1, 'Content is required'),
 noteType: z.enum(['GENERAL', 'INTAKE', 'DECISION', 'FOLLOWUP', 'SYSTEM', 'AUDIT']).default('GENERAL'),
});

/**
 * Generate a Document Control Number (DCN) in timestamp format: YYYYMMDDHHmmssSSS
 */
function generateDCN(): string {
 const now = new Date();
 return now.getFullYear().toString() +
 (now.getMonth() + 1).toString().padStart(2, '0') +
 now.getDate().toString().padStart(2, '0') +
 now.getHours().toString().padStart(2, '0') +
 now.getMinutes().toString().padStart(2, '0') +
 now.getSeconds().toString().padStart(2, '0') +
 now.getMilliseconds().toString().padStart(3, '0');
}

export async function POST(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
 const { id } = await params;
 const { session, error } = await requireAuth();
 if (error) return error;

 const tenantPrisma = withTenantScope(prisma, session.tenantId);

 const contentType = request.headers.get('content-type') || '';
 let content = '';
 let noteType = 'GENERAL';
 let file: File | null = null;

 // Task & Call Fields
 let createTask = false;
 let taskDescription = '';
 let taskDueDate: Date | undefined;
 let setReturnCall = false;
 let returnCallDate: Date | undefined;

 if (contentType.includes('multipart/form-data')) {
 const formData = await request.formData();
 content = formData.get('content') as string;
 noteType = (formData.get('noteType') as string) || 'GENERAL';

 const fileEntry = formData.get('file');
 if (fileEntry instanceof File && fileEntry.size > 0) {
 file = fileEntry;
 }

 // Extract Task/Call fields from FormData
 createTask = formData.get('createTask') === 'true';
 taskDescription = (formData.get('taskDescription') as string) || '';
 const taskDueDateStr = formData.get('taskDueDate') as string;
 if (taskDueDateStr) taskDueDate = new Date(taskDueDateStr);

 setReturnCall = formData.get('setReturnCall') === 'true';
 const returnCallDateStr = formData.get('returnCallDate') as string;
 if (returnCallDateStr) returnCallDate = new Date(returnCallDateStr);

 } else {
 const body = await request.json();
 content = body.content;
 noteType = body.noteType || 'GENERAL';

 // Extract Task/Call fields from JSON
 createTask = !!body.createTask;
 taskDescription = body.taskDescription || '';
 if (body.taskDueDate) taskDueDate = new Date(body.taskDueDate);

 setReturnCall = !!body.setReturnCall;
 if (body.returnCallDate) returnCallDate = new Date(body.returnCallDate);
 }

 const noteValidation = CreateNoteSchema.safeParse({ content, noteType });
 if (!noteValidation.success) {
 return NextResponse.json(
 { error: 'Validation Error', details: noteValidation.error.issues },
 { status: 400 }
 );
 }
 const { noteType: validNoteType } = noteValidation.data;

 // Verify case exists
 const existingCase = await tenantPrisma.case.findUnique({
 where: { id },
 });

 if (!existingCase) {
 return NextResponse.json({ error: 'Case not found' }, { status: 404 });
 }

 // Role-based permission check for note creation
 // Auditors can only add notes to cases they are assigned to (createdById)
 if (session.role === 'AUDITOR') {
 if (existingCase.createdById !== session.id) {
 return NextResponse.json({
 error: 'Auditors can only add notes to cases they are assigned to'
 }, { status: 403 });
 }
 }

 // Validate AUDIT note type - only ADMIN and AUDITOR can create audit notes
 if (validNoteType === 'AUDIT') {
 if (session.role !== 'ADMIN' && session.role !== 'AUDITOR') {
 return NextResponse.json({
 error: 'Only Admins and Auditors can create audit notes'
 }, { status: 403 });
 }
 }

 // Handle File Upload if present
 let documentDCN = '';
 if (file) {
 documentDCN = generateDCN();
 const buffer = Buffer.from(await file.arrayBuffer());

 await tenantPrisma.document.create({
 data: {
 fileName: file.name,
 fileType: file.type,
 fileSize: file.size,
 fileData: buffer,
 documentControlNumber: documentDCN,
 category: 'OTHER', // Could map based on noteType
 caseId: id,
 uploadedById: session.id,
 }
 });

 // Append DCN to content to link them "visually"
 content += `\n\n[Attached Document: ${file.name} (${documentDCN})]`;
 }

 const encryptedContent = encrypt(content);

 const note = await tenantPrisma.note.create({
 data: {
 content: encryptedContent,
 noteType: validNoteType,
 caseId: id,
 authorId: session.id,
 },
 include: {
 author: {
 select: { id: true, name: true },
 },
 },
 });

 // Create Task if requested
 if (createTask && taskDescription) {
 await tenantPrisma.task.create({
 data: {
 title: taskDescription.length > 50 ? taskDescription.substring(0, 47) + '...' : taskDescription, // Use description as title
 description: taskDescription,
 status: 'PENDING',
 priority: 'MEDIUM',
 dueDate: taskDueDate || new Date(Date.now() + 24 * 60 * 60 * 1000), // Default 24h
 caseId: id,
 createdById: session.id,
 assignedToId: session.id, // Assign to self? or leave unassigned? Self for now.
 }
 });
 content += `\n[Task Created: ${taskDescription}]`;
 }

 // Create Return Call Task if requested
 if (setReturnCall && returnCallDate) {
 await tenantPrisma.task.create({
 data: {
 title: 'Return Call',
 description: `Return call requested for ${returnCallDate.toLocaleString()}`,
 status: 'PENDING',
 priority: 'HIGH',
 dueDate: returnCallDate,
 caseId: id,
 category: 'PHONE_CALL',
 createdById: session.id,
 assignedToId: session.id,
 }
 });
 content += `\n[Return Call Scheduled: ${returnCallDate.toLocaleString()}]`;
 }

 // Create audit log
 await tenantPrisma.auditLog.create({
 data: {
 entityType: 'Case',
 entityId: id,
 action: 'UPDATE',
 metadata: JSON.stringify({
 action: 'add_note',
 noteId: note.id,
 hasAttachment: !!file,
 hasTask: createTask,
 hasReturnCall: setReturnCall
 }),
 userId: session.id,
 },
 });

 // Return the note with the original (decrypted) content so the UI can display it immediately
 return NextResponse.json({
 ...note,
 content: content // The original plain text with optional attachment text
 });
 } catch (error) {
 logger.error({ err: error }, 'Error creating note:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}
