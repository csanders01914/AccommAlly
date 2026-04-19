# Rich Text Editor Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the message compose editor with a full formatting toolbar, inline images, HTML source view, and email attachments.

**Architecture:** Rewrite `RichTextEditor.tsx` to add a toolbar with Tiptap extensions for font family, font size, underline, link, and image. Add a `MessageAttachment` Prisma model, update `POST /api/messages` to accept multipart form data, and add an attachment download route. Wire pending attachments state into `MessagesContent` and display attachment chips in `ComposeView` and download links in `MessageDetail`.

**Tech Stack:** Tiptap v3 (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-underline`, `@tiptap/extension-text-style`, `@tiptap/extension-font-family`, `@tiptap/extension-link`, `@tiptap/extension-image`), Prisma, Next.js App Router, Lucide React

---

## File Map

| File | Action |
|---|---|
| `src/components/RichTextEditor.tsx` | Full rewrite — toolbar, all extensions, image paste/drop, HTML source view, `onAttach` callback |
| `prisma/schema.prisma` | Add `MessageAttachment` model; add `attachments` relation to `Message` |
| `src/app/api/messages/route.ts` | Switch `POST` from JSON to multipart; save attachments after message creation |
| `src/app/api/messages/[id]/attachments/[attachmentId]/route.ts` | New — authenticated file download |
| `src/app/messages/page.tsx` | Add `pendingAttachments` state; update `handleSend`; pass props to `ComposeView`; add attachment chips to `ComposeView`; add attachment list to `MessageDetail` |

---

## Task 1: Install Tiptap extension packages

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install packages**

```bash
cd C:/Users/csand/Documents/Projects/AccommAlly/accommally
npm install @tiptap/extension-underline @tiptap/extension-text-style @tiptap/extension-font-family @tiptap/extension-link @tiptap/extension-image
```

Expected: packages added to `node_modules` and `package.json`, no peer-dependency errors.

- [ ] **Step 2: Verify install**

```bash
grep -E "extension-underline|extension-text-style|extension-font-family|extension-link|extension-image" package.json
```

Expected: all five packages listed under `dependencies`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install tiptap formatting extensions"
```

---

## Task 2: Add MessageAttachment Prisma model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add model and relation to schema**

Open `prisma/schema.prisma`. After the closing `}` of the `Message` model (currently ends around line 501), add:

```prisma
  attachments        MessageAttachment[]
```

to the `Message` model (before the `@@index` lines), then append the new model after:

```prisma
model MessageAttachment {
  id        String   @id @default(cuid())
  messageId String
  message   Message  @relation(fields: [messageId], references: [id], onDelete: Cascade)
  filename  String
  mimeType  String
  size      Int
  data      Bytes
  createdAt DateTime @default(now())

  @@index([messageId])
}
```

- [ ] **Step 2: Run migration**

```bash
cd C:/Users/csand/Documents/Projects/AccommAlly/accommally
npx prisma migrate dev --name add-message-attachments
```

Expected: migration file created in `prisma/migrations/`, Prisma client regenerated.

- [ ] **Step 3: Verify client regenerated**

```bash
npx prisma generate
```

Expected: "Generated Prisma Client" with no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add MessageAttachment model"
```

---

## Task 3: Rewrite RichTextEditor with full toolbar

**Files:**
- Modify: `src/components/RichTextEditor.tsx`

- [ ] **Step 1: Replace the file with the full implementation**

Replace the entire contents of `src/components/RichTextEditor.tsx` with:

```tsx
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough,
    Link2, Image as ImageIcon, Code2, List, ListOrdered,
    Paperclip, ChevronDown,
} from 'lucide-react';

// ─── FontSize extension ───────────────────────────────────────────────────────

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        fontSize: {
            setFontSize: (fontSize: string) => ReturnType;
            unsetFontSize: () => ReturnType;
        };
    }
}

const FontSize = Extension.create({
    name: 'fontSize',
    addOptions() {
        return { types: ['textStyle'] };
    },
    addGlobalAttributes() {
        return [{
            types: this.options.types,
            attributes: {
                fontSize: {
                    default: null,
                    parseHTML: el => el.style.fontSize?.replace(/[^0-9.]/g, '') || null,
                    renderHTML: attrs => attrs.fontSize ? { style: `font-size: ${attrs.fontSize}pt` } : {},
                },
            },
        }];
    },
    addCommands() {
        return {
            setFontSize: (fontSize: string) => ({ chain }) =>
                chain().setMark('textStyle', { fontSize }).run(),
            unsetFontSize: () => ({ chain }) =>
                chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
        };
    },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fileToDataUrl(file: File): Promise<string> {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
    });
}

