# Supabase Backend — Desi Dhamaka

Backend foundation for the admin dashboard and public website.  
**Stack:** Vite + React Router (frontend) · Supabase (PostgreSQL, Auth, Storage)

---

## Environment variables

Create `.env.local` in the project root (copy from `.env.example`):

| Variable | Where to find it | Used by |
|----------|------------------|---------|
| `VITE_SUPABASE_URL` | Supabase → **Settings → API → Project URL** | Browser client |
| `VITE_SUPABASE_ANON_KEY` | Supabase → **Settings → API → anon public** | Browser client |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → **Settings → API → service_role** | Server scripts only |

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are also supported as aliases.

**Never** put `SUPABASE_SERVICE_ROLE_KEY` in frontend code or Netlify “public” env vars.

---

## Folder structure

```
src/
├── lib/supabase/
│   ├── client.ts       # Browser Supabase client
│   ├── server.ts       # Service-role client (Node/scripts only)
│   ├── middleware.ts   # Auth helpers + route-guard utilities
│   └── env.ts          # Env variable readers
├── hooks/
│   └── useAuth.ts      # AuthProvider + useAuth hook
├── types/
│   └── database.ts     # TypeScript interfaces for all tables
├── services/
│   └── storage/
│       └── upload.ts   # Reusable storage upload helpers
└── admin/
    └── components/
        ├── ProtectedRoute.tsx   # Redirects unauthenticated users
        └── GuestRoute.tsx       # Redirects logged-in users from login

supabase/
└── migrations/
    ├── 001_initial_schema.sql
    ├── 002_rls_policies.sql
    └── 003_storage_buckets.sql
```

---

## Authentication flow

1. User opens `/admin/login` and submits email + password.
2. `signInWithPassword` runs via `lib/supabase/middleware.ts`.
3. `AuthProvider` listens to `onAuthStateChange` and stores the session.
4. `ProtectedRoute` wraps all `/admin/*` layout routes (except login).
5. Unauthenticated access → redirect to `/admin/login`.
6. **Sign Out** in the sidebar calls `supabase.auth.signOut()`.

When Supabase env vars are **missing**, auth is bypassed so existing mock-data UI still works locally.

---

## Database schema

Run migrations in order in the **Supabase SQL Editor** (or via Supabase CLI):

1. `001_initial_schema.sql` — tables, indexes, triggers
2. `002_rls_policies.sql` — Row Level Security
3. `003_storage_buckets.sql` — storage buckets + policies

### Tables

| Table | Purpose |
|-------|---------|
| `users` | Admin profiles linked to `auth.users` |
| `restaurant_settings` | Restaurant name, contact, hours, social |
| `homepage_content` | Hero, CTA, about section |
| `menu_categories` | Menu categories |
| `menu_items` | Dishes (FK → `menu_categories`) |
| `offers` | Promotions |
| `gallery` | Image gallery |
| `reservations` | Table bookings |
| `reviews` | Customer reviews |

All tables use UUID primary keys and `created_at` / `updated_at` timestamps.

### Create first admin user

1. Supabase Dashboard → **Authentication → Users → Add user**
2. Set email + password
3. A row is auto-created in `public.users` via `handle_new_user` trigger

---

## Storage buckets

| Bucket | Purpose |
|--------|---------|
| `menu-images` | Menu item photos |
| `gallery-images` | Gallery uploads |
| `offer-images` | Offer banners |
| `homepage-images` | Hero / homepage media |
| `restaurant-assets` | Logo, favicon |

Upload helpers: `src/services/storage/upload.ts`

```ts
import { uploadFile } from "@/services/storage/upload";

const { publicUrl } = await uploadFile({
  bucket: "menu-images",
  file: selectedFile,
});
```

---

## Row Level Security

| Role | Permissions |
|------|-------------|
| **Anonymous** | Read public content (active menu, approved reviews, etc.); insert reservations & reviews |
| **Authenticated admin** | Full CRUD on all admin tables and storage |

Admin check: `public.is_admin()` — user exists in `users` with role `admin` or `staff`.

---

## Adding a new table

1. Add SQL to a new file: `supabase/migrations/004_your_table.sql`
2. Enable RLS and add policies (public read + admin write)
3. Add TypeScript interfaces to `src/types/database.ts`
4. Extend the `Database` generic under `public.Tables`
5. Run the migration in Supabase

---

## Deploy

### Netlify

Add environment variables in **Site settings → Environment variables**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Do **not** add the service role key to Netlify unless running server-side scripts.

Redeploy after setting env vars:

```bash
npx netlify-cli deploy --build --prod
```

### Local development

```bash
cp .env.example .env.local
# Fill in Supabase URL and anon key
npm run dev
```

---

## Next phase (not implemented yet)

- Wire admin pages to Supabase CRUD
- Replace mock data on the public site
- Real-time subscriptions for reservations/reviews
