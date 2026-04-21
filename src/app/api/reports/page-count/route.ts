import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import prisma from '@/lib/prisma';
import { addMonths } from 'date-fns';

const ROWS_PER_PAGE = 25;
const PRICE_PER_PAGE_CENTS = 25;   // $0.25
const MINIMUM_CENTS = 500;          // $5.00

/**
 * Estimates the number of print-pages the Excel export would produce
 * by counting the data rows in each sheet (mirrors the structure in ExportButton).
 * Uses COUNT queries — no PII is returned.
 */
export async function GET(_request: NextRequest) {
    const { session, error } = await requireAuth();
    if (error) return error;

    const tenantId = session.tenantId;

    // ── Compliance sheet rows ──────────────────────────────────────────────────
    // 4 header/summary rows (fixed) + expiringAccommodations count
    const complianceFixed = 4;
    const expiringCount = await prisma.accommodation.count({
        where: {
            tenantId,
            reviewDate: { gte: new Date(), lte: addMonths(new Date(), 6) },
            status: 'APPROVED',
        },
    });

    // ── Financial sheet rows ──────────────────────────────────────────────────
    // 8 header/summary rows (fixed) + distinct job families + tax-eligible items (capped at 10)
    const financialFixed = 8;
    const jobFamilies = await prisma.accommodation.groupBy({
        by: ['caseId'], // proxy: distinct accommodations with cost, grouped by case.jobFamily
        where: { tenantId, actualCost: { gt: 0 } },
        _count: { caseId: true },
    });
    // We use distinct jobFamily count via a raw count of cases with cost
    const jobFamilyCount = jobFamilies.length > 0 ? jobFamilies.length : 0;
    const taxCount = await prisma.accommodation.count({
        where: {
            tenantId,
            OR: [{ actualCost: { gte: 250 } }, { type: 'PHYSICAL_ACCOMMODATION' }],
        },
    });
    const taxCountCapped = Math.min(taxCount, 10);

    // ── Trends sheet rows ─────────────────────────────────────────────────────
    // 1 header row + typeDistribution + jobRoleStats (capped 10) + denialReasons
    const trendsFixed = 1;
    const typeDistCount = await prisma.accommodation.groupBy({
        by: ['type'],
        where: { tenantId },
        _count: { id: true },
    });
    const jobRoleCount = await prisma.case.groupBy({
        by: ['jobTitle'],
        where: { tenantId },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
    });
    const denialCount = await prisma.accommodation.groupBy({
        by: ['lifecycleSubstatus'],
        where: {
            tenantId,
            status: { in: ['REJECTED', 'RESCINDED'] },
        },
        _count: { id: true },
    });

    // ── Workflow sheet rows ───────────────────────────────────────────────────
    // 4 fixed rows (header/summary) + 3 interaction rows + pendingMedical (capped 20)
    const workflowFixed = 4;
    const interactionRows = 3; // Notes, Meetings, Messages
    const pendingMedCount = await prisma.case.count({
        where: {
            tenantId,
            accommodations: {
                some: {
                    lifecycleSubstatus: 'MEDICAL_NOT_SUBMITTED',
                    status: 'PENDING',
                },
            },
        },
    });
    const pendingMedCapped = Math.min(pendingMedCount, 20);

    // ── Total ─────────────────────────────────────────────────────────────────
    const totalRows =
        complianceFixed + expiringCount +
        financialFixed + jobFamilyCount + taxCountCapped +
        trendsFixed + typeDistCount.length + jobRoleCount.length + denialCount.length +
        workflowFixed + interactionRows + pendingMedCapped;

    const pageCount = Math.max(1, Math.ceil(totalRows / ROWS_PER_PAGE));
    const amountCents = Math.max(MINIMUM_CENTS, pageCount * PRICE_PER_PAGE_CENTS);

    const dollars = (amountCents / 100).toFixed(2);
    const amountDisplay = `$${dollars} (${pageCount} page${pageCount !== 1 ? 's' : ''} × $0.25, min $5.00)`;

    return NextResponse.json({ pageCount, amountCents, amountDisplay });
}
