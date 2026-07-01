const API = "https://api.chefgaa.com";

const menu = await fetch(`${API}/menu-item`, {
  headers: { outlet: "69", partner: "1", Accept: "application/json" },
}).then((r) => r.json());

console.log("Categories:", menu.map((c) => `${c.name} (${c.menuItems?.length})`).join("\n"));

const o = await fetch(`${API}/outlet/69`, {
  headers: { partner: "1", Accept: "application/json" },
}).then((r) => r.json());
const d = o?.data?.data ?? o?.data;
console.log("\nOutlet:", d?.Name, d?.OutletAddress);

for (const name of [
  "Mutton Cooker Pulav",
  "Chicken Cooker Pulav",
  "Garlic Naan",
  "Butter Chicken",
  "Chicken Dum Biryani",
]) {
  for (const cat of menu) {
    const item = cat.menuItems?.find((i) => i.name === name);
    if (item) {
      console.log(`${name}: $${item.selling_price}`);
      break;
    }
  }
}
