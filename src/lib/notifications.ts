import logger from '@/lib/logger';

export async function sendEmailNotification(userId: string, subject: string, snippet: string) {
 // TODO: redact snippet before replacing this mock with a real email provider
 logger.debug({ userId, subject, snippet }, '[MOCK EMAIL] Email notification triggered');
}

export async function sendSMSNotification(userId: string, snippet: string) {
 logger.debug({ userId, snippet }, '[MOCK SMS] SMS notification triggered');
}
