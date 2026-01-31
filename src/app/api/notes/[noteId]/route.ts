import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/**
 * PATCH /api/notes/[noteId] - Edit a note (within 24 hours only)
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ noteId: string }> }
) {
    try {
        const { noteId } = await params;
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { content } = body;

        if (!content || typeof content !== 'string') {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        // Find the note
        const note = await prisma.note.findUnique({
            where: { id: noteId },
            include: { case: true }
        });

        if (!note) {
            return NextResponse.json({ error: 'Note not found' }, { status: 404 });
        }

        // Check 24-hour restriction
        const created = new Date(note.createdAt);
        const now = new Date();
        const hoursDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60);

        if (hoursDiff > 24) {
            return NextResponse.json(
                { error: 'Notes can only be edited within 24 hours of creation' },
                { status: 403 }
            );
        }

        // Permission check:
        // - ADMIN can edit any note within 24 hours
        // - Others can only edit their own notes
        if (session.role !== 'ADMIN' && note.authorId !== session.id) {
            return NextResponse.json(
                { error: 'You can only edit your own notes' },
                { status: 403 }
            );
        }

        // Update the note
        const updatedNote = await prisma.note.update({
            where: { id: noteId },
            data: { content }
        });

        // Create audit log
        await prisma.auditLog.create({
            data: {
                entityType: 'Case',
                entityId: note.caseId,
                action: 'UPDATE',
                field: 'note_content',
                metadata: JSON.stringify({
                    action: 'edit_note',
                    noteId: note.id,
                    noteType: note.noteType
                }),
                userId: session.id,
            },
        });

        return NextResponse.json({ success: true, note: updatedNote });
    } catch (error) {
        console.error('Error updating note:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
