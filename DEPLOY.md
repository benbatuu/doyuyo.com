# Canlıya alma

Hedef: `https://doyuyo.com` (site), `https://admin.doyuyo.com` (panel). Sunucuda Docker ve Compose v2 yeterli.

## 0. Önkoşullar

- Sunucu IP'si: DNS kayıtları `doyuyo.com`, `www.doyuyo.com`, `admin.doyuyo.com` için bu IP'ye gösterir.
- Portlar 80 ve 443 açık (Caddy sertifikayı kendisi alır).
- Resend alan adı doğrulanmış (form e-postası için, isteğe bağlı).

## 1. Ortam dosyası

```bash
cp .env.example .env.production
```

Doldur:

- `POSTGRES_PASSWORD` (güçlü, yeni). `DATABASE_URL` compose içinde otomatik oluşur.
- `ADMIN_EMAIL` gerçek bir adres olmalı (`.local` olamaz). `ADMIN_PASSWORD` en az 12 karakter.
- `ADMIN_SESSION_SECRET`: `openssl rand -base64 48`
- Arama motoru, analitik, Resend, Turnstile değerleri (opsiyonel, bkz. README tablosu).

Kontrol:

```bash
set -a; . ./.env.production; set +a
node scripts/check-env.mjs
```

Hata varsa devam etme.

## 2. Medya

```bash
pnpm install --frozen-lockfile
pnpm media:link
```

Marka onayı alınmadan görseller ve PDF'ler yayına alınmaz (durum: onay bekleniyor).

## 3. Ayağa kaldır

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Sıra: `db` hazır olur → `migrate` migrasyonları uygular → `web` ve `admin` başlar → `caddy` açılır.

Kontrol: `docker compose -f docker-compose.prod.yml ps` (migrate `exited (0)` olmalı).

## 4. İlk veri (yalnızca bir kez)

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm -e SEED_CONFIRM=yes tools pnpm db:seed
```

Bu komut içerik tablolarını **siler ve yeniden yazar**. İkinci kez çalıştırma. Canlıda panelden yapılan içerik değişiklikleri varsa seed'i çalıştırma.

## 5. Doğrulama

- `https://doyuyo.com/api/health` → 200
- `https://doyuyo.com/robots.txt` → `Sitemap:` satırı var
- `https://doyuyo.com/sitemap.xml`, `https://doyuyo.com/llms.txt`
- `https://www.doyuyo.com` → `https://doyuyo.com` (301)
- `https://admin.doyuyo.com/login` → giriş ekranı, `ADMIN_EMAIL` ile girilebiliyor

## 6. İlk yönetim adımları

1. Panelde Kullanıcılar → gerçek editörleri ekle (geçici şifre ver, ilk girişte değiştirmelerini iste).
2. Roller ve izinler → editör ve görüntüleyici için alanları ayarla.
3. Ayarlar → iletişim bilgileri (e-posta, telefon, adres, harita, sosyal medya).
4. Bakım modu kapalı olduğunu kontrol et (Ayarlar).

## 7. Arama motorları

1. Google Search Console ve Bing Webmaster Tools'a `doyuyo.com` ekle. Doğrulama meta değerlerini `.env.production` içine yaz, `docker compose ... up -d` ile yeniden başlat.
2. Sitemap'i gönder: `https://doyuyo.com/sitemap.xml`.
3. IndexNow: `INDEXNOW_KEY=… NEXT_PUBLIC_SITE_URL=https://doyuyo.com pnpm seo:indexnow`.
4. Denetim: `BASE=https://doyuyo.com pnpm seo:audit`.

## 8. Form e-postası (isteğe bağlı)

Resend'de alan adını doğrula. `RESEND_API_KEY`, `FORM_NOTIFY_TO`, `FORM_NOTIFY_FROM` değerlerini yaz. Spam için Turnstile anahtarlarını ekle (ikisi birlikte).

## Güncelleme (yeni sürüm)

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

`migrate` yeni migrasyonları otomatik uygular. Migrasyon hata verirse `web` ve `admin` başlamaz; logu oku: `docker compose -f docker-compose.prod.yml logs migrate`.

## Geri alma

- Kod: önceki commit'i checkout et ve aynı komutu çalıştır.
- Veritabanı: migrasyonlar geri alınmaz. Yedekten dön (aşağıdaki yedek adımı).

## Yedek

Günlük yedek önerilir:

```bash
docker compose -f docker-compose.prod.yml exec -T db pg_dump -U doyuyo doyuyo | gzip > backup-$(date +%F).sql.gz
```

Yedeği sunucu dışında sakla. Geri yükleme: `gunzip -c backup.sql.gz | docker compose -f docker-compose.prod.yml exec -T db psql -U doyuyo doyuyo`.

## Bilinen sınırlar

- Panel oturumu tek ortam hesabı (sahip) ve panel kullanıcıları ile çalışır. İki faktörlü doğrulama yok.
- Yetki kontrolü sayfa seviyesinde. Eski modüllerin kayıt işlemleri (server action) tek tek korunmuyor. Editör ve görüntüleyiciye yalnızca ilgili sayfalar açık, ama bu sınır kod tarafında tamamlanmalı.
- Bakım sayfası HTTP 200 döner (503 değil). Arama motorları için `noindex` eklenir, ama uzun bakımda 503 daha doğru olur.
