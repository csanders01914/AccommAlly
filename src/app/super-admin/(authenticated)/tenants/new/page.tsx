'use client';
import { apiFetch } from '@/lib/api-client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewTenantPage() {
 const router = useRouter();
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState('');

 const [formData, setFormData] = useState({
 name: '',
 slug: '',
 domain: '',
 plan: 'FREE',
 adminName: '',
 adminEmail: '',
 adminPassword: '',
 confirmPassword: '',
 });

 const generateSlug = (name: string) => {
 return name
 .toLowerCase()
 .replace(/[^a-z0-9]+/g, '-')
 .replace(/^-+|-+$/g, '')
 .substring(0, 50);
 };

 const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const name = e.target.value;
 setFormData(prev => ({
 ...prev,
 name,
 slug: prev.slug || generateSlug(name), // Only auto-generate if slug is empty
 }));
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setError('');

 // Validation
 if (formData.adminPassword !== formData.confirmPassword) {
 setError('Passwords do not match');
 return;
 }

 if (formData.adminPassword.length < 8) {
 setError('Password must be at least 8 characters');
 return;
 }

 setLoading(true);

 try {
 const res = await apiFetch('/api/super-admin/tenants', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 name: formData.name,
 slug: formData.slug,
 domain: formData.domain || undefined,
 plan: formData.plan,
 adminName: formData.adminName,
 adminEmail: formData.adminEmail,
 adminPassword: formData.adminPassword,
 }),
 });

 const data = await res.json();

 if (!res.ok) {
 throw new Error(data.error || 'Failed to create tenant');
 }

 router.push(`/super-admin/tenants/${data.tenant.id}?created=true`);
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Failed to create tenant');
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="max-w-2xl mx-auto">
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
 <h1 className="text-3xl font-bold text-slate-900">Create New Tenant</h1>
 <p className="text-slate-500 mt-1">Set up a new workspace for an organization</p>
 </div>

 {/* Form */}
 <form onSubmit={handleSubmit} className="space-y-8">
 {error && (
 <div className="bg-red-100 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
 {error}
 </div>
 )}

 {/* Organization Details */}
 <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-6 space-y-6">
 <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
 <svg className="w-5 h-5 text-violet-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
 </svg>
 Organization Details
 </h2>

 <div className="grid gap-6">
 <div>
 <label htmlFor="name" className="block text-sm font-medium text-slate-600 mb-2">
 Organization Name *
 </label>
 <input
 id="name"
 type="text"
 value={formData.name}
 onChange={handleNameChange}
 className="w-full px-4 py-3 bg-slate-50 border border-slate-600/50 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent transition-all"
 placeholder="Acme Corporation"
 required
 />
 </div>

 <div>
 <label htmlFor="slug" className="block text-sm font-medium text-slate-600 mb-2">
 URL Slug *
 </label>
 <div className="flex items-center gap-2">
 <span className="text-slate-500 text-sm">https://</span>
 <input
 id="slug"
 type="text"
 value={formData.slug}
 onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
 className="flex-1 px-4 py-3 bg-slate-50 border border-slate-600/50 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent transition-all"
 placeholder="acme-corp"
 required
 />
 <span className="text-slate-500 text-sm">.accommally.com</span>
 </div>
 </div>

 <div>
 <label htmlFor="domain" className="block text-sm font-medium text-slate-600 mb-2">
 Custom Domain <span className="text-slate-500">(optional)</span>
 </label>
 <input
 id="domain"
 type="text"
 value={formData.domain}
 onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
 className="w-full px-4 py-3 bg-slate-50 border border-slate-600/50 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent transition-all"
 placeholder="accommodations.acme.com"
 />
 </div>

 <div>
 <label htmlFor="plan" className="block text-sm font-medium text-slate-600 mb-2">
 Plan
 </label>
 <select
 id="plan"
 value={formData.plan}
 onChange={(e) => setFormData(prev => ({ ...prev, plan: e.target.value }))}
 className="w-full px-4 py-3 bg-slate-50 border border-slate-600/50 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent transition-all"
 >
 <option value="FREE">Free</option>
 <option value="STARTER">Starter</option>
 <option value="PRO">Pro</option>
 <option value="ENTERPRISE">Enterprise</option>
 </select>
 </div>
 </div>
 </div>

 {/* Initial Admin User */}
 <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-6 space-y-6">
 <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
 <svg className="w-5 h-5 text-violet-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
 </svg>
 Initial Admin User
 </h2>

 <div className="grid gap-6">
 <div>
 <label htmlFor="adminName" className="block text-sm font-medium text-slate-600 mb-2">
 Admin Name *
 </label>
 <input
 id="adminName"
 type="text"
 value={formData.adminName}
 onChange={(e) => setFormData(prev => ({ ...prev, adminName: e.target.value }))}
 className="w-full px-4 py-3 bg-slate-50 border border-slate-600/50 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent transition-all"
 placeholder="John Smith"
 required
 />
 </div>

 <div>
 <label htmlFor="adminEmail" className="block text-sm font-medium text-slate-600 mb-2">
 Admin Email *
 </label>
 <input
 id="adminEmail"
 type="email"
 value={formData.adminEmail}
 onChange={(e) => setFormData(prev => ({ ...prev, adminEmail: e.target.value }))}
 className="w-full px-4 py-3 bg-slate-50 border border-slate-600/50 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent transition-all"
 placeholder="admin@acme.com"
 required
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label htmlFor="adminPassword" className="block text-sm font-medium text-slate-600 mb-2">
 Password *
 </label>
 <input
 id="adminPassword"
 type="password"
 value={formData.adminPassword}
 onChange={(e) => setFormData(prev => ({ ...prev, adminPassword: e.target.value }))}
 className="w-full px-4 py-3 bg-slate-50 border border-slate-600/50 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent transition-all"
 placeholder="••••••••"
 required
 minLength={8}
 />
 </div>
 <div>
 <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-600 mb-2">
 Confirm Password *
 </label>
 <input
 id="confirmPassword"
 type="password"
 value={formData.confirmPassword}
 onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
 className="w-full px-4 py-3 bg-slate-50 border border-slate-600/50 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent transition-all"
 placeholder="••••••••"
 required
 />
 </div>
 </div>
 </div>
 </div>

 {/* Submit */}
 <div className="flex items-center justify-end gap-4">
 <Link
 href="/super-admin/tenants"
 className="px-6 py-3 text-slate-600 hover:text-slate-900 transition-colors"
 >
 Cancel
 </Link>
 <button
 type="submit"
 disabled={loading}
 className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-slate-900 font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
 >
 {loading ? (
 <>
 <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
 </svg>
 Creating...
 </>
 ) : (
 <>
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
 </svg>
 Create Tenant
 </>
 )}
 </button>
 </div>
 </form>
 </div>
 );
}
