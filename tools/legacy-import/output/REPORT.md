# Faz 0 — Mevcut Site Veri Raporu

> Kaynak: https://doyuyo.com · Tarama: 2026-11-23 · Araç: `tools/legacy-import`

Bu rapor otomatik üretilir (`pnpm legacy:report`). Metinler sitedeki gibi alınır, düzeltilmez. Çelişkiler ve eksikler aşağıda listelenir; karar müşteriyle verilir.

## 1. Tarama özeti

| Ölçüt | Değer |
|---|---|
| sitemap.xml URL sayısı | 451 |
| Taranan toplam URL (sitemap + linkler) | 793 |
| 200 dönen | 792 |
| Hata dönen | 404 https://doyuyo.com/tr/yasal-metin/kisisel-verilerin-korunmasi-ve-islenmesi-politikasi |
| Sitemap'te olmayan ama linkli sayfa | 340 (menü ve ürün sayfaları sitemap'te yok) |

## 2. Çıkarılan veri

| Veri | TR | EN | Dosya |
|---|---|---|---|
| Menü kategorisi | 9 | 9 | `json/categories.json` |
| Ürün | 48 | 48 | `json/products.json` |
| Şube | 93 | 92 | `json/branches.json` |
| Şube, kesin konumlu | 91 | | Google Maps yer verisinden |
| Statik sayfa | 13 | 12 | `json/pages.json` |
| Form tanımı | – | – | `json/forms.json` |
| Alerjen tablosu | 52 ürün × 14 alerjen | | `json/allergens.json` |
| Besin değerleri | 39 ürün (kJ, kcal, yağ, protein, karbonhidrat) | | `json/allergens.json` |
| Online sipariş kanalı | 4 (Migros Yemek, Yemek Sepeti, Getir Yemek, Trendyol) | | `json/site.json` |
| Medya dosyası | 633 / 633 | | `media/`, `json/media.json` |

### Kategoriler

| # | TR | EN | Ürün |
|---|---|---|---|
| 1 | BAŞLANGIÇLAR | STARTERS | 8 |
| 2 | DOYASIYA ÇITIR COMBO | FULL-ON CRISPY COMBO | 7 |
| 3 | ACISEVER | SPICE LOVERS | 5 |
| 4 | TENDERS | TENDERS | 4 |
| 5 | SPICY WINGS | SPICY WINGS | 4 |
| 6 | CHICKEN BURGER | CHICKEN BURGER | 6 |
| 7 | BURGER | BURGER | 6 |
| 8 | LİMONATALAR | LEMONADES | 3 |
| 9 | GURME SOSLAR | GOURMET SAUCES | 9 |

### Şehirlere göre şubeler

| Şehir | Şube |
|---|---|
| İstanbul | 42 |
| Antalya | 6 |
| Bursa | 6 |
| İzmir | 5 |
| Ankara | 4 |
| Kocaeli | 4 |
| Adana | 3 |
| Denizli | 2 |
| Konya | 2 |
| Gaziantep | 2 |
| Sakarya | 2 |
| Balıkesir | 1 |
| Batman | 1 |
| Dubai | 1 |
| Edirne | 1 |
| Muğla | 1 |
| Eskişehir | 1 |
| Diyarbakır | 1 |
| Kayseri | 1 |
| Mersin | 1 |
| Isparta | 1 |
| Erzurum | 1 |
| Samsun | 1 |
| Kütahya | 1 |
| Tekirdağ | 1 |
| Van | 1 |

## 3. Medya

- Referans: **633**, indirilen: **633**, orijinal yükleme bulunan: **457** (72%), diskte **507 dosya, 92.9 MB**.
- Orijinali bulunamayanlarda sitedeki en büyük küçültülmüş sürüm alındı.
- Genişliği 800 px altında kalan görsel: 143. Yeni tasarımda büyük kullanım için yetersiz olabilir.

## 4. Çelişen bilgiler (müşteriye sorulacak)

Sitede yazan rakamlar birbirini tutmuyor. Aşağıdaki alıntılar sitenin kendi metni.

### Şube sayısı

