# Annotation Comments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken `Annotation` model with a unified `AnnotationComment` system supporting PDF highlights, email text selection highlights, document/email-level notes, threaded replies, 24-hour edit window, and soft delete.

**Architecture:** A single `AnnotationComment` Prisma model covers all annotation types (PDF highlight, email highlight, document note, email note) with nullable fields for type-specific geometry. Two sets of API routes (one under `/api/documents/[id]/annotation-comments/`, one under `/api/messages/[id]/annotation-comments/`) share the same logic shape. A shared `AnnotationThreadPanel` component is embedded in both `DocumentViewer` and the messages page.

**Tech Stack:** Next.js 16 App Router, Prisma 7 + PostgreSQL, TypeScript, Tailwind CSS 4, Lucide React, React 19, Jest 30 + ts-jest.

---

## File Map

**Create:**
- `src/app/api/documents/[id]/annotation-comments/route.ts` — GET (list tree), POST (create root)
- `src/app/api/documents/[id]/annotation-comments/[cid]/route.ts` — PATCH (edit), DELETE (soft delete)
- `src/app/api/documents/[id]/annotation-comments/[cid]/replies/route.ts` — POST (add reply)
- `src/app/api/messages/[id]/annotation-comments/route.ts` — GET, POST
- `src/app/api/messages/[id]/annotation-comments/[cid]/route.ts` — PATCH, DELETE
- `src/app/api/messages/[id]/annotation-comments/[cid]/replies/route.ts` — POST
- `src/components/AnnotationThreadPanel.tsx` — shared slide-in thread panel
- `src/__tests__/annotation-comments.test.ts` — API route tests

**Modify:**
- `prisma/schema.prisma` — drop Annotation, add AnnotationCommentType enum + AnnotationComment model, update Tenant/User/Document/Message models
- `src/lib/prisma-tenant.ts` — replace `'annotation'` with `'annotationComment'` in TENANT_SCOPED_MODELS
- `src/components/DocumentViewer.tsx` — replace broken annotation logic, integrate AnnotationThreadPanel
- `src/app/messages/page.tsx` — add email text selection highlights, email-level notes, integrate AnnotationThreadPanel

**Delete:**
- `src/app/api/documents/[id]/annotations/route.ts`

---

## Task 1: Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Replace the Annotation model with AnnotationCommentType enum and AnnotationComment model**

In `prisma/schema.prisma`, make these changes:

**1a. In the `Tenant` model**, replace:
```
  annotations           Annotation[]
```
with:
```
  annotationComments    AnnotationComment[]
```

**1b. In the `User` model**, replace:
```
  annotations            Annotation[]
```
with:
```
  annotationComments     AnnotationComment[]
```

**1c. In the `Document` model**, replace:
```
  annotations           Annotation[]
```
with:
```
  annotationComments    AnnotationComment[]
```

**1d. In the `Message` model**, after `attachments MessageAttachment[]` add:
```
  annotationComments    AnnotationComment[]
```

**1e. Delete the entire `Annotation` model block** (the block starting with `/// Persistent annotations/highlights on Documents` through its closing `}`).

**1f. After the `DocumentTemplate` model block, add:**
```prisma
enum AnnotationCommentType {
  HIGHLIGHT_PDF
  HIGHLIGHT_EMAIL
  DOCUMENT_NOTE
  EMAIL_NOTE
}

/// Unified annotation comments for documents and messages
model AnnotationComment {
  id         String                @id @default(cuid())
  tenantId   String
  tenant     Tenant                @relation(fields: [tenantId], references: [id])

  documentId String?
  document   Document?             @relation(fields: [documentId], references: [id], onDelete: Cascade)

  messageId  String?
  message    Message?              @relation(fields: [messageId], references: [id], onDelete: Cascade)

  parentId   String?
  parent     AnnotationComment?    @relation("Replies", fields: [parentId], references: [id])
  replies    AnnotationComment[]   @relation("Replies")

  type       AnnotationCommentType

  content    String
  deletedAt  DateTime?

  // Highlight color — applies to HIGHLIGHT_PDF and HIGHLIGHT_EMAIL (null for notes)
  color      String?               @default("#FFFF00")

  // PDF highlight geometry fields (null for email highlights and notes)
  pageNumber Int?
  x          Float?
  y          Float?
  width      Float?
  height     Float?

  // Email text selection fields (null for PDF highlights and notes)
  selectedText   String?
  selectionStart Int?
  selectionEnd   Int?

  createdById String
  createdBy   User                 @relation(fields: [createdById], references: [id])
  createdAt   DateTime             @default(now())
  updatedAt   DateTime             @updatedAt

  @@index([tenantId, documentId])
  @@index([tenantId, messageId])
  @@index([tenantId, createdById])
}
```

- [ ] **Step 2: Run the migration**

```bash
cd accommally
npx prisma migrate dev --name replace_annotation_with_annotation_comment
```

Expected output: `Your database is now in sync with your schema.`

- [ ] **Step 3: Verify Prisma client generated**

```bash
npx prisma generate
```

Expected: `✔ Generated Prisma Client` with no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: replace Annotation with AnnotationComment model"
```

---

## Task 2: Update Tenant Scoping

**Files:**
- Modify: `src/lib/prisma-tenant.ts`

- [ ] **Step 1: Replace `annotation` with `annotationComment` in TENANT_SCOPED_MODELS**

In `src/lib/prisma-tenant.ts`, in the `TENANT_SCOPED_MODELS` array, replace:
```typescript
  'annotation',
```
with:
```typescript
  'annotationComment',
```

- [ ] **Step 2: Verify the build compiles**

```bash
npx tsc --noEmit
```

Expected: no errors (or only pre-existing errors unrelated to this change).

- [ ] **Step 3: Commit**

```bash
git add src/lib/prisma-tenant.ts
git commit -m "chore: update tenant scoping for annotationComment model"
```

---

## Task 3: Delete the Old Annotations Route

**Files:**
- Delete: `src/app/api/documents/[id]/annotations/route.ts`

- [ ] **Step 1: Delete the file**

```bash
rm src/app/api/documents/[id]/annotations/route.ts
```

- [ ] **Step 2: Commit**

```bash
git add -A src/app/api/documents/[id]/annotations/
git commit -m "chore: remove broken annotations API route"
```

---

## Task 4: Document Annotation-Comments — GET and POST

**Files:**
- Create: `src/app/api/documents/[id]/annotation-comments/route.ts`

- [ ] **Step 1: Write the failing test for GET and POST**

In `src/__tests__/annotation-comments.test.ts`, create the file with:

```typescript
/**
 * Tests for /api/documents/[id]/annotation-comments and
 * /api/messages/[id]/annotation-comments routes.
 */
import { NextRequest } from 'next/server';

const prismaMock = {
    annotationComment: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
    document: {
        findUnique: jest.fn(),
    },
    message: {
        findUnique: jest.fn(),
    },
    auditLog: {
        create: jest.fn().mockResolvedValue({}),
    },
};

jest.mock('@/lib/prisma', () => ({
    __esModule: true,
    default: prismaMock,
    prisma: prismaMock,
}));

jest.mock('@/lib/csrf', () => ({
    validateCsrf: jest.fn().mockReturnValue({ valid: true }),
}));

const mockSession = {
    id: 'user-1',
    email: 'test@example.com',
    role: 'COORDINATOR',
    tenantId: 'tenant-1',
    name: 'Test User',
};

jest.mock('@/lib/auth', () => ({
    ...jest.requireActual('@/lib/auth'),
    getSession: jest.fn(),
}));

function makeRequest(url: string, method = 'GET', body?: object) {
    return new NextRequest(url, {
        method,
        ...(body ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json', 'x-csrf-token': 'test' } } : {}),
    });
}

// -------------------------------------------------------
// GET /api/documents/[id]/annotation-comments
// -------------------------------------------------------
describe('GET /api/documents/[id]/annotation-comments', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        prismaMock.auditLog.create.mockResolvedValue({});
        const auth = jest.requireMock('@/lib/auth');
        (auth.getSession as jest.Mock).mockResolvedValue(mockSession);
    });

    it('returns 401 when unauthenticated', async () => {
        const auth = jest.requireMock('@/lib/auth');
        (auth.getSession as jest.Mock).mockResolvedValue(null);

        const { GET } = await import('@/app/api/documents/[id]/annotation-comments/route');
        const req = makeRequest('http://localhost/api/documents/doc-1/annotation-comments');
        const res = await GET(req, { params: Promise.resolve({ id: 'doc-1' }) });
        expect(res.status).toBe(401);
    });

    it('returns nested tree of annotation comments', async () => {
        const root = {
            id: 'cmt-1', parentId: null, tenantId: 'tenant-1', documentId: 'doc-1',
            type: 'HIGHLIGHT_PDF', content: 'Root comment', deletedAt: null,
            color: '#FFFF00', pageNumber: 1, x: 10, y: 20, width: 30, height: 5,
            selectedText: null, selectionStart: null, selectionEnd: null,
            createdAt: new Date(), updatedAt: new Date(),
            createdBy: { id: 'user-1', name: 'Test User' },
        };
        const reply = {
            id: 'cmt-2', parentId: 'cmt-1', tenantId: 'tenant-1', documentId: 'doc-1',
            type: 'HIGHLIGHT_PDF', content: 'A reply', deletedAt: null,
            color: null, pageNumber: null, x: null, y: null, width: null, height: null,
            selectedText: null, selectionStart: null, selectionEnd: null,
            createdAt: new Date(), updatedAt: new Date(),
            createdBy: { id: 'user-2', name: 'Other User' },
        };
        prismaMock.annotationComment.findMany.mockResolvedValue([root, reply]);

        const { GET } = await import('@/app/api/documents/[id]/annotation-comments/route');
        const req = makeRequest('http://localhost/api/documents/doc-1/annotation-comments');
        const res = await GET(req, { params: Promise.resolve({ id: 'doc-1' }) });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveLength(1);
        expect(data[0].id).toBe('cmt-1');
        expect(data[0].replies).toHaveLength(1);
        expect(data[0].replies[0].id).toBe('cmt-2');
    });
});

