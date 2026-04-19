# Document Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-tenant DOCX letter templates with configurable variable replacement that coordinators can load into a new HTML-capable message composer.

**Architecture:** Super admins upload DOCX files per-tenant; `mammoth` converts them to HTML at upload time. A pure `applyTemplate()` utility handles string substitution at compose time — custom mappings first, then built-in AR1–AR10 accommodation rows. The message portal's textarea is replaced with TipTap; received messages are sanitized with DOMPurify before render. A new `medicalDueDate` field is added to `Case` with an inline date picker in the Claim Summary widget.

**Tech Stack:** Next.js App Router, Prisma/PostgreSQL, mammoth (DOCX→HTML), TipTap v2 (`@tiptap/react` + `@tiptap/starter-kit`), DOMPurify, date-fns, Jest

---

## File Map

**New files:**
- `src/lib/document-templates.ts` — types + pure `applyTemplate()` utility
- `src/__tests__/document-templates.test.ts` — unit tests
- `src/app/api/super-admin/document-templates/route.ts` — GET list + POST create
- `src/app/api/super-admin/document-templates/[id]/route.ts` — GET + PUT + DELETE
- `src/app/api/super-admin/document-templates/[id]/download/route.ts` — GET download DOCX
- `src/app/api/document-templates/route.ts` — GET list (tenant-scoped)
- `src/app/api/document-templates/[id]/apply/route.ts` — POST apply to case
- `src/app/super-admin/(authenticated)/tenants/[id]/templates/page.tsx` — super admin UI
- `src/components/RichTextEditor.tsx` — TipTap wrapper
- `src/components/modals/LoadTemplateModal.tsx` — template picker modal

**Modified files:**
- `prisma/schema.prisma` — `DocumentTemplate` model, `medicalDueDate` on `Case`, relation on `Tenant`
- `src/app/api/cases/[id]/route.ts` — add `medicalDueDate` to PATCH allowed fields
- `src/app/messages/page.tsx` — replace textarea with RichTextEditor, DOMPurify render, Load Template button
- `src/components/CaseDetailPage.tsx` — Medical Due Date date picker in Claim Summary

---

## Task 1: Install dependencies

**Files:** `package.json`

- [ ] **Step 1: Install runtime packages**

```bash
cd accommally
npm install mammoth @tiptap/react @tiptap/pm @tiptap/starter-kit dompurify
```

- [ ] **Step 2: Install type packages**

```bash
npm install -D @types/dompurify @types/mammoth
```

- [ ] **Step 3: Verify install**

```bash
node -e "require('mammoth'); console.log('mammoth ok')"
```
Expected: `mammoth ok`

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add mammoth, tiptap, and dompurify dependencies"
```

---

## Task 2: Prisma schema changes + migration

**Files:** `prisma/schema.prisma`

- [ ] **Step 1: Add `medicalDueDate` to `Case` model**

Open `prisma/schema.prisma`. Find the `Case` model. Add after the `requestDate` field:

```prisma
  medicalDueDate        DateTime?
