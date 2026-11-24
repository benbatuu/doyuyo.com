# legacy-import

Mevcut doyuyo.com içeriğini yeni site için JSON ve medya dosyalarına çevirir (Faz 0).

```bash
pnpm crawl                          # sitemap + linkler -> output/raw/*.html
pnpm parse                          # -> output/json/*.json (metin aynen, düzeltme yok)
pnpm media -- --client-approved     # görseller/PDF'ler -> output/media/ (marka onayı gerekir)
pnpm allergens                      # alerjen + besin PDF'i -> output/json/allergens.json
pnpm report                         # -> output/REPORT.md
```

| Dosya | İçerik |
|---|---|
| `categories.json`, `products.json` | 9 kategori, 48 ürün, TR+EN, eski URL'ler |
| `branches.json` | 93 şube: il/ilçe, adres, saatler, koordinat, açıklama, TR+EN |
| `pages.json` | statik sayfalar, sıralı içerik blokları, meta |
| `site.json` | menüler, sosyal linkler, sipariş platformları, çerez metni |
| `forms.json` | iletişim, kariyer, yatırımcı form alanları |
| `allergens.json` | 52 ürün × 14 alerjen, 39 ürün besin değeri |
| `media.json` | her görselin kaynağı, yerel yolu, boyutu, orijinal mi |
| `legacy-urls.json` | 301 haritası için tüm eski URL'ler |

Notlar: `robots.txt` genel botlar için `/storage/` yolunu engelliyor ve `ai-train=no` diyor. Medya sadece marka onayıyla, taşıma amacıyla kullanılmalı.
