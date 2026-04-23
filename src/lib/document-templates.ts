import { format } from 'date-fns';

export type TemplateField =
 | 'CLAIMANT_NAME'
 | 'TODAY_DATE'
 | 'MEDICAL_DUE_DATE'
 | 'CASE_NUMBER'
 | 'CLAIMANT_EMAIL';

export const TEMPLATE_FIELD_LABELS: Record<TemplateField, string> = {
 CLAIMANT_NAME: 'Claimant Name',
 TODAY_DATE: "Today's Date",
 MEDICAL_DUE_DATE: 'Medical Due Date',
 CASE_NUMBER: 'Case Number',
 CLAIMANT_EMAIL: 'Claimant Email',
};

export const TEMPLATE_FIELDS: TemplateField[] = [
 'CLAIMANT_NAME',
 'TODAY_DATE',
 'MEDICAL_DUE_DATE',
 'CASE_NUMBER',
 'CLAIMANT_EMAIL',
];

export interface VariableMapping {
 trigger: string;
 field: TemplateField;
}

export interface AccommodationData {
 type: string;
 description: string;
 startDate: Date;
 endDate: Date | null;
 lifecycleStatus: string;
}

export interface CaseTemplateData {
 clientName: string;
 clientEmail: string | null;
 caseNumber: string;
 medicalDueDate: Date | null;
 accommodations: AccommodationData[];
}

/**
 * Apply template variable substitution to an HTML string.
 *
 * Two phases:
 * 1. Custom mappings — each trigger string is replaced with the resolved case field value.
 * 2. Built-in AR1–AR10 slots — accommodation placeholders filled from OPEN accommodations
 * sorted by startDate ascending (up to 10). Missing slots become empty strings.
 *
 * @remarks
 * If a resolved value contains another trigger string, that trigger will also be replaced
 * when its mapping is processed. This is acceptable behaviour for typical letter templates.
 */
export function applyTemplate(
 htmlContent: string,
 mappings: VariableMapping[],
 caseData: CaseTemplateData
): string {
 let result = htmlContent;

 for (const mapping of mappings) {
 const value = resolveField(mapping.field, caseData);
 result = result.split(mapping.trigger).join(value);
 }

 const activeAccommodations = caseData.accommodations
 .filter(a => a.lifecycleStatus === 'OPEN')
 .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
 .slice(0, 10);

 for (let i = 0; i < 10; i++) {
 const acc = activeAccommodations[i];
 const n = i + 1;
 result = result.split(`{AR${n} Type}`).join(acc?.type ?? '');
 result = result.split(`{AR${n} Description}`).join(acc?.description ?? '');
 result = result.split(`{AR${n} Start}`).join(acc ? format(acc.startDate, 'MM/dd/yyyy') : '');
 result = result.split(`{AR${n} End}`).join(acc?.endDate ? format(acc.endDate, 'MM/dd/yyyy') : '');
 }

 return result;
}

function resolveField(field: TemplateField, caseData: CaseTemplateData): string {
 switch (field) {
 case 'CLAIMANT_NAME': return caseData.clientName;
 case 'TODAY_DATE': return format(new Date(), 'MM/dd/yyyy');
 case 'MEDICAL_DUE_DATE': return caseData.medicalDueDate ? format(caseData.medicalDueDate, 'MM/dd/yyyy') : '';
 case 'CASE_NUMBER': return caseData.caseNumber;
 case 'CLAIMANT_EMAIL': return caseData.clientEmail ?? '';
 default: {
 const _exhaustive: never = field;
 throw new Error(`Unhandled TemplateField: ${_exhaustive}`);
 }
 }
}
