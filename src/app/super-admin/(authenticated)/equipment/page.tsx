import EquipmentManager from '@/components/admin/EquipmentManager';

export const metadata = {
 title: 'Equipment Management | Super Admin',
};

export default function SuperAdminEquipmentPage() {
 return (
 <div className="space-y-6">
 <div>
 <h1 className="text-2xl font-bold text-text-primary">Equipment Catalog</h1>
 <p className="text-text-secondary mt-1">Manage suggested equipment and affiliate links visible to all tenants. Drag and drop to reorder items.</p>
 </div>
 
 <EquipmentManager />
 </div>
 );
}
