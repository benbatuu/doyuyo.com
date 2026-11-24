import type { FormType, SubmissionStatus } from "@doyuyo/core";

export const TYPE_LABEL: Record<FormType, string> = { contact: "İletişim", careers: "Kariyer", investor: "Yatırımcı" };
export const STATUS_LABEL: Record<SubmissionStatus, string> = { new: "Yeni", in_progress: "İnceleniyor", done: "Tamamlandı", spam: "Spam" };
export const STATUS_TONE: Record<SubmissionStatus, string> = {
  new: "bg-red-600 text-white",
  in_progress: "bg-amber-400 text-navy-900",
  done: "bg-ok/15 text-ok",
  spam: "bg-muted text-muted-foreground",
};
/** Human labels for stored answer keys and choice values (TR, the team's language). */
export const FIELD_LABEL: Record<string, string> = {
  name: "İsim",
  surname: "Soyisim",
  phone: "Telefon",
  email: "E-posta",
  subject: "Konu",
  message: "Mesaj",
  department: "Departman",
  city: "Şehir",
  model: "Model",
  country: "Ülke",
  province: "İl",
  district: "İlçe",
  hasLocation: "Hazır lokasyon",
  storeSize: "Mağaza m²",
  budget: "Bütçe (TL)",
  timeline: "Başlangıç",
  job: "Meslek",
};
export const VALUE_LABEL: Record<string, string> = {
  franchise: "Bayilik",
  investor_only: "Sadece yatırımcı",
  master_franchise: "Master Franchise",
  job: "İş başvurusu",
  complaint: "Şikayet",
  other: "Diğer",
  general: "Genel Başvuru",
  yes: "Evet",
  no: "Henüz değil",
  "0-3": "0–3 ay",
  "3-6": "3–6 ay",
  "6+": "6 ay +",
};
export const DEVICE_LABEL: Record<string, string> = { desktop: "Masaüstü", mobile: "Telefon", tablet: "Tablet" };

export const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(d);
