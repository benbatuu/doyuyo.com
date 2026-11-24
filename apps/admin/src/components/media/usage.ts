import { Archive, Layers, LayoutGrid, MapPin, Package, Sparkles, FileText, type LucideIcon } from "lucide-react";
import type { MediaUsage } from "@doyuyo/core";

export type UsageFilter = MediaUsage | "unused" | "all";

/** Label, icon and a calm tint per usage group, so groups are easy to tell apart at a glance. */
export const USAGE_META: Record<UsageFilter, { label: string; icon: LucideIcon; chip: string; hint: string }> = {
  all: { label: "Tümü", icon: LayoutGrid, chip: "bg-muted text-foreground", hint: "Kütüphanedeki her dosya" },
  product: { label: "Ürünler", icon: Package, chip: "bg-red-50 text-red-700", hint: "Menüdeki ürün fotoğrafları" },
  category: { label: "Kategoriler", icon: Layers, chip: "bg-amber-50 text-amber-800", hint: "Menü kategori görselleri ve bannerları" },
  branch: { label: "Şubeler", icon: MapPin, chip: "bg-sky-50 text-sky-800", hint: "Şube fotoğrafları" },
  page: { label: "Sayfalar", icon: FileText, chip: "bg-violet-50 text-violet-800", hint: "Site sayfalarındaki görseller" },
  brand: { label: "Marka", icon: Sparkles, chip: "bg-emerald-50 text-emerald-800", hint: "Logo ve sipariş platformu logoları" },
  unused: { label: "Kullanılmayan", icon: Archive, chip: "bg-muted text-muted-foreground", hint: "Sitede hiçbir yerde kullanılmıyor" },
};

export const USAGE_ORDER: UsageFilter[] = ["all", "product", "category", "branch", "page", "brand", "unused"];
