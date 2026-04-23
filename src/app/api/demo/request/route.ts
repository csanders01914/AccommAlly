import { NextResponse } from 'next/server';
import logger from '@/lib/logger';

export async function POST(req: Request) {
 try {
 const body = await req.json();
 const { name, email, organization, casesEstimate, usersEstimate, message } = body;

 if (!name || !email || !organization || !casesEstimate || !usersEstimate) {
 return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
 }

 // Validate email format basic
 const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 if (!emailRegex.test(email)) {
 return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
 }

 // Mock email sending by logging it out
 logger.info({
 type: 'DEMO_REQUEST',
 data: {
 name,
 email,
 organization,
 casesEstimate,
 usersEstimate,
 message: message || ''
 }
 }, '[MOCK EMAIL] New Demo Request Form Submitted');

 // Since the user asked us to "just log it for now", we pretend this sends an email to the owner.

 return NextResponse.json({ success: true });
 } catch (error) {
 logger.error({ err: error }, 'Failed to process demo request');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}
