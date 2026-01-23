export async function sendEmailNotification(userId: string, subject: string, snippet: string) {
    console.log(`[MOCK EMAIL] To User: ${userId}`);
    console.log(`[MOCK EMAIL] Subject: Notification: ${subject}`);
    console.log(`[MOCK EMAIL] Body: You have a new message matching your rule. Preview: "${snippet}"`);
}

export async function sendSMSNotification(userId: string, snippet: string) {
    console.log(`[MOCK SMS] To User: ${userId}`);
    console.log(`[MOCK SMS] Message: AccommAlly Alert: You have a new message. "${snippet}"`);
}
