# Document Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a working inline-confirmation delete action to the Documents tab that warns the user when the document has annotations.

**Architecture:** Three changes in sequence — (1) expose annotation count on documents in the case API response, (2) create a DELETE endpoint for documents, (3) wire the UI delete flow in CaseDetailPage with inline confirmation.

**Tech Stack:** Next.js App Router, Prisma ORM, TypeScript, Tailwind CSS, Lucide icons

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/app/api/cases/[id]/route.ts` | Modify | Add `_count: { annotations }` to documents include and expose `annotationCount` in transform |
| `src/app/api/documents/[id]/route.ts` | Create | DELETE handler for a single document |
| `src/components/CaseDetailPage.tsx` | Modify | Add state, handler, and inline confirmation UI |

---

## Task 1: Expose annotation count in the case document list

**Files:**
- Modify: `src/app/api/cases/[id]/route.ts`

The case GET handler fetches documents but doesn't include their annotation count. We need to add `_count` so the UI can show how many annotations will be lost.

- [ ] **Step 1: Add `_count` to the documents include**

In `src/app/api/cases/[id]/route.ts`, find the `documents` include block (around line 46):

```ts
documents: {
    include: {
        uploadedBy: {
            select: { id: true, name: true },
        },
    },
    orderBy: { createdAt: 'desc' },
},
```

Replace it with:

```ts
documents: {
    include: {
        uploadedBy: {
            select: { id: true, name: true },
        },
        _count: {
            select: { annotations: true },
        },
    },
    orderBy: { createdAt: 'desc' },
},
```

- [ ] **Step 2: Expose `annotationCount` in the transform**

Find the `documents.map` transform (around line 95):

```ts
documents: caseData.documents.map((doc: any) => ({
    id: doc.id,
    fileName: doc.fileName,
    fileType: doc.fileType,
    fileSize: doc.fileSize,
    documentControlNumber: doc.documentControlNumber,
    category: doc.category,
    createdAt: doc.createdAt,
    uploadedBy: decryptUser(doc.uploadedBy),
})),
```

Replace it with:

```ts
documents: caseData.documents.map((doc: any) => ({
    id: doc.id,
    fileName: doc.fileName,
    fileType: doc.fileType,
    fileSize: doc.fileSize,
    documentControlNumber: doc.documentControlNumber,
    category: doc.category,
    createdAt: doc.createdAt,
    uploadedBy: decryptUser(doc.uploadedBy),
    annotationCount: doc._count.annotations,
})),
```

- [ ] **Step 3: Verify the dev server compiles without errors**

Run: `npm run dev` in `accommally/`
Expected: No TypeScript or build errors in the terminal output.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cases/[id]/route.ts
git commit -m "feat: include annotation count in case document list response"
```

---

## Task 2: Create the document DELETE API route

**Files:**
- Create: `src/app/api/documents/[id]/route.ts`

- [ ] **Step 1: Create the route file**

Create `src/app/api/documents/[id]/route.ts` with the following content:

```ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

/**
 * DELETE /api/documents/[id] - Permanently delete a document and its annotations
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { session, error } = await requireAuth();
        if (error) return error;

        const { id } = await params;
        const tenantPrisma = withTenantScope(prisma, session.tenantId);

        const document = await tenantPrisma.document.findUnique({ where: { id } });
        if (!document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        // Annotations are deleted automatically via onDelete: Cascade in schema
        await tenantPrisma.document.delete({ where: { id } });

        return new NextResponse(null, { status: 204 });

    } catch (error) {
        logger.error({ err: error }, 'Error deleting document:');
        return NextResponse.json(
            { error: 'Failed to delete document' },
            { status: 500 }
        );
    }
}
```

- [ ] **Step 2: Verify the dev server compiles without errors**

Run: `npm run dev` in `accommally/`
Expected: No TypeScript or build errors.

- [ ] **Step 3: Smoke-test the endpoint manually**

In the browser, open DevTools → Network. Navigate to a case with a document. Copy a document id from the network response. In the console run:

```js
fetch('/api/documents/<paste-id-here>', { method: 'DELETE' }).then(r => console.log(r.status))
```

Expected: `204`

