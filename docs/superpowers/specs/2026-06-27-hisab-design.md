# Hisab — Design Spec
**Date:** 2026-06-27
**Status:** Approved

---

## Context

The app owner distributes charitable donations from multiple donors to people in need. Currently there is no structured way to track who sent money, how much, when, or who received it and for what purpose. Hisab ("account/ledger" in Urdu) is a web application to record and audit every rupee in and out, with multi-user access control so a small team can participate with regulated visibility.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Database | PostgreSQL |
| ORM | Prisma (with migrations) |
| Auth | NextAuth.js v5 (credentials provider) |
| UI | Shadcn/ui + Tailwind CSS |
| PDF export | react-pdf |
| Excel export | ExcelJS |
| Validation | Zod |
| Deployment | Linux VPS (Nginx + PM2) or Vercel + Neon/Supabase |

---

## Data Model

### User
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| email | text unique | Login identifier |
| passwordHash | text | bcrypt |
| role | enum | ADMIN \| DATA_ENTRY \| VIEWER |
| scopeType | enum | ALL \| RESTRICTED |
| createdAt | timestamp | |

### Donor
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text nullable | Null when anonymous |
| isAnonymous | boolean | |
| phone | text nullable | |
| email | text nullable | |
| address | text nullable | |
| isRecurring | boolean | |
| notes | text nullable | |
| createdAt | timestamp | |

### Donation
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| donorId | uuid FK → Donor nullable | Null for anonymous |
| amount | decimal(12,2) | PKR |
| date | date | Date money was received |
| paymentMethod | enum | CASH \| BANK_TRANSFER \| EASYPAISA \| JAZZCASH \| OTHER |
| paymentContext | enum | ZAKAT \| SADAQAH \| GENERAL \| OTHER |
| type | enum | POOLED \| DESIGNATED |
| designatedRecipientId | uuid FK → Recipient nullable | Only set when type = DESIGNATED |
| notes | text nullable | |
| recordedBy | uuid FK → User | |
| createdAt | timestamp | |

### Recipient
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| phone | text nullable | |
| address | text nullable | |
| category | enum | MEDICAL \| FOOD \| EDUCATION \| RENT \| EMERGENCY \| OTHER |
| notes | text nullable | |
| isActive | boolean | Soft-delete / deactivation |
| createdAt | timestamp | |

### Distribution
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| recipientId | uuid FK → Recipient | |
| amount | decimal(12,2) | PKR |
| date | date | Date money was given |
| purpose | text | Free-text description |
| donationId | uuid FK → Donation nullable | Null = drawn from general pool |
| notes | text nullable | |
| recordedBy | uuid FK → User | |
| createdAt | timestamp | |

### UserScope
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| userId | uuid FK → User | |
| donorId | uuid FK → Donor nullable | Grants access to this donor |
| recipientId | uuid FK → Recipient nullable | Grants access to this recipient |

**Balance logic:**
- **Pool balance** = SUM(Donations where type=POOLED) − SUM(Distributions where donationId IS NULL)
- **Designated remaining** per donation = donation.amount − SUM(Distributions where donationId = donation.id)
- **Over-distribution guard:** When adding a distribution linked to a designated donation, the server validates that the new amount does not exceed the designated donation's remaining balance. Returns a validation error if it would.

---

## Application Structure

```
/app
  /(auth)
    /login                      — email + password login page
  /(dashboard)
    /layout.tsx                 — sidebar + topbar shell
    /overview                   — dashboard: stat cards + recent panels
    /donors
      /page.tsx                 — donors table (search, filter)
      /[id]/page.tsx            — donor detail: profile + all donations
      /new/page.tsx             — add donor form
    /donations
      /page.tsx                 — donations log (filter by donor, type, context, date)
      /new/page.tsx             — record donation form
      /[id]/page.tsx            — donation detail + linked distributions
    /recipients
      /page.tsx                 — recipients table (filter by category, status)
      /[id]/page.tsx            — recipient detail: profile + distribution history
      /new/page.tsx             — add recipient form
    /distributions
      /page.tsx                 — distributions log (filter by recipient, date)
      /new/page.tsx             — record distribution form
    /reports
      /page.tsx                 — report selector
      /donor/[id]               — per-donor statement → PDF/Excel export
      /recipient/[id]           — per-recipient history → PDF/Excel export
      /audit                    — full audit by date range → PDF/Excel export
    /users                      — user management (Admin only)
/prisma
  /schema.prisma
/lib
  /auth.ts                      — NextAuth config
  /db.ts                        — Prisma client singleton
  /permissions.ts               — role + scope enforcement helpers
```

