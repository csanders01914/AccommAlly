'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Trash2, Download, Edit2, Plus, X, ChevronDown, ChevronRight } from 'lucide-react';
import {
    TEMPLATE_FIELDS,
    TEMPLATE_FIELD_LABELS,
} from '@/lib/document-templates';
import type { TemplateField, VariableMapping } from '@/lib/document-templates';

interface Template {
    id: string;
    name: string;
    description: string | null;
    variableMappings: VariableMapping[];
    createdAt: string;
}

const AR_REFERENCE = Array.from({ length: 10 }, (_, i) => i + 1).flatMap(n => [
    `{AR${n} Type}`,
    `{AR${n} Description}`,
    `{AR${n} Start}`,
    `{AR${n} End}`,
]);

export default function TemplatesPage() {
    const params = useParams();
    const tenantId = params.id as string;

    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [arExpanded, setArExpanded] = useState(false);

    // Form state
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formFile, setFormFile] = useState<File | null>(null);
    const [formMappings, setFormMappings] = useState<VariableMapping[]>([]);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/super-admin/document-templates?tenantId=${tenantId}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setTemplates(data.templates);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load templates');
        } finally {
            setLoading(false);
        }
    }, [tenantId]);

    useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

    function openCreate() {
        setEditingTemplate(null);
        setFormName('');
        setFormDescription('');
        setFormFile(null);
        setFormMappings([]);
        setFormError('');
        setShowForm(true);
    }

    function openEdit(t: Template) {
        setEditingTemplate(t);
        setFormName(t.name);
        setFormDescription(t.description ?? '');
        setFormFile(null);
        setFormMappings(t.variableMappings ?? []);
        setFormError('');
        setShowForm(true);
    }

    async function handleSave() {
        if (!formName.trim()) { setFormError('Name is required.'); return; }
        if (!editingTemplate && !formFile) { setFormError('A .docx file is required.'); return; }

        setSaving(true);
        setFormError('');
        try {
            const fd = new FormData();
            fd.append('name', formName.trim());
            fd.append('description', formDescription.trim());
            fd.append('variableMappings', JSON.stringify(formMappings));
            fd.append('tenantId', tenantId);
            if (formFile) fd.append('file', formFile);

            const url = editingTemplate
                ? `/api/super-admin/document-templates/${editingTemplate.id}`
                : '/api/super-admin/document-templates';
            const method = editingTemplate ? 'PUT' : 'POST';

            const res = await fetch(url, { method, body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setShowForm(false);
            fetchTemplates();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Save failed');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id: string, name: string) {
        if (!confirm(`Delete template "${name}"? This cannot be undone.`)) return;
        try {
            const res = await fetch(`/api/super-admin/document-templates/${id}`, { method: 'DELETE' });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
            fetchTemplates();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Delete failed');
        }
    }

    function addMappingRow() {
        setFormMappings(prev => [...prev, { trigger: '', field: 'CLAIMANT_NAME' }]);
    }

    function updateMapping(index: number, key: keyof VariableMapping, value: string) {
        setFormMappings(prev => prev.map((m, i) => i === index ? { ...m, [key]: value } : m));
    }

    function removeMapping(index: number) {
        setFormMappings(prev => prev.filter((_, i) => i !== index));
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Link href={`/super-admin/tenants/${tenantId}`} className="text-sm text-slate-400 hover:text-slate-200 mb-1 block">
                        ← Back to Tenant
                    </Link>
                    <h1 className="text-2xl font-bold text-white">Letter Templates</h1>
                    <p className="text-slate-400 text-sm mt-1">DOCX templates with variable substitution for coordinators.</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg font-medium text-sm"
                >
                    <Plus className="w-4 h-4" /> New Template
                </button>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            {/* Template list */}
            {templates.length === 0 ? (
                <div className="text-center py-12 text-slate-400">No templates yet. Upload a .docx file to get started.</div>
            ) : (
                <div className="bg-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                                <th className="text-left p-4">Name</th>
                                <th className="text-left p-4">Mappings</th>
                                <th className="text-left p-4">Created</th>
                                <th className="p-4" />
                            </tr>
                        </thead>
                        <tbody>
                            {templates.map(t => (
                                <tr key={t.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                                    <td className="p-4">
                                        <p className="font-medium text-white">{t.name}</p>
                                        {t.description && <p className="text-slate-400 text-xs mt-0.5">{t.description}</p>}
                                    </td>
                                    <td className="p-4 text-slate-300">{t.variableMappings?.length ?? 0} custom</td>
                                    <td className="p-4 text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 justify-end">
                                            <a
                                                href={`/api/super-admin/document-templates/${t.id}/download`}
                                                className="p-1.5 text-slate-400 hover:text-white"
                                                title="Download DOCX"
                                            >
                                                <Download className="w-4 h-4" />
                                            </a>
                                            <button onClick={() => openEdit(t)} className="p-1.5 text-slate-400 hover:text-white" title="Edit">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(t.id, t.name)} className="p-1.5 text-slate-400 hover:text-red-400" title="Delete">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create / Edit Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-700">
                            <h2 className="text-lg font-bold text-white">
                                {editingTemplate ? 'Edit Template' : 'New Template'}
                            </h2>
                            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {formError && <p className="text-red-400 text-sm">{formError}</p>}

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Name *</label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={e => setFormName(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                                    placeholder="e.g. Approval Letter"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                                <textarea
                                    value={formDescription}
                                    onChange={e => setFormDescription(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm resize-none h-20"
                                    placeholder="Optional description"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    DOCX File {editingTemplate ? '(leave empty to keep current)' : '*'}
                                </label>
                                <input
                                    type="file"
                                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                    onChange={e => setFormFile(e.target.files?.[0] ?? null)}
                                    className="w-full text-sm text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-indigo-700 file:text-white file:text-sm"
                                />
                            </div>

                            {/* Variable Mappings */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-slate-300">Variable Mappings</label>
                                    <button
                                        type="button"
                                        onClick={addMappingRow}
                                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" /> Add Row
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {formMappings.map((m, i) => (
                                        <div key={i} className="flex gap-2 items-center">
                                            <input
                                                type="text"
                                                value={m.trigger}
                                                onChange={e => updateMapping(i, 'trigger', e.target.value)}
                                                placeholder="{TriggerString}"
                                                className="flex-1 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm font-mono"
                                            />
                                            <select
                                                value={m.field}
                                                onChange={e => updateMapping(i, 'field', e.target.value as TemplateField)}
                                                className="flex-1 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                                            >
                                                {TEMPLATE_FIELDS.map(f => (
                                                    <option key={f} value={f}>{TEMPLATE_FIELD_LABELS[f]}</option>
                                                ))}
                                            </select>
                                            <button onClick={() => removeMapping(i)} className="text-slate-400 hover:text-red-400">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {formMappings.length === 0 && (
                                        <p className="text-slate-500 text-xs">No custom mappings. AR1–AR10 built-ins are always available.</p>
                                    )}
                                </div>
                            </div>

                            {/* AR Reference Panel */}
                            <div className="border border-slate-700 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setArExpanded(v => !v)}
                                    className="w-full flex items-center justify-between p-3 text-sm text-slate-400 hover:text-slate-200"
                                >
                                    <span>Built-in accommodation variables (AR1–AR10)</span>
                                    {arExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                                {arExpanded && (
                                    <div className="px-3 pb-3 grid grid-cols-2 gap-1">
                                        {AR_REFERENCE.map(v => (
                                            <code key={v} className="text-xs text-indigo-300 font-mono bg-slate-900 px-2 py-0.5 rounded">{v}</code>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
                            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-400 hover:text-white text-sm">
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                            >
                                {saving ? 'Saving…' : 'Save Template'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
