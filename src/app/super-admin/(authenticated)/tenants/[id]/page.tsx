'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Tenant {
 id: string;
 name: string;
 slug: string;
 domain: string | null;
 status: string;
 plan: string;
 createdAt: string;
 users: { id: string; email: string; role: string }[];
 settings?: {
 branding?: {
 primaryColor?: string;
 secondaryColor?: string;
 };
 };
}

export default function TenantDetailsPage() {
 const params = useParams();
 const searchParams = useSearchParams();
 const [tenant, setTenant] = useState<Tenant | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState('');

 const isCreated = searchParams.get('created') === 'true';

 useEffect(() => {
 const fetchTenant = async () => {
 try {
 const res = await fetch(`/api/super-admin/tenants/${params.id}`);
 const data = await res.json();

 if (!res.ok) {
 throw new Error(data.error || 'Failed to load tenant');
 }

 setTenant(data.tenant);
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Failed to load tenant');
 } finally {
 setLoading(false);
 }
 };

 if (params.id) {
 fetchTenant();
 }
 }, [params.id]);

 if (loading) {
 return (
 <div className="flex items-center justify-center min-h-[400px]">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
 </div>
 );
 }

 if (error || !tenant) {
 return (
 <div className="text-center py-12">
 <h2 className="text-xl font-semibold text-red-500 mb-2">Error</h2>
 <p className="text-slate-500 mb-4">{error || 'Tenant not found'}</p>
 <Link href="/super-admin/tenants" className="text-indigo-400 hover:text-indigo-300">
 Back to Tenants
 </Link>
 </div>
 );
 }

 return (
 <div className="max-w-4xl mx-auto">
 {/* Header */}
 <div className="mb-8">
 <Link
 href="/super-admin/tenants"
 className="text-sm text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1 mb-4"
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
 </svg>
 Back to Tenants
 </Link>

 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-3xl font-bold text-slate-900 mb-2">{tenant.name}</h1>
 <div className="flex items-center gap-3">
 <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${tenant.status === 'ACTIVE'
 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
 : 'bg-slate-700 text-slate-500 border-slate-600'
 }`}>
 {tenant.status}
 </span>
 <span className="text-slate-500 text-sm">{tenant.plan} Plan</span>
 </div>
 </div>
 </div>
 </div>

 {isCreated && (
 <div className="mb-8 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-lg flex items-center gap-2">
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
 </svg>
 Tenant created successfully!
 </div>
 )}

 {/* Content Grid */}
 <div className="grid md:grid-cols-2 gap-6">
 {/* Details Card */}
 <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-6">
 <h2 className="text-lg font-semibold text-slate-900 mb-4">Configuration</h2>
 <div className="space-y-4">
 <div>
 <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
 URL Slug
 </label>
 <div className="flex items-center gap-2 text-slate-600 font-mono text-sm bg-slate-50 p-2 rounded">
 {tenant.slug}.accommally.com
 </div>
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
 Custom Domain
 </label>
 <div className="text-slate-600">
 {tenant.domain || <span className="text-slate-600 italic">None configured</span>}
 </div>
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
 Tenant ID
 </label>
 <div className="text-slate-500 font-mono text-xs">
 {tenant.id}
 </div>
 </div>
 </div>
 </div>

 {/* Users Card (Placeholder for now) */}
 <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-6">
 <h2 className="text-lg font-semibold text-slate-900 mb-4">Users</h2>
 <p className="text-slate-500 text-sm mb-4">
 This tenant has {tenant.users?.length || 0} user(s).
 </p>
 {/* We could list admins here if the API returns them */}
 </div>

 {/* Branding Configuration */}
 <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-6 md:col-span-2">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-lg font-semibold text-slate-900">Branding Configuration</h2>
 <BrandingEditor tenant={tenant} />
 </div>
 </div>

 {/* Letter Templates */}
 <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-6 md:col-span-2">
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-lg font-semibold text-slate-900">Letter Templates</h2>
 <p className="text-sm text-slate-500 mt-1">
 Manage DOCX templates used for emails and letters sent to claimants and healthcare providers.
 </p>
 </div>
 <Link
 href={`/super-admin/tenants/${tenant.id}/templates`}
 className="flex items-center gap-2 px-4 py-2 bg-indigo-700 hover:bg-indigo-600 !text-white text-sm font-medium rounded-lg transition-colors"
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
 </svg>
 Manage Templates
 </Link>
 </div>
 </div>
 </div>
 </div>
 );
}

function BrandingEditor({ tenant }: { tenant: Tenant }) {
 const [primaryColor, setPrimaryColor] = useState(tenant.settings?.branding?.primaryColor || '#6366f1');
 const [secondaryColor, setSecondaryColor] = useState(tenant.settings?.branding?.secondaryColor || '#a855f7');
 const [saving, setSaving] = useState(false);
 const [message, setMessage] = useState('');

 const handleSave = async () => {
 setSaving(true);
 setMessage('');

 try {
 const newSettings = {
 ...tenant.settings,
 branding: {
 primaryColor,
 secondaryColor
 }
 };

 const res = await fetch(`/api/super-admin/tenants/${tenant.id}`, {
 method: 'PATCH',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ settings: newSettings })
 });

 if (!res.ok) throw new Error('Failed to update');

 setMessage('Saved!');

 // Clear message after 3s
 setTimeout(() => setMessage(''), 3000);
 } catch (e) {
 setMessage('Error saving');
 } finally {
 setSaving(false);
 }
 };

 return (
 <div className="flex items-center gap-6">
 <div className="flex items-center gap-2">
 <input
 type="color"
 value={primaryColor}
 onChange={(e) => setPrimaryColor(e.target.value)}
 className="h-8 w-8 rounded cursor-pointer bg-transparent border-none"
 title="Primary Color"
 />
 <div className="text-xs">
 <div className="text-slate-500">Primary</div>
 <div className="text-slate-600 font-mono">{primaryColor}</div>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <input
 type="color"
 value={secondaryColor}
 onChange={(e) => setSecondaryColor(e.target.value)}
 className="h-8 w-8 rounded cursor-pointer bg-transparent border-none"
 title="Secondary Color"
 />
 <div className="text-xs">
 <div className="text-slate-500">Secondary</div>
 <div className="text-slate-600 font-mono">{secondaryColor}</div>
 </div>
 </div>

 <button
 onClick={handleSave}
 disabled={saving}
 className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-slate-900 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
 >
 {saving ? 'Saving...' : 'Save Branding'}
 </button>
 {message && (
 <span className={`text-sm ${message.includes('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
 {message}
 </span>
 )}
 </div>
 );
}
