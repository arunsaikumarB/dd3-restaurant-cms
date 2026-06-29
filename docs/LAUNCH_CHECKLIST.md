# Final Launch Checklist

Deployment and real-world validation — **no new features**.  
Complete this after Phase 17 is deployed to production.

**Production URL:** `https://desidhamakanj.net/lawrenceville`  
**Admin:** `/admin/login`  
**Functional tests:** see [SMOKE_TEST.md](./SMOKE_TEST.md)

---

## Infrastructure

### Verify Netlify environment variables
**Netlify → Site configuration → Environment variables → Production**

- [ ] `VITE_SUPABASE_URL` — Supabase project URL
- [ ] `VITE_SUPABASE_ANON_KEY` — anon public key only
- [ ] **Not set:** `SUPABASE_SERVICE_ROLE_KEY` (never in frontend/Netlify public env)
- [ ] Redeploy after any env change (**Deploys → Trigger deploy**)

### Verify custom domain
**Netlify → Domain management**

- [ ] Primary domain: `desidhamakanj.net/lawrenceville` (or your chosen path/subdomain)
- [ ] DNS points to Netlify (A/CNAME records green in dashboard)
- [ ] `www` redirect configured if required
- [ ] `src/constants/site.ts` → `SITE.url` matches the live canonical URL

### Verify HTTPS
- [ ] Site loads at `https://` (not `http://`)
- [ ] HTTP redirects to HTTPS (Netlify enforces this by default)
- [ ] No mixed-content warnings in browser DevTools → Console

### Check SSL certificate
**Netlify → Domain management → HTTPS**

- [ ] Certificate status: **Verified**
- [ ] Let’s Encrypt (or custom cert) not expired
- [ ] Admin login works over HTTPS (`/admin/login`)

---

## Supabase

### Confirm migrations 001–006 are applied
**Supabase → SQL Editor** — run:

```sql
-- Spot-check: tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Spot-check: gallery.visible exists (004+)
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'gallery' AND column_name = 'visible';

-- Spot-check: reviews.featured exists (005+)
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'featured';
```

Migration files (run any missing in order):

1. `001_initial_schema.sql`
2. `002_rls_policies.sql`
3. `003_storage_buckets.sql`
4. `004_gallery_columns.sql`
5. `005_reviews_featured.sql`
6. `006_production_hardening.sql`

### Confirm your account has role = admin
```sql
SELECT id, email, role
FROM public.users
WHERE email = 'tomparkerofficial02@gmail.com';
-- Expect: role = admin
```

If not admin:
```sql
UPDATE public.users SET role = 'admin'
WHERE email = 'tomparkerofficial02@gmail.com';
```

### Disable public sign-up (recommended)
**Supabase → Authentication → Providers → Email**

- [ ] **Enable email provider** (for admin login)
- [ ] **Disable “Allow new users to sign up”** (or restrict to invite-only)
- [ ] Create staff accounts manually: **Authentication → Users → Add user**, then set role in `public.users`

New signups default to `staff` (migration 006). Only `admin` can access `/admin/*`.

### Verify storage bucket policies
**Supabase → Storage**

Buckets (from migration 003):

| Bucket | Purpose |
|--------|---------|
| `menu-images` | Menu photos |
| `gallery-images` | Gallery |
| `offer-images` | Offer banners |
| `homepage-images` | Hero / homepage media |
| `restaurant-assets` | Logo, favicon |

- [ ] All five buckets exist and are **public** read
- [ ] Upload test as admin: menu image, gallery image, logo in Settings
- [ ] Public URL loads in incognito (no auth)
- [ ] Anonymous upload **fails** (RLS: admin-only write)

---

## Functional

### Complete smoke test
- [ ] Work through every item in [SMOKE_TEST.md](./SMOKE_TEST.md)
- [ ] Fill in the sign-off table at the bottom

### Test on desktop, tablet, and mobile
Use Chrome DevTools device toolbar or real devices:

- [ ] `/` homepage (hero video, scroll sections)
- [ ] `/menu` (tabs, search, cards)
- [ ] `/reservation` (form, sticky CTA)
- [ ] `/admin/login` + dashboard (sidebar collapse on mobile)
- [ ] Navigation drawer on mobile
- [ ] No horizontal overflow on 375px width

### Verify image uploads
Admin → upload → public page (wait up to **60s** for cache):

- [ ] Menu item image → `/menu`
- [ ] Gallery image → `/gallery`
- [ ] Offer banner → `/offers`
- [ ] Logo → navbar, hero, footer
- [ ] Homepage hero image/video → `/`

