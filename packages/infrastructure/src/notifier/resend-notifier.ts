import type { FormNotifier } from "@doyuyo/core";

const TYPE_TR = { contact: "İletişim", careers: "Kariyer", investor: "Yatırımcı" } as const;
const FIELD_TR: Record<string, string> = {
  name: "İsim", surname: "Soyisim", phone: "Telefon", email: "E-posta", subject: "Konu", message: "Mesaj", department: "Departman", city: "Şehir",
  country: "Ülke", province: "İl", district: "İlçe", job: "Meslek", storeSize: "Mağaza m²", budget: "Bütçe (TL)",
};

/** E-mail through Resend's HTTP API (no SDK). Set RESEND_API_KEY, FORM_NOTIFY_TO, FORM_NOTIFY_FROM. */
export class ResendNotifier implements FormNotifier {
  constructor(
    private readonly apiKey: string,
    private readonly to: string[],
    private readonly from: string,
    private readonly adminUrl?: string,
  ) {}

  async notify({ id, type, data, context }: Parameters<FormNotifier["notify"]>[0]) {
    const who = `${data.name ?? ""} ${data.surname ?? ""}`.trim();
    const lines = [
      ...Object.entries(data).map(([k, v]) => `${FIELD_TR[k] ?? k}: ${v}`),
      "",
      `Sayfa: ${context.pagePath}`,
      `Cihaz: ${[context.device?.type, context.device?.os, context.device?.browser].filter(Boolean).join(" · ")}`,
      `Konum: ${[context.geo?.city, context.geo?.country].filter(Boolean).join(", ") || context.geo?.timezone || "—"}`,
      context.referrer ? `Geldiği yer: ${context.referrer}` : "",
      this.adminUrl ? `Panel: ${this.adminUrl.replace(/\/$/, "")}/inbox/${id}` : "",
    ].filter((l, i, a) => l !== "" || a[i - 1] !== "");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from: this.from, to: this.to, subject: `[Doyuyo] Yeni ${TYPE_TR[type]} başvurusu: ${who || "—"}`, text: lines.join("\n"), reply_to: data.email }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  }
}
