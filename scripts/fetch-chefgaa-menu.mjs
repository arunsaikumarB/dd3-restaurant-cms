const API = "https://api.chefgaa.com";

async function tryFetch(label, url, headers = {}) {
  try {
    const r = await fetch(url, { headers: { Accept: "application/json", ...headers } });
    const text = await r.text();
    console.log(`\n${label}: ${r.status} len=${text.length}`);
    if (text.startsWith("{") || text.startsWith("[")) {
      const j = JSON.parse(text);
      console.log(JSON.stringify(j, null, 2).slice(0, 2000));
    } else {
      console.log(text.slice(0, 300));
    }
  } catch (e) {
    console.log(`${label} ERR`, e.message);
  }
}

// Try public platform endpoints
await tryFetch("platform slug", `${API}/platform/slug/desi-dhamaka`);
await tryFetch("outlet slug", `${API}/outlet/slug/desi-dhamaka`);
await tryFetch("partner slug", `${API}/partner/slug/desi-dhamaka`);

// Common outlet IDs to probe with order_type filter
for (const filter of ["106", "108", '{"order_type":106}', "order_type=106"]) {
  await tryFetch(`menu-item filter=${filter}`, `${API}/menu-item?filterString=${encodeURIComponent(filter)}`);
}
