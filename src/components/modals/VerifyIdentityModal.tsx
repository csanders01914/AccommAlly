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
 setIsVerifying(true); setError(null);
 try {
 const res = await fetch(`/api/claimants/${claimantNumber}/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential }) });
 const data = await res.json();
 if (!res.ok) throw new Error(data.message || 'Verification failed');
 if (data.verified) {
 setSuccess(true);
 setTimeout(() => { onVerified(data.credentialType); setSuccess(false); setCredential(''); onClose(); }, 1500);
 } else {
 throw new Error(data.message || 'Incorrect PIN or passphrase');
 }
 } catch (err: any) { setError(err.message); }
 finally { setIsVerifying(false); }
 };

 return (
 <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
 <div className="modal-container w-full max-w-sm overflow-hidden">
 <div className="flex items-center justify-between px-5 py-4 border-b border-border">
 <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
 <Shield className="w-4 h-4 text-primary-500" />
 Verify Identity
 </h2>
 <button onClick={onClose} className="p-1.5 hover:bg-surface-raised rounded-lg transition-colors">
 <X className="w-4 h-4 text-text-muted" />
 </button>
 </div>

 <div className="p-6">
 {success ? (
 <div className="text-center py-4">
 <div className="w-16 h-16 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
 <CheckCircle className="w-8 h-8 text-primary-500" />
 </div>
 <h3 className="text-base font-semibold text-text-primary">Verified!</h3>
 <p className="text-sm text-text-muted mt-1">Identity confirmed successfully.</p>
 </div>
 ) : (
 <form onSubmit={handleVerify} className="space-y-4">
 <p className="text-sm text-text-secondary">Enter the claimant's PIN or passphrase to verify their identity.</p>

 {error && (
 <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2">
 <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
 </div>
 )}

 <input
 type="password"
 className="w-full px-4 py-3 text-center text-lg tracking-widest rounded-lg border border-border bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors placeholder:text-sm placeholder:tracking-normal"
 placeholder="Enter Credential"
 value={credential}
 onChange={(e) => setCredential(e.target.value)}
 autoFocus
 />

 <button type="submit" disabled={isVerifying || !credential} className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
 {isVerifying ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : 'Verify'}
 </button>
 </form>
 )}
 </div>
 </div>
 </div>
 );
}
