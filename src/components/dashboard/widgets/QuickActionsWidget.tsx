'use client';

import { FileText, Plus, Mail, Calendar, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function QuickActionsWidget({ user }: { user: any }) {
    const router = useRouter();

    return (
        <div className="flex flex-col h-full bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-800 rounded-xl shadow-lg text-white">
            <div className="p-6 flex-1 flex flex-col justify-center gap-4">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Quick Actions
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                        onClick={() => router.push('/cases/new')}
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-3 rounded-xl text-left transition-all group flex items-center gap-3 border border-white/10"
                    >
                        <div className="bg-white/20 p-2 rounded-lg group-hover:scale-110 transition-transform">
                            <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="font-semibold text-sm">New Case</div>
                            <div className="text-[10px] text-indigo-100 opacity-80">Start request</div>
                        </div>
                    </button>

                    <button
                        onClick={() => router.push('/messages?compose=true')}
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-3 rounded-xl text-left transition-all group flex items-center gap-3 border border-white/10"
                    >
                        <div className="bg-white/20 p-2 rounded-lg group-hover:scale-110 transition-transform">
                            <Mail className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="font-semibold text-sm">Message</div>
                            <div className="text-[10px] text-indigo-100 opacity-80">Send new</div>
                        </div>
                    </button>

                    <button
                        onClick={() => router.push('/calendar?action=new')}
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-3 rounded-xl text-left transition-all group flex items-center gap-3 border border-white/10"
                    >
                        <div className="bg-white/20 p-2 rounded-lg group-hover:scale-110 transition-transform">
                            <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="font-semibold text-sm">Schedule</div>
                            <div className="text-[10px] text-indigo-100 opacity-80">New event</div>
                        </div>
                    </button>

                    {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                        <button
                            onClick={() => router.push('/admin?action=create_user')}
                            className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-3 rounded-xl text-left transition-all group flex items-center gap-3 border border-white/10"
                        >
                            <div className="bg-white/20 p-2 rounded-lg group-hover:scale-110 transition-transform">
                                <UserPlus className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <div className="font-semibold text-sm">Add User</div>
                                <div className="text-[10px] text-indigo-100 opacity-80">Admin only</div>
                            </div>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
