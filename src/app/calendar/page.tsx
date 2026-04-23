'use client';

import { Sidebar } from '@/components/Sidebar';
import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { EnhancedCalendarView } from '@/components/calendar/EnhancedCalendarView';
import { Loader2 } from 'lucide-react';

export default function CalendarPage() {
 const router = useRouter();
 const [loading, setLoading] = useState(true);
 const [currentUser, setCurrentUser] = useState<any>(null);
 const [unreadCount, setUnreadCount] = useState(0);

 // Auth check and data load
 useEffect(() => {
 const checkAuth = async () => {
 try {
 const res = await fetch('/api/auth/me');
 if (!res.ok) {
 router.push('/login');
 return;
 }
 const data = await res.json();
 setCurrentUser(data.user);

 // Fetch unread count for sidebar
 try {
 const unreadRes = await fetch('/api/messages/unread-count');
 if (unreadRes.ok) {
 const { count } = await unreadRes.json();
 setUnreadCount(count);
 }
 } catch (e) {
 console.error('Failed to fetch unread count', e);
 }

 } catch (e) {
 router.push('/login');
 } finally {
 setLoading(false);
 }
 };
 checkAuth();
 }, [router]);

 if (loading) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-[#FAF6EE]">
 <Loader2 className="w-10 h-10 animate-spin text-[#0D9488]" />
 </div>
 );
 }

 return (
 <div className="flex-1 flex flex-col h-full">
 <header className="px-6 py-4 flex justify-between items-center border-b border-[#E5E2DB] bg-[#ffffff] sticky top-0 z-10">
 <div>
 <h1 className="text-2xl font-bold text-[#1C1A17]">Calendar</h1>
 <p className="text-[#8C8880] text-sm mt-0.5">Manage meetings, tasks, and return calls</p>
 </div>
 </header>

 <main className="flex-1 overflow-hidden p-6">
 <Suspense fallback={
 <div className="flex items-center justify-center h-full">
 <Loader2 className="w-8 h-8 animate-spin text-[#0D9488]" />
 </div>
 }>
 <EnhancedCalendarView />
 </Suspense>
 </main>
 </div>
 );
}
