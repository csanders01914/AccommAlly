import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { differenceInDays, startOfDay, addMonths } from 'date-fns';

export async function getComplianceMetrics() {
    // 1. Initial Response Lag
    // Fetch cases with at least one interactive dialogue
    const casesWithMeetings = await prisma.case.findMany({
        where: {
            meetings: {
                some: {
                    type: 'INTERACTIVE_DIALOGUE',
                },
            },
        },
        select: {
            createdAt: true,
            requestDate: true,
            meetings: {
                where: {
                    type: 'INTERACTIVE_DIALOGUE',
                },
                orderBy: {
                    startTime: 'asc',
                },
                take: 1,
                select: {
                    startTime: true,
                },
            },
        },
    });

    let totalLagDays = 0;
    let responseCount = 0;

    casesWithMeetings.forEach((c: any) => {
        const startDate = c.requestDate || c.createdAt;
        const meetingDate = c.meetings[0]?.startTime;
        if (startDate && meetingDate) {
            const lag = differenceInDays(meetingDate, startDate);
            if (lag >= 0) {
                totalLagDays += lag;
                responseCount++;
            }
        }
    });

    const avgInitialResponseLag = responseCount > 0 ? (totalLagDays / responseCount).toFixed(1) : 0;

    // 2. Average Case Duration
    const closedCases = await prisma.case.findMany({
        where: {
            status: 'CLOSED',
            closedAt: {
                not: null,
            },
        },
        select: {
            createdAt: true,
            requestDate: true,
            closedAt: true,
        },
    });

    let totalDurationDays = 0;
    closedCases.forEach((c: any) => {
        const startDate = c.requestDate || c.createdAt;
        if (startDate && c.closedAt) {
            const duration = differenceInDays(c.closedAt, startDate);
            if (duration >= 0) {
                totalDurationDays += duration;
            }
        }
    });

    const avgCaseDuration = closedCases.length > 0 ? (totalDurationDays / closedCases.length).toFixed(1) : 0;

    // 3. Recertification Calendar (Next 6 months)
    const sixMonthsFromNow = addMonths(new Date(), 6);
    const expiriingAccommodations = await prisma.accommodation.findMany({
        where: {
            reviewDate: {
                gte: new Date(),
                lte: sixMonthsFromNow,
            },
            status: 'APPROVED',
        },
        include: {
            case: {
                select: {
                    clientName: true,
                    caseNumber: true,
                },
            },
        },
        orderBy: {
            reviewDate: 'asc',
        },
    });

    return {
        initialResponseLag: avgInitialResponseLag,
        avgCaseDuration,
        expiringAccommodations: expiriingAccommodations.map((a: any) => ({
            id: a.id,
            caseNumber: a.case.caseNumber,
            clientName: a.case.clientName,
            type: a.type,
            reviewDate: a.reviewDate,
        })),
    };
}

export async function getFinancialMetrics() {
    // 1. Accommodation Cost Analysis by Job Family (via Case)
    // Prisma doesn't support grouping by relation fields deeply easily in all versions, 
    // but we can fetch and aggregate or use raw query. Raw query is often cleaner for aggregation logic.

    // Doing it in application memory for flexibility if dataset is small, 
    // OR raw query for performance. Let's try raw query or groupBy on Accommodation if possible.
    // Accommodation has cost, but JobFamily is on Case.

    const accommodations = await prisma.accommodation.findMany({
        where: {
            actualCost: { gt: 0 }
        },
        select: {
            actualCost: true,
            case: {
                select: {
                    jobFamily: true,
                    jobTitle: true,
                }
            }
        }
    });

    const costByJobFamily: Record<string, number> = {};

    accommodations.forEach((acc: any) => {
        const family = acc.case?.jobFamily || 'Unassigned';
        const cost = Number(acc.actualCost) || 0;
        costByJobFamily[family] = (costByJobFamily[family] || 0) + cost;
    });

    // 2. Internal vs External Spend
    const spendByType = await prisma.accommodation.groupBy({
        by: ['isExternal'],
        _sum: {
            actualCost: true,
        },
    });

    const internalExternal = spendByType.map((item: any) => ({
        name: item.isExternal ? 'External' : 'Internal',
        value: Number(item._sum.actualCost) || 0,
    }));

    // 3. Tax Credit Eligibility (approximate based on criteria)
    // For now returning list of high-cost items or specific types
    const potentiallyEligible = await prisma.accommodation.findMany({
        where: {
            OR: [
                { actualCost: { gte: 250 } }, // Arbitrary threshold for example
                { type: 'PHYSICAL_ACCOMMODATION' }
            ]
        },
        take: 10,
        select: {
            id: true,
            type: true,
            description: true,
            actualCost: true,
        }
    });

    return {
        costByJobFamily: Object.entries(costByJobFamily).map(([name, value]) => ({ name, value })),
        internalExternal,
        taxCreditEligible: potentiallyEligible,
    };
}

export async function getTrendMetrics() {
    // 1. Accommodation Type Distribution
    const typeDistribution = await prisma.accommodation.groupBy({
        by: ['type'],
        _count: {
            id: true,
        },
    });

    // 2. High Frequency Job Roles (Case count by Job Title)
    const jobRoleStats = await prisma.case.groupBy({
        by: ['jobTitle'],
        _count: {
            id: true,
        },
        orderBy: {
            _count: {
                id: 'desc',
            }
        },
        take: 10,
    });

    // 3. Denial Reasons
    const denialReasons = await prisma.accommodation.groupBy({
        by: ['lifecycleSubstatus'],
        where: {
            status: {
                in: ['REJECTED', 'RESCINDED'],
            },
        },
        _count: {
            id: true,
        },
    });

    return {
        typeDistribution: typeDistribution.map((t: any) => ({ name: t.type, value: t._count.id })),
        jobRoleStats: jobRoleStats.map((j: any) => ({ name: j.jobTitle || 'Unknown', value: j._count.id })),
        denialReasons: denialReasons.map((d: any) => ({ name: d.lifecycleSubstatus, value: d._count.id })),
    };
}

export async function getWorkflowMetrics() {
    // 1. Interactions Log Summary
    // Count of notes/meetings/messages per case
    // This is expensive to aggregate for ALL cases. Maybe just getting totals?

    const totalNotes = await prisma.note.count();
    const totalMeetings = await prisma.meeting.count();
    const totalMessages = await prisma.message.count();

    // 2. Pending Medical Documentation
    const pendingMedical = await prisma.case.findMany({
        where: {
            accommodations: {
                some: {
                    lifecycleSubstatus: 'MEDICAL_NOT_SUBMITTED',
                    status: 'PENDING',
                }
            }
        },
        select: {
            id: true,
            caseNumber: true,
            clientName: true,
            updatedAt: true,
        },
        take: 20,
    });

    // 3. Outcome Effectiveness
    // Placeholder: Retention rate? Or just closed cases ratio?
    const totalClosed = await prisma.case.count({ where: { status: 'CLOSED' } });
    const totalOpened = await prisma.case.count();

    return {
        interactions: [
            { name: 'Notes', value: totalNotes },
            { name: 'Meetings', value: totalMeetings },
            { name: 'Messages', value: totalMessages },
        ],
        pendingMedical: pendingMedical.map((c: any) => ({
            caseNumber: c.caseNumber,
            clientName: c.clientName,
            lastUpdated: c.updatedAt,
        })),
        outcomeStats: {
            closedRatio: totalOpened > 0 ? (totalClosed / totalOpened * 100).toFixed(1) : 0,
        }
    };
}
