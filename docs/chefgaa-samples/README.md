# ChefGaa API samples

Raw JSON captured during API discovery (Phase 1). Used as fixtures for normalizer development.

## Regenerate legacy samples

```bash
node -e "
const fs = require('fs');
const path = require('path');
const out = path.join('docs', 'chefgaa-samples');
const API = 'https://api.chefgaa.com';
async function fetchMenu(outletId) {
  const r = await fetch(API + '/menu-item', {
    headers: { Accept: 'application/json', outlet: String(outletId), partner: '1' },
  });
  return { status: r.status, body: await r.json() };
}
for (const id of [70, 71]) {
  const menu = await fetchMenu(id);
  fs.writeFileSync(path.join(out, 'legacy-outlet-' + id + '-menu-full.json'), JSON.stringify(menu.body, null, 2));
}
"
```

## Security

- **Do not commit** `legacy-outlet-*-meta.json` with live `PaymentPrivateKey` values.
- The legacy `GET /outlet/{id}` endpoint returns Stripe secrets. Never use in sync jobs.

## Lawrenceville V2

V2 samples require valid `tenant-id` and `store-id`. Update `scripts/fetch-lv-menu.mjs` and re-run after obtaining credentials from ChefGaa admin.