// -------------------------------------------------------
// POST /api/documents/[id]/annotation-comments
// -------------------------------------------------------
describe('POST /api/documents/[id]/annotation-comments', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        prismaMock.auditLog.create.mockResolvedValue({});
        const auth = jest.requireMock('@/lib/auth');
        (auth.getSession as jest.Mock).mockResolvedValue(mockSession);
        prismaMock.document.findUnique.mockResolvedValue({ id: 'doc-1', tenantId: 'tenant-1' });
    });

    it('returns 401 when unauthenticated', async () => {
        const auth = jest.requireMock('@/lib/auth');
        (auth.getSession as jest.Mock).mockResolvedValue(null);

        const { POST } = await import('@/app/api/documents/[id]/annotation-comments/route');
        const req = makeRequest(
            'http://localhost/api/documents/doc-1/annotation-comments',
            'POST',
            { type: 'DOCUMENT_NOTE', content: 'A note' }
        );
        const res = await POST(req, { params: Promise.resolve({ id: 'doc-1' }) });
        expect(res.status).toBe(401);
    });

    it('returns 400 when content is missing', async () => {
        const { POST } = await import('@/app/api/documents/[id]/annotation-comments/route');
        const req = makeRequest(
            'http://localhost/api/documents/doc-1/annotation-comments',
            'POST',
            { type: 'DOCUMENT_NOTE' }
        );
        const res = await POST(req, { params: Promise.resolve({ id: 'doc-1' }) });
        expect(res.status).toBe(400);
    });

    it('creates a DOCUMENT_NOTE and returns 201', async () => {
        const created = {
            id: 'cmt-new', parentId: null, tenantId: 'tenant-1', documentId: 'doc-1',
            type: 'DOCUMENT_NOTE', content: 'A note', deletedAt: null,
            color: null, pageNumber: null, x: null, y: null, width: null, height: null,
            selectedText: null, selectionStart: null, selectionEnd: null,
            createdAt: new Date(), updatedAt: new Date(),
            createdBy: { id: 'user-1', name: 'Test User' },
        };
        prismaMock.annotationComment.create.mockResolvedValue(created);

        const { POST } = await import('@/app/api/documents/[id]/annotation-comments/route');
        const req = makeRequest(
            'http://localhost/api/documents/doc-1/annotation-comments',
            'POST',
            { type: 'DOCUMENT_NOTE', content: 'A note' }
        );
        const res = await POST(req, { params: Promise.resolve({ id: 'doc-1' }) });
        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.id).toBe('cmt-new');
        expect(prismaMock.auditLog.create).toHaveBeenCalledTimes(1);
    });

    it('creates a HIGHLIGHT_PDF and returns 201', async () => {
        const created = {
            id: 'cmt-pdf', parentId: null, tenantId: 'tenant-1', documentId: 'doc-1',
            type: 'HIGHLIGHT_PDF', content: '', deletedAt: null,
            color: '#00FF00', pageNumber: 2, x: 5, y: 10, width: 50, height: 3,
            selectedText: null, selectionStart: null, selectionEnd: null,
            createdAt: new Date(), updatedAt: new Date(),
            createdBy: { id: 'user-1', name: 'Test User' },
        };
        prismaMock.annotationComment.create.mockResolvedValue(created);

        const { POST } = await import('@/app/api/documents/[id]/annotation-comments/route');
        const req = makeRequest(
            'http://localhost/api/documents/doc-1/annotation-comments',
            'POST',
            { type: 'HIGHLIGHT_PDF', content: '', color: '#00FF00', pageNumber: 2, x: 5, y: 10, width: 50, height: 3 }
        );
        const res = await POST(req, { params: Promise.resolve({ id: 'doc-1' }) });
        expect(res.status).toBe(201);
    });
});
```

- [ ] **Step 2: Run test to confirm it fails (route not yet created)**

```bash
cd accommally && npx jest src/__tests__/annotation-comments.test.ts --forceExit 2>&1 | tail -20
```

Expected: FAIL — `Cannot find module '@/app/api/documents/[id]/annotation-comments/route'`

- [ ] **Step 3: Create the route**

Create `src/app/api/documents/[id]/annotation-comments/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
    try {
        const { session, error } = await requireAuth();
        if (error) return error;

        const { id: documentId } = await params;
        const tenantPrisma = withTenantScope(prisma, session.tenantId);

        const comments = await tenantPrisma.annotationComment.findMany({
            where: { documentId },
            include: { createdBy: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'asc' },
        });

        const roots = comments.filter(c => !c.parentId);
        const replies = comments.filter(c => c.parentId);
        const tree = roots.map(root => ({
            ...root,
            content: root.deletedAt ? '[deleted]' : root.content,
            replies: replies
                .filter(r => r.parentId === root.id)
                .map(r => ({ ...r, content: r.deletedAt ? '[deleted]' : r.content })),
        }));

        return NextResponse.json(tree);
    } catch (err) {
        logger.error({ err }, 'Error fetching document annotation comments');
        return NextResponse.json({ error: 'Failed to fetch annotation comments' }, { status: 500 });
    }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const { session, error } = await requireAuth({ request });
        if (error) return error;

        const { id: documentId } = await params;
        const body = await request.json();
        const { type, content, color, pageNumber, x, y, width, height, selectedText, selectionStart, selectionEnd } = body;

        if (!type || content === undefined || content === null) {
            return NextResponse.json({ error: 'type and content are required' }, { status: 400 });
        }

        const tenantPrisma = withTenantScope(prisma, session.tenantId);

        const document = await tenantPrisma.document.findUnique({ where: { id: documentId }, select: { id: true } });
        if (!document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        const comment = await tenantPrisma.annotationComment.create({
            data: {
                documentId,
                type,
                content,
                color: color ?? null,
                pageNumber: pageNumber ?? null,
                x: x ?? null,
                y: y ?? null,
                width: width ?? null,
                height: height ?? null,
                selectedText: selectedText ?? null,
                selectionStart: selectionStart ?? null,
                selectionEnd: selectionEnd ?? null,
                createdById: session.id,
            },
            include: { createdBy: { select: { id: true, name: true } } },
        });

        await tenantPrisma.auditLog.create({
            data: {
                entityType: 'AnnotationComment',
                entityId: comment.id,
                action: 'CREATE',
                userId: session.id,
            },
        });

        return NextResponse.json(comment, { status: 201 });
    } catch (err) {
        logger.error({ err }, 'Error creating document annotation comment');
        return NextResponse.json({ error: 'Failed to create annotation comment' }, { status: 500 });
    }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd accommally && npx jest src/__tests__/annotation-comments.test.ts --forceExit 2>&1 | tail -20
```

Expected: PASS for all GET and POST describe blocks defined so far.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/documents/[id]/annotation-comments/route.ts src/__tests__/annotation-comments.test.ts
git commit -m "feat: add document annotation-comments GET and POST routes"
```

---

## Task 5: Document Annotation-Comments — PATCH and DELETE

**Files:**
- Create: `src/app/api/documents/[id]/annotation-comments/[cid]/route.ts`

- [ ] **Step 1: Add PATCH and DELETE tests to `src/__tests__/annotation-comments.test.ts`**

Append to the existing test file:

