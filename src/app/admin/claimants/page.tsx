'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Filter, User, Calendar, Loader2 } from 'lucide-react';
import Link from 'next/link';
import CreateClaimantModal from '@/components/modals/CreateClaimantModal';

interface Claimant {
 id: string;
 claimantNumber: string;
 name: string;
 birthdate: string;
 casesCount: number;
 createdAt: string;
 credentialType: 'PIN' | 'PASSPHRASE';
}

export default function AdminClaimantsPage() {
 const router = useRouter(); // Use Next.js router
 const [claimants, setClaimants] = useState<Claimant[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

 const fetchClaimants = async () => {
 try {
 setIsLoading(true);
 const params = new URLSearchParams();
 if (search) params.append('search', search);

 const res = await fetch(`/api/claimants?${params.toString()}`);
 if (res.ok) {
 const { data } = await res.json();
 setClaimants(data);
 }
 } catch (error) {
 console.error('Failed to fetch claimants', error);
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 const timer = setTimeout(() => {
 fetchClaimants();
 }, 500); // Debounce search
 return () => clearTimeout(timer);
 }, [search]);

 return (
 <div className="min-h-screen font-sans p-8">
 <div className="max-w-7xl mx-auto space-y-6">

 {/* Header */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div>
 <h1 className="text-2xl font-bold text-[#1C1A17]">Claimant Management</h1>
 <p className="text-[#8C8880]">Manage claimant identities and credentials</p>
 </div>
 <button
 onClick={() => setIsCreateModalOpen(true)}
 className="flex items-center gap-2 px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-[#ffffff] rounded-lg shadow-sm transition-colors font-medium"
 >
 <Plus className="w-4 h-4" />
 New Claimant
 </button>
 </div>

 {/* Filters */}
 <div className="bg-[#ffffff] rounded-xl border border-[#E5E2DB] p-4">
 <div className="relative max-w-md">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8880]" />
 <input
 type="text"
 placeholder="Search by name or claimant ID..."
 className="w-full pl-10 pr-4 py-2 rounded-lg border border-[#E5E2DB] bg-[#FAF6EE] text-[#1C1A17] placeholder-[#8C8880] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 />
 </div>
 </div>

 {/* List */}
 <div className="bg-[#ffffff] rounded-xl border border-[#E5E2DB] overflow-hidden">
 {isLoading ? (
 <div className="flex justify-center py-12">
 <Loader2 className="w-8 h-8 animate-spin text-[#0D9488]" />
 </div>
 ) : claimants.length > 0 ? (
 <div className="overflow-x-auto">
 <table className="w-full text-left text-sm">
 <thead className="bg-[#FAF6EE] border-b border-[#E5E2DB]">
 <tr>
 <th className="px-6 py-4 text-xs font-semibold text-[#8C8880] uppercase tracking-[0.08em]">Name / ID</th>
 <th className="px-6 py-4 text-xs font-semibold text-[#8C8880] uppercase tracking-[0.08em]">Date of Birth</th>
 <th className="px-6 py-4 text-xs font-semibold text-[#8C8880] uppercase tracking-[0.08em]">Verification</th>
 <th className="px-6 py-4 text-xs font-semibold text-[#8C8880] uppercase tracking-[0.08em]">Cases</th>
 <th className="px-6 py-4 text-xs font-semibold text-[#8C8880] uppercase tracking-[0.08em]">Created</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[#F3F1EC]">
 {claimants.map((c) => (
 <tr
 key={c.id}
 className="hover:bg-[#FAF6EE] transition-colors cursor-pointer"
 onClick={() => router.push(`/claimants/${c.id}`)}
 >
 <td className="px-6 py-4">
 <div className="flex flex-col">
 <span className="font-medium text-[#1C1A17]">{c.name}</span>
 <span className="text-xs text-[#0D9488] font-mono mt-0.5">#{c.claimantNumber}</span>
 </div>
 </td>
 <td className="px-6 py-4 text-[#5C5850]">
 <div className="flex items-center gap-2">
 <Calendar className="w-3 h-3 opacity-50" />
 {new Date(c.birthdate).toLocaleDateString()}
 </div>
 </td>
 <td className="px-6 py-4">
 <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-[#0D9488]/8 text-[#0D9488] border-[#0D9488]/20">
 {c.credentialType}
 </span>
 </td>
 <td className="px-6 py-4">
 <span className="inline-flex items-center justify-center min-w-[1.5rem] px-2 py-0.5 rounded bg-[#F3F1EC] font-medium text-[#5C5850] text-xs">
 {c.casesCount || 0}
 </span>
 </td>
 <td className="px-6 py-4 text-[#8C8880] text-xs">
 {new Date(c.createdAt).toLocaleDateString()}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 ) : (
 <div className="text-center py-12 text-[#8C8880]">
 <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
 <p>No claimants found</p>
 </div>
 )}
 </div>
 </div>

 <CreateClaimantModal
 isOpen={isCreateModalOpen}
 onClose={() => setIsCreateModalOpen(false)}
 onSuccess={() => {
 fetchClaimants();
 setIsCreateModalOpen(false);
 }}
 />
 </div>
 );
}
