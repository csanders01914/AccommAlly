'use client';
import { apiFetch } from '@/lib/api-client';

import { useState } from 'react';
import { X, Shield, FileText, User, Mail, Phone, Calendar, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils'; // Adjust path if needed

interface CreateClaimantModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateClaimantModal({ isOpen, onClose, onSuccess }: CreateClaimantModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        birthdate: '',
        credentialType: 'PIN' as 'PIN' | 'PASSPHRASE',
        credential: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        // Basic validation
        if (!formData.name || !formData.birthdate || !formData.credential) {
            setError('Please fill in all required fields');
            setIsSubmitting(false);
            return;
        }

        if (formData.credentialType === 'PIN' && !/^\d{4,6}$/.test(formData.credential)) {
            setError('PIN must be 4-6 digits');
            setIsSubmitting(false);
            return;
        }

        if (formData.credentialType === 'PASSPHRASE' && (formData.credential.length < 12 || formData.credential.length > 65)) {
            setError('Passphrase must be 12-65 characters');
            setIsSubmitting(false);
            return;
        }

        try {
            const res = await apiFetch('/api/claimants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                if (res.status === 409) {
                    throw new Error(`Claimant already exists (ID: ${data.existingClaimantNumber || 'Unknown'})`);
                }
                throw new Error(data.error || 'Failed to create claimant');
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New Claimant</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="email"
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="tel"
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth *</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="date"
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                value={formData.birthdate}
                                onChange={e => setFormData({ ...formData, birthdate: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Security Credential *</label>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <label className={cn(
                                "flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer text-sm font-medium transition-all",
                                formData.credentialType === 'PIN'
                                    ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400"
                                    : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                            )}>
                                <input
                                    type="radio"
                                    className="sr-only"
                                    checked={formData.credentialType === 'PIN'}
                                    onChange={() => setFormData({ ...formData, credentialType: 'PIN', credential: '' })}
                                />
                                <Shield className="w-4 h-4" />
                                PIN Code
                            </label>
                            <label className={cn(
                                "flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer text-sm font-medium transition-all",
                                formData.credentialType === 'PASSPHRASE'
                                    ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400"
                                    : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                            )}>
                                <input
                                    type="radio"
                                    className="sr-only"
                                    checked={formData.credentialType === 'PASSPHRASE'}
                                    onChange={() => setFormData({ ...formData, credentialType: 'PASSPHRASE', credential: '' })}
                                />
                                <FileText className="w-4 h-4" />
                                Passphrase
                            </label>
                        </div>

                        <input
                            type={formData.credentialType === 'PIN' ? "text" : "password"}
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400"
                            placeholder={formData.credentialType === 'PIN' ? "Enter 4-6 digit PIN" : "Enter 12-65 character passphrase"}
                            value={formData.credential}
                            onChange={e => setFormData({ ...formData, credential: e.target.value })}
                            pattern={formData.credentialType === 'PIN' ? "\\d*" : undefined}
                            maxLength={formData.credentialType === 'PIN' ? 6 : 65}
                            required
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            {formData.credentialType === 'PIN'
                                ? "This PIN will be required for phone verification."
                                : "A longer passphrase for higher security verification."}
                        </p>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-70 flex items-center gap-2"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Create Claimant
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
