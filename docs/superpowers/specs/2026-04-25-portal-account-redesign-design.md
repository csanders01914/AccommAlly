# Portal Account Redesign — Design Spec

_Date: 2026-04-25_

## Overview

Replace the current single-case PIN-based portal login with a full account system. Claimants create an account (email + password), link one or more cases, and access a dashboard with four actions: file a new claim, view an existing claim, message their examiner, and upload documents.

---

## Decisions Made

| Question | Decision |
|---|---|
| Registration model | Both self-service and examiner invite |
| Case linking verification | Case number + last name + date of birth, OR examiner invite code |
| PIN purpose | Account-level identity verification for phone/video calls (not portal login) |
| New claim filing | Creates a OPEN case, round-robin coordinator assignment |
| Claim form fields | Accommodation type, description, optional supporting documents |
| Document uploads | Free-form at any time + examiner requests surfaced prominently |
| Tenant scoping | `/portal/[slug]` using existing tenant slugs |
| Backward compatibility | Hard cutover — old case+PIN login removed |
| `/portal` root | Org lookup page — enter slug → redirect to `/portal/[slug]` |

---

## Data Model Changes

### `Claimant` — new and changed fields

```prisma
passwordHash              String?
registrationSource        String    @default("STAFF")  // "STAFF" | "SELF_REGISTERED"
emailVerified             Boolean   @default(false)
emailVerificationToken    String?   @unique   // stored as SHA-256 hash of the raw token
passwordResetToken        String?   @unique   // stored as SHA-256 hash of the raw token
passwordResetExpiresAt    DateTime?
```

Existing field change:
```prisma
birthdate   DateTime?   // was non-nullable; made nullable to support self-registered
                        // accounts before they have filed or linked a claim
```

- `pinHash` remains but changes meaning: identity verification credential for phone/video calls, not portal login.
- `credentialType` is no longer needed for the portal login path.
- Token fields (`emailVerificationToken`, `passwordResetToken`) store the SHA-256 hash of the raw token. The raw token is only ever present in the emailed URL and is never stored in plaintext.

### `PortalInvite` — new model

```prisma
model PortalInvite {
  id          String    @id @default(cuid())
  tenantId    String
  caseId      String
  code        String    @unique   // random 8-char alphanumeric
  expiresAt   DateTime
  usedAt      DateTime?
  createdById String
  createdAt   DateTime  @default(now())
  case        Case      @relation(fields: [caseId], references: [id])
  tenant      Tenant    @relation(fields: [tenantId], references: [id])
  createdBy   User      @relation(fields: [createdById], references: [id])
}
```

### Portal session token

Changes from `{ claimantId, caseId, tenantId, role, purpose }` to `{ claimantId, tenantId, role, purpose }`. No case binding in the token — the dashboard fetches all cases where `claimantRef = claimantId`.

---

## Auth Flows

### Self-service registration

1. Claimant visits `/portal/[slug]`, selects "Create Account"
2. Provides: email, password, PIN (4–6 digits), confirm password
3. Server checks for existing `Claimant` with matching `emailHash` in the tenant:
   - Found → attach `passwordHash`, set `registrationSource: SELF_REGISTERED`
   - Not found → create new `Claimant` record
4. Send email verification link (`emailVerificationToken`, no expiry gate on login)
5. Land on dashboard — empty state prompts to link a claim or file a new one

### Examiner invite registration

1. Examiner opens a case → "Invite Claimant to Portal" → system creates a `PortalInvite` (8-char code, 72hr expiry), displays it for copying
2. Claimant visits `/portal/[slug]` → "I have an invite code"
3. Enters code + creates account (email, password, PIN)
4. Server validates code, links account to the case's claimant record, marks invite `usedAt`
5. Land on dashboard already showing the linked case — no manual linking step needed

### Login

Email + password. Issues JWT in `portal_token` cookie scoped to `{ claimantId, tenantId }`. Existing rate limiting and audit logging apply.

### Case linking (post-registration)

From the dashboard → "Link an existing claim" → enter case number + last name + date of birth. All three must match a `Case` in the tenant. On success, `Case.claimantRef` is set to the claimant's ID.

### Password reset

"Forgot password" on login page → enter email → reset link emailed if account exists (token stored as `passwordResetToken`, expires 1 hour). Reset form validates token, updates `passwordHash`, clears token fields.

---

## Routing