```typescript
// -------------------------------------------------------
// PATCH /api/documents/[id]/annotation-comments/[cid]
// -------------------------------------------------------
describe('PATCH /api/documents/[id]/annotation-comments/[cid]', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        prismaMock.auditLog.create.mockResolvedValue({});
        const auth = jest.requireMock('@/lib/auth');
        (auth.getSession as jest.Mock).mockResolvedValue(mockSession);
    });

    it('returns 401 when unauthenticated', async () => {
        const auth = jest.requireMock('@/lib/auth');
        (auth.getSession as jest.Mock).mockResolvedValue(null);
        const { PATCH } = await import('@/app/api/documents/[id]/annotation-comments/[cid]/route');
        const req = makeRequest(
            'http://localhost/api/documents/doc-1/annotation-comments/cmt-1',
            'PATCH',
            { content: 'updated' }
        );
        const res = await PATCH(req, { params: Promise.resolve({ id: 'doc-1', cid: 'cmt-1' }) });
        expect(res.status).toBe(401);
    });

    it('returns 409 when annotation is older than 24 hours and user is not ADMIN', async () => {
        const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
        prismaMock.annotationComment.findUnique.mockResolvedValue({
            id: 'cmt-1', tenantId: 'tenant-1', createdById: 'user-1',
            createdAt: old, deletedAt: null,
        });
        const { PATCH } = await import('@/app/api/documents/[id]/annotation-comments/[cid]/route');
        const req = makeRequest(
            'http://localhost/api/documents/doc-1/annotation-comments/cmt-1',
            'PATCH',
            { content: 'updated' }
        );
        const res = await PATCH(req, { params: Promise.resolve({ id: 'doc-1', cid: 'cmt-1' }) });
        expect(res.status).toBe(409);
    });

    it('returns 403 when user is not the creator', async () => {
        const recent = new Date(Date.now() - 5 * 60 * 1000);
        prismaMock.annotationComment.findUnique.mockResolvedValue({
            id: 'cmt-1', tenantId: 'tenant-1', createdById: 'other-user',
            createdAt: recent, deletedAt: null,
        });
        const { PATCH } = await import('@/app/api/documents/[id]/annotation-comments/[cid]/route');
        const req = makeRequest(
            'http://localhost/api/documents/doc-1/annotation-comments/cmt-1',
            'PATCH',
            { content: 'updated' }
        );
        const res = await PATCH(req, { params: Promise.resolve({ id: 'doc-1', cid: 'cmt-1' }) });
        expect(res.status).toBe(403);
    });

    it('updates content within 24 hours', async () => {
        const recent = new Date(Date.now() - 5 * 60 * 1000);
        prismaMock.annotationComment.findUnique.mockResolvedValue({
            id: 'cmt-1', tenantId: 'tenant-1', createdById: 'user-1',
            createdAt: recent, deletedAt: null,
        });
        prismaMock.annotationComment.update.mockResolvedValue({
            id: 'cmt-1', content: 'updated', createdBy: { id: 'user-1', name: 'Test User' },
        });
        const { PATCH } = await import('@/app/api/documents/[id]/annotation-comments/[cid]/route');
        const req = makeRequest(
            'http://localhost/api/documents/doc-1/annotation-comments/cmt-1',
            'PATCH',
            { content: 'updated' }
        );
        const res = await PATCH(req, { params: Promise.resolve({ id: 'doc-1', cid: 'cmt-1' }) });
        expect(res.status).toBe(200);
        expect(prismaMock.auditLog.create).toHaveBeenCalledTimes(1);
    });
});

// -------------------------------------------------------
// DELETE /api/documents/[id]/annotation-comments/[cid]
// -------------------------------------------------------
describe('DELETE /api/documents/[id]/annotation-comments/[cid]', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        prismaMock.auditLog.create.mockResolvedValue({});
        const auth = jest.requireMock('@/lib/auth');
        (auth.getSession as jest.Mock).mockResolvedValue(mockSession);
    });

    it('soft deletes an annotation comment', async () => {
        const recent = new Date(Date.now() - 5 * 60 * 1000);
        prismaMock.annotationComment.findUnique.mockResolvedValue({
            id: 'cmt-1', tenantId: 'tenant-1', createdById: 'user-1',
            createdAt: recent, deletedAt: null,
        });
        prismaMock.annotationComment.update.mockResolvedValue({ id: 'cmt-1', deletedAt: new Date() });
        const { DELETE } = await import('@/app/api/documents/[id]/annotation-comments/[cid]/route');
        const req = makeRequest('http://localhost/api/documents/doc-1/annotation-comments/cmt-1', 'DELETE');
        const res = await DELETE(req, { params: Promise.resolve({ id: 'doc-1', cid: 'cmt-1' }) });
        expect(res.status).toBe(200);
        expect(prismaMock.annotationComment.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date), content: '[deleted]' }) })
        );
    });

    it('returns 410 when already soft-deleted', async () => {
        prismaMock.annotationComment.findUnique.mockResolvedValue({
            id: 'cmt-1', tenantId: 'tenant-1', createdById: 'user-1',
            createdAt: new Date(), deletedAt: new Date(),
        });
        const { DELETE } = await import('@/app/api/documents/[id]/annotation-comments/[cid]/route');
        const req = makeRequest('http://localhost/api/documents/doc-1/annotation-comments/cmt-1', 'DELETE');
        const res = await DELETE(req, { params: Promise.resolve({ id: 'doc-1', cid: 'cmt-1' }) });
        expect(res.status).toBe(410);
    });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd accommally && npx jest src/__tests__/annotation-comments.test.ts --forceExit 2>&1 | tail -20
```

Expected: FAIL — `Cannot find module '@/app/api/documents/[id]/annotation-comments/[cid]/route'`

- [ ] **Step 3: Create the route**

Create `src/app/api/documents/[id]/annotation-comments/[cid]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

type RouteContext = { params: Promise<{ id: string; cid: string }> };

const LOCK_DURATION_MS = 24 * 60 * 60 * 1000;

export async function PATCH(request: NextRequest, { params }: RouteContext) {
    try {
        const { session, error } = await requireAuth({ request });
        if (error) return error;

        const { cid } = await params;
        const tenantPrisma = withTenantScope(prisma, session.tenantId);

        const comment = await tenantPrisma.annotationComment.findUnique({ where: { id: cid } });
        if (!comment) {
            return NextResponse.json({ error: 'Annotation comment not found' }, { status: 404 });
        }
        if (comment.deletedAt) {
            return NextResponse.json({ error: 'Annotation has been deleted' }, { status: 410 });
        }
        if (comment.createdById !== session.id && session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const isLocked = Date.now() - comment.createdAt.getTime() > LOCK_DURATION_MS;
        if (isLocked && session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Annotation can no longer be edited after 24 hours' }, { status: 409 });
        }

        const body = await request.json();
        if (!body.content || typeof body.content !== 'string') {
            return NextResponse.json({ error: 'content is required' }, { status: 400 });
        }

        const updated = await tenantPrisma.annotationComment.update({
            where: { id: cid },
            data: { content: body.content },
            include: { createdBy: { select: { id: true, name: true } } },
        });

        await tenantPrisma.auditLog.create({
            data: {
                entityType: 'AnnotationComment',
                entityId: cid,
                action: 'UPDATE',
                field: 'content',
                newValue: body.content,
                userId: session.id,
            },
        });

        return NextResponse.json(updated);
    } catch (err) {
        logger.error({ err }, 'Error updating annotation comment');
        return NextResponse.json({ error: 'Failed to update annotation comment' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
    try {
        const { session, error } = await requireAuth({ request });
        if (error) return error;

        const { cid } = await params;
        const tenantPrisma = withTenantScope(prisma, session.tenantId);

        const comment = await tenantPrisma.annotationComment.findUnique({ where: { id: cid } });
        if (!comment) {
            return NextResponse.json({ error: 'Annotation comment not found' }, { status: 404 });
        }
        if (comment.deletedAt) {
            return NextResponse.json({ error: 'Annotation has already been deleted' }, { status: 410 });
        }
        if (comment.createdById !== session.id && session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const isLocked = Date.now() - comment.createdAt.getTime() > LOCK_DURATION_MS;
        if (isLocked && session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Annotation can no longer be deleted after 24 hours' }, { status: 409 });
        }

        await tenantPrisma.annotationComment.update({
            where: { id: cid },
            data: { deletedAt: new Date(), content: '[deleted]' },
        });

        await tenantPrisma.auditLog.create({
            data: {
                entityType: 'AnnotationComment',
                entityId: cid,
                action: 'DELETE',
                userId: session.id,
            },
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        logger.error({ err }, 'Error deleting annotation comment');
        return NextResponse.json({ error: 'Failed to delete annotation comment' }, { status: 500 });
    }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd accommally && npx jest src/__tests__/annotation-comments.test.ts --forceExit 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/documents/[id]/annotation-comments/[cid]/route.ts src/__tests__/annotation-comments.test.ts
git commit -m "feat: add document annotation-comments PATCH and DELETE routes"
```

---

## Task 6: Document Annotation-Comments — Replies

**Files:**
- Create: `src/app/api/documents/[id]/annotation-comments/[cid]/replies/route.ts`

- [ ] **Step 1: Add reply test to `src/__tests__/annotation-comments.test.ts`**

Append to the test file:

