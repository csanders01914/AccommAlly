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
            editor.commands.setContent(content, { emitUpdate: false });
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
