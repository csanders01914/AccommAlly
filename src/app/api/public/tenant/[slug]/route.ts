import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { name: true, slug: true, status: true },
    });

    if (!tenant || tenant.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({ name: tenant.name, slug: tenant.slug });
  } catch (error) {
    logger.error({ err: error }, 'Tenant slug lookup error:');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