```typescript
// -------------------------------------------------------
// POST /api/documents/[id]/annotation-comments/[cid]/replies
// -------------------------------------------------------
describe('POST /api/documents/[id]/annotation-comments/[cid]/replies', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        prismaMock.auditLog.create.mockResolvedValue({});
        const auth = jest.requireMock('@/lib/auth');
        (auth.getSession as jest.Mock).mockResolvedValue(mockSession);
    });

    it('returns 400 when parent is itself a reply', async () => {
        prismaMock.annotationComment.findUnique.mockResolvedValue({
            id: 'cmt-2', parentId: 'cmt-1', tenantId: 'tenant-1', deletedAt: null,
        });
        const { POST } = await import('@/app/api/documents/[id]/annotation-comments/[cid]/replies/route');
        const req = makeRequest(
            'http://localhost/api/documents/doc-1/annotation-comments/cmt-2/replies',
            'POST',
            { content: 'nested reply' }
        );
        const res = await POST(req, { params: Promise.resolve({ id: 'doc-1', cid: 'cmt-2' }) });
        expect(res.status).toBe(400);
    });

    it('creates a reply and returns 201', async () => {
        prismaMock.annotationComment.findUnique.mockResolvedValue({
            id: 'cmt-1', parentId: null, tenantId: 'tenant-1', deletedAt: null,
            type: 'HIGHLIGHT_PDF',
        });
        const created = {
            id: 'cmt-reply', parentId: 'cmt-1', tenantId: 'tenant-1',
            type: 'HIGHLIGHT_PDF', content: 'A reply', deletedAt: null,
            createdAt: new Date(), updatedAt: new Date(),
            createdBy: { id: 'user-1', name: 'Test User' },
        };
        prismaMock.annotationComment.create.mockResolvedValue(created);

        const { POST } = await import('@/app/api/documents/[id]/annotation-comments/[cid]/replies/route');
        const req = makeRequest(
            'http://localhost/api/documents/doc-1/annotation-comments/cmt-1/replies',
            'POST',
            { content: 'A reply' }
        );
        const res = await POST(req, { params: Promise.resolve({ id: 'doc-1', cid: 'cmt-1' }) });
        expect(res.status).toBe(201);
        expect(prismaMock.auditLog.create).toHaveBeenCalledTimes(1);
    });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd accommally && npx jest src/__tests__/annotation-comments.test.ts --forceExit 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '@/app/api/documents/[id]/annotation-comments/[cid]/replies/route'`

- [ ] **Step 3: Create the route**

Create `src/app/api/documents/[id]/annotation-comments/[cid]/replies/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

type RouteContext = { params: Promise<{ id: string; cid: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const { session, error } = await requireAuth({ request });
        if (error) return error;

        const { cid } = await params;
        const tenantPrisma = withTenantScope(prisma, session.tenantId);

        const parent = await tenantPrisma.annotationComment.findUnique({ where: { id: cid } });
        if (!parent) {
            return NextResponse.json({ error: 'Parent annotation comment not found' }, { status: 404 });
        }
        if (parent.parentId) {
            return NextResponse.json({ error: 'Cannot reply to a reply — only one level of threading allowed' }, { status: 400 });
        }

        const body = await request.json();
        if (!body.content || typeof body.content !== 'string') {
            return NextResponse.json({ error: 'content is required' }, { status: 400 });
        }

        const reply = await tenantPrisma.annotationComment.create({
            data: {
                documentId: parent.documentId,
                messageId: parent.messageId,
                parentId: cid,
                type: parent.type,
                content: body.content,
                createdById: session.id,
            },
            include: { createdBy: { select: { id: true, name: true } } },
        });

        await tenantPrisma.auditLog.create({
            data: {
                entityType: 'AnnotationComment',
                entityId: reply.id,
                action: 'CREATE',
                userId: session.id,
            },
        });

        return NextResponse.json(reply, { status: 201 });
    } catch (err) {
        logger.error({ err }, 'Error creating annotation comment reply');
        return NextResponse.json({ error: 'Failed to create reply' }, { status: 500 });
    }
}
```

- [ ] **Step 4: Run all annotation-comment tests**

```bash
cd accommally && npx jest src/__tests__/annotation-comments.test.ts --forceExit 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/documents/[id]/annotation-comments/[cid]/replies/route.ts src/__tests__/annotation-comments.test.ts
git commit -m "feat: add document annotation-comments replies route"
```

---

## Task 7: Message Annotation-Comments — GET and POST

**Files:**
- Create: `src/app/api/messages/[id]/annotation-comments/route.ts`

- [ ] **Step 1: Create the route**

Create `src/app/api/messages/[id]/annotation-comments/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
    try {
        const { session, error } = await requireAuth();
        if (error) return error;

        const { id: messageId } = await params;
        const tenantPrisma = withTenantScope(prisma, session.tenantId);

        const comments = await tenantPrisma.annotationComment.findMany({
            where: { messageId },
            include: { createdBy: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'asc' },
        });

        const roots = comments.filter(c => !c.parentId);
        const replies = comments.filter(c => c.parentId);
        const tree = roots.map(root => ({
            ...root,
            content: root.deletedAt ? '[deleted]' : root.content,
            replies: replies
                .filter(r => r.parentId === root.id)
                .map(r => ({ ...r, content: r.deletedAt ? '[deleted]' : r.content })),
        }));

        return NextResponse.json(tree);
    } catch (err) {
        logger.error({ err }, 'Error fetching message annotation comments');
        return NextResponse.json({ error: 'Failed to fetch annotation comments' }, { status: 500 });
    }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const { session, error } = await requireAuth({ request });
        if (error) return error;

        const { id: messageId } = await params;
        const body = await request.json();
        const { type, content, color, selectedText, selectionStart, selectionEnd } = body;

        if (!type || content === undefined || content === null) {
            return NextResponse.json({ error: 'type and content are required' }, { status: 400 });
        }

        const tenantPrisma = withTenantScope(prisma, session.tenantId);

        const message = await tenantPrisma.message.findUnique({ where: { id: messageId }, select: { id: true } });
        if (!message) {
            return NextResponse.json({ error: 'Message not found' }, { status: 404 });
        }

        const comment = await tenantPrisma.annotationComment.create({
            data: {
                messageId,
                type,
                content,
                color: color ?? null,
                selectedText: selectedText ?? null,
                selectionStart: selectionStart ?? null,
                selectionEnd: selectionEnd ?? null,
                createdById: session.id,
            },
            include: { createdBy: { select: { id: true, name: true } } },
        });

        await tenantPrisma.auditLog.create({
            data: {
                entityType: 'AnnotationComment',
                entityId: comment.id,
                action: 'CREATE',
                userId: session.id,
            },
        });

        return NextResponse.json(comment, { status: 201 });
    } catch (err) {
        logger.error({ err }, 'Error creating message annotation comment');
        return NextResponse.json({ error: 'Failed to create annotation comment' }, { status: 500 });
    }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd accommally && npx tsc --noEmit 2>&1 | grep annotation | head -10
```

Expected: no errors for annotation-comment files.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/messages/[id]/annotation-comments/route.ts
git commit -m "feat: add message annotation-comments GET and POST routes"
```

---

## Task 8: Message Annotation-Comments — PATCH and DELETE

**Files:**
- Create: `src/app/api/messages/[id]/annotation-comments/[cid]/route.ts`

- [ ] **Step 1: Create the route**

Create `src/app/api/messages/[id]/annotation-comments/[cid]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

type RouteContext = { params: Promise<{ id: string; cid: string }> };

const LOCK_DURATION_MS = 24 * 60 * 60 * 1000;

