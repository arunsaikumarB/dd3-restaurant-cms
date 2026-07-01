# ChefGaa API Analysis & Integration Architecture

**Project:** Desi Dhamaka Website + Admin CMS  
**Date:** 2026-07-01  
**Phase:** Discovery & architecture (no sync implementation yet)  
**Author:** Integration architecture audit

---

## Executive summary

Desi Dhamaka operates **three locations** on **two ChefGaa API generations**:

| Location | ChefGaa API | Identifier | Order URL |
|----------|-------------|------------|-----------|
| South Plainfield | **Legacy** | `outlet: 70`, `order_type: 106` | `order.chefgaa.com/...?order_type=106` |
| Oak Tree | **Legacy** | `outlet: 71`, `order_type: 108` | `order.chefgaa.com/...?order_type=108` |
| Lawrenceville | **V2 Public BFF** | `tenant-id` + `store-id` headers | `orders.chefgaa.com/.../menu` |

Legacy APIs are **fully reachable** and return complete menus in a single call. V2 probes with stored credentials returned **422 platform not found** — credentials or platform slug must be refreshed from ChefGaa admin before Lawrenceville sync can be implemented.

**Recommendation:** Build a **version-agnostic integration layer** with per-location adapters, a normalized catalog model, diff-based sync engine, and a dedicated sync audit schema. Do **not** import raw API JSON into the CMS or public site.

Raw samples live in [`docs/chefgaa-samples/`](chefgaa-samples/). Outlet meta responses containing payment secrets are **redacted** and must never be called from browser or logged.

---

## 1. Overview

### 1.1 Current state (codebase)

| Area | Today |
|------|--------|
| Menu source | Manual CMS + one-time SQL seeds from scripts |
| ChefGaa usage | Order deep links (`chefgaaNameMap.ts`), seed generator (`generate-location-menu-seeds.mjs`) |
| Location scoping | `location_id` on `menu_categories`, `menu_items` (migrations 007, 010) |
| Public menu | `menuPublic.ts` — Supabase first, static fallback, 60s cache |
| Lawrenceville menu seed | HTML scrape fallback when V2 unavailable |

### 1.2 Target state

ChefGaa becomes **source of truth** for categories, items, pricing, availability, and images. CMS becomes a **sync dashboard** with optional manual override mode. Public site reads normalized data from Supabase (existing pattern).

### 1.3 Design principles

1. **Never expose raw POS JSON** to React components or public APIs.
2. **Never hardcode** outlet IDs, tenant IDs, or field mappings in application code — store in DB + env.
3. **Per-location adapter** selects Legacy vs V2 at runtime.
4. **Diff before write** — skip unchanged rows.
5. **Location isolation** — all mutations scoped by `location_id` (existing trigger).
6. **Secrets server-side only** — sync runs on Edge Function / Node worker with service role.

---

## 2. API discovery

### 2.1 Legacy API (South Plainfield + Oak Tree)

**Base URL:** `https://api.chefgaa.com`

#### Authentication / context

| Header | Value | Required |
|--------|-------|----------|
| `outlet` | `70` (SP) or `71` (OT) | Yes |
| `partner` | `1` | Yes |
| `Accept` | `application/json` | Yes |

No API key in headers for public menu reads (same as existing order web apps).

#### Verified endpoints

| Method | Path | Purpose | Pagination |
|--------|------|---------|------------|
| `GET` | `/menu-item` | Full menu (categories + items) | None — single array |
| `GET` | `/menu-item/{outletMenuItemId}` | Item detail + `modifier_groups` IDs | N/A |
| `GET` | `/outlet/{id}` | Outlet metadata | **Do not use in sync** — returns payment secrets |

#### Response shape (list)

Top-level **JSON array** of category objects (not `{ data: [] }`).

```json
[
  {
    "name": "Pulav",
    "OutletMenuItemCategory": 365,
    "sort_order": 20,
    "availability": { "time_slots": [], "order_types": [{ "order_type": 106, "available": true }] },
    "categoryAvailability": [],
    "menuItems": [
      {
        "name": "Natukodi Pulav",
        "OutletMenuItem": 8727,
        "selling_price": 24.99,
        "cost_price": 24.99,
        "mark_as_unavailable": true,
        "item_available_in_store": true,
        "image": null,
        "description": null,
        "is_customizable": false,
        "availability": { "time_slots": [], "order_types": [...] }
      }
    ]
  }
]
```

