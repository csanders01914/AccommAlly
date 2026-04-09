import { applyTemplate } from '@/lib/document-templates';
import type { VariableMapping, CaseTemplateData } from '@/lib/document-templates';

const baseCaseData: CaseTemplateData = {
    clientName: 'Jane Doe',
    clientEmail: 'jane@example.com',
    caseNumber: 'ACC-2026-001',
    medicalDueDate: new Date(2026, 5, 15),
    accommodations: [],
};

describe('applyTemplate', () => {
    it('replaces a custom trigger with the mapped field value', () => {
        const mappings: VariableMapping[] = [{ trigger: '{ClientName}', field: 'CLAIMANT_NAME' }];
        const result = applyTemplate('<p>Dear {ClientName},</p>', mappings, baseCaseData);
        expect(result).toBe('<p>Dear Jane Doe,</p>');
    });

    it('replaces all occurrences of the same trigger', () => {
        const mappings: VariableMapping[] = [{ trigger: '{CaseNum}', field: 'CASE_NUMBER' }];
        const result = applyTemplate('Ref: {CaseNum} — see {CaseNum}', mappings, baseCaseData);
        expect(result).toBe('Ref: ACC-2026-001 — see ACC-2026-001');
    });

    it('leaves trigger as empty string when field value is null', () => {
        const mappings: VariableMapping[] = [{ trigger: '{MedDue}', field: 'MEDICAL_DUE_DATE' }];
        const noDateCase: CaseTemplateData = { ...baseCaseData, medicalDueDate: null };
        const result = applyTemplate('Due: {MedDue}', mappings, noDateCase);
        expect(result).toBe('Due: ');
    });

    it('leaves trigger as empty string when claimant email is null', () => {
        const mappings: VariableMapping[] = [{ trigger: '{Email}', field: 'CLAIMANT_EMAIL' }];
        const noEmailCase: CaseTemplateData = { ...baseCaseData, clientEmail: null };
        const result = applyTemplate('Email: {Email}', mappings, noEmailCase);
        expect(result).toBe('Email: ');
    });

    it('fills AR1 fields from the first active accommodation', () => {
        const caseData: CaseTemplateData = {
            ...baseCaseData,
            accommodations: [{
                type: 'Remote Work',
                description: 'Work from home 3 days/week',
                startDate: new Date(2026, 0, 1),
                endDate: new Date(2026, 11, 31),
                lifecycleStatus: 'OPEN',
            }],
        };
        const result = applyTemplate('{AR1 Type}, {AR1 Description}, {AR1 Start} through {AR1 End}', [], caseData);
        expect(result).toBe('Remote Work, Work from home 3 days/week, 01/01/2026 through 12/31/2026');
    });

    it('leaves AR fields blank when no accommodation exists for that slot', () => {
        const result = applyTemplate('{AR2 Type}, {AR2 Start}', [], baseCaseData);
        expect(result).toBe(', ');
    });

    it('leaves AR end date blank when accommodation has no end date', () => {
        const caseData: CaseTemplateData = {
            ...baseCaseData,
            accommodations: [{ type: 'Equipment', description: 'Standing desk', startDate: new Date(2026, 0, 1), endDate: null, lifecycleStatus: 'OPEN' }],
        };
        const result = applyTemplate('{AR1 Start} through {AR1 End}', [], caseData);
        expect(result).toBe('01/01/2026 through ');
    });

    it('skips accommodations that are not OPEN', () => {
        const caseData: CaseTemplateData = {
            ...baseCaseData,
            accommodations: [{ type: 'Equipment', description: 'Standing desk', startDate: new Date(2026, 0, 1), endDate: null, lifecycleStatus: 'CLOSED' }],
        };
        const result = applyTemplate('{AR1 Type}', [], caseData);
        expect(result).toBe('');
    });

    it('sorts active accommodations by startDate ascending for AR slots', () => {
        const caseData: CaseTemplateData = {
            ...baseCaseData,
            accommodations: [
                { type: 'Equipment', description: 'B', startDate: new Date(2026, 5, 1), endDate: null, lifecycleStatus: 'OPEN' },
                { type: 'Remote Work', description: 'A', startDate: new Date(2026, 0, 1), endDate: null, lifecycleStatus: 'OPEN' },
            ],
        };
        const result = applyTemplate('{AR1 Type} {AR2 Type}', [], caseData);
        expect(result).toBe('Remote Work Equipment');
    });

    it('supports up to 10 accommodation slots', () => {
        const accommodations = Array.from({ length: 10 }, (_, i) => ({
            type: `Type${i + 1}`,
            description: `Desc${i + 1}`,
            startDate: new Date(2026, i, 1),
            endDate: null,
            lifecycleStatus: 'OPEN' as const,
        }));
        const caseData: CaseTemplateData = { ...baseCaseData, accommodations };
        const result = applyTemplate('{AR10 Type}', [], caseData);
        expect(result).toBe('Type10');
    });
});
