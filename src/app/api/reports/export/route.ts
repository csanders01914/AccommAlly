import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
 getComplianceMetrics,
 getFinancialMetrics,
 getTrendMetrics,
 getWorkflowMetrics,
} from '@/lib/reports';
import { requireAuth } from '@/lib/require-auth';
import { verifyExportToken } from '@/lib/export-token';
import logger from '@/lib/logger';

/**
 * GET /api/reports/export?type=compliance|financial|trends|workflow
 *
 * This endpoint is for the PAID EXPORT flow only. It requires a valid
 * signed export token (Bearer header) issued by /api/reports/confirm-export.
 *
 * The regular /api/reports route remains open for the tab data-display views.
 */
export async function GET(request: NextRequest) {
 // Session must be valid
 const { session, error } = await requireAuth();
 if (error) return error;

 // Export token required — issued by /api/reports/confirm-export after payment
 const authHeader = request.headers.get('Authorization');
 const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

 if (!token) {
 return NextResponse.json({ error: 'Export token required' }, { status: 401 });
 }

 const payload = verifyExportToken(token);

 if (!payload) {
 return NextResponse.json(
 { error: 'Export token is invalid or has expired. Please complete payment again.' },
 { status: 401 }
 );
 }

 // Token must belong to the authenticated user/tenant
 if (payload.userId !== session.id || payload.tenantId !== session.tenantId) {
 return NextResponse.json({ error: 'Token mismatch' }, { status: 403 });
 }

 // Token must reference a SUCCEEDED payment record
 const record = await prisma.reportExportPayment.findUnique({
 where: { id: payload.paymentRecordId },
 select: { status: true, tenantId: true, userId: true },
 });

 if (!record || record.status !== 'SUCCEEDED') {
 return NextResponse.json({ error: 'Payment not confirmed' }, { status: 403 });
 }

 if (record.tenantId !== session.tenantId || record.userId !== session.id) {
 return NextResponse.json({ error: 'Token mismatch' }, { status: 403 });
 }

 // Update exportedAt — informational, records last download time, NOT an access gate
 await prisma.reportExportPayment.update({
 where: { id: payload.paymentRecordId },
 data: { exportedAt: new Date() },
 });

 const type = request.nextUrl.searchParams.get('type');

 try {
 let data;
 switch (type) {
 case 'compliance':
 data = await getComplianceMetrics();
 break;
 case 'financial':
 data = await getFinancialMetrics();
 break;
 case 'trends':
 data = await getTrendMetrics();
 break;
 case 'workflow':
 data = await getWorkflowMetrics();
 break;
 default:
 return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
 }

 return NextResponse.json(data);
 } catch (err) {
 logger.error({ err }, 'Error fetching export data:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}
