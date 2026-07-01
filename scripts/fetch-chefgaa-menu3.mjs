const API = "https://api.chefgaa.com";

async function sampleMenu(outletId, label) {
  const r = await fetch(`${API}/menu-item`, {
    headers: {
      Accept: "application/json",
      outlet: String(outletId),
      partner: "1",
    },
  });
  const cats = await r.json();
  console.log(`\n=== ${label} (outlet ${outletId}) ===`);
  console.log("Categories:", cats.map((c) => `${c.name} (${c.menuItems?.length ?? 0})`).join("\n  "));

  const checks = [
    "Garlic Naan",
    "Plain Naan",
    "Butter Chicken",
    "Chicken Dum Biryani",
    "Midnight Boneless Chicken Biryani",
    "Veg Sweet Corn Soup",
    "Paneer Majestic",
    "Goat Haleem",
    "Mutton Cooker Pulav",
    "Chicken Cooker Pulav",
  ];
  for (const name of checks) {
    for (const cat of cats) {
      const item = cat.menuItems?.find((i) => i.name === name);
      if (item) {
        console.log(`  ${name}:`, JSON.stringify({
          price: item.price,
          sellingPrice: item.sellingPrice,
          basePrice: item.basePrice,
          amount: item.amount,
          Price: item.Price,
        }));
        break;
      }
    }
  }
}

await sampleMenu(70, "Outlet 70 - SP address");
await sampleMenu(71, "Outlet 71 - OT address");

// Lawrenceville - download orders.chefgaa JS
const html = await fetch("https://orders.chefgaa.com/store/desi-dhamaka/menu").then((r) => r.text());
const m = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
if (m) {
  const js = await fetch("https://orders.chefgaa.com" + m[1]).then((r) => r.text());
  const bp = js.match(/bp="([^"]+)"/)?.[1];
  console.log("\norders.chefgaa API:", bp);
}

// Scan more outlet IDs for Lawrenceville
for (const id of Array.from({ length: 30 }, (_, i) => 60 + i)) {
  const r = await fetch(`${API}/outlet/${id}`, {
    headers: { Accept: "application/json", partner: "1" },
  });
  if (r.status !== 200) continue;
  const j = await r.json();
  const d = j?.data?.data ?? j?.data;
  if (!d?.OutletAddress?.City) continue;
  const city = d.OutletAddress.City;
  if (/lawrence|plainfield|edison/i.test(city) || d.Name?.includes("DHAMAKA")) {
    const mr = await fetch(`${API}/menu-item`, {
      headers: { outlet: String(id), partner: "1", Accept: "application/json" },
    });
    const menu = await mr.json();
    const items = Array.isArray(menu)
      ? menu.reduce((s, c) => s + (c.menuItems?.length ?? 0), 0)
      : 0;
    console.log(`Outlet ${id}: ${city}, ${menu?.length ?? 0} cats, ${items} items`);
    if (menu?.[0]?.name) console.log("  first cat:", menu[0].name);
  }
}
