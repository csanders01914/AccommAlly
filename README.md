# AccommAlly

Accommodation case management SaaS platform for disability services teams.

## Stack

- **Framework:** Next.js 16 App Router (TypeScript)
- **Database:** PostgreSQL (Neon) via Prisma 7
- **Auth:** JWT + bcrypt + TOTP 2FA
- **Encryption:** AES-256-GCM field-level encryption (Prisma extension)
- **Styling:** Tailwind CSS 4

## Quick Start

1. **Copy env template and fill in values:**
   ```bash
   cp .env.example .env
   ```
   See `.env.example` for required variables and how to generate them.

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run database migrations:**
   ```bash
   npx prisma migrate dev
   ```

4. **Seed the database (optional):**
   ```bash
   npm run db:seed
   ```

5. **Start the dev server:**
   ```bash
   npm run dev
   ```

## Environment Variables

| Variable | Description |
|---|---|
| `POSTGRES_PRISMA_URL` | Neon pooled connection string |
| `DATABASE_URL` | Neon direct connection string (for migrations) |
| `JWT_SECRET` | 64-char hex — signs session JWTs |
| `ENCRYPTION_KEY` | 64-char hex — AES-256 field encryption key |
| `PORTAL_JWT_SECRET` | 64-char hex — signs claimant portal JWTs |

Generate secrets: `openssl rand -hex 32`

## Architecture

### Multi-Tenancy
Every database row is scoped to a `tenantId`. All API routes wrap queries in `withTenantScope(prisma, tenantId)` which injects `WHERE tenantId = ?` automatically.

### Field-Level Encryption
Sensitive fields (names, emails, phone numbers, medical conditions, notes, document content) are encrypted at the Prisma layer via `encryptionExtension` in `src/lib/prisma-extension.ts`. Encryption is transparent to business logic.

Searchable fields (email, phone) have a corresponding `*Hash` field (HMAC-SHA256) used for equality lookups.

### Authentication
Three separate auth contexts:
- **Staff (Tenant Users):** Cookie-based JWT at `/api/auth/*`, 8-hour session
- **Claimants (Portal):** Separate JWT at `/api/public/portal/*`, 1-hour session, PIN/passphrase credential
- **Super-Admins:** Separate JWT at `/api/super-admin/auth/*`

### Rate Limiting
Distributed rate limiting via PostgreSQL (`RateLimit` table). Login: 5/15min. 2FA: 5/5min. Portal: 10/15min.

## Testing

```bash
npm test              # run all tests
npm run test:watch    # watch mode
```

## Database

```bash
npx prisma migrate dev    # apply migrations
npx prisma studio         # GUI for local DB
npx prisma generate       # regenerate client after schema changes
```
