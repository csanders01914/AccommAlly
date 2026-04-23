
'use client';

import { useState, useEffect } from 'react';
import { Save, Upload, Trash2, Building } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

export default function TenantSettingsPage() {
 const [loading, setLoading] = useState(true);
 const [primaryColor, setPrimaryColor] = useState('#6366f1');
 const [secondaryColor, setSecondaryColor] = useState('#a855f7');
 const [sidebarBackground, setSidebarBackground] = useState('#1e293b'); // Default dark sidebar
 const [sidebarForeground, setSidebarForeground] = useState('#f8fafc'); // Default light text
 const [pageBackground, setPageBackground] = useState('#ffffff'); // Default white background
 const [pageBackgroundMode, setPageBackgroundMode] = useState<'solid' | 'gradient'>('solid');
 const [pageGradientStart, setPageGradientStart] = useState('#ffffff');
 const [pageGradientEnd, setPageGradientEnd] = useState('#eff6ff');
 const [pageGradientDirection, setPageGradientDirection] = useState('to bottom right');
 const [logo, setLogo] = useState<string | null>(null);
 const [saving, setSaving] = useState(false);
 const [message, setMessage] = useState('');

 useEffect(() => {
 const fetchSettings = async () => {
 try {
 const res = await apiFetch('/api/tenant/settings');
 if (res.ok) {
 const data = await res.json();
 if (data.settings) {
 setPrimaryColor(data.settings.branding?.primaryColor || '#6366f1');
 setSecondaryColor(data.settings.branding?.secondaryColor || '#a855f7');
 setSidebarBackground(data.settings.branding?.sidebarBackground || '#ffffff');
 setSidebarForeground(data.settings.branding?.sidebarForeground || '#0f172a');
 setPageBackground(data.settings.branding?.pageBackground || '#ffffff');
 setPageBackgroundMode(data.settings.branding?.pageBackgroundMode || 'solid');
 setPageGradientStart(data.settings.branding?.pageGradientStart || '#ffffff');
 setPageGradientEnd(data.settings.branding?.pageGradientEnd || '#eff6ff');
 setPageGradientDirection(data.settings.branding?.pageGradientDirection || 'to bottom right');
 setLogo(data.settings.branding?.logo || null);
 }
 }
 } catch (e) {
 console.error('Failed to load settings', e);
 } finally {
 setLoading(false);
 }
 };
 fetchSettings();
 }, []);

 const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 if (file.size > 500 * 1024) { // 500KB limit
 setMessage('Error: Logo must be less than 500KB');
 return;
 }

 const reader = new FileReader();
 reader.onloadend = () => {
 setLogo(reader.result as string);
 };
 reader.readAsDataURL(file);
 };

 const handleSave = async () => {
 setSaving(true);
 setMessage('');

 try {
 const newSettings = {
 branding: {
 primaryColor,
 secondaryColor,
 sidebarBackground,
 sidebarForeground,
 pageBackground,
 pageBackgroundMode,
 pageGradientStart,
 pageGradientEnd,
 pageGradientDirection,
 logo
 }
 };

 const res = await apiFetch('/api/tenant/settings', {
 method: 'PATCH',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ settings: newSettings })
 });

 if (!res.ok) throw new Error('Failed to update');

 setMessage('Organization settings updated successfully!');
 setTimeout(() => {
 setMessage('');
 window.location.reload(); // Reload to apply branding changes globally
 }, 1000);
 } catch (e) {
 setMessage('Error saving settings');
 } finally {
 setSaving(false);
 }
 };

 if (loading) {
 return (
 <div className="p-8">
 <div className="animate-pulse space-y-4">
 <div className="h-8 bg-[#F3F1EC] rounded w-1/4"></div>
 <div className="h-4 bg-[#F3F1EC] rounded w-1/2"></div>
 </div>
 </div>
 );
 }

 return (
 <div className="p-8 max-w-2xl">
 <div className="mb-8 pl-1">
 <h1 className="text-2xl font-bold text-[#1C1A17] flex items-center gap-3">
 <Building className="w-7 h-7 text-[#0D9488]" />
 Organization Settings
 </h1>
 <p className="text-[#8C8880] mt-1">Manage your organization's branding and appearance.</p>
 </div>

 <div className="space-y-8 bg-[#ffffff] p-8 rounded-xl border border-[#E5E2DB] shadow-sm">
 {/* Branding Colors */}
 <div>
 <h2 className="text-lg font-semibold text-[#1C1A17] mb-4">Brand Colors</h2>
 <div className="grid md:grid-cols-2 gap-6">
 <div>
 <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880] mb-1.5">
 Primary Color
 </label>
 <div className="flex items-center gap-3">
 <div className="relative">
 <input
 type="color"
 value={primaryColor}
 onChange={(e) => setPrimaryColor(e.target.value)}
 className="h-10 w-10 rounded cursor-pointer bg-transparent border-none p-0 opacity-0 absolute inset-0 z-10"
 />
 <div className="h-10 w-10 rounded border border-[#E5E2DB] shadow-sm" style={{ backgroundColor: primaryColor }}></div>
 </div>
 <span className="font-mono text-sm text-[#5C5850] border border-[#E5E2DB] px-3 py-2 rounded-md bg-[#FAF6EE]">{primaryColor}</span>
 </div>
 <p className="text-xs text-[#8C8880] mt-2">Used for buttons, links, and active states.</p>
 </div>

 <div>
 <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880] mb-1.5">
 Secondary Color
 </label>
 <div className="flex items-center gap-3">
 <div className="relative">
 <input
 type="color"
 value={secondaryColor}
 onChange={(e) => setSecondaryColor(e.target.value)}
 className="h-10 w-10 rounded cursor-pointer bg-transparent border-none p-0 opacity-0 absolute inset-0 z-10"
 />
 <div className="h-10 w-10 rounded border border-[#E5E2DB] shadow-sm" style={{ backgroundColor: secondaryColor }}></div>
 </div>
 <span className="font-mono text-sm text-[#5C5850] border border-[#E5E2DB] px-3 py-2 rounded-md bg-[#FAF6EE]">{secondaryColor}</span>
 </div>
 <p className="text-xs text-[#8C8880] mt-2">Used for accents and highlights.</p>
 </div>
 </div>
 </div>

 <div className="border-t border-[#E5E2DB] pt-8"></div>

 {/* Sidebar Appearance */}
 <div>
 <h2 className="text-lg font-semibold text-[#1C1A17] mb-4">Sidebar Appearance</h2>
 <div className="grid md:grid-cols-2 gap-6">
 <div>
 <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880] mb-1.5">
 Sidebar Background
 </label>
 <div className="flex items-center gap-3">
 <div className="relative">
 <input
 type="color"
 value={sidebarBackground}
 onChange={(e) => setSidebarBackground(e.target.value)}
 className="h-10 w-10 rounded cursor-pointer bg-transparent border-none p-0 opacity-0 absolute inset-0 z-10"
 />
 <div className="h-10 w-10 rounded border border-[#E5E2DB] shadow-sm" style={{ backgroundColor: sidebarBackground }}></div>
 </div>
 <span className="font-mono text-sm text-[#5C5850] border border-[#E5E2DB] px-3 py-2 rounded-md bg-[#FAF6EE]">{sidebarBackground}</span>
 </div>
 </div>

 <div>
 <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880] mb-1.5">
 Sidebar Text Color
 </label>
 <div className="flex items-center gap-3">
 <div className="relative">
 <input
 type="color"
 value={sidebarForeground}
 onChange={(e) => setSidebarForeground(e.target.value)}
 className="h-10 w-10 rounded cursor-pointer bg-transparent border-none p-0 opacity-0 absolute inset-0 z-10"
 />
 <div className="h-10 w-10 rounded border border-[#E5E2DB] shadow-sm" style={{ backgroundColor: sidebarForeground }}></div>
 </div>
 <span className="font-mono text-sm text-[#5C5850] border border-[#E5E2DB] px-3 py-2 rounded-md bg-[#FAF6EE]">{sidebarForeground}</span>
 </div>
 </div>
 </div>
 </div>

 <div className="border-t border-[#E5E2DB] pt-8"></div>

 {/* Page Appearance */}
 <div>
 <h2 className="text-lg font-semibold text-[#1C1A17] mb-4">Page Appearance</h2>
 <div>
 <div>
 <div className="flex items-center gap-4 mb-4">
 <label className="text-sm font-medium text-[#5C5850]">Background Style:</label>
 <div className="flex bg-[#FAF6EE] p-1 rounded-lg border border-[#E5E2DB]">
 <button
 onClick={() => setPageBackgroundMode('solid')}
 className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${pageBackgroundMode === 'solid'
 ? 'bg-[#0D9488]/10 text-[#0D9488] shadow-sm'
 : 'text-[#5C5850] hover:text-[#1C1A17]'
 }`}
 >
 Solid Color
 </button>
 <button
 onClick={() => setPageBackgroundMode('gradient')}
 className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${pageBackgroundMode === 'gradient'
 ? 'bg-[#0D9488]/10 text-[#0D9488] shadow-sm'
 : 'text-[#5C5850] hover:text-[#1C1A17]'
 }`}
 >
 Gradient
 </button>
 </div>
 </div>

 {pageBackgroundMode === 'solid' ? (
 <div>
 <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880] mb-1.5">
 Solid Color
 </label>
 <div className="flex items-center gap-3">
 <div className="relative">
 <input
 type="color"
 value={pageBackground}
 onChange={(e) => setPageBackground(e.target.value)}
 className="h-10 w-10 rounded cursor-pointer bg-transparent border-none p-0 opacity-0 absolute inset-0 z-10"
 />
 <div className="h-10 w-10 rounded border border-[#E5E2DB] shadow-sm" style={{ backgroundColor: pageBackground }}></div>
 </div>
 <span className="font-mono text-sm text-[#5C5850] border border-[#E5E2DB] px-3 py-2 rounded-md bg-[#FAF6EE]">{pageBackground}</span>
 </div>
 </div>
 ) : (
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880] mb-1.5">
 Start Color
 </label>
 <div className="flex items-center gap-3">
 <div className="relative">
 <input
 type="color"
 value={pageGradientStart}
 onChange={(e) => setPageGradientStart(e.target.value)}
 className="h-10 w-10 rounded cursor-pointer bg-transparent border-none p-0 opacity-0 absolute inset-0 z-10"
 />
 <div className="h-10 w-10 rounded border border-[#E5E2DB] shadow-sm" style={{ backgroundColor: pageGradientStart }}></div>
 </div>
 <span className="font-mono text-xs text-[#5C5850] border border-[#E5E2DB] px-2 py-1 rounded-md bg-[#FAF6EE]">{pageGradientStart}</span>
 </div>
 </div>
 <div>
 <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880] mb-1.5">
 End Color
 </label>
 <div className="flex items-center gap-3">
 <div className="relative">
 <input
 type="color"
 value={pageGradientEnd}
 onChange={(e) => setPageGradientEnd(e.target.value)}
 className="h-10 w-10 rounded cursor-pointer bg-transparent border-none p-0 opacity-0 absolute inset-0 z-10"
 />
 <div className="h-10 w-10 rounded border border-[#E5E2DB] shadow-sm" style={{ backgroundColor: pageGradientEnd }}></div>
 </div>
 <span className="font-mono text-xs text-[#5C5850] border border-[#E5E2DB] px-2 py-1 rounded-md bg-[#FAF6EE]">{pageGradientEnd}</span>
 </div>
 </div>
 </div>
 <div>
 <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880] mb-1.5">
 Direction
 </label>
 <select
 value={pageGradientDirection}
 onChange={(e) => setPageGradientDirection(e.target.value)}
 className="w-full px-3 py-2 border border-[#E5E2DB] bg-[#FAF6EE] text-[#1C1A17] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors"
 >
 <option value="to bottom">Top to Bottom</option>
 <option value="to right">Left to Right</option>
 <option value="to bottom right">Top Left to Bottom Right</option>
 <option value="to bottom left">Top Right to Bottom Left</option>
 <option value="45deg">45 Degrees</option>
 <option value="135deg">135 Degrees</option>
 </select>
 </div>
 <div className="mt-2 p-4 rounded-lg border border-[#E5E2DB]" style={{ background: `linear-gradient(${pageGradientDirection}, ${pageGradientStart}, ${pageGradientEnd})` }}>
 <p className="text-center text-sm font-medium text-[#1C1A17] bg-[#ffffff]/70 py-2 px-4 rounded inline-block mx-auto">Preview</p>
 </div>
 </div>
 )}
 <p className="text-xs text-[#8C8880] mt-2">Customize the main background color or gradient of the application.</p>
 </div>
 </div>
 </div>

 <div className="border-t border-[#E5E2DB] pt-8"></div>

 {/* Logo Upload */}
 <div>
 <h2 className="text-lg font-semibold text-[#1C1A17] mb-4">Organization Logo</h2>
 <div className="flex flex-col sm:flex-row items-start gap-6">
 <div className="shrink-0">
 {logo ? (
 <div className="relative group">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={logo} alt="Organization Logo" className="h-32 w-auto object-contain border border-[#E5E2DB] rounded-lg p-2 bg-[#FAF6EE]" />
 <button
 onClick={() => setLogo(null)}
 className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 transition-colors shadow-sm"
 title="Remove Logo"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 ) : (
 <div className="h-32 w-32 border-2 border-dashed border-[#E5E2DB] rounded-lg flex items-center justify-center text-[#8C8880] bg-[#FAF6EE]">
 <span className="text-sm font-medium">No Logo</span>
 </div>
 )}
 </div>

 <div className="flex-1">
 <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880] mb-1.5">
 Upload New Logo
 </label>
 <div className="flex items-center gap-4">
 <label className="cursor-pointer px-4 py-2 border border-[#E5E2DB] bg-[#FAF6EE] hover:bg-[#F3F1EC] text-[#5C5850] rounded-lg transition-colors flex items-center gap-2">
 <Upload className="w-4 h-4" />
 <span>Choose File</span>
 <input
 type="file"
 accept="image/png, image/jpeg, image/svg+xml"
 onChange={handleLogoUpload}
 className="hidden"
 />
 </label>
 <span className="text-sm text-[#8C8880]">Max size: 500KB. PNG, JPG, SVG.</span>
 </div>
 <p className="text-sm text-[#8C8880] mt-3">
 This logo will appear in the sidebar and navigation bar. For best results, use a transparent PNG or SVG with a height of at least 40px.
 </p>
 </div>
 </div>
 </div>

 <div className="border-t border-[#E5E2DB] pt-8 flex items-center gap-4">
 <button
 onClick={handleSave}
 disabled={saving}
 className="flex items-center gap-2 px-6 py-2.5 bg-[#0D9488] hover:bg-[#0F766E] text-[#ffffff] font-medium rounded-lg transition-colors disabled:opacity-50 shadow-sm"
 >
 <Save className="w-4 h-4" />
 {saving ? 'Saving...' : 'Save Changes'}
 </button>
 {message && (
 <span className={`text-sm font-medium ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
 {message}
 </span>
 )}
 </div>
 </div>
 </div>
 );
}
