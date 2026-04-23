'use client';
import { apiFetch } from '@/lib/api-client';

import { useState, useEffect } from 'react';

type SubscriptionPlan = {
 id: string;
 code: string;
 name: string;
 maxUsers: number;
 maxActiveClaims: number;
};

export default function PlansPage() {
 const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState<string | null>(null);

 useEffect(() => {
 fetchPlans();
 }, []);

 const fetchPlans = async () => {
 try {
 const res = await apiFetch('/api/super-admin/plans');
 if (res.ok) {
 const data = await res.json();
 setPlans(data);
 } else {
 console.error('Failed to fetch plans');
 }
 } catch (error) {
 console.error('Error fetching plans:', error);
 } finally {
 setLoading(false);
 }
 };

 const updatePlan = async (plan: SubscriptionPlan) => {
 setSaving(plan.id);
 try {
 const res = await apiFetch('/api/super-admin/plans', {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 id: plan.id,
 maxUsers: plan.maxUsers,
 maxActiveClaims: plan.maxActiveClaims
 }),
 });

 if (!res.ok) {
 alert('Failed to update plan');
 } else {
 // Refresh to confirm/sync
 // const updated = await res.json();
 // setPlans(plans.map(p => p.id === updated.id ? updated : p));
 }
 } catch (error) {
 console.error('Error updating plan:', error);
 alert('Error updating plan');
 } finally {
 setSaving(null);
 }
 };

 if (loading) return <div className="p-8">Loading plans...</div>;

 return (
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
 <h1 className="text-2xl font-bold mb-6">Subscription Plans</h1>
 <p className="text-gray-600 mb-8">
 Define resource limits for each subscription tier. Set limits to -1 for unlimited access.
 </p>

 <div className="bg-white shadow overflow-hidden sm:rounded-lg">
 <table className="min-w-full divide-y divide-gray-200">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan Name</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Users</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Active Claims</th>
 <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-gray-200">
 {plans.map((plan) => (
 <tr key={plan.id}>
 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{plan.name}</td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{plan.code}</td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
 <input
 type="number"
 value={plan.maxUsers}
 onChange={(e) => setPlans(plans.map(p => p.id === plan.id ? { ...p, maxUsers: parseInt(e.target.value) } : p))}
 className="border rounded px-2 py-1 w-24"
 />
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
 <input
 type="number"
 value={plan.maxActiveClaims}
 onChange={(e) => setPlans(plans.map(p => p.id === plan.id ? { ...p, maxActiveClaims: parseInt(e.target.value) } : p))}
 className="border rounded px-2 py-1 w-24"
 />
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
 <button
 onClick={() => updatePlan(plan)}
 disabled={saving === plan.id}
 className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
 >
 {saving === plan.id ? 'Saving...' : 'Save'}
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 );
}
