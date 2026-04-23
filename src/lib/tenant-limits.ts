import prisma from '@/lib/prisma';

/**
 * Check if a tenant has reached their user limit.
 * Returns true if they CAN create more users, false if limit reached.
 */
export async function checkTenantUserLimit(tenantId: string): Promise<boolean> {
 const tenant = await prisma.tenant.findUnique({
 where: { id: tenantId },
 include: { subscriptionPlan: true },
 });

 if (!tenant || !tenant.subscriptionPlan) return true; // Default to allow if no plan found (shouldn't happen)

 const limit = tenant.subscriptionPlan.maxUsers;
 if (limit === -1) return true; // Unlimited

 const userCount = await prisma.user.count({
 where: { tenantId, active: true },
 });

 return userCount < limit;
}

/**
 * Check if a tenant has reached their active claim limit.
 * Active Claim = Case with status NOT CLOSED or ARCHIVED.
 * Returns true if they CAN create more claims, false if limit reached.
 */
export async function checkTenantClaimLimit(tenantId: string): Promise<boolean> {
 const tenant = await prisma.tenant.findUnique({
 where: { id: tenantId },
 include: { subscriptionPlan: true },
 });

 if (!tenant || !tenant.subscriptionPlan) return true;

 const limit = tenant.subscriptionPlan.maxActiveClaims;
 if (limit === -1) return true;

 // Count active cases
 // We can treat "Active" as anything not CLOSED or ARCHIVED
 const activeCaseCount = await prisma.case.count({
 where: {
 tenantId,
 status: {
 notIn: ['CLOSED', 'ARCHIVED'],
 },
 },
 });

 return activeCaseCount < limit;
}
