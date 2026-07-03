/**
 * GA4 backend diagnostics — runs every credential/auth/property check and
 * prints a health report. NEVER prints secret values.
 *
 * Run with the linked Netlify site's env injected (no secrets on disk):
 *   npx netlify dev:exec node scripts/ga4-diagnostics.mjs
 */
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { GoogleAuth } from "google-auth-library";

const PASS = "PASS";
const FAIL = "FAIL";

function normalizePrivateKey(raw) {
  let key = (raw ?? "").trim();
  if (!key) return "";
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  key = key.replace(/\\\\n/g, "\\n").replace(/\\n/g, "\n");
  key = key.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  key = key
    .replace(/-----BEGIN ([A-Z0-9 ]+?)-----\s*/g, "-----BEGIN $1-----\n")
    .replace(/\s*-----END ([A-Z0-9 ]+?)-----/g, "\n-----END $1-----");
  const pemMatch = key.match(/-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----/);
  if (pemMatch) {
    const [, label, body] = pemMatch;
    const compact = body.replace(/\s+/g, "");
    const lines = compact.match(/.{1,64}/g) ?? [compact];
    key = `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----\n`;
  }
  if (!key.endsWith("\n")) key += "\n";
  return key;
}

const report = [];
function record(section, status, reason) {
  report.push({ section, status, reason });
}

const propertyId = process.env.GA4_PROPERTY_ID;
const clientEmail = process.env.GA4_CLIENT_EMAIL;
const rawKey = process.env.GA4_PRIVATE_KEY;

// ---- 1. Environment variables ----
console.log("1. Environment Variables");
console.log(`   GA4_PROPERTY_ID   : ${propertyId ? "\u2713 Found" : "\u2717 Missing"}`);
console.log(`   GA4_CLIENT_EMAIL  : ${clientEmail ? "\u2713 Found" : "\u2717 Missing"}`);
console.log(`   GA4_PRIVATE_KEY   : ${rawKey ? "\u2713 Found" : "\u2717 Missing"}`);
const envOk = Boolean(propertyId && clientEmail && rawKey);
record("Environment Variables", envOk ? PASS : FAIL, envOk ? null : "One or more GA4_* variables missing.");

