# Document Delete — Design Spec
**Date:** 2026-04-19

## Overview

Add a working delete action to the Documents tab on the Case Detail page. Clicking the trash icon replaces the row's action buttons with an inline confirmation that warns the user if the document has annotations. On confirmation, the document and its annotations are permanently deleted.

A follow-up task will roll this inline confirmation pattern out to all other delete operations in the app.

---

## API

**New route:** `DELETE /api/documents/[id]/route.ts`

- Authenticates via `requireAuth`
- Enforces tenant isolation via `withTenantScope(prisma, session.tenantId)`
- Calls `prisma.document.delete({ where: { id } })`
- Annotations are deleted automatically via Prisma cascade (already defined in schema)
- Returns `204 No Content` on success
- Returns `404` if document not found within tenant scope
- Returns `401` if unauthenticated

---

## UI

**File:** `src/components/CaseDetailPage.tsx`

### State

Add one new state variable:

```ts
const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
```

### Handler

Add `handleDeleteDocument`:

```ts
async function handleDeleteDocument(docId: string) {
  setDeletingDocumentId(docId); // loading state on the Delete button
  const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
  if (res.ok) {
    await fetchCaseData();
  } else {
    alert('Failed to delete document. Please try again.');
  }
  setDeletingDocumentId(null);
  setConfirmingDeleteId(null);
}
```

A second state variable `deletingDocumentId: string | null` tracks the in-flight request so the Delete button can show a disabled/loading state.

### Row Action Column

The action cell renders conditionally on `confirmingDeleteId === doc.id`:

**Normal state** (existing buttons, unchanged):
- View (Eye icon)
- Download (Download icon)
- Delete (Trash2 icon) → `onClick: () => setConfirmingDeleteId(doc.id)`

**Confirming state** (replaces action buttons):
- Warning text:
  - If `doc.annotations.length > 0`: `"Has {n} annotation(s). Delete permanently?"`
  - Otherwise: `"Delete permanently?"`
- **Cancel** button → `onClick: () => setConfirmingDeleteId(null)`
- **Delete** button → `onClick: () => handleDeleteDocument(doc.id)`, disabled while `deletingDocumentId === doc.id`

### Document data shape

The existing `caseData.documents` array items already include an `annotations` field (the relation is included in the `GET /api/cases/[id]` response). Confirm this during implementation; if annotations are not included, add them to the case fetch select.

---

## Error Handling

- API failure: show `alert('Failed to delete document. Please try again.')` and reset state (do not close the inline confirmation)
- Success: `fetchCaseData()` refreshes the document list; the deleted row disappears naturally

---

## Out of Scope

- Soft delete / recovery
- Audit log entry for document deletion
- Rolling the inline pattern to other delete operations (separate follow-up task)
