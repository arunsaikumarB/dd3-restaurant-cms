const API = "https://api.chefgaa.com";

async function menuSummary(id) {
  const r = await fetch(`${API}/menu-item`, {
    headers: { outlet: String(id), partner: "1", Accept: "application/json" },
  });
  if (r.status !== 200) return null;
  const menu = await r.json();
  if (!Array.isArray(menu) || menu.length === 0) return null;
  const items = menu.reduce((s, c) => s + (c.menuItems?.length ?? 0), 0);
  return { names: menu.map((c) => c.name), items };
}

for (let id = 1; id <= 200; id++) {
  const m = await menuSummary(id);
  if (!m || m.items < 200) continue;
  const first = m.names[0] ?? "";
  if (
    /^cooker pulav/i.test(first) ||
    /breakfast/i.test(m.names.join(" ")) ||
    (m.names.includes("Cooker Pulav") && m.names.indexOf("Cooker Pulav") === 0)
  ) {
    const o = await fetch(`${API}/outlet/${id}`, {
      headers: { partner: "1", Accept: "application/json" },
    }).then((r) => r.json());
    const d = o?.data?.data ?? o?.data;
    console.log(
      `Outlet ${id}: ${d?.OutletAddress?.City ?? "?"} | ${m.names.length} cats, ${m.items} items`,
    );
    console.log(" ", m.names.join(" | "));
  }
}

// Also try partner IDs 2-10
for (let pid = 2; pid <= 15; pid++) {
  const r = await fetch(`${API}/outlet/partner?partner_id=${pid}`, {
    headers: { Accept: "application/json" },
  });
  if (r.status !== 200) continue;
  const j = await r.json();
  const list = j?.data ?? [];
  if (list.length === 0) continue;
  console.log(`\nPartner ${pid}: ${list.length} outlets`);
  for (const o of list) {
    console.log(`  ${o.ID}: ${o.Name} - ${o.OutletAddress?.City}`);
  }
}
