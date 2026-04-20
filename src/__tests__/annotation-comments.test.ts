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
    // Support withTenantScope — returns the same mock so tenant-scoped operations
    // resolve against the same jest.fn() instances we seed in beforeEach.
    $extends: jest.fn().mockReturnThis(),
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

    it('replaces content with [deleted] for soft-deleted comments and exposes deleted:true without deletedAt', async () => {
        const deletedRoot = {
            id: 'cmt-deleted', parentId: null, tenantId: 'tenant-1', documentId: 'doc-1',
            type: 'DOCUMENT_NOTE', content: 'original content', deletedAt: new Date(),
            color: null, pageNumber: null, x: null, y: null, width: null, height: null,
            selectedText: null, selectionStart: null, selectionEnd: null,
            createdAt: new Date(), updatedAt: new Date(),
            createdBy: { id: 'user-1', name: 'Test User' },
        };
        prismaMock.annotationComment.findMany.mockResolvedValue([deletedRoot]);

        const { GET } = await import('@/app/api/documents/[id]/annotation-comments/route');
        const req = makeRequest('http://localhost/api/documents/doc-1/annotation-comments');
        const res = await GET(req, { params: Promise.resolve({ id: 'doc-1' }) });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data[0].content).toBe('[deleted]');
        expect(data[0].deleted).toBe(true);
        expect(data[0]).not.toHaveProperty('deletedAt');
        expect(data[0].replies).toHaveLength(0);
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

    it('returns 400 for an invalid type', async () => {
        const { POST } = await import('@/app/api/documents/[id]/annotation-comments/route');
        const req = makeRequest(
            'http://localhost/api/documents/doc-1/annotation-comments',
            'POST',
            { type: 'INVALID_TYPE', content: 'some content' }
        );
        const res = await POST(req, { params: Promise.resolve({ id: 'doc-1' }) });
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/Invalid type/);
    });

    it('returns 400 for a NOTE type with empty content', async () => {
        const { POST } = await import('@/app/api/documents/[id]/annotation-comments/route');
        const req = makeRequest(
            'http://localhost/api/documents/doc-1/annotation-comments',
            'POST',
            { type: 'DOCUMENT_NOTE', content: '   ' }
        );
        const res = await POST(req, { params: Promise.resolve({ id: 'doc-1' }) });
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/content is required for note types/);
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

    it('returns 410 when annotation is already soft-deleted', async () => {
        prismaMock.annotationComment.findUnique.mockResolvedValue({
            id: 'cmt-1', tenantId: 'tenant-1', createdById: 'user-1',
            createdAt: new Date(), deletedAt: new Date(),
        });
        const { PATCH } = await import('@/app/api/documents/[id]/annotation-comments/[cid]/route');
        const req = makeRequest(
            'http://localhost/api/documents/doc-1/annotation-comments/cmt-1',
            'PATCH',
            { content: 'updated' }
        );
        const res = await PATCH(req, { params: Promise.resolve({ id: 'doc-1', cid: 'cmt-1' }) });
        expect(res.status).toBe(410);
    });

    it('allows ADMIN to edit annotation older than 24 hours', async () => {
        const auth = jest.requireMock('@/lib/auth');
        (auth.getSession as jest.Mock).mockResolvedValue({ ...mockSession, role: 'ADMIN' });
        const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
        prismaMock.annotationComment.findUnique.mockResolvedValue({
            id: 'cmt-1', tenantId: 'tenant-1', createdById: 'other-user',
            createdAt: old, deletedAt: null,
        });
        prismaMock.annotationComment.update.mockResolvedValue({
            id: 'cmt-1', content: 'admin edit', createdBy: { id: 'other-user', name: 'Other' },
        });
        const { PATCH } = await import('@/app/api/documents/[id]/annotation-comments/[cid]/route');
        const req = makeRequest(
            'http://localhost/api/documents/doc-1/annotation-comments/cmt-1',
            'PATCH',
            { content: 'admin edit' }
        );
        const res = await PATCH(req, { params: Promise.resolve({ id: 'doc-1', cid: 'cmt-1' }) });
        expect(res.status).toBe(200);
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

    it('returns 410 when parent is soft-deleted', async () => {
        prismaMock.annotationComment.findUnique.mockResolvedValue({
            id: 'cmt-1', parentId: null, tenantId: 'tenant-1', deletedAt: new Date(),
            type: 'HIGHLIGHT_PDF', documentId: 'doc-1', messageId: null,
        });
        const { POST } = await import('@/app/api/documents/[id]/annotation-comments/[cid]/replies/route');
        const req = makeRequest(
            'http://localhost/api/documents/doc-1/annotation-comments/cmt-1/replies',
            'POST',
            { content: 'reply to deleted' }
        );
        const res = await POST(req, { params: Promise.resolve({ id: 'doc-1', cid: 'cmt-1' }) });
        expect(res.status).toBe(410);
    });

    it('creates a reply and returns 201', async () => {
        prismaMock.annotationComment.findUnique.mockResolvedValue({
            id: 'cmt-1', parentId: null, tenantId: 'tenant-1', deletedAt: null,
            type: 'HIGHLIGHT_PDF', documentId: 'doc-1', messageId: null,
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

// -------------------------------------------------------
// GET /api/messages/[id]/annotation-comments
// -------------------------------------------------------
describe('GET /api/messages/[id]/annotation-comments', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        prismaMock.auditLog.create.mockResolvedValue({});
        const auth = jest.requireMock('@/lib/auth');
        (auth.getSession as jest.Mock).mockResolvedValue(mockSession);
    });

    it('returns 401 when unauthenticated', async () => {
        const auth = jest.requireMock('@/lib/auth');
        (auth.getSession as jest.Mock).mockResolvedValue(null);

        const { GET } = await import('@/app/api/messages/[id]/annotation-comments/route');
        const req = makeRequest('http://localhost/api/messages/msg-1/annotation-comments');
        const res = await GET(req, { params: Promise.resolve({ id: 'msg-1' }) });
        expect(res.status).toBe(401);
    });

    it('returns nested tree of annotation comments', async () => {
        const root = {
            id: 'cmt-1', parentId: null, tenantId: 'tenant-1', messageId: 'msg-1',
            type: 'HIGHLIGHT_EMAIL', content: 'Root comment', deletedAt: null,
            color: '#FFFF00', pageNumber: null, x: null, y: null, width: null, height: null,
            selectedText: 'some text', selectionStart: 0, selectionEnd: 9,
            createdAt: new Date(), updatedAt: new Date(),
            createdBy: { id: 'user-1', name: 'Test User' },
        };
        const reply = {
            id: 'cmt-2', parentId: 'cmt-1', tenantId: 'tenant-1', messageId: 'msg-1',
            type: 'HIGHLIGHT_EMAIL', content: 'A reply', deletedAt: null,
            color: null, pageNumber: null, x: null, y: null, width: null, height: null,
            selectedText: null, selectionStart: null, selectionEnd: null,
            createdAt: new Date(), updatedAt: new Date(),
            createdBy: { id: 'user-2', name: 'Other User' },
        };
        prismaMock.annotationComment.findMany.mockResolvedValue([root, reply]);

        const { GET } = await import('@/app/api/messages/[id]/annotation-comments/route');
        const req = makeRequest('http://localhost/api/messages/msg-1/annotation-comments');
        const res = await GET(req, { params: Promise.resolve({ id: 'msg-1' }) });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveLength(1);
        expect(data[0].id).toBe('cmt-1');
        expect(data[0].replies).toHaveLength(1);
        expect(data[0].replies[0].id).toBe('cmt-2');
    });

    it('replaces content with [deleted] and exposes deleted:true without deletedAt', async () => {
        const deletedRoot = {
            id: 'cmt-deleted', parentId: null, tenantId: 'tenant-1', messageId: 'msg-1',
            type: 'EMAIL_NOTE', content: 'original content', deletedAt: new Date(),
            color: null, pageNumber: null, x: null, y: null, width: null, height: null,
            selectedText: null, selectionStart: null, selectionEnd: null,
            createdAt: new Date(), updatedAt: new Date(),
            createdBy: { id: 'user-1', name: 'Test User' },
        };
        prismaMock.annotationComment.findMany.mockResolvedValue([deletedRoot]);

        const { GET } = await import('@/app/api/messages/[id]/annotation-comments/route');
        const req = makeRequest('http://localhost/api/messages/msg-1/annotation-comments');
        const res = await GET(req, { params: Promise.resolve({ id: 'msg-1' }) });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data[0].content).toBe('[deleted]');
        expect(data[0].deleted).toBe(true);
        expect(data[0]).not.toHaveProperty('deletedAt');
        expect(data[0].replies).toHaveLength(0);
    });
});

// -------------------------------------------------------
// POST /api/messages/[id]/annotation-comments
// -------------------------------------------------------
describe('POST /api/messages/[id]/annotation-comments', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        prismaMock.auditLog.create.mockResolvedValue({});
        const auth = jest.requireMock('@/lib/auth');
        (auth.getSession as jest.Mock).mockResolvedValue(mockSession);
        prismaMock.message.findUnique.mockResolvedValue({ id: 'msg-1', tenantId: 'tenant-1' });
    });

    it('returns 401 when unauthenticated', async () => {
        const auth = jest.requireMock('@/lib/auth');
        (auth.getSession as jest.Mock).mockResolvedValue(null);

        const { POST } = await import('@/app/api/messages/[id]/annotation-comments/route');
        const req = makeRequest(
            'http://localhost/api/messages/msg-1/annotation-comments',
            'POST',
            { type: 'EMAIL_NOTE', content: 'A note' }
        );
        const res = await POST(req, { params: Promise.resolve({ id: 'msg-1' }) });
        expect(res.status).toBe(401);
    });

    it('returns 400 when content is missing', async () => {
        const { POST } = await import('@/app/api/messages/[id]/annotation-comments/route');
        const req = makeRequest(
            'http://localhost/api/messages/msg-1/annotation-comments',
            'POST',
            { type: 'EMAIL_NOTE' }
        );
        const res = await POST(req, { params: Promise.resolve({ id: 'msg-1' }) });
        expect(res.status).toBe(400);
    });

    it('returns 400 for an invalid type', async () => {
        const { POST } = await import('@/app/api/messages/[id]/annotation-comments/route');
        const req = makeRequest(
            'http://localhost/api/messages/msg-1/annotation-comments',
            'POST',
            { type: 'HIGHLIGHT_PDF', content: 'some content' }
        );
        const res = await POST(req, { params: Promise.resolve({ id: 'msg-1' }) });
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/Invalid type for messages/);
    });

    it('returns 400 for EMAIL_NOTE with empty content', async () => {
        const { POST } = await import('@/app/api/messages/[id]/annotation-comments/route');
        const req = makeRequest(
            'http://localhost/api/messages/msg-1/annotation-comments',
            'POST',
            { type: 'EMAIL_NOTE', content: '   ' }
        );
        const res = await POST(req, { params: Promise.resolve({ id: 'msg-1' }) });
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/content is required for note types/);
    });

    it('returns 400 when parentId is provided', async () => {
        const { POST } = await import('@/app/api/messages/[id]/annotation-comments/route');
        const req = makeRequest(
            'http://localhost/api/messages/msg-1/annotation-comments',
            'POST',
            { type: 'EMAIL_NOTE', content: 'A note', parentId: 'cmt-1' }
        );
        const res = await POST(req, { params: Promise.resolve({ id: 'msg-1' }) });
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/replies endpoint/);
    });

    it('creates an EMAIL_NOTE and returns 201', async () => {
        const created = {
            id: 'cmt-new', parentId: null, tenantId: 'tenant-1', messageId: 'msg-1',
            type: 'EMAIL_NOTE', content: 'A note', deletedAt: null,
            color: null, pageNumber: null, x: null, y: null, width: null, height: null,
            selectedText: null, selectionStart: null, selectionEnd: null,
            createdAt: new Date(), updatedAt: new Date(),
            createdBy: { id: 'user-1', name: 'Test User' },
        };
        prismaMock.annotationComment.create.mockResolvedValue(created);

        const { POST } = await import('@/app/api/messages/[id]/annotation-comments/route');
        const req = makeRequest(
            'http://localhost/api/messages/msg-1/annotation-comments',
            'POST',
            { type: 'EMAIL_NOTE', content: 'A note' }
        );
        const res = await POST(req, { params: Promise.resolve({ id: 'msg-1' }) });
        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.id).toBe('cmt-new');
        expect(prismaMock.auditLog.create).toHaveBeenCalledTimes(1);
    });

    it('creates a HIGHLIGHT_EMAIL and returns 201', async () => {
        const created = {
            id: 'cmt-hl', parentId: null, tenantId: 'tenant-1', messageId: 'msg-1',
            type: 'HIGHLIGHT_EMAIL', content: '', deletedAt: null,
            color: '#FFFF00', pageNumber: null, x: null, y: null, width: null, height: null,
            selectedText: 'selected text', selectionStart: 5, selectionEnd: 18,
            createdAt: new Date(), updatedAt: new Date(),
            createdBy: { id: 'user-1', name: 'Test User' },
        };
        prismaMock.annotationComment.create.mockResolvedValue(created);

        const { POST } = await import('@/app/api/messages/[id]/annotation-comments/route');
        const req = makeRequest(
            'http://localhost/api/messages/msg-1/annotation-comments',
            'POST',
            { type: 'HIGHLIGHT_EMAIL', content: '', selectedText: 'selected text', selectionStart: 5, selectionEnd: 18 }
        );
        const res = await POST(req, { params: Promise.resolve({ id: 'msg-1' }) });
        expect(res.status).toBe(201);
    });
});

