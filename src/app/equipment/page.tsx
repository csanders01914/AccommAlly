'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Package, Loader2, X, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { EQUIPMENT_CATEGORIES } from '@/lib/constants';
import { Sidebar } from '@/components/Sidebar';
import { apiFetch } from '@/lib/api-client';
import { useRef } from 'react';

const ProductImages = ({ product }: { product: any }) => {
 const [currentIndex, setCurrentIndex] = useState(0);
 const scrollRef = useRef<HTMLDivElement>(null);

 const scrollTo = (e: React.MouseEvent, index: number) => {
 e.stopPropagation();
 if (!scrollRef.current) return;
 const width = scrollRef.current.clientWidth;
 scrollRef.current.scrollTo({ left: width * index, behavior: 'smooth' });
 setCurrentIndex(index);
 };

 const handleScroll = () => {
 if (!scrollRef.current) return;
 const width = scrollRef.current.clientWidth;
 const newIndex = Math.round(scrollRef.current.scrollLeft / width);
 setCurrentIndex(newIndex);
 };

 if (!product.images || product.images.length === 0) {
 return (
 <div className="aspect-[4/3] bg-background flex items-center justify-center relative overflow-hidden border-b border-border">
 <Package className="w-12 h-12 text-border-strong" />
 {product.category && (
 <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 text-primary-500 text-[11px] font-bold uppercase tracking-wider rounded border border-primary-500/20 shadow-sm z-10">
 {product.category}
 </span>
 )}
 </div>
 );
 }

 return (
 <div className="aspect-[4/3] relative border-b border-border bg-background">
 {product.category && (
 <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 text-primary-500 text-[11px] font-bold uppercase tracking-wider rounded border border-primary-500/20 shadow-sm z-10 pointer-events-none">
 {product.category}
 </span>
 )}
 <div 
 ref={scrollRef}
 onScroll={handleScroll}
 className="flex w-full h-full overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
 >
 {product.images.map((img: any) => (
 <div key={img.id} className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center p-4 relative group">
 <img 
 referrerPolicy="no-referrer"
 src={`/api/public/equipment/images/${img.id}`}
 alt={product.title} 
 className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
 />
 </div>
 ))}
 </div>
 {product.images.length > 1 && (
 <>
 <button 
 onClick={(e) => scrollTo(e, Math.max(0, currentIndex - 1))}
 disabled={currentIndex === 0}
 className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white hover:bg-surface-raised text-text-primary rounded-full shadow-md border border-border disabled:opacity-0 transition-all z-20 group-hover:opacity-100"
 >
 <ChevronLeft size={24} />
 </button>
 <button 
 onClick={(e) => scrollTo(e, Math.min(product.images.length - 1, currentIndex + 1))}
 disabled={currentIndex === product.images.length - 1}
 className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white hover:bg-surface-raised text-text-primary rounded-full shadow-md border border-border disabled:opacity-0 transition-all z-20 group-hover:opacity-100"
 >
 <ChevronRight size={24} />
 </button>
 <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
 {product.images.map((_: any, i: number) => (
 <button 
 key={i} 
 onClick={(e) => scrollTo(e, i)}
 className={`h-2.5 transition-all shadow-sm ${i === currentIndex ? 'w-8 bg-primary-500 rounded-full' : 'w-2.5 bg-border-strong hover:bg-text-muted rounded-full'}`} 
 />
 ))}
 </div>
 </>
 )}
 </div>
 );
};


