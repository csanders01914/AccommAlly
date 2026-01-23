'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserSettingsPage } from '@/components/UserSettingsPage';
import { Loader2 } from 'lucide-react';

export default function SettingsPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    if (data.user) {
                        setUser(data.user);
                    } else {
                        router.push('/');
                    }
                } else {
                    router.push('/');
                }
            } catch (e) {
                console.error(e);
                router.push('/');
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <UserSettingsPage
            user={user}
            onUpdateUser={(updatedUser) => setUser({ ...user, ...updatedUser })}
        />
    );
}
