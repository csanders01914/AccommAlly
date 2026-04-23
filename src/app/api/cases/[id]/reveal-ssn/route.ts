import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

/**
 * POST /api/cases/[id]/reveal-ssn
 * Reveal the full decrypted SSN for a case (POST to prevent caching of sensitive response)
 */
export async function POST(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
 const { id } = await params;

 const { session, error } = await requireAuth({ request, roles: ['ADMIN', 'COORDINATOR'] });
 if (error) return error;

 // Use tenant-scoped Prisma
 const tenantPrisma = withTenantScope(prisma, session.tenantId);

 const caseData = await tenantPrisma.case.findUnique({
 where: { id },
 select: {
 clientSSN: true,
 clientSSNPrefix: true,
 clientSSNSuffix: true,
 id: true
 }
 });

 if (!caseData) {
 return NextResponse.json(
 { error: 'Case not found' },
 { status: 404 }
 );
 }

 let decryptedSSN: string | null = null;

 try {
 if (caseData.clientSSNPrefix && caseData.clientSSNSuffix) {
 const prefix = decrypt(caseData.clientSSNPrefix);
 const suffix = decrypt(caseData.clientSSNSuffix);
 const full = prefix + suffix;
 if (full.length === 9) {
 decryptedSSN = `${full.slice(0, 3)}-${full.slice(3, 5)}-${full.slice(5)}`;
 } else {
 decryptedSSN = full;
 }
 } else if (caseData.clientSSN) {
 decryptedSSN = decrypt(caseData.clientSSN);
 }
 } catch (decryptError) {
 logger.error({ err: decryptError }, 'Decryption failed:');
 }

 // Log the access — include tenantId for proper tenant-scoped audit queries
 await tenantPrisma.auditLog.create({
 data: {
 entityType: 'Case',
 entityId: id,
 action: 'REVEAL_SSN',
 userId: session.id,
 tenantId: session.tenantId,
 metadata: JSON.stringify({ ip: request.headers.get('x-forwarded-for') || 'unknown' }),
 }
 });

 const response = NextResponse.json({ ssn: decryptedSSN });
 response.headers.set('Cache-Control', 'no-store, private');
 response.headers.set('Pragma', 'no-cache');
 return response;

 } catch (error) {
 logger.error({ err: error }, 'Error revealing SSN:');
 return NextResponse.json(
 { error: 'Failed to reveal SSN' },
 { status: 500 }
 );
 }
}
