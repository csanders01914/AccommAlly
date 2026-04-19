'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

export default function EditTenantPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        domain: '',
        plan: 'FREE',
        status: 'ACTIVE',
    });

    useEffect(() => {
        fetchTenant();
    }, [id]);

    const fetchTenant = async () => {
        try {
            const res = await fetch(`/api/super-admin/tenants/${id}`);
            if (res.ok) {
                const data = await res.json();
                setFormData({
                    name: data.tenant.name,
                    slug: data.tenant.slug,
                    domain: data.tenant.domain || '',
                    plan: data.tenant.plan,
                    status: data.tenant.status,
                });
            } else {
                setError('Failed to fetch tenant details');
            }
        } catch (err) {
            setError('Error fetching tenant');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const res = await fetch(`/api/super-admin/tenants/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    domain: formData.domain || null, // Send null if empty
                    plan: formData.plan,
                    status: formData.status,
                }),
            });

            if (res.ok) {
                router.push('/super-admin/tenants');
                router.refresh();
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to update tenant');
            }
        } catch (err) {
            setError('An error occurred while saving');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">Edit Tenant</h1>
                <button
                    onClick={() => router.back()}
                    className="text-slate-400 hover:text-white"
                >
                    Back
                </button>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg mb-6">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-slate-800 rounded-lg p-6 space-y-6">
                {/* Read Only Slug */}
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                        URL Slug (Read Only)
                    </label>
                    <input
                        type="text"
                        value={formData.slug}
                        disabled
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-500 cursor-not-allowed"
                    />
                </div>

                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Organization Name
                    </label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                    />
                </div>

                {/* Domain */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Custom Domain (Optional)
                    </label>
                    <input
                        type="text"
                        value={formData.domain}
                        onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                        placeholder="e.g. portal.acme.com"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                    />
                </div>

                {/* Plan */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Subscription Plan
                    </label>
                    <select
                        value={formData.plan}
                        onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                    >
                        <option value="FREE">Free</option>
                        <option value="STARTER">Starter</option>
                        <option value="PRO">Professional</option>
                        <option value="ENTERPRISE">Enterprise</option>
                    </select>
                </div>

                {/* Status */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Status
                    </label>
                    <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                    >
                        <option value="ACTIVE">Active</option>
                        <option value="SUSPENDED">Suspended</option>
                        <option value="PENDING">Pending</option>
                    </select>
                </div>

                <div className="pt-4 flex items-center justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
}