// -------------------------------------------------------
// PATCH /api/messages/[id]/annotation-comments/[cid]
// -------------------------------------------------------
describe('PATCH /api/messages/[id]/annotation-comments/[cid]', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        prismaMock.auditLog.create.mockResolvedValue({});
        const auth = jest.requireMock('@/lib/auth');
        (auth.getSession as jest.Mock).mockResolvedValue(mockSession);
    });

    it('returns 401 when unauthenticated', async () => {
        const auth = jest.requireMock('@/lib/auth');
        (auth.getSession as jest.Mock).mockResolvedValue(null);
        const { PATCH } = await import('@/app/api/messages/[id]/annotation-comments/[cid]/route');
        const req = makeRequest(
            'http://localhost/api/messages/msg-1/annotation-comments/cmt-1',
            'PATCH',
            { content: 'updated' }
        );
        const res = await PATCH(req, { params: Promise.resolve({ id: 'msg-1', cid: 'cmt-1' }) });
        expect(res.status).toBe(401);
    });

    it('returns 403 when user is not the creator', async () => {
        const recent = new Date(Date.now() - 5 * 60 * 1000);
        prismaMock.annotationComment.findUnique.mockResolvedValue({
            id: 'cmt-1', tenantId: 'tenant-1', createdById: 'other-user',
            createdAt: recent, deletedAt: null,
        });
        const { PATCH } = await import('@/app/api/messages/[id]/annotation-comments/[cid]/route');
        const req = makeRequest(
            'http://localhost/api/messages/msg-1/annotation-comments/cmt-1',
            'PATCH',
            { content: 'updated' }
        );
        const res = await PATCH(req, { params: Promise.resolve({ id: 'msg-1', cid: 'cmt-1' }) });
        expect(res.status).toBe(403);
    });

    it('returns 409 when annotation is older than 24 hours and user is not ADMIN', async () => {
        const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
        prismaMock.annotationComment.findUnique.mockResolvedValue({
            id: 'cmt-1', tenantId: 'tenant-1', createdById: 'user-1',
            createdAt: old, deletedAt: null,
        });
        const { PATCH } = await import('@/app/api/messages/[id]/annotation-comments/[cid]/route');
        const req = makeRequest(
            'http://localhost/api/messages/msg-1/annotation-comments/cmt-1',
            'PATCH',
            { content: 'updated' }
        );
        const res = await PATCH(req, { params: Promise.resolve({ id: 'msg-1', cid: 'cmt-1' }) });
        expect(res.status).toBe(409);
    });

    it('returns 410 when annotation is already soft-deleted', async () => {
        prismaMock.annotationComment.findUnique.mockResolvedValue({
            id: 'cmt-1', tenantId: 'tenant-1', createdById: 'user-1',
            createdAt: new Date(), deletedAt: new Date(),
        });
        const { PATCH } = await import('@/app/api/messages/[id]/annotation-comments/[cid]/route');
        const req = makeRequest(
            'http://localhost/api/messages/msg-1/annotation-comments/cmt-1',
            'PATCH',
            { content: 'updated' }
        );
        const res = await PATCH(req, { params: Promise.resolve({ id: 'msg-1', cid: 'cmt-1' }) });
        expect(res.status).toBe(410);
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
        const { PATCH } = await import('@/app/api/messages/[id]/annotation-comments/[cid]/route');
        const req = makeRequest(
            'http://localhost/api/messages/msg-1/annotation-comments/cmt-1',
            'PATCH',
            { content: 'updated' }
        );
        const res = await PATCH(req, { params: Promise.resolve({ id: 'msg-1', cid: 'cmt-1' }) });
        expect(res.status).toBe(200);
        expect(prismaMock.auditLog.create).toHaveBeenCalledTimes(1);
    });

    it('allows ADMIN to edit annotation older than 24 hours', async () => {
        const auth = jest.requireMock('@/lib/auth');
        (auth.getSession as jest.Mock).mockResolvedValue({ ...mockSession, role: 'ADMIN' });
        const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
        prismaMock.annotationComment.findUnique.mockResolvedValue({
            id: 'cmt-1', tenantId: 'tenant-1', createdById: 'other-user',
            createdAt: old, deletedAt: null,
        });
        prismaMock.annotationComment.update.mockResolvedValue({
            id: 'cmt-1', content: 'admin edit', createdBy: { id: 'other-user', name: 'Other' },
        });
        const { PATCH } = await import('@/app/api/messages/[id]/annotation-comments/[cid]/route');
        const req = makeRequest(
            'http://localhost/api/messages/msg-1/annotation-comments/cmt-1',
            'PATCH',
            { content: 'admin edit' }
        );
        const res = await PATCH(req, { params: Promise.resolve({ id: 'msg-1', cid: 'cmt-1' }) });
        expect(res.status).toBe(200);
    });
});