### Verify reservation submissions
- [ ] Public: `/reservation` → submit test booking
- [ ] Admin: **Reservations** → new row with status **Pending**
- [ ] Admin: change status → **Confirmed**
- [ ] Admin: delete test row

### Verify public updates after admin changes
After each admin save, hard-refresh or wait **≤60 seconds** (public cache TTL):

- [ ] Homepage hero / about
- [ ] Settings phone → footer, contact, reservation contact cards
- [ ] Menu item price / visibility
- [ ] Offer active / date range
- [ ] Gallery visible toggle
- [ ] Review approve / featured order

---

## Performance

### Run Lighthouse on production
Chrome DevTools → Lighthouse → **Navigation** → Mobile + Desktop

Target pages:

- [ ] `/` (homepage)
- [ ] `/menu`
- [ ] `/reservation`

Record scores (informal targets):

| Category | Target |
|----------|--------|
| Performance | ≥ 70 mobile (heavy animations may limit score) |
| Accessibility | ≥ 90 |
| Best Practices | ≥ 90 |
| SEO | ≥ 90 |

### Check image optimization
- [ ] Uploaded images are JPEG/WebP (storage policy limits)
- [ ] Hero poster preloads in `index.html`
- [ ] Lazy loading on below-fold images (Logo, gallery)
- [ ] No broken image URLs after Supabase upload

### Verify no console errors
Incognito, each key page — **Console** should be clean (no red errors):

- [ ] `/`
- [ ] `/menu`
- [ ] `/offers`
- [ ] `/gallery`
- [ ] `/testimonials`
- [ ] `/reservation`
- [ ] `/admin/login` (after sign-in)

Acceptable: Lighthouse audit warnings; Supabase auth refresh logs in dev only.

---

## SEO

### Verify page titles
View tab title or DevTools → Elements → `<title>` on:

- [ ] `/`, `/menu`, `/about`, `/contact`, `/reservation`, `/offers`, `/gallery`, `/testimonials`

Titles come from `src/constants/seo.ts` via `PageSEO`.

### Verify meta descriptions
DevTools → `<meta name="description">` matches `PAGE_SEO` for each route.

### Verify Open Graph images
Share debugger or view source:

- [ ] `og:title`, `og:description`, `og:url`, `og:image` present
- [ ] Default OG image: `/showcase/biryani.jpg` (absolute URL uses `SITE.url`)
- [ ] Test with [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) or LinkedIn post preview

### Submit sitemap to search engines
**Current sitemap:** `https://desidhamakanj.net/lawrenceville/sitemap.xml`

- [ ] Open sitemap URL in browser — valid XML, no 404
- [ ] **Note:** sitemap currently omits `/offers` — add before submit if that page should be indexed
- [ ] [Google Search Console](https://search.google.com/search-console) → add property → submit sitemap
- [ ] Bing Webmaster Tools → submit same sitemap

### Check robots.txt
**URL:** `https://desidhamakanj.net/lawrenceville/robots.txt`

- [ ] Returns `Allow: /` and correct `Sitemap:` line
- [ ] Optional hardening: add `Disallow: /admin` to keep admin out of crawlers (not required for security)

---

## Monitoring (first 72 hours)

### Monitor logs
**Netlify → Logs → Functions & edge** (if used) and deploy logs

- [ ] No failed builds after launch
- [ ] Watch for spike in 404s on old URLs

### Watch failed reservation submissions
**Supabase → Table Editor → reservations**

- [ ] Compare public form submissions vs rows created
- [ ] **Logs → Postgres** if inserts fail (RLS / validation)
- [ ] Test from mobile network (not just office Wi‑Fi)

### Check Supabase usage and storage
**Supabase → Project Settings → Usage**

- [ ] Database size within free tier
- [ ] Storage usage after image uploads
- [ ] Auth MAU (monthly active users)
- [ ] Set billing alert if on paid plan

---

## Launch sign-off

| Section | Pass | Fail | Date | Notes |
|---------|------|------|------|-------|
| Infrastructure | | | | |
| Supabase | | | | |
| Functional | | | | |
| Performance | | | | |
| SEO | | | | |
| Monitoring plan | | | | |

**When all sections pass:** announce publicly (social, Google Business Profile, email list).

---

## Quick deploy command

```bash
npm run build
npx netlify-cli deploy --build --prod
```

Or push to the connected Git branch and let Netlify auto-deploy.

After deploy: run [SMOKE_TEST.md](./SMOKE_TEST.md) on the live URL before announcing.