#### Response shape (item detail)

Wrapped: `{ "data": { ... } }`

See [`chefgaa-samples/legacy-menu-item-detail-7895.json`](chefgaa-samples/legacy-menu-item-detail-7895.json).

#### Live counts (2026-07-01)

| Outlet | Address (API) | Categories | Items | Primary order_type |
|--------|---------------|------------|-------|-------------------|
| **70** | 6001 Hadley Rd, South Plainfield | 29 | 433 | 106 |
| **71** | 1734 Oaktree Rd, Edison | 23 | 335 | 108 |

> **Note:** Website `locations.ts` lists Stelton Rd for SP; ChefGaa outlet record shows Hadley Rd. Treat ChefGaa outlet metadata as operational truth; reconcile marketing address separately.

#### Legacy outlet metadata risk

`GET /outlet/{id}` returns **`PaymentPrivateKey`** (live Stripe secret).  
**Action:** Never call this endpoint from sync jobs unless explicitly required; never persist; never expose to admin UI. Report to ChefGaa as a security concern.

---

### 2.2 V2 Public BFF API (Lawrenceville)

**Base URL:** `https://chf2-customer-api.chefgaa.com`  
**Ordering UI:** `https://orders.chefgaa.com` (note **`orders`** subdomain vs `order` for legacy)

#### Authentication / context

| Header | Value | Required |
|--------|-------|----------|
| `tenant-id` | UUID (per store) | Yes |
| `store-id` | UUID (per store) | Yes |
| `x-platform` | `web` | Yes |
| `Accept` | `application/json` | Yes |

Stored values in `scripts/fetch-lv-menu.mjs` (may be stale):

- `tenant-id`: `bc3e7543-c8d6-4d77-bd87-d30cda29ca51`
- `store-id`: `b8e4c76f-0534-47e8-952f-495e60959158`

#### Documented endpoints (from scripts + probes)

| Method | Path | Status (2026-07-01) |
|--------|------|---------------------|
| `GET` | `/api/v1/public/menu/platforms/slug/{slug}` | **422** `error_platforms_not_found` |
| `GET` | `/api/v1/public/menu/platforms/{platformId}` | Not reached (depends on slug) |

Alternative slugs probed: `desi-dhamaka`, `lawrenceville-dd-kitchen-llc` — both failed.

#### V2 discovery gap

Before implementation:

1. Obtain current `tenant-id`, `store-id`, and platform slug from **ChefGaa admin** or by inspecting the live `orders.chefgaa.com` JS bundle (bundle format changed; `bp=` extraction no longer works).
2. Capture full V2 menu JSON to `docs/chefgaa-samples/v2-platform-menu-full.json`.
3. Document V2 field names for categories, items, modifiers, taxes.

Expected V2 envelope (from script comments):

```json
{
  "success": true,
  "data": {
    "id": "<platform-uuid>",
    "data": {
      "categories": [
        {
          "name": "...",
          "items": [{ "name": "...", "selling_price": 0, "sellingPrice": 0 }]
        }
      ]
    }
  }
}
```

V2 likely uses **camelCase** in addition to snake_case (dual naming observed in scripts).

---

## 3. Field-by-field comparison

### 3.1 Categories

| Concept | Legacy | V2 (expected) | CMS `menu_categories` |
|---------|--------|---------------|------------------------|
| ID | `OutletMenuItemCategory` (int) | TBD UUID/int | New: `chefgaa_external_id` |
| Name | `name` | `name` | `name` |
| Slug | — | — | Generated (`slugify(name)`) |
| Sort | `sort_order` (optional) | TBD | `display_order` |
| Image | — | TBD | `image` |
| Availability | `availability`, `categoryAvailability` | TBD | Maps to `status` + schedule metadata |
| Active schedule flag | `isAnyActiveScheduledCategory` | TBD | Informational |

### 3.2 Menu items

