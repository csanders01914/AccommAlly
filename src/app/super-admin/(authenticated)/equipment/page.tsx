import EquipmentManager from '@/components/admin/EquipmentManager';

export const metadata = {
 title: 'Equipment Management | Super Admin',
};

export default function SuperAdminEquipmentPage() {
 return (
 <div className="space-y-6">
 <div>
 <h1 className="text-2xl font-bold text-[#1C1A17]">Equipment Catalog</h1>
 <p className="text-[#5C5850] mt-1">Manage suggested equipment and affiliate links visible to all tenants. Drag and drop to reorder items.</p>
 </div>
 
 <EquipmentManager />
 </div>
 );
}
