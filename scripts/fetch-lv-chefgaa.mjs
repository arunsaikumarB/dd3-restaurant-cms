const BFF = "https://chf2-customer-api.chefgaa.com";

const headers = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "x-platform": "web",
};

const slugRes = await fetch(
  `${BFF}/api/v1/public/menu/platforms/slug/desi-dhamaka`,
  { headers },
);
const slugText = await slugRes.text();
console.log("slug status:", slugRes.status);
console.log(slugText.slice(0, 1000));

if (slugText.startsWith("{")) {
  const slugData = JSON.parse(slugText);
  const platformId = slugData?.data?.id ?? slugData?.data?.data?.id;
  console.log("platform id:", platformId);

  if (platformId) {
    const menuRes = await fetch(
      `${BFF}/api/v1/public/menu/platforms/${platformId}`,
      { headers },
    );
    const menuText = await menuRes.text();
    console.log("\nmenu status:", menuRes.status, "len:", menuText.length);
    const menuData = JSON.parse(menuText);
    const payload = menuData?.data?.data ?? menuData?.data ?? menuData;
    const categories = payload?.categories ?? payload?.menus ?? [];
    console.log("keys:", Object.keys(payload ?? {}));
    if (Array.isArray(categories)) {
      console.log(
        "categories:",
        categories.length,
        categories.map((c) => c.name ?? c.categoryName).slice(0, 25).join(" | "),
      );
    }
  }
}
