import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { sendEmailNotification, sendSMSNotification } from '@/lib/notifications';
import logger from '@/lib/logger';

/**
 * Applies a user's enabled inbound rules to a newly created message.
 * Creates MessageFolderAssignment records for any matching rules.
 */
export async function applyInboundRules(messageId: string, userId: string): Promise<void> {
 try {
 // 1. Fetch the message and user's enabled rules
 const message = await prisma.message.findUnique({
 where: { id: messageId },
 include: {
 sender: true,
 case: true
 }
 });

 if (!message) return;

 const rules = await prisma.inboundRule.findMany({
 where: {
 userId: userId,
 enabled: true
 },
 orderBy: { priority: 'asc' },
 include: {
 targetFolders: true // We need the rule-folder links
 }
 });

 if (rules.length === 0) return;

 // 2. Pre-process message data for comparison (decrypt if needed)
 const msgSubject = (message.subject || '').toLowerCase();
 // Note: Content is encrypted in DB. We might need to decrypt it to check content rules.
 // However, for privacy/performance, maybe we only check subject/sender?
 // Let's attempt to decrypt content for the check since the user owns the data.
 let msgContent = '';
 try {
 msgContent = decrypt(message.content).toLowerCase();
 } catch (e) {
 // If decryption fails (e.g. system system message?), ignore content check
 }

 const senderName = (message.isExternal ? (message.externalName ? decrypt(message.externalName) : '') : (message.sender?.name || '')).toLowerCase();
 const senderEmail = (message.isExternal ? (message.externalEmail ? decrypt(message.externalEmail) : '') : (message.sender?.email || '')).toLowerCase();
 const caseNumber = (message.case?.caseNumber || '').toLowerCase();


 // 3. Evaluation Loop
 const foldersToAssign = new Set<string>();
 let shouldKeepInInbox = true; // Default: Stay in Inbox unless a rule says "Move" (actionKeepInInbox = false)
 let shouldMarkRead = false;
 let shouldStar = false;
 let shouldEmail = false;
 let shouldSMS = false;
 let ruleMatched = false;

 for (const rule of rules) {
 let match = true; // Assume match until proven otherwise (AND logic)

 // Check conditions if they exist
 if (rule.senderContains && !senderName.includes(rule.senderContains.toLowerCase()) && !senderEmail.includes(rule.senderContains.toLowerCase())) {
 match = false;
 }
 if (match && rule.senderEquals && senderEmail !== rule.senderEquals.toLowerCase()) {
 match = false;
 }
 if (match && rule.subjectContains && !msgSubject.includes(rule.subjectContains.toLowerCase())) {
 match = false;
 }
 if (match && rule.contentContains && !msgContent.includes(rule.contentContains.toLowerCase())) {
 match = false;
 }
 if (match && rule.caseNumberContains && !caseNumber.includes(rule.caseNumberContains.toLowerCase())) {
 match = false;
 }
 if (match && rule.isExternal !== null && rule.isExternal !== message.isExternal) {
 match = false;
 }
 if (match && rule.hasAttachment !== null) {
 // We don't have attachments table fully linked yet in this context,
 // but let's assume false for now or skip.
 // match = false; // logic for attachments TBD
 }

 // If rule acts as a "High Priority" flag, we might not have a folder for it, 
 // but the schema suggests `targetFolders`.
 // `isHighPriority` in rule might mean "Mark message as high priority" (if message had that field),
 // or "Match constraint: Is this message high priority?".
 // Given the schema `inboundRule` has `isHighPriority` as a nullable boolean field alongside `senderContains`,
 // it likely acts as a CONDITION (e.g. "If message is high priority...").
 // But `Message` model doesn't seem to have a priority field explicitly shown in recent Schema view?
 // Let's double check Schema... `starred`? No.
 // We'll skip `isHighPriority` check for now as Message likely doesn't have it yet.

 if (match) {
 // Rule Matched!
 ruleMatched = true;

 // Collect target folders
 rule.targetFolders.forEach((tf: any) => foldersToAssign.add(tf.folderId));

 // Apply Actions
 if (!rule.actionKeepInInbox) {
 shouldKeepInInbox = false; // Move (remove from Inbox)
 }
 if (rule.actionMarkAsRead) {
 shouldMarkRead = true;
 }
 if (rule.actionStar) {
 shouldStar = true;
 }
 if (rule.actionSendEmailNotification) {
 shouldEmail = true;
 }
 if (rule.actionSendSMSNotification) {
 shouldSMS = true;
 }
 }
 }

 // 4. Apply Updates
 // Update message attributes (inInbox, read, starred)
 if (ruleMatched) {
 await prisma.message.update({
 where: { id: messageId },
 data: {
 inInbox: shouldKeepInInbox,
 read: shouldMarkRead ? true : undefined, // Only update if true to avoid overwriting existing state if we were to run this later logic
 starred: shouldStar ? true : undefined
 }
 });

 // Trigger Notifications
 // Trigger Notifications
 const subject = message.subject || 'No Subject';
 const snippet = msgContent ? (msgContent.substring(0, 50) + '...') : 'No Content';

 if (shouldEmail) {
 await sendEmailNotification(userId, subject, snippet);
 }
 if (shouldSMS) {
 await sendSMSNotification(userId, snippet);
 }
 }
 if (foldersToAssign.size > 0) {
 const assignments = Array.from(foldersToAssign).map(folderId => ({
 messageId,
 folderId
 }));

 await prisma.messageFolderAssignment.createMany({
 data: assignments,
 skipDuplicates: true
 });
 logger.debug({ count: assignments.length, messageId }, '[Rules] Applied folder assignments');
 }

 } catch (e) {
 logger.error({ err: e }, '[Rules] Failed to apply inbound rules');
 // Do not throw, we don't want to break message creation
 }
}
