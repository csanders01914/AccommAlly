export type DecisionType = 'APPROVAL' | 'DENIAL' | 'RFI';

export interface DecisionTemplate {
    id: DecisionType;
    label: string;
    subject: string;
    body: string;
}

export const DECISION_TEMPLATES: Record<DecisionType, DecisionTemplate> = {
    APPROVAL: {
        id: 'APPROVAL',
        label: 'Approval Letter',
        subject: 'Notice of Accommodation Approval - Case #{{caseNumber}}',
        body: `Dear {{clientName}},

We are pleased to inform you that your request for reasonable accommodation has been APPROVED.

**Approved Accommodations:**
{{accommodations}}

**Next Steps:**
Please contact your Program Lead to discuss the implementation details. If you encounter any issues, please reach out to us immediately.

Sincerely,
The AccommAlly Coordination Team`
    },
    DENIAL: {
        id: 'DENIAL',
        label: 'Denial Notice',
        subject: 'Determination Regarding Accommodation Request - Case #{{caseNumber}}',
        body: `Dear {{clientName}},

After careful review of your request and the supporting documentation provided, we regret to inform you that we are unable to grant your request for accommodation at this time.

**Reason for Denial:**
{{reason}}

**Appeal Process:**
You have the right to appeal this decision within 10 business days. Please reply to this email or submit a formal appeal through the portal.

Sincerely,
The AccommAlly Coordination Team`
    },
    RFI: {
        id: 'RFI',
        label: 'Request for Information',
        subject: 'Action Required: Additional Information Needed - Case #{{caseNumber}}',
        body: `Dear {{clientName}},

We are currently reviewing your accommodation request (Case #{{caseNumber}}). To proceed with our evaluation, we require additional information or documentation.

**Missing Information:**
{{missingInfo}}

Please provide this information by {{dueDate}} to ensure your request is processed in a timely manner.

Sincerely,
The AccommAlly Coordination Team`
    }
};

export function fillTemplate(templateId: DecisionType, data: Record<string, string>): { subject: string, body: string } {
    const template = DECISION_TEMPLATES[templateId];
    if (!template) throw new Error('Template not found');

    let subject = template.subject;
    let body = template.body;

    // Replace all keys in data
    Object.entries(data).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, value);
        body = body.replace(regex, value);
    });

    return { subject, body };
}
