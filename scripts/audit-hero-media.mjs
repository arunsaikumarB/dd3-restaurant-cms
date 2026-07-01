/**
 * Read-only audit: homepage_content hero URLs + remote file sizes.
 * Uses public anon key from the production Netlify bundle.
 */
const BUNDLE_URL = "https://desi-dhamaka-admin.netlify.app/assets/index-D2Tx9YoS.js";

async function main() {
  const bundleRes = await fetch(BUNDLE_URL);
  const js = await bundleRes.text();

  const supabaseUrl = js.match(/https:\/\/[a-z0-9]+\.supabase\.co/)?.[0];
  const anonKey = js.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)?.[0];

  if (!supabaseUrl || !anonKey) {
    console.error("Could not extract Supabase URL/key from production bundle.");
    process.exit(1);
  }

  const rowsRes = await fetch(
    `${supabaseUrl}/rest/v1/homepage_content?select=location_id,hero_video,hero_image&order=location_id`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    },
  );

  if (!rowsRes.ok) {
    console.error("homepage_content query failed:", rowsRes.status, await rowsRes.text());
    process.exit(1);
  }

  const rows = await rowsRes.json();
  console.log("=== homepage_content hero media (DB) ===\n");

  for (const row of rows) {
    console.log(`Location: ${row.location_id}`);
    console.log(`  hero_video: ${row.hero_video ?? "(null)"}`);
    console.log(`  hero_image: ${row.hero_image ?? "(null)"}`);

    for (const [field, url] of [
      ["hero_video", row.hero_video],
      ["hero_image", row.hero_image],
    ]) {
      if (!url || !/^https?:\/\//i.test(url)) continue;
      try {
        const head = await fetch(url, { method: "HEAD" });
        const len = head.headers.get("content-length");
        const type = head.headers.get("content-type");
        const mb = len ? (Number(len) / (1024 * 1024)).toFixed(2) : "?";
        console.log(`  ${field} remote size: ${mb} MB (${type ?? "unknown type"})`);
      } catch (err) {
        console.log(`  ${field} remote size: HEAD failed (${err.message})`);
      }
    }
    console.log("");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
