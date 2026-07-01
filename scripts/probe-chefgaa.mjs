async function fetchText(url) {
  const r = await fetch(url);
  return r.text();
}

async function probe(host, orderType) {
  const url = orderType
    ? `${host}/store/desi-dhamaka?order_type=${orderType}`
    : `${host}/store/desi-dhamaka/menu`;
  const html = await fetchText(url);
  const m = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
  console.log("page:", url, "js:", m?.[1]);
  if (!m) return;
  const js = await fetchText(host + m[1]);
  const paths = [...js.matchAll(/"(\/api\/[^"]+)"/g)]
    .map((x) => x[1])
    .filter((v, i, a) => a.indexOf(v) === i);
  console.log("api paths:", paths.slice(0, 40));
}

await probe("https://order.chefgaa.com", "106");
await probe("https://order.chefgaa.com", "108");
await probe("https://orders.chefgaa.com", null);