```
/portal                                          Org lookup (slug input → redirect)
/portal/[slug]                                   Login / Register (tabbed)
/portal/[slug]/forgot-password                   Request reset email
/portal/[slug]/reset-password                    Consume token, set new password
/portal/[slug]/verify-email                      Consume email verification token
/portal/[slug]/dashboard                         Case list + action cards
/portal/[slug]/dashboard/new-claim               File a new claim (2-step form)
/portal/[slug]/dashboard/claims/[caseId]         Claim detail (Status / Documents / Messages tabs)
/portal/[slug]/dashboard/claims/[caseId]/upload  Document upload
```

- A shared layout for `/portal/[slug]/dashboard/**` calls `getPortalSession()` and redirects to `/portal/[slug]` if unauthenticated.
- The `[slug]` layout resolves the `Tenant` by slug and returns 404 if not found. Tenant name is passed down for portal header branding.
- The tenant slug is sent as an `x-portal-slug` request header on all portal API calls so the server can resolve the tenant without embedding it in the JWT.
- Existing `/portal` and `/portal/dashboard` pages are replaced entirely.

---

## Dashboard

**Unauthenticated state** (`/portal/[slug]`): tabbed login / register form. Register tab shows email, password, confirm password, PIN fields. "I have an invite code" link switches to invite code entry.

**Authenticated dashboard** (`/portal/[slug]/dashboard`):
- Welcome header with claimant's name
- Primary CTA: "File a New Claim"
- Case list — each card shows: case number, status badge, assigned examiner, last updated, and three quick-action buttons: View Details, Message Examiner, Upload Document
- Empty state (no cases): "File a New Claim" + "Link an Existing Claim" side by side

---

## New Claim Filing

Two-step form at `/portal/[slug]/dashboard/new-claim`:

**Step 1 — Accommodation Details**
- Accommodation type (dropdown: Physical, Schedule, Equipment, Remote Work, Other)
- Description (textarea, required)
- Supporting documents (optional file upload, multiple files allowed)

**Step 2 — Review & Submit**
- Summary of entered data; confirm and submit

**On submit:**
1. Create `Case` with `status: OPEN`, `category: ACCOMMODATION`
2. Round-robin coordinator selection: active `COORDINATOR` users in the tenant, ordered by `createdAt`, cycling by total cases assigned count
3. Set `createdById` to selected coordinator, `claimantRef` to logged-in claimant
4. Upload any attached documents to the new case
5. Redirect to `/portal/[slug]/dashboard/claims/[newCaseId]`

---

## Claim Detail

Three tabs at `/portal/[slug]/dashboard/claims/[caseId]`:

- **Status** — case number, status badge, assigned examiner name, process timeline (Submitted → Coordinator Review → Decision Made), accommodation requests list
- **Documents** — existing docs with download; examiner document requests surfaced as prominent "Upload Requested" cards with direct upload CTA; free-form "Upload a Document" always available below
- **Messages** — existing message thread UI, no changes to current implementation

---

## API Routes

### Public portal (no staff auth required)

```
POST /api/public/portal/register                    Create account
POST /api/public/portal/login                       Email + password login (replaces case+PIN)
POST /api/public/portal/logout                      Clear cookie
POST /api/public/portal/forgot-password             Send reset email
POST /api/public/portal/reset-password              Consume token, update password
GET  /api/public/portal/verify-email                Consume email verification token

GET  /api/public/portal/cases                       List claimant's cases
POST /api/public/portal/cases                       File a new claim
POST /api/public/portal/cases/link                  Link existing case (case# + lastName + DOB)

GET  /api/public/portal/status                      Case detail (requires ?caseId= if multiple cases)
GET  /api/public/portal/messages                    Message thread (requires ?caseId=)
POST /api/public/portal/messages                    Send message (requires ?caseId=)
GET  /api/public/portal/documents/[id]              Download document

POST /api/public/portal/cases/[caseId]/documents    Upload document to case
```

### Staff (requires staff auth)

```
POST /api/cases/[id]/portal-invite                  Generate invite code for a case
```

### Tenant resolution

All public portal API routes resolve the tenant from the `x-portal-slug` request header. Routes that require portal auth additionally validate the `portal_token` cookie. The `claimantId` from the token gates all case access — a claimant can only read/write cases where `Case.claimantRef = claimantId` AND `Case.tenantId = tenantId`.

---

## Security Notes

- Password reset tokens and email verification tokens are single-use, stored as SHA-256 hashes, and cleared after use. The raw token only ever exists in the emailed URL.
- Portal invite codes expire after 72 hours and are single-use (`usedAt` set on redemption).
- Case linking (case# + lastName + DOB) uses constant-time comparison on the lastName field to prevent timing attacks.
- All portal auth actions (register, login, failed login, case link, invite redemption) are written to `AuditLog`.
- `portal_token` cookie remains `HttpOnly`, `SameSite: lax`.
