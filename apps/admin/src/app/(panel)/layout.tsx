import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { container } from "@doyuyo/infrastructure";
import type { Resource } from "@doyuyo/core";
import { currentUser, SESSION_COOKIE } from "@/lib/session";
import { accessFor } from "@/lib/access";
import { AdminSidebar, type NavGroup } from "@/components/admin-sidebar";

export const dynamic = "force-dynamic";

/** Which permission opens each sidebar entry. Entries not listed are always visible. */
const RESOURCE_OF: Record<string, Resource> = {
  "/inbox": "forms",
  "/icerik": "content",
  "/yasal": "content",
  "/medya": "media",
  "/urunler": "catalog",
  "/alerjenler": "catalog",
  "/subeler": "branches",
  "/seo": "seo",
  "/ceviriler": "translations",
  "/kullanicilar": "users",
  "/ayarlar": "settings",
};

async function logout() {
  "use server";
  (await cookies()).delete(SESSION_COOKIE.name);
  redirect("/login");
}

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const ctx = await accessFor();
  if (!ctx) redirect("/login");
  const counts = await container().listSubmissions.counts();
  const total = counts.reduce((s, c) => s + c.count, 0);
  const totalNew = counts.filter((c) => c.status === "new").reduce((s, c) => s + c.count, 0);
  const all: NavGroup[] = [
    {
      id: "genel",
      label: "Genel",
      items: [
        { href: "/", label: "Özet", badge: 0, icon: "home" },
        { href: "/inbox", label: "Formlar", badge: totalNew, count: total, icon: "inbox" },
      ],
    },
    {
      id: "icerik",
      label: "İçerik",
      items: [
        { href: "/icerik", label: "Sayfalar", badge: 0, icon: "content" },
        { href: "/yasal", label: "Yasal metinler", badge: 0, icon: "legal" },
        { href: "/medya", label: "Medya", badge: 0, icon: "media" },
      ],
    },
    {
      id: "restoran",
      label: "Restoran",
      items: [
        { href: "/urunler", label: "Menü ve ürünler", badge: 0, icon: "menu" },
        { href: "/subeler", label: "Şubeler", badge: 0, icon: "store" },
        { href: "/alerjenler", label: "Alerjenler", badge: 0, icon: "allergen" },
      ],
    },
    {
      id: "site",
      label: "Görünürlük",
      items: [
        { href: "/seo", label: "SEO", badge: 0, icon: "seo" },
        { href: "/ceviriler", label: "Çeviriler", badge: 0, icon: "languages" },
      ],
    },
    {
      id: "sistem",
      label: "Sistem",
      items: [
        { href: "/kullanicilar", label: "Kullanıcılar", badge: 0, icon: "users" },
        { href: "/ayarlar", label: "Ayarlar", badge: 0, icon: "settings" },
      ],
    },
  ];
  const groups = all
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => {
        const r: Resource | undefined = RESOURCE_OF[i.href];
        return !r || ctx.perms[r];
      }),
    }))
    .filter((g) => g.items.length > 0);
  return (
    <div className="min-h-screen md:flex">
      <AdminSidebar groups={groups} email={user.email} logout={logout} />
      <main className="min-w-0 flex-1"><div className="w-full p-6">{children}</div></main>
    </div>
  );
}
