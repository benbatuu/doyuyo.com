import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { Button } from "@/components/ui/button";
import { ArrowRight, Lock, Mail, ShieldCheck, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { container } from "@doyuyo/infrastructure";
import { SESSION_COOKIE, currentUser, sessionToken, verifyPassword } from "@/lib/session";

/** 5 wrong passwords per IP per 15 minutes (in memory; one admin instance). Real accounts + 2FA come later. */
const attempts = ((globalThis as unknown as { __adminAttempts?: Map<string, { n: number; until: number }> }).__adminAttempts ??= new Map());
const MAX = 5;
const WINDOW = 15 * 60_000;

async function login(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");
  // Constant small delay against brute force (real rate limiting comes with user accounts).
  await new Promise((r) => setTimeout(r, 400));
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const rec = attempts.get(ip);
  if (rec && rec.until > Date.now() && rec.n >= MAX) redirect(`/login?error=2&next=${encodeURIComponent(next)}`);
  const ok = verifyPassword(email, password) || (await container().manageUsers.authenticate(email, password));
  if (!ok) {
    attempts.set(ip, { n: rec && rec.until > Date.now() ? rec.n + 1 : 1, until: rec && rec.until > Date.now() ? rec.until : Date.now() + WINDOW });
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }
  attempts.delete(ip);
  (await cookies()).set(SESSION_COOKIE.name, sessionToken(email), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: SESSION_COOKIE.maxAge, path: "/" });
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

/** Demo login: dev only. Never on in production. */
const DEMO_ENABLED = process.env.NODE_ENV !== "production" && !!process.env.ADMIN_EMAIL;

async function demoLogin() {
  "use server";
  if (!DEMO_ENABLED) redirect("/login");
  (await cookies()).set(SESSION_COOKIE.name, sessionToken(process.env.ADMIN_EMAIL!), { httpOnly: true, sameSite: "lax", secure: false, maxAge: SESSION_COOKIE.maxAge, path: "/" });
  redirect("/");
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  // Already signed in: skip the login form.
  if (await currentUser()) redirect(typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/");
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1fr_1.1fr]">
      {/* Form side */}
      <section className="relative flex flex-col px-6 py-8 sm:px-12 lg:px-16">
        <img src="/brand/doyuyo-logo.svg" alt="Doyuyo" className="h-9 w-auto self-start" />

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-bold text-brown-700">
            <ShieldCheck className="size-3.5" /> Yönetim paneli
          </span>
          <h1 className="mt-5 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight">Tekrar hoş geldin</h1>
          <p className="mt-2 text-muted-foreground">Başvuruları ve siteyi yönetmek için giriş yap.</p>

          <form action={login} className="mt-10 space-y-5">
            <input type="hidden" name="next" value={typeof sp.next === "string" ? sp.next : "/"} />
            <Field id="email" label="E-posta" icon={<Mail className="size-4" />}>
              <Input id="email" name="email" type="email" required autoComplete="username" placeholder="ad@doyuyo.com" className="h-12 rounded-xl bg-muted/60 pl-11 text-base focus-visible:bg-white" />
            </Field>
            <Field id="password" label="Şifre" icon={<Lock className="size-4" />}>
              <Input id="password" name="password" type="password" required autoComplete="current-password" placeholder="••••••••" className="h-12 rounded-xl bg-muted/60 pl-11 text-base focus-visible:bg-white" />
            </Field>
            {sp.error && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {sp.error === "2" ? "Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin." : "E-posta veya şifre hatalı."}
              </p>
            )}
            <Button type="submit" size="lg" className="group h-12 w-full rounded-xl text-base font-bold shadow-[0_12px_30px_-12px_rgb(201_48_31/0.7)]">
              Giriş yap <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </form>

          {DEMO_ENABLED && (
            <form action={demoLogin} className="mt-6">
              <div className="mb-4 flex items-center gap-3 text-xs font-semibold text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> veya <span className="h-px flex-1 bg-border" />
              </div>
              <Button type="submit" variant="outline" size="lg" className="h-12 w-full rounded-xl border-dashed text-base font-bold">
                <Zap className="size-4 text-amber-400" /> Demo hesabıyla gir
              </Button>
              <p className="mt-2 text-center text-xs text-muted-foreground">Sadece geliştirme ortamında görünür.</p>
            </form>
          )}
        </div>

        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Doyuyo · Yalnızca yetkili kullanıcılar içindir.</p>
      </section>

      {/* Brand side */}
      <aside className="relative hidden overflow-hidden bg-navy-900 lg:block">
        <img src="/brand/login-cover.jpg" alt="Doyuyo restoranında çıtır tavuk menüsü" className="absolute inset-0 size-full object-cover object-[38%_center]" />
      </aside>
    </main>
  );
}

function Field({ id, label, icon, children }: { id: string; label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-bold">{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
        {children}
      </div>
    </div>
  );
}

