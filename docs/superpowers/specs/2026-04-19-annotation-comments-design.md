# Annotation Comments Feature Design

**Date:** 2026-04-19  
**Status:** Approved  

---

## Overview

Replace the existing broken `Annotation` model with a unified `AnnotationComment` system that supports:
- PDF highlight annotations with optional text comments
- Email/message text selection highlights with comments
- Document-level and email-level freeform notes
- Threaded replies on any annotation
- 24-hour edit window, soft delete, tenant-wide visibility

---

## Data Model

Drop the existing `Annotation` table entirely (no data migration needed — feature was non-functional in prod). Create a new `AnnotationComment` table.

```prisma
enum AnnotationCommentType {
  HIGHLIGHT_PDF
  HIGHLIGHT_EMAIL
  DOCUMENT_NOTE
  EMAIL_NOTE
}

model AnnotationComment {
  id          String    @id @default(cuid())
  tenantId    String
  tenant      Tenant    @relation(fields: [tenantId], references: [id])

  documentId  String?
  document    Document? @relation(fields: [documentId], references: [id], onDelete: Cascade)

  messageId   String?
  message     Message?  @relation(fields: [messageId], references: [id], onDelete: Cascade)

  parentId    String?
  parent      AnnotationComment?  @relation("Replies", fields: [parentId], references: [id])
  replies     AnnotationComment[] @relation("Replies")

  type        AnnotationCommentType

  content     String
  deletedAt   DateTime?

  // Highlight color — applies to HIGHLIGHT_PDF and HIGHLIGHT_EMAIL (null for notes)
  color       String?   @default("#FFFF00")

  // PDF highlight fields (null for email highlights and notes)
  pageNumber  Int?
  x           Float?
  y           Float?
  width       Float?
  height      Float?

  // Email text selection fields (null for PDF and notes)
  selectedText    String?
  selectionStart  Int?
  selectionEnd    Int?

  createdById String
  createdBy   User      @relation(fields: [createdById], references: [id])
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([tenantId, documentId])
  @@index([tenantId, messageId])
  @@index([tenantId, createdById])
}
```

**Constraints (enforced in API layer):**
- Exactly one of `documentId` or `messageId` must be non-null
- `parentId` may only reference a root annotation (no replies to replies)
- Soft delete: `deletedAt` set on delete; `content` replaced with `"[deleted]"` in responses
- Edit/delete locked 24 hours after `createdAt` (except `ADMIN` role)

---

## API Routes

All routes require auth via `requireAuth()` and tenant scope via `withTenantScope()`. Audit log entries created on create, edit, and delete.

### Document Annotation Comments

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/documents/[id]/annotation-comments` | List all as nested tree (root + replies[]) |
| `POST` | `/api/documents/[id]/annotation-comments` | Create root annotation or document-level note |
| `PATCH` | `/api/documents/[id]/annotation-comments/[cid]` | Edit content (24hr window) |
| `DELETE` | `/api/documents/[id]/annotation-comments/[cid]` | Soft delete |
| `POST` | `/api/documents/[id]/annotation-comments/[cid]/replies` | Add threaded reply |

### Email/Message Annotation Comments

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/messages/[id]/annotation-comments` | List all as nested tree |
| `POST` | `/api/messages/[id]/annotation-comments` | Create root annotation or email-level note |
| `PATCH` | `/api/messages/[id]/annotation-comments/[cid]` | Edit content (24hr window) |
| `DELETE` | `/api/messages/[id]/annotation-comments/[cid]` | Soft delete |
| `POST` | `/api/messages/[id]/annotation-comments/[cid]/replies` | Add threaded reply |

### Shared API Behaviour

- `GET` returns root annotations sorted by `createdAt`, each with a `replies[]` array
- Soft-deleted entries: `content` → `"[deleted]"`, `deletedAt` populated, replies still visible
- `PATCH`/`DELETE` blocked with `409` if annotation is older than 24 hours (non-admin)
- Creator or `ADMIN` can edit/delete; all tenant members can read
- `400` if both `documentId` and `messageId` provided, or neither
- `400` if `parentId` references another reply (max one level deep)
- `404` if annotation not found or belongs to different tenant
- `410 Gone` if attempting to edit/delete a soft-deleted annotation

---

## UI Components

### Document Viewer (`DocumentViewer.tsx`)

Replace the existing broken annotation overlay entirely.

**PDF highlights:**
- Toolbar toggle button enters "annotation mode"
- Click-drag on PDF canvas draws a highlight region; on release, a popover opens with a text field (optional comment) and color picker
- Saving creates `HIGHLIGHT_PDF` annotation
- Existing highlights render as colored overlays on the PDF canvas
- Clicking a highlight opens the `AnnotationThreadPanel` (slides in from right)

**Document-level notes:**
- "Add note" button in the viewer toolbar creates a `DOCUMENT_NOTE`
- Opens `AnnotationThreadPanel` without an associated highlight region

### Email/Message View (`messages/page.tsx`)

**Email text highlights:**
- Selecting text in the email body reveals a floating mini-toolbar with a highlight button and color picker
- Confirming captures `selectionStart`, `selectionEnd`, `selectedText` and creates `HIGHLIGHT_EMAIL`
- Highlighted passages rendered as inline `<mark>` elements with the chosen color
- Clicking a highlight opens the `AnnotationThreadPanel`

**Email-level notes:**
- "Add note" button in the email header creates an `EMAIL_NOTE`
- Opens `AnnotationThreadPanel` without a text selection

### `AnnotationThreadPanel` (new shared component)

A reusable slide-in panel used by both document and email views.

- Lists root comment + replies chronologically
- Each entry: author avatar/name, relative timestamp, content, Edit/Delete buttons
- Edit/Delete buttons visible only within 24-hour window; lock icon shown after
- Soft-deleted entries display `[deleted]` in italics; thread continues below
- Reply input field at panel bottom with submit button
- Optimistic updates: comment appears immediately, reverts with error toast on API failure

---

## Error Handling & Edge Cases

| Scenario | Handling |
|----------|----------|
| Edit/delete after 24hr (non-admin) | `409` from API; Edit/Delete buttons hidden client-side |
| Soft-deleted annotation receiving reply | Allowed; thread continues |
| Edit/delete of soft-deleted annotation | `410 Gone` |
| Document/message fails to load | Annotation mode disabled; panel hidden |
| XSS in email HTML affecting selection offsets | DOMPurify sanitization applied before offset calculation |
| Deleted parent annotation | Highlight renders greyed out; replies still anchored to region |
| `parentId` pointing to a reply | `400 Bad Request` |
| Both or neither `documentId`/`messageId` set | `400 Bad Request` |

---

## Migration

1. Prisma migration drops `Annotation` table and creates `AnnotationComment`
2. Remove `annotations` relation from `Document` model
3. Add `annotationComments` relation to both `Document` and `Message` models
4. No data migration required (existing annotation feature was non-functional in prod)
5. Delete old annotation API routes under `/api/documents/[id]/annotations/`