export default function EquipmentPage() {
 const [loading, setLoading] = useState(true);
 const [products, setProducts] = useState<any[]>([]);
 const [currentUser, setCurrentUser] = useState<any>(null);
 const [unreadCount, setUnreadCount] = useState(0);
 const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

 const [selectedProduct, setSelectedProduct] = useState<any>(null);
 const [searchQuery, setSearchQuery] = useState('');
 const [activeCategory, setActiveCategory] = useState<string | null>(null);

 const filteredProducts = products.filter(p => {
 const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
 (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
 const matchesCategory = activeCategory ? p.category === activeCategory : true;
 return matchesSearch && matchesCategory;
 });

 useEffect(() => {
 const fetchInitialData = async () => {
 try {
 const [userRes, unreadRes] = await Promise.all([
 apiFetch('/api/auth/me'),
 apiFetch('/api/messages/unread-count')
 ]);
 
 if (userRes.ok) {
 const { user } = await userRes.json();
 setCurrentUser(user);
 }
 
 if (unreadRes.ok) {
 const { count } = await unreadRes.json();
 setUnreadCount(count);
 }
 } catch (e) {
 console.error('Failed to load user session', e);
 }
 };
 
 const fetchEquipment = async () => {
 try {
 const res = await apiFetch('/api/equipment');
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

 fetchInitialData();
 fetchEquipment();
 }, []);

 if (loading && !currentUser) {
 return (
 <div className="min-h-screen bg-background flex items-center justify-center">
 <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
 </div>
 );
 }

 return (
 <div className="flex h-screen overflow-hidden bg-background">
 {currentUser && (
 <Sidebar user={currentUser} unreadCount={unreadCount} onToggle={setSidebarCollapsed} />
 )}

 <div
 className="flex-1 h-full overflow-y-auto transition-all duration-300 bg-background"
 style={{ marginLeft: sidebarCollapsed ? 64 : 256 }}
 >
 {/* Header Band */}
 <section
 className="relative overflow-hidden"
 style={{ background: '#1C1A17', color: '#F0EEE8', padding: '40px 48px 32px' }}
 >
 <div
 aria-hidden
 style={{
 position: 'absolute', inset: 0, pointerEvents: 'none',
 backgroundImage: 'radial-gradient(ellipse at 15% 50%,rgba(13,148,136,0.16) 0%,transparent 55%),radial-gradient(ellipse at 90% 80%,rgba(13,148,136,0.08) 0%,transparent 50%)',
 }}
 />
 <div
 aria-hidden
 style={{
 position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
 background: 'linear-gradient(to right,transparent,rgba(13,148,136,0.5),transparent)',
 }}
 />

 <div className="relative z-10 max-w-[1440px] mx-auto flex items-end justify-between gap-8 flex-wrap">
 <div style={{ flex: '1 1 420px', minWidth: 0 }}>
 <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-500 flex items-center gap-2 mb-3">
 <Package className="w-4 h-4" /> Recommended Tools
 </p>
 <h1
 className="my-3 tracking-[-0.01em]"
 style={{ fontFamily: 'var(--font-instrument-serif, Georgia, serif)', fontSize: 52, fontWeight: 400, lineHeight: 1.1, color: '#F0EEE8' }}
 >
 Suggested Equipment
 </h1>
 <p className="m-0 text-base max-w-2xl" style={{ color: 'rgba(240,238,232,0.55)', lineHeight: 1.55 }}>
 Browse our curated list of recommended equipment and tools. These affiliate links help support our platform and provide high-quality solutions for your needs.
 </p>
 </div>
 </div>
 </section>

 <div className="max-w-[1440px] mx-auto px-12 py-8">
 {loading ? (
 <div className="flex justify-center p-12">
 <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
 </div>
 ) : products.length === 0 ? (
 <div className="bg-white rounded-2xl border border-border p-12 text-center shadow-sm">
 <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
 <Package className="w-8 h-8 text-text-muted" />
 </div>
 <h3 className="text-xl font-semibold text-text-primary mb-2">No equipment available</h3>
 <p className="text-text-secondary">There is no suggested equipment listed at this time. Please check back later.</p>
 </div>
 ) : (
 <div className="flex flex-col gap-8">
 {/* Search and Filter UI */}
 <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white p-4 rounded-2xl border border-border shadow-sm">
 <div className="relative w-full md:w-96">
 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
 <Search className="h-5 w-5 text-text-muted" />
 </div>
 <input
 type="text"
 placeholder="Search by title or description..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="block w-full pl-10 pr-3 py-2.5 border border-border-strong rounded-xl leading-5 bg-surface-raised placeholder-gray-500 focus:outline-none focus:bg-white focus:border-primary-500 focus:ring-1 focus:ring-[#0D9488] sm:text-sm transition-colors"
 />
 </div>
 <div className="flex w-full md:w-auto overflow-x-auto snap-x hide-scrollbar gap-2 pb-2 md:pb-0">
 <button
 onClick={() => setActiveCategory(null)}
 className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
 activeCategory === null 
 ? 'bg-primary-500 text-white shadow-md' 
 : 'bg-surface-raised text-text-secondary hover:bg-surface-raised'
 }`}
 >
 All Items
 </button>
 {EQUIPMENT_CATEGORIES.map(category => (
 <button
 key={category}
 onClick={() => setActiveCategory(category)}
 className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
 activeCategory === category 
 ? 'bg-primary-500 text-white shadow-md' 
 : 'bg-surface-raised text-text-secondary hover:bg-surface-raised'
 }`}
 >
 {category}
 </button>
 ))}
 </div>
 </div>
 
 {/* Grid or Empty Results */}
 {filteredProducts.length === 0 ? (
 <div className="bg-white rounded-2xl border border-border p-12 text-center shadow-sm">
 <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
 <Filter className="w-8 h-8 text-text-muted" />
 </div>
 <h3 className="text-xl font-semibold text-text-primary mb-2">No matching equipment</h3>
 <p className="text-text-secondary">Try adjusting your search query or category filters.</p>
 <button 
 onClick={() => { setSearchQuery(''); setActiveCategory(null); }}
 className="mt-6 px-6 py-2 bg-surface-raised hover:bg-surface-raised text-text-primary font-medium rounded-lg transition-colors"
 >
 Clear Filters
 </button>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
 {filteredProducts.map((product) => (
 <div key={product.id} onClick={() => setSelectedProduct(product)} className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group cursor-pointer hover:-translate-y-1">
 <ProductImages product={product} />
 
 <div className="p-5 flex-1 flex flex-col">
 <h3 className="font-bold text-base text-white mb-1 line-clamp-2">{product.title}</h3>
 <p className="text-text-secondary text-sm flex-1 line-clamp-3 mb-6">
 {product.description || 'No description available.'}
 </p>
 
 <div className="flex items-center justify-between mt-auto pt-4 border-t border-surface-raised">
 <div className="text-xl font-bold tracking-tight text-text-primary">
 {product.price !== null && product.price !== undefined ? `$${Number(product.price).toFixed(2)}` : ''}
 </div>
 <a 
 href={product.productUrl} 
 target="_blank" 
 rel="noopener noreferrer"
 onClick={(e) => e.stopPropagation()}
 className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
 style={{ color: '#ffffff' }}
 >
 <ShoppingCart className="w-4 h-4 text-white" />
 View Item
 </a>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 )}
 </div>
 </div>

 {/* Quick View Modal */}
 {selectedProduct && (
 <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-12 animate-in fade-in duration-200">
 <div className="bg-white rounded-3xl w-full max-w-5xl max-h-full overflow-hidden flex flex-col md:flex-row shadow-2xl relative shadow-black/50 animate-in zoom-in-95 duration-200">
 <button 
 onClick={() => setSelectedProduct(null)}
 className="absolute top-4 right-4 z-20 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center text-text-primary hover:bg-white transition-colors border border-border shadow-sm"
 >
 <X className="w-5 h-5" />
 </button>
 
 <div className="md:w-1/2 bg-background border-b md:border-b-0 md:border-r border-border flex flex-col justify-center relative min-h-[300px]">
 <ProductImages product={selectedProduct} />
 </div>

 <div 
 className="md:w-1/2 p-8 md:p-12 flex flex-col overflow-y-auto max-h-[70vh] md:max-h-[85vh] bg-white"
 style={{ backgroundColor: '#ffffff' }}
 >
 {selectedProduct.category && (
 <span className="inline-block px-3 py-1 bg-[#EEF2F6] text-primary-500 text-xs font-bold uppercase tracking-wider rounded-md border border-primary-500/20 mb-4 w-fit">
 {selectedProduct.category}
 </span>
 )}
 <h2 className="text-3xl font-bold text-text-primary mb-4 leading-tight">{selectedProduct.title}</h2>
 
 <div className="text-3xl font-bold tracking-tight text-text-primary mb-8">
 {selectedProduct.price !== null && selectedProduct.price !== undefined ? `$${Number(selectedProduct.price).toFixed(2)}` : ''}
 </div>
 
 <div className="prose prose-sm text-text-secondary max-w-none flex-1 mb-8 whitespace-pre-wrap leading-relaxed">
 {selectedProduct.description || 'No description available.'}
 </div>

 <div className="pt-8 border-t border-border mt-auto">
 <a 
 href={selectedProduct.productUrl} 
 target="_blank" 
 rel="noopener noreferrer"
 className="flex w-full items-center justify-center gap-3 px-6 py-4 bg-gray-900 hover:bg-black text-white text-base font-semibold rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
 style={{ color: '#ffffff', backgroundColor: '#111827' }}
 >
 <ShoppingCart className="w-5 h-5 text-white" />
 View on Retailer Site
 </a>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
