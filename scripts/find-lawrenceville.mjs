const API = "https://api.chefgaa.com";

async function getOutlet(id) {
  const r = await fetch(`${API}/outlet/${id}`, {
    headers: { partner: "1", Accept: "application/json" },
  });
  if (r.status !== 200) return null;
  const j = await r.json();
  return j?.data?.data ?? j?.data;
}

async function menuSummary(id) {
  const r = await fetch(`${API}/menu-item`, {
    headers: { outlet: String(id), partner: "1", Accept: "application/json" },
  });
  const menu = await r.json();
  if (!Array.isArray(menu)) return null;
  const items = menu.reduce((s, c) => s + (c.menuItems?.length ?? 0), 0);
  return { cats: menu.length, items, names: menu.map((c) => c.name) };
}

for (let id = 1; id <= 120; id++) {
  const o = await getOutlet(id);
  if (!o?.OutletAddress?.City) continue;
  const city = o.OutletAddress.City;
  const state = o.OutletAddress.State;
  if (!/NJ|lawrence|plainfield|edison|dhamaka/i.test(`${city} ${o.Name}`)) continue;
  const m = await menuSummary(id);
  if (!m || m.items < 50) continue;
  console.log(
    `${id}: ${o.Name} | ${city}, ${state} | ${m.cats} cats, ${m.items} items`,
  );
  console.log("  ", m.names.slice(0, 8).join(" | "));
  if (m.names.some((n) => /cooker pulav|breakfast/i.test(n))) {
    console.log("  ** LV candidate **", m.names.join(" | "));
  }
}
