const API = "https://api.chefgaa.com";

async function getMenu(outletId) {
  const r = await fetch(`${API}/menu-item`, {
    headers: { outlet: String(outletId), partner: "1", Accept: "application/json" },
  });
  return r.json();
}

function findItem(menu, name) {
  for (const cat of menu) {
    const item = cat.menuItems?.find((i) => i.name === name);
    if (item) return { cat: cat.name, item };
  }
  return null;
}

for (const [id, label] of [
  [68, "outlet 68"],
  [70, "outlet 70 OT?"],
  [71, "outlet 71 SP?"],
]) {
  const menu = await getMenu(id);
  console.log(`\n=== ${label}: ${menu.length} cats ===`);
  console.log(menu.map((c) => c.name).join(" | "));
  const garlic = findItem(menu, "Garlic Naan");
  if (garlic) {
    const keys = Object.keys(garlic.item).filter((k) =>
      /price|amount|cost/i.test(k),
    );
    console.log("Garlic Naan keys:", keys);
    console.log("Garlic Naan sample:", JSON.stringify(garlic.item, null, 2).slice(0, 800));
  }
}
