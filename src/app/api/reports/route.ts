import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
 getComplianceMetrics,
 getFinancialMetrics,
 getTrendMetrics,
 getWorkflowMetrics,
} from '@/lib/reports';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

/**
 * GET /api/reports?type=compliance|financial|trends|workflow
 *
 * Open to all authenticated users — used by the report tab components
 * for data display. The paid export flow uses /api/reports/export instead.
 */
export async function GET(request: NextRequest) {
 const { session, error } = await requireAuth();
 if (error) return error;

 const tenantPrisma = withTenantScope(prisma, session.tenantId);
 void tenantPrisma; // scoped client available if needed by future queries

 const searchParams = request.nextUrl.searchParams;
 const type = searchParams.get('type');

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
 } catch (error) {
 logger.error({ err: error }, 'Error fetching report data:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}
