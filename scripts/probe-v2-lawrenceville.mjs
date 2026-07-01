const ORDER_PAGE = "https://orders.chefgaa.com/store/desi-dhamaka/menu";
const BFF = "https://chf2-customer-api.chefgaa.com";

const html = await fetch(ORDER_PAGE).then((r) => r.text());
const jsPaths = [...html.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map((m) => m[1]);
console.log("JS bundles:", jsPaths.length);

let tenantId = null;
let storeId = null;
let platformSlug = null;

for (const path of jsPaths.slice(0, 8)) {
  const js = await fetch(`https://orders.chefgaa.com${path}`).then((r) => r.text());
  const tenantMatch = js.match(/tenantId:"([a-f0-9-]{36})"/);
  const storeMatch = js.match(/storeId:"([a-f0-9-]{36})"/);
  if (tenantMatch) tenantId = tenantMatch[1];
  if (storeMatch) storeId = storeMatch[1];
  const slugMatch = js.match(/platformSlug:"([^"]+)"/);
  if (slugMatch) platformSlug = slugMatch[1];
}

console.log({ tenantId, storeId, platformSlug });

if (!tenantId || !storeId) {
  console.log("Could not extract tenant/store from bundles");
  process.exit(0);
}

const headers = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "x-platform": "web",
  "tenant-id": tenantId,
  "store-id": storeId,
};

const slug = platformSlug ?? "desi-dhamaka";
const platformRes = await fetch(`${BFF}/api/v1/public/menu/platforms/slug/${slug}`, { headers });
const platform = await platformRes.json();
console.log("platform status:", platformRes.status, JSON.stringify(platform).slice(0, 400));

const platformId = platform?.data?.id;
if (platformId) {
  const menuRes = await fetch(`${BFF}/api/v1/public/menu/platforms/${platformId}`, { headers });
  const menu = await menuRes.json();
  const data = menu?.data?.data ?? menu?.data ?? {};
  const categories = data.categories ?? [];
  console.log("menu status:", menuRes.status, "categories:", categories.length);
  const first = categories[0];
  const items = first?.items ?? first?.menuItems ?? [];
  console.log("first category:", first?.name, "items:", items.length);
  console.log("category keys:", first ? Object.keys(first) : []);
  console.log("item keys:", items[0] ? Object.keys(items[0]) : []);
}
