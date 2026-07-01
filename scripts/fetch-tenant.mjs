import { readFileSync } from "node:fs";

const js = readFileSync(".cache/chefgaa-orders.js", "utf8");
const kg = js.match(/KG="([^"]+)"/)?.[1] ?? js.match(/,KG=([^,}]+)/)?.[1];
console.log("KG:", kg);

const BFF = "https://chf2-customer-api.chefgaa.com";
const headers = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "x-platform": "web",
};

const tenant = await fetch(`${BFF}/api/v1/tenants/slug/desi-dhamaka`, { headers }).then(
  (r) => r.json(),
);
console.log("\nTenant:", JSON.stringify(tenant, null, 2).slice(0, 3000));

const tenantId = tenant?.data?.id ?? tenant?.data?.data?.id;
if (tenantId) {
  const stores = await fetch(`${BFF}/api/v1/tenants/${tenantId}/stores`, {
    headers: { ...headers, "tenant-id": tenantId },
  }).then((r) => r.json());
  console.log("\nStores:", JSON.stringify(stores, null, 2).slice(0, 3000));
}

// Try pre-prod BFF too
const BFF2 = "https://pre-prod.chefgaa.com/customer-bff";
const tenant2 = await fetch(`${BFF2}/api/v1/tenants/slug/desi-dhamaka`, { headers }).then(
  (r) => r.text(),
);
console.log("\npre-prod tenant:", tenant2.slice(0, 500));
