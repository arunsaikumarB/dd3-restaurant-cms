async function fetchText(url) {
  const r = await fetch(url);
  return r.text();
}

const html = await fetchText("https://orders.chefgaa.com/store/desi-dhamaka/menu");
const m = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
console.log("js:", m?.[1]);
const js = await fetchText("https://orders.chefgaa.com" + m[1]);
const bp = js.match(/bp="([^"]+)"/)?.[1];
console.log("API base:", bp);

const partner = await fetch(`${bp}/partner/slug/desi-dhamaka`).then((r) => r.json());
console.log("Partner:", JSON.stringify(partner, null, 2));

const partnerId = partner?.data?.id;
if (partnerId) {
  const outlets = await fetch(`${bp}/outlet/partner?partner_id=${partnerId}`).then((r) =>
    r.json(),
  );
  console.log("Outlets:", JSON.stringify(outlets, null, 2).slice(0, 5000));
  for (const outlet of outlets?.data ?? []) {
    const id = outlet.ID ?? outlet.id;
    const menu = await fetch(`${bp}/menu-item`, {
      headers: { outlet: String(id), partner: String(partnerId), Accept: "application/json" },
    }).then((r) => r.json());
    const items = menu.reduce((s, c) => s + (c.menuItems?.length ?? 0), 0);
    console.log(
      `\nOutlet ${id} (${outlet.OutletAddress?.City}): ${menu.length} cats, ${items} items`,
    );
    console.log(menu.map((c) => c.name).join(" | "));
  }
}
