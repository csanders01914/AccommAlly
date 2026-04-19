import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import { logError } from '@/lib/logging';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
    try {
        const { session, error } = await requireAuth();

        if (error) return error;

        const tenantPrisma = withTenantScope(prisma, session.tenantId);
        const body = await request.json();

        const {
            transactionId,
            subject,
            description,
            reporterName,
            reporterEmail,
            reporterPhone,
            contactMethod
        } = body;

        // Basic validation
        if (!subject || !description || !reporterName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Save to local DB (Audit/Backup)
        const bugReport = await prisma.bugReport.create({
            data: {
                transactionId: transactionId || null,
                subject,
                description,
                reporterName,
                reporterEmail,
                reporterPhone,
                contactMethod: contactMethod || 'NONE',
                userId: session?.id || null,
                status: 'OPEN'
            }
        });

        // 2. Create GitHub Issue
        const githubToken = process.env.GITHUB_TOKEN;
        const githubOwner = process.env.GITHUB_OWNER;
        const githubRepo = process.env.GITHUB_REPO;

        if (githubToken && githubOwner && githubRepo) {
            try {
                const issueBody = `
**Reporter:** ${reporterName} (${reporterEmail})
**Contact Method:** ${contactMethod} ${reporterPhone ? `(${reporterPhone})` : ''}
**Transaction ID:** ${transactionId || 'N/A'}
**User ID:** ${session?.id || 'Anonymous'}

---
**Description:**
${description}

---
*This issue was automatically created from the AccommAlly Bug Report system.*
Reference ID: ${bugReport.id}
`;

                const ghRes = await fetch(`https://api.github.com/repos/${githubOwner}/${githubRepo}/issues`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        title: `[Bug Report] ${subject}`,
                        body: issueBody,
                        labels: ['bug', 'user-report']
                    })
                });

                if (ghRes.ok) {
                    const issueData = await ghRes.json();
                    logger.debug(`GitHub Issue created: ${issueData.html_url}`);
                    // Optionally update the local report with the GitHub URL if schema allows
                } else {
                    const errorText = await ghRes.text();
                    logger.error({ err: errorText }, 'Failed to create GitHub issue:');
                    // We don't fail the request to the user, but we log the integration failure
                    await logError(new Error(`GitHub API Error: ${errorText}`), { path: '/api/bug-reports', method: 'GITHUB_integration' });
                }

            } catch (ghError) {
                logger.error({ err: ghError }, 'GitHub Integration Error:');
                await logError(ghError, { path: '/api/bug-reports', method: 'GITHUB_integration' });
            }
        } else {
            logger.warn('GitHub credentials missing. Skipping issue creation.');
        }

        return NextResponse.json({ success: true, id: bugReport.id });

    } catch (error) {
        const txId = await logError(error, {
            path: '/api/bug-reports',
            method: 'POST'
        });

        return NextResponse.json({
            error: 'Internal Server Error',
            transactionId: txId
        }, { status: 500 });
    }
}

export async function GET() {
    try {
        const { session, error } = await requireAuth();

        if (error) return error;

        const tenantPrisma = withTenantScope(prisma, session.tenantId);
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const reports = await prisma.bugReport.findMany({
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { name: true, email: true } } }
        });

        return NextResponse.json({ reports });

    } catch (error) {
        await logError(error, { path: '/api/bug-reports', method: 'GET' });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
