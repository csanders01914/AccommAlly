'use client';
import { apiFetch } from '@/lib/api-client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { CaseDetailPage as CaseDetailComponent } from '@/components/CaseDetailPage';
import { Loader2 } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';

export default function CaseDetailPageWrapper() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [caseData, setCaseData] = useState<any>(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch User & Case Data
    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Get User Session
            const userRes = await apiFetch('/api/auth/me');
            if (!userRes.ok) {
                router.push('/login');
                return;
            }
            const userData = await userRes.json();
            setCurrentUser(userData.user);

            // 2. Unread Count
            try {
                const unreadRes = await apiFetch('/api/messages/unread-count');
                if (unreadRes.ok) {
                    const { count } = await unreadRes.json();
                    setUnreadCount(count);
                }
            } catch (e) {
                console.error("Failed to fetch unread count", e);
            }

            // 3. Get Case Data
            const caseRes = await fetch(`/api/cases/${id}`);
            if (!caseRes.ok) {
                const errorData = await caseRes.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to load case (${caseRes.status})`);
            }
            const caseResult = await caseRes.json();
            setCaseData(caseResult);

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to load case');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchData();
        }
    }, [id, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error || !caseData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Error Loading Case</h2>
                    <p className="text-gray-500 mb-4">{error}</p>
                    <button
                        onClick={() => router.push('/cases')}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                        Back to Cases
                    </button>
                </div>
            </div>
        );
    }



    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
            {currentUser && <Sidebar user={currentUser} unreadCount={unreadCount} onToggle={setSidebarCollapsed} />}

            <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                <CaseDetailComponent
                    caseId={id}
                    initialData={caseData}
                    currentUser={currentUser}
                    onBack={() => router.push('/cases')}
                    onRefresh={fetchData}
                    onAddNote={async (noteData) => {
                        try {
                            let body;
                            let headers: Record<string, string> = {};

                            if (noteData.file) {
                                const formData = new FormData();
                                formData.append('content', noteData.content);
                                formData.append('noteType', noteData.noteType);
                                formData.append('file', noteData.file);
                                formData.append('createTask', String(noteData.createTask || false));
                                if (noteData.taskDescription) formData.append('taskDescription', noteData.taskDescription);
                                if (noteData.taskDueDate) formData.append('taskDueDate', noteData.taskDueDate.toISOString());

                                formData.append('setReturnCall', String(noteData.setReturnCall || false));
                                if (noteData.returnCallDate) formData.append('returnCallDate', noteData.returnCallDate.toISOString());

                                body = formData;
                            } else {
                                headers['Content-Type'] = 'application/json';
                                body = JSON.stringify(noteData);
                            }

                            await fetch(`/api/cases/${id}/notes`, {
                                method: 'POST',
                                headers,
                                body
                            });
                            fetchData();
                        } catch (e) {
                            console.error("Failed to add note", e);
                        }
                    }}
                />
            </div>
        </div>
    );
}
