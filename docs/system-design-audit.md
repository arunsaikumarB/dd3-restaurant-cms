# System design audit

Audit of this repo against `.cursor/rules/system-design.mdc`. No application code was changed.

**What this project is:** Desi Dhamaka, a multi-location restaurant site. Vite + React SPA, Netlify (static hosting, serverless functions, one edge function), Supabase (Postgres, Auth, Storage). Three public locations, an admin CMS, ChefGaa menu sync, Google reviews sync, contact/catering enquiries, and a Gemini-backed chat concierge.

**How to read the scores:** This is a small marketing site with a few privileged server functions, not a multi-service backend. Netlify and Supabase already provide the load balancer, CDN, TLS, connection pooling, and database backups. Those areas apply only at the edges (headers, abuse limits, restore notes). A dedicated load balancer, Redis, or a third-party queue would be the wrong next step.

`.cursor/rules/` was empty before this change, so the new rule does not conflict with an existing one.

---

## 1. System architecture

**Applies:** Yes. Depth should stay at “SPA + a few functions,” not a controller/service/DAO split for its own sake.

**In place**

- UI does not query the database. Pages and components call `src/services/*` and `src/admin/services/*`. Supabase access lives in those services and in `src/integrations/`.
- Privileged work (service role, SMTP, GA4, Gemini) stays in `netlify/functions/`, not in the browser.
- Config and secrets are environment variables. `.env.example` lists public `VITE_*` keys and server-only keys (`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `SMTP_*`, `GA4_*`, `SERPER_API_KEY`).
- Admin auth is Supabase sessions (`src/lib/supabase/client.ts`, `src/lib/supabase/middleware.ts`), not process memory.
- Public request checks are hand-written, not a schema library: `netlify/functions/submit-enquiry.mts` (`validateBody`), plus `src/utils/validation/*` for admin forms.

**Gaps**

- There is no `/api/v1` (or any versioned HTTP API). Functions are `/.netlify/functions/<name>`. Fine for an internal site; say so when adding a public API.
- `docs/DEPLOYMENT.md` says never put `SUPABASE_SERVICE_ROLE_KEY` on Netlify. Functions require it as a server-only variable (`netlify.toml` comments). The two docs disagree.
- `semantic-knowledge-index` uses the service role with no caller check (see Reliability & security).

**Fixes**

- **High:** Require an admin token on `netlify/functions/semantic-knowledge-index.mts` before it uses the service role. Same pattern as `chefgaa-sync.mts` (`verifyAdminAccessToken`).
- **Low:** Align `docs/DEPLOYMENT.md` with `netlify.toml`: service role is allowed on Netlify only as a function secret, never as a `VITE_` variable.
- **Low:** Skip API versioning until a third party calls these functions.

## 2. Load balancing

**Applies:** Only as a platform concern. Netlify terminates TLS and spreads static files and functions. There is no app-owned load balancer, and there should not be one.

**In place**

- Stateless functions and a stateless SPA. Sessions are Supabase tokens, not sticky cookies.
- No in-process session store.

**Gaps**

- No `/health` or `/ready` route. For this host that is a small gap: use an uptime check against the public homepage and one function, not a new process supervisor.
- No SIGTERM drain. Netlify freezes the isolate; a shutdown hook would not run reliably.
- No `X-Forwarded-*` handling in app code. Netlify sets the public URL; the app does not read proxy headers.

**Fixes**

- **Low:** If you add external uptime monitoring, hit `/` and `POST /.netlify/functions/submit-enquiry` with a bad body (expect 400). Do not add sticky sessions or a custom load balancer.
- **Low:** Leave graceful shutdown and proxy-header trust as “not applicable” unless you move off serverless.

## 3. Caching

**Applies:** Yes, for HTTP caching of static files. A shared Redis cache does not.

**In place**

- Hashed build assets: `netlify.toml` sets `Cache-Control: public, max-age=31536000, immutable` on `/assets/*`. Vite fingerprints those files.
- HTML shell revalidates (`max-age=0, must-revalidate` on `/index.html`). `robots.txt`, `sitemap.xml`, and `llms.txt` cache for one hour.
- Supabase Storage uploads set a one-year cache (`src/constants/storage.ts`, `STORAGE_CACHE_CONTROL`).
- Admin GA4 responses are cached in memory for 5 minutes inside `netlify/functions/analytics-ga4.mts` (`CACHE_TTL_MS`). The handler checks the admin token before serving the cache.
- Browser semantic cache with a 45s TTL: `src/services/rag/cache.ts`. Keyed by location and query, not by user. It holds public menu knowledge.

**Gaps**

- Files in `public/` (hero frames, WebP, video) are not fingerprinted and have no long-cache header. Only `/assets/*` does. Repeat visitors re-download large sequences.
- `vercel.json` has rewrites and no cache headers. Production is Netlify (`netlify.toml`). The Vercel file is a stale second config.
- The GA4 `Map` is per isolate, uncapped, and not shared. Safe because it is admin-only and short-lived. It is not a shared cache of user data.
- Chat responses correctly use `Cache-Control: no-cache` (`ai-concierge.mts`). Enquiry and semantic JSON responses set no cache header; they should be `no-store`.

**Fixes**

- **Medium:** Add cache headers for immutable media under `public/` (frames, posters) or content-hash those filenames. Keep HTML short-cached.
- **Low:** Set `Cache-Control: no-store` on enquiry, semantic, and other JSON function responses.
- **Low:** Delete or clearly mark `vercel.json` as unused so cache policy has one source.

## 4. Database design

**Applies:** Yes. Supabase Postgres is the system of record.

**In place**

- Schema changes are SQL files in `supabase/migrations/` (001 through 037), including RLS (`002_rls_policies.sql`, `006_production_hardening.sql`).
- Tables use UUID keys, `created_at` / `updated_at`, and `set_updated_at()` from `001_initial_schema.sql`.
- Indexes follow location and list filters: menu, offers, reservations, gallery, enquiries, analytics, semantic chunks (including a vector index in `033_semantic_knowledge.sql`).
- Foreign keys and checks exist (reservation status, user role). Public writes are constrained: reservations must be `pending`, reviews must be unapproved (`006_production_hardening.sql`).
- ChefGaa removals are soft: `chefgaa_removed_at` on menu rows (`019_chefgaa_data_integrity.sql`), plus archive tables.
- List endpoints that grow are mostly scoped by `location_id`. Semantic search caps matches at 10 (`semantic-knowledge-search.mts`).

**Gaps**

- Admin lists load full tables: `fetchAllReservations` and `fetchReservations` in `src/services/reservations.ts` (`.select("*")` with no limit). Same pattern in `src/services/reviews.ts` and `src/services/offers.ts`. Fine at current volume; it will not stay fine.
- No cursor pagination anywhere.
- Soft delete is only for ChefGaa catalog rows. CMS deletes of offers, gallery, and enquiries are hard deletes.
- Migrations are applied by hand in the SQL editor (`docs/SUPABASE.md`). Nothing in git runs them in CI.

**Fixes**

- **Medium:** Paginate reservations and enquiries (the tables that grow with guests). Filter by location and date; add a limit. Do this before adding a fourth location or a busy season.
- **Low:** Keep hard deletes for CMS content. Add soft delete only if you need an audit trail for bookings or enquiries.
- **Low:** Record which migration was last applied (Supabase CLI migration history) so production and the repo cannot drift.

## 5. Message queues

**Applies:** Partly. Slow third-party work already exists (ChefGaa, Google reviews, enquiry email, embeddings). A standalone broker (SQS, BullMQ, RabbitMQ) does not earn its keep at this size.

**In place**

- ChefGaa sync is off the click path when busy: Postgres table `chefgaa_sync_queue`, lock, and “already running” handling (`src/integrations/chefgaa/automation/queue.ts`, `orchestrator.ts`). Scheduled every 15 minutes (`netlify/functions/chefgaa-sync-scheduled.mts`).
- Google reviews run weekly on a Netlify schedule (`netlify/functions/google-reviews-sync.mts`), not on page view.
- Enquiry email failure is logged and does not roll back the saved row (`submit-enquiry.mts` catches SMTP errors after insert).

**Gaps**

- Enquiry email still runs inside the HTTP request (nodemailer, no timeout). A slow SMTP server holds the function open.
- The ChefGaa queue has a `retry` trigger value but no exponential backoff and no dead-letter status. A poison job can sit in `pending` or fail in a log row.
- `semantic-knowledge-index` embeds and writes in the request. Large documents can hit the function time limit.
- Job handlers are not clearly idempotent. Re-running a sync depends on ChefGaa upserts, not an idempotency key.

**Fixes**

- **Medium:** Return from `submit-enquiry` as soon as the row is stored. Send mail in a scheduled function or a second invocation. Cap SMTP with a timeout.
- **Low:** On ChefGaa sync failure, increment an attempt count and stop after a small limit. Alert from the existing `chefgaa_sync_notifications` table. A separate broker is not justified.
- **Low:** Keep semantic indexing synchronous until documents are large enough to time out; then queue it the same way as ChefGaa.

## 6. CDN

**Applies:** Yes. Netlify’s CDN is the CDN. You do not need a second one.

**In place**

- Static JS/CSS are fingerprinted and long-cached (`netlify.toml`, Vite `dist/assets`).
- Netlify serves brotli/gzip and HTTP/2 on its CDN by default.
- Many public images are WebP (`public/`, `scripts/convert-public-images-to-webp.mjs`). New admin uploads are resized to 1920px and converted to WebP (`src/utils/imageOptimize.ts`).
- `ResponsiveImage` lazy-loads below the fold (`src/components/ui/ResponsiveImage.tsx`). Hero poster is preloaded in `index.html`.
- Guest uploads go to Supabase Storage buckets (`supabase/migrations/003_storage_buckets.sql`, `src/services/storage/upload.ts`), not the app server disk. Size caps: 10 MB images, 8 MB hero video (`src/constants/storage.ts`).

**Gaps**

- Scroll-sequence frames are many full-size WebP files in `public/`. They are not responsive `srcset` variants and are not long-cached (see Caching).
- Google Fonts load from `fonts.googleapis.com` (`index.html`), an extra origin on every page.
- `ResponsiveImage` only emits `sizes` when the caller passes `srcSet`. Most callers pass a single URL, so the browser cannot pick a smaller file.
- Hero video is capped at 8 MB but is not an adaptive stream.

**Fixes**

- **Medium:** Long-cache the frame directories, and lazy-load frames that are off-screen in the sequence.
- **Low:** Self-host Inter and Playfair, or subset them, so the first paint does not wait on Google Fonts.
- **Low:** Leave image CDN as Netlify + Supabase. Do not add CloudFront unless you leave Netlify.

## 7. Scalability

**Applies:** Yes, in the “do not fall over from one bot or one big menu” sense. Horizontal scaling of the app is already how Netlify functions work. Expected load is a restaurant site: bursts around lunch and dinner, not a high-QPS API.

**In place**

- App instances are stateless. Shared state is Supabase.
- Upload size limits exist for admin media.
- Semantic search clamps `matchCount` to 1–10.
- AI history sent to Gemini is sliced to the last 12 turns (`ai-concierge.mts`).
- ChefGaa scheduled sync skips or queues when a lock is held, so overlapping cron runs do not stampede the POS API.

**Gaps**

- No rate limit on public functions: `submit-enquiry`, `ai-concierge`, `semantic-knowledge-search`. All of them can spend money (SMTP, Gemini) or fill `contact_enquiries`.
- No request-body size cap on those functions. `ai-concierge` forwards `history` and `cmsContext` to the model.
- Outbound `fetch` to Gemini, OpenAI, and Anthropic in `ai-concierge.mts` has no `AbortSignal` timeout. Supabase and SMTP calls have none either.
- First bottleneck if traffic grows: Gemini quota and Netlify function duration on the concierge, then unbounded admin selects, then frame-image weight on the homepage. The database will not be first.

**Fixes**

- **High:** Rate-limit `ai-concierge`, `submit-enquiry`, and `semantic-knowledge-search` (Netlify traffic rules or a small counter in Supabase). Reject oversized bodies.
- **High:** Add a timeout (about 20–25s) on every outbound provider call in `ai-concierge.mts`.
- **Medium:** Paginate growing admin lists (same fix as Database design).

## 8. Reliability & security

**Applies:** Yes. This is the largest gap relative to the standard.

**In place**

- RLS on public tables; anon key is what the browser uses. Service role stays in functions and scripts.
- Signup cannot self-assign `admin`. `006_production_hardening.sql` forces new profiles to `staff`.
- Password hashing and session cookies are Supabase Auth (not app code). Admin routes use `ProtectedRoute`.
- `chefgaa-sync` and `analytics-ga4` check a Bearer token with `verifyAdminAccessToken`.
- Enquiry input is validated before insert. Queries go through the Supabase client, not string-built SQL.
- React error boundary reloads once on a stale chunk and otherwise shows a plain message (`src/components/system/AppErrorBoundary.tsx`). It does not print a stack in the UI.
- HTTPS is Netlify’s default. Launch checklist covers the certificate (`docs/LAUNCH_CHECKLIST.md`).
- AI server logs omit keys, prompts, and PII (`netlify/functions/lib/aiLogger.ts`).

**Gaps**

- `netlify/functions/semantic-knowledge-index.mts` has no auth and uses the service role. Anyone who can POST can reindex documents and call Gemini.
- `semantic-knowledge-search.mts` is public (the chat box needs it) but answers with `Access-Control-Allow-Origin: *` and the service role. A random site can spend the embedding quota.
- `submit-enquiry` returns `error.message` to the client, including raw Supabase errors.
- `netlify.toml` sets cache headers only. No CSP, HSTS, `X-Content-Type-Options`, or frame protection.
- No automated tests and no CI. `package.json` has no `test` script. Auth, enquiry insert, and sync are unguarded against regressions.
- No circuit breaker around ChefGaa or Gemini. A down POS API fails the scheduled sync; that is acceptable if failures are visible (see Monitoring).
- Database backups are whatever the Supabase plan does. The repo has no restore steps.

**Fixes**

- **High:** Authenticate `semantic-knowledge-index` as an admin. Keep search public, but drop `Access-Control-Allow-Origin: *` (same-origin is enough) and rate-limit it.
- **High:** Add security headers on `/*` in `netlify.toml` (CSP that allows Supabase, Google Fonts, and GA; `X-Content-Type-Options: nosniff`; `X-Frame-Options` or `frame-ancestors`; HSTS).
- **High:** Add a CI workflow that typechecks (`npm run build` already runs `tsc -b`) and a few tests for enquiry validation and admin-token rejection.
- **Medium:** Return a generic message from `submit-enquiry` on 500. Log the real error server-side.
- **Low:** Write a half-page restore note: Supabase dashboard backup, which env vars to restore, who runs it. Do not build a custom backup job.

## 9. Monitoring

**Applies:** Yes, lightly. You need to know when the site, chat, and menu sync break. You do not need a metrics platform on day one.

**In place**

- Structured JSON logs for the concierge (`aiLogger.ts`: event, timestamp, model, latency, token usage).
- First-party analytics in `analytics_events` plus an admin GA4 proxy (`netlify/functions/analytics-ga4.mts`, `src/services/analytics.ts`).
- ChefGaa writes sync runs, notifications, and `chefgaa_api_health_checks` (migration `018_chefgaa_automation.sql`).
- AI errors can be stored in `ai_error_logs` (migration `032_ai_management.sql`).
- `scripts/ga4-diagnostics.mjs` checks GA credentials without printing secrets.

**Gaps**

- Logs are `console.log` / `console.error`. No request id, no shared logger, no redaction helper outside the concierge.
- No Sentry (or similar) on the SPA or the functions. The error boundary only `console.error`s.
- No uptime check and no alert on sync failure, enquiry 500s, or DLQ-style growth.
- No Core Web Vitals (LCP, CLS, INP). The homepage image sequence is the likely LCP risk.
- No dependency update bot. `package.json` has no audit script.

**Fixes**

- **Medium:** Add a frontend and function error tracker. Alert on ChefGaa sync failure and on enquiry 500s. An uptime ping on the homepage is enough.
- **Medium:** Record LCP/CLS/INP (GA4 enhanced measurement or a small `web-vitals` beacon). Use it to decide whether to shrink the hero sequence.
- **Low:** Put a request id on function logs. Dependabot or `npm audit` in CI once CI exists.

---

## Priority order

Do these first. The rest of the lists above can wait.

| Priority | Fix | Why |
|----------|-----|-----|
| High | Admin-only `semantic-knowledge-index`; same-origin + rate limit on semantic search | Service role and Gemini spend are exposed |
| High | Rate limit and body cap on `ai-concierge` and `submit-enquiry`; timeouts on model calls | Public endpoints can be abused or can hang |
| High | Security headers in `netlify.toml` | Missing CSP, HSTS, nosniff, frame protection |
| High | CI plus a few tests (enquiry validation, unauthorized sync) | Nothing runs on pull requests today |
| Medium | Paginate reservations and enquiries | Only lists that grow with guests |
| Medium | Send enquiry email off the request; cache public media longer | Slow SMTP and heavy uncached frames |
| Medium | Error tracker, sync/enquiry alerts, Core Web Vitals | Failures are only visible in Netlify logs |
| Low | Health URLs, API versions, a real broker, soft deletes, restore runbook | Platform already covers these, or volume is too small |
