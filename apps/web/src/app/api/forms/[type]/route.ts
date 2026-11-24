import { NextResponse, type NextRequest } from "next/server";
import { UAParser } from "ua-parser-js";
import { isFormType, type SubmissionContext } from "@doyuyo/core";
import { app } from "@/lib/data";

/** Cloudflare Turnstile: when TURNSTILE_SECRET_KEY is set, every submission needs a valid token. */
async function captchaOk(token: unknown, ip: string | null) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (typeof token !== "string" || !token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
    });
    return ((await res.json()) as { success?: boolean }).success === true;
  } catch {
    return false;
  }
}

/** Bump when the KVKK text shown next to the consent box changes. */
const CONSENT_VERSION = "kvkk-2026-11";

const str = (v: unknown, max = 500) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const header = (req: NextRequest, ...names: string[]) => {
  for (const n of names) {
    const v = req.headers.get(n);
    if (v) return decodeURIComponent(v);
  }
  return null;
};

/**
 * Form endpoint for contact / careers / investor. Stores the answers plus where, when and
 * how they were sent (page, referrer, UTM, device, approximate location) for the admin inbox.
 * Location is approximate: from the host's IP-geo headers (Vercel / Cloudflare) when present,
 * otherwise only the visitor's time zone. No browser location prompt.
 */
export async function POST(req: NextRequest, { params }: RouteContext<"/api/forms/[type]">) {
  const { type } = await params;
  if (!isFormType(type)) return NextResponse.json({ ok: false, reason: "unknown_form" }, { status: 404 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  const meta = (body.meta ?? {}) as Record<string, unknown>;
  const ua = req.headers.get("user-agent");
  const parsed = new UAParser(ua ?? "").getResult();
  const ip = header(req, "x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const country = header(req, "x-vercel-ip-country", "cf-ipcountry");
  const city = header(req, "x-vercel-ip-city", "cf-ipcity");
  const region = header(req, "x-vercel-ip-country-region", "cf-region");
  const utm = meta.utm && typeof meta.utm === "object" ? (Object.fromEntries(Object.entries(meta.utm as object).filter(([k, v]) => k.startsWith("utm_") && typeof v === "string").map(([k, v]) => [k, String(v).slice(0, 200)])) as Record<string, string>) : null;

  const context: SubmissionContext = {
    locale: str(meta.locale, 5) ?? "tr",
    pagePath: str(meta.pagePath, 300) ?? new URL(req.headers.get("referer") ?? "http://x/").pathname,
    pageTitle: str(meta.pageTitle, 200),
    referrer: str(meta.referrer, 500),
    utm: utm && Object.keys(utm).length ? utm : null,
    ip,
    userAgent: ua?.slice(0, 500) ?? null,
    device: {
      type: parsed.device.type ?? "desktop",
      os: [parsed.os.name, parsed.os.version].filter(Boolean).join(" ") || null,
      browser: [parsed.browser.name, parsed.browser.major].filter(Boolean).join(" ") || null,
      screen: str(meta.screen, 20),
      language: str(meta.language, 20),
    },
    geo: { country, region, city, timezone: str(meta.timezone, 60), source: country || city ? "ip-header" : "timezone" },
    consentVersion: CONSENT_VERSION,
  };

  if (!(await captchaOk(body.turnstileToken, ip))) return NextResponse.json({ ok: false, reason: "captcha" }, { status: 422 });
  const result = await app().submitForm.execute(type, body, context);
  if (result.ok) return NextResponse.json({ ok: true, id: result.id });
  const status = result.reason === "invalid" || result.reason === "consent" ? 422 : result.reason === "rate_limited" ? 429 : 400;
  return NextResponse.json(result, { status });
}
