'use client';

import { useState, useEffect } from 'react';
import { Save, Upload, Building, ChevronDown, Trash2 } from 'lucide-react';

export default function SuperAdminSettingsPage() {
 const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
 const [selectedTenantId, setSelectedTenantId] = useState('');
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [message, setMessage] = useState('');
 const [logo, setLogo] = useState<string | null>(null);

 useEffect(() => {
 fetch('/api/super-admin/tenants')
 .then(r => r.json())
 .then(data => setTenants(data.tenants ?? []))
 .catch(() => setMessage('Failed to load tenants'))
 .finally(() => setLoading(false));
 }, []);

 useEffect(() => {
 if (!selectedTenantId) return;
 setLoading(true);
 fetch(`/api/super-admin/settings?tenantId=${selectedTenantId}`)
 .then(r => r.json())
 .then(data => setLogo(data.tenant?.settings?.branding?.logo || null))
 .catch(() => setMessage('Failed to load settings'))
 .finally(() => setLoading(false));
 }, [selectedTenantId]);

 const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;
 if (file.size > 500 * 1024) { setMessage('Error: Logo must be less than 500KB'); return; }
 const reader = new FileReader();
 reader.onloadend = () => setLogo(reader.result as string);
 reader.readAsDataURL(file);
 };

 const handleSave = async () => {
 if (!selectedTenantId) return;
 setSaving(true);
 setMessage('');
 try {
 const res = await fetch(`/api/super-admin/settings?tenantId=${selectedTenantId}`, {
 method: 'PATCH',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ settings: { branding: { logo } } }),
 });
 if (!res.ok) throw new Error();
 setMessage('Logo saved successfully.');
 setTimeout(() => setMessage(''), 3000);
 } catch {
 setMessage('Error saving logo.');
 } finally {
 setSaving(false);
 }
 };

 return (
 <div className="max-w-xl">
 <div className="mb-8">
 <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
 <Building className="w-7 h-7 text-violet-700" />
 Organization Settings
 </h1>
 <p className="text-slate-500 mt-1">Manage the logo for each tenant organization.</p>
 </div>

 <div className="mb-6">
 <label className="block text-sm font-medium text-slate-600 mb-2">Select Tenant</label>
 <div className="relative">
 <select
 value={selectedTenantId}
 onChange={e => setSelectedTenantId(e.target.value)}
 className="w-full border border-slate-300 text-slate-900 rounded-lg px-4 py-2.5 pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
 >
 <option value="" disabled>— Select a tenant —</option>
 {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
 </select>
 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
 </div>
 </div>

 {!selectedTenantId ? (
 <p className="text-slate-500 text-sm">Select a tenant above to manage its logo.</p>
 ) : loading ? (
 <div className="animate-pulse space-y-4">
 <div className="h-8 bg-slate-200 rounded w-1/3" />
 <div className="h-24 bg-slate-200 rounded" />
 </div>
 ) : (
 <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6">
 {message && (
 <div className={`px-4 py-3 rounded-lg text-sm ${message.startsWith('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
 {message}
 </div>
 )}

 <div>
 <h2 className="text-base font-semibold text-slate-900 mb-4">Organization Logo</h2>
 <div className="flex items-start gap-6">
 <div className="shrink-0">
 {logo ? (
 <div className="relative group">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={logo} alt="Logo" className="h-20 w-auto object-contain border border-slate-200 rounded-lg p-2 bg-white" />
 <button
 onClick={() => setLogo(null)}
 className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 transition-colors shadow-sm"
 title="Remove logo"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 ) : (
 <div className="h-20 w-32 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 bg-slate-50">
 <span className="text-xs font-medium">No logo</span>
 </div>
 )}
 </div>
 <div className="flex-1">
 <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors">
 <Upload className="w-4 h-4" />
 Upload Logo
 <input type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={handleLogoUpload} className="hidden" />
 </label>
 <p className="text-xs text-slate-500 mt-2">PNG, JPG, or SVG. Max 500KB.</p>
 <p className="text-xs text-slate-500 mt-1">Displayed in the sidebar. Transparent PNG or SVG recommended.</p>
 </div>
 </div>
 </div>

 <div className="pt-2 border-t border-slate-100">
 <button
 onClick={handleSave}
 disabled={saving || !selectedTenantId}
 className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
 >
 <Save className="w-4 h-4" />
 {saving ? 'Saving…' : 'Save Logo'}
 </button>
 </div>
 </div>
 )}
 </div>
 );
}