// ---- 2. Private key ----
console.log("\n2. Private Key");
const key = normalizePrivateKey(rawKey);
let keyOk = true;
let keyReason = null;
if (!rawKey) {
  keyOk = false;
  keyReason = "GA4_PRIVATE_KEY missing.";
} else if (!key.trim()) {
  keyOk = false;
  keyReason = "GA4_PRIVATE_KEY is empty after trimming.";
} else if (!/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/.test(key)) {
  keyOk = false;
  keyReason = "Missing -----BEGIN PRIVATE KEY----- header.";
} else if (!/-----END (?:RSA |EC )?PRIVATE KEY-----/.test(key)) {
  keyOk = false;
  keyReason = "Missing -----END PRIVATE KEY----- footer.";
} else {
  const body = key
    .replace(/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/, "")
    .replace(/-----END (?:RSA |EC )?PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  if (body.length === 0) {
    keyOk = false;
    keyReason = "No base64 body between header and footer.";
  }
}
console.log(`   Exists            : ${rawKey ? "\u2713" : "\u2717"}`);
console.log(`   Non-empty         : ${key.trim() ? "\u2713" : "\u2717"}`);
console.log(`   BEGIN marker      : ${/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/.test(key) ? "\u2713" : "\u2717"}`);
console.log(`   END marker        : ${/-----END (?:RSA |EC )?PRIVATE KEY-----/.test(key) ? "\u2713" : "\u2717"}`);
console.log(`   Escaped \\n handled: ${rawKey && rawKey.includes("\\n") ? "\u2713 (converted)" : "n/a (already multiline)"}`);
console.log(`   Result            : ${keyOk ? "\u2713 valid PEM structure" : "\u2717 " + keyReason}`);
record("Private Key", keyOk ? PASS : FAIL, keyReason);

// ---- 3. Service account email ----
console.log("\n3. Service Account");
const emailOk = Boolean(clientEmail && /^[^@\s]+@[^@\s]+\.iam\.gserviceaccount\.com$/.test(clientEmail));
console.log(`   Valid service account email: ${emailOk ? "\u2713" : "\u2717"}`);
if (clientEmail) {
  const masked = clientEmail.replace(/^(.{3}).*(@.*)$/, "$1***$2");
  console.log(`   Email (masked)             : ${masked}`);
}
record("Service Account", emailOk ? PASS : FAIL, emailOk ? null : "GA4_CLIENT_EMAIL is not a *.iam.gserviceaccount.com address.");

// ---- 4 & 5. Auth + property access ----
console.log("\n4. Google Authentication");
let authStatus = FAIL;
let authReason = "Skipped (prerequisite failed).";
let propStatus = FAIL;
let propReason = "Skipped (auth failed).";

if (envOk && keyOk && emailOk) {
  try {
    const auth = new GoogleAuth({
      credentials: { type: "service_account", client_email: clientEmail, private_key: key },
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
    });
    const client = new BetaAnalyticsDataClient({ auth });
    console.log("   BetaAnalyticsDataClient created: \u2713");

    console.log("\n5. Property Access (runReport)");
    try {
      const [res] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        metrics: [{ name: "activeUsers" }],
        limit: 1,
      });
      authStatus = PASS;
      authReason = null;
      propStatus = PASS;
      propReason = null;
      console.log(`   runReport succeeded: \u2713 (rowCount=${res.rowCount ?? 0})`);
    } catch (err) {
      // Auth worked (client built + request sent) but property call failed.
      authStatus = PASS;
      authReason = null;
      const msg = err?.message ?? String(err);
      const code = err?.code;
      if (/PERMISSION_DENIED/i.test(msg) || code === 7) {
        propReason = "Permission denied — service account lacks Viewer access on the GA4 property.";
      } else if (/NOT_FOUND/i.test(msg) || code === 5) {
        propReason = "Property not found — GA4_PROPERTY_ID is wrong or the property does not exist.";
      } else if (/INVALID_ARGUMENT/i.test(msg) || code === 3) {
        propReason = "Invalid property ID — GA4_PROPERTY_ID must be the numeric property id only.";
      } else if (/UNAUTHENTICATED/i.test(msg) || code === 16) {
        authStatus = FAIL;
        authReason = "Authentication failed — credentials rejected by Google.";
        propReason = "Skipped (auth failed).";
      } else {
        propReason = msg;
      }
      console.log(`   runReport failed: \u2717 ${propReason}`);
    }
  } catch (err) {
    const msg = err?.message ?? String(err);
    if (/DECODER routines|unsupported|asn1|PEM/i.test(msg)) {
      authReason = "Private key could not be decoded by OpenSSL (bad PEM content).";
    } else {
      authReason = msg;
    }
    console.log(`   Client/auth creation failed: \u2717 ${authReason}`);
  }
} else {
  console.log("   Skipped — fix earlier failures first.");
  console.log("\n5. Property Access (runReport)");
  console.log("   Skipped — auth prerequisites failed.");
}
record("Google Authentication", authStatus, authReason);
record("Property Access", propStatus, propReason);

// ---- 6 & 7. IAM / property summary (derived from step 5) ----
console.log("\n6. IAM Permissions");
if (propStatus === PASS) {
  console.log("   \u2713 Service account has sufficient (Viewer) access.");
} else if (propReason && propReason.includes("Permission denied")) {
  console.log(`   \u2717 ${propReason}`);
  console.log("   Fix: GA4 Admin → Property Access Management → add the service");
  console.log("        account email with the \u201cViewer\u201d role.");
} else {
  console.log(`   \u2717 Not verified: ${propReason}`);
}

console.log("\n7. GA4 Property");
if (propStatus === PASS) {
  console.log("   \u2713 Property exists and is accessible.");
} else {
  console.log(`   \u2717 ${propReason}`);
}

// ---- 8. Health report ----
console.log("\n====================================================");
console.log("GA4 INTEGRATION HEALTH REPORT");
console.log("====================================================");
for (const item of report) {
  const icon = item.status === PASS ? "\u2705 PASS" : "\u274C FAIL";
  console.log(`\n${item.section}\n${icon}${item.status === FAIL && item.reason ? `\nReason:\n${item.reason}` : ""}`);
}

const firstFail = report.find((r) => r.status === FAIL);
console.log("\n----------------------------------------------------");
if (!firstFail) {
  console.log("Google Analytics integration is fully healthy.");
} else {
  console.log(`FIRST FAILING POINT: ${firstFail.section}`);
  console.log(`REASON: ${firstFail.reason}`);
}
console.log("----------------------------------------------------");
