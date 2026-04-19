import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSuperAdminSession } from '@/lib/super-admin-auth';

export default async function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Check authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('super_admin_token')?.value;
    const session = await getSuperAdminSession(token);

    if (!session) {
        redirect('/super-admin/login');
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Top Navigation */}
            <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <span className="text-lg font-semibold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                                Super Admin Console
                            </span>
                        </div>

                        <nav className="hidden md:flex items-center gap-6">
                            <a href="/super-admin" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
                                Dashboard
                            </a>
                            <a href="/super-admin/tenants" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
                                Tenants
                            </a>
                            <a href="/super-admin/plans" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
                                Plans
                            </a>
                            <a href="/super-admin/analytics" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
                                Analytics
                            </a>
                            <a href="/super-admin/settings" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
                                Org Settings
                            </a>
                        </nav>

                        <div className="flex items-center gap-4">
                            <span className="text-sm text-slate-400">{session.name}</span>
                            <form action="/api/super-admin/auth/logout" method="POST">
                                <button
                                    type="submit"
                                    className="text-sm text-slate-400 hover:text-white transition-colors"
                                >
                                    Logout
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
        </div>
    );
}
