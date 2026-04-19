# Document Templates Feature — Design Spec
**Date:** 2026-04-08
**Status:** Approved

## Overview

Super admins can upload DOCX files as letter templates per tenant. Templates contain configurable trigger strings that are replaced with case data when a coordinator loads the template into the message portal. The populated HTML becomes the message body, which can be emailed to claimants or healthcare providers.

---

## Section 1: Data Model

### New model: `DocumentTemplate`

```prisma
model DocumentTemplate {
  id               String   @id @default(cuid())
  tenantId         String
  name             String
  description      String?
  originalFile     Bytes
  fileType         String   @default("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
  htmlContent      String
  variableMappings Json     // VariableMapping[]
  createdByAdminId String   // references SuperAdmin.id (no FK — SuperAdmin is not tenant-scoped)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  tenant           Tenant   @relation(fields: [tenantId], references: [id])

  @@index([tenantId])
}
```

### Variable mapping JSON shape

```json
[
  { "trigger": "{ClientName}", "field": "CLAIMANT_NAME" },
  { "trigger": "{LetterDate}", "field": "TODAY_DATE" },
  { "trigger": "{MedDue}",    "field": "MEDICAL_DUE_DATE" },
  { "trigger": "{CaseNum}",   "field": "CASE_NUMBER" }
]
```

**Available `field` enum values** (dropdown options for super admins):
- `CLAIMANT_NAME` — Case.clientName
- `TODAY_DATE` — current date at time of apply
- `MEDICAL_DUE_DATE` — Case.medicalDueDate (new field)
- `CASE_NUMBER` — Case.caseNumber
- `CLAIMANT_EMAIL` — Case.clientEmail

### Built-in accommodation variables (not in mappings JSON — always available)

`{AR1 Type}`, `{AR1 Description}`, `{AR1 Start}`, `{AR1 End}` through `{AR10 Type}`, `{AR10 Description}`, `{AR10 Start}`, `{AR10 End}`

Populated from the case's active accommodations (`lifecycleStatus === 'OPEN'`), sorted by `startDate` ascending, up to 10. Missing rows are replaced with empty strings.

### `Case` model change

Add `medicalDueDate DateTime?` field.

### `Tenant` model change

Add `documentTemplates DocumentTemplate[]` relation.

---

## Section 2: Backend Processing

### New utility: `src/lib/document-templates.ts`

Exports:
- `extractHtmlFromDocx(buffer: Buffer): Promise<string>` — runs `mammoth.convertToHtml({ buffer })`, returns HTML string
- `applyTemplate(htmlContent: string, mappings: VariableMapping[], caseData: CaseWithAccommodations): string` — applies custom mappings then AR1–AR10 built-ins, blanks missing values

### New API routes (super admin — no tenant auth, uses super-admin-auth)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/super-admin/document-templates?tenantId=X` | List templates for a tenant |
| `POST` | `/api/super-admin/document-templates` | Upload DOCX, extract HTML, store template |
| `PUT` | `/api/super-admin/document-templates/[id]` | Update name/description/mappings; optional re-upload |
| `DELETE` | `/api/super-admin/document-templates/[id]` | Delete template |
| `GET` | `/api/super-admin/document-templates/[id]/download` | Download original DOCX |

### New API routes (tenant-scoped — uses requireAuth + tenant check)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/document-templates` | List templates for current tenant (id + name only) |
| `POST` | `/api/document-templates/[id]/apply` | Apply template to a case; returns populated HTML |

### Upload validation
- Accept `.docx` / `application/vnd.openxmlformats-officedocument.wordprocessingml.document` only
- Max file size: 10MB
- Tenant must exist

### Apply logic
1. Verify coordinator belongs to same tenant as template
2. Fetch case + active accommodations
3. Run `applyTemplate()` — custom mappings first, then AR1–AR10
4. Return `{ html: string }`

---

## Section 3: Super Admin UI

### New page: `/super-admin/(authenticated)/tenants/[id]/templates`

Follows existing super-admin dark slate theme and layout patterns.

**Template list view:**
- Table columns: Name, Description, Mappings count, Created date, Actions
- Actions per row: Edit, Download DOCX, Delete
- "New Template" button → opens create form

**Create / Edit form:**
- Name (required text input)
- Description (optional textarea)
- DOCX file upload — `.docx` only; shows current filename when editing
- Variable mappings table:
  - Each row: trigger string text input + field dropdown + delete row button
  - "Add Row" button appends a new empty row
- Built-in AR variables reference panel (read-only, collapsed by default):
  - Lists `{AR1 Type}` through `{AR10 End}` so super admins know what strings to use in their DOCX
- Save button

---

## Section 4: Coordinator UI — Message Portal

### Rich text editor

Replace the existing plain textarea in the message compose area with **TipTap**. TipTap is TypeScript-native, works with Next.js App Router, and supports HTML import/export.

- Install: `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`
- The editor imports and exports HTML strings
- Existing plain-text messages render correctly inside the HTML editor (plain text is valid HTML)

### "Load Template" button

Added to the compose area toolbar.

**Flow:**
1. Coordinator clicks "Load Template"
2. Modal opens — list of tenant templates (name + description)
3. Coordinator selects a template
   - If a case is already linked to the message: auto-uses that case
   - If no case linked: a case search/select field appears first
4. Calls `POST /api/document-templates/[id]/apply` with `caseId`
5. If the compose body already has content: confirmation prompt "Replace current body?"
6. Populated HTML is imported into the TipTap editor
7. Coordinator edits freely before sending

### Message display (inbox / sent view)

- Messages with HTML content rendered with `dangerouslySetInnerHTML`
- All content passed through **DOMPurify** before render to prevent XSS
- Install: `dompurify`, `@types/dompurify`
- Plain-text legacy messages display correctly as-is

### Outbound external emails

- External emails sent as `Content-Type: text/html`
- The email body is the HTML content from `Message.content`

---

## Section 5: Case Page — Medical Due Date

### Schema change
`medicalDueDate DateTime?` added to `Case` model (covered in Section 1).

### Case update endpoint
`PATCH /api/cases/[id]` already exists — add `medicalDueDate` to the accepted fields.

### Claim Summary widget (`CaseDetailPage.tsx`)
- New "Medical Due Date" row added to the summary section
- Renders as an inline date picker (using the existing `react-day-picker` already in the project)
- Displays `MM/DD/YYYY` or "Not set" if null
- Saves on date selection via PATCH to `/api/cases/[id]`

---

## Dependencies to Add

| Package | Purpose |
|---------|---------|
| `mammoth` | DOCX → HTML conversion |
| `@tiptap/react` | Rich text editor (React component) |
| `@tiptap/pm` | TipTap ProseMirror peer dep |
| `@tiptap/starter-kit` | TipTap base extensions (bold, italic, paragraphs, etc.) |
| `dompurify` | Sanitize HTML before rendering in message view |
| `@types/dompurify` | TypeScript types for DOMPurify |

---

## Out of Scope

- PDF template support (DOCX only)
- Template versioning / history
- Per-coordinator template permissions
- Email delivery (currently mock — `notifications.ts` logs to console)
