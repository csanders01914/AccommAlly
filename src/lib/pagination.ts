import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/constants';

export interface PaginationParams {
    page: number;
    limit: number;
    skip: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export function parsePagination(searchParams: URLSearchParams): PaginationParams {
    const rawPage = parseInt(searchParams.get('page') ?? '1', 10);
    const rawLimit = parseInt(searchParams.get('limit') ?? String(DEFAULT_PAGE_SIZE), 10);
    const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, isNaN(rawLimit) ? DEFAULT_PAGE_SIZE : rawLimit));
    return { page, limit, skip: (page - 1) * limit };
}

export function buildPaginatedResponse<T>(
    data: T[],
    total: number,
    params: PaginationParams
): PaginatedResponse<T> {
    return {
        data,
        pagination: {
            page: params.page,
            limit: params.limit,
            total,
            totalPages: Math.ceil(total / params.limit),
        },
    };
}
