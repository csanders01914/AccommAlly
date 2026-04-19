# Rich Text Editor Upgrade

**Date:** 2026-04-09  
**Status:** Approved

## Overview

Upgrade the compose message editor from a bare Tiptap `StarterKit` with no toolbar to a full-featured rich text editor supporting text formatting, font family/size, inline images, HTML source view, links, and email attachments.

## Scope

- `src/components/RichTextEditor.tsx` — add toolbar and new extensions
- `src/app/messages/page.tsx` — wire attachments into compose/send/view flows
- `prisma/schema.prisma` — new `MessageAttachment` model
- `src/app/api/messages/route.ts` and related routes — multipart upload, attachment download

Out of scope: rich text in any view other than the message compose area.

---

## Section 1: Toolbar & Text Formatting

### New packages

```
@tiptap/extension-underline
@tiptap/extension-text-style
@tiptap/extension-font-family
@tiptap/extension-link
@tiptap/extension-image
```

Font size is implemented as a custom `TextStyle` mark attribute — no additional package.

### Toolbar layout (left to right)

| Group | Controls |
|---|---|
| Font | Font family combobox · Font size input + presets |
| Formatting | Bold · Italic · Underline · Strikethrough |
| Lists | Bullet list · Ordered list |
| Insert | Link · Image · HTML source toggle |

### Font family combobox

- Text input + dropdown
- Preset list: Arial, Georgia, Times New Roman, Courier New, Trebuchet MS, Verdana, Helvetica, Tahoma, Impact, Comic Sans MS, Palatino, Garamond
- User may type any custom font name not in the list
- Applies via `editor.chain().setFontFamily(value).run()`

### Font size

- Small number input with up/down arrow buttons
- Preset dropdown: 8, 9, 10, 11, 12, 14, 16, 18, 24, 36 pt
- Stored as a `fontSize` attribute on the `TextStyle` mark, rendered as `font-size: Xpt` inline style
- Custom extension — ~20 lines extending `TextStyle`

### Formatting buttons

All icon toggle buttons, highlighted when the mark is active at cursor:
- **Bold** — `toggleBold()`
- *Italic* — `toggleItalic()`
- Underline — `toggleUnderline()` (new extension)
- ~~Strikethrough~~ — `toggleStrike()` (already in StarterKit)

### Link

- Toolbar button opens a small inline popover with a URL input and "Apply" / "Remove" actions
- Applies via `editor.chain().setLink({ href })` / `unsetLink()`
- Links open in `_blank` with `rel="noopener noreferrer"` by default

---

## Section 2: Inline Images

Uses `@tiptap/extension-image`.

### Three insertion paths

1. **File picker button** — `<input type="file" accept="image/*">` (hidden, triggered by toolbar button). Selected file is read as a base64 data URL and inserted via `editor.chain().setImage({ src: dataUrl }).run()`.

2. **Clipboard paste** — `handlePaste` editor prop intercepts `ClipboardEvent` items with `type.startsWith('image/')`, converts to data URL, inserts.

3. **Drag-and-drop** — `handleDrop` editor prop reads `DataTransfer` files with `type.startsWith('image/')`, converts to data URL, inserts.

### Storage

Images are stored inline as base64 data URLs in the HTML body. No separate upload endpoint. Consistent with how template HTML is stored today.

---

## Section 3: HTML Source View

A `</>` toggle button switches between two render modes within the same editor container:

- **Rich mode** (default) — `<EditorContent editor={editor} />`
- **Source mode** — a `<textarea>` pre-populated with `editor.getHTML()`. On switching back to rich mode, the textarea value is applied via `editor.commands.setContent(value)`.

Implemented via a `sourceMode: boolean` state in `RichTextEditor`. No extra package.

---

## Section 4: Attachments

### Database

New model added to `schema.prisma`:

```prisma
model MessageAttachment {
  id        String  @id @default(cuid())
  messageId String
  message   Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  filename  String
  mimeType  String
  size      Int
  data      Bytes
  createdAt DateTime @default(now())
}
```

`Message` model gains: `attachments MessageAttachment[]`

### API changes

| Endpoint | Change |
|---|---|
| `POST /api/messages` | Switches from JSON to `multipart/form-data`. Fields: `recipientId`, `subject`, `body`, `caseId`, `replyToId`, `forwardedFromId`, `isExternal`, `externalEmail`, `externalName` (all as form fields). Files: `attachments[]` (0 or more). |
| `GET /api/messages` / `GET /api/messages/[id]` | Returns attachment metadata array `[{ id, filename, size, mimeType }]` — no raw bytes. |
| `GET /api/messages/[id]/attachments/[attachmentId]` | New route. Streams `data` as download with correct `Content-Type` and `Content-Disposition`. Protected via `requireAuth()` — access verified by checking the parent message's `tenantId` matches the session. |

**Validation:** 10 MB per file, max 10 files per message. Enforced client-side (with user-facing error) and server-side (400 response).

### Compose UI

- Paperclip button in the toolbar opens a file picker (any file type)
- Attached files shown as chips below the editor: `📎 filename.pdf  42 KB  ✕`
- Remove button on each chip removes it from the pending list
- Chips are client-side only until the message is sent

### Message view UI

Attachments shown below the message body as a list of download links:
```
Attachments
📎 filename.pdf (42 KB)   [Download]
```

---

## Files to Create / Modify

| File | Action |
|---|---|
| `src/components/RichTextEditor.tsx` | Rewrite — add toolbar, new extensions, source mode, image handling |
| `src/app/messages/page.tsx` | Add attachment state to ComposeView, switch all send paths (new, reply, forward) to multipart, render attachments in MessageView |
| `prisma/schema.prisma` | Add `MessageAttachment` model, add relation to `Message` |
| `src/app/api/messages/route.ts` | Accept multipart, save attachments |
| `src/app/api/messages/[id]/route.ts` | Return attachment metadata |
| `src/app/api/messages/[id]/attachments/[attachmentId]/route.ts` | New — file download |

---

## Constraints & Notes

- Inline images as base64 will increase stored HTML body size. Acceptable for now given typical email compose sizes.
- The `applyTemplate` flow in `LoadTemplateModal` passes HTML to `editor.commands.setContent()` — this is unaffected by the upgrade.
- The `immediatelyRender: false` fix already in place remains.
