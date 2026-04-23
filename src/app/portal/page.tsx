'use client';
import { apiFetch } from '@/lib/api-client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Key, User, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function PortalLoginPage() {
 const router = useRouter();
 const [identifier, setIdentifier] = useState('');
 const [lastName, setLastName] = useState('');
 const [pin, setPin] = useState('');
 const [isLoading, setIsLoading] = useState(false);
 const [error, setError] = useState('');

 const handleLogin = async (e: React.FormEvent) => {
 e.preventDefault();
 setIsLoading(true);
 setError('');

 try {
 const res = await apiFetch('/api/public/portal/login', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ identifier, lastName, pin })
 });

 if (res.ok) {
 router.push('/portal/dashboard');
 } else {
 const data = await res.json();
 setError(data.error || 'Login failed');
 }
 } catch (e) {
 setError('An error occurred. Please try again.');
 } finally {
 setIsLoading(false);
 }
 };

 return (
 <div className="min-h-screen bg-[#FAF6EE] flex items-center justify-center p-4">
 {/* Background Pattern */}
 <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDF6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />

 <div className="max-w-md w-full relative">
 <div className="text-center mb-8">
 <div className="inline-flex p-3 rounded-2xl bg-[#0D9488]/10 mb-4 ring-1 ring-[#0D9488]/20">
 <Shield className="w-8 h-8 text-[#0D9488]" />
 </div>
 <h1 className="text-2xl font-bold text-[#1C1A17]">AccommAlly Portal</h1>
 <p className="text-[#5C5850] text-sm mt-2">Check the status of your accommodation request</p>
 </div>

 <div className="bg-[#ffffff] border border-[#E5E2DB] rounded-3xl p-8 shadow-xl">
 <form onSubmit={handleLogin} className="space-y-6">
 {error && (
 <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm flex items-center gap-2">
 <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
 </div>
 )}

 <div>
 <label htmlFor="identifier" className="block text-sm font-medium text-[#1C1A17] mb-2">Claim ID or Case Number</label>
 <div className="relative">
 <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8880]" aria-hidden="true" />
 <input
 id="identifier"
 type="text"
 value={identifier}
 onChange={(e) => setIdentifier(e.target.value)}
 placeholder="e.g. 123456 or AA..."
 className="w-full bg-[#ffffff] border border-[#E5E2DB] rounded-xl pl-10 pr-4 py-3 text-[#1C1A17] outline-none focus:ring-2 focus:ring-[#0D9488] transition-all uppercase placeholder-[#8C8880]"
 required
 autoComplete="username"
 />
 </div>
 </div>

 <div>
 <label htmlFor="lastName" className="block text-sm font-medium text-[#1C1A17] mb-2">Last Name</label>
 <div className="relative">
 <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8880]" aria-hidden="true" />
 <input
 id="lastName"
 type="text"
 value={lastName}
 onChange={(e) => setLastName(e.target.value)}
 placeholder="Enter your last name"
 className="w-full bg-[#ffffff] border border-[#E5E2DB] rounded-xl pl-10 pr-4 py-3 text-[#1C1A17] outline-none focus:ring-2 focus:ring-[#0D9488] transition-all placeholder-[#8C8880]"
 required
 autoComplete="family-name"
 />
 </div>
 </div>

 <div>
 <label htmlFor="pin" className="block text-sm font-medium text-[#1C1A17] mb-2">PIN</label>
 <div className="relative">
 <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8880]" aria-hidden="true" />
 <input
 id="pin"
 type="password"
 inputMode="numeric"
 value={pin}
 onChange={(e) => setPin(e.target.value)}
 placeholder="Enter your PIN"
 className="w-full bg-[#ffffff] border border-[#E5E2DB] rounded-xl pl-10 pr-4 py-3 text-[#1C1A17] outline-none focus:ring-2 focus:ring-[#0D9488] transition-all placeholder-[#8C8880]"
 required
 autoComplete="current-password"
 />
 </div>
 <p className="mt-1.5 text-xs text-[#8C8880]">Your PIN was provided when your case was opened. Contact your examiner if you need help.</p>
 </div>

 <button
 type="submit"
 disabled={isLoading}
 className="w-full bg-[#0D9488] hover:bg-[#0F766E] text-white font-medium py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
 >
 {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>View Status <ArrowRight className="w-4 h-4" /></>}
 </button>
 </form>
 </div>

 <p className="text-center text-[#5C5850] text-xs mt-6">
 Need help? Contact your accommodation examiner directly.
 </p>
 </div>
 </div>
 );
}
