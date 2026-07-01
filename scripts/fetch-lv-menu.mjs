const BFF = "https://chf2-customer-api.chefgaa.com";
const TENANT_ID = "bc3e7543-c8d6-4d77-bd87-d30cda29ca51";
const STORE_ID = "b8e4c76f-0534-47e8-952f-495e60959158";

const headers = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "x-platform": "web",
  "tenant-id": TENANT_ID,
  "store-id": STORE_ID,
};

const platform = await fetch(
  `${BFF}/api/v1/public/menu/platforms/slug/desi-dhamaka`,
  { headers },
).then((r) => r.json());

console.log("Platform:", JSON.stringify(platform, null, 2).slice(0, 1500));

const platformId = platform?.data?.id;
if (!platformId) {
  // try store-specific slug
  const platform2 = await fetch(
    `${BFF}/api/v1/public/menu/platforms/slug/lawrenceville-dd-kitchen-llc`,
    { headers },
  ).then((r) => r.json());
  console.log("\nAlt platform:", JSON.stringify(platform2, null, 2).slice(0, 1500));
}

const pid = platform?.data?.id ?? platform?.data?.data?.id;
if (pid) {
  const menu = await fetch(`${BFF}/api/v1/public/menu/platforms/${pid}`, {
    headers,
  }).then((r) => r.json());

  const data = menu?.data?.data ?? menu?.data;
  console.log("\nMenu keys:", Object.keys(data ?? {}));

  const categories = data?.categories ?? [];
  const items = categories.reduce(
    (s, c) => s + (c.items?.length ?? c.menuItems?.length ?? 0),
    0,
  );
  console.log(`Categories: ${categories.length}, items: ${items}`);
  console.log(categories.map((c) => `${c.name} (${(c.items ?? c.menuItems ?? []).length})`).join("\n"));

  for (const name of ["Mutton Cooker Pulav", "Garlic Naan", "Butter Chicken", "Chicken Dum Biryani"]) {
    for (const cat of categories) {
      const list = cat.items ?? cat.menuItems ?? [];
      const item = list.find((i) => i.name === name);
      if (item) {
        console.log(`${name}: $${item.price ?? item.selling_price ?? item.sellingPrice}`);
        break;
      }
    }
  }
}
