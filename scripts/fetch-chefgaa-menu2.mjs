const API = "https://api.chefgaa.com";
const PARTNER_ID = 1;

async function tryMenu(outletId, filter, label) {
  const headers = {
    Accept: "application/json",
    outlet: String(outletId),
    partner: String(PARTNER_ID),
  };
  const qs = filter === undefined ? "" : `?filterString=${encodeURIComponent(filter)}`;
  const r = await fetch(`${API}/menu-item${qs}`, { headers });
  const data = await r.json();
  const cats = Array.isArray(data) ? data : data?.data ?? [];
  const items = cats.reduce((s, c) => s + (c.menuItems?.length ?? 0), 0);
  console.log(`${label}: status=${r.status} cats=${cats.length} items=${items}`);
  if (cats.length > 0) {
    console.log(
      "  first cats:",
      cats.slice(0, 5).map((c) => c.name ?? c.categoryName),
    );
    const firstItem = cats[0]?.menuItems?.[0];
    if (firstItem) console.log("  sample:", firstItem.name, firstItem.price);
  }
}

for (const outletId of [70, 71]) {
  console.log(`\nOutlet ${outletId}`);
  await tryMenu(outletId, undefined, "no filter");
  await tryMenu(outletId, "", "empty filter");
  await tryMenu(outletId, null, "null filter");
  await tryMenu(outletId, outletId === 70 ? 106 : 108, "order type id");
  await tryMenu(outletId, "{}", "empty object");
}

// Lawrenceville - try orders.chefgaa partner
const lvPartner = await fetch(`${API}/partner/slug/desi-dhamaka`).then((r) => r.json());
console.log("\nPartner:", lvPartner);

// Try lawrenceville outlet search
for (const id of [72, 73, 74, 75, 80, 90, 100]) {
  try {
    const r = await fetch(`${API}/outlet/${id}`, {
      headers: { Accept: "application/json", partner: "1" },
    });
    if (r.status === 200) {
      const j = await r.json();
      const d = j?.data?.data ?? j?.data;
      if (d?.OutletAddress?.City) {
        console.log(`Outlet ${id}:`, d.Name, d.OutletAddress.City);
      }
    }
  } catch {}
}
