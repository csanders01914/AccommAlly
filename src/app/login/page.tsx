'use client';

import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginPage } from '@/components/LoginPage';
import { Loader2 } from 'lucide-react';

export default function LoginRoute() {
  const router = useRouter();
  const [loginError, setLoginError] = useState<string | undefined>();
  const [isTwoFactor, setIsTwoFactor] = useState(false);
  const [tempUserId, setTempUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await apiFetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            router.push('/dashboard/tasks');
            return;
          }
        }
      } catch (e) {
        console.error('Session check failed', e);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, [router]);

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    setLoginError(undefined);
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.twoFactorRequired) {
          setIsTwoFactor(true);
          setTempUserId(data.userId);
        } else {
          router.push('/dashboard/tasks');
        }
      } else {
        setLoginError(data.error || 'Login failed');
      }
    } catch {
      setLoginError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async (code: string) => {
    setIsLoading(true);
    setLoginError(undefined);
    try {
      const res = await apiFetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: tempUserId, token: code }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push('/dashboard/tasks');
      } else {
        setLoginError(data.error || 'Verification failed');
      }
    } catch {
      setLoginError('Verification error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1C1A17' }}>
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#0D9488' }} />
      </div>
    );
  }

  return (
    <LoginPage
      onLogin={handleLogin}
      onVerify2FA={handleVerify2FA}
      isTwoFactor={isTwoFactor}
      error={loginError}
      isLoading={isLoading}
    />
  );
}