export async function PATCH(request: NextRequest, { params }: RouteContext) {
    try {
        const { session, error } = await requireAuth({ request });
        if (error) return error;

        const { cid } = await params;
        const tenantPrisma = withTenantScope(prisma, session.tenantId);

        const comment = await tenantPrisma.annotationComment.findUnique({ where: { id: cid } });
        if (!comment) {
            return NextResponse.json({ error: 'Annotation comment not found' }, { status: 404 });
        }
        if (comment.deletedAt) {
            return NextResponse.json({ error: 'Annotation has been deleted' }, { status: 410 });
        }
        if (comment.createdById !== session.id && session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const isLocked = Date.now() - comment.createdAt.getTime() > LOCK_DURATION_MS;
        if (isLocked && session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Annotation can no longer be edited after 24 hours' }, { status: 409 });
        }

        const body = await request.json();
        if (!body.content || typeof body.content !== 'string') {
            return NextResponse.json({ error: 'content is required' }, { status: 400 });
        }

        const updated = await tenantPrisma.annotationComment.update({
            where: { id: cid },
            data: { content: body.content },
            include: { createdBy: { select: { id: true, name: true } } },
        });

        await tenantPrisma.auditLog.create({
            data: {
                entityType: 'AnnotationComment',
                entityId: cid,
                action: 'UPDATE',
                field: 'content',
                newValue: body.content,
                userId: session.id,
            },
        });

        return NextResponse.json(updated);
    } catch (err) {
        logger.error({ err }, 'Error updating message annotation comment');
        return NextResponse.json({ error: 'Failed to update annotation comment' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
    try {
        const { session, error } = await requireAuth({ request });
        if (error) return error;

        const { cid } = await params;
        const tenantPrisma = withTenantScope(prisma, session.tenantId);

        const comment = await tenantPrisma.annotationComment.findUnique({ where: { id: cid } });
        if (!comment) {
            return NextResponse.json({ error: 'Annotation comment not found' }, { status: 404 });
        }
        if (comment.deletedAt) {
            return NextResponse.json({ error: 'Annotation has already been deleted' }, { status: 410 });
        }
        if (comment.createdById !== session.id && session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const isLocked = Date.now() - comment.createdAt.getTime() > LOCK_DURATION_MS;
        if (isLocked && session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Annotation can no longer be deleted after 24 hours' }, { status: 409 });
        }

        await tenantPrisma.annotationComment.update({
            where: { id: cid },
            data: { deletedAt: new Date(), content: '[deleted]' },
        });

        await tenantPrisma.auditLog.create({
            data: {
                entityType: 'AnnotationComment',
                entityId: cid,
                action: 'DELETE',
                userId: session.id,
            },
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        logger.error({ err }, 'Error deleting message annotation comment');
        return NextResponse.json({ error: 'Failed to delete annotation comment' }, { status: 500 });
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/messages/[id]/annotation-comments/[cid]/route.ts
git commit -m "feat: add message annotation-comments PATCH and DELETE routes"
```

---

## Task 9: Message Annotation-Comments — Replies

**Files:**
- Create: `src/app/api/messages/[id]/annotation-comments/[cid]/replies/route.ts`

- [ ] **Step 1: Create the route**

Create `src/app/api/messages/[id]/annotation-comments/[cid]/replies/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

type RouteContext = { params: Promise<{ id: string; cid: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const { session, error } = await requireAuth({ request });
        if (error) return error;

        const { cid } = await params;
        const tenantPrisma = withTenantScope(prisma, session.tenantId);

        const parent = await tenantPrisma.annotationComment.findUnique({ where: { id: cid } });
        if (!parent) {
            return NextResponse.json({ error: 'Parent annotation comment not found' }, { status: 404 });
        }
        if (parent.parentId) {
            return NextResponse.json({ error: 'Cannot reply to a reply — only one level of threading allowed' }, { status: 400 });
        }

        const body = await request.json();
        if (!body.content || typeof body.content !== 'string') {
            return NextResponse.json({ error: 'content is required' }, { status: 400 });
        }

        const reply = await tenantPrisma.annotationComment.create({
            data: {
                documentId: parent.documentId,
                messageId: parent.messageId,
                parentId: cid,
                type: parent.type,
                content: body.content,
                createdById: session.id,
            },
            include: { createdBy: { select: { id: true, name: true } } },
        });

        await tenantPrisma.auditLog.create({
            data: {
                entityType: 'AnnotationComment',
                entityId: reply.id,
                action: 'CREATE',
                userId: session.id,
            },
        });

        return NextResponse.json(reply, { status: 201 });
    } catch (err) {
        logger.error({ err }, 'Error creating message annotation comment reply');
        return NextResponse.json({ error: 'Failed to create reply' }, { status: 500 });
    }
}
```

- [ ] **Step 2: Run all tests**

```bash
cd accommally && npx jest --forceExit 2>&1 | tail -15
```

Expected: all existing tests pass, annotation-comment tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/messages/[id]/annotation-comments/[cid]/replies/route.ts
git commit -m "feat: add message annotation-comments replies route"
```

---

## Task 10: AnnotationThreadPanel Component

**Files:**
- Create: `src/components/AnnotationThreadPanel.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/AnnotationThreadPanel.tsx`:

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Lock, Pencil, Trash2, Send, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CommentUser {
    id: string;
    name: string;
}

interface AnnotationCommentData {
    id: string;
    type: string;
    content: string;
    deletedAt: string | null;
    createdAt: string;
    createdBy: CommentUser;
    replies: Omit<AnnotationCommentData, 'replies'>[];
}

interface AnnotationThreadPanelProps {
    resourceType: 'document' | 'message';
    resourceId: string;
    rootCommentId: string | null;
    initialType: 'HIGHLIGHT_PDF' | 'HIGHLIGHT_EMAIL' | 'DOCUMENT_NOTE' | 'EMAIL_NOTE';
    currentUserId: string;
    currentUserName: string;
    onClose: () => void;
    onCreated?: (comment: AnnotationCommentData) => void;
}

const LOCK_MS = 24 * 60 * 60 * 1000;

function isLocked(createdAt: string): boolean {
    return Date.now() - new Date(createdAt).getTime() > LOCK_MS;
}

export function AnnotationThreadPanel({
    resourceType,
    resourceId,
    rootCommentId,
    initialType,
    currentUserId,
    currentUserName,
    onClose,
    onCreated,
}: AnnotationThreadPanelProps) {
    const [root, setRoot] = useState<AnnotationCommentData | null>(null);
    const [inputText, setInputText] = useState('');
    const [replyText, setReplyText] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const baseUrl = resourceType === 'document'
        ? `/api/documents/${resourceId}/annotation-comments`
        : `/api/messages/${resourceId}/annotation-comments`;

    useEffect(() => {
        if (!rootCommentId) return;
        fetchRoot();
    }, [rootCommentId]);

    useEffect(() => {
        if (!rootCommentId) {
            inputRef.current?.focus();
        }
    }, [rootCommentId]);

    async function fetchRoot() {
        if (!rootCommentId) return;
        try {
            const res = await fetch(baseUrl);
            if (!res.ok) return;
            const tree: AnnotationCommentData[] = await res.json();
            const found = tree.find(c => c.id === rootCommentId);
            if (found) setRoot(found);
        } catch {
            setError('Failed to load thread');
        }
    }

    async function submitNewRoot() {
        if (!inputText.trim()) return;
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await fetch(baseUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: initialType, content: inputText.trim() }),
            });
            if (!res.ok) throw new Error('Failed to create');
            const created: AnnotationCommentData = await res.json();
            setRoot({ ...created, replies: [] });
            setInputText('');
            onCreated?.({ ...created, replies: [] });
        } catch {
            setError('Failed to save note. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }

    async function submitReply() {
        if (!replyText.trim() || !root) return;
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await fetch(`${baseUrl}/${root.id}/replies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: replyText.trim() }),
            });
            if (!res.ok) throw new Error('Failed to reply');
            const reply = await res.json();
            setRoot(prev => prev ? { ...prev, replies: [...prev.replies, reply] } : prev);
            setReplyText('');
        } catch {
            setError('Failed to post reply. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }

    async function saveEdit(commentId: string, isReply: boolean) {
        if (!editText.trim()) return;
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await fetch(`${baseUrl}/${commentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: editText.trim() }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error ?? 'Failed to update');
            }
            if (isReply) {
                setRoot(prev => prev ? {
                    ...prev,
                    replies: prev.replies.map(r => r.id === commentId ? { ...r, content: editText.trim() } : r),
                } : prev);
            } else if (root?.id === commentId) {
                setRoot(prev => prev ? { ...prev, content: editText.trim() } : prev);
            }
            setEditingId(null);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function deleteComment(commentId: string, isReply: boolean) {
        setError(null);
        try {
            const res = await fetch(`${baseUrl}/${commentId}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error ?? 'Failed to delete');
            }
            if (isReply) {
                setRoot(prev => prev ? {
                    ...prev,
                    replies: prev.replies.map(r => r.id === commentId ? { ...r, content: '[deleted]', deletedAt: new Date().toISOString() } : r),
                } : prev);
            } else if (root?.id === commentId) {
                setRoot(prev => prev ? { ...prev, content: '[deleted]', deletedAt: new Date().toISOString() } : prev);
            }
        } catch (e: any) {
            setError(e.message);
        }
    }

    function startEdit(commentId: string, currentContent: string) {
        setEditingId(commentId);
        setEditText(currentContent);
    }

    function renderComment(
        comment: Omit<AnnotationCommentData, 'replies'>,
        isReply: boolean
    ) {
        const locked = isLocked(comment.createdAt);
        const isOwner = comment.createdBy.id === currentUserId;
        const isDeleted = !!comment.deletedAt;

        return (
            <div key={comment.id} className={`${isReply ? 'ml-6 border-l-2 border-gray-200 dark:border-gray-700 pl-3' : ''} py-2`}>
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">
                                {comment.createdBy.name}
                            </span>
                            <span className="text-xs text-gray-400 flex-shrink-0">
                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                            </span>
                            {locked && !isDeleted && (
                                <Lock className="w-3 h-3 text-gray-400 flex-shrink-0" title="Locked — cannot be edited" />
                            )}
                        </div>

                        {editingId === comment.id ? (
                            <div className="space-y-1">
                                <textarea
                                    value={editText}
                                    onChange={e => setEditText(e.target.value)}
                                    className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    rows={3}
                                />
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => saveEdit(comment.id, isReply)}
                                        disabled={isSubmitting || !editText.trim()}
                                        className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => setEditingId(null)}
                                        className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className={`text-sm ${isDeleted ? 'italic text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                {comment.content}
                            </p>
                        )}
                    </div>

                    {isOwner && !locked && !isDeleted && editingId !== comment.id && (
                        <div className="flex gap-1 flex-shrink-0">
                            <button
                                onClick={() => startEdit(comment.id, comment.content)}
                                className="p-1 text-gray-400 hover:text-indigo-600 rounded"
                                title="Edit"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => deleteComment(comment.id, isReply)}
                                className="p-1 text-gray-400 hover:text-red-500 rounded"
                                title="Delete"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="absolute right-0 top-0 h-full w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-xl flex flex-col z-30">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {root ? 'Thread' : 'New Note'}
                    </span>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                    <X className="w-4 h-4 text-gray-500" />
                </button>
            </div>

            {/* Thread body */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
                {error && (
                    <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded px-2 py-1">{error}</p>
                )}

                {root ? (
                    <>
                        {renderComment(root, false)}
                        {root.replies.map(reply => renderComment(reply, true))}
                    </>
                ) : (
                    <p className="text-xs text-gray-400 italic">Add the first note below.</p>
                )}
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
                {!root ? (
                    <div className="space-y-2">
                        <textarea
                            ref={inputRef}
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                            placeholder="Write a note..."
                            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            rows={3}
                            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitNewRoot(); }}
                        />
                        <button
                            onClick={submitNewRoot}
                            disabled={isSubmitting || !inputText.trim()}
                            className="w-full flex items-center justify-center gap-1 text-xs px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                        >
                            <Send className="w-3 h-3" /> Save Note
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <textarea
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            placeholder="Reply..."
                            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            rows={2}
                            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitReply(); }}
                        />
                        <button
                            onClick={submitReply}
                            disabled={isSubmitting || !replyText.trim()}
                            className="w-full flex items-center justify-center gap-1 text-xs px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                        >
                            <Send className="w-3 h-3" /> Reply
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AnnotationThreadPanel.tsx
git commit -m "feat: add AnnotationThreadPanel component"
```

---

## Task 11: Refactor DocumentViewer

**Files:**
- Modify: `src/components/DocumentViewer.tsx`

- [ ] **Step 1: Replace the entire file**

Replace the full contents of `src/components/DocumentViewer.tsx` with the following. This removes the broken move/resize interaction, replaces the `Annotation` interface with `AnnotationComment`, wires up the new API endpoints, adds a post-draw comment popover, adds an "Add Note" button, and integrates `AnnotationThreadPanel`.

```typescript
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import {
    X,
    ChevronLeft,
    ChevronRight,
    ZoomIn,
    ZoomOut,
    Highlighter,
    Trash2,
    Loader2,
    MessageSquare,
    StickyNote,
} from 'lucide-react';
import { AnnotationThreadPanel } from './AnnotationThreadPanel';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// ============================================
// TYPES
// ============================================

interface AnnotationComment {
    id: string;
    type: string;
    pageNumber: number | null;
    color: string | null;
    x: number | null;
    y: number | null;
    width: number | null;
    height: number | null;
    content: string;
    deletedAt: string | null;
    createdAt: string;
    createdBy: { id: string; name: string };
    replies: Omit<AnnotationComment, 'replies'>[];
}

interface DocumentViewerProps {
    documentId: string;
    fileName: string;
    fileType: string;
    currentUserId: string;
    currentUserName: string;
    onClose: () => void;
}

interface PendingHighlight {
    x: number;
    y: number;
    width: number;
    height: number;
}

// ============================================
// CONSTANTS
// ============================================

const HIGHLIGHT_COLORS = [
    { name: 'Yellow', hex: '#FFFF00' },
    { name: 'Green', hex: '#00FF00' },
    { name: 'Blue', hex: '#0096FF' },
    { name: 'Pink', hex: '#FF6496' },
    { name: 'Orange', hex: '#FFA500' },
];

function hexToRgba(hex: string, alpha = 0.4): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ============================================
// COMPONENT
// ============================================

export function DocumentViewer({
    documentId,
    fileName,
    fileType,
    currentUserId,
    currentUserName,
    onClose,
}: DocumentViewerProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [isLoading, setIsLoading] = useState(true);

    const [annotations, setAnnotations] = useState<AnnotationComment[]>([]);
    const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0].hex);
    const [isHighlightMode, setIsHighlightMode] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
    const [currentDraw, setCurrentDraw] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

    const [pendingHighlight, setPendingHighlight] = useState<PendingHighlight | null>(null);
    const [pendingComment, setPendingComment] = useState('');
    const [isSavingHighlight, setIsSavingHighlight] = useState(false);

    const [openThreadId, setOpenThreadId] = useState<string | null>(null);
    const [showNewNotePanel, setShowNewNotePanel] = useState(false);

    const pageContainerRef = useRef<HTMLDivElement>(null);
    const isPdf = fileType === 'application/pdf';
    const isHtml = fileType === 'text/html' || fileType === 'message/rfc822' || fileType === 'application/vnd.ms-outlook';
    const documentUrl = `/api/documents/${documentId}/view`;

    const fetchAnnotations = useCallback(async () => {
        try {
            const res = await fetch(`/api/documents/${documentId}/annotation-comments`);
            if (res.ok) {
                const data = await res.json();
                setAnnotations(data);
            }
        } catch {
            // silently ignore fetch errors
        }
    }, [documentId]);

    useEffect(() => {
        fetchAnnotations();
        setOpenThreadId(null);
    }, [fetchAnnotations, currentPage]);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setIsLoading(false);
    };

    const goToPage = (page: number) => {
        if (page >= 1 && page <= numPages) setCurrentPage(page);
    };

    const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
    const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));

    // ============================================
    // DRAW HANDLERS
    // ============================================

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isHighlightMode || !pageContainerRef.current) return;
        const rect = pageContainerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setIsDrawing(true);
        setDrawStart({ x, y });
        setCurrentDraw({ x, y, width: 0, height: 0 });
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDrawing || !drawStart || !pageContainerRef.current) return;
        const rect = pageContainerRef.current.getBoundingClientRect();
        const currentX = ((e.clientX - rect.left) / rect.width) * 100;
        const currentY = ((e.clientY - rect.top) / rect.height) * 100;
        setCurrentDraw({
            x: Math.min(drawStart.x, currentX),
            y: Math.min(drawStart.y, currentY),
            width: Math.abs(currentX - drawStart.x),
            height: Math.abs(currentY - drawStart.y),
        });
    };

    const handleMouseUp = () => {
        if (!isDrawing || !currentDraw) return;
        if (currentDraw.width > 1 && currentDraw.height > 1) {
            setPendingHighlight({ x: currentDraw.x, y: currentDraw.y, width: currentDraw.width, height: currentDraw.height });
        }
        setIsDrawing(false);
        setDrawStart(null);
        setCurrentDraw(null);
    };

    const saveHighlight = async () => {
        if (!pendingHighlight) return;
        setIsSavingHighlight(true);
        try {
            const res = await fetch(`/api/documents/${documentId}/annotation-comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'HIGHLIGHT_PDF',
                    content: pendingComment,
                    color: selectedColor,
                    pageNumber: currentPage,
                    x: pendingHighlight.x,
                    y: pendingHighlight.y,
                    width: pendingHighlight.width,
                    height: pendingHighlight.height,
                }),
            });
            if (res.ok) {
                await fetchAnnotations();
                setPendingHighlight(null);
                setPendingComment('');
            }
        } finally {
            setIsSavingHighlight(false);
        }
    };

    const deleteAnnotation = async (annotationId: string) => {
        const res = await fetch(`/api/documents/${documentId}/annotation-comments/${annotationId}`, {
            method: 'DELETE',
        });
        if (res.ok) {
            setAnnotations(prev => prev.filter(a => a.id !== annotationId));
            if (openThreadId === annotationId) setOpenThreadId(null);
        }
    };

    // ============================================
    // KEYBOARD
    // ============================================

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (pendingHighlight) { setPendingHighlight(null); setPendingComment(''); return; }
                if (openThreadId) { setOpenThreadId(null); return; }
                if (showNewNotePanel) { setShowNewNotePanel(false); return; }
                onClose();
            }
            if (e.key === 'ArrowLeft' && !pendingHighlight && !openThreadId) goToPage(currentPage - 1);
            if (e.key === 'ArrowRight' && !pendingHighlight && !openThreadId) goToPage(currentPage + 1);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentPage, numPages, onClose, pendingHighlight, openThreadId, showNewNotePanel]);

    const currentPageAnnotations = annotations.filter(
        a => a.type === 'HIGHLIGHT_PDF' && a.pageNumber === currentPage && !a.deletedAt
    );

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
            {/* Header */}
            <header className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <h2 className="font-medium truncate max-w-md">{fileName}</h2>
                    {isPdf && numPages > 0 && (
                        <span className="text-sm text-gray-400">Page {currentPage} of {numPages}</span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* Add Note button */}
                    <button
                        onClick={() => { setShowNewNotePanel(true); setOpenThreadId(null); }}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm hover:bg-gray-700 text-gray-300"
                        title="Add document note"
                    >
                        <StickyNote className="w-4 h-4" />
                        <span className="hidden sm:inline">Add Note</span>
                    </button>

                    {/* Highlight Toggle */}
                    {isPdf && (
                        <button
                            onClick={() => setIsHighlightMode(!isHighlightMode)}
                            className={`p-2 rounded-lg transition-colors ${isHighlightMode ? 'bg-yellow-500 text-black' : 'hover:bg-gray-700 text-gray-300'}`}
                            title="Toggle Highlight Mode"
                        >
                            <Highlighter className="w-5 h-5" />
                        </button>
                    )}

                    {/* Color Picker */}
                    {isHighlightMode && (
                        <div className="flex items-center gap-1 mx-2">
                            {HIGHLIGHT_COLORS.map(color => (
                                <button
                                    key={color.name}
                                    onClick={() => setSelectedColor(color.hex)}
                                    className={`w-6 h-6 rounded-full border-2 transition-transform ${selectedColor === color.hex ? 'border-white scale-110' : 'border-transparent'}`}
                                    style={{ backgroundColor: hexToRgba(color.hex, 0.8) }}
                                    title={color.name}
                                />
                            ))}
                        </div>
                    )}

                    {/* Zoom */}
                    {isPdf && (
                        <>
                            <div className="w-px h-6 bg-gray-700 mx-2" />
                            <button onClick={zoomOut} className="p-2 hover:bg-gray-700 rounded-lg text-gray-300" title="Zoom Out">
                                <ZoomOut className="w-5 h-5" />
                            </button>
                            <span className="text-sm text-gray-400 min-w-[60px] text-center">{Math.round(scale * 100)}%</span>
                            <button onClick={zoomIn} className="p-2 hover:bg-gray-700 rounded-lg text-gray-300" title="Zoom In">
                                <ZoomIn className="w-5 h-5" />
                            </button>
                        </>
                    )}

                    {/* Page Nav */}
                    {isPdf && numPages > 1 && (
                        <>
                            <div className="w-px h-6 bg-gray-700 mx-2" />
                            <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1} className="p-2 hover:bg-gray-700 rounded-lg text-gray-300 disabled:opacity-40">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= numPages} className="p-2 hover:bg-gray-700 rounded-lg text-gray-300 disabled:opacity-40">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </>
                    )}

                    <div className="w-px h-6 bg-gray-700 mx-2" />
                    <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg text-gray-300" title="Close">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden relative">
                {/* Thumbnail Sidebar */}
                {isPdf && numPages > 0 && (
                    <aside className="w-32 bg-gray-900 overflow-y-auto shrink-0 border-r border-gray-800 p-2">
                        <Document file={documentUrl}>
                            {Array.from({ length: numPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => goToPage(page)}
                                    className={`w-full mb-2 p-1 rounded transition-all ${currentPage === page ? 'ring-2 ring-blue-500 bg-gray-800' : 'hover:bg-gray-800'}`}
                                >
                                    <Page pageNumber={page} width={100} renderTextLayer={false} renderAnnotationLayer={false} />
                                    <span className="text-xs text-gray-400 mt-1 block">{page}</span>
                                </button>
                            ))}
                        </Document>
                    </aside>
                )}

                {/* Document Area */}
                <main className="flex-1 overflow-auto flex items-start justify-center p-4">
                    {isLoading && (
                        <div className="flex items-center gap-2 text-gray-400 mt-20">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            Loading document...
                        </div>
                    )}

                    {isPdf ? (
                        <Document file={documentUrl} onLoadSuccess={onDocumentLoadSuccess} loading={null}>
                            <div
                                ref={pageContainerRef}
                                className={`relative ${isHighlightMode ? 'cursor-crosshair' : ''}`}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                            >
                                <Page
                                    pageNumber={currentPage}
                                    scale={scale}
                                    renderTextLayer={true}
                                    renderAnnotationLayer={true}
                                    className={isHighlightMode ? 'pointer-events-none select-none' : ''}
                                />

                                {/* Highlight overlays */}
                                {currentPageAnnotations.map(annotation => (
                                    <div
                                        key={annotation.id}
                                        className="absolute group z-10 cursor-pointer"
                                        style={{
                                            left: `${annotation.x}%`,
                                            top: `${annotation.y}%`,
                                            width: `${annotation.width}%`,
                                            height: `${annotation.height}%`,
                                            backgroundColor: hexToRgba(annotation.color ?? '#FFFF00'),
                                        }}
                                        onClick={e => { e.stopPropagation(); setOpenThreadId(annotation.id); setShowNewNotePanel(false); }}
                                    >
                                        <div className="absolute -top-5 right-0 hidden group-hover:flex items-center gap-1 bg-gray-900 rounded px-1 py-0.5">
                                            <button
                                                onClick={e => { e.stopPropagation(); setOpenThreadId(annotation.id); setShowNewNotePanel(false); }}
                                                className="text-white"
                                                title="Open thread"
                                            >
                                                <MessageSquare className="w-3 h-3" />
                                            </button>
                                            {annotation.createdBy.id === currentUserId && (
                                                <button
                                                    onClick={e => { e.stopPropagation(); deleteAnnotation(annotation.id); }}
                                                    className="text-red-400"
                                                    title="Delete highlight"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* Drawing preview */}
                                {currentDraw && (
                                    <div
                                        className="absolute pointer-events-none z-20"
                                        style={{
                                            left: `${currentDraw.x}%`,
                                            top: `${currentDraw.y}%`,
                                            width: `${currentDraw.width}%`,
                                            height: `${currentDraw.height}%`,
                                            backgroundColor: hexToRgba(selectedColor),
                                            border: '1px dashed rgba(0,0,0,0.5)',
                                        }}
                                    />
                                )}

                                {/* Post-draw comment popover */}
                                {pendingHighlight && (
                                    <div
                                        className="absolute z-30 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3 w-64"
                                        style={{ left: `${Math.min(pendingHighlight.x, 60)}%`, top: `${pendingHighlight.y + pendingHighlight.height + 1}%` }}
                                    >
                                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Add comment (optional)</p>
                                        <textarea
                                            value={pendingComment}
                                            onChange={e => setPendingComment(e.target.value)}
                                            placeholder="What does this highlight mean?"
                                            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            rows={3}
                                            autoFocus
                                        />
                                        <div className="flex gap-2 mt-2">
                                            <button
                                                onClick={saveHighlight}
                                                disabled={isSavingHighlight}
                                                className="flex-1 text-xs px-2 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                                            >
                                                {isSavingHighlight ? 'Saving...' : 'Save'}
                                            </button>
                                            <button
                                                onClick={() => { setPendingHighlight(null); setPendingComment(''); }}
                                                className="flex-1 text-xs px-2 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Document>
                    ) : isHtml ? (
                        <div className="w-full h-[80vh]">
                            <iframe
                                src={documentUrl}
                                title={fileName}
                                className="w-full h-full border-0"
                                sandbox="allow-same-origin"
                                onLoad={() => setIsLoading(false)}
                            />
                        </div>
                    ) : (
                        <div ref={pageContainerRef} className="relative">
                            <img
                                src={documentUrl}
                                alt={fileName}
                                className="max-w-full max-h-[80vh] object-contain"
                                onLoad={() => setIsLoading(false)}
                            />
                        </div>
                    )}
                </main>

                {/* Thread Panel */}
                {(openThreadId || showNewNotePanel) && (
                    <AnnotationThreadPanel
                        resourceType="document"
                        resourceId={documentId}
                        rootCommentId={openThreadId}
                        initialType="DOCUMENT_NOTE"
                        currentUserId={currentUserId}
                        currentUserName={currentUserName}
                        onClose={() => { setOpenThreadId(null); setShowNewNotePanel(false); }}
                        onCreated={comment => {
                            setAnnotations(prev => [...prev, { ...comment, replies: [] }]);
                            setShowNewNotePanel(false);
                            setOpenThreadId(comment.id);
                        }}
                    />
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Find all call sites of DocumentViewer and add the `currentUserName` prop**

Search for usages:

```bash
cd accommally && grep -rn "DocumentViewer" src/ --include="*.tsx" --include="*.ts" | grep -v "import\|components/DocumentViewer"
```

For each call site found, add `currentUserName={...}` alongside `currentUserId={...}`. The name should come from the same user session data as `currentUserId`.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd accommally && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/DocumentViewer.tsx
git commit -m "feat: refactor DocumentViewer to use AnnotationComment API with thread panel"
```

---

## Task 12: Messages Page — Email Highlights and Notes

**Files:**
- Modify: `src/app/messages/page.tsx`

This task adds three things to the messages page: (1) a floating toolbar on email text selection, (2) an "Add Note" button in the message header, and (3) the `AnnotationThreadPanel` slide-in panel.

- [ ] **Step 1: Add the import for AnnotationThreadPanel**

At the top of `src/app/messages/page.tsx`, add to the existing imports:

```typescript
import { AnnotationThreadPanel } from '@/components/AnnotationThreadPanel';
```

Also add these Lucide icons to the existing Lucide import block if not already present:
```typescript
Highlighter, StickyNote, MessageSquare,
```

- [ ] **Step 2: Add email annotation state to the message detail component**

In the component that renders the message detail (the section around line 1030–1089 that shows message body), locate the state declarations and add:

```typescript
const [emailAnnotations, setEmailAnnotations] = useState<any[]>([]);
const [selectionToolbar, setSelectionToolbar] = useState<{
    top: number; left: number;
    selectedText: string; selectionStart: number; selectionEnd: number;
} | null>(null);
const [selectedHighlightColor, setSelectedHighlightColor] = useState('#FFFF00');
const [openEmailThreadId, setOpenEmailThreadId] = useState<string | null>(null);
const [showEmailNotePanel, setShowEmailNotePanel] = useState(false);
const emailBodyRef = useRef<HTMLDivElement>(null);
```

- [ ] **Step 3: Add the fetchEmailAnnotations function and call it when a message is selected**

Add this function to the component that renders message detail:

```typescript
const fetchEmailAnnotations = useCallback(async (msgId: string) => {
    try {
        const res = await fetch(`/api/messages/${msgId}/annotation-comments`);
        if (res.ok) setEmailAnnotations(await res.json());
    } catch {
        // ignore
    }
}, []);
```

Add to the `useEffect` that runs when `selectedMessage` changes (find the effect near where `message.read` is updated):
```typescript
if (message) fetchEmailAnnotations(message.id);
```

- [ ] **Step 4: Add the mouseup handler for text selection**

Add this function to the message detail component:

```typescript
const handleEmailMouseUp = useCallback(() => {
    if (!emailBodyRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        setSelectionToolbar(null);
        return;
    }
    const selectedText = selection.toString().trim();
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = emailBodyRef.current.getBoundingClientRect();

    // Compute character offsets within the plain-text content of the email body
    const bodyText = emailBodyRef.current.innerText ?? '';
    const selectionStart = bodyText.indexOf(selectedText);
    const selectionEnd = selectionStart >= 0 ? selectionStart + selectedText.length : -1;

    setSelectionToolbar({
        top: rect.top - containerRect.top - 44,
        left: rect.left - containerRect.left,
        selectedText,
        selectionStart: Math.max(0, selectionStart),
        selectionEnd: Math.max(0, selectionEnd),
    });
}, []);
```

- [ ] **Step 5: Add the saveEmailHighlight function**

```typescript
const saveEmailHighlight = useCallback(async (messageId: string) => {
    if (!selectionToolbar) return;
    try {
        const res = await fetch(`/api/messages/${messageId}/annotation-comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'HIGHLIGHT_EMAIL',
                content: '',
                color: selectedHighlightColor,
                selectedText: selectionToolbar.selectedText,
                selectionStart: selectionToolbar.selectionStart,
                selectionEnd: selectionToolbar.selectionEnd,
            }),
        });
        if (res.ok) {
            const created = await res.json();
            setEmailAnnotations(prev => [...prev, { ...created, replies: [] }]);
            setSelectionToolbar(null);
            window.getSelection()?.removeAllRanges();
        }
    } catch {
        // ignore
    }
}, [selectionToolbar, selectedHighlightColor]);
```

- [ ] **Step 6: Add useEffect to render email highlights as `<mark>` elements**

```typescript
useEffect(() => {
    if (!emailBodyRef.current) return;
    const highlights = emailAnnotations.filter(a => a.type === 'HIGHLIGHT_EMAIL' && !a.deletedAt);
    if (highlights.length === 0) return;

    // Walk text nodes and wrap matching ranges with mark elements
    highlights.forEach(h => {
        if (!h.selectedText || h.selectionStart < 0) return;
        const bodyEl = emailBodyRef.current!;
        const bodyText = bodyEl.innerText ?? '';
        const idx = bodyText.indexOf(h.selectedText, h.selectionStart - 5 >= 0 ? h.selectionStart - 5 : 0);
        if (idx < 0) return;

        // Find the text node and offset using TreeWalker
        const walker = document.createTreeWalker(bodyEl, NodeFilter.SHOW_TEXT);
        let charCount = 0;
        let startNode: Text | null = null;
        let startOffset = 0;
        let endNode: Text | null = null;
        let endOffset = 0;
        let node: Text | null;

        while ((node = walker.nextNode() as Text | null)) {
            const nodeLen = node.length;
            if (!startNode && charCount + nodeLen > idx) {
                startNode = node;
                startOffset = idx - charCount;
            }
            if (startNode && charCount + nodeLen >= idx + h.selectedText.length) {
                endNode = node;
                endOffset = idx + h.selectedText.length - charCount;
                break;
            }
            charCount += nodeLen;
        }

        if (startNode && endNode) {
            try {
                const range = document.createRange();
                range.setStart(startNode, startOffset);
                range.setEnd(endNode, endOffset);
                const mark = document.createElement('mark');
                mark.style.backgroundColor = h.color ? `${h.color}66` : 'rgba(255,255,0,0.4)';
                mark.style.cursor = 'pointer';
                mark.dataset.annotationId = h.id;
                mark.title = h.content || 'Click to view thread';
                mark.addEventListener('click', () => {
                    setOpenEmailThreadId(h.id);
                    setShowEmailNotePanel(false);
                });
                range.surroundContents(mark);
            } catch {
                // Range may span multiple nodes — skip gracefully
            }
        }
    });
}, [emailAnnotations]);
```

- [ ] **Step 7: Update the message body render section**

Find the existing body div at line ~1046:
```typescript
<div
    className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 text-sm leading-relaxed"
    dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(message.body),
    }}
