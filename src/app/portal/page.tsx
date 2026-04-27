'use client';

import Link from 'next/link';
import { Shield, LogIn, UserPlus, ArrowRight } from 'lucide-react';

export default function PortalLandingPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDF6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />

      <div className="max-w-md w-full relative">
        <div className="text-center mb-10">
          <div className="inline-flex p-3 rounded-2xl bg-primary-500/10 mb-4 ring-1 ring-[#0D9488]/20">
            <Shield className="w-8 h-8 text-primary-500" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary">AccommAlly Portal</h1>
          <p className="text-text-secondary text-sm mt-2">
            Manage your accommodation requests securely online
          </p>
        </div>

        <div className="bg-surface border border-border rounded-3xl p-8 shadow-xl space-y-4">
          <Link
            href="/portal/login"
            className="flex items-center justify-between w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-4 px-6 rounded-2xl transition-all shadow-md group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <LogIn className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-semibold">Sign In</p>
                <p className="text-xs text-white/70">Access your existing account</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform" />
          </Link>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-text-muted font-medium">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Link
            href="/portal/register"
            className="flex items-center justify-between w-full bg-surface border border-border hover:bg-surface-raised text-text-primary font-medium py-4 px-6 rounded-2xl transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-primary-500" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-text-primary">Create Account</p>
                <p className="text-xs text-text-muted">Set up portal access for the first time</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-text-muted opacity-50 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
          </Link>
        </div>

        <p className="text-center text-text-secondary text-xs mt-6">
          Need help? Contact your accommodation examiner directly.
        </p>
      </div>
    </div>
  );
}
