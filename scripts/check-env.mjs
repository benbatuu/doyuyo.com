// Run before deploy: node scripts/check-env.mjs  (reads process.env; use `set -a; . ./.env; set +a` first)
const req = {
  DATABASE_URL: (v) => v.startsWith("postgres"),
  NEXT_PUBLIC_SITE_URL: (v) => v === "https://doyuyo.com",
  ADMIN_EMAIL: (v) => v.includes("@") && !v.endsWith(".local"),
  ADMIN_PASSWORD: (v) => v.length >= 12,
  ADMIN_SESSION_SECRET: (v) => v.length >= 32,
};
const opt = ["INDEXNOW_KEY", "GOOGLE_SITE_VERIFICATION", "BING_SITE_VERIFICATION", "NEXT_PUBLIC_GA_ID", "RESEND_API_KEY", "FORM_NOTIFY_TO", "NEXT_PUBLIC_TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY", "ADMIN_PUBLIC_URL"];
let bad = 0;
for (const [k, ok] of Object.entries(req)) {
  const v = process.env[k] ?? "";
  if (!v || !ok(v)) { console.error(`MISSING/INVALID  ${k}`); bad++; } else console.log(`ok               ${k}`);
}
for (const k of opt) if (!process.env[k]) console.warn(`optional unset   ${k}`);
process.exit(bad ? 1 : 0);
