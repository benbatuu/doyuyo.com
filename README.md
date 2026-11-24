# Doyuyo! — web sitesi ve yönetim paneli

Monorepo: müşteri sitesi (`apps/web`), yönetim paneli (`apps/admin`) ve ortak paketler (`packages/*`).
Canlıya alma adımları: [DEPLOY.md](DEPLOY.md). Mimari ve veri modeli: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Gereksinimler

- Node 24, pnpm 10 (`corepack enable`)
- Docker (yerel Postgres 17 için)

## Yerel kurulum

```bash
pnpm install
cp .env.example .env              # değerleri düzenle (aşağıdaki tabloya bak)
cp .env apps/web/.env.local       # site aynı değerleri apps/web/.env.local'den okur
pnpm db:up                        # Postgres 17, port 5433
pnpm db:push                      # şemayı veritabanına uygula (yerelde db:push kullanılır)
pnpm db:seed                      # eski site verisini aktar (tools/legacy-import/output)
pnpm media:link                   # görselleri apps/web/public altına bağla
pnpm dev                          # site http://localhost:3000, panel http://localhost:3001
```

Panele giriş: `.env` içindeki `ADMIN_EMAIL` ve `ADMIN_PASSWORD` ile. Bu hesap “Sahip” rolündedir.

> Not: Yerel veritabanı `db:push` ile kuruldu. `db:migrate` (`src/db/migrations`) temiz bir veritabanında çalışır. Yerelde iki yöntemi karıştırma; sorun olursa `docker compose down -v` ile veritabanını sıfırla ve `db:push` + `db:seed` çalıştır.

## Ortam değişkenleri

| Değişken | Zorunlu | Açıklama |
|---|---|---|
| `DATABASE_URL` | evet | Postgres bağlantısı |
| `NEXT_PUBLIC_SITE_URL` | evet | Canonical, sitemap, hreflang. Yerelde `http://localhost:3000` |
| `ADMIN_EMAIL` | evet | Sahip hesabı (ortam hesabı, veritabanında saklanmaz) |
| `ADMIN_PASSWORD` | evet | Sahip şifresi (en az 12 karakter canlıda) |
| `ADMIN_SESSION_SECRET` | evet | Oturum imzası, en az 32 karakter |
| `INDEXNOW_KEY` | hayır | IndexNow anahtarı |
| `GOOGLE_SITE_VERIFICATION`, `BING_SITE_VERIFICATION`, `YANDEX_SITE_VERIFICATION` | hayır | Arama motoru doğrulama |
| `NEXT_PUBLIC_GA_ID` | hayır | Analitik (yalnızca çerez onayından sonra yüklenir) |
| `RESEND_API_KEY`, `FORM_NOTIFY_TO`, `FORM_NOTIFY_FROM` | hayır | Form bildirim e-postası |
| `ADMIN_PUBLIC_URL` | hayır | E-postadaki panel bağlantısı |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | hayır | Form spam koruması (ikisi birlikte) |
| `SEED_CONFIRM` | hayır | Yalnızca `yes` ise seed içerik tablolarını siler ve yeniden yazar |

Kontrol: `set -a; . ./.env; set +a; node scripts/check-env.mjs`

## Komutlar

| Komut | Ne yapar |
|---|---|
| `pnpm dev` | Site ve panel geliştirme sunucusu |
| `pnpm build` | Tüm uygulamalar (turbo) |
| `pnpm typecheck` | Tip kontrolü (CI'da da çalışır) |
| `pnpm check:arch` | Katman kuralları (core framework'e bağımlı olamaz) |
| `pnpm db:up` / `db:push` / `db:seed` | Yerel veritabanı |
| `pnpm db:migrate` | Migrasyonları uygula (canlıda otomatik) |
| `pnpm media:link` | Medya dosyalarını public altına bağla |
| `pnpm seo:audit` | `BASE=http://localhost:3000 pnpm seo:audit` ile sayfa denetimi |
| `pnpm seo:indexnow` | Canlıda URL bildirimi |
| `pnpm legacy:*` | Eski siteden veri çekme (`tools/legacy-import`) |

## Klasör yapısı

| Klasör | Görev |
|---|---|
| `packages/core` | Domain, use-case'ler, port'lar. Next veya Drizzle import edilemez. |
| `packages/infrastructure` | Drizzle şeması, repository'ler, `container()` (bağımlılık kökü), migrasyonlar, seed, şifre karma. |
| `packages/i18n` | Diller, slugify, bölüm URL parçaları (`/tr/subeler` ↔ `/en/branches`). |
| `packages/ui` | Tasarım tokenları (`tokens.css`), ikonlar, buton sınıfları. |
| `packages/seo` | JSON-LD üreticileri, açıklama ve metin yardımcıları. |
| `apps/web` | Müşteri sitesi (Next.js 16). |
| `apps/admin` | Yönetim paneli (Next.js 16). |
| `tools/legacy-import` | Eski siteyi tarayıp JSON + medya üreten araçlar. |

### Bir özelliği nereye ekleyeceğin

1. Kural ve doğrulama → `packages/core/src/application/use-cases/*`
2. Veri erişimi → `packages/infrastructure/src/db/repositories/*` (port `core/application/ports` içinde)
3. Bağlama → `packages/infrastructure/src/container.ts`
4. Panel sayfası → `apps/admin/src/app/(panel)/<ad>/page.tsx` + `actions.ts` + `components/<ad>/`. Sayfanın başında `requireAccess("<kaynak>")` çağır.
5. Site sayfası → `apps/web/src/app/[locale]/...`

Yeni panel alanı açarsan `packages/core/src/domain/access-admin.ts` içindeki `RESOURCES` listesine ekle ve kenar çubuğu eşlemesini (`apps/admin/src/app/(panel)/layout.tsx` içindeki `RESOURCE_OF`) güncelle.

## Önemli davranışlar

- **Bakım modu:** Ayarlar → “Bakım modu”. Açıkken tüm site bakım ekranını gösterir (logo, iletişim, sipariş kanalları görünür). Metinler: Sayfalar → “Bakım sayfası”. `/tr/bakim` ve `/en/bakim` yalnızca bakım açıkken çalışır, kapalıyken 404 döner.
- **Site önbelleği:** Sayfalar 60 saniyede bir yeniden üretilir. Panelde yapılan değişiklik en geç bir dakikada siteye yansır.
- **Yetkiler:** Roller ve izinler Kullanıcılar ekranında. Sahip her zaman tam yetkilidir.
- **Eski URL'ler:** `redirects` tablosu (eski siteden 757 kayıt) `proxy.ts` ile 301 yönlendirir.

## Kontrol listesi (değişiklik öncesi)

- [ ] `pnpm typecheck`
- [ ] `pnpm check:arch`
- [ ] Panelde değiştirdiğin sayfayı tarayıcıda aç
- [ ] Yetki değiştiyse editör/görüntüleyici ile test et
