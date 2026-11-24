# Mimari

## Katmanlar

```
apps/web, apps/admin      (Next.js: sayfa, form, server action)
        │
packages/infrastructure   (Drizzle, repository, şifre karma, container())
        │
packages/core             (domain, use-case, port — framework yok)
        │
packages/i18n · ui · seo  (yardımcılar, saf fonksiyonlar)
```

Kural: `core` hiçbir dış framework'ü import etmez. `apps` doğrudan Drizzle kullanmaz; `container()` üzerinden use-case çağırır. `pnpm check:arch` bunu kontrol eder.

## Veri modeli (özet)

| Tablo | İçerik |
|---|---|
| `pages`, `page_translations` | Statik sayfalar (hakkımızda, iletişim, bakım…), dil başına başlık ve SEO |
| `categories`, `category_translations` | Menü kategorileri |
| `products`, `product_translations`, `product_categories` | Ürünler, çoklu kategori |
| `cities`, `city_translations`, `branches`, `branch_translations` | Şehir ve şube |
| `media`, `media_translations` | Dosyalar (görsel, PDF, video), dil başına alt metin |
| `routes` | Her içerik ve dil için public yol (`/tr/subeler`, `/en/branches`) |
| `redirects` | Eski siteden 757 yönlendirme ve sonradan yapılan slug değişiklikleri |
| `settings` | `(key, locale)` anahtarlı ayarlar: `site` (dil başına), `maintenance`, `access` (`locale = "*"`) |
| `form_submissions` | İletişim, kariyer, yatırımcı formları ve panel durumu |
| `admin_users` | Panel kullanıcıları, rol, aktiflik, scrypt şifre karması |

## Dil ve URL

- Diller: `tr` (varsayılan), `en`. `packages/i18n` yayımlanan dilleri ve bölüm segmentlerini tanımlar.
- Her içerik dil başına kendi slug'ını taşır. Bir dilde çevirisi olmayan sayfa o dilde 404'tür ve hreflang'e girmez.
- Yollar `routes` tablosundan çözülür. `apps/web/src/app/[locale]/[...slug]` tek bir catch-all rota; sabit segmentli rotalar (ör. `bakim`) önceliklidir.
- `apps/web/src/proxy.ts` eski adresleri `redirects` tablosuna göre 301'ler.

## Site (apps/web)

- Sayfalar `revalidate = 60` ile statik üretilir; panel değişikliği ≤ 60 sn içinde görünür.
- `[locale]/layout.tsx` her istekte `settings` ve bakım durumunu okur. Bakım açıksa tüm sayfaların yerine `MaintenanceScreen` döner (logo, iletişim, sipariş kanalları, sosyal medya).
- `/[locale]/bakim` yalnızca bakım açıkken var; kapalıyken `notFound()`.
- Arama için `packages/seo`: JSON-LD (Organization, WebSite, FastFoodRestaurant, Menu), `sitemap.xml` (indeks + pages, menu, branches, images), `llms.txt`.

## Panel (apps/admin)

- Giriş: `ADMIN_EMAIL`/`ADMIN_PASSWORD` (sahip, ortamda) **veya** `admin_users` içinde aktif kullanıcı (scrypt). Oturum: HMAC imzalı çerez (8 saat).
- Yetki: `access` ayarı içinde rol başına alan matrisi (`RESOURCES`). Sahip her zaman tam yetkili.
  - Sayfa koruması: `requireAccess("<kaynak>")` (`src/lib/access.ts`) yetkisiz kullanıcıyı `/?yetki=yok`'a yönlendirir.
  - Kenar çubuğu: yetkisi olmayan bağlantılar gizlenir (`(panel)/layout.tsx`).
- Sayfa düzeni: `app/(panel)/<ad>/page.tsx` (sunucu, veri), `actions.ts` (server action, yetki + çağrı), `components/<ad>/*` (istemci, etkileşim).

### Panel alanları

| Menü | Kaynak | Ne yapar |
|---|---|---|
| Özet | — | Gösterge |
| Formlar | `forms` | Gelen formlar, durum, not, CSV |
| Sayfalar | `content` | Sayfa içerikleri, menü yapısı; “Bakım sayfası” kartı |
| Yasal metinler | `content` | KVKK, gizlilik |
| Medya | `media` | Dosya kütüphanesi |
| Menü ve ürünler | `catalog` | Ürün ve kategori |
| Şubeler | `branches` | Şube bilgisi, durum |
| Alerjenler | `catalog` | Alerjen ve besin tablosu |
| SEO | `seo` | Her sayfanın Google başlığı/açıklaması, sayfalama |
| Çeviriler | `translations` | Site metinleri (çerez, menü etiketleri…) TR/EN |
| Kullanıcılar | `users` | Kullanıcılar, roller, izin matrisi |
| Ayarlar | `settings` | Bakım anahtarı, iletişim ve site bilgileri |

## Bakım modu akışı

1. Ayarlar → “Bakıma al” → onay → `settings['maintenance'].enabled = true`.
2. Web layout bir sonraki önbellek yenilemesinde (≤ 60 sn) bakım ekranını döner.
3. Metinler Sayfalar → “Bakım sayfası” ekranında TR/EN düzenlenir (`texts`).
4. Kapatmak Ayarlar'dan yapılır; metinler korunur.

## Bilinen teknik borç

- Migrasyon geçmişi (`src/db/migrations`) yerelde `db:push` ile kurulan veritabanıyla uyumsuz. Canlı temiz kurulumda sorun çıkmaz.
- Kod içinde eski `PLAN.md` referansları kalmış olabilir (yorumlar). Gerektiğinde temizlenmeli.
- Panel kayıt işlemlerinin çoğu yalnızca sayfa seviyesinde yetki kontrolü içerir; server action'lar tek tek korunmalı.