Refresh the page and confirm the document is gone.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/documents/[id]/route.ts
git commit -m "feat: add DELETE endpoint for documents"
```

---

## Task 3: Wire inline confirmation UI in CaseDetailPage

**Files:**
- Modify: `src/components/CaseDetailPage.tsx`

- [ ] **Step 1: Update the `ExtendedDocument` type**

Find the type definition around line 88:

```ts
type ExtendedDocument = Document & {
    uploadedBy: { name: string | null };
};
```

Replace with:

```ts
type ExtendedDocument = Document & {
    uploadedBy: { name: string | null };
    annotationCount: number;
};
```

- [ ] **Step 2: Add state variables**

In the Modal States block (around line 133), add two new state variables after the existing document state lines:

```ts
const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
```

- [ ] **Step 3: Add the delete handler**

Add this function near the other document handlers (e.g., after `handleDownloadDocument`):

```ts
const handleDeleteDocument = async (docId: string) => {
    setDeletingDocumentId(docId);
    try {
        const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
        if (res.ok) {
            await fetchCaseData();
        } else {
            alert('Failed to delete document. Please try again.');
        }
    } catch {
        alert('Failed to delete document. Please try again.');
    } finally {
        setDeletingDocumentId(null);
        setConfirmingDeleteId(null);
    }
};
```

- [ ] **Step 4: Replace the action cell in the document table row**

Find the action `<td>` in the Documents tab (around line 1475):

```tsx
<td className="px-6 py-4">
    <div className="flex items-center gap-2">
        <button
            onClick={() => setViewingDocument(doc)}
            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="View"
            aria-label={`View ${doc.fileName}`}
        >
            <Eye className="w-4 h-4" />
        </button>
        <button
            onClick={() => handleDownloadDocument(doc.id, doc.fileName, doc.fileType)}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Download"
            aria-label={`Download ${doc.fileName}`}
        >
            <Download className="w-4 h-4" />
        </button>
        <button
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            aria-label={`Delete ${doc.fileName}`}
        >
            <Trash2 className="w-4 h-4" />
        </button>
    </div>
</td>
```

Replace with:

```tsx
<td className="px-6 py-4">
    {confirmingDeleteId === doc.id ? (
        <div className="flex items-center gap-2">
            <span className="text-xs text-red-600 dark:text-red-400">
                {doc.annotationCount > 0
                    ? `Has ${doc.annotationCount} annotation(s). Delete permanently?`
                    : 'Delete permanently?'}
            </span>
            <button
                onClick={() => setConfirmingDeleteId(null)}
                className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded transition-colors"
            >
                Cancel
            </button>
            <button
                onClick={() => handleDeleteDocument(doc.id)}
                disabled={deletingDocumentId === doc.id}
                className="px-2 py-1 text-xs text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            >
                {deletingDocumentId === doc.id ? 'Deleting…' : 'Delete'}
            </button>
        </div>
    ) : (
        <div className="flex items-center gap-2">
            <button
                onClick={() => setViewingDocument(doc)}
                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="View"
                aria-label={`View ${doc.fileName}`}
            >
                <Eye className="w-4 h-4" />
            </button>
            <button
                onClick={() => handleDownloadDocument(doc.id, doc.fileName, doc.fileType)}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Download"
                aria-label={`Download ${doc.fileName}`}
            >
                <Download className="w-4 h-4" />
            </button>
            <button
                onClick={() => setConfirmingDeleteId(doc.id)}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete"
                aria-label={`Delete ${doc.fileName}`}
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    )}
</td>
```

- [ ] **Step 5: Verify the dev server compiles without TypeScript errors**

Run: `npm run dev` in `accommally/`
Expected: No errors in the terminal.

- [ ] **Step 6: Test the golden path in the browser**

1. Navigate to a case with at least one document that has annotations.
2. Click the Trash icon — confirm the row switches to inline confirmation showing the annotation count warning.
3. Click **Cancel** — confirm the row reverts to normal action buttons.
4. Click Trash again, then **Delete** — confirm the button shows "Deleting…" while in flight, then the document disappears from the list.
5. Upload a new document (no annotations), click Trash — confirm the warning says "Delete permanently?" without a count.

- [ ] **Step 7: Commit**

```bash
git add src/components/CaseDetailPage.tsx
git commit -m "feat: inline delete confirmation for documents with annotation warning"
```