- Sitede listelenen şube: **93** (1 tanesi yurt dışı).
- sitemap.xml'deki `/tr/sube/` sayfası: **76**.
- Hakkımızda sayfasındaki yıllık sayaçlar: 2024 ŞUBE SAYIMIZ: **53**, 2023 ŞUBE SAYIMIZ: **45**, 2022 ŞUBE SAYIMIZ: **33**, 2021 ŞUBE SAYIMIZ: **24**, 2020 ŞUBE SAYIMIZ: **18**, 2019 ŞUBE SAYIMIZ: **9**.
- "10 şube": …olanak sağlayan dinamik bir alt yapıya sahip olan Doyuyo, ilk 3 ayda 10 şubeye ulaştı. Dünyanın farklı bölgelerinde sevilen kı… — https://doyuyo.com/biz-kimiz
- "91 şube": …s ve self servis hizmetleri ile misafirlerine hizmet vermekte. Bugün 91 şubesi ile Türkiye’nin farklı noktalarında müşterile… — https://doyuyo.com/biz-kimiz
- "100 şube": …lı noktalarında müşterileriyle buluşan marka, 2026 yılı sonuna kadar 100 şubeye ulaşmayı hedefliyor. 53 2024 ŞUBE SAYIMIZ 45 20… — https://doyuyo.com/biz-kimiz
- "140 şube": …ılında markayı tüm Türkiye’de üst bilinirlik seviyesine sahip, toplam 140 şubesi olan bir zincire dönüştürdü. Tavuk Dünyası 2017… — https://doyuyo.com/biz-kimiz
- "11 şube": …san’ı kurdu. Carmelo Coffee markası Türkiye’nin farklı noktalarındaki 11 şubesi ile hizmet verirken Pan Artisan markası da kısa… — https://doyuyo.com/biz-kimiz
- "10 branches": …a dynamic infrastructure that allows for rapid growth and has reached 10 branches in the first 3 months. Doyuyo!, which prepares th… — https://doyuyo.com/en/about-us
- "91 branches": …ervice. Doyuyo! meets its customers in different parts of Turkey with 91 branches today and aims to reach 100 branches by the end o… — https://doyuyo.com/en/about-us
- "100 branches": …in different parts of Turkey with 91 branches today and aims to reach 100 branches by the end of 2025. 53 Number of Branches 2024 45… — https://doyuyo.com/en/about-us
- "140 branches": …a, and in 2017, it transformed the brand into a chain with a total of 140 branches with a high brand awareness in Turkey. Tavuk Düny… — https://doyuyo.com/en/about-us
- "14 branches": …sandwich buns for Doyuyo! While the Carmelo Coffee brand serves with 14 branches in different parts of Turkey, Pan Artisan brand h… — https://doyuyo.com/en/about-us

### Hedef yılı

- …i ile Türkiye’nin farklı noktalarında müşterileriyle buluşan marka, 2026 yılı sonuna kadar 100 şubeye ulaşmayı hedefliyor. 53 2024 ŞUBE SAYI… — https://doyuyo.com/biz-kimiz
- …parts of Turkey with 91 branches today and aims to reach 100 branches by the end of 2025. 53 Number of Branches 2024 45 Number of Branches… — https://doyuyo.com/en/about-us

### Üretim tesisi büyüklüğü

- "2000 m2": …atkısız ve lezzetli burger ve sandviç ekmeği üretmek üzere Gebze’deki 2000 m2 kapalı alana yapılan yatırımla kurulan Pan Artisa… — https://doyuyo.com/biz-kimiz
- "3,000 m2": …ut in the facility located in Gebze Şekerpınar, with a closed area of 3,000 m2. Discover! Lemonade Refreshment at Doyuyo! Doyuyo… — https://doyuyo.com/en/flavors
- "4000 m2": …days. Doyuyo!, The Manufacturer!Doyuyo! produces its main products in 4000 m2 production facilities under the roof of PardoFood… — https://doyuyo.com/en/investor
- "1500 m2": …Meat Production and Processing Facility operating in an approximately 1500 m2 closed area in Idealtepe, Istanbul.Chicken produc… — https://doyuyo.com/en/materials
- "3.000 m2": …m sos ile baharat karışımlarının üretimi ise, Gebze Şekerpınar’da yer 3.000 m2 kapalı alana yerleşik tesiste gerçekleştiriliyor.… — https://doyuyo.com/lezzetlerimiz
- "6000 m2": …ünleri Doyuyo menüsünde kullanılan tüm tavuk ve et ürünleri, yaklaşık 6000 m2’lik kapalı alanda faaliyet göstermekte olan moder… — https://doyuyo.com/malzemelerimiz
- "6.000 m2": …rı ve menüde yer alan tüm sos ile baharat karışımlarının üretimi ise, 6.000 m2 kapalı alana yerleşik tesiste gerçekleştirilmekte… — https://doyuyo.com/malzemelerimiz

