'use client';

import { useState } from 'react';
import { X, Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface VerifyIdentityModalProps {
    isOpen: boolean;
    onClose: () => void;
    claimantNumber: string;
    onVerified: (method: 'PIN' | 'PASSPHRASE') => void;
}

export default function VerifyIdentityModal({ isOpen, onClose, claimantNumber, onVerified }: VerifyIdentityModalProps) {
    const [credential, setCredential] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsVerifying(true);
        setError(null);

        try {
            const res = await fetch(`/api/claimants/${claimantNumber}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Verification failed');
            }

            if (data.verified) {
                setSuccess(true);
                setTimeout(() => {
                    onVerified(data.credentialType);
                    setSuccess(false);
                    setCredential('');
                    onClose();
                }, 1500);
            } else {
                throw new Error(data.message || 'Incorrect PIN or passphrase');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-600" />
                        Verify Identity
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6">
                    {success ? (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Verified!</h3>
                            <p className="text-gray-500">Identity confirmed successfully.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleVerify} className="space-y-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Enter the claimant's PIN or passphrase to verify their identity.
                            </p>

                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </div>
                            )}

                            <div>
                                <input
                                    type="password"
                                    className="w-full px-4 py-3 text-center text-lg tracking-widest rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-sm placeholder:tracking-normal"
                                    placeholder="Enter Credential"
                                    value={credential}
                                    onChange={(e) => setCredential(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isVerifying || !credential}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                            >
                                {isVerifying ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    'Verify'
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
