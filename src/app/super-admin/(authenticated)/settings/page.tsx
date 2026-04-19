'use client';

import { useState, useEffect } from 'react';
import { Save, Upload, Building, ChevronDown } from 'lucide-react';

export default function SuperAdminSettingsPage() {
    const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
    const [selectedTenantId, setSelectedTenantId] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    // Branding state
    const [primaryColor, setPrimaryColor] = useState('#6366f1');
    const [secondaryColor, setSecondaryColor] = useState('#a855f7');
    const [sidebarBackground, setSidebarBackground] = useState('#1e293b');
    const [sidebarForeground, setSidebarForeground] = useState('#f8fafc');
    const [pageBackground, setPageBackground] = useState('#ffffff');
    const [pageBackgroundMode, setPageBackgroundMode] = useState<'solid' | 'gradient'>('solid');
    const [pageGradientStart, setPageGradientStart] = useState('#ffffff');
    const [pageGradientEnd, setPageGradientEnd] = useState('#eff6ff');
    const [pageGradientDirection, setPageGradientDirection] = useState('to bottom right');
    const [logo, setLogo] = useState<string | null>(null);

    // Load tenant list
    useEffect(() => {
        fetch('/api/super-admin/tenants')
            .then(r => r.json())
            .then(data => {
                const list = data.tenants ?? [];
                setTenants(list);
            })
            .catch(() => setMessage('Failed to load tenants'));
    }, []);

    // Load settings when tenant changes
    useEffect(() => {
        if (!selectedTenantId) return;
        setLoading(true);
        fetch(`/api/super-admin/settings?tenantId=${selectedTenantId}`)
            .then(r => r.json())
            .then(data => {
                const b = data.tenant?.settings?.branding || {};
                setPrimaryColor(b.primaryColor || '#6366f1');
                setSecondaryColor(b.secondaryColor || '#a855f7');
                setSidebarBackground(b.sidebarBackground || '#1e293b');
                setSidebarForeground(b.sidebarForeground || '#f8fafc');
                setPageBackground(b.pageBackground || '#ffffff');
                setPageBackgroundMode(b.pageBackgroundMode || 'solid');
                setPageGradientStart(b.pageGradientStart || '#ffffff');
                setPageGradientEnd(b.pageGradientEnd || '#eff6ff');
                setPageGradientDirection(b.pageGradientDirection || 'to bottom right');
                setLogo(b.logo || null);
            })
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
                body: JSON.stringify({
                    settings: {
                        branding: {
                            primaryColor, secondaryColor,
                            sidebarBackground, sidebarForeground,
                            pageBackground, pageBackgroundMode,
                            pageGradientStart, pageGradientEnd, pageGradientDirection,
                            logo,
                        }
                    }
                })
            });
            if (!res.ok) throw new Error();
            setMessage('Settings saved successfully.');
            setTimeout(() => setMessage(''), 3000);
        } catch {
            setMessage('Error saving settings.');
        } finally {
            setSaving(false);
        }
    };

    const ColorPicker = ({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) => (
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
            <div className="flex items-center gap-3">
                <div className="relative">
                    <input type="color" value={value} onChange={e => onChange(e.target.value)}
                        className="h-10 w-10 rounded cursor-pointer bg-transparent border-none p-0 opacity-0 absolute inset-0 z-10" />
                    <div className="h-10 w-10 rounded border border-slate-600 shadow-sm" style={{ backgroundColor: value }} />
                </div>
                <span className="font-mono text-sm text-slate-300 border border-slate-600 px-3 py-2 rounded-md bg-slate-800/50">{value}</span>
            </div>
            {hint && <p className="text-xs text-slate-500 mt-1.5">{hint}</p>}
        </div>
    );

    return (
        <div className="max-w-2xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Building className="w-7 h-7 text-violet-400" />
                    Organization Settings
                </h1>
                <p className="text-slate-400 mt-1">Manage branding and appearance for each tenant.</p>
            </div>

            {/* Tenant selector — always shown */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">Select Tenant</label>
                <div className="relative">
                    <select
                        value={selectedTenantId}
                        onChange={e => setSelectedTenantId(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-4 py-2.5 pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                        <option value="" disabled>— Select a tenant —</option>
                        {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {!selectedTenantId ? (
                <div className="text-slate-500 text-sm">Select a tenant above to view and edit its settings.</div>
            ) : loading ? (
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-slate-700 rounded w-1/3" />
                    <div className="h-24 bg-slate-700 rounded" />
                </div>
            ) : (
                <div className="space-y-8 bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8">

                    {message && (
                        <div className={`px-4 py-3 rounded-lg text-sm ${message.startsWith('Error') ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-green-500/20 text-green-300 border border-green-500/30'}`}>
                            {message}
                        </div>
                    )}

                    {/* Brand Colors */}
                    <div>
                        <h2 className="text-base font-semibold text-white mb-4">Brand Colors</h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            <ColorPicker label="Primary Color" value={primaryColor} onChange={setPrimaryColor} hint="Buttons, links, active states" />
                            <ColorPicker label="Secondary Color" value={secondaryColor} onChange={setSecondaryColor} hint="Accents and highlights" />
                        </div>
                    </div>

                    <div className="border-t border-slate-700/50" />

                    {/* Sidebar */}
                    <div>
                        <h2 className="text-base font-semibold text-white mb-4">Sidebar Appearance</h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            <ColorPicker label="Sidebar Background" value={sidebarBackground} onChange={setSidebarBackground} />
                            <ColorPicker label="Sidebar Text Color" value={sidebarForeground} onChange={setSidebarForeground} />
                        </div>
                    </div>

                    <div className="border-t border-slate-700/50" />

                    {/* Page Background */}
                    <div>
                        <h2 className="text-base font-semibold text-white mb-4">Page Background</h2>
                        <div className="flex items-center gap-2 mb-4">
                            {(['solid', 'gradient'] as const).map(mode => (
                                <button key={mode} onClick={() => setPageBackgroundMode(mode)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize ${pageBackgroundMode === mode ? 'bg-violet-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                                    {mode}
                                </button>
                            ))}
                        </div>
                        {pageBackgroundMode === 'solid' ? (
                            <ColorPicker label="Background Color" value={pageBackground} onChange={setPageBackground} />
                        ) : (
                            <div className="grid md:grid-cols-2 gap-6">
                                <ColorPicker label="Gradient Start" value={pageGradientStart} onChange={setPageGradientStart} />
                                <ColorPicker label="Gradient End" value={pageGradientEnd} onChange={setPageGradientEnd} />
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Direction</label>
                                    <select value={pageGradientDirection} onChange={e => setPageGradientDirection(e.target.value)}
                                        className="bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500">
                                        {['to bottom', 'to right', 'to bottom right', 'to bottom left', 'to top right'].map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-slate-700/50" />

                    {/* Logo */}
                    <div>
                        <h2 className="text-base font-semibold text-white mb-4">Logo</h2>
                        <div className="flex items-center gap-4">
                            {logo ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={logo} alt="Logo" className="h-12 object-contain rounded border border-slate-600 p-1 bg-white" />
                            ) : (
                                <div className="h-12 w-32 rounded border border-dashed border-slate-600 flex items-center justify-center text-xs text-slate-500">No logo</div>
                            )}
                            <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors">
                                <Upload className="w-4 h-4" />
                                Upload Logo
                                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                            </label>
                            {logo && (
                                <button onClick={() => setLogo(null)} className="text-sm text-red-400 hover:text-red-300 transition-colors">Remove</button>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Max 500KB. PNG or SVG recommended.</p>
                    </div>

                    <div className="pt-2">
                        <button onClick={handleSave} disabled={saving || !selectedTenantId}
                            className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving…' : 'Save Settings'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
