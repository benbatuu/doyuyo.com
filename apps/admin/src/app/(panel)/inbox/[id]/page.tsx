import Link from "next/link";
import { notFound } from "next/navigation";
import { container } from "@doyuyo/infrastructure";
import { FORM_FIELDS, type FormType } from "@doyuyo/core";
import {
  ArrowLeft,
  Briefcase,
  ChevronDown,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Monitor,
  Phone,
  Smartphone,
  Tablet,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DEVICE_LABEL, FIELD_LABEL, STATUS_LABEL, STATUS_TONE, TYPE_LABEL, VALUE_LABEL, fmtDate } from "@/lib/labels";
import { FollowUp } from "./follow-up";

import { SITE_URL as SITE } from "@/lib/media";
const TYPE_ICON: Record<FormType, LucideIcon> = { investor: TrendingUp, contact: Mail, careers: Briefcase };
const DEVICE_ICON: Record<string, LucideIcon> = { mobile: Smartphone, tablet: Tablet, desktop: Monitor };
const LONG = new Set(["message"]);

/** wa.me wants digits with country code; Turkish local numbers start with 0. */
function waNumber(phone: string) {
  const d = phone.replace(/\D/g, "");
  return d.startsWith("0") ? `9${d}` : d;
}

export default async function SubmissionPage({ params }: PageProps<"/inbox/[id]">) {
  const { id } = await params;
  const s = await container().getSubmission.execute(Number(id));
  if (!s) notFound();

  const TypeIcon = TYPE_ICON[s.type];
  const DeviceIcon = DEVICE_ICON[s.device?.type ?? ""] ?? Monitor;
  const fields = FORM_FIELDS[s.type].filter((f) => s.data[f.name]).map((f) => [f.name, s.data[f.name]!] as const);
  const short = fields.filter(([k]) => !LONG.has(k) && k !== "name" && k !== "surname");
  const message = s.data.message;
  const place = [s.geo?.city, s.geo?.region, s.geo?.country].filter(Boolean).join(", ");

  const source: [string, React.ReactNode][] = [
    [
      "Sayfa",
      <a key="p" href={`${SITE}${s.pagePath}`} target="_blank" rel="noopener" className="font-mono text-xs text-primary hover:underline">
        {s.pagePath}
      </a>,
    ],
    ["Sayfa başlığı", s.pageTitle ?? "—"],
    ["Geldiği yer", s.referrer ? new URL(s.referrer).hostname.replace(/^www\./, "") : "Doğrudan"],
    ["Kampanya", s.utm ? Object.values(s.utm).join(" · ") : "—"],
    ["Dil", s.locale.toUpperCase()],
  ];
  const tech: [string, React.ReactNode][] = [
    ["IP", <span key="ip" className="font-mono text-xs">{s.ip ?? "—"}</span>],
    ["Ekran / dil", `${s.device?.screen ?? "—"} · ${s.device?.language ?? "—"}`],
    ["Saat dilimi", s.geo?.timezone ?? "—"],
    ["Konum kaynağı", s.geo?.source === "ip-header" ? "IP (sunucu başlığı)" : "Tarayıcı saat dilimi"],
    ["KVKK onayı", s.consentAt ? `${fmtDate(s.consentAt)} · ${s.consentVersion}` : "—"],
    ["Tarayıcı bilgisi", <span key="ua" className="break-all text-xs text-muted-foreground">{s.userAgent ?? "—"}</span>],
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-4">
        <Link href={`/inbox?type=${s.type}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> {TYPE_LABEL[s.type]} formları
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-navy-900 text-base font-semibold text-white">
              {(s.data.name?.[0] ?? "?").toUpperCase()}
              {(s.data.surname?.[0] ?? "").toUpperCase()}
            </span>
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight">
                {s.data.name} {s.data.surname}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge className={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Badge>
                <span className="inline-flex items-center gap-1.5">
                  <TypeIcon className="size-3.5" /> {TYPE_LABEL[s.type]} #{s.id}
                </span>
                <span>·</span>
                <span>{fmtDate(s.createdAt)}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {s.data.phone && (
              <>
                <Button asChild variant="outline" size="sm" className="bg-card">
                  <a href={`tel:${s.data.phone.replace(/\s/g, "")}`}>
                    <Phone /> Ara
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm" className="bg-card">
                  <a href={`https://wa.me/${waNumber(s.data.phone)}`} target="_blank" rel="noopener">
                    <MessageCircle className="text-ok" /> WhatsApp
                  </a>
                </Button>
              </>
            )}
            {s.data.email && (
              <Button asChild size="sm">
                <a href={`mailto:${s.data.email}`}>
                  <Mail /> E-posta gönder
                </a>
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_380px]">
        {/* Main */}
        <div className="space-y-6">
          {message && (
            <section className="rounded-xl border bg-card p-5 shadow-xs">
              <h2 className="text-xs font-medium text-muted-foreground">{FIELD_LABEL.message ?? "Mesaj"}</h2>
              <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{message}</p>
            </section>
          )}

          <section className="rounded-xl border bg-card shadow-xs">
            <h2 className="border-b px-5 py-3.5 font-semibold">Form yanıtları</h2>
            <dl className="grid sm:grid-cols-2">
              {short.map(([k, v]) => (
                <div key={k} className="border-b px-5 py-3.5 sm:odd:border-r [&:nth-last-child(-n+2)]:sm:border-b-0 last:border-b-0">
                  <dt className="text-xs text-muted-foreground">{FIELD_LABEL[k] ?? k}</dt>
                  <dd className="mt-0.5 break-words font-medium">{VALUE_LABEL[v] ?? v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-xl border bg-card shadow-xs">
            <h2 className="border-b px-5 py-3.5 font-semibold">Kaynak</h2>
            <MetaList rows={source} />
          </section>
        </div>

        {/* Side */}
        <aside className="space-y-6 xl:sticky xl:top-6">
          <FollowUp id={s.id} status={s.status} notes={s.notes} updatedAt={fmtDate(s.updatedAt)} />

          <section className="rounded-xl border bg-card p-5 shadow-xs">
            <h2 className="font-semibold">Cihaz ve konum</h2>
            <ul className="mt-3 space-y-2.5 text-sm">
              <li className="flex items-center gap-3">
                <DeviceIcon className="size-4 text-muted-foreground" />
                {DEVICE_LABEL[s.device?.type ?? ""] ?? s.device?.type ?? "—"}
                <span className="text-muted-foreground">· {[s.device?.os, s.device?.browser].filter(Boolean).join(" · ") || "—"}</span>
              </li>
              <li className="flex items-center gap-3">
                <MapPin className="size-4 text-muted-foreground" />
                {place || "IP konumu yok"}
              </li>
              <li className="flex items-center gap-3">
                <Globe className="size-4 text-muted-foreground" />
                {s.locale === "en" ? "İngilizce site" : "Türkçe site"}
              </li>
            </ul>

            <details className="group mt-4 border-t pt-3">
              <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground">
                Teknik detaylar
                <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
              </summary>
              <dl className="mt-3 space-y-2.5 text-sm">
                {tech.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="mt-0.5">{v}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </section>
        </aside>
      </div>
    </div>
  );
}

function MetaList({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="divide-y text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[9rem_1fr] gap-3 px-5 py-3">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="min-w-0 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
