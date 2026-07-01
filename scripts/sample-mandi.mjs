const API = "https://api.chefgaa.com";

const menu = await fetch(`${API}/menu-item`, {
  headers: { outlet: "71", partner: "1", Accept: "application/json" },
}).then((r) => r.json());

const mandi = menu.find((c) => /mandi/i.test(c.name));
console.log("Mandi category:", mandi?.name, mandi?.menuItems?.length);
console.log("Sample items:", mandi?.menuItems?.slice(0, 8).map((i) => `${i.name} $${i.selling_price}`));

const midnight = menu.find((c) => /midnight/i.test(c.name));
console.log("\nMidnight:", midnight?.menuItems?.map((i) => `${i.name} $${i.selling_price}`));
