import prisma from '@/lib/prisma';

export default async function AnalyticsPage() {
 // Fetch all analytics data in parallel
 const [
 tenants,
 totalUsers,
 totalCases,
 totalDocuments,
 totalMessages,
 totalTasks,
 recentUsers,
 casesByStatus,
 ] = await Promise.all([
 prisma.tenant.findMany({
 select: {
 id: true,
 name: true,
 slug: true,
 status: true,
 plan: true,
 createdAt: true,
 _count: {
 select: {
 users: true,
 cases: true,
 },
 },
 },
 orderBy: { createdAt: 'asc' },
 }),
 prisma.user.count(),
 prisma.case.count(),
 prisma.document.count(),
 prisma.message.count(),
 prisma.task.count(),
 prisma.user.findMany({
 take: 10,
 orderBy: { createdAt: 'desc' },
 select: {
 id: true,
 name: true,
 role: true,
 createdAt: true,
 tenant: { select: { name: true } },
 },
 }),
 prisma.case.groupBy({
 by: ['status'],
 _count: { status: true },
 }),
 ]);

 // Plan distribution
 const planCounts: Record<string, number> = {};
 tenants.forEach((t: any) => {
 const plan = t.plan || 'No Plan';
 planCounts[plan] = (planCounts[plan] || 0) + 1;
 });

 // Status distribution
 const statusCounts: Record<string, number> = {};
 tenants.forEach((t: any) => {
 statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
 });

 // Case status distribution
 const caseStatusMap: Record<string, number> = {};
 casesByStatus.forEach((c: any) => {
 caseStatusMap[c.status] = c._count.status;
 });

 // Growth timeline (tenants by month)
 const monthlyGrowth: Record<string, number> = {};
 tenants.forEach((t: any) => {
 const month = new Date(t.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
 monthlyGrowth[month] = (monthlyGrowth[month] || 0) + 1;
 });

 // Top tenants by users/cases
 const topTenantsByUsers = [...tenants].sort((a: any, b: any) => b._count.users - a._count.users).slice(0, 5);
 const topTenantsByCases = [...tenants].sort((a: any, b: any) => b._count.cases - a._count.cases).slice(0, 5);

 return (
 <div className="space-y-8">
 {/* Header */}
 <div>
 <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
 <p className="text-slate-500 mt-1">Platform-wide metrics and insights</p>
 </div>

 {/* Key Metrics */}
 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
 <MetricCard label="Tenants" value={tenants.length} color="violet" />
 <MetricCard label="Users" value={totalUsers} color="blue" />
 <MetricCard label="Cases" value={totalCases} color="amber" />
 <MetricCard label="Documents" value={totalDocuments} color="green" />
 <MetricCard label="Messages" value={totalMessages} color="cyan" />
 <MetricCard label="Tasks" value={totalTasks} color="rose" />
 </div>

 {/* Two-column layout */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Plan Distribution */}
 <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-6">
 <h2 className="text-lg font-semibold text-slate-900 mb-4">Plan Distribution</h2>
 <div className="space-y-3">
 {Object.entries(planCounts).map(([plan, count]) => (
 <BarRow key={plan} label={plan} count={count} total={tenants.length} color="violet" />
 ))}
 </div>
 </div>

 {/* Tenant Status */}
 <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-6">
 <h2 className="text-lg font-semibold text-slate-900 mb-4">Tenant Status</h2>
 <div className="space-y-3">
 {Object.entries(statusCounts).map(([status, count]) => (
 <BarRow
 key={status}
 label={status}
 count={count}
 total={tenants.length}
 color={status === 'ACTIVE' ? 'green' : status === 'SUSPENDED' ? 'red' : 'slate'}
 />
 ))}
 </div>
 </div>

 {/* Case Status */}
 <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-6">
 <h2 className="text-lg font-semibold text-slate-900 mb-4">Cases by Status</h2>
 {Object.keys(caseStatusMap).length > 0 ? (
 <div className="space-y-3">
 {Object.entries(caseStatusMap).map(([status, count]) => (
 <BarRow key={status} label={status.replace(/_/g, ' ')} count={count} total={totalCases} color="amber" />
 ))}
 </div>
 ) : (
 <p className="text-slate-500 text-sm">No cases yet</p>
 )}
 </div>

 {/* Growth Timeline */}
 <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-6">
 <h2 className="text-lg font-semibold text-slate-900 mb-4">Tenant Growth</h2>
 {Object.keys(monthlyGrowth).length > 0 ? (
 <div className="space-y-2">
 {Object.entries(monthlyGrowth).map(([month, count]) => (
 <div key={month} className="flex items-center justify-between">
 <span className="text-sm text-slate-500 w-24">{month}</span>
 <div className="flex-1 mx-3 h-6 bg-slate-200 rounded-full overflow-hidden">
 <div
 className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all"
 style={{ width: `${Math.max(10, (count / Math.max(...Object.values(monthlyGrowth))) * 100)}%` }}
 />
 </div>
 <span className="text-sm font-medium text-slate-900 w-8 text-right">{count}</span>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-slate-500 text-sm">No data yet</p>
 )}
 </div>
 </div>

 {/* Top Tenants */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Top by Users */}
 <div className="bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden">
 <div className="px-6 py-4 border-b border-slate-200">
 <h2 className="text-lg font-semibold text-slate-900">Top Tenants by Users</h2>
 </div>
 <div className="divide-y divide-slate-200">
 {topTenantsByUsers.map((t: any, i: number) => (
 <div key={t.id} className="flex items-center justify-between px-6 py-3">
 <div className="flex items-center gap-3">
 <span className="text-slate-500 text-sm w-6">#{i + 1}</span>
 <div>
 <p className="font-medium text-slate-900 text-sm">{t.name}</p>
 <p className="text-xs text-slate-500">{t.slug}</p>
 </div>
 </div>
 <span className="text-sm font-semibold text-blue-700">{t._count.users} users</span>
 </div>
 ))}
 </div>
 </div>

 {/* Top by Cases */}
 <div className="bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden">
 <div className="px-6 py-4 border-b border-slate-200">
 <h2 className="text-lg font-semibold text-slate-900">Top Tenants by Cases</h2>
 </div>
 <div className="divide-y divide-slate-200">
 {topTenantsByCases.map((t: any, i: number) => (
 <div key={t.id} className="flex items-center justify-between px-6 py-3">
 <div className="flex items-center gap-3">
 <span className="text-slate-500 text-sm w-6">#{i + 1}</span>
 <div>
 <p className="font-medium text-slate-900 text-sm">{t.name}</p>
 <p className="text-xs text-slate-500">{t.slug}</p>
 </div>
 </div>
 <span className="text-sm font-semibold text-amber-700">{t._count.cases} cases</span>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* Recent Users */}
 <div className="bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden">
 <div className="px-6 py-4 border-b border-slate-200">
 <h2 className="text-lg font-semibold text-slate-900">Recent Users</h2>
 </div>
 <div className="divide-y divide-slate-200">
 {recentUsers.map((user: any) => (
 <div key={user.id} className="flex items-center justify-between px-6 py-3">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center">
 <span className="text-blue-700 text-xs font-semibold">
 {(user.name || '?').charAt(0).toUpperCase()}
 </span>
 </div>
 <div>
 <p className="font-medium text-slate-900 text-sm">{user.name || 'Unnamed'}</p>
 <p className="text-xs text-slate-500">{user.tenant?.name || 'No tenant'}</p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${user.role === 'ADMIN' ? 'bg-violet-100 text-violet-700'
 : user.role === 'COORDINATOR' ? 'bg-blue-100 text-blue-700'
 : 'bg-slate-100 text-slate-500'
 }`}>
 {user.role}
 </span>
 <span className="text-xs text-slate-500">
 {new Date(user.createdAt).toLocaleDateString()}
 </span>
 </div>
 </div>
 ))}
 {recentUsers.length === 0 && (
 <div className="px-6 py-8 text-center text-slate-500 text-sm">No users yet</div>
 )}
 </div>
 </div>
 </div>
 );
}

// ─── Components ───

function MetricCard({ label, value, color }: { label: string; value: number; color: string }) {
 const gradients: Record<string, string> = {
 violet: 'from-violet-50 to-purple-50 border-violet-100',
 blue: 'from-blue-50 to-cyan-50 border-blue-100',
 amber: 'from-amber-50 to-orange-50 border-amber-100',
 green: 'from-green-50 to-emerald-50 border-green-100',
 cyan: 'from-cyan-50 to-teal-50 border-cyan-100',
 rose: 'from-rose-50 to-pink-50 border-rose-100',
 };
 const textColors: Record<string, string> = {
 violet: 'text-violet-700', blue: 'text-blue-700', amber: 'text-amber-700',
 green: 'text-green-700', cyan: 'text-cyan-400', rose: 'text-rose-700',
 };

 return (
 <div className={`bg-gradient-to-br ${gradients[color]} border rounded-xl p-4 text-center`}>
 <p className={`text-2xl font-bold ${textColors[color]}`}>{value.toLocaleString()}</p>
 <p className="text-xs text-slate-500 mt-1">{label}</p>
 </div>
 );
}

function BarRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
 const pct = total > 0 ? (count / total) * 100 : 0;
 const barColors: Record<string, string> = {
 violet: 'from-violet-500 to-purple-500',
 green: 'from-green-500 to-emerald-500',
 amber: 'from-amber-500 to-orange-500',
 red: 'from-red-500 to-rose-500',
 slate: 'from-slate-500 to-slate-400',
 blue: 'from-blue-500 to-cyan-500',
 };

 return (
 <div className="flex items-center gap-3">
 <span className="text-sm text-slate-600 w-28 truncate">{label}</span>
 <div className="flex-1 h-5 bg-slate-200 rounded-full overflow-hidden">
 <div
 className={`h-full bg-gradient-to-r ${barColors[color] || barColors.slate} rounded-full transition-all`}
 style={{ width: `${Math.max(5, pct)}%` }}
 />
 </div>
 <span className="text-sm font-medium text-slate-900 w-12 text-right">{count}</span>
 </div>
 );
}
