import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import { applyTemplate, TEMPLATE_FIELDS } from '@/lib/document-templates';
import type { VariableMapping, TemplateField, CaseTemplateData } from '@/lib/document-templates';

/**
 * POST /api/document-templates/[id]/apply
 * Body: { caseId: string }
 * Returns: { html: string } — template with variables substituted from case data.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { session, error } = await requireAuth();
        if (error) return error;

        const { id } = await params;
        const { caseId } = await request.json() as { caseId: string };

        if (!caseId) {
            return NextResponse.json({ error: 'caseId is required' }, { status: 400 });
        }

        const tenantPrisma = withTenantScope(prisma, session.tenantId);

        // Verify template belongs to this tenant
        const template = await tenantPrisma.documentTemplate.findUnique({
            where: { id },
            select: { htmlContent: true, variableMappings: true },
        });

        if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

        // Fetch case with active accommodations
        const caseData = await tenantPrisma.case.findUnique({
            where: { id: caseId },
            select: {
                clientName: true,
                clientEmail: true,
                caseNumber: true,
                medicalDueDate: true,
                accommodations: {
                    where: { lifecycleStatus: 'OPEN' },
                    select: {
                        type: true,
                        description: true,
                        startDate: true,
                        endDate: true,
                        lifecycleStatus: true,
                    },
                },
            },
        });

        if (!caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

        const templateData: CaseTemplateData = {
            clientName: caseData.clientName,
            clientEmail: caseData.clientEmail,
            caseNumber: caseData.caseNumber,
            medicalDueDate: caseData.medicalDueDate,
            accommodations: caseData.accommodations.map((a: typeof caseData.accommodations[number]) => ({
                type: a.type,
                description: a.description,
                startDate: a.startDate,
                endDate: a.endDate,
                lifecycleStatus: a.lifecycleStatus,
            })),
        };

        const rawMappings = Array.isArray(template.variableMappings) ? template.variableMappings : [];
        const mappings = (rawMappings as VariableMapping[]).filter(
            (m): m is VariableMapping =>
                typeof m === 'object' && m !== null &&
                typeof (m as VariableMapping).trigger === 'string' &&
                TEMPLATE_FIELDS.includes((m as VariableMapping).field as TemplateField)
        );
        const html = applyTemplate(template.htmlContent, mappings, templateData);

        return NextResponse.json({ html });
    } catch (err) {
        console.error('POST /api/document-templates/[id]/apply error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
