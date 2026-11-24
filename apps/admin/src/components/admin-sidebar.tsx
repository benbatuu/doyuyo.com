"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Briefcase,
  ChevronDown,
  FileText,
  Home,
  Image as ImageIcon,
  Inbox,
  Languages,
  LogOut,
  Mail,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Scale,
  Search,
  Settings,
  ShieldAlert,
  Store,
  TrendingUp,
  Users,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type IconName = "home" | "inbox" | "invest" | "mail" | "briefcase" | "content" | "media" | "seo" | "menu" | "store" | "languages" | "allergen" | "legal" | "users" | "settings";
/** badge = new (unread) count, count = total submissions. */
export type NavItem = { href: string; label: string; badge: number; count?: number; icon: IconName };
export type NavGroup = { id: string; label: string; items: NavItem[] };

const ICONS: Record<IconName, LucideIcon> = {
  home: Home,
  inbox: Inbox,
  invest: TrendingUp,
  mail: Mail,
  briefcase: Briefcase,
  content: FileText,
  media: ImageIcon,
  seo: Search,
  menu: UtensilsCrossed,
  allergen: ShieldAlert,
  store: Store,
  languages: Languages,
  legal: Scale,
  users: Users,
  settings: Settings,
};

const COLLAPSE_KEY = "doyuyo-admin-sidebar-collapsed";

export function AdminSidebar({ groups, email, logout }: { groups: NavGroup[]; email: string; logout: () => Promise<void> }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {}
  }, []);
  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });

  useEffect(() => setMobileOpen(false), [pathname, searchParams]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const currentType = searchParams.get("type") ?? "";
  const isActive = (href: string) => {
    const [path = "/", query] = href.split("?");
    if (path === "/") return pathname === "/";
    if (!pathname.startsWith(path)) return false;
    if (query) return new URLSearchParams(query).get("type") === currentType;
    return true;
  };

  // In the mobile drawer we always show full labels.
  const rail = collapsed && !mobileOpen;

  const panel = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className={cn("flex h-16 shrink-0 items-center border-b px-4", rail ? "justify-center px-0" : "justify-between")}>
        {rail ? (
          // Collapsed: favicon turns into an "expand" button on hover.
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Menüyü genişlet"
            title="Menüyü genişlet"
            className="group relative grid size-9 place-items-center rounded-lg transition-colors hover:bg-muted"
          >
            <img src="/brand/apple-touch-icon.png" alt="" className="size-8 rounded-lg transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0" />
            <PanelLeftOpen className="absolute size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
          </button>
        ) : (
          <Link href="/" className="flex items-center" aria-label="Doyuyo yönetim paneli">
            <img src="/brand/doyuyo-logo.svg" alt="Doyuyo" className="h-7 w-auto" />
          </Link>
        )}
        {!rail && (
          <>
            <IconButton label="Menüyü daralt" onClick={toggleCollapsed} className="hidden md:grid">
              <PanelLeftClose />
            </IconButton>
            <IconButton label="Menüyü kapat" onClick={() => setMobileOpen(false)} className="md:hidden">
              <X />
            </IconButton>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Yönetim menüsü">
        {groups.map((g) => {
          const open = rail || !closedGroups[g.id];
          return (
            <div key={g.id}>
              {rail ? (
                <div className="mx-auto mb-2 h-px w-6 bg-border first:hidden" aria-hidden />
              ) : (
                <button
                  type="button"
                  onClick={() => setClosedGroups((s) => ({ ...s, [g.id]: !s[g.id] }))}
                  aria-expanded={open}
                  className="group mb-1 flex w-full items-center justify-between rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 hover:text-foreground"
                >
                  {g.label}
                  <ChevronDown className={cn("size-3.5 opacity-0 transition group-hover:opacity-100", !open && "-rotate-90 opacity-100")} />
                </button>
              )}
              <div className={cn("grid transition-[grid-template-rows] duration-200 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                <ul className="space-y-0.5 overflow-hidden">
                  {g.items.map((n) => {
                    const active = isActive(n.href);
                    const Icon = ICONS[n.icon];
                    return (
                      <li key={n.href}>
                        <Link
                          href={n.href}
                          title={rail ? n.label : undefined}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm font-medium transition-colors",
                            active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                            rail && "justify-center px-0",
                          )}
                        >
                          <Icon className={cn("size-4 shrink-0", active && "text-primary")} strokeWidth={active ? 2.25 : 1.75} />
                          {!rail && <span className="flex-1 truncate">{n.label}</span>}
                          {!rail && n.badge > 0 && (
                            <span title={`${n.badge} yeni`} className="rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-primary-foreground">
                              {n.badge}
                            </span>
                          )}
                          {!rail && n.count !== undefined && (
                            <span title={`Toplam ${n.count}`} className="min-w-5 text-right text-xs tabular-nums text-muted-foreground">{n.count}</span>
                          )}
                          {rail && n.badge > 0 && <span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary" aria-hidden />}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t p-3">
        {rail ? (
          <div className="flex flex-col items-center gap-1">
            <form action={logout}>
              <IconButton label="Çıkış yap" type="submit">
                <LogOut />
              </IconButton>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-lg px-1.5 py-1">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-navy-900 text-xs font-semibold text-white">
              {email.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{email.split("@")[0]}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
            <form action={logout}>
              <IconButton label="Çıkış yap" type="submit">
                <LogOut />
              </IconButton>
            </form>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-white/90 px-4 backdrop-blur md:hidden">
        <Link href="/">
          <img src="/brand/doyuyo-logo.svg" alt="Doyuyo" className="h-6 w-auto" />
        </Link>
        <IconButton label="Menüyü aç" onClick={() => setMobileOpen(true)}>
          <Menu />
        </IconButton>
      </header>

      <div
        onClick={() => setMobileOpen(false)}
        className={cn("fixed inset-0 z-40 bg-navy-950/30 transition-opacity duration-200 md:hidden", mobileOpen ? "opacity-100" : "pointer-events-none opacity-0")}
        aria-hidden
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 border-r bg-white transition-transform duration-200 ease-out",
          mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full",
          "md:sticky md:top-0 md:z-auto md:h-screen md:shrink-0 md:translate-x-0 md:shadow-none md:transition-[width]",
          collapsed ? "md:w-[68px]" : "md:w-64",
        )}
      >
        {panel}
      </aside>
    </>
  );
}

function IconButton({ label, className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn("grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&_svg]:size-4", className)}
      {...props}
    >
      {children}
    </button>
  );
}