/>
```

Replace it with:
```typescript
<div className="relative">
    {selectionToolbar && (
        <div
            className="absolute z-20 flex items-center gap-1 bg-gray-900 rounded-lg px-2 py-1 shadow-lg"
            style={{ top: selectionToolbar.top, left: selectionToolbar.left }}
        >
            {['#FFFF00', '#00FF00', '#0096FF', '#FF6496', '#FFA500'].map(hex => (
                <button
                    key={hex}
                    onClick={() => setSelectedHighlightColor(hex)}
                    className={`w-5 h-5 rounded-full border-2 ${selectedHighlightColor === hex ? 'border-white' : 'border-transparent'}`}
                    style={{ backgroundColor: `${hex}CC` }}
                />
            ))}
            <button
                onClick={() => saveEmailHighlight(message.id)}
                className="ml-1 text-xs px-2 py-0.5 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
                Highlight
            </button>
            <button onClick={() => setSelectionToolbar(null)} className="text-gray-400 hover:text-white ml-1">
                <X className="w-3 h-3" />
            </button>
        </div>
    )}
    <div
        ref={emailBodyRef}
        className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.body) }}
        onMouseUp={handleEmailMouseUp}
    />
</div>
```

- [ ] **Step 8: Add the "Add Note" button to the message header**

Find the message detail header (around line 1030 near the case link). After the case link `</Link>` and before the closing `</div>`, add:

```typescript
<button
    onClick={() => { setShowEmailNotePanel(true); setOpenEmailThreadId(null); }}
    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 mt-1 font-medium"
