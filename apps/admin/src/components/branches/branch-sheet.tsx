"use client";

import { useEffect, useState, useTransition } from "react";
import { Copy, ExternalLink, Loader2, MapPin, Plus, Trash2, X } from "lucide-react";
import type { AdminBranchDetail, AdminBranchPatch, AdminBranchRow, AdminBranchTexts, AdminCity, BranchStatus } from "@doyuyo/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MediaPicker } from "@/components/media/media-picker";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { field } from "@/components/catalog/product-sheet";
import { SITE_URL, mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { createBranch, deleteBranch, getBranch, saveBranch } from "@/app/(panel)/subeler/actions";
import { STATUS } from "./branch-view";

const LOCALES = [
  { id: "tr", label: "Türkçe" },
  { id: "en", label: "English" },
] as const;
type Loc = (typeof LOCALES)[number]["id"];
const EMPTY: AdminBranchTexts = { name: "", address: "", hours: [] };
const PRESETS = ["10:00 - 22:00", "10:00 - 23:00", "11:00 - 23:00", "00:00 - 24:00"];
const DAY_HINT: Record<Loc, string> = { tr: "Tüm Hafta", en: "All Week" };

type Draft = AdminBranchPatch & { latText: string; lngText: string };

/** Right-side editor for one branch. Server checks the rules again on save. */
/** id "new" opens an empty form that creates a branch. */
export function BranchSheet({ id, cities, onClose, onSaved, onCreated, onDeleted }: { id: number | "new" | null; cities: AdminCity[]; onClose: () => void; onSaved: (row: Partial<AdminBranchRow> & { id: number }) => void; onCreated: (row: AdminBranchRow) => void; onDeleted: (id: number) => void }) {
  const isNew = id === "new";
  const numId = typeof id === "number" ? id : null;
  const [confirm, setConfirm] = useState(false);
  const [typed, setTyped] = useState("");
  const [delErr, setDelErr] = useState("");
  const [deleting, startDelete] = useTransition();
  const [detail, setDetail] = useState<AdminBranchDetail | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saved, setSaved] = useState("");
  const [locale, setLocale] = useState<Loc>("tr");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, start] = useTransition();
  const [picker, setPicker] = useState(false);
  const [imagePath, setImagePath] = useState<string | null>(null);

  useEffect(() => {
    if (id === null) return;
    setError("");
    setDraft(null);
    setLocale("tr");
    if (id === "new") {
      setDetail(null);
      setImagePath(null);
      setDraft({ status: "closed", cityId: undefined, district: null, phone: null, lat: null, lng: null, mapsUrl: null, imageId: null, translations: { tr: { ...EMPTY }, en: { ...EMPTY } }, latText: "", lngText: "" });
      return;
    }
    setLoading(true);
    getBranch(id).then((d) => {
      setLoading(false);
      if (!d) return setError("Şube bulunamadı");
      setDetail(d);
      setImagePath(d.imagePath);
      const next: Draft = {
        status: d.status,
        district: d.district,
        phone: d.phone,
        lat: d.lat,
        lng: d.lng,
        mapsUrl: d.mapsUrl,
        imageId: d.imageId,
        translations: Object.fromEntries(LOCALES.map((l) => [l.id, { ...EMPTY, ...d.translations[l.id] }])),
        latText: d.lat?.toString() ?? "",
        lngText: d.lng?.toString() ?? "",
      };
      setDraft(next);
      setSaved(JSON.stringify(next));
    });
  }, [id]);

  const dirty = !!draft && JSON.stringify(draft) !== saved;
  const set = (p: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...p } : d));
  const cur = draft?.translations[locale] ?? EMPTY;
  const setT = (p: Partial<AdminBranchTexts>) => setDraft((d) => (d ? { ...d, translations: { ...d.translations, [locale]: { ...(d.translations[locale] ?? EMPTY), ...p } } } : d));
  const setHour = (i: number, p: Partial<{ day: string; time: string }>) => setT({ hours: cur.hours.map((h, j) => (j === i ? { ...h, ...p } : h)) });

  const copyHoursFromTr = () => {
    const tr = draft?.translations.tr?.hours ?? [];
    setT({ hours: tr.map((h) => ({ day: /tüm hafta/i.test(h.day) ? DAY_HINT.en : h.day, time: h.time })) });
  };

  // Paste a Google Maps link: pull "@lat,lng" or "q=lat,lng" out of it.
  const readCoords = (url: string) => {
    const m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ?? url.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/) ?? url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    return m ? { latText: m[1]!, lngText: m[2]! } : null;
  };

  const save = () => {
    if (!draft || !dirty || id === null || pending) return;
    setError("");
    const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));
    const { latText, lngText, ...rest } = draft;
    const patch: AdminBranchPatch = { ...rest, lat: num(latText), lng: num(lngText) };
    if (id === "new") {
      const cityId = draft.cityId;
      if (!cityId) return setError("Şehir seç");
      return start(async () => {
        const r = await createBranch({ ...patch, cityId });
        if (!r.ok) return setError(r.error);
        const tr = patch.translations.tr ?? EMPTY;
        const city = cities.find((c) => c.id === cityId);
        onCreated({
          id: r.id,
          key: r.key,
          name: tr.name,
          address: tr.address,
          hours: tr.hours,
          district: patch.district,
          phone: patch.phone,
          status: patch.status,
          cityId,
          cityName: city?.name ?? "",
          country: city?.country ?? "turkiye",
          hasGeo: patch.lat !== null && patch.lng !== null,
          hasEn: !!patch.translations.en?.name,
          imagePath,
          updatedAt: new Date().toISOString(),
        });
        onClose();
      });
    }
    start(async () => {
      const r = await saveBranch(id, patch);
      if (!r.ok) return setError(r.error);
      setSaved(JSON.stringify(draft));
      const tr = patch.translations.tr ?? EMPTY;
      const en = patch.translations.en;
      onSaved({
        id,
        status: patch.status,
        name: tr.name,
        address: tr.address,
        hours: tr.hours,
        district: patch.district,
        phone: patch.phone,
        hasGeo: patch.lat !== null && patch.lng !== null,
        hasEn: !!en?.name,
        imagePath,
      });
    });
  };

  const sitePath = detail?.paths[locale] ?? detail?.paths.tr;
  const lat = Number(draft?.latText.replace(",", "."));
  const lng = Number(draft?.lngText.replace(",", "."));
  const geoOk = !!draft?.latText && !!draft?.lngText && Number.isFinite(lat) && Number.isFinite(lng);

  return (
    <Sheet open={id !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "s") {
            e.preventDefault();
            save();
          }
        }}
      >
        <SheetHeader className="border-b p-5">
          <SheetTitle className="truncate pr-6">{isNew ? draft?.translations.tr?.name || "Yeni şube" : draft?.translations.tr?.name || detail?.key || "Şube"}</SheetTitle>
          <SheetDescription className="flex items-center gap-2 text-xs">
            <span>{detail?.cityName}</span>
            {sitePath && (
              <a href={`${SITE_URL}${sitePath}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono hover:text-foreground">
                {sitePath} <ExternalLink className="size-3" />
              </a>
            )}
          </SheetDescription>
        </SheetHeader>

        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {draft && (isNew || detail) && (
          <div className="space-y-6 p-5">
            {isNew && (
              <Labeled label="Şehir" hint={cities.length ? undefined : "Önce şehir ekle"}>
                <select value={draft.cityId ?? ""} onChange={(e) => set({ cityId: Number(e.target.value) || undefined })} className={cn(field, "h-9")}>
                  <option value="">Şehir seç</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Labeled>
            )}

            {/* Status */}
            <Labeled label="Durum" hint={draft.status === "open" ? "Sitede ve haritada görünür" : "Sitede görünmez"}>
              <div className="grid grid-cols-3 gap-1 rounded-lg border p-1">
                {(Object.keys(STATUS) as BranchStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set({ status: s })}
                    aria-pressed={draft.status === s}
                    className={cn("flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors", draft.status === s ? STATUS[s].pill : "text-muted-foreground hover:bg-muted/60")}
                  >
                    <span className={cn("size-1.5 rounded-full", STATUS[s].dot)} /> {STATUS[s].label}
                  </button>
                ))}
              </div>
            </Labeled>

            {/* Photo */}
            <div className="flex gap-4">
              <button type="button" onClick={() => setPicker(true)} className="group relative aspect-[4/3] w-36 shrink-0 overflow-hidden rounded-xl border bg-muted">
                {imagePath ? <img src={mediaUrl(imagePath)} alt="" className="size-full object-cover" /> : <span className="grid size-full place-items-center text-xs text-muted-foreground">Fotoğraf seç</span>}
                <span className="absolute inset-0 grid place-items-center bg-black/50 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">Değiştir</span>
              </button>
              <div className="min-w-0 flex-1 space-y-3">
                <Labeled label="İlçe / semt">
                  <Input value={draft.district ?? ""} onChange={(e) => set({ district: e.target.value || null })} placeholder="Ör. Kadıköy" className="h-9" />
                </Labeled>
                <Labeled label="Telefon">
                  <Input value={draft.phone ?? ""} onChange={(e) => set({ phone: e.target.value || null })} placeholder="+90 …" inputMode="tel" className="h-9" />
                </Labeled>
              </div>
            </div>

            {/* Text per locale */}
            <div>
              <div className="flex gap-1 border-b">
                {LOCALES.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLocale(l.id)}
                    className={cn("-mb-px flex items-center gap-1.5 border-b-2 px-3 pb-2 text-sm font-medium", l.id === locale ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
                  >
                    {l.label}
                    {!draft.translations[l.id]?.name && <span className="size-1.5 rounded-full bg-amber-500" title="Boş" />}
                  </button>
                ))}
              </div>
              <div className="space-y-4 pt-4">
                <Labeled label="Şube adı">
                  <Input value={cur.name} onChange={(e) => setT({ name: e.target.value })} className="h-10 font-semibold" />
                </Labeled>
                <Labeled label="Adres" hint={`${cur.address.length}/400`}>
                  <textarea rows={2} value={cur.address} onChange={(e) => setT({ address: e.target.value })} className={cn(field, "resize-y")} />
                </Labeled>

                <Labeled label="Çalışma saatleri" hint="Saat ‘10:00 - 22:00’ biçiminde olursa sitede ‘Şimdi açık’ gösterilir">
                  <div className="space-y-2">
                    {cur.hours.map((h, i) => (
                      <div key={i} className="flex gap-2">
                        <input value={h.day} onChange={(e) => setHour(i, { day: e.target.value })} placeholder={DAY_HINT[locale]} className={cn(field, "h-9 flex-1")} />
                        <input
                          value={h.time}
                          onChange={(e) => setHour(i, { time: e.target.value })}
                          placeholder="10:00 - 22:00"
                          className={cn(field, "h-9 w-36 tabular-nums", h.time && !/^\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}$/.test(h.time) && "border-amber-400")}
                        />
                        <button type="button" onClick={() => setT({ hours: cur.hours.filter((_, j) => j !== i) })} aria-label="Satırı sil" className="grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                          <X className="size-4" />
                        </button>
                      </div>
                    ))}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button type="button" onClick={() => setT({ hours: [...cur.hours, { day: cur.hours.length ? "" : DAY_HINT[locale], time: "" }] })} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted">
                        <Plus className="size-3.5" /> Satır ekle
                      </button>
                      {cur.hours.length === 1 &&
                        PRESETS.map((p) => (
                          <button key={p} type="button" onClick={() => setHour(0, { time: p })} className="rounded-md bg-muted px-2 py-1 text-xs tabular-nums text-muted-foreground hover:text-foreground">
                            {p}
                          </button>
                        ))}
                      {locale === "en" && !cur.hours.length && !!draft.translations.tr?.hours.length && (
                        <button type="button" onClick={copyHoursFromTr} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted">
                          <Copy className="size-3.5" /> Türkçeden kopyala
                        </button>
                      )}
                    </div>
                  </div>
                </Labeled>
              </div>
            </div>

            {/* Location */}
            <Labeled label="Konum" hint="Google Maps linkini yapıştır, koordinatlar dolsun">
              <div className="space-y-2">
                <Input
                  value={draft.mapsUrl ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    set({ mapsUrl: v || null, ...(readCoords(v) ?? {}) });
                  }}
                  placeholder="https://maps.google.com/…"
                  className="h-9"
                />
                <div className="flex gap-2">
                  <Input value={draft.latText} onChange={(e) => set({ latText: e.target.value })} placeholder="Enlem" inputMode="decimal" className="h-9 tabular-nums" />
                  <Input value={draft.lngText} onChange={(e) => set({ lngText: e.target.value })} placeholder="Boylam" inputMode="decimal" className="h-9 tabular-nums" />
                  {geoOk && (
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Haritada kontrol et"
                      className="grid size-9 shrink-0 place-items-center rounded-md border text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <MapPin className="size-4" />
                    </a>
                  )}
                </div>
                {!geoOk && <p className="text-xs text-amber-700">Koordinat yoksa şube haritada ve “Bana en yakın” aramasında çıkmaz.</p>}
              </div>
            </Labeled>

            {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            {!isNew && numId !== null && (
              <div className="rounded-xl border border-red-200 p-4">
                <p className="text-sm font-semibold text-red-700">Şubeyi sil</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Kalıcı, geri alınamaz. Yalnızca durumu “Kapalı” olan şubeler silinebilir. Silince adresi de boşalır.
                </p>
                <button
                  type="button"
                  onClick={() => (setTyped(""), setDelErr(""), setConfirm(true))}
                  disabled={detail?.status !== "closed"}
                  className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-md border border-red-300 px-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="size-4" /> Şubeyi sil
                </button>
                {detail?.status !== "closed" && <p className="mt-2 text-xs text-muted-foreground">Önce durumu “Kapalı” yapıp kaydet.</p>}
              </div>
            )}
          </div>
        )}

        {!isNew && numId !== null && (
          <ConfirmDialog
            open={confirm}
            onOpenChange={(o) => (setConfirm(o), setTyped(""), setDelErr(""))}
            title="Şube kalıcı olarak silinsin mi?"
            description={<>“{detail?.translations.tr?.name ?? ""}” ve adresi, saatleri ve bağlantıları silinir. Geri alınamaz. Onaylamak için şube adını aynen yaz.</>}
            confirmLabel="Kalıcı olarak sil"
            pending={deleting}
            error={delErr}
            onConfirm={() => {
              const expected = (detail?.translations.tr?.name ?? "").trim();
              if (typed.trim() !== expected) return setDelErr("Şube adı eşleşmiyor");
              startDelete(async () => {
                const r = await deleteBranch(numId);
                if (!r.ok) return setDelErr(r.error);
                setConfirm(false);
                onDeleted(numId);
                onClose();
              });
            }}
          >
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={detail?.translations.tr?.name ?? ""} className="h-9" autoFocus />
          </ConfirmDialog>
        )}

        {draft && (
          <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t bg-background/95 p-4 backdrop-blur">
            <span className="text-xs text-muted-foreground">{isNew ? "Yeni şube sitede “kapalı” olarak açılır" : dirty ? "Kaydedilmemiş değişiklik · ⌘S" : "Kaydedildi"}</span>
            <Button size="sm" onClick={save} disabled={!dirty || pending}>
              {pending && <Loader2 className="animate-spin" />} {isNew ? "Oluştur" : "Kaydet"}
            </Button>
          </div>
        )}

        <MediaPicker
          folder="branch"
          open={picker}
          onOpenChange={setPicker}
          onPick={(m) => {
            set({ imageId: m.id });
            setImagePath(m.path);
          }}
        />
      </SheetContent>
    </Sheet>
  );
}

function Labeled({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        {hint && <span className="text-right text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
