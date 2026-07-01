const BFF = "https://chf2-customer-api.chefgaa.com";
const TENANT_ID = "bc3e7543-c8d6-4d77-bd87-d30cda29ca51";
const STORE_ID = "b8e4c76f-0534-47e8-952f-495e60959158";

const headers = {
  Accept: "application/json",
  "x-platform": "web",
  "tenant-id": TENANT_ID,
  "store-id": STORE_ID,
};

const paths = [
  `/api/v1/public/stores/${STORE_ID}/settings/website`,
  `/api/v1/public/stores/${STORE_ID}/order-types`,
  `/api/v1/stores/tenants/${TENANT_ID}`,
  `/api/v1/public/menu/platforms`,
];

for (const path of paths) {
  const r = await fetch(`${BFF}${path}`, { headers });
  const text = await r.text();
  console.log(`\n${path} [${r.status}]`);
  console.log(text.slice(0, 1200));
}