>
    <StickyNote className="w-3.5 h-3.5" /> Add Note
</button>
```

- [ ] **Step 9: Add the AnnotationThreadPanel to the message detail section**

Find the closing tag of the message detail container (after the Quick Reply section around line 1089). Before the closing `</div>` of the outermost message detail container, add:

```typescript
{(openEmailThreadId || showEmailNotePanel) && message && (
    <div className="relative">
        <AnnotationThreadPanel
            resourceType="message"
            resourceId={message.id}
            rootCommentId={openEmailThreadId}
            initialType="EMAIL_NOTE"
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            onClose={() => { setOpenEmailThreadId(null); setShowEmailNotePanel(false); }}
            onCreated={comment => {
                setEmailAnnotations(prev => [...prev, { ...comment, replies: [] }]);
                setShowEmailNotePanel(false);
                setOpenEmailThreadId(comment.id);
            }}
        />
    </div>
)}
```

Where `currentUserId` and `currentUserName` are sourced from the existing `userData` state already present in the page (check `userData.id` and `userData.name`).

- [ ] **Step 10: Verify TypeScript compiles**

```bash
cd accommally && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 11: Run all tests**

```bash
cd accommally && npx jest --forceExit 2>&1 | tail -15
```

Expected: all tests pass.

- [ ] **Step 12: Commit**

