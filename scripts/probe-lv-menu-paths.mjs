const BFF = "https://chf2-customer-api.chefgaa.com";
const STORE_ID = "b8e4c76f-0534-47e8-952f-495e60959158";
const TENANT_ID = "bc3e7543-c8d6-4d77-bd87-d30cda29ca51";
const headers = {
  Accept: "application/json",
  "x-platform": "web",
  "tenant-id": TENANT_ID,
  "store-id": STORE_ID,
};

const guesses = [
  `/api/v1/public/stores/${STORE_ID}/menu`,
  `/api/v1/public/stores/${STORE_ID}/categories`,
  `/api/v1/public/stores/${STORE_ID}/menu-items`,
  `/api/v1/public/menu/stores/${STORE_ID}`,
  `/api/v1/menu/stores/${STORE_ID}`,
  `/api/v1/public/catalog/stores/${STORE_ID}`,
];

for (const path of guesses) {
  const r = await fetch(`${BFF}${path}`, { headers });
  console.log(path, r.status, (await r.text()).slice(0, 200));
}
