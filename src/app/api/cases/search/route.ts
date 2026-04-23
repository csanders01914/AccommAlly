import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/cases/search?q=... - Search cases by claim number or client name
 */
export async function GET(request: NextRequest) {
 try {
 const searchParams = request.nextUrl.searchParams;
 const query = searchParams.get('q');

 let whereClause = {};

 if (query && query.trim().length >= 2) {
 const searchTerm = query.trim();
 whereClause = {
 OR: [
 { caseNumber: { contains: searchTerm, mode: 'insensitive' } },
 { clientName: { contains: searchTerm, mode: 'insensitive' } },
 { clientEmail: { contains: searchTerm, mode: 'insensitive' } },
 ],
 };
 }

 const cases = await prisma.case.findMany({
 where: whereClause,
 include: {
 tasks: {
 include: {
 assignedTo: {
 select: { id: true, name: true },
 },
 },
 orderBy: { dueDate: 'asc' },
 },
 createdBy: {
 select: { id: true, name: true },
 },
 },
 orderBy: { createdAt: 'desc' },
 take: 20,
 });

 return NextResponse.json({ cases });

 } catch (error) {
 logger.error({ err: error }, 'Error searching cases:');
 return NextResponse.json(
 { error: 'Failed to search cases' },
 { status: 500 }
 );
 }
}
