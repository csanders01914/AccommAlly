import { Prisma } from '@prisma/client';

/**
 * Multi-tenant Prisma extension that automatically scopes all queries
 * to the current tenant by adding tenantId filters and data.
 * 
 * Usage:
 *   const tenantPrisma = withTenantScope(prisma, tenantId);
 *   const cases = await tenantPrisma.case.findMany(); // Automatically filtered by tenantId
 */

// Models that have tenantId column
const TENANT_SCOPED_MODELS = [
  'user',
  'case',
  'client',
  'claimant',
  'claimFamily',
  'identityVerification',
  'contact',
  'accommodation',
  'task',
  'note',
  'auditLog',
  'document',
  'annotation',
  'message',
  'messageFolder',
  'inboundRule',
  'callRequest',
  'inventoryItem',
  'meeting',
  'meetingAttendee',
  'reminder',
] as const;

// Models with optional tenantId (for platform-level data)
const OPTIONAL_TENANT_MODELS = ['errorLog', 'bugReport'] as const;

type TenantScopedModel = typeof TENANT_SCOPED_MODELS[number];
type OptionalTenantModel = typeof OPTIONAL_TENANT_MODELS[number];

function isTenantScopedModel(model: string): model is TenantScopedModel {
  return TENANT_SCOPED_MODELS.includes(model.toLowerCase() as TenantScopedModel);
}

function isOptionalTenantModel(model: string): model is OptionalTenantModel {
  return OPTIONAL_TENANT_MODELS.includes(model.toLowerCase() as OptionalTenantModel);
}

/**
 * Creates a Prisma client extension that automatically applies tenant scoping
 * to all database operations.
 * 
 * @param tenantId - The tenant ID to scope all operations to
 * @returns Extended Prisma client with automatic tenant filtering
 */
export function createTenantExtension(tenantId: string) {
  return Prisma.defineExtension({
    name: 'tenantScope',
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },
        async findUnique({ model, args, query }) {
          if (!isTenantScopedModel(model)) {
            return query(args);
          }
          // When a select clause omits tenantId, result.tenantId is undefined
          // and the tenant check would incorrectly return null. Temporarily add it.
          const originalSelect = (args as any).select;
          const needsTenantId = originalSelect && !originalSelect.tenantId;
          if (needsTenantId) {
            (args as any).select = { ...originalSelect, tenantId: true };
          }
          const result = await query(args);
          if (result && (result as { tenantId?: string }).tenantId !== tenantId) {
            return null; // Record belongs to different tenant
          }
          if (needsTenantId && result) {
            const { tenantId: _t, ...rest } = result as any;
            return rest;
          }
          return result;
        },
        async findFirstOrThrow({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },
        async findUniqueOrThrow({ model, args, query }) {
          if (!isTenantScopedModel(model)) {
            return query(args);
          }
          const originalSelect = (args as any).select;
          const needsTenantId = originalSelect && !originalSelect.tenantId;
          if (needsTenantId) {
            (args as any).select = { ...originalSelect, tenantId: true };
          }
          const result = await query(args);
          if (result && (result as { tenantId?: string }).tenantId !== tenantId) {
            throw new Error('Record not found');
          }
          if (needsTenantId && result) {
            const { tenantId: _t, ...rest } = result as any;
            return rest;
          }
          return result;
        },
        async create({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            args.data = { ...(args.data as any), tenantId };
          } else if (isOptionalTenantModel(model)) {
            // For optional tenant models, set tenantId if not explicitly null
            if ((args.data as { tenantId?: string | null }).tenantId === undefined) {
              args.data = { ...(args.data as any), tenantId };
            }
          }
          return query(args);
        },
        async createMany({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            if (Array.isArray(args.data)) {
              args.data = args.data.map(item => ({ ...item, tenantId }));
            } else {
              args.data = { ...(args.data as any), tenantId };
            }
          }
          return query(args);
        },
        async update({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            // Ensure we're only updating records within our tenant
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },
        async updateMany({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },
        async upsert({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            args.where = { ...args.where, tenantId } as typeof args.where;
            args.create = { ...(args.create as any), tenantId };
          }
          return query(args);
        },
        async delete({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            args.where = { ...args.where, tenantId } as typeof args.where;
          }
          return query(args);
        },
        async deleteMany({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },
        async count({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },
        async aggregate({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },
        async groupBy({ model, args, query }) {
          if (isTenantScopedModel(model)) {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },
      },
    },
  });
}

/**
 * Helper to create a tenant-scoped Prisma client
 * 
 * @param basePrisma - The base Prisma client
 * @param tenantId - The tenant ID to scope to
 * @returns Tenant-scoped Prisma client
 * 
 * @example
 * ```typescript
 * const tenantPrisma = withTenantScope(prisma, session.tenantId);
 * const cases = await tenantPrisma.case.findMany();
 * ```
 */
export function withTenantScope<T extends { $extends: (...args: any[]) => any }>(
  basePrisma: T,
  tenantId: string
): ReturnType<T['$extends']> {
  return basePrisma.$extends(createTenantExtension(tenantId));
}

/**
 * Validates that a record belongs to the specified tenant
 * 
 * @param record - The record to validate
 * @param tenantId - The expected tenant ID
 * @returns True if the record belongs to the tenant
 */
export function validateTenantAccess(
  record: { tenantId?: string | null } | null,
  tenantId: string
): boolean {
  if (!record) return false;
  return record.tenantId === tenantId;
}

/**
 * Extracts tenant ID from various sources in priority order
 * Used by middleware/API handlers to determine current tenant
 * 
 * @param options.subdomain - Subdomain from request (e.g., "acme" from acme.accommally.com)
 * @param options.customDomain - Full custom domain (e.g., "acme-hr.com")
 * @param options.pathPrefix - Path prefix (e.g., "acme" from /t/acme/dashboard)
 * @param options.sessionTenantId - Tenant ID from authenticated session
 * 
 * @returns Object with resolved tenantId and source, or null if not resolvable
 */
export async function resolveTenantId(options: {
  subdomain?: string;
  customDomain?: string;
  pathPrefix?: string;
  sessionTenantId?: string;
  prisma: { tenant: { findFirst: Function } };
}): Promise<{ tenantId: string; source: string } | null> {
  const { subdomain, customDomain, pathPrefix, sessionTenantId, prisma } = options;

  // Priority 1: Session tenant ID (already authenticated)
  if (sessionTenantId) {
    return { tenantId: sessionTenantId, source: 'session' };
  }

  // Priority 2: Custom domain lookup
  if (customDomain) {
    const tenant = await prisma.tenant.findFirst({
      where: { domain: customDomain, status: 'ACTIVE' },
      select: { id: true },
    });
    if (tenant) {
      return { tenantId: tenant.id, source: 'domain' };
    }
  }

  // Priority 3: Subdomain lookup
  if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: subdomain, status: 'ACTIVE' },
      select: { id: true },
    });
    if (tenant) {
      return { tenantId: tenant.id, source: 'subdomain' };
    }
  }

  // Priority 4: Path prefix lookup
  if (pathPrefix) {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: pathPrefix, status: 'ACTIVE' },
      select: { id: true },
    });
    if (tenant) {
      return { tenantId: tenant.id, source: 'path' };
    }
  }

  return null;
}
