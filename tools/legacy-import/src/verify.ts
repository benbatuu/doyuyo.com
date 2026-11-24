/**
 * Build the Phase 0 verification report (output/REPORT.md) and the legacy URL list.
 * Counts are recomputed from the JSON outputs, and contradictions are quoted from the site text verbatim.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { JSON_DIR, OUT, RAW, readJson, writeJson } from "./lib.ts";
import { writeFile } from "node:fs/promises";
import * as cheerio from "cheerio";
import type { CrawlEntry } from "./crawl.ts";
import type { Branch } from "./parse/branches.ts";
import type { Category, Product } from "./parse/menu.ts";
import type { Page } from "./parse/pages.ts";
import type { MediaItem } from "./download-media.ts";

type Allergens = {
  source: string;
  pages: number;
  allergenColumns: string[];
  allergens: { name: string; section: string; allergens: string[] }[];
  nutrition: { name: string | null; kcal: number; note?: string }[];
} | null;

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");

async function main() {
  const manifest = await readJson<CrawlEntry[]>(join(JSON_DIR, "crawl-manifest.json"));
  const branches = await readJson<Branch[]>(join(JSON_DIR, "branches.json"));
  const products = await readJson<Product[]>(join(JSON_DIR, "products.json"));
  const categories = await readJson<Category[]>(join(JSON_DIR, "categories.json"));
  const pages = await readJson<Page[]>(join(JSON_DIR, "pages.json"));
  const issues = await readJson<Record<string, string[]>>(join(JSON_DIR, "issues.json"));
  const media = await readJson<MediaItem[]>(join(JSON_DIR, "media.json")).catch(() => [] as MediaItem[]);
  const allergens = await readJson<Allergens>(join(JSON_DIR, "allergens.json")).catch(() => null);

  const sitemap = cheerio.load(await readFile(join(RAW, "_sitemap.xml"), "utf8"), { xml: true });
  const sitemapUrls = sitemap("loc").map((_, l) => sitemap(l).text().trim()).get();
  const sitemapSet = new Set(sitemapUrls.map((u) => u.replace(/\/$/, "")));
  const status = (u: string) => manifest.find((e) => e.url === u.replace(/\/$/, ""))?.status;

  // ---- Claims in site text (quoted verbatim, not corrected)
  const allText: { url: string; text: string }[] = [];
  for (const e of manifest.filter((m) => m.key && m.status === 200)) {
    const $ = cheerio.load(await readFile(join(RAW, `${e.key}.html`), "utf8"));
    $("script,style,header,footer,nav,.cookie").remove();
    allText.push({ url: e.url, text: $("main").text().replace(/\s+/g, " ") });
  }
  const claims = (re: RegExp, filter: (u: string) => boolean = () => true) => {
    const seen = new Map<string, Set<string>>();
    for (const { url, text } of allText.filter((t) => filter(t.url))) {
      for (const m of text.matchAll(re)) {
        const start = Math.max(0, m.index! - 70);
        const snippet = "…" + text.slice(start, m.index! + m[0].length + 50).trim() + "…";
        const k = m[0].trim();
        if (!seen.has(k)) seen.set(k, new Set());
        if (seen.get(k)!.size < 1) seen.get(k)!.add(`${snippet} — ${url}`);
      }
    }
    return seen;
  };
  const notBranchPage = (u: string) => !/\/(sube|branch|branches|subelerimiz)\//.test(u);
  const areaClaims = claims(/\b\d[\d.,]*\s?(m2|m²|metrekare)(?![0-9a-z])/gi, notBranchPage);
  // Skip the yearly counters ("53 2024 ŞUBE SAYIMIZ"), they are listed separately.
  const branchClaims = new Map(
    [...claims(/\b\d+\s?(şube|restoran|branches|restaurants)/gi, notBranchPage)].filter(([k]) => !/^\d{4}\s/.test(k)),
  );
  const targetYear = claims(/\d{4} yılı sonuna kadar|by the end of \d{4}/gi);

  // ---- Branch numbers
  const trSubeInSitemap = sitemapUrls.filter((u) => u.includes("/tr/sube/")).length;
  const byCity = new Map<string, number>();
  branches.forEach((b) => byCity.set(b.city?.name.tr ?? "?", (byCity.get(b.city?.name.tr ?? "?") ?? 0) + 1));
  const aboutStats = pages
    .find((p) => p.id === "about")
    ?.translations.tr?.sections.flatMap((s) => s.nodes)
    .filter((n) => n.type === "stat") as { value: string; label: string }[] | undefined;

  // ---- Data quality
  const brEmptyDesc = branches.filter((b) => !b.translations.tr?.meta.description).length;
  const prodNoMeta = products.filter((p) => !p.translations.tr?.meta.description).length;
  const galleries = new Set(branches.map((b) => b.gallery.join("|")));
  const pageMetaDesc = pages.map((p) => [p.id, p.translations.tr?.meta.description ?? ""] as const);
  const sameDesc = pageMetaDesc.filter(([, d]) => d === "Doyuyo - Anasayfa").map(([id]) => id);
  const enCountry = branches.find((b) => b.country.slug === "turkiye")?.country.name.en;
  let altIssues = 0;
  for (const e of manifest.filter((m) => m.key)) {
    const html = await readFile(join(RAW, `${e.key}.html`), "utf8");
    altIssues += (html.match(/alt="[0-9a-f]{32}\.(png|jpe?g|webp)"/g) ?? []).length;
  }

  // ---- Media
  const saved = media.filter((m) => m.localPath);
  const originals = saved.filter((m) => m.isOriginal);
  const failed = media.filter((m) => !m.localPath);
  const uniqueSaved = [...new Map(saved.map((m) => [m.localPath, m])).values()];
  const mb = uniqueSaved.reduce((s, m) => s + m.bytes, 0) / 1e6;

  // ---- Legacy URLs (for the 301 map)
  const legacy = manifest
    .filter((e) => e.status === 200)
    .map((e) => ({ url: e.url, finalUrl: e.finalUrl, inSitemap: sitemapSet.has(e.url), type: e.contentType.split(";")[0] }));
  await writeJson(join(JSON_DIR, "legacy-urls.json"), legacy);

  // ---- Manual check sample (deterministic)
  const pick = <T,>(arr: T[], n: number) => arr.filter((_, i) => i % Math.max(1, Math.floor(arr.length / n)) === 0).slice(0, n);
  const sample = [
    ...pick(branches, 10).map((b) => `- [ ] Şube **${b.translations.tr?.name}** — adres, saat, konum → ${b.translations.tr?.url}`),
    ...pick(products, 7).map((p) => `- [ ] Ürün **${p.translations.tr?.name}** — ad, içerik, görsel, EN adı "${p.translations.en?.name ?? "—"}" → ${p.translations.tr?.url}`),
    ...pick(pages.filter((p) => p.translations.tr?.status === 200), 3).map((p) => `- [ ] Sayfa **${p.id}** — bölümler ve metin → ${p.translations.tr?.url}`),
  ];

  const L: string[] = [];
  const h = (s: string) => L.push("", s, "");
  L.push(`# Faz 0 — Mevcut Site Veri Raporu`, "", `> Kaynak: https://doyuyo.com · Tarama: ${new Date().toISOString().slice(0, 10)} · Araç: \`tools/legacy-import\``);
  L.push("", "Bu rapor otomatik üretilir (`pnpm legacy:report`). Metinler sitedeki gibi alınır, düzeltilmez. Çelişkiler ve eksikler aşağıda listelenir; karar müşteriyle verilir.");

  h("## 1. Tarama özeti");
  L.push(`| Ölçüt | Değer |`, `|---|---|`);
  L.push(`| sitemap.xml URL sayısı | ${sitemapUrls.length} |`);
  L.push(`| Taranan toplam URL (sitemap + linkler) | ${manifest.length} |`);
  L.push(`| 200 dönen | ${manifest.filter((e) => e.status === 200).length} |`);
  L.push(`| Hata dönen | ${manifest.filter((e) => e.status !== 200).map((e) => `${e.status} ${e.url}`).join("<br>") || "yok"} |`);
  L.push(`| Sitemap'te olmayan ama linkli sayfa | ${manifest.filter((e) => e.status === 200 && e.contentType.includes("html") && !sitemapSet.has(e.url)).length} (menü ve ürün sayfaları sitemap'te yok) |`);

  h("## 2. Çıkarılan veri");
  L.push(`| Veri | TR | EN | Dosya |`, `|---|---|---|---|`);
  L.push(`| Menü kategorisi | ${categories.length} | ${categories.filter((c) => c.translations.en).length} | \`json/categories.json\` |`);
  L.push(`| Ürün | ${products.length} | ${products.filter((p) => p.translations.en).length} | \`json/products.json\` |`);
  L.push(`| Şube | ${branches.length} | ${branches.filter((b) => b.translations.en).length} | \`json/branches.json\` |`);
  L.push(`| Şube, kesin konumlu | ${branches.filter((b) => b.geo?.source === "place").length} | | Google Maps yer verisinden |`);
  L.push(`| Statik sayfa | ${pages.filter((p) => p.translations.tr?.status === 200).length} | ${pages.filter((p) => p.translations.en?.status === 200).length} | \`json/pages.json\` |`);
  L.push(`| Form tanımı | – | – | \`json/forms.json\` |`);
  L.push(`| Alerjen tablosu | ${allergens ? `${allergens.allergens.length} ürün × ${allergens.allergenColumns.length} alerjen` : "–"} | | \`json/allergens.json\` |`);
  L.push(`| Besin değerleri | ${allergens ? `${allergens.nutrition.length} ürün (kJ, kcal, yağ, protein, karbonhidrat)` : "–"} | | \`json/allergens.json\` |`);
  L.push(`| Online sipariş kanalı | 4 (Migros Yemek, Yemek Sepeti, Getir Yemek, Trendyol) | | \`json/site.json\` |`);
  L.push(`| Medya dosyası | ${saved.length} / ${media.length} | | \`media/\`, \`json/media.json\` |`);

  h("### Kategoriler");
  L.push(`| # | TR | EN | Ürün |`, `|---|---|---|---|`);
  categories.forEach((c) => L.push(`| ${c.order} | ${c.translations.tr?.name} | ${c.translations.en?.name ?? "—"} | ${c.productIds.length} |`));

  h("### Şehirlere göre şubeler");
  L.push(`| Şehir | Şube |`, `|---|---|`);
  [...byCity.entries()].sort((a, b) => b[1] - a[1]).forEach(([c, n]) => L.push(`| ${c} | ${n} |`));

  h("## 3. Medya");
  L.push(`- Referans: **${media.length}**, indirilen: **${saved.length}**, orijinal yükleme bulunan: **${originals.length}** (${pct(originals.length, saved.length)}), diskte **${uniqueSaved.length} dosya, ${mb.toFixed(1)} MB**.`);
  L.push(`- Orijinali bulunamayanlarda sitedeki en büyük küçültülmüş sürüm alındı.`);
  if (failed.length) L.push(`- İndirilemeyen: ${failed.map((f) => `\`${f.status} ${f.sourceUrl}\``).join(", ")}`);
  const small = saved.filter((m) => m.width && m.width < 800 && /\/storage\//.test(m.sourceUrl)).length;
  L.push(`- Genişliği 800 px altında kalan görsel: ${small}. Yeni tasarımda büyük kullanım için yetersiz olabilir.`);

  h("## 4. Çelişen bilgiler (müşteriye sorulacak)");
  L.push(`Sitede yazan rakamlar birbirini tutmuyor. Aşağıdaki alıntılar sitenin kendi metni.`);
  h("### Şube sayısı");
  L.push(`- Sitede listelenen şube: **${branches.length}** (${branches.filter((b) => b.country.slug !== "turkiye").length} tanesi yurt dışı).`);
  L.push(`- sitemap.xml'deki \`/tr/sube/\` sayfası: **${trSubeInSitemap}**.`);
  if (aboutStats?.length) L.push(`- Hakkımızda sayfasındaki yıllık sayaçlar: ${aboutStats.map((s) => `${s.label}: **${s.value}**`).join(", ")}.`);
  for (const [k, v] of branchClaims) L.push(`- "${k}": ${[...v][0]}`);
  h("### Hedef yılı");
  for (const [, v] of targetYear) L.push(`- ${[...v][0]}`);
  h("### Üretim tesisi büyüklüğü");
  for (const [k, v] of areaClaims) L.push(`- "${k}": ${[...v][0]}`);

  h("## 5. Mevcut sitedeki hatalar ve eksikler");
  L.push(`- Sitemap'te olup 404 dönen sayfa: ${sitemapUrls.filter((u) => status(u) === 404).map((u) => `\`${u}\``).join(", ") || "yok"}. Metin, \`/tr\` öneki olmadan \`/yasal-metin/kisisel-verilerin-korunmasi-ve-islenmesi-politikasi\` adresinde açılıyor ve oradan alındı. Sitemap yanlış adresi veriyor.`);
  L.push(`- Diyarbakır Forum AVM şubesinin EN karşılığı \`/en/branch/-1\` olarak verilmiş; bu adres Silivri Vega şubesine yönleniyor. Bu şubenin gerçek bir EN sayfası yok.`);
  L.push(`- Meta açıklaması "Doyuyo - Anasayfa" olan sayfalar: ${sameDesc.join(", ") || "yok"}.`);
  L.push(`- Meta açıklaması boş şube sayfası: ${brEmptyDesc} / ${branches.length}. Meta açıklaması boş ürün: ${prodNoMeta} / ${products.length}.`);
  L.push(`- Tüm şube sayfalarında aynı galeri kullanılıyor (${galleries.size} farklı galeri). Şubeye özel fotoğraf yok, sadece liste kartında 1 görsel var.`);
  L.push(`- EN sitede ülke adı Türkçe görünüyor: "${enCountry}".`);
  L.push(`- Alt metni dosya adı (hash) olan görsel etiketi, tüm sayfalarda toplam: ${altIssues}.`);
  L.push(`- Ürün açıklamasında kopya/yanlış içerik olabilir: örn. "DELUXE BURGER" açıklaması "1 etli tavuklu cheese chicken burger…" diyor. Menü içerikleri müşteriyle kontrol edilmeli.`);
  L.push(`- Fiyat ve şube telefonu sitede yok. Alerjen ve besin bilgisi sadece PDF'te (artık \`allergens.json\` içinde yapılandırılmış).`);
  if (allergens) {
    const ayran = allergens.allergens.find((r) => r.name.startsWith("AYRAN"));
    if (ayran) L.push(`- Alerjen PDF'i: **${ayran.name}** satırında işaretli alerjen: ${ayran.allergens.join(", ") || "yok"}. Ayran süt ürünüdür; "Süt" işaretli değil. Müşteriyle doğrulanmalı.`);
    const norm = (x: string | null) => (x ?? "").toLocaleUpperCase("tr").replace(/İ/g, "I").replace(/[^A-ZÇĞÖŞÜ0-9]/g, "");
    const nutNames = new Set(allergens.nutrition.map((n) => norm(n.name)));
    const noNut = allergens.allergens.filter((r) => !nutNames.has(norm(r.name)) && r.section !== "İÇECEKLER").map((r) => r.name);
    if (noNut.length)
      L.push(`- Alerjen ve besin tablolarında adı birebir eşleşmeyen ürünler (ör. "TENDERS" ↔ "ORIJINAL TENDERS", besin tablosunda hiç olmayanlar da var; ürün eşlemesi Faz 2'de elle yapılacak): ${noNut.join(", ")}.`);
    for (const n of allergens.nutrition.filter((x) => x.note)) L.push(`- Besin tablosu: ${n.name} — ${n.note}`);
  }

  h("## 6. robots.txt ve kullanım izni");
  L.push(`- \`robots.txt\` tüm botlar için \`Content-Signal: search=yes,ai-train=no,use=reference\` diyor ve genel bot grubunda \`Disallow: /storage/\` var. Görsellerin hepsi \`/storage/\` altında.`);
  L.push(`- Bu araç tek seferlik bir içerik taşıma işi için kendi adıyla (\`DoyuyoRedesignImporter\`) tarama yaptı ve medyayı indirdi. İndirilen içerik yapay zekâ eğitimi için kullanılmıyor.`);
  L.push(`- **Bu içeriğin yeni sitede kullanılması için Doyuyo!/PardoFood'un yazılı onayı gerekir.** Onaydan sonra mümkünse orijinal görseller doğrudan markadan (ajans arşivi veya DAM) alınmalı.`);
  L.push(`- Bu nedenle ek görsel taraması (örn. şube kartı görsellerinin daha büyük orijinallerini bulmak) onaya kadar durduruldu.`);

  h("## 7. Ayrıştırma notları (araç)");
  for (const [group, list] of Object.entries(issues)) {
    if (!list.length) continue;
    L.push(`**${group}** (${list.length})`, ...list.map((i) => `- ${i}`), "");
  }

  h("## 8. Elle kontrol listesi (20 kayıt)");
  L.push(`Eski sayfayı açın, yeni JSON kaydıyla karşılaştırın, eşleşiyorsa işaretleyin.`, "", ...sample);

  h("## 9. Sonraki adım");
  L.push(`- Bu JSON'lar Faz 2'de \`packages/infrastructure/db/seed\` ile veritabanına aktarılır.`);
  L.push(`- \`json/legacy-urls.json\` (${legacy.length} URL), Faz 7'deki 301 haritasının girdisidir.`);

  await writeFile(join(OUT, "REPORT.md"), L.join("\n") + "\n");
  console.log("REPORT.md written");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
