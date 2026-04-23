'use client';

import { useState, useEffect } from 'react';
import {
 DndContext,
 closestCenter,
 KeyboardSensor,
 PointerSensor,
 useSensor,
 useSensors,
 DragEndEvent
} from '@dnd-kit/core';
import {
 arrayMove,
 SortableContext,
 sortableKeyboardCoordinates,
 verticalListSortingStrategy,
 useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Pencil, Trash2, X } from 'lucide-react';
import { EQUIPMENT_CATEGORIES } from '@/lib/constants';

interface AffiliateProduct {
 id: string;
 title: string;
 description: string | null;
 images: { id: string, order: number }[];
 productUrl: string;
 category: string | null;
 price: number | null;
 order: number;
 active: boolean;
}

// Sortable item wrapper
function SortableItem({ id, product, onEdit, onDelete }: { id: string, product: AffiliateProduct, onEdit: (p: AffiliateProduct) => void, onDelete: (id: string) => void }) {
 const [imgError, setImgError] = useState(false);
 const {
 attributes,
 listeners,
 setNodeRef,
 transform,
 transition,
 } = useSortable({ id: id });

 const style = {
 transform: CSS.Transform.toString(transform),
 transition,
 };

 return (
 <div ref={setNodeRef} style={style} className="bg-white border border-gray-200 rounded-lg p-4 mb-2 flex items-center justify-between shadow-sm">
 <div className="flex items-center gap-4 flex-1 min-w-0">
 <div {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600 p-1">
 <GripVertical size={20} />
 </div>
 <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0 border border-gray-200 overflow-hidden shadow-inner">
 {product.images && product.images.length > 0 && !imgError ? (
 <img referrerPolicy="no-referrer" src={`/api/public/equipment/images/${product.images[0].id}`} alt={product.title} className="w-full h-full object-cover" onError={() => setImgError(true)} />
 ) : (
 <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-medium bg-gray-100">No img</div>
 )}
 </div>
 <div className="flex-1 min-w-0 pr-4">
 <h3 className="font-semibold text-gray-900 truncate">{product.title}</h3>
 <p className="text-sm text-gray-500 truncate">{product.description || 'No description'}</p>
 <div className="flex gap-2 text-xs text-gray-400 mt-1">
 {product.category && <span className="bg-gray-100 px-2 py-0.5 rounded">{product.category}</span>}
 {product.price !== null && product.price !== undefined && <span className="font-medium text-green-600">${Number(product.price).toFixed(2)}</span>}
 <span className={product.active ? "text-emerald-500" : "text-rose-500"}>{product.active ? "Active" : "Inactive"}</span>
 </div>
 </div>
 </div>
 
 <div className="flex items-center gap-2 flex-shrink-0">
 <button type="button" onClick={() => onEdit(product)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded-md transition-colors shadow-sm">
 <Pencil size={16} /> Edit
 </button>
 <button type="button" onClick={() => onDelete(product.id)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100 rounded-md transition-colors shadow-sm">
 <Trash2 size={16} /> Delete
 </button>
 </div>
 </div>
 );
}

export default function EquipmentManager() {
 const [products, setProducts] = useState<AffiliateProduct[]>([]);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 
 // Modal state
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingId, setEditingId] = useState<string | null>(null);
 const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
 const [formData, setFormData] = useState<Partial<AffiliateProduct>>({
 title: '',
 description: '',
 productUrl: '',
 category: '',
 price: null,
 active: true,
 images: []
 });

 const sensors = useSensors(
 useSensor(PointerSensor, {
 activationConstraint: {
 distance: 8,
 },
 }),
 useSensor(KeyboardSensor, {
 coordinateGetter: sortableKeyboardCoordinates,
 })
 );

 const loadProducts = async () => {
 try {
 const res = await fetch('/api/super-admin/equipment');
 if (res.ok) {
 const data = await res.json();
 setProducts(data);
 }
 } catch (e) {
 console.error(e);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadProducts();
 }, []);

 const handleDragEnd = async (event: DragEndEvent) => {
 const { active, over } = event;
 
 if (active.id !== over?.id) {
 const oldIndex = products.findIndex((p) => p.id === active.id);
 const newIndex = products.findIndex((p) => p.id === over?.id);
 
 const newOrder = arrayMove(products, oldIndex, newIndex);
 setProducts(newOrder);

 // Save order to backend
 try {
 await fetch('/api/super-admin/equipment/reorder', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ orderedIds: newOrder.map(p => p.id) })
 });
 } catch (e) {
 console.error('Failed to save order');
 }
 }
 };

 const openAddModal = () => {
 setEditingId(null);
 setSelectedFiles([]);
 setFormData({
 title: '',
 description: '',
 productUrl: '',
 category: '',
 price: null,
 active: true,
 images: []
 });
 setIsModalOpen(true);
 };

 const openEditModal = (product: AffiliateProduct) => {
 setEditingId(product.id);
 setSelectedFiles([]);
 setFormData({ ...product });
 setIsModalOpen(true);
 };

 const deleteImage = async (imageId: string) => {
 if (!editingId) return;
 if (confirm('Delete this image?')) {
 await fetch(`/api/super-admin/equipment/${editingId}/images/${imageId}`, { method: 'DELETE' });
 const updatedImages = formData.images?.filter(img => img.id !== imageId) || [];
 setFormData({ ...formData, images: updatedImages });
 // Reload in background to update parent list
 loadProducts();
 }
 };

 const handleDelete = async (id: string) => {
 if (confirm('Are you sure you want to delete this item?')) {
 await fetch(`/api/super-admin/equipment/${id}`, { method: 'DELETE' });
 loadProducts();
 }
 };

 const saveProduct = async (e: React.FormEvent) => {
 e.preventDefault();
 setSaving(true);
 try {
 const url = editingId ? `/api/super-admin/equipment/${editingId}` : `/api/super-admin/equipment`;
 const method = editingId ? 'PUT' : 'POST';
 
 const payload = { ...formData };
 delete payload.images; // Don't send images to the main endpoint

 const res = await fetch(url, {
 method,
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(payload)
 });
 
 if (res.ok) {
 const savedProduct = await res.json();
 const finalId = editingId || savedProduct.id;

 if (selectedFiles.length > 0) {
 const uploadData = new FormData();
 selectedFiles.forEach(f => uploadData.append('files', f));
 await fetch(`/api/super-admin/equipment/${finalId}/images`, {
 method: 'POST',
 body: uploadData
 });
 }

 setIsModalOpen(false);
 loadProducts();
 }
 } finally {
 setSaving(false);
 }
 };

 if (loading) return <div className="text-center p-8 text-gray-500">Loading equipment...</div>;

 return (
 <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
 <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
 <h2 className="font-semibold text-gray-800">Equipment List</h2>
 <button onClick={openAddModal} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
 <Plus size={16} /> Add Item
 </button>
 </div>
 
 <div className="p-4">
 {products.length === 0 ? (
 <div className="text-center p-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
 No equipment added yet. Click "Add Item" to create one.
 </div>
 ) : (
 <DndContext 
 sensors={sensors}
 collisionDetection={closestCenter}
 onDragEnd={handleDragEnd}
 >
 <SortableContext 
 items={products.map(p => p.id)}
 strategy={verticalListSortingStrategy}
 >
 {products.map(product => (
 <SortableItem key={product.id} id={product.id} product={product} onEdit={openEditModal} onDelete={handleDelete} />
 ))}
 </SortableContext>
 </DndContext>
 )}
 </div>

 {isModalOpen && (
 <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 ">
 <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
 <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
 <h3 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Equipment' : 'Add Equipment'}</h3>
 <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
 </div>
 
 <form onSubmit={saveProduct} className="p-6 space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
 <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
 <textarea rows={3} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
 <input type="number" step="0.01" value={formData.price || ''} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
 <select 
 value={formData.category || ''} 
 onChange={e => setFormData({...formData, category: e.target.value})} 
 className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
 >
 <option value="">Select a category...</option>
 {EQUIPMENT_CATEGORIES.map(cat => (
 <option key={cat} value={cat}>{cat}</option>
 ))}
 </select>
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Affiliate Link URL *</label>
 <input required type="url" value={formData.productUrl || ''} onChange={e => setFormData({...formData, productUrl: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Upload New Images</label>
 <input type="file" multiple accept="image/*" onChange={e => setSelectedFiles(Array.from(e.target.files || []))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
 </div>

 {formData.images && formData.images.length > 0 && (
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Existing Images</label>
 <div className="flex flex-wrap gap-2">
 {formData.images.map(img => (
 <div key={img.id} className="relative group w-20 h-20 bg-gray-100 rounded-md border border-gray-200 overflow-hidden">
 <img referrerPolicy="no-referrer" src={`/api/public/equipment/images/${img.id}`} className="w-full h-full object-cover" />
 <button type="button" onClick={() => deleteImage(img.id)} className="absolute top-1 right-1 bg-rose-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
 <X size={12} />
 </button>
 </div>
 ))}
 </div>
 </div>
 )}
 
 <div className="flex items-center gap-2 pt-2">
 <input type="checkbox" id="active" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500 border-gray-300" />
 <label htmlFor="active" className="text-sm text-gray-700">Active (visible to users)</label>
 </div>

 <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
 <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors">Cancel</button>
 <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-md shadow-sm transition-colors">
 {saving ? 'Saving...' : 'Save Item'}
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
}