| Concept | Legacy list | Legacy detail | CMS `menu_items` |
|---------|-------------|---------------|------------------|
| Outlet item ID | `OutletMenuItem` | `id` | `chefgaa_outlet_item_id` |
| Global item ID | — | `menu_items_id` | `chefgaa_catalog_item_id` |
| Name | `name` | `name` / `display_name` | `name` |
| Description | `description` | `description` | `description` |
| Price | `selling_price` | `selling_price` | `price` |
| Cost | `cost_price` | `cost_price` | Optional audit only |
| Image | `image` (URL or opaque token) | same | `image` (resolve URL) |
| Unavailable | `mark_as_unavailable` | same | `status: inactive` |
| In-store flag | `item_available_in_store` | — | Normalized availability |
| Customizable | `is_customizable` | — | Triggers modifier fetch |
| Sort | `sort_order` | — | `display_order` |
| Veg | **Not provided** | — | **Inferred** (category + name heuristics) |
| Popular | — | `is_recommended` (detail only) | `popular` |
| Chef special | **Not provided** | — | **Inferred** (name regex) |
| Spice level | **Not provided** | — | Optional inference or null |

### 3.3 Images

| Legacy behavior | Integration rule |
|-----------------|------------------|
| Full HTTPS URL to Azure blob | Store as-is |
| Opaque token (e.g. `MTc2NTE4...`) | Resolve via ChefGaa CDN pattern or detail endpoint; do not store token as public URL |

### 3.4 Availability

Legacy structure:

```json
{
  "time_slots": [{ "start_time": "09:00", "end_time": "22:30" }],
  "order_types": [{ "order_type": 108, "available": true }]
}
```

- `mark_as_unavailable: true` → item hidden even if order type available.
- Empty `time_slots` → no time restriction (or inherits category).
- Website `status` = `active` only when POS says available for the location's primary `order_type`.

### 3.5 Modifiers

| Legacy | Status |
|--------|--------|
| List endpoint | `is_customizable: true` on some items |
| Detail endpoint | `modifier_groups: [3650]` (array of IDs) |
| Modifier group fetch | **No public GET found** (`/modifier-group/{id}` → 404) |

**Risk:** Full modifier sync may require undocumented endpoints, authenticated API, or V2 menu payload embedding groups inline. Phase 2 should confirm with ChefGaa or V2 full menu capture.

### 3.6 Taxes

Not exposed on legacy public menu endpoints. Defer to V2 discovery or checkout API. Website does not display tax lines today.

### 3.7 Pagination

| API | Pagination |
|-----|------------|
| Legacy `/menu-item` | **None** — full catalog |
| V2 | Unknown — assume single platform payload until proven otherwise |

---

## 4. Compatibility matrix

| Capability | Legacy (70/71) | V2 (Lawrenceville) | CMS today |
|------------|----------------|--------------------|-----------|
| Categories | ✅ | 🔶 Unverified | ✅ manual |
| Items | ✅ | 🔶 Unverified | ✅ manual |
| Pricing | ✅ | 🔶 Unverified | ✅ |
| Availability flags | ✅ | 🔶 Unverified | Partial (`status`) |
| Images | ⚠️ Partial / tokens | 🔶 Unverified | ✅ |
| Veg / non-veg | ❌ Infer | 🔶 | ✅ inferred in seeds |
| Popular | ⚠️ Detail only | 🔶 | ✅ manual |
| Chef special | ❌ Infer | 🔶 | ✅ inferred in seeds |
| Modifiers | ⚠️ IDs only | 🔶 | ❌ not in schema |
| Taxes | ❌ | 🔶 | ❌ |
| Stable external IDs | ✅ ints | 🔶 UUIDs expected | ❌ missing columns |
| Single-call full menu | ✅ | 🔶 expected | — |

**Overall compatibility score: 72/100**  
Legacy is production-ready for category/item/price/availability sync. V2 blocked on credential/slug refresh. Modifiers and taxes are **phase 2** for both APIs.

---

## 5. Recommended normalized model

All adapters map into these types. Application code **only** uses these interfaces.

