import Link from 'next/link';
import prisma from '@/lib/prisma';

export default async function TenantsListPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}) {
    const params = await searchParams;
    const status = params.status;
    const search = params.search;
    const page = parseInt(params.page || '1');
    const limit = 20;

    const where: Record<string, unknown> = {};
    if (status) {
        where.status = status;
    }
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [tenants, total] = await Promise.all([
        prisma.tenant.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                _count: {
                    select: {
                        users: true,
                        cases: true,
                    },
                },
            },
        }),
        prisma.tenant.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Tenants</h1>
                    <p className="text-slate-400 mt-1">{total} total organizations</p>
                </div>
                <Link
                    href="/super-admin/tenants/new"
                    className="px-4 py-2 bg-indigo-700 hover:bg-indigo-600 !text-white font-bold tracking-wide rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Tenant
                </Link>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    {['ALL', 'ACTIVE', 'PENDING', 'SUSPENDED', 'DELETED'].map((s) => (
                        <Link
                            key={s}
                            href={`/super-admin/tenants${s === 'ALL' ? '' : `?status=${s}`}`}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${(s === 'ALL' && !status) || status === s
                                ? 'bg-violet-500/20 text-violet-300'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                }`}
                        >
                            {s}
                        </Link>
                    ))}
                </div>
            </div>

            {/* Tenants Table */}
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-700/50">
                            <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Organization</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Slug</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Plan</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Status</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Users</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Cases</th>
                            <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Created</th>
                            <th className="px-6 py-4 text-right text-sm font-medium text-slate-400">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {tenants.map((tenant: any) => (
                            <tr key={tenant.id} className="hover:bg-slate-700/20 transition-colors">
                                <td className="px-6 py-4">
                                    <Link href={`/super-admin/tenants/${tenant.id}`} className="flex items-center gap-3 hover:text-violet-400 transition-colors">
                                        <div className="w-10 h-10 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                                            <span className="text-violet-400 font-semibold">
                                                {tenant.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <span className="font-medium text-white">{tenant.name}</span>
                                    </Link>
                                </td>
                                <td className="px-6 py-4 text-slate-300 font-mono text-sm">{tenant.slug}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${tenant.plan === 'ENTERPRISE' ? 'bg-amber-500/10 text-amber-400' :
                                        tenant.plan === 'PRO' ? 'bg-violet-500/10 text-violet-400' :
                                            tenant.plan === 'STARTER' ? 'bg-blue-500/10 text-blue-400' :
                                                'bg-slate-500/10 text-slate-400'
                                        }`}>
                                        {tenant.plan}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${tenant.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400' :
                                        tenant.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400' :
                                            tenant.status === 'SUSPENDED' ? 'bg-red-500/10 text-red-400' :
                                                'bg-slate-500/10 text-slate-400'
                                        }`}>
                                        {tenant.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-300">{tenant._count.users}</td>
                                <td className="px-6 py-4 text-slate-300">{tenant._count.cases}</td>
                                <td className="px-6 py-4 text-slate-400 text-sm">
                                    {new Date(tenant.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right text-sm">
                                    <Link
                                        href={`/super-admin/tenants/${tenant.id}/edit`}
                                        className="text-violet-400 hover:text-white transition-colors font-medium"
                                    >
                                        Edit
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {tenants.length === 0 && (
                    <div className="px-6 py-12 text-center text-slate-400">
                        No tenants found. Create your first tenant to get started.
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    {page > 1 && (
                        <Link
                            href={`/super-admin/tenants?page=${page - 1}${status ? `&status=${status}` : ''}`}
                            className="px-3 py-2 text-slate-400 hover:text-white transition-colors"
                        >
                            ← Previous
                        </Link>
                    )}
                    <span className="text-slate-500">
                        Page {page} of {totalPages}
                    </span>
                    {page < totalPages && (
                        <Link
                            href={`/super-admin/tenants?page=${page + 1}${status ? `&status=${status}` : ''}`}
                            className="px-3 py-2 text-slate-400 hover:text-white transition-colors"
                        >
                            Next →
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}
