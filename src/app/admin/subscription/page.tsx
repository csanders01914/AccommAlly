import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import { SubscriptionPage } from '@/components/subscription/SubscriptionPage';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
 title: 'Subscription — AccommAlly',
 description: 'Manage your AccommAlly subscription plan and billing.',
};

export default async function AdminSubscriptionPage() {
 const session = await getSession();
 if (!session) redirect('/login');
 if (!['ADMIN', 'SUPER_ADMIN'].includes(session.role as string)) redirect('/dashboard');

 return <SubscriptionPage currentUserId={session.id as string} />;
}