const FONT_PRESETS = [
    'Arial', 'Georgia', 'Times New Roman', 'Courier New',
    'Trebuchet MS', 'Verdana', 'Helvetica', 'Tahoma',
    'Impact', 'Comic Sans MS', 'Palatino', 'Garamond',
];
const SIZE_PRESETS = ['8', '9', '10', '11', '12', '14', '16', '18', '24', '36'];

// ─── Toolbar sub-components ───────────────────────────────────────────────────

function ToolbarBtn({
    onClick, active, title, children, disabled,
}: {
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onMouseDown={e => { e.preventDefault(); onClick(); }}
            title={title}
            disabled={disabled}
            className={cn(
                'p-1.5 rounded transition-colors',
                active
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700',
                disabled && 'opacity-40 cursor-not-allowed',
            )}
        >
            {children}
        </button>
    );
}

function Divider() {
    return <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5 self-center" />;
}

function FontFamilyPicker({ editor }: { editor: ReturnType<typeof useEditor> }) {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    const current: string = editor?.getAttributes('textStyle').fontFamily || '';

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    function apply(font: string) {
        if (!editor) return;
        if (font) editor.chain().focus().setFontFamily(font).run();
        else editor.chain().focus().unsetFontFamily().run();
        setOpen(false);
        setInput('');
    }

    const filtered = input
        ? FONT_PRESETS.filter(f => f.toLowerCase().includes(input.toLowerCase()))
        : FONT_PRESETS;

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onMouseDown={e => { e.preventDefault(); setOpen(v => !v); }}
                className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-700 min-w-[90px] max-w-[120px]"
                style={{ fontFamily: current || 'inherit' }}
            >
                <span className="truncate flex-1 text-left">{current || 'Font'}</span>
                <ChevronDown className="w-3 h-3 flex-shrink-0" />
            </button>
            {open && (
                <div className="absolute top-full left-0 z-50 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && input.trim()) apply(input.trim());
                            if (e.key === 'Escape') setOpen(false);
                        }}
                        placeholder="Type font name…"
                        className="w-full px-2 py-1.5 text-xs border-b border-gray-200 dark:border-gray-700 bg-transparent outline-none dark:text-white"
                        autoFocus
                    />
                    <div className="max-h-48 overflow-y-auto">
                        {filtered.map(f => (
                            <button
                                key={f}
                                type="button"
                                onMouseDown={e => { e.preventDefault(); apply(f); }}
                                className={cn(
                                    'w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200',
                                    current === f && 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
                                )}
                                style={{ fontFamily: f }}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function FontSizePicker({ editor }: { editor: ReturnType<typeof useEditor> }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const current: string = editor?.getAttributes('textStyle').fontSize || '12';

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    function apply(size: string) {
        if (!editor) return;
        editor.chain().focus().setFontSize(size).run();
        setOpen(false);
    }

    function step(delta: number) {
        const next = Math.min(96, Math.max(6, Number(current) + delta));
        apply(String(next));
    }

    return (
        <div ref={ref} className="relative flex items-center gap-0.5">
            <button
                type="button"
                onMouseDown={e => { e.preventDefault(); step(-1); }}
                className="px-1 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 text-sm leading-none"
                title="Decrease font size"
            >−</button>
            <button
                type="button"
                onMouseDown={e => { e.preventDefault(); setOpen(v => !v); }}
                className="w-10 text-center text-xs border border-gray-200 dark:border-gray-700 rounded px-1 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200"
                title="Font size"
            >
                {current}
            </button>
            {open && (
                <div className="absolute top-full left-0 z-50 mt-1 w-14 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
                    {SIZE_PRESETS.map(s => (
                        <button
                            key={s}
                            type="button"
                            onMouseDown={e => { e.preventDefault(); apply(s); }}
                            className={cn(
                                'w-full text-center px-2 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200',
                                current === s && 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300',
                            )}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}
            <button
                type="button"
                onMouseDown={e => { e.preventDefault(); step(1); }}
                className="px-1 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 text-sm leading-none"
                title="Increase font size"
            >+</button>
        </div>
    );
}

function LinkButton({ editor }: { editor: ReturnType<typeof useEditor> }) {
    const [open, setOpen] = useState(false);
    const [url, setUrl] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    const isActive = editor?.isActive('link') ?? false;

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    function toggleOpen() {
        if (!open && isActive) setUrl(editor?.getAttributes('link').href || '');
        setOpen(v => !v);
    }

    function apply() {
        if (!editor || !url.trim()) return;
        const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
        editor.chain().focus().setLink({ href }).run();
        setOpen(false);
        setUrl('');
    }

    function remove() {
        editor?.chain().focus().unsetLink().run();
        setOpen(false);
        setUrl('');
    }

    return (
        <div ref={ref} className="relative">
            <ToolbarBtn onClick={toggleOpen} active={isActive} title="Link">
                <Link2 className="w-4 h-4" />
            </ToolbarBtn>
            {open && (
                <div className="absolute top-full left-0 z-50 mt-1 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg flex gap-1 min-w-[240px]">
                    <input
                        type="url"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') apply();
                            if (e.key === 'Escape') setOpen(false);
                        }}
                        placeholder="https://..."
                        className="flex-1 px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded bg-transparent outline-none dark:text-white"
                        autoFocus
                    />
                    <button
                        type="button"
                        onClick={apply}
                        className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                        Apply
                    </button>
                    {isActive && (
                        <button
                            type="button"
                            onClick={remove}
                            className="px-2 py-1 text-xs text-red-500 hover:text-red-700 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                            Remove
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface RichTextEditorProps {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
    className?: string;
    minHeight?: string;
    onAttach?: (files: File[]) => void;
}

export function RichTextEditor({
    content,
    onChange,
    placeholder = 'Write your message…',
    className,
    minHeight = '12rem',
    onAttach,
}: RichTextEditorProps) {
    const [sourceMode, setSourceMode] = useState(false);
    const [sourceHtml, setSourceHtml] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const attachInputRef = useRef<HTMLInputElement>(null);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Underline,
            TextStyle,
            FontFamily,
            FontSize,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
            }),
            Image.configure({ inline: false, allowBase64: true }),
        ],
        content,
        editorProps: {
            attributes: {
                class: 'outline-none prose prose-sm dark:prose-invert max-w-none p-3 text-sm',
                'data-placeholder': placeholder,
            },
            handlePaste(view, event) {
                const items = Array.from(event.clipboardData?.items ?? []);
                const imageItem = items.find(i => i.type.startsWith('image/'));
                if (!imageItem) return false;
                const file = imageItem.getAsFile();
                if (!file) return false;
                fileToDataUrl(file).then(src => {
                    const { schema, tr, selection } = view.state;
                    const node = schema.nodes.image?.create({ src });
                    if (!node) return;
                    view.dispatch(tr.replaceSelectionWith(node));
                });
                return true;
            },
            handleDrop(view, event) {
                const files = Array.from(event.dataTransfer?.files ?? []);
                const imageFile = files.find(f => f.type.startsWith('image/'));
                if (!imageFile) return false;
                event.preventDefault();
                fileToDataUrl(imageFile).then(src => {
                    const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
                    if (!pos) return;
                    const { schema, tr } = view.state;
                    const node = schema.nodes.image?.create({ src });
                    if (!node) return;
                    view.dispatch(tr.insert(pos.pos, node));
                });
                return true;
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    // Sync content from parent when not focused (e.g. template load)
    useEffect(() => {
        if (!editor || editor.isFocused) return;
        if (content !== editor.getHTML()) {
            editor.commands.setContent(content, { emitUpdate: false });
        }
    }, [content, editor]);

    function insertImageFromFile() {
        fileInputRef.current?.click();
    }

    async function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file || !editor) return;
        const src = await fileToDataUrl(file);
        editor.chain().focus().setImage({ src }).run();
        e.target.value = '';
    }

    function handleAttachFiles(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []);
        if (files.length > 0) onAttach?.(files);
        e.target.value = '';
    }

    function toggleSourceMode() {
        if (!editor) return;
        if (!sourceMode) {
            setSourceHtml(editor.getHTML());
        } else {
            editor.commands.setContent(sourceHtml, { emitUpdate: true });
        }
        setSourceMode(v => !v);
    }

    return (
        <div className={cn('border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden dark:bg-gray-800', className)}>
            {/* Hidden file inputs */}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFileChange} />
            <input ref={attachInputRef} type="file" multiple className="hidden" onChange={handleAttachFiles} />

            {/* Toolbar */}
            {editor && (
                <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <FontFamilyPicker editor={editor} />
                    <FontSizePicker editor={editor} />
                    <Divider />
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
                        <Bold className="w-4 h-4" />
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
                        <Italic className="w-4 h-4" />
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
                        <UnderlineIcon className="w-4 h-4" />
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
                        <Strikethrough className="w-4 h-4" />
                    </ToolbarBtn>
                    <Divider />
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
                        <List className="w-4 h-4" />
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered list">
                        <ListOrdered className="w-4 h-4" />
                    </ToolbarBtn>
                    <Divider />
                    <LinkButton editor={editor} />
                    <ToolbarBtn onClick={insertImageFromFile} title="Insert image">
                        <ImageIcon className="w-4 h-4" />
                    </ToolbarBtn>
                    {onAttach && (
                        <ToolbarBtn onClick={() => attachInputRef.current?.click()} title="Attach file">
                            <Paperclip className="w-4 h-4" />
                        </ToolbarBtn>
                    )}
                    <Divider />
                    <ToolbarBtn onClick={toggleSourceMode} active={sourceMode} title="HTML source">
                        <Code2 className="w-4 h-4" />
                    </ToolbarBtn>
                </div>
            )}

            {/* Editor body */}
            {sourceMode ? (
                <textarea
                    value={sourceHtml}
                    onChange={e => setSourceHtml(e.target.value)}
                    className="w-full p-3 text-xs font-mono bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 outline-none resize-none"
                    style={{ minHeight }}
                    spellCheck={false}
                />
            ) : (
                <div style={{ minHeight }}>
                    <EditorContent editor={editor} />
                </div>
            )}
        </div>
    );
}

export default RichTextEditor;
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd C:/Users/csand/Documents/Projects/AccommAlly/accommally
npx tsc --noEmit 2>&1 | grep RichTextEditor
```

Expected: no output (no errors in the file).

- [ ] **Step 3: Commit**

```bash
git add src/components/RichTextEditor.tsx
git commit -m "feat: rewrite RichTextEditor with full formatting toolbar"
```

---

## Task 4: Update POST /api/messages to accept multipart and save attachments

**Files:**
- Modify: `src/app/api/messages/route.ts`

- [ ] **Step 1: Replace the POST handler**

In `src/app/api/messages/route.ts`, replace the entire `POST` function (lines 129–212) with:

```ts
export async function POST(request: NextRequest) {
    try {
        const { session, error } = await requireAuth();
        if (error) return error;
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const formData = await request.formData();
        const recipientId = formData.get('recipientId') as string | null;
        const subject = formData.get('subject') as string | null;
        const contentBody = formData.get('body') as string | null;
        const caseId = formData.get('caseId') as string | null;
        const replyToId = formData.get('replyToId') as string | null;
        const forwardedFromId = formData.get('forwardedFromId') as string | null;
        const isExternal = formData.get('isExternal') === 'true';
        const externalEmail = formData.get('externalEmail') as string | null;
        const externalName = formData.get('externalName') as string | null;
        const attachmentFiles = formData.getAll('attachments') as File[];

        // Validation
        if (isExternal) {
            if (!externalEmail || !externalName || !contentBody) {
                return NextResponse.json({ error: 'External Email, Name, and Body are required' }, { status: 400 });
            }
        } else {
            if (!recipientId || !contentBody) {
                return NextResponse.json({ error: 'Recipient and Body are required' }, { status: 400 });
            }
        }

        // Attachment validation
        const MAX_FILE_SIZE = 10 * 1024 * 1024;
        const realAttachments = attachmentFiles.filter(f => f.size > 0);
        if (realAttachments.length > 10) {
            return NextResponse.json({ error: 'Maximum 10 attachments per message' }, { status: 400 });
        }
        for (const file of realAttachments) {
            if (file.size > MAX_FILE_SIZE) {
                return NextResponse.json({ error: `File "${file.name}" exceeds 10MB limit` }, { status: 400 });
            }
        }

        let encryptedEmail = null;
        let emailHash = null;
        let encryptedName = null;

        if (isExternal) {
            encryptedEmail = encrypt(externalEmail!);
            emailHash = hash(externalEmail!);
            encryptedName = encrypt(externalName!);
        }

        const message = await prisma.message.create({
            data: {
                senderId: session.id,
                tenantId: session.tenantId,
                recipientId: isExternal ? null : recipientId,
                subject: subject || null,
                content: encrypt(contentBody!),
                caseId: caseId || null,
                replyToId: replyToId || null,
                forwardedFromId: forwardedFromId || null,
                read: false,
                isExternal: isExternal || false,
                externalEmail: encryptedEmail,
                externalEmailHash: emailHash,
                externalName: encryptedName,
                direction: isExternal ? 'OUTBOUND' : 'INTERNAL',
            },
        });

        // Save attachments
        if (realAttachments.length > 0) {
            const attachmentData = await Promise.all(
                realAttachments.map(async f => ({
                    messageId: message.id,
                    filename: f.name,
                    mimeType: f.type || 'application/octet-stream',
                    size: f.size,
                    data: Buffer.from(await f.arrayBuffer()),
                }))
            );
            await prisma.messageAttachment.createMany({ data: attachmentData });
        }

        // Audit log
        await prisma.auditLog.create({
            data: {
                entityType: 'Message',
                entityId: message.id,
                action: 'CREATE',
                userId: session.id,
                metadata: JSON.stringify({
                    recipientId: isExternal ? 'EXTERNAL' : recipientId,
                    subject: subject || 'No Subject',
                    caseId: caseId,
                    attachmentCount: realAttachments.length,
                }),
            },
        });

        // Apply inbound rules
        if (!isExternal && recipientId) {
            try {
                const { applyInboundRules } = await import('@/lib/rules');
                await applyInboundRules(message.id, recipientId);
            } catch (e) {
                console.error('Failed to trigger rules:', e);
            }
        }

        return NextResponse.json(message, { status: 201 });
    } catch (err) {
        console.error('Messages POST Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd C:/Users/csand/Documents/Projects/AccommAlly/accommally
npx tsc --noEmit 2>&1 | grep "api/messages/route"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/messages/route.ts
git commit -m "feat: accept multipart form data and save attachments in POST /api/messages"
```

---

## Task 5: Add attachment metadata to GET /api/messages response

**Files:**
- Modify: `src/app/api/messages/route.ts`

- [ ] **Step 1: Add attachments include to the GET query**

In `src/app/api/messages/route.ts`, find the `findMany` call in `GET` (around line 70). Change the `include` block to:

```ts
include: {
    sender: { select: { id: true, name: true, email: true } },
    recipient: { select: { id: true, name: true, email: true } },
    case: { select: { id: true, caseNumber: true, clientName: true } },
    attachments: { select: { id: true, filename: true, size: true, mimeType: true } },
}
```

- [ ] **Step 2: Add attachments to the formatted response**

In the same `GET` function, find the `formattedMessages` map. Add `attachments` to each mapped message object:

```ts
attachments: (m as any).attachments ?? [],
```

(Add this line after the `case` field in the mapped object.)

- [ ] **Step 3: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | grep "api/messages/route"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/messages/route.ts
git commit -m "feat: include attachment metadata in GET /api/messages"
```

---

## Task 6: Add attachment download route

**Files:**
- Create: `src/app/api/messages/[id]/attachments/[attachmentId]/route.ts`

- [ ] **Step 1: Create the route file**

Create `src/app/api/messages/[id]/attachments/[attachmentId]/route.ts` with:

```ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
    try {
        const { session, error } = await requireAuth();
        if (error) return error;

        const { id: messageId, attachmentId } = await params;

        const attachment = await prisma.messageAttachment.findUnique({
            where: { id: attachmentId },
            include: { message: { select: { tenantId: true, senderId: true, recipientId: true } } },
        });

        if (
            !attachment ||
            attachment.message.tenantId !== session.tenantId ||
            attachment.messageId !== messageId
        ) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const safeName = attachment.filename.replace(/[^\w.\-]/g, '_');
        return new NextResponse(attachment.data, {
            headers: {
                'Content-Type': attachment.mimeType,
                'Content-Disposition': `attachment; filename="${safeName}"`,
                'Content-Length': String(attachment.size),
            },
        });
    } catch (err) {
        console.error('Attachment download error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | grep "attachments"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/messages/[id]/attachments/
git commit -m "feat: add attachment download route"
```

---

## Task 7: Wire attachments into MessagesContent and ComposeView

**Files:**
- Modify: `src/app/messages/page.tsx`

- [ ] **Step 1: Add `attachments` to the Message interface**

Find the `interface Message` (line 51). Add after `case?`:

```ts
attachments?: { id: string; filename: string; size: number; mimeType: string }[];
```

- [ ] **Step 2: Add pendingAttachments state to MessagesContent**

In `MessagesContent` (the main component), near where `composeData` state is declared (around line 106), add:

```ts
const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);
```

Also add the import at the top of the file if `File` type isn't already available (it's a browser global, no import needed).

- [ ] **Step 3: Update handleSend to use FormData**

Replace the `handleSend` function (lines 362–403) with:

```ts
const handleSend = async () => {
    const isValid = composeData.isExternal
        ? (composeData.externalEmail && composeData.externalName && composeData.body)
        : (composeData.recipientId && composeData.body);

    if (!isValid) {
        alert('Please select a recipient and enter a message');
        return;
    }

    // Validate attachments client-side
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (pendingAttachments.length > 10) {
        alert('Maximum 10 attachments per message');
        return;
    }
    for (const file of pendingAttachments) {
        if (file.size > MAX_FILE_SIZE) {
            alert(`File "${file.name}" exceeds the 10MB limit`);
            return;
        }
    }

    try {
        const fd = new FormData();
        fd.append('recipientId', composeData.recipientId || '');
        fd.append('subject', composeData.subject || '');
        fd.append('body', composeData.body);
        fd.append('caseId', composeData.caseId || '');
        fd.append('replyToId', composeData.replyToId || '');
        fd.append('forwardedFromId', composeData.forwardedFromId || '');
        fd.append('isExternal', String(composeData.isExternal));
        fd.append('externalEmail', composeData.externalEmail || '');
        fd.append('externalName', composeData.externalName || '');
        for (const file of pendingAttachments) {
            fd.append('attachments', file);
        }

        // Do NOT pass Content-Type header — browser sets multipart boundary automatically for FormData
        const res = await apiFetch('/api/messages', { method: 'POST', body: fd });

        if (res.ok) {
            setIsComposeOpen(false);
            setComposeData({
                recipientId: '', subject: '', body: '', caseId: '', replyToId: '', forwardedFromId: '',
                isExternal: false, externalEmail: '', externalName: '',
            });
            setPendingAttachments([]);
            setComposeMode('new');
            if (activeBox === 'sent') fetchMessages();
        } else {
            const data = await res.json();
            alert(data.error || 'Failed to send message');
        }
    } catch (e) {
        console.error(e);
        alert('Failed to send message');
    }
};
```

**Important:** Remove the `'Content-Type': 'application/json'` header — the browser sets the correct multipart boundary automatically when using FormData.

- [ ] **Step 4: Clear pendingAttachments on compose close**

Find where `setIsComposeOpen(false)` is called in the close handler (around line 708). Add `setPendingAttachments([]);` after it:

```ts
onClose={() => { setIsComposeOpen(false); setComposeMode('new'); setPendingAttachments([]); }}
```

- [ ] **Step 5: Pass attachment props to ComposeView**

Find the `<ComposeView` usage (around line 700). Add two new props:

```tsx
<ComposeView
    mode={composeMode}
    data={composeData}
    users={users}
    cases={cases}
    currentUserId={currentUser?.id || ''}
    onChange={setComposeData}
    onSend={handleSend}
    onClose={() => { setIsComposeOpen(false); setComposeMode('new'); setPendingAttachments([]); }}
    pendingAttachments={pendingAttachments}
    onAttach={files => setPendingAttachments(prev => [...prev, ...files])}
    onRemoveAttachment={filename => setPendingAttachments(prev => prev.filter(f => f.name !== filename))}
/>
```

- [ ] **Step 6: Update ComposeView signature to accept attachment props**

Find the `ComposeView` function signature (line 927). Add to the props destructuring and type:

```ts
function ComposeView({
    mode,
    data,
    users,
    cases,
    currentUserId,
    onChange,
    onSend,
    onClose,
    pendingAttachments,
    onAttach,
    onRemoveAttachment,
}: {
    mode: 'new' | 'reply' | 'forward';
    data: ComposeData;
    users: UserData[];
    cases: Case[];
    currentUserId: string;
    onChange: (data: ComposeData) => void;
    onSend: () => void;
    onClose: () => void;
    pendingAttachments: File[];
    onAttach: (files: File[]) => void;
    onRemoveAttachment: (filename: string) => void;
}) {
```

- [ ] **Step 7: Pass onAttach to RichTextEditor and add attachment chips**

In `ComposeView`, find the `<RichTextEditor` usage (around line 1063). Add `onAttach`:

```tsx
<RichTextEditor
    content={data.body}
    onChange={body => onChange({ ...data, body })}
    placeholder="Write your message..."
    minHeight="12rem"
    onAttach={onAttach}
/>
```

Below the `<RichTextEditor` closing tag (before the `{showTemplateModal && ...}` block), add the attachment chips:

```tsx
{pendingAttachments.length > 0 && (
    <div className="flex flex-wrap gap-2 mt-2">
        {pendingAttachments.map(file => (
            <div
                key={file.name}
                className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-gray-700 dark:text-gray-300"
            >
                <Paperclip className="w-3 h-3 flex-shrink-0" />
                <span className="max-w-[140px] truncate">{file.name}</span>
                <span className="text-gray-400">({(file.size / 1024).toFixed(0)} KB)</span>
                <button
                    type="button"
                    onClick={() => onRemoveAttachment(file.name)}
                    className="text-gray-400 hover:text-red-500 ml-0.5"
                    title="Remove attachment"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>
        ))}
    </div>
)}
```

Make sure `Paperclip` is imported at the top of the file. Find the lucide-react import line and add it if missing.

- [ ] **Step 8: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | grep "messages/page"
```

Expected: no output.

- [ ] **Step 9: Commit**

```bash
git add src/app/messages/page.tsx
git commit -m "feat: wire attachment state into ComposeView and handleSend"
```

---

## Task 8: Display attachments in MessageDetail

**Files:**
- Modify: `src/app/messages/page.tsx`

- [ ] **Step 1: Add attachment list below message body**

In `MessageDetail`, find the `{/* Body */}` section (around line 902). After the closing `</div>` of the body `<div className="p-6">...</div>`, add:

```tsx
{/* Attachments */}
{message.attachments && message.attachments.length > 0 && (
    <div className="px-6 pb-4">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Attachments
        </p>
        <div className="space-y-1">
            {message.attachments.map(att => (
                <a
                    key={att.id}
                    href={`/api/messages/${message.id}/attachments/${att.id}`}
                    download={att.filename}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
                >
                    <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300 truncate">{att.filename}</span>
                    <span className="text-gray-400 text-xs ml-auto flex-shrink-0">
                        {att.size < 1024 * 1024
                            ? `${(att.size / 1024).toFixed(0)} KB`
                            : `${(att.size / (1024 * 1024)).toFixed(1)} MB`}
                    </span>
                </a>
            ))}
        </div>
    </div>
)}
```

Make sure `Paperclip` is imported (added in Task 7).

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | grep "messages/page"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/messages/page.tsx
git commit -m "feat: display attachment download links in MessageDetail"
```

---

## Task 9: Smoke test end-to-end

- [ ] **Step 1: Start dev server**

```bash
cd C:/Users/csand/Documents/Projects/AccommAlly/accommally
npm run dev
```

- [ ] **Step 2: Test toolbar**

Navigate to `/messages`, open compose. Verify:
- Toolbar renders above editor with all groups visible
- Bold/italic/underline/strikethrough toggle on click and highlight when active
- Font family dropdown opens, clicking a font applies it to selected text
- Typing a custom font name and pressing Enter applies it
- Font size +/− buttons increment/decrement, preset dropdown works
- Link button: select text, click Link, enter URL, press Apply — link created
- Image button opens file picker, selected image appears in body
- Paste an image from clipboard — appears in body
- `</>` button switches to source textarea showing raw HTML; editing and switching back reflects changes

- [ ] **Step 3: Test attachments**

- Click paperclip in toolbar → file picker opens → select a file → chip appears below editor
- Chip shows filename, size, and × button
- × removes the chip
- Send the message
- Open the sent message — attachment appears as a download link
- Click download link — file downloads correctly

- [ ] **Step 4: Test attachment limits**

Try attaching 11 files at once — expect "Maximum 10 attachments" alert.
Try attaching a file over 10MB — expect the file-too-large alert.
