/**
 * Demo form submissions for the admin inbox (dev only).
 * Run: pnpm --filter @doyuyo/infrastructure db:seed:demo
 * Re-running first deletes earlier demo rows (emails ending in @example.com).
 */
import { sql } from "drizzle-orm";
import { createDb } from "../client.ts";
import { formSubmissions } from "../schema/index.ts";

type Row = typeof formSubmissions.$inferInsert;

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);
const UA = {
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  android: "Mozilla/5.0 (Linux; Android 15; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36",
  ipad: "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
};
const device = {
  iphone: { type: "mobile", os: "iOS", browser: "Safari", screen: "390x844", language: "tr-TR" },
  mac: { type: "desktop", os: "macOS", browser: "Chrome", screen: "1512x982", language: "tr-TR" },
  android: { type: "mobile", os: "Android", browser: "Chrome", screen: "412x915", language: "tr-TR" },
  ipad: { type: "tablet", os: "iPadOS", browser: "Safari", screen: "820x1180", language: "en-GB" },
};
const geo = (city: string, region: string, country = "TR") => ({ country, region, city, timezone: "Europe/Istanbul", source: "ip-header" });

const base = (h: number, d: keyof typeof device, extra: Partial<Row> = {}): Omit<Row, "type" | "data"> => ({
  status: "new",
  locale: "tr",
  pagePath: "/",
  pageTitle: null,
  referrer: null,
  utm: null,
  ip: "203.0.113." + Math.floor(Math.random() * 200 + 10),
  userAgent: UA[d],
  device: device[d],
  geo: geo("İstanbul", "İstanbul"),
  consentAt: hoursAgo(h),
  consentVersion: "kvkk-2025-01",
  notes: "",
  createdAt: hoursAgo(h),
  updatedAt: hoursAgo(h),
  ...extra,
});

const rows: Row[] = [
  // investor
  {
    type: "investor",
    data: { name: "Mert", surname: "Aydın", phone: "+90 532 410 22 18", email: "mert.aydin@example.com", country: "turkiye", province: "Antalya", district: "Muratpaşa", job: "Restoran işletmecisi", storeSize: "180", budget: "8.000.000" },
    ...base(2, "mac", { pagePath: "/yatirimci-ol", pageTitle: "Yatırımcı Ol | Doyuyo", referrer: "https://www.google.com/", utm: { utm_source: "google", utm_medium: "cpc", utm_campaign: "franchise-2026" }, geo: geo("Antalya", "Antalya") }),
  },
  {
    type: "investor",
    data: { name: "Zeynep", surname: "Kara", phone: "+90 544 118 76 30", email: "zeynep.kara@example.com", country: "turkiye", province: "İzmir", district: "Bornova", job: "Mali müşavir", storeSize: "120", budget: "5.500.000" },
    ...base(26, "iphone", { status: "in_progress", pagePath: "/yatirimci-ol", pageTitle: "Yatırımcı Ol | Doyuyo", referrer: "https://www.instagram.com/", utm: { utm_source: "instagram", utm_medium: "social" }, geo: geo("İzmir", "İzmir"), notes: "Pazartesi 14:00 görüşme ayarlandı. Bornova AVM lokasyonu soruldu." }),
  },
  {
    type: "investor",
    data: { name: "Burak", surname: "Şahin", phone: "+90 505 902 44 71", email: "burak.sahin@example.com", country: "turkiye", province: "Ankara", district: "Çankaya", job: "İnşaat mühendisi", storeSize: "90", budget: "4.000.000" },
    ...base(170, "android", { status: "done", pagePath: "/yatirimci-ol", pageTitle: "Yatırımcı Ol | Doyuyo", geo: geo("Ankara", "Ankara"), notes: "Ön görüşme yapıldı, sunum dosyası gönderildi." }),
  },
  // contact
  {
    type: "contact",
    data: { name: "Elif", surname: "Yıldız", phone: "+90 533 287 15 09", email: "elif.yildiz@example.com", subject: "complaint", message: "Dün akşam Piazza AVM şubesinden sipariş verdim, menüdeki patates eksik geldi. Fiş fotoğrafını iletebilirim." },
    ...base(1, "iphone", { pagePath: "/iletisim", pageTitle: "İletişim | Doyuyo", geo: geo("Samsun", "Samsun") }),
  },
  {
    type: "contact",
    data: { name: "Can", surname: "Demir", phone: "+90 542 650 33 81", email: "can.demir@example.com", subject: "franchise", message: "Bursa için bayilik şartlarını öğrenmek istiyorum. Mevcut bir cafe işletmem var." },
    ...base(9, "mac", { pagePath: "/iletisim", pageTitle: "İletişim | Doyuyo", referrer: "https://www.google.com/", geo: geo("Bursa", "Bursa") }),
  },
  {
    type: "contact",
    data: { name: "Selin", surname: "Öztürk", phone: "+90 555 731 48 26", email: "selin.ozturk@example.com", subject: "other", message: "Okulumuzdaki etkinlik için toplu sipariş indirimi yapıyor musunuz? Yaklaşık 60 kişilik." },
    ...base(50, "android", { status: "in_progress", pagePath: "/iletisim", pageTitle: "İletişim | Doyuyo", notes: "Kurumsal satışa yönlendirildi." }),
  },
  {
    type: "contact",
    data: { name: "Test", surname: "Bot", phone: "+90 500 000 00 00", email: "seo-offer@example.com", subject: "other", message: "We can bring your site to the first page of Google in 7 days!!! Contact now." },
    ...base(80, "mac", { status: "spam", locale: "en", pagePath: "/en/contact", pageTitle: "Contact | Doyuyo", geo: geo("Frankfurt", "Hesse", "DE") }),
  },
  // careers
  {
    type: "careers",
    data: { name: "Ahmet", surname: "Koç", phone: "+90 538 204 61 90", email: "ahmet.koc@example.com", department: "general", city: "İstanbul", message: "3 yıllık mutfak deneyimim var. Kadıköy ve Ataşehir şubelerinde çalışmak isterim." },
    ...base(5, "android", { pagePath: "/kariyer", pageTitle: "Kariyer | Doyuyo", referrer: "https://www.linkedin.com/" }),
  },
  {
    type: "careers",
    data: { name: "Ayşe", surname: "Çelik", phone: "+90 546 377 12 54", email: "ayse.celik@example.com", department: "general", city: "Alanya", message: "Üniversite öğrencisiyim, yaz sezonu için yarı zamanlı kasa pozisyonuna başvurmak istiyorum." },
    ...base(30, "ipad", { pagePath: "/kariyer", pageTitle: "Kariyer | Doyuyo", geo: geo("Alanya", "Antalya") }),
  },
  {
    type: "careers",
    data: { name: "Emre", surname: "Arslan", phone: "+90 531 845 09 63", email: "emre.arslan@example.com", department: "general", city: "Kocaeli", message: "" },
    ...base(220, "iphone", { status: "done", pagePath: "/kariyer", pageTitle: "Kariyer | Doyuyo", geo: geo("İzmit", "Kocaeli"), notes: "Mülakat yapıldı, Capacity AVM şubesine yönlendirildi." }),
  },
];

const db = createDb();
// Only remove earlier demo rows; real submissions are never touched.
const removed = await db.delete(formSubmissions).where(sql`${formSubmissions.data}->>'email' like '%@example.com'`).returning({ id: formSubmissions.id });
const inserted = await db.insert(formSubmissions).values(rows).returning({ id: formSubmissions.id });
console.log(`demo submissions: removed ${removed.length}, inserted ${inserted.length}`);
process.exit(0);
