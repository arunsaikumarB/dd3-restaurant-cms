# Deployment Guide

Deploy the Desi Dhamaka website to **Netlify** as a static SPA (Vite + React Router).  
This guide covers **demo/staging** and **production** without code changes — only environment variables.

---

## Stack summary

| Item | Value |
|------|--------|
| Framework | Vite 5 + React 18 |
| Router | React Router v7 (client-side) |
| Build | `npm run build` |
| Publish directory | `dist` |
| Config file | `netlify.toml` |

---

## Required environment variables

Set in **Netlify → Site configuration → Environment variables**.

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SITE_URL` | **Yes** (demo & prod) | Public origin, **no trailing slash**. Canonical, OG, JSON-LD, sitemap, robots. |
| `VITE_SUPABASE_URL` | **Yes** | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | Supabase anon (public) key |

**Never** add `SUPABASE_SERVICE_ROLE_KEY` to Netlify for this frontend.

### Demo / staging example

```
VITE_SITE_URL=https://dd3-demo.netlify.app
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Production example

```
VITE_SITE_URL=https://desidhamakanj.net/lawrenceville
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

`NEXT_PUBLIC_SUPABASE_*` aliases are supported but `VITE_*` is preferred.

---

## Local development

```bash
cp .env.example .env.local
# Fill in VITE_SITE_URL (optional locally — defaults to http://localhost:5173)
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

---

## Build command

```bash
npm run build
```

This runs:

1. `tsc -b` — TypeScript check  
2. `vite build` — output to `dist/`  
3. `node scripts/generate-seo-files.mjs` — writes `dist/robots.txt` and `dist/sitemap.xml` using `VITE_SITE_URL`

### Site URL resolution at build time (SEO files)

Priority order in `scripts/generate-seo-files.mjs`:

1. `VITE_SITE_URL` (recommended — explicit control)
2. `DEPLOY_PRIME_URL` or `URL` (Netlify auto-injected at build)
3. `http://localhost:5173` (local fallback)

### Site URL at runtime (canonical, OG, JSON-LD)

`getSiteUrl()` in `src/config/env.ts`:

1. `import.meta.env.VITE_SITE_URL`
2. `http://localhost:5173` in dev
3. Production fallback constant (only if env missing in a production build)

**Always set `VITE_SITE_URL` in Netlify** for demo and production deploys.

---

## Deploy to Netlify (demo / staging)

Use a **separate Netlify site** from the live restaurant domain so production is not affected.

### Option A — Netlify UI (recommended for CEO demo)

1. Create a **new site** in Netlify (do not link to the production custom domain).
2. Connect this Git repository (or drag-and-drop `dist/` after local build).
3. Build settings (auto-read from `netlify.toml`):
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Add environment variables (see above).  
   For first deploy, set `VITE_SITE_URL` to your Netlify subdomain, e.g. `https://random-name-123.netlify.app`.
5. Deploy.
6. After deploy, confirm the live URL matches `VITE_SITE_URL`. If you used a placeholder, update `VITE_SITE_URL` to the final Netlify URL and **trigger redeploy**.

### Option B — Netlify CLI

```bash
npm run build
npx netlify-cli deploy --prod --dir=dist
```

Set env vars in the Netlify dashboard before `--prod` deploy.

### Demo safeguards

- Use a **new Netlify site** (not the production site's settings).
- Do **not** attach `desidhamakanj.net` to the demo site.
- Use the same Supabase project only if intentional (admin data is shared); consider a separate Supabase project for isolated demos.

---

## Custom domain setup (production only)

When moving from demo to production on the **production Netlify site**:

1. Netlify → **Domain management** → add `desidhamakanj.net` (or subdomain/path as required).
2. Update DNS per Netlify instructions.
3. Set `VITE_SITE_URL=https://desidhamakanj.net/lawrenceville`
4. Redeploy.
5. Verify HTTPS certificate is **Verified**.

Do **not** point the production domain at the demo site.

---

## Demo → Production switch

**No code changes required.** Update environment variables and redeploy:

| Step | Demo | Production |
|------|------|------------|
| Netlify site | `dd3-demo.netlify.app` site | Production site |
| `VITE_SITE_URL` | `https://dd3-demo.netlify.app` | `https://desidhamakanj.net/lawrenceville` |
| Supabase | Same or staging project | Production project |
| Custom domain | None (Netlify subdomain) | Restaurant domain |

After changing `VITE_SITE_URL`:

1. Trigger a new deploy (env vars are baked in at build time).
2. Verify `https://<your-domain>/sitemap.xml` lists correct URLs.
3. Verify `https://<your-domain>/robots.txt` references the correct sitemap.
4. View page source / DevTools → canonical and `og:url` match the live domain.

---

## Post-deployment verification

### Infrastructure

- [ ] Site loads over HTTPS
- [ ] `/admin/login` works
- [ ] SPA routes work (refresh `/menu`, `/admin/dashboard` — no 404)

### SEO files

- [ ] `https://<VITE_SITE_URL>/robots.txt` — `Disallow: /admin`, correct `Sitemap:` line
- [ ] `https://<VITE_SITE_URL>/sitemap.xml` — all public routes, correct host

### Runtime SEO

- [ ] DevTools → `<link rel="canonical">` uses `VITE_SITE_URL`
- [ ] `og:url` and JSON-LD `telephone` / `email` match admin Settings

### Functional

- [ ] Complete [SMOKE_TEST.md](./SMOKE_TEST.md) on the deployed URL
- [ ] Complete [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md) sign-off

### Search engines (production only)

- Submit sitemap in Google Search Console **after** `VITE_SITE_URL` is final.
- Do not submit the demo Netlify URL to production Search Console.

---

## netlify.toml reference

| Setting | Value |
|---------|--------|
| Build command | `npm run build` |
| Publish directory | `dist` |
| SPA redirect | `/*` → `/index.html` (200) |
| Asset cache | `/assets/*` — 1 year immutable |
| `index.html` | no cache (must-revalidate) |
| `robots.txt` / `sitemap.xml` | 1 hour cache |

---

## Centralized configuration

| File | Purpose |
|------|---------|
| `src/config/env.ts` | `getSiteUrl()`, Supabase env readers |
| `src/lib/supabase/env.ts` | Re-exports (backward compatible) |
| `scripts/generate-seo-files.mjs` | Build-time robots + sitemap |
| `.env.example` | Local / Netlify variable template |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Canonical URLs point to wrong domain | Set `VITE_SITE_URL` in Netlify → redeploy |
| Sitemap still shows old domain | Redeploy; check `dist/sitemap.xml` in deploy log artifact |
| Admin works locally but not on Netlify | Confirm `VITE_SUPABASE_*` set for Production context |
| 404 on refresh | Confirm `netlify.toml` SPA redirect is deployed |
| `robots.txt` 404 | Ensure build completed `generate-seo-files.mjs` step |

---

## Manual tasks (not automated)

- [ ] Create separate Netlify site for demo
- [ ] Set three env vars in Netlify UI
- [ ] Confirm Supabase migrations 001–006 on the target project
- [ ] Confirm admin user `role = admin`
- [ ] Run smoke test on deployed URL
- [ ] Submit sitemap to search engines (**production only**)
