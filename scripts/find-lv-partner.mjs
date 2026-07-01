const API = "https://api.chefgaa.com";

// Try menu fetch with different partner IDs on likely outlets
for (const partnerId of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
  for (const outletId of [68, 69, 72, 73, 74, 75, 76, 77, 78, 79, 80]) {
    const r = await fetch(`${API}/menu-item`, {
      headers: {
        outlet: String(outletId),
        partner: String(partnerId),
        Accept: "application/json",
      },
    });
    if (r.status !== 200) continue;
    const menu = await r.json();
    if (!Array.isArray(menu) || menu.length < 15) continue;
    const items = menu.reduce((s, c) => s + (c.menuItems?.length ?? 0), 0);
    if (items < 250) continue;
    const first = menu[0]?.name ?? "";
    console.log(
      `partner=${partnerId} outlet=${outletId}: ${menu.length} cats, ${items} items, first=${first}`,
    );
    if (/cooker pulav|breakfast/i.test(menu.map((c) => c.name).join(" "))) {
      console.log("  CATS:", menu.map((c) => c.name).join(" | "));
    }
  }
}