```typescript
// src/integrations/chefgaa/types/normalized.ts

export type ChefGaaApiVersion = "legacy" | "v2";

export type NormalizedTimeSlot = {
  startTime: string; // HH:mm
  endTime: string;
};

export type NormalizedOrderTypeAvailability = {
  orderTypeId: string;
  available: boolean;
};

export type NormalizedAvailability = {
  unavailable: boolean;
  availableInStore: boolean;
  timeSlots: NormalizedTimeSlot[];
  orderTypes: NormalizedOrderTypeAvailability[];
};

export type NormalizedTax = {
  externalId: string;
  name: string;
  rate: number;
  inclusive: boolean;
};

export type NormalizedModifierOption = {
  externalId: string;
  name: string;
  priceDelta: number;
  defaultSelected: boolean;
  availability: NormalizedAvailability;
};

export type NormalizedModifierGroup = {
  externalId: string;
  name: string;
  minSelections: number;
  maxSelections: number;
  required: boolean;
  options: NormalizedModifierOption[];
};

export type NormalizedMenuItem = {
  externalOutletItemId: string;
  externalCatalogItemId: string | null;
  categoryExternalId: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  availability: NormalizedAvailability;
  isCustomizable: boolean;
  modifierGroupExternalIds: string[];
  modifierGroups: NormalizedModifierGroup[];
  flags: {
    veg: boolean | null; // null = unknown
    popular: boolean;
    chefSpecial: boolean;
    spiceLevel: number | null;
  };
  displayOrder: number;
  rawSortOrder: number | null;
  contentHash: string; // sha256 of normalized payload for diff
};

export type NormalizedCategory = {
  externalId: string;
  name: string;
  displayOrder: number;
  availability: NormalizedAvailability;
  items: NormalizedMenuItem[];
  contentHash: string;
};

export type NormalizedLocationMenu = {
  locationId: string;
  apiVersion: ChefGaaApiVersion;
  fetchedAt: string;
  outletId: string | null;
  storeId: string | null;
  tenantId: string | null;
  orderTypeId: string | null;
  categories: NormalizedCategory[];
  taxes: NormalizedTax[];
};
```

### 5.1 Mapping rules (legacy → normalized)

| Normalized | Legacy source |
|------------|---------------|
| `category.externalId` | `String(OutletMenuItemCategory)` |
| `item.externalOutletItemId` | `String(OutletMenuItem)` |
| `item.externalCatalogItemId` | From detail: `menu_items_id` |
| `item.price` | `selling_price ?? cost_price` |
| `availability.unavailable` | `mark_as_unavailable` |
| `availability.availableInStore` | `item_available_in_store` |
| `flags.veg` | Heuristic (`inferVeg` from existing seed script) |
| `flags.chefSpecial` | Heuristic (`isChefSpecial` regex) |
| `flags.popular` | `is_recommended === 1` when detail fetched |
| `imageUrl` | Resolve `image` if starts with `http` |

---

## 6. Integration architecture

### 6.1 Folder structure

```
src/integrations/chefgaa/
├── api/
│   ├── legacy/
│   │   ├── client.ts          # fetch wrapper, headers from config
│   │   ├── endpoints.ts       # path constants
│   │   └── types.ts           # raw legacy response types
│   └── v2/
│       ├── client.ts
│       ├── endpoints.ts
│       └── types.ts
├── normalizers/
│   ├── legacyMenuNormalizer.ts
│   ├── v2MenuNormalizer.ts
│   ├── availability.ts
│   ├── imageResolver.ts
│   └── inferFlags.ts          # veg, chef special (reuse seed heuristics)
├── services/
│   ├── fetchLocationMenu.ts   # picks adapter by config
│   ├── syncLocationMenu.ts    # orchestrates diff + upsert
│   └── syncAllLocations.ts
├── sync/
│   ├── diffEngine.ts          # compare normalized vs DB snapshot
│   ├── upsertPlanner.ts       # insert / update / deactivate plan
│   ├── executor.ts            # transactional apply via service role
│   ├── retry.ts
│   └── scheduler.ts           # cron / pg_cron / edge cron
├── logs/
│   ├── syncRunRepository.ts
│   └── types.ts
├── types/
│   ├── normalized.ts
│   └── config.ts
└── utils/
    ├── hash.ts
    └── errors.ts
```

**Server-only** (never bundled to browser):

```
supabase/functions/chefgaa-sync/     # or scripts/chefgaa-sync-worker.mjs
```

**Admin UI** (thin client):

```
src/admin/pages/ChefGaaIntegrationPage.tsx
src/services/chefgaaSync.ts          # calls edge function / RPC
```