```

- [ ] **Step 2: Add `DocumentTemplate` model**

Add this model after the `Document` model (around line 417):

```prisma
/// Letter templates uploaded by super admins, used to populate message bodies
model DocumentTemplate {
  id               String   @id @default(cuid())
  tenantId         String
  name             String
  description      String?
  originalFile     Bytes
  fileType         String   @default("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
  htmlContent      String
  variableMappings Json
  createdByAdminId String
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  tenant           Tenant   @relation(fields: [tenantId], references: [id])

  @@index([tenantId])
}
```

- [ ] **Step 3: Add relation to `Tenant` model**

In the `Tenant` model, add `documentTemplates` to the relations list (alphabetically near `documents`):

```prisma
  documentTemplates     DocumentTemplate[]
```

- [ ] **Step 4: Run migration**

```bash
npx prisma migrate dev --name add_document_templates
```

Expected: Migration created and applied. Prisma client regenerated.

- [ ] **Step 5: Confirm client updated**

```bash
npx prisma generate
```

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add DocumentTemplate model and Case.medicalDueDate"
```

---

## Task 3: `lib/document-templates.ts` utility + tests

**Files:**
- Create: `src/lib/document-templates.ts`
- Create: `src/__tests__/document-templates.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `src/__tests__/document-templates.test.ts`:

```typescript
import { applyTemplate } from '@/lib/document-templates';
import type { VariableMapping, CaseTemplateData } from '@/lib/document-templates';

const baseCaseData: CaseTemplateData = {
    clientName: 'Jane Doe',
    clientEmail: 'jane@example.com',
    caseNumber: 'ACC-2026-001',
    medicalDueDate: new Date(2026, 5, 15), // June 15 2026 local
    accommodations: [],
};

describe('applyTemplate', () => {
    it('replaces a custom trigger with the mapped field value', () => {
        const mappings: VariableMapping[] = [
            { trigger: '{ClientName}', field: 'CLAIMANT_NAME' },
        ];
        const result = applyTemplate('<p>Dear {ClientName},</p>', mappings, baseCaseData);
        expect(result).toBe('<p>Dear Jane Doe,</p>');
    });

    it('replaces all occurrences of the same trigger', () => {
        const mappings: VariableMapping[] = [
            { trigger: '{CaseNum}', field: 'CASE_NUMBER' },
        ];
        const result = applyTemplate('Ref: {CaseNum} — see {CaseNum}', mappings, baseCaseData);
        expect(result).toBe('Ref: ACC-2026-001 — see ACC-2026-001');
    });

    it('leaves trigger as empty string when field value is null', () => {
        const mappings: VariableMapping[] = [
            { trigger: '{MedDue}', field: 'MEDICAL_DUE_DATE' },
        ];
        const noDateCase: CaseTemplateData = { ...baseCaseData, medicalDueDate: null };
        const result = applyTemplate('Due: {MedDue}', mappings, noDateCase);
        expect(result).toBe('Due: ');
    });

    it('leaves trigger as empty string when claimant email is null', () => {
        const mappings: VariableMapping[] = [
            { trigger: '{Email}', field: 'CLAIMANT_EMAIL' },
        ];
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
        const result = applyTemplate(
            '{AR1 Type}, {AR1 Description}, {AR1 Start} through {AR1 End}',
            [],
            caseData
        );
        expect(result).toBe('Remote Work, Work from home 3 days/week, 01/01/2026 through 12/31/2026');
    });

    it('leaves AR fields blank when no accommodation exists for that slot', () => {
        const result = applyTemplate('{AR2 Type}, {AR2 Start}', [], baseCaseData);
        expect(result).toBe(', ');
    });

    it('leaves AR end date blank when accommodation has no end date', () => {
        const caseData: CaseTemplateData = {
            ...baseCaseData,
            accommodations: [{
                type: 'Equipment',
                description: 'Standing desk',
                startDate: new Date(2026, 0, 1),
                endDate: null,
                lifecycleStatus: 'OPEN',
            }],
        };
        const result = applyTemplate('{AR1 Start} through {AR1 End}', [], caseData);
        expect(result).toBe('01/01/2026 through ');
    });

    it('skips accommodations that are not OPEN', () => {
        const caseData: CaseTemplateData = {
            ...baseCaseData,
            accommodations: [{
                type: 'Equipment',
                description: 'Standing desk',
                startDate: new Date(2026, 0, 1),
                endDate: null,
                lifecycleStatus: 'CLOSED',
            }],
        };
        const result = applyTemplate('{AR1 Type}', [], caseData);
        expect(result).toBe('');
    });

    it('sorts active accommodations by startDate ascending for AR slots', () => {
        const caseData: CaseTemplateData = {
            ...baseCaseData,
            accommodations: [
                {
                    type: 'Equipment',
                    description: 'B',
                    startDate: new Date(2026, 5, 1),
                    endDate: null,
                    lifecycleStatus: 'OPEN',
                },
                {
                    type: 'Remote Work',
                    description: 'A',
                    startDate: new Date(2026, 0, 1),
                    endDate: null,
                    lifecycleStatus: 'OPEN',
                },
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd accommally
npx jest document-templates --no-coverage
```

Expected: FAIL — `Cannot find module '@/lib/document-templates'`

- [ ] **Step 3: Create `src/lib/document-templates.ts`**

```typescript
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
 * Custom mappings are applied first, then built-in AR1–AR10 accommodation slots.
 * Missing values are replaced with empty strings.
 */
export function applyTemplate(
    htmlContent: string,
    mappings: VariableMapping[],
    caseData: CaseTemplateData
): string {
    let result = htmlContent;

    // Apply custom variable mappings
    for (const mapping of mappings) {
        const value = resolveField(mapping.field, caseData);
        result = result.split(mapping.trigger).join(value);
    }

    // Apply built-in AR1–AR10 accommodation variables
    const activeAccommodations = caseData.accommodations
        .filter(a => a.lifecycleStatus === 'OPEN')
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
        .slice(0, 10);

    for (let i = 0; i < 10; i++) {
        const acc = activeAccommodations[i];
        const n = i + 1;
        result = result.split(`{AR${n} Type}`).join(acc?.type ?? '');
        result = result.split(`{AR${n} Description}`).join(acc?.description ?? '');
        result = result.split(`{AR${n} Start}`).join(
            acc ? format(acc.startDate, 'MM/dd/yyyy') : ''
        );
        result = result.split(`{AR${n} End}`).join(
            acc?.endDate ? format(acc.endDate, 'MM/dd/yyyy') : ''
        );
    }

    return result;
}

function resolveField(field: TemplateField, caseData: CaseTemplateData): string {
    switch (field) {
        case 'CLAIMANT_NAME':
            return caseData.clientName;
        case 'TODAY_DATE':
            return format(new Date(), 'MM/dd/yyyy');
        case 'MEDICAL_DUE_DATE':
            return caseData.medicalDueDate ? format(caseData.medicalDueDate, 'MM/dd/yyyy') : '';
        case 'CASE_NUMBER':
            return caseData.caseNumber;
        case 'CLAIMANT_EMAIL':
            return caseData.clientEmail ?? '';
    }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest document-templates --no-coverage
```

Expected: All 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/document-templates.ts src/__tests__/document-templates.test.ts
git commit -m "feat: add document template variable substitution utility"
```

---

## Task 4: Super admin API — list and create

**Files:**
- Create: `src/app/api/super-admin/document-templates/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSuperAdminSession } from '@/lib/super-admin-auth';
import { cookies } from 'next/headers';
import mammoth from 'mammoth';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

async function requireSuperAdmin() {
    const cookieStore = await cookies();
    const token = cookieStore.get('super_admin_token')?.value;
    const session = await getSuperAdminSession(token);
    if (!session) return null;
    const admin = await prisma.superAdmin.findUnique({
        where: { id: session.id },
        select: { id: true, active: true },
    });
    return admin?.active ? session : null;
}

/**
 * GET /api/super-admin/document-templates?tenantId=X
 * List all templates for a tenant (no file data returned).
 */
export async function GET(request: NextRequest) {
    try {
        const session = await requireSuperAdmin();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tenantId = new URL(request.url).searchParams.get('tenantId');
        if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 });

        const templates = await prisma.documentTemplate.findMany({
            where: { tenantId },
            select: {
                id: true,
                name: true,
                description: true,
                variableMappings: true,
                createdByAdminId: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ templates });
    } catch (err) {
        console.error('GET document-templates error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST /api/super-admin/document-templates
 * Upload a DOCX, extract HTML, store template.
 * Body: multipart/form-data — file, tenantId, name, description?, variableMappings (JSON string)
 */
export async function POST(request: NextRequest) {
    try {
        const session = await requireSuperAdmin();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const tenantId = formData.get('tenantId') as string | null;
        const name = formData.get('name') as string | null;
        const description = formData.get('description') as string | null;
        const mappingsRaw = formData.get('variableMappings') as string | null;

        if (!file || !tenantId || !name) {
            return NextResponse.json({ error: 'file, tenantId, and name are required' }, { status: 400 });
        }

        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'File too large. Maximum 10MB.' }, { status: 400 });
        }

        const ext = file.name.split('.').pop()?.toLowerCase();
        if (file.type !== DOCX_MIME && ext !== 'docx') {
            return NextResponse.json({ error: 'Only .docx files are accepted.' }, { status: 400 });
        }

        const tenantExists = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
        if (!tenantExists) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

        const buffer = Buffer.from(await file.arrayBuffer());
        const { value: htmlContent } = await mammoth.convertToHtml({ buffer });

        let variableMappings: unknown = [];
        try {
            variableMappings = mappingsRaw ? JSON.parse(mappingsRaw) : [];
        } catch {
            return NextResponse.json({ error: 'variableMappings must be valid JSON' }, { status: 400 });
        }

        const template = await prisma.documentTemplate.create({
            data: {
                tenantId,
                name,
                description: description || null,
                originalFile: buffer,
                htmlContent,
                variableMappings,
                createdByAdminId: session.id,
            },
            select: {
                id: true,
                name: true,
                description: true,
                variableMappings: true,
                createdAt: true,
            },
        });

        return NextResponse.json({ template }, { status: 201 });
    } catch (err) {
        console.error('POST document-templates error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
```

- [ ] **Step 2: Smoke-test that the route compiles**

```bash
npx tsc --noEmit
```

Expected: No errors related to `document-templates/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/super-admin/document-templates/route.ts
git commit -m "feat: super admin API to list and create document templates"
```

---

## Task 5: Super admin API — get, update, delete, download

**Files:**
- Create: `src/app/api/super-admin/document-templates/[id]/route.ts`
- Create: `src/app/api/super-admin/document-templates/[id]/download/route.ts`

- [ ] **Step 1: Create `[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSuperAdminSession } from '@/lib/super-admin-auth';
import { cookies } from 'next/headers';
import mammoth from 'mammoth';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MAX_SIZE = 10 * 1024 * 1024;

async function requireSuperAdmin() {
    const cookieStore = await cookies();
    const token = cookieStore.get('super_admin_token')?.value;
    const session = await getSuperAdminSession(token);
    if (!session) return null;
    const admin = await prisma.superAdmin.findUnique({
        where: { id: session.id },
        select: { id: true, active: true },
    });
    return admin?.active ? session : null;
}

/**
 * GET /api/super-admin/document-templates/[id]
 * Returns template metadata (no file data).
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await requireSuperAdmin();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const template = await prisma.documentTemplate.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                description: true,
                variableMappings: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json({ template });
    } catch (err) {
        console.error('GET document-template error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * PUT /api/super-admin/document-templates/[id]
 * Update name, description, mappings. Optional file re-upload.
 * Body: multipart/form-data
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await requireSuperAdmin();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const existing = await prisma.documentTemplate.findUnique({ where: { id }, select: { id: true } });
        if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const formData = await request.formData();
        const name = formData.get('name') as string | null;
        const description = formData.get('description') as string | null;
        const mappingsRaw = formData.get('variableMappings') as string | null;
        const file = formData.get('file') as File | null;

        const updateData: Record<string, unknown> = {};
        if (name) updateData.name = name;
        if (description !== null) updateData.description = description || null;
        if (mappingsRaw) {
            try {
                updateData.variableMappings = JSON.parse(mappingsRaw);
            } catch {
                return NextResponse.json({ error: 'variableMappings must be valid JSON' }, { status: 400 });
            }
        }

        if (file) {
            if (file.size > MAX_SIZE) {
                return NextResponse.json({ error: 'File too large. Maximum 10MB.' }, { status: 400 });
            }
            const ext = file.name.split('.').pop()?.toLowerCase();
            if (file.type !== DOCX_MIME && ext !== 'docx') {
                return NextResponse.json({ error: 'Only .docx files are accepted.' }, { status: 400 });
            }
            const buffer = Buffer.from(await file.arrayBuffer());
            const { value: htmlContent } = await mammoth.convertToHtml({ buffer });
            updateData.originalFile = buffer;
            updateData.htmlContent = htmlContent;
        }

        const template = await prisma.documentTemplate.update({
            where: { id },
            data: updateData,
            select: { id: true, name: true, description: true, variableMappings: true, updatedAt: true },
        });

        return NextResponse.json({ template });
    } catch (err) {
        console.error('PUT document-template error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * DELETE /api/super-admin/document-templates/[id]
 */
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await requireSuperAdmin();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const existing = await prisma.documentTemplate.findUnique({ where: { id }, select: { id: true } });
        if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        await prisma.documentTemplate.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('DELETE document-template error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
```

- [ ] **Step 2: Create `[id]/download/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSuperAdminSession } from '@/lib/super-admin-auth';
import { cookies } from 'next/headers';

async function requireSuperAdmin() {
    const cookieStore = await cookies();
    const token = cookieStore.get('super_admin_token')?.value;
    const session = await getSuperAdminSession(token);
    if (!session) return null;
    const admin = await prisma.superAdmin.findUnique({
        where: { id: session.id },
        select: { id: true, active: true },
    });
    return admin?.active ? session : null;
}

/**
 * GET /api/super-admin/document-templates/[id]/download
 * Returns the original DOCX file as a download.
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await requireSuperAdmin();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const template = await prisma.documentTemplate.findUnique({
            where: { id },
            select: { name: true, originalFile: true },
        });

        if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const safeName = template.name.replace(/[^a-zA-Z0-9-_]/g, '_');
        return new NextResponse(template.originalFile, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="${safeName}.docx"`,
            },
        });
    } catch (err) {
        console.error('Download document-template error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
```

- [ ] **Step 3: Check types compile**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/super-admin/document-templates/
git commit -m "feat: super admin API to get, update, delete, and download templates"
```

---

## Task 6: Tenant-scoped API routes

**Files:**
- Create: `src/app/api/document-templates/route.ts`
- Create: `src/app/api/document-templates/[id]/apply/route.ts`

- [ ] **Step 1: Create `src/app/api/document-templates/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';

/**
 * GET /api/document-templates
 * Returns template names/ids for the current tenant. No file data.
 */
export async function GET() {
    try {
        const { session, error } = await requireAuth();
        if (error) return error;

        const tenantPrisma = withTenantScope(prisma, session.tenantId);

        const templates = await tenantPrisma.documentTemplate.findMany({
            select: { id: true, name: true, description: true },
            orderBy: { name: 'asc' },
        });

        return NextResponse.json({ templates });
    } catch (err) {
        console.error('GET /api/document-templates error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
```

- [ ] **Step 2: Create `src/app/api/document-templates/[id]/apply/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import { applyTemplate } from '@/lib/document-templates';
import type { VariableMapping, CaseTemplateData } from '@/lib/document-templates';

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
            accommodations: caseData.accommodations.map(a => ({
                type: a.type,
                description: a.description,
                startDate: a.startDate,
                endDate: a.endDate,
                lifecycleStatus: a.lifecycleStatus,
            })),
        };

        const mappings = template.variableMappings as VariableMapping[];
        const html = applyTemplate(template.htmlContent, mappings, templateData);

        return NextResponse.json({ html });
    } catch (err) {
        console.error('POST /api/document-templates/[id]/apply error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
```

- [ ] **Step 3: Check types compile**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/document-templates/
git commit -m "feat: tenant-scoped API to list and apply document templates"
```

---

## Task 7: Add `medicalDueDate` to PATCH /api/cases/[id]

**Files:**
- Modify: `src/app/api/cases/[id]/route.ts`

- [ ] **Step 1: Add `medicalDueDate` to the PATCH allowed fields**

In `src/app/api/cases/[id]/route.ts`, find the `PATCH` handler (line ~147). The `data` object currently ends with:

```typescript
                ...(body.clientId && { clientId: body.clientId }),
```

Add after it:

```typescript
                ...(body.medicalDueDate !== undefined && {
                    medicalDueDate: body.medicalDueDate ? new Date(body.medicalDueDate) : null,
                }),
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cases/[id]/route.ts
git commit -m "feat: allow medicalDueDate updates via PATCH /api/cases/[id]"
```

---

## Task 8: Super admin UI — Templates page

**Files:**
- Create: `src/app/super-admin/(authenticated)/tenants/[id]/templates/page.tsx`

- [ ] **Step 1: Create the templates page**

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Trash2, Download, Edit2, Plus, X, ChevronDown, ChevronRight } from 'lucide-react';
import {
    TEMPLATE_FIELDS,
    TEMPLATE_FIELD_LABELS,
} from '@/lib/document-templates';
import type { TemplateField, VariableMapping } from '@/lib/document-templates';

interface Template {
    id: string;
    name: string;
    description: string | null;
    variableMappings: VariableMapping[];
    createdAt: string;
}

const AR_REFERENCE = Array.from({ length: 10 }, (_, i) => i + 1).flatMap(n => [
    `{AR${n} Type}`,
    `{AR${n} Description}`,
    `{AR${n} Start}`,
    `{AR${n} End}`,
]);

export default function TemplatesPage() {
    const params = useParams();
    const tenantId = params.id as string;

    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [arExpanded, setArExpanded] = useState(false);

    // Form state
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formFile, setFormFile] = useState<File | null>(null);
    const [formMappings, setFormMappings] = useState<VariableMapping[]>([]);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/super-admin/document-templates?tenantId=${tenantId}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setTemplates(data.templates);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load templates');
        } finally {
            setLoading(false);
        }
    }, [tenantId]);

    useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

    function openCreate() {
        setEditingTemplate(null);
        setFormName('');
        setFormDescription('');
        setFormFile(null);
        setFormMappings([]);
        setFormError('');
        setShowForm(true);
    }

    function openEdit(t: Template) {
        setEditingTemplate(t);
        setFormName(t.name);
        setFormDescription(t.description ?? '');
        setFormFile(null);
        setFormMappings(t.variableMappings ?? []);
        setFormError('');
        setShowForm(true);
    }

    async function handleSave() {
        if (!formName.trim()) { setFormError('Name is required.'); return; }
        if (!editingTemplate && !formFile) { setFormError('A .docx file is required.'); return; }

        setSaving(true);
        setFormError('');
        try {
            const fd = new FormData();
            fd.append('name', formName.trim());
            fd.append('description', formDescription.trim());
            fd.append('variableMappings', JSON.stringify(formMappings));
            fd.append('tenantId', tenantId);
            if (formFile) fd.append('file', formFile);

            const url = editingTemplate
                ? `/api/super-admin/document-templates/${editingTemplate.id}`
                : '/api/super-admin/document-templates';
            const method = editingTemplate ? 'PUT' : 'POST';

            const res = await fetch(url, { method, body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setShowForm(false);
            fetchTemplates();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Save failed');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id: string, name: string) {
        if (!confirm(`Delete template "${name}"? This cannot be undone.`)) return;
        try {
            const res = await fetch(`/api/super-admin/document-templates/${id}`, { method: 'DELETE' });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
            fetchTemplates();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Delete failed');
        }
    }

    function addMappingRow() {
        setFormMappings(prev => [...prev, { trigger: '', field: 'CLAIMANT_NAME' }]);
    }

    function updateMapping(index: number, key: keyof VariableMapping, value: string) {
        setFormMappings(prev => prev.map((m, i) => i === index ? { ...m, [key]: value } : m));
    }

    function removeMapping(index: number) {
        setFormMappings(prev => prev.filter((_, i) => i !== index));
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Link href={`/super-admin/tenants/${tenantId}`} className="text-sm text-slate-400 hover:text-slate-200 mb-1 block">
                        ← Back to Tenant
                    </Link>
                    <h1 className="text-2xl font-bold text-white">Letter Templates</h1>
                    <p className="text-slate-400 text-sm mt-1">DOCX templates with variable substitution for coordinators.</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg font-medium text-sm"
                >
                    <Plus className="w-4 h-4" /> New Template
                </button>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            {/* Template list */}
            {templates.length === 0 ? (
                <div className="text-center py-12 text-slate-400">No templates yet. Upload a .docx file to get started.</div>
            ) : (
                <div className="bg-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                                <th className="text-left p-4">Name</th>
                                <th className="text-left p-4">Mappings</th>
                                <th className="text-left p-4">Created</th>
                                <th className="p-4" />
                            </tr>
                        </thead>
                        <tbody>
                            {templates.map(t => (
                                <tr key={t.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                                    <td className="p-4">
                                        <p className="font-medium text-white">{t.name}</p>
                                        {t.description && <p className="text-slate-400 text-xs mt-0.5">{t.description}</p>}
                                    </td>
                                    <td className="p-4 text-slate-300">{t.variableMappings?.length ?? 0} custom</td>
                                    <td className="p-4 text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 justify-end">
                                            <a
                                                href={`/api/super-admin/document-templates/${t.id}/download`}
                                                className="p-1.5 text-slate-400 hover:text-white"
                                                title="Download DOCX"
                                            >
                                                <Download className="w-4 h-4" />
                                            </a>
                                            <button onClick={() => openEdit(t)} className="p-1.5 text-slate-400 hover:text-white" title="Edit">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(t.id, t.name)} className="p-1.5 text-slate-400 hover:text-red-400" title="Delete">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create / Edit Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-700">
                            <h2 className="text-lg font-bold text-white">
                                {editingTemplate ? 'Edit Template' : 'New Template'}
                            </h2>
                            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {formError && <p className="text-red-400 text-sm">{formError}</p>}

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Name *</label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={e => setFormName(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                                    placeholder="e.g. Approval Letter"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                                <textarea
                                    value={formDescription}
                                    onChange={e => setFormDescription(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm resize-none h-20"
                                    placeholder="Optional description"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    DOCX File {editingTemplate ? '(leave empty to keep current)' : '*'}
                                </label>
                                <input
                                    type="file"
                                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                    onChange={e => setFormFile(e.target.files?.[0] ?? null)}
                                    className="w-full text-sm text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-indigo-700 file:text-white file:text-sm"
                                />
                            </div>

                            {/* Variable Mappings */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-slate-300">Variable Mappings</label>
                                    <button
                                        type="button"
                                        onClick={addMappingRow}
                                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" /> Add Row
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {formMappings.map((m, i) => (
                                        <div key={i} className="flex gap-2 items-center">
                                            <input
                                                type="text"
                                                value={m.trigger}
                                                onChange={e => updateMapping(i, 'trigger', e.target.value)}
                                                placeholder="{TriggerString}"
                                                className="flex-1 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm font-mono"
                                            />
                                            <select
                                                value={m.field}
                                                onChange={e => updateMapping(i, 'field', e.target.value as TemplateField)}
                                                className="flex-1 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                                            >
                                                {TEMPLATE_FIELDS.map(f => (
                                                    <option key={f} value={f}>{TEMPLATE_FIELD_LABELS[f]}</option>
                                                ))}
                                            </select>
                                            <button onClick={() => removeMapping(i)} className="text-slate-400 hover:text-red-400">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {formMappings.length === 0 && (
                                        <p className="text-slate-500 text-xs">No custom mappings. AR1–AR10 built-ins are always available.</p>
                                    )}
                                </div>
                            </div>

                            {/* AR Reference Panel */}
                            <div className="border border-slate-700 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setArExpanded(v => !v)}
                                    className="w-full flex items-center justify-between p-3 text-sm text-slate-400 hover:text-slate-200"
                                >
                                    <span>Built-in accommodation variables (AR1–AR10)</span>
                                    {arExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                                {arExpanded && (
                                    <div className="px-3 pb-3 grid grid-cols-2 gap-1">
                                        {AR_REFERENCE.map(v => (
                                            <code key={v} className="text-xs text-indigo-300 font-mono bg-slate-900 px-2 py-0.5 rounded">{v}</code>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
                            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-400 hover:text-white text-sm">
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                            >
                                {saving ? 'Saving…' : 'Save Template'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/super-admin/
git commit -m "feat: super admin templates management page"
```

---

## Task 9: RichTextEditor component

**Files:**
- Create: `src/components/RichTextEditor.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
    className?: string;
    minHeight?: string;
}

export function RichTextEditor({
    content,
    onChange,
    placeholder = 'Write your message…',
    className,
    minHeight = '12rem',
}: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [StarterKit],
        content,
        editorProps: {
            attributes: {
                class: 'outline-none prose prose-sm dark:prose-invert max-w-none p-3 text-sm',
                'data-placeholder': placeholder,
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    // Sync content when parent updates it (e.g. template loaded)
    useEffect(() => {
        if (!editor) return;
        const current = editor.getHTML();
        if (content !== current) {
            editor.commands.setContent(content, false);
        }
    }, [content, editor]);

    return (
        <div
            className={cn(
                'border border-gray-200 dark:border-gray-700 rounded-lg overflow-y-auto dark:bg-gray-800',
                className
            )}
            style={{ minHeight }}
        >
            <EditorContent editor={editor} />
        </div>
    );
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/RichTextEditor.tsx
git commit -m "feat: TipTap RichTextEditor component"
```

---

## Task 10: LoadTemplateModal component

**Files:**
- Create: `src/components/modals/LoadTemplateModal.tsx`

- [ ] **Step 1: Create the modal**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { X, FileText } from 'lucide-react';

interface Template {
    id: string;
    name: string;
    description: string | null;
}

interface Case {
    id: string;
    caseNumber: string;
    clientName?: string;
}

interface LoadTemplateModalProps {
    onClose: () => void;
    onLoad: (html: string) => void;
    linkedCaseId?: string;
    cases: Case[];
}

export function LoadTemplateModal({ onClose, onLoad, linkedCaseId, cases }: LoadTemplateModalProps) {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(true);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [selectedCaseId, setSelectedCaseId] = useState(linkedCaseId ?? '');
    const [applying, setApplying] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/document-templates')
            .then(r => r.json())
            .then(d => setTemplates(d.templates ?? []))
            .catch(() => setError('Failed to load templates'))
            .finally(() => setLoadingTemplates(false));
    }, []);

    async function handleLoad() {
        if (!selectedTemplateId) { setError('Select a template.'); return; }
        if (!selectedCaseId) { setError('Select a case to populate the variables.'); return; }

        setApplying(true);
        setError('');
        try {
            const res = await fetch(`/api/document-templates/${selectedTemplateId}/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ caseId: selectedCaseId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            onLoad(data.html);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to apply template');
        } finally {
            setApplying(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-md shadow-xl">
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Load Template
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Template</label>
                        {loadingTemplates ? (
                            <p className="text-sm text-gray-400">Loading…</p>
                        ) : templates.length === 0 ? (
                            <p className="text-sm text-gray-400">No templates available for this account.</p>
                        ) : (
                            <select
                                value={selectedTemplateId}
                                onChange={e => setSelectedTemplateId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm dark:bg-gray-800 dark:text-white"
                            >
                                <option value="">Select a template…</option>
                                {templates.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        )}
                        {selectedTemplateId && templates.find(t => t.id === selectedTemplateId)?.description && (
                            <p className="text-xs text-gray-400 mt-1">
                                {templates.find(t => t.id === selectedTemplateId)!.description}
                            </p>
                        )}
                    </div>

                    {!linkedCaseId && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Case</label>
                            <select
                                value={selectedCaseId}
                                onChange={e => setSelectedCaseId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm dark:bg-gray-800 dark:text-white"
                            >
                                <option value="">Select a case…</option>
                                {cases.map(c => (
                                    <option key={c.id} value={c.id}>{c.caseNumber}{c.clientName ? ` — ${c.clientName}` : ''}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-sm">
                        Cancel
                    </button>
                    <button
                        onClick={handleLoad}
                        disabled={applying || loadingTemplates}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                        {applying ? 'Loading…' : 'Load Template'}
                    </button>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/modals/LoadTemplateModal.tsx
git commit -m "feat: LoadTemplateModal component for message compose"
```

---

## Task 11: Update messages page — HTML editor + DOMPurify + Load Template

**Files:**
- Modify: `src/app/messages/page.tsx`

The changes are spread across two areas of this large file: (1) message body rendering and (2) the `ComposeView` component.

- [ ] **Step 1: Add imports at the top of `src/app/messages/page.tsx`**

Find the existing import block at the top of the file. Add these imports:

```typescript
import DOMPurify from 'dompurify';
import { RichTextEditor } from '@/components/RichTextEditor';
import { LoadTemplateModal } from '@/components/modals/LoadTemplateModal';
import { FileText } from 'lucide-react';
```

Note: `FileText` may already be imported from `lucide-react` — if so, just add it to the existing lucide import line.

- [ ] **Step 2: Replace the message body render (around line 900)**

Find this block in the message detail render:

```typescript
                {/* Body */}
                <div className="p-6">
                    <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
                        {message.body}
                    </div>
                </div>
```

Replace with:

```typescript
                {/* Body */}
                <div className="p-6">
                    <div
                        className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{
                            __html: typeof window !== 'undefined'
                                ? DOMPurify.sanitize(message.body)
                                : message.body,
                        }}
                    />
                </div>
```

- [ ] **Step 3: Update `ComposeView` to accept `cases` and add template state**

Find the `ComposeView` function signature (around line 921). It currently does NOT receive `cases` as a prop — but `cases` is already available at the parent level. Add it to the destructured props and the interface:

```typescript
// In the interface (around line 930):
    cases: Case[];

// In the function destructure (around line 921):
function ComposeView({
    mode,
    data,
    users,
    cases,
    currentUserId,
    onChange,
    onSend,
    onClose
}: { ...
```

Then inside `ComposeView`, add state for the template modal just after the existing `filteredUsers` line:

```typescript
    const [showTemplateModal, setShowTemplateModal] = useState(false);

    function handleTemplateLoad(html: string) {
        if (data.body && !confirm('Replace the current message body with the template?')) return;
        onChange({ ...data, body: html });
    }
```

- [ ] **Step 4: Replace the textarea with RichTextEditor + Load Template button**

Find the message textarea block (around line 1032–1040):

```typescript
                <div>
                    <label className="block text-xs font-medium mb-1 text-gray-500">Message</label>
                    <textarea
                        value={data.body}
                        onChange={e => onChange({ ...data, body: e.target.value })}
                        placeholder="Write your message..."
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 h-48 text-sm resize-none"
                    />
                </div>
```

Replace with:

```typescript
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-gray-500">Message</label>
                        <button
                            type="button"
                            onClick={() => setShowTemplateModal(true)}
                            className="text-xs text-indigo-500 hover:text-indigo-400 flex items-center gap-1"
                        >
                            <FileText className="w-3 h-3" /> Load Template
                        </button>
                    </div>
                    <RichTextEditor
                        content={data.body}
                        onChange={body => onChange({ ...data, body })}
                        placeholder="Write your message..."
                        minHeight="12rem"
                    />
                    {showTemplateModal && (
                        <LoadTemplateModal
                            onClose={() => setShowTemplateModal(false)}
                            onLoad={handleTemplateLoad}
                            linkedCaseId={data.caseId || undefined}
                            cases={cases}
                        />
                    )}
                </div>
```

- [ ] **Step 5: Verify the `cases` prop is passed at the call site**

Search for `<ComposeView` in the file (around line 703 based on the grep). Confirm `cases={cases}` is already passed (it was visible in the grep output). If it is not, add it.

- [ ] **Step 6: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/messages/page.tsx
git commit -m "feat: HTML message compose with TipTap editor and Load Template support"
```

---

## Task 12: Case page — Medical Due Date field

**Files:**
- Modify: `src/components/CaseDetailPage.tsx`

- [ ] **Step 1: Add `medicalDueDate` to the case data type in `CaseDetailPage.tsx`**

Find the type/interface for `caseData` props near the top of `CaseDetailPage.tsx` (around line 98 where `preferredStartDate` is defined). Add:

```typescript
    medicalDueDate?: string | null;
```

- [ ] **Step 2: Add state and save handler for medical due date**

Find the top of the `CaseDetailPage` component function. Add state after the existing state declarations:

```typescript
    const [medicalDueDate, setMedicalDueDate] = useState<string>(
        caseData.medicalDueDate ? caseData.medicalDueDate.toString().split('T')[0] : ''
    );
    const [savingMedDue, setSavingMedDue] = useState(false);

    async function saveMedicalDueDate(value: string) {
        setSavingMedDue(true);
        try {
            await fetch(`/api/cases/${caseData.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ medicalDueDate: value || null }),
            });
            setMedicalDueDate(value);
        } finally {
            setSavingMedDue(false);
        }
    }
```

- [ ] **Step 3: Add the Medical Due Date row to the Claim Summary widget**

Find this block in the Claim Summary section (around line 910):

```typescript
                                    {caseData.preferredStartDate && (
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Preferred Start Date</dt>
                                            <dd className="mt-1 text-sm text-gray-900 dark:text-white">{caseData.preferredStartDate}</dd>
                                        </div>
                                    )}
```

Add the Medical Due Date field immediately after it:

```typescript
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Medical Due Date</dt>
                                        <dd className="mt-1">
                                            <input
                                                type="date"
                                                value={medicalDueDate}
                                                onChange={e => saveMedicalDueDate(e.target.value)}
                                                disabled={savingMedDue}
                                                className="text-sm text-gray-900 dark:text-white bg-transparent border border-gray-200 dark:border-gray-700 rounded px-2 py-0.5 disabled:opacity-50"
                                            />
                                        </dd>
                                    </div>
```

- [ ] **Step 4: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Run all tests**

```bash
npx jest --no-coverage --forceExit
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/CaseDetailPage.tsx
git commit -m "feat: medical due date field in case claim summary"
```

---

## Final verification

- [ ] Start the dev server and verify no runtime errors:

```bash
npm run dev
```

Expected: Server starts with no build errors. Navigate to `/messages` — compose area shows TipTap editor with "Load Template" button. Navigate to `/super-admin/tenants/[id]/templates` — templates page renders. Open a case — Medical Due Date date picker appears in the Claim Summary.
