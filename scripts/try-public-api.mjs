const urls = [
  "https://orders.chefgaa.com/api/v1/public/menu/platforms/slug/desi-dhamaka",
  "https://order.chefgaa.com/api/v1/public/menu/platforms/slug/desi-dhamaka",
  "https://api.chefgaa.com/v1/public/menu/platforms/slug/desi-dhamaka",
  "https://api.chefgaa.com/public/menu/platforms/slug/desi-dhamaka",
];

for (const url of urls) {
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await r.text();
  console.log(url, r.status, text.slice(0, 500));
}
