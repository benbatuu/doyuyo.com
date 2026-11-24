"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { SOCIAL_NETWORKS, type ContactSettings, type SocialNetwork } from "@doyuyo/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { field } from "@/components/catalog/product-sheet";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { saveContact, setMaintenance } from "@/app/(panel)/ayarlar/actions";

const NETWORK_LABEL: Record<SocialNetwork, string> = { instagram: "Instagram", youtube: "YouTube", twitter: "X (Twitter)", linkedin: "LinkedIn", facebook: "Facebook", tiktok: "TikTok" };

export function SettingsView({ contact, maintenanceEnabled, canMaintenance }: { contact: ContactSettings; maintenanceEnabled: boolean; canMaintenance: boolean }) {
  return (
    <div className="space-y-8">
      {canMaintenance && <MaintenanceSwitch initial={maintenanceEnabled} />}
      <ContactCard initial={contact} />
    </div>
  );
}

/** Site-wide on/off. Turning it on asks first: visitors see only the maintenance screen. */
function MaintenanceSwitch({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [ask, setAsk] = useState(false);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  const apply = (next: boolean) =>
    start(async () => {
      setErr("");
      const r = await setMaintenance(next);
      if (!r.ok) return setErr(r.error);
      setOn(next);
      setAsk(false);
    });

  return (
    <section className={cn("flex flex-wrap items-center gap-4 rounded-xl border bg-card p-5 shadow-xs", on && "border-amber-300 bg-amber-50")}>
      <span className={cn("size-2.5 shrink-0 rounded-full", on ? "bg-amber-500" : "bg-emerald-500")} />
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold">Bakım modu · {on ? "Açık" : "Kapalı"}</h2>
        <p className="text-xs text-muted-foreground">
          {on ? "Ziyaretçiler şu an bakım ekranını görüyor. Logo, iletişim ve sipariş kanalları ekranda kalır." : "Site normal çalışıyor."}{" "}
          <Link href="/icerik/bakim" className="font-medium text-foreground underline underline-offset-2">
            Bakım sayfası metnini düzenle
          </Link>
        </p>
        {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
      </div>
      <Button variant={on ? "outline" : "default"} disabled={pending} onClick={() => (on ? apply(false) : setAsk(true))}>
        {pending && <Loader2 className="size-4 animate-spin" />} {on ? "Bakımı kapat" : "Bakıma al"}
      </Button>
      <ConfirmDialog
        open={ask}
        onOpenChange={setAsk}
        title="Site bakıma alınsın mı?"
        description="Tüm sayfalar yerine bakım ekranı gösterilir. Panel çalışmaya devam eder; istediğin an kapatabilirsin."
        confirmLabel="Bakıma al"
        pending={pending}
        error={err}
        onConfirm={() => apply(true)}
      />
    </section>
  );
}

function Labeled({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        {label}
        {hint && <span className="font-normal">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function ContactCard({ initial }: { initial: ContactSettings }) {
  const [c, setC] = useState(initial);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const set = (p: Partial<ContactSettings>) => setC((x) => ({ ...x, ...p }));
  const setSocial = (i: number, p: Partial<{ network: SocialNetwork; href: string }>) => set({ social: c.social.map((s, j) => (j === i ? { ...s, ...p } : s)) });
  const usedNetworks = new Set(c.social.map((s) => s.network));
  const freeNetwork = SOCIAL_NETWORKS.find((n) => !usedNetworks.has(n));

  const save = () =>
    start(async () => {
      const r = await saveContact(c);
      setMsg(r.ok ? "Kaydedildi" : r.error);
    });

  return (
    <section className="space-y-4 rounded-xl border bg-card p-5 shadow-xs">
      <div>
        <h2 className="text-sm font-semibold">İletişim ve site bilgileri</h2>
        <p className="text-xs text-muted-foreground">Burada değiştirdiğin bilgiler iletişim sayfasında, alt bilgide ve sayfa verilerinde görünür.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="E-posta" hint="İletişim sayfasında gösterilir">
          <Input type="email" value={c.email} onChange={(e) => set({ email: e.target.value })} placeholder="info@doyuyo.com" className="h-9" />
        </Labeled>
        <Labeled label="Telefon" hint="Örn. 444 39 55">
          <Input value={c.phoneLabel} onChange={(e) => set({ phoneLabel: e.target.value })} className="h-9" />
        </Labeled>
        <Labeled label="Merkez adres (TR)">
          <textarea rows={2} value={c.addressTr} onChange={(e) => set({ addressTr: e.target.value })} className={cn(field, "resize-y")} />
        </Labeled>
        <Labeled label="Merkez adres (EN)">
          <textarea rows={2} value={c.addressEn} onChange={(e) => set({ addressEn: e.target.value })} className={cn(field, "resize-y")} />
        </Labeled>
        <Labeled label="Harita bağlantısı" hint="https:// ile başlamalı">
          <Input value={c.mapsUrl} onChange={(e) => set({ mapsUrl: e.target.value })} placeholder="https://maps.app.goo.gl/…" className="h-9" />
        </Labeled>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Sosyal medya</p>
        {c.social.map((s, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[180px_1fr_auto]">
            <select value={s.network} onChange={(e) => setSocial(i, { network: e.target.value as SocialNetwork })} className={cn(field, "h-9")}>
              {SOCIAL_NETWORKS.filter((n) => n === s.network || !usedNetworks.has(n)).map((n) => (
                <option key={n} value={n}>
                  {NETWORK_LABEL[n]}
                </option>
              ))}
            </select>
            <Input value={s.href} onChange={(e) => setSocial(i, { href: e.target.value })} placeholder="https://…" className="h-9" />
            <Button variant="outline" size="icon" onClick={() => set({ social: c.social.filter((_, j) => j !== i) })} aria-label="Bağlantıyı kaldır">
              <X className="size-4" />
            </Button>
          </div>
        ))}
        {freeNetwork && (
          <Button variant="outline" size="sm" onClick={() => set({ social: [...c.social, { network: freeNetwork, href: "https://" }] })}>
            <Plus className="size-4" /> Bağlantı ekle
          </Button>
        )}
      </div>

      <div className="flex items-center justify-end gap-3">
        {msg && <span className={cn("mr-auto text-xs", msg === "Kaydedildi" ? "text-emerald-700" : "text-destructive")}>{msg}</span>}
        <Button onClick={save} disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />} Kaydet
        </Button>
      </div>
    </section>
  );
}
