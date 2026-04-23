'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes remaining (so warn at 10 mins)
const CHECK_INTERVAL_MS = 1000; // Check every second

export default function SessionTimeoutProvider({ children }: { children: React.ReactNode }) {
 const router = useRouter();
 const pathname = usePathname();
 const [showModal, setShowModal] = useState(false);
 const [timeLeft, setTimeLeft] = useState(0);

 // Use a ref for last activity to avoid re-renders on every mouse move
 const lastActivityRef = useRef<number>(Date.now());
 const intervalRef = useRef<NodeJS.Timeout | null>(null);

 const resetTimer = useCallback(() => {
 lastActivityRef.current = Date.now();
 setShowModal(false);
 }, []);

 const logout = useCallback(() => {
 // Clear any local storage if used
 if (typeof window !== 'undefined') {
 localStorage.clear();
 sessionStorage.clear();
 // Clear all cookies
 document.cookie.split(";").forEach((c) => {
 document.cookie = c
 .replace(/^ +/, "")
 .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
 });
 }
 // Redirect to login
 router.push('/login');
 }, [router]);

 useEffect(() => {
 // Events to track activity
 const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

 // Throttle the event listener to avoid performance issues
 let timeout: NodeJS.Timeout;
 const handleActivity = () => {
 if (!timeout) {
 timeout = setTimeout(() => {
 resetTimer();
 // @ts-ignore
 timeout = null;
 }, 500);
 }
 };

 // Only attach listeners if user is essentially "logged in"
 // Since we don't have a real auth state here, we assume any page other than '/' is protected
 // or if we are on '/', we might still want to track but logout loops are bad.
 // Let's assume protection is needed everywhere.

 events.forEach(event => window.addEventListener(event, handleActivity));

 return () => {
 events.forEach(event => window.removeEventListener(event, handleActivity));
 if (timeout) clearTimeout(timeout);
 };
 }, [resetTimer]);

 useEffect(() => {
 intervalRef.current = setInterval(() => {
 const now = Date.now();
 const timeElapsed = now - lastActivityRef.current;
 const timeRemaining = SESSION_TIMEOUT_MS - timeElapsed;

 // Update countdown if modal is showing
 if (timeRemaining <= WARNING_THRESHOLD_MS) {
 setTimeLeft(timeRemaining);
 setShowModal(true);
 } else {
 setShowModal(false);
 }

 if (timeElapsed >= SESSION_TIMEOUT_MS) {
 logout();
 }
 }, CHECK_INTERVAL_MS);

 return () => {
 if (intervalRef.current) clearInterval(intervalRef.current);
 };
 }, [logout]);

 // Don't show timeout logic on public pages to avoid loops or annoyance before login
 const PUBLIC_PATHS = ['/', '/login', '/about'];
 if (PUBLIC_PATHS.includes(pathname)) {
 // Reset timer when on login page so timer starts fresh on navigation
 lastActivityRef.current = Date.now();
 return <>{children}</>;
 }

 // Format milliseconds to MM:SS
 const formatTime = (ms: number) => {
 const totalSeconds = Math.max(0, Math.floor(ms / 1000));
 const minutes = Math.floor(totalSeconds / 60);
 const seconds = totalSeconds % 60;
 return `${minutes}:${seconds.toString().padStart(2, '0')}`;
 };

 return (
 <>
 {children}
 {showModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 ">
 <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
 <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
 Session Expiring
 </h2>
 <p className="text-zinc-600 dark:text-zinc-400 mb-6">
 Your session will expire in <span className="font-bold text-red-500">{formatTime(timeLeft)}</span>.
 Click "Refresh" to continue working.
 </p>
 <div className="flex justify-end gap-3">
 <button
 onClick={logout}
 className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
 >
 Log Out
 </button>
 <button
 onClick={resetTimer}
 className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium shadow-sm"
 >
 Refresh Session
 </button>
 </div>
 </div>
 </div>
 )}
 </>
 );
}
