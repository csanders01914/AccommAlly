'use client';

import { useState } from 'react';
import { Lock, User, AlertCircle, Shield } from 'lucide-react';

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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDF6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-40" />

            <div className="relative w-full max-w-md">
                {/* Logo/Brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 mb-4">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">AccommAlly</h1>
                    <p className="text-blue-200/70 mt-2">Accommodation Tracking System</p>
                </div>

                {/* Login Card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8">
                    <h2 className="text-xl font-semibold text-white mb-6">
                        {isTwoFactor ? 'Two-Factor Authentication' : 'Sign in to your account'}
                    </h2>

                    {/* Error Alert */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-red-200 text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {isTwoFactor ? (
                            <div>
                                <label htmlFor="code" className="block text-sm font-medium text-blue-100 mb-2">
                                    Authentication Code
                                </label>
                                <div className="relative">
                                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300/50" />
                                    <input
                                        id="code"
                                        type="text"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        placeholder="Enter 6-digit code"
                                        required={isTwoFactor}
                                        className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-200/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        autoFocus
                                    />
                                </div>
                                <p className="text-xs text-blue-200/50 mt-2">
                                    Enter the code from your authenticator app or a recovery code.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Email Field */}
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-blue-100 mb-2">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300/50" />
                                        <input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="you@organization.org"
                                            required={!isTwoFactor}
                                            className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-200/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Password Field */}
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-blue-100 mb-2">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300/50" />
                                        <input
                                            id="password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required={!isTwoFactor}
                                            className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-200/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Remember & Forgot */}
                                <div className="flex items-center justify-between text-sm">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" className="w-4 h-4 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500" />
                                        <span className="text-blue-200/70">Remember me</span>
                                    </label>
                                    <a href="#" className="text-blue-400 hover:text-blue-300 transition-colors">
                                        Forgot password?
                                    </a>
                                </div>
                            </>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    {isTwoFactor ? 'Verifying...' : 'Signing in...'}
                                </>
                            ) : (
                                isTwoFactor ? 'Verify Code' : 'Sign In'
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-blue-200/50 text-sm mt-6">
                    Internal use only. Authorized personnel.
                </p>
            </div>
        </div>
    );
}

export default LoginPage;
