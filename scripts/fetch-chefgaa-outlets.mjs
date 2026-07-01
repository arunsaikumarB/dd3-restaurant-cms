const API = "https://api.chefgaa.com";
const PARTNER_ID = 1;

async function get(path, headers = {}) {
  const r = await fetch(`${API}${path}`, {
    headers: { Accept: "application/json", ...headers },
  });
  return r.json();
}

const outlets = await get(`/outlet/partner?partner_id=${PARTNER_ID}`);
console.log("Outlets:", JSON.stringify(outlets, null, 2).slice(0, 4000));

const list = outlets?.data ?? [];
for (const outlet of list) {
  const id = outlet.id ?? outlet.ID;
  console.log(`\n=== Outlet ${id}: ${outlet.Name ?? outlet.name} ===`);
  const detail = await get(`/outlet/${id}`);
  const bc = detail?.data?.data ?? detail?.data ?? detail;
  const orderTypes = bc?.OutletOrderTypes ?? [];
  console.log(
    "Order types:",
    orderTypes.map((ot) => ({
      ID: ot.ID ?? ot.id,
      Type: ot.Type ?? ot.type,
      Status: ot.Status ?? ot.status,
    })),
  );

  for (const ot of orderTypes) {
    const otId = ot.ID ?? ot.id;
    const menu = await get(`/menu-item?filterString=${otId}`, {
      outlet: String(id),
      partner: String(PARTNER_ID),
    });
    const cats = Array.isArray(menu) ? menu : menu?.data ?? [];
    const itemCount = cats.reduce(
      (sum, c) => sum + (c.menuItems?.length ?? 0),
      0,
    );
    console.log(
      `  order_type ${otId} (${ot.Type}): ${cats.length} categories, ${itemCount} items`,
    );
    if (cats.length) {
      console.log(
        "  categories:",
        cats.map((c) => c.name ?? c.categoryName).join(" | "),
      );
    }
  }
}
