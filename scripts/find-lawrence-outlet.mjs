const API = "https://api.chefgaa.com";

for (let id = 1; id <= 500; id++) {
  const r = await fetch(`${API}/outlet/${id}`, {
    headers: { partner: "1", Accept: "application/json" },
  });
  if (r.status !== 200) continue;
  const j = await r.json();
  const d = j?.data?.data ?? j?.data;
  const city = d?.OutletAddress?.City ?? "";
  if (/lawrence/i.test(city) || /lawrence/i.test(d?.Name ?? "")) {
    const menu = await fetch(`${API}/menu-item`, {
      headers: { outlet: String(id), partner: "1", Accept: "application/json" },
    }).then((r) => r.json());
    const items = menu.reduce((s, c) => s + (c.menuItems?.length ?? 0), 0);
    console.log(`Outlet ${id}: ${d.Name} | ${city} | ${menu.length} cats, ${items} items`);
    console.log(menu.map((c) => c.name).join(" | "));
  }
}
