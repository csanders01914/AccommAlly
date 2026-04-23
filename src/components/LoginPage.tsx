'use client';

import { useState } from 'react';
import { Lock, Mail, AlertCircle, Shield, ArrowRight, Loader2 } from 'lucide-react';

interface LoginPageProps {
 onLogin: (email: string, password: string) => void;
 onVerify2FA?: (code: string) => void;
 isTwoFactor?: boolean;
 error?: string;
 isLoading?: boolean;
}

export function LoginPage({ onLogin, onVerify2FA, isTwoFactor = false, error, isLoading = false }: LoginPageProps) {
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [code, setCode] = useState('');

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (isTwoFactor && onVerify2FA) {
 onVerify2FA(code);
 } else {
 onLogin(email, password);
 }
 };

 return (
 <div className="min-h-screen flex" style={{ backgroundColor: '#FAF6EE' }}>

 {/* Left panel — brand */}
 <div
 className="hidden lg:flex lg:w-[42%] xl:w-[38%] flex-col justify-between p-12 relative overflow-hidden"
 style={{ backgroundColor: '#1C1A17' }}
 >
 {/* Subtle background texture */}
 <div
 className="absolute inset-0 pointer-events-none"
 style={{
 backgroundImage: `radial-gradient(ellipse at 30% 20%, rgba(13,148,136,0.12) 0%, transparent 55%),
 radial-gradient(ellipse at 80% 80%, rgba(13,148,136,0.06) 0%, transparent 50%)`,
 }}
 />

 {/* Logo */}
 <div className="relative z-10">
 <div className="flex items-center gap-3 mb-16">
 <div
 className="w-8 h-8 rounded-lg flex items-center justify-center"
 style={{ backgroundColor: '#0D9488' }}
 >
 <Shield className="w-4 h-4 text-white" aria-hidden="true" />
 </div>
 <span
 className="text-xl"
 style={{
 fontFamily: 'var(--font-instrument-serif), Georgia, serif',
 color: '#F0EEE8',
 }}
 >
 AccommAlly
 </span>
 </div>

 <h2
 className="text-4xl xl:text-5xl leading-[1.15] mb-6"
 style={{
 fontFamily: 'var(--font-instrument-serif), Georgia, serif',
 color: '#F0EEE8',
 }}
 >
 Streamline your accommodation workflow.
 </h2>
 <p className="text-base leading-relaxed" style={{ color: 'rgba(240,238,232,0.5)' }}>
 Case management built for HR and disability accommodation teams — secure, compliant, and built for daily use.
 </p>
 </div>

 {/* Bottom caption */}
 <div className="relative z-10">
 <p className="text-xs" style={{ color: 'rgba(240,238,232,0.25)' }}>
 Internal use only &nbsp;&middot;&nbsp; Authorized personnel
 </p>
 </div>

 {/* Decorative line */}
 <div
 className="absolute bottom-0 left-0 right-0 h-px"
 style={{ background: 'linear-gradient(to right, transparent, rgba(13,148,136,0.4), transparent)' }}
 />
 </div>

 {/* Right panel — form */}
 <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 sm:px-12">

 {/* Mobile logo */}
 <div className="flex items-center gap-2.5 mb-10 lg:hidden">
 <div
 className="w-7 h-7 rounded-lg flex items-center justify-center"
 style={{ backgroundColor: '#0D9488' }}
 >
 <Shield className="w-3.5 h-3.5 text-white" aria-hidden="true" />
 </div>
 <span
 className="text-lg"
 style={{
 fontFamily: 'var(--font-instrument-serif), Georgia, serif',
 color: '#1C1A17',
 }}
 >
 AccommAlly
 </span>
 </div>

 <div className="w-full max-w-sm">
 <div className="mb-8">
 <h1 className="text-2xl font-semibold mb-1" style={{ color: '#1C1A17' }}>
 {isTwoFactor ? 'Verify your identity' : 'Sign in'}
 </h1>
 <p className="text-sm" style={{ color: '#8C8880' }}>
 {isTwoFactor
 ? 'Enter the code from your authenticator app.'
 : 'Enter your credentials to access your account.'}
 </p>
 </div>

 {/* Error */}
 {error && (
 <div
 className="mb-6 px-4 py-3 rounded-lg flex items-start gap-3"
 style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}
 role="alert"
 >
 <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#DC2626' }} aria-hidden="true" />
 <p className="text-sm" style={{ color: '#991B1B' }}>{error}</p>
 </div>
 )}

 <form onSubmit={handleSubmit} className="space-y-4">
 {isTwoFactor ? (
 <div>
 <label htmlFor="code" className="block text-sm font-medium mb-1.5" style={{ color: '#1C1A17' }}>
 Authentication Code
 </label>
 <div className="relative">
 <Shield
 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
 style={{ color: '#C8C4BB' }}
 aria-hidden="true"
 />
 <input
 id="code"
 type="text"
 value={code}
 onChange={(e) => setCode(e.target.value)}
 placeholder="000000"
 required={isTwoFactor}
 autoFocus
 className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm transition-all"
 style={{
 backgroundColor: '#FFFFFF',
 border: '1px solid #E5E2DB',
 color: '#1C1A17',
 outline: 'none',
 }}
 onFocus={e => (e.target.style.borderColor = '#0D9488')}
 onBlur={e => (e.target.style.borderColor = '#E5E2DB')}
 />
 </div>
 </div>
 ) : (
 <>
 <div>
 <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: '#1C1A17' }}>
 Email Address
 </label>
 <div className="relative">
 <Mail
 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
 style={{ color: '#C8C4BB' }}
 aria-hidden="true"
 />
 <input
 id="email"
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 placeholder="you@organization.org"
 required={!isTwoFactor}
 autoFocus
 className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm transition-all"
 style={{
 backgroundColor: '#FFFFFF',
 border: '1px solid #E5E2DB',
 color: '#1C1A17',
 outline: 'none',
 }}
 onFocus={e => (e.target.style.borderColor = '#0D9488')}
 onBlur={e => (e.target.style.borderColor = '#E5E2DB')}
 />
 </div>
 </div>

 <div>
 <div className="flex items-center justify-between mb-1.5">
 <label htmlFor="password" className="block text-sm font-medium" style={{ color: '#1C1A17' }}>
 Password
 </label>
 <a
 href="#"
 className="text-xs transition-colors"
 style={{ color: '#0D9488', textDecoration: 'none' }}
 onMouseEnter={e => (e.currentTarget.style.color = '#0F766E')}
 onMouseLeave={e => (e.currentTarget.style.color = '#0D9488')}
 >
 Forgot password?
 </a>
 </div>
 <div className="relative">
 <Lock
 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
 style={{ color: '#C8C4BB' }}
 aria-hidden="true"
 />
 <input
 id="password"
 type="password"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 placeholder="••••••••"
 required={!isTwoFactor}
 className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm transition-all"
 style={{
 backgroundColor: '#FFFFFF',
 border: '1px solid #E5E2DB',
 color: '#1C1A17',
 outline: 'none',
 }}
 onFocus={e => (e.target.style.borderColor = '#0D9488')}
 onBlur={e => (e.target.style.borderColor = '#E5E2DB')}
 />
 </div>
 </div>

 <div className="flex items-center gap-2 pt-0.5">
 <input
 id="remember"
 type="checkbox"
 className="w-3.5 h-3.5 rounded"
 style={{ accentColor: '#0D9488' }}
 />
 <label htmlFor="remember" className="text-sm cursor-pointer" style={{ color: '#8C8880' }}>
 Remember me
 </label>
 </div>
 </>
 )}

 <button
 type="submit"
 disabled={isLoading}
 className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-150 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
 style={{ backgroundColor: '#0D9488' }}
 onMouseEnter={e => { if (!isLoading) e.currentTarget.style.backgroundColor = '#0F766E'; }}
 onMouseLeave={e => { if (!isLoading) e.currentTarget.style.backgroundColor = '#0D9488'; }}
 >
 {isLoading ? (
 <>
 <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
 <span>{isTwoFactor ? 'Verifying…' : 'Signing in…'}</span>
 </>
 ) : (
 <>
 <span>{isTwoFactor ? 'Verify Code' : 'Sign In'}</span>
 <ArrowRight className="w-4 h-4" aria-hidden="true" />
 </>
 )}
 </button>
 </form>
 </div>
 </div>
 </div>
 );
}

export default LoginPage;