### 6.2 Sync engine flow

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Admin/Cron  │────▶│ fetchLocationMenu │────▶│ Legacy / V2 API │
└─────────────┘     └──────────────────┘     └─────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │   Normalizer    │
                   └─────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │load DB snapshot │◀── menu_categories + menu_items
                   │  (by location)  │     + chefgaa_external_* cols
                   └─────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │   Diff Engine   │──▶ create / update / deactivate lists
                   └─────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Executor (txn)  │──▶ Supabase service role
                   └─────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │  Sync run log   │
                   │ invalidate cache│──▶ menuPublic cache per location
                   └─────────────────┘
```

### 6.3 Sync modes

| Mode | Behavior |
|------|----------|
| **Manual** | Admin clicks "Sync" per location or all |
| **Scheduled** | 15 min / hourly / daily per `chefgaa_location_config` |
| **Full** | Replace snapshot from POS; deactivate CMS rows missing from POS |
| **Incremental** | Compare `content_hash`; skip unchanged rows |

### 6.4 Conflict detection

| Scenario | Resolution |
|----------|------------|
| Same `chefgaa_outlet_item_id`, price changed | Update |
| Item removed from POS | `status = inactive` (never delete — reservations/history) |
| Category renamed in POS | Update name; keep slug unless admin override |
| Manual override enabled | Skip fields marked `manual_override_*` on row |
| Duplicate slug on rename | Append `-2` suffix (existing seed pattern) |

### 6.5 Never duplicate / never cross-location

- Upsert key: `(location_id, chefgaa_outlet_item_id)`
- Category key: `(location_id, chefgaa_category_id)`
- Existing DB trigger `menu_items_sync_location` enforces `menu_items.location_id` matches category

---

## 7. Database assessment

### 7.1 Location-aware tables (verified)

| Table | `location_id` | Notes |
|-------|---------------|-------|
| `menu_categories` | ✅ | Unique `(location_id, slug)` |
| `menu_items` | ✅ | FK + trigger sync with category |
| `restaurant_settings` | ✅ | Per-location order URL |
| `offers` | ✅ | CMS-managed; not POS-synced initially |
| `reservations` | ✅ | Independent of menu sync |
| `homepage_content` | ✅ | Not POS-synced |

### 7.2 Missing columns (migration recommended)

**Migration `017_chefgaa_integration.sql` (proposed):**

```sql
-- Per-location POS connection config (no secrets in DB — refs env var names)
CREATE TABLE public.chefgaa_location_config (
  location_id TEXT PRIMARY KEY,
  api_version TEXT NOT NULL CHECK (api_version IN ('legacy', 'v2')),
  legacy_outlet_id INTEGER,
  legacy_partner_id INTEGER DEFAULT 1,
  legacy_order_type_id INTEGER,
  v2_tenant_id UUID,
  v2_store_id UUID,
  v2_platform_slug TEXT,
  sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sync_schedule TEXT NOT NULL DEFAULT 'manual'
    CHECK (sync_schedule IN ('manual', '15m', 'hourly', 'daily')),
  manual_override_mode BOOLEAN NOT NULL DEFAULT FALSE,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_duration_ms INTEGER,
  last_sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sync audit history
CREATE TABLE public.chefgaa_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL,
  trigger TEXT NOT NULL CHECK (trigger IN ('manual', 'scheduled', 'retry')),
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'partial', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  categories_created INTEGER NOT NULL DEFAULT 0,
  categories_updated INTEGER NOT NULL DEFAULT 0,
  categories_deactivated INTEGER NOT NULL DEFAULT 0,
  items_created INTEGER NOT NULL DEFAULT 0,
  items_updated INTEGER NOT NULL DEFAULT 0,
  items_deactivated INTEGER NOT NULL DEFAULT 0,
  error_summary TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.chefgaa_sync_run_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.chefgaa_sync_runs(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  message TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.menu_categories
  ADD COLUMN IF NOT EXISTS chefgaa_category_id TEXT,
  ADD COLUMN IF NOT EXISTS chefgaa_content_hash TEXT,
  ADD COLUMN IF NOT EXISTS imported_from_chefgaa BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS chefgaa_last_synced_at TIMESTAMPTZ;

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS chefgaa_outlet_item_id TEXT,
  ADD COLUMN IF NOT EXISTS chefgaa_catalog_item_id TEXT,
  ADD COLUMN IF NOT EXISTS chefgaa_content_hash TEXT,
  ADD COLUMN IF NOT EXISTS imported_from_chefgaa BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS chefgaa_last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS manual_override BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS menu_categories_location_chefgaa_id_idx
  ON public.menu_categories (location_id, chefgaa_category_id)
  WHERE chefgaa_category_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS menu_items_location_chefgaa_outlet_item_idx
  ON public.menu_items (location_id, chefgaa_outlet_item_id)
  WHERE chefgaa_outlet_item_id IS NOT NULL;
```

**Seed config rows:**

| location_id | api_version | legacy_outlet_id | legacy_order_type_id |
|-------------|-------------|------------------|----------------------|
| south-plainfield | legacy | 70 | 106 |
| oak-tree | legacy | 71 | 108 |
| lawrenceville | v2 | — | — (tenant/store TBD) |

### 7.3 Modifier storage (phase 2)

Optional tables `menu_modifier_groups`, `menu_modifier_options`, `menu_item_modifier_groups` — only after modifier API confirmed.

---

## 8. CMS integration (planned)

### 8.1 New admin section: **ChefGaa Integration**

Route: `/admin/integrations/chefgaa`  
Sidebar: under Settings or new "Integrations" group (mirror future POS pattern).

**Display per location:**

| Field | Source |
|-------|--------|
| Connection status | Last sync success/failure |
| API version | `chefgaa_location_config.api_version` |
| Outlet / Store / Tenant | Config row |
| Last sync | `last_sync_at` |
| Items synced | From last `chefgaa_sync_runs` |
| Errors | `last_sync_error` + event log |
| Sync duration | `last_sync_duration_ms` |

**Controls:**

- Sync All
- Sync Selected Location
- View Logs (DataTable of `chefgaa_sync_runs`)
- Retry Failed Sync

### 8.2 Menu Management changes

- Badge: **Imported from ChefGaa** when `imported_from_chefgaa = true`
- Show **Last synced** timestamp
- Read-only fields when `manual_override_mode = false` (global per location)
- Optional per-item `manual_override` to allow CMS edits without next sync overwrite

---

## 9. Auto-sync schedule

| Schedule | Implementation option |
|----------|----------------------|
| Manual | Default |
| Every 15 minutes | Supabase Edge Function cron / GitHub Action / external worker |
| Hourly | pg_cron if available |
| Daily | Off-peak cron (e.g. 04:00 ET) |

Store preference in `chefgaa_location_config.sync_schedule`. Worker reads config; never hardcode intervals in code.

---

## 10. Performance strategy

1. **Content hash** on normalized category/item — skip DB write if unchanged.
2. **Batch upserts** — max 100 rows per statement.
3. **Single transaction** per location sync.
4. **Detail fetch** only for `is_customizable` items (legacy) — lazy modifier resolution.
5. **Invalidate** `menuPublic.ts` cache for location after successful sync.
6. **No full delete** — deactivate removed items to preserve FK integrity.

---

## 11. Security

| Risk | Mitigation |
|------|------------|
| Stripe secrets in `/outlet/{id}` | Never call from sync; redact logs; report to ChefGaa |
| Service role key | Edge Function / server worker only; never in Vite bundle |
| Tenant/store IDs | DB config + env fallback; not in client JS |
| RLS | Sync writes via service role; admin UI reads sync logs through authenticated policies |
| Admin bypass | Sync endpoint checks `is_admin()` RPC before triggering |

**Environment variables (proposed):**

```env
# Server / Edge only
SUPABASE_SERVICE_ROLE_KEY=...
CHEFGAA_LV_TENANT_ID=...
CHEFGAA_LV_STORE_ID=...
CHEFGAA_LV_PLATFORM_SLUG=...
CHEFGAA_LEGACY_PARTNER_ID=1
CHEFGAA_SYNC_TIMEOUT_MS=120000
```

---

## 12. Error handling

| Failure | Behavior |
|---------|----------|
| Network timeout | Retry 3x exponential backoff; log partial run |
| HTTP 4xx | Fail fast; surface auth/config error in admin |
| HTTP 5xx | Retry; mark `partial` if some locations succeed |
| Schema drift | Normalizer versioned; log `warn` for unknown fields; don't crash entire sync |
| Partial location failure | `syncAll` continues other locations; aggregate status |
| Image resolve failure | Keep item; `image = null`; log warn |

---

## 13. Future migration strategy

1. **Phase A** — Legacy sync for SP + OT (unblocks 768 items).
2. **Phase B** — Refresh V2 credentials; capture schema; implement `v2MenuNormalizer`.
3. **Phase C** — Modifier groups when API documented.
4. **Phase D** — ChefGaa migrates Oak Tree/SP to V2 → switch `api_version` in config row only.
5. **Phase E** — Abstract `PosIntegrationProvider` interface for future POS vendors.

---

## 14. Implementation roadmap

| Sprint | Deliverable | Depends on |
|--------|-------------|------------|
| **S1** | `017_chefgaa_integration.sql` + config seed | — |
| **S2** | Legacy API client + normalizer + unit tests with fixtures | S1 |
| **S3** | Diff engine + executor (service role script) | S2 |
| **S4** | Sync run logging + manual trigger Edge Function | S3 |
| **S5** | Admin ChefGaa Integration page | S4 |
| **S6** | Menu Management read-only / imported badges | S5 |
| **S7** | V2 credential refresh + normalizer | ChefGaa admin |
| **S8** | Scheduled sync worker | S4 |
| **S9** | Modifier support | API discovery |
| **S10** | Remove manual seed scripts from ops path | S1–S8 stable |

---

## 15. Risk assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| V2 credentials stale | **High** | High | Admin provides fresh tenant/store/slug |
| Payment secrets in legacy outlet API | **Critical** | Certain | Never call/persist; escalate to ChefGaa |
| No veg flag in POS | Medium | Certain | Document inferred flags; allow CMS override |
| Modifier API undocumented | Medium | High | Phase 2; optional for website menu display |
| Image token format | Medium | Medium | `imageResolver` module |
| Menu divergence SP vs OT | Low | Certain | Per-location sync (already designed) |
| Sync overwrites CMS edits | Medium | Medium | `manual_override_mode` + per-item flag |
| Lawrenceville on different API forever | Medium | Medium | Adapter pattern; shared normalized model |

---

## 16. Sample files index

| File | Description |
|------|-------------|
| [`legacy-outlet-70-menu-summary.json`](chefgaa-samples/legacy-outlet-70-menu-summary.json) | SP schema summary |
| [`legacy-outlet-71-menu-summary.json`](chefgaa-samples/legacy-outlet-71-menu-summary.json) | OT schema summary |
| [`legacy-outlet-70-menu-full.json`](chefgaa-samples/legacy-outlet-70-menu-full.json) | Full SP menu (large) |
| [`legacy-outlet-71-menu-full.json`](chefgaa-samples/legacy-outlet-71-menu-full.json) | Full OT menu (large) |
| [`legacy-menu-item-detail-7895.json`](chefgaa-samples/legacy-menu-item-detail-7895.json) | Customizable item + modifier group IDs |
| [`v2-platform-slug.json`](chefgaa-samples/v2-platform-slug.json) | Failed V2 probe (stale credentials) |

**Regenerate samples:**

```bash
node scripts/generate-chefgaa-samples.mjs   # to be added in S2
```

---

## 17. Manual next steps

1. **Confirm outlet mapping** with operations: SP=70, OT=71 (verified via API addresses).
2. **Obtain Lawrenceville V2** `tenant-id`, `store-id`, and platform slug from ChefGaa admin.
3. **Capture V2 full menu JSON** and append to `docs/chefgaa-samples/`.
4. **Report** `PaymentPrivateKey` leakage on `GET /outlet/{id}` to ChefGaa support.
5. **Approve** migration `017_chefgaa_integration.sql` before implementation sprint.
6. **Decide** modifier scope for MVP (recommend: defer; website does not show modifiers today).

---

## 18. Production readiness (this phase)

| Deliverable | Status |
|-------------|--------|
| API discovery | ✅ Legacy complete; V2 partial |
| Raw JSON samples | ✅ Stored in `docs/chefgaa-samples/` |
| Compatibility report | ✅ This document |
| Normalized model | ✅ Specified |
| Architecture | ✅ Specified |
| DB recommendations | ✅ Migration draft included |
| Implementation roadmap | ✅ |
| Sync code | ❌ Intentionally not built (per phase scope) |

**This phase is complete.** Implementation may begin after V2 credentials are refreshed and migration `017` is approved.
