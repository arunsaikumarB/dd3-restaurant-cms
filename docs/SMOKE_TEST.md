# Pre-Deploy Smoke Test

Run this checklist on your **staging or production** URL with Supabase configured.  
Admin account: `tomparkerofficial02@gmail.com` must have `role = admin`.

**Note:** Public pages cache Supabase data for up to **60 seconds**. After an admin save, hard-refresh or wait before checking the public site.

---

## Prerequisites

- [ ] Netlify env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- [ ] Supabase migrations **001–006** applied
- [ ] SQL check:

```sql
SELECT id, email, role FROM public.users WHERE email = 'tomparkerofficial02@gmail.com';
-- Expect: role = admin
```

---

## Authentication

### Admin can log in
1. Open `/admin/login`
2. Sign in with `tomparkerofficial02@gmail.com`
3. **Expect:** Redirect to `/admin/dashboard`

### Staff cannot access /admin
1. Create or use a user with `role = staff` in `public.users`
2. Sign in at `/admin/login`
3. **Expect:** Redirect to `/admin/unauthorized` (not dashboard)

### Unauthorized page appears correctly
1. While signed in as staff, visit `/admin/dashboard` directly
2. **Expect:** `/admin/unauthorized` with “Access denied” and **Sign out** button

### Logout works
1. Sign in as admin
2. Click **Sign out** in the admin sidebar
3. **Expect:** `/admin/login`; visiting `/admin/dashboard` redirects to login

### Refreshing keeps session
1. Sign in as admin on `/admin/dashboard`
2. Press **F5** (hard refresh)
3. **Expect:** Still on dashboard (brief loader, no redirect to login)

---

## Homepage

### Hero updates after admin changes
1. Admin → **Homepage** → change **Hero title** to `SMOKE TEST HERO`
2. Save
3. Open `/` → wait up to 60s or hard refresh
4. **Expect:** New hero title visible

### About section updates
1. Admin → **Homepage** → change **About description**
2. Save → check `/` about section
3. **Expect:** Updated copy

### Logo updates
1. Admin → **Settings** → upload/change **Logo**
2. Save → check `/` (navbar + hero logo + footer logo)
3. **Expect:** New logo on all three

### Contact information updates
1. Admin → **Settings** → change **Phone** to a test number (e.g. `(555) 000-1111`)
2. Save
3. Check `/` experience cards, **Footer**, `/contact`, `/reservation` contact cards
4. **Expect:** New phone everywhere (after cache refresh)

---

## Menu

### Create category
1. Admin → **Categories** → **Add Category**
2. Name: `Smoke Test Category` → Save
3. **Expect:** Appears in admin list

### Create menu item
1. Admin → **Menu** → **Add Menu Item**
2. Assign to `Smoke Test Category`, set name + price → Save
3. **Expect:** Item in admin table

### Edit price
1. Edit the item → change price → Save
2. **Expect:** Updated price in admin

### Hide item
1. Set item status to **Inactive** (or unavailable)
2. **Expect:** Hidden from public menu

### Verify website updates
1. Open `/menu` (wait up to 60s after saves)
2. **Expect:** New category/item visible when active; hidden when inactive

---

## Offers

### Current offer appears
1. Admin → **Offers** → create offer with **Active** on and dates including today
2. Open `/offers`
3. **Expect:** Offer visible

### Expired offer disappears
1. Set offer **end date** in the past OR toggle **Inactive**
2. Refresh `/offers` (wait up to 60s)
3. **Expect:** Offer no longer listed

---

## Gallery

### Upload image
1. Admin → **Gallery** → upload image with caption
2. **Expect:** Image in admin grid

### Hide image
1. Toggle **Visible** off for the image
2. **Expect:** Hidden on public site

### Verify website updates
1. Open `/gallery` (wait up to 60s)
2. **Expect:** Visible images only

---

## Reviews

### Approve review
1. Admin → **Reviews** → approve a pending review
2. Open `/testimonials`
3. **Expect:** Review appears (after cache refresh)

### Unapprove review
1. Toggle approved off in admin
2. **Expect:** Review removed from public page

### Featured review appears first
1. Approve two reviews; mark one **Featured**
2. Check `/testimonials` carousel/grid
3. **Expect:** Featured review listed first

---

## Reservations

### Create reservation (public form)
1. Open `/reservation`
2. Complete booking form → submit
3. **Expect:** Success message
4. Admin → **Reservations**
5. **Expect:** New row with status **Pending**

### Create reservation (admin)
1. Admin → **Reservations** → **Add Reservation**
2. Fill form → Save
3. **Expect:** Row in table

### Change status
1. Open reservation → change status to **Confirmed** → Save
2. **Expect:** Status chip updates

### Delete reservation
1. Delete a test reservation → confirm
2. **Expect:** Row removed from admin list

---

## Sign-off

| Area | Pass | Fail | Notes |
|------|------|------|-------|
| Authentication | | | |
| Homepage | | | |
| Menu | | | |
| Offers | | | |
| Gallery | | | |
| Reviews | | | |
| Reservations | | | |

**Deploy when all rows pass.**
