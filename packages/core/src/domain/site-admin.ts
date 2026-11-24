/** Raw `settings.site` JSON for one locale (shape as stored). */
export type SiteRaw = Record<string, any>;

export interface SiteTextSpec {
  key: string;
  group: string;
  label: string;
  multiline: boolean;
}

export interface SiteTextRow extends SiteTextSpec {
  /** Link target shown under nav labels (TR path), for orientation only. */
  hint: string;
  tr: string;
  en: string;
}

const FIXED: SiteTextSpec[] = [
  { key: "cookie.text", group: "Çerez", label: "Metin", multiline: true },
  { key: "cookie.button", group: "Çerez", label: "Buton", multiline: false },
  { key: "orderPlatforms.title", group: "Online satış", label: "Başlık", multiline: false },
  { key: "orderPlatforms.text", group: "Online satış", label: "Metin", multiline: true },
  { key: "headOffice.address", group: "Genel", label: "Merkez adres", multiline: true },
  { key: "phone.label", group: "Genel", label: "Telefon metni", multiline: false },
  { key: "copyright", group: "Genel", label: "Telif metni", multiline: false },
];

const NAV: { path: "headerNav" | "footerNav" | "legalNav"; group: string }[] = [
  { path: "headerNav", group: "Üst menü" },
  { path: "footerNav", group: "Alt menü" },
  { path: "legalNav", group: "Yasal menü" },
];

const NAV_KEY = /^(headerNav|footerNav|legalNav)\.\d+\.label$/;
const FIXED_KEYS = new Set(FIXED.map((f) => f.key));

/** Only these paths can be edited from the panel. */
export const isSiteTextKey = (k: string) => FIXED_KEYS.has(k) || NAV_KEY.test(k);
export const siteTextPath = (k: string) => k.split(".");

const read = (o: SiteRaw | undefined, path: string[]): string => {
  const v = path.reduce<any>((a, p) => (a == null ? undefined : a[p]), o);
  return typeof v === "string" ? v : "";
};

/** Editable texts, TR and EN side by side. Nav rows are generated from the stored menus. */
export function siteTextTable(tr: SiteRaw, en: SiteRaw): SiteTextRow[] {
  const specs: SiteTextSpec[] = [...FIXED];
  for (const n of NAV) {
    const items: unknown[] = Array.isArray(tr[n.path]) ? tr[n.path] : [];
    items.forEach((_, i) => specs.push({ key: `${n.path}.${i}.label`, group: n.group, label: `Bağlantı ${i + 1}`, multiline: false }));
  }
  return specs.map((s) => {
    const p = siteTextPath(s.key);
    const hintPath = s.key.replace(/\.label$/, ".href").split(".");
    return { ...s, hint: read(tr, hintPath), tr: read(tr, p), en: read(en, p) };
  });
}