```bash
git add src/app/messages/page.tsx
git commit -m "feat: add email text selection highlights and notes to messages page"
```

---

## Task 13: Full Test Run and Final Verification

- [ ] **Step 1: Run the full test suite**

```bash
cd accommally && npx jest --forceExit 2>&1
```

Expected: all tests pass with no failures.

- [ ] **Step 2: Run TypeScript check**

```bash
cd accommally && npx tsc --noEmit
```

Expected: no errors (or only pre-existing errors unrelated to this feature).

- [ ] **Step 3: Verify old annotations route is gone**

```bash
ls accommally/src/app/api/documents/[id]/annotations/ 2>&1
```

Expected: `No such file or directory`

- [ ] **Step 4: Verify new route tree exists**

```bash
find accommally/src/app/api -path "*/annotation-comments*" -name "route.ts"
```

Expected output:
```
accommally/src/app/api/documents/[id]/annotation-comments/route.ts
accommally/src/app/api/documents/[id]/annotation-comments/[cid]/route.ts
accommally/src/app/api/documents/[id]/annotation-comments/[cid]/replies/route.ts
accommally/src/app/api/messages/[id]/annotation-comments/route.ts
accommally/src/app/api/messages/[id]/annotation-comments/[cid]/route.ts
accommally/src/app/api/messages/[id]/annotation-comments/[cid]/replies/route.ts
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: annotation comments — full implementation complete"
```
