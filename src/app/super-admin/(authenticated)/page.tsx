import Link from 'next/link';
import prisma from '@/lib/prisma';

export default async function SuperAdminDashboard() {
 // Fetch platform-wide stats
 const [tenantCount, userCount, caseCount, activeTenants] = await Promise.all([
 prisma.tenant.count(),
 prisma.user.count(),
 prisma.case.count(),
 prisma.tenant.count({ where: { status: 'ACTIVE' } }),
 ]);

 // Recent tenants
 const recentTenants = await prisma.tenant.findMany({
 take: 5,
 orderBy: { createdAt: 'desc' },
 select: {
 id: true,
 name: true,
 slug: true,
 status: true,
 plan: true,
 createdAt: true,
 },
 });

 return (
 <div className="space-y-8">
 {/* Page Header */}
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
 <p className="text-slate-500 mt-1">Platform overview and quick actions</p>
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

 {/* Stats Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 <StatCard
 title="Total Tenants"
 value={tenantCount}
 icon={<BuildingIcon />}
 color="violet"
 />
 <StatCard
 title="Active Tenants"
 value={activeTenants}
 icon={<CheckCircleIcon />}
 color="green"
 />
 <StatCard
 title="Total Users"
 value={userCount}
 icon={<UsersIcon />}
 color="blue"
 />
 <StatCard
 title="Total Cases"
 value={caseCount}
 icon={<FolderIcon />}
 color="amber"
 />
 </div>

 {/* Recent Tenants */}
 <div className="bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden">
 <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
 <h2 className="text-lg font-semibold text-slate-900">Recent Tenants</h2>
 <Link href="/super-admin/tenants" className="text-sm text-violet-600 hover:text-violet-700 transition-colors">
 View all →
 </Link>
 </div>
 <div className="divide-y divide-slate-200">
 {recentTenants.map((tenant: any) => (
 <Link
 key={tenant.id}
 href={`/super-admin/tenants/${tenant.id}`}
 className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
 >
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 bg-gradient-to-br from-violet-100 to-purple-100 rounded-lg flex items-center justify-center">
 <span className="text-violet-700 font-semibold">
 {tenant.name.charAt(0).toUpperCase()}
 </span>
 </div>
 <div>
 <p className="font-medium text-slate-900">{tenant.name}</p>
 <p className="text-sm text-slate-500">{tenant.slug}</p>
 </div>
 </div>
 <div className="flex items-center gap-4">
 <span className={`px-2 py-1 text-xs font-medium rounded-full ${tenant.status === 'ACTIVE'
 ? 'bg-green-100 text-green-700'
 : 'bg-slate-100 text-slate-700'
 }`}>
 {tenant.status}
 </span>
 <span className="text-sm text-slate-500">
 {new Date(tenant.createdAt).toLocaleDateString()}
 </span>
 </div>
 </Link>
 ))}
 {recentTenants.length === 0 && (
 <div className="px-6 py-12 text-center text-slate-500">
 No tenants yet. Create your first tenant to get started.
 </div>
 )}
 </div>
 </div>
 </div>
 );
}

function StatCard({ title, value, icon, color }: {
 title: string;
 value: number;
 icon: React.ReactNode;
 color: 'violet' | 'green' | 'blue' | 'amber';
}) {
 const colorClasses = {
 violet: 'from-violet-100 to-purple-100 text-violet-700',
 green: 'from-green-100 to-emerald-100 text-green-700',
 blue: 'from-blue-100 to-cyan-100 text-blue-700',
 amber: 'from-amber-100 to-orange-100 text-amber-700',
 };

 return (
 <div className="bg-white shadow-sm border border-slate-200 rounded-xl p-6">
 <div className="flex items-center gap-4">
 <div className={`w-12 h-12 bg-gradient-to-br ${colorClasses[color]} rounded-lg flex items-center justify-center`}>
 {icon}
 </div>
 <div>
 <p className="text-2xl font-bold text-slate-900">{value.toLocaleString()}</p>
 <p className="text-sm text-slate-500">{title}</p>
 </div>
 </div>
 </div>
 );
}

// Icons
function BuildingIcon() {
 return (
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
 </svg>
 );
}

function CheckCircleIcon() {
 return (
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 );
}

function UsersIcon() {
 return (
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
 </svg>
 );
}

function FolderIcon() {
 return (
 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
 </svg>
 );
}