---

## Roles & Access

| Action | Admin | Data Entry | Viewer |
|---|---|---|---|
| View donors / donations | ✓ | ✓ (scoped) | ✓ (scoped) |
| Add / edit donors | ✓ | ✓ | — |
| Add / edit donations | ✓ | ✓ | — |
| View recipients / distributions | ✓ | ✓ (scoped) | ✓ (scoped) |
| Add / edit recipients | ✓ | ✓ | — |
| Add / edit distributions | ✓ | ✓ | — |
| Delete any record | ✓ | — | — |
| Export reports (PDF/Excel) | ✓ | ✓ | ✓ |
| Manage users & access | ✓ | — | — |

**Scoping:** When `scopeType = RESTRICTED`, every server-side query filters results through the user's `UserScope` rows. Enforced in `lib/permissions.ts` and applied in all Prisma queries — never client-side only. Admin accounts always have `scopeType = ALL` and cannot be restricted.

**Auth:**
- Email + password login only
- Sessions last 7 days (rolling)
- No self-registration — Admins create all accounts
- Passwords hashed with bcrypt (cost factor 12)
- Any user can change their own password from a profile/settings page

---

## Key UI Pages

### Dashboard
- 4 stat cards: Total Received, Total Distributed, Pool Balance, Designated Unspent
- Recent Donations panel (last 5 — donor name, amount, payment context tag)
- Recent Distributions panel (last 5 — recipient name, amount, category tag)
- Date range filter: this month / this year / all time / custom

### Donors
- Searchable, sortable table: name, total donated, last donation, recurring badge
- Filters: recurring, anonymous, payment context
- Row click → donor detail (profile + full donation history + breakdown by context)

### Donations
- Table: date, donor, amount, type (Pooled/Designated), method, context, recorded by
- Filters: date range, type, context, payment method
- Add form: donor picker (or anonymous toggle), amount, date, method, context, type toggle, optional designated recipient, notes

### Recipients
- Table: name, category, total received, last distribution, active status
- Filters: category, active/inactive
- Row click → recipient detail (profile + full distribution history)

### Distributions
- Table: date, recipient, amount, purpose, source (pool or donation ref), recorded by
- Add form: recipient picker, amount, date, purpose, optional donation link, notes

### Reports
- **Donor Statement:** pick donor → all donations + where each rupee went → PDF/Excel
- **Recipient History:** pick recipient → full distribution timeline → PDF/Excel
- **Full Audit:** date range → all transactions in period → PDF/Excel

### Users & Access (Admin only)
- List: name, email, role, scope type
- Add/edit: name, email, temporary password, role, scope type
- If RESTRICTED: multi-select which donors and recipients they can see

---

## Audit Trail

Every Donation and Distribution records `recordedBy` (user) and `createdAt` (entry timestamp) separately from the transaction `date`. Records are never hard-deleted — donors and recipients can be deactivated (`isActive = false`) but all history is retained permanently.

---

## Verification Plan

1. **Auth:** Wrong password is rejected; correct credentials create a session; unauthenticated users are redirected to `/login`.
2. **Scoping:** A RESTRICTED user sees only their assigned donors/recipients in all lists, searches, and dropdowns.
3. **Pool balance:** Record a 10,000 pooled donation then a 3,000 pool distribution — dashboard shows 7,000 pool balance.
4. **Designated balance:** Record a 5,000 designated donation for Recipient A, then a 5,000 distribution linked to it — designated unspent drops to 0.
5. **Reports:** Generate a donor statement as PDF and Excel; confirm all donations and linked distributions are present.
6. **Role enforcement:** Viewer sees no Add/Edit buttons; direct POST to `/api/donations` as Viewer returns 403.
