# Desi Dhamaka — CMS Location-Scoping Audit & Bug-Fix Report

> Generated against the **actual** codebase schema. The original task prompt assumed a
> schema that does not exist in this project (a `locations` table with UUID foreign keys,
> and tables like `hero_content`, `catering_content`, `testimonials`, `about_content`,
> `contact_info`, `order_direct_card`, `uber_eats_card`, `location_settings`). **None of
> those exist here.** This report maps the request onto the real architecture.

---

## Actual architecture (ground truth)

- **Locations are not database rows.** They are three fixed string IDs defined in
  `src/config/locations.ts`: `south-plainfield`, `oak-tree`, `lawrenceville`.
- There is **no `locations` table** and **no UUID foreign keys** for location.
- `location_id` is a **`TEXT`** column with a `CHECK (location_id IN (...))` constraint,
  added incrementally by migrations `007`–`013`.
- Content tables that actually exist: `restaurant_settings`, `homepage_content`,
  `menu_categories`, `menu_items`, `offers`, `gallery`, `reviews`, `reservations`, `users`.

Because of this, the prompt's `ALTER TABLE ... ADD COLUMN location_id UUID REFERENCES
locations(id)` and the `CROSS JOIN locations` migrations **must not be run** — they would
fail or corrupt the schema. The equivalent, correct migrations already exist (007–013).

---

## ROOT CAUSE of "edits apply globally"

The application code **is** location-scoped (verified below). The reported symptom is
explained by two things:

1. **`homepage_content` (the hero / featured section) was genuinely global** — a single
   shared row keyed only by `id` — **until migration `013`**, which adds `location_id` and
   makes the admin + public read/write per location. The prompt's own test case (Step 14)
   edits the **hero title**, which is exactly the table that was global.
2. **Production database has not had migrations `007`–`013` applied.** If those columns do
   not exist in the live Supabase project, the per-location code cannot take effect.

> **Action required by you (cannot be done from the codebase):** run migrations
> `007 → 008 → 009 → 010 → 011 → 012 → 013` in the Supabase SQL Editor on the production
> project. The location-scoping fix is inert until these are applied.

---

## Table-by-table scoping matrix (code verified)

| Table | `location_id` column | Public fetch scoped | Admin update scoped | Admin delete scoped | Decision |
|-------|:---:|:---:|:---:|:---:|---|
| `restaurant_settings` | ✅ (009) | ✅ `.eq(location_id)` | ✅ `.eq(location_id)` | n/a | **Location-scoped** |
| `homepage_content` | ✅ (013) | ✅ `.eq(location_id)` | ✅ `.eq(location_id)` | n/a | **Location-scoped** |
| `menu_categories` | ✅ (007) | ✅ | ✅ `id + location_id` | ✅ `id + location_id` | **Location-scoped** |
| `menu_items` | ✅ (007) | ✅ | ✅ `id + location_id` | ✅ `id + location_id` | **Location-scoped** |
| `offers` | ✅ (008) | ✅ | ✅ `id + location_id` | ✅ `id + location_id` | **Location-scoped** |
| `reservations` | ✅ (009) | ✅ | ✅ `id + location_id` | ✅ `id + location_id` | **Location-scoped** |
| `reviews` (testimonials) | ❌ none | global | by `id` | by `id` | **Global (by design)** — confirm |
| `gallery` | ❌ none | global | by `id` | by `id` | **Global (by design)** — confirm |
| `users` | ❌ none | n/a | n/a | n/a | Global (auth) |

Verified source: `src/services/{restaurantSettings,homepageContent,menuCategories,menuItems,offers,reservations,reviews,gallery}.ts`.

### Update-scoping evidence (representative)
```
menuItems.ts      .update(...).eq("id", id).eq("location_id", locationId)
menuCategories.ts .update(...).eq("id", id).eq("location_id", locationId)
offers.ts         .update(...).eq("id", id).eq("location_id", locationId)
reservations.ts   .update(...).eq("id", id).eq("location_id", locationId)
restaurantSettings.ts .update(...).eq("location_id", locationId)
homepageContent.ts    .update(...).eq("location_id", locationId)
```

---

## Admin location source of truth (verified)

- Single source: `AdminLocationContext` → consumed via `useLocation()` hook.
- "All Locations" mode blocks single-row mutations; per-location pages (Settings, Homepage,
  Menu, Categories, Offers, Reservations) require a single location and re-fetch on change
  via `useEffect([..., scope])`.
- Mutation guard: `resolveMutationLocationId(scope, headerLocationId, rowLocationId)`.
- Only `src/admin/services/dashboardStats.ts` touches Supabase directly (read-only counts);
  every mutating page uses the scoped service layer.

## Public site location source of truth (verified)

- `LocationContext` (`useLocationSelection`) holds the visitor's selected location.
- `useHomepageData` → `fetchHomepageBundle(selectedLocationId)` (hero, about, settings).
- `useMenuData(selectedLocationId)`, `useOffersData(selectedLocationId)`.
- `OfferDetailPage` resolves CMS + static offers per location (`resolveOfferDetail`).
- `reviews` and `gallery` read globally (no location filter) — matches their global design.

---

## Per-page audit

### `/` Home
**Location-scoped & CMS-editable ✅**
- Hero title/subtitle/image/video — `homepage_content` (per location after 013)
- About title/lead — `homepage_content`
- Order CTA text/link — `homepage_content.cta_text` + `restaurant_settings.order_url`
- Restaurant name, phone, email, address, hours, social, map — `restaurant_settings`

**Hardcoded / NOT CMS ❌**
- Entrance scroll frames — `public/frames/manifest.json`
- ExperienceCards copy, card images, ticker items — `src/components/experience/ExperienceCards.tsx`
- Signature dishes (names, prices, images, features) — `src/data/signatureDishes.ts`
- About body paragraphs, quote, images, feature chips — `src/data/aboutSection.ts`
- Catering scroll sequence + overlay — `src/data/cateringSequence.ts`
- Atmosphere gallery cards + announcement ribbon — `src/data/atmosphereGallery.ts`

### `/menu`
**✅** Categories + items (names, prices, images, veg, spice, popular, chef-special) — `menu_categories`, `menu_items`, per location.
**❌** Hero title/subtitle/image, bottom CTA copy — hardcoded in `src/pages/MenuPage.tsx`.

### `/offers` + `/offers/:slug`
**✅** Offer cards and detail pages — `offers` (CMS) merged with static, per location.
**❌** Offers hero copy/image, location-picker labels — hardcoded.

### `/testimonials`
**✅ (global)** Review cards (name, text, rating, featured/approved) — `reviews`.
**❌** Hero copy; "4.9" average; "500+ Google Reviews" badge — hardcoded in `src/pages/TestimonialsPage.tsx`. Reviews are **global, not per-location** (decision to confirm).

### `/gallery`
**✅ (global)** Grid images — `gallery`.
**❌** Hero copy/background — hardcoded.

### `/contact`
**✅** Address, phone, email, hours, map — `restaurant_settings` (per location).
**❌** Hero copy, form labels — hardcoded. Form backend is mock (`CONTACT_API_URL = ""`).

### `/order`
**✅** Direct order URL — `restaurant_settings.order_url` (per location).
**❌** Hero copy/video, order-option cards, Uber Eats URL (`config/locations.ts`), feature grid — hardcoded.

### `/reservation`
**✅** Contact cards, map, reserve URL — `restaurant_settings` (per location); bookings write to `reservations` (per location).
**❌** Hero copy, stats, features, gallery strip, location dropdown labels — hardcoded; time slots derive from `constants/site.ts`, not CMS hours.

### `/about`, `/catering`, `/parties`
**❌ Entirely hardcoded** — no CMS module exists for these pages.

### Global layout
- **Navbar:** nav links hardcoded (`constants/navigation.ts`); logo + name from `restaurant_settings`. **Decision: links global, logo/name per location.** ✅ matches.
- **Footer:** quick links + tagline hardcoded; address/phone/email/hours/social from `restaurant_settings`. **Decision: links/tagline global, contact per location.**
- **Location selector:** source list from `config/locations.ts` — correct (this is the master list, not per-location content).
- **SEO meta:** homepage `<title>`/description/keywords now from `restaurant_settings.seo_*` (per location, after 013); other routes use `constants/seo.ts` (global).

---

## Global vs location-scoped decisions

| Content | Decision | Status |
|---|---|---|
| Brand logo, nav links, footer links, legal links | **Global** | ✅ as-is |
| Hero, about lead, order CTA | Location-scoped | ✅ (needs 013 applied) |
| Menu categories/items, offers | Location-scoped | ✅ |
| Address, phone, email, hours, map, social, order/reserve URLs | Location-scoped | ✅ |
| Homepage SEO title/description/keywords | Location-scoped | ✅ (needs 013 applied) |
| Reviews / testimonials | **Global** (current design) | ⚠️ confirm intent |
| Gallery | **Global** (current design) | ⚠️ confirm intent |
| About / Catering / Parties page bodies, signature dishes, page heroes, order-option cards | Not in CMS | ❌ net-new build (see below) |

---

## Status against the prompt's steps

| Step | Status |
|---|---|
| 1 Find root cause | ✅ Done — homepage_content was global; prod migrations not applied |
| 2 Add `location_id` to content tables | ✅ Already present via 007–013 (correct TEXT schema, not the prompt's UUID schema) |
| 3 Migrate existing rows per location | ✅ Handled in migrations (007/009/013 backfill + `getOrCreate` per location) |
| 4 Scope all fetch queries | ✅ Verified across all services |
| 5 Scope all update/save | ✅ Verified across all services |
| 6 Admin location context single source | ✅ `AdminLocationContext` / `useLocation` |
| 7 Re-fetch on location switch | ✅ `useEffect([..., scope])` on each per-location page |
| 8 Public site scoping | ✅ `LocationContext` drives all per-location reads |
| 9–13 Audit + gaps | ✅ Documented above; remaining gaps are net-new CMS features |
| 14 Live 6-step test | ⛔ See "Testing" — cannot be executed from here |
| 15 Mark items fixed after test | Pending your live verification |

---

## Testing (honest limitation)

I **cannot** execute the live Step-14 test from this environment: it requires the
production Supabase database (with migrations applied) and a running browser session, and I
have no DB credentials or browser control here. Fabricating "test results" would be wrong.

The build compiles cleanly (`npm run build` ✅) and the scoping is verified at the code
level. Below is the exact manual test script to confirm runtime behavior **after applying
migrations 007–013**.

### Manual test script
1. Admin → select **South Plainfield** → Homepage → change Hero Title → Save.
2. Admin → switch to **Oak Tree** → Homepage → confirm Hero Title is the original (unchanged).
3. Admin → back to **South Plainfield** → confirm your edit persisted.
4. Public site → location dropdown **South Plainfield** → confirm new title shows.
5. Public site → switch to **Oak Tree** → confirm original title shows.
6. Repeat for: menu item price, an offer, contact phone, order URL.
   (Reviews & gallery are global by design — the same content is expected on all locations.)

---

## Remaining net-new CMS work (not yet built — needs your go-ahead)

These are currently hardcoded and would each require a new table (with `location_id`), an
admin form, and public wiring. This is a sizeable feature build, listed in priority order:

1. **Page hero blocks** (title/subtitle/image) for Menu, Offers, Gallery, Contact, Order, Reservation, About, Catering, Parties.
2. **Signature dishes** (home carousel).
3. **About / Catering / Parties** page content.
4. **Order-option cards** + Uber Eats card per location.
5. **Testimonials stats** (computed average + count) and optional per-location reviews.
6. **Navigation / footer link management** (if you want these CMS-managed).

> I did not auto-create these tables because it is a large scope expansion and several
> involve global-vs-scoped product decisions. Tell me which to implement and I'll build
> them in batches with migrations, admin forms, and public wiring.