## 5. Mevcut sitedeki hatalar ve eksikler

- Sitemap'te olup 404 dönen sayfa: `https://doyuyo.com/tr/yasal-metin/kisisel-verilerin-korunmasi-ve-islenmesi-politikasi`. Metin, `/tr` öneki olmadan `/yasal-metin/kisisel-verilerin-korunmasi-ve-islenmesi-politikasi` adresinde açılıyor ve oradan alındı. Sitemap yanlış adresi veriyor.
- Diyarbakır Forum AVM şubesinin EN karşılığı `/en/branch/-1` olarak verilmiş; bu adres Silivri Vega şubesine yönleniyor. Bu şubenin gerçek bir EN sayfası yok.
- Meta açıklaması "Doyuyo - Anasayfa" olan sayfalar: home.
- Meta açıklaması boş şube sayfası: 50 / 93. Meta açıklaması boş ürün: 10 / 48.
- Tüm şube sayfalarında aynı galeri kullanılıyor (1 farklı galeri). Şubeye özel fotoğraf yok, sadece liste kartında 1 görsel var.
- EN sitede ülke adı Türkçe görünüyor: "Türkiye".
- Alt metni dosya adı (hash) olan görsel etiketi, tüm sayfalarda toplam: 1312.
- Ürün açıklamasında kopya/yanlış içerik olabilir: örn. "DELUXE BURGER" açıklaması "1 etli tavuklu cheese chicken burger…" diyor. Menü içerikleri müşteriyle kontrol edilmeli.
- Fiyat ve şube telefonu sitede yok. Alerjen ve besin bilgisi sadece PDF'te (artık `allergens.json` içinde yapılandırılmış).
- Alerjen PDF'i: **AYRAN (TAM YAĞLI)** satırında işaretli alerjen: Soya. Ayran süt ürünüdür; "Süt" işaretli değil. Müşteriyle doğrulanmalı.
- Alerjen ve besin tablolarında adı birebir eşleşmeyen ürünler (ör. "TENDERS" ↔ "ORIJINAL TENDERS", besin tablosunda hiç olmayanlar da var; ürün eşlemesi Faz 2'de elle yapılacak): TENDERS, CHEDDAR SOS, DOUBLE CHICKEN BURGER, TENDERS ROYAL, ACILI CHEESE TENDERS ROYALE, SOSLU PATATES - CHEDDAR İLAVELİ, TURŞU, 4'LÜ ACI TATLI CHICKERS, ACI TATLI CHICKERS PATATES.
- Besin tablosu: KETÇAP — PDF'te satır adı ayrı metin olarak duruyor; bloktaki tek isimsiz satır KETÇAP ile eşlendi. Elle doğrulanmalı.

## 6. robots.txt ve kullanım izni

- `robots.txt` tüm botlar için `Content-Signal: search=yes,ai-train=no,use=reference` diyor ve genel bot grubunda `Disallow: /storage/` var. Görsellerin hepsi `/storage/` altında.
- Bu araç tek seferlik bir içerik taşıma işi için kendi adıyla (`DoyuyoRedesignImporter`) tarama yaptı ve medyayı indirdi. İndirilen içerik yapay zekâ eğitimi için kullanılmıyor.
- **Bu içeriğin yeni sitede kullanılması için Doyuyo!/PardoFood'un yazılı onayı gerekir.** Onaydan sonra mümkünse orijinal görseller doğrudan markadan (ajans arşivi veya DAM) alınmalı.
- Bu nedenle ek görsel taraması (örn. şube kartı görsellerinin daha büyük orijinallerini bulmak) onaya kadar durduruldu.

## 7. Ayrıştırma notları (araç)

**menu** (1)
- product page not linked from any category: https://doyuyo.com/en/menu/spicy-wings-9

**branches** (4)
- TR branch page links to an EN page that is not this branch: doyuyo-forum-diyarbakir-avm -> https://doyuyo.com/en/branch/-1 (resolves to https://doyuyo.com/en/branch/doyuyo-silivri-vega-mall)
- branch without EN version: doyuyo-forum-diyarbakir-avm
- branch coordinates are approximate (embed): doyuyo-istiklal-caddesi
- branch without coordinates: doyuyo-meydan-avm


## 8. Elle kontrol listesi (20 kayıt)

Eski sayfayı açın, yeni JSON kaydıyla karşılaştırın, eşleşiyorsa işaretleyin.

- [ ] Şube **Doyuyo! Adana Optimum AVM** — adres, saat, konum → https://doyuyo.com/sube/adana-optimum-avm
- [ ] Şube **Doyuyo! Avlu34 AVM** — adres, saat, konum → https://doyuyo.com/sube/doyuyo-avlu34-avm
- [ ] Şube **Doyuyo! Bursa Özdilek Park** — adres, saat, konum → https://doyuyo.com/sube/doyuyo-bursa-ozdilek-park
- [ ] Şube **Doyuyo! Espark Eskişehir AVM** — adres, saat, konum → https://doyuyo.com/sube/doyuyo-espark-eskisehir-avm
- [ ] Şube **Doyuyo! İstiklal Caddesi** — adres, saat, konum → https://doyuyo.com/sube/doyuyo-istiklal-caddesi
- [ ] Şube **Doyuyo! Karşıyaka Hilltown AVM** — adres, saat, konum → https://doyuyo.com/sube/doyuyo-karsiyaka-hilltown-avm
- [ ] Şube **Doyuyo! Mall Of İstanbul** — adres, saat, konum → https://doyuyo.com/sube/doyuyo-mall-of-istanbul
- [ ] Şube **Doyuyo! Meydan AVM** — adres, saat, konum → https://doyuyo.com/sube/doyuyo-meydan-avm
- [ ] Şube **Doyuyo! Sakarya Cadde 54 AVM** — adres, saat, konum → https://doyuyo.com/sube/doyuyo-sakarya-cadde-54-avm
- [ ] Şube **Doyuyo! Torium AVM** — adres, saat, konum → https://doyuyo.com/sube/doyuyo-torium-avm
- [ ] Ürün **SOSLU PATATES CHEDDAR İLAVELİ** — ad, içerik, görsel, EN adı "SAUCED POTATOES WITH CHEDDAR" → https://doyuyo.com/menu/baslangiclar/soslu-patates-cheddar-ilaveli
- [ ] Ürün **ACI TATLI CHICKERS & PATATES** — ad, içerik, görsel, EN adı "SPICY AND SWEET CHICKERS & FRIES" → https://doyuyo.com/menu/baslangiclar/aci-tatli-chickers-patates
- [ ] Ürün **CHEESEBURGER FESTİVAL** — ad, içerik, görsel, EN adı "CHEESEBURGER FESTIVAL" → https://doyuyo.com/menu/doyasiya-citir-combo/cheeseburger-festival
- [ ] Ürün **SPICY WINGS 9’LU** — ad, içerik, görsel, EN adı "SPICY WINGS 9" → https://doyuyo.com/menu/acisever/spicy-wings-9-lu
- [ ] Ürün **COSMO WINGS** — ad, içerik, görsel, EN adı "COSMO WINGS" → https://doyuyo.com/menu/spicywings/cosmo-wings
- [ ] Ürün **ACILI CHEESE CHICKEN BURGER** — ad, içerik, görsel, EN adı "SPICY CHEESE CHICKEN BURGER" → https://doyuyo.com/menu/chicken-burger/acili-cheese-chicken-burger
- [ ] Ürün **ÇİLEKLİ LİMONATA** — ad, içerik, görsel, EN adı "STRAWBERRY LEMONADE" → https://doyuyo.com/menu/limonatalar/cilekli-limonata
- [ ] Sayfa **home** — bölümler ve metin → https://doyuyo.com
- [ ] Sayfa **investor** — bölümler ve metin → https://doyuyo.com/yatirimci
- [ ] Sayfa **branches** — bölümler ve metin → https://doyuyo.com/subelerimiz

## 9. Sonraki adım

- Bu JSON'lar Faz 2'de `packages/infrastructure/db/seed` ile veritabanına aktarılır.
- `json/legacy-urls.json` (792 URL), Faz 7'deki 301 haritasının girdisidir.
