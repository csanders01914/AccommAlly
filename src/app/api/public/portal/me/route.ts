import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPortalSession } from '@/lib/portal-auth';
import { decrypt } from '@/lib/encryption';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const claimant = await prisma.claimant.findFirst({
      where: { id: session.claimantId, tenantId: session.tenantId },
      select: { claimantNumber: true, name: true },
    });

    if (!claimant) {
      return NextResponse.json({ error: 'Claimant not found' }, { status: 404 });
    }

    return NextResponse.json({
      claimantNumber: claimant.claimantNumber,
      name: decrypt(claimant.name),
    });
  } catch (error) {
    logger.error({ err: error }, 'Portal Me Error:');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
