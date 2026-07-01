const API = "https://api.chefgaa.com";

const targetFirstCats = ["Cooker Pulav", "Breakfast/South Indian Special"];

for (let id = 72; id <= 150; id++) {
  const r = await fetch(`${API}/menu-item`, {
    headers: { outlet: String(id), partner: "1", Accept: "application/json" },
  });
  if (r.status !== 200) continue;
  const menu = await r.json();
  if (!Array.isArray(menu) || menu.length < 10) continue;
  const items = menu.reduce((s, c) => s + (c.menuItems?.length ?? 0), 0);
  if (items < 200) continue;
  const names = menu.map((c) => c.name);
  const o = await fetch(`${API}/outlet/${id}`, {
    headers: { partner: "1", Accept: "application/json" },
  }).then((r) => r.json());
  const d = o?.data?.data ?? o?.data;
  console.log(
    `${id} ${d?.OutletAddress?.City ?? "?"}: ${items} items | ${names.slice(0, 6).join(" | ")}`,
  );
  if (
    names[0] === "Cooker Pulav" ||
    names.some((n) => /breakfast.*south indian/i.test(n)) ||
    names.includes("Monday Offers")
  ) {
    console.log("FULL:", names.join(" | "));
    const mutton = menu
      .flatMap((c) => c.menuItems)
      .find((i) => i.name === "Mutton Cooker Pulav");
    if (mutton) console.log("Mutton Cooker Pulav:", mutton.selling_price);
  }
}