// -------------------------------------------------------
// DELETE /api/messages/[id]/annotation-comments/[cid]
// -------------------------------------------------------
describe('DELETE /api/messages/[id]/annotation-comments/[cid]', () => {
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
        const { DELETE } = await import('@/app/api/messages/[id]/annotation-comments/[cid]/route');
        const req = makeRequest('http://localhost/api/messages/msg-1/annotation-comments/cmt-1', 'DELETE');
        const res = await DELETE(req, { params: Promise.resolve({ id: 'msg-1', cid: 'cmt-1' }) });
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
        const { DELETE } = await import('@/app/api/messages/[id]/annotation-comments/[cid]/route');
        const req = makeRequest('http://localhost/api/messages/msg-1/annotation-comments/cmt-1', 'DELETE');
        const res = await DELETE(req, { params: Promise.resolve({ id: 'msg-1', cid: 'cmt-1' }) });
        expect(res.status).toBe(410);
    });
});

// -------------------------------------------------------
// POST /api/messages/[id]/annotation-comments/[cid]/replies
// -------------------------------------------------------
describe('POST /api/messages/[id]/annotation-comments/[cid]/replies', () => {
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
        const { POST } = await import('@/app/api/messages/[id]/annotation-comments/[cid]/replies/route');
        const req = makeRequest(
            'http://localhost/api/messages/msg-1/annotation-comments/cmt-2/replies',
            'POST',
            { content: 'nested reply' }
        );
        const res = await POST(req, { params: Promise.resolve({ id: 'msg-1', cid: 'cmt-2' }) });
        expect(res.status).toBe(400);
    });

    it('returns 410 when parent is soft-deleted', async () => {
        prismaMock.annotationComment.findUnique.mockResolvedValue({
            id: 'cmt-1', parentId: null, tenantId: 'tenant-1', deletedAt: new Date(),
            type: 'HIGHLIGHT_EMAIL', documentId: null, messageId: 'msg-1',
        });
        const { POST } = await import('@/app/api/messages/[id]/annotation-comments/[cid]/replies/route');
        const req = makeRequest(
            'http://localhost/api/messages/msg-1/annotation-comments/cmt-1/replies',
            'POST',
            { content: 'reply to deleted' }
        );
        const res = await POST(req, { params: Promise.resolve({ id: 'msg-1', cid: 'cmt-1' }) });
        expect(res.status).toBe(410);
    });

    it('creates a reply and returns 201', async () => {
        prismaMock.annotationComment.findUnique.mockResolvedValue({
            id: 'cmt-1', parentId: null, tenantId: 'tenant-1', deletedAt: null,
            type: 'HIGHLIGHT_EMAIL', documentId: null, messageId: 'msg-1',
        });
        const created = {
            id: 'cmt-reply', parentId: 'cmt-1', tenantId: 'tenant-1',
            type: 'HIGHLIGHT_EMAIL', content: 'A reply', deletedAt: null,
            createdAt: new Date(), updatedAt: new Date(),
            createdBy: { id: 'user-1', name: 'Test User' },
        };
        prismaMock.annotationComment.create.mockResolvedValue(created);

        const { POST } = await import('@/app/api/messages/[id]/annotation-comments/[cid]/replies/route');
        const req = makeRequest(
            'http://localhost/api/messages/msg-1/annotation-comments/cmt-1/replies',
            'POST',
            { content: 'A reply' }
        );
        const res = await POST(req, { params: Promise.resolve({ id: 'msg-1', cid: 'cmt-1' }) });
        expect(res.status).toBe(201);
        expect(prismaMock.auditLog.create).toHaveBeenCalledTimes(1);
    });
});
