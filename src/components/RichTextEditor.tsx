'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
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
                    parseHTML: (el: HTMLElement) => el.style.fontSize?.replace(/[^0-9.]/g, '') || null,
                    renderHTML: (attrs: Record<string, unknown>) =>
                        attrs.fontSize ? { style: `font-size: ${attrs.fontSize}pt` } : {},
                },
            },
        }];
    },
    addCommands() {
        return {
            setFontSize: (fontSize: string) => ({ chain }: { chain: () => { setMark: (name: string, attrs: Record<string, unknown>) => { run: () => boolean } } }) =>
                chain().setMark('textStyle', { fontSize }).run(),
            unsetFontSize: () => ({ chain }: { chain: () => { setMark: (name: string, attrs: Record<string, unknown>) => { removeEmptyTextStyle: () => { run: () => boolean } } } }) =>
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
            handlePaste(_view, event) {
                const items = Array.from(event.clipboardData?.items ?? []);
                const imageItem = items.find(i => i.type.startsWith('image/'));
                if (!imageItem) return false;
                const file = imageItem.getAsFile();
                if (!file) return false;
                fileToDataUrl(file).then(src => {
                    const { schema, tr, selection } = _view.state;
                    const node = schema.nodes.image?.create({ src });
                    if (!node) return;
                    _view.dispatch(tr.replaceSelectionWith(node));
                });
                return true;
            },
            handleDrop(_view, event) {
                const files = Array.from(event.dataTransfer?.files ?? []);
                const imageFile = files.find(f => f.type.startsWith('image/'));
                if (!imageFile) return false;
                event.preventDefault();
                fileToDataUrl(imageFile).then(src => {
                    const pos = _view.posAtCoords({ left: event.clientX, top: event.clientY });
                    if (!pos) return;
                    const { schema, tr } = _view.state;
                    const node = schema.nodes.image?.create({ src });
                    if (!node) return;
                    _view.dispatch(tr.insert(pos.pos, node));
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
                    <ToolbarBtn onClick={() => fileInputRef.current?.click()} title="Insert image">
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
